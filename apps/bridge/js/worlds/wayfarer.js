/**
 * The Wayfarer's fitted rooms (tileset 'wayfarer': the passage, the galley and mess, the observatory, the greenhouse
 * deck — scenes/ship_*.py, js/wayfarer.js). Every window and port aboard looks out on the place the ship is over
 * (BridgeOrbit, through the render's holes in `scene.sky`); the stockpot and the kettle steam (`scene.steam`, points in
 * screen tiles); the watch bill in the passage (`scene.bill`, a hole too) has a card pinned up for each of your crew
 * with their face, a lamp under it lit by where they are now (js/aboard.js: green at their post, amber off duty, dark
 * below).
 */
(function () {
  function has(n) { return typeof window[n] !== 'undefined'; }
  BridgeWorld.registerTileset('wayfarer', {});
  BridgeWorld.registerBackground('wayfarer', function (ctx, w, h) {
    ctx.fillStyle = '#07060c';
    ctx.fillRect(0, 0, w, h);
  });

  // ---- steam off the hob: a few pale puffs rising and spreading, on the clock so they don't stutter --------------------
  function drawSteam(ctx, pts, offX, offY, ts, now) {
    ctx.save();
    for (var p = 0; p < pts.length; p++) {
      var bx = offX + pts[p][0] * ts, by = offY + pts[p][1] * ts;
      for (var i = 0; i < 6; i++) {
        var period = 2600 + i * 170, t = ((now + i * 433 + p * 911) % period) / period;
        var x = Math.round(bx + Math.sin(t * 5 + i * 1.7 + p) * (2 + t * 5)), y = Math.round(by - t * ts * 1.1);
        var a = 0.32 * (1 - t) * Math.min(1, t * 6), r = 1 + Math.round(t * 2.5);
        ctx.fillStyle = 'rgba(230,226,220,' + a.toFixed(3) + ')';
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  }

  // ---- the watch bill: a card for each of the crew, their face, a lamp under it ----------------------------------------
  var heads = {};
  function head(sheet) {                                  // their portrait's head at a quarter size (js/look.js), 11 × 10
    if (!heads[sheet] && has('BridgeLook') && BridgeLook.npcFace) {
      var cv = document.createElement('canvas'); cv.width = 11; cv.height = 10;
      heads[sheet] = cv;
      BridgeLook.npcFace(cv, sheet);
    }
    return heads[sheet] || null;
  }
  var LAMP = { post: '#58e070', off: '#f0b040', below: '#3a2a1a', ashore: '#3a2a1a' };
  function drawBill(ctx, rect, offX, offY, ts, now) {
    var x0 = Math.round(offX + rect[0] * ts), y0 = Math.round(offY + rect[1] * ts);
    var w = Math.round((rect[2] - rect[0]) * ts), h = Math.round((rect[3] - rect[1]) * ts);
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(x0, y0, w, h);                              // cork
    for (var i = 0; i < 40; i++) { var q = (i * 2654435761) >>> 0; ctx.fillStyle = i % 2 ? '#34200f' : '#22150a'; ctx.fillRect(x0 + q % w, y0 + (q >>> 8) % h, 1, 1); }
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x0 + 2, y0 + 2, w - 4, 3);                  // the heading's strip of paper
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x0 + 5, y0 + 3, Math.round(w * 0.4), 1);
    var crew = has('BridgeAboard') && BridgeAboard.roster ? BridgeAboard.roster() : [];
    var cw = 11, chh = 14, cols = Math.max(1, Math.floor((w - 4) / (cw + 2)));
    crew.slice(0, cols * 2).forEach(function (p, k) {
      var cx = x0 + 3 + (k % cols) * (cw + 2), cy = y0 + 8 + Math.floor(k / cols) * (chh + 3);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(cx, cy, cw, chh);
      ctx.fillStyle = '#c8b890'; ctx.fillRect(cx, cy + chh - 1, cw, 1);
      ctx.fillStyle = '#a02a20'; ctx.fillRect(cx + 5, cy - 1, 1, 2);                   // its pin
      var im = (p.face || p.sheet) && head(p.face || p.sheet);
      ctx.fillStyle = '#3a3028'; ctx.fillRect(cx, cy + 1, cw, 10);                     // the face, on a dark ground
      if (im) { ctx.imageSmoothingEnabled = false; ctx.drawImage(im, cx, cy + 1); }
      var col = LAMP[p.state] || LAMP.off;
      ctx.fillStyle = col; ctx.fillRect(cx + 4, cy + chh - 3, 3, 2);
      if (p.state === 'post' || p.state === 'off') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.1 * Math.sin(now / 600 + k);
        ctx.fillRect(cx + 3, cy + chh - 4, 5, 4); ctx.restore();
      }
    });
  }

  BridgeWorld.registerSceneHooks('wayfarer', {
    behind: function (ctx, world, offX, offY, ts, time) {
      var sky = world.scene && world.scene.sky;
      if (sky && has('BridgeOrbit')) {
        var x = Math.floor(offX + sky[0] * ts), y = Math.floor(offY + sky[1] * ts);
        BridgeOrbit.draw(ctx, x, y, Math.ceil((sky[2] - sky[0]) * ts), Math.ceil((sky[3] - sky[1]) * ts), time, { horizon: 0.55 });
      }
      if (world.scene && world.scene.bill) drawBill(ctx, world.scene.bill, offX, offY, ts, Date.now());
    },
    over: function (ctx, world, offX, offY, ts) {
      var st = world.scene && world.scene.steam;
      if (st && st.length) drawSteam(ctx, st, offX, offY, ts, Date.now());
    }
  });
})();
