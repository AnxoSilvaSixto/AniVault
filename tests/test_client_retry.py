"""Offline tests for the Tenrai HTTP retry layer.

Covers retry_wait / describe_error / fetch_anime in
Utilities/Scripts/sync_anime.py and the mirrored helpers plus
fetch_producer in Utilities/Scripts/sync_studios.py. HTTP is faked;
time.sleep is stubbed so backoff never actually waits. No network.
"""

import time
from email.utils import formatdate

import pytest
import sync_anime
import sync_studios


class FakeResponse:
    def __init__(self, status, headers=None, payload=None, broken_json=False):
        self.status_code = status
        self.headers = headers or {}
        self._payload = payload
        self._broken = broken_json

    def json(self):
        if self._broken:
            raise ValueError("no json")
        return self._payload if isinstance(self._payload, dict) else {}


class FakeSession:
    def __init__(self, responses):
        self._queue = list(responses)
        self.calls = 0
        self.urls = []

    def get(self, url, timeout=None):
        self.calls += 1
        self.urls.append(url)
        assert self._queue, "more GETs than queued responses"
        return self._queue.pop(0)


@pytest.fixture
def no_sleep(monkeypatch):
    calls = []
    monkeypatch.setattr(time, "sleep", lambda s: calls.append(s))
    return calls


MODULES = [
    pytest.param(sync_anime, sync_anime.RETRY_BACKOFF_BASE, id="anime"),
    pytest.param(sync_studios, sync_studios.RETRY_BACKOFF_BASE, id="studios"),
]


class TestRetryWait:
    @pytest.mark.parametrize("mod,base", MODULES)
    def test_retry_after_seconds(self, mod, base):
        assert mod.retry_wait(FakeResponse(429, {"Retry-After": "7"}), 0) == 7.0

    @pytest.mark.parametrize("mod,base", MODULES)
    def test_retry_after_http_date(self, mod, base):
        future = formatdate(time.time() + 120, usegmt=True)
        assert mod.retry_wait(
            FakeResponse(429, {"Retry-After": future}), 0
        ) == pytest.approx(120, abs=5)

    @pytest.mark.parametrize("mod,base", MODULES)
    def test_retry_after_past_date_clamped(self, mod, base):
        past = formatdate(time.time() - 60, usegmt=True)
        assert mod.retry_wait(FakeResponse(429, {"Retry-After": past}), 0) == 0.0

    @pytest.mark.parametrize("mod,base", MODULES)
    def test_fallback_backoff_schedule(self, mod, base):
        assert mod.retry_wait(FakeResponse(500, {}), 0) == base * 1
        assert (
            mod.retry_wait(FakeResponse(500, {"Retry-After": "bogus"}), 2) == base * 3
        )


class TestDescribeError:
    @pytest.mark.parametrize("mod,base", MODULES)
    def test_message_variants(self, mod, base):
        assert "message says hi" in mod.describe_error(
            FakeResponse(429, {}, {"message": "message says hi"})
        )
        assert "oops" in mod.describe_error(FakeResponse(500, {}, {"error": "oops"}))
        assert mod.describe_error(FakeResponse(404, {})) == "HTTP 404"
        assert mod.describe_error(FakeResponse(503, {}, broken_json=True)) == "HTTP 503"


class TestBuildHeaders:
    @pytest.mark.parametrize("mod,base", MODULES)
    def test_with_and_without_key(self, mod, base, monkeypatch):
        monkeypatch.setattr(mod, "SERVER_KEY", "secret")
        assert mod.build_headers() == {"X-Server-Key": "secret"}
        monkeypatch.setattr(mod, "SERVER_KEY", None)
        assert mod.build_headers() == {}


class TestFetchAnime:
    def test_success_no_retry(self, no_sleep):
        session = FakeSession([FakeResponse(200, {}, {"data": {}})])
        resp = sync_anime.fetch_anime(session, "482", delay=0.0)
        assert resp.status_code == 200
        assert session.calls == 1
        assert no_sleep == []

    def test_retryable_then_success(self, no_sleep):
        session = FakeSession(
            [
                FakeResponse(429, {"Retry-After": "7"}),
                FakeResponse(200, {}, {"data": {}}),
            ]
        )
        resp = sync_anime.fetch_anime(session, "482", delay=0.0)
        assert resp.status_code == 200
        assert session.calls == 2
        assert no_sleep == [7.0]

    def test_non_retryable_no_retry(self, no_sleep):
        session = FakeSession([FakeResponse(404, {})])
        assert sync_anime.fetch_anime(session, "482", delay=0.0).status_code == 404
        assert session.calls == 1
        assert no_sleep == []

    def test_exhausts_max_retries(self, no_sleep):
        session = FakeSession([FakeResponse(503, {})] * (sync_anime.MAX_RETRIES + 1))
        resp = sync_anime.fetch_anime(session, "482", delay=0.0)
        assert resp.status_code == 503
        assert session.calls == sync_anime.MAX_RETRIES + 1
        base = sync_anime.RETRY_BACKOFF_BASE
        assert no_sleep == [base * 1, base * 2, base * 3]


class TestFetchProducer:
    def test_retryable_then_success(self, no_sleep):
        session = FakeSession(
            [
                FakeResponse(429, {"Retry-After": "4"}),
                FakeResponse(200, {}, {"data": {}}),
            ]
        )
        resp = sync_studios.fetch_producer(session, "12", delay=0.0)
        assert resp.status_code == 200
        assert session.calls == 2
        assert no_sleep == [4.0]

    def test_non_retryable_no_retry(self, no_sleep):
        session = FakeSession([FakeResponse(400, {})])
        assert sync_studios.fetch_producer(session, "12", delay=0.0).status_code == 400
        assert session.calls == 1


class TestRateLimiter:
    @pytest.mark.parametrize("mod,base", MODULES)
    def test_second_acquire_waits(self, mod, base, no_sleep):
        limiter = mod.RateLimiter(delay=30.0)
        limiter.acquire()
        limiter.acquire()
        assert len(no_sleep) == 1
        assert no_sleep[0] == pytest.approx(30.0, abs=1.0)
