"""Sync-log/report helpers for sync scripts.
file_key keeps OS separator (backslash on Windows, e.g. Beastars\\Beastars) to match logs; never as_posix().
Usage: from common import logs as _logs
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple


class Change(NamedTuple):
    """One changed field: what it's called, what it was, what it's becoming."""

    field: str
    old: str
    new: str


def file_key(path: Path, base_dir: Path) -> str:
    """Key relative to base_dir, preserving OS separator (backslash on Windows)."""
    return str(path.relative_to(base_dir).with_suffix(""))


def load_log(path: Path) -> set[str]:
    """Read a sync log into a set of file keys (empty set when missing)."""
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def write_log(path: Path, items: set[str]) -> None:
    """Write file keys sorted, one per line with a trailing newline."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(sorted(items)) + "\n", encoding="utf-8")


def write_changes_report(
    updates_dir: Path,
    title: str,
    unit: str,
    all_changes: Sequence[tuple[str, Sequence[tuple[str, str, str]]]],
    summary: str = "",
) -> Path:
    """Write _changes_report.md review file under updates_dir."""
    lines = [f"# {title} — {datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M')}", ""]
    if summary:
        lines.append(summary)
        lines.append("")
    lines.append(f"**{len(all_changes)} {unit} with changes**")
    lines.append("")
    for name, changes in all_changes:
        lines.append(f"## {name}")
        for field_name, old, new in changes:
            lines.append(f"- **{field_name}**: {old} → {new}")
        lines.append("")
    updates_dir.mkdir(parents=True, exist_ok=True)
    report_path = updates_dir / "_changes_report.md"
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return report_path
