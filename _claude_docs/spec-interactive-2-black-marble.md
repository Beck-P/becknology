Read `.claude/CLAUDE.md` for context on this repo.

**Depends on:** `spec-interactive-1-infrastructure.md` — build that first.

# Interactive Black Marble

## Overview

Make Black Marble the first interactive mode. It's already naturally turn-based — players draw marbles one at a time in a circle. In interactive mode, when it's your turn, YOUR phone lights up with a "DRAW" button. You tap to draw. You see your marble on your phone first (a brief private moment of relief or dread), then it reveals to everyone on the host screen.

When `interactiveMode` is false, Black Marble works exactly as it does today (host clicks "Next").

## How It Works

### Current Flow (Solo/Spectator)
1. Host clicks "Next" → next marble is revealed
2. Step by step until someone draws the black marble

### Interactive Flow
1. Host clicks "Start Reveal" (step 0 → step 1) — this initiates the interactive loop
2. Host broadcasts `turn_prompt` to the player whose turn it is
3. That player's phone shows a "DRAW" button with a marble bag visual
4. Player taps "DRAW" on their phone → sends `player_action`
5. Host receives the action and advances the step (same as clicking "Next")
6. The marble is revealed on the host screen for everyone
7. Brief delay (~1.5s) after reveal before prompting the next player
8. Repeat until someone draws the black (or gold) marble

### Turn Order

The existing `buildBlackMarbleResult` pre-computes the draw order and which marble each player draws. That logic doesn't change. The turn order follows the `players` array order in the result, cycling through alive players.

From the result object, each step reveals the next draw. The interactive system just changes WHO triggers each step (the player on their phone vs. the host clicking Next).

### Determining Whose Turn It Is

At each step, the host knows which player is up next based on the pre-computed result. The step-to-player mapping:

```js
// The result.players array contains the draw sequence
// Step N reveals player at index (N-1) in the draw sequence
// (step 0 is the initial state before any draws)
function getCurrentDrawer(result, step) {
  if (step <= 0 || step > result.players.length) return null;
  // The draw sequence cycles through players
  // Find which player draws at this step from the result data
  return result.drawSequence?.[step - 1] || result.players[(step - 1) % result.players.length]?.name;
}
```

Note: You'll need to check exactly how `buildBlackMarbleResult` structures its draw data. The key point is: the result already contains the full sequence. Use it to determine whose turn it is.

### Broadcast Messages

**Host → Players (turn prompt):**
```js
broadcastEvent({
  type: 'turn_prompt',
  playerName: 'Nick',          // whose turn
  action: 'draw',              // what they need to do
  timeoutSeconds: 10,          // auto-draw after 10s
  turnNumber: 3,               // which draw this is
  totalDraws: result.players.length
});
```

**Player → Host (action):**
```js
sendPlayerAction({
  action: 'draw'
  // No other data needed — the result is pre-computed
});
```

### Player Phone UI

When it's a player's turn, their phone shows:

```
┌────────────────────────────┐
│                            │
│      🔮 YOUR TURN 🔮       │
│                            │
│    ┌──────────────────┐    │
│    │                  │    │
│    │   🎒 MARBLE BAG  │    │
│    │                  │    │
│    │  [ DRAW 🤞 ]     │    │
│    │                  │    │
│    └──────────────────┘    │
│                            │
│   ⏱️ 8 seconds remaining   │
│   ▓▓▓▓▓▓▓▓░░░             │
│                            │
└────────────────────────────┘
```

After tapping DRAW, before the host screen reveals to everyone, the player's phone briefly shows what they drew (for ~1 second):

- **Safe marble (white):** "⚪ SAFE" with a green flash and relief animation
- **Target marble (black/gold):** "⚫ OH NO..." or "🟡 FOUND IT" with a dramatic flash

Then the host screen reveals the same result to everyone.

When it's NOT a player's turn, they see the normal game view (same as spectator) with a small "Waiting for {name} to draw..." indicator.

### Timeout Handling

If the active player doesn't tap DRAW within 10 seconds:
1. Auto-advance the step (as if they tapped)
2. Broadcast the reveal
3. Show "Auto-drawn" text briefly on the player's phone
4. Move to the next player's turn

### Host-Side Integration

In the `MarblePlayback` component (or a wrapper around it):

```js
// Register the action handler when this mode is active and interactive
useEffect(() => {
  if (!interactiveMode) return;

  currentActionHandler.current = (actor, action, data) => {
    if (action !== 'draw') return;
    if (actor !== currentDrawer) return; // Not their turn

    // Advance the game (same as host clicking Next)
    advancePlayback();
  };

  return () => { currentActionHandler.current = null; };
}, [interactiveMode, currentDrawer]);
```

When `interactiveMode` is true, **hide the "Next reveal" button** from the host screen for this mode. The host just watches — players drive the game from their phones.

The host still has a "Reveal All" button as an override to skip to the end if needed.

### Step Flow Summary

```
Step 0: Setup visible, no draws yet
        → If interactive: broadcast turn_prompt to first player
        → If solo: host clicks Next

Step 1: First draw revealed
        → If interactive: broadcast turn_prompt to second player
        → If solo: host clicks Next

...

Step N: Final draw (black/gold marble found)
        → Game complete, playbackDone = true
```

## Changes Required

| What | Change |
|------|--------|
| `MarblePlayback` component | Add interactive turn management, hide Next button when interactive |
| `PlayerActionBar` | Add `case 'draw'` rendering the Draw button with marble bag visual |
| `buildBlackMarbleResult` | No changes — result structure already works |
| `getSingleTotalSteps` | No changes |
| Host playback buttons | Conditionally hide "Next reveal" for interactive modes, keep "Reveal All" as override |
