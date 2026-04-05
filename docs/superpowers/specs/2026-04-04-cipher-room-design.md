# The Cipher Room — Design Spec

**App:** The Cipher Room
**URL:** `/cipher-room` on becknology
**Theme:** Field Agent Dossier — Indiana Jones / WW2 codebreaker aesthetic
**Date:** 2026-04-04

---

## Overview

The Cipher Room is a daily crossword puzzle app inside the becknology puzzle hub. Players are "agents" who receive daily "dispatches" — crossword puzzles with quirky, mixed-format clues — and race to decode them. Features a Supabase-backed leaderboard and shareable results.

The puzzle hub is designed to grow over time with additional puzzle types, but launches with crosswords: a 5x5 mini ("Flash Cipher") and an 11x11 large ("Full Dossier").

---

## Theme & Visual Design

### Aesthetic: Field Agent Dossier

The entire app is framed as a WW2-era intelligence field office. Every UI element has an in-world identity:

- **Background:** Dark (#0a0908), subtle paper grain texture
- **Grid cells:** Manila/parchment (#d4c8a0) on dark background
- **Black squares:** Crosshatch redaction pattern (diagonal stripes)
- **Typography:** Special Elite (Google Fonts typewriter font), fallback to Courier New
- **Color palette:** Warm sepia/amber (#c8b888), dark browns (#2a2218), red accents for stamps (#cc3333)
- **Decorative elements:** "TOP SECRET" classification badges, "DECODE" rubber stamps, coffee ring stains, manila folder tabs
- **Active cell:** Brighter parchment with inset border highlight
- **Active word:** Slightly brighter parchment than default cells

### In-World Naming

| UI Element | In-World Name |
|---|---|
| Hub / landing page | Field Office |
| Puzzle select | Incoming Dispatches |
| Mini crossword (5x5) | Flash Cipher |
| Large crossword (11x11) | Full Dossier |
| Stats / streaks | Service Record |
| Leaderboard | Field Rankings |
| Completion screen | Dispatch Decoded |
| First-visit registration | Agent Registration |
| Timer | Op Clock |
| Clues | Signals (Across Signals / Down Signals) |
| Puzzle number | Dispatch #NNN |
| Each daily puzzle | A dispatch from a named station (e.g. "Cairo Station") |

---

## Crossword Mechanics

### Grid Sizes
- **Flash Cipher:** 5x5 grid
- **Full Dossier:** 11x11 grid

### Rules (Strict)
- 180-degree rotational symmetry for black square patterns
- All white squares are part of both an across and a down word (fully checked)
- All white squares are connected
- Minimum 3-letter words (no two-letter entries)

### Grid Templates
- Pre-made black square patterns that satisfy symmetry and connectivity rules
- ~10-20 templates per grid size, shipped as JSON
- Generator randomly selects a template per puzzle (seeded by date)

### Puzzle Generation (Client-Side)
- Date string (e.g. "2026-04-04") seeds a deterministic PRNG
- Same date = same puzzle for all players
- Algorithm: select random template → backtracking fill from word list → assign clues
- Runs in the browser, no server needed

### Word List & Clues
- Curated JSON file: array of `{ word, clues }` objects
- Each word has multiple clues in different formats
- ~200-300 words to start
- Station names for dispatch flavor (e.g. "Cairo Station", "Berlin Station") come from a hardcoded list, selected deterministically by date seed
- Clue formats (mixed within each puzzle):
  - **Absurd definitions** — "bread's final form" for TOAST
  - **Emoji sequences** — 🐱🏠 for CATHOUSE
  - **ASCII art** — small text art depicting the answer
  - **Fill-in-the-blank** — absurd sentences with a blank
  - **Misdirection/humor** — long, funny descriptions that make you think

---

## Gameplay Flow

### First Visit Ever
1. Land on the Cipher Room hub (Field Office)
2. Agent Registration screen: two buttons — "New Agent" / "Returning Agent"
   - **New Agent:** Enter a codename → validate it's not taken in Supabase → create agent record → proceed
   - **Returning Agent:** Enter existing codename → look up in Supabase → if found, load their record → if not found, show error, try again
3. Agent ID stored in localStorage for future visits
4. See today's two dispatches

### Returning Visits (localStorage has agent ID)
1. Skip registration, go straight to hub
2. Hub shows today's dispatches with status:
   - "PENDING" — not started
   - "IN PROGRESS" — started but not finished
   - "DECODED" — completed, shows time
3. Current streak visible on hub

### Solving a Puzzle
1. Tap a dispatch to open it — the dossier "opens"
2. Header: classification badge, rubber stamp, dispatch info (number, station, date)
3. Grid appears with manila cells, crosshatch-redacted black squares
4. Timer starts immediately — displayed as "OP CLOCK: 00:00"
5. Tap a cell to select it, type to fill
6. Tap the current clue (or active cell) to toggle across/down direction
7. Active word is highlighted, active cell has a stronger highlight
8. Clues panel below grid, organized as "Across Signals" and "Down Signals"
9. Mixed-format clues interleaved naturally
10. **No error highlighting during play** — you don't know if a letter is wrong until the whole puzzle works or doesn't. No hand-holding. Pure codebreaker.
11. Decryption progress bar shows percentage of cells filled
12. If you close the tab mid-solve, progress is saved in localStorage

### Completing a Puzzle
1. Last letter placed + all correct → "DISPATCH DECODED" stamp animation slams onto the grid
2. Time shown, compared to personal best
3. Score submitted to Supabase leaderboard
4. Shareable result block available to copy
5. "Return to Field Office" button

---

## Shareable Results

Themed text block optimized for texting:

```
═══════════════════════
  TRANSMISSION — CIPHER ROOM
  DISPATCH #096 — CAIRO STATION
  FLASH CIPHER — DECODED
  OP TIME: 02:47
  STATUS: ██████████ COMPLETE
═══════════════════════
```

Copied to clipboard with one tap on the completion screen.

---

## Data Architecture

### localStorage (per-browser)
- Agent ID (links to Supabase)
- Agent codename (for display without fetching)
- Current puzzle state (in-progress grids, per date + type)
- Completion history: `{ date, puzzleType, timeSeconds, completed }`
- Streak counter and best times (derived from history but cached)

### Supabase (shared)

**Table: `agents`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| codename | text | Unique |
| created_at | timestamptz | Auto |

**Table: `cipher_room_scores`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| agent_id | uuid | FK → agents.id |
| date | date | Puzzle date |
| puzzle_type | text | "flash" or "dossier" |
| time_seconds | integer | Solve time |
| created_at | timestamptz | Auto |

**Queries:**
- Leaderboard: top 10 by time_seconds for a given date + puzzle_type
- Personal stats: all scores for a given agent_id

### Identity Flow
1. localStorage has agent ID → skip registration, use stored ID
2. No agent ID → show "New Agent" / "Returning Agent" choice
3. New Agent → enter codename → check uniqueness → create record → store ID locally
4. Returning Agent → enter codename → look up → load record → store ID locally

---

## File Structure

```
apps/cipher-room/
├── index.html          — Hub / Field Office
├── play.html           — Gameplay screen
├── css/
│   └── style.css       — Dossier theme styles
├── js/
│   ├── generator.js    — Grid template selection + backtracking word fill
│   ├── game.js         — Gameplay logic, input handling, timer
│   ├── storage.js      — localStorage helpers
│   ├── leaderboard.js  — Supabase client integration
│   └── share.js        — Share text builder + clipboard
├── data/
│   ├── words.json      — Word list with multi-format clues
│   └── templates.json  — Grid templates (black square patterns)
└── fonts/              — Special Elite typewriter font (self-hosted)
```

All static files. No build step. Supabase JS client loaded via CDN. Consistent with becknology conventions.

---

## Routing

Add to `vercel.json`:
```json
{ "source": "/cipher-room", "destination": "/apps/cipher-room/index.html" },
{ "source": "/cipher-room/(.*)", "destination": "/apps/cipher-room/$1" }
```

Add a card to `apps/hub/index.html` linking to `/cipher-room`.

---

## Future Expansion

The Cipher Room is a puzzle hub. Crosswords launch first, but the structure supports adding more puzzle types (word search, sudoku, etc.) as new "dispatch types." The Field Office hub would show all available puzzle types, each with their own daily dispatch.
