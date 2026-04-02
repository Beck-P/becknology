Read `.claude/CLAUDE.md` for context on this repo.

**Depends on:** `spec-interactive-1-infrastructure.md` — build that first.

# Interactive Rocket Launch — Eject Button

## Overview

Add an "EJECT" button to each player's phone during the Rocket Launch animation. Each player's rocket has a hidden crash point (pre-determined). Players watch the distance counter climb and decide: eject now to safely land at the current distance, or ride it higher and risk crashing.

This turns the passive Rocket animation into a game of chicken. The tension is real — you're watching the distance climb, other rockets are crashing, and you're sweating over whether to bail or push further.

When `interactiveMode` is false, Rocket works exactly as it does today (autonomous real-time animation).

## How It Changes the Game

### Current Flow (Solo/Spectator)
- `buildRocketResult` pre-generates crash times for each player
- The animation plays in real-time, rockets crash at their pre-determined times
- Last rocket flying is selected

### Interactive Flow
- `buildRocketResult` still pre-generates crash times (the "crash ceiling" for each player)
- BUT now each player can tap EJECT on their phone at any time to safely land
- If you eject BEFORE your crash time → you land safely at your current distance
- If your crash time arrives and you haven't ejected → you crash (distance = crash distance, plus a "CRASHED" penalty status)
- The player with the highest final distance is selected (winner or loser depending on `selectionGoal`)

**Key insight:** Crash times are still pre-determined (the environment/danger), but player eject decisions (the strategy) determine final rankings. A player who ejects early at 50K km is safe but might lose to someone who bravely/foolishly rode to 500K km before ejecting.

### The Crash Penalty

Crashing is worse than ejecting at the same distance. If two players end at similar distances but one ejected and one crashed, the crasher ranks lower. This incentivizes ejecting — but ejecting too early means low distance.

Simple implementation: crashed players' distances are penalized by 50% for ranking purposes. So crashing at 100K km is equivalent to ejecting at 50K km. This makes crashing a genuine risk.

## Modified Result Builder

`buildRocketResult` stays mostly the same. Add a flag and store crash times explicitly:

```js
function buildRocketResult(names, taskLabel, selectionGoal) {
  // ... existing crash time generation ...

  return {
    modeId: "rocket",
    modeName: "Rocket Launch",
    selectionGoal,
    isInteractive: true,  // flag for playback component
    crashTimes: players.map(p => ({ name: p.name, crashTime: p.crashTime })),
    // selectedName, headline, summary, etc. are NOT set yet
    // They'll be computed after the animation completes based on eject decisions
    players: players.map(p => ({
      name: p.name,
      crashTime: p.crashTime,
      distance: p.distance,
      distanceFormatted: formatDistance(p.distance),
      // ejectTime, ejectDistance, finalRank — filled in after the game
    })),
  };
}
```

The full result (with `selectedName`, `headline`, rankings) is computed AFTER the animation ends, using both crash times and eject decisions.

## Real-Time Gameplay

### Animation Loop (Host)

The host runs the same real-time Rocket animation as today — distance counter ticking up, milestone callouts, starfield background. The additions:

1. **Track eject state** for each player:
```js
const [ejectState, setEjectState] = useState({});
// { 'Beck': { ejected: true, time: 23.5, distance: 54200 } }
```

2. **Process eject actions** as they arrive:
```js
currentActionHandler.current = (actor, action, data) => {
  if (action !== 'eject') return;
  if (ejectState[actor]) return; // Already ejected
  const currentTime = getElapsedTime(); // from animation timer
  const currentDistance = distanceAtTime(currentTime);
  setEjectState(prev => ({
    ...prev,
    [actor]: { ejected: true, time: currentTime, distance: currentDistance }
  }));
};
```

3. **Rocket visuals** during the animation:
   - **Active rockets**: still flying, distance climbing
   - **Ejected rockets**: show a parachute/landing animation, their final distance displayed, grayed out label "LANDED — 54,200 km"
   - **Crashed rockets**: explosion animation (same as current), "CRASHED — 102,300 km"

4. **Game end**: When all players have either ejected or crashed, compute final rankings and build the complete result.

### Broadcast Messages

**Host → All (continuous state):**
```js
// Broadcast current state periodically (~4x/sec) or on events
broadcastEvent({
  type: 'rocket_state',
  elapsed: 23.5,
  distance: 54200,
  distanceFormatted: '54,200 km',
  alive: ['Nick', 'Jeremy'],        // still flying
  ejected: { 'Beck': 12300 },       // name: distance
  crashed: { 'Oakley': 3200 },      // name: distance
});

// On crash event
broadcastEvent({
  type: 'rocket_crash',
  playerName: 'Oakley',
  distance: 3200,
  distanceFormatted: '3,200 km',
});

// On eject event
broadcastEvent({
  type: 'rocket_eject',
  playerName: 'Beck',
  distance: 12300,
  distanceFormatted: '12,300 km',
});
```

**Player → Host:**
```js
sendPlayerAction({ action: 'eject' });
```

### Player Phone UI

**While your rocket is still flying:**
```
┌────────────────────────────┐
│                            │
│   🚀 YOUR ROCKET           │
│                            │
│   📏 54,200 km             │
│   ⏱️ 0:23                   │
│                            │
│   🌙 Approaching the Moon  │
│                            │
│   ┌──────────────────────┐ │
│   │                      │ │
│   │    🔴 EJECT 🪂       │ │
│   │                      │ │
│   └──────────────────────┘ │
│                            │
│   Still flying: You, Nick  │
│   Landed: Beck (12K km)    │
│   Crashed: Oakley (3K km)  │
│                            │
└────────────────────────────┘
```

- **Distance counter**: Large, prominent, updating in real-time. Same number the host screen shows.
- **EJECT button**: Big, red, always visible. One tap to eject. Maybe require a confirm tap to prevent accidents? Or just make it a deliberate press-and-hold (hold for 0.5s to eject).
- **Status of other players**: Who's still flying, who ejected (and at what distance), who crashed. This is critical info for decision-making — "Beck ejected at 12K, if I eject now at 54K I'm ahead of him..."
- **Milestone callouts**: Same as host screen.

**After you eject:**
```
┌────────────────────────────┐
│                            │
│   🪂 LANDED SAFELY          │
│   📏 54,200 km             │
│                            │
│   Watching remaining...    │
│                            │
│   🚀 Nick — 67,400 km      │
│   🚀 Jeremy — 67,400 km    │
│                            │
└────────────────────────────┘
```

Your phone switches to spectator view. You watch the remaining rockets with their live distances. You're either relieved or regretting your early bail.

**After you crash:**
```
┌────────────────────────────┐
│                            │
│   💥 CRASHED                │
│   📏 102,300 km            │
│                            │
│   You didn't eject in time │
│                            │
└────────────────────────────┘
```

### Non-Connected Players

If a player name in the game doesn't have a connected phone (they didn't join the room), their rocket has no eject option and just crashes at the pre-determined time — same as current non-interactive behavior. Interactive and non-interactive players can coexist in the same game.

### Result Computation (Post-Animation)

After all rockets have either ejected or crashed:

```js
function computeRocketResult(players, ejectState, selectionGoal) {
  const results = players.map(p => {
    const ejected = ejectState[p.name];
    const crashed = !ejected; // if they didn't eject, they crashed
    const finalDistance = ejected ? ejected.distance : p.distance;
    // Crash penalty: effective distance is halved for ranking
    const effectiveDistance = crashed ? finalDistance * 0.5 : finalDistance;
    return {
      name: p.name,
      distance: finalDistance,
      effectiveDistance,
      ejected: !!ejected,
      crashed,
      time: ejected ? ejected.time : p.crashTime,
    };
  });

  // Rank by effective distance (highest = rank 1)
  results.sort((a, b) => b.effectiveDistance - a.effectiveDistance);
  results.forEach((r, i) => r.rank = i + 1);

  const selected = selectionGoal === 'winner' ? results[0] : results[results.length - 1];
  // ... build full result object with headline, summary, players array
}
```

## Changes Required

| What | Change |
|------|--------|
| `buildRocketResult` | Add `isInteractive` flag, export crash times for interactive use |
| `RocketPlayback` component | Add eject state tracking, player action handler, modified animation for ejected/crashed states |
| `PlayerActionBar` | Add `case 'eject'` rendering the EJECT button with distance counter |
| Result finalization | New `computeRocketResult` function builds the final result from eject decisions + crash times |
| Leaderboard recording | Call `recordGame` with the post-animation result, same as other modes |
