/**
 * BridgeFX — transient visual effects layer.
 *
 * Particles, slashes, hit flashes — anything short-lived that should
 * render on top of the world but not be tracked as a tile or entity.
 * Each effect has a startTime + duration; expired effects are pruned
 * each draw. Effects are world-relative (tile coordinates).
 *
 *   BridgeFX.spawnSlash(x, y, facing)  // weapon swing arc from a tile
 *   BridgeFX.spawnHitFlash(x, y)        // bright pulse on a target tile
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
    clear: clear,
    draw: draw,
    drawScreen: drawScreen
  };
})();
