#!/usr/bin/env python3
"""Strict PyYAML frontmatter helper; complements dependency-free validate_vault.py.
Catches malformed YAML, not schema. Usage: python Utilities/Scripts/vault_yaml.py --check Anime/
"""

from __future__ import annotations

import argparse
import re
import sys
from collections.abc import Iterable
from pathlib import Path

import yaml

DEFAULT_ROOT = Path(__file__).resolve().parents[2]

FRONTMATTER_RE = re.compile(
    r"\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*(?:\r?\n|\Z)",
    re.DOTALL,
)


def split_frontmatter(text: str) -> tuple[str, str] | None:
    """Split raw note text into (frontmatter_yaml, body)."""
    if text.startswith("\ufeff"):
        text = text.lstrip("\ufeff")
    match = FRONTMATTER_RE.match(text)
    if not match:
        return None
    return match.group("fm"), text[match.end() :]


def parse_frontmatter(text: str) -> tuple[dict, str] | None:
    """Strict-parse note text; None when no fence, raises on bad YAML."""
    split = split_frontmatter(text)
    if split is None:
        return None
    fm_text, body = split
    data = yaml.safe_load(fm_text)
    if data is None:
        return {}, body
    if not isinstance(data, dict):
        raise TypeError(f"frontmatter must be a mapping, got {type(data).__name__}")
    return data, body


def dump_frontmatter(meta: dict) -> str:
    """Emit canonical frontmatter block (LF, --- fences)."""
    dumped = yaml.safe_dump(
        dict(meta), sort_keys=False, allow_unicode=True, default_flow_style=False
    )
    return f"---\n{dumped}---\n"


def load_note(path: Path) -> tuple[dict, str]:
    """Read a note from disk and strict-parse its frontmatter."""
    try:
        text = path.read_bytes().decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(f"not valid UTF-8 ({exc})") from exc
    parsed = parse_frontmatter(text)
    if parsed is None:
        raise ValueError("missing or malformed frontmatter fence")
    return parsed


def check_note(path: Path) -> list[str]:
    """Return a list of YAML-level errors for one note (empty = OK)."""
    try:
        load_note(path)
    except yaml.YAMLError as exc:
        return [f"YAML error: {exc}"]
    except (TypeError, ValueError) as exc:
        return [str(exc)]
    except OSError as exc:
        return [f"cannot read file ({exc})"]
    return []


def check_tree(target: Path) -> list[tuple[Path, str]]:
    """Collect (path, error) for every *.md under target (file or dir)."""
    notes: Iterable[Path]
    if target.is_file():
        notes = [target]
    else:
        notes = sorted(target.rglob("*.md"))
    findings: list[tuple[Path, str]] = []
    for note in notes:
        if ".git" in note.parts:
            continue
        for error in check_note(note):
            findings.append((note, error))
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Strict PyYAML frontmatter check")
    parser.add_argument(
        "--root",
        type=Path,
        default=DEFAULT_ROOT,
        help="vault root (default: repo root)",
    )
    parser.add_argument(
        "--check",
        type=str,
        default="Anime",
        help="file or directory to check, relative to --root (default: Anime)",
    )
    parser.add_argument("--quiet", action="store_true", help="only print summary")
    args = parser.parse_args(argv)

    target = (
        (args.root / args.check)
        if not Path(args.check).is_absolute()
        else Path(args.check)
    )
    if not target.exists():
        print(f"[ERROR] target not found: {target}")
        return 1
    findings = check_tree(target)
    if not args.quiet:
        for path, error in findings:
            try:
                rel = path.resolve().relative_to(args.root.resolve()).as_posix()
            except ValueError:
                rel = str(path)
            print(f"[YAML] {rel}: {error}")
    checked = (
        1
        if target.is_file()
        else len([p for p in target.rglob("*.md") if ".git" not in p.parts])
    )
    print(f"Checked {checked} note(s): {len(findings)} YAML error(s).")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
