/**
 * BridgeBlackHole — the Singularity's hole, drawn per pixel.
 *
 *   BridgeBlackHole.draw(ctx, cx, cy, now)   centred on (cx, cy), native px
 *
 * Not a physical ray-trace, a painter's version of one: the shadow (R px),
 * a thin photon ring hugging it, the accretion disc as a thin tilted ellipse
 * whose near half crosses in front of the shadow, and the disc's far side
 * lensed up over the top of the shadow (and a fainter image under it), as
 * in the films. The disc turns with Keplerian shear (inner faster) and is
 * Doppler-bright on the side coming toward us. Stars behind are lensed
 * through an Einstein ring that breathes, and now and then a ripple runs
 * out through spacetime. Debris spirals in, stretching as it falls.
 *
 * Everything that doesn't change is computed once per size: each pixel's
 * polar position, disc coordinates and weights; a frame only shifts the
 * disc texture and recomputes the lens offset.
 */
var BridgeBlackHole = (function () {
  var R = 30;                         // shadow radius, native px
  var W = 384, H = 240;               // the region drawn round the hole
  var INC = 0.17;                     // the disc's ellipse: height / width
  var RIN = 1.15, ROUT = 4.6;         // disc radii, in R
  var NR = 48, NP = 512;              // disc texture: radius × angle
  var built = null;

  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // temperature ramp along the disc: white-hot inside, amber, ember, violet out
  var RAMP = [[255, 250, 236], [255, 214, 140], [255, 160, 70], [228, 92, 54], [170, 60, 120], [110, 50, 170], [50, 24, 90]];
  function ramp(t) {
    t = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
    var i = Math.floor(t), f = t - i, a = RAMP[i], b = RAMP[Math.min(RAMP.length - 1, i + 1)];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  function build() {
    var n = W * H, cx = W / 2, cy = H / 2;
    var B = {
      canvas: document.createElement('canvas'),
      rr: new Float32Array(n), ux: new Float32Array(n), uy: new Float32Array(n),
      dRho: new Float32Array(n), dPsi: new Float32Array(n), dFront: new Uint8Array(n),
      lRho: new Float32Array(n), lPsi: new Float32Array(n), lW: new Float32Array(n),
      fade: new Float32Array(n), stars: new Uint8Array(n), tex: new Float32Array(NR * NP)
    };
    B.canvas.width = W; B.canvas.height = H;
    B.ctx = B.canvas.getContext('2d');
    B.img = B.ctx.createImageData(W, H);
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = y * W + x;
        var X = (x + 0.5 - cx) / R, Y = (y + 0.5 - cy) / R;
        var r = Math.sqrt(X * X + Y * Y);
        B.rr[i] = r; B.ux[i] = r > 0 ? X / r : 0; B.uy[i] = r > 0 ? Y / r : 0;
        // the disc seen directly: a thin ellipse
        var yd = Y / INC, rho = Math.sqrt(X * X + yd * yd);
        if (rho >= RIN && rho <= ROUT) {
          B.dRho[i] = rho;
          B.dPsi[i] = Math.atan2(yd, X);
          B.dFront[i] = Y > 0 ? 1 : (r > 1 ? 2 : 0);          // 1 in front of the shadow, 2 beside it, 0 hidden
        }
        // the far side of the disc, bent up over the shadow (and under it)
        if (r > 1.02 && r < 2.7) {
          var rl = RIN + (r - 1.06) / 0.5 * 1.0;
          if (rl >= RIN && rl <= ROUT) {
            B.lRho[i] = rl;
            B.lPsi[i] = Math.atan2(-Y, X);
            var top = Y < 0 ? 1 : 0.45;
            B.lW[i] = top * Math.pow(Math.abs(Y) / r, 0.6) * Math.max(0, 1 - (r - 1.06) / 1.6);
          }
        }
        // where the hole's picture fades into the sky round it
        B.fade[i] = Math.max(0, Math.min(1, (3.6 - r) / 0.9)) * Math.max(0, Math.min(1, Math.min(x, W - 1 - x, y, H - 1 - y) / 14));
        // the star field behind (sampled through the lens each frame)
        B.stars[i] = hash(i * 1.37) > 0.994 ? Math.floor(120 + hash(i * 3.1) * 135) : 0;
      }
    }
    // disc texture: streaks along the orbit, rings across it
    for (var a = 0; a < NR; a++) {
      for (var b = 0; b < NP; b++) {
        var v = 0, amp = 1, tot = 0;
        for (var o = 0; o < 4; o++) {
          var f = 1 << o;
          var ph = hash(a * 13 + o * 101) * 6.283;
          v += amp * (0.5 + 0.5 * Math.sin(b / NP * 6.283 * (3 * f) + ph + Math.sin(a * 0.7 + o) * 2.0));
          tot += amp; amp *= 0.55;
        }
        v /= tot;
        var band = 0.75 + 0.25 * Math.sin(a * 1.9 + hash(a) * 3);
        B.tex[a * NP + b] = Math.pow(v, 1.5) * band;
      }
    }
    return B;
  }

  function discAt(B, rho, psi, now) {
    // Keplerian: inner rings turn faster
    var om = 0.00045 * Math.pow(RIN / rho, 1.5);
    var a = Math.min(NR - 1, Math.floor((rho - RIN) / (ROUT - RIN) * NR));
    var p = psi - now * om;
    var b = Math.floor(((p / 6.283) % 1 + 1) % 1 * NP);
    var e = B.tex[a * NP + b];
    var t = (rho - RIN) / (ROUT - RIN);
    var hot = Math.pow(1 - t, 1.6);
    return { e: e * (0.35 + 0.95 * hot) * (1 - t * 0.35), t: t };
  }

  function draw(ctx, cx, cy, now) {
    if (!built) built = build();
    var B = built, d = B.img.data, n = W * H;
    var E = 1.45 + 0.05 * Math.sin(now / 2300);                 // Einstein radius, breathing
    var wave = ((now / 6500) % 1) * 6, waveA = 0.12 * Math.max(0, 1 - wave / 6);
    for (var i = 0; i < n; i++) {
      var fade = B.fade[i];
      var o = i * 4;
      if (fade <= 0) { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = 255; continue; }
      var r = B.rr[i];
      var R0 = 0, G0 = 0, B0 = 0;                              // light only: the image is added over the sky
      if (r > 1) {
        // lensed stars: where this pixel's light came from
        var beta = r - E * E / r;
        beta += waveA * Math.sin((r - wave) * 7) * Math.exp(-(r - wave) * (r - wave) * 3);
        var sx = Math.round(W / 2 + B.ux[i] * Math.abs(beta) * R * (beta < 0 ? -1 : 1));
        var sy = Math.round(H / 2 + B.uy[i] * Math.abs(beta) * R * (beta < 0 ? -1 : 1));
        if (sx >= 0 && sy >= 0 && sx < W && sy < H) {
          var st = B.stars[sy * W + sx];
          if (st) { R0 = st; G0 = st * 0.92; B0 = st; }
        }
        // a faint Einstein ring of scattered light
        var er = Math.abs(r - E);
        if (er < 0.12) { var g = (1 - er / 0.12) * 40; R0 += g * 0.8; G0 += g * 0.6; B0 += g; }
      } else {
        R0 = 0; G0 = 0; B0 = 0;
      }
      var cr = R0, cg = G0, cb = B0;
      // the far side, lensed over the top
      if (B.lW[i] > 0) {
        var L = discAt(B, B.lRho[i], B.lPsi[i], now);
        var dop = 1 - 0.5 * Math.cos(B.lPsi[i]);
        var lv = L.e * B.lW[i] * dop * 2.1;
        var lc = ramp(L.t * 0.9 + (dop < 1 ? 0.12 : 0));
        cr += lc[0] * lv; cg += lc[1] * lv; cb += lc[2] * lv;
      }
      // the photon ring
      if (r > 0.98 && r < 1.12) {
        var pr = 1 - Math.abs(r - 1.04) / 0.08;
        if (pr > 0) { var pdop = 1 - 0.4 * B.ux[i]; cr += 255 * pr * 0.85 * pdop; cg += 220 * pr * 0.85 * pdop; cb += 170 * pr * 0.85 * pdop; }
      }
      // the disc seen directly
      var front = B.dFront[i];
      if (front) {
        var D = discAt(B, B.dRho[i], B.dPsi[i], now);
        var ddop = 1 - 0.55 * Math.cos(B.dPsi[i]);           // approaching (left) brighter
        var dv = D.e * ddop * 1.5;
        var dc = ramp(D.t * 0.85 + (ddop < 1 ? 0.15 : 0));
        if (front === 1 && r < 1) { cr = 0; cg = 0; cb = 0; }  // in front of the shadow: over black
        cr += dc[0] * dv; cg += dc[1] * dv; cb += dc[2] * dv;
      }
      // pixel-art: quantize with a 4x4 ordered dither
      var x = i % W, y = (i - x) / W;
      var th = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 10;
      d[o] = Math.max(0, Math.min(255, Math.round((cr * fade + th) / 8) * 8));
      d[o + 1] = Math.max(0, Math.min(255, Math.round((cg * fade + th) / 8) * 8));
      d[o + 2] = Math.max(0, Math.min(255, Math.round((cb * fade + th) / 8) * 8));
      d[o + 3] = 255;
    }
    B.ctx.putImageData(B.img, 0, 0);
    var x0 = Math.round(cx - W / 2), y0 = Math.round(cy - H / 2);
    // the sky's own stars fade out toward the lens (its stars are in the image),
    // the shadow is black, and the light of the hole adds over both
    ctx.save();
    var dk = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 3.4);
    dk.addColorStop(0, 'rgba(2,1,6,1)');
    dk.addColorStop(0.55, 'rgba(4,2,10,0.75)');
    dk.addColorStop(1, 'rgba(4,2,10,0)');
    ctx.fillStyle = dk;
    ctx.fillRect(cx - R * 3.4, cy - R * 3.4, R * 6.8, R * 6.8);
    ctx.globalCompositeOperation = 'lighter';
    var g1 = ctx.createRadialGradient(cx, cy, R * 1.2, cx, cy, R * 6);
    g1.addColorStop(0, 'rgba(255,170,90,0.20)');
    g1.addColorStop(0.4, 'rgba(160,80,200,0.10)');
    g1.addColorStop(1, 'rgba(80,40,140,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(cx - R * 6, cy - R * 6, R * 12, R * 12);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(B.canvas, x0, y0);
    ctx.restore();
    debris(ctx, cx, cy, now);
  }

  // rocks, shards and dust spiralling in, stretched as they fall
  function debris(ctx, cx, cy, now) {
    ctx.save();
    for (var k = 0; k < 70; k++) {
      var T = 9000 + hash(k) * 14000;
      var life = ((now / T) + hash(k * 7)) % 1;
      var r0 = (5.5 + hash(k * 3) * 5) * R;
      var r = r0 * Math.pow(1 - life, 0.75) + R * 0.95 * life;
      if (r < R * 1.02) continue;
      var a = hash(k * 11) * 6.283 + (now / T) * 6.283 * 0.5 + 9 * Math.pow(R / r, 1.5) * life;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.42;
      var near = R * 2.6 / r;                                  // stretched near the hole
      var len = 1 + Math.min(10, near * near * 3);
      var tx = -Math.sin(a), ty = Math.cos(a) * 0.42;
      var big = hash(k * 5) > 0.82;
      var lit = 0.35 + 0.65 * Math.max(0, Math.cos(a + 2.4));
      ctx.fillStyle = big ? 'rgba(' + Math.round(140 + 110 * lit) + ',' + Math.round(100 + 80 * lit) + ',' + Math.round(80 + 60 * lit) + ',0.9)'
                          : 'rgba(255,' + Math.round(170 + 60 * lit) + ',120,' + (0.35 + 0.5 * lit).toFixed(2) + ')';
      for (var s = 0; s < len; s++) ctx.fillRect(Math.round(x - tx * s), Math.round(y - ty * s), big ? 2 : 1, big ? 2 : 1);
    }
    ctx.restore();
  }

  return { draw: draw, R: R };
})();
