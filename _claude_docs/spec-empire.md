# Draft: the empire — how the business side fits together

**Status: draft for discussion with Beck.** Nothing here is built yet beyond what's marked as existing. Beck: "I think
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

## Questions for Beck
- How hands-on should it feel? (Proposal: early on you do things yourself; hiring officers is how you scale; visiting
  in person is always worth something but never required.)
- Should the empire reach across planets — Arcadia's businesses, the farm, Hoarfell's lodge — with the mothership as
  the freighter between them? (Proposal: yes, later.)
- Can you lose things — a ship sunk, a business that fails? (Proposal: setbacks, not ruin: a ship towed in damaged,
  a business that closes until restaffed.)
- Shared with Alyssa: a joint company, or each your own and trade between them?
