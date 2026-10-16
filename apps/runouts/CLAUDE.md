# Royale Link (the Neon Royale's games)

React 18 + Vite app (base `/runouts/`), built by the root `build.sh` into `public/runouts` and served at `/runouts`. It's
the gaming system of the Neon Royale, the casino in the Bridge's Arcadia: a lobby, eight games, a table per game. It
runs standalone in a tab (a play balance) and inside the Bridge's cabinet (the pilot's coins). No server: two pilots at
one table talk through the Bridge.

## URLs (a contract with the Bridge's `js/casino.js` — keep the ids)
- `/runouts/` or `/runouts/?link=1` — the lobby. `&stakes=high` opens the high-roller room's lobby.
- `/runouts/?game=<id>&table=<table id>[&stakes=high]` — a table. Games: `blackjack` `roulette` `craps` `poker` `slots`
  `derby` `crash` `runouts`. A table id is free text from the casino (`bj-1`, `bj-2`, `poker-3`); `tableInfo` in
  `src/core/tables.js` hashes it into the table's number, felt, dealer and regulars, so two ids are two tables.
- `/runouts/?game=runouts` — the Runouts section (the sixteen old games); `&mode=<id>` one of them. Mode ids are the old
  Runouts ids, unchanged: holdem, plo, rng, wheel, dice, high-card, coin-flips, black-marble, slots, horse-race, rocket,
  space-invaders, bomb, plinko, battle-royale, stock-market (`random`: a different one each round).
- `?together=<json>` — two pilots at one table (below).

## How it's built
- `src/games/*.js` — the games as pure engines, no DOM, all tested: `create(...)`, `act(state, action, env)` (an action
  from a seat: bets, moves; `join` / `leave`), `tick(state, env)` (time passing: deals, spins, the dealer's turn, NPCs),
  `view(state, seatId)` (what that seat may see — poker hides other hands; adds `ifc`, see coins), `ifClosed(state,
  seatId)` and `adopt(view, env)` (a guest taking the table over). `env = { now, rng }`. blackjack (6 decks, S17, peek,
  insurance, split to four, aces get one card, 3:2, basic-strategy NPCs), roulette (European), craps (pass / don't pass,
  come / don't come, field, place, odds at 3-4-5×, the shooter going round — you included — and the stickman's calls),
  poker + pokerAi (no-limit hold'em: side pots, showdown, NPCs by personality on Monte Carlo equity), slots (three
  machines: Neon 7s, Starfall, Koi Fortune — paylines, wilds, free spins, the pearl pick), derby (six runners, odds
  priced by simulation), crash (the rocket), runouts (the sixteen games: each run is decided first, `script` is how it
  plays out; back a player to WIN ×3.8, finish SAFE ×1.27 or come LAST ×3.8).
- House edges (by simulation where it isn't textbook): roulette 2.7%; slots Neon 7s ≈ 94.6%, Starfall ≈ 95.5%, Koi
  Fortune ≈ 95.3% to the player (800,000 spins each; `tests/slots.test.mjs` checks a shorter run); derby ≈ 88% on a win
  bet; crash 96% (P(reach m) = 0.96 / m); Runouts ≈ 95%.
- `src/core/` — `tables.js` (games, limits per stakes, chips, `tableInfo`), `cards.js` (shoe, hand ranking), `rng.js`,
  `people.js` (the regulars: the Bridge's character sheets, poker personalities; dealers), `wallet.js` (coins),
  `useTable.js` (the hook every table runs on: host or guest, ticking, paying), `link.js` (together), `sound.js`
  (WebAudio, no files: chip, card, ball, dice, reel, win, bigwin…; `royale_sound`), `wins.js` (the lobby's big wins).
- `src/tables/*.jsx` — one screen per game: a pixel `Stage` (canvas at a whole number of device pixels per pixel, hit
  regions; drawn every frame from the view) plus DOM controls under it (chip rack — tap a chip, tap it again to bet it,
  or drag it to a spot — buttons, clock, banner, help). `src/tables/runouts/modes.js` draws each Runouts game.
- `src/art/` — pixel art in code: `pix.js` (palette, 5×7 and 3×5 fonts, baked sprites, particles), `sprites.js` (cards,
  chips, dice), `felt.js`, `wheel.js`, `symbols.js` (slot symbols), `horse.js`, `people.js` (draws the Bridge's sheets
  from `/bridge/assets/characters/`), `tiles.js` (the lobby's neon sign and live tiles). Fonts: Silkscreen for headings,
  labels and numbers, VT323 for text (`public/fonts`).
- `src/ui/` — `Lobby.jsx` (the sign, the big-wins ticker, game tiles with live scenes and limits, the cage that tops a
  play balance back up, the high-roller picker; `RunoutsLobby`), `Shell.jsx` (top bar, balance, chip rack, buttons,
  banners, help), `Stage.jsx`, `anim.js`.

## Coins (`src/core/wallet.js`)
Standalone the chips are a play balance in localStorage `royale_chips` (1,000 to start; the cage refills it). In a
frame the app says `bridge-casino-hello` to the Bridge and, if it answers in 1.5 s, the chips are the pilot's coins:
every stake (`bridge-casino-stake`, which can be refused) and payout (`bridge-casino-pay`, keyed so it's paid once) goes
through the Bridge, each with `hold` — what the table owes this pilot if they left now. A table works it out from
`ifClosed`: bets not yet in play come back, a blackjack hand stands where it is and plays out, a spin, roll, race or
flight counts as it will land (it's decided when it starts), a poker stack is the stack. The Bridge pays the hold when
the cabinet closes, and the next time it loads if the page closed (see the Bridge's `CLAUDE.md`, *Royale Link*).
Leaving a table for the lobby pays it here. While a round's in play the app tells the cabinet (`bridge-run-state`), and
the first Esc warns instead of leaving.

## Together (`?together=`, `src/core/link.js`)
The Bridge's *Play a game…* opens the same table in both pilots' cabinets (`/bridge/js/shared/together-frame.js` carries
the messages; `cfg.g` is `royale-<game>`, `cfg.opts` the table, stakes and Runouts mode, `cfg.mode` `house` / `headsup`
/ `ring`). Whoever asked hosts: their copy runs the engine (shoe, wheel, dice, clock, NPCs) and sends the other the
table (`st`, its own `view`, ~9 a second at most); the guest says `hi` (with how it sits down — a poker buy-in, counted
once) until the table has them in it, then sends its moves (`act`) and its chips before they're down (`pend`, so they
show on the host's felt). Each pilot stakes and is paid by their own Bridge. Each reports its net (`UP 120`; a round in
play counts as it stood before it, so nothing leaks) and the Bridge compares them at the end. If the guest goes, the
host plays on; if the host goes, the guest adopts the table (`adopt`: a poker hand in play is called off, everyone's
chips back) and plays on — at hold'em two regulars sit in. Slots are side by side: each spins their own machine, and
each spin is sent to the other's glass.

## Testing
`npm test` — the engines: blackjack payouts and dealer rules, the roulette payout table, craps resolution, hold'em
hand ranking and side pots, slots RTP by simulation, derby / crash / Runouts. `npm run build` must pass. To see it:
serve `dist` at `/runouts` (and `apps/bridge` at `/bridge` for the character sheets and the together frame). In the
Bridge: stub `BridgeProgression` (`getBalance` / `wagerCoins` / `awardCoins`), open `BridgeCasino.open({ game, table })`
and drive the frame; `window.__table` (`view()`, `state()`, `host()`) and `window.__wallet` are there for tests.
