/**
 * BridgeNature — the outdoors alive (Beck: "cool little animations… especially the nature… very nice and pretty").
 *
 * Read from the render's leaf pass (scenekit marks each tree's leaves or needles, the grass and still water; js/scene.js
 * keeps it composited with the decor as `sc.leaves`), worked out once per scene image (`sc.rev`) and drawn each frame
 * through the '*' scene hooks, in outdoor worlds only (BridgeClock.outdoor):
 *   - wind: each crown's upper part leans a pixel (two in a gale) as the gusts run east across the map, and the gusts
 *     ripple over the grass — its lit blade tips lean and catch the light as one passes; the grass parts round your
 *     feet as you walk through it;
 *   - water: the sun (or the moon) glinting on ponds, streams and fountains, and rings where a fish rises or rain falls;
 *   - life, on Lumar and Verdance by season, time of day and weather: butterflies over the meadow on fine days in spring
 *     and summer, dragonflies over the water in summer, fireflies at dusk and night in summer, leaves coming down from
 *     the turned trees in autumn and petals from the ones in blossom in spring, and now and then a flock crossing with
 *     its shadow under it — gulls on Lumar, swallows on Verdance.
 * The colours come from the scene as shown (falling leaves are the tree's own, the grass at your feet the grass's own),
 * so they're right for the season the trees were graded to (js/foliage.js).
 *
 *   BridgeNature.covers(sceneId) → {water, grass, fall}: what it's drawing there (the farm's own glints, butterflies and
 *     drifting leaves step aside for it)
 *   BridgeNature._wind(k | null) — hold the wind (0 calm … 2 a gale) · _stats(sceneId) — what it found · _flock(sceneId)
 */
var BridgeNature = (function () {
  var data = {};            // per scene id: what was worked out from its images
  var held = null;          // _wind
  var LIFE = { lumar: true, verdance: true };

  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function wid() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function on(world) {
    var id = wid();
    return !!(world && world.scene && id && typeof BridgeClock !== 'undefined' && BridgeClock.outdoor(id));
  }

  // ---- working it out from the images (once per scene image) -----------------------------------------------------------
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function pixelsOf(img, w, h) {
    var c = canvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, w, h).data;
  }
  function prep(sc) {
    var m = sc.meta, W = m.width, H = m.height, L = sc.leaves, P = { rev: sc.rev, W: W, H: H, trees: [], fall: 0, grass: 0, water: 0 };
    if (!L) return P;
    var day = (m.cycle && m.cycle.day) || m.states[0], img = sc.imgs[day];
    if (!img) return P;
    var px = pixelsOf(img, W, H), depth = sc.depth, n = W * H;
    // the trees: each crown is the run of its pixels with the same tree code (G), leaves or needles
    var lab = new Int32Array(n), stack = new Int32Array(n), tid = 0;
    for (var p0 = 0; p0 < n; p0++) {
      var q0 = p0 * 4;
      if (lab[p0] || !(L[q0] > 127 || L[q0 + 2] > 127)) continue;
      var code = L[q0 + 1], needle = L[q0 + 2] > 127, sp = 0, cnt = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
      tid++;
      stack[sp++] = p0; lab[p0] = tid;
      var members = [];
      while (sp) {
        var p = stack[--sp], x = p % W, y = (p - x) / W;
        members.push(p); cnt++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        var nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
        for (var k = 0; k < 4; k++) {
          var r = nb[k];
          if (r < 0 || lab[r]) continue;
          var rq = r * 4;
          if (L[rq + 1] === code && (L[rq] > 127 || L[rq + 2] > 127)) { lab[r] = tid; stack[sp++] = r; }
        }
      }
      if (cnt < 40) continue;                                       // a sprig, not a crown
      var w = x1 - x0 + 1, h = y1 - y0 + 1, mc = canvas(w, h), mx = mc.getContext('2d'), md = mx.createImageData(w, h), fall = [];
      for (var j = 0; j < members.length; j++) {
        var pp = members[j], xx = pp % W, yy = (pp - xx) / W, safe = true;
        // a crown leans only over what's behind it: never over a roof or another crown nearer the eye
        for (var dx = -2; dx <= 2 && safe; dx++) {
          if (!dx || xx + dx < 0 || xx + dx >= W) continue;
          var nq = pp + dx;
          if (lab[nq] !== tid && px[nq * 4 + 3] && depth && depth[nq] < depth[pp] - 0.02) safe = false;
        }
        if (safe) md.data[((yy - y0) * w + xx - x0) * 4 + 3] = 255;
        // what comes down from it: the turned leaves in autumn, the blossom in spring (as graded — js/foliage.js)
        if (!needle && yy > y0 + h * 0.35 && hash(pp) < 0.06 && fall.length < 24) {
          var R = px[pp * 4], G = px[pp * 4 + 1], B = px[pp * 4 + 2];
          var turned = R > G * 1.12 && R > B * 1.3, bloom = R > 150 && G > 120 && B > 120 && R >= G;
          if (turned || bloom) fall.push([xx, yy, R, G, B, bloom ? 1 : 0]);
        }
      }
      mx.putImageData(md, 0, 0);
      P.trees.push({ x0: x0, y0: y0, w: w, h: h, cx: x0 + w / 2, mask: mc, needle: needle, ph: hash(tid * 7.3) * 6.283,
                     band: Math.max(3, Math.round(h * (needle ? 0.5 : 0.55))), fall: fall });
      P.fall += fall.length;
    }
    // the grass: a mask of it, and of its lit blade tips (lighter than the grass round them) for the gusts to catch
    var gm = canvas(W, H), gx = gm.getContext('2d'), gd = gx.createImageData(W, H), tips = 0;
    var isW = new Uint8Array(n), wpts = [], gpts = [], fpts = [];
    for (var i = 0; i < n; i++) {
      var q = i * 4, R0 = L[q], B0 = L[q + 2];
      if (R0 > 32 && R0 <= 160) {
        P.grass++;
        var lum = px[q] + px[q + 1] + px[q + 2], X = i % W;
        var around = (X > 0 ? px[q - 4] + px[q - 3] + px[q - 2] : lum) + (X < W - 1 ? px[q + 4] + px[q + 5] + px[q + 6] : lum) +
                     (i >= W ? px[q - W * 4] + px[q - W * 4 + 1] + px[q - W * 4 + 2] : lum);
        if (lum * 3 > around + 30) { gd.data[q + 3] = 255; tips++; }
        if (hash(i * 0.37) < 0.004) {
          var green = px[q + 1] >= px[q] && px[q + 1] >= px[q + 2];
          (green ? gpts : fpts).push(i);
        }
      } else if (B0 > 32 && B0 <= 160) {
        P.water++; isW[i] = 1;
        if (hash(i * 0.71) < 0.05) wpts.push(i);
      }
    }
    gx.putImageData(gd, 0, 0);
    P.tips = tips ? gm : null; P.nTips = tips;
    P.isW = isW; P.wpts = wpts; P.gpts = gpts; P.fpts = fpts.length ? fpts : gpts;
    P.ox = m.originX; P.oy = m.originY;
    return P;
  }
  function dataFor(sc) {
    var d = data[sc.id];
    if (!d || d.rev !== sc.rev) {
      var t0 = performance.now();
      d = data[sc.id] = prep(sc);
      d.prepMs = Math.round(performance.now() - t0);
      d.parts = []; d.flies = null; d.rings = []; d.flock = null; d.nextFlock = Date.now() + 8000 + Math.random() * 15000;
    }
    return d;
  }

  // ---- the wind, the light, the season ----------------------------------------------------------------------------------
  var WIND = { calm: 0.7, fair: 0.8, clear: 0.7, cloudy: 0.9, breezy: 1.3, rain: 1.1, fog: 0.4, heat: 0.4, mist: 0.5, snow: 1.0,
               storm: 2.2, gale: 2.4, blizzard: 2.4, starfall: 0.6, smog: 0.5, blackout: 0.8 };
  function windOf(world) {
    if (held != null) return held;
    var w = typeof BridgeWeather !== 'undefined' && BridgeWeather.here ? BridgeWeather.here(wid()) : null;
    if (!w) return 0.8;
    var base = WIND[w.kind] || 0.8;
    return 0.8 + (base - 0.8) * (w.k == null ? 1 : w.k);
  }
  function wetOf(world) {
    var w = typeof BridgeWeather !== 'undefined' && BridgeWeather.here ? BridgeWeather.here(wid()) : null;
    return w && w.def && (w.def.wet || w.def.bad) ? (w.k == null ? 1 : w.k) : 0;
  }
  function skyOf(world) {
    var s = typeof BridgeScene !== 'undefined' && BridgeScene.sky ? BridgeScene.sky(world.scene.id) : null;
    if (s) return { day: s.day, dusk: s.dusk, night: s.night };
    var k = typeof BridgeClock !== 'undefined' ? BridgeClock.sky(wid()) : null;
    return k ? { day: k.sun, dusk: 0, night: 1 - k.sun } : { day: 1, dusk: 0, night: 0 };
  }
  function seasonOf(world) {
    if (typeof BridgeFoliage !== 'undefined' && BridgeFoliage.season) return BridgeFoliage.season(wid());
    return null;
  }

  // ---- drawing ----------------------------------------------------------------------------------------------------------
  var scratch = canvas(64, 64), sx = scratch.getContext('2d');
  function room(w, h) {
    if (scratch.width < w || scratch.height < h) { scratch.width = Math.max(scratch.width, w); scratch.height = Math.max(scratch.height, h); sx = scratch.getContext('2d'); }
  }
  // Lift a masked piece of what's on the canvas now and lay it back shifted: a crown leaning, grass bending.
  // (x, y, w, h) on the canvas, (mx, my) the same corner in the mask; clipped to both. add(s, w, h, cx, cy) can work on
  // the piece before it goes back (cx, cy: how much was clipped off its left and top). Returns the piece's rect or null.
  function shiftPiece(ctx, mask, x, y, w, h, mx, my, dx, add) {
    var cw = ctx.canvas.width, ch = ctx.canvas.height, x0 = x, y0 = y, c;
    if (x < 0) { mx -= x; w += x; x = 0; }
    if (y < 0) { my -= y; h += y; y = 0; }
    if (mx < 0) { x -= mx; w += mx; mx = 0; }
    if (my < 0) { y -= my; h += my; my = 0; }
    if (x + w > cw) w = cw - x;
    if (y + h > ch) h = ch - y;
    if (mx + w > mask.width) w = mask.width - mx;
    if (my + h > mask.height) h = mask.height - my;
    if (w <= 0 || h <= 0) return null;
    room(w, h);
    sx.globalCompositeOperation = 'copy';
    sx.globalAlpha = 1;
    sx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
    sx.globalCompositeOperation = 'destination-in';
    sx.drawImage(mask, mx, my, w, h, 0, 0, w, h);
    if (add) add(sx, w, h, x - x0, y - y0);
    sx.globalCompositeOperation = 'source-over';
    ctx.drawImage(scratch, 0, 0, w, h, x + dx, y, w, h);
    return { x: x + dx, y: y, w: w, h: h };
  }

  // a tree's lean now: the gusts are a wave running east across the map; between them the crown trembles a little
  function lean(T, t, wind) {
    var g = Math.sin(t * (0.55 + 0.25 * wind) - T.cx * 0.011 + T.ph);
    var flutter = Math.sin(t * 2.3 + T.ph * 3) * 0.25;
    var v = (0.25 + 0.75 * g + flutter) * wind * (T.needle ? 0.75 : 1);
    return Math.max(-2, Math.min(2, Math.round(v)));
  }
  function trees(ctx, d, ox, oy, now, wind) {
    var t = now / 1000, cw = ctx.canvas.width, ch = ctx.canvas.height;
    for (var i = 0; i < d.trees.length; i++) {
      var T = d.trees[i], X = ox + T.x0, Y = oy + T.y0;
      if (X > cw || Y > ch || X + T.w < 0 || Y + T.h < 0) continue;
      var s = lean(T, t, wind);
      if (!s) continue;
      if (Math.abs(s) > 1) {                                            // a gale: the top bends further than the middle
        var top = Math.round(T.band * 0.55);
        shiftPiece(ctx, T.mask, X, Y + top, T.w, T.band - top, 0, top, s > 0 ? 1 : -1);
        shiftPiece(ctx, T.mask, X, Y, T.w, top, 0, 0, s);
      } else shiftPiece(ctx, T.mask, X, Y, T.w, T.band, 0, 0, s);
    }
  }

  // the gusts over the grass: a soft band of moving air (wavy, so it doesn't read as a wipe), the lit tips under it leaning
  // a pixel downwind and catching the light
  var BAND_W = 72, BAND_H = 2048, band = null;
  function bandCanvas() {
    if (band) return band;
    band = canvas(BAND_W, BAND_H);
    var bx = band.getContext('2d'), id = bx.createImageData(BAND_W, BAND_H);
    for (var y = 0; y < BAND_H; y++) {
      var c = BAND_W / 2 + Math.sin(y / 256 * Math.PI * 2) * 9 + Math.sin(y / 256 * Math.PI * 6 + 1) * 4;
      for (var x = 0; x < BAND_W; x++) {
        var u = (x - c) / (BAND_W * 0.24);
        id.data[(y * BAND_W + x) * 4 + 3] = Math.round(255 * Math.exp(-u * u));
      }
    }
    bx.putImageData(id, 0, 0);
    return band;
  }
  function gusts(ctx, d, ox, oy, now, wind, light) {
    if (!d.tips) return;
    var period = 520 / Math.max(0.6, wind), speed = 26 + 30 * wind, t = now / 1000, cw = ctx.canvas.width;
    var B = bandCanvas(), first = Math.floor((-ox - BAND_W - t * speed) / period) - 1;
    for (var k = first; k < first + Math.ceil((cw + BAND_W * 2) / period) + 2; k++) {
      var X = Math.round(ox + k * period + t * speed + hash(k) * period * 0.4 - BAND_W / 2);   // where this gust is now
      if (X > cw || X + BAND_W < 0) continue;
      var str = (0.55 + 0.45 * hash(k + 0.5)) * Math.min(1, wind);
      var r = shiftPiece(ctx, d.tips, X, oy, BAND_W, d.H, X - ox, 0, 1, function (s, w, h, cx, cy) {
        s.globalCompositeOperation = 'destination-in';
        s.drawImage(B, cx, cy % 256, w, Math.min(h, BAND_H - cy % 256), 0, 0, w, Math.min(h, BAND_H - cy % 256));
      });
      if (!r) continue;
      ctx.save();                                                       // and they catch the light as they bend
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3 * str * (0.4 + 0.6 * light);
      ctx.drawImage(scratch, 0, 0, r.w, r.h, r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  // the water: glints of the sun or the moon, and rings spreading
  function onWater(d, x, y) { return x >= 0 && y >= 0 && x < d.W && y < d.H && d.isW[y * d.W + x]; }
  function water(ctx, d, ox, oy, now, sky, wet, dt) {
    if (!d.wpts.length) return;
    var cw = ctx.canvas.width, ch = ctx.canvas.height, sun = sky.day + sky.dusk * 0.7;
    var moon = typeof BridgeClock !== 'undefined' ? BridgeClock.moon().light : 0.5;
    var glow = 0.25 + 0.75 * sun, lit = Math.max(sun, sky.night * moon * 0.55);
    for (var i = 0; i < d.wpts.length; i += 3) {
      var p = d.wpts[i], x = p % d.W, y = (p - x) / d.W, X = ox + x, Y = oy + y;
      if (X < 0 || Y < 0 || X >= cw || Y >= ch) continue;
      var a = Math.sin(now / (330 + (i % 7) * 45) + i * 2.31);
      if (a < 0.8) continue;
      var al = (a - 0.8) * 5 * lit;
      ctx.fillStyle = sun > 0.3 ? 'rgba(255,252,236,' + (0.85 * al).toFixed(2) + ')' : 'rgba(205,222,255,' + (0.7 * al).toFixed(2) + ')';
      var len = a > 0.94 ? 3 : 2;
      if (onWater(d, x + len - 1, y)) ctx.fillRect(X, Y, len, 1);
    }
    // a fish rising, a drop of rain: rings
    var rate = (wet ? 1.6 + 6 * wet : 0.35) * Math.min(3, d.wpts.length / 400);
    if (Math.random() < rate * dt && d.rings.length < 24) {
      var q = d.wpts[Math.floor(Math.random() * d.wpts.length)], rx = q % d.W, ry = (q - rx) / d.W, R = wet ? 3 : 5, fits = true;
      for (var a2 = 0; a2 < 8 && fits; a2++) fits = onWater(d, Math.round(rx + Math.cos(a2 * 0.785) * R), Math.round(ry + Math.sin(a2 * 0.785) * R * 0.55));
      if (fits) d.rings.push({ x: rx, y: ry, t0: now, R: R, dur: wet ? 700 : 1500 });
    }
    for (var r = d.rings.length - 1; r >= 0; r--) {
      var g = d.rings[r], k = (now - g.t0) / g.dur;
      if (k >= 1) { d.rings.splice(r, 1); continue; }
      var rad = 1 + k * (g.R - 1), al2 = (1 - k) * 0.55 * glow;
      ctx.fillStyle = 'rgba(214,236,255,' + al2.toFixed(2) + ')';
      var steps = Math.max(8, Math.round(rad * 5));
      for (var s = 0; s < steps; s++) {
        var an = s / steps * 6.283, ex = Math.round(g.x + Math.cos(an) * rad), ey = Math.round(g.y + Math.sin(an) * rad * 0.55);
        if (onWater(d, ex, ey)) ctx.fillRect(ox + ex, oy + ey, 1, 1);
      }
    }
  }

  // what's on the wing (Lumar and Verdance): butterflies, dragonflies, fireflies; a flock now and then
  var WINGS = ['#fff6dc', '#f8d040', '#f09848', '#a8ccff', '#fff6dc', '#f4b0d0'];
  function flies(d, season, sky, wet, view) {
    var want = { butterfly: 0, dragon: 0, firefly: 0 };
    if (!season) return want;
    var s = season.id, f = season.frac == null ? 0.5 : season.frac, calm = wet < 0.3;
    var dayish = sky.day + sky.dusk * 0.3, nightish = sky.night + sky.dusk * 0.5;
    if (calm && dayish > 0.35) {
      want.butterfly = s === 'summer' ? 7 : s === 'spring' ? 5 : s === 'autumn' && f < 0.4 ? 2 : 0;
      want.dragon = d.wpts.length > 40 && (s === 'summer' || (s === 'spring' && f > 0.5)) ? 2 : 0;
    }
    if (calm && nightish > 0.35 && (s === 'summer' || (s === 'spring' && f > 0.6) || (s === 'autumn' && f < 0.25))) want.firefly = 14;
    return want;
  }
  // somewhere near the view to put one: a flower for a butterfly, the water for a dragonfly, the grass for a firefly
  function near(d, list, view) {
    for (var tries = 0; tries < 24; tries++) {
      var p = list[Math.floor(Math.random() * list.length)];
      if (p == null) return null;
      var x = p % d.W, y = (p - x) / d.W;
      if (x > view.x0 - 40 && x < view.x1 + 40 && y > view.y0 - 40 && y < view.y1 + 40) return [x, y];
    }
    return null;
  }
  function life(ctx, d, ox, oy, now, sky, season, wet, view) {
    var want = flies(d, season, sky, wet, view);
    if (!d.flies) d.flies = [];
    // keep about as many as are wanted, near where you are; let the far ones go
    var count = { butterfly: 0, dragon: 0, firefly: 0 };
    d.flies = d.flies.filter(function (b) {
      var keep = b.x > view.x0 - 120 && b.x < view.x1 + 120 && b.y > view.y0 - 120 && b.y < view.y1 + 120 && count[b.k] < want[b.k];
      if (keep) count[b.k]++;
      return keep;
    });
    ['butterfly', 'dragon', 'firefly'].forEach(function (k) {
      for (var n = count[k]; n < want[k]; n++) {
        var at = near(d, k === 'butterfly' ? d.fpts : k === 'dragon' ? d.wpts : d.gpts, view);
        if (!at) break;
        d.flies.push({ k: k, ax: at[0], ay: at[1], x: at[0], y: at[1], ph: Math.random() * 100, col: WINGS[Math.floor(Math.random() * WINGS.length)],
                       tx: at[0], ty: at[1], next: 0 });
      }
    });
    var t = now / 1000;
    ctx.save();
    for (var i = 0; i < d.flies.length; i++) {
      var b = d.flies[i];
      if (b.k === 'butterfly') {
        b.x = b.ax + Math.sin(t * 0.31 + b.ph) * 30 + Math.sin(t * 0.93 + b.ph) * 7;
        b.y = b.ay + Math.cos(t * 0.23 + b.ph) * 18 + Math.sin(t * 1.7 + b.ph) * 4 - 6;
        var X = Math.round(ox + b.x), Y = Math.round(oy + b.y), wing = Math.sin(now / 70 + b.ph) > 0 ? 2 : 1;
        ctx.fillStyle = b.col;
        ctx.fillRect(X - wing, Y, wing, 2); ctx.fillRect(X + 1, Y, wing, 2);
        ctx.fillStyle = '#2a1a10'; ctx.fillRect(X, Y, 1, 2);
      } else if (b.k === 'dragon') {
        if (now > b.next) {                                             // dart, hover, dart
          b.tx = b.ax + (Math.random() - 0.5) * 50; b.ty = b.ay + (Math.random() - 0.5) * 26 - 8;
          b.next = now + 700 + Math.random() * 1400;
        }
        b.x += (b.tx - b.x) * 0.12; b.y += (b.ty - b.y) * 0.12;
        var X2 = Math.round(ox + b.x), Y2 = Math.round(oy + b.y);
        ctx.fillStyle = '#2a8ab0'; ctx.fillRect(X2, Y2, 4, 1);
        ctx.fillStyle = '#1a3a5a'; ctx.fillRect(X2 + 3, Y2, 1, 1);
        if (Math.sin(now / 25 + b.ph) > 0) { ctx.fillStyle = 'rgba(230,245,255,0.7)'; ctx.fillRect(X2 + 1, Y2 - 1, 2, 1); }
      } else {
        b.x = b.ax + Math.sin(t * 0.17 + b.ph) * 22 + Math.sin(t * 0.61 + b.ph * 2) * 5;
        b.y = b.ay + Math.cos(t * 0.13 + b.ph) * 12 + Math.sin(t * 0.47 + b.ph) * 4 - 10;
        var bl = Math.pow(Math.max(0, Math.sin(t * 1.2 + b.ph * 1.7)), 3) * Math.min(1, sky.night + sky.dusk * 0.6);
        if (bl < 0.03) continue;
        var X3 = Math.round(ox + b.x), Y3 = Math.round(oy + b.y);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(150,200,60,' + (0.3 * bl).toFixed(2) + ')'; ctx.fillRect(X3 - 1, Y3 - 1, 3, 3);
        ctx.fillStyle = 'rgba(240,255,150,' + (0.95 * bl).toFixed(2) + ')'; ctx.fillRect(X3, Y3, 1, 1);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
  }

  // leaves coming down from the turned trees in autumn, petals from the blossom in spring
  function falling(ctx, d, ox, oy, now, dt, season, wind, light, view) {
    var s = season && season.id;
    var go = (s === 'autumn' || s === 'spring') && d.fall;
    if (go) {
      var cands = [];
      for (var i = 0; i < d.trees.length; i++) {
        var T = d.trees[i];
        if (T.fall.length && T.x0 + T.w > view.x0 && T.x0 < view.x1 && T.y0 + T.h > view.y0 && T.y0 < view.y1) cands.push(T);
      }
      var rate = cands.length * (s === 'autumn' ? 0.22 + 0.25 * (season.frac || 0.5) : 0.12) * (0.6 + 0.5 * wind);
      if (cands.length && d.parts.length < 70 && Math.random() < rate * dt) {
        var T2 = cands[Math.floor(Math.random() * cands.length)], f = T2.fall[Math.floor(Math.random() * T2.fall.length)];
        d.parts.push({ x: f[0], y: f[1], y0: f[1], c: [f[2], f[3], f[4]], petal: f[5], drop: 14 + Math.random() * 22, vx: (4 + Math.random() * 8) * wind,
                       vy: f[5] ? 6 + Math.random() * 4 : 9 + Math.random() * 6, ph: Math.random() * 10, landed: 0 });
      }
    }
    var k = 0.35 + 0.65 * light;
    for (var j = d.parts.length - 1; j >= 0; j--) {
      var p = d.parts[j];
      if (!p.landed) {
        p.x += (p.vx + Math.sin(now / 300 + p.ph) * 10) * dt;
        p.y += p.vy * dt;
        if (p.y - p.y0 > p.drop) p.landed = now;
      } else if (now - p.landed > 2200) { d.parts.splice(j, 1); continue; }
      var al = p.landed ? 1 - (now - p.landed) / 2200 : 1;
      ctx.fillStyle = 'rgba(' + Math.round(p.c[0] * k) + ',' + Math.round(p.c[1] * k) + ',' + Math.round(p.c[2] * k) + ',' + al.toFixed(2) + ')';
      var X = Math.round(ox + p.x), Y = Math.round(oy + p.y);
      if (p.landed || Math.sin(now / 160 + p.ph) > 0) ctx.fillRect(X, Y, 2, 1); else ctx.fillRect(X, Y, 1, 2);   // tumbling
    }
  }

  // a flock over now and then, its shadow on the ground under it by day
  function flock(d, now, sky, wet, planet, view) {
    if (d.flock && now - d.flock.t0 > d.flock.dur) d.flock = null;
    if (d.flock || now < d.nextFlock) return d.flock;
    d.nextFlock = now + 20000 + Math.random() * 35000;
    if (sky.day + sky.dusk < 0.3 || wet > 0.6) return null;
    var dir = Math.random() < 0.5 ? 1 : -1, n = 3 + Math.floor(Math.random() * 4), y = view.y0 + (view.y1 - view.y0) * (0.15 + Math.random() * 0.5);
    var birds = [];
    for (var i = 0; i < n; i++) birds.push({ dx: -i * (9 + Math.random() * 5) * dir, dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (5 + Math.random() * 3), ph: Math.random() * 10 });
    var speed = planet === 'lumar' ? 34 : 48, span = view.x1 - view.x0 + 160;
    d.flock = { t0: now, dur: span / speed * 1000, x0: dir > 0 ? view.x0 - 60 : view.x1 + 60, y: y, dir: dir, speed: speed, birds: birds, gull: planet === 'lumar' };
    return d.flock;
  }
  function birdAt(F, b, now) {
    var t = (now - F.t0) / 1000;
    return [F.x0 + F.dir * F.speed * t + b.dx, F.y + b.dy + Math.sin(t * 1.3 + b.ph) * 3];
  }
  function birds(ctx, d, ox, oy, now, light) {
    var F = d.flock;
    if (!F) return;
    for (var i = 0; i < F.birds.length; i++) {
      var b = F.birds[i], p = birdAt(F, b, now), X = Math.round(ox + p[0]), Y = Math.round(oy + p[1]);
      var up = Math.sin(now / (F.gull ? 160 : 90) + b.ph) > 0.2;
      var k = 0.45 + 0.55 * light;
      ctx.fillStyle = F.gull ? 'rgb(' + Math.round(244 * k) + ',' + Math.round(244 * k) + ',' + Math.round(236 * k) + ')' : '#24242e';
      if (up) { ctx.fillRect(X - 2, Y - 1, 1, 1); ctx.fillRect(X + 2, Y - 1, 1, 1); ctx.fillRect(X - 1, Y, 3, 1); }
      else { ctx.fillRect(X - 2, Y, 5, 1); ctx.fillRect(X - 3, Y + 1, 1, 1); ctx.fillRect(X + 3, Y + 1, 1, 1); }
      if (F.gull) { ctx.fillStyle = '#3a3a40'; ctx.fillRect(X + (up ? 2 : 3), Y - (up ? 1 : -1), 1, 1); }
    }
  }
  function shadows(ctx, d, ox, oy, now, sky) {
    var F = d.flock;
    if (!F || sky.day < 0.3) return;
    ctx.fillStyle = 'rgba(10,20,10,' + (0.16 * sky.day).toFixed(2) + ')';
    for (var i = 0; i < F.birds.length; i++) {
      var p = birdAt(F, F.birds[i], now);
      ctx.fillRect(Math.round(ox + p[0] + 22), Math.round(oy + p[1] + 46), 3, 1);
    }
  }

  // the grass parting round your feet as you walk through it
  var stir = [];
  function feet(d, sc, ox, oy, now, dt, offX, offY, ts) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.isMoving || !BridgeCharacter.isMoving()) return;
    if (BridgeCharacter.isHidden && BridgeCharacter.isHidden()) return;
    var pos = BridgeCharacter.getRenderPos(), fx = Math.round(offX + (pos.x + 0.5) * ts) - ox, fy = Math.round(offY + (pos.y + 1 - 3 / 32) * ts) - oy;
    if (fx < 2 || fy < 2 || fx >= d.W - 2 || fy >= d.H - 2 || Math.random() > dt * 9) return;
    var q = (fy * d.W + fx) * 4, lv = sc.leaves;
    if (!(lv[q] > 32 && lv[q] <= 160)) return;
    for (var i = 0; i < 2; i++) stir.push({ x: fx + (Math.random() - 0.5) * 10, y: fy - 1, vx: (Math.random() - 0.5) * 16, vy: -14 - Math.random() * 10, t0: now });
  }
  function drawStir(ctx, ox, oy, now, dt, light) {
    var k = 0.35 + 0.65 * light;
    for (var i = stir.length - 1; i >= 0; i--) {
      var p = stir[i], a = (now - p.t0) / 450;
      if (a >= 1) { stir.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
      ctx.fillStyle = 'rgba(' + Math.round(120 * k) + ',' + Math.round(170 * k) + ',' + Math.round(70 * k) + ',' + (1 - a).toFixed(2) + ')';
      ctx.fillRect(Math.round(ox + p.x), Math.round(oy + p.y), 1, 2);
    }
  }

  // ---- the hooks --------------------------------------------------------------------------------------------------------
  var last = 0;
  function viewOf(ctx, ox, oy) { return { x0: -ox, y0: -oy, x1: ctx.canvas.width - ox, y1: ctx.canvas.height - oy }; }

  // under everyone: the wind in the grass and the trees, the water, the shadows of birds going over
  function ground(ctx, world, offX, offY, ts, now, sc) {
    if (!on(world) || !sc || !sc.ready || !sc.leaves) return;
    var t0 = performance.now(), d = dataFor(sc), m = sc.meta, ox = Math.round(offX - m.originX), oy = Math.round(offY - m.originY);
    var dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000)); last = now;
    var sky = skyOf(world), light = Math.min(1, sky.day + sky.dusk * 0.7 + sky.night * 0.35), wind = windOf(world);
    var wet = wetOf(world), season = seasonOf(world), planet = BridgeClock.planet(wid()), view = viewOf(ctx, ox, oy);
    d.now = { at: now, dt: dt, sky: sky, light: light, wind: wind, wet: wet, season: season, planet: planet, ox: ox, oy: oy, view: view };
    gusts(ctx, d, ox, oy, now, wind, light);
    water(ctx, d, ox, oy, now, sky, wet, dt);
    if (LIFE[planet]) { flock(d, now, sky, wet, planet, view); shadows(ctx, d, ox, oy, now, sky); }
    trees(ctx, d, ox, oy, now, wind);
    feet(d, sc, ox, oy, now, dt, offX, offY, ts);
    d.ms = (d.ms || 0) * 0.95 + (performance.now() - t0) * 0.05;
  }
  // over everyone: what's in the air
  function over(ctx, world, offX, offY, ts, now) {
    var d = world && world.scene && data[world.scene.id], c = d && d.now;
    if (!c || c.at !== now || !on(world)) return;
    var t0 = performance.now();
    drawStir(ctx, c.ox, c.oy, now, c.dt, c.light);
    if (LIFE[c.planet]) {
      falling(ctx, d, c.ox, c.oy, now, c.dt, c.season, c.wind, c.light, c.view);
      life(ctx, d, c.ox, c.oy, now, c.sky, c.season, c.wet, c.view);
      birds(ctx, d, c.ox, c.oy, now, c.light);
    }
    d.msOver = (d.msOver || 0) * 0.95 + (performance.now() - t0) * 0.05;
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { ground: ground, over: over });

  return {
    // what it draws for a scene (once it's been drawn): the older effects step aside for it (js/farm.js, js/seasons.js)
    covers: function (id) { var d = data[id]; return d ? { water: d.water > 0, grass: d.grass > 0, fall: d.trees.length > 0 } : {}; },
    _wind: function (k) { held = k == null ? null : k; },
    _stats: function (id) {
      var sc = typeof BridgeScene !== 'undefined' ? BridgeScene.get(id) : null, d = sc && sc.leaves ? dataFor(sc) : null;
      return d ? { trees: d.trees.length, swaying: d.trees.filter(function (T) { return T.mask; }).length, falling: d.fall, grass: d.grass, tips: d.nTips || 0,
                   water: d.water, flies: (d.flies || []).map(function (b) { return b.k; }), parts: d.parts.length, rings: d.rings.length, flock: !!d.flock,
                   ms: +((d.ms || 0) + (d.msOver || 0)).toFixed(2), prep: d.prepMs } : null;
    },
    _flock: function (id) { var d = data[id]; if (d) { d.flock = null; d.nextFlock = 0; } }
  };
})();
