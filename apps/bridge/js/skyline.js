/**
 * BridgeSkyline — Arcadia's megacity behind and below the District.
 *
 *   BridgeSkyline.draw(ctx, w, h, now, opts)   the backdrop (registered as the
 *                                              arcadia background for street worlds)
 *   BridgeSkyline.rain(ctx, w, h, now, opts)   rain over everything (scene `over` hook)
 *
 * Three Blender-rendered layers (tools/bridge-art/skyline.py → assets/
 * backdrops/arcadia/): `far` towers fading into smog, `mid` towers with
 * holo-ad screens, `low` the city under the walkway's railing. Each scrolls
 * at its own speed. Between and over them: a violet sky with a moon behind
 * smog, lanes of flying traffic, searchlights sweeping, drifting smog, and
 * animated holo-ads filling the screens the render left blank (their
 * corners are anchors in cine.json: ad<N>_a top-left, ad<N>_b bottom-right).
 *
 * opts: { baseRow, railRow, centerCol } — the world row the towers stand
 * behind, the row of the railing (the drop starts there) and the column
 * the layers centre on.
 */
var BridgeSkyline = (function () {
  var BASE = '/bridge/assets/backdrops/arcadia/';
  var manifest = null, imgs = {}, loading = false;

  function load() {
    if (loading) return;
    loading = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + 'cine.json?v=' + Date.now());
    xhr.onload = function () {
      if (xhr.status !== 200) return;
      manifest = JSON.parse(xhr.responseText);
      Object.keys(manifest).forEach(function (n) {
        var im = new Image();
        im.onload = function () { imgs[n] = im; };
        im.src = BASE + n + '.png?v=' + (manifest[n].rev || Date.now());
      });
    };
    xhr.send();
  }

  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // where a layer sits on screen: it scrolls `p` as fast as the world
  // horizontally and `pv` vertically, centred on the world's centre column
  function place(name, w, h, v, opts, p, pv, anchorRow, fromTop) {
    var m = manifest[name], ts = v.ts;
    var wx = v.offX + opts.centerCol * ts;
    var x = Math.round(w / 2 + (wx - w / 2) * p - m.w / 2);
    var wy = v.offY + anchorRow * ts;
    var y = Math.round(h / 2 + (wy - h / 2) * pv - (fromTop ? 0 : m.h));
    return { x: x, y: y, m: m };
  }

  // ---- the sky ------------------------------------------------------------------------
  function sky(ctx, w, h, now, horizon) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    var hz = Math.max(0.2, Math.min(0.95, horizon / h));
    g.addColorStop(0, '#07041a');
    g.addColorStop(hz * 0.55, '#1a0a34');
    g.addColorStop(hz * 0.9, '#4a1450');
    g.addColorStop(Math.min(1, hz + 0.05), '#6a2058');
    g.addColorStop(1, '#12061e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // stars, few and faint through the smog
    for (var i = 0; i < 60; i++) {
      var sx = Math.floor(hash(i) * w), sy = Math.floor(hash(i + 99) * horizon * 0.6);
      var tw = 0.3 + 0.3 * Math.sin(now / 900 + i);
      ctx.fillStyle = 'rgba(220,210,255,' + tw.toFixed(2) + ')';
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  function moon(ctx, x, y, r, now) {
    var halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 4);
    halo.addColorStop(0, 'rgba(255,190,230,0.35)');
    halo.addColorStop(1, 'rgba(255,120,200,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    // a dithered disc: pale pink, a darker limb, a few maria
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d > 1) continue;
        var shade = 1 - d * d * 0.35 - (dx + dy > r * 0.6 ? 0.15 : 0);
        var mare = hash(Math.floor((dx + r) / 3) * 31 + Math.floor((dy + r) / 3) * 7) > 0.78 ? 0.85 : 1;
        var c = shade * mare;
        var bay = ((dx & 1) + (dy & 1) * 2) / 4;
        c = Math.floor(c * 6 + bay) / 6;
        ctx.fillStyle = 'rgb(' + Math.round(255 * c) + ',' + Math.round(214 * c) + ',' + Math.round(232 * c) + ')';
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }

  function smog(ctx, w, y, hgt, now, speed, col, alpha) {
    // soft bands drifting sideways, broken into lobes
    for (var i = 0; i < 7; i++) {
      var bw = 120 + hash(i * 3) * 160;
      var bx = ((hash(i) * (w + bw) + now * speed * (0.6 + hash(i + 5) * 0.8)) % (w + bw * 2)) - bw;
      var by = y + hash(i + 11) * hgt;
      var g = ctx.createRadialGradient(bx + bw / 2, by, 0, bx + bw / 2, by, bw / 2);
      g.addColorStop(0, 'rgba(' + col + ',' + alpha + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(bx, by - bw / 2, bw, bw);
    }
  }

  function searchlights(ctx, w, baseY, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 3; i++) {
      var x = w * (0.2 + i * 0.3) + Math.sin(now / 9000 + i) * 40;
      var a = -Math.PI / 2 + Math.sin(now / (5200 + i * 1700) + i * 2) * 0.45;
      var L = 420, spread = 0.05;
      var g = ctx.createLinearGradient(x, baseY, x + Math.cos(a) * L, baseY + Math.sin(a) * L);
      g.addColorStop(0, 'rgba(200,180,255,0.16)');
      g.addColorStop(1, 'rgba(200,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + Math.cos(a - spread) * L, baseY + Math.sin(a - spread) * L);
      ctx.lineTo(x + Math.cos(a + spread) * L, baseY + Math.sin(a + spread) * L);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // flying traffic: lanes of paired lights, each lane its own speed and way
  function traffic(ctx, w, y, now, lanes, scale) {
    for (var L = 0; L < lanes; L++) {
      var ly = Math.round(y + L * 9 * scale);
      var dir = L % 2 ? -1 : 1;
      var speed = (0.02 + L * 0.008) * scale;
      var n = 8 + L * 3;
      for (var i = 0; i < n; i++) {
        var span = w + 80;
        var x = ((hash(L * 50 + i) * span + now * speed * dir) % span + span) % span - 40;
        var bob = Math.round(Math.sin(now / 700 + i) * 0.6);
        var len = Math.max(2, Math.round(3 * scale));
        ctx.fillStyle = dir > 0 ? 'rgba(255,90,110,0.9)' : 'rgba(230,240,255,0.95)';
        ctx.fillRect(Math.round(x), ly + bob, len, 1);
        ctx.fillStyle = dir > 0 ? 'rgba(230,240,255,0.95)' : 'rgba(255,90,110,0.9)';
        ctx.fillRect(Math.round(x) + len + 1, ly + bob, 1, 1);
      }
    }
  }

  // ---- holo-ads ---------------------------------------------------------------------------
  var GLYPH = [0x7, 0x5, 0x2, 0x6, 0x3, 0x1, 0x4];
  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }

  function ad(ctx, kind, x, y, w, h, now, seed) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    var t = now / 1000;
    var cx = x + w / 2, cy = y + h / 2;
    if (kind === 0) {                      // koi circling in a dark pool
      px(ctx, x, y, w, h, '#0a1440');
      for (var k = 0; k < 2; k++) {
        var a = t * 0.9 + k * Math.PI;
        var fx = cx + Math.cos(a) * w * 0.28, fy = cy + Math.sin(a) * h * 0.25;
        for (var s = 0; s < 6; s++) {
          var aa = a - s * 0.18;
          var sx = cx + Math.cos(aa) * w * 0.28, sy = cy + Math.sin(aa) * h * 0.25;
          var sz = Math.max(1, 4 - s * 0.6);
          px(ctx, sx - sz / 2, sy - sz / 2, sz, sz, s === 0 ? '#fff0e0' : (s % 2 ? '#ff7a30' : '#ffe0c0'));
        }
        px(ctx, fx - 1, fy - 1, 2, 2, '#ffffff');
      }
      ctx.strokeStyle = 'rgba(120,180,255,0.4)';
      var rr = (t * 12) % (w / 2);
      ctx.strokeRect(Math.round(cx - rr), Math.round(cy - rr * 0.6), Math.round(rr * 2), Math.round(rr * 1.2));
    } else if (kind === 1) {               // glyph rain
      px(ctx, x, y, w, h, '#03140c');
      for (var c = 0; c < w / 4; c++) {
        var off = (t * (14 + hash(c + seed) * 18) + hash(c * 7 + seed) * h) % (h + 20);
        for (var r = 0; r < 6; r++) {
          var gy = y + off - r * 4;
          if (gy < y - 4 || gy > y + h) continue;
          var bits = GLYPH[(c + r + Math.floor(t * 4)) % GLYPH.length];
          var col = r === 0 ? '#c0ffe0' : 'rgba(60,230,140,' + (1 - r / 6).toFixed(2) + ')';
          for (var b = 0; b < 3; b++) if (bits & (1 << b)) px(ctx, x + c * 4 + b, gy, 1, 2, col);
        }
      }
    } else if (kind === 2) {               // a face in profile, blinking, lips moving
      px(ctx, x, y, w, h, '#2a0830');
      var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.6);
      g.addColorStop(0, 'rgba(255,90,200,0.5)');
      g.addColorStop(1, 'rgba(255,90,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      var fw = w * 0.42, fh = h * 0.7, fx0 = cx - fw * 0.4, fy0 = cy - fh / 2;
      px(ctx, fx0, fy0, fw, fh, '#f0c8e0');
      px(ctx, fx0 - fw * 0.15, fy0 - 2, fw * 1.1, fh * 0.32, '#140818');          // hair
      px(ctx, fx0 + fw, fy0 + fh * 0.45, 3, 3, '#f0c8e0');                         // nose
      var blink = (t % 3.2) < 0.15;
      px(ctx, fx0 + fw * 0.62, fy0 + fh * 0.4, 4, blink ? 1 : 2, '#20103a');
      var talk = Math.abs(Math.sin(t * 6)) > 0.5;
      px(ctx, fx0 + fw * 0.66, fy0 + fh * 0.72, 5, talk ? 2 : 1, '#e02060');
    } else if (kind === 3) {               // a can turning, sparkles
      px(ctx, x, y, w, h, '#100830');
      var cw = w * 0.28 * (0.55 + 0.45 * Math.abs(Math.cos(t * 1.4))), ch = h * 0.66;
      px(ctx, cx - cw / 2, cy - ch / 2, cw, ch, '#e84060');
      px(ctx, cx - cw / 2, cy - ch * 0.12, cw, ch * 0.22, '#ffe0f0');
      px(ctx, cx - cw / 2, cy - ch / 2 - 2, cw, 2, '#c0c0d0');
      px(ctx, cx - cw / 2, cy + ch / 2, cw, 2, '#c0c0d0');
      for (var sp = 0; sp < 5; sp++) {
        var st = (t * 1.5 + sp * 0.37) % 1;
        if (st < 0.3) px(ctx, x + hash(sp + Math.floor(t * 1.5)) * w, y + hash(sp * 3 + Math.floor(t * 1.5)) * h, 2, 2, '#fff8c0');
      }
    } else if (kind === 4) {               // equalizer bars, a music ad
      px(ctx, x, y, w, h, '#0c0626');
      var nb = Math.floor(w / 4);
      for (var bI = 0; bI < nb; bI++) {
        var bh = (0.2 + 0.8 * Math.abs(Math.sin(t * (2 + hash(bI) * 3) + bI))) * h * 0.8;
        var hue = bI / nb;
        px(ctx, x + bI * 4 + 1, y + h - bh, 3, bh, hue < 0.5 ? '#5cc8d0' : '#f078a8');
      }
    } else if (kind === 'royale') {        // the Neon Royale's own screens: a gold crown, a fan of aces, chips raining, the wheel
      px(ctx, x, y, w, h, '#1a0828');
      var scene = Math.floor(t / 4) % 4, u = Math.max(1, Math.round(Math.min(w, h) / 22));
      if (scene === 0) {
        var gy = cy - 3 * u;
        px(ctx, cx - 7 * u, gy + 4 * u, 15 * u, 4 * u, '#e8c040');
        for (var pk = 0; pk < 5; pk++) px(ctx, cx - 7 * u + pk * 3.5 * u, gy - (pk % 2 ? 1 : 3) * u, 1.6 * u, (pk % 2 ? 5 : 7) * u, '#e8c040');
        for (var gm = 0; gm < 3; gm++) px(ctx, cx - 4 * u + gm * 4 * u, gy + 5 * u, 2 * u, 2 * u, gm === 1 ? '#ff60d0' : '#5cc8ff');
        for (var sp = 0; sp < 6; sp++) if (hash(sp + Math.floor(t * 3)) > 0.5) px(ctx, x + hash(sp * 7 + Math.floor(t * 3)) * w, y + hash(sp * 3 + Math.floor(t * 3)) * h, u, u, '#fff8c0');
      } else if (scene === 1) {
        for (var cd = 0; cd < 4; cd++) {
          var fan = (cd - 1.5) * 4 * u * Math.min(1, (t % 4) * 1.5);
          px(ctx, cx - 3 * u + fan, cy - 5 * u + Math.abs(cd - 1.5) * u, 6 * u, 9 * u, '#f4f0e8');
          px(ctx, cx - u + fan, cy - u + Math.abs(cd - 1.5) * u, 2 * u, 2 * u, cd % 2 ? '#e02030' : '#141216');
        }
      } else if (scene === 2) {
        var chipC = ['#e84040', '#40a0ff', '#40e080', '#e8c040', '#a060e0'];
        for (var ch = 0; ch < 12; ch++) {
          var fy = ((t * (18 + hash(ch) * 14) + hash(ch * 5) * h) % (h + 8)) - 4;
          px(ctx, x + hash(ch * 3) * (w - 4 * u), y + fy, 4 * u, 2 * u, chipC[ch % 5]);
        }
      } else {
        var R2 = Math.min(w, h) * 0.38;
        for (var pk2 = 0; pk2 < 18; pk2++) {
          var aa = pk2 / 18 * Math.PI * 2 + t * 2.2;
          px(ctx, cx + Math.cos(aa) * R2 - u, cy + Math.sin(aa) * R2 - u, 2 * u, 2 * u, pk2 === 0 ? '#1a8a40' : pk2 % 2 ? '#b01a24' : '#141216');
        }
        px(ctx, cx - u, cy - u, 2 * u, 2 * u, '#e8c040');
        px(ctx, cx + Math.cos(-t * 4) * R2 * 0.75, cy + Math.sin(-t * 4) * R2 * 0.75, u, u, '#ffffff');
      }
      ctx.strokeStyle = 'rgba(255,214,120,0.6)';                         // a gold bulb frame chasing round it
      for (var bf = 0; bf < 16; bf++) {
        if ((bf + Math.floor(t * 6)) % 3) continue;
        var per = bf / 16, bx2, by2;
        if (per < 0.25) { bx2 = x + per * 4 * w; by2 = y; } else if (per < 0.5) { bx2 = x + w - 1; by2 = y + (per - 0.25) * 4 * h; }
        else if (per < 0.75) { bx2 = x + w - (per - 0.5) * 4 * w; by2 = y + h - 1; } else { bx2 = x; by2 = y + h - (per - 0.75) * 4 * h; }
        px(ctx, bx2, by2, 1, 1, '#fff0c0');
      }
    } else if (kind === 'null') {          // NULL has the screen: their mark, glitching (js/splice.js jobs)
      px(ctx, x, y, w, h, '#0c0410');
      var R = Math.min(w, h) * 0.32 * (0.92 + 0.08 * Math.sin(t * 9));
      ctx.strokeStyle = '#e040c0';
      ctx.lineWidth = Math.max(2, Math.round(R * 0.22));
      ctx.beginPath(); ctx.arc(Math.round(cx), Math.round(cy), R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R * 1.15, cy + R * 1.15); ctx.lineTo(cx + R * 1.15, cy - R * 1.15); ctx.stroke();
      for (var gl = 0; gl < 4; gl++) {
        if (hash(Math.floor(t * 8) + gl * 5 + seed) > 0.6) px(ctx, x, y + hash(gl + Math.floor(t * 8)) * h, w, 1 + gl % 2, gl % 2 ? '#40e0d0' : '#60ff90');
      }
    } else {                                // an eye with rings pulsing out
      px(ctx, x, y, w, h, '#06102a');
      for (var ri = 0; ri < 3; ri++) {
        var rad = ((t * 10 + ri * 8) % 26);
        ctx.strokeStyle = 'rgba(92,200,208,' + (1 - rad / 26).toFixed(2) + ')';
        ctx.strokeRect(Math.round(cx - rad), Math.round(cy - rad * 0.6), Math.round(rad * 2), Math.round(rad * 1.2));
      }
      px(ctx, cx - w * 0.22, cy - 3, w * 0.44, 6, '#e0f8ff');
      px(ctx, cx - 3 + Math.sin(t) * w * 0.12, cy - 3, 6, 6, '#2060e0');
      px(ctx, cx - 1 + Math.sin(t) * w * 0.12, cy - 1, 2, 2, '#000');
    }
    // scanlines, a glitch slice now and then, the glass sheen
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (var sl = y; sl < y + h; sl += 2) ctx.fillRect(x, sl, w, 1);
    if (hash(Math.floor(now / 140) + seed) > 0.93) {
      var gy2 = y + hash(Math.floor(now / 140) * 3) * h;
      ctx.drawImage(ctx.canvas, x, gy2, w, 3, x + 3, gy2, w, 3);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), 1);
  }

  function hijacked() { return typeof BridgeEvents !== 'undefined' && BridgeEvents.screens && BridgeEvents.screens() === 'null'; }
  function ads(ctx, P, now) {
    var a = P.m.anchors, i = 0;
    while (a['ad' + i + '_a']) {
      var A = a['ad' + i + '_a'], B = a['ad' + i + '_b'];
      var x = P.x + A[0], y = P.y + A[1], w = B[0] - A[0], h = B[1] - A[1];
      if (w > 4 && h > 4) {
        // every third tower screen takes the Neon Royale's ad now and then (the casino on the District street)
        var kind = i % 3 === 1 && Math.floor(now / 9000 + i) % 2 ? 'royale' : (i * 5 + 1) % 6;
        if (hijacked()) kind = 'null';                 // NULL has every screen in the city (js/events.js)
        ad(ctx, kind, Math.round(x), Math.round(y), Math.round(w), Math.round(h), now + i * 777, i * 13);
        // its light spilling round the screen
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h));
        g.addColorStop(0, 'rgba(160,90,255,0.12)');
        g.addColorStop(1, 'rgba(160,90,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2, y - h / 2, w * 2, h * 2);
        ctx.restore();
      }
      i++;
    }
  }

  // ---- the backdrop ---------------------------------------------------------------------------
  function draw(ctx, w, h, now, opts) {
    load();
    var v = BridgeWorld.getView();
    var ts = v.ts;
    opts = opts || {};
    var baseRow = opts.baseRow != null ? opts.baseRow : 6;
    var railRow = opts.railRow != null ? opts.railRow : 13.2;
    opts.centerCol = opts.centerCol != null ? opts.centerCol : 16;
    var horizon = h / 2 + (v.offY + baseRow * ts - h / 2) * 0.35;
    sky(ctx, w, h, now, horizon);
    var mx = Math.round(w * 0.72 + (v.offX + opts.centerCol * ts - w / 2) * 0.06);
    moon(ctx, mx, Math.round(horizon * 0.28), 14, now);
    smog(ctx, w, horizon * 0.15, horizon * 0.25, now, 0.004, '120,50,140', 0.22);
    if (!manifest) return;
    if (imgs.far) {
      var F = place('far', w, h, v, opts, 0.22, 0.35, baseRow - 1);
      searchlights(ctx, w, F.y + F.m.h * 0.9, now);
      ctx.globalAlpha = 0.82;                          // the far towers sink into the smog
      ctx.drawImage(imgs.far, F.x, F.y);
      ctx.globalAlpha = 1;
      traffic(ctx, w, F.y + F.m.h * 0.45, now, 3, 0.8);
      smog(ctx, w, F.y + F.m.h * 0.55, F.m.h * 0.4, now, 0.006, '170,60,150', 0.18);
    }
    if (imgs.mid) {
      var M = place('mid', w, h, v, opts, 0.45, 0.55, baseRow);
      ctx.drawImage(imgs.mid, M.x, M.y);
      ads(ctx, M, now);
      traffic(ctx, w, M.y + M.m.h * 0.62, now + 5000, 2, 1.3);
    }
    if (imgs.low) {
      var Lo = place('low', w, h, v, opts, 0.7, 1, railRow, true);
      // the drop: dark first, then the roofs far below, haze over them
      ctx.fillStyle = '#0a0414';
      ctx.fillRect(0, Lo.y, w, h - Lo.y);
      ctx.drawImage(imgs.low, Lo.x, Lo.y + 6);
      var hz = ctx.createLinearGradient(0, Lo.y, 0, Lo.y + 90);
      hz.addColorStop(0, 'rgba(60,16,70,0.85)');
      hz.addColorStop(1, 'rgba(60,16,70,0.15)');
      ctx.fillStyle = hz;
      ctx.fillRect(0, Lo.y, w, h - Lo.y);
      traffic(ctx, w, Lo.y + 30, now + 9000, 2, 1.0);
    }
  }

  // ---- the street's own screens, bulbs and steam (scene.ads / bulbs / steam, in tiles) ----------
  function streetAds(ctx, sc, offX, offY, ts, now) {
    // once you've done jobs for NULL, their mark takes a screen now and then (more often the more you've done)
    var jobs = typeof BridgeSplice !== 'undefined' && BridgeSplice.level ? BridgeSplice.level() : 0;
    (sc.ads || []).forEach(function (a, i) {
      var x = Math.round(offX + a[0] * ts), y = Math.round(offY + a[1] * ts);
      var w = Math.round((a[2] - a[0]) * ts), h = Math.round((a[3] - a[1]) * ts);
      var kind = a[4] != null ? a[4] : i % 6;
      if (jobs && hash(Math.floor(now / 7000) * 31 + i * 17) < Math.min(0.45, 0.07 * jobs)) kind = 'null';
      if (hijacked()) kind = 'null';
      ad(ctx, kind, x, y, w, h, now + i * 1311, i * 7 + 3);
    });
    // marquee bulbs chasing: every third one bright, stepping along
    var step = Math.floor(now / 160);
    (sc.bulbs || []).forEach(function (b, i) {
      if ((Math.floor(i / 2) + step) % 3) return;
      var x = Math.round(offX + b[0] * ts), y = Math.round(offY + b[1] * ts);
      ctx.fillStyle = 'rgba(255,250,220,0.95)';
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = 'rgba(255,200,120,0.35)';
      ctx.fillRect(x - 2, y - 2, 5, 5);
    });
  }

  function steam(ctx, sc, offX, offY, ts, now) {
    (sc.steam || []).forEach(function (v, i) {
      var bx = offX + v[0] * ts, by = offY + v[1] * ts;
      for (var p = 0; p < 7; p++) {
        var life = ((now / 2600) + p / 7 + hash(i * 13 + p) * 0.3) % 1;
        var x = bx + Math.sin(life * 4 + p + i) * 4 + (hash(p + i) - 0.5) * 8 + life * 6;
        var y = by - life * 46;
        var r = 2 + life * 7;
        ctx.fillStyle = 'rgba(200,190,230,' + (0.22 * (1 - life)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // ---- rain ---------------------------------------------------------------------------------------
  function rain(ctx, w, h, now, opts) {
    var n = (opts && opts.drops) || 140;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var sp = 0.32 + hash(i) * 0.18;
      var x = (hash(i * 3) * (w + 60) - now * sp * 0.35) % (w + 60);
      if (x < 0) x += w + 60;
      var y = (hash(i * 7) * (h + 40) + now * sp) % (h + 40) - 20;
      var near = hash(i * 11) > 0.75;
      ctx.fillStyle = near ? 'rgba(200,210,255,0.32)' : 'rgba(170,170,240,0.18)';
      var len = near ? 7 : 4;
      for (var j = 0; j < len; j++) ctx.fillRect(Math.round(x - j * 0.35), Math.round(y + j), 1, 1);
    }
    // splashes on the street
    if (opts && opts.splash) {
      var v = BridgeWorld.getView(), sp2 = opts.splash;
      for (var k = 0; k < 26; k++) {
        var cyc = (now / 420 + hash(k) * 10) % 1;
        var id = Math.floor(now / 420 + hash(k) * 10) * 97 + k;
        var col = sp2[0] + hash(id) * (sp2[2] - sp2[0]), row = sp2[1] + hash(id + 1) * (sp2[3] - sp2[1]);
        var sx = Math.round(v.offX + col * v.ts), sy = Math.round(v.offY + row * v.ts);
        var r = Math.round(cyc * 4);
        ctx.fillStyle = 'rgba(200,210,255,' + (0.4 * (1 - cyc)).toFixed(2) + ')';
        ctx.fillRect(sx - r, sy, 1, 1);
        ctx.fillRect(sx + r, sy, 1, 1);
        if (cyc < 0.3) ctx.fillRect(sx, sy - 2 - Math.round(cyc * 6), 1, 1);
      }
    }
    ctx.restore();
  }

  return { draw: draw, rain: rain, load: load, ad: ad, streetAds: streetAds, steam: steam };
})();
