# Becknology — Ideas

## Bridge — Progression & World Sim

**Theme:** Stardew meets space meets games and minigames meets Ready Player One. The bridge stops being just a navigation wrapper and becomes a living sandbox: pilots earn, collect, customize, and improve persistently across every app. Everything you do anywhere feeds back into a personal space you keep upgrading.

**The vision (Beck, 2026-05-08):**

> Each Pilot has a home base, in your home base you can collect different trophies and decor and stuff. All of those sorts of things. Collect them by doing different things scattered around the map and in different worlds and stuff. Getting a certain score on a game or things like that and then have like cool hidden unique items. Long term allowing for customization of your base, buying different additions and things like that. And then having different ways to earn money. Like you can earn items by doing games and stuff to earn money and then you can also sell items to earn money. You can set up some sorts of passive incomes and stuff at your base or in other places. You can use those to upgrade your suit. Basically just like a giant world where you can interact with things and earn different stuff and abilities and upgrades and cool items and a bunch of things like that and then you can use that to do cool things and improve all of your stuff and what not.

**Roadmap (independent slices, built in order):**

1. **Home base + Credits + trophy loop** — closes the core earn → see → spend loop end-to-end. One pilot home-base world, one game wired (Runouts), one shop, trophies auto-display on shelves.
2. **World pickups + inventory** — items scattered in worlds, rarity tiers, inventory UI.
3. **Sell items + more shops** — items have value, shops outside the home base.
4. **Base customization** — buy room expansions, place decor freely (not auto-shelved), redecorate.
5. **Suit upgrades** — speed, interact range, inventory size, cosmetic suit pieces.
6. **Passive income + daily hooks** — investments that earn over time, daily login bonuses, cron-style growth.
7. **Hidden uniques + lore** — one-of-a-kind items in obscure places, perfect-score rewards, NPC mysteries.

Each slice gets its own spec → plan → build cycle. Slice 1 is the first design pass.

## Apps

- **ASCII webcam** — Live webcam feed rendered as ASCII characters in real-time. Toggle character density, invert, adjust contrast. Pure browser API.
- **Gravity sandbox** — Place glowing particles that attract each other with realistic gravity. Watch them orbit, spiral, and collide. Purple trails and glow effects.
- **Ambient hacker soundscape** — Lo-fi noise generator with mixable layers: rain, keyboard clicks, server room hum, coffee shop, synthwave drone. All Web Audio API.
- **Word clock** — Grid of letters where the current time is highlighted in words: "IT IS QUARTER PAST ELEVEN." Non-active letters dimmed. Updates every minute.
- **Mini roguelike** — Tiny ASCII dungeon crawler. Arrow keys, procedurally generated rooms, loot, monsters, traps. Permadeath. 5-floor dungeon.
- **Drum machine** — 8-bit drum sequencer with a 16-step grid. Click cells to toggle beats, retro synth sounds. Adjust tempo. Web Audio API.
- **Starfield** — Infinite starfield you fly through. Mouse controls direction, scroll wheel controls speed. Click for hyperdrive burst. Interactive screensaver.
- **Fortune terminal** — Mystical terminal oracle. Type a question, watch fake processing output scroll by, get a cryptic/funny answer with dramatic reveal.
- **Generative art** — Algorithmic art that creates a unique piece each load. Flow fields, particle systems, geometric fractals. Click to regenerate, long-press to save as PNG.
- **Snake** — Classic snake game, ASCII-rendered with retro aesthetic and CRT scanlines. High score via localStorage.
- **Conway's Game of Life** — Interactive cellular automata in the purple/black palette. Click to place cells, watch them evolve.
- **Reaction time tester** — Wait for the screen to change, click as fast as you can. Shows time in ms. Simple, addictive, competitive.
- **ASCII art converter** — Upload or paste an image, get ASCII art output. Perfectly on-brand.

## Site-wide polish

- **Custom 404 page** — ASCII art "404", glitch animation, "you've wandered into the void" message.
- ~~**Favicon** — Pixel-art "B" in purple.~~ DONE
- **OG meta tags / social card** — Dark card with "BECKNOLOGY" that renders when someone shares a URL in Slack/iMessage/Twitter.
- ~~**Page transition effects** — Glitch animation when clicking hub cards before navigating.~~ DONE
- **Mouse cursor trail** — Subtle pixelated purple dots following the cursor on desktop, fading out.
- **View source easter egg** — Big ASCII art comment at the top of each HTML file rewarding people who inspect the code.
