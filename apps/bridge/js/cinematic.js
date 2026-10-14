/**
 * BridgeCine — the shuttle's cutscenes between the mothership and a world.
 *
 *   BridgeCine.launch(location)  → Promise   hangar → space → atmosphere → clouds → down
 *   BridgeCine.ascend(location)  → Promise   clouds → atmosphere → space → into the hangar bay
 *
 * Drawn like the world: into a small native-resolution buffer (about 480
 * native px across) scaled to the screen by a whole number, so the
 * Blender-rendered sprites (assets/cine/, made by tools/bridge-art/
 * cine_sprites.py) keep their pixels. Sprites carry anchor points (engine
 * exhausts, the hangar bay) in assets/cine/cine.json; flames, plasma,
 * clouds and the planets (BridgeOrbit) are drawn live.
 *
 * Click, tap, Space or Esc skips to the end.
 */
var BridgeCine = (function () {
  var meta = null, imgs = {}, ready = null;
  var canvas = null, ctx = null, buf = null, bctx = null;

  function load() {
    if (ready) return ready;
    ready = fetch('/bridge/assets/cine/cine.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (m) {
      meta = m;
      return Promise.all(Object.keys(m).map(function (name) {
        return new Promise(function (res) {
          var im = new Image();
          im.onload = function () { imgs[name] = im; res(); };
          im.onerror = function () { res(); };
          im.src = '/bridge/assets/cine/' + name + '.png?v=' + (m[name].rev || Date.now());
        });
      }));
    }).catch(function () { meta = {}; });
    return ready;
  }

  function setup() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'cine-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:60;display:none;' +
                           'image-rendering:pixelated;background:#000;cursor:pointer;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    buf = document.createElement('canvas');
    bctx = buf.getContext('2d');
  }

  // ---- drawing helpers ----------------------------------------------------------
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function stars(b, W, H, now, vx, vy, n, seed) {
    for (var i = 0; i < n; i++) {
      var z = 0.3 + hash(i + seed) * 0.7;
      var x = ((hash(i * 3 + seed) * W + now * vx * z) % W + W) % W;
      var y = ((hash(i * 7 + seed) * H + now * vy * z) % H + H) % H;
      var a = z * (0.7 + 0.3 * Math.sin(now / 500 + i));
      b.fillStyle = 'rgba(225,232,255,' + a.toFixed(2) + ')';
      var streak = Math.min(12, Math.abs(vy) * 600 * z);
      b.fillRect(Math.round(x), Math.round(y), 1, Math.max(1, Math.round(streak)));
    }
  }

  function sprite(b, name, x, y, alpha) {
    var im = imgs[name];
    if (!im) return;
    if (alpha !== undefined && alpha < 1) { b.save(); b.globalAlpha = Math.max(0, alpha); }
    b.drawImage(im, Math.round(x), Math.round(y));
    if (alpha !== undefined && alpha < 1) b.restore();
  }

  function anchor(name, key) {
    var a = meta && meta[name] && meta[name].anchors[key];
    return a || [0, 0];
  }

  // Engine flame streaming back from an exhaust: a hot core, a coloured
  // plume, flickering. dir: unit vector the flame points along.
  function flame(b, x, y, len, dirx, diry, now, col, width) {
    width = width || 3;
    b.save();
    b.globalCompositeOperation = 'lighter';
    var f = 0.8 + Math.sin(now / 37) * 0.12 + Math.sin(now / 13) * 0.08;
    var L = len * f;
    var g = b.createLinearGradient(x, y, x + dirx * L, y + diry * L);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.18, col[0]);
    g.addColorStop(1, col[1]);
    b.fillStyle = g;
    var nx = -diry, ny = dirx;
    b.beginPath();
    b.moveTo(x + nx * width, y + ny * width);
    b.lineTo(x + dirx * L, y + diry * L);
    b.lineTo(x - nx * width, y - ny * width);
    b.closePath();
    b.fill();
    var h = b.createRadialGradient(x, y, 0, x, y, width * 3);
    h.addColorStop(0, 'rgba(180,230,255,0.6)');
    h.addColorStop(1, 'rgba(180,230,255,0)');
    b.fillStyle = h;
    b.fillRect(x - width * 3, y - width * 3, width * 6, width * 6);
    b.restore();
  }

  var BLUE = ['rgba(150,140,255,0.95)', 'rgba(70,220,210,0)'];
  var HOT = ['rgba(255,200,120,0.95)', 'rgba(255,90,40,0)'];

  // Per-place skies for the descent and the climb.
  var SKY = {
    lumar: { top: '#050c1a', mid: '#12304a', low: '#2c5a6c', glow: [110, 210, 210], cloud: ['#7a92aa', '#4a5e76'],
             moon: true,
             cloudLit: '#b4c8da',
             ground: 'sea' },
    arcadia: { top: '#0a0514', mid: '#2a1240', low: '#8a2a6a', glow: [220, 100, 230], cloud: ['#5a3a6e', '#3a2450'],
               cloudLit: '#a06090',
               ground: 'city' }
  };

  function skyOf(loc) { return SKY[loc] || SKY.lumar; }

  function gradient(b, W, H, stops) {
    var g = b.createLinearGradient(0, 0, 0, H);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);
  }

  // Cloud banks: flattened puffs in three tones (shadowed underside, body,
  // moonlit top), plus thin wisps that sell the speed.
  function clouds(b, W, H, offset, layer, sky) {
    var n = layer === 0 ? 8 : 5;
    var size = layer === 0 ? 14 : 30;
    var span = H + size * 4;
    var tones = [sky.cloud[1], sky.cloud[0], sky.cloudLit || sky.cloud[0]];
    for (var i = 0; i < n; i++) {
      var seed = i * 13 + layer * 101;
      var cx = hash(seed) * (W + size * 3) - size * 1.5;
      var cy = ((hash(seed + 1) * span + offset * (layer === 0 ? 0.6 : 1.4)) % span + span) % span - size * 2;
      var puffs = 9 + Math.floor(hash(seed + 2) * 5);
      for (var pass = 0; pass < 3; pass++) {
        b.fillStyle = tones[pass];
        for (var p = 0; p < puffs; p++) {
          var px = cx + (hash(seed + p * 3) - 0.5) * size * 3.4;
          var py = cy + (hash(seed + p * 5) - 0.5) * size * 0.5;
          var r = size * (0.35 + hash(seed + p * 7) * 0.45) * (1 - Math.abs(px - cx) / (size * 3));
          if (r < 2) continue;
          var shrink = [1, 0.84, 0.5][pass], lift = [0.22, 0, -0.28][pass];
          b.beginPath();
          b.ellipse(Math.round(px - (pass === 2 ? r * 0.2 : 0)), Math.round(py + r * lift), Math.round(r * shrink * 1.25),
                    Math.max(1, Math.round(r * shrink * 0.62)), 0, 0, Math.PI * 2);
          b.fill();
        }
      }
    }
    if (layer === 1) {          // thin streamers of mist rushing past
      b.fillStyle = tones[2];
      for (var w = 0; w < 10; w++) {
        var wx = hash(w * 17) * W;
        var wy = ((hash(w * 19) * H + offset * 2.4) % H + H) % H;
        b.globalAlpha = 0.18;
        b.beginPath();
        b.ellipse(Math.round(wx), Math.round(wy), 18 + hash(w * 23) * 30, 1.5, 0, 0, Math.PI * 2);
        b.fill();
        b.globalAlpha = 1;
      }
    }
  }

  // The ground rising into view under the clouds: the moonlit sea with its
  // islands and the lighthouse sweeping, or the city — towers, lit windows,
  // neon, streams of air traffic.
  function ground(b, W, H, top, now, sky) {
    if (top >= H) return;
    var T = Math.round(top);
    if (sky.ground === 'sea') {
      var g = b.createLinearGradient(0, T, 0, H);
      g.addColorStop(0, '#1a3a4a'); g.addColorStop(1, '#081822');
      b.fillStyle = g;
      b.fillRect(0, T, W, H - T);
      b.fillStyle = 'rgba(180,220,230,0.35)';                    // the moon's path on the water
      for (var m = 0; m < 26; m++) {
        var my = T + hash(m * 5) * (H - T);
        var mw = 2 + hash(m * 7) * 10 * (1 - (my - T) / (H - T) * 0.5);
        b.fillRect(Math.round(W * 0.3 + (hash(m * 3) - 0.5) * 30 + Math.sin(now / 400 + m) * 3), Math.round(my), Math.round(mw), 1);
      }
      for (var i = 0; i < 70; i++) {                           // wave glints
        var y = T + hash(i) * (H - T);
        var x = (hash(i * 3) * W + now * 0.01 * (1 + hash(i * 5))) % W;
        b.fillStyle = 'rgba(160,200,220,' + (0.15 + 0.25 * hash(i * 7)).toFixed(2) + ')';
        b.fillRect(Math.round(x), Math.round(y), 2 + Math.round(hash(i * 9) * 4), 1);
      }
      for (var k = 0; k < 5; k++) {                            // islands, each with a light or two
        var ix = hash(k * 11) * W, iy = T + 8 + hash(k * 13) * (H - T - 10);
        var iw = 12 + hash(k * 17) * 22;
        b.fillStyle = '#0e1e1a';
        b.beginPath(); b.ellipse(Math.round(ix), Math.round(iy), iw, 3 + iw * 0.12, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#5a5440';
        b.beginPath(); b.ellipse(Math.round(ix), Math.round(iy), iw * 0.92, 2.5 + iw * 0.1, 0, 0, Math.PI * 2); b.fill();
        b.fillStyle = '#1e3a2a';
        b.beginPath(); b.ellipse(Math.round(ix), Math.round(iy) - 1, iw * 0.7, 2 + iw * 0.08, 0, Math.PI, Math.PI * 2); b.fill();
        for (var tr = 0; tr < 4; tr++) {
          b.fillStyle = '#16301e';
          b.fillRect(Math.round(ix - iw * 0.5 + hash(k * 7 + tr) * iw), Math.round(iy) - 4, 2, 3);
        }
        b.fillStyle = 'rgba(255,200,120,0.95)';
        b.fillRect(Math.round(ix - iw * 0.2), Math.round(iy) - 1, 1, 1);
        if (k === 1) {                                          // the lighthouse beam
          var a = now / 900;
          b.save();
          b.globalCompositeOperation = 'lighter';
          b.fillStyle = 'rgba(255,240,180,0.18)';
          b.beginPath();
          b.moveTo(ix, iy - 4);
          b.lineTo(ix + Math.cos(a) * 120, iy - 4 + Math.sin(a) * 18 - 6);
          b.lineTo(ix + Math.cos(a + 0.12) * 120, iy - 4 + Math.sin(a + 0.12) * 18 + 6);
          b.closePath(); b.fill();
          b.restore();
          b.fillStyle = '#fff4c0';
          b.fillRect(Math.round(ix), Math.round(iy) - 5, 1, 2);
        }
      }
    } else {
      var cg = b.createLinearGradient(0, T, 0, H);
      cg.addColorStop(0, '#2a1036'); cg.addColorStop(1, '#0a0612');
      b.fillStyle = cg;
      b.fillRect(0, T, W, H - T);
      for (var j = 0; j < 46; j++) {                            // towers, near ones taller
        var tx = hash(j * 3) * W, tw = 6 + hash(j * 5) * 14;
        var th = 10 + hash(j * 7) * 40;
        var ty = T + 6 + hash(j * 9) * (H - T) * 0.6;
        b.fillStyle = '#120a1c';
        b.fillRect(Math.round(tx), Math.round(ty - th), Math.round(tw), Math.round(th + H));
        for (var wy = 0; wy < th; wy += 3) {
          for (var wx = 1; wx < tw - 1; wx += 3) {
            if (hash(j * 31 + wy * 7 + wx) > 0.72) {
              b.fillStyle = hash(j + wy) > 0.85 ? 'rgba(96,220,255,0.85)' : 'rgba(255,190,110,0.8)';
              b.fillRect(Math.round(tx + wx), Math.round(ty - th + wy), 1, 1);
            }
          }
        }
        if (hash(j * 13) > 0.7) {                                // a neon sign
          b.fillStyle = hash(j * 17) > 0.5 ? 'rgba(255,90,200,0.9)' : 'rgba(80,230,255,0.9)';
          b.fillRect(Math.round(tx + 1), Math.round(ty - th * 0.6), Math.max(2, Math.round(tw * 0.5)), 2);
        }
      }
      for (var f = 0; f < 22; f++) {                             // air traffic streaming between the towers
        var lane = T + 4 + (f % 4) * 9;
        var fx = ((hash(f) * W + now * (0.03 + hash(f * 2) * 0.05) * (f % 2 ? 1 : -1)) % W + W) % W;
        b.fillStyle = f % 2 ? 'rgba(255,240,200,0.9)' : 'rgba(255,80,80,0.9)';
        b.fillRect(Math.round(fx), Math.round(lane), 2, 1);
      }
    }
  }

  function skyGlow(b, W, H, sky, now) {
    b.save();
    b.globalCompositeOperation = 'lighter';
    if (sky.moon) {
      var mx = W * 0.78, my = H * 0.16;
      var g = b.createRadialGradient(mx, my, 0, mx, my, H * 0.4);
      g.addColorStop(0, 'rgba(200,220,255,0.35)');
      g.addColorStop(1, 'rgba(200,220,255,0)');
      b.fillStyle = g;
      b.fillRect(0, 0, W, H);
      b.fillStyle = '#e8ecf4';
      b.beginPath(); b.arc(mx, my, 7, 0, Math.PI * 2); b.fill();
      b.globalCompositeOperation = 'source-over';
      b.fillStyle = 'rgba(150,160,190,0.55)';
      [[-2, -2, 2], [2, 1, 1.5], [-1, 3, 1], [3, -3, 1]].forEach(function (c) {
        b.beginPath(); b.arc(mx + c[0], my + c[1], c[2], 0, Math.PI * 2); b.fill();
      });
      b.fillStyle = 'rgba(20,30,60,0.45)';
      b.beginPath(); b.arc(mx + 3, my - 1, 7, -1.2, 1.9); b.fill();
    } else {
      var hg = b.createLinearGradient(0, H * 0.5, 0, H);
      hg.addColorStop(0, 'rgba(255,80,200,0)');
      hg.addColorStop(1, 'rgba(255,80,200,0.25)');
      b.fillStyle = hg;
      b.fillRect(0, 0, W, H);
    }
    b.restore();
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }

  // A nebula for each place, made once per size: value-noise clouds in two
  // colours over black, drawn at half resolution and scaled up.
  var nebCache = {};
  var NEB = { lumar: [[30, 110, 120], [40, 50, 120]], arcadia: [[140, 40, 150], [40, 30, 110]],
              enigma: [[40, 70, 140], [90, 40, 120]], singularity: [[150, 70, 40], [80, 30, 90]],
              'deep-space': [[90, 50, 160], [30, 110, 150]] };
  function nebula(loc, W, H) {
    var key = loc + W + 'x' + H;
    if (nebCache[key]) return nebCache[key];
    var w = Math.ceil(W / 2), h = Math.ceil(H / 2);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var cx = c.getContext('2d'), img = cx.createImageData(w, h), d = img.data;
    var cols = NEB[loc] || NEB['deep-space'];
    function vn(x, y, sd) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      function hh(i, j) { return hash(i * 57 + j * 131 + sd * 977); }
      return hh(xi, yi) * (1 - u) * (1 - v) + hh(xi + 1, yi) * u * (1 - v) + hh(xi, yi + 1) * (1 - u) * v + hh(xi + 1, yi + 1) * u * v;
    }
    function fbm(x, y, sd) { var a = 0, amp = 0.5, f = 1; for (var o = 0; o < 5; o++) { a += vn(x * f, y * f, sd + o) * amp; amp *= 0.5; f *= 2.1; } return a; }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var n1 = Math.max(0, fbm(x / 48, y / 48, 3) - 0.42) * 2.2;
        var n2 = Math.max(0, fbm(x / 36 + 9, y / 36, 7) - 0.48) * 2.4;
        var dust = Math.max(0, fbm(x / 14, y / 14, 11) - 0.55) * 1.4;
        var o = (y * w + x) * 4;
        var dim = 1 - dust * 0.7;
        d[o] = (cols[0][0] * n1 + cols[1][0] * n2) * 0.55 * dim;
        d[o + 1] = (cols[0][1] * n1 + cols[1][1] * n2) * 0.55 * dim;
        d[o + 2] = (cols[0][2] * n1 + cols[1][2] * n2) * 0.55 * dim;
        d[o + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    nebCache[key] = c;
    return c;
  }

  var STAR_COL = ['225,232,255', '255,226,200', '200,220,255', '255,200,230', '210,255,240'];
  function richStars(b, W, H, now, vx, seed) {
    for (var i = 0; i < 220; i++) {
      var z = 0.25 + hash(i + seed) * 0.75;
      var x = ((hash(i * 3 + seed) * W + now * vx * z) % W + W) % W;
      var y = hash(i * 7 + seed) * H;
      var tw = 0.65 + 0.35 * Math.sin(now / (300 + hash(i) * 500) + i);
      var col = STAR_COL[i % STAR_COL.length];
      b.fillStyle = 'rgba(' + col + ',' + (z * tw).toFixed(2) + ')';
      var big = hash(i * 11 + seed) > 0.975;
      b.fillRect(Math.round(x), Math.round(y), big ? 2 : 1, big ? 2 : 1);
      if (big) {               // a little cross flare on the bright ones
        b.fillStyle = 'rgba(' + col + ',' + (0.35 * tw).toFixed(2) + ')';
        b.fillRect(Math.round(x) - 2, Math.round(y), 6, 1);
        b.fillRect(Math.round(x), Math.round(y) - 2, 1, 6);
      }
    }
  }

  function sunFlare(b, W, H, now) {
    var sx = W * 0.08, sy = H * 0.1;
    b.save();
    b.globalCompositeOperation = 'lighter';
    var g = b.createRadialGradient(sx, sy, 0, sx, sy, H * 0.5);
    g.addColorStop(0, 'rgba(255,244,220,0.85)');
    g.addColorStop(0.08, 'rgba(255,220,170,0.35)');
    g.addColorStop(1, 'rgba(255,200,150,0)');
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);
    b.restore();
  }

  function spaceShot(b, W, H, now, loc) {
    b.fillStyle = '#020208';
    b.fillRect(0, 0, W, H);
    b.drawImage(nebula(loc, W, H), 0, 0, W, H);
    richStars(b, W, H, now, -0.003, 7);
    var kind = BridgeOrbit.kindOf(loc);
    if (kind === 'ocean' || kind === 'city' || kind === 'gas') {
      var R = Math.round(H * 0.95);
      BridgeOrbit.drawPlanet(b, kind, W * 0.82, H * 0.62 + R, R, now);
    } else if (kind === 'hole') {
      BridgeOrbit.drawHole(b, W * 0.8, H * 0.78, Math.round(H * 0.12), now);
    }
    if (loc === 'enigma') BridgeOrbit.drawStation(b, W * 0.82, H * 0.7, 4, now);
    sunFlare(b, W, H, now);
  }

  function msPos(W, H, now) {
    var m = meta.mothership;
    return [Math.round(W * 0.06 + Math.sin(now / 4000) * 2), Math.round(H * 0.16 + Math.sin(now / 3100) * 1.5), m];
  }

  var AETHER = ['rgba(150,140,255,0.95)', 'rgba(70,220,210,0)'];

  function drawMothership(b, W, H, now) {
    var p = msPos(W, H, now), m = p[2];
    for (var i = 0; i < 2; i++) {
      var a = m.anchors['exhaust_' + i];
      if (a) flame(b, p[0] + a[0], p[1] + a[1], 16 + i * 3, -1, 0, now + i * 50, AETHER, 5);
    }
    sprite(b, 'mothership', p[0], p[1]);
    b.save();
    b.globalCompositeOperation = 'lighter';
    var n = m.anchors.nose;
    if (n && Math.floor(now / 700) % 3 === 0) {
      b.fillStyle = 'rgba(255,255,255,0.9)';
      b.fillRect(Math.round(p[0] + n[0]), Math.round(p[1] + n[1]), 2, 2);
    }
    b.restore();
    return p;
  }

  // ---- the shots -------------------------------------------------------------------
  function launchShots(loc) {
    var sky = skyOf(loc);
    var kind = BridgeOrbit.kindOf(loc);
    var shots = [];
    // 1 · out of the hangar bay, away toward the world below
    shots.push({ dur: 2600, draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, loc);
      var p = msPos(W, H, now), m = p[2], bay = m.anchors.bay;
      var s = meta.shuttle, sd = meta['shuttle-down'];
      var bx = p[0] + bay[0] - s.w * 0.4, by = p[1] + bay[1] - s.h * 0.5;
      if (t < 0.28) {
        // easing out of the bay: drawn first so the hull hides the part still inside
        var u = ease(t / 0.28);
        sprite(b, 'shuttle', bx, by + u * s.h * 0.9);
        drawMothership(b, W, H, now);
      } else {
        drawMothership(b, W, H, now);
        var v = easeIn((t - 0.28) / 0.72);
        var x = bx + v * W * 0.75, y = by + s.h * 0.9 + v * H * 0.55;
        var name = t < 0.4 ? 'shuttle' : 'shuttle-down';
        var sp = meta[name];
        var en = sp.anchors.exhaust_near, ef = sp.anchors.exhaust_far;
        var len = 6 + v * 22;
        flame(b, x + ef[0], y + ef[1], len, -0.9, name === 'shuttle' ? 0 : -0.3, now, BLUE, 2);
        sprite(b, name, x, y);
        flame(b, x + en[0], y + en[1], len, -0.9, name === 'shuttle' ? 0 : -0.3, now + 17, BLUE, 2);
      }
    } });
    if (kind === 'ocean' || kind === 'city') {
      // 2 · entry: plasma round the nose, the sky thickening
      shots.push({ dur: 1700, draw: function (b, W, H, t, now) {
        var g = sky.glow;
        gradient(b, W, H, [[0, '#020208'], [0.55, sky.top], [1, 'rgba(' + g[0] + ',' + g[1] + ',' + g[2] + ',1)']]);
        richStars(b, W, H * 0.55, now, -0.002, 3);
        var sd = meta['shuttle-down'];
        var jx = (hash(Math.floor(now / 40)) - 0.5) * 2, jy = (hash(Math.floor(now / 40) + 9) - 0.5) * 2;
        var x = W / 2 - sd.w / 2 + jx, y = H * 0.42 - sd.h / 2 + jy;
        var heat = Math.sin(Math.PI * Math.min(1, t * 1.15));
        b.save();
        b.globalCompositeOperation = 'lighter';
        for (var i = 0; i < 46; i++) {      // streaks of burning air, streaming up and back past the dive
          var sx = ((hash(i) * W * 1.3 - now * 0.22) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
          var sy = ((hash(i * 3) * H - now * 0.4) % H + H) % H;
          var len = 5 + Math.round(hash(i * 7) * 12);
          b.fillStyle = 'rgba(255,' + (150 + Math.round(hash(i * 5) * 80)) + ',90,' + (0.4 * heat).toFixed(2) + ')';
          for (var q = 0; q < len; q++) b.fillRect(Math.round(sx - q * 0.55), Math.round(sy - q), 1, 1);
        }
        var nose = sd.anchors.nose, belly = sd.anchors.belly;
        var pg = b.createRadialGradient(x + belly[0], y + belly[1] + 4, 0, x + belly[0], y + belly[1] + 4, 46);
        pg.addColorStop(0, 'rgba(255,240,200,' + (0.9 * heat).toFixed(2) + ')');
        pg.addColorStop(0.35, 'rgba(255,140,60,' + (0.55 * heat).toFixed(2) + ')');
        pg.addColorStop(1, 'rgba(255,60,120,0)');
        b.fillStyle = pg;
        b.fillRect(x - 40, y - 30, sd.w + 80, sd.h + 80);
        b.restore();
        sprite(b, 'shuttle-down', x, y);
        b.save();
        b.globalCompositeOperation = 'lighter';
        b.fillStyle = 'rgba(255,150,80,' + (0.5 * heat).toFixed(2) + ')';
        b.beginPath();
        b.ellipse(x + nose[0] - 2, y + nose[1] + 2, 6, 4, 0.5, 0, Math.PI * 2);
        b.fill();
        b.save();                                    // the bow shock: a hot cap of light ahead of the nose
        b.translate(x + nose[0] - 6, y + nose[1] + 4);
        b.rotate(0.5);
        b.scale(1, 0.5);
        var bs = b.createRadialGradient(4, 0, 0, 4, 0, 26);
        bs.addColorStop(0, 'rgba(255,250,230,' + (0.8 * heat).toFixed(2) + ')');
        bs.addColorStop(0.4, 'rgba(255,170,90,' + (0.45 * heat).toFixed(2) + ')');
        bs.addColorStop(1, 'rgba(255,90,60,0)');
        b.fillStyle = bs;
        b.fillRect(-30, -30, 60, 60);
        b.restore();
        for (var e = 0; e < 18; e++) {             // embers peeling off the hull
          var et = ((now / 600) + e / 18) % 1;
          b.fillStyle = 'rgba(255,' + (180 + Math.round(hash(e) * 60)) + ',100,' + ((1 - et) * heat).toFixed(2) + ')';
          b.fillRect(Math.round(x + belly[0] - et * 60 - hash(e * 3) * 20), Math.round(y + belly[1] - et * 50 + hash(e * 5) * 10), 1, 1);
        }
        b.restore();
      } });
      // 3 · down through the clouds, levelling out, the ground coming up
      shots.push({ dur: 2300, draw: function (b, W, H, t, now) {
        gradient(b, W, H, [[0, sky.top], [0.6, sky.mid], [1, sky.low]]);
        skyGlow(b, W, H, sky, now);
        var groundTop = H - easeOut(Math.max(0, (t - 0.25) / 0.75)) * H * 0.45;
        ground(b, W, H, groundTop, now, sky);
        var speed = (1 - easeOut(t)) * 2.4 + 0.3;
        var off = -now * 0.08 * speed;
        b.globalAlpha = 0.5;
        clouds(b, W, H, off * 0.35, 0, sky);
        b.globalAlpha = 1;
        clouds(b, W, H, off * 0.6 + 40, 0, sky);
        var name = t < 0.5 ? 'shuttle-down' : 'shuttle';
        var sp = meta[name];
        var x = W / 2 - sp.w / 2, y = H * 0.4 - sp.h / 2 + Math.sin(now / 300);
        var en = sp.anchors.exhaust_near, ef = sp.anchors.exhaust_far;
        var thr = 4 + (t > 0.5 ? 10 : 2);
        flame(b, x + ef[0], y + ef[1], thr, -1, name === 'shuttle' ? 0 : -0.3, now, BLUE, 2);
        sprite(b, name, x, y);
        flame(b, x + en[0], y + en[1], thr, -1, name === 'shuttle' ? 0 : -0.3, now + 21, BLUE, 2);
        clouds(b, W, H, off * 1.2, 1, sky);
      } });
    } else {
      // stations and the void: a straight approach, docking lights blinking
      shots.push({ dur: 2600, draw: function (b, W, H, t, now) {
        b.fillStyle = '#03030a';
        b.fillRect(0, 0, W, H);
        stars(b, W, H, now, -0.02, 0, 140, 11);
        if (kind === 'hole') BridgeOrbit.drawHole(b, W * 0.62, H * 0.42, Math.round(H * (0.12 + t * 0.1)), now);
        else BridgeOrbit.drawStation(b, W * 0.66, H * 0.42, Math.round(4 + t * 9), now);
        var s = meta.shuttle;
        var x = W * 0.18 + ease(t) * W * 0.22, y = H * 0.6 - ease(t) * H * 0.12;
        flame(b, x + s.anchors.exhaust_far[0], y + s.anchors.exhaust_far[1], 8, -1, 0, now, BLUE, 2);
        sprite(b, 'shuttle', x, y);
        flame(b, x + s.anchors.exhaust_near[0], y + s.anchors.exhaust_near[1], 8, -1, 0, now + 21, BLUE, 2);
      } });
    }
    return shots;
  }

  function ascendShots(loc) {
    var sky = skyOf(loc);
    var kind = BridgeOrbit.kindOf(loc);
    var shots = [];
    if (kind === 'ocean' || kind === 'city') {
      // 1 · climbing out through the clouds, the ground falling away
      shots.push({ dur: 2000, draw: function (b, W, H, t, now) {
        gradient(b, W, H, [[0, sky.top], [0.6, sky.mid], [1, sky.low]]);
        skyGlow(b, W, H, sky, now);
        ground(b, W, H, H * 0.58 + easeIn(t) * H * 0.5, now, sky);
        var off = now * 0.08 * (0.6 + t * 2);
        clouds(b, W, H, off * 0.6, 0, sky);
        var su = meta['shuttle-up'];
        var x = W / 2 - su.w / 2, y = H * 0.5 - su.h / 2 - easeIn(t) * H * 0.15;
        var en = su.anchors.exhaust_near, ef = su.anchors.exhaust_far;
        flame(b, x + ef[0], y + ef[1], 16 + t * 10, -0.85, 0.5, now, BLUE, 2);
        sprite(b, 'shuttle-up', x, y);
        flame(b, x + en[0], y + en[1], 16 + t * 10, -0.85, 0.5, now + 21, BLUE, 2);
        clouds(b, W, H, off * 1.2, 1, sky);
      } });
      // 2 · out of the air: the glow sinking away, the stars coming out
      shots.push({ dur: 1300, draw: function (b, W, H, t, now) {
        var g = sky.glow, a = 1 - t;
        gradient(b, W, H, [[0, '#020208'], [0.6, sky.top], [1, 'rgba(' + g[0] + ',' + g[1] + ',' + g[2] + ',' + a.toFixed(2) + ')']]);
        stars(b, W, H, now, 0, 0.02 * (1 - t), Math.round(40 + t * 100), 5);
        var su = meta['shuttle-up'];
        var x = W / 2 - su.w / 2, y = H * 0.45 - su.h / 2;
        flame(b, x + su.anchors.exhaust_far[0], y + su.anchors.exhaust_far[1], 22, -0.85, 0.5, now, BLUE, 2);
        sprite(b, 'shuttle-up', x, y);
        flame(b, x + su.anchors.exhaust_near[0], y + su.anchors.exhaust_near[1], 22, -0.85, 0.5, now + 21, BLUE, 2);
      } });
    }
    // 3 · home: up from below and astern, overtaking along the hull, then
    // rising nose-first into the hangar bay
    shots.push({ dur: 3000, draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, loc);
      var p = msPos(W, H, now), m = p[2], bay = m.anchors.bay;
      var s = meta.shuttle;
      var tx = p[0] + bay[0] - s.w * 0.55, ty = p[1] + bay[1] - s.h * 0.45;
      var u = easeOut(Math.min(1, t / 0.7));
      var x = tx - (1 - u) * W * 0.55, y = ty + s.h * 0.9 + (1 - u) * H * 0.35;
      if (t > 0.72) {
        var v = ease((t - 0.72) / 0.28);
        y = ty + s.h * 0.9 * (1 - v);
        sprite(b, 'shuttle', x, y);          // rising into the bay: the hull hides it as it goes in
        drawMothership(b, W, H, now);
      } else {
        drawMothership(b, W, H, now);
        var thr = 4 + (1 - u) * 14;
        flame(b, x + s.anchors.exhaust_far[0], y + s.anchors.exhaust_far[1], thr, -1, 0, now, AETHER, 2);
        sprite(b, 'shuttle', x, y);
        flame(b, x + s.anchors.exhaust_near[0], y + s.anchors.exhaust_near[1], thr, -1, 0, now + 21, AETHER, 2);
      }
    } });
    return shots;
  }

  // ---- sailing between Lumar's docks -------------------------------------------------------
  var SEAS = {
    lumar: { sea: [14, 58, 48], glow: '144,224,168', name: "Diggen's Point", isle: '#0c1a16', light: '255,220,140', tower: true },
    'lumar-crimson': { sea: [52, 16, 24], glow: '255,96,112', name: 'Crimson Reach', isle: '#1a0a0e', light: '255,90,100' },
    'lumar-rose': { sea: [52, 24, 44], glow: '255,144,192', name: 'Rose Cove', isle: '#1a0c16', light: '255,150,200' },
    'lumar-sapphire': { sea: [16, 34, 62], glow: '112,160,255', name: 'Sapphire Port', isle: '#0a1020', light: '120,170,255' },
    'lumar-midnight': { sea: [12, 12, 30], glow: '160,128,255', name: 'Midnight Isle', isle: '#0c0a18', light: '170,140,255' }
  };

  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, f) { f = f || 1; return 'rgb(' + Math.round(c[0] * f) + ',' + Math.round(c[1] * f) + ',' + Math.round(c[2] * f) + ')'; }

  // One band of the sea: a wavy top edge scrolling left, filled down to the
  // bottom of the frame, a pale crest line along it.
  function waveBand(b, W, H, y0, amp, len, speed, phase, col, crest, now) {
    b.fillStyle = col;
    var prev = null;
    for (var x = 0; x < W; x += 2) {
      var y = y0 + amp * Math.sin((x + now * speed) / len + phase) + amp * 0.35 * Math.sin((x + now * speed * 1.7) / (len * 0.43) + phase * 2);
      y = Math.round(y);
      b.fillRect(x, y, 2, H - y);
      if (crest && prev !== null && y < prev) { b.fillStyle = crest; b.fillRect(x, y, 2, 1); b.fillStyle = col; }
      prev = y;
    }
  }

  function sailShots(from, to) {
    var A = SEAS[from] || SEAS.lumar, B = SEAS[to] || SEAS.lumar;
    function frame(b, W, H, t, now, arriving) {
      var k = arriving ? 1 : t * 0.6;                    // the sea slowly takes on the destination's colour
      var sea = mix(A.sea, B.sea, k);
      var horizon = Math.round(H * 0.5);
      gradient(b, W, H, [[0, '#03040c'], [0.5, rgb(sea, 0.55)], [1, rgb(sea, 0.3)]]);
      richStars(b, W, horizon, now, -0.0015, 21);
      // the moon and its glow
      var mx = W * 0.7, my = H * 0.17;
      b.save();
      b.globalCompositeOperation = 'lighter';
      var mg = b.createRadialGradient(mx, my, 0, mx, my, H * 0.45);
      mg.addColorStop(0, 'rgba(210,225,255,0.3)');
      mg.addColorStop(1, 'rgba(210,225,255,0)');
      b.fillStyle = mg;
      b.fillRect(0, 0, W, H);
      b.restore();
      b.fillStyle = '#eef0f6';
      b.beginPath(); b.arc(mx, my, 9, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(150,160,190,0.5)';
      [[-3, -2, 2], [2, 2, 2], [3, -3, 1.3]].forEach(function (c) { b.beginPath(); b.arc(mx + c[0], my + c[1], c[2], 0, Math.PI * 2); b.fill(); });
      // the islands we're leaving, drifting off behind; the destination rising ahead
      b.fillStyle = A.isle;
      var lx = W * 0.12 - now * 0.006 % W - t * 40;
      b.beginPath(); b.ellipse(lx, horizon + 1, 46, 9, 0, Math.PI, Math.PI * 2); b.fill();
      if (arriving) {
        var grow = easeOut(t);
        var ix = W * (0.95 - grow * 0.25), iw = 30 + grow * 70, ih = 6 + grow * 18;
        b.save();
        b.globalCompositeOperation = 'lighter';
        var ig = b.createRadialGradient(ix, horizon - ih * 0.5, 0, ix, horizon - ih * 0.5, iw * 1.1);
        ig.addColorStop(0, 'rgba(' + B.light + ',0.3)');
        ig.addColorStop(1, 'rgba(' + B.light + ',0)');
        b.fillStyle = ig;
        b.fillRect(ix - iw * 1.2, horizon - iw * 1.2, iw * 2.4, iw * 1.2);
        b.restore();
        // the island's silhouette: a rugged ridge, crystal spires or the lighthouse
        b.fillStyle = B.isle;
        b.beginPath();
        b.moveTo(ix - iw, horizon + 1);
        for (var sx2 = -1; sx2 <= 1.001; sx2 += 0.1) {
          var hgt = Math.sqrt(Math.max(0, 1 - sx2 * sx2)) * ih * (0.75 + 0.35 * hash(Math.round(sx2 * 10) + 31));
          b.lineTo(ix + sx2 * iw, horizon + 1 - hgt);
        }
        b.lineTo(ix + iw, horizon + 1);
        b.closePath();
        b.fill();
        if (B.tower) {
          b.fillRect(Math.round(ix + iw * 0.3), Math.round(horizon - ih * 1.9), 3, Math.round(ih));
          b.fillStyle = '#fff4c0';
          b.fillRect(Math.round(ix + iw * 0.3), Math.round(horizon - ih * 1.95), 3, 2);
        } else {
          for (var cs = 0; cs < 4; cs++) {               // crystal spires catching the light
            var cxs = ix + (hash(cs * 9) - 0.5) * iw * 1.1, ch = ih * (0.6 + hash(cs * 5) * 0.7);
            var cb = horizon + 1 - Math.sqrt(Math.max(0, 1 - Math.pow((cxs - ix) / iw, 2))) * ih * 0.8;
            b.fillStyle = 'rgba(' + B.light + ',0.9)';
            b.beginPath(); b.moveTo(cxs - 2, cb); b.lineTo(cxs, cb - ch); b.lineTo(cxs + 2, cb); b.closePath(); b.fill();
          }
        }
        b.save();
        b.globalCompositeOperation = 'lighter';
        for (var c = 0; c < 6; c++) {
          b.fillStyle = 'rgba(' + B.light + ',0.95)';
          b.fillRect(Math.round(ix - iw * 0.6 + hash(c * 7) * iw * 1.2), Math.round(horizon - 2 - hash(c * 3) * ih * 0.5), 1, 1);
        }
        if (B.tower) {                                   // the lighthouse beam sweeping the water
          var a = now / 700;
          b.fillStyle = 'rgba(255,240,180,0.16)';
          b.beginPath();
          b.moveTo(ix + iw * 0.3, horizon - ih);
          b.lineTo(ix + iw * 0.3 + Math.cos(a) * 200, horizon - ih + Math.sin(a) * 20 - 6);
          b.lineTo(ix + iw * 0.3 + Math.cos(a + 0.1) * 200, horizon - ih + Math.sin(a + 0.1) * 20 + 6);
          b.closePath(); b.fill();
        }
        b.restore();
      }
      // far bands of sea, the moon's path, then the ship, then the near swell over its hull
      var bands = 6;
      for (var i = 0; i < 3; i++) {
        var f = i / bands;
        waveBand(b, W, H, horizon + 2 + i * 7, 1 + i, 22 + i * 6, 0.02 + i * 0.012, i * 1.7, rgb(sea, 1.55 - f * 1.2),
                 'rgba(210,235,235,0.35)', now);
      }
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var m = 0; m < 30; m++) {
        var py = horizon + 4 + hash(m * 5) * (H - horizon - 4);
        var pw = 2 + hash(m * 7) * 12 * ((py - horizon) / (H - horizon) + 0.3);
        b.fillStyle = 'rgba(210,225,255,0.42)';
        b.fillRect(Math.round(mx - pw / 2 + Math.sin(now / 300 + m) * 4), Math.round(py), Math.round(pw), 1);
      }
      b.restore();
      var g = meta.galleon;
      var wl = g.anchors.waterline, bow = g.anchors.bow, stern = g.anchors.stern;
      var sx = Math.round(W * 0.42 - wl[0] + Math.sin(now / 2600) * 6);
      var swy = Math.round(H * 0.72 + Math.sin(now / 480) * 2);
      var sy = swy - wl[1];
      sprite(b, 'galleon', sx, sy);
      // wake: glowing spores churned up astern, spray off the bow
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var w = 0; w < 40; w++) {
        var wt = ((now / 1400) + w / 40) % 1;
        var wx = sx + stern[0] - wt * W * 0.5 - hash(w) * 10;
        var wy = swy - 2 + (hash(w * 3) - 0.5) * (4 + wt * 16);
        b.fillStyle = 'rgba(' + B.glow + ',' + ((1 - wt) * 0.7).toFixed(2) + ')';
        b.fillRect(Math.round(wx), Math.round(wy), 2, 1);
      }
      for (var sp = 0; sp < 14; sp++) {
        var st = ((now / 500) + sp / 14) % 1;
        b.fillStyle = 'rgba(230,245,255,' + ((1 - st) * 0.8).toFixed(2) + ')';
        b.fillRect(Math.round(sx + bow[0] - st * 10 + hash(sp) * 4), Math.round(swy - 3 - Math.sin(st * Math.PI) * 8), 1, 1);
      }
      b.restore();
      for (var j = 3; j < bands; j++) {
        var ff = j / bands;
        waveBand(b, W, H, swy - 2 + (j - 3) * 9, 2 + j * 0.8, 26 + j * 8, 0.03 + j * 0.016, j * 1.3, rgb(sea, 1.15 - ff * 0.55),
                 'rgba(220,245,245,0.45)', now);
      }
      // spores glowing in the water and drifting up from it
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var q = 0; q < 50; q++) {
        var qx = ((hash(q) * W - now * 0.02 * (0.5 + hash(q * 2))) % W + W) % W;
        var qy = horizon + 6 + hash(q * 3) * (H - horizon - 6) - ((now / 3000 + hash(q * 5)) % 1) * 6;
        b.fillStyle = 'rgba(' + B.glow + ',' + (0.25 + 0.4 * Math.abs(Math.sin(now / 400 + q))).toFixed(2) + ')';
        b.fillRect(Math.round(qx), Math.round(qy), 1, 1);
      }
      b.restore();
    }
    return [
      { dur: 3200, draw: function (b, W, H, t, now) { frame(b, W, H, t, now, false); } },
      { dur: 2600, draw: function (b, W, H, t, now) { frame(b, W, H, t, now, true); } }
    ];
  }

  function sail(from, to, opts) {
    return play(function () { return sailShots(from, to); }, opts);
  }

  // ---- player ---------------------------------------------------------------------
  function play(makeShots, opts) {
    setup();
    return load().then(function () {
      if (!meta || !meta.shuttle || !meta.galleon || typeof BridgeOrbit === 'undefined') return;
      var shots = makeShots();
      return new Promise(function (resolve) {
        var total = shots.reduce(function (a, s) { return a + s.dur; }, 0);
        var start = performance.now(), done = false;
        if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
        canvas.style.display = 'block';
        var prompt = document.getElementById('interact-prompt');
        if (prompt) prompt.classList.remove('visible');
        function finish() {
          if (done) return;
          done = true;
          window.removeEventListener('keydown', onKey, true);
          canvas.removeEventListener('pointerdown', finish);
          resolve();
          // hold the last frame a moment while the next scene loads behind it
          setTimeout(function () { canvas.style.display = 'none'; }, opts && opts.hold || 0);
        }
        function onKey(e) {
          if (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(); }
        }
        window.addEventListener('keydown', onKey, true);
        canvas.addEventListener('pointerdown', finish);
        function frame() {
          if (done) return;
          var now = performance.now();
          var el = now - start;
          if (el >= total) { finish(); return; }
          var dpr = window.devicePixelRatio || 1;
          var sw = Math.round(window.innerWidth * dpr), sh = Math.round(window.innerHeight * dpr);
          var zoom = Math.max(1, Math.round(sw / 480));
          var W = Math.ceil(sw / zoom), H = Math.ceil(sh / zoom);
          if (canvas.width !== sw || canvas.height !== sh) { canvas.width = sw; canvas.height = sh; }
          if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
          var acc = 0, i = 0;
          while (i < shots.length - 1 && el >= acc + shots[i].dur) { acc += shots[i].dur; i++; }
          var t = Math.min(1, (el - acc) / shots[i].dur);
          bctx.setTransform(1, 0, 0, 1, 0, 0);
          bctx.globalAlpha = 1;
          bctx.globalCompositeOperation = 'source-over';
          bctx.imageSmoothingEnabled = false;
          bctx.clearRect(0, 0, W, H);
          shots[i].draw(bctx, W, H, t, now);
          // cuts dip through black; the very start and end fade too
          var edge = Math.min(el - acc, acc + shots[i].dur - el);
          var fade = Math.max(0, 1 - edge / 220);
          if (fade > 0) {
            bctx.fillStyle = 'rgba(0,0,0,' + fade.toFixed(2) + ')';
            bctx.fillRect(0, 0, W, H);
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(buf, 0, 0, W * zoom, H * zoom);
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    });
  }

  function launch(loc, opts) { return play(function () { return launchShots(loc); }, opts); }
  function ascend(loc, opts) { return play(function () { return ascendShots(loc); }, opts); }

  function has(name) { return !!(meta && meta[name] && imgs[name]); }

  return { launch: launch, ascend: ascend, sail: sail, load: load, has: has };
})();
