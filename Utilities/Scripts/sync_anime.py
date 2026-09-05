#!/usr/bin/env python3
"""
sync_metadata.py â€” Anime Metadata Sync (Manual Revision Edition)
---------------------------------------------
Fetches current metadata for each anime from the Tenrai API (a Jikan-schema
mirror; switched over from Jikan directly after its public API was announced
as being discontinued). Instead of overwriting original files, it outputs
complete, updated Markdown files into a 'Metadata_Updates' folder for manual
revision.

Note: Rating is intentionally excluded from the sync â€” that field holds your
own personal score, not the source's community score.
"""

import sys
import re
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import NamedTuple

try:
    import requests
except ImportError:
    sys.exit("[ERROR] 'requests' not installed. Run: pip install requests")

class Change(NamedTuple):
    """One changed field: what it's called, what it was, what it's becoming.
    Behaves exactly like a plain (str, str, str) tuple for unpacking â€” this is
    purely a documentation/readability upgrade, not a behavior change."""
    field: str
    old: str
    new: str

# --- Paths & Configuration ---
SCRIPT_DIR  = Path(__file__).resolve().parent
VAULT_ROOT  = SCRIPT_DIR.parent.parent
ANIME_DIR   = VAULT_ROOT / "Anime"
DATA_DIR    = SCRIPT_DIR / "data"
UPDATES_DIR = DATA_DIR / "Metadata_Updates"

ANIME_API_URL = "https://api.tenrai.org/v1/anime/{mal_id}"
# Optional: paste a Patreon "X-Server-Key" here later for 300 RPM/5 RPS instead of 120 RPM/4 RPS
SERVER_KEY = None
REQUEST_DELAY = 1.0  # Tenrai's public tier documents 120/min & 4/sec â€” this stays well under both on purpose
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 5  # seconds; fallback wait = RETRY_BACKOFF_BASE * attempt number, used only if no Retry-After header
RETRYABLE_CODES = {403, 429, 500, 502, 503, 504}  # 403 is Tenrai's anti-abuse trigger â€” docs say it's always temporary
WRITE_FULL_FILES = True  # False = only write the _changes_report.md summary, skip full per-anime files

MAL_ID_RE = re.compile(r"myanimelist\.net/anime/(\d+)")

def build_headers() -> dict:
    return {"X-Server-Key": SERVER_KEY} if SERVER_KEY else {}

def describe_error(resp) -> str:
    """Pull Tenrai's structured error envelope ({status, type, message, error, path}) for a
    clearer log line than a bare status code. Falls back gracefully if the body isn't JSON."""
    try:
        body = resp.json()
        msg = body.get("message") or body.get("error")
        return f"HTTP {resp.status_code} â€” {msg}" if msg else f"HTTP {resp.status_code}"
    except Exception:
        return f"HTTP {resp.status_code}"

def retry_wait(resp, attempt: int) -> float:
    """Prefer the server's own Retry-After header (Tenrai sends this on 429s); it can be
    either a plain number of seconds or an HTTP-date (RFC 2822) â€” handle both. Fall back
    to the fixed backoff schedule only if the header is absent or genuinely unparseable."""
    retry_after = (resp.headers.get("Retry-After") or "").strip()
    if retry_after:
        try:
            return max(0.0, float(retry_after))
        except ValueError:
            pass
        try:
            from email.utils import parsedate_to_datetime
            from datetime import datetime, timezone
            target = parsedate_to_datetime(retry_after)
            if target.tzinfo is None:
                target = target.replace(tzinfo=timezone.utc)
            return max(0.0, (target - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError):
            pass
    return RETRY_BACKOFF_BASE * (attempt + 1)

def fetch_anime(mal_id: str):
    """GET the anime detail endpoint, retrying with backoff on RETRYABLE_CODES.
    Prints its own progress for retries, since this is a CLI tool where that feedback
    matters â€” returns the final requests.Response either way (caller checks status)."""
    headers = build_headers()
    resp = requests.get(ANIME_API_URL.format(mal_id=mal_id), headers=headers, timeout=10)
    retries = 0
    while resp.status_code in RETRYABLE_CODES and retries < MAX_RETRIES:
        wait = retry_wait(resp, retries)
        print(f"({describe_error(resp)}, waiting {wait:.0f}s)", end=" ", flush=True)
        time.sleep(wait)
        resp = requests.get(ANIME_API_URL.format(mal_id=mal_id), headers=headers, timeout=10)
        retries += 1
    return resp

def load_file(filepath: Path) -> str:
    try:
        # utf-8-sig transparently strips a BOM if a Windows editor added one.
        return filepath.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        # Falls back to latin-1 just to be ABLE to read an odd legacy file â€” but writing
        # always uses plain utf-8 regardless (see write_text_preserving_line_ending),
        # since API-sourced text (non-Latin titles, smart quotes) can't be represented
        # in latin-1 and would crash on write otherwise. utf-8 is a superset here.
        return filepath.read_text(encoding="latin-1")

def detect_line_ending(filepath: Path) -> str:
    """Text-mode reads silently normalize CRLF/CR/LF all down to '\\n' (Python's universal
    newlines), so by the time load_file() returns, the original convention is already lost.
    Sniff it from the raw bytes instead, before any translation happens."""
    raw = filepath.read_bytes()
    return "\r\n" if b"\r\n" in raw else "\n"

def write_text_preserving_line_ending(filepath: Path, content: str, line_ending: str):
    """Write with an explicit, guaranteed line ending, always as UTF-8. newline=''
    disables Python's own write-time translation (which otherwise follows the OS
    default â€” \\r\\n on Windows, \\n on Linux/Mac â€” and would double up any \\r\\n
    we've already inserted ourselves). Content is normalized to bare '\\n' first so
    this is safe to call no matter what mix of line endings the input contains."""
    normalized = content.replace("\r\n", "\n").replace("\r", "\n")
    final = normalized.replace("\n", line_ending) if line_ending != "\n" else normalized
    filepath.write_text(final, encoding="utf-8", newline="")

FRONTMATTER_RE = re.compile(r'\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*\r?\n?', re.DOTALL)

def split_frontmatter(content: str) -> tuple[str, str] | None:
    """Split into (frontmatter_text, body). Delimiters must be '---' alone on their own
    line â€” the actual Markdown-frontmatter convention â€” found via regex anchored to the
    start of the file, rather than a raw substring search. A frontmatter VALUE that
    happens to contain the literal text '---' (a stylistic dash, say) can no longer be
    mistaken for the closing delimiter, which content.split('---', 2) was vulnerable to.
    Returns None if the file doesn't open with a frontmatter block."""
    m = FRONTMATTER_RE.match(content)
    if not m:
        return None
    return m.group('fm'), content[m.end():]

def extract_mal_id(content: str) -> str | None:
    """Search only the frontmatter block for a MAL URL, not the whole file â€” a mention
    of a different anime elsewhere (a 'prequel to ...' note, a related-anime link) must
    not be mistaken for this note's own ID."""
    split = split_frontmatter(content)
    if split is None:
        return None
    frontmatter_text, _ = split
    m = MAL_ID_RE.search(frontmatter_text)
    return m.group(1) if m else None

def file_key(fp: Path) -> str:
    """Unique identifier for sync-log tracking. Uses the path relative to ANIME_DIR,
    not just the filename â€” two different anime that happen to share a filename in
    different subfolders (a TV series and a movie both called the same thing, say)
    would otherwise collide in the log and silently suppress or overwrite each other."""
    return str(fp.relative_to(ANIME_DIR).with_suffix(""))

def parse_yaml_frontmatter(yaml_str: str) -> dict:
    metadata = {}
    current_key = None
    for line in yaml_str.splitlines():
        line = line.strip()
        if not line: continue
        
        if line.startswith("-") and current_key:
            val = line[1:].strip()
            if isinstance(metadata[current_key], list):
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
                metadata[key] = ""  # genuinely blank scalar â€” stays blank, not silently
                current_key = key   # promoted to []. If '- item' lines follow, the list
                                     # branch above converts it to a list on the first item.
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
            if v == "" or v is None:
                lines.append(f"{k}: ")
            else:
                lines.append(f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n"  # guarantee a trailing newline â€” see process_anime_file

def normalize_value(val):
    if isinstance(val, list):
        return sorted([str(x).replace('"', '').replace("'", "").replace("[", "").replace("]", "").strip() for x in val])
    else:
        s = str(val or "").replace('"', '').replace("'", "").replace("[", "").replace("]", "").strip()
        return [s] if s else []

def format_value(val) -> str:
    """Render a frontmatter value readably for the changes report."""
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
    """Fold every 'Special' variant into one canonical value. Confirmed against Tenrai's
    documented type enum (tv, movie, ova, special, ona, music, cm, pv, tv_special) â€”
    'special' and 'tv_special' are the only two, so a case-insensitive substring check
    is safe and needs no further variants added."""
    if raw_type and "special" in raw_type.lower():
        return "Special"
    return raw_type

SYNOPSIS_CALLOUT_RE = re.compile(r'^>\s*\[!summary\]\s*Synopsis\s*$', re.IGNORECASE)
CALLOUT_START_RE = re.compile(r'^>\s*\[!')  # matches the start of ANY Obsidian callout
MAL_ATTRIBUTION_RE = re.compile(r'\n{1,2}\[Written by.*?\]\s*$', re.IGNORECASE)

def clean_synopsis_text(raw: str) -> str:
    """Strip MAL's '[Written by X]' attribution suffix, which the existing notes don't
    include (confirmed against the uploaded Cowboy Bebop note â€” its synopsis ends at
    'revenge for his old wounds.' with no attribution line)."""
    return MAL_ATTRIBUTION_RE.sub('', (raw or '')).strip()

def normalize_synopsis_text(text: str) -> str:
    """Collapse a synopsis to the exact form extract_synopsis_text() will recover
    after it's written to a file and read back. Without this, any incidental
    leading/trailing whitespace on a line (e.g. a trailing space before a \n\n
    paragraph break, which the API's text sometimes has) survives the write via
    replace_synopsis_block() but gets silently stripped by extract_synopsis_text()
    on the next read - so the file can never stably match the API text and gets
    re-flagged as changed on every single run, forever. Normalizing new_synopsis
    up front makes the write/read cycle idempotent."""
    paragraphs = [p for p in text.split('\n\n') if p.strip()]
    lines = []
    for pi, para in enumerate(paragraphs):
        for pline in para.splitlines():
            lines.append(pline.strip())
        if pi < len(paragraphs) - 1:
            lines.append('')
    return '\n'.join(lines).strip()

def extract_synopsis_text(body: str) -> str | None:
    """Pull the plain text out of the '> [!summary] Synopsis' callout, for comparison
    against a freshly-fetched synopsis. Returns None if no such callout exists."""
    lines = body.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    start = None
    for i, line in enumerate(lines):
        if SYNOPSIS_CALLOUT_RE.match(line.strip()):
            start = i + 1
            break
    if start is None:
        return None
    text_lines = []
    for line in lines[start:]:
        stripped = line.lstrip()
        if not stripped.startswith('>') or CALLOUT_START_RE.match(stripped):
            break  # end of this callout â€” either non-quote content or a NEW callout starting
        text_lines.append(stripped[1:].strip())
    return '\n'.join(text_lines).strip()

def replace_synopsis_block(body: str, new_synopsis: str) -> str:
    """Replace ONLY the content of the '> [!summary] Synopsis' callout with new_synopsis.
    Everything else in the body â€” the media-grid div, personal notes, anything below â€”
    is preserved untouched. If no callout exists yet, inserts one at the very top.
    Works in normalized '\\n' space; the caller handles final line-ending conversion."""
    normalized = body.replace('\r\n', '\n').replace('\r', '\n')
    lines = normalized.split('\n')

    block = ['> [!summary] Synopsis']
    paragraphs = [p for p in new_synopsis.split('\n\n') if p.strip()]
    for pi, para in enumerate(paragraphs):
        for pline in para.splitlines():
            block.append(f'> {pline}' if pline.strip() else '>')
        if pi < len(paragraphs) - 1:
            block.append('>')

    start = None
    for i, line in enumerate(lines):
        if SYNOPSIS_CALLOUT_RE.match(line.strip()):
            start = i
            break

    if start is None:
        # No existing callout: insert at the top. The body typically starts with one
        # blank line right after the frontmatter's closing '---' â€” preserve that.
        leading_blank = [''] if lines and lines[0].strip() == '' else []
        rest = lines[len(leading_blank):]
        new_lines = leading_blank + block + [''] + rest
    else:
        end = start + 1
        while end < len(lines):
            stripped = lines[end].lstrip()
            if not stripped.startswith('>') or CALLOUT_START_RE.match(stripped):
                break  # a new callout (or non-quote content) starts here â€” stop before it
            end += 1
        new_lines = lines[:start] + block + lines[end:]

    return '\n'.join(new_lines)

def wikilink(name) -> str:
    """Build a YAML-safe, wikilink-safe '"[[Name]]"' string from a raw API value.
    Escapes backslashes and double quotes so an API name containing a literal " (e.g.
    a studio like Studio "Weird" Pierrot) can't break out of the YAML double-quoted
    scalar, and neutralizes stray [[ / ]] so a name can't prematurely close/reopen
    the wikilink itself."""
    safe = str(name).replace('\\', '\\\\').replace('"', '\\"').replace('[[', '[').replace(']]', ']')
    return f"\"[[{safe}]]\""

def compute_frontmatter_changes(current_meta: dict, api_data: dict) -> tuple[dict, list[Change]]:
    """Pure computation, no file I/O: given the current frontmatter and a fresh API
    payload, return (target_meta, changes)."""
    target_meta = {}
    target_meta["ID"] = api_data.get('mal_id', '')

    anime_type = normalize_type(api_data.get('type'))
    target_meta["Type"] = wikilink(anime_type) if anime_type else ""

    ep_count = api_data.get('episodes')
    is_movie = api_data.get('type', '').lower() == 'movie'
    target_meta["Episodes"] = 1 if is_movie and ep_count is None else (ep_count or "")

    aired = api_data.get('aired') or {}
    aired_date = parse_date_value(aired.get('from'))
    target_meta["Aired"] = aired_date

    finished_date = parse_date_value(aired.get('to'))
    # All series eventually get a "to" date, so when the API hasn't reported one
    # yet (ongoing series, single-episode entries, etc.) fill it with the start
    # date. This only ever fills a genuinely blank finished_date; a real "to"
    # date from the API always wins.
    if aired_date and not finished_date:
        finished_date = aired_date
    target_meta["Finished"] = finished_date

    target_meta["Studio"] = [wikilink(s['name']) for s in (api_data.get('studios') or [])]
    target_meta["Source"] = wikilink(api_data.get('source')) if api_data.get('source') else ""
    target_meta["Genre"] = [wikilink(g['name']) for g in (api_data.get('genres') or [])]
    target_meta["Themes"] = [wikilink(t['name']) for t in (api_data.get('themes') or [])]
    target_meta["Demographic"] = [wikilink(d['name']) for d in (api_data.get('demographics') or [])]
    target_meta["Cover"] = api_data.get('images', {}).get('jpg', {}).get('large_image_url', '')
    # Bare canonical URL (ID only, no title slug) built straight from the numeric mal_id â€”
    # a slug rename on the source's end would otherwise show up as a false "MAL changed"
    # diff every run even though nothing meaningful actually changed.
    target_meta["MAL"] = (
        f"https://myanimelist.net/anime/{api_data.get('mal_id')}"
        if api_data.get('mal_id') else api_data.get('url', '')
    )
    # Rating is intentionally NOT synced here â€” it's your personal score, not the
    # API's community score, so it's never written or diffed against.

    managed_keys = ["ID", "Type", "Episodes", "Aired", "Finished", "Studio", "Source", "Genre", "Themes", "Demographic", "Cover", "MAL"]
    changes = []
    for key in managed_keys:
        new_val = target_meta.get(key)
        if not new_val:
            # An empty API value (e.g. no "aired.from") must never count as a change â€”
            # it would erase the file's existing value on merge.
            continue
        old_val = current_meta.get(key)
        if normalize_value(old_val) != normalize_value(new_val):
            changes.append(Change(key, format_value(old_val), format_value(new_val)))

    return target_meta, changes

def compute_synopsis_changes(body: str, api_data: dict) -> tuple[str, list[Change]]:
    """Pure computation, no file I/O. Synopsis currently comes from the same Tenrai
    response already fetched for the frontmatter fields â€” no second API call. If you'd
    rather source it from elsewhere, this is the one function to swap."""
    new_synopsis = clean_synopsis_text(api_data.get('synopsis', ''))
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

def process_anime_file(filepath: Path, api_data: dict, mode: str, dry_run: bool = False) -> list[Change]:
    """Reads the file once, computes whichever aspects `mode` calls for ('info',
    'synopsis', or 'both'), and writes once if anything changed. Line ending of the
    original file is preserved exactly, regardless of what OS this runs on."""
    content = load_file(filepath)
    split = split_frontmatter(content)
    if split is None:
        return []

    raw_frontmatter, body = split
    current_meta = parse_yaml_frontmatter(raw_frontmatter)

    changes = []
    # Default to the ORIGINAL frontmatter text, untouched â€” not a value reconstructed
    # from the parsed dict. dump_yaml_frontmatter always renders an empty list as
    # "key: []", for example, even if the source file had a bare "key:" â€” cosmetically
    # different but semantically identical. Regenerating it unconditionally would mean
    # synopsis-only mode silently reformats frontmatter it has no business touching.
    # raw_frontmatter already ends in its own newline (shared with the closing '---'
    # delimiter's preceding line) but does NOT include a leading one â€” that's consumed
    # separately by the regex â€” so it must be added back explicitly here.
    new_yaml = f"---\n{raw_frontmatter}---\n"
    new_body = body

    if mode in ("info", "both"):
        target_meta, fm_changes = compute_frontmatter_changes(current_meta, api_data)
        changes.extend(fm_changes)
        if fm_changes:
            # ID goes first for quick manual API lookups. Seeding merged_meta with it
            # before merging the rest keeps it first â€” dict.update() only changes
            # values for keys that already exist, it never moves them.
            merged_meta = {"ID": target_meta["ID"]}
            merged_meta.update(current_meta)
            for key, value in target_meta.items():
                if not value:
                    # Empty API value â€” never let it wipe an existing frontmatter value
                    continue
                merged_meta[key] = value  # Retains your custom keys, updates managed ones
            new_yaml = dump_yaml_frontmatter(merged_meta)

    if mode in ("synopsis", "both"):
        new_body, syn_changes = compute_synopsis_changes(body, api_data)
        changes.extend(syn_changes)

    if changes and WRITE_FULL_FILES and not dry_run:
        new_content = f"{new_yaml}{new_body}"
        # Mirror the subfolder structure under UPDATES_DIR instead of flattening to
        # just the filename â€” two different anime that happen to share a filename in
        # different subfolders would otherwise silently overwrite each other's output.
        out_path = UPDATES_DIR / filepath.relative_to(ANIME_DIR)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        line_ending = detect_line_ending(filepath)
        write_text_preserving_line_ending(out_path, new_content, line_ending)

    return changes

INFO_LOG_PATH = DATA_DIR / "metadata_synced.log"
SYNOPSIS_LOG_PATH = DATA_DIR / "synopsis_synced.log"

def load_log(path: Path) -> set[str]:
    if not path.exists(): return set()
    return {l.strip() for l in path.read_text("utf-8").splitlines() if l.strip()}

def write_log(path: Path, titles: set[str]):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(sorted(titles)) + "\n", encoding="utf-8")

def already_synced_for_mode(mode: str) -> set[str]:
    """A file only counts as 'already synced' for the aspects the given mode actually
    checks. Running --mode synopsis doesn't mark a file done for info, and vice versa;
    'both' only considers a file fully done once it's synced for both aspects."""
    info_done = load_log(INFO_LOG_PATH)
    synopsis_done = load_log(SYNOPSIS_LOG_PATH)
    if mode == "info": return info_done
    if mode == "synopsis": return synopsis_done
    return info_done & synopsis_done

def write_changes_report(all_changes: list[tuple[str, list[Change]]]):
    lines = [f"# Metadata Changes â€” {datetime.now().strftime('%Y-%m-%d %H:%M')}", ""]
    lines.append(f"**{len(all_changes)} anime with changes**")
    lines.append("")
    for name, changes in all_changes:
        lines.append(f"## {name}")
        for key, old, new in changes:
            lines.append(f"- **{key}**: {old} â†’ {new}")
        lines.append("")

    UPDATES_DIR.mkdir(parents=True, exist_ok=True)
    report_path = UPDATES_DIR / "_changes_report.md"
    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path

def main():
    # Some Windows consoles default to a non-UTF-8 codepage, which raises
    # UnicodeEncodeError the moment we print an em-dash, arrow, or non-Latin title.
    # Force UTF-8 with graceful replacement instead of crashing mid-run.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass  # stdout isn't reconfigurable (e.g. piped/redirected in some setups) â€” non-fatal

    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Recheck all files")
    parser.add_argument("--mode", choices=["info", "synopsis", "both"], default="both",
                          help="What to sync: info (frontmatter fields), synopsis (the summary callout), or both")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing files")
    args = parser.parse_args()

    print(f"Metadata Sync — Tenrai API v1 (Manual Revision Mode) [{args.mode}]")
    print("=" * 65)

    if not ANIME_DIR.exists():
        sys.exit(f"[ERROR] Anime folder not found: {ANIME_DIR}\n"
                  f"Check that the vault structure matches what this script expects "
                  f"(script is assumed to live two folders below the vault root).")

    anime_files = sorted(ANIME_DIR.rglob("*.md"))
    already = set() if args.full else already_synced_for_mode(args.mode)
    pending = []

    try:
        for f in anime_files:
            if file_key(f) not in already:
                content = load_file(f)
                mal_id = extract_mal_id(content)
                if mal_id: pending.append((f, mal_id))
    except KeyboardInterrupt:
        sys.exit("\nInterrupted while scanning files â€” nothing was changed.")

    print(f"Mode      : {'FULL RESCAN' if args.full else 'Incremental'} ({args.mode})")
    print(f"Pending   : {len(pending)} files ({len(already)} already synced)")
    
    if not pending:
        print("Nothing new to sync. Use --full for a full rescan.")
        sys.exit(0)

    info_synced = set(already) if args.mode == "info" else load_log(INFO_LOG_PATH)
    synopsis_synced = set(already) if args.mode == "synopsis" else load_log(SYNOPSIS_LOG_PATH)
    updated_count = 0
    all_changes = []
    consecutive_failures = 0
    CONSECUTIVE_FAILURE_LIMIT = 3  # a handful of failures in a row means a sustained
    # block, not a one-off bad ID â€” better to stop and let it clear than keep poking it

    for i, (fp, mal_id) in enumerate(pending, 1):
        print(f"[{i:>3}/{len(pending)}] {fp.stem[:50]:<50}", end=" ", flush=True)
        interrupted = False

        try:
            resp = fetch_anime(mal_id)

            if resp.status_code != 200:
                print(f"{describe_error(resp)} (Will retry next run)")
                consecutive_failures += 1
                if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                    print(f"\n{CONSECUTIVE_FAILURE_LIMIT} failures in a row, even after retries within "
                          f"each â€” that's a sustained issue, not a one-off. Stopping here rather than "
                          f"keep hammering it; nothing already done is lost, just run again later.")
                    interrupted = True
            else:
                consecutive_failures = 0
                api_data = resp.json().get("data", {})
                if not api_data:
                    print(f"EMPTY DATA (Will retry next run)")
                    consecutive_failures += 1
                    if consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT:
                        print(f"\n{CONSECUTIVE_FAILURE_LIMIT} failures in a row, even after retries within "
                              f"each â€” that's a sustained issue, not a one-off. Stopping here rather than "
                              f"keep hammering it; nothing already done is lost, just run again later.")
                        interrupted = True
                    if interrupted:
                        break
                    time.sleep(REQUEST_DELAY)
                    continue
                changes = process_anime_file(fp, api_data, args.mode, args.dry_run)
                key = file_key(fp)

                if changes:
                    if args.dry_run:
                        print(f"WOULD UPDATE ({len(changes)} changes)")
                        for key, old, new in changes:
                            print(f"  {key}: {old} -> {new}")
                    else:
                        print("UPDATE GENERATED")
                    updated_count += 1
                    all_changes.append((key, changes))
                else:
                    print("OK")

                if args.mode in ("info", "both"): info_synced.add(key)
                if args.mode in ("synopsis", "both"): synopsis_synced.add(key)

        except KeyboardInterrupt:
            print("\nInterrupted! Saving log...")
            interrupted = True
        except Exception as e:
            print(f"ERROR: {e}")

        if interrupted:
            break
        time.sleep(REQUEST_DELAY)  # Always pace â€” even after a failure â€” so one error can't cascade

    # A dry run must not advance incremental-sync state.
    if not args.dry_run:
        if args.mode in ("info", "both"): write_log(INFO_LOG_PATH, info_synced)
        if args.mode in ("synopsis", "both"): write_log(SYNOPSIS_LOG_PATH, synopsis_synced)
    print("=" * 65)
    if all_changes:
        if args.dry_run:
            print(f"Dry run complete. {updated_count} anime would have changes.")
            print("Run without --dry-run to generate actual update files.")
        else:
            report_path = write_changes_report(all_changes)
            print(f"Finished. {updated_count} anime had changes.")
            print(f"Changes report: {report_path}")
            if WRITE_FULL_FILES:
                print(f"Full updated files: {UPDATES_DIR}")
    else:
        print("Finished. No changes found.")

if __name__ == "__main__":
    main()



