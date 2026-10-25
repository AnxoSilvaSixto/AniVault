"""Offline tests for sync history, split-mode merging, and exit codes.

Covers merge_history() and the info/synopsis split-mode merge in
Utilities/Scripts/sync_anime.py, plus main()'s failure exit status in
both sync scripts. No network, no writes outside tmp_path.
"""

import contextlib
import time

import pytest
import requests

import sync_anime
import sync_studios


class TestMergeHistory:
    def test_completed_both_adds_checked_files(self):
        merged = sync_anime.merge_history(
            {"old"}, {"a"}, {"b"}, {"old", "a", "b", "deleted"}, "both", True
        )
        assert merged == {"old", "a", "b"}

    def test_completed_info_invalidates_info_files(self):
        merged = sync_anime.merge_history(
            {"old", "a"}, {"a"}, set(), {"old", "a"}, "info", True
        )
        assert merged == {"old"}

    def test_completed_synopsis_invalidates_synopsis_files(self):
        merged = sync_anime.merge_history(
            {"old", "b"}, set(), {"b"}, {"old", "b"}, "synopsis", True
        )
        assert merged == {"old"}

    def test_interrupted_run_preserves_existing_history(self):
        merged = sync_anime.merge_history(
            {"old", "deleted"}, {"a"}, {"b"}, {"old", "a", "b"}, "both", False
        )
        assert merged == {"old"}


SOURCE_BODY = "\n> [!summary] Synopsis\n> Old synopsis.\n\nKeep this body.\n"

INFO_API = {
    "mal_id": 1,
    "type": "TV",
    "episodes": 12,
    "aired": {"from": "2020-01-01", "to": "2020-03-31"},
}
SYNOPSIS_API = {"synopsis": "Fresh synopsis."}


@pytest.mark.parametrize("order", [("info", "synopsis"), ("synopsis", "info")])
def test_split_mode_merge_preserves_other_half(order, tmp_path, monkeypatch):
    anime_dir = tmp_path / "Anime"
    anime_dir.mkdir()
    note = anime_dir / "Show.md"
    note.write_text(
        "---\nID: 999\n"
        'Type: "[[Movie]]"\n'
        "Episodes: 1\n"
        "Rating: 0\n"
        "---\n"
        f"{SOURCE_BODY}",
        encoding="utf-8",
    )
    updates_dir = tmp_path / "updates"
    monkeypatch.setattr(sync_anime, "ANIME_DIR", anime_dir)
    monkeypatch.setattr(sync_anime, "UPDATES_DIR", updates_dir)

    for mode in order:
        api_data = INFO_API if mode == "info" else SYNOPSIS_API
        sync_anime.process_anime_file(
            note, api_data, sync_anime.SyncConfig(mode=mode)
        )

    final = (updates_dir / "Show.md").read_text(encoding="utf-8")
    assert "ID: 1" in final
    assert "Episodes: 12" in final
    assert "> Fresh synopsis." in final
    assert "ID: 999" not in final
    assert "Old synopsis." not in final


class FakeResponse:
    def __init__(self, payload):
        self.status_code = 200
        self._payload = payload

    def json(self):
        return self._payload


def _prepare_vault(module, tmp_path, monkeypatch):
    if module is sync_anime:
        target = tmp_path / "Anime"
        monkeypatch.setattr(module, "ANIME_DIR", target)
        monkeypatch.setattr(module, "DATA_DIR", tmp_path / "data")
        monkeypatch.setattr(module, "UPDATES_DIR", tmp_path / "data" / "updates")
        monkeypatch.setattr(
            module, "ANIME_LOG_PATH", tmp_path / "data" / "anime_synced.log"
        )
        monkeypatch.setattr(module, "LEGACY_LOG_PATHS", ())
        mal = "https://myanimelist.net/anime/1"
    else:
        target = tmp_path / "Extra" / "Studio"
        monkeypatch.setattr(module, "STUDIO_DIR", target)
        monkeypatch.setattr(module, "DATA_DIR", tmp_path / "data")
        monkeypatch.setattr(module, "UPDATES_DIR", tmp_path / "data" / "updates")
        monkeypatch.setattr(
            module, "LOG_PATH", tmp_path / "data" / "studios_synced.log"
        )
        mal = "https://myanimelist.net/anime/producer/1"

    target.mkdir(parents=True)
    (target / "Show.md").write_text(
        f"---\nID: 1\nMAL: {mal}\nRating: 0\n---\n\nBody.\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(
        module, "create_session", lambda: contextlib.nullcontext(object())
    )
    monkeypatch.setattr(time, "sleep", lambda seconds: None)
    return target


FAILURE_CASES = [
    pytest.param(sync_anime, "fetch_anime", id="anime"),
    pytest.param(sync_studios, "fetch_producer", id="studios"),
]

SUCCESS_CASES = [
    pytest.param(
        sync_anime,
        "fetch_anime",
        {"data": {"mal_id": 1, "type": "TV", "episodes": 12}},
        id="anime",
    ),
    pytest.param(
        sync_studios,
        "fetch_producer",
        {"data": {"mal_id": 1, "established": "1990-01-01"}},
        id="studios",
    ),
]


@pytest.mark.parametrize("module, fetch_name", FAILURE_CASES)
def test_unresolved_failures_return_nonzero(module, fetch_name, tmp_path, monkeypatch):
    _prepare_vault(module, tmp_path, monkeypatch)

    def fail(*args, **kwargs):
        raise requests.RequestException("boom")

    monkeypatch.setattr(module, fetch_name, fail)
    assert module.main(["--dry-run"]) == 1


@pytest.mark.parametrize("module, fetch_name, payload", SUCCESS_CASES)
def test_successful_run_returns_zero(module, fetch_name, payload, tmp_path, monkeypatch):
    _prepare_vault(module, tmp_path, monkeypatch)
    monkeypatch.setattr(module, fetch_name, lambda *args, **kwargs: FakeResponse(payload))
    assert module.main(["--dry-run"]) == 0
