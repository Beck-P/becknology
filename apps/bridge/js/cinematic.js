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

  function gradient(b, W, H, stops) {
    var g = b.createLinearGradient(0, 0, 0, H);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    b.fillStyle = g;
    b.fillRect(0, 0, W, H);
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
    var shots = [];
    // out of the hangar bay, away toward the world below; then the world's own approach (approachShot)
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
    var last = approachShot(loc);
    if (last) shots.push(last);
    return shots;
  }

  // ---- the last approach, different on every world: ends where the skiff
  // then appears on its landing site ---------------------------------------------------------
  function skiff(b, name, x, y, now, thrust, down) {
    var sp = meta[name];
    var en = sp.anchors.exhaust_near, ef = sp.anchors.exhaust_far;
    flame(b, x + ef[0], y + ef[1], thrust, -1, name === 'shuttle-up' ? 0.3 : 0, now, BLUE, 2);
    if (down) {                                     // lift jets under the belly as it settles
      var bl = sp.anchors.belly;
      b.save();
      b.globalCompositeOperation = 'lighter';
      var g = b.createRadialGradient(x + bl[0], y + bl[1] + 2, 0, x + bl[0], y + bl[1] + 10, 22);
      g.addColorStop(0, 'rgba(200,240,255,' + (0.8 * down).toFixed(2) + ')');
      g.addColorStop(1, 'rgba(80,140,255,0)');
      b.fillStyle = g;
      b.fillRect(x + bl[0] - 24, y + bl[1] - 6, 48, 40);
      b.restore();
    }
    sprite(b, name, x, y);
    flame(b, x + en[0], y + en[1], thrust, -1, name === 'shuttle-up' ? 0.3 : 0, now + 19, BLUE, 2);
  }

  function approachShot(loc) {
    if (loc === 'lumar') return { dur: 2600, draw: function (b, W, H, t, now) {
      // low over the night sea toward Diggen's Point, the lighthouse sweeping; down onto the beach
      var hz = Math.round(H * 0.6);
      gradient(b, W, H, [[0, '#040814'], [0.55, '#0e2436'], [1, '#081a20']]);
      richStars(b, W, hz, now, -0.001, 41);
      b.fillStyle = '#e8ecf4';
      b.beginPath(); b.arc(W * 0.2, H * 0.16, 8, 0, Math.PI * 2); b.fill();
      // the headland: cliffs out of the sea, pines on top, the lighthouse
      var cx0 = W * (0.62 - easeOut(t) * 0.12);
      b.fillStyle = '#0c1416';
      b.beginPath();
      b.moveTo(cx0, hz + 4);
      for (var i = 0; i <= 24; i++) {
        var x = cx0 + i * (W * 0.5) / 24;
        b.lineTo(x, hz - H * 0.17 - Math.sin(i * 1.7) * 4 - (i > 10 ? 6 : 0) - hash(i) * 5);
      }
      b.lineTo(W + 10, hz + 4);
      b.closePath();
      b.fill();
      for (var p = 0; p < 9; p++) {                                       // pines
        var px = cx0 + 14 + p * 22 + hash(p) * 10, ph = 8 + hash(p * 3) * 8, py = hz - H * 0.17 - 4;
        b.beginPath(); b.moveTo(px, py - ph); b.lineTo(px - 4, py + 2); b.lineTo(px + 4, py + 2); b.closePath(); b.fill();
      }
      var lx = cx0 + W * 0.3, ly = hz - H * 0.17 - 26;
      b.fillStyle = '#d8d0c0'; b.fillRect(lx - 3, ly, 6, 22);
      b.fillStyle = '#a03028'; b.fillRect(lx - 3, ly + 6, 6, 4); b.fillRect(lx - 3, ly + 14, 6, 4);
      b.fillStyle = '#fff0b0'; b.fillRect(lx - 2, ly - 4, 4, 4);
      b.save();
      b.globalCompositeOperation = 'lighter';
      var ba = Math.sin(now / 900) * 1.2 + Math.PI;                      // the beam sweeping the sea
      var bg = b.createLinearGradient(lx, ly - 2, lx + Math.cos(ba) * W, ly - 2 + Math.sin(ba) * W * 0.2);
      bg.addColorStop(0, 'rgba(255,240,180,0.45)');
      bg.addColorStop(1, 'rgba(255,240,180,0)');
      b.fillStyle = bg;
      b.beginPath(); b.moveTo(lx, ly - 2);
      b.lineTo(lx + Math.cos(ba - 0.05) * W, ly - 2 + Math.sin(ba - 0.05) * W * 0.2);
      b.lineTo(lx + Math.cos(ba + 0.05) * W, ly - 2 + Math.sin(ba + 0.05) * W * 0.2);
      b.closePath(); b.fill();
      b.restore();
      // the sea, and the pale beach at the cliff's foot
      waveBand(b, W, H, hz, 2, 30, 0.04, 0, '#123a3c', '#5aa0a0', now);
      b.fillStyle = '#b8a888';
      b.fillRect(Math.round(cx0 + W * 0.08), hz + 1, Math.round(W * 0.2), 4);
      waveBand(b, W, H, hz + 10, 3, 24, 0.07, 1.3, '#0e3032', '#78c8c0', now);
      waveBand(b, W, H, hz + 26, 4, 20, 0.12, 2.1, '#0a2628', '#90e0d0', now);
      // the skiff: in fast and low, slowing, flaring down onto the sand
      var s = meta.shuttle;
      var x = -s.w + easeOut(t) * (cx0 + W * 0.12 + s.w), y = H * 0.36 + ease(t) * (hz - H * 0.36 - s.h * 0.75);
      var name = t > 0.72 ? 'shuttle-up' : 'shuttle';
      if (y + s.h > hz - 6) {                                            // spray off the water under it
        b.fillStyle = 'rgba(220,250,240,0.7)';
        for (var q = 0; q < 14; q++) b.fillRect(Math.round(x + hash(q + Math.floor(now / 60)) * s.w), Math.round(hz - hash(q * 3) * 8), 1, 1);
      }
      skiff(b, name, x, y, now, 4 + (1 - t) * 18, t > 0.7 ? (t - 0.7) / 0.3 : 0);
    } };
    if (loc === 'arcadia') return { dur: 2600, draw: function (b, W, H, t, now) {
      // dropping between the towers, through the traffic lanes, onto the pad at Skyport 7
      gradient(b, W, H, [[0, '#0a0418'], [0.5, '#2a0c3a'], [1, '#5a1850']]);
      var drop = easeOut(t) * H * 1.1;
      for (var L = 0; L < 3; L++) {                                      // towers, three depths, rising past
        var par = 0.35 + L * 0.35, col = ['#1a1030', '#140c26', '#0c0818'][L];
        for (var i = 0; i < 7; i++) {
          var tw = 26 + hash(i * 5 + L) * 40, tx = ((hash(i * 7 + L * 3) * (W + 80)) | 0) - 40;
          var ty = H * (0.15 + hash(i + L * 11) * 0.3) - drop * par;
          b.fillStyle = col;
          b.fillRect(tx, ty, tw, H * 2);
          for (var wy = 0; wy < H * 2; wy += 6) for (var wx = 3; wx < tw - 3; wx += 5) {
            if (hash(i * 131 + wx * 7 + wy * 13 + L) > 0.62) {
              b.fillStyle = ['#ffd890', '#a0e0ff', '#ff90c0'][(wx + wy) % 3];
              b.globalAlpha = 0.35 + L * 0.2;
              b.fillRect(tx + wx, Math.round(ty + 4 + wy), 2, 2);
            }
          }
          b.globalAlpha = 1;
        }
        for (var k = 0; k < 2; k++) {                                     // a traffic lane at this depth
          var ly = H * (0.3 + k * 0.4 + L * 0.1) - drop * par;
          for (var c = 0; c < 10; c++) {
            var cx = ((hash(c + k * 20 + L * 40) * (W + 40) + now * (0.04 + L * 0.03) * (k ? -1 : 1)) % (W + 40) + W + 40) % (W + 40) - 20;
            b.fillStyle = k ? 'rgba(255,90,110,0.9)' : 'rgba(230,240,255,0.9)';
            b.fillRect(Math.round(cx), Math.round(ly), 3 + L, 1);
          }
        }
      }
      // rain
      b.fillStyle = 'rgba(190,200,255,0.25)';
      for (var r = 0; r < 60; r++) {
        var rx = (hash(r) * W - now * 0.05) % W; if (rx < 0) rx += W;
        var ry = (hash(r * 3) * H + now * 0.4) % H;
        b.fillRect(Math.round(rx), Math.round(ry), 1, 4);
      }
      // the rooftop and its pad rising into view
      var top = H - easeOut(Math.min(1, t * 1.15)) * H * 0.3;
      b.fillStyle = '#1e1a2a'; b.fillRect(W * 0.18, top, W * 0.64, H);
      b.fillStyle = '#34303e'; b.fillRect(W * 0.18, top, W * 0.64, 3);
      b.fillStyle = '#e8e0c0'; b.fillRect(W * 0.46, top + 1, W * 0.08, 1);
      for (var bk = 0; bk < 4; bk++) {
        var on = Math.floor(now / 400 + bk) % 2;
        var bx = W * (0.24 + bk * 0.17);
        b.fillStyle = on ? '#ff5040' : '#601810'; b.fillRect(Math.round(bx), Math.round(top - 5), 2, 2);
        if (on) { b.fillStyle = 'rgba(255,80,60,0.25)'; b.fillRect(Math.round(bx - 3), Math.round(top - 8), 8, 8); }
      }
      var s = meta.shuttle;
      var x = W / 2 - s.w / 2, y = -s.h + easeOut(t) * (top - s.h * 0.85 + s.h);
      skiff(b, 'shuttle', x, y, now, 3, 0.5 + 0.5 * t);
    } };
    if (loc === 'enigma') return { dur: 3000, draw: function (b, W, H, t, now) {
      // in toward the dark station, the ringed giant behind it; into the lit mouth of Bay 3
      b.fillStyle = '#02040a';
      b.fillRect(0, 0, W, H);
      richStars(b, W, H, now, -0.001, 23);
      if (BridgeOrbit.drawGiant) BridgeOrbit.drawGiant(b, W * 0.78, H * 0.3, Math.round(H * 0.42), now, 0.3);
      var z = 0.42 + easeIn(t) * 2.6, mx = W * 0.6, my = H * 0.55, U = W * 0.5 * z;
      function px(u) { return Math.round(mx + u * U); }
      function py(v) { return Math.round(my + v * U); }
      // the hull: a long chamfered slab, lit along its top by the giant
      b.fillStyle = '#141c26';
      b.beginPath();
      b.moveTo(px(-1.7), py(-0.22)); b.lineTo(px(-1.5), py(-0.36)); b.lineTo(px(1.5), py(-0.36)); b.lineTo(px(1.75), py(-0.2));
      b.lineTo(px(1.75), py(0.26)); b.lineTo(px(1.5), py(0.4)); b.lineTo(px(-1.5), py(0.4)); b.lineTo(px(-1.7), py(0.26));
      b.closePath(); b.fill();
      b.fillStyle = '#2a3846';
      b.fillRect(px(-1.5), py(-0.36), px(1.5) - px(-1.5), Math.max(1, Math.round(U * 0.025)));
      b.fillStyle = '#0c1218';
      b.fillRect(px(-1.7), py(0.18), px(1.75) - px(-1.7), py(0.4) - py(0.18));
      // superstructure: stepped blocks on the spine, solar wings off both ends, a truss under the keel
      [[-1.05, -0.42, 0.42, 0.08], [-0.95, -0.5, 0.2, 0.08], [0.35, -0.44, 0.5, 0.08], [0.45, -0.52, 0.22, 0.08],
       [-0.25, 0.4, 0.5, 0.07]].forEach(function (m) {
        b.fillStyle = '#18222c';
        b.fillRect(px(m[0]), py(m[1]), px(m[0] + m[2]) - px(m[0]), py(m[1] + m[3]) - py(m[1]));
        b.fillStyle = '#2e3c4a';
        b.fillRect(px(m[0]), py(m[1]), px(m[0] + m[2]) - px(m[0]), 1);
      });
      [-1, 1].forEach(function (sd) {
        var w0 = sd < 0 ? -2.75 : 1.85, w1 = sd < 0 ? -1.8 : 2.8;
        b.fillStyle = '#2a3846';
        b.fillRect(px(sd < 0 ? -1.85 : 1.75), py(-0.02), px(sd < 0 ? -1.7 : 1.9) - px(sd < 0 ? -1.85 : 1.75), Math.max(1, py(0.02) - py(-0.02)));
        for (var pn = 0; pn < 2; pn++) {
          var v0 = pn ? 0.04 : -0.22, v1 = pn ? 0.22 : -0.04;
          b.fillStyle = '#121c34';
          b.fillRect(px(w0), py(v0), px(w1) - px(w0), py(v1) - py(v0));
          b.fillStyle = 'rgba(90,120,200,0.35)';
          for (var gx = w0; gx < w1; gx += 0.12) b.fillRect(px(gx), py(v0), 1, py(v1) - py(v0));
          b.fillRect(px(w0), Math.round((py(v0) + py(v1)) / 2), px(w1) - px(w0), 1);
        }
      });
      b.strokeStyle = '#1e2832'; b.lineWidth = 1;
      for (var tr = -1.4; tr < 1.4; tr += 0.14) {
        b.beginPath(); b.moveTo(px(tr), py(0.4)); b.lineTo(px(tr + 0.07), py(0.5)); b.lineTo(px(tr + 0.14), py(0.4)); b.stroke();
      }
      b.fillStyle = '#1e2832';
      b.fillRect(px(-1.4), py(0.5), px(1.4) - px(-1.4), 1);
      for (var sx = -1.6; sx < 1.7; sx += 0.12) {                                  // panel seams
        b.fillStyle = 'rgba(0,0,0,0.35)';
        b.fillRect(px(sx), py(-0.34), 1, py(0.38) - py(-0.34));
      }
      for (var wi = 0; wi < 90; wi++) {                                            // a few windows still lit
        var wu = -1.6 + hash(wi) * 3.3, wv = -0.28 + hash(wi * 3) * 0.4;
        if (Math.abs(wu) < 0.3 && wv > -0.1) continue;
        var on = hash(wi * 7) > 0.72 && !(hash(wi * 11) > 0.9 && Math.floor(now / 500 + wi) % 3 === 0);
        b.fillStyle = on ? (hash(wi * 5) > 0.5 ? '#ffd890' : '#80e0e8') : '#1e2832';
        b.fillRect(px(wu), py(wv), Math.max(1, Math.round(U * 0.018)), Math.max(1, Math.round(U * 0.01)));
      }
      b.strokeStyle = '#2a3846'; b.lineWidth = Math.max(1, Math.round(U * 0.008));     // the antenna mast and its dish
      b.beginPath(); b.moveTo(px(1.05), py(-0.36)); b.lineTo(px(1.05), py(-0.75)); b.stroke();
      b.beginPath(); b.ellipse(px(1.05), py(-0.62), U * 0.07, U * 0.025, -0.4, 0, Math.PI * 2); b.stroke();
      if (Math.floor(now / 700) % 2) { b.fillStyle = '#ff5040'; b.fillRect(px(1.05) - 1, py(-0.76) - 1, 3, 3); }
      for (var rl = 0; rl < 14; rl++) {                                             // running lights chasing along the edge
        var lit = Math.floor(now / 120) % 14 === rl;
        b.fillStyle = lit ? '#e0faff' : '#30505a';
        b.fillRect(px(-1.5 + rl * 0.23), py(0.4) - 1, 2, 2);
      }
      // the mouth of Bay 3: the field glowing over the lit hangar
      var m0 = px(-0.2), m1 = px(0.2), n0 = py(-0.06), n1 = py(0.15);
      b.fillStyle = '#081820';
      b.fillRect(m0, n0, m1 - m0, n1 - n0);
      b.fillStyle = '#1a3440';
      b.fillRect(m0, n1 - Math.round((n1 - n0) * 0.3), m1 - m0, Math.round((n1 - n0) * 0.3));
      for (var cl = 0; cl < 6; cl++) {
        b.fillStyle = Math.floor(now / 150 + cl) % 6 === 0 ? '#c0f8ff' : '#3a8a98';
        b.fillRect(Math.round(m0 + (m1 - m0) * (0.2 + cl * 0.12)), n1 - Math.round((n1 - n0) * 0.2), 2, 1);
      }
      b.save();
      b.globalCompositeOperation = 'lighter';
      var fg = b.createLinearGradient(0, n0, 0, n1);
      fg.addColorStop(0, 'rgba(90,208,232,0.25)'); fg.addColorStop(0.5, 'rgba(90,208,232,0.1)'); fg.addColorStop(1, 'rgba(120,230,255,0.4)');
      b.fillStyle = fg;
      b.fillRect(m0, n0, m1 - m0, n1 - n0);
      for (var sl = 0; sl < 6; sl++) {
        b.fillStyle = 'rgba(150,240,255,0.12)';
        b.fillRect(m0, Math.round(n1 - ((now / 30 + sl * (n1 - n0) / 6) % (n1 - n0))), m1 - m0, 1);
      }
      var halo = b.createRadialGradient((m0 + m1) / 2, (n0 + n1) / 2, 0, (m0 + m1) / 2, (n0 + n1) / 2, (m1 - m0) * 0.9);
      halo.addColorStop(0, 'rgba(90,208,232,0.18)'); halo.addColorStop(1, 'rgba(90,208,232,0)');
      b.fillStyle = halo;
      b.fillRect(m0 - (m1 - m0), n0 - (m1 - m0), (m1 - m0) * 3, (m1 - m0) * 3);
      b.restore();
      b.fillStyle = '#33475a';                                                     // the frame round the mouth
      b.fillRect(m0 - 2, n0 - 2, m1 - m0 + 4, 2); b.fillRect(m0 - 2, n0, 2, n1 - n0); b.fillRect(m1, n0, 2, n1 - n0);
      if (Math.floor(now / 450) % 2) { b.fillStyle = '#ff5040'; b.fillRect(m0 - 3, n0 - 3, 2, 2); b.fillRect(m1 + 1, n0 - 3, 2, 2); }
      // the skiff: across and in, sliding into the mouth
      var s = meta.shuttle, k1 = easeOut(Math.min(1, t * 1.1));
      var x = -s.w + k1 * ((m0 + m1) / 2 - s.w * 0.5 + s.w), y = H * 0.8 - k1 * (H * 0.8 - (n0 + n1) / 2 + s.h * 0.55);
      b.save();
      b.globalAlpha = t > 0.82 ? Math.max(0, 1 - (t - 0.82) / 0.12) : 1;
      skiff(b, 'shuttle', Math.round(x), Math.round(y), now, 4 + (1 - t) * 14, t > 0.55 ? 0.6 : 0);
      b.restore();
      if (t > 0.8) {                                                               // through the field: a wash of teal light
        b.save();
        b.globalCompositeOperation = 'lighter';
        b.fillStyle = 'rgba(90,208,232,' + (Math.sin(Math.min(1, (t - 0.8) / 0.2) * Math.PI) * 0.45).toFixed(2) + ')';
        b.fillRect(0, 0, W, H);
        b.restore();
      }
    } };
    if (loc === 'singularity' && typeof BridgeHorizon !== 'undefined') return { dur: 2800, draw: function (b, W, H, t, now) {
      // the horizon swallowing the sky; down to the old landing ring, trailing echoes of itself
      var P = { hx: W * 1.0, hy: -H * (0.45 - t * 0.15), R: H * (0.75 + t * 0.35), k: 1 };
      BridgeHorizon.sky(b, W, H, now, P);
      var top = H - easeOut(Math.min(1, t * 1.2)) * H * 0.32;
      b.fillStyle = '#120c20';                                           // the plain's edge, glowing cracks
      b.beginPath(); b.moveTo(0, H);
      for (var i = 0; i <= 30; i++) b.lineTo(i * W / 30, top + Math.sin(i * 1.3) * 3 + hash(i) * 6);
      b.lineTo(W, H); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(160,128,224,0.8)'; b.lineWidth = 1;
      for (var c = 0; c < 6; c++) {
        b.beginPath();
        var cx = W * (0.1 + hash(c) * 0.8), cy = top + 6;
        b.moveTo(cx, cy);
        for (var j = 0; j < 5; j++) { cx += (hash(c * 7 + j) - 0.5) * 16; cy += 5; b.lineTo(cx, cy); }
        b.stroke();
      }
      b.save();
      b.globalCompositeOperation = 'lighter';
      var rg = b.createRadialGradient(W * 0.42, top + 3, 0, W * 0.42, top + 3, 40);
      rg.addColorStop(0, 'rgba(160,128,255,0.5)'); rg.addColorStop(1, 'rgba(160,128,255,0)');
      b.fillStyle = rg; b.fillRect(W * 0.42 - 40, top - 37, 80, 80);
      b.restore();
      var s = meta['shuttle-down'];
      function pos(tt) { return [W * 0.1 + easeOut(tt) * W * 0.25, -s.h + easeOut(tt) * (top - s.h * 0.8 + s.h)]; }
      for (var e = 3; e >= 1; e--) {                                     // echoes of where it was
        var pe = pos(Math.max(0, t - e * 0.07));
        b.save(); b.globalAlpha = 0.22 / e; b.globalCompositeOperation = 'lighter';
        sprite(b, 'shuttle-down', pe[0], pe[1]);
        b.restore();
      }
      var p0 = pos(t);
      skiff(b, t > 0.75 ? 'shuttle' : 'shuttle-down', p0[0], p0[1], now, 6, t > 0.6 ? (t - 0.6) / 0.4 : 0);
    } };
    return null;
  }

  function ascendShots(loc) {
    var shots = [];
    // home (the lift-off plays in the world): up from below and astern, overtaking along the hull, then
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

  // ---- the jump: the drive spooling, stars stretching, a tunnel of light, dropping out ------------
  function jumpShots(from, to) {
    var shots = [];
    function shipAt(b, W, H, now, dx, shake) {
      var m = meta.mothership;
      var x = Math.round(W * 0.5 - m.w * 0.5 + dx + (shake ? (hash(Math.floor(now / 30)) - 0.5) * shake : 0));
      var y = Math.round(H * 0.5 - m.h * 0.55 + (shake ? (hash(Math.floor(now / 30) + 7) - 0.5) * shake : 0));
      return [x, y, m];
    }
    function engines(b, p, now, len, col) {
      for (var i = 0; i < 2; i++) {
        var a = p[2].anchors['exhaust_' + i];
        if (a) flame(b, p[0] + a[0], p[1] + a[1], len + i * 3, -1, 0, now + i * 50, col || AETHER, 5);
      }
    }
    // 1 · in orbit where we are: the sails brighten, the drive spools, stars begin to stretch
    shots.push({ dur: 1500, draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, from);
      var p = shipAt(b, W, H, now, -t * 10, t * 2);
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 70; i++) {                       // stars smearing into lines as the drive takes hold
        var sx = hash(i) * W, sy = hash(i * 3) * H, L = t * t * 40 * (0.3 + hash(i * 5));
        b.fillStyle = 'rgba(200,220,255,' + (0.25 + 0.5 * t).toFixed(2) + ')';
        b.fillRect(Math.round(sx - L), Math.round(sy), Math.max(1, Math.round(L)), 1);
      }
      var gx = p[0] + p[2].w * 0.05, gy = p[1] + p[2].h * 0.45;
      var g = b.createRadialGradient(gx, gy, 0, gx, gy, 30 + t * 40);
      g.addColorStop(0, 'rgba(200,190,255,' + (0.3 + t * 0.6).toFixed(2) + ')');
      g.addColorStop(1, 'rgba(120,100,255,0)');
      b.fillStyle = g;
      b.fillRect(gx - 80, gy - 80, 160, 160);
      b.restore();
      engines(b, p, now, 14 + t * 30);
      sprite(b, 'mothership', p[0], p[1]);
    } });
    // 2 · the leap: everything streaks past, a blinding bloom
    shots.push({ dur: 700, draw: function (b, W, H, t, now) {
      b.fillStyle = '#04030c';
      b.fillRect(0, 0, W, H);
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 160; i++) {
        var sy = hash(i * 3) * H, L = 40 + t * 260 * (0.4 + hash(i * 5));
        var sx = ((hash(i) * (W + L) - now * 1.2) % (W + L) + W + L) % (W + L) - L;
        var c = ['200,220,255', '170,140,255', '120,230,240'][i % 3];
        b.fillStyle = 'rgba(' + c + ',0.7)';
        b.fillRect(Math.round(sx), Math.round(sy), Math.round(L), 1);
      }
      b.restore();
      var p = shipAt(b, W, H, now, t * 30, 3);
      engines(b, p, now, 50);
      sprite(b, 'mothership', p[0], p[1]);
      b.fillStyle = 'rgba(255,255,255,' + Math.max(0, (t - 0.6) / 0.4).toFixed(2) + ')';
      b.fillRect(0, 0, W, H);
    } });
    // 3 · the tunnel: rings of light rushing out from the vanishing point
    shots.push({ dur: 1400, draw: function (b, W, H, t, now) {
      b.fillStyle = '#05030e';
      b.fillRect(0, 0, W, H);
      var cx = W * 0.5 + Math.sin(now / 300) * 6, cy = H * 0.5 + Math.cos(now / 410) * 4;
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 22; i++) {
        var f = ((now / 900) + i / 22) % 1;                 // each ring grows from the centre outward
        var R = Math.pow(f, 2.2) * Math.max(W, H) * 0.9;
        var col = ['150,120,255', '90,220,240', '255,190,120', '200,140,255'][i % 4];
        b.strokeStyle = 'rgba(' + col + ',' + (0.5 * (1 - f) + 0.1).toFixed(2) + ')';
        b.lineWidth = 1 + f * 4;
        b.beginPath();
        b.ellipse(cx, cy, R, R * 0.62, Math.sin(now / 1500) * 0.2, 0, Math.PI * 2);
        b.stroke();
      }
      for (var s = 0; s < 90; s++) {                        // streaks flying out of the tunnel
        var a = hash(s) * 6.283, sp = ((now / 600) + hash(s * 3)) % 1;
        var r0 = Math.pow(sp, 2) * W * 0.7, r1 = r0 + 6 + sp * 30;
        b.strokeStyle = 'rgba(220,230,255,' + (0.6 * sp).toFixed(2) + ')';
        b.lineWidth = 1;
        b.beginPath();
        b.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.62);
        b.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.62);
        b.stroke();
      }
      var g = b.createRadialGradient(cx, cy, 0, cx, cy, 60);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(160,140,255,0)');
      b.fillStyle = g;
      b.fillRect(cx - 60, cy - 60, 120, 120);
      b.restore();
      var m = meta.mothership, sc = 0.5;                    // the ship, small, riding the tunnel
      b.drawImage(imgs.mothership, Math.round(cx - m.w * sc / 2), Math.round(cy + 20 - m.h * sc / 2), Math.round(m.w * sc), Math.round(m.h * sc));
    } });
    // 4 · dropping out over the new world, the drive cooling
    shots.push({ dur: 1700, draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, to);
      var u = easeOut(t);
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 60; i++) {                        // the last streaks shrinking back into stars
        var L = (1 - u) * 120 * (0.3 + hash(i * 5));
        b.fillStyle = 'rgba(200,220,255,' + (0.6 * (1 - u)).toFixed(2) + ')';
        b.fillRect(Math.round(hash(i) * W - L), Math.round(hash(i * 3) * H), Math.max(1, Math.round(L)), 1);
      }
      b.restore();
      var p = shipAt(b, W, H, now, (1 - u) * -W * 0.6, (1 - u) * 3);
      engines(b, p, now, 10 + (1 - u) * 30);
      sprite(b, 'mothership', p[0], p[1]);
      b.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - t * 5).toFixed(2) + ')';
      b.fillRect(0, 0, W, H);
    } });
    return shots;
  }

  function jump(from, to, opts) { return play(function () { return jumpShots(from, to); }, opts); }

  function launch(loc, opts) { return play(function () { return launchShots(loc); }, opts); }
  function ascend(loc, opts) { return play(function () { return ascendShots(loc); }, opts); }

  function has(name) { return !!(meta && meta[name] && imgs[name]); }

  return { launch: launch, ascend: ascend, sail: sail, jump: jump, load: load, has: has };
})();
