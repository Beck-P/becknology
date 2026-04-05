# The Cipher Room — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a daily crossword puzzle app ("The Cipher Room") with a WW2 field agent dossier theme, algorithmic puzzle generation, Supabase leaderboard, and shareable results.

**Architecture:** Static HTML/CSS/JS app (no build step) in the becknology monorepo. Crossword puzzles are generated client-side using a date-seeded PRNG with pre-made grid templates and a curated word list. Supabase provides agent identity and leaderboard persistence. localStorage handles in-progress game state and local stats.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS v2 (CDN), Special Elite font (Google Fonts), Vercel static hosting

**Spec:** `docs/superpowers/specs/2026-04-04-cipher-room-design.md`

**Reference:** The runouts app (`apps/runouts/`) uses Supabase with hardcoded credentials and simple insert/select patterns. Cipher Room follows the same approach but loads Supabase via CDN instead of npm (no build step).

---

## File Structure

```
apps/cipher-room/
├── index.html              — Hub / Field Office (dispatch cards, streak, nav)
├── play.html               — Gameplay screen (grid, clues, timer)
├── css/
│   └── style.css           — Full dossier theme
├── js/
│   ├── prng.js             — Deterministic seeded PRNG (mulberry32)
│   ├── generator.js        — Template selection + backtracking word fill
│   ├── game.js             — Grid rendering, input, timer, completion
│   ├── storage.js          — localStorage helpers (state, history, stats)
│   ├── supabase.js         — Agent registration, scores, leaderboard
│   └── share.js            — Share text builder + clipboard
├── data/
│   ├── words.json          — Word list with multi-format clues
│   └── templates.json      — Grid templates (5x5 and 11x11)
```

---

## Task 1: Project Scaffolding + Routing

**Files:**
- Create: `apps/cipher-room/index.html` (shell)
- Create: `apps/cipher-room/play.html` (shell)
- Create: `apps/cipher-room/css/style.css` (empty)
- Modify: `vercel.json` — add cipher-room rewrites
- Modify: `apps/hub/index.html` — add hub card

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p apps/cipher-room/css apps/cipher-room/js apps/cipher-room/data
```

- [ ] **Step 2: Create index.html shell**

Create `apps/cipher-room/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Cipher Room</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <a href="/" class="hub-link">← BECKNOLOGY</a>
  <div id="app" class="page">
    <h1>THE CIPHER ROOM</h1>
    <p class="subtitle">FIELD OFFICE — INCOMING DISPATCHES</p>
  </div>
  <script src="js/storage.js"></script>
  <script src="js/supabase.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create play.html shell**

Create `apps/cipher-room/play.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Cipher Room — Dispatch</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <a href="/cipher-room" class="hub-link">← FIELD OFFICE</a>
  <div id="app" class="page"></div>
  <script src="js/prng.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/generator.js"></script>
  <script src="js/game.js"></script>
  <script src="js/share.js"></script>
  <script src="js/supabase.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create empty style.css**

Create `apps/cipher-room/css/style.css`:

```css
/* The Cipher Room — Dossier Theme */
/* Populated in Task 2 */
```

- [ ] **Step 5: Add routing to vercel.json**

Add these rewrites to the `rewrites` array in `vercel.json` (before any catch-all rules):

```json
{ "source": "/cipher-room", "destination": "/apps/cipher-room/index.html" },
{ "source": "/cipher-room/(.*)", "destination": "/apps/cipher-room/$1" }
```

- [ ] **Step 6: Add hub card to apps/hub/index.html**

Add a card linking to `/cipher-room` in the hub's card grid. Follow the existing card pattern (inspect the hub HTML for the exact markup). The card should have:
- Title: "The Cipher Room"
- Description: "Daily dispatches need decoding"
- Tags: "puzzles", "daily", "crossword"
- Link: `/cipher-room`

- [ ] **Step 7: Verify and commit**

Open `http://localhost:3000/cipher-room` (or deploy preview) and verify the shell loads.

```bash
git add apps/cipher-room/ vercel.json apps/hub/index.html
git commit -m "feat: scaffold cipher-room app with routing and hub card"
```

---

## Task 2: Dossier Theme CSS

**Files:**
- Create: `apps/cipher-room/css/style.css`

- [ ] **Step 1: Write the complete stylesheet**

Create `apps/cipher-room/css/style.css`:

```css
/* =========================================
   THE CIPHER ROOM — Dossier Theme
   ========================================= */

/* --- Reset & Base --- */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0a0908;
  color: #c8b888;
  font-family: 'Special Elite', 'Courier New', monospace;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  position: relative;
}

/* Subtle paper grain */
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(ellipse at 30% 20%, rgba(200,184,136,0.015) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(200,184,136,0.01) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* --- Navigation --- */
.hub-link {
  position: fixed;
  top: 12px;
  left: 16px;
  font-size: 11px;
  color: #c8b88840;
  text-decoration: none;
  letter-spacing: 1px;
  z-index: 10;
  transition: color 0.3s;
}
.hub-link:hover { color: #c8b88880; }

/* --- Page Container --- */
.page {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 480px;
}

/* --- Typography --- */
h1 {
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 22px;
  color: #c8b888;
  letter-spacing: 3px;
  font-weight: normal;
  text-align: center;
}

h2 {
  font-size: 16px;
  color: #c8b888;
  letter-spacing: 2px;
  font-weight: normal;
}

.subtitle {
  font-size: 10px;
  color: #c8b88840;
  letter-spacing: 2px;
  text-align: center;
}

/* --- Classification Badge --- */
.classification {
  font-size: 9px;
  letter-spacing: 4px;
  color: #cc3333;
  border: 1.5px solid #cc333350;
  display: inline-block;
  padding: 2px 10px;
  transform: rotate(-1deg);
}

/* --- Rubber Stamp --- */
.stamp {
  font-size: 10px;
  color: #cc3333;
  border: 2px solid #cc333340;
  padding: 2px 8px;
  letter-spacing: 2px;
  opacity: 0.5;
  display: inline-block;
}

/* --- Dispatch Header --- */
.dispatch-header {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
}

.dispatch-header .stamp {
  position: absolute;
  top: 5px;
  right: -5px;
  transform: rotate(12deg);
}

.dispatch-info {
  font-size: 9px;
  color: #c8b88830;
  margin-top: 6px;
  letter-spacing: 1px;
  text-align: center;
}

/* --- Op Clock --- */
.op-clock {
  text-align: center;
  margin-bottom: 16px;
  font-size: 11px;
  color: #c8b88850;
  letter-spacing: 2px;
}

.op-clock .time {
  color: #c8b88880;
  font-size: 16px;
  letter-spacing: 3px;
  display: block;
  margin-top: 2px;
}

/* --- Grid Container --- */
.grid-container {
  background: #c8b88808;
  border: 1px solid #c8b88815;
  padding: 8px;
  margin: 0 auto 20px;
  width: fit-content;
  position: relative;
}

/* Coffee ring stain */
.grid-container::after {
  content: '';
  position: absolute;
  bottom: -15px;
  right: -10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(139, 107, 48, 0.06);
  pointer-events: none;
}

/* --- Grid --- */
.grid {
  display: grid;
  gap: 1px;
}

.grid.size-5 { grid-template-columns: repeat(5, 48px); }
.grid.size-11 { grid-template-columns: repeat(11, 32px); }

/* --- Cells --- */
.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Special Elite', 'Courier New', monospace;
  font-weight: bold;
  position: relative;
  border: 0.5px solid #b8a87830;
  transition: background 0.15s;
  cursor: default;
  user-select: none;
}

.grid.size-5 .cell { width: 48px; height: 48px; font-size: 22px; }
.grid.size-11 .cell { width: 32px; height: 32px; font-size: 15px; }

.cell.white {
  background: #d4c8a0;
  color: #2a2218;
  cursor: pointer;
}

.cell.white:hover { background: #dcd0a8; }
.cell.word-highlight { background: #ddd0a0; }
.cell.active { background: #e8d8a0; box-shadow: inset 0 0 0 2px #8a6a20; }

.cell.black {
  background: #1a1810;
  cursor: default;
}

.cell.black .redaction {
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    45deg,
    #1a1810, #1a1810 3px,
    #15130c 3px, #15130c 6px
  );
}

.cell .number {
  position: absolute;
  top: 2px;
  left: 3px;
  font-weight: normal;
  color: #8a7a5a;
}

.grid.size-5 .cell .number { font-size: 9px; }
.grid.size-11 .cell .number { font-size: 7px; }

/* Hidden input for mobile keyboard */
.hidden-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

/* --- Progress Bar --- */
.progress-bar { margin: 16px 0; text-align: center; }
.progress-bar .label {
  font-size: 8px;
  letter-spacing: 2px;
  color: #c8b88830;
  margin-bottom: 4px;
}
.progress-track {
  height: 3px;
  background: #c8b88810;
  border-radius: 2px;
  overflow: hidden;
  max-width: 200px;
  margin: 0 auto;
}
.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #c8a048, #c8b888);
  border-radius: 2px;
  transition: width 0.5s;
}

/* --- Divider --- */
.divider {
  width: 60px;
  height: 1px;
  background: #c8b88815;
  margin: 12px auto;
}

/* --- Clues --- */
.clues-section { margin-top: 8px; }
.clues-direction { margin-bottom: 16px; }

.clues-direction h3 {
  font-size: 10px;
  letter-spacing: 3px;
  color: #c8b88850;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #c8b88815;
  text-transform: uppercase;
  font-weight: normal;
}

.clue {
  font-size: 13px;
  color: #c8b88870;
  margin-bottom: 8px;
  padding-left: 8px;
  line-height: 1.5;
  cursor: pointer;
  transition: color 0.2s;
}

.clue:hover { color: #c8b888a0; }

.clue.active-clue {
  color: #c8b888c0;
  border-left: 2px solid #c8a04860;
  padding-left: 6px;
}

.clue .clue-num {
  color: #c8b88890;
  font-size: 11px;
  margin-right: 4px;
}

/* --- Dispatch Cards (Hub) --- */
.dispatches {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 24px 0;
}

.dispatch-card {
  background: #c8b88808;
  border: 1px solid #c8b88815;
  padding: 16px 20px;
  cursor: pointer;
  transition: border-color 0.3s, background 0.3s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.dispatch-card:hover {
  border-color: #c8b88830;
  background: #c8b88810;
}

.dispatch-card .card-title {
  font-size: 14px;
  color: #c8b888;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.dispatch-card .card-subtitle {
  font-size: 10px;
  color: #c8b88840;
  letter-spacing: 1px;
}

.dispatch-card .card-status {
  font-size: 9px;
  letter-spacing: 2px;
  margin-top: 8px;
}

.card-status.pending { color: #c8b88840; }
.card-status.in-progress { color: #c8a048; }
.card-status.decoded { color: #6a9a4a; }

/* --- Streak --- */
.streak {
  text-align: center;
  margin: 20px 0;
  font-size: 10px;
  color: #c8b88840;
  letter-spacing: 2px;
}

.streak .count {
  font-size: 24px;
  color: #c8b88870;
  display: block;
  margin-bottom: 2px;
}

/* --- Agent Registration --- */
.registration {
  max-width: 320px;
  margin: 60px auto;
  text-align: center;
}

.registration h2 {
  margin-bottom: 8px;
}

.registration .subtitle {
  margin-bottom: 24px;
}

.reg-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 13px;
  letter-spacing: 2px;
  padding: 12px 24px;
  border: 1px solid #c8b88830;
  background: #c8b88808;
  color: #c8b888;
  cursor: pointer;
  transition: background 0.3s, border-color 0.3s;
}

.btn:hover {
  background: #c8b88815;
  border-color: #c8b88850;
}

.btn.primary {
  border-color: #c8a04850;
  background: #c8a04815;
}

.btn.primary:hover {
  background: #c8a04825;
  border-color: #c8a04870;
}

.input-field {
  font-family: 'Special Elite', 'Courier New', monospace;
  font-size: 16px;
  letter-spacing: 2px;
  padding: 10px 16px;
  border: 1px solid #c8b88830;
  background: #c8b88808;
  color: #c8b888;
  width: 100%;
  text-align: center;
  outline: none;
  margin-bottom: 12px;
}

.input-field:focus {
  border-color: #c8a04860;
}

.input-field::placeholder {
  color: #c8b88830;
}

.error-msg {
  font-size: 11px;
  color: #cc3333;
  margin-bottom: 8px;
}

/* --- Completion Overlay --- */
.completion-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 9, 8, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.completion-card {
  text-align: center;
  max-width: 360px;
  padding: 40px 30px;
}

.completion-card .stamp-large {
  font-size: 18px;
  color: #6a9a4a;
  border: 3px solid #6a9a4a60;
  display: inline-block;
  padding: 6px 20px;
  letter-spacing: 4px;
  transform: rotate(-3deg);
  margin-bottom: 20px;
  animation: stampSlam 0.4s cubic-bezier(0.2, 0, 0.3, 1);
}

@keyframes stampSlam {
  0% { transform: rotate(-3deg) scale(3); opacity: 0; }
  60% { transform: rotate(-3deg) scale(0.95); opacity: 1; }
  100% { transform: rotate(-3deg) scale(1); }
}

.completion-card .time-result {
  font-size: 28px;
  color: #c8b88880;
  letter-spacing: 4px;
  margin: 16px 0;
}

.completion-card .time-label {
  font-size: 10px;
  color: #c8b88840;
  letter-spacing: 2px;
}

.completion-card .personal-best {
  font-size: 10px;
  color: #c8a048;
  letter-spacing: 1px;
  margin-top: 4px;
}

.completion-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* --- Leaderboard --- */
.leaderboard {
  margin-top: 20px;
}

.leaderboard h3 {
  font-size: 10px;
  letter-spacing: 3px;
  color: #c8b88850;
  margin-bottom: 10px;
  text-align: center;
  font-weight: normal;
}

.leaderboard-entry {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #c8b88808;
  font-size: 12px;
}

.leaderboard-entry .rank { color: #c8b88840; width: 24px; }
.leaderboard-entry .name { color: #c8b88870; flex: 1; }
.leaderboard-entry .entry-time { color: #c8b88860; }
.leaderboard-entry.you .name { color: #c8a048; }

/* --- Service Record --- */
.service-record {
  margin: 24px 0;
  text-align: center;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 12px;
}

.stat-item .stat-value {
  font-size: 22px;
  color: #c8b88870;
  display: block;
}

.stat-item .stat-label {
  font-size: 8px;
  color: #c8b88840;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* --- Responsive --- */
@media (max-width: 400px) {
  .grid.size-5 { grid-template-columns: repeat(5, 42px); }
  .grid.size-5 .cell { width: 42px; height: 42px; font-size: 20px; }
  .grid.size-11 { grid-template-columns: repeat(11, 28px); }
  .grid.size-11 .cell { width: 28px; height: 28px; font-size: 13px; }
}
```

- [ ] **Step 2: Verify shells render with styling**

Open `index.html` in a browser. Confirm dark background, Special Elite font, correct colors.

- [ ] **Step 3: Commit**

```bash
git add apps/cipher-room/css/style.css
git commit -m "feat: add cipher-room dossier theme CSS"
```

---

## Task 3: Data Files — Grid Templates + Word List

**Files:**
- Create: `apps/cipher-room/data/templates.json`
- Create: `apps/cipher-room/data/words.json`

- [ ] **Step 1: Create grid templates**

Create `apps/cipher-room/data/templates.json`. Each template is a 2D array where `1` = white cell, `0` = black cell. All templates have 180° rotational symmetry, full connectivity, and minimum 3-letter words.

```json
{
  "5": [
    {
      "id": "5a",
      "grid": [
        [1,1,1,1,1],
        [1,0,1,0,1],
        [1,1,1,1,1],
        [1,0,1,0,1],
        [1,1,1,1,1]
      ]
    },
    {
      "id": "5b",
      "grid": [
        [1,1,1,1,1],
        [1,1,1,0,1],
        [1,1,1,1,1],
        [1,0,1,1,1],
        [1,1,1,1,1]
      ]
    },
    {
      "id": "5c",
      "grid": [
        [1,1,0,1,1],
        [1,1,1,1,1],
        [1,1,1,1,1],
        [1,1,1,1,1],
        [1,1,0,1,1]
      ]
    },
    {
      "id": "5d",
      "grid": [
        [1,1,1,1,1],
        [1,1,0,1,1],
        [1,0,1,0,1],
        [1,1,0,1,1],
        [1,1,1,1,1]
      ]
    },
    {
      "id": "5e",
      "grid": [
        [0,1,1,1,1],
        [1,1,1,1,1],
        [1,1,1,1,1],
        [1,1,1,1,1],
        [1,1,1,1,0]
      ]
    }
  ],
  "11": [
    {
      "id": "11a",
      "grid": [
        [1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,0,1,1],
        [1,1,1,0,1,1,1,0,1,1,1],
        [0,0,1,1,1,1,0,1,1,1,1],
        [1,1,1,1,1,0,1,1,1,1,1],
        [1,1,1,1,0,1,1,1,1,0,0],
        [1,1,1,0,1,1,1,0,1,1,1],
        [1,1,0,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,1,1]
      ]
    },
    {
      "id": "11b",
      "grid": [
        [1,1,1,0,1,1,1,0,1,1,1],
        [1,1,1,0,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,1,1],
        [0,1,1,1,1,0,1,1,1,1,0],
        [1,1,1,1,0,1,1,1,0,1,1],
        [1,1,0,1,1,1,1,1,0,1,1],
        [1,1,0,1,1,1,0,1,1,1,1],
        [0,1,1,1,1,0,1,1,1,1,0],
        [1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,0,1,1,1],
        [1,1,1,0,1,1,1,0,1,1,1]
      ]
    },
    {
      "id": "11c",
      "grid": [
        [1,1,1,1,1,0,1,1,1,1,1],
        [1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,0,1,1,1],
        [1,1,0,1,1,1,0,1,1,0,1],
        [1,1,1,1,0,1,1,1,1,1,1],
        [0,1,1,0,1,1,1,0,1,1,0],
        [1,1,1,1,1,1,0,1,1,1,1],
        [1,0,1,1,0,1,1,1,0,1,1],
        [1,1,1,0,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,1,1],
        [1,1,1,1,1,0,1,1,1,1,1]
      ]
    }
  ]
}
```

- [ ] **Step 2: Create word list with clues**

Create `apps/cipher-room/data/words.json`. Each entry has a word and an array of clues with type identifiers. Include words of lengths 3–11 to fill both grid sizes. Start with ~100 words.

```json
[
  {
    "word": "ACE",
    "clues": [
      {"type": "absurd", "text": "what every pilot calls themselves after landing once"},
      {"type": "emoji", "text": "🃏⭐"},
      {"type": "fill", "text": "you're an ___ at this (probably)"}
    ]
  },
  {
    "word": "APE",
    "clues": [
      {"type": "absurd", "text": "your uncle at thanksgiving, behavior-wise"},
      {"type": "emoji", "text": "🐒"},
      {"type": "fill", "text": "to go absolutely ___ over something"}
    ]
  },
  {
    "word": "ARC",
    "clues": [
      {"type": "absurd", "text": "what a rainbow does when it's showing off"},
      {"type": "fill", "text": "character development, in screenwriter speak"}
    ]
  },
  {
    "word": "BAT",
    "clues": [
      {"type": "absurd", "text": "sky puppy"},
      {"type": "emoji", "text": "🦇"},
      {"type": "fill", "text": "didn't even ___ an eye"}
    ]
  },
  {
    "word": "BIG",
    "clues": [
      {"type": "absurd", "text": "the Tom Hanks movie where adulting is the horror"},
      {"type": "fill", "text": "go ___ or go home"}
    ]
  },
  {
    "word": "BUS",
    "clues": [
      {"type": "absurd", "text": "a sardine can with wheels and existential dread"},
      {"type": "emoji", "text": "🚌"}
    ]
  },
  {
    "word": "CAT",
    "clues": [
      {"type": "absurd", "text": "a tiny dictator who lives in your house rent-free"},
      {"type": "emoji", "text": "🐱"},
      {"type": "fill", "text": "let the ___ out of the bag"}
    ]
  },
  {
    "word": "CUP",
    "clues": [
      {"type": "absurd", "text": "a bowl that got a handle and an attitude"},
      {"type": "emoji", "text": "☕"}
    ]
  },
  {
    "word": "DIG",
    "clues": [
      {"type": "absurd", "text": "what archaeologists do but make it sound impressive"},
      {"type": "fill", "text": "I ___ it, man"}
    ]
  },
  {
    "word": "DOG",
    "clues": [
      {"type": "absurd", "text": "the only creature genuinely happy to see you every single time"},
      {"type": "emoji", "text": "🐕"},
      {"type": "fill", "text": "every ___ has its day"}
    ]
  },
  {
    "word": "EAR",
    "clues": [
      {"type": "absurd", "text": "head handle (you have two)"},
      {"type": "emoji", "text": "👂"},
      {"type": "fill", "text": "playing it by ___"}
    ]
  },
  {
    "word": "EGG",
    "clues": [
      {"type": "absurd", "text": "a breakfast grenade that chickens make"},
      {"type": "emoji", "text": "🥚"}
    ]
  },
  {
    "word": "FIG",
    "clues": [
      {"type": "absurd", "text": "nature's pop-tart, if pop-tarts were honest"},
      {"type": "fill", "text": "___ newton (the cookie, not the scientist)"}
    ]
  },
  {
    "word": "FOG",
    "clues": [
      {"type": "absurd", "text": "a cloud having a midlife crisis at ground level"},
      {"type": "emoji", "text": "🌫️"}
    ]
  },
  {
    "word": "GUM",
    "clues": [
      {"type": "absurd", "text": "socially acceptable way to chew on nothing"},
      {"type": "fill", "text": "stuck like ___ on a shoe"}
    ]
  },
  {
    "word": "HAM",
    "clues": [
      {"type": "absurd", "text": "a pig's final career move"},
      {"type": "fill", "text": "to ___ it up on stage"}
    ]
  },
  {
    "word": "HUB",
    "clues": [
      {"type": "absurd", "text": "the center of everything, or at least it thinks so"},
      {"type": "fill", "text": "the ___ of the operation"}
    ]
  },
  {
    "word": "ICE",
    "clues": [
      {"type": "absurd", "text": "water's glow-up phase"},
      {"type": "emoji", "text": "🧊"},
      {"type": "fill", "text": "break the ___"}
    ]
  },
  {
    "word": "INK",
    "clues": [
      {"type": "absurd", "text": "squid defense mechanism / printer hostage situation"},
      {"type": "emoji", "text": "🖋️🦑"}
    ]
  },
  {
    "word": "JAM",
    "clues": [
      {"type": "absurd", "text": "fruit's afterlife, or what happens on the freeway"},
      {"type": "emoji", "text": "🍓🫙"},
      {"type": "fill", "text": "we're in a real ___ now"}
    ]
  },
  {
    "word": "JET",
    "clues": [
      {"type": "absurd", "text": "a metal tube that somehow flies and costs $12 for a coke"},
      {"type": "emoji", "text": "✈️"}
    ]
  },
  {
    "word": "KEY",
    "clues": [
      {"type": "absurd", "text": "the one thing you always lose right before you leave"},
      {"type": "emoji", "text": "🔑"},
      {"type": "fill", "text": "___ to the city"}
    ]
  },
  {
    "word": "LOG",
    "clues": [
      {"type": "absurd", "text": "a tree's corpse or your captain's diary"},
      {"type": "fill", "text": "sleeping like a ___"}
    ]
  },
  {
    "word": "MAP",
    "clues": [
      {"type": "absurd", "text": "a paper GPS for boomers"},
      {"type": "emoji", "text": "🗺️"}
    ]
  },
  {
    "word": "MOP",
    "clues": [
      {"type": "absurd", "text": "a stick with hair that cleans floors (relatable)"},
      {"type": "fill", "text": "___ the floor with someone"}
    ]
  },
  {
    "word": "NUT",
    "clues": [
      {"type": "absurd", "text": "squirrel currency"},
      {"type": "emoji", "text": "🥜🐿️"},
      {"type": "fill", "text": "a tough ___ to crack"}
    ]
  },
  {
    "word": "OAK",
    "clues": [
      {"type": "absurd", "text": "a tree that takes 100 years to grow so your grandkids can have a tire swing"},
      {"type": "emoji", "text": "🌳💪"}
    ]
  },
  {
    "word": "OWL",
    "clues": [
      {"type": "absurd", "text": "nocturnal judgmental bird"},
      {"type": "emoji", "text": "🦉"},
      {"type": "fill", "text": "night ___"}
    ]
  },
  {
    "word": "PEN",
    "clues": [
      {"type": "absurd", "text": "the sword's nerdy sibling (mightier, allegedly)"},
      {"type": "emoji", "text": "🖊️"}
    ]
  },
  {
    "word": "PIE",
    "clues": [
      {"type": "absurd", "text": "math's favorite dessert (3.14159...)"},
      {"type": "emoji", "text": "🥧"},
      {"type": "fill", "text": "easy as ___"}
    ]
  },
  {
    "word": "RUG",
    "clues": [
      {"type": "absurd", "text": "floor blanket that ties the room together"},
      {"type": "fill", "text": "swept it under the ___"}
    ]
  },
  {
    "word": "RUN",
    "clues": [
      {"type": "absurd", "text": "voluntary cardio (suspicious behavior)"},
      {"type": "emoji", "text": "🏃"},
      {"type": "fill", "text": "hit the ground ___ning"}
    ]
  },
  {
    "word": "SPY",
    "clues": [
      {"type": "absurd", "text": "someone whose LinkedIn is definitely lying"},
      {"type": "emoji", "text": "🕵️"},
      {"type": "fill", "text": "I ___ with my little eye"}
    ]
  },
  {
    "word": "SUN",
    "clues": [
      {"type": "absurd", "text": "giant angry star that gives you freckles"},
      {"type": "emoji", "text": "☀️"}
    ]
  },
  {
    "word": "TAP",
    "clues": [
      {"type": "absurd", "text": "the lightest assault you can commit"},
      {"type": "fill", "text": "___ water (the house wine of beverages)"}
    ]
  },
  {
    "word": "VAN",
    "clues": [
      {"type": "absurd", "text": "a car that gave up on being cool and embraced cargo space"},
      {"type": "emoji", "text": "🚐"}
    ]
  },
  {
    "word": "WEB",
    "clues": [
      {"type": "absurd", "text": "spider's art project / the reason you're reading this"},
      {"type": "emoji", "text": "🕸️"}
    ]
  },
  {
    "word": "ZAP",
    "clues": [
      {"type": "absurd", "text": "what static electricity does when you touch a doorknob in winter"},
      {"type": "emoji", "text": "⚡"}
    ]
  },
  {
    "word": "CAKE",
    "clues": [
      {"type": "absurd", "text": "edible architecture that people set on fire at parties"},
      {"type": "emoji", "text": "🎂"},
      {"type": "fill", "text": "piece of ___"}
    ]
  },
  {
    "word": "CLAM",
    "clues": [
      {"type": "absurd", "text": "ocean rock that's actually alive (surprise)"},
      {"type": "fill", "text": "happy as a ___"}
    ]
  },
  {
    "word": "CODE",
    "clues": [
      {"type": "absurd", "text": "instructions for computers written by people who forgot to eat lunch"},
      {"type": "emoji", "text": "💻🔐"}
    ]
  },
  {
    "word": "DUCK",
    "clues": [
      {"type": "absurd", "text": "a bird that's also a verb for cowardice"},
      {"type": "emoji", "text": "🦆"},
      {"type": "fill", "text": "sitting ___"}
    ]
  },
  {
    "word": "FROG",
    "clues": [
      {"type": "absurd", "text": "a prince with commitment issues"},
      {"type": "emoji", "text": "🐸"},
      {"type": "fill", "text": "___ in your throat"}
    ]
  },
  {
    "word": "GATE",
    "clues": [
      {"type": "absurd", "text": "a door's outdoor cousin / suffix for any scandal"},
      {"type": "fill", "text": "___keeping (the internet's favorite hobby)"}
    ]
  },
  {
    "word": "HERO",
    "clues": [
      {"type": "absurd", "text": "a sandwich in New York, a person everywhere else"},
      {"type": "emoji", "text": "🦸"},
      {"type": "fill", "text": "___ of the story"}
    ]
  },
  {
    "word": "JAZZ",
    "clues": [
      {"type": "absurd", "text": "music where the wrong notes are a feature, not a bug"},
      {"type": "emoji", "text": "🎷"},
      {"type": "fill", "text": "and all that ___"}
    ]
  },
  {
    "word": "KING",
    "clues": [
      {"type": "absurd", "text": "the chess piece that everyone else dies to protect"},
      {"type": "emoji", "text": "👑♟️"}
    ]
  },
  {
    "word": "LAMP",
    "clues": [
      {"type": "absurd", "text": "furniture that moths would die for (literally)"},
      {"type": "emoji", "text": "💡🪳"},
      {"type": "fill", "text": "I love ___ — Brick Tamland"}
    ]
  },
  {
    "word": "LAVA",
    "clues": [
      {"type": "absurd", "text": "spicy earth juice"},
      {"type": "emoji", "text": "🌋🔥"},
      {"type": "fill", "text": "the floor is ___"}
    ]
  },
  {
    "word": "MAZE",
    "clues": [
      {"type": "absurd", "text": "a hallway designed by someone who hates you"},
      {"type": "emoji", "text": "🏗️❓"}
    ]
  },
  {
    "word": "MOON",
    "clues": [
      {"type": "absurd", "text": "earth's clingy roommate that controls the ocean"},
      {"type": "emoji", "text": "🌙"}
    ]
  },
  {
    "word": "NERD",
    "clues": [
      {"type": "absurd", "text": "someone who knows too much about one thing (you, reading this)"},
      {"type": "emoji", "text": "🤓"},
      {"type": "fill", "text": "___ed out about it"}
    ]
  },
  {
    "word": "ORCA",
    "clues": [
      {"type": "absurd", "text": "a dolphin that chose violence and a tuxedo"},
      {"type": "emoji", "text": "🐋⬛⬜"}
    ]
  },
  {
    "word": "PLUM",
    "clues": [
      {"type": "absurd", "text": "a grape that hit the gym"},
      {"type": "fill", "text": "professor ___, in the library, with the candlestick"}
    ]
  },
  {
    "word": "QUIZ",
    "clues": [
      {"type": "absurd", "text": "a test that's trying to sound more fun than it is"},
      {"type": "emoji", "text": "❓📝"}
    ]
  },
  {
    "word": "REEF",
    "clues": [
      {"type": "absurd", "text": "underwater city where the rent is paid in algae"},
      {"type": "emoji", "text": "🐠🪸"}
    ]
  },
  {
    "word": "SAFE",
    "clues": [
      {"type": "absurd", "text": "a box that keeps your stuff from everyone including you when you forget the combo"},
      {"type": "emoji", "text": "🔒📦"}
    ]
  },
  {
    "word": "TACO",
    "clues": [
      {"type": "absurd", "text": "a food delivery system that self-destructs after one bite"},
      {"type": "emoji", "text": "🌮"},
      {"type": "fill", "text": "let's ___ 'bout it"}
    ]
  },
  {
    "word": "WAND",
    "clues": [
      {"type": "absurd", "text": "a stick with a college degree in magic"},
      {"type": "emoji", "text": "🪄✨"}
    ]
  },
  {
    "word": "YOGA",
    "clues": [
      {"type": "absurd", "text": "paying money to breathe and hurt in a warm room"},
      {"type": "emoji", "text": "🧘"},
      {"type": "fill", "text": "namaste in bed, thanks to ___"}
    ]
  },
  {
    "word": "ZERO",
    "clues": [
      {"type": "absurd", "text": "nothing, but make it mathematical"},
      {"type": "emoji", "text": "0️⃣🕳️"},
      {"type": "fill", "text": "ground ___"}
    ]
  },
  {
    "word": "TOAST",
    "clues": [
      {"type": "absurd", "text": "bread's final form"},
      {"type": "emoji", "text": "🍞🔥"},
      {"type": "fill", "text": "raise a ___ to the happy couple"}
    ]
  },
  {
    "word": "PIANO",
    "clues": [
      {"type": "absurd", "text": "furniture that screams when you touch it"},
      {"type": "emoji", "text": "🎹"}
    ]
  },
  {
    "word": "LLAMA",
    "clues": [
      {"type": "absurd", "text": "a camel that moved to south america and got bangs"},
      {"type": "emoji", "text": "🦙"}
    ]
  },
  {
    "word": "NINJA",
    "clues": [
      {"type": "absurd", "text": "someone whose whole job is not being seen (worst influencer ever)"},
      {"type": "emoji", "text": "🥷"}
    ]
  },
  {
    "word": "ROBOT",
    "clues": [
      {"type": "absurd", "text": "a machine that does your job but doesn't complain about Mondays"},
      {"type": "emoji", "text": "🤖"}
    ]
  },
  {
    "word": "GRAVY",
    "clues": [
      {"type": "absurd", "text": "meat tea"},
      {"type": "fill", "text": "it's all ___ from here"}
    ]
  },
  {
    "word": "KAZOO",
    "clues": [
      {"type": "absurd", "text": "an instrument that validates humming as a musical skill"},
      {"type": "emoji", "text": "🎶😤"}
    ]
  },
  {
    "word": "SNORE",
    "clues": [
      {"type": "absurd", "text": "your body's white noise machine (involuntary, annoying)"},
      {"type": "fill", "text": "what a ___! (it was actually very boring)"}
    ]
  },
  {
    "word": "MANGO",
    "clues": [
      {"type": "absurd", "text": "a fruit that requires an engineering degree to cut"},
      {"type": "emoji", "text": "🥭"}
    ]
  },
  {
    "word": "ZEBRA",
    "clues": [
      {"type": "absurd", "text": "a horse that committed to a black and white aesthetic"},
      {"type": "emoji", "text": "🦓"}
    ]
  },
  {
    "word": "BRICK",
    "clues": [
      {"type": "absurd", "text": "a rectangle with anger issues used to build houses"},
      {"type": "emoji", "text": "🧱"}
    ]
  },
  {
    "word": "GHOST",
    "clues": [
      {"type": "absurd", "text": "what happens when someone stops texting back"},
      {"type": "emoji", "text": "👻"},
      {"type": "fill", "text": "you look like you've seen a ___"}
    ]
  },
  {
    "word": "PLANT",
    "clues": [
      {"type": "absurd", "text": "a pet that dies silently and judges your watering schedule"},
      {"type": "emoji", "text": "🌱"},
      {"type": "fill", "text": "___ the seed of doubt"}
    ]
  },
  {
    "word": "WHALE",
    "clues": [
      {"type": "absurd", "text": "the ocean's largest mammal, or a casino's favorite customer"},
      {"type": "emoji", "text": "🐋"}
    ]
  },
  {
    "word": "BANANA",
    "clues": [
      {"type": "absurd", "text": "nature's pre-wrapped snack with a built-in comedy prop"},
      {"type": "emoji", "text": "🍌"},
      {"type": "fill", "text": "this situation has gone ___s"}
    ]
  },
  {
    "word": "CACTUS",
    "clues": [
      {"type": "absurd", "text": "the only houseplant that fights back when you try to hug it"},
      {"type": "emoji", "text": "🌵"}
    ]
  },
  {
    "word": "DONKEY",
    "clues": [
      {"type": "absurd", "text": "a horse that gave up on corporate and went freelance"},
      {"type": "emoji", "text": "🫏"}
    ]
  },
  {
    "word": "NAPKIN",
    "clues": [
      {"type": "absurd", "text": "a tiny blanket for your lap that absorbs regret"},
      {"type": "fill", "text": "back-of-the-___ math"}
    ]
  },
  {
    "word": "PICKLE",
    "clues": [
      {"type": "absurd", "text": "a cucumber that went through some things"},
      {"type": "emoji", "text": "🥒🧪"},
      {"type": "fill", "text": "in a bit of a ___"}
    ]
  },
  {
    "word": "PIRATE",
    "clues": [
      {"type": "absurd", "text": "a sailor with terrible eye health and great branding"},
      {"type": "emoji", "text": "🏴‍☠️"}
    ]
  },
  {
    "word": "ROCKET",
    "clues": [
      {"type": "absurd", "text": "a very expensive bottle rocket that occasionally puts people in space"},
      {"type": "emoji", "text": "🚀"}
    ]
  },
  {
    "word": "WAFFLE",
    "clues": [
      {"type": "absurd", "text": "a pancake with abs"},
      {"type": "emoji", "text": "🧇"},
      {"type": "fill", "text": "stop ___ing and make a decision"}
    ]
  },
  {
    "word": "WALRUS",
    "clues": [
      {"type": "absurd", "text": "a mustache with a sea mammal attached"},
      {"type": "fill", "text": "I am the ___ — The Beatles"}
    ]
  },
  {
    "word": "ZOMBIE",
    "clues": [
      {"type": "absurd", "text": "you before coffee, but permanent"},
      {"type": "emoji", "text": "🧟"}
    ]
  },
  {
    "word": "BUFFALO",
    "clues": [
      {"type": "absurd", "text": "a word that can be a complete sentence if you say it eight times"},
      {"type": "emoji", "text": "🦬"},
      {"type": "fill", "text": "___ wings (the animal can't actually fly)"}
    ]
  },
  {
    "word": "CHIMNEY",
    "clues": [
      {"type": "absurd", "text": "Santa's preferred entrance (definitely not a fire hazard)"},
      {"type": "emoji", "text": "🏠🎅"}
    ]
  },
  {
    "word": "COCONUT",
    "clues": [
      {"type": "absurd", "text": "a fruit wearing a fur coat that contains its own water bottle"},
      {"type": "emoji", "text": "🥥"}
    ]
  },
  {
    "word": "MUSTARD",
    "clues": [
      {"type": "absurd", "text": "angry yellow paste made from tiny seeds with big ambitions"},
      {"type": "fill", "text": "colonel ___! in the conservatory!"}
    ]
  },
  {
    "word": "PANCAKE",
    "clues": [
      {"type": "absurd", "text": "flat cake that's socially acceptable for breakfast"},
      {"type": "emoji", "text": "🥞"}
    ]
  },
  {
    "word": "PENGUIN",
    "clues": [
      {"type": "absurd", "text": "a bird in a tuxedo that can't fly but can swim — mixed priorities"},
      {"type": "emoji", "text": "🐧"}
    ]
  },
  {
    "word": "PRETZEL",
    "clues": [
      {"type": "absurd", "text": "bread that does yoga"},
      {"type": "emoji", "text": "🥨"}
    ]
  },
  {
    "word": "SARDINE",
    "clues": [
      {"type": "absurd", "text": "tiny fish that comes in a metal coffin with friends"},
      {"type": "fill", "text": "packed in like ___s"}
    ]
  },
  {
    "word": "TORNADO",
    "clues": [
      {"type": "absurd", "text": "angry wind that takes your house to Oz"},
      {"type": "emoji", "text": "🌪️"}
    ]
  },
  {
    "word": "DINOSAUR",
    "clues": [
      {"type": "absurd", "text": "a very large lizard that had its subscription to existence canceled"},
      {"type": "emoji", "text": "🦕"},
      {"type": "fill", "text": "you're such a ___ (said to anyone over 40 using technology)"}
    ]
  },
  {
    "word": "KANGAROO",
    "clues": [
      {"type": "absurd", "text": "a deer with a pocket and anger management issues"},
      {"type": "emoji", "text": "🦘"}
    ]
  },
  {
    "word": "MUSHROOM",
    "clues": [
      {"type": "absurd", "text": "a fungus that convinced us to eat it by looking like a tiny umbrella"},
      {"type": "emoji", "text": "🍄"}
    ]
  },
  {
    "word": "SANDWICH",
    "clues": [
      {"type": "absurd", "text": "the food equivalent of a hug (bread on both sides)"},
      {"type": "emoji", "text": "🥪"}
    ]
  },
  {
    "word": "UMBRELLA",
    "clues": [
      {"type": "absurd", "text": "portable roof you'll definitely leave at the restaurant"},
      {"type": "emoji", "text": "☂️"}
    ]
  },
  {
    "word": "ALLIGATOR",
    "clues": [
      {"type": "absurd", "text": "a log that bites"},
      {"type": "emoji", "text": "🐊"},
      {"type": "fill", "text": "see you later, ___"}
    ]
  },
  {
    "word": "BOOMERANG",
    "clues": [
      {"type": "absurd", "text": "a stick with abandonment issues — always comes back"},
      {"type": "emoji", "text": "🪃"}
    ]
  },
  {
    "word": "PINEAPPLE",
    "clues": [
      {"type": "absurd", "text": "a fruit wearing medieval armor that starts pizza arguments"},
      {"type": "emoji", "text": "🍍🍕❓"}
    ]
  },
  {
    "word": "TRAMPOLINE",
    "clues": [
      {"type": "absurd", "text": "a circle of fabric that lets you briefly experience what birds feel"},
      {"type": "fill", "text": "the ___ park: where insurance premiums go to die"}
    ]
  },
  {
    "word": "CATERPILLAR",
    "clues": [
      {"type": "absurd", "text": "a worm in a sleeping bag waiting for its glow-up"},
      {"type": "emoji", "text": "🐛➡️🦋"}
    ]
  }
]
```

- [ ] **Step 3: Verify JSON files are valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/cipher-room/data/templates.json'))"
node -e "JSON.parse(require('fs').readFileSync('apps/cipher-room/data/words.json'))"
```

Both should exit with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/cipher-room/data/
git commit -m "feat: add cipher-room grid templates and word list with quirky clues"
```

---

## Task 4: PRNG + Crossword Generator

**Files:**
- Create: `apps/cipher-room/js/prng.js`
- Create: `apps/cipher-room/js/generator.js`

- [ ] **Step 1: Create deterministic PRNG**

Create `apps/cipher-room/js/prng.js`:

```javascript
/**
 * Mulberry32 — deterministic 32-bit PRNG.
 * Same seed always produces the same sequence.
 */
function createPRNG(seed) {
  let state = seed | 0;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a date string like "2026-04-04" to a numeric seed. */
function dateSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Shuffle array in place using the provided PRNG. */
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

- [ ] **Step 2: Create crossword generator**

Create `apps/cipher-room/js/generator.js`:

```javascript
/**
 * Crossword generator.
 * Uses a pre-made grid template + backtracking to fill words.
 *
 * Depends on: prng.js (createPRNG, dateSeed, shuffle)
 */

const CipherGenerator = (function () {
  let templates = null;
  let wordList = null;

  /** Load data files. Call once before generating. */
  async function loadData() {
    if (templates && wordList) return;
    const [tRes, wRes] = await Promise.all([
      fetch('/cipher-room/data/templates.json'),
      fetch('/cipher-room/data/words.json'),
    ]);
    templates = await tRes.json();
    wordList = await wRes.json();
  }

  /** Extract word slots from a template grid.
   *  Returns array of { row, col, direction, length, cells: [{r,c}...] } */
  function extractSlots(grid) {
    const size = grid.length;
    const slots = [];

    // Across slots
    for (let r = 0; r < size; r++) {
      let start = null;
      for (let c = 0; c <= size; c++) {
        const isWhite = c < size && grid[r][c] === 1;
        if (isWhite && start === null) start = c;
        if (!isWhite && start !== null) {
          const length = c - start;
          if (length >= 3) {
            const cells = [];
            for (let k = start; k < c; k++) cells.push({ r, c: k });
            slots.push({ row: r, col: start, direction: 'across', length, cells });
          }
          start = null;
        }
      }
    }

    // Down slots
    for (let c = 0; c < size; c++) {
      let start = null;
      for (let r = 0; r <= size; r++) {
        const isWhite = r < size && grid[r][c] === 1;
        if (isWhite && start === null) start = r;
        if (!isWhite && start !== null) {
          const length = r - start;
          if (length >= 3) {
            const cells = [];
            for (let k = start; k < r; k++) cells.push({ r: k, c });
            slots.push({ row: start, col: c, direction: 'down', length, cells });
          }
          start = null;
        }
      }
    }

    return slots;
  }

  /** Assign clue numbers. Returns map of "r,c" -> number. */
  function assignNumbers(slots) {
    const numbered = {};
    let num = 1;
    // Sort by position: top-to-bottom, left-to-right
    const starts = [];
    slots.forEach((s) => {
      const key = `${s.row},${s.col}`;
      if (!starts.find((x) => x.key === key)) {
        starts.push({ key, row: s.row, col: s.col });
      }
    });
    starts.sort((a, b) => a.row - b.row || a.col - b.col);
    starts.forEach((s) => {
      numbered[s.key] = num++;
    });
    return numbered;
  }

  /** Try to fill all slots with words using backtracking.
   *  Returns filled letter grid or null if impossible. */
  function fillGrid(templateGrid, slots, words, rng) {
    const size = templateGrid.length;
    const letterGrid = Array.from({ length: size }, () => Array(size).fill(null));
    const usedWords = new Set();

    // Sort slots: most constrained first (shortest slots first helps pruning)
    const sortedSlots = [...slots].sort((a, b) => a.length - b.length);

    // Group words by length
    const wordsByLength = {};
    words.forEach((w) => {
      const len = w.word.length;
      if (!wordsByLength[len]) wordsByLength[len] = [];
      wordsByLength[len].push(w);
    });

    function getCompatibleWords(slot) {
      const candidates = wordsByLength[slot.length] || [];
      return candidates.filter((w) => {
        if (usedWords.has(w.word)) return false;
        for (let i = 0; i < slot.cells.length; i++) {
          const { r, c } = slot.cells[i];
          if (letterGrid[r][c] !== null && letterGrid[r][c] !== w.word[i]) return false;
        }
        return true;
      });
    }

    function placeWord(slot, word) {
      const prev = [];
      for (let i = 0; i < slot.cells.length; i++) {
        const { r, c } = slot.cells[i];
        prev.push(letterGrid[r][c]);
        letterGrid[r][c] = word[i];
      }
      usedWords.add(word);
      return prev;
    }

    function removeWord(slot, word, prev) {
      for (let i = 0; i < slot.cells.length; i++) {
        const { r, c } = slot.cells[i];
        letterGrid[r][c] = prev[i];
      }
      usedWords.delete(word);
    }

    function solve(idx) {
      if (idx >= sortedSlots.length) return true;
      const slot = sortedSlots[idx];
      const candidates = shuffle(getCompatibleWords(slot), rng);
      for (const candidate of candidates) {
        const prev = placeWord(slot, candidate.word);
        if (solve(idx + 1)) return true;
        removeWord(slot, candidate.word, prev);
      }
      return false;
    }

    if (solve(0)) return letterGrid;
    return null;
  }

  /** Station names for dispatch flavor. */
  const STATIONS = [
    'Cairo', 'Berlin', 'Vienna', 'Istanbul', 'Lisbon', 'Tangier',
    'Casablanca', 'Zurich', 'Prague', 'Moscow', 'Havana', 'Manila',
    'Saigon', 'Bogota', 'Marrakech', 'Budapest', 'Stockholm', 'Oslo',
    'Athens', 'Nairobi', 'Lima', 'Santiago', 'Beirut', 'Tehran',
    'Bucharest', 'Helsinki', 'Reykjavik', 'Montevideo', 'Hanoi', 'Algiers',
  ];

  /** Reference date for dispatch numbering. */
  const EPOCH = new Date('2026-04-01');

  /**
   * Generate a puzzle for a given date and type.
   * @param {string} dateStr - e.g. "2026-04-04"
   * @param {string} type - "flash" (5x5) or "dossier" (11x11)
   * @returns {object} puzzle object
   */
  async function generate(dateStr, type) {
    await loadData();

    const size = type === 'flash' ? 5 : 11;
    const sizeKey = String(size);
    const seed = dateSeed(dateStr + ':' + type);
    const rng = createPRNG(seed);

    // Pick template
    const pool = templates[sizeKey];
    const template = pool[Math.floor(rng() * pool.length)];

    // Extract slots
    const slots = extractSlots(template.grid);

    // Filter words to appropriate lengths
    const maxLen = size;
    const relevantWords = wordList.filter((w) => w.word.length >= 3 && w.word.length <= maxLen);

    // Fill grid
    const letterGrid = fillGrid(template.grid, slots, relevantWords, rng);
    if (!letterGrid) {
      throw new Error('Failed to generate puzzle — not enough words to fill template');
    }

    // Assign numbers
    const numbers = assignNumbers(slots);

    // Build word entries with clues
    const words = slots.map((slot) => {
      const word = slot.cells.map(({ r, c }) => letterGrid[r][c]).join('');
      const entry = wordList.find((w) => w.word === word);
      const clue = entry.clues[Math.floor(rng() * entry.clues.length)];
      const num = numbers[`${slot.row},${slot.col}`];
      return { word, row: slot.row, col: slot.col, direction: slot.direction, number: num, clue, cells: slot.cells };
    });

    // Dispatch number (days since epoch)
    const puzzleDate = new Date(dateStr);
    const dispatchNum = Math.floor((puzzleDate - EPOCH) / 86400000) + 1;

    // Station name
    const station = STATIONS[Math.floor(rng() * STATIONS.length)];

    return {
      dateStr,
      type,
      size,
      dispatchNum,
      station,
      templateGrid: template.grid,
      letterGrid,
      numbers,
      words,
    };
  }

  return { loadData, generate };
})();
```

- [ ] **Step 3: Verify generator in browser console**

Open `play.html` in a browser. In the console:

```javascript
CipherGenerator.generate('2026-04-04', 'flash').then(p => {
  console.log('Puzzle:', p);
  console.log('Grid:', p.letterGrid.map(r => r.join('')).join('\n'));
  console.log('Words:', p.words.map(w => `${w.number}${w.direction[0].toUpperCase()}: ${w.word} — ${w.clue.text}`));
});
```

Verify: a valid 5x5 grid with real words appears. Run it again with the same date — should produce identical output. Run with a different date — should produce a different puzzle.

- [ ] **Step 4: Commit**

```bash
git add apps/cipher-room/js/prng.js apps/cipher-room/js/generator.js
git commit -m "feat: add crossword generator with seeded PRNG and backtracking fill"
```

---

## Task 5: Game UI — Grid Rendering + Clues

**Files:**
- Create: `apps/cipher-room/js/game.js`
- Modify: `apps/cipher-room/play.html`

- [ ] **Step 1: Update play.html structure**

Update the `<div id="app">` section in `apps/cipher-room/play.html`:

```html
<div id="app" class="page">
  <div class="dispatch-header">
    <div class="classification">TOP SECRET</div>
    <div class="stamp">DECODE</div>
    <h1 id="puzzle-title">FLASH CIPHER</h1>
    <div class="subtitle" id="puzzle-subtitle">DAILY DISPATCH — MINI</div>
    <div class="dispatch-info" id="dispatch-info">DISPATCH #001 — CAIRO STATION — 04 APR 2026</div>
  </div>

  <div class="op-clock">
    OP CLOCK<br>
    <span class="time" id="timer">00:00</span>
  </div>

  <div class="grid-container">
    <div id="grid" class="grid"></div>
    <input type="text" id="hidden-input" class="hidden-input" autocomplete="off" autocapitalize="characters" autocorrect="off">
  </div>

  <div class="progress-bar">
    <div class="label">DECRYPTION PROGRESS</div>
    <div class="progress-track">
      <div class="progress-fill" id="progress-fill"></div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="clues-section" id="clues-section"></div>
</div>

<div id="completion-overlay" class="completion-overlay" style="display:none;"></div>
```

- [ ] **Step 2: Create game.js with rendering and input**

Create `apps/cipher-room/js/game.js`:

```javascript
/**
 * Game logic — grid rendering, input handling, timer, completion.
 * Depends on: prng.js, generator.js, storage.js, share.js, supabase.js
 */

const CipherGame = (function () {
  let puzzle = null;
  let playerGrid = null; // 2D array of player-entered letters (null = empty)
  let activeRow = -1;
  let activeCol = -1;
  let direction = 'across'; // 'across' or 'down'
  let timerInterval = null;
  let startTime = null;
  let elapsedMs = 0;
  let completed = false;

  /** Format milliseconds as MM:SS */
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  /** Format a date as DD MMM YYYY */
  function formatDate(dateStr) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** Get puzzle type from URL params */
  function getPuzzleType() {
    const params = new URLSearchParams(window.location.search);
    return params.get('type') || 'flash';
  }

  /** Render the grid */
  function renderGrid() {
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    gridEl.className = `grid size-${puzzle.size}`;

    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (puzzle.templateGrid[r][c] === 0) {
          cell.classList.add('black');
          const redaction = document.createElement('div');
          redaction.className = 'redaction';
          cell.appendChild(redaction);
        } else {
          cell.classList.add('white');
          // Number
          const key = `${r},${c}`;
          if (puzzle.numbers[key]) {
            const num = document.createElement('span');
            num.className = 'number';
            num.textContent = puzzle.numbers[key];
            cell.appendChild(num);
          }
          // Letter
          if (playerGrid[r][c]) {
            cell.textContent = playerGrid[r][c];
            // Re-add number if it was overwritten by textContent
            if (puzzle.numbers[key]) {
              cell.textContent = '';
              const num = document.createElement('span');
              num.className = 'number';
              num.textContent = puzzle.numbers[key];
              cell.appendChild(num);
              const letter = document.createTextNode(playerGrid[r][c]);
              cell.appendChild(letter);
            }
          }

          cell.addEventListener('click', () => onCellClick(r, c));
        }

        gridEl.appendChild(cell);
      }
    }

    updateHighlights();
    updateProgress();
  }

  /** Render clues panel */
  function renderClues() {
    const section = document.getElementById('clues-section');
    const acrossWords = puzzle.words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number);
    const downWords = puzzle.words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number);

    let html = '';
    html += '<div class="clues-direction"><h3>→ Across Signals</h3>';
    acrossWords.forEach(w => {
      html += `<div class="clue" data-number="${w.number}" data-direction="across">`;
      html += `<span class="clue-num">${w.number}.</span> ${w.clue.text}`;
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="clues-direction"><h3>↓ Down Signals</h3>';
    downWords.forEach(w => {
      html += `<div class="clue" data-number="${w.number}" data-direction="down">`;
      html += `<span class="clue-num">${w.number}.</span> ${w.clue.text}`;
      html += '</div>';
    });
    html += '</div>';

    section.innerHTML = html;

    // Click handler on clues to jump to that word
    section.querySelectorAll('.clue').forEach(el => {
      el.addEventListener('click', () => {
        const num = parseInt(el.dataset.number);
        const dir = el.dataset.direction;
        const word = puzzle.words.find(w => w.number === num && w.direction === dir);
        if (word) {
          direction = dir;
          const firstEmpty = word.cells.find(({ r, c }) => !playerGrid[r][c]);
          if (firstEmpty) {
            activeRow = firstEmpty.r;
            activeCol = firstEmpty.c;
          } else {
            activeRow = word.cells[0].r;
            activeCol = word.cells[0].c;
          }
          renderGrid();
          renderClueHighlight();
          focusInput();
        }
      });
    });

    renderClueHighlight();
  }

  /** Highlight active clue in the clue list */
  function renderClueHighlight() {
    document.querySelectorAll('.clue').forEach(el => el.classList.remove('active-clue'));
    const activeWord = getActiveWord();
    if (activeWord) {
      const el = document.querySelector(`.clue[data-number="${activeWord.number}"][data-direction="${activeWord.direction}"]`);
      if (el) {
        el.classList.add('active-clue');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  /** Get the word object that contains the active cell in the current direction */
  function getActiveWord() {
    if (activeRow < 0 || activeCol < 0) return null;
    return puzzle.words.find(w =>
      w.direction === direction &&
      w.cells.some(({ r, c }) => r === activeRow && c === activeCol)
    );
  }

  /** Update cell highlights */
  function updateHighlights() {
    document.querySelectorAll('.cell.white').forEach(cell => {
      cell.classList.remove('active', 'word-highlight');
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);

      if (r === activeRow && c === activeCol) {
        cell.classList.add('active');
      } else {
        const activeWord = getActiveWord();
        if (activeWord && activeWord.cells.some(pos => pos.r === r && pos.c === c)) {
          cell.classList.add('word-highlight');
        }
      }
    });
  }

  /** Update progress bar */
  function updateProgress() {
    let filled = 0;
    let total = 0;
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.templateGrid[r][c] === 1) {
          total++;
          if (playerGrid[r][c]) filled++;
        }
      }
    }
    const pct = total > 0 ? (filled / total) * 100 : 0;
    document.getElementById('progress-fill').style.width = pct + '%';
  }

  /** Handle cell click */
  function onCellClick(r, c) {
    if (completed) return;
    if (r === activeRow && c === activeCol) {
      // Toggle direction on second click
      direction = direction === 'across' ? 'down' : 'across';
      // If no word in new direction, switch back
      if (!getActiveWord()) direction = direction === 'across' ? 'down' : 'across';
    } else {
      activeRow = r;
      activeCol = c;
      // If current direction has no word here, try the other
      if (!getActiveWord()) {
        direction = direction === 'across' ? 'down' : 'across';
      }
    }
    updateHighlights();
    renderClueHighlight();
    focusInput();
  }

  /** Focus the hidden input for keyboard capture */
  function focusInput() {
    const input = document.getElementById('hidden-input');
    input.focus();
  }

  /** Move to next cell in current direction */
  function advanceCursor() {
    const word = getActiveWord();
    if (!word) return;
    const idx = word.cells.findIndex(({ r, c }) => r === activeRow && c === activeCol);
    if (idx < word.cells.length - 1) {
      activeRow = word.cells[idx + 1].r;
      activeCol = word.cells[idx + 1].c;
    }
  }

  /** Move to previous cell in current direction */
  function retreatCursor() {
    const word = getActiveWord();
    if (!word) return;
    const idx = word.cells.findIndex(({ r, c }) => r === activeRow && c === activeCol);
    if (idx > 0) {
      activeRow = word.cells[idx - 1].r;
      activeCol = word.cells[idx - 1].c;
    }
  }

  /** Handle keyboard input */
  function onKeyDown(e) {
    if (completed) return;
    if (activeRow < 0 || activeCol < 0) return;

    const key = e.key;

    if (key === 'Backspace') {
      e.preventDefault();
      if (playerGrid[activeRow][activeCol]) {
        playerGrid[activeRow][activeCol] = null;
      } else {
        retreatCursor();
        playerGrid[activeRow][activeCol] = null;
      }
      renderGrid();
      renderClueHighlight();
      saveState();
      return;
    }

    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      e.preventDefault();
      moveArrow(key);
      updateHighlights();
      renderClueHighlight();
      return;
    }

    if (key === 'Tab') {
      e.preventDefault();
      moveToNextWord(e.shiftKey);
      updateHighlights();
      renderClueHighlight();
      return;
    }

    if (/^[a-zA-Z]$/.test(key)) {
      e.preventDefault();
      playerGrid[activeRow][activeCol] = key.toUpperCase();
      advanceCursor();
      renderGrid();
      renderClueHighlight();
      saveState();
      checkCompletion();
    }
  }

  /** Handle mobile input via the hidden input field */
  function onInput(e) {
    if (completed) return;
    const val = e.target.value;
    e.target.value = '';
    if (val && /[a-zA-Z]/.test(val)) {
      const letter = val.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
      if (letter) {
        playerGrid[activeRow][activeCol] = letter;
        advanceCursor();
        renderGrid();
        renderClueHighlight();
        saveState();
        checkCompletion();
      }
    }
  }

  /** Arrow key navigation */
  function moveArrow(key) {
    let r = activeRow;
    let c = activeCol;
    const dr = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    const dc = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;

    // Update direction to match arrow
    if (dc !== 0) direction = 'across';
    if (dr !== 0) direction = 'down';

    r += dr;
    c += dc;
    while (r >= 0 && r < puzzle.size && c >= 0 && c < puzzle.size) {
      if (puzzle.templateGrid[r][c] === 1) {
        activeRow = r;
        activeCol = c;
        if (!getActiveWord()) {
          direction = direction === 'across' ? 'down' : 'across';
        }
        return;
      }
      r += dr;
      c += dc;
    }
  }

  /** Tab to next/previous word */
  function moveToNextWord(reverse) {
    const allWords = [...puzzle.words].sort((a, b) => a.number - b.number || (a.direction === 'across' ? -1 : 1));
    const currentWord = getActiveWord();
    if (!currentWord) return;
    const idx = allWords.indexOf(currentWord);
    const nextIdx = reverse
      ? (idx - 1 + allWords.length) % allWords.length
      : (idx + 1) % allWords.length;
    const next = allWords[nextIdx];
    direction = next.direction;
    const firstEmpty = next.cells.find(({ r, c }) => !playerGrid[r][c]);
    if (firstEmpty) {
      activeRow = firstEmpty.r;
      activeCol = firstEmpty.c;
    } else {
      activeRow = next.cells[0].r;
      activeCol = next.cells[0].c;
    }
  }

  /** Save current state to localStorage */
  function saveState() {
    if (typeof CipherStorage !== 'undefined') {
      CipherStorage.saveGameState(puzzle.dateStr, puzzle.type, playerGrid, elapsedMs);
    }
  }

  /** Check if puzzle is complete and correct */
  function checkCompletion() {
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.templateGrid[r][c] === 1) {
          if (playerGrid[r][c] !== puzzle.letterGrid[r][c]) return;
        }
      }
    }
    onComplete();
  }

  /** Handle puzzle completion */
  function onComplete() {
    completed = true;
    clearInterval(timerInterval);
    const totalSeconds = Math.floor(elapsedMs / 1000);

    // Save completion
    if (typeof CipherStorage !== 'undefined') {
      CipherStorage.saveCompletion(puzzle.dateStr, puzzle.type, totalSeconds);
    }

    // Submit score to leaderboard
    if (typeof CipherSupabase !== 'undefined') {
      CipherSupabase.submitScore(puzzle.dateStr, puzzle.type, totalSeconds);
    }

    // Show completion overlay
    showCompletion(totalSeconds);
  }

  /** Show DISPATCH DECODED overlay */
  function showCompletion(totalSeconds) {
    const overlay = document.getElementById('completion-overlay');
    const timeStr = formatTime(totalSeconds * 1000);
    const bestTime = typeof CipherStorage !== 'undefined'
      ? CipherStorage.getBestTime(puzzle.type)
      : null;
    const isBest = bestTime !== null && totalSeconds <= bestTime;

    const typeName = puzzle.type === 'flash' ? 'FLASH CIPHER' : 'FULL DOSSIER';

    overlay.innerHTML = `
      <div class="completion-card">
        <div class="stamp-large">DISPATCH DECODED</div>
        <div class="time-label">OP TIME</div>
        <div class="time-result">${timeStr}</div>
        ${isBest ? '<div class="personal-best">NEW PERSONAL BEST</div>' : ''}
        <div id="leaderboard-container" class="leaderboard"></div>
        <div class="completion-actions">
          <button class="btn primary" onclick="CipherGame.copyShare()">COPY TRANSMISSION</button>
          <a href="/cipher-room" class="btn" style="text-decoration:none;text-align:center;">RETURN TO FIELD OFFICE</a>
        </div>
      </div>
    `;
    overlay.style.display = 'flex';

    // Load leaderboard
    if (typeof CipherSupabase !== 'undefined') {
      CipherSupabase.loadLeaderboard(puzzle.dateStr, puzzle.type, 'leaderboard-container');
    }
  }

  /** Copy share text */
  function copyShare() {
    if (typeof CipherShare !== 'undefined') {
      const totalSeconds = Math.floor(elapsedMs / 1000);
      CipherShare.copy(puzzle, totalSeconds);
    }
  }

  /** Start the timer */
  function startTimer() {
    startTime = Date.now() - elapsedMs;
    timerInterval = setInterval(() => {
      elapsedMs = Date.now() - startTime;
      document.getElementById('timer').textContent = formatTime(elapsedMs);
    }, 200);
  }

  /** Initialize the game */
  async function init() {
    const type = getPuzzleType();
    const today = new Date().toISOString().slice(0, 10);

    // Update header
    const typeName = type === 'flash' ? 'FLASH CIPHER' : 'FULL DOSSIER';
    const subtitleText = type === 'flash' ? 'DAILY DISPATCH — MINI' : 'DAILY DISPATCH — FULL';
    document.getElementById('puzzle-title').textContent = typeName;
    document.getElementById('puzzle-subtitle').textContent = subtitleText;

    // Generate puzzle
    puzzle = await CipherGenerator.generate(today, type);

    // Update dispatch info
    const dispatchNum = String(puzzle.dispatchNum).padStart(3, '0');
    document.getElementById('dispatch-info').textContent =
      `DISPATCH #${dispatchNum} — ${puzzle.station.toUpperCase()} STATION — ${formatDate(today)}`;

    // Load saved state or create fresh grid
    const saved = typeof CipherStorage !== 'undefined'
      ? CipherStorage.loadGameState(today, type)
      : null;

    if (saved) {
      playerGrid = saved.grid;
      elapsedMs = saved.elapsedMs || 0;
    } else {
      playerGrid = Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(null));
      elapsedMs = 0;
    }

    // Check if already completed
    if (typeof CipherStorage !== 'undefined' && CipherStorage.isCompleted(today, type)) {
      // Show completed state — fill in the correct answers
      playerGrid = puzzle.letterGrid.map(row => [...row]);
      completed = true;
      renderGrid();
      renderClues();
      document.getElementById('timer').textContent = formatTime(
        CipherStorage.getCompletionTime(today, type) * 1000
      );
      return;
    }

    renderGrid();
    renderClues();
    startTimer();

    // Set initial active cell to first white cell
    for (let r = 0; r < puzzle.size && activeRow < 0; r++) {
      for (let c = 0; c < puzzle.size && activeRow < 0; c++) {
        if (puzzle.templateGrid[r][c] === 1) {
          activeRow = r;
          activeCol = c;
        }
      }
    }
    updateHighlights();
    renderClueHighlight();

    // Input handlers
    const hiddenInput = document.getElementById('hidden-input');
    hiddenInput.addEventListener('keydown', onKeyDown);
    hiddenInput.addEventListener('input', onInput);

    // Focus input on grid container click
    document.querySelector('.grid-container').addEventListener('click', focusInput);

    // Initial focus
    focusInput();
  }

  return { init, copyShare };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', CipherGame.init);
```

- [ ] **Step 3: Verify grid renders and input works**

Open `play.html?type=flash` in a browser. Verify:
- Grid renders with manila cells and crosshatch black squares
- Clicking a cell highlights it
- Typing letters fills cells
- Arrow keys navigate
- Backspace deletes
- Tab moves to next word
- Clues panel shows with mixed-format clues
- Timer ticks
- Progress bar updates as you type

- [ ] **Step 4: Commit**

```bash
git add apps/cipher-room/js/game.js apps/cipher-room/play.html
git commit -m "feat: add cipher-room gameplay — grid rendering, input handling, timer, clues"
```

---

## Task 6: localStorage Module

**Files:**
- Create: `apps/cipher-room/js/storage.js`

- [ ] **Step 1: Create storage.js**

Create `apps/cipher-room/js/storage.js`:

```javascript
/**
 * localStorage helpers for The Cipher Room.
 * Stores: agent info, game state, completion history, stats.
 */

const CipherStorage = (function () {
  const PREFIX = 'cipher_room_';

  function get(key) {
    try {
      const val = localStorage.getItem(PREFIX + key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  function set(key, val) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
    } catch { /* quota exceeded — silent fail */ }
  }

  // --- Agent ---
  function getAgent() { return get('agent'); }
  function setAgent(agent) { set('agent', agent); }

  // --- Game State (in-progress) ---
  function gameStateKey(dateStr, type) { return `state_${dateStr}_${type}`; }

  function saveGameState(dateStr, type, grid, elapsedMs) {
    set(gameStateKey(dateStr, type), { grid, elapsedMs, savedAt: Date.now() });
  }

  function loadGameState(dateStr, type) {
    return get(gameStateKey(dateStr, type));
  }

  // --- Completions ---
  function getCompletions() { return get('completions') || []; }

  function saveCompletion(dateStr, type, timeSeconds) {
    const completions = getCompletions();
    // Don't duplicate
    if (completions.find(c => c.date === dateStr && c.type === type)) return;
    completions.push({ date: dateStr, type, timeSeconds, completedAt: Date.now() });
    set('completions', completions);
    // Clear in-progress state
    localStorage.removeItem(PREFIX + gameStateKey(dateStr, type));
  }

  function isCompleted(dateStr, type) {
    return getCompletions().some(c => c.date === dateStr && c.type === type);
  }

  function getCompletionTime(dateStr, type) {
    const c = getCompletions().find(c => c.date === dateStr && c.type === type);
    return c ? c.timeSeconds : null;
  }

  // --- Stats ---
  function getBestTime(type) {
    const completions = getCompletions().filter(c => c.type === type);
    if (completions.length === 0) return null;
    return Math.min(...completions.map(c => c.timeSeconds));
  }

  function getStreak() {
    const completions = getCompletions().sort((a, b) => b.date.localeCompare(a.date));
    if (completions.length === 0) return 0;

    // Count consecutive days with at least one completion
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = today;

    while (true) {
      const hasCompletion = completions.some(c => c.date === checkDate);
      if (!hasCompletion) {
        // Allow today to be incomplete (streak counts through yesterday)
        if (checkDate === today) {
          const d = new Date(checkDate);
          d.setDate(d.getDate() - 1);
          checkDate = d.toISOString().slice(0, 10);
          continue;
        }
        break;
      }
      streak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().slice(0, 10);
    }

    return streak;
  }

  function getTotalCompleted() {
    return getCompletions().length;
  }

  function getStats(type) {
    const completions = getCompletions().filter(c => c.type === type);
    return {
      total: completions.length,
      bestTime: completions.length > 0 ? Math.min(...completions.map(c => c.timeSeconds)) : null,
      avgTime: completions.length > 0 ? Math.round(completions.reduce((a, c) => a + c.timeSeconds, 0) / completions.length) : null,
    };
  }

  return {
    getAgent, setAgent,
    saveGameState, loadGameState,
    saveCompletion, isCompleted, getCompletionTime,
    getBestTime, getStreak, getTotalCompleted, getStats,
    getCompletions,
  };
})();
```

- [ ] **Step 2: Verify storage works**

In browser console, test:

```javascript
CipherStorage.setAgent({ id: 'test', codename: 'VIPER' });
console.log(CipherStorage.getAgent()); // { id: 'test', codename: 'VIPER' }
CipherStorage.saveCompletion('2026-04-04', 'flash', 120);
console.log(CipherStorage.isCompleted('2026-04-04', 'flash')); // true
console.log(CipherStorage.getBestTime('flash')); // 120
```

- [ ] **Step 3: Commit**

```bash
git add apps/cipher-room/js/storage.js
git commit -m "feat: add cipher-room localStorage module for game state and stats"
```

---

## Task 7: Share Text Builder

**Files:**
- Create: `apps/cipher-room/js/share.js`

- [ ] **Step 1: Create share.js**

Create `apps/cipher-room/js/share.js`:

```javascript
/**
 * Share text builder for The Cipher Room.
 */

const CipherShare = (function () {
  function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function copy(puzzle, timeSeconds) {
    const dispatchNum = String(puzzle.dispatchNum).padStart(3, '0');
    const typeName = puzzle.type === 'flash' ? 'FLASH CIPHER' : 'FULL DOSSIER';
    const timeStr = formatTime(timeSeconds);

    const text = [
      '═══════════════════════',
      '  TRANSMISSION — CIPHER ROOM',
      `  DISPATCH #${dispatchNum} — ${puzzle.station.toUpperCase()} STATION`,
      `  ${typeName} — DECODED`,
      `  OP TIME: ${timeStr}`,
      '  STATUS: ██████████ COMPLETE',
      '═══════════════════════',
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      // Brief visual feedback
      const btn = document.querySelector('.completion-actions .btn.primary');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'COPIED TO CLIPBOARD';
        setTimeout(() => { btn.textContent = original; }, 2000);
      }
    });
  }

  return { copy };
})();
```

- [ ] **Step 2: Commit**

```bash
git add apps/cipher-room/js/share.js
git commit -m "feat: add cipher-room share text builder"
```

---

## Task 8: Hub Page — Field Office

**Files:**
- Modify: `apps/cipher-room/index.html`

- [ ] **Step 1: Build the hub page**

Replace the content of `apps/cipher-room/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Cipher Room</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <a href="/" class="hub-link">← BECKNOLOGY</a>

  <!-- Registration overlay (shown if no agent in localStorage) -->
  <div id="registration" class="registration" style="display:none;">
    <div class="classification">AGENT REGISTRATION</div>
    <h2 style="margin-top:16px;">THE CIPHER ROOM</h2>
    <div class="subtitle" style="margin-bottom:24px;">ESTABLISH YOUR IDENTITY</div>

    <div id="reg-choice" class="reg-buttons">
      <button class="btn primary" onclick="CipherHub.showNewAgent()">NEW AGENT</button>
      <button class="btn" onclick="CipherHub.showReturning()">RETURNING AGENT</button>
    </div>

    <div id="reg-new" style="display:none;">
      <p style="font-size:11px;color:#c8b88860;margin-bottom:12px;">Choose a codename, Agent.</p>
      <input type="text" id="new-codename" class="input-field" placeholder="ENTER CODENAME" maxlength="20" autocomplete="off">
      <div id="new-error" class="error-msg" style="display:none;"></div>
      <button class="btn primary" onclick="CipherHub.registerNew()">REGISTER</button>
      <button class="btn" onclick="CipherHub.showChoice()" style="margin-top:8px;">BACK</button>
    </div>

    <div id="reg-returning" style="display:none;">
      <p style="font-size:11px;color:#c8b88860;margin-bottom:12px;">Enter your codename to resume your service record.</p>
      <input type="text" id="return-codename" class="input-field" placeholder="ENTER CODENAME" maxlength="20" autocomplete="off">
      <div id="return-error" class="error-msg" style="display:none;"></div>
      <button class="btn primary" onclick="CipherHub.loginReturning()">CONFIRM IDENTITY</button>
      <button class="btn" onclick="CipherHub.showChoice()" style="margin-top:8px;">BACK</button>
    </div>
  </div>

  <!-- Main hub content (shown after registration) -->
  <div id="hub" class="page" style="display:none;">
    <div class="dispatch-header">
      <div class="classification">TOP SECRET</div>
      <h1>THE CIPHER ROOM</h1>
      <div class="subtitle">FIELD OFFICE — <span id="agent-name">AGENT</span></div>
    </div>

    <div class="streak">
      <span class="count" id="streak-count">0</span>
      CONSECUTIVE DISPATCHES DECODED
    </div>

    <div class="divider"></div>

    <h2 style="text-align:center;margin-bottom:16px;font-size:10px;letter-spacing:3px;color:#c8b88850;">INCOMING DISPATCHES</h2>

    <div class="dispatches">
      <a href="/cipher-room/play.html?type=flash" class="dispatch-card" id="card-flash">
        <div class="card-title">FLASH CIPHER</div>
        <div class="card-subtitle">5×5 — QUICK DECODE</div>
        <div class="card-status pending" id="status-flash">PENDING</div>
      </a>
      <a href="/cipher-room/play.html?type=dossier" class="dispatch-card" id="card-dossier">
        <div class="card-title">FULL DOSSIER</div>
        <div class="card-subtitle">11×11 — DEEP COVER</div>
        <div class="card-status pending" id="status-dossier">PENDING</div>
      </a>
    </div>

    <div class="divider"></div>

    <!-- Service Record -->
    <div class="service-record">
      <h2 style="font-size:10px;letter-spacing:3px;color:#c8b88850;">SERVICE RECORD</h2>
      <div class="stat-grid">
        <div class="stat-item">
          <span class="stat-value" id="stat-total">0</span>
          <span class="stat-label">Decoded</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="stat-best-flash">--</span>
          <span class="stat-label">Best Flash</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="stat-best-dossier">--</span>
          <span class="stat-label">Best Dossier</span>
        </div>
      </div>
    </div>
  </div>

  <script src="js/storage.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="js/supabase.js"></script>
  <script>
    const CipherHub = (function () {
      const today = new Date().toISOString().slice(0, 10);

      function formatTime(seconds) {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${m}:${s}`;
      }

      function init() {
        const agent = CipherStorage.getAgent();
        if (agent) {
          showHub(agent);
        } else {
          document.getElementById('registration').style.display = 'block';
        }
      }

      function showChoice() {
        document.getElementById('reg-choice').style.display = 'flex';
        document.getElementById('reg-new').style.display = 'none';
        document.getElementById('reg-returning').style.display = 'none';
      }

      function showNewAgent() {
        document.getElementById('reg-choice').style.display = 'none';
        document.getElementById('reg-new').style.display = 'block';
        document.getElementById('new-codename').focus();
      }

      function showReturning() {
        document.getElementById('reg-choice').style.display = 'none';
        document.getElementById('reg-returning').style.display = 'block';
        document.getElementById('return-codename').focus();
      }

      async function registerNew() {
        const codename = document.getElementById('new-codename').value.trim();
        const errorEl = document.getElementById('new-error');
        errorEl.style.display = 'none';

        if (!codename) {
          errorEl.textContent = 'CODENAME REQUIRED';
          errorEl.style.display = 'block';
          return;
        }

        if (typeof CipherSupabase !== 'undefined') {
          const result = await CipherSupabase.createAgent(codename);
          if (result.error) {
            errorEl.textContent = result.error;
            errorEl.style.display = 'block';
            return;
          }
          CipherStorage.setAgent({ id: result.id, codename: result.codename });
        } else {
          // Fallback: no Supabase, local only
          CipherStorage.setAgent({ id: 'local-' + Date.now(), codename });
        }

        showHub(CipherStorage.getAgent());
      }

      async function loginReturning() {
        const codename = document.getElementById('return-codename').value.trim();
        const errorEl = document.getElementById('return-error');
        errorEl.style.display = 'none';

        if (!codename) {
          errorEl.textContent = 'CODENAME REQUIRED';
          errorEl.style.display = 'block';
          return;
        }

        if (typeof CipherSupabase !== 'undefined') {
          const result = await CipherSupabase.lookupAgent(codename);
          if (result.error) {
            errorEl.textContent = result.error;
            errorEl.style.display = 'block';
            return;
          }
          CipherStorage.setAgent({ id: result.id, codename: result.codename });
        } else {
          errorEl.textContent = 'SUPABASE UNAVAILABLE — CANNOT VERIFY IDENTITY';
          errorEl.style.display = 'block';
          return;
        }

        showHub(CipherStorage.getAgent());
      }

      function showHub(agent) {
        document.getElementById('registration').style.display = 'none';
        document.getElementById('hub').style.display = 'block';
        document.getElementById('agent-name').textContent = agent.codename.toUpperCase();

        // Update dispatch statuses
        updateStatus('flash');
        updateStatus('dossier');

        // Update stats
        document.getElementById('streak-count').textContent = CipherStorage.getStreak();
        document.getElementById('stat-total').textContent = CipherStorage.getTotalCompleted();

        const flashStats = CipherStorage.getStats('flash');
        const dossierStats = CipherStorage.getStats('dossier');
        document.getElementById('stat-best-flash').textContent =
          flashStats.bestTime !== null ? formatTime(flashStats.bestTime) : '--';
        document.getElementById('stat-best-dossier').textContent =
          dossierStats.bestTime !== null ? formatTime(dossierStats.bestTime) : '--';
      }

      function updateStatus(type) {
        const statusEl = document.getElementById(`status-${type}`);
        if (CipherStorage.isCompleted(today, type)) {
          const time = CipherStorage.getCompletionTime(today, type);
          statusEl.textContent = `DECODED — ${formatTime(time)}`;
          statusEl.className = 'card-status decoded';
        } else if (CipherStorage.loadGameState(today, type)) {
          statusEl.textContent = 'IN PROGRESS';
          statusEl.className = 'card-status in-progress';
        } else {
          statusEl.textContent = 'PENDING';
          statusEl.className = 'card-status pending';
        }
      }

      return { init, showChoice, showNewAgent, showReturning, registerNew, loginReturning };
    })();

    document.addEventListener('DOMContentLoaded', CipherHub.init);
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify hub page**

Open `/cipher-room` in a browser. Verify:
- Registration screen shows on first visit
- New Agent flow asks for codename
- After registration, hub shows with dispatch cards
- Status shows PENDING for today's puzzles
- Streak counter displays
- Cards link to play page

- [ ] **Step 3: Commit**

```bash
git add apps/cipher-room/index.html
git commit -m "feat: add cipher-room hub page with agent registration and dispatch cards"
```

---

## Task 9: Supabase Integration

**Files:**
- Create: `apps/cipher-room/js/supabase.js`

- [ ] **Step 1: Create Supabase module**

Check the existing Supabase credentials in `apps/runouts/src/App.jsx` (lines 7-12) and use the same project URL and anon key.

Create `apps/cipher-room/js/supabase.js`:

```javascript
/**
 * Supabase integration for The Cipher Room.
 * Handles agent registration, score submission, and leaderboard.
 *
 * Supabase tables required:
 *   cipher_room_agents: id (uuid), codename (text, unique), created_at (timestamptz)
 *   cipher_room_scores: id (uuid), agent_id (uuid FK), date (date), puzzle_type (text),
 *                       time_seconds (int), created_at (timestamptz)
 */

const CipherSupabase = (function () {
  // Replace with actual Supabase credentials (same project as runouts)
  const SUPABASE_URL = 'YOUR_SUPABASE_URL';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

  const client = (typeof supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL')
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /** Create a new agent. Returns { id, codename } or { error }. */
  async function createAgent(codename) {
    if (!client) return { error: 'SUPABASE UNAVAILABLE' };
    try {
      // Check if codename exists
      const { data: existing } = await client
        .from('cipher_room_agents')
        .select('id')
        .eq('codename', codename)
        .maybeSingle();

      if (existing) return { error: 'CODENAME ALREADY IN USE — PICK ANOTHER' };

      const { data, error } = await client
        .from('cipher_room_agents')
        .insert({ codename })
        .select('id, codename')
        .single();

      if (error) throw error;
      return { id: data.id, codename: data.codename };
    } catch (e) {
      console.error('Agent creation failed:', e);
      return { error: 'REGISTRATION FAILED — TRY AGAIN' };
    }
  }

  /** Look up an existing agent. Returns { id, codename } or { error }. */
  async function lookupAgent(codename) {
    if (!client) return { error: 'SUPABASE UNAVAILABLE' };
    try {
      const { data, error } = await client
        .from('cipher_room_agents')
        .select('id, codename')
        .eq('codename', codename)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { error: 'NO AGENT FOUND WITH THAT CODENAME' };
      return { id: data.id, codename: data.codename };
    } catch (e) {
      console.error('Agent lookup failed:', e);
      return { error: 'LOOKUP FAILED — TRY AGAIN' };
    }
  }

  /** Submit a score. */
  async function submitScore(dateStr, puzzleType, timeSeconds) {
    if (!client) return;
    const agent = typeof CipherStorage !== 'undefined' ? CipherStorage.getAgent() : null;
    if (!agent || !agent.id || agent.id.startsWith('local-')) return;

    try {
      // Check for duplicate
      const { data: existing } = await client
        .from('cipher_room_scores')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('date', dateStr)
        .eq('puzzle_type', puzzleType)
        .maybeSingle();

      if (existing) return; // Already submitted

      await client.from('cipher_room_scores').insert({
        agent_id: agent.id,
        date: dateStr,
        puzzle_type: puzzleType,
        time_seconds: timeSeconds,
      });
    } catch (e) {
      console.error('Score submission failed:', e);
    }
  }

  /** Load leaderboard and render into a container element. */
  async function loadLeaderboard(dateStr, puzzleType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!client) {
      container.innerHTML = '<p style="font-size:10px;color:#c8b88830;">FIELD RANKINGS UNAVAILABLE</p>';
      return;
    }

    try {
      const { data, error } = await client
        .from('cipher_room_scores')
        .select('time_seconds, agent_id, cipher_room_agents(codename)')
        .eq('date', dateStr)
        .eq('puzzle_type', puzzleType)
        .order('time_seconds', { ascending: true })
        .limit(10);

      if (error) throw error;

      const agent = typeof CipherStorage !== 'undefined' ? CipherStorage.getAgent() : null;

      let html = '<h3>FIELD RANKINGS</h3>';
      if (!data || data.length === 0) {
        html += '<p style="font-size:10px;color:#c8b88830;">NO RANKINGS YET — YOU\'RE THE FIRST</p>';
      } else {
        data.forEach((entry, i) => {
          const codename = entry.cipher_room_agents?.codename || 'UNKNOWN';
          const isYou = agent && entry.agent_id === agent.id;
          const m = String(Math.floor(entry.time_seconds / 60)).padStart(2, '0');
          const s = String(entry.time_seconds % 60).padStart(2, '0');
          html += `<div class="leaderboard-entry${isYou ? ' you' : ''}">`;
          html += `<span class="rank">${i + 1}.</span>`;
          html += `<span class="name">${codename}${isYou ? ' (YOU)' : ''}</span>`;
          html += `<span class="entry-time">${m}:${s}</span>`;
          html += '</div>';
        });
      }

      container.innerHTML = html;
    } catch (e) {
      console.error('Leaderboard load failed:', e);
      container.innerHTML = '<p style="font-size:10px;color:#c8b88830;">RANKINGS UNAVAILABLE</p>';
    }
  }

  return { createAgent, lookupAgent, submitScore, loadLeaderboard };
})();
```

- [ ] **Step 2: Add Supabase CDN to play.html**

Add this script tag to `play.html` before `supabase.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

- [ ] **Step 3: Create Supabase tables**

In the Supabase dashboard, create these tables:

**Table: `cipher_room_agents`**
- `id`: uuid, primary key, default `gen_random_uuid()`
- `codename`: text, unique, not null
- `created_at`: timestamptz, default `now()`

**Table: `cipher_room_scores`**
- `id`: uuid, primary key, default `gen_random_uuid()`
- `agent_id`: uuid, foreign key → `cipher_room_agents.id`, not null
- `date`: date, not null
- `puzzle_type`: text, not null
- `time_seconds`: integer, not null
- `created_at`: timestamptz, default `now()`

Enable RLS and add policies for public anon access (insert + select) on both tables — same pattern as the existing runouts setup.

- [ ] **Step 4: Update supabase.js with real credentials**

Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with the actual values from `apps/runouts/src/App.jsx`.

- [ ] **Step 5: Verify end-to-end**

1. Open `/cipher-room` — register a new agent
2. Play a flash cipher to completion
3. Verify score appears in Supabase dashboard
4. Verify leaderboard shows on completion screen
5. Clear localStorage, return as "Returning Agent" — verify your codename is found

- [ ] **Step 6: Commit**

```bash
git add apps/cipher-room/js/supabase.js apps/cipher-room/play.html
git commit -m "feat: add cipher-room Supabase integration — agents, scores, leaderboard"
```

---

## Task 10: Final Polish + Hub Card

**Files:**
- Modify: `apps/hub/index.html`
- Verify all pages work end-to-end

- [ ] **Step 1: Verify hub card was added in Task 1**

Open the becknology hub page and confirm the Cipher Room card appears with correct title, description, and link.

- [ ] **Step 2: Full end-to-end test**

Test the complete flow:
1. `/cipher-room` — register as new agent
2. Click Flash Cipher — solve the puzzle
3. Verify: timer works, progress bar updates, no error highlighting during play
4. Complete puzzle → DISPATCH DECODED stamp animation
5. Verify: time shown, leaderboard loads, share button copies text
6. Return to Field Office → Flash Cipher shows "DECODED"
7. Click Full Dossier — start and partially solve
8. Close tab, reopen → verify progress is restored
9. Check Service Record stats are correct
10. Clear localStorage → verify Returning Agent flow works

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A apps/cipher-room/
git commit -m "feat: cipher-room polish and final verification"
```

---

## Post-Implementation Notes

**Word list expansion:** The initial ~100 words should be expanded to 200-300 over time to prevent repetition in daily puzzles. Focus on words of lengths 3-7 for the 5x5 grid and 3-11 for the 11x11 grid.

**Grid template expansion:** Add more templates (target 10-15 per size) to increase puzzle variety. All templates must maintain 180° rotational symmetry, full connectivity, and minimum 3-letter words.

**Supabase RLS:** Ensure Row Level Security policies allow public anonymous read/write to both tables, matching the runouts app pattern.
