#!/usr/bin/env python3
"""
sync_studios.py

Syncs only three producer/studio fields from Tenrai (Jikan-compatible):
- Foundation date
- Cover image
- MyAnimeList link

It reads Markdown files with YAML frontmatter and updates only the managed keys
while preserving any custom fields already present.

Manual revision mode: originals are never touched. Updated files are written
to data/Studio_Updates/ (mirroring the folder structure) for manual review.
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import NamedTuple

try:
    import requests
except ImportError:
    sys.exit("[ERROR] 'requests' not installed. Run: pip install requests")


class Change(NamedTuple):
    field: str
    old: str
    new: str


# --- Paths ---
SCRIPT_DIR = Path(__file__).resolve().parent
VAULT_ROOT = SCRIPT_DIR.parent.parent

# Change this if your notes live elsewhere.
STUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "Extra" / "Studio"

DATA_DIR = SCRIPT_DIR / "data"
# Separate output folder from sync_anime.py's Metadata_Updates — they must not collide
UPDATES_DIR = DATA_DIR / "Studio_Updates"
LOG_PATH = DATA_DIR / "studios_synced.log"

# --- API ---
API_URL = "https://api.tenrai.org/v1/producers/{id}"
# Optional: paste a Patreon "X-Server-Key" here for 300 RPM/5 RPS instead of 120 RPM/4 RPS
SERVER_KEY = None
REQUEST_DELAY = 1.2
MAX_RETRIES = 3
RETRYABLE_CODES = {403, 429, 500, 502, 503, 504}
RETRY_BACKOFF_BASE = 4

# --- Regex ---
PRODUCER_ID_RE = re.compile(
    r"myanimelist\.net/anime/producer/(\d+)"
)
FRONTMATTER_RE = re.compile(r"\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*\r?\n?", re.DOTALL)
# Alternate key names some notes use for the managed fields — the first existing
# alias is preserved in place, the redundant ones are collapsed into it.
FIELD_ALIASES = {
    "Foundation": ("Foundation", "Established", "FoundationDate", "EstablishedDate"),
    "Cover": ("Cover", "Image"),
    "MAL": ("MAL",),
}


def load_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1")


def detect_line_ending(path: Path) -> str:
    raw = path.read_bytes()
    return "\r\n" if b"\r\n" in raw else "\n"


def write_text_preserving_line_ending(path: Path, content: str, line_ending: str) -> None:
    normalized = content.replace("\r\n", "\n").replace("\r", "\n")
    final = normalized.replace("\n", line_ending) if line_ending != "\n" else normalized
    path.write_text(final, encoding="utf-8", newline="")


def split_frontmatter(content: str) -> tuple[str, str] | None:
    m = FRONTMATTER_RE.match(content)
    if not m:
        return None
    return m.group("fm"), content[m.end():]


def parse_yaml_frontmatter(yaml_str: str) -> dict:
    meta: dict = {}
    current_key = None
    for raw_line in yaml_str.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("-") and current_key:
            val = line[1:].strip()
            if isinstance(meta.get(current_key), list):
                meta[current_key].append(val)
            else:
                meta[current_key] = [val]
        elif ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()
            if val == "[]":
                meta[key] = []
            elif val == "":
                meta[key] = ""
            else:
                meta[key] = val
            current_key = key
    return meta


def dump_yaml_frontmatter(meta: dict) -> str:
    lines = ["---"]
    for k, v in meta.items():
        if isinstance(v, list):
            if not v:
                lines.append(f"{k}: []")
            else:
                lines.append(f"{k}:")
                for item in v:
                    lines.append(f"  - {item}")
        else:
            lines.append(f"{k}: " if v in ("", None) else f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def extract_mal_id(content: str) -> str | None:
    split = split_frontmatter(content)
    if split is None:
        return None
    fm, _ = split
    m = PRODUCER_ID_RE.search(fm)
    return m.group(1) if m else None


def load_log(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def write_log(path: Path, items: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(sorted(items)) + "\n", encoding="utf-8")


def already_synced() -> set[str]:
    return load_log(LOG_PATH)


def build_headers() -> dict:
    return {"X-Server-Key": SERVER_KEY} if SERVER_KEY else {}


def retry_wait(resp, attempt: int) -> float:
    # Retry-After can be plain seconds OR an HTTP-date (RFC 2822) — handle both
    retry_after = (resp.headers.get("Retry-After") or "").strip()
    if retry_after:
        try:
            return max(0.0, float(retry_after))
        except ValueError:
            pass
        try:
            from email.utils import parsedate_to_datetime
            from datetime import timezone
            target = parsedate_to_datetime(retry_after)
            if target.tzinfo is None:
                target = target.replace(tzinfo=timezone.utc)
            return max(0.0, (target - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError):
            pass
    return RETRY_BACKOFF_BASE * (attempt + 1)


def describe_error(resp) -> str:
    try:
        body = resp.json()
        msg = body.get("message") or body.get("error")
        return f"HTTP {resp.status_code} — {msg}" if msg else f"HTTP {resp.status_code}"
    except Exception:
        return f"HTTP {resp.status_code}"


def fetch_producer(producer_id: str):
    resp = requests.get(API_URL.format(id=producer_id), headers=build_headers(), timeout=15)
    retries = 0
    while resp.status_code in RETRYABLE_CODES and retries < MAX_RETRIES:
        wait = retry_wait(resp, retries)
        print(f"({describe_error(resp)}, waiting {wait:.0f}s)", end=" ", flush=True)
        time.sleep(wait)
        resp = requests.get(API_URL.format(id=producer_id), headers=build_headers(), timeout=15)
        retries += 1
    return resp


def normalize_date_string(value: str) -> str:
    value = value.strip()
    if re.fullmatch(r"\d{4}", value):
        return f"{value}-01-01"
    return value[:10]


def parse_date_value(value) -> str:
    if not value:
        return ""
    if isinstance(value, str):
        return normalize_date_string(value)
    if isinstance(value, dict):
        for key in ("from", "date", "start", "year"):
            v = value.get(key)
            if isinstance(v, str) and v:
                return normalize_date_string(v)
        return ""
    return normalize_date_string(str(value))


def extract_founded_date(api_data: dict) -> str:
    for key in ("established", "foundation", "founded", "founded_at", "date_established"):
        if key in api_data and api_data[key]:
            return parse_date_value(api_data[key])
    return ""


def extract_picture_url(api_data: dict) -> str:
    images = api_data.get("images") or {}
    for size in ("jpg", "webp"):
        url = (images.get(size) or {}).get("image_url")
        if url:
            return url
    for key in ("image_url", "picture_url", "cover_url"):
        if api_data.get(key):
            return api_data[key]
    return ""


def normalize_value(val):
    if isinstance(val, list):
        return sorted(str(x).strip() for x in val)
    return [str(val).strip()] if val not in (None, "") else []


def format_value(val) -> str:
    if isinstance(val, list):
        return ", ".join(val) if val else "(none)"
    return str(val) if val not in (None, "") else "(none)"


def existing_alias_key(meta: dict, key: str) -> str | None:
    """Which alias of this managed field does the note actually use? None if it
    doesn't use any of them yet."""
    for alias in FIELD_ALIASES[key]:
        if alias in meta:
            return alias
    return None


def compute_changes(current_meta: dict, api_data: dict) -> tuple[dict, list[Change]]:
    target = {
        "Foundation": extract_founded_date(api_data),
        "Cover": extract_picture_url(api_data),
        "MAL": (
            f"https://myanimelist.net/anime/producer/{api_data['mal_id']}"
            if api_data.get("mal_id")
            else api_data.get("url", "")
        ),
    }

    changes: list[Change] = []

    for key in ("Foundation", "Cover", "MAL"):
        new_val = target.get(key)
        if not new_val:
            continue
        alias_key = existing_alias_key(current_meta, key)
        old_val = current_meta.get(alias_key) if alias_key else None
        if normalize_value(old_val) != normalize_value(new_val):
            changes.append(
                Change(
                    key,
                    format_value(old_val),
                    format_value(target.get(key)),
                )
            )

    return target, changes


def process_file(path: Path, api_data: dict) -> list[Change]:
    content = load_file(path)
    split = split_frontmatter(content)
    if split is None:
        return []

    raw_fm, body = split
    current_meta = parse_yaml_frontmatter(raw_fm)

    target, changes = compute_changes(current_meta, api_data)
    if not changes:
        return []

    merged = dict(current_meta)
    for key, value in target.items():
        if not value:
            continue
        alias_key = existing_alias_key(merged, key)
        if alias_key:
            # Keep the note's existing key name in place (dict order preserved)
            merged[alias_key] = value
            for alias in FIELD_ALIASES[key]:
                if alias != alias_key:
                    merged.pop(alias, None)
        else:
            merged[key] = value

    new_content = f"{dump_yaml_frontmatter(merged)}{body}"
    out_path = UPDATES_DIR / path.relative_to(STUDIO_DIR)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_text_preserving_line_ending(out_path, new_content, detect_line_ending(path))
    return changes


def write_changes_report(all_changes: list[tuple[str, list[Change]]]) -> Path:
    lines = [f"# Studio Metadata Changes — {datetime.now().strftime('%Y-%m-%d %H:%M')}", ""]
    lines.append(f"**{len(all_changes)} entries with changes**")
    lines.append("")
    for name, changes in all_changes:
        lines.append(f"## {name}")
        for key, old, new in changes:
            lines.append(f"- **{key}**: {old} → {new}")
        lines.append("")

    UPDATES_DIR.mkdir(parents=True, exist_ok=True)
    report_path = UPDATES_DIR / "_changes_report.md"
    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Recheck all files")
    args = parser.parse_args()

    if not STUDIO_DIR.exists():
        sys.exit(f"[ERROR] Studio folder not found: {STUDIO_DIR}")

    synced = set() if args.full else already_synced()
    files = sorted(STUDIO_DIR.rglob("*.md"))

    pending: list[tuple[Path, str]] = []
    for fp in files:
        if str(fp.relative_to(STUDIO_DIR).with_suffix("")) in synced:
            continue
        mal_id = extract_mal_id(load_file(fp))
        if mal_id:
            pending.append((fp, mal_id))

    print("Studio Metadata Sync — Tenrai API")
    print("=" * 50)
    print(f"Mode    : {'FULL RESCAN' if args.full else 'Incremental'}")
    print(f"Pending : {len(pending)} files")

    if not pending:
        print("Nothing to sync.")
        return

    updated = set(synced)
    all_changes: list[tuple[str, list[Change]]] = []
    consecutive_failures = 0
    CONSECUTIVE_FAILURE_LIMIT = 3  # several failures in a row = a sustained block, not a bad ID

    for i, (fp, mal_id) in enumerate(pending, 1):
        key = str(fp.relative_to(STUDIO_DIR).with_suffix(""))
        print(f"[{i:>3}/{len(pending)}] {fp.stem[:50]:<50}", end=" ", flush=True)
        interrupted = False

        try:
            resp = fetch_producer(mal_id)
            if resp.status_code != 200:
                print(f"{describe_error(resp)} (Will retry next run)")
                consecutive_failures += 1
                if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                    print("\n3 failures in a row, even after retries within each — a sustained "
                          "issue, not a one-off. Stopping here; nothing already done is lost, "
                          "just run again later.")
                    interrupted = True
            else:
                consecutive_failures = 0
                raw = resp.json()
                data = raw.get("data", raw)  # auto-detect nested vs. flat response

                changes = process_file(fp, data)
                if changes:
                    print("UPDATED")
                    all_changes.append((key, changes))
                else:
                    print("OK")

                updated.add(key)

        except KeyboardInterrupt:
            print("\nInterrupted.")
            interrupted = True
        except Exception as exc:
            print(f"ERROR: {exc}")

        if interrupted:
            break
        time.sleep(REQUEST_DELAY)

    write_log(LOG_PATH, updated)

    print("=" * 50)
    if all_changes:
        report = write_changes_report(all_changes)
        print(f"Finished. {len(all_changes)} entries changed.")
        print(f"Report: {report}")
        print(f"Outputs: {UPDATES_DIR}")
    else:
        print("Finished. No changes found.")


if __name__ == "__main__":
    main()
