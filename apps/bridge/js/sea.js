/**
 * BridgeSea — Lumar's water for the pre-rendered worlds.
 *
 *   BridgeSea.drawSea(ctx, w, h, now, palette)        the open sea, behind a scene
 *   BridgeSea.drawWater(ctx, sc, offX, offY, now, palette)
 *                                                     the water over the scene: drawn
 *                                                     right after the render
 *
 * The sea is two seamless dithered wave textures drifting at different
 * speeds, moon glints and spores glowing in it — continuous, no tile grid.
 *
 * A scene that stands in the sea (assets_coast) is rendered with its banks,
 * beaches and seabed, and scene_post writes shore.png from its height pass:
 * how deep each pixel lies under the surface and how far it is from the
 * waterline. drawWater lays the same moving sea over everything below the
 * surface — thin in the shallows so the sand, rocks and kelp show through,
 * opaque in the deep where it meets the open sea seamlessly — with light
 * rippling on the shallow bed and foam lapping in at the waterline round
 * rocks, beaches, piles and hulls. Older scenes without shore.png get a
 * foam band round their silhouette instead.
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

  // ---- seamless wave textures --------------------------------------------------------
  var TW = 192, TH = 96;
  var tex = {};

  function periodicNoise(x, y, px, py, seed) {
    // value noise on a lattice that wraps every px × py cells
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(i, j) { return hash(((i % px) + px) % px * 57 + ((j % py) + py) % py * 131 + seed * 977); }
    return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
  }

  function fbm(x, y, base, seed, stretch) {
    var n = 0, amp = 0.5, f = 1, tot = 0;
    for (var o = 0; o < 4; o++) {
      var cy = base * f, cx = Math.max(1, Math.round(cy * 2 / (stretch || 1)));
      n += periodicNoise(x / TW * cx, y / TH * cy, cx, cy, seed + o) * amp;
      tot += amp; amp *= 0.5; f *= 2;
    }
    return n / tot;
  }

  function texture(name, seed) {
    var key = name + seed;
    if (tex[key]) return tex[key];
    var P = PALETTES[name];
    var c = document.createElement('canvas');
    c.width = TW; c.height = TH;
    var cx = c.getContext('2d'), img = cx.createImageData(TW, TH), d = img.data;
    var mix = [(P.mid[0] + P.hi[0]) / 2, (P.mid[1] + P.hi[1]) / 2, (P.mid[2] + P.hi[2]) / 2];
    for (var y = 0; y < TH; y++) {
      for (var x = 0; x < TW; x++) {
        // broad swells of light and dark, crossed by thin wave crests:
        // ridged noise stretched sideways, bright only along its ridges
        var body = fbm(x, y, 2, seed, 2);
        var ridge = 1 - Math.abs(fbm(x, y, 6, seed + 10, 4) * 2 - 1);
        ridge = Math.pow(ridge, 10);
        var v = body * 0.7 + ridge * 0.7;
        var q = v * 3.4 - 1.05 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.8;
        var lv = Math.max(0, Math.min(3, Math.floor(q)));
        var col = lv === 0 ? P.deep : lv === 1 ? P.mid : lv === 2 ? mix : P.hi;
        var o2 = (y * TW + x) * 4;
        d[o2] = col[0]; d[o2 + 1] = col[1]; d[o2 + 2] = col[2]; d[o2 + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    tex[key] = c;
    return c;
  }

  function tiled(ctx, t, w, h, ox, oy, alpha) {
    ox = ((Math.round(ox) % TW) + TW) % TW;
    oy = ((Math.round(oy) % TH) + TH) % TH;
    ctx.globalAlpha = alpha;
    for (var y = -oy; y < h; y += TH) {
      for (var x = -ox; x < w; x += TW) ctx.drawImage(t, x, y);
    }
    ctx.globalAlpha = 1;
  }

  var patterns = {};
  function fillPattern(ctx, t, w, h, ox, oy, alpha) {
    var key = t.__key || (t.__key = Math.random().toString(36));
    var pat = patterns[key] || (patterns[key] = ctx.createPattern(t, 'repeat'));
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

  // where the two wave layers sit for screen x = 0, y = 0 (the sea is
  // anchored to the world, so it scrolls with the camera)
  var camOverride = null;      // drawSeaAt: a camera of the caller's own (the voyage)
  function drift(now) {
    var camX, camY;
    if (camOverride) { camX = camOverride[0]; camY = camOverride[1]; }
    else { var v = BridgeWorld.getView(); camX = -v.offX; camY = -v.offY; }
    return { ax: camX + now * 0.006, ay: camY + now * 0.002, bx: camX - now * 0.004 + 37, by: camY + now * 0.0035 + 19,
             camX: camX, camY: camY };
  }

  function waves(ctx, w, h, now, palette, sx, sy, W) {
    var D = drift(now);
    function layer(name, a) {
      if (a <= 0.003) return;
      tiled(ctx, texture(name, 1), w, h, D.ax + sx, D.ay + sy, a);
      tiled(ctx, texture(name, 2), w, h, D.bx + sx, D.by + sy, 0.45 * a);
    }
    if (W && W.day > 0.995) { layer(palette + '@day', 1); return; }
    layer(palette, 1);
    if (!W) return;
    layer(palette + '@dusk', W.dusk + W.night > 0 ? W.dusk / (W.dusk + W.night) : 0);
    layer(palette + '@day', W.day);
  }

  // moon glints and drifting spores, on a world-anchored grid; `isWater`
  // (screen x, y) filters them to the water over a scene
  function glints(ctx, w, h, now, P, isWater, W, k, name) {
    var dark = W ? Math.max(0, 1 - W.day * 1.1) : 1, sparkle = W ? 0.6 - 0.25 * W.day : 0.6;
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
        var tw = Math.sin(now / (380 + hash(id + 2) * 400) + id);
        if (tw > sparkle && (!isWater || isWater(x, y))) {
          ctx.fillStyle = 'rgba(' + (W && W.day > 0.3 ? '255,252,236' : '220,240,255') + ',' + Math.min(1, (tw - sparkle) * 1.6).toFixed(2) + ')';
          ctx.fillRect(x, y, 2 + (tw > 0.9 ? 2 : 0), 1);
        }
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
    ctx.fillStyle = 'rgb(' + (W && W.day > 0.5 ? PALETTES[name + '@day'] : P).deep.join(',') + ')';
    ctx.fillRect(0, 0, w, h);
    waves(ctx, w, h, now, name, 0, 0, W);
    if (k > 0.01) bloomWater(ctx, 0, 0, w, h, 0, 0, now, name, k);
    glints(ctx, w, h, now, P, null, W, k, name);
  }

  // ---- water over a scene (shore.png) -------------------------------------------------
  var shores = {};
  var CAUSTIC = 110;          // depth byte below which light ripples on the bed

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
      // the water's opacity over the render: thin in the shallows, solid in the deep
      var mask = document.createElement('canvas');
      mask.width = W; mask.height = H;
      var mctx = mask.getContext('2d');
      var md = mctx.createImageData(W, H), m = md.data;
      var water = new Uint8Array(W * H), idx = [], dd = [], dep = [];
      for (var i = 0; i < W * H; i++) {
        var dist = px[i * 4], depth = px[i * 4 + 1], empty = px[i * 4 + 2] > 127;
        if (depth > 0) {
          var f = (depth - 1) / 254;
          m[i * 4 + 3] = Math.round(255 * Math.min(1, 0.3 + f * 1.15));
        }
        if (depth > 0 || empty) water[i] = 1;
        if ((dist <= reach && water[i]) || (depth > 0 && depth < CAUSTIC)) {
          idx.push(i); dd.push(Math.min(255, dist)); dep.push(depth);
        }
      }
      mctx.putImageData(md, 0, 0);
      var layer = document.createElement('canvas');
      layer.width = W; layer.height = H;
      var anim = document.createElement('canvas');
      anim.width = W; anim.height = H;
      var actx = anim.getContext('2d');
      S.W = W; S.H = H; S.reach = reach; S.mask = mask; S.water = water;
      S.layer = layer; S.lctx = layer.getContext('2d');
      S.anim = anim; S.actx = actx; S.aimg = actx.createImageData(W, H);
      S.idx = new Int32Array(idx); S.dd = new Uint8Array(dd); S.dep = new Uint8Array(dep);
      S.nz = noiseOf(S.idx, W);
      S.stamp = -1; S.palette = null;
      S.ready = true;
    };
    img.src = '/bridge/assets/scenes/' + sc.id + '/shore' + (sc.ext || '.png') + (sc.q || '');
    return null;
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
  function around(v, W, H) {
    var M = 96;
    return [Math.max(0, v[0] - M), Math.max(0, v[1] - M), Math.min(W, v[0] + v[2] + M), Math.min(H, v[1] + v[3] + M)];
  }
  // the first k with idx[k] >= p (the shore's pixel list is in row order)
  function lowerBound(idx, p) {
    var lo = 0, hi = idx.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (idx[m] < p) lo = m + 1; else hi = m; }
    return lo;
  }

  function animate(S, P, now, v, k, name) {
    var d = S.aimg.data;
    var sh = P.shallow.split(',').map(Number), fo = P.foam.split(',').map(Number);
    // the bloom: the shallows, the surf and the foam lit by the spores (the sea's own light; its brightest at the crests)
    var bl = k > 0.01, hu = bl ? BridgeBloom.hue(name).split(',').map(Number) : sh, co = bl ? BridgeBloom.core(name).split(',').map(Number) : fo;
    if (bl) {
      sh = sh.map(function (c, i) { return Math.round(c + (hu[i] - c) * k); });
      fo = fo.map(function (c, i) { return Math.round(c + (co[i] - c) * k); });
    }
    var t = now / 520, tc = now / 900;
    var reach = S.reach, W = S.W, R = around(v, W, S.H), n = S.idx.length;
    for (var y = R[1]; y < R[3]; y++) {
      var row = y * W, end = row + R[2];
      d.fill(0, (row + R[0]) * 4, end * 4);
      for (var i = lowerBound(S.idx, row + R[0]); i < n && S.idx[i] < end; i++) {
        var p = S.idx[i], dist = S.dd[i], depth = S.dep[i];
        var x = p - row;
        var hx = x >> 1, hy = y >> 1;
        var nz = S.nz[i];
        var r = 0, g = 0, b = 0, al = 0;
        // light rippling on the shallow bed
        if (depth > 0 && depth < CAUSTIC) {
          var cv = Math.sin(hx * 0.42 + 1.8 * Math.sin(hy * 0.23 + tc * 0.8)) +
                   Math.sin(hy * 0.37 - tc * 0.6 + 1.6 * Math.sin(hx * 0.19 - tc * 0.5));
          if (Math.abs(cv) < 0.2) { r = sh[0]; g = sh[1]; b = sh[2]; al = 0.26 * (1 - depth / CAUSTIC) * (bl ? 1 + 0.3 * k : 1); }
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
          // foam lines lapping in toward the shore, broken into flecks
          var wave = Math.sin(dist * 0.7 + t + nz * 2.2);
          if (dist <= 9 && wave > 0.86 - nz * 0.2 && nz > 0.25) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, (0.4 + 0.45 * (k || 0)) * (1 - dist / 10)); }
          // the wash at the waterline, breathing in and out, with gaps
          if (dist <= 1 + (wash > 0.5 ? 1 : 0) && wash > -0.2) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, 0.5 + 0.45 * (k || 0) - dist * 0.12); }
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
    var base = W && W.day > 0.995 ? name + '@day' : name;
    L.globalCompositeOperation = 'source-in';
    fillPattern(L, texture(base, 1), S.W, S.H, D.ax + bx, D.ay + by, 1);
    L.globalCompositeOperation = 'source-atop';
    fillPattern(L, texture(base, 2), S.W, S.H, D.bx + bx, D.by + by, 0.45);
    if (W && base === name) {
      [[name + '@dusk', W.dusk + W.night > 0 ? W.dusk / (W.dusk + W.night) : 0], [name + '@day', W.day]].forEach(function (l) {
        if (l[1] <= 0.003) return;
        fillPattern(L, texture(l[0], 1), S.W, S.H, D.ax + bx, D.ay + by, l[1]);
        fillPattern(L, texture(l[0], 2), S.W, S.H, D.bx + bx, D.by + by, 0.45 * l[1]);
      });
    }
    // the bloom: the open sea's currents carried on over the island's water at its opacity (so it meets the open sea
    // without a seam and thins over the shallows, where the surf, in animate, takes over)
    var k = bloomK();
    if (k > 0.01) bloomWater(L, v[0], v[1], v[0] + v[2], v[1] + v[3], bx, by, now, name, k, 'source-atop');
    L.restore();
    ctx.drawImage(S.layer, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
    // ripples, shallows and foam
    var stamp = Math.floor(now / 70), pk = name + P.shallow + P.foam + Math.round(k * 20);
    if (S.stamp !== stamp || S.palette !== pk) { S.stamp = stamp; S.palette = pk; animate(S, P, now, v, k, name); }
    ctx.drawImage(S.anim, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
    glints(ctx, ctx.canvas.width, ctx.canvas.height, now, P, function (x, y) {
      var px = x - bx, py = y - by;
      if (px < 0 || py < 0 || px >= S.W || py >= S.H) return true;
      return S.water[py * S.W + px] === 1;
    }, W, k, name);
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
  function reset() { tex = {}; patterns = {}; shores = {}; bands = {}; gtex = {}; }

  return { drawSea: drawSea, drawSeaAt: drawSeaAt, drawWater: drawWater, drawWaterAt: drawWaterAt, palettes: PALETTES, forget: forget, reset: reset, setSeaCycles: setSeaCycles };
})();
