"""Offline tests for vault YAML frontmatter helpers.

Covers the frontmatter split/parse/dump helpers in
Utilities/Scripts/sync_anime.py and the dependency-free frontmatter
parser in Utilities/Scripts/validate_vault.py. No network, no writes.
"""

import sync_anime
import validate_vault

SAMPLE_FM = """---
ID: 482
Type: "[[TV]]"
Episodes: 24
Aired: 2024-01-01
Finished: 2024-06-01
Studio:
  - "[[MAPPA]]"
Genre:
  - "[[Action]]"
  - "[[Drama]]"
Themes: []
Demographic: ""
Cover: https://cdn.myanimelist.net/images/anime/1.jpg
MAL: https://myanimelist.net/anime/482
Rating: 8
---
Body text here.
"""


class TestSplitFrontmatter:
    def test_valid_returns_fm_and_body(self):
        fm, body = sync_anime.split_frontmatter(SAMPLE_FM)
        assert "ID: 482" in fm
        assert body.strip() == "Body text here."

    def test_missing_returns_none(self):
        assert sync_anime.split_frontmatter("No frontmatter\n") is None
        assert sync_anime.split_frontmatter("---\nunterminated") is None

    def test_crlf(self):
        text = SAMPLE_FM.replace("\n", "\r\n")
        fm, body = sync_anime.split_frontmatter(text)
        assert "ID: 482" in fm
        assert "Body text" in body


class TestParseYamlFrontmatter:
    def test_scalars_and_lists(self):
        meta = sync_anime.parse_yaml_frontmatter(
            "ID: 482\nStudio:\n  - X\nGenre: []\nEmpty:\n"
        )
        assert meta["ID"] == "482"
        assert meta["Studio"] == ["X"]
        assert meta["Genre"] == []
        assert meta["Empty"] == ""

    def test_wikilink_value_kept_verbatim(self):
        meta = sync_anime.parse_yaml_frontmatter('Type: "[[TV]]"\n')
        assert meta["Type"] == '"[[TV]]"'


class TestInlineLists:
    def test_quoted_inline_list_items_keep_quotes(self):
        meta = sync_anime.parse_yaml_frontmatter(
            'Themes: ["[[School]]", "[[Music]]"]\n'
        )
        assert meta["Themes"] == ['"[[School]]"', '"[[Music]]"']

    def test_unquoted_inline_list(self):
        meta = sync_anime.parse_yaml_frontmatter("Genre: [Action, Drama]\n")
        assert meta["Genre"] == ["Action", "Drama"]

    def test_comma_inside_quoted_item_does_not_split(self):
        meta = sync_anime.parse_yaml_frontmatter('Tags: ["a, b", c]\n')
        assert meta["Tags"] == ['"a, b"', "c"]

    def test_quoted_empty_scalars(self):
        assert sync_anime.parse_yaml_frontmatter('Demographic: ""\n')[
            "Demographic"
        ] == ""
        assert sync_anime.parse_yaml_frontmatter("Demographic: ''\n")[
            "Demographic"
        ] == ""

    def test_unquoted_wikilink_kept_verbatim(self):
        assert sync_anime.parse_yaml_frontmatter("Type: [[TV]]\n")["Type"] == "[[TV]]"

    def test_round_trip(self):
        meta = {"Themes": ['"[[School]]"', '"[[Music]]"'], "Demographic": ""}
        dumped = sync_anime.dump_yaml_frontmatter(meta)
        parsed = sync_anime.parse_yaml_frontmatter(
            sync_anime.split_frontmatter(dumped)[0]
        )
        assert parsed == meta


class TestEnsureListShapes:
    def test_coerces_scalars_and_empty_strings(self):
        meta = {
            "Studio": '"[[MAPPA]]"',
            "Genre": [],
            "Themes": '"[[Music]]"',
            "Demographic": "",
        }
        target = {
            "Studio": ['"[[MAPPA]]"'],
            "Genre": ["[[Action]]"],
            "Themes": [],
            "Demographic": [],
        }
        changes = sync_anime.ensure_list_shapes(meta, target)
        assert meta["Studio"] == ['"[[MAPPA]]"']
        assert meta["Genre"] == []
        assert meta["Themes"] == ['"[[Music]]"']
        assert meta["Demographic"] == []
        assert {change.field for change in changes} == {
            "Studio",
            "Themes",
            "Demographic",
        }


class TestProcessAnimeFileShapes:
    def test_inline_list_and_empty_string_are_not_mangled(self, tmp_path, monkeypatch):
        anime_dir = tmp_path / "Anime"
        anime_dir.mkdir()
        note = anime_dir / "Show.md"
        note.write_text(
            '---\nID: 1\nThemes: ["[[School]]"]\nDemographic: ""\nRating: 0\n'
            "---\n\nBody.\n",
            encoding="utf-8",
        )
        updates_dir = tmp_path / "updates"
        monkeypatch.setattr(sync_anime, "ANIME_DIR", anime_dir)
        monkeypatch.setattr(sync_anime, "UPDATES_DIR", updates_dir)

        changes = sync_anime.process_anime_file(
            note,
            {"mal_id": 1, "themes": [{"name": "School"}]},
            sync_anime.SyncConfig(mode="info"),
        )

        out = (updates_dir / "Show.md").read_text(encoding="utf-8")
        assert 'Themes:\n  - "[[School]]"' in out
        assert "Demographic: []" in out
        assert '- ["[[School]]"]' not in out
        assert any(change.field == "Demographic" for change in changes)


class TestDumpAndOrder:
    def test_canonical_order_extras_last(self):
        meta = {"Rating": "8", "ID": "1", "Custom": "x", "MAL": "u"}
        ordered = sync_anime.order_frontmatter(meta)
        keys = list(ordered.keys())
        assert keys.index("ID") < keys.index("MAL") < keys.index("Rating")
        assert keys[-1] == "Custom"

    def test_dump_shapes(self):
        out = sync_anime.dump_yaml_frontmatter(
            {"ID": "1", "Studio": [], "Genre": ["a"], "X": ""}
        )
        assert "Studio: []" in out
        assert "  - a" in out
        assert out.startswith("---\n") and out.endswith("---\n")

    def test_round_trip(self):
        meta = {"ID": "482", "Type": '"[[TV]]"', "Studio": ['"[[MAPPA]]"'], "Genre": []}
        parsed = sync_anime.parse_yaml_frontmatter(
            sync_anime.split_frontmatter(sync_anime.dump_yaml_frontmatter(meta))[0]
        )
        assert parsed == meta


class TestValidatorFrontmatter:
    def test_parse_full_anime_note(self):
        parsed = validate_vault.Validator.parse_frontmatter(SAMPLE_FM)
        assert parsed is not None
        meta, body = parsed
        assert meta["ID"] == 482
        assert meta["Rating"] == 8
        assert meta["Studio"] == ["[[MAPPA]]"]
        assert meta["Genre"] == ["[[Action]]", "[[Drama]]"]
        assert meta["Themes"] == []
        assert meta["Demographic"] == ""
        assert body.strip() == "Body text here."

    def test_missing_returns_none(self):
        assert validate_vault.Validator.parse_frontmatter("plain body") is None

    def test_comments_and_hash_values(self):
        text = "---\n# a comment\nID: 1\nTitle: C# Guide\nNote: A # trailing comment\n---\n"
        meta, _ = validate_vault.Validator.parse_frontmatter(text)
        assert meta["ID"] == 1
        assert meta["Title"] == "C# Guide"
        assert meta["Note"] == "A"

    def test_quoted_wikilink_not_a_list(self):
        meta, _ = validate_vault.Validator.parse_frontmatter(
            '---\nType: "[[TV]]"\n---\n'
        )
        assert meta["Type"] == "[[TV]]"
