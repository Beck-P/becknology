/**
 * BridgeSloop — sail yourself from one Lumar island to the next, in a small boat, at the world's own scale.
 *
 * You cast off from the island's quay in the sloop (a Blender sheet, js/../assets/scenes/sloop: the hull at 32
 * headings) and sail the strait to the other island's quay. The islands are their own scene renders at full size,
 * with their own water (BridgeSea.drawWaterAt), so you sail away from the place you were standing and come in to
 * the place you'll step onto; between them the spore sea, in each island's colour, with a seam of foam where the
 * two seas meet.
 *
 * Sailing is the real thing, simply: the wind comes over one side (the pennant at the masthead shows where), you
 * steer with the tiller (←/→) and trim the sheet (↑ haul in, ↓ ease out). Too far out and the sail luffs and you
 * slow; too far in and it stalls. Into the wind you stop (in irons) — bear away. Coming about, the boom swings
 * over; gybing, it slams across. Gusts darken the water before they reach you. There are reefs to keep off, a
 * fisherman at anchor to hail, things adrift to haul aboard, buoys at each harbour mouth, gulls, flying fish, and
 * now and then a spore whale. E comes alongside the quay at the other end; Esc offers to skip ahead or turn back.
 *
 *   BridgeSloop.start('lumar-rose', 'lumar-sapphire')
 */
var BridgeSloop = (function () {
  var TS = 32, C45 = Math.SQRT1_2;
  var SHEET = '/bridge/assets/scenes/sloop/';
  var L = 2.6, MU = -L / 2 + 0.66 * L;                 // the hull's length; the mast, from the middle (tiles)
  var VMAX = 4.4;                                       // tiles a second on a beam reach in a full breeze
  var GAP = 58;                                         // open water between the islands (tiles)
  var LINES = [                                         // what the fisherman says when you hail him
    "Wind's been backing all evening. Ease her out past the reef or she'll stall on you.",
    'They say the spore whales sing under Midnight when the sea goes still. Never heard it myself. Never not listened.',
    "Old Tamsin's lamp has been talking to Midnight again. Three long, one short. Nobody answers. Nobody ever has.",
    "Pulled up a bell once, off the Teeth. Green with age. It rang on the deck with no one near it. Threw it back.",
    'Fish are deep tonight. Something big moving under them, I reckon. Mind your rudder.',
    "My da said there's a sea past the five — a sixth colour, the one the old charts leave blank. Said it like he'd seen it.",
    "Silverfin running off Sapphire. If you've a line aboard, now's the time.",
    'Keep the red buoy to port coming home. Forgot it once. Spent the night on a rock with the crabs.'
  ];

  var running = false, canvas = null, ctx = null, buf = null, bctx = null, raf = 0, last = 0, began = 0;
  var Z = 2, W = 480, H = 300, dpr = 1;
  var from = null, to = null, A = null, B = null, mid = null, dir = null;
  var boat = null, wind = null, cam = null, keys = {}, phase = 'load', phaseAt = 0;
  var wake = [], spray = [], gulls = [], fish = [], things = [], whale = null;
  var msg = null, msgAt = 0, prompt = null, menu = null, sheetImg = null, readyCount = 0, hold = 0;
  var seaWas = null, lastLuff = 0, lastBell = 0, auto = false, route = [], leg = 0;

  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function vnoise(x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
  function isles() { return typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles ? BridgeVoyage._isles : null; }
  function knows(id) { var I = isles(); return !!(I && I[id]); }

  // ---- the sheet: the sloop at 32 headings, the dory at 8, the things on the water --------------------------------
  // cut at the water line (shore.png: anything under the surface goes) so hulls and rocks sit in the sea
  var sheetMeta = null;
  function loadSheet(cb) {
    if (sheetImg) { cb(); return; }
    fetch(SHEET + 'scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (meta) {
      sheetMeta = meta;
      var q = '?v=' + meta.rev, full = new Image(), shore = new Image(), n = 2;
      function done() {
        if (--n) return;
        var c = document.createElement('canvas'); c.width = full.width; c.height = full.height;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(full, 0, 0);
        var px = x.getImageData(0, 0, c.width, c.height);
        var s = document.createElement('canvas'); s.width = c.width; s.height = c.height;
        var sx = s.getContext('2d', { willReadFrequently: true });
        sx.drawImage(shore, 0, 0);
        var sp = sx.getImageData(0, 0, c.width, c.height).data, d = px.data;
        for (var i = 0; i < c.width * c.height; i++) if (sp[i * 4 + 1] > 0) d[i * 4 + 3] = 0;
        x.putImageData(px, 0, 0);
        sheetImg = c;
        cb();
      }
      full.onload = done; shore.onload = done;
      full.onerror = shore.onerror = function () { cb(new Error('sheet')); };
      full.src = SHEET + 'full.png' + q; shore.src = SHEET + 'shore.png' + q;
    }).catch(function () { cb(new Error('sheet')); });
  }
  // a cell of the sheet: [sx, sy] of its top-left (4 × 4 tiles), the thing's centre at (64, 83) in it
  function cell(row, col) { return [col * 128, Math.round((sheetMeta ? sheetMeta.originY : 19.2) + row * 128)]; }
  var STATIC = { rock_a: 0, rock_b: 1, rock_c: 2, reef: 3, buoy_red: 4, buoy_green: 5, crate: 6, barrel: 7 };

  // ---- the islands: their renders, water and land at full size ---------------------------------------------------
  function loadIsland(id, cb) {
    var I = { id: id, pal: isles()[id].pal, name: isles()[id].name, ox: 0, oy: 0 };
    var n = 3;
    function done() { if (--n === 0) { measure(I); cb(I); } }
    fetch('/bridge/assets/worlds/' + id + '.json?v=' + Date.now()).then(function (r) { return r.json(); })
      .then(function (w) { I.world = w; done(); }).catch(function () { I.world = null; done(); });
    BridgeScene.load(id, function (sc) { I.sc = sc; done(); });
    fetch('/bridge/assets/scenes/' + id + '/scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (meta) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0);
        var p = x.getImageData(0, 0, im.width, im.height).data, m = new Uint8Array(im.width * im.height);
        // 0 open water, 1 land (or anything standing out of it), 2 shallows the keel would touch
        for (var i = 0; i < m.length; i++) {
          var g = p[i * 4 + 1], empty = p[i * 4 + 2] > 127;
          m[i] = empty ? 0 : g === 0 ? 1 : g < 46 ? 2 : 0;
        }
        I.mask = m; I.mw = im.width; I.mh = im.height; I.meta = meta;
        done();
      };
      im.onerror = function () { I.mask = null; I.meta = meta; done(); };
      im.src = '/bridge/assets/scenes/' + id + '/shore.png?v=' + meta.rev;
    }).catch(function () { I.mask = null; done(); });
  }
  /** What's at passage tile (x, r) on island I: 0 water, 1 land, 2 shallows (or 0 off its render). */
  function ground(I, x, r) {
    if (!I || !I.mask) return 0;
    var px = Math.floor((x - I.ox) * TS + I.meta.originX), py = Math.floor((r - I.oy) * TS + I.meta.originY);
    if (px < 0 || py < 0 || px >= I.mw || py >= I.mh) return 0;
    return I.mask[py * I.mw + px];
  }
  function groundAt(x, r) { return Math.max(ground(A, x, r), ground(B, x, r)); }
  function clear(I, x, r, rad) {               // open water all round (x, r) out to rad
    if (ground(I, x, r)) return false;
    for (var k = 0; k < 16; k++) {
      var a = k / 16 * Math.PI * 2;
      for (var d = 0.4; d <= rad; d += 0.4) if (ground(I, x + Math.cos(a) * d, r + Math.sin(a) * d)) return false;
    }
    return true;
  }
  // the island's quay: its DOCK, and the nearest open water off it with room for the sloop
  function measure(I) {
    var w = I.world || { width: 40, height: 30, interactions: [] };
    var dock = (w.interactions || []).filter(function (it) { return it.label === 'DOCK' || it.label === 'GALLEON'; })[0];
    I.dock = dock ? [dock.x + 0.5, dock.y + 0.5] : [w.width / 2, w.height];
    I.cx = w.width / 2; I.cy = w.height / 2; I.w = w.width; I.h = w.height;
  }
  function berth(I) {
    var best = null, bd = 1e9, ox = I.dock[0] + I.ox, oy = I.dock[1] + I.oy;
    var out = Math.atan2(I.dock[1] - I.cy, I.dock[0] - I.cx);
    for (var d = 1.4; d <= 9 && !best; d += 0.35) {
      for (var k = 0; k < 40; k++) {
        var a = k / 40 * Math.PI * 2, x = ox + Math.cos(a) * d, r = oy + Math.sin(a) * d;
        if (!clear(I, x, r, 1.4)) continue;
        var score = d - 0.8 * Math.cos(wrap(a - out));
        if (score < bd) { bd = score; best = [x, r]; }
      }
    }
    return best || [ox, oy + 3];
  }

  /** The way out of a harbour: from the berth over open water (half-tile cells, a tile's clearance) to the first
   *  cell clear of the island's map, pulled straight — the channel you sail out by, and in by at the other end. */
  function channel(I) {
    var G = 0.5, pad = 14, x0 = -pad, r0 = -pad, nx = Math.ceil((I.w + pad * 2) / G), nr = Math.ceil((I.h + pad * 2) / G);
    var seen = new Int32Array(nx * nr).fill(-1), q = [];
    function cellOf(x, r) { return Math.round((r - r0) / G) * nx + Math.round((x - x0) / G); }
    function at(k) { return [x0 + (k % nx) * G, r0 + Math.floor(k / nx) * G]; }
    var start = cellOf(I.berth[0] - I.ox, I.berth[1] - I.oy);
    if (start < 0 || start >= seen.length) return [I.berth.slice()];
    seen[start] = start; q.push(start);
    var goal = -1, ox = I.ox, oy = I.oy;
    I.ox = 0; I.oy = 0;                                       // search in the island's own tiles
    for (var h = 0; h < q.length && goal < 0; h++) {
      var k = q[h], p = at(k);
      if (p[0] < -3 || p[1] < -3 || p[0] > I.w + 3 || p[1] > I.h + 3) { goal = k; break; }
      [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) {
        var cx = (k % nx) + d[0], cr = Math.floor(k / nx) + d[1];
        if (cx < 0 || cr < 0 || cx >= nx || cr >= nr) return;
        var j = cr * nx + cx;
        if (seen[j] >= 0) return;
        var pt = at(j);
        if (!clear(I, pt[0], pt[1], 1.0)) { seen[j] = -2; return; }
        seen[j] = k; q.push(j);
      });
    }
    var path = [];
    if (goal >= 0) for (var c = goal; ; c = seen[c]) { var pp = at(c); path.unshift([pp[0], pp[1]]); if (c === start) break; }
    // pulled straight: keep a point only where you can't see past it
    var out = [path[0] || [I.berth[0] - ox, I.berth[1] - oy]];
    for (var i = 1; i < path.length; i++) {
      var a = out[out.length - 1], b = path[Math.min(path.length - 1, i + 1)];
      if (i === path.length - 1 || !seen2(I, a, b)) out.push(path[i]);
    }
    I.ox = ox; I.oy = oy;
    return out.map(function (p) { return [p[0] + ox, p[1] + oy]; });
  }
  function seen2(I, a, b) {
    var n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.4);
    for (var i = 1; i < n; i++) if (!clear(I, a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, 0.9)) return false;
    return true;
  }

  // ---- the strait between them -----------------------------------------------------------------------------------
  function lay() {
    // Out of one harbour mouth and into the other: each quay faces the sea one way (from the island's middle out
    // past its berth), so the strait runs from A's mouth to B's, the islands set so that the line between the two
    // berths is open water (no sailing round an island to find its quay).
    A.ox = A.oy = 0; B.ox = B.oy = 0;
    A.berth = berth(A); B.berth = berth(B);
    A.chan = channel(A); B.chan = channel(B);                // each in the island's own tiles for now
    var ea = A.chan[A.chan.length - 1], bl = B.chan[B.chan.length - 1], bb = B.berth.slice();
    function unit(x, y) { var n = Math.hypot(x, y) || 1; return [x / n, y / n]; }
    var outA = unit(ea[0] - A.cx, ea[1] - A.cy), outB = unit(bl[0] - B.cx, bl[1] - B.cy);
    var P = isles(), bearing = Math.atan2((P[B.id].y - P[A.id].y) * 0.72, P[B.id].x - P[A.id].x);
    var ideal, dx = outA[0] - outB[0], dy = outA[1] - outB[1];
    if (Math.hypot(dx, dy) > 0.5) ideal = Math.atan2(dy, dx);
    else {                                              // both quays face the same way: the islands lie side by side
      var a0 = Math.atan2(outA[1], outA[0]), l = a0 + Math.PI / 2, r = a0 - Math.PI / 2;
      ideal = Math.abs(wrap(l - bearing)) < Math.abs(wrap(r - bearing)) ? l : r;
    }
    function overlap() {
      var m = 14;
      return !(B.ox > A.w + m || B.ox + B.w < -m || B.oy > A.h + m || B.oy + B.h < -m);
    }
    function lineClear(p, q) {
      var n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.7), ux = (q[0] - p[0]) / n, ur = (q[1] - p[1]) / n, nl = Math.hypot(ux, ur) || 1;
      for (var i = 2; i <= n - 2; i++) {
        var x = p[0] + ux * i, r = p[1] + ur * i;
        for (var o = -1.4; o <= 1.4; o += 0.7) if (groundAt(x - ur / nl * o, r + ux / nl * o)) return false;
      }
      return true;
    }
    var done = false, D = 0, ang = ideal;
    [0, 0.2, -0.2, 0.4, -0.4, 0.6, -0.6, 0.85, -0.85, 1.1, -1.1].some(function (da) {
      return [96, 112, 130].some(function (d) {
        ang = ideal + da; D = d;
        B.ox = Math.round(ea[0] + Math.cos(ang) * d - bl[0]); B.oy = Math.round(ea[1] + Math.sin(ang) * d - bl[1]);
        if (overlap()) return false;
        if (!lineClear(ea, [bl[0] + B.ox, bl[1] + B.oy])) return false;
        done = true; return true;
      });
    });
    if (!done) { B.ox = Math.round(ea[0] + Math.cos(ideal) * 130 - bl[0]); B.oy = Math.round(ea[1] + Math.sin(ideal) * 130 - bl[1]); }
    B.berth = [bb[0] + B.ox, bb[1] + B.oy];
    B.chan = B.chan.map(function (p) { return [p[0] + B.ox, p[1] + B.oy]; });
    A.exit = A.chan[A.chan.length - 1]; B.exit = B.chan[B.chan.length - 1];
    // the course: out of A's harbour, across, into B's
    route = A.chan.slice(1).concat(B.chan.slice().reverse());
    leg = 0;
    dir = unit(B.exit[0] - A.exit[0], B.exit[1] - A.exit[1]);
    mid = [(A.exit[0] + B.exit[0]) / 2, (A.exit[1] + B.exit[1]) / 2];
    var course = Math.atan2(B.exit[1] - A.exit[1], B.exit[0] - A.exit[0]);
    // the wind over one side: a reach there, mostly, though it veers
    var seed = (A.id.length * 31 + B.id.length * 7 + Math.floor(Date.now() / 3.6e6)) % 997;
    var side = hash(seed) < 0.5 ? -1 : 1;
    wind = { from: course + side * (1.35 + hash(seed + 1) * 0.95), base: B.pal === 'crimson' ? 1.05 : B.pal === 'rose' ? 0.8 : 0.92,
             s: 1, gust: 0, gustAt: 0, seed: seed };
    // the things on the water, seeded by the route
    things = [];
    var nx = -Math.sin(course), ny = Math.cos(course);
    function along(t, off) { return [A.exit[0] + (B.exit[0] - A.exit[0]) * t + nx * off, A.exit[1] + (B.exit[1] - A.exit[1]) * t + ny * off]; }
    function put(kind, t, off, extra) {
      var p = along(t, off);
      if (groundAt(p[0], p[1])) return;
      var o = { kind: kind, x: p[0], r: p[1], seed: things.length * 13 + seed };
      for (var k in extra) o[k] = extra[k];
      things.push(o);
    }
    // a reef across part of the middle, rocks round it
    var rt = 0.42 + hash(seed + 3) * 0.16, ro = (hash(seed + 4) - 0.5) * 6;
    put('reef', rt, ro, { rad: 1.2 }); put('rock_b', rt + 0.03, ro + 3.2, { rad: 0.8 }); put('rock_a', rt - 0.04, ro - 2.8, { rad: 0.7 });
    put('rock_c', 0.25 + hash(seed + 5) * 0.1, 9 * (hash(seed + 6) < 0.5 ? -1 : 1), { rad: 0.5 });
    put('rock_a', 0.7 + hash(seed + 7) * 0.1, -8 * (hash(seed + 8) < 0.5 ? -1 : 1), { rad: 0.7 });
    put('dory', 0.32 + hash(seed + 9) * 0.1, 7 * (hash(seed + 10) < 0.5 ? -1 : 1), { rad: 0.9, h: 0 });
    put('crate', 0.38 + hash(seed + 11) * 0.08, (hash(seed + 12) - 0.5) * 5, { rad: 0.4, flot: true });
    put('barrel', 0.66 + hash(seed + 13) * 0.08, (hash(seed + 14) - 0.5) * 6, { rad: 0.4, flot: true });
    // each harbour mouth: a red buoy to port and a green to starboard, coming in
    [A, B].forEach(function (I) {
      var e = I.exit, p = I.chan[Math.max(0, I.chan.length - 2)], ax = e[0] - p[0], ar = e[1] - p[1], an = Math.hypot(ax, ar) || 1;
      var inx = -ax / an, inr = -ar / an;                               // the way in
      [[-1, 'buoy_red'], [1, 'buoy_green']].forEach(function (b) {
        var x = e[0] - inr * 2.8 * b[0], r = e[1] + inx * 2.8 * b[0];
        if (!groundAt(x, r) && clear(I, x, r, 0.6)) things.push({ kind: b[1], x: x, r: r, rad: 0.35, seed: things.length });
      });
    });
    gulls = [];
    for (var g = 0; g < 7; g++) {
      var I = g < 3 ? A : g < 6 ? B : null;
      gulls.push({ home: I, x: I ? I.dock[0] + I.ox : A.berth[0], r: I ? I.dock[1] + I.oy : A.berth[1], z: 2 + hash(g) * 1.5,
                   a: hash(g + 3) * 6.28, rad: 3 + hash(g + 5) * 5, sp: 0.5 + hash(g + 7) * 0.4, follow: !I });
    }
    whale = { done: false };
  }

  /** Which sea a point lies in (the seam wanders), and how far past the seam (tiles, + toward B). */
  function seaSide(x, r) {
    var s = (x - mid[0]) * dir[0] + (r - mid[1]) * dir[1];
    var t = (x - mid[0]) * -dir[1] + (r - mid[1]) * dir[0];
    return s + (vnoise(t / 9 + 3.1) - 0.5) * 7 + (vnoise(t / 3.3) - 0.5) * 1.6;
  }

  // ---- start and stop ---------------------------------------------------------------------------------------------
  function start(fromId, toId) {
    if (running || !knows(fromId) || !knows(toId) || fromId === toId) return false;
    running = true; from = fromId; to = toId; phase = 'load'; began = performance.now(); keys = {}; menu = null;
    wake = []; spray = []; fish = []; msg = null; prompt = null; readyCount = 0; seaWas = null; auto = false;
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    canvas = document.createElement('canvas');
    canvas.id = 'sloop-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:60;image-rendering:pixelated;background:#020308;' +
                           'opacity:0;transition:opacity 0.5s;touch-action:none;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    buf = document.createElement('canvas');
    bctx = buf.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKeyUp, true);
    canvas.addEventListener('pointerdown', onPointer);
    if (document.documentElement.classList.contains('touch')) {
      document.documentElement.classList.add('keys-mode');
      var b = document.createElement('button');
      b.id = 'sloop-menu-btn'; b.type = 'button'; b.textContent = '⋯';
      b.addEventListener('click', function (e) { e.preventDefault(); openMenu(); });
      document.body.appendChild(b);
    }
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.setWorld) BridgeAudio.setWorld('lumar-passage');
    var fail = function () { stop(to); };
    loadSheet(function (err) {
      if (err) { fail(); return; }
      loadIsland(fromId, function (I) {
        A = I;
        loadIsland(toId, function (J) {
          B = J;
          if (!A.sc || !B.sc) { fail(); return; }
          lay();
          var h0 = Math.atan2(B.berth[1] - A.berth[1], B.berth[0] - A.berth[0]);
          h0 = A.chan.length > 1 ? Math.atan2(A.chan[1][1] - A.berth[1], A.chan[1][0] - A.berth[0]) : h0;
          boat = { x: A.berth[0], r: A.berth[1], h: h0, v: 0, sheet: 1.45, boom: 0, side: wrap(wind.from - h0) > 0 ? -1 : 1, heel: 0, rudder: 0,
                   bump: 0, hoist: 0, eff: 0, off: 0, luff: true, drift: [0, 0] };
          cam = null;
          phase = 'cast'; phaseAt = performance.now();
          canvas.style.opacity = '1';
          say(touch() ? 'Stick: steer left and right, up to haul in, down to ease out' : '←/→ steer · ↑ haul the sheet in · ↓ ease it out · Esc for the menu', 5200);
        });
      });
    });
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return true;
  }
  function touch() { return document.documentElement.classList.contains('touch'); }

  function stop(dest) {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove('keys-mode');
    ['sloop-menu-btn', 'sloop-menu'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('resize', resize);
    var target = dest || from;
    if (canvas) { canvas.style.transition = 'opacity 0.45s'; canvas.style.opacity = '0'; }
    setTimeout(function () {
      if (canvas) canvas.remove();
      canvas = null;
      BridgeWorld.load(target, function () {
        BridgeState.transition('world', { worldId: target, spawn: null });
        if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
      });
    }, 460);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var z = typeof BridgeWorld !== 'undefined' && BridgeWorld.getZoom ? BridgeWorld.getZoom() : 2;
    Z = Math.max(1, z || 2);
    var dw = Math.round(window.innerWidth * dpr), dh = Math.round(window.innerHeight * dpr);
    W = Math.ceil(dw / Z); H = Math.ceil(dh / Z);
    canvas.width = dw; canvas.height = dh;
    buf.width = W; buf.height = H;
  }

  // ---- input ------------------------------------------------------------------------------------------------------
  var KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', ' ', 'enter', 'escape', 't'];
  function onKey(e) {
    var k = (e.key || '').toLowerCase();
    if (KEYS.indexOf(k) < 0) return;
    e.preventDefault(); e.stopPropagation();
    if (menu) { if (k === 'escape' && !e.repeat) closeMenu(); return; }
    if (k === 'escape' && !e.repeat) { openMenu(); return; }
    if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat && prompt && phase === 'sail') prompt.act();
    if (k === 't' && !e.repeat) { auto = !auto; say(auto ? 'The sheet trims itself — you steer' : 'Trimming by hand again', 2400); }
    keys[k] = true;
  }
  function onKeyUp(e) { keys[(e.key || '').toLowerCase()] = false; }
  function onPointer() { if (prompt && phase === 'sail') prompt.act(); }
  function down(a, b) { return keys[a] || keys[b]; }

  function openMenu() {
    if (menu || !running) return;
    var el = document.createElement('div');
    el.id = 'sloop-menu';
    el.className = 'sloop-menu';
    var dn = B ? B.name : 'the other quay', fn = A ? A.name : 'the quay';
    el.innerHTML = '<div class="sloop-menu-title">At the tiller</div>';
    [['Keep sailing', closeMenu], ['Skip ahead to ' + dn, function () { closeMenu(); stop(to); }],
     ['Put back to ' + fn, function () { closeMenu(); stop(from); }]].forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = o[0];
      b.addEventListener('click', function (e) { e.preventDefault(); o[1](); });
      el.appendChild(b);
    });
    document.body.appendChild(el);
    menu = el;
    var first = el.querySelector('button'); if (first) first.focus();
  }
  function closeMenu() { if (menu) menu.remove(); menu = null; keys = {}; }

  function say(text, ms) { msg = text; msgAt = performance.now() + (ms || 3200); }

  // ---- sailing ----------------------------------------------------------------------------------------------------
  // speed off the wind: nothing within 40° of it (in irons), best on a beam reach, a little less running
  function polar(off) {
    if (off < 0.7) return 0;
    if (off < 1.1) return 0.75 * (off - 0.7) / 0.4;
    if (off < 1.75) return 0.75 + 0.25 * (off - 1.1) / 0.65;
    if (off < 2.6) return 1 - 0.08 * (off - 1.75) / 0.85;
    return 0.92 - 0.2 * (off - 2.6) / (Math.PI - 2.6);
  }
  function bestSheet(off) { return clamp(off - 0.42, 0.1, 1.45); }

  function update(dt, now) {
    var t = now / 1000;
    // the wind veers a little and blows in gusts you can see coming over the water
    var W0 = wind.from + 0.28 * (vnoise(t / 21 + wind.seed) - 0.5) + 0.12 * (vnoise(t / 7.3 + 9) - 0.5);
    if (now > wind.gustAt) { wind.gustAt = now + 9000 + hash(Math.floor(now / 1000)) * 9000; wind.gust = 0.32; wind.gustT = now; }
    var g = wind.gust * Math.max(0, Math.sin(clamp((now - (wind.gustT || 0)) / 4200, 0, 1) * Math.PI));
    wind.s = wind.base * (1 + g);
    wind.now = W0;
    var b = boat;
    // steering: a turn of speed from the rudder, a little even when stopped (you can scull her round)
    var steer = (down('arrowright', 'd') ? 1 : 0) - (down('arrowleft', 'a') ? 1 : 0);
    b.rudder += (steer - b.rudder) * Math.min(1, dt * 6);
    if (phase === 'sail' || phase === 'cast') b.h = wrap(b.h + b.rudder * (0.4 + 0.95 * Math.min(1, b.v / 2.6)) * dt);
    var rel = wrap(W0 - b.h), off = Math.abs(rel);                   // where the wind comes from, off the bow
    var lee = rel > 0 ? -1 : 1;                                       // the boom swings to the other side
    // the sheet: by hand, or trimming itself
    var trim = (down('arrowdown', 's') ? 1 : 0) - (down('arrowup', 'w') ? 1 : 0);
    if (auto) b.sheet += (bestSheet(off) - b.sheet) * Math.min(1, dt * 2.2);
    else b.sheet = clamp(b.sheet + trim * 0.9 * dt, 0.1, 1.45);
    // coming about or gybing: the boom crosses
    if (lee !== b.side) {
      if (b.hoist < 0.9) { /* still hoisting: the boom just falls to the lee side */ }
      else if (off > 2.2 && b.boom > 0.6) {                                // gybe: slammed across
        b.bump = 0.5; burst(b.x, b.r, 8, 'spray');
        say(b.sheet > 1 ? 'Gybe-ho! The boom slams across — mind your head' : 'Gybe-ho!', 2200);
        sfx('gybe');
      } else if (off < 1.2 && phase === 'sail') say('Ready about — lee-ho!', 1600);
      b.side = lee;
    }
    // the boom goes out as far as the sheet lets it, never past the wind
    var target = Math.min(b.sheet, Math.max(0.04, off - 0.04));
    b.boom += (target - b.boom) * Math.min(1, dt * (b.bump > 0 ? 9 : 3.2));
    var alpha = off - b.boom, aopt = off - bestSheet(off), eff;
    if (alpha < 0.13) eff = 0.3 * alpha / 0.13;
    else if (alpha < aopt) eff = 0.3 + 0.7 * (alpha - 0.13) / Math.max(0.01, aopt - 0.13);
    else eff = Math.max(0.22, 1 - (alpha - aopt) * 1.15);
    b.luff = alpha < 0.13 && off > 0.25;
    b.stall = alpha > aopt + 0.35;
    b.eff = eff; b.off = off;
    var hoisted = phase === 'cast' ? clamp((now - phaseAt) / 1600, 0, 1) : phase === 'moor' ? 1 - clamp((now - phaseAt) / 900, 0, 1) : 1;
    b.hoist = hoisted;
    var goal = VMAX * wind.s * polar(off) * eff * hoisted;
    if (phase === 'moor') goal = 0;
    b.v += (goal - b.v) * Math.min(1, dt * (goal > b.v ? 0.55 : 0.32));
    if (off < 0.7 && b.v < 0.4) b.v = Math.max(-0.25, b.v - dt * 0.15);           // in irons: she drifts back
    b.heel += ((phase === 'sail' ? wind.s * eff * Math.min(1, polar(off) * 1.3) * (off < 2.4 ? 1 : 0.45) * 0.42 : 0) - b.heel) * Math.min(1, dt * 2);
    // leeway: pushed downwind a little, more when slow
    var dwx = Math.cos(W0 + Math.PI), dwr = Math.sin(W0 + Math.PI), lw = wind.s * 0.12 * (1 - Math.min(1, b.v / 3));
    var nx = b.x + (Math.cos(b.h) * b.v + dwx * lw) * dt, nr = b.r + (Math.sin(b.h) * b.v + dwr * lw) * dt;
    if (phase === 'moor') { nx = b.x + (B.berth[0] - b.x) * Math.min(1, dt * 1.6); nr = b.r + (B.berth[1] - b.r) * Math.min(1, dt * 1.6); }
    // the hull against rock and shore (bow, stern, either side)
    var hitAt = null, c = Math.cos(b.h), s = Math.sin(b.h);
    [[1.25, 0], [-1.2, 0], [0.2, 0.45], [0.2, -0.45], [-0.7, 0.4], [-0.7, -0.4]].forEach(function (p) {
      if (hitAt) return;
      var px = nx + p[0] * c - p[1] * s, pr = nr + p[0] * s + p[1] * c;
      if (groundAt(px, pr) === 1) hitAt = [px, pr];
      else things.forEach(function (o) { if (!hitAt && !o.flot && o.rad && Math.hypot(px - o.x, pr - o.r) < o.rad) hitAt = [px, pr]; });
    });
    if (hitAt && phase !== 'moor') {
      if (b.v > 0.6 && b.bump <= 0) { sfx('hit'); say(b.v > 2 ? 'Rocks! You scrape off with a groan of planks' : 'You bump and grind clear', 2200); burst(hitAt[0], hitAt[1], 10, 'spray'); }
      // pushed off whatever she hit, so she slides clear instead of sticking
      var ax = b.x - hitAt[0], ar = b.r - hitAt[1], an = Math.hypot(ax, ar) || 1;
      b.x += ax / an * Math.min(0.12, 0.6 * dt + 0.02); b.r += ar / an * Math.min(0.12, 0.6 * dt + 0.02);
      b.v = Math.min(b.v * 0.25, 0.3);
      b.bump = 0.4;
    } else {
      b.x = nx; b.r = nr;
      if (groundAt(b.x, b.r) === 2 && b.v > 0.8) { b.v *= 1 - dt * 1.8; if (Math.random() < dt * 2) say('The keel touches the shallows', 1400); }
    }
    b.bump = Math.max(0, b.bump - dt);
    // the wake, spray off the bow, bioluminescence where she cuts the water
    if (Math.abs(b.v) > 0.25) {
      b.wakeT = (b.wakeT || 0) + dt;
      while (b.wakeT > 0.05) {
        b.wakeT -= 0.05;
        for (var q = -1; q <= 1; q += 2) wake.push({ x: b.x - c * 1.2 + -s * q * 0.3, r: b.r - s * 1.2 + c * q * 0.3, vx: -s * q * 0.35, vr: c * q * 0.35, age: 0, v: b.v });
        wake.push({ x: b.x - c * 1.25, r: b.r - s * 1.25, vx: 0, vr: 0, age: 0, v: b.v, glow: true });
      }
      if (b.v > 2.4 && Math.random() < dt * (3 + g * 12)) burst(b.x + c * 1.3, b.r + s * 1.3, 3, 'spray');
    }
    wake = wake.filter(function (w) { w.age += dt; w.x += w.vx * dt; w.r += w.vr * dt; return w.age < 2.6; });
    if (wake.length > 600) wake.splice(0, wake.length - 600);
    spray = spray.filter(function (p) { p.age += dt; p.x += p.vx * dt; p.r += p.vr * dt; p.z += p.vz * dt; p.vz -= 6 * dt; return p.z > -0.05 && p.age < 1.4; });
    // sounds: the sail flogging, a bell on a buoy
    if (b.luff && b.hoist > 0.5 && now - lastLuff > 650) { lastLuff = now; sfx('luff'); }
    // life
    life(dt, now);
    // where you are: the seas, the far quay
    var side = seaSide(b.x, b.r) > 0 ? B : A;
    if (seaWas && side !== seaWas && phase === 'sail') say('Over the seam into ' + seaName(side.pal) + ' — foam all round the bow', 3000);
    seaWas = side;
    // the next leg of the course (the gold mark on the compass)
    while (leg < route.length - 1 && Math.hypot(b.x - route[leg][0], b.r - route[leg][1]) < 3.5) leg++;
    prompt = null;
    if (phase === 'sail') {
      var dB = Math.hypot(b.x - B.berth[0], b.r - B.berth[1]), dA = Math.hypot(b.x - A.berth[0], b.r - A.berth[1]);
      if (dB < 2.6) prompt = b.v < 2.8 ? { text: 'Come alongside — ' + B.name, act: function () { moor(); } }
                                       : { text: 'Too fast to tie up — ease out and round up', act: function () {} };
      else if (dA < 2.2 && now - began > 8000) prompt = { text: 'Put back in at ' + A.name, act: function () { stop(from); } };
      things.forEach(function (o) {
        if (prompt) return;
        var d = Math.hypot(b.x - o.x, b.r - o.r);
        if (o.flot && !o.got && d < 1.9) prompt = b.v < 2.4 ? { text: 'Haul the ' + o.kind + ' aboard', act: function () { haul(o); } }
                                                         : { text: 'Slow down to grab the ' + o.kind, act: function () {} };
        else if (o.kind === 'dory' && d < 4.2) prompt = { text: 'Hail the fisherman', act: function () { hail(o); } };
      });
    }
    if (phase === 'cast' && now - phaseAt > 1600) { phase = 'sail'; say('You cast off from ' + A.name + ' for ' + B.name, 2600); }
    if (phase === 'moor' && now - phaseAt > 1300 && !hold) { hold = 1; say('Made fast at ' + B.name, 1200); setTimeout(function () { hold = 0; stop(to); }, 500); }
  }

  function seaName(pal) { return { emerald: 'the Emerald Sea', crimson: 'the Crimson Sea', rose: 'the Rose Sea', sapphire: 'the Sapphire Sea', midnight: 'the Midnight Sea' }[pal] || 'open water'; }

  function moor() {
    phase = 'moor'; phaseAt = performance.now();
    sfx('door');
  }
  function haul(o) {
    o.got = true;
    burst(o.x, o.r, 8, 'spray');
    sfx('pickup');
    var r = hash(o.seed + Date.now() % 97);
    if (r < 0.45 && typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) {
      var n = 8 + Math.floor(r * 40);
      BridgeProgression.awardCoins(n, 'sloop:flotsam');
      say('Inside the ' + o.kind + ': ' + n + ' coins in an oilskin purse', 3000);
    } else if (typeof BridgeInventory !== 'undefined' && BridgeInventory.addItem) {
      var item = r < 0.75 ? 'sea_glass' : 'silver_nail';
      var ok = BridgeInventory.addItem(item, r < 0.75 ? 2 : 1);
      say(ok === false ? 'Your pack is full — you let it drift' : 'Inside the ' + o.kind + ': ' + (item === 'sea_glass' ? 'sea glass, wrapped in sailcloth' : 'a tin of silver nails'), 3000);
    }
  }
  function hail(o) {
    var line = LINES[(o.seed + Math.floor(Date.now() / 60000)) % LINES.length];
    say('The fisherman lifts his lantern: "' + line + '"', 6500);
    sfx('blip');
  }
  function burst(x, r, n, kind) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 1.4;
      spray.push({ x: x, r: r, z: 0.1, vx: Math.cos(a) * sp, vr: Math.sin(a) * sp * 0.6, vz: 1.5 + Math.random() * 2, age: 0, kind: kind });
    }
  }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }

  // gulls wheeling round the harbours (one follows you out), flying fish, the whale, the dory swinging to the wind
  function life(dt, now) {
    var t = now / 1000, b = boat;
    gulls.forEach(function (g, i) {
      g.a += dt * g.sp * (i % 2 ? 1 : -1);
      var hx = g.follow ? b.x - Math.cos(b.h) * 0.5 : g.x, hr = g.follow ? b.r - Math.sin(b.h) * 0.5 : g.r;
      var rad = g.follow ? 2.2 : g.rad;
      g.px = hx + Math.cos(g.a) * rad; g.pr = hr + Math.sin(g.a) * rad * 0.7;
      g.flap = Math.sin(t * 9 + i) > 0;
    });
    if (b.v > 2 && Math.random() < dt / 7) {
      var side = Math.random() < 0.5 ? -1 : 1, c = Math.cos(b.h), s = Math.sin(b.h);
      fish.push({ x0: b.x + c * 3 - s * side * 2, r0: b.r + s * 3 + c * side * 2, x1: b.x + c * 4.5 + s * side * 2, r1: b.r + s * 4.5 - c * side * 2, t: 0 });
    }
    fish = fish.filter(function (f) {
      f.t += dt / 0.8;
      if (f.t >= 1 && !f.splashed) { f.splashed = 1; burst(f.x1, f.r1, 3, 'spray'); }
      return f.t < 1.1;
    });
    things.forEach(function (o) {
      if (o.kind === 'dory') o.h += (wrap(wind.now - o.h)) * Math.min(1, dt * 0.3);    // at anchor, she lies head to wind
      if (o.kind.indexOf('buoy') === 0 && Math.hypot(b.x - o.x, b.r - o.r) < 6 && now - lastBell > 3800 + hash(o.seed) * 2000) { lastBell = now; sfx('bell'); }
    });
    // the whale: once, about halfway, off whichever beam is open water
    var prog = ((b.x - A.berth[0]) * (B.berth[0] - A.berth[0]) + (b.r - A.berth[1]) * (B.berth[1] - A.berth[1])) /
               Math.max(1, Math.pow(Math.hypot(B.berth[0] - A.berth[0], B.berth[1] - A.berth[1]), 2));
    if (!whale.done && !whale.at && prog > 0.48 && phase === 'sail') {
      var c2 = Math.cos(b.h), s2 = Math.sin(b.h), sd = hash(wind.seed + 21) < 0.5 ? -1 : 1;
      whale.at = now; whale.x = b.x + c2 * 6 - s2 * sd * 4; whale.r = b.r + s2 * 6 + c2 * sd * 4; whale.h = b.h + 0.3 * sd;
      if (groundAt(whale.x, whale.r)) { whale.done = true; whale.at = 0; }
      else say('Something vast and glowing rises under the water off the beam…', 3200);
    }
    if (whale.at) {
      var wt = (now - whale.at) / 1000;
      whale.x += Math.cos(whale.h) * dt * 0.6; whale.r += Math.sin(whale.h) * dt * 0.6;
      if (wt > 2.6 && !whale.blew) { whale.blew = 1; sfx('splash'); say('A spore whale! It blows, and the spray hangs glowing in the air', 3600); }
      if (wt > 4.4 && whale.blew === 1) { whale.blew = 2; sfx('splash'); }
      if (wt > 11) { whale.done = true; whale.at = 0; }
    }
  }

  // ---- drawing ----------------------------------------------------------------------------------------------------
  function sx(x) { return Math.round(x * TS - cam.x); }
  function sy(r, z) { return Math.round((r - (z || 0) * C45) * TS - cam.y); }

  function drawSeas(now) {
    var palA = A.pal, palB = B.pal;
    var cx = (cam.x + W / 2) / TS, cr = (cam.y + H / 2) / TS;
    var here = seaSide(cx, cr) > 0 ? palB : palA, there = here === palB ? palA : palB;
    BridgeSea.drawSeaAt(bctx, W, H, now, here, cam.x, cam.y);
    // the other sea past the seam, if it's on screen
    var pts = [], nx = -dir[1], ny = dir[0];
    var span = (W + H) / TS;
    for (var i = -40; i <= 40; i++) {
      var t = i / 40 * span, x = mid[0] + nx * t, r = mid[1] + ny * t;
      var s = -((vnoise(t / 9 + 3.1) - 0.5) * 7 + (vnoise(t / 3.3) - 0.5) * 1.6);
      pts.push([x + dir[0] * s, r + dir[1] * s]);
    }
    var far = here === palA ? 1 : -1;
    bctx.save();
    bctx.beginPath();
    pts.forEach(function (p, k) { var X = p[0] * TS - cam.x, Y = p[1] * TS - cam.y; if (k) bctx.lineTo(X, Y); else bctx.moveTo(X, Y); });
    var e1 = pts[pts.length - 1], e0 = pts[0], R = span * 2;
    bctx.lineTo((e1[0] + dir[0] * R * far) * TS - cam.x, (e1[1] + dir[1] * R * far) * TS - cam.y);
    bctx.lineTo((e0[0] + dir[0] * R * far) * TS - cam.x, (e0[1] + dir[1] * R * far) * TS - cam.y);
    bctx.closePath();
    bctx.clip();
    BridgeSea.drawSeaAt(bctx, W, H, now, there, cam.x, cam.y);
    bctx.restore();
    // the seam: churning foam where the seas meet
    var P = BridgeSea.palettes[palB] || BridgeSea.palettes.emerald, Q = BridgeSea.palettes[palA] || P;
    for (var k = 0; k < pts.length - 1; k++) {
      var a = pts[k], b = pts[k + 1];
      for (var j = 0; j < 12; j++) {
        var f = j / 12, x = a[0] + (b[0] - a[0]) * f, r = a[1] + (b[1] - a[1]) * f;
        var X = Math.round(x * TS - cam.x), Y = Math.round(r * TS - cam.y);
        if (X < -4 || Y < -4 || X > W + 4 || Y > H + 4) continue;
        var id = k * 12 + j, w = Math.sin(now / 300 + id * 1.7);
        var off = Math.round(Math.sin(now / 700 + id) * 3);
        bctx.fillStyle = 'rgba(' + (w > 0 ? P.foam : Q.foam) + ',' + (0.35 + 0.35 * Math.abs(w)).toFixed(2) + ')';
        bctx.fillRect(X + off, Y - off, w > 0.6 ? 3 : 2, 1);
      }
    }
  }

  function drawIsland(I, now) {
    if (!I || !I.sc) return;
    var offX = Math.round(I.ox * TS - cam.x), offY = Math.round(I.oy * TS - cam.y), m = I.sc.meta;
    if (offX - m.originX > W || offY - m.originY > H || offX - m.originX + m.width < 0 || offY - m.originY + m.height < 0) return;
    BridgeScene.drawBackground(bctx, I.sc, I.world || {}, offX, offY, now);
    if (BridgeSea.drawWaterAt) BridgeSea.drawWaterAt(bctx, I.sc, offX, offY, now, I.pal, cam.x, cam.y);
  }

  // the gusts: darker, rippled water sweeping downwind
  function drawGusts(now) {
    var g = wind.gust * Math.max(0, Math.sin(clamp((now - (wind.gustT || 0)) / 4200, 0, 1) * Math.PI));
    var lead = clamp((now - (wind.gustT || 0)) / 4200, 0, 1);
    if (g <= 0.01 && lead >= 1) return;
    var dx = Math.cos(wind.now + Math.PI), dr = Math.sin(wind.now + Math.PI);
    var cx = boat.x - dx * (10 - lead * 14), cr = boat.r - dr * (10 - lead * 14);
    bctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (var i = 0; i < 160; i++) {
      var a = hash(i * 3) * Math.PI * 2, d = Math.sqrt(hash(i * 3 + 1)) * 6;
      var x = cx + Math.cos(a) * d * 1.4, r = cr + Math.sin(a) * d;
      var X = sx(x), Y = sy(r);
      if (X < 0 || Y < 0 || X > W || Y > H) continue;
      var n = Math.sin(now / 160 + i);
      if (n > -0.2) bctx.fillRect(X, Y, n > 0.6 ? 3 : 2, 1);
    }
  }

  function drawWake(now) {
    var P = BridgeSea.palettes[(seaSide(boat.x, boat.r) > 0 ? B : A).pal] || BridgeSea.palettes.emerald;
    wake.forEach(function (w) {
      var a = 1 - w.age / 2.6, X = sx(w.x), Y = sy(w.r);
      if (X < 0 || Y < 0 || X >= W || Y >= H) return;
      if (w.glow) {
        bctx.fillStyle = 'rgba(' + P.spore + ',' + (0.4 * a * Math.min(1, w.v / 2)).toFixed(2) + ')';
        bctx.fillRect(X + Math.round(Math.sin(w.age * 7 + w.x) * 2), Y, 1, 1);
      } else {
        bctx.fillStyle = 'rgba(' + P.foam + ',' + (0.55 * a * Math.min(1, w.v / 1.5)).toFixed(2) + ')';
        bctx.fillRect(X, Y, a > 0.6 ? 2 : 1, 1);
      }
    });
  }

  // the boat in its frame: (u along the keel, v to starboard, z up) → screen, heeling the rig to leeward
  function rig(b, bob) {
    var c = Math.cos(b.h), s = Math.sin(b.h), lee = b.side, hs = Math.sin(b.heel) * lee, hc = Math.cos(b.heel);
    return function (u, v, z, heel) {
      if (heel) { v = v + z * hs; z = z * hc; }
      var x = b.x + u * c - v * s, r = b.r + u * s + v * c;
      return [x * TS - cam.x, (r - z * C45) * TS - cam.y + bob, r];
    };
  }
  function line(a, b, col, w) {
    var dx = b[0] - a[0], dy = b[1] - a[1], n = Math.max(Math.abs(dx), Math.abs(dy));
    bctx.fillStyle = col;
    for (var i = 0; i <= n; i++) bctx.fillRect(Math.round(a[0] + dx * i / n), Math.round(a[1] + dy * i / n), w || 1, w || 1);
  }
  function poly(pts, col) {
    bctx.fillStyle = col;
    bctx.beginPath();
    pts.forEach(function (p, i) { if (i) bctx.lineTo(Math.round(p[0]), Math.round(p[1])); else bctx.moveTo(Math.round(p[0]), Math.round(p[1])); });
    bctx.closePath();
    bctx.fill();
  }
  // a sail: luff from tack to head, the leech from head to clew bellied out (and flogging when it luffs), shaded
  function sail(P, tack, head, clew, lee, flog, now, tone) {
    var pts = [], n = 10;
    for (var i = 0; i <= n; i++) {                                   // luff, bottom to top
      var f = i / n;
      pts.push(P(tack[0] + (head[0] - tack[0]) * f, tack[1] + (head[1] - tack[1]) * f, tack[2] + (head[2] - tack[2]) * f, true));
    }
    for (var j = 1; j < n; j++) {                                    // the leech, head to clew
      var g = j / n, belly = Math.sin(g * Math.PI) * 0.16 * lee, wob = flog ? Math.sin(now / 45 + g * 9) * 0.12 * Math.sin(g * Math.PI) : 0;
      pts.push(P(head[0] + (clew[0] - head[0]) * g, head[1] + (clew[1] - head[1]) * g + belly + wob, head[2] + (clew[2] - head[2]) * g, true));
    }
    pts.push(P(clew[0], clew[1], clew[2], true));
    for (var k = 1; k < n; k++) {                                    // the foot, clew back to the tack, a little curve
      var h = k / n;
      pts.push(P(clew[0] + (tack[0] - clew[0]) * h, clew[1] + (tack[1] - clew[1]) * h + Math.sin(h * Math.PI) * 0.06 * lee, clew[2] + (tack[2] - clew[2]) * h, true));
    }
    var lit = tone > 0.55, col = lit ? '#d6cfbf' : tone > 0.25 ? '#b2ac9f' : '#86828f';
    poly(pts, col);
    // the belly: the half of the cloth curving away from the light, a tone down
    var belly = [];
    for (var bi = 0; bi <= n; bi++) belly.push(pts[bi]);
    var mids = [];
    for (var mj = 0; mj <= n; mj++) {
      var luffP = pts[mj], leechP = pts[Math.min(pts.length - 1, n + (n - mj))];
      if (luffP && leechP) mids.push([luffP[0] + (leechP[0] - luffP[0]) * 0.45, luffP[1] + (leechP[1] - luffP[1]) * 0.45]);
    }
    poly(belly.concat(mids.reverse()), lit ? '#bdb5a5' : '#9a9488');
    line(pts[n], pts[n + 1] || pts[n], 'rgba(255,250,235,0.35)');                       // a gleam along the head
    if (flog) {                                                      // a flogging sail: ripples of shadow running up it
      bctx.save(); bctx.beginPath();
      pts.forEach(function (p, i) { if (i) bctx.lineTo(p[0], p[1]); else bctx.moveTo(p[0], p[1]); });
      bctx.closePath(); bctx.clip();
      bctx.fillStyle = 'rgba(40,36,60,0.28)';
      for (var q = 0; q < 6; q++) {
        var a0 = P(tack[0] + (head[0] - tack[0]) * ((q / 6 + now / 600) % 1), 0, tack[2] + (head[2] - tack[2]) * ((q / 6 + now / 600) % 1), true);
        bctx.fillRect(Math.round(Math.min(a0[0], pts[n + 5][0])) - 30, Math.round(a0[1]), 60, 1);
      }
      bctx.restore();
    }
    // seams across it, and its edge
    bctx.fillStyle = 'rgba(60,54,70,0.35)';
    for (var sm = 1; sm < 4; sm++) {
      var f2 = sm / 4, l0 = pts[Math.round(f2 * n)], l1 = pts[n + Math.round((1 - f2) * (n - 1))];
      if (l0 && l1) line(l0, l1, 'rgba(60,54,70,0.35)');
    }
    for (var e = 0; e < pts.length; e++) {
      var p0 = pts[e], p1 = pts[(e + 1) % pts.length];
      line(p0, p1, '#2c2634');
    }
  }

  function drawBoat(now) {
    var b = boat, t = now / 1000;
    // riding the swell
    var ph = (b.x * Math.cos(wind.now) + b.r * Math.sin(wind.now)) * 0.9 - t * 1.6;
    var bob = Math.round(Math.sin(ph) * 1.2 + (b.bump > 0 ? Math.sin(t * 40) * 1.5 : 0));
    var P = rig(b, bob);
    // the lantern's warm light on the water
    var lx = P(-L / 2 + 0.14, -0.36, 0);
    bctx.save(); bctx.globalCompositeOperation = 'lighter';
    for (var g = 3; g >= 1; g--) { bctx.fillStyle = 'rgba(255,190,110,' + (0.025 * (4 - g)).toFixed(3) + ')'; disc(lx[0], lx[1] + 2, g * 9, g * 5); }
    bctx.restore();
    // the hull, nearest of 32 headings
    var hi = ((Math.round(b.h / (Math.PI * 2) * 32) % 32) + 32) % 32, cc = cell(Math.floor(hi / 8), hi % 8);
    var X = Math.round(b.x * TS - cam.x), Y = Math.round(b.r * TS - cam.y) + bob;
    // the water lapping round her
    var Pal = BridgeSea.palettes[(seaSide(b.x, b.r) > 0 ? B : A).pal] || BridgeSea.palettes.emerald;
    bctx.drawImage(sheetImg, cc[0], cc[1], 128, 128, X - 64, Y - 83, 128, 128);
    var c = Math.cos(b.h), s = Math.sin(b.h);
    for (var i = 0; i < 18; i++) {
      var u = -1.3 + 2.6 * (i / 17), w = 0.5 * Math.sin(Math.PI * Math.min(1, 0.22 + 0.86 * (i / 17))) + 0.05;
      for (var q = -1; q <= 1; q += 2) {
        var x = b.x + u * c - q * w * s, r = b.r + u * s + q * w * c;
        if (Math.sin(t * 3 + i * 1.3 + q) > 0.1) {
          bctx.fillStyle = 'rgba(' + Pal.foam + ',' + (0.35 + Math.min(0.4, b.v * 0.1)).toFixed(2) + ')';
          bctx.fillRect(sx(x), sy(r) + bob, 2, 1);
        }
      }
    }
    // what's aboard, back to front: you at the tiller (on the windward side), the mast and sails
    var lee = b.side, hoist = b.hoist;
    var seat = P(-0.82, -lee * 0.22, 0.12), pilotRow = seat[2];
    var boom = b.boom;
    var goose = [MU, 0, 0.62], clew = [MU - Math.cos(boom) * 1.55, lee * Math.sin(boom) * 1.55, 0.7];
    var head = [MU, 0, 0.62 + 2.3 * hoist];
    var mainRow = P(MU - Math.cos(boom) * 0.6, lee * Math.sin(boom) * 0.6, 0)[2];
    var jibTack = [1.25, 0, 0.45], jibHead = [MU + (1.25 - MU) * 0.12, 0, 0.45 + 1.95 * hoist];
    var ja = Math.min(boom * 0.85 + 0.1, 1.2), jibClew = [1.25 - Math.cos(ja) * 1.05, lee * Math.sin(ja) * 1.05, 0.55];
    var drawList = [
      { row: pilotRow, draw: function () { drawPilot(seat, b, now); } },
      { row: mainRow, draw: function () {
        // the mast (heeling), shrouds, forestay, backstay
        var foot = P(MU, 0, 0.3, true), top = P(MU, 0, 3.0, true);
        line(P(MU, 0, 2.5, true), P(MU, -0.48, 0.38, true), 'rgba(30,24,20,0.8)');
        line(P(MU, 0, 2.5, true), P(MU, 0.48, 0.38, true), 'rgba(30,24,20,0.8)');
        line(top, P(1.28, 0, 0.42, true), 'rgba(30,24,20,0.85)');
        line(top, P(-1.28, 0, 0.42, true), 'rgba(30,24,20,0.6)');
        line(foot, top, '#3a2614', 2);
        line([foot[0] + 1, foot[1]], [top[0] + 1, top[1]], '#6a4a2a');
        // the pennant at the masthead, streaming downwind
        var dw = wind.now + Math.PI, fl = Math.sin(t * 14) * 0.1;
        var pnt = [top[0] + Math.cos(dw + fl) * 9, top[1] + Math.sin(dw + fl) * 9 * C45];
        poly([top, pnt, [top[0], top[1] + 3]], '#c83a2e');
        if (hoist > 0.05) {
          // the jib, then the main and its boom
          var tone = 0.5 + 0.5 * Math.cos(wrap(b.h + lee * boom - 2.3));
          sail(P, jibTack, jibHead, jibClew, lee, b.luff, now + 200, tone);
          sail(P, goose, head, clew, lee, b.luff, now, tone);
        }
        line(P(goose[0], goose[1], goose[2], true), P(clew[0], clew[1], clew[2], true), '#4a3018', 2);
        line(P(clew[0], clew[1], clew[2], true), P(-1.0, 0, 0.4), 'rgba(200,190,170,0.6)');     // the mainsheet
      } }
    ];
    drawList.sort(function (p, q) { return p.row - q.row; });
    drawList.forEach(function (d) { d.draw(); });
    // the tiller, pushed against the turn
    var tl = P(-1.3, 0, 0.42), tr = P(-1.3 + Math.cos(b.rudder * 0.6) * 0.55, -Math.sin(b.rudder * 0.6) * 0.55, 0.45);
    line(tl, tr, '#5a3a1a', 1);
  }
  function disc(x, y, rx, ry) {
    for (var j = -ry; j <= ry; j++) {
      var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry))));
      bctx.fillRect(Math.round(x - w), Math.round(y + j), w * 2, 1);
    }
  }
  function drawPilot(seat, b, now) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.sportImage) return;
    var img = BridgeCharacter.sportImage(BridgeCharacter.sportKey('sit'), false);
    if (!img) return;
    // facing the way the bow points, nearest of four
    var a = ((b.h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) % 4;
    var row = [1, 0, 3, 2][q];                                          // right, down, left, up → sheet rows
    var col = [0, 1, 2, 1][Math.floor(now / 340) % 4];
    bctx.drawImage(img, col * 32, row * 48, 32, 48, Math.round(seat[0]) - 16, Math.round(seat[1]) - 45 + 4, 32, 48);
  }

  function drawThing(o, now) {
    var t = now / 1000, X = sx(o.x), Y = sy(o.r);
    if (X < -80 || Y < -100 || X > W + 80 || Y > H + 60) return;
    var bob = o.kind === 'reef' || o.kind.indexOf('rock') === 0 ? 0 : Math.round(Math.sin(t * 1.7 + o.seed) * 1.2);
    var P = BridgeSea.palettes[(seaSide(o.x, o.r) > 0 ? B : A).pal] || BridgeSea.palettes.emerald;
    if (o.kind === 'dory') {
      var hi = ((Math.round(o.h / (Math.PI * 2) * 8) % 8) + 8) % 8, cc = cell(4, hi);
      bctx.drawImage(sheetImg, cc[0], cc[1], 128, 128, X - 64, Y - 83 + bob, 128, 128);
      var lt = [X + Math.cos(o.h) * 0.68 * TS, Y + Math.sin(o.h) * 0.68 * TS - 0.95 * C45 * TS + bob];
      bctx.save(); bctx.globalCompositeOperation = 'lighter';
      for (var g = 3; g >= 1; g--) { bctx.fillStyle = 'rgba(255,190,110,' + (0.03 * (4 - g)).toFixed(3) + ')'; disc(lt[0], lt[1] + 22, g * 8, g * 4); }
      bctx.restore();
      return;
    }
    if (o.flot && o.got) return;
    var cc2 = cell(5, STATIC[o.kind]);
    bctx.drawImage(sheetImg, cc2[0], cc2[1], 128, 128, X - 64, Y - 83 + bob, 128, 128);
    // surf round the rocks, a ring of foam round things afloat
    var rx = (o.rad || 0.5) * TS * 0.95, ry = rx * 0.6;
    for (var i = 0; i < 26; i++) {
      var a = i / 26 * Math.PI * 2, n = Math.sin(t * 2.3 + i * 1.7 + o.seed);
      if (n < 0.1) continue;
      var k = 1 + (o.kind === 'reef' || o.kind.indexOf('rock') === 0 ? 0.15 * n : 0);
      bctx.fillStyle = 'rgba(' + P.foam + ',' + (0.3 + 0.4 * n).toFixed(2) + ')';
      bctx.fillRect(Math.round(X + Math.cos(a) * rx * k), Math.round(Y + Math.sin(a) * ry * k) + bob, n > 0.7 ? 2 : 1, 1);
    }
    if (o.kind.indexOf('buoy') === 0 && Math.sin(t * 2.2 + o.seed) > 0.4) {      // its lamp blinking
      bctx.save(); bctx.globalCompositeOperation = 'lighter';
      bctx.fillStyle = o.kind === 'buoy_red' ? 'rgba(255,90,70,0.35)' : 'rgba(90,255,140,0.35)';
      disc(X, Y - 36 + bob, 4, 4);
      bctx.restore();
    }
  }

  function drawWhale(now) {
    if (!whale || !whale.at) return;
    var wt = (now - whale.at) / 1000, X = sx(whale.x), Y = sy(whale.r);
    var P = BridgeSea.palettes[(seaSide(whale.x, whale.r) > 0 ? B : A).pal] || BridgeSea.palettes.emerald;
    var c = Math.cos(whale.h), s = Math.sin(whale.h), len = 5.2 * TS;
    var rise = clamp(wt / 2.4, 0, 1), sink = clamp((wt - 7.2) / 2.6, 0, 1), up = rise * (1 - sink);
    // the shape under the water: its glow, its spore lights
    bctx.save(); bctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 14; i++) {
      var f = i / 13 - 0.5, w = Math.cos(f * Math.PI) * 0.9 * TS;
      var x = X + c * f * len, y = Y + s * f * len * 0.8;
      bctx.fillStyle = 'rgba(' + P.spore + ',' + (0.05 * up + 0.03).toFixed(3) + ')';
      disc(x, y, Math.max(2, w * 0.9), Math.max(2, w * 0.45));
    }
    for (var j = 0; j < 18; j++) {
      var g = hash(j) - 0.5, sd = (hash(j + 9) - 0.5) * 1.4;
      var px = X + c * g * len - s * sd * 14, py = Y + s * g * len * 0.8 + c * sd * 8;
      bctx.fillStyle = 'rgba(' + P.spore + ',' + ((0.55 + 0.45 * Math.abs(Math.sin(now / 500 + j))) * (0.4 + 0.6 * up)).toFixed(2) + ')';
      bctx.fillRect(Math.round(px), Math.round(py), 2, 1);
    }
    bctx.restore();
    // its back breaking the surface, then the flukes as it sounds
    if (wt > 1.8 && wt < 7.6) {
      var back = clamp((wt - 1.8) / 0.8, 0, 1) * (1 - clamp((wt - 6.6) / 1, 0, 1));
      for (var k = 0; k < 10; k++) {                                   // the back, wet and gleaming in the moonlight
        var f2 = k / 9 - 0.3, hw = Math.cos(f2 * 1.6) * 0.5 * TS * back;
        var bx = X + c * f2 * len * 0.6, by = Y + s * f2 * len * 0.5 - hw * 0.35;
        bctx.fillStyle = '#2e4650'; disc(bx, by, Math.max(1, hw), Math.max(1, hw * 0.45));
        bctx.fillStyle = '#4e6e7a'; disc(bx, by - hw * 0.2, Math.max(1, hw * 0.7), Math.max(1, hw * 0.2));
      }
      bctx.fillStyle = 'rgba(190,220,230,0.7)';
      for (var k2 = 0; k2 < 8; k2++) { var f3 = k2 / 8 - 0.25; bctx.fillRect(Math.round(X + c * f3 * len * 0.5), Math.round(Y + s * f3 * len * 0.42 - 0.5 * TS * back * 0.55), 2, 1); }
      bctx.fillStyle = 'rgba(' + P.spore + ',0.7)';
      for (var m = 0; m < 6; m++) bctx.fillRect(Math.round(X + c * (m / 6 - 0.2) * len * 0.5), Math.round(Y + s * (m / 6 - 0.2) * len * 0.4 - 4 * back), 1, 1);
      bctx.fillStyle = 'rgba(' + P.foam + ',0.6)';
      for (var q = 0; q < 20; q++) { var a = q / 20 * Math.PI * 2; bctx.fillRect(Math.round(X + Math.cos(a) * len * 0.36), Math.round(Y + Math.sin(a) * len * 0.12), 2, 1); }
    }
    if (wt > 6.2 && wt < 8.6) {                                         // the flukes
      var fu = Math.sin(clamp((wt - 6.2) / 2.4, 0, 1) * Math.PI);
      var tx = X - c * len * 0.5, ty = Y - s * len * 0.4;
      poly([[tx, ty], [tx - s * 14 - c * 4, ty - 24 * fu + c * 3], [tx - c * 6, ty - 16 * fu], [tx + s * 14 - c * 4, ty - 24 * fu - c * 3]], '#3a5866');
    }
    // the blow: a column of glowing spray
    [2.6, 4.4].forEach(function (bt) {
      var u = (wt - bt) / 1.6;
      if (u < 0 || u > 1) return;
      for (var n = 0; n < 26; n++) {
        var hgt = hash(n + bt) * 40 * Math.sin(u * Math.PI) + 6, sp = (hash(n * 3 + bt) - 0.5) * 14 * u;
        bctx.fillStyle = 'rgba(' + (n % 3 ? P.foam : P.spore) + ',' + (0.6 * (1 - u)).toFixed(2) + ')';
        bctx.fillRect(Math.round(X + c * len * 0.2 + sp), Math.round(Y - hgt), 1, 2);
      }
    });
  }

  function drawSky(now) {
    // gulls and their shadows, flying fish, spray
    var t = now / 1000;
    gulls.forEach(function (g) {
      var X = sx(g.px), Ys = sy(g.pr), Y = sy(g.pr, g.z);
      if (X < -8 || X > W + 8 || Y < -8 || Ys > H + 8) return;
      bctx.fillStyle = 'rgba(0,0,0,0.18)'; bctx.fillRect(X - 2, Ys, 5, 1);
      bctx.fillStyle = '#e8e8f0';
      if (g.flap) { bctx.fillRect(X - 3, Y - 1, 2, 1); bctx.fillRect(X + 2, Y - 1, 2, 1); bctx.fillRect(X - 1, Y, 3, 1); }
      else { bctx.fillRect(X - 3, Y + 1, 2, 1); bctx.fillRect(X + 2, Y + 1, 2, 1); bctx.fillRect(X - 1, Y, 3, 1); }
      bctx.fillStyle = '#20202a'; bctx.fillRect(X, Y, 1, 1);
    });
    fish.forEach(function (f) {
      var u = clamp(f.t, 0, 1), x = f.x0 + (f.x1 - f.x0) * u, r = f.r0 + (f.r1 - f.r0) * u, z = Math.sin(u * Math.PI) * 0.7;
      bctx.fillStyle = '#d8e8f0'; bctx.fillRect(sx(x), sy(r, z), 3, 1);
      bctx.fillStyle = 'rgba(0,0,0,0.2)'; bctx.fillRect(sx(x), sy(r), 3, 1);
    });
    spray.forEach(function (p) {
      var P = BridgeSea.palettes[(seaSide(p.x, p.r) > 0 ? B : A).pal] || BridgeSea.palettes.emerald;
      bctx.fillStyle = 'rgba(' + P.foam + ',' + (0.8 * (1 - p.age / 1.4)).toFixed(2) + ')';
      bctx.fillRect(sx(p.x), sy(p.r, p.z), 1, 1);
    });
    // mist over the Midnight Sea
    var pal = (seaSide(boat.x, boat.r) > 0 ? B : A).pal;
    if (pal === 'midnight') {
      bctx.save(); bctx.globalCompositeOperation = 'screen';
      for (var i = 0; i < 9; i++) {
        var mx = ((i * 97 + t * 6) % (W + 160)) - 80, my = (i * 53) % H;
        for (var m = 3; m >= 1; m--) { bctx.fillStyle = 'rgba(90,84,140,0.035)'; disc(mx, my, 30 * m, 8 * m); }
      }
      bctx.restore();
    }
  }

  function draw(now) {
    var b = boat;
    // the camera runs a little ahead of the bow
    // (casting off, it hangs back over the quay you're leaving)
    var lead = Math.min(4.5, Math.max(0, b.v) * 1.1) * clamp((now - began - 2500) / 5000, 0, 1);
    var back = phase === 'cast' || now - began < 6000 ? 1 - clamp((now - began - 3000) / 4000, 0, 1) : 0;
    var qx = A.dock[0] + A.ox, qr = A.dock[1] + A.oy;
    var tx = (b.x + Math.cos(b.h) * lead + (qx - b.x) * 0.45 * back) * TS - W / 2;
    var ty = (b.r + Math.sin(b.h) * lead - 0.8 + (qr - b.r) * 0.45 * back) * TS - H / 2;
    if (!cam) cam = { x: tx, y: ty, fx: tx, fy: ty };
    var k = 1 - Math.exp(-(now - (cam.at || now)) / 1000 * 2.2);
    cam.at = now;
    cam.fx += (tx - cam.fx) * k; cam.fy += (ty - cam.fy) * k;
    cam.x = Math.round(cam.fx); cam.y = Math.round(cam.fy);
    drawSeas(now);
    drawGusts(now);
    drawIsland(A, now); drawIsland(B, now);
    drawWake(now);
    drawWhale(now);
    var list = things.map(function (o) { return { row: o.r, draw: function () { drawThing(o, now); } }; });
    list.push({ row: b.r, draw: function () { drawBoat(now); } });
    list.sort(function (p, q) { return p.row - q.row; });
    list.forEach(function (d) { d.draw(); });
    drawSky(now);
    // a soft vignette, darker at the top (the night sky's edge)
    var g = bctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,3,10,0.55)');
    bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
  }

  // ---- the screen layer: what you need to sail, at screen resolution -----------------------------------------------
  function hud(now) {
    var s = dpr * (window.innerWidth >= 900 ? 1.3 : 1), b = boat;
    ctx.save();
    ctx.textBaseline = 'middle';
    var px = function (n) { return Math.round(n * s); };
    // the compass: north up, the wind blowing across it, your heading, the course to the quay
    var cx = px(64), cy = canvas.height - px(70), R = px(42);
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(208,180,110,0.75)'; ctx.lineWidth = px(1.5); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#e0c060'; ctx.fillText('N', cx, cy - R + px(9));
    var wf = wind.now;                                                  // an arrow blowing downwind
    ctx.strokeStyle = 'rgba(160,220,255,0.95)'; ctx.lineWidth = px(2);
    var ax = Math.cos(wf), ay = Math.sin(wf) * C45;
    ctx.beginPath(); ctx.moveTo(cx + ax * R * 0.8, cy + ay * R * 0.8); ctx.lineTo(cx - ax * R * 0.55, cy - ay * R * 0.55); ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,255,0.95)';
    ctx.beginPath(); ctx.moveTo(cx - ax * R * 0.72, cy - ay * R * 0.72);
    ctx.lineTo(cx - ax * R * 0.45 + ay * px(6), cy - ay * R * 0.45 - ax * px(6)); ctx.lineTo(cx - ax * R * 0.45 - ay * px(6), cy - ay * R * 0.45 + ax * px(6)); ctx.fill();
    var wp = route[Math.min(leg, route.length - 1)] || B.berth;
    var bc = Math.atan2(wp[1] - b.r, wp[0] - b.x);                   // the next leg of the course, gold
    ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.arc(cx + Math.cos(bc) * R * 0.86, cy + Math.sin(bc) * R * 0.86 * C45, px(4), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f2ecd6'; ctx.lineWidth = px(2);                 // your bow
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(b.h) * R * 0.6, cy + Math.sin(b.h) * R * 0.6 * C45); ctx.stroke();
    ctx.font = px(9) + 'px "Pixelify Sans", monospace';
    ctx.fillStyle = 'rgba(200,220,240,0.9)'; ctx.fillText('WIND', cx, cy + R + px(10));
    // the trim: where the sheet is, where it should be, and what the sail is doing
    var tw = px(170), th = px(10), tx0 = canvas.width - tw - px(24), ty0 = canvas.height - px(52);
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(tx0 - px(10), ty0 - px(46), tw + px(20), px(80));
    ctx.fillStyle = '#2a3040'; ctx.fillRect(tx0, ty0, tw, th);
    var best = bestSheet(b.off), sx0 = (best - 0.1) / 1.35;
    ctx.fillStyle = 'rgba(96,208,128,0.55)'; ctx.fillRect(tx0 + Math.max(0, sx0 - 0.08) * tw, ty0, 0.16 * tw, th);
    ctx.fillStyle = '#f2ecd6'; ctx.fillRect(tx0 + (b.sheet - 0.1) / 1.35 * tw - px(2), ty0 - px(3), px(4), th + px(6));
    ctx.textAlign = 'left'; ctx.fillStyle = '#8a90a8'; ctx.fillText('IN', tx0, ty0 + th + px(10));
    ctx.textAlign = 'right'; ctx.fillText('OUT', tx0 + tw, ty0 + th + px(10));
    var state = b.off < 0.7 ? ['IN IRONS — BEAR AWAY', '#ff9080'] : b.luff ? ['LUFFING — HAUL IN', '#ffd060'] : b.stall ? ['STALLED — EASE OUT', '#ffb070'] : ['DRAWING', '#80e0a0'];
    ctx.textAlign = 'left'; ctx.fillStyle = state[1]; ctx.font = px(10) + 'px "Pixelify Sans", monospace';
    ctx.fillText(state[0] + (auto ? ' · AUTO (T)' : ''), tx0, ty0 - px(14));
    var pos = b.off < 0.7 ? 'HEAD TO WIND' : b.off < 1.15 ? 'CLOSE-HAULED' : b.off < 1.9 ? 'BEAM REACH' : b.off < 2.65 ? 'BROAD REACH' : 'RUNNING';
    ctx.textAlign = 'left'; ctx.fillStyle = '#c8d0e0';
    ctx.fillText(pos, tx0, ty0 - px(32));
    ctx.textAlign = 'right'; ctx.fillText((Math.max(0, b.v) * 2.1).toFixed(1) + ' KN', tx0 + tw, ty0 - px(32));
    // the passage, top left: from, to, how far along
    var prog = clamp(((b.x - A.berth[0]) * (B.berth[0] - A.berth[0]) + (b.r - A.berth[1]) * (B.berth[1] - A.berth[1])) /
                     Math.pow(Math.hypot(B.berth[0] - A.berth[0], B.berth[1] - A.berth[1]), 2), 0, 1);
    var bx0 = px(20), by0 = px(18), bw = px(220);
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(bx0 - px(8), by0 - px(10), bw + px(16), px(40));
    ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#c8d0e0';
    ctx.fillText(A.name.toUpperCase(), bx0, by0);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffd060'; ctx.fillText(B.name.toUpperCase(), bx0 + bw, by0);
    ctx.fillStyle = '#2a3040'; ctx.fillRect(bx0, by0 + px(10), bw, px(4));
    ctx.fillStyle = '#ffd060'; ctx.fillRect(bx0, by0 + px(10), bw * prog, px(4));
    ctx.fillStyle = '#f2ecd6'; ctx.fillRect(bx0 + bw * prog - px(2), by0 + px(8), px(4), px(8));
    // a message, and what E does here
    ctx.textAlign = 'center';
    if (msg && now < msgAt) {
      ctx.font = px(13) + 'px "Pixelify Sans", monospace';
      var lines = wrapText(msg, Math.floor(canvas.width / px(8.2)));
      lines.forEach(function (l, i) {
        var y = px(78) + i * px(18), w = ctx.measureText(l).width + px(20);
        ctx.fillStyle = 'rgba(6,10,20,0.7)'; ctx.fillRect(canvas.width / 2 - w / 2, y - px(10), w, px(20));
        ctx.fillStyle = '#f2ecd6'; ctx.fillText(l, canvas.width / 2, y);
      });
    }
    if (prompt) {
      ctx.font = px(13) + 'px "Pixelify Sans", monospace';
      var label = (touch() ? 'TAP' : 'E') + '  ' + prompt.text.toUpperCase(), w2 = ctx.measureText(label).width + px(28);
      var y2 = canvas.height - px(150);
      ctx.fillStyle = 'rgba(14,20,36,0.86)'; ctx.fillRect(canvas.width / 2 - w2 / 2, y2 - px(14), w2, px(28));
      ctx.strokeStyle = 'rgba(224,192,96,0.8)'; ctx.lineWidth = px(1.5); ctx.strokeRect(canvas.width / 2 - w2 / 2, y2 - px(14), w2, px(28));
      ctx.fillStyle = '#ffe080'; ctx.fillText(label, canvas.width / 2, y2);
    }
    ctx.restore();
  }
  function wrapText(t, n) {
    var words = t.split(' '), out = [], cur = '';
    words.forEach(function (w) { if ((cur + ' ' + w).trim().length > n) { out.push(cur.trim()); cur = w; } else cur += ' ' + w; });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (phase === 'load' || !boat) {
      ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (!menu) update(dt, now);
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.imageSmoothingEnabled = false;
    draw(now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, W * Z, H * Z);
    hud(now);
  }

  return {
    start: start, stop: stop, knows: knows,
    isRunning: function () { return running; },
    covers: function () { return running && phase !== 'load'; },
    _boat: function () { return boat; }, _phase: function () { return phase; }, _wind: function () { return wind; }, _isles: function () { return [A, B]; },
    _things: function () { return things; }, _route: function () { return [route, leg]; }, _whale: function () { return whale; }
  };
})();
