/**
 * Hangar Bay — the mothership's shuttle bay (a pre-rendered scene:
 * tools/bridge-art/scenes/hangar.py). The bay opening looks out on wherever
 * the ship is parked (js/orbit.js), behind a faint shimmering field; the
 * shuttle on the pad is the scene's "shuttle" decor layer (js/ship.js).
 */
(function () {
  BridgeWorld.registerSceneHooks('hangar', {
    behind: function (ctx, world, offX, offY, ts, time) {
      var sky = world.scene && world.scene.sky;
      if (!sky || typeof BridgeOrbit === 'undefined') return;
      var x = Math.floor(offX + sky[0] * ts), y = Math.floor(offY + sky[1] * ts);
      var w = Math.ceil((sky[2] - sky[0]) * ts), h = Math.ceil((sky[3] - sky[1]) * ts);
      BridgeOrbit.draw(ctx, x, y, w, h, time, { horizon: 0.3 });
      // the containment field: faint scanlines drifting up the opening
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 6; i++) {
        var yy = y + ((i / 6 + time / 9000) % 1) * h;
        ctx.fillStyle = 'rgba(80,200,230,0.07)';
        ctx.fillRect(x, Math.round(yy), w, 1);
      }
      ctx.fillStyle = 'rgba(60,180,220,0.05)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  });
})();
