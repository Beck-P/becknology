/**
 * BridgeBloom — the spore bloom: a night or two a month the whole of Lumar's sea lights up.
 *
 * Beck agreed it: "a night or two a month the whole sea lights up". The spores that glow faintly in the water every night
 * rise all at once with the dark of the moon: each of the five seas in its own light (the Emerald green, the Sapphire
 * blue, the Rose pink, the Crimson ember-orange, the Midnight pale violet), brightest wherever the water moves.
 *
 * The calendar (the same for every pilot, from the real moon and the date in Eastern time, js/clock.js):
 *   - each ET calendar month has one bloom day: the day the real moon is nearest new in that month, and in about half the
 *     months (a hash of the month) the darker of its neighbours too — so one or two bloom days a month;
 *   - a bloom day's nights are Lumar's nights centred in it (Lumar's day is 8 real hours from ET midnight, so its nights
 *     centre on 0:00, 8:00 and 16:00 ET): three, or six, Lumar nights;
 *   - the strength eases in as the light goes at dusk and out again at dawn (1 − the sun, js/events.js skyAt's sun);
 *     on the Midnight Isle, which never sees the sun, it's on the whole bloom day.
 *
 * API:
 *   on(ms?, worldId?)   0..1, how strong the bloom is (ms defaults to BridgeClock.now(), so ?at= and _at() work)
 *   day(ms?)            true while ms falls in a bloom day's Lumar nights (light or dark)
 *   nights(y, mo)       the month's bloom days, ['2026-10-10', …] (ET dates)
 *   next(ms?)           { tonight, days, date, start } — the bloom on now or the next one (days from today's ET date)
 *   label(ms?)          'The spore bloom: tonight!' / 'The spore bloom is on' / 'Next spore bloom in 9 days'
 *   hue(sea)            the sea's bloom light 'r,g,b'; core(sea) its brightest, near white
 *   _force(k | null)    previews and tests: the bloom at strength k whatever the date (null: back to the calendar)
 *
 * Drawn by js/sea.js (the water everywhere: the islands' water, the open sea, the sloop's and the galleon's seas),
 * js/sloop.js (wakes, surf on rocks, round hulls: `glowAt`), js/chart.js (the seas' ink glowing, the note of the next
 * one); people notice (`arrive`, below: a quiet note, crowds on the quays); fish bite better (js/fishing.js).
 */
var BridgeBloom = (function () {
  var HOUR = 3600000, DAY = 24 * HOUR, NIGHT = 8 * HOUR;
  var HUE = { emerald: '110,255,170', sapphire: '96,176,255', rose: '255,132,192', crimson: '255,146,64', midnight: '196,166,255' };
  var CORE = {};
  Object.keys(HUE).forEach(function (k) {
    CORE[k] = HUE[k].split(',').map(function (v) { return Math.round(+v + (255 - v) * 0.6); }).join(',');
  });
  var forced = null;

  function C() { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; }
  function nowMs() { return C() && C().now ? C().now() : Date.now(); }
  function etAt(ms) { return C() && C().etAt ? C().etAt(ms) : ms - 5 * HOUR; }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function moonDist(ms) {                                        // how far the moon is from new (0 new … 0.5 full)
    var ph = C() && C().moon ? C().moon(ms).phase : 0.5;
    return Math.min(ph, 1 - ph);
  }

  // ---- the calendar ---------------------------------------------------------------------------------------------------
  var months = {};
  /** The month's bloom days as ET day numbers (days since 1970 in ET). */
  function monthDays(y, mo) {
    var key = y * 12 + mo;
    if (months[key]) return months[key];
    var first = Math.round(Date.UTC(y, mo - 1, 1) / DAY), n = Math.round((Date.UTC(y, mo, 1) - Date.UTC(y, mo - 1, 1)) / DAY);
    var dist = [], best = 0;
    for (var d = 0; d < n; d++) {
      dist.push(moonDist((first + d) * DAY + 17 * HOUR));       // ET noon, near enough (UTC = ET + 4 or 5 h)
      if (dist[d] < dist[best]) best = d;
    }
    var out = [first + best];
    if (hash(key * 3.7) < 0.5) {                                 // a second night: the darker neighbour, inside the month
      var a = best - 1, b = best + 1;
      var two = a < 0 ? b : b >= n ? a : dist[a] <= dist[b] ? a : b;
      if (two >= 0 && two < n) out.push(first + two);
      out.sort(function (p, q) { return p - q; });
    }
    return (months[key] = out);
  }
  function isBloomDay(etDay) {
    var d = new Date(etDay * DAY);
    return monthDays(d.getUTCFullYear(), d.getUTCMonth() + 1).indexOf(etDay) >= 0;
  }
  function dayStr(etDay) { var d = new Date(etDay * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function nights(y, mo) { return monthDays(y, mo).map(dayStr); }
  // the Lumar night nearest ms is centred on a multiple of 8 h of ET wall time; it's a bloom night if that centre's ET date
  // is a bloom day
  function centreDay(ms) { var et = etAt(ms); return Math.floor(Math.round(et / NIGHT) * NIGHT / DAY); }
  function day(ms) { return isBloomDay(centreDay(ms == null ? nowMs() : ms)); }

  // Lumar's share of daylight at ms (BridgeClock.daylight's sine through Lumar's year, but for any moment, so every page
  // works out the same bloom for the same moment whatever its own clock says)
  function daylightAt(ms) {
    var P = C() && C().PLANETS && C().PLANETS.lumar;
    if (!P || !P.year || !P.year.length) return 0.5;
    var weekF = (etAt(ms) / DAY + 3) / 7, len = 0, mid = 0;
    P.year.forEach(function (x) { if (x[0] === 'summer') mid = len + x[1] / 2; len += x[1]; });
    var pos = (((weekF + (P.offset || 0)) % len) + len) % len;
    return 0.5 + (P.amp || 0.15) * Math.cos(2 * Math.PI * (pos / len - mid / len));
  }
  // Lumar's sun at ms (as js/events.js skyAt): 0 night … 1 day
  function sunAt(ms) {
    var Cl = C();
    if (!Cl || !Cl.hoursAt || !Cl.PLANETS) return 0;
    var x = Cl.hoursAt('lumar', ms) / Cl.PLANETS.lumar.day, D = daylightAt(ms), w = Math.PI / 12;
    var e = Math.cos(2 * Math.PI * (x - 0.5)) - Math.cos(Math.PI * D);
    var t = Math.max(0, Math.min(1, (e + w) / (2 * w)));
    return t * t * (3 - 2 * t);
  }
  /** How strong the bloom is: 0 none … 1 the whole sea alight. */
  function on(ms, worldId) {
    if (forced != null) return forced;
    if (ms == null) ms = nowMs();
    if (!day(ms)) return 0;
    if (worldId && /^lumar-midnight/.test(worldId)) return 1;
    var dark = 1 - sunAt(ms);
    return dark <= 0 ? 0 : Math.pow(dark, 1.5);
  }
  /** The bloom on now (tonight), or the next one: { tonight, days (ET days from today), date, start (ms, ~its first dusk) }. */
  function next(ms) {
    if (ms == null) ms = nowMs();
    var today = Math.floor(etAt(ms) / DAY);
    if (forced != null && forced > 0) return { tonight: true, days: 0, date: dayStr(today), start: ms };
    if (day(ms)) return { tonight: true, days: 0, date: dayStr(centreDay(ms)), start: ms };
    for (var k = 0; k < 75; k++) {
      var d = today + k;
      if (!isBloomDay(d)) continue;
      var startEt = d * DAY - 2 * HOUR;                          // its first night's dusk (centred on ET midnight)
      var start = startEt - (etAt(startEt) - startEt);
      if (start + 6 * HOUR < ms) continue;                       // (today's, already over)
      return { tonight: k === 0 || start - ms < 10 * HOUR, days: k, date: dayStr(d), start: start };
    }
    return null;
  }
  function label(ms) {
    var n = next(ms);
    if (!n) return '';
    if (n.tonight) return on(ms) > 0.05 ? 'The spore bloom is on: the whole sea\'s alight' : 'The spore bloom: tonight!';
    return n.days === 1 ? 'The spore bloom: tomorrow night' : 'Next spore bloom in ' + n.days + ' days';
  }
  function hue(sea) { return HUE[sea] || HUE.emerald; }
  function core(sea) { return CORE[sea] || CORE.emerald; }

  // ---- small glows for things drawn in code (the sloop's wakes and surf): a soft dithered blob in a few flat bands -------
  var blobs = {};
  /** A glow sprite for `sea`, r px across (odd sizes centre on a pixel): a canvas, drawn with 'lighter'. */
  function blob(sea, r) {
    var key = sea + r;
    if (blobs[key]) return blobs[key];
    var n = r * 2 + 1, c = document.createElement('canvas');
    c.width = n; c.height = n;
    var g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data, H = hue(sea).split(',').map(Number);
    var B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var dx = (x - r) / (r + 0.5), dy = (y - r) / (r * 0.6 + 0.5), f = 1 - Math.sqrt(dx * dx + dy * dy);
      if (f <= 0) continue;
      var q = f * 3 + (B[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9, lv = Math.max(0, Math.min(3, Math.floor(q)));
      if (!lv) continue;
      var o = (y * n + x) * 4;
      d[o] = H[0]; d[o + 1] = H[1]; d[o + 2] = H[2]; d[o + 3] = [0, 56, 110, 180][lv];
    }
    g.putImageData(img, 0, 0);
    return (blobs[key] = c);
  }
  /** Glows at points on a canvas (the sloop's wake, surf round rocks and hulls): pts [[x, y, a, r?], …] in its native px. */
  function glowAt(ctx, sea, pts, k) {
    if (!(k > 0.01) || !pts.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], r = p[3] || 3, b = blob(sea, r), a = Math.min(1, p[2] * k);
      if (a < 0.03) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(b, Math.round(p[0]) - r, Math.round(p[1]) - r);
    }
    ctx.restore();
  }
  /** A foam colour, lit by the bloom: the sea's own foam toward its bloom light. */
  function foam(sea, base, k) {
    if (k == null) k = on();
    if (!(k > 0.01)) return base;
    var a = base.split(',').map(Number), b = core(sea).split(',').map(Number);
    return a.map(function (v, i) { return Math.round(v + (b[i] - v) * Math.min(1, k)); }).join(',');
  }

  // ---- people notice: a quiet note as you come ashore, a few gathered on the quays to watch ---------------------------------
  var QUAYS = { 'lumar': 1, 'lumar-crown': 1, 'lumar-tern': 1, 'lumar-sapphire': 1 };
  var noted = {};
  function arrive(worldId, data) {
    if (!/^lumar/.test(worldId || '') || !C() || !C().outdoor(worldId)) return;
    var k = on(null, worldId), n = next();
    if (!n || !n.tonight) return;
    var key = worldId + ':' + n.date;
    if (k > 0.05 && !noted[n.date] && typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) {
      noted[n.date] = 1;
      BridgeQuests.toast('The spore bloom', 'The whole sea is alight tonight', 'Go and look at the water');
    }
    if (QUAYS[worldId] && k > 0.05 && !noted[key] && typeof BridgeCrowd !== 'undefined' && BridgeCrowd.gather && data) {
      var dock = (data.interactions || []).filter(function (i) { return i.label === 'DOCK'; })[0];
      if (!dock) return;
      noted[key] = 1;
      var t = nowMs();
      try {
        BridgeCrowd.gather(worldId, { x: dock.x, y: dock.y - 1, r: 3.2, n: 6, face: [dock.x, dock.y + 6], id: 'bloom:' + key, start: t - 20000, until: t + 30 * 60000 });
      } catch (e) { /* no crowd here */ }
    }
  }
  // watched through the Lumar scene hooks (every frame; a world change or the bloom coming on is noticed within a second)
  var lastLook = 0;
  function watch(ctx, world) {
    var t = Date.now();
    if (t - lastLook < 1000) return;
    lastLook = t;
    var id = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null;
    if (id) arrive(id, world);
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    try { BridgeWorld.registerSceneHooks('lumar', { ground: function (ctx, world) { watch(ctx, world); } }); } catch (e) { /* no hooks */ }
  }

  return {
    on: on, day: day, nights: nights, next: next, label: label, hue: hue, core: core, glowAt: glowAt, blob: blob, foam: foam,
    arrive: arrive, HUE: HUE,
    _force: function (k) { forced = k == null ? null : Math.max(0, Math.min(1, +k)); },
    _forced: function () { return forced; },
    _noted: function () { return Object.keys(noted); },
    _sun: sunAt
  };
})();
