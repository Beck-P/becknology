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
    ox = ((Math.round(ox) % TW) + TW) % TW;
    oy = ((Math.round(oy) % TH) + TH) % TH;
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

  function waves(ctx, w, h, now, palette, sx, sy) {
    var D = drift(now);
    tiled(ctx, texture(palette, 1), w, h, D.ax + sx, D.ay + sy, 1);
    tiled(ctx, texture(palette, 2), w, h, D.bx + sx, D.by + sy, 0.45);
  }

  // moon glints and drifting spores, on a world-anchored grid; `isWater`
  // (screen x, y) filters them to the water over a scene
  function glints(ctx, w, h, now, P, isWater) {
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
        if (tw > 0.6 && (!isWater || isWater(x, y))) {
          ctx.fillStyle = 'rgba(220,240,255,' + ((tw - 0.6) * 1.6).toFixed(2) + ')';
          ctx.fillRect(x, y, 2 + (tw > 0.9 ? 2 : 0), 1);
        }
        var sx = Math.round(x + Math.sin(now / 2000 + id) * 6), sy = Math.round(y + 20 + Math.cos(now / 2600 + id) * 4);
        if (!isWater || isWater(sx, sy)) {
          ctx.fillStyle = 'rgba(' + P.spore + ',' + (0.25 + 0.35 * Math.abs(Math.sin(now / 900 + id))).toFixed(2) + ')';
          ctx.fillRect(sx, sy, 1, 1);
        }
      }
    }
    ctx.restore();
  }

  /** The open sea, filling the frame (native px), scrolling with the world. */
  function drawSea(ctx, w, h, now, palette) {
    var P = PALETTES[palette] || PALETTES.emerald;
    ctx.fillStyle = 'rgb(' + P.deep.join(',') + ')';
    ctx.fillRect(0, 0, w, h);
    waves(ctx, w, h, now, PALETTES[palette] ? palette : 'emerald', 0, 0);
    glints(ctx, w, h, now, P, null);
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
      S.stamp = -1; S.palette = null;
      S.ready = true;
    };
    img.src = '/bridge/assets/scenes/' + sc.id + '/shore.png' + (sc.q || '');
    return null;
  }

  function animate(S, P, now, v) {
    var d = S.aimg.data;
    d.fill(0);
    var sh = P.shallow.split(',').map(Number), fo = P.foam.split(',').map(Number);
    var t = now / 520, tc = now / 900;
    var reach = S.reach, W = S.W;
    for (var i = 0; i < S.idx.length; i++) {
      var p = S.idx[i], dist = S.dd[i], depth = S.dep[i];
      var x = p % W, y = (p - x) / W;
      var hx = x >> 1, hy = y >> 1;
      var nz = hash(hx * 131 + hy * 977);
      var r = 0, g = 0, b = 0, al = 0;
      // light rippling on the shallow bed
      if (depth > 0 && depth < CAUSTIC) {
        var cv = Math.sin(hx * 0.42 + 1.8 * Math.sin(hy * 0.23 + tc * 0.8)) +
                 Math.sin(hy * 0.37 - tc * 0.6 + 1.6 * Math.sin(hx * 0.19 - tc * 0.5));
        if (Math.abs(cv) < 0.2) { r = sh[0]; g = sh[1]; b = sh[2]; al = 0.26 * (1 - depth / CAUSTIC); }
      }
      if (dist <= reach) {
        var f = 1 - dist / reach;
        if (al < 0.14 * f * f) { r = sh[0]; g = sh[1]; b = sh[2]; al = 0.14 * f * f; }      // pale water at the edge
        // foam lines lapping in toward the shore, broken into flecks
        var wave = Math.sin(dist * 0.7 + t + nz * 2.2);
        if (dist <= 9 && wave > 0.86 - nz * 0.2 && nz > 0.25) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, 0.4 * (1 - dist / 10)); }
        // the wash at the waterline, breathing in and out, with gaps
        var wash = Math.sin(t * 1.3 + nz * 6.3);
        if (dist <= 1 + (wash > 0.5 ? 1 : 0) && wash > -0.2) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, 0.5 - dist * 0.12); }
      }
      if (al > 0) {
        var o = p * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(al * 255);
      }
    }
    // write back round the view only (with room for the camera to move until the next stamp)
    var M = 96, x0 = Math.max(0, v[0] - M), y0 = Math.max(0, v[1] - M);
    S.actx.putImageData(S.aimg, 0, 0, x0, y0, Math.min(S.W, v[0] + v[2] + M) - x0, Math.min(S.H, v[1] + v[3] + M) - y0);
  }

  function drawWater(ctx, sc, offX, offY, now, palette) {
    if (!sc.meta.water) { drawShore(ctx, sc, offX, offY, now, palette); return; }
    var S = loadShore(sc);
    if (!S) return;
    var name = PALETTES[palette] ? palette : 'emerald', P = PALETTES[name];
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
    fillPattern(L, texture(name, 1), S.W, S.H, D.ax + bx, D.ay + by, 1);
    L.globalCompositeOperation = 'source-atop';
    fillPattern(L, texture(name, 2), S.W, S.H, D.bx + bx, D.by + by, 0.45);
    L.restore();
    ctx.drawImage(S.layer, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
    // ripples, shallows and foam
    var stamp = Math.floor(now / 70);
    if (S.stamp !== stamp || S.palette !== name) { S.stamp = stamp; S.palette = name; animate(S, P, now, v); }
    ctx.drawImage(S.anim, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
    glints(ctx, ctx.canvas.width, ctx.canvas.height, now, P, function (x, y) {
      var px = x - bx, py = y - by;
      if (px < 0 || py < 0 || px >= S.W || py >= S.H) return true;
      return S.water[py * S.W + px] === 1;
    });
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
    bands[sc.id] = { W: W, H: H, idx: new Int32Array(idx), ds: new Uint8Array(ds), canvas: out, ctx: octx,
                     img: octx.createImageData(W, H), stamp: -1 };
    return bands[sc.id];
  }

  function drawShore(ctx, sc, offX, offY, now, palette) {
    var S = bandOf(sc);
    if (!S) return;
    var P = PALETTES[palette] || PALETTES.emerald;
    var stamp = Math.floor(now / 70);
    if (S.stamp !== stamp) {
      S.stamp = stamp;
      var d = S.img.data;
      d.fill(0);
      var sh = P.shallow.split(',').map(Number), fo = P.foam.split(',').map(Number);
      var t = now / 520;
      for (var i = 0; i < S.idx.length; i++) {
        var p = S.idx[i], dd = S.ds[i];
        var x = p % S.W, y = (p - x) / S.W;
        var nz = hash((x >> 1) * 131 + (y >> 1) * 977);
        var f = 1 - dd / REACH;
        var r = sh[0], g = sh[1], b = sh[2];
        var al = 0.3 * f * f;
        var wave = Math.sin(dd * 0.7 + t + nz * 2.2);
        if (dd <= 9 && wave > 0.8 - nz * 0.22) { r = fo[0]; g = fo[1]; b = fo[2]; al = Math.max(al, 0.5 * (1 - dd / 10)); }
        if (dd <= 2 && Math.sin(t * 1.4 + nz * 6.3) > -0.35) { r = fo[0]; g = fo[1]; b = fo[2]; al = 0.7; }
        var o = p * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(al * 255);
      }
      S.ctx.putImageData(S.img, 0, 0);
    }
    var bx = Math.round(offX - sc.meta.originX), by = Math.round(offY - sc.meta.originY);
    var v = BridgeScene.visible(S.W, S.H, bx, by, ctx.canvas.width, ctx.canvas.height);
    if (v) ctx.drawImage(S.canvas, v[0], v[1], v[2], v[3], bx + v[0], by + v[1], v[2], v[3]);
  }

  /** The open sea seen from a camera at (camX, camY) in the caller's own space (the voyage). */
  function drawSeaAt(ctx, w, h, now, palette, camX, camY) {
    camOverride = [camX, camY];
    try { drawSea(ctx, w, h, now, palette); } finally { camOverride = null; }
  }

  // drop an island's water canvases when its scene is let go (js/scene.js)
  function forget(id) { delete shores[id]; delete bands[id]; }

  // after the canvas was lost: every texture and mask is made again as it's next needed
  function reset() { tex = {}; patterns = {}; shores = {}; bands = {}; }

  return { drawSea: drawSea, drawSeaAt: drawSeaAt, drawWater: drawWater, palettes: PALETTES, forget: forget, reset: reset };
})();
