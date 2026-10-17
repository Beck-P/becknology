// Look Book 2: relight a real Blender render of a Bridge scene, live. The render comes as passes (tools/pack.py): flat
// colours, the white sky's light, six suns through the day (each with its cast shadows), the lamps' light, glow,
// normals, flags (grass, leaves, water…) and outline strength. Here they're combined for the hour, the season and the
// weather, and finished in one of the styles (smooth light or toy bands).
(function () {
  'use strict';
  const LB = window.LB;
  const RL = (LB.relit = {});
  const DEC = new Float32Array(256);
  for (let v = 0; v < 256; v++) DEC[v] = (v / 255) * (v / 255) * 4;
  const files = new Map();

  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('could not load ' + src)); i.src = src; });
  }
  function pixels(img) {
    const c = LB.canvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, c.width, c.height).data;
  }
  RL.load = function (dir) {
    if (!files.has(dir)) files.set(dir, (async () => {
      const meta = await (await fetch(dir + '/meta.json')).json();
      const names = ['albedo', 'emis', 'sky', 'sunA', 'sunB', 'norm', 'info'];
      if (meta.lamps) names.push('lamps');
      if (meta.refl) names.push('refl');
      if (meta.reflGlow) names.push('reflglow');
      const imgs = await Promise.all(names.map((n) => loadImg(dir + '/' + n + '.png' + (meta.rev ? '?v=' + meta.rev : ''))));
      const G = { dir, meta, w: meta.w, h: meta.h };
      names.forEach((n, i) => { G[n] = pixels(imgs[i]); G['_' + n] = imgs[i]; });
      // a per-pixel hash for breaking up snow edges and blossom
      const N = G.w * G.h, hsh = new Uint8Array(N);
      for (let i = 0; i < N; i++) hsh[i] = Math.floor(LB.hash(i % G.w, (i / G.w) | 0, 17) * 255);
      G.hash = hsh;
      // the water as a mask, and its points for glints and rings
      const wm = LB.canvas(G.w, G.h), wc = LB.ctx2d(wm), id = wc.createImageData(G.w, G.h);
      let any = false;
      for (let i = 0; i < N; i++) if (G.info[i * 4 + 1] & 8) { id.data[i * 4 + 3] = 255; any = true; }
      wc.putImageData(id, 0, 0);
      G.water = any ? wm : null;
      G.waterPts = any ? LB.maskPoints(wm, Math.round(N / 900), 5) : [];
      G.ringPts = any ? LB.maskPoints(wm, Math.round(N / 5000) + 2, 9) : [];
      if (any) waterPrep(G);
      // the glow: emissive colours at full strength
      const em = LB.canvas(G.w, G.h), ec = LB.ctx2d(em), ed = ec.createImageData(G.w, G.h);
      let glow = false;
      for (let i = 0; i < N; i++) {
        const r = G.emis[i * 4], g = G.emis[i * 4 + 1], b = G.emis[i * 4 + 2];
        // (not the water: its night light is the water's own)
        if (r + g + b > 24 && !(G.info[i * 4 + 1] & 8)) { ed.data[i * 4] = r; ed.data[i * 4 + 1] = g; ed.data[i * 4 + 2] = b; ed.data[i * 4 + 3] = 255; glow = true; }
      }
      ec.putImageData(ed, 0, 0);
      G.glow = glow ? em : null;
      return G;
    })());
    return files.get(dir);
  };


  // ---- water: depth from the shore, the lap line, ice cracks, the drifting light on the surface ----
  function waterPrep(G) {
    const { w, h } = G, N = w * h, inf = G.info;
    const isW = (i) => (inf[i * 4 + 1] & 8) !== 0;
    // chamfer distance to the nearest non-water pixel
    const D = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const f = inf[i * 4 + 1], solid = G.albedo[i * 4 + 3] > 8;
      D[i] = isW(i) ? 1e6 : (!solid || (f & 16)) ? 0 : 1e6;      // things standing in the water don't make a shore
    }
    const pass = (xs, ys, dx, dy) => {
      for (let y = ys[0]; y !== ys[1]; y += ys[2]) for (let x = xs[0]; x !== xs[1]; x += xs[2]) {
        const i = y * w + x; if (D[i] === 0) continue;
        let v = D[i];
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w) v = Math.min(v, D[y * w + nx] + 1);
        if (ny >= 0 && ny < h) v = Math.min(v, D[ny * w + x] + 1);
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) v = Math.min(v, D[ny * w + nx] + 1.414);
        D[i] = v;
      }
    };
    pass([0, w, 1], [0, h, 1], -1, -1);
    pass([w - 1, -1, -1], [h - 1, -1, -1], 1, 1);
    pass([w - 1, -1, -1], [0, h, 1], 1, -1);
    pass([0, w, 1], [h - 1, -1, -1], -1, 1);
    let mx = 1;
    for (let i = 0; i < N; i++) if (D[i] < 1e5 && D[i] > mx) mx = D[i];
    G.wDist = D; G.wMax = mx;
    // depth bands, once: shelves and hollows a few tiles across over the distance from the shore (not rings)
    const k = w / 480, band = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!isW(i)) continue;
      const x = i % w, y = (i / w) | 0, dist = D[i];
      const big = LB.fbm(x * 0.022 / k, y * 0.034 / k, 61, 3);
      const dep = LB.clamp(dist / (36 * k), 0, 1) * 0.62 + (big - 0.5) * 0.62 + (LB.noise(x * 0.09 / k, y * 0.14 / k, 6) - 0.5) * 0.1 + 0.18;
      band[i] = dist < 1.6 * k ? 0 : dep < 0.3 ? 1 : dep < 0.58 ? 2 : 3;
    }
    G.wBand = band;
    // the shore: water pixels touching land
    const shore = [];
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (isW(i) && D[i] > 0 && D[i] <= 1.5 && !isW(i + w) && (inf[(i + w) * 4 + 1] & 16)) shore.push([x, y, LB.hash(x, y, 3)]);
    }
    G.shore = shore;
    // ice cracks: a few wandering lines inside the water
    const crack = new Uint8Array(N), r = LB.rng(77), n = Math.max(3, Math.round(N / 9000));
    for (let k = 0; k < n; k++) {
      const pts = LB.maskPoints(G._wm || (G._wm = (() => { const c = LB.canvas(w, h), cx = LB.ctx2d(c), id = cx.createImageData(w, h); for (let i = 0; i < N; i++) if (isW(i)) id.data[i * 4 + 3] = 255; cx.putImageData(id, 0, 0); return c; })()), 1, 100 + k);
      if (!pts.length) continue;
      let [x, y] = pts[0], a = r() * Math.PI * 2;
      for (let s = 0; s < 40 + r() * 60; s++) {
        a += (r() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a) * 0.6;
        const i = Math.round(y) * w + Math.round(x);
        if (i < 0 || i >= N || !isW(i)) break;
        crack[i] = 1;
        if (r() < 0.06) { let bx = x, by = y, ba = a + (r() < 0.5 ? 1 : -1) * (0.8 + r()); for (let q = 0; q < 8 + r() * 10; q++) { bx += Math.cos(ba); by += Math.sin(ba) * 0.6; const j = Math.round(by) * w + Math.round(bx); if (j < 0 || j >= N || !isW(j)) break; crack[j] = 1; } }
      }
    }
    G.crack = crack;
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isW(y * w + x)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    G.wBox = [x0, y0, x1, y1];
    // the far shore of each column: where its water starts (things standing in the water don't end it)
    const top = new Int32Array(w).fill(-1);
    for (let x = 0; x < w; x++) for (let y = 1; y < h; y++) if (isW(y * w + x)) { top[x] = y; break; }
    // smooth it a little so a reed or a post on the bank doesn't make a notch in the reflection
    const sm = new Int32Array(w);
    for (let x = 0; x < w; x++) {
      let best = top[x];
      for (let d = -2; d <= 2; d++) { const t2 = top[Math.min(w - 1, Math.max(0, x + d))]; if (t2 >= 0 && best >= 0) best = Math.min(best, t2); }
      sm[x] = best;
    }
    G.wTop = sm;
    const fade = LB.canvas(w, h), fc = LB.ctx2d(fade), fd = fc.createImageData(w, h), fl = 46 * (w / 480);
    for (let x = 0; x < w; x++) {
      const t0 = sm[x]; if (t0 < 0) continue;
      for (let y = t0; y < h; y++) fd.data[(y * w + x) * 4 + 3] = Math.max(0, Math.min(255, 255 * (1 - (y - t0) / fl) + 30));
    }
    fc.putImageData(fd, 0, 0);
    G.wFade = fade;
    const area = N / (480 * 270);
    G.shimPts = LB.maskPoints(G._wm, Math.round(60 * area * Math.min(1, (D.filter((v) => v > 0 && v < 1e5).length) / 20000) + 12), 6);
    G.starPts = LB.maskPoints(G._wm, Math.round(34 * area) + 6, 8);
    G.fishPts = LB.maskPoints(G._wm, 3, 9);
    // drifting light on the surface: short horizontal dashes, tiling
    const tw = 160 * Math.round(w / 480 || 1), th = 90 * Math.round(w / 480 || 1);
    const tex = LB.canvas(tw, th), tc = LB.ctx2d(tex), tr = LB.rng(31);
    for (let k = 0; k < (tw * th) / 120; k++) {
      const x = Math.floor(tr() * tw), y = Math.floor(tr() * th), len = 2 + Math.floor(tr() * 4) * (w > 600 ? 1.5 : 1);
      tc.fillStyle = tr() < 0.3 ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)';
      tc.fillRect(x, y, Math.round(len), 1);
      if (x + len > tw) tc.fillRect(x - tw, y, Math.round(len), 1);
    }
    G.waveTex = tex;
  }

  // ---- the light for an hour ----
  const rgbn = (c) => { c = LB.rgb(c); return [c[0] / 255, c[1] / 255, c[2] / 255]; };
  const mixv = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  RL.light = function (S, G) {
    const L = S.L, t = S.time, wx = S.weather;
    const night = L.night, golden = L.golden;
    const up = t > 6.0 && t < 19.75;
    const elev = up ? Math.sin(Math.PI * LB.clamp((t - 6) / 13.75, 0, 1)) : 0;
    const wSun = { clear: 1, rain: 0.1, fog: 0.28, snow: 0.3 }[wx] || 1;
    const sun = LB.clamp(elev * 4.5, 0, 1) * wSun * 1.3;
    let sunC = mixv(rgbn('#fff4e4'), rgbn('#ffc27e'), golden);
    if (elev < 0.25 && up) sunC = mixv(sunC, rgbn('#ff9a6c'), LB.clamp((0.25 - elev) * 4, 0, 1) * golden);
    // which two sun passes
    const hours = G.meta.suns;
    let i0 = 0, i1 = 0, f = 0;
    if (t <= hours[0]) { i0 = i1 = 0; } else if (t >= hours[hours.length - 1]) { i0 = i1 = hours.length - 1; } else {
      while (i0 < hours.length - 2 && hours[i0 + 1] <= t) i0++;
      i1 = i0 + 1; f = (t - hours[i0]) / (hours[i1] - hours[i0]);
      f = f * f * (3 - 2 * f);
    }
    // the sky's light: the colour of the sky, softer by day, moonlit blue at night, grey and even in bad weather
    let skyC = mixv(mixv(rgbn(L.skyTop), rgbn(L.skyHor), 0.45), [1, 1, 1], 0.55 * (1 - night));
    let sky = LB.lerp(0.62, 0.16, night);
    if (wx !== 'clear') { sky *= LB.lerp(1.35, 1.1, night); skyC = mixv(skyC, mixv(rgbn('#c4ccd8'), rgbn('#3c4670'), night), 0.6); }
    if (S.season === 'winter' || S.snow) sky *= 1.08;
    const n = luma(skyC) || 1; skyC = skyC.map((v) => v / n);
    const moon = night * (wx === 'clear' ? 0.26 : 0.08), moonC = rgbn('#a6b6ff');
    const lamp = LB.lerp(0.12, 1.15, LB.smooth(0.15, 0.75, night)) * (wx === 'clear' ? 1 : 1.1);
    const glow = LB.lerp(0.05, 1, LB.smooth(0.1, 0.7, night));
    return { sun, sunC, i0, i1, f, sky, skyC, moon, moonC, lamp, glow, night, golden, elev };
  };

  // the light on a figure standing in the open: the sky, the sun, the moon — as compose lights the ground, scaled so
  // that noon is about 1 (people are drawn in their daylight colours)
  RL.figureLight = function (Lt) {
    const L = [0, 1, 2].map((c) => Lt.sky * Lt.skyC[c] * 0.9 + Lt.sunC[c] * Lt.sun * 0.8 + Lt.moonC[c] * Lt.moon * 0.8);
    const lum = 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2] + 1e-5;
    const b = 1.1 * (1 - Math.exp(-lum)) / 0.9 * (1 - 0.3 * Lt.night);   // after dark a figure sinks into the night like the ground does
    return L.map((v) => Math.min(1, b * (1 + (v / lum - 1) * 0.7)));
  };

  // ---- seasons on the flat colours ----
  const AUTUMN = [rgbn('#d8762e'), rgbn('#bb4430'), rgbn('#dcac3c'), rgbn('#c85a2a')];
  function season(a, flags, tree, hsh, S) {
    const se = S.season;
    if (flags & 4) {                                                   // grass
      if (se === 'spring') return [a[0] * 1.06, a[1] * 1.1, a[2] * 0.82];
      if (se === 'autumn') { const l = luma(a); return mixv(a, [l * 1.3, l * 1.12, l * 0.55], 0.5); }
      if (se === 'winter') { const l = luma(a); return mixv(a, [l * 1.05, l * 1.0, l * 0.9], 0.6); }
      return a;
    }
    if (flags & 1) {                                                   // a deciduous tree's leaves
      const v = (tree * 7919) % 13 / 13;
      if (se === 'spring') {
        if (v < 0.35 && hsh < 40) return rgbn(hsh < 14 ? '#fff0f4' : '#f4b4c8');
        return [a[0] * 1.12, a[1] * 1.12, a[2] * 0.8];
      }
      if (se === 'autumn') {
        const p = AUTUMN[Math.floor(v * AUTUMN.length) % AUTUMN.length], l = luma(a) / luma(p) * 1.25;
        const c = [p[0] * l, p[1] * l, p[2] * l];
        return hsh < 22 ? mixv(c, AUTUMN[(Math.floor(v * 4) + 2) % 4], 0.6) : c;
      }
      if (se === 'winter') { const l = luma(a); return [l * 0.95 + 0.06, l * 0.82 + 0.04, l * 0.78 + 0.05]; }
    }
    return a;
  }

  // ---- compose: the lit scene for this hour, season and weather, in a style ----
  // style: {bands: null | [[threshold, value]...], steps: n (smooth light quantized), line: 0..1, cool: 0..1}
  RL.compose = function (G, S, style, outCtx) {
    const { w, h } = G, N = w * h;
    const Lt = RL.light(S, G);
    const img = outCtx.createImageData(w, h), o = img.data;
    const A = G.albedo, sk = G.sky, sa = G.sunA, sb = G.sunB, nm = G.norm, inf = G.info, lp = G.lamps, hs = G.hash;
    const ch0 = Lt.i0 % 3, src0 = Lt.i0 < 3 ? sa : sb, ch1 = Lt.i1 % 3, src1 = Lt.i1 < 3 ? sa : sb;
    const snow = S.season === 'winter' ? 1 : S.weather === 'snow' ? 0.55 : 0;
    const snowZ = snow >= 1 ? 0.5 : 0.82;
    const wet = S.weather === 'rain';
    const cool = style.cool == null ? 0.5 : style.cool, lineK = style.line == null ? 0.4 : style.line;
    const steps = style.steps || 0, bands = style.bands;
    const sunMask = new Uint8ClampedArray(N);
    const sC = Lt.sunC, kC = Lt.skyC, mC = Lt.moonC;
    // water: the sky's colour over a green-blue depth, lighter at the shallow edge, in three bands
    // the first look book's pond: four bands, shallow green-teal to deep blue, each tinted by the sky (more at golden hour)
    // at golden hour the water keeps its colour (mixing in the sunset sky turns it grey); the warmth goes into the
    // glitter path and the shimmer instead
    const tint = S.weather === 'rain' ? rgbn('#6a7a86') : mixv(rgbn(S.L.skyTop), rgbn(S.L.skyHor), 0.2 + 0.12 * Lt.golden);
    const gsky = Lt.golden * (S.weather === 'clear' ? 1 : 0.3);
    const waterBands0 = [['#7e9c80', 0.08], ['#3e8a8a', 0.18], ['#2f7488', 0.2], ['#265e80', 0.22]].map(([c, k]) => mixv(rgbn(c), tint, k + 0.04 * gsky));
    // after dark the depth hardly shows: the bands close up toward the deep colour
    const waterBands = waterBands0.map((c) => mixv(c, waterBands0[2], 0.75 * Lt.night));
    const ICE = ['#86a8c4', '#a6c4da', '#c6dcec', '#e6f0f8'].map(rgbn);
    const openW = new Uint8ClampedArray(N);
    const iceC = rgbn('#d2dde6');
    for (let i = 0; i < N; i++) {
      const p = i * 4;
      const al = A[p + 3];
      if (al < 8) { o[p + 3] = 0; continue; }
      const flags = inf[p + 1], tree = inf[p];
      let line = inf[p + 2] / 255;
      if ((flags & 32) && line < 0.9) line = 0;             // roofs: no lines between shingles, only where the roof meets what's behind
      let a = [A[p] / 255, A[p + 1] / 255, A[p + 2] / 255];
      const nz = nm[p + 2] / 255 * 2 - 1;
      if (flags & 7) a = season(a, flags, tree, hs[i], S);
      // snow lies on what faces up (not on water, a little patchy at the edge)
      let snowy = false;
      if (snow >= 1 && (flags & 20) && !(flags & 8) && nz <= snowZ) {   // the meadow and the streets lie under the snow, whatever their bumps
        if (hs[i] < 18) a = [0.78, 0.72, 0.56];
        else { const sv = 0.88 + (hs[i] & 15) / 170; a = [sv * 0.96, sv * 0.975, sv]; snowy = true; }
      } else if (snow && !(flags & 8) && nz > ((flags & 3) ? 0.78 : snowZ) - (hs[i] / 255) * 0.12 && (!(flags & 3) || hs[i] < 150)) {
        // (foliage only takes snow on its flattest tops, in patches, so a canopy reads as snow-laden leaves, not bubbles)
        const sv = 0.9 + (hs[i] & 15) / 160; a = [sv * 0.97, sv * 0.985, sv]; snowy = true; }
      let water = false;
      if (flags & 8) {
        water = true;
        const x = i % w, y = (i / w) | 0, k = w / 480;
        const dist = G.wDist ? G.wDist[i] : 20;
        const band = G.wBand[i];
        a = waterBands[band];
        if (S.season === 'winter') {
          const iw = (6 + LB.noise(x * 0.06 / k, y * 0.06 / k, 8) * 12) * k;
          if (dist < iw) {
            const nn = LB.noise(x * 0.2 / k, y * 0.3 / k, 9);
            a = dist < 2 * k ? ICE[3] : nn > 0.62 ? ICE[3] : nn > 0.4 ? ICE[2] : ICE[1];
            if (dist > iw - 1.2 * k) a = ICE[0];
            if (LB.hash(x >> 1, y >> 1, 7) > 0.97) a = ICE[0];
            if (G.crack && G.crack[i]) a = ICE[0];
          } else openW[i] = 255;
        } else openW[i] = 255;
      }
      if (wet && !(flags & 8) && (flags & 16)) a = [a[0] * 0.82, a[1] * 0.84, a[2] * 0.9];
      // the light
      const skyL = DEC[sk[p]];
      const s0 = DEC[src0[p + ch0]], s1 = DEC[src1[p + ch1]];
      const sunL = (s0 + (s1 - s0) * Lt.f) * Lt.sun;
      const moonL = DEC[sa[p + 2]] * Lt.moon;      // the noon pass stands in for the high moon
      let Lr = Lt.sky * kC[0] * skyL + sC[0] * sunL + mC[0] * moonL;
      let Lg = Lt.sky * kC[1] * skyL + sC[1] * sunL + mC[1] * moonL;
      let Lb = Lt.sky * kC[2] * skyL + sC[2] * sunL + mC[2] * moonL;
      if (lp) { Lr += DEC[lp[p]] * Lt.lamp * 0.8; Lg += DEC[lp[p + 1]] * Lt.lamp * 0.8; Lb += DEC[lp[p + 2]] * Lt.lamp * 0.8; }
      const lum = 0.2126 * Lr + 0.7152 * Lg + 0.0722 * Lb + 1e-5;
      sunMask[i] = Math.min(255, (sunL / lum) * 255);
      let b = 1.1 * (1 - Math.exp(-1.0 * lum));
      if (water) b = LB.lerp(1.0, 0.36, Lt.night) * (S.weather === 'clear' ? 1 : 0.88) * (1 + 0.08 * Lt.golden);
      if (bands) {
        let v = bands[0][1];
        for (let k = 0; k < bands.length; k++) if (b >= bands[k][0]) v = bands[k][1];
        b = v;
      } else if (steps) b = Math.round(b * steps) / steps;
      // the light's colour, kept partly (warm sun, blue moon, gold lamps)
      const tint = 0.7;
      const cr = 1 + (Lr / lum - 1) * tint, cg = 1 + (Lg / lum - 1) * tint, cb = 1 + (Lb / lum - 1) * tint;
      let r = a[0] * b * cr, g = a[1] * b * cg, bl = a[2] * b * cb;
      // shadows lean cool and lights warm (the pixel-art way), more in the toy style
      const sh = LB.clamp(1 - b, 0, 1) * cool;
      r *= 1 - sh * 0.22; g *= 1 - sh * 0.1; bl *= 1 + sh * 0.12;
      if (b > 0.85) { const wv = (b - 0.85) * cool; r *= 1 + wv * 0.25; g *= 1 + wv * 0.1; }
      // outlines where one thing stands in front of another
      if (water) {
        // the light's colour on water, as the grade gives it (warm at golden hour, blue at night)
        const am = rgbn(S.L.amb);
        o[p] = a[0] * b * (0.55 + 0.45 * am[0]) * 255; o[p + 1] = a[1] * b * (0.55 + 0.45 * am[1]) * 255; o[p + 2] = a[2] * b * (0.55 + 0.45 * am[2]) * 255; o[p + 3] = al; continue;
      }
      if (line > 0 && !snowy) { const k = line * lineK; r *= 1 - k * 0.62; g *= 1 - k * 0.6; bl *= 1 - k * 0.5; }
      else if (line > 0) { const k = line * lineK; r *= 1 - k * 0.3; g *= 1 - k * 0.26; bl *= 1 - k * 0.14; }
      o[p] = r * 255; o[p + 1] = g * 255; o[p + 2] = bl * 255; o[p + 3] = al;
    }
    outCtx.putImageData(img, 0, 0);
    if (G.water && G.wTop && S.season !== 'winter_none') {
      const top = G.wTop;
      const mir = LB.mirror(outCtx.canvas, (x) => top[x] > 0 ? top[x] : 0, 0, w);
      const mc = LB.ctx2d(mir);
      mc.globalCompositeOperation = 'destination-in'; mc.drawImage(G.wFade, 0, 0);
      mc.globalCompositeOperation = 'source-over';
      G.mirrorLit = mir;
    }
    if (G.water) {
      // one canvas per kind of season (the open water differs in winter); LB.inMask caches a canvas's pixels, so a
      // reused canvas would keep last season's mask
      const om = LB.memo('rl-open:' + G.dir + ':' + (S.season === 'winter' ? 'w' : 'o'), () => LB.canvas(w, h)), oc = LB.ctx2d(om), od = oc.createImageData(w, h);
      for (let i = 0; i < N; i++) od.data[i * 4 + 3] = openW[i];
      oc.putImageData(od, 0, 0);
      G.open = om;
      G.openKey = S.season;
    }
    // what the clouds may darken: the sun's share of the light
    const mk = LB.memo('rl-sunmask:' + G.dir, () => LB.canvas(w, h)), mc = LB.ctx2d(mk), md = mc.createImageData(w, h);
    for (let i = 0; i < N; i++) md.data[i * 4 + 3] = sunMask[i];
    mc.putImageData(md, 0, 0);
    G.sunMask = mk;
    // the reflection, lit for the hour (flat colours × the average light)
    if (G.refl && G.water) {
      const rl = LB.memo('rl-refl:' + G.dir, () => LB.canvas(w, h)), rc = LB.ctx2d(rl);
      rc.clearRect(0, 0, w, h);
      rc.drawImage(G._refl, 0, 0);
      const ab = 1.1 * (1 - Math.exp(-(Lt.sky * 0.9 + Lt.sun * 0.55 + Lt.moon * 0.5)));
      const lc = [LB.clamp(ab * (Lt.sky * kC[0] + Lt.sun * sC[0]) / (Lt.sky + Lt.sun + 1e-4), 0, 1.2), LB.clamp(ab * (Lt.sky * kC[1] + Lt.sun * sC[1]) / (Lt.sky + Lt.sun + 1e-4), 0, 1.2), LB.clamp(ab * (Lt.sky * kC[2] + Lt.sun * sC[2]) / (Lt.sky + Lt.sun + 1e-4), 0, 1.2)];
      rc.globalCompositeOperation = 'multiply';
      rc.fillStyle = LB.css([lc[0] * 255, lc[1] * 255, lc[2] * 255]);
      rc.fillRect(0, 0, w, h);
      rc.globalCompositeOperation = 'destination-in';
      rc.drawImage(G._refl, 0, 0);
      rc.globalCompositeOperation = 'source-over';
      G.reflLit = rl;
    }
    G.Lt = Lt;
    return Lt;
  };

  // clouds drifting over: they only take away the sun's share of the light
  RL.clouds = function (ctx, G, S) {
    if (!G.sunMask || S.weather !== 'clear' || G.Lt.sun < 0.05) return;
    const W = G.w, H = G.h;
    const tex = LB.memo('rl-cloud:' + W + 'x' + H, () => {
      const cv = LB.canvas(W * 2, H), c = LB.ctx2d(cv), id = c.createImageData(W * 2, H);
      const sc = 1 / (W / 5), period = Math.round(W * 2 * sc);
      for (let y = 0; y < H; y++) for (let x = 0; x < W * 2; x++) {
        const nv = LB.fbm(x * sc, y * sc * 1.3, 21, 4, period);
        id.data[(y * W * 2 + x) * 4 + 3] = nv > 0.6 ? 255 : nv > 0.56 ? 130 : 0;
      }
      c.putImageData(id, 0, 0);
      return cv;
    });
    const tmp = LB.memo('rl-cloudtmp:' + W + 'x' + H, () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
    const off = Math.round((S.t * 2.2) % (W * 2));
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
    tc.drawImage(tex, -off, 0); tc.drawImage(tex, W * 2 - off, 0);
    tc.globalCompositeOperation = 'source-in'; tc.fillStyle = '#56588a'; tc.fillRect(0, 0, W, H);
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(G.sunMask, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.42 * Math.min(1, G.Lt.sun); ctx.drawImage(tmp, 0, 0); ctx.restore();
  };

  // the water: the mirrored world wobbling, glints toward the sun, rings in the rain
  RL.water = function (ctx, G, S) {
    if (!G.water || !G.open) return;
    const W = G.w, H = G.h, k = W / 480, Lt = G.Lt || {}, P = LB.paint(ctx), open = G.open;
    const winter = S.season === 'winter', inOpen = (x, y) => LB.inMask(open, x, y);
    const [bx0, by0, bx1, by1] = G.wBox;
    // the world upside down, wobbling: the far bank and what stands on it (Look Book 1's reflections), then Blender's
    // true mirror for things standing in the water (posts, boats)
    const calm = S.weather === 'rain' ? 2.4 : S.weather === 'clear' ? 1.4 : 1.8;
    if (G.mirrorLit) LB.ripple(ctx, G.mirrorLit, open, S, { amp: calm * k, freq: 0.8 / k, speed: 1.8, alpha: S.weather === 'fog' ? 0.32 : 0.62, y0: by0, y1: by1 + 1, grow: true, slot: G.dir + 'm' });
    if (G.reflLit) LB.ripple(ctx, G.reflLit, open, S, { amp: calm * k, freq: 0.8 / k, speed: 1.8, alpha: S.weather === 'fog' ? 0.3 : 0.5, y0: by0, y1: by1 + 1, grow: true, slot: G.dir });
    // shimmer: short light dashes that come and go
    ctx.save();
    const hi = Lt.night > 0.6 ? '#aab8e0' : LB.mix(S.L.skyHor, '#ffffff', 0.45);
    for (const [x, y, ph] of G.shimPts) {
      if (!inOpen(x, y)) continue;
      const v = Math.sin(S.t * 0.9 * (0.6 + ph) + ph * 30);
      if (v < 0.55) continue;
      ctx.globalAlpha = (v - 0.55) * 1.6 * LB.lerp(1, 0.5, Lt.night || 0);
      const len = Math.round((2 + Math.floor(ph * 3)) * k), ox = Math.round(Math.sin(S.t * 0.3 + ph * 10) * 2 * k);
      P.hline(x + ox, x + ox + len - 1, y, hi);
    }
    ctx.restore();
    LB.glints(ctx, G.waterPts.filter(([x, y]) => inOpen(x, y)), S);
    // the sun's glitter path at golden hour, toward where the sun sets (or rises)
    const g = S.L.golden * (S.weather === 'clear' ? 1 : 0.2) * (1 - S.L.night);
    if (g > 0.08) {
      const cx = S.time < 12 ? bx0 + (bx1 - bx0) * 0.72 : bx0 + (bx1 - bx0) * 0.3, col = LB.mix('#ffe4a0', S.L.skyHor, 0.25);
      ctx.save();
      for (let n = 0; n < 64; n++) {
        const y = by0 + Math.floor(LB.hash(n, 1, 88) * (by1 - by0));
        const spread = (10 + (y - by0) * 0.35) * k;
        const x = Math.round(cx + (LB.hash(n, 2, 88) - 0.5) * spread * 2 + Math.sin(S.t * 0.5 + n) * 2 * k);
        const v = Math.sin(S.t * (1.2 + LB.hash(n, 3, 88)) + n * 2.3);
        if (v < 0.2 || !inOpen(x, y)) continue;
        ctx.globalAlpha = g * (0.35 + 0.65 * v) * Math.max(0, 1 - Math.abs(x - cx) / (spread * 1.2));
        P.hline(x, x + Math.round((1 + Math.floor(LB.hash(n, 4, 88) * 4)) * k), y, col);
      }
      ctx.restore();
    }
    // stars in the water on clear nights
    if (S.L.night > 0.6 && S.weather === 'clear') {
      for (const [x, y, ph] of G.starPts) if (inOpen(x, y) && Math.sin(S.t * 1.3 * (0.5 + ph) + ph * 20) > -0.3) P.px(x, y, ph > 0.6 ? '#fffbe8' : '#c8d4ff');
    }
    // the shore laps: a light line that comes and goes
    if (G.shore && !winter) {
      const lap = Lt.night > 0.6 ? '#8a9ac4' : LB.mix('#d8ecea', S.L.skyHor, 0.25);
      ctx.save(); ctx.fillStyle = lap;
      for (const [x, y] of G.shore) { const v = Math.sin(S.t * 1.5 + x * 0.33 / k + y * 0.21 / k); if (v > 0.15) { ctx.globalAlpha = LB.lerp(1, 0.5, Lt.night || 0); ctx.fillRect(x, y, 1, 1); } }
      ctx.restore();
    }
    // lit windows and lanterns streaking down the water after dark
    if (G._reflglow && Lt.glow > 0.08) {
      const gl = LB.memo('rl-gl:' + G.dir, () => LB.canvas(W, H)), gc = LB.ctx2d(gl);
      gc.globalCompositeOperation = 'source-over'; gc.globalAlpha = 1; gc.clearRect(0, 0, W, H);
      LB.ripple(gc, G._reflglow, null, S, { amp: 2 * k, freq: 0.9 / k, speed: 2.6, alpha: 1, slot: G.dir + 'g' });
      const st = LB.memo('rl-gls:' + G.dir, () => LB.canvas(W, H)), sc = LB.ctx2d(st);
      sc.globalCompositeOperation = 'source-over'; sc.globalAlpha = 1; sc.clearRect(0, 0, W, H);
      const n = Math.round(6 * k);
      for (let d = 0; d <= n; d++) { sc.globalAlpha = 1 - d / (n + 1); sc.drawImage(gl, 0, d * 2); }
      sc.globalAlpha = 1; sc.globalCompositeOperation = 'destination-in'; sc.drawImage(open, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * Lt.glow; ctx.drawImage(st, 0, 0); ctx.restore();
    }
    const openPts = (pts) => pts.filter(([x, y]) => inOpen(x, y));
    if (S.weather === 'rain') LB.rings(ctx, openPts(G.ringPts.concat(G.waterPts.slice(0, 14))), S, { period: 1, r: Math.round(4 * k), alpha: 0.6 });
    else LB.rings(ctx, openPts(G.fishPts), S, { period: 5, r: Math.round(7 * k), alpha: 0.5 });
  };
  // LB.inMask caches a mask's pixels; the open-water mask changes with the season, so drop the cached copy
  function maskRefresh(m) { const c = LB.canvas(1, 1); LB.inMask(c, 0, 0); m._fresh = (m._fresh || 0) + 1; }

  // ---- a scene def that shows a relit render, in four versions ----
  // o: {id, order, section, name, world, blurb, see, build, now, dirs: {32: path, 48: path}, people(ctx, S, P, G),
  //     lights(S, G) (extra light pools), extra: {water, live, after, emissive} hooks}
  RL.VERSIONS = {
    model: { ts: 32, style: { steps: 9, line: 0.42, cool: 0.45 } },
    toy: { ts: 32, style: { bands: [[0, 0.3], [0.3, 0.52], [0.55, 0.78], [0.8, 1.0]], line: 0.95, cool: 1.0 } },
    modelhd: { ts: 48, style: { steps: 14, line: 0.32, cool: 0.4 } },
    toyhd: { ts: 48, style: { bands: [[0, 0.28], [0.26, 0.45], [0.46, 0.64], [0.66, 0.84], [0.86, 1.02]], line: 0.85, cool: 0.9 } },
  };
  RL.scene = function (o) {
    const def = Object.assign({}, o);
    const ver = () => RL.VERSIONS[o.version || LB.state.version] || RL.VERSIONS.model;
    def.dims = () => {
      const v = ver(), dir = o.dirs[v.ts] || o.dirs[32] || o.dirs[48];
      const G = def._G[dir];
      return G ? [G.w, G.h] : (v.ts === 48 ? [720, 405] : [480, 270]);
    };
    def._G = {};
    const cur = () => { const v = ver(); const dir = o.dirs[v.ts] || o.dirs[32] || o.dirs[48]; return def._G[dir]; };
    def.prepare = () => {
      const v = ver(), dir = o.dirs[v.ts] || o.dirs[32] || o.dirs[48];
      if (def._G[dir]) return null;
      // the scene's own assets (people's sheets) load alongside, so the first frame has everyone in it
      return Promise.all([RL.load(dir), o.ready ? o.ready(v) : null]).then(([G]) => { def._G[dir] = G; });
    };
    def.grade = false;
    def.clouds = false;
    def.ground = function (ctx, S, P) {
      const G = cur(); if (!G) return;
      if (o.backdrop) o.backdrop(ctx, S, P, G);
      const tmp = LB.memo('rl-out:' + G.dir, () => LB.canvas(G.w, G.h));
      RL.compose(G, S, ver().style, LB.ctx2d(tmp));
      ctx.drawImage(tmp, 0, 0);
    };
    def.water = function (ctx, S, P) {
      const G = cur(); if (!G) return;
      RL.water(ctx, G, S);
      if (o.water) o.water(ctx, S, P, G);
    };
    def.live = function (ctx, S, P) {
      const G = cur(); if (!G) return;
      RL.clouds(ctx, G, S);
      LB.chibi && (LB.chibi.light = G.Lt ? RL.figureLight(G.Lt) : null);
      if (o.live) o.live(ctx, S, P, G);
      if (LB.chibi) LB.chibi.light = null;
    };
    def.emissive = function (ctx, S, P) {
      const G = cur(); if (!G || !G.glow) return;
      ctx.save(); ctx.globalAlpha = G.Lt ? G.Lt.glow : 0.3; ctx.drawImage(G.glow, 0, 0); ctx.restore();
      if (o.emissive) o.emissive(ctx, S, P, G);
    };
    def.lights = function (S) { const G = cur(); return G && o.lights ? o.lights(S, G) : []; };
    def.after = function (ctx, S, P) { const G = cur(); if (G && o.after) o.after(ctx, S, P, G); };
    def.scale = () => ver().ts / 32;
    return def;
  };
})();
