# Spec: deeper worlds — where the Bridge is shallow, and how to deepen each world from what's already there

**Status: proposed — waiting on Beck.** Nothing here is built. Beck, November 15: "we have a lot of stuff, but it's not
super clear on what to actually do with everything… it's kind of wide but not very deep… making every world a lot
deeper… denser instead of wider."

This is two things: **a map** of where the game is shallow, measured by script (not by impression), and **a plan**:
for each planet, 6–10 additions made from the cast, places, items and systems already in the game, ranked by value for
effort; then 8 additions across every world. No new planets, no new large systems, no grind. Nothing below re-proposes
what Beck ruled out (the heist, rooftop running, courier jobs, diving, the dragon egg as an item, two flags, guiding
jobs, the dog sled, hired warriors). The main story is left alone on purpose (*The main story* below).

Sizes: **S** under about 200 lines of data and code; **M** a few hundred; **L** more. **Art**: *none* unless it says.

## The short version

**What the map shows.**
1. **Most of the game is one-visit.** Of 154 places, 28 have nothing that pays, changes or opens a second time (after
   correcting for homes, rides and quest rooms: about 12 true scenery places, listed in the appendix). A third of all
   Lumar interactions (297 of 879) are a text box you read once.
2. **Half the cast is a greeting and three topics.** 95 of 191 people offer nothing through their conversation — no
   shop, quest, rumour, crew place or job (their counters, where they have one, are a separate interaction). In
   Arcadia it's 50 of 66. 139 people have gift tastes, but how someone feels about you changes nothing in the scripted
   game except one refusal (js/interactions.js:1328, `feel <= -3`), and with the AI talk on, the 10 personas' secrets.
3. **84 "Heard anything?" topics lead nowhere.** They have no `rumour` key, so they never reach the Journal or start a
   thing. 31 do. Several are perfect hooks left hanging (Juno's untracked bowl, Harrow's Sovereign II, the spaceport's
   *CREW WANTED. ASK FOR DESH.*).
4. **Two planets have no quests at all.** Of 14 quests, Lumar has 7, Enigma 3, Sylvara 2, Arcadia 1 (five clues in its
   two oldest places), the Singularity 1, **Verdance 0, Hoarfell 0**. The only thread through those two is the curios'
   tale (js/magic.js), which ends at the Lantern Beyond.
5. **The newest content feeds the least.** The Collection (js/codex.js) stops at the October content: ~150 items made
   since are in no set — every Verdance good, every Sylvara herb and potion, Arcadia's levels' food, the Undercity's
   loot, Hoarfell's valley drops. The hidden valley's whole loot table (`wolf_pelt`, `rime_shell`, `bat_wing`,
   `golem_core`, `wraith_essence`, `wyrm_scale`, js/valley.js:644–678) is sold at 6/10 to the Chandler and nothing else.
6. **Systems live on one planet.** Trade, the Workshop, mining, treasure maps and the dungeon are Lumar-only; implants
   and Splice Arcadia-only; skiing, climbing and touring Hoarfell-only. The good cross-planet link is brewing
   (Sylvara's potions work on Hoarfell's cold, Arcadia's blackouts and Lumar's sea) — the pattern to copy.
7. **Festivals fill 2 of 16 slots.** Verdance's season is a week, so it has a festival weekend every week — and only
   autumn's (the Harvest Fair) has anything in it. Lumar has Lantern Tide in autumn. Hoarfell, Sylvara: none.

**What to build first** (the order across all worlds; reasons in *Build order* at the end):

| # | Addition | Size | Where |
|---|---|---|---|
| 1 | What it's for, on every item | S–M | X1 |
| 2 | A notice board of small requests on every planet | M | X2 |
| 3 | The valley's loot gets uses | S | H1 |
| 4 | Verdance's other three fairs | M | V1 |
| 5 | Desh signs on; the Old Mercy trades | S | A1 |
| 6 | Ithil's fallen star | S | Y1 |
| 7 | The Last Monk (Hoarfell's first quest) | M | H2 |
| 8 | Edda's Book (Verdance's first quest) | S–M | V2 |
| 9 | Collection sets for everything since October | S | X4 |
| 10 | Wire the dead rumours | S a planet | X5 |
| 11 | Bonds that open things | M | X3 |
| 12 | The Admiral (two lost pets, one owner) | S | L3 |

## How this was measured

Throwaway scripts (not in the repo; rerunnable from the scratchpad):
- **Every place's live interactions**: headless Chromium loaded all 154 worlds through `BridgeWorld.load` and dumped
  `world.interactions` *after* every module's `decorate` ran (js/world.js:438–500), so what the JS adds as a world
  loads (shops, fights, forage, fishing, the capital's gates, the undercity's counters) is counted — 2,305
  interactions. A fresh save: things that appear only once you own them (the farm's bin, the holm's buildings) are
  under-counted, which is fine for "what a player finds".
- **Every item** (340, from `BridgeItems.all()` after load, so items added in JS count): its sources (shops, forage,
  the farm, workshop and brewing outputs) and uses (who buys it in `people.json` `sell` lists, workshop and brewing
  inputs, gift tastes in js/gifts.js, Collection sets, business stock, crowd wants, eaten), then a grep of every JS file
  for anything the structured data misses.
- **Every person**: topics by kind (`sell`, `rumour`, `workshop`, `harbour`, `crew`…), routines, gift tastes, quest
  links, JS hooks.
- Interactions classed as talk (a person in `people.json`), clue (a quest clue's `{world,label}`), look (any other text
  box), door, shop, game, gather, sit/view, work, fight. "Reasons to come back" = a shop, a game, something to gather,
  a fight, work, a business, a person with something to offer, a quest that starts there.

## The map in numbers

| Planet | Places | People | Talk-only people | Quests starting | Look share of interactions | Businesses |
|---|---|---|---|---|---|---|
| Lumar | 65 | 69 | 23 | 7 | 34% | 9 |
| Arcadia | 40 | 66 | 50 | 1 | 20% | 6 |
| Hoarfell | 21 | 17 | 4 | 0 | 15% | 2 |
| Verdance | 8 | 23 | 14 | 0 | 29% | 3 |
| Sylvara | 5 open (+6 rendering) | 15 | 4 | 2 | 30% | 1 |
| Enigma | 5 | 1 | 0 | 3 | 27% | 0 |
| Singularity | 1 | 0 | — | 1 | 8% | 1 |
| The Wayfarer | 9 | (crew) | — | 0 | 30% | 0 |

### Systems by planet

| System | Lumar | Arcadia | Hoarfell | Verdance | Sylvara | Enigma / Sing. | Feeds into | Gap |
|---|---|---|---|---|---|---|---|---|
| Fishing | 8 pools + sea | — | ice pond | farm pond, trout pool | — | — | Collection, legends, hall, aquarium, business stock, derby, galley special | none in the Sump's canals or on the Silverrun |
| Farming | holm garden | — | — | the farm | — | Okafor's hydro (talk) | orders, export, makers, bakehouse, show, honey for brewing | — |
| Mining | Rose Mine | scrap piles | — | — | — | — | Workshop ores, pickaxes, songstone, maps | one mine |
| Combat | Midnight, Undercroft, Saltmere, Gloaming, Crater | Undercity, Sump, Pit | the valley | — | (range only) | — | Undercroft → Workshop, wonders; Undercity → Gage + 2 trophy implants | **valley loot feeds nothing** |
| Workshop | the holm | — | — | — | — | — | ships, guns, wonders | takes no Arcadia, Hoarfell or Sylvara material |
| Trade & contracts | 8 ports | — | — | (export to Arcadia) | — | — | coins, ships | Lumar-only |
| Businesses | 9 | 6 | 2 | 3 | 1 | 1 | takings, restock from fish & farm | — |
| Brewing | (crystals) | (blackout) | (cold) | (honey) | Mirelle | — | potions used on 4 planets | **the model link** |
| Curios | 5 | 2 | 2 | 1 | — | 2 | the Lantern Beyond | — |
| Bows | (a Midnight weapon) | — | — | — | range, zips | — | fights, lanterns | zips only on Sylvara |
| Implants | — | 4 tiers | — | — | — | — | combat | chrome parts and circuits don't feed them |
| Racing | sailing, regatta | — | ski, climb | — | — | — | coins, Regatta Cup | — |
| Meals & warmth | teas (Rose) | ~40 dishes, eat-only | fondue, cocoa (warm) | café | waybread | — | hp/energy, warmth | Arcadia's food does only hp/energy |
| Festivals | autumn | — | — | autumn | — | — | rosettes, coins | 14 of 16 slots empty |
| Dungeon | the Undercroft | — | — | — | — | — | Workshop materials, relics | — |
| Treasure maps | 8 maps | (rummage finds one) | — | — | — | — | coins, goods | Lumar-only |
| Collection | sets | (a few) | (a few) | (farm only) | — | — | lasting bonuses | stops at October |
| Crew | 3 | 1 (Pip) | — | — | — | 1 (Okafor) | perks | none from Hoarfell, Verdance, Sylvara |

### Items: sources with no purpose beyond a generic sale

Every item worth anything sells at the Chandler's hatch aboard (6/10, js/storage.js:105) or to "any trader" (7/10).
These have nothing more — no specialist buyer, recipe, gift love, set, quest or use:

| Item | From | Evidence |
|---|---|---|
| `wolf_pelt`, `rime_shell`, `bat_wing`, `golem_core`, `wraith_essence`, `wyrm_scale` (24–180) | the hidden valley's creatures | js/valley.js:644–678; no other file names them |
| `glass_float` (18) | blowing glass at the Sapphire Glassworks | js/sapphire.js:278; the *decor* Glass Float is a separate catalog piece (js/catalog.js:34) you can't place from your pack |
| `caldera_lantern` (24) | bought from Lanternfall's lantern maker | js/sapphire.js:168; nothing checks for it |
| `silk_scarf` (90) | woven from five cocoons in Rosewell | js/rose.js:12 promises "a gift anyone loves"; js/gifts.js:280 `taste()` gives it `plain` |
| `pottery_mug`, `stoneware_jug`, `beeswax_candles`, `honey_crock` | Thistlecombe's makers | js/makers.js, js/verdance-goods.js; `plain` as gifts, in no set |
| `scrap_metal`, `circuit`, `chrome_part`, `sump_pearl` | the Undercity and the Sump | js/undercity.js; only Gage buys them — nothing is made of them |
| `goldfish_bag` | the goldfish scoop, Lantern Row | js/oldquarter.js:32; Desh *hates* it, nobody loves it |
| `regatta_cup` | the regatta | only a Collection entry and a plinth |

**Things you buy that do nothing else** (eaten for health or energy and that's all, in no set, wanted by no one):
the Spires' and Terraces' dishes (`gold_leaf_sushi`, `sky_oysters`, `spore_truffle_risotto`, `skyline_spritz`,
`shoyu_ramen`, `herbal_tonic`…), Aurelle's (`truffles`, `vin_chaud`), Verdance's café and fair food (`apple_pie`,
`cider`, `pumpkin_soup`, `toffee_apple`). Arcadia alone sells ~50 different things across its levels, nearly all to eat or drink.

## Lumar — the spore seas (65 places)

**What you do here today.** You land at Diggen's Point, fish off the piers, sell to the cartographer and the traders,
and take a sloop between seven islands; most of the game's depth is here — trade runs and contracts, sea fights, the
Workshop and slipway on your holm, the Rose Mine, treasure maps, the Undercroft each night, the regatta on Fridays,
and seven of the game's fourteen quests. You buy ships, then businesses, then a fleet you send from the office.

**Where it breaks.** The loop is "sail, fish, fight, sell, build ships" and it's strong; what runs out is the *towns*.
Crownhaven grew six districts, Lanternfall and Rosewell were built, Cinder Key and Saltmere were added — and most of
that new ground is text to read once and people with three topics. The capital has no job, no game and no reason to
cross it after the first walk. Once the seven quests are done, Lumar has no story left to start.

**Journal and Map.** Lumar leads best: seven quests, 14 wired rumours, the quest tracker, every island on the chart.
What isn't led to is the new ground — nothing in *Next up* points at the capital's districts, Lanternfall or Rosewell
once you've walked them, and the Map marks their people without saying what any of them is for.

**Ten worst dead ends.**
1. **The Arsenal** (`lumar-crown-arsenal`): nine descriptions (ropewalk, sail loft, gun foundry, the Sovereign II on
   the stocks), no person, nothing to do.
2. **The Old Bridge's booths** (`lumar-crown-bridge`: TACKLE BOOTH, FLOWER BOOTH, SWEET BOOTH): shops in name, text in
   fact.
3. **Four notice boards** (`lumar-square` BULLETIN BOARD, `lumar-crown` NOTICE BOARD, `lumar-crown-oldtown` NOTICE
   BOARD, `lumar-crown-office` NOTICES): a lost lantern, a grey cat called Admiral, a swearing parrot called Admiral,
   carriers wanted — all flavour.
4. **Lanternfall's five people** (`cliff_marina`, `cliff_yannis`, `cliff_despina`, `cliff_ilias`, `cliff_aris`) and the
   Glassworks' two masters (`glass_stavrou`, `glass_ione`): talk only.
5. **The glass you blow and the lantern you buy** do nothing (`glass_float`, `caldera_lantern`, above).
6. **Cinder Key's WANTED posters** (`lumar-cinder`, `lumar-cinder-tavern`): a bounty board with no bounties; Rook,
   Wick and Kettle talk-only.
7. **The Sovereign II**: Harrow's rumour ("the Queen-Regent wants her launched for the regatta") goes nowhere, and the
   ship on the stocks never moves.
8. **Crownhaven's Hill** (`lumar-crown-hill`): the belvedere, the fountain, the training mast — text; Harrow and Ione
   talk-only (Ione loves a fallen star above anything, but nothing asks you for one).
9. **The dragon** (`lumar-crimson-cave` DRAGON, HOARD, ORE VEIN "you'd need a pick"): after *The Ship Mark* the deepest
   room on Lumar has nothing to come back for. (WORLDS.md promised "the dragon's riddle".)
10. **The silk scarf** (`silk_scarf`): five days of cocoons for a gift the code treats as ordinary.

**The plan** (ranked by value for effort).

**L1 · Lumar's boards.** The four flavour boards become the planet's notice boards (the mechanism is X2): three
small requests a Lumar day from people already on the seas, for things you catch, find or make — never carrying a
parcel from A to B. Penn the chartmaker wants sea glass to match a shallows colour (her gift line already says so);
Rigg wants a harbour crab; the Arsenal's clerk wants rope and pitch; Mudlark wants an old boot; Ione wants a star pearl;
Bryony wants silverfin for the Tern's pot; Wick wants a storm glass back to calibrate. Files: js/homestead.js's ORDERS
pattern moved to a shared module, the boards' labels in `lumar-square`, `lumar-crown`, `lumar-crown-oldtown`,
`lumar-crown-office`. **S** (data on X2). Clearer: tells a new pilot what Lumar's things are for, by name.

**L2 · The glass and the lantern do something.** A blown `glass_float` can be put on a shelf at home — it *is* the
catalog's Glass Float (js/catalog.js:34; js/home.js places it) — and a flawless one is a gift Penn and Ione love. The
`caldera_lantern` "has never once blown out": carried, it lights the Undercroft's and the Rose Mine's dark a few
tiles wider and makes the rune traps glint (js/dungeon.js, js/mine.js ask `BridgeInventory.has`); hung at home it's a
lamp. Files: js/sapphire.js, js/catalog.js, js/dungeon.js, js/mine.js, js/gifts.js. **S**. Turns two dead buys into
reasons to visit Lanternfall and the Glassworks again.

**L3 · The Admiral.** The two lost Admirals are the same old captain's pets. A small quest chaining people already in
the capital: the crier (Old Town) cries the cat; the Harbour Office's Pim has heard the parrot swearing on the Stilts;
Mudlark found a brass name tag in the mud ("ADMIRAL — RETURN TO CAPT. H. ..."); the bosun at the Crown & Anchor knows
whose they were; the cat is on the Old Bridge's loggia at dusk, the parrot on the Arsenal's crane. Ends with both home
at an upstairs window on the Old Town and a letter. Clue spots are labels added by js/capital.js `decorate` (as the
gates are), no sprites — "a grey cat on the wall" is a text clue. Files: assets/quests.json, js/capital.js,
assets/people.json (a `when` topic each). **S**. Gives the Arsenal, the Bridge and the Stilts a reason to walk.

**L4 · The Old Bridge's booths open.** The tackle booth sells a better line (a consumable: rare fish bite a little
more for a Lumar day — the hook js/wonders.js `bite()` already asks), the flower booth posies (`posy` — loved by six
people), the sweet booth toffee ships (a new small item, a gift children and Pip love). Vendors set in js/capital.js so
a re-render can't lose them. **S** (one new item, icon drawn in code). The bridge becomes the place you stop on the way.

**L5 · The dragon's riddle.** Once a Lumar day, talking to the dragon gets a riddle whose answer is a thing on Lumar's
islands (the Sapphire light, the Crown's bell, the moon pool, the floating market); answer from a short list and she
lets you take one coin from the hoard (`heron_coin`, which wonders and Percy want). Never the egg, never what she's
listening for. Files: a `dragon` topic in assets/people.json or a small handler, a riddle table. **S**. Brings
pilots back to the deepest room and quietly teaches the islands.

**L6 · Cinder Key's bounties.** The WANTED board lists this week's three: a black-sailed raider, the privateer that
works the Emerald lanes, a Crimson pirate captain — ships already sailing in js/sloop.js's traffic. Beat one in a sea
fight (js/seafight.js) and claim it from Scarlet Dee for coins and a plunder piece Vesper Quick wants. Seeded by the
week so both pilots chase the same three. Files: js/crimson.js, js/seafight.js (a `beaten(kind)` note). **M**. Links
Cinder Key, sea fighting and the Crimson's weather into one loop.

**L7 · The Sovereign II.** The Arsenal's clerk keeps a ledger of what she still needs — rope, sailcloth, pitch, oak
planks, iron bars, all things your Workshop makes (js/workshop.js RECIPES). Bring them and your share is entered; when
the hull is complete she launches at the next Friday regatta (an event on the quay, js/events.js, the crowd watching)
with your name in the Arsenal's book, and the Arsenal teaches you a plan (`plan_long_nine`). Files: js/capital.js,
js/workshop.js, js/race.js (the regatta day), js/events.js. **M**; art optional (an empty-stocks variant afterwards).
Joins the capital to the Workshop and the regatta, and answers Harrow's rumour.

**L8 · The silk scarf, as promised.** `silk_scarf` loved by everyone with no hate for it (a rule in js/gifts.js
`taste()`, like `old_boot`'s), and Seren's loom weaves a second thing from cocoons: spore-silk sailcloth that a
harbourmaster fits as a light sail. **S**. Makes Rosewell's daily cocoons worth the walk.

**L9 · Lanternfall's people.** Aris paints your ship in the caldera's light (a picture for any home, drawn from your
ship's own colours), Yannis's donkeys carry your pack up free once you've tipped them three days running, Despina's
taverna serves a sunset plate that keeps you warm. **S each**. Gives the cliff town reasons beyond the view.

## Arcadia — the neon city (40 places)

**What you do here today.** You come for the games: the Neon Royale's tables and the Crown Room, Lucky 7's pachinko,
the arcade cabinets, Splice jobs in NULL's den, dancing at Club Void. Below the street, fights get harder from the
Warrens to the Sump with a boss a day each, and implants come in four tiers up to LUMEN in the Spires. You ride the
Loop, the Core Express and air cabs between five levels and eat and drink everywhere.

**Where it breaks.** Arcadia is the widest place in the game and the thinnest per head: 50 of its 66 people only
talk, it has one quest (five clues, in the arcade and on the street, from before the levels were built), no notice
board, no fishing, no farm, and no work but gambling and fighting. Its ~50 dishes and drinks only heal. The levels are
beautifully separate and nothing asks you to go between them. Money and coins come in; nothing the city gives you
goes anywhere else.

**Journal and Map.** One quest and 9 wired rumours against 35 dead ones. *Next up*'s line for a new place — "people
here you haven't met… their rumours start quests" (js/quests.js `nextUp`) — is untrue for most of Arcadia's people,
so it sends pilots to talk to fifty people for nothing. The Map's side-on cutaway shows the levels well; nothing says
why to go to one.

**Ten worst dead ends.**
1. **The spaceport's departures board** (`arcadia-spaceport` DEPARTURES BOARD): "CREW WANTED. ASK FOR DESH." — and
   `desh` has no crew block, no job, nothing.
2. **50 talk-only people**, including everyone at the Neon Royale, the Terraces, the Spires, Lantern Row, the Orrery
   and the Lyra (appendix).
3. **One quest for 40 places** (`null`, clues in `arcadia` and `arcadia-street` only).
4. **The Orrery** (`arcadia-members`): 25,000 coins (js/spires.js `MEMBERSHIP`) for a bar cart, a view and three
   members who talk.
5. **The levels' food**: eat-only, in no set, wanted by nobody (above).
6. **The Undercity's loot** (`scrap_metal`, `circuit`, `chrome_part`, `sump_pearl`): sold to Gage, made into nothing —
   and street chrome's glitches can't be fixed with them.
7. **The bosses' trophies** (`ruin_knuckles`, `dredge_heart`): one implant each (js/implants.js:70–72), no plinth in the
   hall of finds.
8. **No fishing in the Sump's canals**, beside Old Teo's noodle boat and the eels you already fight.
9. **The Dive's pool table and dartboard, the street's token kiosk, the card room's tournament board** — text.
10. **The Atrium's SHUTTERED SHOP** ("coming soon") and 35 dead "Heard anything?" topics.

**The plan.**

**A1 · Desh signs on; the Old Mercy trades.** Desh gets a crew block (people.json `crew`: role Hauler, a perk the
crew system can ask — every ship's hold carries a tenth more, read where js/trade.js asks `capacity`). His *Old Mercy*
runs Lumar ↔ Enigma ↔ Arcadia: a `sell` topic buys Lumar's salt fish and spore-lamp oil and Verdance produce from your
pack at a spaceport premium, and he sells chrome parts and circuits. Files: assets/people.json, js/crew.js, js/trade.js.
**S**. Answers a hook the board already shows, and is Arcadia's first trade link to another planet.

**A2 · Arcadia's board.** The spaceport's departures board and the Undercity's holo kiosk carry the city's three
requests a night (X2): Teo wants sump eels for his laksa; Wen at the drowned shrine wants beeswax candles from
Verdance; Kanna at the roof shrine an omamori's worth of sea glass; Hoshi farm eggs; Nadia at Cirrus a twin-moon
melon; Ferris in the sky gardens seeds; Brannigan at the Last Burn ember rum from Cinder Key. Files: X2's module, two
labels. **S** (data). Sends pilots between levels — and between planets — with a reason.

**A3 · Fishing in the Sump.** A `sump` pool on the canals and the drowned station's platform edge: eels (the
`eel_fillet` the eels drop), a rare `sump_pearl`, scrap and circuit boards, old boots. Teo buys eels; Gage buys the rest.
Files: assets/fishing.json, js/fishing.js `POOLS`. **S**. The city's first quiet thing to do, and it feeds the board.

**A4 · Arcadia by night.** A Collection set (X4) of one dish or drink from every level — the Hawker Hall's skewers,
Teo's laksa, Cyber Noodles' ramen, Moonglow's old fashioned, Halo's skewers, Aurelle's champagne, the Spires' gold-leaf
sushi — with its lasting bonus (food goes further in a fight). Files: js/codex.js. **S**. Turns 50 eat-only items into
a tour of the levels.

**A5 · Chrome you can tune.** Doc Sallow tunes a street implant with two chrome parts and a circuit: it glitches half
as often for a week. Iris Kade will take a chrome part as a deposit off a designer piece. Files: js/implants.js
(a `tuned` until-time per slot), js/undercity.js. **S**. Joins the fights to the implants they already pay for.

**A6 · The Orrery, worth joining.** Lady Perpetua deals Eights for stakes at the card table (js/eights.js, already
played in the Wayfarer's mess); Sir Augustin keeps a wager book on the week — the regatta's winner, the derby's biggest
fish, who goes deepest in the Undercroft — paying at odds; the members' book gains a line for each of your firsts.
Files: js/spires.js, js/eights.js, js/race.js, js/dungeon.js (read-only). **S–M**. Gives the most expensive door in the
game something behind it.

**A7 · Chrome all the way up** (a quest up the levels). Iris Kade trained under the street, then at the Chrome Clinic,
then made LUMEN. Her first arm — the one she built for herself at Sallow's — went missing when she moved up. Sallow
remembers it (the Undercity), the clinic's old file says who bought it (the street), a scrapyard heap gives up its hand
(Saint Ruin's yard, after you beat him), the Pit's bookie has the rest as a bet nobody paid (the Undercity), and Iris
gets it back in LUMEN. Reward: she fits one designer piece at clinic price. Files: assets/quests.json, people.json
`when` topics, js/undercity.js (the heap). **M**. Arcadia's second quest, and the first that uses the levels.

**A8 · The Dive's darts.** A quick darts game at the Dive (three darts, a board, a score against Drip Nell's), and
the tavern's dartboard on Lumar uses it too (it already jokes about missing). **M** (a small mini-game, no art beyond
what's drawn in code). A cheap game in a bar that has nothing to do.

## Hoarfell — the ice world (21 places)

**What you do here today.** You ski the pistes and the Park against posted times, climb the Hoarspire's routes,
warm up by fires and fondue, play Fell Dice at the lodge, and ride the mountain railway to Aurelle's château, spa and
salon. Further out: the High Route's huts across the glacier, the hidden valley's tiers of creatures and its shy
yetis, and the Last Ridge out to the Lantern Beyond, the end of the curios' tale.

**Where it breaks.** Hoarfell has skill games and journeys and no small stories: no quests, no board, no festival. The
valley is the deepest fighting in the game and its loot buys nothing. Anselm, the last monk, tells you what happened
to his monastery and there's nothing you can do about it. The cast's rumours (an untracked bowl, a key that's missing)
point at things that don't exist.

**Journal and Map.** No quest and no wired rumour, so *Next up* on Hoarfell only ever says "someone you haven't
met" and "a way you haven't taken". The curios' tale (the Journal's curios list, js/quests.js:484) is what leads
through it, up to the Lantern Beyond; the lodge's record board keeps your times. The Map marks routes and runs.

**Ten worst dead ends.**
1. **No quest starts on Hoarfell** (assets/quests.json).
2. **The valley's six drops** feed nothing (js/valley.js:644–678).
3. **Anselm** (`anselm`, `hoarfell-monastery`): the whole valley's story, and talk only.
4. **Juno's rumour** ("a bowl off the back of the Hoarspire nobody's skied in years") — no such run.
5. **The château's KEY BOARD** (`hoarfell-chateau`): "No. 13 has no key. No. 14 has two." — nothing.
6. **No festival** (assets/festivals.json); the ice fair was asked for (requests.md, festivals row).
7. **No Hoarfell crew**, though Ysolde and Liv are the most capable people on the planet.
8. **Hoarfell in the hall of finds**: one plinth (`lantern_beyond`).
9. **The glacier and the hollow** (`hoarfell-glacier`, `hoarfell-hollow`): one-time journeys with nothing after.
10. **Ten dead "Heard anything?" topics** (Mette's light past the Hoarspire is story; the rest are hooks).

**The plan.**

**H1 · The valley's loot gets uses.** Maison Vautrin (Aurelle, js/alpine.js:352) makes the furs coat from four wolf
pelts and 300 coins instead of 1,200, and buys pelts after; Mirelle on Sylvara buys bat wings and wraith essence for
her stillroom (a `sell` topic), and Morwen too; a golem core is the heart of a new Workshop recipe — a frost-hearth that
keeps a home or a ship's cabin warm (warmth on waking, js/worlds/hoarfell.js `warm`); a wyrm scale is a plinth in the
hall (X7) and, with iron, a plan for scale sheathing. Rime shells are what the yetis' cache is lined with — a yeti
fed rime shells trusts you twice as fast. Files: js/alpine.js, assets/people.json, js/workshop.js, js/valley.js.
**S**. Every fight in the valley now pays into something.

**H2 · The Last Monk** (Hoarfell's first quest). Anselm can't go back into his own monastery. Lay his brothers' fears
(bring wraith essence to the shrine), relight the cloister lamps (fire arrows from Sylvara's bowyer — the cross-planet
link), clear the warm spring's mouth (two golem cores), and ring the bell. Each step is a clue at a label already in
`hoarfell-monastery` or `hoarfell-valley`. At the end Anselm moves back in: the monastery is a warm rest stop with a
bath like Rosewell's, the yetis come to the gate in the evening, and he sells prayer-flag tea that keeps the cold off.
Files: assets/quests.json, people.json `when` topics, js/valley.js (the monastery after). **M**; art none (text and
existing labels; lit lamps could be a later variant). A story the valley has been asking for.

**H3 · The Snowcap Lodge's board** (X2, next to Mette's record board): Sigrun wants edelweiss, the ski patrol a flask
of hot cocoa for their hut, Bryn three hoar crystals for a dice cup, Vautrin pelts, Liv wax done twice in a day,
Inge a pair of skis back from the High Route's hut. **S** (data). Tells a newcomer what Hoarfell's things are.

**H4 · The Ice Fair** (Hoarfell's winter festival, on the promenade's rink): a derby through the ice (the biggest
arctic char or frostfin, js/festivals.js `derby`), a ski contest against posted times on the pistes (js/ski.js times,
the lodge board's), fondue and roast chestnuts at a stall, the torchlit skate (an event that exists, js/events.js) every
evening of it. Files: assets/festivals.json, js/festivals.js (a `times` contest beside show and derby). **M**. Fills
Hoarfell's three-week winter.

**H5 · Room 13.** The château's missing key turns up in Joro's junk pile (js/district.js `RUMMAGE`, a rare row) or a
crate in the Rust Saints' yard. The concierge opens room 13's safe: a gambler's stake left fifty years ago — a pocket
watch Percy wants, and a stake slip the Royale's cage still pays out on. Files: js/district.js, js/alpine.js
(Aubert's topic), js/casino.js (read). **S**. A secret that spans two planets and touches nothing of the main story.

**H6 · Ysolde joins the crew.** A crew block (role Mountaineer, once you've reached the Last Ridge): the cold
drains a third slower on any planet and the avalanche probe is always in hand. Files: assets/people.json, js/crew.js,
js/worlds/hoarfell.js. **S**. Hoarfell's first crew member; she's not a warrior and not a guide you work for.

**H7 · The bowl behind the Hoarspire.** Juno's rumour, made real: from the Last Ridge's bivouac a ski line runs back
down the far face (js/ski.js run mode on `hoarfell-ridge`, gates where its JSON already marks the safe line), timed,
with Juno paying if you beat hers. Files: js/ski.js, js/expedition.js, assets/worlds/hoarfell-ridge.json (gates).
**M**; art none if the ridge's ground serves, otherwise a small one. Gives the end of the expedition a reason to go
back.

## Verdance — the garden world (8 places)

**What you do here today.** You take on Edda's farm, grow crops on the clock, keep hens and cows, fill three orders a
day from people across the worlds, and hire hands who work while you're away. You fund the village's five projects,
ride a horse and buggy down the lanes to Thistlecombe, Vinehallow and Wendmill, press cider, age wine for weeks,
grind flour, stock the honesty box, and ship produce to Arcadia's kitchens.

**Where it breaks.** Verdance is the clearest loop in the game — grow, sell, order, fund — but it's all economy. No
quest, and fairs on one weekend in four. The village fund ends after five projects. The makers' wares are pretty and
pointless once made. Fourteen of its twenty-three people only talk, including the five who keep a day.

**Journal and Map.** *Next up* shows what's ripe and takings waiting, and the order board leads well; nothing leads to
the countryside's places once the fund has opened them, and no rumour is wired (7 dead).

**Ten worst dead ends.**
1. **No quests** (assets/quests.json).
2. **Festival weekends**: one of four filled (assets/festivals.json `harvest_fair`; js/festivals.js runs Verdance's
   every week).
3. **The village fund ends** after five projects (js/village.js).
4. **The makers' wares** (`pottery_mug`, `stoneware_jug`, `beeswax_candles`, `honey_crock`): no use, no set.
5. **Fourteen talk-only people**, among them Wat the farrier, Ludd the miller, Nell, Mags, Hobb, Juniper, Pike
   (appendix).
6. **The village notice board** (`verdance-village` NOTICE BOARD): the lost goat, the harvest supper — text.
7. **The wine's last stage** (`wine_grand`): weeks of aging for a sale and a gift.
8. **Rudd's ferry, Okoro's wharf, Rosalind's estate**: their people only talk (their counters do the work).
9. **Verdance in the Collection**: the October farm set, none of the countryside.
10. **Seven dead rumours.**

**The plan.**

**V1 · Verdance's other three fairs.** Each weekend of a Verdance season's last week gets its fair, all on the
existing *show* contest and props: **spring**, the Blossom Show on the green (moonflowers, posies, sunflowers, judged by
Nell and Marigold); **summer**, the Strawberry Supper at the Hayloft (fruit and honey, judged by Bridget); **winter**,
the Cellar Fair in Thistlecombe's square (wine by age, cheeses from your milk, cider, judged by Rosalind and Hester).
Files: assets/festivals.json (three entries), js/festivals.js (judges' scoring per kind). **M**, mostly data. Every
weekend on Verdance has something on, and wine, cheese and flowers have a stage.

**V2 · Edda's Book** (Verdance's first quest). Edda's kitchen book was given away a page at a time to the people she
loved: Bridget has the honey cake, Ludd the pumpkin pie, Nell the posy that keeps, Hollin the note on the hens, Wat a
page about the old plough horse, Mags the harvest supper. Each page is a `when` topic and a clue; together they're the
book, and Bridget bakes from it — a recipe for Edda's own pie (a new food the fairs love). Stays with the farm and the
kitchen; leaves Edda's "road north" (the thimble's curio, js/magic.js) alone. Files: assets/quests.json,
assets/people.json. **S–M**. A small story through the people who only talk.

**V3 · The farm's board grows.** The order board (js/homestead.js ORDERS) also asks for the countryside's goods:
Juniper wants cheese for the café, the Hayloft wine, Brannigan in Arcadia a crock of honey, Wen beeswax candles, Ume
pottery cups for her tea house. Files: js/homestead.js (or X2's shared module). **S**. Gives every maker's ware a buyer.

**V4 · The village's second ring.** After the five projects, the fund keeps a small want a week — a bench by the
pond, a new rope for the church bell, the duck house, a sign for the halt, a lych gate — each a few hundred coins plus
something from your farm or the makers, each shown as a prop (existing kit pieces) and a line on the green. Once a
season, Brambleford enters Best Kept Village and the judge reads what you've done. Files: js/village.js. **M**; art:
props from the kit, no new render. The village keeps growing with you.

**V5 · Wat, Ludd and the horse.** Wat shoes your horse (the horse rides a little faster for a Verdance day, 20 coins);
Ludd grinds your wheat at Brambleford too, and buys the best flour back for the fair. Files: assets/people.json,
js/countryside.js, js/makers.js. **S**. Two talk-only regulars become part of the loop.

**V6 · The makers' wares at home.** A stoneware jug, cups, beeswax candles and a honey crock can go on a shelf or a
table in any home (js/catalog.js pieces, previews drawn in code), and candles lit at home make the room warmer at night.
**S–M**. A use for the prettiest things on the planet.

**V7 · The goat that answers to nothing.** Somebody's goat is on the Downs' holloway at dusk, eating the honesty box's
note. Bring it home and it turns out to be Hobb's; he gives you a goat's-milk cheese recipe for Hester. **S**. A secret
that rewards riding the lanes.

## Sylvara — the wood (5 places open, 6 rendering)

**What you do here today.** You help Queen Alyssara and her first sword through two quests in Elderglade's hall,
brew potions with Mirelle from herbs you gather, a crystal from Lumar and honey from Verdance, learn the bow at Aerin's
range, and take a canoe down the Silverrun. Six more places along the river are being rendered (the Boughs, the
tavern, the falls and the cave behind them, Mirror Lake, the Deepwood).

**Where it breaks.** The two quests are lovely and end; brewing is the game's best link between planets; and the rest
waits on the new places. Three of the open places have a person with one wish and no way to grant it.

**Journal and Map.** The best-led planet for its size: the gold ! over the queen, 5 wired rumours, the tracker
through both quests (tools/tests/world/quest_tracker.js). After them, nothing.

**Ten worst dead ends** (fewer exist; five places).
1. **Ithil the star-reader** (`elf_starreader`, `sylvara-crown`): "If you find one, bring it up here. I'd like to see
   it." — a fallen star does nothing.
2. **The Crown** (`sylvara-crown`): a seat, a telescope, a star dial, one person.
3. **After *Under the Willow*** the hall has nothing new.
4. **The loomer, liftkeeper and boatwright**: talk only.
5. **No fishing on the Silverrun** (assets/fishing.json).
6. **No festival**, though the full moon is the real one (spec-living-worlds §2).
7. **Zip lines and fire arrows only here**: other planets have cliffs and lanterns out of reach.
8. **Waybread, starpear cider, elderflower wine**: in no set.
9. **One business** (`herb-stall`).
10. **Three dead rumours.**

**The plan.**

**Y1 · Ithil's fallen star.** Bring a fallen star (js/weather.js starfall nights) to the Crown and Ithil names a star
for you on the dial: from then the dial shows "your" star, the telescope finds it, and on starfall nights more stars
fall near you. Ione in Crownhaven and Kanna in Arcadia love them too (their gift lines). Files: a `when`/item topic in
assets/people.json, js/worlds/sylvara.js (the dial). **S**. One wish granted, and a reason to be out on starfall nights.

**Y2 · The Rootmarket's board** (X2): Mirelle wants owlmoss, Corin the bowyer a golem core for a bow's grip (H1's
link), the loomer silk cocoons from Rosewell, Aerin three fire arrows' worth of ember glass from the Crater, the
liftkeeper a jar of honey. **S** (data). The wood asks things of the other planets.

**Y3 · The Moonwell's night** (Sylvara's festival, on the real full moon): the glade lit, Thaelin playing, a brew show
judged by Mirelle (the *show* contest scoring potions by kind), moonpetals open all night. Files: assets/festivals.json,
js/festivals.js (a moon-dated festival beside the weekend ones). **M**. Sylvara's own calendar, once a month.

**Y4 · Arrows elsewhere.** Rope-arrow zip lines where other places have a drop that wants one (Lanternfall's
terraces down to the water; Fellhaven's piste to the promenade) and lanterns out of reach for fire arrows (Saltmere's
harbour light — not the Gloaming's lantern itself — the Stilts' paper lanterns, the monastery's lamps for H2). Each is
a world JSON entry the bows already read (js/bows.js). **S per spot**. The bow becomes worth carrying off Sylvara.

**Y5 · The loomer's cloak.** The loomer weaves a warden's cloak from Rosewell's silk cocoons and owlmoss: quieter
steps (creatures notice you later). Files: assets/people.json, js/combat.js (aggro range × 0.8 while worn).
**S**. Ties Rose's silk trees to Sylvara's looms.

**Y6 · Thaelin's lost verse** (a quest for the new places, as they open). Thaelin's song has five verses and he's
forgotten where he wrote each: on the Boughs' tavern wall, behind the falls, on the lake's jetty, in a Deepwood root,
on the Crown's dial. Each opens with its place (`BridgeSylvara.OPEN`). Ends with the whole song played in the hall.
Files: assets/quests.json. **M**. Draws pilots through the six new places in order.

**Y7 · Silverrun fishing.** A `river` pool at the landings: a river trout, a silverscale, a rare moon carp (three new
fish; their icons drawn in js/fishart.js like the others). **M**; small art (code-drawn icons). A quiet thing to do on
the river, and the Collection's fish grow.

## Enigma — the listening post (5 places; restoration parked)

**What you do here today.** You dock at a silent station, piece together what happened to the Wren's crew through
three quests, meet Okafor in hydroponics, and decode dispatches at the cipher terminal.

**Where it breaks.** Once the three quests are done Enigma is finished; restoring it is Beck's parked idea. Most of
what's here is the main story's, so it should stay sparse.

**Dead ends.** The ring (`enigma-ring`): sealed doors and a crew rota, nothing to do; Okafor's tomatoes (her letter)
and the ship's greenhouse never meet; the cipher room and typist pay into nothing in the game; no reason to return after
*Five Berths*.

**The plan** (kept small on purpose).
- **E1 · Okafor's seeds.** Okafor trades a seedling from hydro (tomatoes, lemons) for greens from your ship's
  greenhouse; they grow in the greenhouse bays. Files: assets/people.json, js/greenhouse.js. **S**. Two lonely
  gardens meet.
- **E2 · Dispatches into the log.** Each cipher solved (the `/cipher-room` app) files a decoded dispatch in the
  Journal's log — station business only (shift swaps, supply orders), never the signal. **S**. The terminal means
  something without spending a reveal.
- **E3 · Okafor on the board.** Okafor already orders carrots on the farm's board; on X2's she asks for a radio valve
  (a circuit from the Undercity) and silk for a pressure seal. **S** (data).

## The Singularity (1 place)

**What you do here today.** You walk the broken planes at the Brink, find seven echoes of places you've been, and buy
the vending machine at the edge of the universe as a business.

**Where it breaks / the plan.** It's the end of the story and should stay that way. One small thing only:
**S1 · Echoes that grow.** The echoes already show where you've been; let a new echo appear each time you finish
something elsewhere (a quest, a fair won, a legend landed) — a line of light for each, read like a scrapbook. Files:
the singularity's world script. **S**. A reason to return that is about *you*, which is what the Brink already says.

## The Wayfarer (9 rooms)

**What you do here today.** Home: your quarters and locker, the bridge's helm and chart desk, the office where you
run the empire, the galley's meals by the ship's clock, the greenhouse beds, the observatory's daily sight, Eights in
the mess.

**The plan.** **W1 · Sights that add up** — the observatory's logged sights (one a ship's day) fill a star chart; a
full chart of a planet's sky is a Collection set (X4). **S**. **W2 · Dorrie's specials** — the galley's special is
your fish; let it also be Verdance cheese, Arcadia's noodles or Hoarfell fondue if they're in the hold, each meal a
different lasting bit (warm, quicker, steadier). Files: js/galley.js. **S**.

## Across every world

**X1 · What it's for, on every item.** The Backpack's item card shows worth and the best buyer
(js/storage.js `worthLine`). Add a *Uses* line from the same data the game already holds: the Workshop recipes it goes
into (js/workshop.js RECIPES), the brews (js/brewing.js), who loves it (js/gifts.js TASTES, named once you've met them),
its Collection set (js/codex.js), which businesses stock it (assets/businesses.json), what eating it does, what
quest wants it — and plainly "Nothing but a sale" when that's true (which also shows us what to fix). Files:
js/storage.js, js/inventory.js. **S–M**. The single biggest clarity fix: "what do I do with this?" answered in place.

**X2 · A notice board on every planet.** Generalise the farm's order board (js/homestead.js:31–48 the ORDERS table,
:258 the daily seed, :351 taking over the board's label) into a shared module: each planet's boards (Lumar's four,
the Snowcap Lodge, the Rootmarket, the spaceport and the Undercity kiosk, Brambleford's green) post three requests a
planet-day from people already there, seeded by date so two pilots see the same; each pays well over a sale, nudges
that person's feeling up, and is filled from your pack at the board. Requests are for things you catch, gather, make,
win or find — never "carry this parcel there" (courier jobs are out). Weight the tables toward the orphan items above.
**M** for the module, **S** a planet for the data. A daily reason to visit every planet, and the game telling you what
its things are for.

**X3 · Bonds that open things.** Feeling already moves with gifts, talks and orders (js/talk.js). Make three steps of
it mean something in the scripted game, at the thresholds the personas use (api/talk.mjs:107): at +3 a shopkeeper
gives a tenth off and a rumour-teller tells you a second rumour; at +6 a maker teaches a plan or a recipe they'd sell,
and a crew-able person's wage drops; at +9 a letter and a small keepsake. Show hearts on the talk card. Files:
js/interactions.js (showConversation), js/talk.js, js/workshop.js. **M**. Makes 139 gift tastes worth knowing.

**X4 · Collection sets for everything since October.** New sets with lasting bonuses: *The countryside* (wine,
cheeses, cider, flour, loaf, coffee, jam, candles), *The wood* (six herbs, six potions, the bows), *Below the street*
(scrap, circuit, chrome part, sump pearl, the bosses' trophies), *The valley* (its six drops), *Arcadia by night* (A4),
*Fellhaven fare* (fondue, cocoa, rösti, raclette, macarons), *The night sky* (W1). Files: js/codex.js. **S**. ~150
items gain a purpose, and the Collection tab leads to every planet.

**X5 · Wire the dead rumours.** 84 "Heard anything?" topics have no `rumour` key. A pass per planet: each points at
something real — a quest's start, a board request, a daily boss, a festival, a secret above — and the ones that are
only colour stay as they are. Leave the main story's alone (Ione's ship across the moon, Mette's light past the
Hoarspire, Aris's lanterns seen from Midnight). Files: assets/people.json, js/quests.js (rumours can name a non-quest
lead). **S a planet**. The Journal's *Next up* gets more than "someone here you haven't met".

**X6 · What each marker is for, on the Map.** The Map already marks people, shops, ways, fishing spots, gathering,
games and what's yours (js/map.js). Missing: what each is *for*. Give each marker's name a second line from the same
data as X1 — "buys crystals and glass", "Fell Dice, 10–50 a game", "boss once a day", "board: 3 requests" — and add a
*Come back for* row to a place's panel listing its daily things (piles, chests, bosses, the board, a festival on).
Files: js/map.js. **S–M**. "What's here and what's it for" without a new screen.

**X7 · Every planet in the hall of finds.** The hall (js/trophies.js) shows Lumar's finds; give it a second case of
plinths for the other planets' trophies: Saint Ruin's knuckles, the Dredge's heart, the wyrm's scale, a golem core, a
fallen star, Arcadia's Royale globe, the Regatta Cup's twin from the Ice Fair. Files: js/trophies.js,
assets/worlds/lumar-holm-hall.json `hall.spots`, scenes/lumar_holm_hall.py. **M**; **small art** (a case added to the
hall's render). Your base remembers everything, not just the sea.

**X8 · One festival a planet a season.** The calendar exists (js/festivals.js) and two contest types (show, derby).
Fill it as V1, H4 and Y3 describe, and give Lumar its spring (the Blessing of the Fleet at Diggen's Point: a derby of
the sea fish) and summer (Bloom Night on Rose Cove, on a bloom date: a glass-float show judged at the Glassworks).
Arcadia has no seasons; leave it out. Files: assets/festivals.json. **M** a festival, mostly data. Each planet's year
has something to wait for.

## The main story: what this plan leaves alone

The quests' `done` and `letter` texts and the personas' secrets (api/_personas.json) all point at one unwritten
story — something listening, E.B. and the painting, the list of ship names ending with the pilot's, the monks' book
that wrote your skiff before it was built, a sixth sea on the back of the fountain, the curios' road north to a
lantern past the last ridge. Beck hasn't decided it. Nothing above explains, extends or spends any of it:
- No addition mentions E.B., the ship-name list, the monks' book, the sixth sea, the egg's listening, the Wren's call
  or the Lantern Beyond's meaning. The dragon's riddle (L5) is about the islands; Edda's Book (V2) stays in the kitchen;
  the Singularity's echoes (S1) are your own deeds; Enigma's dispatches (E2) are station business.
- Rumours that are the story's (X5) stay unwired.
- The additions are local stories (the Admiral, the Last Monk, Iris Kade's arm, Thaelin's verse) and loops between
  systems, so whatever the main story becomes, it has a deeper world to happen in and nothing it has to undo.

## Not proposed (ruled out or parked)

The heist, rooftop running, courier jobs (every board request is *bring what you caught, made or found*), diving, the
dragon egg as an item, two flags, guiding jobs (Ysolde in H6 is crew, not a client), the dog sled, hired warriors (no
combat crew), Enigma's restoration (parked by Beck), new planets, new large systems.

## Build order

1. **X1 What it's for** — answers Beck's complaint directly, on every item, in a day.
2. **X2 Boards on every planet** — one module, then per-planet data; daily reasons everywhere and a home for orphans.
3. **H1 The valley's loot** — the deepest fights in the game stop paying into nothing.
4. **V1 Verdance's fairs** — three weekends in four come alive, mostly data on machinery that exists.
5. **A1 Desh** — a hook the game already shows players, and Arcadia's first link out.
6. **Y1 Ithil's star** — the cheapest granted wish; makes starfall nights matter.
7. **H2 The Last Monk** — Hoarfell's first story, joining the valley, Sylvara's arrows and the yetis.
8. **V2 Edda's Book** — Verdance's first story, through the people who only talk.
9. **X4 New Collection sets** — ~150 items gain a purpose and lead to every planet.
10. **X5 Rumours wired** — the Journal starts leading somewhere on every planet.
11. **X3 Bonds** — gifts and kindness finally do something.
12. **L3 The Admiral** — the capital's empty districts get a reason to walk.

Then: L1/L2/L4 (Lumar's board, glass and lantern, booths), A2–A4 (Arcadia's board, Sump fishing, tasting set), X6, H3,
H4, L6, L7, A6, A7, Y3–Y6, X7, X8, V4–V7, H5–H7, the rest.

## Appendix

**Scenery** (nothing to come back for, after taking out homes, rides and quest rooms): `lumar-crown-arsenal`,
`lumar-crown-bridge`, `lumar-crown-hill`, `lumar-crimson-cave` (after its quest), `lumar-midnight-tower-2` and `-3`
(after theirs), `enigma-ring`, `sylvara-crown`, `hoarfell-hollow`, `hoarfell-glacier`, `hangar`, `arcadia-loop` (a
ride). Homes (`lumar-home`, the manor's five rooms, `arcadia-home`, `arcadia-penthouse`) are decor by design.

**Talk-only people** (their conversation offers nothing; some have a counter elsewhere in the room):
- Arcadia (50): sev, drip_nell, gideon, rafe, penny, lou, bruno, ozzie, mimi, kit, roo, brick, tally, sallow, static,
  gage, teo, wen, lux, ume, lanternmaker, hoshi, keiko, kanna, halloran, brannigan, desh, nadia, bastien, hiro, dove,
  liftman, odette, mingo, sol, iris, clemence, ferris, aurelio, harlan, coco, bastien_sommelier, ashdown, perpetua,
  augustin, iris_kade, nox, tobias, fleur, seraphine.
- Lumar (23): crown_guard, bosun, quill, pim, steward, bryony, liesl, rook, wick, kettle, cliff_marina, cliff_yannis,
  cliff_despina, cliff_ilias, cliff_aris, glass_stavrou, glass_ione, crier, harrow, ione, rose_amaryllis, rose_oda,
  rose_lior.
- Verdance (14): wat, ludd, nell, mags, hobb, juniper, pike, marigold, ezra, silas, okoro, rudd, rosalind, tobias_ludd.
- Hoarfell (4): juno, mette, inge, anselm. Sylvara (4): elf_loomer, elf_liftkeeper, elf_starreader, elf_boatwright.

**Quests by planet**: Lumar — ship-mark, heron, crystals, listeners, keepers-log, singing-deep, gloaming-light;
Enigma — signal, wren, keepsakes; Sylvara — queens-favour, under-the-willow; Arcadia — null; the Singularity — brink;
Verdance, Hoarfell — none (the curios' tale, js/magic.js, passes through both).

**Crew**: corra, traveller, regular (Lumar), pip (Arcadia), okafor (Enigma).
