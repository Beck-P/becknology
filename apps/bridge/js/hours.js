/**
 * BridgeHours — when the shops are open, by each planet's own clock (js/clock.js).
 *
 * Beck: "shops and some things are only open at certain times… make it feel a little bit more real." Every shop says
 * its hours, a closed one says when it opens, and something in each place is always open. Hours hang off the sky, so
 * they move with the seasons the way real ones do:
 *
 *   midnight · dawn (a little before sunrise) · sunrise · morning · noon · afternoon · sunset · evening · late
 *
 * The working day is "civil": however short a winter's day, shops keep at least the middle 40% of it (Hoarfell's polar
 * night would otherwise close the ski hire for good), and under the midnight sun they still close at "night".
 *
 * HOURS[worldId][label] = [from, to] (anchor names, or fractions of the day; `to` before `from` runs past midnight).
 * executeInteraction (js/interactions.js) asks `gate(inter)` first: a closed counter says so instead of opening.
 * API: open(worldId, label) → bool, hours(worldId, label) → { from, to, text } (its planet's clock), gate(inter).
 */
var BridgeHours = (function () {
  var HOURS = {
    // Lumar (8-hour days)
    'lumar-bakery':     { BAKERY: ['dawn', 'afternoon'] },
    'lumar-smithy':     { SMITHY: ['sunrise', 'sunset'] },
    'lumar-apothecary': { APOTHECARY: ['morning', 'evening'] },
    'lumar-square':     { FISHMONGER: ['dawn', 'afternoon'] },
    'lumar-tavern':     { TAVERN: ['noon', 'small'] },
    'lumar-crown-pub':  { BAR: ['noon', 'small'] },
    'lumar-tern-inn':   { COUNTER: ['morning', 'late'] },
    // Verdance (6-hour days)
    'verdance-village': { 'THE CRUSTY LOAF': ['dawn', 'afternoon'], 'THE HAYLOFT': ['noon', 'small'], "PENNYWORTH'S": ['sunrise', 'sunset'],
                          'FLOWER STALL': ['morning', 'afternoon'], 'ANVIL & HOOF': ['sunrise', 'sunset'] },
    'verdance':         { 'SEED STALL': ['dawn', 'sunset'] },
    // Hoarfell (12-hour days): the lodge never shuts
    'hoarfell-skihire': { COUNTER: ['sunrise', 'evening'] },
    'hoarfell':         { "GUIDE'S HUT": ['dawn', 'sunset'], 'COCOA HUT': ['morning', 'late'] }
  };
  var NAMES = { BAKERY: 'The bakery', SMITHY: 'The smithy', APOTHECARY: 'The apothecary', FISHMONGER: 'The fish stall',
                TAVERN: 'The tavern', BAR: 'The bar', COUNTER: 'The counter', 'SEED STALL': "Hollin's stall",
                "GUIDE'S HUT": "The guide's hut", 'COCOA HUT': "Tove's hut" };

  function C() { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; }
  function planetOf(worldId) { return C() ? C().planet(worldId) : null; }

  /** The anchors of a planet's day now, in hours into it. */
  function anchors(planet) {
    var Cl = C(), len = Cl.dayLen(planet) / 3600000, D = Cl.daylight(planet);
    var rise = (0.5 - D / 2) * len, set = (0.5 + D / 2) * len;
    rise = Math.min(rise, 0.3 * len); set = Math.max(set, 0.7 * len);            // a civil day: never under 40%
    if (D >= 0.98) { rise = 0.25 * len; set = 0.75 * len; }                      // the midnight sun: people still sleep
    var tw = len / 24;
    return { len: len, midnight: 0, small: len * 0.06, dawn: rise - tw, sunrise: rise, morning: rise + (len / 2 - rise) / 2,
             noon: len / 2, afternoon: len / 2 + (set - len / 2) / 2, sunset: set, evening: set + tw * 1.5,
             late: set + (len - set) / 2 };
  }
  function at(planet, a) { var A = anchors(planet); return typeof a === 'number' ? a * A.len : A[a]; }

  function entry(worldId, label) { var w = HOURS[worldId]; return w && w[label] || null; }
  /** { from, to (hours into the day), text ('1:30–5:10'), open (now) } — or null if it keeps no hours. */
  function hours(worldId, label) {
    var e = entry(worldId, label), planet = planetOf(worldId);
    if (!e || !planet || !C() || !C().dayLen(planet)) return null;
    var from = at(planet, e[0]), to = at(planet, e[1]), now = C().time(planet).hours;
    var open = from <= to ? (now >= from && now < to) : (now >= from || now < to);
    return { from: from, to: to, now: now, open: open, planet: planet,
             text: C().fmtHours(from) + '–' + C().fmtHours(to), len: anchors(planet).len };
  }
  function isOpen(worldId, label) { var h = hours(worldId, label); return !h || h.open; }

  function wait(h) {                                        // real minutes until it opens
    var d = h.from - h.now;
    if (d < 0) d += h.len;
    return Math.round(d * 60);
  }
  function inWords(min) {
    if (min < 2) return 'any moment now';
    if (min < 60) return 'in about ' + min + ' minutes';
    var h = Math.round(min / 60 * 2) / 2;
    return 'in about ' + (h === 1 ? 'an hour' : h + ' hours');
  }
  /** A closed counter says so (and when it opens) instead of opening: true when it stopped it. */
  function gate(inter) {
    if (!inter || typeof BridgeWorld === 'undefined') return false;
    var id = BridgeWorld.getWorldId(), h = hours(id, inter.label);
    if (!h || h.open) return false;
    var name = NAMES[inter.label] || (inter.label.charAt(0) + inter.label.slice(1).toLowerCase());
    var P = C().PLANETS[h.planet];
    var text = name + "'s shut. The sign on the door says " + h.text + ' (' + P.name + ' time) — it opens ' + inWords(wait(h)) + '.';
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.say) BridgeInteractions.say('CLOSED', text);
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('click');
    return true;
  }
  /** Every place that keeps hours, for the ledger and tests. */
  function all() {
    var out = [];
    Object.keys(HOURS).forEach(function (w) { Object.keys(HOURS[w]).forEach(function (l) { out.push({ world: w, label: l, hours: hours(w, l) }); }); });
    return out;
  }

  // ---- the sky by the place's name, and Lumar's bells ------------------------------------------------------------------
  // A small sun or moon beside the place's name (the time itself needs a timepiece); on Lumar's open ground you hear
  // the hours rung from the chapels (every Lumar hour — a real hour of its eight-hour day).
  // little drawn icons (the game's pixel font has no sun or moon): a sun with rays, a sun half down, a crescent
  var SUN = '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="3.4" fill="#ffd870"/><g stroke="#ffd870" stroke-width="1.6" stroke-linecap="round"><path d="M8 1.2v1.8M8 13v1.8M1.2 8h1.8M13 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M3.2 12.8l1.3-1.3M11.5 4.5l1.3-1.3"/></g></svg>';
  var LOW = '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 11a5 5 0 0 1 10 0z" fill="#ff9a6a"/><path d="M1 12.6h14" stroke="#ff9a6a" stroke-width="1.6" stroke-linecap="round"/><path d="M8 2.6v2M3.4 4.6l1.3 1.3M12.6 4.6l-1.3 1.3" stroke="#ff9a6a" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var MOON = '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M10.6 2.2a6 6 0 1 0 3.2 9.6A5 5 0 0 1 10.6 2.2z" fill="#c8d2ff"/></svg>';
  var GLYPH = { morning: SUN, midday: SUN, afternoon: SUN, dawn: LOW, dusk: LOW, night: MOON, 'midnight sun': LOW };
  var PART = { morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', dawn: 'Dawn', dusk: 'Dusk', night: 'Night', 'midnight sun': 'The midnight sun' };
  function etClock() { var p = C().etParts(); return (p.h % 12 || 12) + ':' + (p.m < 10 ? '0' : '') + p.m + (p.h < 12 ? 'am' : 'pm'); }
  var lastHour = null, lastWorld = null;
  function tick() {
    if (!C() || typeof BridgeWorld === 'undefined' || !BridgeWorld.getWorldId) return;
    var id = BridgeWorld.getWorldId();
    var badge = document.getElementById('world-location-badge');
    if (badge && id) {
      var k = C().sky(id), sp = badge.querySelector('.world-sky');
      if (!sp) { sp = document.createElement('span'); sp.className = 'world-sky'; badge.appendChild(sp); }
      var show = k.cycles || k.part === 'night';
      sp.style.display = show ? '' : 'none';
      // with a timepiece that keeps this planet's clock (js/gear.js), the time itself — Arcadia's is Eastern time
      var G = typeof BridgeGear !== 'undefined' && BridgeGear.keepsTime ? BridgeGear : null;
      var tell = G && k.planet && G.keepsTime(k.planet) ? (k.time ? k.time.text : C().fmtHours ? etClock() : '') : '';
      if (show) {
        var key = k.part + '|' + tell;
        if (sp.getAttribute('data-p') !== key) { sp.innerHTML = (GLYPH[k.part] || '') + (tell ? '<span class="sky-time">' + tell + '</span>' : ''); sp.setAttribute('data-p', key); }
        sp.title = (PART[k.part] || '') + (k.season ? ' · ' + k.season.name : '');
        sp.className = 'world-sky sky-' + k.part.replace(' ', '-');
      }
    }
    var lumar = /^lumar/.test(id || '') && C().outdoor(id);
    var T = C().time('lumar'), h = T ? T.h : null;
    if (lumar && lastWorld === id && lastHour != null && h !== lastHour && typeof BridgeAudio !== 'undefined') {
      var n = h === 0 ? 8 : h, i = 0;
      (function ring() { BridgeAudio.sfx('bell'); if (++i < Math.min(n, 8)) setTimeout(ring, 1300); })();
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('The bells', 'They ring ' + ['eight', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][h], 'across the water — Lumar ' + h + ':00', false);
    }
    lastHour = h; lastWorld = id;
  }
  setInterval(tick, 4000);

  // the weather beside it (js/weather.js): now, and what's next
  function wx(r) {
    if (typeof BridgeWeather === 'undefined' || !BridgeWeather.forecast) return '';
    var f = BridgeWeather.forecast(r, 2);
    return f.length ? '  ·  ' + f[0].name.toUpperCase() + ', THEN ' + f[1].name.toUpperCase() + ' FROM ' + BridgeWeather.etHour(f[1].from).toUpperCase() : '';
  }
  /** Every planet's time, season and weather, as the ship's chronometer reads it (the wireless on the bridge). */
  function chronometer() {
    if (!C()) return '';
    var rows = ['sylvara', 'hoarfell', 'lumar', 'verdance'].map(function (p) {
      var k = C().sky(p), P = C().PLANETS[p];
      return P.name.toUpperCase() + '  ' + k.time.text + ' OF ' + P.day + ':00  ·  ' + (PART[k.part] || k.part).toUpperCase() + '  ·  ' + (k.season ? k.season.name.toUpperCase() : '') + wx(p);
    });
    rows.push('ARCADIA  ·  NIGHT, AS EVER  ·  ' + (C().bustle() > 0.9 ? 'THE STREETS ARE FULL' : C().bustle() > 0.5 ? 'BUSY' : 'QUIET') + wx('arcadia'));
    rows.push('ENIGMA, THE SINGULARITY  ·  NO SUN TO KEEP');
    return "THE SHIP'S CHRONOMETER KEEPS EVERY WORLD'S TIME AND WEATHER (EASTERN TIME):\n\n" + rows.join('\n');
  }

  return { HOURS: HOURS, hours: hours, open: isOpen, gate: gate, all: all, anchors: anchors, chronometer: chronometer, _tick: tick };
})();
