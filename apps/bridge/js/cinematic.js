/**
 * BridgeCine — the cutscenes: the hyperspace jump between systems and the
 * galleon sailing between Lumar's islands. (The shuttle itself just lifts
 * off one pad and settles on the next, in the world — js/ship.js.)
 *
 *   BridgeCine.jump(from, to)  → Promise   spool-up, the leap, the tunnel, dropping out
 *   BridgeCine.sail(from, to)  → Promise   the galleon side-on through the swells
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

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // A nebula for each place, made once per size: value-noise clouds in two
  // colours over black, drawn at half resolution and scaled up.
  var nebCache = {};
  var NEB = { lumar: [[30, 110, 120], [40, 50, 120]], arcadia: [[140, 40, 150], [40, 30, 110]],
              enigma: [[40, 70, 140], [90, 40, 120]], singularity: [[150, 70, 40], [80, 30, 90]],
              verdance: [[50, 120, 80], [110, 120, 50]], hoarfell: [[90, 120, 190], [150, 90, 150]],
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
    if (kind === 'ocean' || kind === 'city' || kind === 'gas' || kind === 'garden' || kind === 'ice') {
      var R = Math.round(H * 0.95);
      BridgeOrbit.drawPlanet(b, kind, W * 0.82, H * 0.62 + R, R, now);
    } else if (kind === 'hole') {
      BridgeOrbit.drawHole(b, W * 0.8, H * 0.78, Math.round(H * 0.12), now);
    }
    if (loc === 'enigma') BridgeOrbit.drawStation(b, W * 0.82, H * 0.7, 4, now);
    sunFlare(b, W, H, now);
  }

  var AETHER = ['rgba(150,140,255,0.95)', 'rgba(70,220,210,0)'];



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
        var title = opts && opts.name ? titleCard(opts) : null, shotNow = -1;
        function finish() {
          if (done) return;
          done = true;
          if (title) title.remove();
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
          if (i !== shotNow) {                                   // a new shot: its sound, the title card in or out
            shotNow = i;
            if (shots[i].sfx && typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(shots[i].sfx);
            if (title) title.classList.toggle('on', !!shots[i].title);
          }
          bctx.setTransform(1, 0, 0, 1, 0, 0);
          bctx.globalAlpha = 1;
          bctx.globalCompositeOperation = 'source-over';
          bctx.imageSmoothingEnabled = false;
          bctx.clearRect(0, 0, W, H);
          shots[i].draw(bctx, W, H, t, now);
          // cuts dip through black (unless a shot cuts on a flash: dip false); the very start and end fade too
          var inE = i === 0 || shots[i].dip !== false ? el - acc : 1e9;
          var outE = i === shots.length - 1 || shots[i + 1].dip !== false ? acc + shots[i].dur - el : 1e9;
          var fade = Math.max(0, 1 - Math.min(inE, outE) / 220);
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

  // ---- the jump --------------------------------------------------------------------------------
  // The drive spooling up round the hull, the leap (the ship stretching away into a flash), the aether
  // tunnel seen from the bridge through the gallery's arched windows, dropping out over the new world,
  // and the shuttle peeling off the bay for the planet. The first time at a world, a pause on it and its
  // name before the shuttle goes. Cuts between these are flashes, not dips to black (`dip: false`).
  var tunnelBuf = null, tunnelImg = null, tunnelGeo = null;
  function tunnel(b, W, H, t, now, glow) {
    var w = Math.ceil(W / 2), h = Math.ceil(H / 2);         // chunky: drawn at half size, scaled up
    if (!tunnelBuf || tunnelBuf.width !== w || tunnelBuf.height !== h) {
      tunnelBuf = document.createElement('canvas');
      tunnelBuf.width = w; tunnelBuf.height = h;
      tunnelImg = tunnelBuf.getContext('2d').createImageData(w, h);
      tunnelGeo = { r: new Float32Array(w * h), a: new Float32Array(w * h) };
    }
    var cx = w / 2 + Math.sin(now / 520) * 3, cy = h / 2 + Math.cos(now / 690) * 2;
    var d = tunnelImg.data, R = tunnelGeo.r, A = tunnelGeo.a;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var k = y * w + x, dx = x - cx, dy = (y - cy) * 1.35;
      R[k] = Math.sqrt(dx * dx + dy * dy) + 0.001; A[k] = Math.atan2(dy, dx);
    }
    // the palette drifts violet → cyan → gold as you go
    var P = [[160, 110, 255], [80, 230, 255], [255, 205, 120], [240, 140, 255]];
    var ph = (t * 2.6) % 4, i0 = Math.floor(ph), f0 = ph - i0, c0 = P[i0], c1 = P[(i0 + 1) % 4];
    var col = [c0[0] + (c1[0] - c0[0]) * f0, c0[1] + (c1[1] - c0[1]) * f0, c0[2] + (c1[2] - c0[2]) * f0];
    var spd = now / 1000 * 3.2, twist = now / 1000 * 0.35;
    var BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (var j = 0; j < w * h; j++) {
      var r = R[j], z = 30 / r + spd;                         // depth down the tunnel
      var turn = A[j] / 6.2832 + twist + z * 0.05;            // round it, a slow spiral
      var rf = (z * 1.8) % 1, hoop = rf < 0.1 ? 1 : rf < 0.22 ? 0.4 : 0;        // bright hoops, a soft trailing edge
      var sf = ((turn * 18) % 1 + 1) % 1, line = sf < 0.09 ? 0.55 : 0;           // light running along the walls
      var spark = hash(Math.floor(turn * 60) * 13 + Math.floor(z * 3)) > 0.982 ? 1 : 0;
      var base = 0.24 + 0.1 * Math.sin(z * 1.1 + turn * 18.85);
      var near = Math.min(1, 34 / r);                          // walls dimmer close by, the far end bright
      var v = (base + hoop * 0.75 + line * (0.6 - hoop * 0.3) + spark) * (0.45 + 0.55 * near);
      var core = Math.max(0, 1 - r / (w * 0.07));
      var x = j % w, y = (j / w) | 0;
      var lv = Math.min(5, Math.floor(v * 5 + BY[(y & 3) * 4 + (x & 3)] / 16)) / 5;  // four or five steps, dithered
      lv = Math.min(1, lv + core + glow);
      var o = j * 4, hot = Math.max(0, lv - 0.75) * 4;
      d[o] = Math.min(255, col[0] * lv + 255 * hot * 0.5);
      d[o + 1] = Math.min(255, col[1] * lv + 255 * hot * 0.5);
      d[o + 2] = Math.min(255, col[2] * lv + 255 * hot * 0.5);
      d[o + 3] = 255;
    }
    tunnelBuf.getContext('2d').putImageData(tunnelImg, 0, 0);
    b.imageSmoothingEnabled = false;
    b.drawImage(tunnelBuf, 0, 0, W, H);
    // streaks flying past, out of the light
    b.save();
    b.globalCompositeOperation = 'lighter';
    for (var s = 0; s < 70; s++) {
      var a = hash(s) * 6.2832, sp = ((now / 450) + hash(s * 3)) % 1;
      var r0 = Math.pow(sp, 2.2) * W * 0.75, r1 = r0 + 4 + sp * sp * 50;
      b.strokeStyle = 'rgba(235,240,255,' + (0.7 * sp).toFixed(2) + ')';
      b.lineWidth = sp > 0.7 ? 2 : 1;
      b.beginPath();
      b.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0 * 0.74);
      b.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1 * 0.74);
      b.stroke();
    }
    b.restore();
  }

  // the bridge's gallery around the view: three arched windows in dark panelled wood, brass at the joins
  function gallery(b, W, H, light) {
    var wood = '#140a06', rim = 'rgba(208,160,72,' + (0.35 + 0.4 * light).toFixed(2) + ')';
    b.fillStyle = wood;
    b.fillRect(0, H - Math.round(H * 0.1), W, H);                     // the sill
    b.fillRect(0, 0, W, Math.round(H * 0.06));
    var panes = 3, mull = Math.round(W * 0.022), pw = (W - mull * (panes + 1)) / panes;
    for (var i = 0; i <= panes; i++) b.fillRect(Math.round(i * (pw + mull)), 0, mull, H);
    for (var p = 0; p < panes; p++) {                                  // the arches' shoulders
      var x0 = mull + p * (pw + mull), top = H * 0.06;
      for (var yy = 0; yy < H * 0.16; yy++) {
        var t = 1 - yy / (H * 0.16), inset = Math.round(pw * 0.5 * (1 - Math.sqrt(1 - t * t)));
        b.fillStyle = wood;
        b.fillRect(Math.round(x0), Math.round(top + yy), inset, 1);
        b.fillRect(Math.round(x0 + pw - inset), Math.round(top + yy), inset, 1);
      }
      b.fillStyle = rim;
      b.fillRect(Math.round(x0), H - Math.round(H * 0.1), Math.round(pw), 1);
    }
    b.fillStyle = rim;
    for (var m = 0; m <= panes; m++) b.fillRect(Math.round(m * (pw + mull) + mull / 2), Math.round(H * 0.3), 1, Math.round(H * 0.5));
  }

  function jumpShots(from, to, opts) {
    opts = opts || {};
    var shots = [];
    function shipAt(W, H, dx, dy, shake, now) {
      var m = meta.mothership;
      var j = shake ? (hash(Math.floor(now / 30)) - 0.5) * shake : 0, k = shake ? (hash(Math.floor(now / 30) + 7) - 0.5) * shake : 0;
      return [Math.round(W * 0.5 - m.w * 0.5 + dx + j), Math.round(H * 0.5 - m.h * 0.55 + dy + k), m];
    }
    function engines(b, p, now, len, col) {
      for (var i = 0; i < 2; i++) {
        var a = p[2].anchors['exhaust_' + i];
        if (a) flame(b, p[0] + a[0], p[1] + a[1], len + i * 3, -1, 0, now + i * 50, col || AETHER, 5);
      }
    }
    // 1 · the drive spooling: aether drawn in to the keel, rings of light forming round the hull, the stars starting to run
    shots.push({ dur: 1300, sfx: 'warp', draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, from);
      var p = shipAt(W, H, -t * 14, 0, t * t * 3, now), m = p[2];
      var cx = p[0] + m.w * 0.5, cy = p[1] + m.h * 0.62;
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 80; i++) {                         // stars beginning to smear past
        var sx = hash(i) * W, sy = hash(i * 3) * H, L = t * t * t * 70 * (0.3 + hash(i * 5));
        b.fillStyle = 'rgba(200,220,255,' + (0.2 + 0.5 * t).toFixed(2) + ')';
        b.fillRect(Math.round(sx - L), Math.round(sy), Math.max(1, Math.round(L)), 1);
      }
      for (var q = 0; q < 60; q++) {                         // motes of aether spiralling in to the keel
        var ph = ((now / 900) + hash(q * 7)) % 1, ang = hash(q) * 6.2832 + ph * 3, rr = (1 - ph) * (60 + hash(q * 3) * 90);
        b.fillStyle = 'rgba(' + (q % 2 ? '170,140,255' : '120,230,240') + ',' + (ph * 0.9).toFixed(2) + ')';
        b.fillRect(Math.round(cx + Math.cos(ang) * rr * 1.6), Math.round(cy + Math.sin(ang) * rr * 0.5), 2, 1);
      }
      for (var r = 0; r < 4; r++) {                          // rings tightening round the hull
        var f = ((t * 1.6) + r / 4) % 1, R = (1 - f) * m.w * 0.85 + 20;
        b.strokeStyle = 'rgba(180,150,255,' + (t * 0.7 * f).toFixed(2) + ')';
        b.lineWidth = 1 + f;
        b.beginPath(); b.ellipse(cx, cy, R, R * 0.28, 0, 0, Math.PI * 2); b.stroke();
      }
      var g = b.createRadialGradient(cx - m.w * 0.3, cy, 0, cx - m.w * 0.3, cy, 40 + t * 70);
      g.addColorStop(0, 'rgba(210,200,255,' + (0.25 + t * 0.6).toFixed(2) + ')'); g.addColorStop(1, 'rgba(120,100,255,0)');
      b.fillStyle = g; b.fillRect(cx - m.w, cy - 120, m.w * 2, 240);
      b.restore();
      engines(b, p, now, 12 + t * 36);
      sprite(b, 'mothership', p[0], p[1]);
      b.save(); b.globalCompositeOperation = 'lighter'; b.globalAlpha = t * 0.35;          // the hull itself starting to glow
      sprite(b, 'mothership', p[0], p[1]); b.restore();
    } });
    // 2 · the leap: the ship stretching away into the distance, a shock ring where it was, a white-out
    shots.push({ dur: 480, dip: false, sfx: 'leap', draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, from);
      var m = meta.mothership, e = t * t;
      var cx = W * 0.5 - 14, cy = H * 0.5;
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 160; i++) {
        var sy = hash(i * 3) * H, L = 60 + e * 400 * (0.4 + hash(i * 5)), sx = hash(i) * W - L * 0.5;
        b.fillStyle = 'rgba(' + ['200,220,255', '170,140,255', '120,230,240'][i % 3] + ',' + (0.5 + 0.3 * t).toFixed(2) + ')';
        b.fillRect(Math.round(sx), Math.round(sy), Math.round(L), 1);
      }
      b.strokeStyle = 'rgba(200,180,255,' + (0.8 * (1 - t)).toFixed(2) + ')';
      b.lineWidth = 2;
      b.beginPath(); b.ellipse(cx, cy, 20 + t * W * 0.6, (20 + t * W * 0.6) * 0.3, 0, 0, Math.PI * 2); b.stroke();
      var stretch = 1 + e * 7, x0 = cx - m.w * 0.5 + e * W * 0.9;
      for (var gh = 3; gh >= 0; gh--) {                       // after-images along its path
        b.globalAlpha = gh === 0 ? 1 : 0.25 / gh;
        b.drawImage(imgs.mothership, Math.round(x0 - gh * 30 * e - m.w * (stretch - 1)), Math.round(cy - m.h * 0.55),
                    Math.round(m.w * stretch), m.h);
      }
      b.restore();
      b.fillStyle = 'rgba(255,255,255,' + Math.max(0, (t - 0.55) / 0.45).toFixed(2) + ')';
      b.fillRect(0, 0, W, H);
    } });
    // 3 · the tunnel, from the bridge: through the gallery's windows, light rushing out of the vanishing point
    shots.push({ dur: 1800, dip: false, draw: function (b, W, H, t, now) {
      tunnel(b, W, H, t, now, Math.max(0, 1 - t * 4) * 0.6);
      var g = b.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.2);    // the core
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(230,220,255,0.25)'); g.addColorStop(1, 'rgba(200,180,255,0)');
      b.save(); b.globalCompositeOperation = 'lighter'; b.fillStyle = g; b.fillRect(0, 0, W, H); b.restore();
      gallery(b, W, H, 0.5 + 0.5 * Math.sin(now / 90));
      b.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - t * 6).toFixed(2) + ')';      // out of the white
      b.fillRect(0, 0, W, H);
      b.fillStyle = 'rgba(255,255,255,' + Math.max(0, (t - 0.82) / 0.18).toFixed(2) + ')';  // and into it again
      b.fillRect(0, 0, W, H);
    } });
    // 4 · dropping out over the new world: the streaks snapping back into stars, a ripple in space, the ship braking in
    shots.push({ dur: opts.first ? 1300 : 1000, dip: false, sfx: 'dropout', draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, to);
      var u = easeOut(t);
      b.save();
      b.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 70; i++) {
        var L = (1 - u) * 160 * (0.3 + hash(i * 5));
        b.fillStyle = 'rgba(200,220,255,' + (0.6 * (1 - u)).toFixed(2) + ')';
        b.fillRect(Math.round(hash(i) * W - L), Math.round(hash(i * 3) * H), Math.max(1, Math.round(L)), 1);
      }
      var R = u * W * 0.8;
      b.strokeStyle = 'rgba(190,170,255,' + (0.6 * (1 - u)).toFixed(2) + ')';
      b.lineWidth = 3 * (1 - u) + 1;
      b.beginPath(); b.ellipse(W * 0.5, H * 0.5, R, R * 0.4, 0, 0, Math.PI * 2); b.stroke();
      b.restore();
      var p = shipAt(W, H, (1 - u) * -W * 0.7, 0, (1 - u) * 4, now);
      var nose = p[2].anchors.nose;
      if (nose) flame(b, p[0] + nose[0], p[1] + nose[1], 8 + (1 - u) * 26, 1, 0, now, AETHER, 4);   // braking off the bow
      engines(b, p, now, 6 + (1 - u) * 18);
      sprite(b, 'mothership', p[0], p[1]);
      b.fillStyle = 'rgba(255,255,255,' + Math.max(0, 1 - t * 5).toFixed(2) + ')';
      b.fillRect(0, 0, W, H);
    } });
    // 5 · (the first time) a moment on the world itself, its name
    if (opts.first) {
      shots.push({ dur: 2400, dip: false, title: true, draw: function (b, W, H, t, now) {
        spaceShot(b, W, H, now, to);
        var p = shipAt(W, H, -t * 10, 0, 0, now);
        engines(b, p, now, 6);
        sprite(b, 'mothership', p[0], p[1]);
      } });
    }
    // 6 · the shuttle drops out of the bay and dives for the planet, a streak of re-entry behind it
    shots.push({ dur: 1100, dip: false, sfx: 'lift', draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, to);
      var p = shipAt(W, H, -(opts.first ? 10 : 0) - t * 8, 0, 0, now), m = p[2];
      engines(b, p, now, 6);
      sprite(b, 'mothership', p[0], p[1]);
      var bay = m.anchors.bay || [m.w * 0.5, m.h * 0.7], sm = meta['shuttle-down'];
      var e = t * t, sc = 1 - e * 0.85;
      var sx = p[0] + bay[0] + e * W * 0.25, sy = p[1] + bay[1] + e * H * 0.55;
      if (t > 0.3) {
        b.save(); b.globalCompositeOperation = 'lighter';
        var g = b.createLinearGradient(sx, sy, sx - 40 * e, sy - 70 * e);
        g.addColorStop(0, 'rgba(255,200,140,' + (0.8 * e).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,120,60,0)');
        b.strokeStyle = g; b.lineWidth = 3 * sc + 1;
        b.beginPath(); b.moveTo(sx, sy); b.lineTo(sx - 40 * e, sy - 70 * e); b.stroke();
        b.restore();
      }
      if (sm && imgs['shuttle-down']) {
        b.drawImage(imgs['shuttle-down'], Math.round(sx - sm.w * sc / 2), Math.round(sy - sm.h * sc / 2), Math.max(1, Math.round(sm.w * sc)), Math.max(1, Math.round(sm.h * sc)));
      }
      b.fillStyle = 'rgba(2,3,10,' + Math.max(0, (t - 0.75) / 0.25).toFixed(2) + ')';     // into the landing
      b.fillRect(0, 0, W, H);
    } });
    return shots;
  }

  // the first time at a world: its name, crisp, over the shot (css .cine-title)
  function titleCard(opts) {
    var el = document.createElement('div');
    el.className = 'cine-title';
    el.innerHTML = '<div class="ct-kicker">' + (opts.first ? 'A new world' : 'Arriving') + '</div><div class="ct-name">' +
      String(opts.name).replace(/</g, '') + '</div>' + (opts.kind ? '<div class="ct-kind">' + String(opts.kind).replace(/</g, '') + '</div>' : '');
    document.body.appendChild(el);
    return el;
  }

  function jump(from, to, opts) { return play(function () { return jumpShots(from, to, opts); }, opts); }


  function has(name) { return !!(meta && meta[name] && imgs[name]); }

  return { sail: sail, jump: jump, load: load, has: has };
})();
