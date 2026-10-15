/**
 * BridgeFleet — the ships you own on Lumar's seas, and the one you're sailing.
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
 * close to the wind she'll sail, radians), hold (crates), hull (strength), slots (weapon mounts), crew (hands she
 * needs), storm and rocks (× the damage a Crimson storm or a Midnight rock does her). js/sloop.js sails whichever is
 * `active()`.
 *
 * Where they lie: the sloop is always at the pier of whatever island you're on (the starter boat follows you, at no
 * charge); every bigger ship is where you last tied her up (`at`, an island id) and lies further out off the pier's
 * end. Kept in localStorage bridge_fleet.
 *
 *   BridgeFleet.active() → {ship, spec}   .here(worldId) → ships at this island   .sail(id)   .buy(type, worldId)
 *   .moored(id, worldId)   .rename(id, name)   .harbourmaster()   (the panel: your ships, where they are, which to take)
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

  var st = null;
  function fresh() { return { ships: [{ id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, slots: [], crew: [] }], sailing: 'gull', n: 1 }; }
  try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
  if (!st || !st.ships || !st.ships.length) st = fresh();
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }

  function spec(type) { return SHIPS[type] || SHIPS.sloop; }
  function get(id) { return st.ships.filter(function (s) { return s.id === id; })[0] || null; }
  function all() { return st.ships.slice(); }
  /** The ship you're sailing now (the sloop if she's been sold or lost). */
  function active() {
    var s = get(st.sailing) || st.ships[0];
    return { ship: s, spec: spec(s.type) };
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
    for (var id in I) if (worldId.indexOf(id + '-') === 0) return id;
    return worldId;
  }
  function sail(id) { if (get(id)) { st.sailing = id; store(); } }
  /** She's tied up at this island now (you sailed her here). */
  function moored(id, worldId) { var s = get(id); if (s && s.type !== 'sloop') { s.at = islandOf(worldId); store(); } }
  function rename(id, name) { var s = get(id); if (s && name) { s.name = String(name).slice(0, 24); store(); } }

  /** Buy a ship of this type; she's delivered to this island's pier. Resolves {ok, ship, reason}. */
  function buy(type, worldId) {
    var sp = SHIPS[type];
    if (!sp || !sp.price) return Promise.resolve({ ok: false, reason: 'not_for_sale' });
    var pay = typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins
      ? BridgeProgression.wagerCoins(sp.price, 'ship:' + type) : Promise.resolve({ ok: false, reason: 'offline' });
    return pay.then(function (r) {
      if (!r || !r.ok) return { ok: false, reason: (r && r.reason) || 'coins' };
      var names = NAMES[type] || ['Venture'], taken = st.ships.map(function (s) { return s.name; });
      var name = names.filter(function (n) { return taken.indexOf(n) < 0; })[0] || sp.name + ' ' + (st.n + 1);
      var s = { id: type + (++st.n), type: type, name: name, at: islandOf(worldId), hull: 1, hold: {}, slots: [], crew: [], bought: Date.now() };
      st.ships.push(s);
      store();
      return { ok: true, ship: s };
    });
  }

  // ---- the harbourmaster's book: your ships, where each lies, which you'll take out ----------------------------------
  function where(s) {
    if (s.type === 'sloop') return 'at whichever pier you are';
    var I = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles;
    return 'at ' + (I && I[s.at] ? I[s.at].name : s.at || 'sea');
  }
  function line(s) {
    var sp = spec(s.type);
    return sp.name + ' · hull ' + Math.round(s.hull * 100) + '% · hold ' + sp.hold + ' · ' + (sp.slots ? sp.slots + ' gun' + (sp.slots > 1 ? 's' : '') : 'no guns');
  }
  function harbourmaster(worldId) {
    if (typeof BridgeInteractions === 'undefined' || !BridgeInteractions.choose) return;
    var isle = islandOf(worldId);
    BridgeInteractions.choose({
      title: 'The harbourmaster\'s book',
      text: 'EVERY SHIP YOU OWN, AND WHERE SHE LIES. THE ONE MARKED IS THE ONE YOU\'LL TAKE OUT WHEN YOU GO SAILING.',
      rows: st.ships.map(function (s) {
        var hereNow = s.type === 'sloop' || s.at === isle, on = s.id === st.sailing;
        return { label: (on ? '⚓ ' : '') + s.name, sub: line(s) + ' — ' + where(s), note: on ? 'sailing' : hereNow ? 'take her' : 'elsewhere',
                 disabled: on || !hereNow, pick: function () { sail(s.id); harbourmaster(worldId); } };
      }),
      closeLabel: 'Done'
    });
  }

  return { SHIPS: SHIPS, spec: spec, get: get, all: all, active: active, here: here, islandOf: islandOf, sail: sail, moored: moored, line: line,
           rename: rename, buy: buy, harbourmaster: harbourmaster, _state: function () { return st; } };
})();
