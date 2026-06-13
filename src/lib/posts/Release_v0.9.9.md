---
title: 'Unggoy v0.9.9'
date: '2026-06-12'
updated: '2026-06-12'
categories:
  - 'release'
  - 'update'
excerpt: Playlists without a custom cover now generate distinct thumbnails from their maps.
---

## Changelog

This release gives every playlist a cover of its own, so the Playlists pages are far easier to scan at a glance:

- Playlists without an uploaded cover now build a thumbnail automatically from the maps they contain. A playlist with four or more maps shows a 2x2 mosaic of the first four; one to three maps shows the first map full-bleed.
- Empty playlists fall back to a tinted placeholder. The tint is derived from the playlist's name, so the same playlist always gets the same color and no two sit next to each other looking identical.
- Custom uploaded covers still take priority over all of the above, so nothing changes for playlists you've already personalized.
- Generated covers appear everywhere playlists are listed — the homepage rows, the browse and favorites pages, your own playlists, and the individual playlist page header.
- Covers load lazily and reserve their space ahead of time, so long pages stay smooth and don't shift around as images come in. Broken map thumbnails gracefully fall back to the playlist's tint.
