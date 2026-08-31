# AniVault

> Anime collection tracker & reference database powered by Obsidian

[![GitHub](https://img.shields.io/badge/GitHub-AnxoSilvaSixto/AniVault-181717?style=flat&logo=github)](https://github.com/AnxoSilvaSixto/AniVault)
[![Obsidian](https://img.shields.io/badge/Built%20with-Obsidian-48AA42?style=flat&logo=obsidian&logoColor=white)](https://obsidian.md)
[![Baseline](https://img.shields.io/badge/Theme-Baseline-6C5CE7?style=flat)](https://github.com/aaaaalexis/baseline)

> **Personal vault** — Feel free to fork, use, modify, and adapt for your own tracking. No license restrictions — public domain equivalent, do whatever you want.

## 📑 Contents

- [Overview](#-overview)
- [Collection Stats](#-collection-stats)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Structure](#️-structure)
- [Frontmatter Schema](#-frontmatter-schema)
- [Obsidian Bases](#-obsidian-bases)
- [DataviewJS Graphs](#-dataviewjs-graphs)
- [Tech Stack](#️-tech-stack)
- [Community Plugins](#-community-plugins)
- [Theme & Snippets](#-theme--snippets)
- [Sorting](#-sorting)
- [Automation & Scripts](#-automation--scripts)
- [Tips & Workflow](#-tips--workflow)
- [Documentation](#-documentation)
- [License](#-license)

## 🌸 Overview

AniVault is a local-first Obsidian vault for tracking watched anime. Every entry is a Markdown note with structured frontmatter (MAL-sourced), linked to reference pages for studios, genres, themes, demographics, sources, and types. Query it with Dataview/Bases, visualize with Charts, and keep metadata fresh via Python sync scripts against the [Tenrai API](https://tenrai.org/) (Jikan-compatible).

**Why Obsidian?** Plain Markdown, offline, fully queryable, and canvas-driven dashboards — no proprietary DB or cloud lock-in.

## 📊 Collection Stats

> Snapshot as of `2026-08-31`. Live counts: open `Utilities/Bases/Anime tracker.base` or run `vault-inspector`.

| Category | Count | Notes |
|----------|-------|-------|
| **Anime Notes** | **369** | standalone + 59 series subfolders in `Anime/` |
| **Reference Pages** | **183** | `Extra/` total |
| — Studios | 90 | `Extra/Studio/` |
| — Themes | 52 | `Extra/Themes/` |
| — Genres | 21 | `Extra/Genre/` |
| — Sources | 10 | `Extra/Source/` |
| — Demographics | 5 | `Extra/Demographic/` |
| — Types | 5 | `Extra/Type/` |
| **Watchlist** | **21** | `Pending/` (intentionally incomplete) |
| **Bases** | 7 | `Utilities/Bases/` |
| **Graphs** | 4 | `Utilities/Graphs/` |

## ✅ Prerequisites

| Requirement | Version / Notes |
|-------------|-----------------|
| **Obsidian** | ≥ `1.13.4` (vault uses `Baseline 3.2.12` + Bases) |
| **Git** | For versioning / backup; hook uses `core.hooksPath=.githooks` |
| **Python** | ≥ `3.10` if you use sync scripts (`sync_anime.py`, `sync_studios.py`) |
| **Theme** | [Baseline](https://github.com/aaaaalexis/baseline) (included in `.obsidian/themes/`) |
| **Plugins** | 6 community plugins auto-prompted on open (see below) — keep them enabled |

> Vault ignores `Utilities/` and `To-do/` in Obsidian search/graph via `userIgnoreFilters` (`app.json`).

## 🚀 Quick Start

**1. Clone**
```powershell
git clone https://github.com/AnxoSilvaSixto/AniVault.git
```

**2. Open in Obsidian**
`Obsidian → Open folder as vault → select AniVault/`. Trust the vault when prompted. Homepage opens as `Homepage.canvas` (`openBehavior`).

**3. Enable plugins**
`Settings → Community plugins → Enable` (6 required):
`dataview` · `obsidian-charts` · `pretty-properties` · `obsidian-style-settings` · `custom-sort` · `vault-inspector`

**4. Enable snippets**
`Settings → Appearance → CSS snippets → Enable` all three: `media-grid`, `obsidian-icons`, `text-centered`.

**5. (Optional) Sync metadata**
```powershell
# Interactive menu
.\Utilities\Scripts\sync_menu.bat

# Or directly
python Utilities/Scripts/sync_anime.py --mode both --dry-run
python Utilities/Scripts/sync_anime.py --mode both
python Utilities/Scripts/sync_studios.py
```

**6. Verify**
Open `Utilities/Bases/Anime tracker.base` and `Homepage.canvas` — you should see 369 entries, 4 embedded charts, and no broken links (`vault-inspector`).

## 🏗️ Structure

```
AniVault/
├── Anime/                 # 369 notes — flat files + 59 series folders (e.g. "Ansatsu Kyoushitsu/")
├── Extra/                 # 183 reference pages
│   ├── Demographic/       # 5 (Seinen, Shounen, Shoujo, Josei, Kids)
│   ├── Genre/             # 21 (Action, Romance, …)
│   ├── Source/            # 10 (Manga, Light Novel, Original, …)
│   ├── Studio/            # 90 (MAPPA, Ufotable, …)
│   ├── Themes/            # 52 (Isekai, Mecha, …)
│   └── Type/              # 5  (TV, Movie, OVA, ONA, Special)
├── Pending/               # 21 watchlist stubs — intentionally incomplete
├── To-do/                 # Task tracking (ignored in search/graph)
├── Utilities/
│   ├── Bases/             # 7 .base views (tracker + dimension tables)
│   ├── Graphs/            # 4 DataviewJS chart notes
│   ├── Scripts/           # sync_anime.py, sync_studios.py, sync_menu.bat, logs in data/
│   │   └── data/          # Metadata_Updates/, *.log
│   ├── Templates/         # media-grid Template.md (requires media-grid.css)
│   └── sortspec.md        # Custom Sort spec for Anime/ (mix folders+files A→Z)
├── Homepage.canvas        # Dashboard — embeds 4 graphs + bases
├── README.md              # This file
└── .obsidian/             # Vault config (plugins, theme, snippets, hidden AGENTS.md)
    ├── AGENTS.md          # Project guidelines (hidden from vault)
    └── plugins/ themes/ snippets/
```

> `To-do/` and `Utilities/` are hidden from Obsidian search/graph but tracked in Git. `workspace.json` / `workspace-mobile.json` and `vault-inspector/data.json` are **ignored** (machine-specific cache).

## 📝 Frontmatter Schema

Every `Anime/*.md` and `Pending/*.md` uses this frontmatter. Lists are YAML arrays of wikilinks. `Rating` is **your** score (sync never overwrites it).

```yaml
---
ID: 30654
Type: "[[TV]]"                 # [[TV]] | [[Movie]] | [[OVA]] | [[ONA]] | [[Special]]
Episodes: 25
Aired: 2016-01-08
Finished: 2016-07-01            # or null for airing
Studio:
  - "[[Lerche]]"
Source: "[[Manga]]"             # [[Manga]] | [[Light Novel]] | [[Original]] | …
Genre:
  - "[[Action]]"
  - "[[Comedy]]"
Themes:
  - "[[School]]"
Demographic:
  - "[[Shounen]]"
Cover: https://cdn.myanimelist.net/images/anime/8/77966l.jpg
MAL: https://myanimelist.net/anime/30654
Rating: 8                      # 1–10, personal — excluded from sync
# Relational (optional, added when applicable)
Prequels:
  - "[[Ansatsu Kyoushitsu]]"
Sequels: []
Alternative Version: []
---
```

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `ID` | int | Tenrai/MAL | MyAnimeList ID |
| `Type` | `[[Type]]` | Tenrai | From `Extra/Type/` |
| `Episodes` | int | Tenrai | `null` if unknown |
| `Aired` / `Finished` | date | Tenrai | `YYYY-MM-DD` |
| `Studio` | `[[Studio]][]` | Tenrai | Multi-studio supported |
| `Source` | `[[Source]]` | Tenrai | |
| `Genre` / `Themes` / `Demographic` | `[[...]][]` | Tenrai | Arrays, may be empty |
| `Cover` / `MAL` | url | Tenrai | Hotlink to MAL CDN |
| `Rating` | 1–10 | **You** | Never overwritten by sync |
| `Prequels` / `Sequels` / `Alternative Version` | `[[Anime]][]` | Manual | Rendered as media-grid |

**Example** — `Anime/Ansatsu Kyoushitsu/Ansatsu Kyoushitsu 2nd Season.md` demonstrates multi-genre, `Prequels`, and synopsis callout.

## 🗃️ Obsidian Bases

Location: `Utilities/Bases/` — native Obsidian Bases (1.9+), no Dataview needed.

| Base | Purpose |
|------|---------|
| `Anime tracker.base` | Main collection table — filter/sort all 369 entries |
| `Genre base.base` | `Extra/Genre/` dimension |
| `Themes base.base` | `Extra/Themes/` dimension |
| `Studio base.base` | `Extra/Studio/` dimension |
| `Source base.base` | `Extra/Source/` dimension |
| `Demographic base.base` | `Extra/Demographic/` dimension |
| `Type base.base` | `Extra/Type/` dimension |

Bases power cross-linked counts and the canvas dashboard.

## 📈 DataviewJS Graphs

Location: `Utilities/Graphs/` — DataviewJS + Charts.

| File | Chart | Query |
|------|-------|-------|
| `Genres.md` | Doughnut | `dv.pages('"Anime"')` |
| `Themes.md` | Doughnut | `dv.pages('"Anime"')` |
| `Studio.md` | Doughnut | `dv.pages('"Anime"')` |
| `Rating Distribution.md` | Bar + Curve | `dv.pages('"Anime"')` |

> **Gotcha:** Use `'"Anime"'` exactly. `'"Anime/"'` (recursive) breaks the graphs (`AGENTS.md §6`).

Embedded together in `Homepage.canvas`:

```
[Genres.md] [Themes.md]
[Studio.md] [Rating Distribution.md]
```

## 🛠️ Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| **Vault** | Obsidian | `openBehavior: Homepage.canvas`, `newLinkFormat: shortest` |
| **Metadata** | [Tenrai API](https://tenrai.org/) | Jikan-compatible MAL mirror (original Jikan public API discontinued) |
| **Sync** | Python 3 (`sync_anime.py`, `sync_studios.py`) | Outputs to `Utilities/Scripts/data/Metadata_Updates/` for manual review |
| **Queries** | Dataview + DataviewJS | Powers `Utilities/Graphs/` |
| **Database** | Obsidian Bases | 7 views |
| **Sorting** | Custom Sort (`Utilities/sortspec.md`) | Mixes folders + files A→Z in `Anime/` |
| **Theme** | Baseline `3.2.12` | + `obsidian-style-settings` for tweaks |
| **Backups** | Git + Windows Task | Weekly on login |
| **Lint** | Pre-commit hook (`.githooks/pre-commit`) | Secret + 10 MB file check |

## 🔌 Community Plugins

| Plugin | Purpose | Link |
|--------|---------|------|
| **dataview** | Query engine | [community](https://community.obsidian.md/plugins/dataview) |
| **obsidian-charts** | Chart renderer for DataviewJS | [community](https://community.obsidian.md/plugins/obsidian-charts) |
| **pretty-properties** | Enhanced YAML display | [community](https://community.obsidian.md/plugins/pretty-properties) |
| **obsidian-style-settings** | Theme tweaks UI | [community](https://community.obsidian.md/plugins/obsidian-style-settings) |
| **custom-sort** | Alphabetical folder+file mix | [community](https://community.obsidian.md/plugins/custom-sort) |
| **vault-inspector** | Structure/broken-link scan | [community](https://community.obsidian.md/plugins/vault-inspector) |

All listed in `.obsidian/community-plugins.json` and tracked in `.obsidian/plugins/`.

## 🎨 Theme & Snippets

**Theme:** `Baseline` (`appearance.json: cssTheme=Baseline`, `theme=obsidian`), with `Style Settings` enabled.

**Snippets** (`.obsidian/snippets/`, all enabled):

| Snippet | Effect |
|---------|--------|
| `media-grid.css` | 3-column poster grid for `Prequels`/`Sequels`/`Side Stories` (used by `media-grid Template.md`) |
| `obsidian-icons.css` | Icon customization |
| `text-centered.css` | Centered text helper |

Template demo (`Utilities/Templates/media-grid Template.md`):
```html
<div class="media-grid">
  <div class="media-column prequels"><h4>Prequels</h4>…</div>
  <div class="media-column sequels"><h4>Sequels</h4>…</div>
</div>
```

## 🔀 Sorting

`Utilities/sortspec.md` drives the **Custom Sort** plugin:

```yaml
sorting-spec: |
  target-folder: /Anime/*
  < a-z
```

Fixes Obsidian’s default “folders first” to pure A→Z interleaving. Without it, `Aho Girl.md` sorts after all series folders.

## 🔄 Automation & Scripts

### Auto-backup (Windows)

- **Trigger:** Windows login, weekly (runs only if last backup ≥7 days ago)
- **Task:** `Task Scheduler → AniVault Git Backup`
- **Script:** `C:\Scripts\AniVault-backup.ps1` — `git add -A && git commit -m "Last Sync: $(date)" && git push` + `git push` staging

### Pre-commit hook

Versioned at `.githooks/pre-commit` (enabled via `git config core.hooksPath .githooks`):

- Blocks secrets (API keys, tokens, GitHub PATs)
- Blocks files >10 MB

### Sync scripts

**`Utilities/Scripts/sync_anime.py`**
```powershell
python Utilities/Scripts/sync_anime.py --help
# --full        recheck all files (vs incremental via data/*.log)
# --mode {info,synopsis,both}  default both
# --dry-run     preview without writing
```
Syncs: `ID, Type, Episodes, Aired, Finished, Studio, Source, Genre, Themes, Demographic, Cover, MAL, Synopsis`. Writes updated Markdown to `Utilities/Scripts/data/Metadata_Updates/` — **never** overwrites in place; you review then move. `Rating` excluded (personal).

**`Utilities/Scripts/sync_studios.py`** — incremental studio metadata (foundation date, cover, MAL link) with `data/studios_synced.log`.

**`Utilities/Scripts/sync_menu.bat`** — interactive menu:
```
1. Full sync          2. Sync new synopsis   3. Sync new metadata
4. Studios full       5. Studios incremental
```

Logs: `Utilities/Scripts/data/{metadata,synopsis,studios}_synced.log` (ignored `__pycache__/`).

## 💡 Tips & Workflow

- **New anime:** Create `Anime/<Series>/<Title>.md` from template → fill `ID` → run sync or paste MAL fields manually → rate after watching.
- **Watchlist:** Add stubs to `Pending/` (intentionally incomplete — `AGENTS.md §2.3`). When watched, move to `Anime/` and enrich.
- **Studios:** Don’t create `Extra/Studio/<New>.md` unless a watched `Anime/` note wikilinks it (`AGENTS.md §2.4` — avoids orphans).
- **Bases vs search:** Prefer Bases for browsing; `Utilities/` & `To-do/` are excluded from Obsidian search/graph by design.
- **Git:** Volatile state (`workspace.json`, `workspace-mobile.json`, `vault-inspector/data.json`) is ignored — your layout stays local. Config like `app.json`, `plugins/*`, `snippets/*` is tracked.
- **Graphs broke?** Check you didn’t change `dv.pages('"Anime"')` to `'"Anime/"'`.

## 📚 Documentation

- `.obsidian/AGENTS.md` — full project guidelines, frontmatter spec, automation, and “what not to do” list (hidden from vault, read before bulk edits).

## 📄 License

No license — public domain equivalent. No rights reserved. Use, modify, and adapt without restriction or attribution.

---

*Last updated: 2026-08-31 · Vault: 369 anime · 183 refs · 21 pending*
