Read `.claude/CLAUDE.md` for context on this repo.

# Game Mode Art & Arcade Cabinet Screen Treatment

## Context

The runouts app (`apps/runouts/index.html`) already has a great theme system — each of the 10 game modes has card-level hints on the main page and color-themed playback modals. The main page also has rich decorative art: CSS pixel sprites (space invader, coin, heart, joystick), a synthwave perspective grid, twinkling starfield, CRT scanlines, and a vignette.

**The problem:** When you open a game's playback modal, the art disappears. The modals have the right *colors* per theme but no *art*. They feel like colored boxes instead of arcade cabinet screens. The main page feels like you're standing in an arcade — the game modals should feel like you've walked up to a specific cabinet and are staring at its screen.

## What to Build

For each of the 10 game modes, add **decorative art and environmental elements** inside the playback modal that:

1. Are unique to that game's theme
2. Use the same CSS pixel-art and animation techniques as the main page (box-shadow sprites, repeating gradients, keyframe animations, pseudo-elements)
3. Don't interfere with the game's functional UI (pointer-events: none, z-index layered behind content)
4. Make the modal feel like its own self-contained world — an arcade cabinet screen for that specific game

Also add an **arcade cabinet frame** effect to the modal itself — a subtle bezel/border treatment that makes every game modal feel like you're looking at an arcade screen. This should be a shared base that all themes inherit.

## Shared: Arcade Cabinet Screen Frame

Wrap the playback modal content in a visual frame that suggests an arcade monitor:

- Thick rounded bezel border (dark gray/charcoal gradient) with a subtle inner shadow
- Very slight CRT curvature (the `.crt-screen` class already exists — make sure it's applied)
- Scanlines overlay inside the modal (the `.crt-scanlines` pattern already exists)
- A thin colored LED strip at the top of the bezel that uses the mode's accent color (like the colored trim on real arcade cabinets)
- Optional: tiny "INSERT COIN" or mode-specific text at the bottom of the bezel in a dim pixel font

## Per-Game Art Specs

### 1. Texas Hold'em (`holdem`) — "Green Phosphor Terminal"
**Background art:**
- CSS pixel art of a simple green-on-black poker chip in one corner (box-shadow sprite, same technique as the main page's pixel coin but in green monochrome)
- Faint horizontal scrolling text at the bottom: a repeating ticker of fake poker stats ("DEALER WINS: 47% ● POT ODDS: 3.2:1 ●") in dim green, like an old terminal status bar
- Blinking block cursor element in the corner (pure CSS animation)
- The existing green scanline overlay should be more pronounced inside this modal

### 2. PLO (`plo`) — "Glitch Casino"
**Background art:**
- CSS pixel art of a glitched/corrupted card symbol — a spade or heart that's been "broken" (offset shadow layers in magenta and cyan, like a bad VHS signal)
- Random glitch bars — thin horizontal lines that occasionally flash across the modal background (CSS animation, 2-3 bars at a time, infrequent)
- Chromatic aberration effect on the bezel border itself — the cabinet frame looks like it's malfunctioning
- Static/noise texture in the background (repeating-gradient trick for a subtle grain effect)

### 3. Random Number (`rng`) — "The Matrix Terminal"
**Background art:**
- Falling number rain columns in the background (CSS animation using repeating-linear-gradient with vertical movement, multiple columns at different speeds — NOT canvas, keep it lightweight CSS-only)
- A pixel art terminal prompt icon (">_") blinking in a corner
- Grid/graph paper pattern behind the number display area, like a computation workspace
- Scrolling binary or hex at the very bottom edge (CSS marquee-style animation, very dim)

### 4. Wheel Spinner (`wheel`) — "Neon Carnival Game Show"
**Background art:**
- Marquee chase lights around the inside edge of the modal frame (CSS animated dots in gold and pink, chasing clockwise — extend the technique from the card hint)
- CSS pixel art of a star/starburst in one corner — game-show style (gold and white)
- Spotlight cone effect from the top — a triangular radial gradient suggesting a stage light pointed down at the wheel
- Tiny pixel art light bulbs along the top of the cabinet bezel that alternate on/off

### 5. Dice Duel (`dice`) — "Dungeon Crawler RPG"
**Background art:**
- CSS pixel art torches on each side of the modal — flickering amber/orange flames (animated box-shadow sprites that alternate between 2-3 frame positions, like the main page's float animations but with color shifts)
- Stone wall texture background (repeating-linear-gradient to create a brick/stone block pattern in dark grays and browns)
- A pixel art skull decoration near the bottom center
- Faint torch glow — radial gradients in warm orange on each side, pulsing slightly (like `.torch-flicker` on the card hints, but bigger)
- Optional: pixel art treasure chest or potion bottle as corner decoration

### 6. High Card (`high-card`) — "Wild West Showdown"
**Background art:**
- CSS pixel art of a sheriff's star badge in one corner (gold/bronze box-shadow sprite)
- Dust particles drifting slowly across the screen (small dots with slow horizontal + downward CSS animation, warm sepia tones)
- A "WANTED" poster frame effect on the player cards (rough double-border, slightly rotated, aged paper color)
- Subtle desert/sand pattern at the bottom (repeating gradient in warm tan/brown)
- Optional: pixel art cactus silhouettes at the bottom edges

### 7. Coin Gauntlet (`coin-flips`) — "Pirate Treasure Hunt"
**Background art:**
- CSS pixel art of a treasure chest (box-shadow sprite in browns and golds, similar technique to the main page's pixel coin but bigger)
- Ocean wave pattern at the very bottom of the modal (animated repeating gradient in blues, similar to the `.card-hint-coin-flips` wave-drift but more prominent)
- Pixel art compass rose in one corner
- Subtle water ripple effect (animated radial gradient that expands and fades, repeated)
- Scattered tiny pixel gold coins as floating decorations (use the existing `.pixel-coin` class, just position several inside the modal at different sizes)

### 8. Black Marble (`black-marble`) — "Cosmic Fortune Teller"
**Background art:**
- Constellation lines connecting random points in the background (thin lines between positioned dots — CSS or SVG, NOT canvas)
- Enhanced starfield (more stars, brighter, more variation than the main page)
- CSS pixel art of a crystal ball in the center-bottom area (purple and indigo glowing orb using layered box-shadows and radial gradients)
- Nebula clouds — soft radial gradients in purple and indigo that slowly drift (CSS animation on background-position)
- Mystical sparkle particles (tiny dots that fade in and out at random positions, CSS animation with varying delays)

### 9. Slot Machine (`slots`) — "Vegas Neon Strip"
**Background art:**
- This should be the most visually intense modal of all 10
- Neon sign border treatment — the cabinet frame glows with animated neon tubing effect (multiple colored box-shadows that pulse)
- CSS pixel art of a cherry and a "7" symbol in the corners (classic fruit machine icons)
- "JACKPOT" text in the background, very dim, in large neon-tube styling, slowly pulsing
- Chase lights EVERYWHERE — around the bezel, around the slot display area, around the result cards
- Dollar sign particles floating up from the bottom (CSS animation, gold color)
- The whole modal should feel like the inside of a Las Vegas casino at 2am

### 10. Horse Race (`horse-race`) — "Retro Racetrack Broadcast"
**Background art:**
- Green turf texture across the upper portion of the modal (repeating gradient in greens to suggest grass)
- LED dot-matrix scoreboard frame around the race display area (grid of tiny squares, some lit, some dim — CSS grid or box-shadow)
- CSS pixel art of a pennant/flag in one corner
- Lane marker lines — white dashed horizontal lines across the track area
- Vintage ticket stub decoration in a corner (rectangular shape with perforated edge, warm cream/tan color)
- "PHOTO FINISH" banner element (styled to look like a physical banner across a finish line)

## Implementation Notes

- **Use the same CSS pixel-art technique as the main page.** The existing `.invader`, `.pixel-coin`, `.pixel-heart`, `.pixel-joystick` sprites are built with `box-shadow` on tiny base elements. All new sprites should use the same approach.
- **Keep new sprites small.** Each sprite should be 8x8 to 12x12 pixel grids at 3-4px per pixel. Don't go crazy with detail — pixel art charm comes from constraints.
- **Position art elements absolutely** inside the modal container. Use `pointer-events: none` and appropriate z-index so they're decorative only.
- **Performance matters.** Use `will-change: transform` on animated elements. Prefer `transform` and `opacity` for animations (GPU-composited). Limit the number of simultaneously animating elements per modal to ~10-15.
- **The art should enhance, not overwhelm.** The functional game UI (cards, dice, wheel, results) should always be the visual focus. Art is the environment around it — atmospheric, not distracting.
- **Everything stays in the single HTML file.** CSS in the `<style>` block, sprite elements rendered by React components.
- **Create a reusable `ThemeArt` component** (or similar) that takes the mode ID and renders the correct decorative elements for that mode. Keep it clean.

## Quality Bar

When a game modal opens, it should feel like you've pressed START on a specific arcade cabinet. Each one should have a clearly different visual world. The art doesn't need to be complex — a few well-placed pixel sprites, a themed background texture, and one or two ambient animations per mode is enough to sell the illusion. The main page already proves this technique works beautifully — now bring that same energy into each game.

Commit and push when done.
