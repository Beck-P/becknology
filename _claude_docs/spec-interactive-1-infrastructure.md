Read `.claude/CLAUDE.md` for context on this repo.

# Interactive Multiplayer Infrastructure

**Build this FIRST.** All other interactive mode specs depend on this.

## Overview

Upgrade the existing spectator/room system in `apps/runouts/index.html` from one-directional (host → spectators) to bidirectional (host ↔ players). This enables interactive game modes where players on their own phones can take actions that affect the game.

The existing spectator system already has:
- Room creation with codes (`roomCode`, `roomMode`, `roomChannel`)
- Supabase Realtime Broadcast on `room:{code}` channel
- Host sends via `broadcastEvent(payload)`
- Spectators receive via `channel.on('broadcast', { event: 'game_event' }, ...)`
- Presence tracking via `channel.track()` and `presenceState()`
- Viewer count (`viewerCount`)

This spec adds: player identity assignment, player-to-host messaging, turn/phase management with timeouts, and a new "player" role distinct from "spectator."

## New Room Mode: 'player'

Currently `roomMode` is `'none' | 'host' | 'spectator'`. Add a new value: `'player'`.

### Join Flow — Players Enter Their Own Name

When someone opens a room link (`?room=XXXX`), they see a **join screen** where they type their name:

```
┌────────────────────────────┐
│     JOIN RUNOUTS ROOM      │
│        BECK-4521           │
│                            │
│   Enter your name:         │
│   ┌──────────────────────┐ │
│   │ Nick                 │ │
│   └──────────────────────┘ │
│                            │
│   [ JOIN GAME 🎮 ]         │
│                            │
│   [ Just Watch 👀 ]        │
│                            │
└────────────────────────────┘
```

- **Typing a name + "Join Game"** → joins as a `'player'` with that name. Name stored in state.
- **"Just Watch"** → joins as a `'spectator'` (current behavior, view-only).
- **Duplicate name prevention:** If a name is already taken (someone in the room has it), show a warning "That name is taken" and don't allow joining. Check against presence metadata.
- **Name validation:** Minimum 1 character, trim whitespace, max ~20 characters.

### The Host Also Has a Name

When the host creates a room, the host is automatically a player too. The host's name is the first entry in the current `names` array (i.e., `names[0]`). The host is always in the game.

### Game Roster = Room Roster

**This is the key change:** When a room is active, the game's player list is built from whoever is connected to the room as a `'player'` (including the host), NOT from the host's pre-set `names` array.

**New state variables:**

```js
const [playerName, setPlayerName] = useState(null);  // This device's player name ('player' mode only)
const [roomPlayers, setRoomPlayers] = useState([]);   // Ordered list of player names in the room
```

**When `roomMode === 'host'` and a room is open:**
- The `names` input UI on the host's setup screen is **replaced** by a live roster of connected players
- The host CANNOT manually add/remove names — the roster is determined by who's joined
- The host CAN still set the mode, stakes, selection goal, and game format
- Minimum 2 players required to start (same as current `canRun` logic)
- The host's own name is always first in the roster

**When `roomMode === 'none'` (no room):**
- Everything works exactly as today — the host manually enters names
- Zero changes to solo play

### Presence Metadata

When a player joins, they include their name in the presence track:

```js
// Player joining
channel.track({
  joinedAt: Date.now(),
  role: 'player',        // or 'spectator'
  playerName: 'Nick'     // null for spectators
});
```

**Host reads presence** to build the live roster:

```js
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  const players = [];
  const spectators = [];
  Object.values(state).flat().forEach(p => {
    if (p.role === 'player' && p.playerName) {
      players.push({ name: p.playerName, joinedAt: p.joinedAt });
    } else {
      spectators.push(p);
    }
  });
  // Sort by join time, but host is always first
  players.sort((a, b) => a.joinedAt - b.joinedAt);
  const hostName = names[0]; // host's own name
  const ordered = [
    hostName,
    ...players.filter(p => p.name !== hostName).map(p => p.name)
  ];
  setRoomPlayers(ordered);
  setViewerCount(spectators.length);
});
```

**Host UI — Live Room Roster:**

The room panel replaces the name input area with:

```
Room: BECK-4521

Players (3):
  🟢 Beck (host)
  🟢 Nick
  🟢 Oakley

👀 1 watching

[ START GAME ]   [ CLOSE ROOM ]
```

- Green dots = connected players
- New players joining mid-session appear in the list automatically
- Players disconnecting are removed automatically (presence handles this)
- If a player disconnects during a game, their actions auto-resolve via timeouts

### Passing Roster to Game Logic

When the host starts a game, instead of using `cleanedNames` from the manual input, use `roomPlayers`:

```js
function startGame(forcedModeId = null) {
  // Use room roster if a room is active, otherwise manual names
  const gameNames = roomMode === 'host' && roomPlayers.length >= 2
    ? roomPlayers
    : cleanedNames;

  // ... rest of startGame using gameNames instead of cleanedNames
}
```

This is the single integration point — `createOutcome` and all result builders receive `gameNames` and work identically regardless of where the names came from.

## Player-to-Host Messaging

**Players send actions** via a new broadcast event type:

```js
// Player sends an action to the host
function sendPlayerAction(action) {
  if (roomMode !== 'player' || !roomChannel) return;
  roomChannel.send({
    type: 'broadcast',
    event: 'player_action',
    payload: {
      playerName,   // who sent it
      ...action     // { action: 'eject' }, { action: 'choose', target: 'Beck' }, etc.
    }
  });
}
```

**Host listens for player actions** by adding a handler in the `createRoom` function (or the host's channel setup):

```js
channel.on('broadcast', { event: 'player_action' }, ({ payload }) => {
  // Dispatch to the current game mode's action handler
  handlePlayerAction(payload);
});
```

The `handlePlayerAction` function is mode-specific — each interactive mode defines what actions it accepts. This spec only creates the plumbing. Individual mode specs define the handlers.

## Interactive Mode Flag

**New state:**

```js
const [interactiveMode, setInteractiveMode] = useState(false);
```

**When to activate:** Interactive mode turns on automatically when at least one `'player'` (not just spectator) is connected to the room. The host UI shows an indicator:

```
🎮 Interactive Mode ON — players can interact
```

Or if no players are connected (only spectators):

```
👀 Spectator Mode — view only
```

**How modes use it:** Each game mode checks `interactiveMode` to decide whether to:
- Wait for player input (interactive) vs. let the host click "Next" (solo/spectator)
- Show "Waiting for players..." overlays
- Run timeout logic

If `interactiveMode` is false, everything works exactly as it does today. Zero behavior change for solo play or spectator-only rooms.

## Turn / Phase Management

Add a shared system for managing whose turn it is and collecting choices with timeouts.

**New state:**

```js
const [pendingAction, setPendingAction] = useState(null);
// Shape: { type: 'turn', playerName: 'Nick', deadline: timestamp }
// Or:    { type: 'choice', playersNeeded: ['Beck','Nick','Jeremy','Oakley'], received: {}, deadline: timestamp }
// Or:    { type: 'realtime' }  (for continuous input modes like Rocket eject, Bomb pass)
```

### Turn-Based Pattern (Black Marble, step-based reveals)

Host broadcasts a turn prompt. One player acts. Host processes and moves on.

```js
// Host sends
broadcastEvent({
  type: 'turn_prompt',
  playerName: 'Nick',
  action: 'draw',           // what action is expected
  timeoutSeconds: 10
});

// Player 'Nick' sees a button on their phone and taps it
sendPlayerAction({ action: 'draw' });

// Host receives, processes, advances the game
```

### Choice Collection Pattern (Poker draft, pre-game selections)

Host broadcasts a choice prompt to all players. Waits for all responses (or timeout).

```js
// Host sends
broadcastEvent({
  type: 'choice_prompt',
  choices: {
    'Beck': { cards: [...] },   // each player sees their own options
    'Nick': { cards: [...] },
  },
  timeoutSeconds: 15
});

// Each player sees their options and sends their choice
sendPlayerAction({ action: 'choose', choice: [cardIndex1, cardIndex2] });

// Host collects all choices (or auto-resolves on timeout)
```

### Real-Time Pattern (Rocket eject, Bomb pass, Stock sell)

No turns — players can act at any time during the animation. Host processes actions as they arrive.

```js
// During Rocket animation, any player can send at any time:
sendPlayerAction({ action: 'eject' });

// Host receives immediately and processes it
```

## Timeout System

When waiting for player input, always set a deadline. If a player doesn't act by the deadline, auto-resolve their action randomly (or with a sensible default).

```js
function startTimeout(seconds, onTimeout) {
  const deadline = Date.now() + seconds * 1000;
  const timer = setTimeout(onTimeout, seconds * 1000);
  return { deadline, timer, clear: () => clearTimeout(timer) };
}
```

**On the player's phone:** Show a visible countdown timer whenever they have a pending action. The timer shows seconds remaining and a shrinking bar. When it expires, the action auto-resolves and the player sees "Auto-picked for you."

**Broadcast the deadline** so player phones can show the countdown synced to the host's timer.

## Player Phone UI Framework

When `roomMode === 'player'` and a game is active, the player's phone shows:

1. **The game view** (same as spectator — they see the playback)
2. **An action overlay** when it's their turn or they have a choice to make

The action overlay sits at the bottom of their screen (like a toolbar) and shows mode-specific UI:
- Big tappable buttons for turn-based actions ("DRAW", "ROLL", "DROP")
- Card/option selection grids for choices
- Countdown timer when there's a deadline

When no action is pending, the overlay is hidden and they just watch (same as spectator).

**Component structure:**

```jsx
function PlayerActionBar({ pendingAction, onAction, playerName, result }) {
  if (!pendingAction) return null;

  // Each mode provides its own action UI
  switch (pendingAction.action) {
    case 'draw': return <DrawButton onAction={onAction} />;
    case 'choose_cards': return <CardPicker cards={pendingAction.options} onAction={onAction} />;
    case 'eject': return <EjectButton onAction={onAction} />;
    case 'pass_bomb': return <BombPassPicker targets={pendingAction.targets} onAction={onAction} />;
    case 'sell': return <SellButton currentPrice={pendingAction.price} onAction={onAction} />;
    // ... more per mode
    default: return null;
  }
}
```

This component is rendered on the player phone inside the spectator view, only when `roomMode === 'player'`.

## Host-Side Action Processing

Add a `handlePlayerAction` function to the App component that dispatches to mode-specific handlers:

```js
function handlePlayerAction(payload) {
  if (!interactiveMode || !gameActive) return;

  const { playerName: actor, action, ...data } = payload;

  // Validate: is this player actually in the game?
  if (!cleanedNames.includes(actor)) return;

  // Dispatch to whatever the current mode needs
  // This is a ref or state that gets set by each mode's playback component
  if (currentActionHandler.current) {
    currentActionHandler.current(actor, action, data);
  }
}
```

Each interactive mode's playback component registers its own action handler via a ref or callback. This keeps the infrastructure generic — it just routes messages to the right handler.

## Summary of Changes

| Component | Change |
|-----------|--------|
| `roomMode` | Add `'player'` value |
| Join screen | New component: name text input + "Join Game" / "Just Watch" buttons |
| Presence metadata | Include `role` and `playerName` in track data |
| Host channel setup | Add `player_action` event listener |
| Host name input area | Replaced by live room roster when room is active |
| `startGame` / `createOutcome` | Use `roomPlayers` (from presence) instead of `cleanedNames` when room is active |
| `broadcastEvent` | No change — already works for new event types |
| Player phones | New `PlayerActionBar` component overlaying the spectator view |
| Timeout system | New `startTimeout` utility function |
| Host UI | Live player roster, spectator count, interactive mode indicator |
| Game modes | No changes in this spec — individual mode specs handle that |

## What NOT to Build

- No changes to any game mode logic — that's in subsequent specs
- No new Supabase tables — all communication is ephemeral broadcast
- No authentication — player identity is self-selected on the honor system
- No persistent player profiles — player names reset each session
- No manual name editing by the host when a room is open — the roster IS the room
