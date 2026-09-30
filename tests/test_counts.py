"""Offline tests for vault filesystem counts and README sync.

Covers counts()/patch() in Utilities/Scripts/update_readme.py and
filesystem_counts()/check_readme_counts() in
Utilities/Scripts/validate_vault.py against a synthetic vault in
tmp_path. No network, never touches the real vault.
"""

import pytest
import update_readme
import validate_vault

EXPECTED = {
    "anime": 3,
    "extra": 6,
    "pending": 1,
    "studio": 1,
    "themes": 1,
    "genre": 1,
    "source": 1,
    "demo": 1,
    "type": 1,
    "bases": 1,
    "graphs": 1,
    "series": 1,
}

README_FIXTURE = """# AniVault
| **Anime Notes** | **3** |
| **Reference Pages** | **6** |
| \u2014 Studios | 1 |
| \u2014 Themes | 1 |
| \u2014 Genre | 1 |
| \u2014 Source | 1 |
| \u2014 Demographic | 1 |
| \u2014 Type | 1 |
| **Watchlist** | **1** |
| **Bases** | 1 |
| **Graphs** | 1 |
you should see 3 entries
filter/sort all 3 entries
\u251c\u2500\u2500 Anime/  # 3 notes \u2014 flat files + 1 series folders
standalone + 1 series subfolders
\u251c\u2500\u2500 Extra/  # 6 reference pages
\u2502   \u251c\u2500\u2500 Studio/  # 1
\u2502   \u251c\u2500\u2500 Themes/  # 1
\u2502   \u251c\u2500\u2500 Genre/  # 1
\u2502   \u251c\u2500\u2500 Source/  # 1
\u2502   \u251c\u2500\u2500 Demographic/  # 1
\u2502   \u251c\u2500\u2500 Type/  # 1
\u251c\u2500\u2500 Pending/  # 1 watchlist
\u251c\u2500\u2500 Bases/  # 1 .base views
\u251c\u2500\u2500 Graphs/  # 1 DataviewJS chart notes
*Last updated: 2020-01-01 \u00b7 Vault: 3 anime \u00b7 6 refs \u00b7 1 pending*
> Snapshot as of `2020-01-01`
"""


@pytest.fixture
def vault_root(tmp_path):
    (tmp_path / "Anime" / "Series").mkdir(parents=True)
    for name in ("one.md", "two.md", "Series/three.md"):
        (tmp_path / "Anime" / name).write_text("# note\n", encoding="utf-8")
    dims = {
        "Studio": "a.md",
        "Themes": "t.md",
        "Genre": "g.md",
        "Source": "s.md",
        "Demographic": "d.md",
        "Type": "y.md",
    }
    for dim, name in dims.items():
        (tmp_path / "Extra" / dim).mkdir(parents=True)
        (tmp_path / "Extra" / dim / name).write_text("# ref\n", encoding="utf-8")
    (tmp_path / "Pending").mkdir()
    (tmp_path / "Pending" / "p.md").write_text("# wip\n", encoding="utf-8")
    (tmp_path / "Utilities" / "Bases").mkdir(parents=True)
    (tmp_path / "Utilities" / "Bases" / "v.base").write_text("base\n", encoding="utf-8")
    (tmp_path / "Utilities" / "Graphs").mkdir(parents=True)
    (tmp_path / "Utilities" / "Graphs" / "c.md").write_text(
        "# chart\n", encoding="utf-8"
    )
    (tmp_path / "README.md").write_text(README_FIXTURE, encoding="utf-8")
    return tmp_path


class TestCountFiles:
    def test_missing_dir_is_zero(self, tmp_path):
        assert update_readme.count_files(tmp_path / "Nope") == 0

    def test_non_recursive_ignores_subdir(self, vault_root):
        assert (
            update_readme.count_files(vault_root / "Anime", "*.md", recursive=False)
            == 2
        )
        assert update_readme.count_files(vault_root / "Anime", "*.md") == 3


class TestCounts:
    def test_counts_match_tree(self, vault_root, monkeypatch):
        monkeypatch.setattr(update_readme, "VAULT_ROOT", vault_root)
        counts = update_readme.counts()
        for key, want in EXPECTED.items():
            if key == "series":
                assert counts["series_folders"] == want
            else:
                assert counts[key] == want, key

    def test_filesystem_counts_agree(self, vault_root):
        got = validate_vault.Validator(vault_root).filesystem_counts()
        assert got == EXPECTED


class TestPatch:
    def _counts(self):
        return {**EXPECTED, "series_folders": EXPECTED["series"]}

    def test_fixes_stale_numbers(self):
        stale = README_FIXTURE.replace(
            "**Anime Notes** | **3**", "**Anime Notes** | **999**"
        )
        new_text, changes = update_readme.patch(stale, self._counts(), "2026-09-30")
        assert changes, "expected patch to report changed sections"
        assert "**Anime Notes** | **999**" not in new_text
        assert "| **Anime Notes** | **3** |" in new_text

    def test_idempotent(self):
        # patch() is convergent: re-patching is byte-stable (a fixed point).
        # Note `changes` lists every pattern that matched, even when the
        # replacement value is identical, so only the text is asserted here.
        once, first_changes = update_readme.patch(
            README_FIXTURE, self._counts(), "2026-09-30"
        )
        twice, _ = update_readme.patch(once, self._counts(), "2026-09-30")
        assert twice == once
        assert first_changes, "date/footer refresh should register changes"

    def test_footer_and_snapshot_date(self):
        new_text, _ = update_readme.patch(README_FIXTURE, self._counts(), "2026-09-30")
        assert (
            "*Last updated: 2026-09-30 \u00b7 Vault: 3 anime \u00b7 6 refs \u00b7 1 pending*"
            in new_text
        )
        assert "> Snapshot as of `2026-09-30`" in new_text
        assert "2020-01-01" not in new_text


class TestValidatorReadmeCounts:
    def test_fresh_readme_has_no_count_errors(self, vault_root):
        validator = validate_vault.Validator(vault_root)
        validator.check_readme_counts()
        assert validator.issues == []

    def test_stale_readme_points_at_updater(self, vault_root):
        readme = vault_root / "README.md"
        readme.write_text(
            README_FIXTURE.replace(
                "**Anime Notes** | **3**", "**Anime Notes** | **999**"
            ),
            encoding="utf-8",
        )
        validator = validate_vault.Validator(vault_root)
        validator.check_readme_counts()
        assert any(
            issue.level == "ERROR"
            and "expected 3" in issue.message
            and "update_readme.py" in issue.message
            for issue in validator.issues
        ), [vars(i) for i in validator.issues]

    def test_round_trip_patch_then_validate(self, vault_root, monkeypatch):
        monkeypatch.setattr(update_readme, "VAULT_ROOT", vault_root)
        readme = vault_root / "README.md"
        stale = README_FIXTURE.replace("# 3 notes", "# 999 notes")
        readme.write_text(stale, encoding="utf-8")
        counts = update_readme.counts()
        patched, _ = update_readme.patch(stale, counts, "2026-09-30")
        readme.write_text(patched, encoding="utf-8")
        validator = validate_vault.Validator(vault_root)
        validator.check_readme_counts()
        assert validator.issues == []
