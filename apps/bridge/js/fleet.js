/**
 * BridgeFleet — the ships you own on Lumar's seas, their crews and fittings, and the one you're sailing.
 *
 * SHIPS is the ladder. Each sails differently, not just bigger:
 *   - the SLOOP, your first boat: light, quick to turn, a few crates' room;
 *   - the CUTTER: a bigger single-master with two headsails, the quickest thing on the Emerald, a mount for one gun;
 *   - the BRIGANTINE: square sails forward, a big main aft — slower to turn and worse to windward, but she shrugs off
 *     a Crimson squall and carries a real cargo;
 *   - the GALLEON: three masts of square sail, a hold like a warehouse, five gun ports; she sails like a cathedral
 *     (pays off slowly, can't point), and the Midnight rocks barely mark her;
 *   - the RAIDER, from the pirate yard on Crimson Reach, no questions asked: the fastest hull on the five seas.
 * For each: L/beam (tiles), vmax (tiles a second, beam reach, full breeze), turn and accel (× the sloop's), nogo (how
 * close to the wind she'll sail, radians), hold (crates), hull (strength), slots (gun mounts), crew (hands she needs to
 * sail), storm and rocks (× the damage a Crimson storm or a Midnight rock does her). js/sloop.js sails `active()`.
 *
 * GUNS go in a ship's slots; FITS (sheathing, sails, rigging, lanterns) are fitted once each. Harbourmasters
 * (js/harbour.js) sell both, and each port has its own (Crimson the heavy guns, Rose the crystal sails, Midnight the
 * Ferryman's moonglass).
 *
 * CREW: hands you sign on at a port (each sea has its own people: `recruits(port)`, a fresh three a day). Each has a
 * ROLE and a skill (1-3) and lives aboard one of your ships. A ship needs `crew` hands to sail; gunners make her guns
 * fire twice as fast, a navigator makes her quicker, a rigger handier and safer in a storm, fighters repel boarders,
 * a purser haggles. `effective(ship)` folds fittings and crew into her spec.
 *
 * Where they lie: the sloop is always at the pier of whatever island you're on (the starter boat follows you); every
 * bigger ship is where you last tied her up (`at`, an island id). Kept in localStorage bridge_fleet.
 */
var BridgeFleet = (function () {
  var KEY = 'bridge_fleet';
  var SHIPS = {
    sloop:      { name: 'Sloop', price: 0, L: 2.6, beam: 1.0, vmax: 4.4, turn: 1.0, accel: 1.0, nogo: 0.7, hold: 12, hull: 40, slots: 0, crew: 0,
                  storm: 1.0, rocks: 1.0, sheet: 'sloop',
                  blurb: 'Your first boat. Light on her feet and quick to turn, with room for a few crates.' },
    cutter:     { name: 'Cutter', price: 1400, L: 3.4, beam: 1.25, vmax: 5.0, turn: 0.9, accel: 0.85, nogo: 0.72, hold: 40, hull: 70, slots: 1, crew: 1,
                  storm: 0.8, rocks: 0.8, sheet: 'cutter',
                  blurb: 'A bigger single-master with two headsails: the quickest thing on the Emerald, a hold for real cargo and a mount for one gun.' },
    brigantine: { name: 'Brigantine', price: 4200, L: 5.0, beam: 1.6, vmax: 4.6, turn: 0.62, accel: 0.6, nogo: 0.86, hold: 120, hull: 150, slots: 3, crew: 3,
                  storm: 0.35, rocks: 0.55, sheet: 'brigantine',
                  blurb: 'Square sails forward, a big main aft. Slower through a turn and no good close to the wind, but she shrugs off a Crimson squall and carries a proper cargo.' },
    galleon:    { name: 'Galleon', price: 11000, L: 7.0, beam: 2.2, vmax: 4.2, turn: 0.42, accel: 0.4, nogo: 1.0, hold: 300, hull: 280, slots: 5, crew: 5,
                  storm: 0.15, rocks: 0.3, sheet: 'galleon',
                  blurb: 'Three masts of square sail and a hold like a warehouse. She sails like a cathedral, and nothing on the Midnight Sea frightens her hull.' },
    raider:     { name: 'Raider', price: 6500, L: 4.4, beam: 1.3, vmax: 5.6, turn: 0.85, accel: 0.8, nogo: 0.74, hold: 50, hull: 110, slots: 4, crew: 3,
                  storm: 0.5, rocks: 0.7, sheet: 'raider',
                  blurb: 'A black-hulled Crimson schooner, no questions asked. The fastest hull on the five seas, and teeth to match.' }
  };
  var NAMES = { cutter: ['Swift', 'Tern', 'Kittiwake', 'Spindrift'], brigantine: ['Mary Ferris', 'Good Hope', 'Lantern', 'Wayfarer'],
                galleon: ['Sovereign', 'Emerald Crown', 'Old Faithful', 'Leviathan'], raider: ['Red Gull', 'Sea Wolf', 'Ember', 'Black Petrel'] };

  // guns: damage a shot, range (tiles), reload (s), where they bear (the beam, or dead ahead); `holy` bites the drowned
  var GUNS = {
    swivel:       { name: 'Swivel Gun', price: 180, dmg: 5, range: 5, reload: 1.4, arc: 'side', blurb: 'A little gun on a post. Quick to reload, short of range.' },
    long_nine:    { name: 'Long Nine', price: 560, dmg: 12, range: 9, reload: 3.0, arc: 'side', blurb: 'A long iron nine-pounder. Reaches out, hits steady.' },
    carronade:    { name: 'Carronade', price: 680, dmg: 24, range: 5, reload: 4.0, arc: 'side', blurb: 'A short, fat smasher. Get close and it breaks ships.' },
    chaser:       { name: 'Bow Chaser', price: 760, dmg: 10, range: 10, reload: 2.6, arc: 'bow', blurb: 'A long gun in the bows that fires dead ahead: for the chase.' },
    moon_harpoon: { name: 'Moonglass Harpoon', price: 980, dmg: 18, range: 8, reload: 3.2, arc: 'side', holy: true,
                    blurb: 'The Ferryman\'s ballista, its bolts tipped with moonglass. The drowned things of the Midnight Sea fear it.' }
  };
  var FITS = {
    sheathing:    { name: 'Copper Sheathing', price: 600, vmax: 1.05, blurb: 'A clean copper bottom: five in a hundred quicker, every point of sail.' },
    oak:          { name: 'Oak Doubling', price: 520, hull: 1.3, blurb: 'A second skin of oak over her frames. Takes a third more punishment.' },
    crystal_sails:{ name: 'Crystal-weave Sails', price: 940, vmax: 1.08, nogo: -0.06, blurb: 'Rose Cove spore-silk with crystal woven through. Quicker, and she points higher.' },
    roseite:      { name: 'Roseite Sheathing', price: 820, rocks: 0.5, blurb: 'Roseite grown over her bilges. Rocks and reefs do half the harm.' },
    storm_rig:    { name: 'Storm Rigging', price: 720, storm: 0.55, turn: 1.04, blurb: 'Crimson rigging: doubled shrouds, storm sails. Squalls do half the harm.' },
    moon_lantern: { name: 'Moon Lantern', price: 1250, ward: true, blurb: 'A lantern of moonglass at the masthead. The Midnight Sea\'s things keep off its light, and rocks show through the mist.' }
  };
  var ROLES = {
    deckhand:  { name: 'Deckhand', fee: 60, blurb: 'Hauls, reefs and coils. Counts toward the hands a ship needs.' },
    gunner:    { name: 'Gunner', fee: 160, blurb: 'Mans a gun: it fires twice as fast.' },
    navigator: { name: 'Navigator', fee: 220, blurb: 'Reads the wind and the spore currents: she sails quicker.' },
    rigger:    { name: 'Rigger', fee: 180, blurb: 'Sharp sail handling: she turns quicker, and storms do less harm.' },
    fighter:   { name: 'Fighter', fee: 200, blurb: 'Repels boarders, and leads a boarding party.' },
    purser:    { name: 'Purser', fee: 240, blurb: 'Haggles: cargo costs less and fetches more.' }
  };
  // who signs on where: each sea's people, and the roles its harbour has to offer
  var SEAS = {
    'lumar':          { sea: 'Emerald', roles: ['deckhand', 'deckhand', 'navigator', 'gunner'],
                        names: ['Tam Brisk', 'Wenna Holt', 'Jory Pell', 'Kit Lowen', 'Ned Fairlie', 'Bel Ashcombe', 'Hal Crewe', 'Sal Penrose'] },
    'lumar-sapphire': { sea: 'Sapphire', roles: ['deckhand', 'gunner', 'purser', 'navigator'],
                        names: ['Aurel Vane', 'Lise Marrow', 'Quill Danby', 'Corin Hale', 'Ottilie Rees', 'Barnaby Sloe', 'Fen Abbott'] },
    'lumar-rose':     { sea: 'Rose', roles: ['navigator', 'rigger', 'deckhand'],
                        names: ['Amaris Quell', 'Tobin Rush', 'Ysa Morrow', 'Petra Lind', 'Rook Thistle', 'Wren Calder'] },
    'lumar-crimson':  { sea: 'Crimson', roles: ['fighter', 'gunner', 'rigger', 'fighter'],
                        names: ['Red Annis', 'Cutter Mabe', 'Scald Joss', 'Bonny Tarrant', 'Old Hask', 'Vell Black', 'Sparrow Kett'] },
    'lumar-crown':    { sea: 'Emerald', roles: ['deckhand', 'gunner', 'navigator', 'rigger', 'fighter', 'purser'],
                        names: ['Edwin Marsh', 'Cass Fairweather', 'Tobias Lane', 'Juniper Holloway', 'Rafe Calloway', 'Ada Pembury', 'Moss Garrick', 'Lettice Vane'] },
    'lumar-tern':     { sea: 'Emerald', roles: ['deckhand', 'deckhand', 'rigger', 'navigator'],
                        names: ['Davy Pell', 'Meg Tull', 'Hob Tull', 'Nan Corran', 'Little Kit'] },
    'lumar-midnight': { sea: 'Midnight', roles: ['fighter', 'gunner'],
                        names: ['Silent Odo', 'the Drowned Bosun', 'Pale Merrit', 'Grey Ilse', 'Hollow Tom'] }
  };

  var st = null;
  function fresh() { return { ships: [{ id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] }], sailing: 'gull', n: 1, crew: [], cn: 0, hired: {} }; }
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
  if (!st || !st.ships || !st.ships.length) st = fresh();
  st.crew = st.crew || []; st.hired = st.hired || {}; st.cn = st.cn || 0;
  st.ships.forEach(function (s) { s.guns = s.guns || []; s.fits = s.fits || []; s.hold = s.hold || {}; if (s.hull == null) s.hull = 1; });
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  function spec(type) { return SHIPS[type] || SHIPS.sloop; }
  function get(id) { return st.ships.filter(function (s) { return s.id === id; })[0] || null; }
  function all() { return st.ships.slice(); }
  function crewOn(id) { return st.crew.filter(function (c) { return c.ship === id; }); }
  function berths(ship) { var c = spec(ship.type).crew; return c ? c + 2 : 1; }
  /** Her spec as she is: fittings fitted, the crew aboard, guns mounted. */
  function effective(ship) {
    var sp = Object.assign({}, spec(ship.type)), cr = crewOn(ship.id);
    sp.base = spec(ship.type);
    ship.fits.forEach(function (f) {
      var F = FITS[f];
      if (!F) return;
      if (F.vmax) sp.vmax *= F.vmax;
      if (F.nogo) sp.nogo += F.nogo;
      if (F.hull) sp.hull = Math.round(sp.hull * F.hull);
      if (F.rocks) sp.rocks *= F.rocks;
      if (F.storm) sp.storm *= F.storm;
      if (F.turn) sp.turn *= F.turn;
      if (F.ward) sp.ward = true;
    });
    var best = function (role) { return cr.filter(function (c) { return c.role === role; }).reduce(function (m, c) { return Math.max(m, c.skill); }, 0); };
    var nav = best('navigator'), rig = best('rigger');
    if (nav) sp.vmax *= 1 + 0.03 * nav;
    if (rig) { sp.turn *= 1 + 0.05 * rig; sp.storm *= 1 - 0.1 * rig; }
    sp.hands = cr.length;
    sp.short = Math.max(0, spec(ship.type).crew - cr.length);
    sp.gunners = cr.filter(function (c) { return c.role === 'gunner'; }).length;
    sp.fighters = cr.reduce(function (n, c) { return n + (c.role === 'fighter' ? 1 + c.skill * 0.5 : 0.4); }, 1);   // you count too
    sp.guns = ship.guns.filter(function (g) { return GUNS[g]; }).map(function (g, i) {
      return Object.assign({ id: g, manned: i < sp.gunners }, GUNS[g]);
    });
    sp.berths = berths(ship);
    return sp;
  }
  /** The ship you're sailing now (the sloop if she's been sold or lost), as she sails. */
  function active() {
    var s = get(st.sailing) || st.ships[0];
    return { ship: s, spec: effective(s) };
  }
  /** Ships lying at this island: the sloop always (she follows you), every other where you left her. */
  function here(worldId) {
    var isle = islandOf(worldId);
    return st.ships.filter(function (s) { return s.type === 'sloop' || s.at === isle; });
  }
  function islandOf(worldId) {
    var I = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles;
    if (!I || !worldId) return worldId;
    if (I[worldId]) return worldId;
    if (worldId === 'lumar-home') return 'lumar-sapphire';                 // the White House is on Sapphire's square
    var best = null;                                                        // a room on an island: the longest match wins
    for (var id in I) if (worldId.indexOf(id + '-') === 0 && (!best || id.length > best.length)) best = id;
    return best || worldId;
  }
  function sail(id) { if (get(id)) { st.sailing = id; store(); } }
  /** She's tied up at this island now (you sailed her here). */
  function moored(id, worldId) { var s = get(id); if (s && s.type !== 'sloop') { s.at = islandOf(worldId); store(); } }
  function rename(id, name) { var s = get(id); if (s && name) { s.name = String(name).slice(0, 24); store(); } }

  function pay(n, why) {
    return typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(n, why) : Promise.resolve({ ok: false, reason: 'offline' });
  }
  /** Buy a ship of this type; she's delivered to this island's pier. Resolves {ok, ship, reason}. */
  function buy(type, worldId) {
    var sp = SHIPS[type];
    if (!sp || !sp.price) return Promise.resolve({ ok: false, reason: 'not_for_sale' });
    return pay(sp.price, 'ship:' + type).then(function (r) {
      if (!r || !r.ok) return { ok: false, reason: (r && r.reason) || 'coins' };
      var names = NAMES[type] || ['Venture'], taken = st.ships.map(function (s) { return s.name; });
      var name = names.filter(function (n) { return taken.indexOf(n) < 0; })[0] || sp.name + ' ' + (st.n + 1);
      var s = { id: type + (++st.n), type: type, name: name, at: islandOf(worldId), hull: 1, hold: {}, guns: [], fits: [], bought: Date.now() };
      st.ships.push(s);
      store();
      return { ok: true, ship: s };
    });
  }
  /** What a yard gives for her: half her price, less for a battered hull. */
  function value(s) { return Math.round(spec(s.type).price * 0.5 * (0.5 + 0.5 * s.hull)); }
  /** Sell a ship back to a yard (her hold must be empty; her crew move to the sloop's... or ashore). */
  function sellShip(id) {
    var s = get(id);
    if (!s || s.type === 'sloop') return Promise.resolve({ ok: false, reason: 'no' });
    if (Object.keys(s.hold).length) return Promise.resolve({ ok: false, reason: 'cargo' });
    var v = value(s);
    st.ships = st.ships.filter(function (x) { return x !== s; });
    st.crew = st.crew.filter(function (c) { return c.ship !== id; });     // paid off at the quay
    if (st.sailing === id) st.sailing = st.ships[0].id;
    store();
    var ok = typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins ? BridgeProgression.awardCoins(v, 'ship_sold:' + s.type) : Promise.resolve(null);
    return ok.then(function (b) { return { ok: true, value: v, paid: b != null }; });
  }

  // ---- guns and fittings --------------------------------------------------------------------------------------------
  function fit(shipId, what) {
    var s = get(shipId), G = GUNS[what], F = FITS[what];
    if (!s || (!G && !F)) return Promise.resolve({ ok: false, reason: 'no' });
    if (G && s.guns.length >= spec(s.type).slots) return Promise.resolve({ ok: false, reason: 'slots' });
    if (F && s.fits.indexOf(what) >= 0) return Promise.resolve({ ok: false, reason: 'fitted' });
    return pay((G || F).price, 'fit:' + what).then(function (r) {
      if (!r || !r.ok) return { ok: false, reason: (r && r.reason) || 'coins' };
      (G ? s.guns : s.fits).push(what);
      store();
      return { ok: true };
    });
  }
  function unmount(shipId, idx) { var s = get(shipId); if (s && s.guns[idx]) { s.guns.splice(idx, 1); store(); } }

  // ---- the hull: damage at sea, repairs in port ---------------------------------------------------------------------
  /** Take `pts` of damage (in hull points). Returns what's left of her (0..1). */
  function damage(shipId, pts) {
    var s = get(shipId);
    if (!s) return 1;
    s.hull = Math.max(0, s.hull - pts / effective(s).hull);
    store();
    return s.hull;
  }
  function repairCost(s) { return s.hull >= 0.999 ? 0 : Math.max(20, Math.round((1 - s.hull) * (spec(s.type).price || 160) * 0.22)); }
  function repair(shipId) {
    var s = get(shipId), c = s && repairCost(s);
    if (!c) return Promise.resolve({ ok: false, reason: 'sound' });
    return pay(c, 'repair:' + s.type).then(function (r) {
      if (!r || !r.ok) return { ok: false, reason: (r && r.reason) || 'coins' };
      s.hull = 1; store();
      return { ok: true, cost: c };
    });
  }
  /** Wrecked: she's towed in to `worldId` by the salvors, her hold lost. */
  function wreck(shipId, worldId) {
    var s = get(shipId);
    if (!s) return;
    s.hold = {}; s.hull = 0.15;
    if (s.type !== 'sloop') s.at = islandOf(worldId);
    store();
  }

  // ---- crew ---------------------------------------------------------------------------------------------------------
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
  function today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
  /** Who's looking for a berth at this port today: three, from its own sea. */
  function recruits(worldId) {
    var P = islandOf(worldId), S = SEAS[P];
    if (!S) return [];
    var d = today(), out = [];
    for (var i = 0; i < 3; i++) {
      var k = d + ':' + P + ':' + i, role = S.roles[Math.floor(hash(k + 'r') * S.roles.length)];
      var nm = S.names[Math.floor(hash(k + 'n') * S.names.length)];
      while (out.some(function (o) { return o.name === nm; })) nm = S.names[(S.names.indexOf(nm) + 1) % S.names.length];
      var skill = 1 + Math.floor(hash(k + 's') * 2.6);
      out.push({ key: k, name: nm, role: role, skill: skill, sea: S.sea, fee: Math.round(ROLES[role].fee * (0.6 + 0.4 * skill)), signed: !!st.hired[k] });
    }
    return out;
  }
  /** Sign someone on: they go aboard `shipId` (or the biggest of yours here with a berth). Resolves {ok, reason, ship}. */
  function hire(rec, worldId, shipId) {
    if (st.hired[rec.key]) return Promise.resolve({ ok: false, reason: 'signed' });
    var ships = shipId ? [get(shipId)] : here(worldId).slice().sort(function (a, b) { return spec(b.type).crew - spec(a.type).crew; });
    var to = ships.filter(function (s) { return s && crewOn(s.id).length < berths(s); })[0];
    if (!to) return Promise.resolve({ ok: false, reason: 'berths' });
    return pay(rec.fee, 'crew:' + rec.role).then(function (r) {
      if (!r || !r.ok) return { ok: false, reason: (r && r.reason) || 'coins' };
      st.hired[rec.key] = 1;
      st.crew.push({ id: 'c' + (++st.cn), name: rec.name, role: rec.role, skill: rec.skill, sea: rec.sea, ship: to.id });
      store();
      return { ok: true, ship: to };
    });
  }
  function assign(crewId, shipId) {
    var c = st.crew.filter(function (x) { return x.id === crewId; })[0], s = get(shipId);
    if (!c || !s || crewOn(shipId).length >= berths(s)) return false;
    c.ship = shipId; store(); return true;
  }
  function dismiss(crewId) { st.crew = st.crew.filter(function (c) { return c.id !== crewId; }); store(); }
  function crew() { return st.crew.slice(); }
  /** Has the ship you're sailing someone in this role aboard? */
  function crewHas(role) { var a = active().ship; return crewOn(a.id).some(function (c) { return c.role === role; }); }

  // ---- the ledger line for a ship ---------------------------------------------------------------------------------
  function where(s) {
    if (s.type === 'sloop') return 'at whichever pier you are';
    var I = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles;
    return 'at ' + (I && I[s.at] ? I[s.at].name : s.at || 'sea');
  }
  function line(s) {
    var sp = spec(s.type), crates = typeof BridgeTrade !== 'undefined' ? BridgeTrade.crates(s) : 0;
    return sp.name + ' · hull ' + Math.round(s.hull * 100) + '% · hold ' + crates + '/' + effective(s).hold + ' · ' +
      (sp.slots ? s.guns.length + '/' + sp.slots + ' guns' : 'no guns') + (sp.crew ? ' · ' + crewOn(s.id).length + '/' + sp.crew + ' hands' : '');
  }

  return { SHIPS: SHIPS, GUNS: GUNS, FITS: FITS, ROLES: ROLES, SEAS: SEAS,
           spec: spec, get: get, all: all, active: active, effective: effective, here: here, islandOf: islandOf, sail: sail, moored: moored,
           line: line, where: where, rename: rename, buy: buy, value: value, sellShip: sellShip, fit: fit, unmount: unmount,
           damage: damage, repairCost: repairCost, repair: repair, wreck: wreck,
           recruits: recruits, hire: hire, assign: assign, dismiss: dismiss, crew: crew, crewOn: crewOn, crewHas: crewHas, berths: berths,
           save: store, _state: function () { return st; } };
})();
