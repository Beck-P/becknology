/**
 * BridgeRailway — the mountain railway between Fellhaven and Aurelle (the château town up the line), as a cutscene:
 * the panoramic train out of one station and into the other through the high country, about a minute and a half.
 * Beck: "really pretty and nice… not too long but a little while… really cool mountain scenes… dependent on the
 * season".
 *
 *   BridgeRailway.ride(from, to, opts) → Promise     from / to: 'fellhaven' | 'aurelle'; opts as BridgeCine.play
 *   BridgeCine.railway(from, to, opts)              the same, beside the jump and the sail
 *   BridgeRailway.seen()                            ridden before (then it can be skipped: click, Space, Esc)
 *   BridgeRailway._frame(i, t, env, from, to, W, H) one frame of shot i at t (0..1) into a canvas — for the tests
 *
 * The shots: leaving the station (the train standing at the platform, pulling out), inside the panoramic carriage
 * (the valley streaming past the big windows, a cup of cocoa steaming on the table), the gorge (the train on a ledge
 * under the far wall's waterfall, into a tunnel portal), the viaduct (a tall curving bridge of arches over the
 * ravine, the train small on its deck), the glacier (blue seracs and crevasses, the train close on the moraine), a
 * tunnel (dark, its lamps flicking past the windows), the high pass (peaks standing out of a sea of cloud) and the
 * arrival. Everything but the train is drawn live into the cutscene's small native buffer (js/cinematic.js) in whole
 * pixels: the land from one day palette per season (winter deep snow; spring snowmelt, green low meadows, the falls
 * running full; summer green alpine meadows and flowers, snow only high; autumn golden larches, the first snow on the
 * peaks), lit for Hoarfell's hour (BridgeClock.sky: the day, the alpenglow at dawn and dusk, the night with its stars,
 * moon, lit windows and now and then the aurora). The train is the Blender sprite (assets/cine/train*.png, made by
 * tools/bridge-art/cine_sprites.py from assets_alpine.train), lit or not by the hour.
 *
 * Saved: localStorage bridge_railway { seen }. The first ride can't be skipped.
 */
var BridgeRailway = (function () {
  var KEY = 'bridge_railway';
  var NAMES = { fellhaven: 'Fellhaven', aurelle: 'Aurelle' };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function store(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function seen() { return !!load().seen; }

  // ---- a little arithmetic ---------------------------------------------------------------------------------------
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function vn(x, seed) {                       // value noise with straight runs between its points: angular, like rock
    var i = Math.floor(x), f = x - i, a = hash(i * 1.37 + seed * 17.3), c = hash((i + 1) * 1.37 + seed * 17.3);
    return a + (c - a) * f;
  }
  function vs(x, seed) {                       // and a smooth one, for hills and cloud
    var i = Math.floor(x), f = x - i, a = hash(i * 1.37 + seed * 17.3), c = hash((i + 1) * 1.37 + seed * 17.3);
    f = f * f * (3 - 2 * f);
    return a + (c - a) * f;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) {
    var r = Math.round(clamp(c[0], 0, 255)), g = Math.round(clamp(c[1], 0, 255)), bl = Math.round(clamp(c[2], 0, 255));
    return a === undefined ? 'rgb(' + r + ',' + g + ',' + bl + ')' : 'rgba(' + r + ',' + g + ',' + bl + ',' + a.toFixed(3) + ')';
  }
  function ease(t) { return t * t * (3 - 2 * t); }

  // ---- the place and the hour ----------------------------------------------------------------------------------------
  // One day palette a season; the hour's light is laid over it by `lit`.
  var SEASONS = {
    winter: { meadow: [232, 238, 248], meadowSh: [188, 200, 226], snowline: 0.0, fir: [34, 66, 58], firSnow: true,
              larch: [96, 80, 72], larchBare: true, flowers: null, water: [168, 206, 226], frozen: true, fall: 0.0,
              patch: 0, snowfall: true, rock: [112, 118, 140], dust: 0 },
    spring: { meadow: [118, 168, 84], meadowSh: [84, 130, 66], snowline: 0.48, fir: [40, 82, 60], firSnow: false,
              larch: [150, 196, 96], flowers: [[248, 248, 252], [250, 222, 80], [196, 150, 226]], water: [96, 158, 182],
              frozen: false, fall: 1.0, patch: 0.35, snowfall: false, rock: [116, 120, 140], dust: 0 },
    summer: { meadow: [100, 156, 72], meadowSh: [70, 120, 58], snowline: 0.7, fir: [36, 74, 52], firSnow: false,
              larch: [74, 126, 70], flowers: [[236, 84, 96], [250, 222, 80], [156, 124, 236], [252, 252, 252], [250, 150, 60]],
              water: [86, 148, 178], frozen: false, fall: 0.7, patch: 0, snowfall: false, rock: [120, 124, 142], dust: 0 },
    autumn: { meadow: [176, 152, 84], meadowSh: [134, 110, 62], snowline: 0.62, fir: [36, 68, 54], firSnow: false,
              larch: [232, 172, 56], flowers: null, water: [74, 124, 146], frozen: false, fall: 0.45, patch: 0.08,
              snowfall: false, rock: [114, 116, 132], dust: 0.4 }
  };
  var SNOW = [238, 242, 250], SNOW_SH = [178, 192, 222];

  function env(over) {
    var k = typeof BridgeClock !== 'undefined' && BridgeClock.sky ? BridgeClock.sky('hoarfell') : { sun: 1, dusk: 0 };
    var season = (k.season && k.season.id) || 'winter';
    var E = { season: SEASONS[season] ? season : 'winter', sun: k.sun === undefined ? 1 : k.sun, dusk: k.dusk || 0 };
    if (over) for (var key in over) if (over[key] !== undefined) E[key] = over[key];
    E.S = SEASONS[E.season];
    E.wd = Math.min(0.9, E.dusk * 0.9);
    E.wday = Math.max(0, Math.min(1, E.sun * (1 - E.wd)));
    E.wn = Math.max(0, 1 - E.wd - E.wday);
    // now and then the aurora: on most dark nights in the cold months, some nights otherwise (the same for everyone a day)
    var day = Math.floor(Date.now() / 86400000);
    E.aurora = E.aurora !== undefined ? E.aurora : E.wn > 0.5 && (E.season === 'winter' || E.season === 'autumn' || hash(day * 7.7) > 0.6) ? 1 : 0;
    return E;
  }
  // a day colour under the hour's light: the alpenglow at dawn and dusk (pink and gold), the night cold and blue
  function lit(E, c, glow) {
    var d = [c[0] * 1.02 + 34, c[1] * 0.74 + 14, c[2] * 0.7 + 26];
    var n = [c[0] * 0.2 + 6, c[1] * 0.25 + 10, c[2] * 0.4 + 28];
    var o = [c[0] * E.wday + d[0] * E.wd + n[0] * E.wn, c[1] * E.wday + d[1] * E.wd + n[1] * E.wn, c[2] * E.wday + d[2] * E.wd + n[2] * E.wn];
    return glow ? mixc(o, c, glow * E.wn) : o;
  }
  function skyCols(E) {
    var day = E.season === 'winter' ? [[96, 140, 206], [184, 210, 236]] : [[64, 118, 206], [168, 206, 240]];
    var dusk = [[44, 40, 104], [246, 160, 118]], night = [[3, 6, 20], [22, 32, 70]];
    var top = [0, 1, 2].map(function (i) { return day[0][i] * E.wday + dusk[0][i] * E.wd + night[0][i] * E.wn; });
    var hor = [0, 1, 2].map(function (i) { return day[1][i] * E.wday + dusk[1][i] * E.wd + night[1][i] * E.wn; });
    var mid = mixc(top, hor, 0.55);
    if (E.wd > 0.1) mid = mixc(mid, [196, 104, 132], E.wd * 0.6);   // the band of rose over the alpenglow
    return { top: top, mid: mid, hor: hor };
  }

  // ---- drawing kit ------------------------------------------------------------------------------------------------------
  function rect(b, x, y, w, h, c) { b.fillStyle = c; b.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  // a gradient in flat bands, a pixel of dither where two bands meet (no smooth ramps)
  function bands(b, x, y, w, h, stops, n) {
    n = n || 10;
    var bh = h / n;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1), c;
      for (var s = 0; s < stops.length - 1; s++) if (t <= stops[s + 1][0] || s === stops.length - 2) {
        c = mixc(stops[s][1], stops[s + 1][1], clamp((t - stops[s][0]) / (stops[s + 1][0] - stops[s][0]), 0, 1)); break;
      }
      var y0 = Math.round(y + i * bh), y1 = Math.round(y + (i + 1) * bh);
      rect(b, x, y0, w, y1 - y0, css(c));
      if (i) { b.fillStyle = css(c); for (var dx = (i % 2); dx < w; dx += 2) b.fillRect(x + dx, y0 - 1, 1, 1); }
    }
  }
  function sky(b, W, H, E, now, horizon) {
    var C = skyCols(E);
    bands(b, 0, 0, W, horizon, [[0, C.top], [0.6, C.mid], [1, C.hor]], 12);
    rect(b, 0, horizon, W, H - horizon, css(C.hor));
    if (E.wn > 0.2) {                                                    // the stars
      for (var i = 0; i < 160; i++) {
        var a = (0.35 + 0.65 * hash(i * 3.1)) * (0.7 + 0.3 * Math.sin(now / (400 + hash(i) * 600) + i)) * clamp((E.wn - 0.2) * 1.6, 0, 1);
        var sx = Math.floor(hash(i * 7.3) * W), sy = Math.floor(hash(i * 5.9) * horizon * 0.9);
        rect(b, sx, sy, 1, 1, 'rgba(235,240,255,' + a.toFixed(2) + ')');
        if (hash(i * 9.1) > 0.97) { rect(b, sx - 1, sy, 3, 1, 'rgba(235,240,255,' + (a * 0.4).toFixed(2) + ')'); rect(b, sx, sy - 1, 1, 3, 'rgba(235,240,255,' + (a * 0.4).toFixed(2) + ')'); }
      }
    }
    if (E.aurora && E.wn > 0.4) aurora(b, W, horizon, now, E.wn);
    // the sun: high on the left by day, low and gold at dusk; the moon high on the right by night
    var sk = E.wday + E.wd;
    if (sk > 0.05) {
      var sx2 = Math.round(W * 0.16), sy2 = Math.round(horizon * (0.22 + 0.5 * E.wd));
      var sc = mixc([255, 248, 226], [255, 196, 120], E.wd);
      b.save(); b.globalCompositeOperation = 'lighter';
      [[26, 0.04], [17, 0.06], [10, 0.09]].forEach(function (g) { disc(b, sx2, sy2, g[0], css(sc, g[1] * sk)); });
      b.restore();
      disc(b, sx2, sy2, 5, css(sc, Math.min(1, sk * 1.2)));
    }
    if (E.wn > 0.3) {
      var mx = Math.round(W * 0.8), my = Math.round(horizon * 0.22);
      b.save(); b.globalCompositeOperation = 'lighter';
      disc(b, mx, my, 16, 'rgba(150,170,230,' + (0.08 * E.wn).toFixed(2) + ')');
      b.restore();
      disc(b, mx, my, 5, 'rgba(236,240,250,' + Math.min(1, E.wn).toFixed(2) + ')');
      rect(b, mx - 2, my - 1, 2, 2, 'rgba(180,190,215,' + (0.7 * E.wn).toFixed(2) + ')');
      rect(b, mx + 1, my + 2, 1, 1, 'rgba(180,190,215,' + (0.7 * E.wn).toFixed(2) + ')');
    }
  }
  function disc(b, cx, cy, r, c) {                                        // a disc of whole pixels
    b.fillStyle = c;
    for (var y = -r; y <= r; y++) { var w = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); b.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
  }
  function ellipse(b, cx, cy, rx, ry, c) {
    b.fillStyle = c;
    for (var y = -ry; y <= ry; y++) { var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); b.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
  }
  // the sea of cloud the pass looks over: a floor of shadowed cloud, puffs heaped on it, lit on their tops
  function cloudSea(b, W, H, E, o) {
    var C = skyCols(E);
    var lt = lit(E, [248, 250, 255]), md = lit(E, [222, 228, 242]), sh = lit(E, [176, 186, 214]);
    if (E.wd > 0.1) { lt = mixc(lt, [255, 200, 176], E.wd * 0.6); md = mixc(md, [236, 164, 160], E.wd * 0.45); }
    lt = mixc(lt, C.hor, o.haze || 0); md = mixc(md, C.hor, o.haze || 0); sh = mixc(sh, C.hor, o.haze || 0);
    rect(b, 0, o.base + 4, W, H - o.base - 4, css(sh));
    var gap = o.gap || 26, i0 = Math.floor(o.scroll / gap) - 2, i1 = Math.ceil((o.scroll + W) / gap) + 2;
    for (var pass = 0; pass < 2; pass++) for (var i = i0; i < i1; i++) {
      var x = i * gap - o.scroll + hash(i * 3.3 + o.seed) * gap, y = o.base + hash(i * 1.7 + o.seed) * 8 + pass * 6;
      var r = (o.size || 1) * (9 + hash(i * 5.1 + o.seed + pass) * 11);
      ellipse(b, x, y + r * 0.25, r * 1.2, Math.round(r * 0.55), css(sh));
      ellipse(b, x - 1, y, r, Math.round(r * 0.5), css(md));
      ellipse(b, x - r * 0.3, y - r * 0.18, r * 0.62, Math.round(r * 0.3), css(lt));
    }
  }
  function aurora(b, W, horizon, now, k) {
    b.save(); b.globalCompositeOperation = 'lighter';
    for (var x = 0; x < W; x += 2) {
      var y0 = horizon * 0.12 + Math.sin(x / 70 + now / 3800) * horizon * 0.08 + Math.sin(x / 23 + now / 1900) * 3;
      var L = horizon * 0.22 * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(x / 41 + now / 2600)));
      var a = k * 0.32 * (0.55 + 0.45 * Math.sin(x / 13 + now / 900));
      for (var j = 0; j < L; j += 2) {
        var f = j / L;
        var c = f < 0.65 ? [70, 250, 160] : mixc([70, 250, 160], [170, 90, 230], (f - 0.65) / 0.35);
        rect(b, x, Math.round(y0 + L - j), 2, 2, css(c, a * (1 - f * 0.7) * (j < 4 ? 0.5 : 1)));
      }
    }
    b.restore();
  }

  // A range of mountains: peaks with straight flanks (the highest of the peaks near each point), the flank turned to
  // the sun (left) lit and the other in shade, down to a haze at the foot; snow capping whatever stands above the
  // season's snowline, running down the lit gullies in streaks; far ranges fading into the sky.
  function range(b, W, H, E, o) {
    var C = skyCols(E), haze = o.haze || 0;
    var rock = E.S.rock;
    var rL = mixc(lit(E, mixc(rock, [176, 182, 202], 0.3)), C.hor, haze), rD = mixc(lit(E, mixc(rock, [56, 62, 92], 0.4)), C.hor, haze);
    var foot = mixc(mixc(rD, C.hor, 0.35), lit(E, E.S.meadowSh), o.green ? 0.4 : 0);
    var sL = mixc(lit(E, SNOW), C.hor, haze * 0.7), sD = mixc(lit(E, mixc(SNOW_SH, [150, 160, 210], 0.2)), C.hor, haze * 0.7);
    if (E.wd > 0.1) { sL = mixc(sL, [255, 178, 160], E.wd * 0.5 * (1 - haze)); rL = mixc(rL, [220, 130, 120], E.wd * 0.3 * (1 - haze)); }
    var line = o.snowline === undefined ? E.S.snowline : o.snowline;
    var deep = line <= 0.02;
    var cL = css(rL), cD = css(rD), cF = css(foot), cSL = css(sL), cSD = css(sD);
    for (var x = 0; x < W; x++) {
      var u = x + o.scroll;
      var h = height(u, o), h2 = height(u + 1, o);
      var top = Math.round(o.base - h), lightSide = h2 > h + 0.05 || (Math.abs(h2 - h) <= 0.05 && hash(Math.floor(u / 3) + o.seed) > 0.5);
      var hBand = Math.max(4, Math.round(h * 0.75));
      rect(b, x, top, 1, hBand, lightSide ? cL : cD);
      rect(b, x, top + hBand, 1, H - top - hBand, cF);
      if (o.strata) for (var s = 1; s < 4; s++) {
        var sy = Math.round(o.base - o.amp * s * 0.21 + Math.sin(u / 23 + s) * 2);
        if (sy > top + 3 && sy < top + hBand) rect(b, x, sy, 1, 1, css(mixc(lightSide ? rL : rD, [30, 34, 54], 0.22)));
      }
      var cap = 0;
      if (deep) cap = hBand + 2;
      else if (h > line * o.amp) cap = Math.round((h - line * o.amp) * 0.9 + 1);
      else if (E.S.dust && h > o.amp * 0.6) cap = Math.round((h - o.amp * 0.6) * 0.5);
      if (cap > 0) {
        cap += Math.round((hash(u * 0.37 + o.seed) - 0.5) * 3);
        rect(b, x, top, 1, Math.min(cap, hBand + 4), lightSide ? cSL : cSD);
        // gullies: snow streaking down the lit flank below the cap
        if (!deep && lightSide && hash(Math.floor(u / 3) * 1.7 + o.seed) > 0.86) rect(b, x, top + cap, 1, Math.round((0.3 + hash(Math.floor(u / 3))) * hBand * 0.18), cSL);
        if (deep && !lightSide && hash(Math.floor(u / 2) * 1.3 + o.seed) > 0.8) rect(b, x, top + 2 + Math.round(hash(u * 3) * hBand * 0.6), 1, 3, cD);
      }
    }
  }
  // the highest of the peaks near u: each peak a cell's worth of the range with its own height and flanks
  function height(u, o) {
    var cell = 70 * (o.freq || 1), c0 = Math.floor(u / cell), h = 0;
    for (var c = c0 - 2; c <= c0 + 2; c++) {
      var px = (c + hash(c * 3.1 + o.seed)) * cell, a = o.amp * (0.35 + 0.65 * Math.pow(hash(c * 7.7 + o.seed * 2), o.sharp || 1.3));
      var sl = (0.55 + hash(c * 5.3 + o.seed) * 0.6) * (u < px ? 1 : 0.8 + hash(c * 2.9) * 0.5);
      var v = a - Math.abs(u - px) * sl * (o.amp / 60);
      if (v > h) h = v;
    }
    h += (vn(u / 9, o.seed + 5) - 0.5) * o.amp * 0.06;          // a ragged ridge line
    return Math.max(0, h);
  }

  // a forested slope: a band of land rising and falling, firs (and larches, golden in autumn) standing on it
  function slope(b, W, H, E, o) {
    var step = 2, mL = lit(E, E.S.meadow), mD = lit(E, E.S.meadowSh);
    var tops = [];
    for (var x = -step; x < W + step; x += step) {
      var u = x + o.scroll;
      var y = Math.round(o.base - (0.6 * vs(u / 90, o.seed) + 0.4 * vs(u / 31, o.seed + 3)) * o.amp);
      tops.push(y);
      rect(b, x, y, step, H - y, css(mD));
      rect(b, x, y, step, 3, css(mL));
      if (E.S.patch && hash(Math.floor(u / 14) + o.seed) < E.S.patch) rect(b, x, y, step, 2, css(lit(E, SNOW)));
      if (E.S.flowers && hash(Math.floor(u / 2) * 3.3 + o.seed) > 0.8) {
        var fc = E.S.flowers[Math.floor(hash(u * 0.7) * E.S.flowers.length)];
        rect(b, x, y + 3 + Math.floor(hash(u * 1.3) * 10), 1, 1, css(lit(E, fc)));
      }
    }
    if (o.trees) trees(b, W, E, o, function (x) { var i = Math.floor((x + step) / step); return tops[clamp(i, 0, tops.length - 1)]; });
    return tops;
  }
  function trees(b, W, E, o, ground) {
    var gap = o.gap || 9, s = o.size || 1;
    var i0 = Math.floor(o.scroll / gap) - 2, i1 = Math.ceil((o.scroll + W) / gap) + 2;
    for (var i = i0; i < i1; i++) {
      if (hash(i * 2.1 + o.seed) < (o.sparse || 0.25)) continue;
      var x = Math.round(i * gap - o.scroll + (hash(i * 5.7) - 0.5) * gap * 0.8);
      var y = ground(x) + Math.round(hash(i * 3.3) * 4 * s) + 2;
      var h = Math.round((10 + hash(i * 1.9) * 9) * s);
      var larch = hash(i * 8.3 + o.seed) < (E.season === 'autumn' ? 0.45 : 0.25);
      if (larch) tree(b, x, y, h, E, E.S.larch, E.S.larchBare, false, true);
      else tree(b, x, y, h, E, E.S.fir, false, E.S.firSnow, false);
    }
  }
  // a pixel fir: tiers of triangles, lit on the left; snow on each tier in winter. A larch is softer, a bare larch twigs.
  function tree(b, x, y, h, E, col, bare, snowy, larch) {
    var L = lit(E, mixc(col, [255, 255, 230], 0.12)), D = lit(E, mixc(col, [10, 20, 30], 0.3));
    rect(b, x, y - 2, 1, 3, css(lit(E, [70, 46, 30])));
    if (bare) {
      for (var j = 0; j < h; j += 2) { var w = Math.round((1 - j / h) * h * 0.28); rect(b, x - w, y - j - 2, w * 2 + 1, 1, css(D)); }
      return;
    }
    var tiers = larch ? 2 : 3, th = h / tiers;
    for (var t = 0; t < tiers; t++) {
      var yb = y - 1 - t * th * 0.75, w0 = h * 0.34 * (1 - t / (tiers + 0.6));
      for (var j = 0; j < th; j++) {
        var w = Math.max(0, Math.round(w0 * (1 - j / th)));
        var yy = Math.round(yb - j);
        rect(b, x - w, yy, w + 1, 1, css(L));
        rect(b, x + 1, yy, w, 1, css(D));
        if (snowy && j < th * 0.45 && j % 2 === 0) rect(b, x - w, yy, Math.max(1, w), 1, css(lit(E, SNOW)));
      }
    }
    if (snowy) rect(b, x, Math.round(y - 1 - (tiers - 1) * th * 0.75 - th), 1, 1, css(lit(E, SNOW)));
  }
  // drifting cloud: soft lumps in two tones; `sea` makes the flat-topped sea of cloud the pass looks over
  function clouds(b, W, H, E, o) {
    var C = skyCols(E);
    var base = lit(E, [236, 240, 248]), sh = lit(E, [196, 206, 228]);
    if (E.wd > 0.1) base = mixc(base, [255, 196, 176], E.wd * 0.5);
    base = mixc(base, C.hor, o.haze || 0); sh = mixc(sh, C.hor, o.haze || 0);
    for (var x = 0; x < W; x += 2) {
      var u = x + o.scroll;
      var hgt = o.amp * (0.55 * vs(u / 60, o.seed) + 0.45 * vs(u / 19, o.seed + 1));
      var top = Math.round(o.base - hgt);
      rect(b, x, top, 2, o.sea ? H - top : Math.round(hgt * 0.9), css(sh));
      rect(b, x, top, 2, Math.max(1, Math.round(hgt * 0.45)), css(base));
    }
  }
  function snowfall(b, W, H, now, n, wind) {
    for (var i = 0; i < n; i++) {
      var x = ((hash(i * 3.7) * W - now * (wind || 0.02) * (1 + hash(i) )) % W + W) % W;
      var y = (hash(i * 1.9) * H + now * (0.012 + hash(i * 5.1) * 0.01)) % H;
      rect(b, x, y, hash(i * 7) > 0.8 ? 2 : 1, hash(i * 7) > 0.8 ? 2 : 1, 'rgba(255,255,255,' + (0.5 + 0.4 * hash(i * 2.3)).toFixed(2) + ')');
    }
  }

  // ---- the train -------------------------------------------------------------------------------------------------------------
  function trainSprite(E, small) {
    var name = (small ? 'train-small' : 'train') + (E.wday < 0.75 ? '-lit' : '');
    return typeof BridgeCine !== 'undefined' && BridgeCine.get ? BridgeCine.get(name) || BridgeCine.get(small ? 'train-small' : 'train') : null;
  }
  // the train with its foot on (x, railY): x is its tail. Lit by the hour like the land; its lamps glow at night.
  function drawTrain(b, E, x, railY, small, now) {
    var s = trainSprite(E, small);
    if (!s) return 0;
    var bob = Math.sin(now / 90) > 0.6 ? 1 : 0;
    var y = Math.round(railY - s.anchors.rail[1]) - bob * (small ? 0 : 1);
    if (E.wday >= 0.95) b.drawImage(s.img, Math.round(x), y);
    var k = 1 - E.wday;                                                    // the land's light over it
    if (k > 0.05) {
      b.drawImage(tinted(s, css(mixc([255, 255, 255], lit(E, [255, 255, 255]), Math.min(0.85, k * 0.8 + 0.2)))), Math.round(x), y);
      // the headlamp's beam ahead of her (the windows keep their own glow: `tinted` leaves lamplit pixels be)
      if (E.wn > 0.3) {
        var nose = s.anchors.nose;
        b.save(); b.globalCompositeOperation = 'lighter';
        disc(b, Math.round(x + nose[0]), Math.round(y + s.h * 0.62), small ? 3 : 6, 'rgba(255,230,170,' + (0.25 * E.wn).toFixed(2) + ')');
        var bx = Math.round(x + nose[0]);
        for (var j = 0; j < (small ? 10 : 30); j++) rect(b, bx + j * 2, Math.round(y + s.h * 0.62) - Math.floor(j / 6), 2, 1 + Math.floor(j / 5), 'rgba(255,236,190,' + (0.12 * (1 - j / 30) * E.wn).toFixed(3) + ')');
        b.restore();
      }
    }
    // the pantograph's wire: a fine line overhead, sagging between masts
    return s.w;
  }
  var tints = {};
  function tinted(s, col) {
    var key = s.img.src + col;
    if (tints[key]) return tints[key];
    var c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    var g = c.getContext('2d');
    g.drawImage(s.img, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, s.w, s.h);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(s.img, 0, 0);
    try {                                                                  // lamplit window pixels keep their glow
      var src = document.createElement('canvas'); src.width = s.w; src.height = s.h;
      var sg = src.getContext('2d'); sg.drawImage(s.img, 0, 0);
      var a = sg.getImageData(0, 0, s.w, s.h), d = g.getImageData(0, 0, s.w, s.h);
      for (var i = 0; i < a.data.length; i += 4) {
        var r = a.data[i], gg = a.data[i + 1], bl = a.data[i + 2];
        if (a.data[i + 3] && r > 190 && gg > 140 && bl < 150 && r - bl > 70) { d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = bl; }
      }
      g.putImageData(d, 0, 0);
    } catch (e) { /* a tainted canvas: tinted all over */ }
    if (Object.keys(tints).length > 40) tints = {};
    return (tints[key] = c);
  }
  function trainWidth(small) { var s = typeof BridgeCine !== 'undefined' && BridgeCine.get ? BridgeCine.get(small ? 'train-small' : 'train') : null; return s ? s.w : small ? 62 : 148; }
  function rails(b, W, E, y, scroll, sleeperCol) {
    var bal = lit(E, E.season === 'winter' ? [200, 206, 222] : [128, 120, 110]);
    rect(b, 0, y, W, 4, css(bal));
    var sl = lit(E, sleeperCol || [92, 66, 48]);
    for (var x = -((scroll % 6) + 6) % 6; x < W; x += 6) rect(b, x, y + 1, 3, 2, css(sl));
    rect(b, 0, y, W, 1, css(lit(E, [176, 180, 192])));
    rect(b, 0, y - 1, W, 1, css(lit(E, [90, 94, 106])));
  }
  function wire(b, W, E, y, scroll, gap) {
    var c = css(lit(E, [50, 54, 66]));
    for (var x = 0; x < W; x += 2) {
      var u = ((x + scroll) % gap + gap) % gap, sag = Math.round(Math.sin(u / gap * Math.PI) * 3);
      rect(b, x, y + sag, 2, 1, c);
    }
    for (var m = -((scroll % gap) + gap) % gap; m < W + gap; m += gap) {
      rect(b, Math.round(m), y - 2, 2, 40, c);                            // the masts
      rect(b, Math.round(m) - 4, y - 2, 12, 1, c);
    }
  }

  // ---- the towns at each end --------------------------------------------------------------------------------------------
  function chalet(b, x, y, w, h, E, opts) {
    var wall = lit(E, opts && opts.wall || [122, 74, 42]), dark = lit(E, [78, 46, 24]);
    rect(b, x, y - h, w, h, css(wall));
    for (var j = 2; j < h; j += 3) rect(b, x, y - h + j, w, 1, css(dark));     // the log courses
    var roofSnow = E.season === 'winter' || E.season === 'spring' && hash(x) > 0.5;
    var roof = roofSnow ? lit(E, SNOW) : lit(E, [70, 52, 44]);
    var ov = 3, rh = Math.round(w * 0.42);
    for (var j2 = 0; j2 < rh; j2++) {
      var ww = Math.round((w / 2 + ov) * (1 - j2 / rh));
      rect(b, x + w / 2 - ww, y - h - j2, ww * 2, 1, css(j2 < 2 ? mixc(roof, [40, 30, 30], 0.3) : roof));
    }
    if (!roofSnow && E.season !== 'summer') rect(b, x + w / 2 - 2, y - h - rh + 1, 4, 1, css(lit(E, SNOW)));
    var winC = E.wday < 0.7 ? [255, 200, 110] : [60, 50, 40];
    for (var wx = x + 2; wx < x + w - 3; wx += 5) {
      rect(b, wx, y - h + 3, 3, 3, css(E.wday < 0.7 ? mixc([255, 200, 110], [80, 60, 40], E.wday) : lit(E, [52, 44, 40])));
      if (h > 12) rect(b, wx, y - h + 9, 3, 3, css(E.wday < 0.7 ? mixc([255, 200, 110], [80, 60, 40], E.wday) : lit(E, [52, 44, 40])));
    }
    void winC;
  }
  function smoke(b, x, y, now, E) {
    for (var q = 0; q < 6; q++) {
      var ph = ((now / 2200) + q / 6) % 1;
      var s = Math.round(1 + ph * 4);
      rect(b, x + Math.round(ph * 10 + Math.sin(now / 900 + q) * 2), y - Math.round(ph * 26), s, s, css(lit(E, [236, 236, 244]), 0.55 * (1 - ph)));
    }
  }
  function fellhaven(b, W, H, E, now, ground) {
    // log chalets up the slope, each standing on the ground under it, smoke from every third
    var houses = [[6, 22, 14], [36, 18, 12], [62, 30, 17], [108, 20, 13], [140, 24, 15], [176, 18, 12], [204, 34, 19], [254, 20, 13],
                  [286, 26, 15], [324, 22, 14], [358, 30, 17], [402, 20, 13], [432, 24, 15], [468, 18, 12]];
    houses.forEach(function (hh, i) {
      if (hh[0] > W + 10) return;
      var y = ground(hh[0] + hh[1] / 2) + 3;
      chalet(b, hh[0], y, hh[1], hh[2], E);
      if (i % 3 === 0) smoke(b, hh[0] + 3, y - hh[2] - Math.round(hh[1] * 0.42), now, E);
    });
  }
  // the station building behind the line: Fellhaven's a log hut with a board, Aurelle's stone under slate with a clock
  function stationHouse(b, x, y, E, town) {
    if (town === 'aurelle') {
      var st = lit(E, [222, 212, 192]), stD = lit(E, [176, 164, 142]), sl = lit(E, [70, 78, 96]);
      rect(b, x, y - 30, 84, 30, css(st));
      for (var j = 0; j < 30; j += 5) rect(b, x, y - 30 + j, 84, 1, css(stD));
      for (var w = 0; w < 5; w++) {
        rect(b, x + 6 + w * 16, y - 22, 6, 13, css(E.wday < 0.75 ? mixc([255, 206, 120], [90, 80, 70], E.wday * 0.6) : lit(E, [60, 70, 90])));
        rect(b, x + 5 + w * 16, y - 24, 8, 2, css(stD));
      }
      for (var k = 0; k < 9; k++) rect(b, x - 2 + Math.round(k * 0.5), y - 31 - k, 88 - k, 1, css(k === 8 ? lit(E, SNOW) : sl));
      rect(b, x + 35, y - 50, 14, 12, css(st)); rect(b, x + 33, y - 52, 18, 2, css(sl));
      disc(b, x + 42, y - 44, 4, css(lit(E, [216, 176, 96]))); disc(b, x + 42, y - 44, 3, css(lit(E, [244, 236, 216])));
      rect(b, x + 42, y - 46, 1, 2, '#2a2a30'); rect(b, x + 42, y - 44, 2, 1, '#2a2a30');
    } else {
      chalet(b, x, y, 44, 18, E, { wall: [132, 82, 46] });
      rect(b, x + 8, y - 24, 28, 5, css(lit(E, [60, 36, 20])));
      for (var c = 0; c < 6; c++) rect(b, x + 11 + c * 4, y - 23, 2, 3, css(lit(E, [236, 214, 160])));
    }
  }
  function aurelleChateau(b, W, H, E, now, ground, x0) {
    // the château across the middle distance: cream stone under slate mansards, round towers under verdigris cones,
    // pennants, a central pavilion with its clock; windows lit at dusk and night
    var stone = lit(E, [226, 216, 196]), stoneD = lit(E, [190, 178, 156]), slate = lit(E, [74, 82, 100]), cu = lit(E, [94, 158, 142]), cuD = lit(E, [62, 116, 102]);
    var snowC = lit(E, SNOW), wl = E.wday < 0.75 ? mixc([255, 206, 120], [90, 80, 70], E.wday * 0.6) : lit(E, [64, 72, 92]);
    var w = 210, cx = x0 + w / 2, y = ground;
    function block(xa, xb, hgt, roofH) {
      rect(b, xa, y - hgt, xb - xa, hgt, css(stone));
      rect(b, xa, y - hgt, xb - xa, 1, css(stoneD));
      for (var fl = 0; fl < Math.floor((hgt - 4) / 8); fl++) {
        rect(b, xa, y - 6 - fl * 8, xb - xa, 1, css(stoneD));
        for (var wx = xa + 3; wx < xb - 3; wx += 6) rect(b, wx, y - 12 - fl * 8 + 2, 2, 4, css(hash(wx * 3.3 + fl) > 0.2 ? wl : lit(E, [64, 72, 92])));
      }
      for (var j = 0; j < roofH; j++) rect(b, xa + Math.round(j * 0.5), y - hgt - j - 1, xb - xa - Math.round(j), 1, css(j === roofH - 1 ? snowC : slate));
      if (E.season !== 'summer') rect(b, xa + roofH / 2, y - hgt - roofH - 1, xb - xa - roofH, 2, css(snowC));
    }
    function tower(tx, hgt, r) {
      rect(b, tx - r, y - hgt, r * 2, hgt, css(stone));
      rect(b, tx + r - 2, y - hgt, 2, hgt, css(stoneD));
      for (var fl = 0; fl < Math.floor(hgt / 9); fl++) rect(b, tx - 1, y - 10 - fl * 9, 2, 4, css(wl));
      var ch = Math.round(r * 3.2);
      for (var j = 0; j < ch; j++) {
        var ww = Math.round((r + 2) * (1 - j / ch));
        rect(b, tx - ww, y - hgt - j, ww, 1, css(cu));
        rect(b, tx, y - hgt - j, ww, 1, css(cuD));
      }
      if (E.season === 'winter') rect(b, tx - r - 1, y - hgt, r * 2 + 2, 2, css(snowC));
      rect(b, tx, y - hgt - ch - 6, 1, 6, css(lit(E, [200, 176, 96])));
      var flap = Math.sin(now / 300) > 0 ? 1 : 0;
      rect(b, tx + 1, y - hgt - ch - 6, 5 + flap, 2, css(lit(E, [150, 28, 40])));
    }
    block(x0 + 14, x0 + 92, 30, 8);
    block(x0 + 118, x0 + 196, 30, 8);
    block(x0 + 90, x0 + 120, 38, 11);
    tower(x0 + 12, 40, 7);
    tower(x0 + 198, 40, 7);
    rect(b, cx - 3, y - 46, 6, 6, css(lit(E, [216, 176, 96])));             // the clock
    rect(b, cx - 2, y - 45, 4, 4, css(lit(E, [244, 236, 216], 0.6)));
    rect(b, cx - 6, y - 6, 12, 6, css(wl));                                  // the doors under the canopy
    rect(b, cx - 9, y - 9, 18, 2, css(lit(E, [40, 60, 52])));
  }

  // the station's platform in the foreground: flagged stone, a yellow line, a canopy on green iron columns
  function platform(b, W, H, E, y, scroll, town) {
    var top = lit(E, E.season === 'winter' ? [214, 214, 220] : [190, 180, 160]), face = lit(E, [150, 140, 124]);
    rect(b, 0, y, W, H - y, css(face));
    for (var fx = 0; fx < W; fx += 14) rect(b, fx, y + 4, 1, H - y - 4, css(lit(E, [124, 116, 102])));
    rect(b, 0, y, W, 3, css(top));
    rect(b, 0, y + 3, W, 1, css(lit(E, [224, 192, 64])));
    var col = lit(E, town === 'aurelle' ? [42, 74, 58] : [96, 62, 38]), roof = lit(E, town === 'aurelle' ? [74, 84, 100] : [78, 52, 34]);
    for (var x = -((scroll % 64) + 64) % 64 + 14; x < W; x += 64) {
      rect(b, x, y - 52, 3, 52, css(col));
      rect(b, x - 7, y - 54, 17, 2, css(col));
      rect(b, x - 4, y - 52, 2, 2, css(col)); rect(b, x + 5, y - 52, 2, 2, css(col));
    }
    // the canopy roof over the platform, glass between the ribs, snow on it in winter; a fretted valance
    rect(b, 0, y - 60, W, 6, css(roof));
    for (var r = 0; r < W; r += 8) rect(b, r, y - 60, 1, 6, css(mixc(roof, [20, 20, 30], 0.3)));
    if (E.season === 'winter') rect(b, 0, y - 62, W, 2, css(lit(E, SNOW)));
    for (var x2 = -((scroll % 6) + 6) % 6; x2 < W; x2 += 6) rect(b, x2, y - 54, 3, 2, css(lit(E, [232, 224, 204])));
    if (E.wday < 0.8) for (var x3 = -((scroll % 64) + 64) % 64 + 46; x3 < W; x3 += 64) {
      b.save(); b.globalCompositeOperation = 'lighter';
      disc(b, x3, y - 44, 6, 'rgba(255,210,140,' + (0.25 * (1 - E.wday)).toFixed(2) + ')');
      b.restore();
      rect(b, x3, y - 54, 1, 8, css(col));
      rect(b, x3 - 1, y - 46, 3, 3, css([255, 224, 160]));
    }
    // a bench and a trunk waiting on the platform
    var bx = Math.round(W * 0.72);
    rect(b, bx, y + 8, 22, 2, css(lit(E, [110, 70, 40]))); rect(b, bx, y + 4, 22, 2, css(lit(E, [110, 70, 40])));
    rect(b, bx + 1, y + 10, 2, 4, css(lit(E, [40, 40, 46]))); rect(b, bx + 19, y + 10, 2, 4, css(lit(E, [40, 40, 46])));
    rect(b, Math.round(W * 0.2), y + 6, 12, 8, css(lit(E, [110, 60, 30]))); rect(b, Math.round(W * 0.2) + 3, y + 6, 2, 8, css(lit(E, [200, 170, 90])));
    rect(b, Math.round(W * 0.2) + 2, y + 2, 9, 4, css(lit(E, [40, 58, 96])));
  }

  // ---- the shots ---------------------------------------------------------------------------------------------------------------
  // each shot: { dur, draw(b, W, H, t, now) } with ms = t × dur for anything that moves (so a frame is the same each time)
  function shotStation(E, town, leaving) {
    return function (b, W, H, t, now, ms) {
      var horizon = Math.round(H * 0.5);
      sky(b, W, H, E, now, horizon);
      range(b, W, H, E, { base: horizon + 14, amp: H * 0.4, seed: town === 'aurelle' ? 41 : 11, scroll: 0, haze: 0.5 });
      range(b, W, H, E, { base: horizon + 34, amp: H * 0.28, seed: town === 'aurelle' ? 43 : 13, scroll: 30, haze: 0.2, strata: true, freq: 0.8 });
      var gy = Math.round(H * 0.68);
      var tops = slope(b, W, H, E, { base: gy, amp: 16, seed: 5, scroll: 0, trees: true, size: 1.0, gap: 8, sparse: 0.45 });
      var ground = function (x) { return tops[clamp(Math.floor((x + 2) / 2), 0, tops.length - 1)]; };
      if (town === 'aurelle') aurelleChateau(b, W, H, E, now, gy + 6, Math.round(W / 2 - 105));
      else fellhaven(b, W, H, E, now, ground);
      var ry = Math.round(H * 0.84);
      rect(b, 0, ry - 16, W, 16, css(lit(E, E.S.meadowSh)));
      if (E.season === 'winter' || E.season === 'spring') rect(b, 0, ry - 16, W, 2, css(lit(E, SNOW)));
      stationHouse(b, Math.round(W * 0.06), ry - 6, E, town);
      rails(b, W, E, ry, 0);
      var tw = trainWidth(false), stand = Math.round(W / 2 - tw / 2 + 30);
      var x = leaving ? stand + Math.pow(Math.max(0, ms - 2600) / 1000, 2) * 22 : stand - Math.pow(Math.max(0, 1 - ms / (9000 * 0.78)), 2) * (W * 0.9);
      drawTrain(b, E, x, ry, false, now);
      wire(b, W, E, Math.round(ry - 44), 0, 120);
      platform(b, W, H, E, ry + 6, 0, town);
      if (E.S.snowfall) snowfall(b, W, H, now, 90);
    };
  }
  // inside the panoramic carriage: the valley streams past the big windows; `tunnel` for the dark with its lamps
  function shotCarriage(E, part) {
    return function (b, W, H, t, now, ms) {
      var horizon = Math.round(H * 0.4), v = ms;
      if (part === 'tunnel') {
        rect(b, 0, 0, W, H, '#07080c');
        for (var i = 0; i < 6; i++) {                                         // the tunnel's lamps flicking past
          var lx = W - ((v * 0.9 + i * W / 6 * 1.0) % (W + 80)) + 40;
          var ly = Math.round(H * 0.3);
          b.save(); b.globalCompositeOperation = 'lighter';
          rect(b, Math.round(lx) - 18, ly, 36, 2, 'rgba(255,170,80,0.25)');
          disc(b, Math.round(lx), ly, 4, 'rgba(255,170,80,0.5)');
          b.restore();
          rect(b, Math.round(lx) - 1, ly - 1, 3, 3, '#ffd8a0');
        }
        for (var r = 0; r < W; r += 22) rect(b, W - ((v * 0.9 + r) % W), Math.round(H * 0.12), 2, Math.round(H * 0.5), 'rgba(40,40,50,0.6)');   // ribs
        var end = clamp((t - 0.72) / 0.28, 0, 1);                            // daylight at the tunnel's end, flooding in
        if (end > 0) rect(b, 0, 0, W, H, css(lit(E, [255, 255, 255]), ease(end) * 0.95));
      } else {
        sky(b, W, H, E, now, horizon);
        clouds(b, W, H, E, { base: Math.round(H * 0.2), amp: 6, seed: 3, scroll: v * 0.005 + 300, haze: 0.25 });
        range(b, W, H, E, { base: horizon + 4, amp: H * 0.34, seed: 21, scroll: v * 0.004, haze: 0.45 });
        range(b, W, H, E, { base: horizon + 22, amp: H * 0.26, seed: 23, scroll: v * 0.011 + 200, haze: 0.15, strata: true, freq: 0.8 });
        var tops = slope(b, W, H, E, { base: horizon + 40, amp: 16, seed: 7, scroll: v * 0.03, trees: true, size: 1.2, gap: 7, sparse: 0.25 });
        // the river in the valley floor, glinting; chalets along it
        var ry = horizon + 50, wc = lit(E, E.S.water);
        rect(b, 0, ry - 2, W, 2, css(lit(E, E.S.meadow)));
        rect(b, 0, ry, W, 6, css(wc));
        rect(b, 0, ry, W, 1, css(mixc(wc, [255, 255, 255], 0.3)));
        for (var g = 0; g < 30; g++) rect(b, Math.round(((hash(g) * W - v * 0.06) % W + W) % W), ry + 1 + (g % 5), 3 + (g % 3), 1, css(lit(E, E.S.frozen ? [230, 240, 250] : [210, 230, 240]), 0.7));
        for (var c = 0; c < 5; c++) {
          var cx = Math.round(((c * 130 + 40 - v * 0.05) % (W + 200) + W + 200) % (W + 200)) - 100;
          chalet(b, cx, ry - 2, 14 + (c % 2) * 6, 9 + (c % 2) * 3, E);
        }
        rect(b, 0, ry + 6, W, 30, css(lit(E, E.S.meadowSh)));
        slope(b, W, H, E, { base: ry + 22, amp: 8, seed: 9, scroll: v * 0.09, trees: true, size: 1.8, gap: 16, sparse: 0.55 });
        // the fence and the poles right outside, a blur
        var post = css(lit(E, [70, 50, 34]));
        for (var p = -((v * 0.5) % 34); p < W; p += 34) rect(b, Math.round(p), Math.round(H * 0.6), 3, Math.round(H * 0.2), post);
        rect(b, 0, Math.round(H * 0.63), W, 1, post);
        for (var m = -((v * 0.5) % 260); m < W; m += 260) rect(b, Math.round(m) + 100, 0, 5, H, css(lit(E, [52, 56, 68])));    // a mast whips by
        if (E.S.snowfall) snowfall(b, W, H, now, 60, 0.16);
        void tops;
      }
      interior(b, W, H, E, now, part === 'tunnel');
    };
  }
  // the carriage round the windows: the curved glass of the roof, the mullions, the panelled wall under the sill,
  // a table with a cup of cocoa steaming, the red velvet seat backs; lamps warm at night and in the tunnel
  function interior(b, W, H, E, now, dark) {
    var lamp = dark ? 1 : clamp(E.wn * 1.2 + E.wd * 0.4, 0, 1);
    var amb = dark ? [70, 52, 40] : lit(E, [255, 246, 236]);
    function L(c) { return mixc(mixc(c, [10, 10, 16], 1 - (dark ? 0.35 : 0.25 + 0.75 * (amb[0] / 255))), mixc(c, [255, 190, 120], 0.25), lamp * 0.6); }
    var top = Math.round(H * 0.1), sill = Math.round(H * 0.66);
    // the roof's curved glass (a tint over the sky) and the roof's edge
    rect(b, 0, 0, W, top, 'rgba(40,60,80,0.32)');
    rect(b, 0, top - 2, W, 4, css(L([46, 52, 62])));
    // the mullions between the panes
    var pane = Math.round(W / 3);
    for (var x = pane; x < W; x += pane) { rect(b, x - 4, 0, 8, sill, css(L([46, 52, 62]))); rect(b, x - 4, 0, 2, sill, css(L([80, 88, 100]))); }
    // a faint reflection across the glass
    b.save(); b.globalCompositeOperation = 'lighter';
    for (var r = 0; r < 3; r++) for (var y = top; y < sill; y += 2) {
      var x0 = Math.round((r * pane) + (y - top) * 0.5 + 30);
      rect(b, x0, y, 10, 2, 'rgba(255,255,255,' + (dark ? 0.03 : 0.045).toFixed(3) + ')');
    }
    if (lamp > 0.05) rect(b, 0, top, W, sill - top, 'rgba(255,170,90,' + (0.06 * lamp).toFixed(3) + ')');
    b.restore();
    // the wall under the window: cream panel over red, brass rail
    rect(b, 0, sill, W, H - sill, css(L([140, 30, 38])));
    rect(b, 0, sill, W, 4, css(L([226, 212, 186])));
    rect(b, 0, sill + 4, W, 1, css(L([200, 166, 90])));
    for (var px = 8; px < W; px += 40) rect(b, px, sill + 10, 30, Math.round(H - sill - 18), css(L([118, 24, 32])));
    // the table, a cup of cocoa steaming on it, a folded map
    var ty = Math.round(H * 0.8), tx0 = Math.round(W * 0.34), tx1 = Math.round(W * 0.66);
    rect(b, tx0, ty, tx1 - tx0, 5, css(L([96, 58, 32])));
    rect(b, tx0, ty, tx1 - tx0, 1, css(L([150, 100, 60])));
    rect(b, Math.round((tx0 + tx1) / 2) - 2, ty + 5, 4, H - ty, css(L([60, 36, 20])));
    var mx = Math.round(W * 0.45);
    rect(b, mx, ty - 7, 6, 7, css(L([236, 232, 222])));
    rect(b, mx + 6, ty - 6, 2, 4, css(L([236, 232, 222])));
    rect(b, mx + 1, ty - 7, 4, 1, css(L([110, 66, 40])));
    for (var q = 0; q < 5; q++) {
      var ph = ((now / 1600) + q / 5) % 1;
      rect(b, mx + 2 + Math.round(Math.sin(now / 500 + q * 2) * 2 + ph * 3), ty - 9 - Math.round(ph * 14), 1, 2, 'rgba(255,255,255,' + (0.5 * (1 - ph)).toFixed(2) + ')');
    }
    rect(b, Math.round(W * 0.53), ty - 2, 18, 2, css(L([226, 214, 170])));
    rect(b, Math.round(W * 0.53) + 4, ty - 2, 1, 2, css(L([180, 70, 60])));
    // the seat backs either side, velvet with a white headrest cloth
    [[0, Math.round(W * 0.22)], [Math.round(W * 0.78), W]].forEach(function (s) {
      var sy = Math.round(H * 0.6);
      rect(b, s[0], sy, s[1] - s[0], H - sy, css(L([120, 22, 34])));
      rect(b, s[0], sy, s[1] - s[0], 2, css(L([160, 44, 56])));
      rect(b, s[0] + 8, sy + 4, s[1] - s[0] - 16, 10, css(L([236, 230, 220])));
      for (var bx = s[0] + 6; bx < s[1] - 4; bx += 10) rect(b, bx, sy + 22, 1, 1, css(L([70, 10, 20])));
    });
    if (lamp > 0.05) {                                                      // the lamps' warm pool on the table
      b.save(); b.globalCompositeOperation = 'lighter';
      disc(b, Math.round(W / 2), ty - 6, 30, 'rgba(255,170,90,' + (0.06 * lamp).toFixed(3) + ')');
      b.restore();
    }
  }
  function shotGorge(E) {
    return function (b, W, H, t, now, ms) {
      var top = Math.round(H * 0.2);
      sky(b, W, H, E, now, top + 10);
      range(b, W, H, E, { base: top + 12, amp: H * 0.16, seed: 61, scroll: 0, haze: 0.4 });
      // the far wall of the gorge: rock in blocks and strata, ledges with snow or firs, cracks running down
      var rock = E.S.rock, wL = lit(E, mixc(rock, [184, 190, 208], 0.18)), wM = lit(E, rock), wD = lit(E, mixc(rock, [40, 44, 72], 0.38));
      var floorY = Math.round(H * 0.66);
      var wallTop = function (x) { return Math.round(top + 6 + 8 * vn(x / 40, 63) + 5 * vn(x / 11, 64)); };
      for (var x = 0; x < W; x += 2) {
        var wt = wallTop(x);
        for (var y = wt; y < floorY; y += 3) {
          var n = hash(Math.floor(x / 6) * 7.1 + Math.floor(y / 3) * 3.3 + Math.floor(y / 15));
          var c = n > 0.78 ? wL : n < 0.2 ? wD : wM;
          rect(b, x, y, 2, 3, css(mixc(c, [20, 24, 40], (y - wt) / (floorY - wt) * 0.35)));
        }
        if (hash(Math.floor(x / 8) * 2.7) > 0.95) rect(b, x, wt + 4 + Math.round(hash(x) * 20), 1, Math.round(10 + hash(x * 3) * 40), css(mixc(wD, [10, 12, 24], 0.3)));
        for (var s2 = 0; s2 < 4; s2++) {                                    // ledges
          var ly = Math.round(wt + 14 + s2 * (floorY - wt) / 4.4 + Math.sin(x / 29 + s2 * 1.9) * 4);
          rect(b, x, ly, 2, 1, css(wD));
          if (E.season === 'winter' || (s2 === 0 && E.S.patch)) rect(b, x, ly - 1, 2, 1, css(lit(E, SNOW)));
          else if (hash(Math.floor(x / 4) * 1.3 + s2) > 0.6) rect(b, x, ly - 2, 2, 2, css(lit(E, E.S.meadow)));
        }
        if (E.season === 'winter') rect(b, x, wt - 1, 2, 2, css(lit(E, SNOW)));
      }
      trees(b, W, E, { scroll: 0, gap: 11, size: 0.8, seed: 65, sparse: 0.5 }, function (x) { return wallTop(x) + 2; });
      // the waterfall: falling in stripes down the wall into spray, or frozen into a blue curtain in winter
      var fx = Math.round(W * 0.32), fw = Math.round(10 + 8 * E.S.fall);
      for (var y2 = top + 14; y2 < floorY; y2++) {
        for (var dx = 0; dx < fw; dx++) {
          var tone;
          if (E.S.frozen) tone = mixc([214, 236, 248], [104, 164, 210], hash(dx * 3.1 + Math.floor(y2 / 5)) * 0.7);
          else tone = ((y2 + dx * 3 - ms * 0.09) % 9 + 9) % 9 < 3 ? [244, 250, 255] : [150, 196, 226];
          rect(b, fx + dx - Math.round(fw / 2) + Math.round(Math.sin(y2 / 9) * 1), y2, 1, 1, css(lit(E, tone)));
        }
      }
      // the floor of the gorge: the river, foaming
      var rv = lit(E, E.S.frozen ? [150, 190, 214] : mixc(E.S.water, [20, 30, 40], 0.25));
      rect(b, 0, floorY, W, 14, css(rv));
      for (var f = 0; f < 60; f++) rect(b, Math.round(((hash(f * 2) * W - ms * 0.05) % W + W) % W), floorY + 2 + Math.floor(hash(f) * 10), 4, 1, css(lit(E, [236, 244, 250]), 0.8));
      b.save(); b.globalCompositeOperation = 'lighter';                    // spray where the fall lands
      for (var m = 0; m < 30; m++) rect(b, fx - 14 + Math.round(hash(m) * 28), floorY - Math.round(((now / 30 + m * 7) % 20)), 2, 2, css(lit(E, [220, 236, 255]), 0.25));
      b.restore();
      // the near side: a shelf of rock with the line along it, the tunnel's portal in the crag rising on the right
      var ledgeY = Math.round(H * 0.74);
      var near = lit(E, mixc(rock, [50, 54, 76], 0.25)), nearL = lit(E, mixc(rock, [200, 204, 216], 0.2)), nearD = lit(E, mixc(rock, [20, 22, 36], 0.5));
      rect(b, 0, floorY + 14, W, ledgeY - floorY - 14, css(nearD));
      var px0 = Math.round(W * 0.76), aw = 26, ah = 34, ax = px0 + 22;
      var tw = trainWidth(false), tx = -tw + (ax + tw * 0.98) * ease(Math.min(1, t * 1.1));
      rails(b, W, E, ledgeY, 0);
      b.save(); b.beginPath(); b.rect(0, 0, ax + 2, H); b.clip();
      drawTrain(b, E, tx, ledgeY, false, now);
      b.restore();
      rect(b, 0, ledgeY + 4, W, H - ledgeY - 4, css(near));
      for (var x2 = 0; x2 < W; x2 += 2) {
        var dip = Math.round(8 * vn(x2 / 21, 71));
        rect(b, x2, ledgeY + 4, 2, 2, css(nearL));
        if (hash(Math.floor(x2 / 6) + 9) > 0.7) rect(b, x2, ledgeY + 8 + Math.round(hash(x2) * 12), 2, 3, css(nearD));
        rect(b, x2, H - 8 - dip, 2, 8 + dip, css(nearD));
      }
      // the crag over the portal: up from the shelf on the right in a ragged edge
      for (var x3 = px0; x3 < W; x3 += 2) {
        var cy = Math.max(-2, Math.round(ledgeY - 6 - (x3 - px0) * 1.9 - 10 * vn(x3 / 9, 77)));
        rect(b, x3, cy, 2, ledgeY + 4 - cy, css(near));
        rect(b, x3, cy, 2, 2, css(E.season === 'winter' ? lit(E, SNOW) : nearL));
        for (var yy = cy + 6; yy < ledgeY; yy += 7) if (hash(x3 * 0.7 + yy) > 0.6) rect(b, x3, yy, 2, 1, css(nearD));
      }
      rect(b, ax - 5, ledgeY - ah - 5, aw + 10, ah + 5, css(lit(E, [176, 168, 150])));          // the portal's dressed stone
      for (var j = 0; j < ah + 5; j += 4) rect(b, ax - 5, ledgeY - j, aw + 10, 1, css(lit(E, [130, 124, 110])));
      for (var k2 = 0; k2 < 9; k2++) rect(b, ax - 5 + k2 * 4, ledgeY - ah - 5, 3, 3, css(lit(E, [196, 188, 170])));
      for (var y4 = 0; y4 < ah; y4++) {
        var half = aw / 2, k = y4 < half ? Math.round(Math.sqrt(half * half - Math.pow(half - y4, 2))) : half;
        rect(b, ax + half - k, ledgeY - ah + y4, k * 2, 1, '#06070a');
      }
      if (E.season === 'winter') rect(b, ax - 6, ledgeY - ah - 7, aw + 12, 2, css(lit(E, SNOW)));
      if (E.S.snowfall) snowfall(b, W, H, now, 60);
    };
  }
  function shotViaduct(E) {
    return function (b, W, H, t, now, ms) {
      var horizon = Math.round(H * 0.46);
      sky(b, W, H, E, now, horizon);
      clouds(b, W, H, E, { base: Math.round(H * 0.18), amp: 7, seed: 13, scroll: ms * 0.004 + 100, haze: 0.1 });
      range(b, W, H, E, { base: horizon + 6, amp: H * 0.38, seed: 81, scroll: 0, haze: 0.5 });
      range(b, W, H, E, { base: horizon + 30, amp: H * 0.26, seed: 83, scroll: 0, haze: 0.22, strata: true });
      // the ravine: forested slopes falling in from either side to a stream far below, mist lying in it
      var floor = Math.round(H * 0.94), deck0 = Math.round(H * 0.5);
      var gL = lit(E, E.S.meadow), gD = lit(E, E.S.meadowSh);
      var ground = [];
      for (var x = 0; x < W; x += 2) {
        var q = (x - W / 2) / (W / 2);
        var gy = Math.round(floor - (H * 0.5) * Math.pow(Math.abs(q), 1.6) - 4 * vs(x / 23, 91));
        ground.push(gy);
        rect(b, x, gy, 2, H - gy, css(Math.abs(q) > 0.3 && (q < 0) ? gL : gD));
        if (E.S.patch && hash(Math.floor(x / 10)) < E.S.patch) rect(b, x, gy, 2, 2, css(lit(E, SNOW)));
      }
      trees(b, W, E, { scroll: 0, gap: 7, size: 1.15, seed: 93, sparse: 0.2 }, function (x) { return ground[clamp(Math.floor(x / 2), 0, ground.length - 1)]; });
      rect(b, Math.round(W * 0.44), floor - 3, Math.round(W * 0.12), 3, css(lit(E, E.S.water)));
      b.save();                                                              // mist in the ravine
      for (var m = 0; m < 4; m++) { var mw = Math.round(W * (0.3 + m * 0.06)); rect(b, Math.round(W / 2 - mw / 2), floor - 26 + m * 6, mw, 6, css(lit(E, [236, 240, 248]), 0.06 + m * 0.02)); }
      b.restore();
      // the viaduct: a deck curving toward us across the ravine, tall piers, arches springing between them
      var stone = lit(E, [196, 184, 160]), stoneD = lit(E, [140, 128, 108]), stoneL = lit(E, [222, 212, 190]);
      function deck(x) { var q = (x - W / 2) / (W / 2); return Math.round(deck0 + q * q * H * 0.07); }
      var span = 34;
      for (var x3 = 0; x3 < W; x3 += 1) {
        var dy = deck(x3), gy3 = ground[clamp(Math.floor(x3 / 2), 0, ground.length - 1)];
        if (gy3 <= dy + 2) continue;
        var u = ((x3 - W / 2) % span + span) % span, half = span / 2, pier = 8;
        var bottom;
        if (u < pier) bottom = gy3;                                          // a pier, down to the ground
        else {
          var qq = (u - pier - (span - pier) / 2) / ((span - pier) / 2);
          bottom = dy + 7 + Math.round((1 - Math.sqrt(Math.max(0, 1 - qq * qq))) * 14);
          var lower = dy + Math.round(H * 0.18);                             // a second tier of arches lower down
          if (gy3 > lower + 6) {
            rect(b, x3, lower, 1, 4 + Math.round((1 - Math.sqrt(Math.max(0, 1 - qq * qq))) * 10), css(stoneD));
          }
        }
        rect(b, x3, dy, 1, Math.max(0, bottom - dy), css(u < 2 ? stoneL : u < pier ? stone : stoneD));
        void half;
      }
      for (var x4 = 0; x4 < W; x4 += 1) { var d4 = deck(x4); rect(b, x4, d4 - 3, 1, 3, css(stoneL)); rect(b, x4, d4, 1, 1, css(stoneD)); }
      if (E.season === 'winter') for (var x5 = 0; x5 < W; x5 += 1) rect(b, x5, deck(x5) - 4, 1, 1, css(lit(E, SNOW)));
      // the train small on the deck, crossing
      var s = trainSprite(E, true), tw = s ? s.w : 62;
      var tx = -tw + (W + tw) * t;
      drawTrain(b, E, tx, deck(Math.round(tx + tw / 2)) - 3, true, now);
      if (E.S.snowfall) snowfall(b, W, H, now, 70);
    };
  }
  function shotGlacier(E) {
    return function (b, W, H, t, now, ms) {
      var horizon = Math.round(H * 0.32), sc = ms * 0.01;
      sky(b, W, H, E, now, horizon);
      range(b, W, H, E, { base: horizon + 26, amp: H * 0.34, seed: 101, scroll: sc * 0.3, haze: 0.4, snowline: 0.18 });
      range(b, W, H, E, { base: Math.round(H * 0.5), amp: H * 0.14, seed: 103, scroll: sc * 0.6, haze: 0.1, snowline: 0.5, strata: true });
      // the glacier: white névé coming in from the left, the ice going blue and breaking up as it falls to the right,
      // ogive bands across it, a dark medial moraine down its middle, crevasses in rows
      var ice = lit(E, [178, 214, 236], 0.15), iceM = lit(E, [140, 188, 222], 0.15), iceD = lit(E, [74, 126, 182], 0.2), iceL = lit(E, [232, 244, 252]), sn = lit(E, SNOW);
      var g0 = Math.round(H * 0.47), gb = Math.round(H * 0.8);
      for (var x = 0; x < W; x += 2) {
        var u = x + sc;
        var gt = Math.round(g0 + (x / W) * H * 0.06 + 3 * vs(u / 40, 107));
        var q = clamp(x / W * 1.4 - 0.2, 0, 1);                               // how far down the glacier (left névé → right ice)
        for (var y = gt; y < gb; y += 2) {
          var band = Math.floor((y - gt + (u * 0.15)) / 9) % 2;
          rect(b, x, y, 2, 2, css(mixc(sn, band ? ice : iceM, q)));
        }
        var mm = Math.round(gt + (gb - gt) * 0.45 + Math.sin(u / 50) * 3);   // the medial moraine
        rect(b, x, mm, 2, 2, css(lit(E, [96, 92, 96])));
        if (hash(Math.floor(u / 3)) > 0.6) rect(b, x, mm - 1, 2, 1, css(lit(E, [130, 124, 120])));
        for (var r2 = 0; r2 < 7; r2++) {                                      // crevasses
          var cy = Math.round(gt + 5 + r2 * (gb - gt) / 7 + Math.sin(u / 23 + r2 * 2) * 3 + ((x / W) - 0.5) * 6);
          if (q > 0.25 && hash(Math.floor(u / 7) * 1.9 + r2 * 3.7) > 0.4) { rect(b, x, cy, 2, 2, css(iceD)); rect(b, x, cy - 1, 2, 1, css(iceL)); }
        }
      }
      // seracs: blocks tumbled where it steepens, lit on top, a lit face and a blue shadow side
      for (var i = 0; i < 30; i++) {
        var sx = Math.round(((hash(i * 3.3) * W * 1.3 - sc) % (W * 1.3) + W * 1.3) % (W * 1.3)) - W * 0.15;
        if (sx < W * 0.35) continue;
        var sy = Math.round(g0 + 12 + hash(i * 5.1) * (gb - g0 - 18));
        var sw = 6 + Math.round(hash(i) * 10), sh = 6 + Math.round(hash(i * 2) * 10);
        rect(b, sx, sy - sh, sw, sh, css(ice));
        rect(b, sx + Math.round(sw * 0.6), sy - sh, Math.ceil(sw * 0.4), sh, css(iceD));
        rect(b, sx, sy - sh, sw, 2, css(E.season === 'summer' ? iceL : sn));
        rect(b, sx, sy - 1, sw, 1, css(mixc(iceD, [20, 30, 60], 0.3)));
      }
      // meltwater at the snout in spring and summer: a turquoise pool
      if (!E.S.frozen && E.season !== 'autumn') {
        var px = Math.round(W * 0.82 - sc * 0.4) % (W + 120);
        ellipse(b, px, gb - 3, 34, 4, css(lit(E, [72, 196, 204])));
        rect(b, px - 20, gb - 4, 12, 1, css(lit(E, [180, 240, 240])));
      }
      // the lateral moraine in front, the line along it, the train close and quick
      var my = Math.round(H * 0.82);
      var gravel = lit(E, E.season === 'winter' ? [214, 220, 232] : [134, 128, 120]), gravD = lit(E, [86, 82, 82]);
      for (var x2 = 0; x2 < W; x2 += 2) {
        var u2 = x2 + ms * 0.4;
        var gy = my - Math.round(10 * vs(u2 / 30, 111));
        rect(b, x2, gy, 2, my - gy + 6, css(gravel));
        if (hash(Math.floor(u2 / 3)) > 0.7) rect(b, x2, gy + 2 + Math.floor(hash(u2) * 6), 2, 2, css(gravD));
      }
      var ry = my + 6;
      rails(b, W, E, ry, ms * 0.4);
      var tw = trainWidth(false);
      drawTrain(b, E, -tw + (W + tw * 1.2) * t, ry, false, now);
      rect(b, 0, ry + 4, W, H - ry - 4, css(mixc(gravel, [20, 24, 30], 0.35)));
      for (var x3 = 0; x3 < W; x3 += 2) if (hash(Math.floor((x3 + ms * 0.4) / 2) * 3.1) > 0.75) rect(b, x3, ry + 6 + Math.floor(hash(x3) * (H - ry - 8)), 2, 2, css(gravD));
      wire(b, W, E, ry - 44, ms * 0.4, 140);
      if (E.S.snowfall) snowfall(b, W, H, now, 90, 0.05);
    };
  }
  function shotPass(E) {
    return function (b, W, H, t, now, ms) {
      var horizon = Math.round(H * 0.6);
      sky(b, W, H, E, now, horizon);
      range(b, W, H, E, { base: horizon + 6, amp: H * 0.48, seed: 121, scroll: ms * 0.002, haze: 0.35, snowline: 0.3, sharp: 1.6 });
      cloudSea(b, W, H, E, { base: horizon - 4, seed: 123, scroll: ms * 0.006, haze: 0.2, size: 0.8 });
      range(b, W, H, E, { base: horizon + 18, amp: H * 0.32, seed: 125, scroll: ms * 0.004 + 90, haze: 0.06, snowline: 0.2, strata: true });
      cloudSea(b, W, H, E, { base: horizon + 16, seed: 127, scroll: ms * 0.014, gap: 30, size: 1.2 });
      // the shelf the line runs along: deep snow (or the year's last patches over the scree), rocks through it,
      // a cairn with prayer flags strung to a pole
      var sy = Math.round(H * 0.82), bare = E.season === 'summer' || E.season === 'autumn';
      var shelf = lit(E, bare ? [150, 146, 140] : SNOW), shelfD = lit(E, bare ? [110, 106, 104] : SNOW_SH);
      for (var x = 0; x < W; x += 2) {
        var u = x + ms * 0.06;
        var gy = sy - Math.round(6 * vs(u / 25, 131));
        rect(b, x, gy, 2, H - gy, css(shelf));
        rect(b, x, gy + 3, 2, 2, css(shelfD));
        if (E.season !== 'winter' && hash(Math.floor(u / 6)) > 0.7) rect(b, x, gy, 2, 2, css(lit(E, SNOW)));
        if (hash(Math.floor(u / 10) * 2.3) > 0.85) { rect(b, x, gy - 3, 2, 4, css(lit(E, [100, 100, 110]))); rect(b, x, gy - 3, 2, 1, css(lit(E, [150, 150, 160]))); }
      }
      var fx = Math.round(W * 0.66 - ms * 0.06) % Math.round(W * 1.6);
      if (fx > -90 && fx < W + 20) {
        for (var c = 0; c < 6; c++) rect(b, fx - 6 + c, sy - 4 - c * 2, 13 - c * 2, 2, css(lit(E, c % 2 ? [120, 116, 112] : [150, 146, 140])));   // the cairn
        rect(b, fx, sy - 30, 2, 20, css(lit(E, [80, 64, 50])));
        rect(b, fx + 64, sy - 22, 2, 20, css(lit(E, [80, 64, 50])));
        var fc = [[220, 60, 60], [240, 220, 80], [80, 170, 90], [70, 120, 220], [240, 240, 240]];
        for (var l = 0; l < 64; l += 2) rect(b, fx + 2 + l, Math.round(sy - 30 + l * 0.12 + Math.sin(l / 64 * Math.PI) * 4), 2, 1, css(lit(E, [60, 50, 40])));
        for (var f = 0; f < 10; f++) {
          var fy = Math.round(sy - 29 + f * 0.75 + Math.sin((f * 6 + 4) / 64 * Math.PI) * 4);
          rect(b, fx + 3 + f * 6, fy, 4, 4 + (Math.sin(now / 200 + f) > 0 ? 1 : 0), css(lit(E, fc[f % 5])));
        }
      }
      var ry = sy + 10;
      rails(b, W, E, ry, ms * 0.06);
      var tw = trainWidth(false);
      drawTrain(b, E, -tw + (W + tw * 1.3) * t, ry, false, now);
      rect(b, 0, ry + 4, W, H - ry - 4, css(mixc(shelf, [30, 34, 50], 0.15)));
      if (E.S.snowfall) snowfall(b, W, H, now, 110, 0.06);
    };
  }

  function shots(from, to, E) {
    var L = [
      { name: 'depart', dur: 8000, draw: shotStation(E, from, true), title: true },
      { name: 'carriage', dur: 14000, draw: shotCarriage(E, 'valley') },
      { name: 'gorge', dur: 11000, draw: shotGorge(E) },
      { name: 'viaduct', dur: 13000, draw: shotViaduct(E) },
      { name: 'glacier', dur: 11000, draw: shotGlacier(E) },
      { name: 'tunnel', dur: 6000, draw: shotCarriage(E, 'tunnel'), dip: false },
      { name: 'pass', dur: 12000, draw: shotPass(E) },
      { name: 'arrive', dur: 9000, draw: shotStation(E, to, false), title: true }
    ];
    // BridgeCine.play hands each shot t (0..1); the shots want the ms into the shot too
    return L.map(function (s) {
      return { name: s.name, dur: s.dur, title: s.title, dip: s.dip,
               draw: function (b, W, H, t, now) { s.draw(b, W, H, t, now, t * s.dur); } };
    });
  }

  // ---- the ride ----------------------------------------------------------------------------------------------------------
  function ride(from, to, opts) {
    from = from === 'aurelle' ? 'aurelle' : 'fellhaven';
    to = to || (from === 'aurelle' ? 'fellhaven' : 'aurelle');
    opts = opts || {};
    var S = load(), first = !S.seen;
    var E = env(opts.env);
    var o = { name: NAMES[to], kicker: 'The mountain railway · from ' + NAMES[from], noskip: first && !opts.skippable, hold: opts.hold };
    if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx('jingle');
    if (typeof BridgeCine === 'undefined' || !BridgeCine.play) return Promise.resolve();
    return BridgeCine.play(function () { return shots(from, to, E); }, o).then(function () {
      S = load(); S.seen = true; S.rides = (S.rides || 0) + 1; store(S);
    });
  }

  // one frame into a canvas of its own (the tests): i a shot index or name, t 0..1
  function frame(i, t, envOver, from, to, W, H) {
    W = W || 480; H = H || 270;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var b = c.getContext('2d'); b.imageSmoothingEnabled = false;
    var L = shots(from || 'fellhaven', to || 'aurelle', env(envOver));
    var s = typeof i === 'number' ? L[i] : L.filter(function (x) { return x.name === i; })[0];
    s.draw(b, W, H, t, 12345 + t * s.dur);
    return c;
  }

  var api = { ride: ride, seen: seen, env: env, SHOTS: ['depart', 'carriage', 'gorge', 'viaduct', 'glacier', 'tunnel', 'pass', 'arrive'],
              _frame: frame, _reset: function () { store({}); } };
  if (typeof BridgeCine !== 'undefined') BridgeCine.railway = ride;
  return api;
})();
