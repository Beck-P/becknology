/**
 * Sylvara — the wood elves' forest (scenes/sylvara.py, scenes/sylvara_hall.py): the life of the place over the render.
 *
 * Outdoors (Elderglade, dusk): fireflies drifting and blinking in the wood, a few gold leaves falling through the
 * slanting light, motes rising off the Moonwell. In the Heartwood Hall: dust turning slowly in the light from the
 * round window. All in world space (so they scroll with the scene), on whole native pixels.
 */
var BridgeSylvara = (function () {
  // a cheap, stable hash: the same firefly is always in the same part of the wood
  function h(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }

  function fireflies(ctx, world, offX, offY, ts, now) {
    var n = 70;
    for (var i = 0; i < n; i++) {
      // each one wanders round its own home spot, on its own slow loop
      var hx = h(i, 1) * world.width, hy = 5 + h(i, 2) * (world.height - 7);
      var t = now / (2600 + h(i, 3) * 2400) + h(i, 4) * 6.28;
      var x = hx + Math.sin(t) * 1.4 + Math.sin(t * 2.3) * 0.4;
      var y = hy + Math.cos(t * 0.8) * 0.9 - 0.6 - Math.sin(t * 1.7) * 0.3;
      var blink = 0.5 + 0.5 * Math.sin(now / (380 + h(i, 5) * 300) + i);
      if (blink < 0.25) continue;
      var sx = Math.round(offX + x * ts), sy = Math.round(offY + y * ts);
      ctx.fillStyle = 'rgba(220,255,150,' + (0.15 * blink).toFixed(2) + ')';
      ctx.fillRect(sx - 2, sy - 2, 5, 5);
      ctx.fillStyle = 'rgba(240,255,190,' + (0.55 + 0.45 * blink).toFixed(2) + ')';
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  function leaves(ctx, world, offX, offY, ts, now) {
    var W = ctx.canvas.width, H = ctx.canvas.height;
    for (var i = 0; i < 18; i++) {
      var period = 9000 + h(i, 7) * 7000;
      var k = ((now + h(i, 8) * period) % period) / period;
      var x = h(i, 9) * (W + 60) - 30 + k * 40 + Math.sin(now / 700 + i) * 6;
      var y = -10 + k * (H + 20);
      var flip = Math.sin(now / 260 + i * 1.7) > 0;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(224,176,64,0.85)' : i % 3 === 1 ? 'rgba(200,130,48,0.8)' : 'rgba(150,180,70,0.8)';
      ctx.fillRect(Math.round(x), Math.round(y), flip ? 2 : 1, flip ? 1 : 2);
    }
  }

  // motes rising off the Moonwell (outdoors) and the hall's basin
  function motes(ctx, offX, offY, ts, now, cx, cr, r, n) {
    for (var i = 0; i < n; i++) {
      var period = 2600 + h(i, 11) * 2000;
      var k = ((now + h(i, 12) * period) % period) / period;
      var a = h(i, 13) * 6.28;
      var x = cx + Math.cos(a) * r * h(i, 14), y = cr + Math.sin(a) * r * 0.6 * h(i, 14) - k * 1.6;
      ctx.fillStyle = 'rgba(200,250,240,' + (0.8 * (1 - k)).toFixed(2) + ')';
      ctx.fillRect(Math.round(offX + x * ts), Math.round(offY + y * ts), 1, 1);
    }
  }

  function dust(ctx, offX, offY, ts, now) {
    for (var i = 0; i < 40; i++) {
      var t = now / (9000 + h(i, 21) * 6000) + h(i, 22) * 6.28;
      var x = 8 + h(i, 23) * 6 + Math.sin(t) * 1.2, y = 2.5 + h(i, 24) * 5 + Math.cos(t * 0.7) * 0.8;
      var a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now / 900 + i));
      ctx.fillStyle = 'rgba(255,232,176,' + a.toFixed(2) + ')';
      ctx.fillRect(Math.round(offX + x * ts), Math.round(offY + y * ts), 1, 1);
    }
  }

  function over(ctx, world, offX, offY, ts, now) {
    var id = (BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '';
    if (id === 'sylvara') {
      fireflies(ctx, world, offX, offY, ts, now);
      motes(ctx, offX, offY, ts, now, 9.0, 19.0, 1.2, 16);
      leaves(ctx, world, offX, offY, ts, now);
    } else if (id === 'sylvara-hall') {
      dust(ctx, offX, offY, ts, now);
      motes(ctx, offX, offY, ts, now, 18.6, 2.7, 0.35, 5);
    }
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('sylvara', { over: over });

  return { over: over };
})();
