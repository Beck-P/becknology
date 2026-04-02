Read `.claude/CLAUDE.md` for context on this repo.

# Multiplayer Room System for Runouts

## Overview

Add a real-time multiplayer room to `apps/runouts/index.html` where the host shares a link and other people join on their own devices. Players enter their name when joining — the game roster is built from whoever's in the room. Spectators can also join in watch-only mode.

Uses **Supabase Realtime Broadcast** (already available via the Supabase JS client loaded for the leaderboard). No new database tables — Broadcast sends ephemeral messages through channels without storing anything.

## How It Works

### Host Flow
1. Host clicks "Start Room" on the main screen
2. App generates a room code (e.g. `BECK-4521` — first 4 chars of host name + 4 random digits)
3. The host's name entry area is **replaced** by a live room roster showing connected players
4. A share panel appears with: room code, shareable link, copy button, QR code, player/spectator counts
5. Players join and appear in the roster in real-time
6. When the host starts a game, it uses the room roster as the player list — only people in the room play
7. Host can "Close Room" at any time, disconnecting everyone

### Join Flow — Players Enter Their Own Name
1. Someone opens the shared link (`becknology.vercel.app/runouts?room=BECK-4521`)
2. They see a join screen:

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

3. **"Join Game"** → joins as a **player** with that name. They're in the game.
4. **"Just Watch"** → joins as a **spectator**. View-only, not in the game.
5. **Duplicate names** are blocked — if "Nick" is already in the room, show "That name is taken."
6. **Name rules:** 1-20 characters, trimmed whitespace.

### Game Roster = Room Roster

This is the key design principle. When a room is active:

- The game's player list comes from **who is connected as a player**, not from manual name entry
- The host is always player 1 (their name from `names[0]`)
- Players joining the room appear in the roster automatically
- Players disconnecting are removed automatically (via presence)
- The host **cannot** manually add/remove names while a room is open
- Minimum 2 players to start a game (same as current rule)
- When no room is open, everything works exactly as today — manual name entry

### What the Host Sees (Room Active)

The name input section is replaced by a live roster:

```
Room: BECK-4521  [Copy Link] [QR]

Players (3):
  🟢 Beck (host)
  🟢 Nick
  🟢 Oakley

👀 1 watching

[Mode: Auto] [Stakes: ___] [Goal: Loser]

[ START GAME ]          [ CLOSE ROOM ]
```

- Green dots = connected
- New players appear automatically when they join
- Disconnected players disappear automatically
- Game settings (mode, stakes, goal) still controlled by the host
- "Start Game" uses the roster as the player list

### What Players See (Game Active)

Players see the same game view as spectators — the playback modal with theme, animations, reveals. The "📡 LIVE" indicator shows in the corner. Steps appear in real-time as the host advances them.

Players have NO game controls in this base spec. The interactive specs (spec-interactive-*) add player actions on top of this.

### What Spectators See

Same as players but they're not in the game. They see the reveals, celebrations, and results. Between games they see "Waiting for next game..." with connection status.

## Broadcast Protocol

All communication happens on a Supabase Realtime channel named `room:{roomCode}`.

### Host → Everyone (`game_event`)

```js
// Room created
{ type: 'room_created', hostName: 'Beck' }

// Game starts — includes the full result object so everyone can render
{ type: 'game_start', result: { /* full result object */ } }

// Step advances
{ type: 'step', step: 3, done: false }

// Game reset (back to lobby)
{ type: 'game_reset' }

// Room closed
{ type: 'room_closed' }
```

### Presence Tracking

Players and spectators include their role and name in presence metadata:

```js
// Player joining
channel.track({
  joinedAt: Date.now(),
  role: 'player',
  playerName: 'Nick'
});

// Spectator joining
channel.track({
  joinedAt: Date.now(),
  role: 'spectator',
  playerName: null
});
```

Host reads presence to build the live roster:

```js
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  const players = [];
  let spectatorCount = 0;

  Object.values(state).flat().forEach(p => {
    if (p.role === 'player' && p.playerName) {
      players.push({ name: p.playerName, joinedAt: p.joinedAt });
    } else {
      spectatorCount++;
    }
  });

  // Sort by join time, host always first
  players.sort((a, b) => a.joinedAt - b.joinedAt);
  const hostName = names[0];
  const ordered = [
    hostName,
    ...players.filter(p => p.name !== hostName).map(p => p.name)
  ];

  setRoomPlayers(ordered);
  setViewerCount(spectatorCount);
});
```

## State Management

### New State Variables

```js
const [roomMode, setRoomMode] = useState(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('room') ? 'joining' : 'none';
  // 'none' | 'host' | 'joining' | 'player' | 'spectator'
});
const [roomCode, setRoomCode] = useState(() => {
  return new URLSearchParams(window.location.search).get('room') || null;
});
const [roomChannel, setRoomChannel] = useState(null);
const [roomPlayers, setRoomPlayers] = useState([]);    // live player roster
const [playerName, setPlayerName] = useState(null);     // this device's name (player mode)
const [viewerCount, setViewerCount] = useState(0);      // spectator count
const [spectatorState, setSpectatorState] = useState(null);
const [spectatorConnected, setSpectatorConnected] = useState(false);
const [roomClosed, setRoomClosed] = useState(false);
```

Note the new `'joining'` state — this is the join screen where you enter your name before becoming a `'player'` or `'spectator'`.

### Game Start Integration

When the host starts a game, use the room roster instead of manual names:

```js
function startGame(forcedModeId = null) {
  const gameNames = roomMode === 'host' && roomPlayers.length >= 2
    ? roomPlayers
    : cleanedNames;

  // ... rest of startGame using gameNames
}
```

This is the single integration point. All result builders, playback components, and leaderboard recording work the same — they just receive an array of name strings.

## Room Code & URL

### Generation
```js
function generateRoomCode() {
  const name = names[0] || 'GAME';
  const prefix = name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}
```

### Shareable Link
`https://becknology.vercel.app/runouts?room=BECK-4521`

### QR Code
Use `qrcode-generator` (already loaded from CDN):
```js
const qr = qrcode(0, 'M');
qr.addData(`https://becknology.vercel.app/runouts?room=${roomCode}`);
qr.make();
```

## Channel Setup

### Host Creates Room

```js
function createRoom() {
  if (!_supabase) return;
  const code = generateRoomCode();
  const channel = _supabase.channel(`room:${code}`, {
    config: { broadcast: { self: false } }
  });

  channel.on('presence', { event: 'sync' }, () => {
    // Build roster from presence (see above)
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      setRoomCode(code);
      setRoomMode('host');
      setRoomChannel(channel);
      channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: { type: 'room_created', hostName: names[0] || 'Host' }
      });
    }
  });
}
```

### Player/Spectator Joins

```js
function joinRoom(asPlayer, chosenName) {
  const channel = _supabase.channel(`room:${roomCode}`, {
    config: { broadcast: { self: false } }
  });

  channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
    switch (payload.type) {
      case 'game_start':
        setSpectatorState({ type: 'playing', result: payload.result, step: 0, done: false });
        break;
      case 'step':
        setSpectatorState(prev => prev ? { ...prev, step: payload.step, done: payload.done } : prev);
        break;
      case 'game_reset':
        setSpectatorState({ type: 'waiting' });
        break;
      case 'room_closed':
        setRoomClosed(true);
        _supabase.removeChannel(channel);
        break;
    }
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      setRoomMode(asPlayer ? 'player' : 'spectator');
      if (asPlayer) setPlayerName(chosenName);
      setSpectatorConnected(true);
      setRoomChannel(channel);
      channel.track({
        joinedAt: Date.now(),
        role: asPlayer ? 'player' : 'spectator',
        playerName: asPlayer ? chosenName : null,
      });
    }
  });
}
```

### Host Broadcasts

```js
function broadcastEvent(payload) {
  if (roomMode !== 'host' || !roomChannel) return;
  roomChannel.send({ type: 'broadcast', event: 'game_event', payload });
}
```

Called at each game state change:
- `startGame` → `broadcastEvent({ type: 'game_start', result })`
- `advancePlayback` → `broadcastEvent({ type: 'step', step, done })`
- `revealAll` → `broadcastEvent({ type: 'step', step: totalSteps, done: true })`
- `exitGame` → `broadcastEvent({ type: 'game_reset' })`

### Cleanup

```js
function closeRoom() {
  if (roomChannel) {
    broadcastEvent({ type: 'room_closed' });
    _supabase.removeChannel(roomChannel);
  }
  setRoomMode('none');
  setRoomCode(null);
  setRoomChannel(null);
  setRoomPlayers([]);
  setViewerCount(0);
}
```

## UI Components

### Join Screen (`roomMode === 'joining'`)

Full-screen overlay matching the retro arcade theme. Text input for name, two buttons (Join Game / Just Watch). Name validation inline. Shows "Connected" status indicator.

### Host Room Panel (`roomMode === 'host'`)

Replaces the name input section when a room is open. Shows:
- Room code in pixel font
- Link with copy button
- QR code (~120px)
- Live player roster with green status dots
- Spectator count
- Start Game / Close Room buttons

### Player/Spectator Game View (`roomMode === 'player' | 'spectator'`)

Same playback modal as the host. No control buttons. "📡 LIVE" indicator pulsing red in the corner. Steps appear as the host advances them.

### Room Closed Screen

"Room closed" message with "Start your own session" button.

## Graceful Degradation

- If Supabase unreachable → hide "Start Room" button
- If player can't connect → "Unable to connect" with retry
- If host broadcasts fail → game continues locally for host, spectators miss updates
- If a player disconnects mid-game → removed from roster, their actions auto-resolve via timeouts (relevant when interactive specs are implemented)
- Network hiccups → each `game_start` broadcast includes the full result, so late-joining spectators can catch up

## Styling

- Room panel matches retro arcade theme — pixel font, neon accents, dark background
- QR code styled with neon-colored modules, not default black-on-white
- "📡 LIVE" indicator pulses red like a broadcast light
- "Start Room" button looks like an arcade insert-coin button
- Join screen has the same CRT/scanline aesthetic
- Player roster uses green dots with subtle ping animation for connected players

## What's NOT in This Spec

- No interactive player controls during games — see `spec-interactive-*.md` for that
- No chat or messaging between devices
- No persistent rooms — room dies when host closes it
- No authentication — names are self-entered on the honor system
- No room discovery/listing — direct link only
- No manual name editing by the host while a room is open

## Testing

1. Tab 1: Create room, verify roster shows host name
2. Tab 2: Open room link, enter a name, join as player → verify name appears in Tab 1 roster
3. Tab 3: Open room link, join as spectator → verify spectator count increments on Tab 1
4. Tab 1: Start a game → verify both Tab 2 and Tab 3 see the game
5. Verify step-by-step reveals appear on all tabs as Tab 1 advances
6. Verify result/celebration appears on all tabs
7. Tab 2: Close the tab → verify player disappears from Tab 1 roster
8. Tab 1: Close room → verify Tab 3 sees "Room closed"
9. Tab 1: No room open → verify manual name entry works as before
