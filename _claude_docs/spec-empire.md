# Draft: the empire — how the business side fits together

**Status: agreed direction; building it in chunks (below).** Beck: "I think
that's kind of where I'm going with the game… you want a bunch of ways to get these magic items and cool things and do
all your random business ops… ultimately build a cool engine or empire of all these cool things… make sure it all
makes sense and flows together."

## What's there now
Good pieces that mostly stand alone:
- **Businesses** (js/business.js): a ladder from stalls to legacy venues; hands, managers, specialists; stock fed from
  your pack; takings collected in person or banked by a manager; a daily payroll.
- **The fleet** (js/fleet.js, trade.js, holm.js): a ladder of hulls, guns and fittings, hands by grade, cargo by the
  crate between five seas, contracts, trading voyages — but only sent from the holm — and, as of today, passages
  ordered from anywhere.
- **The farm** (Verdance), **the holm** (home island, strongbox), **mining**, **fishing**, **forage**, **magic finds and
  curios**, **the Collection** (sets that pay once), **legacy goals** (statue, Sovereign, penthouse, manor, high-roller
  room), **the casino**.

What's missing is the **engine**: the parts don't feed each other much, running them is a lot of walking and clicking
in particular places, and the path from "I have money" to "I have something wondrous" is thin.

## The idea: an engine you build, then steer
1. **You decide; your people do.** Every holding takes *orders* you can give from anywhere — the office aboard the
   mothership is the headquarters, the ledger is the pocket version. Going somewhere in person is for bonuses (a
   better price, a tip-off, a rare buyer), never a chore you must do for things to work.
2. **Automation is earned by hiring.** Officers are the upgrade path, each running one part of the engine for you:
   - a **Captain** per ship: runs standing orders without you (below);
   - a **Factor** (trade): picks cargo and markets for your ships' standing routes;
   - a **Steward** (the holm), a **Bailiff** (the farm), a **Quartermaster** (the warehouse);
   - a **Fleet Master** (late): assigns idle ships to the best work.
   Each officer has a skill that grows with use and a trait or two (lucky, cautious, greedy, honest), so who you hire
   matters and you get attached to them.
3. **Standing orders** — the heart of ship orchestration. Instead of one-off voyages from one place:
   - **Trade route**: a loop of ports; the Factor chooses cargo, the Captain sails it, the profit lands in the treasury.
   - **Supply run**: carry goods between *your own* holdings (farm → warehouse → the Crown & Anchor's cellar).
   - **Fishing fleet**: work a sea's grounds; the catch fills the hold, feeds your fish stall and the fish tank.
   - **Hunt**: the Midnight Sea for monster trophies (a gunned ship and a brave captain), escorting for a fee.
   - **Explore**: chase rumours to uncharted water for curios, maps, relics.
   Each shows on the office's chart table as a live line, with a risk and a profit per run.
4. **Supply chains that link the places.** Goods have a home in the warehouse (the holm's, then others) and flow:
   farm crops, eggs and honey → the bakery and taverns; fish → the fish stall and the noodle bar; ore and crystals →
   the **Workshop**; monster trophies → the Workshop and the Ferryman. A business stocked by your own supply run
   earns full price (today a business buys in at cost when it's out).
5. **Magic things are the prize.** A **Workshop** (an Artificer you hire) turns rare inputs from all over the empire into
   wondrous things with real effects: a Storm Compass (fog never closes on your ships), a Gilded Ledger (+takings), a
   Tidecaller's Pearl (fish bite sooner), Abyss-ink sails, moonglass guns, a Ferryman's Bell (the drowned won't
   board). Expeditions bring back relics that only the Workshop can wake. The Collection becomes a **Cabinet of
   Wonders** whose completed sets give lasting bonuses to the engine, not just a one-time payout.
6. **People who grow.** Staff and hands gain experience and grade up (hand → manager), have loyalty (paid on time,
   treated well) and can be poached by rivals. A **Hiring Hall** in Crownhaven where you post jobs and candidates
   arrive through the day.
7. **A daily dispatch.** Each morning the office desk has a few opportunities and troubles across your regions: a
   buyer wants 40 crates of moon salt by Thursday, pirates are blockading Crimson (escort job, or reroute), a storm
   will close Rose Cove tomorrow, a rival bids for your tavern. Small decisions that keep the empire alive.
8. **Rank and reputation.** Trader → Merchant → Magnate → Tycoon → Sovereign, by worth and reputation in each region;
   ranks unlock licences (bigger businesses, a guild seat, the palace's favours), bigger ships, rarer contracts.
9. **The treasury.** One view of money in and out by source over the last week (little graphs), what's growing,
   what's losing — and a hint where the next coin is.

## Order to build it (each step stands alone)
1. **Standing orders + captains**: trade routes from wherever a ship lies (the holm's voyages generalised), repeat
   automatically, reported in the ledger and on the office chart. (Builds on today's ship orders.)
2. **The empire hub**: the ledger/office gets *Today* (needs you + the dispatch) and *Treasury* (income by source);
   the Hiring Hall; staff growing with experience.
3. **Supply chains**: a shared warehouse stock, supply runs between holdings, businesses stocked by them.
4. **The Workshop and magic things**: recipes from empire inputs, expeditions and relics, the Cabinet of Wonders' set
   bonuses.
5. **Ranks, licences, rivals and events.**

## Beck's decisions (October 17)
- **Yes to the engine**: an economy that scales across worlds as an empire; hire people, move toward automation, and
  see and manage all of it — from the office above all.
- **Crafting is central**: more materials, mining feeding upgrades, building more things; it all feeds the economy and
  your base. Build out bases in several of the places you've been.
- **Earn the best things yourself.** No hired warriors or loot expeditions (dropped, October 17): monster trophies and
  the rarest magic items you go and find on your own. Keep it cute and personal.
- **Upgrades have a place**: buy them where they're made (sail your ship there), or bring parts home to your own yard
  and hire smiths to build custom things. Build your own ship from enough timber and iron; long term, design it and
  add to it.
- **Progression must feel natural** — a real game you work up through, not a menu of everything at once.

## The chunks, in order
1. **Materials and the Workshop** — every material with a clear source (mining, forage, farm, markets, salvage,
   monsters); a Workshop you build at your base, smiths you hire to work it while you're away; recipes on the clock:
   processing (timber → planks, ore → bars), ship fittings and guns (cheaper than the yards, and some only craftable),
   tools (better pick, rod), things for your homes. *(built, October 17: js/workshop.js — fourteen new materials,
   29 recipes, smiths on the payroll, plans bought, found or taught for a favour, parts fitted by a harbourmaster;
   the Bridge's CLAUDE.md, "The Workshop". Its building is in the holm's render.)*
2. **Your own shipyard** — a slipway at the holm: fit the parts you've made to ships lying there; build a ship from
   plans you've bought at a yard plus timber, iron, rope and canvas, over days; choose her paint, sails and
   figurehead. Later: a designer to lay out decks, guns and holds.
   *(built, October 17: js/shipyard.js — the slipway on the holm (12,000, after the workshop), hull plans from the
   yards (cutter, brigantine, raider, galleon), a keel laid and named, three stages each with its own materials and
   hours, shipwrights on the payroll, launched into the fleet; paint, sails and figurehead on any ship lying at the holm;
   parts fitted for nothing. The Bridge's CLAUDE.md, "Your own shipyard". Her colours are drawn wherever she is; the slip
   is in the holm's scene script (assets_yard.py) and the holm is queued to render with it.)*
3. **Running it from the office** — standing orders and captains (trade loops, supply runs between your holdings),
   the Workshop's queue, the fleet's chart, the treasury, the daily dispatch: one desk for the whole empire.
   *(built, October 17: js/orders.js — captains in three grades on the payroll, trade loops of two to four ports and
   supply runs from the holm's warehouse to your businesses' stock (and materials home for the Workshop), worked out on
   the clock with risk by sea and a profit per run; js/dispatch.js — two to four seeded opportunities and troubles each
   ET morning, each a choice with a safe default; js/treasury.js — money in and out by source over seven days, with
   hints; the office's desk, workshop book, chart-table route lines and counting table, and the ledger's Today, Treasury
   and Standing orders. The Bridge's CLAUDE.md, "Running it from the office".)*
4. **Trophies and your own finds** — no hired warriors (Beck: "I don't know if I like the hired warriors hunt monsters
   and bring back the loot… fine to leave out"). The monsters you beat yourself and the relics you dig up yourself go
   in a trophy hall at your base; the rarest finds are always yours to go and get.
   *(built, October 17: js/trophies.js — the hall of finds on the holm (7,500, after the cottage), its own render with
   oak boards for the five sea legends, plinths and glass cases; eighteen finds drawn on their spots once you have them
   (relics from the Undercroft, the deep's monster trophies, the Lantern Beyond, the Heartsong, the Regatta Cup…), each
   with a plate; the empty ones say where to look. The Bridge's CLAUDE.md, "The hall of finds".)*
5. **Magic things** — the Workshop's highest tier: rare materials you found yourself + trophies → wondrous items with
   real effects; the Cabinet of Wonders' set bonuses.
6. **Across worlds** — bases beyond Lumar (the farm on Verdance, a lodge on Hoarfell, a front in Arcadia), freight by
   the mothership, ranks and licences.

## Questions for Beck (still open)
- How hands-on should it feel? (Proposal: early on you do things yourself; hiring officers is how you scale; visiting
  in person is always worth something but never required.)
- Should the empire reach across planets — Arcadia's businesses, the farm, Hoarfell's lodge — with the mothership as
  the freighter between them? (Proposal: yes, later.)
- Can you lose things — a ship sunk, a business that fails? (Proposal: setbacks, not ruin: a ship towed in damaged,
  a business that closes until restaffed.)
- Shared with Alyssa: a joint company, or each your own and trade between them?
