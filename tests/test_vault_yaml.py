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
