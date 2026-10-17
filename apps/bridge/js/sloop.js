/**
 * BridgeSloop — sail yourself from one Lumar island to the next, in a small boat, at the world's own scale.
 *
 * You cast off from the island's quay in the sloop (a Blender sheet, js/../assets/scenes/sloop: the hull at 32
 * headings) onto one sea laid out like the chart: every island at its true place (its own scene render at full size,
 * with its own water, BridgeSea.drawWaterAt, coming up over the horizon as you near it), the water the colour of
 * whichever of the five spore seas you're in, with a seam of foam where they meet. Sail anywhere; arrive anywhere.
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
  var SEATCAM = [0, 0];                           // tiles: the island camera's centre vs the disembark focus (measured)
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
    if (H.loading) { H.loading.push(cb); return; }               // (asked for again while she loads: told when she's in)
    H.loading = [cb];
    function fin() { var q = H.loading || []; H.loading = null; q.forEach(function (f) { f(); }); }
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
        fin();
      }
      full.onload = done; shore.onload = done;
      full.onerror = shore.onerror = function () { H.failed = true; fin(); };
      var ext = '.' + (meta.ext || 'png');
      full.src = base + 'full' + ext + q; shore.src = base + 'shore' + ext + q;
    }).catch(function () { H.failed = true; fin(); });
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
  // ---- one sea, the chart's ----------------------------------------------------------------------------------------
  // The chart (BridgeVoyage._isles: x, y in 0..1, what js/chart.js inks) is the geography. The water is the chart at a
  // fixed scale - K tiles to a chart unit across, KY down (the chart's own 0.72 aspect) - laid out from the island you
  // cast off from, so every island lies at its true place: whichever are near you come up over the horizon (loaded
  // and placed at their real offsets), steer the wrong way and you miss them, keep on the right way and you arrive,
  // charted or not.
  var K = 720, KY = K * 0.72;                           // (600 till Beck asked for seas a little larger: a fifth more)
  var LOAD_R = 60, DROP_R = 110;                        // islands come up inside this many tiles of their land, go past this
  var EDGE = [0.03, 0.04, 0.97, 0.96];                  // the edge of the known seas (chart): the swell sets you back
  // each island's land and shallows round its map's centre, tiles [x0, x1, r0, r1] (measured from the renders'
  // shore.png): to steer round it and keep what's adrift off its coast before it's loaded
  var EXT = {
    'lumar': [-15.7, 16.1, -19.7, 7.1], 'lumar-crown': [-31.3, 32.4, -25.0, 17.5], 'lumar-tern': [-19.2, 19.3, -12.7, 9.5],
    'lumar-holm': [-20.8, 20.5, -14.5, 9.3], 'lumar-sapphire': [-28.2, 29.0, -14.5, 13.5], 'lumar-rose': [-27.9, 27.7, -18.4, 21.0],
    'lumar-crimson': [-26.4, 27.1, -19.2, 18.3], 'lumar-midnight': [-24.8, 24.3, -17.6, 18.1]
  };
  var LINES = [                                         // what the fisherman says when you hail him
    "Wind's been backing all evening. Ease her out past the reef or she'll stall on you.",
    'They say the spore whales sing under Midnight when the sea goes still. Never heard it myself. Never not listened.',
    "Old Tamsin's lamp has been talking to Midnight again. Three long, one short. Nobody answers. Nobody ever has.",
    "Pulled up a bell once, off the Teeth. Green with age. It rang on the deck with no one near it. Threw it back.",
    'Fish are deep tonight. Something big moving under them, I reckon. Mind your rudder.',
    "My da said there's a sea past the five — a sixth colour, the one the old charts leave blank. Said it like he'd seen it.",
    "Silverfin running off Sapphire. If you've a line aboard, now's the time.",
    'Keep the red buoy to port coming home. Forgot it once. Spent the night on a rock with the crabs.',
    "There's a serpent in the Midnight Sea, pale as a drowned man. It circles you first. When it rears, you crack on sail and pray.",
    'Eels that glow, out past the mist. They latch on and chew. Fast is the only thing they hate.',
    "My cousin swears something with one great yellow eye took his anchor chain off Midnight. Took the anchor too. Took his nerve."
  ];

  var running = false, canvas = null, ctx = null, buf = null, bctx = null, raf = 0, last = 0, began = 0;
  var Z = 2, W = 480, H = 300, dpr = 1;
  var from = null, to = null, A = null, B = null;
  // the islands up over the horizon (loaded, at their true places), the course (B once it's loaded), the island you're
  // coming alongside, where on the chart the island you left lies (the frame's origin), and which passage this is
  var isl = {}, islLoading = {}, course = null, dockAt = null, pa = null, voyN = 0, palOverride = null;
  var boat = null, wind = null, cam = null, keys = {}, phase = 'load', phaseAt = 0;
  var wake = [], spray = [], gulls = [], fish = [], things = [], whale = null;
  var msg = null, msgAt = 0, prompt = null, menu = null, sheetImg = null, readyCount = 0, hold = 0;
  var seaWas = null, lastLuff = 0, lastBell = 0, auto = true, route = [], leg = 0, ironsT = 0;
  // the sail trims itself (the easy way, and the default); T to trim by hand, remembered
  function autoPref(set) {
    try { if (set != null) localStorage.setItem('bridge_sail_hand', set ? '0' : '1'); return localStorage.getItem('bridge_sail_hand') !== '1'; } catch (e) { return true; }
  }
  var traffic = [], wisps = [], storm = null, told = {}, aim = null, hinted = false, said = {}, castOut = null;
  var cells = {}, gotKeys = {}, cellsAt = 0, replanAt = 0, courseSailed = 0, openT = 0, troubleAt = 0, edgeTold = false, seaSeen = { at: 0, pal: null };
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
      var ext = '.' + (meta.ext || 'png');
      full.src = SHEET + 'full' + ext + q; shore.src = SHEET + 'shore' + ext + q;
    }).catch(function () { cb(new Error('sheet')); });
  }
  // a cell of the sheet: [sx, sy] of its top-left (4 × 4 tiles), the thing's centre at (64, 83) in it
  function cell(row, col) { return [col * 128, Math.round((sheetMeta ? sheetMeta.originY : 19.2) + row * 128)]; }
  var STATIC = { rock_a: 0, rock_b: 1, rock_c: 2, reef: 3, buoy_red: 4, buoy_green: 5, crate: 6, barrel: 7 };

  // ---- the islands: their renders, water and land at full size ---------------------------------------------------
  // own: an island out at sea, its render loaded here (one light state, no depth) rather than through BridgeScene, whose
  // few cached scenes are the worlds you walk in - the passage keeps only the islands near it and lets the rest go
  function loadIsland(id, cb, own) {
    var I = { id: id, pal: isles()[id].pal, name: isles()[id].name, ox: 0, oy: 0 };
    var n = own ? 2 : 3;
    function done() { if (--n === 0) { measure(I); cb(I); } }
    fetch('/bridge/assets/worlds/' + id + '.json?v=' + Date.now()).then(function (r) { return r.json(); })
      .then(function (w) { I.world = w; done(); }).catch(function () { I.world = null; done(); });
    if (!own) BridgeScene.load(id, function (sc) { I.sc = sc; done(); });
    fetch('/bridge/assets/scenes/' + id + '/scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (meta) {
      if (own === true) {
        var q = '?v=' + (meta.rev || ''), x = '.' + (meta.ext || 'png'), st = meta.states[0], pic = new Image(), imgs = {};
        var cy = meta.cycle, more = cy ? [cy.day, cy.dusk].filter(function (x) { return x && x !== st; }) : [];
        n++;
        I.sc = { id: id, meta: meta, imgs: imgs, baseImgs: imgs, q: q, ext: x, own: true };
        pic.onload = function () { imgs[st] = pic; done(); };
        pic.onerror = function () { I.sc = null; done(); };
        pic.src = '/bridge/assets/scenes/' + id + '/' + st + x + q;
        more.forEach(function (name) {                    // the island by day and at dusk (js/scene.js blends them)
          n++;
          var p2 = new Image();
          p2.onload = function () { imgs[name] = p2; done(); };
          p2.onerror = function () { done(); };
          p2.src = '/bridge/assets/scenes/' + id + '/' + name + x + q;
        });
      }
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0);
        var p = x.getImageData(0, 0, im.width, im.height).data, m = new Uint8Array(im.width * im.height);
        // the island's own water fades into whatever sea is round it toward its render's edge (an island near another
        // sea - Tern Holm by the Midnight Sea - otherwise ends in a square of its own colour): opaque over land and the
        // shallows, deep water going to nothing over the last FEATHER px of the render
        var FEATHER = 192, fd = x.createImageData(im.width, im.height), fa = fd.data, IW = im.width, IH = im.height;
        // 0 open water, 1 land (or anything standing out of it), 2 shallows the keel would touch
        for (var i = 0; i < m.length; i++) {
          var g = p[i * 4 + 1], empty = p[i * 4 + 2] > 127;
          m[i] = empty ? 0 : g === 0 ? 1 : g < 46 ? 2 : 0;
          var px0 = i % IW, py0 = (i - px0) / IW, e = Math.min(px0, py0, IW - 1 - px0, IH - 1 - py0) / FEATHER;
          var keep = g === 0 && !empty ? 1 : Math.max(Math.min(1, e), Math.min(1, Math.max(0, (200 - g) / 90)));
          fa[i * 4 + 3] = Math.round(255 * keep * keep * (3 - 2 * keep));
        }
        x.putImageData(fd, 0, 0);
        I.feather = c;
        I.mask = m; I.mw = im.width; I.mh = im.height; I.meta = meta;
        done();
      };
      im.onerror = function () { I.mask = null; I.meta = meta; done(); };
      im.src = '/bridge/assets/scenes/' + id + '/shore.' + (meta.ext || 'png') + '?v=' + meta.rev;
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
  function groundAt(x, r) {                     // over every island up over the horizon
    var g = 0;
    for (var id in isl) {
      var I = isl[id], bx = I.box;
      if (bx && (x < bx[0] || r < bx[1] || x > bx[2] || r > bx[3])) continue;
      var v = ground(I, x, r);
      if (v === 1) return 1;
      if (v > g) g = v;
    }
    return g;
  }
  // inside an island's own patch of sea (its render, and a margin): other boats keep out of the harbours
  function inHarbour(I, x, r, m) { return !!I && x > I.ox - m && r > I.oy - m && x < I.ox + I.w + m && r < I.oy + I.h + m; }
  function offshore(x, r) {
    for (var id in isl) if (inHarbour(isl[id], x, r, 3)) return false;
    return !groundAt(x, r);
  }
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
    I.buoys = [];
    [[-1, 'buoy_red'], [1, 'buoy_green']].forEach(function (b) {
      var x = e[0] - inr * 2.8 * b[0], r = e[1] + inx * 2.8 * b[0];
      if (!groundAt(x, r) && clear(I, x, r, 0.6)) I.buoys.push({ kind: b[1], x: x, r: r, rad: 0.35, seed: I.id.length * 7 + b[0], pal: I.pal, key: I.id + ':' + b[1] });
    });
  }
  function homeGulls(I) {
    var g0 = gulls.length;
    for (var g = g0; g < g0 + 3; g++) {
      gulls.push({ home: I, x: I.dock[0] + I.ox, r: I.dock[1] + I.oy, z: 2 + hash(g) * 1.5,
                   a: hash(g + 3) * 6.28, rad: 3 + hash(g + 5) * 5, sp: 0.5 + hash(g + 7) * 0.4, follow: false });
    }
  }

  // ---- where things are: the chart, your water, and the fixed frame what's out there is seeded in --------------------
  function toChart(x, r) { return { x: pa.x + (x - A.cx) / K, y: pa.y + (r - A.cy) / KY }; }
  function toWorld(cx, cy) { return { x: A.cx + (cx - pa.x) * K, r: A.cy + (cy - pa.y) * KY }; }
  function centreOf(id) { var p = isles()[id]; return toWorld(p.x, p.y); }       // an island's map centre on your water
  function absOf(x, r) { return [x - A.cx + pa.x * K, r - A.cy + pa.y * KY]; }   // your water → the chart's own frame (tiles)
  function fromAbs(X, Y) { return [X + A.cx - pa.x * K, Y + A.cy - pa.y * KY]; }
  // an island's land as an ellipse on your water (from EXT: the same for everyone, loaded or not)
  var shapes = {};
  function shapeOf(id) {
    if (shapes[id]) return shapes[id];
    var c = centreOf(id), e = EXT[id] || [-25, 25, -20, 20];
    return (shapes[id] = { x: c.x + (e[0] + e[1]) / 2, r: c.r + (e[2] + e[3]) / 2, a: (e[1] - e[0]) / 2, b: (e[3] - e[2]) / 2 });
  }
  function ellipseK(sh, x, r, m) { var dx = (x - sh.x) / (sh.a + m), dr = (r - sh.r) / (sh.b + m); return Math.sqrt(dx * dx + dr * dr); }   // < 1: inside it, grown by m
  function charted(id) { return typeof BridgeChart === 'undefined' || BridgeChart.known(id); }

  // ---- the islands round you: loaded as they come up over the horizon, each at its true place ------------------------
  function ensureIslands() {
    var P = isles(), n = voyN;
    Object.keys(P).forEach(function (id) {
      var far = ellipseK(shapeOf(id), boat.x, boat.r, DROP_R) > 1;
      if (isl[id]) {                                                   // gone astern over the horizon: let it go
        if (far && id !== A.id && isl[id] !== dockAt) {
          delete isl[id];
          if (B && B.id === id) B = null;
          gulls = gulls.filter(function (g) { return !g.home || g.home.id !== id; });
          if (typeof BridgeSea !== 'undefined' && BridgeSea.forget && (typeof BridgeWorld === 'undefined' || BridgeWorld.getWorldId() !== id)) BridgeSea.forget(id);
          cellsAt = 0;
        }
        return;
      }
      if (islLoading[id] || ellipseK(shapeOf(id), boat.x, boat.r, LOAD_R) > 1) return;
      islLoading[id] = true;
      loadIsland(id, function (J) {
        if (n !== voyN || !running) return;
        delete islLoading[id];
        if (!J.sc || !J.mask) { islLoading[id] = 'failed'; return; }    // (not tried again this passage)
        if (!isl[id] && ellipseK(shapeOf(id), boat.x, boat.r, DROP_R) < 1) place(J);
      }, true);
    });
  }
  // an island laid on your water: its berth and harbour channel, the rest of your ships there, its buoys and gulls
  function place(I) {
    moorOf(I);                                       // in its own tiles
    var act = !captainOf && typeof BridgeFleet !== 'undefined' ? BridgeFleet.active().ship : null;
    var fl = fleetAt(I, act), mine = fl.filter(function (e) { return e.ship.id === shipId; })[0] || fl[0];
    var c = centreOf(I.id), ox = I === A ? 0 : Math.round(c.x - I.cx), oy = I === A ? 0 : Math.round(c.r - I.cy);
    function sh(p) { return [p[0] + ox, p[1] + oy]; }
    I.ox = ox; I.oy = oy;
    I.pier = sh(I.moor); I.moor = sh([mine.x, mine.r]); I.moorH = mine.h; I.inner = mine.inner && sh(mine.inner);
    I.fleet = fl.filter(function (e) { return e !== mine; }).map(function (e) { return lying(e, ox, oy); });
    I.berth = sh(I.berth); I.chan = I.chan.map(sh); I.exit = I.chan[I.chan.length - 1];
    var m = I.meta;
    I.box = [ox - m.originX / TS, oy - m.originY / TS, ox + (m.width - m.originX) / TS, oy + (m.height - m.originY) / TS];
    I.uncharted = I !== A && !charted(I.id);
    isl[I.id] = I;
    buoys(I);
    homeGulls(I);
    cellsAt = 0;                                     // what's adrift comes up again, minus anything on its shore
    if (I.id === course) { B = I; replan(); }          // now its harbour's known: in by its channel
    else if (raceOn() && I.id === (race.spec.finish || A.id)) replan();       // a race's line comes up with its island
  }

  // ---- a course: the gold mark leads out of the harbour you're in, round anything in the way, in to her berth -------------
  function commit(id, quiet) {
    if (!running || !isles()[id]) return false;
    course = id; to = id; aim = null; B = isl[id] || null; courseSailed = 0;
    if (!quiet) say('You set a course for ' + isles()[id].name + '.', 3200);
    replan();
    if (crewOf && net()) net().send('course', { id: id }, crewOf.id);
    return true;
  }
  // does p-q pass inside the ellipse sh grown by m? → the nearest point of it to the middle (in the ellipse's own units)
  function hits(p, q, sh, m) {
    var ax = (p[0] - sh.x) / (sh.a + m), ar = (p[1] - sh.r) / (sh.b + m), bx = (q[0] - sh.x) / (sh.a + m), br = (q[1] - sh.r) / (sh.b + m);
    var dx = bx - ax, dr = br - ar, L = dx * dx + dr * dr, t = L ? clamp(-(ax * dx + ar * dr) / L, 0, 1) : 0;
    var cx = ax + dx * t, cr = ar + dr * t;
    return Math.hypot(cx, cr) < 1 ? { c: [cx, cr], t: t } : null;
  }
  // a straight run from p to q, bent round each island in the way (its nearer side, well clear)
  function detour(p, q, depth) {
    if (depth > 4) return [q];
    var best = null;
    Object.keys(isles()).forEach(function (id) {
      var sh = shapeOf(id), m = 6;
      if (ellipseK(sh, p[0], p[1], m) < 1 || ellipseK(sh, q[0], q[1], m) < 1) m = 1;          // leaving it or arriving: just its land
      if (ellipseK(sh, p[0], p[1], m) < 1 || ellipseK(sh, q[0], q[1], m) < 1) return;
      var h = hits(p, q, sh, m);
      if (h && (!best || h.t < best.t)) best = { sh: sh, m: m, c: h.c, t: h.t };
    });
    if (!best) return [q];
    var n = Math.hypot(best.c[0], best.c[1]), ux = best.c[0], ur = best.c[1];
    if (n < 0.05) { ux = -(q[1] - p[1]); ur = q[0] - p[0]; n = Math.hypot(ux, ur) || 1; }       // straight through the middle: go either side
    var w = [best.sh.x + ux / n * (best.sh.a + best.m) * 1.3, best.sh.r + ur / n * (best.sh.b + best.m) * 1.3];
    return detour(p, w, depth + 1).concat(detour(w, q, depth + 1));
  }
  function replan() {
    if (raceOn() && boat) { raceRoute(); return; }
    if (!course || !boat) { route = []; leg = 0; return; }
    var pts = [], p0 = [boat.x, boat.r], inI = null;
    for (var id in isl) if (id !== course && isl[id].chan && inHarbour(isl[id], boat.x, boat.r, 0)) inI = isl[id];
    if (inI) {                                       // still in a harbour: out by its channel, from the mark nearest you
      var ch = [inI.berth].concat(inI.chan.slice(1)), k0 = 0, kd = 1e9;
      ch.forEach(function (p, i) { var d = Math.hypot(p[0] - boat.x, p[1] - boat.r); if (d < kd) { kd = d; k0 = i; } });
      pts = ch.slice(k0).map(function (p) { return p.slice(); });
      p0 = inI.exit;
    }
    var c = centreOf(course), goal = B ? B.exit : [c.x, c.r];
    if (B && inHarbour(B, boat.x, boat.r, 2)) {                // already in her harbour: on in by its channel from where you are
      var inn = B.chan.slice().reverse().concat([B.moor.slice()]), j0 = 0, jd = 1e9;
      inn.forEach(function (p, i) { var d = Math.hypot(p[0] - boat.x, p[1] - boat.r); if (d < jd) { jd = d; j0 = i; } });
      route = inn.slice(j0).map(function (p) { return p.slice(); }); leg = 0;
      while (leg < route.length - 1 && Math.hypot(boat.x - route[leg][0], boat.r - route[leg][1]) < 3.5) leg++;
      return;
    }
    pts = pts.concat(detour(p0, goal, 0));
    if (B) pts = pts.concat(B.chan.slice(0, -1).reverse(), [B.moor.slice()]);
    route = pts; leg = 0;
    while (leg < route.length - 1 && Math.hypot(boat.x - route[leg][0], boat.r - route[leg][1]) < 3.5) leg++;
  }
  // how far you are off the leg you're on (from the last mark to the next), to know when you've strayed from it
  function offCourse() {
    var q = route[leg];
    if (!q) return 0;
    var p = leg > 0 ? route[leg - 1] : q, dx = q[0] - p[0], dr = q[1] - p[1], L = dx * dx + dr * dr;
    var t = L ? clamp(((boat.x - p[0]) * dx + (boat.r - p[1]) * dr) / L, 0, 1) : 0;
    return Math.hypot(boat.x - (p[0] + dx * t), boat.r - (p[1] + dr * t));
  }
  function togo() {                                  // how far still to sail along the course
    var L = 0, p = [boat.x, boat.r];
    for (var i = leg; i < route.length; i++) { L += Math.hypot(route[i][0] - p[0], route[i][1] - p[1]); p = route[i]; }
    return L;
  }

  // ---- a race (js/race.js): a gun, marks to round in order, a line to cross, the clock, the others ---------------------
  // spec: { id, name, marks: [{ isle, side, off } | [cx, cy] on the chart], finish: an island (its harbour mouth is the line;
  // none: back to the one you left), at: the gun (a Date.now() time, the same for everyone in it) or none till js/race.js
  // fires it (raceGun), hold: lie still where you are till the gun (a race off the pier), lane: your place off the pier
  // (0, 1, 2…), npcs: [{ name, cloth, v }] the other boats in it, sailed along the course at their own pace from the line,
  // onReady() (cast off and waiting), onGun(), onMark(i, n), onFinish(ms, place, field), onQuit(why) }.
  var race = null, pendingRace = null;
  function raceOn() { return !!race && !race.done; }
  function raceSetUp(spec) {
    race = { spec: spec, marks: (spec.marks || []).map(markAt), next: 0, gun: false, t0: 0, done: false, ready: false, said: -1, npcs: [] };
    course = to = spec.finish || A.id; B = isl[course] || null; aim = null; courseSailed = 0;
    troubleAt = 1e9;                                                  // no pirates in a race: they've all come to watch
    if (spec.npcs && spec.npcs.length) raceFleet();
    raceRoute();
  }
  // a mark: off an island's far side, its land well clear (`off` tiles), or a point on the chart
  function markAt(m) {
    if (Array.isArray(m)) { var w = toWorld(m[0], m[1]); return [w.x, w.r]; }
    var sh = shapeOf(m.isle), off = m.off || 14, d = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[m.side] || [0, 1];
    return [sh.x + d[0] * (sh.a + off), sh.r + d[1] * (sh.b + off)];
  }
  // the line: the finishing island's harbour mouth (its middle, till it comes up over the horizon)
  function finishPt() {
    var f = race.spec.finish || A.id, I = isl[f];
    if (I && I.exit) return I.exit;
    var c = centreOf(f);
    return [c.x, c.r];
  }
  // the gold mark in a race: out of the harbour, round each mark still to round, to the line
  function raceRoute() {
    var pts = [], p0 = [boat.x, boat.r];
    if (!race.next && inHarbour(A, boat.x, boat.r, 0)) {
      var ch = [A.berth].concat(A.chan.slice(1)), k0 = 0, kd = 1e9;
      ch.forEach(function (p, i) { var d = Math.hypot(p[0] - boat.x, p[1] - boat.r); if (d < kd) { kd = d; k0 = i; } });
      pts = ch.slice(k0).map(function (p) { return p.slice(); });
      p0 = A.exit;
    }
    for (var i = race.next; i < race.marks.length; i++) { pts = pts.concat(detour(p0, race.marks[i], 0)); p0 = race.marks[i]; }
    route = pts.concat(detour(p0, finishPt(), 0)); leg = 0;
    while (leg < route.length - 1 && Math.hypot(boat.x - route[leg][0], boat.r - route[leg][1]) < 3.5) leg++;
  }
  // the other boats in it: lined up across the harbour mouth, each sailing the course at her own pace from the gun - where she
  // is comes from the clock alone, so everyone racing sees the same boats in the same places, and her time is known
  function raceFleet() {
    var M = race.marks, start = A.exit, first = M[0] || finishPt(), dir = unit(first[0] - start[0], first[1] - start[1]), perp = [-dir[1], dir[0]];
    race.npcs = race.spec.npcs.map(function (n, i) {
      var k = Math.ceil(i / 2) * 3.4 * (i % 2 ? 1 : -1), back = 2 + (i % 2) * 1.4;           // across the mouth, every other one a length back
      var p = [start[0] + perp[0] * k - dir[0] * back, start[1] + perp[1] * k - dir[1] * back];
      if (groundAt(p[0], p[1])) p = [start[0] - dir[0] * (2 + i * 2.4), start[1] - dir[1] * (2 + i * 2.4)];
      var pts = [p], q = p;
      M.forEach(function (m) { pts = pts.concat(detour(q, m, 0)); q = m; });
      pts = pts.concat(detour(q, finishPt(), 0));
      // each leg at her pace for its angle to the wind (a reach her best, a beat in tacks: what she makes good up it)
      var len = 0, T = 0, cum = [0], ct = [0];
      for (var j = 1; j < pts.length; j++) {
        var L = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]), off = Math.abs(wrap(wind.from - Math.atan2(pts[j][1] - pts[j - 1][1], pts[j][0] - pts[j - 1][0])));
        var f = off >= 1.1 ? polar(off, SLOOP) : polar(1.1, SLOOP) * Math.cos(1.1 - off);
        len += L; T += L / (n.v * Math.max(0.2, f)); cum.push(len); ct.push(T);
      }
      return { name: n.name, cloth: n.cloth || CLOTH[i % CLOTH.length], v: n.v, pts: pts, len: len, cum: cum, ct: ct, time: T * 1000, x: p[0], r: p[1],
               h: Math.atan2(dir[1], dir[0]), sheet: 0.9, boom: 0.8, side: 1, heel: 0.08, rudder: 0, bump: 0, hoist: 0.2, eff: 1, off: 1.6,
               luff: false, crew: true, seed: (i * 31 + 7) % 97, racer: true };
    });
  }
  // a racing boat's place along her course, s tiles in (tacking up any leg that's into the wind)
  function npcAlong(o, s) {
    var P = o.pts, i = 0, acc = 0;
    while (i < P.length - 2 && acc + Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) < s) { acc += Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); i++; }
    var a = P[i], b = P[i + 1] || a, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, f = clamp((s - acc) / L, 0, 1);
    var hl = Math.atan2(b[1] - a[1], b[0] - a[0]), x = a[0] + (b[0] - a[0]) * f, r = a[1] + (b[1] - a[1]) * f, h = hl;
    if (Math.abs(wrap(wind.now - hl)) < 0.8 && f > 0.04 && f < 0.96) {           // close-hauled: she beats up it in tacks
      var ph = s / 6.5, amp = 3.2 * Math.min(1, Math.min(f, 1 - f) * L / 8);
      x += -Math.sin(hl) * Math.sin(ph) * amp; r += Math.cos(hl) * Math.sin(ph) * amp;
      h = hl + Math.atan(Math.cos(ph) * amp / 6.5);
    }
    return { x: x, r: r, h: h };
  }
  function npcsTick(dt, now) {
    if (!race || !race.npcs.length) return;
    var tau = race.gun ? (now - race.t0) / 1000 : 0, b = boat;
    race.npcs.forEach(function (o) {
      var j = 1;                                                       // how far along she's come by now, leg by leg
      while (j < o.ct.length - 1 && o.ct[j] < tau) j++;
      var s = Math.min(o.len, o.cum[j - 1] + (o.cum[j] - o.cum[j - 1]) * clamp((tau - o.ct[j - 1]) / Math.max(1e-3, o.ct[j] - o.ct[j - 1]), 0, 1));
      var p = npcAlong(o, s), done = s >= o.len;
      var d = Math.hypot(p.x - b.x, p.r - b.r);
      if (d < 3.4) { p.x += (p.x - b.x) / (d || 1) * (3.4 - d); p.r += (p.r - b.r) / (d || 1) * (3.4 - d); }   // they keep clear of you
      o.x = p.x; o.r = p.r; o.h = wrap(o.h + wrap(p.h - o.h) * Math.min(1, dt * 3));
      o.left = o.len - s; o.done = done;
      var hoist = race.gun && !done ? 1 : 0.2;
      o.hoist += (hoist - o.hoist) * Math.min(1, dt * 1.5);
      var rel = wrap(wind.now - o.h); o.side = rel > 0 ? -1 : 1; o.boom = clamp(Math.abs(rel) - 0.5, 0.15, 1.2);
      o.heel = race.gun && !done ? 0.14 : 0.04;
    });
  }
  // who's ahead: everyone in it by how far they've still to go (finished: by their time)
  function raceField() {
    var me = { name: 'You', me: true, ms: race.done ? race.ms : null, left: race.done ? 0 : togo() };
    var f = [me];
    race.npcs.forEach(function (o) { f.push({ name: o.name, ms: o.done ? o.time : null, left: o.left, at: o.time }); });
    Object.keys(seaPeers).forEach(function (id) {
      var o = seaPeers[id];
      if (o.rs === race.spec.id) f.push({ name: cap(o.name || 'Someone'), ms: o.rf || null, left: o.rf ? 0 : (o.rg == null ? 1e9 : o.rg), pilot: id });
    });
    return f;
  }
  function racePlace() {
    var f = raceField(), me = f[0];
    if (race.done) return 1 + f.filter(function (o) { return !o.me && (o.ms != null ? o.ms < me.ms : o.at != null && o.at < me.ms); }).length;
    return 1 + f.filter(function (o) { return !o.me && (o.ms != null || o.left < me.left); }).length;
  }
  function raceTick(now) {
    var sp = race.spec, b = boat;
    if (!race.ready && phase === 'sail') { race.ready = true; if (sp.onReady) sp.onReady(); }
    if (!race.gun) {
      if (!sp.at) return;
      var left = sp.at - Date.now();
      if (left <= 3000 && left > 0 && race.said !== Math.ceil(left / 1000)) { race.said = Math.ceil(left / 1000); say(String(race.said), 900); sfx('blip'); }
      if (left > 0) return;
      race.gun = true; race.t0 = now + left;                        // the gun went when the clock said, wherever you were
      say(sp.hold ? 'GO! The gun - and you\'re off' : 'The gun! They\'re off - round ' + (race.marks.length ? 'the marks' : 'to the line'), 2400);
      sfx('cannon');
      if (sp.onGun) sp.onGun();
      return;
    }
    if (race.done) return;
    var m = race.marks[race.next];
    if (m) {
      if (Math.hypot(b.x - m[0], b.r - m[1]) < 5) {
        race.next++; sfx('bell');
        say(race.next < race.marks.length ? 'Mark ' + race.next + ' rounded - on to the next' : 'The last mark! Now for the line', 2000);
        if (sp.onMark) sp.onMark(race.next, race.marks.length);
        raceRoute();
      }
      return;
    }
    var fp = finishPt();
    if (Math.hypot(b.x - fp[0], b.r - fp[1]) < 6 && isl[sp.finish || A.id]) {
      race.done = true; race.ms = now - race.t0;
      var place = racePlace(), field = raceField();
      race.place = place;
      say('Across the line! ' + fmtMs(race.ms) + ' - ' + nth(place) + (field.length > 1 ? ' of ' + field.length : ''), 4200);
      sfx('quest');
      commit(sp.finish || A.id, true);                                // and on in to her berth
      if (sp.onFinish) sp.onFinish(race.ms, place, field);
    }
  }
  function raceQuit(why) {
    if (!race) return;
    var sp = race.spec, was = raceOn();
    race = null;
    if (was && sp.onQuit) sp.onQuit(why);
  }
  function fmtMs(ms) { var t = ms / 1000, m = Math.floor(t / 60), x = t - m * 60; return m + ':' + (x < 10 ? '0' : '') + x.toFixed(1); }
  function nth(n) { return n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'); }
  // a race mark on the water: an orange buoy with a white band and a numbered flag; the next one ringed on the water
  function drawMark(p, i, now) {
    var X = sx(p[0]), Y = sy(p[1]), bob = Math.round(Math.sin(now / 520 + i * 1.7));
    var next = race.gun && i === race.next, done = i < race.next;
    if (next) {
      var k = (now % 1600) / 1600, rx = Math.round(10 + k * 22), ry = Math.round(rx * C45);
      bctx.strokeStyle = 'rgba(255,208,96,' + (0.6 * (1 - k)).toFixed(2) + ')'; bctx.lineWidth = 1;
      bctx.beginPath(); bctx.ellipse(X + 0.5, Y + 0.5, rx, ry, 0, 0, Math.PI * 2); bctx.stroke();
    }
    var dark = '#1a1010', body = done ? '#8a6a5a' : '#e8682a', lit = done ? '#a88a7a' : '#ff9a4a', band = done ? '#b8b0a8' : '#f2ecd6';
    bctx.fillStyle = 'rgba(0,0,0,0.25)'; bctx.fillRect(X - 6, Y + 1, 12, 2);
    bctx.fillStyle = dark; bctx.fillRect(X - 5, Y - 8 + bob, 10, 9); bctx.fillRect(X - 4, Y - 9 + bob, 8, 11);
    bctx.fillStyle = body; bctx.fillRect(X - 4, Y - 8 + bob, 8, 8);
    bctx.fillStyle = lit; bctx.fillRect(X - 3, Y - 7 + bob, 3, 2);
    bctx.fillStyle = band; bctx.fillRect(X - 4, Y - 4 + bob, 8, 2);
    bctx.fillStyle = dark; bctx.fillRect(X, Y - 26 + bob, 1, 18);                                   // the pole
    var flap = Math.round(Math.sin(now / 170 + i)), fc = next ? '#ffd060' : done ? '#8a8a90' : '#e8682a';
    bctx.fillStyle = dark; bctx.fillRect(X + 1, Y - 26 + bob, 9, 7);
    bctx.fillStyle = fc; bctx.fillRect(X + 1, Y - 25 + bob, 8 + flap, 5);
    bctx.fillStyle = dark;                                                                          // its number, in pixels
    var n = i + 1, D = { 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'],
                         4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'] }[n];
    if (D) D.forEach(function (row, ry) { for (var cx = 0; cx < 3; cx++) if (row[cx] === '1') bctx.fillRect(X + 4 + cx, Y - 25 + bob + ry, 1, 1); });
  }
  // the line: a post with a chequered flag either side of the harbour mouth
  function drawLine(now) {
    var fp = finishPt(), I = isl[race.spec.finish || A.id];
    if (!I || !I.chan || I.chan.length < 2) return;
    var a = I.chan[I.chan.length - 2], d = unit(fp[0] - a[0], fp[1] - a[1]), pp = [-d[1], d[0]];
    [-1, 1].forEach(function (sd) {
      var X = sx(fp[0] + pp[0] * 4.2 * sd), Y = sy(fp[1] + pp[1] * 4.2 * sd), bob = Math.round(Math.sin(now / 600 + sd));
      bctx.fillStyle = 'rgba(0,0,0,0.25)'; bctx.fillRect(X - 3, Y + 1, 7, 2);
      bctx.fillStyle = '#1a1010'; bctx.fillRect(X - 1, Y - 24 + bob, 3, 25);
      bctx.fillStyle = '#f2ecd6'; bctx.fillRect(X, Y - 23 + bob, 1, 23);
      bctx.fillStyle = '#1a1010'; bctx.fillRect(X + 2, Y - 24 + bob, 9, 7);
      for (var q = 0; q < 4; q++) for (var w = 0; w < 2; w++) { bctx.fillStyle = (q + w) % 2 ? '#1a1010' : '#f2ecd6'; bctx.fillRect(X + 3 + q * 2, Y - 23 + bob + w * 3, 2, 3); }
    });
  }

  // ---- the island you leave from: its berth and channel, the wind, the gulls ---------------------------------------
  function layA(raceSeed) {
    route = [A.berth.slice()].concat(A.chan.slice(1)); leg = 0; B = null;     // the way out of the harbour, gold, till there's a course
    var out = unit(A.exit[0] - A.berth[0], A.exit[1] - A.berth[1]), course0 = Math.atan2(out[1], out[0]);
    // a race brings its own (everyone in it gets the same wind, whenever they cast off)
    var seed = raceSeed != null ? Math.abs(Math.round(raceSeed)) % 997 : (A.id.length * 31 + Math.floor(Date.now() / 3.6e6)) % 997;
    var side = hash(seed) < 0.5 ? -1 : 1;
    wind = { from: course0 + side * (1.35 + hash(seed + 1) * 0.95), base: BASE[A.pal] || 0.92, s: 1, gust: 0, gustAt: 0, seed: seed };
    things = []; traffic = []; wisps = []; gulls = []; cells = {}; gotKeys = {}; cellsAt = 0;
    openT = 0; troubleAt = 25 + hash(seed + 3) * 30; edgeTold = false;
    gulls.push({ home: null, x: A.berth[0], r: A.berth[1], z: 2.4, a: 1, rad: 3, sp: 0.7, follow: true });
    whale = { done: false, after: 35 + hash(seed + 5) * 55 };
    storm = { flash: 0, nextFlash: 0, squallAt: 0, thunderAt: 0 };
  }

  // ---- what's out on the water: seeded by where it lies, so it's the same every trip and for everyone aboard ------------
  // The sea is cut into CELLW-tile squares of the chart's own frame; each, as you come near, is filled from its own seed and
  // the sea it's in: rocks and now and then a reef, a fisherman at anchor, something adrift, sloops going about their
  // business on the seas people sail; the Midnight Sea's wrecks and lights. Nothing within a few tiles of any island.
  var CELLW = 34;
  function nearLand(X, Y, m) {                       // (fixed frame) within m tiles of any island's land, loaded or not
    var P = isles();
    for (var id in P) {
      var e = EXT[id] || [-25, 25, -20, 20], cx = P[id].x * K + (e[0] + e[1]) / 2, cr = P[id].y * KY + (e[2] + e[3]) / 2;
      var dx = (X - cx) / ((e[1] - e[0]) / 2 + m), dr = (Y - cr) / ((e[3] - e[2]) / 2 + m);
      if (dx * dx + dr * dr < 1) return true;
    }
    return false;
  }
  var CLOTH = [['#c89a50', '#a87a38', '#7a5a2a'], ['#b8503a', '#94402e', '#6a2c20'], ['#d6cfbf', '#b2ac9f', '#86828f'], ['#5a7aa0', '#46607e', '#34485e']];
  function genCell(i, j) {
    var seed = i * 1013 + j * 7919 + 4099, out = { things: [], sails: [], wisps: [] }, n = 0;
    function h(k) { return hash(seed * 0.7311 + k * 17.17); }
    function at(u, v) { return [(i + u) * CELLW, (j + v) * CELLW]; }
    var pal = seaAtChart((i + 0.5) * CELLW / K, (j + 0.5) * CELLW / KY);
    function put(kind, X, Y, extra) {
      if (nearLand(X, Y, 8)) return;
      var w = fromAbs(X, Y);
      if (groundAt(w[0], w[1])) return;
      var o = { kind: kind, x: w[0], r: w[1], seed: seed + n * 13, key: i + ',' + j + ':' + (n++), pal: pal };
      for (var k in extra) o[k] = extra[k];
      out.things.push(o);
    }
    var calm = CALM[pal], night = pal === 'midnight', red = pal === 'crimson';
    var nr = night ? 2 + Math.floor(h(1) * 4) : h(1) < (red ? 0.55 : 0.4) ? 1 + Math.floor(h(2) * 3) : 0, rc = at(0.15 + h(3) * 0.7, 0.15 + h(4) * 0.7);
    for (var q = 0; q < nr; q++) put(['rock_a', 'rock_b', 'rock_c'][q % 3], rc[0] + (h(30 + q) - 0.5) * 9, rc[1] + (h(40 + q) - 0.5) * 7, { rad: 0.5 + (q % 3) * 0.15 });
    if (h(5) < (red ? 0.2 : night ? 0.1 : 0.13)) {                   // a reef across the way, rocks either side
      var rf = at(0.2 + h(6) * 0.6, 0.2 + h(7) * 0.6);
      put('reef', rf[0], rf[1], { rad: 1.2 }); put('rock_b', rf[0] + 3.2, rf[1] + 0.8, { rad: 0.8 }); put('rock_a', rf[0] - 2.8, rf[1] - 0.6, { rad: 0.7 });
    }
    if (calm && h(8) < 0.11) {                                       // a fisherman at anchor (nobody fishes the dangerous seas)
      var dp = at(0.2 + h(9) * 0.6, 0.2 + h(10) * 0.6);
      if (!nearLand(dp[0], dp[1], 14)) put('dory', dp[0], dp[1], { rad: 0.9, h: h(11) * 6.28 });
    }
    if (h(12) < (night ? 0.18 : 0.33)) { var fp = at(0.1 + h(13) * 0.8, 0.1 + h(14) * 0.8); put(h(15) < 0.5 ? 'crate' : 'barrel', fp[0], fp[1], { rad: 0.4, flot: true }); }
    if (night && h(16) < 0.16) { var wp = at(0.25 + h(17) * 0.5, 0.25 + h(18) * 0.5); put('wreck', wp[0], wp[1], { rad: 1.3 }); }
    if (night && h(19) < 0.45) {                                     // lights that lead you onto the rocks
      for (var k2 = 0; k2 < 2 + Math.floor(h(20) * 3); k2++) {
        var lp = fromAbs((i + 0.2 + h(50 + k2) * 0.6) * CELLW, (j + 0.2 + h(60 + k2) * 0.6) * CELLW);
        out.wisps.push({ x: lp[0], r: lp[1], x0: lp[0], r0: lp[1], seed: seed + k2 * 7 });
      }
    }
    if (calm && h(21) < 0.3) {                                       // another sloop, going round her own long loop
      var R = 14 + h(22) * 18, sc = at(0.5, 0.5), v = 1.5 + h(24) * 1.2;
      if (!nearLand(sc[0], sc[1], R + 10)) {
        var w0 = fromAbs(sc[0], sc[1]);
        out.sails.push({ cx: w0[0], cr: w0[1], R: R, w: (h(23) < 0.5 ? -1 : 1) * v / R, a0: h(25) * 6.28, x: w0[0], r: w0[1], h: 0, v: v,
                         sheet: 0.9, boom: 0.8, side: 1, heel: 0.12, rudder: 0, bump: 0, hoist: 1, eff: 1, off: 1.6, luff: false,
                         cloth: CLOTH[Math.floor(h(26) * CLOTH.length)], crew: true, seed: seed % 97 });
      }
    }
    return out;
  }
  function updateCells(now) {
    if (now - cellsAt < 400) return;
    cellsAt = now;
    var P = absOf(boat.x, boat.r), ci = Math.floor(P[0] / CELLW), cj = Math.floor(P[1] / CELLW), keep = {};
    for (var di = -2; di <= 2; di++) for (var dj = -2; dj <= 2; dj++) {
      var key = (ci + di) + ',' + (cj + dj);
      keep[key] = 1;
      if (!cells[key]) cells[key] = genCell(ci + di, cj + dj);
    }
    for (var k in cells) if (!keep[k]) delete cells[k];
    var th = [], tr = [], wi = [];
    for (var id in isl) th = th.concat(isl[id].buoys || []);
    for (var k2 in cells) { th = th.concat(cells[k2].things); tr = tr.concat(cells[k2].sails); wi = wi.concat(cells[k2].wisps); }
    th.forEach(function (o) { if (gotKeys[o.key]) o.got = true; });
    things = th; traffic = tr; wisps = wi;
  }

  // ---- the seas: the chart's own regions, at full size -------------------------------------------------------------------
  // Mirrors js/chart.js seaAt (the nearest island's sea, its borders nudged by noise, in the chart's 400 × 264 buffer) so
  // the water you're on is the sea your mark is in on the chart. Near an island its own sea always wins - its render's
  // water is its own - and a little wobble at your own scale gives the seam its ragged edge.
  var CNW = 400, CNH = 264, CMX = 34, CMY = 30, CPX = (CNW - 2 * CMX) / K;
  function vn2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function hh(a, b) { return hash(a * 57 + b * 131); }
    return hh(xi, yi) * (1 - u) * (1 - v) + hh(xi + 1, yi) * u * (1 - v) + hh(xi, yi + 1) * (1 - u) * v + hh(xi + 1, yi + 1) * u * v;
  }
  // distance (chart px) from chart point (cx, cy) to each sea's nearest island; (x, r) on your water, for the islands' pull
  function seaDists(cx, cy, x, r, D) {
    var P = isles(), px = CMX + cx * (CNW - 2 * CMX), py = CMY + cy * (CNH - 2 * CMY);
    var wx = px + (vn2(px / 26, py / 26) - 0.5) * 34 + (vn2(px / 9 + 9, py / 9) - 0.5) * 9;
    var wy = py + (vn2(px / 26 + 31, py / 26 + 17) - 0.5) * 34 + (vn2(px / 9, py / 9 + 5) - 0.5) * 9;
    for (var id in P) {
      var I = P[id], dx = wx - (CMX + I.x * (CNW - 2 * CMX)), dy = (wy - (CMY + I.y * (CNH - 2 * CMY))) * 1.25, d = Math.sqrt(dx * dx + dy * dy) * (I.pal === 'midnight' ? 0.68 : 1);   // (the Midnight Sea reaches further: js/chart.js SEA_W)
      if (x != null) {
        var sh = shapeOf(id), out = (ellipseK(sh, x, r, 0) - 1) * (sh.a + sh.b) / 2;
        if (out < 16) d -= (16 - out) * CPX * 1.8;
      }
      if (D[I.pal] == null || d < D[I.pal]) D[I.pal] = d;
    }
    return D;
  }
  function nearest(D) { var best = null; for (var p in D) if (best === null || D[p] < D[best]) best = p; return best || 'emerald'; }
  function seaAtChart(cx, cy) { return nearest(seaDists(cx, cy, null, null, {})); }
  function seaField(x, r, D) {                       // the seas' distances at (x, r) on your water
    var wx = x + (vn2(x / 7, r / 7) - 0.5) * 3, wr = r + (vn2(x / 7 + 17, r / 7 + 5) - 0.5) * 3, c = toChart(wx, wr);
    return seaDists(c.x, c.y, x, r, D);
  }
  function seaAtWorld(x, r) { return nearest(seaField(x, r, {})); }
  var hereAt = null;
  function seaHere() {
    if (palOverride) return palOverride;
    if (!boat || !pa) return A ? A.pal : 'emerald';
    if (!hereAt || hereAt[0] !== boat.x || hereAt[1] !== boat.r) hereAt = [boat.x, boat.r, seaAtWorld(boat.x, boat.r)];
    return hereAt[2];
  }
  function palAt(x, r) { return palOverride || (pa ? seaAtWorld(x, r) : A.pal); }

  // ---- start and stop ---------------------------------------------------------------------------------------------
  var aboardStart = false, shipId = null, shipName = 'your sloop', blessing = false;
  // sailing together (js/multi.js): `crewOf` — a partner aboard your ship; `captainOf` — you're aboard theirs, and your
  // passage follows their boat (`mirror`, their helm ten times a second) instead of sailing itself
  var crewOf = null, captainOf = null, mirror = null, helmAt = 0, seaAt = 0, seaPeers = {};
  function mercy() { return blessing ? 0.5 : 1; }                  // a candle lit at St Brendan's (js/crown.js): half the harm
  function start(fromId, toId, opts) {
    var crewing = !!(opts && opts.crew);
    var plotted = !crewing && typeof BridgeChart !== 'undefined' ? BridgeChart.dest() : null;     // a course set on the chart ashore
    if (!toId && plotted && plotted !== fromId && knows(plotted)) toId = plotted;
    var rspec = crewing ? null : (opts && opts.race) || pendingRace;
    pendingRace = null;
    if (rspec) toId = null;                                           // a race sets its own course
    if (running || (!crewing && (!knows(fromId) || (toId && (!knows(toId) || fromId === toId))))) return false;
    aboardStart = !!(opts && opts.aboard); race = null;
    crewOf = opts && opts.crewWith || null; captainOf = opts && opts.crew || null; mirror = null; seaPeers = {};
    var act = typeof BridgeFleet !== 'undefined' ? BridgeFleet.active() : null;
    SP = act ? act.spec : SLOOP; shipId = act ? act.ship.id : null; shipName = act ? act.ship.name : 'your sloop';
    if (captainOf) {                                                   // aboard someone else's: their hull, their name, none of your fleet
      SP = typeof BridgeFleet !== 'undefined' && captainOf.type ? BridgeFleet.spec(captainOf.type) : SLOOP;
      if (captainOf.kit) SP = Object.assign({}, SP, unkit(captainOf.kit));        // her guns and fittings, as they're drawn
      shipId = null; shipName = captainOf.shipName || 'their boat'; act = null; aboardStart = true;
    }
    running = true; from = fromId; to = null; phase = 'load'; began = performance.now(); keys = {}; menu = null;
    wake = []; spray = []; fish = []; msg = null; msgQ = []; prompt = null; readyCount = 0; seaWas = null; auto = autoPref(); ironsT = 0;
    aim = null; hinted = false; said = {}; told = {}; B = null; wrecking = false; shakeUntil = 0;
    isl = {}; islLoading = {}; shapes = {}; wcells = {}; sky = { squall: 0, fog: 0, systems: [] }; course = null; dockAt = null; pa = null; hereAt = null; voyN++;
    seaSeen = { at: 0, pal: null };
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
      if (!running || !canvas) return;                               // put back before she was ready
      if (!A.sc || !A.mask || !isles()[A.id]) { fail(); return; }
      pa = isles()[A.id];                                            // the frame: this island where the chart has it
      place(A);                                                      // where she lies, among the rest of your ships
      layA(rspec && !captainOf ? rspec.seed : null);
      if (captainOf && captainOf.wind) { wind.from = captainOf.wind.from; wind.seed = captainOf.wind.seed; }
      if (crewOf && net()) net().send('sail-go', { from: from, to: toId || null, wind: { from: wind.from, seed: wind.seed }, type: act && act.ship ? act.ship.type : 'sloop',
                                                  shipName: shipName, suit: suitOf(), kit: kitMsg() }, crewOf.id);
      boat = { x: A.moor[0], r: A.moor[1], h: A.moorH, v: 0, sheet: 1.45, boom: 0, side: wrap(wind.from - A.moorH) > 0 ? -1 : 1, heel: 0, rudder: 0,
               bump: 0, hoist: 0, eff: 0, off: 0, luff: true, drift: [0, 0], empty: true, spec: SP, ship: shipId };
      castOut = unit(A.moor[0] - A.dock[0], A.moor[1] - A.dock[1]);
      cam = null;
      if (toId) commit(toId, true);                                  // a course set before you cast off: the gold mark from the start
      if (rspec && !captainOf) {                                       // a race: its marks, its line, the boats in it, your place off the pier
        raceSetUp(rspec);
        var ln = rspec.lane || 0, lp = ln ? [A.moor[0] + castOut[0] * 2.8 * ln, A.moor[1] + castOut[1] * 2.8 * ln] : null;
        race.lanePt = lp && afloat(A, lp[0], lp[1], 1.2) ? lp : null;
      }
      ensureIslands();
      updateCells(performance.now() + 1e6);
      phase = 'cast'; phaseAt = performance.now();
      lightTint = tintFor(A, BridgeWorld.getWorld && BridgeWorld.getWorld());
      // walked aboard in the world: start the camera exactly where the world's is, so the sea view fades in over it without a
      // jump (where the world's camera is held off the map's edge it isn't on the boat), then let it ease onto her
      var wv = aboardStart && BridgeWorld.getView ? BridgeWorld.getView() : null;
      if (wv && wv.ts === TS && wv.w) { var c0 = A.ox * TS - wv.offX, c1 = A.oy * TS - wv.offY; cam = { x: Math.round(c0), y: Math.round(c1), fx: c0, fy: c1 }; }
      coverAt = performance.now();
      setTimeout(function () { if (handoff) { var h = handoff; handoff = null; h(); } }, 600);
      if (aboardStart) { phaseAt -= CAST.board; said.board = 1; boat.empty = false; }   // you walked aboard in the world: already sat
      canvas.style.opacity = '1';
    }
    loadSheet(function (err) {
      if (err) { fail(); return; }
      loadHull(SP.sheet, function () {});
      loadIsland(fromId, function (I) {
        A = I;
        // the open sea keeps Lumar's sky whichever island you left (it used to stay night unless hers had day art, and
        // an island that had came up as a square of daylight on a night sea); an island's own water is feathered into it
        daySea = true;
        if (BridgeSea.setSeaCycles) BridgeSea.setSeaCycles(daySea);
        go();
      });
    });
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return true;
  }
  // the islands you could steer for: the ones on your chart (js/chart.js), or that you've been to - and the one you left,
  // once you're well away from it
  function others() {
    var P = isles(), far = ellipseK(shapeOf(A.id), boat.x, boat.r, 40) > 1;
    return Object.keys(P).filter(function (id) { return charted(id) && (id !== A.id || far); }).map(function (id) {
      return { id: id, name: P[id].name, bearing: bearingTo(id) };
    });
  }
  function bearingTo(id) { var c = centreOf(id); return Math.atan2(c.r - boat.r, c.x - boat.x); }
  // a course from the chart (or the menu): the gold mark the way the island really lies, out of the harbour first
  function canSetCourse() { return running && !captainOf && !raceOn() && !!A && !!boat && !!pa && (phase === 'sail' || phase === 'cast') && !(fight() && fight().busy()); }
  function setCourse(id) {
    if (!canSetCourse() || !knows(id) || id === course) return false;
    if (id === A.id && ellipseK(shapeOf(A.id), boat.x, boat.r, 40) < 1) return false;
    return commit(id);
  }
  // where you are on the chart: your water at the chart's own scale, from wherever you've sailed
  function chartPos() {
    if (!running || !A || !boat || !pa) return null;
    var c = toChart(boat.x, boat.r);
    return { x: clamp(c.x, 0, 1), y: clamp(c.y, 0, 1) };
  }
  function touch() { return document.documentElement.classList.contains('touch'); }

  function stop(dest, landed) {
    if (typeof BridgeSea !== 'undefined' && BridgeSea.setSeaCycles) BridgeSea.setSeaCycles(false);
    if (!running) return;
    raceQuit(landed ? 'ashore' : 'gone');                            // ashore before the line: out of it
    if (crewOf && net()) net().send('sail-end', { dest: dest || from, landed: !!landed }, crewOf.id);
    crewOf = null; captainOf = null; mirror = null; seaPeers = {};
    running = false;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove('keys-mode');
    if (chartOpen()) BridgeChart.close();
    if (fishingOpen()) BridgeFishing.close();
    ['sloop-menu-btn', 'sloop-chart-btn', 'sloop-menu'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); });
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('resize', resize);
    var target = dest || from, cv = canvas;
    canvas = null;
    Object.keys(isl).forEach(function (id) {                         // let the islands out at sea go (the one you're landing on keeps its water)
      if (id !== target && id !== from && typeof BridgeSea !== 'undefined' && BridgeSea.forget) BridgeSea.forget(id);
    });
    isl = {}; B = null;
    // The sea view stays up, on its last frame, while the island you're making for loads underneath: fading it first
    // showed the island you'd left (still the world under the passage) for a moment before the new one came in.
    BridgeWorld.load(target, function () {
      BridgeState.transition('world', { worldId: target, spawn: null });
      aboard = null;
      if (typeof BridgeCharacter !== 'undefined') { BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false); }
      if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
      if (landed) disembark(target);                                    // tied up: you climb out and walk up the pier
      fadeOut(cv);
    });
  }
  // let the passage's canvas go once the world under it has drawn a frame or two
  function fadeOut(cv) {
    if (!cv) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      cv.style.transition = 'opacity 0.45s'; cv.style.opacity = '0';
      setTimeout(function () { cv.remove(); }, 480);
    }); });
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
  var KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', ' ', 'enter', 'escape', 't', 'h'];
  function onKey(e) {
    var k = (e.key || '').toLowerCase();
    if (chartOpen() || fishingOpen() || overlayOpen()) return;         // the chart, the rod, a dialog or the game menu has the keys while it's open
    if (KEYS.indexOf(k) < 0) return;
    e.preventDefault(); e.stopPropagation();
    if (menu) {
      if (k === 'escape' && !e.repeat) closeMenu();
      else if ((k === 'enter' || k === ' ' || k === 'e') && !e.repeat) { var fb = document.activeElement; if (fb && menu.contains(fb) && fb.tagName === 'BUTTON') fb.click(); }
      else if (k === 'arrowdown' || k === 'arrowup') {
        var bs = [].slice.call(menu.querySelectorAll('button:not([disabled])')), bi = bs.indexOf(document.activeElement);
        bi = (bi + (k === 'arrowdown' ? 1 : -1) + bs.length) % bs.length; if (bs[bi]) bs[bi].focus();
      }
      return;
    }
    if (k === 'escape' && !e.repeat) { openMenu(); return; }
    if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat && prompt && phase === 'sail') prompt.act();
    if (k === 'h' && !e.repeat) { howTo(); return; }
    if (k === 't' && !e.repeat && !captainOf) { auto = !auto; autoPref(auto); say(auto ? 'The sail trims itself - you steer. ↑/↓ raise and lower it' : 'Trimming by hand: ↑ hauls the sheet in, ↓ eases it out', 3200); }
    keys[k] = true;
  }
  function onKeyUp(e) { keys[(e.key || '').toLowerCase()] = false; }
  function chartOpen() { return typeof BridgeChart !== 'undefined' && BridgeChart.isOpen(); }
  function fishingOpen() { return typeof BridgeFishing !== 'undefined' && BridgeFishing.isOpen(); }
  // a world dialog (the players panel, a chat) or the game menu opened over the sea: its keys are its own
  function overlayOpen() {
    return !!document.querySelector('.world-dialog.visible') || (typeof BridgeMenu !== 'undefined' && !!BridgeMenu.isOpen && !!BridgeMenu.isOpen());
  }
  function openChart() { if (typeof BridgeChart === 'undefined' || menu) return; keys = {}; BridgeChart.open(); }
  function onPointer() { if (prompt && phase === 'sail' && !fishingOpen()) prompt.act(); }
  function down(a, b) { return keys[a] || keys[b]; }

  function openMenu() {
    if (menu || !running) return;
    if (captainOf) {                                                 // aboard theirs: the helm isn't yours
      ask('Aboard the ' + shipName, (cap(captainOf.name) + ' has the helm.').toUpperCase(), [['Keep sailing', closeMenu],
        ['Open the chart (C)', function () { closeMenu(); openChart(); }], ['Row back ashore at ' + (A ? A.name : 'the quay'), function () { closeMenu(); stop(from); }]]);
      return;
    }
    var fn = A ? A.name : 'the quay', opts = [['Keep sailing', closeMenu]], fight = typeof BridgeSeaFight !== 'undefined' && BridgeSeaFight.busy();
    if (typeof BridgeChart !== 'undefined') opts.push(['Open the chart (C)', function () { closeMenu(); openChart(); }]);
    opts.push(['How to sail (H)', function () { closeMenu(); howTo(); }]);
    var dest = course;
    if (raceOn()) {                                                  // racing: no skipping ahead, no other course
      opts.push(['Retire from the race', function () { closeMenu(); raceQuit('retired'); say('You retire from the race and sail on', 2600); replan(); }]);
      opts.push(['Put back to ' + fn, function () { closeMenu(); landThen(from, function () { stop(from); }); }]);
      ask(race.spec.name || 'Racing', 'THE CLOCK\'S RUNNING.', opts);
      return;
    }
    if (dest && !fight) opts.push(['Skip ahead to ' + isles()[dest].name, function () { closeMenu(); landThen(dest, function () { stop(dest); }); }]);
    if (dest && !fight) opts.push(['Change course', function () {
      closeMenu();
      ask('Change course', null, others().filter(function (o) { return o.id !== dest; }).map(function (o) { return ['Set a course for ' + o.name, function () { closeMenu(); commit(o.id); }]; })
        .concat([['Keep this course', closeMenu]]));
    }]);
    else if (!dest && A && boat) others().forEach(function (o) { opts.push(['Set a course for ' + o.name, function () { closeMenu(); commit(o.id); }]); });
    if (!fight) opts.push(['Put back to ' + fn, function () { closeMenu(); landThen(from, function () { stop(from); }); }]);
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

  // a line on the screen; one that comes while another's only just up waits its turn (a few at most), so a front or a squall
  // said in the same breath as something else is still read
  var msgQ = [], msgFrom = 0;
  function say(text, ms) {
    var now = performance.now();
    if (msg && text !== msg && now < msgAt && now - msgFrom < 1500) {
      if (msgQ.length < 3 && msgQ.every(function (q) { return q[0] !== text; })) msgQ.push([text, ms]);
      return;
    }
    msg = text; msgAt = now + (ms || 3200); msgFrom = now;
  }
  var shakeUntil = 0, wrecking = false;
  // damage to the ship you're sailing (hull points); what's left of her, 0..1
  function hullHit(pts) {
    shakeUntil = performance.now() + 220;
    return typeof BridgeFleet !== 'undefined' && shipId ? BridgeFleet.damage(shipId, pts) : 1;
  }
  // trouble at sea (js/seafight.js) sees the passage through this
  // the stretch of sea ahead, as the fight sees it: the sea you're in (its odds), a mark well ahead on your heading (where
  // they lie in wait), and the port whose prices your hold is reckoned at (where you're bound, or the nearest)
  function stretch() {
    if (!boat || !pa) return A;
    var P = isles(), id = course, bd = 1e18, c = toChart(boat.x, boat.r);
    if (!id || id === 'lumar-holm') for (var k in P) {             // (the holm has no market)
      if (k === 'lumar-holm') continue;
      var d = Math.pow(P[k].x - c.x, 2) + Math.pow((P[k].y - c.y) * 0.72, 2);
      if (d < bd) { bd = d; id = k; }
    }
    return { id: id, pal: seaHere(), exit: [boat.x + Math.cos(boat.h) * 70, boat.r + Math.sin(boat.h) * 70] };
  }
  var SEA = {
    A: function () { return stretch(); }, B: function () { return stretch(); }, boat: function () { return boat; }, spec: function () { return SP; },
    wind: function () { return wind; }, polar: function (off, sp) { return polar(off, sp); }, ground: function (x, r) { return groundAt(x, r); },
    offshore: function (x, r) { return offshore(x, r); }, rand: Math.random, say: say, sfx: function (n) { sfx(n); }, ask: function (a, b, c, d) { ask(a, b, c, d); },
    hull: function () { var f = typeof BridgeFleet !== 'undefined' && BridgeFleet.get(shipId); return f ? f.hull : 1; },
    blessed: function () { return blessing; },
    shake: function () { shakeUntil = performance.now() + 260; }, wreck: function (why) { wreck(why); },
    ctx: function () { return bctx; }, drawBoat: function (now, b) { drawBoat(now, b); }, sx: function (x) { return sx(x); }, sy: function (r, z) { return sy(r, z); },
    sea: function () { return seaHere(); }, seaAt: function (x, r) { return seaAtWorld(x, r); }
  };
  function fight() { return typeof BridgeSeaFight !== 'undefined' ? BridgeSeaFight : null; }
  // she's gone: the salvors tow what's left into the nearer port, her hold lost
  function wreck(why) {
    if (wrecking || !running) return;
    wrecking = true;
    say(why + '. Salvors are coming...', 4000);
    sfx('slam');
    var P = isles(), near = { id: A.id === 'lumar-midnight' ? 'lumar-tern' : A.id, name: A.id === 'lumar-midnight' ? P['lumar-tern'].name : A.name }, nd = 1e18;   // the nearest port with a harbourmaster to mend her
    Object.keys(P).forEach(function (id) {
      if (id === 'lumar-holm' || id === 'lumar-midnight') return;     // (the Ferryman mends nothing)
      var c = centreOf(id), d = Math.hypot(c.x - boat.x, c.r - boat.r);
      if (d < nd) { nd = d; near = { id: id, name: P[id].name }; }
    });
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

  // ---- the wind and the weather: alive, and the same for everyone out there ------------------------------------------------
  // All of it is worked out from the passage's wind seed, where you are and the clock (Date.now, so captain and crew see
  // the same - the crew also gets the wind at the boat in the helm messages): the wind's own slow veering and backing; a
  // front now and then that swings it 40-90° over half a minute, fresher behind it (said a little before it comes); lulls
  // where it all but dies; islands that shadow it in their lee and bend it round their shores; and weather systems that
  // drift across the sea - rain squalls (a grey curtain on the water, gusty and shifting inside) and fog banks (thickest on
  // the Midnight Sea) - that you can see coming and sail into or round. The Crimson's squalls and Midnight's mist are the
  // strong versions of the same.
  var FRONT = 95, LULL = 70, WCELL = 120, wcells = {};
  function smooth01(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function slotDir(k) { return (hash(wind.seed * 1.37 + k * 3.11) - 0.5) * 1.8; }            // where the wind sits between fronts
  function frontAt(T) {
    var k = Math.floor(T / FRONT), u = T - k * FRONT, a = slotDir(k - 1), c = slotDir(k), jump = Math.abs(c - a);
    return { d: a + (c - a) * smooth01(u / 30), s: 1 + (jump > 0.8 ? 0.2 * Math.sin(smooth01((u - 20) / 45) * Math.PI) : 0) };
  }
  function lullAt(T) {
    var k = Math.floor(T / LULL), u = T - k * LULL;
    if (hash(wind.seed * 0.91 + k * 7.7) > 0.2) return 1;
    return 1 - 0.8 * Math.sin(smooth01((u - 12) / 28) * Math.PI);
  }
  var POINTS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
  function pointOf(a) { return POINTS[((Math.round(wrap(a) / (Math.PI / 4)) % 8) + 8) % 8]; }
  // the weather systems in a WCELL square of the chart's own frame: at most one, born, drifting and dying away on its own clock
  function genWeather(i, j) {
    var seed = i * 7349 + j * 1931 + 77;
    function h(k) { return hash(seed * 0.4127 + k * 11.3); }
    var pal = seaAtChart((i + 0.5) * WCELL / K, (j + 0.5) * WCELL / KY);
    var Wx = wx() || { squall: 1, fog: 1 };                       // the day's weather over Lumar (js/weather.js): more or fewer of each
    var kind = h(1) < Math.min(0.9, (pal === 'crimson' ? 0.6 : pal === 'midnight' ? 0.12 : 0.24) * Wx.squall) ? 'squall'
             : h(2) < Math.min(0.9, (pal === 'midnight' ? 0.7 : pal === 'crimson' ? 0.05 : 0.16) * Wx.fog) ? 'fog' : null;
    if (!kind) return 0;
    var a = h(5) * 6.28, sp = 0.05 + h(6) * 0.06, L = 420 + h(3) * 300, rx = kind === 'squall' ? 12 + h(9) * 14 : 18 + h(9) * 22;
    return { kind: kind, c0: [(i + 0.2 + h(7) * 0.6) * WCELL, (j + 0.2 + h(8) * 0.6) * WCELL], v: [Math.cos(a) * sp, Math.sin(a) * sp], L: L, ph: h(4) * L,
             rx: rx, ry: rx * (0.6 + h(10) * 0.25), seed: seed % 1000, thick: pal === 'midnight' ? 1 : 0.6, id: i + ',' + j };
  }
  function systemsNear(x, r, T) {
    var P = absOf(x, r), ci = Math.floor(P[0] / WCELL), cj = Math.floor(P[1] / WCELL), out = [];
    for (var di = -1; di <= 1; di++) for (var dj = -1; dj <= 1; dj++) {
      var key = (ci + di) + ',' + (cj + dj);
      if (!(key in wcells)) wcells[key] = genWeather(ci + di, cj + dj);
      var c = wcells[key];
      if (!c) continue;
      var age = (T + c.ph) % c.L, k = smooth01(age / 60) * smooth01((c.L - age) / 60);
      if (k <= 0.01) continue;
      var w = fromAbs(c.c0[0] + c.v[0] * (age - c.L / 2), c.c0[1] + c.v[1] * (age - c.L / 2));
      out.push({ kind: c.kind, x: w[0], r: w[1], rx: c.rx, ry: c.ry, k: k, seed: c.seed, thick: c.thick, id: c.id });
    }
    return out;
  }
  function insideOf(s, x, r) { var e = Math.hypot((x - s.x) / s.rx, (r - s.r) / s.ry); return smooth01((1 - e) / 0.35) * s.k; }
  // the islands' effect on it: shadowed in their lee, bent along their shores where it blows onto them
  function islandWind(x, r, from) {
    var tx = Math.cos(from + Math.PI), tr = Math.sin(from + Math.PI), out = { s: 1, d: 0 };
    Object.keys(isles()).forEach(function (id) {
      var sh = shapeOf(id), k = ellipseK(sh, x, r, 0);
      if (k > 2.4) return;
      for (var d = 2; d < 36; d += 3) if (ellipseK(sh, x - tx * d, r - tr * d, 0) < 1) { out.s = Math.min(out.s, 0.35 + 0.65 * d / 36); break; }
      var nx = (x - sh.x) / (sh.a * sh.a), nr = (r - sh.r) / (sh.b * sh.b), nn = Math.hypot(nx, nr) || 1, into = (tx * nx + tr * nr) / nn;
      if (into < 0) {
        var w = clamp((2.4 - k) / 1.3, 0, 1), ux = tx - nx / nn * into * w, ur = tr - nr / nn * into * w;
        out.d += wrap(Math.atan2(ur, ux) - Math.atan2(tr, tx));
      }
    });
    return out;
  }
  // the wind where you are: its swing off the passage's direction, and how hard it blows (× the sea's own), plus what you're in
  var sky = { squall: 0, fog: 0, systems: [] };
  function windAt(x, r, T) {
    var f = frontAt(T), d = f.d + 0.3 * (vnoise(T / 47 + wind.seed) - 0.5), s = f.s * lullAt(T);
    var iw = islandWind(x, r, wind.from + d);
    d += iw.d; s *= iw.s;
    var sq = 0, fg = 0, sys = systemsNear(x, r, T);
    sys.forEach(function (o) {
      var q = insideOf(o, x, r);
      if (q <= 0) return;
      if (o.kind === 'squall') { sq = Math.max(sq, q); d += q * (0.55 * Math.sin(T * 0.33 + o.seed) + 0.2 * Math.sin(T * 1.3 + o.seed * 2)); s *= 1 + 0.2 * q; }
      else { fg = Math.max(fg, q * o.thick); s *= 1 - 0.3 * q; }
    });
    sky = { squall: sq, fog: fg, systems: sys };
    return { d: d, s: clamp(s, 0.15, 1.3) };
  }
  // what's coming, said before it comes: a front, a lull, a squall or a fog bank ahead
  function windNews(T) {
    var k = Math.floor(T / FRONT), next = (k + 1) * FRONT - T;
    if (next < 14 && said.front !== k + 1) {
      said.front = k + 1;
      var dd = slotDir(k + 1) - slotDir(k), to2 = pointOf(wind.from + slotDir(k + 1));
      if (Math.abs(dd) > 0.6) say((dd > 0 ? 'The wind\'s veering - it\'ll come round to the ' : 'The wind\'s backing - it\'ll come round to the ') + to2 + '. Mind your sail', 4600);
    }
    var kl = Math.floor(T / LULL);
    if (lullAt(T) < 0.6 && said.lull !== kl) { said.lull = kl; say('The wind falls away to a whisper. The sail hangs. Wait for it - it\'ll fill in again', 4200); }
    sky.systems.forEach(function (o) {
      var q = insideOf(o, boat.x, boat.r), ahead = Math.hypot(boat.x + Math.cos(boat.h) * 14 - o.x, boat.r + Math.sin(boat.h) * 14 - o.r) < Math.max(o.rx, o.ry);
      if (q > 0.25 && !said['in:' + o.id]) {
        said['in:' + o.id] = said['ahead:' + o.id] = 1;
        say(o.kind === 'squall' ? 'Rain hammers down - a squall, the wind gusting and swinging every way. Ease her through it' : seaHere() === 'midnight' ? 'The fog closes round you, thick as wool. You can barely see the bow' : 'A fog bank swallows you. Sound carries strangely; the sea goes quiet', 4200);
      } else if (q <= 0 && ahead && !said['ahead:' + o.id] && o.k > 0.5) {
        said['ahead:' + o.id] = 1;
        say(o.kind === 'squall' ? 'A grey curtain of rain on the water ahead - a squall. Sail into it or round it' : 'A fog bank lies across the water ahead', 3600);
      }
    });
  }

  // the weather over all Lumar (js/weather.js), looked at once a second: a storm makes every sea the Crimson's
  var wxC = null;
  function wx() {
    var t = Date.now();
    if (!wxC || t - wxC.at > 1000) wxC = { at: t, s: typeof BridgeWeather !== 'undefined' && BridgeWeather.sea ? BridgeWeather.sea() : null };
    return wxC.s;
  }
  /** Where the Sapphire light is, on screen (it sweeps through the fog: steer for it). */
  function lightOnScreen() {
    var I = isl['lumar-sapphire'], w = null;
    if (I) w = [8.5 + I.ox, 14 + I.oy];
    else if (isles() && isles()['lumar-sapphire'] && pa) { var c = toWorld(isles()['lumar-sapphire'].x, isles()['lumar-sapphire'].y); w = [c.x, c.r]; }
    return w ? [sx(w[0]), sy(w[1])] : null;
  }

  function update(dt, now) {
    var t = now / 1000, here = seaHere(), Wx = wx();
    wind.base += ((BASE[here] || 0.92) * (Wx ? Wx.wind : 1) - wind.base) * Math.min(1, dt * 0.25);
    if (here === 'crimson' || (Wx && Wx.storm)) {                    // a squall: the wind jumps round, the rain comes on
      if (!storm.squallAt) storm.squallAt = now + 9000;
      if (!storm.warned && now > storm.squallAt - 2800 && phase === 'sail') { storm.warned = 1; say(auto ? 'A squall coming down on you - lower the sail (↓) before it hits!' : 'A squall coming down on you - ease the sheet (↓) before it hits!', 2800); }
      if (now > storm.squallAt) {
        storm.squallAt = now + 24000 + hash(Math.floor(now / 997)) * 16000; storm.warned = 0;   // (spaced for the longer passages)
        wind.from += (hash(Math.floor(now / 991)) < 0.5 ? -1 : 1) * (0.6 + hash(Math.floor(now / 983)) * 0.5);
        // what it does to her depends on how much sail you're carrying when it hits: eased, she rides it out
        var press = phase === 'sail' ? clamp((boat.eff || 0) * (boat.hoist || 0) * (boat.reef == null ? 1 : boat.reef), 0, 1) : 0;
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
    } else if (storm.squallAt && now > storm.squallAt) storm.squallAt = 0;      // out of it: the next squall comes a while after you're back in
    // the wind veers a little and blows in gusts you can see coming over the water
    var T = Date.now() / 1000, wa = windAt(boat.x, boat.r, T);
    var W0 = wind.from + wa.d + 0.12 * (vnoise(t / 7.3 + 9) - 0.5);
    if (phase === 'sail') windNews(T);
    if (now > wind.gustAt) {
      var hard = Wx && (Wx.storm || (Wx.kind === 'gale' && Wx.k > 0.5)), rough = here === 'crimson' || sky.squall > 0.3 || hard;
      wind.gustAt = now + (rough ? 3500 + hash(Math.floor(now / 1000)) * 4000 : 9000 + hash(Math.floor(now / 1000)) * 9000);
      wind.gust = here === 'crimson' || hard ? 0.62 : rough ? 0.45 : 0.32; wind.gustT = now;
    }
    var g = wind.gust * Math.max(0, Math.sin(clamp((now - (wind.gustT || 0)) / 4200, 0, 1) * Math.PI));
    wind.s = wind.base * (1 + g) * wa.s;
    wind.now = W0;
    var b = boat;
    if (captainOf) { crewUpdate(b, dt, now, t); return; }
    // steering: a turn of speed from the rudder, a little even when stopped (you can scull her round)
    var castT = phase === 'cast' ? now - phaseAt : 1e9;
    var steer = (down('arrowright', 'd') ? 1 : 0) - (down('arrowleft', 'a') ? 1 : 0);
    b.rudder += (steer - b.rudder) * Math.min(1, dt * 6);
    if (phase === 'sail' || castT > CAST.push) b.h = wrap(b.h + b.rudder * (0.4 + 0.95 * Math.min(1, b.v / 2.6)) * (SP.turn || 1) * dt);
    var rel = wrap(W0 - b.h), off = Math.abs(rel);                   // where the wind comes from, off the bow
    var lee = rel > 0 ? -1 : 1;                                       // the boom swings to the other side
    // the sheet: by hand, or trimming itself
    var trim = (down('arrowdown', 's') ? 1 : 0) - (down('arrowup', 'w') ? 1 : 0);
    if (b.reef == null) b.reef = 1;
    if (auto) {                                                       // the sheet looks after itself; ↑/↓ raise and lower the sail
      b.sheet += (bestSheet(off) - b.sheet) * Math.min(1, dt * 2.2);
      b.reef = clamp(b.reef - trim * 0.7 * dt, 0, 1);
    } else b.sheet = clamp(b.sheet + trim * 0.9 * dt, 0.1, 1.45);
    // stuck head to wind with the sail up and nobody steering: her bow falls off on its own, the way a boat does
    if (phase === 'sail' && off < (SP.nogo || 0.7) && !steer && b.reef > 0.3) {
      ironsT += dt;
      if (ironsT > 1.6) b.h = wrap(b.h - (rel > 0 ? 1 : -1) * 0.4 * dt);
    } else ironsT = 0;
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
    b.hoist = hoisted * (phase === 'sail' ? 0.12 + 0.88 * b.reef : 1);                // lowered, she carries a scrap of it
    var goal = (SP.vmax || VMAX) * (typeof BridgeMagic !== 'undefined' && BridgeMagic.has('tide') ? 1.12 : 1) * wind.s * polar(off) * eff * hoisted * (phase === 'sail' ? b.reef : 1);
    if (phase === 'moor') goal = 0;
    var holding = !!race && race.spec.hold && !race.gun && phase === 'sail';      // on the line, sail down, waiting for the gun
    if (holding) goal = 0;
    b.v += (goal - b.v) * Math.min(1, dt * (goal > b.v ? 0.55 : 0.32) * (SP.accel || 1));
    if (off < (SP.nogo || 0.7) && b.v < 0.4) b.v = Math.max(-0.25, b.v - dt * 0.15);   // in irons: she drifts back
    b.heel += ((phase === 'sail' ? wind.s * eff * Math.min(1, polar(off) * 1.3) * (off < 2.4 ? 1 : 0.45) * 0.42 : 0) - b.heel) * Math.min(1, dt * 2);
    // leeway: pushed downwind a little, more when slow
    var dwx = Math.cos(W0 + Math.PI), dwr = Math.sin(W0 + Math.PI), lw = wind.s * 0.12 * (1 - Math.min(1, b.v / 3));
    var nx = b.x + (Math.cos(b.h) * b.v + dwx * lw) * dt, nr = b.r + (Math.sin(b.h) * b.v + dwr * lw) * dt;
    if (phase === 'moor') {                                          // coming alongside: she glides in and lies bow-out at the berth
      nx = b.x + (dockAt.moor[0] - b.x) * Math.min(1, dt * 1.6); nr = b.r + (dockAt.moor[1] - b.r) * Math.min(1, dt * 1.6);
      b.h = wrap(b.h + wrap(dockAt.moorH - b.h) * Math.min(1, dt * 1.4));
    }
    // the edge of the known seas: the swell runs high and confused and the current sets you back toward the islands
    if (phase === 'sail') {
      var ec = toChart(nx, nr), px2 = ec.x < EDGE[0] ? EDGE[0] - ec.x : ec.x > EDGE[2] ? EDGE[2] - ec.x : 0, py2 = ec.y < EDGE[1] ? EDGE[1] - ec.y : ec.y > EDGE[3] ? EDGE[3] - ec.y : 0;
      if (px2 || py2) {
        var deep = Math.hypot(px2 * K, py2 * KY), pk = Math.min(1, deep / 10);
        nx += Math.sign(px2) * (1.2 + 3.2 * pk) * dt; nr += Math.sign(py2) * (1.2 + 3.2 * pk) * dt;
        if (deep > 16) { nx += px2 * K * (1 - 16 / deep) * Math.min(1, dt * 4); nr += py2 * KY * (1 - 16 / deep) * Math.min(1, dt * 4); }
        if (!edgeTold) { edgeTold = true; say('The swell runs high and confused out here - the edge of the known seas. The current sets you back toward the islands.', 5600); }
      }
    }
    if (castT < CAST.lines) { nx = A.moor[0]; nr = A.moor[1]; b.v = 0; }                  // made fast: she doesn't move
    else if (castT < CAST.push && race && race.lanePt) {                                     // poled out to her place on the line
      var lk = smooth01((castT - CAST.lines) / (CAST.push - CAST.lines));
      nx = A.moor[0] + (race.lanePt[0] - A.moor[0]) * lk; nr = A.moor[1] + (race.lanePt[1] - A.moor[1]) * lk;
    }
    else if (castT < CAST.push) { nx = b.x + castOut[0] * 0.55 * dt; nr = b.r + castOut[1] * 0.55 * dt; }   // pushed off the pier
    else if (holding) { nx = b.x; nr = b.r; b.v = 0; }
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
      if (course && phase === 'sail') courseSailed += Math.hypot(nx - b.x, nr - b.r);
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
    if (race) { npcsTick(dt, now); raceTick(now); }
    if (fight() && phase === 'sail') fight().update(dt, now);
    // the islands coming up over the horizon, what's adrift round you, trouble in open water
    ensureIslands();
    updateCells(now);
    if (phase === 'sail' && offshore(b.x, b.r)) openT += dt;
    if (fight() && phase === 'sail' && openT > troubleAt) { troubleAt = openT + (seaHere() === 'midnight' ? 75 : 150); fight().plan(); }   // the Midnight Sea is never quiet long
    // where you are: the sea you're on (said as you cross into one), land coming up
    crossing(here, now);
    if (phase === 'sail') landHo();
    if (!course && phase === 'sail') {                               // steer for a dot on the compass and hold it: your course
      if (ellipseK(shapeOf(A.id), b.x, b.r, 4) > 1 || Math.hypot(b.x - A.exit[0], b.r - A.exit[1]) < 6) {
        if (!hinted && now - msgAt > -500) { hinted = true; say('Out of the harbour. Steer for a dot on the compass rim - each is an island on your chart' + (touch() ? ' (or open the Chart)' : ' (or C for the chart)') + '. Or sail on into open water and see what you find', 6400); }
        var best = null, bd = 0.42;
        others().forEach(function (o) { var d = Math.abs(wrap(o.bearing - b.h)); if (d < bd) { bd = d; best = o; } });
        if (best && aim && aim.id === best.id) aim.t += dt; else aim = best ? { id: best.id, t: 0 } : null;
        if (aim && aim.t > 2.2 && b.v > 0.6) commit(aim.id);
      }
    }
    if (course && now - replanAt > 2000) { replanAt = now; if (offCourse() > 24) replan(); }   // strayed well off it: the gold mark from wherever you've got to
    // the next leg of the course (the gold mark on the compass)
    while (leg < route.length - 1 && Math.hypot(b.x - route[leg][0], b.r - route[leg][1]) < 3.5) leg++;
    prompt = null;
    if (phase === 'sail') {
      // alongside any island's quay you've come to - the one you set a course for or not - or back at your own
      var dock = null, dd = 1e9;
      for (var id in isl) {
        var I = isl[id];
        if (!I.moor) continue;
        var d = Math.min(Math.hypot(b.x - I.berth[0], b.r - I.berth[1]), Math.hypot(b.x - I.moor[0], b.r - I.moor[1]));
        if (d < dd) { dd = d; dock = I; }
      }
      var there = dock;
      if (there === A) { if (dd < 2.2 && now - began > 8000 && !raceOn()) prompt = { text: 'Put back in at ' + A.name, act: function () { landThen(from, function () { stop(from, true); }); } }; }
      else if (there && dd < 3.4) prompt = { text: there.uncharted ? 'Come alongside' : 'Come alongside — ' + there.name, act: function () { moor(there); } };   // she drops her sail as she comes in
      things.forEach(function (o) {
        if (prompt) return;
        var d = Math.hypot(b.x - o.x, b.r - o.r);
        if (o.flot && !o.got && d < 2.4) prompt = b.v < 3.6 ? { text: 'Haul the ' + o.kind + ' aboard', act: function () { haul(o); } }
                                                         : { text: 'Lower the sail (↓) to grab the ' + o.kind, act: function () {} };
        else if (o.kind === 'dory' && d < 4.2) prompt = { text: 'Hail the fisherman', act: function () { hail(o); } };
      });
      // stopped out on the water (rounded up into the wind, say): a line over the side
      if (!prompt && Math.abs(b.v) < 0.6 && now - began > 6000 && !raceOn() && !(fight() && fight().busy()) && typeof BridgeFishing !== 'undefined')
        prompt = { text: 'Cast a line', act: fishHere };
      if (!said.fish && b.v > 1.4 && now - began > 40000 && now - msgAt > 2500 && !seaFishTold()) {
        said.fish = 1; seaFishTold(true);
        say(auto ? 'Fish bite out here too: lower the sail (↓) till she stops, then cast a line' : 'Fish bite out here too: round up into the wind till she stops, then cast a line', 5200);
      }
    }
    if (phase === 'cast') {                                          // the cast-off, said as it happens
      b.empty = castT < CAST.board;
      if (!said.board) { said.board = 1; say(SP.L > 3.6 ? 'You go aboard the ' + shipName + ' and take the wheel' : 'You step down into the ' + shipName, 1500); sfx('step'); }
      if (castT > CAST.board && !said.lines) { said.lines = 1; say('You slip the bow line, then the stern', 1400); sfx('click'); }
      if (castT > CAST.lines && !said.push) { said.push = 1; say('A shove off the pier and she drifts clear', 1400); sfx('sit'); }
      if (castT > CAST.push && !said.hoist) { said.hoist = 1; say('Hoist the main! Hand over hand, the sail climbs the mast', 1900); sfx('luff'); }
      if (castT > CAST.sail) {
        phase = 'sail';
        if (auto) say(touch() ? 'Stick: left and right to steer, down to lower the sail and slow, up to raise it' : '←/→ steer · ↓ lower the sail · ↑ raise it · C the chart · H how to sail · Esc the menu', 5600);
        else say(touch() ? 'Stick: steer left and right, up to haul in, down to ease out' : '←/→ steer · ↑ haul the sheet in · ↓ ease it out · H how to sail · Esc for the menu', 5200);
        if (!taught()) setTimeout(function () { if (running && !menu) { taught(true); howTo(); } }, 900);
      }
    }
    if (phase === 'moor') {
      var mt = now - phaseAt;
      b.empty = mt > MOOR.off;
      if (crewOf && net()) net().send('helm', helmState(now), crewOf.id);
      if (mt > MOOR.lines && !said.made) { said.made = 1; say(dockAt.uncharted ? 'Made fast. You throw the lines ashore' : 'Made fast at ' + dockAt.name + '. You throw the lines ashore', 1600); sfx('click'); }
      if (mt > MOOR.done && !hold && !captainOf) {
        hold = 1;
        if (shipId && typeof BridgeFleet !== 'undefined') BridgeFleet.moored(shipId, to);   // she lies here now
        landThen(to, function () { setTimeout(function () { hold = 0; stop(to, true); }, 300); });
      }
    }
  }

  // ---- how to sail: the card on your first passage, and from the menu or H any time ------------------------------------
  function taught(set) { try { if (set) localStorage.setItem('bridge_sail_taught', '1'); return localStorage.getItem('bridge_sail_taught') === '1'; } catch (e) { return true; } }
  function howTo() {
    if (!running) return;
    if (menu) closeMenu();
    var t = touch(), el = document.createElement('div');
    el.id = 'sloop-menu'; el.className = 'sloop-menu sloop-help';
    var steps = [
      ['Steer', t ? 'Push the stick left and right.' : '← and → (or A and D) turn her. The white line on the compass is where your bow points.'],
      ['The wind', 'The blue arrow on the compass is the wind. She can\'t sail straight into it - that\'s the red wedge. Sail across it or along with it; wind from the side is fastest.'],
      ['Speed', captainOf ? 'You\'re crew: the captain sails her. Fish over the side when she\'s stopped.'
        : auto ? (t ? 'Pull the stick down to lower the sail and slow down - all the way down to stop. Push it up to raise it again.' : '↓ lowers the sail to slow down - all the way down to stop. ↑ raises it. The sail trims itself (T if you\'d rather trim the sheet by hand).')
        : '↑ hauls the sheet in, ↓ eases it out: keep the marker on the green. (T lets the sail trim itself.)'],
      ['Islands', 'Every island lies where the chart shows it. Turn till a dot on the compass rim lines up with your bow and hold it: that\'s your course, and the gold dot leads you there. Or open the chart (' + (t ? 'Chart' : 'C') + ') and pick one. Islands you have no chart for aren\'t on the compass - sail their way and you\'ll find them.'],
      ['Weather', 'Watch the water: dark ripples are gusts coming, a grey curtain is a rain squall, a pale bank is fog. Sail into them or round them. The wind shifts now and then - you\'ll hear it coming.'],
      ['Arriving', 'Follow the gold dot into the harbour and ' + (t ? 'tap' : 'press E') + ' to come alongside.'],
      ['Stuck?', 'Facing into the wind she stops, and her bow slowly falls away. The menu (' + (t ? '⋯' : 'Esc') + ') can skip ahead or put back to port any time.']
    ];
    el.innerHTML = '<div class="sloop-menu-title">How to sail</div><ol class="sh-steps">' + steps.map(function (r) {
      return '<li><b>' + r[0] + '</b> ' + r[1] + '</li>';
    }).join('') + '</ol>';
    var bt = document.createElement('button'); bt.type = 'button'; bt.textContent = 'Got it';
    bt.addEventListener('click', function (e) { e.preventDefault(); onMenuClose = null; closeMenu(); });
    el.appendChild(bt);
    document.body.appendChild(el);
    menu = el; onMenuClose = null; keys = {};
    bt.focus();
  }

  // ---- sailing together -----------------------------------------------------------------------------------------------
  function net() { return typeof BridgeNet !== 'undefined' && BridgeNet.online() ? BridgeNet : null; }
  function helmState(now) {
    var b = boat;
    return { x: b.x, r: b.r, h: b.h, v: b.v, sheet: b.sheet, boom: b.boom, side: b.side, heel: b.heel, hoist: b.hoist, rudder: b.rudder,
             luff: b.luff, stall: b.stall, eff: b.eff, off: b.off, bump: b.bump, empty: !!b.empty, ph: phase, pt: now - phaseAt, wn: wind.now, ws: wind.s,
             dk: dockAt ? dockAt.id : null };
  }
  // aboard their boat: she goes where their helm takes her; the sea, the islands and what's adrift are the same as theirs
  function crewUpdate(b, dt, now, t) {
    var m = mirror;
    if (m) {
      var k = Math.min(1, dt * 10);
      if (Math.hypot(m.x - b.x, m.r - b.r) > 3) { b.x = m.x; b.r = m.r; } else { b.x += (m.x - b.x) * k; b.r += (m.r - b.r) * k; }
      b.h = wrap(b.h + wrap(m.h - b.h) * k);
      ['v', 'sheet', 'boom', 'heel', 'hoist', 'rudder', 'eff', 'off'].forEach(function (f) { if (typeof m[f] === 'number') b[f] += (m[f] - b[f]) * k; });
      b.side = m.side; b.luff = m.luff; b.stall = m.stall; b.bump = m.bump || 0;
      wind.now = m.wn; wind.s = m.ws;
      if (m.ph && m.ph !== phase) { phase = m.ph; phaseAt = now - (m.pt || 0); }
      if (m.dk && isl[m.dk]) dockAt = isl[m.dk];
    }
    b.empty = false;
    var c = Math.cos(b.h), s = Math.sin(b.h);
    if (Math.abs(b.v) > 0.25) {
      b.wakeT = (b.wakeT || 0) + dt;
      while (b.wakeT > 0.05) {
        b.wakeT -= 0.05;
        for (var q = -1; q <= 1; q += 2) wake.push({ x: b.x - c * 1.2 + -s * q * 0.3, r: b.r - s * 1.2 + c * q * 0.3, vx: -s * q * 0.35, vr: c * q * 0.35, age: 0, v: b.v });
        wake.push({ x: b.x - c * 1.25, r: b.r - s * 1.25, vx: 0, vr: 0, age: 0, v: b.v, glow: true });
      }
    }
    wake = wake.filter(function (w) { w.age += dt; w.x += w.vx * dt; w.r += w.vr * dt; return w.age < 2.6; });
    spray = spray.filter(function (p) { p.age += dt; p.x += p.vx * dt; p.r += p.vr * dt; p.z += p.vz * dt; p.vz -= 6 * dt; return p.z > -0.05 && p.age < 1.4; });
    ensureIslands();                                                 // the same sea as theirs: islands, what's adrift, the seams
    updateCells(now);
    var T = Date.now() / 1000;                                        // and the same sky (the wind at the boat comes in their helm)
    windAt(b.x, b.r, T);
    if (phase === 'sail') windNews(T);
    if (phase === 'sail' && offshore(b.x, b.r)) openT += dt;
    if (course) {                                                     // their course, on your compass too: the mark moves on as she does
      if (b.lastX != null && phase === 'sail') courseSailed += Math.min(2, Math.hypot(b.x - b.lastX, b.r - b.lastR));
      if (now - replanAt > 2000) { replanAt = now; if (offCourse() > 24) replan(); }
      while (leg < route.length - 1 && Math.hypot(b.x - route[leg][0], b.r - route[leg][1]) < 3.5) leg++;
    }
    b.lastX = b.x; b.lastR = b.r;
    life(dt, now);
    crossing(seaHere(), now);
    if (phase === 'sail') landHo();
    if (phase === 'cast' && !said.crew) { said.crew = 1; say('You\'re aboard the ' + shipName + ' - ' + cap(captainOf.name) + ' has the helm', 3200); }
    prompt = null;
    if (phase === 'sail' && Math.abs(b.v) < 0.6 && now - began > 6000 && typeof BridgeFishing !== 'undefined') prompt = { text: 'Cast a line', act: fishHere };
    if (mirror && now - mirror.at > 12000 && !said.lost) {          // the captain's gone quiet: back to port
      said.lost = 1; say('No word from the helm - you put back in', 2400);
      setTimeout(function () { stop(course || from, true); }, 2600);
    }
  }
  function cap(n) { return String(n || '').toLowerCase().replace(/(^|\s)([a-z])/g, function (m, a, c) { return a + c.toUpperCase(); }); }
  function onNet() {
    var n = typeof BridgeNet !== 'undefined' ? BridgeNet : null;
    if (!n) return;
    n.on('helm', function (d, from) { if (running && captainOf && captainOf.id === from && d) { d.at = performance.now(); mirror = d; } });
    n.on('course', function (d, from) {                              // the captain's set a course: the same mark on your compass
      if (!running || !captainOf || captainOf.id !== from || !d || !isles()[d.id] || !boat || !pa) return;
      commit(d.id, true);
    });
    n.on('haul', function (d, from) {
      if (!running || !captainOf || captainOf.id !== from || !d || !d.key) return;
      gotKeys[d.key] = 1;
      things.forEach(function (o) { if (o.key === d.key && !o.got) { o.got = true; burst(o.x, o.r, 8, 'spray'); } });
    });
    n.on('sail-end', function (d, from) {
      if (!running || !captainOf || captainOf.id !== from) return;
      say(d.landed ? 'Made fast. You climb out onto the quay' : 'You go ashore', 1600);
      var dest = d.dest;
      setTimeout(function () { stop(dest, !!d.landed); }, 900);
    });
    n.on('leave', function (p, id) {
      if (running && captainOf && captainOf.id === id) { say(cap(captainOf.name) + ' has gone - you bring her in yourself', 2400); setTimeout(function () { stop(course || from, true); }, 2600); }
      if (crewOf && crewOf.id === id) { say(cap(crewOf.name) + ' has gone ashore', 2200); crewOf = null; }
      delete seaPeers[id];
    });
    // other boats out at the same time: where they are on the chart, shown where that falls on your water
    n.on('sea', function (d, from) {
      if (!running || !d || (captainOf && captainOf.id === from) || (crewOf && crewOf.id === from)) return;
      var p = fromChart(d.cx, d.cy, d.hc);
      if (!p) { delete seaPeers[from]; return; }
      var o = seaPeers[from] || (seaPeers[from] = { x: p.x, r: p.r, h: p.h, v: 0, bump: 0, heel: 0, sheet: 1, boom: 0.6, side: 1, hoist: 1, eff: 1, off: 1.6, rudder: 0 });
      o.tx = p.x; o.tr = p.r; o.th = p.h; o.v = d.v || 0; o.name = d.name; o.suit = d.suit; o.heel = d.heel || 0; o.boom = d.boom || 0.6; o.side = d.side || 1;
      o.spec = typeof BridgeFleet !== 'undefined' && d.type ? BridgeFleet.spec(d.type) : SLOOP; o.at = performance.now();
      if (d.k !== o.kitS) { o.kitS = d.k; o.kit = typeof d.k === 'string' ? unkit(d.k) : null; }      // her guns and fittings
      o.rs = d.rs; o.rg = d.rg; o.rf = d.rf;                           // racing: which race, how far she's still to go, her time
    });
  }
  // what your ship carries, for the others to draw her with: 'gun,gun|fitting,fitting' (and back)
  function kitMsg() {
    var a = typeof BridgeFleet !== 'undefined' ? BridgeFleet.active().ship : null;
    return a ? (a.guns || []).join(',') + '|' + (a.fits || []).join(',') : '';
  }
  function unkit(k) {
    var p = String(k || '').split('|'), fits = (p[1] || '').split(',').filter(Boolean);
    return { guns: (p[0] || '').split(',').filter(Boolean), fits: fits, ward: fits.indexOf('moon_lantern') >= 0 };
  }
  // a chart point on your water (chartPos the other way): the chart is the world at a fixed scale, the same for everyone,
  // so another boat's chart position is simply where she is on yours (and headings need no turning)
  function fromChart(cx, cy, hc) {
    if (!running || !A || !pa) return null;
    var w = toWorld(cx, cy);
    return { x: w.x, r: w.r, h: hc };
  }
  function chartHeading() { return boat.h; }
  // each frame: the helm to your crew; where you are to anyone else at sea
  function broadcast(now) {
    var n = net();
    if (!n || !boat || phase === 'load') return;
    if (crewOf && now - helmAt > 100) { helmAt = now; n.send('helm', helmState(now), crewOf.id); }
    if (!captainOf && now - seaAt > 250 && n.peers().some(function (p) { return p.act === 'sailing'; })) {
      seaAt = now;
      var cp = chartPos(), me = n.me(), act = typeof BridgeFleet !== 'undefined' ? BridgeFleet.active().ship : null;
      if (cp) n.send('sea', { cx: cp.x, cy: cp.y, hc: chartHeading(), v: boat.v, heel: boat.heel, boom: boat.boom, side: boat.side,
                              type: act ? act.type : 'sloop', name: me && me.name, suit: suitOf(), k: kitMsg(),
                              rs: race ? race.spec.id : undefined, rg: raceOn() ? Math.round(togo()) : undefined, rf: race && race.done ? Math.round(race.ms) : undefined });
    }
    Object.keys(seaPeers).forEach(function (id) {                    // ease theirs toward where they said they were
      var o = seaPeers[id];
      if (now - o.at > 4000) { delete seaPeers[id]; return; }
      var k = 0.12;
      o.x += (o.tx - o.x) * k; o.r += (o.tr - o.r) * k; o.h = wrap(o.h + wrap(o.th - o.h) * k);
    });
  }
  function suitOf() { return typeof BridgeCharacter !== 'undefined' ? String(BridgeCharacter.sportKey()).replace(/^(sit|ski|climb)-/, '') : 'purple'; }
  onNet();
  // asking someone aboard (their menu, js/multi.js): they say yes, you cast off, and their passage follows yours
  function invite(id) {
    var n = net(), w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId(), act = typeof BridgeFleet !== 'undefined' ? BridgeFleet.active().ship : null;
    if (!n || !w || running) return;
    n.send('sail-ask', { from: w, shipName: act ? act.name : 'your sloop', type: act ? act.type : 'sloop' }, id);
    if (typeof BridgeQuests !== 'undefined') BridgeQuests.toast('Sail together', 'Asking ' + cap(n.peer(id) ? n.peer(id).name : 'them'), 'You cast off when they come aboard', false);
  }
  function wireInvites() {
    var n = typeof BridgeNet !== 'undefined' ? BridgeNet : null;
    if (!n) return;
    n.on('sail-ask', function (d, from) {
      var p = n.peer(from), who = cap(p ? p.name : 'Someone');
      if (running || !d || typeof BridgeInteractions === 'undefined') { n.send('sail-no', {}, from); return; }
      BridgeInteractions.choose({ title: who + ' asks you aboard', text: ('Sail together on the ' + d.shipName + '? ' + who + ' has the helm; you can fish over the side.').toUpperCase(),
        buttons: [{ label: 'Come aboard', act: function () { n.send('sail-yes', { suit: suitOf() }, from); } },
                  { label: 'Not now', act: function () { n.send('sail-no', {}, from); } }], closeLabel: 'Not now' });
    });
    n.on('sail-yes', function (d, from) {
      var p = n.peer(from), w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId();
      if (running || !w || !knows(w)) return;
      start(w, null, { crewWith: { id: from, name: p ? p.name : 'your mate', suit: d && d.suit || 'purple' } });
    });
    n.on('sail-no', function (d, from) { var p = n.peer(from); if (typeof BridgeQuests !== 'undefined') BridgeQuests.toast('Sail together', cap(p ? p.name : 'They') + ' said not now', '', false); });
    n.on('sail-go', function (d, from) {
      var p = n.peer(from);
      if (running || !d) return;
      start(d.from, d.to, { crew: { id: from, name: p ? p.name : 'the captain', suit: d.suit, type: d.type, shipName: d.shipName, wind: d.wind, kit: d.kit } });
    });
  }
  wireInvites();
  window.addEventListener('load', function () {
    if (typeof BridgeMulti === 'undefined') return;
    BridgeMulti.addMenu(function (id, p, remote) {
      var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId();
      if (remote || !p || running || !w || !knows(w) || !BridgeMulti.others()[id]) return [];
      return [{ label: 'Sail together', act: function () { invite(id); } }];
    });
  });

  function seaName(pal) { return { emerald: 'the Emerald Sea', crimson: 'the Crimson Sea', rose: 'the Rose Sea', sapphire: 'the Sapphire Sea', midnight: 'the Midnight Sea' }[pal] || 'open water'; }

  var CAST = { board: 1400, lines: 2300, push: 3300, sail: 5000 };       // ms into the cast-off
  var MOOR = { lines: 1300, off: 2000, done: 3200 };                       // ms into coming alongside
  function moor(I) {
    moorFor(I.id);                                   // her berth there, ready for when you climb out (the world draws her)
    dockAt = I; B = I; course = to = I.id;
    phase = 'moor'; phaseAt = performance.now();
    sfx('door');
  }
  // over a seam into another sea: its story, once a passage (it has to stick a moment - the seam wanders)
  function crossing(here, now) {
    if (phase !== 'sail' || here === seaWas) { seaSeen.pal = null; return; }
    if (seaSeen.pal !== here) { seaSeen = { pal: here, at: now }; return; }
    if (now - seaSeen.at < 1200) return;
    if (seaWas && !told[here]) say('Over the seam, foam all round the bow. ' + LORE[here], 6000);
    else if (!told[here]) say(LORE[here], 5600);
    told[here] = true;
    seaWas = here;
  }
  // an island coming up over the horizon: one you've no chart for is just land, and stays nameless till you tie up
  function landHo() {
    for (var id in isl) {
      var I = isl[id];
      if (I === A || said['ho:' + id] || ellipseK(shapeOf(id), boat.x, boat.r, 34) > 1) continue;
      said['ho:' + id] = 1;
      if (I.uncharted) { say('Land ho! An island on the horizon - one you\'ve no chart for.', 4600); sfx('bell'); }
      else if (id !== course) say(I.name + ' comes up over the horizon.', 3200);
    }
  }
  // the uncharted island you're closest to, if you're near enough to see it (the panel says so)
  function unchartedNear() {
    for (var id in isl) if (isl[id].uncharted && ellipseK(shapeOf(id), boat.x, boat.r, 40) < 1) return isl[id];
    return null;
  }
  // fishing over the side (js/fishing.js runs the rod; drawRod below draws the line off her rail)
  var castSide = 0;
  function fishHere() {
    keys = {}; castSide = Math.random() - 0.5;
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null, ship = F && shipId && F.get(shipId);
    BridgeFishing.open({ pool: 'sea_' + seaHere(), boat: true, hold: ship ? {
      room: function () { return F.catchCount(ship) < F.fishCap(ship); },
      put: function (id) { return F.stowFish(ship, id); },
      count: function () { return [F.catchCount(ship), F.fishCap(ship)]; } } : null });
  }
  function holdCount() {
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null, ship = F && shipId && F.get(shipId);
    return ship ? [F.catchCount(ship), F.fishCap(ship)] : null;
  }
  // tying up with fish in her hold: sell them on the quay, carry them ashore, or leave them aboard for another port
  function landThen(dest, fn) {
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null, T = typeof BridgeTrade !== 'undefined' ? BridgeTrade : null;
    var ship = F && shipId && F.get(shipId), say2 = function (a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); };
    if (!ship || !T || !F.catchCount(ship)) { fn(); return; }
    var market = !!T.port(dest), v = market ? T.catchValue(ship, dest) : 0, opts = [];
    if (market) opts.push(['Sell it on the quay — ' + v + ' coins', function () {
      T.sellCatch(ship, dest).then(function (r) { if (r.ok) { sfx('coin'); say2('Catch sold', r.n + ' fish on the quay', '+' + r.total + ' coins'); } fn(); });
    }]);
    opts.push(['Carry it ashore', function () { var r = T.carryCatch(ship); sfx('pickup'); say2('Catch ashore', r.moved + ' fish into your pack', r.left ? r.left + ' still aboard' : ''); fn(); }]);
    opts.push(['Leave it in the hold', fn]);
    ask('Landing the catch', (T.catchList(ship) + ' in the fish hold.').toUpperCase(), opts, fn);
  }
  function seaFishTold(set) {
    try { if (set) localStorage.setItem('bridge_sea_fish', '1'); return localStorage.getItem('bridge_sea_fish') === '1'; } catch (e) { return true; }
  }
  function haul(o) {
    o.got = true;
    gotKeys[o.key] = 1;
    if (crewOf && net()) net().send('haul', { key: o.key }, crewOf.id);
    burst(o.x, o.r, 8, 'spray');
    sfx('pickup');
    var r = hash(o.seed + Date.now() % 97);
    var salv = (r >= 0.45 && r < 0.6) || r > 0.96 ? typeof BridgeWorkshop !== 'undefined' && BridgeWorkshop.salvage(r) : null;   // a ship's stores gone over the side (js/workshop.js)
    if (r < 0.45 && typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) {
      var n = 8 + Math.floor(r * 40);
      BridgeProgression.awardCoins(n, 'sloop:flotsam');
      say('Inside the ' + o.kind + ': ' + n + ' coins in an oilskin purse', 3000);
    } else if (salv && typeof BridgeInventory !== 'undefined' && BridgeInventory.addItem) {
      var got = BridgeInventory.addItem(salv[0], salv[1]), what = BridgeItems.get(salv[0]);
      say(got === false ? 'Your pack is full — you let it drift' : /^plan_/.test(salv[0]) ? 'Inside the ' + o.kind + ', in an oilskin tube: ' + what.name.toLowerCase()
                                                               : 'Inside the ' + o.kind + ': ' + (salv[1] > 1 ? salv[1] + ' × ' : '') + what.name.toLowerCase() + ', a ship\'s stores gone over the side', 3500);
    } else if (typeof BridgeInventory !== 'undefined' && BridgeInventory.addItem) {
      var item = r < 0.75 ? 'sea_glass' : 'silver_nail';
      var ok = BridgeInventory.addItem(item, r < 0.75 ? 2 : 1);
      say(ok === false ? 'Your pack is full — you let it drift' : 'Inside the ' + o.kind + ': ' + (item === 'sea_glass' ? 'sea glass, wrapped in sailcloth' : 'a tin of silver nails'), 3000);
    }
  }
  // what the fishermen say about the legend in the water they're fishing (one turn in three)
  var LEGEND = {
    emerald: 'Old Mossback took my best line off here last spring. Green moss glowing on his back like a town at night. Older than the capital, and he knows it.',
    sapphire: 'Saw a Crownfin break the surface at dawn - crystal on its back like the Queen\'s own crown. Touched my cap. You do, for those.',
    rose: 'Stay out till first light and watch for the Dawnveil. A great pink ray, flying under the water, fins trailing like a bride\'s.',
    crimson: 'There\'s a pike out here with a mouth like a furnace. I won\'t say its name aboard. Cast long and keep your hands clear.',
    midnight: 'Something old lives under the Midnight Sea. Glass and stars, my grandmother said. Nobody\'s landed one that anyone remembers.'
  };
  function hail(o) {
    var turn = o.seed + Math.floor(Date.now() / 60000), lg = LEGEND[seaHere()];
    var line = lg && turn % 3 === 0 ? lg : LINES[turn % LINES.length];
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
    var ts = Date.now() / 1000;                                       // other sloops on their loops: where they are is when it is,
    traffic.forEach(function (o) {                                   // so everyone sees them in the same place
      var a = o.a0 + o.w * ts, sg = o.w > 0 ? 1 : -1, x = o.cx + Math.cos(a) * o.R, r = o.cr + Math.sin(a) * o.R * 0.8;
      var d = Math.hypot(x - b.x, r - b.r);
      if (d < 4.5) { x += (x - b.x) / (d || 1) * (4.5 - d); r += (r - b.r) / (d || 1) * (4.5 - d); }   // and they keep clear of you
      o.x = x; o.r = r; o.h = Math.atan2(Math.cos(a) * 0.8 * sg, -Math.sin(a) * sg);
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
    // the whale: once a passage, well out in open water, off whichever beam is clear (the whales keep to kinder water)
    if (!whale.done && !whale.at && openT > whale.after && CALM[seaHere()] && phase === 'sail') {
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

  // The sea under the camera: the chart's regions (seaField) sampled on a grid of SEAG px, the sea most of the screen
  // is in drawn whole, each other sea over it clipped to its region (marching squares, so the seam runs smooth between
  // the samples), and churning foam all along the seams where they meet.
  var SEAG = 16;
  function drawSeas(now) {
    var G = SEAG, gx0 = Math.floor(cam.x / G) - 1, gy0 = Math.floor(cam.y / G) - 1;
    var nx = Math.ceil(W / G) + 3, ny = Math.ceil(H / G) + 3, Dn = new Array(nx * ny), count = {};
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var D = seaField((gx0 + i) * G / TS, (gy0 + j) * G / TS, {}), best = nearest(D);
      Dn[j * nx + i] = D; count[best] = (count[best] || 0) + 1;
    }
    var pals = Object.keys(count).sort(function (p, q) { return count[q] - count[p]; });
    BridgeSea.drawSeaAt(bctx, W, H, now, pals[0], cam.x, cam.y);
    for (var q = 1; q < pals.length; q++) {
      var pal = pals[q], F = new Array(nx * ny), segs = [];
      for (var k = 0; k < F.length; k++) {                         // < 0 inside this sea: how much nearer it is than the next
        var Dk = Dn[k], o = 1e9;
        for (var p in Dk) if (p !== pal && Dk[p] < o) o = Dk[p];
        F[k] = Dk[pal] - o;
      }
      bctx.save();
      bctx.beginPath();
      for (var cj = 0; cj < ny - 1; cj++) for (var ci = 0; ci < nx - 1; ci++) {
        var ks = [cj * nx + ci, cj * nx + ci + 1, (cj + 1) * nx + ci + 1, (cj + 1) * nx + ci], v = [F[ks[0]], F[ks[1]], F[ks[2]], F[ks[3]]];
        if (v[0] >= 0 && v[1] >= 0 && v[2] >= 0 && v[3] >= 0) continue;
        var X0 = (gx0 + ci) * G - cam.x, Y0 = (gy0 + cj) * G - cam.y, cs = [[X0, Y0], [X0 + G, Y0], [X0 + G, Y0 + G], [X0, Y0 + G]];
        var poly = [], cut = [];
        for (var c = 0; c < 4; c++) {
          var c2 = (c + 1) % 4;
          if (v[c] < 0) poly.push(cs[c]);
          if ((v[c] < 0) !== (v[c2] < 0)) {
            var tt = v[c] / (v[c] - v[c2]), pt = [cs[c][0] + (cs[c2][0] - cs[c][0]) * tt, cs[c][1] + (cs[c2][1] - cs[c][1]) * tt];
            poly.push(pt); cut.push(pt);
          }
        }
        poly.forEach(function (pt, m) { if (m) bctx.lineTo(pt[0], pt[1]); else bctx.moveTo(pt[0], pt[1]); });
        bctx.closePath();
        if (cut.length >= 2) segs.push([cut[0], cut[1]]);
        if (cut.length === 4) segs.push([cut[2], cut[3]]);
      }
      bctx.clip();
      BridgeSea.drawSeaAt(bctx, W, H, now, pal, cam.x, cam.y);
      bctx.restore();
      // the seam: churning foam where the seas meet, in both seas' foam
      var Pf = BridgeSea.palettes[pal] || BridgeSea.palettes.emerald, Qf = BridgeSea.palettes[pals[0]] || Pf;
      segs.forEach(function (sg) {
        var L = Math.hypot(sg[1][0] - sg[0][0], sg[1][1] - sg[0][1]), n = Math.max(1, Math.round(L / 2.2));
        for (var m = 0; m < n; m++) {
          var f = (m + 0.5) / n, X = sg[0][0] + (sg[1][0] - sg[0][0]) * f, Y = sg[0][1] + (sg[1][1] - sg[0][1]) * f;
          var id = Math.round((X + cam.x) * 0.37 + (Y + cam.y) * 1.13), w = Math.sin(now / 300 + id * 1.7);
          var off = Math.round(Math.sin(now / 700 + id) * 3);
          bctx.fillStyle = 'rgba(' + (w > 0 ? Pf.foam : Qf.foam) + ',' + (0.35 + 0.35 * Math.abs(w)).toFixed(2) + ')';
          bctx.fillRect(Math.round(X) + off, Math.round(Y) - off, w > 0.6 ? 3 : 2, 1);
        }
      });
    }
  }

  var iso = null, isoCtx = null;                // an island and its water, drawn apart to be feathered into the sea
  function drawIsland(I, now) {
    if (!I || !I.sc) return;
    var offX = Math.round(I.ox * TS - cam.x), offY = Math.round(I.oy * TS - cam.y), m = I.sc.meta;
    if (offX - m.originX > W || offY - m.originY > H || offX - m.originX + m.width < 0 || offY - m.originY + m.height < 0) return;
    var out = bctx, cw = bctx.canvas.width, ch = bctx.canvas.height;
    if (I.feather) {
      if (!iso || iso.width !== cw || iso.height !== ch) {
        iso = document.createElement('canvas'); iso.width = cw; iso.height = ch;
        isoCtx = iso.getContext('2d'); isoCtx.imageSmoothingEnabled = false;
      }
      isoCtx.clearRect(0, 0, cw, ch);
      out = isoCtx;
    }
    BridgeScene.drawBackground(out, I.sc, I.world || {}, offX, offY, now);
    if (BridgeSea.drawWaterAt) BridgeSea.drawWaterAt(out, I.sc, offX, offY, now, I.pal, cam.x, cam.y);
    if (out === bctx) return;
    isoCtx.globalCompositeOperation = 'destination-in';
    isoCtx.drawImage(I.feather, offX - m.originX, offY - m.originY);
    isoCtx.globalCompositeOperation = 'source-over';
    bctx.drawImage(iso, 0, 0);
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
    var P = BridgeSea.palettes[seaHere()] || BridgeSea.palettes.emerald;
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
  // a sail: luff from tack to head, the leech from head to clew bellied out (and flogging when it luffs), shaded;
  // crystal-weave (`glint`) has rose seams and crystal threads catching the light
  function sail(P, tack, head, clew, lee, flog, now, tone, cloth, glint) {
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
    for (var sm = 1; sm < 4; sm++) {
      var f2 = sm / 4, l0 = pts[Math.round(f2 * n)], l1 = pts[n + Math.round((1 - f2) * (n - 1))];
      if (l0 && l1) line(l0, l1, glint ? 'rgba(255,170,220,0.5)' : 'rgba(60,54,70,0.35)');
    }
    if (glint) sparkle(function (a, g) { var l = pts[1 + Math.floor(a * (n - 2))], r = pts[n + (n - 1 - Math.floor(a * (n - 2)))]; return l && r && [l[0] + (r[0] - l[0]) * g, l[1] + (r[1] - l[1]) * g]; }, now, 7);
    for (var e = 0; e < pts.length; e++) {
      var p0 = pts[e], p1 = pts[(e + 1) % pts.length];
      line(p0, p1, '#2c2634');
    }
  }
  // crystal threads in the cloth catching the light: a pixel here and there twinkling (at(a, g): a point on the cloth)
  function sparkle(at, now, n) {
    for (var i = 0; i < n; i++) {
      var tw = Math.sin(now / 240 + i * 2.39 + hash(i) * 6);
      if (tw < 0.55) continue;
      var p = at(hash(i * 3.1 + 1), 0.15 + hash(i * 5.3 + 2) * 0.7);
      if (!p) continue;
      var x = Math.round(p[0]), y = Math.round(p[1]);
      bctx.fillStyle = tw > 0.9 ? '#ffffff' : '#ffd4ee'; bctx.fillRect(x, y, 1, 1);
      if (tw > 0.93) { bctx.fillStyle = 'rgba(255,214,240,0.75)'; bctx.fillRect(x - 1, y, 3, 1); bctx.fillRect(x, y - 1, 1, 3); }
    }
  }
  var CRYSTAL = ['#f4e6f2', '#d6bcd8', '#9c86aa'];                      // crystal-weave: rose-silver spore silk
  // storm rigging (Crimson's): the shrouds doubled, ratlines across them, backstays from the masthead aft, tarred black
  function stormRig(P, m, mu, deck, bw) {
    var TAR = 'rgba(20,12,12,0.9)';
    [-1, 1].forEach(function (s) {
      var foot = [P(mu - 0.22, s * bw * 0.93, deck - 0.24, true), P(mu + 0.2, s * bw * 0.93, deck - 0.24, true)];
      line(P(mu, 0, deck + m.h * 0.8, true), foot[0], TAR);
      line(P(mu, 0, deck + m.h * 0.78, true), foot[1], TAR);
      for (var j = 1; j <= 4; j++) {                                  // the ratlines: rungs up the shrouds
        var f = j / 5.5;
        line(P(mu - 0.22 * (1 - f), s * bw * 0.93 * (1 - f), deck - 0.24 + (m.h * 0.8 + 0.24) * f, true),
             P(mu + 0.2 * (1 - f), s * bw * 0.93 * (1 - f), deck - 0.24 + (m.h * 0.78 + 0.24) * f, true), 'rgba(40,26,20,0.75)');
      }
      line(P(mu, 0, deck + m.h * 0.97, true), P(mu - Math.min(1.6, m.h * 0.38), s * bw * 0.8, deck - 0.1, true), 'rgba(28,16,14,0.8)');   // a backstay
    });
  }
  // the moon lantern at the masthead: a lantern of moonglass in an iron frame, its cold light breathing
  function moonLantern(top, t) {
    var x = Math.round(top[0]), y = Math.round(top[1]) + 4, pulse = 0.8 + 0.2 * Math.sin(t * 2.2);
    bctx.save(); bctx.globalCompositeOperation = 'lighter';
    for (var gl = 4; gl >= 1; gl--) { bctx.fillStyle = 'rgba(170,196,255,' + (0.045 * (5 - gl) * pulse).toFixed(3) + ')'; disc(x, y + 1, gl * 4, gl * 4); }
    bctx.restore();
    bctx.fillStyle = '#10101a'; bctx.fillRect(x - 2, y - 2, 5, 6);              // the frame
    bctx.fillStyle = '#9ec2ff'; bctx.fillRect(x - 1, y - 1, 3, 4);              // the glass
    bctx.fillStyle = '#eef6ff'; bctx.fillRect(x, y, 1, 2); bctx.fillRect(x - 1, y - 1, 1, 1);
    bctx.fillStyle = '#10101a'; bctx.fillRect(x - 1, y - 3, 3, 1); bctx.fillRect(x, y - 4, 1, 1);   // the cap and its ring
  }
  // its light on the water round her: a pool of moonlight (strong at night and on the Midnight Sea, faint by day) with
  // the wavelets in it catching it, fixed to the water so they slip past as she sails
  function moonPool(b, at, sp, now) {
    var W0 = skyNow(), night = W0 ? 1 - W0.day : 1, mid = (b === boat ? seaHere() : palAt(b.x, b.r)) === 'midnight';
    var k = (0.25 + 0.75 * night) * (mid ? 1.45 : 1), R = (sp.L * 0.5 + 1.6) * TS, cx = Math.round(at[0]), cy = Math.round(at[1]) + 2;
    bctx.save(); bctx.globalCompositeOperation = 'lighter';
    for (var g = 4; g >= 1; g--) { bctx.fillStyle = 'rgba(140,170,255,' + (0.021 * (5 - g) * k).toFixed(3) + ')'; disc(cx, cy, Math.round(R * g / 4), Math.round(R * g / 4 * 0.52)); }
    var G = 0.7, gx0 = Math.floor((b.x - R / TS) / G), gx1 = Math.ceil((b.x + R / TS) / G), gr0 = Math.floor((b.r - R / TS * 0.52) / G), gr1 = Math.ceil((b.r + R / TS * 0.52) / G);
    for (var i = gx0; i <= gx1; i++) for (var j = gr0; j <= gr1; j++) {
      var hh = hash(i * 31.7 + j * 57.3);
      if (hh > 0.22) continue;
      var wx = (i + hash(i + j * 13.1)) * G, wr = (j + hash(j * 7.7 + i)) * G, X = sx(wx), Y = sy(wr);
      var e = Math.hypot((X - cx) / R, (Y - cy) / (R * 0.52));
      if (e > 1) continue;
      var tw = Math.sin(now / 380 + hh * 60);
      if (tw < 0.4) continue;
      bctx.fillStyle = 'rgba(200,220,255,' + ((0.25 + 0.5 * (tw - 0.4)) * (1 - e) * Math.min(1, k)).toFixed(2) + ')';
      bctx.fillRect(X, Y, tw > 0.85 ? 2 : 1, 1);
    }
    bctx.restore();
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
    if (H && !H.img && !H.failed && !H.loading) loadHull(sp.sheet, function () {});     // (a pirate's hull, the first time one's seen)
    // what she's fitted (js/shipkit.js), on her own sheet only: guns at the rails, her hull's bands, her rig's extras
    var kit = typeof BridgeShipKit !== 'undefined' && (!H || H.img) ? BridgeShipKit.kitOf(b) : null;
    var tallest = rg.masts.reduce(function (m, x) { return x.h > m.h ? x : m; }, rg.masts[0]);
    if (kit ? kit.moon : sp.ward) moonPool(b, P(-L2 + tallest.f * sp.L, 0, 0), sp, now);
    if (H && H.img) {
      var cp = H.cell * 32;
      skyBlit(tinted(H.img, b.tint), (hi % 8) * cp, Math.round(H.oy + Math.floor(hi / 8) * cp), cp, cp, X - cp / 2, Y - Math.round(H.cy * 32), cp, cp);
    } else {
      var cc = cell(Math.floor(hi / 8), hi % 8), sz = Math.round(128 * k);
      skyBlit(tinted(sheetImg, b.tint), cc[0], cc[1], 128, 128, X - Math.round(64 * k), Y - Math.round(83 * k), sz, sz);
    }
    if (kit) BridgeShipKit.hull(bctx, b, X, Y, hi, now, skyBlit);
    var Pal = BridgeSea.palettes[b === boat ? seaHere() : palAt(b.x, b.r)] || BridgeSea.palettes.emerald;
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
    var tone = 0.5 + 0.5 * Math.cos(wrap(b.h + lee * boom - 2.3)), cloth = b.cloth || (kit && kit.crystal ? CRYSTAL : null), glint = !!(kit && kit.crystal);
    var drawList = [{ row: pilotRow, draw: function () {
      if (wheel) {                                                    // the wheel on her quarterdeck
        var wc = P(hs[0] + 0.32, 0, hz + 0.55);
        bctx.fillStyle = '#4a3018'; disc(wc[0], wc[1], 4, 4); bctx.fillStyle = '#2a1a0c'; disc(wc[0], wc[1], 2, 2);
      }
      var mate = !bb && (crewOf || captainOf), cu = wheel ? 0 : hs[0] + 0.75 * k, cv = wheel ? bw * 0.55 : -hs[1];
      var mateSeat = mate ? P(cu, cv, wheel ? hz : 0.12) : null;
      if (b.crew) drawCrew(seat, b, now);
      else if (b.suit) (wheel ? drawHelmsman : drawPilot)(seat, b, now, b.suit);                      // another player's boat
      else if (!b.empty) (wheel ? drawHelmsman : drawPilot)(seat, b, now, captainOf ? captainOf.suit : null);   // aboard theirs: they have the helm
      if (mate) (wheel ? drawHelmsman : drawPilot)(mateSeat, b, now, crewOf ? crewOf.suit : null);  // your mate (or you, aboard theirs)
      if (!bb && !b.empty && fishingOpen()) drawRod(b, captainOf ? mateSeat : seat, captainOf ? cu : hs[0], bw, wheel && !captainOf, now);
    } }];
    rg.masts.forEach(function (m) {
      var mu = -L2 + m.f * sp.L, deck = m.z != null ? m.z + 0.3 : rg.deck;   // (a mast on the quarterdeck stands higher)
      drawList.push({ row: P(mu, 0, 0)[2], draw: function () {
        var foot = P(mu, 0, deck - 0.3, true), top = P(mu, 0, deck + m.h, true);
        line(P(mu, 0, deck + m.h * 0.82, true), P(mu, -bw * 0.95, deck - 0.24, true), 'rgba(30,24,20,0.8)');     // shrouds
        line(P(mu, 0, deck + m.h * 0.82, true), P(mu, bw * 0.95, deck - 0.24, true), 'rgba(30,24,20,0.8)');
        if (kit && kit.storm) stormRig(P, m, mu, deck, bw);
        line(foot, top, '#3a2614', m.h > 4 ? 3 : 2);
        line([foot[0] + 1, foot[1]], [top[0] + 1, top[1]], '#6a4a2a');
        if (m === tallest) {                                          // the pennant at the main truck, streaming downwind
          var dw = wind.now + Math.PI, fl = Math.sin(t * 14) * 0.1;
          var royal = b.ship && typeof BridgeCrown !== 'undefined' && BridgeCrown.captain();              // the Crown's captain flies gold
          poly([top, [top[0] + Math.cos(dw + fl) * 9 * Math.sqrt(k), top[1] + Math.sin(dw + fl) * 9 * C45 * Math.sqrt(k)], [top[0], top[1] + 3]], royal ? '#e0b040' : '#c83a2e');
          if (royal) poly([top, [top[0] + Math.cos(dw + fl) * 5 * Math.sqrt(k), top[1] + Math.sin(dw + fl) * 5 * C45 * Math.sqrt(k)], [top[0], top[1] + 2]], '#2a7a4a');
          if (kit ? kit.moon : sp.ward) moonLantern(top, t);          // the moon lantern at the masthead
        }
        if (m.square) squareMast(P, b, sp, m, mu, deck, lee, boom, hoist, tone, now, cloth, glint);
        else foreAft(P, b, m, mu, deck, lee, boom, hoist, tone, now, cloth, glint);
      } });
    });
    if (kit) BridgeShipKit.guns(bctx, b, rig({ x: b.x, r: b.r, h: hi / 32 * Math.PI * 2, side: 1, heel: 0 }, bob), hi, now, skyBlit, drawList);   // at her sprite's heading
    drawList.push({ row: P(L2 * 0.9, 0, 0)[2], draw: function () {
      var fore = rg.masts.reduce(function (m, x) { return x.f > m.f ? x : m; }, rg.masts[0]), fu = -L2 + fore.f * sp.L;
      var bow = rg.bow || deck, nose = [-L2 + (1 + (rg.bowsprit || 0)) * sp.L, 0, bow - 0.12];
      if (rg.bowsprit) line(P(L2 - 0.1, 0, bow - 0.05, true), P(nose[0], 0, nose[2], true), '#4a3018', 2);
      line(P(fu, 0, deck + fore.h, true), P(nose[0], 0, nose[2], true), 'rgba(30,24,20,0.85)');                 // the forestay
      if (hoist > 0.05) rg.jibs.forEach(function (j, ji) {
        var tu = -L2 + j.tack * sp.L, ja = Math.min(boom * 0.85 + 0.1, 1.2), jl = (j.tack - j.head) * sp.L * 0.9 + 0.3;
        sail(P, [tu, 0, bow - 0.17], [-L2 + j.head * sp.L, 0, bow - 0.17 + j.h * hoist],
             [tu - Math.cos(ja) * jl, lee * Math.sin(ja) * jl, bow - 0.07], lee, b.luff, now + 200 + ji * 70, tone, cloth, glint);
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
  // ---- by day (js/clock.js): the sheets are rendered in moonlight; a daylight and a dusk copy of each, made once, are
  // laid over them by Lumar's sky (`daySea`, set as she casts off)
  var daySea = false, skyAt = 0, skyW = null;
  function skyNow() {
    var t = Date.now();
    if (t - skyAt > 250) {
      skyAt = t;
      skyW = daySea && typeof BridgeClock !== 'undefined' ? BridgeClock.weights('lumar') : null;
      if (skyW && skyW.day < 0.003 && skyW.dusk < 0.003) skyW = null;
    }
    return skyW;
  }
  function daylit(c) {
    if (c.__lit) return c.__lit;
    function make(gamma, k) {
      var o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
      var x = o.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0);
      var id = x.getImageData(0, 0, o.width, o.height), d = id.data;
      for (var i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        for (var j = 0; j < 3; j++) d[i + j] = Math.min(255, Math.round(255 * Math.pow(d[i + j] / 255, gamma) * k[j]));
      }
      x.putImageData(id, 0, 0);
      return o;
    }
    c.__lit = { day: make(0.6, [1.08, 1.06, 1.0]), dusk: make(0.76, [1.22, 0.94, 0.82]) };
    return c.__lit;
  }
  /** drawImage, with the day and dusk copies over it as the sky is now. */
  function skyBlit(img, sx0, sy0, sw, sh, dx, dy, dw, dh) {
    bctx.drawImage(img, sx0, sy0, sw, sh, dx, dy, dw, dh);
    var W = skyNow();
    if (!W || !img || !img.getContext) return;
    var L = daylit(img), a0 = bctx.globalAlpha, aD = W.dusk + W.night > 0 ? W.dusk / (W.dusk + W.night) : 0;
    if (W.day < 0.995 && aD > 0.003) { bctx.globalAlpha = a0 * aD; bctx.drawImage(L.dusk, sx0, sy0, sw, sh, dx, dy, dw, dh); }
    if (W.day > 0.003) { bctx.globalAlpha = a0 * W.day; bctx.drawImage(L.day, sx0, sy0, sw, sh, dx, dy, dw, dh); }
    bctx.globalAlpha = a0;
  }
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
  function foreAft(P, b, m, mu, deck, lee, boom, hoist, tone, now, cloth, glint) {
    var goose = [mu, 0, deck], clew = [mu - Math.cos(boom) * m.boom, lee * Math.sin(boom) * m.boom, deck + 0.08];
    var head = [mu, 0, deck + m.sail * hoist];
    if (hoist > 0.05) sail(P, goose, head, clew, lee, b.luff, now, tone, cloth, glint);
    else {
      var cl = (cloth || CLOTH[2]);
      line(P(goose[0], goose[1], goose[2] + 0.08, true), P(clew[0], clew[1], clew[2] + 0.08, true), cl[1], 3);
      line(P(goose[0], goose[1], goose[2] + 0.12, true), P(clew[0], clew[1], clew[2] + 0.12, true), cl[0], 1);
      for (var ti = 1; ti < 4; ti++) { var f = ti / 4, tp = P(goose[0] + (clew[0] - goose[0]) * f, goose[1] + (clew[1] - goose[1]) * f, deck + 0.12, true); bctx.fillStyle = '#5a3a1a'; bctx.fillRect(Math.round(tp[0]), Math.round(tp[1]) - 1, 1, 3); }
    }
    line(P(goose[0], goose[1], goose[2], true), P(clew[0], clew[1], clew[2], true), '#4a3018', 2);
    line(P(clew[0], clew[1], clew[2], true), P(mu - m.boom - 0.2, 0, deck - 0.2), 'rgba(200,190,170,0.6)');
  }
  // a square-rigged mast: its yards braced round with the sheet (square across running, sharp up close-hauled), the
  // sails loosed down from them as she hoists, bellied out before the wind
  function squareMast(P, b, sp, m, mu, deck, lee, boom, hoist, tone, now, cloth, glint) {
    var phi = hoist < 0.05 ? Math.PI / 2 : 0.62 + (Math.PI / 2 - 0.62) * clamp(boom / 1.3, 0, 1), cp = Math.cos(phi), spn = Math.sin(phi);   // furled: squared away
    var cl = cloth || ['#e4dccb', '#c4bca9', '#948e82'];
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
               P(A1[0] + (B1[0] - A1[0]) * f4 + nu, A1[1] + (B1[1] - A1[1]) * f4 + nv, zb, true), glint ? 'rgba(255,170,220,0.5)' : 'rgba(60,54,70,0.3)');
        }
        if (glint) sparkle(function (a, g) { return P(A1[0] + (B1[0] - A1[0]) * a + nu * g, A1[1] + (B1[1] - A1[1]) * a + nv * g, zt - (zt - zb) * g, true); }, now + y[2] * 900, 6);
        for (var ed = 0; ed < pts.length; ed++) line(pts[ed], pts[(ed + 1) % pts.length], '#2c2634');
      } else {                                                       // furled: a fat roll along the yard
        line(P(A1[0], A1[1], zt - 0.08, true), P(B1[0], B1[1], zt - 0.08, true), cl[1], 3);
      }
      line(P(A1[0], A1[1], zt, true), P(B1[0], B1[1], zt, true), '#3a2614', 2);                     // the yard
      line(P(A1[0], A1[1], zt, true), P(mu - 0.4, -lee * w * 0.9, deck - 0.2, true), 'rgba(200,190,170,0.35)');   // the braces
      line(P(B1[0], B1[1], zt, true), P(mu - 0.4, lee * w * 0.9, deck - 0.2, true), 'rgba(200,190,170,0.35)');
    });
  }
  // your line over the side, toward the near rail (the one facing the camera), from the hand at the helm
  function drawRod(b, seat, u, bw, wheel, now) {
    var c = Math.cos(b.h), s = Math.sin(b.h), nx = c >= 0 ? -s : s, nr = c >= 0 ? c : -c;
    var k = { px: b.x + u * c + nx * bw, py: b.r + u * s + nr * bw, dx: nx, dy: nr, side: castSide, reach: [0.7, 2.6], wz: 0 };
    var hand = [seat[0] + Math.round(nx * 6), seat[1] - (wheel ? 18 : 14)];
    BridgeFishing.drawLine(bctx, k, hand, -cam.x, -cam.y, TS, now, [seat[0], seat[1] - 50]);
  }
  // the helm: the sloop's tiller seat on the windward bench, a big ship's wheel on her quarterdeck
  function helmOf(b) {
    var sp = b.spec || SLOOP, k = sp.L / 2.6;
    if (sp.L > 3.6) return [-sp.L / 2 + 0.16 * sp.L, 0];
    return [-0.82 * k, -b.side * 0.22 * (sp.beam || 1)];
  }
  // you standing at a big ship's wheel (the walking sheet, still)
  // People aboard take the island's moonlight like everyone ashore (js/scene.js tintAt): drawn raw they lit up white in
  // the boat and turned dark the moment they stepped onto the pier.
  var lightTint = null, tcv = null, tcx = null;
  function tintFor(I, world) {
    if (!I || !I.sc || !I.sc.meta || !I.sc.meta.tileLight || typeof BridgeScene === 'undefined' || !BridgeScene.tintAt) return null;
    try { return BridgeScene.tintAt(I.sc, world || {}, I.moor[0], I.moor[1] - 1, performance.now()); } catch (e) { return null; }
  }
  function drawLit(img, x0, y0, w, h, dx, dy) {
    if (!lightTint) { bctx.drawImage(img, x0, y0, w, h, dx, dy, w, h); return; }
    if (!tcv) { tcv = document.createElement('canvas'); tcx = tcv.getContext('2d'); }
    if (tcv.width < w || tcv.height < h) { tcv.width = Math.max(tcv.width, w); tcv.height = Math.max(tcv.height, h); }
    tcx.globalCompositeOperation = 'source-over'; tcx.clearRect(0, 0, w, h);
    tcx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
    tcx.globalCompositeOperation = 'multiply'; tcx.fillStyle = lightTint; tcx.fillRect(0, 0, w, h);
    tcx.globalCompositeOperation = 'destination-in'; tcx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
    tcx.globalCompositeOperation = 'source-over';
    bctx.drawImage(tcv, 0, 0, w, h, dx, dy, w, h);
  }
  function drawHelmsman(seat, b, now, suit) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.sportImage) return;
    var img = BridgeCharacter.sportImage(suit || BridgeCharacter.sportKey(), false);
    if (!img) return;
    var a = ((b.h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) % 4;
    drawLit(img, [0, 1, 2, 1][Math.floor(now / 340) % 4] * 32, [1, 0, 3, 2][q] * 48, 32, 48, Math.round(seat[0]) - 16, Math.round(seat[1]) - 45);
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
    drawLit(crewImg, [0, 1, 2, 1][Math.floor(now / 340 + b.seed) % 4] * 32, [1, 0, 3, 2][q] * 48, 32, 48, Math.round(seat[0]) - 16, Math.round(seat[1]) - 41);
  }
  // one of your hands on deck, standing their watch (sailors and dockhands, by turns)
  var handImgs = {};
  function drawHand(pt, b, now, i) {
    var sheet = ['npc-sailor', 'npc-dockhand'][i % 2], img = handImgs[sheet];
    if (!img) { img = handImgs[sheet] = new Image(); img.src = '/bridge/assets/characters/' + sheet + '.png'; }
    if (!img.complete || !img.naturalWidth) return;
    var a = ((b.h + (i % 3 - 1) * 1.2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) % 4;
    drawLit(img, [0, 1, 2, 1][Math.floor(now / 380 + i * 1.7) % 4] * 32, [1, 0, 3, 2][q] * 48, 32, 48, Math.round(pt[0]) - 16, Math.round(pt[1]) - 45);
  }
  // you on foot, stepping aboard or ashore (the walking sheet)
  function drawWalker(x, r, toward, now) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.sportImage) return;
    var img = BridgeCharacter.sportImage(BridgeCharacter.sportKey(), false);
    if (!img) return;
    var a = Math.atan2(toward[1] - r, toward[0] - x), q = ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4;
    var row = [1, 0, 3, 2][q], col = 4 + Math.floor(now / 90) % 8;
    drawLit(img, col * 32, row * 48, 32, 48, sx(x) - 16, sy(r) - 45);
  }
  function drawPilot(seat, b, now, suit) {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.sportImage) return;
    var img = BridgeCharacter.sportImage(suit ? 'sit-' + suit : BridgeCharacter.sportKey('sit'), false);
    if (!img) return;
    // facing the way the bow points, nearest of four
    var a = ((b.h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) % 4;
    var row = [1, 0, 3, 2][q];                                          // right, down, left, up → sheet rows
    var col = [0, 1, 2, 1][Math.floor(now / 340) % 4];
    drawLit(img, col * 32, row * 48, 32, 48, Math.round(seat[0]) - 16, Math.round(seat[1]) - 45 + 4);
  }

  function drawThing(o, now) {
    var t = now / 1000, X = sx(o.x), Y = sy(o.r);
    if (X < -80 || Y < -100 || X > W + 80 || Y > H + 60) return;
    var bob = o.kind === 'reef' || o.kind.indexOf('rock') === 0 ? 0 : Math.round(Math.sin(t * 1.7 + o.seed) * 1.2);
    var P = BridgeSea.palettes[o.pal || palAt(o.x, o.r)] || BridgeSea.palettes.emerald;
    if (o.kind === 'dory') {
      var hi = ((Math.round(o.h / (Math.PI * 2) * 8) % 8) + 8) % 8, cc = cell(4, hi);
      skyBlit(sheetImg, cc[0], cc[1], 128, 128, X - 64, Y - 83 + bob, 128, 128);
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
    skyBlit(sheetImg, cc2[0], cc2[1], 128, 128, X - 64, Y - 83 + bob, 128, 128);
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
    var P = BridgeSea.palettes[whale.pal || (whale.pal = palAt(whale.x, whale.r))] || BridgeSea.palettes.emerald;
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
  // the weather systems as you see them coming: a squall's dark, rough water under its grey curtain of rain; a fog bank's
  // pale bank of mist lying on the sea (drawn on the water, under everything; the rain and the mist themselves over it)
  function sysOnScreen(o, m) {
    var X = sx(o.x), Y = sy(o.r), rx = (o.rx + m) * TS, ry = (o.ry + m) * TS;
    return X + rx > -40 && X - rx < W + 40 && Y + ry > -80 && Y - ry < H + 40;
  }
  function drawWeatherWater(now) {
    sky.systems.forEach(function (o) {
      if (!sysOnScreen(o, 2)) return;
      var X = sx(o.x), Y = sy(o.r), t = now / 1000;
      bctx.save();
      if (o.kind === 'squall') {
        for (var m = 0; m < 5; m++) { bctx.fillStyle = 'rgba(14,16,26,' + (0.07 * o.k).toFixed(3) + ')'; disc(X, Y, o.rx * TS * (1 - m * 0.16), o.ry * TS * (1 - m * 0.16)); }
        bctx.fillStyle = 'rgba(200,210,225,' + (0.35 * o.k).toFixed(2) + ')';               // white caps whipped up under it
        for (var i = 0; i < 70; i++) {
          var a = hash(i + o.seed) * 6.28, d = Math.sqrt(hash(i * 3 + o.seed)), on = Math.sin(t * 3 + i * 1.9) > 0.55;
          if (on) bctx.fillRect(Math.round(X + Math.cos(a) * d * o.rx * TS * 0.9), Math.round(Y + Math.sin(a) * d * o.ry * TS * 0.9), 2, 1);
        }
      } else {
        for (var m2 = 0; m2 < 5; m2++) { bctx.fillStyle = 'rgba(132,138,160,' + (0.07 * o.k * (o.thick + 0.4)).toFixed(3) + ')'; disc(X, Y, o.rx * TS * (1 - m2 * 0.17), o.ry * TS * (1 - m2 * 0.17)); }
      }
      bctx.restore();
    });
  }
  function drawWeatherAir(now) {
    var t = now / 1000;
    sky.systems.forEach(function (o) {
      if (!sysOnScreen(o, 2)) return;
      var X = sx(o.x), Y = sy(o.r), rx = o.rx * TS, ry = o.ry * TS;
      bctx.save();
      if (o.kind === 'squall') {                                      // the curtain: rain falling out of it in grey streaks
        var dw = (wind.now || 0) + Math.PI, lean = Math.cos(dw) * 0.35;
        bctx.fillStyle = 'rgba(96,102,118,' + (0.14 * o.k).toFixed(3) + ')'; disc(X, Y - 18, rx * 0.95, ry * 0.95);
        bctx.fillStyle = 'rgba(205,210,225,' + (0.32 * o.k).toFixed(2) + ')';
        var n = Math.round(o.rx * o.ry * 1.1);
        for (var i = 0; i < n; i++) {
          var a = hash(i * 1.7 + o.seed) * 6.28, d = Math.sqrt(hash(i * 2.3 + o.seed + 5)), fall = ((t * 1.6 + hash(i + o.seed * 3)) % 1);
          var px = X + Math.cos(a) * d * rx, py = Y + Math.sin(a) * d * ry, h2 = 28;
          bctx.fillRect(Math.round(px + lean * fall * h2), Math.round(py - h2 + fall * h2), 1, 4 + (i % 3));
        }
      } else {                                                        // the fog: slow banks of mist rolling over the water
        bctx.globalCompositeOperation = 'screen';
        for (var j = 0; j < 7; j++) {
          var ax = X + (hash(j + o.seed) - 0.5) * rx * 1.3 + Math.sin(t * 0.13 + j) * 14, ay = Y + (hash(j * 5 + o.seed) - 0.5) * ry * 1.2 - 10;
          for (var m = 3; m >= 1; m--) { bctx.fillStyle = 'rgba(150,154,176,' + (0.05 * o.k * (o.thick + 0.4)).toFixed(3) + ')'; disc(ax, ay, rx * 0.22 * m, ry * 0.12 * m); }
        }
      }
      bctx.restore();
    });
  }
  // inside the weather, and the seas' own: rain driving across (a squall, or always on the Crimson), the light dark,
  // lightning; fog thick round the boat (a fog bank, or the Midnight Sea's mist)
  function drawWeather(now) {
    var here = seaHere(), rain = here === 'crimson' ? 1 : sky.squall;
    if (rain > 0.02 && here !== 'crimson') {
      bctx.fillStyle = 'rgba(16,18,28,' + (0.2 * rain).toFixed(3) + ')'; bctx.fillRect(0, 0, W, H);
      var dw0 = wind.now + Math.PI, vx0 = Math.cos(dw0) * 0.5;
      bctx.fillStyle = 'rgba(210,215,228,' + (0.45 * rain).toFixed(2) + ')';
      for (var i0 = 0; i0 < Math.round(220 * rain); i0++) {
        var sp0 = 0.5 + (i0 % 5) * 0.08, y0 = ((i0 * 97.3 + now * sp0) % (H + 30)) - 15, x0 = ((i0 * 53.7 + now * sp0 * vx0) % (W + 30) + W + 30) % (W + 30) - 15;
        bctx.fillRect(Math.round(x0), Math.round(y0), 1, 4 + (i0 % 3));
      }
    }
    if (sky.fog > 0.02) {
      var gf = bctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.3 - 0.2 * sky.fog), W / 2, H / 2, Math.max(W, H) * 0.55);
      gf.addColorStop(0, 'rgba(120,124,150,' + (0.12 * sky.fog).toFixed(3) + ')'); gf.addColorStop(1, 'rgba(120,124,150,' + (0.7 * sky.fog).toFixed(3) + ')');
      bctx.fillStyle = gf; bctx.fillRect(0, 0, W, H);
    }
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
    var t = now / 1000, here = seaHere();
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
      var P = BridgeSea.palettes[here] || BridgeSea.palettes.emerald;
      bctx.fillStyle = 'rgba(' + P.foam + ',' + (0.8 * (1 - p.age / 1.4)).toFixed(2) + ')';
      bctx.fillRect(sx(p.x), sy(p.r, p.z), 1, 1);
    });
    // mist over the Midnight Sea
    var pal = here;
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
    // coming alongside: settle where the island's camera will be (on you, at her seat - js/world.js snaps there as you
    // climb out), so the sea fades into the island without a jump
    if (phase === 'moor' && dockAt && !captainOf) {
      if (dockAt._seatCam === undefined && moorFor(dockAt.id)) {        // (its berth loads as she comes in: till then, the boat)
        try {
          var MI = moorFor(dockAt.id), FL = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null, sid = FL ? FL.active().ship.id : 'gull';
          var ml = fleetHere(MI), mm = ml.filter(function (e) { return e.ship === sid; })[0] || ml[0], st = seatOf(mm);
          dockAt._seatCam = [st[0] - 0.5 + dockAt.ox + SEATCAM[0], st[1] + 0.25 - 1.2 + dockAt.oy + SEATCAM[1]];
        } catch (e) { dockAt._seatCam = null; }
      }
      if (dockAt._seatCam) {
        var mk = clamp((now - phaseAt) / 1400, 0, 1);
        tx += (dockAt._seatCam[0] * TS - W / 2 - tx) * mk;
        ty += (dockAt._seatCam[1] * TS - H / 2 - ty) * mk;
      }
    }
    if (!cam) cam = { x: tx, y: ty, fx: tx, fy: ty };
    var k = 1 - Math.exp(-(now - (cam.at || now)) / 1000 * 2.2);
    cam.at = now;
    cam.fx += (tx - cam.fx) * k; cam.fy += (ty - cam.fy) * k;
    cam.x = Math.round(cam.fx); cam.y = Math.round(cam.fy);
    drawSeas(now);
    drawWeatherWater(now);
    drawGusts(now);
    for (var iid in isl) drawIsland(isl[iid], now);
    drawWake(now);
    drawWhale(now);
    var list = things.map(function (o) { return { row: o.r, draw: function () { drawThing(o, now); } }; });
    list.push({ row: b.r, draw: function () { drawBoat(now); } });
    traffic.forEach(function (o) {
      var X = sx(o.x), Y = sy(o.r);
      if (X > -140 && X < W + 140 && Y > -160 && Y < H + 80) list.push({ row: o.r, draw: function () { drawBoat(now, o); } });
    });
    Object.keys(seaPeers).forEach(function (id) {                     // other players out sailing
      var o = seaPeers[id], X = sx(o.x), Y = sy(o.r);
      if (X > -200 && X < W + 200 && Y > -220 && Y < H + 120) list.push({ row: o.r, draw: function () { drawBoat(now, o); } });
    });
    if (race) {                                                       // a race: its marks, its line, the boats in it
      race.marks.forEach(function (m, i) {
        var X = sx(m[0]), Y = sy(m[1]);
        if (X > -40 && X < W + 40 && Y > -40 && Y < H + 40) list.push({ row: m[1], draw: function () { drawMark(m, i, now); } });
      });
      var fp = finishPt();
      if (Math.abs(sx(fp[0]) - W / 2) < W && Math.abs(sy(fp[1]) - H / 2) < H) list.push({ row: fp[1], draw: function () { drawLine(now); } });
      race.npcs.forEach(function (o) {
        var X = sx(o.x), Y = sy(o.r);
        if (X > -140 && X < W + 140 && Y > -160 && Y < H + 80) list.push({ row: o.r, draw: function () { drawBoat(now, o); } });
      });
    }
    // stepping aboard and ashore: you on the pier, the boat's lines made fast to it
    var castT = phase === 'cast' ? now - phaseAt : -1, moorT = phase === 'moor' ? now - phaseAt : -1;
    var quay = phase === 'moor' ? dockAt && (dockAt.inner || [dockAt.dock[0] + dockAt.ox, dockAt.dock[1] + dockAt.oy]) : (A.inner || [A.dock[0] + A.ox, A.dock[1] + A.oy]);
    var seat = seatOf(b);
    Object.keys(isl).forEach(function (iid) {                         // the rest of your ships, tied up where you left them
      (isl[iid].fleet || []).forEach(function (m) {
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
    drawWeatherAir(now);
    drawWisps(now);
    drawSky(now);
    drawWeather(now);
    if (typeof BridgeWeather !== 'undefined' && BridgeWeather.drawSea) BridgeWeather.drawSea(bctx, W, H, now, sx(b.x), sy(b.r), TS, lightOnScreen());
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
    var wf = wind.now, ng = SP.nogo || 0.7;                             // the no-go wedge: you can't sail into the wind
    ctx.fillStyle = 'rgba(255,90,80,0.22)'; ctx.beginPath(); ctx.moveTo(cx, cy);
    for (var wa = -ng; wa <= ng + 0.001; wa += ng / 8) ctx.lineTo(cx + Math.cos(wf + wa) * R * 0.95, cy + Math.sin(wf + wa) * R * 0.95 * C45);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,220,255,0.95)'; ctx.lineWidth = px(2);
    var ax = Math.cos(wf), ay = Math.sin(wf) * C45;
    ctx.beginPath(); ctx.moveTo(cx + ax * R * 0.8, cy + ay * R * 0.8); ctx.lineTo(cx - ax * R * 0.55, cy - ay * R * 0.55); ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,255,0.95)';
    ctx.beginPath(); ctx.moveTo(cx - ax * R * 0.72, cy - ay * R * 0.72);
    ctx.lineTo(cx - ax * R * 0.45 + ay * px(6), cy - ay * R * 0.45 - ax * px(6)); ctx.lineTo(cx - ax * R * 0.45 - ay * px(6), cy - ay * R * 0.45 + ax * px(6)); ctx.fill();
    if (!course && phase !== 'cast') {                               // where each island on your chart lies: steer for one
      others().forEach(function (o) {
        var on = aim && aim.id === o.id, mx = cx + Math.cos(o.bearing) * R * 0.86, my = cy + Math.sin(o.bearing) * R * 0.86 * C45;
        ctx.fillStyle = on ? '#ffd060' : 'rgba(242,236,214,0.85)';
        ctx.beginPath(); ctx.arc(mx, my, px(on ? 5 : 3.5), 0, Math.PI * 2); ctx.fill();
        ctx.font = px(8) + 'px "Pixelify Sans", monospace'; ctx.fillStyle = on ? '#ffd060' : '#c8d0e0';
        ctx.fillText(o.name.split(' ').map(function (w) { return w[0]; }).join(''), cx + Math.cos(o.bearing) * (R + px(12)), cy + Math.sin(o.bearing) * (R + px(12)) * C45);
      });
    } else {
      var wp = route[Math.min(leg, route.length - 1)] || (course ? (function () { var c = centreOf(course); return [c.x, c.r]; })() : A.exit);
      var bc = Math.atan2(wp[1] - b.r, wp[0] - b.x);                 // the next leg of the course, gold
      ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.arc(cx + Math.cos(bc) * R * 0.86, cy + Math.sin(bc) * R * 0.86 * C45, px(4), 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#f2ecd6'; ctx.lineWidth = px(2);                 // your bow
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(b.h) * R * 0.6, cy + Math.sin(b.h) * R * 0.6 * C45); ctx.stroke();
    ctx.font = px(9) + 'px "Pixelify Sans", monospace';
    ctx.fillStyle = 'rgba(200,220,240,0.9)'; ctx.fillText('WIND', cx, cy + R + px(10));
    // the trim: where the sheet is, where it should be, and what the sail is doing
    var tw = px(230), th = px(10), tx0 = canvas.width - tw - px(24), ty0 = canvas.height - px(58);
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(tx0 - px(10), ty0 - px(46), tw + px(20), px(92));
    ctx.fillStyle = '#2a3040'; ctx.fillRect(tx0, ty0, tw, th);
    if (auto || captainOf) {                                          // the sail: how much of it is up (↑/↓)
      var rf = b.reef == null ? 1 : b.reef;
      ctx.fillStyle = 'rgba(96,208,128,0.6)'; ctx.fillRect(tx0, ty0, rf * tw, th);
      ctx.textAlign = 'left'; ctx.fillStyle = '#8a90a8'; ctx.fillText(touch() ? 'SAIL DOWN' : '↓ SAIL DOWN', tx0, ty0 + th + px(10));
      ctx.textAlign = 'right'; ctx.fillText(touch() ? 'SAIL UP' : 'SAIL UP ↑', tx0 + tw, ty0 + th + px(10));
    } else {
      var best = bestSheet(b.off), sx0 = (best - 0.1) / 1.35;
      ctx.fillStyle = 'rgba(96,208,128,0.55)'; ctx.fillRect(tx0 + Math.max(0, sx0 - 0.08) * tw, ty0, 0.16 * tw, th);
      ctx.fillStyle = '#f2ecd6'; ctx.fillRect(tx0 + (b.sheet - 0.1) / 1.35 * tw - px(2), ty0 - px(3), px(4), th + px(6));
      ctx.textAlign = 'left'; ctx.fillStyle = '#8a90a8'; ctx.fillText('↑ SHEET IN', tx0, ty0 + th + px(10));
      ctx.textAlign = 'right'; ctx.fillText('OUT ↓', tx0 + tw, ty0 + th + px(10));
    }
    var rf2 = b.reef == null ? 1 : b.reef;
    var state = captainOf ? ['CREWING — ' + cap(captainOf.name).toUpperCase() + ' HAS THE HELM', '#a0d0e0']
      : fishingOpen() ? ['LYING STILL — A LINE OVER THE SIDE', '#a0d0e0']
      : b.off < (SP.nogo || 0.7) ? ['INTO THE WIND — TURN AWAY (← →)', '#ff9080']
      : auto && rf2 < 0.15 ? ['SAIL DOWN — ↑ TO RAISE IT', '#a0d0e0']
      : b.luff ? ['SAIL FLAPPING — HAUL IN (↑)', '#ffd060'] : b.stall ? ['SAIL TOO TIGHT — EASE OUT (↓)', '#ffb070'] : ['SAILING WELL', '#80e0a0'];
    ctx.textAlign = 'left'; ctx.fillStyle = state[1]; ctx.font = px(10) + 'px "Pixelify Sans", monospace';
    ctx.fillText(state[0], tx0, ty0 - px(14));
    if (!captainOf && !touch()) { ctx.font = px(8) + 'px "Pixelify Sans", monospace'; ctx.fillStyle = '#6a7088'; ctx.textAlign = 'left';
      ctx.fillText(auto ? 'T: TRIM THE SHEET BY HAND · H: HOW TO SAIL' : 'T: LET THE SAIL TRIM ITSELF · H: HOW TO SAIL', tx0, ty0 + th + px(22)); }
    var pos = b.off < 0.7 ? 'INTO THE WIND' : b.off < 1.15 ? 'CLOSE TO THE WIND' : b.off < 1.9 ? 'WIND FROM THE SIDE' : b.off < 2.65 ? 'WIND BEHIND YOU' : 'WIND DEAD BEHIND';
    ctx.textAlign = 'left'; ctx.fillStyle = '#c8d0e0'; ctx.font = px(10) + 'px "Pixelify Sans", monospace';
    ctx.fillText(pos, tx0, ty0 - px(32));
    ctx.textAlign = 'right'; ctx.fillText((Math.max(0, b.v) * 2.1).toFixed(1) + ' KN', tx0 + tw, ty0 - px(32));
    // the fish hold, under the passage panel (once there's something in it, or a line's out)
    var fh = holdCount();
    if (fh && (fh[0] || fishingOpen())) {
      var hx = px(20), hy = px(18) + px(40), full = fh[0] >= fh[1];
      ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(hx - px(8), hy - px(8), px(full ? 170 : 130), px(20));
      ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = full ? '#ff9080' : '#a0d0e0';
      ctx.fillText('FISH HOLD ' + fh[0] + ' / ' + fh[1] + (full ? ' · FULL' : ''), hx, hy + px(2));
    }
    // the passage, top left: from, to, how far along (or, before a course: which island you're pointing at)
    var bx0 = px(20), by0 = px(18), bw = px(220);
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(bx0 - px(8), by0 - px(10), bw + px(16), px(40));
    ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#c8d0e0';
    ctx.fillText(A.name.toUpperCase(), bx0, by0);
    var unk = unchartedNear();
    if (course) {
      var prog = clamp(courseSailed / Math.max(1, courseSailed + togo()), 0, 1);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd060'; ctx.fillText(isles()[course].name.toUpperCase(), bx0 + bw, by0);
      ctx.fillStyle = '#2a3040'; ctx.fillRect(bx0, by0 + px(10), bw, px(4));
      ctx.fillStyle = '#ffd060'; ctx.fillRect(bx0, by0 + px(10), bw * prog, px(4));
      ctx.fillStyle = '#f2ecd6'; ctx.fillRect(bx0 + bw * prog - px(2), by0 + px(8), px(4), px(8));
    } else {
      var aimName = aim ? isles()[aim.id].name.toUpperCase() : null;
      ctx.textAlign = 'right'; ctx.fillStyle = aimName || unk ? '#ffd060' : '#8a90a8';
      ctx.fillText(unk ? 'UNCHARTED ISLAND' : aimName ? 'STEERING FOR ' + aimName : 'STEER FOR AN ISLAND', bx0 + bw, by0 + px(14));
    }
    if (course && unk) { ctx.textAlign = 'right'; ctx.fillStyle = '#c8d0e0'; ctx.fillText('UNCHARTED ISLAND NEAR', bx0 + bw, by0 + px(26)); }
    if (race) raceHud(now, px);
    // a message, and what E does here
    ctx.textAlign = 'center';
    if (msgQ.length && (!(msg && now < msgAt) || now - msgFrom > 2400)) { var nq = msgQ.shift(); msg = nq[0]; msgAt = now + (nq[1] || 3200); msgFrom = now; }   // the next waiting line: each gets a fair look
    if (msg && now < msgAt) {
      ctx.font = px(13) + 'px "Pixelify Sans", monospace';
      var lines = wrapText(msg, Math.floor(canvas.width / px(8.2)));
      lines.forEach(function (l, i) {
        var y = px(78) + i * px(18), w = ctx.measureText(l).width + px(20);
        ctx.fillStyle = 'rgba(6,10,20,0.7)'; ctx.fillRect(canvas.width / 2 - w / 2, y - px(10), w, px(20));
        ctx.fillStyle = '#f2ecd6'; ctx.fillText(l, canvas.width / 2, y);
      });
    }
    Object.keys(seaPeers).forEach(function (id) {
      var o = seaPeers[id], X = sx(o.x) * Z, Y = (sy(o.r) - 18 - 30 * Math.sqrt((o.spec && o.spec.L || 2.6) / 2.6)) * Z;
      if (X < -100 || X > canvas.width + 100 || Y < -40 || Y > canvas.height + 40 || !o.name) return;
      ctx.font = px(11) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'center';
      var nm = cap(o.name), wn = ctx.measureText(nm).width + px(14);
      ctx.fillStyle = 'rgba(14,12,22,0.7)'; ctx.fillRect(X - wn / 2, Y - px(9), wn, px(18));
      ctx.strokeStyle = 'rgba(160,220,255,0.4)'; ctx.lineWidth = px(1); ctx.strokeRect(X - wn / 2, Y - px(9), wn, px(18));
      ctx.fillStyle = '#f2eee6'; ctx.fillText(nm, X, Y + px(1));
    });
    if (prompt && !fishingOpen() && !menu) {
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
  // a race, top middle: the clock (or the gun to come), the marks, your place; and the other boats' names over them
  function raceHud(now, px) {
    var sp = race.spec, w = px(236), narrow = canvas.width < px(640), field = raceField().length;
    var x0 = narrow ? px(20) : Math.round(canvas.width / 2 - w / 2), y0 = narrow ? px(74) : px(18);      // (a phone: under the passage panel)
    ctx.fillStyle = 'rgba(6,10,20,0.78)'; ctx.fillRect(x0 - px(8), y0 - px(10), w + px(16), px(44));
    ctx.strokeStyle = 'rgba(232,104,42,0.7)'; ctx.lineWidth = px(1); ctx.strokeRect(x0 - px(8), y0 - px(10), w + px(16), px(44));
    ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ff9a4a';
    ctx.fillText((sp.name || 'A race').toUpperCase(), x0, y0);
    var line, sub;
    if (!race.gun) {
      var left = sp.at ? sp.at - Date.now() : null;
      line = left == null ? (sp.waitFor ? 'WAITING FOR ' + String(sp.waitFor).toUpperCase() : 'WAITING FOR THE GUN') : 'THE GUN IN ' + fmtMs(Math.max(0, left)).replace(/\.\d$/, '');
      sub = sp.hold ? 'HOLD HER ON THE LINE' : race.marks.length ? race.marks.length + ' MARKS, THEN THE LINE' : 'TO THE LINE';
    } else if (race.done) {
      line = 'FINISHED ' + fmtMs(race.ms); sub = nth(racePlace()).toUpperCase() + (field > 1 ? ' OF ' + field : '');       // (as the others' times come in)
    } else {
      line = fmtMs(now - race.t0);
      sub = (race.next < race.marks.length ? 'MARK ' + (race.next + 1) + ' OF ' + race.marks.length : 'FOR THE LINE') + (field > 1 ? ' · ' + nth(racePlace()).toUpperCase() + ' OF ' + field : '');
    }
    ctx.textAlign = 'right'; ctx.fillStyle = '#f2ecd6'; ctx.font = px(12) + 'px "Pixelify Sans", monospace'; ctx.fillText(line, x0 + w, y0);
    ctx.textAlign = 'left'; ctx.fillStyle = '#c8d0e0'; ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.fillText(sub, x0, y0 + px(18));
    race.npcs.forEach(function (o) {                                   // their names, over their boats
      var X = sx(o.x) * Z, Y = (sy(o.r) - 48) * Z;
      if (X < -100 || X > canvas.width + 100 || Y < -40 || Y > canvas.height + 40) return;
      ctx.font = px(10) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'center';
      var wn = ctx.measureText(o.name).width + px(12);
      ctx.fillStyle = 'rgba(14,12,22,0.62)'; ctx.fillRect(X - wn / 2, Y - px(8), wn, px(16));
      ctx.fillStyle = '#ffb07a'; ctx.fillText(o.name, X, Y + px(1));
    });
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
    if (!menu && !chartOpen() && !fishingOpen()) update(dt, now);    // (she lies still while you fish)
    else if (captainOf && boat) { var keepMenu = menu; menu = null; crewUpdate(boat, dt, now, now / 1000); menu = keepMenu; }   // aboard theirs, she sails on regardless
    broadcast(now);
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
      loadIsland(id, function (I) { if (I.mask) { moorOf(I); moored[id] = I; } }, 'mask');     // (its shore is all she needs)
    });
    return null;
  }
  // your ships at this island as the world draws them (laid out again only when the fleet changes)
  function fleetHere(I) {
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null;
    var key = F ? F.here(I.id).map(function (s) { return s.id + ':' + s.type + ':' + (typeof BridgeShipKit !== 'undefined' ? BridgeShipKit.sig(s) : ''); }).join(',') : 'gull';   // (what's fitted shows at the pier at once)
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
  // Boarding hands over to the sea view only once it has faded in: until then the world keeps drawing her at the pier with
  // you sat in her (it used to drop her the moment the passage began loading — half a second of an empty pier).
  var handoff = null, handing = false, coverAt = 0;
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
  var partyGo = false;
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
    // playing together (js/party.js): the others are asked first; whoever comes is brought to the pier and comes aboard
    // as crew (they answer 'sail-yes', and she casts off with them); nobody, and you go alone
    if (!partyGo && typeof BridgeParty !== 'undefined' && BridgeParty.depart({ kind: 'sail', world: worldId, place: world && world.name }, function (ids) {
      var alone = function () { if (running || aboard) return; partyGo = true; try { board(worldId, shipId); } finally { partyGo = false; } };
      if (!ids || !ids.length) alone(); else setTimeout(alone, 9000);     // their 'sail-yes' starts the passage; if it never comes
    })) return true;
    if (!I || !world || !BridgeWorld.setMode || !BridgeCharacter.setPose) return start(worldId);
    var list = fleetHere(I), m = list.filter(function (e) { return e.ship === shipId; })[0] || list[0];
    var pts = [{ x: BridgeCharacter.getX() + 0.5, y: BridgeCharacter.getY() + 1 - 3 / 32 }].concat(wayAboard(I, m));
    var w = walkPath(pts, function (seg) { return seg >= pts.length - 3 ? 1.6 : 2.4; }, function () {
      aboard.at = performance.now();                                 // stepped aboard: sit (or take the wheel), and she rocks
      BridgeCharacter.setHidden(true);
      setTimeout(function () { sfx(m.spec.L > 3.6 ? 'step' : 'sit'); }, 180);
      setTimeout(function () {
        handoff = function () { handing = true; BridgeWorld.setMode(null); handing = false; };
        coverAt = 0;
        if (!start(worldId, null, { aboard: true })) {
          handoff = null; BridgeWorld.setMode(null); aboard = null; BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false);
        }
      }, 900);
    });
    aboard = { id: worldId, ship: m.ship, at: 0 };
    w.pose(I);
    BridgeWorld.setMode({
      solo: true,
      focus: function () { return { x: w.cur.x - 0.5, y: w.cur.y - 1.2 }; },
      end: function () { if (handing) return; handoff = null; BridgeCharacter.setPose(null); BridgeCharacter.setHidden(false); aboard = null; },
      update: function (dt) {
        if (aboard && aboard.at) return;
        if (w.step(dt)) w.pose(I);
      }
    });
    return true;
  }
  // a race from this pier (js/race.js): down the pier into your sloop - one design, so it's the sailing that wins - and the
  // passage starts as the race
  function raceBoard(worldId, spec) {
    if (running || aboard || !knows(worldId)) return false;
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null, gull = F ? F.here(worldId).filter(function (sh) { return sh.type === 'sloop'; })[0] : null;
    pendingRace = spec;
    var ok;
    partyGo = true;                                                   // each races her own sloop: a party isn't called aboard
    try { ok = board(worldId, gull ? gull.id : undefined); } finally { partyGo = false; }
    if (!ok) pendingRace = null;
    return ok;
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
    // the island's camera starts on you in the boat, where the sea view left off (it panned down the pier from the
    // quay's spawn as the sea faded out - a jump of a few tiles)
    if (BridgeWorld.snapCamera) BridgeWorld.snapCamera();
  }
  function mooredItems(world, offX, offY, ts, now) {
    if (typeof BridgeWorld === 'undefined') return [];
    if (running && !(aboard && (!coverAt || performance.now() - coverAt < 600))) return [];
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
    var keep = [bctx, cam, wind, A, B, palOverride];
    var on = !!(aboard && aboard.at && aboard.id === I.id && aboard.ship === m.ship), k = on ? (now - aboard.at) / 1000 : 0;
    m.heel = Math.sin(now / 1300 + m.x) * 0.035 / Math.sqrt(m.spec.L / 2.6) + (on ? Math.sin(k * 9) * 0.12 * Math.exp(-k * 2.5) * 2.6 / m.spec.L : 0);   // riding the swell
    m.empty = !on;
    var lt = lightTint, w = BridgeWorld.getWorld(), sc = w && w.scene && typeof BridgeScene !== 'undefined' && BridgeScene.get ? BridgeScene.get(w.scene.id) : null;
    bctx = c; cam = { x: -offX, y: -offY }; wind = { now: I.moorH + 2.2, s: 0.4 }; A = I; B = null; palOverride = I.pal;
    lightTint = sc && sc.meta && sc.meta.tileLight && BridgeScene.tintAt ? BridgeScene.tintAt(sc, w, m.x, m.r - 1, now) : null;
    try { drawBoat(now, m); moorLines(m, m.inner || I.dock, 1); }
    finally { bctx = keep[0]; cam = keep[1]; wind = keep[2]; A = keep[3]; B = keep[4]; palOverride = keep[5]; lightTint = lt; }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('lumar', { items: mooredItems });

  // ---- her portrait (the harbourmaster's book): a ship as she's fitted, lying on a patch of her sea in the moonlight ----
  // Drawn by drawBoat, sails furled, three-quarters on, into `cv` at the game's own pixels (its CSS size a whole multiple
  // that fits the dialog), and kept moving - the pennant, the lanterns, the water, a glint on her copper - while it's shown.
  function portrait(cv, ship) {
    var F = typeof BridgeFleet !== 'undefined' ? BridgeFleet : null;
    if (!cv || !ship || !F) return;
    var sp = F.effective(ship), I = isles(), pal = (I && I[ship.at] && I[ship.at].pal) || 'emerald', began = 0;
    var set = (ship.fits || []).indexOf('crystal_sails') >= 0;        // (furled, but crystal-weave is set to be seen)
    var m = { x: 0, r: 0, h: 3 / 32 * Math.PI * 2, v: 0, sheet: set ? 1 : 1.45, boom: set ? 0.55 : 0.06, side: 1, heel: 0, rudder: 0, bump: 0, hoist: set ? 0.85 : 0,
              eff: 0, off: 2, luff: false, empty: true, spec: sp, ship: ship.id, seed: 0.3 };
    var scratch = document.createElement('canvas'), crop = null, PW = 420, PH = 380, OX = 210, OY = 300;
    scratch.width = PW; scratch.height = PH;
    function paint(now) {
      var sc = scratch.getContext('2d'), keep = [bctx, cam, wind, A, B, palOverride, lightTint, daySea, skyAt, skyW];
      sc.clearRect(0, 0, PW, PH); sc.imageSmoothingEnabled = false;
      bctx = sc; cam = { x: -OX, y: -OY }; wind = { now: 2.4, s: 0.4 }; A = null; B = null; palOverride = pal; lightTint = null;
      daySea = false; skyAt = Date.now(); skyW = null;                // (in moonlight, whatever the hour: the sheets' own light)
      m.heel = Math.sin(now / 1300) * 0.03;
      try { drawBoat(now, m); }
      finally { bctx = keep[0]; cam = keep[1]; wind = keep[2]; A = keep[3]; B = keep[4]; palOverride = keep[5]; lightTint = keep[6]; daySea = keep[7]; skyAt = keep[8]; skyW = keep[9]; }
      if (!crop) {                                                    // (her bounds, worked out on the first frame)
        var d = sc.getImageData(0, 0, PW, PH).data, x0 = PW, y0 = PH, x1 = 0, y1 = 0;
        for (var y = 0; y < PH; y++) for (var x = 0; x < PW; x++) if (d[(y * PW + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 <= x0) return false;
        crop = [Math.max(0, x0 - 10), Math.max(0, y0 - 8), 0, 0];
        crop[2] = Math.min(PW, x1 + 11) - crop[0]; crop[3] = Math.min(PH, y1 + 9) - crop[1];
        cv.width = crop[2]; cv.height = crop[3];
        // a whole number of the screen's own pixels to each of hers (1.5 CSS px on a sharp screen is still crisp), as big as fits
        var dp = Math.max(1, Math.round(window.devicePixelRatio || 1)), k = Math.max(dp, Math.min(2 * dp, Math.floor(Math.min(380 * dp / crop[2], 230 * dp / crop[3]))));
        cv.style.width = crop[2] * k / dp + 'px';                     // (its height follows: a narrow screen shrinks it whole)
      }
      var c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      if (typeof BridgeSea !== 'undefined' && BridgeSea.drawSeaAt) BridgeSea.drawSeaAt(c, cv.width, cv.height, now, pal, crop[0] - OX, crop[1] - OY);
      else { c.fillStyle = '#0e2a26'; c.fillRect(0, 0, cv.width, cv.height); }
      c.drawImage(scratch, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2], crop[3]);
      return true;
    }
    function tick(now) {
      if (!began) began = now;
      if (!cv.isConnected && now - began > 1500) return;              // (the dialog's gone)
      if (cv.isConnected && !(now - (tick.at || 0) < 80)) { tick.at = now; paint(now); }
      requestAnimationFrame(tick);
    }
    loadSheet(function (err) { if (!err) loadHull(sp.sheet, function () { requestAnimationFrame(tick); }); });
  }

  return {
    start: start, stop: stop, knows: knows, board: board, _disembark: disembark, portrait: portrait,
    isRunning: function () { return running; },
    covers: function () { return running && phase !== 'load'; },
    _boat: function () { return boat; }, _phase: function () { return phase; }, _wind: function () { return wind; }, _isles: function () { return [A, B]; },
    _loaded: function () { return isl; }, _light: function () { return lightOnScreen(); }, _snap: function () { cam = null; }, _cam: function () { return cam && { x: cam.x, y: cam.y, W: W, H: H, ox: A && A.ox, oy: A && A.oy, bx: B && B.ox, by: B && B.oy, seat: dockAt && dockAt._seatCam, phase: phase }; }, _sky: function () { return sky; }, _systems: function (x, r, T) { return systemsNear(x, r, T); }, _front: function (T) { return frontAt(T); }, _toWorld: function (cx, cy) { return pa ? toWorld(cx, cy) : null; }, _sea: function (x, r) { return seaAtWorld(x, r); },
    setCourse: setCourse, canSetCourse: canSetCourse, chartPos: chartPos, course: function () { return running ? course : null; },
    invite: invite, _crew: function () { return { crewOf: crewOf, captainOf: captainOf, mirror: mirror }; }, _seaPeers: function () { return seaPeers; },
    _things: function () { return things; }, _prompt: function () { return prompt; }, _commit: commit, _moored: function () { return moored; }, _route: function () { return [route, leg]; }, _whale: function () { return whale; },
    raceBoard: raceBoard, raceGun: function (at) { if (race && !race.gun) race.spec.at = at; }, racing: function () { return raceOn(); },
    retire: function () { if (raceOn()) { raceQuit('retired'); replan(); } },
    _race: function () { return race && { next: race.next, marks: race.marks, gun: race.gun, done: race.done, ms: race.ms, place: race.place, ready: race.ready,
                                         npcs: race.npcs.map(function (o) { return { name: o.name, x: o.x, r: o.r, left: o.left, time: o.time, len: o.len }; }),
                                         line: finishPt(), lane: race.lanePt, spec: race.spec, field: raceField() }; }
  };
})();
