Read `.claude/CLAUDE.md` for context on this repo.

# Game Interface Overhaul — Unique UI Per Game Mode

## Context

The runouts app (`apps/runouts/index.html`) has 10 game modes. The themed art and colors are already in place (pixel sprites, background textures, arcade bezel). But the actual **game interfaces** — how cards are dealt, how results are displayed, the layouts, the fonts — are still largely identical across all modes. Every game uses the same top-to-bottom flow, the same result card grid, the same font.

This spec makes each game feel like its own unique arcade cabinet. Different layouts, different fonts, different ways of displaying players and results. When you open a game, it shouldn't just be a different *color* — it should be a different *game*.

## Google Fonts to Load

Add these Google Fonts imports (one combined `<link>` tag for performance). Each game gets its own font:

```
VT323              — Hold'em (retro terminal monospace)
Orbitron            — PLO (futuristic/digital)
Source Code Pro     — Random Number (clean terminal mono)
Bungee              — Wheel Spinner (bold game-show block letters)
MedievalSharp       — Dice Duel (fantasy RPG)
Rye                 — High Card (western slab serif)
Pirata One          — Coin Gauntlet (pirate/nautical)
Cinzel Decorative   — Black Marble (mystical/ornate)
Monoton             — Slot Machine (neon outline display)
Press Start 2P      — Horse Race (already loaded — LED scoreboard)
```

Each theme class (`.theme-holdem`, `.theme-plo`, etc.) should set `font-family` to its specific font for headings and key UI text. Body/small text can fall back to the system font for readability.

---

## Per-Game Interface Specs

### 1. Texas Hold'em (`holdem`) — Poker Table Experience
**Font:** VT323 (retro terminal mono)

**Layout — Poker Table:**
- Replace the current top-to-bottom card grid with an **oval poker table layout**
- Green felt background for the table area (CSS radial gradient: dark green edges, slightly lighter green center, like a real felt table)
- Players positioned **around the oval** — 2 players on opposite sides (or 3-4 distributed around for more players)
- Each player's position shows: their name, their hole cards (face down initially, revealed during play), and their current hand strength text
- **Community cards in the center** of the oval table, dealt in the standard poker layout: 3 flop cards together, then turn, then river
- A "pot" indicator in the center above the community cards showing the stakes text
- Dealer button (small "D" chip) next to one player position

**Card Styling:**
- Cards should look like actual playing cards — white/cream background, rounded corners, suit symbol in the corner, rank in large text
- Red suits (hearts, diamonds) in red, black suits (spades, clubs) in dark gray/black
- Face-down cards: dark green card back with a subtle pattern (CSS repeating gradient)
- Card reveal: flip animation (CSS 3D transform rotateY)

**Result Display:**
- Keep the table layout for results — players stay in their positions
- Winning player's area glows gold, losing player's area dims
- Hand ranking text appears below each player's cards ("Two Pair, Kings and Sevens")
- The selected player's position gets the big verdict treatment

**Progress/Reveal Flow:**
- Stage labels in poker terminology: "PREFLOP" → "FLOP" → "TURN" → "RIVER" → "SHOWDOWN"
- Win percentages update at each stage next to each player position

---

### 2. PLO (`plo`) — Glitch Casino Table
**Font:** Orbitron (futuristic geometric)

**Layout:**
- Same oval poker table concept as Hold'em, but with visual corruption
- The table itself has glitch artifacts — the felt color occasionally shifts hue, border segments randomly offset
- 4 hole cards per player arranged in a 2x2 grid at each table position (these are wider than Hold'em positions)
- Community cards in center, same poker flow

**Card Styling:**
- Cards have a slight chromatic aberration effect — a faint red/blue offset shadow on each card
- On reveal, cards briefly "glitch" (shake + color split) before resolving
- The 2-card selection that makes the final hand gets highlighted with a neon border

**Key Difference from Hold'em:**
- More chaotic energy — the table feels less stable
- Orbitron font gives it a digital/cyberpunk casino feel vs Hold'em's retro terminal feel
- Glitch effects intensify as the hand progresses (more visual corruption by the river)

---

### 3. Random Number (`rng`) — Full Terminal Interface
**Font:** Source Code Pro (clean monospace)

**Layout — Terminal Window:**
- The entire game display should look like a terminal/command-line window
- Dark background with a title bar at the top: `RUNOUTS_RNG v2.4.1 — [session_id]`
- All output rendered as terminal text, line by line, with a blinking cursor
- Each player's number reveal is a line of output:
  ```
  > PROCESSING player_1... [████████████████░░░░] 82%
  > RESULT: Beck = 73
  > PROCESSING player_2... [██████████████████░░] 91%
  > RESULT: Sam = 45    ← SELECTED
  ```
- Numbers cycling is shown as rapidly changing digits at the cursor position
- A fake progress bar (ASCII art) fills up during each player's reveal

**Result Display:**
- Final results shown as a formatted terminal table:
  ```
  ┌─────────┬───────┬──────────┐
  │ PLAYER  │ VALUE │ STATUS   │
  ├─────────┼───────┼──────────┤
  │ Beck    │   73  │ SAFE     │
  │ Sam     │   45  │ SELECTED │
  └─────────┴───────┴──────────┘
  ```
- Use CSS to render the table borders (don't use actual ASCII — use styled divs that look like terminal output)
- The selected player's row has a highlighted/inverse background (light text on dark vs dark on light)

---

### 4. Wheel Spinner (`wheel`) — Game Show Stage
**Font:** Bungee (bold block letters)

**Layout — Game Show:**
- Wheel in the upper center, large and dominant (at least 60% of the modal width)
- Below the wheel: a **contestant podium row** — each player stands behind a styled podium block with their name
- Podiums are colored to match their wheel segment
- The selected player's podium lights up / elevates when the wheel lands

**Wheel Styling:**
- Thicker segment borders, bolder colors
- A metallic gold center pin / pointer at the top (CSS triangle + gradient)
- The pointer bounces slightly on landing (CSS animation)
- Segment labels (player names) written along the curve if possible, or just color-coded

**Result Display:**
- Winner/loser podium animation — selected player's podium drops down or gets a spotlight
- Big game-show-style text above: the verdict message in Bungee font
- Confetti explosion from the podium area

---

### 5. Dice Duel (`dice`) — RPG Battle Screen
**Font:** MedievalSharp (fantasy serif)

**Layout — Turn-Based RPG:**
- Two-sided battle layout (like Final Fantasy / classic RPG)
- Players on the left side in a vertical stack (like a party lineup)
- Dice rolling area in the center (the "battlefield")
- Each player has an **RPG character card**: name, a simple health/power bar, and their roll result

**Character Cards:**
- Styled like RPG stat cards — dark parchment background, ornate thin border
- Player name in MedievalSharp at the top
- A colored HP-style bar that fills based on their roll (higher roll = more filled = more powerful)
- Roll result shown as "⚔️ ATK: 11" or "🛡️ DEF: 4" flavor text

**Dice Display:**
- Large pixel-art style dice in the center
- Dice have a stone/carved look — slightly textured, not clean white
- Rolling animation: dice bounce and tumble (CSS keyframe with rotation + translate)

**Result Display:**
- RPG battle result: "BECK dealt 11 damage!" / "SAM was defeated!"
- Losing player's HP bar drains to zero with an animation
- Victory fanfare text in fantasy style

---

### 6. High Card (`high-card`) — Western Showdown
**Font:** Rye (western slab serif)

**Layout — Duel Format:**
- Two players face off on opposite sides of the screen (left vs right)
- A card deck in the center, face down
- Each side has: player name in big Rye font, a "holster" area where their card will appear
- For 3+ players: arrange in a circular standoff layout

**Card Draw:**
- Cards draw from the center deck, fly to each player's position
- Cards land face-down, then flip one at a time (dramatic pause between each reveal)
- The flip should feel like a slow-motion showdown moment

**Result Display:**
- "WANTED" poster frame around the loser — aged parchment colors, rough border, "WANTED: DEAD OR ALIVE" text above their name
- Winner gets a sheriff's badge overlay
- Dust clears (particle animation fades out) to reveal the final result

---

### 7. Coin Gauntlet (`coin-flips`) — Pirate Treasure Map
**Font:** Pirata One (pirate script)

**Layout — Treasure Map Path:**
- Instead of a grid of H/T results, display the 5 flips as **stops on a treasure map path**
- A dotted/dashed path winds across the modal, with 5 waypoints (circles) along it
- Each waypoint reveals H or T as the player "progresses" along the map
- Players take parallel paths — each player has their own trail in a different color

**Coin Styling:**
- Gold doubloon aesthetic — metallic gold gradient, embossed look
- "H" side has a crown or skull icon, "T" side has a ship or anchor
- Coin flip animation: 3D rotateX spin

**Result Display:**
- End of the path: a treasure chest (for the winner) or a plank (for the loser)
- Player with most heads "found the treasure"
- Player with fewest heads "walked the plank"
- Parchment-style result summary with wax-seal styling

---

### 8. Black Marble (`black-marble`) — Mystical Séance
**Font:** Cinzel Decorative (ornate/mystical)

**Layout — Séance Circle:**
- Players arranged in a **circle** like sitting around a séance table
- A mystical vessel/bag in the center (CSS-drawn crystal bowl or dark orb)
- Each player draws from the center, and their marble appears at their position
- Connecting lines between player positions (like constellation lines)

**Marble Styling:**
- Marbles rendered as glossy spheres — CSS radial gradient with a shine/highlight spot
- Gold marble: warm radial gradient with sparkle
- Black marble: dark with a sinister glow (red or purple rim light)
- White/clear marble: glass-like with refraction effect

**Draw Animation:**
- Marble rises from the central vessel, floats to the player's position
- Ethereal trailing particles follow the marble's path

**Result Display:**
- "THE FATES HAVE CHOSEN" / "THE STARS HAVE SPOKEN" in Cinzel Decorative
- The selected player's circle position glows with cosmic energy
- Constellation lines pulse outward from the chosen player

---

### 9. Slot Machine (`slots`) — Full Vegas Machine
**Font:** Monoton (neon outline display)

**Layout — Slot Machine Interface:**
- The entire modal should look like the front of a slot machine
- Three reel windows in the center with a chrome/metallic frame (CSS gradient border: light gray → dark gray, giving a 3D metal look)
- A pull lever on the right side (decorative, CSS-drawn)
- Pay table above the reels showing what combinations mean
- Player results below in a "credits" display area

**Reel Styling:**
- Each reel window has a slight inner shadow for depth
- Symbols should be larger and bolder than current
- Reels spin vertically (CSS animation translateY) with blur during spin, sharp on stop
- Winning combinations get a flashing highlight border

**Result Display:**
- "JACKPOT!!!" with massive neon Monoton text if the winner has a triple
- "BUST" with a dimming/powering-down effect for the loser
- Credits counter that rapidly counts up/down to final values
- The entire machine "shakes" slightly on big wins (CSS animation)

---

### 10. Horse Race (`horse-race`) — Racetrack Broadcast
**Font:** Press Start 2P (LED scoreboard — already loaded)

**Layout — Racetrack + Broadcast:**
- Top half: the actual **racetrack** — horizontal lanes with colored horses, running left to right toward a finish line
- Bottom half: a **broadcast overlay** — like a TV sports broadcast, with a scoreboard, race call text, and position tracker

**Track Styling:**
- Green turf with white lane markers (dashed lines between lanes)
- A finish line on the right edge (checkered pattern)
- Horse positions shown as emoji or pixel-art sprites moving along their lane
- Track has a slight perspective (narrower at the top) for depth

**Broadcast Overlay:**
- Race call text scrolls in a ticker: "AND DOWN THE STRETCH THEY COME... BECK TAKES THE LEAD..."
- Position tracker shows 1st, 2nd, 3rd, 4th in a column with live updates
- LED scoreboard styling — everything in Press Start 2P, displayed as if on a dot-matrix board

**Result Display:**
- Photo finish banner across the track
- Final standings shown as a race results board (1st place, 2nd place, etc.)
- Winner gets a wreath/garland overlay and "WIN" in flashing LED text

---

## Implementation Notes

### Font Loading
Load all fonts in a single combined Google Fonts `<link>` tag:
```html
<link href="https://fonts.googleapis.com/css2?family=VT323&family=Orbitron:wght@400;700&family=Source+Code+Pro:wght@400;600&family=Bungee&family=MedievalSharp&family=Rye&family=Pirata+One&family=Cinzel+Decorative:wght@400;700&family=Monoton&display=swap" rel="stylesheet">
```

### Theme Font Application
Each `.theme-*` class sets font-family for headings and key display text. Keep body/small text in the system font for readability:
```css
.theme-holdem { --mode-font: 'VT323', monospace; }
.theme-plo { --mode-font: 'Orbitron', sans-serif; }
/* etc. */
```
Then apply: `.theme-* h1, .theme-* h2, .theme-* .mode-title, .theme-* .verdict-text { font-family: var(--mode-font); }`

### Layout Strategy
- The current playback components (`ModeHeader`, `PlayerCard`, `Celebration`, etc.) render the same structure for every mode
- Create **mode-specific layout wrapper components** or use conditional rendering based on `modeId` to switch between layouts
- For example: poker games use `PokerTableLayout`, dice uses `RPGBattleLayout`, RNG uses `TerminalLayout`
- Each layout wrapper takes the same props (players, results, step, etc.) but renders them completely differently
- Shared logic stays shared — only the visual rendering changes

### Result Card Overhaul
- Currently all games use the same `.verdict-card` style
- Each theme should override `.verdict-card` completely:
  - Hold'em/PLO: poker position cards around the table
  - RNG: terminal table rows
  - Wheel: game show podiums
  - Dice: RPG character stat cards
  - High Card: wanted posters vs sheriff badges
  - Coin: parchment treasure cards
  - Marble: séance circle position cards
  - Slots: credits display with machine frame
  - Horse: race results scoreboard rows

### Card Component Overhaul (Poker Modes)
- Playing cards currently render as simple divs with suit and rank text
- Restyle them to look like actual playing cards:
  - White/cream background with rounded corners and subtle shadow
  - Rank in top-left corner (large) and bottom-right corner (rotated 180°)
  - Suit symbol below the rank in each corner
  - Center area has a larger suit symbol or pip pattern
  - Red for hearts/diamonds, near-black for spades/clubs
  - Card back: dark pattern for face-down cards (green for Hold'em, purple for PLO)

### Performance
- Loading 9 additional Google Fonts adds some weight. Use `display=swap` so text renders immediately with fallbacks.
- Complex layouts (poker table oval, treasure map path) should use CSS grid/flexbox, not absolute positioning everywhere.
- Conditional rendering means only one layout is in the DOM at a time — no performance concern from having 10 different layouts defined.

### Don't Break Things
- All game logic stays exactly the same — we're only changing how results are displayed
- The reveal/step flow stays the same — we're just rendering each step differently
- The celebration/sad overlays can be customized per theme but should still trigger on the same conditions
- Mobile responsiveness: the fancy layouts (poker table oval, RPG battle sides) should gracefully collapse to simpler layouts on small screens

## Quality Bar

When you're done, no two games should look like they share the same interface. Someone watching over your shoulder should be able to tell which game is being played purely from the layout and typography — without seeing the game name. Each game should feel like its own app within the app.

Commit and push when done.
