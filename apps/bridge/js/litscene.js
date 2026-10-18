/**
 * BridgeLit — live light on a pre-rendered scene (Look Book 2's relight, in the game).
 *
 * A scene rendered with live light (scenekit `lit`: any scene with a day; scene.json "lit") brings, beside its baked
 * states, the passes scene_post packs from Blender: the flat colours (lit_albedo), a white sky dome's light and six
 * white suns through the day, each with its own shadows (lit_a, lit_b, lit_c), the normal's z, flags (leaf, needle,
 * grass, still water, ground, roof), which tree, the line strength (lit_d), the lamps' light (lit_lamps), what glows
 * (glow) and, over still water, Blender's mirror (lit_refl, lit_reflglow). Here they're put together for the planet's
 * hour, its season and its weather, in the toy finish Beck picked (Look Book 2: "toy, the normal toy, not HD, with
 * soft light"): light in four flat bands, shadows leaning cool and lights warm, strong lines between things.
 *
 *   - The sun crosses the sky with the planet's clock (js/clock.js): between sunrise and sunset its light is the two
 *     nearest sun passes blended, so shadows swing from the left in the morning to the right in the evening, warm and
 *     long at either end; at night the moon (the noon pass, blue and faint) and the lamps.
 *   - The seasons (BridgeFoliage.season, Lumar and Verdance): grass fresh in spring, straw in autumn, dormant in a
 *     Lumar winter; each tree its own autumn colour, blossom in spring, bare in winter; on Verdance in winter snow lies
 *     on whatever faces up (the ground, the roofs, the tops of the trees) and the ponds ice over from the shore.
 *   - The weather (BridgeWeather): rain wets the ground and dims the sun, fog and cloud flatten it, a snowfall lays a
 *     light snow.
 *   - Still water (ponds, streams, basins): Look Book 1's pond — depth in four bands with organic shelves and hollows,
 *     the far bank mirrored in it and wobbling, Blender's true mirror for what stands in it, light dashes coming and
 *     going, a glitter path at golden hour, stars on clear nights, the lap line on the near shore, lamps streaking
 *     down it after dark. (nature.js adds the glints and the rings.)
 *
 * A composition is worked out a few milliseconds a frame (BUDGET) whenever the light has moved on enough to show
 * (every minute or so of real time — a planet's day is hours long), then cross-faded in (FADE). Until the first is
 * ready the baked states show (js/scene.js), so nothing waits on it. Characters take their light from the same
 * passes at their feet (tint), so they're in shadow under a tree and lit by a lamp at night.
 *
 * js/scene.js calls: load(sc) once its scene is in, layers(sc, use, masks) when the decor changes, frame(sc) to draw,
 * water(ctx, sc, x, y, v, now) after it, tint(sc, col, row). Tests and previews: _force({ hour, season, weather }),
 * _stats(id).
 */
var BridgeLit = (function () {
  'use strict';

  var BUDGET = 6;            // ms a frame spent composing
  var FADE = 1600;           // ms a new composition takes to fade in
  var DEC = new Float32Array(256);
  for (var v = 0; v < 256; v++) DEC[v] = (v / 255) * (v / 255) * 4;
  var forced = null;

  // ---- small things ----
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function hash(x, y, s) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function noise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  }
  function fbm(x, y, s, oct) {
    var t = 0, amp = 0.5, f = 1, n = 0;
    for (var i = 0; i < oct; i++) { t += amp * noise(x * f, y * f, s + i * 17); n += amp; amp *= 0.5; f *= 2; }
    return t / n;
  }
  function rgbn(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  function mixv(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function luma(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function css(c, a) {
    var s = Math.round(clamp(c[0], 0, 1) * 255) + ',' + Math.round(clamp(c[1], 0, 1) * 255) + ',' + Math.round(clamp(c[2], 0, 1) * 255);
    return a == null ? 'rgb(' + s + ')' : 'rgba(' + s + ',' + a + ')';
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---- the sky through a day (Look Book 2's), on a 24-hour face: the sun up at 6, down at 19.6 ----
  // hour, ambient, sky overhead, sky at the horizon, night 0..1, golden 0..1
  var KEYS = [
    [0, '#3c4884', '#060a1e', '#1a2448', 1, 0],
    [4.6, '#404c88', '#0a1032', '#28305c', 1, 0],
    [5.6, '#8a78a8', '#2c3668', '#c47c8c', 0.55, 0.35],
    [6.6, '#f2c2ae', '#6c8cc4', '#f6ba92', 0.08, 0.75],
    [8, '#fff1de', '#78aeea', '#eae2ca', 0, 0.12],
    [12, '#ffffff', '#5a9ee8', '#d2e8f6', 0, 0],
    [16, '#fff7e8', '#68a4e6', '#e8e4cc', 0, 0.1],
    [18, '#ffdeb2', '#7896d6', '#ffc68c', 0, 0.85],
    [19.2, '#f4ae94', '#5868a8', '#ff8e6c', 0.18, 1],
    [20.2, '#8c84ba', '#283272', '#9c6a92', 0.62, 0.3],
    [21.5, '#4a5492', '#0c1238', '#2a3062', 0.95, 0],
    [24, '#3c4884', '#060a1e', '#1a2448', 1, 0]
  ].map(function (k) { return [k[0], rgbn(k[1]), rgbn(k[2]), rgbn(k[3]), k[4], k[5]]; });
  // the hour's colours dressed for the season and the weather (Look Book 2's LB.sky)
  var DRESS = { rain: ['#9aa6b8', '#3a4468', 0.55, '#5a6478', '#8a94a4', 0.65], fog: ['#c6ccd6', '#4a5470', 0.4, '#aab2c0', '#d0d4da', 0.6],
                snow: ['#cfd8ec', '#4c5884', 0.35, '#a8b4cc', '#dce2ee', 0.6] };
  function dress(P, M) {
    var amb = P.amb, top = P.skyTop, hor = P.skyHor;
    if (M.season === 'winter') amb = mixv(amb, rgbn('#dde6ff'), 0.14);
    else if (M.season === 'autumn') amb = mixv(amb, rgbn('#ffe2b8'), 0.08);
    var W = DRESS[M.wx], k = M.wk || 0;
    if (W && k > 0) {
      amb = mixv(amb, mixv(rgbn(W[0]), rgbn(W[1]), P.night), W[2] * k);
      top = mixv(top, rgbn(W[3]), W[5] * k); hor = mixv(hor, rgbn(W[4]), W[5] * k);
    }
    return { amb: amb, skyTop: top, skyHor: hor, night: P.night, golden: P.golden };
  }
  function palette(h) {
    h = ((h % 24) + 24) % 24;
    var i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
    var a = KEYS[i], b = KEYS[i + 1], f = (h - a[0]) / (b[0] - a[0]);
    return { amb: mixv(a[1], b[1], f), skyTop: mixv(a[2], b[2], f), skyHor: mixv(a[3], b[3], f), night: lerp(a[4], b[4], f), golden: lerp(a[5], b[5], f) };
  }

  // the weathers as the light sees them
  var WX = { fair: 'clear', breezy: 'clear', clear: 'clear', heat: 'clear', starfall: 'clear', blackout: 'clear',
             cloudy: 'cloud', gale: 'cloud', rain: 'rain', storm: 'rain', fog: 'fog', mist: 'fog', smog: 'fog',
             snow: 'snow', blizzard: 'snow' };

  /** Where the sun is at a scene now, on the 24-hour face, with its season and weather. */
  function moment(id) {
    var out = { h: 12, u: 0.5, up: true, season: null, frac: 0.6, planet: null, wx: 'clear', wk: 0 };
    if (typeof BridgeClock !== 'undefined') {
      var k = BridgeClock.sky(id);
      out.planet = k.planet;
      if (k.cycles && k.len) {
        var x = k.t / k.len;
        var rise = k.sunrise == null ? 0 : k.sunrise / k.len, set = k.sunset == null ? 1 : k.sunset / k.len;
        if (x >= rise && x <= set) { out.u = (x - rise) / Math.max(1e-6, set - rise); out.h = 6 + 13.6 * out.u; }
        else { out.up = false; var n = ((x - set) % 1 + 1) % 1; out.h = 19.6 + 10.4 * n / Math.max(1e-6, 1 - (set - rise)); }
        if (k.sun < 0.02 && out.up) { out.up = false; out.h = out.u < 0.5 ? 5.9 : 19.7; }    // a place that never sees the sun
      } else if (!k.cycles) { out.h = k.sun > 0.5 ? 12 : 0; out.up = k.sun > 0.5; }
    }
    if (typeof BridgeFoliage !== 'undefined') {
      var s = BridgeFoliage.season(id);
      if (s) { out.season = s.id; out.frac = s.frac == null ? 0.6 : s.frac; }
    }
    if (typeof BridgeWeather !== 'undefined') {
      var w = BridgeWeather.here(id);
      if (w && w.k > 0.15) { out.wx = WX[w.kind] || 'clear'; out.wk = w.k; }
    }
    if (forced) {
      if (forced.hour != null) { out.h = forced.hour; out.up = out.h > 6 && out.h < 19.6; out.u = clamp((out.h - 6) / 13.6, 0, 1); }
      if (forced.season !== undefined) out.season = forced.season;
      if (forced.weather) { out.wx = forced.weather; out.wk = 1; }
    }
    return out;
  }

  /** The light for a moment, as the compose wants it. */
  function light(sc, M) {
    var P = dress(palette(M.h), M), night = P.night, golden = P.golden * (M.wx === 'clear' ? 1 : M.wx === 'cloud' ? 0.5 : 0.3);
    var elev = M.up ? Math.sin(Math.PI * M.u) : 0;
    var wSun = { clear: 1, cloud: 0.45, rain: 0.1, fog: 0.28, snow: 0.3 }[M.wx] || 1;
    wSun = lerp(1, wSun, M.wk);
    var sun = clamp(elev * 4.5, 0, 1) * wSun * 1.3;
    var sunC = mixv(rgbn('#fff4e4'), rgbn('#ffc27e'), golden);
    if (elev < 0.25 && M.up) sunC = mixv(sunC, rgbn('#ff9a6c'), clamp((0.25 - elev) * 4, 0, 1) * golden);
    var us = sc.meta.lit.suns, i0 = 0, i1 = 0, f = 0;
    if (M.u <= us[0]) { i0 = i1 = 0; } else if (M.u >= us[us.length - 1]) { i0 = i1 = us.length - 1; } else {
      while (i0 < us.length - 2 && us[i0 + 1] <= M.u) i0++;
      i1 = i0 + 1; f = (M.u - us[i0]) / (us[i1] - us[i0]); f = f * f * (3 - 2 * f);
    }
    var skyC = mixv(mixv(P.skyTop, P.skyHor, 0.45), [1, 1, 1], 0.55 * (1 - night));
    var sky = lerp(0.62, 0.16, night);
    if (M.wx !== 'clear') {
      var k = M.wk;
      sky *= lerp(1, lerp(1.35, 1.1, night), k);
      skyC = mixv(skyC, mixv(rgbn('#c4ccd8'), rgbn('#3c4670'), night), 0.6 * k);
    }
    if (M.season === 'winter' || M.wx === 'snow') sky *= 1.08;
    var n = luma(skyC) || 1;
    skyC = [skyC[0] / n, skyC[1] / n, skyC[2] / n];
    var moon = night * (M.wx === 'clear' ? 0.26 : 0.08), moonC = rgbn('#a6b6ff');
    var lamp = lerp(0.12, 1.15, smooth(0.15, 0.75, night)) * (M.wx === 'clear' ? 1 : 1.1);
    var glow = lerp(0.05, 1, smooth(0.1, 0.7, night));
    var snowy = M.planet === 'verdance' && M.season === 'winter' ? 1 : M.wx === 'snow' && M.planet !== 'hoarfell' ? 0.55 * M.wk : 0;
    return { M: M, P: P, sun: sun, sunC: sunC, i0: i0, i1: i1, f: f, sky: sky, skyC: skyC, moon: moon, moonC: moonC,
             lamp: lamp, glow: glow, night: night, golden: golden, elev: elev, snow: snowy,
             wet: M.wx === 'rain' ? M.wk : 0,
             key: [Math.round(M.h * 20), M.wx, Math.round(M.wk * 5), M.season, Math.round(M.frac * 10), snowy > 0.5].join('|') };
  }

  // ---- loading ----
  function pixels(img) {
    var c = canvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, img.width, img.height).data;
  }
  function loadImg(src, cb) { var i = new Image(); i.onload = function () { cb(i); }; i.onerror = function () { cb(null); }; i.src = src; }
  var PASSES = ['lit_albedo', 'lit_a', 'lit_b', 'lit_c', 'lit_d'];

  function load(sc) {
    var m = sc.meta;
    if (!m.lit || (sc.lit && !sc.lit.dropped)) return;
    var old = sc.lit;
    var L = sc.lit = { ready: false, base: {}, cur: null, prev: null, fadeAt: 0, use: old ? old.use : [], masks: old ? old.masks : [], comps: 0 };
    var dir = '/bridge/assets/scenes/' + sc.id + '/', x = sc.ext || '.webp', q = sc.q || '';
    var pending = 1;
    function done() { if (--pending === 0) { L.ready = true; build(sc); } }
    function want(path, cb, raw) {
      pending++;
      loadImg(path + x + q, function (img) { cb(img ? (raw ? img : pixels(img)) : null); done(); });
    }
    PASSES.forEach(function (n) { want(dir + n, function (px) { L.base[n] = px; }); });
    if (m.lit.lamps) want(dir + 'lit_lamps', function (px) { L.base.lit_lamps = px; });
    if (m.glow) want(dir + 'glow', function (px) { L.base.glow = px; });
    if (m.lit.refl) want(dir + 'lit_refl', function (img) { L.refl = img; }, true);
    if (m.lit.reflGlow) want(dir + 'lit_reflglow', function (img) { L.reflglow = img; }, true);
    sc.layers.forEach(function (ly) {
      if (!ly.box.lit || ly.standIn) return;
      var d = dir + 'layers/' + ly.slot + '/' + ly.key + '/', got = ly.lit = {};
      PASSES.forEach(function (n) { want(d + n, function (px) { got[n] = px; }); });
      if (ly.box.litLamps) want(d + 'lit_lamps', function (px) { got.lit_lamps = px; });
      if (ly.box.glow) want(d + 'glow', function (px) { got.glow = px; });
    });
    done();
  }

  /** The decor chosen (js/scene.js composite): which layers show, and where each wins over the scene (masks). */
  function layers(sc, use, masks) {
    if (!sc.lit) return;
    sc.lit.use = use || [];
    sc.lit.masks = masks || [];
    if (sc.lit.ready) build(sc);
  }

  // the passes with the chosen decor over them, and the still water worked out from them
  function build(sc) {
    var L = sc.lit, m = sc.meta, W = m.width, H = m.height, B = L.base;
    if (!B.lit_albedo || !B.lit_a || !B.lit_b || !B.lit_c || !B.lit_d) { L.broken = true; return; }
    var use = [], masks = [];
    L.use.forEach(function (ly, n) {
      var lit = ly.lit || (ly.from && ly.from.lit);
      if (lit && lit.lit_albedo) { use.push({ ly: ly, lit: lit }); masks.push(L.masks[n]); }
    });
    var G = { w: W, h: H };
    ['lit_albedo', 'lit_a', 'lit_b', 'lit_c', 'lit_d', 'lit_lamps', 'glow'].forEach(function (n) {
      var any = B[n] || use.some(function (u) { return u.lit[n]; });
      if (!any) { G[n] = null; return; }
      if (!use.length) { G[n] = B[n]; return; }
      var a = B[n] ? new Uint8ClampedArray(B[n]) : new Uint8ClampedArray(W * H * 4);
      use.forEach(function (u, k) {
        var b = u.ly.box, mask = masks[k], px = u.lit[n];
        if (!mask) return;
        for (var li = 0; li < mask.length; li++) {
          if (!mask[li]) continue;
          var gi = ((b.y + Math.floor(li / b.w)) * W + b.x + li % b.w) * 4, si = li * 4;
          if (px) { a[gi] = px[si]; a[gi + 1] = px[si + 1]; a[gi + 2] = px[si + 2]; a[gi + 3] = px[si + 3]; }
          else { a[gi] = a[gi + 1] = a[gi + 2] = 0; a[gi + 3] = n === 'lit_albedo' ? 255 : 0; }
        }
      });
      G[n] = a;
    });
    var N = W * H, hs = new Uint8Array(N);
    for (var i = 0; i < N; i++) hs[i] = Math.floor(hash(i % W, (i / W) | 0, 17) * 255);
    G.hash = hs;
    waterPrep(G);
    fallPrep(G);
    L.G = G;
    L.key = null;                                      // compose again
  }

  // ---- still water: distance from the shore, depth bands, the far shore's line, points for the shimmer ----
  // falling water (flag 64: parts named waterfall, falls, cascade, weir): each fall's columns, top to foot
  function fallPrep(G) {
    var w = G.w, h = G.h, C = G.lit_c, cols = {}, x, y;
    G.falls = [];
    if (!C) return;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (!(C[(y * w + x) * 4 + 2] & 64)) continue;
      var c = cols[x] || (cols[x] = [y, y]);
      if (y > c[1]) c[1] = y;
    }
    var xs = Object.keys(cols).map(Number).sort(function (a, b) { return a - b; }), cur = null;
    xs.forEach(function (xx) {
      if (!cur || xx > cur.x1 + 1) { cur = { x0: xx, x1: xx, foot: 0, cols: [] }; G.falls.push(cur); }
      cur.x1 = xx; cur.cols.push([xx, cols[xx][0], cols[xx][1]]); cur.foot = Math.max(cur.foot, cols[xx][1]);
    });
  }
  // light running down each fall and foam churning where it lands (Look Book 2's waterfall); in a hard frost only a
  // thread down the middle still runs
  function falls(ctx, G, Lt, X, Y, v, t, a) {
    var frozen = Lt.snow >= 1, night = Lt.night > 0.6, hi = night ? '#a8b8e0' : '#ffffff', mid = night ? '#6c80b4' : '#cfeaf2';
    for (var f = 0; f < G.falls.length; f++) {
      var F = G.falls[f], cx = (F.x0 + F.x1) / 2, half = (F.x1 - F.x0 + 1) * 0.18;
      if (F.x1 < v[0] || F.x0 > v[0] + v[2] || F.foot < v[1]) continue;
      for (var pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? hi : mid; ctx.globalAlpha = 0.75 * a;
        for (var k = 0; k < F.cols.length; k++) {
          var c = F.cols[k], x = c[0];
          if (frozen && Math.abs(x - cx) > half) continue;
          var sp = 55 + hash(x, 0, 1) * 30, L = Math.round(3 + hash(x, 1, 1) * 5);
          for (var y = c[1]; y <= c[2]; y++) {
            var hv = hash(x, Math.floor((y - t * sp) / L), 77);
            if (hv > 0.78 && (hv > 0.93) === !!pass) ctx.fillRect(X + x, Y + y, 1, 1);
          }
        }
      }
      if (frozen) continue;
      ctx.fillStyle = hi;
      for (var n = 0; n < 14; n++) {
        var ph = hash(n + f * 31, 3, 5), u = (t * 1.6 + ph * 7) % 1;
        ctx.globalAlpha = a * (1 - u) * 0.8;
        ctx.fillRect(X + Math.round(F.x0 - 3 + hash(n + f * 31, 4, 5) * (F.x1 - F.x0 + 6)), Y + Math.round(F.foot - u * 4), 1, 1);
      }
    }
  }

  function waterPrep(G) {
    var w = G.w, h = G.h, N = w * h, C = G.lit_c, A = G.lit_albedo;
    var x0 = w, x1 = -1, y0 = h, y1 = -1, x, y, i;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (C[(y * w + x) * 4 + 2] & 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) { G.water = false; return; }
    G.water = true;
    // a box round the water with room for the lap line and the far bank's mirror
    var bx0 = Math.max(0, x0 - 2), by0 = Math.max(0, y0 - 2), bx1 = Math.min(w - 1, x1 + 2), by1 = Math.min(h - 1, y1 + 2);
    var bw = bx1 - bx0 + 1, bh = by1 - by0 + 1, BN = bw * bh;
    G.wBox = [bx0, by0, bw, bh];
    function isW(bi) { var gx = bx0 + bi % bw, gy = by0 + ((bi / bw) | 0); return (C[(gy * w + gx) * 4 + 2] & 8) !== 0; }
    var D = new Float32Array(BN);
    for (i = 0; i < BN; i++) {
      var gx = bx0 + i % bw, gy = by0 + ((i / bw) | 0), gi = (gy * w + gx) * 4;
      D[i] = isW(i) ? 1e6 : (A[gi + 3] < 8 || (C[gi + 2] & 16)) ? 0 : 1e6;       // things standing in the water don't make a shore
    }
    function pass(xs, ys, dx, dy) {
      for (var yy = ys[0]; yy !== ys[1]; yy += ys[2]) for (var xx = xs[0]; xx !== xs[1]; xx += xs[2]) {
        var k = yy * bw + xx; if (D[k] === 0) continue;
        var v = D[k], nx = xx + dx, ny = yy + dy;
        if (nx >= 0 && nx < bw) v = Math.min(v, D[yy * bw + nx] + 1);
        if (ny >= 0 && ny < bh) v = Math.min(v, D[ny * bw + xx] + 1);
        if (nx >= 0 && nx < bw && ny >= 0 && ny < bh) v = Math.min(v, D[ny * bw + nx] + 1.414);
        D[k] = v;
      }
    }
    pass([0, bw, 1], [0, bh, 1], -1, -1);
    pass([bw - 1, -1, -1], [bh - 1, -1, -1], 1, 1);
    pass([bw - 1, -1, -1], [0, bh, 1], 1, -1);
    pass([0, bw, 1], [bh - 1, -1, -1], -1, 1);
    // depth bands, once: shelves and hollows a few tiles across over the distance from the shore (not rings)
    var band = new Uint8Array(BN);
    for (i = 0; i < BN; i++) {
      if (!isW(i)) continue;
      var px = bx0 + i % bw, py = by0 + ((i / bw) | 0), dist = D[i];
      var big = fbm(px * 0.022, py * 0.034, 61, 3);
      var dep = clamp(dist / 36, 0, 1) * 0.62 + (big - 0.5) * 0.62 + (noise(px * 0.09, py * 0.14, 6) - 0.5) * 0.1 + 0.18;
      band[i] = dist < 1.6 ? 0 : dep < 0.3 ? 1 : dep < 0.58 ? 2 : 3;
    }
    // the lap line: water touching land on the near side (below it)
    var shore = [];
    for (i = 0; i < BN - bw; i++) {
      if (isW(i) && D[i] > 0 && D[i] <= 1.5 && !isW(i + bw)) {
        var sg = ((by0 + ((i / bw) | 0) + 1) * w + bx0 + i % bw) * 4;
        if (C[sg + 2] & 16) shore.push([bx0 + i % bw, by0 + ((i / bw) | 0)]);
      }
    }
    // ice cracks for a frozen pond: a few wandering lines
    var crack = new Uint8Array(BN), r = rng(77), nc = Math.max(3, Math.round(BN / 9000)), wpts = [];
    for (i = 0; i < BN; i += 7) if (isW(i)) wpts.push(i);
    for (var c = 0; c < nc && wpts.length; c++) {
      var st = wpts[Math.floor(r() * wpts.length)], cx = st % bw, cy = (st / bw) | 0, a = r() * Math.PI * 2;
      for (var s = 0; s < 40 + r() * 60; s++) {
        a += (r() - 0.5) * 0.9; cx += Math.cos(a); cy += Math.sin(a) * 0.6;
        var ci = Math.round(cy) * bw + Math.round(cx);
        if (ci < 0 || ci >= BN || !isW(ci)) break;
        crack[ci] = 1;
      }
    }
    // the far shore of each column: where its water starts, smoothed so a reed on the bank doesn't notch the mirror
    var top = new Int32Array(bw).fill(-1);
    for (x = 0; x < bw; x++) for (y = 0; y < bh; y++) if (isW(y * bw + x)) { top[x] = by0 + y; break; }
    var sm = new Int32Array(bw);
    for (x = 0; x < bw; x++) {
      var best = top[x];
      for (var d = -2; d <= 2; d++) { var t2 = top[Math.min(bw - 1, Math.max(0, x + d))]; if (t2 >= 0 && best >= 0) best = Math.min(best, t2); }
      sm[x] = best;
    }
    var fade = canvas(bw, bh), fc = fade.getContext('2d'), fd = fc.createImageData(bw, bh);
    for (x = 0; x < bw; x++) {
      if (sm[x] < 0) continue;
      for (y = sm[x] - by0; y < bh; y++) fd.data[(y * bw + x) * 4 + 3] = clamp(255 * (1 - (y - (sm[x] - by0)) / 46) + 30, 0, 255);
    }
    fc.putImageData(fd, 0, 0);
    function pts(n, seed) {
      var rr = rng(seed), out = [];
      for (var t = 0; out.length < n && t < n * 60; t++) {
        var k = Math.floor(rr() * BN);
        if (isW(k)) out.push([bx0 + k % bw, by0 + ((k / bw) | 0), rr()]);
      }
      return out;
    }
    // as many as the Look Book had for its water (the farm pond: 11,211 px of water, 144 glints, 46 dashes, 40 stars,
    // 3 fish rising, 28 places for rain to ring)
    var wpx = 0;
    for (i = 0; i < BN; i++) if (isW(i)) wpx++;
    G.wDist = D; G.wBand = band; G.wShore = shore; G.wCrack = crack; G.wTop = sm; G.wFade = fade;
    G.shimPts = pts(Math.round(12 + wpx * 0.003), 6);
    G.starPts = pts(Math.round(wpx / 280), 8);
    G.glintPts = pts(Math.round(wpx / 78), 5);
    G.fishPts = pts(Math.max(3, Math.round(wpx / 3700)), 9);
    G.ringPts = pts(Math.round(wpx / 400) + 2, 9);
    G.wIsW = isW;
  }

  // ---- the composition ----
  var AUTUMN = ['#d8762e', '#bb4430', '#dcac3c', '#c85a2a', '#e09a34', '#a83a24'].map(rgbn);
  var WATER = [['#7e9c80', 0.08], ['#3e8a8a', 0.18], ['#2f7488', 0.2], ['#265e80', 0.22]];
  var ICE = ['#86a8c4', '#a6c4da', '#c6dcec', '#e6f0f8'].map(rgbn);

  function begin(sc, Lt) {
    var L = sc.lit, G = L.G, W = G.w, H = G.h;
    if (!L.out || L.out.width !== W || L.out.height !== H) L.out = new ImageData(W, H);
    var tint = M_wx(Lt) === 'rain' ? rgbn('#6a7a86') : mixv(Lt.P.skyTop, Lt.P.skyHor, 0.2 + 0.12 * Lt.golden);
    var bands0 = WATER.map(function (wc) { return mixv(rgbn(wc[0]), tint, wc[1] + 0.04 * Lt.golden); });
    var bands = bands0.map(function (c) { return mixv(c, bands0[2], 0.75 * Lt.night); });
    var flat = [];
    bands.forEach(function (c) { flat.push(c[0], c[1], c[2]); });
    var amb = Lt.P.amb;
    var job = {
      sc: sc, G: G, Lt: Lt, y: 0, out: L.out.data,
      open: G.water ? new Uint8Array(G.wBox[2] * G.wBox[3]) : null,
      wb: new Float32Array(flat),
      wl: [0.55 + 0.45 * amb[0], 0.55 + 0.45 * amb[1], 0.55 + 0.45 * amb[2]],
      t0: performance.now()
    };
    if (Lt.M.planet === 'hoarfell') job.hf = hoarfell(G, Lt);
    return job;
  }

  // ---- Hoarfell: the snow coloured by the hour (Look Book 2's Hoarfell tarn, _claude_docs/lookbook2/scenes/hoarfell.js)
  // Snow is shaded from the light passes alone: the sun's share of the light decides lit or shade (measured against the
  // best-lit snow this hour, so a low dawn or evening sun still reads as lit), the sky pass gives the hollows, the hour
  // gives the colours — pink-gold where the sun lands at either end of the day, a cool blue-grey in the shade, white and
  // blue at noon, blue under the lamps at night. The snow keeps its own tones as flat steps (a piste's corduroy in two,
  // powder a touch cooler); a trodden lane is a step darker and cooler; ice (pale, or blue-green) leans the same colours
  // toward blue — grey-blue rock is rock. Everything else keeps its colours with a warm lean where the sun lands and a
  // cool one in the shade.
  var ICE_LIT = rgbn('#c4e2f2'), ICE_SH = rgbn('#6c90b6');
  function snowAt(A, F, p) {                           // the snow's own lightness at a pixel (0: not snow)
    var ar = A[p], ag = A[p + 1], ab = A[p + 2], al = 0.3 * ar + 0.59 * ag + 0.11 * ab;
    if (al < 195 || Math.max(ar, ag, ab) - Math.min(ar, ag, ab) > 46) return 0;    // pale rock stays rock
    var f = F[p + 2];
    if (f & 8) return 0;                                                          // the open water
    if (f & 48) return ab - ar > 22 ? 0 : al;                                     // the ground and the roofs (ice is bluer: ice)
    return ab - ar < 20 ? al : 0;                                                 // white things on objects, not the bluish ice
  }
  function iceAt(A, p) {                               // pale bluish ice, or darker blue-green ice (grey-blue rock isn't)
    var ar = A[p], ag = A[p + 1], ab = A[p + 2], al = 0.3 * ar + 0.59 * ag + 0.11 * ab;
    return ab - ar > 18 && al > 120 && (al >= 180 || ag - ar > 14);
  }
  function shareAt(G, Lt, p) {                         // the sun's share of the light at a pixel
    var i0 = Lt.i0, i1 = Lt.i1;
    function sunP(i) { return i < 2 ? G.lit_a[p + i + 1] : i < 5 ? G.lit_b[p + i - 2] : G.lit_c[p]; }
    var a0 = DEC[sunP(i0)], a1 = DEC[sunP(i1)], sunL = (a0 + (a1 - a0) * Lt.f) * Lt.sun, sk = DEC[G.lit_a[p]], mo = DEC[G.lit_b[p]] * Lt.moon;
    var Lr = Lt.sky * Lt.skyC[0] * sk + Lt.sunC[0] * sunL + Lt.moonC[0] * mo, Lg = Lt.sky * Lt.skyC[1] * sk + Lt.sunC[1] * sunL + Lt.moonC[1] * mo;
    var Lb = Lt.sky * Lt.skyC[2] * sk + Lt.sunC[2] * sunL + Lt.moonC[2] * mo;
    if (G.lit_lamps) { var k = Lt.lamp * 0.8; Lr += DEC[G.lit_lamps[p]] * k; Lg += DEC[G.lit_lamps[p + 1]] * k; Lb += DEC[G.lit_lamps[p + 2]] * k; }
    return Math.min(1, sunL / (0.2126 * Lr + 0.7152 * Lg + 0.0722 * Lb + 1e-5));
  }
  function hoarfell(G, Lt) {
    var A = G.lit_albedo, F = G.lit_c, N = G.w * G.h, i;
    if (!G.snow) {                                     // which pixels are snow, how light fresh snow is, a sample for the light
      var sn = new Uint8Array(N), sum = 0, n = 0, bright = [];
      for (i = 0; i < N; i++) {
        var al = snowAt(A, F, i * 4);
        sn[i] = al;
        if (al > 190) { sum += al; n++; }
        if (al > 200) bright.push(i);
      }
      var step = Math.max(1, Math.ceil(bright.length / 40000)), ref = n ? sum / n : 230;
      // each snow pixel's own tone against fresh snow, a quarter stronger (sunlit snow is near white, so the paint's own
      // steps would hardly show), in flat steps of 0.02 from 0.9 to 1.06 — the tones within a shade of fresh snow are
      // fresh snow — stored as 1 + step + 9 x how much bluer than the palette's snow it is; a trodden lane, under 0.92
      // of fresh snow, is 255
      for (i = 0; i < N; i++) {
        if (!sn[i]) continue;
        var q = sn[i] / ref, p4 = i * 4, d = q - 1;
        if (q < 0.92) { sn[i] = 255; continue; }
        d = Math.abs(d) < 0.012 ? 0 : d * 1.25;
        sn[i] = 1 + Math.round(clamp(1 + d, 0.9, 1.06) * 50) - 45 + 9 * clamp(A[p4 + 2] - A[p4] - 14, 0, 8);
      }
      G.snow = sn; G.snowRef = ref;
      G.snowSample = bright.filter(function (v, k) { return k % step === 0; });
    }
    // the best-lit snow this hour (the 95th percentile of the sun's share)
    var hist = new Uint32Array(256), ns = G.snowSample.length;
    for (i = 0; i < ns; i++) hist[Math.round(shareAt(G, Lt, G.snowSample[i] * 4) * 255)]++;
    var acc = 0, p95 = 255;
    for (var v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= ns * 0.05) { p95 = v; break; } }
    // the colours by the hour
    var M = Lt.M, t = M.h, gold = Lt.golden, night = Lt.night, wk = M.wx === 'clear' ? 0 : M.wk;
    var late = clamp((t - 18.6) / 0.8, 0, 1);
    var goldLit = t < 12 ? rgbn('#ffd0d2') : mixv(rgbn('#ffdcbc'), rgbn('#ffaa9c'), late);
    var goldSh = t < 12 ? rgbn('#b0bad8') : mixv(rgbn('#adb8d8'), rgbn('#96a0c8'), late);
    var lit = mixv(rgbn('#fbfcff'), goldLit, gold), sh = mixv(rgbn('#bcc8e8'), goldSh, gold);
    lit = mixv(lit, rgbn('#8494d6'), night); sh = mixv(sh, rgbn('#3c4584'), night);
    if (wk > 0) {
      var grey = mixv(rgbn('#dfe3ec'), rgbn('#4a5280'), night);
      lit = mixv(lit, grey, 0.65 * wk); sh = mixv(sh, mixv(grey, rgbn('#9aa2c4'), 0.5 * (1 - night)), 0.5 * wk);
    }
    return { lit: lit, sh: sh, iceLit: mixv(lit, ICE_LIT, 0.45), iceSh: mixv(sh, ICE_SH, 0.42), norm: Math.max(40, p95) / 255,
             sunUp: t > 6.2 && t < 19.6 ? 1 : 0, wf: lerp(1, 0.35, wk), gold: gold, day: 1 - night };
  }
  function M_wx(Lt) { return Lt.M.wx; }

  // rows [y0, y1) of the composition
  function rows(job, y0, y1) {
    var G = job.G, Lt = job.Lt, M = Lt.M, W = G.w, o = job.out;
    var A = G.lit_albedo, Pa = G.lit_a, Pb = G.lit_b, Pc = G.lit_c, Pd = G.lit_d, LP = G.lit_lamps, GL = G.glow, HS = G.hash;
    // the two sun passes now: index i lives in lit_a G/B (0, 1), lit_b R/G/B (2-4), lit_c R (5)
    function src(i) { return i < 2 ? [Pa, i + 1] : i < 5 ? [Pb, i - 2] : [Pc, 0]; }
    var s0 = src(Lt.i0), s1 = src(Lt.i1), S0 = s0[0], c0 = s0[1], S1 = s1[0], c1 = s1[1], f = Lt.f;
    var sky = Lt.sky, k0 = Lt.skyC[0] * sky, k1 = Lt.skyC[1] * sky, k2 = Lt.skyC[2] * sky;
    var sun = Lt.sun, sC0 = Lt.sunC[0], sC1 = Lt.sunC[1], sC2 = Lt.sunC[2];
    var moon = Lt.moon, mC0 = Lt.moonC[0], mC1 = Lt.moonC[1], mC2 = Lt.moonC[2];
    var lamp = Lt.lamp * 0.8, glow = Lt.glow, night = Lt.night;
    var hf = job.hf, season = hf ? null : M.season, frac = M.frac, verd = M.planet === 'verdance';
    var snow = Lt.snow, snowZ = snow >= 1 ? 0.5 : 0.82, wet = Lt.wet;
    var wb = job.wb, wl = job.wl, open = job.open, box = G.wBox;
    var wB = clamp(lerp(1.0, 0.36, night) * (M.wx === 'clear' ? 1 : 0.88) * (1 + 0.08 * Lt.golden), 0, 1.2);
    var turned = 0.3 + 0.7 * frac;
    for (var y = y0; y < y1; y++) {
      for (var x = 0, i = y * W; x < W; x++, i++) {
        var p = i * 4, al = A[p + 3];
        if (al < 8) { o[p + 3] = 0; continue; }
        var fl = Pc[p + 2], tree = Pd[p], line = Pd[p + 1] / 255, hs = HS[i];
        var ar = A[p] / 255, ag = A[p + 1] / 255, ab = A[p + 2] / 255, l;
        var nz = Pc[p + 1] / 255 * 2 - 1;
        // the seasons on the flat colours
        if (season && season !== 'summer' && (fl & 5)) {
          if (fl & 4) {                                                  // grass
            if (season === 'spring') { ar *= 1.06; ag *= 1.1; ab *= 0.82; }
            else if (season === 'autumn') { l = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab; ar += (l * 1.3 - ar) * 0.5; ag += (l * 1.12 - ag) * 0.5; ab += (l * 0.55 - ab) * 0.5; }
            else if (season === 'winter') {
              l = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab;
              if (verd) { ar += (l * 1.05 - ar) * 0.6; ag += (l - ag) * 0.6; ab += (l * 0.9 - ab) * 0.6; }
              else { ar += (l * 1.02 - ar) * 0.5; ag += (l * 0.97 - ag) * 0.5; ab += (l * 0.74 - ab) * 0.5; ar *= 0.9; ag *= 0.9; ab *= 0.9; }   // dormant: olive and tan
            }
          } else if (fl & 1) {                                           // a leafy tree's leaves
            var tv = ((tree * 7919) % 13) / 13;
            if (season === 'spring') {
              if (tv < 0.35 && hs < 40) { if (hs < 14) { ar = 1; ag = 0.94; ab = 0.96; } else { ar = 0.96; ag = 0.71; ab = 0.78; } }
              else { ar *= 1.12; ag *= 1.12; ab *= 0.8; }
            } else if (season === 'autumn' && hash(tree, 3, 9) < turned) {
              var pc = AUTUMN[Math.floor(tv * AUTUMN.length) % AUTUMN.length], k = (0.2126 * ar + 0.7152 * ag + 0.0722 * ab) / luma(pc) * 1.25;
              ar = pc[0] * k; ag = pc[1] * k; ab = pc[2] * k;
              if (hs < 22) { var p2 = AUTUMN[(Math.floor(tv * 6) + 2) % 6]; ar += (p2[0] - ar) * 0.6; ag += (p2[1] - ag) * 0.6; ab += (p2[2] - ab) * 0.6; }
            } else if (season === 'winter') {
              l = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab;
              ar = l * 0.95 + 0.06; ag = l * 0.82 + 0.04; ab = l * 0.78 + 0.05;    // bare: twigs and the last brown leaves
            }
          }
        }
        // snow lies on what faces up (not on water; foliage only on its flattest tops, in patches)
        var snowy = false;
        if (snow >= 1 && (fl & 20) && !(fl & 8) && nz <= snowZ) {
          if (hs < 18) { ar = 0.78; ag = 0.72; ab = 0.56; }
          else { var sv = 0.88 + (hs & 15) / 170; ar = sv * 0.96; ag = sv * 0.975; ab = sv; snowy = true; }
        } else if (snow > 0 && !(fl & 8) && nz > ((fl & 3) ? 0.78 : snowZ) - (hs / 255) * 0.12 && (!(fl & 3) || hs < 150)) {
          var sv2 = 0.9 + (hs & 15) / 160; ar = sv2 * 0.97; ag = sv2 * 0.985; ab = sv2; snowy = true;
        }
        var water = false;
        if (fl & 8) {
          water = true;
          var bi = box ? (y - box[1]) * box[2] + (x - box[0]) : -1, band = bi >= 0 ? G.wBand[bi] : 2, dist = bi >= 0 ? G.wDist[bi] : 20;
          ar = wb[band * 3]; ag = wb[band * 3 + 1]; ab = wb[band * 3 + 2];
          var iced = false;
          if (snow >= 1) {
            var iw = 6 + noise(x * 0.06, y * 0.06, 8) * 12;
            if (dist < iw) {
              iced = true;
              var nn = noise(x * 0.2, y * 0.3, 9), ic = dist < 2 ? ICE[3] : nn > 0.62 ? ICE[3] : nn > 0.4 ? ICE[2] : ICE[1];
              if (dist > iw - 1.2 || hash(x >> 1, y >> 1, 7) > 0.97 || G.wCrack[bi]) ic = ICE[0];
              ar = ic[0]; ag = ic[1]; ab = ic[2];
            }
          }
          if (!iced && bi >= 0) open[bi] = 255;
        }
        if (wet && !(fl & 8) && (fl & 16)) { ar *= 1 - 0.18 * wet; ag *= 1 - 0.16 * wet; ab *= 1 - 0.1 * wet; }
        // the light
        var skyL = DEC[Pa[p]];
        var sa = DEC[S0[p + c0]], sb = DEC[S1[p + c1]];
        var sunL = (sa + (sb - sa) * f) * sun;
        var moonL = DEC[Pb[p]] * moon;
        var Lr = k0 * skyL + sC0 * sunL + mC0 * moonL, Lg = k1 * skyL + sC1 * sunL + mC1 * moonL, Lb = k2 * skyL + sC2 * sunL + mC2 * moonL;
        if (LP) { Lr += DEC[LP[p]] * lamp; Lg += DEC[LP[p + 1]] * lamp; Lb += DEC[LP[p + 2]] * lamp; }
        var lum = 0.2126 * Lr + 0.7152 * Lg + 0.0722 * Lb + 1e-5;
        var b;
        if (water) b = wB;
        else {
          b = 1.1 * (1 - Math.exp(-lum));
          b = b >= 0.8 ? 1.0 : b >= 0.55 ? 0.78 : b >= 0.3 ? 0.52 : 0.3;      // the toy finish: four flat bands
        }
        var r, g, bl;
        if (water) {
          r = ar * b * wl[0]; g = ag * b * wl[1]; bl = ab * b * wl[2];
        } else {
          // the light's colour, kept partly (warm sun, blue moon, gold lamps); shadows cool, the brightest light warm
          var cr = 1 + (Lr / lum - 1) * 0.7, cg = 1 + (Lg / lum - 1) * 0.7, cb = 1 + (Lb / lum - 1) * 0.7;
          r = ar * b * cr; g = ag * b * cg; bl = ab * b * cb;
          var sh = 1 - b;
          r *= 1 - sh * 0.22; g *= 1 - sh * 0.1; bl *= 1 + sh * 0.12;
          if (b > 0.85) { var wv = b - 0.85; r *= 1 + wv * 0.25; g *= 1 + wv * 0.1; }
          if (line > 0) {
            var lk = line * 0.95;
            if (snowy) { r *= 1 - lk * 0.3; g *= 1 - lk * 0.26; bl *= 1 - lk * 0.14; }
            else { r *= 1 - lk * 0.62; g *= 1 - lk * 0.6; bl *= 1 - lk * 0.5; }
          }
        }
        if (hf) {
          var share = Math.min(1, sunL / lum), sal = G.snow[i], lt = -1, hk;
          if (sal || (!(fl & 8) && iceAt(A, p))) {
            lt = smooth(0.3, 0.78, share / hf.norm) * hf.sunUp * (0.35 + 0.65 * hf.wf);
            lt = lt > 0.62 ? 1 : lt > 0.25 ? 0.5 : 0;
          }
          if (sal) {                                   // snow: its own tone or trodden, lit or in shade, the hollows a step down
            var rel = clamp(0.72 + 0.28 * skyL, 0.62, 1.04);
            rel = rel > 0.95 ? 1 : rel > 0.82 ? 0.9 : 0.78;
            var lane = sal === 255, sk2 = sal - 1, cool = lane ? 0 : (sk2 / 9) | 0;
            var tone = (lane ? 0.87 : (45 + sk2 % 9) / 50) * rel, HL = hf.lit, HS2 = hf.sh;
            r = (HS2[0] + (HL[0] - HS2[0]) * lt) * tone; g = (HS2[1] + (HL[1] - HS2[1]) * lt) * tone; bl = (HS2[2] + (HL[2] - HS2[2]) * lt) * tone;
            if (lane) { r *= 0.97; bl *= 1.03; }
            else if (cool) { r *= 1 - 0.003 * cool; bl *= 1 + 0.0035 * cool; }
            if (LP) { hk = Lt.lamp * 0.85; r += DEC[LP[p]] * hk * 0.9; g += DEC[LP[p + 1]] * hk * 0.8; bl += DEC[LP[p + 2]] * hk * 0.55; }
          } else if (lt >= 0) {                        // ice: the snow's colours leaned blue, its marks kept
            var mark = clamp((0.3 * A[p] + 0.59 * A[p + 1] + 0.11 * A[p + 2]) / 205, 0.62, 1.12), IL = hf.iceLit, IS = hf.iceSh;
            r = (IS[0] + (IL[0] - IS[0]) * lt) * mark; g = (IS[1] + (IL[1] - IS[1]) * lt) * mark; bl = (IS[2] + (IL[2] - IS[2]) * lt) * mark;
            if (LP) { hk = Lt.lamp * 0.6; r += DEC[LP[p]] * hk * 0.9; g += DEC[LP[p + 1]] * hk * 0.78; bl += DEC[LP[p + 2]] * hk * 0.59; }
          } else {                                     // the rest: warm where the sun lands, cool in the shade
            var s2 = share > 0.45 ? 1 : 0, kLit = s2 * (0.06 + 0.22 * hf.gold) * hf.day * hf.wf, kSh = (1 - s2) * (0.05 + 0.08 * hf.gold) * hf.day;
            r *= (1 + kLit * 0.9) * (1 - kSh * 0.18); g *= (1 + kLit * 0.55) * (1 - kSh * 0.22); bl *= (1 + kLit * 0.4) * (1 + kSh * 0.1);
          }
        }
        if (!water && GL && GL[p + 3]) { r += GL[p] / 255 * glow; g += GL[p + 1] / 255 * glow; bl += GL[p + 2] / 255 * glow; }
        o[p] = r * 255; o[p + 1] = g * 255; o[p + 2] = bl * 255; o[p + 3] = 255;
      }
    }
  }

  // the parts of a finished composition that stay with it: the open water, the far bank mirrored, the true mirror lit
  function finish(job) {
    var sc = job.sc, L = sc.lit, G = job.G, Lt = job.Lt;
    var c = L.prev && !fading(L) ? L.prev.canvas : canvas(G.w, G.h);
    if (c.width !== G.w || c.height !== G.h) c = canvas(G.w, G.h);
    c.getContext('2d').putImageData(L.out, 0, 0);
    var comp = { canvas: c, Lt: Lt, at: performance.now() };
    if (G.water) {
      var b = G.wBox, bw = b[2], bh = b[3];
      var om = canvas(bw, bh), oc = om.getContext('2d'), od = oc.createImageData(bw, bh);
      for (var i = 0; i < bw * bh; i++) od.data[i * 4 + 3] = job.open[i];
      oc.putImageData(od, 0, 0);
      comp.open = om; comp.openPx = job.open;
      // the far bank, upside down below the far shore of each column
      var mir = canvas(bw, bh), mc = mir.getContext('2d');
      for (var x = 0; x < bw; x++) {
        var s = G.wTop[x];
        if (s <= 0) continue;
        var len = Math.min(s, bh - (s - b[1]));
        if (len <= 0) continue;
        mc.save();
        mc.translate(0, 2 * (s - b[1])); mc.scale(1, -1);
        mc.drawImage(c, b[0] + x, s - len, 1, len, x, s - b[1] - len, 1, len);
        mc.restore();
      }
      mc.globalCompositeOperation = 'destination-in'; mc.drawImage(G.wFade, 0, 0);
      comp.mirror = mir;
      if (L.refl) {
        var rl = canvas(bw, bh), rc = rl.getContext('2d');
        rc.drawImage(L.refl, b[0], b[1], bw, bh, 0, 0, bw, bh);
        var kC = Lt.skyC, sC = Lt.sunC, ab = 1.1 * (1 - Math.exp(-(Lt.sky * 0.9 + Lt.sun * 0.55 + Lt.moon * 0.5))), den = Lt.sky + Lt.sun + 1e-4;
        rc.globalCompositeOperation = 'multiply';
        rc.fillStyle = css([clamp(ab * (Lt.sky * kC[0] + Lt.sun * sC[0]) / den, 0, 1), clamp(ab * (Lt.sky * kC[1] + Lt.sun * sC[1]) / den, 0, 1),
                            clamp(ab * (Lt.sky * kC[2] + Lt.sun * sC[2]) / den, 0, 1)]);
        rc.fillRect(0, 0, bw, bh);
        rc.globalCompositeOperation = 'destination-in';
        rc.drawImage(L.refl, b[0], b[1], bw, bh, 0, 0, bw, bh);
        comp.refl = rl;
      }
    }
    if (L.cur && fading(L)) L.fadeAt = 0;                 // a fade still going: let it finish at once
    L.prev = L.cur;
    L.cur = comp;
    L.fadeAt = performance.now();
    L.comps++;
    L.ms = performance.now() - job.t0;
  }
  function fading(L) { return L.fadeAt && performance.now() - L.fadeAt < FADE; }

  // ---- each frame ----
  var job = null;
  function step(sc) {
    var L = sc.lit;
    if (!L || !L.ready || L.broken || !L.G) return;
    var now = performance.now();
    if (job && job.sc !== sc) job = null;                       // gone somewhere else
    if (!job && (!L.checked || now - L.checked > 500 || L.key === null)) {
      L.checked = now;
      var Lt = light(sc, moment(sc.id));
      if (Lt.key !== L.key) { L.key = Lt.key; job = begin(sc, Lt); }
    }
    if (!job) return;
    var t0 = performance.now(), G = job.G, rowsAt = Math.max(4, Math.round(60000 / G.w));
    while (job.y < G.h) {
      var y1 = Math.min(G.h, job.y + rowsAt);
      rows(job, job.y, y1);
      job.y = y1;
      if (performance.now() - t0 > (L.cur ? BUDGET : BUDGET * 2)) break;
    }
    if (job.y >= G.h) { finish(job); job = null; }
  }

  // Only places being drawn keep their passes (a big outdoor scene's are ~100 MB decoded): one not drawn for KEEP ms
  // lets them go (they come back from the browser's cache if you return). Two drawn in the same frame both keep theirs.
  var lit = [], KEEP = 8000;
  function drop(sc) {
    var L = sc.lit;
    if (!L || L.dropped) return;
    sc.lit = { dropped: true, use: L.use, masks: L.masks };
    if (job && job.sc === sc) job = null;
  }

  /** What to draw for a scene this frame: { canvas, prev, a } (prev null: the baked states under it), or null. */
  function frame(sc) {
    if (!sc.lit) return null;
    var t = performance.now();
    sc.litSeen = t;
    if (lit.indexOf(sc) < 0) lit.push(sc);
    lit = lit.filter(function (o) {                    // what hasn't been drawn for a while lets its passes go
      if (o === sc || t - (o.litSeen || 0) < KEEP) return true;
      drop(o); return false;
    });
    if (sc.lit.dropped) { load(sc); return null; }
    step(sc);
    var L = sc.lit;
    if (!L.cur) return null;
    var a = L.fadeAt ? clamp((performance.now() - L.fadeAt) / FADE, 0, 1) : 1;
    if (a >= 1) L.prev = L.prev && L.prev.canvas === L.cur.canvas ? null : L.prev;
    return { canvas: L.cur.canvas, prev: a < 1 && L.prev ? L.prev.canvas : null, a: a };
  }

  // ---- the water, each frame ----
  var scratch = canvas(8, 8), sx = scratch.getContext('2d'), scratch2 = canvas(8, 8), sx2 = scratch2.getContext('2d');
  function ripple(dst, src, open, bw, bh, ry0, ry1, t, o) {
    var amp = o.amp, freq = o.freq, speed = o.speed;
    for (var y = ry0; y < ry1; y++) {
      var w = Math.sin(y * freq + t * speed) + 0.5 * Math.sin(y * freq * 2.7 - t * speed * 1.3);
      var off = Math.round(amp * w * (0.4 + 0.6 * (y / Math.max(1, bh))));
      dst.drawImage(src, 0, y, bw, 1, off, y, bw, 1);
    }
  }

  function water(ctx, sc, X, Y, v, now) {
    var L = sc.lit;
    if (!L || !L.cur || !L.G) return;
    if (L.G.falls.length) {
      ctx.save();
      falls(ctx, L.G, L.cur.Lt, X, Y, v, now / 1000, fading(L) ? clamp((performance.now() - L.fadeAt) / FADE, 0, 1) : 1);
      ctx.restore();
    }
    if (!L.cur.open) return;
    var G = L.G, C = L.cur, Lt = C.Lt, M = Lt.M, b = G.wBox, bw = b[2], bh = b[3];
    // only the rows of the water box on screen
    var ry0 = Math.max(0, v[1] - b[1]), ry1 = Math.min(bh, v[1] + v[3] - b[1]);
    if (ry1 <= ry0 || b[0] > v[0] + v[2] || b[0] + bw < v[0]) return;
    var t = now / 1000, a = fading(L) ? clamp((performance.now() - L.fadeAt) / FADE, 0, 1) : 1;
    if (scratch.width < bw || scratch.height < bh) { scratch.width = Math.max(scratch.width, bw); scratch.height = Math.max(scratch.height, bh); }
    // the mirrored world, wobbling (refreshed a dozen times a second: the wobble is slow)
    if (!L.wAt || now - L.wAt > 80 || L.wFor !== C || L.wRows !== ry0 + ',' + ry1) {
      L.wAt = now; L.wFor = C; L.wRows = ry0 + ',' + ry1;
      sx.setTransform(1, 0, 0, 1, 0, 0);
      sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1;
      sx.clearRect(0, 0, bw, bh);
      var calm = M.wx === 'rain' ? 2.4 : M.wx === 'clear' ? 1.4 : 1.8;
      var opt = { amp: calm, freq: 0.8, speed: 1.8 };
      sx.globalAlpha = M.wx === 'fog' ? 0.52 : 1;
      ripple(sx, C.mirror, null, bw, bh, ry0, ry1, t, opt);
      if (C.refl) { sx.globalAlpha = M.wx === 'fog' ? 0.5 : 0.8; ripple(sx, C.refl, null, bw, bh, ry0, ry1, t, opt); }
      sx.globalAlpha = 1;
      sx.globalCompositeOperation = 'destination-in';
      sx.drawImage(C.open, 0, 0);
      sx.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.globalAlpha = 0.62 * a;
    ctx.drawImage(scratch, 0, ry0, bw, ry1 - ry0, X + b[0], Y + b[1] + ry0, bw, ry1 - ry0);
    var openPx = C.openPx;
    function inOpen(x, y) { var bx = x - b[0], by = y - b[1]; return bx >= 0 && by >= 0 && bx < bw && by < bh && openPx[by * bw + bx]; }
    // shimmer: short light dashes that come and go
    var hi = css(Lt.night > 0.6 ? rgbn('#aab8e0') : mixv(Lt.P.skyHor, [1, 1, 1], 0.45));
    ctx.fillStyle = hi;
    for (var n = 0; n < G.shimPts.length; n++) {
      var sp = G.shimPts[n], px = sp[0], py = sp[1], ph = sp[2];
      if (!inOpen(px, py)) continue;
      var s = Math.sin(t * 0.9 * (0.6 + ph) + ph * 30);
      if (s < 0.55) continue;
      ctx.globalAlpha = a * (s - 0.55) * 1.6 * lerp(1, 0.5, Lt.night);
      var len = 2 + Math.floor(ph * 3), ox = Math.round(Math.sin(t * 0.3 + ph * 10) * 2);
      ctx.fillRect(X + px + ox, Y + py, len, 1);
    }
    // glints: the sun (or the moon) catching the water here and there, a pixel or a little cross
    ctx.fillStyle = Lt.night > 0.5 ? '#c8d8ff' : css(mixv([1, 1, 1], rgbn('#ffd890'), Lt.golden));
    ctx.globalAlpha = a;
    for (n = 0; n < G.glintPts.length; n++) {
      var gp = G.glintPts[n], gs = Math.sin(t * 1.3 * (0.6 + gp[2]) + gp[2] * 40);
      if (gs <= 0.86 || !inOpen(gp[0], gp[1])) continue;
      if (gs > 0.97) ctx.fillRect(X + gp[0] - 1, Y + gp[1], 3, 1); else ctx.fillRect(X + gp[0], Y + gp[1], 1, 1);
    }
    // the sun's glitter path at golden hour, toward where it sets (or rises)
    var gold = Lt.golden * (M.wx === 'clear' ? 1 : 0.2) * (1 - Lt.night);
    if (gold > 0.08) {
      var cx = M.h < 12 ? b[0] + bw * 0.72 : b[0] + bw * 0.3;
      ctx.fillStyle = css(mixv(rgbn('#ffe4a0'), Lt.P.skyHor, 0.25));
      for (n = 0; n < 64; n++) {
        var gy = b[1] + Math.floor(hash(n, 1, 88) * bh), spread = 10 + (gy - b[1]) * 0.35;
        var gx = Math.round(cx + (hash(n, 2, 88) - 0.5) * spread * 2 + Math.sin(t * 0.5 + n) * 2);
        var gv = Math.sin(t * (1.2 + hash(n, 3, 88)) + n * 2.3);
        if (gv < 0.2 || !inOpen(gx, gy)) continue;
        ctx.globalAlpha = a * gold * (0.35 + 0.65 * gv) * Math.max(0, 1 - Math.abs(gx - cx) / (spread * 1.2));
        ctx.fillRect(X + gx, Y + gy, 1 + Math.floor(hash(n, 4, 88) * 4), 1);
      }
    }
    // stars in the water on clear nights
    if (Lt.night > 0.6 && M.wx === 'clear') {
      for (n = 0; n < G.starPts.length; n++) {
        var st = G.starPts[n];
        if (!inOpen(st[0], st[1]) || Math.sin(t * 1.3 * (0.5 + st[2]) + st[2] * 20) <= -0.3) continue;
        ctx.globalAlpha = a; ctx.fillStyle = st[2] > 0.6 ? '#fffbe8' : '#c8d4ff';
        ctx.fillRect(X + st[0], Y + st[1], 1, 1);
      }
    }
    // the shore laps: a light line on the near shore that comes and goes
    if (!(Lt.snow >= 1)) {
      ctx.fillStyle = Lt.night > 0.6 ? '#8a9ac4' : css(mixv(rgbn('#d8ecea'), Lt.P.skyHor, 0.25));
      for (n = 0; n < G.wShore.length; n++) {
        var q = G.wShore[n];
        if (Math.sin(t * 1.5 + q[0] * 0.33 + q[1] * 0.21) > 0.15) { ctx.globalAlpha = a * lerp(1, 0.5, Lt.night); ctx.fillRect(X + q[0], Y + q[1], 1, 1); }
      }
    }
    // lit windows and lanterns streaking down the water after dark
    if (L.reflglow && Lt.glow > 0.08) {
      if (scratch2.width < bw || scratch2.height < bh) { scratch2.width = Math.max(scratch2.width, bw); scratch2.height = Math.max(scratch2.height, bh); }
      sx2.globalCompositeOperation = 'source-over'; sx2.globalAlpha = 1; sx2.clearRect(0, 0, bw, bh);
      for (var d = 0; d <= 6; d++) { sx2.globalAlpha = 1 - d / 7; sx2.drawImage(L.reflglow, b[0], b[1], bw, bh, Math.round(Math.sin(t * 2.6 + d) * 2), d * 2, bw, bh); }
      sx2.globalAlpha = 1; sx2.globalCompositeOperation = 'destination-in'; sx2.drawImage(C.open, 0, 0);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * Lt.glow * a;
      ctx.drawImage(scratch2, 0, ry0, bw, ry1 - ry0, X + b[0], Y + b[1] + ry0, bw, ry1 - ry0);
      ctx.globalCompositeOperation = 'source-over';
    }
    // rings: a fish rising now and then, or the rain coming down on it; and where a fall lands
    var rain = M.wx === 'rain', rp = rain ? G.ringPts.concat(G.glintPts.slice(0, 14)) : G.fishPts;
    if (!(Lt.snow >= 1)) G.falls.forEach(function (F) {
      var fx = Math.round((F.x0 + F.x1) / 2);
      ringsAt([[fx - 4, F.foot + 3, 0], [fx + 5, F.foot + 5, 0.4]], 2.2, 9, 0.45);
    });
    ringsAt(rp, rain ? 1 : 5, rain ? 4 : 7, rain ? 0.6 : 0.5);
    function ringsAt(pts, per, rmax, ralpha) {
      ctx.fillStyle = '#e6f0ff';
      for (var j = 0; j < pts.length; j++) {
        var rq = pts[j];
        if (!inOpen(rq[0], rq[1])) continue;
        var rk = (t / per + rq[2]) % 1, rr = Math.round(1 + rk * rmax), rry = Math.max(1, Math.round(rr * 0.5));
        ctx.globalAlpha = a * (1 - rk) * ralpha;
        var seen = {};
        for (var ra = 0; ra < 40; ra++) {
          var th = ra / 40 * Math.PI * 2, ex = rq[0] + Math.round(Math.cos(th) * rr), ey = rq[1] + Math.round(Math.sin(th) * rry);
          if (seen[ex + ',' + ey] || !inOpen(ex, ey)) continue;
          seen[ex + ',' + ey] = 1;
          ctx.fillRect(X + ex, Y + ey, 1, 1);
        }
      }
    }
    ctx.restore();
  }

  // ---- the light on a character standing at (col, row) ----
  // Worked out once a composition for every tile — the light over the floor round its foot point, averaged — then
  // blended between the four nearest tiles as someone walks, so they pass smoothly into shade and out again. (Sampled
  // from a few pixels at the feet, it jumped from cobble to crevice as you walked: a flicker.)
  function grid(sc) {
    var L = sc.lit, C = L.cur;
    if (C.grid) return C.grid;
    var G = L.G, m = sc.meta, Lt = C.Lt, W = G.w, H = G.h;
    var cols = Math.max(1, Math.floor((W - m.originX) / 32)), rows = Math.max(1, Math.floor((H - m.originY) / 32));
    var out = new Float32Array(cols * rows * 3).fill(NaN);
    function sunAt(i, p) { return i < 2 ? G.lit_a[p + i + 1] : i < 5 ? G.lit_b[p + i - 2] : G.lit_c[p]; }
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var sk = 0, sn = 0, mo = 0, lr = 0, lg = 0, lb = 0, n = 0;
      for (var y = Math.round(m.originY + (r + 0.45) * 32); y < Math.round(m.originY + (r + 1.25) * 32); y += 3) {
        if (y < 0 || y >= H) continue;
        for (var x = Math.round(m.originX + c * 32 - 6); x < Math.round(m.originX + c * 32 + 38); x += 3) {
          if (x < 0 || x >= W) continue;
          var p = (y * W + x) * 4;
          if (G.lit_albedo[p + 3] < 8) continue;
          sk += DEC[G.lit_a[p]];
          var a0 = DEC[sunAt(Lt.i0, p)], a1 = DEC[sunAt(Lt.i1, p)];
          sn += a0 + (a1 - a0) * Lt.f;
          mo += DEC[G.lit_b[p]];
          if (G.lit_lamps) { lr += DEC[G.lit_lamps[p]]; lg += DEC[G.lit_lamps[p + 1]]; lb += DEC[G.lit_lamps[p + 2]]; }
          n++;
        }
      }
      if (!n) continue;
      var Lc = [lr / n, lg / n, lb / n].map(function (lamp, k) {
        return Lt.sky * Lt.skyC[k] * sk / n + Lt.sunC[k] * sn / n * Lt.sun * 0.85 + Lt.moonC[k] * mo / n * Lt.moon + lamp * Lt.lamp * 0.8;
      });
      var lum = luma(Lc) + 1e-5, bb = 1.1 * (1 - Math.exp(-lum)) / 0.9 * (1 - 0.25 * Lt.night), q = (r * cols + c) * 3;
      for (var k = 0; k < 3; k++) out[q + k] = clamp(bb * (1 + (Lc[k] / lum - 1) * 0.7), 0.22, 1);
    }
    C.grid = { cols: cols, rows: rows, v: out };
    return C.grid;
  }
  function tint(sc, col, row) {
    var L = sc.lit;
    if (!L || !L.cur || !L.G) return null;
    var g = grid(sc), ck = Math.round(col * 8) + ',' + Math.round(row * 8);
    if (L.tintFor !== L.cur) { L.tintFor = L.cur; L.tints = {}; }
    if (L.tints[ck] !== undefined) return L.tints[ck];
    var fx = clamp(col, 0, g.cols - 1), fy = clamp(row, 0, g.rows - 1), c0 = Math.floor(fx), r0 = Math.floor(fy);
    var tx = fx - c0, ty = fy - r0, acc = [0, 0, 0], wsum = 0;
    [[c0, r0, (1 - tx) * (1 - ty)], [c0 + 1, r0, tx * (1 - ty)], [c0, r0 + 1, (1 - tx) * ty], [c0 + 1, r0 + 1, tx * ty]].forEach(function (t) {
      if (t[2] <= 0 || t[0] >= g.cols || t[1] >= g.rows) return;
      var q = (t[1] * g.cols + t[0]) * 3;
      if (isNaN(g.v[q])) return;
      acc[0] += g.v[q] * t[2]; acc[1] += g.v[q + 1] * t[2]; acc[2] += g.v[q + 2] * t[2]; wsum += t[2];
    });
    return (L.tints[ck] = wsum > 0 ? css([acc[0] / wsum, acc[1] / wsum, acc[2] / wsum]) : null);
  }

  return {
    load: load,
    layers: layers,
    frame: frame,
    water: water,
    tint: tint,
    ready: function (sc) { return !!(sc && sc.lit && sc.lit.cur); },
    light: function (id) { var sc = typeof BridgeScene !== 'undefined' && BridgeScene.get(id); return sc && sc.lit && sc.lit.cur ? sc.lit.cur.Lt : null; },
    _force: function (o) { forced = o || null; },
    _stats: function (id) {
      var sc = typeof BridgeScene !== 'undefined' && BridgeScene.get(id), L = sc && sc.lit;
      return L ? { ready: L.ready, broken: !!L.broken, comps: L.comps, ms: L.ms, key: L.key, water: !!(L.G && L.G.water), drawing: !!L.cur } : null;
    }
  };
})();
