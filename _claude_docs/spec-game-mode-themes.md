Read `.claude/CLAUDE.md` for context on this repo.

# Custom Visual Themes for Each Runouts Game Mode

The app at `apps/runouts/index.html` has 10 game modes, each with a playback modal. Right now they all share the same generic gradient header. I want each game mode to have its own unique visual identity — both on the **selection card** (main screen) and in the **playback modal** (game screen).

The overall aesthetic is retro arcade / synthwave / CRT. Each game's theme should feel like a different mini-world within that universe — like different cabinets in the same arcade.

## Scope

**Game selection cards (main page):** Each card should have a subtle visual hint of its theme — a unique border style, a small background texture or pattern, a themed icon treatment, or a micro-animation. Keep these tasteful and consistent in size/layout so the grid still looks cohesive. The hints should make you think "oh that one looks different" without breaking the overall arcade cabinet wall feel.

**Playback modal:** This is where the theme goes full. The modal header gradient, background textures, typography accents, result card styling, and celebration/loss overlays should all reflect the game's unique world. Each mode should feel like you've stepped into a different arcade cabinet.

## The 10 Game Mode Themes

### 1. Texas Hold'em 🃏 — "Green Phosphor Terminal"
**Vibe:** Old-school monochrome CRT poker machine from the early 80s. You're sitting at a green-screen terminal playing poker against the computer.
- **Card hint:** Faint green scanline texture on the card. Green monochrome icon glow.
- **Playback:** Black background with green phosphor text (#00ff41). All text and elements in shades of green-on-black. CRT curvature effect on the modal container. Cards rendered with green ASCII-style borders. Blinking cursor effect on the "waiting" states. Faint green screen flicker. The whole modal should feel like a DOS poker game running on an old monitor.
- **Result styling:** Winner/loser text in bright phosphor green with heavy text-shadow bloom.

### 2. PLO 🂠 — "Glitch Casino"
**Vibe:** PLO is the chaotic, high-variance cousin of Hold'em. The visual should feel unstable, electric, like the game could break apart at any moment. Cyberpunk data corruption meets high-stakes casino.
- **Card hint:** Subtle glitch/chromatic aberration effect on hover. Purple-magenta color shift on the icon.
- **Playback:** Deep purple/magenta gradient background (#1a0025 to #0d001a). Occasional CSS glitch effects — text that briefly splits into RGB offset layers, borders that shimmer with chromatic aberration. Card reveals have a "data corruption" flash before resolving. Neon magenta and electric purple accents throughout. Everything feels high-voltage and slightly unstable.
- **Result styling:** Glitch text effect on the verdict — text splits into offset color layers then snaps together.

### 3. Random Number #️⃣ — "The Matrix Terminal"
**Vibe:** You're inside the machine. Pure digital chaos. Falling green numbers, terminal aesthetics, the feeling of raw computation deciding your fate.
- **Card hint:** Tiny falling-number rain animation (CSS only, very subtle) behind the card number icon. Monospace font on the card label.
- **Playback:** Black background with matrix-style falling number columns (CSS animation, not canvas — keep it lightweight). All text in a monospace/terminal font. The number cycling display should feel like a computer crunching calculations. Green and cyan digital colors. Command-line style result output: `> RESULT: Player_1 = 73 [SELECTED]`. Blinking block cursor accents.
- **Result styling:** Terminal output format. Green on black. Maybe a fake command prompt wrapping the verdict.

### 4. Wheel Spinner 🎡 — "Neon Carnival Game Show"
**Vibe:** The Price is Right meets a neon-lit county fair. Bright, fun, flashy. Marquee lights, gold accents, the excitement of a big wheel spinning on stage.
- **Card hint:** Tiny marquee light dots around the card border that chase/animate. Warm gold/amber icon glow.
- **Playback:** Rich dark navy background with warm gold, amber, and hot pink accents. Marquee-style chase lights around the wheel area (CSS animated dots). The wheel itself should have more visual pop — thicker segments, bolder colors, a metallic gold center pin. Confetti burst when it lands. Showtime typography — big, bold, slightly italicized game-show font feel. Stage spotlight effect (radial gradient from above).
- **Result styling:** Gold spotlight reveal. Winner name in big marquee-style lettering. Applause-worthy visual fanfare.

### 5. Dice Duel 🎲 — "Dungeon Crawler RPG"
**Vibe:** You've descended into a pixel art dungeon. Stone walls, torchlight, treasure chests. Every dice roll is a saving throw. Classic 8-bit RPG energy.
- **Card hint:** Stone texture border (CSS repeating gradient). Warm amber/orange icon glow like torchlight.
- **Playback:** Dark stone-textured background (CSS pattern). Warm amber and orange tones from "torchlight" — radial gradients in warm colors at the edges. Pixel-art style decorative elements (torches, skulls, treasure). The dice display should feel like it's being rolled on a stone dungeon floor. RPG-style text: "BECK rolls a 17! Critical hit!" Fantasy/medieval typography accents — slightly serif, slightly rugged. Health-bar style result cards.
- **Result styling:** RPG damage/loot style — "DEFEATED" in blood red with pixel skull, or "VICTORIOUS" in golden pixel crown.

### 6. High Card 🂡 — "Wild West Showdown"
**Vibe:** High noon. One card each. A duel. Dusty saloon, tumbleweeds, the tension of a quick draw. Spaghetti western pixel art.
- **Card hint:** Sepia/amber tint. Wanted-poster style border (rough, slightly uneven). Western star icon accent.
- **Playback:** Dusty warm background — dark browns and amber tones, like a sepia-filtered saloon at night. "Wanted" poster-style player cards with rough borders. Western typography — slab serif, all caps, slightly distressed. The card reveal should feel like a showdown — dramatic pause, then BAM. Subtle dust particle effect (CSS animated dots drifting). Pixel cactus or tumbleweed decorations.
- **Result styling:** "WANTED" poster reveal for the loser. Sheriff star badge for the winner.

### 7. Coin Gauntlet 🪙 — "Pirate Treasure Hunt"
**Vibe:** You're on a pirate ship flipping doubloons. Ocean waves, treasure maps, gold coins glinting in torchlight. A pixel art pirate adventure.
- **Card hint:** Wavy animated border (CSS wave pattern at bottom). Gold coin shimmer on the icon.
- **Playback:** Deep ocean navy background (#0a1628) with subtle wave pattern at the bottom (CSS animated). Gold and bronze accent colors. Treasure chest decorative elements. Coin flips should feel like gold doubloons spinning — warm metallic gold tones. Nautical typography — bold, slightly weathered. Pixel art elements: treasure map border, compass rose, pirate flag.
- **Result styling:** "WALKED THE PLANK" for loser (pixel plank extending off screen). "CLAIMED THE TREASURE" for winner with chest of gold.

### 8. Black Marble 🔮 — "Cosmic Fortune Teller"
**Vibe:** You're consulting a mystical arcade fortune-telling machine. Think Zoltar from Big. Deep space, crystal balls, cosmic dust, star constellations. The marble drawing feels like divination.
- **Card hint:** Slow-pulsing purple/indigo cosmic glow. Tiny star twinkle dots on the card.
- **Playback:** Deep cosmic void background — near-black with deep purple and indigo nebula gradients. Twinkling star field (more pronounced than the main page's starfield). Crystal ball / mystical orb in the center for the marble reveal. Ethereal, flowing animations — nothing sharp or mechanical, everything is smooth and cosmic. Mystical typography with letter spacing. Constellation line decorations connecting the player cards.
- **Result styling:** "THE STARS HAVE SPOKEN" with cosmic burst. Mystic purple glow on the selected player. Nebula swirl animation on reveal.

### 9. Slot Machine 🎰 — "Vegas Neon Strip"
**Vibe:** Maximum Vegas. This is the loudest, flashiest game in the arcade. Chrome bezels, neon signs, fruit machine energy. Everything glows, everything blinks.
- **Card hint:** Chase lights animation (fast). Chrome/silver border. The most animated card on the page.
- **Playback:** Black background absolutely drowning in neon. Hot pink, electric blue, gold neon tube styling. The slot reels should have a chrome/metallic bezel frame. Flashing "JACKPOT" style text treatments. Neon sign typography — that connected script neon tube look (approximate with text-shadow and border tricks). Dollar signs, cherries, sevens as decorative elements. Everything is excess.
- **Result styling:** "JACKPOT" or "BUST" in massive neon lettering with heavy glow. Neon arrow pointing at the selected player. This should be the most visually loud result screen of all 10.

### 10. Horse Race 🏇 — "Retro Racetrack Broadcast"
**Vibe:** Old-timey racetrack meets those electronic horse racing bar games from the 80s. A vintage scoreboard, turf green, the energy of a racetrack announcer calling the race. LED display aesthetic.
- **Card hint:** Green turf texture stripe at the bottom of the card. LED-dot style icon rendering.
- **Playback:** Split design — green turf/track area on top, dark vintage scoreboard below. The race track should feel like a top-down pixel art track with lane markers. LED dot-matrix style typography for race updates and positions (like an old stadium scoreboard). Warm vintage colors — green, cream, brown, red accents. Race call style text: "AND DOWN THE STRETCH THEY COME..." Vintage ticket/betting slip style result cards.
- **Result styling:** Photo-finish banner. LED scoreboard final standings. Winner gets a pixel wreath/garland.

## Implementation Guidelines

- **Everything stays in the single `apps/runouts/index.html` file.** No external files.
- **Use CSS for all visual effects** — gradients, box-shadows, text-shadows, animations, repeating-linear-gradient for textures. No images, no canvas (except the existing wheel canvas if there is one).
- **Keep it performant.** These are decorative CSS additions, not JavaScript animations. Use `will-change` and `transform` for anything that animates frequently.
- **Don't break any existing functionality.** All 10 game modes must still work exactly as before. The logic doesn't change, only the visual presentation.
- **Theme data structure:** Extend the existing `MODE_META` array (which has `id`, `name`, `icon`, `blurb`, `accent` fields) with theme-specific properties — CSS class names, color overrides, result text templates, card hint styles. The mode IDs are: `holdem`, `plo`, `rng`, `wheel`, `dice`, `high-card`, `coin-flips`, `black-marble`, `slots`, `horse-race`.
- **Shared base, themed overrides.** Keep the existing modal structure. Apply themes via CSS classes on the modal container (e.g. `theme-holdem`, `theme-plo`) that cascade down to restyle child elements. Define all theme CSS in the `<style>` block at the top of the file.
- **Card theming on the main page.** Each game card in the selection grid gets a unique CSS class that applies its subtle theme hint (border texture, icon glow, micro-animation). These should be lightweight — don't make the main page feel heavy.
- **Result text:** The themed verdict text (e.g. "WALKED THE PLANK", "THE STARS HAVE SPOKEN") should only appear in the mode's playback result area. The existing `result.headline` and `result.summary` logic should still work — the theme text is decorative, layered on top or replacing the generic text within the themed modal only.

## Quality Bar

When you're done, each game mode should feel like it has its own personality. Someone looking at the game selection screen should be able to tell "these are all different" at a glance. And when they enter a game, they should feel like they've stepped into a different world. The themes should be creative and fun — this is a personal project, not a corporate app. Have fun with it.

Commit and push when done.
