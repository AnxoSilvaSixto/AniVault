#!/usr/bin/env python3
"""
update_readme.py — keep README.md stats in sync with vault contents.

Counts:
  - Anime notes (Anime/**/*.md)
  - Extra total + per-dimension (Studio, Themes, Genre, Source, Demographic, Type)
  - Pending
  - Bases (.base) + Graphs (.md)
  - Series subfolders (Anime/*/ directories)

Patches README.md:
  - Collection Stats table
  - Structure code block (comments with counts)
  - Quick Start verify line ("you should see N entries")
  - Footer "*Last updated: YYYY-MM-DD · Vault: N anime · M refs · P pending*"

Idempotent, preserves formatting, CRLF/LF agnostic.
Run: python Utilities/Scripts/update_readme.py [--dry-run] [--check]
  --dry-run  print diff without writing
  --check    exit 1 if README would change (CI)
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

# Windows cp1252 console fix — same as sync scripts
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
VAULT_ROOT = SCRIPT_DIR.parent.parent
README = VAULT_ROOT / "README.md"

def counts():
    anime = len(list((VAULT_ROOT / "Anime").rglob("*.md"))) if (VAULT_ROOT / "Anime").exists() else 0
    extra = len(list((VAULT_ROOT / "Extra").rglob("*.md"))) if (VAULT_ROOT / "Extra").exists() else 0
    pending = len(list((VAULT_ROOT / "Pending").rglob("*.md"))) if (VAULT_ROOT / "Pending").exists() else 0
    # per-dimension (flat)
    def cnt(p): 
        return len(list((VAULT_ROOT / p).glob("*.md"))) if (VAULT_ROOT / p).exists() else 0
    studio = cnt("Extra/Studio")
    themes = cnt("Extra/Themes")
    genre = cnt("Extra/Genre")
    source = cnt("Extra/Source")
    demo = cnt("Extra/Demographic")
    typ = cnt("Extra/Type")
    bases = len(list((VAULT_ROOT / "Utilities/Bases").glob("*.base"))) if (VAULT_ROOT / "Utilities/Bases").exists() else 0
    graphs = len(list((VAULT_ROOT / "Utilities/Graphs").glob("*.md"))) if (VAULT_ROOT / "Utilities/Graphs").exists() else 0
    series_folders = 0
    anime_dir = VAULT_ROOT / "Anime"
    if anime_dir.exists():
        series_folders = sum(1 for p in anime_dir.iterdir() if p.is_dir())
    return {
        "anime": anime,
        "extra": extra,
        "pending": pending,
        "studio": studio,
        "themes": themes,
        "genre": genre,
        "source": source,
        "demo": demo,
        "type": typ,
        "bases": bases,
        "graphs": graphs,
        "series_folders": series_folders,
    }

def patch(text: str, c: dict, today: str) -> tuple[str, list[str]]:
    changes = []
    orig = text

    # --- Collection Stats table ---
    # Each row pattern keeps surrounding markup intact, only swaps number
    repls = [
        (r"(\|\s*\*\*Anime Notes\*\*\s*\|\s*\*\*)\d+(\*\*\s*\|)", rf"\g<1>{c['anime']}\g<2>"),
        (r"(\|\s*\*\*Reference Pages\*\*\s*\|\s*\*\*)\d+(\*\*\s*\|)", rf"\g<1>{c['extra']}\g<2>"),
        (r"(\|\s*— Studios\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['studio']}\g<2>"),
        (r"(\|\s*— Themes\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['themes']}\g<2>"),
        (r"(\|\s*— Genres?\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['genre']}\g<2>"),
        (r"(\|\s*— Sources?\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['source']}\g<2>"),
        (r"(\|\s*— Demographics?\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['demo']}\g<2>"),
        (r"(\|\s*— Types?\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['type']}\g<2>"),
        (r"(\|\s*\*\*Watchlist\*\*\s*\|\s*\*\*)\d+(\*\*\s*\|)", rf"\g<1>{c['pending']}\g<2>"),
        (r"(\|\s*\*\*Bases\*\*\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['bases']}\g<2>"),
        (r"(\|\s*\*\*Graphs\*\*\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['graphs']}\g<2>"),
    ]
    # also handle Watchlist without bold? older format "| **Watchlist** | 21 |" fallback
    fallback = [
        (r"(\|\s*Watchlist\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['pending']}\g<2>"),
        (r"(\|\s*Bases\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['bases']}\g<2>"),
        (r"(\|\s*Graphs\s*\|\s*)\d+(\s*\|)", rf"\g<1>{c['graphs']}\g<2>"),
    ]
    for pat, rep in repls + fallback:
        new, n = re.subn(pat, rep, text)
        if n:
            text = new
            changes.append(pat)
    # also patch the "standalone + N series subfolders" note in the table
    text, n = re.subn(
        r"(standalone \+\s*)\d+(\s+series subfolders)",
        rf"\g<1>{c['series_folders']}\g<2>",
        text,
    )
    if n: changes.append("table:series_folders")

    # --- Structure code block ---
    # Anime line: "├── Anime/                 # 369 notes — flat files + 59 series folders"
    text, n = re.subn(
        r"(├── Anime/\s+#\s*)\d+(\s+notes — flat files \+\s*)\d+(\s+series folders)",
        rf"\g<1>{c['anime']}\g<2>{c['series_folders']}\g<3>",
        text,
    )
    if n: changes.append("structure:Anime")
    # Extra total
    text, n = re.subn(
        r"(├── Extra/\s+#\s*)\d+(\s+reference pages)",
        rf"\g<1>{c['extra']}\g<2>",
        text,
    )
    if n: changes.append("structure:Extra")
    # per-dimension in tree
    for name, key in [
        ("Demographic", "demo"),
        ("Genre", "genre"),
        ("Source", "source"),
        ("Studio", "studio"),
        ("Themes", "themes"),
        ("Type", "type"),
    ]:
        text, n = re.subn(
            rf"((?:├──|│\s+├──|└──)\s+{name}/[^\n]*?#\s*)\d+",
            rf"\g<1>{c[key]}",
            text,
        )
        if n: changes.append(f"structure:{name}")
    # Pending line
    text, n = re.subn(
        r"(├── Pending/\s+#\s*)\d+(\s+watchlist)",
        rf"\g<1>{c['pending']}\g<2>",
        text,
    )
    if n: changes.append("structure:Pending")
    # Bases / Graphs in tree
    text, n = re.subn(
        r"(├── Bases/\s+#\s*)\d+(\s+\.base views)",
        rf"\g<1>{c['bases']}\g<2>",
        text,
    )
    if n: changes.append("structure:Bases")
    text, n = re.subn(
        r"(├── Graphs/\s+#\s*)\d+(\s+DataviewJS chart notes)",
        rf"\g<1>{c['graphs']}\g<2>",
        text,
    )
    if n: changes.append("structure:Graphs")
    # alternative tree using vertical bars for Bases/Graphs under Utilities
    text, n = re.subn(
        r"(│\s+├── Bases/\s+#\s*)\d+",
        rf"\g<1>{c['bases']}",
        text,
    )
    if n: changes.append("structure:Bases2")
    text, n = re.subn(
        r"(│\s+├── Graphs/\s+#\s*)\d+",
        rf"\g<1>{c['graphs']}",
        text,
    )
    if n: changes.append("structure:Graphs2")

    # --- Quick Start verify line ---
    text, n = re.subn(
        r"(you should see\s+)\d+(\s+entries)",
        rf"\g<1>{c['anime']}\g<2>",
        text,
    )
    if n: changes.append("verify")

    # --- Footer: "*Last updated: YYYY-MM-DD · Vault: N anime · M refs · P pending*" ---
    # Handles both old "*Last updated: YYYY-MM-DD*" and new expanded form
    footer_pat = r"\*Last updated:\s*\d{4}-\d{2}-\d{2}(?:\s*·\s*Vault:\s*\d+\s+anime\s*·\s*\d+\s+refs\s*·\s*\d+\s+pending)?\*"
    new_footer = f"*Last updated: {today} · Vault: {c['anime']} anime · {c['extra']} refs · {c['pending']} pending*"
    text, n = re.subn(footer_pat, new_footer, text)
    if n: changes.append("footer")
    else:
        # fallback: if no footer matched, append? do nothing
        pass

    # --- Snapshot note: "> Snapshot as of `YYYY-MM-DD`" ---
    text, n = re.subn(
        r"(>\s*Snapshot as of\s*`)\d{4}-\d{2}-\d{2}(`)",
        rf"\g<1>{today}\g<2>",
        text,
    )
    if n: changes.append("snapshot")

    return text, changes

def main():
    ap = argparse.ArgumentParser(description="Update README.md stats")
    ap.add_argument("--dry-run", action="store_true", help="Show diff without writing")
    ap.add_argument("--check", action="store_true", help="Exit 1 if README would change")
    ap.add_argument("--readme", type=Path, default=README, help="Path to README.md")
    args = ap.parse_args()

    if not args.readme.exists():
        print(f"[ERROR] README not found: {args.readme}", file=sys.stderr)
        sys.exit(1)

    c = counts()
    today = date.today().isoformat()
    raw = args.readme.read_text(encoding="utf-8")
    # preserve line ending
    line_ending = "\r\n" if "\r\n" in raw[:2000] else "\n"
    new_text, changes = patch(raw, c, today)

    if new_text == raw:
        print("README already up-to-date.")
        print(f"Counts: anime={c['anime']} extra={c['extra']} pending={c['pending']} (snapshot {today})")
        sys.exit(0)

    if args.dry_run or args.check:
        print(f"Would update {len(changes)} sections: {', '.join(changes)}")
        print(f"Counts: {c}")
        # simple diff preview
        import difflib
        for line in difflib.unified_diff(raw.splitlines(), new_text.splitlines(), lineterm="", n=3):
            print(line)
        sys.exit(1 if args.check else 0)

    # write preserving line ending
    normalized = new_text.replace("\r\n", "\n").replace("\r", "\n")
    if line_ending != "\n":
        normalized = normalized.replace("\n", line_ending)
    args.readme.write_text(normalized, encoding="utf-8", newline="")
    print(f"Updated README: {', '.join(changes)}")
    print(f"Counts: anime={c['anime']} extra={c['extra']} pending={c['pending']} series_folders={c['series_folders']} bases={c['bases']} graphs={c['graphs']} date={today}")

if __name__ == "__main__":
    main()
