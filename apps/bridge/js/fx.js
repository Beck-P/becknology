/**
 * BridgeFX — transient visual effects layer.
 *
 * Particles, slashes, hit flashes — anything short-lived that should
 * render on top of the world but not be tracked as a tile or entity.
 * Each effect has a startTime + duration; expired effects are pruned
 * each draw. Effects are world-relative (tile coordinates).
 *
 *   BridgeFX.spawnSlash(x, y, facing)  // weapon swing arc from a tile (the old swing, when there's no art)
 *   BridgeFX.spawnHitFlash(x, y)        // bright pulse on a target tile
 *   BridgeFX.spawnTrail(points, colour, cls, charged)   // a swing's arc through the blade tip's path (js/arms.js)
 *   BridgeFX.spawnImpact(x, y, kind, heavy, from)       // a hit in its element: steel, frost, burn, holy, drain, heavy
 *   BridgeFX.spawnShock(x, y, scale) / spawnCharge(x, y, level, colour) / spawnDust(x, y, n)
 *   BridgeFX.draw(ctx, offX, offY, ts, time)
 */
var BridgeFX = (function () {
  var effects = [];

  function spawnSlash(x, y, facing) {
    effects.push({
      type: 'slash',
      x: x, y: y, facing: facing || 'down',
      startTime: performance.now(),
      duration: 360
    });
  }

  function spawnHitFlash(x, y) {
    effects.push({
      type: 'hit_flash',
      x: x, y: y,
      startTime: performance.now(),
      duration: 320
    });
  }

  // Enemy-strike streak: dark red line from one tile to another, used by
  // hostiles when they commit to an attack on a locked target tile.
  function spawnStrike(fromX, fromY, toX, toY) {
    effects.push({
      type: 'strike',
      fromX: fromX, fromY: fromY,
      toX: toX, toY: toY,
      startTime: performance.now(),
      duration: 240
    });
  }

  // Damage flash on the player's tile when an enemy lands a hit.
  function spawnDamageFlash(x, y) {
    effects.push({
      type: 'damage_flash',
      x: x, y: y,
      startTime: performance.now(),
      duration: 320
    });
  }

  // Rising pixel combat/pickup text (e.g. "-25", "+1 STONE SHARD").
  function spawnFloatingText(x, y, text, color) {
    effects.push({
      type: 'floating_text',
      x: x + (Math.random() - 0.5) * 0.22,
      y: y,
      text: String(text || ''),
      color: color || '#ffe080',
      startTime: performance.now(),
      duration: 780
    });
  }

  // Pixel particle burst for hits, kills, and loot pickups.
  function spawnSparks(x, y, color, count) {
    var n = count || 6;
    var particles = [];
    for (var i = 0; i < n; i++) {
      var angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.55;
      var speed = 0.35 + Math.random() * 0.55;
      particles.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.22,
        size: (i % 2 === 0) ? 1.5 : 1.0
      });
    }
    effects.push({
      type: 'sparks',
      x: x, y: y,
      color: color || '#ffd870',
      particles: particles,
      startTime: performance.now(),
      duration: 420
    });
  }

  // ---- fighting (js/arms.js) --------------------------------------------------------------------------------------
  // points: tile coordinates the blade's tip passes through, oldest first; inner: the same moments a way back along
  // the blade. The smear between them is filled pixel by pixel (crisp, on the grid), brightest at the newest end;
  // it sweeps on and burns away behind.
  function curve(points, per) {
    var out = [];
    for (var i = 0; i < points.length - 1; i++) {                 // Catmull-Rom through the positions
      var p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
      for (var k = 0; k < per[i]; k++) {
        var t = k / per[i], t2 = t * t, t3 = t2 * t;
        out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }
  function spawnTrail(points, colour, cls, charged, inner) {
    var per = [];
    for (var i = 0; i < points.length - 1; i++) per.push(Math.max(6, Math.ceil(Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]) * 32 * 1.5)));
    effects.push({ type: 'trail', pts: curve(points, per), ins: inner && inner.length === points.length ? curve(inner, per) : null, colour: colour || '#ffffff',
                   wide: cls === 'maul' || cls === 'chop' ? 1 : 0, charged: !!charged,
                   startTime: performance.now(), duration: charged ? 280 : cls === 'maul' ? 240 : 190 });
  }
  var IMPACT = { steel: ['#fff8e0', '#ffe080'], frost: ['#e8f8ff', '#8ad0ff'], burn: ['#fff0a0', '#ff8a30'], holy: ['#fffbe8', '#ffe890'],
                 drain: ['#d0ffe0', '#70e090'], heavy: ['#e8dcc0', '#9a8a70'] };
  function spawnImpact(x, y, kind, heavy, from) {
    var n = kind === 'burn' ? 9 : kind === 'frost' ? 7 : 8, parts = [];
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.5, sp = 0.5 + Math.random() * 0.7;
      parts.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - (kind === 'burn' ? 0.5 : 0.15), r: Math.random() });
    }
    effects.push({ type: 'impact', kind: IMPACT[kind] ? kind : 'steel', x: x, y: y, heavy: !!heavy, parts: parts, from: from,
                   startTime: performance.now(), duration: kind === 'drain' ? 520 : kind === 'burn' ? 520 : 380 });
  }
  function spawnShock(x, y, scale) {
    effects.push({ type: 'shock', x: x, y: y, s: scale || 1, startTime: performance.now(), duration: 460 });
    spawnDust(x, y, 7);
  }
  function spawnCharge(x, y, lvl, colour) {
    effects.push({ type: 'charge', x: x, y: y, full: lvl >= 1, colour: colour || '#ffe080', a: Math.random() * Math.PI * 2,
                   startTime: performance.now(), duration: lvl >= 1 ? 320 : 260 });
  }
  function spawnDust(x, y, n) {
    var parts = [];
    for (var i = 0; i < (n || 5); i++) parts.push({ vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.25, s: 1 + Math.floor(Math.random() * 2) });
    effects.push({ type: 'dust', x: x, y: y, parts: parts, startTime: performance.now(), duration: 420 });
  }

  function drawTrail(ctx, offX, offY, ts, fx, k) {
    var pts = fx.pts, ins = fx.ins, n = pts.length, fade = 1 - k * k;
    // how much of the arc is lit: it sweeps on fast, then the tail burns away behind it
    var head = Math.min(n - 1, Math.floor((n - 1) * Math.min(1, k * 4))), tail = Math.floor((n - 1) * Math.max(0, k * 1.5 - 0.35));
    var cells = {}, edge = {};
    function plot(map, x, y, f) { var key = x + ',' + y; if (!(map[key] >= f)) map[key] = f; }
    for (var i = tail; i <= head; i++) {
      var f = (i - tail) / Math.max(1, head - tail);
      var tx = Math.round(offX + pts[i][0] * ts), ty = Math.round(offY + pts[i][1] * ts);
      plot(edge, tx, ty, f);
      if (fx.wide || fx.charged) plot(edge, tx + 1, ty, f);
      if (!ins) { plot(cells, tx, ty + 1, f); continue; }
      var ix = Math.round(offX + ins[i][0] * ts), iy = Math.round(offY + ins[i][1] * ts), steps = Math.max(Math.abs(tx - ix), Math.abs(ty - iy));
      for (var j = 0; j <= steps; j++) plot(cells, Math.round(ix + (tx - ix) * j / Math.max(1, steps)), Math.round(iy + (ty - iy) * j / Math.max(1, steps)), f * (0.35 + 0.65 * j / Math.max(1, steps)));
    }
    ctx.save();
    ctx.fillStyle = fx.colour;
    Object.keys(cells).forEach(function (key) {
      ctx.globalAlpha = Math.max(0, fade * (0.08 + 0.5 * cells[key]));
      var c = key.split(','); ctx.fillRect(+c[0], +c[1], 1, 1);
    });
    ctx.fillStyle = '#ffffff';                                     // the edge, hot along the newest part
    Object.keys(edge).forEach(function (key) {
      ctx.globalAlpha = Math.max(0, fade * (0.15 + 0.85 * edge[key]));
      var c = key.split(','); ctx.fillRect(+c[0], +c[1], 1, 1);
    });
    ctx.restore();
  }
  function drawImpact(ctx, offX, offY, ts, fx, k) {
    var cx = Math.round(offX + (fx.x + 0.5) * ts), cy = Math.round(offY + (fx.y + 0.35) * ts), C = IMPACT[fx.kind], a = 1 - k;
    ctx.save();
    ctx.globalCompositeOperation = fx.kind === 'heavy' ? 'source-over' : 'lighter';
    if (fx.kind === 'steel' || fx.kind === 'heavy') {             // a star of light, the rays shooting out
      var L = Math.round((fx.heavy ? 9 : 6) * Math.min(1, k * 4) * (1 - k * 0.5));
      ctx.globalAlpha = a; ctx.fillStyle = C[0];
      if (k < 0.45) { ctx.fillRect(cx - L, cy, L * 2 + 1, 1); ctx.fillRect(cx, cy - L, 1, L * 2 + 1); ctx.fillRect(cx - 1, cy - 1, 3, 3); }
      for (var d = 1; d < L * 0.7 && k < 0.35; d++) { ctx.fillRect(cx + d, cy + d, 1, 1); ctx.fillRect(cx - d, cy + d, 1, 1); ctx.fillRect(cx + d, cy - d, 1, 1); ctx.fillRect(cx - d, cy - d, 1, 1); }
    }
    if (fx.kind === 'holy') {                                      // a pillar of pale gold, rays round it
      ctx.globalAlpha = a * 0.7; ctx.fillStyle = C[1];
      var hgt = Math.round(ts * (0.8 + k * 0.6));
      ctx.fillRect(cx - 2, cy - hgt + 4, 5, hgt); ctx.fillStyle = C[0]; ctx.fillRect(cx - 1, cy - hgt + 4, 3, hgt);
      for (var r = 0; r < 8; r++) { var ra = r * Math.PI / 4, rl = 4 + k * 12; ctx.fillRect(Math.round(cx + Math.cos(ra) * rl), Math.round(cy + Math.sin(ra) * rl * 0.7), 2, 2); }
    }
    if (fx.kind === 'frost' && k < 0.3) { ctx.globalAlpha = (0.3 - k) * 2.5; ctx.fillStyle = C[0]; ctx.fillRect(cx - 7, cy - 1, 15, 3); ctx.fillRect(cx - 1, cy - 7, 3, 15); }
    if (fx.kind === 'burn' && k < 0.25) { ctx.globalAlpha = (0.25 - k) * 3; ctx.fillStyle = C[1]; ctx.fillRect(cx - 6, cy - 6, 13, 13); }
    // the particles: shards, embers, motes, dust
    fx.parts.forEach(function (p, i) {
      var px, py;
      if (fx.kind === 'drain' && fx.from) {                      // drawn out of them and back to you
        var tx = offX + (fx.from.x + 0.5) * ts, ty = offY + (fx.from.y + 0.3) * ts, q = Math.min(1, k * 1.3 + p.r * 0.2);
        px = cx + (tx - cx) * q + Math.sin(q * Math.PI) * p.vx * ts * 0.6; py = cy + (ty - cy) * q - Math.sin(q * Math.PI) * ts * (0.4 + p.r * 0.3);
      } else {
        var grav = fx.kind === 'burn' ? -0.35 : fx.kind === 'heavy' ? 0.9 : 0.5;
        px = cx + p.vx * k * ts * (fx.heavy ? 1.3 : 1); py = cy + (p.vy * k + grav * k * k) * ts;
      }
      var sz = fx.kind === 'frost' ? 2 : fx.kind === 'heavy' ? (i % 3 ? 2 : 3) : (i % 2 ? 1 : 2);
      ctx.globalAlpha = Math.max(0, a * (fx.kind === 'burn' ? 1 - k * 0.5 : 1));
      if (fx.kind !== 'heavy') { ctx.fillStyle = 'rgba(10,10,22,0.7)'; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, sz + 2, sz + 2); }
      ctx.fillStyle = fx.kind === 'burn' ? (k + p.r * 0.3 < 0.5 ? C[0] : C[1]) : i % 2 ? C[0] : C[1];
      ctx.fillRect(Math.round(px), Math.round(py), sz, fx.kind === 'frost' ? sz + 1 : sz);
    });
    ctx.restore();
  }
  function drawShock(ctx, offX, offY, ts, fx, k) {
    var cx = offX + (fx.x + 0.5) * ts, cy = offY + (fx.y + 0.75) * ts, R = ts * (0.3 + k * 1.3 * fx.s);
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(Math.round(cx), Math.round(cy), R, R * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = '#7a6a50'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(cx), Math.round(cy), R * 0.7, R * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(20,14,10,' + ((1 - k) * 0.7).toFixed(2) + ')';           // cracks in the ground
    for (var i = 0; i < 5; i++) {
      var a = i * 1.3 + 0.4, L = Math.min(1, k * 3) * ts * 0.55 * fx.s;
      for (var d = 2; d < L; d += 2) ctx.fillRect(Math.round(cx + Math.cos(a) * d + Math.sin(d * 0.7 + i) * 1.5), Math.round(cy + Math.sin(a) * d * 0.5), 2, 1);
    }
    ctx.restore();
  }
  function drawCharge(ctx, offX, offY, ts, fx, k) {
    var cx = offX + fx.x * ts, cy = offY + fx.y * ts;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = fx.colour;
    if (fx.full) {                                                  // full: a ring bursts off the hand
      ctx.globalAlpha = 1 - k; var R = 3 + k * 14;
      for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; ctx.fillRect(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R * 0.8), 2, 2); }
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (1 - k) * 0.9; ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
    } else {                                                        // motes drawn in to the hand
      for (var j = 0; j < 3; j++) {
        var b = fx.a + j * 2.1, d = (1 - k) * 12;
        ctx.globalAlpha = 0.4 + k * 0.6;
        ctx.fillRect(Math.round(cx + Math.cos(b) * d), Math.round(cy + Math.sin(b) * d * 0.8), 1 + (k > 0.6 ? 1 : 0), 1 + (k > 0.6 ? 1 : 0));
      }
    }
    ctx.restore();
  }
  function drawDust(ctx, offX, offY, ts, fx, k) {
    var cx = offX + (fx.x + 0.5) * ts, cy = offY + (fx.y + 0.9) * ts;
    ctx.save();
    fx.parts.forEach(function (p, i) {
      ctx.globalAlpha = (1 - k) * 0.55;
      ctx.fillStyle = i % 2 ? '#b8ac94' : '#8a7e68';
      var s = p.s + Math.round(k * 2);
      ctx.fillRect(Math.round(cx + p.vx * k * ts * 0.6) - (s >> 1), Math.round(cy + p.vy * k * ts - k * 3) - (s >> 1), s, s);
    });
    ctx.restore();
  }

  function clear() { effects.length = 0; }

  function draw(ctx, offX, offY, ts /*, time — ignored, see note */) {
    if (effects.length === 0) return;
    var now = performance.now();
    for (var i = effects.length - 1; i >= 0; i--) {
      var fx = effects[i];
      var elapsed = now - fx.startTime;
      if (elapsed >= fx.duration) { effects.splice(i, 1); continue; }
      var progress = elapsed / fx.duration;
      if (fx.type === 'slash')              drawSlash(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'hit_flash')     drawHitFlash(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'strike')        drawStrike(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'damage_flash')  drawDamageFlash(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'sparks')        drawSparks(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'trail')         drawTrail(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'impact')        drawImpact(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'shock')         drawShock(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'charge')        drawCharge(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'dust')          drawDust(ctx, offX, offY, ts, fx, progress);
    }
  }

  function drawScreen(ctx, offX, offY, ts) {
    if (effects.length === 0) return;
    var now = performance.now();
    for (var i = effects.length - 1; i >= 0; i--) {
      var fx = effects[i];
      if (fx.type !== 'floating_text') continue;
      var elapsed = now - fx.startTime;
      if (elapsed >= fx.duration) { effects.splice(i, 1); continue; }
      drawFloatingText(ctx, offX, offY, ts, fx, elapsed / fx.duration);
    }
  }

  function drawSlash(ctx, offX, offY, ts, fx, progress) {
    var cx = offX + (fx.x + 0.5) * ts;
    var cy = offY + (fx.y + 0.5) * ts;
    var dxDir =
      fx.facing === 'right' ? 1 :
      fx.facing === 'left'  ? -1 : 0;
    var dyDir =
      fx.facing === 'down'  ? 1 :
      fx.facing === 'up'    ? -1 : 0;

    // A short, sharp thrust — extends out, then snaps back. The blade
    // is small steel, not a glowing beam: outline + steel body + 1px
    // highlight, with a tapered tip pixel ahead of the body.
    var reach = (progress < 0.4) ? (progress / 0.4) : (1 - (progress - 0.4) / 0.6);
    reach = Math.max(0, Math.min(1, reach));
    var fade = Math.min(1, reach * 1.4);

    // Position the blade just outside the player tile, extending outward
    // by `reach` worth of distance.
    var distance = ts * (0.30 + reach * 0.55);     // 0.30 to 0.85 tile out
    var tx = cx + dxDir * distance;
    var ty = cy + dyDir * distance;

    // Sweeping steel crescent afterimage behind the thrust
    var baseAngle =
      fx.facing === 'right' ? 0 :
      fx.facing === 'down'  ? Math.PI * 0.5 :
      fx.facing === 'left'  ? Math.PI : -Math.PI * 0.5;
    var sweepSpan = Math.PI * 0.52;
    var sweepEnd = baseAngle - sweepSpan * 0.5 + sweepSpan * Math.min(1, progress * 1.45);
    ctx.save();
    ctx.strokeStyle = 'rgba(200,225,255,' + (fade * 0.45).toFixed(2) + ')';
    ctx.lineWidth = Math.max(2, ts * 0.08);
    ctx.beginPath();
    ctx.arc(cx, cy, distance * 0.92, sweepEnd - sweepSpan * 0.45, sweepEnd);
    ctx.stroke();
    ctx.restore();

    var bladeLen = ts * (0.22 + reach * 0.18);     // ~10-19px
    var bladeThick = Math.max(2, ts * 0.10);       // ~4-5px

    // Dark steel outline (1px wider on each side)
    ctx.fillStyle = 'rgba(10,12,18,' + fade.toFixed(2) + ')';
    fillCenteredRect(ctx, tx, ty, dxDir, dyDir, bladeLen + 2, bladeThick + 2);
    // Steel body
    ctx.fillStyle = 'rgba(150,160,172,' + fade.toFixed(2) + ')';
    fillCenteredRect(ctx, tx, ty, dxDir, dyDir, bladeLen, bladeThick);
    // 1px bright steel highlight along the upper edge of the blade
    ctx.fillStyle = 'rgba(220,228,240,' + fade.toFixed(2) + ')';
    var hlW = (dxDir !== 0) ? bladeLen - 2 : Math.max(1, bladeThick * 0.45);
    var hlH = (dyDir !== 0) ? bladeLen - 2 : Math.max(1, bladeThick * 0.45);
    ctx.fillRect(
      Math.floor(tx - hlW / 2),
      Math.floor(ty - hlH / 2),
      Math.ceil(hlW), Math.ceil(hlH)
    );

    // Tapered tip — one bright pixel ahead of the blade
    var tipX = cx + dxDir * (distance + bladeLen / 2);
    var tipY = cy + dyDir * (distance + bladeLen / 2);
    var tipSize = Math.max(2, ts * 0.07);
    ctx.fillStyle = 'rgba(240,245,255,' + fade.toFixed(2) + ')';
    ctx.fillRect(Math.floor(tipX - tipSize / 2), Math.floor(tipY - tipSize / 2),
                 Math.ceil(tipSize), Math.ceil(tipSize));
  }

  // Draws a rect of `length` × `width` centered at (cx, cy), oriented
  // along the (dx, dy) cardinal axis. If pointing horizontally, length
  // is the x-axis dimension; if vertical, length is the y-axis.
  function fillCenteredRect(ctx, cx, cy, dx, dy, length, width) {
    var w = (dx !== 0) ? length : width;
    var h = (dy !== 0) ? length : width;
    ctx.fillRect(Math.floor(cx - w / 2), Math.floor(cy - h / 2), Math.ceil(w), Math.ceil(h));
  }

  function drawHitFlash(ctx, offX, offY, ts, fx, progress) {
    var cx = offX + (fx.x + 0.5) * ts;
    var cy = offY + (fx.y + 0.5) * ts;
    var alpha = 1 - progress;
    // Outer red halo — bigger and brighter so the impact reads
    var outerSize = ts * (1.0 + 0.3 * progress);
    ctx.fillStyle = 'rgba(255,120,60,' + (alpha * 0.55).toFixed(2) + ')';
    ctx.fillRect(Math.floor(cx - outerSize / 2), Math.floor(cy - outerSize / 2),
                 Math.ceil(outerSize), Math.ceil(outerSize));
    // Mid warm band
    var midSize = ts * (0.75 - 0.10 * progress);
    ctx.fillStyle = 'rgba(255,200,120,' + (alpha * 0.7).toFixed(2) + ')';
    ctx.fillRect(Math.floor(cx - midSize / 2), Math.floor(cy - midSize / 2),
                 Math.ceil(midSize), Math.ceil(midSize));
    // Inner bright core
    var innerSize = ts * (0.45 - 0.18 * progress);
    ctx.fillStyle = 'rgba(255,255,240,' + (alpha * 0.95).toFixed(2) + ')';
    ctx.fillRect(Math.floor(cx - innerSize / 2), Math.floor(cy - innerSize / 2),
                 Math.ceil(innerSize), Math.ceil(innerSize));
  }

  // Enemy strike: a dark red line that extends from the statue's tile to
  // the target tile over the first half, then snaps back over the second.
  function drawStrike(ctx, offX, offY, ts, fx, progress) {
    var fcx = offX + (fx.fromX + 0.5) * ts;
    var fcy = offY + (fx.fromY + 0.5) * ts;
    var tcx = offX + (fx.toX + 0.5) * ts;
    var tcy = offY + (fx.toY + 0.5) * ts;
    var reach = (progress < 0.5) ? (progress * 2) : 1;
    var fade = (progress < 0.5) ? 1 : (1 - (progress - 0.5) * 2);

    var tipX = fcx + (tcx - fcx) * reach;
    var tipY = fcy + (tcy - fcy) * reach;

    ctx.lineCap = 'round';
    // Dark outer band
    ctx.strokeStyle = 'rgba(80,10,20,' + (fade * 0.85).toFixed(2) + ')';
    ctx.lineWidth = Math.max(4, ts * 0.26);
    ctx.beginPath(); ctx.moveTo(fcx, fcy); ctx.lineTo(tipX, tipY); ctx.stroke();
    // Crimson mid
    ctx.strokeStyle = 'rgba(200,40,60,' + (fade * 0.9).toFixed(2) + ')';
    ctx.lineWidth = Math.max(3, ts * 0.15);
    ctx.beginPath(); ctx.moveTo(fcx, fcy); ctx.lineTo(tipX, tipY); ctx.stroke();
    // Hot core
    ctx.strokeStyle = 'rgba(255,180,200,' + fade.toFixed(2) + ')';
    ctx.lineWidth = Math.max(2, ts * 0.07);
    ctx.beginPath(); ctx.moveTo(fcx, fcy); ctx.lineTo(tipX, tipY); ctx.stroke();

    // Tip puck at the leading edge
    var tipSize = Math.max(6, ts * 0.35);
    ctx.fillStyle = 'rgba(255,200,220,' + fade.toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(tipX, tipY, tipSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player damage flash: red pulse on the player's tile + subtle screen border pulse.
  function drawDamageFlash(ctx, offX, offY, ts, fx, progress) {
    var cx = offX + (fx.x + 0.5) * ts;
    var cy = offY + (fx.y + 0.5) * ts;
    var alpha = 1 - progress;
    // Outer dim red, grows slightly
    var outerSize = ts * (1.05 + 0.25 * progress);
    ctx.fillStyle = 'rgba(180,20,30,' + (alpha * 0.55).toFixed(2) + ')';
    ctx.fillRect(Math.floor(cx - outerSize / 2), Math.floor(cy - outerSize / 2),
                 Math.ceil(outerSize), Math.ceil(outerSize));
    // Inner bright red
    var innerSize = ts * (0.7 - 0.2 * progress);
    ctx.fillStyle = 'rgba(255,80,60,' + (alpha * 0.85).toFixed(2) + ')';
    ctx.fillRect(Math.floor(cx - innerSize / 2), Math.floor(cy - innerSize / 2),
                 Math.ceil(innerSize), Math.ceil(innerSize));

    // Screen-edge crimson warning pulse
    if (ctx.canvas) {
      var cw = ctx.canvas.width, ch = ctx.canvas.height;
      var border = Math.max(8, Math.floor(Math.min(cw, ch) * 0.025));
      ctx.fillStyle = 'rgba(220,25,45,' + (alpha * 0.28).toFixed(2) + ')';
      ctx.fillRect(0, 0, cw, border);
      ctx.fillRect(0, ch - border, cw, border);
      ctx.fillRect(0, border, border, ch - border * 2);
      ctx.fillRect(cw - border, border, border, ch - border * 2);
    }
  }

  function drawSparks(ctx, offX, offY, ts, fx, progress) {
    var cx = offX + (fx.x + 0.5) * ts;
    var cy = offY + (fx.y + 0.5) * ts;
    var u = Math.max(2, Math.floor(ts / 16));
    var alpha = Math.max(0, 1 - progress * 0.9);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var i = 0; i < fx.particles.length; i++) {
      var p = fx.particles[i];
      var px = cx + p.vx * progress * ts;
      var py = cy + (p.vy * progress + 0.45 * progress * progress) * ts;
      var sz = Math.max(2, Math.round(u * p.size));
      ctx.fillStyle = '#0a0a16';
      ctx.fillRect(Math.floor(px - 1), Math.floor(py - 1), sz + 2, sz + 2);
      ctx.fillStyle = fx.color;
      ctx.fillRect(Math.floor(px), Math.floor(py), sz, sz);
    }
    ctx.restore();
  }

  function drawFloatingText(ctx, offX, offY, ts, fx, progress) {
    var cx = offX + (fx.x + 0.5) * ts;
    var lift = Math.pow(progress, 0.7) * ts * 0.75;
    var cy = offY + (fx.y + 0.25) * ts - lift;
    var alpha = progress < 0.65 ? 1 : (1 - (progress - 0.65) / 0.35);
    var fontSize = Math.max(9, Math.round(ts * 0.22));
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = 'bold ' + fontSize + 'px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Crisp 1px pixel shadow outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillText(fx.text, Math.floor(cx) - 1, Math.floor(cy));
    ctx.fillText(fx.text, Math.floor(cx) + 1, Math.floor(cy));
    ctx.fillText(fx.text, Math.floor(cx), Math.floor(cy) - 1);
    ctx.fillText(fx.text, Math.floor(cx), Math.floor(cy) + 2);
    ctx.fillStyle = fx.color;
    ctx.fillText(fx.text, Math.floor(cx), Math.floor(cy));
    ctx.restore();
  }

  return {
    spawnSlash: spawnSlash,
    spawnHitFlash: spawnHitFlash,
    spawnStrike: spawnStrike,
    spawnDamageFlash: spawnDamageFlash,
    spawnFloatingText: spawnFloatingText,
    spawnSparks: spawnSparks,
    spawnTrail: spawnTrail,
    spawnImpact: spawnImpact,
    spawnShock: spawnShock,
    spawnCharge: spawnCharge,
    spawnDust: spawnDust,
    clear: clear,
    draw: draw,
    drawScreen: drawScreen
  };
})();
