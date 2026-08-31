# AniVault

> Anime collection tracker & reference database powered by Obsidian

[![GitHub](https://img.shields.io/badge/GitHub-AnxoSilvaSixto/AniVault-181717?style=flat&logo=github)](https://github.com/AnxoSilvaSixto/AniVault)
[![Obsidian](https://img.shields.io/badge/Built%20with-Obsidian-48AA42?style=flat&logo=obsidian&logoColor=white)](https://obsidian.md)

> **Personal vault** — Feel free to use, modify, and adapt this vault for your own anime tracking. No license restrictions — public domain equivalent, do whatever you want.

## 📊 Collection Stats

| Category | Count |
|----------|-------|
| **Anime Notes** | 369+ |
| **Reference Pages** | 183 |
| **Watchlist** | 21 |
| **Studios** | 90 |
| **Themes** | 52 |
| **Genres** | 21 |

## 🏗️ Structure

```
AniVault/
├── Anime/              # Anime notes (standalone + series subfolders)
├── Extra/              # Reference pages (studios, genres, themes, etc.)
│   ├── Demographic/    # Seinen, Shounen, Shoujo, Josei, Kids
│   ├── Genre/          # Action, Romance, Comedy, etc.
│   ├── Source/         # Manga, Light Novel, Original, etc.
│   ├── Studio/         # Studio Ghibli, MAPPA, Ufotable, etc.
│   ├── Themes/         # Isekai, Mecha, Slice of Life, etc.
│   └── Type/           # TV, Movie, OVA, ONA, Special
├── Pending/            # Watchlist (unwatched anime)
├── To-do/              # Task tracking (hidden from vault stats)
├── Utilities/          # Scripts, graphs, bases, templates
│   ├── Bases/          # Obsidian Bases database views
│   ├── Graphs/         # DataviewJS charts
│   ├── Scripts/        # Python sync scripts
│   └── Templates/      # Note templates
├── Homepage.canvas     # Main dashboard
└── README.md           # This file (GitHub landing page)
```

## 🛠️ Tech Stack

| Component | Tool |
|-----------|------|
| **Vault** | Obsidian |
| **Metadata** | [Tenrai API](https://tenrai.org/) (Jikan-compatible) |
| **Sync** | Python scripts (`sync_anime.py`, `sync_studios.py`) |
| **Queries** | Dataview + DataviewJS |
| **Database** | Obsidian Bases |
| **Sorting** | Custom Sort plugin |
| **Theme** | Baseline + 3 CSS snippets |

## 📝 Frontmatter Schema

```yaml
ID: <MAL ID>
Type: <TV|Movie|OVA|ONA|Special>
Episodes: <count>
Aired: <YYYY-MM-DD>
Finished: <YYYY-MM-DD>
Studio: [[Studio Name]]
Source: <Source type>
Genre: [[Genre]]
Themes: <theme>
Demographic: <demographic>
Cover: <image URL>
MAL: <MAL URL>
Rating: <1-10>
```

## 🔌 Community Plugins

| Plugin | Description | Link |
|--------|-------------|------|
| **dataview** | Query engine for vault data | [Plugin](https://community.obsidian.md/plugins/dataview) |
| **obsidian-charts** | Chart visualizations | [Plugin](https://community.obsidian.md/plugins/obsidian-charts) |
| **pretty-properties** | Enhanced property display | [Plugin](https://community.obsidian.md/plugins/pretty-properties) |
| **obsidian-style-settings** | Theme customization UI | [Plugin](https://community.obsidian.md/plugins/obsidian-style-settings) |
| **custom-sort** | Mixed folder/file alphabetical sorting | [Plugin](https://community.obsidian.md/plugins/custom-sort) |
| **vault-inspector** | Vault structure inspection | [Plugin](https://community.obsidian.md/plugins/vault-inspector) |

## 🔄 Automation

- **Auto-backup:** Weekly Git backup on Windows login
- **Pre-commit hook:** Secret detection + file size checks
- **Sync scripts:** Automatic metadata updates from MAL

## 📚 Documentation

- `.obsidian/AGENTS.md` — Project guidelines and rules (hidden from vault)

## 📄 License

No license — public domain equivalent. No rights reserved. Use, modify, and adapt without restriction or attribution.

---

*Last updated: 2026-08-31*
