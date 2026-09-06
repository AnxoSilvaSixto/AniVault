#!/usr/bin/env python3
"""
update_readme.py — Keep README.md stats in sync with vault contents.

Counts anime notes, extra reference pages (per dimension), pending, bases,
graphs, and series subfolders. Patches README.md's stats table, structure
code block, quick-start line, and footer.

Idempotent, preserves formatting, CRLF/LF agnostic.
"""

from __future__ import annotations

import argparse
import difflib
import re
import sys
from datetime import date
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
VAULT_ROOT = SCRIPT_DIR.parent.parent
README = VAULT_ROOT / "README.md"


def count_files(directory: Path, suffix: str = "*.md", recursive: bool = True) -> int:
    if not directory.is_dir():
        return 0
    iterator = directory.rglob(suffix) if recursive else directory.glob(suffix)
    return sum(1 for _ in iterator)


def counts() -> dict[str, int]:
    anime_dir = VAULT_ROOT / "Anime"
    extra_dir = VAULT_ROOT / "Extra"
    pending_dir = VAULT_ROOT / "Pending"

    def cnt(sub: str) -> int:
        return count_files(VAULT_ROOT / sub, "*.md", recursive=False)

    bases = count_files(VAULT_ROOT / "Utilities/Bases", "*.base", recursive=False)
    graphs = count_files(VAULT_ROOT / "Utilities/Graphs", "*.md", recursive=False)
    series_folders = sum(1 for p in anime_dir.iterdir() if p.is_dir()) if anime_dir.is_dir() else 0

    return {
        "anime": count_files(anime_dir, "*.md") if anime_dir.is_dir() else 0,
        "extra": count_files(extra_dir, "*.md") if extra_dir.is_dir() else 0,
        "pending": count_files(pending_dir, "*.md") if pending_dir.is_dir() else 0,
        "studio": cnt("Extra/Studio"),
        "themes": cnt("Extra/Themes"),
        "genre": cnt("Extra/Genre"),
        "source": cnt("Extra/Source"),
        "demo": cnt("Extra/Demographic"),
        "type": cnt("Extra/Type"),
        "bases": bases,
        "graphs": graphs,
        "series_folders": series_folders,
    }


def patch(text: str, c: dict[str, int], today: str) -> tuple[str, list[str]]:
    changes: list[str] = []

    # --- Collection Stats table ---
    repls = [
        (r"(\|\s*\*\*Anime Notes\*\*\s*\|\s*\*\*)(\d+)(\*\*\s*\|)", rf"\g<1>{c['anime']}\g<3>"),
        (r"(\|\s*\*\*Reference Pages\*\*\s*\|\s*\*\*)(\d+)(\*\*\s*\|)", rf"\g<1>{c['extra']}\g<3>"),
        (r"(\|\s*\u2014 Studios\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['studio']}\g<3>"),
        (r"(\|\s*\u2014 Themes\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['themes']}\g<3>"),
        (r"(\|\s*\u2014 Genres?\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['genre']}\g<3>"),
        (r"(\|\s*\u2014 Sources?\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['source']}\g<3>"),
        (r"(\|\s*\u2014 Demographics?\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['demo']}\g<3>"),
        (r"(\|\s*\u2014 Types?\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['type']}\g<3>"),
        (r"(\|\s*\*\*Watchlist\*\*\s*\|\s*\*\*)(\d+)(\*\*\s*\|)", rf"\g<1>{c['pending']}\g<3>"),
        (r"(\|\s*\*\*Bases\*\*\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['bases']}\g<3>"),
        (r"(\|\s*\*\*Graphs\*\*\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['graphs']}\g<3>"),
    ]
    fallback = [
        (r"(\|\s*Watchlist\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['pending']}\g<3>"),
        (r"(\|\s*Bases\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['bases']}\g<3>"),
        (r"(\|\s*Graphs\s*\|\s*)(\d+)(\s*\|)", rf"\g<1>{c['graphs']}\g<3>"),
    ]
    for pat, rep in repls + fallback:
        new, n = re.subn(pat, rep, text)
        if n:
            text = new
            changes.append(pat)

    # series subfolders note
    text, n = re.subn(
        r"(standalone \+\s*)\d+(\s+series subfolders)",
        rf"\g<1>{c['series_folders']}\g<2>",
        text,
    )
    if n:
        changes.append("table:series_folders")

    # --- Structure code block ---
    # Unicode box-drawing: ├── ──
    text, n = re.subn(
        r"(\u251c\u2500\u2500 Anime/\s+#\s*)\d+(\s+notes \u2014 flat files \+\s*)\d+(\s+series folders)",
        rf"\g<1>{c['anime']}\g<2>{c['series_folders']}\g<3>",
        text,
    )
    if n:
        changes.append("structure:Anime")

    # Extra total
    text, n = re.subn(
        r"(\u251c\u2500\u2500 Extra/\s+#\s*)\d+(\s+reference pages)",
        rf"\g<1>{c['extra']}\g<2>",
        text,
    )
    if n:
        changes.append("structure:Extra")

    # per-dimension in tree
    for name, key in [
        ("Demographic", "demo"), ("Genre", "genre"), ("Source", "source"),
        ("Studio", "studio"), ("Themes", "themes"), ("Type", "type"),
    ]:
        text, n = re.subn(
            rf"((?:\u251c\u2500\u2500|\u2502\s+\u251c\u2500\u2500|\u2514\u2500\u2500)\s+{name}/[^\n]*?#\s*)\d+",
            rf"\g<1>{c[key]}",
            text,
        )
        if n:
            changes.append(f"structure:{name}")

    # Pending line
    text, n = re.subn(
        r"(\u251c\u2500\u2500 Pending/\s+#\s*)\d+(\s+watchlist)",
        rf"\g<1>{c['pending']}\g<2>",
        text,
    )
    if n:
        changes.append("structure:Pending")

    # Bases / Graphs in tree
    text, n = re.subn(
        r"(\u251c\u2500\u2500 Bases/\s+#\s*)\d+(\s+\.base views)",
        rf"\g<1>{c['bases']}\g<2>",
        text,
    )
    if n:
        changes.append("structure:Bases")

    text, n = re.subn(
        r"(\u251c\u2500\u2500 Graphs/\s+#\s*)\d+(\s+DataviewJS chart notes)",
        rf"\g<1>{c['graphs']}\g<2>",
        text,
    )
    if n:
        changes.append("structure:Graphs")

    # alternative tree using vertical bars
    text, n = re.subn(
        r"(\u2502\s+\u251c\u2500\u2500 Bases/\s+#\s*)\d+",
        rf"\g<1>{c['bases']}",
        text,
    )
    if n:
        changes.append("structure:Bases2")

    text, n = re.subn(
        r"(\u2502\s+\u251c\u2500\u2500 Graphs/\s+#\s*)\d+",
        rf"\g<1>{c['graphs']}",
        text,
    )
    if n:
        changes.append("structure:Graphs2")

    # --- Quick Start verify line ---
    text, n = re.subn(
        r"(you should see\s+)\d+(\s+entries)",
        rf"\g<1>{c['anime']}\g<2>",
        text,
    )
    if n:
        changes.append("verify")

    # --- Footer ---
    footer_pat = r"\*Last updated:\s*\d{4}-\d{2}-\d{2}(?:\s*\u00b7\s*Vault:\s*\d+\s+anime\s*\u00b7\s*\d+\s+refs\s*\u00b7\s*\d+\s+pending)?\*"
    new_footer = f"*Last updated: {today} \u00b7 Vault: {c['anime']} anime \u00b7 {c['extra']} refs \u00b7 {c['pending']} pending*"
    text, n = re.subn(footer_pat, new_footer, text)
    if n:
        changes.append("footer")

    # --- Snapshot note ---
    text, n = re.subn(
        r"(>\s*Snapshot as of\s*`)\d{4}-\d{2}-\d{2}(`)",
        rf"\g<1>{today}\g<2>",
        text,
    )
    if n:
        changes.append("snapshot")

    return text, changes


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Update README.md stats")
    ap.add_argument("--dry-run", action="store_true", help="Show diff without writing")
    ap.add_argument("--check", action="store_true", help="Exit 1 if README would change")
    ap.add_argument("--quiet", action="store_true", help="Suppress summary output")
    ap.add_argument("--readme", type=Path, default=README, help="Path to README.md")
    args = ap.parse_args(argv)

    if not args.readme.exists():
        print(f"[ERROR] README not found: {args.readme}", file=sys.stderr)
        return 1

    c = counts()
    today = date.today().isoformat()
    raw = args.readme.read_text(encoding="utf-8")
    line_ending = "\r\n" if "\r\n" in raw[:2000] else "\n"
    new_text, changes = patch(raw, c, today)

    if new_text == raw:
        if not args.quiet:
            print("README already up-to-date.")
            print(f"Counts: anime={c['anime']} extra={c['extra']} pending={c['pending']} (snapshot {today})")
        return 0

    if args.dry_run or args.check:
        if not args.quiet:
            print(f"Would update {len(changes)} sections: {', '.join(changes)}")
            print(f"Counts: {c}")
            for line in difflib.unified_diff(raw.splitlines(), new_text.splitlines(), lineterm="", n=3):
                print(line)
        return 1 if args.check else 0

    # write preserving line ending
    normalized = new_text.replace("\r\n", "\n").replace("\r", "\n")
    if line_ending != "\n":
        normalized = normalized.replace("\n", line_ending)
    args.readme.write_text(normalized, encoding="utf-8", newline="")

    if not args.quiet:
        print(f"Updated README: {', '.join(changes)}")
        print(f"Counts: anime={c['anime']} extra={c['extra']} pending={c['pending']} series_folders={c['series_folders']} bases={c['bases']} graphs={c['graphs']} date={today}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
