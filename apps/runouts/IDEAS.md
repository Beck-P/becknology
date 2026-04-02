# Runouts — Ideas

## Sound Effects (Web Audio API)
Generate card flip whooshes, dice clatter, wheel ticks, coin clinks, victory fanfare, and sad trombone programmatically. No audio files needed — Web Audio API works in a single HTML file.

## Lifetime Stats (localStorage)
Track every pick across sessions. Show a "Hall of Shame" sidebar: total times picked, pick rate per person, which modes hurt them most. Persists in the browser, no backend needed.

## Justice Meter
Visual bar showing how evenly distributed picks have been. If someone has been picked 60% of the time, the meter glows red with "RIGGED" energy. Resets when the group agrees things are fair.

## Streak Tracking
"Beck has been picked 3 times in a row" with escalating visual treatment. Single streak = mild. Triple streak = sympathy messages and the UI shifts to feel sorry for them.

## Rare Outcome Celebrations
Special animations for unlikely results: royal flush in poker, triple 7s in slots, all heads in coin flips, perfect score in dice. Bigger particles, screen flash, "LEGENDARY" badge in history.

## Auto-Play Mode
Toggle that auto-advances reveals every 2-3 seconds instead of manual clicking. Good for watching hands-free on a TV. Pacing slows down for the final reveal.

## Screen Shake
CSS transform shake on the game container for black marble reveals, final verdict slams, and rare outcomes. Subtle but visceral.

## Dramatic Countdown Intro
3-2-1 countdown with escalating scale and pulse effect before the first reveal. Builds anticipation.

## Copy Result to Clipboard
"Share" button after the verdict that copies something like: `🎲 Runouts: Beck has to do the dishes (Dice Duel, rolled 4)` to the clipboard for the group chat.

## Custom Mode Pool
Checkboxes to include/exclude specific modes from "Auto-pick" random selection. Let the group curate which modes they want.

## Double or Nothing
After the verdict, a "Challenge!" button runs a quick 1v1 between the picked person and a random other player. Win = free, lose = two chores.

## Player Avatars
Emoji avatar or color per person. Shows next to their name in cards, wheel, horse race, etc.

## Chore Presets
Remember common chores in localStorage. Quick-select instead of typing each time. Could rotate through them automatically.

---

## New Game Mode Ideas

### 1. Plinko ⭐ TOP PICK
Each player drops a ball from the top of a pegboard. Balls bounce down through rows of pegs and land in slots at the bottom (high value to low value). Lowest/highest slot determines the selected player. The cascading bounce animation is mesmerizing and looks chaotic even though the path is pre-determined. Inspired by Stake's Plinko and The Price Is Right. Feasibility: medium.

### 2. Blackjack
Each player gets auto-dealt toward 21 (no player decisions — it's a selector). Cards flip one at a time, building tension as totals approach 21. Busting is dramatic. Different from Hold'em/PLO because it's individual hands vs. a target number, not head-to-head poker rankings. Reuses existing card rendering code. Feasibility: easy.

### 3. Battle Royale ⭐ TOP PICK
Top-down map view. Players are icons on a grid. A glowing circle shrinks in phases — each phase, the player furthest from center gets eliminated with a "☠️ eliminated" tag. Last one in the zone wins. Very Fortnite/PUBG/Squid Game. Feasibility: medium.

### 4. Roulette
Spinning roulette wheel with a ball bouncing between pockets. Each player is assigned a color/number section. The ball bouncing hop-hop-hop before settling is what makes it visually distinct from the existing Wheel Spinner. Feasibility: medium.

### 5. Tower Climb / Dragon Tower ⭐ TOP PICK
A vertical tower with floors. Each floor has 2-3 doors (safe or trap). Players climb simultaneously — wrong door = trapdoor, you fall, you're out. Last one standing at the highest floor wins. Shows the tower, doors opening, players falling. Inspired by Stake's Dragon Tower. Feasibility: easy-medium.

### 6. Stock Market ⭐ TOP PICK
Each player "invests" in a random stock. A live-updating line chart plays out showing all price lines racing up and down. Some crash to zero, one moons. Totally unique visual language — modern, funny, relatable. "Beck invested in $DOGE and it tanked." Feasibility: medium.

### 7. Bomb / Hot Potato ⭐ TOP PICK
A bomb with a visible countdown timer gets passed around a circle of players. Each tick, the bomb randomly moves to someone. When it detonates, that person is out. Multiple rounds for multi-player elimination, or single-round one-and-done. The ticking countdown is pure tension. Feasibility: easy.

### 8. Space Invaders
Players ARE the aliens in a Space Invaders formation. A turret at the bottom fires shots upward, picking off aliens one by one. Each hit reveals a player name. Last alien standing is the selected player. The app already has pixel art space invader sprites — perfect fit for the retro theme. Feasibility: easy.

### 9. Snakes & Ladders
Classic board game race. Each player rolls and moves across a grid board. Snakes send you sliding back, ladders shoot you forward. First to the end wins, last place loses. Animated tokens hopping squares, snakes slithering. Different from Horse Race because it's a grid board with reversals, not a linear track. Feasibility: medium.

### 10. Scratch Card
Each player gets a scratch card. Cards revealed one at a time — a CSS scratch-off effect reveals the prize underneath (gold, silver, bronze, dud). Last card scratched is the most dramatic. Simple but the scratch animation is tactile and satisfying. Feasibility: easy.

### 11. Balloon Pop
Each player inflates a balloon. Pumps happen in rounds — each pump makes a balloon visibly bigger. At a random pump, someone's balloon pops. Eliminated. Last balloon intact wins. Growing tension of "will THIS pump pop it?" is great. Feasibility: easy.

### 12. Frogger
Players are frogs crossing lanes of traffic and rivers. Each step, frogs hop forward. Cars and logs move across lanes. Players get squished one by one. Last frog to make it across wins. Classic arcade reference, fits the retro theme. Feasibility: medium.

### 13. Keno / Lottery Draw
Numbered balls drawn one at a time from a tumbling machine. Each player has a set of numbers. As balls are drawn, players' numbers light up. Most matches wins, fewest loses. The ball-drawing animation with the tumbling machine is iconic. Feasibility: easy-medium.
