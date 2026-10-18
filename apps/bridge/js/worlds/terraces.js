/**
 * BridgeTerraces — the live parts of the Mid-Levels' Terraces (arcadia-terraces), Moonglow (arcadia-jazz) and the
 * Atrium (arcadia-atrium), on the `arcadia` scene hooks, keyed off blocks in their world JSON:
 *
 *   terraces: { glass, bulbs }   the terraces' front balustrades drawn as glass over the drop (screen-tile rects, a
 *                                sheen sliding along them); the festoons over Halo and Cirrus glowing and now and then
 *                                flickering (screen tiles)
 *   midlevels: { sky, moon }     a window onto the city (screen tiles): the live skyline (js/skyline.js) and rain drawn
 *                                behind the render's hole, the moon hanging in it — Moonglow's round window
 *   atrium: { lifts, escalators } the atrium's glass lifts riding up and down (x, row0, row1 in screen tiles) and people
 *                                 on the escalators (two screen-tile points each)
 */
var BridgeTerraces = (function () {
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function px(offX, offY, ts, R) {
    return { x: Math.round(offX + R[0] * ts), y: Math.round(offY + R[1] * ts), w: Math.round((R[2] - R[0]) * ts), h: Math.round((R[3] - R[1]) * ts) };
  }

  // ---- the city through a window (Moonglow's moon window) ------------------------------------------------------------
  var skyCv = null;
  function windowSky(ctx, M, offX, offY, ts, now) {
    if (!M.sky || typeof BridgeSkyline === 'undefined') return;
    var R = px(offX, offY, ts, M.sky);
    if (R.w < 2 || R.h < 2) return;
    var H = Math.max(160, R.h * 3);
    if (!skyCv) skyCv = document.createElement('canvas');
    if (skyCv.width !== R.w || skyCv.height !== H) { skyCv.width = R.w; skyCv.height = H; }
    var c = skyCv.getContext('2d');
    c.imageSmoothingEnabled = false;
    var real = BridgeWorld.getView;
    BridgeWorld.getView = function () { return { offX: R.w / 2 - 16 * 32, offY: Math.round(H * 0.25), ts: 32, w: R.w, h: H }; };
    try {
      BridgeSkyline.draw(c, R.w, H, now, { baseRow: 6, railRow: 9, centerCol: 16 });
      if (BridgeSkyline.rain) BridgeSkyline.rain(c, R.w, H, now, { drops: 30 });
    } finally { BridgeWorld.getView = real; }
    ctx.drawImage(skyCv, 0, Math.round(H * 0.38 - R.h / 2), R.w, R.h, R.x, R.y, R.w, R.h);
    if (M.moon) {                                         // the moon the bar's named for, low in the round window
      var mx = Math.round(offX + (M.moon[0] + M.moon[2] * 0.35) * ts), my = Math.round(offY + (M.moon[1] - M.moon[2] * 0.3) * ts);
      var r = Math.max(4, Math.round(ts * 0.32));
      var halo = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 3.5);
      halo.addColorStop(0, 'rgba(255,240,200,0.35)');
      halo.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(mx - r * 4, my - r * 4, r * 8, r * 8);
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d > 1) continue;
        var shade = 1 - d * d * 0.3 - ((dx + dy) > r * 0.5 ? 0.12 : 0) - (hash(Math.floor((dx + r) / 3) * 17 + Math.floor((dy + r) / 3)) > 0.8 ? 0.1 : 0);
        var k = Math.floor(shade * 5 + ((dx & 1) + (dy & 1) * 2) / 4) / 5;
        ctx.fillStyle = 'rgb(' + Math.round(255 * k) + ',' + Math.round(244 * k) + ',' + Math.round(210 * k) + ')';
        ctx.fillRect(mx + dx, my + dy, 1, 1);
      }
    }
  }

  // ---- glass over the drop, festoons -------------------------------------------------------------------------------------
  function glass(ctx, T, offX, offY, ts, now) {
    (T.glass || []).forEach(function (G, gi) {
      var R = px(offX, offY, ts, G);
      ctx.fillStyle = 'rgba(150,225,240,0.10)';
      ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.fillStyle = 'rgba(210,248,255,0.35)';
      ctx.fillRect(R.x, R.y, R.w, 1);
      var span = R.w + R.h, at = (now / 55 + gi * 97) % (span * 2);
      for (var d = 0; d < 6; d++) {
        var sx = R.x + Math.round(at - R.h - d * 2);
        for (var yy = 0; yy < R.h; yy++) {
          var xx = sx + yy;
          if (xx >= R.x && xx < R.x + R.w) { ctx.fillStyle = 'rgba(220,250,255,' + (0.09 - d * 0.012).toFixed(3) + ')'; ctx.fillRect(xx, R.y + R.h - 1 - yy, 1, 1); }
        }
      }
    });
  }
  function bulbs(ctx, T, offX, offY, ts, now) {
    (T.bulbs || []).forEach(function (b, i) {
      var x = Math.round(offX + b[0] * ts), y = Math.round(offY + b[1] * ts);
      var f = 0.55 + 0.25 * Math.sin(now / 900 + i * 1.7) + (hash(Math.floor(now / 120) + i * 13) > 0.988 ? -0.4 : 0);
      ctx.fillStyle = 'rgba(255,214,170,' + (0.16 * f).toFixed(3) + ')';
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = 'rgba(255,244,224,' + Math.min(1, 0.6 + 0.4 * f).toFixed(2) + ')';
      ctx.fillRect(x, y, 1, 1);
    });
  }

  // ---- the atrium's glass lifts and its escalators ---------------------------------------------------------------------
  function atrium(ctx, A, offX, offY, ts, now) {
    (A.lifts || []).forEach(function (L, i) {               // a lit glass car riding the shaft, pausing at the galleries
      var cyc = 26000 + i * 7000, t = ((now + i * 9100) % cyc) / cyc;
      var u = t < 0.5 ? t * 2 : 2 - t * 2;                  // up, then down
      u = Math.min(1, Math.max(0, (u - 0.1) / 0.8));
      u = u * u * (3 - 2 * u);
      var x = Math.round(offX + L[0] * ts), y = Math.round(offY + (L[2] + (L[1] - L[2]) * u) * ts);
      var w = Math.round(ts * 1.0), h = Math.round(ts * 1.2);
      ctx.fillStyle = 'rgba(10,20,30,0.85)';
      ctx.fillRect(x - w / 2 - 1, y - h - 1, w + 2, h + 2);
      ctx.fillStyle = 'rgba(190,240,255,0.55)';
      ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.fillStyle = 'rgba(255,240,210,0.9)';
      ctx.fillRect(x - w / 2, y - h, w, 2);
      for (var p = 0; p < 2; p++) {                         // passengers
        if (hash(i * 7 + p + Math.floor(now / cyc)) < 0.35) continue;
        ctx.fillStyle = 'rgba(30,30,50,0.85)';
        ctx.fillRect(x - w / 4 + p * Math.round(w / 3), y - Math.round(h * 0.7), Math.max(2, Math.round(w / 6)), Math.round(h * 0.6));
      }
    });
    (A.escalators || []).forEach(function (E, i) {         // people riding them: small dark figures gliding along
      for (var p = 0; p < 3; p++) {
        var t = ((now / 9000) + p / 3 + hash(i * 5) ) % 1;
        var x = Math.round(offX + (E[0] + (E[2] - E[0]) * t) * ts), y = Math.round(offY + (E[1] + (E[3] - E[1]) * t) * ts);
        ctx.fillStyle = 'rgba(20,24,40,0.9)';
        ctx.fillRect(x - 2, y - 9, 4, 9);
        ctx.fillStyle = ['#f078a8', '#5cc8d0', '#e8c040'][(i + p) % 3];
        ctx.fillRect(x - 2, y - 7, 4, 3);
        ctx.fillStyle = '#e8c8a8';
        ctx.fillRect(x - 1, y - 11, 3, 2);
      }
    });
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('arcadia', {
      behind: function (ctx, world, offX, offY, ts, now) {
        if (world && world.midlevels) windowSky(ctx, world.midlevels, offX, offY, ts, now);
      },
      ground: function (ctx, world, offX, offY, ts, now) {
        if (world && world.atrium) atrium(ctx, world.atrium, offX, offY, ts, now);
      },
      over: function (ctx, world, offX, offY, ts, now) {
        if (!world || !world.terraces) return;
        glass(ctx, world.terraces, offX, offY, ts, now);
        bulbs(ctx, world.terraces, offX, offY, ts, now);
      }
    });
  }
  return { _hash: hash };
})();
