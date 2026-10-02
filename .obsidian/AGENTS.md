# AniVault — Project Guidelines

Vault: `C:\Users\Anxo\Documents\Obsidian\AniVault`. Read before changing anything. Never bulk-edit, create files, touch `Pending/`, or change config without explicit approval.

## 1. Structure

```
C:\Users\Anxo\Documents\Obsidian\AniVault\
├── Anime/              → 371 anime notes (standalone + 57 series subfolders)
├── Extra/              → 185 reference pages
│   ├── Demographic/    → 5 files
│   ├── Genre/          → 21 files
│   ├── Source/         → 10 files
│   ├── Studio/         → 92 files
│   ├── Themes/         → 52 files
│   └── Type/           → 5 files
├── Pending/            → 19 watchlist items (intentionally incomplete)
├── To-do/              → tasks (ignored in search/graph)
├── Utilities/
│   ├── Bases/          → 7 .base files
│   ├── Graphs/         → 4 DataviewJS charts
│   ├── Scripts/        → update_readme.py, validate_vault.py, sync helpers + data/
│   ├── Templates/      → media-grid Template.md
│   └── sortspec.md     → Custom Sort spec (folders+files A→Z)
├── Homepage.canvas     → dashboard (3 graphs + 2 tracker views)
├── README.md           → landing page (auto-patched by update_readme.py)
└── .obsidian/          → config (AGENTS.md hidden, plugins/themes/snippets)
```

Ignored: `workspace.json`, `workspace-mobile.json`, `hotkeys.json`, `vault-inspector/data.json`, `__pycache__/`, `.venv/`. `.gitattributes` forces `eol=lf`.

## 2. Absolute Rules

- Never modify, rename, delete, or bulk-process any file without explicit approval. No bulk regex, mass renames, or auto-format.
- Never create files in `Anime/` without asking. No parent summary pages for multi-season series.
- Never touch `Pending/` — watchlist, intentionally incomplete, fixed only when moved to `Anime/`.
- Never create `Extra/Studio/` pages unless a watched `Anime/` note wikilinks it. `Pending/` studios don't count; orphans are worse than missing.
- Backup first: full `robocopy` to `AniVault_Backup` before any change.
- English only. No Spanish/English mixing in synopses, notes, or fields.

## 3. Frontmatter Schema

Canonical spec (arrays of wikilinks, `Cover`/`MAL` raw URLs, `Rating` personal, `Finished` null when airing). `Pending/` is exempt. README shows the same minimal version.

```yaml
---
ID: 30654
Type: "[[TV]]"
Studio:
  - "[[Lerche]]"
Source: "[[Manga]]"
Genre:
  - "[[Action]]"
Rating: 8
---
```

| Field | Type | Notes |
|-------|------|-------|
| `ID` / `MAL` | int / url | MAL ID + URL must match |
| `Type` / `Source` | `[[..]]` | From `Extra/` |
| `Studio` / `Genre` / `Themes` | `[[..]][]` | Arrays, may be empty |
| `Rating` | 0–10 | Personal; `0` unrated, never overwritten |
| `Prequels` / `Sequels` | `[[Anime]][]` | Manual, media-grid rendered |

Example: `Anime/Ansatsu Kyoushitsu/Ansatsu Kyoushitsu 2nd Season.md` (multi-genre, `Prequels`, synopsis callout).

## 4. Views & Tech

Bases (`Utilities/Bases/`, 7 files): `Anime tracker.base` is the main table (371 entries; `Full list`, `Hall of Fame`, `Top` cards by `Rating`, `Searcher`). Six dimension bases mirror `Extra/`. `Studio base` keeps a global `!Rating.isEmpty()` filter.

Graphs (`Utilities/Graphs/`): `Genres.md`, `Themes.md`, `Studio.md` (doughnuts) + `Rating Distribution.md` (bar+curve). All use `dv.pages('"Anime"')` — never `'"Anime/"'`. First three embedded in `Homepage.canvas`.

Stack: Obsidian (Baseline `3.2.12` + 3 snippets), MAL via Tenrai API, Dataview + Bases, Custom Sort + `sortspec.md`, Git + weekly Task Scheduler backup, `.githooks/pre-commit` (secrets + 10 MB).

## 5. Automation

`update_readme.py` — vault-facing, must maintain. Counts `Anime` 371, `Extra` 185 (`Studio` 92 / `Themes` 52 / `Genre` 21 / `Source` 10 / `Demographic` 5 / `Type` 5), `Pending` 19, `Bases` 7, `Graphs` 4, series folders 57. Patches stats table, tree, verify line, footer + snapshot. Usage: `python Utilities/Scripts/update_readme.py [--dry-run|--check]`. Never hand-edit README stats.

`sync_anime.py` / `sync_studios.py` — helpers, never in README. Tenrai key via `.env` (`TENRAI_SERVER_KEY`, see `.env.example`); public tier 120/min without key. Writes to `data/Metadata_Updates/` + `_changes_report.md` for review; `Rating` excluded. Flags: `--full`, `--dry-run`, `--mode {info,synopsis,both}`.

`validate_vault.py` (read-only) + `vault_yaml.py` (strict YAML lint): `python Utilities/Scripts/validate_vault.py`. Checks frontmatter, IDs, dates, MAL/ID match, taxonomy/relation links, media-grid targets, duplicate stems, encoding, README counts. `Signal.MD.md` intentionally keeps its suffix.

Backup: `C:\Scripts\AniVault-backup.ps1` weekly on login (`AniVault Git Backup`, skips if <7 days) — runs `update_readme.py`, then `git add/commit/push`. Hook: `git config core.hooksPath .githooks`.

## 6. Config

Snippets (all enabled): `media-grid.css` (poster grid for relations), `obsidian-icons.css`, `text-centered.css`. Template `media-grid Template.md` requires `media-grid.css`. Plugins (6): `dataview`, `obsidian-charts`, `pretty-properties`, `obsidian-style-settings`, `custom-sort` (reads `sortspec.md`), `vault-inspector` (`data.json` ignored).

Tracked: `app.json` (`Homepage.canvas`, `shortest` links, ignore `Utilities/`+`To-do/`), `appearance.json` (Baseline), `community-plugins.json`, plugin `main.js|manifest|styles.css|data.json` (except inspector cache), `snippets/*.css`, `themes/Baseline/*`, `.githooks/pre-commit`. Ignored: `workspace*.json`, `hotkeys.json`, inspector `data.json`.

## 7. Git Ops

```powershell
cd "C:\Users\Anxo\Documents\Obsidian\AniVault"
python Utilities/Scripts/update_readme.py # fresh stats before commit
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

*Last updated: 2026-10-01*
