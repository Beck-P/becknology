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
      duration: 220
    });
  }

  function spawnHitFlash(x, y) {
    effects.push({
      type: 'hit_flash',
      x: x, y: y,
      startTime: performance.now(),
      duration: 180
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
    var radius = ts * 0.75;
    var halfSpan = Math.PI / 3;          // 60° arc total
    var trailCount = 5;
    var trailGap = 0.10;                  // each trail dot lags by 10% of duration

    for (var i = 0; i < trailCount; i++) {
      var segProgress = progress - i * trailGap;
      if (segProgress < 0 || segProgress > 1) continue;
      var angle = faceAngle - halfSpan + segProgress * 2 * halfSpan;
      var px = cx + Math.cos(angle) * radius;
      var py = cy + Math.sin(angle) * radius;
      var alpha = (1 - segProgress) * (i === 0 ? 1.0 : 0.7);
      var size = Math.max(2, ts * (0.22 - i * 0.025));
      ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
      ctx.fillRect(Math.floor(px - size / 2), Math.floor(py - size / 2), Math.ceil(size), Math.ceil(size));
    }
    // Leading-edge highlight (the "tip" of the swing)
    if (progress < 1) {
      var tipAngle = faceAngle - halfSpan + progress * 2 * halfSpan;
      var tx = cx + Math.cos(tipAngle) * radius;
      var ty = cy + Math.sin(tipAngle) * radius;
      var tipAlpha = 1 - progress;
      var tipSize = Math.max(3, ts * 0.30);
      ctx.fillStyle = 'rgba(255,240,200,' + tipAlpha.toFixed(2) + ')';
      ctx.fillRect(Math.floor(tx - tipSize / 2), Math.floor(ty - tipSize / 2), Math.ceil(tipSize), Math.ceil(tipSize));
    }
  }

  function drawHitFlash(ctx, offX, offY, ts, fx, progress) {
    var cx = offX + (fx.x + 0.5) * ts;
    var cy = offY + (fx.y + 0.5) * ts;
    var alpha = 1 - progress;
    // Outer warm halo
    var outerSize = ts * (0.85 + 0.15 * progress);
    ctx.fillStyle = 'rgba(255,200,100,' + (alpha * 0.4).toFixed(2) + ')';
    ctx.fillRect(Math.floor(cx - outerSize / 2), Math.floor(cy - outerSize / 2),
                 Math.ceil(outerSize), Math.ceil(outerSize));
    // Inner bright core
    var innerSize = ts * (0.55 - 0.15 * progress);
    ctx.fillStyle = 'rgba(255,250,220,' + (alpha * 0.85).toFixed(2) + ')';
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
