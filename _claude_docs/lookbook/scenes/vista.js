// Postcard: Brambleford Lake — the one side-view scene (Cast n Chill's framing). The sky, mountains in layers, a far
// village, a near hill with a windmill, a headland, the lake mirroring all of it, a dock with someone fishing.
// It draws its own light: the sky keeps its own colours (the kit's grade would darken it twice), everything else is
// graded with the same maths as LB.grade, then faded toward the sky with distance.
(function () {
  'use strict';
  const W = 480, H = 270, H0 = 150, WR = 100; // the far shore's waterline; rows of far reflection below it
  const clamp = LB.clamp, lerp = LB.lerp, R = Math.round;

  // ---------- the kit's grade as a colour function ----------
  const GOLD = [255, 148, 64], MOONLIFT = [42, 68, 134];
  const softCh = (cb, cs) => (cs <= 0.5 ? cb - (1 - 2 * cs) * cb * (1 - cb) : cb + (2 * cs - 1) * ((cb <= 0.25 ? ((16 * cb - 12) * cb + 4) * cb : Math.sqrt(cb)) - cb));
  function grade(c, L) {
    const a = LB.rgb(L.amb), s = LB.rgb(c);
    let r = [(s[0] * a[0]) / 255, (s[1] * a[1]) / 255, (s[2] * a[2]) / 255];
    if (L.golden > 0.04) { const al = 0.32 * L.golden; r = r.map((v, i) => v + (softCh(v / 255, GOLD[i] / 255) * 255 - v) * al); }
    if (L.night > 0.04) { const al = 0.09 * L.night; r = r.map((v, i) => v + (255 - ((255 - v) * (255 - MOONLIFT[i])) / 255 - v) * al); }
    return r;
  }

  // ---------- where the sun and moon are ----------
  function sunAt(time) {
    const p = (time - 6) / 13.6;
    if (p <= 0 || p >= 1) return null;
    const elev = Math.sin(Math.PI * p);
    return { x: lerp(436, 226, p), y: H0 - 4 - elev * 124, elev, p };
  }
  function moonAt(time) {
    const ph = ((((time - 19.9) % 24) + 24) % 24) / 10.2;
    if (ph <= 0 || ph >= 1) return null;
    const el = Math.sin(Math.PI * ph);
    return { x: lerp(424, 150, ph), y: H0 - 12 - el * 104, elev: el, p: ph };
  }

  // haze toward the sky with distance: far range, mid range, far forest, village and shore, near hill, headland
  const HAZE = {
    clear: [0.55, 0.34, 0.24, 0.18, 0.05, 0.09],
    rain: [0.78, 0.6, 0.48, 0.42, 0.16, 0.22],
    snow: [0.8, 0.62, 0.5, 0.44, 0.18, 0.24],
    fog: [0.93, 0.85, 0.76, 0.68, 0.38, 0.48],
  };

  // ---------- the land's shapes ----------
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
  function interp(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (x <= b[0]) { const f = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * (1 - Math.cos(f * Math.PI)) / 2; }
    }
    return pts[pts.length - 1][1];
  }
  const HILL = [[-10, 98], [18, 90], [50, 86], [84, 94], [116, 108], [142, 110], [172, 122], [206, 140], [244, 163]];
  const hillTop = (x) => interp(HILL, x) + (LB.fbm(x * 0.08, 2.2, 31, 2) - 0.5) * 3;
  const hillShore = (x) => 168 - x * 0.036 + (LB.fbm(x * 0.09, 6.6, 33, 2) - 0.5) * 3;
  const HEAD0 = 346;
  const headTop = (x) => 157 - Math.min(40, Math.max(0, x - HEAD0) * 0.42) + (LB.fbm(x * 0.07, 4.4, 37, 2) - 0.5) * 5;
  const HEAD_SHORE = 157;
  const nearShore = (x) => (x < 238 ? R(hillShore(x)) : x >= HEAD0 + 2 ? HEAD_SHORE : 0);
  const bankTop = (x) => (x < 436 ? 254 + R(2 * Math.sin(x * 0.045) + (LB.fbm(x * 0.07, 9.1, 41, 2) - 0.5) * 5) : R(lerp(254, 238, (x - 436) / 44)));
  // the highest land at column x (for hiding the sun's glow behind it)
  const landTop = (x) => Math.min(ridgeAt(RANGES[0], x)[0], ridgeAt(RANGES[1], x)[0], 128, x < 238 ? hillTop(x) - 20 : 999, x >= HEAD0 ? headTop(x) - 18 : 999);
  const DECK = 203, DOCK_X = 290, POSTS = [292, 324, 356, 388, 420, 452];
  const BOBBER = [232, 230];

  // palettes (daylight)
  const ROCK = [['#a4a8c4', '#60668e'], ['#8a968e', '#4a5a6a']];
  const SNOW = ['#f6f9ff', '#b0bee0'];
  const PINE = { lit: '#467652', mid: '#2f5a42', dark: '#1e3e36', rim: '#78a462', trunk: '#4a3628' };
  const DECID = {
    spring: [['#90cc60', '#64a448', '#3e7a3c'], ['#f6c0d2', '#e48aac', '#b45a84'], ['#a8d46c', '#78b04c', '#4a8440']],
    summer: [['#62a84c', '#428a3e', '#2a6234'], ['#74b452', '#4e9442', '#306a36'], ['#5a9e48', '#3c7e3a', '#255a32']],
    autumn: [['#f0a040', '#d06a28', '#9a4222'], ['#e05a3a', '#b03a2c', '#7a2428'], ['#f2cc4a', '#d29a2c', '#9a6a24']],
    winter: [['#8a7a70', '#6a5c56', '#4a4048'], ['#8a7a70', '#6a5c56', '#4a4048'], ['#8a7a70', '#6a5c56', '#4a4048']],
  };
  const GRASS = { spring: '#7cba4e', summer: '#549a40', autumn: '#a29a46', winter: '#eef3fb' };
  const FAR_DECID = { spring: ['#86c45a', '#e8a8c0', '#9ccc66'], summer: ['#4e9444', '#3e8240', '#5a9c48'], autumn: ['#e0782a', '#c4442e', '#e8b438'], winter: ['#857670', '#7a6c66', '#8e7e74'] };

  // ---------- the far land: mountains, the forest along the far shore — a class map per season and light side ----------
  // classes: 1-5 far range (lit, shade, snow lit, snow shade, rim), 6-10 mid range, 11 pine lit, 12 pine dark,
  // 13-15 broadleaf lit (three kinds), 16 snow on trees, 17 shore lit, 18 shore dark, 19-21 broadleaf shade
  function paintRange(cls, band, rg, li, season, lightLeft) {
    const base = li * 5, snowY = rg.snow[season] || 0;
    for (let x = 0; x < W; x++) {
      const [r, oi] = ridgeAt(rg, x), p = rg.P[oi];
      const sy = snowY + (LB.noise(x * 0.09, 3.3, rg.seed) - 0.5) * 16;
      for (let y = Math.max(0, Math.ceil(r)); y < H0; y++) {
        const dd = y - r;
        const xs = p.x + (y - p.y) * p.lean + (LB.noise(y * 0.16, p.x * 0.1, rg.seed + 7) - 0.5) * 7;
        let shade = lightLeft ? x > xs : x < xs;
        // gullies: thin streaks down the lit faces
        if (!shade && dd > 4 && LB.noise((x + (lightLeft ? -1 : 1) * dd * 0.6) * 0.2, dd * 0.035, rg.seed + 9) > 0.72) shade = true;
        const snow = snowY && y < sy;
        let c;
        if (!shade && dd < 1.3) c = snow || li === 0 ? 5 : 1;
        else if (snow) c = shade ? 4 : 3;
        else c = shade ? 2 : 1;
        const i = y * W + x;
        cls[i] = base + c;
        band[i] = y > H0 - 30 ? Math.min(3, Math.floor((y - (H0 - 30)) / 8)) : 0;
      }
    }
  }
  function paintForest(cls, band, season, lightLeft) {
    const r = LB.rng(77), snowy = season === 'winter';
    const rows = [];
    for (let row = 0; row < 2; row++) {
      for (let x = -6 + row * 2; x < W + 6; x += 3 + r() * 3) {
        const tl = 134 + row * 5 + (LB.fbm(x * 0.02, 7.7 + row, 5, 3) - 0.5) * 14;
        rows.push({ x: R(x), top: R(tl - (5 + r() * 8)), round: r() < (season === 'winter' ? 0.25 : 0.32), v: r(), row });
      }
    }
    // the dense mass below the crowns
    for (let x = 0; x < W; x++) {
      const t = R(140 + (LB.fbm(x * 0.03, 3.1, 6, 2) - 0.5) * 8);
      for (let y = t; y < H0 - 2; y++) { cls[y * W + x] = 12; band[y * W + x] = 0; }
    }
    for (const t of rows) {
      const kind = t.v < 0.33 ? 0 : t.v < 0.66 ? 1 : 2;
      const hmax = H0 - 2;
      for (let y = t.top; y < hmax; y++) {
        const dy = y - t.top;
        let hw;
        if (t.round) { const rr = 3 + (t.v * 10 % 2); hw = dy < rr * 2 ? R(Math.sqrt(Math.max(0, rr * rr - (dy - rr) * (dy - rr)))) : R(rr * 0.6); }
        else hw = Math.min(4, Math.floor(dy * 0.42 + (dy % 3 === 2 ? 0.6 : 0)));
        for (let dx = -hw; dx <= hw; dx++) {
          const x = t.x + dx;
          if (x < 0 || x >= W) continue;
          const lit = lightLeft ? dx < 0 : dx > 0;
          let c;
          if (t.round) c = lit ? 13 + kind : 19 + kind;
          else c = lit && dx !== 0 ? 11 : 12;
          if (snowy && !t.round && lit && (dy % 3 === 0 || dy < 2)) c = 16;
          if (snowy && t.round && dy < 2) c = 16;
          const i = y * W + x;
          cls[i] = c; band[i] = 0;
        }
      }
    }
    for (let x = 0; x < W; x++) for (let y = H0 - 2; y < H0; y++) cls[y * W + x] = (y === H0 - 2) === ((x >> 2) % 3 !== 0) ? 17 : 18;
  }
  function farClasses(season, lightLeft) {
    return LB.memo('vista-far:' + season + ':' + lightLeft, () => {
      const cls = new Uint8Array(W * H0), band = new Uint8Array(W * H0);
      paintRange(cls, band, RANGES[0], 0, season, lightLeft);
      paintRange(cls, band, RANGES[1], 1, season, lightLeft);
      paintForest(cls, band, season, lightLeft);
      return { cls, band };
    });
  }

  // ---------- the far village (Brambleford): houses, the bell tower, windows that light at night ----------
  const HOUSES = [
    { x: 250, w: 9, h: 6, roof: '#a44a3a' }, { x: 262, w: 11, h: 7, roof: '#4e5e80' }, { tower: 1, x: 277, w: 5, h: 17 },
    { x: 285, w: 10, h: 6, roof: '#7e4c3a' }, { x: 298, w: 12, h: 8, roof: '#aa5a3a' }, { x: 313, w: 9, h: 6, roof: '#4e5e80' },
    { x: 325, w: 10, h: 7, roof: '#8c3c34' }, { x: 338, w: 8, h: 5, roof: '#6a5c4c' },
  ];
  function drawVillage(P, S, e) {
    const f = (c) => e.fade(c, 3);
    const windows = [], chimneys = [];
    const base = H0 - 2;
    const lit = S.L.night > 0.35;
    // trees behind and between
    for (const [x, r] of [[247, 4], [259, 3], [283, 3], [296, 4], [322, 3], [335, 4], [349, 3]]) {
      const C = FAR_DECID[S.season];
      P.disc(x, base - r - 1, r, f(C[1])); P.disc(x - 1, base - r - 2, r - 1, f(C[0]));
    }
    for (const hs of HOUSES) {
      if (hs.tower) {
        const x = hs.x, top = base - hs.h;
        P.rect(x, top, hs.w, hs.h, f('#cfc6b4')); P.rect(x + hs.w - 1, top, 1, hs.h, f('#9a9282'));
        P.rect(x + 2, top + 2, 1, 2, f('#3a3440'));
        P.poly([[x - 0.5, top], [x + hs.w + 0.5, top], [x + hs.w / 2, top - 7]], f('#4a5070'));
        P.px(x + 2, top - 8, f('#e8c860'));
        if (lit) windows.push([x + 2, top + 6]);
        continue;
      }
      const x = hs.x, top = base - hs.h, rh = Math.ceil(hs.w / 2);
      P.rect(x, top, hs.w, hs.h, f('#e8dcc4'));
      P.rect(x + hs.w - 2, top, 2, hs.h, f('#b8a890'));
      P.poly([[x - 1, top + 0.5], [x + hs.w + 1, top + 0.5], [x + hs.w / 2, top - rh]], f(hs.roof));
      P.poly([[x + hs.w / 2, top - rh], [x + hs.w + 1, top + 0.5], [x + hs.w / 2 + 1, top + 0.5]], f(LB.shade(hs.roof, -0.4)));
      if (S.snowy) P.poly([[x - 1, top - 0.5], [x + hs.w / 2, top - rh], [x + hs.w / 2, top - rh + 2], [x + 1, top + 0.5]], f('#f4f8ff'));
      const ws = [[x + 2, top + 2], [x + hs.w - 4, top + 2]];
      for (const [wx, wy] of ws) {
        const on = lit && LB.hash(wx, wy, 5) > 0.25;
        P.rect(wx, wy, 1, 2, on ? '#ffd27a' : f('#4a4450'));
        if (on) windows.push([wx, wy]);
      }
      if (hs.w >= 10) { P.rect(x + hs.w - 3, top - rh + 1, 1, 3, f('#6a4a3c')); chimneys.push([x + hs.w - 3, top - rh]); }
    }
    // a stone quay under the village
    P.rect(244, base, 110, 2, f('#a69e8e')); P.rect(244, base + 1, 110, 1, f('#6e6860'));
    e.windows = windows; e.chimneys = chimneys;
  }

  // ---------- trees for the near hill and headland ----------
  function drawPine(P, x, y, h, C, lightLeft, snowy) {
    x = R(x); y = R(y); h = R(h);
    const tiers = Math.max(3, R(h / 5));
    P.rect(x, y - 3, 1, 3, C.trunk);
    const top = y - h, body = h - 3;
    for (let k = 0; k < tiers; k++) {
      const ty = top + R((k * body) / tiers), tb = top + R(((k + 1) * body) / tiers) + 1;
      const maxw = 1 + R(((k + 1) / tiers) * h * 0.22);
      for (let yy = ty; yy <= tb; yy++) {
        const f = (yy - ty + 1) / (tb - ty + 1), hw = Math.max(0, R(maxw * f));
        const bottom = yy === tb;
        const litC = bottom ? C.mid : C.lit, darkC = C.dark;
        P.rect(x - hw, yy, hw, 1, lightLeft ? litC : darkC);
        P.rect(x + 1, yy, hw, 1, lightLeft ? darkC : litC);
        P.px(x, yy, bottom ? C.dark : C.mid);
        P.px(lightLeft ? x - hw : x + hw, yy, bottom ? C.mid : C.rim);
        if (snowy && yy - ty < 2 && hw > 0) P.rect(lightLeft ? x - hw : x + 1, yy, Math.max(1, hw - (yy - ty)), 1, C.snow);
      }
      // drooping tips under each tier
      P.px(x - maxw, tb + 1, C.dark); P.px(x + maxw, tb + 1, C.dark);
    }
    P.px(x, top - 1, C.mid);
  }
  function drawBroadleaf(P, x, y, r, tones, trunk, lightLeft, season, seed, snow) {
    x = R(x); y = R(y);
    const s = lightLeft ? -1 : 1;
    if (season === 'winter' && r < 4) {
      for (let i = -3; i <= 3; i++) P.line(x + i * 0.6, y, x + i * 1.4, y - 3 - (Math.abs(i) < 2 ? 2 : 0), trunk);
      if (snow) P.rect(x - 3, y - 4, 7, 1, snow);
      return;
    }
    if (season === 'winter') {
      // bare branches with snow along their tops
      const br = (bx, by, len, ang, depth) => {
        const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
        P.line(bx, by, ex, ey, trunk);
        if (snow) P.px(R(ex), R(ey) - 1, snow);
        if (depth > 0) { br(ex, ey, len * 0.7, ang - 0.5, depth - 1); br(ex, ey, len * 0.66, ang + 0.45, depth - 1); }
      };
      P.rect(x, y - r - 2, 2, r + 2, trunk);
      br(x, y - r - 2, r * 0.8, -Math.PI / 2 - 0.4, 2); br(x + 1, y - r - 2, r * 0.8, -Math.PI / 2 + 0.45, 2);
      return;
    }
    const bush = r < 4;
    const th = bush ? 0 : R(r * 0.7);
    if (!bush) { P.rect(x, y - th, 2, th, trunk); P.rect(lightLeft ? x : x + 1, y - th, 1, th, LB.shade(trunk, 0.3)); }
    const cy = bush ? y - r * 0.7 : y - th - r * 0.85, cx = x + 1;
    // round lumps: a dark mass, mid-tone lumps over its top, a lit lump toward the light
    P.disc(cx, cy, r, tones[2]);
    P.disc(cx - r * 0.42, cy - r * 0.18, r * 0.66, tones[2]);
    P.disc(cx + r * 0.42, cy - r * 0.12, r * 0.62, tones[2]);
    P.disc(cx + s * r * 0.3, cy - r * 0.3, r * 0.62, tones[1]);
    P.disc(cx - s * r * 0.25, cy - r * 0.42, r * 0.45, tones[1]);
    P.disc(cx + s * r * 0.42, cy - r * 0.48, r * 0.34, tones[0]);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + s * (0.4 + LB.hash(seed, i, 3) * 1.1); P.px(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.8, tones[0]); }
    for (let i = 0; i < 3; i++) P.px(cx - s * (r * 0.2 + i * 2), cy + r * 0.5 - (i % 2), tones[1]); // a few leaves catching light underneath
    // a few sprigs of the lit tone
    for (let i = 0; i < 4; i++) { const a = LB.hash(seed, i, 3) * Math.PI * 2; P.px(x + 1 + Math.cos(a) * r * 0.7 + s * 2, cy + Math.sin(a) * r * 0.6 - 1, tones[0]); }
  }
  function hillTrees() {
    return LB.memo('vista-hilltrees', () => {
      const r = LB.rng(5150), out = [];
      for (let i = 0; i < 56; i++) {
        let x = r() * 116 - 8;
        const top = hillTop(x), room = Math.min(34, hillShore(x) - top - 8);
        out.push({ k: 'pine', x, y: top + 3 + r() * room, h: 15 + r() * 14 });
      }
      // the forest running down the left of the hill to the water
      for (let i = 0; i < 26; i++) {
        const x = r() * 70 - 6, top = hillTop(x), bot = hillShore(x);
        out.push({ k: 'pine', x, y: top + 30 + r() * Math.max(2, bot - top - 36), h: 13 + r() * 12 });
      }
      // bushes along the shore
      for (let i = 0; i < 8; i++) { const x = 70 + r() * 150; out.push({ k: 'leaf', x, y: hillShore(x) - 3, h: 2.5 + r() * 1.2, kind: i % 3, seed: 40 + i }); }
      for (let i = 0; i < 10; i++) {
        const x = 150 + r() * 78, top = hillTop(x), room = Math.max(2, hillShore(x) - top - 8);
        out.push({ k: 'leaf', x, y: top + 4 + r() * Math.min(18, room), h: 6 + r() * 3, kind: i % 3, seed: i * 13 + 5 });
      }
      for (let i = 0; i < 9; i++) {
        const x = HEAD0 + 52 + i * 9 + r() * 5;
        out.push({ k: 'pine', x, y: headTop(x) + 3 + r() * 3, h: 13 + r() * 12 });
      }
      for (let i = 0; i < 2; i++) { const x = HEAD0 + 30 + i * 12; out.push({ k: 'leaf', x, y: headTop(x) + 4, h: 3, kind: 2, seed: 90 + i }); }
      out.sort((a, b) => a.y - b.y);
      return out;
    });
  }

  // ---------- the environment: everything that changes only with the season, the weather or the quarter hour ----------
  let env = null;
  function getEnv(S) {
    const key = S.season + '|' + S.weather + '|' + R(S.time * 4);
    if (env && env.key === key) return env;
    const L = S.L, gmap = new Map();
    const G = (c) => { let v = gmap.get(c); if (!v) { v = LB.hex(grade(c, L)); gmap.set(c, v); } return v; };
    const hz = LB.mix(L.skyHor, L.skyTop, 0.18);
    const HZ = HAZE[S.weather] || HAZE.clear;
    const fade = (c, i) => LB.mix(G(c), hz, clamp(HZ[i], 0, 1));
    const sun = sunAt(S.time), moon = moonAt(S.time);
    const src = sun || moon;
    const e = { key, L, G, hz, HZ, fade, sun, moon, lightLeft: src ? src.x < 300 : true };
    S.snowy = S.season === 'winter' || S.weather === 'snow';
    e.snowy = S.snowy;
    e.sky = buildSky(S, e);
    e.far = buildFar(S, e);
    buildNear(S, e);
    e.front = buildFront(S, e);
    e.clouds = buildClouds(S, e);
    e.fisher = buildFisher(S, e);
    e.water = G('#1c4266');
    e.waterDeep = G('#163852');
    e.hl = S.L.night > 0.5 ? LB.mix(L.skyHor, '#9aaad8', 0.45) : LB.mix(L.skyHor, '#ffffff', 0.4);
    e.dark = G('#102a42');
    e.rainC = LB.mix(G('#c8d4e8'), '#ffffff', 0.15);
    env = e;
    return e;
  }

  // the sky: banded, curved round the sun's glow, with a little dither only at the band edges
  function buildSky(S, e) {
    const L = S.L, cv = LB.canvas(W, H0), c = LB.ctx2d(cv), id = c.createImageData(W, H0), d = id.data;
    const top = LB.rgb(L.skyTop), hor = LB.rgb(L.skyHor);
    const src = e.sun || (L.night > 0.4 ? e.moon : null);
    const glowC = LB.rgb(e.sun ? LB.mix(LB.mix('#fff4d0', '#ffbe7a', L.golden), '#ff8a5a', Math.max(0, L.golden - 0.75) * 3) : '#8a98cc');
    const clear = S.weather === 'clear' ? 1 : S.weather === 'fog' ? 0.5 : 0.25;
    const gs = src ? (e.sun ? 0.16 + 0.62 * L.golden : 0.14) * clear : 0;
    // after sunset / before sunrise the horizon keeps a warm band
    const N = 11;
    for (let y = 0; y < H0; y++) {
      const t = Math.pow(y / H0, 1.55);
      for (let x = 0; x < W; x++) {
        let v = t;
        if (gs) { const dx = (x - src.x) / 105, dy = (y - src.y) / 62; v += gs * Math.exp(-(dx * dx + dy * dy)); }
        const q = Math.floor(v * N + (LB.bayer(x, y) - 0.5) * 0.55) / N;
        let col;
        if (q <= 1) { const k = Math.max(0, q); col = [top[0] + (hor[0] - top[0]) * k, top[1] + (hor[1] - top[1]) * k, top[2] + (hor[2] - top[2]) * k]; }
        else { const k = Math.min(1, (q - 1) / 0.55); col = [hor[0] + (glowC[0] - hor[0]) * k, hor[1] + (glowC[1] - hor[1]) * k, hor[2] + (glowC[2] - hor[2]) * k]; }
        const i = (y * W + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    c.putImageData(id, 0, 0);
    return cv;
  }

  function buildFar(S, e) {
    const { cls, band } = farClasses(S.season, e.lightLeft);
    const L = S.L, g = L.golden;
    const pal = new Array(22 * 4);
    const set = (k, c, hi) => { for (let b = 0; b < 4; b++) pal[k * 4 + b] = LB.rgb(LB.mix(e.G(c), e.hz, clamp(e.HZ[hi] + b * 0.09, 0, 1))); };
    const alpen = LB.mix(SNOW[0], '#ffc2ae', 0.5 * g);
    const rim = L.night > 0.5 ? '#c4d0f4' : LB.mix('#fff4dc', '#ffb070', g);
    set(1, ROCK[0][0], 0); set(2, ROCK[0][1], 0); set(3, alpen, 0); set(4, SNOW[1], 0); set(5, LB.mix(rim, alpen, 0.4), 0);
    set(6, ROCK[1][0], 1); set(7, ROCK[1][1], 1); set(8, alpen, 1); set(9, SNOW[1], 1); set(10, rim, 1);
    set(11, PINE.lit, 2); set(12, PINE.dark, 2);
    const FD = FAR_DECID[S.season];
    for (let k = 0; k < 3; k++) { set(13 + k, FD[k], 2); set(19 + k, LB.shade(FD[k], -0.55), 2); }
    set(16, SNOW[0], 2); set(17, '#8a8a74', 3); set(18, '#5a5a52', 3);
    const cv = LB.canvas(W, H0), c = LB.ctx2d(cv), id = c.createImageData(W, H0), d = id.data;
    for (let i = 0; i < W * H0; i++) {
      const k = cls[i];
      if (!k) continue;
      const col = pal[k * 4 + band[i]];
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    c.putImageData(id, 0, 0);
    drawVillage(LB.paint(c), S, e);
    return cv;
  }

  // the near hill (with the windmill) and the headland, and their mirror image about their own waterlines
  function buildNear(S, e) {
    const cv = LB.canvas(W, H), c = LB.ctx2d(cv), P = LB.paint(c);
    const season = S.season, snowy = e.snowy, ll = e.lightLeft;
    const fh = (col) => e.fade(col, 4), fk = (col) => e.fade(col, 5);
    const gr = (season === 'winter' ? ['#8a96bc', '#a6b2d2', '#c4d0e6', '#e0e8f4', '#f6f9ff'] : LB.ramp(GRASS[season], 5)).map(fh);
    const earth = [fh('#3e3036'), fh('#5c4a3e'), fh('#76604a')];
    // hill body
    // light falls off down the slope and on the faces turned away from the sun; tones change along curves that
    // follow the hill, with a few pixels of ordered dither where one tone meets the next
    for (let x = 0; x < 246; x++) {
      const top = R(hillTop(x)), bot = R(hillShore(x));
      if (top >= bot) continue;
      const slope = (hillTop(x + 3) - hillTop(x - 3)) / 6; // > 0: the ground falls away to the right
      const away = ll ? Math.max(0, slope) : Math.max(0, -slope), toward = ll ? Math.max(0, -slope) : Math.max(0, slope);
      let run = top, cur = -1;
      for (let y = top; y <= bot - 3; y++) {
        let tone = -2;
        if (y < bot - 3) {
          const v = 3.7 - Math.sqrt(y - top) * 0.5 - away * 1.1 + toward * 0.5;
          tone = clamp(Math.floor(v + (LB.bayer(x, y) - 0.5) * 0.4), 0, 4);
        }
        if (tone !== cur) { if (cur >= 0) P.rect(x, run, 1, y - run, gr[cur]); run = y; cur = tone; }
      }
      P.rect(x, bot - 3, 1, 2, snowy ? fh('#c4d0e4') : gr[0]);
      P.rect(x, bot - 1, 1, 1, earth[0]);
      if (LB.hash(x >> 1, 3, 34) > 0.8) { P.rect(x, bot - 3, 2, 2, fh('#8a8680')); P.px(x, bot - 3, fh('#aaa69e')); }
    }
    // a path from the windmill down to the water
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, px = R(lerp(131, 214, u) + Math.sin(u * 5) * 6), py = R(lerp(hillTop(131) + 2, hillShore(214) - 3, Math.pow(u, 0.85)));
      if (py >= hillShore(px) - 3) continue;
      P.rect(px - 1, py, 3, 1, snowy ? fh('#dfe8f4') : fh('#c8a874'));
      P.px(px + 1, py, snowy ? fh('#c4d0e4') : fh('#9a7a54'));
    }
    // tufts and flowers in clusters (not speckle)
    for (let i = 0; i < 120; i++) {
      const x = R(LB.hash(i, 1, 404) * 238), top = hillTop(x), bot = hillShore(x);
      if (bot - top < 8) continue;
      const y = R(top + 4 + LB.hash(i, 2, 404) * (bot - top - 9));
      const lightTuft = LB.hash(i, 3, 404) > 0.5;
      const c1 = snowy ? (lightTuft ? fh('#ffffff') : fh('#8a967c')) : lightTuft ? gr[4] : gr[1];
      P.px(x, y, c1); P.px(x - 1, y + 1, c1); P.px(x + 1, y + 1, c1);
      if (!snowy && (season === 'spring' || season === 'summer') && LB.hash(i, 4, 404) > 0.72) {
        const fc = fh(LB.hash(i, 5, 404) > 0.5 ? '#f4e870' : season === 'spring' ? '#f4a6c4' : '#ffffff');
        P.px(x + 2, y - 1, fc); P.px(x + 3, y, fc);
      }
      if (season === 'autumn' && LB.hash(i, 4, 404) > 0.7) { P.px(x + 2, y, fh('#d07a30')); P.px(x + 3, y + 1, fh('#b8502c')); }
    }
    // the windmill on its clearing
    const mx = 128, my = R(hillTop(128)) + 1;
    e.mill = { x: mx + 3, y: my - 19 };
    const wall = fh('#ece2d0'), wallS = fh('#b6aa96'), cap = fh('#8c3c2c');
    P.poly([[mx - 1, my], [mx + 8, my], [mx + 7, my - 16], [mx, my - 16]], wall);
    P.poly([[mx + 5, my], [mx + 8, my], [mx + 7, my - 16], [mx + 5, my - 16]], wallS);
    P.rect(mx + 2, my - 4, 2, 4, fh('#4a3a34'));
    P.rect(mx + 3, my - 11, 1, 2, fh('#4a3a34'));
    P.poly([[mx - 1, my - 15], [mx + 8, my - 15], [mx + 6, my - 20], [mx + 1, my - 20]], cap);
    P.rect(mx + 5, my - 20, 2, 5, fh('#6a2c24'));
    if (snowy) P.rect(mx + 1, my - 21, 5, 1, fh('#f6f9ff'));
    if (S.L.night > 0.35) { P.rect(mx + 3, my - 11, 1, 2, '#ffd27a'); e.millWin = [mx + 3, my - 11]; } else e.millWin = null;
    // the headland: a rock cliff with a grassy cap
    const rock = [fk('#5a5466'), fk('#7a7276'), fk('#9a9284')];
    for (let x = HEAD0; x < W; x++) {
      const top = R(headTop(x));
      for (let y = top; y < HEAD_SHORE; y++) {
        const dd = y - top;
        let tone = 1;
        const n = LB.noise(x * 0.11 + y * 0.04, y * 0.13, 61);
        if (n > 0.58) tone = ll ? 0 : 2;
        else if (n < 0.34) tone = ll ? 2 : 0;
        if ((y + R(LB.noise(x * 0.05, 1, 62) * 5)) % 6 === 0 && LB.noise(x * 0.2, y, 63) > 0.35) tone = 0; // strata
        let col = rock[tone];
        if (dd < 3) col = snowy ? fk(dd === 0 ? '#ffffff' : '#dce6f4') : fk(dd === 0 ? GRASS[season] : LB.shade(GRASS[season], -0.4));
        P.px(x, y, col);
      }
      P.px(x, HEAD_SHORE - 1, rock[0]);
    }
    // boulders at its foot
    for (const [bx, by, br] of [[340, 158, 4], [352, 160, 3], [331, 157, 2]]) {
      P.ellipse(bx, by, br + 1, br, rock[0]); P.ellipse(bx - 1, by - 1, br, br - 1, rock[1]); P.ellipse(bx - 2, by - 2, br - 2, Math.max(1, br - 2), rock[2]);
      if (snowy) P.rect(bx - br + 1, by - br, br * 2 - 2, 1, fk('#f6f9ff'));
    }
    // trees
    const pc = { lit: fh(PINE.lit), mid: fh(PINE.mid), dark: fh(PINE.dark), rim: fh(LB.mix(PINE.rim, '#ffb878', S.L.golden * 0.7)), trunk: fh(PINE.trunk), snow: fh('#f6f9ff') };
    for (const t of hillTrees()) {
      if (t.k === 'pine') drawPine(P, t.x, t.y, t.h, pc, ll, snowy);
      else {
        let tones = DECID[season][t.kind];
        if (season === 'spring' && t.kind === 1 && t.seed % 2) tones = DECID.spring[0];
        drawBroadleaf(P, t.x, t.y, t.h, tones.map(fh), fh('#5a4232'), ll, season, t.seed, snowy ? fh('#f6f9ff') : null);
      }
    }
    // lily pads near the hill's shore
    if (season === 'spring' || season === 'summer') {
      for (let i = 0; i < 9; i++) {
        const x = 150 + R(LB.hash(i, 1, 71) * 80), y = R(hillShore(x)) + 3 + R(LB.hash(i, 2, 71) * 6);
        P.rect(x, y, 4, 1, fh('#4a8a44')); P.px(x + 1, y, fh('#7ab45a'));
        if (season === 'summer' && i % 3 === 0) P.px(x + 2, y - 1, fh('#f8e8f0'));
      }
    }
    if (S.season === 'winter') { // a rim of ice along the hill's shore
      for (let x = 0; x < 238; x++) { const y = R(hillShore(x)); P.rect(x, y, 1, 2 + (LB.hash(x, 0, 72) > 0.6 ? 1 : 0), fh('#d4e4f0')); }
    }
    e.near = cv;
    // the mirror image, tinted by the water
    const mir = LB.mirror(cv, nearShore, 0, W), mc = LB.ctx2d(mir);
    mc.globalCompositeOperation = 'source-atop';
    mc.globalAlpha = 0.42; mc.fillStyle = LB.mix(e.G('#1c4266'), e.hz, 0.38); mc.fillRect(0, 0, W, H);
    e.nearMirror = mir;
  }

  // the dock and what's on it, and the near bank — two layers, so the moored boat can sit between them
  function buildFront(S, e) {
    const G = e.G, season = S.season, snowy = e.snowy;
    const gr = (season === 'winter' ? ['#8a96bc', '#a6b2d2', '#c4d0e6', '#e0e8f4', '#f6f9ff'] : LB.ramp(GRASS[season], 5)).map(G);
    // --- the dock ---
    const dock = LB.canvas(W, H), dc = LB.ctx2d(dock), P = LB.paint(dc);
    // ice along the bank in winter (out on the water, so it goes under the bank)
    if (season === 'winter') {
      for (let x = 0; x < 436; x++) {
        const b = bankTop(x), d = 5 + R(LB.noise(x * 0.06, 2, 81) * 4);
        P.rect(x, b - d, 1, d, G('#d8e6f2'));
        P.px(x, b - d, G('#f4f8ff'));
        if (LB.hash(x, 1, 82) > 0.93) P.rect(x, b - d + 1, 1, d - 2, G('#a6bed6'));
      }
      for (const [fx, fy, fw] of [[120, 222, 12], [182, 214, 8], [60, 232, 16], [262, 236, 9]]) {
        P.ellipse(fx, fy, fw, 1, G('#cfe0ee')); P.rect(fx - fw + 2, fy - 1, fw * 2 - 4, 1, G('#f4f8ff'));
      }
    }
    // the water under the dock lies in its shade
    dc.save(); dc.globalAlpha = 0.4; P.rect(DOCK_X, DECK + 8, W - DOCK_X, 32, G('#0c1c2c')); dc.restore();
    const wood = [G('#3e2a1e'), G('#6a4a30'), G('#9a7044'), G('#c0915a'), G('#dcae70')];
    for (const px of POSTS) {
      P.rect(px, DECK + 7, 4, 238 - DECK - 7, wood[1]);
      P.rect(px, DECK + 7, 1, 238 - DECK - 7, wood[2]);
      P.rect(px + 3, DECK + 7, 1, 238 - DECK - 7, wood[0]);
      P.rect(px, 230, 4, 8, G('#2e3e30')); P.rect(px, 230, 1, 8, G('#3e5040'));
      if (snowy) P.rect(px, 237, 4, 1, G('#dce8f4'));
    }
    // deck: plank tops seen at a low angle, then the front beam
    P.rect(DOCK_X, DECK, W - DOCK_X, 3, wood[3]);
    P.rect(DOCK_X, DECK, W - DOCK_X, 1, wood[4]);
    for (let x = DOCK_X + 4; x < W; x += 6) P.rect(x, DECK, 1, 3, wood[1]);
    P.rect(DOCK_X, DECK + 3, W - DOCK_X, 4, wood[1]);
    P.rect(DOCK_X, DECK + 3, W - DOCK_X, 1, wood[2]);
    P.rect(DOCK_X, DECK + 7, W - DOCK_X, 1, wood[0]);
    for (let x = DOCK_X + 10; x < W; x += 32) P.px(x, DECK + 5, G('#2a2a30'));
    P.rect(DOCK_X, DECK, 1, 8, wood[0]);
    if (snowy) {
      for (let x = DOCK_X; x < W; x++) {
        if (x > 286 && x < 302) continue;
        const d = 1 + (LB.noise(x * 0.15, 3, 95) > 0.5 ? 1 : 0);
        P.rect(x, DECK - d, 1, d, G('#f6f9ff'));
      }
      for (let x = DOCK_X + 3; x < W; x += 5 + (x % 3)) P.rect(x, DECK + 8, 1, 1 + (x % 3), G('#d6e4f2'));
    }
    // the lantern post at the end
    P.rect(299, DECK - 20, 2, 20, G('#3a2e28')); P.px(299, DECK - 20, G('#5a4a3e'));
    P.rect(295, DECK - 22, 9, 1, G('#2a2a30'));
    P.rect(296, DECK - 28, 5, 6, G('#26262e'));
    P.rect(297, DECK - 27, 3, 4, S.L.night > 0.3 ? '#ffe6a0' : G('#c8c4a8'));
    P.rect(295, DECK - 29, 7, 1, G('#26262e')); P.px(298, DECK - 30, G('#26262e'));
    // a bucket, a creel and a coil of rope on the deck
    P.rect(338, DECK - 5, 5, 5, G('#8a8a8c')); P.rect(338, DECK - 5, 5, 1, G('#b4b4b4')); P.rect(338, DECK - 3, 5, 1, G('#5a5a60')); P.px(342, DECK - 5, G('#5a5a60'));
    P.rect(310, DECK - 4, 7, 4, G('#a8844a')); P.rect(310, DECK - 4, 7, 1, G('#c8a462')); P.rect(311, DECK - 2, 5, 1, G('#7a5a32'));
    P.ellipse(372, DECK - 1, 4, 1, G('#c8b88a')); P.px(372, DECK - 1, G('#8a7a5a'));
    if (snowy) { P.rect(338, DECK - 6, 5, 1, G('#f6f9ff')); P.rect(310, DECK - 5, 7, 1, G('#f6f9ff')); }

    // --- the near bank ---
    const bank = LB.canvas(W, H), bc = LB.ctx2d(bank), Q = LB.paint(bc);
    const soil = [G('#3a2822'), G('#4e362a'), G('#664632'), G('#7e5a3c')];
    for (let x = 0; x < W; x++) {
      const b = bankTop(x);
      // the cut face of the bank: soil in rough strata, darker as it goes down
      const j = R((LB.noise(x * 0.08, 1, 96) - 0.5) * 3);
      Q.rect(x, b, 1, H - b, soil[0]);
      Q.rect(x, b, 1, Math.max(0, 13 - j), soil[1]);
      Q.rect(x, b, 1, Math.max(0, 9 - j), soil[2]);
      Q.rect(x, b, 1, Math.max(0, 5 - j), soil[3]);
      if (snowy) { Q.rect(x, b, 1, 4, G(x % 7 === 0 ? '#dce6f4' : '#f4f8ff')); Q.px(x, b + 4, G('#b8c6de')); if (LB.hash(x, 2, 97) > 0.7) Q.px(x, b + 5, G('#dce6f4')); }
      else {
        Q.rect(x, b, 1, 3, gr[2]); Q.px(x, b, gr[3]); Q.px(x, b + 3, gr[1]);
        if (LB.hash(x, 3, 97) > 0.55) Q.rect(x, b + 3, 1, 1 + R(LB.hash(x, 4, 97) * 2), gr[1]); // grass hanging over the edge
      }
    }
    // roots and stones in the bank
    for (let i = 0; i < 14; i++) {
      const x0 = R(LB.hash(i, 1, 98) * W), y0 = bankTop(x0) + 5 + R(LB.hash(i, 2, 98) * 6);
      let x = x0, y = y0;
      for (let k = 0; k < 6; k++) { Q.px(x, y, soil[0]); x += LB.hash(i, k, 99) > 0.5 ? 1 : -1; y += LB.hash(i, k, 100) > 0.4 ? 1 : 0; }
    }
    for (let i = 0; i < 40; i++) {
      const x = R(LB.hash(i, 1, 91) * W), y = bankTop(x) + 6 + R(LB.hash(i, 2, 91) * 12);
      const sz = LB.hash(i, 3, 91) > 0.6 ? 2 : 1;
      Q.rect(x, y, sz + 1, sz, G('#7e786e')); Q.px(x, y, G('#a49e92'));
    }
    if (!snowy) {
      for (let x = 0; x < W; x += 1) if (LB.hash(x, 7, 92) > 0.6) Q.rect(x, bankTop(x) - 1 - (LB.hash(x, 8, 92) > 0.7 ? 1 : 0), 1, 1 + (LB.hash(x, 8, 92) > 0.7 ? 1 : 0), gr[LB.hash(x, 9, 92) > 0.5 ? 3 : 2]);
      if (season === 'autumn') for (let i = 0; i < 30; i++) { const x = R(LB.hash(i, 1, 93) * W); Q.px(x, bankTop(x) + 1 + R(LB.hash(i, 2, 93) * 2), G(LB.hash(i, 3, 93) > 0.5 ? '#d8782c' : '#c04a2c')); }
      if (season === 'spring' || season === 'summer') for (let i = 0; i < 24; i++) { const x = R(LB.hash(i, 1, 94) * 420); Q.px(x, bankTop(x) - 2, G(season === 'spring' ? (i % 2 ? '#f4a6c4' : '#fff4a0') : i % 2 ? '#ffffff' : '#f4d86a')); }
    }
    return { dock, bank };
  }

  // ---------- clouds ----------
  function cloudShapes(lightLeft) {
    return LB.memo('vista-clouds:' + lightLeft, () => {
      const r = LB.rng(909), out = [];
      const cumulus = (w, h, layer, y, speed, flat) => {
        // billows: a row of overlapping round lumps, biggest in the middle, smaller lumps between their tops, a flat base
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
        // tones in bands that follow the lumpy top edge: a lit rim, the body, a deeper tone lower down, the shaded base
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (!inside(x, y)) continue;
          const d = y - topAt[x], depth = (y - topAt[x]) / Math.max(1, h - topAt[x]);
          let k = 2;
          if (y >= h - 2) k = 4; else if (depth > 0.62) k = 3;
          if (d <= 1 || (!inside(x + sx, y) && depth < 0.5) || (topAt[x + sx] !== undefined && topAt[x + sx] > y && d <= 3)) k = 1;
          else if (topAt[x - sx] !== undefined && topAt[x - sx] > y + 1 && depth < 0.6) k = 3; // the shaded flank of each lump
          cls[y * w + x] = k;
        }
        out.push({ w, h, cls, layer, y, speed, x0: r() * (W + 200) });
      };
      const cirrus = (w, y, speed) => {
        const h = 3, cls = new Uint8Array(w * h);
        for (let row = 0; row < h; row++) {
          let x = Math.floor(r() * w * 0.25);
          while (x < w) {
            const len = 6 + Math.floor(r() * w * 0.4);
            for (let i = x; i < Math.min(w, x + len); i++) cls[row * w + i] = row === 0 ? 1 : 2;
            x += len + 2 + Math.floor(r() * 10);
          }
        }
        out.push({ w, h, cls, layer: 'high', y, speed, x0: r() * (W + 200) });
      };
      for (let i = 0; i < 5; i++) cirrus(40 + Math.floor(r() * 60), 14 + Math.floor(r() * 40), 0.9 + r() * 0.6);
      for (let i = 0; i < 5; i++) cumulus(44 + Math.floor(r() * 40), 22 + Math.floor(r() * 12), 'mid', 18 + Math.floor(r() * 44), 2.4 + r() * 1.4);
      for (let i = 0; i < 7; i++) cumulus(22 + Math.floor(r() * 26), 9 + Math.floor(r() * 6), 'low', 90 + Math.floor(r() * 36), 1.2 + r() * 0.8);
      for (let i = 0; i < 12; i++) cumulus(100 + Math.floor(r() * 70), 24 + Math.floor(r() * 12), 'storm', -10 + Math.floor(r() * 64), 4 + r() * 2, true);
      return out;
    });
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
    e.cloudCols = cols.map(LB.hex);
    return cloudShapes(e.lightLeft).map((s) => {
      const cv = LB.canvas(s.w, s.h), c = LB.ctx2d(cv), id = c.createImageData(s.w, s.h), d = id.data;
      for (let i = 0; i < s.cls.length; i++) {
        const k = s.cls[i];
        if (!k) continue;
        const col = cols[k - 1];
        d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
      }
      c.putImageData(id, 0, 0);
      return { s, cv };
    });
  }
  function drawClouds(ctx, S, e, layers) {
    const stormy = S.weather === 'rain' || S.weather === 'snow';
    for (const { s, cv } of e.clouds) {
      if (!layers.includes(s.layer)) continue;
      if (s.layer === 'storm' && !stormy) continue;
      if (s.layer === 'mid' && S.weather === 'fog') continue;
      const span = W + s.w + 40;
      const x = ((((s.x0 + S.t * s.speed) % span) + span) % span) - s.w - 20;
      ctx.save();
      if (s.layer === 'high') ctx.globalAlpha = stormy ? 0 : 0.85;
      if (s.layer === 'low' && S.weather === 'fog') ctx.globalAlpha = 0.6;
      ctx.drawImage(cv, R(x), s.y);
      ctx.restore();
    }
  }

  // ---------- the fisher (side view, facing the lake) ----------
  const FISHER = [
    '......HHHH......',
    '.....HHHHHH.....',
    '.....hhhhhh.....',
    '...HHHHHHHHHH...',
    '....KKKKRRR.....',
    '...KEKKKRRR.....',
    '...KKKKKRR......',
    '....kKKkR.......',
    '.....SSSSs......',
    '...SSSSSSSs.....',
    '.KKSSSSSSSs.....',
    '....OOOOOOs.....',
    '....OOOOOOo.....',
    '....OOOOOOo.....',
    '.OOOOOOOOOo.....',
    '.OOOOOOOOoo.....',
    '.OO.............',
    '.OO.............',
    '.Oo.............',
    '.Oo.............',
    'BBb.............',
    'BBb.............',
  ];
  const WINTER_CAP = ['................', '......hhhh......', '.....hhhhhh.....', '.....HHHHHH.....'];
  function buildFisher(S, e) {
    const G = e.G;
    let pal = { H: '#e8c070', h: '#a8642c', K: '#f0b890', k: '#c88868', E: '#2a2030', R: '#5a3424', S: '#e2d8c4', s: '#aaa08e', O: '#4a6aa8', o: '#2e4478', B: '#4a3024', b: '#2a1a14' };
    let grid = FISHER;
    if (S.weather === 'rain') pal = Object.assign(pal, { H: '#e8c030', h: '#b8901c', S: '#e8c030', s: '#b08a20' });
    else if (S.season === 'winter') { pal = Object.assign(pal, { H: '#c84a40', h: '#e8e0d8', S: '#8a5a3a', s: '#5e3c28' }); grid = WINTER_CAP.concat(FISHER.slice(4)); }
    const frames = [0, 1].map((bob) => {
      const cv = LB.canvas(18, 24), P = LB.paint(LB.ctx2d(cv));
      grid.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.') continue;
          const yy = y < 14 ? y + bob : y; // the body breathes; the legs stay put
          P.px(x + 1, yy + 1, G(pal[ch]));
        }
      });
      return LB.outline(cv, 'sel', 0.8);
    });
    return frames;
  }

  // ---------- per-frame pieces ----------
  function drawStars(ctx, P, S, e) {
    const a = LB.smooth(0.25, 0.85, S.L.night) * (S.weather === 'clear' ? 1 : 0);
    if (a < 0.03) return;
    const stars = LB.memo('vista-stars', () => {
      const r = LB.rng(4242), out = [];
      for (let i = 0; i < 170; i++) {
        let x = r() * W, y = r() * 130;
        // a band of denser stars across the sky (the galaxy)
        if (i < 70) { const u = r(); x = u * W; y = 18 + u * 70 + (r() - 0.5) * 22; }
        out.push([R(x), R(y), r(), r()]);
      }
      return out;
    });
    ctx.save();
    for (const [x, y, b, ph] of stars) {
      const tw = 0.55 + 0.45 * Math.sin(S.t * (0.8 + ph * 2.2) + ph * 30);
      ctx.globalAlpha = a * (b > 0.85 ? 1 : 0.35 + b * 0.5) * tw;
      const c = ph > 0.8 ? '#ffe6c0' : ph < 0.2 ? '#c4d4ff' : '#f4f6ff';
      P.px(x, y, c);
      if (b > 0.93) { ctx.globalAlpha *= 0.5; P.px(x - 1, y, c); P.px(x + 1, y, c); P.px(x, y - 1, c); P.px(x, y + 1, c); }
    }
    ctx.restore();
  }
  function drawSun(ctx, P, S, e) {
    const s = sunAt(S.time);
    if (!s) return null;
    const L = S.L, g = L.golden, clear = S.weather === 'clear' ? 1 : S.weather === 'fog' ? 0.5 : 0.2;
    const x = R(s.x), y = R(s.y);
    const core = LB.mix('#fffbea', '#ffd27a', g), rimC = LB.mix('#fff2c0', '#ff8c50', g);
    const rad = 7 + R(g * 3);
    ctx.save();
    ctx.globalAlpha = 0.16 * clear; P.disc(x, y, rad + 10, LB.mix(L.skyHor, '#fff2c8', 0.6));
    ctx.globalAlpha = 0.26 * clear; P.disc(x, y, rad + 5, LB.mix(L.skyHor, '#fff4d0', 0.7));
    ctx.globalAlpha = clear < 1 ? 0.5 + clear * 0.5 : 1;
    if (S.weather === 'fog') { P.disc(x, y, rad, LB.mix(core, L.skyHor, 0.35)); ctx.restore(); return s; }
    P.disc(x, y, rad, rimC); P.disc(x - 1, y - 1, rad - 2, core);
    // the low sun cut by thin bands of sky
    if (g > 0.55) for (let k = 0; k < 3; k++) P.rect(x - rad, y + 2 + k * 3, rad * 2 + 1, 1, LB.mix(L.skyHor, rimC, 0.35));
    ctx.restore();
    return s;
  }
  function drawMoon(ctx, P, S, e) {
    const m = moonAt(S.time);
    if (!m || S.L.night < 0.3) return null;
    const a = LB.smooth(0.3, 0.8, S.L.night) * (S.weather === 'clear' ? 1 : 0.35);
    const x = R(m.x), y = R(m.y);
    ctx.save();
    ctx.globalAlpha = 0.1 * a; P.disc(x, y, 14, '#a8b8f0');
    ctx.globalAlpha = 0.16 * a; P.disc(x, y, 9, '#b8c8f8');
    ctx.globalAlpha = a;
    P.disc(x, y, 6, '#e8ecf8'); P.disc(x + 2, y + 1, 4, '#c6cee6');
    P.px(x - 2, y - 1, '#cdd4ea'); P.px(x - 1, y + 2, '#cdd4ea'); P.rect(x - 3, y + 1, 2, 1, '#d6dcee');
    ctx.restore();
    return m;
  }
  function drawSmoke(ctx, P, S, e) {
    if (!e.chimneys) return;
    const want = S.season === 'winter' || S.season === 'autumn' || S.L.night > 0.3 || S.time < 9;
    if (!want) return;
    const c = LB.mix(e.G('#d4d4d8'), e.hz, 0.45);
    ctx.save();
    e.chimneys.forEach(([cx, cy], j) => {
      for (let i = 0; i < 7; i++) {
        const age = (S.t * 0.22 + i / 7 + j * 0.13) % 1;
        const x = cx + age * 7 + Math.sin(age * 5 + i + j) * 0.8, y = cy - 1 - age * 13;
        ctx.globalAlpha = (1 - age) * 0.7;
        P.px(x, y, c); if (age > 0.45) P.px(x + 1, y, c);
      }
    });
    ctx.restore();
  }
  function drawSails(ctx, P, S, e) {
    const m = e.mill, a0 = S.t * 0.7;
    const c = e.fade('#d8ccb4', 4), cd = e.fade('#6a5040', 4);
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
      P.line(m.x, m.y, m.x + ca * 11, m.y + sa * 11, cd);
      // the sail: a lattice strip beside the arm
      for (let r = 4; r <= 11; r++) P.px(m.x + ca * r - sa * 2, m.y + sa * r + ca * 2, r % 2 ? c : cd);
      for (let r = 4; r <= 11; r++) P.px(m.x + ca * r - sa * 1, m.y + sa * r + ca * 1, c);
    }
    P.px(m.x, m.y, cd);
    // and upside down in the water below the hill
    const sh = R(hillShore(m.x)), ry = 2 * sh - m.y;
    ctx.save(); ctx.globalAlpha = 0.4;
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k * Math.PI) / 2, ca = Math.cos(a), sa = -Math.sin(a);
      for (let r = 2; r <= 11; r++) { const yy = R(ry + sa * r); P.px(R(m.x + ca * r + Math.sin(yy * 0.6 + S.t * 1.4)), yy, cd); }
    }
    ctx.restore();
  }
  function drawWater(ctx, P, S, e) {
    const L = S.L;
    P.rect(0, H0, W, H - H0, e.waterDeep);
    // the far half of the world, upside down, tinted more toward the viewer
    const mir = LB.memo('vista-mir', () => LB.canvas(W, H)), mc = LB.ctx2d(mir);
    mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalAlpha = 1; mc.clearRect(0, 0, W, H);
    mc.save(); mc.translate(0, 2 * H0); mc.scale(1, -1); mc.drawImage(ctx.canvas, 0, H0 - WR, W, WR, 0, H0 - WR, W, WR); mc.restore();
    mc.fillStyle = e.water;
    for (let d = 0; d < WR; d++) { mc.globalAlpha = 0.14 + 0.42 * Math.pow(d / WR, 1.2); mc.fillRect(0, H0 + d, W, 1); }
    mc.globalAlpha = 1;
    const rough = S.weather === 'rain' ? 2.6 : S.weather === 'snow' ? 1.8 : 1.6;
    LB.ripple(ctx, mir, null, S, { amp: rough, freq: 0.62, speed: 1.5, alpha: 1, y0: H0, y1: H0 + WR, grow: true, slot: 'vista-far' });
    LB.ripple(ctx, e.nearMirror, null, S, { amp: rough * 0.9, freq: 0.55, speed: 1.3, alpha: 1, y0: H0, y1: H, grow: true, slot: 'vista-near' });
    // moving ripple lines: light where they catch the sky, dark in their troughs
    const night = L.night;
    for (let d = 2; d < WR; d++) {
      const y = H0 + d;
      const v = Math.sin(d * 0.75 - S.t * 1.3 + Math.sin(d * 0.21 + S.t * 0.27) * 2.2);
      if (v < 0.9 && v > -0.94) continue;
      const light = v > 0;
      const seg = 3 + R(d * 0.12), gap = 3 + R(d * 0.1);
      const shift = R(S.t * (light ? 3 : -2) * (0.4 + d * 0.02));
      ctx.save();
      ctx.globalAlpha = light ? (0.35 + 0.3 * (1 - night)) * (0.5 + 0.5 * d / WR) : 0.32;
      for (let x = -seg - gap; x < W; x += seg + gap) {
        const k = Math.floor((x + shift) / (seg + gap));
        if (LB.hash(k, d, 51) < 0.42) continue;
        P.rect(x + (((shift % (seg + gap)) + seg + gap) % (seg + gap)), y, seg, 1, light ? e.hl : e.dark);
      }
      ctx.restore();
    }
    // the dock's posts reflected under it
    ctx.save(); ctx.globalAlpha = 0.45;
    for (const px of POSTS) for (let y = 238; y < 252; y++) { const off = R(Math.sin(y * 0.7 + S.t * 1.6) * 1.2); P.rect(px + off, y, 4, 1, e.dark); }
    ctx.restore();
    // the far shore's line of light
    ctx.save(); ctx.globalAlpha = 0.5;
    for (let x = 0; x < W; x += 1) if (LB.hash(x >> 2, Math.floor(S.t * 0.8 + (x >> 4)), 52) > 0.35) P.px(x, H0, LB.mix(e.hz, '#ffffff', 0.3));
    ctx.restore();
  }
  function glitterPath(ctx, P, S, e, bright) {
    const L = S.L;
    let src = null, gc;
    const s = sunAt(S.time), m = moonAt(S.time);
    const clear = S.weather === 'clear' ? 1 : S.weather === 'fog' ? 0.45 : 0;
    if (s && s.elev > 0.01) { src = s; gc = LB.mix(LB.mix('#fff8dc', '#ffd27a', L.golden), '#ff9a5a', Math.max(0, L.golden - 0.7) * 2.5); }
    else if (m && L.night > 0.5) { src = m; gc = '#d4defc'; }
    if (!src || !clear) return;
    const vis = clamp((landTop(src.x) - src.y) / 10, 0, 1);
    if (vis <= 0) return;
    ctx.save();
    ctx.globalAlpha = clear * vis * (bright ? 1 : 0.9);
    const tick = Math.floor(S.t * 5);
    for (let d = 1; d < 99; d++) {
      const y = H0 + d, spread = 2 + d * 0.34 * (src === s ? 1 : 0.7);
      const count = 1 + (d > 25) + (d > 55);
      for (let k = 0; k < count; k++) {
        const ph = tick + Math.floor(d * 0.37 + k * 0.5);
        const hs = LB.hash(d, k * 31 + ph, 61);
        if (hs < 0.32) continue;
        const x = src.x + (LB.hash(d, k * 7 + ph, 62) * 2 - 1) * spread * (k === 0 ? 0.45 : 1);
        const len = 1 + R(hs * (1.5 + d * 0.05));
        P.rect(R(x - len / 2), y, len, 1, gc);
      }
    }
    ctx.restore();
  }
  function rings(ctx, P, x, y, k, maxR, c, alpha) {
    const r = 1 + k * maxR, ry = Math.max(1, R(r * 0.32));
    ctx.save(); ctx.globalAlpha = (1 - k) * alpha;
    const n = 10 + R(r * 4);
    for (let i = 0; i < n; i++) { const th = (i / n) * Math.PI * 2; P.px(x + R(Math.cos(th) * r), y + R(Math.sin(th) * ry), c); }
    ctx.restore();
  }
  const DUCK = ['..hh...', '.hhbb..', '..hn...', '.BBBBBb', 'BBWBBBB', '.BBBBb.'];
  function drawDucks(ctx, P, S, e) {
    if (S.L.night > 0.45 || S.season === 'winter' || S.weather === 'rain' || S.weather === 'snow') return;
    const pal = (drake) => ({ h: e.G(drake ? '#2e6a3a' : '#8a6a4a'), b: e.G('#e8a030'), n: e.G(drake ? '#ffffff' : '#8a6a4a'), B: e.G(drake ? '#9a8a7a' : '#8a6a4a'), b2: e.G('#5a4a3a'), W: e.G('#e8e0d0') });
    [[0, true], [1, false]].forEach(([i, drake]) => {
      const u = S.t * 0.035 + i * 0.4;
      const x = R(206 + Math.sin(u) * 46 - i * 13), y = 190 - i * 5;
      const dir = Math.cos(u) > 0 ? 1 : -1; // swimming right when x increases
      const pl = pal(drake);
      // wake
      ctx.save(); ctx.globalAlpha = 0.45;
      for (let k = 1; k < 7; k++) { P.px(x - dir * (3 + k * 2), y + 1 + R(k * 0.5), e.hl); P.px(x - dir * (3 + k * 2), y + 1 - R(k * 0.3), e.hl); }
      ctx.restore();
      // reflection
      ctx.save(); ctx.globalAlpha = 0.3; P.rect(x - 3, y + 2, 7, 2, e.dark); ctx.restore();
      DUCK.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          const ch = row[rx];
          if (ch === '.') continue;
          const c = ch === 'h' ? pl.h : ch === 'b' && ry === 1 && rx >= 3 ? pl.b : ch === 'n' ? pl.n : ch === 'W' ? pl.W : ch === 'b' ? pl.b2 : pl.B;
          const xx = dir > 0 ? x + 3 - rx : x - 3 + rx;
          P.px(xx, y - 5 + ry, c);
        }
      });
    });
  }
  function drawBirds(ctx, P, S, e) {
    if (S.L.night > 0.55 || S.weather === 'rain' || S.weather === 'snow') return;
    const cyc = Math.floor(S.t / 38), u = (S.t % 38) / 38;
    const dir = cyc % 2 ? -1 : 1;
    const bx = dir > 0 ? -30 + u * (W + 60) : W + 30 - u * (W + 60);
    const by = 40 + LB.hash(cyc, 1, 71) * 36 + Math.sin(S.t * 0.6) * 3;
    const c = LB.mix(e.G('#2a2836'), e.hz, 0.15);
    const form = [[0, 0], [-7, -3], [-14, -6], [-7, 4], [-13, 7]];
    form.forEach(([ox, oy], i) => {
      const x = R(bx + ox * dir), y = R(by + oy);
      const up = Math.floor(S.t * 6 + i * 1.7) % 2;
      if (up) { P.px(x, y, c); P.px(x - 1, y - 1, c); P.px(x + 1, y - 1, c); P.px(x - 2, y - 2, c); P.px(x + 2, y - 2, c); }
      else { P.px(x, y, c); P.px(x - 1, y, c); P.px(x + 1, y, c); P.px(x - 2, y + 1, c); P.px(x + 2, y + 1, c); }
    });
  }
  function drawReeds(ctx, P, S, e) {
    const reeds = LB.memo('vista-reeds', () => {
      const r = LB.rng(313), out = [];
      for (const [a, b, n] of [[4, 78, 30], [118, 192, 26], [228, 272, 14]]) for (let i = 0; i < n; i++) {
        const x = R(a + r() * (b - a));
        out.push({ x, h: 9 + r() * 16, cat: r() < 0.25, v: r() });
      }
      return out.sort((p, q) => p.h - q.h);
    });
    const season = S.season;
    const stem = e.G({ spring: '#7ab84a', summer: '#5a9a3c', autumn: '#b89a4a', winter: '#b8a888' }[season]);
    const stemL = e.G({ spring: '#a8d870', summer: '#84c05a', autumn: '#d8be6a', winter: '#d8ccb0' }[season]);
    const cat = e.G('#6a4228'), snow = e.G('#f6f9ff');
    const wind = S.weather === 'rain' ? 2 : 1;
    for (const rd of reeds) {
      const b = bankTop(rd.x), h = season === 'winter' ? rd.h * 0.7 : rd.h, top = b - R(h);
      const sway = R(Math.sin(S.t * 1.2 + rd.x * 0.37) * 1.1 * wind);
      const mid = b - R(h * 0.5);
      P.vline(rd.x, mid, b, stem);
      P.vline(rd.x + sway, top, mid, rd.v > 0.5 ? stemL : stem);
      if (rd.cat && season !== 'spring') { P.rect(rd.x + sway, top - 1, 2, 4, season === 'winter' ? snow : cat); }
      else if (season === 'winter' && rd.v > 0.6) P.px(rd.x + sway, top - 1, snow);
      if (rd.v > 0.7 && season !== 'winter') P.px(rd.x + sway + 1, top + 3, stemL); // a leaf
    }
  }
  function drawBoat(ctx, P, S, e) {
    const bob = R(Math.sin(S.t * 1.1) * 0.6);
    const x = 338, y = 241 + bob; // waterline, stern on the left
    const hull = [e.G('#2a2228'), e.G('#4e3628'), e.G('#6e4c32'), e.G('#946a42'), e.G('#b88a56')];
    // its reflection
    ctx.save(); ctx.globalAlpha = 0.32;
    P.poly([[x + 2, y], [x + 30, y], [x + 27, y + 4], [x + 5, y + 4]], e.dark);
    ctx.restore();
    // the hull: a curved side, the bow rising at the right
    P.poly([[x, y - 7], [x + 26, y - 7], [x + 33, y - 10], [x + 31, y - 4], [x + 27, y], [x + 4, y], [x + 1, y - 3]], hull[2]);
    P.poly([[x + 2, y - 3], [x + 29, y - 3], [x + 27, y], [x + 4, y]], hull[1]);
    P.rect(x, y - 7, 27, 1, hull[4]);
    P.line(x + 26, y - 7, x + 33, y - 10, hull[4]);
    P.rect(x + 1, y - 5, 27, 1, hull[3]);
    P.rect(x + 3, y - 1, 25, 1, hull[0]);
    // oars resting across
    P.line(x + 6, y - 9, x + 20, y - 7, e.G('#c8a46a'));
    if (e.snowy) { P.rect(x + 1, y - 8, 25, 1, e.G('#f4f8ff')); P.line(x + 26, y - 8, x + 32, y - 11, e.G('#f4f8ff')); }
    // the painter rope up to the post
    P.line(x + 31, y - 9, 358, DECK + 14, e.G('#c8b88a'));
  }

  LB.add({
    id: 'vista', order: 70, section: 'vista',
    name: 'Postcard: Brambleford Lake', world: 'Verdance',
    blurb: 'A side-on view, framed the way Cast n Chill frames its lakes. The game could cut to a view like this when you fish, sit on the dock or a bench, or open the title screen.',
    see: [
      'The sky, the mountains and the hills mirrored in the lake, broken up by moving ripples',
      'Mountains in layers, fading into the sky the farther away they are',
      'The sun sets behind the far hills and leaves a glitter path on the water',
      'Lit windows in the village at night, a windmill turning, smoke from the chimneys',
      'Each season repaints the hills; winter ices the shore and dresses the fisher for the cold',
    ],
    build: 'This is a new kind of view rather than a change to the map. It is drawn live in the engine much as it is here, layers of art with moving water and sky, so it needs no new renders. The first one is the real work; each world after that mostly needs its own hills, skyline and village.',
    w: W, h: H,
    clouds: false, weatherFx: false, grade: false,
    live(ctx, S, P) {
      const e = getEnv(S);
      this._main = ctx.canvas;
      ctx.drawImage(e.sky, 0, 0);
      drawStars(ctx, P, S, e);
      drawMoon(ctx, P, S, e);
      drawSun(ctx, P, S, e);
      if (S.weather === 'rain' || S.weather === 'snow') {
        ctx.save();
        for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.5 - k * 0.1; P.rect(0, 0, W, 14 + k * 9, e.cloudCols[k < 2 ? 2 : 1]); }
        ctx.restore();
      }
      drawClouds(ctx, S, e, ['high', 'mid', 'storm']);
      drawClouds(ctx, S, e, ['low']);
      // a lightning flash far off now and then in rain
      if (S.weather === 'rain') {
        const cyc = Math.floor(S.t / 13), u = S.t % 13;
        if (u < 0.18 && LB.hash(cyc, 0, 3) > 0.4) {
          let x = 120 + LB.hash(cyc, 1, 3) * 260, y = 20;
          ctx.save(); ctx.globalAlpha = 0.85;
          while (y < 96) { const nx = x + (LB.hash(cyc, y, 4) - 0.5) * 8, ny = y + 4 + LB.hash(cyc, y, 5) * 5; P.line(x, y, nx, ny, '#f4f0ff'); x = nx; y = ny; }
          ctx.globalAlpha = 0.18; P.rect(0, 0, W, H0, '#e8ecff');
          ctx.restore();
        }
      }
      ctx.drawImage(e.far, 0, 0);
      drawSmoke(ctx, P, S, e);
      drawWater(ctx, P, S, e);
      glitterPath(ctx, P, S, e);
      // lit windows trail down the water at night
      if (e.windows && e.windows.length) {
        ctx.save();
        for (const [wx, wy] of e.windows) {
          for (let k = 0; k < 7; k++) {
            const yy = 2 * H0 - wy + k * 2 + 1;
            const off = R(Math.sin(yy * 0.6 + S.t * 1.8) * (0.6 + k * 0.25));
            ctx.globalAlpha = 0.7 - k * 0.09;
            P.px(wx + off, yy, '#ffc864');
          }
        }
        ctx.restore();
      }
      // rain on the water
      if (S.weather === 'rain') {
        for (let i = 0; i < 34; i++) {
          const ph = S.t * 0.9 + LB.hash(i, 0, 21), cyc = Math.floor(ph), k = ph - cyc;
          const x = R(LB.hash(i, cyc, 22) * W), y = H0 + 3 + R(LB.hash(i, cyc, 23) * 96);
          rings(ctx, P, x, y, k, 4 + (y - H0) * 0.03, e.hl, 0.55);
        }
      }
      // mist on the water at dawn, and in fog
      const mist = (S.weather === 'fog' ? 1 : 0) + (S.weather === 'clear' ? 0.95 : 0.4) * Math.exp(-Math.pow((S.time - 6.5) / 1.1, 2)) + (S.weather === 'rain' ? 0.25 : 0);
      if (mist > 0.04) {
        const mc = LB.mix(e.G('#eef1f6'), e.hz, 0.35);
        const bands = [[H0 - 9, 4, 3], [H0 - 1, 5, -2], [H0 + 9, 6, 4], [H0 + 26, 7, -3], [H0 + 52, 7, 2]];
        ctx.save();
        bands.forEach(([y0, hh, sp], bi) => {
          for (let y = y0; y < y0 + hh; y++) {
            const edge = y === y0 || y === y0 + hh - 1;
            ctx.globalAlpha = Math.min(0.75, mist * (edge ? 0.2 : 0.42));
            let run = -1;
            for (let x = 0; x <= W; x += 2) {
              const on = x < W && LB.noise(x * 0.012 + S.t * sp * 0.012, bi * 3.1 + (edge ? 0.4 : 0), 55) > (edge ? 0.5 : 0.44);
              if (on && run < 0) run = x;
              if (!on && run >= 0) { P.rect(run, y, x - run, 1, mc); run = -1; }
            }
          }
        });
        ctx.restore();
      }
      ctx.drawImage(e.near, 0, 0);
      drawSails(ctx, P, S, e);
      // the bobber and its rings
      const dipC = Math.floor(S.t / 9), dipU = S.t % 9, dip = dipU < 0.7 && LB.hash(dipC, 0, 9) > 0.35 ? 2 : 0;
      const [bx, by0] = BOBBER, by = by0 + R(Math.sin(S.t * 2) * 0.5) + dip;
      rings(ctx, P, bx, by0 + 1, (S.t / 3.2) % 1, 7, e.hl, 0.6);
      rings(ctx, P, bx, by0 + 1, (S.t / 3.2 + 0.5) % 1, 7, e.hl, 0.6);
      if (dip) rings(ctx, P, bx, by0 + 1, dipU / 0.7, 5, '#ffffff', 0.8);
      P.rect(bx, by - 2, 2, 1, e.G('#d83a3a')); P.rect(bx, by - 1, 2, 1, e.G('#f0ece4'));
      drawDucks(ctx, P, S, e);
      ctx.drawImage(e.front.dock, 0, 0);
      drawBoat(ctx, P, S, e);
      ctx.drawImage(e.front.bank, 0, 0);
      drawReeds(ctx, P, S, e);
      // the fisher, the rod and the line
      const fr = e.fisher[Math.floor(S.t / 1.6) % 2];
      ctx.drawImage(fr, 286, DECK - 17);
      const twitch = (S.t % 7) < 0.25 ? -1 : 0;
      const hx = 288, hy = DECK - 6 + (Math.floor(S.t / 1.6) % 2);
      const tx = 252, ty = 166 + twitch;
      P.line(hx, hy, tx, ty, e.G('#4a3220'));
      P.px(tx, ty, e.G('#d8c8a0'));
      ctx.save(); ctx.globalAlpha = 0.55;
      for (let i = 1; i < 30; i++) {
        const u = i / 30;
        P.px(R(lerp(tx, bx + 1, u)), R(lerp(ty, by - 2, u) + Math.sin(u * Math.PI) * 3), e.G('#e0e4ec'));
      }
      ctx.restore();
      drawBirds(ctx, P, S, e);
      // fireflies over the bank on summer nights
      if ((S.season === 'summer' || S.season === 'spring') && S.L.night > 0.45 && S.weather === 'clear') {
        LB.motes(ctx, S, { n: 26, x: 0, y: 188, w: 290, h: 74, blink: true, colors: ['#eaff9c', '#fff2a0'], seed: 3 });
      }
      // falling weather, coloured by the light
      if (S.weather === 'rain') {
        ctx.save();
        for (let i = 0; i < 190; i++) {
          const h1 = LB.hash(i, 1, 99), h2 = LB.hash(i, 2, 99), h3 = LB.hash(i, 3, 99), sp = 250 + h3 * 120;
          const y = ((h2 * (H + 40) + S.t * sp) % (H + 40)) - 20, x = (((h1 * (W + 40) - S.t * sp * 0.22) % (W + 40)) + (W + 40)) % (W + 40) - 20;
          ctx.globalAlpha = 0.3 + h3 * 0.3;
          P.line(x, y, x - 1, y + 5, e.rainC);
        }
        ctx.restore();
      } else if (S.weather === 'snow') {
        const c1 = LB.mix('#ffffff', '#8c9ac6', S.L.night * 0.75), c2 = LB.mix('#e2e9f6', '#6c7aa6', S.L.night * 0.75);
        for (let i = 0; i < 170; i++) {
          const h1 = LB.hash(i, 1, 77), h2 = LB.hash(i, 2, 77), h3 = LB.hash(i, 3, 77), sp = 12 + h3 * 16;
          const y = ((h2 * (H + 10) + S.t * sp) % (H + 10)) - 5, x = (((h1 * W + Math.sin(S.t * 0.9 + i) * 5 + S.t * 6) % W) + W) % W;
          const c = h3 > 0.5 ? c1 : c2;
          P.px(x, y, c);
          if (h3 > 0.85) { P.px(x + 1, y, c); P.px(x, y + 1, c); P.px(x + 1, y + 1, c); }
        }
      }
    },
    // the bloom layer only: what glows (the main frame already has these)
    emissive(ctx, S, P) {
      if (ctx.canvas === this._main) return;
      const e = getEnv(S);
      if (e.windows) for (const [wx, wy] of e.windows) { P.rect(wx, wy, 1, 2, '#ffd27a'); for (let k = 0; k < 5; k++) P.px(wx, 2 * H0 - wy + k * 2 + 1, '#ffb850'); }
      if (e.millWin) P.rect(e.millWin[0], e.millWin[1], 1, 2, '#ffd27a');
      if (S.L.night > 0.3) P.rect(297, DECK - 27, 3, 4, '#ffe6a0');
      if ((S.season === 'summer' || S.season === 'spring') && S.L.night > 0.45 && S.weather === 'clear') LB.motes(ctx, S, { n: 26, x: 0, y: 188, w: 290, h: 74, blink: true, colors: ['#eaff9c', '#fff2a0'], seed: 3 });
    },
    lights(S) { return [{ x: 298, y: DECK - 25, r: 42, c: '#ffb050', flicker: 1 }]; },
    bloom(ctx, S, P) {
      const s = sunAt(S.time);
      if (s && S.weather !== 'rain') {
        const vis = clamp((landTop(s.x) - s.y) / 10, 0, 1);
        ctx.save(); ctx.globalAlpha = (S.weather === 'clear' ? 0.8 : 0.35) * vis;
        P.disc(R(s.x), R(s.y), 7 + R(S.L.golden * 3), LB.mix('#fff4d0', '#ffb070', S.L.golden));
        ctx.restore();
      }
      glitterPath(ctx, P, S, getEnv(S), true);
    },
  });
})();
