"""Shared helpers for Utilities/Scripts (client, yaml_utils, logs, dotenv).
Usage: from common import load_dotenv, RateLimiter, split_frontmatter
"""

from __future__ import annotations

from pathlib import Path

from common.client import (
    MAX_RETRIES,
    PUBLIC_LIMITS,
    RETRY_BACKOFF_BASE_ANIME,
    RETRY_BACKOFF_BASE_STUDIOS,
    RETRYABLE_CODES,
    SERVER_LIMITS,
    RateLimiter,
    build_headers,
    create_session,
    describe_error,
    fetch_with_retry,
    get_api_tier,
    get_server_key,
    is_auth_failure,
    retry_wait,
    should_retry,
    tier_banner,
)
from common.dotenv import DEFAULT_ENV_PATH, load_dotenv
from common.logs import Change, file_key, load_log, write_changes_report, write_log
from common.yaml_utils import (
    detect_line_ending,
    dump_frontmatter_strict,
    dump_yaml_frontmatter,
    format_value,
    load_file,
    load_note_strict,
    normalize_date_string,
    normalize_value,
    normalize_value_strict,
    order_frontmatter,
    parse_date_value,
    parse_frontmatter_strict,
    parse_yaml_frontmatter,
    split_frontmatter,
    split_frontmatter_strict,
    write_text_preserving_line_ending,
)

SCRIPT_DIR = Path(__file__).resolve().parent.parent  # Utilities/Scripts
VAULT_ROOT = SCRIPT_DIR.parent.parent  # vault root (== sync_*.py parents[2])
DATA_DIR = SCRIPT_DIR / "data"

__all__ = [
    "DATA_DIR",
    "DEFAULT_ENV_PATH",
    "MAX_RETRIES",
    "PUBLIC_LIMITS",
    "RETRYABLE_CODES",
    "RETRY_BACKOFF_BASE_ANIME",
    "RETRY_BACKOFF_BASE_STUDIOS",
    "SCRIPT_DIR",
    "SERVER_LIMITS",
    "VAULT_ROOT",
    "Change",
    "RateLimiter",
    "build_headers",
    "create_session",
    "describe_error",
    "detect_line_ending",
    "dump_frontmatter_strict",
    "dump_yaml_frontmatter",
    "fetch_with_retry",
    "file_key",
    "format_value",
    "get_api_tier",
    "get_server_key",
    "is_auth_failure",
    "load_dotenv",
    "load_file",
    "load_log",
    "load_note_strict",
    "normalize_date_string",
    "normalize_value",
    "normalize_value_strict",
    "order_frontmatter",
    "parse_date_value",
    "parse_frontmatter_strict",
    "parse_yaml_frontmatter",
    "retry_wait",
    "should_retry",
    "split_frontmatter",
    "split_frontmatter_strict",
    "tier_banner",
    "write_changes_report",
    "write_log",
    "write_text_preserving_line_ending",
]
