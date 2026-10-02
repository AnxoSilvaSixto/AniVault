"""Shared Tenrai HTTP layer (tier/auth/retry/rate-limit) for sync scripts.
Public 120/min, 4/s; server-key 300/min, 5/s. Usage: from common import client as _client
"""

from __future__ import annotations

import logging
import os
import threading
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import TYPE_CHECKING

import requests

if TYPE_CHECKING:
    from collections.abc import Callable

PUBLIC_LIMITS = "public tier: 120 requests/minute, 4/second"
SERVER_LIMITS = "server-key tier: 300/minute, 5/second"

MAX_RETRIES = 3
RETRYABLE_CODES = frozenset({403, 429, 500, 502, 503, 504})

# Backoff bases per script (anime=5, studios=4).
RETRY_BACKOFF_BASE_ANIME = 5
RETRY_BACKOFF_BASE_STUDIOS = 4

logger = logging.getLogger("common.client")


def get_server_key() -> str | None:
    """Read the live TENRAI_SERVER_KEY from the environment."""
    return os.environ.get("TENRAI_SERVER_KEY") or None


def get_api_tier(server_key: str | None = None) -> str:
    """Return 'server-key' when a key is given, else 'public'."""
    return "server-key" if server_key else "public"


def tier_banner(server_key: str | None = None) -> str:
    """One-line tier description, identical to the sync scripts' version."""
    limits = SERVER_LIMITS if server_key else PUBLIC_LIMITS
    key_state = "set" if server_key else "NOT SET (using public tier)"
    return f"Tenrai API [{get_api_tier(server_key)}] — TENRAI_SERVER_KEY={key_state}; {limits}."


def is_auth_failure(resp: requests.Response, server_key: str | None = None) -> bool:
    """401 is auth; keyless 403 without Retry-After is auth (never retried).
    403 with Retry-After is rate-limit, still retryable."""
    if resp.status_code == 401:
        return True
    if resp.status_code == 403 and not server_key:
        return not (resp.headers.get("Retry-After") or "").strip()
    return False


def should_retry(resp: requests.Response, server_key: str | None = None) -> bool:
    """True when the response is retryable (and not an auth failure)."""
    if is_auth_failure(resp, server_key):
        return False
    return resp.status_code in RETRYABLE_CODES


def build_headers(server_key: str | None = None) -> dict[str, str]:
    """Auth headers for the Tenrai API."""
    return {"X-Server-Key": server_key} if server_key else {}


def create_session(server_key: str | None = None) -> requests.Session:
    """A requests session pre-loaded with the Tenrai auth header."""
    session = requests.Session()
    session.headers.update(build_headers(server_key))
    return session


def retry_wait(
    resp: requests.Response, attempt: int, backoff_base: float = RETRY_BACKOFF_BASE_ANIME
) -> float:
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
    return backoff_base * (attempt + 1)


def describe_error(resp: requests.Response) -> str:
    """Short human-readable HTTP error, preferring the API message body."""
    try:
        body = resp.json()
        msg = body.get("message") or body.get("error")
        return f"HTTP {resp.status_code} — {msg}" if msg else f"HTTP {resp.status_code}"
    except Exception:  # noqa: BLE001 - error formatting must never raise; mirrors sync_*.py
        return f"HTTP {resp.status_code}"


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


def fetch_with_retry(
    session: requests.Session,
    url: str,
    *,
    max_retries: int = MAX_RETRIES,
    backoff_base: float = RETRY_BACKOFF_BASE_ANIME,
    server_key: str | None = None,
    rate_limiter: RateLimiter | None = None,
    timeout: float = 15,
    on_retry: Callable[[requests.Response, float], None] | None = None,
) -> requests.Response:
    """GET url with backoff on retryable codes; auth failures never retried.
    Rate limiter is acquired before every attempt when given. See should_retry()."""
    if rate_limiter:
        rate_limiter.acquire()
    resp = session.get(url, timeout=timeout)
    retries = 0
    while should_retry(resp, server_key) and retries < max_retries:
        wait = retry_wait(resp, retries, backoff_base)
        if on_retry is not None:
            on_retry(resp, wait)
        else:
            logger.info(f"  ({describe_error(resp)}, waiting {wait:.0f}s)")
        time.sleep(wait)
        if rate_limiter:
            rate_limiter.acquire()
        resp = session.get(url, timeout=timeout)
        retries += 1
    return resp
