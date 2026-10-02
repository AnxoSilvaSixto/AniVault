"""Offline tests for vault YAML frontmatter helpers.

Covers the frontmatter split/parse/dump helpers in
Utilities/Scripts/sync_anime.py, the dependency-free frontmatter
parser in Utilities/Scripts/validate_vault.py, and the strict
PyYAML helper in Utilities/Scripts/vault_yaml.py. No network, no writes
(except tmp_path fixtures).
"""

import pytest
import sync_anime
import validate_vault
import vault_yaml
import yaml

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


class TestVaultYamlStrict:
    def test_split_valid_and_body(self):
        fm, body = vault_yaml.split_frontmatter(SAMPLE_FM)
        assert "ID: 482" in fm
        assert body.strip() == "Body text here."

    def test_split_missing_and_crlf(self):
        assert vault_yaml.split_frontmatter("No frontmatter\n") is None
        assert vault_yaml.split_frontmatter("---\nunterminated") is None
        fm, body = vault_yaml.split_frontmatter(SAMPLE_FM.replace("\n", "\r\n"))
        assert "ID: 482" in fm
        assert "Body text" in body

    def test_parse_strict_types_and_unquotes(self):
        meta, body = vault_yaml.parse_frontmatter(SAMPLE_FM)
        assert meta["ID"] == 482
        assert meta["Rating"] == 8
        # Strict YAML unquotes wikilinks (sync_anime keeps them verbatim).
        assert meta["Type"] == "[[TV]]"
        assert meta["Studio"] == ["[[MAPPA]]"]
        assert meta["Themes"] == []
        assert body.strip() == "Body text here."

    def test_parse_missing_returns_none(self):
        assert vault_yaml.parse_frontmatter("plain body") is None

    def test_parse_empty_mapping(self):
        # A comment-only block loads as None -> {} (an empty fence with
        # no lines is treated as missing, same as validate_vault).
        meta, _ = vault_yaml.parse_frontmatter("---\n# empty\n---\nbody\n")
        assert meta == {}

    def test_parse_non_mapping_raises(self):
        with pytest.raises(TypeError):
            vault_yaml.parse_frontmatter("---\n- just\n- a\n- list\n---\n")

    def test_parse_bad_yaml_raises(self):
        with pytest.raises(yaml.YAMLError):
            vault_yaml.parse_frontmatter("---\nID: [unclosed\n---\n")

    def test_dump_round_trip(self):
        meta, _ = vault_yaml.parse_frontmatter(SAMPLE_FM)
        meta2, _ = vault_yaml.parse_frontmatter(
            vault_yaml.dump_frontmatter(meta) + "Body text here.\n"
        )
        assert meta2 == meta

    def test_check_note_ok_and_missing(self, tmp_path):
        ok = tmp_path / "ok.md"
        ok.write_text(SAMPLE_FM, encoding="utf-8")
        assert vault_yaml.check_note(ok) == []
        bad = tmp_path / "bad.md"
        bad.write_text("plain body, no fence\n", encoding="utf-8")
        assert vault_yaml.check_note(bad) != []

    def test_check_tree_collects_errors(self, tmp_path):
        (tmp_path / "good.md").write_text(SAMPLE_FM, encoding="utf-8")
        (tmp_path / "bad.md").write_text("---\nID: [unclosed\n---\n", encoding="utf-8")
        findings = vault_yaml.check_tree(tmp_path)
        assert len(findings) == 1
        assert findings[0][0].name == "bad.md"
