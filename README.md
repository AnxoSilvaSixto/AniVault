# AniVault

> Anime collection tracker & reference database powered by Obsidian

[![GitHub](https://img.shields.io/badge/GitHub-AnxoSilvaSixto/AniVault-181717?style=flat&logo=github)](https://github.com/AnxoSilvaSixto/AniVault)
[![Obsidian](https://img.shields.io/badge/Built%20with-Obsidian-48AA42?style=flat&logo=obsidian&logoColor=white)](https://obsidian.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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
├── Utilities/          # Scripts, graphs, bases, templates
│   ├── Bases/          # Obsidian Bases database views
│   ├── Graphs/         # DataviewJS charts
│   ├── Scripts/        # Python sync scripts
│   └── Templates/      # Note templates
└── Homepage.canvas     # Main dashboard
```

## 🛠️ Tech Stack

| Component | Tool |
|-----------|------|
| **Vault** | Obsidian |
| **Metadata** | MyAnimeList via Tenrai API (Jikan-compatible) |
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
Finished: <YYYY-MM-DD or null>
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

- **dataview** — Query engine for vault data
- **obsidian-charts** — Chart visualizations
- **pretty-properties** — Enhanced property display
- **obsidian-style-settings** — Theme customization UI
- **custom-sort** — Mixed folder/file alphabetical sorting
- **vault-inspector** — Vault structure inspection

## 🔄 Automation

- **Auto-backup:** Weekly Git backup on Windows login
- **Pre-commit hook:** Secret detection + file size checks
- **Sync scripts:** Automatic metadata updates from MAL

## 📚 Documentation

- `AGENTS.md` — Project guidelines and rules
- `_vault_guidelines.md` — Vault management guidelines

## 📄 License

This project is licensed under the MIT License.

---

*Last updated: 2026-08-31*
