/**
 * BridgeAquarium — a tank for the fish you catch (Beck: "you'd be able to build a fish tank somewhere. And you can put
 * the fish that you catch").
 *
 * Two pieces of furniture, drawn here rather than on the furniture sheet because they're alive: the Fish Tank (2 × 1,
 * five fish) and the Grand Aquarium (3 × 1, a dozen), bought like any furniture — a home's furnishing shop (H) or the
 * Ship's Chandler's Fish tanks — and put down in any place of yours, aboard too (js/home.js `add`). Each is a glass
 * tank on a cabinet in the room's style (walnut where the dialogs are parchment, black lacquer and a pink strip in
 * Arcadia, gunmetal and cyan aboard): clear water lit from a lamp in the lid, gravel, waterweed swaying, a stone or
 * two, bubbles from an airstone — and your fish, each one the real fish art (js/fishart.js) drawn small, swimming back
 * and forth at its own speed and depth and turning round at the glass. The rare ones glow a little. Drawn at the
 * game's native scale and depth-tested with the room like the rest of the furniture.
 *
 * Use it (E): look into the tank — the room leans in and the tank fills the screen, your fish big with their names
 * under them in their rarity's colour (point at one, or tap it, for what it is); put a fish in, from your pack or from
 * the fish hold of a ship of yours lying at this island (js/fleet.js); take one out again, into your pack. Crabs and
 * shrimp go in too: the crab picks its way along the gravel.
 *
 * Where each fish is comes from the clock and its seed (`swim`), so the room, the close-up and a visitor agree. What's in a tank
 * rides on its layout entry (`fish: [{id, s}]`, s the seed), saved with bridge_homes: it syncs with the rest of your
 * game, and a partner visiting your home sees the tank and its fish (js/partner.js routes them your bridge_homes).
 * A visitor can slip a fish in for you; only you can take one out.
 *
 *   BridgeAquarium.open(inter) / look(inter)    the tank's interaction (type `tank`) and its close-up
 *   BridgeAquarium.shop(note, back)             the tanks for sale (the Ship's Chandler)
 *   BridgeAquarium.TANKS / ok(id) / swim(fish, t)
 */
var BridgeAquarium = (function () {
  // w: tiles wide; glass and stand: their height, native px; maxL: the longest fish drawn in it (native px)
  // plants: [x across the floor 0-1, kind, height 0-1, blades, in front of the fish]; stones: [x, w, h]; air: the airstone
  var TANKS = {
    fish_tank: { name: 'Fish Tank', label: 'FISH TANK', price: 250, w: 2, cap: 5, glass: 31, stand: 13, maxL: 15,
                 plants: [[0.06, 'grass', 0.95, 4], [0.24, 'fern', 0.4, 3], [0.78, 'red', 0.72], [0.93, 'grass', 0.8, 3, true]],
                 stones: [[0.5, 5, 3], [0.6, 3, 2]], air: 0.38 },
    aquarium:  { name: 'Grand Aquarium', label: 'GRAND AQUARIUM', price: 800, w: 3, cap: 12, glass: 42, stand: 15, maxL: 20,
                 plants: [[0.04, 'grass', 0.95, 5], [0.17, 'red', 0.8], [0.3, 'fern', 0.4, 4], [0.66, 'grass', 0.6, 3], [0.84, 'red', 0.62, 0, true], [0.95, 'grass', 0.9, 4, true]],
                 stones: [[0.44, 7, 4], [0.53, 4, 3], [0.75, 5, 3]], air: 0.58, wood: 0.4 }
  };
  var EXTRA = { harbour_crab: 'crab', rose_shrimp: 'shrimp' };           // not drawn by fishart, but they live in tanks
  var SAMPLE = [{ id: 'glowtail', s: 4 }, { id: 'silverfin', s: 17 }, { id: 'coral_dragonet', s: 9 }];   // the shop's picture
  // how each kind swims: speed (× a fish's), the depths it keeps to (0 top - 1 bottom), how far it wanders up and down,
  // and how much it stops and starts (crabs and shrimp)
  var MOVE = {
    fish:   { sp: 1, lane: [0.04, 0.82], wander: 0.08 },
    eel:    { sp: 0.6, lane: [0.45, 0.92], wander: 0.06 },
    ray:    { sp: 0.75, lane: [0.08, 0.6], wander: 0.14 },
    shrimp: { sp: 0.5, lane: [0.84, 0.98], wander: 0.03, halt: 0.9 },
    crab:   { sp: 0.35, lane: [1, 1], wander: 0, halt: 0.95 }
  };
  var INK = '#0a0810';
  // the cabinet and the tank's frame, by the room's dialog theme (js/home.js HOMES[id].theme)
  var STYLE = {
    parchment: { ink: '#1a0e06', dk: '#3a2414', md: '#5a3a1e', lt: '#7a5028', hi: '#9a6a38', knob: '#e0c060',
                 fd: '#24160a', fm: '#4a2e16', fl: '#7a5028', lamp: '#2a1a0e' },
    neon:      { ink: '#06040a', dk: '#141018', md: '#1e1824', lt: '#2c2434', hi: '#463a54', knob: '#f078a8', led: '#ff90c0',
                 fd: '#0a0810', fm: '#241e2c', fl: '#4a3e58', lamp: '#120e16' },
    holo:      { ink: '#080c10', dk: '#1a2028', md: '#28303a', lt: '#36424e', hi: '#56667a', knob: '#40c8d8', led: '#80e0e8',
                 fd: '#10151a', fm: '#36424e', fl: '#6a7a8e', lamp: '#141a20' }
  };
  var WATER = ['#62b6c0', '#4a9eac', '#3a8898', '#2e7484', '#245f6e', '#1c4e5c'];
  var GRAVEL = ['#d8c49a', '#b89c74', '#9a8062', '#7a6450', '#5e4c3c', '#a8a8a0', '#c08a64'];

  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hsh(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function frac(v) { return v - Math.floor(v); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgba(hex, a) { var p = parseInt(hex.slice(1), 16); return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')'; }
  function put(c, x, y, col, w, h) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }

  // ---- the fish ------------------------------------------------------------------------------------------------------
  function ok(id) { return !!EXTRA[id] || (typeof BridgeFishArt !== 'undefined' && BridgeFishArt.has(id)); }
  function name(id) { var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id); return it ? it.name : id; }
  function tier(id) { return typeof BridgeFishArt !== 'undefined' ? BridgeFishArt.tier(id) : 0; }
  function kindOf(id) {
    if (EXTRA[id]) return EXTRA[id];
    var S = typeof BridgeFishArt !== 'undefined' && BridgeFishArt.SPECS[id];
    return S && S.shape === 'eel' ? 'eel' : S && S.shape === 'ray' ? 'ray' : 'fish';
  }
  function glowOf(id) {
    var S = typeof BridgeFishArt !== 'undefined' && BridgeFishArt.SPECS[id], t = tier(id);
    if (t < 2) return null;
    return (S && S.glow) || BridgeFishArt.TIERS[t].col;
  }
  // how long it's drawn in the room: by the sizes it comes in (js/fishing.js), on a gentle log scale, up to what the tank takes
  function lenOf(id, maxL) {
    if (EXTRA[id] === 'crab') return 7;
    if (EXTRA[id] === 'shrimp') return 7;
    var s = typeof BridgeFishing !== 'undefined' && BridgeFishing.size ? BridgeFishing.size(id) : null, cm = s ? (s[0] + s[1]) / 2 : 20;
    return clamp(Math.round(8 + 2.6 * Math.log(Math.max(1, cm / 8)) / Math.LN2), 8, maxL);
  }
  function tall(L) { return Math.max(5, Math.round(L * 0.6)); }

  /** Where a fish is at time t (seconds): u across (0-1), v down (0-1), facing fx (+1 right … through 0 … -1 left as it
   *  turns at the glass), z how far back (0 at the glass), bob. From the clock and its seed, so every view agrees. */
  function swim(f, t) {
    var r = function (k) { return hsh(f.s + 0.37, k + 1.13); };
    var M = MOVE[kindOf(f.id)] || MOVE.fish;
    var sp = (0.07 + 0.08 * r(0)) * M.sp;
    var tt = t + (M.halt ? M.halt * Math.sin(t * 0.8 + r(6) * 6.28) / 0.8 : 0);       // stop and go
    var p = ((tt * sp + r(1) * 2) % 2 + 2) % 2;                                          // there (0-1) and back (1-2)
    var u = p < 1 ? p : 2 - p;
    u = u - Math.sin(2 * Math.PI * u) / (4 * Math.PI);                                  // easing off toward the glass
    var W = 0.03, fx = p < 1 ? 1 : -1;
    if (Math.abs(p - 1) < W) fx = Math.cos(Math.PI * (p - 1 + W) / (2 * W));            // turning round
    else if (p < W) fx = -Math.cos(Math.PI * (p + W) / (2 * W));
    else if (p > 2 - W) fx = -Math.cos(Math.PI * (p - 2 + W) / (2 * W));
    var v = M.lane[0] + (M.lane[1] - M.lane[0]) * r(2) + M.wander * Math.sin(t * (0.25 + 0.3 * r(3)) + r(4) * 6.28);
    var moving = !M.halt || Math.cos(t * 0.8 + r(6) * 6.28) > -0.7;
    return { u: u, v: clamp(v, 0, 1), fx: fx, z: r(5), bob: Math.sin(t * (1.5 + r(7)) + r(8) * 6.28), step: moving ? Math.floor(t * 7) % 2 : 0 };
  }

  // a fish's picture at a size, and the same set back in the water (for the ones further from the glass)
  var arts = {};
  function art(id, L, H, far) {
    var key = id + ':' + L + 'x' + H + (far ? ':far' : '');
    if (arts[key] !== undefined) return arts[key];
    var cv = EXTRA[id] === 'crab' ? crab(L, 0) : EXTRA[id] === 'shrimp' ? shrimp(L) : (typeof BridgeFishArt !== 'undefined' ? BridgeFishArt.canvas(id, L, H, 1) : null);
    if (cv && far) {
      var c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
      var g = c2.getContext('2d');
      g.drawImage(cv, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = rgba(WATER[4], 0.32); g.fillRect(0, 0, cv.width, cv.height);
      cv = c2;
    }
    return (arts[key] = cv || null);
  }
  // the crab and the shrimp: by hand for the room, drawn to size for the close-up (outlined like the fish)
  var CRAB7 = [['R.....R', 'RK.K.KR', 'KRLLLRK', 'KRRRRRK', 'D.D.D.D'], ['R.....R', 'RK.K.KR', 'KRLLLRK', 'KRRRRRK', '.D.D.D.']];
  var SHRIMP7 = ['.....AA', '.KKKK.A', 'KPLPLKE', 'FKPPPPK', '.K.L.L.'];
  var CRAB_PAL = { K: INK, R: '#c84a2a', L: '#e87a4a', D: '#8a2a1a', E: '#f8f0d0' };
  var SHRIMP_PAL = { K: '#5a1a30', P: '#f0a0c0', L: '#ffd8e6', F: '#c06080', E: INK, A: '#e890b0' };
  function sprite(rows, pal) {
    var cv = document.createElement('canvas'); cv.width = rows[0].length; cv.height = rows.length;
    var g = cv.getContext('2d');
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (pal[r[x]]) put(g, x, y, pal[r[x]]); });
    return cv;
  }
  // a w × h grid painted by fn(set) (set(x, y, null) clears), then every empty cell beside it inked, as fishart does
  function grid(w, h, fn, ink) {
    var px = [], x, y;
    for (var i = 0; i < w * h; i++) px.push(null);
    fn(function (x, y, col) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = col; });
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var col = px[y * w + x];
      if (!col && ((x > 0 && px[y * w + x - 1]) || (x < w - 1 && px[y * w + x + 1]) || (y > 0 && px[(y - 1) * w + x]) || (y < h - 1 && px[(y + 1) * w + x]))) col = ink;
      if (col) put(g, x, y, col);
    }
    return cv;
  }
  function line(set, x0, y0, x1, y1, col) {
    var n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1));
    for (var i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col);
  }
  function bigCrab(w, step) {
    var h = Math.round(w * 0.62), P = CRAB_PAL;
    return grid(w, h, function (set) {
      var cx = (w - 1) / 2, cy = h * 0.62, rx = w * 0.27, ry = h * 0.22, x, y, i, s;
      for (i = 0; i < 3; i++) for (s = -1; s <= 1; s += 2) {           // three legs a side, stepping in turn
        var up = (step + i + (s > 0 ? 1 : 0)) % 2, x0 = cx + s * rx * (0.3 + 0.28 * i), y0 = cy + ry * 0.2;
        var kx = x0 + s * w * (0.1 + 0.025 * i), ky = cy - ry * 0.3 - up, fx = kx + s * w * 0.05, fy = h - 1 - up;
        line(set, x0, y0, kx, ky, P.D); line(set, kx, ky, fx, fy, P.D);
      }
      for (s = -1; s <= 1; s += 2) {                                    // arms up to the claws, held high
        var ax = cx + s * rx * 0.7, ay = cy - ry * 0.4, bx = cx + s * w * 0.33, by = h * 0.32;
        line(set, ax, ay, bx, by, P.R); line(set, ax, ay + 1, bx, by + 1, P.D);
        var crx = w * 0.09, cry = h * 0.17, ccx = cx + s * w * 0.36, ccy = h * 0.2;
        for (y = -Math.ceil(cry); y <= cry; y++) for (x = -Math.ceil(crx); x <= crx; x++) {
          if (x * x / (crx * crx) + y * y / (cry * cry) > 1) continue;
          set(ccx + x, ccy + y, y < -cry * 0.35 ? P.L : y > cry * 0.5 ? P.D : P.R);
        }
        for (y = -Math.ceil(cry); y < cry * 0.1; y++) set(ccx - s * crx * 0.25, ccy + y, null);   // the pincer's gap
      }
      for (y = -Math.ceil(ry); y <= ry; y++) for (x = -Math.ceil(rx); x <= rx; x++) {   // the shell
        if (x * x / (rx * rx) + y * y / (ry * ry) > 1) continue;
        var v = (y + ry) / (2 * ry);
        set(cx + x, cy + y, v < 0.32 ? P.L : v < 0.78 ? (hsh(x, y) > 0.9 ? P.L : P.R) : P.D);
      }
      for (s = -1; s <= 1; s += 2) {                                    // eyes on stalks
        var ex = cx + s * w * 0.07;
        line(set, ex, cy - ry, ex, cy - ry - h * 0.1, P.D);
        set(ex, cy - ry - h * 0.12, P.E); set(ex + s, cy - ry - h * 0.12, INK);
      }
    }, INK);
  }
  function bigShrimp(w) {
    var h = Math.round(w * 0.5), P = SHRIMP_PAL;
    return grid(w, h, function (set) {
      var x0 = w * 0.2, x1 = w * 0.74, n = Math.round(x1 - x0), i, t, y;
      var cyAt = function (t) { return h * 0.64 - Math.sin(Math.PI * t * 0.85) * h * 0.14; };
      var rAt = function (t) { return h * (0.06 + 0.12 * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.9))); };
      for (i = 0; i <= 80; i++) {                                       // feelers: one forward, one sweeping back over it
        t = i / 80;
        set(x1 + t * w * 0.24, h * 0.44 - Math.sin(t * 2.2) * h * 0.38, P.A);
        set(x1 - t * w * 0.72, h * 0.4 - Math.sin(t * Math.PI) * h * 0.36, P.A);
      }
      for (i = 0; i < 5; i++) {                                          // little legs under the front half
        t = 0.38 + 0.11 * i; var lx = x0 + n * t, ly = cyAt(t) + rAt(t);
        line(set, lx, ly, lx - w * 0.025, ly + h * 0.14, P.F);
      }
      for (i = 0; i <= n; i++) {                                         // the body in bands, curled a little, thickest at the head
        t = i / n;
        var cy = cyAt(t), r = rAt(t);
        for (y = -Math.ceil(r); y <= r; y++) {
          var v = (y + r) / (2 * r), band = t < 0.7 && i % Math.max(3, Math.round(w / 9)) === 0;
          set(x0 + i, cy + y, v < 0.3 ? P.L : v > 0.75 || band ? P.F : P.P);
        }
      }
      var tc = cyAt(0);
      for (i = 1; i < w * 0.13; i++) for (y = -1 - i * 0.55; y <= 1 + i * 0.55; y++) set(x0 - i, tc + y, i > w * 0.09 ? P.L : P.F);   // the tail fan
      var hc = cyAt(1);
      line(set, x1, hc - rAt(1) * 0.5, x1 + w * 0.13, hc - h * 0.12, P.F);   // the spike on its head
      set(x1 - w * 0.05, hc - rAt(1) * 0.3, P.E); set(x1 - w * 0.05 + 1, hc - rAt(1) * 0.3, P.E);
    }, '#5a1a30');
  }
  function crab(L, step) {
    var key = 'crab' + L + ':' + step;
    return arts[key] || (arts[key] = L <= 7 ? sprite(CRAB7[step], CRAB_PAL) : bigCrab(L, step));
  }
  function shrimp(L) { var key = 'shrimp' + L; return arts[key] || (arts[key] = L <= 7 ? sprite(SHRIMP7, SHRIMP_PAL) : bigShrimp(L)); }

  // a fish drawn facing fx (1 right, -1 left; between, squeezed as it turns)
  function drawFish(c, img, x, y, w, h, fx) {
    var dw = Math.max(1, Math.round(w * Math.abs(fx))), dx = Math.round(x + (w - dw) / 2);
    if (fx >= 0) { c.drawImage(img, 0, 0, img.width, img.height, dx, Math.round(y), dw, h); return; }
    c.save(); c.translate(dx + dw, Math.round(y)); c.scale(-1, 1);
    c.drawImage(img, 0, 0, img.width, img.height, 0, 0, dw, h);
    c.restore();
  }

  // ---- the plants ----------------------------------------------------------------------------------------------------
  // P: [x, kind, height, blades]; bx, by: its foot; H: the most it can reach; k: 1 in the room, more in the close-up
  function plant(c, P, bx, by, H, t, k, seed) {
    var kind = P[1], h = Math.max(4, Math.round(H * P[2])), sway = function (r, sp) { return Math.sin(t * (sp || 0.9) + seed + r * 0.12 / k) * Math.pow(r / h, 1.4) * 1.6 * k; };
    if (kind === 'grass') {                                     // tape grass: long ribbons from the gravel
      var n = P[3] || 3;
      for (var j = 0; j < n; j++) {
        var hj = Math.round(h * (0.62 + 0.38 * hsh(seed, j))), x0 = bx + Math.round((j - (n - 1) / 2) * 1.6 * k), lean = (j - (n - 1) / 2) * 0.35;
        var cols = j % 2 ? ['#1e5e30', '#2e8040', '#5aae5a'] : ['#2a7a3c', '#44a052', '#86d070'];
        for (var r = 0; r < hj; r++) {
          var x = x0 + Math.round(sway(r) + lean * r / k * 0.25), q = r / hj;
          put(c, x, by - r, q < 0.3 ? cols[0] : q < 0.82 ? cols[1] : cols[2], k > 1 && q < 0.75 ? 2 : 1, 1);
          if (k > 1 && q < 0.75) put(c, x + 1, by - r, cols[0]);                   // its shaded edge
        }
      }
    } else if (kind === 'red') {                                // a red stem plant, leaves in pairs
      for (var s = 0; s < 2; s++) {
        var hs = Math.round(h * (s ? 0.75 : 1)), sx0 = bx + s * 2 * k;
        for (var r2 = 0; r2 < hs; r2++) {
          var x2 = sx0 + Math.round(sway(r2, 0.7) * 0.6), q2 = r2 / hs;
          put(c, x2, by - r2, '#6a2424', k > 1 ? 2 : 1, 1);
          if (r2 > 1 && r2 % (2 * k) === 0) {
            var side = (r2 / (2 * k)) % 2 ? 1 : -1, lc = q2 > 0.7 ? '#f08a60' : q2 > 0.35 ? '#d0604a' : '#a8443a';
            for (var l = 1; l <= 2 * k; l++) put(c, x2 + side * l + (side > 0 && k > 1 ? 1 : 0), by - r2 - Math.floor(l / (2 * k) * k), lc);
          }
        }
        put(c, sx0 + Math.round(sway(hs, 0.7) * 0.6), by - hs, '#ff9a70', k > 1 ? 2 : 1, k > 1 ? 2 : 1);
      }
    } else {                                                    // java fern: a few broad leaves low down
      var m = P[3] || 3;
      for (var f = 0; f < m; f++) {
        var ang = -1.1 + 2.2 * (f + 0.5) / m + Math.sin(t * 0.6 + seed + f) * 0.06, len = h * (0.75 + 0.25 * hsh(seed + 3, f));
        for (var d = 0; d < len; d++) {
          var px = bx + Math.sin(ang) * d, py = by - Math.cos(ang) * d * 0.9, wd = Math.max(1, Math.round(Math.sin(Math.PI * d / len) * 1.6 * k));
          for (var e = -wd + 1; e < wd; e++) put(c, px + e * Math.cos(ang), py + e * Math.sin(ang) * 0.5, e === 0 && k > 1 ? '#1a4a28' : d / len > 0.7 ? '#4e9a52' : '#2e6e3a');
        }
      }
    }
  }
  // the same plants up close, k native pixels to the room's one: broad tapering blades, leaves you can count
  function bigPlant(c, P, bx, by, H, t, k, seed, W) {
    var kind = P[1], h = Math.round(H * P[2]), j, r, q, x;
    var sway = function (r, hh, sp) { return Math.sin(t * (sp || 0.8) + seed + r * 0.03) * Math.pow(r / hh, 1.5) * 2.4 * k; };
    if (kind === 'grass') {
      var n = (P[3] || 3) * 2;
      for (j = 0; j < n; j++) {
        var hj = Math.round(h * (0.45 + 0.55 * hsh(seed + 1, j))), x0 = bx + Math.round((j - (n - 1) / 2) * k * 1.5), lean = (j - (n - 1) / 2) * 0.05;
        var cols = j % 3 === 1 ? ['#174f28', '#246e36', '#4a9a4c'] : ['#1f6634', '#348f46', '#78c868'];
        for (r = 0; r < hj; r++) {
          q = r / hj; x = x0 + Math.round(sway(r, hj) + lean * r);
          var wd = Math.max(1, Math.round(k * (1.1 - q * 0.8)));
          put(c, x, by - r, q < 0.2 ? cols[0] : q < 0.85 ? cols[1] : cols[2], wd, 1);
          if (wd > 2) put(c, x + 1, by - r, cols[2]);                       // the light along it
          if (wd > 1) put(c, x + wd - 1, by - r, cols[0]);                  // and its shaded edge
        }
      }
    } else if (kind === 'red') {
      for (var s = 0; s < 3; s++) {
        var hs = Math.round(h * [1, 0.8, 0.62][s]), sx0 = bx + Math.round((s - 1) * k * 2.2), gap = Math.max(3, Math.round(k * 2.4));
        for (r = 0; r < hs; r++) {
          q = r / hs; x = sx0 + Math.round(sway(r, hs, 0.65) * 0.7);
          put(c, x, by - r, '#5a1e20', Math.max(1, Math.round(k * 0.45)), 1);
          if (r > gap && r % gap === 0) {                                     // a pair of leaves, alternating
            var side = (r / gap) % 2 ? 1 : -1, len = Math.round(k * (3.4 - q * 1.2)), lc = q > 0.7 ? ['#f08a60', '#ffb080'] : q > 0.35 ? ['#d0604a', '#f08a60'] : ['#a03a34', '#c8544a'];
            for (var l = 0; l <= len; l++) {
              var th = Math.max(0, Math.round(Math.sin(Math.PI * l / len) * k * 0.7));
              for (var e = -th; e <= th; e++) put(c, x + side * (l + 1), by - r - Math.round(l * 0.45) + e, e < 0 ? lc[1] : lc[0]);
            }
          }
        }
        put(c, sx0 + Math.round(sway(hs, hs, 0.65) * 0.7) - 1, by - hs - 1, '#ffa070', 3, 2);
      }
    } else {
      var m = (P[3] || 3) + 2;
      for (j = 0; j < m; j++) {
        var ang = -1.15 + 2.3 * (j + 0.5) / m + Math.sin(t * 0.5 + seed + j) * 0.05, lenf = Math.min(h * (0.5 + 0.22 * hsh(seed + 3, j)), W * 0.16), mw = lenf * 0.15;
        var dx = Math.sin(ang), dy = -Math.cos(ang) * 0.9;
        for (var d = 0; d < lenf; d += 0.5) {
          var half = Math.pow(Math.sin(Math.PI * d / lenf), 0.7) * mw, px0 = bx + dx * d, py0 = by + dy * d;
          for (var e2 = -half; e2 <= half; e2 += 0.5) {
            put(c, px0 - dy * e2, py0 + dx * e2, Math.abs(e2) < 0.6 ? '#174a26' : e2 < 0 ? (d / lenf > 0.75 ? '#5aa85a' : '#3a8646') : '#286438');
          }
        }
      }
    }
  }

  // ---- in the room ---------------------------------------------------------------------------------------------------
  // The geometry, bottom up (canvas rows; the footprint's bottom is the canvas's): feet, the cabinet's front, its top,
  // the tank's glass front standing on it, the water seen from above with the lamp's hood at the back.
  function geo(T) {
    if (T.g) return T.g;
    var W = T.w * 32, H = 2 + T.stand + 2 + T.glass + 7 + 2;
    var g = { W: W, H: H, sb1: H - 3, sb0: H - 2 - T.stand };
    g.gb = g.sb0 - 2; g.gt = g.gb - T.glass + 1;
    g.ix0 = 4; g.ix1 = W - 5; g.iy0 = g.gt + 2; g.iy1 = g.gb - 3;
    g.fl = g.iy1 - (T.w > 2 ? 5 : 4);                         // the gravel's top
    g.top = g.gt - 7;                                         // the sprite's first row
    return (T.g = g);
  }
  var layers = {};                                            // the parts that don't move, by tank and theme
  function still(id, theme) {
    var key = id + ':' + theme;
    if (layers[key]) return layers[key];
    var T = TANKS[id], G = geo(T), S = STYLE[theme] || STYLE.parchment;
    var back = document.createElement('canvas'), front = document.createElement('canvas');
    back.width = front.width = G.W; back.height = front.height = G.H;
    var b = back.getContext('2d'), f = front.getContext('2d'), x, y;
    // the cabinet: feet, front, doors, its top
    put(b, 2, G.H - 2, S.ink, 3, 2); put(b, G.W - 5, G.H - 2, S.ink, 3, 2);
    put(b, 1, G.sb0, S.ink, G.W - 2, T.stand); put(b, 2, G.sb0, S.md, G.W - 4, T.stand - 1);
    put(b, 2, G.sb0, S.hi, G.W - 4, 1); put(b, 2, G.sb1, S.dk, G.W - 4, 1);
    var half = Math.floor((G.W - 4) / 2);
    for (var dI = 0; dI < 2; dI++) {                           // two doors, panelled
      var d0 = 2 + dI * half + 2, dw = half - 4;
      put(b, d0, G.sb0 + 3, S.dk, dw, 1); put(b, d0, G.sb0 + 3, S.dk, 1, T.stand - 6);
      put(b, d0 + 1, G.sb1 - 2, S.lt, dw - 1, 1); put(b, d0 + dw - 1, G.sb0 + 4, S.lt, 1, T.stand - 7);
    }
    put(b, G.W / 2 - 3, G.sb0 + Math.floor(T.stand / 2), S.knob); put(b, G.W / 2 + 2, G.sb0 + Math.floor(T.stand / 2), S.knob);
    put(b, G.W / 2 - 1, G.sb0 + 1, S.ink, 2, T.stand - 2);         // the gap between the doors
    if (S.led) put(b, 3, G.sb0 + 1, S.led, G.W - 6, 1);             // a strip light along the cabinet's edge
    put(b, 1, G.sb0 - 3, S.ink, G.W - 2, 3); put(b, 2, G.sb0 - 3, S.dk, G.W - 4, 1); put(b, 2, G.sb0 - 2, S.lt, G.W - 4, 1); put(b, 2, G.sb0 - 1, S.hi, G.W - 4, 1);
    // the water, darker toward the floor, ordered-dithered between its bands
    var ih = G.fl - G.iy0, BY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    for (y = 0; y < ih; y++) {
      var fq = y / Math.max(1, ih - 1) * (WATER.length - 1), i0 = Math.min(WATER.length - 2, Math.floor(fq)), tq = fq - i0;
      for (x = G.ix0; x <= G.ix1; x++) put(b, x, G.iy0 + y, tq * 16 > BY[y & 3][x & 3] + 0.5 ? WATER[i0 + 1] : WATER[i0]);
    }
    for (x = G.ix0; x <= G.ix1; x += 5 + Math.floor(hsh(x, 3) * 5)) {   // the back glass: far weed in the murk
      var bh = Math.round(ih * (0.3 + 0.4 * hsh(x, 4)));
      for (y = 0; y < bh; y++) put(b, x + Math.round(Math.sin(y * 0.4 + x) * 0.6), G.fl - 1 - y, rgba('#123c44', 0.55));
    }
    // the gravel: pebbles, lighter where the lamp falls
    for (y = G.fl; y <= G.iy1; y++) for (x = G.ix0; x <= G.ix1; x++) {
      var hh = hsh(x * 1.7, y * 2.3), col = GRAVEL[Math.floor(hh * 5) + (hh > 0.93 ? 1 : 0)];
      if (y === G.fl && hsh(x, 9) < 0.35) continue;                    // a ragged top
      put(b, x, y, y === G.fl || (y === G.fl + 1 && hh > 0.5) ? GRAVEL[hh > 0.6 ? 0 : 1] : y === G.iy1 ? GRAVEL[4] : col);
    }
    T.stones.forEach(function (st) {                                    // a stone or two
      var sx = G.ix0 + Math.round(st[0] * (G.ix1 - G.ix0)), sw = st[1], sh = st[2];
      for (var j = 0; j < sh; j++) for (var i = 0; i < sw; i++) {
        if (j === 0 && (i === 0 || i === sw - 1)) continue;          // rounded off on top
        put(b, sx + i, G.fl - sh + 1 + j, j === 0 || i === 0 ? '#9aa0a6' : i === sw - 1 || j === sh - 1 ? '#4e545c' : '#757b84');
      }
    });
    if (T.wood) {                                                        // a bough of driftwood
      var wx = G.ix0 + Math.round(T.wood * (G.ix1 - G.ix0));
      for (var wI = 0; wI < 14; wI++) { put(b, wx + wI, G.fl - 1 - Math.round(wI * 0.45), '#5a4030'); put(b, wx + wI, G.fl - Math.round(wI * 0.45), '#2e2018'); }
      put(b, wx + 13, G.fl - 8, '#7a5a40', 1, 2);
    }
    var ax = G.ix0 + Math.round(T.air * (G.ix1 - G.ix0));
    put(b, ax - 1, G.fl - 1, '#3a4048', 3, 2); put(b, ax - 1, G.fl - 1, '#5a6068', 2, 1);   // the airstone
    // the top: the water seen from above, the lamp's hood across the back
    put(b, 2, G.gt - 5, S.fd, G.W - 4, 5);
    put(b, G.ix0 - 1, G.gt - 4, '#5aa8b2', G.ix1 - G.ix0 + 3, 3); put(b, G.ix0 - 1, G.gt - 2, '#7cc8d0', G.ix1 - G.ix0 + 3, 1);
    for (x = G.ix0; x <= G.ix1; x++) if (hsh(x, 5) > 0.7) put(b, x, G.gt - 4 + Math.floor(hsh(x, 6) * 2), '#4a96a2');
    // the frame, over everything in the water: rails, posts, the glass catching the light
    put(f, 2, G.gt, S.ink, G.W - 4, 1); put(f, 3, G.gt, S.fl, G.W - 6, 1); put(f, 3, G.gt + 1, S.fm, G.W - 6, 1);
    put(f, 2, G.gb - 2, S.ink, G.W - 4, 3); put(f, 3, G.gb - 2, S.fm, G.W - 6, 2); put(f, 3, G.gb - 2, S.fl, G.W - 6, 1);
    put(f, 2, G.gt, S.ink, 1, T.glass); put(f, 3, G.gt + 1, S.fm, 1, T.glass - 3);
    put(f, G.W - 3, G.gt, S.ink, 1, T.glass); put(f, G.W - 4, G.gt + 1, S.fd, 1, T.glass - 3);
    for (var gI = 0; gI < Math.round(T.glass * 0.55); gI++) {           // a streak of reflection
      f.fillStyle = 'rgba(255,255,255,' + (gI % 3 === 1 ? 0.1 : 0.2) + ')';
      f.fillRect(G.ix0 + 3 + Math.floor(gI * 0.45), G.iy0 + 2 + gI, 1, 1);
      if (gI > 3) f.fillRect(G.ix0 + 5 + Math.floor(gI * 0.45), G.iy0 + 2 + gI, 1, 1);
    }
    f.fillStyle = 'rgba(255,255,255,0.12)'; f.fillRect(G.ix1, G.iy0 + 2, 1, G.fl - G.iy0 - 4);
    // the hood: a lid over the back half of the top with the lamp inside it
    var h0 = Math.round(G.W * 0.18), h1 = G.W - h0;
    put(f, h0, G.top, S.ink, h1 - h0, 4); put(f, h0 + 1, G.top, S.fl, h1 - h0 - 2, 1); put(f, h0 + 1, G.top + 1, S.fm, h1 - h0 - 2, 2);
    put(f, h0 + 1, G.top + 3, S.lamp, h1 - h0 - 2, 1);
    if (S.led) put(f, h0 + 2, G.top + 2, S.led, h1 - h0 - 4, 1);
    put(f, h0 + 2, G.top + 4, '#fff4d0', h1 - h0 - 4, 1);              // the lamp's light on the water under it
    return (layers[key] = { back: back, front: front });
  }

  // each tank's picture this frame (one canvas per layout entry, reused)
  var made = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function slot(q) {
    var e = made && made.get(q);
    if (!e) { e = { cv: document.createElement('canvas'), gl: document.createElement('canvas'), glows: [] }; if (made) made.set(q, e); }
    return e;
  }
  function live(q, now, theme) {
    var T = TANKS[q.id], G = geo(T), L = still(q.id, theme || 'parchment'), e = slot(q);
    if (e.cv.width !== G.W || e.cv.height !== G.H) { e.cv.width = e.gl.width = G.W; e.cv.height = e.gl.height = G.H; }
    var c = e.cv.getContext('2d'), t = now / 1000, iw = G.ix1 - G.ix0 + 1, x, i;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, G.W, G.H);
    c.drawImage(L.back, 0, 0);
    c.save(); c.beginPath(); c.rect(G.ix0, G.iy0, iw, G.iy1 - G.iy0 + 1); c.clip();
    // light on the gravel, moving
    for (x = G.ix0; x <= G.ix1; x++) {
      if (Math.sin(x * 0.55 + t * 1.4) + Math.sin(x * 0.23 - t * 0.9 + 1.3) > 1.35) put(c, x, G.fl + (hsh(x, 2) > 0.5 ? 1 : 0), 'rgba(255,248,210,0.45)');
    }
    T.plants.forEach(function (P, j) { if (!P[4]) plant(c, P, G.ix0 + Math.round(P[0] * (iw - 1)), G.fl, G.fl - G.iy0 - 2, t, 1, j * 1.7 + T.w); });
    // the fish, the ones further back first
    e.glows = [];
    var fish = (q.fish || []).filter(function (f) { return f && ok(f.id); }).map(function (f) { return { f: f, m: swim(f, t) }; });
    fish.sort(function (a, b) { return (EXTRA[a.f.id] === 'crab') - (EXTRA[b.f.id] === 'crab') || b.m.z - a.m.z; });
    var y0 = G.iy0 + 1;
    fish.forEach(function (o) {
      var id = o.f.id, m = o.m, Lf = lenOf(id, T.maxL), H = EXTRA[id] ? 5 : tall(Lf), far = m.z > 0.55 && !EXTRA[id];
      var fx = G.ix0 + 1 + Math.round(m.u * (iw - 2 - Lf)), fy;
      if (EXTRA[id] === 'crab') { fy = G.fl - 3; drawFish(c, crab(7, m.step), fx, fy, 7, 5, 1); return; }
      fy = y0 + Math.round(m.v * Math.max(0, (far ? G.fl : G.iy1 - 1) - y0 - H)) + Math.round(m.bob * 0.6);   // the near ones down in front of the gravel
      var img = art(id, Lf, H, far);
      if (!img) return;
      drawFish(c, img, fx, fy, Lf, H, m.fx);
      var gc = glowOf(id);
      if (gc) e.glows.push({ x: fx + Lf / 2, y: fy + H / 2, r: Lf * 0.6, col: gc, a: (tier(id) >= 3 ? 0.24 : 0.16) * (0.75 + 0.25 * Math.sin(t * 2 + o.f.s)) });
    });
    T.plants.forEach(function (P, j) { if (P[4]) plant(c, P, G.ix0 + Math.round(P[0] * (iw - 1)), G.fl, G.fl - G.iy0 - 2, t, 1, j * 1.7 + T.w); });
    // bubbles off the airstone, up to the top
    var ax = G.ix0 + Math.round(T.air * (iw - 1));
    for (i = 0; i < 6; i++) {
      var ph = frac(t / 2.8 + i / 6), by = G.fl - 2 - ph * (G.fl - G.iy0 - 2), bx = ax + Math.round(Math.sin(ph * 9 + i * 1.7) * 0.8 + ph * 1.5);
      put(c, bx, by, i % 3 ? 'rgba(220,248,252,0.75)' : 'rgba(240,255,255,0.95)');
    }
    c.restore();
    // ripples and glints on the surface above
    for (i = 0; i < 4; i++) put(c, G.ix0 + Math.round(frac(t / (6 + i) + i * 0.27) * (iw - 1)), G.gt - 3 - (i % 2), 'rgba(230,252,255,0.85)');
    if (frac(t / 2.8) < 0.18) put(c, ax + 1, G.gt - 2, '#e8fcff', 2, 1);   // a bubble breaking the surface
    c.drawImage(L.front, 0, 0);
    return e.cv;
  }
  // its own light, added over the room's: the lamp down through the water, the strip lights, the rare fish glowing
  function glow(q, now, theme) {
    var T = TANKS[q.id], G = geo(T), e = slot(q), S = STYLE[theme] || STYLE.parchment;
    var c = e.gl.getContext('2d'), iw = G.ix1 - G.ix0 + 1;
    c.clearRect(0, 0, G.W, G.H);
    var gr = c.createLinearGradient(0, G.top + 3, 0, G.fl);
    gr.addColorStop(0, 'rgba(190,236,255,0.24)'); gr.addColorStop(0.25, 'rgba(150,220,240,0.1)'); gr.addColorStop(1, 'rgba(120,200,220,0.02)');
    c.fillStyle = gr; c.fillRect(G.ix0, G.top + 3, iw, G.fl - G.top - 3);
    var t = now / 1000;
    c.fillStyle = 'rgba(200,240,255,0.05)';                               // shafts of it, drifting
    for (var k = 0; k < 2; k++) {
      var sx = G.ix0 + Math.round(frac(t / 23 + k * 0.5) * iw * 1.2) - 6;
      c.beginPath(); c.moveTo(sx, G.iy0); c.lineTo(sx + 4, G.iy0); c.lineTo(sx + 10, G.fl); c.lineTo(sx + 5, G.fl); c.closePath(); c.fill();
    }
    if (S.led) {
      c.fillStyle = rgba(S.led, 0.5); c.fillRect(3, G.sb0 + 1, G.W - 6, 1);
      c.fillStyle = rgba(S.led, 0.14); c.fillRect(3, G.sb0, G.W - 6, 1); c.fillRect(3, G.sb0 + 2, G.W - 6, 1);
    }
    e.glows.forEach(function (o) {
      var g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, rgba(o.col, o.a)); g.addColorStop(1, rgba(o.col, 0));
      c.fillStyle = g; c.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    });
    return e.gl;
  }

  // ---- the pieces ----------------------------------------------------------------------------------------------------
  function piece(id) {
    var T = TANKS[id], G = geo(T);
    var show = live({ id: id, fish: SAMPLE }, 5200, 'parchment'), img = document.createElement('canvas');   // the shop's picture
    img.width = show.width; img.height = show.height; img.getContext('2d').drawImage(show, 0, 0);
    return { id: id, name: T.name, price: T.price, w: T.w, d: 1, walk: false, tank: true, after: 'nebula_tank',
             spr: { img: img, sx: 0, sy: G.top, sw: G.W, sh: G.H - G.top, ax: 0, ay: G.H - 32 },
             live: live, glow: glow, use: { type: 'tank', label: T.label, prompt: 'PRESS E TO LOOK' } };
  }
  if (typeof BridgeHome !== 'undefined' && BridgeHome.add) Object.keys(TANKS).forEach(function (id) { BridgeHome.add(piece(id)); });

  // ---- using it ------------------------------------------------------------------------------------------------------
  // the tank as saved now (the interaction may hold an older copy, if a partner's change came in since)
  function entryOf(inter) {
    var q = inter && inter._piece;
    if (!q) return null;
    var now = typeof BridgeHome !== 'undefined' && BridgeHome.at ? BridgeHome.at(q.id, q.x, q.y) : null;
    return now || q;
  }
  function fishIn(q) { return (q.fish || []).filter(function (f) { return f && f.id; }); }
  function visiting() { return typeof BridgePartner !== 'undefined' && BridgePartner.visiting ? BridgePartner.visiting() : null; }
  function persist() { if (typeof BridgeHome !== 'undefined' && BridgeHome.persist) BridgeHome.persist(); }
  function titleOf(q) { var V = visiting(); return (V ? V.name + '\'s ' : 'Your ') + TANKS[q.id].name.toLowerCase(); }
  function a(id, n) {                                      // "2 SILVERFIN", "A BLUEFIN", "AN EMBERJAW", "CROWNFIN"
    var nm = name(id).toUpperCase();
    if (n > 1) return n + ' ' + nm;
    return tier(id) >= 3 ? nm : (/^[AEIOU]/.test(nm) ? 'AN ' : 'A ') + nm;
  }
  function tally(fish) {
    var by = {}, order = [];
    fish.forEach(function (f) { if (!by[f.id]) { by[f.id] = 0; order.push(f.id); } by[f.id]++; });
    order.sort(function (x, y) { return tier(y) - tier(x); });
    var parts = order.map(function (id) { return a(id, by[id]); });
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' AND ' + parts[parts.length - 1] : parts[0] || '';
  }
  function describe(q) {
    var fish = fishIn(q), T = TANKS[q.id], room = T.cap - fish.length;
    if (!fish.length) return 'CLEAN WATER, GRAVEL, A PLANT OR TWO - AND NOTHING SWIMMING IN IT YET. IT HOLDS ' + T.cap + ' FISH: PUT IN ONE YOU\'VE CAUGHT.';
    return 'IN IT: ' + tally(fish) + '. ' + (room > 0 ? 'ROOM FOR ' + room + ' MORE.' : 'IT\'S FULL.');
  }

  function open(inter) {
    var q = entryOf(inter);
    if (!q || !TANKS[q.id]) return;
    var fish = fishIn(q), T = TANKS[q.id], V = visiting();
    var rows = [{ label: 'Look into the tank', sub: fish.length ? 'watch them up close' : 'the water, the weed, the bubbles', icon: fish[0] ? fish[0].id : 'glowtail', pick: function () { look(inter); } },
                { label: 'Put a fish in', sub: fish.length >= T.cap ? 'it\'s full' : V ? 'a present for ' + V.name : 'from your pack' + (holds().length ? ' or a ship\'s hold' : ''), icon: 'silverfin',
                  disabled: fish.length >= T.cap, pick: function () { putMenu(inter); } }];
    if (!V) rows.push({ label: 'Take one out', sub: fish.length ? 'back into your pack' : 'nothing in it', icon: fish.length ? fish[fish.length - 1].id : 'spore_minnow',
                        disabled: !fish.length, pick: function () { takeMenu(inter); } });
    choose({ title: titleOf(q), text: describe(q) + (V ? '\n\nIT\'S ' + V.name.toUpperCase() + '\'S - YOU CAN LOOK, AND SLIP A FISH IN FOR THEM.' : ''), rows: rows, closeLabel: 'Leave' });
  }

  // ships of yours lying at this island with fish in their holds (only on Lumar: that's where the fleet sails)
  function holds() {
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() || '' : '';
    if (!/^lumar/.test(w) || typeof BridgeFleet === 'undefined' || !BridgeFleet.here) return [];
    return BridgeFleet.here(w).filter(function (s) { var c = BridgeFleet.catchOf(s); return Object.keys(c).some(function (id) { return c[id] > 0 && ok(id); }); });
  }
  function byRarity(x, y) { return tier(y) - tier(x) || (name(x) < name(y) ? -1 : 1); }
  function putMenu(inter, msg) {
    var q = entryOf(inter);
    if (!q) return;
    var T = TANKS[q.id], room = T.cap - fishIn(q).length, rows = [];
    var all = typeof BridgeInventory !== 'undefined' ? BridgeInventory.getAll() : {};
    Object.keys(all).filter(ok).sort(byRarity).forEach(function (id) {
      rows.push({ label: name(id), sub: 'in your pack · ' + all[id], note: BridgeFishArt.TIERS[tier(id)].name, icon: id, disabled: room <= 0,
                  pick: function () { putIn(inter, id, null); } });
    });
    holds().forEach(function (s) {
      var c = BridgeFleet.catchOf(s);
      Object.keys(c).filter(function (id) { return c[id] > 0 && ok(id); }).sort(byRarity).forEach(function (id) {
        rows.push({ label: name(id), sub: 'the ' + s.name + '\'s hold · ' + c[id], note: BridgeFishArt.TIERS[tier(id)].name, icon: id, disabled: room <= 0,
                    pick: function () { putIn(inter, id, s.id); } });
      });
    });
    var text = (msg ? msg + '\n\n' : '') + (room > 0 ? 'ROOM FOR ' + room + ' MORE.' : 'IT\'S FULL - TAKE ONE OUT TO MAKE ROOM.') +
      (rows.length ? '' : '\n\nNO FISH ON YOU. CATCH ONE - OFF ANY PIER, FROM ANY BOAT - AND BRING IT HOME. CRABS AND SHRIMP GO IN TOO.');
    choose({ title: 'Put a fish in', text: text, rows: rows,
             buttons: [{ label: 'Look into it', act: function () { look(inter); } }, { label: 'Back', act: function () { open(inter); } }], closeLabel: 'Done' });
  }
  var SETTLE = ['IT TAKES A TURN OF THE TANK AND SETTLES IN.', 'IT SHOOTS ROUND THE TANK TWICE, THEN DECIDES IT LIKES IT HERE.',
                'THE WATER LIGHTS UP A LITTLE AROUND IT.', 'THE TANK FEELS SMALL ALL OF A SUDDEN. IT LOOKS AT YOU THROUGH THE GLASS.'];
  function putIn(inter, id, shipId) {
    var q = entryOf(inter);
    if (!q) return;
    var T = TANKS[q.id];
    if (fishIn(q).length >= T.cap) return putMenu(inter, 'IT\'S FULL.');
    if (shipId) {
      var s = BridgeFleet.get(shipId);
      if (!s || !BridgeFleet.takeFish(s, id, 1)) return putMenu(inter, 'IT\'S NOT IN THE HOLD ANY MORE.');
    } else if (!(typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0 && BridgeInventory.removeItem(id, 1))) return putMenu(inter, 'YOU HAVEN\'T GOT ONE ON YOU.');
    q.fish = fishIn(q);
    q.fish.push({ id: id, s: Math.floor(Math.random() * 100000) });
    persist(); sfx('plop');
    var V = visiting();
    putMenu(inter, 'IN IT GOES: ' + a(id, 1) + '. ' + (EXTRA[id] === 'crab' ? 'IT SINKS TO THE GRAVEL AND GOES ABOUT ITS BUSINESS, SIDEWAYS.' : SETTLE[tier(id)]) +
      (V ? ' A PRESENT FOR ' + V.name.toUpperCase() + '.' : ''));
  }
  function takeMenu(inter, msg) {
    var q = entryOf(inter);
    if (!q || visiting()) return;
    var by = {};
    fishIn(q).forEach(function (f) { by[f.id] = (by[f.id] || 0) + 1; });
    var rows = Object.keys(by).sort(byRarity).map(function (id) {
      return { label: name(id), sub: 'in the tank · ' + by[id], note: BridgeFishArt.TIERS[tier(id)].name, icon: id, pick: function () { take(inter, id); } };
    });
    choose({ title: 'Take one out', text: (msg ? msg + '\n\n' : '') + (rows.length ? 'INTO YOUR PACK - TO EAT, TO SELL, OR TO PUT IN ANOTHER TANK.' : 'NOTHING LEFT IN IT.'), rows: rows,
             buttons: [{ label: 'Back', act: function () { open(inter); } }], closeLabel: 'Done' });
  }
  function take(inter, id) {
    var q = entryOf(inter);
    if (!q || visiting()) return;
    var fish = fishIn(q), at = -1;
    for (var i = fish.length - 1; i >= 0; i--) if (fish[i].id === id) { at = i; break; }
    if (at < 0) return takeMenu(inter);
    if (typeof BridgeInventory === 'undefined' || !BridgeInventory.addItem(id, 1)) return takeMenu(inter, 'YOUR PACK\'S FULL - MAKE ROOM FIRST.');
    fish.splice(at, 1);
    q.fish = fish;
    persist(); sfx('pickup');
    takeMenu(inter, 'OUT IT COMES, DRIPPING: ' + a(id, 1) + ', INTO YOUR PACK.');
  }

  // ---- for sale: the Ship's Chandler (js/storage.js), beside a home's furnishing shop (H, where the catalogue has them) --
  function shop(note, back) {
    var H = typeof BridgeHome !== 'undefined' ? BridgeHome : null;
    choose({ title: 'Fish tanks', text: (typeof note === 'string' && note ? note + '\n\n' : '') +
        'GLASS, A LAMP IN THE LID, GRAVEL AND WEED: SOMEWHERE FOR WHAT YOU CATCH TO LIVE. PUT ONE DOWN ABOARD OR IN ANY PLACE OF YOURS - PRESS H (FURNISH) THERE.',
      rows: Object.keys(TANKS).map(function (id) {
        var T = TANKS[id], P = H && H.piece ? H.piece(id) : null, have = H && H.spare ? H.spare(id) : 0;
        return { label: T.name, sub: T.cap + ' fish · ' + T.w + ' tiles wide' + (have ? ' · ' + have + ' not put down yet' : ''), note: T.price + ' coins', disabled: !P,
                 draw: function (g, s) { if (P) drawThumb(g, P, s); },
                 pick: function () {
                   H.buyPiece(id).then(function (r) {
                     if (r && r.ok) { sfx('coin'); shop('BOUGHT: ' + T.name.toUpperCase() + '. IT\'S IN YOUR FURNISHING TRAY - PRESS H ABOARD OR AT HOME TO PUT IT DOWN.', back); }
                     else shop(r && r.reason === 'insufficient' ? 'THAT\'S ' + T.price + ' COINS - MORE THAN YOU HAVE.' : 'THE SALE WON\'T GO THROUGH RIGHT NOW.', back);
                   });
                 } };
      }), buttons: back ? [{ label: 'Back', act: back }] : [], closeLabel: 'Leave' });
  }
  function drawThumb(g, P, s) {
    var S = P.spr, k = Math.min(s / S.sw, s / S.sh), w = Math.round(S.sw * k), h = Math.round(S.sh * k);
    g.imageSmoothingEnabled = false;
    g.drawImage(S.img, S.sx, S.sy, S.sw, S.sh, Math.round((s - w) / 2), s - h, w, h);
  }

  // ---- looking into it: the tank fills the screen ---------------------------------------------------------------------
  var tv = null;      // { el, cv, c, names, k (css px a native px), W, H, inter, raf, info (the fish named below), pinned, bg, drawn }
  function look(inter) {
    var q = entryOf(inter);
    if (!q) return;
    if (!tv) {
      var el = document.createElement('div');
      el.id = 'tank-view';
      el.innerHTML = '<canvas class="tv-canvas"></canvas><div class="tv-names"></div><div class="tv-glass"></div>' +
        '<div class="tv-foot"><div class="tv-title"></div><div class="tv-caption"></div>' +
        '<button class="tv-back"><span class="ip-key">Esc</span> Step back</button></div>';
      document.body.appendChild(el);
      tv = { el: el, cv: el.querySelector('.tv-canvas'), names: el.querySelector('.tv-names') };
      tv.c = tv.cv.getContext('2d');
      el.querySelector('.tv-back').addEventListener('click', function (e) { e.stopPropagation(); away(); });
      tv.cv.addEventListener('pointerdown', onPoint);
      tv.cv.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') hover(e); });
    }
    clearTimeout(tv.outT); clearTimeout(tv.leanT);
    tv.inter = inter; tv.info = null;
    // a canvas of whole native pixels the screen's shape, scaled up by a whole number
    var vw = window.innerWidth, vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    tv.k = Math.max(2, Math.round(Math.min(vw / 400, vh / 230)));
    tv.W = Math.ceil(vw / tv.k); tv.H = Math.ceil(vh / tv.k);
    tv.cv.width = tv.W; tv.cv.height = tv.H;
    tv.cv.style.width = tv.W * tv.k + 'px'; tv.cv.style.height = tv.H * tv.k + 'px';
    tv.bg = null;
    tv.names.innerHTML = '';
    tv.el.className = 'tv-' + ((typeof BridgeHome !== 'undefined' && BridgeHome.HOMES[BridgeWorld.getWorldId()] || {}).theme || 'parchment');
    tv.el.querySelector('.tv-title').textContent = titleOf(q);
    caption();
    // lean in toward the tank, then it fills the screen
    var sv = BridgeWorld.getScreenView(), bc = document.getElementById('bridge-canvas');
    if (sv && sv.ts && bc) {
      var T = TANKS[q.id];
      bc.style.transformOrigin = Math.round(sv.offX + (q.x + T.w / 2) * sv.ts) + 'px ' + Math.round(sv.offY + (q.y - 0.3) * sv.ts) + 'px';
      bc.classList.add('fp-lean');
    }
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    cancelAnimationFrame(tv.raf);
    tv.leaning = true;
    tv.leanT = setTimeout(function () {
      tv.leaning = false;
      tv.el.classList.add('visible');
      void tv.el.offsetWidth;
      tv.el.classList.add('tv-in');
      tv.raf = requestAnimationFrame(frame);
    }, 260);
    sfx('open');
  }
  function looking() { return !!(tv && tv.el.classList.contains('visible')); }
  function away() {
    var bc0 = document.getElementById('bridge-canvas');
    if (tv && tv.leaning) {                                // still leaning in: straight back
      clearTimeout(tv.leanT); tv.leaning = false;
      document.removeEventListener('keydown', onKey, true);
      if (bc0) bc0.classList.remove('fp-lean');
      if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
      return;
    }
    if (!looking() || tv.el.classList.contains('tv-out')) return;
    document.removeEventListener('keydown', onKey, true);
    tv.el.classList.remove('tv-in'); tv.el.classList.add('tv-out');
    var bc = document.getElementById('bridge-canvas');
    if (bc) bc.classList.remove('fp-lean');
    tv.outT = setTimeout(function () {
      tv.el.classList.remove('visible', 'tv-out');
      cancelAnimationFrame(tv.raf);
      if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    }, 380);
  }
  function onKey(e) {
    if (['Escape', 'e', 'E', ' ', 'Enter'].indexOf(e.key) < 0) return;
    e.preventDefault(); e.stopPropagation();
    away();
  }
  function caption() {
    var el = tv.el.querySelector('.tv-caption'), q = entryOf(tv.inter);
    if (tv.info) {
      var id = tv.info, it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id), T = BridgeFishArt.TIERS[tier(id)];
      el.innerHTML = '<b style="color:' + T.col + '">' + esc(name(id)) + '</b> · <span style="color:' + T.col + '">' + esc(T.name) + '</span>' + (it && it.desc ? '<br>' + esc(it.desc) : '');
    } else el.textContent = q ? describe(q) : '';
  }
  // which fish is under a point on the screen (native px), from where they were last drawn
  function fishAt(e) {
    var r = tv.cv.getBoundingClientRect(), x = (e.clientX - r.left) / tv.k, y = (e.clientY - r.top) / tv.k, best = null, bd = 1e9;
    (tv.drawn || []).forEach(function (d) {
      var cx = d.x + d.w / 2, cy = d.y + d.h / 2, dx = Math.abs(x - cx) - d.w / 2, dy = Math.abs(y - cy) - d.h / 2;
      var dist = Math.max(0, dx) + Math.max(0, dy);
      if (dist < 6 && dist < bd) { bd = dist; best = d.id; }
    });
    return best;
  }
  function hover(e) {
    var id = fishAt(e);
    if (id === tv.info || (!id && Date.now() < (tv.pinned || 0))) return;
    tv.info = id; caption();
  }
  function onPoint(e) {
    e.stopPropagation();
    var id = fishAt(e);
    if (!id) return away();                      // the water: step back
    tv.info = id; tv.pinned = Date.now() + 4000; caption();
    sfx('blip');
  }

  // the still part of the close-up: the water's bands, weed and rock dim against the back glass, the gravel bed
  function backdrop(W, H) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), img = c.createImageData(W, H), d = img.data, x, y, i, j;
    var fl = Math.round(H * 0.8), BY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    var cols = WATER.map(function (h) { var p = parseInt(h.slice(1), 16); return [(p >> 16) & 255, (p >> 8) & 255, p & 255]; });
    for (y = 0; y < fl; y++) {
      var fq = Math.pow(y / fl, 0.85) * (cols.length - 1), i0 = Math.min(cols.length - 2, Math.floor(fq)), tq = fq - i0;
      for (x = 0; x < W; x++) {
        var col = tq * 16 > BY[y & 3][x & 3] + 0.5 ? cols[i0 + 1] : cols[i0], k = (y * W + x) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    var far = rgba('#0e3a44', 0.34);
    for (x = 10; x < W; x += 34 + Math.floor(hsh(x, 16) * 40)) {                 // low mounds of rock at the back
      var mw = 24 + Math.floor(hsh(x, 17) * 30), mh = 6 + Math.floor(hsh(x, 18) * 10);
      for (i = 0; i < mw; i++) { var th = Math.round(mh * Math.sqrt(1 - Math.pow(2 * i / mw - 1, 2))); put(c, x + i, fl - th, far, 1, th); }
    }
    for (x = 6; x < W; x += 26 + Math.floor(hsh(x, 13) * 30)) {                  // clumps of far weed
      var nb = 3 + Math.floor(hsh(x, 14) * 3);
      for (j = 0; j < nb; j++) {
        var bh = Math.round(fl * (0.14 + 0.36 * hsh(x + j, 15))), lean = (j - nb / 2) * 0.08;
        for (y = 0; y < bh; y++) put(c, x + j * 3 + Math.round(Math.sin(y * 0.03 + x + j) * 2 + lean * y), fl - 1 - y, far, y < bh * 0.8 ? 2 : 1, 1);
      }
    }
    // the gravel: pebbles from the back row to the front, each lit from above, hazier at the back
    put(c, 0, fl, '#5a4a3a', W, H - fl);
    var n = Math.round(W * (H - fl) / 12);
    for (i = 0; i < n; i++) {
      var dep = Math.pow(hsh(i, 1), 0.9), py = Math.round(fl - 1 + dep * (H - fl + 1)), px = Math.round(hsh(i, 2) * (W + 6) - 3);
      var rw = 3 + Math.floor(hsh(i, 3) * 3 + dep * 3), rh = Math.max(2, Math.round(rw * 0.6));
      var base = GRAVEL[Math.floor(hsh(i, 4) * GRAVEL.length)], lite = mixHex(base, '#ffffff', 0.3), dark = mixHex(base, '#1a120c', 0.45);
      for (j = 0; j < rh; j++) for (var ii = 0; ii < rw; ii++) {
        if ((j === 0 || j === rh - 1) && (ii === 0 || ii === rw - 1)) continue;     // rounded off
        put(c, px + ii, py + j, j === 0 || (ii === 0 && j < rh - 1) ? lite : j === rh - 1 || ii === rw - 1 ? dark : base);
      }
    }
    c.fillStyle = 'rgba(30,80,92,0.4)'; c.fillRect(0, fl - 1, W, 3);           // the back of the bed, under the water's haze
    c.fillStyle = 'rgba(30,80,92,0.18)'; c.fillRect(0, fl + 2, W, 3);
    return { cv: cv, fl: fl };
  }
  function mixHex(a, b, t) {
    var p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
    return '#' + [16, 8, 0].map(function (s) { var v = Math.round(((p >> s) & 255) * (1 - t) + ((q >> s) & 255) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  // the tank's stones up close: lumpy, mottled, lit from the lamp above, a little weed on some
  var STONE = ['#3a4048', '#555c64', '#7c838c', '#a6acb2'];
  function bigStones(c, T, W, fl) {
    T.stones.forEach(function (st, i) {
      var sw = Math.round(W * st[1] / 62), sh = Math.round(sw * (0.42 + 0.16 * hsh(i, 7))), sx = Math.round(st[0] * W - sw / 2), base = fl + 3;
      for (var x = 0; x < sw; x++) {
        var tx = 2 * (x + 0.5) / sw - 1, top = Math.round(sh * Math.pow(Math.max(0, 1 - tx * tx), 0.7) * (0.9 + 0.1 * Math.sin(x * 0.6 + i * 2)));
        for (var y = 0; y < top; y++) {
          var v = y / Math.max(1, top), lit = tx < 0.1 && v > 0.55, shade = tx > 0.5 || v < 0.2, m = hsh(sx + x, y + i * 31);
          var k = lit ? 3 : shade ? 1 : 2;
          if (m > 0.85) k = Math.max(0, k - 1); else if (m < 0.08) k = Math.min(3, k + 1);   // mottled
          var col = y === top - 1 || x === 0 || x === sw - 1 ? '#262c32' : STONE[k];
          if (i % 2 === 0 && v > 0.85 && y < top - 1 && hsh(x, i) > 0.55) col = hsh(x, i + 9) > 0.5 ? '#3e7040' : '#5a9a50';   // moss
          put(c, sx + x, base - y, col);
        }
      }
    });
  }

  function frame() {
    if (!looking()) return;
    var q = entryOf(tv.inter), c = tv.c, W = tv.W, H = tv.H, t = Date.now() / 1000;     // the room's clock (js/world.js), so they agree
    if (!q) { away(); return; }
    var T = TANKS[q.id];
    if (!tv.bg || tv.bg.cv.width !== W || tv.bg.cv.height !== H) tv.bg = backdrop(W, H);
    var fl = tv.bg.fl, top = Math.round(H * 0.08), x, i;
    c.imageSmoothingEnabled = false;
    c.drawImage(tv.bg.cv, 0, 0);
    // light: shafts from the lamp, drifting; dancing on the gravel
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < 4; i++) {
      var sx = (frac(t / 37 + i * 0.27) * 1.4 - 0.2) * W, sw = W * (0.04 + 0.03 * hsh(i, 21));
      c.fillStyle = 'rgba(200,240,255,' + (0.035 + 0.02 * Math.sin(t * 0.7 + i)).toFixed(3) + ')';
      c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx + sw, 0); c.lineTo(sx + sw + W * 0.12, fl); c.lineTo(sx + W * 0.1, fl); c.closePath(); c.fill();
    }
    for (x = 0; x < W; x += 2) {
      var v = Math.sin(x * 0.11 + t * 1.3) + Math.sin(x * 0.047 - t * 0.8 + 1.3) + Math.sin(x * 0.21 + t * 0.5);
      if (v > 1.7) put(c, x, fl + 1 + (hsh(x, 31) > 0.5 ? 1 : 0), 'rgba(255,246,200,0.45)', 2, 1);
    }
    c.restore();
    var kz = clamp(W / 105, 3, 4.6), kp = Math.max(2, Math.round(W / 130)), hb = fl - top;
    var foot = function (P) { return Math.round(P[0] * (W - 1)); };
    T.plants.forEach(function (P, j) { if (!P[4]) bigPlant(c, P, foot(P), fl + 2, hb * 0.95, t, kp, j * 1.7 + T.w, W); });
    bigStones(c, T, W, fl);
    // the airstone and its bubbles
    var ax = Math.round(T.air * W);
    put(c, ax - 6, fl, '#262c32', 13, 4); put(c, ax - 5, fl, '#5a6068', 11, 1); put(c, ax - 5, fl + 1, '#3e444c', 11, 2);
    for (i = 0; i < 18; i++) {
      var ph = frac(t / 3.4 + i / 18), r = 1 + Math.floor(hsh(i, 41) * 2.6 + ph * 1.6);
      var by = fl - 3 - Math.pow(ph, 1.15) * (fl - top), bx = ax + Math.sin(ph * 10 + i * 1.9) * (1.5 + ph * 4) + (hsh(i, 42) - 0.5) * 6;
      bubble(c, bx, by, r);
    }
    // the fish, by how big they really come: further back ones smaller and dimmer, first; names under each
    var drawn = [], fish = fishIn(q).filter(function (f) { return ok(f.id); }).map(function (f) { return { f: f, m: swim(f, t) }; });
    fish.sort(function (p1, p2) { return (EXTRA[p1.f.id] === 'crab') - (EXTRA[p2.f.id] === 'crab') || p2.m.z - p1.m.z; });
    fish.forEach(function (o) {
      var id = o.f.id, m = o.m, K = EXTRA[id], far = m.z > 0.55 && !K, L, Hh, img;
      if (K) { L = Math.round(9 * kz); Hh = Math.round(L * (K === 'crab' ? 0.62 : 0.56)); }
      else { L = Math.min(Math.round(W * 0.26), Math.round(lenOf(id, 24) * kz * (far ? 0.8 : 1))); Hh = tall(L); }
      var fx = Math.round(W * 0.06 + m.u * (W * 0.88 - L)), lo = fl - Hh + (far ? -2 : Math.round(Hh * 0.3));
      var fy = K === 'crab' ? fl - Hh + 4 : Math.round(top + 8 + m.v * Math.max(0, lo - top - 8) + m.bob * 1.5);
      img = K === 'crab' ? crab(L, m.step) : art(id, L, Hh, far);
      if (!img) return;
      var gc = glowOf(id);
      if (gc) {
        var gx = fx + L / 2, gy = fy + Hh / 2, gr = L * 0.7, ga = (tier(id) >= 3 ? 0.32 : 0.2) * (0.75 + 0.25 * Math.sin(t * 2 + o.f.s));
        var g = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, rgba(gc, ga)); g.addColorStop(1, rgba(gc, 0));
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(gx - gr, gy - gr, gr * 2, gr * 2); c.restore();
      }
      drawFish(c, img, fx, fy, L, Hh, K === 'crab' ? 1 : m.fx);
      drawn.push({ id: id, x: fx, y: fy, w: L, h: Hh, far: far, s: o.f.s });
    });
    tv.drawn = drawn;
    T.plants.forEach(function (P, j) { if (P[4]) bigPlant(c, P, foot(P), fl + 2, hb * 0.95, t, kp, j * 1.7 + T.w, W); });
    // the surface from below: a bright wavering band, the lamp beyond it
    for (x = 0; x < W; x++) {
      var sy = Math.round(top * 0.55 + Math.sin(x * 0.07 + t * 1.2) * 1.5 + Math.sin(x * 0.023 - t * 0.6) * 2);
      put(c, x, 0, '#9edde4', 1, Math.max(1, sy));
      put(c, x, sy, (Math.sin(x * 0.3 + t * 2) > 0.6 ? '#e8fcff' : '#bfecf0'));
      put(c, x, sy + 1, 'rgba(160,226,234,0.5)');
    }
    names(drawn);
    tv.raf = requestAnimationFrame(frame);
  }
  // a bubble: a ring of light round a clear middle, a glint on top
  function bubble(c, x, y, r) {
    x = Math.round(x); y = Math.round(y);
    if (r <= 1) { put(c, x, y, 'rgba(230,252,255,0.85)', 2, 2); return; }
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd > r + 0.35) continue;
      put(c, x + dx, y + dy, dd > r - 0.55 ? 'rgba(220,250,255,0.8)' : 'rgba(200,240,250,0.16)');
    }
    put(c, x - Math.round(r * 0.45), y - Math.round(r * 0.45), '#ffffff');
  }
  // the names, crisp at the screen's own resolution, under each fish
  function names(drawn) {
    var box = tv.names, els = box.children, placed = [];
    while (els.length < drawn.length) { var s = document.createElement('span'); s.className = 'tv-name'; box.appendChild(s); }
    for (var i = 0; i < els.length; i++) {
      var d = drawn[i], el = els[i];
      if (!d) { el.style.display = 'none'; continue; }
      el.style.display = '';
      if (el._id !== d.id) { el._id = d.id; el.textContent = name(d.id); el.style.color = BridgeFishArt.TIERS[tier(d.id)].col; el._w = el.offsetWidth || 80; }
      // under its fish, nudged down clear of a name already placed; easing there, so they don't jump
      var x = (d.x + d.w / 2) * tv.k, y = (d.y + d.h + 1) * tv.k, w = el._w + 6;
      if (d.y + d.h > tv.bg.fl - 4) y = d.y * tv.k - 22;                // down on the gravel: over it, clear of the caption
      for (var tries = 0; tries < 4; tries++) {
        var hit = placed.some(function (b) { return Math.abs(b.x - x) < (b.w + w) / 2 && Math.abs(b.y - y) < 19; });
        if (!hit) break;
        y += 19;
      }
      placed.push({ x: x, y: y, w: w });
      el._y = el._y == null || Math.abs(el._y - y) > 80 ? y : el._y + (y - el._y) * 0.2;
      el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(el._y) + 'px) translateX(-50%)';
      el.classList.toggle('far', d.far);
      el.classList.toggle('on', d.id === tv.info);
    }
  }

  function init() {
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('tank', open, 'Look');
    if (typeof BridgeState !== 'undefined' && BridgeState.onChange) BridgeState.onChange(function (s) { if (s !== 'world' && tv && (looking() || tv.leaning)) away(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { TANKS: TANKS, ok: ok, swim: swim, open: open, look: look, away: away, looking: looking, shop: shop,
           _live: live, _drawn: function () { return tv && tv.drawn; } };
})();
