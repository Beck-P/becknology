# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

<!-- Last reviewed: 2026-03-31 -->

## What This Is
Becknology is Beck's personal monorepo for small apps, games, tools, and experiments. Deployed as a single Vercel project with path-based routing. All apps are plain static HTML/CSS/JS — no build step, no framework.

## Repo Structure
```
becknology/
├── vercel.json          — routing config (rewrites map URL paths to app folders)
├── package.json
├── .gitignore
├── README.md
├── _claude_docs/        — specs and prompts for Claude Code tasks
└── apps/
    ├── hub/             — main landing page, served at /
    │   └── index.html
    └── placeholder-app/ — demo app, served at /placeholder-app
        └── index.html
```

## How Routing Works
`vercel.json` uses rewrites to map URL paths to app folders. The root `/` serves `apps/hub/index.html`. Each app gets a clean path like `/my-app` that maps to `apps/my-app/index.html`.

Caching: a Bridge scene image (`/bridge/assets/scenes/**.png|webp`) asked for with `?v=` is cached by browsers for a year, never rechecked (`headers` in `vercel.json`). So `v` must only ever be the scene's `rev` from its scene.json — a fingerprint of its images (tools/bridge-art/scene_post.py `revision`) — or something unique like `Date.now()`; never a hand-kept number.

## Adding a New App
1. Create `apps/my-app/` with at least an `index.html`
2. Add a rewrite to `vercel.json`: `{ "source": "/my-app", "destination": "/apps/my-app/index.html" }`
3. If the app has sub-pages or assets, add a wildcard rewrite too: `{ "source": "/my-app/(.*)", "destination": "/apps/my-app/$1" }`
4. Add a card to `apps/hub/index.html` linking to `/my-app`
5. Add the favicon link in `<head>`: `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
6. Commit and push — Vercel auto-deploys from main

## Constraints
- All apps share one Vercel project and one deploy
- Apps should be self-contained static files (HTML/CSS/JS, CDN imports are fine)
- No server-side rendering or build step — one approved exception: `api/talk.mjs`, the Bridge's AI conversations (a Vercel function; needs `ANTHROPIC_API_KEY` in the Vercel project's environment variables, and is off without it)
- Hub card links use relative paths (`/my-app`, not full URLs)
- Each app folder is independent — different apps can use different libraries

## Git
- Repo: github.com/Beck-P/becknology
- SSH alias: `github-personal` (Beck's personal GitHub account, separate from work)
- Branch: main (push to deploy)
- Vercel doesn't build `claude/*` branches (`git.deploymentEnabled` in `vercel.json`) — only `main` deploys, which keeps under the Hobby plan's daily build limit. If a deploy fails with "Deployment rate limited", the code is fine: the next push to `main` after the limit resets deploys everything.
- **Ship every change.** After each completed, verified change: commit, push, and merge into `main` so it deploys live — Beck's standing instruction, no need to ask. If you're working on a feature branch, push it and then bring `main` up to it (fast-forward when possible; otherwise merge `main` in first and resolve conflicts, then push to `main`).

## Bridge art
Making or changing art for the Bridge (`apps/bridge`, built in `tools/bridge-art`): follow the house style in
`apps/bridge/CLAUDE.md` (*North star*, *Live light*, *Making a new place*; the short version is
`tools/bridge-art/CLAUDE.md`). The target looks like `tools/bridge-art/dioramas/ref/*.png` (Look Book 2, the toy finish
in soft light) — look at them before building a place, and compare against them before shipping it.

**Faces on the talk card** are drawn, never rendered: `python3 tools/bridge-art/portraits.py stale` draws every portrait
that's missing or out of date (a new or changed NPC in `tools/bridge-art/characters.py`, a new crowd body or suit) — then
look at it (`--look FILE`). Anywhere the game shows someone's face, use js/look.js (`BridgeLook.npcFace` for a sheet,
`pilotFace` / `face` for pilots and hired people; a chooser row's `sheet` or `face`) — never a crop of a walking sheet.
`.claude/hooks/portraits.py` (in `.claude/settings.json`) stops a commit or push while any portrait is out of date.

## Testing
`node tools/tests/run.js [world|multi|together|royale|combat]` — headless-Chromium tests for the Bridge and Royale Link (every world loading, two pilots playing together over a stand-in Supabase, every game together, the casino, combat). It starts its own local servers. See `tools/tests/README.md`. Run the suites a change touches before shipping it; add a test there when you build something new.

## Cowork → Claude Code Handoff
Same pattern as the Realzono repo: Cowork writes specs to `_claude_docs/`, Claude Code implements them.
- `spec-*.md` — Feature specs ready to implement
- `fix-*.md` — Bug fixes
- `prompt-*.md` — Reusable prompts
