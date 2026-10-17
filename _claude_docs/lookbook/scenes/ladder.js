// The style ladder: one small place (a cottage by a pond) drawn three ways, side by side: Stardew's classic 16-bit look,
// hi-res pixel art (Eastward, Sea of Stars) and the same hi-res art under Octopath's HD-2D light.
(function () {
  'use strict';

  // ---------------- the place, in tiles (the same for every style) ----------------
  const LAY = {
    cottage: [3.5, 4.62],
    tree: [9.9, 4.9],
    pond: { cx: 11.6, cy: 7.85, rx: 4.3, ry: 2.9 },
    lamp: [4.95, 6.32],
    fences: [[0.2, 3.05, 6.32], [5.45, 7.3, 6.32]],
    reeds: [[13.3, 5.42, 1], [7.66, 7.05, 2], [8.15, 5.95, 3]],
    path: [[3.5, 4.5], [3.6, 5.3], [3.92, 6.3], [4.38, 7.2], [4.95, 8.1], [5.3, 8.9]],
    beds: [[1.6, 4.84, 2.95], [4.05, 4.84, 5.4]],
    clumps: [[0.7, 5.4], [6.3, 5.15], [7.15, 4.2], [1.4, 7.7], [2.55, 7.15], [6.5, 7.55], [12.7, 4.35], [14.4, 3.7], [0.6, 3.1], [8.0, 0.9], [13.6, 1.4], [6.4, 1.6]],
    puddles: [[3.72, 5.8, 0.3, 0.15], [4.55, 7.45, 0.38, 0.18]],
  };
  function catmull(pts, n) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const PATH = catmull(LAY.path, 24);
  const R5 = (c, o) => LB.ramp(c, 5, o);

  // masks and lookups for one tile size
  function layout(T) {
    return LB.memo('ladder-lay:' + T, () => {
      const W = 15 * T, H = Math.round(8.4375 * T);
      const pond = LB.canvas(W, H), pc = LB.ctx2d(pond);
      const id = pc.createImageData(W, H), d = id.data;
      const depth = new Float32Array(W * H).fill(-1);
      const { cx, cy, rx, ry } = LAY.pond;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const xt = (x + 0.5) / T, yt = (y + 0.5) / T;
        const ex = (xt - cx) / rx, ey = (yt - cy) / ry;
        if (ex * ex + ey * ey > 1.4) continue;
        const a = Math.atan2(ey, ex);
        const wob = 1 + 0.06 * (LB.noise(Math.cos(a) * 2.2 + 9, Math.sin(a) * 2.2 + 9, 5) * 2 - 1) + 0.025 * (LB.noise(Math.cos(a) * 7 + 3, Math.sin(a) * 7 + 3, 6) * 2 - 1);
        const dd = Math.sqrt(ex * ex + ey * ey) / wob;
        if (dd < 1) { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 255; depth[y * W + x] = dd; }
      }
      pc.putImageData(id, 0, 0);
      const top = new Int16Array(W).fill(-1);
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (depth[y * W + x] >= 0) { top[x] = y; break; }
      const path = LB.canvas(W, H), qc = LB.ctx2d(path), Q = LB.paint(qc);
      PATH.forEach(([xt, yt], i) => {
        const r = (0.48 + 0.06 * (LB.noise(i * 0.27, 2, 8) * 2 - 1) + 0.05 * Math.max(0, yt - 4.6) / 4) * T;
        Q.disc(xt * T, yt * T, r, '#fff');
      });
      const pd = qc.getImageData(0, 0, W, H).data;
      const isPath = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) isPath[i] = pd[i * 4 + 3] > 128 ? 1 : 0;
      const pud = LB.canvas(W, H), U = LB.paint(LB.ctx2d(pud));
      LAY.puddles.forEach(([xt, yt, a, b], i) => U.blob(xt * T, yt * T, a * T, '#fff', 40 + i, 0.22, b / a));
      const wet = LB.canvas(W, H), wc = LB.ctx2d(wet);
      wc.drawImage(pond, 0, 0); wc.drawImage(pud, 0, 0);
      // where the cottage, tree trunk and fences stand: no tufts there
      const blocked = (x, y) => {
        const xt = x / T, yt = y / T;
        if (xt > 1.2 && xt < 5.8 && yt > 0.5 && yt < 4.66) return true;
        if (Math.abs(xt - LAY.tree[0]) < 0.42 && yt > 3.4 && yt < 4.95) return true;
        return false;
      };
      return { W, H, T, pond, depth, top, path, isPath, pud, wet, blocked, pondPts: LB.maskPoints(pond, Math.round(70 * (T / 32) * (T / 32)) + 20, 9), wetPts: LB.maskPoints(wet, 50, 12), pudPts: LB.maskPoints(pud, 10, 13) };
    });
  }
  function fields(T) {
    return LB.memo('lad-fields:' + T, () => {
      const Lt = layout(T), W = Lt.W, H = Lt.H, n = W * H;
      const patch = new Float32Array(n), dust = new Float32Array(n), grain = new Float32Array(n);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        patch[i] = LB.noise(x / 110, y / 80, 11) * 0.75 + LB.noise(x / 40, y / 30, 12) * 0.25;
        dust[i] = LB.noise(x / 14, y / 10, 44);
        if (Lt.isPath[i]) grain[i] = LB.noise(x / 9, y / 6, 21);
      }
      return { patch, dust, grain };
    });
  }
  // Paint many single pixels fast: read the canvas once, write into its pixel array, put it back. Q has px and rect.
  function fastPaint(ctx, W, H, fn) {
    const id = ctx.getImageData(0, 0, W, H), u = new Uint32Array(id.data.buffer);
    const cache = new Map();
    const pack = (c) => { let v = cache.get(c); if (v === undefined) { const r = LB.rgb(c); v = ((255 << 24) | (r[2] << 16) | (r[1] << 8) | r[0]) >>> 0; cache.set(c, v); } return v; };
    const Q = {
      px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) u[y * W + x] = pack(c); },
      rect(x, y, w, h, c) {
        x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
        const v = pack(c);
        for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) u[j * W + i] = v;
      },
    };
    fn(Q);
    ctx.putImageData(id, 0, 0);
  }
  // a reflection about a per-column mirror line, done on the pixel array (one read, one write)
  function mirrorFast(src, axis) {
    const W = src.width, H = src.height;
    const sd = new Uint32Array(LB.ctx2d(src).getImageData(0, 0, W, H).data.buffer);
    const out = LB.canvas(W, H), oc = LB.ctx2d(out), id = oc.createImageData(W, H), od = new Uint32Array(id.data.buffer);
    for (let x = 0; x < W; x++) {
      const a = axis[x]; if (a <= 0) continue;
      for (let y = a; y < H; y++) { const sy = 2 * a - 1 - y; if (sy < 0) break; od[y * W + x] = sd[sy * W + x]; }
    }
    oc.putImageData(id, 0, 0);
    return out;
  }
  const isPond = (Lt, x, y) => x >= 0 && y >= 0 && x < Lt.W && y < Lt.H && Lt.depth[y * Lt.W + x] >= 0;

  // ======================================================================================================
  //  HI-RES (32 px a tile): five-tone hue-shifted ramps, sel-out outlines, clustered texture
  // ======================================================================================================
  const HI = {
    spring: { grass: '#7cbf4e', leaf: '#6fb84a', blossom: '#f5b4c8', flowers: ['#f6a6c2', '#fff0a0', '#ffffff', '#c6a6f0'], ivy: '#5f9c40', reed: '#7aa84a' },
    summer: { grass: '#4f9a40', leaf: '#3e8b3d', flowers: ['#e8483c', '#f6c33c', '#a462d8', '#ffffff', '#f0883c'], ivy: '#3e7d38', reed: '#5c8c3a' },
    autumn: { grass: '#8d9846', leaf: ['#d4682a', '#b83a26', '#e0922c'], flowers: ['#9a6ad0', '#e8b43a'], ivy: '#b8402c', reed: '#b09048', fallen: ['#d8742c', '#c4442c', '#e6a43a', '#a85a2a'] },
    winter: { grass: '#e9eff8', leaf: null, flowers: [], ivy: null, reed: '#a88a5a' },
  };
  const SNOW = R5('#e3ebf6', { spread: 0.9 });

  // a row of shingles over a region: courses lapping down, a dark line under each course's butt, joints, weathering
  function shingles(P, x0, y0, x1, y1, R, seed, o) {
    o = o || {};
    const ch = o.course || 5;
    let i = 0;
    for (let cy = y0; cy < y1; cy += ch, i++) {
      const rows = Math.min(ch, y1 - cy);
      const up = 1 - (cy - y0) / Math.max(1, y1 - y0); // courses near the ridge catch a little more light
      let sx = x0 - Math.floor(LB.hash(i, 0, seed) * 8);
      while (sx < x1) {
        const sw = (o.width || 7) + Math.floor(LB.hash(sx, cy, seed + 5) * 4);
        const a = Math.max(x0, sx), b = Math.min(x1, sx + sw);
        if (b > a) {
          const h = LB.hash(sx, cy, seed);
          const lit = (1 - (a - x0) / Math.max(1, x1 - x0)) * 0.35 + up * 0.25 + h * 0.5;
          let tone = lit > 0.62 ? LB.mix(R[2], R[3], 0.55) : lit > 0.36 ? R[2] : LB.mix(R[1], R[2], 0.6);
          if (LB.hash(sx, cy, seed + 1) < 0.06) tone = LB.mix(tone, '#8a8678', 0.4);
          P.rect(a, cy, b - a, rows, tone);
          // the shadow under the course above, then the lit butt edge of this one (ragged: some shingles hang lower)
          P.rect(a, cy, b - a, 1, R[1]);
          if (rows === ch) {
            P.rect(a + 1, cy + ch - 1, Math.max(1, b - a - 2), 1, LB.mix(tone, R[4], 0.35));
            if (LB.hash(sx, cy, seed + 3) < 0.3 && cy + ch < y1) P.rect(a + 1, cy + ch, Math.max(1, b - a - 2), 1, LB.mix(tone, R[1], 0.3));
          }
          if (sx >= x0) P.rect(sx, cy + 1, 1, Math.max(1, rows - 2), LB.mix(R[0], R[1], 0.5));
          if (LB.hash(sx, cy, seed + 2) < 0.2) P.px(a + 1 + Math.floor(h * Math.max(1, b - a - 3)), cy + 2, LB.mix(tone, R[1], 0.6));
        }
        sx += sw;
      }
    }
  }
  function stoneCourse(P, x0, y0, x1, y1, R, seed) {
    P.rect(x0, y0, x1 - x0, y1 - y0, R[0]);
    const rows = Math.max(1, Math.round((y1 - y0) / 5));
    const rh = (y1 - y0) / rows;
    for (let r = 0; r < rows; r++) {
      let x = x0 + ((r % 2) ? 4 : 0) - 4;
      const ya = Math.round(y0 + r * rh), yb = Math.round(y0 + (r + 1) * rh);
      while (x < x1) {
        const w = 7 + Math.floor(LB.hash(x, r, seed) * 7);
        const a = Math.max(x0, x + 1), b = Math.min(x1, x + w);
        if (b - a >= 2) {
          const tone = LB.hash(x, r, seed + 1) < 0.5 ? R[2] : R[3];
          P.rect(a, ya + 1, b - a, yb - ya - 1, tone);
          P.rect(a, ya + 1, b - a - 1, 1, R[4]);
          P.rect(b - 1, ya + 2, 1, yb - ya - 2, R[1]);
        }
        x += w;
      }
    }
  }
  function flowerBox(P, x0, y, x1, season, seed, snow) {
    const W5 = R5('#7a5032');
    P.rect(x0, y, x1 - x0, 5, W5[2]); P.rect(x0, y, x1 - x0, 1, W5[3]); P.rect(x0, y + 4, x1 - x0, 1, W5[1]);
    if (snow >= 1) { P.rect(x0, y - 2, x1 - x0, 2, SNOW[3]); P.rect(x0 + 1, y - 3, x1 - x0 - 2, 1, SNOW[4]); return; }
    const pal = HI[season], G = R5(pal.ivy || '#4a7a3a');
    const r = LB.rng(seed);
    for (let x = x0 + 1; x < x1 - 1; x += 2) { P.rect(x, y - 2 - (r() < 0.5 ? 1 : 0), 2, 3, r() < 0.5 ? G[1] : G[2]); }
    if (!pal.flowers.length) return;
    for (let x = x0 + 2; x < x1 - 2; x += 4) {
      const c = pal.flowers[Math.floor(r() * pal.flowers.length)], fy = y - 4 - Math.floor(r() * 2);
      P.px(x, fy, c); P.px(x + 1, fy, c); P.px(x, fy + 1, c); P.px(x + 1, fy + 1, LB.shade(c, -0.4));
      P.px(x, fy, LB.shade(c, 0.5));
    }
  }

  function cottageHi(season, snow) {
    return LB.sprite('lad-cottage-hi:' + season + ':' + snow, 154, 154, (P, ctx) => {
      const RF = R5('#b4553e'), WL = R5('#e9d7ad'), TB = R5('#6b4529'), ST = R5('#9c968a'), BR = R5('#9c4a36'), DR = R5('#3e6f78');
      const r = LB.rng(21);
      // chimney (behind the roof's front edge but standing on it)
      const chim = () => { // on the front slope, so its smoke has room to rise
        const o = 20;
        P.rect(112, 8 + o, 16, 36, BR[2]);
        for (let y = 8 + o, i = 0; y < 44 + o; y += 4, i++) {
          P.rect(112, y, 16, 1, BR[0]);
          for (let x = 112 + (i % 2) * 4; x < 128; x += 8) P.rect(x, y + 1, 1, 3, BR[0]);
        }
        P.rect(112, 8 + o, 2, 36, BR[3]); P.rect(126, 8 + o, 2, 36, BR[1]);
        P.rect(110, 4 + o, 20, 5, ST[2]); P.rect(110, 4 + o, 20, 1, ST[4]); P.rect(110, 8 + o, 20, 1, ST[0]);
        P.rect(116, o, 7, 4, '#a8603e'); P.rect(116, o, 2, 4, '#c47a52'); P.rect(121, o, 2, 4, '#7a3a26');
        P.rect(110, 43 + o, 20, 2, snow >= 1 ? SNOW[2] : '#6a6a72'); // flashing
        if (snow >= 0.5) { P.rect(110, 2 + o, 20, 2, SNOW[4]); P.rect(111, 1 + o, 5, 1, SNOW[4]); }
      };
      // roof
      const rx0 = 5, rx1 = 149, ry0 = 30, ry1 = 98;
      shingles(P, rx0, ry0, rx1, ry1, RF, 3);
      // ridge cap
      P.rect(rx0, 23, rx1 - rx0, 8, RF[1]);
      for (let x = rx0; x < rx1; x += 8) { P.rect(x + 1, 24, 6, 5, RF[2]); P.rect(x + 2, 24, 3, 2, RF[3]); P.rect(x, 29, 8, 1, RF[0]); }
      // moss toward the eaves, and on the shady right
      if (snow < 1) {
        const M = R5(season === 'autumn' ? '#7a8a3a' : '#6a8a3a');
        for (let i = 0; i < 9; i++) {
          const x = rx0 + 6 + r() * (rx1 - rx0 - 12), y = ry1 - 4 - Math.pow(r(), 1.6) * 22;
          const rr = 2 + r() * 2.5;
          P.blob(x, y, rr, M[1], i + 3, 0.45, 0.55);
          P.blob(x - 0.5, y - 0.5, rr * 0.6, M[2], i + 13, 0.45, 0.55);
          P.px(x - 1, y - 1, M[3]); P.px(x + rr * 0.6, y + 1, M[0]);
        }
      }
      // dormer, on the left of the front slope
      const dormer = () => {
        P.rect(35, 56, 23, 20, WL[2]); P.rect(35, 56, 2, 20, WL[3]); P.rect(56, 56, 2, 20, WL[1]);
        P.rect(41, 60, 11, 11, '#f2ead6'); P.rect(42, 61, 9, 9, '#2f4a64'); P.rect(46, 61, 1, 9, '#f2ead6'); P.rect(42, 65, 9, 1, '#f2ead6');
        P.rect(42, 61, 4, 1, '#8fb8d8'); P.px(42, 62, '#8fb8d8');
        P.rect(35, 75, 23, 2, RF[0]);
        P.poly([[31, 58], [46.5, 40], [62, 58]], RF[2]);
        P.poly([[46.5, 40], [62, 58], [57, 58], [46.5, 46]], RF[1]);
        P.line(31, 58, 46, 40, TB[2]); P.line(62, 58, 47, 40, TB[1]);
        P.rect(30, 57, 33, 2, TB[1]);
      };
      // eave, fascia, the shadow it casts on the wall
      const walls = () => {
        P.rect(13, 100, 126, 38, WL[2]);
        for (let i = 0; i < 70; i++) {
          const x = 15 + r() * 120, y = 104 + r() * 32;
          P.rect(x, y, 2 + Math.floor(r() * 3), 1, r() < 0.65 ? WL[1] : WL[3]);
        }
        P.rect(13, 100, 126, 5, WL[1]); P.rect(13, 105, 126, 1, LB.mix(WL[1], WL[2], 0.5));
        // timber frame
        const post = (x, w) => { P.rect(x, 100, w, 38, TB[2]); P.rect(x, 100, 1, 38, TB[3]); P.rect(x + w - 1, 100, 1, 38, TB[1]); };
        post(13, 5); post(134, 5); post(57, 4); post(93, 4);
        P.rect(13, 133, 126, 4, TB[2]); P.rect(13, 133, 126, 1, TB[3]); P.rect(13, 136, 126, 1, TB[1]);
        P.rect(13, 100, 126, 3, TB[1]);
      };
      const windowAt = (x0) => {
        P.rect(x0 - 5, 107, 5, 19, DR[2]); P.rect(x0 + 20, 107, 5, 19, DR[2]);
        for (let y = 109; y < 125; y += 3) { P.rect(x0 - 5, y, 5, 1, DR[1]); P.rect(x0 + 20, y, 5, 1, DR[1]); }
        P.rect(x0 - 5, 107, 1, 19, DR[3]); P.rect(x0 + 20, 107, 1, 19, DR[3]);
        P.rect(x0, 107, 20, 19, '#efe6d2'); P.rect(x0 + 19, 108, 1, 18, '#c9bc9c');
        P.rect(x0 + 2, 109, 16, 15, '#2c4560');
        P.rect(x0 + 2, 109, 16, 4, '#3a5a78');
        P.rect(x0 + 9, 109, 2, 15, '#efe6d2'); P.rect(x0 + 2, 115, 16, 2, '#efe6d2');
        P.rect(x0 + 3, 110, 3, 1, '#9cc4e0'); P.px(x0 + 3, 111, '#9cc4e0'); P.px(x0 + 12, 110, '#7aa4c8');
        P.rect(x0 - 1, 125, 22, 2, '#d9ccae');
        flowerBox(P, x0 - 2, 127, x0 + 22, season, x0, snow);
      };
      const door = () => {
        P.rect(65, 109, 22, 29, TB[1]);
        P.rect(67, 111, 18, 27, DR[2]);
        for (let x = 71; x < 85; x += 5) P.rect(x, 111, 1, 27, DR[1]);
        P.rect(67, 111, 1, 27, DR[3]); P.rect(68, 111, 16, 1, DR[3]);
        P.rect(68, 116, 11, 2, '#3a3440'); P.rect(68, 131, 11, 2, '#3a3440');
        P.rect(81, 124, 2, 2, '#e6c264'); P.px(81, 124, '#fff0b0');
        // the hood over the door
        P.rect(62, 103, 28, 6, RF[2]); shingles(P, 62, 103, 90, 109, RF, 7, { course: 3, width: 6 });
        P.rect(62, 108, 28, 1, RF[0]); P.rect(63, 109, 2, 4, TB[2]); P.rect(87, 109, 2, 4, TB[2]);
        if (snow >= 0.5) { P.rect(62, 101, 28, 3, SNOW[3]); P.rect(63, 100, 26, 1, SNOW[4]); }
        // lantern
        P.rect(88, 112, 4, 1, '#2e2b36'); P.rect(90, 113, 1, 2, '#2e2b36');
        P.rect(88, 115, 5, 8, '#2e2b36'); P.rect(89, 116, 3, 6, '#e8d8a0'); P.rect(88, 115, 5, 1, '#4a4656');
      };
      const foundation = () => {
        stoneCourse(P, 13, 138, 139, 148, ST, 5);
        P.rect(63, 143, 26, 6, ST[3]); P.rect(63, 143, 26, 1, ST[4]); P.rect(63, 148, 26, 1, ST[1]); P.rect(88, 144, 1, 4, ST[1]);
      };
      const ivy = () => {
        const pal = HI[season];
        if (!pal.ivy) { // winter: bare stems
          for (let i = 0; i < 4; i++) { let x = 15 + i * 4, y = 138; for (let k = 0; k < 30; k++) { P.px(x, y, '#6a5040'); y -= 1; x += Math.round(LB.noise(k * 0.3, i, 4) * 2 - 1); } }
          return;
        }
        const G = R5(pal.ivy);
        for (let i = 0; i < 46; i++) {
          const t = r(); const x = 13 + Math.floor(r() * (t < 0.6 ? 10 : 26)), y = 100 + Math.floor(Math.pow(r(), 0.7) * 37 * (t < 0.6 ? 1 : 0.3));
          P.rect(x, y, 2, 2, G[1 + Math.floor(r() * 2)]); P.px(x, y, G[3]);
        }
      };
      if (snow >= 1) {
        // a blanket of snow over the roof: the courses showing through as soft ridges, lit from the upper left, a lumpy
        // overhang at the eave, icicles
        P.rect(rx0, 22, rx1 - rx0, ry1 - 22, SNOW[3]);
        fastPaint(ctx, 154, 154, (P) => {
        for (let y = 22; y < ry1; y++) for (let x = rx0; x < rx1; x++) {
          const lit = 1 - (x - rx0) / (rx1 - rx0) * 0.8 - (y - 22) / (ry1 - 22) * 0.5 + (LB.noise(x * 0.05, y * 0.09, 8) - 0.5) * 0.5;
          if (lit > 0.62) P.px(x, y, SNOW[4]); else if (lit < 0.22) P.px(x, y, LB.mix(SNOW[2], SNOW[3], 0.45)); else if (lit < 0.05) P.px(x, y, SNOW[2]);
        }
        for (let y = 31, i = 0; y < ry1 - 2; y += 7, i++) for (let x = rx0 + 2; x < rx1 - 2; x++) {
          const wob = Math.round(Math.sin(x * 0.11 + i) * 0.8);
          if (LB.noise(x * 0.08, i * 3.1, 3) > 0.38) { P.px(x, y + wob, SNOW[2]); if (LB.hash(x, i, 5) < 0.5) P.px(x, y + wob - 1, SNOW[4]); }
        }
        P.rect(rx0, 28, rx1 - rx0, 2, SNOW[2]);
        for (let k = 0; k < 60; k++) P.px(rx0 + LB.hash(k, 1, 6) * (rx1 - rx0), 24 + LB.hash(k, 2, 6) * (ry1 - 26), '#ffffff');
        });
        P.rect(rx0, 22, rx1 - rx0, 2, SNOW[4]);
        P.rect(rx0, ry1 - 3, rx1 - rx0, 3, SNOW[2]); P.rect(rx0, ry1 - 4, rx1 - rx0, 1, SNOW[4]);
        for (let x = rx0 - 1; x < rx1 + 1; x++) {
          const h = 1 + Math.round(LB.noise(x * 0.18, 1, 9) * 3);
          P.rect(x, ry1, 1, h, SNOW[3]); P.px(x, ry1 + h, SNOW[1]);
          if (LB.hash(x, 0, 41) < 0.11) { const L = 2 + Math.floor(LB.hash(x, 1, 41) * 6); P.rect(x, ry1 + h, 1, L, '#cfe4f4'); P.px(x, ry1 + h + L - 1, '#9cc0dc'); }
        }
      } else if (snow > 0) {
        fastPaint(ctx, 154, 154, (P) => {
          for (let y = ry0; y < ry1; y++) for (let x = rx0; x < rx1; x++) {
            const n = LB.noise(x * 0.06, y * 0.1, 12) - (y - ry0) / (ry1 - ry0) * 0.35;
            if (n > 0.42) P.px(x, y, n > 0.5 ? SNOW[4] : SNOW[3]);
          }
        });
      }
      chim();
      dormer();
      if (snow >= 0.5) { P.poly([[31, 57], [46.5, 39], [62, 57], [58, 56], [46.5, 43], [35, 56]], SNOW[4]); }
      if (snow >= 1) { P.rect(33, 77, 27, 2, SNOW[2]); P.rect(58, 58, 4, 19, LB.mix(SNOW[2], SNOW[3], 0.4)); }
      walls();
      ivy();
      windowAt(24); windowAt(108);
      door();
      foundation();
      // the roof's front edge: fascia board and its shadow line
      P.rect(rx0, 97, rx1 - rx0, 3, TB[2]); P.rect(rx0, 97, rx1 - rx0, 1, TB[3]);
      if (snow >= 1) { for (let x = rx0; x < rx1; x++) { const h = 1 + Math.round(LB.noise(x * 0.18, 1, 9) * 3); P.rect(x, 97, 1, h, SNOW[3]); P.px(x, 97 + h, SNOW[1]); } }
    }, { outline: 'sel' });
  }

  // a big leafy tree: dark core, dozens of leaf clusters lit from the upper left, sprigs past the edge
  function treeHi(season, snow) {
    return LB.sprite('lad-tree-hi:' + season + ':' + snow, 140, 160, (P0, ctx) => {
      let P = P0;
      const r = LB.rng(77);
      const cx = 70, cy = 62, base = 157;
      const BK = R5('#6b4a33');
      // trunk with a root flare and bark
      P.poly([[61, base], [79, base], [76, base - 7], [75, 92], [65, 92], [64, base - 7]], BK[2]);
      for (const [ex, ey, w] of [[57, base, 3], [84, base - 1, 3], [63, base + 1, 2], [77, base + 1, 2]]) { for (let k = 0; k <= 10; k++) { const t = k / 10, x = 70 + (ex - 70) * t, y = base - 7 + (ey - base + 7) * t * t; P.rect(x - w / 2, y, Math.max(1, w * (1 - t * 0.6)), 2, ex < 70 ? BK[2] : BK[1]); P.px(x, y, ex < 70 ? BK[3] : BK[2]); } }
      P.rect(66, 92, 3, base - 96, BK[3]); P.rect(72, 94, 2, base - 98, BK[1]);
      for (let i = 0; i < 9; i++) { const x = 66 + Math.floor(r() * 9), y = 96 + Math.floor(r() * 54); P.rect(x, y, 1, 3 + Math.floor(r() * 5), BK[0]); }
      P.rect(70, 120, 3, 2, BK[0]); P.px(70, 119, BK[3]);
      const lobes = [[-33, -1, 26], [32, 1, 27], [-14, -29, 27], [16, -31, 25], [0, 9, 31], [-29, 20, 20], [29, 18, 22], [0, -10, 30]];
      if (season === 'winter' || !HI[season].leaf) {
        // bare branches carrying snow
        const branch = (x, y, ang, len, w, depth) => {
          const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
          for (let k = 0; k <= len; k++) {
            const px = x + (x2 - x) * k / len, py = y + (y2 - y) * k / len;
            P.rect(px - w / 2, py, Math.max(1, w), 1, w > 1.5 ? BK[2] : BK[1]);
            if (snow > 0 && Math.abs(Math.cos(ang)) > 0.35 && LB.hash(Math.round(px), Math.round(py), 3) < 0.8 * snow) P.px(px, py - 1, SNOW[4]);
          }
          if (depth <= 0) return;
          const n = depth > 2 ? 2 : 2 + (r() < 0.4 ? 1 : 0);
          for (let i = 0; i < n; i++) branch(x2, y2, ang + (r() - 0.5) * 1.3 + (i - (n - 1) / 2) * 0.55, len * (0.62 + r() * 0.15), Math.max(1, w * 0.62), depth - 1);
        };
        branch(70, 96, -Math.PI / 2, 26, 6, 5);
        branch(70, 106, -Math.PI / 2 - 0.9, 24, 4, 4);
        branch(70, 104, -Math.PI / 2 + 0.85, 24, 4, 4);
        branch(69, 112, -Math.PI / 2 - 1.25, 16, 3, 3);
        branch(71, 110, -Math.PI / 2 + 1.2, 16, 3, 3);
        return;
      }
      const pal = HI[season];
      const ramps = (Array.isArray(pal.leaf) ? pal.leaf : [pal.leaf]).map((c) => R5(c, { spread: 0.95, light: 0.2 }));
      const blossom = pal.blossom ? R5(pal.blossom, { spread: 0.8, light: 0.14 }) : null;
      // The crown as lumps of leaves: big lobes for the form, a couple of hundred small clumps on their surface for
      // the leafy texture. Each pixel takes the nearest clump's surface, is lit from the upper left, and snaps to one
      // of five tones; a clump shades the one below-right of it.
      const sph = lobes.map(([dx, dy, rr], i) => ({ x: cx + dx, y: cy + dy, z: (dy + 30) * 0.35 + (i === 4 ? 6 : 0), r: rr, ramp: 0 }));
      const big = sph.length;
      for (let k = 0; k < 900 && sph.length < big + 420; k++) {
        const L = sph[Math.floor(r() * big)];
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * L.r * 0.97;
        const x = L.x + Math.cos(a) * d, y = L.y + Math.sin(a) * d;
        const zs = L.z + Math.sqrt(Math.max(0, L.r * L.r - d * d));
        const rr = 3.5 + r() * 3;
        sph.push({ x, y, z: zs - rr * 0.5, r: rr, ramp: Math.floor(r() * ramps.length) });
      }
      if (blossom) for (let k = 0; k < 400 && sph.length < big + 520; k++) { // blossom: small sprays sitting on top
        const L = sph[big + Math.floor(r() * 420)];
        if (!L) continue;
        const rr = 1.8 + r() * 1.6;
        sph.push({ x: L.x + (r() - 0.5) * L.r, y: L.y + (r() - 0.5) * L.r, z: L.z + L.r * 0.9, r: rr, ramp: -1 });
      }
      const W0 = 140, H0 = 160, zbuf = new Float32Array(W0 * H0).fill(-1e9), who = new Int16Array(W0 * H0).fill(-1), nz = new Float32Array(W0 * H0);
      for (let i = 0; i < sph.length; i++) {
        const s0 = sph[i];
        for (let y = Math.floor(s0.y - s0.r); y <= Math.ceil(s0.y + s0.r); y++) for (let x = Math.floor(s0.x - s0.r); x <= Math.ceil(s0.x + s0.r); x++) {
          if (x < 0 || y < 0 || x >= W0 || y >= H0) continue;
          const dx = x + 0.5 - s0.x, dy = (y + 0.5 - s0.y) / 0.9, q = s0.r * s0.r - dx * dx - dy * dy;
          if (q <= 0) continue;
          const h = Math.sqrt(q), z = s0.z + h + (LB.hash(x, y, i) - 0.5) * 1.3, j = y * W0 + x;
          if (z > zbuf[j]) { zbuf[j] = z; who[j] = i; nz[j] = h / s0.r; }
        }
      }
      fastPaint(ctx, W0, H0, (P) => {
      const Lx = -0.5, Ly = -0.72, Lz = 0.48;
      for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
        const j = y * W0 + x, i = who[j];
        if (i < 0) continue;
        const s0 = sph[i];
        const nx = (x + 0.5 - s0.x) / s0.r, ny = (y + 0.5 - s0.y) / 0.9 / s0.r, nzz = nz[j];
        let lit = Math.max(0, nx * Lx + ny * Ly + nzz * Lz);
        // the form of the whole crown: the upper left in sun, the underside in shade
        const gx = (x - cx) / 62, gy = (y - cy) / 56;
        lit = lit * 0.72 + LB.clamp(0.45 - gx * 0.26 - gy * 0.4, 0, 1) * 0.4 - 0.04;
        // shaded by a clump up and to the left of it
        const k2 = j - 2 * W0 - 2;
        if (x > 1 && y > 1 && who[k2] >= 0 && zbuf[k2] - zbuf[j] > 2.2) lit -= 0.28;
        lit += (LB.hash(x, y, 9) - 0.5) * 0.06;
        const ti = lit < 0.22 ? 0 : lit < 0.42 ? 1 : lit < 0.6 ? 2 : lit < 0.8 ? 3 : 4;
        const R = s0.ramp < 0 ? blossom : ramps[s0.ramp];
        P.px(x, y, R[s0.ramp < 0 ? Math.max(1, ti) : ti]);
      }
      // sprigs past the edge
      for (let k = 0; k < 70; k++) {
        const a = r() * Math.PI * 2, L = sph[Math.floor(r() * big)];
        const x = Math.round(L.x + Math.cos(a) * (L.r + 4)), y = Math.round(L.y + Math.sin(a) * (L.r + 4) * 0.9);
        if (x < 1 || y < 1 || x >= W0 - 1 || y >= H0 - 1 || who[y * W0 + x] >= 0) continue;
        const ix = Math.round(x - Math.cos(a) * 2), iy = Math.round(y - Math.sin(a) * 2);
        if (ix < 0 || iy < 0 || ix >= W0 || iy >= H0 || who[iy * W0 + ix] < 0) continue;
        const R = ramps[k % ramps.length];
        const c = R[(Math.cos(a) < 0 ? 1 : 0) + (Math.sin(a) < 0 ? 2 : 1)];
        P.px(x, y, c); P.px(ix, iy, c);
        if (r() < 0.5) P.px(x + (Math.cos(a) > 0 ? 1 : -1), y, c);
      }
      if (snow > 0) for (let y = 1; y < H0; y++) for (let x = 0; x < W0; x++) {
        const j = y * W0 + x; if (who[j] < 0 || who[j - W0] >= 0) continue;
        if (LB.hash(x, y, 77) < 0.55 * snow) { P.px(x, y, SNOW[4]); P.px(x, y + 1, SNOW[3]); }
      }
      });
    }, { outline: 'sel' });
  }

  function fenceHi(len, season, snow) {
    return LB.sprite('lad-fence-hi:' + len + ':' + snow, len + 4, 26, (P) => {
      const F = R5('#8a6a4a');
      for (const y of [8, 15]) { P.rect(1, y, len, 3, F[2]); P.rect(1, y, len, 1, F[3]); P.rect(1, y + 2, len, 1, F[1]); if (snow > 0) P.rect(1, y - 1, len, 1, SNOW[4]); }
      for (let x = 1; x < len; x += 22) {
        P.rect(x, 3, 5, 22, F[2]); P.rect(x, 3, 1, 22, F[3]); P.rect(x + 4, 3, 1, 22, F[1]);
        P.rect(x + 1, 1, 3, 2, F[2]); P.px(x + 2, 0, F[3]);
        P.rect(x + 1, 10, 3, 1, F[1]);
        if (LB.hash(x, 1, 3) < 0.5) P.px(x + 2, 14, F[0]);
        if (snow > 0) { P.rect(x, 1, 5, 2, SNOW[4]); P.px(x + 2, 0, SNOW[4]); }
      }
    }, { outline: 'sel' });
  }
  function lampHi() {
    return LB.sprite('lad-lamp-hi', 22, 60, (P) => {
      const I = R5('#3a3646');
      P.rect(8, 55, 7, 4, I[2]); P.rect(8, 55, 7, 1, I[3]);
      P.rect(10, 14, 3, 42, I[2]); P.rect(10, 14, 1, 42, I[4]); P.rect(12, 14, 1, 42, I[1]);
      P.rect(9, 12, 5, 3, I[2]);
      P.rect(6, 3, 11, 2, I[2]); P.rect(5, 2, 13, 1, I[3]); P.rect(10, 0, 3, 2, I[2]);
      P.rect(7, 5, 9, 7, I[1]); P.rect(8, 5, 7, 6, '#d6dcd4'); P.rect(11, 5, 1, 6, I[1]); P.rect(8, 5, 2, 2, '#f0f4ee');
      P.rect(7, 11, 9, 2, I[2]);
    }, { outline: 'sel' });
  }
  function reedsHi(season, seed) {
    return LB.sprite('lad-reeds-hi:' + season + ':' + seed, 26, 36, (P) => {
      const pal = HI[season], G = R5(pal.reed);
      const r = LB.rng(seed * 5 + 1);
      for (let i = 0; i < 11; i++) {
        const x = 4 + r() * 18, h = 14 + r() * 18, lean = (r() - 0.5) * 6;
        for (let k = 0; k < h; k++) P.px(x + lean * k / h, 35 - k, k < h * 0.5 ? G[1] : G[2 + (i % 2)]);
        if (r() < 0.4 && season !== 'spring') { const tx = x + lean, ty = 35 - h; P.rect(tx - 1, ty, 3, 6, '#7a4a2a'); P.rect(tx - 1, ty, 1, 5, '#9a6238'); P.px(tx, ty - 1, G[1]); }
      }
      for (let i = 0; i < 5; i++) { const x = 3 + r() * 20; P.line(x, 35, x + (r() - 0.5) * 12, 22 + r() * 8, G[3]); }
    }, { outline: 'sel' });
  }

  // the ground: calm grass in broad soft patches, tufts in clusters, flowers in clumps, a dirt path, the pond's bed
  function groundHi(season, snow, wet) {
    return LB.memo('lad-ground-hi:' + season + ':' + snow + ':' + wet, () => {
      const T = 32, Lt = layout(T), W = Lt.W, H = Lt.H;
      const cv = LB.canvas(W, H), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const winter = snow >= 1, pal = HI[season];
      const G = winter ? SNOW : R5(pal.grass);
      const PT = winter ? R5('#b9c2d2') : R5(wet ? '#9c7c58' : '#c7a170');
      const rnd = LB.rng(5);
      // Everything per-pixel goes straight into one image: broad patches in three calm tones, the path with its darker
      // rim and grain, stones, footprints, puddles, a dusting of snow.
      const gA = winter ? LB.mix(SNOW[2], SNOW[3], 0.55) : LB.mix(G[1], G[2], 0.55), gB = winter ? LB.mix(SNOW[3], SNOW[4], 0.5) : LB.mix(G[2], G[3], 0.4);
      const id = ctx.createImageData(W, H), d = id.data;
      const set = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = ((y | 0) * W + (x | 0)) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
      const cA = LB.rgb(gA), cB = LB.rgb(gB), cM = LB.rgb(winter ? SNOW[3] : G[2]);
      const pt = PT.map(LB.rgb), sn = SNOW.map(LB.rgb), pud = LB.rgb(LB.mix(PT[0], '#2a3040', 0.4));
      const F = fields(T);
      const pudMask = wet ? LB.ctx2d(Lt.pud).getImageData(0, 0, W, H).data : null;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        let c;
        if (Lt.isPath[i]) {
          const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !Lt.isPath[i - 1] || !Lt.isPath[i + 1] || !Lt.isPath[i - W] || !Lt.isPath[i + W];
          const n = F.grain[i];
          if (edge) c = winter ? sn[2] : pt[1];
          else if (winter) c = n > 0.68 ? pt[3] : pt[2];
          else c = n > 0.68 ? pt[3] : n < 0.22 && LB.hash(x, y, 2) < 0.5 ? pt[1] : pt[2];
          if (pudMask && pudMask[i * 4 + 3] > 128) c = pud;
        } else {
          const n = F.patch[i];
          c = n > 0.6 ? cB : n < 0.38 ? cA : cM;
          if (snow > 0 && !winter && Lt.depth[i] < 0) { const m = F.dust[i]; if (m > 0.6) c = m > 0.7 ? sn[4] : sn[3]; }
        }
        const j = i * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
      }
      if (!winter) for (let k = 0; k < 120; k++) {
        const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
        if (!Lt.isPath[y * W + x] || !Lt.isPath[y * W + x + 2] || !Lt.isPath[(y + 2) * W + x]) continue;
        if (rnd() < 0.5) { set(x, y, pt[4]); set(x + 1, y, pt[4]); set(x, y + 1, pt[0]); set(x + 1, y + 1, pt[0]); } else set(x, y, pt[0]);
      }
      if (winter) for (let i = 4; i < PATH.length - 2; i += 3) { // footprints down the path
        const [xt, yt] = PATH[i], side = (i % 2) ? -4 : 4, x0 = Math.round(xt * T + side), y0 = Math.round(yt * T);
        for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) set(x0 + xx, y0 + yy, yy === 0 ? pt[0] : pt[1]);
        set(x0 + 1, y0 + 3, pt[1]);
      }
      ctx.putImageData(id, 0, 0);
      // the pond's bed: shallow sand-teal at the edge, deep blue in the middle
      ctx.drawImage(LB.memo('lad-bed-hi', () => {
        const bedCv = LB.canvas(W, H), bc = LB.ctx2d(bedCv), bed = bc.createImageData(W, H), bd = bed.data;
        const BED = [LB.rgb('#24476a'), LB.rgb('#2f5e7c'), LB.rgb('#467f8a'), LB.rgb('#7ca698')];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const dd = Lt.depth[y * W + x];
          if (dd < 0) continue;
          const k = dd > 0.94 ? 3 : dd > 0.84 ? 2 : dd > 0.6 ? 1 : 0;
          const c = BED[k], i = (y * W + x) * 4;
          bd[i] = c[0]; bd[i + 1] = c[1]; bd[i + 2] = c[2]; bd[i + 3] = 255;
        }
        bc.putImageData(bed, 0, 0);
        return bedCv;
      }), 0, 0);
      fastPaint(ctx, W, H, (P) => {
      // the far bank: a little earth face where the grass drops to the water
      const BANK = R5(winter ? '#7a7484' : '#6a5038');
      for (let x = 0; x < W; x++) {
        const t = Lt.top[x];
        if (t < 0) continue;
        const nx = (x / T - LAY.pond.cx) / LAY.pond.rx;
        const face = Math.round(4 * Math.max(0, 1 - Math.abs(nx) * 1.1));
        for (let k = 0; k < face; k++) P.px(x, t + k, k === 0 ? BANK[3] : k === face - 1 ? BANK[0] : BANK[1 + (LB.hash(x, k, 4) < 0.5 ? 1 : 0)]);
        if (face > 1 && LB.hash(x, 7, 4) < 0.12) P.rect(x, t + 1, 2, 2, BANK[3]);
      }
      // grass lip over the edges of the water and path, tufts in clusters, flowers in clumps
      const tufts = [
        [[0, 0, 1], [1, -1, 3], [1, 0, 1], [2, -2, 4], [2, -1, 3], [2, 0, 1], [3, -1, 3], [3, 0, 1], [4, 0, 1]],
        [[0, 0, 1], [0, -1, 3], [1, 0, 1], [2, -1, 2], [2, -2, 3], [3, 0, 1]],
        [[0, 0, 1], [1, -1, 3], [2, 0, 1]],
        [[0, 0, 1], [1, 0, 1], [1, -1, 2], [1, -2, 4], [2, -1, 3], [3, 0, 1], [3, -1, 2]],
      ];
      const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !Lt.isPath[y * W + x] && Lt.depth[y * W + x] < 0 && !Lt.blocked(x, y);
      for (let gy = 2; gy < H; gy += 5) for (let gx = 0; gx < W; gx += 6) {
        const x = gx + Math.floor(LB.hash(gx, gy, 1) * 6), y = gy + Math.floor(LB.hash(gx, gy, 2) * 5);
        const cluster = LB.noise(x / 26, y / 20, 31);
        const nearEdge = !ok(x + 3, y + 3) || !ok(x - 3, y - 2) || !ok(x, y + 5);
        if (!ok(x, y)) continue;
        if (LB.hash(gx, gy, 3) > cluster * 0.9 + (nearEdge ? 0.45 : 0) - 0.1) continue;
        if (winter) { // a blade or two poking through the snow by things
          if (nearEdge || LB.hash(gx, gy, 4) < 0.12) { P.px(x, y, '#7a8a5a'); P.px(x + 1, y - 1, '#9aa86a'); P.px(x, y + 1, SNOW[1]); }
          else if (LB.hash(gx, gy, 5) < 0.3) P.px(x, y, SNOW[4]);
          continue;
        }
        const tf = tufts[Math.floor(LB.hash(gx, gy, 6) * tufts.length)];
        for (const [dx, dy, ti] of tf) P.px(x + dx, y + dy, G[ti]);
      }
      // grass spilling over the path's edge
      if (!winter) for (let y = 1; y < H - 2; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (Lt.isPath[i] && !Lt.isPath[i - W] && LB.hash(x, y, 9) < 0.35) { P.px(x, y, G[1]); if (LB.hash(x, y, 10) < 0.5) P.px(x, y + 1, G[2]); }
        if (Lt.isPath[i] && (!Lt.isPath[i - 1] || !Lt.isPath[i + 1]) && LB.hash(x, y, 11) < 0.25) P.px(x, y, G[2]);
      }
      // flowers
      const flower = (x, y, c) => { P.px(x, y + 1, G[0]); P.px(x - 1, y, c); P.px(x + 1, y, c); P.px(x, y - 1, LB.shade(c, 0.4)); P.px(x, y + 1, LB.shade(c, -0.45)); P.px(x, y, '#ffe27a'); };
      if (pal.flowers.length && !winter) {
        const fr = LB.rng(17);
        for (const [xt, yt] of LAY.clumps) {
          const c = pal.flowers[Math.floor(fr() * pal.flowers.length)];
          for (let k = 0; k < 7; k++) {
            const x = Math.round(xt * T + (fr() - 0.5) * 22), y = Math.round(yt * T + (fr() - 0.5) * 12);
            if (!ok(x, y)) continue;
            P.px(x - 1, y + 2, G[0]); P.px(x + 1, y + 2, G[1]);
            flower(x, y, k === 6 ? pal.flowers[Math.floor(fr() * pal.flowers.length)] : c);
          }
        }
        for (const [x0, yt, x1] of LAY.beds) for (let x = x0 * T + 3; x < x1 * T - 2; x += 4) {
          const y = Math.round(yt * T + 3 + LB.hash(x, 1, 3) * 3);
          P.rect(x - 2, y, 5, 3, G[0]); P.px(x - 1, y - 1, G[1]); P.px(x + 1, y - 1, G[1]);
          flower(x, y - 2, pal.flowers[Math.floor(LB.hash(x, 2, 3) * pal.flowers.length)]);
        }
      }
      // autumn leaves fallen under the tree and blown about
      if (pal.fallen && !winter) {
        const fr = LB.rng(23);
        for (let k = 0; k < 140; k++) {
          const near = k < 90;
          const x = Math.round(near ? LAY.tree[0] * T + (fr() - 0.5) * 120 : fr() * W), y = Math.round(near ? LAY.tree[1] * T - 20 + fr() * 60 : fr() * H);
          if (x < 0 || y < 0 || x >= W || y >= H || Lt.depth[y * W + x] >= 0) continue;
          const c = pal.fallen[Math.floor(fr() * pal.fallen.length)];
          P.px(x, y, c); if (fr() < 0.6) P.px(x + 1, y, LB.shade(c, -0.3));
        }
      }
      });
      // contact shade where things stand
      LB.contact(ctx, LAY.cottage[0] * T, LAY.cottage[1] * T, 70, 5, 0.3);
      LB.contact(ctx, LAY.tree[0] * T, LAY.tree[1] * T - 2, 14, 4, 0.35);
      LB.contact(ctx, LAY.lamp[0] * T, LAY.lamp[1] * T - 1, 5, 2, 0.35);
      return cv;
    });
  }

  // standing things, sorted, in one layer (+ the ones that reflect in their own layer)
  function objectsHi(season, snow) {
    return LB.memo('lad-objs-hi:' + season + ':' + snow, () => {
      const T = 32, Lt = layout(T), W = Lt.W, H = Lt.H;
      const items = [];
      items.push({ spr: cottageHi(season, snow), x: LAY.cottage[0] * T, y: LAY.cottage[1] * T, ay: 149, k: 0.42 });
      items.push({ spr: treeHi(season, snow), x: LAY.tree[0] * T, y: LAY.tree[1] * T, ay: 157, k: 0.85, refl: true });
      for (const [x0, x1, yt] of LAY.fences) { const len = Math.round((x1 - x0) * T); items.push({ spr: fenceHi(len, season, snow), x: x0 * T + len / 2, y: yt * T, k: 1 }); }
      items.push({ spr: lampHi(), x: LAY.lamp[0] * T, y: LAY.lamp[1] * T, k: 1, pole: true });
      for (const [xt, yt, s] of LAY.reeds) items.push({ spr: reedsHi(snow >= 1 ? 'winter' : season, s), x: xt * T, y: yt * T, k: 1, refl: true, base: yt * T });
      items.sort((a, b) => a.y - b.y);
      const all = LB.canvas(W, H), ac = LB.ctx2d(all);
      const rl = LB.canvas(W, H), rc = LB.ctx2d(rl);
      for (const it of items) {
        LB.blit(ac, it.spr, it.x, it.y, null, it.ay);
        if (it.refl) LB.blit(rc, it.spr, it.x, it.y, null, it.ay);
      }
      // the mirror line: just above the far shore, or a reed's foot where it stands in the water
      const axis = new Int16Array(W).fill(-1);
      for (let x = 0; x < W; x++) if (Lt.top[x] >= 0) axis[x] = Lt.top[x] - 8;
      for (const it of items) if (it.base) for (let x = Math.round(it.x - 13); x < it.x + 13; x++) if (x >= 0 && x < W && axis[x] >= 0) axis[x] = Math.max(axis[x], Math.round(it.base));
      const refl = mirrorFast(rl, axis);
      return { items, all, refl };
    });
  }

  // ======================================================================================================
  //  CLASSIC 16-BIT (16 px a tile): dark outlines, three flat tones, cheerful colours
  // ======================================================================================================
  const OUT = '#2a1a12';
  const C16 = {
    spring: { grass: ['#4ea63c', '#78c850', '#a4e070'], leaf: ['#4a9a38', '#72c24c', '#a2e070'], blossom: '#ffb8d0', flowers: ['#ff8ab8', '#fff070', '#ffffff'] },
    summer: { grass: ['#3c8e34', '#5cb43e', '#88d052'], leaf: ['#2c7430', '#45a03c', '#72c84e'], flowers: ['#ff4a3a', '#ffd23a', '#b46ae8', '#ffffff'] },
    autumn: { grass: ['#8a8a30', '#b0aa3c', '#d2c858'], leaf: ['#b4401e', '#e47a2a', '#f8b43c'], flowers: ['#b07ae0', '#ffc83a'], fallen: ['#e47a2a', '#c84a22', '#f8b43c'] },
    winter: { grass: ['#b8cce4', '#e2ecf8', '#ffffff'], leaf: null, flowers: [] },
  };
  const S16 = ['#b8cce4', '#e2ecf8', '#ffffff'];
  function cottage16(season, snow) {
    return LB.sprite('lad-cottage-16:' + season + ':' + snow, 78, 78, (P) => {
      const RF = ['#9a3426', '#cc5a3a', '#ee8656'], WL = ['#d2b482', '#f2dcaa', '#fff2cc'], TB = ['#5a341c', '#7e4c2a', '#a06a3c'], ST = ['#7a7468', '#a8a294', '#cac4b4'];
      // chimney
      // roof: rows of tiles, two tones
      P.rect(2, 15, 74, 34, RF[1]);
      for (let y = 15, i = 0; y < 49; y += 4, i++) {
        P.rect(2, y, 74, 1, RF[0]);
        for (let x = 2 + (i % 2) * 3; x < 76; x += 6) P.rect(x, y + 1, 1, 3, RF[0]);
      }
      P.rect(2, 15, 74, 2, RF[2]); P.rect(2, 12, 74, 3, RF[0]); P.rect(2, 12, 74, 1, RF[1]);
      const chim16 = () => { P.rect(57, 11, 8, 18, ST[1]); P.rect(57, 11, 2, 18, ST[2]); P.rect(63, 11, 2, 18, ST[0]); P.rect(56, 9, 10, 3, ST[0]); P.rect(56, 9, 10, 1, ST[2]); for (let y = 14; y < 28; y += 4) P.rect(59, y, 4, 1, ST[0]); if (snow > 0) P.rect(56, 8, 10, 1, '#ffffff'); };
      if (snow >= 1) { P.rect(2, 11, 74, 37, S16[1]); P.rect(2, 11, 74, 2, S16[2]); for (let x = 2; x < 76; x += 3) P.rect(x, 48, 2, 1 + (x % 2), S16[1]); for (let y = 20; y < 46; y += 8) P.rect(6, y, 66, 1, S16[0]); }
      else if (snow > 0) { for (let x = 4; x < 74; x += 7) P.rect(x, 13, 5, 2 + (x % 3), S16[2]); }
      chim16();
      // wall
      P.rect(7, 49, 64, 20, WL[1]); P.rect(7, 49, 64, 2, WL[0]);
      for (const x of [7, 28, 48, 68]) { P.rect(x, 49, 3, 20, TB[1]); P.rect(x, 49, 1, 20, TB[2]); }
      // windows
      for (const x of [13, 54]) {
        P.rect(x, 53, 11, 9, '#f6eedc'); P.rect(x + 1, 54, 9, 7, '#4a7aa8'); P.rect(x + 5, 54, 1, 7, '#f6eedc'); P.rect(x + 1, 57, 9, 1, '#f6eedc');
        P.rect(x + 1, 54, 2, 1, '#a8d4f0');
        P.rect(x - 1, 62, 13, 3, TB[1]);
        if (C16[season].flowers.length && snow < 1) for (let k = 0; k < 4; k++) P.px(x + 1 + k * 3, 61, C16[season].flowers[k % C16[season].flowers.length]);
      }
      // door
      P.rect(33, 54, 12, 15, TB[0]); P.rect(34, 55, 10, 14, '#3e7a6a'); P.rect(38, 55, 1, 14, '#2a5a4c'); P.rect(41, 62, 1, 1, '#ffd23a');
      P.rect(31, 51, 16, 3, RF[1]); P.rect(31, 53, 16, 1, RF[0]);
      // lantern
      P.rect(46, 58, 3, 4, '#2a2630'); P.px(47, 59, '#ffe8a0');
      // foundation and step
      P.rect(7, 69, 64, 5, ST[1]); for (let x = 7; x < 71; x += 6) P.rect(x, 69, 1, 5, ST[0]); P.rect(7, 69, 64, 1, ST[2]);
      P.rect(32, 72, 14, 4, ST[2]); P.rect(32, 75, 14, 1, ST[0]);
    }, { outline: OUT });
  }
  function tree16(season, snow) {
    return LB.sprite('lad-tree-16:' + season + ':' + snow, 72, 82, (P) => {
      const BK = ['#5e3a22', '#8a5a34', '#b07a46'];
      P.rect(32, 46, 8, 34, BK[1]); P.rect(32, 46, 2, 34, BK[2]); P.rect(38, 46, 2, 34, BK[0]); P.rect(29, 76, 14, 4, BK[1]); P.rect(29, 79, 14, 1, BK[0]);
      const pal = C16[season];
      if (!pal.leaf) {
        const br = (x, y, x2, y2) => { P.line(x, y, x2, y2, BK[1]); P.line(x + 1, y, x2 + 1, y2, BK[1]); if (snow) P.line(x, y - 1, x2, y2 - 1, S16[2]); };
        br(36, 48, 18, 24); br(36, 48, 54, 22); br(36, 50, 36, 12); br(24, 32, 14, 30); br(48, 30, 60, 30); br(36, 26, 28, 14); br(36, 24, 44, 12);
        return;
      }
      const lobes = [[36, 30, 22], [20, 34, 13], [52, 34, 13], [28, 18, 13], [45, 18, 12]];
      for (const [x, y, r] of lobes) P.disc(x, y, r, pal.leaf[1]);
      for (const [x, y, r] of lobes) P.disc(x + 3, y + 4, r - 5, pal.leaf[0]);
      for (const [x, y, r] of lobes) P.disc(x - 2, y - 2, r - 6, pal.leaf[1]);
      for (const [x, y, r] of lobes) P.disc(x - 4, y - 5, Math.max(2, r - 10), pal.leaf[2]);
      if (pal.blossom) for (let k = 0; k < 22; k++) { const x = 18 + LB.hash(k, 1, 5) * 38, y = 12 + LB.hash(k, 2, 5) * 32; P.rect(x, y, 2, 2, pal.blossom); }
    }, { outline: OUT });
  }
  function fence16(len, snow) {
    return LB.sprite('lad-fence-16:' + len + ':' + snow, len + 3, 13, (P) => {
      const F = ['#7a5232', '#a87848', '#cc9e64'];
      for (const y of [4, 8]) { P.rect(1, y, len, 2, F[1]); P.rect(1, y, len, 1, F[2]); }
      for (let x = 1; x < len; x += 11) { P.rect(x, 1, 3, 12, F[1]); P.rect(x, 1, 1, 12, F[2]); if (snow) P.rect(x, 0, 3, 1, '#ffffff'); }
    }, { outline: OUT });
  }
  function lamp16() {
    return LB.sprite('lad-lamp-16', 11, 30, (P) => {
      P.rect(5, 6, 2, 22, '#3a3646'); P.rect(3, 27, 6, 2, '#3a3646');
      P.rect(3, 1, 6, 6, '#3a3646'); P.rect(4, 2, 4, 4, '#e8e4d0');
    }, { outline: OUT });
  }
  function reeds16(season, seed) {
    return LB.sprite('lad-reeds-16:' + season + ':' + seed, 14, 19, (P) => {
      const c = season === 'winter' ? ['#8a6a3a', '#b08a52'] : season === 'autumn' ? ['#8a7a32', '#b8a446'] : ['#3c8a34', '#64b244'];
      for (let i = 0; i < 7; i++) { const x = 2 + LB.hash(i, seed, 1) * 10, h = 7 + LB.hash(i, seed, 2) * 8; P.line(x, 18, x + (i % 3) - 1, 18 - h, c[i % 2]); }
      P.rect(4, 3, 2, 4, '#8a4e26'); P.rect(9, 5, 2, 4, '#8a4e26'); P.px(4, 3, '#b06a36'); P.px(9, 5, '#b06a36');
      P.rect(3, 15, 9, 3, c[0]); P.rect(4, 14, 3, 1, c[1]);
    }, { outline: OUT });
  }
  // the classic villager: 12 × 22, a straw hat, three walking frames, front and back
  function person16(dir, frame) {
    return LB.sprite('lad-p16:' + dir + ':' + frame, 14, 24, (P) => {
      const skin = '#f2c08a', hat = '#e8c45a', hatD = '#b8902e', shirt = '#d84a3a', shirtD = '#a8302a', pants = '#3a5aa8', pantsD = '#2a3e7a', boot = '#4a2e1e';
      const lx = frame === 1 ? -1 : 0, rx = frame === 2 ? 1 : 0, ly = frame === 1 ? -1 : 0, ry = frame === 2 ? -1 : 0;
      P.rect(3 + lx, 17 + ly, 3, 5, pants); P.rect(8 + rx, 17 + ry, 3, 5, pantsD);
      P.rect(3 + lx, 21 + ly, 3, 2, boot); P.rect(8 + rx, 21 + ry, 3, 2, boot);
      P.rect(2, 10, 10, 8, shirt); P.rect(9, 10, 3, 8, shirtD); P.rect(4, 11, 6, 7, pants);
      P.rect(1, 11 + (frame === 2 ? 1 : 0), 2, 5, shirt); P.rect(11, 11 + (frame === 1 ? 1 : 0), 2, 5, shirtD);
      P.rect(1, 16 + (frame === 2 ? 1 : 0), 2, 1, skin); P.rect(11, 16 + (frame === 1 ? 1 : 0), 2, 1, skin);
      P.rect(3, 3, 8, 7, skin); P.rect(9, 3, 2, 7, '#d8a070');
      if (dir === 'down') { P.px(5, 6, '#2a1a12'); P.px(8, 6, '#2a1a12'); P.px(4, 8, '#f09a8a'); P.px(9, 8, '#f09a8a'); }
      else P.rect(3, 4, 8, 6, '#7a4a2a');
      P.rect(0, 2, 14, 2, hat); P.rect(2, 0, 10, 3, hat); P.rect(0, 3, 14, 1, hatD); P.rect(3, 2, 8, 1, '#c84a3a');
    }, { outline: OUT });
  }

  function ground16(season, snow, wet) {
    return LB.memo('lad-ground-16:' + season + ':' + snow + ':' + wet, () => {
      const T = 16, Lt = layout(T), W = Lt.W, H = Lt.H;
      const cv = LB.canvas(W, H), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const winter = snow >= 1, pal = C16[season];
      const G = pal.grass;
      P.rect(0, 0, W, H, G[1]);
      const PT = winter ? ['#9aaac4', '#c4d0e2', '#dee6f2'] : wet ? ['#8a6440', '#a87e52', '#c09464'] : ['#b48a54', '#dcb47c', '#f0d29c'];
      ctx.drawImage(LB.silhouette(Lt.path, PT[1]), 0, 0);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (Lt.isPath[i] && (!Lt.isPath[i + W])) P.px(x, y, PT[0]);
        if (Lt.isPath[i] && !Lt.isPath[i - W]) P.px(x, y, PT[2]);
      }
      if (wet) ctx.drawImage(LB.silhouette(Lt.pud, '#5a6a8a'), 0, 0);
      // water: one flat blue with a lighter rim
      const id = ctx.getImageData(0, 0, W, H), d = id.data;
      const deep = LB.rgb(winter ? '#a8cce8' : '#3a8ad8'), rim = LB.rgb(winter ? '#d4e8f8' : '#6cb4ec');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dd = Lt.depth[y * W + x]; if (dd < 0) continue;
        const c = dd > 0.9 ? rim : deep, i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
      ctx.putImageData(id, 0, 0);
      for (let x = 0; x < W; x++) if (Lt.top[x] >= 0) { P.px(x, Lt.top[x], '#7a5a3a'); P.px(x, Lt.top[x] + 1, '#5a3e28'); }
      // simple tufts on a loose grid
      for (let gy = 3; gy < H; gy += 7) for (let gx = 2; gx < W; gx += 9) {
        const x = gx + Math.floor(LB.hash(gx, gy, 1) * 6), y = gy + Math.floor(LB.hash(gx, gy, 2) * 4);
        if (Lt.isPath[y * W + x] || Lt.depth[y * W + x] >= 0 || Lt.blocked(x, y) || LB.hash(gx, gy, 3) < 0.45) continue;
        if (winter) { P.px(x, y, S16[2]); continue; }
        P.px(x, y, G[0]); P.px(x + 2, y, G[0]); P.px(x + 1, y + 1, G[0]); P.px(x, y - 1, G[2]); P.px(x + 2, y - 1, G[2]);
      }
      if (pal.flowers.length && !winter) for (const [xt, yt] of LAY.clumps) for (let k = 0; k < 3; k++) {
        const x = Math.round(xt * T + (LB.hash(k, xt * 10, 4) - 0.5) * 10), y = Math.round(yt * T + (LB.hash(k, yt * 10, 5) - 0.5) * 6);
        if (Lt.isPath[y * W + x] || Lt.depth[y * W + x] >= 0) continue;
        P.px(x, y, pal.flowers[k % pal.flowers.length]); P.px(x, y + 1, G[0]);
      }
      if (pal.fallen && !winter) for (let k = 0; k < 40; k++) {
        const x = Math.round(LAY.tree[0] * T + (LB.hash(k, 1, 6) - 0.5) * 60), y = Math.round(LAY.tree[1] * T - 10 + LB.hash(k, 2, 6) * 30);
        if (Lt.depth[y * W + x] >= 0) continue;
        P.px(x, y, pal.fallen[k % 3]);
      }
      return cv;
    });
  }
  function objects16(season, snow) {
    return LB.memo('lad-objs-16:' + season + ':' + snow, () => {
      const T = 16, Lt = layout(T), W = Lt.W, H = Lt.H;
      const items = [];
      items.push({ spr: cottage16(season, snow), x: LAY.cottage[0] * T, y: LAY.cottage[1] * T + 2, ay: 76, rx: 36, ry: 4 });
      items.push({ spr: tree16(season, snow), x: LAY.tree[0] * T, y: LAY.tree[1] * T, ay: 80, rx: 12, ry: 3, refl: true });
      for (const [x0, x1, yt] of LAY.fences) { const len = Math.round((x1 - x0) * T); items.push({ spr: fence16(len, snow), x: x0 * T + len / 2, y: yt * T, rx: len / 2, ry: 1 }); }
      items.push({ spr: lamp16(), x: LAY.lamp[0] * T, y: LAY.lamp[1] * T, rx: 3, ry: 1 });
      for (const [xt, yt, s] of LAY.reeds) items.push({ spr: reeds16(snow >= 1 ? 'winter' : season, s), x: xt * T, y: yt * T, rx: 5, ry: 1, refl: true, base: yt * T });
      items.sort((a, b) => a.y - b.y);
      const all = LB.canvas(W, H), ac = LB.ctx2d(all), rl = LB.canvas(W, H), rc = LB.ctx2d(rl);
      for (const it of items) { LB.blit(ac, it.spr, it.x, it.y, null, it.ay); if (it.refl) LB.blit(rc, it.spr, it.x, it.y, null, it.ay); }
      const axis = new Int16Array(W).fill(-1);
      for (let x = 0; x < W; x++) if (Lt.top[x] >= 0) axis[x] = Lt.top[x] - 4;
      for (const it of items) if (it.base) for (let x = Math.round(it.x - 7); x < it.x + 7; x++) if (x >= 0 && x < W && axis[x] >= 0) axis[x] = Math.max(axis[x], Math.round(it.base));
      return { items, all, refl: mirrorFast(rl, axis) };
    });
  }

  // ======================================================================================================
  //  the three defs
  // ======================================================================================================
  const tmpFor = (W, H, slot) => LB.memo('lad-tmp:' + W + 'x' + H + ':' + slot, () => LB.canvas(W, H));
  function tint(ctx, mask, color, alpha, slot) {
    const t = tmpFor(mask.width, mask.height, slot || 't'), c = LB.ctx2d(t);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, t.width, t.height);
    c.drawImage(mask, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, t.width, t.height);
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(t, 0, 0); ctx.restore();
  }
  // the walker on the path: down to the bottom, then back up to the door
  function walker(S, T) {
    const period = 22, k = (S.t % period) / period;
    const going = k < 0.5, s = going ? k * 2 : (1 - k) * 2;
    const idx = Math.min(PATH.length - 2, Math.floor((0.08 + s * 0.8) * (PATH.length - 1)));
    const f = (0.08 + s * 0.8) * (PATH.length - 1) - idx;
    const x = (PATH[idx][0] + (PATH[idx + 1][0] - PATH[idx][0]) * f) * T, y = (PATH[idx][1] + (PATH[idx + 1][1] - PATH[idx][1]) * f) * T;
    return { x: Math.round(x), y: Math.round(y), dir: going ? 'down' : 'up' };
  }
  function smoke(ctx, S, x, y, scale, hi) {
    const P = LB.paint(ctx);
    const n = hi ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const k = ((S.t * 0.18 + i / n) % 1);
      const px = x + k * 26 * scale + Math.sin(S.t * 0.8 + i * 2) * 2 * scale, py = y - k * 46 * scale;
      const r = (1.5 + k * 5) * scale;
      ctx.save(); ctx.globalAlpha = (1 - k) * (S.snow >= 1 ? 0.7 : 0.55);
      if (hi) { P.disc(px, py, r, '#d8d6dc'); P.disc(px - r * 0.3, py - r * 0.3, Math.max(1, r * 0.55), '#f2f0f2'); }
      else P.disc(px, py, Math.round(r), '#e8e8ee');
      ctx.restore();
    }
  }

  const reflTmp = () => LB.memo('lad-reftmp', () => LB.canvas(480, 270));
  const ICE = R5('#a9cbe2', { spread: 0.8 });
  function iceHi() {
    return LB.memo('lad-ice-hi', () => {
      const T = 32, Lt = layout(T), W = Lt.W, H = Lt.H;
      const c = LB.canvas(W, H), x = LB.ctx2d(c);
      const open = new Uint8Array(W * H), nn = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
        const i = y * W + xx, dd = Lt.depth[i]; if (dd < 0) continue;
        if (dd < 0.22 + LB.noise(xx / 30, y / 18, 61) * 0.14) open[i] = 1;
        nn[i] = LB.noise(xx / 34, y / 14, 62);
      }
      fastPaint(x, W, H, (Q) => {
        for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
          const i = y * W + xx, dd = Lt.depth[i]; if (dd < 0 || open[i]) continue;
          const n = nn[i];
          // snow lying on the ice near the banks, clear blue ice further out, long pale sheen streaks
          if (dd > 0.86 + (n - 0.5) * 0.18) { Q.px(xx, y, n > 0.5 ? SNOW[3] : SNOW[2]); continue; }
          const streak = Math.sin((xx * 0.5 - y * 1.3) * 0.18 + n * 3);
          Q.px(xx, y, streak > 0.93 ? ICE[4] : n > 0.6 ? ICE[3] : n < 0.32 ? ICE[1] : ICE[2]);
        }
        const r = LB.rng(4);
        for (let k = 0; k < 10; k++) {
          let px = LAY.pond.cx * T + (r() - 0.5) * 220, py = LAY.pond.cy * T - 50 + r() * 70, a = r() * Math.PI * 2;
          for (let s2 = 0; s2 < 34; s2++) {
            const xi = Math.round(px), yi = Math.round(py), i = yi * W + xi;
            if (xi > 0 && yi > 0 && xi < W && yi < H && Lt.depth[i] >= 0 && Lt.depth[i] < 0.86 && !open[i]) { Q.px(xi, yi, ICE[0]); Q.px(xi, yi - 1, ICE[4]); }
            a += (r() - 0.5) * 0.8; px += Math.cos(a) * 1.5; py += Math.sin(a) * 0.8;
          }
        }
        // the open water's white rim
        for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
          const i = y * W + xx;
          if (open[i] && (!open[i - 1] || !open[i + 1] || !open[i - W] || !open[i + W])) Q.px(xx, y, '#eef6fc');
        }
      });
      return c;
    });
  }
  // build the other seasons' art in idle moments after load, so a season switch doesn't stall the page
  let warmed = false;
  function warm(hi) {
    if (warmed) return; warmed = true;
    const jobs = [];
    for (const season of ['summer', 'autumn', 'winter', 'spring']) {
      const sn = season === 'winter' ? 1 : 0;
      jobs.push(() => objects16(season, sn), () => ground16(season, sn, 0), () => objectsHi(season, sn), () => groundHi(season, sn, 0));
    }
    jobs.push(() => iceHi(), () => padsHi('autumn'), () => padsHi('spring'));
    for (const season of ['summer', 'autumn', 'spring']) jobs.push(() => groundHi(season, 0, 1), () => objectsHi(season, 0.5), () => groundHi(season, 0.5, 0));
    const later = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 1500 }) : (f) => setTimeout(f, 60);
    const step = () => { const j = jobs.shift(); if (!j) return; try { j(); } catch (e) { /* drawn on demand instead */ } later(step); };
    later(step);
  }
  function padsHi(season) {
    return LB.memo('lad-pads-hi:' + season, () => {
      const T = 32, c = LB.canvas(480, 270), P = LB.paint(LB.ctx2d(c));
      const pads = [[11.1, 6.6], [12.4, 7.25], [10.4, 7.6], [13.6, 6.5], [11.75, 6.85]];
      const col = season === 'autumn' ? ['#7a7a30', '#a89a40', '#c8bc5c'] : ['#2a6232', '#3d863a', '#62aa4c'];
      pads.forEach(([xt, yt], i) => {
        const x = Math.round(xt * T), y = Math.round(yt * T), rx = i === 4 ? 4 : 6, ry = i === 4 ? 2 : 3;
        P.ellipse(x, y + 1, rx, ry, col[0]); P.ellipse(x, y, rx, ry, col[1]); P.ellipse(x - 1, y - 1, Math.ceil(rx / 2), 1, col[2]);
        P.px(x + rx - 1, y - 1, col[0]); P.px(x + rx - 2, y, col[0]);
        if (i === 1 && season !== 'autumn') { P.rect(x - 2, y - 3, 5, 3, '#f2bccf'); P.rect(x - 1, y - 4, 3, 1, '#ffe4ee'); P.px(x, y - 2, '#ffd84a'); P.px(x - 2, y - 1, '#d888a8'); P.px(x + 2, y - 1, '#d888a8'); }
      });
      return c;
    });
  }
  // the sky in the water, after the grade: horizon colour at the far shore, the higher sky toward us, cut away where
  // the reflected tree and the pads are; then the light on the surface (lines, the bank's bright edge, glints, rings)
  function skyWater(ctx, S, P) {
    const T = 32, Lt = layout(T), winter = S.snow >= 1;
    const sk = LB.memo('lad-skytmp', () => LB.canvas(480, 270)), c = LB.ctx2d(sk);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, 480, 270);
    const g = c.createLinearGradient(0, 150, 0, 270);
    g.addColorStop(0, S.L.skyHor); g.addColorStop(0.55, LB.mix(S.L.skyHor, S.L.skyTop, 0.45)); g.addColorStop(1, S.L.skyTop);
    c.fillStyle = g; c.fillRect(0, 0, 480, 270);
    c.globalCompositeOperation = 'destination-in'; c.drawImage(S.wet ? Lt.wet : Lt.pond, 0, 0);
    c.globalCompositeOperation = 'destination-out';
    c.globalAlpha = 0.8; c.drawImage(reflTmp(), 0, 0);
    c.globalAlpha = 1; c.drawImage(winter ? iceHi() : padsHi(S.season), 0, 0);
    ctx.save(); ctx.globalAlpha = winter ? 0.55 : 0.46 + 0.16 * S.L.golden; ctx.drawImage(sk, 0, 0); ctx.restore();
    if (S.wet) LB.rings(ctx, Lt.pudPts, S, { period: 1.1, r: 4, alpha: 0.5 });
    if (winter) { LB.glints(ctx, Lt.pondPts, S, { rate: 0.6 }); return; }
    const lines = LB.memo('lad-lines-hi', () => LB.maskPoints(Lt.pond, 40, 31));
    const lc = LB.mix(S.L.skyHor, '#ffffff', 0.45);
    ctx.save();
    for (const [x, y, ph] of lines) {
      const v = Math.sin(S.t * 0.7 + ph * 20);
      if (v < 0.3) continue;
      ctx.globalAlpha = (v - 0.3) * 0.45;
      P.rect(x + Math.round(Math.sin(S.t * 0.4 + ph * 9) * 2), y, 2 + Math.round(ph * 4), 1, lc);
    }
    ctx.globalAlpha = 0.5;
    for (let x = 0; x < Lt.W; x++) {
      const t = Lt.top[x]; if (t < 0) continue;
      const nx = (x / T - LAY.pond.cx) / LAY.pond.rx, face = Math.round(4 * Math.max(0, 1 - Math.abs(nx) * 1.1));
      if (LB.noise(x * 0.15 + S.t * 0.6, 1, 3) > 0.42) P.px(x, t + face, LB.mix(lc, '#ffffff', 0.4));
    }
    ctx.restore();
    LB.glints(ctx, Lt.pondPts, S);
    if (S.wet) LB.rings(ctx, Lt.wetPts, S, { period: 1.3, r: 5, alpha: 0.5 });
    else LB.rings(ctx, Lt.pondPts.slice(0, 2), S, { period: 5, r: 7, alpha: 0.35 });
  }

  function hiDef(id, order, finish, extra) {
    const T = 32;
    return Object.assign({
      id, order, section: 'ladder', w: 480, h: 270, finish,
      init() { warm(); },
      ground(ctx, S) { ctx.drawImage(groundHi(S.season, S.snow, S.wet), 0, 0); },
      shadows(sh, S) {
        const O = objectsHi(S.season, S.snow);
        for (const it of O.items) {
          if (it.pole) { sh.pole(it.x, it.y, 56, 3); continue; }
          sh.cast(it.spr, it.x, it.y, null, it.ay, { k: it.k });
        }
      },
      objects(ctx, S) { ctx.drawImage(objectsHi(S.season, S.snow).all, 0, 0); },
      // Before the grade: the world upside down in the water, lily pads, ice. The sky's own light goes on after the
      // grade (skyWater), so a golden or night sky isn't darkened twice and the water glows the way it should.
      water(ctx, S, P) {
        const Lt = layout(T), O = objectsHi(S.season, S.snow);
        const winter = S.snow >= 1;
        const rt = reflTmp(), rc = LB.ctx2d(rt);
        rc.globalCompositeOperation = 'source-over'; rc.globalAlpha = 1; rc.clearRect(0, 0, rt.width, rt.height);
        LB.ripple(rc, O.refl, Lt.pond, S, winter ? { amp: 0, alpha: 1, slot: 'lad' } : { amp: 1.2, freq: 0.5, speed: 1.6, alpha: 1, grow: true, slot: 'lad' });
        ctx.save(); ctx.globalAlpha = winter ? 0.3 : 0.62; ctx.drawImage(rt, 0, 0); ctx.restore();
        if (winter) { ctx.drawImage(iceHi(), 0, 0); return; }
        ctx.drawImage(padsHi(S.season), 0, 0);
      },
      live(ctx, S, P) {
        smoke(ctx, S, LAY.cottage[0] * T - 77 + 119, LAY.cottage[1] * T - 149 + 18, 1, true);
        const w = walker(S, T);
        LB.person(ctx, w.x, w.y, 'farmer', { dir: w.dir, walk: true, t: S.t, seed: 2 });
        if (S.season === 'summer' && S.L.night > 0.5 && S.weather === 'clear') LB.motes(ctx, S, { n: 16, blink: true, colors: ['#f6ff9a', '#d8ff7a'], y: 90, h: 170 });
        else if (S.L.night < 0.4 && S.weather === 'clear' && S.season !== 'winter') LB.motes(ctx, S, { n: 10, colors: ['#fff8d8'], y: 40, h: 200 });
        if (S.season === 'autumn' && S.weather !== 'snow') LB.motes(ctx, S, { n: 8, fall: 9, colors: HI.autumn.fallen, x: 230, w: 160, y: 20, h: 150, seed: 3 });
      },
      emissive(ctx, S, P) { windowsGlow(ctx, S, P, T); },
      after(ctx, S, P) { skyWater(ctx, S, P); },
      lights(S) {
        const cx = LAY.cottage[0] * T - 77, cy = LAY.cottage[1] * T - 149;
        return [
          { x: LAY.lamp[0] * T, y: LAY.lamp[1] * T - 52, r: 62, c: '#ffbe6a', flicker: 0.6 },
          { x: cx + 90, y: cy + 119, r: 34, c: '#ffb050', flicker: 1 },
          { x: cx + 34, y: cy + 136, r: 30, c: '#ffc070', sq: 0.6, i: 0.8 },
          { x: cx + 118, y: cy + 136, r: 30, c: '#ffc070', sq: 0.6, i: 0.8 },
        ];
      },
    }, extra);
  }
  // lit windows: the panes and the lamp glass, brightening as night comes on
  function windowsGlow(ctx, S, P, T) {
    const on = LB.smooth(0.12, 0.6, S.L.night);
    if (on <= 0.01) return;
    ctx.save(); ctx.globalAlpha = on;
    if (T === 32) {
      const ox = Math.round(LAY.cottage[0] * T - 77), oy = Math.round(LAY.cottage[1] * T - 149);
      for (const x0 of [24, 108]) {
        P.rect(ox + x0 + 2, oy + 109, 16, 15, '#ffd27a');
        P.rect(ox + x0 + 3, oy + 110, 5, 4, '#fff0c0');
        P.rect(ox + x0 + 9, oy + 109, 2, 15, '#6a4a3a'); P.rect(ox + x0 + 2, oy + 115, 16, 2, '#6a4a3a');
      }
      P.rect(ox + 42, oy + 61, 9, 9, '#ffc868'); P.rect(ox + 46, oy + 61, 1, 9, '#6a4a3a'); P.rect(ox + 42, oy + 65, 9, 1, '#6a4a3a');
      P.rect(ox + 89, oy + 116, 3, 6, '#fff2b0');
      const lx = Math.round(LAY.lamp[0] * T - 11), ly = Math.round(LAY.lamp[1] * T - 60);
      P.rect(lx + 8, ly + 5, 7, 6, '#ffe8a0'); P.rect(lx + 11, ly + 5, 1, 6, '#c08a4a'); P.rect(lx + 9, ly + 6, 2, 2, '#fffbe0');
    } else {
      const ox = Math.round(LAY.cottage[0] * T - 39), oy = Math.round(LAY.cottage[1] * T + 2 - 76);
      for (const x of [13, 54]) { P.rect(ox + x + 1, oy + 54, 9, 7, '#ffd27a'); P.rect(ox + x + 5, oy + 54, 1, 7, '#8a5a3a'); P.rect(ox + x + 1, oy + 57, 9, 1, '#8a5a3a'); }
      P.px(ox + 47, oy + 59, '#fff0b0');
      const lx = Math.round(LAY.lamp[0] * T - 5), ly = Math.round(LAY.lamp[1] * T - 30);
      P.rect(lx + 4, ly + 2, 4, 4, '#ffe8a0');
    }
    ctx.restore();
  }

  LB.add({
    id: 'ladder-16', order: 10, section: 'ladder', w: 240, h: 135, finish: 'clean',
    name: 'Classic 16-bit', world: 'Like Stardew Valley',
    blurb: 'Stardew Valley’s look: 16 pixels to a tile, so every pixel is twice the size. Simple shapes, flat colours, dark outlines.',
    see: [
      'A dark outline round everything, and three flat shades per colour',
      'Bright, cheerful colours with very little texture',
      'Shadows are plain ovals that never move with the sun',
    ],
    build: 'The biggest change of the three. Every sprite, tile and character would be redrawn smaller and simpler, and the engine would switch to a 16 px grid. It reads clean and classic, but it throws away detail the Bridge already has.',
    clouds: false,
    init() { warm(); },
    ground(ctx, S) { ctx.drawImage(ground16(S.season, S.snow, S.wet), 0, 0); },
    shadows(sh, S) { for (const it of objects16(S.season, S.snow).items) sh.blob(it.x, it.y, it.rx, it.ry); },
    objects(ctx, S) { ctx.drawImage(objects16(S.season, S.snow).all, 0, 0); },
    water(ctx, S, P) {
      const T = 16, Lt = layout(T), O = objects16(S.season, S.snow);
      if (S.wet) tint(ctx, Lt.pud, LB.mix(S.L.skyTop, '#5a6a8a', 0.3), 0.6, 'pud16');
      if (S.snow >= 1) {
        // frozen over: flat ice with a few white streaks
        tint(ctx, Lt.pond, '#9cc8ea', 1, 'ice16');
        for (const [x, y, ph] of Lt.pondPts) if (ph < 0.5) P.rect(x, y, 4, 1, '#d8ecfa');
        for (let x = 0; x < Lt.W; x++) if (Lt.top[x] >= 0) P.px(x, Lt.top[x] + 2, '#ffffff');
        return;
      }
      LB.ripple(ctx, O.refl, Lt.pond, S, { amp: 1, freq: 0.7, speed: 1.4, alpha: 0.32 });
      // the white shimmer dashes Stardew's water has
      for (const [x, y, ph] of Lt.pondPts) {
        const v = Math.sin(S.t * 0.9 + ph * 30);
        if (v > 0.55) P.rect(x + Math.round(Math.sin(S.t * 0.5 + ph * 7) * 2), y, v > 0.85 ? 3 : 2, 1, '#e8f6ff');
      }
      if (S.wet) LB.rings(ctx, Lt.wetPts.slice(0, 20), S, { period: 1.2, r: 3, alpha: 0.7, color: '#e8f6ff' });
    },
    live(ctx, S) {
      smoke(ctx, S, LAY.cottage[0] * 16 - 39 + 61, LAY.cottage[1] * 16 + 2 - 76 + 8, 0.5, false);
      const w = walker(S, 16);
      const frame = Math.floor(S.t * 6) % 4, f = frame === 1 ? 1 : frame === 3 ? 2 : 0;
      LB.blit(ctx, person16(w.dir, f), w.x, w.y);
    },
    emissive(ctx, S, P) { windowsGlow(ctx, S, P, 16); },
    lights(S) {
      const T = 16;
      return [
        { x: LAY.lamp[0] * T, y: LAY.lamp[1] * T - 26, r: 26, c: '#ffbe6a' },
        { x: LAY.cottage[0] * T + 9, y: LAY.cottage[1] * T - 14, r: 16, c: '#ffb050' },
      ];
    },
  });

  LB.add(hiDef('ladder-32', 11, 'clean', {
    name: 'Hi-res pixel', world: 'Like Eastward and Sea of Stars',
    blurb: 'Our own grid of 32 pixels a tile, used the way Eastward and Sea of Stars use it: twice Stardew’s detail, with every pixel still placed on purpose.',
    see: [
      'Soft coloured outlines: each edge is a deeper shade of whatever it borders',
      'Five shades per colour, cooler in shadow and warmer in the light',
      'Texture built from small clusters: shingles, stones, leaves, tufts of grass',
      'Shadows that swing and stretch with the sun through the day',
    ],
    build: 'The engine stays as it is; this is the same 32 px grid the game already uses. The art gets redrawn or re-finished to this standard: trees, ground, water, buildings and people. A big art job, but no engine rework.',
  }));

  LB.add(hiDef('ladder-hd', 12, 'hd2d', {
    name: 'Hi-res + HD-2D light', world: 'Like Octopath Traveler · recommended',
    blurb: 'The same hi-res art under Octopath Traveler’s lighting. This is the direction we recommend: Stardew’s readable pixel art, lit like Octopath.',
    see: [
      'Shafts of light slanting through the scene',
      'Windows, lamps and sparkles on the water glow softly',
      'The top and bottom of the view drift out of focus, like a model village',
      'A little more contrast and colour overall',
    ],
    build: 'Hi-res art plus a few screen effects in the engine: glow, depth of field and light shafts. The effects are the cheap part, and they lift every scene at once.',
    after(ctx, S, P) {
      skyWater(ctx, S, P);
      LB.rays(ctx, S, { n: 4, angle: 0.62, width: 30, alpha: 0.13, x0: -60, spacing: 120 });
    },
    bloom(ctx, S) {
      const Lt = layout(32);
      LB.glints(ctx, Lt.pondPts, S);
      if (S.L.night < 0.5) LB.rays(ctx, S, { n: 4, angle: 0.62, width: 30, alpha: 0.08, x0: -60, spacing: 120 });
    },
  }));
})();
