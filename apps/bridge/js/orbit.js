/**
 * BridgeOrbit — what the mothership's windows look out on.
 *
 * The ship parks in orbit wherever its last jump took it; every window on
 * board (the bridge viewport, the hangar's bay door, the quarters) draws
 * the same view through BridgeOrbit.draw(ctx, x, y, w, h, now).
 *
 *   BridgeOrbit.getLocation()        'deep-space' | 'lumar' | 'arcadia' | 'enigma' | 'singularity'
 *   BridgeOrbit.setLocation(id)      after a jump (persisted)
 *   BridgeOrbit.placeName(id)        display name
 *
 * Planets are drawn per pixel at native resolution: an equirectangular
 * surface texture (fbm noise, made once) wrapped on a sphere, lit with a
 * terminator quantized through a 4×4 ordered dither, an atmosphere rim and
 * a drifting cloud layer — the same small-steps look as the rendered rooms.
 * Each planet image is cached and redrawn a few times a second as it turns.
 */
var BridgeOrbit = (function () {
  var LOC_KEY = 'bridge_ship_location';

  var PLACES = {
    'deep-space': { name: 'Deep Space' },
    lumar: { name: 'Lumar', planet: 'ocean' },
    'arcadia-street': { name: 'Arcadia', planet: 'city', alias: 'arcadia' },
    arcadia: { name: 'Arcadia', planet: 'city' },
    enigma: { name: 'Enigma Station', planet: 'gas' },
    singularity: { name: 'The Singularity', planet: 'hole' }
  };

  function getLocation() {
    var id = null;
    try { id = localStorage.getItem(LOC_KEY); } catch (e) { id = null; }
    if (id && PLACES[id] && PLACES[id].alias) id = PLACES[id].alias;
    return id && PLACES[id] ? id : 'deep-space';
  }

  function setLocation(id) {
    if (PLACES[id] && PLACES[id].alias) id = PLACES[id].alias;
    try { localStorage.setItem(LOC_KEY, id); } catch (e) { /* private mode: the view just resets */ }
  }

  function placeName(id) { return (PLACES[id] || PLACES['deep-space']).name; }

  // ---- noise ----------------------------------------------------------------
  function hash3(i, j, k, s) {
    var h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1013904223) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }

  function vnoise3(x, y, z, s) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    function L(a, b, t) { return a + (b - a) * t; }
    var c000 = hash3(xi, yi, zi, s), c100 = hash3(xi + 1, yi, zi, s);
    var c010 = hash3(xi, yi + 1, zi, s), c110 = hash3(xi + 1, yi + 1, zi, s);
    var c001 = hash3(xi, yi, zi + 1, s), c101 = hash3(xi + 1, yi, zi + 1, s);
    var c011 = hash3(xi, yi + 1, zi + 1, s), c111 = hash3(xi + 1, yi + 1, zi + 1, s);
    return L(L(L(c000, c100, u), L(c010, c110, u), v), L(L(c001, c101, u), L(c011, c111, u), v), w);
  }

  function fbm3(x, y, z, s, oct) {
    var a = 0, amp = 0.5, f = 1, norm = 0;
    for (var o = 0; o < oct; o++) {
      a += vnoise3(x * f, y * f, z * f, s + o * 17) * amp;
      norm += amp; amp *= 0.5; f *= 2.03;
    }
    return a / norm;
  }

  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // ---- surface textures (equirectangular, made once) -------------------------
  var TW = 512, TH = 256;
  var textures = {};

  function makeTexture(kind) {
    var col = new Uint8ClampedArray(TW * TH * 3);
    var cloud = new Float32Array(TW * TH);
    var glow = new Uint8ClampedArray(TW * TH * 3);     // night-side lights
    var water = new Uint8Array(TW * TH);
    for (var j = 0; j < TH; j++) {
      var lat = (j / (TH - 1) - 0.5) * Math.PI;
      for (var i = 0; i < TW; i++) {
        var lon = i / TW * Math.PI * 2;
        var px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
        var n = j * TW + i, c;
        if (kind === 'ocean') {
          var h = fbm3(px * 4.2 + 3, py * 4.2, pz * 4.2, 11, 5);
          if (h > 0.665) {        // scattered islands: sand rims, green hearts, a few harbour lights
            c = h > 0.675 ? (h > 0.71 ? [74, 120, 70] : [52, 104, 64]) : [196, 178, 118];
            if (hash3(i, j, 1, 4) < 0.05) { glow[n * 3] = 255; glow[n * 3 + 1] = 190; glow[n * 3 + 2] = 110; }
          } else {
            var d = Math.min(1, (0.665 - h) * 3.5);
            c = d < 0.12 ? [70, 190, 170] : [Math.round(30 - 18 * d), Math.round(128 - 70 * d), Math.round(124 - 44 * d)];
            water[n] = 1;
          }
          if (Math.abs(lat) > 1.22 + fbm3(px * 6, py * 6, pz * 6, 5, 2) * 0.2) { c = [214, 228, 232]; water[n] = 0; }
          cloud[n] = Math.max(0, fbm3(px * 3 + 9, py * 5, pz * 3, 31, 5) - 0.47) * 3.0;
        } else if (kind === 'city') {
          var hc = fbm3(px * 2 + 1, py * 2, pz * 2, 5, 5);
          var land = hc > 0.47;
          c = land ? [46, 40, 60] : [18, 24, 40];
          if (!land) water[n] = 1;
          if (land) {          // city lights: an amber haze where it's built up, points of light in it
            var dens = fbm3(px * 6, py * 6, pz * 6, 77, 4);
            var haze = Math.max(0, dens - 0.48) * 2.6;
            var pt = hash3(i, j, 3, 9) < haze * 0.5 ? 1 : 0;
            var neon = hash3(i, j, 5, 2) < 0.04;
            glow[n * 3] = Math.min(255, 120 * haze + pt * (neon ? 90 : 160));
            glow[n * 3 + 1] = Math.min(255, 70 * haze + pt * (neon ? 210 : 110));
            glow[n * 3 + 2] = Math.min(255, 30 * haze + pt * (neon ? 255 : 50));
          }
          cloud[n] = Math.max(0, fbm3(px * 3, py * 6 + 4, pz * 3, 41, 4) - 0.6) * 2.0;
        } else if (kind === 'gas') {
          var t = fbm3(px * 1.5, py * 6, pz * 1.5, 23, 4);
          var b = Math.sin((py + (t - 0.5) * 0.35) * 22) * 0.5 + 0.5;
          var bands = [[196, 160, 120], [150, 104, 78], [220, 196, 160], [120, 84, 70]];
          var a = bands[Math.floor(b * 3.99)], bb = bands[(Math.floor(b * 3.99) + 1) % 4], f = (b * 3.99) % 1;
          c = [a[0] + (bb[0] - a[0]) * f, a[1] + (bb[1] - a[1]) * f, a[2] + (bb[2] - a[2]) * f];
        } else {
          c = [10, 8, 14];
        }
        col[n * 3] = c[0]; col[n * 3 + 1] = c[1]; col[n * 3 + 2] = c[2];
      }
    }
    return { col: col, cloud: cloud, glow: glow, water: water };
  }

  function texture(kind) {
    if (!textures[kind]) textures[kind] = makeTexture(kind);
    return textures[kind];
  }

  // ---- planet disc ----------------------------------------------------------
  var ATMO = { ocean: [110, 220, 230], city: [210, 110, 240], gas: [240, 210, 170] };
  var discs = {};

  // Per-pixel geometry for a disc of radius R, made once per size.
  function discGeom(R, sun) {
    var key = R + ':' + sun.join(',');
    if (discs[key]) return discs[key];
    var D = R * 2, n = D * D;
    var lon = new Float32Array(n), lat = new Float32Array(n), lit = new Float32Array(n), rim = new Float32Array(n);
    var spec = new Float32Array(n);
    var hx = sun[0], hy = sun[1], hz = sun[2] + 1, hl = Math.sqrt(hx * hx + hy * hy + hz * hz);
    hx /= hl; hy /= hl; hz /= hl;
    var inside = new Uint8Array(n);
    for (var y = 0; y < D; y++) {
      for (var x = 0; x < D; x++) {
        var nx = (x + 0.5 - R) / R, ny = (y + 0.5 - R) / R, rr = nx * nx + ny * ny;
        var k = y * D + x;
        if (rr > 1) continue;
        var nz = Math.sqrt(1 - rr);
        inside[k] = 1;
        lat[k] = Math.asin(-ny);
        lon[k] = Math.atan2(nx, nz);
        lit[k] = nx * sun[0] + ny * sun[1] + nz * sun[2];
        rim[k] = Math.pow(1 - nz, 4);
        spec[k] = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 70);
      }
    }
    discs[key] = { R: R, D: D, lon: lon, lat: lat, lit: lit, rim: rim, spec: spec, inside: inside, cache: {} };
    return discs[key];
  }

  // Where each world's sun sits: Lumar mostly in daylight; Arcadia seen
  // from its night side, a thin crescent of day on the right, cities lit.
  var SUN = { ocean: [-0.62, -0.38, 0.69], city: [0.86, -0.36, -0.36], gas: [-0.7, -0.3, 0.65] };

  function planetCanvas(kind, R, now) {
    var sun = SUN[kind] || SUN.ocean;
    var g = discGeom(R, sun);
    var spin = { ocean: 1 / 160000, city: 1 / 220000, gas: 1 / 90000 }[kind] || 0;
    var step = Math.floor(now / 250);
    var c = g.cache[kind];
    if (c && c.step === step) return c.canvas;
    if (!c) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = g.D;
      c = g.cache[kind] = { canvas: cv, ctx: cv.getContext('2d'), img: null, step: -1 };
      c.img = c.ctx.createImageData(g.D, g.D);
    }
    var tex = texture(kind), atmo = ATMO[kind] || [200, 200, 220];
    var rot = (now * spin) % 1, crot = (now * spin * 1.35) % 1;
    var d = c.img.data, D = g.D;
    for (var y = 0; y < D; y++) {
      for (var x = 0; x < D; x++) {
        var k = y * D + x, o = k * 4;
        if (!g.inside[k]) { d[o + 3] = 0; continue; }
        var u = (g.lon[k] / (Math.PI * 2) + 0.5 + rot) % 1;
        var v = g.lat[k] / Math.PI + 0.5;
        var ti = Math.min(TH - 1, Math.floor((1 - v) * TH)) * TW + Math.floor(u * TW) % TW;
        var r = tex.col[ti * 3], gg = tex.col[ti * 3 + 1], b = tex.col[ti * 3 + 2];
        var cu = (g.lon[k] / (Math.PI * 2) + 0.5 + crot) % 1;
        var crow = Math.min(TH - 1, Math.floor((1 - v) * TH)) * TW;
        var ci = crow + Math.floor(cu * TW) % TW;
        var cl = Math.min(1, tex.cloud[ci]);
        var sh = Math.min(1, tex.cloud[crow + Math.floor((cu + 0.006) * TW) % TW]);     // the cloud's shadow, offset
        var dk = 1 - sh * 0.35;
        r *= dk; gg *= dk; b *= dk;
        r += (235 - r) * cl; gg += (240 - gg) * cl; b += (245 - b) * cl;
        // light: smooth terminator quantized into small dithered steps
        var L = g.lit[k];
        var lv = Math.max(0.07, Math.min(1, L * 1.25 + 0.18));
        var q = lv * 7 + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5);
        lv = Math.max(0.06, Math.round(q) / 7);
        r *= lv; gg *= lv; b *= lv;
        // a warm band along the terminator, a cool blue night
        var dusk = Math.max(0, 1 - Math.abs(L - 0.04) * 7);
        r += dusk * 46; gg += dusk * 12; b -= dusk * 10;
        var dark = Math.max(0, Math.min(1, (0.1 - L) * 5));
        r += dark * 6; gg += dark * 10; b += dark * 22;
        // the sun glinting off open water
        if (tex.water[ti] && g.spec[k] > 0.02) {
          var sp = g.spec[k] * (1 - cl);
          r += 255 * sp; gg += 240 * sp; b += 210 * sp;
        }
        // night lights where it's dark
        var night = Math.max(0, Math.min(1, (0.12 - L) * 6)) * (1 - cl * 0.8);
        if (night > 0) { r += tex.glow[ti * 3] * night; gg += tex.glow[ti * 3 + 1] * night; b += tex.glow[ti * 3 + 2] * night; }
        // atmosphere rim, brighter on the lit side
        var a = g.rim[k] * (0.35 + Math.max(0, L) * 0.9);
        r += atmo[0] * a; gg += atmo[1] * a; b += atmo[2] * a;
        d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    c.ctx.putImageData(c.img, 0, 0);
    c.step = step;
    return c.canvas;
  }

  /** A planet with its atmosphere glowing past the limb. */
  function drawPlanet(ctx, kind, cx, cy, R, now) {
    var atmo = ATMO[kind];
    if (atmo) {
      var sun = SUN[kind] || SUN.ocean;
      var hx = cx + sun[0] * R * 0.18, hy = cy + sun[1] * R * 0.18;
      var g = ctx.createRadialGradient(hx, hy, R * 0.92, hx, hy, R * 1.14);
      g.addColorStop(0, 'rgba(' + atmo[0] + ',' + atmo[1] + ',' + atmo[2] + ',0.42)');
      g.addColorStop(0.45, 'rgba(' + atmo[0] + ',' + atmo[1] + ',' + atmo[2] + ',0.14)');
      g.addColorStop(1, 'rgba(' + atmo[0] + ',' + atmo[1] + ',' + atmo[2] + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
    }
    ctx.drawImage(planetCanvas(kind, R, now), Math.round(cx - R), Math.round(cy - R));
  }

  // ---- stars ------------------------------------------------------------------
  var starCache = {};
  function stars(w, h, seed) {
    var key = w + 'x' + h + ':' + seed;
    if (starCache[key]) return starCache[key];
    var list = [];
    var n = Math.floor(w * h / 260);
    for (var i = 0; i < n; i++) {
      var r = hash3(i, seed, 1, 3);
      list.push({ x: hash3(i, seed, 2, 5), y: hash3(i, seed, 3, 7), b: 0.25 + r * 0.75, big: r > 0.93,
                  tw: hash3(i, seed, 4, 9) * 6.28, warm: hash3(i, seed, 5, 2) > 0.8 });
    }
    starCache[key] = list;
    return list;
  }

  function drawStars(ctx, x, y, w, h, now, seed, drift) {
    var list = stars(Math.round(w), Math.round(h), seed);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var sx = x + ((s.x - now * drift * (0.4 + s.b * 0.6)) % 1 + 1) % 1 * w;
      var sy = y + s.y * h;
      var a = s.b * (0.75 + Math.sin(now / 700 + s.tw) * 0.25);
      ctx.fillStyle = s.warm ? 'rgba(255,226,200,' + a.toFixed(2) + ')' : 'rgba(220,230,255,' + a.toFixed(2) + ')';
      ctx.fillRect(Math.round(sx), Math.round(sy), s.big ? 2 : 1, s.big ? 2 : 1);
    }
  }

  function nebula(ctx, x, y, w, h, cols) {
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      var g = ctx.createRadialGradient(x + c[0] * w, y + c[1] * h, 0, x + c[0] * w, y + c[1] * h, c[2] * Math.max(w, h));
      g.addColorStop(0, 'rgba(' + c[3] + ',' + c[4] + ',' + c[5] + ',' + c[6] + ')');
      g.addColorStop(1, 'rgba(' + c[3] + ',' + c[4] + ',' + c[5] + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }
  }

  // ---- places -----------------------------------------------------------------
  function drawRing(ctx, cx, cy, R, front, tilt) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.22);
    ctx.beginPath();
    if (front) ctx.rect(-R * 2.4, 0, R * 4.8, R * 2);     // near half of the ring passes in front
    else ctx.rect(-R * 2.4, -R * 2, R * 4.8, R * 2);
    ctx.clip();
    var bands = [[1.35, 1.55, 'rgba(210,190,160,0.55)'], [1.6, 1.85, 'rgba(230,214,186,0.7)'], [1.9, 2.05, 'rgba(180,160,130,0.45)']];
    for (var i = 0; i < bands.length; i++) {
      ctx.strokeStyle = bands[i][2];
      ctx.lineWidth = (bands[i][1] - bands[i][0]) * R * tilt;
      ctx.beginPath();
      ctx.ellipse(0, 0, (bands[i][0] + bands[i][1]) / 2 * R, (bands[i][0] + bands[i][1]) / 2 * R * tilt, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStation(ctx, cx, cy, s, now) {
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(-s * 3, -s * 0.3, s * 6, s * 0.6);        // truss
    ctx.fillStyle = '#3a4458';
    ctx.fillRect(-s * 0.9, -s * 0.9, s * 1.8, s * 1.8);    // hub
    ctx.fillStyle = '#1a2a3a';
    for (var i = -1; i <= 1; i += 2) ctx.fillRect(i * s * 3 - s * 0.6 * (i > 0 ? 0 : 1), -s * 1.6, s * 0.6, s * 3.2);   // panels
    ctx.fillStyle = 'rgba(120,220,255,0.9)';
    ctx.fillRect(-s * 0.5, -s * 0.15, s, s * 0.3);
    var blink = Math.floor(now / 600) % 2;
    ctx.fillStyle = blink ? '#ff5050' : '#60ff90';
    ctx.fillRect(s * 2.8, -s * 0.5, 2, 2);
    ctx.restore();
  }

  function drawHole(ctx, cx, cy, R, now) {
    // lensed accretion disc: back arc over the top, a dark core, the near disc across the front
    var spin = now / 4000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 3; i++) {
      var rr = R * (1.25 + i * 0.12);
      var g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, rr * 1.3);
      g.addColorStop(0, 'rgba(255,200,140,' + (0.35 - i * 0.08) + ')');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy - R * 0.05, rr, rr * 0.92, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,220,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var k = 0; k < 40; k++) {
      var a = (k / 40) * Math.PI * 2 + spin;
      var d = R * (1.5 + 0.9 * ((k * 37) % 10) / 10);
      var px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.22;
      var bright = Math.cos(a) > 0 ? 0.9 : 0.45;        // the side turning toward us is brighter
      ctx.fillStyle = 'rgba(255,' + (190 + (k % 3) * 20) + ',140,' + bright + ')';
      ctx.fillRect(Math.round(px), Math.round(py), 2, 1);
    }
    var disc = ctx.createLinearGradient(cx - R * 2.6, 0, cx + R * 2.6, 0);
    disc.addColorStop(0, 'rgba(255,120,60,0)');
    disc.addColorStop(0.3, 'rgba(255,170,90,0.5)');
    disc.addColorStop(0.5, 'rgba(255,230,190,0.8)');
    disc.addColorStop(0.75, 'rgba(255,200,140,0.95)');
    disc.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 0.08, R * 2.6, R * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Draw the view out of a window into the rect (native pixels). */
  function draw(ctx, x, y, w, h, now, opts) {
    opts = opts || {};
    var loc = opts.location || getLocation();
    var P = PLACES[loc] || PLACES['deep-space'];
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = '#04040c';
    ctx.fillRect(x, y, w, h);
    var neb = {
      'deep-space': [[0.3, 0.4, 0.6, 90, 50, 160, 0.28], [0.75, 0.7, 0.5, 30, 120, 150, 0.22]],
      lumar: [[0.8, 0.2, 0.5, 40, 120, 120, 0.18]],
      arcadia: [[0.2, 0.3, 0.6, 140, 50, 160, 0.22]],
      enigma: [[0.5, 0.3, 0.6, 50, 70, 130, 0.18]],
      singularity: [[0.5, 0.5, 0.7, 160, 70, 40, 0.2]]
    }[loc] || [];
    nebula(ctx, x, y, w, h, neb);
    drawStars(ctx, x, y, w, h, now, loc.length * 7 + 1, 1 / 900000);
    var R;
    if (P.planet === 'ocean' || P.planet === 'city') {
      // a world below the window: the top third of it, its limb arcing across
      R = Math.round(Math.min(w * 0.32, h * 1.5));
      drawPlanet(ctx, P.planet, x + w * 0.58, y + h * (opts.horizon || 0.14) + R, R, now);
      if (P.planet === 'ocean') {        // Lumar's moon
        var mr = Math.max(6, Math.round(h * 0.09));
        var mx = x + w * 0.16, my = y + h * 0.22;
        ctx.fillStyle = '#c8ccd8';
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(4,4,12,0.7)';
        ctx.beginPath(); ctx.arc(mx + mr * 0.45, my - mr * 0.1, mr, 0, Math.PI * 2); ctx.fill();
      }
    } else if (P.planet === 'gas') {
      R = Math.round(Math.min(w * 0.22, h * 0.42));
      var gx = x + w * 0.7, gy = y + h * 0.5;
      drawRing(ctx, gx, gy, R, false, 0.28);
      drawPlanet(ctx, 'gas', gx, gy, R, now);
      drawRing(ctx, gx, gy, R, true, 0.28);
      drawStation(ctx, x + w * 0.28, y + h * 0.42 + Math.sin(now / 3000) * 2, Math.max(3, Math.round(h * 0.04)), now);
    } else if (P.planet === 'hole') {
      drawHole(ctx, x + w * 0.5, y + h * 0.5, Math.max(8, Math.round(h * 0.16)), now);
    }
    ctx.restore();
  }

  /** Enigma's ringed giant: back half of the rings, the planet, the near half. */
  function drawGiant(ctx, cx, cy, R, now, tilt) {
    drawRing(ctx, cx, cy, R, false, tilt || 0.28);
    drawPlanet(ctx, 'gas', cx, cy, R, now);
    drawRing(ctx, cx, cy, R, true, tilt || 0.28);
  }

  /** Which kind of world a place is ('ocean', 'city', 'gas', 'hole' or null for open space). */
  function kindOf(id) { return (PLACES[id] || {}).planet || null; }

  return { draw: draw, getLocation: getLocation, setLocation: setLocation, placeName: placeName, kindOf: kindOf,
           planet: planetCanvas, drawPlanet: drawPlanet, drawHole: drawHole, drawStation: drawStation, drawStars: drawStars,
           drawGiant: drawGiant };
})();
