Read `.claude/CLAUDE.md` for context on this repo.

**Depends on:** `spec-interactive-1-infrastructure.md` — build that first.

# Interactive Bomb — Choose Who to Pass To

## Overview

Transform the Bomb mode from a pre-scripted sequence into a real-time player-driven game. When the bomb lands on you, YOUR phone shows all other players' names. You tap who to throw it to. The fuse is burning. Pressure is on.

This is the highest-impact interactive mode — it adds social dynamics, real-time pressure, and genuine player agency. When `interactiveMode` is false, Bomb works exactly as it does today (pre-computed sequence, autonomous animation).

## How It Changes the Game

### Current Flow (Solo/Spectator)
- `buildBombResult` pre-computes the full bomb sequence (who holds it at each tick)
- The animation plays autonomously — bomb bounces between pre-determined players
- The last holder when the fuse runs out is selected

### Interactive Flow
- `buildBombResult` only pre-computes the **fuse length** (total ticks) and **tick timing** (acceleration curve)
- At each tick, the current holder **chooses** who to pass to on their phone
- The bomb sequence is built in real-time from player choices
- The bomb detonates when the tick count reaches the fuse length
- Whoever is holding it at detonation is selected

**Key insight:** The fuse length is still pre-determined (so the game has a fixed end point), but the PATH the bomb takes is entirely player-driven.

## Modified Result Builder

The result builder now creates a "game environment" instead of a complete result. The full result is built AFTER the game plays out.

**Pre-game (what the host generates at game start):**
```js
{
  modeId: "bomb",
  modeName: "Bomb",
  selectionGoal,
  isInteractive: true,           // Flag for the playback component
  totalTicks: 20,                // 15-30, pre-determined
  tickTimings: [800, 780, ...],  // ms between ticks, accelerating toward the end
  // No sequence, no selectedName yet — determined during play
}
```

**Post-game (built after the bomb detonates):**
```js
{
  modeId: "bomb",
  modeName: "Bomb",
  selectionGoal,
  selectedName: "Oakley",
  isTie: false,
  headline: pickRandomMessage(...),
  summary: "The bomb went off in Oakley's hands. 💥",
  totalTicks: 20,
  sequence: ["Beck", "Nick", "Oakley", "Jeremy", "Beck", ...], // actual path taken
  players: [
    {
      name: "Oakley",
      selected: true,
      timesHeld: 5,
      headline: "DETONATED",
      subline: "Held the bomb 5 times",
      rank: 4,
      chips: ["💥", "5 holds"],
    },
    // ... ranked by times held (fewer = better)
  ],
}
```

### Generating Tick Timings

```js
function generateTickTimings(totalTicks) {
  const timings = [];
  const startInterval = 800;  // ms — slow at first
  const endInterval = 250;    // ms — frantic at the end
  for (let i = 0; i < totalTicks; i++) {
    const progress = i / (totalTicks - 1);
    // Ease-in curve: slow start, fast end
    const interval = startInterval - (startInterval - endInterval) * (progress * progress);
    timings.push(Math.round(interval));
  }
  return timings;
}
```

## Real-Time Gameplay Loop

The `BombPlayback` component runs a real-time loop when `interactiveMode` is true:

### State Machine

```
COUNTDOWN → WAITING_FOR_PASS → ANIMATING_PASS → (WAITING_FOR_PASS or DETONATION)
```

1. **COUNTDOWN** (3-2-1): Standard pre-game countdown. Bomb starts with a random player.

2. **WAITING_FOR_PASS**: The current holder's phone shows the pass UI. Timer counts down based on the current tick's timing. Other players' phones show "Bomb is with {name}" with a pulsing danger indicator.

3. **ANIMATING_PASS**: After the holder picks a target (or timeout auto-picks), the bomb animates from holder to target (~0.3s). Host broadcasts the pass to all spectators/players.

4. **DETONATION**: When tick count reaches `totalTicks`, the bomb explodes on whoever is holding it. Build the final result object from the accumulated sequence. Set `playbackDone = true`.

### Broadcast Messages

**Host → All (bomb state):**
```js
// Bomb passed to someone
broadcastEvent({
  type: 'bomb_state',
  holder: 'Nick',
  tickNumber: 7,
  totalTicks: 20,
  timeoutMs: 650,      // how long Nick has to pass
});

// Bomb detonated
broadcastEvent({
  type: 'bomb_detonated',
  holder: 'Oakley',
  finalResult: { /* full result object */ }
});
```

**Host → Specific Player (pass prompt):**
```js
broadcastEvent({
  type: 'turn_prompt',
  playerName: 'Nick',
  action: 'pass_bomb',
  targets: ['Beck', 'Jeremy', 'Oakley'],  // everyone except Nick
  timeoutMs: 650,
});
```

**Player → Host (pass action):**
```js
sendPlayerAction({
  action: 'pass_bomb',
  target: 'Beck'    // who they're throwing it to
});
```

### Player Phone UI

**When YOU have the bomb:**
```
┌────────────────────────────┐
│    💣 BOMB IS ON YOU! 💣    │
│                            │
│   PASS IT! WHO GETS IT?    │
│                            │
│   ┌──────────┐             │
│   │  BECK    │  ← tap     │
│   └──────────┘             │
│   ┌──────────┐             │
│   │  JEREMY  │  ← tap     │
│   └──────────┘             │
│   ┌──────────┐             │
│   │  OAKLEY  │  ← tap     │
│   └──────────┘             │
│                            │
│   ⏱️ ▓▓▓▓░░░  1.2s        │
│                            │
└────────────────────────────┘
```

- Player names are BIG tappable buttons, full-width
- Background pulses red
- Timer bar shrinks rapidly
- As the fuse gets shorter in later ticks, the timeout gets shorter too — more pressure

**When someone ELSE has the bomb:**
```
┌────────────────────────────┐
│                            │
│   💣 Bomb is with NICK     │
│      Tick 7 / 20           │
│                            │
│   ⏱️ ▓▓▓░░░░░              │
│                            │
└────────────────────────────┘
```

Just a status indicator overlaying the game view.

### Timeout Handling

If the holder doesn't pass within the tick's time window:
1. Auto-pass to a random other player
2. Show "Auto-passed!" briefly on their phone
3. Continue the loop normally
4. This prevents one AFK player from freezing the game

### No-Pass-Back Rule

The bomb can't be immediately passed back to the person who just passed it to you (would create a boring ping-pong). The `targets` list in the prompt excludes the previous holder (and the current holder, obviously).

If there are only 2 players left (in tournament mode), this rule relaxes — you can only pass to the one other person.

## Non-Interactive Fallback

When `interactiveMode` is false, `buildBombResult` generates the full pre-computed sequence as it does today. The `BombPlayback` component checks `interactiveMode` and runs either the autonomous animation or the interactive loop.

## Changes Required

| What | Change |
|------|--------|
| `buildBombResult` | Add `isInteractive` flag. When interactive: only generate fuse length and timings, skip sequence generation |
| `BombPlayback` component | Add interactive game loop state machine alongside existing autonomous animation |
| `PlayerActionBar` | Add `case 'pass_bomb'` rendering the target picker with player name buttons |
| Result finalization | After detonation in interactive mode, build the full result object from the accumulated sequence for leaderboard recording |
| `startGame` | Pass `interactiveMode` to result builder so it knows which path to take |
