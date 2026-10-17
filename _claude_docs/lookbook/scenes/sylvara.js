// Elderglade Brook — Sylvara, the wood elves' forest: giant trees closing over the glade, light falling through the
// gaps, a brook with a little waterfall and a still pool, the elves' door in a trunk.
(function () {
  'use strict';
  const W = 480, H = 270;
  const clamp = LB.clamp, lerp = LB.lerp, smooth = LB.smooth;
  const LIGHT = Math.atan2(-0.8, -0.6); // key light from the upper left
  const litAt = (a) => (Math.cos(a - LIGHT) + 1) / 2;

  // ---------- layout ----------
  // the brook: y, centre x, half-width left, half-width right
  const BROOK = [
    [-30, 192, 9, 9], [16, 200, 9, 10], [54, 222, 11, 11], [92, 248, 13, 13], [120, 258, 16, 18],
    [144, 254, 44, 36], [168, 244, 42, 32], [194, 226, 22, 18], [214, 204, 15, 15], [242, 182, 17, 16], [274, 168, 18, 18], [320, 160, 18, 18],
  ];
  const CASCADE_Y = 100;
  const PATH = [[-14, 250], [40, 244], [92, 237], [142, 228], [180, 218], [204, 214], [232, 210], [282, 204], [330, 193], [372, 178], [400, 166], [420, 158]];
  const GAPS = [168, 290, 356];
  const TRUNKS = [
    { id: 'D', x: 140, y: 72, w: 22, h: 80 },
    { id: 'C', x: 318, y: 78, w: 34, h: 100 },
    { id: 'B', x: 422, y: 154, w: 68, h: 170, door: true },
    { id: 'A', x: 46, y: 172, w: 60, h: 180 },
  ];
  const BOULDERS = [[150, 154, 13, 1], [228, 128, 9, 2], [466, 216, 14, 3], [14, 246, 12, 4], [372, 240, 8, 5], [292, 252, 7, 6]];
  const FERNS = [[100, 178, 1], [304, 132, 2], [206, 140, 3], [356, 150, 4], [300, 100, 5], [172, 100, 6], [60, 210, 7], [452, 250, 8], [130, 262, 9], [392, 114, 10], [176, 190, 11], [334, 264, 12], [272, 112, 13]];
  const MUSH = [[86, 184, 'red'], [146, 207, 'tan'], [448, 176, 'glow'], [380, 254, 'red'], [262, 234, 'glow'], [28, 196, 'glow'], [334, 154, 'tan'], [118, 268, 'red'], [398, 172, 'glow']];
  const PLANTS = [[388, 176], [246, 208], [66, 192], [302, 236], [452, 196]];
  const FLOWERS = [[330, 222], [298, 238], [118, 122], [398, 208], [150, 248], [272, 222], [352, 212], [92, 214], [440, 236], [250, 252], [196, 168], [342, 238]];
  const LOG = { x0: 64, x1: 140, y: 204 };
  const LAMPS = [[160, 214, -1], [348, 182, 1]];
  const BIRCHES = [[378, 134, 1], [116, 136, 2]];
  const STONES = [[188, 217, 9], [198, 213, 10], [209, 217, 9], [220, 213, 10]];
  const VINES = [[132, 30], [214, 22], [344, 26], [470, 34], [88, 24]];

  // ---------- seasons ----------
  const SEAS = {
    spring: { moss: '#6a9a3e', soil: '#5c4634', leaf: '#4c8a3c', birch: '#86c25a', fern: '#76ae48', flowers: ['#f6f2e4', '#8eaaf2', '#f4da68', '#f2b8d0'], litter: ['#8a7a4a', '#6e6a3c'], litterN: 0.04 },
    summer: { moss: '#548a3a', soil: '#564030', leaf: '#346a30', birch: '#5c9a44', fern: '#4a8c3a', flowers: ['#c890f0', '#f4a2c2', '#f8f4e8', '#f8d860'], litter: ['#6a6a38'], litterN: 0.025 },
    autumn: { moss: '#6c7a36', soil: '#5c432e', leaf: '#c87a2c', birch: '#e8bc40', fern: '#b0662c', flowers: ['#f0c860', '#e8e0d0'], litter: ['#d89a32', '#c8642a', '#a8402c', '#e8b848'], litterN: 0.4 },
    winter: { moss: '#4c6c3c', soil: '#4c3a2e', leaf: '#2c5646', birch: null, fern: '#8a6a4a', flowers: [], litter: ['#7a5236'], litterN: 0.02 },
  };
  const ramp = (c, n, mid, o) => LB.memo('sylv-r:' + c + n + mid + JSON.stringify(o || {}), () => LB.ramp(c, n, Object.assign({ mid }, o || {})));
  const SNOW = () => ramp('#e9eff9', 5, 3, { cool: 228 });
  const STONE = () => ramp('#8c889c', 5, 2);
  const BARK = () => ramp('#7e4e38', 6, 3);

  // ---------- geometry (computed once) ----------
  function cr(a, b, c, d, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); }
  function brookAt(y) {
    let i = 0;
    while (i < BROOK.length - 2 && BROOK[i + 1][0] <= y) i++;
    const p0 = BROOK[Math.max(0, i - 1)], p1 = BROOK[i], p2 = BROOK[i + 1], p3 = BROOK[Math.min(BROOK.length - 1, i + 2)];
    const t = (y - p1[0]) / (p2[0] - p1[0]);
    return [cr(p0[1], p1[1], p2[1], p3[1], t), cr(p0[2], p1[2], p2[2], p3[2], t), cr(p0[3], p1[3], p2[3], p3[3], t)];
  }
  function distSeg(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t);
  }
  function canopyBottom(x) {
    let b;
    if (x < 120) b = lerp(122, 66, x / 120);
    else if (x < 210) b = 48;
    else if (x < 282) b = 40;
    else if (x < 362) b = 46;
    else b = lerp(58, 96, (x - 362) / 118);
    b += Math.sin(x * 0.09) * 4 + Math.sin(x * 0.23 + 1) * 2.5;
    for (const g of GAPS) b -= 20 * Math.max(0, 1 - Math.abs(x - g) / 12);
    return b;
  }

  let G = null;
  function geo() {
    if (G) return G;
    G = {};
    const N = W * H;
    const cx = new Float32Array(H), xl = new Float32Array(H), xr = new Float32Array(H);
    for (let y = 0; y < H; y++) {
      const [c, l, r] = brookAt(y);
      const nl = 1 + 0.16 * (LB.fbm(y * 0.07, 1.5, 11, 2) * 2 - 1), nr = 1 + 0.16 * (LB.fbm(y * 0.07, 7.5, 12, 2) * 2 - 1);
      cx[y] = c; xl[y] = c - l * nl; xr[y] = c + r * nr;
    }
    G.cx = cx; G.xl = xl; G.xr = xr;
    const depth = new Float32Array(N).fill(-1);
    for (let y = 0; y < H; y++) {
      const c = cx[y], a = xl[y], b = xr[y];
      const pool = smooth(16, 30, (b - a) / 2);
      for (let x = Math.ceil(a); x <= Math.floor(b); x++) {
        if (x < 0 || x >= W) continue;
        const d = clamp(x < c ? (x - a) / (c - a) : (b - x) / (b - c), 0, 1);
        depth[y * W + x] = Math.pow(d, 1 - 0.4 * pool);
      }
    }
    G.depth = depth;
    G.isW = (x, y) => x >= 0 && y >= 0 && x < W && y < H && depth[y * W + x] >= 0;
    // the water mask
    G.mask = LB.canvas(W, H);
    {
      const c = LB.ctx2d(G.mask), id = c.createImageData(W, H);
      for (let i = 0; i < N; i++) if (depth[i] >= 0) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = 255; }
      c.putImageData(id, 0, 0);
    }
    // vertical runs of water per column, for the reflection
    G.runs = [];
    for (let x = 0; x < W; x++) {
      let y = 0;
      while (y < H) {
        while (y < H && depth[y * W + x] < 0) y++;
        if (y >= H) break;
        const y0 = y;
        while (y < H && depth[y * W + x] >= 0) y++;
        G.runs.push([x, y0, y - 1]);
      }
    }
    // travel time down the brook (narrow runs fast, the pool slow) — for the drifting flow marks
    G.tau = new Float32Array(H + 40);
    let acc = 0;
    for (let y = 0; y < H + 40; y++) { const yy = Math.min(H - 1, y); G.tau[y] = acc; acc += ((xr[yy] - xl[yy]) / 26) / 20; }
    G.tauMax = acc;
    // the path
    const path = new Uint8Array(N);
    for (let y = 150; y < H; y++) for (let x = 0; x < W; x++) {
      if (depth[y * W + x] >= 0) continue;
      let d = 1e9;
      for (let k = 0; k + 1 < PATH.length; k++) d = Math.min(d, distSeg(x, y, PATH[k], PATH[k + 1]));
      const wid = 9.5 + (LB.noise(x * 0.11, y * 0.13, 5) - 0.5) * 4 - (x > 380 ? (x - 380) * 0.06 : 0);
      if (d < wid) path[y * W + x] = 1;
    }
    G.path = path;
    // light on the forest floor: a bright clearing, the canopy's shade at the top and round the trunks, soft dapples
    const band = new Uint8Array(N), lm = new Float32Array(N), soil = new Uint8Array(N), root = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const ex = (x - 262) / 250, ey = (y - 196) / 120;
      let l = 1 - (ex * ex + ey * ey);
      l -= Math.max(0, (canopyBottom(x) + 36 - y) / 70) * 0.55;
      let rd = 9;
      for (const T of TRUNKS) {
        const d = Math.hypot((x - T.x) / (T.w * 0.95), (y - T.y) / (T.w * 0.42));
        rd = Math.min(rd, d);
        if (d < 1.7) l -= (1.7 - d) * 0.28;
      }
      root[i] = rd;
      l += (LB.fbm(x / 60, y / 40, 21, 2) - 0.5) * 0.42;
      lm[i] = l;
      band[i] = clamp(Math.floor((l + 0.3) * 5.2), 0, 5);
      // bare soil: round the roots, along the banks, and in a few patches
      const ny = Math.max(0, Math.min(H - 1, y));
      const bankD = Math.max(0, xl[ny] - x, x - xr[ny]);
      const n = LB.fbm(x / 26, y / 18, 9, 3);
      if (rd < 1.05 + (n - 0.5) * 0.5 || bankD < 2 + n * 4 || n > 0.77) soil[i] = 1;
    }
    G.band = band; G.lm = lm; G.soil = soil; G.root = root;
    // mist hugs the water
    G.mistMask = LB.canvas(W, H);
    {
      const c = LB.ctx2d(G.mistMask), id = c.createImageData(W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let d = 99;
        for (let k = -6; k <= 6; k += 2) {
          const yy = clamp(y + k, 0, H - 1);
          d = Math.min(d, Math.max(0, xl[yy] - x, x - xr[yy]) + Math.abs(k) * 0.8);
        }
        d += (LB.noise(x * 0.08, y * 0.1, 3) - 0.5) * 8;
        const a = y < canopyBottom(x) + 2 ? 0 : d < 5 ? 1 : d < 12 ? 0.66 : d < 20 ? 0.33 : 0;
        const i = (y * W + x) * 4;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = a * 255;
      }
      c.putImageData(id, 0, 0);
    }
    G.glintPts = LB.maskPoints(G.mask, 110, 7);
    G.ringPts = LB.maskPoints(G.mask, 22, 9).filter(([x, y]) => depth[y * W + x] > 0.35);
    G.fishPts = G.ringPts.slice(0, 2);
    return G;
  }

  // ---------- painters ----------
  function stamp(P, x, y, rows, pal) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i];
      if (ch !== '.' && pal[ch]) P.px(x + i, y + j, pal[ch]);
    }
  }
  // one rounded clump of leaves, lit from the upper left, with a scalloped rim
  function lobe(P, cx, cy, r, R0, rnd, o) {
    o = o || {};
    let R = R0;
    if (o.snow) { const s = o.snow; R = [R0[0], R0[1], R0[2], s[2], s[3], s[4]]; }
    P.disc(cx + 1, cy + 2, r, R[0]);
    P.disc(cx, cy, r - 1, R[1]);
    P.disc(cx - r * 0.16, cy - r * 0.2, r * 0.74, R[2]);
    P.disc(cx - r * 0.34, cy - r * 0.38, r * 0.42, R[3]);
    if (o.snow) P.ellipse(cx - r * 0.3, cy - r * 0.42, r * 0.5, r * 0.26, R[4]);
    const n = Math.max(7, Math.round(r * 1.15));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
      const rr = r - 1.5 + rnd() * 1.5;
      const l = litAt(a);
      const tone = l > 0.82 ? 4 : l > 0.56 ? 3 : l > 0.3 ? 2 : 1;
      P.disc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92, 1.4 + rnd() * 1.3, R[tone]);
    }
    const m = Math.round(r * 0.9);
    for (let i = 0; i < m; i++) {
      const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * r * 0.72;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const l = litAt(a) * (rr / r) + (1 - rr / r) * 0.45 + (rnd() - 0.5) * 0.3;
      const tone = l > 0.64 ? 4 : l > 0.46 ? 3 : l > 0.3 ? 2 : 1;
      P.disc(x, y, 1 + rnd() * 1.3, R[tone]);
      if (tone >= 3) P.px(x - 1, y - 1, R[tone + 1]);
      else P.px(x + 1, y + 1, R[0]);
    }
    for (let i = 0; i < 3; i++) { const a = LIGHT + (rnd() - 0.5) * 1.1; P.px(cx + Math.cos(a) * (r - 2.5), cy + Math.sin(a) * (r - 2.5), R[5]); }
    if (o.blossom) {
      for (let i = 0; i < r * 0.5; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * r * 0.85;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        P.px(x, y, litAt(a) > 0.5 ? '#ffe6ee' : '#f0aac0'); if (rnd() < 0.5) P.px(x + 1, y, '#f4b8cc');
      }
    }

  }
  function leafRamp(season, x, y) {
    let base = SEAS[season].leaf;
    if (season === 'autumn') {
      const n = LB.noise(x / 64, y / 46, 8);
      base = n < 0.36 ? '#a8462c' : n < 0.6 ? '#c8722a' : n < 0.8 ? '#d89c36' : '#7a8634';
    }
    return ramp(base, 6, 3);
  }
  const winterish = (S) => S.season === 'winter';
  const snowLevel = (S) => (S.snow >= 1 ? 2 : S.snow > 0 ? 1 : 0);

  function canopySprite(season, sl) {
    return LB.memo(`sylv-canopy:${season}:${sl}`, () => {
      const cv = LB.canvas(W, 150), P = LB.paint(LB.ctx2d(cv));
      const rnd = LB.rng(55);
      const lobes = [];
      for (let row = 0; row < 6; row++) {
        let x = -14 + rnd() * 10;
        while (x < W + 16) {
          const r = 13 + rnd() * 9 - row * 0.4;
          const y = canopyBottom(x) - r * 0.78 - row * 20 + (rnd() - 0.5) * 6;
          if (y + r > -6) lobes.push({ x, y, r });
          x += r * 1.2 + rnd() * 6;
        }
      }
      lobes.sort((a, b) => a.y + a.r - (b.y + b.r));
      const snow = sl === 2 ? SNOW() : null;
      for (const l of lobes) {
        lobe(P, l.x, l.y, l.r, leafRamp(season, l.x, l.y), rnd, {
          snow: (snow && rnd() < 0.8) || (sl === 1 && rnd() < 0.35) ? SNOW() : null,
          blossom: season === 'spring' && l.x > 280 && l.x < 350,
        });
      }
      return LB.outline(cv, 'sel', 1.1);
    });
  }

  // a giant trunk with flaring roots (and, for one, the elves' door)
  function trunkSprite(T, season, sl) {
    return LB.memo(`sylv-trunk:${T.id}:${season}:${sl}`, () => {
      const span = Math.round(T.w * 0.8), down = 18;
      const w = T.w + span * 2, h = T.h + down;
      const cv = LB.canvas(w, h), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const R = BARK(), M = ramp(SEAS[season].moss, 5, 2), SN = SNOW();
      const rnd = LB.rng(T.id.charCodeAt(0) * 13);
      const base = T.h, cxs = span + T.w / 2;
      const K = Math.max(3, Math.round(T.w / 7));
      const ph = Array.from({ length: K }, () => rnd() * 6);
      for (let y = 0; y <= base; y++) {
        const fl = y > base - 26 ? Math.pow((y - (base - 26)) / 26, 2) * T.w * 0.24 : 0;
        const left = span - fl, right = span + T.w + fl;
        for (let x = Math.floor(left); x <= Math.ceil(right); x++) {
          const u = (x - left) / (right - left);
          let tone = u < 0.07 ? 3 : u < 0.32 ? 4 : u < 0.56 ? 3 : u < 0.78 ? 2 : u < 0.93 ? 1 : 0;
          for (let k = 0; k < K; k++) {
            const fx = left + ((k + 0.5) / K) * (right - left) + 1.6 * Math.sin(y * 0.06 + ph[k]) + (LB.noise(k * 3, y * 0.05, 4) - 0.5) * 3;
            if (LB.noise(k * 5.3, y * 0.09, 6) < 0.28) continue; // a break between bark plates
            const dx = x - fx;
            if (dx > -0.5 && dx <= 0.5) tone = Math.max(0, tone - 2);
            else if (dx > 0.5 && dx <= 1.5 && tone <= 3) tone += 1;
          }
          P.px(x, y, R[clamp(tone, 0, 5)]);
        }
        // moss up the shaded-from-rain, lit side; snow sticks on the left in winter
        for (let x = Math.floor(left); x < left + (right - left) * 0.5; x++) {
          if (y < base * 0.25) continue;
          const n = LB.fbm(x / 6, y / 9, T.id.charCodeAt(0), 2) + (y / base) * 0.18;
          if (n > 0.66) {
            const above = LB.fbm(x / 6, (y - 1) / 9, T.id.charCodeAt(0), 2) + ((y - 1) / base) * 0.18;
            const h = LB.hash(x, y, 13);
            P.px(x, y, above <= 0.66 ? M[3] : h < 0.3 ? M[1] : n > 0.75 && h > 0.6 ? M[3] : M[2]);
          }
          if (sl === 2 && x < left + 3 && LB.hash(x, y, 3) < 0.35) P.px(x, y, SN[3]);
        }
      }
      // bracket fungi up the trunk
      if (!T.door && T.w > 40) {
        for (const [fy, fx, fw] of [[base - 60, 0.74, 5], [base - 54, 0.84, 4], [base - 66, 0.66, 3], [base - 96, 0.22, 5]]) {
          const x = span + T.w * fx;
          P.ellipse(x + 1, fy + 2, fw, 2, '#4a3220');
          P.ellipse(x, fy + 1, fw, 2, '#9a6a3a');
          P.ellipse(x - 0.5, fy, fw - 1, 1, '#d4a060');
          P.hline(x - fw + 2, x, fy - 1, '#f0c888');
          P.hline(x - fw + 1, x + fw - 1, fy + 3, '#5a3e26');
        }
      }
      if (T.door) door(P, cxs, base);
      // roots, spreading over the ground
      const roots = T.door
        ? [[-0.5, Math.PI * 0.97, 0.8, 7], [-0.44, Math.PI * 0.82, 0.55, 6], [-0.34, Math.PI * 0.66, 0.42, 6], [0.34, Math.PI * 0.32, 0.45, 6], [0.44, Math.PI * 0.16, 0.6, 6], [0.5, Math.PI * 0.02, 0.82, 7]]
        : T.w < 30 ? [[-0.4, Math.PI * 0.85, 0.6, 4], [0.4, Math.PI * 0.18, 0.6, 4], [0, Math.PI * 0.5, 0.35, 4]]
          : [[-0.5, Math.PI * 0.96, 0.8, 7], [-0.4, Math.PI * 0.78, 0.55, 6], [-0.22, Math.PI * 0.62, 0.42, 6], [0.02, Math.PI * 0.5, 0.32, 6], [0.24, Math.PI * 0.36, 0.45, 6], [0.4, Math.PI * 0.2, 0.55, 6], [0.5, Math.PI * 0.04, 0.78, 7]];
      for (const [s, a, lf, th] of roots) {
        const len = lf * T.w;
        const sx = cxs + s * T.w, sy = base - 3;
        const steps = Math.ceil(len);
        const bend = (rnd() - 0.5) * 0.5;
        const at = (t) => {
          const aa = a + bend * t;
          const rr = th * Math.pow(1 - t, 0.8) * (T.w / 64 + 0.25) + 0.6;
          return [sx + Math.cos(aa) * len * t, sy + Math.sin(aa) * len * t * 0.5 - rr * 0.4 * (1 - t), rr];
        };
        for (const pass of [0, 1, 2, 3]) {
          for (let i = 0; i <= steps; i++) {
            const t = i / steps, [x, y, rr] = at(t);
            if (pass === 0) P.disc(x + 1, y + 1.5, rr, R[0]);
            else if (pass === 1) P.disc(x, y, rr, R[1]);
            else if (pass === 2) P.disc(x - rr * 0.2, y - rr * 0.3, rr * 0.72, R[2]);
            else if (rr > 1.6 && LB.noise(t * 7, a * 3, 9) > 0.42) P.disc(x - rr * 0.38, y - rr * 0.5, rr * 0.3, R[3]);
          }
        }
        // creases across the root and a ridge along it — bark, not a smooth tube
        for (let i = 3; i < steps - 2; i += 4 + Math.floor(rnd() * 3)) {
          const t = i / steps, [x, y, rr] = at(t);
          if (rr < 2) continue;
          const nx = -Math.sin(a) * 0.5, ny = Math.cos(a);
          P.line(x - nx * rr * 0.7, y - ny * rr * 0.7 * 0.6, x + nx * rr * 0.2, y + ny * rr * 0.2, R[0]);
        }
        for (let i = 2; i < steps - 3; i++) { const [x, y, rr] = at(i / steps); if (rr > 2.5 && i % 3 !== 0) P.px(x + rr * 0.25, y + rr * 0.2, R[0]); }
        // moss or snow along the top
        for (let i = 2; i < steps - 2; i++) {
          const t = i / steps, [x, y, rr] = at(t);
          if (sl === 2) { if (t < 0.85) { P.px(x - rr * 0.3, y - rr * 0.75, SN[4]); P.px(x - rr * 0.3 + 1, y - rr * 0.75, SN[3]); if (rr > 3) P.px(x - rr * 0.3, y - rr * 0.75 + 1, SN[2]); } }
          else if (LB.noise(t * 5, s * 9 + a, 2) > 0.48) {
            P.px(x - rr * 0.3, y - rr * 0.7, M[LB.hash(i, 1, 4) < 0.5 ? 3 : 2]);
            if (rr > 3) { P.px(x - rr * 0.3 + 1, y - rr * 0.7, M[2]); P.px(x - rr * 0.3, y - rr * 0.7 + 1, M[1]); }
            if (LB.hash(i, 2, 4) < 0.3) P.px(x - rr * 0.3, y - rr * 0.7 - 1, M[4]);
          }
        }
      }
      return LB.outline(cv, 'sel', 1.0);
    });
  }
  // the elves' door: an arch of pale wood, plank door, a round window above
  const DOOR = { w: 26, h: 44 };
  function door(P, cx, base) {
    const dw = DOOR.w / 2, top = base - DOOR.h;
    const wood = ramp('#d8c6a0', 5, 2), plank = ramp('#94603a', 5, 2);
    const inArch = (x, y, inset) => {
      const r = dw - inset, cy = top + dw;
      if (y < top + inset) return false;
      if (y < cy) return Math.hypot(x - cx, y - cy) <= r;
      return Math.abs(x - cx) <= r;
    };
    for (let y = top - 2; y <= base; y++) for (let x = cx - dw - 2; x <= cx + dw + 2; x++) {
      if (inArch(x, y, 2.5)) {
        const lx = Math.round(x - cx + dw);
        let c = plank[(lx % 5 === 0) ? 0 : x < cx ? 3 : 2];
        if (y === base - 18 || y === base - 6) c = plank[1];
        P.px(x, y, c);
      } else if (inArch(x, y, 0)) P.px(x, y, wood[x < cx - 2 || y < top + 4 ? 3 : 1]);
      else if (inArch(x, y, -1.2)) P.px(x, y, wood[0]);
    }
    // round window in the door, handle
    P.disc(cx, top + 12, 4, wood[1]); P.disc(cx, top + 12, 3, '#26323e'); P.px(cx - 1, top + 11, '#5a6a7a');
    P.rect(cx + 6, base - 20, 2, 2, '#e8c050'); P.px(cx + 6, base - 20, '#fff0a0');
    // leaf carving on the keystone
    P.px(cx, top - 2, '#8ab048'); P.px(cx - 1, top - 1, '#6a9a3a'); P.px(cx + 1, top - 1, '#6a9a3a'); P.px(cx, top - 1, '#c8e070');
    // round window above
    const wy = base - 58;
    P.disc(cx, wy, 6, wood[0]); P.disc(cx, wy, 5, wood[2]); P.disc(cx, wy, 4, '#26323e');
    P.vline(cx, wy - 4, wy + 4, wood[1]); P.hline(cx - 4, cx + 4, wy, wood[1]); P.px(cx - 2, wy - 2, '#5a6a7a');
    // a stone step
    const st = STONE();
    P.rect(cx - 15, base - 1, 30, 5, st[1]); P.rect(cx - 14, base - 1, 28, 3, st[2]); P.hline(cx - 13, cx + 10, base - 1, st[3]);
  }
  const DOOR_POS = () => { const B = TRUNKS[2]; return { x: B.x, y: B.y, win: [B.x, B.y - DOOR.h + 12], round: [B.x, B.y - 58] }; };

  function birchSprite(id, season, sl) {
    return LB.memo(`sylv-birch:${id}:${season}:${sl}`, () => {
      const cv = LB.canvas(40, 80), P = LB.paint(LB.ctx2d(cv));
      const rnd = LB.rng(id * 31);
      const bk = ['#8a8c92', '#c2c6cc', '#e6e8ec', '#f6f8fa'];
      for (let y = 22; y < 80; y++) {
        const sway = Math.round(Math.sin(y * 0.05 + id) * 1);
        P.px(19 + sway, y, bk[3]); P.px(20 + sway, y, bk[2]); P.px(21 + sway, y, bk[1]); P.px(22 + sway, y, bk[0]);
        if (LB.hash(id, y, 7) < 0.16) { P.px(20 + sway, y, '#2a2624'); P.px(21 + sway, y, '#3a3430'); }
      }
      const col = SEAS[season].birch;
      if (col) {
        const R = ramp(col, 6, 3);
        for (const [x, y, r] of [[14, 22, 9], [27, 20, 9], [20, 12, 10], [21, 28, 7]]) lobe(P, x, y, r, R, rnd, { snow: sl === 1 && rnd() < 0.5 ? SNOW() : null });
      } else {
        // bare branches in winter, with snow along them
        const SN = SNOW();
        for (const [a, l] of [[-2.3, 14], [-1.9, 18], [-1.4, 20], [-1.1, 16], [-0.8, 13], [-2.6, 10]]) {
          let x = 20, y = 30;
          for (let i = 0; i < l; i++) {
            x += Math.cos(a) * 1; y += Math.sin(a) * 1;
            P.px(x, y, '#6a5e58');
            if (i % 2 === 0) P.px(x, y - 1, SN[3]);
            if (i === Math.floor(l * 0.6)) { P.line(x, y, x + Math.cos(a - 0.6) * 5, y + Math.sin(a - 0.6) * 5, '#7a6e66'); }
          }
        }
      }
      return LB.outline(cv, 'sel');
    });
  }
  function boulderSprite(r, seed, season, sl) {
    return LB.memo(`sylv-boulder:${r}:${seed}:${season}:${sl}`, () => {
      const w = r * 2 + 8, h = Math.round(r * 1.7) + 8;
      const cv = LB.canvas(w, h), P = LB.paint(LB.ctx2d(cv));
      const S = STONE(), M = ramp(SEAS[season].moss, 5, 2), SN = SNOW();
      const cx = w / 2, cy = h - r * 0.8 - 3;
      P.blob(cx + 1, cy + 1, r, S[0], seed, 0.16, 0.8);
      P.blob(cx, cy, r - 0.5, S[1], seed, 0.16, 0.8);
      P.blob(cx - r * 0.12, cy - r * 0.14, r * 0.82, S[2], seed + 1, 0.18, 0.78);
      P.blob(cx - r * 0.34, cy - r * 0.36, r * 0.45, S[3], seed + 2, 0.22, 0.75);
      P.px(cx - r * 0.45, cy - r * 0.5, S[4]); P.px(cx - r * 0.3, cy - r * 0.55, S[4]);
      // a crack
      P.line(cx + r * 0.2, cy - r * 0.2, cx + r * 0.35, cy + r * 0.3, S[0]);
      if (sl === 2) {
        P.blob(cx - r * 0.08, cy - r * 0.46, r * 0.74, SN[2], seed + 3, 0.28, 0.5);
        P.blob(cx - r * 0.2, cy - r * 0.56, r * 0.5, SN[3], seed + 4, 0.25, 0.5);
        P.px(cx - r * 0.4, cy - r * 0.62, SN[4]);
      } else {
        P.blob(cx - r * 0.06, cy - r * 0.44, r * 0.72, M[1], seed + 3, 0.34, 0.52);
        P.blob(cx - r * 0.12, cy - r * 0.5, r * 0.6, M[2], seed + 3, 0.34, 0.5);
        const rnd = LB.rng(seed * 7);
        for (let i = 0; i < r * 1.2; i++) {
          const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * r * 0.55;
          const x = cx - r * 0.1 + Math.cos(a) * rr, y = cy - r * 0.5 + Math.sin(a) * rr * 0.5;
          P.px(x, y, litAt(a) > 0.5 ? M[4] : M[3]);
        }
        // moss dripping over the lip
        for (let i = 0; i < 3; i++) { const x = cx - r * 0.5 + i * r * 0.4; P.vline(x, cy - r * 0.2, cy - r * 0.2 + 1 + (i % 2), M[1]); }
        if (sl === 1) P.blob(cx - r * 0.2, cy - r * 0.56, r * 0.4, SN[3], seed + 4, 0.25, 0.5);
      }
      return LB.outline(cv, 'sel');
    });
  }
  function fernSprite(seed, season, sl) {
    return LB.memo(`sylv-fern:${seed}:${season}:${sl}`, () => {
      const cv = LB.canvas(34, 24), P = LB.paint(LB.ctx2d(cv));
      const R = ramp(SEAS[season].fern, 5, 2), rnd = LB.rng(seed * 17 + 3);
      const cx = 17, cy = 19, small = season === 'winter' ? 0.6 : 1;
      const fronds = [-2.75, -2.35, -1.95, -1.57, -1.2, -0.8, -0.4, -3.05, -0.1].map((a) => [a + (rnd() - 0.5) * 0.2, (9 + rnd() * 5) * small]);
      fronds.sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));
      for (const [a, len] of fronds) {
        const side = Math.cos(a) < 0 ? -1 : 1;
        for (let s = 0; s <= len; s += 1) {
          const t = s / len;
          const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s * 0.72 + t * t * 5;
          P.px(x, y, R[1]);
          if (Math.round(s) % 2 === 0 && t > 0.1) {
            const ll = Math.max(1, Math.round((1 - t) * 3.2));
            const nx = -Math.sin(a), ny = Math.cos(a) * 0.72;
            for (let k = 1; k <= ll; k++) {
              P.px(x + nx * k, y + ny * k + k * 0.4, R[litAt(a - Math.PI / 2) > 0.5 ? 3 : 2]);
              P.px(x - nx * k, y - ny * k + k * 0.4, R[litAt(a + Math.PI / 2) > 0.5 ? 3 : 2]);
            }
          }
          if (t > 0.9) P.px(x, y, R[4]);
        }
        void side;
      }
      return LB.outline(cv, 'sel');
    });
  }
  function mushSprite(kind, seed, sl) {
    return LB.memo(`sylv-mush:${kind}:${seed}:${sl}`, () => {
      const cv = LB.canvas(16, 12), P = LB.paint(LB.ctx2d(cv));
      const cap = kind === 'red' ? ramp('#c8423a', 4, 1) : kind === 'tan' ? ramp('#b8865a', 4, 1) : ramp('#5ab8b4', 4, 1);
      const rnd = LB.rng(seed);
      const spots = [[5, 10, 3], [10, 10, 2], [8, 11, 1.6]].slice(0, kind === 'glow' ? 3 : 2 + (rnd() < 0.5 ? 1 : 0));
      for (const [x, y, s] of spots) {
        const hgt = Math.round(s + 1);
        P.rect(x - 0.5, y - hgt, 2, hgt, '#e8dcc0'); P.px(x + 1, y - hgt, '#b8a888');
        P.ellipse(x, y - hgt - 1, s, Math.max(1, s * 0.55), cap[1]);
        P.ellipse(x - 0.4, y - hgt - 1.5, s * 0.7, Math.max(0.5, s * 0.35), cap[2]);
        P.px(x - s * 0.5, y - hgt - 2, cap[3]);
        if (kind === 'red' && s > 1.5) { P.px(x + 1, y - hgt - 2, '#f4f4f6'); P.px(x - 1, y - hgt - 1, '#f4f4f6'); }
        if (kind === 'glow') P.px(x, y - hgt - 2, '#d8fff8');
      }
      if (sl === 2) P.hline(3, 9, 7, '#f4f8ff');
      return LB.outline(cv, 'sel');
    });
  }
  function plantSprite(seed) {
    return LB.memo(`sylv-plant:${seed}`, () => {
      const cv = LB.canvas(14, 18), P = LB.paint(LB.ctx2d(cv));
      const rnd = LB.rng(seed * 5);
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (k - 1.5) * 0.35 + (rnd() - 0.5) * 0.2, len = 9 + rnd() * 5;
        let x = 7, y = 17;
        for (let s = 0; s < len; s++) { x += Math.cos(a) * 0.9; y += Math.sin(a) * 0.9; P.px(x, y, s < len * 0.5 ? '#3a6a52' : '#4a8a6a'); }
        P.rect(x - 0.5, y - 1.5, 2, 2, '#9ad8d4'); P.px(x - 0.5, y - 1.5, '#d8fff8');
      }
      return LB.outline(cv, 'sel');
    });
  }
  // a fallen log lying left to right: bark on top, the cut end showing its rings
  function logSprite(len, season, sl, wet) {
    return LB.memo(`sylv-log:${len}:${season}:${sl}:${wet}`, () => {
      const h = 18, cv = LB.canvas(len + 6, h), P = LB.paint(LB.ctx2d(cv));
      const R = ramp(wet ? '#5e5236' : '#7a5a3e', 5, 2), M = ramp(SEAS[season].moss, 5, 2), SN = SNOW();
      const top = 3;
      for (let x = 3; x < len + 2; x++) {
        for (let y = top; y < top + 12; y++) {
          const v = (y - top) / 12;
          let tone = v < 0.18 ? 3 : v < 0.42 ? 4 : v < 0.6 ? 2 : v < 0.85 ? 1 : 0;
          if ((y === top + 4 || y === top + 8) && LB.noise(x * 0.3, y, 5) > 0.35) tone = Math.max(0, tone - 2);
          P.px(x, y, R[tone]);
        }
      }
      if (wet) for (let x = 3; x < len + 2; x++) P.px(x, top + 10, '#3e5a3a');
      // the cut end
      const ex = 6, ey = top + 6;
      const ring = ramp('#c8a070', 4, 2);
      P.ellipse(ex, ey, 4, 6, R[1]); P.ellipse(ex, ey, 3, 5, ring[2]); P.ellipse(ex, ey, 2, 3, ring[1]); P.ellipse(ex, ey, 1, 2, ring[2]); P.px(ex, ey, ring[0]);
      P.px(ex - 2, ey - 3, ring[3]);
      // moss or snow along the top
      for (let x = 12; x < len; x++) {
        const n = LB.noise(x * 0.18, 3, 7);
        if (sl === 2) { P.px(x, top, SN[3]); P.px(x, top + 1, SN[2]); if (n > 0.5) P.px(x, top - 1, SN[3]); }
        else if (n > 0.55) { P.px(x, top + 1, M[3]); if (n > 0.66) P.px(x, top, M[4]); }
      }
      if (wet && sl === 2) for (let x = 8; x < len; x += 3) { P.vline(x, top + 12, top + 14 + (x % 2), '#cfe6f6'); }
      return LB.outline(cv, 'sel');
    });
  }
  function stoneSprite(w, seed, sl) {
    return LB.memo(`sylv-stone:${w}:${seed}:${sl}`, () => {
      const cv = LB.canvas(w + 4, 10), P = LB.paint(LB.ctx2d(cv));
      const S = STONE(), cx = (w + 4) / 2;
      P.ellipse(cx, 6, w / 2, 3, '#3a404c');
      P.ellipse(cx, 5, w / 2, 3, S[1]);
      P.ellipse(cx - 0.5, 4, w / 2 - 1, 2, S[2]);
      P.ellipse(cx - 1.5, 3.5, w / 4, 1, S[3]);
      if (sl === 2) { P.ellipse(cx - 0.5, 3.5, w / 2 - 1.5, 1.5, SNOW()[3]); }
      else if (seed % 2) P.px(cx + 2, 4, '#6a8a44');
      return LB.outline(cv, 'sel');
    });
  }
  function lampSprite(side) {
    return LB.memo(`sylv-lamp:${side}`, () => {
      const cv = LB.canvas(22, 54), P = LB.paint(LB.ctx2d(cv));
      const wd = ramp('#6a4a30', 4, 1);
      const px = 11;
      P.rect(px - 1, 12, 2, 41, wd[1]); P.vline(px - 1, 12, 52, wd[2]);
      // the crook
      for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI * 0.9; P.px(px + side * (3 + Math.cos(a) * 3), 12 + Math.sin(a) * 4, wd[i < 3 ? 2 : 1]); }
      const lx = px + side * 6;
      P.vline(lx, 10, 13, '#3a3a40');
      P.rect(lx - 2, 14, 5, 1, '#5a4a30'); P.rect(lx - 2, 15, 5, 7, '#b08a40'); P.rect(lx - 1, 16, 3, 5, '#e8d4a0'); P.rect(lx - 2, 22, 5, 1, '#5a4a30');
      P.px(lx, 13, '#d8b050');
      return LB.outline(cv, 'sel');
    });
  }
  const DOOR_LANTERNS = (() => { const B = TRUNKS[2]; return [[B.x - 26, B.y - 34], [B.x + 26, B.y - 34]]; })();
  // the foreground: big dark fronds in the bottom corners, very close to the camera
  function foreSprite(side, season) {
    return LB.memo(`sylv-fore:${side}:${season}`, () => {
      const cv = LB.canvas(140, 92), P = LB.paint(LB.ctx2d(cv));
      const base = season === 'autumn' ? '#3a2a1c' : season === 'winter' ? '#1c2a2a' : '#16261c';
      const R = ramp(base, 4, 1, { light: 0.18 });
      const rnd = LB.rng(side > 0 ? 3 : 9);
      const ox = side < 0 ? 0 : 140, oy = 96;
      for (let k = 0; k < 7; k++) {
        const a = side < 0 ? -0.2 - k * 0.22 - rnd() * 0.1 : -Math.PI + 0.2 + k * 0.22 + rnd() * 0.1;
        const len = 60 + rnd() * 44;
        for (let s = 0; s < len; s++) {
          const t = s / len;
          const x = ox + Math.cos(a) * s, y = oy + Math.sin(a) * s * 0.8 + t * t * 18;
          P.disc(x, y, 1, R[0]);
          if (s % 3 === 0 && t > 0.08) {
            const ll = Math.max(2, Math.round((1 - t) * 9));
            const nx = -Math.sin(a), ny = Math.cos(a) * 0.8;
            P.line(x, y, x + nx * ll + 2, y + ny * ll + ll * 0.5, R[1]);
            P.line(x, y, x - nx * ll + 2, y - ny * ll + ll * 0.5, R[0]);
            P.px(x + nx * ll * 0.5, y + ny * ll * 0.5 - 1, R[2]); if (t < 0.6) P.px(x + nx * ll * 0.8, y + ny * ll * 0.8, R[2]);
          }
        }
      }
      return cv;
    });
  }

  // ---------- ground ----------
  const TUFTS = [
    ['l...l', '.l.l.', '.dLd.'],
    ['l.l', 'dLd'],
    ['.l..', 'lLl.', '.dd.'],
  ];
  function groundBase(season, sl, wet) {
    return LB.memo(`sylv-g:${season}:${sl}:${wet}`, () => {
      const g = geo(), sea = SEAS[season];
      const cv = LB.canvas(W, H), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const id = ctx.createImageData(W, H), d = id.data;
      const moss = ramp(sea.moss, 7, 3, { light: 0.16, dark: 0.26 }).map(LB.rgb), soil = ramp(sea.soil, 6, 3, { light: 0.14, dark: 0.24 }).map(LB.rgb);
      const pathR = ramp('#7c5e42', 6, 3, { light: 0.16, dark: 0.22 }).map(LB.rgb), snowR = ramp('#e9eff9', 7, 5, { cool: 228, dark: 0.22 }).map(LB.rgb), trod = ramp('#cdd6e8', 7, 5, { cool: 228, dark: 0.22 }).map(LB.rgb);
      const bedS = LB.rgb('#a08c6a'), bedM = LB.rgb('#66705a'), bedD = LB.rgb('#36504a');
      const k = wet ? 0.8 : 1;
      const snowAt = (i, x, y) => {
        if (sl === 2) return g.root[i] > 0.9 + (LB.noise(x * 0.2, y * 0.2, 4) - 0.5) * 0.4;
        if (sl === 1) return g.lm[i] * 0.6 + (LB.fbm(x * 0.09, y * 0.12, 12, 2) - 0.5) * 1.1 + (LB.hash(x, y, 13) - 0.5) * 0.12 > 0.3;
        return false;
      };
      const cov = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, b = g.band[i];
        let c;
        const dep = g.depth[i];
        if (dep >= 0) c = dep < 0.3 ? bedS : dep < 0.62 ? bedM : bedD;
        else if (snowAt(i, x, y)) {
          cov[i] = 1;
          c = g.path[i] ? trod[1 + b] : snowR[1 + b];
        } else if (g.path[i]) c = pathR[Math.min(5, b)];
        else if (g.soil[i]) c = soil[Math.min(5, b)];
        else c = moss[1 + b];
        const o = i * 4;
        d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k; d[o + 3] = 255;
      }
      // relief at every edge: a light lip on the upper material, a shadow under it
      const out = new Uint8ClampedArray(d);
      const kind = (x, y) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return -1;
        const i = y * W + x;
        if (g.depth[i] >= 0) return 0;
        if (cov[i]) return g.path[i] ? 4 : 5;
        if (g.path[i]) return 3;
        return g.soil[i] ? 1 : 2;
      };
      const tint = (o, f) => { out[o] = clamp(out[o] * f, 0, 255); out[o + 1] = clamp(out[o + 1] * f, 0, 255); out[o + 2] = clamp(out[o + 2] * (f > 1 ? f * 0.98 : f * 1.04), 0, 255); };
      const earth = soil.map((c) => c.map((v) => v * k)).slice(0, 3);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, me = kind(x, y), up = kind(x, y - 1), dn = kind(x, y + 1);
        if (me === 0) {
          // the far bank's earth face drops into the water; a dark wet line along the sides
          if (up > 0) { for (let j = 0; j < 3; j++) { const oo = ((y + j) * W + x) * 4; if (y + j < H && g.depth[(y + j) * W + x] >= 0) { const c = earth[[2, 1, 0][j]]; out[oo] = c[0]; out[oo + 1] = c[1]; out[oo + 2] = c[2]; } } }
          else if (kind(x - 1, y) > 0 || kind(x + 1, y) > 0) tint(o, 0.78);
          continue;
        }
        if (dn === 0) { tint(o, 1.18); continue; } // the near bank's lip
        if ((me === 2 || me === 5) && (dn === 1 || dn === 3 || dn === 4)) tint(o, 1.14); // moss/snow over soil or path
        else if ((me === 1 || me === 3 || me === 4) && (up === 2 || up === 5)) tint(o, 0.8); // shadow under it
      }
      id.data.set(out);
      ctx.putImageData(id, 0, 0);

      // marks: tufts, clover, leaves, twigs, pebbles — scattered by rules, not noise
      const mossH = ramp(sea.moss, 7, 3, { light: 0.16, dark: 0.26 });
      const stoneR = STONE();
      for (let gy = 0; gy < H; gy += 5) for (let gx = 0; gx < W; gx += 5) {
        const h1 = LB.hash(gx, gy, 41), h2 = LB.hash(gx, gy, 42), h3 = LB.hash(gx, gy, 43);
        const x = gx + Math.floor(h2 * 4), y = gy + Math.floor(h3 * 4);
        if (x >= W || y >= H) continue;
        const i = y * W + x, kd = kind(x, y);
        if (kd === 0) continue;
        const b = g.band[i];
        if (kd === 5 || kd === 4) {
          // snow: blue dimples, a twig poking through, a few leaves, glitter
          if (h1 < 0.05) P.rect(x, y, 2, 1, LB.hex(snowR[1]));
          else if (h1 < 0.08) { P.px(x, y, '#5a4636'); P.px(x, y - 1, '#6e5644'); }
          else if (h1 < 0.1) P.px(x, y, '#ffffff');
          else if (h1 < 0.11) P.px(x, y, sea.litter[0]);
          continue;
        }
        if (kd === 3) { // the path: pebbles and the odd leaf
          if (h1 < 0.035) stamp(P, x, y, ['ab', 'bc'], { a: stoneR[3], b: stoneR[2], c: stoneR[1] });
          else if (h1 < 0.08 + sea.litterN * 0.6) P.rect(x, y, 2, 1, sea.litter[Math.floor(h2 * sea.litter.length)]);
          continue;
        }
        const near = g.root[i] < 1.6 ? 0.18 : 0;
        const pal = { l: mossH[Math.min(6, b + 3)], L: mossH[Math.min(6, b + 4)], d: mossH[Math.max(0, b)], c: mossH[Math.min(6, b + 3)], C: mossH[Math.min(6, b + 4)] };
        let p = h1;
        if (sea.litterN && (p -= sea.litterN) < 0) {
          const c = sea.litter[Math.floor(h2 * sea.litter.length)];
          stamp(P, x, y, h3 < 0.5 ? ['.c', 'cd'] : ['cc'], { c, d: LB.shade(c, -0.5) });
          continue;
        }
        if (kd === 1) { // bare soil: pebbles, twigs
          if ((p -= 0.06) < 0) stamp(P, x, y, ['ab', 'bc'], { a: stoneR[3], b: stoneR[2], c: stoneR[1] });
          else if ((p -= 0.05) < 0) { P.line(x, y, x + 3, y + (h3 < 0.5 ? 1 : -1), '#4a3424'); P.px(x, y, '#7a5a3e'); }
          else if ((p -= 0.12 + near) < 0) stamp(P, x, y, TUFTS[1], pal);
          continue;
        }
        if ((p -= 0.22 + near + (b >= 3 ? 0.08 : 0)) < 0) stamp(P, x, y, TUFTS[Math.floor(h2 * 3)], pal);
        else if ((p -= season === 'spring' || season === 'summer' ? 0.05 : 0.01) < 0) stamp(P, x, y, ['.c.', 'cCc', '.d.'], pal);
        else if ((p -= 0.03) < 0) { P.line(x, y, x + 3, y + 1, '#4a3424'); P.px(x + 1, y, '#7a5a3e'); }
        else if ((p -= 0.02) < 0) stamp(P, x, y, ['ab', 'bc'], { a: stoneR[3], b: stoneR[2], c: stoneR[1] });
      }
      // wildflowers, in clumps of one kind
      if (sea.flowers.length && sl < 2) {
        for (let f = 0; f < FLOWERS.length; f++) {
          const [fx, fy] = FLOWERS[f];
          const rnd = LB.rng(f * 19 + 2);
          const col = sea.flowers[f % sea.flowers.length];
          const n = season === 'autumn' ? 3 : 7;
          for (let j = 0; j < n; j++) {
            const x = Math.round(fx + (rnd() - 0.5) * 14), y = Math.round(fy + (rnd() - 0.5) * 9);
            if (kind(x, y) !== 2 && kind(x, y) !== 1) continue;
            P.px(x, y + 1, mossH[2]); P.px(x + 1, y + 2, mossH[1]);
            if (rnd() < 0.45) { P.px(x - 1, y, col); P.px(x + 1, y, col); P.px(x, y - 1, col); P.px(x, y + 1, LB.shade(col, -0.4)); P.px(x, y, '#f8e070'); }
            else { P.px(x, y, col); P.px(x, y - 1, LB.shade(col, 0.4)); }
          }
        }
      }
      // flagstones along the path
      if (sl < 2) {
        const S = STONE(), Mo = ramp(sea.moss, 5, 2);
        let acc = 0;
        for (let k2 = 1; k2 + 1 < PATH.length; k2++) {
          const a = PATH[k2], b = PATH[k2 + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          for (let s = (14 - acc) % 14; s < L; s += 14) {
            const t = s / L, n = k2 * 31 + Math.round(s);
            if (LB.hash(n, 1, 77) < 0.3) continue;
            const off = (LB.hash(n, 2, 77) - 0.5) * 6;
            const x = a[0] + (b[0] - a[0]) * t - ((b[1] - a[1]) / L) * off, y = a[1] + (b[1] - a[1]) * t + ((b[0] - a[0]) / L) * off;
            if (g.isW(Math.round(x), Math.round(y))) continue;
            const r = 4.5 + LB.hash(n, 3, 77) * 2;
            P.blob(x + 1, y + 1, r, S[0], n, 0.22, 0.7);
            P.blob(x, y, r, S[2], n, 0.22, 0.7);
            P.blob(x - r * 0.3, y - r * 0.3, r * 0.5, S[3], n + 1, 0.25, 0.7);
            if (LB.hash(n, 4, 77) < 0.5) { P.px(x + r, y - 1, Mo[3]); P.px(x - r, y + 1, Mo[2]); }
          }
          acc = (acc + L) % 14;
        }
      }
      // the shallow bed: pebbles you see through the water
      const peb = ['#b8a888', '#8a8a96', '#a08060', '#6e7480', '#c8b898'];
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
        const dep = g.depth[y * W + x];
        if (dep < 0) continue;
        const h = LB.hash(x, y, 51);
        if (dep < 0.32 ? h < 0.42 : dep < 0.6 ? h < 0.1 : false) {
          const c = peb[Math.floor(LB.hash(x, y, 52) * peb.length)];
          const big = LB.hash(x, y, 53) < 0.4;
          P.rect(x, y, big ? 2 : 1, 1, c);
          if (big) { P.px(x, y + 1, LB.shade(c, -0.6)); P.px(x + 1, y + 1, LB.shade(c, -0.5)); P.px(x, y, LB.shade(c, 0.4)); }
        }
      }
      // rain: puddles on the path
      if (wet) {
        for (let k2 = 0; k2 < 9; k2++) {
          const [x, y] = [[60, 244], [118, 233], [258, 207], [300, 201], [350, 186], [160, 223], [90, 238], [384, 172], [236, 212]][k2];
          if (g.isW(x, y)) continue;
          P.ellipse(x, y, 5 + (k2 % 3), 2, '#3e4c5a'); P.ellipse(x - 1, y - 1, 3 + (k2 % 3), 1, '#6a7e92'); P.px(x - 3, y - 1, '#a8bed2');
        }
      }
      // winter: footprints along the path
      if (sl === 2) {
        let s0 = 0;
        for (let k2 = 0; k2 + 1 < PATH.length; k2++) {
          const a = PATH[k2], b = PATH[k2 + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          for (let s = 0; s < L; s += 6) {
            const t = s / L, side = ((s0 + s) / 6) % 2 < 1 ? 1 : -1;
            const x = a[0] + (b[0] - a[0]) * t - ((b[1] - a[1]) / L) * side * 2, y = a[1] + (b[1] - a[1]) * t + ((b[0] - a[0]) / L) * side * 2;
            if (g.isW(Math.round(x), Math.round(y))) continue;
            P.rect(x, y, 2, 1, LB.hex(trod[1]));
          }
          s0 += L;
        }
      }
      return cv;
    });
  }

  // ---------- water ----------
  function iceThr(S, i) { return winterish(S) ? (G.depth[i] < 0.34 ? 1 : 0) : 0; }
  let wtKey = '', wtCv = null;
  function waterTint(S) {
    const g = geo(), win = winterish(S);
    const key = `${S.season}:${S.weather}:${Math.round(S.time * 4)}`;
    if (key === wtKey) return wtCv;
    wtKey = key;
    return (wtCv = (() => {
      const cv = LB.canvas(W, H), c = LB.ctx2d(cv), id = c.createImageData(W, H), d = id.data;
      const deep = LB.rgb('#1a4446'), shallow = LB.rgb('#5a9a8a');
      const leaf = LB.rgb(ramp(SEAS[S.season].leaf, 6, 3)[1]);
      const sky = LB.rgb(LB.mix(S.L.skyHor, S.L.skyTop, 0.4));
      const iceR = ['#9ab4d0', '#c4d8ea', '#dce8f4', '#f2f8ff'].map(LB.rgb);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, dep = g.depth[i];
        if (dep < 0) continue;
        const o = i * 4;
        if (win && dep < 0.34) {
          // ice shelf: frosted, a bright rim where it meets the open water, a darker line inside it
          const inner = g.depth[i + 1] >= 0.34 || g.depth[i - 1] >= 0.34;
          const c = inner ? iceR[3] : dep > 0.27 ? iceR[0] : LB.hash(x, y, 8) < 0.04 ? iceR[0] : (dep < 0.1 ? iceR[3] : iceR[2]);
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
          continue;
        }
        let r = lerp(shallow[0], deep[0], dep), gg = lerp(shallow[1], deep[1], dep), b = lerp(shallow[2], deep[2], dep);
        // under the canopy the water mostly mirrors leaves; where the canopy opens, it mirrors the sky
        const gap = LB.fbm(x / 22, y / 10, 33, 2);
        const sk = smooth(0.56, 0.64, gap) * 0.5 * dep;
        r = lerp(lerp(r, leaf[0], 0.22), sky[0], sk); gg = lerp(lerp(gg, leaf[1], 0.22), sky[1], sk); b = lerp(lerp(b, leaf[2], 0.22), sky[2], sk);
        const a = clamp(0.16 + 0.78 * Math.pow(dep, 0.85) + sk * 0.3, 0, 0.95);
        // stepped, so it reads as pixel bands rather than airbrush
        d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = Math.round(a * 6) / 6 * 255;
      }
      c.putImageData(id, 0, 0);
      return cv;
    })());
  }
  function reflMask(S) {
    const g = geo(), win = winterish(S);
    return LB.memo(`sylv-rm:${win}`, () => {
      const cv = LB.canvas(W, H), c = LB.ctx2d(cv), id = c.createImageData(W, H);
      for (let i = 0; i < W * H; i++) {
        const dep = g.depth[i];
        if (dep < 0 || (win && dep < 0.34)) continue;
        id.data[i * 4 + 3] = Math.round(smooth(0.12, 0.55, dep) * 3) / 3 * 255;
      }
      c.putImageData(id, 0, 0);
      return cv;
    });
  }
  // mirror standing things about the top of each column's run of water
  function mirrorRuns(src) {
    const g = geo(), out = LB.canvas(W, H), c = LB.ctx2d(out);
    for (const [x, y0, y1] of g.runs) {
      const len = Math.min(y1 - y0 + 1, y0);
      if (len <= 0) continue;
      c.save(); c.translate(0, 2 * y0); c.scale(1, -1);
      c.drawImage(src, x, y0 - len, 1, len, x, y0 - len, 1, len);
      c.restore();
    }
    return out;
  }
  let reflSrc = null, reflKey = '', mirCv = null, mirKey = '';
  function flowMarks(ctx, S, P) {
    const g = geo(), win = winterish(S);
    ctx.save();
    for (let i = 0; i < 90; i++) {
      const lane = (LB.hash(i, 1, 61) * 2 - 1) * 0.8, ph = LB.hash(i, 2, 61);
      const tt = (ph * g.tauMax + S.t * (win ? 0.6 : 1)) % g.tauMax;
      let lo = 0, hi = H + 39;
      while (lo < hi) { const m = (lo + hi) >> 1; if (g.tau[m] < tt) lo = m + 1; else hi = m; }
      const y = lo;
      if (y >= H || (y > CASCADE_Y - 3 && y < CASCADE_Y + 14)) continue;
      const c = g.cx[y], hw = lane < 0 ? c - g.xl[y] : g.xr[y] - c, x = Math.round(c + lane * hw);
      const dep = g.depth[y * W + x];
      if (!(dep >= 0) || (win && dep < 0.4)) continue;
      const slope = (g.cx[Math.min(H - 1, y + 3)] - c) / 3;
      const len = 2 + Math.floor(LB.hash(i, 3, 61) * 3) * (1 - smooth(18, 34, (g.xr[y] - g.xl[y]) / 2) * 0.6);
      ctx.globalAlpha = 0.3 + 0.3 * LB.hash(i, 4, 61);
      P.line(x, y, x + slope * len, y + len, dep < 0.3 ? '#e8f8f0' : '#b8e2dc');
    }
    ctx.restore();
  }
  function cascade(ctx, S, P) {
    const g = geo(), y0 = CASCADE_Y + 4, f = Math.floor(S.t * 10), win = winterish(S);
    for (let y = y0; y < y0 + 11; y++) {
      const a = Math.ceil(g.xl[y]), b = Math.floor(g.xr[y]), c = g.cx[y], hw = (b - a) / 2;
      for (let x = a; x <= b; x++) {
        if (win && Math.abs(x - c) > hw * 0.55) continue;
        const h = LB.hash(x, y * 7 + f, 71), k = (y - y0) / 11;
        if (y < y0 + 4) P.px(x, y, (LB.hash(x, f + y, 72) > 0.4) ? '#f4fcff' : '#a8dce0');
        else if (h > 0.3 + k * 0.62) P.px(x, y, h > 0.82 ? '#ffffff' : '#cfeeee');
      }
    }
    // spray
    for (let i = 0; i < 6; i++) {
      const k = (S.t * 1.6 + i / 6) % 1, x = g.cx[y0] + (LB.hash(i, Math.floor(S.t * 1.6 + i / 6), 5) - 0.5) * 18;
      P.px(x, y0 + 2 - Math.sin(k * Math.PI) * 4, '#ffffff');
    }
  }

  // ---------- people & motion ----------
  const WALK = (() => {
    const pts = PATH.slice(2, 11);
    const seg = [];
    let total = 0;
    for (let i = 0; i + 1 < pts.length; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push([pts[i], pts[i + 1], total, l]); total += l; }
    return { seg, total };
  })();
  function walker(t) {
    const period = (WALK.total / 15) * 2;
    let u = ((t % period) + period) % period / period * 2, back = false;
    if (u > 1) { u = 2 - u; back = true; }
    let s = u * WALK.total;
    for (const [a, b, s0, l] of WALK.seg) {
      if (s <= s0 + l) {
        const k = (s - s0) / l, dx = (b[0] - a[0]) * (back ? -1 : 1), dy = (b[1] - a[1]) * (back ? -1 : 1);
        const dir = Math.abs(dx) > Math.abs(dy) * 1.1 ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dir };
      }
    }
    const last = WALK.seg[WALK.seg.length - 1][1];
    return { x: last[0], y: last[1], dir: 'down' };
  }
  function rayGeom(S) {
    const L = S.L;
    const ang = clamp(L.sun.dx / Math.max(0.3, L.sun.dy), -1.4, 1.4) * 0.42;
    return GAPS.map((gx, i) => {
      const top = canopyBottom(gx) - 4, len = [150, 132, 118][i];
      return { gx, top, len, ang, w: [13, 16, 11][i], land: [gx + len * ang, top + len] };
    });
  }
  const sunOn = (S) => S.L.day * smooth(0.02, 0.22, S.L.sunElev) * (S.weather === 'clear' ? 1 : S.weather === 'fog' ? 0.5 : 0.12);
  const DAPPLES = [[300, 220, 8], [238, 244, 5], [342, 240, 6], [200, 184, 4], [384, 216, 5], [130, 216, 4], [272, 182, 4], [424, 200, 6], [168, 240, 4], [96, 196, 3], [440, 232, 4]];
  function mistTex() {
    return LB.memo('sylv-mist', () => {
      const cv = LB.canvas(W, H), c = LB.ctx2d(cv), id = c.createImageData(W, H);
      const sc = 1 / 48, period = Math.round(W * sc);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = LB.fbm(x * sc, y * sc * 2, 15, 3, period);
        const a = Math.round(smooth(0.4, 0.72, n) * 3) / 3;
        const i = (y * W + x) * 4;
        id.data[i] = 238; id.data[i + 1] = 242; id.data[i + 2] = 246; id.data[i + 3] = a * 255;
      }
      c.putImageData(id, 0, 0);
      return cv;
    });
  }
  function mist(ctx, S) {
    const t = S.time;
    let amt = smooth(4.4, 6.2, t) * (1 - smooth(8.4, 10.2, t)) * 0.55 + smooth(19.6, 21.5, t) * 0.25 * (t > 12 ? 1 : 0);
    if (S.weather === 'fog') amt += 0.2; else if (S.weather === 'rain') amt += 0.12;
    if (S.season === 'winter') amt *= 1.2;
    if (amt < 0.03) return;
    const tex = mistTex();
    const tmp = LB.memo('sylv-misttmp', () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
    const off = Math.round(((S.t * 3) % W + W) % W);
    tc.drawImage(tex, -off, 0); tc.drawImage(tex, W - off, 0);
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(geo().mistMask, 0, 0);
    ctx.save(); ctx.globalAlpha = clamp(amt, 0, 0.6); ctx.drawImage(tmp, 0, 0); ctx.restore();
  }
  function vines(ctx, S, P) {
    const sea = SEAS[S.season];
    const leafC = S.season === 'winter' ? null : S.season === 'autumn' ? ['#c8822e', '#e8b048'] : [ramp(sea.leaf, 6, 3)[2], ramp(sea.leaf, 6, 3)[4]];
    VINES.forEach(([vx, len], k) => {
      const y0 = canopyBottom(vx) - 6;
      for (let s = 0; s < len; s++) {
        const sw = Math.sin(S.t * 0.9 + k * 1.7) * 1.6 * (s / len) ** 1.5;
        const x = vx + Math.round(sw + Math.sin(s * 0.3 + k) * 0.6), y = y0 + s;
        P.px(x, y, '#2e4628');
        if (leafC && s % 4 === 1) { const side = (s >> 2) % 2 ? 1 : -1; P.px(x + side, y, leafC[0]); P.px(x + side * 2, y + 1, leafC[1]); P.px(x + side, y + 1, leafC[0]); }
        if (!leafC && s % 5 === 2 && S.snow >= 1) P.px(x + 1, y, '#e8f0fa');
      }
    });
  }
  function butterflies(ctx, S, P) {
    if (!(S.season === 'spring' || S.season === 'summer') || S.L.day < 0.6 || S.weather !== 'clear') return;
    [[318, 222, '#f8f4e0'], [286, 236, '#f4d050']].forEach(([bx, by, c], k) => {
      const x = bx + Math.sin(S.t * 0.7 + k * 3) * 18 + Math.sin(S.t * 1.9 + k) * 4, y = by + Math.sin(S.t * 1.1 + k) * 8 - 6;
      const open = Math.floor(S.t * 8 + k) % 2 === 0;
      P.px(x, y, '#3a2a20');
      if (open) { P.px(x - 1, y - 1, c); P.px(x + 1, y - 1, c); P.px(x - 2, y - 1, c); P.px(x + 2, y - 1, c); P.px(x - 1, y, c); P.px(x + 1, y, c); }
      else { P.px(x - 1, y - 1, c); P.px(x + 1, y - 1, c); }
    });
  }
  function notes(ctx, S, P) {
    // the bard's song: little notes drifting up
    for (let i = 0; i < 3; i++) {
      const k = (S.t * 0.45 + i / 3) % 1;
      const x = 104 + Math.sin(k * 6 + i) * 4 + i * 3, y = 180 - k * 26;
      ctx.save(); ctx.globalAlpha = 1 - k;
      const c = '#fff4d8';
      P.px(x, y, c); P.px(x + 1, y, c); P.px(x + 1, y - 1, c); P.px(x + 1, y - 2, c); P.px(x + 1, y - 3, c); P.px(x + 2, y - 3, c);
      ctx.restore();
    }
  }

  // ---------- the scene ----------
  LB.add({
    id: 'sylvara', order: 40, section: 'place', world: 'Sylvara', name: 'Elderglade Brook',
    now: 'sylvara.png',
    blurb: 'The wood elves\' forest, where the light does most of the work. Giant trees close over the top of the frame, sunlight falls through the gaps, and a brook runs through the glade past the elves\' door.',
    see: [
      'Shafts of sunlight through gaps in the canopy, landing as warm patches on the ground. They swing with the sun through the day and turn orange at golden hour.',
      'The brook: pebbles showing through the shallow edges, the trees mirrored in the pool, a small waterfall over a log, mist on it in the early morning.',
      'Leaves framing the top and the corners, so the glade feels deep. In HD-2D they blur like a camera lens.',
      'A calm forest floor of moss and soil with small placed marks (tufts, leaves, pebbles, flagstones) instead of noise. Every edge has a light lip or a soft shadow, so the ground has shape.',
      'At night the lanterns, the door and the glowing mushrooms light the glade, and fireflies come out in summer.',
    ],
    build: 'The light shafts, drifting sun patches, mist and the moving brook are drawn live by the engine, the way the game already draws the Lumar sea. The canopy, trunks and plants would be redrawn as pixel sprites in four seasons and placed by the scene scripts. About one world\'s worth of work.',
    w: W, h: H,
    clouds: { alpha: 0.1, speed: 2 },
    init() { geo(); },
    ground(ctx, S) { ctx.drawImage(groundBase(S.season, snowLevel(S), S.wet ? 1 : 0), 0, 0); },
    shadows(sh, S) {
      const sl = snowLevel(S);
      const sun = S.L.sun, sp = LB.paint(sh.ctx);
      for (const T of TRUNKS) {
        const len = T.h * 0.55, w0 = T.w * 0.42, w1 = T.w * 0.3;
        const ex = T.x + sun.dx * len, ey = T.y + sun.dy * len;
        sp.poly([[T.x - w0, T.y - 3], [T.x + w0, T.y - 3], [ex + w1, ey], [ex - w1, ey]], '#000');
        sp.ellipse(ex, ey, w1, w1 * 0.55, '#000');
      }
      for (const [x, y, r, seed] of BOULDERS) sh.cast(boulderSprite(r, seed, S.season, sl), x, y);
      for (const [x, y, id] of BIRCHES) { sh.pole(x, y, 50, 3); sh.cast(birchSprite(id, S.season, sl), x, y, null, null, { lift: 0 }); }
      for (const [x, y, seed] of FERNS) if (sl < 2 || seed % 3 === 0) sh.cast(fernSprite(seed, S.season, sl), x, y + 2);
      sh.cast(logSprite(LOG.x1 - LOG.x0, S.season, sl, false), (LOG.x0 + LOG.x1) / 2, LOG.y);
      for (const [x, y, side] of LAMPS) sh.cast(lampSprite(side), x, y);
    },
    water(ctx, S, P) {
      const g = geo();
      ctx.drawImage(waterTint(S), 0, 0);
      if (reflSrc) {
        if (mirKey !== reflKey) { mirCv = mirrorRuns(reflSrc); mirKey = reflKey; }
        LB.ripple(ctx, mirCv, reflMask(S), S, { amp: 1, freq: 0.5, speed: 1.6, alpha: 0.4, slot: 'sylv' });
      }
      flowMarks(ctx, S, P);
      cascade(ctx, S, P);
      const win = winterish(S);
      const open = (p) => !win || g.depth[p[1] * W + p[0]] >= 0.36;
      if (S.L.day > 0.3 || S.L.night > 0.6) LB.glints(ctx, g.glintPts.filter(open), S, { rate: 1.1 });
      const on = sunOn(S);
      if (on > 0.05) {
        const col = LB.mix('#fffbe8', '#ffd08a', S.L.golden);
        for (const r of rayGeom(S)) {
          for (const [x, y, ph] of g.glintPts) {
            if (!open([x, y]) || Math.abs(x - r.land[0]) > r.w * 1.6 || Math.abs(y - r.land[1]) > r.w * 1.4) continue;
            const v = Math.sin(S.t * 2.2 * (0.6 + ph) + ph * 40);
            if (v > 0.55) { P.px(x, y, col); if (v > 0.9) { P.px(x - 1, y, col); P.px(x + 1, y, col); } }
          }
        }
      }
      if (S.weather === 'rain') LB.rings(ctx, g.ringPts.filter(open), S, { period: 1.1, r: 5, alpha: 0.6 });
      else if (S.weather === 'clear' && !win) LB.rings(ctx, g.fishPts, S, { period: 5.5, r: 6, alpha: 0.5 });
    },
    objects(ctx, S, P) {
      const sl = snowLevel(S);
      const items = [];
      for (const T of TRUNKS) items.push({ y: T.y, draw: () => { const spr = trunkSprite(T, S.season, sl); LB.blit(ctx, spr, T.x, T.y, Math.round(T.w * 0.8 + T.w / 2), T.h); } });
      for (const [x, y, r, seed] of BOULDERS) items.push({ y, draw: () => { LB.contact(ctx, x, y - 1, r + 1, 3, 0.3); LB.blit(ctx, boulderSprite(r, seed, S.season, sl), x, y + 3); } });
      for (const [x, y, id] of BIRCHES) items.push({ y, draw: () => { LB.contact(ctx, x, y - 1, 4, 1, 0.3); LB.blit(ctx, birchSprite(id, S.season, sl), x, y); } });
      for (const [x, y, seed] of FERNS) if (sl < 2 || seed % 3 === 0) items.push({ y, draw: () => LB.blit(ctx, fernSprite(seed, S.season, sl), x, y + 2) });
      for (const [x, y, kind] of MUSH) if (!(sl === 2 && kind !== 'glow')) items.push({ y, draw: () => LB.blit(ctx, mushSprite(kind, x + y, sl), x, y + 1) });
      for (const [x, y] of PLANTS) items.push({ y, draw: () => LB.blit(ctx, plantSprite(x), x, y + 1) });
      items.push({ y: LOG.y, draw: () => { LB.contact(ctx, (LOG.x0 + LOG.x1) / 2, LOG.y - 2, (LOG.x1 - LOG.x0) / 2 + 2, 3, 0.35); LB.blit(ctx, logSprite(LOG.x1 - LOG.x0, S.season, sl, false), (LOG.x0 + LOG.x1) / 2, LOG.y + 1); LB.blit(ctx, mushSprite('tan', 5, sl), LOG.x0 + 8, LOG.y - 9); } });
      const g = geo();
      const cy = CASCADE_Y, clen = Math.round(g.xr[cy] - g.xl[cy]) + 16;
      items.push({ y: cy, draw: () => LB.blit(ctx, logSprite(clen, S.season, sl, true), g.cx[cy], cy + 4) });
      for (const [x, y, w] of STONES) items.push({ y, draw: () => LB.blit(ctx, stoneSprite(w, x, sl), x, y + 2) });
      for (const [x, y, side] of LAMPS) items.push({ y, draw: () => LB.blit(ctx, lampSprite(side), x, y) });
      items.push({ y: TRUNKS[2].y + 0.5, draw: () => {
        for (const [lx, ly] of DOOR_LANTERNS) {
          const side = lx < TRUNKS[2].x ? 1 : -1;
          P.hline(lx, lx + side * 5, ly - 4, '#2e2a2a'); P.vline(lx, ly - 4, ly - 2, '#3a3a40');
          P.rect(lx - 2, ly - 2, 5, 1, '#4a3a24'); P.rect(lx - 2, ly - 1, 5, 7, '#9a7838'); P.rect(lx - 1, ly, 3, 5, '#e2cc98'); P.rect(lx - 2, ly + 6, 5, 1, '#4a3a24');
        }
      } });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw();
      // what the water mirrors: everything standing so far, plus the canopy
      ctx.drawImage(canopySprite(S.season, sl), 0, 0);
      const key = S.season + ':' + sl + ':' + S.weather + ':' + Math.round(S.time * 4);
      if (key !== reflKey || !reflSrc) {
        reflSrc = reflSrc || LB.canvas(W, H);
        const rc = LB.ctx2d(reflSrc);
        rc.fillStyle = LB.mix(LB.mix(S.L.skyHor, S.L.skyTop, 0.45), '#1a3a34', 0.3); rc.fillRect(0, 0, W, H);
        rc.drawImage(ctx.canvas, 0, 0);
        reflKey = key;
      }
    },
    live(ctx, S, P) {
      const g = geo();
      // sun patches: where each shaft lands, plus small ones swaying with the leaves
      const on = sunOn(S);
      if (on > 0.03) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const col = LB.mix('#fff0c0', '#ffb070', S.L.golden);
        const spots = DAPPLES.map(([x, y, r], i) => [x + Math.round(Math.sin(S.t * 0.35 + i) * 1.5), y + Math.round(Math.cos(S.t * 0.3 + i * 2) * 1), r]);
        for (const rg of rayGeom(S)) spots.push([Math.round(rg.land[0]), Math.round(rg.land[1]), Math.round(rg.w * 0.55)]);
        for (const [x, y, r] of spots) {
          ctx.globalAlpha = 0.14 * on; P.ellipse(x, y, r, r * 0.5, col);
          ctx.globalAlpha = 0.12 * on; P.ellipse(x - 1, y, r * 0.6, r * 0.3, col);
        }
        const gl = on * S.L.golden;
        if (gl > 0.05) {
          const ang = rayGeom(S)[1].ang;
          for (const [k, al] of [[1, 0.05], [0.72, 0.05], [0.45, 0.06]]) { ctx.globalAlpha = al * gl; P.ellipse(282 + ang * 40, 214, 150 * k, 46 * k, col); }
        }
        ctx.restore();
      }
      // water running over the cascade log, foam on the stepping stones
      const f = Math.floor(S.t * 6);
      const cy = CASCADE_Y;
      for (let x = Math.ceil(g.xl[cy]) + 1; x < g.xr[cy] - 1; x++) if (LB.hash(x, f, 3) > 0.35) P.px(x, cy - 3, '#d8f2f4');
      if (S.season !== 'winter') for (const [x, y, w] of STONES) for (let i = -w / 2; i <= w / 2; i++) if (LB.hash(x + i, f, 9) > 0.45) P.px(x + i, y - 5 + (Math.abs(i) > w / 2 - 2 ? 1 : 0), '#e8f6f6');
      vines(ctx, S, P);
      butterflies(ctx, S, P);
      // people: an elf walking the path, the bard on the log
      const wk = walker(S.t);
      const people = [
        { y: 205, draw: () => LB.person(ctx, 104, 208, 'elf-bard', { sit: true, dir: 'down', t: S.t, seed: 5 }) },
        { y: wk.y, draw: () => LB.person(ctx, Math.round(wk.x), Math.round(wk.y), 'elf', { dir: wk.dir, walk: true, t: S.t, seed: 3 }) },
      ];
      people.sort((a, b) => a.y - b.y).forEach((p) => p.draw());
      notes(ctx, S, P);
      // falling leaves and petals
      if (S.season === 'autumn') LB.motes(ctx, S, { fall: 9, n: 26, colors: SEAS.autumn.litter, seed: 4, size: 2 });
      if (S.season === 'spring') LB.motes(ctx, S, { fall: 6, n: 10, colors: ['#f8d0dc', '#fff0f4'], seed: 6, x: 260, w: 140, h: 220 });
      mist(ctx, S);
      // the foreground fronds, closest to the camera
      ctx.drawImage(foreSprite(-1, S.season), 0, H - 92);
      ctx.drawImage(foreSprite(1, S.season), W - 140, H - 92);
    },
    emissive(ctx, S, P) {
      const e = smooth(0.18, 0.62, S.L.night);
      if (e < 0.02) return;
      const fl = (k) => 0.85 + 0.15 * Math.sin(S.t * 9 + k * 3) * Math.sin(S.t * 5.3 + k);
      ctx.save();
      ctx.globalAlpha = e;
      // lanterns
      for (const [lx, ly] of DOOR_LANTERNS) { P.rect(lx - 1, ly, 3, 5, '#ffcf6e'); P.px(lx, ly + 2 + (Math.sin(S.t * 11 + lx) > 0.5 ? 0 : 1), '#fff8d8'); }
      LAMPS.forEach(([x, y, side], k) => { const gx = x + side * 6 - 1, gy = y - 54 + 16; P.rect(gx, gy, 3, 5, '#ffcf6e'); ctx.globalAlpha = e * fl(k); P.px(gx + 1, gy + 2, '#fff8d8'); ctx.globalAlpha = e; });
      // the door's windows
      const D = DOOR_POS();
      P.disc(D.win[0], D.win[1], 3, '#ffc464'); P.px(D.win[0] - 1, D.win[1] - 1, '#fff0c0');
      P.disc(D.round[0], D.round[1], 4, '#ffd27a');
      P.vline(D.round[0], D.round[1] - 4, D.round[1] + 4, '#a07040'); P.hline(D.round[0] - 4, D.round[0] + 4, D.round[1], '#a07040');
      // runes round the door, pulsing
      const pulse = 0.55 + 0.45 * Math.sin(S.t * 1.3);
      ctx.globalAlpha = e * pulse;
      for (const [rx, ry] of [[-17, -8], [-18, -20], [-15, -34], [17, -8], [18, -20], [15, -34]]) { P.vline(D.x + rx, D.y + ry, D.y + ry + 2, '#7af0e8'); P.px(D.x + rx + (rx < 0 ? 1 : -1), D.y + ry + 1, '#7af0e8'); }
      // glowing mushrooms and spore plants
      ctx.globalAlpha = e;
      for (const [x, y, kind] of MUSH) if (kind === 'glow') { const p = 0.7 + 0.3 * Math.sin(S.t * 1.7 + x); ctx.globalAlpha = e * p; P.rect(x - 4, y - 5, 3, 1, '#b8fff4'); P.rect(x + 1, y - 4, 2, 1, '#b8fff4'); P.px(x - 3, y - 6, '#eafffc'); }
      for (const [x, y] of PLANTS) {
        const rnd = LB.rng(x * 5);
        for (let k = 0; k < 4; k++) {
          const a = -Math.PI / 2 + (k - 1.5) * 0.35 + (rnd() - 0.5) * 0.2, len = 9 + rnd() * 5;
          const bx = x - 7 + 7 + Math.cos(a) * 0.9 * len, by = y + 1 - 18 + 17 + Math.sin(a) * 0.9 * len;
          ctx.globalAlpha = e * (0.65 + 0.35 * Math.sin(S.t * 2 + k + x));
          P.rect(bx - 0.5, by - 1.5, 2, 2, '#c8fcff');
        }
      }
      ctx.restore();
      // spores drifting up, fireflies in the warm months
      if (e > 0.4) {
        LB.motes(ctx, S, { n: 14, x: 30, y: 150, w: 430, h: 90, blink: true, colors: ['#9af8f0', '#c8fff8'], seed: 21 });
        const ff = { summer: 34, spring: 14, autumn: 5, winter: 0 }[S.season] * (S.weather === 'rain' ? 0.2 : 1);
        if (ff) LB.motes(ctx, S, { n: Math.round(ff), x: 60, y: 110, w: 380, h: 150, blink: true, colors: ['#eaff8a', '#fff4a0', '#d8ff70'], seed: 8 });
      }
    },
    lights(S) {
      const D = DOOR_POS();
      const L = [
        { x: DOOR_LANTERNS[0][0], y: DOOR_LANTERNS[0][1] + 6, r: 46, c: '#ffb050', flicker: 1, sq: 0.75 },
        { x: DOOR_LANTERNS[1][0], y: DOOR_LANTERNS[1][1] + 6, r: 46, c: '#ffb050', flicker: 1, sq: 0.75 },
        { x: D.x, y: D.y + 4, r: 34, c: '#ffc070', i: 0.8, sq: 0.6 },
      ];
      LAMPS.forEach(([x, y, side]) => L.push({ x: x + side * 6, y: y - 30, r: 44, c: '#ffb050', flicker: 1.2, sq: 0.8 }));
      for (const [x, y, kind] of MUSH) if (kind === 'glow') L.push({ x: x - 2, y: y - 4, r: 16, c: '#50f0d8', i: 0.55 });
      for (const [x, y] of PLANTS) L.push({ x, y: y - 8, r: 20, c: '#70d8ff', i: 0.6 });
      return L;
    },
    after(ctx, S, P) {
      // light shafts through the canopy gaps, slanting with the sun; moonbeams at night
      const on = sunOn(S);
      const moon = S.L.night > 0.5 && S.weather === 'clear' ? (S.L.night - 0.5) * 2 : 0;
      if (on < 0.02 && moon < 0.02) return;
      const a = on > 0.02 ? on * (0.07 + 0.075 * S.L.golden + (S.weather === 'fog' ? 0.05 : 0)) : moon * 0.05;
      const col = on > 0.02 ? LB.mix('#fff2cc', '#ffaa60', S.L.golden) : '#9cb8ff';
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      rayGeom(S).forEach((r, i) => {
        const wob = 0.8 + 0.2 * Math.sin(S.t * 0.35 + i * 2);
        for (let seg = 0; seg < 4; seg++) {
          const fade = [1, 0.85, 0.6, 0.32][seg];
          const ya = r.top + (r.len * seg) / 4, yb = r.top + (r.len * (seg + 1)) / 4;
          for (const [k, al] of [[1, 0.45], [0.6, 0.7], [0.28, 1]]) {
            const wa = r.w * k * (1 + (seg / 4) * 0.5), wb = r.w * k * (1 + ((seg + 1) / 4) * 0.5);
            const xa = r.gx + (ya - r.top) * r.ang, xb = r.gx + (yb - r.top) * r.ang;
            ctx.globalAlpha = a * al * fade * wob;
            P.poly([[xa - wa / 2, ya], [xa + wa / 2, ya], [xb + wb / 2, yb], [xb - wb / 2, yb]], col);
          }
        }
        // dust turning in the beam
        if (on > 0.02) for (let m = 0; m < 7; m++) {
          const k = ((S.t * 0.04 + LB.hash(i, m, 3)) % 1);
          const y = r.top + k * r.len * 0.9, x = r.gx + (y - r.top) * r.ang + (LB.hash(i, m, 4) - 0.5) * r.w * 0.8 + Math.sin(S.t * 0.6 + m) * 2;
          ctx.globalAlpha = 0.5 * on * Math.sin(k * Math.PI);
          P.px(x, y, '#fff4d0');
        }
      });
      ctx.restore();
    },
  });
})();
