"""Shared frontmatter/YAML helpers (dependency-free + strict PyYAML) for sync scripts.
Usage: from common import yaml_utils as _yaml
"""

from __future__ import annotations

import importlib.util
import re
from collections.abc import Mapping, Sequence
from pathlib import Path
from types import ModuleType

import yaml

FRONTMATTER_RE = re.compile(r"\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*\r?\n?", re.DOTALL)

_VAULT_YAML_PATH = Path(__file__).resolve().parent.parent / "vault_yaml.py"
_vault_yaml_cache: ModuleType | None = None
_vault_yaml_failed = False


def _vault_yaml() -> ModuleType | None:
    """Load sibling vault_yaml.py by path."""
    global _vault_yaml_cache, _vault_yaml_failed
    if _vault_yaml_cache is not None:
        return _vault_yaml_cache
    if _vault_yaml_failed:
        return None
    try:
        spec = importlib.util.spec_from_file_location(
            "_anivault_vault_yaml", _VAULT_YAML_PATH
        )
        if spec is None or spec.loader is None:
            _vault_yaml_failed = True
            return None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _vault_yaml_cache = module
        return module
    except OSError:
        _vault_yaml_failed = True
        return None


def split_frontmatter(content: str) -> tuple[str, str] | None:
    """Split note text into (frontmatter_yaml, body)."""
    m = FRONTMATTER_RE.match(content)
    if not m:
        return None
    return m.group("fm"), content[m.end() :]


def parse_yaml_frontmatter(yaml_str: str) -> dict[str, object]:
    """Minimal frontmatter parse (lists + scalars only)."""
    metadata: dict[str, object] = {}
    current_key: str | None = None
    for raw_line in yaml_str.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("-") and current_key:
            val = line[1:].strip()
            if isinstance(metadata.get(current_key), list):
                lst = metadata[current_key]
                assert isinstance(lst, list)
                lst.append(val)
            else:
                metadata[current_key] = [val]
        elif ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()
            if val == "[]":
                metadata[key] = []
            elif not val:
                metadata[key] = ""
            else:
                metadata[key] = val
            current_key = key
    return metadata


def order_frontmatter(meta: Mapping[str, object], first_keys: Sequence[str]) -> dict[str, object]:
    """Return meta with first_keys first, extras in original order."""
    ordered: dict[str, object] = {k: meta[k] for k in first_keys if k in meta}
    for k, v in meta.items():
        if k not in ordered:
            ordered[k] = v
    return ordered


def dump_yaml_frontmatter(
    meta: Mapping[str, object], order: Sequence[str] | None = None
) -> str:
    """Emit frontmatter block, canonical-first when order is given."""
    items: Mapping[str, object] = order_frontmatter(meta, order) if order else meta
    lines = ["---"]
    for k, v in items.items():
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


def load_file(path: Path) -> str:
    """Read text, falling back to latin-1 on bad UTF-8."""
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1")


def detect_line_ending(path: Path) -> str:
    """Return dominant line ending (CRLF vs LF)."""
    raw = path.read_bytes()
    return "\r\n" if b"\r\n" in raw else "\n"


def write_text_preserving_line_ending(path: Path, content: str, line_ending: str) -> None:
    """Write text using the original line ending."""
    normalized = content.replace("\r\n", "\n").replace("\r", "\n")
    final = normalized.replace("\n", line_ending) if line_ending != "\n" else normalized
    path.write_text(final, encoding="utf-8", newline="")


def normalize_date_string(value: str) -> str:
    """Fold YYYY to YYYY-01-01; truncate datetimes to YYYY-MM-DD."""
    value = value.strip()
    if re.fullmatch(r"\d{4}", value):
        return f"{value}-01-01"
    return value[:10]


def parse_date_value(value: object) -> str:
    """Extract YYYY-MM-DD from Jikan date shapes."""
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


def normalize_value(val: object) -> list[str]:
    """Comparison key: strip whitespace only."""
    if isinstance(val, list):
        return sorted(str(x).strip() for x in val)
    return [str(val).strip()] if val not in (None, "") else []


def normalize_value_strict(val: object) -> list[str]:
    """Comparison key: also strip quotes/brackets."""
    if isinstance(val, list):
        return sorted(
            str(x).replace('"', "").replace("'", "").replace("[", "").replace("]", "").strip()
            for x in val
        )
    s = (
        str(val or "")
        .replace('"', "")
        .replace("'", "")
        .replace("[", "")
        .replace("]", "")
        .strip()
    )
    return [s] if s else []


def format_value(val: object) -> str:
    """Readable value for reports ('(none)' when empty)."""
    if isinstance(val, list):
        return ", ".join(str(x) for x in val) if val else "(none)"
    return str(val) if val not in (None, "") else "(none)"


def split_frontmatter_strict(text: str) -> tuple[str, str] | None:
    """BOM-tolerant split; delegates to vault_yaml when available."""
    mod = _vault_yaml()
    if mod is not None:
        func = getattr(mod, "split_frontmatter", None)
        if callable(func):
            result = func(text)
            assert result is None or isinstance(result, tuple)
            return result
    if text.startswith("\ufeff"):
        text = text.lstrip("\ufeff")
    match = re.match(
        r"\A---[ \t]*\r?\n(?P<fm>.*?\r?\n)---[ \t]*(?:\r?\n|\Z)",
        text,
        re.DOTALL,
    )
    if not match:
        return None
    return match.group("fm"), text[match.end() :]


def parse_frontmatter_strict(text: str) -> tuple[dict[str, object], str] | None:
    """Strict-parse note text; None when no fence."""
    mod = _vault_yaml()
    if mod is not None:
        func = getattr(mod, "parse_frontmatter", None)
        if callable(func):
            result = func(text)
            assert result is None or isinstance(result, tuple)
            return result
    split = split_frontmatter_strict(text)
    if split is None:
        return None
    fm_text, body = split
    data = yaml.safe_load(fm_text)
    if data is None:
        return {}, body
    if not isinstance(data, dict):
        raise TypeError(f"frontmatter must be a mapping, got {type(data).__name__}")
    return data, body


def dump_frontmatter_strict(meta: Mapping[str, object]) -> str:
    """Strict emit (LF, --- fences) via PyYAML."""
    mod = _vault_yaml()
    if mod is not None:
        func = getattr(mod, "dump_frontmatter", None)
        if callable(func):
            result = func(dict(meta))
            assert isinstance(result, str)
            return result
    dumped = yaml.safe_dump(
        dict(meta), sort_keys=False, allow_unicode=True, default_flow_style=False
    )
    return f"---\n{dumped}---\n"


def load_note_strict(path: Path) -> tuple[dict[str, object], str]:
    """Read note and strict-parse frontmatter."""
    mod = _vault_yaml()
    if mod is not None:
        func = getattr(mod, "load_note", None)
        if callable(func):
            result = func(path)
            assert isinstance(result, tuple)
            return result
    try:
        text = path.read_bytes().decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError(f"not valid UTF-8 ({exc})") from exc
    parsed = parse_frontmatter_strict(text)
    if parsed is None:
        raise ValueError("missing or malformed frontmatter fence")
    return parsed
