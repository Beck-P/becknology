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
    ready = fetch('/bridge/assets/cine/cine.json').then(function (r) { return r.json(); }).then(function (m) {
      meta = m;
      return Promise.all(Object.keys(m).map(function (name) {
        return new Promise(function (res) {
          var im = new Image();
          im.onload = function () { imgs[name] = im; res(); };
          im.onerror = function () { res(); };
          im.src = '/bridge/assets/cine/' + name + '.png';
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

  var BLUE = ['rgba(120,210,255,0.9)', 'rgba(60,120,255,0)'];
  var HOT = ['rgba(255,200,120,0.95)', 'rgba(255,90,40,0)'];

  // Per-place skies for the descent and the climb.
  var SKY = {
    lumar: { top: '#06101e', mid: '#12304a', low: '#2c5a6c', glow: [110, 210, 210], cloud: ['#7a92aa', '#4a5e76'],
             cloudLit: '#b4c8da',
             ground: 'sea' },
    arcadia: { top: '#0c0618', mid: '#2a1240', low: '#7a2a6a', glow: [220, 100, 230], cloud: ['#5a3a6e', '#3a2450'],
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
    if (layer === 1) {          // wisps streaming past
      b.fillStyle = tones[1];
      for (var w = 0; w < 14; w++) {
        var wx = hash(w * 17) * W;
        var wy = ((hash(w * 19) * H + offset * 2.4) % H + H) % H;
        b.globalAlpha = 0.35;
        b.fillRect(Math.round(wx), Math.round(wy), 1, 10 + Math.round(hash(w * 23) * 24));
        b.globalAlpha = 1;
      }
    }
  }

  // The ground rising into view under the clouds: moonlit sea with island
  // lights, or a city grid.
  function ground(b, W, H, top, now, sky) {
    if (top >= H) return;
    if (sky.ground === 'sea') {
      gradient(b, W, H, [[0, sky.low], [1, sky.low]]);
      b.fillStyle = '#0c2232';
      b.fillRect(0, Math.round(top), W, H - Math.round(top));
      for (var i = 0; i < 60; i++) {
        var y = top + hash(i) * (H - top);
        var x = (hash(i * 3) * W + now * 0.01 * (1 + hash(i * 5))) % W;
        b.fillStyle = 'rgba(160,200,220,' + (0.25 + 0.3 * hash(i * 7)).toFixed(2) + ')';
        b.fillRect(Math.round(x), Math.round(y), 2 + Math.round(hash(i * 9) * 4), 1);
      }
      for (var k = 0; k < 6; k++) {
        var ix = hash(k * 11) * W, iy = top + 6 + hash(k * 13) * (H - top - 6);
        b.fillStyle = '#1c3a2a';
        b.fillRect(Math.round(ix) - 8, Math.round(iy) - 2, 16, 4);
        b.fillStyle = 'rgba(255,200,120,0.9)';
        b.fillRect(Math.round(ix), Math.round(iy) - 1, 1, 1);
      }
    } else {
      b.fillStyle = '#120a1c';
      b.fillRect(0, Math.round(top), W, H - Math.round(top));
      for (var j = 0; j < 220; j++) {
        var gx = hash(j) * W, gy = top + hash(j * 3) * (H - top);
        var pick = hash(j * 5);
        b.fillStyle = pick < 0.7 ? 'rgba(255,186,104,0.85)' : pick < 0.88 ? 'rgba(96,220,255,0.85)' : 'rgba(255,110,200,0.85)';
        b.fillRect(Math.round(gx), Math.round(gy), 1, 1);
      }
    }
  }

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }

  function spaceShot(b, W, H, now, loc) {
    b.fillStyle = '#03030a';
    b.fillRect(0, 0, W, H);
    stars(b, W, H, now, -0.004, 0, 140, 7);
    var kind = BridgeOrbit.kindOf(loc);
    if (kind === 'ocean' || kind === 'city' || kind === 'gas') {
      var R = Math.round(H * 0.95);
      b.drawImage(BridgeOrbit.planet(kind, R, now), Math.round(W * 0.82 - R), Math.round(H * 0.62));
    } else if (kind === 'hole') {
      BridgeOrbit.drawHole(b, W * 0.8, H * 0.78, Math.round(H * 0.12), now);
    }
    if (loc === 'enigma') BridgeOrbit.drawStation(b, W * 0.82, H * 0.7, 4, now);
  }

  function msPos(W, H, now) {
    var m = meta.mothership;
    return [Math.round(W * 0.06 + Math.sin(now / 4000) * 2), Math.round(H * 0.16 + Math.sin(now / 3100) * 1.5), m];
  }

  function drawMothership(b, W, H, now) {
    var p = msPos(W, H, now), m = p[2];
    for (var i = 0; i < 3; i++) {
      var a = m.anchors['exhaust_' + i];
      flame(b, p[0] + a[0], p[1] + a[1], 10 + i % 2 * 3, -1, 0, now + i * 50, BLUE, 3);
    }
    sprite(b, 'mothership', p[0], p[1]);
    return p;
  }

  // ---- the shots -------------------------------------------------------------------
  function launchShots(loc) {
    var sky = skyOf(loc);
    var kind = BridgeOrbit.kindOf(loc);
    var shots = [];
    // 1 · out of the hangar bay, away toward the world below
    shots.push({ dur: 3600, draw: function (b, W, H, t, now) {
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
      shots.push({ dur: 2600, draw: function (b, W, H, t, now) {
        var g = sky.glow;
        gradient(b, W, H, [[0, '#020208'], [0.55, sky.top], [1, 'rgba(' + g[0] + ',' + g[1] + ',' + g[2] + ',1)']]);
        stars(b, W, H * 0.5, now, 0, -0.03, 60, 3);
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
        b.restore();
      } });
      // 3 · down through the clouds, levelling out, the ground coming up
      shots.push({ dur: 3000, draw: function (b, W, H, t, now) {
        gradient(b, W, H, [[0, sky.top], [0.6, sky.mid], [1, sky.low]]);
        var groundTop = H - easeOut(Math.max(0, (t - 0.35) / 0.65)) * H * 0.42;
        ground(b, W, H, groundTop, now, sky);
        var speed = (1 - easeOut(t)) * 2.2 + 0.25;
        var off = -now * 0.08 * speed;
        clouds(b, W, H, off * 0.6, 0, sky);
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
      shots.push({ dur: 2600, draw: function (b, W, H, t, now) {
        gradient(b, W, H, [[0, sky.top], [0.6, sky.mid], [1, sky.low]]);
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
      shots.push({ dur: 1800, draw: function (b, W, H, t, now) {
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
    // 3 · home: across to the mothership and into the hangar bay
    shots.push({ dur: 3600, draw: function (b, W, H, t, now) {
      spaceShot(b, W, H, now, loc);
      var p = msPos(W, H, now), m = p[2], bay = m.anchors.bay;
      var s = meta.shuttle;
      var tx = p[0] + bay[0] - s.w * 0.4, ty = p[1] + bay[1] - s.h * 0.5;
      var u = easeOut(Math.min(1, t / 0.75));
      var x = tx + (1 - u) * W * 0.7, y = ty + s.h * 0.9 + (1 - u) * H * 0.5;
      if (t > 0.75) {
        var v = ease((t - 0.75) / 0.25);
        y = ty + s.h * 0.9 * (1 - v);
        sprite(b, 'shuttle', x, y);          // rising into the bay: the hull hides it as it goes in
        drawMothership(b, W, H, now);
      } else {
        drawMothership(b, W, H, now);
        flame(b, x + s.anchors.exhaust_far[0], y + s.anchors.exhaust_far[1], 4 + (1 - u) * 12, -1, 0, now, BLUE, 2);
        sprite(b, 'shuttle', x, y);
        flame(b, x + s.anchors.exhaust_near[0], y + s.anchors.exhaust_near[1], 4 + (1 - u) * 12, -1, 0, now + 21, BLUE, 2);
      }
    } });
    return shots;
  }

  // ---- player ---------------------------------------------------------------------
  function play(makeShots, opts) {
    setup();
    return load().then(function () {
      if (!meta || !meta.shuttle || typeof BridgeOrbit === 'undefined') return;
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

  return { launch: launch, ascend: ascend, load: load };
})();
