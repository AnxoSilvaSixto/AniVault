# AniVault — Project Guidelines

This file contains the rules, restrictions, and workflows for changes to the main Obsidian vault.

The main vault is located at: `C:\Users\Anxo\Documents\Obsidian\AniVault`

Read this file before making changes. Never assume you can create files, modify Pending/, or change configuration in the main vault without checking these guidelines.

---

## 1. Directory Structure

```
C:\Users\Anxo\Documents\Obsidian\AniVault\
├── Anime/              → 368 anime notes (standalone + 57 series subfolders)
├── Extra/              → 183 reference pages (studios, genres, themes, etc.)
│   ├── Demographic/    → 5 files
│   ├── Genre/          → 21 files
│   ├── Source/         → 10 files
│   ├── Studio/         → 90 files
│   ├── Themes/         → 52 files
│   └── Type/           → 5 files
├── Pending/            → 21 watchlist items (intentionally incomplete)
├── To-do/              → TODO items (ignored in Obsidian search/graph)
├── Utilities/          → Scripts, graphs, bases, templates
│   ├── Bases/          → 7 .base files (Obsidian Bases views)
│   ├── Graphs/         → 4 DataviewJS chart pages
│   ├── Scripts/        → helper scripts (update_readme.py + sync_* + data logs)
│   │   ├── update_readme.py   → auto-maintains README stats
│   │   ├── sync_anime.py      → Tenrai/MAL metadata sync (helper, not vault docs)
│   │   ├── sync_studios.py    → studio metadata sync (helper)
│   │   ├── sync_menu.bat      → interactive menu for sync scripts
│   │   └── data/              → logs + Metadata_Updates/ + Studio_Updates/
│   ├── Templates/      → Template files (media-grid Template.md)
│   └── sortspec.md     → Custom Sort spec for Anime/ (mix folders+files A→Z)
├── Homepage.canvas     → Main dashboard (embeds 4 graphs + bases)
├── README.md           → GitHub landing page (auto-patched by update_readme.py)
└── .obsidian/          → Vault configuration
    ├── AGENTS.md       → This file (hidden from vault, agent-facing)
    ├── app.json        → openBehavior: Homepage.canvas, userIgnoreFilters: [Utilities/, To-do/]
    ├── appearance.json → cssTheme: Baseline, enabledSnippets: [media-grid, obsidian-icons, text-centered]
    └── plugins/ themes/ snippets/
```

**Ignored in Git (volatile, machine-specific):**
- `.obsidian/workspace.json`, `.obsidian/workspace-mobile.json`, `.obsidian/hotkeys.json`
- `.obsidian/plugins/vault-inspector/data.json` (scan cache — only cache ignored, other plugin data.json ARE tracked)
- `__pycache__/`, `.venv/`, `*.log` (except sync logs in `Utilities/Scripts/data/` which are ignored via `.gitignore` pattern `__pycache__/`)
- `.git/opencode` leftover (should be `.opencode/` if used)

See `.gitignore:1` and `.gitattributes:1` (`* text=auto eol=lf`).

## 2. ABSOLUTE RULES — Always Follow

### 2.1 Never Modify Files Without Explicit Permission
- **NEVER** modify, rename, delete, or bulk-process any file without explicit user approval
- Applies to ALL folders: `Anime/`, `Extra/`, `Pending/`, `Utilities/`, `.obsidian/`
- Do NOT run bulk regex replacements, mass renames, or automated formatting
- Every file modification requires explicit user approval

### 2.2 Never Create Files Without Explicit Approval
- **NEVER** create new files in `Anime/` without asking first
- User does NOT want parent summary pages for multi-season series
- Any new file creation must be explicitly approved

### 2.3 Never Modify `Pending/` Files
- **NEVER** modify, add to, or fix any files in `Pending/`
- These are a watchlist/reminder folder, intentionally incomplete
- They will be updated when pushed to `Anime/` after watching

### 2.4 Never Create Studio Pages Without Existing References
- **NEVER** create new studio pages in `Extra/Studio/` unless an anime note directly wikilinks to it
- Anime in `Pending/` are not watched — their studios should NOT create new pages
- Orphan studio pages are worse than missing ones

### 2.5 Always Create Backup Before Changes
- Before making ANY changes, create a full vault backup using `robocopy`
- Backup location: `C:\Users\Anxo\Documents\Obsidian\AniVault_Backup`

### 2.6 Language: English Only
- All vault content must be in English
- Synopses, notes, and free-text fields must be in English
- Do NOT mix Spanish and English in the same file or across the vault

## 3. FRONTMATTER SCHEMA

Actual schema as stored (arrays of wikilinks, cover/MAL as raw URLs, Rating is personal). `null` or missing `Finished` for airing.

```yaml
---
ID: 30654
Type: "[[TV]]"                 # "[[TV]]" | "[[Movie]]" | "[[OVA]]" | "[[ONA]]" | "[[Special]]"
Episodes: 25                   # int or "" if unknown (movies with null -> 1)
Aired: 2016-01-08
Finished: 2016-07-01            # or "" / null
Studio:
  - "[[Lerche]]"               # array, multi-studio supported
Source: "[[Manga]]"            # "[[Manga]]" | "[[Light Novel]]" | "[[Original]]" | ...
Genre:
  - "[[Action]]"
  - "[[Comedy]]"
Themes:
  - "[[School]]"
Demographic:
  - "[[Shounen]]"
Cover: https://cdn.myanimelist.net/images/anime/8/77966l.jpg
MAL: https://myanimelist.net/anime/30654
Rating: 8                      # 1-10, personal — never auto-overwritten, excluded from sync
# Relational (optional, manual)
Prequels:
  - "[[Ansatsu Kyoushitsu]]"
Sequels: []
Alternative Version: []
---
> [!summary] Synopsis
> Actual synopsis text...
```

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `ID` | int | MAL | MyAnimeList ID |
| `Type` | `"[[Type]]"` | MAL | From `Extra/Type/` |
| `Episodes` | int | MAL | `null` if unknown |
| `Aired` / `Finished` | `YYYY-MM-DD` | MAL | |
| `Studio` | `"[[Studio]]"[]` | MAL | Multi-studio |
| `Source` | `"[[Source]]"` | MAL | |
| `Genre` / `Themes` / `Demographic` | `"[[...]]"[]` | MAL | Arrays, may be empty |
| `Cover` / `MAL` | url | MAL | CDN hotlink |
| `Rating` | 1–10 | **You** | Personal, never overwritten by sync |
| `Prequels` / `Sequels` / `Alternative Version` | `"[[Anime]]"[]` | Manual | Rendered as media-grid |

**File example:** `Anime/Ansatsu Kyoushitsu/Ansatsu Kyoushitsu 2nd Season.md` — demonstrates multi-genre, `Prequels`, and callout.

## 4. TECH STACK

| Component | Tool | Notes |
|-----------|------|-------|
| Vault | Obsidian | `openBehavior: file:Homepage.canvas`, `newLinkFormat: shortest`, `userIgnoreFilters: [Utilities/, To-do/]` |
| Metadata source | MyAnimeList via Tenrai API (Jikan-compatible) | Jikan public API discontinued; Tenrai mirror used by sync scripts |
| Helper scripts | Python 3 (`sync_anime.py`, `sync_studios.py`, `update_readme.py`) | `update_readme.py` is vault-facing; sync scripts are helpers — NOT documented in README |
| Queries & charts | Dataview + DataviewJS | Powers `Utilities/Graphs/` |
| Database views | Obsidian Bases | 7 views |
| Sorting | Custom Sort plugin + `Utilities/sortspec.md` | Mixes folders + files A→Z in `Anime/` |
| Theme | Baseline `3.2.12` + 3 CSS snippets | `appearance.json: enabledCssSnippets: [text-centered, obsidian-icons, media-grid]` |
| Backups | Git + Windows Task Scheduler | Weekly on login via `C:\Scripts\AniVault-backup.ps1` |
| Lint | Pre-commit hook `.githooks/pre-commit` | `core.hooksPath=.githooks`, checks secrets + 10 MB limit |

## 5. AUTOMATION & SCRIPTS

### `update_readme.py` (Utilities/Scripts/) — VAULT-FACING, MUST MAINTAIN

- **Purpose:** Keeps `README.md` stats in sync with filesystem. Called by backup script and manually.
- **Counts:** `Anime` (rglob `*.md` 368), `Extra` (183) + per-dimension `Studio 90 / Themes 52 / Genre 21 / Source 10 / Demographic 5 / Type 5`, `Pending 21`, `Bases 7`, `Graphs 4`, series folders `Anime/*/ is_dir()` (57).
- **Patches:** `## 📊 Collection Stats` table, `## 🏗️ Structure` tree comments, Quick Start verify line (`you should see N entries`), footer `*Last updated: YYYY-MM-DD · Vault: N anime · M refs · P pending*` + snapshot `> Snapshot as of`.
- **Usage:**
  ```powershell
  python Utilities/Scripts/update_readme.py          # patch in place
  python Utilities/Scripts/update_readme.py --dry-run # diff preview
  python Utilities/Scripts/update_readme.py --check   # CI: exit 1 if dirty
  ```
- **Idempotent**, preserves line endings (`detect` CRLF vs LF), UTF-8 reconfigure for Windows cp1252.
- **Rule:** Never manually edit stats in `README.md` — run the script. Stats are authoritative from filesystem, not hardcoded.

### `sync_anime.py` (Utilities/Scripts/) — HELPER, NOT VAULT DOCS

- **CRITICAL:** Do NOT document this in `README.md` — user wants sync scripts hidden from vault docs. Keep docs here in AGENTS only.
- Syncs anime metadata from Tenrai API (Jikan-compatible)
- Handles: `ID, Type, Episodes, Aired, Finished, Studio, Source, Genre, Themes, Demographic, Cover, MAL, Synopsis`
- `Rating` excluded (personal)
- Flags: `--full` (full rescan vs incremental via `data/metadata_synced.log` / `synopsis_synced.log`), `--dry-run`, `--mode {info,synopsis,both}` (default `both`). Dry-run does not write update files or sync logs.
- **Manual revision mode:** Never overwrites originals — writes to `Utilities/Scripts/data/Metadata_Updates/` (mirroring structure) + `_changes_report.md` for review

### `sync_studios.py` (Utilities/Scripts/) — HELPER

- Syncs studio/producer fields: `Foundation`/`Established`, `Cover`, `MAL`
- Handles alias collapse (`Foundation` vs `Established`, `Cover` vs `Image`)
- Incremental via `data/studios_synced.log`, `--full` for rescan, `--dry-run` for a non-mutating preview, writes to `data/Studio_Updates/`

### `sync_menu.bat` (Utilities/Scripts/)

- Windows batch menu for sync operations
- Checks `where python` (fallback `py`), `chcp 65001`
- Options: `1 Full sync / 2 Syn new synopsis / 3 Syn new metadata / 4 Studios full / 5 Studios incremental`

### Backup — `C:\Scripts\AniVault-backup.ps1` (external, not in vault)

- Weekly on Windows login via Task Scheduler `AniVault Git Backup` (checks ` $env:APPDATA\AniVault-lastRun.txt` — skips if <7 days)
- Now calls `python Utilities/Scripts/update_readme.py` before `git add -A` (with `python`/`py` fallback, try/catch)
- Then stages, commits, and pushes the current branch after each successful backup run
- `staging` is not automatically synchronized by the external backup script; sync it explicitly when required

### Pre-commit hook — `.githooks/pre-commit` (versioned) + `.git/hooks/pre-commit` (installed)

- Enabled via `git config core.hooksPath .githooks`
- Checks: `API keys, tokens, GitHub PATs` and `>10 MB` files
- Skip for hook itself: `if [[ "$FILE" == ".githooks/pre-commit" ]]` — prevents false positive on hook's own pattern
- Also skip false positives: `README.md` documents hook as `API keys, tokens, GitHub PATs` without equals/prefix literals

## 6. DATAVIEWJS GRAPHS

**Location:** `Utilities/Graphs/`

| File | Chart Type | Query |
|------|-----------|-------|
| `Genres.md` | Doughnut | `dv.pages('"Anime"')` |
| `Themes.md` | Doughnut | `dv.pages('"Anime"')` |
| `Studio.md` | Doughnut | `dv.pages('"Anime"')` |
| `Rating Distribution.md` | Bar + Curve | `dv.pages('"Anime"')` |

**IMPORTANT:** Use `'"Anime"'` for folder query. Do NOT use `'"Anime/"'` (recursive) — it breaks graphs.

Embedded together in `Homepage.canvas` (4 file nodes at x:-720/-120 etc).

## 7. OBSIDIAN BASES

**Location:** `Utilities/Bases/` (7 files, all tracked)

1. `Anime tracker.base` — Main collection tracker (368 entries)
2. `Genre base.base` — Genre dimension
3. `Themes base.base` — Themes dimension
4. `Studio base.base` — Studio dimension
5. `Source base.base` — Source material dimension
6. `Demographic base.base` — Demographic dimension
7. `Type base.base` — Type dimension

Bases are live counts — prefer over hardcoded README numbers.

## 8. VAULT CONFIGURATION

### CSS Snippets (3 enabled, tracked)
- `media-grid.css` — 3-column grid for media posters (`Prequels`/`Sequels`/`Side Stories`, used by `media-grid Template.md`)
- `obsidian-icons.css` — Icon customization
- `text-centered.css` — Text centering
- All in `.obsidian/snippets/`, enabled via `appearance.json: enabledCssSnippets`

### Templates
- `Utilities/Templates/media-grid Template.md` — HTML grid with `.media-grid` / `.media-column` / `.media-poster`
- Requires `media-grid.css` (shows `>[!danger] Required CSS` if missing)

### Community Plugins (6, tracked in `.obsidian/community-plugins.json` + `plugins/*/`)
- `pretty-properties` — Enhanced property display
- `obsidian-charts` — Chart visualizations
- `dataview` — Query engine
- `obsidian-style-settings` — Theme customization UI
- `custom-sort` — Mixed folder/file alphabetical sorting (reads `Utilities/sortspec.md`)
- `vault-inspector` — Structure/broken-link inspection (its `data.json` is IGNORED)

### Obsidian Settings (tracked)
- `app.json: readableLineLength, foldHeading, newLinkFormat: shortest, alwaysUpdateLinks, showInlineTitle, openBehavior: file:Homepage.canvas, userIgnoreFilters: [Utilities/, To-do/]`
- `appearance.json: cssTheme: Baseline, theme: obsidian`
- `community-plugins.json: [pretty-properties, obsidian-charts, dataview, style-settings, custom-sort, vault-inspector]`

### Git Hygiene (tracked vs ignored)

**Tracked:** `app.json`, `appearance.json`, `canvas.json`, `community-plugins.json`, `core-plugins.json`, `graph.json`, `plugins/*/main.js|manifest|styles.css|data.json` (except `vault-inspector/data.json`), `snippets/*.css`, `themes/Baseline/*`, `templates.json`, `types.json`, `.gitignore`, `.gitattributes`, `.githooks/pre-commit`

**Ignored (via `.gitignore:4-8`):** `workspace.json`, `workspace-mobile.json`, `hotkeys.json`, `vault-inspector/data.json` — local layout/cache, restored automatically by Obsidian/plugin.

**`.gitattributes:1`** — `* text=auto eol=lf`, explicit `*.md|*.canvas|*.json|*.base|*.css|*.js|*.py|*.bat|*.ps1 text`, binaries for images/fonts. Fixes `core.autocrlf=true` vs `input` drift + `AGENTS.md` Bin detection.

**`.githooks/pre-commit:1`** — versioned hook, `core.hooksPath=.githooks`. Installed copy at `.git/hooks/pre-commit` (updated on sync).

## 9. GIT OPERATIONS

```powershell
cd "C:\Users\Anxo\Documents\Obsidian\AniVault"
python Utilities/Scripts/update_readme.py # keep README stats fresh before commit
git add -A
git commit -m "description"
git push
git push origin staging  # if on main and need to sync staging
```

**Branch model:** `main` (primary, `origin/HEAD`), `staging` (ff-only mirror of main, also Tracks backup). Never diverge — `git checkout staging && git merge --ff-only main && git push`.

**Auto-backup:** `Task Scheduler → AniVault Git Backup` → `C:\Scripts\AniVault-backup.ps1` (weekly login, checks `AniVault-lastRun.txt`, calls `update_readme.py` then `git add/commit/push`)

**Hook setup:** `git config core.hooksPath .githooks` (already set). Verify `git config --get core.hooksPath` → `.githooks`.

**Cleaning:** Already removed stale `.git/opencode` (40B) and `.git/AUTO_MERGE`. Do NOT recreate.

## 10. README MAINTENANCE

- **Source of truth:** Filesystem counts, not README hardcodes. `README.md:30-52` table, tree `README.md:99-122`, and footer `*Last updated: ...*` are auto-patched.
- **Script:** `Utilities/Scripts/update_readme.py:1` — idempotent, patches table rows `**368**` etc, tree `368 notes — 57 series folders`, `183 reference pages`, per-dimension counts, footer + snapshot date.
- **When to run:** Before every commit that changes `Anime/`, `Extra/`, `Pending/`, `Utilities/Bases/`, `Utilities/Graphs/` or weekly via backup. Also in CI with `--check`.
- **What NOT to do:** Don't manually edit numbers in README — they'll be overwritten. Don't document sync scripts in README — they are helpers (`README.md` should only mention `update_readme.py`).

## 11. WHAT NOT TO DO

| Action | Why | Status |
|--------|-----|--------|
| Create parent summary pages in `Anime/` | User doesn't want them | BLOCKED |
| Modify `Pending/` files | They're reminders, will be fixed later | BLOCKED |
| Create studio pages without anime references | Creates orphan pages | BLOCKED |
| Change DataviewJS folder queries to `'"Anime/"'` | Broke the graphs | BLOCKED |
| Add `requirements.txt` | User doesn't want it | BLOCKED |
| Enable file-recovery plugin | User has backups elsewhere | BLOCKED |
| Create "Watched" index pages | All entries are watched entries | BLOCKED |
| Document sync scripts in README | Sync is helper, not vault docs — keep in AGENTS only | BLOCKED |
| Manually edit README stats | Use `update_readme.py` — manual edits drift | BLOCKED |
| Track `workspace.json` / `vault-inspector/data.json` | Volatile, ignored via `.gitignore` | BLOCKED |
| Use `LICENSE` badge without file | Broken link — vault uses public domain, no license | BLOCKED |

---

*Last updated: 2026-08-31*

