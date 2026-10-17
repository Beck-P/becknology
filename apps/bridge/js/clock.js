/**
 * BridgeClock — the time on every planet: its day, its season, its sun and moon.
 *
 * Beck: "each place should have its own clock and timing cycle… tied to real hours of the day." One clock for every
 * pilot, pinned to US Eastern time (America/New_York, daylight saving included), so two pilots always see the same sky.
 * Each planet's day is a whole number of real hours that divides the real day, so its days start at the same real
 * times every day (Lumar's at midnight, 8am and 4pm ET). A planet's clock reads hours and minutes into *its* day
 * (Lumar runs 0:00 to 8:00), not a 24-hour face.
 *
 *   PLANETS[id] = { day: hours, year: [[season, weeks], …] | 'moon', offset: weeks, amp / polar / elf: daylight }
 *
 * Seasons follow the real calendar, turning on Mondays (ET): Verdance a week each (as js/seasons.js always has),
 * Lumar two weeks each, Hoarfell three weeks of winter and a week of each of the others, Sylvara the real moon (its
 * full moon is the real full moon; the week round the real new moon is the Dimming).
 *
 * Daylight: the share of the day the sun is up moves smoothly through the year — Lumar and Verdance 65% at midsummer,
 * 50% at the equinoxes, 35% at midwinter; Hoarfell's midnight sun (it never sets) and polar night (~12%); Sylvara a
 * steady 55%, but in the Dimming dusk and dawn spread over most of the day.
 *
 * The sun is an elevation e = cos(2π(t/len − ½)) − cos(π·D) for daylight share D (e > 0 while it's up), and
 *   sun  = smoothstep(−w, w, e)        0 at night … 1 by day (a midnight sun bottoms out near ½: a golden glow)
 *   dusk = exp(−(e / w)²)              the warm light of sunrise and sunset, strongest as the sun crosses the horizon
 * where w (π/12) makes dawn and dusk each about a twelfth of the day; the Dimming widens it.
 *
 * API: sky(worldId) → { planet, cycles, t, len, sun, dusk, moon, phase, season, daylight, sunrise, sunset, part }
 *      planet(worldId), time(planet) → { t, len, h, m, text }, season(planet), moon(), etNow(), etParts(),
 *      fmtHours(h) ('5:20'), until(planet, hour) (ms till that hour of its day), outdoor(worldId).
 * Testing / previews: ?at=2026-10-16T21:30 (an ET wall time) and ?timewarp=60 (the clock runs 60× from there),
 * or BridgeClock._at(msOrString, warp).
 */
var BridgeClock = (function () {
  var HOUR = 3600000, DAY = 24 * HOUR, WEEK = 7 * DAY;
  var SYNODIC = 29.530588853 * DAY, NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);   // a known new moon
  var SEASONS = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

  var PLANETS = {
    sylvara:  { name: 'Sylvara', day: 24, year: 'moon', elf: true },
    hoarfell: { name: 'Hoarfell', day: 12, year: [['spring', 1], ['summer', 1], ['autumn', 1], ['winter', 3]], offset: 3, polar: true },
    lumar:    { name: 'Lumar', day: 8, year: [['spring', 2], ['summer', 2], ['autumn', 2], ['winter', 2]], offset: 1, amp: 0.15 },
    verdance: { name: 'Verdance', day: 6, year: [['spring', 1], ['summer', 1], ['autumn', 1], ['winter', 1]], offset: 3, amp: 0.15 },
    arcadia:  { name: 'Arcadia', night: true },                 // always night; busiest 8pm–1am ET
    enigma:   { name: 'Enigma Station', none: true },
    singularity: { name: 'The Singularity', none: true },
    ship:     { name: 'The ship', none: true }
  };
  // where you are → whose sky
  var RX = [
    [/^lumar/, 'lumar'], [/^verdance/, 'verdance'], [/^hoarfell/, 'hoarfell'], [/^sylvara/, 'sylvara'],
    [/^(arcadia|cyber-noodle-bar|chrome-clinic|junk-pawn-shop|tech-repair-shop|null-den)/, 'arcadia'],
    [/^enigma/, 'enigma'], [/^singularity/, 'singularity'], [/^(bridge|quarters|hangar|gameroom|office)$/, 'ship']
  ];
  // under the open sky (the rest are indoors: their windows follow the time, their light doesn't)
  var OUTDOOR = ['lumar', 'lumar-crimson', 'lumar-rose', 'lumar-sapphire', 'lumar-midnight', 'lumar-crown', 'lumar-holm',
    'lumar-tern', 'lumar-square', 'verdance', 'verdance-village', 'hoarfell', 'hoarfell-face', 'hoarfell-icestep',
    'hoarfell-park', 'hoarfell-piste', 'hoarfell-ridge', 'hoarfell-summit', 'sylvara',
    'arcadia-street', 'arcadia-skypad', 'arcadia-alley', 'arcadia-skywalk',          // (Arcadia: always night, but it rains)
    'lumar-cliff', 'lumar-sapphire-market', 'lumar-rose-springs'];                  // (the Sapphire and Rose seas' places)
  var EVER_NIGHT = /^lumar-midnight/;                         // the Midnight Isle never sees the sun

  // ---- now, in Eastern time --------------------------------------------------------------------------------------------
  var fixedAt = null, warp = 1, warpFrom = 0;
  function realNow() {
    if (fixedAt == null) return Date.now();
    return fixedAt + (Date.now() - warpFrom) * warp;
  }
  var fmtET = null, offCache = { at: -1, off: 0 };
  function etOffset(ms) {                                     // ET wall clock minus UTC, ms (cached a minute at a time)
    var key = Math.floor(ms / 60000);
    if (offCache.at === key) return offCache.off;
    var off = -5 * HOUR;
    try {
      fmtET = fmtET || new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
      var p = {};
      fmtET.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
      off = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
    } catch (e) { /* an old browser: EST */ }
    offCache = { at: key, off: off };
    return off;
  }
  /** ET wall-clock time as if it were UTC (so its date maths is plain): ms. */
  function etNow() { var u = realNow(); return u + etOffset(u); }
  function etParts() {
    var d = new Date(etNow());
    return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), m: d.getUTCMinutes(), dow: (d.getUTCDay() + 6) % 7 };
  }
  function setAt(at, w) {
    var ms = typeof at === 'number' ? at : NaN;
    if (typeof at === 'string') {                             // an ET wall time: find the UTC instant that shows it
      var guess = Date.parse(at.replace(' ', 'T') + (at.length <= 10 ? 'T00:00' : '') + 'Z');
      if (!isNaN(guess)) ms = guess - etOffset(guess);
    }
    if (isNaN(ms)) { fixedAt = null; warp = 1; return; }
    fixedAt = ms; warp = w || 1; warpFrom = Date.now();
  }

  // ---- whose sky ---------------------------------------------------------------------------------------------------
  function planetOf(worldId) {
    var id = String(worldId || '');
    for (var i = 0; i < RX.length; i++) if (RX[i][0].test(id)) return RX[i][1];
    return null;
  }
  function outdoor(worldId) { return OUTDOOR.indexOf(worldId) >= 0; }

  // ---- the calendar --------------------------------------------------------------------------------------------------
  function moon(at) {                                          // phase 0 new … ½ full … 1 new; light 0 … 1 at full
    var u = at != null ? at : realNow();
    var ph = (((u - NEW_MOON) / SYNODIC) % 1 + 1) % 1;
    return { phase: ph, light: (1 - Math.cos(2 * Math.PI * ph)) / 2, full: Math.abs(ph - 0.5) < 1.75 / 29.53,
             dimming: ph < 3.5 / 29.53 || ph > 1 - 3.5 / 29.53 };
  }
  /** The planet's season: { id, name, frac (through it, 0..1), year (through the year, 0..1), daysLeft }. */
  function season(planet) {
    var P = PLANETS[planet];
    if (!P || !P.year) return null;
    var et = etNow();
    if (P.year === 'moon') {
      var M = moon();
      var dim = M.dimming;
      return { id: dim ? 'dimming' : M.full ? 'fullmoon' : M.phase < 0.5 ? 'waxing' : 'waning',
               name: dim ? 'The Dimming' : M.full ? 'Full Moon' : M.phase < 0.5 ? 'Waxing Moon' : 'Waning Moon',
               frac: M.phase, year: M.phase, moon: M };
    }
    var days = et / DAY, weekF = (days + 3) / 7;               // weeks since a Monday (1 Jan 1970 was a Thursday)
    var len = P.year.reduce(function (a, s) { return a + s[1]; }, 0);
    var pos = (((weekF + (P.offset || 0)) % len) + len) % len;  // weeks into this planet's year
    var at = 0;
    for (var i = 0; i < P.year.length; i++) {
      var s = P.year[i];
      if (pos < at + s[1] || i === P.year.length - 1) {
        var into = (pos - at) / s[1];
        return { id: s[0], name: SEASONS[s[0]], frac: Math.max(0, Math.min(1, into)), year: pos / len, weeks: s[1],
                 daysLeft: Math.max(0, Math.ceil((1 - into) * s[1] * 7 - 1e-6)) };
      }
      at += s[1];
    }
    return null;
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  /** The share of the day the sun is up (0..1), moving smoothly through the year. */
  function daylight(planet) {
    var P = PLANETS[planet], S = season(planet);
    if (!P || !S) return 0.5;
    if (P.elf) return 0.55;
    if (P.polar) {                                             // spring and autumn swing between the extremes in a week
      if (S.id === 'summer') return 1;
      if (S.id === 'winter') return 0.12;
      var k = smooth(0, 1, S.frac);
      return S.id === 'spring' ? 0.12 + 0.88 * k : 1 - 0.88 * k;
    }
    // a sine through the year, highest in the middle of summer (spring's weeks plus half of summer's, into the year)
    var len = 0, mid = 0;
    P.year.forEach(function (x) { if (x[0] === 'summer') mid = len + x[1] / 2; len += x[1]; });
    return 0.5 + (P.amp || 0.15) * Math.cos(2 * Math.PI * (S.year - mid / len));
  }

  // ---- the day -------------------------------------------------------------------------------------------------------
  function dayLen(planet) { var P = PLANETS[planet]; return P && P.day ? P.day * HOUR : 0; }
  /** Where the planet's day is: { t (ms into it), len, h, m, text ('5:20'), started (ET ms) }. */
  function time(planet) {
    var len = dayLen(planet);
    if (!len) return null;
    var et = etNow(), into = ((et % DAY) + DAY) % DAY;         // ms since ET midnight
    var t = into % len;
    var h = Math.floor(t / HOUR), m = Math.floor((t % HOUR) / 60000);
    return { t: t, len: len, h: h, m: m, text: h + ':' + (m < 10 ? '0' : '') + m, hours: t / HOUR };
  }
  function fmtHours(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return hh + ':' + (mm < 10 ? '0' : '') + mm; }

  /** The sky over a world now. */
  function sky(worldId) {
    var planet = planetOf(worldId), P = PLANETS[planet];
    var out = { planet: planet, cycles: false, sun: 1, dusk: 0, moon: moon().light, season: null, part: 'day', world: worldId };
    if (!P) return out;
    if (P.night) { out.sun = 0; out.part = 'night'; return out; }
    if (P.none) { out.part = 'none'; return out; }
    var T = time(planet), D = daylight(planet), S = season(planet);
    var w = Math.PI / 12;
    if (P.elf && S && S.id === 'dimming') w = Math.PI / 2.6;  // the Dimming: dusk and dawn spread over most of the day
    var x = T.t / T.len;
    var e = Math.cos(2 * Math.PI * (x - 0.5)) - Math.cos(Math.PI * D);
    var sun = smooth(-w, w, e), dusk = Math.exp(-(e / w) * (e / w));
    if (EVER_NIGHT.test(worldId)) { sun = 0; dusk = 0; }
    var half = D / 2;
    out.cycles = true;
    out.t = T.t; out.len = T.len; out.time = T;
    out.sun = sun; out.dusk = dusk; out.season = S; out.daylight = D;
    out.sunrise = D >= 1 ? null : (0.5 - half) * T.len; out.sunset = D >= 1 ? null : (0.5 + half) * T.len;
    out.part = sun > 0.85 ? (x < 0.5 ? (x < 0.5 - half / 2 ? 'morning' : 'midday') : (x > 0.5 + half / 2 ? 'afternoon' : 'midday'))
             : sun < 0.15 ? 'night' : (x < 0.5 ? 'dawn' : 'dusk');
    if (D >= 1 && sun < 0.85) out.part = 'midnight sun';
    return out;
  }
  /** How a picture of a place blends its times of day now: { day, dusk, night } summing to 1 (dusk off without one). */
  function weights(worldId, hasDusk) {
    var k = sky(worldId);
    var wd = hasDusk === false ? 0 : Math.min(0.9, k.dusk * 0.9), ws = Math.max(0, Math.min(1, k.sun * (1 - wd)));
    return { day: ws, dusk: wd, night: Math.max(0, 1 - wd - ws), sky: k };
  }
  /** ms until the planet's clock next reads `hour` (0 ≤ hour < its day length). */
  function until(planet, hour) {
    var T = time(planet);
    if (!T) return 0;
    var at = hour * HOUR, d = at - T.t;
    return d >= 0 ? d : d + T.len;
  }
  /** At a given real moment (ms since 1970), not now: ET wall-clock ms, hours into a planet's day, Arcadia's crowd —
   *  for anything that works out what happened while you were away (js/business.js). */
  function etAt(ms) { return ms + etOffset(ms); }
  function hoursAt(planet, ms) { var len = dayLen(planet); if (!len) return null; var into = ((etAt(ms) % DAY) + DAY) % DAY; return (into % len) / HOUR; }
  function bustleAt(ms) { var d = new Date(etAt(ms)); return bustleH(d.getUTCHours() + d.getUTCMinutes() / 60); }
  /** Arcadia's crowd: 1 at its busiest (8pm–1am ET), easing off through the small hours, quiet by day. */
  function bustle() { var p = etParts(); return bustleH(p.h + p.m / 60); }
  function bustleH(h) {
    if (h >= 20 || h < 1) return 1;
    if (h < 5) return 1 - (h - 1) / 4 * 0.75;
    if (h < 17) return 0.25;
    return 0.25 + (h - 17) / 3 * 0.75;
  }

  // a preview of another time: ?at=<ET wall time>[&timewarp=N]
  (function fromUrl() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('at')) setAt(q.get('at'), +q.get('timewarp') || 1);
      else if (+q.get('timewarp') > 1) setAt(Date.now(), +q.get('timewarp'));
    } catch (e) { /* no URL */ }
  })();

  return {
    PLANETS: PLANETS, now: realNow, sky: sky, weights: weights, etAt: etAt, hoursAt: hoursAt, bustleAt: bustleAt, planet: planetOf, outdoor: outdoor, time: time, season: season, daylight: daylight, moon: moon,
    etNow: etNow, etParts: etParts, now: realNow, fmtHours: fmtHours, until: until, dayLen: dayLen, bustle: bustle,
    _at: setAt
  };
})();
