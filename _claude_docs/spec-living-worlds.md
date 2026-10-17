# Spec: living worlds — clocks, seasons, day & night, weather, staff, and the economy ramp

Agreed with Beck in conversation (October 2026). Draft numbers are marked *draft*; everything else is decided.

## 1. Time

- **One clock for everyone, pinned to US Eastern time** (`America/New_York`, DST included), so every pilot sees the same sky.
- Each planet has its own day, measured in real hours. A planet's clock reads hours and minutes into *its* day
  (Lumar runs 0:00 → 8:00), not a 24-hour face.

| Planet | Day | Days per real day | Days start (ET) |
|---|---|---|---|
| Sylvara | 24 h | 1 | midnight |
| Hoarfell | 12 h | 2 | midnight, noon |
| Lumar | 8 h | 3 | midnight, 8am, 4pm |
| Verdance | 6 h | 4 | midnight, 6am, noon, 6pm |
| Arcadia | always night | — | busiest 8pm–1am ET |
| Enigma, Singularity, the ship | no cycle | — | — |

- Dawn and dusk each take about a twelfth of the day (Lumar ~40 min, Verdance ~30, Hoarfell ~1 h, Sylvara ~2 h).
- Lumar has no clocks: St Brendan's rings the hours (every Lumar hour).

## 2. Seasons and daylight

On the real calendar, changing on Mondays (Verdance already works this way: `js/seasons.js`).

| Planet | Year | Seasons |
|---|---|---|
| Verdance | 4 weeks | 1 week each |
| Lumar | 8 weeks | 2 weeks each |
| Hoarfell | 6 weeks | winter 3 weeks; spring, summer, autumn 1 each |
| Sylvara | the real lunar month (~29.5 days) | full moon = the real full moon; the week round the real new moon is **the Dimming** |

Daylight changes smoothly through each season, not in steps:

| Planet | Summer | Spring / autumn | Winter |
|---|---|---|---|
| Lumar, Verdance | 65% | 50% | 35% |
| Hoarfell | 100% (midnight sun: "night" is a low golden glow) | swings fast | ~12% (a short blue twilight; aurora) |
| Sylvara | ~55% steady | | the Dimming: dusk fills most of the day |

## 3. Day & night in the art

- Outdoor scenes get a **day** render and a **night** render (Blender, the same scene scripts with the sun/moon and the
  lamps switched); the engine blends them through dusk and dawn (it already cross-fades `full`/`dim` light states).
- Interiors: window light and lamps follow the time.
- Order: Lumar first, then Verdance, Hoarfell, Sylvara. Arcadia stays night.
- Night life: lamplighters at dusk, lit windows, the Sapphire lighthouse beam sweeping (and guiding you home), fireflies
  on Verdance, floodlit night skiing on Hoarfell, Sylvara's glowing plants. Midnight Isle stays in night.

## 4. Weather (real stakes)

Shared, by date and place. Fair-play rules: always forecast (harbour board, almanac, the ship's bridge panel), always
shelter or a way out, losses are repairable.

- **Lumar seas**: storms (hull damage from waves, blown off course, lightning; rare fish bite; pirates stay in port),
  fog (rocks hide; islands vanish till close; the lighthouse guides). Helped by storm sails, hull, riggers.
  Autumn storms, winter fog and gales, calm summers.
- **Verdance**: rain (waters everything; fishing better), storms (flatten uncovered crops), heat waves (extra water).
- **Hoarfell**: blizzards (climbing stamina drains, whiteouts force shelter, frostbite in light gear); clear nights
  with aurora. Warm suits and hot meals help.
- **Sylvara**: starfall nights (collect fallen stars), spirit mists (wisps lead you astray).
- **Arcadia**: rain with neon reflections, smog, blackouts (the neon dies, the Royale on generators, the alley gets
  dangerous).

## 5. Opening hours

Every shop shows its hours on the door and in the ledger; a closed shop says when it opens; something in each place is
always open. Hours are in the planet's own clock.

- Lumar: bakery early → afternoon; smithy, apothecary, stalls, harbourmasters and shipwrights in daylight; taverns
  afternoon → late; inns always.
- Verdance: the store in daylight; your farm always.
- Hoarfell: lodge always; ski hire and lifts in daylight; floodlit pistes in the evening.
- Sylvara: elves keep their own hours — the glow market only after dark, a rare trader only at full moon.
- Arcadia: a 24-hour city; the Neon Royale always open, busiest 8pm–1am ET.

## 6. Staff and businesses

- A business earns **only while it's open and staffed** (or you're there running it yourself).
- Staff work their planet's hours, are paid a **daily wage** (from takings first, then your coins; a missed payday
  warns, a second loses them), gain skill the longer they stay, and can be moved (another planet = a day to arrive).
- Tiers (*draft* wages, per real day): **hand** 80–150 (one job; you still collect and restock), **manager** 600–1,200
  (runs everything, banks the takings, restocks, handles small trouble; ×1.6), **specialist** 1,500–3,000 (chef,
  fisher, hustler…; ×2+ in their trade).
- Small stalls pay with a hand; a manager only pays off on a bigger business. That's the ramp.
- Restocking feeds the other systems: the fish stall sells fish (yours, or bought in at cost), the bakery wants wheat
  and eggs, the noodle bar wants fish and greens.
- The ledger gets a staff roster: who's on shift, when each place opens, what each made today.

## 7. Crops and animals on the clock

Crops grow in Verdance daylight; a watering lasts a Verdance day; crops have seasons (only a greenhouse grows in
winter). *Draft*: turnip 1 day (6 h), carrot 2, strawberry 3 then every 2, sunflower 3, pumpkin 6 (1.5 real days),
starfruit 12 (3 real days). Eggs each morning, milk once a day. Hands work daylight hours.

## 8. The economy ramp

Survey (October 2026): you start with 0 coins; buying everything once costs ~100k; the galleon (11,000) is the
priciest thing. Found broken: the farm makes ~60k an hour (strawberries regrow every 4 minutes and Odile picks them
without walking; the bin never gluts); Splice pay rises 10 per board forever; holm voyages carry free cargo and
never move prices; contracts up to ~2,400 are open to the free sloop on day one; most wages are one-off. Fixed by
this spec: crops on the clock, Splice capped, voyages buy their cargo and move prices, contracts scale with the hull
and your standing, wages recur.

| Stage | Wealth | Earning from | Aiming for (*draft* prices) |
|---|---|---|---|
| Arrival | 0 → 2k | fishing, foraging, quests, arcade, small sloop jobs, first crops | the farm (1,500), a weapon, a satchel, a first stall |
| Settling | 2k → 25k | stalls with hands, the farm, cutter contracts, sea fights | cutter (3k), a home (3–8k), hens and cows, charts, a second stall |
| Building | 25k → 150k | shops with managers, the holm's ships, charters | brigantine (15k), shops (8–20k), the holm (25k+), specialists |
| Tycoon | 150k → 1M | venues, a fleet, Crown commissions | galleon (60k), venues (40–90k), the high-roller room, a fleet of hands |
| Legacy | 1M+ | enterprises | prestige goals below |

Business ladder (*draft*; payback roughly 2 → 4 → 6 → 10 real days of open hours):

| Kind | Price | Earns per open hour | Staff |
|---|---|---|---|
| Stalls & carts | 300–2,000 | 30–90 | a hand |
| Shops (bakery, apothecary, ski hire, noodle bar) | 8k–20k | 150–320 | hand or manager |
| Venues (tavern, bathhouse, lodge hotel, glow market) | 40k–90k | 450–900 | a manager |
| Enterprises (Crownhaven trading house, a shipyard, an Arcadia nightclub, a Royale table concession) | 200k–500k | 1,800–3,500 | a manager and specialists |

Legacy goals (*draft*): an Arcadia penthouse (~250k), a Crownhaven manor (~400k), the holm as a resort island,
a legendary ship (~300k), refitting the mothership, a statue in Crownhaven's square, owning the Neon Royale's
high-roller room (~2M: the house edge on the whales).

Recurring costs keep coins moving: wages, repairs, docking and upkeep, seeds and feed, restocking.

## Built (October 2026)

All five steps are in the game: the clock, hours and chronometer (js/clock.js, js/hours.js); day and night renders for
Lumar's harbour and square first, the other islands, Verdance, Sylvara and Hoarfell's town following; the economy pass and
staff (js/business.js, re-pricing across ships, homes, the farm and the holm); weather with stakes (js/weather.js);
timepieces (js/gear.js) and the legacy goals (js/legacy.js). Not yet: the penthouse, the manor and the holm as a resort;
night versions of Hoarfell's sport worlds and their drawn skies; restocking (shops buying in what they sell).

## 9. Build order

1. The clock and calendar (all planets), opening hours, the ship's bridge panel (each planet's time and weather).
2. Day & night art: Lumar, then the others.
3. The economy pass: the fixes above, re-pricing, staff, new businesses, crops on the clock.
4. Weather with stakes.
5. Timepieces in the shops; the legacy goals.
