---
sorting-spec: |
  target-folder: /Anime/*
  < a-z
---
>[!question] What is this file for?
>This file controls how folders and files are sorted in the **Anime** section of your vault.

>[!failure] The Problem
>By default, Obsidian always shows folders first, then files. So you'd see:
>```
>📁 Anime/
>├── 📁 Ansatsu Kyoushitsu/
>├── 📁 Beastars/
>├── 📁 Black Lagoon/
>├── 📄 Aho Girl.md
>├── 📄 Akame ga Kill.md
>└── 📄 Another.md
>```

>[!done] The Solution
>This sortspec file uses the [**Custom File Explorer sorting**](https://github.com/SebastianMC/obsidian-custom-sort) plugin to mix folders and files together alphabetically:
>```
>📁 Anime/
> ├── 📄Aho Girl.md
> ├── 📄 Akame ga Kill.md
> ├── 📁 Ansatsu Kyoushitsu/
> ├── 📄 Another.md
> ├── 📁 Beastars/
> └── 📁 Black Lagoon/
>```

>[!example] What it does
>- Sorts **only** the `/Anime` folder and everything inside it
>- Mixes folders and files in pure alphabetical order (A-Z)