"""Dependency-free .env loader for sync scripts.
Usage: from common.dotenv import load_dotenv
"""

from __future__ import annotations

import os
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent.parent  # Utilities/Scripts
VAULT_ROOT = SCRIPT_DIR.parent.parent  # vault root (== sync_*.py parents[2])
DEFAULT_ENV_PATH = VAULT_ROOT / ".env"


def load_dotenv(path: Path | None = None) -> None:
    """Load .env KEY=VALUE lines without overriding real env."""
    env_path = path or DEFAULT_ENV_PATH
    try:
        text = env_path.read_text(encoding="utf-8")
    except OSError:
        return
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if value[:1] in ('"', "'"):
            quote = value[:1]
            end = value.find(quote, 1)
            value = value[1:end] if end > 0 else value[1:]
        else:
            # Strip trailing " # comment"; '#' without preceding space stays.
            value = re.split(r"\s+#", value, maxsplit=1)[0].strip()
        if key and key not in os.environ:
            os.environ[key] = value
