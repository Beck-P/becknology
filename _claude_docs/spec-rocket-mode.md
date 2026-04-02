Read `.claude/CLAUDE.md` for context on this repo.

# New Game Mode: Rocket Launch

## Overview

Add an 11th game mode to `apps/runouts/index.html` — a rocket launch survival race inspired by the "Crash" game. Each player gets a rocket that launches into space. Rockets crash one by one at increasing distances until only one remains. The last rocket flying is the selected player (winner or loser depending on the selection goal).

**What makes this mode unique:** It plays out in **real time** — no step-based "Next" button clicking. The player hits play and watches the race unfold over ~15 seconds to ~2 minutes. This is the first mode with a continuous animation timeline instead of discrete reveal steps.

## MODE_META Entry

Add this to the `MODE_META` array:

```js
{
  id: "rocket",
  name: "Rocket Launch",
  icon: "🚀",
  blurb: "Launch into space. Last rocket flying wins.",
  accent: "from-indigo-500 to-violet-700",
  cardHint: "card-hint-rocket",
  themeClass: "theme-rocket",
  resultWin: "ORBIT ACHIEVED",
  resultLose: "BURNED UP",
}
```

## Game Logic — `buildRocketResult(players, selectionGoal)`

### Crash Time Generation

Each player gets a random crash time between **5 seconds** (minimum) and **120 seconds** (maximum / 2 minutes). The selected player (winner or loser) is always assigned the **latest** crash time — they're the survivor.

**Distribution:** Use a weighted random distribution that front-loads crashes into the first ~40 seconds. Most players crash early, with stragglers dragging out the tension. Suggested approach:

```js
// Generate crash times with early-weighted distribution
// Use exponential distribution: more density at low values, long tail
function generateCrashTime(minTime, maxTime) {
  // Random value with exponential bias toward earlier times
  const lambda = 3; // Higher = more front-loaded
  const u = Math.random();
  const expVal = -Math.log(1 - u * (1 - Math.exp(-lambda))) / lambda; // 0 to 1, biased low
  return minTime + expVal * (maxTime - minTime);
}
```

Then sort all crash times ascending, and assign the latest time to the selected player. If `selectionGoal === "loser"`, the selected player's rocket crashes last (they survived longest but still "lose" the selection). If `selectionGoal === "winner"`, same logic — last rocket flying is the selected one.

### Distance Calculation

Distance is computed from elapsed time using an acceleration formula. The rocket speeds up as it flies, making late-game distances dramatically larger than early crashes.

```js
// Base speed: 100 km/s, acceleration: 200 km/s²
// d = v₀t + ½at²
function distanceAtTime(t) {
  const v0 = 100;  // km/s
  const a = 200;    // km/s²
  return v0 * t + 0.5 * a * t * t;
}
```

Reference distances at key times:
- 5s → ~3,000 km
- 10s → ~11,000 km
- 30s → ~93,000 km
- 60s → ~366,000 km (roughly the Moon)
- 90s → ~819,000 km
- 120s → ~1,452,000 km

Tune `v0` and `a` so that the milestones below hit at satisfying times. The exact numbers don't need to be astronomically accurate — they need to *feel* good. A full 2-minute survivor should be well past the Moon.

### Space Milestones

As the leading rocket passes each distance, show a brief milestone callout on screen (a toast/banner that fades in, hangs for ~2 seconds, then fades out):

| Distance | Milestone |
|----------|-----------|
| ~100 km | "🌍 Leaving the atmosphere" |
| ~400 km | "🛸 Passing the ISS" |
| ~2,000 km | "📡 Low Earth orbit" |
| ~20,000 km | "🌐 Passing GPS satellites" |
| ~36,000 km | "⚡ Geostationary orbit" |
| ~384,000 km | "🌙 Passing the Moon" |
| ~800,000 km | "🌌 Deep space" |
| ~1,000,000 km+ | "✨ Uncharted territory" |

These milestones only trigger once per game, based on the furthest-traveling rocket's current distance.

### Result Object Structure

```js
{
  modeId: "rocket",
  modeName: "Rocket Launch",
  selectionGoal: "winner" | "loser",
  selectedName: "Jeremy",
  isTie: false,       // Ties not possible — crash times are continuous floats
  headline: "Jeremy's rocket survived to 1,247,832 km",
  summary: "All other rockets burned up. Jeremy made it past the Moon.",
  players: [
    {
      name: "Beck",
      selected: false,
      crashTime: 7.23,           // seconds
      distance: 6,456,           // km at crash
      distanceFormatted: "6,456 km",
      headline: "Crashed at 6,456 km",
      subline: "0:07 flight time",
      rank: 4,                   // order of crash (1 = first to crash)
    },
    {
      name: "Jeremy",
      selected: true,
      crashTime: 118.5,
      distance: 1_247_832,
      distanceFormatted: "1,247,832 km",
      headline: "Survived to 1,247,832 km",
      subline: "1:58 flight time — past the Moon",
      rank: 1,                   // last standing
    },
    // ... other players sorted by crash order
  ],
}
```

Ties are effectively impossible since crash times are continuous random floats.

## Playback — Real-Time Animation

**This mode does NOT use the step-based reveal system.** Instead of incrementing `playbackStep` and clicking "Next", the Rocket mode runs a real-time animation loop using `requestAnimationFrame`.

### Integration with Existing Playback System

The playback modal still opens the same way — `gameActive` is set to `true`, the themed modal appears. But instead of showing "Start Reveal" / "Next" / "Reveal All" buttons, the Rocket mode shows a single **"Launch" button**. After clicking Launch, the animation runs autonomously until all crashes have resolved.

In the `PlaybackStage` component's switch statement, add a `case "rocket"` that renders `<RocketPlayback />` instead of the step-based components.

For `totalSteps` calculation in the step counter, Rocket mode can report `totalSteps = 1` and immediately set `playbackDone = true` when the animation completes. This keeps the existing flow happy (the result gets recorded to the leaderboard, etc.) without needing to refactor the step system.

### Animation Timeline

1. **Pre-launch** (initial state): All rockets on a launchpad. Countdown text: "3... 2... 1..." (1 second each, so 3 seconds total). Players' names labeled on their rockets.

2. **Active flight**: Rockets fly upward (visually translate up or use a scrolling starfield). A prominent distance counter ticks up in real time showing the leading rocket's distance. Format: `12,847 km` — updates every frame for smooth counting. The acceleration means the counter starts slow and gets faster and faster.

3. **Crash events**: When the elapsed time hits a player's `crashTime`:
   - Their rocket explodes (CSS animation — flash of orange/red, maybe a pixel art explosion sprite, rocket disappears)
   - Their name + crash distance appears in a "crash log" that builds up on screen (e.g., "💥 Beck — 6,456 km")
   - Brief screen shake or flash effect
   - If this is NOT the final crash, the race continues
   - A sound effect cue would be nice but isn't required — use CSS animations for visual punch

4. **Final moment**: When only one rocket remains and the second-to-last has crashed:
   - Short dramatic pause (~1 second)
   - The surviving rocket gets a celebration effect — glow, particles, the distance counter holds
   - Set `playbackDone = true`
   - The standard result header/verdict appears with the headline

5. **Result summary**: After the animation completes, show all players ranked by distance — same card layout as other modes. Each player card shows their crash time, distance, and rank.

### Visual Design

**Background:** Dark space theme with a scrolling starfield (the app already has starfield code — reuse or reference it). As rockets fly higher, the background could subtly shift from dark blue (atmosphere) to pure black (space).

**Rockets:** Small pixel-art style rockets. Each player gets a distinct color. Rockets are arranged horizontally across the screen, flying upward. When there are many players (4+), space them evenly.

**Distance counter:** Large, prominent, top-center of the playback area. Monospace font (Orbitron or VT323). Shows the distance of the leading rocket with a unit label. Comma-formatted numbers.

**Crash log:** A compact list that builds in the corner (bottom-left or side panel) showing crashed players in order. Each entry: explosion emoji + name + distance. Scrolls if needed.

**Milestone banners:** Center-screen, semi-transparent, fade in/out. Use the pixel font. Brief — appear for ~2 seconds then dissolve.

**Color theme:** `.theme-rocket` should use deep space purples and indigos with bright accent colors for the rockets and explosions. The accent gradient `from-indigo-500 to-violet-700` sets the tone.

### Timing Feel

The animation should feel like watching a real launch. Early crashes happen quickly and feel sudden. As the field narrows, the gaps between crashes get longer, building tension. The final duel between the last two rockets should feel like it lasts forever (even if it's only 15-20 seconds of real time).

The distance counter acceleration is key to the vibe — at 5 seconds in it's ticking slowly through hundreds of km. By 90 seconds the numbers are flying by in the hundreds of thousands. This natural acceleration makes the scale feel real.

## Card Hint CSS

Add a `.card-hint-rocket` class for the mode selection card. Space/launch themed — maybe a subtle rocket trail or stars pattern.

## Theme CSS

Add a `.theme-rocket` class applied to the playback modal. Deep space aesthetic — dark indigo/purple background, maybe distant stars or a nebula texture via CSS gradients.

## Leaderboard Integration

Rocket mode records to the leaderboard exactly like other modes. The `recordGame()` function already handles any mode — it just needs the standard result object fields (`mode_id`, `mode_name`, `selection_goal`, `selected_player`, `all_players`, `headline`).

The `all_players` JSONB for rocket mode should include each player's `distance`, `crashTime`, and `rank` so future stats could show things like "average flight distance" or "longest rocket" records.

## Tournament Mode

Rocket mode should work in tournament (multi-round elimination) format. Each round, the loser (first to crash) is eliminated. Remaining players go again. The playback for tournament mode plays each round's animation sequentially.

## What NOT to Build

- No audio/sound effects — keep it CSS/JS visual only
- No multiplayer/spectator integration in this spec (the spectator spec handles that separately and will broadcast rocket state the same way it broadcasts other modes)
- No settings or customization for speed/distance — use the hardcoded values and tune by feel
- No pause/rewind controls — the animation plays once, forward only
