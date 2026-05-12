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
    var radius = ts * 1.05;              // outside the player tile so the swing reads cleanly
    var halfSpan = Math.PI / 2.4;        // 75° each side, 150° arc
    var trailCount = 7;
    var trailGap = 0.07;                  // tighter trail so it reads as a single sweep

    // Trail behind the leading edge — warm white, shrinks down the chain
    for (var i = 0; i < trailCount; i++) {
      var segProgress = progress - i * trailGap;
      if (segProgress < 0 || segProgress > 1) continue;
      var angle = faceAngle - halfSpan + segProgress * 2 * halfSpan;
      var px = cx + Math.cos(angle) * radius;
      var py = cy + Math.sin(angle) * radius;
      var alpha = (1 - segProgress) * (i === 0 ? 1.0 : 0.85 - i * 0.08);
      var size = Math.max(3, ts * (0.34 - i * 0.035));
      ctx.fillStyle = 'rgba(255,250,220,' + alpha.toFixed(2) + ')';
      ctx.fillRect(Math.floor(px - size / 2), Math.floor(py - size / 2), Math.ceil(size), Math.ceil(size));
    }
    // Leading-edge tip — bright core + cyan halo so it pops on any background
    if (progress < 1) {
      var tipAngle = faceAngle - halfSpan + progress * 2 * halfSpan;
      var tx = cx + Math.cos(tipAngle) * radius;
      var ty = cy + Math.sin(tipAngle) * radius;
      var tipAlpha = 1 - progress;
      // Cyan halo (slightly larger)
      var haloSize = Math.max(5, ts * 0.55);
      ctx.fillStyle = 'rgba(120,220,255,' + (tipAlpha * 0.55).toFixed(2) + ')';
      ctx.fillRect(Math.floor(tx - haloSize / 2), Math.floor(ty - haloSize / 2),
                   Math.ceil(haloSize), Math.ceil(haloSize));
      // Bright white core
      var tipSize = Math.max(4, ts * 0.42);
      ctx.fillStyle = 'rgba(255,255,255,' + tipAlpha.toFixed(2) + ')';
      ctx.fillRect(Math.floor(tx - tipSize / 2), Math.floor(ty - tipSize / 2),
                   Math.ceil(tipSize), Math.ceil(tipSize));
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
