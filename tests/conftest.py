"""Pytest bootstrap for AniVault management-script tests.

Makes Utilities/Scripts importable (sync_anime, sync_studios,
update_readme, validate_vault) regardless of the cwd pytest is
invoked from. Everything here is offline: no network, no vault writes.
"""

import sys
from pathlib import Path

sys.path.insert(
    0, str(Path(__file__).resolve().parent.parent / "Utilities" / "Scripts")
)
