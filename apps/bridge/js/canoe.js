/**
 * BridgeCanoe — down the Silverrun by canoe (Sylvara; Beck: "make sure we can take the boat down the river to the lake.
 * Maybe have some different places you can go on the river").
 *
 * A river world says where its water is and which way it runs (its JSON `river`):
 *   water    rows of '0'/'1' (or '2' for white water) — where a canoe can go
 *   flow     the river's middle, upstream to downstream: [[x, y, speed], …] (tiles; speed in tiles a second) — the current
 *            anywhere is the nearest stretch's way and speed, strongest mid-river, slack at the banks; `flows`: more such
 *            lines (an arm off the main river)
 *   down / up  { edge: 'top'|'bottom'|'left'|'right', target, at: [x, y] } — paddle off that edge and you're carried on
 *            into the next stretch (target), arriving at `at` in your canoe; `forks`: more such ways off (into the Deepwood)
 *   landings [[x, y], …] — dry cells beside the water where you can step ashore (E when you're alongside)
 *   racks    [[x, y], …] — the elves' canoe racks: E takes one out (an interaction `sylvan`/`canoe` is added there)
 * Paddling: the arrow keys (the stick) pull you that way — the canoe turns toward it and gathers way, the current carries
 * you on, and the banks stop you (you slide along them). White water ('2') runs fast and bumps you about. E alongside a
 * landing steps you ashore; the canoe stays moored there (E on it takes you back out). Your canoe goes with you from
 * one stretch to the next.
 *
 * Drawn as the scenes are: the canoe's hull and its near gunwale (assets/scenes/canoe, tools/bridge-art/canoe_sprites.py,
 * 16 headings) with you sat in it between them (your own seated sheet), the paddle dipping on alternate sides, a wake.
 * You're a pose (BridgeCharacter.setPose kind 'canoe', drawn by its own `item`), so the camera, the light, interactions
 * and the others in the place (js/multi.js — heading and stroke on the wire) all follow.
 *
 *   BridgeCanoe.use(inter) — a rack, a moored canoe; .decorate(id, data); .board(x, y, heading); .ashore(); .active()
 */
var BridgeCanoe = (function () {
  var DIR = '/bridge/assets/scenes/canoe/';
  var HEADINGS = 16, CELL = 3 * 32;                  // the sheet: 16 headings across, hull row then front row, 3 × 3 tiles a cell
  var MAX = 3.0, PULL = 4.2, DRAG = 1.1, TURN = 3.4;  // tiles/s, tiles/s², 1/s, rad/s
  var st = null;                                     // { x, y, vx, vy, th, stroke, t0 } while you're in a canoe
  var moored = {};                                   // world id → [x, y, heading] where you left it
  var pending = null;                                // carried on into the next stretch: { at, th }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function world() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null; }

  // ---- the sheet ---------------------------------------------------------------------------------------------------
  var sheet = { img: null, ready: false, meta: null };
  function loadSheet() {
    if (sheet.img) return;
    sheet.img = new Image();
    fetch(DIR + 'scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (m) {
      sheet.meta = m;
      sheet.img.onload = function () { sheet.ready = true; };
      sheet.img.src = DIR + 'full.' + (m.ext || 'png') + '?v=' + (m.rev || '');
    }).catch(function () { sheet.dead = true; });
  }

  // ---- the river ------------------------------------------------------------------------------------------------------
  function waterAt(w, x, y) {
    var R = w && w.river;
    if (!R || !R.water) return 0;
    var row = R.water[Math.floor(y)];
    if (!row) return 0;
    var c = row.charAt ? row.charAt(Math.floor(x)) : row[Math.floor(x)];
    return +c || 0;
  }
  // the current at a point: the nearest stretch of the flow line, its way and speed, easing off toward the banks
  function current(w, x, y) {
    var lines = [w.river && w.river.flow].concat((w.river && w.river.flows) || []).filter(function (f) { return f && f.length > 1; });
    if (!lines.length) return [0, 0];
    var best = null;
    for (var n = 0; n < lines.length; n++) for (var i = 0, F = lines[n]; i < F.length - 1; i++) {
      var a = F[i], b = F[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-6;
      if (L2 > 25) continue;                         // a jump between stretches (over the falls): not water
      var t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
      var px = a[0] + dx * t, py = a[1] + dy * t, d = Math.hypot(x - px, y - py);
      if (!best || d < best.d) best = { d: d, dx: dx, dy: dy, L: Math.sqrt(L2), s: (a[2] || 0.6) + ((b[2] || 0.6) - (a[2] || 0.6)) * t };
    }
    var k = Math.max(0.25, 1 - best.d / ((w.river.width || 3) * 0.75));
    var white = waterAt(w, x, y) === 2 ? 1.5 : 1;
    return [best.dx / best.L * best.s * k * white, best.dy / best.L * best.s * k * white];
  }

  // ---- in and out ---------------------------------------------------------------------------------------------------
  function headingFrom(f) { return { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[f] || Math.PI / 2; }
  function facingOf(th) {
    var c = Math.cos(th), s = Math.sin(th);
    return Math.abs(c) > Math.abs(s) ? (c > 0 ? 'right' : 'left') : (s > 0 ? 'down' : 'up');
  }
  /** Into a canoe at (x, y) (a water cell's middle), heading th. */
  function board(x, y, th) {
    var w = world();
    if (!w || !w.river || typeof BridgeCharacter === 'undefined' || !BridgeCharacter.setPose) return false;
    loadSheet();
    var wid = BridgeWorld.getWorldId();
    delete moored[wid];
    st = { x: x, y: y, vx: 0, vy: 0, th: th == null ? Math.PI / 2 : th, stroke: 0, side: 1, t: performance.now(), bump: 0, wake: [] };
    // a mode of its own (js/world.js): it moves you and takes E, and nothing else asks for E while you're afloat
    BridgeWorld.setMode({ update: modeUpdate, solo: true, end: function () { if (st) { st = null; BridgeCharacter.setPose(null); } } });
    pose();
    sfx('splash');
    refresh(w);
    return true;
  }
  function nearestWater(w, x, y) {
    var best = null;
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      if (!waterAt(w, x + dx + 0.5, y + dy + 0.5)) continue;
      var d = Math.hypot(dx, dy);
      if (d && (!best || d < best.d)) best = { x: x + dx + 0.5, y: y + dy + 0.5, d: d };
    }
    return best;
  }
  // the nearest landing you're alongside, if any
  function landingNear(w) {
    var L = (w.river && w.river.landings) || [], best = null;
    L.forEach(function (p) {
      var d = Math.hypot(p[0] + 0.5 - st.x, p[1] + 0.5 - st.y);
      if (d < 1.6 && (!best || d < best.d)) best = { x: p[0], y: p[1], d: d };
    });
    return best;
  }
  /** Step ashore at the landing you're alongside (E). */
  function ashore() {
    var w = world();
    if (!st || !w) return false;
    var L = landingNear(w);
    if (!L) { floatText('NO LANDING HERE'); return false; }
    var wid = BridgeWorld.getWorldId();
    moored[wid] = [st.x, st.y, st.th];
    st = null;
    BridgeWorld.setMode(null);
    BridgeCharacter.setPose(null);
    if (BridgeCharacter.init) BridgeCharacter.init(L.x, L.y);
    BridgeCharacter.setFacing(facingOf(Math.atan2(L.y + 0.5 - moored[wid][1], L.x + 0.5 - moored[wid][0])));
    sfx('step');
    refresh(w);
    return true;
  }
  function floatText(t) {
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText && st) BridgeFX.spawnFloatingText(st.x - 0.5, st.y - 1.2, t, '#d8f0f0');
  }
  // the interactions for taking a canoe out: the racks, and where yours is moored
  function refresh(w) {
    if (!w) return;
    var wid = BridgeWorld.getWorldId && BridgeWorld.getWorldId();
    w.interactions = (w.interactions || []).filter(function (it) { return !it._canoe; });
    if (st) return;
    var R = w.river || {};
    (R.racks || []).forEach(function (p) {
      w.interactions.push({ x: p[0], y: p[1], type: 'sylvan', kind: 'canoe', label: 'CANOE RACK', prompt: 'PRESS E TO TAKE A CANOE OUT', verb: 'Paddle', _canoe: true });
    });
    var m = moored[wid];
    if (m) {
      var L = (R.landings || []).reduce(function (b, p) { var d = Math.hypot(p[0] + 0.5 - m[0], p[1] + 0.5 - m[1]); return !b || d < b.d ? { p: p, d: d } : b; }, null);
      if (L) w.interactions.push({ x: L.p[0], y: L.p[1], type: 'sylvan', kind: 'launch', label: 'YOUR CANOE', prompt: 'PRESS E TO PADDLE OFF', verb: 'Paddle', _canoe: true });
    }
  }

  function use(inter) {
    var w = world();
    if (!w) return;
    if (inter.kind === 'launch') {
      var m = moored[BridgeWorld.getWorldId()];
      if (m) board(m[0], m[1], m[2]);
      return;
    }
    // a rack: the canoe goes in at the nearest water, pointing away from the bank
    var water = nearestWater(w, inter.x, inter.y);
    if (!water) return say('CANOE RACK', 'THE RACK\'S HERE BUT THE WATER ISN\'T.');
    board(water.x, water.y, Math.atan2(water.y - (inter.y + 0.5), water.x - (inter.x + 0.5)));
    if (!seen() && typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('A canoe', 'The arrows paddle; the current carries you', 'E beside a landing steps you ashore');
  }
  function seen() {
    try { if (localStorage.getItem('bridge_canoe_seen')) return true; localStorage.setItem('bridge_canoe_seen', '1'); } catch (e) { /* private mode */ }
    return false;
  }

  /** As a river world loads: carried on from the stretch before, you arrive in your canoe; the racks and any moored canoe. */
  function decorate(worldId, data) {
    if (!data || !data.river) { if (st) { st = null; } return; }
    loadSheet();
    if (pending && pending.target === worldId) {
      var p = pending;
      pending = null;
      setTimeout(function () { if (BridgeWorld.getWorldId() === worldId) board(p.at[0] + 0.5, p.at[1] + 0.5, p.th); }, 0);
    }
    setTimeout(function () { if (BridgeWorld.getWorldId() === worldId) refresh(world()); }, 0);
  }

  // ---- each frame: paddling, the current, the banks, the edges -----------------------------------------------------
  function modeUpdate(dt) {
    if (!st) return;
    tick(dt);
    if (st && typeof BridgeControls !== 'undefined' && BridgeControls.consumeAction()) ashore();
  }
  var keysDir = function () { return typeof BridgeControls !== 'undefined' && BridgeControls.getDir ? BridgeControls.getDir() : { dx: 0, dy: 0 }; };
  function tick(dt) {
    var w = world();
    if (!st || !w || !w.river) return;
    var d = keysDir(), want = d.dx || d.dy;
    if (want) {
      var target = Math.atan2(d.dy, d.dx), diff = ((target - st.th + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      st.th += Math.max(-TURN * dt, Math.min(TURN * dt, diff));
      var blessed = typeof BridgeBrewing !== 'undefined' && BridgeBrewing.active('river') ? 1.25 : 1;          // the river shrine's blessing
      var push = PULL * (Math.abs(diff) > 2 ? 0.4 : 1) * blessed * (typeof BridgeMagic !== 'undefined' ? BridgeMagic.speed() : 1);
      st.vx += Math.cos(st.th) * push * dt; st.vy += Math.sin(st.th) * push * dt;
      st.stroke += dt * 2.6;
    } else st.stroke += dt * 0.4 * Math.max(0, Math.sin(st.stroke * Math.PI) > 0 ? 1 : 0);
    var sp = Math.hypot(st.vx, st.vy), top = MAX * (typeof BridgeBrewing !== 'undefined' && BridgeBrewing.active('river') ? 1.25 : 1);
    if (sp > top) { st.vx *= top / sp; st.vy *= top / sp; }
    st.vx -= st.vx * DRAG * dt; st.vy -= st.vy * DRAG * dt;
    var c = current(w, st.x, st.y), nx = st.x + (st.vx + c[0]) * dt, ny = st.y + (st.vy + c[1]) * dt;
    // the ends: off the edge downstream or up, into the next stretch
    var E = edgeOut(w, nx, ny);
    if (E) return carryOn(E);
    // the banks: slide along them
    var hx = waterAt(w, nx + Math.sign(st.vx + c[0]) * 0.3, st.y), hy = waterAt(w, st.x, ny + Math.sign(st.vy + c[1]) * 0.3);
    if (hx) st.x = nx; else { st.vx *= -0.25; bump(); }
    if (hy) st.y = ny; else { st.vy *= -0.25; bump(); }
    if (waterAt(w, st.x, st.y) === 2 && Math.random() < dt * 2) { st.bump = performance.now(); st.th += (Math.random() - 0.5) * 0.3; }
    var now = performance.now();
    if (now - (st.wakeAt || 0) > 90 && (Math.hypot(st.vx + c[0], st.vy + c[1]) > 0.4)) { st.wakeAt = now; st.wake.push({ x: st.x, y: st.y, th: st.th, t: now }); }
    st.wake = st.wake.filter(function (p) { return now - p.t < 1400; });
    pose();
  }
  function bump() {
    var t = performance.now();
    if (t - (st.bumpAt || 0) < 500) return;
    st.bumpAt = t;
    sfx('thud');
  }
  function edgeOut(w, x, y) {
    var R = w.river;
    var at = function (e) { return e && ((e.edge === 'bottom' && y > w.height - 0.3) || (e.edge === 'top' && y < 0.3) || (e.edge === 'left' && x < 0.3) || (e.edge === 'right' && x > w.width - 0.3)); };
    if (at(R.down)) return R.down;
    if (at(R.up)) return R.up;
    var forks = R.forks || [];
    for (var i = 0; i < forks.length; i++) if (at(forks[i])) return forks[i];
    return null;
  }
  function carryOn(E) {
    pending = { target: E.target, at: E.at, th: st.th };
    st = null;
    BridgeWorld.setMode(null);
    BridgeCharacter.setPose(null);
    BridgeWorld.enterWorld(E.target, E.at);
  }
  function pose() {
    var row = Math.round(((st.th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * HEADINGS) % HEADINGS;
    BridgeCharacter.setPose({ kind: 'canoe', x: st.x, y: st.y + 0.12, row: row, col: Math.floor(st.stroke * 2) % 4, lift: 0, th: st.th, item: item });
    BridgeCharacter.setFacing(facingOf(st.th));
  }

  // ---- drawing --------------------------------------------------------------------------------------------------------
  // the canoe at (x, y) heading index h, the stroke s (0-3), with a pilot's seated sheet (img, 32 × 48, row by facing)
  var SEAT_DY = -3;                                  // where the seat is above the waterline, native px
  function drawCanoe(ctx, cx, cy, h, s, sit, facing, tint, sc, footRow, offX, offY, world_, now) {
    var ok = sheet.ready && sheet.meta;
    var hx = h * CELL, ox = CELL / 2, oy = CELL / 2 + 8;   // the canoe's middle in its cell
    var bob = Math.round(Math.sin(now / 420 + cx) * 0.6);
    if (ok) BridgeScene.drawOccluded(ctx, sc, sheet.img, hx, 0, CELL, CELL, cx - ox, cy - oy + bob, footRow - 0.01, offX, offY, tint, null, null, true);
    else { ctx.fillStyle = '#8a6a40'; ctx.beginPath(); ctx.ellipse(cx, cy, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    if (sit && sit.img) {
      var row = { down: 0, right: 1, up: 2, left: 3 }[facing] || 0;
      BridgeScene.drawOccluded(ctx, sc, sit.img || sit, 0, row * 48, 32, 30, cx - 16, cy - 45 + SEAT_DY + 14 + bob, footRow, offX, offY, tint, null, null, true);
    }
    // the paddle: a shaft from the hands down to the water on this stroke's side, the blade dipping
    var side = s < 2 ? 1 : -1, k = (s % 2) / 1, th = world_;
    paddle(ctx, cx, cy + bob, side, k, th);
    if (ok) BridgeScene.drawOccluded(ctx, sc, sheet.img, hx, CELL, CELL, CELL, cx - ox, cy - oy + bob, footRow + 0.01, offX, offY, tint, null, null, true);
  }
  function paddle(ctx, cx, cy, side, k, th) {
    var nx = -Math.sin(th) * side, ny = Math.cos(th) * side * 0.7;
    var hx = cx + nx * 3, hy = cy - 16 + ny * 2;                      // the hands, at the chest
    var bx = cx + nx * 12 - Math.cos(th) * (k ? 6 : -4), by = cy + 2 + ny * 6 - Math.sin(th) * (k ? 3 : -2);
    ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#b08a58'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = '#1a1208'; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 1, 5, 4);
    ctx.fillStyle = '#c8a070'; ctx.fillRect(Math.round(bx) - 1, Math.round(by), 3, 2);
    if (k) { ctx.fillStyle = 'rgba(230,248,250,0.8)'; ctx.fillRect(Math.round(bx) - 3, Math.round(by) + 2, 2, 1); ctx.fillRect(Math.round(bx) + 2, Math.round(by) + 3, 2, 1); }
  }
  function wakeDraw(ctx, offX, offY, ts, now, wake) {
    wake.forEach(function (p) {
      var a = 1 - (now - p.t) / 1400, spread = (1 - a) * 9 + 3;
      var X = offX + p.x * ts, Y = offY + p.y * ts + 6, bx = -Math.cos(p.th), by = -Math.sin(p.th);
      ctx.fillStyle = 'rgba(228,244,246,' + (0.5 * a).toFixed(2) + ')';
      for (var sd = -1; sd <= 1; sd += 2) {
        var x = X + bx * 10 + -by * spread * sd, y = Y + by * 5 + bx * spread * sd * 0.6;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
    });
  }
  // your own pose's scene item (js/character.js asks the pose for it)
  function item(offX, offY, ts, sc, world_, now) {
    var p = BridgeCharacter.getPose(), s = st;
    return { footRow: p.y, draw: function (ctx) {
      if (!s) return;
      var cx = Math.round(offX + p.x * ts), cy = Math.round(offY + p.y * ts), t = performance.now();
      if (t - s.bump < 200) cx += Math.round(Math.sin(t / 25) * 1.5);
      wakeDraw(ctx, offX, offY, ts, t, s.wake);
      var sit = BridgeCharacter.sportImage(BridgeCharacter.sportKey('sit'));
      drawCanoe(ctx, cx, cy, p.row, p.col, sit ? { img: sit } : null, facingOf(s.th), BridgeScene.tintAt(sc, world_, p.x - 0.5, p.y - 1, now), sc, p.y, offX, offY, s.th, t);
      if (landingNear(world_)) hint(ctx, cx, cy - 34, 'E  STEP ASHORE');
    } };
  }
  function hint(ctx, x, y, t) {
    ctx.font = '8px "Pixelify Sans", monospace';
    var w = Math.ceil(ctx.measureText(t).width) + 8;
    ctx.fillStyle = 'rgba(11,10,24,0.72)'; ctx.fillRect(Math.round(x - w / 2), y - 9, w, 12);
    ctx.fillStyle = '#e8f4f0'; ctx.fillText(t, Math.round(x - w / 2) + 4, y);
  }
  /** Someone else in a canoe (js/multi.js): their heading in the pose's row, the stroke in its column. */
  function remoteItem(a, world_, offX, offY, ts, now, sc) {
    var p = a.pose, x = a.x + 0.5, y = a.y + 1 - 3 / 32;
    loadSheet();
    return { footRow: y, draw: function (ctx) {
      var th = p.row / HEADINGS * Math.PI * 2;
      var sit = BridgeCharacter.sportImage('sit-' + a.k);
      drawCanoe(ctx, Math.round(offX + x * ts), Math.round(offY + y * ts), p.row, p.col, sit ? { img: sit } : null, facingOf(th),
                BridgeScene.tintAt(sc, world_, a.x, a.y, now), sc, y, offX, offY, th, performance.now());
    } };
  }
  // canoes moored where you left them, and the current's glints on the water (a ground hook: under everyone)
  function ground(ctx, world_, offX, offY, ts, now) {
    if (!world_ || !world_.river) return;
    flowGlints(ctx, world_, offX, offY, ts, now);
  }
  function flowGlints(ctx, w, offX, offY, ts, now) {
    var F = w.river.flow;
    if (!F) return;
    var V = BridgeWorld.getView ? BridgeWorld.getView() : null;
    ctx.save();
    for (var i = 0; i < 70; i++) {
      var h = Math.sin(i * 91.7) * 43758.5453, u = h - Math.floor(h);
      var seg = Math.floor(u * (F.length - 1)), a = F[seg], b = F[seg + 1];
      var period = 6000 + (i % 7) * 900, k = ((now + i * 777) % period) / period;
      var t = k, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      var h2 = Math.sin(i * 12.3) * 9182.1, off = (h2 - Math.floor(h2) - 0.5) * (w.river.width || 3) * 0.8;
      var L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      x += nx * off; y += ny * off;
      if (!waterAt(w, x, y)) continue;
      var X = Math.round(offX + x * ts), Y = Math.round(offY + y * ts);
      if (V && (X < -4 || Y < -4 || X > V.w + 4 || Y > V.h + 4)) continue;
      var fade = Math.sin(k * Math.PI), white = waterAt(w, x, y) === 2;
      ctx.fillStyle = 'rgba(236,248,250,' + ((white ? 0.75 : 0.32) * fade).toFixed(2) + ')';
      ctx.fillRect(X, Y, white ? 3 : 2, 1);
      if (white) ctx.fillRect(X + 1, Y - 1, 1, 1);
    }
    ctx.restore();
  }
  function items(world_, offX, offY, ts, now, sc) {
    if (!world_ || !world_.river || !sc) return [];
    var m = moored[BridgeWorld.getWorldId()];
    if (!m || st) return [];
    var row = Math.round(((m[2] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * HEADINGS) % HEADINGS;
    return [{ footRow: m[1] + 0.12, draw: function (ctx) {
      drawCanoe(ctx, Math.round(offX + m[0] * ts), Math.round(offY + (m[1] + 0.12) * ts), row, 0, null, 'down',
                BridgeScene.tintAt(sc, world_, m[0] - 0.5, m[1] - 1, now), sc, m[1] + 0.12, offX, offY, m[2], performance.now());
    } }];
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { ground: ground, items: items });

  return { use: use, decorate: decorate, board: board, ashore: ashore, active: function () { return !!st; }, remoteItem: remoteItem,
           current: current, waterAt: waterAt, _st: function () { return st; }, _moored: function () { return moored; } };
})();
