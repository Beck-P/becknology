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
  // In flat steps, not smooth ramps: the dark warming toward the hole in rings, two depths of stars far off (slid with the
  // camera at their depths) and the near ones dragged round the hole into arcs; the accretion disc as bands of fire from
  // white-hot at its inner edge to violet at its rim, its far side bent up over the top of the horizon and under it by the
  // hole's gravity (the lensed arcs), the side turning toward you brighter than the side going away; the photon ring a
  // hard line of white round the black. The disc streams; now and then it slips back half a second (time catching).
  var stars = null, FAR = { key: '', c: [] };
  var GLOW = ['#04030a', '#08051a', '#0e0824', '#160a2c', '#200d32', '#2c1036', '#3a1438'];
  function farStars(w, h) {
    var key = w + 'x' + h;
    if (FAR.key === key) return FAR.c;
    FAR.c = [[w * h / 160, 0.45], [w * h / 900, 0.85]].map(function (L, li) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d');
      for (var i = 0; i < L[0]; i++) {
        var r = hash(i * 1.7 + li * 31);
        g.fillStyle = r > 0.85 ? 'rgba(255,214,190,' + L[1] + ')' : r < 0.2 ? 'rgba(190,170,255,' + L[1] + ')' : 'rgba(230,226,255,' + (L[1] * (0.6 + 0.4 * r)).toFixed(2) + ')';
        g.fillRect(Math.floor(hash(i * 3.3 + li * 7) * w), Math.floor(hash(i * 5.9 + li * 11) * h), 1, 1);
      }
      return c;
    });
    FAR.key = key;
    return FAR.c;
  }
  function slipped(now) { var st = now % 9000; return st < 420 ? now - 520 : now; }   // the moment the post's stutter shows
  function sky(ctx, w, h, now, P) {
    var hx = Math.round(P.hx), hy = Math.round(P.hy), R = Math.round(P.R);
    // the dark, warming toward the hole in rings
    ctx.fillStyle = GLOW[0]; ctx.fillRect(0, 0, w, h);
    for (var gi = 1; gi < GLOW.length; gi++) {
      ctx.fillStyle = GLOW[gi];
      ctx.beginPath(); ctx.arc(hx, hy, R * (3.3 - gi * 0.36), 0, Math.PI * 2); ctx.fill();
    }
    // far stars in two depths
    var v = BridgeWorld.getView ? BridgeWorld.getView() : { offX: 0, offY: 0 }, F = farStars(w, h);
    [0.012, 0.03].forEach(function (k, i) {
      var ox = ((Math.round(v.offX * k) % w) + w) % w, oy = ((Math.round(v.offY * k) % h) + h) % h, c = F[i];
      ctx.drawImage(c, ox - w, oy - h); ctx.drawImage(c, ox, oy - h); ctx.drawImage(c, ox - w, oy); ctx.drawImage(c, ox, oy);
    });
    // starlight dragged round the hole into arcs (faster and longer near it)
    if (!stars) {
      stars = [];
      for (var i = 0; i < 300; i++) stars.push([1.04 + Math.pow(hash(i), 0.7) * 3.4, hash(i * 3) * 6.283, hash(i * 7)]);
    }
    var tn = slipped(now);
    for (var j = 0; j < stars.length; j++) {
      var s = stars[j];
      var rho = s[0] * R;
      var om = 0.00002 * Math.pow(1 / s[0], 1.5);
      var a = s[1] + tn * om;
      var len = Math.min(0.5, om * 2600);
      var bright = 0.3 + 0.6 * s[2];
      ctx.fillStyle = 'rgba(230,220,255,' + (bright * Math.min(1, (s[0] - 1.0) * 6)).toFixed(2) + ')';
      var n = Math.max(1, Math.round(len * rho / 2));
      for (var q = 0; q < n; q++) {
        var aa = a - q * 2 / rho;
        var x = hx + Math.cos(aa) * rho, y = hy + Math.sin(aa) * rho;
        if (x >= 0 && y >= 0 && x < w && y < h) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    // the far side of the disc behind the hole, and its light bent up over the top of the horizon and under it
    ctx.save();
    discBands(ctx, hx, hy, R, false);
    lensed(ctx, hx, hy, R);
    ctx.globalCompositeOperation = 'lighter';
    disc(ctx, tn, P, false);
    ctx.restore();
    // the horizon, and the photon ring hugging it
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff6e4';
    ctx.beginPath(); ctx.arc(hx, hy, R + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,196,120,0.8)';
    ctx.beginPath(); ctx.arc(hx, hy, R + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // light streaming round the edge
    for (var L = 0; L < 4; L++) {
      ctx.strokeStyle = 'rgba(' + RAMP[L] + ',' + (0.5 - L * 0.1).toFixed(2) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([18 + L * 9, 6 + L * 5]);
      ctx.lineDashOffset = -tn * (0.05 / (1 + L * 0.4));
      ctx.beginPath(); ctx.arc(hx, hy, R * (1.02 + L * 0.025), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
    // the near side of the disc, across the face of the hole, then its streaming
    ctx.save();
    discBands(ctx, hx, hy, R, true);
    ctx.globalCompositeOperation = 'lighter';
    disc(ctx, tn, P, true);
    ctx.restore();
  }
  // the disc in flat bands: annuli of a tilted ellipse, white-hot inside to violet out, the half turning toward you
  // (left) brighter. front: the lower half in the disc's frame (in front of the hole); else the upper (behind it)
  var DISC = [[1.08, '255,250,236', 0.95], [1.16, '255,226,170', 0.85], [1.28, '255,184,104', 0.7], [1.44, '240,128,72', 0.55],
              [1.62, '206,84,110', 0.42], [1.84, '140,64,170', 0.3], [2.1, '80,44,130', 0.2]];
  function discBands(ctx, hx, hy, R, front) {
    var tilt = -0.32, flat = 0.2;
    ctx.translate(hx, hy); ctx.rotate(tilt);
    for (var i = DISC.length - 1; i >= 0; i--) {
      var o = DISC[i][0] * R, inn = (i ? DISC[i - 1][0] : 1.02) * R;
      for (var side = 0; side < 2; side++) {
        var a0 = front ? (side ? Math.PI / 2 : 0) : (side ? Math.PI * 1.5 : Math.PI), a1 = a0 + Math.PI / 2;
        var toward = front ? side === 1 : side === 0;
        ctx.fillStyle = 'rgba(' + DISC[i][1] + ',' + Math.min(1, DISC[i][2] * (toward ? 1.15 : 0.6)).toFixed(2) + ')';
        ctx.beginPath();
        ctx.ellipse(0, 0, o, o * flat, 0, a0, a1);
        ctx.ellipse(0, 0, inn, inn * flat, 0, a1, a0, true);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // the lensed image of the far disc: a band of fire arching over the top of the horizon (thick at the crown, thin at the
  // sides) and a thinner one under it
  function lensed(ctx, hx, hy, R) {
    ctx.translate(hx, hy); ctx.rotate(-0.32);
    for (var i = 4; i >= 0; i--) {
      var th = [0.06, 0.12, 0.2, 0.3, 0.42][i] * R;
      ctx.fillStyle = 'rgba(' + DISC[i][1] + ',' + (DISC[i][2] * 0.85).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(0, -th * 0.15, R + th, R + th * 1.1, 0, Math.PI * 1.06, Math.PI * 1.94);
      ctx.ellipse(0, 0, R, R, 0, Math.PI * 1.94, Math.PI * 1.06, true);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, th * 0.05, R + th * 0.35, R + th * 0.4, 0, Math.PI * 0.12, Math.PI * 0.88);
      ctx.ellipse(0, 0, R, R, 0, Math.PI * 0.88, Math.PI * 0.12, true);
      ctx.closePath(); ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        var alpha = (0.62 - t * 0.5) * (approaching ? 1.25 : 0.6) * (front ? 0.9 : 0.6);
        ctx.strokeStyle = 'rgba(' + col + ',' + Math.max(0.05, alpha).toFixed(2) + ')';
        ctx.lineWidth = 1;
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
    // the pull, a gravitational wave every few seconds and a slow swirl, sampled along strips four pixels tall in 64-px
    // pieces: each piece of the frame is fetched from where the hole has pulled it from (so every pixel is drawn
    // once and nothing tears into blocks — the old 16-px cells stepped every edge on the plain into stairs)
    var k = P.k, RH = 4, SW = 64;
    var period = 6500, wt = (now % period) / period;
    var waveD = wt * (Math.hypot(w, h) + P.R) * 1.1 - P.R * 0.2;
    var swirlT = Math.sin(now / 2600);
    for (var y = 0; y < h; y += RH) {
      for (var x = 0; x < w; x += SW) {
        var cx = x + SW / 2, cy = y + RH / 2;
        var dx = P.hx - cx, dy = P.hy - cy, d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
        var dd = Math.max(0, d - P.R);
        var pull = k * 16 * P.R / (dd + P.R * 0.45);
        var dw = dd - waveD;
        var ripple = k * 4.5 * Math.sin(dw * 0.09) * Math.exp(-dw * dw / 3600);
        var swirl = k * 5 * swirlT * P.R / (dd + P.R);
        var ox = dx / d * (pull + ripple) - dy / d * swirl;
        var oy = dy / d * (pull + ripple) + dx / d * swirl;
        var sw = Math.min(SW, w - x), sx = Math.round(x - ox), sy = Math.round(y - oy);
        sx = sx < 0 ? 0 : sx > w - sw ? w - sw : sx; sy = sy < 0 ? 0 : sy > h - RH ? h - RH : sy;
        ctx.drawImage(tmp, sx, sy, sw, RH, x, y, sw, RH);
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

  // ---- things falling in: grit and shards stream toward the horizon, stretching as they go -----------
  var motes = null;
  function drift(ctx, w, h, now, P) {
    if (!motes) {
      motes = [];
      for (var i = 0; i < 70; i++) motes.push({ seed: i, born: -hash(i * 7) * 9000, life: 5000 + hash(i * 3) * 5000 });
    }
    ctx.save();
    // the disc's light wheeling over the plain, a slow sweep of amber like a lighthouse round the hole
    ctx.globalCompositeOperation = 'lighter';
    var a0 = Math.PI * 0.62 + Math.sin(now / 7000) * 0.5;
    for (var b = 0; b < 2; b++) {
      var a = a0 + b * 0.38, spread = 0.07 + b * 0.03;
      var L = Math.hypot(w, h) + P.R * 2;
      var g = ctx.createRadialGradient(P.hx, P.hy, P.R, P.hx, P.hy, L);
      var al = (0.05 + 0.03 * Math.sin(now / 1300 + b)) * (0.6 + 0.4 * P.k);
      g.addColorStop(0, 'rgba(255,190,120,' + (al * 1.6).toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(255,150,90,' + al.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,120,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(P.hx, P.hy);
      ctx.lineTo(P.hx + Math.cos(a - spread) * L, P.hy + Math.sin(a - spread) * L);
      ctx.lineTo(P.hx + Math.cos(a + spread) * L, P.hy + Math.sin(a + spread) * L);
      ctx.closePath();
      ctx.fill();
    }
    // the motes: born anywhere on screen, accelerating in, drawn longer and redder the nearer they get
    for (var m = 0; m < motes.length; m++) {
      var o = motes[m];
      var age = now - o.born;
      if (age > o.life) { o.born = now; o.seed += 101; age = 0; o.life = 5000 + hash(o.seed * 3) * 5000; }
      var t = age / o.life;
      var sx = hash(o.seed * 11) * w * 1.2 - w * 0.1, sy = hash(o.seed * 13) * h * 1.2 - h * 0.1;
      var e = t * t * t;
      var x = sx + (P.hx - sx) * e, y = sy + (P.hy - sy) * e;
      var dx = P.hx - x, dy = P.hy - y, d = Math.hypot(dx, dy) + 1e-3;
      if (d < P.R * 1.02) continue;
      var near = Math.max(0, 1 - (d - P.R) / (P.R * 1.6));
      var len = 1 + near * near * 26 + t * 4;
      var ux = dx / d, uy = dy / d;
      var c = near > 0.6 ? '255,150,90' : near > 0.3 ? '255,210,170' : '220,210,255';
      var al2 = Math.min(1, t * 4) * (0.35 + 0.5 * near) * (1 - Math.max(0, (t - 0.92) / 0.08));
      ctx.strokeStyle = 'rgba(' + c + ',' + al2.toFixed(2) + ')';
      ctx.lineWidth = hash(o.seed) > 0.85 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x), Math.round(y));
      ctx.lineTo(Math.round(x - ux * len), Math.round(y - uy * len));
      ctx.stroke();
    }
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

  return { place: place, sky: sky, post: post, echoes: echoes, drift: drift };
})();
