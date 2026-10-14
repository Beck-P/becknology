/**
 * BridgePachinko — Lucky 7's machines (interaction type 'pachinko', with
 * `machine`: which one) and the prize counter (type 'pachinko_prizes').
 *
 * A pin board in a native-pixel buffer, scaled up whole. Hold to fire: balls
 * go up the rail on the left and round the top, as hard as the handle is
 * turned (the slider, or ←/→), then off the return rubber and down through
 * the pins. The centre pocket under the screen pays 2 balls and spins the
 * reels (up to four spins held); three alike (1 in 32) opens the attacker at
 * the bottom for a fever — guide rails swing over the funnels, ten balls in
 * it at 8 each (three 7s: two rounds at 10). The tulips either side pay 2.
 * Every machine has its own pins (a seeded layout) and its own look; some
 * are looser than others.
 *
 * Balls live in your box (localStorage bridge_pachinko) between machines:
 * the house gives a tray of 30 once a night, a tray of 50 costs 10 coins
 * (BridgeProgression.wagerCoins), and the counter cashes 5 balls to a coin,
 * up to 150 coins a night. Tuned (in simulation, `_sim`) to give back about
 * 85% of what it takes, a fever every couple of hundred balls — fevers are
 * what you come for.
 */
var BridgePachinko = (function () {
  var KEY = 'bridge_pachinko';
  var HOUSE = 30, TRAY = 50, TRAY_COST = 10, PER_COIN = 5, CASH_CAP = 150;
  var BW = 168, BH = 236;                     // the board, native px
  var CX = 84, CY = 92, R = 80, RI = 71;      // the arch, and the rail inside it
  var BR = 2.5, PR = 1.0;                     // ball and pin radii
  var G = 300, DT = 1 / 600;
  var E_WALL = 0.2, E_PIN = 0.5, GATE = 0, GATE_TOP = 30, EAVE = 7, TULIP_W = 4, GAP_AT = -1;
  var P_WIN = 1 / 32, PAY_START = 2, PAY_TULIP = 2, PAY_FEVER = 8, PAY_SEVEN = 10, FEVER_BALLS = 10, FEVER_SECS = 15;

  var MACHINES = {
    'seven-seas':  { title: 'Seven Seas',  bg: '#0c1e48', bg2: '#183a78', accent: '#40c8ff', glow: '#a0e8ff', art: 'waves' },
    'neon-dragon': { title: 'Neon Dragon', bg: '#240830', bg2: '#4a1058', accent: '#ff50c0', glow: '#ffa0e0', art: 'dragon' },
    'star-idol':   { title: 'Star Idol',   bg: '#2e0e2a', bg2: '#5a1e50', accent: '#ffd040', glow: '#fff0a0', art: 'stars' },
    'lucky-cat':   { title: 'Lucky Cat',   bg: '#381606', bg2: '#6a2c0c', accent: '#ffc030', glow: '#ffe8a0', art: 'paws' },
    'comet-rush':  { title: 'Comet Rush',  bg: '#081a20', bg2: '#10403a', accent: '#60ffc0', glow: '#c0fff0', art: 'comets' },
    'oni-gate':    { title: 'Oni Gate',    bg: '#280808', bg2: '#581410', accent: '#ff6040', glow: '#ffb090', art: 'flames' }
  };

  var save = { balls: 0, day: '', house: false, cashed: 0, fevers: 0, sevens: 0, best: 0 };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function today() { return new Date().toDateString(); }
  function newDay() { if (save.day !== today()) { save.day = today(); save.house = false; save.cashed = 0; store(); } }

  // ---- the board ----------------------------------------------------------------------------------
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h; }

  function build(key) {
    var rnd = rng(hash(key || 'lucky-cat'));
    var segs = [], pins = [], cups = [], mills = [];
    function seg(ax, ay, bx, by, e) { segs.push({ ax: ax, ay: ay, bx: bx, by: by, dx: bx - ax, dy: by - ay, len2: (bx - ax) * (bx - ax) + (by - ay) * (by - ay), e: e }); }
    function poly(pts) { for (var i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); }
    function arc(rad, a0, a1, step) {
      var pts = [];
      for (var a = a0; a <= a1 + 1e-6; a += step) pts.push([CX + Math.cos(a * Math.PI / 180) * rad, CY + Math.sin(a * Math.PI / 180) * rad]);
      return pts;
    }
    // the case: the arch over the top, straight sides, funnels to the out hole
    poly([[4, 200]].concat(arc(R, 180, 360, 4)).concat([[164, 200], [106, 222]]));
    poly([[13, 200], [62, 222]]);
    seg(4, 200, 13, 200);                                    // the bottom of the launch rail
    poly([[13, 200]].concat(arc(RI, 180, 246, 3)));          // the rail's inner wall
    // the return rubber at the end of the rail: whatever rides the rail that far bounces back into the field
    var ra = 318 * Math.PI / 180, rx = CX + Math.cos(ra) * R, ry = CY + Math.sin(ra) * R;
    seg(rx + 1, ry - 2, rx - 5, ry + 11, 0.55);
    var rubber = { ax: rx + 1, ay: ry - 2, bx: rx - 5, by: ry + 11 };
    // kickers down the walls, so nothing slides all the way down untouched
    [104, 134, 164].forEach(function (y) { seg(164, y, 156, y + 5, 0.35); seg(13, y + 14, 20, y + 18, 0.35); });
    // the screen in the middle, a shallow roof so balls roll off it
    var lcd = { x0: 59, y0: 64, x1: 109, y1: 102 };
    // (its eaves overhang the sides, so what rolls off the roof drops clear of the funnel below)
    poly([[lcd.x0, lcd.y1], [lcd.x0, lcd.y0 + 6], [lcd.x0 - EAVE, lcd.y0 + 8], [84, lcd.y0 - 3], [lcd.x1 + EAVE, lcd.y0 + 8],
          [lcd.x1, lcd.y0 + 6], [lcd.x1, lcd.y1], [lcd.x0, lcd.y1]]);
    // pockets: the start pocket under the screen, a tulip either side, the attacker below
    function cup(kind, cx, cy, hw) {
      poly([[cx - hw, cy - 3], [cx - hw, cy + 5], [cx + hw, cy + 5], [cx + hw, cy - 3]]);
      cups.push({ kind: kind, cx: cx, cy: cy, x0: cx - hw + 0.5, x1: cx + hw - 0.5, y0: cy - 1, y1: cy + 5, flash: 0 });
    }
    cup('start', 84, 140, 5);
    cup('tulip', 38, 172, TULIP_W);
    cup('tulip', 130, 172, TULIP_W);
    // the attacker: a wide door at the bottom between the two out gaps, shut but for a fever
    var attacker = { x0: 70, x1: 98, y: 212, open: false, lid: [] };
    var lidStart = segs.length;
    poly([[70, 212], [84, 208], [98, 212]]);
    attacker.lid = segs.splice(lidStart, 2);
    // while it's open, guide rails swing over the funnels and lead into it
    seg(13, 200, 70, 213, 0.1); seg(155, 204, 98, 213, 0.1);
    attacker.guides = segs.splice(segs.length - 2, 2);
    poly([[70, 212], [70, 222], [98, 222], [98, 212]]);
    cups.push({ kind: 'attacker', cx: 84, cy: 216, x0: 70.5, x1: 97.5, y0: 211, y1: 222, flash: 0 });
    // windmills
    mills.push({ x: 28, y: 126, r: 5, w: 7, a: 0 }, { x: 140, y: 126, r: 5, w: -7, a: 0 });
    // gate pins funnelling down to the start pocket
    var gap = GATE + rnd() * 0.8;
    function half(y) { return GATE_TOP - (y - 106) * (GATE_TOP - 8) / 28; }     // the funnel's half width at y
    for (var i = 0; i < 7; i++) {
      var t = i / 6, gyp = 106 + t * 28, gxp = half(gyp);
      gyp += i ? (rnd() - 0.5) * 0.6 : 0;
      if (i === GAP_AT) continue;                                   // one gap in each gate
      pins.push({ x: 84 - gxp - (gap - GATE), y: gyp }, { x: 84 + gxp + (gap - GATE), y: gyp });
    }
    pins.push({ x: 77, y: 136 }, { x: 91, y: 136 });
    // the field: staggered rows, a few gaps per machine
    var off = rnd() * 4, skip = 0.06 + rnd() * 0.08;
    function clear(x, y) {
      var dc = Math.hypot(x - CX, y - CY), ang = Math.atan2(y - CY, x - CX) * 180 / Math.PI;
      if (ang < 0) ang += 360;
      if (y < CY && dc > R - 7) return false;
      if (y < CY && ang >= 175 && ang <= 252 && dc > RI - 6) return false;      // clear of the rail
      if (x < 19 || x > 159) return false;
      if (x > lcd.x0 - EAVE - 5 && x < lcd.x1 + EAVE + 5 && y > lcd.y0 - 9 && y < lcd.y0 + 14) return false;
      if (x > lcd.x0 - 6 && x < lcd.x1 + 6 && y > lcd.y0 - 9 && y < lcd.y1 + 6) return false;
      if (y > lcd.y1 && y < 142 && Math.abs(x - 84) < Math.max(8, half(y)) + 5) return false;   // the funnel under the screen
      for (var c = 0; c < cups.length; c++) if (Math.abs(x - cups[c].cx) < 10 && y > cups[c].cy - 9 && y < cups[c].cy + 8) return false;
      for (var m = 0; m < mills.length; m++) if (Math.hypot(x - mills[m].x, y - mills[m].y) < mills[m].r + 6) return false;
      for (var p = 0; p < pins.length; p++) if (Math.hypot(x - pins[p].x, y - pins[p].y) < 6) return false;
      return y <= 192;
    }
    for (var row = 0; row < 18; row++) {
      var y = 34 + row * 9;
      for (var x = 20 + off + (row % 2) * 6; x < 160; x += 12) {
        if (clear(x, y) && rnd() > skip) pins.push({ x: x, y: y });
      }
    }
    // a bucketed index of everything solid
    var grid = {}, CS = 8;
    function add(cx, cy, item) { var k = cx + ',' + cy; (grid[k] || (grid[k] = [])).push(item); }
    pins.forEach(function (p) {
      for (var cx = Math.floor((p.x - 4) / CS); cx <= Math.floor((p.x + 4) / CS); cx++)
        for (var cy = Math.floor((p.y - 4) / CS); cy <= Math.floor((p.y + 4) / CS); cy++) add(cx, cy, { pin: p });
    });
    segs.forEach(function (s) {
      var x0 = Math.min(s.ax, s.bx) - 4, x1 = Math.max(s.ax, s.bx) + 4, y0 = Math.min(s.ay, s.by) - 4, y1 = Math.max(s.ay, s.by) + 4;
      for (var cx = Math.floor(x0 / CS); cx <= Math.floor(x1 / CS); cx++)
        for (var cy = Math.floor(y0 / CS); cy <= Math.floor(y1 / CS); cy++) add(cx, cy, { seg: s });
    });
    return { key: key, segs: segs, pins: pins, cups: cups, mills: mills, attacker: attacker, lcd: lcd, grid: grid, CS: CS, rubber: rubber,
             balls: [], rnd: rnd };
  }

  function hitSeg(b, s) {
    var t = ((b.x - s.ax) * s.dx + (b.y - s.ay) * s.dy) / s.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var cx = s.ax + s.dx * t, cy = s.ay + s.dy * t, nx = b.x - cx, ny = b.y - cy, d2 = nx * nx + ny * ny;
    if (d2 >= BR * BR || d2 < 1e-9) return;
    var d = Math.sqrt(d2);
    nx /= d; ny /= d;
    b.x = cx + nx * BR; b.y = cy + ny * BR;
    var vn = b.vx * nx + b.vy * ny;
    var e = s.e || E_WALL;
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
  }

  function hitPin(b, p, rnd) {
    var nx = b.x - p.x, ny = b.y - p.y, d2 = nx * nx + ny * ny, rr = BR + PR;
    if (d2 >= rr * rr || d2 < 1e-9) return false;
    var d = Math.sqrt(d2);
    nx /= d; ny /= d;
    b.x = p.x + nx * rr; b.y = p.y + ny * rr;
    var vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + E_PIN) * vn * nx; b.vy -= (1 + E_PIN) * vn * ny;
      var a = (rnd() - 0.5) * 0.16, c = Math.cos(a), s = Math.sin(a), vx = b.vx;
      b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c;
    }
    return true;
  }

  function hitMill(b, m) {
    var nx = b.x - m.x, ny = b.y - m.y, d2 = nx * nx + ny * ny, rr = BR + m.r;
    if (d2 >= rr * rr) return;
    var d = Math.sqrt(d2) || 1;
    nx /= d; ny /= d;
    b.x = m.x + nx * rr; b.y = m.y + ny * rr;
    var sx = -ny * m.w * m.r, sy = nx * m.w * m.r;               // the blades' speed where the ball touches
    var rx = b.vx - sx, ry = b.vy - sy, vn = rx * nx + ry * ny;
    if (vn < 0) { rx -= 1.4 * vn * nx; ry -= 1.4 * vn * ny; }
    b.vx = rx + sx * 0.6; b.vy = ry + sy * 0.6;
  }

  // one physics step for every ball; returns what landed where
  function step(bd, dt, events) {
    var CS = bd.CS;
    bd.mills.forEach(function (m) { m.a += m.w * dt; });
    for (var i = bd.balls.length - 1; i >= 0; i--) {
      var b = bd.balls[i];
      b.vy += G * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      var cell = bd.grid[Math.floor(b.x / CS) + ',' + Math.floor(b.y / CS)];
      if (cell) for (var j = 0; j < cell.length; j++) {
        if (cell[j].pin) { if (hitPin(b, cell[j].pin, bd.rnd)) b.pinged = true; }
        else hitSeg(b, cell[j].seg);
      }
      var gates = bd.attacker.open ? bd.attacker.guides : bd.attacker.lid;
      for (var l = 0; l < gates.length; l++) hitSeg(b, gates[l]);
      for (var m = 0; m < bd.mills.length; m++) hitMill(b, bd.mills[m]);
      var gone = null;
      for (var c = 0; c < bd.cups.length; c++) {
        var cp = bd.cups[c];
        if (cp.kind === 'attacker' && !bd.attacker.open) continue;
        if (b.x > cp.x0 && b.x < cp.x1 && b.y > cp.y0 && b.y < cp.y1 && b.vy > -5) { gone = cp; break; }
      }
      if (gone) { bd.balls.splice(i, 1); events.push(gone); continue; }
      // a weak shot falls back down the rail into the foul hole; anything that comes to rest is cleared
      if (b.x < 13 && b.y > 188 && b.vy > 0) { bd.balls.splice(i, 1); events.push({ kind: 'foul' }); continue; }
      b.still = b.vx * b.vx + b.vy * b.vy < 64 ? (b.still || 0) + dt : 0;
      b.age = (b.age || 0) + dt;
      if (b.still > 1.5 || b.age > 20 || b.y > BH - 4 || b.x < -10 || b.x > BW + 10) { bd.balls.splice(i, 1); events.push({ kind: 'out' }); continue; }
    }
  }

  function launch(bd, power) {
    var v0 = 315 + power * 95;
    bd.balls.push({ x: 8.5, y: 196, vx: (bd.rnd() - 0.5) * 2, vy: -v0 * (1 + (bd.rnd() - 0.5) * 0.03) });
  }

  // run a machine with no screen: what each kind of pocket catches per ball (for tuning and tests)
  function sim(key, power, n) {
    var bd = build(key), ev = [], counts = { start: 0, tulip: 0, attacker: 0, out: 0, foul: 0 }, fired = 0, t = 0, steps = 0;
    while ((fired < n || bd.balls.length) && steps++ < 600 * 600) {
      if (fired < n && t <= 0) { launch(bd, power); fired++; t = 0.2; }
      step(bd, DT, ev);
      t -= DT;
      while (ev.length) counts[ev.shift().kind]++;
    }
    return counts;
  }

  // ---- reels -----------------------------------------------------------------------------------------
  function spinResult() {
    if (Math.random() < P_WIN) {
      var d = Math.random() < 0.2 ? 7 : 1 + Math.floor(Math.random() * 9);
      return { a: d, b: d, c: d, win: true, reach: true };
    }
    var a = 1 + Math.floor(Math.random() * 9), c = 1 + Math.floor(Math.random() * 9), b;
    var reach = Math.random() < 0.3;
    if (reach) c = a;
    do { b = 1 + Math.floor(Math.random() * 9); } while (reach && b === a);
    if (!reach && a === c && b === a) b = (b % 9) + 1;
    return { a: a, b: b, c: c, win: false, reach: a === c };
  }

  // ---- the overlay -------------------------------------------------------------------------------------
  var el = null, cv = null, ctx = null, buf = null, bctx = null, bgBuf = null;
  var game = null, raf = 0, last = 0;

  var DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
             '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];

  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h); }

  function drawBackground(m, bd) {
    bgBuf = document.createElement('canvas');
    bgBuf.width = BW; bgBuf.height = BH;
    var c = bgBuf.getContext('2d'), r = rng(hash(bd.key + 'art'));
    px(c, 0, 0, BW, BH, '#0a0a10');
    // the playfield: dithered two-tone gradient
    for (var y = 0; y < BH; y++) {
      for (var x = 0; x < BW; x++) {
        var inside = y >= CY ? (x > 4 && x < 164 && y < 226) : Math.hypot(x - CX, y - CY) < R;
        if (!inside) continue;
        var t = y / BH + ((x + y) % 2 ? 0.04 : -0.04) + (((x >> 1) + (y >> 1)) % 2 ? 0.03 : 0);
        px(c, x, y, 1, 1, t < 0.5 ? m.bg2 : m.bg);
      }
    }
    // the machine's own art, faint behind the pins
    c.globalAlpha = 0.28;
    var i, a;
    if (m.art === 'waves') for (i = 0; i < 9; i++) for (x = 8; x < 160; x++) px(c, x, 150 + i * 9 + Math.round(Math.sin((x + i * 13) / 9) * 3), 1, 2, m.accent);
    if (m.art === 'dragon') for (i = 0; i < 260; i++) { a = i / 18; px(c, 84 + Math.sin(a) * 52, 30 + i * 0.75, 4 - (i % 3), 3, i % 7 ? m.accent : m.glow); }
    if (m.art === 'stars') for (i = 0; i < 70; i++) { x = 10 + r() * 148; y = 20 + r() * 200; px(c, x, y, 1, 1, m.glow); if (i % 5 === 0) { px(c, x - 2, y, 5, 1, m.accent); px(c, x, y - 2, 1, 5, m.accent); } }
    if (m.art === 'paws') for (i = 0; i < 16; i++) { x = 16 + r() * 136; y = 120 + r() * 100; px(c, x, y, 5, 4, m.accent); for (a = 0; a < 3; a++) px(c, x - 1 + a * 3, y - 3, 2, 2, m.accent); }
    if (m.art === 'comets') for (i = 0; i < 12; i++) { x = 20 + r() * 128; y = 20 + r() * 180; for (a = 0; a < 18; a++) px(c, x - a, y - a * 0.5, 2, 1, a < 3 ? m.glow : m.accent); }
    if (m.art === 'flames') for (i = 0; i < 40; i++) { x = 8 + i * 4; var hgt = 20 + Math.abs(Math.sin(i * 1.7)) * 34; px(c, x, 228 - hgt, 3, hgt, i % 2 ? m.accent : m.bg2); }
    c.globalAlpha = 1;
    // the case: brass rails along every wall
    bd.segs.forEach(function (s) {
      var n = Math.max(1, Math.ceil(Math.sqrt(s.len2)));
      for (var k = 0; k <= n; k++) px(c, s.ax + s.dx * k / n - 0.5, s.ay + s.dy * k / n - 0.5, 2, 2, '#c8a050');
    });
    bd.segs.forEach(function (s) {
      var n = Math.max(1, Math.ceil(Math.sqrt(s.len2)));
      for (var k = 0; k <= n; k++) px(c, s.ax + s.dx * k / n - 0.5, s.ay + s.dy * k / n - 0.5, 1, 1, '#f0d890');
    });
    // pins: a bright head, a shadow
    bd.pins.forEach(function (p) { px(c, p.x, p.y + 1, 2, 1, 'rgba(0,0,0,0.5)'); px(c, p.x - 0.5, p.y - 0.5, 1, 1, '#f8e8b8'); px(c, p.x + 0.5, p.y - 0.5, 1, 1, '#a08040'); });
  }

  function drawDigit(c, d, x, y, s, col) {
    var g = DIG[d];
    for (var i = 0; i < 15; i++) if (g[i] === '1') px(c, x + (i % 3) * s, y + Math.floor(i / 3) * s, s, s, col);
  }

  function drawBall(c, x, y) {
    x = Math.round(x - 2); y = Math.round(y - 2);
    px(c, x + 1, y, 3, 5, '#9aa0b0'); px(c, x, y + 1, 5, 3, '#9aa0b0');
    px(c, x + 1, y + 1, 3, 3, '#d8dce8'); px(c, x + 1, y + 1, 1, 1, '#ffffff'); px(c, x + 3, y + 3, 1, 1, '#6a7080');
  }

  function draw(now) {
    var g = game, bd = g.bd, m = g.m, c = bctx;
    c.drawImage(bgBuf, 0, 0);
    // the screen
    var L = bd.lcd, fever = g.fever;
    px(c, L.x0 + 2, L.y0 + 4, L.x1 - L.x0 - 4, L.y1 - L.y0 - 6, '#05040a');
    var flash = fever && Math.floor(now / 140) % 2;
    for (var y = L.y0 + 6; y < L.y1 - 3; y += 2) px(c, L.x0 + 3, y, L.x1 - L.x0 - 6, 1, flash ? m.bg2 : 'rgba(255,255,255,0.03)');
    var reel = g.reel, digits = reel ? [reel.show[0], reel.show[1], reel.show[2]] : g.lastDigits;
    for (var i = 0; i < 3; i++) {
      var col = reel && reel.reach && i === 1 && !reel.stopped[1] ? (Math.floor(now / 90) % 2 ? '#ffffff' : m.accent) : m.glow;
      if (fever && !reel) col = Math.floor(now / 160 + i) % 2 ? m.accent : '#ffffff';
      drawDigit(c, digits[i], L.x0 + 9 + i * 15, L.y0 + 13, 4, col);
    }
    for (i = 0; i < 4; i++) px(c, L.x0 + 18 + i * 6, L.y1 - 6, 4, 2, i < g.held ? m.accent : '#2a2a34');
    // windmills
    bd.mills.forEach(function (ml) {
      for (var k = 0; k < 4; k++) {
        var a = ml.a + k * Math.PI / 2;
        for (var r = 1; r <= ml.r; r++) px(c, ml.x + Math.cos(a) * r - 0.5, ml.y + Math.sin(a) * r - 0.5, 1, 1, k % 2 ? m.accent : '#f0e0b0');
      }
      px(c, ml.x - 1, ml.y - 1, 2, 2, '#c8a050');
    });
    // pockets
    bd.cups.forEach(function (cp) {
      var on = now < cp.flash, hw = (cp.x1 - cp.x0) / 2 + 0.5;
      if (cp.kind === 'attacker') {
        if (bd.attacker.open) {
          px(c, cp.x0, 212, cp.x1 - cp.x0, 9, Math.floor(now / 120) % 2 ? m.accent : '#ffffff');
          bd.attacker.guides.forEach(function (s) {
            var n = Math.ceil(Math.sqrt(s.len2));
            for (var k = 0; k <= n; k += 2) px(c, s.ax + s.dx * k / n - 0.5, s.ay + s.dy * k / n - 0.5, 2, 1, (k + Math.floor(now / 60)) % 8 < 4 ? m.accent : '#f0d890');
          });
        }
        else { px(c, 71, 210, 26, 11, '#3a2a18'); px(c, 72, 211, 24, 2, on ? '#ffffff' : '#c8a050'); px(c, 76, 215, 16, 3, m.bg2); }
        return;
      }
      px(c, cp.cx - hw, cp.cy - 1, hw * 2, 6, on ? '#ffffff' : (cp.kind === 'start' ? m.accent : m.bg2));
      px(c, cp.cx - hw + 1, cp.cy, hw * 2 - 2, 4, on ? m.glow : '#05040a');
    });
    // balls
    bd.balls.forEach(function (b) { drawBall(c, b.x, b.y); });
    // floating payouts
    g.pops = g.pops.filter(function (p) { return now - p.t < 700; });
    g.pops.forEach(function (p) {
      var dy = (now - p.t) / 40, col = Math.floor(now / 80) % 2 ? '#ffffff' : m.glow;
      String(p.n).split('').forEach(function (ch, k) { drawDigit(c, +ch, p.x + 4 + k * 4, p.y - 10 - dy, 1, col); });
      px(c, p.x, p.y - 8 - dy, 3, 1, col); px(c, p.x + 1, p.y - 9 - dy, 1, 3, col);
    });
    // the frame, scaled up whole
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cv.width, cv.height);
  }

  function pop(cp, n) {
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('pocket'); game.pops.push({ x: cp.cx, y: cp.cy, n: n, t: performance.now() }); cp.flash = performance.now() + 250; }

  function onEvent(ev) {
    var g = game, now = performance.now();
    if (ev.kind === 'out') return;
    if (ev.kind === 'foul') { if (!g.foulNoted) { g.foulNoted = true; status('Too soft - it fell back down the rail. Turn the handle up.'); } return; }
    if (ev.kind === 'start') {
      win(PAY_START); pop(ev, PAY_START);
      if (g.held < 4) g.held++;
    } else if (ev.kind === 'tulip') {
      win(PAY_TULIP); pop(ev, PAY_TULIP);
    } else if (ev.kind === 'attacker' && g.fever) {
      var pay = g.fever.seven ? PAY_SEVEN : PAY_FEVER;
      win(pay); pop(ev, pay);
      g.fever.got++;
      g.fever.won += pay;
      if (g.fever.got >= FEVER_BALLS) endRound(now);
    }
  }

  function win(n) { save.balls += n; game.net += n; dirty(); }
  var saveAt = 0;
  function dirty() { saveAt = performance.now() + 800; }

  function startSpin(now) {
    var g = game;
    g.held--;
    var res = spinResult();
    g.reel = { res: res, t0: now, stops: [now + 700, now + (res.reach ? 3000 : 1600), now + 1150], stopped: [false, false, false],
               show: [1, 1, 1], reach: false };
  }

  function tickReel(now) {
    var g = game, r = g.reel;
    if (!r) {
      if (g.held > 0 && !g.fever) startSpin(now);
      return;
    }
    var want = [r.res.a, r.res.b, r.res.c];
    for (var i = 0; i < 3; i++) {
      if (now >= r.stops[i]) { r.show[i] = want[i]; r.stopped[i] = true; }
      else {
        var slow = i === 1 && r.stopped[0] && r.stopped[2] && r.res.reach ? 260 : 70;
        r.show[i] = 1 + Math.floor((now - r.t0) / slow + i * 3) % 9;
      }
    }
    if (r.stopped[0] && r.stopped[2] && r.res.reach && !r.reach) {
      r.reach = true;
      status('REACH! ' + r.res.a + ' . ' + r.res.c + ' ...');
    }
    if (r.stopped[0] && r.stopped[1] && r.stopped[2] && now > r.stops[1] + 350) {
      g.lastDigits = want;
      g.reel = null;
      if (r.res.win) startFever(now, r.res.a === 7);
      else if (r.res.reach) status('So close.');
    }
  }

  function startFever(now, seven) {
    var g = game;
    g.fever = { seven: seven, round: 1, rounds: seven ? 2 : 1, got: 0, won: 0, until: now + FEVER_SECS * 1000 };
    g.bd.attacker.open = true;
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('fever');
    save.fevers++;
    if (seven) save.sevens++;
    dirty();
    status(seven ? 'LUCKY 7! TWO ROUNDS - the attacker pays ' + PAY_SEVEN + ' a ball.' : 'FEVER! The attacker is open - ' + PAY_FEVER + ' a ball.');
  }

  function endRound(now) {
    var g = game, f = g.fever;
    if (f.round < f.rounds) {
      f.round++; f.got = 0; f.until = now + FEVER_SECS * 1000;
      status('Round two!');
      return;
    }
    g.bd.attacker.open = false;
    if (f.won > save.best) save.best = f.won;
    status('Fever over: +' + f.won + ' balls.' + (f.won >= save.best ? ' Your best yet.' : ''));
    g.fever = null;
    dirty();
  }

  function frame(now) {
    if (!game) return;
    var g = game, dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (g.firing && now >= g.nextShot && save.balls > 0 && g.bd.balls.length < 24) {
      save.balls--; g.net--; dirty();
      launch(g.bd, g.power);
      g.nextShot = now + 210;
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('ball');
    }
    g.acc += dt;
    var ev = [];
    while (g.acc >= DT) { step(g.bd, DT, ev); g.acc -= DT; }
    ev.forEach(onEvent);
    if (g.fever && now > g.fever.until) endRound(now);
    tickReel(now);
    if (saveAt && now > saveAt) { saveAt = 0; store(); }
    draw(now);
    updateHud();
    raf = requestAnimationFrame(frame);
  }

  // ---- DOM --------------------------------------------------------------------------------------------
  function status(t) { if (el) el.querySelector('.pk-status').textContent = t; }

  function updateHud() {
    var g = game;
    el.querySelector('.pk-balls').textContent = save.balls;
    var net = el.querySelector('.pk-net');
    net.textContent = (g.net >= 0 ? '+' : '') + g.net;
    net.className = 'pk-net ' + (g.net >= 0 ? 'up' : 'down');
    el.querySelector('.pk-house').style.display = save.house ? 'none' : '';
    if (!save.balls && !g.bd.balls.length && !g.fever && !g.emptyNoted) { g.emptyNoted = true; status('Out of balls. Get a tray, or cash in at the counter.'); }
    if (save.balls) g.emptyNoted = false;
  }

  function fit() {
    var vw = window.innerWidth, vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    var side = vw > 560;                                   // the controls beside the board, or under it (css)
    var s = side ? Math.min((vw - 240) / BW, (vh - 100) / BH) : Math.min((vw - 40) / BW, (vh - 330) / BH);
    s = s >= 2 ? Math.floor(s) : Math.max(1, s);
    cv.width = BW; cv.height = BH;
    cv.style.width = Math.round(BW * s) + 'px'; cv.style.height = Math.round(BH * s) + 'px';
  }

  function ensure() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'pachinko';
    el.innerHTML = '<div class="pk-panel">' +
      '<div class="pk-head"><span class="pk-title"></span><span class="pk-sub"></span>' +
      '<button class="qj-close pk-close" aria-label="Close"><span class="ip-key">Esc</span></button></div>' +
      '<div class="pk-play">' +
      '<canvas class="pk-board"></canvas>' +
      '<div class="pk-side">' +
      '<div class="pk-stat"><span>Balls</span><b class="pk-balls">0</b></div>' +
      '<div class="pk-stat"><span>This sitting</span><b class="pk-net">0</b></div>' +
      '<label class="pk-handle"><span>Handle</span><input type="range" min="0" max="100" value="55" class="pk-power"></label>' +
      '<button class="pk-fire">Hold to fire</button>' +
      '<div class="pk-keys">Hold Space · ←/→ the handle</div>' +
      '<button class="pk-btn pk-house">House tray · free</button>' +
      '<button class="pk-btn pk-buy">Tray of ' + TRAY + ' · ' + TRAY_COST + ' coins</button>' +
      '</div></div>' +
      '<div class="pk-status"></div></div>' +
      '<div class="pk-panel pk-counter">' +
      '<div class="pk-head"><span class="pk-title">Prize counter</span><span class="pk-sub">Lucky 7</span>' +
      '<button class="qj-close pk-close" aria-label="Close"><span class="ip-key">Esc</span></button></div>' +
      '<div class="pk-count"></div>' +
      '<div class="pk-row"><button class="pk-btn pk-cash" data-n="50"></button><button class="pk-btn pk-cash" data-n="all"></button></div>' +
      '<div class="pk-status pk-cstatus"></div></div>';
    document.body.appendChild(el);
    cv = el.querySelector('.pk-board');
    ctx = cv.getContext('2d');
    buf = document.createElement('canvas');
    buf.width = BW; buf.height = BH;
    bctx = buf.getContext('2d');
    var fire = function (on) { return function (e) { if (game) { game.firing = on; if (on && e) e.preventDefault(); } }; };
    cv.addEventListener('pointerdown', fire(true));
    var fb = el.querySelector('.pk-fire');
    fb.addEventListener('pointerdown', fire(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, fire(false)); fb.addEventListener(n, fire(false)); });
    el.querySelector('.pk-power').addEventListener('input', function (e) { if (game) game.power = e.target.value / 100; });
    el.querySelectorAll('.pk-close').forEach(function (b) { b.addEventListener('click', close); });
    el.querySelector('.pk-house').addEventListener('click', houseTray);
    el.querySelector('.pk-buy').addEventListener('click', buyTray);
    el.querySelectorAll('.pk-cash').forEach(function (b) { b.addEventListener('click', function () { cashIn(b.getAttribute('data-n')); }); });
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
  }

  function houseTray() {
    newDay();
    if (save.house) return;
    save.house = true;
    save.balls += HOUSE;
    store();
    status('On the house: ' + HOUSE + ' balls. Sev says good luck, and means it.');
  }

  function buyTray() {
    var btn = el.querySelector('.pk-buy');
    if (btn.disabled) return;
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.wagerCoins) { status('The tray machine is offline.'); return; }
    btn.disabled = true;
    BridgeProgression.wagerCoins(TRAY_COST, 'pachinko:tray').then(function (res) {
      btn.disabled = false;
      if (res && res.ok) { save.balls += TRAY; store(); status('A tray of ' + TRAY + ' rattles into the cup.'); }
      else status(res && res.reason === 'insufficient' ? 'Not enough coins for a tray.' : 'The tray machine won\'t take your coins just now.');
    }, function () { btn.disabled = false; status('The tray machine won\'t take your coins just now.'); });
  }

  function counterText() {
    newDay();
    var left = Math.max(0, CASH_CAP - save.cashed);
    el.querySelector('.pk-count').innerHTML =
      '<div class="pk-stat"><span>Balls in your box</span><b>' + save.balls + '</b></div>' +
      '<div class="pk-note">' + PER_COIN + ' balls to the coin. The counter pays out ' + left + ' more coin' + (left === 1 ? '' : 's') + ' tonight.</div>' +
      '<div class="pk-note">Fevers: ' + save.fevers + ' · Lucky 7s: ' + save.sevens + ' · Best fever: ' + save.best + ' balls</div>';
    var cash = el.querySelectorAll('.pk-cash');
    var all = Math.min(Math.floor(save.balls / PER_COIN), left);
    cash[0].textContent = '50 balls → ' + (50 / PER_COIN) + ' coins';
    cash[0].disabled = save.balls < 50 || left < 50 / PER_COIN;
    cash[1].textContent = 'Cash in ' + all * PER_COIN + ' → ' + all + ' coins';
    cash[1].disabled = all < 1;
  }

  function cashIn(n) {
    newDay();
    var left = Math.max(0, CASH_CAP - save.cashed);
    var coins = n === 'all' ? Math.min(Math.floor(save.balls / PER_COIN), left) : Math.min(50 / PER_COIN, left);
    if (coins < 1 || save.balls < coins * PER_COIN) return;
    if (typeof BridgeProgression === 'undefined' || !BridgeProgression.awardCoins) return;
    save.balls -= coins * PER_COIN;
    save.cashed += coins;
    store();
    var st = el.querySelector('.pk-cstatus');
    st.textContent = 'Counting...';
    counterText();
    BridgeProgression.awardCoins(coins, 'pachinko:cash').then(function (bal) {
      if (bal === null || bal === undefined) {
        save.balls += coins * PER_COIN; save.cashed -= coins; store();
        st.textContent = 'The till won\'t open just now - your balls are back in your box.';
      } else st.textContent = '+' + coins + ' coins. Sev counts them out twice.';
      counterText();
    }, function () {
      save.balls += coins * PER_COIN; save.cashed -= coins; store();
      st.textContent = 'The till won\'t open just now - your balls are back in your box.';
      counterText();
    });
  }

  function onKey(e) {
    if (!el || !el.classList.contains('visible')) return;
    var k = e.key;
    if (k === 'Escape') { close(); }
    else if (game && (k === ' ' || k === 'e' || k === 'E' || k === 'Enter')) { if (!e.repeat) game.firing = true; }
    else if (game && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd')) {
      game.power = Math.max(0, Math.min(1, game.power + (k === 'ArrowRight' || k === 'd' ? 0.02 : -0.02)));
      el.querySelector('.pk-power').value = Math.round(game.power * 100);
    } else return;
    e.preventDefault(); e.stopPropagation();
  }
  function onKeyUp(e) {
    if (!game) return;
    if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') { game.firing = false; e.preventDefault(); e.stopPropagation(); }
  }

  function show(mode) {
    ensure();
    el.classList.toggle('counter', mode === 'counter');
    el.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKeyUp, true);
  }

  function open(inter) {
    newDay();
    var key = (inter && inter.machine && MACHINES[inter.machine]) ? inter.machine : 'lucky-cat';
    var m = MACHINES[key];
    show('play');
    var bd = build(key);
    drawBackground(m, bd);
    game = { bd: bd, m: m, power: 0.55, firing: false, nextShot: 0, acc: 0, held: 0, reel: null, fever: null,
             lastDigits: [7, 7, 7], pops: [], net: 0 };
    el.querySelector('.pk-power').value = 55;
    el.querySelector('.pk-title').textContent = m.title;
    el.querySelector('.pk-title').style.color = m.accent;
    el.querySelector('.pk-sub').textContent = 'Lucky 7';
    el.querySelector('.pk-panel').style.borderColor = m.accent;
    fit();
    status(save.balls ? 'Turn the handle till they land in the middle. Hold to fire.'
                      : (save.house ? 'Your box is empty. A tray is ' + TRAY_COST + ' coins.' : 'Your box is empty - the house gives you a tray tonight.'));
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function prizes() {
    show('counter');
    game = null;
    el.querySelector('.pk-cstatus').textContent = '';
    counterText();
  }

  function close() {
    if (!el || !el.classList.contains('visible')) return;
    el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    cancelAnimationFrame(raf);
    if (game && game.bd.balls.length) { save.balls += game.bd.balls.length; }    // balls in the air drop back in your cup
    store();
    game = null;
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  return { open: open, prizes: prizes, close: close, machines: function () { return MACHINES; },
           balls: function () { return save.balls; }, _sim: sim, _build: build, _spin: spinResult,
           _fever: function (seven) { if (game) startFever(performance.now(), !!seven); }, _game: function () { return game; } };
})();
