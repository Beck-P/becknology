/**
 * BridgeShipKit — what you've fitted to a ship (js/fleet.js GUNS and FITS), drawn on her: at sea, lying at the pier and
 * in the harbourmaster's book. js/sloop.js drawBoat asks it for her guns and her hull's bands; js/seafight.js asks where
 * a gun's muzzle is when it fires, and tells it which gun went off.
 *
 * GUNS stand along her rails at STATIONS for her hull, in the order they were mounted. A side gun has its twin on the
 * other rail (it fires from whichever side bears, so it shows on both); a bow chaser stands in her bows, pointing ahead.
 * Each has a look of its own (LOOK, drawn on her 16-unit grid as small sprites, one per heading her hull is drawn at):
 *   - the swivel: a little gun on a post at the rail;
 *   - the long nine: a long iron barrel on a wheeled carriage, run out over the rail;
 *   - the carronade: short and fat on its slide, a brass band round it;
 *   - the bow chaser: a long, slim gun in the bows, a brass ring at the muzzle;
 *   - the Moonglass Harpoon: the Ferryman's ballista, a bolt on the stock whose moonglass head glows faintly (gone while
 *     it's reloading);
 *   - (a drowned ship's ghostfire: a green-bronze gun with a cold glow in its mouth).
 * A gun that's just fired (`fired`) jumps back inboard and runs out again, a flash at its mouth; the smoke and the shot
 * are js/seafight.js's, from `muzzle`.
 *
 * FITS show on her hull (`bands`, worked out once per heading and kept): copper sheathing is a copper band at her
 * waterline with a glint running along it; oak doubling a heavier, darker band of planking along her topsides, butts
 * and trenails; roseite sheathing pink crystal grown along her waterline, glittering. sloop.js draws the rest in her
 * rig: storm rigging's doubled shrouds, backstays and ratlines; crystal-weave sails (rose-silver cloth with crystal
 * threads catching the light); the moon lantern at her masthead and its cold light round her on the water.
 *
 * Everything on the hull is drawn at the heading her sprite is drawn at (the nearest of 32), from her lines (LINES:
 * keep in step with tools/bridge-art/ship_sprites.py and sloop_sprites.py), so it sits on the sprite exactly.
 */
var BridgeShipKit = (function () {
  var TS = 32, C45 = Math.SQRT1_2, TAU = Math.PI * 2;
  // her lines: length, beam, the half-breadth (beam/2 · sin(π·min(1, a + b·t))^p, t = 0 at the transom, 1 at the stem),
  // the main deck and the rail above it, a quarterdeck [to t, height], a forecastle [from t, height] - all at her old
  // size, then grown by `s` as a whole, as the generators grow her (`S` in ship_sprites.py / sloop_sprites.py)
  var LINES = {
    sloop:      { s: 3.2 / 2.6, L: 2.6, beam: 1.0, full: [0.22, 0.86, 0.7], deck: 0.3, sloop: true },
    cutter:     { s: 4.2 / 3.4, L: 3.4, beam: 1.25, full: [0.22, 0.86, 0.62], deck: 0.42, rail: 0.08 },
    raider:     { s: 4.8 / 4.4, L: 4.4, beam: 1.3, full: [0.2, 0.86, 0.75], deck: 0.42, rail: 0.08, qd: [0.24, 0.5] },
    brigantine: { s: 6.0 / 5.0, L: 5.0, beam: 1.6, full: [0.3, 0.8, 0.55], deck: 0.5, rail: 0.14, qd: [0.26, 0.78], fc: [0.86, 0.66] },
    galleon:    { s: 8.2 / 7.0, L: 7.0, beam: 2.2, full: [0.38, 0.72, 0.5], deck: 0.72, rail: 0.14, qd: [0.28, 1.18], fc: [0.82, 1.0] }
  };
  /** How much a sheet's hull was grown from her old lines (js/sloop.js grows her rig by the same). */
  function scale(sheet) { var Ln = LINES[sheet]; return Ln ? Ln.s : 1; }
  /** Her length as drawn on her sheet (tiles). */
  function length(sheet) { var Ln = LINES[sheet] || LINES.sloop; return Ln.L * Ln.s; }
  // where guns stand (t along her): side guns in the order they're mounted, clear of the masts and their shrouds; bow
  // chasers [t, across] in her bows
  var STATIONS = {
    sloop:      { side: [0.46, 0.34], bow: [[0.76, 0], [0.72, 0.4], [0.72, -0.4]] },
    cutter:     { side: [0.72, 0.4], bow: [[0.8, 0], [0.76, 0.4], [0.76, -0.4]] },
    raider:     { side: [0.5, 0.58, 0.44, 0.76], bow: [[0.82, 0], [0.78, 0.4], [0.78, -0.4]] },
    brigantine: { side: [0.5, 0.6, 0.42, 0.3], bow: [[0.76, 0], [0.73, 0.42], [0.73, -0.42]] },
    galleon:    { side: [0.44, 0.6, 0.35, 0.67, 0.54, 0.3], bow: [[0.74, 0], [0.71, 0.4], [0.71, -0.4]] }
  };
  function lines(sheet) { return LINES[sheet] || LINES.sloop; }
  function half(Ln, t) {
    var f = Ln.full;
    return t >= 0.999 ? 0.015 * Ln.s : Ln.s * Math.max(0.015, Ln.beam / 2 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, f[0] + f[1] * t))), f[2]));
  }
  function sheer(Ln, t) {
    if (Ln.sloop) return Ln.s * (0.38 + 0.03 * (1 - t) + 0.13 * Math.pow(Math.max(0, t - 0.55), 2) / 0.2);
    return Ln.s * (Ln.deck + Ln.rail + 0.04 * (1 - t) + 0.16 * Math.pow(Math.max(0, t - 0.6), 2) / 0.16);
  }
  function deckAt(Ln, t) { return Ln.s * (Ln.qd && t < Ln.qd[0] ? Ln.qd[1] : Ln.fc && t > Ln.fc[0] ? Ln.fc[1] : Ln.deck); }
  function uOf(Ln, t) { return Ln.s * (-Ln.L / 2 + t * Ln.L); }
  // her side at height z: the sections run from the rail, out over the topsides' turn halfway up, in to the bilge
  function bilge(Ln) { return Ln.sloop ? [0.72, 0.05 * Ln.s, 0.96, 0.55] : [0.74, 0.06 * Ln.s, 0.97, 0.5]; }
  function sideV(Ln, t, z) {
    var w = half(Ln, t), top = sheer(Ln, t), B = bilge(Ln), mid = top * B[3];
    if (z >= mid) return w * (B[2] + (1 - B[2]) * Math.min(1, (z - mid) / Math.max(0.01, top - mid)));
    return w * (B[0] + (B[2] - B[0]) * Math.max(0, (z - B[1]) / Math.max(0.01, mid - B[1])));
  }

  // ---- the guns ----------------------------------------------------------------------------------------------------
  // iron, a drowned ship's green bronze, dark wood, and the red ochre gun carriages are painted (so they read on a deck)
  var IRON = ['#0c0c12', '#2c2e3c', '#6c7290'], BRONZE = ['#0a1410', '#2c4a3c', '#6a9c82'], WOOD = ['#1a100a', '#4a2e1a', '#7a5432'];
  var OCHRE = ['#2e0e08', '#7a2a1a', '#b04a2c'], BRASS = '#d0a848';
  // each look is drawn in its own frame: a along the barrel (outboard +, 0 at the rail), q across it, z up from the deck
  // (tiles); `mouth` and `mz` are where the shot leaves, `kick` how far she jumps back
  var LOOK = {
    swivel:       { mouth: 0.12, mz: 0.24, kick: 0.05 },
    long_nine:    { mouth: 0.15, mz: 0.12, kick: 0.12 },
    carronade:    { mouth: 0.06, mz: 0.13, kick: 0.14 },
    chaser:       { mouth: 0.25, mz: 0.13, kick: 0.11 },
    moon_harpoon: { mouth: 0.18, mz: 0.2, kick: 0 },
    ghostfire:    { mouth: 0.15, mz: 0.12, kick: 0.1, ghost: true }
  };
  function lookOf(id) { return LOOK[id] ? id : 'long_nine'; }
  var BOW = { chaser: 1 };
  /** Where each gun stands: [{ i, id, bow, u, v (the rail, across), z (her deck there) }]. */
  function mounts(sheet, guns) {
    var Ln = lines(sheet), S = STATIONS[sheet] || STATIONS.sloop, si = 0, bi = 0;
    return guns.map(function (id, i) {
      if (BOW[id]) { var st = S.bow[bi++ % S.bow.length], t = st[0]; return { i: i, id: id, look: lookOf(id), bow: true, t: t, u: uOf(Ln, t), v: st[1] * half(Ln, t), z: deckAt(Ln, t) }; }
      var t2 = S.side[si++ % S.side.length];
      return { i: i, id: id, look: lookOf(id), t: t2, u: uOf(Ln, t2), v: half(Ln, t2) - 0.03, z: deckAt(Ln, t2) };
    });
  }
  /** Her kit as drawn: guns (ids), fittings and where the guns stand. A boat's own `kit` ({guns, fits}) wins over her spec's. */
  function kitOf(b) {
    var sp = b.spec || {}, src = b.kit || sp;
    if (b.__kit && b.__kitFor === src) return b.__kit;
    var guns = (src.guns || []).map(function (g) { return g && g.id || g; }).filter(Boolean), fits = (src.fits || []).slice();
    var has = function (f) { return fits.indexOf(f) >= 0; }, sheet = sp.sheet || 'sloop';
    var k = { guns: guns, fits: fits, sheet: sheet, copper: has('sheathing'), oak: has('oak'), roseite: has('roseite'), storm: has('storm_rig'),
              crystal: has('crystal_sails'), moon: has('moon_lantern') || !!sp.ward, mounts: mounts(sheet, guns) };
    k.bands = (k.copper ? 'c' : '') + (k.oak ? 'o' : '') + (k.roseite ? 'r' : '');
    b.__kit = k; b.__kitFor = src;
    return k;
  }
  /** A short signature of a ship's kit (what's mounted and fitted), for knowing when to draw her again. */
  function sig(ship) { return (ship.guns || []).join('.') + '/' + (ship.fits || []).join('.'); }

  // a gun's sprite, one per look, heading and way it points: drawn once, a pixel at a time
  var SPR = {}, sprN = 0, SZ = 48, O = 24;
  function sprite(look, hi, dir, loaded) {
    var key = look + ':' + hi + ':' + dir + (loaded === false ? ':e' : '');
    if (SPR[key]) return SPR[key];
    if (++sprN > 500) { SPR = {}; sprN = 1; }                          // (every heading of every gun seen: start the store again)
    var H = hi / 32 * TAU, c = Math.cos(H), sn = Math.sin(H), du = dir === 0 ? 1 : 0, dv = dir === 0 ? 0 : dir;
    var cv = document.createElement('canvas'); cv.width = cv.height = SZ;
    var g = cv.getContext('2d');
    function pr(a, q, z) { var bu = a * du - q * dv, bv = a * dv + q * du; return [O + (bu * c - bv * sn) * TS, O + (bu * sn + bv * c - z * C45) * TS]; }
    function dot(a, q, z, col, w) { var p = pr(a, q, z); g.fillStyle = col; g.fillRect(Math.round(p[0]), Math.round(p[1]), w || 1, w || 1); }
    function seg(a0, q0, z0, a1, q1, z1, col, w) {
      var p = pr(a0, q0, z0), e = pr(a1, q1, z1), n = Math.max(1, Math.round(Math.max(Math.abs(e[0] - p[0]), Math.abs(e[1] - p[1]))));
      g.fillStyle = col;
      for (var i = 0; i <= n; i++) g.fillRect(Math.round(p[0] + (e[0] - p[0]) * i / n), Math.round(p[1] + (e[1] - p[1]) * i / n), w || 1, w || 1);
    }
    // a barrel: an outline a pixel wider than it (its shadow side, lower right), the body, a light along its top
    function barrel(a0, a1, z, P, w, col) { seg(a0, 0, z, a1, 0, z, P[0], w + 1); seg(a0, 0, z, a1, 0, z, col || P[1], w); seg(a0, 0, z, a1, 0, z, P[2], 1); }
    // a carriage (or a slide): a block of red-ochre timber under the gun, dark trucks (wheels) at its corners
    function carriage(a0, a1, wq, z, trucks) {
      for (var q = -wq; q <= wq + 0.001; q += wq / 2) seg(a0, q, z, a1, q, z, OCHRE[0], 2);
      for (var q2 = -wq; q2 <= wq + 0.001; q2 += wq / 2) seg(a0, q2, z + 0.01, a1, q2, z + 0.01, q2 < -wq * 0.6 ? OCHRE[2] : OCHRE[1], 1);
      if (trucks) [[a0 + 0.03, wq + 0.025], [a1 - 0.03, wq + 0.025], [a0 + 0.03, -wq - 0.025], [a1 - 0.03, -wq - 0.025]].forEach(function (w) { dot(w[0], w[1], 0.02, '#120a06', 2); });
    }
    if (look === 'swivel') {
      seg(-0.02, 0, 0, -0.02, 0, 0.21, WOOD[0], 2); seg(-0.02, 0, 0, -0.02, 0, 0.21, WOOD[2], 1);           // the post
      seg(-0.09, 0, 0.23, -0.17, 0, 0.18, WOOD[2], 1);                                                   // the tiller
      barrel(-0.09, 0.11, 0.24, IRON, 1);
      dot(-0.02, 0, 0.235, BRASS, 1);                                                                     // the yoke
      dot(0.12, 0, 0.24, IRON[0], 2);
    } else if (look === 'carronade') {
      carriage(-0.22, -0.01, 0.055, 0.05, false);                                                         // the slide
      barrel(-0.16, 0.04, 0.13, IRON, 3);
      dot(-0.19, 0, 0.13, IRON[1], 2); dot(-0.19, 0, 0.14, IRON[2], 1);                                    // the breech
      seg(-0.07, -0.05, 0.14, -0.07, 0.05, 0.14, BRASS, 1);                                               // a brass band
      dot(0.05, 0, 0.13, IRON[0], 4); dot(0.06, 0, 0.14, '#020204', 2);                                    // the bell mouth
    } else if (look === 'moon_harpoon') {
      seg(-0.06, 0, 0, -0.06, 0, 0.17, WOOD[0], 2); seg(-0.06, 0, 0, -0.06, 0, 0.17, WOOD[1], 1);          // the stand
      barrel(-0.24, 0.08, 0.19, WOOD, 2);                                                                 // the stock
      [-1, 1].forEach(function (s) {                                                                     // the bow, silvered
        seg(0.04, 0, 0.19, -0.04, s * 0.2, 0.19, '#141020', 2); seg(0.04, 0, 0.19, -0.04, s * 0.2, 0.19, '#8a8aaa', 1);
        dot(-0.04, s * 0.2, 0.19, '#e0e8ff', 1);
        seg(-0.04, s * 0.2, 0.2, loaded === false ? -0.03 : -0.15, 0, 0.2, 'rgba(216,208,192,0.85)', 1);  // the string
      });
      if (loaded !== false) { seg(-0.15, 0, 0.21, 0.15, 0, 0.21, '#e0d0a8', 1); dot(0.16, 0, 0.21, '#bfeaff', 2); dot(0.17, 0, 0.21, '#ffffff', 1); }   // the bolt
    } else {                                                                                             // the long guns
      var P = look === 'ghostfire' ? BRONZE : IRON, chase = look === 'chaser', a0 = chase ? -0.28 : -0.25, a1 = chase ? 0.24 : 0.14;
      carriage(a0, chase ? -0.07 : -0.05, 0.07, 0.06, true);
      barrel(a0, a1, 0.12, P, 2);
      dot(a0 + 0.02, 0, 0.12, P[1], 3); dot(a0 + 0.02, 0, 0.13, P[2], 1);                                 // the breech, heavier
      dot(a0 - 0.04, 0, 0.12, P[1], 2);                                                                    // the cascabel
      if (chase) seg(a1 - 0.03, -0.035, 0.13, a1 - 0.03, 0.035, 0.13, BRASS, 1);
      dot(a1, 0, 0.12, P[0], 3); dot(a1 + 0.01, 0, 0.13, '#020204', 1);                                    // the mouth
    }
    var spr = { c: cv, ax: pr(1, 0, 0)[0] - O, ay: pr(1, 0, 0)[1] - O };                                // ax, ay: px per tile along the barrel
    SPR[key] = spr;
    return spr;
  }
  function recoil(age) { return age < 0 ? 0 : age < 50 ? age / 50 : Math.max(0, 1 - (age - 50) / 700); }   // jumps back, runs out again
  /** Her guns as draw-list entries ({row, draw}), sorted in with her masts and people by sloop.js. P: her own frame at the
   *  heading her sprite's drawn at (no heel); blit: drawImage with the sky's light over it (sloop.js skyBlit). */
  function guns(c, b, P, hi, now, blit, list) {
    var k = kitOf(b);
    if (!k.mounts.length) return;
    var fired = b.__fired || {};
    k.mounts.forEach(function (m) {
      var sides = m.bow ? [0] : [-1, 1];
      sides.forEach(function (s) {
        var pt = m.bow ? P(m.u, m.v, m.z) : P(m.u, s * m.v, m.z), L = LOOK[m.look], f = fired[m.i], age = f && (m.bow || f.side === s) ? now - f.at : 1e9;
        var loaded = m.look !== 'moon_harpoon' || age > 1400;
        var spr = sprite(m.look, hi, m.bow ? 0 : s, loaded), kick = L.kick * recoil(age);
        list.push({ row: pt[2], draw: function () {
          var X = Math.round(pt[0] - O - spr.ax * kick), Y = Math.round(pt[1] - O - spr.ay * kick);
          blit(spr.c, 0, 0, SZ, SZ, X, Y, SZ, SZ);
          var mx = pt[0] + spr.ax * L.mouth, my = pt[1] + spr.ay * L.mouth - L.mz * C45 * TS;
          if (m.look === 'moon_harpoon' && loaded) glow(c, mx, my, now, [150, 210, 255], 0.5 + 0.2 * Math.sin(now / 420 + m.i));
          if (L.ghost) glow(c, mx, my, now, [110, 255, 170], 0.45 + 0.2 * Math.sin(now / 300 + m.i));
          if (age >= 0 && age < 200) flash(c, mx, my, spr.ax, spr.ay, age, m.look);
        } });
      });
    });
  }
  function glow(c, x, y, now, rgb, k) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var g = 2; g >= 1; g--) disc(c, x, y, g * 2, 'rgba(' + rgb.join(',') + ',' + (0.12 * k * (3 - g)).toFixed(3) + ')');
    c.restore();
  }
  function disc(c, x, y, R, col) {                                     // a round blot of light, a row at a time
    R = Math.max(1, Math.round(R)); x = Math.round(x); y = Math.round(y);
    c.fillStyle = col;
    for (var j = -R; j <= R; j++) { var w = Math.round(Math.sqrt(Math.max(0, R * R - j * j))); c.fillRect(x - w, y + j, w * 2 + 1, 1); }
  }
  // the flash at a gun's mouth, along the way it points: a white core and yellow tongue, then an orange burst, then embers
  var FLASH = { iron: ['#ffffff', '#ffe27a', '#ff9a3a', '#d8482a'], ghost: ['#f0fff6', '#a8ffd0', '#50e090', '#208a58'], moon: ['#ffffff', '#d8f4ff', '#90c8ff', '#5a78d0'] };
  function flash(c, x, y, ax, ay, age, look) {
    var n = Math.hypot(ax, ay) || 1, ex = ax / n, ey = ay / n, px = -ey, py = ex, F = FLASH[look === 'ghostfire' ? 'ghost' : look === 'moon_harpoon' ? 'moon' : 'iron'];
    var big = look === 'carronade' ? 1.35 : look === 'swivel' ? 0.6 : look === 'chaser' ? 0.9 : 1;
    function at(a, p, col) { c.fillStyle = col; c.fillRect(Math.round(x + ex * a + px * p), Math.round(y + ey * a + py * p), 1, 1); }
    c.save(); c.globalCompositeOperation = 'lighter';
    var hr = (age < 60 ? 9 : 6) * big, ha = age < 60 ? 0.2 : 0.1, hx = x + ex * 4 * big, hy = y + ey * 4 * big, rgb = look === 'ghostfire' ? '120,255,180' : look === 'moon_harpoon' ? '150,200,255' : '255,190,110';
    disc(c, hx, hy, hr, 'rgba(' + rgb + ',' + ha + ')'); disc(c, hx, hy, hr * 0.55, 'rgba(' + rgb + ',' + ha + ')');
    c.restore();
    if (look === 'moon_harpoon') {                                     // no powder: the bolt's away in a breath of pale light
      if (age < 120) { at(1, 0, F[1]); at(2, 0, F[1]); at(3, 1, F[2]); at(4, -1, F[2]); at(6, 0, F[3]); at(5, 2, F[3]); }
      return;
    }
    // the tongue of fire out of the gun's mouth, white-hot at its root, then yellow, orange, red at the tips; then it tears
    // loose and thins, leaving embers
    var L = (age < 50 ? 13 : 10) * big, off = age < 50 ? 0 : 2 + (age - 50) / 25, ragged = age >= 50;
    if (age < 110) for (var a = 0; a <= L; a++) {
      var f = a / L, w = Math.round(3.4 * big * Math.sin(Math.PI * Math.min(1, (a + 1.5) / (L * 0.75))) * (1 - f * 0.45));
      for (var p = -w; p <= w; p++) {
        if (ragged && hash(a * 7.1 + p * 3.3 + Math.floor(age / 30)) < 0.3) continue;
        var d = f * 0.8 + Math.abs(p) / (w + 1) * 0.5 + (ragged ? 0.2 : 0);
        at(a + off, p, d < 0.25 ? F[0] : d < 0.48 ? F[1] : d < 0.72 ? F[2] : F[3]);
      }
    }
    var ne = age < 110 ? 4 : 6;                                       // sparks and embers thrown out of it
    for (var i = 0; i < ne; i++) {
      var ea = (4 + hash(i * 5.7 + 1) * 10) * big + age / 18, ep = (hash(i * 3.1 + 2) - 0.5) * 9 * big;
      if (age > 60 || i % 2) at(ea, ep, age < 110 ? F[2] : F[3]);
    }
  }
  /** Where gun i's shot leaves her (world tiles, at the heading her sprite's drawn at), and the way it points; null if
   *  she has no gun i. side: -1 port, 1 starboard (a bow chaser ignores it). */
  function muzzle(b, i, side) {
    var k = kitOf(b), m = k.mounts[i];
    if (!m) return null;
    var H = Math.round(b.h / TAU * 32) / 32 * TAU, c = Math.cos(H), sn = Math.sin(H), L = LOOK[m.look];
    var du = m.bow ? 1 : 0, dv = m.bow ? 0 : side, u = m.u + du * L.mouth, v = (m.bow ? m.v : side * m.v) + dv * L.mouth;
    return { x: b.x + u * c - v * sn, r: b.r + u * sn + v * c, z: m.z + L.mz, dx: du * c - dv * sn, dr: du * sn + dv * c, look: m.look, u: m.u };
  }
  /** Gun i has just fired (from `side`), or will in `wait` ms: she jumps back and flashes. */
  function fired(b, i, side, wait) { (b.__fired || (b.__fired = {}))[i] = { at: performance.now() + (wait || 0), side: side }; }   // (wait: ms till it goes off)
  function mountOf(b, i) { return kitOf(b).mounts[i] || null; }

  // ---- her hull's bands: copper, oak, roseite ----------------------------------------------------------------------
  var COPPER = ['#f4c08a', '#d0844a', '#94502a', '#341608'], ROSE = ['#ffe8f6', '#f08cc8', '#b04884', '#481234'];
  var OAK = ['#6a4a2c', '#3a2414', '#2a180a', '#120a04', '#9a7a50'];             // edge, body, plank seam, shadow, the strake's light
  var BANDS = {}, bandN = 0;
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // worked out once for her lines, the heading she's drawn at and what's fitted: the pixels (as a canvas, offset from her
  // centre on the water) and the path along the top of her waterline band, for the glint
  function bands(sheet, hi, key) {
    var id = sheet + ':' + hi + ':' + key;
    if (BANDS[id]) return BANDS[id];
    var Ln = lines(sheet), H = hi / 32 * TAU, c = Math.cos(H), sn = Math.sin(H), px = {}, path = [], spark = [];
    var cop = key.indexOf('c') >= 0, oak = key.indexOf('o') >= 0, ros = key.indexOf('r') >= 0, B = bilge(Ln);
    function scr(u, v, z) { return [Math.round((u * c - v * sn) * TS), Math.round((u * sn + v * c - z * C45) * TS)]; }
    function put(x, y, col) { px[x + ',' + y] = col; }
    var tEnd = 0;
    for (var t0 = 0; t0 < 1; t0 += 0.005) if (half(Ln, t0) > 0.03) tEnd = t0;
    var LL = Ln.L * Ln.s, step = 1 / (LL * TS * 2);
    [-1, 1].forEach(function (s) {
      var lastX = null, lastY = null;
      for (var t = 0; t <= tEnd; t += step) {
        var u = uOf(Ln, t), w = half(Ln, t), dw = (half(Ln, Math.min(1, t + 0.01)) - half(Ln, Math.max(0, t - 0.01))) / (0.02 * LL);
        var nu = -s * dw, nv = s, nn = Math.hypot(nu, nv), facing = (nu * sn + nv * c) / nn;      // her side's facing: toward you +
        if (facing < -0.04) { lastX = null; continue; }
        var bz = B[1] + 0.01, p = scr(u, s * sideV(Ln, t, bz), bz), j = Math.round(t * 400);
        if (oak) {                                                   // a second skin of oak over her topsides, a pixel proud of them
          var top = sheer(Ln, t), za = B[1] + 0.03, zb = Ln.sloop ? top - 0.15 * Ln.s : top - Ln.s * 0.27 * Math.sqrt(Ln.beam / 1.6) - 0.03;
          var pa = scr(u, s * (sideV(Ln, t, za) + 0.02), za), pb = scr(u, s * (sideV(Ln, t, zb) + 0.02), zb);
          var y0 = Math.min(pa[1], pb[1]), y1 = Math.max(pa[1], pb[1]) + 1;
          if (y1 - y0 < 4) y0 = y1 - 4;
          var seam = Math.floor(t * LL * 4.5), butt = (t * LL * 4.5) % 1 < 0.09;
          for (var y = y0; y <= y1; y++) {
            var row = y - y0, col = row === 0 ? OAK[4] : row === 1 ? OAK[0] : y === y1 ? OAK[3] : (row % 2 === 0 ? OAK[2] : OAK[1]);
            if (butt && row > 1 && y < y1 && hash(seam * 3 + row + s * 17) < 0.6) col = OAK[3];             // the butts of the planks
            put(pa[0], y, col);
          }
          if (!butt && hash(j * 13 + s) < 0.05) put(pa[0], y0 + 3, OAK[4]);                               // a trenail
        }
        if (cop || ros) {
          var P = ros ? ROSE : COPPER;
          put(p[0], p[1] + 1, P[3]);
          if (ros) {                                                 // roseite: faceted crystal, light and dark by turns
            var fc = Math.floor(t * LL * 9) * 7 + (s > 0 ? 3 : 0);           // (a facet every few pixels)
            put(p[0], p[1], hash(fc * 3) < 0.45 ? P[1] : P[2]); put(p[0], p[1] - 1, hash(fc * 5) < 0.3 ? P[0] : hash(fc * 5) < 0.75 ? P[1] : P[2]);
            if (hash(fc * 9) < 0.55) put(p[0], p[1] - 2, hash(fc * 13) < 0.5 ? P[1] : P[2]);
          } else { put(p[0], p[1], P[2]); put(p[0], p[1] - 1, hash(j * 7) < 0.1 ? P[0] : P[1]); }
          if (lastX !== p[0] || lastY !== p[1]) path.push([p[0], p[1] - 1]);
          if (ros && hash(j * 7 + s) < 0.07) {                       // crystals grown out of the sheathing
            put(p[0], p[1] - 3, P[1]); put(p[0], p[1] - 4, P[0]); put(p[0] + 1, p[1] - 3, P[2]);
            if (hash(j * 11) < 0.5) put(p[0] - 1, p[1] - 3, P[1]);
            spark.push([p[0], p[1] - 4]);
          }
        }
        lastX = p[0]; lastY = p[1];
      }
    });
    // across the transom when her stern's toward you
    if ((cop || ros) && -sn > 0.08) {
      var w0 = half(Ln, 0), bz0 = B[1] + 0.01;
      for (var v = -w0 * B[0]; v <= w0 * B[0]; v += 1 / TS) {
        var p0 = scr(uOf(Ln, 0) - 0.01, v, bz0), P0 = ros ? ROSE : COPPER;
        put(p0[0], p0[1] + 1, P0[3]); put(p0[0], p0[1], P0[2]); put(p0[0], p0[1] - 1, P0[1]);
      }
    }
    var keys = Object.keys(px), x0 = 1e9, y0b = 1e9, x1 = -1e9, y1b = -1e9;
    keys.forEach(function (kk) { var a = kk.split(','), x = +a[0], y = +a[1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0b) y0b = y; if (y > y1b) y1b = y; });
    var out = { x: x0, y: y0b, path: path, spark: spark, c: null };
    if (keys.length) {
      var cv = document.createElement('canvas'); cv.width = x1 - x0 + 1; cv.height = y1b - y0b + 1;
      var g = cv.getContext('2d');
      keys.forEach(function (kk) { var a = kk.split(','); g.fillStyle = px[kk]; g.fillRect(+a[0] - x0, +a[1] - y0b, 1, 1); });
      out.c = cv;
    }
    if (++bandN > 96) { BANDS = {}; bandN = 1; }                       // (the odd heading ship: start the store again)
    BANDS[id] = out;
    return out;
  }
  /** Her hull's bands, on the water at (X, Y) (her centre on the screen), with a glint running along copper and a
   *  sparkle in roseite. */
  function hull(c, b, X, Y, hi, now, blit) {
    var k = kitOf(b);
    if (!k.bands) return;
    var B = bands(k.sheet, hi, k.bands);
    if (!B.c) return;
    blit(B.c, 0, 0, B.c.width, B.c.height, X + B.x, Y + B.y, B.c.width, B.c.height);
    var n = B.path.length;
    if (k.copper && !k.roseite && n > 6) {                            // the light running along the copper
      var at = Math.floor(((now / 2600 + (b.seed || 0)) % 1) * (n + 30)) - 15;
      for (var d = -2; d <= 2; d++) {
        var q = B.path[at + d];
        if (!q) continue;
        c.fillStyle = d === 0 ? '#fff8e8' : Math.abs(d) === 1 ? '#ffe0a8' : '#f4b878';
        c.fillRect(X + q[0], Y + q[1], 1, 1);
      }
    }
    if (k.roseite) B.spark.forEach(function (q, i) {                   // roseite catching the light, a crystal at a time
      var tw = Math.sin(now / 260 + i * 2.7);
      if (tw > 0.75) { c.fillStyle = '#ffffff'; c.fillRect(X + q[0], Y + q[1], 1, 1); if (tw > 0.93) { c.fillStyle = 'rgba(255,220,244,0.8)'; c.fillRect(X + q[0] - 1, Y + q[1], 3, 1); c.fillRect(X + q[0], Y + q[1] - 1, 1, 3); } }
    });
  }

  return { LINES: LINES, STATIONS: STATIONS, LOOK: LOOK, lines: lines, scale: scale, length: length, half: half, sheer: sheer, deckAt: deckAt,
           kitOf: kitOf, sig: sig, mounts: mounts, guns: guns, hull: hull, muzzle: muzzle, fired: fired, mountOf: mountOf, flash: flash };
})();
