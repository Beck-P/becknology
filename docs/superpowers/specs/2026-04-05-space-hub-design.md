# Becknology Space Hub — Design Spec

## Overview

Replace the current card-grid hub with an immersive pixel-art space experience. Players pilot a ship, navigate a star map, travel to themed worlds, and discover apps by exploring pixel RPG overworlds. Progression (points, upgrades, stats) ties everything together across sessions via Supabase.

Built as a new app at `/bridge` alongside the existing hub. Swaps to root `/` once polished.

---

## Entry Flow

### 1. Starfield Intro
- Full-screen canvas starfield (particles drifting toward camera)
- **BECKNOLOGY** title fades in at top, large, pixel font
- "CLICK TO BEGIN" blinks at center of screen
- Click/tap anywhere advances to identity prompt

### 2. Pilot Identity
- Prompt: "Are you a new pilot or a returning pilot?"
- **New pilot:**
  - Enter a pilot name (must be unique — validated against Supabase)
  - Pick a suit color from ~6 preset palette swaps
  - Creates a record in Supabase with name, suit color, creation date, empty stats
- **Returning pilot:**
  - Enter pilot name
  - Query Supabase to confirm name exists
  - If not found, friendly error: "No pilot by that name. Try again or start fresh."
  - Load their saved data (stats, suit color, upgrades, visited worlds)
- **Identity caching:** After successful identification, store pilot name in localStorage. On next visit, skip the prompt entirely and load from Supabase automatically. Show a small "Not [name]? Switch pilot" link somewhere in the cockpit.

### 3. Cockpit
- Pixel art cockpit view — first-person, looking out a windshield at space
- Purple/black palette, chunky pixels, visible console panels
- Art approach: static pixel art PNG as the cockpit frame, layered over a canvas that renders the windshield view (animated stars, distant planets)
- Interactive hotspots on the console panels:
  - **Center screen** — Star map (primary interaction)
  - **Left panel** — Stats screen (Phase 3: games played, points earned, worlds visited)
  - **Right panel** — Upgrades panel (Phase 3: spend points on cosmetics)
  - **Small panel** — Settings (suit color, switch pilot, sound toggle when added)
- Phase 1 only needs the center screen (star map) functional. Other panels show "OFFLINE" or static displays until Phase 3.

### 4. Star Map
- Activated by clicking/tapping the cockpit center screen
- Canvas overlay showing a dark star field with planets/stations rendered as glowing nodes
- Each destination has a label and subtle glow
- **Interaction:** Click/tap a planet to select it
- **Info panel:** On selection, a panel appears showing:
  - World name
  - Short flavor blurb (1-2 sentences)
  - List of apps/activities available there
  - "JUMP HERE" button
- Clicking "JUMP HERE" initiates the hyperspace transition
- Undiscovered/locked worlds: design decision for later (Phase 4). For now, all worlds are visible and accessible.

### 5. Hyperspace Jump
- 2-3 second transition animation
- Stars streak into horizontal lines, screen flashes white/purple, brief blackout
- Arrives at destination — transition to world overworld (or direct to app in Phase 1)

---

## Worlds

### Arcadia
- **Theme:** Retro arcade planet — neon signs, pixel arcade cabinets, game-hall atmosphere
- **Apps:** Runouts (+ future games: Snake, Reaction Tester, etc.)
- **Overworld vibe:** Neon-lit street or arcade interior. Character walks past cabinets and signs. Each app is a playable machine or doorway.
- **Easter egg ideas:** High score board on the wall, hidden back room, a broken cabinet that flickers

### Lumar
- **Theme:** Mysterious ocean world — moonlit shores, dark water, docks
- **Apps:** Aether Seas (hidden — see below)
- **Overworld vibe:** A coastal dock area. Waves, wooden piers, a lighthouse in the distance. Moody and atmospheric.
- **Aether Seas entrance:** A dock with a ship moored on an emerald sea. To board the ship and launch Aether Seas:
  1. Draw a heart shape (reusing the existing heart-detection logic)
  2. A terminal prompt appears asking for a password
  3. Correct password loads `/aether-seas`
- This makes Aether Seas a proper secret — you have to know it's there AND know the gestures to unlock it.

### The Singularity
- **Theme:** Black hole / cosmic anomaly — surreal void, gravitational distortion, fractals
- **Apps:** Genart
- **Overworld vibe:** Minimal, abstract. Maybe a single floating platform over a swirling void. Visual distortion effects (warping, color shifting). The genart app could be framed as "looking into the singularity."
- **Size:** Intentionally small — one screen. The void IS the experience.

### Enigma Station
- **Theme:** Abandoned deep-space intelligence outpost — flickering terminals, antenna arrays, corrupted data
- **Apps:** Cipher Room, Typist (+ future text/puzzle apps: Fortune Terminal, Word Clock)
- **Overworld vibe:** Metal corridors, blinking server racks, cracked viewports showing deep space. Each app is a different terminal or room in the station.
- **Cipher Room entrance:** A locked door with a keypad or puzzle hint
- **Typist entrance:** A comms terminal labeled "SIGNAL RELAY — DECODE INCOMING TRANSMISSIONS"

---

## World Engine (Technical)

### Tile System
- Tile-based 2D renderer using canvas
- Tiles are 16x16 pixels (rendered at 2x or 3x scale depending on screen)
- Each world is defined as a JSON object:
  ```
  {
    "name": "Arcadia",
    "width": 40,
    "height": 30,
    "tiles": [[...]], // 2D array of tile IDs
    "collisions": [[...]], // matching 2D array, 1 = solid
    "spawns": { "player": [x, y] },
    "interactions": [
      { "x": 12, "y": 8, "type": "app", "target": "/runouts", "label": "Runouts" },
      { "x": 20, "y": 15, "type": "npc", "dialog": "Welcome to Arcadia!" },
      { "x": 5, "y": 22, "type": "easter_egg", "action": "..." }
    ],
    "tileset": "arcadia" // which sprite sheet to use
  }
  ```
- Adding a new world = adding a new JSON object + a tileset sprite sheet

### Camera
- Camera follows the player character, centered
- Smooth scrolling (lerp toward player position)
- Clamped to map edges (no rendering outside the map)
- Single-screen maps (like The Singularity) have a fixed camera

### Character
- 16x16 base sprite with 4-direction walk animation (2-3 frames per direction)
- Palette swap via canvas pixel manipulation at load time based on chosen suit color
- ~6 color presets: purple, cyan, red, green, gold, white
- Sprite rendered at same scale as tiles

### Controls
- **Desktop:** WASD or arrow keys for movement. Enter/Space to interact.
- **Mobile:** Virtual d-pad overlay (bottom-left of screen). Interaction button (bottom-right). Semi-transparent, thumb-friendly sizing.
- Interaction triggered when facing an interactive tile and pressing the action key/button
- Interaction prompt appears above interactive objects when player is adjacent ("Press [E] to enter")

### State Management
- App-level state machine: `intro → identity → cockpit → starmap → travel → world → app`
- Current state persisted to localStorage (current world, player position, facing direction)
- Navigating to an app = full page navigation to the app's URL
- Returning to `/bridge` reads localStorage and drops player back in the world at their saved position
- Each app gets a subtle "← Return to Bridge" link (small, top-left corner, doesn't disrupt the app's design)

---

## Supabase Schema

### `pilots` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, auto-generated |
| name | text | Unique, the pilot's chosen callsign |
| suit_color | text | Palette preset name (e.g., "purple", "cyan") |
| created_at | timestamp | Auto-set |
| last_seen | timestamp | Updated on each session |

### `pilot_stats` table
| Column | Type | Notes |
|---|---|---|
| pilot_id | uuid | FK to pilots |
| stat_key | text | e.g., "games_played", "runouts_wins", "typist_best_wpm" |
| stat_value | numeric | The value |
| updated_at | timestamp | Last updated |

### `pilot_upgrades` table (Phase 3)
| Column | Type | Notes |
|---|---|---|
| pilot_id | uuid | FK to pilots |
| upgrade_key | text | e.g., "ship_color", "character_hat" |
| upgrade_value | text | The unlocked item |
| unlocked_at | timestamp | When earned |

Points are stored as a stat (`stat_key = "points"`). Spending points inserts into upgrades and decrements the points stat.

---

## Progression System (Phase 3)

### Earning Points
- Completing a game awards points (e.g., finishing a Runouts round)
- Performance bonuses (high WPM in Typist, solving Cipher Room fast)
- Exploration rewards (visiting a new world for the first time, finding an easter egg)
- Exact values TBD — design in Phase 3

### Spending Points
- Primarily cosmetics: ship colors, character outfits, cockpit decorations
- Potentially: unlock hidden areas within worlds, unlock new star map destinations
- Exact catalog TBD — design in Phase 3

### Stats Screen (Cockpit Left Panel)
- Total points earned / spent
- Games played (per app)
- Worlds visited
- Easter eggs found
- Best scores (per app where applicable)

---

## Art & Assets

### What Needs to Be Created
1. **Cockpit PNG** — The main cockpit frame. Pixel art, ~800x500 working resolution, purple/black palette. This is the most important single asset.
2. **Tilesets** — One per world theme. 16x16 tiles. ~20-30 unique tiles per world (ground variants, walls, decorations, interactive objects).
3. **Character sprite sheet** — 16x16, 4 directions x 3 frames = 12 frames. One base version, palette-swapped at runtime.
4. **Star map assets** — Planet icons (small, ~32x32 each), glow effects, connection lines. Minimal.
5. **UI elements** — D-pad overlay, interaction prompts, info panels, "JUMP HERE" button. Can be CSS-styled to match the pixel aesthetic.

### Art Approach
- Hand-drawn pixel art where possible (cockpit, character)
- Tilesets can be iterated — start simple, add detail over time
- All assets are PNGs loaded at runtime, no build step needed

---

## Phasing

### Phase 1 — The Shell
**Goal:** Starfield intro, pilot identity, cockpit, star map, hyperspace jump. Landing on a world navigates directly to the app (no overworld yet). For worlds with multiple apps (Enigma Station), show a simple selection screen.

**What ships:**
- Starfield intro with BECKNOLOGY title and "click to begin"
- New/returning pilot flow with Supabase
- Pixel art cockpit with star map on center screen
- Star map with 4 destinations (Arcadia, Lumar, The Singularity, Enigma Station)
- Hyperspace jump animation
- Landing = navigate to the app URL (or selection screen for multi-app worlds)
- "Return to Bridge" link in each app
- localStorage state persistence
- Virtual d-pad (rendered but not yet needed — no overworld to walk in yet)
- Deployed at `/bridge`

**Edge case — Lumar:** Aether Seas is hidden behind heart + password, so Lumar has no "obvious" app. In Phase 1, Lumar either doesn't appear on the star map yet (reveal it in Phase 3 when overworlds make the secret entrance possible), or it appears as a mysterious destination that just shows a moody landing scene with no clear purpose — rewarding curious players who figure out the heart gesture. Recommend: hide Lumar until Phase 3.

**What it feels like:** Already way cooler than a card grid. The full space navigation experience minus the on-foot exploration.

### Phase 2 — First World (Arcadia)
**Goal:** Prove out the tile engine and overworld system with one complete world.

**What ships:**
- Tile renderer with scrolling camera
- Character sprite with walk animation and palette swap
- Arcadia world: tileset, map layout, Runouts as an interactive location
- WASD/arrow controls + virtual d-pad on mobile
- Interaction system (walk up to cabinet, press Enter, load app)
- A few easter eggs and environmental details
- The template for all future worlds

### Phase 3 — All Worlds + Progression
**What ships:**
- Remaining worlds get overworlds (Lumar, The Singularity, Enigma Station)
- Aether Seas heart + password entrance on Lumar
- Points system: earning from games, storing in Supabase
- Stats screen on cockpit left panel
- Upgrades panel on cockpit right panel (initial cosmetic catalog)
- Settings panel (switch pilot, change suit color)

### Phase 4 — Expand
**What ships:**
- Character editor (mix-and-match parts, not just palette swaps)
- New apps added to existing worlds
- New worlds for new app clusters
- Richer easter eggs, NPCs with dialog
- Locked areas requiring upgrades/points to access
- Leaderboards (if desired)
- Swap `/bridge` to root `/`, retire old hub
- Sound design (cockpit hum, hyperspace, ambient world audio)

---

## Constraints & Decisions

- **Static HTML/CSS/JS only.** No build step, no framework. CDN imports for Supabase client.
- **Single canvas** manages all visual states (intro, cockpit, star map, travel, overworld). Different render modes, same element.
- **Apps are unchanged.** The bridge is a navigation layer. Apps stay as independent static pages at their existing URLs.
- **World-to-world travel always goes through the cockpit.** Leave world → cockpit → star map → new world.
- **All pilot data in Supabase.** localStorage is only for identity cache and current session state (world, position).
- **No sound in Phase 1-2.** Noted for Phase 4.
