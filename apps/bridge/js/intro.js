/**
 * BridgeIntro — the title page. The site's front page is the Bridge (`/`), so this is Becknology's title too.
 *
 * Beck: "the mothership in orbit over the planet it's parked at, with day and night following the real clock … but
 * still keeping some level of that technology aspect". The Wayfarer (the cutscenes' Blender sprite, js/cinematic.js)
 * drifts in orbit over the world she's parked at (localStorage `bridge_ship_location`; before any jump, Lumar). The
 * planet turns slowly under her (BridgeOrbit.globe) and is lit where its own clock says (BridgeClock.sky): the sun is
 * placed so the terminator crosses the ground below the ship at that planet's sunrise and sunset (the sunrise equation,
 * from its daylight share), its lights come on after dark, its cloud thickens in wet weather (BridgeWeather). A little
 * after sunset the ship passes into the planet's shadow, portholes still lit. Parallax stars, the place's nebula, now
 * and then a shooting star or the skiff dropping out of the bay for the surface. Enigma is the ringed giant and the
 * station, the Singularity its disc; Arcadia, as ever, night.
 *
 * The technology: BECKNOLOGY in the old ANSI letters drawn as pixels (█ the face, the box-drawing shadow as 1-px
 * lines), printed in like a terminal with a block cursor, under a phosphor glow and scanlines, a light sweeping across
 * now and then, a rare glitch; a HUD frame with the orbit's readouts; the ship's systems coming online over the menu.
 *
 * The menu: Continue as <pilot> (their face from js/look.js, where the ship is, coins, the planet's time and season),
 * Switch pilot — or New pilot / Sign in for someone new (js/identity.js, its forms over the scene) — and the sound
 * (js/audio.js); and who's on the wire: a short look at the lobby's presence every 45 s while the title is up, on
 * BridgeProgression's client (its own socket — never BridgeNet's channel). Enter / Space, or a click or tap on the sky,
 * takes the first choice; ↑/↓ pick. Continuing pushes in through the stern gallery (the bridge's windows) to a flash,
 * and the bridge loads (`board`).
 *
 * Drawn like the cutscenes: a native buffer (~640 px across, ~560 on a phone) scaled by a whole number; the planet is
 * worked out a few times a second, everything else is sprites and points.
 *
 *   BridgeIntro.show()            state 'intro' (main.js)
 *   BridgeIntro.draw(ctx, w, h)   every frame in 'intro' and 'identity' (the identity forms float over the scene)
 *   BridgeIntro.hide()            gone (the tests skip the title with it)
 *   BridgeIntro.covers()          the scene is the background (main.js leaves its starfield out)
 *   BridgeIntro.board(then)       the push into the ship, then then() — Continue, and js/identity.js after a sign-in
 *   BridgeIntro._state()          for the tests (tools/tests/world/title.js)
 */
var BridgeIntro = (function () {
  var ASCII_LOGO =
    ' ██████╗ ███████╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗   ██╗\n' +
    ' ██╔══██╗██╔════╝██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝\n' +
    ' ██████╔╝█████╗  ██║     █████╔╝ ██╔██╗ ██║██║   ██║██║     ██║   ██║██║  ███╗╚████╔╝\n' +
    ' ██╔══██╗██╔══╝  ██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║     ██║   ██║██║   ██║ ╚██╔╝\n' +
    ' ██████╔╝███████╗╚██████╗██║  ██╗██║ ╚████║╚██████╔╝███████╗╚██████╔╝╚██████╔╝  ██║\n' +
    ' ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝  ╚═╝';

  // Where the ship can be parked: the planet drawn, its clock, the ground the shuttle sets down on, and how far up the
  // globe that ground lies (the latitude the view is tilted to).
  var PLACES = {
    lumar:       { id: 'lumar', kind: 'ocean', name: 'Lumar', site: "Diggen's Point", lat: 0.5, alt: 412 },
    verdance:    { id: 'verdance', kind: 'garden', name: 'Verdance', site: 'Brambleford', lat: 0.55, alt: 388 },
    hoarfell:    { id: 'hoarfell', kind: 'ice', name: 'Hoarfell', site: 'Fellhaven', lat: 0.9, alt: 455 },
    sylvara:     { id: 'sylvara', kind: 'forest', name: 'Sylvara', site: 'Elderglade', lat: 0.5, alt: 430 },
    arcadia:     { id: 'arcadia', kind: 'city', name: 'Arcadia', site: 'Skyport 7', lat: 0.45, alt: 520, night: true },
    enigma:      { id: 'enigma', kind: 'gas', name: 'Enigma Station', site: 'Docking Bay 3', alt: 0, giant: true },
    singularity: { id: 'singularity', kind: 'hole', name: 'The Singularity', site: 'The Brink', alt: 0, hole: true }
  };
  var PART = { morning: 'Morning', midday: 'Midday', afternoon: 'Afternoon', dawn: 'Dawn', dusk: 'Dusk', night: 'Night', 'midnight sun': 'Midnight sun' };
  var SPIN = 1 / 1100000;                       // the surface turning under her: once in about eighteen minutes
  var STAR_COL = ['#e1e8ff', '#ffe2c8', '#c8dcff', '#ffc8e6', '#d2fff0'];
  var AETHER = ['rgba(150,140,255,0.95)', 'rgba(70,220,210,0)'];

  var overlay = null, active = false, shownAt = 0, booted = false, bound = false;
  var P = PLACES.lumar, pilotName = null, lookup = null, coins = null;
  var items = [], sel = 0, boarding = null, wireTimer = 0, wireList = [], peeking = null, hudAt = 0;

  // ---- small helpers ----------------------------------------------------------------------------------------------
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function $(id) { return document.getElementById(id); }
  function cachedPilot() { return typeof BridgeState !== 'undefined' ? BridgeState.getCachedPilotName() : null; }
  function whereNow() {
    var id = null;
    try { id = localStorage.getItem('bridge_ship_location'); } catch (e) { id = null; }
    if (id === 'arcadia-street') id = 'arcadia';
    return PLACES[id] || PLACES.lumar;                // a ship that's never jumped: Lumar, the first world
  }

  // ================================================================================================================
  //  THE SCENE — a native buffer scaled by a whole number
  // ================================================================================================================
  var buf = null, bx = null, zbuf = null, zx = null, W = 0, H = 0, zoom = 1, L = null, vignette = null;
  var stars = null, neb = null, nebAt = 0, planetAt = 0, ship = null, shipAt = 0, cineAsked = false;
  var ev = { starAt: 0, star: null, shAt: 0, sh: null, boltAt: 0, bolt: null };

  function size(dw, dh) {
    var land = dw >= dh * 1.05;
    var z = Math.max(1, Math.round(dw / (land ? 640 : 560)));
    var w = Math.ceil(dw / z), h = Math.ceil(dh / z);
    if (!buf) { buf = document.createElement('canvas'); bx = buf.getContext('2d'); zbuf = document.createElement('canvas'); zx = zbuf.getContext('2d'); }
    if (w === W && h === H && z === zoom && L) return;
    W = w; H = h; zoom = z;
    buf.width = zbuf.width = W; buf.height = zbuf.height = H;
    L = layout(W, H);
    stars = makeStars();
    vignette = null;
    neb = null; nebAt = 0;                                         // made again at the new size (stage)
  }

  // Where things sit. Landscape: the planet's limb a long curve across the bottom third, cresting right of centre,
  // the ship above it a little right of centre (the menu has the lower left). Portrait: a bigger world under the
  // bottom half, the ship over it in the middle.
  function layout(W, H) {
    var land = W >= H * 1.05, o = { land: land };
    if (P.giant || P.hole) {
      o.ship = land ? [W * 0.44, H * 0.45] : [W * 0.5, H * 0.37];
      o.body = land ? [W * 0.79, H * 0.6, Math.round(H * (P.hole ? 0.12 : 0.22))] : [W * 0.64, H * 0.56, Math.round(W * (P.hole ? 0.14 : 0.27))];
      o.station = land ? [o.body[0] - o.body[2] * 2.1, o.body[1] + o.body[2] * 0.35] : [W * 0.2, o.body[1] - o.body[2] * 1.15];
      o.target = P.hole ? [o.body[0] - o.body[2] * 1.7, o.body[1] + o.body[2] * 0.4] : o.station;
      o.mark = o.target;
      return o;
    }
    o.R = Math.round(land ? W * 0.84 : W * 1.15);
    o.cx = Math.round(land ? W * 0.62 : W * 0.5);
    o.cy = Math.round((land ? H * 0.7 : H * 0.5) + o.R);
    o.ship = land ? [W * 0.6, H * 0.45] : [W * 0.5, H * 0.37];
    // the ground under her: a little way in from the limb, straight below
    var dx = o.ship[0] - o.cx, top = o.cy - Math.sqrt(Math.max(0, o.R * o.R - dx * dx));
    o.site = [o.ship[0], top + Math.min(H - top, o.R) * (land ? 0.22 : 0.12)];
    o.mark = o.site;
    var nx = (o.site[0] - o.cx) / o.R, ny = (o.site[1] - o.cy) / o.R;
    o.tilt = (P.lat || 0.5) - Math.asin(clamp(-ny, -1, 1));      // tilted so that ground is at the place's latitude
    var nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), ct = Math.cos(o.tilt), st = Math.sin(o.tilt);
    o.siteN = [nx, ny * ct - nz * st, ny * st + nz * ct];        // its normal in the globe's frame
    o.target = [o.site[0] + W * 0.12, o.site[1] + (H - o.site[1]) * 0.35];
    return o;
  }

  // ---- the sun: where the planet's clock puts it ----------------------------------------------------------------------
  // In the globe's frame (x east, y down, z out of the face below). The ground under the ship is at latitude φ,
  // longitude λ; with the hour angle h (0 at its noon) and a declination δ chosen so the day there lasts the planet's
  // daylight share D (cos πD = −tan φ tan δ), the sun's height there is ∝ cos h − cos πD — BridgeClock's own curve —
  // so the terminator crosses it exactly at the clock's sunrise and sunset.
  function sun() {
    if (P.night) return norm([0.8, -0.28, -0.52]);                // Arcadia: the night side, a crescent of day to the east
    var k = typeof BridgeClock !== 'undefined' ? BridgeClock.sky(P.id) : null;
    if (!k || !k.cycles || !L || !L.siteN) return norm([-0.55, -0.35, 0.76]);
    var n = L.siteN, phi = Math.asin(clamp(-n[1], -1, 1)), lam = Math.atan2(n[0], n[2]);
    var h = 2 * Math.PI * (k.t / k.len - 0.5), D = clamp(k.daylight || 0.5, 0.03, 0.97);
    var dec = Math.atan(-Math.cos(Math.PI * D) / Math.tan(Math.max(0.2, phi)));
    var ls = lam - h;                                              // in the morning the sun's to the east
    return [Math.cos(dec) * Math.sin(ls), -Math.sin(dec), Math.cos(dec) * Math.cos(ls)];
  }
  function norm(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function lightAtSite(s) { return L && L.siteN ? L.siteN[0] * s[0] + L.siteN[1] * s[1] + L.siteN[2] * s[2] : 1; }

  // more cloud in wet weather (BridgeWeather spells), and the odd flash of lightning in a storm
  var WET = { rain: 0.45, storm: 0.85, snow: 0.55, blizzard: 0.95, fog: 0.3, cloudy: 0.4, mist: 0.25, smog: 0.3, gale: 0.2, breezy: 0.08 };
  function weather() {
    if (typeof BridgeWeather === 'undefined' || !BridgeWeather.at || P.giant || P.hole) return null;
    try { return BridgeWeather.at(P.id); } catch (e) { return null; }
  }

  // ---- stars: three layers drifting at their own speeds (the ship's headed right) ---------------------------------
  function makeStars() {
    var layers = [[380, 0.45, 0.22, 0.55, 0], [1500, 1.3, 0.45, 0.85, 0], [6500, 3.4, 0.7, 1, 0.45]];
    return layers.map(function (Ly, li) {
      var n = Math.floor(W * H / Ly[0]), list = [];
      for (var i = 0; i < n; i++) {
        var s = i * 7 + li * 1013;
        list.push({ x: hash(s + 1), y: hash(s + 2), b: Ly[2] + hash(s + 3) * (Ly[3] - Ly[2]), tw: hash(s + 4) * 6.28,
                    c: STAR_COL[Math.floor(hash(s + 5) * STAR_COL.length)], big: hash(s + 6) < Ly[4] });
      }
      return { sp: Ly[1], list: list };
    });
  }
  function drawStars(b, now, fade) {
    for (var l = 0; l < stars.length; l++) {
      var S = stars[l], off = now / 1000 * S.sp;
      for (var i = 0; i < S.list.length; i++) {
        var s = S.list[i], x = ((s.x * W - off) % W + W) % W, y = s.y * H;
        var a = s.b * (0.72 + 0.28 * Math.sin(now / 650 + s.tw)) * fade;
        b.globalAlpha = a;
        b.fillStyle = s.c;
        if (s.big) {
          b.fillRect(Math.round(x), Math.round(y), 2, 2);
          if (a > 0.75) {                                          // a little cross flare on the brightest
            b.globalAlpha = (a - 0.75) * 1.4;
            b.fillRect(Math.round(x) - 2, Math.round(y), 6, 1); b.fillRect(Math.round(x), Math.round(y) - 2, 1, 6);
          }
        } else b.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    b.globalAlpha = 1;
  }

  function shootingStar(b, now) {
    if (!ev.starAt) ev.starAt = now + 4000 + Math.random() * 5000;
    if (!ev.star && now > ev.starAt) {
      var dir = Math.random() < 0.5 ? -1 : 1;
      ev.star = { t0: now, x: W * (0.15 + Math.random() * 0.7), y: H * (0.04 + Math.random() * (L.land ? 0.4 : 0.3)),
                  dx: dir * (0.8 + Math.random() * 0.3), dy: 0.32 + Math.random() * 0.25, v: 0.26 + Math.random() * 0.12, dur: 650 + Math.random() * 350 };
    }
    var s = ev.star;
    if (!s) return;
    var t = (now - s.t0) / s.dur;
    if (t >= 1) { ev.star = null; ev.starAt = now + 7000 + Math.random() * 11000; return; }
    var d = (now - s.t0) * s.v, hx = s.x + s.dx * d, hy = s.y + s.dy * d, tail = 22 + 16 * t;
    var a = Math.sin(t * Math.PI);
    b.save();
    b.globalCompositeOperation = 'lighter';
    var g = b.createLinearGradient(hx, hy, hx - s.dx * tail, hy - s.dy * tail);
    g.addColorStop(0, 'rgba(255,250,235,' + (0.9 * a).toFixed(2) + ')'); g.addColorStop(1, 'rgba(160,190,255,0)');
    b.strokeStyle = g; b.lineWidth = 1;
    b.beginPath(); b.moveTo(Math.round(hx) + 0.5, Math.round(hy) + 0.5); b.lineTo(hx - s.dx * tail, hy - s.dy * tail); b.stroke();
    b.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; b.fillRect(Math.round(hx), Math.round(hy), 1, 1);
    b.restore();
  }

  // ---- the world below ------------------------------------------------------------------------------------------------
  function drawWorld(b, now, s) {
    if (!planetAt) return;
    var a = clamp((now - planetAt) / 900, 0, 1);
    if (a <= 0) return;
    b.globalAlpha = a;
    if (P.giant) {
      var G = L.body;
      BridgeOrbit.drawGiant(b, G[0], G[1], G[2], now, 0.28);
      BridgeOrbit.drawStation(b, L.station[0], L.station[1] + Math.sin(now / 3000) * 1.5, Math.max(3, Math.round(G[2] * 0.045)), now);
    } else if (P.hole) {
      BridgeOrbit.drawHole(b, L.body[0], L.body[1], L.body[2], now);
    } else {
      var wx = weather(), cover = wx && WET[wx.kind] ? WET[wx.kind] * (wx.k == null ? 1 : wx.k) : 0;
      BridgeOrbit.globe(b, P.kind, L.cx, L.cy, L.R, now, { sun: s, tilt: L.tilt, spin: SPIN, clip: [0, 0, W, H], halo: 0.05, clouds: cover, every: 420, spread: true, ambient: 0.16 });
      if (wx && (wx.kind === 'storm' || wx.kind === 'blizzard')) lightning(b, now, s);
    }
    b.globalAlpha = 1;
  }

  // a storm on the night side: a cloud lit from inside for a moment, somewhere on the face
  function lightning(b, now, s) {
    if (!ev.boltAt) ev.boltAt = now + 1500;
    if (!ev.bolt && now > ev.boltAt) {
      var x = L.cx + (Math.random() - 0.5) * W * 0.8, dx = x - L.cx, top = L.cy - Math.sqrt(Math.max(0, L.R * L.R - dx * dx));
      ev.bolt = { t0: now, x: x, y: top + 6 + Math.random() * Math.max(4, H - top - 10) };
    }
    var e = ev.bolt;
    if (!e) return;
    var t = (now - e.t0) / 260;
    if (t >= 1) { ev.bolt = null; ev.boltAt = now + 900 + Math.random() * 3500; return; }
    if (lightAtSite(s) > 0.15) return;                            // only seen against the dark
    var a = (t < 0.25 || (t > 0.5 && t < 0.65)) ? 0.55 : 0.12;
    b.save(); b.globalCompositeOperation = 'lighter';
    var g = b.createRadialGradient(e.x, e.y, 0, e.x, e.y, 14);
    g.addColorStop(0, 'rgba(220,230,255,' + a + ')'); g.addColorStop(1, 'rgba(160,180,255,0)');
    b.fillStyle = g; b.fillRect(e.x - 14, e.y - 14, 28, 28);
    b.restore();
  }

  // ---- the Wayfarer ---------------------------------------------------------------------------------------------------
  // Her night copy: the hull in the planet's shadow, its lamps (portholes, the gallery, the keel and engine rings) kept.
  function prepShip() {
    var m = BridgeCine.get('mothership');
    if (!m) return;
    var c = document.createElement('canvas');
    c.width = m.w; c.height = m.h;
    var g = c.getContext('2d');
    g.drawImage(m.img, 0, 0);
    var id = g.getImageData(0, 0, m.w, m.h), d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], gg = d[i + 1], bb = d[i + 2];
      var lamp = (r > 190 && gg > 150 && bb < 150) || (bb > 190 && gg > 190 && r < 150);
      if (!lamp) { d[i] = r * 0.26 + 4; d[i + 1] = gg * 0.3 + 6; d[i + 2] = bb * 0.44 + 16; }
    }
    g.putImageData(id, 0, 0);
    var sk = null, s = BridgeCine.get('shuttle-down');
    if (s) {                                                       // the skiff at half size, smoothed once so it still reads
      sk = document.createElement('canvas');
      sk.width = Math.round(s.w / 2); sk.height = Math.round(s.h / 2);
      var sg = sk.getContext('2d');
      sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
      sg.drawImage(s.img, 0, 0, sk.width, sk.height);
    }
    ship = { img: m.img, night: c, w: m.w, h: m.h, a: m.anchors, skiff: sk };
    shipAt = performance.now();
  }

  // where she is this frame (top-left, whole pixels): a slow drift and bob
  function shipPos(now) {
    var cx = L.ship[0] + Math.sin(now / 9000) * 3, cy = L.ship[1] + Math.sin(now / 3100) * 1.6;
    return [Math.round(cx - ship.w / 2), Math.round(cy - ship.h / 2)];
  }

  var MASTS = [[111, 8, 0], [162, 0, 380], [210, 15, 760]];       // masthead strobes (sprite px, phase ms)
  function drawShip(b, now, lit, thrust) {
    if (!ship) return null;
    var a = clamp((now - shipAt) / 700, 0, 1);
    if (a <= 0) return null;
    var p = shipPos(now), x = p[0], y = p[1];
    b.globalAlpha = a;
    for (var i = 0; i < 2; i++) {                                  // the aether rings idling (flaring as she goes)
      var e = ship.a['exhaust_' + i];
      if (e) BridgeCine.flame(b, x + e[0], y + e[1], 6 + i * 2 + Math.sin(now / 420 + i) * 1.5 + thrust * 40, -1, 0, now + i * 70, AETHER, 3 + thrust * 2);
    }
    b.drawImage(ship.night, x, y);
    if (lit > 0.01) { b.globalAlpha = a * lit; b.drawImage(ship.img, x, y); b.globalAlpha = a; }
    // her lights: white strobes at the mastheads, red astern and green at the bowsprit, the keel's glow breathing
    b.save();
    b.globalCompositeOperation = 'lighter';
    for (var m = 0; m < MASTS.length; m++) {
      var ph = ((now + MASTS[m][2]) % 2600) / 2600;
      if (ph < 0.035 || (ph > 0.09 && ph < 0.12)) glow(b, x + MASTS[m][0], y + MASTS[m][1], '255,255,255', 0.95 * a, 5);
    }
    glow(b, x + 23, y + 47, '255,70,60', (0.55 + 0.35 * Math.sin(now / 700)) * a, 4);
    glow(b, x + 301, y + 73, '80,255,140', (0.55 + 0.35 * Math.sin(now / 700 + 1.5)) * a, 4);
    var kg = b.createRadialGradient(x + 100, y + 116, 0, x + 100, y + 116, 26);
    kg.addColorStop(0, 'rgba(90,230,240,' + ((0.12 + 0.06 * Math.sin(now / 900)) * a).toFixed(3) + ')'); kg.addColorStop(1, 'rgba(90,230,240,0)');
    b.fillStyle = kg; b.fillRect(x + 74, y + 100, 52, 30);
    b.restore();
    b.globalAlpha = 1;
    return p;
  }
  function glow(b, x, y, rgb, a, r) {
    var g = b.createRadialGradient(x + 0.5, y + 0.5, 0, x + 0.5, y + 0.5, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + (a * 0.55).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    b.fillStyle = g; b.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1);
    b.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')'; b.fillRect(x, y, 1, 1);
  }

  // now and then the skiff drops out of the bay and dives for the surface, a streak of re-entry behind her
  function drawSkiff(b, now, p) {
    if (!ship || !ship.skiff || !p) return;
    if (!ev.shAt) ev.shAt = now + 9000;
    if (!ev.sh && now > ev.shAt && !boarding) ev.sh = { t0: now };
    var e = ev.sh;
    if (!e) return;
    var t = (now - e.t0) / 6500;
    if (t >= 1) { ev.sh = null; ev.shAt = now + 38000 + Math.random() * 30000; return; }
    var bay = ship.a.bay || [ship.w * 0.45, ship.h * 0.8], x0 = p[0] + bay[0], y0 = p[1] + bay[1];
    b.save();
    if (t < 0.3) {                                                 // the bay opening: a glow under the hull
      b.globalCompositeOperation = 'lighter';
      var bg = b.createRadialGradient(x0, y0, 0, x0, y0, 12);
      bg.addColorStop(0, 'rgba(255,220,160,' + (0.5 * Math.sin(t / 0.3 * Math.PI)).toFixed(2) + ')'); bg.addColorStop(1, 'rgba(255,220,160,0)');
      b.fillStyle = bg; b.fillRect(x0 - 12, y0 - 12, 24, 24);
      b.globalCompositeOperation = 'source-over';
    }
    var drop = smooth(0.05, 0.22, t) * 7, d = clamp((t - 0.18) / 0.82, 0, 1), e2 = d * d;
    var tx = L.target[0], ty = L.target[1];
    var x = x0 + (tx - x0) * e2, y = y0 + drop + (ty - y0 - drop) * e2;
    var sc = 1 - 0.88 * e2, k = ship.skiff, a = t < 0.08 ? t / 0.08 : t > 0.86 ? (1 - t) / 0.14 : 1;
    if (d > 0.3) {                                                 // re-entry
      b.globalCompositeOperation = 'lighter';
      var len = 10 + 30 * d, ang = Math.atan2(ty - y0, tx - x0);
      var g = b.createLinearGradient(x, y, x - Math.cos(ang) * len, y - Math.sin(ang) * len);
      g.addColorStop(0, 'rgba(255,200,140,' + (0.75 * a * (d - 0.3) / 0.7).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,110,60,0)');
      b.strokeStyle = g; b.lineWidth = Math.max(1, 2 * sc);
      b.beginPath(); b.moveTo(x, y); b.lineTo(x - Math.cos(ang) * len, y - Math.sin(ang) * len); b.stroke();
      b.globalCompositeOperation = 'source-over';
    }
    b.globalAlpha = a;
    var w = Math.max(2, Math.round(k.width * sc)), h = Math.max(1, Math.round(k.height * sc));
    b.drawImage(k, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    b.restore();
  }

  // the ground she's over, marked on the HUD: corner ticks round it and a leader out to its name (#ti-site)
  function markSite(b, now) {
    if (!L.mark || !planetAt || now - planetAt < 900) return;
    var x = Math.round(L.mark[0]), y = Math.round(L.mark[1]), r = 4, a = 0.65 + 0.3 * Math.sin(now / 520);
    function marks(dx, dy) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
        var cx = x + c[0] * r + dx, cy = y + c[1] * r + dy;
        b.fillRect(c[0] < 0 ? cx : cx - 1, cy, 2, 1);
        b.fillRect(cx, c[1] < 0 ? cy : cy - 1, 1, 2);
      });
      b.fillRect(x + dx, y + dy, 1, 1);
      for (var i = 1; i <= 7; i++) b.fillRect(x + r + 1 + i + dx, y - r - 1 - i + dy, 1, 1);   // the leader: up and out,
      b.fillRect(x + r + 9 + dx, y - r - 8 + dy, 18, 1);                                       // then along under the name
    }
    b.fillStyle = 'rgba(2,8,18,' + (a * 0.6).toFixed(2) + ')';                               // a dark edge, to read on a bright sea
    marks(1, 1);
    b.fillStyle = 'rgba(170,246,255,' + a.toFixed(2) + ')';
    marks(0, 0);
  }
  function placeSiteLabel() {
    var el = $('ti-site');
    if (!el || !L || !L.mark) return;
    var dpr = window.devicePixelRatio || 1, k = zoom / dpr;
    el.style.left = Math.round((L.mark[0] + 4 + 9) * k) + 'px';
    el.style.top = Math.round((L.mark[1] - 4 - 9) * k) + 'px';
    el.classList.toggle('on', !!planetAt && performance.now() - planetAt > 900);
  }
  // what's next for the ground below: the sun coming up or going down, on the planet's clock
  function siteNote() {
    if (P.giant) return 'HOLDING 3.2 KM OFF';
    if (P.hole) return 'HORIZON 9.4 KM · HOLDING';
    if (P.night) return 'NIGHT, AS EVER';
    var C = typeof BridgeClock !== 'undefined' ? BridgeClock : null, k = C ? C.sky(P.id) : null;
    if (!k || !k.cycles) return '';
    if (k.sunrise == null) return 'THE MIDNIGHT SUN';
    var t = k.t, H = 3600000, up = t >= k.sunrise && t < k.sunset;
    var next = up ? k.sunset - t : (t < k.sunrise ? k.sunrise - t : k.len - t + k.sunrise);
    return (up ? 'SUNSET IN ' : 'SUNRISE IN ') + C.fmtHours(next / H);
  }

  function drawVignette(b) {
    if (!vignette) {
      vignette = document.createElement('canvas');
      vignette.width = W; vignette.height = H;
      var g = vignette.getContext('2d'), r = Math.max(W, H) * 0.75;
      var grd = g.createRadialGradient(W / 2, H * 0.45, r * 0.45, W / 2, H * 0.45, r);
      grd.addColorStop(0, 'rgba(0,0,6,0)'); grd.addColorStop(1, 'rgba(0,0,6,0.55)');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
    }
    b.drawImage(vignette, 0, 0);
  }

  // things that take a moment to make (the nebula, the planet's texture) are made a frame or two apart after the stars
  // are up, so the page draws at once — the ship's systems coming online
  function stage(now) {
    if (!neb && now - shownAt > 120 && typeof BridgeCine !== 'undefined' && BridgeCine.nebula) {
      neb = BridgeCine.nebula(P.id, W, H); nebAt = now;
    } else if (neb && !planetAt && now - nebAt > 60) {
      planetAt = now;
    }
    if (!cineAsked && typeof BridgeCine !== 'undefined') {
      cineAsked = true;
      BridgeCine.load().then(function () { if (active || boarding) prepShip(); });
    }
  }

  function render(now) {
    var b = bx, s = sun(), L0 = lightAtSite(s);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.imageSmoothingEnabled = false;
    b.fillStyle = '#020208'; b.fillRect(0, 0, W, H);
    if (neb) { b.globalAlpha = 0.62 * clamp((now - nebAt) / 1400, 0, 1); b.drawImage(neb, 0, 0, W, H); b.globalAlpha = 1; }
    drawStars(b, now, clamp((now - shownAt) / 700, 0, 1));
    shootingStar(b, now);
    drawWorld(b, now, s);
    if (!boarding && BridgeState.getState() === 'intro') markSite(b, now);
    var lit = P.giant || P.hole ? 1 : smooth(-0.32, -0.02, L0);    // she's in the planet's shadow a while after sunset
    var thrust = boarding ? smooth(0, 0.6, (now - boarding.t0) / BOARD_MS) : 0;
    var p = drawShip(b, now, lit, thrust);
    drawSkiff(b, now, p);
    drawVignette(b);
    return p;
  }

  // ================================================================================================================
  //  BOARDING — the push in through the stern gallery to a flash, then the bridge
  // ================================================================================================================
  var BOARD_MS = 1350;
  function board(then) {
    if (boarding) return;
    if (!active) { if (then) then(); return; }
    boarding = { t0: performance.now(), then: then, fired: false };
    sfx('warp');
    if (overlay) overlay.classList.add('ti-going');
  }
  function unboard(msg) {
    boarding = null;
    if (overlay) overlay.classList.remove('ti-going');
    if (msg) bootNote(msg);
  }
  function drawBoarding(now, p) {
    var t = clamp((now - boarding.t0) / BOARD_MS, 0, 1), e = t * t * (3 - 2 * t) * 0.6 + t * t * t * 0.4;
    // the gallery's windows (sprite px 30-59, 57-63): the bridge is behind them
    var fx0 = p ? p[0] + 44 : W / 2, fy0 = p ? p[1] + 60 : H / 2;
    var z = 1 + 9 * e * e, fx = fx0 + (W / 2 - fx0) * e, fy = fy0 + (H / 2 - fy0) * e;
    zx.setTransform(1, 0, 0, 1, 0, 0);
    zx.imageSmoothingEnabled = false;
    zx.globalCompositeOperation = 'source-over'; zx.globalAlpha = 1;
    zx.fillStyle = '#020208'; zx.fillRect(0, 0, W, H);
    zx.drawImage(buf, fx0 - fx / z, fy0 - fy / z, W / z, H / z, 0, 0, W, H);
    // light rushing past, out of the window
    zx.save();
    zx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 70; i++) {
      var ang = hash(i * 3) * 6.2832, sp = ((now / 520) + hash(i * 5)) % 1, r0 = Math.pow(sp, 2) * Math.max(W, H) * 0.7 * (0.3 + e);
      var r1 = r0 + (4 + sp * 40) * e;
      zx.strokeStyle = 'rgba(' + (i % 3 ? '200,225,255' : '170,150,255') + ',' + (0.75 * sp * e).toFixed(2) + ')';
      zx.lineWidth = sp > 0.75 ? 2 : 1;
      zx.beginPath(); zx.moveTo(fx + Math.cos(ang) * r0, fy + Math.sin(ang) * r0); zx.lineTo(fx + Math.cos(ang) * r1, fy + Math.sin(ang) * r1); zx.stroke();
    }
    var gl = zx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(W, H) * (0.1 + e * 0.9));
    gl.addColorStop(0, 'rgba(210,250,255,' + (0.9 * smooth(0.35, 0.85, t)).toFixed(2) + ')');
    gl.addColorStop(1, 'rgba(150,120,255,0)');
    zx.fillStyle = gl; zx.fillRect(0, 0, W, H);
    zx.restore();
    var fl = smooth(0.72, 1, t);                                     // the flash, held until the bridge is ready
    if (fl > 0) { zx.fillStyle = 'rgba(232,226,255,' + fl.toFixed(2) + ')'; zx.fillRect(0, 0, W, H); }
    if (t >= 1 && !boarding.fired) {
      boarding.fired = true;
      var go = boarding.then;
      setTimeout(function () { if (go) go(); }, 0);
    }
    return zbuf;
  }
  // a soft white fading off whatever comes next (the bridge)
  function flashOut() {
    var f = document.createElement('div');
    f.className = 'ti-flash';
    document.body.appendChild(f);
    void f.offsetHeight;
    f.classList.add('out');
    setTimeout(function () { f.remove(); }, 1100);
  }

  // ================================================================================================================
  //  THE WORDMARK — the ANSI letters as pixels: printed in, glowing, scanlined, swept, now and then a glitch
  // ================================================================================================================
  var CW = 4, CH = 8, PAD = 9;
  var LINES = { '═': 'lr', '║': 'ud', '╗': 'ld', '╔': 'rd', '╚': 'ur', '╝': 'ul' };
  var markBmp = null, markRows = null, mk = { el: null, ctx: null, k: 0, glow: null, tmp: null, tx: null, sweepAt: 0, glitchAt: 0, glitch: null };
  function buildMark() {
    if (markBmp) return;
    markRows = ASCII_LOGO.split('\n');
    var cols = 0;
    markRows.forEach(function (r) { cols = Math.max(cols, r.length); });
    var w = cols * CW + PAD * 2, h = markRows.length * CH + PAD * 2;
    markBmp = document.createElement('canvas');
    markBmp.width = w; markBmp.height = h;
    var g = markBmp.getContext('2d'), TONES = ['#f8fcff', '#e2f4fc', '#bfe6f4', '#93d2ea'], rowsH = markRows.length * CH;
    for (var r = 0; r < markRows.length; r++) {
      for (var i = 0; i < markRows[r].length; i++) {
        var c = markRows[r][i], x = PAD + i * CW, y = PAD + r * CH;
        if (c === '█') {
          for (var yy = 0; yy < CH; yy++) { g.fillStyle = TONES[Math.min(3, Math.floor((r * CH + yy) / rowsH * 4))]; g.fillRect(x, y + yy, CW, 1); }
        } else if (LINES[c]) {                                     // the shadow: a 1-px line from the cell's middle to its edges
          g.fillStyle = '#3c9cc4';
          var mx = x + 2, my = y + 4, dd = LINES[c];
          if (dd.indexOf('l') >= 0) g.fillRect(x, my, 3, 1);
          if (dd.indexOf('r') >= 0) g.fillRect(mx, my, CW - 2, 1);
          if (dd.indexOf('u') >= 0) g.fillRect(mx, y, 1, 5);
          if (dd.indexOf('d') >= 0) g.fillRect(mx, my, 1, CH - 4);
        }
      }
    }
    mk.tmp = document.createElement('canvas');
    mk.tmp.width = w; mk.tmp.height = h;
    mk.tx = mk.tmp.getContext('2d');
  }
  // the canvas sized to a whole number of device pixels per letter pixel, as wide as fits
  function fitMark() {
    if (!mk.el) return;
    var dpr = window.devicePixelRatio || 1, vw = window.innerWidth;
    var maxCss = vw < 720 ? vw - 28 : Math.min(vw * 0.62, 820);
    var k = Math.max(1, Math.floor(maxCss * dpr / markBmp.width));
    if (k === mk.k && mk.el.width === markBmp.width * k) return;
    mk.k = k;
    mk.el.width = markBmp.width * k; mk.el.height = markBmp.height * k;
    mk.el.style.width = (markBmp.width * k / dpr) + 'px'; mk.el.style.height = (markBmp.height * k / dpr) + 'px';
    mk.ctx = mk.el.getContext('2d');
    // the glow: the letters' silhouette blurred, cyan close in and violet wider (shadows thrown in from off the canvas)
    var big = document.createElement('canvas'), bg = big.getContext('2d');
    big.width = mk.el.width; big.height = mk.el.height;
    bg.imageSmoothingEnabled = false;
    bg.drawImage(markBmp, 0, 0, big.width, big.height);
    var gc = document.createElement('canvas'), gg = gc.getContext('2d'), off = big.width + 40;
    gc.width = big.width; gc.height = big.height;
    gg.shadowOffsetX = off;
    gg.shadowColor = 'rgba(170,120,255,0.55)'; gg.shadowBlur = 16 * k; gg.drawImage(big, -off, 0);
    gg.shadowColor = 'rgba(110,225,255,0.8)'; gg.shadowBlur = 5 * k; gg.drawImage(big, -off, 0);
    mk.glow = gc;
  }

  var PRINT_AT = 250, ROW_MS = 105;
  function drawMark(now) {
    if (!mk.ctx || !markBmp) return;
    var c = mk.ctx, k = mk.k, w = markBmp.width, h = markBmp.height, tx = mk.tx, el = now - shownAt;
    var rowsN = markRows.length, done = booted || el > PRINT_AT + rowsN * ROW_MS;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // the letters so far: rows printed in turn, left to right, like a terminal
    tx.clearRect(0, 0, w, h);
    tx.globalCompositeOperation = 'source-over';
    tx.drawImage(markBmp, 0, 0);
    var headR = -1, headC = 0;
    if (!done) {
      var p = Math.max(0, (el - PRINT_AT) / ROW_MS);
      headR = Math.min(rowsN - 1, Math.floor(p));
      headC = Math.floor((p - headR) * (markRows[headR].length + 2));
      var y0 = PAD + headR * CH;
      tx.clearRect(PAD + headC * CW, y0, w, CH);
      tx.clearRect(0, y0 + CH, w, h);
    }
    // a light sweeping across the letters now and then
    if (done && !reduce) {
      if (!mk.sweepAt) mk.sweepAt = now + 900;
      var st = (now - mk.sweepAt) / 1100;
      if (st > 1) mk.sweepAt = now + 6500 + Math.random() * 3000;
      else if (st > 0) {
        var sx = -40 + st * (w + 80);
        tx.globalCompositeOperation = 'source-atop';
        var sg = tx.createLinearGradient(sx - 18, 0, sx + 18, h);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        tx.fillStyle = sg; tx.fillRect(0, 0, w, h);
        tx.globalCompositeOperation = 'source-over';
      }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, mk.el.width, mk.el.height);
    c.imageSmoothingEnabled = false;
    if (done) { c.globalAlpha = 0.6 + 0.22 * Math.sin(now / 1400); c.drawImage(mk.glow, 0, 0); c.globalAlpha = 1; }
    // a rare glitch: a slice or two of the letters jumps sideways, split cyan and magenta
    if (done && !reduce) {
      if (!mk.glitchAt) mk.glitchAt = now + 5000 + Math.random() * 6000;
      if (!mk.glitch && now > mk.glitchAt) {
        mk.glitch = { t0: now, y: PAD + Math.floor(Math.random() * (h - PAD * 2 - 6)), hgt: 3 + Math.floor(Math.random() * 5), dx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 3)) };
      }
    }
    var G = mk.glitch;
    if (G && now - G.t0 > 120) { mk.glitch = G = null; mk.glitchAt = now + 9000 + Math.random() * 8000; }
    c.drawImage(mk.tmp, 0, 0, w * k, h * k);
    if (G) {
      c.clearRect(0, G.y * k, w * k, G.hgt * k);
      c.drawImage(mk.tmp, 0, G.y, w, G.hgt, G.dx * k, G.y * k, w * k, G.hgt * k);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5;
      c.drawImage(mk.tmp, 0, G.y, w, G.hgt, (G.dx + 1) * k, G.y * k, w * k, G.hgt * k);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    // the print head: a block cursor
    if (headR >= 0) { c.fillStyle = '#9ff0ff'; c.fillRect((PAD + headC * CW) * k, (PAD + headR * CH) * k, CW * k, CH * k); }
    // scanlines: the last device row of every letter pixel a shade darker
    if (k >= 2) {
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = 'rgba(0,0,0,0.22)';
      for (var y = 0; y < h; y++) c.fillRect(0, y * k + k - 1, w * k, 1);
      c.globalCompositeOperation = 'source-over';
    }
  }

  // ================================================================================================================
  //  THE PAGE — HUD, boot lines, menu
  // ================================================================================================================
  function build() {
    overlay.innerHTML =
      '<div class="ti" id="ti">' +
        '<div class="ti-scrim"></div>' +
        '<div class="ti-frame"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>' +
        '<div class="ti-read ti-l" id="ti-where"></div>' +
        '<div class="ti-read ti-r" id="ti-clock"></div>' +
        '<div class="ti-site" id="ti-site"></div>' +
        '<div class="ti-head"><canvas id="ti-mark" role="img" aria-label="BECKNOLOGY"></canvas>' +
          '<div class="ti-sub">THE BRIDGE<b class="ti-cur"></b></div>' +
          '<div class="ti-read ti-m" id="ti-mini"></div></div>' +
        '<div class="ti-panel" id="ti-panel">' +
          '<div class="ti-boot" id="ti-boot"></div>' +
          '<div class="ti-menu" id="ti-menu"></div>' +
          '<div class="ti-wire" id="ti-wire"></div>' +
        '</div>' +
        '<div class="ti-hint" id="ti-hint"></div>' +
      '</div>';
    mk.el = $('ti-mark'); mk.k = 0;
    buildMark(); fitMark();
    renderMenu();
    renderBoot(booted ? 1e9 : 0);
    hud(true);
    var touch = document.documentElement.classList.contains('touch');
    $('ti-hint').textContent = pilotName ? (touch ? 'TAP TO CONTINUE' : 'ENTER TO CONTINUE · ↑↓ TO CHOOSE')
                                         : (touch ? 'TAP TO BEGIN' : 'ENTER TO BEGIN · ↑↓ TO CHOOSE');
  }

  // ---- the boot lines: the ship's systems coming online ----------------------------------------------------------
  var bootExtra = null;
  function bootLines() {
    var rows = [
      ['WAYFARER OS 7.3', 'READY'],
      ['AETHER DRIVE', 'IDLE'],
      ['NAV · ' + (P.giant || P.hole ? P.name : P.name + ' orbit').toUpperCase(), 'HOLDING'],
      pilotName ? ['PILOT · ' + pilotName, 'ABOARD'] : ['PILOT RECORD', 'NONE ON FILE', 'none']
    ];
    if (bootExtra) rows.push([bootExtra, 'FAULT', 'bad']);
    return rows;
  }
  function renderBoot(el) {
    var box = $('ti-boot');
    if (!box) return;
    var rows = bootLines(), html = '', LINE = 170;
    for (var i = 0; i < rows.length; i++) {
      var t = el - 120 - i * LINE;
      if (t < 0 && !booted) break;
      var txt = rows[i][0], n = booted ? txt.length : Math.min(txt.length, Math.floor(t / LINE * 1.6 * txt.length));
      var ok = booted || t > LINE * 0.85;
      html += '<div class="ti-bl' + (rows[i][2] ? ' ' + rows[i][2] : '') + '"><span class="ti-bt">&gt; ' + esc(txt.slice(0, n)) + '</span>' +
              (ok ? '<span class="ti-dots"></span><span class="ti-ok">' + esc(rows[i][1]) + '</span>' : '') + '</div>';
    }
    if (box._html !== html) { box.innerHTML = html; box._html = html; }
    if (!booted && el > 120 + rows.length * LINE + 200) { booted = true; overlay && overlay.classList.add('ti-ready'); }
  }
  function bootNote(msg) { bootExtra = msg; renderBoot(1e9); }

  // ---- the menu ----------------------------------------------------------------------------------------------------
  function soundLabel() {
    var m = typeof BridgeAudio !== 'undefined' && BridgeAudio.mode ? BridgeAudio.mode() : 'all';
    return m === 'all' ? '♫ Sound on' : m === 'sfx' ? '♪ Effects only' : '× Sound off';
  }
  function renderMenu() {
    var box = $('ti-menu');
    if (!box) return;
    items = [];
    var html = '';
    if (pilotName) {
      items.push('go');
      html += '<button class="ti-item ti-card" data-id="go">' +
        '<canvas class="ti-face" id="ti-face" width="24" height="24"></canvas>' +
        '<span class="ti-cb"><span class="ti-kick">CONTINUE AS</span><span class="ti-name">' + esc(pilotName) + '</span>' +
        '<span class="ti-line">The Wayfarer · ' + esc((P.giant || P.hole ? 'at ' : 'over ') + P.name) + '</span>' +
        '<span class="ti-line ti-stats"><span class="ti-coins" id="ti-coins"' + (coins == null ? ' hidden' : '') + '><i></i><b id="ti-coinn">' + (coins == null ? '' : Number(coins).toLocaleString('en-US')) + '</b></span>' +
        '<span id="ti-ptime"></span></span></span>' +
        '<span class="ti-go">▸</span></button>';
      items.push('switch');
    } else {
      items.push('new');
      html += '<button class="ti-item ti-big" data-id="new"><span class="ti-gl">▸</span><span class="ti-cb"><span class="ti-name">NEW PILOT</span>' +
              '<span class="ti-line">Make your pilot and take the helm</span></span></button>';
      items.push('signin');
      html += '<button class="ti-item ti-big" data-id="signin"><span class="ti-gl">▸</span><span class="ti-cb"><span class="ti-name">SIGN IN</span>' +
              '<span class="ti-line">You have a callsign already</span></span></button>';
    }
    items.push('sound');
    html += '<div class="ti-row">' +
      (pilotName ? '<button class="ti-item ti-small" data-id="switch">Switch pilot</button>' : '') +
      '<button class="ti-item ti-small" data-id="sound" id="ti-sound">' + esc(soundLabel()) + '</button></div>';
    box.innerHTML = html;
    sel = clamp(sel, 0, items.length - 1);
    paintSel();
    drawFace();
    clockLine();
  }
  function paintSel() {
    var els = overlay ? overlay.querySelectorAll('.ti-item') : [];
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('sel', els[i].getAttribute('data-id') === items[sel]);
  }
  function move(d) {
    sel = (sel + d + items.length) % items.length;
    paintSel();
    var el = overlay.querySelector('.ti-item[data-id="' + items[sel] + '"]');
    if (el) el.focus({ preventScroll: true });
    sfx('blip');
  }

  // their face: the head and shoulders of the standing sheet in what they wear (js/look.js, js/gear.js)
  function drawFace() {
    var cv = $('ti-face');
    if (!cv || typeof BridgeLook === 'undefined') return;
    var G = typeof BridgeGear !== 'undefined' ? BridgeGear : null;
    var colour = (G && G.colour()) || (lookup && lookup._suit) || 'purple';
    if (!BridgeLook.SUITS[colour]) colour = 'purple';
    var sh = BridgeLook.sheet('', G ? G.style() : 'flight', colour, BridgeLook.get()), tries = 0;
    (function paint() {
      if (!cv.isConnected) return;
      if (!sh.ready) { if (++tries < 80) setTimeout(paint, 80); return; }
      var g = cv.getContext('2d');
      g.clearRect(0, 0, 24, 24);
      g.imageSmoothingEnabled = false;
      g.drawImage(sh.img, 4, 2, 24, 24, 0, 0, 24, 24);
      cv.classList.add('on');
    })();
  }

  // the planet's time and season, for the card and the HUD
  function planetTime() {
    var C = typeof BridgeClock !== 'undefined' ? BridgeClock : null;
    if (!C) return null;
    var et = C.etParts(), ets = (et.h < 10 ? '0' : '') + et.h + ':' + (et.m < 10 ? '0' : '') + et.m;
    if (P.giant || P.hole) return { short: 'Ship time ' + ets + ' ET', clock: 'SHIP TIME · ' + ets + ' ET', sub: 'NO SUN TO KEEP', et: ets };
    if (P.night) {
      var b = C.bustle();
      return { short: 'Night, as ever', clock: 'ARCADIA · NIGHT, AS EVER', sub: (b > 0.9 ? 'THE STREETS ARE FULL' : b > 0.5 ? 'BUSY' : 'QUIET') + ' · ' + ets + ' ET', et: ets };
    }
    var k = C.sky(P.id), part = PART[k.part] || k.part, season = k.season ? k.season.name : '';
    return { short: k.time.text + ' ' + part + (season ? ' · ' + season : ''), part: part,
             clock: P.name.toUpperCase() + ' ' + k.time.text + ' / ' + (k.len / 3600000) + ':00 · ' + part.toUpperCase(),
             sub: (season ? season.toUpperCase() : '') + wxName() + ' · ' + ets + ' ET', et: ets };
  }
  function wxName() { var w = weather(); return w && w.def ? ' · ' + w.def.name.toUpperCase() : ''; }
  function clockLine() {
    var el = $('ti-ptime'), T = planetTime();
    if (el && T) el.textContent = T.short;
  }

  // the HUD's readouts: where she is over the ground (the longitude turning with the planet), the planet's clock
  function hud(force) {
    var now = performance.now();
    if (!force && now - hudAt < 500) return;
    hudAt = now;
    var T = planetTime(), where = $('ti-where'), clk = $('ti-clock'), mini = $('ti-mini');
    var line1 = 'WAYFARER · ' + (P.giant ? 'HOLDING OFF THE STATION' : P.hole ? 'HOLDING AT A SAFE DISTANCE' : 'PARKED IN ORBIT');
    var line2;
    if (L && L.siteN && !P.giant && !P.hole) {
      var lat = Math.asin(clamp(-L.siteN[1], -1, 1)) * 180 / Math.PI;
      var lon = ((Date.now() * SPIN * 360 + 112.4) % 360 + 360) % 360 - 180;
      line2 = P.name.toUpperCase() + ' · ALT ' + (P.alt + Math.sin(Date.now() / 7000) * 0.4).toFixed(1) + ' KM · ' +
              Math.abs(lat).toFixed(1) + '°' + (lat >= 0 ? 'N' : 'S') + ' ' + Math.abs(lon).toFixed(2) + '°' + (lon >= 0 ? 'E' : 'W');
    } else line2 = P.name.toUpperCase() + ' · ' + P.site.toUpperCase();
    if (where) where.innerHTML = esc(line1) + '<br>' + esc(line2);
    if (clk && T) clk.innerHTML = esc(T.clock) + '<br>' + esc(T.sub);
    if (mini && T) mini.textContent = (P.giant || P.hole ? P.name : P.name + ' · ' + T.short).toUpperCase();
    var site = $('ti-site');
    if (site && L) { site.innerHTML = '◇ ' + esc(P.site.toUpperCase()) + '<small>' + esc(siteNote()) + '</small>'; placeSiteLabel(); }
    clockLine();
    var snd = $('ti-sound');
    if (snd) { var lab = soundLabel(); if (snd.textContent !== lab) snd.textContent = lab; }
  }

  // ---- who's on the wire -------------------------------------------------------------------------------------------
  // A short look at the lobby's presence: join, read who's there, leave — every 45 s while the title's up and the tab
  // is in front. BridgeProgression's client has its own socket, so this never touches BridgeNet's channel.
  function wireClient() {
    try { return typeof BridgeProgression !== 'undefined' && BridgeProgression.client ? BridgeProgression.client() : null; } catch (e) { return null; }
  }
  function peek() {
    clearTimeout(wireTimer);
    if (!active || !pilotName) return;
    wireTimer = setTimeout(peek, 45000);
    if (document.hidden || BridgeState.getState() !== 'intro') return;
    var c = wireClient();
    if (!c || !c.channel) return;
    var ch = null, closed = false;
    function close() { if (closed) return; closed = true; if (peeking === close) peeking = null; try { c.removeChannel(ch); } catch (e) { /* gone */ } }
    if (peeking) peeking();
    peeking = close;
    try {
      ch = c.channel('bridge-lobby', { config: { presence: { key: 'title-' + Math.random().toString(36).slice(2, 10) } } });
      ch.on('presence', { event: 'sync' }, function () {
        var st = {};
        try { st = ch.presenceState() || {}; } catch (e) { st = {}; }
        var seen = {}, list = [];
        Object.keys(st).forEach(function (k) {
          (st[k] || []).forEach(function (m) {
            if (!m || !m.name || seen[k] || String(m.name).toUpperCase() === String(pilotName).toUpperCase()) return;
            seen[k] = 1;
            list.push({ name: String(m.name), place: m.place || '', away: !!m.away });
          });
        });
        wireList = list;
        paintWire();
      });
      ch.subscribe(function (status) { if (status === 'SUBSCRIBED') setTimeout(close, 3500); });
      setTimeout(close, 9000);
    } catch (e) { close(); }
  }
  function paintWire() {
    var el = $('ti-wire');
    if (!el) return;
    if (!wireList.length) { el.innerHTML = ''; el.classList.remove('on'); return; }
    el.innerHTML = '<span class="ti-dot"></span>ON THE WIRE · ' + wireList.slice(0, 3).map(function (p) {
      return '<b>' + esc(p.name.toUpperCase()) + '</b>' + (p.place ? ' <span>' + esc(p.place) + (p.away ? ', away' : '') + '</span>' : '');
    }).join(' · ') + (wireList.length > 3 ? ' +' + (wireList.length - 3) : '');
    el.classList.add('on');
  }

  // ---- what the choices do ---------------------------------------------------------------------------------------
  function activate(id) {
    if (boarding || !active) return;
    if (id === 'go') return continueAs();
    if (id === 'sound') {
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.cycle();
      var snd = $('ti-sound');
      if (snd) snd.textContent = soundLabel();
      return;
    }
    sfx('open');
    if (id === 'switch' || id === 'begin') BridgeState.transition('identity');
    else if (id === 'new') BridgeState.transition('identity', { form: 'new' });
    else if (id === 'signin') BridgeState.transition('identity', { form: 'returning' });
  }

  // Continue: look the pilot up (begun when the title opened), push in to the bridge. Not found → the identity screen
  // (as it always did); the records out of reach → back on the title with a note, the pilot remembered.
  function continueAs() {
    var look = lookup || (lookup = findPilot(pilotName));
    board(function () {
      look.then(function (res) {
        if (!active) return;
        if (res && !res.error) {
          BridgeState.setPilot(res);
          BridgeDB.updateLastSeen(res.id);
          BridgeWorld.load('bridge', function () { BridgeState.transition('world', { worldId: 'bridge' }); });
        } else if (res && /NO PILOT/i.test(res.error)) {
          BridgeState.clearPilot();
          pilotName = null; lookup = null;
          unboard();
          BridgeState.transition('identity');
        } else {
          lookup = null;
          unboard('COMMS DOWN · RECORDS OUT OF REACH');
        }
      });
    });
  }
  function findPilot(name) {
    var p = Promise.resolve(BridgeDB.lookupPilot(name)).catch(function () { return { error: 'LOOKUP FAILED' }; });
    p.then(function (res) {
      if (p !== lookup) return;
      if (res && !res.error) { p._suit = res.suit_color; drawFace(); balance(res.id); }
      else if (!res || !/NO PILOT/i.test(res.error)) lookup = null;        // out of reach just now: ask again on Continue
    });
    return p;
  }

  // their coins, read by the pilot's id (not BridgeProgression.getBalance: that keeps the first pilot it looks up for
  // the page's life, and Switch pilot would leave it paying the wrong one)
  function balance(id) {
    var c = typeof BridgeDB !== 'undefined' && BridgeDB.client ? BridgeDB.client() : null;
    if (!c || !id) return;
    try {
      Promise.resolve(c.from('pilot_coins').select('balance').eq('pilot_id', id).maybeSingle()).then(function (r) {
        if (!r || r.error || !r.data) return;
        coins = r.data.balance;
        var el = $('ti-coins'), num = $('ti-coinn');
        if (el && num) { num.textContent = Number(coins).toLocaleString('en-US'); el.hidden = false; }
      }, function () { /* offline: no coins shown */ });
    } catch (e) { /* no client */ }
  }

  // ---- input ---------------------------------------------------------------------------------------------------------
  function onKey(e) {
    if (!active || boarding || BridgeState.getState() !== 'intro') return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || (k === 'Tab' && !e.shiftKey)) { e.preventDefault(); move(1); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || (k === 'Tab' && e.shiftKey)) { e.preventDefault(); move(-1); }
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
      var t = e.target;
      if (t && t.closest && t.closest('#intro-overlay .ti-item')) return;      // a focused choice clicks itself
      e.preventDefault();
      activate(items[sel] || items[0]);
    }
  }
  function onClick(e) {
    if (!active || boarding) return;
    var item = e.target.closest && e.target.closest('.ti-item');
    if (item) { e.stopPropagation(); activate(item.getAttribute('data-id')); return; }
    if (e.target.closest && e.target.closest('.ti-panel')) return;
    activate(pilotName ? 'go' : 'begin');                           // the sky: the first choice (someone new: who are you?)
  }
  function onHover(e) {
    var item = e.target.closest && e.target.closest('.ti-item');
    if (!item) return;
    var i = items.indexOf(item.getAttribute('data-id'));
    if (i >= 0 && i !== sel) { sel = i; paintSel(); }
  }

  // ================================================================================================================
  //  SHOW / DRAW / HIDE
  // ================================================================================================================
  function show() {
    overlay = $('intro-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');
    overlay.classList.remove('ti-going');
    overlay.classList.toggle('ti-ready', booted);
    var first = !active;
    active = true;
    boarding = null;
    P = whereNow();
    pilotName = cachedPilot();
    if (first) {
      shownAt = performance.now();
      L = null; W = 0;
      neb = null; nebAt = 0; planetAt = 0;
      ev = { starAt: 0, star: null, shAt: 0, sh: null, boltAt: 0, bolt: null };
    }
    if (pilotName && !lookup) lookup = findPilot(pilotName);
    build();
    if (!bound) {
      bound = true;
      document.addEventListener('keydown', onKey);
      overlay.addEventListener('click', onClick);
      overlay.addEventListener('pointerover', onHover);
      window.addEventListener('resize', function () { if (active) fitMark(); });
      BridgeState.onChange(function (s) {
        if (!active || s === 'intro' || s === 'identity') return;
        var was = !!boarding;
        hide();
        if (was) flashOut();
      });
    }
    var first0 = overlay.querySelector('.ti-item[data-id="' + items[sel] + '"]');
    if (first0 && !document.documentElement.classList.contains('touch')) first0.focus({ preventScroll: true });
    clearTimeout(wireTimer);
    wireTimer = setTimeout(peek, 1200);
  }

  function draw(ctx, w, h) {
    if (!active) return;
    var now = performance.now(), state = BridgeState.getState();
    var dw = ctx.canvas.width, dh = ctx.canvas.height;
    size(dw, dh);
    stage(now);
    var p = render(now), out = buf;
    if (boarding) out = drawBoarding(now, p);
    else if (state === 'identity') { bx.fillStyle = 'rgba(2,4,12,0.42)'; bx.fillRect(0, 0, W, H); }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(out, 0, 0, W * zoom, H * zoom);
    ctx.restore();
    if (state === 'intro' && !boarding) {
      drawMark(now);
      if (!booted) renderBoot(now - shownAt);
      hud(false);
    }
  }

  function hide() {
    active = false;
    boarding = null;
    clearTimeout(wireTimer);
    if (peeking) peeking();
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active', 'ti-going');
      overlay.innerHTML = '';
    }
    mk.el = null; mk.ctx = null; mk.k = 0;
    buf = bx = zbuf = zx = null; W = H = 0; L = null; neb = null; vignette = null; stars = null;
    if (typeof BridgeOrbit !== 'undefined' && BridgeOrbit.globeFree) BridgeOrbit.globeFree();
  }

  function covers() { return active; }
  // for the tests: where she is, the light on the ground under her (−1 … 1), the menu, the buffer
  function _state() {
    var s = active && L ? sun() : null;
    return { active: active, booted: booted, place: P.id, light: s ? +lightAtSite(s).toFixed(3) : null, items: items.slice(), sel: sel,
             boarding: !!boarding, ship: !!ship, planet: !!planetAt, size: [W, H, zoom], wire: wireList.slice() };
  }

  return { show: show, draw: draw, hide: hide, covers: covers, board: board, _state: _state };
})();
