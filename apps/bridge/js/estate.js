/**
 * BridgeEstate — the legacy homes, alive. js/home.js owns them (buying, furnishing); this draws what moves in them,
 * through the scene hooks (js/world.js), from blocks the scene scripts write into the world JSON:
 *
 * - Windows onto the sky (Ashcombe House, the Starling — `scene.windows`, the glass as screen-tile rects; the render
 *   leaves a hole there): the planet's sky now, from BridgeClock.sky — blue with cloud drifting by day, gold and rose
 *   at dusk, deep blue with stars and the moon at night — over the harbour: the sea's horizon with light on it, masts
 *   at their moorings with riding lights after dark, the green light on the point.
 *   By day, dust turns in the light falling through them.
 * - The sea past a terrace (the Starling — `scene.sea`, screen-tile rects): js/sea.js's own sea, clipped to the hole,
 *   in the holm's colours, by day or night as the sea round the island is; gulls gliding over it by day.
 * - The Penthouse (`penthouse` in the world JSON): the deck's front balustrade drawn as glass over the drop (`glass`:
 *   a faint pane, its top edge catching the light, a sheen sliding across), the plunge pool's light moving on the
 *   water (`pool`) and steam off it, the festoon bulbs twinkling (`bulbs`), sparks going up off the fire pit (`fire`).
 *
 * Nothing here changes the world; it only draws.
 */
var BridgeEstate = (function () {
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  function px(offX, offY, ts, R) {
    var x = Math.round(offX + R[0] * ts), y = Math.round(offY + R[1] * ts);
    return { x: x, y: y, w: Math.round(offX + R[2] * ts) - x, h: Math.round(offY + R[3] * ts) - y };
  }
  function skyNow(world) {
    var id = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : '';
    var k = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky(id) : { sun: 0, dusk: 0, moon: 0.5 };
    return { sun: k.sun, dusk: Math.min(1, (k.dusk || 0) * 1.2), moon: k.moon == null ? 0.5 : k.moon };
  }

  // ---- windows onto the sky -------------------------------------------------------------------------------------
  // Each band of the sky from the top down to the horizon: night, day, the warm light at dusk laid over either.
  var NIGHT = [[10, 14, 38], [14, 22, 50], [20, 32, 62], [28, 42, 72]];
  var DAY = [[96, 146, 206], [122, 168, 220], [156, 196, 230], [196, 222, 238]];
  var DUSK = [[64, 60, 112], [138, 92, 128], [224, 128, 102], [248, 184, 120]];
  var SEA = { night: [12, 26, 40], day: [56, 112, 124], dusk: [78, 70, 100] };
  function window_(ctx, R, i, sky, now) {
    var hz = R.y + Math.round(R.h * 0.64);                   // the horizon
    var bands = NIGHT.length, bh = (hz - R.y) / bands;
    for (var b = 0; b < bands; b++) {
      var c = mix(NIGHT[b], DAY[b], sky.sun);
      c = mix(c, DUSK[b], sky.dusk * 0.85);
      ctx.fillStyle = css(c);
      var y0 = Math.round(R.y + b * bh), y1 = Math.round(R.y + (b + 1) * bh);
      ctx.fillRect(R.x, y0, R.w, y1 - y0);
    }
    var night = Math.max(0, 1 - sky.sun * 1.4 - sky.dusk * 0.5);
    if (night > 0.05) {                                      // stars, and the moon in the first window
      for (var s = 0; s < 6; s++) {
        var sx = R.x + Math.floor(hash(i * 31 + s) * R.w), sy = R.y + Math.floor(hash(i * 17 + s * 7) * (hz - R.y - 2));
        var tw = 0.4 + 0.5 * Math.sin(now / 700 + s * 2.1 + i);
        ctx.fillStyle = 'rgba(230,234,255,' + (night * tw).toFixed(2) + ')';
        ctx.fillRect(sx, sy, 1, 1);
      }
      if (i === 0 && sky.moon > 0.15) {
        var mx = R.x + Math.round(R.w * 0.7), my = R.y + Math.round((hz - R.y) * 0.3);
        ctx.fillStyle = 'rgba(240,236,210,' + (night * (0.4 + 0.6 * sky.moon)).toFixed(2) + ')';
        ctx.fillRect(mx - 1, my - 2, 3, 5); ctx.fillRect(mx - 2, my - 1, 5, 3);
      }
    }
    if (sky.sun > 0.2) {                                     // a drift of cloud by day
      for (var cl = 0; cl < 2; cl++) {
        var cw = Math.round(R.w * (0.5 + 0.3 * hash(i + cl * 9))), cy = R.y + Math.round((hz - R.y) * (0.25 + 0.35 * cl));
        var cx = R.x + Math.round(((now / 900 + hash(i * 5 + cl) * 200) % (R.w + cw)) - cw);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * sky.sun).toFixed(2) + ')';
        ctx.fillRect(Math.max(R.x, cx), cy, Math.min(cw, R.x + R.w - Math.max(R.x, cx)), 2);
        ctx.fillRect(Math.max(R.x, cx + 3), cy - 1, Math.max(0, Math.min(cw - 6, R.x + R.w - Math.max(R.x, cx + 3))), 1);
      }
    }
    // the harbour: the sea below the horizon, light glancing off it, masts at their moorings
    var sea = mix(mix(SEA.night, SEA.day, sky.sun), SEA.dusk, sky.dusk * 0.7);
    ctx.fillStyle = css(sea);
    ctx.fillRect(R.x, hz, R.w, R.y + R.h - hz);
    ctx.fillStyle = css(mix(sea, [255, 255, 255], 0.25));
    ctx.fillRect(R.x, hz, R.w, 1);
    for (var g = 0; g < 5; g++) {
      var gy = hz + 2 + Math.floor(hash(i * 13 + g) * (R.y + R.h - hz - 3));
      var gx = R.x + Math.floor(((hash(i + g * 3) * R.w + now / (500 + g * 90)) % R.w));
      ctx.fillStyle = sky.sun > 0.3 ? 'rgba(255,250,230,0.5)' : sky.dusk > 0.3 ? 'rgba(255,190,140,0.5)' : 'rgba(200,210,255,' + (0.35 * sky.moon + 0.1).toFixed(2) + ')';
      ctx.fillRect(gx, gy, 2 + (g % 2), 1);
    }
    var mast = css(mix([30, 26, 30], sea, 0.3));
    for (var m = 0; m < 2; m++) {
      var mx2 = R.x + Math.round(R.w * (0.22 + 0.5 * m + 0.1 * hash(i * 3 + m))), top = hz - Math.round((hz - R.y) * (0.35 + 0.15 * m));
      ctx.fillStyle = mast;
      ctx.fillRect(mx2, top, 1, hz - top + 2);
      ctx.fillRect(mx2 - 2, top + 3, 5, 1);
      ctx.fillRect(mx2 - 3, hz - 2, 7, 2);
      if (night > 0.3) { ctx.fillStyle = 'rgba(255,214,120,' + night.toFixed(2) + ')'; ctx.fillRect(mx2, top - 1, 1, 1); }
    }
    if (i === 1 && Math.floor(now / 1700) % 3 === 0) {       // the green light on the point
      ctx.fillStyle = 'rgba(120,255,170,' + (0.4 + 0.6 * Math.max(night, 0.3)).toFixed(2) + ')';
      ctx.fillRect(R.x + Math.round(R.w * 0.85), hz - 1, 1, 1);
    }
  }

  function behind(ctx, world, offX, offY, ts, now) {
    var sc = world && world.scene;
    if (!sc) return;
    if (sc.windows && sc.windows.length) {
      var sky = skyNow(world);
      ctx.save();
      sc.windows.forEach(function (W, i) { window_(ctx, px(offX, offY, ts, W), i, sky, now); });
      ctx.restore();
    }
    if (sc.sea && typeof BridgeSea !== 'undefined' && BridgeSea.drawSea) {
      ctx.save();
      ctx.beginPath();
      var box = null;
      sc.sea.forEach(function (S) { var R = px(offX, offY, ts, S); ctx.rect(R.x, R.y, R.w, R.h); box = box || R; });
      ctx.clip();
      if (!sc.backdrop) BridgeSea.drawSea(ctx, ctx.canvas.width, ctx.canvas.height, now, sc.seaPalette || 'emerald');   // (a backdrop world has it already)
      var k = skyNow(world);
      if (box && k.sun > 0.3) {                             // gulls gliding over the water, their shadows on it
        for (var g = 0; g < 3; g++) {
          var span = box.w + 80, gx = box.x - 40 + ((now / (70 + g * 23) + g * 157) % span), gy = box.y + box.h * (0.3 + 0.22 * g) + Math.sin(now / 900 + g) * 4;
          var flap = Math.floor(now / 260 + g) % 4 === 0 ? 1 : 0;
          ctx.fillStyle = 'rgba(0,30,30,' + (0.18 * k.sun).toFixed(2) + ')';
          ctx.fillRect(Math.round(gx + 10), Math.round(gy + 14), 5, 1);
          ctx.fillStyle = 'rgba(248,248,240,' + k.sun.toFixed(2) + ')';
          ctx.fillRect(Math.round(gx) - 2, Math.round(gy) - flap, 2, 1); ctx.fillRect(Math.round(gx), Math.round(gy), 1, 1);
          ctx.fillRect(Math.round(gx) + 1, Math.round(gy) - flap, 2, 1);
        }
      }
      ctx.restore();
    }
  }

  // dust turning in the light that falls through the windows by day
  function motes(ctx, world, offX, offY, ts, now) {
    var sc = world && world.scene;
    if (!sc || !sc.windows || !sc.windows.length) return;
    var k = skyNow(world);
    if (k.sun < 0.25) return;
    sc.windows.forEach(function (W, i) {
      var R = px(offX, offY, ts, W);
      for (var m = 0; m < 7; m++) {
        var t = now / (5200 + 900 * hash(i * 7 + m)) + hash(m * 3 + i);
        var x = R.x - 6 + Math.round(((hash(m + i * 11) * (R.w + 12)) + Math.sin(t * 2.1) * 5 + R.w + 12) % (R.w + 12));
        var y = R.y + R.h + Math.round(((t * 18 + hash(m * 5) * 60) % 60));
        var a = k.sun * (0.35 + 0.35 * Math.sin(t * 3 + m));
        if (a <= 0.02) continue;
        ctx.fillStyle = 'rgba(255,244,214,' + a.toFixed(2) + ')';
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }

  // ---- the Penthouse ---------------------------------------------------------------------------------------------
  function ground(ctx, world, offX, offY, ts, now) {
    var P = world && world.penthouse;
    if (!P || !P.pool) return;
    var R = px(offX, offY, ts, P.pool);
    ctx.save();
    ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    for (var i = 0; i < 26; i++) {                           // the light the water throws about, wandering
      var t = now / (1400 + 300 * hash(i)) + hash(i * 7) * 6.28;
      var x = R.x + Math.round(hash(i * 3) * R.w + Math.sin(t) * 4), y = R.y + Math.round(hash(i * 5) * R.h + Math.cos(t * 0.8) * 2);
      var a = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.7));
      ctx.fillStyle = 'rgba(190,250,255,' + a.toFixed(2) + ')';
      ctx.fillRect(x, y, 3 + (i % 3), 1);
      if (i % 4 === 0) ctx.fillRect(x + 1, y + 1, 2, 1);
    }
    ctx.restore();
  }

  function over(ctx, world, offX, offY, ts, now) {
    motes(ctx, world, offX, offY, ts, now);
    var P = world && world.penthouse;
    if (!P) return;
    (P.glass || []).forEach(function (G) {                  // the front panes, over the drop
      var R = px(offX, offY, ts, G);
      ctx.fillStyle = 'rgba(150,215,235,0.10)';
      ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.fillStyle = 'rgba(210,245,255,0.35)';
      ctx.fillRect(R.x, R.y, R.w, 1);
      var span = R.w + R.h, at = (now / 60) % (span * 2);  // a sheen sliding along the glass
      for (var d = 0; d < 6; d++) {
        var sx = R.x + Math.round(at - R.h - d * 2);
        for (var yy = 0; yy < R.h; yy += 1) {
          var xx = sx + yy;
          if (xx >= R.x && xx < R.x + R.w) { ctx.fillStyle = 'rgba(220,250,255,' + (0.09 - d * 0.012).toFixed(3) + ')'; ctx.fillRect(xx, R.y + R.h - 1 - yy, 1, 1); }
        }
      }
    });
    (P.bulbs || []).forEach(function (b, i) {               // the festoons, glowing and now and then flickering
      var x = Math.round(offX + b[0] * ts), y = Math.round(offY + b[1] * ts);
      var f = 0.55 + 0.25 * Math.sin(now / 900 + i * 1.7) + (hash(Math.floor(now / 120) + i * 13) > 0.985 ? -0.4 : 0);
      ctx.fillStyle = 'rgba(255,214,150,' + (0.16 * f).toFixed(3) + ')';
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = 'rgba(255,244,214,' + Math.min(1, 0.6 + 0.4 * f).toFixed(2) + ')';
      ctx.fillRect(x, y, 1, 1);
    });
    if (P.pool) {                                            // steam off the warm water
      var R = px(offX, offY, ts, P.pool);
      for (var s = 0; s < 8; s++) {
        var life = ((now / 3800) + s / 8) % 1;
        var x = R.x + Math.round(hash(s * 11) * R.w + Math.sin(life * 5 + s) * 3), y = R.y + R.h * 0.7 - life * 28;
        ctx.fillStyle = 'rgba(200,240,250,' + (0.1 * (1 - life)).toFixed(3) + ')';
        ctx.fillRect(x - 2, Math.round(y), 4 + Math.round(life * 4), 2);
      }
    }
    if (P.fire) {                                            // sparks off the fire pit
      var fx = offX + P.fire[0] * ts, fy = offY + P.fire[1] * ts;
      for (var k = 0; k < 7; k++) {
        var l = ((now / 1100) + hash(k * 3)) % 1;
        var sx2 = Math.round(fx + (hash(k + Math.floor(now / 1100 + hash(k * 3)) * 5) - 0.5) * 14 + Math.sin(l * 6 + k) * 2), sy2 = Math.round(fy - l * 30);
        ctx.fillStyle = 'rgba(255,' + Math.round(150 + 80 * (1 - l)) + ',80,' + (0.9 * (1 - l)).toFixed(2) + ')';
        ctx.fillRect(sx2, sy2, 1, 1);
      }
    }
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('*', { behind: behind, ground: ground, over: over });
  }
  return { _window: window_ };
})();
