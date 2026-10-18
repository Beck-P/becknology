/**
 * BridgeWeather — the weather on every planet: shared, forecast, and with stakes (_claude_docs/spec-living-worlds.md §4).
 *
 * Beck: "weather, probably real stakes." Each place's weather runs in spells of real hours (`spell`: three on Lumar and
 * Verdance, four on Hoarfell and in Arcadia, six on Sylvara), on the Eastern-time clock (js/clock.js), each drawn by a
 * hash of the place and the spell, weighted by the season — so every pilot sees the same sky, and the forecast is just
 * the next spells read ahead. A spell sometimes carries on from the one before (`keep`), so weather comes in runs.
 * A new spell eases in over its first 25 minutes and the old one out over its last.
 *
 *   Lumar     fair · breezy · rain · fog · storm · gale        calm summers, autumn storms, winter fog and gales
 *   Verdance  fair · cloudy · rain · storm · heat wave · snow  (snow in winter, a heat wave only in summer)
 *   Hoarfell  clear · fair · snow · blizzard                   (an aurora over a clear night)
 *   Sylvara   clear · spirit mist · starfall · rain            (more mist and stars through the Dimming)
 *   Arcadia   clear · rain · smog · blackout
 *
 * What it does — fair play: always forecast, always shelter or a way out, losses mended:
 *   at sea (js/sloop.js `sea()`)  squalls and fog banks come thicker or thinner; a storm turns the whole sea into the
 *        Crimson's (squalls that knock you flat, lightning); a gale blows harder; fog hides the islands till you're
 *        close, with the Sapphire light sweeping through it. Pirates keep to port in a storm (js/seafight.js
 *        `pirates()`); the rare fish bite in the rain and the storm (js/fishing.js `fishLuck()`).
 *   Verdance  rain and snow water the field (js/homestead.js); a storm flattens tall crops, which wait to be staked up
 *        (js/farm.js `stormsBetween`); a heat wave dries a watering out twice as fast (`heat()`).
 *   Hoarfell  a blizzard's cold bites through a Thermal Suit and twice as hard without (js/worlds/hoarfell.js `cold()`),
 *        and drains a climber faster (js/climb.js `climb()`) — the lodge and the huts are shelter.
 *   Sylvara   a starfall night drops fallen stars near you; pick them up (Mirelle buys them).
 *   Arcadia   a blackout kills the neon (all but a torch's worth round you); the Neon Royale runs on generators.
 *   Business  open-air trade falls off in a storm, a blizzard or a blackout; the taverns fill up (js/business.js `trade()`).
 *
 * Forecast: the weather by the place's name (an icon; hover for the outlook), a word on arrival, the ship's chronometer
 * (js/hours.js) and every harbourmaster's book (js/harbour.js `outlook()`).
 *
 *   at(region, ms) → { region, kind, k (0..1), def, from, to, next } · here(worldId) · forecast(region, n) · outlook(region)
 *   rainDay() / raining(worldId) / endOfDay() (Verdance, as before)
 */
var BridgeWeather = (function () {
  var H = 3600000, RAMP = 25 * 60000;
  var REGIONS = {
    lumar:    { name: 'Lumar', spell: 3, keep: 0.35,
                w: { spring: { fair: 40, breezy: 25, rain: 20, fog: 10, storm: 5 },
                     summer: { fair: 60, breezy: 25, rain: 8, fog: 4, storm: 3 },
                     autumn: { fair: 32, breezy: 22, rain: 20, fog: 11, storm: 10, gale: 5 },
                     winter: { fair: 28, breezy: 14, rain: 15, fog: 25, storm: 8, gale: 10 } } },
    verdance: { name: 'Verdance', spell: 3, keep: 0.3,
                w: { spring: { fair: 35, cloudy: 25, rain: 30, storm: 8, heat: 2 },
                     summer: { fair: 45, cloudy: 15, rain: 15, storm: 10, heat: 15 },
                     autumn: { fair: 35, cloudy: 30, rain: 25, storm: 10 },
                     winter: { fair: 35, cloudy: 35, snow: 30 } } },
    hoarfell: { name: 'Hoarfell', spell: 4, keep: 0.3,
                w: { winter: { clear: 30, snow: 40, blizzard: 30 }, spring: { clear: 45, snow: 35, blizzard: 10, fair: 10 },
                     summer: { clear: 50, fair: 40, snow: 10 }, autumn: { clear: 40, snow: 40, blizzard: 20 } } },
    sylvara:  { name: 'Sylvara', spell: 6, keep: 0.2,
                w: { _: { clear: 50, mist: 25, starfall: 15, rain: 10 }, dimming: { clear: 30, mist: 45, starfall: 25 } } },
    arcadia:  { name: 'Arcadia', spell: 4, keep: 0.25, w: { _: { clear: 45, rain: 30, smog: 19, blackout: 6 } } }
  };
  var KINDS = {
    fair:     { name: 'Fair', calm: true },
    clear:    { name: 'Clear', calm: true },
    breezy:   { name: 'Breezy', calm: true },
    cloudy:   { name: 'Overcast', calm: true },
    rain:     { name: 'Rain', wet: true },
    storm:    { name: 'Storm', wet: true, bad: true },
    gale:     { name: 'Gale', bad: true },
    fog:      { name: 'Fog', bad: true },
    heat:     { name: 'Heat wave', bad: true },
    snow:     { name: 'Snow', wet: true },
    blizzard: { name: 'Blizzard', bad: true },
    mist:     { name: 'Spirit mist' },
    starfall: { name: 'Starfall' },
    smog:     { name: 'Smog' },
    blackout: { name: 'Blackout', bad: true }
  };
  // what it means, said when you arrive and in the outlook
  var STAKES = {
    'lumar:storm': 'Squalls and lightning at sea. Pirates keep to port; the rare fish bite',
    'lumar:gale': 'A hard wind at sea: ease the sheet early',
    'lumar:fog': 'Islands vanish till you\'re close. Follow the Sapphire light',
    'lumar:rain': 'The fish bite better in the rain',
    'verdance:rain': 'The field waters itself', 'verdance:snow': 'The snowmelt waters the field',
    'verdance:storm': 'It waters the field, but it flattens tall crops: stake them up after',
    'verdance:heat': 'A watering dries out twice as fast',
    'hoarfell:blizzard': 'The cold bites through any suit. Get indoors', 'hoarfell:snow': 'Fresh powder on the pistes',
    'sylvara:starfall': 'Stars fall after dark. Pick them up', 'sylvara:mist': 'Spirit mist in the wood: don\'t follow the lights',
    'arcadia:rain': 'Neon on wet streets', 'arcadia:smog': 'Air quality: poor', 'arcadia:blackout': 'The neon\'s dead. The Royale runs on generators'
  };

  function C() { return typeof BridgeClock !== 'undefined' ? BridgeClock : null; }
  function now() { return C() ? C().now() : Date.now(); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000003) / 1000003; }
  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function etOf(ms) { return C() ? C().etAt(ms) : ms; }

  /** The weather region of a world (its planet), or null where there's no weather (the ship, Enigma, the Singularity). */
  function regionOf(worldId) { var p = C() && worldId ? C().planet(worldId) : null; return p && REGIONS[p] ? p : null; }
  function table(r) {
    var R = REGIONS[r], s = C() ? C().season(r) : null;
    return (s && R.w[s.id]) || R.w._ || R.w.autumn || R.w[Object.keys(R.w)[0]];
  }
  var pinned = {};                                     // tests and previews: _pin('lumar', 'storm') holds a region's weather
  function kindAt(r, b, depth) {
    if (pinned[r]) return pinned[r];
    var R = REGIONS[r];
    if ((depth || 0) < 3 && hash(r + ':keep:' + b) < R.keep) return kindAt(r, b - 1, (depth || 0) + 1);
    var T = table(r), keys = Object.keys(T), tot = keys.reduce(function (a, k) { return a + T[k]; }, 0), x = hash(r + ':' + b) * tot;
    for (var i = 0; i < keys.length; i++) { x -= T[keys[i]]; if (x <= 0) return keys[i]; }
    return keys[0];
  }
  /** The weather in a region at a real moment. */
  function at(r, ms) {
    if (!REGIONS[r]) return null;
    ms = ms == null ? now() : ms;
    var len = REGIONS[r].spell * H, e = etOf(ms), b = Math.floor(e / len), start = ms - (e - b * len);
    var kind = kindAt(r, b), prev = kindAt(r, b - 1), next = kindAt(r, b + 1), u = ms - start, k = 1;
    if (prev !== kind) k = Math.min(k, smooth(u / RAMP));
    if (next !== kind) k = Math.min(k, smooth((len - u) / RAMP));
    var from = start, to = start + len, i;
    for (i = 1; i < 8 && kindAt(r, b - i) === kind; i++) from -= len;
    for (i = 1; i < 8 && kindAt(r, b + i) === kind; i++) to += len;
    var after = kindAt(r, Math.floor(etOf(to) / len));
    return { region: r, kind: kind, k: k, def: KINDS[kind], from: from, to: to, next: after };
  }
  function here(worldId) { var r = regionOf(worldId || wid()); return r ? at(r) : null; }
  function wid() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  /** The next `n` runs of weather: [{ kind, name, from, to }]. */
  function forecast(r, n) {
    var out = [], t = now();
    for (var i = 0; i < (n || 3) && REGIONS[r]; i++) {
      var w = at(r, t);
      out.push({ kind: w.kind, name: w.def.name, from: w.from, to: w.to, stake: STAKES[r + ':' + w.kind] || '' });
      t = w.to + 1000;
    }
    return out;
  }
  function etHour(ms) {
    var d = new Date(etOf(ms)), h = d.getUTCHours(), m = d.getUTCMinutes();
    return (h % 12 || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? 'am' : 'pm');
  }
  function inHours(ms) { var h = (ms - now()) / H; return h < 1 ? 'within the hour' : 'in about ' + Math.round(h) + 'h'; }
  /** "Rain till about 3pm ET (in 2h), then fair" — what's coming, in words. */
  function outlook(r) {
    var f = forecast(r, 3);
    if (!f.length) return '';
    var s = f[0].name + ' till about ' + etHour(f[0].to) + ' ET (' + inHours(f[0].to) + '), then ' + f[1].name.toLowerCase();
    if (f[2]) s += ', then ' + f[2].name.toLowerCase() + ' from about ' + etHour(f[2].from);
    return s + '.';
  }

  // ---- what it does to the rest of the game ----------------------------------------------------------------------------
  function lerp(a, b, k) { return a + (b - a) * k; }
  /** The sea, for the sloop: how thick its squalls and fog come, the wind, and a storm's or a fog's grip on the whole sea. */
  function sea(ms) {                                       // (at a given moment: a race's gun, js/race.js)
    var w = at('lumar', ms), K = w.kind, k = w.k;
    return { kind: K, k: k,
             squall: lerp(1, { fair: 0.5, breezy: 0.9, rain: 1.7, fog: 0.6, storm: 2.8, gale: 1.4 }[K] || 1, k),
             fog: lerp(1, { fair: 0.5, breezy: 0.6, rain: 1, fog: 3.5, storm: 1, gale: 0.4 }[K] || 1, k),
             wind: lerp(1, { fair: 0.85, breezy: 1.12, rain: 1, fog: 0.7, storm: 1.25, gale: 1.4 }[K] || 1, k),
             storm: K === 'storm' && k > 0.5, veil: K === 'fog' ? k : 0, rain: K === 'rain' ? 0.6 * k : K === 'storm' ? k : 0,
             dark: K === 'storm' ? 0.28 * k : K === 'rain' ? 0.1 * k : 0 };
  }
  /** How much likelier a rare fish is, by the weather over the water you're fishing. */
  function fishLuck(pool) {
    var r = pool === 'pond' ? 'verdance' : pool === 'ice' ? 'hoarfell' : 'lumar', w = at(r);
    var m = { storm: 1.8, rain: 1.3, fog: 1.15, blizzard: 1.5, snow: 1.15 }[w.kind] || 1;
    return lerp(1, m, w.k);
  }
  /** Pirates and worse: fewer at sea in a storm (they keep to port) or a gale. */
  function pirates() { var w = at('lumar'); return lerp(1, { storm: 0.25, gale: 0.6, fog: 0.8 }[w.kind] || 1, w.k); }
  /** A business's trade in the weather (js/business.js): the open air empties in a storm; the taverns fill. */
  function trade(worldId, ms) {
    var r = regionOf(worldId);
    if (!r) return 1;
    var w = at(r, ms), K = w.kind, out = C() && C().outdoor(worldId), m = 1;
    if (K === 'blackout') m = /^arcadia-casino/.test(worldId) ? 1 : 0.5;
    else if (out) m = { storm: 0.45, blizzard: 0.45, rain: 0.8, snow: 0.85, fog: 0.85, heat: 0.9, smog: 0.9, gale: 0.7 }[K] || 1;
    else m = { storm: 1.12, blizzard: 1.12, rain: 1.1, snow: 1.08, fog: 1.05, gale: 1.08 }[K] || 1;
    return lerp(1, m, w.k);
  }
  /** Hoarfell's cold in the weather: { rate (× the cold's bite), suited (how hard it bites through a Thermal Suit) }. */
  function cold(worldId) {
    var w = regionOf(worldId) === 'hoarfell' ? at('hoarfell') : null;
    if (!w) return { rate: 1, suited: 0 };
    if (w.kind === 'blizzard') return { rate: 1 + w.k, suited: 0.6 * w.k };
    if (w.kind === 'snow') return { rate: 1 + 0.25 * w.k, suited: 0 };
    return { rate: 1, suited: 0 };
  }
  /** A climber's stamina drain in the weather (js/climb.js). */
  function climb() { var w = at('hoarfell'); return lerp(1, { blizzard: 1.5, snow: 1.15 }[w.kind] || 1, w.k); }
  /** Rain (or snow) on Verdance: it waters the field. */
  function wets() { var w = at('verdance'); return !!(w.def.wet && w.k > 0.3); }
  function heat() { var w = at('verdance'); return w.kind === 'heat' && w.k > 0.3; }
  /** The storms on a region between two moments: [{ from, to }] (js/farm.js flattens crops after one). */
  function stormsBetween(r, from, to) {
    var out = [], len = REGIONS[r].spell * H;
    from = Math.max(from, to - 14 * 24 * H);
    for (var b = Math.floor(etOf(from) / len); b <= Math.floor(etOf(to) / len); b++) {
      if (kindAt(r, b) !== 'storm') continue;
      var s = 2 * b * len - etOf(b * len);                     // the spell's start, back from Eastern time
      out.push({ from: s, to: s + len, id: b });
    }
    return out;
  }

  // ---- as before: Verdance's rain -------------------------------------------------------------------------------------
  var forced = null;
  function rainDay() { return forced !== null ? forced : wets(); }
  function raining(worldId) { return /^verdance(-village)?$/.test(worldId || wid() || '') && rainDay(); }
  /** Rain keeps the ground wet to the end of the Verdance day (two hours at the least), like a watering. */
  function endOfDay() {
    var T = C() ? C().time('verdance') : null;
    return Date.now() + Math.max(2 * H, T ? T.len - T.t : 6 * H);
  }

  // ---- telling you ---------------------------------------------------------------------------------------------------
  var told = {};
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }
  function decorate(worldId) {
    var r = regionOf(worldId), w = r ? at(r) : null;
    if (!w || w.def.calm || w.k < 0.2 || told[r] === w.from) return;
    told[r] = w.from;
    setTimeout(function () {
      if (regionOf(wid()) !== r) return;                    // gone on somewhere else already
      toast('Weather', w.def.name + ' on ' + REGIONS[r].name, (STAKES[r + ':' + w.kind] ? STAKES[r + ':' + w.kind] + ' · ' : '') + 'till about ' + etHour(w.to) + ' ET');
    }, 2600);
  }
  // the icon by the place's name, beside the sky (js/hours.js): only when the weather's worth a look
  var CLOUD = '<path d="M4 11.5h8.2a2.8 2.8 0 0 0 .3-5.6A3.8 3.8 0 0 0 5.2 5 3.2 3.2 0 0 0 4 11.5z" fill="#c8d0dc"/>';
  var ICON = {
    rain: CLOUD + '<path d="M5.5 13l-.7 2M8.5 13l-.7 2M11.5 13l-.7 2" stroke="#8cc4ff" stroke-width="1.3" stroke-linecap="round"/>',
    storm: CLOUD.replace('#c8d0dc', '#8a93a6') + '<path d="M8.6 10.5L6.8 13.6h2.2l-1.4 2.4" stroke="#ffe066" stroke-width="1.3" fill="none" stroke-linejoin="round"/>',
    snow: CLOUD + '<path d="M5.5 13.6h.1M8.5 14.6h.1M11.5 13.6h.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    blizzard: '<path d="M2 5h9a2 2 0 1 0-2-2M2 8.5h12a2 2 0 1 1-2 2M2 12h7" stroke="#e8f2ff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    gale: '<path d="M2 5h9a2 2 0 1 0-2-2M2 8.5h12a2 2 0 1 1-2 2M2 12h7" stroke="#b8d4ec" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    fog: '<path d="M2 5h12M4 8h10M2 11h11M5 14h8" stroke="#d6dce4" stroke-width="1.6" stroke-linecap="round"/>',
    mist: '<path d="M2 6c2-1.5 4 1.5 6 0s4 1.5 6 0M2 10c2-1.5 4 1.5 6 0s4 1.5 6 0" stroke="#bfe8dc" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    heat: '<circle cx="8" cy="6" r="3" fill="#ffb347"/><path d="M3 12c1.5-1 3 1 4.5 0s3 1 4.5 0" stroke="#ff8a3c" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    starfall: '<path d="M10 2l1 2.4 2.5.3-1.9 1.7.5 2.5L10 7.6 7.9 8.9l.5-2.5-1.9-1.7 2.5-.3z" fill="#fff2a8"/><path d="M2 14l5-5" stroke="#fff2a8" stroke-width="1.2" stroke-linecap="round"/>',
    smog: '<path d="M2 6h12M2 9.5h12M2 13h12" stroke="#b9a678" stroke-width="2" stroke-linecap="round" opacity=".85"/>',
    blackout: '<path d="M8 2a4 4 0 0 0-2.4 7.2V11h4.8V9.2A4 4 0 0 0 8 2zM6 12.5h4M6.6 14.3h2.8" stroke="#8a8fa0" stroke-width="1.3" fill="none"/><path d="M3 3l10 10" stroke="#ff5a6a" stroke-width="1.4"/>',
    cloudy: CLOUD
  };
  function badge() {
    var id = wid(), el = document.getElementById('world-location-badge');
    if (!el || !id) return;
    var r = regionOf(id), w = r ? at(r) : null, sp = el.querySelector('.world-wx');
    if (!sp) { sp = document.createElement('span'); sp.className = 'world-wx'; el.appendChild(sp); }
    var show = w && ICON[w.kind] && w.k > 0.2;
    sp.style.display = show ? '' : 'none';
    if (!show) return;
    if (sp.getAttribute('data-k') !== w.kind) { sp.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14">' + ICON[w.kind] + '</svg>'; sp.setAttribute('data-k', w.kind); }
    sp.title = outlook(r);
  }

  // ---- what you see (outdoors) ---------------------------------------------------------------------------------------
  var flash = { at: 0, next: 0, thunder: 0 }, stars = [], fall = { next: 0 };
  var KEY = 'bridge_weather', save = {};
  try { save = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { save = {}; }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function nightOf(id) { var s = C() ? C().sky(id) : null; return !s || !s.cycles ? (s && s.part === 'night' ? 1 : 0) : 1 - (s.sun || 0); }

  // Look Book 2's rain (LB.weatherFx, drawn before its grade): every drop somewhere of its own with a speed of its own
  // (260-380 px a second), slanting a little, a pixel wide and six long, '#c4d2e8' at 0.35-0.65; one to 700 px of
  // screen; and where they land a splash — a three-pixel crown on the ground, one to 2600 px, a third of each beat — and
  // on water rings (js/sea.js, js/litscene.js). The grade is the Look Book's too: the light greyed and dimmed
  // (multiplied), not a wash laid over it. Before, the drops sat on a lattice at five speeds, so they fell in lines.
  var DROPS = (function () {
    function h(i, s) { var x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); }
    var n = 2400, d = { x: new Float32Array(n), y: new Float32Array(n), sp: new Float32Array(n), a: new Float32Array(n), h: h };
    for (var i = 0; i < n; i++) { d.x[i] = h(i, 1); d.y[i] = h(i, 2); var s = h(i, 3); d.sp[i] = 260 + s * 120; d.a[i] = 0.35 + s * 0.3; }
    return d;
  })();
  var DROP = [196, 210, 232], CROWN = [221, 230, 244];
  // the light the rain falls in (what the Look Book's grade multiplied its drops by): a grey day, a blue night
  function rainAmb(night, heavy) {
    var d = [0.782, 0.808, 0.847], n = [0.30, 0.36, 0.6];       // the night's lifted a little so the drops still read
    var a = [d[0] + (n[0] - d[0]) * night, d[1] + (n[1] - d[1]) * night, d[2] + (n[2] - d[2]) * night];
    return heavy ? a.map(function (v) { return v * 0.86; }) : a;
  }
  function tone(c, amb) { return 'rgb(' + Math.round(c[0] * amb[0]) + ',' + Math.round(c[1] * amb[1]) + ',' + Math.round(c[2] * amb[2]) + ')'; }
  /** o: { ox, oy (the world's offset, so it falls on the world, not the glass), grade (the scene's light greyed: off in
   *  live light, which greys its own), amb (the light's colour, 0..1), water(x, y) (no crown there: it rings) } */
  function rain(ctx, W, Hh, t, k, heavy, night, o) {
    o = o || {};
    var s = t / 1000, amb = o.amb || rainAmb(night, heavy), ox = o.ox || 0, oy = o.oy || 0;
    if (o.grade) {                                               // the baked light, grey and a touch dimmer
      var g = rainAmb(0, heavy), gn = [0.88, 0.88, 0.92], f = Math.min(1, k);
      var c = [0, 1, 2].map(function (i) { var v = g[i] + (gn[i] - g[i]) * night; return Math.round(255 * (1 - (1 - v) * f)); });
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(' + c.join(',') + ')'; ctx.fillRect(0, 0, W, Hh); ctx.restore();
    }
    var n = Math.min(DROPS.x.length, Math.round(W * Hh / 700 * (heavy ? 1.7 : 1) * k)), slant = heavy ? 0.34 : 0.22;
    var SW = W + 40, SH = Hh + 40;
    ctx.save();
    ctx.fillStyle = tone(DROP, amb);
    for (var i = 0; i < n; i++) {
      var sp = DROPS.sp[i] * (heavy ? 1.25 : 1);
      var y = (((DROPS.y[i] * SH + s * sp + oy) % SH) + SH) % SH - 20;
      var x = (((DROPS.x[i] * SW - s * sp * slant + ox) % SW) + SW) % SW - 20;
      x = Math.round(x); y = Math.round(y);
      ctx.globalAlpha = DROPS.a[i];
      ctx.fillRect(x, y, 1, 3); ctx.fillRect(x - 1, y + 3, 1, 3);   // the Look Book's line from (x, y) to (x - 1, y + 5)
    }
    if (o.splash !== false) {
      // the splashes: a cell of the world each (so they stay put as the camera moves), a new spot every third of a second:
      // the Look Book's crown, then (a beat it didn't have, so the drops are seen to land) a ring spreading flat
      var cell = heavy ? 36 : 44, hh = DROPS.h, cx0 = Math.floor(-ox / cell), cy0 = Math.floor(-oy / cell);
      ctx.fillStyle = tone(CROWN, amb);
      for (var cy = cy0; cy <= cy0 + Math.ceil(Hh / cell) + 1; cy++) for (var cx = cx0; cx <= cx0 + Math.ceil(W / cell) + 1; cx++) {
        var id = cx * 7919 + cy * 104729;
        if (hh(id, 4) > k) continue;
        var ph = s * 3 + hh(id, 5), beat = Math.floor(ph), u = ph - beat;
        if (u > 0.36) continue;
        var sx = Math.floor(cx * cell + hh(id + beat, 6) * cell + ox), sy = Math.floor(cy * cell + hh(id + beat, 7) * cell + oy);
        if (sx < 2 || sy < 2 || sx >= W - 2 || sy >= Hh - 1 || (o.water && o.water(sx, sy))) continue;
        if (u < 0.14) {
          ctx.globalAlpha = 0.65;
          ctx.fillRect(sx - 1, sy, 1, 1); ctx.fillRect(sx + 1, sy, 1, 1); ctx.fillRect(sx, sy - 1, 1, 1);
          if (u < 0.07) ctx.fillRect(sx, sy - 3, 1, 1);                       // a droplet thrown up
        } else {
          ctx.globalAlpha = 0.45 * (1 - (u - 0.14) / 0.22);
          ctx.fillRect(sx - 1, sy - 1, 3, 1); ctx.fillRect(sx - 1, sy + 1, 3, 1);
          ctx.fillRect(sx - 2, sy, 1, 1); ctx.fillRect(sx + 2, sy, 1, 1);
        }
      }
    }
    ctx.restore();
  }
  function snow(ctx, W, Hh, t, k, blizzard, px, py, ts) {
    var n = Math.round((blizzard ? 340 : 190) * k);
    ctx.fillStyle = 'rgba(200,210,230,' + (0.14 * k).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, Hh);
    for (var i = 0; i < n; i++) {
      var sp = blizzard ? 0.06 + (i % 5) * 0.012 : 0.02 + (i % 5) * 0.006, side = blizzard ? 0.22 : 0.012 * (1 + (i % 3));
      var y = (i * 53.71 + t * sp) % (Hh + 10) - 5, x = ((i * 97.13 + t * side) % (W + 20)) - 10 + Math.sin(t / 900 + i) * 4;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + (i % 4) * 0.1).toFixed(2) + ')';
      ctx.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 2 : 1, blizzard && i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 1);
    }
    if (blizzard) veil(ctx, W, Hh, px, py, ts * 2, ts * 7, '235,242,250', 0.7 * k);       // a whiteout closing in
  }
  function veil(ctx, W, Hh, px, py, r0, r1, rgb, a) {
    var g = ctx.createRadialGradient(px, py, r0, px, py, r1);
    g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(1, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
  }
  function fogBanks(ctx, W, Hh, t, k, rgb, offX, offY) {
    for (var i = 0; i < 6; i++) {
      var x = ((i * 271 + t * 0.008 * (1 + i % 3) + offX * 0.6) % (W + 400)) - 200, y = ((i * 157 + offY * 0.6) % (Hh + 200)) - 100;
      var g = ctx.createRadialGradient(x, y, 10, x, y, 180);
      g.addColorStop(0, 'rgba(' + rgb + ',' + (0.22 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - 180, y - 180, 360, 360);
    }
  }
  function lightning(ctx, W, Hh, t, k, out) {
    if (!flash.next) flash.next = t + 4000;
    if (t > flash.next) {
      flash.at = t; flash.next = t + 8000 + hash('fl' + Math.floor(t / 97)) * 12000; flash.thunder = t + 400 + hash('th' + Math.floor(t)) * 1600;
    }
    if (flash.thunder && t > flash.thunder) { flash.thunder = 0; if (out && typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('thunder'); }
    var a = t - flash.at < 380 ? (1 - (t - flash.at) / 380) * 0.5 * k : 0;
    if (a > 0.01) { ctx.fillStyle = 'rgba(235,240,255,' + a.toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh); }
  }
  function aurora(ctx, W, Hh, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var cols = ['60,255,170', '80,220,255', '170,110,255'];
    for (var b = 0; b < 3; b++) for (var x = 0; x < W; x += 4) {
      var y = Hh * 0.06 + b * 16 + Math.sin(x / 90 + t / 2100 + b * 1.7) * 14 + Math.sin(x / 33 + t / 900) * 4;
      var al = a * (0.07 + 0.05 * Math.sin(x / 50 + t / 700 + b));
      ctx.fillStyle = 'rgba(' + cols[b] + ',' + Math.max(0, al).toFixed(3) + ')';
      ctx.fillRect(x, Math.round(y), 4, 26 + b * 6);
    }
    ctx.fillStyle = 'rgba(60,255,170,' + (0.035 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh);
    ctx.restore();
  }
  // shooting stars, and now and then one that comes down by you (a fallen star you can pick up)
  function starfall(ctx, W, Hh, t, a, px, py, w) {
    if (stars.length < 3 && hash('sf' + Math.floor(t / 700)) < 0.18 && !stars.some(function (s) { return t - s.t0 < 300; })) {
      var sx = hash('x' + Math.floor(t / 700)) * W, sy = hash('y' + Math.floor(t / 700)) * Hh * 0.4;
      stars.push({ t0: t, x: sx, y: sy, dx: -120 - hash('d' + t) * 160, dy: 90 + hash('e' + t) * 80, dur: 900 });
    }
    var spell = 'sylvara:' + w.from;
    save.stars = save.stars && save.stars.spell === spell ? save.stars : { spell: spell, n: 0 };
    if (!fall.next) fall.next = t + 20000;
    if (a > 0.6 && t > fall.next && save.stars.n < 6) {          // one comes down a few steps from you
      fall.next = t + 70000 + hash('fn' + Math.floor(t)) * 40000;
      stars.push({ t0: t, x: px + 260, y: py - 240, dx: -260, dy: 240, dur: 1300, land: true });
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    stars = stars.filter(function (s) {
      var u = (t - s.t0) / s.dur;
      if (u >= 1) {
        if (s.land && typeof BridgeLoot !== 'undefined' && typeof BridgeCharacter !== 'undefined') {
          var p = BridgeCharacter.getRenderPos();
          BridgeLoot.spawn(Math.floor(p.x + 0.5), Math.floor(p.y + 0.5), 'fallen_star', 1);
          save.stars.n++; store();
          if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('success');
        }
        return false;
      }
      for (var i = 0; i < 10; i++) {
        var f = Math.max(0, u - i * 0.03), x = s.x + s.dx * f, y = s.y + s.dy * f;
        ctx.fillStyle = 'rgba(255,240,180,' + ((1 - i / 10) * 0.7 * a).toFixed(3) + ')';
        ctx.fillRect(Math.round(x), Math.round(y), i ? 1 : 2, i ? 1 : 2);
      }
      return true;
    });
    ctx.restore();
  }
  function wisps(ctx, t, a, offX, offY, ts) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 9; i++) {
      var x = offX + ((i * 7.3) % 40 + Math.sin(t / 3100 + i * 2.1) * 3) * ts, y = offY + ((i * 5.9) % 30 + Math.cos(t / 2700 + i) * 2) * ts;
      var pulse = 0.5 + 0.5 * Math.sin(t / 500 + i * 1.3);
      ctx.fillStyle = 'rgba(170,255,220,' + (0.25 * a * pulse).toFixed(3) + ')'; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6);
      ctx.fillStyle = 'rgba(230,255,245,' + (0.6 * a * pulse).toFixed(3) + ')'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    ctx.restore();
  }

  // how the rain falls on this scene: in live light (js/litscene.js) the light's own colour, already greyed for the
  // rain, so no grade of ours; a baked scene greyed here; no crowns where it lands in water (that rings)
  function rainHere(id, offX, offY, night, heavy) {
    var sc = typeof BridgeScene !== 'undefined' && BridgeScene.get ? BridgeScene.get(id) : null;
    var lt = sc && sc.lit && typeof BridgeLit !== 'undefined' && BridgeLit.ready(sc) ? BridgeLit.light(id) : null;
    var amb = null;
    if (lt && lt.P && lt.P.amb) {
      var lift = 1 + 0.3 * (lt.night || 0);
      amb = lt.P.amb.map(function (v) { return Math.min(1, v * lift); });
    }
    var water = sc && typeof BridgeSea !== 'undefined' && BridgeSea.waterAt ? BridgeSea.waterAt(sc, offX, offY) : null;
    return { ox: offX, oy: offY, grade: !lt, amb: amb, water: water };
  }
  function over(ctx, world, offX, offY, ts, t) {
    var id = wid();
    if (!id || !C() || !C().outdoor(id)) return;
    var w = here(id);
    if (!w || w.k <= 0.01) return;
    var W = ctx.canvas.width, Hh = ctx.canvas.height, k = w.k, night = nightOf(id);
    var p = typeof BridgeCharacter !== 'undefined' ? BridgeCharacter.getRenderPos() : { x: 0, y: 0 };
    var px = offX + (p.x + 0.5) * ts, py = offY + (p.y + 0.5) * ts;
    switch (w.kind) {
      case 'rain': rain(ctx, W, Hh, t, k, false, night, rainHere(id, offX, offY, night, false)); break;
      case 'storm': rain(ctx, W, Hh, t, k, true, night, rainHere(id, offX, offY, night, true)); lightning(ctx, W, Hh, t, k, true); break;
      case 'snow': snow(ctx, W, Hh, t, k, false, px, py, ts); break;
      case 'blizzard': snow(ctx, W, Hh, t, k, true, px, py, ts); break;
      case 'fog': fogBanks(ctx, W, Hh, t, k, '214,220,228', offX, offY); veil(ctx, W, Hh, px, py, ts * 2.5, ts * 8, '205,212,222', 0.78 * k); break;
      case 'mist': fogBanks(ctx, W, Hh, t, 0.8 * k, '190,235,220', offX, offY); veil(ctx, W, Hh, px, py, ts * 4, ts * 12, '170,215,205', 0.35 * k); wisps(ctx, t, k, offX, offY, ts); break;
      case 'smog': ctx.fillStyle = 'rgba(120,100,60,' + (0.22 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh); fogBanks(ctx, W, Hh, t, 0.7 * k, '150,130,80', offX, offY); break;
      case 'blackout': {
        var sputter = t - w.from < 6000 && Math.sin(t / 40) > 0.3 ? 0.3 : 1;     // the neon gutters as it goes
        veil(ctx, W, Hh, px, py, ts * 1.6, ts * 6.5, '3,3,10', 0.8 * k * sputter);
        ctx.fillStyle = 'rgba(3,3,10,' + (0.25 * k * sputter).toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh);
        break;
      }
      case 'heat': ctx.fillStyle = 'rgba(255,170,80,' + (0.08 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh); break;
      case 'cloudy': ctx.fillStyle = 'rgba(70,80,100,' + (0.1 * k).toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh); break;
      case 'starfall': if (night > 0.35) starfall(ctx, W, Hh, t, k * night, px, py, w); break;
      case 'clear': if (w.region === 'hoarfell' && night > 0.4) aurora(ctx, W, Hh, t, k * night); break;
    }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { over: over });
  setInterval(badge, 4000);

  /** What the sea looks like in it (js/sloop.js draws this over the passage): rain, a storm's dark and its lightning,
   *  fog closing in round the boat with the Sapphire light sweeping through it. `light`: the lighthouse on screen, if
   *  it's anywhere near ([x, y]). */
  function drawSea(ctx, W, Hh, t, bx, by, ts, light) {
    var s = sea();
    if (s.dark > 0.01) { ctx.fillStyle = 'rgba(16,22,34,' + s.dark.toFixed(3) + ')'; ctx.fillRect(0, 0, W, Hh); }
    if (s.rain > 0.01) rain(ctx, W, Hh, t, s.rain, s.kind === 'storm', nightOf('lumar'), { splash: false });   // it rings on the sea (js/sea.js)
    if (s.kind === 'storm' && s.k > 0.3) lightning(ctx, W, Hh, t, s.k, false);
    if (s.veil > 0.01) {
      veil(ctx, W, Hh, bx, by, ts * 3, ts * 11, '205,212,222', 0.85 * s.veil);
      if (light) {                                           // the lighthouse: a beam sweeping round, seen through the fog
        var a = t / 3200, X = light[0], Y = light[1];
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (var side = 0; side < 2; side++) {
          var ang = a + side * Math.PI, L = ts * 40;
          var g = ctx.createRadialGradient(X, Y, 0, X, Y, L);
          g.addColorStop(0, 'rgba(255,240,190,' + (0.5 * s.veil).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,240,190,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(X, Y);
          ctx.arc(X, Y, L, ang - 0.14, ang + 0.14); ctx.closePath(); ctx.fill();
        }
        var gl = ctx.createRadialGradient(X, Y, 0, X, Y, ts * 3);
        gl.addColorStop(0, 'rgba(255,245,200,' + (0.8 * s.veil).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,245,200,0)');
        ctx.fillStyle = gl; ctx.fillRect(X - ts * 3, Y - ts * 3, ts * 6, ts * 6);
        ctx.restore();
      }
    }
  }
  /** The sounds under a place in its weather (js/audio.js): the rain, the gale. */
  function amb(worldId, beds) {
    var w = C() && C().outdoor(worldId) ? here(worldId) : null;
    if (!w || w.k < 0.3) return beds;
    var add = { rain: ['rain'], storm: ['rain', 'wind'], gale: ['wind'], blizzard: ['gale'], snow: ['snowwind'], fog: [] }[w.kind];
    if (!add) return beds;
    return beds.filter(function (b) { return b !== 'birds'; }).concat(add.filter(function (b) { return beds.indexOf(b) < 0; }));
  }

  return { at: at, here: here, forecast: forecast, outlook: outlook, regionOf: regionOf, KINDS: KINDS, REGIONS: REGIONS,
           sea: sea, fishLuck: fishLuck, pirates: pirates, trade: trade, cold: cold, climb: climb, wets: wets, heat: heat,
           stormsBetween: stormsBetween, drawSea: drawSea, amb: amb, etHour: etHour,
           rainDay: rainDay, raining: raining, endOfDay: endOfDay, decorate: decorate, _force: function (v) { forced = v; }, _badge: badge,
           _pin: function (r, kind) { if (kind) pinned[r] = kind; else delete pinned[r]; told = {}; } };
})();
