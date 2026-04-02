Read `.claude/CLAUDE.md` for context on this repo.

**Depends on:** `spec-interactive-1-infrastructure.md` — build that first.

# Interactive Remaining Modes — Batch Spec

This covers the remaining 10 modes that get interactive upgrades. These are lighter-touch than the Tier 1 modes (Bomb, Rocket, Poker, Stock Market) — most follow a shared "tap to trigger your own reveal" pattern or add a simple pre-game choice.

Build these AFTER the infrastructure and the Tier 1 modes are done.

When `interactiveMode` is false, all modes work exactly as they do today. Zero changes to non-interactive behavior.

---

## Pattern A: "Tap to Trigger Your Reveal"

The simplest interactive upgrade. Instead of the host clicking "Next" to reveal each player's result, the player taps a button on their phone to trigger their own moment. The outcome is unchanged — it's cosmetic agency.

### Shared Implementation

For any step-based mode that reveals one player per step, the interactive loop is:

1. Mode determines whose reveal is next (based on step → player mapping)
2. Host broadcasts `turn_prompt` to that player
3. Player's phone shows a themed action button
4. Player taps → sends `player_action` → host calls `advancePlayback()`
5. Next player's turn

This is identical to the Black Marble pattern from `spec-interactive-2-black-marble.md`. The only difference per mode is:
- The button text/visual (ROLL, FLIP, PULL, DRAW, etc.)
- The private preview (what the player sees on their phone briefly before everyone sees it)

### Timeout

All Tap-to-Reveal modes use a **10-second timeout** with auto-advance.

---

## Mode: Dice Duel 🎲

### Type: Tap to Reveal + Optional Re-roll (Tier 2)

**Basic interaction:** Each player taps "ROLL" on their phone to roll their dice.

**Enhanced interaction (re-roll):** After seeing their 2d6 result, the player can optionally re-roll ONE die. This is a real decision — keep a 5+2=7, or re-roll that 2 and risk getting a 1?

### Flow
1. Player's turn → phone shows "🎲 ROLL" button
2. Player taps → dice animation on their phone → shows their result (e.g., 5 + 2 = 7)
3. Player sees: "Keep 7?" with buttons: [KEEP] [Re-roll die 1 (5)] [Re-roll die 2 (2)]
4. If they tap a re-roll: that die is re-generated, new total shown
5. Player confirms → result reveals on host screen

### Modified Result Builder
- Deal each player their dice + one bonus die per die (4 values total, they keep 2)
- Or simpler: if they re-roll, generate a new random value for that die on the host side when the action arrives

### Player Phone Button
```
🎲 ROLL YOUR DICE
```
Then after rolling:
```
You rolled: ⚄ + ⚁ = 7
[ KEEP ]  [ RE-ROLL ⚁ ]
```

### Timeout
10 seconds for initial roll, 8 seconds for re-roll decision. Auto-keeps on timeout.

---

## Mode: High Card 🂡

### Type: Blind Card Pick (Tier 2)

**Interaction:** Deal 3 cards face-down on each player's phone. They pick one blind.

### Flow
1. All players simultaneously see 3 face-down cards on their phone
2. They tap one to select it → it flips over, showing their card privately
3. They tap "Lock In" → choice sent to host
4. Once all locked in, host reveals all cards in the normal step-based playback

### Modified Result Builder
- Deal 3 cards per player instead of 1
- After choices received, use chosen cards
- Auto-pick the highest card on timeout (random if face-down/unknown)

### Player Phone UI
```
🂠 PICK A CARD (any card)
┌────┐  ┌────┐  ┌────┐
│ ?  │  │ ?  │  │ ?  │
│    │  │    │  │    │
└────┘  └────┘  └────┘
⏱️ 12 seconds
```

---

## Mode: Coin Gauntlet 🪙

### Type: Tap to Flip + Call It

**Interaction:** Each player taps to flip each of their 5 coins. Before each flip, they can "call it" (heads or tails). Calling doesn't change the result but tracks accuracy as a fun stat.

### Flow
1. Player's turn (or all simultaneously) → phone shows coin and "FLIP" button
2. Before flipping, they can tap "Heads" or "Tails" to call it
3. Tap "FLIP" → coin animation → result shown
4. Repeat for all 5 flips
5. After all flips, total heads + call accuracy shown

### Player Phone UI
```
🪙 Flip 3 of 5
Call it: [HEADS] [TAILS]
[ FLIP 🪙 ]
```

### Timeout
5 seconds per flip. Auto-flips without a call on timeout.

---

## Mode: Slot Machine 🎰

### Type: Tap to Pull

**Interaction:** Each player taps "PULL" on their phone to spin their slot machine reels.

### Flow
1. Player's turn → phone shows slot machine with "PULL" lever
2. Player taps → reels spin on their phone → result shown privately first
3. Result reveals on host screen
4. Next player's turn

### Player Phone UI
```
🎰 YOUR TURN
[ PULL THE LEVER 🎰 ]
```

### Timeout
10 seconds. Auto-pulls on timeout.

---

## Mode: Random Number #️⃣

### Type: Tap to Stop

**Interaction:** Player's phone shows a rapidly cycling number. They tap "STOP" to lock in their number. The number is pre-determined — the cycling is purely visual — but tapping makes it feel like you chose it.

### Flow
1. Player's turn → phone shows cycling number display (digits rapidly changing)
2. Player taps "STOP" → number locks in with a satisfying animation
3. Number reveals on host screen

### Player Phone UI
```
#️⃣ YOUR NUMBER
┌──────────────┐
│     73       │ ← cycling rapidly
└──────────────┘
[ STOP ✋ ]
```

### Timeout
8 seconds. Auto-stops on timeout.

---

## Mode: Wheel Spinner 🎡

### Type: Tap to Spin

**Interaction:** One player gets the "SPIN" button each game (rotates). They tap to spin the wheel for everyone.

### Flow
1. A random player is chosen as the spinner
2. Their phone shows a big "SPIN THE WHEEL" button
3. They tap → wheel spins on host screen and all phones
4. Result reveals when wheel stops

### Player Phone UI
```
🎡 YOU'RE THE SPINNER
[ SPIN THE WHEEL 🎡 ]
```

Only one player gets this button. Everyone else watches.

### Timeout
10 seconds. Auto-spins on timeout.

---

## Mode: Horse Race 🏇

### Type: Lane Pick + Tap to Whip (Tier 2)

**Pre-game interaction:** Each player picks which lane they want (from the available positions).

**During race interaction:** Each player gets 2 "WHIP" taps they can use during the race. When used, their horse is guaranteed to advance on the next turn (instead of random).

### Pre-Game Flow
1. Host broadcasts lane options with names/colors
2. Players pick their lane on their phone (draft order, first come first served)
3. Once all picked, race begins

### During Race Flow
1. Race plays turn by turn on host screen
2. Each player's phone shows their horse position and 2 whip icons
3. Tapping "WHIP" sends the action → their horse advances next turn guaranteed
4. After using both whips, the button disappears

### Modified Result Builder
- Positions still assigned (but now player-chosen)
- Turn generation modified: if a player whipped, they advance that turn regardless of random roll
- Host processes whip actions between turns

### Player Phone UI
```
🏇 Your horse: Lane 2
Position: 5 / 12

[ 🏇 WHIP! ] (2 remaining)
```

### Timeout
5 seconds per lane pick. Whips have no timeout (use them or don't).

---

## Mode: Plinko 📍

### Type: Choose Drop Position (Tier 2)

**Interaction:** Each player picks which column to drop their ball from at the top of the peg board.

### Flow
1. Player's turn → phone shows the top of the peg board with ~9 drop positions
2. They tap a column to select it
3. They tap "DROP" → ball bounces down in real-time on host screen
4. Next player's turn

### Modified Result Builder
- `startX` parameter becomes player-chosen instead of random
- Everything downstream (ball path, slot landing) still random from that starting position

### Player Phone UI
```
📍 CHOOSE YOUR DROP POINT
  ↓   ↓   ↓   ↓   ↓   ↓   ↓
  1   2   3   4   5   6   7
         [selected: 4]
[ DROP 📍 ]
```

### Timeout
10 seconds. Auto-picks center column on timeout.

---

## Mode: Space Invaders 👾

### Type: One-Time Shield (Tier 2)

**Interaction:** Each player gets a single "SHIELD" button. When the turret aims at their alien, they have ~3 seconds to tap SHIELD. If they tap in time, the laser bounces off and the turret picks someone else.

### Flow
1. Normal step-based reveal — turret targets an alien each step
2. Before firing, host broadcasts a 3-second "targeting" warning
3. The targeted player's phone shows a big "SHIELD 🛡️" button (if they haven't used it)
4. If they tap within 3 seconds → laser deflects, turret picks a new random target from remaining unshielded aliens
5. If they don't tap → they're destroyed as normal
6. Shield is one-use-only per game

### Modified Result Builder
- The elimination order needs to be mutable — if a shield is used, re-pick the target
- On the host side: maintain a list of shielded/unshielded players, re-roll target if shielded

### Player Phone UI

When targeted:
```
👾 TURRET IS TARGETING YOU!
   ⚡ 2.3 seconds ⚡

[ SHIELD 🛡️ ] (1 use remaining)
```

When not targeted:
```
👾 Turret targeting: Nick
   You have 1 shield remaining
```

### Timeout
3 seconds (short — reaction-based). Auto-hit on timeout.

---

## Mode: Battle Royale 🎯

### Type: Directional Movement (Tier 3)

**Interaction:** Each phase before the zone shrinks, all surviving players choose a direction to move on their phone.

### Flow
1. Host broadcasts "ZONE SHRINKING" warning with new zone info
2. All surviving players get 6 seconds to pick a direction (N/S/E/W or tap a point)
3. Player positions update based on their choices
4. Zone shrinks
5. Player furthest outside the zone is eliminated
6. Repeat

### Modified Result Builder
- Zone shrink pattern is still pre-generated (center coordinates and radii)
- Player positions are now dynamic — updated each phase based on player input
- Elimination recalculated after positions update
- If a player doesn't choose, they stay in place

### Player Phone UI
```
🎯 ZONE SHRINKING!
Move to stay in the safe zone

      [  ↑  ]
  [ ← ] [STAY] [ → ]
      [  ↓  ]

Your position: (34, 56)
Zone center: (45, 50)
⏱️ 4 seconds
```

A mini-map on the phone showing the player's position relative to the zone would be ideal but is a nice-to-have.

### Timeout
6 seconds. Auto-stays-in-place on timeout.

---

## Implementation Priority Within This Spec

Build these in order of effort (easiest first):

1. **RNG, Wheel, Slots, Coins** — Pure Tap-to-Reveal pattern, minimal changes
2. **High Card** — Simple blind pick, small result builder change
3. **Dice** — Tap to Roll + optional re-roll
4. **Plinko** — Column picker, slightly more UI
5. **Horse Race** — Lane pick + whip mechanic
6. **Space Invaders** — Shield reaction mechanic (needs targeting pause)
7. **Battle Royale** — Most complex (spatial movement, dynamic positions)

## Changes Summary

| Mode | Interaction Type | Result Builder Change | Difficulty |
|------|-----------------|----------------------|------------|
| Dice | Roll + re-roll | Re-roll generates new die value | Easy-medium |
| High Card | Blind card pick | Deal 3, use chosen | Easy |
| Coin | Flip + call it | Track call accuracy (cosmetic) | Easy |
| Slots | Tap to pull | None | Easy |
| RNG | Tap to stop | None | Easy |
| Wheel | Tap to spin | None | Easy |
| Horse Race | Lane pick + whip | Whips modify turn outcomes | Medium |
| Plinko | Choose drop position | startX becomes player-chosen | Easy-medium |
| Space Invaders | Shield reaction | Re-roll target on shield | Medium |
| Battle Royale | Directional movement | Dynamic positions per phase | Hard |
