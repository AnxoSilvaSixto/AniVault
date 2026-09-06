#!/usr/bin/env python3
"""
sync_studios.py — Studio/Producer Metadata Sync from Tenrai API.

Syncs only three producer/studio fields from Tenrai (Jikan v4 schema):
  - Foundation date
  - Cover image
  - MyAnimeList link

Reads Markdown files with YAML frontmatter and updates only the managed keys
while preserving any custom fields already present. Originals are never touched;
updated files are written to data/Studio_Updates/ for manual review.
"""

from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import NamedTuple

import requests

# --- Paths & Configuration ---

SCRIPT_DIR = Path(__file__).resolve().parent
VAULT_ROOT = SCRIPT_DIR.parent.parent
STUDIO_DIR = VAULT_ROOT / "Extra" / "Studio"
DATA_DIR = SCRIPT_DIR / "data"
UPDATES_DIR = DATA_DIR / "Studio_Updates"
LOG_PATH = DATA_DIR / "studios_synced.log"

API_URL = "https://api.tenrai.org/v1/producers/{id}"
SERVER_KEY = os.environ.get("TENRAI_SERVER_KEY")
DEFAULT_DELAY = 1.2
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 4
RETRYABLE_CODES = frozenset({403, 429, 500, 502, 503, 504})

PRODUCER_ID_RE = re.compile(r"myanimelist\.net/anime/producer/(\d+)")
FRONTMATTER_RE = re.compile(r"\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*\r?\n?", re.DOTALL)

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "Foundation": ("Foundation", "Established", "FoundationDate", "EstablishedDate"),
    "Cover": ("Cover", "Image"),
    "MAL": ("MAL",),
}

logger = logging.getLogger("sync_studios")


# --- Data Models ---

class Change(NamedTuple):
    """One changed field: what it's called, what it was, what it's becoming."""
    field: str
    old: str
    new: str


@dataclass
class SyncConfig:
    """Configuration for a sync run."""
    full: bool = False
    dry_run: bool = False
    delay: float = DEFAULT_DELAY
    parallel: int = 1


class RateLimiter:
    """Thread-safe rate limiter for concurrent API requests."""

    def __init__(self, delay: float):
        self._delay = delay
        self._next_allowed = 0.0
        self._lock = threading.Lock()

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            if self._next_allowed > now:
                time.sleep(self._next_allowed - now)
                now = self._next_allowed
            self._next_allowed = now + self._delay


# --- HTTP Layer ---

def build_headers() -> dict[str, str]:
    return {"X-Server-Key": SERVER_KEY} if SERVER_KEY else {}


def create_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(build_headers())
    return session


def retry_wait(resp: requests.Response, attempt: int) -> float:
    """Prefer the server's Retry-After header; fall back to backoff schedule."""
    retry_after = (resp.headers.get("Retry-After") or "").strip()
    if retry_after:
        try:
            return max(0.0, float(retry_after))
        except ValueError:
            pass
        try:
            target = parsedate_to_datetime(retry_after)
            if target.tzinfo is None:
                target = target.replace(tzinfo=timezone.utc)
            return max(0.0, (target - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError):
            pass
    return RETRY_BACKOFF_BASE * (attempt + 1)


def describe_error(resp: requests.Response) -> str:
    try:
        body = resp.json()
        msg = body.get("message") or body.get("error")
        return f"HTTP {resp.status_code} \u2014 {msg}" if msg else f"HTTP {resp.status_code}"
    except Exception:
        return f"HTTP {resp.status_code}"


def fetch_producer(session: requests.Session, producer_id: str, delay: float, rate_limiter: RateLimiter | None = None) -> requests.Response:
    """GET producer details, retrying with backoff on RETRYABLE_CODES."""
    if rate_limiter:
        rate_limiter.acquire()
    resp = session.get(API_URL.format(id=producer_id), timeout=15)
    retries = 0
    while resp.status_code in RETRYABLE_CODES and retries < MAX_RETRIES:
        wait = retry_wait(resp, retries)
        logger.info(f"  ({describe_error(resp)}, waiting {wait:.0f}s)")
        time.sleep(wait)
        if rate_limiter:
            rate_limiter.acquire()
        resp = session.get(API_URL.format(id=producer_id), timeout=15)
        retries += 1
    return resp


# --- File I/O ---

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


# --- Frontmatter Parsing ---

def split_frontmatter(content: str) -> tuple[str, str] | None:
    m = FRONTMATTER_RE.match(content)
    if not m:
        return None
    return m.group("fm"), content[m.end():]


def extract_mal_id(content: str) -> str | None:
    split = split_frontmatter(content)
    if split is None:
        return None
    fm, _ = split
    m = PRODUCER_ID_RE.search(fm)
    return m.group(1) if m else None


def parse_yaml_frontmatter(yaml_str: str) -> dict:
    meta: dict[str, object] = {}
    current_key: str | None = None
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
            if v in ("", None):
                lines.append(f"{k}: ")
            else:
                lines.append(f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n"


# --- Value Extraction ---

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


def normalize_value(val) -> list[str]:
    if isinstance(val, list):
        return sorted(str(x).strip() for x in val)
    return [str(val).strip()] if val not in (None, "") else []


def format_value(val) -> str:
    if isinstance(val, list):
        return ", ".join(val) if val else "(none)"
    return str(val) if val not in (None, "") else "(none)"


# --- Field Alias Handling ---

def existing_alias_key(meta: dict, key: str) -> str | None:
    """Which alias of this managed field does the note actually use?"""
    for alias in FIELD_ALIASES[key]:
        if alias in meta:
            return alias
    return None


# --- Change Computation ---

def compute_changes(current_meta: dict, api_data: dict) -> tuple[dict, list[Change]]:
    """Pure computation: given current frontmatter and fresh API payload, return (target_values, changes)."""
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
            changes.append(Change(key, format_value(old_val), format_value(target.get(key))))

    return target, changes


def process_file(path: Path, api_data: dict, config: SyncConfig) -> list[Change]:
    """Reads file once, computes changes, writes once if anything changed."""
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
            merged[alias_key] = value
            for alias in FIELD_ALIASES[key]:
                if alias != alias_key:
                    merged.pop(alias, None)
        else:
            merged[key] = value

    new_content = f"{dump_yaml_frontmatter(merged)}{body}"
    if not config.dry_run:
        out_path = UPDATES_DIR / path.relative_to(STUDIO_DIR)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        write_text_preserving_line_ending(out_path, new_content, detect_line_ending(path))

    return changes


# --- Log Management ---

def load_log(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def write_log(path: Path, items: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(sorted(items)) + "\n", encoding="utf-8")


# --- Report ---

def write_changes_report(all_changes: list[tuple[str, list[Change]]]) -> Path:
    lines = [f"# Studio Metadata Changes — {datetime.now().strftime('%Y-%m-%d %H:%M')}", ""]
    lines.append(f"**{len(all_changes)} entries with changes**")
    lines.append("")
    for name, changes in all_changes:
        lines.append(f"## {name}")
        for field_name, old, new in changes:
            lines.append(f"- **{field_name}**: {old} → {new}")
        lines.append("")
    UPDATES_DIR.mkdir(parents=True, exist_ok=True)
    report_path = UPDATES_DIR / "_changes_report.md"
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return report_path


# --- Sync Orchestration ---

def process_one_studio(
    session: requests.Session,
    path: Path,
    mal_id: str,
    idx: int,
    total: int,
    config: SyncConfig,
    rate_limiter: RateLimiter | None,
) -> tuple[str, list[Change], str | None]:
    """Fetch and process a single studio file."""
    key = str(path.relative_to(STUDIO_DIR).with_suffix(""))
    pct = (idx - 1) / total * 100 if total else 0
    print(f"\r[{idx:>3}/{total}] ({pct:5.1f}%) {path.stem[:50]:<50}", end="", flush=True)

    try:
        resp = fetch_producer(session, mal_id, config.delay, rate_limiter)
    except requests.RequestException as e:
        return key, [], f"ERROR: {e}"

    if resp.status_code != 200:
        return key, [], describe_error(resp)

    raw = resp.json()
    data = raw.get("data", raw)
    if not data:
        return key, [], "EMPTY DATA"

    changes = process_file(path, data, config)
    if changes:
        status = "WOULD UPDATE" if config.dry_run else "UPDATED"
        print(f" {status}", flush=True)
    else:
        print(" OK", flush=True)
    return key, changes, None


def run_sequential(session: requests.Session, pending: list[tuple[Path, str]], config: SyncConfig) -> tuple[set[str], list[tuple[str, list[Change]]], list[str]]:
    """Sequential sync mode.
    Returns (updated, all_changes, failed_keys).
    """
    updated: set[str] = set()
    all_changes: list[tuple[str, list[Change]]] = []
    failed_keys: list[str] = []
    consecutive_failures = 0
    CONSECUTIVE_FAILURE_LIMIT = 3

    for i, (path, mal_id) in enumerate(pending, 1):
        key = str(path.relative_to(STUDIO_DIR).with_suffix(""))
        pct = (i - 1) / len(pending) * 100
        print(f"\r[{i:>3}/{len(pending)}] ({pct:5.1f}%) {path.stem[:50]:<50}", end="", flush=True)

        try:
            resp = fetch_producer(session, mal_id, config.delay)
        except requests.RequestException as e:
            print(f" ERROR: {e} (Will retry)", flush=True)
            failed_keys.append(key)
            consecutive_failures += 1
            if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                print(f"\n{CONSECUTIVE_FAILURE_LIMIT} consecutive failures — stopping.")
                break
            time.sleep(config.delay)
            continue

        if resp.status_code != 200:
            print(f" {describe_error(resp)} (Will retry)", flush=True)
            failed_keys.append(key)
            consecutive_failures += 1
            if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                print(f"\n{CONSECUTIVE_FAILURE_LIMIT} consecutive failures — stopping.")
                break
            time.sleep(config.delay)
            continue

        raw = resp.json()
        data = raw.get("data", raw)
        if not data:
            print(" EMPTY DATA (Will retry)", flush=True)
            failed_keys.append(key)
            consecutive_failures += 1
            if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                print(f"\n{CONSECUTIVE_FAILURE_LIMIT} consecutive failures — stopping.")
                break
            time.sleep(config.delay)
            continue

        consecutive_failures = 0
        changes = process_file(path, data, config)
        if changes:
            print(f" {'WOULD UPDATE' if config.dry_run else 'UPDATED'}", flush=True)
            all_changes.append((key, changes))
        else:
            print(" OK", flush=True)
        updated.add(key)
        time.sleep(config.delay)

    return updated, all_changes, failed_keys


def run_parallel(session: requests.Session, pending: list[tuple[Path, str]], config: SyncConfig) -> tuple[set[str], list[tuple[str, list[Change]]], list[str]]:
    """Parallel sync mode using ThreadPoolExecutor with shared rate limiter.
    Returns (updated, all_changes, failed_keys).
    """
    updated: set[str] = set()
    all_changes: list[tuple[str, list[Change]]] = []
    failed_keys: list[str] = []
    consecutive_failures = 0
    CONSECUTIVE_FAILURE_LIMIT = 3
    total = len(pending)
    rate_limiter = RateLimiter(config.delay / config.parallel)

    with ThreadPoolExecutor(max_workers=config.parallel) as pool:
        futures = {
            pool.submit(process_one_studio, session, fp, mal_id, idx, total, config, rate_limiter): idx
            for idx, (fp, mal_id) in enumerate(pending, 1)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                key, changes, error = future.result()
            except Exception as e:
                fp_name = pending[idx - 1][0].stem[:50]
                pct = (idx - 1) / total * 100 if total else 0
                print(f"\r[{idx:>3}/{total}] ({pct:5.1f}%) {fp_name:<50} ERROR: {e} (Will retry)", flush=True)
                failed_keys.append(str(pending[idx - 1][0].relative_to(STUDIO_DIR).with_suffix("")))
                consecutive_failures += 1
                if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                    print(f"\n{CONSECUTIVE_FAILURE_LIMIT} failures in a row — stopping.")
                    for f in futures:
                        f.cancel()
                    break
                continue

            if error:
                fp_name = pending[idx - 1][0].stem[:50]
                pct = (idx - 1) / total * 100 if total else 0
                print(f"\r[{idx:>3}/{total}] ({pct:5.1f}%) {fp_name:<50} {error} (Will retry)", flush=True)
                failed_keys.append(key)
                consecutive_failures += 1
                if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                    print(f"\n{CONSECUTIVE_FAILURE_LIMIT} failures in a row — stopping.")
                    for f in futures:
                        f.cancel()
                    break
                continue

            consecutive_failures = 0
            if changes:
                print(f" {'WOULD UPDATE' if config.dry_run else 'UPDATED'}", flush=True)
                all_changes.append((key, changes))
            else:
                print(" OK", flush=True)
            updated.add(key)

    return updated, all_changes, failed_keys


def main(argv: list[str] | None = None) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    start_time = time.monotonic()

    parser = argparse.ArgumentParser(
        description="Preview or generate manual-review studio metadata updates from Tenrai.",
        epilog=(
            "Tenrai limits: public 120 requests/minute and 4 requests/second; "
            "server-key tier 300/minute and 5/second. 429 Retry-After is honored. "
            "Set TENRAI_SERVER_KEY in the environment for the optional server key."
        ),
    )
    parser.add_argument("--full", action="store_true", help="Recheck all files")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing files")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY,
                        help=f"Seconds between API requests (default: {DEFAULT_DELAY})")
    parser.add_argument("--parallel", type=int, default=1,
                        help="Number of concurrent API requests (default: 1, sequential). "
                             "Use 2-4 for faster syncs; each worker paces at delay/N seconds.")
    args = parser.parse_args(argv)

    config = SyncConfig(
        full=args.full,
        dry_run=args.dry_run,
        delay=args.delay,
        parallel=max(1, args.parallel),
    )

    print("Studio Metadata Sync — Tenrai API")
    print("=" * 50)

    if not STUDIO_DIR.exists():
        print(f"[ERROR] Studio folder not found: {STUDIO_DIR}")
        return 1

    already = set() if config.full else load_log(LOG_PATH)
    files = sorted(STUDIO_DIR.rglob("*.md"))
    pending: list[tuple[Path, str]] = []
    for fp in files:
        key = str(fp.relative_to(STUDIO_DIR).with_suffix(""))
        if key in already:
            continue
        mal_id = extract_mal_id(load_file(fp))
        if mal_id:
            pending.append((fp, mal_id))

    print(f"Mode    : {'FULL RESCAN' if config.full else 'Incremental'}{' (DRY RUN)' if config.dry_run else ''}")
    print(f"Pending : {len(pending)} files")
    if config.parallel > 1:
        print(f"Parallel: {config.parallel} workers (effective delay={config.delay / config.parallel:.3f}s/request)")

    if not pending:
        print("Nothing to sync.")
        return 0

    retry_pending: list[tuple[Path, str]] = []

    try:
        with create_session() as session:
            if config.parallel > 1:
                updated, all_changes, failed_keys = run_parallel(session, pending, config)
            else:
                updated, all_changes, failed_keys = run_sequential(session, pending, config)

            # Collect failed files for a second retry pass
            if failed_keys:
                failed_set = set(failed_keys)
                retry_pending = [(fp, mid) for fp, mid in pending if str(fp.relative_to(STUDIO_DIR).with_suffix("")) in failed_set]
    except KeyboardInterrupt:
        print("\nInterrupted. Saving log...")
    finally:
        if not config.dry_run:
            write_log(LOG_PATH, updated)

    # Second pass: retry failed files with a longer delay
    if retry_pending:
        retry_config = SyncConfig(
            full=config.full,
            dry_run=config.dry_run,
            delay=config.delay * 3,  # longer delay for retry
            parallel=1,  # sequential retry to be gentle on the API
        )
        print("\n" + "=" * 50)
        print(f"RETRY PASS: {len(retry_pending)} files failed in first pass.")
        print("=" * 50)

        try:
            with create_session() as session:
                r_updated, r_changes, _ = run_sequential(session, retry_pending, retry_config)
                updated.update(r_updated)
                all_changes.extend(r_changes)

                # Update logs after retry pass
                if not config.dry_run:
                    write_log(LOG_PATH, updated)
        except KeyboardInterrupt:
            print("\nInterrupted during retry pass!")

    print("=" * 50)
    if all_changes:
        if config.dry_run:
            print(f"Dry run complete. {len(all_changes)} entries would change.")
        else:
            report = write_changes_report(all_changes)
            print(f"Finished. {len(all_changes)} entries changed.")
            print(f"Report: {report}")
            print(f"Outputs: {UPDATES_DIR}")
    else:
        print("Finished. No changes found.")

    elapsed = time.monotonic() - start_time
    print(f"Elapsed: {elapsed:.1f}s ({len(pending)} files, {len(all_changes)} changed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
