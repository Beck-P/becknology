/**
 * BridgeHorizon — standing at the edge of the hole (the Singularity).
 *
 * Not a black hole in the background: the horizon is a black wall filling
 * a quarter of the sky, its photon ring a blazing line splitting it, the
 * accretion disc a river of fire flowing across everything, starlight
 * smeared into arcs round it. And the world itself bends: every frame is
 * pulled toward the hole and magnified near it, gravitational waves run
 * through it, time stutters (the last moment flickers back over the
 * present), and the pilot leaves echoes of where they were a second ago.
 * The closer you go to the brink, the stronger all of it gets.
 *
 *   BridgeHorizon.place(world, view, w, h)   where the hole sits on screen now
 *   BridgeHorizon.sky(ctx, w, h, now, P)     the backdrop
 *   BridgeHorizon.post(ctx, buf, w, h, now, P)  warp + grade + stutter (scene `post` hook)
 *   BridgeHorizon.echoes(...)                 scene `items`: ghosts of the pilot
 */
var BridgeHorizon = (function () {
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // ---- where the hole is ----------------------------------------------------------------------
  function place(world, v, w, h) {
    var H = world.horizon || {};
    var brink = H.brink || [40, 7];
    var camX = (w / 2 - v.offX) / v.ts, camY = (h / 2 - v.offY) / v.ts;
    var d = Math.hypot(camX - brink[0], camY - brink[1]);
    var near = Math.max(0, Math.min(1, 1 - d / 34));             // 0 far from the brink, 1 at it
    var R = h * (0.78 + 0.45 * near);
    // it hangs up and to the right; walking toward it brings it closer and lower
    var hx = w * (1.02 - 0.12 * near) - (camX - brink[0]) * 1.4;
    var hy = -R * (0.62 - 0.25 * near) - (camY - brink[1]) * 1.2;
    return { hx: hx, hy: hy, R: R, k: 0.35 + 0.65 * near, near: near };
  }

  var RAMP = ['255,248,230', '255,214,150', '255,168,80', '236,104,60', '196,70,120', '130,60,180', '70,40,130'];

  // ---- the sky ----------------------------------------------------------------------------------
  var stars = null;
  function sky(ctx, w, h, now, P) {
    var g = ctx.createRadialGradient(P.hx, P.hy, P.R, P.hx, P.hy, P.R * 3.2);
    g.addColorStop(0, '#2a1030');
    g.addColorStop(0.35, '#120a26');
    g.addColorStop(1, '#04030a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // starlight dragged round the hole into arcs (faster and longer near it)
    if (!stars) {
      stars = [];
      for (var i = 0; i < 420; i++) stars.push([1.04 + Math.pow(hash(i), 0.7) * 3.4, hash(i * 3) * 6.283, hash(i * 7)]);
    }
    for (var j = 0; j < stars.length; j++) {
      var s = stars[j];
      var rho = s[0] * P.R;
      var om = 0.00002 * Math.pow(1 / s[0], 1.5);
      var a = s[1] + now * om;
      var len = Math.min(0.5, om * 2600);
      var bright = 0.3 + 0.6 * s[2];
      ctx.fillStyle = 'rgba(230,220,255,' + (bright * Math.min(1, (s[0] - 1.0) * 6)).toFixed(2) + ')';
      var n = Math.max(1, Math.round(len * rho / 2));
      for (var q = 0; q < n; q++) {
        var aa = a - q * 2 / rho;
        var x = P.hx + Math.cos(aa) * rho, y = P.hy + Math.sin(aa) * rho;
        if (x >= 0 && y >= 0 && x < w && y < h) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // a wide amber glow round the horizon
    var gl = ctx.createRadialGradient(P.hx, P.hy, P.R * 0.98, P.hx, P.hy, P.R * 1.9);
    gl.addColorStop(0, 'rgba(255,190,110,0.45)');
    gl.addColorStop(0.25, 'rgba(230,110,90,0.18)');
    gl.addColorStop(1, 'rgba(120,60,160,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, w, h);
    disc(ctx, now, P, false);                                   // the far half of the disc, behind the hole
    ctx.restore();
    // the horizon
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(P.hx, P.hy, P.R, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // light bent all the way round, hugging the edge, streaming
    for (var L = 0; L < 7; L++) {
      var rr = P.R * (1.012 + L * 0.03);
      ctx.strokeStyle = 'rgba(' + RAMP[Math.min(6, L)] + ',' + (0.75 - L * 0.09).toFixed(2) + ')';
      ctx.lineWidth = L === 0 ? 3 : 2;
      ctx.setLineDash([18 + L * 9, 6 + L * 5]);
      ctx.lineDashOffset = -now * (0.05 / (1 + L * 0.4));
      ctx.beginPath();
      ctx.arc(P.hx, P.hy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // the photon ring: a thin line of white fire
    ctx.strokeStyle = 'rgba(255,250,235,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(P.hx, P.hy, P.R * 1.004, 0, Math.PI * 2);
    ctx.stroke();
    disc(ctx, now, P, true);                                    // the near half, across the face of the hole
    ctx.restore();
  }

  // the disc: many thin rings in a tilted ellipse, dashed, the dashes
  // streaming round — inner rings faster, hotter; the approaching side brighter
  function disc(ctx, now, P, front) {
    var tilt = -0.32, flat = 0.2;
    for (var i = 0; i < (front ? 9 : 22); i++) {
      var f = 1.12 + i * 0.055;
      var rx = P.R * f, ry = P.R * f * flat;
      var t = i / 21;
      var col = RAMP[Math.min(6, Math.floor(t * 6.9))];
      var speed = 0.09 * Math.pow(1.25 / f, 1.5);
      for (var side = 0; side < 2; side++) {
        // front: angles 0..π (the lower half in the disc's frame); back: π..2π
        var a0 = front ? (side ? Math.PI / 2 : 0) : (side ? Math.PI * 1.5 : Math.PI);
        var a1 = a0 + Math.PI / 2;
        var approaching = front ? side === 1 : side === 0;
        var alpha = (0.62 - t * 0.5) * (approaching ? 1.25 : 0.6) * (front ? 1.6 : 0.8);
        ctx.strokeStyle = 'rgba(' + col + ',' + Math.max(0.05, alpha).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([40 + hash(i) * 90, 12 + hash(i + 9) * 40]);
        ctx.lineDashOffset = -now * speed * (approaching ? 1 : 1) - i * 13;
        ctx.beginPath();
        ctx.ellipse(P.hx, P.hy, rx, ry, tilt, a0, a1);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }

  // ---- the world bends ------------------------------------------------------------------------
  var tmp = null, tctx = null, prev = null, pctx = null, prevAt = 0;
  function post(ctx, buf, w, h, now, P) {
    if (!tmp) { tmp = document.createElement('canvas'); tctx = tmp.getContext('2d'); prev = document.createElement('canvas'); pctx = prev.getContext('2d'); }
    if (tmp.width !== w || tmp.height !== h) { tmp.width = w; tmp.height = h; prev.width = w; prev.height = h; }
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(buf, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0);                                    // under the cells: no gaps between them
    var k = P.k, C = 16;
    // a gravitational wave running out from the hole every few seconds
    var period = 6500, wt = (now % period) / period;
    var waveD = wt * (Math.hypot(w, h) + P.R) * 1.1 - P.R * 0.2;
    var swirlT = Math.sin(now / 2600);
    for (var y = 0; y < h; y += C) {
      for (var x = 0; x < w; x += C) {
        var cx = x + C / 2, cy = y + C / 2;
        var dx = P.hx - cx, dy = P.hy - cy, d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
        var dd = Math.max(0, d - P.R);
        var pull = k * 16 * P.R / (dd + P.R * 0.45);
        var dw = dd - waveD;
        var ripple = k * 4.5 * Math.sin(dw * 0.09) * Math.exp(-dw * dw / 3600);
        var swirl = k * 5 * swirlT * P.R / (dd + P.R);
        var ox = dx / d * (pull + ripple) - dy / d * swirl;
        var oy = dy / d * (pull + ripple) + dx / d * swirl;
        var sc = 1 + k * 0.22 * P.R / (dd + P.R * 0.7);
        var sw = Math.ceil(C * sc) + 2;
        ctx.drawImage(tmp, x, y, C, C, Math.round(cx + ox - sw / 2), Math.round(cy + oy - sw / 2), sw, sw);
      }
    }
    // time stutters: now and then the moment before flickers back over this one
    var st = now % 9000;
    if (st < 420 && prev.width) {
      ctx.globalAlpha = 0.35 * (1 - st / 420);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(prev, 3, -2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else if (now - prevAt > 350) {
      pctx.clearRect(0, 0, w, h);
      pctx.drawImage(buf, 0, 0);
      prevAt = now;
    }
    // blue-shifted toward the hole, ember away from it; dark at the edges
    ctx.globalCompositeOperation = 'soft-light';
    var gr = ctx.createRadialGradient(P.hx, P.hy, P.R, P.hx, P.hy, P.R + Math.hypot(w, h));
    gr.addColorStop(0, 'rgba(130,160,255,' + (0.5 * k).toFixed(2) + ')');
    gr.addColorStop(0.45, 'rgba(170,130,230,0.15)');
    gr.addColorStop(1, 'rgba(255,140,80,' + (0.3 * k).toFixed(2) + ')');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(4,0,12,' + (0.18 + 0.2 * k).toFixed(2) + ')');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ---- echoes of the pilot, a moment behind --------------------------------------------------------
  var trail = [];
  function echoes(world, offX, offY, ts, now, sc) {
    var f = BridgeCharacter.frame && BridgeCharacter.frame();
    if (!f) return [];
    if (!trail.length || now - trail[trail.length - 1].t > 90) trail.push({ t: now, f: f });
    while (trail.length && now - trail[0].t > 1400) trail.shift();
    var out = [];
    [300, 650, 1000, 1300].forEach(function (delay, i) {
      var e = null;
      for (var j = trail.length - 1; j >= 0; j--) if (now - trail[j].t >= delay) { e = trail[j]; break; }
      if (!e || (Math.abs(e.f.x - f.x) < 0.2 && Math.abs(e.f.y - f.y) < 0.2)) return;
      out.push({
        footRow: e.f.footRow - 0.01,
        draw: function (ctx) {
          var cx = Math.round(offX + (e.f.x + 0.5) * ts), footY = Math.round(offY + e.f.footRow * ts);
          ctx.save();
          ctx.globalAlpha = 0.34 - i * 0.07;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(e.f.img, e.f.sx, e.f.sy, e.f.w, e.f.h, cx - e.f.w / 2 + (i % 2 ? 1 : -1), footY - (e.f.h - 3), e.f.w, e.f.h);
          ctx.restore();
        }
      });
    });
    return out;
  }

  return { place: place, sky: sky, post: post, echoes: echoes };
})();
