/**
 * BridgeVoyage — take the galleon's helm and sail the spore sea yourself.
 *
 * A top-down sea between Lumar's islands, each drawn from its own scene
 * render (everything above the waterline, cut out with its shore.png and
 * shrunk to sea scale), so the island you sail past is the island you
 * walked. Wind blows and veers; A/D steer, W/S set the sails. The wake
 * curls behind you, other ships go about their business — traders and a
 * harbour patrol you can hail, pirates who give chase, a ghost galleon
 * out by Midnight — and there are shoals to fish and salvage adrift. Sail
 * up to any island's pier and dock.
 *
 * Sailing to an island from a DOCK menu is the same sea on autopilot: the
 * galleon casts off, finds its own way round the islands (a path planned
 * over the chart, kept off the coasts), runs across the seas and glides
 * into the destination's berth, seen from above all the way; a tap skips.
 *
 *   BridgeVoyage.start('lumar-crimson')                         // "Take the helm"
 *   BridgeVoyage.start('lumar', { auto: 'lumar-rose' })        // "Rose Cove": the passage
 */
var BridgeVoyage = (function () {
  var F = 0.2;                                  // island renders shrink to sea scale
  var CW = 3600, CH = 2600;                     // the chart
  var ISLES = {
    'lumar': { name: "Diggen's Point", x: 0.50, y: 0.50, pal: 'emerald' },
    'lumar-midnight': { name: 'Midnight Isle', x: 0.18, y: 0.22, pal: 'midnight' },
    'lumar-rose': { name: 'Rose Cove', x: 0.82, y: 0.22, pal: 'rose' },
    'lumar-sapphire': { name: 'Sapphire Port', x: 0.82, y: 0.78, pal: 'sapphire' },
    'lumar-crimson': { name: 'Crimson Reach', x: 0.18, y: 0.78, pal: 'crimson' }
  };
  var running = false, canvas = null, ctx = null, buf = null, bctx = null, raf = 0, last = 0;
  var Z = 2, W = 480, H = 300;
  var ship = null, keys = {}, wind = { a: 0.6, t: 0 }, wake = [], spray = [], npcs = [], shoals = [], flotsam = [];
  var prompt = null, msg = null, msgUntil = 0, from = null;
  var auto = null, route = null, cam = null, began = 0;           // the passage: destination, planned route, camera

  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // ---- islands, cut from their renders ---------------------------------------------------------
  function loadIsle(id) {
    var I = ISLES[id];
    if (I.loading) return;
    I.loading = true;
    I.cx = I.x * CW; I.cy = I.y * CH;
    fetch('/bridge/assets/scenes/' + id + '/scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (meta) {
      return Promise.all([fetch('/bridge/assets/worlds/' + id + '.json?v=' + Date.now()).then(function (r) { return r.json(); }),
                          img('/bridge/assets/scenes/' + id + '/full.png?v=' + meta.rev),
                          img('/bridge/assets/scenes/' + id + '/shore.png?v=' + meta.rev)]).then(function (res) {
        var world = res[0], full = res[1], shore = res[2];
        var w0 = full.width, h0 = full.height;
        var c = document.createElement('canvas'); c.width = w0; c.height = h0;
        var cx = c.getContext('2d', { willReadFrequently: true });
        cx.drawImage(full, 0, 0);
        var px = cx.getImageData(0, 0, w0, h0);
        if (shore) {
          var s = document.createElement('canvas'); s.width = w0; s.height = h0;
          var sx = s.getContext('2d', { willReadFrequently: true });
          sx.drawImage(shore, 0, 0, w0, h0);
          var sp = sx.getImageData(0, 0, w0, h0).data, d = px.data;
          for (var i = 0; i < w0 * h0; i++) if (sp[i * 4 + 1] > 0 || sp[i * 4 + 2] > 127) d[i * 4 + 3] = 0;
        }
        // renders cut square at their edges (the harbour's headland runs off the map) get a ragged coast
        var dd = px.data, m = Math.min(w0, h0) * 0.16;
        for (var y = 0; y < h0; y++) {
          for (var x = 0; x < w0; x++) {
            var e = Math.min(x, w0 - 1 - x, y, h0 - 1 - y) / m;
            if (e < 1 && e + 0.45 * (vnoise(x / 40, y / 40) - 0.5) + 0.2 * (vnoise(x / 11, y / 11) - 0.5) < 0.62) dd[(y * w0 + x) * 4 + 3] = 0;
          }
        }
        cx.putImageData(px, 0, 0);
        var w1 = Math.round(w0 * F), h1 = Math.round(h0 * F);
        var L = document.createElement('canvas'); L.width = w1; L.height = h1;
        var lx = L.getContext('2d', { willReadFrequently: true });
        lx.imageSmoothingEnabled = true;
        lx.drawImage(c, 0, 0, w1, h1);
        var ld = lx.getImageData(0, 0, w1, h1), a = ld.data, solid = new Uint8Array(w1 * h1);
        for (var j = 0; j < w1 * h1; j++) { var on = a[j * 4 + 3] > 110; a[j * 4 + 3] = on ? 255 : 0; solid[j] = on ? 1 : 0; }
        lx.putImageData(ld, 0, 0);
        I.img = L; I.w = w1; I.h = h1; I.solid = solid;
        I.ox = I.cx - w1 / 2; I.oy = I.cy - h1 / 2;
        var dock = (world.interactions || []).filter(function (it) { return it.label === 'DOCK' || it.label === 'GALLEON'; })[0];
        var dx = dock ? dock.x : world.width / 2, dy = dock ? dock.y : world.height;
        I.dock = [I.ox + (meta.originX + (dx + 0.5) * 32) * F, I.oy + (meta.originY + (dy + 2.2) * 32) * F];
        I.ready = true;
      });
    }).catch(function () { I.ready = false; });
  }

  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function h(i, j) { return hash(i * 57 + j * 131); }
    return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
  }

  function img(src) {
    return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; });
  }

  function landAt(x, y) {
    for (var id in ISLES) {
      var I = ISLES[id];
      if (!I.ready) continue;
      var ix = Math.floor(x - I.ox), iy = Math.floor(y - I.oy);
      if (ix >= 0 && iy >= 0 && ix < I.w && iy < I.h && I.solid[iy * I.w + ix]) return id;
    }
    return null;
  }

  // ---- ships: a top-down hull, masts and sails, cached per heading ------------------------------------
  var sprites = {};
  function shipSprite(kind, heading, sail) {
    var n = 32, hi = ((Math.round(heading / (Math.PI * 2) * n) % n) + n) % n, si = Math.round(sail * 2);
    var key = kind + ':' + hi + ':' + si;
    if (sprites[key]) return sprites[key];
    var K = KINDS[kind], L = K.len, B = K.beam, S = 72;
    var c = document.createElement('canvas'); c.width = S; c.height = S;
    var g = c.getContext('2d');
    g.translate(S / 2, S / 2);
    g.rotate(hi / n * Math.PI * 2);
    // hull: square stern, swelling waist, pointed bow (+x is forward)
    g.fillStyle = K.dark;
    g.beginPath();
    g.moveTo(-L / 2, -B / 2 + 1); g.lineTo(L * 0.15, -B / 2 - 1); g.quadraticCurveTo(L * 0.42, -B / 2, L / 2 + 2, 0);
    g.quadraticCurveTo(L * 0.42, B / 2, L * 0.15, B / 2 + 1); g.lineTo(-L / 2, B / 2 - 1); g.closePath(); g.fill();
    g.fillStyle = K.hull;
    g.beginPath();
    g.moveTo(-L / 2 + 1, -B / 2 + 2); g.lineTo(L * 0.15, -B / 2); g.quadraticCurveTo(L * 0.4, -B / 2 + 1, L / 2, 0);
    g.quadraticCurveTo(L * 0.4, B / 2 - 1, L * 0.15, B / 2); g.lineTo(-L / 2 + 1, B / 2 - 2); g.closePath(); g.fill();
    g.fillStyle = K.deck;
    g.fillRect(-L / 2 + 3, -B / 2 + 3, L * 0.75, B - 6);
    g.fillStyle = K.dark;
    for (var p = -L / 2 + 5; p < L * 0.25; p += 3) g.fillRect(p, -B / 2 + 3, 1, B - 6);
    g.fillStyle = K.trim;
    g.fillRect(-L / 2 + 1, -B / 2 + 1, L * 0.65, 1); g.fillRect(-L / 2 + 1, B / 2 - 2, L * 0.65, 1);
    g.fillRect(-L / 2 + 1, -B / 2 + 2, 4, B - 4);                                   // the stern castle
    g.fillStyle = K.dark;
    g.fillRect(L / 2, -1, 8, 2);                                                       // bowsprit
    // masts and sails: furled to a bar, or billowing wide
    K.masts.forEach(function (m) {
      var mx = m * L / 2, w = 2 + sail * (B * 0.75), d = 2 + sail * 3;
      g.fillStyle = sail > 0.05 ? K.sail : K.trim;
      if (sail > 0.05) {
        g.beginPath();
        g.moveTo(mx - 1, -w / 2 - 2); g.quadraticCurveTo(mx + d * 1.6, 0, mx - 1, w / 2 + 2); g.lineTo(mx - 2, w / 2 + 2);
        g.lineTo(mx - 2, -w / 2 - 2); g.closePath(); g.fill();
        g.fillStyle = K.sailShade;
        g.fillRect(mx - 2, -w / 2 - 2, 1, w + 4);
      } else {
        g.fillRect(mx - 1, -B / 2 - 1, 2, B + 2);
      }
      g.fillStyle = K.dark;
      g.fillRect(mx - 1, -1, 2, 2);
    });
    if (K.flag) { g.fillStyle = K.flag; g.fillRect(-L / 2 - 4, -2, 4, 3); }
    // crisp it: no half-transparent edges
    var d0 = g.getImageData(0, 0, S, S), a = d0.data;
    for (var i = 3; i < a.length; i += 4) a[i] = a[i] > 100 ? (K.ghost ? 150 : 255) : 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.putImageData(d0, 0, 0);
    sprites[key] = c;
    return c;
  }

  var KINDS = {
    galleon: { len: 42, beam: 12, hull: '#5a3a1a', dark: '#1a1008', deck: '#8a6a3a', trim: '#c8a040', sail: '#e8dcc0', sailShade: '#b8ac90',
               masts: [-0.45, 0.0, 0.42], flag: '#2e8a5a' },
    trader: { len: 30, beam: 10, hull: '#6a4a2a', dark: '#1a1008', deck: '#9a7a4a', trim: '#8a6a3a', sail: '#d8c8a0', sailShade: '#a89870',
              masts: [-0.2, 0.3], flag: '#e0c040' },
    patrol: { len: 34, beam: 10, hull: '#2a3a5a', dark: '#0a1018', deck: '#6a7a8a', trim: '#c8c8d0', sail: '#c8d8f0', sailShade: '#8898b8',
              masts: [-0.3, 0.25], flag: '#4080f0' },
    pirate: { len: 34, beam: 11, hull: '#2a1a1a', dark: '#080404', deck: '#4a3a2a', trim: '#6a1a1a', sail: '#2a2628', sailShade: '#141214',
              masts: [-0.35, 0.2], flag: '#c02020' },
    ghost: { len: 40, beam: 12, hull: '#3a6a5a', dark: '#0a2018', deck: '#5a8a7a', trim: '#90e0c0', sail: '#a0f0d0', sailShade: '#60b090',
             masts: [-0.45, 0.0, 0.42], flag: null, ghost: true }
  };

  var HAILS = {
    trader: ['"FAIR WINDS! WE\'RE BOUND FOR SAPPHIRE WITH A HOLD OF ROSEITE. PRICES ARE UP - THE PIRATES ARE OUT PAST CRIMSON AGAIN."',
             '"YOU\'VE A FINE SHIP. IF YOU EVER WANT TO RUN CARGO, THE TRADING HOUSE ON SAPPHIRE PAYS IN SILVER."',
             '"SAW LIGHTS MOVING ON MIDNIGHT LAST NIGHT. NOBODY LIVES OUT THERE BUT THE SORCERESS AND HER STONES."'],
    patrol: ['"HARBOUR PATROL. KEEP CLEAR OF THE CRIMSON REEF - THE HERON\'S BONES ARE STILL ON IT."',
             '"WE\'VE A BOUNTY ON THE BLACK-SAIL SLOOP. IF YOU SEE HER, OUTRUN HER - DON\'T FIGHT HER."'],
    ghost: ['THE GALLEON MAKES NO SOUND AT ALL. ON ITS DECK A FIGURE IN A FLIGHT JACKET RAISES A HAND - AND THE SHIP IS GONE.',
            'A VOICE OVER THE WATER, CALM AS A LULLABY: "IT\'S STILL LISTENING. DON\'T LET IT STOP."']
  };

  // ---- the voyage -------------------------------------------------------------------------------------------------
  function start(fromId, opts) {
    if (running) return;
    from = ISLES[fromId] ? fromId : 'lumar';
    auto = opts && opts.auto && ISLES[opts.auto] && opts.auto !== from ? opts.auto : null;
    route = null; cam = null; seaNow = null; prompt = null; msg = null; began = performance.now(); keys = {}; wake = []; spray = [];
    Object.keys(ISLES).forEach(loadIsle);
    running = true;
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    canvas = document.createElement('canvas');
    canvas.id = 'voyage-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:60;image-rendering:pixelated;background:#020308;';
    if (auto) {                       // fades in once the route is planned; a tap goes straight ashore
      canvas.style.opacity = '0'; canvas.style.transition = 'opacity 0.5s';
      canvas.addEventListener('pointerdown', function () { if (performance.now() - began > 600) stop(auto); });
    }
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    buf = document.createElement('canvas');
    bctx = buf.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKeyUp, true);
    var I = ISLES[from];
    ship = { x: I.x * CW, y: I.y * CH + 240, a: Math.PI / 2, v: 0, sail: 0, bump: 0 };
    waitDock(I);
    npcs = [mk('trader', 'lumar', 'lumar-sapphire'), mk('trader', 'lumar-rose', 'lumar-crimson'), mk('patrol', 'lumar', 'lumar-midnight'),
            mk('pirate', 'lumar-crimson', 'lumar'), mk('ghost', 'lumar-midnight', 'lumar-midnight')];
    shoals = []; flotsam = [];
    for (var i = 0; i < 9; i++) shoals.push({ x: 300 + hash(i * 3) * (CW - 600), y: 300 + hash(i * 5) * (CH - 600), left: 3 });
    for (var j = 0; j < 7; j++) flotsam.push({ x: 300 + hash(j * 7 + 1) * (CW - 600), y: 300 + hash(j * 11 + 2) * (CH - 600), got: false });
    var touch = document.documentElement.classList.contains('touch');
    if (touch && !auto) {        // the thumb stick and A drive the keys below; a button to go ashore
      document.documentElement.classList.add('keys-mode');
      var dock = document.createElement('button');
      dock.id = 'voyage-dock';
      dock.textContent = 'Go ashore';
      dock.addEventListener('click', function (e) { e.preventDefault(); stop(nearestDock(1e9)); });
      document.body.appendChild(dock);
    }
    if (!auto) say(touch ? 'Stick up: raise sails · left/right: steer · A: act' : 'W raise sails · A/D steer · E act · Esc dock', 4000);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function waitDock(I) {                // start just off the pier once the island is measured
    if (!I.ready) { setTimeout(function () { if (running && ship.v === 0 && ship.sail === 0) waitDock(I); }, 120); return; }
    ship.x = I.dock[0]; ship.y = I.dock[1] + 26; ship.a = Math.PI / 2;
  }

  function mk(kind, a, b) {
    var A = ISLES[a], B = ISLES[b];
    return { kind: kind, x: A.x * CW + (hash(kind.length + a.length) - 0.5) * 500, y: A.y * CH + 320, a: 0, v: 0,
             route: [a, b], leg: 1, wobble: hash(a.length * 7 + kind.length) * 6, hailed: false, chase: 0 };
  }

  function stop(dockAt) {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove('keys-mode');
    var dock = document.getElementById('voyage-dock');
    if (dock) dock.remove();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('resize', resize);
    var target = dockAt || from;
    auto = null; route = null;
    canvas.style.transition = 'opacity 0.4s'; canvas.style.opacity = '0';
    setTimeout(function () {
      if (canvas) canvas.remove();
      canvas = null;
      BridgeWorld.load(target, function () {
        BridgeState.transition('world', { worldId: target, spawn: null });
        if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
      });
    }, 400);
  }

  function resize() {
    Z = Math.max(2, Math.floor(window.innerWidth / 520));
    W = Math.ceil(window.innerWidth / Z); H = Math.ceil(window.innerHeight / Z);
    canvas.width = W * Z; canvas.height = H * Z;
    buf.width = W; buf.height = H;
  }

  function onKey(e) {
    var k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', ' ', 'enter', 'escape'].indexOf(k) < 0) return;
    e.preventDefault(); e.stopPropagation();
    if (auto) { if (['escape', 'e', ' ', 'enter'].indexOf(k) >= 0 && !e.repeat) stop(auto); return; }
    if (k === 'escape') { stop(nearestDock(1e9)); return; }
    if ((k === 'w' || k === 'arrowup') && !keys[k]) ship.sail = Math.min(1, ship.sail + 0.5);
    if ((k === 's' || k === 'arrowdown') && !keys[k]) ship.sail = Math.max(0, ship.sail - 0.5);
    if ((k === 'e' || k === ' ' || k === 'enter') && !keys[k] && prompt) prompt.act();
    keys[k] = true;
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }

  function say(text, ms) { msg = text; msgUntil = performance.now() + (ms || 3200); }

  function nearestDock(maxD) {
    var best = null, bd = maxD;
    for (var id in ISLES) {
      var I = ISLES[id];
      if (!I.ready) continue;
      var d = Math.hypot(ship.x - I.dock[0], ship.y - I.dock[1]);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  // ---- the passage: plan a way round the islands, then sail it ---------------------------------------------
  // A* over a coarse grid of the chart (cells near a coast cost more, so the
  // route keeps to open water), pulled straight where the water is wide,
  // rounded off, and run with a speed curve: cast off slowly, cross fast,
  // glide into the berth.
  var G = 24;
  function planRoute(a, b) {
    var cols = Math.ceil(CW / G), rows = Math.ceil(CH / G), n = cols * rows, wet = new Uint8Array(n), i, c, r;
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var x = (c + 0.5) * G, y = (r + 0.5) * G, ok = x > 40 && y > 40 && x < CW - 40 && y < CH - 40 && !landAt(x, y);
      for (var k = 0; ok && k < 8; k++) if (landAt(x + Math.cos(k * Math.PI / 4) * 16, y + Math.sin(k * Math.PI / 4) * 16)) ok = false;
      wet[r * cols + c] = ok ? 1 : 0;
    }
    var clr = new Uint16Array(n), q = [];                                 // how many cells to the nearest coast
    for (i = 0; i < n; i++) { if (wet[i]) clr[i] = 999; else { clr[i] = 0; q.push(i); } }
    for (var h = 0; h < q.length; h++) {
      var v = q[h], vc = v % cols, vr = (v - vc) / cols;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nc = vc + d[0], nr = vr + d[1];
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return;
        var j = nr * cols + nc;
        if (clr[j] > clr[v] + 1) { clr[j] = clr[v] + 1; q.push(j); }
      });
    }
    function cellOf(p) {                    // nearest open-water cell reachable from a berth in a straight line of water
      var c0 = Math.floor(p[0] / G), r0 = Math.floor(p[1] / G), best = -1, bd = 1e9;
      for (var dr = -7; dr <= 7; dr++) for (var dc = -7; dc <= 7; dc++) {
        var cc = c0 + dc, rr = r0 + dr;
        if (cc < 0 || rr < 0 || cc >= cols || rr >= rows || !wet[rr * cols + cc]) continue;
        var d = dc * dc + dr * dr;
        if (d >= bd) continue;
        var x1 = (cc + 0.5) * G, y1 = (rr + 0.5) * G, len = Math.hypot(x1 - p[0], y1 - p[1]), ok = true;
        for (var t = 4; ok && t < len; t += 4) if (landAt(p[0] + (x1 - p[0]) * t / len, p[1] + (y1 - p[1]) * t / len)) ok = false;
        if (ok) { bd = d; best = rr * cols + cc; }
      }
      return best;
    }
    var s0 = cellOf(a), g0 = cellOf(b);
    if (s0 < 0 || g0 < 0) return null;
    // A*
    var gs = new Float32Array(n).fill(1e9), came = new Int32Array(n).fill(-1), shut = new Uint8Array(n), heap = [];
    function hx(j) { var jc = j % cols, jr = (j - jc) / cols, gc = g0 % cols, gr = (g0 - gc) / cols; return Math.hypot(jc - gc, jr - gr); }
    function push(j, f) { heap.push([f, j]); var k = heap.length - 1; while (k > 0) { var pk = (k - 1) >> 1; if (heap[pk][0] <= heap[k][0]) break; var t = heap[pk]; heap[pk] = heap[k]; heap[k] = t; k = pk; } }
    function pop() {
      var top = heap[0], end = heap.pop();
      if (heap.length) { heap[0] = end; var k = 0; for (;;) { var l = k * 2 + 1, rr2 = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr2 < heap.length && heap[rr2][0] < heap[m][0]) m = rr2; if (m === k) break; var t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m; } }
      return top;
    }
    gs[s0] = 0; push(s0, hx(s0));
    while (heap.length) {
      var cur = pop()[1];
      if (cur === g0) break;
      if (shut[cur]) continue;
      shut[cur] = 1;
      var cc0 = cur % cols, cr0 = (cur - cc0) / cols;
      for (var dr2 = -1; dr2 <= 1; dr2++) for (var dc2 = -1; dc2 <= 1; dc2++) {
        if (!dr2 && !dc2) continue;
        var nc2 = cc0 + dc2, nr2 = cr0 + dr2;
        if (nc2 < 0 || nr2 < 0 || nc2 >= cols || nr2 >= rows) continue;
        var j2 = nr2 * cols + nc2;
        if (!wet[j2] || shut[j2]) continue;
        var step = (dr2 && dc2 ? 1.414 : 1) * (1 + Math.max(0, 6 - clr[j2]) * 0.7);
        if (gs[cur] + step < gs[j2]) { gs[j2] = gs[cur] + step; came[j2] = cur; push(j2, gs[j2] + hx(j2)); }
      }
    }
    if (came[g0] < 0 && g0 !== s0) return null;
    var cells = [];
    for (var at = g0; at >= 0; at = came[at]) cells.push(at);
    cells.reverse();
    function ctr(j) { var jc = j % cols; return [(jc + 0.5) * G, ((j - jc) / cols + 0.5) * G]; }
    function los(i0, i1) {                  // straight water between two path cells, as wide as their own
      var A = ctr(cells[i0]), B = ctr(cells[i1]), need = Math.min(4, clr[cells[i0]], clr[cells[i1]]);
      var d = Math.hypot(B[0] - A[0], B[1] - A[1]), steps = Math.ceil(d / (G / 2));
      for (var t = 1; t < steps; t++) {
        var x = A[0] + (B[0] - A[0]) * t / steps, y = A[1] + (B[1] - A[1]) * t / steps;
        if (clr[Math.floor(y / G) * cols + Math.floor(x / G)] < need) return false;
      }
      return true;
    }
    var pts = [a, ctr(cells[0])], i0 = 0;
    while (i0 < cells.length - 1) {
      var j0 = cells.length - 1;
      while (j0 > i0 + 1 && !los(i0, j0)) j0--;
      pts.push(ctr(cells[j0])); i0 = j0;
    }
    pts.push(b);
    var dense = [pts[0]];                   // short pieces, so rounding a corner can't cut across a headland
    for (var m0 = 1; m0 < pts.length; m0++) {
      var P0 = pts[m0 - 1], Q0 = pts[m0], nseg = Math.ceil(Math.hypot(Q0[0] - P0[0], Q0[1] - P0[1]) / 48);
      for (var k0 = 1; k0 <= nseg; k0++) dense.push([P0[0] + (Q0[0] - P0[0]) * k0 / nseg, P0[1] + (Q0[1] - P0[1]) * k0 / nseg]);
    }
    pts = dense;
    for (var it = 0; it < 3; it++) {        // round the corners (Chaikin), ends kept
      var sm = [pts[0]];
      for (var m = 0; m < pts.length - 1; m++) {
        var P = pts[m], Q = pts[m + 1];
        if (m > 0) sm.push([P[0] * 0.75 + Q[0] * 0.25, P[1] * 0.75 + Q[1] * 0.25]);
        if (m < pts.length - 2) sm.push([P[0] * 0.25 + Q[0] * 0.75, P[1] * 0.25 + Q[1] * 0.75]);
      }
      sm.push(pts[pts.length - 1]);
      pts = sm;
    }
    var cum = [0];
    for (var u = 1; u < pts.length; u++) cum.push(cum[u - 1] + Math.hypot(pts[u][0] - pts[u - 1][0], pts[u][1] - pts[u - 1][1]));
    // cast off from beside the island's own moored galleon, and come in to lie off it
    var L = Math.max(80, cum[cum.length - 1] - 42), s0 = Math.min(36, L / 4), vmax = Math.max(150, Math.min(440, L / 5.5));
    return { pts: pts, cum: cum, L: L, s: s0, s0: s0, v: 0, vmax: vmax, acc: vmax * vmax / 520, dec: vmax * vmax / 1000, done: 0 };
  }

  function pointAt(R, s) {
    var lo = 0, hi = R.cum.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (R.cum[mid] <= s) lo = mid; else hi = mid; }
    var seg = R.cum[hi] - R.cum[lo] || 1, t = Math.max(0, Math.min(1, (s - R.cum[lo]) / seg)), A = R.pts[lo], B = R.pts[hi];
    return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  }

  function berth(I) {                       // open water nearest the berth (a pier tip can sit right on the coast)
    var d = I.dock;
    for (var r = 0; r <= 64; r += 4) {
      for (var k = 0; k < Math.max(1, r * 1.5); k++) {
        var ang = Math.PI / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI * 2 / Math.max(1, r * 1.5));
        var x = d[0] + Math.cos(ang) * r, y = d[1] + Math.sin(ang) * r, ok = true;
        for (var j = 0; ok && j < 8; j++) if (landAt(x + Math.cos(j * Math.PI / 4) * 9, y + Math.sin(j * Math.PI / 4) * 9)) ok = false;
        if (ok && !landAt(x, y)) return [x, y];
      }
    }
    return [d[0], d[1] + 20];
  }

  function autoSail(dt, now) {
    if (!route) {                           // wait for every island before planning (they're cached after the first time)
      var all = Object.keys(ISLES).every(function (id) { return ISLES[id].ready; });
      if (all) {
        var A = ISLES[from], B = ISLES[auto];
        route = planRoute(berth(A), berth(B));
        if (!route) { stop(auto); return; }
        var p0 = pointAt(route, route.s), p1 = pointAt(route, route.s + 30);
        ship.x = p0[0]; ship.y = p0[1]; ship.a = Math.atan2(p1[1] - ship.y, p1[0] - ship.x);
        cam = { x: ship.x, y: ship.y - 30 };
        canvas.style.opacity = '1';
        say('SAILING FOR ' + ISLES[auto].name.toUpperCase(), 3200);
      } else if (now - began > 8000) stop(auto);
      return;
    }
    var R = route;
    if (R.s < R.L) {
      R.v = Math.min(R.vmax, Math.sqrt(2 * R.acc * (R.s - R.s0)) + 16, Math.sqrt(2 * R.dec * (R.L - R.s)) + 9);
      R.s = Math.min(R.L, R.s + R.v * dt / 1000);
    } else { R.v = 0; if (!R.done) { R.done = now; if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('door'); } }
    var p = pointAt(R, R.s), ahead = pointAt(R, Math.min(R.L, R.s + 30));
    ship.x = p[0]; ship.y = p[1]; ship.v = R.v;
    if (Math.hypot(ahead[0] - p[0], ahead[1] - p[1]) > 2) {
      var want = Math.atan2(ahead[1] - p[1], ahead[0] - p[0]), da = Math.atan2(Math.sin(want - ship.a), Math.cos(want - ship.a));
      ship.a += da * Math.min(1, dt * 0.005);
    }
    ship.sail = R.done ? 0 : R.v > R.vmax * 0.55 ? 1 : R.v > 26 ? 0.5 : 0;
    // the camera leads the bow across the sea, then settles to frame the island as you come in
    var lead = Math.min(80, W * 0.16) * R.v / R.vmax, I = ISLES[auto];
    var k = Math.max(0, Math.min(1, 1 - (R.L - R.s) / 520));
    var tx = (ship.x + Math.cos(ship.a) * lead) * (1 - k) + (ship.x * 0.55 + I.cx * 0.45) * k;
    var ty = (ship.y + Math.sin(ship.a) * lead) * (1 - k) + (ship.y * 0.55 + I.cy * 0.45) * k;
    var e = Math.min(1, dt * 0.004);
    cam.x += (tx - cam.x) * e; cam.y += (ty - cam.y) * e;
    if (R.done && now - R.done > 1100) stop(auto);
  }

  // ---- simulation -------------------------------------------------------------------------------------------------
  function update(dt, now, raw) {
    if (auto) { autoSail(raw, now); if (!running) return; }        // the passage keeps to the clock, whatever the frame rate
    wind.t += dt;
    wind.a = 0.6 + Math.sin(wind.t / 40000) * 1.2 + Math.sin(wind.t / 13000) * 0.3;    // veering slowly
    if (!auto) steer(dt, now);
    else if (!route) return;
    wakeAndSpray(dt);
    npcs.forEach(function (n) { updateNpc(n, dt, now); });
    if (!auto) prompts();
  }

  function steer(dt, now) {
    var turn = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);
    ship.a += turn * dt * 0.0011 * (0.35 + Math.min(1, ship.v / 50));
    var off = Math.cos(ship.a - wind.a);                      // 1 running before the wind, -1 into it
    var nav = typeof BridgeCrew !== 'undefined' && BridgeCrew.has('navigator') ? 1.2 : 1;      // Bram reads the currents
    var target = ship.sail * 78 * nav * (0.5 + 0.5 * Math.max(-0.4, off) + 0.15);
    ship.v += (target - ship.v) * Math.min(1, dt * 0.0012);
    var nx = ship.x + Math.cos(ship.a) * ship.v * dt / 1000, ny = ship.y + Math.sin(ship.a) * ship.v * dt / 1000;
    var bowX = nx + Math.cos(ship.a) * 20, bowY = ny + Math.sin(ship.a) * 20;
    if (landAt(bowX, bowY) || nx < 40 || ny < 40 || nx > CW - 40 || ny > CH - 40) {
      ship.v *= -0.2; if (now - ship.bump > 1200) { say('Aground! Steer off and try again.'); ship.bump = now; }
    } else { ship.x = nx; ship.y = ny; }
  }

  function wakeAndSpray(dt) {
    if (ship.v > 6 && Math.random() < 0.8) {
      var sx = ship.x - Math.cos(ship.a) * 20, sy = ship.y - Math.sin(ship.a) * 20;
      wake.push({ x: sx + (Math.random() - 0.5) * 4, y: sy + (Math.random() - 0.5) * 4, life: 1, s: 1 });
    }
    if (ship.v > 40 && Math.random() < 0.5) {
      var side = Math.random() < 0.5 ? -1 : 1;
      spray.push({ x: ship.x + Math.cos(ship.a) * 18, y: ship.y + Math.sin(ship.a) * 18, vx: -Math.sin(ship.a) * side * 20, vy: Math.cos(ship.a) * side * 20, life: 1 });
    }
    wake.forEach(function (p) { p.life -= dt / 2600; p.s += dt / 900; });
    wake = wake.filter(function (p) { return p.life > 0; });
    spray.forEach(function (p) { p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.life -= dt / 500; });
    spray = spray.filter(function (p) { return p.life > 0; });
  }

  function prompts() {          // what's at hand
    prompt = null;
    var d = nearestDock(70);
    if (d && ship.v < 30) prompt = { label: 'Dock at ' + ISLES[d].name, act: function () { stop(d); } };
    shoals.forEach(function (s) {
      if (!prompt && s.left > 0 && Math.hypot(ship.x - s.x, ship.y - s.y) < 34 && ship.v < 25) {
        prompt = { label: 'Cast a line', act: function () {
          s.left--;
          if (typeof BridgeInventory !== 'undefined') BridgeInventory.addItem('fresh_fish', 1);
          say(s.left ? 'A silverfin! (+1 Fresh Fish)' : 'A silverfin! The shoal scatters.');
        } };
      }
    });
    flotsam.forEach(function (f) {
      if (!prompt && !f.got && Math.hypot(ship.x - f.x, ship.y - f.y) < 30) {
        prompt = { label: 'Haul in the crate', act: function () {
          f.got = true;
          var loot = hash(f.x) > 0.5 ? ['silver_nail', 3] : ['sea_glass', 4];
          if (typeof BridgeInventory !== 'undefined') BridgeInventory.addItem(loot[0], loot[1]);
          say('Salvage! (+' + loot[1] + ' ' + (loot[0] === 'silver_nail' ? 'Silver Nails' : 'Sea Glass') + ')');
        } };
      }
    });
    npcs.forEach(function (n) {
      if (!prompt && n.kind !== 'pirate' && Math.hypot(ship.x - n.x, ship.y - n.y) < 60 && ship.v < 40) {
        prompt = { label: 'Hail the ' + (n.kind === 'ghost' ? 'ghost galleon' : n.kind === 'patrol' ? 'patrol' : 'trader'), act: function () {
          var lines = HAILS[n.kind];
          say(lines[Math.floor(Math.random() * lines.length)], 7000);
          if (n.kind === 'ghost') n.fade = performance.now();
        } };
      }
    });
  }

  function updateNpc(n, dt, now) {
    var tx, ty;
    if (n.kind === 'pirate' && !auto) {
      var d = Math.hypot(ship.x - n.x, ship.y - n.y);
      if (d < 420 && !n.cool) { n.chase = 1; } else if (d > 700) n.chase = 0;
      if (n.chase) {
        tx = ship.x; ty = ship.y;
        if (d < 24) {                                          // boarded: they take what glitters, and go
          var took = robbed();
          say(took ? 'Pirates! They board, take ' + took + ', and sheer off laughing.' : 'Pirates board you, find nothing worth taking, and sheer off cursing.', 6000);
          n.chase = 0; n.cool = now + 40000;
          n.route = ['lumar-crimson', 'lumar-crimson'];
        } else if (d < 300 && now - (n.warned || 0) > 9000) { say('Black sails off the bow! Crowd on sail and run!', 3000); n.warned = now; }
      }
      if (n.cool && now > n.cool) n.cool = 0;
    }
    if (tx === undefined) {
      var I = ISLES[n.route[n.leg]];
      tx = I.x * CW + Math.sin(n.wobble) * 260; ty = I.y * CH + 300 + Math.cos(n.wobble) * 120;
      if (Math.hypot(tx - n.x, ty - n.y) < 80) { n.leg = 1 - n.leg; n.wobble += 2.1; }
    }
    var want = Math.atan2(ty - n.y, tx - n.x);
    var da = Math.atan2(Math.sin(want - n.a), Math.cos(want - n.a));
    n.a += Math.max(-1, Math.min(1, da)) * dt * 0.0008;
    var sp = n.kind === 'pirate' ? (n.chase ? 66 : 40) : n.kind === 'ghost' ? 28 : 38;
    n.v += (sp - n.v) * Math.min(1, dt * 0.001);
    var nx = n.x + Math.cos(n.a) * n.v * dt / 1000, ny = n.y + Math.sin(n.a) * n.v * dt / 1000;
    if (landAt(nx + Math.cos(n.a) * 16, ny + Math.sin(n.a) * 16)) n.a += 0.04 * dt / 16;
    else { n.x = nx; n.y = ny; }
  }

  function robbed() {
    if (typeof BridgeInventory === 'undefined') return null;
    var ids = ['midnight_crystal', 'sapphire_crystal', 'crimson_crystal', 'roseite', 'silver_nail', 'sea_glass'];
    for (var i = 0; i < ids.length; i++) {
      var c = BridgeInventory.getCount(ids[i]);
      if (c > 0) {
        var n = Math.max(1, Math.ceil(c / 2));
        BridgeInventory.removeItem(ids[i], n);
        var it = BridgeItems.get(ids[i]);
        return n + ' ' + (it ? it.name : ids[i]);
      }
    }
    return null;
  }

  // ---- drawing ----------------------------------------------------------------------------------------------------
  // ---- the seas ------------------------------------------------------------------------------------
  // Like the book's spore seas: each island lies in its own sea, and the seas
  // meet at borders you can see. A point belongs to the nearest island's sea,
  // measured from a position nudged by slow noise so the borders wander; each
  // sea is drawn in its own colours and where two meet the spores churn into
  // a seam of foam. Crossing one says which sea you're in.
  var SEAS = { emerald: 'THE EMERALD SEA', crimson: 'THE CRIMSON SEA', rose: 'THE ROSE SEA', sapphire: 'THE SAPPHIRE SEA',
               midnight: 'THE MIDNIGHT SEA' };
  var CELL = 4, seaBufs = {}, maskCv = null, seaNow = null;
  var PALS = ['emerald', 'crimson', 'rose', 'sapphire', 'midnight'], SGW = Math.ceil(CW / CELL), SGH = Math.ceil(CH / CELL), seaGrid = null;
  function seaCell(gx, gy) {               // which sea a CELL belongs to, worked out once and kept
    if (gx < 0 || gy < 0 || gx >= SGW || gy >= SGH) return seaAt(gx * CELL + CELL / 2, gy * CELL + CELL / 2);
    if (!seaGrid) seaGrid = new Uint8Array(SGW * SGH);
    var i = gy * SGW + gx;
    if (!seaGrid[i]) seaGrid[i] = PALS.indexOf(seaAt(gx * CELL + CELL / 2, gy * CELL + CELL / 2)) + 1;
    return PALS[seaGrid[i] - 1];
  }
  function seaAt(x, y) {
    var wx = x + (vnoise(x / 700, y / 700) - 0.5) * 520 + (vnoise(x / 220 + 9, y / 220) - 0.5) * 170 + (vnoise(x / 60, y / 60 + 3) - 0.5) * 36;
    var wy = y + (vnoise(x / 700 + 31, y / 700 + 17) - 0.5) * 520 + (vnoise(x / 220, y / 220 + 5) - 0.5) * 170 + (vnoise(x / 60 + 7, y / 60) - 0.5) * 36;
    var best = 'emerald', bd = 1e18;
    for (var id in ISLES) {
      var I = ISLES[id], dx = wx - I.x * CW, dy = (wy - I.y * CH) * 1.25, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = I.pal; }
    }
    return best;
  }

  function drawSeas(now, camX, camY) {
    var ox = Math.floor(camX / CELL) * CELL, oy = Math.floor(camY / CELL) * CELL;
    var cols = Math.ceil(W / CELL) + 2, rows = Math.ceil(H / CELL) + 2, grid = new Array(cols * rows), count = {};
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var p = seaCell(ox / CELL + c, oy / CELL + r);
      grid[r * cols + c] = p; count[p] = (count[p] || 0) + 1;
    }
    var pals = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
    BridgeSea.drawSeaAt(bctx, W, H, now, pals[0], camX, camY);
    if (!maskCv) { maskCv = document.createElement('canvas'); }
    maskCv.width = W; maskCv.height = H;
    var mx = maskCv.getContext('2d');
    for (var k = 1; k < pals.length; k++) {
      var pal = pals[k], buf2 = seaBufs[pal];
      if (!buf2) { buf2 = seaBufs[pal] = document.createElement('canvas'); buf2.width = W; buf2.height = H; }
      var bx = buf2.getContext('2d');
      bx.globalCompositeOperation = 'source-over';
      BridgeSea.drawSeaAt(bx, W, H, now, pal, camX, camY);
      mx.clearRect(0, 0, W, H);
      mx.fillStyle = '#fff';
      for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++) {
        if (grid[r2 * cols + c2] === pal) mx.fillRect(ox + c2 * CELL - camX, oy + r2 * CELL - camY, CELL, CELL);
      }
      bx.globalCompositeOperation = 'destination-in';
      bx.drawImage(maskCv, 0, 0);
      bx.globalCompositeOperation = 'source-over';
      bctx.drawImage(buf2, 0, 0);
    }
    // the seams: spores churning where two seas meet
    if (pals.length > 1) {
      for (var r3 = 0; r3 < rows - 1; r3++) for (var c3 = 0; c3 < cols - 1; c3++) {
        var here = grid[r3 * cols + c3];
        if (here === grid[r3 * cols + c3 + 1] && here === grid[(r3 + 1) * cols + c3]) continue;
        var sx = ox + c3 * CELL - camX + CELL / 2, sy = oy + r3 * CELL - camY + CELL / 2;
        var h = hash((ox / CELL + c3) * 7.1 + (oy / CELL + r3) * 13.3);
        var tw = Math.sin(now / 260 + h * 40);
        bctx.fillStyle = tw > 0.4 ? 'rgba(240,255,250,0.85)' : 'rgba(200,240,230,0.35)';
        bctx.fillRect(Math.round(sx + (h - 0.5) * 3), Math.round(sy + Math.sin(now / 500 + h * 9) * 1.5), tw > 0.8 ? 2 : 1, 1);
      }
    }
    // which sea the ship is in
    var mine = seaAt(ship.x, ship.y);
    if (seaNow && mine !== seaNow) say('INTO ' + SEAS[mine], 2600);
    seaNow = mine;
  }

  function draw(now) {
    var cx0 = cam ? cam.x : ship.x, cy0 = cam ? cam.y : ship.y;
    var camX = Math.round(cx0 - W / 2), camY = Math.round(cy0 - H / 2);
    drawSeas(now, camX, camY);
    // shoals: rings of bubbles; flotsam: a bobbing crate
    shoals.forEach(function (s, i) {
      if (!s.left) return;
      var x = Math.round(s.x - camX), y = Math.round(s.y - camY);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;
      for (var b = 0; b < 7; b++) {
        var ph = (now / 900 + b / 7 + i) % 1;
        bctx.fillStyle = 'rgba(200,250,230,' + (0.6 * (1 - ph)).toFixed(2) + ')';
        bctx.fillRect(x + Math.round(Math.cos(b * 2.4) * 9 * ph), y + Math.round(Math.sin(b * 2.4) * 5 * ph), 1, 1);
      }
      bctx.fillStyle = 'rgba(160,230,255,0.5)';
      bctx.fillRect(x - 1 + Math.round(Math.sin(now / 300 + i) * 3), y, 3, 1);
    });
    flotsam.forEach(function (f, i) {
      if (f.got) return;
      var x = Math.round(f.x - camX), y = Math.round(f.y - camY + Math.sin(now / 500 + i));
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;
      bctx.fillStyle = '#2a1808'; bctx.fillRect(x - 4, y - 3, 8, 6);
      bctx.fillStyle = '#8a6a3a'; bctx.fillRect(x - 3, y - 2, 6, 4);
      bctx.fillStyle = '#5a3a1a'; bctx.fillRect(x - 3, y, 6, 1);
      bctx.fillStyle = 'rgba(220,250,240,0.6)'; bctx.fillRect(x - 5, y + 3, 10, 1);
    });
    // wake under the hulls
    wake.forEach(function (p) {
      bctx.fillStyle = 'rgba(214,250,236,' + (0.45 * p.life).toFixed(2) + ')';
      var r = Math.round(p.s);
      bctx.fillRect(Math.round(p.x - camX - r), Math.round(p.y - camY), r * 2, 1);
    });
    // islands
    for (var id in ISLES) {
      var I = ISLES[id];
      if (!I.ready) continue;
      var ix = Math.round(I.ox - camX), iy = Math.round(I.oy - camY);
      if (ix > W || iy > H || ix + I.w < 0 || iy + I.h < 0) continue;
      bctx.drawImage(I.img, ix, iy);
      var dx = Math.round(I.dock[0] - camX), dy = Math.round(I.dock[1] - camY);       // the berth, marked with lamps
      var on = Math.floor(now / 500) % 2;
      bctx.fillStyle = on ? '#ffe080' : '#a08040';
      bctx.fillRect(dx - 12, dy, 2, 2); bctx.fillRect(dx + 10, dy, 2, 2);
    }
    // other ships, then yours
    npcs.forEach(function (n) {
      var x = Math.round(n.x - camX), y = Math.round(n.y - camY);
      if (x < -50 || y < -50 || x > W + 50 || y > H + 50) return;
      var s = shipSprite(n.kind, n.a, 1);
      bctx.save();
      if (n.kind === 'ghost') {
        bctx.globalAlpha = 0.45 + 0.25 * Math.sin(now / 700);
        if (n.fade) { var f = (performance.now() - n.fade) / 1500; bctx.globalAlpha *= Math.max(0, 1 - f); if (f > 1) { n.fade = 0; n.x += 900; } }
      }
      bctx.drawImage(s, x - 36, y - 36);
      bctx.restore();
    });
    var sp = shipSprite('galleon', ship.a, ship.sail);
    bctx.drawImage(sp, Math.round(ship.x - camX) - 36, Math.round(ship.y - camY) - 36);
    spray.forEach(function (p) {
      bctx.fillStyle = 'rgba(230,255,245,' + p.life.toFixed(2) + ')';
      bctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), 1, 1);
    });
    // island names when near
    bctx.font = '8px "Pixelify Sans", monospace';
    bctx.textAlign = 'center';
    for (var jd in ISLES) {
      var J = ISLES[jd];
      if (!J.ready) continue;
      var dd = Math.hypot(ship.x - J.cx, ship.y - J.cy);
      if (dd < 520) {
        bctx.fillStyle = 'rgba(240,236,220,' + Math.min(0.9, (520 - dd) / 200).toFixed(2) + ')';
        bctx.fillText(J.name.toUpperCase(), Math.round(J.cx - camX), Math.round(J.oy - camY) - 4);
      }
    }
    hud(now);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, W * Z, H * Z);
    overlayText(now);
  }

  function hud(now) {
    // compass + wind, bottom left; sails, bottom right; a small chart, top right
    var cx = 26, cy = H - 26;
    if (auto) { chart(now); return; }
    bctx.fillStyle = 'rgba(8,12,20,0.7)';
    bctx.beginPath(); bctx.arc(cx, cy, 18, 0, Math.PI * 2); bctx.fill();
    bctx.strokeStyle = 'rgba(200,180,120,0.8)'; bctx.lineWidth = 1;
    bctx.beginPath(); bctx.arc(cx, cy, 18, 0, Math.PI * 2); bctx.stroke();
    bctx.fillStyle = '#e0c060'; bctx.fillText('N', cx, cy - 10);
    bctx.strokeStyle = 'rgba(160,220,255,0.9)';
    bctx.beginPath(); bctx.moveTo(cx - Math.cos(wind.a) * 12, cy - Math.sin(wind.a) * 12); bctx.lineTo(cx + Math.cos(wind.a) * 12, cy + Math.sin(wind.a) * 12); bctx.stroke();
    bctx.fillStyle = 'rgba(160,220,255,0.9)';
    bctx.fillRect(Math.round(cx + Math.cos(wind.a) * 12) - 1, Math.round(cy + Math.sin(wind.a) * 12) - 1, 3, 3);
    bctx.fillStyle = '#ffe080';
    bctx.fillRect(Math.round(cx + Math.cos(ship.a) * 8), Math.round(cy + Math.sin(ship.a) * 8), 2, 2);
    var bx = W - 52, by = H - 16;
    bctx.fillStyle = 'rgba(8,12,20,0.7)'; bctx.fillRect(bx - 4, by - 12, 50, 16);
    bctx.fillStyle = '#c8b890'; bctx.textAlign = 'left'; bctx.fillText('SAIL', bx, by - 2);
    for (var i = 0; i < 2; i++) { bctx.fillStyle = ship.sail > i * 0.5 + 0.1 ? '#e8dcc0' : '#3a3a44'; bctx.fillRect(bx + 22 + i * 10, by - 9, 8, 8); }
    chart(now);
  }

  function chart(now) {            // the small chart, top right: the islands, pirates in chase, you (and your course)
    var mw = 72, mh = 52, mx = W - mw - 6, my = 6;
    bctx.fillStyle = 'rgba(8,12,20,0.7)'; bctx.fillRect(mx, my, mw, mh);
    bctx.strokeStyle = 'rgba(200,180,120,0.5)'; bctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    for (var id in ISLES) {
      var I = ISLES[id];
      bctx.fillStyle = { emerald: '#60c090', midnight: '#9070e0', rose: '#f080b0', sapphire: '#4080f0', crimson: '#e04050' }[I.pal];
      bctx.fillRect(mx + Math.round(I.x * mw) - 2, my + Math.round(I.y * mh) - 1, 4, 3);
    }
    if (route) {
      bctx.fillStyle = 'rgba(232,220,192,0.7)';
      for (var t = route.s; t < route.L; t += 70) {
        var q = pointAt(route, t);
        bctx.fillRect(mx + Math.round(q[0] / CW * mw), my + Math.round(q[1] / CH * mh), 1, 1);
      }
      var D = ISLES[auto];
      if (Math.floor(now / 400) % 2) { bctx.strokeStyle = '#ffe080'; bctx.strokeRect(mx + Math.round(D.x * mw) - 3.5, my + Math.round(D.y * mh) - 2.5, 7, 5); }
    }
    npcs.forEach(function (n) {
      if (n.kind === 'pirate' && n.chase) { bctx.fillStyle = Math.floor(now / 250) % 2 ? '#ff4040' : '#601010'; bctx.fillRect(mx + Math.round(n.x / CW * mw), my + Math.round(n.y / CH * mh), 2, 2); }
    });
    bctx.fillStyle = '#ffffff';
    bctx.fillRect(mx + Math.round(ship.x / CW * mw) - 1, my + Math.round(ship.y / CH * mh) - 1, 2, 2);
    bctx.textAlign = 'center';
  }

  function overlayText(now) {
    // crisp text at screen resolution: the prompt and messages
    ctx.font = '16px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    if (prompt) {
      var t = 'E  ' + prompt.label;
      var w = ctx.measureText(t).width + 28, x = canvas.width / 2, y = canvas.height - 70;
      ctx.fillStyle = 'rgba(14,12,22,0.82)'; roundRect(x - w / 2, y - 22, w, 32, 16);
      ctx.fillStyle = '#ffd98a'; ctx.fillText(t, x, y);
    }
    if (auto && route) {           // where you're bound, and how to skip it
      ctx.fillStyle = 'rgba(242,238,230,' + (route.done ? 0.4 : 0.7) + ')';
      ctx.font = '13px "Pixelify Sans", monospace';
      ctx.fillText((document.documentElement.classList.contains('touch') ? 'TAP' : 'ESC') + ' TO GO STRAIGHT ASHORE', canvas.width / 2, canvas.height - 26);
      ctx.font = '16px "Pixelify Sans", monospace';
    }
    if (msg && now < msgUntil) {
      var lines = wrap(msg, 60), y0 = 70;
      ctx.fillStyle = 'rgba(14,12,22,0.8)';
      roundRect(canvas.width / 2 - 330, y0 - 24, 660, 18 + lines.length * 22, 10);
      ctx.fillStyle = '#f2eee6';
      lines.forEach(function (L, i) { ctx.fillText(L, canvas.width / 2, y0 + i * 22); });
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.fill();
  }

  function wrap(t, n) {
    var out = [], line = '';
    t.split(' ').forEach(function (w) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; });
    if (line.trim()) out.push(line.trim());
    return out;
  }

  function frame(now) {
    if (!running) return;
    var raw = now - last, dt = Math.min(50, raw); last = now;
    update(dt, now, Math.min(250, raw));
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  // every DOCK on the spore sea: go sailing, in the sloop moored there (js/sloop.js) — you choose the island at sea
  function decorate(worldId, data) {
    if (!ISLES[worldId]) return;
    setTimeout(function () { Object.keys(ISLES).forEach(loadIsle); }, 2500);      // ready before you reach the dock
    (data.interactions || []).forEach(function (it) {
      if ((it.label === 'DOCK' || it.label === 'GALLEON') && (it.type === 'menu' || it.type === 'go_sailing')) {
        it.type = 'go_sailing'; it.prompt = 'PRESS E TO GO SAILING'; delete it.options;
      }
    });
  }

  return { start: start, stop: stop, decorate: decorate, isRunning: function () { return running; },
           covers: function () { return running && (!auto || !!route); },     // the world needn't draw under the sea
           knows: function (id) { return !!ISLES[id]; }, _route: function () { return route; }, _land: function (x, y) { return landAt(x, y); }, _isles: ISLES,
           _ship: function () { return ship; }, _seaAt: function (x, y) { return seaAt(x, y); } };
})();
