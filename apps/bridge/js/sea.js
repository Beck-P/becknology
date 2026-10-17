/**
 * BridgeSea — Lumar's water for the pre-rendered worlds.
 *
 *   BridgeSea.drawSea(ctx, w, h, now, palette)        the open sea, behind a scene
 *   BridgeSea.drawWater(ctx, sc, offX, offY, now, palette)
 *                                                     the water over the scene: drawn
 *                                                     right after the render
 *
 * The sea in the toy finish (Look Book 2's water, as js/litscene.js draws still water): each sea's own colours in a
 * few flat bands — broad swells of deeper and lighter water, no noise and no dithering — crossed by short crisp wave
 * crests (a light dash over a dark one) drifting two ways; whitecaps in a storm, the colours dulled in rain and fog.
 * Over it the light of the hour: the sun's sparkle by day, a glitter path toward the low sun at golden hour, the moon
 * road and the stars on clear nights. Continuous, anchored to the world, no tile grid.
 *
 * A scene that stands in the sea (assets_coast) is rendered with its banks, beaches and seabed, and scene_post writes
 * shore.png from its height pass: how deep each pixel lies under the surface and how far it is from the waterline.
 * drawWater lays the same sea over everything below the surface, its depth in flat bands with wandering shelves (thin
 * and pale over the shallows so the sand, rocks and kelp show through, solid in the deep where it meets the open sea
 * without a seam); what stands above the waterline — banks, quays, piers, hulls, rocks — mirrored in it and wobbling,
 * lit windows and lanterns streaking down it after dark; light rippling on the shallow bed; and foam in the toy style:
 * a lap line at the waterline breathing in and out and lines of surf rolling in. Older scenes without shore.png get a
 * foam band round their silhouette instead. The spore bloom (js/bloom.js) lights all of it on its nights.
 */
var BridgeSea = (function () {
  var PALETTES = {
    emerald: { deep: [8, 30, 28], mid: [14, 52, 46], hi: [40, 104, 88], shallow: '110,220,190', foam: '214,250,236', spore: '150,240,180' },
    crimson: { deep: [28, 8, 14], mid: [52, 16, 26], hi: [104, 40, 52], shallow: '230,110,120', foam: '255,220,224', spore: '255,110,120' },
    rose: { deep: [28, 12, 26], mid: [52, 24, 46], hi: [104, 56, 88], shallow: '240,150,200', foam: '255,232,244', spore: '255,150,200' },
    sapphire: { deep: [8, 14, 34], mid: [16, 30, 64], hi: [44, 72, 124], shallow: '120,170,250', foam: '224,236,255', spore: '120,170,255' },
    midnight: { deep: [6, 6, 18], mid: [14, 14, 38], hi: [36, 32, 80], shallow: '150,130,250', foam: '226,220,255', spore: '170,140,255' }
  };
  // ---- by day and at dusk (js/clock.js): each sea in sunlight, and warmed by a low sun ----------------------------------
  var DAY = {
    emerald: { deep: [28, 96, 92], mid: [44, 132, 118], hi: [110, 196, 170], shallow: '170,240,220', foam: '245,255,252', spore: '255,255,255' },
    crimson: { deep: [104, 36, 46], mid: [150, 60, 72], hi: [214, 120, 128], shallow: '250,150,155', foam: '255,232,234', spore: '255,255,255' },
    rose: { deep: [96, 56, 98], mid: [140, 86, 136], hi: [206, 146, 192], shallow: '250,190,225', foam: '255,240,248', spore: '255,255,255' },
    sapphire: { deep: [24, 64, 128], mid: [40, 98, 170], hi: [104, 160, 226], shallow: '160,200,255', foam: '240,248,255', spore: '255,255,255' }
  };
  (function derive() {
    var WARM = [214, 116, 84];
    function mix3(n, d, k) { return [0, 1, 2].map(function (i) { return Math.round(n[i] * 0.42 + d[i] * 0.33 + WARM[i] * 0.25 * k); }); }
    function mixs(n, d) { var a = n.split(',').map(Number), b = d.split(',').map(Number); return mix3(a, b, 1.3).join(','); }
    Object.keys(DAY).forEach(function (k) {
      var N = PALETTES[k], D = DAY[k];
      PALETTES[k + '@day'] = D;
      PALETTES[k + '@dusk'] = { deep: mix3(N.deep, D.deep, 1), mid: mix3(N.mid, D.mid, 1), hi: mix3(N.hi, D.hi, 1.2),
                                shallow: mixs(N.shallow, D.shallow), foam: mixs(N.foam, D.foam), spore: N.spore };
    });
  })();
  /** How much day and dusk show on this sea now: the scene's own blend where its art has a day (js/scene.js), else night. */
  function skyFor(palette, sc) {
    if (!DAY[palette] || typeof BridgeScene === 'undefined' || !BridgeScene.sky) return null;
    var w;
    if (sc) w = BridgeScene.skyOf(sc);
    else if (camOverride) w = typeof BridgeClock !== 'undefined' && seaCycles ? BridgeClock.weights('lumar') : null;   // out at sea
    else {
      var id = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null;
      w = id ? BridgeScene.sky(id) : null;
    }
    return w && (w.day > 0.003 || w.dusk > 0.003) ? w : null;
  }
  // out at sea (the sloop's passage) the open water follows Lumar's sky once its islands have their day art
  var seaCycles = false;
  function setSeaCycles(on) { seaCycles = !!on; }
  function blendStr(a, b, k) { var x = a.split(',').map(Number), y = b.split(',').map(Number); return x.map(function (v, i) { return Math.round(v + (y[i] - v) * k); }).join(','); }
  /** The palette's shallows and foam for the sky now (the animated water's colours). */
  function litPalette(name, W) {
    var P = PALETTES[name];
    if (!W) return P;
    var D = PALETTES[name + '@dusk'], Y = PALETTES[name + '@day'];
    var aD = W.dusk + W.night > 0 ? W.dusk / (W.dusk + W.night) : 0;
    var sh = blendStr(blendStr(P.shallow, D.shallow, aD), Y.shallow, W.day), fo = blendStr(blendStr(P.foam, D.foam, aD), Y.foam, W.day);
    return { deep: P.deep, mid: P.mid, hi: P.hi, shallow: sh, foam: fo, spore: P.spore };
  }

  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mixc(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function rgb(c, a) { return a == null ? 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')' : 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function nums(s) { return s.split(',').map(Number); }
  function worldId() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }

  // ---- the light on the water now: the sky's blend (day, dusk, night), golden hour, which side the sun is on, the moon,
  // the weather. The scene's own when it has one (its live light when that's composed: BridgeLit's hour, so a preview
  // moves the sea too), else Lumar's sky out at sea. Worked out a few times a second, in steps (so the colours made from
  // it change now and then, not every frame).
  var lights = {};
  function lightOn(name, sc) {
    var id = sc ? sc.id : camOverride ? 'lumar' : worldId() || 'lumar', key = name + '|' + id, t = Date.now(), c = lights[key];
    if (c && t - c.at < 300 && c.sc === sc) return c.L;
    var W = skyFor(name, sc), L = { day: W ? W.day : 0, dusk: W ? W.dusk : 0, night: W ? W.night : 1, golden: 0, eve: true, moon: 0.3,
                                    storm: 0, rain: 0, fog: 0, gale: 0, clear: 1 };
    var lt = sc && sc.lit && typeof BridgeLit !== 'undefined' && BridgeLit.light ? BridgeLit.light(sc.id) : null;
    if (lt && DAY[name]) {                                                  // the live light's own hour
      L.night = lt.night; L.golden = lt.golden; L.day = (1 - lt.night) * (1 - 0.6 * lt.golden); L.dusk = Math.max(0, 1 - L.night - L.day);
      L.eve = lt.M ? lt.M.h > 12.8 : true;
    } else if (DAY[name]) L.golden = clamp(L.dusk * 1.8, 0, 1) * (L.day > 0.02 ? 1 : 0.5);
    if (typeof BridgeClock !== 'undefined') {
      var s = BridgeClock.sky(id);
      if (s) {
        if (!lt && s.sunrise != null && s.sunset != null) L.eve = s.t > (s.sunrise + s.sunset) / 2;
        if (s.moon != null) L.moon = s.moon;
      }
    }
    if (typeof BridgeWeather !== 'undefined') {
      var w = (BridgeWeather.here && BridgeWeather.here(id)) || (BridgeWeather.at && BridgeWeather.at('lumar'));
      if (w && w.k > 0.05) {
        var K = w.kind, k = w.k;
        L.storm = K === 'storm' ? k : 0;
        L.gale = K === 'gale' ? k : K === 'storm' ? k : 0;
        L.rain = K === 'rain' ? k : K === 'storm' ? k : 0;
        L.fog = K === 'fog' ? k : 0;
        L.clear = K === 'fair' || K === 'breezy' || K === 'clear' ? 1 : 1 - k;
      }
    }
    ['day', 'dusk', 'night', 'golden', 'moon', 'storm', 'gale', 'rain', 'fog', 'clear'].forEach(function (f) { L[f] = Math.round(L[f] * 24) / 24; });
    L.aD = L.dusk + L.night > 0 ? L.dusk / (L.dusk + L.night) : 0;
    lights[key] = { at: t, sc: sc, L: L };
    return L;
  }

  // ---- the sea's colours for that light: deep, the body of the water, the lighter swells, a crest and the dark under
  // it, whitecaps. Night's palette, dusk's over it, day's over that (as the scenes blend their light states), then golden
  // hour warming the crests and the swells, a storm greying it all, fog washing it out.
  function colours(name, L) {
    var N = PALETTES[name], Dk = PALETTES[name + '@dusk'], Y = PALETTES[name + '@day'];
    function at(f) { var c = N[f]; if (Dk && L.aD) c = mixc(c, Dk[f], L.aD); if (Y && L.day) c = mixc(c, Y[f], L.day); return c; }
    function atS(f) { var c = nums(N[f]); if (Dk && L.aD) c = mixc(c, nums(Dk[f]), L.aD); if (Y && L.day) c = mixc(c, nums(Y[f]), L.day); return c; }
    var deep = at('deep'), mid = at('mid'), hi = at('hi');
    var C = { deep: mixc(deep, mid, 0.3), base: mixc(deep, mid, 0.55), light: mixc(mid, hi, 0.08), crest: mixc(mixc(mid, hi, 0.75), [255, 255, 255], 0.08 + 0.1 * L.day),
              trough: mixc(deep, [0, 0, 0], 0.15), cap: atS('foam') };
    var g = L.golden * L.clear;
    if (g > 0) {
      C.crest = mixc(C.crest, [255, 214, 150], 0.25 * g);
      C.light = mixc(C.light, [236, 168, 118], 0.24 * g);
      C.base = mixc(C.base, [206, 134, 110], 0.14 * g);
      C.deep = mixc(C.deep, [150, 90, 96], 0.1 * g);
    }
    var s = Math.max(L.storm, L.rain * 0.45);
    if (s > 0) {
      var grey = mixc([116, 124, 132], [34, 38, 50], L.night);
      ['deep', 'base', 'light'].forEach(function (f) { C[f] = mixc(mixc(C[f], grey, 0.42 * s), [0, 0, 0], 0.16 * s); });
      C.crest = mixc(C.crest, mixc([214, 222, 226], [96, 104, 124], L.night), 0.5 * s);
      C.trough = mixc(C.deep, [0, 0, 0], 0.3);
    }
    if (L.fog > 0) {
      var fogc = mixc([176, 188, 194], [44, 50, 66], L.night);
      ['deep', 'base', 'light', 'crest', 'trough', 'cap'].forEach(function (f) { C[f] = mixc(C[f], fogc, (f === 'crest' || f === 'trough' ? 0.55 : 0.38) * L.fog); });
    }
    ['deep', 'base', 'light', 'crest', 'trough', 'cap'].forEach(function (f) { C[f] = C[f].map(Math.round); });
    C.key = [C.deep, C.base, C.light, C.crest, C.trough, C.cap].join(';');
    return C;
  }

  // ---- seamless wave maps (an index a pixel, worked out once) and the textures coloured from them ----------------------
  // 0 deeper water, 1 the body, 2 a lighter swell (wide flat bands of a smooth noise, stretched sideways), 3 a wavelet's
  // crest, 4 the dark under it (short crisp dashes, placed, a little arc each), 5 a whitecap, 255 nothing. Three maps of
  // different sizes (no visible repeat): the body with its wavelets, a second set of wavelets drifting the other way, and
  // the whitecaps (a storm's, faded in by it in two steps).
  var MAPS = [{ w: 512, h: 256, seed: 1, per: 420 }, { w: 384, h: 192, seed: 2, per: 1100 }, { w: 320, h: 160, seed: 3, per: 380 }], maps = [];
  function periodicNoise(x, y, px, py, seed) {
    // value noise on a lattice that wraps every px × py cells
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(i, j) { return hash(((i % px) + px) % px * 57 + ((j % py) + py) % py * 131 + seed * 977); }
    return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
  }
  // fbm over a W × H tile that wraps: `base` cells down it, as many across as keep them `stretch` times wider than tall
  function tfbm(x, y, W, H, base, seed, stretch, oct) {
    var n = 0, amp = 0.5, tot = 0;
    for (var o = 0, f = 1; o < oct; o++, f *= 2) {
      var cy = base * f, cx = Math.max(1, Math.round(cy * W / H / stretch));
      n += periodicNoise(x / W * cx, y / H * cy, cx, cy, seed + o) * amp;
      tot += amp; amp *= 0.5;
    }
    return n / tot;
  }
  function waveMap(n) {
    if (maps[n]) return maps[n];
    var M = MAPS[n], W = M.w, H = M.h, s = M.seed * 100, out = new Uint8Array(W * H).fill(n ? 255 : 1), x, y;
    var sw = new Float32Array(W * H);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      sw[y * W + x] = tfbm(x, y, W, H, 3, s + 1, 3.2, 3);
      if (!n) out[y * W + x] = sw[y * W + x] < 0.4 ? 0 : sw[y * W + x] < 0.61 ? 1 : 2;     // the swells
    }
    // the wavelets: short dashes, a light crest with its shadow a row under it, the ends a row lower (a little arc);
    // more of them on the swells, fewer in the troughs. Whitecaps are a heavier crest of foam.
    var count = Math.round(W * H / M.per);
    function put(px, py, v) { var i = ((py % H) + H) % H * W + ((px % W) + W) % W; if (v === 4 && (out[i] === 3 || out[i] === 5)) return; out[i] = v; }
    for (var k = 0; k < count; k++) {
      var cx = Math.floor(hash(s * 7 + k * 3.1) * W), cy = Math.floor(hash(s * 11 + k * 5.7) * H), here = sw[cy * W + cx];
      if (hash(s + k * 1.3) > 0.25 + here * 1.1) continue;
      var len = 3 + Math.floor(hash(s * 13 + k * 2.9) * (n === 2 ? 5 : 8)), crest = n === 2 ? 5 : 3;
      for (var j = 0; j < len; j++) {
        var end = j === 0 || j === len - 1, yy = cy + (end && len > 4 ? 1 : 0);
        put(cx + j, yy, crest);
        if (!end || n === 2) put(cx + j, yy + 1, 4);
        if (n === 2 && !end && j % 2) put(cx + j, yy - 1, 5);
      }
    }
    return (maps[n] = out);
  }
  var tex = {};
  function texture(name, n, C) {
    var key = name + n, T = tex[key];
    if (T && T.k === C.key) return T.c;
    if (!T) { T = tex[key] = { c: document.createElement('canvas') }; T.c.width = MAPS[n].w; T.c.height = MAPS[n].h; }
    var m = waveMap(n), cx = T.c.getContext('2d'), img = cx.createImageData(MAPS[n].w, MAPS[n].h), d = img.data;
    var cols = [C.deep, C.base, C.light, C.crest, C.trough, C.cap];
    for (var i = 0; i < m.length; i++) {
      var v = m[i];
      if (v === 255) continue;
      var c = cols[v];
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    T.k = C.key; T.c.__pat = null;
    return T.c;
  }

  function tiled(ctx, t, w, h, ox, oy, alpha) {
    var tw = t.width, th = t.height;
    ox = ((Math.round(ox) % tw) + tw) % tw;
    oy = ((Math.round(oy) % th) + th) % th;
    ctx.globalAlpha = alpha;
    for (var y = -oy; y < h; y += th) {
      for (var x = -ox; x < w; x += tw) ctx.drawImage(t, x, y);
    }
    ctx.globalAlpha = 1;
  }

  function fillPattern(ctx, t, w, h, ox, oy, alpha) {
    var pat = t.__pat || (t.__pat = ctx.createPattern(t, 'repeat'));
    var tw = t.width, th = t.height;
    ox = ((Math.round(ox) % tw) + tw) % tw;
    oy = ((Math.round(oy) % th) + th) % th;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(ox, oy, w, h);
    ctx.restore();
  }

  // where the wave layers sit for screen x = 0, y = 0 (the sea is anchored to the world, so it scrolls with the
  // camera): the body and its crests one way, the second crests the other, the whitecaps quicker
  var camOverride = null;      // drawSeaAt: a camera of the caller's own (the voyage)
  function drift(now) {
    var camX, camY;
    if (camOverride) { camX = camOverride[0]; camY = camOverride[1]; }
    else { var v = BridgeWorld.getView(); camX = -v.offX; camY = -v.offY; }
    return { ax: camX + now * 0.004, ay: camY + now * 0.0016, bx: camX - now * 0.0055 + 37, by: camY + now * 0.0028 + 19,
             cx: camX + now * 0.011 + 71, cy: camY + now * 0.005 + 41, camX: camX, camY: camY };
  }
  // the three layers onto ctx: the body and the crests always, the whitecaps by the storm (in two steps, not a fade)
  function waves(ctx, w, h, now, name, L, C) {
    var D = drift(now);
    tiled(ctx, texture(name, 0, C), w, h, D.ax, D.ay, 1);
    tiled(ctx, texture(name, 1, C), w, h, D.bx, D.by, 1);
    var cap = capAlpha(L);
    if (cap) tiled(ctx, texture(name, 2, C), w, h, D.cx, D.cy, cap);
  }
  function capAlpha(L) { var s = Math.max(L.storm, 0.6 * L.gale); return s < 0.2 ? 0 : s < 0.6 ? 0.5 : 1; }

  // ---- the light on the water: the sun's sparkle by day, a glitter path toward a low sun, the moon road, the stars --
  // Points on a grid anchored to the world (so they hold still as the camera moves), each lit or not by its own clock;
  // the paths are where the sun and the moon would be mirrored, a column down the screen widening toward the viewer.
  // Flat dashes, two strengths. `isWater` (screen x, y) keeps them on an island's open water.
  var STAR = ['#fffbe8', '#c8d4ff', '#e8ecff'];
  function skyLight(ctx, w, h, now, L, C, isWater) {
    var D = drift(now), clear = L.clear * (1 - L.fog);
    ctx.save();
    // the sun's sparkle by day: short white dashes coming and going
    var sp = L.day * (0.4 + 0.6 * clear) * (1 - 0.6 * L.golden);
    if (sp > 0.05) {
      var cell = 40, c0 = Math.floor(D.camX / cell) - 1, r0 = Math.floor(D.camY / cell) - 1;
      ctx.fillStyle = 'rgb(255,252,236)';
      for (var r = r0; r < r0 + h / cell + 3; r++) for (var c = c0; c < c0 + w / cell + 3; c++) {
        var id = c * 7919 + r * 104729, tw = Math.sin(now / (380 + hash(id + 2) * 400) + id);
        if (tw < 0.72) continue;
        var x = Math.round(c * cell - D.camX + hash(id) * cell), y = Math.round(r * cell - D.camY + hash(id + 1) * cell);
        if (isWater && !isWater(x, y)) continue;
        ctx.globalAlpha = (tw > 0.9 ? 0.9 : 0.5) * sp;
        ctx.fillRect(x, y, tw > 0.9 ? 3 : 2, 1);
      }
    }
    // the glitter path at golden hour, toward where the sun sets (or rises), and the moon road on a clear night
    var gold = L.golden * clear * (1 - L.night), moon = L.night * L.moon * clear;
    if (gold > 0.06) path(ctx, w, h, now, D, Math.round(w * (L.eve ? 0.3 : 0.7)), 16, 0.45, Math.min(1, 0.3 + gold), rgb(mixc(C.crest, [255, 228, 160], 0.6)), isWater, 11);
    if (moon > 0.05) path(ctx, w, h, now, D, Math.round(w * 0.6), 10, 0.25, Math.min(1, 0.35 + moon * 2.5), 'rgb(214,226,255)', isWater, 23);
    // stars mirrored on a clear night
    if (L.night > 0.6 && clear > 0.7) {
      var sc2 = 30, s0 = Math.floor(D.camX / sc2) - 1, t0 = Math.floor(D.camY / sc2) - 1;
      for (var sr = t0; sr < t0 + h / sc2 + 3; sr++) for (var scl = s0; scl < s0 + w / sc2 + 3; scl++) {
        var sid = scl * 5303 + sr * 81131 + 3, hs = hash(sid);
        if (hs > 0.42 || Math.sin(now / (500 + hs * 900) + sid) < -0.4) continue;
        var stx = Math.round(scl * sc2 - D.camX + hash(sid + 1) * sc2), sty = Math.round(sr * sc2 - D.camY + hash(sid + 2) * sc2);
        if (isWater && !isWater(stx, sty)) continue;
        ctx.globalAlpha = (hs < 0.12 ? 1 : 0.6) * (L.night - 0.5) * 2;
        ctx.fillStyle = STAR[Math.floor(hash(sid + 3) * 3)];
        ctx.fillRect(stx, sty, 1, 1);
      }
    }
    ctx.restore();
  }
  // a column of glints centred on cx: `w0` px wide at the top, widening by `grow` a row; strength k
  function path(ctx, w, h, now, D, cx, w0, grow, k, col, isWater, seed) {
    var cell = 5, rw = w0 + h * grow;
    var c0 = Math.floor((D.camX + cx - rw * 1.2) / cell), c1 = Math.ceil((D.camX + cx + rw * 1.2) / cell), r0 = Math.floor(D.camY / cell) - 1;
    ctx.fillStyle = col;
    for (var r = r0; r < r0 + h / cell + 2; r++) for (var c = c0; c <= c1; c++) {
      var id = c * 4513 + r * 92821 + seed, hs = hash(id);
      var y = Math.round(r * cell - D.camY + hash(id + 1) * cell);
      var spread = w0 + Math.max(0, y) * grow, x = Math.round(c * cell - D.camX + hs * cell), off = Math.abs(x - cx) / spread;
      if (off > 1.15 || hs > 0.92 - off * 0.55) continue;
      var v = Math.sin(now / (260 + hash(id + 2) * 420) + id * 1.7);
      if (v < -0.1) continue;
      if (isWater && !isWater(x, y)) continue;
      ctx.globalAlpha = k * (v > 0.55 && off < 0.65 ? 1 : 0.6);
      ctx.fillRect(x, y, 1 + Math.floor(hash(id + 3) * (off < 0.5 ? 4 : 2)), 1);
    }
  }

  // drifting spores (and the bloom's motes), on a world-anchored grid; `isWater` (screen x, y) filters them to the water
  // over a scene (the moon's and the sun's light on the water is skyLight's)
  function glints(ctx, w, h, now, P, isWater, W, k, name) {
    var dark = W ? Math.max(0, 1 - W.day * 1.1) : 1;
    var spore = k > 0.01 ? BridgeBloom.hue(name) : P.spore, boost = 1 + 1.4 * (k || 0);
    var D = drift(now);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var cell = 48;
    var c0 = Math.floor(D.camX / cell) - 1, r0 = Math.floor(D.camY / cell) - 1;
    for (var r = r0; r < r0 + h / cell + 3; r++) {
      for (var c = c0; c < c0 + w / cell + 3; c++) {
        var id = c * 7919 + r * 104729;
        var x = Math.round(c * cell - D.camX + hash(id) * cell), y = Math.round(r * cell - D.camY + hash(id + 1) * cell);
        var sx = Math.round(x + Math.sin(now / 2000 + id) * 6), sy = Math.round(y + 20 + Math.cos(now / 2600 + id) * 4);
        if (dark > 0.05 && (!isWater || isWater(sx, sy))) {
          ctx.fillStyle = 'rgba(' + spore + ',' + Math.min(1, (0.25 + 0.35 * Math.abs(Math.sin(now / 900 + id))) * dark * boost).toFixed(2) + ')';
          ctx.fillRect(sx, sy, 1, 1);
        }
      }
    }
    if (k > 0.01) motes(ctx, w, h, now, D, isWater, k, name);
    ctx.restore();
  }
  // the bloom's motes: spores drifting through the water, a few of them bright with a small halo (a plus)
  var moteStyles = {};
  function moteStyle(rgb, a8) {                               // 'rgba(…)' strings by eighths of opacity, made once
    var key = rgb + a8;
    return moteStyles[key] || (moteStyles[key] = 'rgba(' + rgb + ',' + (a8 / 8).toFixed(3) + ')');
  }
  function motes(ctx, w, h, now, D, isWater, k, name) {
    var hue = BridgeBloom.hue(name), core = BridgeBloom.core(name), cell = 32;
    var c0 = Math.floor(D.camX / cell) - 1, r0 = Math.floor(D.camY / cell) - 1;
    for (var r = r0; r < r0 + h / cell + 3; r++) {
      for (var c = c0; c < c0 + w / cell + 3; c++) {
        var id = c * 4513 + r * 92821 + 7, hs = hash(id);
        var x = Math.round(c * cell - D.camX + hs * cell + Math.sin(now / 3100 + id) * 5);
        var y = Math.round(r * cell - D.camY + hash(id + 1) * cell + Math.cos(now / 3700 + id) * 3);
        if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
        var pulse = Math.sin(now / (700 + hs * 900) + id * 1.3);
        if (pulse < -0.3 || (isWater && !isWater(x, y))) continue;
        var a8 = Math.round(Math.min(1, k * (0.35 + 0.5 * (pulse + 0.3))) * 8);
        if (pulse > 0.75 && hs < 0.45) {
          ctx.fillStyle = moteStyle(hue, Math.round(a8 * 0.45));
          ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
          ctx.fillStyle = moteStyle(core, a8);
        } else ctx.fillStyle = moteStyle(hue, Math.round(a8 * 0.8));
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // ---- the spore bloom (js/bloom.js): a night or two a month the whole sea lights up ------------------------------------
  // Slow luminous currents: a seamless texture of swirling filaments and faint haze in the sea's own bloom light (in a few
  // flat, dithered bands like the waves), worked out once and drifting slowly over the water. The shallows, the surf and
  // the foam light up in animate(); the motes drift in glints(). Cheap: two pattern fills and a few hundred specks a frame.
  var GLOWS = [{ w: 384, h: 192, seed: 0 }, { w: 320, h: 160, seed: 7 }], gfield = [], gtex = {};   // two sizes: no visible repeat
  function bloomK() {
    if (typeof BridgeBloom === 'undefined') return 0;
    var id = camOverride ? null : (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null);
    return BridgeBloom.on(null, id);
  }
  function pnoise(u, v, cx, cy, seed) {                       // periodic value noise, u/v in [0, 1) of the texture
    var x = u * cx, y = v * cy, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var a = xf * xf * (3 - 2 * xf), b = yf * yf * (3 - 2 * yf);
    function h(i, j) { return hash(((i % cx) + cx) % cx * 57 + ((j % cy) + cy) % cy * 131 + seed * 977); }
    return h(xi, yi) * (1 - a) * (1 - b) + h(xi + 1, yi) * a * (1 - b) + h(xi, yi + 1) * (1 - a) * b + h(xi + 1, yi + 1) * a * b;
  }
  function pfbm(u, v, base, seed, oct) {                      // cells half as wide again as tall: currents run sideways
    var n = 0, amp = 0.5, tot = 0, f = 1;
    for (var o = 0; o < (oct || 2); o++) { n += pnoise(u, v, Math.round(base * 1.5) * f, base * f, seed + o) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return n / tot;
  }
  // 0..4 per pixel: the bands of light (palette-free). The currents are contour lines of a swirled noise — long thin
  // ribbons, wider and softer where the water's slack — bright where the spores have drifted together, faint elsewhere.
  // Worked out a few rows a frame (no stall as the bloom comes on); null till done
  function glowField(n) {
    var G = GLOWS[n], F = gfield[n] || (gfield[n] = { d: new Uint8Array(G.w * G.h), row: 0 });
    if (F.row >= G.h) return F.d;
    for (var y = F.row, end = Math.min(G.h, F.row + 24); y < end; y++) for (var x = 0; x < G.w; x++) {
      var u = x / G.w, v = y / G.h, s = G.seed;
      var wu = (pfbm(u, v, 2, 41 + s) - 0.5) * 0.5, wv = (pfbm(u, v, 2, 47 + s) - 0.5) * 0.45;   // the currents' swirl
      var q0 = pfbm(u + wu, v + wv, 4, 53 + s);
      var line = Math.max(0, 1 - Math.abs(q0 - 0.5) * 22) + 0.7 * Math.max(0, 1 - Math.abs(q0 - 0.36) * 30) + 0.7 * Math.max(0, 1 - Math.abs(q0 - 0.64) * 30);
      var gather = Math.max(0, Math.min(1, (pfbm(u - wu * 0.5, v - wv * 0.5, 2, 61 + s, 3) - 0.35) / 0.3));
      var q = line * gather * 4.2 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9;
      F.d[y * G.w + x] = Math.max(0, Math.min(4, Math.floor(q)));
    }
    F.row = end;
    return F.row >= G.h ? F.d : null;
  }
  function glowTex(name, n) {
    var key = name + n;
    if (gtex[key]) return gtex[key];
    var F = glowField(n);
    if (!F) return null;
    var G = GLOWS[n], H = BridgeBloom.hue(name).split(',').map(Number), K = BridgeBloom.core(name).split(',').map(Number);
    var c = document.createElement('canvas');
    c.width = G.w; c.height = G.h;
    var cx = c.getContext('2d'), img = cx.createImageData(G.w, G.h), d = img.data, AL = [8, 28, 60, 104, 170];   // (8: the faint wash)
    for (var i = 0; i < G.w * G.h; i++) {
      var lv = F[i], col = lv === 4 ? K : H;
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = AL[lv];
    }
    cx.putImageData(img, 0, 0);
    gtex[key] = c;
    return c;
  }
  // the bloom over the water, w × h of ctx from its corner, the texture shifted by (sx, sy) (an island's water layer is in
  // its render's frame: sx, sy is where that lies on screen, so the currents run on from the open sea without a seam):
  // a faint wash of the sea's light and the currents (both in the texture), two layers drifting apart. On the open sea it
  // goes over the waves; on an island's water layer 'source-atop', so it keeps the water's opacity (thin over the shallows)
  // (tiled with drawImage over just the rect asked for: a blit, quicker than a pattern fill, and source-atop is bounded)
  function bloomWater(ctx, x0, y0, x1, y1, sx, sy, now, name, k, op) {
    var D = drift(now), a = glowTex(name, 0), b = a && glowTex(name, 1);
    if (!a || !b) return;
    ctx.save();
    ctx.globalCompositeOperation = op || 'source-over';
    tiles(ctx, a, x0, y0, x1, y1, D.camX + sx + now * 0.0021, D.camY + sy + now * 0.0009, 0.6 * k);
    tiles(ctx, b, x0, y0, x1, y1, D.camX + sx - now * 0.0016 + 101, D.camY + sy + now * 0.0013 + 57, 0.35 * k);
    ctx.restore();
  }
  // texture t tiled over [x0, x1) × [y0, y1) of ctx, the pixel at (x, y) taking the texture's (x + ox, y + oy)
  function tiles(ctx, t, x0, y0, x1, y1, ox, oy, alpha) {
    var tw = t.width, th = t.height;
    var fx = x0 - ((((Math.round(ox) + x0) % tw) + tw) % tw), fy = y0 - ((((Math.round(oy) + y0) % th) + th) % th);
    ctx.globalAlpha = alpha;
    for (var y = fy; y < y1; y += th) {
      for (var x = fx; x < x1; x += tw) {
        var cx0 = Math.max(x, x0), cy0 = Math.max(y, y0), cx1 = Math.min(x + tw, x1), cy1 = Math.min(y + th, y1);
        if (cx1 > cx0 && cy1 > cy0) ctx.drawImage(t, cx0 - x, cy0 - y, cx1 - cx0, cy1 - cy0, cx0, cy0, cx1 - cx0, cy1 - cy0);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** The open sea, filling the frame (native px), scrolling with the world. */
  function drawSea(ctx, w, h, now, palette) {
    var name = PALETTES[palette] ? palette : 'emerald', P = PALETTES[name], W = skyFor(name), k = bloomK();
    var L = lightOn(name, null), C = colours(name, L);
    waves(ctx, w, h, now, name, L, C);
    if (k > 0.01) bloomWater(ctx, 0, 0, w, h, 0, 0, now, name, k);
    skyLight(ctx, w, h, now, L, C, null);
    glints(ctx, w, h, now, P, null, W, k, name);
  }

  // ---- water over a scene (shore.png) -------------------------------------------------
  var shores = {};
  var CAUSTIC = 110;          // depth byte below which light ripples on the bed
  var SHELF = [34, 72, 118];  // depth bytes where the water steps down a band (wandered by a slow noise: shelves, not rings)
  var BAND_A = [0.4, 0.6, 0.8, 1];      // the water's opacity in each band, shallow to deep
  var BAND_T = [0.3, 0.18, 0.08, 0];    // and the shallows' pale tint over it
  var MAXR = 40;              // how far down the water a reflection reaches (px)

  function loadShore(sc) {
    var S = shores[sc.id];
    if (S) return S.ready ? S : null;
    S = shores[sc.id] = { ready: false };
    var img = new Image();
    img.onload = function () {
      var W = img.width, H = img.height;
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      var px = cx.getImageData(0, 0, W, H).data;
      var reach = (sc.meta.water && sc.meta.water.reach) || 14;
      // the water's opacity over the render, in flat bands: thin in the shallows, solid in the deep
      var mask = document.createElement('canvas');
      mask.width = W; mask.height = H;
      var mctx = mask.getContext('2d');
      var md = mctx.createImageData(W, H), m = md.data;
      var water = new Uint8Array(W * H), band = new Uint8Array(W * H).fill(255), idx = [], dd = [], dep = [], bd = [];
      var gw = (W >> 2) + 2, gh = (H >> 2) + 2, n1 = new Float32Array(gw * gh), gw2 = (W >> 1) + 2, n2 = new Float32Array(gw2 * ((H >> 1) + 2));
      for (var gy = 0; gy < gh; gy++) for (var gx = 0; gx < gw; gx++) n1[gy * gw + gx] = periodicNoise(gx * 4 / 46, gy * 4 / 34, 4096, 4096, 5) - 0.5;
      for (gy = 0; gy < (H >> 1) + 2; gy++) for (gx = 0; gx < gw2; gx++) n2[gy * gw2 + gx] = periodicNoise(gx * 2 / 13, gy * 2 / 10, 4096, 4096, 9) - 0.5;
      for (var i = 0; i < W * H; i++) {
        var dist = px[i * 4], depth = px[i * 4 + 1], empty = px[i * 4 + 2] > 127;
        if (depth > 0) {
          var x = i % W, y = (i - x) / W;
          var dj = depth + n1[(y >> 2) * gw + (x >> 2)] * 44 + n2[(y >> 1) * gw2 + (x >> 1)] * 12;
          var b = dj < SHELF[0] ? 0 : dj < SHELF[1] ? 1 : dj < SHELF[2] ? 2 : 3;
          band[i] = b;
          m[i * 4 + 3] = Math.round(255 * BAND_A[b]);
        }
        if (depth > 0 || empty) water[i] = 1;
        if ((dist <= reach && water[i]) || (depth > 0 && (depth < CAUSTIC || band[i] < 3))) {
          idx.push(i); dd.push(Math.min(255, dist)); dep.push(depth);
        }
      }
      mctx.putImageData(md, 0, 0);
      for (var q = 0; q < idx.length; q++) {         // each one's band, and a step onto a shallower shelf (the shelf's lip)
        var p = idx[q], bb = band[p], up = p >= W ? band[p - W] : 255, lf = p % W ? band[p - 1] : 255;
        bd.push(bb === 255 ? 255 : bb | ((up !== 255 && up < bb) || (lf !== 255 && lf < bb) ? 16 : 0));
      }
      S.calm = shelter(water, px, W, H);
      var layer = document.createElement('canvas');
      layer.width = W; layer.height = H;
      var anim = document.createElement('canvas');
      anim.width = W; anim.height = H;
      var actx = anim.getContext('2d');
      S.W = W; S.H = H; S.reach = reach; S.mask = mask; S.water = water; S.band = band;
      S.layer = layer; S.lctx = layer.getContext('2d');
      S.anim = anim; S.actx = actx; S.aimg = actx.createImageData(W, H);
      S.idx = new Int32Array(idx); S.dd = new Uint8Array(dd); S.dep = new Uint8Array(dep); S.bd = new Uint8Array(bd);
      S.nz = noiseOf(S.idx, W);
      S.segs = mirrorSegs(water, band, W, H);
      S.stamp = -1; S.palette = null;
      S.ready = true;
    };
    img.src = '/bridge/assets/scenes/' + sc.id + '/shore' + (sc.ext || '.png') + (sc.q || '');
    if (sc.meta.glow) {                                // what gives off light, alone: the lamps' streaks down the water
      var gi = new Image();
      gi.onload = function () { S.glow = gi; S.rv = null; };
      gi.src = '/bridge/assets/scenes/' + sc.id + '/glow' + (sc.ext || '.png') + (sc.q || '');
    }
    return null;
  }

  // ---- sheltered water: harbours, coves and the water along a quay lie still (Look Book 2's harbour: calm and darker,
  // the swell's bands gone, only a few wavelets; the mirror reads on it). How sheltered each patch is comes from rays
  // cast toward the land in eight directions on a coarse grid (8 px), at load: land close by on most sides is a harbour,
  // land close on one side is a quay's edge. Spread to full size with a wandering edge in two flat steps (half, still).
  // Returns an alpha mask the size of the render, or null when the island has no sheltered water.
  var CG = 8, RAYS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  function shelter(water, px, W, H) {
    var gw = Math.ceil(W / CG), gh = Math.ceil(H / CG), land = new Uint8Array(gw * gh), g = new Float32Array(gw * gh), any = false, x, y;
    for (y = 0; y < gh; y++) for (x = 0; x < gw; x++) {
      var p = Math.min(H - 1, y * CG + 4) * W + Math.min(W - 1, x * CG + 4);
      land[y * gw + x] = water[p] ? 0 : 1;
    }
    for (y = 0; y < gh; y++) for (x = 0; x < gw; x++) {
      if (land[y * gw + x]) continue;
      var hits = 0, near = 99;
      for (var r = 0; r < 8; r++) {
        for (var k = 1; k <= 22; k++) {
          var xx = x + RAYS[r][0] * k, yy = y + RAYS[r][1] * k;
          if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) break;
          if (land[yy * gw + xx]) { hits++; near = Math.min(near, k); break; }
        }
      }
      var v = hits >= 5 ? 1 : hits >= 4 ? 0.75 : hits >= 3 ? 0.45 : 0;
      v = Math.max(v, near <= 2 ? 0.7 : near <= 4 ? 0.4 : 0);
      g[y * gw + x] = v;
      if (v > 0) any = true;
    }
    if (!any) return null;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var cx = c.getContext('2d'), img = cx.createImageData(W, H), d = img.data;
    for (y = 0; y < H; y++) {
      var fy = y / CG - 0.5, y0 = Math.max(0, Math.floor(fy)), y1 = Math.min(gh - 1, y0 + 1), ty = Math.max(0, Math.min(1, fy - y0));
      for (x = 0; x < W; x++) {
        var i = y * W + x;
        if (!water[i] || !px[i * 4 + 1]) continue;
        var fx = x / CG - 0.5, x0 = Math.max(0, Math.floor(fx)), x1 = Math.min(gw - 1, x0 + 1), tx = Math.max(0, Math.min(1, fx - x0));
        var vv = (g[y0 * gw + x0] * (1 - tx) + g[y0 * gw + x1] * tx) * (1 - ty) + (g[y1 * gw + x0] * (1 - tx) + g[y1 * gw + x1] * tx) * ty;
        vv += (hash((x >> 2) * 131 + (y >> 2) * 977) - 0.5) * 0.18;
        var a = vv > 0.32 ? 1 : 0;
        if (a) d[i * 4 + 3] = Math.round(a * 255);
      }
    }
    cx.putImageData(img, 0, 0);
    return c;
  }
  // the still water's flat body over the swell, where it's sheltered: deep's colour with a little of the body's, darker
  // by night, in step with the light (the colours come from the live light's hour when there is one)
  var calmC = null, calmX = null;
  function calmOver(L, S, v, C, Lw) {
    if (!calmC) { calmC = document.createElement('canvas'); calmX = calmC.getContext('2d'); }
    if (calmC.width < v[2] || calmC.height < v[3]) { calmC.width = Math.max(calmC.width, v[2]); calmC.height = Math.max(calmC.height, v[3]); }
    calmX.globalCompositeOperation = 'source-over'; calmX.globalAlpha = 1;
    calmX.clearRect(0, 0, v[2], v[3]);
    calmX.drawImage(S.calm, v[0], v[1], v[2], v[3], 0, 0, v[2], v[3]);
    calmX.globalCompositeOperation = 'source-in';
    // Look Book 2's still water (js/litscene.js's bands as its harbour shows them): teal-grey by day, a warm grey at
    // golden hour, a deep blue at night; a fifth of the sea's own body kept so each sea's harbours are still its own
    var lb = mixc(mixc([24, 32, 56], [92, 98, 104], Lw.aD), [70, 106, 128], Lw.day * (1 - Lw.golden));
    lb = mixc(lb, [104, 100, 104], Lw.golden * (1 - Lw.night));
    calmX.fillStyle = rgb(mixc(lb, C.base, 0.2));
    calmX.fillRect(0, 0, v[2], v[3]);
    L.globalAlpha = 1 - 0.6 * Math.max(Lw.storm, 0.7 * Lw.gale);      // a storm reaches in even here
    L.drawImage(calmC, 0, 0, v[2], v[3], v[0], v[1], v[2], v[3]);
    L.globalAlpha = 1;
  }

  // Where the water mirrors what stands above it: in each column, every place the water begins under something that
  // isn't water (a bank, a quay, a pier, a hull, a rock) — the waterline — and how far down it the mirror reaches (as far
  // as the thing is tall, as the water runs, MAXR at most). Neighbouring columns with the same line and reach are one
  // run: [x, waterline row, columns, reach] four to a run, sorted by row.
  function mirrorSegs(water, band, W, H) {
    var runs = [], open = null;
    var lineAt = new Int32Array(W).fill(-1), lenAt = new Int32Array(W);
    var segs = [];
    for (var x = 0; x < W; x++) {
      var land = 0;
      for (var y = 0; y < H; y++) {
        var p = y * W + x;
        if (!water[p]) { land++; continue; }
        if (land >= 2 && band[p] !== 255) {
          var run = 0;
          while (run < MAXR && y + run < H && water[(y + run) * W + x]) run++;
          var len = Math.min(land, run, MAXR);
          if (len >= 3) segs.push([x, y, len]);
        }
        land = 0;
      }
    }
    segs.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i], last = out.length ? out.length - 4 : -1;
      if (last >= 0 && out[last + 1] === s[1] && out[last + 3] === s[2] && out[last] + out[last + 2] === s[0]) out[last + 2]++;
      else out.push(s[0], s[1], 1, s[2]);
    }
    return new Int32Array(out);
  }

  // Each shore pixel's grain (fixed by where it is), worked out once rather than every stamp.
  function noiseOf(idx, W) {
    var nz = new Float32Array(idx.length);
    for (var k = 0; k < idx.length; k++) {
      var p = idx[k], x = p % W, y = (p - x) / W;
      nz[k] = hash((x >> 1) * 131 + (y >> 1) * 977);
    }
    return nz;
  }
  // The view and a margin round it (room for the camera to move until the next stamp), clamped
  // to the render: [x0, y0, x1, y1]. Only this much of an island's water is worked each stamp.
  function around(v, W, H, M) {
    M = M || 96;
    return [Math.max(0, v[0] - M), Math.max(0, v[1] - M), Math.min(W, v[0] + v[2] + M), Math.min(H, v[1] + v[3] + M)];
  }
  // the first k with idx[k] >= p (the shore's pixel list is in row order)
  function lowerBound(idx, p) {
    var lo = 0, hi = idx.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (idx[m] < p) lo = m + 1; else hi = m; }
    return lo;
  }

  // ---- the mirror: what stands above the water, upside down under its waterline, darkened to the water's colour,
  // fading in three steps down it; and the lamps' light smeared down the water after dark. Made for the view and a
  // margin round it (a canvas the size of the screen, not of the island) whenever the view leaves that, the picture
  // above the water changes (a new live-light composition, or the baked light state that shows most), or the light
  // does; then drawn a dozen times a second with each row nudged sideways on a slow wave (the ripple).
  var FADE = [[0, 8, 0.9], [8, 20, 0.6], [20, MAXR, 0.3]];
  function mirrorSource(sc) {
    if (sc.lit && sc.lit.cur) return { img: sc.lit.cur.canvas, key: sc.lit.cur };
    var W = typeof BridgeScene !== 'undefined' && BridgeScene.skyOf ? BridgeScene.skyOf(sc) : null, st = sc.meta.states[0];
    if (W) st = W.day >= W.dusk && W.day >= W.night ? W.cy.day : W.dusk >= W.night ? W.cy.dusk : W.cy.night;
    var img = sc.imgs && sc.imgs[st];
    return img ? { img: img, key: img } : null;
  }
  function mirror(S, sc, v, C, L) {
    var src = mirrorSource(sc);
    if (!src) return null;
    var R = S.rv, ck = C.key + '|' + Math.round(L.night * 8);
    if (R && R.src === src.key && R.ck === ck && R.glow === !!S.glow && v[0] >= R.x0 && v[1] >= R.y0 && v[0] + v[2] <= R.x1 && v[1] + v[3] <= R.y1) return R;
    var A = around(v, S.W, S.H, 128), x0 = A[0], y0 = A[1], w = A[2] - x0, h = A[3] - y0;
    if (!R) R = S.rv = { c: document.createElement('canvas'), g: document.createElement('canvas'), w2: document.createElement('canvas') };
    [R.c, R.g, R.w2].forEach(function (cv) { if (cv.width < w || cv.height < h) { cv.width = Math.max(cv.width, w); cv.height = Math.max(cv.height, h); } });
    R.x0 = x0; R.y0 = y0; R.x1 = A[2]; R.y1 = A[3]; R.w = w; R.h = h; R.src = src.key; R.ck = ck; R.glow = !!S.glow;
    var g = R.c.getContext('2d'), gg = S.glow ? R.g.getContext('2d') : null, segs = S.segs, rows = R.rows = new Uint8Array(h);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, R.c.width, R.c.height);
    if (gg) { gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-over'; gg.globalAlpha = 1; gg.clearRect(0, 0, R.g.width, R.g.height); }
    var any = false;
    for (var i = lowerBound4(segs, y0 - MAXR); i < segs.length; i += 4) {
      var sx = segs[i], s = segs[i + 1], n = segs[i + 2], len = segs[i + 3];
      if (s >= A[3]) break;
      if (s + len <= y0 || sx >= A[2] || sx + n <= x0) continue;
      any = true;
      g.setTransform(1, 0, 0, -1, -x0, 2 * s - y0);                // y below the line = the row as far above it
      for (var f = 0; f < FADE.length; f++) {
        var a = FADE[f][0], b = Math.min(FADE[f][1], len);
        if (b <= a) break;
        g.globalAlpha = FADE[f][2];
        g.drawImage(src.img, sx, s - b, n, b - a, sx, s - b, n, b - a);
      }
      if (gg) { gg.setTransform(1, 0, 0, -1, -x0, 2 * s - y0); gg.drawImage(S.glow, sx, s - len, n, len, sx, s - len, n, len); }
      for (var y = Math.max(0, s - y0); y < Math.min(h, s + len + 14 - y0); y++) rows[y] = 1;
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    // the water's own colour over it: a reflection is darker and takes the sea's tone
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = rgb(mixc(C.deep, C.base, 0.4), (0.3 + 0.2 * L.day).toFixed(2));
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    if (gg) {                                                    // the lamps' light, smeared down the water
      var wg = R.w2.getContext('2d');
      wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalCompositeOperation = 'source-over'; wg.globalAlpha = 1; wg.clearRect(0, 0, R.w2.width, R.w2.height);
      for (var d = 0; d <= 6; d++) { wg.globalAlpha = d < 2 ? 1 : d < 4 ? 0.6 : 0.3; wg.drawImage(R.g, 0, 0, w, h, 0, d * 2, w, h); }
      wg.globalAlpha = 1; wg.globalCompositeOperation = 'destination-in';
      wg.drawImage(S.mask, x0, y0, w, h, 0, 0, w, h);
      wg.globalCompositeOperation = 'source-over';
    }
    R.any = any; R.at = -1;
    return R;
  }
  function lowerBound4(segs, row) {                 // the first run at or below `row` (runs are sorted by row)
    var lo = 0, hi = segs.length / 4;
    while (lo < hi) { var m = (lo + hi) >> 1; if (segs[m * 4 + 1] < row) lo = m + 1; else hi = m; }
    return lo * 4;
  }
  function drawMirror(ctx, S, sc, bx, by, v, now, C, L) {
    var R = mirror(S, sc, v, C, L);
    if (!R || !R.any) return;
    if (!R.rp) { R.rp = document.createElement('canvas'); R.rx = R.rp.getContext('2d'); }
    var rip = R.rp, ripx = R.rx;
    if (rip.width < R.w || rip.height < R.h) { rip.width = Math.max(rip.width, R.w); rip.height = Math.max(rip.height, R.h); }
    var t = Math.floor(now / 90);
    if (R.at !== t) {                                         // the ripple: each row nudged on a slow wave, in whole pixels
      R.at = t;
      ripx.clearRect(0, 0, R.w, R.h);
      var amp = 1.3 + 1.2 * L.rain + 1.6 * L.gale, tt = now / 1000;
      for (var y = 0; y < R.h; y++) {
        if (!R.rows[y]) continue;
        var wy = y + R.y0, off = Math.round(amp * (Math.sin(wy * 0.8 + tt * 1.8) + 0.5 * Math.sin(wy * 2.1 - tt * 2.4)) / 1.5);
        ripx.drawImage(R.c, 0, y, R.w, 1, off, y, R.w, 1);
      }
    }
    ctx.save();
    ctx.globalAlpha = (1 - 0.5 * L.fog) * (1 - 0.3 * L.storm);
    ctx.drawImage(rip, 0, 0, R.w, R.h, bx + R.x0, by + R.y0, R.w, R.h);
    // lit windows and lanterns streaking down the water after dark
    var gk = clamp((L.night + 0.5 * L.dusk - 0.3) / 0.5, 0, 1);
    if (S.glow && gk > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8 * gk * (1 - 0.5 * L.fog);
      ctx.drawImage(R.w2, 0, 0, R.w, R.h, bx + R.x0 + (Math.floor(now / 420) % 3 === 1 ? 1 : 0), by + R.y0, R.w, R.h);
    }
    ctx.restore();
  }

  function animate(S, P, now, v, k, name, C, L) {
    var d = S.aimg.data;
    var sh = P.shallow.split(',').map(Number), fo = P.foam.split(',').map(Number);
    // the bloom: the shallows, the surf and the foam lit by the spores (the sea's own light; its brightest at the crests)
    var bl = k > 0.01, hu = bl ? BridgeBloom.hue(name).split(',').map(Number) : sh, co = bl ? BridgeBloom.core(name).split(',').map(Number) : fo;
    if (bl) {
      sh = sh.map(function (c, i) { return Math.round(c + (hu[i] - c) * k); });
      fo = fo.map(function (c, i) { return Math.round(c + (co[i] - c) * k); });
    }
    var t = now / 520, tc = now / 900, rough = 1 + 0.8 * Math.max(L.storm, 0.6 * L.gale);
    var reach = S.reach, W = S.W, R = around(v, W, S.H), n = S.idx.length;
    for (var y = R[1]; y < R[3]; y++) {
      var row = y * W, end = row + R[2];
      d.fill(0, (row + R[0]) * 4, end * 4);
      for (var i = lowerBound(S.idx, row + R[0]); i < n && S.idx[i] < end; i++) {
        var p = S.idx[i], dist = S.dd[i], depth = S.dep[i], bd = S.bd[i];
        var x = p - row;
        var hx = x >> 1, hy = y >> 1;
        var nz = S.nz[i];
        var r = 0, g = 0, b = 0, al = 0;
        // the shallows pale over the bed, a band at a time, the lip of each shelf a little lighter
        if (bd !== 255) { r = sh[0]; g = sh[1]; b = sh[2]; al = BAND_T[bd & 15] + (bd & 16 ? 0.1 : 0); }
        // light rippling on the shallow bed
        if (depth > 0 && depth < CAUSTIC) {
          var cv = Math.sin(hx * 0.42 + 1.8 * Math.sin(hy * 0.23 + tc * 0.8)) +
                   Math.sin(hy * 0.37 - tc * 0.6 + 1.6 * Math.sin(hx * 0.19 - tc * 0.5));
          if (Math.abs(cv) < 0.2) { r = sh[0]; g = sh[1]; b = sh[2]; al = Math.max(al, (depth < CAUSTIC / 2 ? 0.32 : 0.2) * (bl ? 1 + 0.3 * k : 1)); }
        }
        if (dist <= reach) {
          var f = 1 - dist / reach;
          if (al < 0.14 * f * f) { r = sh[0]; g = sh[1]; b = sh[2]; al = 0.14 * f * f; }      // pale water at the edge
          var wash = Math.sin(t * 1.3 + nz * 6.3);
          if (bl) {                                          // the shallows glowing, a band that swells as each wave comes in
            var gl = k * (0.42 * f * f * f + (dist <= 3 ? 0.16 : 0) + (dist <= 6 && wash > 0.3 ? 0.3 * (wash - 0.3) : 0));
            gl = Math.round(gl * 8) / 8;                     // in flat steps, not a smooth ramp
            if (gl > al) { r = hu[0]; g = hu[1]; b = hu[2]; al = gl; }
          }
          // surf rolling in: lines of foam in toward the shore, broken into dashes, flat (two strengths)
          var wave = Math.sin(dist * 0.62 - t * rough + nz * 1.4);
          if (dist <= 9 * rough && wave > 0.9 - 0.08 * rough && nz > 0.22) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, (dist <= 4 ? 0.62 : 0.4) + 0.4 * (k || 0)); }
          // the lap line at the waterline, breathing in and out a pixel, with gaps
          var lap = wash > 0.45 ? 2 : 1;
          if (dist <= lap && (wash > -0.3 || dist <= 1) && nz > 0.08) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, (dist <= 1 ? 0.85 : 0.6) + 0.15 * (k || 0)); }
        }
        if (al > 0) {
          var o = p * 4;
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(Math.min(1, al) * 255);
        }
      }
    }
    S.actx.putImageData(S.aimg, 0, 0, R[0], R[1], R[2] - R[0], R[3] - R[1]);
  }

  function drawWater(ctx, sc, offX, offY, now, palette) {
    if (!sc.meta.water) { drawShore(ctx, sc, offX, offY, now, palette); return; }
    var S = loadShore(sc);
    if (!S) return;
    var name = PALETTES[palette] ? palette : 'emerald', W = skyFor(name, sc), P = litPalette(name, W);
    var Lw = lightOn(name, sc), C = colours(name, Lw);
    var bx = Math.round(offX - sc.meta.originX), by = Math.round(offY - sc.meta.originY);
    // only the part on screen is rebuilt and drawn (an island's water is the size of its render)
    var v = BridgeScene.visible(S.W, S.H, bx, by, ctx.canvas.width, ctx.canvas.height);
    if (!v) return;
    // the moving sea, cut to the water's opacity
    var L = S.lctx;
    L.save();
    L.beginPath();
    L.rect(v[0], v[1], v[2], v[3]);
    L.clip();
    L.globalCompositeOperation = 'source-over';
    L.clearRect(v[0], v[1], v[2], v[3]);
    L.drawImage(S.mask, v[0], v[1], v[2], v[3], v[0], v[1], v[2], v[3]);
    // one fill per layer: a composite like source-in applies to the whole
    // clip on every draw, so the texture goes in as a pattern, not tiles
    var D = drift(now);
    L.globalCompositeOperation = 'source-in';
    fillPattern(L, texture(name, 0, C), S.W, S.H, D.ax + bx, D.ay + by, 1);
    L.globalCompositeOperation = 'source-atop';
    fillPattern(L, texture(name, 1, C), S.W, S.H, D.bx + bx, D.by + by, 1);
    if (S.calm) calmOver(L, S, v, C, Lw);                     // over the swell and its wavelets: still water
    var cap = capAlpha(Lw);
    if (cap) fillPattern(L, texture(name, 2, C), S.W, S.H, D.cx + bx, D.cy + by, cap);
    // the bloom: the open sea's currents carried on over the island's water at its opacity (so it meets the open sea
    // without a seam and thins over the shallows, where the surf, in animate, takes over)
    var k = bloomK();
    if (k > 0.01) bloomWater(L, v[0], v[1], v[0] + v[2], v[1] + v[3], bx, by, now, name, k, 'source-atop');
    L.restore();
    ctx.drawImage(S.layer, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
    // what stands above the water, mirrored in it; the lamps streaking down it after dark
    drawMirror(ctx, S, sc, bx, by, v, now, C, Lw);
    // the shallows' bands, ripples and foam
    var stamp = Math.floor(now / 70), pk = name + P.shallow + P.foam + Math.round(k * 20) + '|' + Math.round(Lw.storm * 4 + Lw.gale * 2);
    if (S.stamp !== stamp || S.palette !== pk) { S.stamp = stamp; S.palette = pk; animate(S, P, now, v, k, name, C, Lw); }
    ctx.drawImage(S.anim, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
    var isW = function (x, y) {
      var px = x - bx, py = y - by;
      if (px < 0 || py < 0 || px >= S.W || py >= S.H) return true;
      return S.water[py * S.W + px] === 1;
    };
    skyLight(ctx, ctx.canvas.width, ctx.canvas.height, now, Lw, C, function (x, y) {   // on open water, not the shallows
      var px = x - bx, py = y - by;
      if (px < 0 || py < 0 || px >= S.W || py >= S.H) return true;
      var b = S.band[py * S.W + px];
      return S.water[py * S.W + px] === 1 && (b === 255 || b >= 2);
    });
    glints(ctx, ctx.canvas.width, ctx.canvas.height, now, P, isW, W, k, name);
  }

  // ---- older scenes: foam round the silhouette ----------------------------------------
  var REACH = 16;
  var bands = {};

  function bandOf(sc) {
    if (bands[sc.id]) return bands[sc.id];
    var img = sc.baseImgs && (sc.baseImgs.full || sc.baseImgs[sc.meta.states[0]]);
    if (!img) return null;
    var W = img.width, H = img.height;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    var a = cx.getImageData(0, 0, W, H).data;
    var dist = new Uint8Array(W * H);
    dist.fill(255);
    var q = new Int32Array(W * H), qh = 0, qt = 0;
    for (var i = 0; i < W * H; i++) if (a[i * 4 + 3] > 0) { dist[i] = 0; q[qt++] = i; }
    while (qh < qt) {                       // breadth-first out from the land
      var p = q[qh++], d = dist[p];
      if (d >= REACH) continue;
      var x = p % W, y = (p - x) / W;
      var nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (var k = 0; k < 4; k++) {
        var n = nb[k];
        if (n >= 0 && dist[n] > d + 1) { dist[n] = d + 1; q[qt++] = n; }
      }
    }
    var idx = [], ds = [];
    for (var j = 0; j < W * H; j++) if (dist[j] > 0 && dist[j] <= REACH) { idx.push(j); ds.push(dist[j]); }
    var out = document.createElement('canvas');
    out.width = W; out.height = H;
    var octx = out.getContext('2d');
    var bi = new Int32Array(idx);
    bands[sc.id] = { W: W, H: H, idx: bi, ds: new Uint8Array(ds), nz: noiseOf(bi, W), canvas: out, ctx: octx,
                     img: octx.createImageData(W, H), stamp: -1 };
    return bands[sc.id];
  }

  function drawShore(ctx, sc, offX, offY, now, palette) {
    var S = bandOf(sc);
    if (!S) return;
    var P = PALETTES[palette] || PALETTES.emerald;
    var bx = Math.round(offX - sc.meta.originX), by = Math.round(offY - sc.meta.originY);
    var v = BridgeScene.visible(S.W, S.H, bx, by, ctx.canvas.width, ctx.canvas.height);
    if (!v) return;
    var stamp = Math.floor(now / 70);
    if (S.stamp !== stamp) {
      S.stamp = stamp;
      var d = S.img.data, R = around(v, S.W, S.H), n = S.idx.length;
      var sh = P.shallow.split(',').map(Number), fo = P.foam.split(',').map(Number);
      var bk = bloomK();
      if (bk > 0.01) {                                       // the bloom: the band and the foam in the spores' light
        var nm = PALETTES[palette] ? palette : 'emerald';
        sh = BridgeBloom.foam(nm, P.shallow, bk).split(',').map(Number); fo = BridgeBloom.foam(nm, P.foam, bk).split(',').map(Number);
      }
      var t = now / 520;
      for (var y = R[1]; y < R[3]; y++) {
        var row = y * S.W, end = row + R[2];
        d.fill(0, (row + R[0]) * 4, end * 4);
        for (var i = lowerBound(S.idx, row + R[0]); i < n && S.idx[i] < end; i++) {
          var p = S.idx[i], dd = S.ds[i];
          var nz = S.nz[i];
          var f = 1 - dd / REACH;
          var r = sh[0], g = sh[1], b = sh[2];
          var al = 0.3 * f * f;
          var wave = Math.sin(dd * 0.7 + t + nz * 2.2);
          if (dd <= 9 && wave > 0.8 - nz * 0.22) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, 0.5 * (1 - dd / 10)); }
          if (dd <= 2 && Math.sin(t * 1.4 + nz * 6.3) > -0.35) { r = fo[0]; g = fo[1]; b = fo[2]; al = 0.7; }
          var o = p * 4;
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(al * 255);
        }
      }
      S.ctx.putImageData(S.img, 0, 0, R[0], R[1], R[2] - R[0], R[3] - R[1]);
    }
    ctx.drawImage(S.canvas, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
  }

  /** The open sea seen from a camera at (camX, camY) in the caller's own space (the voyage). */
  function drawSeaAt(ctx, w, h, now, palette, camX, camY) {
    camOverride = [camX, camY];
    try { drawSea(ctx, w, h, now, palette); } finally { camOverride = null; }
  }

  /** An island's water seen from a camera of the caller's own (the sloop's passage), so it meets that open sea. */
  function drawWaterAt(ctx, sc, offX, offY, now, palette, camX, camY) {
    camOverride = [camX, camY];
    try { drawWater(ctx, sc, offX, offY, now, palette); } finally { camOverride = null; }
  }

  // drop an island's water canvases when its scene is let go (js/scene.js)
  function forget(id) { delete shores[id]; delete bands[id]; }

  // after the canvas was lost: every texture and mask is made again as it's next needed
  function reset() { tex = {}; shores = {}; bands = {}; gtex = {}; }

  return { _light: function (name, id) { var sc = id && typeof BridgeScene !== 'undefined' ? BridgeScene.get(id) : null; var L = lightOn(name || 'emerald', sc); return { L: L, C: colours(name || 'emerald', L) }; },
           drawSea: drawSea, drawSeaAt: drawSeaAt, drawWater: drawWater, drawWaterAt: drawWaterAt, palettes: PALETTES, forget: forget, reset: reset, setSeaCycles: setSeaCycles };
})();
