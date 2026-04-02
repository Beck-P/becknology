Read `.claude/CLAUDE.md` for context on this repo.

# Five New Game Modes for Runouts

## Overview

Add 5 new game modes to `apps/runouts/index.html`. Each mode has a completely unique visual theme, animation style, and feel. These should be the most visually impressive modes in the app.

The 5 modes:
1. **Plinko** — Pachinko/prize board, balls bouncing through pegs
2. **Space Invaders** — Classic arcade shooter, players are the aliens
3. **Battle Royale** — Shrinking zone on a tactical map, last one standing
4. **Stock Market** — Live-updating line charts, meme stocks racing
5. **Bomb** — Hot potato countdown, single explosion picks the loser

Each section below covers: MODE_META entry, result builder function, totalSteps config, playback component, visual theme CSS, and card hint CSS.

---

## Important: Integration Patterns

Follow the exact patterns already in the codebase:

1. **MODE_META** — add entry to the array (same fields as existing entries)
2. **MODES** — add `{ id: "xxx", run: buildXxxResult }` to the MODES array
3. **getSingleTotalSteps** — add `case "xxx"` returning the step count
4. **PlaybackStage** — add `case "xxx"` returning `<XxxPlayback />`
5. **createOutcome** — no changes needed, it dispatches via MODES array
6. **recordGame** — no changes needed, it reads standard result fields
7. **Tournament mode** — all 5 should work in tournament format automatically (standard result object with `selectedName`, `isTie`, etc.)

Result objects must include: `modeId`, `modeName`, `selectionGoal`, `selectedName`, `isTie`, `headline`, `summary`, `players[]` with `name`, `selected`, `headline`, `subline`, `rank`, `chips[]`.

Use `pickRandomMessage(WIN_MESSAGES/LOSE_MESSAGES, name, "win"/"lose")` for headlines, matching the existing pattern.

---

## Mode 1: Plinko

### MODE_META

```js
{
  id: "plinko",
  name: "Plinko",
  icon: "📍",
  blurb: "Drop the ball. Watch it bounce. Pray.",
  accent: "from-pink-500 to-amber-500",
  cardHint: "card-hint-plinko",
  themeClass: "theme-plinko",
  resultWin: "JACKPOT",
  resultLose: "GUTTER",
}
```

### Game Logic — `buildPlinkoResult(names, taskLabel, selectionGoal)`

**Board setup:**
- 12 rows of pegs
- 13 slots at the bottom, labeled with point values: `[1, 2, 3, 5, 8, 13, 21, 13, 8, 5, 3, 2, 1]` (fibonacci-ish, symmetric, center is best)
- Each player drops one ball from a random starting position at the top

**Path generation:** Pre-compute each ball's path as an array of 12 left/right choices (one per peg row). Each choice is random (50/50). The final slot index is determined by: `startOffset + sum(choices)` where each choice is +1 (right) or 0 (left). The path array is stored in the result so the playback can animate it.

**Scoring:** Each ball lands in a slot with a point value. Highest score wins, lowest loses (or vice versa based on `selectionGoal`). Ties broken by secondary random value.

**Result object:**

```js
{
  modeId: "plinko",
  modeName: "Plinko",
  selectionGoal,
  selectedName: "Beck",
  isTie: false,
  headline: pickRandomMessage(...),
  summary: "Beck's ball landed in the gutter. 1 point.",
  players: [
    {
      name: "Beck",
      selected: true,
      slotIndex: 0,
      slotValue: 1,
      path: [0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0], // L/R per row
      startX: 5,   // starting column offset (0-12)
      headline: "Slot #1 — 1 point",
      subline: "Gutter ball",
      rank: 4,
      chips: ["1 pt"],
    },
    // ... other players
  ],
}
```

### Playback — Step-Based with Real-Time Animation Per Step

`totalSteps = players.length`

Each step = one player's ball drop. When the user clicks "Next":
1. The next player's ball appears at the top of the board
2. It animates bouncing down through the pegs in real-time (~4-5 seconds)
3. Each peg bounce: ball briefly pauses, deflects left or right based on the pre-computed path
4. Ball lands in its slot at the bottom with a satisfying thunk
5. Player's name and score appear next to the slot
6. Step completes, ready for next player's drop

The board persists between drops — previous balls stay in their slots so you can see the scores building up. Last ball to drop reveals the final standings.

### Visual Theme — `.theme-plinko`: Neon Pachinko Parlor

This should feel like walking into a Japanese pachinko parlor at midnight — overwhelming neon, chrome, sensory overload.

**Background:** Deep black with a gradient wash of hot pink and electric gold. Subtle animated neon sign flicker effect in the corners.

**The board:**
- Chrome/metallic frame border around the peg field (use CSS gradients to simulate brushed metal)
- Pegs: small glowing circles with a neon pink or cyan glow (`box-shadow: 0 0 6px #ec4899`)
- Arranged in a triangle/diamond pattern — each row offset by half a peg width
- Slots at the bottom: colored strips. Center slots (high value) glow gold, edge slots (low value) dim red/gray
- Slot value labels in bold pixel font below each slot

**The ball:**
- Bright, solid circle with a glowing trail (CSS `box-shadow` or pseudo-element trail)
- Each player's ball is a different color (use a color palette: gold, cyan, magenta, lime, orange)
- Bouncing animation: use CSS transitions or `requestAnimationFrame` for smooth peg-to-peg movement with a slight arc/gravity feel
- On landing: brief flash/pulse in the slot, particles burst outward

**Font:** Monoton for the mode title and slot labels (already loaded). VT323 for scores.

**Card hint CSS (`.card-hint-plinko`):** Gradient of pink-to-gold with subtle dot pattern suggesting pegs.

### Sounds (Optional, CSS-Only Fallback)
No audio required. Visual "sound" via screen pulses on each peg hit.

---

## Mode 2: Space Invaders

### MODE_META

```js
{
  id: "space-invaders",
  name: "Space Invaders",
  icon: "👾",
  blurb: "Aliens descend. Laser fires. Last one standing.",
  accent: "from-green-500 to-emerald-700",
  cardHint: "card-hint-space-invaders",
  themeClass: "theme-space-invaders",
  resultWin: "LAST ALIEN",
  resultLose: "VAPORIZED",
}
```

### Game Logic — `buildSpaceInvadersResult(names, taskLabel, selectionGoal)`

**Setup:** Each player is an alien in a Space Invaders formation. A turret at the bottom fires shots. Aliens are destroyed one by one in random order. The last alien standing is the selected player.

**Elimination order:** Shuffle the player names. The shuffled order is the destruction sequence — first in the shuffle = first destroyed. The last name in the shuffle = survivor = selected player.

**Result object:**

```js
{
  modeId: "space-invaders",
  modeName: "Space Invaders",
  selectionGoal,
  selectedName: "Jeremy",
  isTie: false,
  headline: pickRandomMessage(...),
  summary: "Jeremy was the last alien standing.",
  eliminationOrder: ["Beck", "Nick", "Oakley", "Jeremy"], // order of destruction, last = survivor
  players: [
    {
      name: "Beck",
      selected: false,
      destroyedAt: 1,   // which shot killed them (1-indexed)
      headline: "Vaporized — Shot #1",
      subline: "First to fall",
      rank: 4,
      chips: ["Shot #1"],
    },
    {
      name: "Jeremy",
      selected: true,
      destroyedAt: null,  // survivor
      headline: "Last alien standing",
      subline: "Survived the onslaught",
      rank: 1,
      chips: ["Survivor"],
    },
    // ...
  ],
}
```

### Playback — Step-Based

`totalSteps = players.length` (N-1 shots + 1 final reveal of the survivor)

- Step 0: Formation displayed, all aliens alive, turret at bottom
- Steps 1 to N-1: Turret fires a laser beam upward at the next alien in the elimination order. Laser travels up, hits the alien, explosion animation, alien disappears, player name flashes briefly. Score counter increments.
- Step N (final): Last remaining alien gets a spotlight/glow effect. "LAST ALIEN STANDING" text. Selected player revealed.

### Visual Theme — `.theme-space-invaders`: 1978 Arcade Cabinet

The most retro theme in the entire app. Should look like you're staring at a 1978 CRT screen.

**Background:** Pure black (#000). Faint green phosphor tint. CRT scanline overlay (already exists in the app — reuse `.crt-scanlines`). Subtle CRT curvature via `border-radius` on the container.

**Alien formation:**
- Use pixel art alien sprites via CSS `box-shadow` pixel art (the app already has space invader sprites in the CSS — reference those or create new variants)
- Arrange in rows: if 4 players, 2x2 grid. If 6+, 2-3 rows.
- Each alien has the player's name below it in green pixel font
- Aliens should have a slow side-to-side drift animation (like the real game) — CSS keyframe, ~3s cycle, the whole formation moves together

**Turret:**
- Simple pixel art turret at bottom center (3-4 pixel blocks wide)
- Stationary between shots, rotates/aims at the target alien before firing

**Laser:**
- Thin bright green line that travels from turret to target alien
- CSS animation: height grows from 0 to full distance over ~0.5 seconds
- Trail glow: `box-shadow: 0 0 8px #22c55e`

**Explosion:**
- On hit: alien sprite replaced with a pixel explosion sprite (expanding dots/fragments)
- Brief white flash on the hit point
- Fragments fade out over ~0.5s
- The empty space where the alien was stays empty (formation gets holes)

**HUD elements (for aesthetic, not functional):**
- "SCORE" counter in top-left (increments with each kill, purely decorative)
- "HI-SCORE" in top-right (static high number)
- Green horizontal line near bottom (the "ground line" from the original game)
- Shield/barrier blocks between turret and aliens (decorative only, pixel art)

**Font:** Press Start 2P exclusively (already loaded). All text in uppercase green (#22c55e) on black.

**Card hint CSS (`.card-hint-space-invaders`):** Black background with small green pixel alien sprites pattern.

---

## Mode 3: Battle Royale

### MODE_META

```js
{
  id: "battle-royale",
  name: "Battle Royale",
  icon: "🎯",
  blurb: "Zone shrinks. Players drop. Last one in wins.",
  accent: "from-cyan-400 to-blue-800",
  cardHint: "card-hint-battle-royale",
  themeClass: "theme-battle-royale",
  resultWin: "VICTORY ROYALE",
  resultLose: "ELIMINATED",
}
```

### Game Logic — `buildBattleRoyaleResult(names, taskLabel, selectionGoal)`

**Setup:** Each player is placed at a random position on a circular map. A zone (circle) shrinks in phases. Each phase, the player furthest outside the safe zone is eliminated.

**Position generation:** Assign each player a random (x, y) coordinate within a 100x100 unit grid, centered at (50, 50). Positions should be spread out — ensure minimum distance between players.

**Zone shrink phases:** Generate N-1 zone states (one per elimination). Each phase the zone center shifts slightly (random walk) and the radius decreases. Store as an array:

```js
zones: [
  { cx: 50, cy: 50, radius: 45 },   // phase 1
  { cx: 48, cy: 52, radius: 35 },   // phase 2
  { cx: 46, cy: 50, radius: 25 },   // phase 3
  // ... progressively smaller
]
```

**Elimination logic:** At each phase, compute which alive player is furthest from the zone center (relative to the zone radius). That player is eliminated. Pre-compute the full elimination order.

**Result object:**

```js
{
  modeId: "battle-royale",
  modeName: "Battle Royale",
  selectionGoal,
  selectedName: "Nick",
  isTie: false,
  headline: pickRandomMessage(...),
  summary: "Nick survived the final zone. Victory Royale.",
  zones: [...],  // array of zone states for playback
  players: [
    {
      name: "Beck",
      selected: false,
      x: 23, y: 67,          // position on map
      eliminatedAtPhase: 1,   // which zone phase killed them
      headline: "Eliminated — Phase 1",
      subline: "Caught outside the zone",
      rank: 4,
      chips: ["Phase 1"],
    },
    {
      name: "Nick",
      selected: true,
      x: 51, y: 48,
      eliminatedAtPhase: null,  // survivor
      headline: "Victory Royale",
      subline: "Last one standing",
      rank: 1,
      chips: ["Winner"],
    },
    // ...
  ],
}
```

### Playback — Step-Based

`totalSteps = players.length` (N-1 eliminations + 1 victory reveal)

- Step 0: Full map shown, all players visible as blips, zone at maximum size
- Steps 1 to N-1: Zone shrinks to next phase (animate the circle contracting over ~1.5s). The eliminated player's blip flashes red, "ELIMINATED" tag appears next to their name, blip fades to gray/X. Zone settles at new size.
- Step N: Final player gets "VICTORY ROYALE" celebration. Their blip pulses gold. Zone closes tight around them.

### Visual Theme — `.theme-battle-royale`: Tactical Operations Command Center

This should feel like a military command center radar screen. Dark, intense, high-tech.

**Background:** Near-black (#0a0f1a) with a subtle dark blue grid overlay (thin lines every ~20px, color `rgba(0, 200, 255, 0.05)`). Think radar/AWACS display.

**The map:**
- Circular map area, centered in the playback container
- Faint topographic contour lines inside the map (concentric irregular circles in very low opacity cyan — CSS generated with multiple `radial-gradient` or `border-radius` shapes)
- Subtle terrain texture: a few abstract "landmass" shapes in slightly lighter dark blue (`rgba(0,150,200,0.08)`) to break up the uniformity
- Grid coordinates along the edges (A1-F6 style labels in tiny monospace text)

**The zone:**
- Bright cyan border ring (`border: 2px solid #22d3ee`) with glow (`box-shadow: 0 0 20px rgba(34, 211, 238, 0.3)`)
- Semi-transparent fill inside the safe zone (`rgba(34, 211, 238, 0.03)`)
- Outside the zone: darker, slightly red-tinted overlay (`rgba(255, 0, 0, 0.08)`)
- When shrinking: smooth CSS transition on width/height/top/left over ~1.5s
- Zone border pulses when about to shrink (CSS animation, 2-3 pulses before contracting)

**Player blips:**
- Small diamond shapes (rotated squares) in distinct colors per player
- Player name label next to each blip in small monospace text
- Alive blips: solid color with a subtle ping animation (expanding ring that fades, like a radar sweep)
- Eliminated blips: turn red briefly, then fade to dark gray with an "X" overlay
- Connecting line from each blip to the zone edge showing their "distance to safety" (subtle dotted line, only visible during the current elimination phase)

**HUD overlay (decorative + functional):**
- Top-left: "ZONE PHASE: 3/5" in amber monospace text
- Top-right: "ALIVE: 2/4" player count with small colored dots for each (gray out eliminated)
- Bottom: scrolling "EVENT LOG" showing eliminations — "// 00:23 — Beck eliminated [PHASE 1]" in dim green monospace, one line per elimination, builds up as the game progresses
- Corner elements: fake coordinates, compass bearing, "CLASSIFIED" watermark at very low opacity

**Elimination animation:**
- Zone contracts with an easing curve (fast start, slow settle)
- Eliminated player's blip: pulse red 3x, then cross-fade to gray with "☠" or "X"
- Brief screen flash (red tint, ~100ms)
- Event log scrolls up with the new entry
- Sound-free "impact" via CSS shake on the map container (small, 2-3px, ~200ms)

**Font:** Orbitron for headers ("BATTLE ROYALE", "ZONE PHASE"). Source Code Pro for the event log and coordinates. Both already loaded.

**Card hint CSS (`.card-hint-battle-royale`):** Dark navy with subtle cyan grid lines and a circular zone outline.

---

## Mode 4: Stock Market

### MODE_META

```js
{
  id: "stock-market",
  name: "Stock Market",
  icon: "📈",
  blurb: "Invest. Pray. Watch the charts.",
  accent: "from-emerald-400 to-red-500",
  cardHint: "card-hint-stock-market",
  themeClass: "theme-stock-market",
  resultWin: "TO THE MOON",
  resultLose: "LIQUIDATED",
}
```

### Game Logic — `buildStockMarketResult(names, taskLabel, selectionGoal)`

**Setup:** Each player is assigned a random stock ticker. Generate a price history (random walk) for each stock over ~60 data points. One stock moons, one tanks, the rest are somewhere in between.

**Ticker generation:** Mix of real-ish and meme tickers. Maintain a pool and pick randomly without repeats:

```js
const TICKER_POOL = [
  // Meme
  "$DOGE", "$MOON", "$YOLO", "$HODL", "$FOMO", "$STONK", "$APE", "$REKT",
  "$PUMP", "$DUMP", "$CHAD", "$COPE", "$SHILL", "$WAGMI", "$NGMI",
  // Real-ish
  "$TSLA", "$AAPL", "$GME", "$AMC", "$NVDA", "$PLTR", "$COIN", "$RIVN",
  "$BBBY", "$WISH", "$CLOV", "$SPCE", "$LCID", "$NKLA", "$MSTR",
];
```

**Price history generation:**
- Each stock starts at $100
- Generate 60 steps of random walk: `price += price * (gaussianRandom() * volatility + drift)` where `gaussianRandom()` is a simple Box-Muller approximation: `function gaussianRandom() { const u1 = Math.random(); const u2 = Math.random(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }` — add this helper inside the build function
- The selected player's stock must end lowest (if `selectionGoal === "loser"`) or highest (if `selectionGoal === "winner"`)
- To ensure this: generate all walks freely, then assign the worst/best walk to the selected player
- Volatility: random per stock between 0.03-0.08 per step
- Drift: slight negative bias for most stocks, strong positive for the mooner, strong negative for the tanker
- Cap minimum price at $0.01 (penny stock floor, can't go negative)

**Result object:**

```js
{
  modeId: "stock-market",
  modeName: "Stock Market",
  selectionGoal,
  selectedName: "Beck",
  isTie: false,
  headline: pickRandomMessage(...),
  summary: "Beck invested in $DOGE. It crashed 94%. Liquidated.",
  players: [
    {
      name: "Beck",
      selected: true,
      ticker: "$DOGE",
      startPrice: 100,
      endPrice: 5.82,
      percentChange: -94.18,
      priceHistory: [100, 98.5, 97.2, ...], // 60 data points
      headline: "$DOGE — down 94.18%",
      subline: "$100 → $5.82",
      rank: 4,
      chips: ["$DOGE", "-94.18%"],
    },
    {
      name: "Jeremy",
      selected: false,
      ticker: "$STONK",
      startPrice: 100,
      endPrice: 847.33,
      percentChange: 747.33,
      priceHistory: [100, 103.2, 108.5, ...],
      headline: "$STONK — up 747.33%",
      subline: "$100 → $847.33",
      rank: 1,
      chips: ["$STONK", "+747.33%"],
    },
    // ...
  ],
}
```

### Playback — Real-Time Chart Animation

`totalSteps = 2` (like rocket — the animation is continuous, step 1 starts it, step 2 is the result)

When the user clicks "Start Trading" (replaces "Start Reveal"):
1. The chart area appears with axes but no data
2. A vertical "time cursor" sweeps left to right over ~15 seconds, drawing all price lines simultaneously
3. As lines are drawn, the current prices update in a leaderboard sidebar
4. When a stock crashes below $1: red flash, "LIQUIDATED" stamp appears on their line
5. When a stock surpasses 5x: green flash, rocket emoji appears on their line
6. At the end: final prices shown, winner/loser revealed with celebration/disaster animation
7. Sets `playbackDone = true`

The chart draws all lines simultaneously — you watch them race in real-time.

### Visual Theme — `.theme-stock-market`: Bloomberg Terminal Meets WSB

Dark trading terminal aesthetic with meme energy underneath.

**Background:** Pure black (#000) with a subtle dark green tint (like old Bloomberg terminals). Faint grid lines in dark green (`rgba(0, 255, 0, 0.06)`).

**The chart:**
- Dark background with horizontal price grid lines (dotted, very subtle)
- Y-axis: price labels ($0, $100, $200, etc.) in green monospace
- X-axis: time labels (just ticks, no real times needed)
- Each player's line: distinct bright color (green, cyan, magenta, yellow, orange), 2px stroke
- Lines draw left-to-right as the time cursor sweeps
- When a line is mooning: it gets a glow effect and leaves a subtle trail
- When a line is tanking: it turns red and the stroke becomes jagged/noisy

**Ticker tape:**
- Scrolling horizontal banner across the top of the playback area
- Green text on dark background, showing fake ticker updates: "DOGE +4.2% ▲  STONK -1.8% ▼  MOON +12.7% ▲"
- Updates as the chart draws, reflecting current prices
- Classic stock ticker animation (CSS `translateX` loop)

**Sidebar leaderboard:**
- Right side of the chart (or below on narrow screens)
- Shows each player's current rank, ticker, and price as the chart draws
- Green numbers for gains, red for losses
- Updates in real-time as the chart progresses
- Rankings shuffle as stocks overtake each other

**Breaking news banners:**
- Trigger at dramatic moments during the chart draw:
  - When any stock doubles: "🚨 BREAKING: $DOGE SURPASSES $200"
  - When any stock drops below $20: "📉 ALERT: $YOLO IN FREEFALL"
  - At the end for the biggest gainer: "🚀 $STONK TO THE MOON — UP 747%"
  - At the end for the biggest loser: "💀 $DOGE LIQUIDATED — DOWN 94%"
- These appear as overlay banners, red or green background, white text, slide in from the right, hold for 2 seconds, slide out

**End state:**
- Final chart freezes with all lines drawn
- The winning stock's line glows and gets a rocket emoji
- The losing stock's line gets a skull and crossbones
- Big text overlay: "MARKET CLOSED" or "TRADING HALTED"

**Font:** Source Code Pro for everything (terminal feel). Orbitron for the "MARKET CLOSED" end screen.

**Card hint CSS (`.card-hint-stock-market`):** Dark background with a small rising/falling line chart pattern in green and red.

---

## Mode 5: Bomb

### MODE_META

```js
{
  id: "bomb",
  name: "Bomb",
  icon: "💣",
  blurb: "Hot potato. Don't hold it when it blows.",
  accent: "from-red-600 to-orange-500",
  cardHint: "card-hint-bomb",
  themeClass: "theme-bomb",
  resultWin: "SURVIVED",
  resultLose: "DETONATED",
}
```

### Game Logic — `buildBombResult(names, taskLabel, selectionGoal)`

**Setup:** A bomb is passed around a circle of players. The bomb has a fuse that burns for a random number of "ticks" (15-30 ticks). Each tick, the bomb moves to a random player (can repeat, but avoid staying on the same player twice in a row). When the fuse runs out, whoever is holding the bomb is the selected player.

**Tick generation:** Pre-compute the full sequence of who holds the bomb at each tick:

```js
function generateBombSequence(names, selectedName) {
  const totalTicks = 15 + secureRandomInt(16); // 15-30 ticks
  const sequence = [];
  let currentHolder = pickRandom(names);

  for (let i = 0; i < totalTicks - 1; i++) {
    sequence.push(currentHolder);
    // Pick next holder (different from current)
    let next;
    do { next = pickRandom(names); } while (next === currentHolder && names.length > 1);
    currentHolder = next;
  }
  // Last tick: bomb is with the selected player
  sequence.push(selectedName);
  return sequence;
}
```

**Result object:**

```js
{
  modeId: "bomb",
  modeName: "Bomb",
  selectionGoal,
  selectedName: "Oakley",
  isTie: false,
  headline: pickRandomMessage(...),
  summary: "The bomb went off in Oakley's hands. 💥",
  totalTicks: 23,
  sequence: ["Beck", "Nick", "Oakley", "Jeremy", "Beck", ...], // who holds the bomb at each tick
  players: [
    {
      name: "Oakley",
      selected: true,
      timesHeld: 5,          // how many ticks they held it
      headline: "DETONATED",
      subline: "Held the bomb 5 times",
      rank: 4,
      chips: ["💥", "5 holds"],
    },
    {
      name: "Beck",
      selected: false,
      timesHeld: 7,
      headline: "Survived",
      subline: "Held the bomb 7 times — lucky",
      rank: 1,
      chips: ["Safe", "7 holds"],
    },
    // ...
  ],
}
```

### Playback — Real-Time Animation

`totalSteps = 2` (like rocket and stock market — animation is continuous)

When the user clicks "Light the Fuse" (replaces "Start Reveal"):
1. Players arranged in a circle. Bomb appears in the center.
2. Bomb flies to the first holder. Fuse starts burning.
3. Every ~0.5-0.8 seconds (random interval for unpredictability — faster as the fuse gets shorter), the bomb jumps to the next holder in the sequence:
   - Bomb animates from current holder to next holder (arc trajectory, ~0.3s)
   - Current holder briefly flashes (relief)
   - New holder's portrait/seat pulses red (danger)
   - Fuse visually shortens
   - Timer ticks down
4. Tick speed accelerates toward the end — last 5 ticks happen rapidly (~0.3s each)
5. On the final tick: EXPLOSION
   - Massive visual explosion centered on the holder
   - Screen shake (CSS transform)
   - Flash to white/red for ~200ms
   - All other players' seats turn green (safe)
   - The detonated player's seat shows the explosion aftermath
6. Sets `playbackDone = true`

Total animation duration: ~15-25 seconds depending on tick count and pacing.

### Visual Theme — `.theme-bomb`: Retro Bomb Squad

Think Bomberman meets retro game show. Bright danger colors with pixel art charm.

**Background:** Dark charcoal (#1a1a2e) with a subtle diagonal hazard stripe pattern (alternating very dark yellow and dark gray stripes, ~45deg, very low opacity — `rgba(234, 179, 8, 0.05)`). Sets a "danger zone" vibe without being overwhelming.

**Player circle:**
- Players arranged in a circle/oval in the center of the playback area
- Each player seat: a rounded rectangle with the player's name, styled as a podium/platform
- Seat colors: neutral dark gray by default
- When holding the bomb: seat border turns red, pulses with `animation: pulse-glow-rose`
- When safe (after bomb leaves): border briefly flashes green
- When eliminated (detonation): seat cracks/shatters, shows explosion debris

**The bomb:**
- Pixel art style: black circle with a lit fuse coming out the top
- The fuse: a line that glows orange/yellow at the tip, progressively shortens with each tick
- Fuse spark: small animated sparks at the burning tip (CSS pseudo-element, flickering)
- Bomb bounces/flies between players with a slight arc (CSS `@keyframes` with bezier curves)
- As the fuse gets shorter: bomb starts to shake/vibrate more intensely
- Last 5 ticks: bomb turns red, shaking violently

**Explosion:**
- Expanding circle of orange/red/yellow
- Pixel art explosion sprite or CSS-generated radial burst
- Debris particles (small colored squares flying outward — CSS `@keyframes` with random trajectories)
- Screen shake: `transform: translate(Xpx, Ypx)` cycling through random offsets for ~500ms
- Flash: overlay div goes from `rgba(255, 100, 0, 0.6)` to transparent over ~300ms

**Fuse timer:**
- Prominent countdown at the top: shows the fuse as a horizontal bar that depletes left to right
- Color transitions: green (>60% remaining) → yellow (30-60%) → red (<30%) → flashing red (last 5 ticks)
- Ticks remaining shown as a number next to the bar

**Font:** Bungee for "BOMB" title and big reveals. VT323 for the timer and player names.

**Card hint CSS (`.card-hint-bomb`):** Dark background with orange/red radial gradient suggesting an explosion, with subtle hazard stripe pattern.

---

## Fonts

All fonts used in this spec are already loaded in the app's Google Fonts import:
- Press Start 2P (pixel font)
- VT323 (retro terminal)
- Orbitron (futuristic)
- Source Code Pro (monospace)
- Bungee (bold display)
- Monoton (neon display)

No new font imports needed.

## Implementation Order

Build them in this order (simplest to most complex):

1. **Space Invaders** — Step-based, reuses existing pixel art patterns, most straightforward playback
2. **Bomb** — Real-time but simple animation (bomb bouncing between positions)
3. **Plinko** — Step-based with real-time ball physics per step, moderate animation complexity
4. **Battle Royale** — Step-based with zone shrinking, more visual elements (map, HUD, event log)
5. **Stock Market** — Real-time chart drawing, most complex animation (multiple simultaneous lines, ticker tape, breaking news)

## What NOT to Build

- No audio/sound effects — purely visual
- No settings or difficulty levels — use the hardcoded values
- No new CDN dependencies — everything is CSS/JS
- No changes to the leaderboard, spectator, or tournament systems — these work automatically via the standard result object interface
