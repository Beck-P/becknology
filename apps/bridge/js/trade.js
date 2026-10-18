/**
 * BridgeTrade — cargo and the markets of Lumar's ports.
 *
 * GOODS are cargo: they ride in a ship's hold (js/fleet.js, `ship.hold`, counted in crates), never in your pack. Each
 * island makes some things cheaply and wants others dearly (`MARKET`: a multiplier on a good's base price per port —
 * under 1 it's made here, over 1 it's wanted); prices drift day to day (seeded by the date) and fall at a port where
 * you've just sold a lot of something (`glut`, which wears off over a few hours). What you dig, catch and gather can
 * go in a hold too (`HAUL`: ore, gems, crystals, fish, pearls - several to a crate) and sells at any port's market, at
 * that port's price for its kind.
 *
 * Rare cargo: moon salt (only the Ferryman on Midnight sells it, and he sells little) and anything from the deep mine.
 *
 * Contracts: each port posts two a day (seeded by the date): carry so many crates of a good to another port within a
 * day or two for a fee well over the market's. Take one, load the goods (buy them or bring your own), sail, and hand
 * them over at the far port's harbourmaster.
 *
 *   BridgeTrade.price(good, port, 'buy'|'sell')   .buy(ship, good, n, port)   .sell(ship, good, n, port)
 *   .crates(ship) / .room(ship)   .load(ship, itemId, n) / .unload(ship, itemId, n)   (pack ↔ hold)
 *   .contracts(port)   .take(contract)   .deliver(ship, port)   .mine()   (contracts you've taken)
 */
var BridgeTrade = (function () {
  var KEY = 'bridge_trade';
  var DAY = 86400000;

  // ---- what's carried -------------------------------------------------------------------------------------------------
  var GOODS = {
    salt_fish:  { name: 'Salt Fish', base: 18, look: 'barrel', c: ['#6a4422', '#9a6a3a', '#c8c0a8'],
                  desc: 'A barrel of Diggen\'s Point silverfin, packed in salt. Every galley on the five seas wants it.' },
    lamp_oil:   { name: 'Spore-lamp Oil', base: 34, look: 'jar', c: ['#3a5a3a', '#90e0a8', '#e8ffe0'],
                  desc: 'Pressed from the glowing spore-kelp off Diggen\'s Point. It burns green and lasts the night.' },
    timber:     { name: 'Pine Timber', base: 26, look: 'logs', c: ['#5a3a1a', '#8a5a2a', '#c89a5a'],
                  desc: 'Straight pine off the Point\'s hills. Shipwrights everywhere are short of it.' },
    glassware:  { name: 'Sapphire Glass', base: 48, look: 'crate', c: ['#2a4a7a', '#5a8ac0', '#c0e0ff'],
                  desc: 'Blue glass from the Sapphire kilns in straw: floats, lamps, bottles.' },
    spore_silk: { name: 'Spore Silk', base: 82, look: 'bolt', c: ['#7a3a5a', '#d070a0', '#ffd0e8'],
                  desc: 'Bolts of the shimmering cloth the Rose Cove weavers spin from crystal spores.' },
    roseite:    { name: 'Roseite', base: 40, look: 'crate', c: ['#6a2a4a', '#e070a0', '#ffe0f0'], item: true,
                  desc: 'Rose Cove\'s crystal, by the crate. A drop of water and it grows solid: every hull carries some.' },
    ember_rum:  { name: 'Ember Rum', base: 56, look: 'barrel', c: ['#5a1a10', '#a03a20', '#e08040'],
                  desc: 'Crimson Reach rum, aged in charred casks. It warms you through.' },
    blackpowder:{ name: 'Black Powder', base: 64, look: 'keg', c: ['#2a2a30', '#4a4a52', '#c03028'],
                  desc: 'Kegs of it, from the pirate camp\'s mill. Guns want it; harbourmasters don\'t.' },
    moon_salt:  { name: 'Moon Salt', base: 220, look: 'jar', c: ['#3a3a6a', '#b0b0ff', '#ffffff'], rare: true,
                  desc: 'Pale salt raked from the flats round Midnight\'s moon pool. It glows faintly, and alchemists pay anything for it.' }
  };
  // your own finds, several to a crate; `kind` picks the port's appetite for them
  var HAUL = {
    stone: { per: 10, kind: 'stone' }, iron_ore: { per: 5, kind: 'ore' }, silver_ore: { per: 5, kind: 'ore' }, star_iron: { per: 3, kind: 'ore' },
    moonstone: { per: 4, kind: 'gem' }, songstone: { per: 3, kind: 'gem' }, spore_minnow: { per: 10, kind: 'fish' },
    crimson_crystal: { per: 6, kind: 'crystal' }, sapphire_crystal: { per: 6, kind: 'crystal' }, midnight_crystal: { per: 6, kind: 'crystal' },
    hoar_crystal: { per: 6, kind: 'crystal' }, sea_glass: { per: 8, kind: 'crystal' }, star_pearl: { per: 4, kind: 'gem' },
    silverfin: { per: 6, kind: 'fish' }, bluefin: { per: 4, kind: 'fish' }, ember_snapper: { per: 4, kind: 'fish' }, moon_eel: { per: 3, kind: 'fish' },
    sapphire_ray: { per: 4, kind: 'fish' }, spore_tuna: { per: 3, kind: 'fish' }, lantern_angler: { per: 3, kind: 'fish' }, rose_shrimp: { per: 8, kind: 'fish' }, harbour_crab: { per: 6, kind: 'fish' }, fresh_fish: { per: 6, kind: 'fish' },
    glowtail: { per: 6, kind: 'fish' }, coral_dragonet: { per: 6, kind: 'fish' }, cinder_grouper: { per: 2, kind: 'fish' }, starfin: { per: 3, kind: 'fish' },
    jade_marlin: { per: 1, kind: 'fish' }, glass_swordfish: { per: 1, kind: 'fish' }, old_mossback: { per: 1, kind: 'fish' }, dawnveil: { per: 1, kind: 'fish' },
    emberjaw: { per: 1, kind: 'fish' }, crownfin: { per: 1, kind: 'fish' }, nightglass: { per: 1, kind: 'fish' },
    // the workshop's materials (js/workshop.js), a ship's stores: they sell anywhere at what they're worth
    pine_log: { per: 10, kind: 'stores' }, oak_log: { per: 6, kind: 'stores' }, plank: { per: 20, kind: 'stores' }, oak_plank: { per: 12, kind: 'stores' },
    copper_ore: { per: 5, kind: 'ore' }, iron_bar: { per: 10, kind: 'stores' }, copper_sheet: { per: 10, kind: 'stores' }, flax: { per: 20, kind: 'stores' },
    rope: { per: 10, kind: 'stores' }, pitch: { per: 10, kind: 'stores' }, sailcloth: { per: 4, kind: 'stores' }, glass: { per: 6, kind: 'stores' },
    powder: { per: 6, kind: 'stores' }, moonglass: { per: 6, kind: 'stores' }
  };
  // each port's appetite: < 1 made here (cheap), > 1 wanted here (dear). Your own haul by kind.
  var MARKET = {
    'lumar':          { salt_fish: 0.7, lamp_oil: 0.72, timber: 0.7, glassware: 1.15, spore_silk: 1.2, roseite: 1.1, ember_rum: 1.3, blackpowder: 1.1, moon_salt: 1.25,
                        ore: 1.0, gem: 1.0, crystal: 0.9, fish: 0.8, stone: 0.8 },
    'lumar-sapphire': { salt_fish: 1.15, lamp_oil: 1.2, timber: 1.35, glassware: 0.68, spore_silk: 1.4, roseite: 1.3, ember_rum: 1.25, blackpowder: 1.3, moon_salt: 1.5,
                        ore: 1.25, gem: 1.3, crystal: 1.1, fish: 1.0, stone: 1.2 },
    'lumar-rose':     { salt_fish: 1.3, lamp_oil: 1.1, timber: 1.3, glassware: 1.3, spore_silk: 0.66, roseite: 0.62, ember_rum: 1.1, blackpowder: 0.9, moon_salt: 1.3,
                        ore: 1.1, gem: 0.9, crystal: 0.7, fish: 1.2, stone: 1.0 },
    'lumar-crimson':  { salt_fish: 1.4, lamp_oil: 1.35, timber: 1.45, glassware: 1.35, spore_silk: 1.1, roseite: 1.2, ember_rum: 0.6, blackpowder: 0.62, moon_salt: 1.6,
                        ore: 1.3, gem: 1.15, crystal: 1.0, fish: 1.3, stone: 1.1 },
    // Tortuga: the pirates' port - rum and powder cheap, everything respectable dear
    'lumar-cinder':   { salt_fish: 1.35, lamp_oil: 1.4, timber: 1.5, glassware: 1.45, spore_silk: 1.2, roseite: 1.25, ember_rum: 0.55, blackpowder: 0.7, moon_salt: 1.7,
                        ore: 1.25, gem: 1.3, crystal: 1.05, fish: 1.2, stone: 1.0 },
    'lumar-midnight': { salt_fish: 1.6, lamp_oil: 1.7, timber: 1.2, glassware: 1.0, spore_silk: 0.9, roseite: 1.0, ember_rum: 1.5, blackpowder: 0.8, moon_salt: 0.45,
                        ore: 0.8, gem: 1.4, crystal: 1.3, fish: 0.7, stone: 0.6 },
    // the capital buys everything, and pays best for the luxuries; Tern Holm lives on fish
    'lumar-crown':    { salt_fish: 0.95, lamp_oil: 1.05, timber: 1.15, glassware: 1.05, spore_silk: 1.55, roseite: 1.35, ember_rum: 1.3, blackpowder: 1.2, moon_salt: 1.85,
                        ore: 1.3, gem: 1.5, crystal: 1.2, fish: 1.1, stone: 1.3 },
    'lumar-tern':     { salt_fish: 0.55, lamp_oil: 1.25, timber: 1.2, glassware: 1.2, spore_silk: 1.3, roseite: 1.1, ember_rum: 1.4, blackpowder: 1.0, moon_salt: 1.2,
                        ore: 0.9, gem: 1.0, crystal: 1.0, fish: 0.6, stone: 0.9 }
  };
  // what each port's market actually stocks (you can sell anything anywhere; you can only buy what they have)
  var STOCK = {
    'lumar': ['salt_fish', 'lamp_oil', 'timber', 'glassware'],
    'lumar-sapphire': ['glassware', 'salt_fish', 'ember_rum', 'spore_silk', 'timber'],
    'lumar-rose': ['spore_silk', 'roseite', 'lamp_oil'],
    'lumar-crimson': ['ember_rum', 'blackpowder', 'salt_fish'],
    'lumar-midnight': ['moon_salt'],
    'lumar-cinder': ['ember_rum', 'blackpowder'],
    'lumar-crown': ['salt_fish', 'lamp_oil', 'timber', 'glassware', 'spore_silk', 'ember_rum'],
    'lumar-tern': ['salt_fish', 'lamp_oil']
  };
  var SPREAD = 0.08;                                    // a market buys under its price and sells over it

  var st = { glut: {}, taken: [], done: {} };
  try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  function today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function port(id) {                                    // a world in a port's island counts as the port
    var P = typeof BridgeFleet !== 'undefined' ? BridgeFleet.islandOf(id) : id;
    return MARKET[P] ? P : null;
  }
  function isGood(id) { return !!GOODS[id]; }
  function name(id) { if (GOODS[id]) return GOODS[id].name; var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return it ? it.name : id; }
  function per(id) { return GOODS[id] ? 1 : HAUL[id] ? HAUL[id].per : 0; }
  function base(id) {
    if (GOODS[id]) return GOODS[id].base;
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id);
    return it ? Math.max(1, it.value || 2) : 1;
  }
  function appetite(id, P) {
    var M = MARKET[P] || {};
    if (GOODS[id]) return M[id] || 1;
    return HAUL[id] ? M[HAUL[id].kind] || 1 : 1;
  }
  function glutOf(id, P) {                               // how much you've sold here lately (halves every 2 hours)
    var g = st.glut[P + ':' + id];
    if (!g) return 0;
    return g.n * Math.pow(0.5, (Date.now() - g.at) / 7200000);
  }
  // how deep a market is: sell DEPTH units of a thing at once and the price has halved; buy them and it's doubled
  function depth(id) { return GOODS[id] ? 90 : 160; }
  /** The price each of `id` at port P, to `buy` from it or to `sell` to it — `n` at once (default 1): a big deal moves
   *  the price against you, and a port where you've sold a lot lately pays less until it wears off. */
  function price(id, P, side, n) {
    P = port(P);
    if (!P) return 0;
    n = n || 1;
    var drift = 0.85 + 0.3 * hash(today() + ':' + P + ':' + id), K = depth(id);
    var press = side === 'buy' ? 1 + (n / 2) / K : 1 / (1 + (glutOf(id, P) + n / 2) / K);
    var p = base(id) * appetite(id, P) * drift * press;
    var pb = typeof BridgeFleet !== 'undefined' && BridgeFleet.crewBest ? BridgeFleet.crewBest('purser') : 0;
    var purser = pb ? 0.03 + 0.02 * pb : 0;                                  // a green purser 5%, an old hand 9%
    p = side === 'buy' ? p * (1 + SPREAD - purser) : p * (1 - SPREAD + purser);
    return Math.max(1, Math.round(p));
  }
  function stock(P) { P = port(P); return P ? (STOCK[P] || []).slice() : []; }
  /** How much a port will sell you today (rare cargo is scarce). */
  function supply(id, P) { return GOODS[id] && GOODS[id].rare ? 4 + Math.floor(hash(today() + ':' + P) * 4) - (st.bought && st.bought[today() + ':' + P + ':' + id] || 0) : 99; }

  // ---- the hold ---------------------------------------------------------------------------------------------------
  function crates(ship) {
    var n = 0, h = ship && ship.hold || {};
    for (var id in h) if (h[id] > 0) n += Math.ceil(h[id] / (per(id) || 1));
    return n;
  }
  function capacity(ship) { return typeof BridgeFleet !== 'undefined' ? BridgeFleet.effective(ship).hold : 12; }
  function room(ship) { return Math.max(0, capacity(ship) - crates(ship)); }
  /** How many more units of `id` fit (filling the part-crate first). */
  function fits(ship, id) {
    var p = per(id) || 1, have = ship.hold[id] || 0, part = have % p ? p - have % p : 0;
    return part + room(ship) * p;
  }
  function add(ship, id, n) { ship.hold[id] = (ship.hold[id] || 0) + n; if (typeof BridgeFleet !== 'undefined') BridgeFleet.save(); }
  function take(ship, id, n) {
    ship.hold[id] = (ship.hold[id] || 0) - n;
    if (ship.hold[id] <= 0) delete ship.hold[id];
    if (typeof BridgeFleet !== 'undefined') BridgeFleet.save();
  }
  /** Pack → hold. Resolves {ok, n}. */
  function load(ship, id, n) {
    if (!per(id) || typeof BridgeInventory === 'undefined') return { ok: false, reason: 'not_cargo' };
    n = Math.min(n, BridgeInventory.getCount(id), fits(ship, id));
    if (n <= 0) return { ok: false, reason: 'full' };
    BridgeInventory.removeItem(id, n);
    add(ship, id, n);
    return { ok: true, n: n };
  }
  /** Hold → pack (your own finds only: trade goods stay in the hold). */
  function unload(ship, id, n) {
    if ((GOODS[id] && !GOODS[id].item) || typeof BridgeInventory === 'undefined') return { ok: false, reason: 'cargo' };
    n = Math.min(n, ship.hold[id] || 0);
    if (n <= 0 || !BridgeInventory.addItem(id, n)) return { ok: false, reason: 'pack' };
    take(ship, id, n);
    return { ok: true, n: n };
  }

  // ---- buying and selling -----------------------------------------------------------------------------------------
  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(n, why) : Promise.resolve({ ok: false, reason: 'offline' });
  }
  function paid(n, why) {
    if (!n) return Promise.resolve(true);                // the Queen's commission: paid at the palace, not here
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins
      ? BridgeProgression.awardCoins(n, why).then(function (b) { return b != null; }) : Promise.resolve(false);
  }
  function buy(ship, id, n, P) {
    P = port(P);
    if (!P || stock(P).indexOf(id) < 0) return Promise.resolve({ ok: false, reason: 'not_here' });
    n = Math.min(n, fits(ship, id), Math.max(0, supply(id, P)));
    if (n <= 0) return Promise.resolve({ ok: false, reason: room(ship) ? 'sold_out' : 'full' });
    var cost = price(id, P, 'buy', n) * n;
    return pay(cost, 'cargo:' + id).then(function (r) {
      if (!r || !r.ok) return { ok: false, reason: (r && r.reason) || 'coins' };
      add(ship, id, n);
      if (GOODS[id].rare) { st.bought = st.bought || {}; var k = today() + ':' + P + ':' + id; st.bought[k] = (st.bought[k] || 0) + n; store(); }
      return { ok: true, n: n, cost: cost };
    });
  }
  /** A sale made out of sight (a ship sent on a voyage from the holm): the market there feels it like any other. */
  function noteSold(id, P, n) {
    P = port(P);
    if (!P || !(n > 0)) return;
    var k = P + ':' + id;
    st.glut[k] = { n: glutOf(id, P) + n, at: Date.now() };
    store();
  }
  function sell(ship, id, n, P) {
    P = port(P);
    n = Math.min(n, ship.hold[id] || 0);
    if (!P || n <= 0) return Promise.resolve({ ok: false, reason: 'none' });
    var each = price(id, P, 'sell', n), total = each * n;
    take(ship, id, n);                                    // off the ship first; back on if the coins don't go through
    return paid(total, 'cargo:' + id).then(function (ok) {
      if (!ok) { add(ship, id, n); return { ok: false, reason: 'offline' }; }
      var k = P + ':' + id, g = glutOf(id, P);
      st.glut[k] = { n: g + n, at: Date.now() };
      store();
      return { ok: true, n: n, total: total };
    });
  }

  /** The best cargo of `id` to carry from port A to port B in `room` crates: {n, profit} (what moves the prices least). */
  function bestRun(id, A, B, room) {
    var best = { n: 0, profit: 0 };
    for (var n = 2; n <= room; n += Math.max(1, Math.round(room / 40))) {
      var pr = n * (price(id, B, 'sell', n) - price(id, A, 'buy', n));
      if (pr > best.profit) best = { n: n, profit: pr };
    }
    return best;
  }

  /** Today's best runs for a ship of `room` crates: from one port to another, up to three goods, each in the amount that
   *  moves the prices least (js/trade.js bestRun) - a big hold pays off on a route with several goods to carry. */
  // one run from a to b: up to three goods made at a that b wants, sized so the hold pays best
  function runAB(a, b, room) {
    var runs = stock(a).filter(function (g) { return !GOODS[g].rare; }).map(function (g) { var r = bestRun(g, a, b, room); r.good = g; return r; })
      .filter(function (r) { return r.profit > 0; }).sort(function (p, q) { return q.profit - p.profit; }).slice(0, 3);
    var left = room, goods = [], profit = 0;
    runs.forEach(function (r) { var n = Math.min(r.n, left); if (n < 2) return; var k = n / r.n; goods.push({ good: r.good, n: n }); profit += r.profit * k; left -= n; });
    return goods.length ? { from: a, to: b, good: goods[0].good, goods: goods, crates: room - left, profit: Math.round(profit) } : null;
  }
  function routes(room) {
    var out = [];
    PORTS.forEach(function (a) { PORTS.forEach(function (b) { if (a !== b) { var r = runAB(a, b, room); if (r) out.push(r); } }); });
    out.sort(function (p, q) { return q.profit - p.profit; });
    return out.slice(0, 5);
  }
  // a circuit: the best run, then the best run on from where she lands (not straight back), and a third if it pays —
  // for a big hold one market can't take it all, so she trades her way round (js/holm.js sends ships on these)
  function bestFrom(a, room, not) {
    var best = null;
    PORTS.forEach(function (b) { if (b === a || b === not) return; var r = runAB(a, b, room); if (r && (!best || r.profit > best.profit)) best = r; });
    return best;
  }
  function circuits(room) {
    var out = [];
    routes(room).slice(0, 4).forEach(function (r1) {
      var r2 = bestFrom(r1.to, room, r1.from);
      if (!r2) return;
      var r3 = bestFrom(r2.to, room, r2.from), legs = [r1, r2].concat(r3 && r3.profit > r1.profit * 0.25 ? [r3] : []);
      out.push({ circuit: true, legs: legs, from: r1.from, to: legs[legs.length - 1].to, good: r1.good, goods: r1.goods,
                 crates: legs.reduce(function (m, l) { return Math.max(m, l.crates); }, 0), profit: legs.reduce(function (n, l) { return n + l.profit; }, 0) });
    });
    out.sort(function (p, q) { return q.profit - p.profit; });
    return out.slice(0, 3);
  }
  // ---- the catch: a ship's fish hold (js/fleet.js), landed as she ties up (js/sloop.js) or from her card at the harbour --
  /** What the fish in her hold would fetch on this port's quay, all at once. */
  function catchValue(ship, P) {
    P = port(P);
    var c = BridgeFleet.catchOf(ship), t = 0;
    if (P) Object.keys(c).forEach(function (id) { t += price(id, P, 'sell', c[id]) * c[id]; });
    return t;
  }
  /** Sell the whole catch on the quay, at this port's price for fish (a glut here, like any sale). */
  function sellCatch(ship, P) {
    P = port(P);
    var c = Object.assign({}, BridgeFleet.catchOf(ship)), ids = Object.keys(c), total = catchValue(ship, P), n = 0;
    if (!P || !ids.length) return Promise.resolve({ ok: false, reason: 'none' });
    ids.forEach(function (id) { n += BridgeFleet.takeFish(ship, id, c[id]); });   // off the boat first; back on if the coins don't go
    return paid(total, 'catch').then(function (ok) {
      if (!ok) { ids.forEach(function (id) { for (var i = 0; i < c[id]; i++) BridgeFleet.stowFish(ship, id); }); return { ok: false, reason: 'offline' }; }
      ids.forEach(function (id) { var k = P + ':' + id; st.glut[k] = { n: glutOf(id, P) + c[id], at: Date.now() }; });
      store();
      return { ok: true, n: n, total: total };
    });
  }
  /** Carry the catch ashore: into your pack, as much as there's room for (the rest stays aboard). */
  function carryCatch(ship) {
    var c = Object.assign({}, BridgeFleet.catchOf(ship)), moved = 0, left = 0;
    Object.keys(c).forEach(function (id) {
      if (typeof BridgeInventory !== 'undefined' && BridgeInventory.addItem(id, c[id]) !== false) moved += BridgeFleet.takeFish(ship, id, c[id]);
      else left += c[id];
    });
    return { moved: moved, left: left };
  }
  /** "3 bluefin, a jade marlin" */
  function catchList(ship) {
    var c = BridgeFleet.catchOf(ship);
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (id) { return (c[id] > 1 ? c[id] + ' × ' : '') + name(id); }).join(', ');
  }

  // ---- contracts --------------------------------------------------------------------------------------------------
  var PORTS = ['lumar', 'lumar-crown', 'lumar-tern', 'lumar-sapphire', 'lumar-rose', 'lumar-crimson', 'lumar-cinder', 'lumar-midnight'];
  function contracts(P) {
    P = port(P);
    if (!P) return [];
    var d = today(), out = [];
    for (var i = 0; i < 2; i++) {
      var h1 = hash(d + ':' + P + ':c' + i), h2 = hash(d + ':' + P + ':d' + i), h3 = hash(d + ':' + P + ':n' + i);
      var dests = PORTS.filter(function (q) { return q !== P; }), to = dests[Math.floor(h2 * dests.length)];
      // a good the destination wants, that's to be had somewhere
      var wants = Object.keys(GOODS).filter(function (g) { return !GOODS[g].rare && (MARKET[to][g] || 1) > 1.05; });
      if (!wants.length) continue;
      var good = wants[Math.floor(h1 * wants.length)], n = 4 + Math.floor(h3 * 8);
      var fee = Math.round(GOODS[good].base * n * (1.5 + h1 * 0.5) / 10) * 10;   // you buy the goods: this is the premium on top
      var id = d + ':' + P + ':' + i;
      out.push({ id: id, from: P, to: to, good: good, n: n, fee: fee, due: (d + 1 + (h3 > 0.5 ? 1 : 0)), taken: !!st.taken.filter(function (c) { return c.id === id; })[0],
                 done: !!st.done[id] });
    }
    return out;
  }
  // the Exchange's charters (Crownhaven): three long hauls a day — one a cutter can carry, one for a brigantine, one only
  // a galleon will take — any good to any port, a few days to do it, a fee that pays for the size. Delivered like any
  // contract, at the far port's harbourmaster.
  var CHARTER = [{ n: 24, spread: 14, k: 1.6, kk: 0.3 }, { n: 64, spread: 40, k: 1.45, kk: 0.25 }, { n: 150, spread: 90, k: 1.35, kk: 0.2 }];
  function charters() {
    var d = today(), out = [];
    CHARTER.forEach(function (C, i) {
      var h1 = hash(d + ':ex:c' + i), h2 = hash(d + ':ex:d' + i), h3 = hash(d + ':ex:n' + i);
      var to = PORTS[Math.floor(h2 * PORTS.length)];
      var wants = Object.keys(GOODS).filter(function (g) { return !GOODS[g].rare && !GOODS[g].item && (MARKET[to][g] || 1) >= 1.0; });
      if (!wants.length) return;
      var good = wants[Math.floor(h1 * wants.length)], n = C.n + Math.floor(h3 * C.spread);
      var warrant = typeof BridgeCrown !== 'undefined' && BridgeCrown.warrant() ? 1.2 : 1;   // the Queen's warrant
      var fee = Math.round(GOODS[good].base * n * (C.k + h1 * C.kk) * warrant / 10) * 10;
      var id = d + ':exchange:' + i;
      out.push({ id: id, from: 'lumar-crown', to: to, good: good, n: n, fee: fee, due: d + 3 + (h3 > 0.5 ? 1 : 0), charter: true,
                 taken: !!st.taken.filter(function (c) { return c.id === id; })[0], done: !!st.done[id] });
    });
    return out;
  }
  function mine() {                                      // contracts you've taken and not delivered, still in time
    var d = today();
    st.taken = st.taken.filter(function (c) { return !st.done[c.id] && c.due >= d; });
    return st.taken.slice();
  }
  function takeContract(c) { if (!mine().filter(function (x) { return x.id === c.id; })[0]) { st.taken.push(c); store(); } }
  /** A contract delivered out of sight — by a captain on standing orders (js/orders.js), who's paid the fee. */
  function complete(id) { st.done[id] = Date.now(); store(); }
  /** Hand over every contract due at this port that the ship has the goods for. Resolves [{contract, ok}] */
  function deliver(ship, P) {
    P = port(P);
    var due = mine().filter(function (c) { return c.to === P && (ship.hold[c.good] || 0) >= c.n; });
    return Promise.all(due.map(function (c) {
      take(ship, c.good, c.n);
      return paid(c.fee, 'contract:' + c.good).then(function (ok) {
        if (!ok) { add(ship, c.good, c.n); return { contract: c, ok: false }; }
        st.done[c.id] = Date.now(); store();
        return { contract: c, ok: true };
      });
    }));
  }

  // ---- how cargo looks: an icon per good, in the items' 16-unit style --------------------------------------------
  function px(ctx, x, y, u, c, rects) { ctx.fillStyle = c; rects.forEach(function (r) { ctx.fillRect(x + r[0] * u, y + r[1] * u, r[2] * u, r[3] * u); }); }
  var LOOKS = {
    barrel: function (ctx, x, y, u, c) {
      px(ctx, x, y, u, '#1a1008', [[4, 2, 8, 13], [3, 4, 10, 9]]);
      px(ctx, x, y, u, c[0], [[5, 3, 6, 11], [4, 5, 8, 7]]);
      px(ctx, x, y, u, c[1], [[6, 3, 3, 11], [5, 5, 3, 7]]);
      px(ctx, x, y, u, '#3a3a40', [[4, 5, 8, 1], [4, 11, 8, 1]]);
      px(ctx, x, y, u, c[2], [[6, 2, 4, 1]]);
    },
    keg: function (ctx, x, y, u, c) {
      LOOKS.barrel(ctx, x, y, u, [c[0], c[1], '#6a5a3a']);
      px(ctx, x, y, u, c[2], [[7, 7, 2, 2]]);
    },
    jar: function (ctx, x, y, u, c) {
      px(ctx, x, y, u, '#1a1008', [[6, 1, 4, 2], [4, 3, 8, 12], [3, 5, 10, 8]]);
      px(ctx, x, y, u, '#6a4a2a', [[6, 2, 4, 1]]);
      px(ctx, x, y, u, c[0], [[5, 4, 6, 10], [4, 6, 8, 6]]);
      px(ctx, x, y, u, c[1], [[5, 6, 5, 6]]);
      px(ctx, x, y, u, c[2], [[6, 7, 2, 2]]);
    },
    crate: function (ctx, x, y, u, c) {
      px(ctx, x, y, u, '#1a1008', [[2, 4, 12, 11]]);
      px(ctx, x, y, u, '#8a6034', [[3, 5, 10, 9]]);
      px(ctx, x, y, u, '#5a3a1a', [[3, 9, 10, 1], [7, 5, 1, 9]]);
      px(ctx, x, y, u, c[1], [[4, 2, 3, 3], [8, 1, 3, 4]]);
      px(ctx, x, y, u, c[2], [[5, 2, 1, 1], [9, 1, 1, 2]]);
      px(ctx, x, y, u, '#d8c890', [[4, 4, 8, 1]]);
    },
    bolt: function (ctx, x, y, u, c) {
      px(ctx, x, y, u, '#1a1008', [[2, 5, 12, 8]]);
      px(ctx, x, y, u, c[0], [[3, 6, 10, 6]]);
      px(ctx, x, y, u, c[1], [[3, 6, 10, 3]]);
      px(ctx, x, y, u, c[2], [[4, 7, 7, 1]]);
      px(ctx, x, y, u, '#f0e0c0', [[12, 6, 2, 6]]);
      px(ctx, x, y, u, c[0], [[12, 8, 1, 2]]);
    },
    logs: function (ctx, x, y, u, c) {
      px(ctx, x, y, u, '#1a1008', [[1, 5, 14, 9]]);
      [[2, 9], [7, 9], [4, 5], [10, 6]].forEach(function (p) {
        px(ctx, x, y, u, c[0], [[p[0], p[1], 4, 4]]);
        px(ctx, x, y, u, c[2], [[p[0] + 1, p[1] + 1, 2, 2]]);
        px(ctx, x, y, u, c[1], [[p[0] + 1, p[1] + 1, 1, 1]]);
      });
    }
  };
  function icon(g) { return function (ctx, x, y, s) { LOOKS[g.look](ctx, x, y, s / 16, g.c); }; }
  // cargo shows up wherever items are drawn (the market and hold panels use item icons)
  if (typeof BridgeItems !== 'undefined' && BridgeItems.all) {
    var IT = BridgeItems.all();
    Object.keys(GOODS).forEach(function (id) {
      var g = GOODS[id];
      if (IT[id]) return;                                 // already an item (roseite): it keeps its own look
      IT[id] = { id: id, name: g.name, desc: g.desc, type: 'cargo', stackable: true, draw: icon(g), value: 0 };
    });
  }

  return { GOODS: GOODS, HAUL: HAUL, MARKET: MARKET, PORTS: PORTS, isGood: isGood, name: name, per: per, port: port, price: price,
           catchValue: catchValue, sellCatch: sellCatch, carryCatch: carryCatch, catchList: catchList,
           stock: stock, supply: supply, crates: crates, capacity: capacity, room: room, fits: fits, load: load, unload: unload,
           buy: buy, sell: sell, noteSold: noteSold, bestRun: bestRun, routes: routes, circuits: circuits, depth: depth, contracts: contracts, charters: charters, today: today, mine: mine, take: takeContract, deliver: deliver, complete: complete,
           _state: function () { return st; } };
})();
