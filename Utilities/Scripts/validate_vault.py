#!/usr/bin/env python3
"""Read-only, dependency-free consistency validator for the AniVault vault.

The validator checks Anime frontmatter, IDs, dates, MAL URLs, taxonomy and
relationship links, media-grid hrefs, duplicate note stems, text encoding, and
README filesystem counts.  It never writes to the vault or makes network calls.

Usage:
    python Utilities/Scripts/validate_vault.py
    python Utilities/Scripts/validate_vault.py --root C:/path/to/AniVault
"""

from __future__ import annotations

import argparse
import ast
import html
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse


DEFAULT_ROOT = Path(__file__).resolve().parents[2]
REQUIRED_ANIME_FIELDS = (
    "ID", "Type", "Episodes", "Aired", "Finished", "Studio", "Source",
    "Genre", "Themes", "Demographic", "Cover", "MAL", "Rating",
)
TAXONOMY_FIELDS = {
    "Type": "Type",
    "Source": "Source",
    "Studio": "Studio",
    "Genre": "Genre",
    "Themes": "Themes",
    "Demographic": "Demographic",
}
RELATION_FIELDS = (
    "Prequels", "Sequels", "Alternative Version", "Alternative Setting",
    "Parent Stories", "Side Stories",
)
LIST_FIELDS = {"Studio", "Genre", "Themes", "Demographic", *RELATION_FIELDS}
DATE_FIELDS = ("Aired", "Finished")
MAL_RE = re.compile(
    r"^https?://(?:www\.)?myanimelist\.net/anime/(\d+)(?:[/?#].*)?$",
    re.IGNORECASE,
)
WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
HREF_RE = re.compile(r"\bhref\s*=\s*([\"'])(.*?)\1", re.IGNORECASE | re.DOTALL)
FRONTMATTER_RE = re.compile(
    r"\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*(?:\r?\n|\Z)",
    re.DOTALL,
)
KEY_RE = re.compile(r"^(?P<indent>\s*)(?P<key>[^:#][^:]*?):(?:\s*(?P<value>.*?))?\s*$")
# A warning is useful for accidentally decoded legacy text, but normal Unicode
# titles are not warnings.  The replacement character is always suspicious.
MOJIBAKE_RE = re.compile(
    r"(?:\ufffd|\u00c3.|\u00c2.|\u00e2(?:\u20ac.|\u20ac\u2122|\u20ac\u2026)|\u00f0\u0178..|\u00d0.)",
    re.DOTALL,
)
TEXT_SUFFIXES = {".md", ".py", ".base", ".canvas", ".json", ".css", ".bat"}
IGNORED_TEXT_PATHS = {
    ".obsidian/workspace.json",
    ".obsidian/workspace-mobile.json",
    ".obsidian/hotkeys.json",
    ".obsidian/plugins/vault-inspector/data.json",
}


@dataclass
class Issue:
    level: str
    path: str
    message: str
    line: int | None = None


@dataclass
class Note:
    path: Path
    frontmatter: dict[str, object]
    body: str


class Validator:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.issues: list[Issue] = []
        self._issue_keys: set[tuple[str, str, str, int | None]] = set()
        self.anime_notes: list[Note] = []
        self.anime_by_stem: dict[str, list[Path]] = defaultdict(list)
        self.pending_by_stem: dict[str, list[Path]] = defaultdict(list)
        self.path_index: dict[str, Path] = {}
        self.taxonomy_index: dict[str, dict[str, list[Path]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self.all_markdown: list[Path] = []

    def rel(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root).as_posix()
        except ValueError:
            return str(path)

    def add(self, level: str, path: Path, message: str, line: int | None = None) -> None:
        relative = self.rel(path)
        key = (level, relative, message, line)
        if key not in self._issue_keys:
            self._issue_keys.add(key)
            self.issues.append(Issue(level, relative, message, line))

    def error(self, path: Path, message: str, line: int | None = None) -> None:
        self.add("ERROR", path, message, line)

    def warning(self, path: Path, message: str, line: int | None = None) -> None:
        self.add("WARNING", path, message, line)

    @staticmethod
    def _decode(path: Path) -> str | None:
        try:
            return path.read_bytes().decode("utf-8-sig")
        except (OSError, UnicodeDecodeError):
            return None

    def check_encoding(self) -> None:
        ignored = {item.casefold() for item in IGNORED_TEXT_PATHS}
        for path in sorted(self.root.rglob("*")):
            if not path.is_file() or ".git" in path.parts:
                continue
            relative = self.rel(path).casefold()
            if relative in ignored or path.suffix.casefold() not in TEXT_SUFFIXES:
                continue
            try:
                raw = path.read_bytes()
                text = raw.decode("utf-8-sig")
            except UnicodeDecodeError as exc:
                self.warning(path, f"not valid UTF-8 ({exc})")
                continue
            except OSError as exc:
                self.error(path, f"cannot read file ({exc})")
                continue
            if raw.startswith(b"\xef\xbb\xbf"):
                self.warning(path, "UTF-8 BOM present")

    def check_mojibake(self) -> None:
        for path in self.all_markdown:
            text = self._decode(path)
            if text is not None and MOJIBAKE_RE.search(text):
                self.warning(path, "replacement character or likely UTF-8 mojibake detected")

    @staticmethod
    def _unquote(value: str) -> str:
        value = value.strip()
        if not value:
            return ""
        if value.startswith(("\"", "'")) and value.endswith(value[0]):
            try:
                return str(ast.literal_eval(value))
            except (SyntaxError, ValueError):
                return value[1:-1]
        # A YAML comment is a comment only when separated from a scalar.
        return re.split(r"\s+#", value, maxsplit=1)[0].strip()

    @classmethod
    def _inline_list(cls, value: str) -> list[object] | None:
        if not (value.startswith("[") and value.endswith("]")):
            return None
        try:
            parsed = ast.literal_eval(value)
        except (SyntaxError, ValueError):
            parsed = None
        if isinstance(parsed, list):
            return [cls._scalar(str(item)) if isinstance(item, str) else item for item in parsed]
        inner = value[1:-1].strip()
        if not inner:
            return []
        parts: list[str] = []
        current: list[str] = []
        quote = ""
        for char in inner:
            if char in "\"'":
                if quote == char:
                    quote = ""
                elif not quote:
                    quote = char
            if char == "," and not quote:
                parts.append("".join(current).strip())
                current = []
            else:
                current.append(char)
        if quote:
            return None
        parts.append("".join(current).strip())
        return [cls._scalar(part) for part in parts]

    @classmethod
    def _scalar(cls, value: str) -> object:
        value = cls._unquote(value)
        if value in {"", "null", "Null", "NULL", "~"}:
            return None if value else ""
        # A wikilink starts with two brackets; do not mistake it for an inline
        # YAML list after removing its YAML quotes.
        if value.startswith("[[") and value.endswith("]]" ):
            return value
        if value == "[]":
            return []
        if re.fullmatch(r"-?\d+", value):
            try:
                return int(value)
            except ValueError:
                pass
        inline = cls._inline_list(value)
        return inline if inline is not None else value

    @classmethod
    def parse_frontmatter(cls, text: str) -> tuple[dict[str, object], str] | None:
        match = FRONTMATTER_RE.match(text)
        if not match:
            return None
        metadata: dict[str, object] = {}
        current_key: str | None = None
        for raw_line in match.group("fm").splitlines():
            line = raw_line.rstrip()
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            list_match = re.match(r"^\s+-\s*(.*?)\s*$", line)
            if list_match and current_key is not None:
                existing = metadata.get(current_key)
                if not isinstance(existing, list):
                    existing = []
                    metadata[current_key] = existing
                existing.append(cls._scalar(list_match.group(1)))
                continue
            key_match = KEY_RE.match(line)
            if not key_match or key_match.group("indent"):
                # Unknown YAML is deliberately ignored; known schema fields
                # are validated below rather than attempting a full YAML parser.
                continue
            current_key = key_match.group("key").strip()
            metadata[current_key] = cls._scalar(key_match.group("value") or "")
        return metadata, text[match.end():]

    def load_notes(self) -> None:
        anime_dir = self.root / "Anime"
        pending_dir = self.root / "Pending"
        self.all_markdown = sorted(
            p for p in self.root.rglob("*.md") if ".git" not in p.parts
        )
        for path in self.all_markdown:
            relative = self.rel(path).casefold()
            self.path_index[relative] = path
            if path.is_relative_to(anime_dir):
                self.anime_by_stem[path.stem.casefold()].append(path)
                text = self._decode(path)
                if text is None:
                    self.error(path, "file is not valid UTF-8")
                    continue
                parsed = self.parse_frontmatter(text)
                if parsed is None:
                    self.error(path, "missing or malformed frontmatter", 1)
                    continue
                metadata, body = parsed
                self.anime_notes.append(Note(path, metadata, body))
            elif pending_dir.is_dir() and path.is_relative_to(pending_dir):
                self.pending_by_stem[path.stem.casefold()].append(path)

        for category in TAXONOMY_FIELDS.values():
            directory = self.root / "Extra" / category
            if not directory.is_dir():
                continue
            for path in directory.glob("*.md"):
                self.taxonomy_index[category.casefold()][path.stem.casefold()].append(path)

    @staticmethod
    def values(metadata: dict[str, object], key: str) -> list[object]:
        value = metadata.get(key)
        if isinstance(value, list):
            return value
        return [] if value in (None, "") else [value]

    @staticmethod
    def as_text(value: object) -> str:
        return "" if value is None else str(value).strip()

    @classmethod
    def link_target(cls, raw: object) -> str | None:
        if not isinstance(raw, str):
            return None
        match = WIKILINK_RE.fullmatch(raw.strip())
        if not match:
            return None
        target = match.group(1).split("|", 1)[0].split("#", 1)[0].strip()
        return target or None

    @staticmethod
    def clean_target(target: str) -> str:
        target = html.unescape(target).replace("\\", "/").strip()
        target = re.sub(r"^\./", "", target)
        return target

    @staticmethod
    def target_variants(target: str) -> list[str]:
        """Return the literal target plus an optional Markdown extension removal.

        A stem may itself end in ``.md`` (for example ``Signal.MD.md``), so
        extension removal is a fallback rather than an unconditional rewrite.
        """
        variants = [target]
        if target.casefold().endswith(".md"):
            variants.append(target[:-3])
        return list(dict.fromkeys(variants))

    def resolve_taxonomy(self, category: str, target: str) -> list[Path]:
        clean = self.clean_target(target).strip("/")
        if "/" in clean:
            parts = [part for part in clean.split("/") if part]
            category_cf = category.casefold()
            if len(parts) == 2 and parts[0].casefold() == category_cf:
                clean = parts[1]
            elif len(parts) == 3 and parts[0].casefold() == "extra" and parts[1].casefold() == category_cf:
                clean = parts[2]
            else:
                return []
        index = self.taxonomy_index[category.casefold()]
        for variant in self.target_variants(clean):
            matches = index.get(variant.casefold(), [])
            if matches:
                return matches
        return []

    def resolve_anime(
        self, source: Path, target: str, *, include_pending: bool = False
    ) -> list[Path]:
        clean = self.clean_target(target).strip("/")
        if not clean:
            return []
        # Explicit vault-relative paths are authoritative, while matching is
        # case-insensitive to mirror Obsidian's behavior on Windows.
        if "/" in clean:
            for variant in self.target_variants(clean):
                filename = variant if variant.casefold().endswith(".md") else variant + ".md"
                candidates = [
                    path for key, path in self.path_index.items()
                    if key == filename.casefold() and self._anime_namespace(path)
                ]
                if candidates:
                    return candidates
            return []
        for variant in self.target_variants(clean):
            # Obsidian permits a note stem that itself ends in `.md`; for
            # example, [[Signal.MD]] resolves to Signal.MD.md. Try the exact
            # stem first, then the optional extension-stripped fallback.
            stem = variant
            local = sorted(
                p for p in source.parent.glob("*.md")
                if p.stem.casefold() == stem.casefold()
            )
            if local:
                return local
            matches = list(self.anime_by_stem.get(stem.casefold(), []))
            if include_pending:
                matches.extend(self.pending_by_stem.get(stem.casefold(), []))
            if matches:
                return matches
        return []

    def _anime_namespace(self, path: Path) -> bool:
        return path.is_relative_to(self.root / "Anime") or path.is_relative_to(self.root / "Pending")

    def check_duplicate_stems(self) -> None:
        # Cross-folder collisions are not necessarily ambiguous: taxonomy links
        # are resolved in their declared Extra namespace and anime links in the
        # Anime/Pending namespace. Warn only where a namespace has ambiguity.
        for label, index in (("Anime", self.anime_by_stem), ("Pending", self.pending_by_stem)):
            for stem, paths in sorted(index.items()):
                if len(paths) > 1:
                    rendered = ", ".join(self.rel(path) for path in paths)
                    self.warning(paths[0], f"duplicate {label} filename stem {stem!r}: {rendered}")
        for category, index in sorted(self.taxonomy_index.items()):
            for stem, paths in sorted(index.items()):
                if len(paths) > 1:
                    rendered = ", ".join(self.rel(path) for path in paths)
                    self.warning(paths[0], f"duplicate {category} filename stem {stem!r}: {rendered}")

    def validate_link(self, path: Path, field: str, value: object, namespace: str) -> None:
        target = self.link_target(value)
        if target is None:
            self.error(path, f"{field} value must be a wikilink: {value!r}")
            return
        matches = (
            self.resolve_taxonomy(namespace, target)
            if namespace in TAXONOMY_FIELDS.values()
            else self.resolve_anime(path, target, include_pending=True)
        )
        if not matches:
            location = f"Extra/{namespace}/" if namespace in TAXONOMY_FIELDS.values() else "Anime or Pending"
            self.error(path, f"{field} link [[{target}]] does not resolve in {location}")
        elif len(matches) > 1:
            self.error(path, f"{field} link [[{target}]] is ambiguous")

    def validate_anime_frontmatter(self) -> None:
        ids: dict[int, Path] = {}
        for note in self.anime_notes:
            path, metadata = note.path, note.frontmatter
            missing = [key for key in REQUIRED_ANIME_FIELDS if key not in metadata]
            if missing:
                self.error(path, "missing required frontmatter: " + ", ".join(missing))

            raw_id = metadata.get("ID")
            id_text = self.as_text(raw_id)
            if isinstance(raw_id, bool) or not re.fullmatch(r"[1-9]\d*", id_text):
                self.error(path, "ID must be a positive integer")
            else:
                anime_id = int(id_text)
                if anime_id in ids:
                    self.error(path, f"duplicate ID {anime_id} (also {self.rel(ids[anime_id])})")
                else:
                    ids[anime_id] = path

            for field in LIST_FIELDS:
                if field in metadata and not isinstance(metadata[field], list):
                    self.error(path, f"{field} must be a YAML list (use [] when empty)")

            for field in ("Type", "Source"):
                if field in metadata:
                    self.validate_link(path, field, metadata[field], TAXONOMY_FIELDS[field])
            for field in LIST_FIELDS & set(TAXONOMY_FIELDS):
                for value in self.values(metadata, field):
                    self.validate_link(path, field, value, TAXONOMY_FIELDS[field])
            for field in RELATION_FIELDS:
                for value in self.values(metadata, field):
                    self.validate_link(path, field, value, "Anime")

            for field in DATE_FIELDS:
                if field not in metadata:
                    continue
                value = self.as_text(metadata[field])
                if field == "Finished" and value.casefold() in {"", "null", "none", "~"}:
                    continue
                try:
                    date.fromisoformat(value)
                except ValueError:
                    self.error(path, f"{field} must be an ISO date (YYYY-MM-DD)")

            episodes = metadata.get("Episodes")
            if episodes not in (None, "") and (
                isinstance(episodes, bool) or not isinstance(episodes, int) or episodes < 0
            ):
                self.error(path, "Episodes must be a non-negative integer or empty")

            rating = metadata.get("Rating")
            if isinstance(rating, bool) or not isinstance(rating, int) or not 0 <= rating <= 10:
                self.error(path, "Rating must be an integer from 0 to 10")
            elif rating == 0:
                self.warning(path, "Rating 0: unrated")

            mal = self.as_text(metadata.get("MAL"))
            match = MAL_RE.fullmatch(mal)
            if not match:
                self.error(path, "MAL must be a MyAnimeList anime URL")
            elif re.fullmatch(r"[1-9]\d*", id_text) and match.group(1) != id_text:
                self.error(path, f"MAL URL ID {match.group(1)} does not match ID {id_text}")

            cover = self.as_text(metadata.get("Cover"))
            parsed_url = urlparse(cover)
            if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
                self.error(path, "Cover must be an absolute HTTP(S) URL")

            if "media-grid" in note.body.casefold():
                for _, href in HREF_RE.findall(note.body):
                    href = html.unescape(href).strip()
                    if not href or re.match(r"^[a-z][a-z0-9+.-]*:", href, re.IGNORECASE):
                        continue
                    target = href.split("#", 1)[0].split("?", 1)[0].strip()
                    if not target or target.startswith(("#", "//")):
                        continue
                    # The media-grid uses bare note stems; explicit paths are
                    # also accepted, but asset links must not be treated as notes.
                    if target.casefold().endswith((".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")):
                        continue
                    matches = self.resolve_anime(path, target, include_pending=True)
                    if not matches:
                        self.error(path, f"media-grid href does not resolve: {href!r}")
                    elif len(matches) > 1:
                        self.error(path, f"media-grid href is ambiguous: {href!r}")

    def filesystem_counts(self) -> dict[str, int]:
        def count(directory: str, suffix: str = "*.md", recursive: bool = True) -> int:
            base = self.root / directory
            if not base.is_dir():
                return 0
            iterator = base.rglob(suffix) if recursive else base.glob(suffix)
            return sum(1 for _ in iterator)

        anime_dir = self.root / "Anime"
        return {
            "anime": len(list(anime_dir.rglob("*.md"))) if anime_dir.is_dir() else 0,
            "extra": count("Extra"),
            "pending": count("Pending"),
            "studio": count("Extra/Studio", recursive=False),
            "themes": count("Extra/Themes", recursive=False),
            "genre": count("Extra/Genre", recursive=False),
            "source": count("Extra/Source", recursive=False),
            "demo": count("Extra/Demographic", recursive=False),
            "type": count("Extra/Type", recursive=False),
            "bases": count("Utilities/Bases", "*.base", recursive=False),
            "graphs": count("Utilities/Graphs", recursive=False),
            "series": sum(1 for p in anime_dir.iterdir() if p.is_dir()) if anime_dir.is_dir() else 0,
        }

    def check_readme_counts(self) -> None:
        path = self.root / "README.md"
        text = self._decode(path) if path.is_file() else None
        if text is None:
            self.error(path, "README.md is missing or not valid UTF-8")
            return
        counts = self.filesystem_counts()
        checks = {
            "anime": [r"\|\s*\*\*Anime Notes\*\*\s*\|\s*\*\*(\d+)\*\*", r"you should see\s+(\d+)\s+entries", r"├── Anime/\s+#\s*(\d+)\s+notes", r"filter/sort all\s+(\d+)\s+entries", r"Vault:\s*(\d+)\s+anime"],
            "extra": [r"\|\s*\*\*Reference Pages\*\*\s*\|\s*\*\*(\d+)\*\*", r"├── Extra/\s+#\s*(\d+)\s+reference pages", r"Vault:\s*\d+\s+anime\s*·\s*(\d+)\s+refs"],
            "pending": [r"\|\s*\*\*Watchlist\*\*\s*\|\s*\*\*(\d+)\*\*", r"├── Pending/\s+#\s*(\d+)\s+watchlist", r"Vault:\s*\d+\s+anime\s*·\s*\d+\s+refs\s*·\s*(\d+)\s+pending"],
            "studio": [r"— Studios\s*\|\s*(\d+)", r"Studio/\s+#\s*(\d+)"],
            "themes": [r"— Themes\s*\|\s*(\d+)", r"Themes/\s+#\s*(\d+)"],
            "genre": [r"— Genres?\s*\|\s*(\d+)", r"Genre/\s+#\s*(\d+)"],
            "source": [r"— Sources?\s*\|\s*(\d+)", r"Source/\s+#\s*(\d+)"],
            "demo": [r"— Demographics?\s*\|\s*(\d+)", r"Demographic/\s+#\s*(\d+)"],
            "type": [r"— Types?\s*\|\s*(\d+)", r"Type/\s+#\s*(\d+)"],
            "bases": [r"\|\s*\*\*Bases\*\*\s*\|\s*(\d+)", r"Bases/\s+#\s*(\d+)"],
            "graphs": [r"\|\s*\*\*Graphs\*\*\s*\|\s*(\d+)", r"Graphs/\s+#\s*(\d+)"],
            "series": [r"standalone\s*\+\s*(\d+)\s+series subfolders", r"flat files\s*\+\s*(\d+)\s+series folders"],
        }
        labels = {"series": "series folders", "demo": "demographics"}
        for key, patterns in checks.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if not match:
                    self.error(path, f"README count for {labels.get(key, key)!r} not found")
                elif int(match.group(1)) != counts[key]:
                    self.error(path, f"README count for {labels.get(key, key)} is {match.group(1)}, expected {counts[key]}")

    def run(self, quiet: bool = False) -> int:
        if not self.root.is_dir():
            self.error(self.root, "vault root does not exist")
            return 1
        self.check_encoding()
        self.load_notes()
        self.check_mojibake()
        self.validate_anime_frontmatter()
        self.check_duplicate_stems()
        self.check_readme_counts()
        self.issues.sort(key=lambda item: (0 if item.level == "ERROR" else 1, item.path, item.line or 0, item.message))
        if not quiet:
            for issue in self.issues:
                location = f":{issue.line}" if issue.line else ""
                print(f"[{issue.level}] {issue.path}{location}: {issue.message}")
        errors = sum(issue.level == "ERROR" for issue in self.issues)
        warnings = sum(issue.level == "WARNING" for issue in self.issues)
        if not self.issues:
            print("OK: no errors or warnings")
        print(f"Validated {len(self.anime_notes)} Anime notes: {errors} error(s), {warnings} warning(s).")
        return 1 if errors else 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Read-only AniVault frontmatter and link validator")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="vault root (default: repository root)")
    parser.add_argument("--quiet", action="store_true", help="Suppress per-issue output (just exit code + summary)")
    args = parser.parse_args(list(argv) if argv is not None else None)
    return Validator(args.root).run(quiet=args.quiet)


if __name__ == "__main__":
    sys.exit(main())
