Read `.claude/CLAUDE.md` for context on this repo.

**Depends on:** `spec-interactive-1-infrastructure.md` — build that first.

# Interactive Poker — Draft Your Hole Cards

## Overview

In interactive mode, Texas Hold'em and PLO add a card drafting phase. Instead of being dealt a fixed hand, each player gets EXTRA cards on their phone and picks which ones to keep. This adds real poker strategy — evaluating starting hand potential, suited connectors vs. pairs — while keeping the board reveal the same.

When `interactiveMode` is false, poker modes work exactly as they do today.

## How It Works

### Texas Hold'em (Interactive)

**Current:** Each player is dealt 2 hole cards.
**Interactive:** Each player is dealt 4 cards on their phone. They privately view all 4 and pick which 2 to keep. Once everyone locks in, the board plays out normally.

### PLO (Interactive)

**Current:** Each player is dealt 4 hole cards.
**Interactive:** Each player is dealt 6 cards on their phone. They pick which 4 to keep.

### Flow

1. Host starts the game → `buildHoldemResult` (or PLO) runs in "draft mode"
2. It deals extra cards to each player and generates the board
3. Host broadcasts the draft prompt — each player receives their own cards (privately)
4. Each player's phone shows their cards. They tap to select their keepers.
5. They hit "Lock In" → sends their choice to the host
6. Host waits for all players (or timeout auto-picks best hand)
7. Once all locked in, host re-evaluates hands with the chosen cards
8. Normal step-based reveal begins (hole cards → flop → turn → river)

### Important: Privacy

Each player's draft cards are sent ONLY to their phone. Other players cannot see what cards were available or what was discarded. The broadcast needs to be targeted — this is the one mode where different players see different data.

**Approach:** The host broadcasts a single `choice_prompt` that contains all players' cards, but each player's phone only renders their own:

```js
broadcastEvent({
  type: 'choice_prompt',
  action: 'choose_cards',
  timeoutSeconds: 20,
  modeId: 'holdem',     // or 'plo'
  keepCount: 2,          // or 4 for PLO
  hands: {
    'Beck': [
      { rank: 14, suit: 's' },  // A♠
      { rank: 13, suit: 'h' },  // K♥
      { rank: 7, suit: 'd' },   // 7♦
      { rank: 2, suit: 'c' },   // 2♣
    ],
    'Nick': [ ... ],
    'Jeremy': [ ... ],
    'Oakley': [ ... ],
  }
});
```

**Security note:** Yes, technically all card data is in the broadcast and could be intercepted by inspecting the channel. This is a casual party game, not a real poker room. The privacy is UI-level (you only see your own cards on your phone), not cryptographic. This is fine for the use case.

## Modified Result Builder

### Hold'em Draft Mode

```js
function buildHoldemResult(names, taskLabel, selectionGoal, wheelRotation, interactiveMode) {
  const deck = shuffle(createDeck());

  if (interactiveMode) {
    // Deal 4 cards per player (instead of 2)
    const draftHands = {};
    names.forEach(name => {
      draftHands[name] = [deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    });
    const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

    return {
      modeId: "holdem",
      modeName: "Texas Hold'em",
      selectionGoal,
      isInteractive: true,
      draftPhase: true,         // Signal that drafting needs to happen
      draftHands,               // { playerName: [4 cards] }
      keepCount: 2,
      board,                    // Pre-generated, same as normal
      // selectedName, headline, players, etc. — computed AFTER draft
    };
  }

  // ... existing non-interactive logic unchanged ...
}
```

### PLO Draft Mode

Same pattern but deal 6 cards, keep 4:

```js
function buildPloResult(names, taskLabel, selectionGoal, wheelRotation, interactiveMode) {
  // ...
  if (interactiveMode) {
    const draftHands = {};
    names.forEach(name => {
      draftHands[name] = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    });
    // keepCount: 4
    // ...
  }
}
```

### Post-Draft Result Computation

After all players lock in their choices, the host computes the final result:

```js
function finalizeDraftResult(draftResult, playerChoices) {
  // playerChoices: { 'Beck': [0, 2], 'Nick': [1, 3], ... } — indices of chosen cards

  const players = Object.entries(playerChoices).map(([name, indices]) => {
    const holeCards = indices.map(i => draftResult.draftHands[name][i]);
    return { name, holeCards };
  });

  const board = draftResult.board;
  const evaluator = draftResult.modeId === 'plo' ? bestPloHand : bestHoldemHand;

  // ... same evaluation logic as existing buildHoldemResult / buildPloResult
  // Compute best hands, resolve winner/loser, build full result object
}
```

## Player Phone UI

### Draft Screen (Hold'em — pick 2 of 4)

```
┌────────────────────────────┐
│   🃏 CHOOSE YOUR HAND      │
│   Pick 2 cards to keep     │
│                            │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐
│   │ A♠ │ │ K♥ │ │ 7♦ │ │ 2♣ │
│   │    │ │    │ │    │ │    │
│   │ ✓  │ │ ✓  │ │    │ │    │
│   └────┘ └────┘ └────┘ └────┘
│                            │
│   Selected: A♠ K♥          │
│   Starting hand: AK suited │
│                            │
│   [ LOCK IN 🔒 ]           │
│                            │
│   ⏱️ 15 seconds remaining   │
│   ▓▓▓▓▓▓▓▓▓░░░             │
│                            │
└────────────────────────────┘
```

- Cards are rendered the same as in the existing poker playback (reuse card components)
- Tap a card to select/deselect it
- Selected cards have a checkmark and a highlighted border
- A helper line shows the starting hand description ("Pair of Kings", "AK suited", etc.)
- "Lock In" button only activates when exactly the right number of cards are selected
- Countdown timer with visual bar

### Draft Screen (PLO — pick 4 of 6)

Same layout but 6 cards, pick 4. Cards may need to be slightly smaller or arranged in 2 rows of 3.

### Waiting Screen

While waiting for other players to lock in:
```
Locked in ✓
Waiting for: Nick, Oakley
```

## Broadcast Messages

**Player → Host (draft choice):**
```js
sendPlayerAction({
  action: 'choose_cards',
  indices: [0, 2]  // indices of the cards they kept
});
```

**Host → All (draft complete):**
```js
broadcastEvent({
  type: 'draft_complete',
  // Don't reveal what anyone picked — that comes during the normal card reveal
});
```

Then the normal step-based game begins.

### Timeout Handling

If a player doesn't lock in within 20 seconds:
1. Auto-select the best possible hand from their options (evaluate all combos against a random board sample)
2. Show "Auto-picked for you" on their phone
3. Continue with the draft

## Changes Required

| What | Change |
|------|--------|
| `buildHoldemResult` | Add `interactiveMode` parameter, draft mode path dealing 4 cards |
| `buildPloResult` | Same — draft mode dealing 6 cards |
| `finalizeDraftResult` | New function: takes draft result + player choices, builds final result |
| `PokerPlayback` component | Add draft phase handling before step-based reveal |
| `PlayerActionBar` | Add `case 'choose_cards'` rendering the card picker UI |
| `createOutcome` | Pass `interactiveMode` to result builders |
| `startGame` | Handle the two-phase flow: draft → finalize → normal playback |
