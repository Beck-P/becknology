// Postcard: the farm from the side. The real Verdance farm (tools/bridge-art/scenes/verdance.py), seen from a low
// camera across the pond (postcard/side_render.py), lit live like every other scene, with the sky, the sun and moon,
// stars, clouds and far mountains painted behind it in the first look book's postcard style, and the pond mirroring
// the sky. A click plays the camera coming down from the game's own view (postcard/move_bake.py), then hands over.
(function () {
  'use strict';
  const LB = window.LB, RL = LB.relit;
  const R = Math.round, clamp = LB.clamp, lerp = LB.lerp;
  const DIRS = { 32: 'assets/postcard-side-32', 48: 'assets/postcard-side-48' };
  const MOVE = { 32: 'assets/postcard-move-32', 48: 'assets/postcard-move-48' };
  const ver = () => RL.VERSIONS[LB.state.version] || RL.VERSIONS.model;
  const dirFor = (ts) => DIRS[ts] || DIRS[32];

  // ---------- the kit's grade as a colour function (the painted backdrop is lit the way the first postcard was) ----------
  const GOLD = [255, 148, 64], MOONLIFT = [42, 68, 134];
  const softCh = (cb, cs) => (cs <= 0.5 ? cb - (1 - 2 * cs) * cb * (1 - cb) : cb + (2 * cs - 1) * ((cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb)) - cb));
  function grade(c, L) {
    const a = LB.rgb(L.amb), s = LB.rgb(c);
    let r = [(s[0] * a[0]) / 255, (s[1] * a[1]) / 255, (s[2] * a[2]) / 255];
    if (L.golden > 0.04) { const al = 0.32 * L.golden; r = r.map((v, i) => v + (softCh(v / 255, GOLD[i] / 255) * 255 - v) * al); }
    if (L.night > 0.04) { const al = 0.09 * L.night; r = r.map((v, i) => v + (255 - ((255 - v) * (255 - MOONLIFT[i])) / 255 - v) * al); }
    return r;
  }

  // ---------- where the sun and moon are (the sun sets on the left, like the scene's light) ----------
  function sunAt(time, e) {
    const p = (time - 6) / 13.6;
    if (p <= 0 || p >= 1) return null;
    const elev = Math.sin(Math.PI * p);
    return { x: lerp(0.9, 0.42, p) * e.W, y: e.hz - 4 * e.k - elev * (e.hz + 50 * e.k), elev, p };
  }
  function moonAt(time, e) {
    const ph = ((((time - 19.9) % 24) + 24) % 24) / 10.2;
    if (ph <= 0 || ph >= 1) return null;
    const el = Math.sin(Math.PI * ph);
    return { x: lerp(0.86, 0.3, ph) * e.W, y: e.hz - 12 * e.k - el * e.hz * 0.8, elev: el, p: ph };
  }

  const HAZE = { clear: [0.55, 0.34, 0.24, 0.18], rain: [0.78, 0.6, 0.48, 0.42], snow: [0.8, 0.62, 0.5, 0.44], fog: [0.93, 0.85, 0.76, 0.68] };

  // ---------- far land: two mountain ranges and a forest band at the horizon (virtual 480-wide, horizon at 150) ----------
  const RANGES = [
    { peaks: [[18, 72], [92, 58], [160, 76], [318, 52], [392, 64], [452, 56], [512, 74]], slope: [0.56, 0.74], jag: 6, seed: 11,
      snow: { winter: 150, spring: 99, summer: 80, autumn: 90 } },
    { peaks: [[-14, 106], [66, 113], [150, 99], [232, 114], [322, 99], [400, 109], [470, 101]], slope: [0.33, 0.44], jag: 4, seed: 23,
      snow: { winter: 136, spring: 104, summer: 0, autumn: 0 } },
  ];
  for (const rg of RANGES) {
    const r = LB.rng(rg.seed);
    rg.P = rg.peaks.map(([x, y]) => ({ x, y, sl: lerp(rg.slope[0], rg.slope[1], r()), lean: lerp(0.12, 0.55, r()) * (r() < 0.5 ? -1 : 1) }));
  }
  function ridgeAt(rg, x) {
    let best = 1e9, owner = 0;
    for (let i = 0; i < rg.P.length; i++) { const p = rg.P[i], v = p.y + Math.abs(x - p.x) * p.sl; if (v < best) { best = v; owner = i; } }
    best += (LB.fbm(x * 0.045, 0.5, rg.seed, 3) - 0.5) * 2 * rg.jag + (LB.noise(x * 0.3, 1.5, rg.seed + 3) - 0.5) * 2;
    return [best, owner];
  }
  const ROCK = [['#a4a8c4', '#60668e'], ['#8a968e', '#4a5a6a']];
  const SNOW = ['#f6f9ff', '#b0bee0'];
  const PINE = { lit: '#467652', dark: '#1e3e36' };
  const FAR_DECID = { spring: ['#86c45a', '#e8a8c0', '#9ccc66'], summer: ['#4e9444', '#3e8240', '#5a9c48'], autumn: ['#e0782a', '#c4442e', '#e8b438'], winter: ['#857670', '#7a6c66', '#8e7e74'] };
  const FIELDS = { spring: ['#86b45a', '#6a9a4e'], summer: ['#6a9a46', '#557f3e'], autumn: ['#a89a52', '#8a7a46'], winter: ['#dfe6f2', '#c4cee2'] };

  // classes: 1-5 far range (lit, shade, snow lit, snow shade, rim), 6-10 mid range, 11 pine lit, 12 pine dark,
  // 13-15 broadleaf lit, 16 snow on trees, 17-18 far fields, 19-21 broadleaf shade
  function farClasses(e, season, lightLeft) {
    return LB.memo('pc-far:' + e.W + ':' + e.hz + ':' + season + ':' + lightLeft, () => {
      const { W, H, k, hz } = e, mS = e.mS;
      const cls = new Uint8Array(W * H);
      const vy = (y, sc) => 150 - (hz - y) / sc;               // screen row → the first postcard's row (horizon 150)
      RANGES.forEach((rg, li) => {
        const base = li * 5, snowY = rg.snow[season] || 0;
        for (let x = 0; x < W; x++) {
          const xv = x / k;
          const [r, oi] = ridgeAt(rg, xv), p = rg.P[oi];
          const top = Math.max(0, Math.ceil(hz - (150 - r) * k * mS));
          const sy = snowY + (LB.noise(xv * 0.09, 3.3, rg.seed) - 0.5) * 16;
          for (let y = top; y < hz; y++) {
            const v = vy(y, k * mS), dd = v - r;
            const xs = p.x + (v - p.y) * p.lean + (LB.noise(v * 0.16, p.x * 0.1, rg.seed + 7) - 0.5) * 7;
            let shade = lightLeft ? xv > xs : xv < xs;
            if (!shade && dd > 4 && LB.noise((xv + (lightLeft ? -1 : 1) * dd * 0.6) * 0.2, dd * 0.035, rg.seed + 9) > 0.72) shade = true;
            const snow = snowY && v < sy;
            let c;
            if (!shade && dd < 1.3 / mS) c = snow || li === 0 ? 5 : 1;
            else if (snow) c = shade ? 4 : 3;
            else c = shade ? 2 : 1;
            cls[y * W + x] = base + c;
          }
        }
      });
      // the forest along the horizon: pines and round crowns over a dark mass
      const r = LB.rng(77), snowy = season === 'winter';
      const trees = [];
      for (let row = 0; row < 2; row++) for (let x = -6 + row * 2; x < 486; x += 3 + r() * 3) {
        const tl = 141 + row * 4 + (LB.fbm(x * 0.02, 7.7 + row, 5, 3) - 0.5) * 8;
        trees.push({ x, top: tl - (4 + r() * 6), round: r() < (snowy ? 0.25 : 0.32), v: r() });
      }
      for (let x = 0; x < W; x++) {
        const t = R(hz - (150 - (146 + (LB.fbm(x / k * 0.03, 3.1, 6, 2) - 0.5) * 5)) * k);
        for (let y = Math.max(0, t); y < hz; y++) cls[y * W + x] = 12;
      }
      for (const t of trees) {
        const kind = t.v < 0.33 ? 0 : t.v < 0.66 ? 1 : 2;
        const ty = R(hz - (150 - t.top) * k), cx = R(t.x * k);
        for (let y = Math.max(0, ty); y < hz; y++) {
          const dy = (y - ty) / k;
          let hw;
          if (t.round) { const rr = 3 + (t.v * 10 % 2); hw = dy < rr * 2 ? Math.sqrt(Math.max(0, rr * rr - (dy - rr) * (dy - rr))) : rr * 0.6; }
          else hw = Math.min(4, Math.floor(dy * 0.42 + (Math.floor(dy) % 3 === 2 ? 0.6 : 0)));
          hw = R(hw * k);
          for (let dx = -hw; dx <= hw; dx++) {
            const x = cx + dx;
            if (x < 0 || x >= W) continue;
            const lit = lightLeft ? dx < 0 : dx > 0;
            let c;
            if (t.round) c = lit ? 13 + kind : 19 + kind;
            else c = lit && dx !== 0 ? 11 : 12;
            if (snowy && !t.round && lit && (Math.floor(dy) % 3 === 0 || dy < 2)) c = 16;
            if (snowy && t.round && dy < 2) c = 16;
            cls[y * W + x] = c;
          }
        }
      }
      // far fields below the horizon, a patchwork of two tones between hedgerows with the odd tree (mostly hidden
      // behind the farm; they fill the gap down to its far hedge)
      const hedgeAt = (y) => (y - hz) / k;
      for (let y = hz; y < H; y++) {
        const d = hedgeAt(y);
        const rowH = 3 + d * 0.35;                                   // the rows of fields widen toward the viewer
        const band = Math.floor(Math.log(1 + d / 3) * 4.2);
        const edge = Math.abs(Math.log(1 + d / 3) * 4.2 - band - 0.5) > 0.46;
        for (let x = 0; x < W; x++) {
          const xv = x / k;
          const field = Math.floor((xv + LB.noise(band * 7.3, 1.1, 41) * 90) / (40 + band * 18));
          let c = (field + band) % 2 === 0 ? 17 : 18;
          if (edge || LB.hash(field, band, 43) < 0.0) c = 12;                       // hedgerows between the rows
          if (LB.hash(Math.floor(xv / 7), band, 44) > 0.93 && d - Math.floor(d / rowH) * rowH < 2.5) c = 12;  // a tree
          cls[y * W + x] = c;
        }
      }
      return cls;
    });
  }

  // ---------- clouds (the first postcard's billowing cumulus and streaks of cirrus) ----------
  function cloudShapes(k, lightLeft) {
    return LB.memo('pc-clouds:' + k + ':' + lightLeft, () => {
      const r = LB.rng(909), out = [];
      const cumulus = (w, h, layer, y, speed, flat) => {
        w = R(w * k); h = R(h * k);
        const cv = LB.canvas(w, h), P = LB.paint(LB.ctx2d(cv));
        const n = Math.max(3, R(w / (h * (flat ? 0.55 : 0.75))));
        const lumps = [];
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n;
          const rr = h * (flat ? 0.2 + 0.2 * Math.pow(Math.sin(Math.PI * u), 0.5) : 0.24 + 0.3 * Math.pow(Math.sin(Math.PI * u), 0.7)) * (0.82 + r() * 0.36);
          const cx = 2 + rr * 0.6 + u * (w - 4 - rr * 1.2), cy = h - 1 - rr * 0.92;
          lumps.push([cx, cy, rr]);
          P.disc(cx, cy, rr, '#fff');
        }
        for (let i = 0; i < n - 1; i++) {
          const [x1, y1, r1] = lumps[i], [x2, y2, r2] = lumps[i + 1];
          if (r() < 0.35) continue;
          const rr = Math.min(r1, r2) * (0.5 + r() * 0.2);
          P.disc((x1 + x2) / 2 + (r() - 0.5) * 2, Math.min(y1, y2) - rr * 0.15, rr, '#fff');
        }
        P.rect(lumps[0][0], h - 1 - h * 0.28, lumps[n - 1][0] - lumps[0][0], h * 0.28 + 1, '#fff');
        const a = LB.ctx2d(cv).getImageData(0, 0, w, h).data, cls = new Uint8Array(w * h);
        const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 128;
        const topAt = new Int16Array(w).fill(h);
        for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (inside(x, y)) { topAt[x] = y; break; }
        const sx = lightLeft ? -1 : 1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (!inside(x, y)) continue;
          const d = y - topAt[x], depth = (y - topAt[x]) / Math.max(1, h - topAt[x]);
          let c = 2;
          if (y >= h - 2) c = 4; else if (depth > 0.62) c = 3;
          if (d <= 1 || (!inside(x + sx, y) && depth < 0.5) || (topAt[x + sx] !== undefined && topAt[x + sx] > y && d <= 3)) c = 1;
          else if (topAt[x - sx] !== undefined && topAt[x - sx] > y + 1 && depth < 0.6) c = 3;
          cls[y * w + x] = c;
        }
        out.push({ w, h, cls, layer, y, speed, x0: r() * (480 + 200) });
      };
      const cirrus = (w, y, speed) => {
        w = R(w * k); const h = 3, cls = new Uint8Array(w * h);
        for (let row = 0; row < h; row++) {
          let x = Math.floor(r() * w * 0.25);
          while (x < w) {
            const len = 6 + Math.floor(r() * w * 0.4);
            for (let i = x; i < Math.min(w, x + len); i++) cls[row * w + i] = row === 0 ? 1 : 2;
            x += len + 2 + Math.floor(r() * 10);
          }
        }
        out.push({ w, h, cls, layer: 'high', y, speed, x0: r() * (480 + 200) });
      };
      // y in the first postcard's sky (0 = top, 150 = horizon); 'zenith' clouds sit above the frame for the reflections
      for (let i = 0; i < 5; i++) cirrus(40 + Math.floor(r() * 60), 14 + Math.floor(r() * 40), 0.9 + r() * 0.6);
      for (let i = 0; i < 5; i++) cumulus(44 + Math.floor(r() * 40), 22 + Math.floor(r() * 12), 'mid', 18 + Math.floor(r() * 44), 2.4 + r() * 1.4);
      for (let i = 0; i < 7; i++) cumulus(22 + Math.floor(r() * 26), 9 + Math.floor(r() * 6), 'low', 96 + Math.floor(r() * 30), 1.2 + r() * 0.8);
      for (let i = 0; i < 6; i++) cumulus(60 + Math.floor(r() * 50), 24 + Math.floor(r() * 10), 'zenith', -150 + Math.floor(r() * 140), 2 + r());
      for (let i = 0; i < 12; i++) cumulus(100 + Math.floor(r() * 70), 24 + Math.floor(r() * 12), 'storm', -150 + Math.floor(r() * 210), 4 + r() * 2, true);
      return out;
    });
  }

  // ---------- the environment for this quarter hour: the painted sky and far land, coloured ----------
  function getEnv(S, G) {
    const W = G.w, H = G.h, k = W / 480, hz = R((G.meta.horizon != null ? G.meta.horizon : 0.36) * H);
    const key = [S.season, S.weather, R(S.time * 8), W, hz].join('|');
    if (G.pcEnv && G.pcEnv.key === key) return G.pcEnv;
    const L = S.L;
    const e = { key, W, H, k, hz, EXT: H, L, mS: clamp((hz / k - 10) / 150, 0.4, 0.8) };
    const gm = new Map();
    e.G = (c) => { let v = gm.get(c); if (!v) { v = LB.hex(grade(c, L)); gm.set(c, v); } return v; };
    e.hzC = LB.mix(L.skyHor, L.skyTop, 0.18);
    e.HZ = HAZE[S.weather] || HAZE.clear;
    e.sun = sunAt(S.time, e); e.moon = moonAt(S.time, e);
    const src = e.sun || e.moon;
    e.lightLeft = src ? src.x < W * 0.62 : true;
    e.sky = buildSky(S, e);
    e.far = buildFar(S, e);
    e.clouds = buildClouds(S, e);
    e.water = e.G('#1c4266');
    e.hl = L.night > 0.5 ? LB.mix(L.skyHor, '#9aaad8', 0.45) : LB.mix(L.skyHor, '#ffffff', 0.4);
    e.dark = e.G('#102a42');
    G.pcEnv = e;
    return e;
  }
  // the sky, tall: EXT rows above the frame too (the pond mirrors what's overhead), banded round the sun's glow
  function buildSky(S, e) {
    const { W, H, EXT, hz, L } = e, TH = H + EXT;
    const cv = LB.canvas(W, TH), c = LB.ctx2d(cv), id = c.createImageData(W, TH), d = id.data;
    const top = LB.rgb(L.skyTop), hor = LB.rgb(L.skyHor);
    const src = e.sun || (L.night > 0.4 ? e.moon : null);
    const glowC = LB.rgb(e.sun ? LB.mix(LB.mix('#fff4d0', '#ffbe7a', L.golden), '#ff8a5a', Math.max(0, L.golden - 0.75) * 3) : '#8a98cc');
    const clear = S.weather === 'clear' ? 1 : S.weather === 'fog' ? 0.5 : 0.25;
    const gs = src ? (e.sun ? 0.16 + 0.62 * L.golden : 0.14) * clear : 0;
    const N = 11;
    for (let ty = 0; ty < TH; ty++) {
      const y = ty - EXT;
      const t = Math.pow(clamp(y / hz, 0, 1.2), 1.55);
      for (let x = 0; x < W; x++) {
        let v = t;
        if (gs) { const dx = (x - src.x) / (105 * e.k), dy = (y - src.y) / (62 * e.k); v += gs * Math.exp(-(dx * dx + dy * dy)); }
        const q = Math.floor(v * N + (LB.bayer(x, ty) - 0.5) * 0.55) / N;
        let col;
        if (q <= 1) { const kk = Math.max(0, q); col = [top[0] + (hor[0] - top[0]) * kk, top[1] + (hor[1] - top[1]) * kk, top[2] + (hor[2] - top[2]) * kk]; }
        else { const kk = Math.min(1, (q - 1) / 0.55); col = [hor[0] + (glowC[0] - hor[0]) * kk, hor[1] + (glowC[1] - hor[1]) * kk, hor[2] + (glowC[2] - hor[2]) * kk]; }
        const i = (ty * W + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    c.putImageData(id, 0, 0);
    return cv;
  }
  function buildFar(S, e) {
    const { W, H, L } = e, g = L.golden;
    const cls = farClasses(e, S.season, e.lightLeft);
    const pal = [];
    const set = (kk, col, hi, extra) => { pal[kk] = LB.rgb(LB.mix(e.G(col), e.hzC, clamp(e.HZ[hi] + (extra || 0), 0, 1))); };
    const alpen = LB.mix(SNOW[0], '#ffc2ae', 0.5 * g);
    const rim = L.night > 0.5 ? '#c4d0f4' : LB.mix('#fff4dc', '#ffb070', g);
    set(1, ROCK[0][0], 0); set(2, ROCK[0][1], 0); set(3, alpen, 0); set(4, SNOW[1], 0); set(5, LB.mix(rim, alpen, 0.4), 0);
    set(6, ROCK[1][0], 1); set(7, ROCK[1][1], 1); set(8, alpen, 1); set(9, SNOW[1], 1); set(10, rim, 1);
    set(11, PINE.lit, 2); set(12, PINE.dark, 2);
    const FD = FAR_DECID[S.season];
    for (let kk = 0; kk < 3; kk++) { set(13 + kk, FD[kk], 2); set(19 + kk, LB.shade(FD[kk], -0.55), 2); }
    set(16, SNOW[0], 2);
    const FL = FIELDS[S.season];
    set(17, FL[0], 3, 0.1); set(18, FL[1], 3, 0.1);
    const cv = LB.canvas(W, H), c = LB.ctx2d(cv), id = c.createImageData(W, H), d = id.data;
    for (let i = 0; i < W * H; i++) {
      const kk = cls[i];
      if (!kk) continue;
      const col = pal[kk];
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    c.putImageData(id, 0, 0);
    return cv;
  }
  function buildClouds(S, e) {
    const L = S.L, n = L.night, g = L.golden;
    const day = ['#ffffff', '#eef2fa', '#d4dcee', '#b2c0dc'];
    const gold = ['#ffe8b6', '#ffc4a0', '#e8989e', '#9a78a6'];
    const night = ['#6e7aae', '#363e6e', '#2c335e', '#1e2448'];
    const storm = ['#9ea6b6', '#7a8496', '#626b7e', '#4a5264'];
    const cols = [0, 1, 2, 3].map((i) => {
      let c = LB.mix(day[i], night[i], n);
      c = LB.mix(c, gold[i], g * 0.85);
      if (S.weather !== 'clear') c = LB.mix(c, LB.mix(storm[i], night[i], n * 0.85), S.weather === 'fog' ? 0.5 : 0.78);
      return LB.rgb(c);
    });
    return cloudShapes(e.k, e.lightLeft).map((s) => {
      const cv = LB.canvas(s.w, s.h), c = LB.ctx2d(cv), id = c.createImageData(s.w, s.h), d = id.data;
      for (let i = 0; i < s.cls.length; i++) {
        const kk = s.cls[i];
        if (!kk) continue;
        const col = cols[kk - 1];
        d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
      }
      c.putImageData(id, 0, 0);
      return { s, cv };
    });
  }

  // ---------- the backdrop for this frame: sky, stars, sun or moon, clouds, the far land (tall: y from -EXT) ----------
  function backdrop(S, e) {
    const { W, H, EXT, k, hz } = e, TH = H + EXT;
    const cv = LB.memo('pc-bd:' + W, () => LB.canvas(W, TH)), c = LB.ctx2d(cv), P = LB.paint(c);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(e.sky, 0, 0);
    c.translate(0, EXT);
    // stars
    const sa = LB.smooth(0.25, 0.85, S.L.night) * (S.weather === 'clear' ? 1 : 0);
    if (sa > 0.03) {
      const stars = LB.memo('pc-stars:' + W + ':' + hz, () => {
        const r = LB.rng(4242), out = [];
        for (let i = 0; i < 260 * k; i++) {
          let x = r() * W, y = -EXT + r() * (EXT + hz - 8 * k);
          if (i < 90 * k) { const u = r(); x = u * W; y = 18 * k + u * 70 * k + (r() - 0.5) * 22 * k; }
          out.push([R(x), R(y), r(), r()]);
        }
        return out;
      });
      for (const [x, y, b, ph] of stars) {
        const tw = 0.55 + 0.45 * Math.sin(S.t * (0.8 + ph * 2.2) + ph * 30);
        c.globalAlpha = sa * (b > 0.85 ? 1 : 0.35 + b * 0.5) * tw;
        const col = ph > 0.8 ? '#ffe6c0' : ph < 0.2 ? '#c4d4ff' : '#f4f6ff';
        P.px(x, y, col);
        if (b > 0.93) { c.globalAlpha *= 0.5; P.px(x - 1, y, col); P.px(x + 1, y, col); P.px(x, y - 1, col); P.px(x, y + 1, col); }
      }
      c.globalAlpha = 1;
    }
    // the sun or the moon
    const L = S.L, clear = S.weather === 'clear' ? 1 : S.weather === 'fog' ? 0.5 : 0.2;
    if (e.sun) {
      const s = e.sun, g = L.golden, x = R(s.x), y = R(s.y);
      const core = LB.mix('#fffbea', '#ffd27a', g), rimC = LB.mix('#fff2c0', '#ff8c50', g), rad = R((7 + g * 3) * k);
      c.globalAlpha = 0.16 * clear; P.disc(x, y, rad + 10 * k, LB.mix(L.skyHor, '#fff2c8', 0.6));
      c.globalAlpha = 0.26 * clear; P.disc(x, y, rad + 5 * k, LB.mix(L.skyHor, '#fff4d0', 0.7));
      c.globalAlpha = clear < 1 ? 0.5 + clear * 0.5 : 1;
      if (S.weather === 'fog') P.disc(x, y, rad, LB.mix(core, L.skyHor, 0.35));
      else {
        P.disc(x, y, rad, rimC); P.disc(x - 1, y - 1, rad - 2, core);
        if (g > 0.55) for (let kk = 0; kk < 3; kk++) P.rect(x - rad, y + R((2 + kk * 3) * k), rad * 2 + 1, 1, LB.mix(L.skyHor, rimC, 0.35));
      }
      c.globalAlpha = 1;
    } else if (e.moon && L.night > 0.3) {
      const m = e.moon, a = LB.smooth(0.3, 0.8, L.night) * (S.weather === 'clear' ? 1 : 0.35), x = R(m.x), y = R(m.y);
      c.globalAlpha = 0.1 * a; P.disc(x, y, 14 * k, '#a8b8f0');
      c.globalAlpha = 0.16 * a; P.disc(x, y, 9 * k, '#b8c8f8');
      c.globalAlpha = a; P.disc(x, y, R(6 * k), '#e8ecf8'); P.disc(x + R(2 * k), y + R(k), R(4 * k), '#c6cee6');
      c.globalAlpha = 1;
    }
    // clouds
    const stormy = S.weather === 'rain' || S.weather === 'snow';
    for (const { s, cv: ccv } of e.clouds) {
      if (s.layer === 'storm' && !stormy) continue;
      if (s.layer === 'mid' && S.weather === 'fog') continue;
      const span = W + s.w + 40;
      const x = ((((s.x0 * k + S.t * s.speed * k) % span) + span) % span) - s.w - 20;
      const y = s.layer === 'zenith' || s.layer === 'storm' ? R(s.y * k) : R((s.y / 150) * hz);
      c.globalAlpha = s.layer === 'high' ? (stormy ? 0 : 0.85) : s.layer === 'low' && S.weather === 'fog' ? 0.6 : 1;
      if (c.globalAlpha > 0) c.drawImage(ccv, R(x), y);
    }
    c.globalAlpha = 1;
    // the far land over the sky
    c.drawImage(e.far, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
    return cv;
  }

  // ---------- the water, side on: the sky mirrored about the horizon, the farm in the pond, ripples, glitter ----------
  function skyMask(G) {
    const key = 'pc-skymask:' + G.dir + ':' + (G.openKey || '');
    return LB.memo(key, () => {
      const W = G.w, H = G.h, m = LB.canvas(W, H), c = LB.ctx2d(m), id = c.createImageData(W, H);
      const op = LB.ctx2d(G.open).getImageData(0, 0, W, H).data;
      const rf = G.refl;   // the mirror pass: where it has something, the farm is reflected, not the sky
      for (let i = 0; i < W * H; i++) if (op[i * 4 + 3] > 128 && !(rf && rf[i * 4 + 3] > 128)) id.data[i * 4 + 3] = 255;
      c.putImageData(id, 0, 0);
      return m;
    });
  }
  function openPx(G) {
    return LB.memo('pc-openpx:' + G.dir + ':' + (G.openKey || ''), () => {
      const d = LB.ctx2d(G.open).getImageData(0, 0, G.w, G.h).data, a = new Uint8Array(G.w * G.h);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] > 128 ? 1 : 0;
      return a;
    });
  }
  function water(ctx, S, P, G, e, bd) {
    if (!G.water || !G.open) return;
    const OP = openPx(G), isOpen = (x, y) => x >= 0 && y >= 0 && x < G.w && y < G.h && OP[y * G.w + x] === 1;
    const { W, H, k, hz, EXT } = e, L = S.L;
    const [, by0, , by1] = G.wBox;
    // 1. the sky (and its clouds, stars, sun) mirrored about the horizon, where the pond sees sky
    const mir = LB.memo('pc-mir:' + W, () => LB.canvas(W, H)), mc = LB.ctx2d(mir);
    mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalAlpha = 1; mc.globalCompositeOperation = 'source-over'; mc.clearRect(0, 0, W, H);
    for (let y = by0; y <= by1; y++) {
      const sy = 2 * hz - y + EXT;
      if (sy >= 0 && sy < H + EXT) mc.drawImage(bd, 0, sy, W, 1, 0, y, W, 1);
    }
    // deeper toward the viewer: the water's own colour comes through
    mc.fillStyle = e.water;
    for (let y = by0; y <= by1; y++) { mc.globalAlpha = 0.12 + 0.4 * Math.pow((y - by0) / Math.max(1, by1 - by0), 1.2); mc.fillRect(0, y, W, 1); }
    mc.globalAlpha = 1;
    const rough = (S.weather === 'rain' ? 2.6 : S.weather === 'snow' ? 1.8 : 1.4) * k;
    LB.ripple(ctx, mir, skyMask(G), S, { amp: rough, freq: 0.62 / k, speed: 1.5, alpha: 1, y0: by0, y1: by1 + 1, grow: true, slot: 'pc-sky' + W });
    // 2. the farm in the pond (the 3D mirror pass, lit for the hour)
    if (G.reflLit) LB.ripple(ctx, G.reflLit, G.open, S, { amp: rough * 0.9, freq: 0.55 / k, speed: 1.3, alpha: 0.85, y0: by0, y1: by1 + 1, grow: true, slot: 'pc-refl' + W });
    // 3. moving ripple lines: light where they catch the sky, dark in their troughs
    const open = G.open, night = L.night;
    ctx.save();
    for (let y = by0 + 1; y <= by1; y++) {
      const d = (y - by0) / k;
      const v = Math.sin(d * 0.75 - S.t * 1.3 + Math.sin(d * 0.21 + S.t * 0.27) * 2.2);
      if (v < 0.9 && v > -0.94) continue;
      const light = v > 0, seg = R((3 + d * 0.12) * k), gap = R((3 + d * 0.1) * k);
      const shift = R(S.t * (light ? 3 : -2) * (0.4 + d * 0.02) * k);
      ctx.globalAlpha = light ? (0.35 + 0.3 * (1 - night)) * (0.5 + 0.5 * (y - by0) / Math.max(1, by1 - by0)) : 0.32;
      ctx.fillStyle = light ? e.hl : e.dark;
      for (let x = -seg - gap; x < W; x += seg + gap) {
        const kk = Math.floor((x + shift) / (seg + gap));
        if (LB.hash(kk, R(d), 51) < 0.42) continue;
        const xx = x + (((shift % (seg + gap)) + seg + gap) % (seg + gap));
        for (let i = 0; i < seg; i++) if (isOpen(xx + i, y)) ctx.fillRect(xx + i, y, 1, 1);
      }
    }
    ctx.restore();
    // 4. the glitter path under the sun (or the moon), only where it's above the land
    const src = e.sun && e.sun.elev > 0.01 ? e.sun : e.moon && L.night > 0.5 ? e.moon : null;
    const clear = S.weather === 'clear' ? 1 : S.weather === 'fog' ? 0.45 : 0;
    if (src && clear) {
      const gc = src === e.sun ? LB.mix(LB.mix('#fff8dc', '#ffd27a', L.golden), '#ff9a5a', Math.max(0, L.golden - 0.7) * 2.5) : '#d4defc';
      ctx.save(); ctx.globalAlpha = clear * 0.9; ctx.fillStyle = gc;
      const tick = Math.floor(S.t * 5);
      for (let y = by0; y <= by1; y++) {
        const d = (y - by0) / k, spread = (2 + d * 0.34 * (src === e.sun ? 1 : 0.7)) * k;
        const count = 1 + (d > 25) + (d > 55);
        for (let kk = 0; kk < count; kk++) {
          const ph = tick + Math.floor(d * 0.37 + kk * 0.5), hs = LB.hash(R(d), kk * 31 + ph, 61);
          if (hs < 0.32) continue;
          const x = src.x + (LB.hash(R(d), kk * 7 + ph, 62) * 2 - 1) * spread * (kk === 0 ? 0.45 : 1);
          const len = Math.max(1, R((1 + hs * (1.5 + d * 0.05)) * k));
          for (let i = 0; i < len; i++) { const xx = R(x - len / 2) + i; if (isOpen(xx, y)) ctx.fillRect(xx, y, 1, 1); }
        }
      }
      ctx.restore();
    }
    // 5. lit windows streaking down the water after dark
    if (G._reflglow && G.Lt && G.Lt.glow > 0.08) {
      const gl = LB.memo('pc-gl:' + W, () => LB.canvas(W, H)), gcx = LB.ctx2d(gl);
      gcx.globalCompositeOperation = 'source-over'; gcx.globalAlpha = 1; gcx.clearRect(0, 0, W, H);
      LB.ripple(gcx, G._reflglow, null, S, { amp: 2 * k, freq: 0.9 / k, speed: 2.6, alpha: 1, slot: 'pc-glr' + W });
      const st = LB.memo('pc-gls:' + W, () => LB.canvas(W, H)), sc = LB.ctx2d(st);
      sc.globalCompositeOperation = 'source-over'; sc.globalAlpha = 1; sc.clearRect(0, 0, W, H);
      for (let d = 0; d <= R(5 * k); d++) { sc.globalAlpha = 1 - d / (R(5 * k) + 1); sc.drawImage(gl, 0, d * 2); }
      sc.globalAlpha = 1; sc.globalCompositeOperation = 'destination-in'; sc.drawImage(open, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 * G.Lt.glow; ctx.drawImage(st, 0, 0); ctx.restore();
    }
    // 6. the lap line along the shore, rain rings, a fish now and then
    if (G.shore && S.season !== 'winter') {
      ctx.save(); ctx.fillStyle = night > 0.6 ? '#8a9ac4' : LB.mix('#d8ecea', L.skyHor, 0.25);
      for (const [x, y] of G.shore) { const v = Math.sin(S.t * 1.5 + x * 0.33 / k + y * 0.21 / k); if (v > 0.2) { ctx.globalAlpha = LB.lerp(0.85, 0.45, night); ctx.fillRect(x, y, 1, 1); } }
      ctx.restore();
    }
    const inOpen = (pts) => pts.filter(([x, y]) => isOpen(x, y));
    if (S.weather === 'rain') LB.rings(ctx, inOpen(G.ringPts.concat(G.waterPts.slice(0, 16))), S, { period: 1, r: R(4 * k), alpha: 0.6 });
    else LB.rings(ctx, inOpen(G.fishPts), S, { period: 5, r: R(7 * k), alpha: 0.45 });
  }

  // ---------- mist: long horizontal banks lying in the valley and over the pond (fog; a little at dawn) ----------
  function mist(ctx, S, G, e) {
    const dawn = S.time > 5.5 && S.time < 8.5 && S.weather === 'clear' ? LB.smooth(8.5, 6.6, S.time) * 0.55 : 0;
    const amt = S.weather === 'fog' ? 1 : dawn;
    if (amt < 0.03) return;
    const { W, H, k, hz } = e, L = S.L;
    const tex = LB.memo('pc-mist:' + W, () => {
      // a strip twice the frame wide: stepped bands, thin and long, ragged at their ends
      const cv = LB.canvas(W * 2, H), c = LB.ctx2d(cv), id = c.createImageData(W * 2, H), d = id.data;
      const period = 6;
      for (let y = 0; y < H; y++) for (let x = 0; x < W * 2; x++) {
        const n = LB.fbm((x / (W * 2)) * period, y / (14 * k), 61, 3, period);
        const v = LB.smooth(0.42, 0.7, n);
        d[(y * W * 2 + x) * 4 + 3] = (Math.round(v * 3) / 3) * 255;
      }
      c.putImageData(id, 0, 0);
      return cv;
    });
    const col = L.night > 0.6 ? '#4a5478' : LB.mix(LB.mix(L.skyHor, '#f2f2f4', 0.55), '#ffd8b4', L.golden * 0.3);
    const tmp = LB.memo('pc-mistc:' + W, () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
    tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1; tc.clearRect(0, 0, W, H);
    // three banks: the far valley at the horizon, the middle distance, low over the pond and the meadow
    const banks = [[hz - 6 * k, 0.75, 1.6], [hz + 22 * k, 0.6, 2.4], [G.wBox ? G.wBox[1] - 4 * k : H * 0.6, 0.55, 3.4]];
    for (const [y0, a, sp] of banks) {
      const off = Math.round(((S.t * sp * k) % (W * 2) + W * 2) % (W * 2));
      tc.globalAlpha = a;
      tc.drawImage(tex, 0, Math.round(y0 - 20 * k), W * 2, Math.round(26 * k), -off, Math.round(y0 - 20 * k), W * 2, Math.round(26 * k));
      tc.drawImage(tex, 0, Math.round(y0 - 20 * k), W * 2, Math.round(26 * k), W * 2 - off, Math.round(y0 - 20 * k), W * 2, Math.round(26 * k));
    }
    tc.globalAlpha = 1; tc.globalCompositeOperation = 'source-in'; tc.fillStyle = col; tc.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.85 * amt; ctx.drawImage(tmp, 0, 0); ctx.restore();
    // and a pale haze over everything in fog, thicker toward the horizon
    if (S.weather === 'fog') {
      ctx.save();
      for (let y = 0; y < H; y += 2) {
        const dd = Math.abs(y - hz) / H;
        ctx.globalAlpha = Math.max(0, 0.32 - dd * 0.5);
        ctx.fillStyle = col; ctx.fillRect(0, y, W, 2);
      }
      ctx.restore();
    }
  }

  // ---------- the camera move: a strip of frames baked at golden hour, played on a click ----------
  const strips = {};
  function strip(ts) {
    if (!strips[ts]) {
      const s = strips[ts] = { img: new Image(), meta: null, ok: false };
      s.done = fetch(MOVE[ts] + '/strip.json').then((r) => r.json()).then((m) => new Promise((res) => {
        s.meta = m; s.img.onload = () => { s.ok = true; res(); }; s.img.onerror = () => res(); s.img.src = MOVE[ts] + '/strip.png';
      })).catch(() => {});
    }
    return strips[ts];
  }
  const FPS = 13, HOLD = 0.35, FADE = 0.9;
  let play = null;
  function drawMove(ctx, S, G, e) {
    if (!play) return;
    const s = strip(ver().ts);
    if (!s.ok || s.meta.w !== G.w) { play = null; return; }
    const now = performance.now() / 1000, el = now - play.t0, n = s.meta.n;
    const fi = Math.min(n - 1, Math.floor(el * FPS));
    const end = n / FPS + HOLD;
    if (el > end + FADE) { play = null; return; }
    const fade = el > end ? 1 - (el - end) / FADE : 1;
    const { w, h, cols } = s.meta;
    // the sky and far land where the horizon is in this frame, then the frame, lit for the hour
    const tmp = LB.memo('pc-move:' + w, () => LB.canvas(w, h)), tc = LB.ctx2d(tmp);
    tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = 1; tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, w, h);
    const bd = backdrop(S, e), hzF = s.meta.horizons[fi] * h;
    tc.drawImage(bd, 0, R(hzF - e.hz) - e.EXT);
    const fr = LB.memo('pc-movefr:' + w, () => LB.canvas(w, h)), fc = LB.ctx2d(fr);
    fc.globalCompositeOperation = 'source-over'; fc.clearRect(0, 0, w, h);
    fc.drawImage(s.img, (fi % cols) * w, Math.floor(fi / cols) * h, w, h, 0, 0, w, h);
    // the frames are baked at golden hour: shift them toward the hour on the page
    const am = LB.rgb(S.L.amb), gd = LB.rgb('#ffdeb2');
    const tint = [0, 1, 2].map((i) => clamp((am[i] / gd[i]) * 255, 0, 255));
    fc.globalCompositeOperation = 'source-atop'; fc.globalAlpha = 1;
    fc.fillStyle = LB.css(tint); fc.globalCompositeOperation = 'multiply'; fc.fillRect(0, 0, w, h);
    fc.globalCompositeOperation = 'destination-in'; fc.drawImage(s.img, (fi % cols) * w, Math.floor(fi / cols) * h, w, h, 0, 0, w, h);
    tc.drawImage(fr, 0, 0);
    ctx.save(); ctx.globalAlpha = fade; ctx.drawImage(tmp, 0, 0); ctx.restore();
  }

  // ---------- the scene ----------
  let anchors = {};
  const def = RL.scene({
    id: 'postcard', order: 70, section: 'vista', world: 'Verdance', name: 'Postcard: the farm pond from the side',
    blurb: 'The same 3D farm as the game, seen from low down across the pond, with the sky and the far mountains painted behind it. Click it to play the camera move: the game\'s view tilting down into the postcard.',
    see: [
      'The real farm models from the side, lit live: shadows reach toward you at golden hour',
      'The pond mirroring the sky, the clouds and the farm, broken up by ripples, with the sun\'s glitter path',
      'The painted sky behind: the sun setting on the left, stars and the moon at night, mountains with snow in winter',
      'Click: the camera comes down from the game\'s 45° view into the postcard, then the live scene takes over',
    ],
    build: 'A second camera on the scenes we already have: the same Blender kit renders the farm from the side, the engine lights it like the top-down view and paints the sky behind. The camera move is a short cutscene rendered the same way, so it can play when you sit on the dock to fish, or open the title screen.',
    dirs: DIRS,
    live(ctx, S, P, G) {
      // smoke from the farmhouse chimney, leaning with the breeze (more in the cold, the evening and the morning)
      const ch = anchors[G.dir] && anchors[G.dir].chimney;
      const want = S.season === 'winter' || S.season === 'autumn' || S.L.night > 0.3 || S.time < 9 || S.L.golden > 0.4;
      if (ch && want) {
        const k = G.w / 480, c = LB.mix(LB.mix('#e4e2e0', '#9aa2c0', S.L.night), '#ffd6a8', S.L.golden * 0.4);
        ctx.save();
        for (let i = 0; i < 8; i++) {
          const age = (S.t * 0.2 + i / 8) % 1;
          const x = ch[0] + age * 10 * k + Math.sin(age * 5 + i) * k, y = ch[1] - 2 * k - age * 18 * k;
          ctx.globalAlpha = (1 - age) * 0.55;
          P.disc(R(x), R(y), Math.max(1, R((0.8 + age * 2.6) * k)), c);
        }
        ctx.restore();
      }
      // someone fishing at the end of the jetty, seen from behind
      const a = anchors[G.dir] && anchors[G.dir].jetty;
      if (a && LB.chibi) {
        const x = R(a[0]), y = R(a[1]), sc = S.scale || 1;
        LB.chibi(ctx, x, y, 'fisher', { dir: 'up', t: S.t, scale: sc, shadow: false, seed: 4 });
        const tipX = x + R(14 * sc), tipY = y - R(40 * sc), bx = x + R(18 * sc), by = y - R(6 * sc) + R(Math.sin(S.t * 1.3) * 0.6);
        P.line(x + R(4 * sc), y - R(20 * sc), tipX, tipY, '#5a3a24');
        ctx.save(); ctx.globalAlpha = 0.55; P.line(tipX, tipY, bx, by, '#eef2f6'); ctx.restore();
        P.px(bx, by, '#e83a2a'); P.px(bx, by - 1, '#f8f8f8');
      }
    },
    weatherFx: { fogAlpha: 0 },          // the top-down fog's blobs read wrong side on: mist banks instead (below)
    after(ctx, S, P, G) {
      const e = getEnv(S, G);
      mist(ctx, S, G, e);
      drawMove(ctx, S, G, e);
    },
  });
  // the painted backdrop goes behind the 3D render each frame (destination-over), then the side-on water
  def.water = function (ctx, S, P) {
    const G = def._G[dirFor(ver().ts)];
    if (!G) return;
    const e = getEnv(S, G), bd = backdrop(S, e);
    ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.drawImage(bd, 0, -e.EXT); ctx.restore();
    water(ctx, S, P, G, e, bd);
  };
  // the jetty's position comes with the render; the move's strip loads with the scene
  const basePrepare = def.prepare;
  def.prepare = function () {
    const ts = ver().ts, dir = dirFor(ts), p = basePrepare();
    const extra = [];
    if (!anchors[dir] && !anchors[dir + ':loading']) {
      anchors[dir + ':loading'] = true;
      extra.push(fetch(dir + '/anchors.json').then((r) => r.json()).then((a) => { anchors[dir] = a; }).catch(() => { anchors[dir] = {}; }));
    }
    strip(ts);
    const variant = LB.state.chibi || 'round', sc = ts / 32;
    if (LB.chibi && LB.chibi.ready && !LB.chibi.loaded?.(['fisher'], variant, sc) && !def['_chibi' + ts]) {
      def['_chibi' + ts] = true;
      extra.push(LB.chibi.ready(['fisher'], variant, sc));
    }
    if (!p && !extra.length) return null;
    return Promise.all([p, ...extra]);
  };
  def.click = function () {
    const s = strip(ver().ts);
    if (s.ok) play = { t0: performance.now() / 1000 };
  };
  LB.add(def);
})();
