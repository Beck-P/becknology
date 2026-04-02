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
- No server-side rendering or build step
- Hub card links use relative paths (`/my-app`, not full URLs)
- Each app folder is independent — different apps can use different libraries

## Git
- Repo: github.com/Beck-P/becknology
- SSH alias: `github-personal` (Beck's personal GitHub account, separate from work)
- Branch: main (push to deploy)

## Cowork → Claude Code Handoff
Same pattern as the Realzono repo: Cowork writes specs to `_claude_docs/`, Claude Code implements them.
- `spec-*.md` — Feature specs ready to implement
- `fix-*.md` — Bug fixes
- `prompt-*.md` — Reusable prompts
