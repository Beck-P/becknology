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

  function clear() { effects.length = 0; }

  function draw(ctx, offX, offY, ts, time) {
    if (effects.length === 0) return;
    var now = (typeof time === 'number') ? time : performance.now();
    for (var i = effects.length - 1; i >= 0; i--) {
      var fx = effects[i];
      var elapsed = now - fx.startTime;
      if (elapsed >= fx.duration) { effects.splice(i, 1); continue; }
      var progress = elapsed / fx.duration;
      if (fx.type === 'slash')      drawSlash(ctx, offX, offY, ts, fx, progress);
      else if (fx.type === 'hit_flash') drawHitFlash(ctx, offX, offY, ts, fx, progress);
    }
  }

  function drawSlash(ctx, offX, offY, ts, fx, progress) {
    var cx = offX + (fx.x + 0.5) * ts;
    var cy = offY + (fx.y + 0.5) * ts;
    var faceAngle =
      fx.facing === 'right' ? 0 :
      fx.facing === 'down'  ? Math.PI / 2 :
      fx.facing === 'left'  ? Math.PI :
                              -Math.PI / 2;
    var radius = ts * 0.95;
    var halfSpan = Math.PI / 2.2;        // ~82° each side, ~164° total arc

    // The visible portion of the arc sweeps from the start to the end
    // angle over the duration: the head leads, the tail follows so the
    // crescent grows then shrinks.
    var headT = Math.min(1, progress * 1.5);
    var tailT = Math.max(0, progress * 1.5 - 0.55);
    var startA = faceAngle - halfSpan + tailT * 2 * halfSpan;
    var endA   = faceAngle - halfSpan + headT * 2 * halfSpan;
    if (endA <= startA) return;

    // Fade in fast, fade out a bit slower
    var fade = (progress < 0.15) ? (progress / 0.15) : (1 - (progress - 0.15) / 0.85);
    fade = Math.max(0, Math.min(1, fade));

    // Outer cyan halo — wider, low alpha
    ctx.strokeStyle = 'rgba(120,220,255,' + (fade * 0.45).toFixed(2) + ')';
    ctx.lineWidth = Math.max(4, ts * 0.32);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startA, endA);
    ctx.stroke();

    // Mid warm band
    ctx.strokeStyle = 'rgba(255,230,180,' + (fade * 0.75).toFixed(2) + ')';
    ctx.lineWidth = Math.max(3, ts * 0.20);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startA, endA);
    ctx.stroke();

    // Bright white core
    ctx.strokeStyle = 'rgba(255,255,255,' + fade.toFixed(2) + ')';
    ctx.lineWidth = Math.max(2, ts * 0.10);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startA, endA);
    ctx.stroke();

    // Leading-edge tip — a brighter dot at the end of the arc
    if (progress < 1) {
      var tx = cx + Math.cos(endA) * radius;
      var ty = cy + Math.sin(endA) * radius;
      var tipSize = Math.max(5, ts * 0.45);
      ctx.fillStyle = 'rgba(255,255,255,' + fade.toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(tx, ty, tipSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
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

  return {
    spawnSlash: spawnSlash,
    spawnHitFlash: spawnHitFlash,
    clear: clear,
    draw: draw
  };
})();
