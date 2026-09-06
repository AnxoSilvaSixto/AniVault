#!/usr/bin/env python3
"""
sync_anime.py — Anime Metadata Sync from Tenrai API (Jikan v4 schema).

Fetches current metadata for each anime from the Tenrai API and outputs
complete, updated Markdown files into a 'Metadata_Updates' folder for manual
review. Works incrementally (only new/changed entries) or with --full rescan.

Note: Rating is intentionally excluded from the sync — that field holds your
own personal score, not the source's community score.
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
ANIME_DIR = VAULT_ROOT / "Anime"
DATA_DIR = SCRIPT_DIR / "data"
UPDATES_DIR = DATA_DIR / "Metadata_Updates"

API_URL = "https://api.tenrai.org/v1/anime/{mal_id}"
SERVER_KEY = os.environ.get("TENRAI_SERVER_KEY")
DEFAULT_DELAY = 1.0
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 5
RETRYABLE_CODES = frozenset({403, 429, 500, 502, 503, 504})
WRITE_FULL_FILES = True

LOG_PATH = DATA_DIR / "metadata_synced.log"
SYNOPSIS_LOG_PATH = DATA_DIR / "synopsis_synced.log"

MAL_ID_RE = re.compile(r"myanimelist\.net/anime/(\d+)")

logger = logging.getLogger("sync_anime")


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
    mode: str = "both"
    dry_run: bool = False
    delay: float = DEFAULT_DELAY
    parallel: int = 1


# --- Logging ---

def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(message)s",
        stream=sys.stdout,
    )


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


def fetch_anime(session: requests.Session, mal_id: str, delay: float) -> requests.Response:
    """GET anime details, retrying with backoff on RETRYABLE_CODES."""
    resp = session.get(API_URL.format(mal_id=mal_id), timeout=15)
    retries = 0
    while resp.status_code in RETRYABLE_CODES and retries < MAX_RETRIES:
        wait = retry_wait(resp, retries)
        logger.info(f"  ({describe_error(resp)}, waiting {wait:.0f}s)")
        time.sleep(wait)
        resp = session.get(API_URL.format(mal_id=mal_id), timeout=15)
        retries += 1
    return resp


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


# --- File I/O ---

def load_file(filepath: Path) -> str:
    try:
        return filepath.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return filepath.read_text(encoding="latin-1")


def detect_line_ending(filepath: Path) -> str:
    raw = filepath.read_bytes()
    return "\r\n" if b"\r\n" in raw else "\n"


def write_text_preserving_line_ending(filepath: Path, content: str, line_ending: str) -> None:
    normalized = content.replace("\r\n", "\n").replace("\r", "\n")
    final = normalized.replace("\n", line_ending) if line_ending != "\n" else normalized
    filepath.write_text(final, encoding="utf-8", newline="")


# --- Frontmatter Parsing ---

FRONTMATTER_RE = re.compile(r"\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*\r?\n?", re.DOTALL)


def split_frontmatter(content: str) -> tuple[str, str] | None:
    m = FRONTMATTER_RE.match(content)
    if not m:
        return None
    return m.group("fm"), content[m.end():]


def extract_mal_id(content: str) -> str | None:
    split = split_frontmatter(content)
    if split is None:
        return None
    frontmatter_text, _ = split
    m = MAL_ID_RE.search(frontmatter_text)
    return m.group(1) if m else None


def file_key(fp: Path) -> str:
    """Unique identifier for sync-log tracking (relative to ANIME_DIR)."""
    return str(fp.relative_to(ANIME_DIR).with_suffix(""))


def parse_yaml_frontmatter(yaml_str: str) -> dict:
    metadata: dict[str, object] = {}
    current_key: str | None = None
    for raw_line in yaml_str.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("-") and current_key:
            val = line[1:].strip()
            if isinstance(metadata.get(current_key), list):
                metadata[current_key].append(val)
            else:
                metadata[current_key] = [val]
        elif ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()
            if val == "[]":
                metadata[key] = []
                current_key = key
            elif not val:
                metadata[key] = ""
                current_key = key
            else:
                metadata[key] = val
                current_key = key
    return metadata


def dump_yaml_frontmatter(meta_dict: dict) -> str:
    lines = ["---"]
    for k, v in meta_dict.items():
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


# --- Normalization Helpers ---

def normalize_value(val) -> list[str]:
    if isinstance(val, list):
        return sorted([str(x).replace('"', '').replace("'", '').replace('[', '').replace(']', '').strip() for x in val])
    else:
        s = str(val or "").replace('"', '').replace("'", '').replace('[', '').replace(']', '').strip()
        return [s] if s else []


def format_value(val) -> str:
    if isinstance(val, list):
        return ", ".join(val) if val else "(none)"
    return str(val) if val not in (None, "") else "(none)"


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


def normalize_type(raw_type: str) -> str:
    """Fold every 'Special' variant into one canonical value."""
    if raw_type and "special" in raw_type.lower():
        return "Special"
    return raw_type or ""


def wikilink(name: str) -> str:
    """Build a YAML-safe, wikilink-safe '"[[Name]]"' string from a raw API value."""
    safe = str(name).replace('\\', '\\\\').replace('"', '\\"').replace('[[', '[').replace(']]', ']')
    return f'"[[{safe}]]"'


# --- Synopsis Handling ---

SYNOPSIS_CALLOUT_RE = re.compile(r"^>\s*\[!summary\]\s*Synopsis\s*$", re.IGNORECASE)
CALLOUT_START_RE = re.compile(r"^>\s*\[!")
MAL_ATTRIBUTION_RE = re.compile(r"\n{1,2}\[Written by.*?\].*$", re.IGNORECASE)


def clean_synopsis_text(raw: str) -> str:
    """Strip MAL's '[Written by X]' attribution suffix."""
    return MAL_ATTRIBUTION_RE.sub("", (raw or "")).strip()


def normalize_synopsis_text(text: str) -> str:
    """Collapse a synopsis to stable form for idempotent write/read cycles."""
    paragraphs = [p for p in text.split("\n\n") if p.strip()]
    lines: list[str] = []
    for pi, para in enumerate(paragraphs):
        for pline in para.splitlines():
            lines.append(pline.strip())
        if pi < len(paragraphs) - 1:
            lines.append("")
    return "\n".join(lines).strip()


def extract_synopsis_text(body: str) -> str | None:
    """Pull plain text out of the '> [!summary] Synopsis' callout."""
    lines = body.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    start = None
    for i, line in enumerate(lines):
        if SYNOPSIS_CALLOUT_RE.match(line.strip()):
            start = i + 1
            break
    if start is None:
        return None
    text_lines: list[str] = []
    for line in lines[start:]:
        stripped = line.lstrip()
        if not stripped.startswith(">") or CALLOUT_START_RE.match(stripped):
            break
        text_lines.append(stripped[1:].strip())
    return "\n".join(text_lines).strip()


def replace_synopsis_block(body: str, new_synopsis: str) -> str:
    """Replace ONLY the content of the Synopsis callout with new_synopsis."""
    normalized = body.replace("\r\n", "\n").replace("\r", "\n")
    lines = normalized.split("\n")

    block = [">[!summary] Synopsis"]
    paragraphs = [p for p in new_synopsis.split("\n\n") if p.strip()]
    for pi, para in enumerate(paragraphs):
        for pline in para.splitlines():
            block.append(f"> {pline}" if pline.strip() else ">")
        if pi < len(paragraphs) - 1:
            block.append(">")

    start = None
    for i, line in enumerate(lines):
        if SYNOPSIS_CALLOUT_RE.match(line.strip()):
            start = i
            break

    if start is None:
        leading_blank = [""] if lines and lines[0].strip() == "" else []
        rest = lines[len(leading_blank):]
        new_lines = leading_blank + block + ["", ""] + rest
    else:
        end = start + 1
        while end < len(lines):
            stripped = lines[end].lstrip()
            if not stripped.startswith(">") or CALLOUT_START_RE.match(stripped):
                break
            end += 1
        new_lines = lines[:start] + block + lines[end:]

    return "\n".join(new_lines)


# --- Change Computation ---

MANAGED_KEYS = ["ID", "Type", "Episodes", "Aired", "Finished", "Studio", "Source",
                "Genre", "Themes", "Demographic", "Cover", "MAL"]


def compute_frontmatter_changes(current_meta: dict, api_data: dict) -> tuple[dict, list[Change]]:
    """Pure computation, no file I/O: given current frontmatter and fresh API payload."""
    target_meta: dict = {}
    target_meta["ID"] = api_data.get("mal_id", "")

    anime_type = normalize_type(api_data.get("type", ""))
    target_meta["Type"] = wikilink(anime_type) if anime_type else ""

    ep_count = api_data.get("episodes")
    is_movie = api_data.get("type", "").lower() == "movie"
    target_meta["Episodes"] = 1 if is_movie and ep_count is None else (ep_count or "")

    aired = api_data.get("aired") or {}
    aired_date = parse_date_value(aired.get("from"))
    target_meta["Aired"] = aired_date

    finished_date = parse_date_value(aired.get("to"))
    if aired_date and not finished_date:
        finished_date = aired_date
    target_meta["Finished"] = finished_date

    target_meta["Studio"] = [wikilink(s["name"]) for s in (api_data.get("studios") or [])]
    target_meta["Source"] = wikilink(api_data.get("source", "")) if api_data.get("source") else ""
    target_meta["Genre"] = [wikilink(g["name"]) for g in (api_data.get("genres") or [])]
    target_meta["Themes"] = [wikilink(t["name"]) for t in (api_data.get("themes") or [])]
    target_meta["Demographic"] = [wikilink(d["name"]) for d in (api_data.get("demographics") or [])]
    target_meta["Cover"] = api_data.get("images", {}).get("jpg", {}).get("large_image_url", "")

    mal_id = api_data.get("mal_id")
    target_meta["MAL"] = (
        f"https://myanimelist.net/anime/{mal_id}" if mal_id else api_data.get("url", "")
    )

    changes: list[Change] = []
    for key in MANAGED_KEYS:
        new_val = target_meta.get(key)
        if not new_val:
            continue
        old_val = current_meta.get(key)
        if normalize_value(old_val) != normalize_value(new_val):
            changes.append(Change(key, format_value(old_val), format_value(new_val)))

    return target_meta, changes


def compute_synopsis_changes(body: str, api_data: dict) -> tuple[str, list[Change]]:
    """Synopsis comes from the same Tenrai response. Handles both Jikan v3 ('synopsis') and v4 ('description') field names."""
    new_synopsis = clean_synopsis_text(
        api_data.get("synopsis") or api_data.get("description", "")
    )
    if not new_synopsis:
        return body, []
    new_synopsis = normalize_synopsis_text(new_synopsis)

    current_synopsis = extract_synopsis_text(body) or ""
    if current_synopsis.strip() == new_synopsis.strip():
        return body, []

    new_body = replace_synopsis_block(body, new_synopsis)
    change_note = Change(
        "Synopsis",
        f"{len(current_synopsis)} chars" if current_synopsis else "(none)",
        f"{len(new_synopsis)} chars",
    )
    return new_body, [change_note]


def process_anime_file(filepath: Path, api_data: dict, config: SyncConfig) -> list[Change]:
    """Reads file once, computes changes per mode, writes once if anything changed."""
    content = load_file(filepath)
    split = split_frontmatter(content)
    if split is None:
        return []

    raw_frontmatter, body = split
    current_meta = parse_yaml_frontmatter(raw_frontmatter)
    changes: list[Change] = []

    new_yaml = f"---\n{raw_frontmatter}---\n"
    new_body = body

    if config.mode in ("info", "both"):
        target_meta, fm_changes = compute_frontmatter_changes(current_meta, api_data)
        changes.extend(fm_changes)
        if fm_changes:
            merged_meta: dict = {"ID": target_meta["ID"]}
            merged_meta.update(current_meta)
            for key, value in target_meta.items():
                if not value:
                    continue
                merged_meta[key] = value
            new_yaml = dump_yaml_frontmatter(merged_meta)

    if config.mode in ("synopsis", "both"):
        new_body, syn_changes = compute_synopsis_changes(body, api_data)
        changes.extend(syn_changes)

    if changes and WRITE_FULL_FILES and not config.dry_run:
        new_content = f"{new_yaml}{new_body}"
        out_path = UPDATES_DIR / filepath.relative_to(ANIME_DIR)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        line_ending = detect_line_ending(filepath)
        write_text_preserving_line_ending(out_path, new_content, line_ending)

    return changes


# --- Log Management ---

def load_log(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text("utf-8").splitlines() if line.strip()}


def write_log(path: Path, items: set[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(sorted(items)) + "\n", encoding="utf-8")


def already_synced_for_mode(mode: str) -> set[str]:
    """A file only counts as synced for the aspects the given mode checks."""
    info_done = load_log(LOG_PATH)
    synopsis_done = load_log(SYNOPSIS_LOG_PATH)
    if mode == "info":
        return info_done
    if mode == "synopsis":
        return synopsis_done
    return info_done & synopsis_done


# --- Report ---

def write_changes_report(all_changes: list[tuple[str, list[Change]]]) -> Path:
    lines = [f"# Metadata Changes — {datetime.now().strftime('%Y-%m-%d %H:%M')}", ""]
    lines.append(f"**{len(all_changes)} anime with changes**")
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

def discover_pending(anime_files: list[Path], already: set[str], mode: str) -> list[tuple[Path, str]]:
    """Filter to files that need syncing, extracting their MAL IDs."""
    pending: list[tuple[Path, str]] = []
    for fp in anime_files:
        if file_key(fp) in already:
            continue
        content = load_file(fp)
        mal_id = extract_mal_id(content)
        if mal_id:
            pending.append((fp, mal_id))
    return pending


def process_one_file(
    session: requests.Session,
    fp: Path,
    mal_id: str,
    idx: int,
    total: int,
    config: SyncConfig,
    rate_limiter: RateLimiter | None,
) -> tuple[str, list[Change], str | None]:
    """Fetch and process a single anime file. Returns (file_key_str, changes, error)."""
    key = file_key(fp)
    pct = (idx - 1) / total * 100 if total else 0
    print(f"\r[{idx:>3}/{total}] ({pct:5.1f}%) {fp.stem[:50]:<50}", end="", flush=True)

    if rate_limiter:
        rate_limiter.acquire()

    try:
        resp = fetch_anime(session, mal_id, config.delay)
    except requests.RequestException as e:
        return key, [], f"ERROR: {e}"

    if resp.status_code != 200:
        return key, [], describe_error(resp)

    api_data = resp.json().get("data", {})
    if not api_data:
        return key, [], "EMPTY DATA"

    changes = process_anime_file(fp, api_data, config)
    if changes:
        status = "WOULD UPDATE" if config.dry_run else "UPDATE GENERATED"
        print(f" {status} ({len(changes)} changes)", flush=True)
    else:
        print(" OK", flush=True)
    return key, changes, None


def run_sequential(
    session: requests.Session,
    pending: list[tuple[Path, str]],
    config: SyncConfig,
) -> tuple[set[str], set[str], list[tuple[str, list[Change]]], list[str]]:
    """Sequential sync mode — simpler, lower memory, easier to debug.
    Returns (info_synced, synopsis_synced, all_changes, failed_keys).
    """
    info_synced: set[str] = set()
    synopsis_synced: set[str] = set()
    all_changes: list[tuple[str, list[Change]]] = []
    failed_keys: list[str] = []
    consecutive_failures = 0
    CONSECUTIVE_FAILURE_LIMIT = 3

    for i, (fp, mal_id) in enumerate(pending, 1):
        pct = (i - 1) / len(pending) * 100
        print(f"\r[{i:>3}/{len(pending)}] ({pct:5.1f}%) {fp.stem[:50]:<50}", end="", flush=True)

        try:
            resp = fetch_anime(session, mal_id, config.delay)
        except requests.RequestException as e:
            print(f" ERROR: {e} (Will retry)", flush=True)
            consecutive_failures += 1
            failed_keys.append(file_key(fp))
            if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                print(f"\n{CONSECUTIVE_FAILURE_LIMIT} consecutive failures — stopping.")
                break
            time.sleep(config.delay)
            continue

        if resp.status_code != 200:
            print(f" {describe_error(resp)} (Will retry)", flush=True)
            consecutive_failures += 1
            failed_keys.append(file_key(fp))
            if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                print(f"\n{CONSECUTIVE_FAILURE_LIMIT} consecutive failures — stopping.")
                break
            time.sleep(config.delay)
            continue

        api_data = resp.json().get("data", {})
        if not api_data:
            print(" EMPTY DATA (Will retry)", flush=True)
            consecutive_failures += 1
            failed_keys.append(file_key(fp))
            if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                print(f"\n{CONSECUTIVE_FAILURE_LIMIT} consecutive failures — stopping.")
                break
            time.sleep(config.delay)
            continue

        consecutive_failures = 0
        changes = process_anime_file(fp, api_data, config)
        key = file_key(fp)

        if changes:
            if config.dry_run:
                print(f" WOULD UPDATE ({len(changes)} changes)", flush=True)
                for field_name, old_val, new_val in changes:
                    print(f"  {field_name}: {old_val} -> {new_val}")
            else:
                print(" UPDATE GENERATED", flush=True)
            all_changes.append((key, changes))
        else:
            print(" OK", flush=True)

        if config.mode in ("info", "both"):
            info_synced.add(key)
        if config.mode in ("synopsis", "both"):
            synopsis_synced.add(key)

        time.sleep(config.delay)

    return info_synced, synopsis_synced, all_changes, failed_keys


def run_parallel(
    session: requests.Session,
    pending: list[tuple[Path, str]],
    config: SyncConfig,
) -> tuple[set[str], set[str], list[tuple[str, list[Change]]], list[str]]:
    """Parallel sync mode using ThreadPoolExecutor with shared rate limiter.
    Returns (info_synced, synopsis_synced, all_changes, failed_keys).
    """
    info_synced: set[str] = set()
    synopsis_synced: set[str] = set()
    all_changes: list[tuple[str, list[Change]]] = []
    failed_keys: list[str] = []
    consecutive_failures = 0
    CONSECUTIVE_FAILURE_LIMIT = 3
    total = len(pending)
    rate_limiter = RateLimiter(config.delay / config.parallel)

    with ThreadPoolExecutor(max_workers=config.parallel) as pool:
        futures = {
            pool.submit(process_one_file, session, fp, mal_id, idx, total, config, rate_limiter): idx
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
                consecutive_failures += 1
                failed_keys.append(file_key(pending[idx - 1][0]))
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
                consecutive_failures += 1
                failed_keys.append(key)
                if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                    print(f"\n{CONSECUTIVE_FAILURE_LIMIT} failures in a row — stopping.")
                    for f in futures:
                        f.cancel()
                    break
                continue

            consecutive_failures = 0
            if changes:
                if config.dry_run:
                    print(f" WOULD UPDATE ({len(changes)} changes)", flush=True)
                    for field_name, old_val, new_val in changes:
                        print(f"  {field_name}: {old_val} -> {new_val}")
                else:
                    print(" UPDATE GENERATED", flush=True)
                all_changes.append((key, changes))

            if config.mode in ("info", "both"):
                info_synced.add(key)
            if config.mode in ("synopsis", "both"):
                synopsis_synced.add(key)

    return info_synced, synopsis_synced, all_changes, failed_keys


def main(argv: list[str] | None = None) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    start_time = time.monotonic()

    parser = argparse.ArgumentParser(
        description="Preview or generate manual-review anime metadata updates from Tenrai.",
        epilog=(
            "Tenrai limits: public 120 requests/minute and 4 requests/second; "
            "server-key tier 300/minute and 5/second. 429 Retry-After is honored. "
            "Set TENRAI_SERVER_KEY in the environment for the optional server key. "
            "Rating is personal metadata and is never read from or written to the API."
        ),
    )
    parser.add_argument("--full", action="store_true", help="Recheck all files")
    parser.add_argument("--mode", choices=["info", "synopsis", "both"], default="both",
                        help="What to sync: info (frontmatter), synopsis (summary callout), or both")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing files")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY,
                        help=f"Seconds between API requests (default: {DEFAULT_DELAY})")
    parser.add_argument("--parallel", type=int, default=1,
                        help="Number of concurrent API requests (default: 1, sequential). "
                             "Use 2-4 for faster syncs; each worker paces at delay/N seconds.")
    args = parser.parse_args(argv)

    config = SyncConfig(
        full=args.full,
        mode=args.mode,
        dry_run=args.dry_run,
        delay=args.delay,
        parallel=max(1, args.parallel),
    )

    print(f"Metadata Sync — Tenrai API v1 (Manual Revision Mode) [{config.mode}]")
    print("=" * 65)

    if not ANIME_DIR.exists():
        print(f"[ERROR] Anime folder not found: {ANIME_DIR}")
        return 1

    anime_files = sorted(ANIME_DIR.rglob("*.md"))
    already = set() if config.full else already_synced_for_mode(config.mode)
    pending = discover_pending(anime_files, already, config.mode)

    print(f"Mode      : {'FULL RESCAN' if config.full else 'Incremental'} ({config.mode})")
    print(f"Pending   : {len(pending)} files ({len(already)} already synced)")
    if config.dry_run:
        print("Dry run  : YES (no files will be written)")
    if config.parallel > 1:
        print(f"Parallel  : {config.parallel} workers (effective delay={config.delay / config.parallel:.3f}s/request)")

    if not pending:
        print("Nothing new to sync. Use --full for a full rescan.")
        return 0

    existing_info = load_log(LOG_PATH)
    existing_synopsis = load_log(SYNOPSIS_LOG_PATH)
    # For incremental sync, start with the existing log entries so we don't
    # lose track of previously synced files. The 'already' set only contains
    # files that need re-checking for this mode; the logs contain ALL previously
    # synced files for each aspect.
    info_synced = set(existing_info) if config.mode != "synopsis" else existing_info
    synopsis_synced = set(existing_synopsis) if config.mode != "info" else existing_synopsis

    retry_pending: list[tuple[Path, str]] = []

    try:
        with create_session() as session:
            if config.parallel > 1:
                info_synced, synopsis_synced, all_changes, failed_keys = run_parallel(session, pending, config)
            else:
                info_synced, synopsis_synced, all_changes, failed_keys = run_sequential(session, pending, config)

            # Collect failed files for a second retry pass
            if failed_keys:
                failed_set = set(failed_keys)
                retry_pending = [(fp, mid) for fp, mid in pending if file_key(fp) in failed_set]
    except KeyboardInterrupt:
        print("\nInterrupted! Saving log...")
    finally:
        if not config.dry_run:
            if config.mode in ("info", "both"):
                write_log(LOG_PATH, info_synced)
            if config.mode in ("synopsis", "both"):
                write_log(SYNOPSIS_LOG_PATH, synopsis_synced)

    # Second pass: retry failed files with a longer delay
    if retry_pending:
        retry_config = SyncConfig(
            full=config.full,
            mode=config.mode,
            dry_run=config.dry_run,
            delay=config.delay * 3,  # longer delay for retry
            parallel=1,  # sequential retry to be gentle on the API
        )
        print("\n" + "=" * 65)
        print(f"RETRY PASS: {len(retry_pending)} files failed in first pass.")
        print("=" * 65)

        try:
            with create_session() as session:
                r_info, r_synopsis, r_changes, _ = run_sequential(session, retry_pending, retry_config)
                info_synced.update(r_info)
                synopsis_synced.update(r_synopsis)
                all_changes.extend(r_changes)

                # Update logs after retry pass
                if not config.dry_run:
                    if config.mode in ("info", "both"):
                        write_log(LOG_PATH, info_synced)
                    if config.mode in ("synopsis", "both"):
                        write_log(SYNOPSIS_LOG_PATH, synopsis_synced)
        except KeyboardInterrupt:
            print("\nInterrupted during retry pass!")

    print("=" * 65)
    if all_changes:
        if config.dry_run:
            print(f"Dry run complete. {len(all_changes)} anime would have changes.")
            print("Run without --dry-run to generate actual update files.")
        else:
            report_path = write_changes_report(all_changes)
            print(f"Finished. {len(all_changes)} anime had changes.")
            print(f"Changes report: {report_path}")
            if WRITE_FULL_FILES:
                print(f"Full updated files: {UPDATES_DIR}")
    else:
        print("Finished. No changes found.")

    elapsed = time.monotonic() - start_time
    print(f"Elapsed: {elapsed:.1f}s ({len(pending)} files, {len(all_changes)} changed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
