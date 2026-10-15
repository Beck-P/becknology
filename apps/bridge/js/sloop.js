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
  var VMAX = 4.4;                                       // tiles a second on a beam reach in a full breeze (the sloop's; each ship has her own)
  // the ship you're sailing (js/fleet.js spec): her size, speed, handling - and how her rig is drawn. RIGS place masts and headsails
  // as fractions of her length from the stern (a headsail's tack past 1 is out on the bowsprit); a square mast carries yards
  // [half-width, foot, head] (tiles above the deck), a fore-and-aft mast a boom of `boom` tiles and a sail `h` tall.
  var SLOOP = { name: 'Sloop', L: 2.6, beam: 1.0, vmax: 4.4, turn: 1, accel: 1, nogo: 0.7, sheet: 'sloop', storm: 1, rocks: 1 };
  var SP = SLOOP;
  var RIGS = {
    sloop:      { deck: 0.62, masts: [{ f: 0.66, h: 2.7, boom: 1.55, sail: 2.3 }], jibs: [{ tack: 0.98, head: 0.71, h: 1.95 }] },
    cutter:     { deck: 0.67, bowsprit: 0.16, masts: [{ f: 0.56, h: 3.4, boom: 2.1, sail: 2.9 }], jibs: [{ tack: 1.14, head: 0.6, h: 2.9 }, { tack: 0.97, head: 0.58, h: 2.4 }] },
    raider:     { deck: 0.67, qd: 0.5, bowsprit: 0.14, masts: [{ f: 0.66, h: 3.3, boom: 1.4, sail: 2.7 }, { f: 0.36, h: 3.8, boom: 1.9, sail: 3.2 }],
                  jibs: [{ tack: 1.12, head: 0.68, h: 2.7 }] },
    brigantine: { deck: 0.75, qd: 0.78, bow: 0.91, bowsprit: 0.14, masts: [{ f: 0.7, h: 4.3, square: [[1.05, 0.35, 2.0], [0.8, 2.1, 3.6]] }, { f: 0.36, h: 4.6, boom: 2.3, sail: 3.7 }],
                  jibs: [{ tack: 1.12, head: 0.7, h: 3.3 }] },
    galleon:    { deck: 0.97, qd: 1.18, bow: 1.25, bowsprit: 0.12, masts: [{ f: 0.74, h: 5.0, square: [[1.3, 0.45, 2.4], [1.0, 2.5, 4.2]] },
                  { f: 0.5, h: 5.8, square: [[1.55, 0.5, 2.7], [1.2, 2.8, 4.8]] }, { f: 0.22, z: 1.18, h: 4.2, boom: 1.7, sail: 3.2 }],
                  jibs: [{ tack: 1.1, head: 0.74, h: 3.4 }] }
  };
  // RIGS heights match the hull sheets (ship_sprites.py): a mast stands on `deck - 0.3` (or its own `z`, on a raised deck),
  // the helm on `qd`, the headsails' tacks and the bowsprit on `bow` (a forecastle) or the deck
  function rigOf(sp) { return RIGS[sp.sheet] || RIGS.sloop; }
  function squareRigged(sp) { return rigOf(sp).masts.some(function (m) { return m.square; }); }
  // each hull's own sheet (tools/bridge-art/ship_sprites.py → assets/scenes/ship-<type>): cells of CELL tiles, 8 to a row, the hull's
  // centre at (CELL/2, cy) in its cell; until one's there, the sloop's sprite is drawn scaled to her length
  var HULLS = { cutter: { cell: 5, cy: 3.2 }, raider: { cell: 6, cy: 3.8 }, brigantine: { cell: 7, cy: 4.4 }, galleon: { cell: 9, cy: 5.6 } };
  function loadHull(type, cb) {
    var H = HULLS[type];
    if (!H || H.img || H.failed) { cb(); return; }
    var base = '/bridge/assets/scenes/ship-' + type + '/';
    fetch(base + 'scene.json?v=' + Date.now()).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (meta) {
      var q = '?v=' + meta.rev, full = new Image(), shore = new Image(), n = 2;
      function done() {
        if (--n) return;
        var c = document.createElement('canvas'); c.width = full.width; c.height = full.height;
        var x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(full, 0, 0);
        var px = x.getImageData(0, 0, c.width, c.height);
        var s2 = document.createElement('canvas'); s2.width = c.width; s2.height = c.height;
        var sx2 = s2.getContext('2d', { willReadFrequently: true }); sx2.drawImage(shore, 0, 0);
        var sp2 = sx2.getImageData(0, 0, c.width, c.height).data, d = px.data;
        for (var i = 0; i < c.width * c.height; i++) if (sp2[i * 4 + 1] > 0) d[i * 4 + 3] = 0;     // cut at the water line
        x.putImageData(px, 0, 0);
        H.img = c; H.oy = meta.originY || 0;
        cb();
      }
      full.onload = done; shore.onload = done;
      full.onerror = shore.onerror = function () { H.failed = true; cb(); };
      full.src = base + 'full.png' + q; shore.src = base + 'shore.png' + q;
    }).catch(function () { H.failed = true; cb(); });
  }
  // ---- your ships at an island ---------------------------------------------------------------------------------------
  // The sloop lies across the pier's end (MOORINGS); every bigger ship of yours there lies in line with her, bow to
  // stern, off one end or the other - so each of them casts off straight out from the pier, clear of the rest - and
  // you walk across the sloop to reach her. Where the shore's too close for that, she lies rafted up outside. All in
  // the island's own frame (before any passage offset). → [{ship, spec, x, r, h, inner: [x, r]}], the sloop first.
  function fleetAt(I, extra) {
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null;
    var ships = F ? F.here(I.id) : [{ id: 'gull', type: 'sloop', name: 'your sloop' }];
    if (extra && ships.indexOf(extra) < 0) ships = ships.concat([extra]);
    var h = I.moorH, c = Math.cos(h), s = Math.sin(h), d = unit(I.moor[0] - I.dock[0], I.moor[1] - I.dock[1]);
    var out = [], ends = [1.3, 1.3], raft = 0.5;                   // how far the line runs each way; how far out the raft
    function clearAt(x, r, sp) {
      for (var u = -sp.L / 2 - 0.2; u <= sp.L / 2 + 0.2; u += 0.4) for (var v = -1; v <= 1; v++) {
        var vv = v * (sp.beam / 2 + 0.15);
        if (ground(I, x + u * c - vv * s, r + u * s + vv * c) === 1) return false;
      }
      return true;
    }
    ships.forEach(function (sh) {
      var sp = F ? (F.effective ? F.effective(sh) : F.spec(sh.type)) : SLOOP;
      if (sh.type === 'sloop') { out.unshift({ ship: sh, spec: sp, x: I.moor[0], r: I.moor[1], h: h, inner: [I.dock[0], I.dock[1]] }); return; }
      var out2 = (sp.beam - 1) / 2;                                 // her pier-side edge in line with the sloop's
      var bx = I.moor[0] + d[0] * out2, br = I.moor[1] + d[1] * out2, placed = null;
      [0, 1].some(function (side) {
        var sg = side ? -1 : 1, off = ends[side] + 0.5 + sp.L / 2;
        var x = bx + sg * off * c, r = br + sg * off * s;
        if (!clearAt(x, r, sp)) return false;
        placed = { x: x, r: r, end: side, reach: off + sp.L / 2,
                   inner: [I.moor[0] + sg * (ends[side] - 0.2) * c, I.moor[1] + sg * (ends[side] - 0.2) * s] };
        return true;
      });
      if (placed) { ends[placed.end] = placed.reach; out.push({ ship: sh, spec: sp, x: placed.x, r: placed.r, h: h, inner: placed.inner }); return; }
      for (var push = raft + sp.beam / 2 + 0.3; push < raft + 8; push += 0.3) {          // no room either end: rafted up outside
        var x = I.moor[0] + d[0] * push, r = I.moor[1] + d[1] * push;
        if (clearAt(x, r, sp)) { out.push({ ship: sh, spec: sp, x: x, r: r, h: h, inner: [I.moor[0] + d[0] * raft, I.moor[1] + d[1] * raft] }); raft = push + sp.beam / 2; return; }
      }
      out.push({ ship: sh, spec: sp, x: I.berth[0], r: I.berth[1], h: h, inner: null });
    });
    return out;
  }
  // a ship lying at her berth, as drawBoat wants her: sails furled, nobody aboard
  function lying(e, ox, oy) {
    return { x: e.x + (ox || 0), r: e.r + (oy || 0), h: e.h, v: 0, sheet: 1.45, boom: 0.06, side: 1, heel: 0, rudder: 0, bump: 0, hoist: 0,
             eff: 0, off: 2, luff: false, empty: true, spec: e.spec, ship: e.ship.id, inner: e.inner && [e.inner[0] + (ox || 0), e.inner[1] + (oy || 0)] };
  }
  // is (x, r) inside one of the hulls lying at A or B (the ones you're not sailing)?
  function hullAt(x, r) {
    var list = (A && A.fleet || []).concat(B && B.fleet || []);
    for (var i = 0; i < list.length; i++) {
      var m = list[i], c = Math.cos(m.h), s = Math.sin(m.h), dx = x - m.x, dr = r - m.r;
      if (Math.abs(dx * c + dr * s) < m.spec.L / 2 && Math.abs(-dx * s + dr * c) < (m.spec.beam || 1) / 2) return true;
    }
    return false;
  }
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
  var traffic = [], wisps = [], storm = null, told = {}, aim = null, committing = false, hinted = false, said = {}, castOut = null;
  // each sea's character: how hard it blows, and what the sailors say of it
  var BASE = { emerald: 0.92, sapphire: 0.95, rose: 0.82, crimson: 1.2, midnight: 0.62 };
  var CALM = { emerald: true, sapphire: true, rose: true };
  var LORE = {
    emerald: 'The Emerald Sea - home water. Lanterns on every swell, and boats about their business.',
    sapphire: 'The Sapphire Sea - the trade road. Sails all the way to the horizon.',
    rose: 'The Rose Sea - warm water and pink spores. The windmill\'s chime carries for miles.',
    crimson: 'The Crimson Sea. Squalls out of nowhere; the traders give it a wide berth. You\'re on your own out here.',
    midnight: 'The Midnight Sea. Nobody sails here who doesn\'t have to. Watch for rocks in the mist - and don\'t follow the lights.'
  };

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
    var v = I.mask[py * I.mw + px];
    if (!v && I.piers) {
      var c = Math.floor(x - I.ox), rr = Math.floor(r - I.oy);
      if (c >= 0 && rr >= 0 && c < I.w && rr < I.h && I.piers[rr * I.w + c]) return 1;
    }
    return v;
  }
  function groundAt(x, r) { return Math.max(ground(A, x, r), ground(B, x, r)); }
  // inside an island's own patch of sea (its render, and a margin): other boats keep out of the harbours
  function inHarbour(I, x, r, m) { return !!I && x > I.ox - m && r > I.oy - m && x < I.ox + I.w + m && r < I.oy + I.h + m; }
  function offshore(x, r) { return !inHarbour(A, x, r, 3) && !inHarbour(B, x, r, 3) && !groundAt(x, r); }
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
    // piers, jetties and bridges: tiles you can walk on standing over water - the hull fetches up against them too
    I.piers = null;
    if (I.mask && w.collisions) {
      I.piers = new Uint8Array(w.width * w.height);
      for (var r = 0; r < w.height; r++) for (var c = 0; c < w.width; c++) {
        if (w.collisions[r][c]) continue;
        var px = Math.floor((c + 0.5) * TS + I.meta.originX), py = Math.floor((r + 0.5) * TS + I.meta.originY);
        if (px >= 0 && py >= 0 && px < I.mw && py < I.mh && I.mask[py * I.mw + px] === 0) I.piers[r * w.width + c] = 1;
      }
    }
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
  function unit(x, y) { var n = Math.hypot(x, y) || 1; return [x / n, y / n]; }
  // where an island keeps your sloop: its berth off the DOCK, lying bow-out along the way to open water. The world
  // draws her there (drawMoored) and the passage starts from exactly there, so the boat at the pier is the one you sail.
  function moorOf(I) {
    I.ox = I.oy = 0;
    I.berth = berth(I);
    I.chan = channel(I);
    I.exit = I.chan[I.chan.length - 1];
    // made fast alongside the quay or the island's galleon (MOORINGS, picked against each render), else the
    // nearest water a hull fits beside the pier
    var M = MOORINGS[I.id];
    if (M) { I.moor = [M[0], M[1]]; I.moorH = M[2]; return; }
    I.moor = pierSide(I) || I.berth.slice();
    var dx = I.berth[0] - I.moor[0], dr = I.berth[1] - I.moor[1];
    I.moorH = Math.hypot(dx, dr) > 1.5 ? Math.atan2(dr, dx) : Math.atan2(I.dock[1] - I.cy, I.dock[0] - I.cx);
  }
  // where your sloop lies tied up: broadside across the end of each island's pier, where you walk out to her
  var MOORINGS = {
    'lumar': [8.0, 17.75, 0], 'lumar-sapphire': [28.5, 28.75, 0], 'lumar-rose': [28.5, 25.75, 0],
    'lumar-crimson': [28.5, 38.75, 0], 'lumar-midnight': [24.5, 39.75, 0],
    'lumar-crown': [22.5, 37.75, 0], 'lumar-tern': [19.5, 21.75, 0], 'lumar-holm': [21.5, 25.75, 0]
  };
  function afloat(I, x, r, rad) {                     // nothing standing out of the water here (shallows will do)
    if (ground(I, x, r) === 1) return false;
    for (var k = 0; k < 12; k++) { var a = k / 12 * Math.PI * 2; if (ground(I, x + Math.cos(a) * rad, r + Math.sin(a) * rad) === 1) return false; }
    return true;
  }
  function pierSide(I) {
    var ox = I.dock[0], oy = I.dock[1], out = Math.atan2(I.berth[1] - oy, I.berth[0] - ox), best = null, bd = 1e9;
    for (var d = 1.0; d <= 6 && !best; d += 0.25) {
      for (var k = 0; k < 48; k++) {
        var a = k / 48 * Math.PI * 2, x = ox + Math.cos(a) * d, r = oy + Math.sin(a) * d;
        if (!afloat(I, x, r, 0.6)) continue;
        if (!afloat(I, x + Math.cos(out) * 1.2, r + Math.sin(out) * 1.2, 0.3) || !afloat(I, x - Math.cos(out) * 1.2, r - Math.sin(out) * 1.2, 0.3)) continue;
        var score = d - 0.3 * Math.abs(Math.sin(a - out));
        if (score < bd) { bd = score; best = [x, r]; }
      }
    }
    return best;
  }
  function buoys(I) {                                  // a red buoy to port and a green to starboard, coming in
    var e = I.exit, p = I.chan[Math.max(0, I.chan.length - 2)], ax = e[0] - p[0], ar = e[1] - p[1], an = Math.hypot(ax, ar) || 1;
    var inx = -ax / an, inr = -ar / an;
    [[-1, 'buoy_red'], [1, 'buoy_green']].forEach(function (b) {
      var x = e[0] - inr * 2.8 * b[0], r = e[1] + inx * 2.8 * b[0];
      if (!groundAt(x, r) && clear(I, x, r, 0.6)) things.push({ kind: b[1], x: x, r: r, rad: 0.35, seed: things.length });
    });
  }
  function homeGulls(I, g0) {
    for (var g = g0; g < g0 + 3; g++) {
      gulls.push({ home: I, x: I.dock[0] + I.ox, r: I.dock[1] + I.oy, z: 2 + hash(g) * 1.5,
                   a: hash(g + 3) * 6.28, rad: 3 + hash(g + 5) * 5, sp: 0.5 + hash(g + 7) * 0.4, follow: false });
    }
  }
  // the island you leave from: its berth and harbour channel, the wind, its buoys and gulls
  function layA() {
    moorOf(A);
    route = [A.berth.slice()].concat(A.chan.slice(1));
    leg = 0; mid = null; dir = null; B = null;
    var out = unit(A.exit[0] - A.berth[0], A.exit[1] - A.berth[1]), course = Math.atan2(out[1], out[0]);
    var seed = (A.id.length * 31 + Math.floor(Date.now() / 3.6e6)) % 997;
    var side = hash(seed) < 0.5 ? -1 : 1;
    wind = { from: course + side * (1.35 + hash(seed + 1) * 0.95), base: BASE[A.pal] || 0.92, s: 1, gust: 0, gustAt: 0, seed: seed };
    things = []; traffic = []; wisps = []; gulls = [];
    buoys(A);
    homeGulls(A, 0);
    gulls.push({ home: null, x: A.berth[0], r: A.berth[1], z: 2.4, a: 1, rad: 3, sp: 0.7, follow: true });
    whale = { done: false };
    storm = { flash: 0, nextFlash: 0, squallAt: 0, thunderAt: 0 };
    if (CALM[A.pal]) for (var t = 0, got = 0; t < 12 && got < 2; t++) {           // two sails out beyond the harbour
      var before = traffic.length;
      spawnSail(A.exit[0] + (hash(seed + t * 5) - 0.5) * 44, A.exit[1] + (hash(seed + t * 5 + 1) - 0.5) * 44, seed + t);
      got += traffic.length - before;
    }
  }
  // the island you've set a course for: placed ahead along the way you're steering, its mouth facing you over open
  // water, and the crossing laid out between: rocks and a reef, a fisherman, things adrift, traffic, the sea's own perils
  function placeB(J, P0, prefer, outFrom) {
    B = J; to = J.id;
    moorFor(J.id);                                   // her berth there, ready for when you climb out
    moorOf(B);
    // where she'll lie there, among whatever else of yours is already tied up at it
    var act = typeof BridgeFleet !== 'undefined' ? BridgeFleet.active().ship : null;
    var fl = fleetAt(B, act), mine = fl.filter(function (e) { return e.ship.id === shipId; })[0] || fl[0];
    B.pier = B.moor.slice(); B.moor = [mine.x, mine.r]; B.moorH = mine.h;
    var bl = B.exit, bb = B.berth.slice(), chan = B.chan.slice();
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
    var done = false;
    [0, 0.15, -0.15, 0.3, -0.3, 0.5, -0.5, 0.75, -0.75, 1.0, -1.0].some(function (da) {
      return [72, 86, 100, 120].some(function (d) {
        var ang = prefer + da;
        B.ox = Math.round(P0[0] + Math.cos(ang) * d - bl[0]); B.oy = Math.round(P0[1] + Math.sin(ang) * d - bl[1]);
        if (overlap()) return false;
        if (!lineClear(P0, [bl[0] + B.ox, bl[1] + B.oy])) return false;
        done = true; return true;
      });
    });
    if (!done) { B.ox = Math.round(P0[0] + Math.cos(prefer) * 120 - bl[0]); B.oy = Math.round(P0[1] + Math.sin(prefer) * 120 - bl[1]); }
    B.berth = [bb[0] + B.ox, bb[1] + B.oy];
    B.moor = [B.moor[0] + B.ox, B.moor[1] + B.oy];
    B.inner = mine.inner && [mine.inner[0] + B.ox, mine.inner[1] + B.oy];
    B.fleet = fl.filter(function (e) { return e !== mine; }).map(function (e) { return lying(e, B.ox, B.oy); });
    B.chan = chan.map(function (p) { return [p[0] + B.ox, p[1] + B.oy]; });
    B.exit = B.chan[B.chan.length - 1];
    var lead = [];
    if (outFrom) {                                   // still in the harbour: the way out first, from the channel mark nearest you
      var ch = [A.berth].concat(A.chan.slice(1, -1)), k0 = 0, kd = 1e9;
      ch.forEach(function (p, i) { var d = Math.hypot(p[0] - outFrom[0], p[1] - outFrom[1]); if (d < kd) { kd = d; k0 = i; } });
      lead = ch.slice(k0).map(function (p) { return p.slice(); });
    }
    route = lead.concat([P0.slice()], B.chan.slice().reverse(), [B.moor.slice()]);
    leg = 0;
    dir = unit(B.exit[0] - P0[0], B.exit[1] - P0[1]);
    mid = [(P0[0] + B.exit[0]) / 2, (P0[1] + B.exit[1]) / 2];
    crossing(P0);
    buoys(B);
    homeGulls(B, 3);
    whale = { done: false };
    if (fight()) setTimeout(function () { if (running && fight()) fight().plan(); }, 0);
  }
  function crossing(P0) {
    var seed = wind.seed, course = Math.atan2(B.exit[1] - P0[1], B.exit[0] - P0[0]);
    var nx = -Math.sin(course), ny = Math.cos(course);
    function along(t, off) { return [P0[0] + (B.exit[0] - P0[0]) * t + nx * off, P0[1] + (B.exit[1] - P0[1]) * t + ny * off]; }
    function put(kind, t, off, extra) {
      var p = along(t, off);
      if (groundAt(p[0], p[1])) return;
      var o = { kind: kind, x: p[0], r: p[1], seed: things.length * 13 + seed };
      for (var k in extra) o[k] = extra[k];
      things.push(o);
    }
    function palAt(t) { return t < 0.5 ? A.pal : B.pal; }
    // a reef across part of the middle, rocks round it
    var rt = 0.42 + hash(seed + 3) * 0.16, ro = (hash(seed + 4) - 0.5) * 6;
    put('reef', rt, ro, { rad: 1.2 }); put('rock_b', rt + 0.03, ro + 3.2, { rad: 0.8 }); put('rock_a', rt - 0.04, ro - 2.8, { rad: 0.7 });
    put('rock_c', 0.25 + hash(seed + 5) * 0.1, 9 * (hash(seed + 6) < 0.5 ? -1 : 1), { rad: 0.5 });
    put('rock_a', 0.7 + hash(seed + 7) * 0.1, -8 * (hash(seed + 8) < 0.5 ? -1 : 1), { rad: 0.7 });
    if (palAt(0.32) !== 'midnight' && palAt(0.32) !== 'crimson')     // nobody fishes the dangerous seas
      put('dory', 0.32 + hash(seed + 9) * 0.1, 7 * (hash(seed + 10) < 0.5 ? -1 : 1), { rad: 0.9, h: 0 });
    put('crate', 0.38 + hash(seed + 11) * 0.08, (hash(seed + 12) - 0.5) * 5, { rad: 0.4, flot: true });
    put('barrel', 0.66 + hash(seed + 13) * 0.08, (hash(seed + 14) - 0.5) * 6, { rad: 0.4, flot: true });
    // the Midnight Sea: rocks hidden in the mist, an old wreck, and lights that lead you onto them
    [0.18, 0.62].forEach(function (t0, h) {
      if (palAt(t0 + 0.1) !== 'midnight') return;
      for (var i = 0; i < 6; i++) put(['rock_a', 'rock_b', 'rock_c'][i % 3], t0 + hash(seed + 40 + i + h * 9) * 0.25, (hash(seed + 50 + i + h * 9) - 0.5) * 8, { rad: 0.6 + (i % 3) * 0.15 });
      put('wreck', t0 + 0.12, (hash(seed + 60 + h) - 0.5) * 10, { rad: 1.3 });
      for (var w = 0; w < 4; w++) {
        var p = along(t0 + hash(seed + 70 + w + h * 5) * 0.3, (hash(seed + 80 + w + h * 5) - 0.5) * 14);
        wisps.push({ x: p[0], r: p[1], x0: p[0], r0: p[1], seed: seed + w * 7 + h * 3 });
      }
    });
    // traffic, on the seas people sail
    for (var j = 0; j < 4; j++) {
      var t = 0.15 + j * 0.22, p2 = along(t, (hash(seed + 90 + j) - 0.5) * 34);
      if (CALM[palAt(t)]) spawnSail(p2[0], p2[1], seed + 90 + j);
    }
  }
  // another sloop going about its business: across your course or along it, under coloured sails
  var CLOTH = [['#c89a50', '#a87a38', '#7a5a2a'], ['#b8503a', '#94402e', '#6a2c20'], ['#d6cfbf', '#b2ac9f', '#86828f'], ['#5a7aa0', '#46607e', '#34485e']];
  function spawnSail(x, r, seed) {
    if (!offshore(x, r)) return;
    var h = hash(seed + 1) * Math.PI * 2;
    traffic.push({ x: x, r: r, h: h, v: 1.5 + hash(seed + 2) * 1.2, sheet: 0.9, boom: 0.8, side: hash(seed + 3) < 0.5 ? -1 : 1, heel: 0.12,
                   rudder: 0, bump: 0, hoist: 1, eff: 1, off: 1.6, luff: false, cloth: CLOTH[Math.floor(hash(seed + 4) * CLOTH.length)], crew: true, seed: seed });
  }
  // the old two-island start (BridgeWorld.sailTo with a destination): the other island set where its quay faces ours
  function lay() {
    layA();
    placeB(B0, A.exit, bearingTo(B0.id), A.berth);
  }
  var B0 = null;

  /** Which sea a point lies in (the seam wanders), and how far past the seam (tiles, + toward B). */
  function seaSide(x, r) {
    if (!B || !mid) return -1;                          // out of the harbour, before a course is set: all one sea
    var s = (x - mid[0]) * dir[0] + (r - mid[1]) * dir[1];
    var t = (x - mid[0]) * -dir[1] + (r - mid[1]) * dir[0];
    return s + (vnoise(t / 9 + 3.1) - 0.5) * 7 + (vnoise(t / 3.3) - 0.5) * 1.6;
  }

  // ---- start and stop ---------------------------------------------------------------------------------------------
  var aboardStart = false, shipId = null, shipName = 'your sloop', blessing = false;
  function mercy() { return blessing ? 0.5 : 1; }                  // a candle lit at St Brendan's (js/crown.js): half the harm
  function start(fromId, toId, opts) {
    var charted = typeof BridgeChart !== 'undefined' ? BridgeChart.dest() : null;     // a course set on the chart ashore
    if (!toId && charted && charted !== fromId && knows(charted)) toId = charted;
    if (running || !knows(fromId) || (toId && (!knows(toId) || fromId === toId))) return false;
    aboardStart = !!(opts && opts.aboard);
    var act = typeof BridgeFleet !== 'undefined' ? BridgeFleet.active() : null;
    SP = act ? act.spec : SLOOP; shipId = act ? act.ship.id : null; shipName = act ? act.ship.name : 'your sloop';
    running = true; from = fromId; to = toId || null; phase = 'load'; began = performance.now(); keys = {}; menu = null;
    wake = []; spray = []; fish = []; msg = null; prompt = null; readyCount = 0; seaWas = null; auto = false;
    aim = null; committing = false; hinted = false; said = {}; told = {}; B = null; B0 = null; wrecking = false; shakeUntil = 0;
    blessing = typeof BridgeCrown !== 'undefined' && BridgeCrown.takeBlessing();
    if (fight()) fight().reset(SEA);
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
      var cb = document.createElement('button');
      cb.id = 'sloop-chart-btn'; cb.type = 'button'; cb.textContent = 'Chart';
      cb.addEventListener('click', function (e) { e.preventDefault(); openChart(); });
      document.body.appendChild(cb);
    }
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.setWorld) BridgeAudio.setWorld('lumar-passage');
    var fail = function () { stop(from); };
    function go() {
      if (!A.sc) { fail(); return; }
      if (B0) lay(); else layA();
      var fl = fleetAt(A, act && act.ship), mine = fl.filter(function (e) { return e.ship.id === shipId; })[0] || fl[0];
      A.pier = A.moor.slice();
      A.moor = [mine.x, mine.r]; A.moorH = mine.h; A.inner = mine.inner;          // where she lies, among the rest of your ships
      A.fleet = fl.filter(function (e) { return e !== mine; }).map(function (e) { return lying(e, 0, 0); });
      boat = { x: A.moor[0], r: A.moor[1], h: A.moorH, v: 0, sheet: 1.45, boom: 0, side: wrap(wind.from - A.moorH) > 0 ? -1 : 1, heel: 0, rudder: 0,
               bump: 0, hoist: 0, eff: 0, off: 0, luff: true, drift: [0, 0], empty: true, spec: SP, ship: shipId };
      castOut = unit(A.moor[0] - A.dock[0], A.moor[1] - A.dock[1]);
      cam = null;
      phase = 'cast'; phaseAt = performance.now();
      if (aboardStart) { phaseAt -= CAST.board; said.board = 1; boat.empty = false; }   // you walked aboard in the world: already sat
      canvas.style.opacity = '1';
    }
    loadSheet(function (err) {
      if (err) { fail(); return; }
      loadHull(SP.sheet, function () {});
      loadIsland(fromId, function (I) {
        A = I;
        if (!toId) { go(); return; }
        loadIsland(toId, function (J) { if (!J.sc) { fail(); return; } B0 = J; go(); });
      });
    });
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return true;
  }
  // you've steered for an island long enough: it's your course now, laid out ahead of you
  // the islands you could steer for: the ones on your chart (js/chart.js), or that you've been to
  function others() {
    var P = isles(), C = typeof BridgeChart !== 'undefined' ? BridgeChart : null;
    return Object.keys(P).filter(function (id) { return id !== A.id && (!C || C.known(id)); }).map(function (id) {
      return { id: id, name: P[id].name, bearing: bearingTo(id) };
    });
  }
  function bearingTo(id) { var P = isles(); return Math.atan2((P[id].y - P[A.id].y) * 0.72, P[id].x - P[A.id].x); }
  function outside() {
    return Math.hypot(boat.x - A.exit[0], boat.r - A.exit[1]) < 6 || boat.x < -4 || boat.r < -4 || boat.x > A.w + 4 || boat.r > A.h + 4;
  }
  // a course from the chart: laid out the way the island really lies, from the harbour mouth if you're still inside
  function canSetCourse() { return running && !!A && !!boat && !B && !committing && (phase === 'sail' || phase === 'cast') && !(fight() && fight().busy()); }
  function setCourse(id) {
    if (!canSetCourse() || id === A.id || !knows(id)) return false;
    if (phase === 'sail' && outside()) commit(id, [boat.x, boat.r], bearingTo(id));
    else commit(id, A.exit, bearingTo(id), [boat.x, boat.r]);
    return true;
  }
  // where you are on the chart: your island ashore, or between the two by where you are on the water
  function chartPos() {
    if (!running || !A || !boat) return null;
    var P = isles(), pa = P[A.id];
    if (!pa) return null;
    if (!B || !P[B.id]) {
      var dx = (boat.x - A.cx) / 400, dy = (boat.r - A.cy) / 288, m = Math.hypot(dx, dy);
      if (m > 0.1) { dx *= 0.1 / m; dy *= 0.1 / m; }
      return { x: pa.x + dx, y: pa.y + dy };
    }
    var pb = P[B.id], cx = pb.x - pa.x, cy = (pb.y - pa.y) * 0.72, wx = B.cx + B.ox - A.cx, wy = B.cy + B.oy - A.cy;
    var den = wx * wx + wy * wy || 1, qr = (cx * wx + cy * wy) / den, qi = (cy * wx - cx * wy) / den;   // chart = world × q
    var px = boat.x - A.cx, py = boat.r - A.cy;
    return { x: pa.x + qr * px - qi * py, y: pa.y + (qi * px + qr * py) / 0.72 };
  }
  function commit(id, P0, prefer, outFrom) {
    if (B || committing) return;
    committing = true;
    var P = isles();
    say('You set a course for ' + P[id].name + '.', 3200);
    loadIsland(id, function (J) {
      committing = false;
      if (!running || B) return;
      if (!J.sc) { say('The chart for ' + P[id].name + ' is missing. Try another course.', 3000); aim = null; return; }
      placeB(J, P0 || [boat.x, boat.r], prefer != null ? prefer : boat.h, outFrom);
      told[A.pal] = true;
    });
  }
  function touch() { return document.documentElement.classList.contains('touch'); }

  function stop(dest, landed) {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove('keys-mode');
    if (chartOpen()) BridgeChart.close();
    ['sloop-menu-btn', 'sloop-chart-btn', 'sloop-menu'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
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
        aboard = null;
        if (typeof BridgeCharacter !== 'undefined') { BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false); }
        if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
        if (landed) disembark(target);                                  // tied up: you climb out and walk up the pier
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
    if (chartOpen()) return;                                           // the chart has the keys while it's open
    if (KEYS.indexOf(k) < 0) return;
    e.preventDefault(); e.stopPropagation();
    if (menu) { if (k === 'escape' && !e.repeat) closeMenu(); return; }
    if (k === 'escape' && !e.repeat) { openMenu(); return; }
    if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat && prompt && phase === 'sail') prompt.act();
    if (k === 't' && !e.repeat) { auto = !auto; say(auto ? 'The sheet trims itself — you steer' : 'Trimming by hand again', 2400); }
    keys[k] = true;
  }
  function onKeyUp(e) { keys[(e.key || '').toLowerCase()] = false; }
  function chartOpen() { return typeof BridgeChart !== 'undefined' && BridgeChart.isOpen(); }
  function openChart() { if (typeof BridgeChart === 'undefined' || menu) return; keys = {}; BridgeChart.open(); }
  function onPointer() { if (prompt && phase === 'sail') prompt.act(); }
  function down(a, b) { return keys[a] || keys[b]; }

  function openMenu() {
    if (menu || !running) return;
    var fn = A ? A.name : 'the quay', opts = [['Keep sailing', closeMenu]], fight = typeof BridgeSeaFight !== 'undefined' && BridgeSeaFight.busy();
    if (typeof BridgeChart !== 'undefined') opts.push(['Open the chart (C)', function () { closeMenu(); openChart(); }]);
    if (B && !fight) opts.push(['Skip ahead to ' + B.name, function () { closeMenu(); stop(to); }]);
    else if (!B && A && !committing) others().forEach(function (o) { opts.push(['Set a course for ' + o.name, function () { closeMenu(); commit(o.id); }]); });
    if (!fight) opts.push(['Put back to ' + fn, function () { closeMenu(); stop(from); }]);
    ask('At the tiller', fight ? 'NOT WITH THEM ON YOUR HEELS.' : null, opts);
  }
  // a choice over the sea view (the sim waits while it's open); an option with no function is shown greyed out
  var onMenuClose = null;
  function ask(title, text, opts, onClose) {
    if (menu) closeMenu();
    var el = document.createElement('div');
    el.id = 'sloop-menu';
    el.className = 'sloop-menu';
    el.innerHTML = '<div class="sloop-menu-title"></div>' + (text ? '<div class="sloop-menu-text"></div>' : '');
    el.querySelector('.sloop-menu-title').textContent = title;
    if (text) el.querySelector('.sloop-menu-text').textContent = text;
    opts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = o[0];
      if (!o[1]) b.disabled = true;
      else b.addEventListener('click', function (e) { e.preventDefault(); onMenuClose = null; closeMenu(); if (o[1] !== closeMenu) o[1](); });
      el.appendChild(b);
    });
    document.body.appendChild(el);
    menu = el; onMenuClose = onClose || null;
    var first = el.querySelector('button:not([disabled])'); if (first) first.focus();
  }
  function closeMenu() { if (menu) menu.remove(); menu = null; keys = {}; var f = onMenuClose; onMenuClose = null; if (f) f(); }

  function say(text, ms) { msg = text; msgAt = performance.now() + (ms || 3200); }
  var shakeUntil = 0, wrecking = false;
  // damage to the ship you're sailing (hull points); what's left of her, 0..1
  function hullHit(pts) {
    shakeUntil = performance.now() + 220;
    return typeof BridgeFleet !== 'undefined' && shipId ? BridgeFleet.damage(shipId, pts) : 1;
  }
  // trouble at sea (js/seafight.js) sees the passage through this
  var SEA = {
    A: function () { return A; }, B: function () { return B; }, boat: function () { return boat; }, spec: function () { return SP; },
    wind: function () { return wind; }, polar: function (off, sp) { return polar(off, sp); }, ground: function (x, r) { return groundAt(x, r); },
    offshore: function (x, r) { return offshore(x, r); }, rand: Math.random, say: say, sfx: function (n) { sfx(n); }, ask: function (a, b, c, d) { ask(a, b, c, d); },
    hull: function () { var f = typeof BridgeFleet !== 'undefined' && BridgeFleet.get(shipId); return f ? f.hull : 1; },
    blessed: function () { return blessing; },
    shake: function () { shakeUntil = performance.now() + 260; }, wreck: function (why) { wreck(why); },
    ctx: function () { return bctx; }, drawBoat: function (now, b) { drawBoat(now, b); }, sx: function (x) { return sx(x); }, sy: function (r, z) { return sy(r, z); }
  };
  function fight() { return typeof BridgeSeaFight !== 'undefined' ? BridgeSeaFight : null; }
  // she's gone: the salvors tow what's left into the nearer port, her hold lost
  function wreck(why) {
    if (wrecking || !running) return;
    wrecking = true;
    say(why + '. Salvors are coming...', 4000);
    sfx('slam');
    var near = !B ? A : Math.hypot(boat.x - (B.dock[0] + B.ox), boat.r - (B.dock[1] + B.oy)) < Math.hypot(boat.x - A.dock[0], boat.r - A.dock[1]) ? B : A;
    setTimeout(function () {
      if (typeof BridgeFleet !== 'undefined' && shipId) BridgeFleet.wreck(shipId, near.id);
      var nm = shipName;
      stop(near.id);
      setTimeout(function () {
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('Wrecked', 'The ' + nm + ' was towed into ' + near.name, 'Her hold is lost. The harbourmaster can mend her');
      }, 1400);
    }, 2600);
  }

  // ---- sailing ----------------------------------------------------------------------------------------------------
  // speed off the wind: nothing within 40° of it (in irons), best on a beam reach, a little less running
  function polar(off, sp) {
    sp = sp || SP;
    var n = sp.nogo || 0.7;
    if (off < n) return 0;
    if (squareRigged(sp)) {                                          // square sail: poor to windward, best with the wind on her quarter
      if (off < n + 0.5) return 0.6 * (off - n) / 0.5;
      if (off < 2.2) return 0.6 + 0.35 * (off - n - 0.5) / Math.max(0.1, 2.2 - n - 0.5);
      if (off < 2.75) return 0.95 + 0.05 * (off - 2.2) / 0.55;
      return 1 - 0.06 * (off - 2.75) / (Math.PI - 2.75);
    }
    if (off < n + 0.4) return 0.75 * (off - n) / 0.4;
    if (off < 1.75) return 0.75 + 0.25 * (off - n - 0.4) / Math.max(0.1, 1.75 - n - 0.4);
    if (off < 2.6) return 1 - 0.08 * (off - 1.75) / 0.85;
    return 0.92 - 0.2 * (off - 2.6) / (Math.PI - 2.6);
  }
  function bestSheet(off) { return clamp(off - 0.42, 0.1, 1.45); }

  function update(dt, now) {
    var t = now / 1000, here = seaHere();
    wind.base += ((BASE[here] || 0.92) - wind.base) * Math.min(1, dt * 0.25);
    if (here === 'crimson') {                                        // a squall: the wind jumps round, the rain comes on
      if (!storm.squallAt) storm.squallAt = now + 9000;
      if (!storm.warned && now > storm.squallAt - 2800 && phase === 'sail') { storm.warned = 1; say('A squall coming down on you - ease the sheet (↓) before it hits!', 2800); }
      if (now > storm.squallAt) {
        storm.squallAt = now + 16000 + hash(Math.floor(now / 997)) * 14000; storm.warned = 0;
        wind.from += (hash(Math.floor(now / 991)) < 0.5 ? -1 : 1) * (0.6 + hash(Math.floor(now / 983)) * 0.5);
        // what it does to her depends on how much sail you're carrying when it hits: eased, she rides it out
        var press = phase === 'sail' ? clamp((boat.eff || 0) * (boat.hoist || 0), 0, 1) : 0;
        if (phase === 'sail') {
          var dmg = (1.5 + 7.5 * press) * (SP.storm || 1) * mercy(), left = hullHit(dmg);
          say(press > 0.5 ? 'Knocked flat! Green water pours over the rail and the hull groans (' + Math.round(left * 100) + '%)' : 'The squall hits - you spill the wind and she rides it out', 3200);
          if (left <= 0) wreck('The squall rolls her over');
        } else say('A squall! The wind jumps round - watch your sheet', 2600);
      }
      if (now > storm.nextFlash) {
        storm.flash = now; storm.nextFlash = now + 6000 + hash(Math.floor(now / 7)) * 9000; storm.thunderAt = now + 300 + hash(Math.floor(now / 11)) * 1400;
        if (phase === 'sail' && hash(Math.floor(now / 3)) < 0.1) {      // now and then the masthead takes it
          storm.thunderAt = now + 60; var lh = hullHit(4 * (SP.storm || 1) * mercy());
          say('Lightning strikes the masthead! Splinters everywhere (' + Math.round(lh * 100) + '%)', 3000);
          if (lh <= 0) wreck('Lightning splits her open');
        }
      }
      if (storm.thunderAt && now > storm.thunderAt) { storm.thunderAt = 0; sfx('thunder'); }
    }
    // the wind veers a little and blows in gusts you can see coming over the water
    var W0 = wind.from + 0.28 * (vnoise(t / 21 + wind.seed) - 0.5) + 0.12 * (vnoise(t / 7.3 + 9) - 0.5);
    if (now > wind.gustAt) {
      var rough = here === 'crimson';
      wind.gustAt = now + (rough ? 3500 + hash(Math.floor(now / 1000)) * 4000 : 9000 + hash(Math.floor(now / 1000)) * 9000);
      wind.gust = rough ? 0.62 : 0.32; wind.gustT = now;
    }
    var g = wind.gust * Math.max(0, Math.sin(clamp((now - (wind.gustT || 0)) / 4200, 0, 1) * Math.PI));
    wind.s = wind.base * (1 + g);
    wind.now = W0;
    var b = boat;
    // steering: a turn of speed from the rudder, a little even when stopped (you can scull her round)
    var castT = phase === 'cast' ? now - phaseAt : 1e9;
    var steer = (down('arrowright', 'd') ? 1 : 0) - (down('arrowleft', 'a') ? 1 : 0);
    b.rudder += (steer - b.rudder) * Math.min(1, dt * 6);
    if (phase === 'sail' || castT > CAST.push) b.h = wrap(b.h + b.rudder * (0.4 + 0.95 * Math.min(1, b.v / 2.6)) * (SP.turn || 1) * dt);
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
    var hoisted = phase === 'cast' ? clamp((castT - CAST.push) / (CAST.sail - CAST.push), 0, 1) : phase === 'moor' ? 1 - clamp((now - phaseAt) / 900, 0, 1) : 1;
    b.hoist = hoisted;
    var goal = (SP.vmax || VMAX) * (typeof BridgeMagic !== 'undefined' && BridgeMagic.has('tide') ? 1.12 : 1) * wind.s * polar(off) * eff * hoisted;
    if (phase === 'moor') goal = 0;
    b.v += (goal - b.v) * Math.min(1, dt * (goal > b.v ? 0.55 : 0.32) * (SP.accel || 1));
    if (off < (SP.nogo || 0.7) && b.v < 0.4) b.v = Math.max(-0.25, b.v - dt * 0.15);   // in irons: she drifts back
    b.heel += ((phase === 'sail' ? wind.s * eff * Math.min(1, polar(off) * 1.3) * (off < 2.4 ? 1 : 0.45) * 0.42 : 0) - b.heel) * Math.min(1, dt * 2);
    // leeway: pushed downwind a little, more when slow
    var dwx = Math.cos(W0 + Math.PI), dwr = Math.sin(W0 + Math.PI), lw = wind.s * 0.12 * (1 - Math.min(1, b.v / 3));
    var nx = b.x + (Math.cos(b.h) * b.v + dwx * lw) * dt, nr = b.r + (Math.sin(b.h) * b.v + dwr * lw) * dt;
    if (phase === 'moor') {                                          // coming alongside: she glides in and lies bow-out at the berth
      nx = b.x + (B.moor[0] - b.x) * Math.min(1, dt * 1.6); nr = b.r + (B.moor[1] - b.r) * Math.min(1, dt * 1.6);
      b.h = wrap(b.h + wrap(B.moorH - b.h) * Math.min(1, dt * 1.4));
    }
    if (castT < CAST.lines) { nx = A.moor[0]; nr = A.moor[1]; b.v = 0; }                  // made fast: she doesn't move
    else if (castT < CAST.push) { nx = b.x + castOut[0] * 0.55 * dt; nr = b.r + castOut[1] * 0.55 * dt; }   // pushed off the pier
    // the hull against rock and shore (bow, stern, either side)
    var hitAt = null, c = Math.cos(b.h), s = Math.sin(b.h);
    var hk = SP.L / 2.6, hb = SP.beam || 1;
    [[1.25, 0], [-1.2, 0], [0.2, 0.45], [0.2, -0.45], [-0.7, 0.4], [-0.7, -0.4]].forEach(function (p) {
      if (hitAt) return;
      var pu = p[0] * hk, pv = p[1] * hb, px = nx + pu * c - pv * s, pr = nr + pu * s + pv * c;
      if (groundAt(px, pr) === 1 || hullAt(px, pr)) hitAt = [px, pr];
      else things.forEach(function (o) { if (!hitAt && !o.flot && o.rad && Math.hypot(px - o.x, pr - o.r) < o.rad) hitAt = [px, pr]; });
    });
    if (hitAt && phase !== 'moor') {
      if (b.v > 0.6 && b.bump <= 0) {
        sfx('hit'); burst(hitAt[0], hitAt[1], 10, 'spray');
        if (here === 'midnight' && b.v > 1.2) {                     // the Midnight rocks hole her
          var hl = hullHit(Math.min(8, 2 + b.v * 1.5) * (SP.rocks || 1) * mercy());
          say('Rocks out of the mist! The hull splits a plank (' + Math.round(hl * 100) + '%)', 3200);
          if (hl <= 0) wreck('She tears her bottom out on the rocks');
        } else {
          if (b.v > 2.4) hullHit(1.5 * (SP.rocks || 1) * mercy());
          say(b.v > 2 ? 'Rocks! You scrape off with a groan of planks' : 'You bump and grind clear', 2200);
        }
      }
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
    // life, and trouble
    life(dt, now);
    if (fight() && phase === 'sail') fight().update(dt, now);
    // where you are: the seas, the far quay
    if (phase === 'sail' && here !== seaWas) {
      if (seaWas && !told[here]) say('Over the seam, foam all round the bow. ' + LORE[here], 6000);
      else if (!told[here]) say(LORE[here], 5600);
      told[here] = true;
      seaWas = here;
    }
    if (!B && phase === 'sail' && !committing) {
      var outside = Math.hypot(b.x - A.exit[0], b.r - A.exit[1]) < 6 || b.x < -4 || b.r < -4 || b.x > A.w + 4 || b.r > A.h + 4;
      if (outside) {
        if (!hinted && now - msgAt > -500) { hinted = true; say('Out of the harbour. Steer for an island - the compass shows where each one on your chart lies' + (touch() ? ' (or open the Chart)' : ' (or C for the chart)'), 5600); }
        var best = null, bd = 0.42;
        others().forEach(function (o) { var d = Math.abs(wrap(o.bearing - b.h)); if (d < bd) { bd = d; best = o; } });
        if (best && aim && aim.id === best.id) aim.t += dt; else aim = best ? { id: best.id, t: 0 } : null;
        if (aim && aim.t > 2.2 && b.v > 0.6) commit(aim.id);
      }
    }
    // the next leg of the course (the gold mark on the compass)
    while (leg < route.length - 1 && Math.hypot(b.x - route[leg][0], b.r - route[leg][1]) < 3.5) leg++;
    prompt = null;
    if (phase === 'sail') {
      var dB = B ? Math.min(Math.hypot(b.x - B.berth[0], b.r - B.berth[1]), Math.hypot(b.x - B.moor[0], b.r - B.moor[1])) : 1e9;
      var dA = Math.min(Math.hypot(b.x - A.berth[0], b.r - A.berth[1]), Math.hypot(b.x - A.moor[0], b.r - A.moor[1]));
      if (dB < 2.6) prompt = b.v < 2.8 ? { text: 'Come alongside — ' + B.name, act: function () { moor(); } }
                                       : { text: 'Too fast to tie up — ease out and round up', act: function () {} };
      else if (dA < 2.2 && now - began > 8000) prompt = { text: 'Put back in at ' + A.name, act: function () { stop(from, true); } };
      things.forEach(function (o) {
        if (prompt) return;
        var d = Math.hypot(b.x - o.x, b.r - o.r);
        if (o.flot && !o.got && d < 1.9) prompt = b.v < 2.4 ? { text: 'Haul the ' + o.kind + ' aboard', act: function () { haul(o); } }
                                                         : { text: 'Slow down to grab the ' + o.kind, act: function () {} };
        else if (o.kind === 'dory' && d < 4.2) prompt = { text: 'Hail the fisherman', act: function () { hail(o); } };
      });
    }
    if (phase === 'cast') {                                          // the cast-off, said as it happens
      b.empty = castT < CAST.board;
      if (!said.board) { said.board = 1; say(SP.L > 3.6 ? 'You go aboard the ' + shipName + ' and take the wheel' : 'You step down into the ' + shipName, 1500); sfx('step'); }
      if (castT > CAST.board && !said.lines) { said.lines = 1; say('You slip the bow line, then the stern', 1400); sfx('click'); }
      if (castT > CAST.lines && !said.push) { said.push = 1; say('A shove off the pier and she drifts clear', 1400); sfx('sit'); }
      if (castT > CAST.push && !said.hoist) { said.hoist = 1; say('Hoist the main! Hand over hand, the sail climbs the mast', 1900); sfx('luff'); }
      if (castT > CAST.sail) {
        phase = 'sail';
        say(touch() ? 'Stick: steer left and right, up to haul in, down to ease out' : '←/→ steer · ↑ haul the sheet in · ↓ ease it out · Esc for the menu', 5200);
      }
    }
    if (phase === 'moor') {
      var mt = now - phaseAt;
      b.empty = mt > MOOR.off;
      if (mt > MOOR.lines && !said.made) { said.made = 1; say('Made fast at ' + B.name + '. You throw the lines ashore', 1600); sfx('click'); }
      if (mt > MOOR.done && !hold) {
        hold = 1;
        if (shipId && typeof BridgeFleet !== 'undefined') BridgeFleet.moored(shipId, to);   // she lies here now
        setTimeout(function () { hold = 0; stop(to, true); }, 300);
      }
    }
  }

  function seaName(pal) { return { emerald: 'the Emerald Sea', crimson: 'the Crimson Sea', rose: 'the Rose Sea', sapphire: 'the Sapphire Sea', midnight: 'the Midnight Sea' }[pal] || 'open water'; }

  var CAST = { board: 1400, lines: 2300, push: 3300, sail: 5000 };       // ms into the cast-off
  var MOOR = { lines: 1300, off: 2000, done: 3200 };                       // ms into coming alongside
  function moor() {
    phase = 'moor'; phaseAt = performance.now();
    sfx('door');
  }
  function seaHere() { return boat ? (seaSide(boat.x, boat.r) > 0 ? B : A).pal : A.pal; }
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
    traffic.forEach(function (o, i) {
      o.x += Math.cos(o.h) * o.v * dt; o.r += Math.sin(o.h) * o.v * dt;
      var far = Math.hypot(o.x - b.x, o.r - b.r);
      if (!offshore(o.x + Math.cos(o.h) * 4, o.r + Math.sin(o.h) * 4)) o.h = wrap(o.h + dt * 1.2);   // bearing away from land and harbours
      if (far < 5) o.h = wrap(o.h + dt * 0.9 * (wrap(Math.atan2(o.r - b.r, o.x - b.x) - o.h) > 0 ? 1 : -1));   // and from you
      if (far > 70) {                                                  // gone over the horizon: another comes up ahead
        var a = b.h + (hash(i + Math.floor(now / 1000)) - 0.5) * 1.6, d = 34 + hash(i + 3) * 10;
        var nx2 = b.x + Math.cos(a) * d, nr2 = b.r + Math.sin(a) * d;
        if (CALM[(seaSide(nx2, nr2) > 0 ? B : A).pal] && offshore(nx2, nr2)) { o.x = nx2; o.r = nr2; o.h = a + Math.PI + (hash(i + 7) - 0.5) * 1.4; }
      }
      var rel = wrap(wind.now - o.h); o.side = rel > 0 ? -1 : 1; o.boom = clamp(Math.abs(rel) - 0.5, 0.15, 1.2);
    });
    wisps.forEach(function (w) {
      var tt = now / 1000 + w.seed;
      w.x = w.x0 + Math.sin(tt * 0.31) * 3 + Math.sin(tt * 0.83) * 0.8; w.r = w.r0 + Math.cos(tt * 0.27) * 2 + Math.sin(tt * 1.1) * 0.5;
      if (!said.wisp && Math.hypot(w.x - b.x, w.r - b.r) < 9) { said.wisp = 1; say('Pale lights bob in the mist ahead, as if someone were waving a lantern. There\'s no one there.', 4600); }
    });
    if (seaHere() === 'midnight' && now > (storm.bellAt || 0)) { storm.bellAt = now + 14000 + hash(Math.floor(now / 13)) * 10000; if (storm.bellAt - 14000 > began + 4000) sfx('bell'); }
    things.forEach(function (o) {
      if (o.kind === 'dory') o.h += (wrap(wind.now - o.h)) * Math.min(1, dt * 0.3);    // at anchor, she lies head to wind
      if (o.kind.indexOf('buoy') === 0 && Math.hypot(b.x - o.x, b.r - o.r) < 6 && now - lastBell > 3800 + hash(o.seed) * 2000) { lastBell = now; sfx('bell'); }
    });
    // the whale: once, about halfway, off whichever beam is open water
    var prog = !B ? 0 : ((b.x - A.berth[0]) * (B.berth[0] - A.berth[0]) + (b.r - A.berth[1]) * (B.berth[1] - A.berth[1])) /
               Math.max(1, Math.pow(Math.hypot(B.berth[0] - A.berth[0], B.berth[1] - A.berth[1]), 2));
    if (seaHere() === 'midnight' || seaHere() === 'crimson') prog = 0;   // the whales keep to kinder water
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
    if (!B || !mid) { BridgeSea.drawSeaAt(bctx, W, H, now, A.pal, cam.x, cam.y); return; }
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
  function sail(P, tack, head, clew, lee, flog, now, tone, cloth) {
    cloth = cloth || CLOTH[2];
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
    var lit = tone > 0.55, col = lit ? cloth[0] : tone > 0.25 ? cloth[1] : cloth[2];
    poly(pts, col);
    // the belly: the half of the cloth curving away from the light, a tone down
    var belly = [];
    for (var bi = 0; bi <= n; bi++) belly.push(pts[bi]);
    var mids = [];
    for (var mj = 0; mj <= n; mj++) {
      var luffP = pts[mj], leechP = pts[Math.min(pts.length - 1, n + (n - mj))];
      if (luffP && leechP) mids.push([luffP[0] + (leechP[0] - luffP[0]) * 0.45, luffP[1] + (leechP[1] - luffP[1]) * 0.45]);
    }
    poly(belly.concat(mids.reverse()), lit ? cloth[1] : cloth[2]);
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

  function drawBoat(now, bb) {
    var b = bb || boat, t = now / 1000, sp = b.spec || SLOOP, rg = rigOf(sp), k = sp.L / 2.6, L2 = sp.L / 2, bw = (sp.beam || 1) / 2;
    // riding the swell (a big hull rides it slower and less)
    var ph = (b.x * Math.cos(wind.now) + b.r * Math.sin(wind.now)) * 0.9 - t * 1.6 / Math.sqrt(k);
    var bob = Math.round(Math.sin(ph) * 1.2 / Math.sqrt(k) + (b.bump > 0 ? Math.sin(t * 40) * 1.5 : 0));
    var P = rig(b, bob);
    // the stern lantern's warm light on the water
    var lx = P(-L2 + 0.14 * k, -0.36 * bw * 2, 0);
    bctx.save(); bctx.globalCompositeOperation = 'lighter';
    for (var g = 3; g >= 1; g--) { bctx.fillStyle = 'rgba(255,190,110,' + (0.025 * (4 - g)).toFixed(3) + ')'; disc(lx[0], lx[1] + 2, g * 9 * Math.sqrt(k), g * 5 * Math.sqrt(k)); }
    bctx.restore();
    // the hull, nearest of 32 headings: her own sheet, or the sloop's drawn to her length until it's there
    var hi = ((Math.round(b.h / (Math.PI * 2) * 32) % 32) + 32) % 32;
    var X = Math.round(b.x * TS - cam.x), Y = Math.round(b.r * TS - cam.y) + bob, H = HULLS[sp.sheet];
    if (H && H.img) {
      var cp = H.cell * 32;
      bctx.drawImage(tinted(H.img, b.tint), (hi % 8) * cp, Math.round(H.oy + Math.floor(hi / 8) * cp), cp, cp, X - cp / 2, Y - Math.round(H.cy * 32), cp, cp);
    } else {
      var cc = cell(Math.floor(hi / 8), hi % 8), sz = Math.round(128 * k);
      bctx.drawImage(tinted(sheetImg, b.tint), cc[0], cc[1], 128, 128, X - Math.round(64 * k), Y - Math.round(83 * k), sz, sz);
    }
    var Pal = BridgeSea.palettes[(seaSide(b.x, b.r) > 0 ? B : A).pal] || BridgeSea.palettes.emerald;
    var c = Math.cos(b.h), s = Math.sin(b.h), nf = Math.round(18 * k);
    for (var i = 0; i < nf; i++) {                                    // the water lapping round her
      var u = -L2 + sp.L * (i / (nf - 1)), w = bw * Math.sin(Math.PI * Math.min(1, 0.22 + 0.86 * (i / (nf - 1)))) + 0.05;
      for (var q = -1; q <= 1; q += 2) {
        var x = b.x + u * c - q * w * s, r = b.r + u * s + q * w * c;
        if (Math.sin(t * 3 + i * 1.3 + q) > 0.1) {
          bctx.fillStyle = 'rgba(' + Pal.foam + ',' + (0.35 + Math.min(0.4, b.v * 0.1)).toFixed(2) + ')';
          bctx.fillRect(sx(x), sy(r) + bob, 2, 1);
        }
      }
    }
    // what's aboard, back to front: you at the helm, each mast and its sails, the headsails out on the bow
    var lee = b.side, hoist = b.hoist, boom = b.boom, deck = rg.deck, wheel = sp.L > 3.6;
    var hz = rg.qd != null ? rg.qd : deck - 0.2, hs = helmOf(b), seat = P(hs[0], hs[1], wheel ? hz : 0.12), pilotRow = seat[2];
    var tone = 0.5 + 0.5 * Math.cos(wrap(b.h + lee * boom - 2.3));
    var tallest = rg.masts.reduce(function (m, x) { return x.h > m.h ? x : m; }, rg.masts[0]);
    var drawList = [{ row: pilotRow, draw: function () {
      if (wheel) {                                                    // the wheel on her quarterdeck
        var wc = P(hs[0] + 0.32, 0, hz + 0.55);
        bctx.fillStyle = '#4a3018'; disc(wc[0], wc[1], 4, 4); bctx.fillStyle = '#2a1a0c'; disc(wc[0], wc[1], 2, 2);
      }
      if (b.crew) drawCrew(seat, b, now); else if (!b.empty) (wheel ? drawHelmsman : drawPilot)(seat, b, now);
    } }];
    rg.masts.forEach(function (m) {
      var mu = -L2 + m.f * sp.L, deck = m.z != null ? m.z + 0.3 : rg.deck;   // (a mast on the quarterdeck stands higher)
      drawList.push({ row: P(mu, 0, 0)[2], draw: function () {
        var foot = P(mu, 0, deck - 0.3, true), top = P(mu, 0, deck + m.h, true);
        line(P(mu, 0, deck + m.h * 0.82, true), P(mu, -bw * 0.95, deck - 0.24, true), 'rgba(30,24,20,0.8)');     // shrouds
        line(P(mu, 0, deck + m.h * 0.82, true), P(mu, bw * 0.95, deck - 0.24, true), 'rgba(30,24,20,0.8)');
        line(foot, top, '#3a2614', m.h > 4 ? 3 : 2);
        line([foot[0] + 1, foot[1]], [top[0] + 1, top[1]], '#6a4a2a');
        if (m === tallest) {                                          // the pennant at the main truck, streaming downwind
          var dw = wind.now + Math.PI, fl = Math.sin(t * 14) * 0.1;
          var royal = b.ship && typeof BridgeCrown !== 'undefined' && BridgeCrown.captain();              // the Crown's captain flies gold
          poly([top, [top[0] + Math.cos(dw + fl) * 9 * Math.sqrt(k), top[1] + Math.sin(dw + fl) * 9 * C45 * Math.sqrt(k)], [top[0], top[1] + 3]], royal ? '#e0b040' : '#c83a2e');
          if (royal) poly([top, [top[0] + Math.cos(dw + fl) * 5 * Math.sqrt(k), top[1] + Math.sin(dw + fl) * 5 * C45 * Math.sqrt(k)], [top[0], top[1] + 2]], '#2a7a4a');
          if (sp.ward) {                                              // the moon lantern at the masthead
            bctx.save(); bctx.globalCompositeOperation = 'lighter';
            var pulse = 0.8 + 0.2 * Math.sin(t * 2.2);
            for (var gl = 4; gl >= 1; gl--) { bctx.fillStyle = 'rgba(170,190,255,' + (0.05 * (5 - gl) * pulse).toFixed(3) + ')'; disc(top[0], top[1] + 4, gl * 4, gl * 4); }
            bctx.restore();
            bctx.fillStyle = '#e8f0ff'; bctx.fillRect(Math.round(top[0]) - 1, Math.round(top[1]) + 3, 3, 3);
          }
        }
        if (m.square) squareMast(P, b, sp, m, mu, deck, lee, boom, hoist, tone, now);
        else foreAft(P, b, m, mu, deck, lee, boom, hoist, tone, now);
      } });
    });
    drawList.push({ row: P(L2 * 0.9, 0, 0)[2], draw: function () {
      var fore = rg.masts.reduce(function (m, x) { return x.f > m.f ? x : m; }, rg.masts[0]), fu = -L2 + fore.f * sp.L;
      var bow = rg.bow || deck, nose = [-L2 + (1 + (rg.bowsprit || 0)) * sp.L, 0, bow - 0.12];
      if (rg.bowsprit) line(P(L2 - 0.1, 0, bow - 0.05, true), P(nose[0], 0, nose[2], true), '#4a3018', 2);
      line(P(fu, 0, deck + fore.h, true), P(nose[0], 0, nose[2], true), 'rgba(30,24,20,0.85)');                 // the forestay
      if (hoist > 0.05) rg.jibs.forEach(function (j, ji) {
        var tu = -L2 + j.tack * sp.L, ja = Math.min(boom * 0.85 + 0.1, 1.2), jl = (j.tack - j.head) * sp.L * 0.9 + 0.3;
        sail(P, [tu, 0, bow - 0.17], [-L2 + j.head * sp.L, 0, bow - 0.17 + j.h * hoist],
             [tu - Math.cos(ja) * jl, lee * Math.sin(ja) * jl, bow - 0.07], lee, b.luff, now + 200 + ji * 70, tone, b.cloth);
      });
    } });
    // your hands about the deck: one at each mast's foot, the rest forward (a big ship only - the sloop is just you)
    var hands = b === boat && sp.L > 2.7 ? Math.min(sp.hands || 0, rg.masts.length + 2) : 0;
    for (var hi2 = 0; hi2 < hands; hi2++) (function (i) {
      var m = rg.masts[i], u = m ? -L2 + m.f * sp.L - 0.3 : L2 - 0.6 - (i - rg.masts.length) * 0.5, v = (i % 2 ? 0.55 : -0.55) * bw;
      var fz = (m && m.z != null ? m.z : rg.deck - 0.25), pt = P(u, v, fz);
      drawList.push({ row: pt[2], draw: function () { drawHand(pt, b, now, i); } });
    })(hi2);
    drawList.sort(function (p, q) { return p.row - q.row; });
    drawList.forEach(function (d) { d.draw(); });
    if (!wheel) {                                                     // the tiller, pushed against the turn
      var tl = P(-L2, 0, 0.42), tr = P(-L2 + Math.cos(b.rudder * 0.6) * 0.55, -Math.sin(b.rudder * 0.6) * 0.55, 0.45);
      line(tl, tr, '#5a3a1a', 1);
    }
  }
  // a hull sheet washed with a colour (a pirate's tarred black, a drowned ship's pale green), made once and kept
  var tints = [];
  function tinted(img, tint) {
    if (!tint || !img) return img;
    for (var i = 0; i < tints.length; i++) if (tints[i].img === img && tints[i].tint === tint) return tints[i].c;
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    var x = c.getContext('2d'); x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height);
    tints.push({ img: img, tint: tint, c: c });
    return c;
  }
  // a fore-and-aft mast: the main on its boom (or bundled along it, furled), the mainsheet
  function foreAft(P, b, m, mu, deck, lee, boom, hoist, tone, now) {
    var goose = [mu, 0, deck], clew = [mu - Math.cos(boom) * m.boom, lee * Math.sin(boom) * m.boom, deck + 0.08];
    var head = [mu, 0, deck + m.sail * hoist];
    if (hoist > 0.05) sail(P, goose, head, clew, lee, b.luff, now, tone, b.cloth);
    else {
      var cl = (b.cloth || CLOTH[2]);
      line(P(goose[0], goose[1], goose[2] + 0.08, true), P(clew[0], clew[1], clew[2] + 0.08, true), cl[1], 3);
      line(P(goose[0], goose[1], goose[2] + 0.12, true), P(clew[0], clew[1], clew[2] + 0.12, true), cl[0], 1);
      for (var ti = 1; ti < 4; ti++) { var f = ti / 4, tp = P(goose[0] + (clew[0] - goose[0]) * f, goose[1] + (clew[1] - goose[1]) * f, deck + 0.12, true); bctx.fillStyle = '#5a3a1a'; bctx.fillRect(Math.round(tp[0]), Math.round(tp[1]) - 1, 1, 3); }
    }
    line(P(goose[0], goose[1], goose[2], true), P(clew[0], clew[1], clew[2], true), '#4a3018', 2);
    line(P(clew[0], clew[1], clew[2], true), P(mu - m.boom - 0.2, 0, deck - 0.2), 'rgba(200,190,170,0.6)');
  }
  // a square-rigged mast: its yards braced round with the sheet (square across running, sharp up close-hauled), the
  // sails loosed down from them as she hoists, bellied out before the wind
  function squareMast(P, b, sp, m, mu, deck, lee, boom, hoist, tone, now) {
    var phi = hoist < 0.05 ? Math.PI / 2 : 0.62 + (Math.PI / 2 - 0.62) * clamp(boom / 1.3, 0, 1), cp = Math.cos(phi), spn = Math.sin(phi);   // furled: squared away
    var cl = b.cloth || ['#e4dccb', '#c4bca9', '#948e82'];
    m.square.forEach(function (y) {
      var w = y[0], zt = deck + y[2], zb = deck + y[2] - (y[2] - y[1]) * hoist;
      var A1 = [mu + w * cp, -lee * w * spn, zt], B1 = [mu - w * cp, lee * w * spn, zt];
      if (hoist > 0.05) {
        var bel = (y[2] - y[1]) * 0.22 * hoist, nu = spn * bel, nv = lee * cp * bel, pts = [], n = 8;
        var flog = b.luff ? Math.sin(now / 50) * 0.08 : 0;
        for (var i = 0; i <= n; i++) { var f = i / n; pts.push(P(A1[0] + (B1[0] - A1[0]) * f, A1[1] + (B1[1] - A1[1]) * f, zt, true)); }
        for (var j = 1; j < n; j++) {                                // the lee leech, bellying out
          var g = j / n, bb2 = Math.sin(g * Math.PI);
          pts.push(P(B1[0] + nu * bb2 * 0.6, B1[1] + nv * bb2 * 0.6, zt - (zt - zb) * g, true));
        }
        for (var q = n; q >= 0; q--) {                               // the foot, the belly deepest in the middle
          var f2 = q / n, bb3 = Math.sin(f2 * Math.PI) * (1 + flog);
          pts.push(P(A1[0] + (B1[0] - A1[0]) * f2 + nu * bb3, A1[1] + (B1[1] - A1[1]) * f2 + nv * bb3, zb, true));
        }
        for (var e = n - 1; e > 0; e--) {                            // the weather leech
          var g2 = e / n, bb4 = Math.sin(g2 * Math.PI);
          pts.push(P(A1[0] + nu * bb4 * 0.6, A1[1] + nv * bb4 * 0.6, zt - (zt - zb) * g2, true));
        }
        poly(pts, tone > 0.55 ? cl[0] : tone > 0.25 ? cl[1] : cl[2]);
        var mid = [];                                                // the shadowed half of the belly
        for (var mi = 0; mi <= n; mi++) mid.push(pts[mi]);
        for (var mj = n; mj >= 0; mj--) { var f3 = mj / n; mid.push(P(A1[0] + (B1[0] - A1[0]) * f3 + nu * 0.5, A1[1] + (B1[1] - A1[1]) * f3 + nv * 0.5, (zt + zb) / 2, true)); }
        poly(mid, tone > 0.55 ? cl[1] : cl[2]);
        for (var sm = 1; sm < 3; sm++) {                             // seams down the cloth
          var f4 = sm / 3;
          line(P(A1[0] + (B1[0] - A1[0]) * f4, A1[1] + (B1[1] - A1[1]) * f4, zt, true),
               P(A1[0] + (B1[0] - A1[0]) * f4 + nu, A1[1] + (B1[1] - A1[1]) * f4 + nv, zb, true), 'rgba(60,54,70,0.3)');
        }
        for (var ed = 0; ed < pts.length; ed++) line(pts[ed], pts[(ed + 1) % pts.length], '#2c2634');
      } else {                                                       // furled: a fat roll along the yard
        line(P(A1[0], A1[1], zt - 0.08, true), P(B1[0], B1[1], zt - 0.08, true), cl[1], 3);
      }
      line(P(A1[0], A1[1], zt, true), P(B1[0], B1[1], zt, true), '#3a2614', 2);                     // the yard
      line(P(A1[0], A1[1], zt, true), P(mu - 0.4, -lee * w * 0.9, deck - 0.2, true), 'rgba(200,190,170,0.35)');   // the braces
      line(P(B1[0], B1[1], zt, true), P(mu - 0.4, lee * w * 0.9, deck - 0.2, true), 'rgba(200,190,170,0.35)');
    });
  }
  // the helm: the sloop's tiller seat on the windward bench, a big ship's wheel on her quarterdeck
  function helmOf(b) {
    var sp = b.spec || SLOOP, k = sp.L / 2.6;
    if (sp.L > 3.6) return [-sp.L / 2 + 0.16 * sp.L, 0];
    return [-0.82 * k, -b.side * 0.22 * (sp.beam || 1)];
  }
  // you standing at a big ship's wheel (the walking sheet, still)
  function drawHelmsman(seat, b, now) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.sportImage) return;
    var img = BridgeCharacter.sportImage(BridgeCharacter.sportKey(), false);
    if (!img) return;
    var a = ((b.h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) % 4;
    bctx.drawImage(img, [0, 1, 2, 1][Math.floor(now / 340) % 4] * 32, [1, 0, 3, 2][q] * 48, 32, 48, Math.round(seat[0]) - 16, Math.round(seat[1]) - 45, 32, 48);
  }
  function disc(x, y, rx, ry) {
    for (var j = -ry; j <= ry; j++) {
      var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry))));
      bctx.fillRect(Math.round(x - w), Math.round(y + j), w * 2, 1);
    }
  }
  // a sailor at another boat's tiller
  var crewImg = null;
  function drawCrew(seat, b, now) {
    if (!crewImg) { crewImg = new Image(); crewImg.src = '/bridge/assets/characters/npc-regular.png'; }
    if (!crewImg.complete || !crewImg.naturalWidth) return;
    var a = ((b.h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) % 4;
    bctx.drawImage(crewImg, [0, 1, 2, 1][Math.floor(now / 340 + b.seed) % 4] * 32, [1, 0, 3, 2][q] * 48, 32, 48, Math.round(seat[0]) - 16, Math.round(seat[1]) - 41, 32, 48);
  }
  // one of your hands on deck, standing their watch (sailors and dockhands, by turns)
  var handImgs = {};
  function drawHand(pt, b, now, i) {
    var sheet = ['npc-sailor', 'npc-dockhand'][i % 2], img = handImgs[sheet];
    if (!img) { img = handImgs[sheet] = new Image(); img.src = '/bridge/assets/characters/' + sheet + '.png'; }
    if (!img.complete || !img.naturalWidth) return;
    var a = ((b.h + (i % 3 - 1) * 1.2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) % 4;
    bctx.drawImage(img, [0, 1, 2, 1][Math.floor(now / 380 + i * 1.7) % 4] * 32, [1, 0, 3, 2][q] * 48, 32, 48, Math.round(pt[0]) - 16, Math.round(pt[1]) - 45, 32, 48);
  }
  // you on foot, stepping aboard or ashore (the walking sheet)
  function drawWalker(x, r, toward, now) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.sportImage) return;
    var img = BridgeCharacter.sportImage(BridgeCharacter.sportKey(), false);
    if (!img) return;
    var a = Math.atan2(toward[1] - r, toward[0] - x), q = ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4;
    var row = [1, 0, 3, 2][q], col = 4 + Math.floor(now / 90) % 8;
    bctx.drawImage(img, col * 32, row * 48, 32, 48, sx(x) - 16, sy(r) - 45, 32, 48);
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
    if (o.kind === 'wreck') {
      var hx = X, hy = Y;
      poly([[hx - 30, hy - 2], [hx + 26, hy - 8], [hx + 34, hy + 2], [hx - 24, hy + 8]], '#1e1a22');
      poly([[hx - 26, hy - 2], [hx + 24, hy - 7], [hx + 28, hy - 3], [hx - 22, hy + 2]], '#2e2630');
      line([hx - 8, hy - 4], [hx - 18, hy - 46], '#2a2028', 2); line([hx + 12, hy - 6], [hx + 20, hy - 34], '#2a2028', 2);
      line([hx - 18, hy - 46], [hx - 2, hy - 30], 'rgba(40,34,48,0.8)'); line([hx - 14, hy - 36], [hx - 30, hy - 30], '#2a2028');
      poly([[hx - 15, hy - 40], [hx - 4, hy - 34], [hx - 12, hy - 26]], 'rgba(120,110,130,0.5)');      // a rag of sail
      for (var i = 0; i < 26; i++) {
        var a = i / 26 * Math.PI * 2, n = Math.sin(t * 2.3 + i * 1.7 + o.seed);
        if (n < 0.2) continue;
        bctx.fillStyle = 'rgba(' + P.foam + ',' + (0.25 + 0.35 * n).toFixed(2) + ')';
        bctx.fillRect(Math.round(X + Math.cos(a) * 40), Math.round(Y + Math.sin(a) * 14), 2, 1);
      }
      return;
    }
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

  function seatOf(b) {
    var c = Math.cos(b.h), s = Math.sin(b.h), hs = helmOf(b), u = hs[0], v = hs[1];
    return [b.x + u * c - v * s, b.r + u * s + v * c];
  }
  // the bow and stern lines from her cleats to the pier, paying out as you slip them (k: how much is still ashore)
  function moorLines(b, quay, k) {
    if (!quay) return;
    var c = Math.cos(b.h), s = Math.sin(b.h);
    var hl = ((b.spec || SLOOP).L / 2) - 0.15;
    [hl, -hl].forEach(function (u) {
      var a = [sx(b.x + u * c), sy(b.r + u * s, 0.45)], q = [sx(quay[0] + u * 0.5 * c), sy(quay[1] + u * 0.5 * s, 0.1)];
      var e = [a[0] + (q[0] - a[0]) * clamp(k, 0, 1), a[1] + (q[1] - a[1]) * clamp(k, 0, 1)];
      var sag = 5 * clamp(k, 0, 1);
      for (var i = 0; i <= 12; i++) {
        var f = i / 12, x = a[0] + (e[0] - a[0]) * f, y = a[1] + (e[1] - a[1]) * f + Math.sin(f * Math.PI) * sag;
        bctx.fillStyle = '#c8b48a'; bctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    });
  }
  // the Midnight Sea's lights: pale, bobbing, never quite where you're looking
  function drawWisps(now) {
    if (!wisps.length) return;
    bctx.save(); bctx.globalCompositeOperation = 'lighter';
    wisps.forEach(function (w, i) {
      var X = sx(w.x), Y = sy(w.r, 1.1 + Math.sin(now / 700 + i) * 0.25);
      if (X < -20 || Y < -20 || X > W + 20 || Y > H + 20) return;
      var p = 0.6 + 0.4 * Math.sin(now / 340 + w.seed);
      for (var g = 3; g >= 1; g--) { bctx.fillStyle = 'rgba(170,220,200,' + (0.05 * p * (4 - g)).toFixed(3) + ')'; disc(X, Y, g * 5, g * 5); }
      bctx.fillStyle = 'rgba(230,255,240,' + (0.7 * p).toFixed(2) + ')'; bctx.fillRect(X - 1, Y - 1, 2, 2);
      bctx.fillStyle = 'rgba(170,220,200,' + (0.12 * p).toFixed(2) + ')'; disc(X, sy(w.r), 6, 2);     // its light on the water
    });
    bctx.restore();
  }
  // the Crimson Sea's weather: rain driving across, the light dark, lightning; the Midnight Sea's thick mist
  function drawWeather(now) {
    var here = seaHere();
    if (here === 'crimson') {
      bctx.fillStyle = 'rgba(40,10,14,0.22)'; bctx.fillRect(0, 0, W, H);
      var dw = wind.now + Math.PI, vx = Math.cos(dw) * 0.5, vy = 1;
      bctx.fillStyle = 'rgba(220,200,210,0.45)';
      for (var i = 0; i < 220; i++) {
        var sp = 0.5 + (i % 5) * 0.08, y = ((i * 97.3 + now * sp) % (H + 30)) - 15, x = ((i * 53.7 + now * sp * vx) % (W + 30) + W + 30) % (W + 30) - 15;
        bctx.fillRect(Math.round(x), Math.round(y), 1, 4 + (i % 3));
      }
      var fl = storm.flash ? Math.max(0, 1 - (now - storm.flash) / 380) : 0;
      if (fl > 0) { bctx.fillStyle = 'rgba(255,240,255,' + (0.55 * fl * (Math.sin(now / 30) > -0.3 ? 1 : 0.4)).toFixed(2) + ')'; bctx.fillRect(0, 0, W, H); }
    } else if (here === 'midnight') {
      bctx.save(); bctx.globalCompositeOperation = 'source-over';
      var g = bctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.12, W / 2, H / 2, Math.max(W, H) * 0.6);
      g.addColorStop(0, 'rgba(70,64,110,0)'); g.addColorStop(1, 'rgba(46,42,80,0.62)');
      bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
      bctx.restore();
    }
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
      var thin = SP.ward ? 0.015 : 0.035;                                // a moon lantern burns the mist thin
      for (var i = 0; i < 9; i++) {
        var mx = ((i * 97 + t * 6) % (W + 160)) - 80, my = (i * 53) % H;
        for (var m = 3; m >= 1; m--) { bctx.fillStyle = 'rgba(90,84,140,' + thin + ')'; disc(mx, my, 30 * m, 8 * m); }
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
    traffic.forEach(function (o) {
      var X = sx(o.x), Y = sy(o.r);
      if (X > -140 && X < W + 140 && Y > -160 && Y < H + 80) list.push({ row: o.r, draw: function () { drawBoat(now, o); } });
    });
    // stepping aboard and ashore: you on the pier, the boat's lines made fast to it
    var castT = phase === 'cast' ? now - phaseAt : -1, moorT = phase === 'moor' ? now - phaseAt : -1;
    var quay = phase === 'moor' ? B && (B.inner || [B.dock[0] + B.ox, B.dock[1] + B.oy]) : (A.inner || [A.dock[0] + A.ox, A.dock[1] + A.oy]);
    var seat = seatOf(b);
    [A, B].forEach(function (I) {                                      // the rest of your ships, tied up where you left them
      (I && I.fleet || []).forEach(function (m) {
        var X = sx(m.x), Y = sy(m.r);
        if (X < -260 || X > W + 260 || Y < -260 || Y > H + 120) return;
        m.heel = Math.sin(now / 1300 + m.x) * 0.035;
        list.push({ row: m.r, draw: function () { drawBoat(now, m); if (m.inner) moorLines(m, m.inner, 1); } });
      });
    });
    if (castT >= 0 && castT < CAST.board) {
      var f = clamp(castT / CAST.board, 0, 1), wx = quay[0] + (seat[0] - quay[0]) * f, wr = quay[1] + (seat[1] - quay[1]) * f;
      list.push({ row: wr, draw: function () { drawWalker(wx, wr, seat, now); } });
    }
    if (moorT > MOOR.off && moorT < MOOR.done + 400 && quay) {
      var g2 = clamp((moorT - MOOR.off) / (MOOR.done - MOOR.off), 0, 1), mx = seat[0] + (quay[0] - seat[0]) * g2, mr = seat[1] + (quay[1] - seat[1]) * g2;
      list.push({ row: mr, draw: function () { drawWalker(mx, mr, quay, now); } });
    }
    if (fight()) list = list.concat(fight().items(now));
    list.sort(function (p, q) { return p.row - q.row; });
    list.forEach(function (d) { d.draw(); });
    if ((castT >= 0 && castT < CAST.lines) || moorT > MOOR.lines) moorLines(b, quay, castT >= 0 && castT > CAST.board ? 1 - (castT - CAST.board) / (CAST.lines - CAST.board) : 1);
    drawWisps(now);
    drawSky(now);
    drawWeather(now);
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
    if (!B && phase !== 'cast') {                                    // where each island lies: steer for one to set a course
      others().forEach(function (o) {
        var on = aim && aim.id === o.id, mx = cx + Math.cos(o.bearing) * R * 0.86, my = cy + Math.sin(o.bearing) * R * 0.86 * C45;
        ctx.fillStyle = on ? '#ffd060' : 'rgba(242,236,214,0.85)';
        ctx.beginPath(); ctx.arc(mx, my, px(on ? 5 : 3.5), 0, Math.PI * 2); ctx.fill();
        ctx.font = px(8) + 'px "Pixelify Sans", monospace'; ctx.fillStyle = on ? '#ffd060' : '#c8d0e0';
        ctx.fillText(o.name.split(' ').map(function (w) { return w[0]; }).join(''), cx + Math.cos(o.bearing) * (R + px(12)), cy + Math.sin(o.bearing) * (R + px(12)) * C45);
      });
    } else {
      var wp = route[Math.min(leg, route.length - 1)] || (B ? B.berth : A.exit);
      var bc = Math.atan2(wp[1] - b.r, wp[0] - b.x);                 // the next leg of the course, gold
      ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.arc(cx + Math.cos(bc) * R * 0.86, cy + Math.sin(bc) * R * 0.86 * C45, px(4), 0, Math.PI * 2); ctx.fill();
    }
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
    // the passage, top left: from, to, how far along (or, before a course: which island you're pointing at)
    var bx0 = px(20), by0 = px(18), bw = px(220);
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(bx0 - px(8), by0 - px(10), bw + px(16), px(40));
    ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#c8d0e0';
    ctx.fillText(A.name.toUpperCase(), bx0, by0);
    if (B) {
      var prog = clamp(((b.x - A.berth[0]) * (B.berth[0] - A.berth[0]) + (b.r - A.berth[1]) * (B.berth[1] - A.berth[1])) /
                       Math.pow(Math.hypot(B.berth[0] - A.berth[0], B.berth[1] - A.berth[1]), 2), 0, 1);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd060'; ctx.fillText(B.name.toUpperCase(), bx0 + bw, by0);
      ctx.fillStyle = '#2a3040'; ctx.fillRect(bx0, by0 + px(10), bw, px(4));
      ctx.fillStyle = '#ffd060'; ctx.fillRect(bx0, by0 + px(10), bw * prog, px(4));
      ctx.fillStyle = '#f2ecd6'; ctx.fillRect(bx0 + bw * prog - px(2), by0 + px(8), px(4), px(8));
    } else {
      var aimName = aim ? isles()[aim.id].name.toUpperCase() : null;
      ctx.textAlign = 'right'; ctx.fillStyle = aimName ? '#ffd060' : '#8a90a8';
      ctx.fillText(committing ? 'SETTING A COURSE…' : aimName ? 'STEERING FOR ' + aimName : 'STEER FOR AN ISLAND', bx0 + bw, by0 + px(14));
    }
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
    if (fight()) fight().hud(ctx, s, canvas.width);
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
    if (!menu && !chartOpen()) update(dt, now);
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.imageSmoothingEnabled = false;
    draw(now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    var sk = now < shakeUntil ? Z * 2 : 0;                              // a hit shakes the world
    if (sk) { ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(buf, sk ? Math.round((Math.random() - 0.5) * sk * 2) : 0, sk ? Math.round((Math.random() - 0.5) * sk * 2) : 0, W * Z, H * Z);
    hud(now);
  }

  // ---- your sloop, made fast at the pier while you're ashore -------------------------------------------------------
  // Drawn in the island itself (the lumar scene hooks), from the same sheet and at the same berth and heading the
  // passage starts from: the boat you see at the pier is the one you step into.
  var moored = {}, mooring = {};
  function moorFor(id) {
    if (moored[id] || mooring[id]) return moored[id] || null;
    mooring[id] = true;
    loadSheet(function (err) {
      if (err) return;
      loadIsland(id, function (I) { if (I.mask && I.sc) { moorOf(I); moored[id] = I; } });
    });
    return null;
  }
  // your ships at this island as the world draws them (laid out again only when the fleet changes)
  function fleetHere(I) {
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null;
    var key = F ? F.here(I.id).map(function (s) { return s.id + ':' + s.type; }).join(',') : 'gull';
    if (I.fleetKey !== key) {
      I.fleetKey = key; I.fleetList = fleetAt(I).map(function (e) { return lying(e, 0, 0); });
      I.fleetList.forEach(function (m) { loadHull(m.spec.sheet, function () {}); });   // each ship's own hull, not the sloop's stretched
    }
    return I.fleetList;
  }
  // ---- going aboard in the world: down the pier, across the sloop if she's a bigger ship lying beyond her, aboard,
  // and she dips under you; then the sea view takes over with you already at the helm (start's `aboard`), so the
  // boat you walked to is the one you sail. With more than one of your ships here, you're asked which first.
  var aboard = null, WDIR = { down: 0, right: 1, up: 2, left: 3 };
  function walkPath(pts, speedAt, done) {
    var seg = 0, t = 0, dist = 0, cur = { x: pts[0].x, y: pts[0].y, z: pts[0].z || 0 }, facing = 'down';
    return {
      cur: cur,
      step: function (dt) {
        var a = pts[seg], b = pts[seg + 1];
        if (!b) { done(); return false; }
        var L = Math.hypot(b.x - a.x, b.y - a.y) || 0.001, speed = speedAt(seg);
        t = Math.min(1, t + dt * speed / L);
        cur.x = a.x + (b.x - a.x) * t; cur.y = a.y + (b.y - a.y) * t; dist += dt * speed;
        cur.z = (a.z || 0) + ((b.z || 0) - (a.z || 0)) * Math.min(1, t * 3);   // a step up onto a deck (or down off it)
        var dx = b.x - a.x, dy = b.y - a.y;
        if (L > 0.05) facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (t >= 1) { seg++; t = 0; sfx('step'); }
        return true;
      },
      pose: function (I) {
        BridgeCharacter.setPose({ kind: 'walk', x: cur.x, y: cur.y, row: WDIR[facing], col: 4 + Math.floor(dist / 0.3) % 8, flip: false,
                                  lift: Math.round(cur.z * C45 * TS),
                                  light: [Math.floor(I.dock[0]), Math.floor(I.dock[1])] });
      }
    };
  }
  // the way from the pier's end to a ship's helm: onto the sloop, along her and across onto the ship beyond
  function wayAboard(I, m) {
    var seat = seatOf(m), rg = rigOf(m.spec), pts = [{ x: I.dock[0], y: I.dock[1] + 0.35, z: 0 }];
    if (m.spec.L > 2.7) {
      pts.push({ x: I.moor[0], y: I.moor[1] + 0.1, z: 0.36 });                       // across the sloop's deck
      if (m.inner) pts.push({ x: m.inner[0], y: m.inner[1] + 0.1, z: 0.36 });
    }
    pts.push({ x: seat[0], y: seat[1] + 0.25, z: m.spec.L > 3.6 ? (rg.qd != null ? rg.qd : rg.deck - 0.2) : 0.24 });
    return pts;
  }
  function board(worldId, shipId) {
    var I = moored[worldId], world = BridgeWorld.getWorld(), F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null;
    if (running || aboard) return false;
    if (F) {
      var here = F.here(worldId);
      if (!shipId && here.length > 1 && typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) {
        BridgeInteractions.choose({
          title: 'Which ship?',
          text: 'YOUR SHIPS TIED UP HERE. PICK THE ONE YOU\'LL TAKE OUT.',
          rows: here.map(function (sh) {
            var sp = F.spec(sh.type);
            var short = F.effective ? F.effective(sh).short : 0;
            return { label: sh.name, sub: F.line ? F.line(sh) : sp.name, note: short ? 'needs ' + short + ' hand' + (short > 1 ? 's' : '') : sh.id === F.active().ship.id ? 'last sailed' : '',
                     pick: function () { board(worldId, sh.id); } };
          }),
          closeLabel: 'Not now'
        });
        return true;
      }
      shipId = shipId || (here.some(function (sh) { return sh.id === F.active().ship.id; }) ? F.active().ship.id : here[0].id);
      var want = F.get(shipId), short = want && F.effective ? F.effective(want).short : 0;
      if (short && typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) {     // she can't be sailed alone
        var gull = here.filter(function (sh) { return sh.type === 'sloop'; })[0];
        BridgeInteractions.choose({
          title: 'Short-handed',
          text: 'THE ' + want.name.toUpperCase() + ' NEEDS ' + short + ' MORE HAND' + (short > 1 ? 'S' : '') + ' BEFORE SHE CAN SAIL. THE HARBOURMASTER WILL KNOW WHO\'S LOOKING FOR A BERTH.',
          buttons: gull ? [{ label: 'Take the ' + gull.name + ' instead', act: function () { board(worldId, gull.id); } }] : [],
          closeLabel: 'All right'
        });
        return true;
      }
      F.sail(shipId);
    }
    if (!I || !world || !BridgeWorld.setMode || !BridgeCharacter.setPose) return start(worldId);
    var list = fleetHere(I), m = list.filter(function (e) { return e.ship === shipId; })[0] || list[0];
    var pts = [{ x: BridgeCharacter.getX() + 0.5, y: BridgeCharacter.getY() + 1 - 3 / 32 }].concat(wayAboard(I, m));
    var w = walkPath(pts, function (seg) { return seg >= pts.length - 3 ? 1.6 : 2.4; }, function () {
      aboard.at = performance.now();                                 // stepped aboard: sit (or take the wheel), and she rocks
      BridgeCharacter.setHidden(true);
      setTimeout(function () { sfx(m.spec.L > 3.6 ? 'step' : 'sit'); }, 180);
      setTimeout(function () {
        BridgeWorld.setMode(null);
        if (!start(worldId, null, { aboard: true })) { aboard = null; BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false); }
      }, 900);
    });
    aboard = { id: worldId, ship: m.ship, at: 0 };
    w.pose(I);
    BridgeWorld.setMode({
      solo: true,
      focus: function () { return { x: w.cur.x - 0.5, y: w.cur.y - 1.2 }; },
      end: function () { BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false); aboard = null; },
      update: function (dt) {
        if (aboard && aboard.at) return;
        if (w.step(dt)) w.pose(I);
      }
    });
    return true;
  }
  // ...and arriving: at the helm as the island comes up, then off her (across the sloop, if need be) and up the pier
  function disembark(id) {
    var I = moored[id], world = BridgeWorld.getWorld(), F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null;
    if (!I || !world || !BridgeWorld.setMode) { moorFor(id); return; }
    var list = fleetHere(I), sid = F ? F.active().ship.id : 'gull', m = list.filter(function (e) { return e.ship === sid; })[0] || list[0];
    var tx = Math.floor(I.dock[0]), ty = Math.floor(I.dock[1]) - 1;
    if (!world.collisions[ty] || world.collisions[ty][tx]) ty = Math.floor(I.dock[1]);
    var pts = wayAboard(I, m).reverse().concat([{ x: tx + 0.5, y: ty + 1 - 3 / 32 }]), wait = 0.55;
    var w = walkPath(pts, function (seg) { return seg === 0 ? 1.6 : 2.4; }, function () {
      BridgeWorld.setMode(null);
      BridgeCharacter.setPose(null); BridgeCharacter.init(tx, ty); BridgeCharacter.setFacing('up');
    });
    aboard = { id: id, ship: m.ship, at: performance.now() };
    BridgeCharacter.setHidden(true);
    BridgeWorld.setMode({
      solo: true,
      focus: function () { return { x: w.cur.x - 0.5, y: w.cur.y - 1.2 }; },
      end: function () { BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false); aboard = null; },
      update: function (dt) {
        if (wait > 0) { wait -= dt; if (wait <= 0) { aboard = null; BridgeCharacter.setHidden(false); sfx('step'); w.pose(I); } return; }
        if (w.step(dt)) w.pose(I);
      }
    });
  }
  function mooredItems(world, offX, offY, ts, now) {
    if (running || typeof BridgeWorld === 'undefined') return [];
    var id = BridgeWorld.getWorldId();
    if (!knows(id)) return [];
    var I = moorFor(id);
    if (!I || !sheetImg) return [];
    return fleetHere(I).map(function (m) {
      // sorted by her inner side, so you walking on her deck are drawn over her
      return { footRow: m.r - (m.spec.beam || 1) / 2, draw: function (c) { drawMooredOn(c, I, m, offX, offY, now); } };
    });
  }
  function drawMooredOn(c, I, m, offX, offY, now) {
    var keep = [bctx, cam, wind, A, B, mid, dir];
    var on = !!(aboard && aboard.at && aboard.id === I.id && aboard.ship === m.ship), k = on ? (now - aboard.at) / 1000 : 0;
    m.heel = Math.sin(now / 1300 + m.x) * 0.035 / Math.sqrt(m.spec.L / 2.6) + (on ? Math.sin(k * 9) * 0.12 * Math.exp(-k * 2.5) * 2.6 / m.spec.L : 0);   // riding the swell
    m.empty = !on;
    bctx = c; cam = { x: -offX, y: -offY }; wind = { now: I.moorH + 2.2, s: 0.4 }; A = I; B = null; mid = null; dir = null;
    try { drawBoat(now, m); moorLines(m, m.inner || I.dock, 1); }
    finally { bctx = keep[0]; cam = keep[1]; wind = keep[2]; A = keep[3]; B = keep[4]; mid = keep[5]; dir = keep[6]; }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('lumar', { items: mooredItems });

  return {
    start: start, stop: stop, knows: knows, board: board, _disembark: disembark,
    isRunning: function () { return running; },
    covers: function () { return running && phase !== 'load'; },
    _boat: function () { return boat; }, _phase: function () { return phase; }, _wind: function () { return wind; }, _isles: function () { return [A, B]; },
    setCourse: setCourse, canSetCourse: canSetCourse, chartPos: chartPos, course: function () { return running && B ? B.id : null; },
    _things: function () { return things; }, _commit: commit, _moored: function () { return moored; }, _route: function () { return [route, leg]; }, _whale: function () { return whale; }
  };
})();
