# AniVault — Project Guidelines

Vault: `C:\Users\Anxo\Documents\Obsidian\AniVault`. Read before changing anything. Never bulk-edit, create files, touch `Pending/`, or change config without explicit approval.

## 1. Structure

```
C:\Users\Anxo\Documents\Obsidian\AniVault\
├── Anime/              → 376 anime notes (standalone + 60 series subfolders)
├── Extra/              → 184 reference pages
│   ├── Demographic/    → 5 files
│   ├── Genre/          → 21 files
│   ├── Source/         → 10 files
│   ├── Studio/         → 91 files
│   ├── Themes/         → 52 files
│   └── Type/           → 5 files
├── Pending/            → 19 watchlist items (intentionally incomplete)
├── To-do/              → tasks (ignored in search/graph)
├── Utilities/
│   ├── Bases/          → 7 .base files
│   ├── Graphs/         → 4 DataviewJS charts
│   ├── Templates/      → media-grid Template.md
│   └── sortspec.md     → Custom Sort spec (folders+files A→Z)
├── Homepage.canvas     → dashboard (3 graphs + 2 tracker views)
├── README.md           → landing page (auto-patched by update_readme.py)
└── .obsidian/          → config (AGENTS.md hidden, plugins/themes/snippets)
```

Ignored: `workspace.json`, `workspace-mobile.json`, `hotkeys.json`, `vault-inspector/data.json`, `__pycache__/`, `.venv/`. `.gitattributes` forces `eol=lf`.

Tooling lives outside the vault in `C:\Users\Anxo\Documents\Obsidian\bs\` (`Utilities/Scripts/`, `tests/`, `ruff.toml`, `.env.example`); it is not tracked here. Run scripts from `bs/` or set `ANIVAULT_ROOT`.

## 2. Absolute Rules

- Never modify, rename, delete, or bulk-process any file without explicit approval. No bulk regex, mass renames, or auto-format.
- Never create files in `Anime/` without asking. No parent summary pages for multi-season series.
- Never touch `Pending/` — watchlist, intentionally incomplete, fixed only when moved to `Anime/`.
- Never create `Extra/Studio/` pages unless a watched `Anime/` note wikilinks it. `Pending/` studios don't count; orphans are worse than missing.
- Backup first: full `robocopy` to `AniVault_Backup` before any change.
- English only. No Spanish/English mixing in synopses, notes, or fields.

## 3. Frontmatter Schema

Canonical spec (arrays of wikilinks, `Cover`/`MAL` raw URLs, `Rating` personal, `Finished` null when airing). `Pending/` is exempt. README shows a shorter example.

```yaml
---
ID: 30654
Type: "[[TV]]"
Episodes: 25
Aired: 2016-01-08
Finished: 2016-07-01
Studio:
  - "[[Lerche]]"
Source: "[[Manga]]"
Genre:
  - "[[Action]]"
  - "[[Comedy]]"
Themes:
  - "[[School]]"
Demographic:
  - "[[Shounen]]"
Cover: https://cdn.myanimelist.net/images/anime/8/77966l.jpg
MAL: https://myanimelist.net/anime/30654
Rating: 8
---
```

| Field | Type | Notes |
|-------|------|-------|
| `ID` / `MAL` | int / url | MAL ID + URL must match |
| `Type` / `Source` | `[[..]]` | Single wikilink from `Extra/` |
| `Episodes` | int | Non-negative; may be empty if unknown |
| `Aired` | date | ISO `YYYY-MM-DD` |
| `Finished` | date / null | ISO `YYYY-MM-DD`; `null` while airing |
| `Studio` / `Genre` / `Themes` / `Demographic` | `[[..]][]` | Arrays, may be empty |
| `Cover` | url | Absolute HTTP(S) poster URL |
| `Rating` | 0–10 | Personal; `0` unrated, never overwritten |
| `Prequels` / `Sequels` | `[[Anime]][]` | Manual, media-grid rendered |

Example: `Anime/Ansatsu Kyoushitsu/Ansatsu Kyoushitsu 2nd Season.md` (multi-genre, `Prequels`, synopsis callout).

## 4. Views & Tech

Bases (`Utilities/Bases/`, 7 files): `Anime tracker.base` is the main table (376 entries; `Full list`, `Hall of Fame`, `Top` cards by `Rating`, `Searcher`). Six dimension bases mirror `Extra/`. `Studio base` keeps a global `!Rating.isEmpty()` filter.

Graphs (`Utilities/Graphs/`): `Genres.md`, `Themes.md`, `Studio.md` (doughnuts) + `Rating Distribution.md` (bar+curve). All use `dv.pages('"Anime"')` — never `'"Anime/"'`. First three embedded in `Homepage.canvas`.

Stack: Obsidian (Baseline `3.2.12` + 3 snippets), MAL via Tenrai API, Dataview + Bases, Custom Sort + `sortspec.md`, Git + weekly Task Scheduler backup, `.githooks/pre-commit` (secrets + 10 MB).

## 5. Automation

`update_readme.py` — vault-facing, must maintain. In default mode it counts `Anime` 376, `Extra` 184 (`Studio` 91 / `Themes` 52 / `Genre` 21 / `Source` 10 / `Demographic` 5 / `Type` 5), `Bases` 7, `Graphs` 4, and series folders 60. It does not traverse, read, or count `Pending/` and does not refresh watchlist counts; the Watchlist row, Pending/ tree line, and footer pending segment are preserved verbatim. It patches the non-Pending stats table/tree entries, verify line, footer date/refs, and snapshot. Usage: `python ..\bs\Utilities\Scripts\update_readme.py [--dry-run|--check] [--include-pending]`. `--include-pending` is an explicit opt-in that also counts `Pending/` and refreshes the Watchlist row, Pending/ tree line, and footer pending segment. In default mode, `--check` ignores Pending-only drift because that text is outside the refreshed scope. Never hand-edit README stats.

`sync_anime.py` / `sync_studios.py` — helpers, never in README. Tenrai key via `.env` (`TENRAI_SERVER_KEY`, see `.env.example`); public tier 120/min without key. Writes to `data/Metadata_Updates/` + `_changes_report.md` for review; `Rating` excluded. Flags: `--full`, `--dry-run`, `--mode {info,synopsis,both}`.

`validate_vault.py` (read-only) + `vault_yaml.py` (strict YAML lint): `python ..\bs\Utilities\Scripts\validate_vault.py`. Checks frontmatter, IDs, dates, MAL/ID match, taxonomy/relation links, media-grid targets, duplicate stems, encoding, README counts. `Signal.MD.md` intentionally keeps its suffix.

Backup: `C:\Scripts\AniVault-backup.ps1` weekly on login (`AniVault Git Backup`, skips if <7 days) — runs `update_readme.py`, then `git add/commit/push`. Hook: `git config core.hooksPath .githooks`.

Scheduled/automated runs intentionally use the default mode; do not add `--include-pending` to them.

## 6. Config

Snippets (all enabled): `media-grid.css` (poster grid for relations), `obsidian-icons.css`, `text-centered.css`. Template `media-grid Template.md` requires `media-grid.css`. Plugins (6): `dataview`, `obsidian-charts`, `pretty-properties`, `obsidian-style-settings`, `custom-sort` (reads `sortspec.md`), `vault-inspector` (`data.json` ignored).

Tracked: `app.json` (`Homepage.canvas`, `shortest` links, ignore `Utilities/`+`To-do/`), `appearance.json` (Baseline), `community-plugins.json`, plugin `main.js|manifest|styles.css|data.json` (except inspector cache), `snippets/*.css`, `themes/Baseline/*`, `.githooks/pre-commit`. Ignored: `workspace*.json`, `hotkeys.json`, inspector `data.json`.

## 7. Git Ops

```powershell
cd "C:\Users\Anxo\Documents\Obsidian\AniVault"
python ..\bs\Utilities\Scripts\update_readme.py # fresh stats before commit
git add -A
git commit -m "description"
git push
git push origin staging  # only when staging must mirror main
```

`main` is primary (`origin/HEAD`); `staging` never auto-syncs. Verify hook: `git config --get core.hooksPath` → `.githooks`. Never recreate `.git/opencode` or `AUTO_MERGE`.

## 8. What Not To Do

| Action | Why | Status |
|--------|-----|--------|
| Create parent summary pages in `Anime/` | User doesn't want them | BLOCKED |
| Modify `Pending/` files | Reminders, fixed later | BLOCKED |
| Create studio pages without anime references | Orphans | BLOCKED |
| Change queries to `'"Anime/"'` | Breaks graphs | BLOCKED |
| Add `requirements.txt` | User doesn't want it | BLOCKED |
| Enable file-recovery plugin | Backups exist elsewhere | BLOCKED |
| Create "Watched" index pages | All entries are watched | BLOCKED |
| Document sync scripts in README | Helpers — AGENTS only | BLOCKED |
| Manually edit README stats | Use `update_readme.py` | BLOCKED |
| Track `workspace.json` / `inspector data.json` | Volatile, ignored | BLOCKED |
| Use `LICENSE` badge without file | Public domain, no license | BLOCKED |

Tools: `obsidian-mcp` (19 tools: note CRUD, BM25/semantic/regex search, wikilinks, frontmatter) via `~/.config/opencode/opencode.jsonc`; excludes mirror `userIgnoreFilters` plus generated dirs. Skills (`~/.opencode/skills/obsidian-skills/`): `obsidian-markdown`, `obsidian-cli`, `json-canvas`, `obsidian-bases`, `defuddle` (prefer over WebFetch).

---

*Last updated: 2026-10-27*
