# Spec: Host Plays Too

**Status:** Ready to implement
**Depends on:** `spec-interactive-1-infrastructure.md` (interactive mode must be implemented first)
**Priority:** High — without this, the person running the game on the TV can't participate

---

## Problem

The host (the person who creates the room and runs the game on the big screen) is currently excluded from interactive gameplay. They can start games and click "Next" to advance, but when interactive modes ask players to take actions on their phones (draw marbles, eject from rockets, pass bombs, pick stocks, etc.), the host has no way to participate. They're stuck as a game master watching everyone else play.

This sucks because in a small group (4 people), losing one player to "host duty" is a big deal.

## Solution

Make the host a full player in the game. The host should:
1. Be included in the game roster automatically (they're always "in the room")
2. Be able to take interactive actions directly from the host screen (no phone needed)
3. Still retain all host controls (start game, next step, close room, etc.)

---

## Implementation

### 1. Host Registers as a Player

When the host creates a room, they should automatically be treated as a player.

**In `createRoom()`:**
- After the channel subscribes successfully, track the host's presence just like any other player:
  ```
  channel.track({ joinedAt: Date.now(), role: 'player', playerName: names[0] })
  ```
- Note: The channel is created with `{ broadcast: { self: false } }`, so the host won't receive its own broadcasts. This is fine — the host doesn't need to receive game events it sends. But for presence, Supabase presence `sync` events DO include the local client's presence state, so the host WILL appear in its own `presenceState()`. The presence sync handler already iterates all presence entries, so the host will automatically appear in `joinedPlayers`.

**Set `playerName` state on the host:**
- When creating the room, also call `setPlayerName(names[0])` so the host has a `playerName` value. This is needed for action handlers to identify which player is acting.

### 2. Host Gets Interactive UI

The host needs a `PlayerActionBar` (or equivalent) rendered on the host screen when it's their turn or when a choice is needed.

**Add a `HostActionBar` section to the host's game view:**
- When `interactiveMode` is true AND there's a `pendingAction` targeting the host (or it's a broadcast action like "everyone eject now"), render the action UI inline on the host screen.
- Position it prominently — below the main playback area, above the host controls. Use the same styling as `PlayerActionBar` so it feels consistent.
- The host's action bar should be visually distinct from the game controls (start/next/reveal). Maybe a colored border or a subtle label like "YOUR TURN" to differentiate it from host-only controls.

**Where to render it:**
- In the host's playing state view (where the playback stage and step controls are shown), add a conditional block:
  ```
  {interactiveMode && pendingAction && pendingAction.forPlayer === playerName && (
    <HostActionSection pendingAction={pendingAction} onAction={handleHostAction} playerName={playerName} />
  )}
  ```
- Or if `pendingAction` is a broadcast (all players act simultaneously, like rocket eject), check if the host hasn't acted yet.

### 3. Host Action Handling

The host can't use `sendPlayerAction()` (which broadcasts over the channel) because the host created the channel with `self: false` and the host's own `player_action` listener wouldn't fire. Instead, the host should call the action handler directly.

**Create `handleHostAction(action)`:**
```javascript
function handleHostAction(action) {
  if (!playerName) return;
  // Call the action handler directly instead of going through broadcast
  if (currentActionHandler.current) {
    currentActionHandler.current({ playerName: playerName, ...action });
  }
}
```

This is the key insight — remote players send actions via broadcast → the host's `player_action` listener → `currentActionHandler`. The host skips the broadcast and calls `currentActionHandler` directly. Same handler, same data shape, no network round-trip.

### 4. Host Presence in Room Roster

The presence sync handler in `createRoom()` already builds the `joinedPlayers` object from all presence entries. Since the host now tracks presence with `role: 'player'`, the host will automatically appear in `joinedPlayers` and in the viewer count.

**One thing to watch:** The `interactiveMode` flag is set when `Object.keys(players).length > 0`. With the host as a player, `interactiveMode` will be `true` as soon as the room is created (the host is always present). This is actually correct — even if nobody else joins, the host is an interactive player. But make sure this doesn't break solo play (no room active). Since `interactiveMode` is only checked when `roomMode === 'host'` and a room exists, solo play (no room) is unaffected.

### 5. Game Roster Integration

Currently `cleanedNames` drives the game. With the room active, the roster should be built from `roomPlayers` (presence-based). The host is in presence, so they're in the roster. No special-casing needed here — this should just work once the host tracks presence.

**Verify:** When `startGame()` runs, the names used for the outcome should include the host. If the code uses `cleanedNames` (from the name input fields), the host's name (`names[0]`) is already there. If it uses `roomPlayers` (from presence), the host is now in presence. Either way, the host is included.

### 6. Turn Management

For turn-based interactive modes (Black Marble, Poker Draft, Stock Market draft), the turn manager iterates through players. The host's name is in the player list, so when it's the host's turn:
- The turn manager sets `pendingAction` for the host's name
- The host screen shows the action bar (from step 2)
- The host taps/clicks their action
- `handleHostAction` fires (from step 3)
- The action handler processes it identically to a remote player's action

For simultaneous modes (Rocket Eject, Bomb pass when you're the holder), the action bar appears for the host whenever they need to act.

### 7. Private Information on Host Screen

Some interactive modes show private info on the player's phone (e.g., Poker Draft shows your dealt cards only to you). On the host screen (which is on the TV), this is tricky — everyone can see it.

**Approach: "Look away" honor system with a reveal tap.**
- When the host has private info (like their poker hand), show it face-down / hidden by default with a "Tap to peek" button.
- The host peeks, makes their choice, and the cards go back face-down.
- This isn't cryptographically secure but it matches the casual party game vibe. Nobody's going to cheat at chore selection.
- Add a brief visual cue (screen flash or overlay) when the host is peeking so others know to look away.

### 8. Host Controls Still Work

The host retains all existing controls:
- **Start Game** button — unchanged
- **Next Step** button — unchanged, advances the game for everyone
- **Reveal All** button — unchanged
- **Random Game** button — unchanged
- **Close Room** button — unchanged
- **Room code / QR display** — unchanged

These controls sit in a separate section from the action bar. The action bar is for "player" actions, the controls are for "host" actions. Both coexist on the same screen.

---

## UI Layout (Host Screen During Interactive Game)

```
┌─────────────────────────────────┐
│         PLAYBACK STAGE          │
│    (game animation / visuals)   │
│                                 │
├─────────────────────────────────┤
│     ★ YOUR TURN / YOUR MOVE ★   │
│  ┌─────────────────────────┐    │
│  │   [DRAW]  or  [EJECT]   │    │  ← Host's player action bar
│  │   or [Pick a stock] etc  │    │
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  [Next Step]  [Reveal All]      │  ← Host-only game controls
│  Room: BECK-4821 • 4 players    │
└─────────────────────────────────┘
```

---

## Changes Summary

| Area | Change |
|------|--------|
| `createRoom()` | Track host presence as player; set `playerName` |
| Host game view | Add action bar for interactive actions |
| New function | `handleHostAction()` — calls `currentActionHandler` directly |
| `sendPlayerAction()` | No change (still for remote players only) |
| Presence sync handler | No change (already picks up all presence entries) |
| Private info modes | Add "peek" mechanic for host on shared screen |
| Host controls | No change — coexist with action bar |
| Solo play | No change — only applies when room is active |

---

## Testing

1. **Host creates room → host appears in player roster immediately**
2. **Black Marble interactive → host gets "DRAW" button on their turn, draws marble, game advances**
3. **Rocket Eject → host sees EJECT button during flight, can eject like any other player**
4. **Bomb → when bomb is passed to host, host sees pass options on the TV screen**
5. **Poker Draft → host sees "Tap to peek" for their cards, can select and confirm**
6. **Stock Market → host can pick a stock during draft, sees sell button during chart**
7. **Host still controls game flow — Next Step, Reveal All, Start Game all work as before**
8. **Solo play (no room) — zero behavior change, everything works as before**
9. **Mixed room: 2 remote players + host — all three participate in interactive modes**
10. **Host disconnects / closes room — presence cleans up, game doesn't break**
