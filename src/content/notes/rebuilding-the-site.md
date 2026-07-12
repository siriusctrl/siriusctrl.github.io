---
title: Rebuilding a personal site around working software
description: A static portfolio can stay simple while giving interactive demos and terminal projects the space they need.
publishedAt: 2026-07-12
tags:
  - architecture
  - publishing
  - github-pages
---

A personal site does not need to become another application backend. Most of what I want to publish is already static: writing, screenshots, short recordings, and links to source code. The interactive projects can keep their own release cycles.

That leads to a small publishing model:

- This repository owns the home page, project index, and Markdown notes.
- Interactive browser projects deploy from their own repositories.
- Terminal projects are shown with recordings from real terminal emulators.
- GitHub Actions builds and publishes the static output.

## Why the projects stay separate

Copying every project build into the personal-site repository would couple unrelated releases. A change to a note should not rebuild a browser experiment, and a new Freeform release should not require touching the portfolio.

The home page is therefore a curated index. It owns the description and visual presentation, while each project remains the source of truth for its code, documentation, releases, and verification evidence.

## Local-first demos

Freeform is a useful example of what static hosting can still do. The published board is a template. On first load, the browser creates a local workspace from that template. Later edits are stored in IndexedDB and remain isolated to that browser profile.

There is no account system and no shared database. Visitors can experiment freely without changing the public template or another visitor's canvas. Export and import provide the explicit portability boundary.

## What belongs on the site

Not every repository needs a live web interface. A terminal product is better represented by its actual terminal UI, a concise explanation, and a direct installation path. The goal is evidence of the software, not a web-shaped imitation of it.
