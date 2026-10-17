// Verdance — Millrace Farm. An upper terrace with a stone step, a waterfall into a millpond, the farmhouse and its
// trees mirrored in the water, a field through the year. Every season, the whole day, rain, snow and fog.
(function () {
  'use strict';
  const W = 480, H = 270;
  const hash = LB.hash, noise = LB.noise, fbm = LB.fbm, clamp = LB.clamp, rgb = LB.rgb;

  // ---------- the lie of the land (never changes) ----------
  const STEP0 = 140, STEP1 = 163;          // the stair cut into the step
  const WF0 = 322, WF1 = 338;              // the waterfall's columns
  const HOUSE = { x: 235, y: 92 };         // the farmhouse sprite's bottom-centre (door at x 235)
  const DOCK = { x0: 243, x1: 262, y0: 202, y1: 248 };
  const FIELD = { x0: 10, x1: 118, y0: 174, y1: 258 };
  const POND = { cx: 302, rx: 138, cy: 186, up: 64, down: 52 };
  const GRASS = { spring: '#7ab84e', summer: '#4f993d', autumn: '#8e9a47' };

  function catmull(pts, step) {
    const out = [];
    let s = 0, px = null, py = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (step || 1)));
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        const x = f(0), y = f(1);
        if (px != null) s += Math.hypot(x - px, y - py);
        px = x; py = y;
        out.push([x, y, s]);
      }
    }
    const l = pts[pts.length - 1];
    out.push([l[0], l[1], s + Math.hypot(l[0] - px, l[1] - py)]);
    return out;
  }

  const lay = () => LB.memo('verd-layout', () => {
    const L = {};
    const LIP = new Int16Array(W), FOOT = new Int16Array(W);
    for (let x = 0; x < W; x++) {
      LIP[x] = Math.round(100 + 3 * Math.sin(x * 0.035 + 0.5) + 2 * Math.sin(x * 0.11 + 2));
      FOOT[x] = Math.round(134 + 3 * Math.sin(x * 0.028 + 1.3) + 1.5 * Math.sin(x * 0.13));
    }
    let st = 0, sb = 0;
    for (let x = STEP0; x <= STEP1; x++) { st += LIP[x]; sb += FOOT[x]; }
    st = Math.round(st / (STEP1 - STEP0 + 1)); sb = Math.round(sb / (STEP1 - STEP0 + 1));
    for (let x = STEP0 - 8; x <= STEP1 + 8; x++) {
      const k = x < STEP0 ? (STEP0 - x) / 8 : x > STEP1 ? (x - STEP1) / 8 : 0, f = 1 - k;
      LIP[x] = Math.round(LIP[x] * k + st * f); FOOT[x] = Math.round(FOOT[x] * k + sb * f);
    }
    L.LIP = LIP; L.FOOT = FOOT; L.stTop = st; L.stBot = sb;

    // the millpond
    const pond = new Uint8Array(W * H), PT = new Int16Array(W).fill(-1), PB = new Int16Array(W).fill(-1);
    for (let x = 0; x < W; x++) {
      const ex = (x - POND.cx) / POND.rx;
      if (Math.abs(ex) >= 0.99) continue;
      const s = Math.sqrt(1 - ex * ex);
      const top = Math.max(FOOT[x], Math.round(POND.cy - POND.up * s + (noise(x * 0.07, 3.3, 41) - 0.5) * 6));
      const bot = Math.round(POND.cy + POND.down * s + (noise(x * 0.06, 7.1, 42) - 0.5) * 8);
      if (bot - top < 2) continue;
      PT[x] = top; PB[x] = bot;
      for (let y = top; y <= bot; y++) pond[y * W + x] = 1;
    }
    L.pond = pond; L.PT = PT; L.PB = PB;
    // how far each pond pixel is from the low banks (the cliff side runs deep)
    const dist = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      dist[i] = pond[i] ? 1e6 : (y > FOOT[x] ? 0 : 1e6);
    }
    for (let y = 1; y < H; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!pond[i]) continue;
      dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - W] + 1, dist[i - W - 1] + 1.41, dist[i - W + 1] + 1.41);
    }
    for (let y = H - 2; y >= 0; y--) for (let x = W - 2; x > 0; x--) {
      const i = y * W + x;
      if (!pond[i]) continue;
      dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + W] + 1, dist[i + W + 1] + 1.41, dist[i + W - 1] + 1.41);
    }
    L.dist = dist;
    // shore pixels: pond pixels touching land on the low side (for the lapping line)
    L.shore = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!pond[i] || y <= FOOT[x] + 1) continue;
      if (!pond[i + W] || !pond[i - 1] || !pond[i + 1] || (!pond[i - W] && y > FOOT[x] + 2)) L.shore.push([x, y]);
    }

    // paths
    const path = new Uint8Array(W * H);
    const stroke = (pts, r0, seed) => {
      for (const [x, y, s] of catmull(pts, 0.7)) {
        const r = r0 + (noise(s * 0.08, 0.5, seed) - 0.5) * 2.8;
        const ri = Math.ceil(r);
        for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const X = Math.round(x + dx), Y = Math.round(y + dy);
          if (X >= 0 && Y >= 0 && X < W && Y < H) path[Y * W + X] = 1;
        }
      }
    };
    L.mainPath = [[150, H + 8], [147, 248], [139, 224], [146, 198], [141, 172], [149, 150], [151, sb + 3]];
    stroke(L.mainPath, 5.2, 1);
    L.dockPath = [[146, 251], [176, 253], [208, 251], [236, 250], [252, 249]];
    stroke(L.dockPath, 4.2, 2);
    stroke([[151, st + 2], [158, st - 3], [178, 96], [204, 95], [226, 94], [236, 93]], 4, 3);
    for (let i = 0; i < W * H; i++) if (pond[i]) path[i] = 0;
    L.path = path;

    // the stream on the terrace, feeding the fall
    const stream = new Uint8Array(W * H), sS = new Float32Array(W * H);
    const sp = catmull([[394, -12], [377, 16], [391, 42], [366, 70], [333, LIP[330] + 2]], 0.5);
    for (const [x, y, s] of sp) {
      const r = 4 + 3.5 * LB.smooth(70, LIP[330], y) + (noise(s * 0.1, 2, 9) - 0.5) * 1.6;
      const ri = Math.ceil(r);
      for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const X = Math.round(x + dx), Y = Math.round(y + dy);
        if (X < 0 || Y < 0 || X >= W || Y >= H || Y >= LIP[X]) continue;
        stream[Y * W + X] = 1; sS[Y * W + X] = s;
      }
    }
    L.stream = stream;
    L.streamPx = [];
    for (let y = 0; y < H; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!stream[i]) continue;
      let e = 3;
      for (let k = 1; k <= 3; k++) if (!stream[i - k] || !stream[i + k] || (y - k >= 0 && !stream[i - k * W]) || (y + k < H && !stream[i + k * W])) { e = k - 1; break; }
      L.streamPx.push([x, y, sS[i], e, hash(x, y, 5)]);
    }

    // rock strata of the step: 6 bands, each split into blocks
    L.bands = [];
    for (let k = 0; k < 6; k++) {
      const bs = new Int16Array(W), bw = new Int16Array(W), bid = new Int16Array(W);
      let x = -Math.floor(hash(k, 0, 3) * 18), id = 0;
      while (x < W) {
        const w = 6 + Math.floor(Math.pow(hash(k, id + 1, 4), 0.8) * 24);
        for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) { bs[xx] = x; bw[xx] = w; bid[xx] = id; }
        x += w; id++;
      }
      L.bands.push({ bs, bw, bid });
    }
    L.wave = (x) => Math.round(1.5 * Math.sin(x * 0.045 + 1) + Math.sin(x * 0.13));
    L.bandTop = [0, 7, 16, 24, 34, 42, 51, 60];
    // which stratum and how far into it, for a pixel of the face
    L.face = (x, y) => {
      const vv = y - LIP[x] + L.wave(x) + 2;
      let k = 0;
      while (k < 6 && L.bandTop[k + 1] <= vv) k++;
      return { k, yy: vv - L.bandTop[k], bh: L.bandTop[k + 1] - L.bandTop[k] };
    };

    // what stands where
    L.trees = [
      { k: 'spruce', x: 18, y: 46, s: 1, tall: 1 }, { k: 'oak', x: 52, y: 96, s: 2 }, { k: 'spruce', x: 104, y: 70, s: 3 },
      { k: 'spruce', x: 158, y: 40, s: 4 }, { k: 'bush', x: 124, y: 99, s: 5 },
      { k: 'spruce', x: 412, y: 44, s: 6, tall: 1 }, { k: 'oak', x: 430, y: 98, s: 7 }, { k: 'spruce', x: 470, y: 74, s: 8 },
      { k: 'oak', x: 36, y: 168, s: 9 }, { k: 'bush', x: 124, y: 168, s: 10 },
      { k: 'apple', x: 454, y: 218, s: 11 }, { k: 'bush', x: 470, y: 262, s: 12 }, { k: 'bush', x: 418, y: 258, s: 13 },
    ];
    L.ferns = [];
    for (let x = 8; x < W - 6; x += 9) {
      if (x > STEP0 - 8 && x < STEP1 + 8) continue;
      if (PT[x] >= 0 || PT[x - 6] >= 0 || PT[x + 6] >= 0) continue;
      if (hash(x, 1, 21) < 0.65) L.ferns.push([x + Math.floor(hash(x, 2, 21) * 4), FOOT[x] + 3 + Math.floor(hash(x, 3, 21) * 2), x]);
    }
    L.reeds = [[172, 182], [178, 198], [186, 210], [428, 178], [434, 194], [226, 232], [384, 232], [204, 223]];
    L.rocks = [[436, 240, 1], [180, 150, 0], [414, 158, 0], [128, 260, 0]];
    // lily pads, in the shallows
    L.pads = [];
    const r = LB.rng(17);
    for (let t = 0; L.pads.length < 9 && t < 900; t++) {
      const x = Math.floor(170 + r() * 270), y = Math.floor(150 + r() * 90);
      const i = y * W + x;
      if (!pond[i] || dist[i] < 5 || dist[i] > 16 || Math.abs(x - 330) < 26 || (x > DOCK.x0 - 10 && x < DOCK.x1 + 22)) continue;
      if (L.pads.some((p) => Math.hypot(p[0] - x, p[1] - y) < 9)) continue;
      L.pads.push([x, y, r()]);
    }
    return L;
  });

  // ---------- palettes ----------
  const SNOW = ['#93a3c6', '#b6c4de', '#dbe4f2', '#eef3fa', '#ffffff'];
  const BARK = LB.ramp('#6e4c34', 5);
  const WOOD = LB.ramp('#8c6642', 5);
  const ROCK = LB.ramp('#a19684', 5, { spread: 1.05 });

  // ---------- sprites ----------
  function leafPalette(season, seed) {
    if (season === 'spring') return LB.ramp('#82c252', 5);
    if (season === 'summer') return LB.ramp('#3f8a3a', 5);
    const autumn = ['#d47a2c', '#c24e2e', '#dcaa36', '#b86a2a'];
    return LB.ramp(autumn[seed % autumn.length], 5);
  }
  function oakSprite(season, seed, o) {
    o = o || {};
    const sw = o.small ? 44 : 60, sh = o.small ? 56 : 78;
    const key = 'verd-oak:' + season + ':' + seed + ':' + (o.apples ? 1 : 0) + ':' + (o.small ? 1 : 0);
    return LB.sprite(key, sw, sh, (P) => {
      const r = LB.rng(seed * 97 + 13);
      const cx = Math.floor(sw / 2), base = sh - 1;
      const cy = Math.round(sh * 0.37), rx = sw * 0.42, ry = sh * 0.3;
      const top = Math.round(cy + ry * 0.35);
      // trunk with a flare at the roots
      for (let y = top; y <= base; y++) {
        const u = (y - top) / (base - top);
        const hw = 2.6 + Math.pow(u, 3) * 4;
        const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
        for (let x = x0; x <= x1; x++) {
          const f = (x - x0) / Math.max(1, x1 - x0);
          let c = f < 0.3 ? BARK[3] : f < 0.7 ? BARK[2] : BARK[1];
          if (x === x1) c = BARK[0];
          if (hash(x, y >> 2, seed) > 0.82 && f > 0.2 && f < 0.8) c = BARK[1];
          P.px(x, y, c);
        }
      }
      if (season === 'winter') {
        // bare branches, snow on their tops
        const segs = [];
        const branch = (x, y, a, len, th, d) => {
          const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
          segs.push([x, y, x2, y2, th]);
          if (d <= 0) return;
          const n = d > 2 ? 3 : 2;
          for (let i = 0; i < n; i++) branch(x2, y2, a + (i - (n - 1) / 2) * (0.55 + r() * 0.3) + (r() - 0.5) * 0.2, len * (0.62 + r() * 0.12), Math.max(1, th - 1), d - 1);
        };
        branch(cx, top + 2, -Math.PI / 2, ry * 0.75, 3, 4);
        branch(cx - 1, top + 6, -Math.PI / 2 - 0.9, ry * 0.6, 2, 3);
        branch(cx + 1, top + 5, -Math.PI / 2 + 0.85, ry * 0.6, 2, 3);
        for (const [x1, y1, x2, y2, th] of segs) {
          for (let k = 0; k < th; k++) P.line(x1 + k * 0.5, y1, x2 + k * 0.5, y2, k === 0 ? BARK[2] : BARK[1]);
        }
        for (const [x1, y1, x2, y2, th] of segs) {
          if (th < 2 && Math.abs(y2 - y1) > Math.abs(x2 - x1)) continue;
          const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
          for (let k = 0; k <= n; k += 1) {
            const x = Math.round(x1 + ((x2 - x1) * k) / n), y = Math.round(y1 + ((y2 - y1) * k) / n);
            if (hash(x, y, 31) < 0.7) P.px(x, y - 1, hash(x, y, 32) > 0.4 ? SNOW[4] : SNOW[3]);
          }
        }
        return;
      }
      const C = leafPalette(season, seed);
      // the shaded core, then dozens of clumps lit from the upper left
      P.ellipse(cx, cy, rx * 0.9, ry * 0.88, C[0]);
      if (season === 'autumn') for (let i = 0; i < 4; i++) P.line(cx, top + 2, cx + (r() - 0.5) * rx * 1.4, cy - ry * 0.4 + r() * ry * 0.6, BARK[1]);
      const clumps = [];
      const n = o.small ? 16 : 26;
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.78;
        clumps.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (o.small ? 5 : 6.5) + r() * 2.5, i]);
      }
      clumps.sort((a, b) => a[1] - b[1]);
      for (const [x, y, rr, i] of clumps) {
        const lit = clamp(0.55 - ((x - cx) / rx) * 0.4 - ((y - cy) / ry) * 0.5, 0, 1);
        const Cc = season === 'autumn' ? leafPalette(season, seed + i) : C;
        const b = lit > 0.62 ? 1 : 0;
        P.blob(x, y, rr, Cc[b], seed * 31 + i, 0.32);
        P.blob(x - 1, y - 1.5, rr - 1.8, Cc[b + 1], seed * 31 + i + 50, 0.32);
        if (lit > 0.3) P.blob(x - 2, y - 2.5, rr * 0.48, Cc[b + 2], seed * 31 + i + 90, 0.35);
        if (lit > 0.7) { P.px(x - 3, y - 4, Cc[4]); P.px(x - 2, y - 4, Cc[4]); P.px(x - 4, y - 3, Cc[3 + (b ? 1 : 0)]); }
      }
      // sprigs past the edge, so the crown isn't a smooth ball
      for (let i = 0; i < 46; i++) {
        const a = r() * Math.PI * 2, e = 0.98 + r() * 0.1;
        const x = Math.round(cx + Math.cos(a) * rx * e), y = Math.round(cy + Math.sin(a) * ry * e);
        const lit = Math.cos(a) < 0 && Math.sin(a) < 0;
        P.px(x, y, lit ? C[2] : C[1]);
        if (r() > 0.5) P.px(x + (Math.cos(a) > 0 ? 1 : -1), y + (r() > 0.5 ? 1 : 0), lit ? C[3] : C[1]);
      }
      if (season === 'spring') {
        for (let i = 0; i < 34; i++) {
          const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.85;
          const x = Math.round(cx + Math.cos(a) * rx * d), y = Math.round(cy + Math.sin(a) * ry * d);
          const pk = r() > 0.45;
          P.px(x, y, pk ? '#f6c2d2' : '#fff6f6'); P.px(x + 1, y, pk ? '#e895b0' : '#f4dce4');
          if (r() > 0.5) P.px(x, y - 1, '#fff6f6');
        }
      }
      if (o.apples && (season === 'summer' || season === 'autumn')) {
        for (let i = 0; i < 13; i++) {
          const a = r() * Math.PI * 2, d = 0.3 + Math.sqrt(r()) * 0.6;
          const x = Math.round(cx + Math.cos(a) * rx * d), y = Math.round(cy + Math.sin(a) * ry * d * 0.9 + 2);
          P.rect(x, y, 2, 2, '#c22e26'); P.px(x, y, '#ff7458'); P.px(x + 1, y + 1, '#8a1e22');
        }
      }
    }, { outline: 'sel' });
  }
  function spruceSprite(season, seed, tall, dust) {
    const sw = 42, sh = tall ? 90 : 74;
    return LB.sprite('verd-spruce:' + season + ':' + seed + ':' + (tall ? 1 : 0) + ':' + (dust ? 1 : 0), sw, sh, (P) => {
      const r = LB.rng(seed * 53 + 7);
      const E = LB.ramp(season === 'winter' ? '#2c6450' : '#2f6e4c', 5);
      const cx = Math.floor(sw / 2), base = sh - 1;
      P.rect(cx - 2, base - 9, 5, 10, BARK[2]); P.rect(cx - 2, base - 9, 1, 10, BARK[3]); P.rect(cx + 2, base - 9, 1, 10, BARK[0]);
      const tiers = tall ? 9 : 7, snowy = season === 'winter' || dust;
      const tierTop = [];
      for (let i = 0; i < tiers; i++) {
        const f = i / (tiers - 1);
        const ty = Math.round(8 + f * (sh - 22));
        const hw = 3 + f * 16.5, th = 9 + f * 5;
        const pts = [[cx, ty - th]];
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const u = s / steps, x = cx + hw - u * hw * 2;
          const sag = Math.round(Math.sin(u * Math.PI) * 2 + (s % 2 ? 2 : 0) + (r() - 0.5) * 1.6);
          pts.push([x, ty + sag - Math.round(Math.abs(u - 0.5) * 3)]);
        }
        P.poly(pts, E[1]);
        // the lit left side
        const left = pts.filter((p) => p[0] <= cx + 1).concat([[cx, ty + 2]]);
        P.poly([[cx, ty - th], ...left.slice(Math.ceil(steps / 2) + 1), [cx - 1, ty]], E[2]);
        P.poly([[cx - 1, ty - th + 3], [cx - hw * 0.6, ty - 2], [cx - hw * 0.25, ty - 1]], E[3]);
        // needle ticks and the dark underside
        for (let k = 0; k < 4 + i; k++) {
          const x = Math.round(cx - hw * 0.8 + r() * hw * 1.5), y = Math.round(ty - th * 0.25 - r() * th * 0.5);
          if (Math.abs(x - cx) > (y - (ty - th)) / th * hw) continue;
          P.px(x, y, x < cx ? E[4] : E[2]); P.px(x + 1, y + 1, x < cx ? E[3] : E[1]);
        }
        for (const p of pts.slice(1)) P.px(p[0], p[1], E[0]);
        tierTop.push([cx, ty, hw, th]);
      }
      if (snowy) {
        for (const [tx, ty, hw, th] of tierTop) {
          for (let x = Math.round(tx - hw * 0.85); x <= tx + hw * 0.7; x++) {
            const u = Math.abs(x - tx) / hw;
            const y = Math.round(ty - th + u * th * 0.95);
            if (dust && hash(x, ty, 61) > 0.55) continue;
            P.px(x, y, SNOW[x < tx ? 4 : 3]); P.px(x, y + 1, SNOW[x < tx ? 3 : 2]);
            if (x < tx && hash(x, ty, 62) > 0.5) P.px(x, y + 2, SNOW[2]);
          }
        }
      }
    }, { outline: 'sel' });
  }
  function bushSprite(season, seed, dust) {
    return LB.sprite('verd-bush:' + season + ':' + seed + ':' + (dust ? 1 : 0), 28, 20, (P) => {
      const r = LB.rng(seed * 11 + 3);
      if (season === 'winter') {
        // a low twiggy mound under snow
        P.ellipse(14, 13, 11, 6, '#6a5644');
        for (let i = 0; i < 14; i++) P.line(14, 18, 4 + r() * 20, 6 + r() * 6, BARK[1 + (i % 2)]);
        P.ellipse(13, 11, 10, 4, SNOW[3]); P.ellipse(12, 10, 7, 2, SNOW[4]);
        P.hline(5, 22, 15, SNOW[1]);
        return;
      }
      const C = season === 'autumn' ? LB.ramp(seed % 2 ? '#c4582e' : '#b8862e', 5) : leafPalette(season, seed);
      P.ellipse(14, 12, 12, 7, C[0]);
      const cl = [];
      for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); cl.push([14 + Math.cos(a) * 9 * d, 11 + Math.sin(a) * 5 * d, 3.5 + r() * 2, i]); }
      cl.sort((a, b) => a[1] - b[1]);
      for (const [x, y, rr, i] of cl) {
        const lit = clamp(0.5 - (x - 14) / 12 * 0.4 - (y - 11) / 6 * 0.5, 0, 1);
        const b0 = lit > 0.55 ? 1 : 0;
        P.blob(x, y, rr, C[b0], seed + i, 0.3);
        P.blob(x - 1, y - 1, rr - 1.4, C[b0 + 1], seed + i + 40, 0.3);
        if (lit > 0.45) { P.px(x - 2, y - 2, C[b0 + 2]); P.px(x - 1, y - 2, C[3]); }
      }
      for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2; P.px(14 + Math.cos(a) * 12.5, 12 + Math.sin(a) * 7.2, C[1]); }
      if (season === 'summer' || season === 'autumn') for (let i = 0; i < 6; i++) { const x = 6 + r() * 16, y = 8 + r() * 8; P.px(x, y, season === 'summer' ? '#3a4ac8' : '#c8283a'); P.px(x + 1, y, season === 'summer' ? '#6a78f0' : '#ff6a6a'); }
      if (season === 'spring') for (let i = 0; i < 7; i++) P.px(6 + r() * 16, 6 + r() * 8, '#fff4f8');
      if (dust) { P.ellipse(12, 7, 7, 2, SNOW[3]); P.hline(8, 15, 6, SNOW[4]); }
    }, { outline: 'sel' });
  }
  function fernSprite(season, seed) {
    return LB.sprite('verd-fern:' + season + ':' + seed, 15, 10, (P) => {
      const C = season === 'autumn' ? LB.ramp('#b07a34', 5) : season === 'spring' ? LB.ramp('#7cc05a', 5) : LB.ramp('#4a9a4a', 5);
      const fr = [[-6, -5], [-4, -8], [0, -9], [4, -8], [6, -5], [-6, -2], [6, -2]];
      for (let k = 0; k < fr.length; k++) {
        const [dx, dy] = fr[k];
        P.line(7, 9, 7 + dx, 9 + dy, C[k < 3 ? 2 : 1]);
        P.px(7 + Math.round(dx * 0.5) - 1, 9 + Math.round(dy * 0.5), C[3]);
        P.px(7 + dx, 9 + dy, C[k < 3 ? 3 : 2]);
      }
    }, { outline: 'sel' });
  }
  function rockSprite(seed, big, season, dust) {
    const sw = big ? 22 : 13, sh = big ? 16 : 10;
    return LB.sprite('verd-rock:' + seed + ':' + (big ? 1 : 0) + ':' + season + ':' + (dust ? 1 : 0), sw, sh, (P) => {
      const cx = sw / 2, cy = sh / 2 + 1;
      P.blob(cx, cy, sw * 0.42, ROCK[1], seed, 0.18, sh / sw * 1.2);
      P.blob(cx - 1, cy - 1, sw * 0.34, ROCK[2], seed + 5, 0.2, sh / sw * 1.15);
      P.blob(cx - 2.5, cy - 2.5, sw * 0.17, ROCK[3], seed + 9, 0.25, 0.8);
      P.px(Math.round(cx - 3), Math.round(cy - 3), ROCK[4]);
      P.hline(Math.round(cx - sw * 0.3), Math.round(cx + sw * 0.35), sh - 2, ROCK[0]);
      if (season === 'winter' || dust) { P.ellipse(cx - 1, cy - sh * 0.28, sw * 0.3, 1.5, SNOW[4]); P.hline(cx - sw * 0.28, cx + sw * 0.25, Math.round(cy - sh * 0.28) + 1, SNOW[2]); }
      else { P.px(Math.round(cx + 1), Math.round(cy - 3), '#6a8a3a'); P.px(Math.round(cx + 2), Math.round(cy - 3), '#4e7034'); P.px(Math.round(cx + 2), Math.round(cy - 2), '#4e7034'); }
    }, { outline: 'sel' });
  }

  // the farmhouse: timber and plaster, a front gable over the door, a shingled roof with deep eaves
  const HW = 120, HH = 98;
  const HOUSE_WIN = [[20, 66, 12, 13], [88, 66, 12, 13], [56, 45, 8, 8]];   // glass rects in sprite coords
  const HOUSE_LAMP = [72, 75];
  const HOUSE_CHIMNEY = [92, 2];
  function houseSprite(season, dust) {
    return LB.sprite('verd-house:' + season + ':' + (dust ? 1 : 0), HW, HH, (P, ctx) => {
      const winter = season === 'winter';
      const RF = LB.ramp('#b65a3a', 5, { spread: 0.95 });
      const PL = LB.ramp('#ecdcb8', 5, { spread: 0.8 });
      const TM = LB.ramp('#5e3e28', 5);
      const TRIM = '#efe6d0', TRIM2 = '#c8b898';
      const ST = LB.ramp('#a49c8c', 5);
      const BR = LB.ramp('#a85a40', 5);
      const SH = LB.ramp('#4f7c7a', 5);
      const flowers = { spring: ['#f6a6c4', '#fff2f6'], summer: ['#e8483a', '#f6d04a'], autumn: ['#e07a2a', '#9a5ad0'] }[season];
      // the stone plinth
      for (let y = 88; y <= 97; y++) for (let x = 12; x <= 107; x++) {
        const row = y < 93 ? 0 : 1, off = row ? 4 : 0;
        const k = Math.floor((x + off) / 9), xx = (x + off) % 9, yy = row ? y - 93 : y - 88;
        let c = hash(k, row, 7) > 0.7 ? ST[3] : hash(k, row, 7) < 0.25 ? ST[1] : ST[2];
        if (xx === 0 || yy === (row ? 4 : 4)) c = ST[0];
        else if (yy === 0) c = ST[4];
        else if (xx === 1) c = ST[3];
        P.px(x, y, c);
      }
      // the wall: plaster panels in a timber frame
      P.rect(12, 58, 96, 30, PL[2]);
      for (let y = 58; y < 88; y++) for (let x = 13; x < 107; x++) if (hash(x >> 1, y >> 1, 3) > 0.9) P.px(x, y, PL[1]);
      P.rect(12, 58, 2, 30, TM[2]); P.rect(106, 58, 2, 30, TM[1]); P.px(12, 58, TM[3]);
      P.rect(40, 58, 2, 30, TM[2]); P.rect(78, 58, 2, 30, TM[2]);
      P.rect(12, 85, 96, 3, TM[1]); P.hline(12, 107, 85, TM[3]);
      P.rect(12, 58, 96, 2, TM[2]);
      P.line(42, 84, 50, 66, TM[2]); P.line(43, 84, 51, 66, TM[1]);
      P.line(77, 84, 69, 66, TM[2]); P.line(76, 84, 68, 66, TM[1]);
      // eave shadow across the top of the wall
      ctx.save(); ctx.globalAlpha = 0.45; P.rect(12, 60, 96, 5, '#4a3050'); ctx.globalAlpha = 0.25; P.rect(12, 65, 96, 2, '#4a3050'); ctx.restore();
      // windows: white frames, mullions, shutters, a box of flowers
      for (const [wx, wy, ww, wh] of HOUSE_WIN.slice(0, 2)) {
        P.rect(wx - 4, wy, 4, wh, SH[2]); P.rect(wx + ww, wy, 4, wh, SH[1]);
        for (let y = wy + 1; y < wy + wh; y += 3) { P.hline(wx - 4, wx - 1, y, SH[1]); P.hline(wx + ww, wx + ww + 3, y, SH[0]); }
        P.vline(wx - 4, wy, wy + wh - 1, SH[3]);
        P.rect(wx - 1, wy - 1, ww + 2, wh + 2, TRIM2); P.rect(wx - 1, wy - 1, ww + 2, 1, TRIM); P.rect(wx - 1, wy - 1, 1, wh + 2, TRIM);
        P.rect(wx, wy, ww, wh, '#33445c');
        P.rect(wx, wy, ww, 3, '#5a7090'); P.px(wx + 1, wy + 3, '#7c94b2'); P.px(wx + 2, wy + 4, '#7c94b2');
        P.vline(wx + ww / 2, wy, wy + wh - 1, TRIM2); P.hline(wx, wx + ww - 1, wy + 6, TRIM2);
        // the flower box
        P.rect(wx - 2, wy + wh + 1, ww + 4, 3, WOOD[1]); P.hline(wx - 2, wx + ww + 1, wy + wh + 1, WOOD[3]);
        if (winter) { P.rect(wx - 2, wy + wh - 1, ww + 4, 2, SNOW[3]); P.hline(wx - 1, wx + ww, wy + wh - 2, SNOW[4]); }
        else {
          for (let x = wx - 1; x <= wx + ww; x++) {
            P.px(x, wy + wh, hash(x, 1, 9) > 0.5 ? '#3a7a34' : '#2a5a2c');
            if (hash(x, 2, 9) > 0.4) P.px(x, wy + wh - 1 - (hash(x, 3, 9) > 0.6 ? 1 : 0), flowers[hash(x, 4, 9) > 0.5 ? 0 : 1]);
          }
          if (dust) P.hline(wx - 1, wx + ww, wy + wh, SNOW[3]);
        }
      }
      // the door, its hood and step
      P.rect(52, 69, 16, 19, TM[1]);
      for (let x = 53; x < 67; x++) for (let y = 71; y < 88; y++) P.px(x, y, ((x - 53) % 4 === 0) ? '#5a321e' : (Math.floor((x - 53) / 4) % 2 ? '#86502c' : '#7a4626'));
      P.px(53, 71, TM[1]); P.px(66, 71, TM[1]);
      P.hline(54, 64, 75, '#3a2a24'); P.hline(54, 64, 83, '#3a2a24'); P.px(64, 79, '#e8c050'); P.px(64, 80, '#a07a28');
      P.rect(50, 66, 20, 3, RF[1]); P.hline(50, 69, 66, RF[3]); P.hline(50, 69, 68, RF[0]);
      if (winter || dust) { P.hline(50, 69, 65, SNOW[4]); P.hline(51, 68, 66, SNOW[3]); }
      ctx.save(); ctx.globalAlpha = 0.4; P.rect(52, 69, 16, 2, '#3a2040'); ctx.restore();
      P.rect(49, 88, 22, 4, ST[3]); P.hline(49, 70, 88, ST[4]); P.rect(47, 92, 26, 5, ST[2]); P.hline(47, 72, 92, ST[4]); P.hline(47, 72, 96, ST[0]);
      // pots by the door
      for (const px of [43, 74]) {
        P.rect(px, 91, 5, 5, '#b8603a'); P.hline(px, px + 4, 91, '#e08a5a'); P.vline(px + 4, 92, 95, '#8a3e2a');
        if (winter) { P.rect(px, 89, 5, 2, SNOW[3]); }
        else { P.rect(px, 87, 5, 4, '#3a7a34'); P.px(px + 1, 87, '#5aa046'); P.px(px + 2, 86, flowers[0]); P.px(px + 3, 87, flowers[1]); }
      }
      // the porch lamp
      P.hline(69, 72, 73, '#2a2630'); P.rect(71, 74, 4, 6, '#2a2630'); P.rect(72, 75, 2, 3, '#d8dcc8'); P.hline(70, 75, 74, '#3a3640'); P.px(72, 80, '#2a2630');
      // ivy up the left corner (turns red in autumn, bare in winter)
      {
        const IV = season === 'autumn' ? ['#8a2a22', '#c4482e', '#e88040'] : season === 'spring' ? ['#3a7a2c', '#5aa040', '#8ac85a'] : ['#2a5a26', '#3e7a30', '#5e9a40'];
        const r = LB.rng(5);
        for (let v = 0; v < 3; v++) {
          let x = 13 + v * 3, y = 97;
          while (y > 60) {
            y -= 1 + Math.floor(r() * 2); x += r() > 0.6 ? (r() > 0.5 ? 1 : -1) : 0; x = clamp(x, 12, 22);
            P.px(x, y, winter ? '#6a5040' : IV[0]);
            if (!winter && r() > 0.35) { P.px(x + 1, y, IV[1]); if (r() > 0.5) P.px(x - 1, y - 1, IV[2]); }
          }
        }
      }
      // ---- the roof ----
      // shingles: courses that lap the one below (a dark line under each), soft joints, weathered patches
      const shingle = (x, y, y0, lit) => {
        const c = Math.floor((y - y0) / 4), cy = (y - y0) % 4;
        const xs = x + Math.floor(hash(c, 0, 2) * 7);
        // irregular widths: 5–9 px
        let k = 0, x0 = 0;
        while (true) { const w = 5 + Math.floor(hash(k, c, 3) * 5); if (x0 + w > xs) break; x0 += w; k++; }
        const xx = xs - x0;
        const patch = LB.fbm(x * 0.05, y * 0.07, 12, 2);
        let body = patch > 0.6 ? LB.mix(RF[2], RF[3], 0.45) : patch < 0.38 ? LB.mix(RF[2], RF[1], 0.45) : RF[2];
        const tv = hash(k, c, 5);
        if (tv > 0.9) body = LB.mix(body, RF[1], 0.5); else if (tv < 0.08) body = LB.mix(body, RF[3], 0.6);
        if (lit) body = LB.mix(body, lit > 0 ? RF[3] : RF[1], Math.abs(lit));
        if (cy === 0) return RF[0];
        if (cy === 3) return xx === 0 ? RF[1] : LB.mix(body, RF[4], xx < 3 ? 0.4 : 0.2);
        if (xx === 0 && cy === 1) return RF[1];
        return body;
      };
      for (let y = 8; y <= 11; y++) for (let x = 9; x <= 110; x++) P.px(x, y, (x + y * 3) % 7 === 0 ? RF[0] : RF[1]);
      for (let y = 16; y <= 59; y++) for (let x = 6; x <= 113; x++) P.px(x, y, shingle(x, y, 16, y < 24 ? 0.15 : 0));
      // the ridge: half-round tiles
      for (let x = 7; x <= 112; x++) {
        const xx = (x - 7) % 5;
        P.px(x, 12, RF[1]); P.px(x, 13, xx === 0 ? RF[1] : RF[3]); P.px(x, 14, xx === 0 ? RF[0] : RF[2]); P.px(x, 15, RF[0]);
        if (xx === 2) P.px(x, 13, RF[4]);
      }
      // the front gable's roof: a triangle on the main roof, lit on the left, a ridge down its middle
      const inGable = (x, y) => y >= 20 && y <= 62 && Math.abs(x - 60) <= (y - 20) * 0.72;
      for (let y = 20; y <= 62; y++) for (let x = 29; x <= 91; x++) {
        if (!inGable(x, y)) continue;
        const edge = Math.abs(x - 60) > (y - 20) * 0.72 - 1;
        P.px(x, y, edge ? RF[0] : shingle(x, y, 18, x < 60 ? 0.2 : -0.25));
      }
      for (let y = 20; y <= 38; y++) { P.px(59, y, RF[3]); P.px(60, y, RF[4]); P.px(61, y, RF[2]); }
      // moss toward the eaves
      if (!winter) for (let i = 0; i < 30; i++) {
        const x = 8 + Math.floor(hash(i, 1, 44) * 100), y = 42 + Math.floor(Math.pow(hash(i, 2, 44), 0.6) * 16);
        const mc = season === 'autumn' ? ['#7a7a3a', '#9a8a44'] : ['#5e7a34', '#86a046'];
        P.px(x, y, mc[0]); P.px(x + 1, y, mc[1]); if (hash(i, 3, 44) > 0.5) { P.px(x, y + 1, mc[0]); P.px(x - 1, y + 1, mc[0]); }
      }
      // fascia, verges
      P.rect(6, 59, 108, 3, TM[1]); P.hline(6, 113, 59, TM[3]); P.hline(6, 113, 61, TM[0]);
      P.rect(6, 12, 2, 48, TRIM); P.rect(112, 12, 2, 48, TRIM2);
      // the gable end: plaster in timber under white bargeboards, a little window
      P.poly([[37, 64], [83, 64], [60, 37]], PL[2]);
      ctx.save(); ctx.globalAlpha = 0.4; P.poly([[37, 64], [83, 64], [60, 37]], '#4a3050'); ctx.restore();
      P.poly([[40, 64], [80, 64], [60, 41]], PL[2]);
      P.vline(60, 43, 63, TM[2]); P.hline(48, 72, 56, TM[2]); P.hline(48, 72, 57, TM[1]);
      P.line(50, 63, 58, 56, TM[2]); P.line(70, 63, 62, 56, TM[2]);
      P.rect(55, 45, 10, 10, TRIM2); P.rect(56, 46, 8, 8, '#33445c'); P.rect(56, 46, 8, 2, '#5a7090'); P.vline(60, 46, 53, TRIM2); P.hline(56, 63, 50, TRIM2);
      for (let t = 0; t <= 27; t++) for (const sg of [-1, 1]) {
        const x = Math.round(60 + sg * t * 0.86), y = 36 + t;
        P.px(x, y, TRIM); P.px(x, y + 1, sg < 0 ? TRIM : TRIM2); P.px(x, y + 2, '#8a7a68');
      }
      P.rect(59, 34, 3, 3, TRIM); P.px(60, 33, TRIM2);
      // the chimney: brick courses, a stone cap and two pots
      for (let y = 9; y <= 32; y++) for (let x = 88; x <= 97; x++) {
        const row = Math.floor((y - 9) / 3), yy = (y - 9) % 3, xs = x + (row % 2) * 2;
        let c = hash(Math.floor(xs / 4), row, 8) > 0.75 ? BR[3] : BR[2];
        if (yy === 2 || xs % 4 === 0) c = BR[0];
        if (x === 88) c = BR[3]; if (x === 97) c = BR[1];
        P.px(x, y, c);
      }
      P.rect(87, 6, 12, 3, ST[3]); P.hline(87, 98, 6, ST[4]); P.hline(87, 98, 8, ST[1]);
      P.rect(89, 2, 3, 4, '#c0683e'); P.px(89, 2, '#e08a5a'); P.rect(94, 3, 3, 3, '#b0603a'); P.px(94, 3, '#e08a5a');
      P.px(90, 2, '#3a2420'); P.px(95, 3, '#3a2420');
      ctx.save(); ctx.globalAlpha = 0.4; P.poly([[98, 30], [104, 36], [104, 40], [96, 33]], '#3a2040'); ctx.restore();
      P.hline(87, 98, 32, '#8a8a90');
      // ---- snow ----
      // snow lies along the courses (a soft line where each course steps down), the wind scours a few shingles bare,
      // the ridge and the front gable keep their shape, a cornice curls over the eave
      if (winter || dust) {
        const edge = (x) => winter ? 60 + Math.round(noise(x * 0.25, 1, 5) * 2.4) : 24 + Math.round(noise(x * 0.12, 1, 6) * 14);
        const inG = (x, y) => y >= 20 && Math.abs(x - 60) <= (y - 20) * 0.72;
        for (let x = 6; x <= 113; x++) {
          const e = edge(x);
          for (let y = 8; y <= e; y++) {
            if (x >= 87 && x <= 98 && y < 33) continue;
            if (y > 35 && Math.abs(x - 60) < (y - 36) * 0.86 + 3) continue;
            const cy = (y - 16) & 3, c4 = (y - 16) >> 2;
            let c = SNOW[3];
            if (inG(x, y)) {
              const d = Math.abs(x - 60);
              c = d > (y - 20) * 0.72 - 1 ? SNOW[1] : x < 59 ? SNOW[4] : x > 61 ? SNOW[2] : SNOW[4];
            } else if (y < 12) c = SNOW[2];
            else if (y <= 15) c = [SNOW[2], SNOW[4], SNOW[3], SNOW[1]][y - 12];
            else if (cy === 0 && hash(x >> 2, c4, 13) > 0.35) c = SNOW[2];
            else if (cy === 3 && hash(x >> 2, c4, 14) > 0.5) c = SNOW[4];
            else if (x < 14) c = SNOW[4];
            if (y === e) c = SNOW[1];
            else if (y === e - 1) c = SNOW[4];
            P.px(x, y, c);
          }
        }
        if (winter) {
          for (let x = 7; x <= 112; x += 1) {
            if (hash(x, 1, 71) < 0.55) continue;
            const len = 1 + Math.floor(hash(x, 2, 71) * 5);
            for (let k = 0; k < len; k++) P.px(x, 62 + k, k === 0 ? '#e8f2fa' : '#b8d4ea');
          }
          P.rect(86, 4, 14, 2, SNOW[4]); P.hline(86, 99, 6, SNOW[2]);
        }
      }
    }, { outline: 'sel' });
  }
  function woodpileSprite(season, dust) {
    return LB.sprite('verd-wood:' + season + ':' + (dust ? 1 : 0), 28, 22, (P) => {
      // split logs stacked in a pyramid, their cut ends toward us
      const rows = [[[5, 17], [11, 17], [17, 17], [23, 17]], [[8, 11], [14, 11], [20, 11]], [[11, 5], [17, 5]]];
      for (const row of rows) for (const [cx, cy] of row) {
        P.disc(cx, cy, 3.4, BARK[0]);
        P.disc(cx, cy, 2.6, BARK[2]);
        P.disc(cx, cy, 1.9, '#d6ae78');
        P.px(cx, cy, '#b0844e'); P.px(cx + 1, cy, '#c49a62');
        P.px(cx - 1, cy - 1, '#f0d6a2'); P.px(cx - 2, cy - 1, '#e6c48c'); P.px(cx - 1, cy - 2, '#e6c48c');
      }
      P.hline(1, 26, 21, BARK[0]);
      if (season === 'winter' || dust) {
        for (const [cx, cy] of [[11, 5], [17, 5], [8, 11], [20, 11], [5, 17], [23, 17]]) { P.hline(cx - 2, cx + 2, cy - 3, SNOW[4]); P.hline(cx - 3, cx + 3, cy - 2, SNOW[3]); }
      }
    }, { outline: 'sel' });
  }
  function lampSprite(season, dust) {
    return LB.sprite('verd-lamp:' + season + ':' + (dust ? 1 : 0), 11, 36, (P) => {
      P.rect(4, 8, 3, 28, '#2e2c36'); P.vline(4, 8, 35, '#4a4854'); P.rect(3, 32, 5, 4, '#2e2c36');
      P.rect(2, 2, 7, 7, '#2e2c36'); P.rect(3, 3, 5, 5, '#d8dcc8'); P.hline(1, 9, 1, '#3e3c48'); P.px(5, 0, '#3e3c48');
      if (season === 'winter' || dust) { P.hline(1, 9, 0, SNOW[4]); P.hline(2, 8, 1, SNOW[3]); }
    }, { outline: 'sel' });
  }
  function scarecrowSprite(season, dust) {
    return LB.sprite('verd-scare:' + season + ':' + (dust ? 1 : 0), 22, 34, (P) => {
      P.rect(10, 12, 2, 22, WOOD[2]); P.rect(2, 14, 18, 2, WOOD[2]); P.hline(2, 19, 14, WOOD[3]);
      P.rect(6, 13, 10, 10, '#4a6a9a'); P.rect(6, 13, 3, 10, '#6a8ab8'); P.hline(6, 15, 22, '#3a4a78');
      P.px(8, 17, '#c8a050'); P.px(13, 19, '#c8a050');
      P.rect(1, 15, 3, 2, '#d8b860'); P.rect(18, 15, 3, 2, '#d8b860');
      P.disc(11, 9, 4, '#e8c878'); P.px(9, 8, '#3a2a20'); P.px(12, 8, '#3a2a20'); P.hline(9, 12, 11, '#8a5a30');
      P.rect(4, 4, 14, 2, '#c09040'); P.rect(7, 1, 8, 4, '#d0a050'); P.hline(7, 14, 1, '#e8c070'); P.hline(7, 14, 4, '#9a3a2a');
      if (season === 'winter' || dust) { P.hline(5, 16, 3, SNOW[4]); P.hline(7, 14, 0, SNOW[4]); P.hline(2, 19, 13, SNOW[3]); }
    }, { outline: 'sel' });
  }
  function boatSprite(season) {
    return LB.sprite('verd-boat:' + season, 30, 14, (P) => {
      const hull = [[1, 7], [6, 2], [25, 2], [28, 4], [28, 10], [25, 12], [6, 12]];
      P.poly(hull, WOOD[0]);
      P.poly([[2, 7], [6, 3], [25, 3], [27, 5], [27, 9], [25, 10], [6, 10]], WOOD[2]);
      P.poly([[5, 7], [8, 4], [24, 4], [25, 5], [25, 8], [24, 9], [8, 9]], WOOD[3]);
      for (let x = 9; x < 24; x += 3) P.vline(x, 5, 8, LB.mix(WOOD[3], WOOD[2], 0.6));
      P.rect(11, 4, 2, 6, WOOD[1]); P.hline(11, 12, 4, WOOD[4]); P.rect(19, 4, 2, 6, WOOD[1]); P.hline(19, 20, 4, WOOD[4]);
      P.line(6, 3, 25, 3, WOOD[4]); P.hline(6, 25, 11, '#3a2a20');
      P.line(14, 3, 12, 0, '#c8a070'); P.px(11, 0, '#a07a48');
      if (season === 'autumn') { P.px(16, 6, '#d87a2a'); P.px(22, 7, '#c44a2a'); }
    }, { outline: 'sel' });
  }

  // ---------- ground ----------
  function inField(x, y) { return x >= FIELD.x0 + 4 && x <= FIELD.x1 - 4 && y >= FIELD.y0 + 5 && y <= FIELD.y1 - 4; }
  function groundArt(season, weather) {
    return LB.memo('verd-ground:' + season + ':' + weather, () => {
      const l = lay();
      const cv = LB.canvas(W, H), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const id = ctx.createImageData(W, H), d = id.data;
      const winter = season === 'winter', wet = weather === 'rain', dust = !winter && weather === 'snow';
      const put = (i, c) => { const k = i * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; };
      const G = LB.ramp(LB.shade(GRASS[season] || GRASS.summer, wet ? -0.1 : 0), 5).map(rgb);
      const Gl = rgb(LB.mix(G[2], G[3], 0.3)), Gd = rgb(LB.mix(G[2], G[1], 0.35));
      const SN = SNOW.map(rgb);
      const D = LB.ramp(LB.shade('#b48c5a', wet ? -0.18 : 0), 5).map(rgb);
      const RK = ROCK.map(rgb);
      const SO = LB.ramp(LB.shade('#7a5236', wet ? -0.12 : 0), 5).map(rgb);
      const STN = LB.ramp('#b6ac96', 5).map(rgb);
      const bed = rgb('#2c4a46');
      const mud = rgb(LB.mix(G[1], '#5a4430', 0.55));
      const mossy = (k, bi) => hash(k, bi, 77) > 0.55;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const lip = l.LIP[x], foot = l.FOOT[x];
        if (y >= lip && y < foot) {
          if (x >= STEP0 && x <= STEP1) {
            // the stair: treads lit from above, risers in shade, cut walls either side
            const v = y - lip, hgt = foot - lip, n = 6, rise = hgt / n;
            const sI = Math.floor(v / rise), sv = v - sI * rise;
            let c;
            if (x <= STEP0 + 2 || x >= STEP1 - 2) c = (x === STEP0 || x === STEP1) ? STN[0] : (Math.floor(y / 4) % 2 ? STN[1] : STN[2]);
            else if (sv < 2) c = winter ? SN[sv < 1 ? 4 : 3] : (sv < 1 ? STN[4] : STN[3]);
            else c = sv >= rise - 1 ? STN[0] : (hash(x >> 2, sI, 4) > 0.75 ? STN[1] : STN[2]);
            if (!winter && x === STEP0 + 3 && sv >= 2 && hash(sI, 0, 6) > 0.4) c = rgb('#5e7a34');
            put(i, c);
            continue;
          }
          // the rock face: strata of blocks lit from the upper left
          const v = y - lip, hgt = foot - lip;
          let c;
          const fringe = 1 + Math.floor(hash(x, 0, 12) * 2.6) * (hash(x, 1, 12) > 0.35 ? 1 : 0);
          if (v < fringe && !winter) c = v === fringe - 1 ? G[1] : G[2];
          else if (v < fringe + 1) c = RK[0];
          else {
            const fi = l.face(x, y), k = fi.k, yy = fi.yy, bh = fi.bh;
            const band = l.bands[k], bs = band.bs[x], bw = band.bw[x], bi = band.bid[x], xx = x - bs;
            const tv = hash(k, bi, 3);
            let body = tv < 0.2 ? rgb(LB.mix(LB.hex(RK[2]), '#8a7a62', 0.35)) : tv > 0.85 ? rgb(LB.mix(LB.hex(RK[2]), LB.hex(RK[3]), 0.4)) : RK[2];
            if (yy === 0) c = xx === 0 ? RK[2] : RK[3];
            else if (yy === bh - 1) c = RK[0];
            else if (yy === bh - 2) c = RK[1];
            else if (xx === 0) c = RK[0];
            else if (xx === 1) c = RK[3];
            else if (xx === bw - 1) c = RK[1];
            else c = hash(x >> 1, y >> 1, k + 9) > 0.93 ? RK[1] : body;
            if (yy === 0 && !winter && mossy(k, bi) && xx > 2 && xx < bw - 2) c = hash(x, k, 8) > 0.5 ? rgb('#6e9a40') : rgb('#4e7a34');
            if (yy === 1 && !winter && mossy(k, bi) && xx > 3 && xx < bw - 3 && hash(x, k, 9) > 0.6) c = rgb('#3e6a30');
            if (yy === 0 && (winter || (dust && hash(x, k, 1) > 0.4))) c = SN[hash(x, y, 2) > 0.3 ? 4 : 3];
            if (yy === 1 && winter && hash(x >> 1, k, 3) > 0.5) c = SN[2];
            if (v >= hgt - 4) c = rgb(LB.mix(LB.hex(c), LB.hex(RK[0]), 0.35));
            if (Math.abs(x - (WF0 + WF1) / 2) < 14) c = rgb(LB.mix(LB.hex(c), '#2a3c3c', 0.35 * (1 - Math.abs(x - (WF0 + WF1) / 2) / 14)));
          }
          if (l.PT[x] >= 0 && l.PT[x] <= foot + 1 && v >= hgt - 2) c = rgb(LB.mix(LB.hex(c), '#1e3030', 0.55));
          put(i, c);
          continue;
        }
        if (l.pond[i]) { put(i, bed); continue; }
        if (l.stream[i]) { put(i, rgb('#3a5450')); continue; }
        if (inField(x, y)) {
          const row = Math.floor((y - FIELD.y0 - 5) / 8), yy = (y - FIELD.y0 - 5 + (hash(x >> 2, row, 3) > 0.7 ? 1 : 0)) % 8;
          let c;
          if (winter) c = yy < 1 ? SN[4] : yy < 5 ? SN[3] : yy < 6 ? SN[1] : rgb(LB.mix(LB.hex(SO[0]), LB.hex(SN[1]), 0.45));
          else c = yy === 0 ? SO[3] : yy < 4 ? SO[2] : yy < 6 ? SO[1] : SO[0];
          if (!winter && yy > 0 && yy < 4 && hash(x >> 1, y, 5) > 0.88) c = SO[3];
          if (dust && yy < 3 && hash(x >> 1, row, 6) > 0.35) c = SN[3];
          put(i, c);
          continue;
        }
        if (l.path[i]) {
          let c;
          if (winter) {
            c = SN[2];
            if (hash(x >> 1, y >> 1, 7) > 0.9) c = SN[1];
          } else {
            const n = noise(x * 0.07, y * 0.09, 14);
            c = n > 0.66 ? rgb(LB.mix(LB.hex(D[2]), LB.hex(D[3]), 0.5)) : n < 0.34 ? rgb(LB.mix(LB.hex(D[2]), LB.hex(D[1]), 0.45)) : D[2];
          }
          if (y > 0 && !l.path[i - W] && !l.pond[i - W]) c = winter ? SN[1] : D[0];
          else if (y < H - 1 && !l.path[i + W]) c = winter ? SN[3] : D[3];
          put(i, c);
          continue;
        }
        // meadow
        let c;
        if (winter) {
          const n = fbm(x / 60, y / 40, 5, 3);
          c = n > 0.58 ? SN[4] : n < 0.4 ? SN[2] : SN[3];
          if (y < lip && y >= lip - 2) c = SN[4];
        } else {
          const n = fbm(x / 70, y / 48, 5, 3);
          c = n > 0.6 ? Gl : n < 0.38 ? Gd : G[2];
          if (y < lip && y >= lip - 1) c = G[3];
          if (dust) { const dn = fbm(x / 11, y / 8, 8, 2) + (fbm(x / 40, y / 30, 18, 2) - 0.5) * 0.4; if (dn > 0.5) c = dn > 0.58 ? SN[3] : SN[2]; }
        }
        // damp earth round the pond
        if (y < H - 1 && x > 0 && x < W - 1 && (l.pond[i + W] || l.pond[i - 1] || l.pond[i + 1] || l.pond[i - W]) && y > foot) c = winter ? SN[1] : mud;
        put(i, c);
      }
      ctx.putImageData(id, 0, 0);

      // ---- marks: tufts, flowers, pebbles, leaves, stones ----
      const isGrass = (x, y) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return false;
        const i = y * W + x;
        if (y >= l.LIP[x] && y < l.FOOT[x]) return false;
        return !l.pond[i] && !l.path[i] && !l.stream[i] && !inField(x, y);
      };
      const nearEdge = (x, y) => !isGrass(x - 4, y) || !isGrass(x + 4, y) || !isGrass(x, y - 3) || !isGrass(x, y + 4);
      const Gh = LB.hex;
      for (let cy = 0; cy < H / 5; cy++) for (let cx = 0; cx < W / 6; cx++) {
        const h = hash(cx, cy, 33);
        const x = cx * 6 + Math.floor(hash(cx, cy, 34) * 5), y = cy * 5 + Math.floor(hash(cx, cy, 35) * 4);
        if (!isGrass(x, y)) continue;
        if (winter) {
          if (h < (nearEdge(x, y) ? 0.25 : 0.05)) { P.px(x, y, '#7a6a4a'); P.px(x + 1, y - 1, '#9a8a5a'); if (h < 0.1) P.px(x - 1, y - 1, '#5a6a3a'); }
          else if (h > 0.96) P.px(x, y, SNOW[1]);
          continue;
        }
        const dens = 0.12 + 0.7 * LB.smooth(0.36, 0.66, fbm(x / 34, y / 26, 37, 2)) + (nearEdge(x, y) ? 0.3 : 0);
        if (h > dens) continue;
        const n = fbm(x / 70, y / 48, 5, 3);
        const dk = Gh(n < 0.38 ? G[0] : G[1]), md = Gh(G[2]), lt = Gh(n > 0.6 ? G[4] : G[3]);
        const type = Math.floor(hash(cx, cy, 36) * 5);
        if (type === 0) { P.px(x, y, dk); P.px(x - 1, y - 1, lt); P.px(x + 1, y - 1, lt); }
        else if (type === 1) { P.px(x, y, dk); P.px(x, y - 1, md); P.px(x + 1, y - 2, lt); }
        else if (type === 2) { P.px(x - 1, y, dk); P.px(x + 1, y, dk); P.px(x - 2, y - 1, lt); P.px(x, y - 1, lt); P.px(x + 2, y - 1, md); }
        else if (type === 3) { P.px(x, y, dk); P.px(x, y - 1, lt); }
        else { P.px(x, y, dk); P.px(x - 1, y - 1, md); P.px(x - 1, y - 2, lt); P.px(x + 1, y - 1, lt); }
      }
      // flowers in clumps of one kind
      const FL = { spring: ['#fff6f0', '#f4a6c6', '#f6e05a', '#a8c8f6'], summer: ['#e8483a', '#9a6ae0', '#f6d04a', '#fff6f0', '#f08a3a'], autumn: ['#a070d0', '#e0882e'] }[season];
      const pf = { spring: 0.3, summer: 0.34, autumn: 0.12 }[season] || 0;
      if (FL && !dust) for (let gy = 0; gy < H / 22; gy++) for (let gx = 0; gx < W / 24; gx++) {
        if (hash(gx, gy, 51) > pf) continue;
        const cx0 = gx * 24 + hash(gx, gy, 52) * 20, cy0 = gy * 22 + hash(gx, gy, 53) * 18;
        const col = FL[Math.floor(hash(gx, gy, 54) * FL.length)];
        const n = 3 + Math.floor(hash(gx, gy, 55) * 5);
        for (let k = 0; k < n; k++) {
          const x = Math.round(cx0 + (hash(gx * 9 + k, gy, 56) - 0.5) * 7), y = Math.round(cy0 + (hash(gx * 9 + k, gy, 57) - 0.5) * 5);
          if (!isGrass(x, y) || !isGrass(x, y + 1)) continue;
          P.px(x, y + 1, Gh(G[1]));
          if (hash(k, gx, gy) > 0.5) { P.px(x, y, col); P.px(x + 1, y, col); P.px(x, y - 1, LB.shade(col, 0.4)); }
          else { P.px(x, y, '#f8e070'); P.px(x - 1, y, col); P.px(x + 1, y, col); P.px(x, y - 1, col); }
        }
      }
      // pebbles in the dirt, footprints in the snow, puddles in the rain
      for (let gy = 0; gy < H / 5; gy++) for (let gx = 0; gx < W / 5; gx++) {
        const x = gx * 5 + Math.floor(hash(gx, gy, 61) * 4), y = gy * 5 + Math.floor(hash(gx, gy, 62) * 4);
        const i = y * W + x;
        if (!l.path[i] || y >= l.LIP[x] && y < l.FOOT[x]) continue;
        const h = hash(gx, gy, 63);
        if (winter) continue;
        if (h > 0.7) { P.px(x, y, '#d0c8b4'); P.px(x + 1, y, '#a49a86'); P.px(x + 1, y + 1, '#746a5a'); if (h > 0.9) P.px(x, y + 1, '#8a806e'); }
        else if (h < 0.06) { P.px(x, y, Gh(G[1])); P.px(x, y - 1, Gh(G[3])); }
      }
      if (winter) {
        // footprints up the main path and to the dock
        for (const line of [l.mainPath, l.dockPath]) {
          const pts = catmull(line, 1);
          for (let k = 4; k < pts.length - 2; k += 6) {
            const [x, y] = pts[k], side = (k / 6) % 2 ? 2 : -2;
            const X = Math.round(x + side), Y = Math.round(y);
            if (Y >= H || !l.path[Y * W + X]) continue;
            P.px(X, Y, SNOW[0]); P.px(X, Y + 1, SNOW[1]);
          }
        }
      }
      if (wet) {
        const pts = catmull(l.mainPath, 1);
        for (const k of [30, 62, 96, 128]) {
          if (!pts[k]) continue;
          const [x, y] = pts[k];
          const rx = 3 + (k % 3), ry = 1.5 + (k % 2);
          P.ellipse(x + 1, y, rx, ry, '#4a5a64'); P.ellipse(x + 1, y, rx - 1, ry - 0.5, '#8a9cb0');
          P.hline(x - rx + 2, x, Math.round(y - ry + 1), '#b8c8d8');
        }
      }
      // stones along the low shore of the pond and the stream banks
      for (const [x, y] of l.shore) {
        if (hash(x, y, 81) > 0.12 || y < l.FOOT[x] + 6) continue;
        const sx = x + (hash(x, y, 82) > 0.5 ? 1 : 0), sy = y + 1;
        if (!isGrass(sx, sy)) continue;
        P.px(sx, sy, winter ? SNOW[1] : '#9a9282'); P.px(sx + 1, sy, '#6e665a'); P.px(sx, sy - 1, winter ? SNOW[4] : '#c4bca8');
      }
      for (const [x, y, s, e] of l.streamPx) {
        if (e !== 0 || hash(x, y, 91) > 0.18) continue;
        const ox = l.stream[y * W + x + 1] ? -1 : 1;
        if (!isGrass(x + ox, y)) continue;
        P.px(x + ox, y, winter ? SNOW[3] : '#a8a090'); P.px(x + ox, y + 1, winter ? SNOW[1] : '#6e665a');
      }
      // fallen leaves under the trees
      if (season === 'autumn') {
        for (const t of l.trees) {
          if (t.k === 'spruce') continue;
          const n = t.k === 'bush' ? 10 : 46, rr = t.k === 'bush' ? 12 : 30;
          for (let k = 0; k < n; k++) {
            const a = hash(k, t.s, 71) * Math.PI * 2, dd = Math.pow(hash(k, t.s, 72), 0.7) * rr;
            const x = Math.round(t.x + Math.cos(a) * dd * 1.2 + 4), y = Math.round(t.y + 2 + Math.sin(a) * dd * 0.5);
            if (!isGrass(x, y) && !(l.path[y * W + x])) continue;
            const c = ['#d87a2a', '#c44a2a', '#e8b03a', '#a8582a'][k % 4];
            P.px(x, y, c); if (hash(k, t.s, 73) > 0.5) P.px(x + 1, y, LB.shade(c, -0.3));
          }
        }
      }
      // vines down the step and a dark line at its foot
      for (let x = 2; x < W; x++) {
        if (x >= STEP0 - 1 && x <= STEP1 + 1) continue;
        if (l.PT[x] >= 0 && l.PT[x] <= l.FOOT[x] + 1) continue;
        const fy = l.FOOT[x];
        P.px(x, fy, winter ? SNOW[1] : Gh(G[0]));
        if (!winter && hash(x, 2, 19) > 0.5) { P.px(x, fy - 1, Gh(G[1])); if (hash(x, 3, 19) > 0.6) P.px(x, fy - 2, Gh(G[2])); }
      }
      for (let v = 0; v < 9; v++) {
        let x = Math.floor(hash(v, 1, 23) * W);
        if (x > STEP0 - 4 && x < STEP1 + 4) continue;
        if (Math.abs(x - 330) < 16) continue;
        const len = 6 + Math.floor(hash(v, 2, 23) * 16);
        const IV = winter ? ['#6a5040', '#7a6050'] : season === 'autumn' ? ['#a8382a', '#e07a3a'] : ['#2e6a2a', '#5a9a3e'];
        let y = l.LIP[x] + 1;
        for (let k = 0; k < len && y < l.FOOT[x] - 2; k++) {
          P.px(x, y, IV[0]);
          if (!winter && k % 2 === 0) P.px(x + (k % 4 ? 1 : -1), y, IV[1]);
          y++; if (hash(v, k, 24) > 0.7) x += hash(v, k, 25) > 0.5 ? 1 : -1;
        }
      }
      // boulders bulging from the face, tufts and ferns on the ledges
      for (let b = 0; b < 9; b++) {
        const x = Math.floor(8 + hash(b, 1, 27) * (W - 16));
        if ((x > STEP0 - 10 && x < STEP1 + 10) || Math.abs(x - 330) < 20) continue;
        const y = Math.round(l.LIP[x] + 6 + hash(b, 2, 27) * (l.FOOT[x] - l.LIP[x] - 14));
        const r = 3.5 + hash(b, 3, 27) * 3;
        P.blob(x, y, r, Gh(RK[0]), b + 70, 0.2, 0.8);
        P.blob(x - 0.5, y - 0.5, r - 1, Gh(RK[2]), b + 71, 0.22, 0.8);
        P.blob(x - 1.5, y - 1.5, r * 0.45, Gh(RK[3]), b + 72, 0.25, 0.8);
        P.px(x - 2, y - 2, Gh(RK[4]));
        if (winter) P.hline(x - r + 1, x + r - 2, Math.round(y - r * 0.8), SNOW[4]);
        else if (hash(b, 4, 27) > 0.4) { P.hline(x - r + 2, x + 1, Math.round(y - r * 0.8), '#5e8a3a'); P.px(x - 1, Math.round(y - r * 0.8) - 1, '#86b04a'); }
      }
      if (!winter) for (let x = 2; x < W - 2; x++) {
        if ((x >= STEP0 - 1 && x <= STEP1 + 1) || Math.abs(x - 330) < 12 || hash(x, 5, 29) > 0.09) continue;
        for (let y = l.LIP[x] + 4; y < l.FOOT[x] - 3; y++) {
          const fi = l.face(x, y);
          if (fi.yy !== 0 || hash(x, y, 30) > 0.5) continue;
          const C = season === 'autumn' ? ['#8a7a3a', '#b8a24a'] : [Gh(G[1]), Gh(G[3])];
          P.px(x, y, C[0]); P.px(x - 1, y - 1, C[1]); P.px(x + 1, y - 1, C[1]); if (hash(x, y, 31) > 0.5) P.px(x, y - 2, C[1]);
          break;
        }
      }
      // snow cornice along the lip, with icicles
      if (winter) {
        for (let x = 0; x < W; x++) {
          if (x >= STEP0 && x <= STEP1) continue;
          const y = l.LIP[x], bump = Math.round(noise(x * 0.3, 2, 4) * 2);
          P.px(x, y, SNOW[4]); if (bump > 0) P.px(x, y + 1, SNOW[3]);
          P.px(x, y + 1 + (bump > 0 ? 1 : 0), SNOW[1]);
          if (hash(x, 9, 5) > 0.72 && Math.abs(x - 330) > 10) {
            const len = 2 + Math.floor(hash(x, 10, 5) * 5);
            for (let k = 0; k < len; k++) P.px(x, y + 2 + k, k < len - 1 ? '#d8eaf6' : '#a8c8e0');
          }
        }
      }
      return cv;
    });
  }

  // ---------- standing things ----------
  function treeSprite(t, season, dust) {
    if (t.k === 'spruce') return spruceSprite(season, t.s, t.tall, dust);
    if (t.k === 'bush') return bushSprite(season, t.s, dust);
    return oakSprite(season, t.s, { apples: t.k === 'apple', small: t.k === 'apple' });
  }
  function objectsArt(season, weather) {
    return LB.memo('verd-objects:' + season + ':' + weather, () => {
      const l = lay();
      const cv = LB.canvas(W, H), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const winter = season === 'winter', dust = !winter && weather === 'snow';
      const items = [];
      for (const t of l.trees) items.push([t.y, () => LB.blit(ctx, treeSprite(t, season, dust), t.x, t.y)]);
      items.push([HOUSE.y, () => LB.blit(ctx, houseSprite(season, dust), HOUSE.x, HOUSE.y)]);
      items.push([94, () => LB.blit(ctx, woodpileSprite(season, dust), 306, 94)]);
      items.push([142, () => LB.blit(ctx, lampSprite(season, dust), 168, 142)]);
      for (const [x, y, k] of l.ferns) if (!winter) items.push([y, () => LB.blit(ctx, fernSprite(season, k % 3), x, y)]);
      for (const [x, y, big] of l.rocks) items.push([y, () => LB.blit(ctx, rockSprite(x, big, season, dust), x, y)]);
      // reeds and cattails at the water's edge
      for (const [x, y] of l.reeds) items.push([y, () => {
        const RC = winter ? ['#a89a70', '#c8b88a'] : season === 'autumn' ? ['#9a8a44', '#c4a858'] : ['#4a8a3a', '#7ab452'];
        const n = 6 + Math.floor(hash(x, y, 0) * 4);
        for (let k = 0; k < n; k++) {
          const xx = x + Math.round((hash(x, k, 1) - 0.5) * 12), hgt = 5 + Math.floor(hash(x, k, 2) * 10);
          const lean = Math.round((xx - x) / 4);
          P.line(xx, y, xx + lean, y - hgt, RC[k % 2]);
          if (k % 2 === 0) P.line(xx, y - 1, xx + (lean >= 0 ? 3 : -3), y - 4, RC[(k + 1) % 2]);
          if (k % 3 === 1 && season !== 'spring') { P.rect(xx + lean, y - hgt - 2, 2, 4, '#6a3e22'); P.px(xx + lean, y - hgt - 2, '#9a6a3a'); P.px(xx + lean, y - hgt - 3, RC[0]); if (winter) P.px(xx + lean, y - hgt - 3, SNOW[4]); }
        }
        if (!winter) { P.hline(x - 6, x + 6, y, '#2e5a2a'); }
      }]);
      // the field: fence, rows of crops, a scarecrow
      const F = FIELD;
      const postAt = (x, y) => {
        P.rect(x - 1, y - 9, 3, 10, WOOD[2]); P.vline(x - 1, y - 9, y, WOOD[3]); P.vline(x + 1, y - 9, y, WOOD[1]); P.hline(x - 1, x + 1, y - 9, WOOD[4]);
        if (winter || dust) { P.hline(x - 1, x + 1, y - 10, SNOW[4]); }
      };
      const rail = (x0, x1, y) => {
        for (const dy of [7, 3]) { P.hline(x0, x1, y - dy, WOOD[3]); P.hline(x0, x1, y - dy + 1, WOOD[1]); if (winter || dust) P.hline(x0, x1, y - dy - 1, SNOW[3]); }
      };
      items.push([F.y0, () => { rail(F.x0, F.x1, F.y0); for (let x = F.x0; x <= F.x1; x += 12) postAt(x, F.y0); }]);
      const crop = (x, y, row) => {
        const h = hash(x, y, 3);
        if (season === 'spring') { P.px(x, y, '#5aa040'); P.px(x - 1, y - 1, '#8ad060'); P.px(x + 1, y - 1, '#8ad060'); if (h > 0.5) P.px(x, y - 2, '#a8e070'); }
        else if (season === 'summer') {
          if (row % 3 === 2) { for (let k = -2; k <= 2; k++) { P.vline(x + k, y - 7 - (k & 1), y, k < 0 ? '#c8a040' : '#a8822e'); P.px(x + k, y - 8 - (k & 1), '#f0d070'); } }
          else { const C = LB.ramp('#3e8a36', 5); P.ellipse(x, y - 3, 4, 3, C[1]); P.ellipse(x - 1, y - 4, 3, 2, C[2]); P.px(x - 2, y - 5, C[3]); P.px(x - 1, y - 5, C[4]); }
        } else if (season === 'autumn') {
          P.line(x - 4, y, x + 4, y - 1, '#4a6a2a'); P.px(x - 2, y - 2, '#5a7a30'); P.px(x + 3, y - 2, '#5a7a30');
          if (h > 0.35) { const C = LB.ramp('#e0782a', 5); P.ellipse(x, y - 2, 3, 2, C[1]); P.ellipse(x - 1, y - 3, 2, 1, C[2]); P.px(x - 1, y - 3, C[3]); P.vline(x + 1, y - 4, y - 1, C[0]); P.px(x, y - 5, '#4a6a2a'); }
        } else if (dust) P.px(x, y, '#7a8a5a');
      };
      for (let row = 0; row < 10; row++) {
        const y = F.y0 + 10 + row * 8;
        if (y > F.y1 - 4) break;
        items.push([y, () => {
          if (winter) { for (let x = F.x0 + 8; x < F.x1 - 6; x += 7) if (hash(x, row, 4) > 0.6) { P.px(x, y - 1, '#a89060'); P.px(x + 1, y - 2, '#c8b080'); } return; }
          for (let x = F.x0 + 10; x < F.x1 - 6; x += (season === 'autumn' ? 10 : 7)) crop(x + (row % 2) * 3, y, row);
        }]);
      }
      items.push([F.y0 + 44, () => LB.blit(ctx, scarecrowSprite(season, dust), F.x0 + 54, F.y0 + 44)]);
      items.push([F.y1, () => {
        for (let y = F.y0 + 12; y <= F.y1; y += 12) { postAt(F.x0, y); if (y < 196 || y > 214) postAt(F.x1, y); }
        for (const x of [F.x0, F.x1]) {
          for (let y = F.y0 - 7; y < F.y1 - 3; y++) {
            if (x === F.x1 && y > 186 && y < 210) continue;
            P.px(x, y, WOOD[3]); P.px(x + 1, y, WOOD[1]);
            if ((winter || dust) && (y % 2 === 0)) P.px(x, y, SNOW[3]);
          }
        }
        rail(F.x0, F.x1, F.y1); for (let x = F.x0; x <= F.x1; x += 12) postAt(x, F.y1);
      }]);
      // the dock, planks laid across, posts down into the water, a lantern at the end
      items.push([DOCK.y1, () => {
        const D = DOCK;
        for (let y = D.y0; y <= D.y1; y++) {
          const k = Math.floor((y - D.y0) / 4), yy = (y - D.y0) % 4;
          for (let x = D.x0; x <= D.x1; x++) {
            let c = yy === 3 ? WOOD[1] : yy === 0 ? LB.mix(WOOD[2], WOOD[3], 0.6) : (hash(k, 0, 9) > 0.6 ? WOOD[2] : LB.mix(WOOD[2], WOOD[3], 0.25));
            if (yy === 3 && hash(x >> 2, k, 3) > 0.7) c = WOOD[0];
            if (x <= D.x0 + 1) c = x === D.x0 ? WOOD[1] : WOOD[3];
            if (x >= D.x1 - 1) c = x === D.x1 ? WOOD[0] : WOOD[1];
            if (yy === 1 && (x === D.x0 + 2 || x === D.x1 - 2)) c = '#5a4434';
            if ((winter || dust) && yy < 2 && hash(x, k, 11) > (winter ? 0.25 : 0.6)) c = yy === 0 ? SNOW[4] : SNOW[3];
            P.px(x, y, c);
          }
        }
        for (const [px, py] of [[D.x0 - 1, D.y0 + 1], [D.x1 + 1, D.y0 + 1], [D.x0 - 1, D.y0 + 22], [D.x1 + 1, D.y0 + 22]]) { P.rect(px - 1, py - 2, 3, 6, WOOD[1]); P.hline(px - 1, px + 1, py - 2, WOOD[3]); }
        ctx.save(); ctx.globalAlpha = 0.35; P.rect(D.x1 + 2, D.y0 + 2, 3, 30, '#10283a'); ctx.restore();
        // lantern post
        P.rect(D.x1 - 1, D.y0 - 16, 2, 18, WOOD[1]); P.vline(D.x1 - 1, D.y0 - 16, D.y0 + 1, WOOD[3]);
        P.hline(D.x1 - 1, D.x1 + 4, D.y0 - 16, WOOD[2]);
        P.rect(D.x1 + 2, D.y0 - 14, 4, 5, '#2e2c36'); P.rect(D.x1 + 3, D.y0 - 13, 2, 3, '#d8dcc8'); P.hline(D.x1 + 1, D.x1 + 6, D.y0 - 15, '#3e3c48');
      }]);
      items.sort((a, b) => a[0] - b[0]);
      for (const [, f] of items) f();
      return cv;
    });
  }

  // the things that show upside down in the pond (the step, the terrace and what stands on it, the fall)
  let reflKey = '', reflCv = null;
  function reflection(S) {
    const k = S.season + ':' + S.weather;
    if (k === reflKey) return reflCv;
    const l = lay();
    const src = LB.canvas(W, H), c = LB.ctx2d(src), P = LB.paint(c);
    c.drawImage(groundArt(S.season, S.weather), 0, 0);
    // the fall, still: pale streaks
    for (let x = WF0; x < WF1; x++) for (let y = l.LIP[x]; y < l.FOOT[x]; y++) P.px(x, y, hash(x, y >> 2, 3) > 0.5 ? '#d8eef4' : '#8ec4d2');
    c.drawImage(objectsArt(S.season, S.weather), 0, 0);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = '#5a7ca4'; c.fillRect(0, 0, W, H);
    reflCv = LB.mirror(src, (x) => l.FOOT[x], 150, 450);
    const rc = LB.ctx2d(reflCv), g = rc.createLinearGradient(0, 128, 0, 250);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.85, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0.8)');
    rc.globalCompositeOperation = 'destination-out'; rc.fillStyle = g; rc.fillRect(0, 128, W, 122);
    reflKey = k;
    return reflCv;
  }

  // Water mirrors the sky rather than being lit like the land, so a warm grade would turn it to mud. Pre-divide its
  // colour by the warm part of the ambient light so it lands blue after the grade.
  function skyComp(c, S, k) {
    k = (k == null ? 0.85 : k) * S.L.golden;
    if (k <= 0.01) return LB.hex(c);
    const a = rgb(S.L.amb), v = rgb(c);
    return LB.mix(v, v.map((x, i) => Math.min(255, x * 255 / Math.max(60, a[i]))), k);
  }

  // ---------- water: the pond's colour by depth and sky, ice in winter ----------
  let baseKey = '', baseCv = null, openCv = null, pts = null;
  function pondBase(S) {
    const sky = LB.mix(S.L.skyTop, S.L.skyHor, 0.2 + 0.45 * S.L.golden);
    const k = S.season + ':' + S.weather + ':' + sky + ':' + S.L.amb;
    if (k === baseKey) return baseCv;
    const l = lay();
    baseCv = baseCv || LB.canvas(W, H); openCv = openCv || LB.canvas(W, H);
    const c = LB.ctx2d(baseCv), oc = LB.ctx2d(openCv);
    const id = c.createImageData(W, H), d = id.data, od = oc.createImageData(W, H), o = od.data;
    const winter = S.season === 'winter';
    const tint = S.weather === 'rain' ? '#6a7a86' : sky;
    const gsky = S.L.golden * (S.weather === 'clear' ? 1 : 0.3);
    const BAND = [['#86b29a', 0.12], ['#3a8c8a', 0.17], ['#24687e', 0.21], ['#16407a', 0.24]].map(([col, a]) => rgb(skyComp(LB.mix(col, tint, a + 0.22 * gsky), S)));
    const ICE = ['#86a8c4', '#a6c4da', '#c6dcec', '#e6f0f8'].map(rgb);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!l.pond[i]) continue;
      let dep = clamp(l.dist[i] / 28, 0, 1) + (noise(x * 0.08, y * 0.13, 6) - 0.5) * 0.14;
      dep += 0.5 * Math.exp(-(((x - 330) / 26) ** 2 + ((y - l.FOOT[x] - 6) / 14) ** 2));
      const band = dep < 0.1 ? 0 : dep < 0.28 ? 1 : dep < 0.52 ? 2 : 3;
      let col = BAND[band], open = 1;
      if (winter) {
        const iw = 6 + noise(x * 0.06, y * 0.06, 8) * 12;
        if (l.dist[i] < iw && Math.abs(x - 330) > 22) {
          open = 0;
          const nn = noise(x * 0.2, y * 0.3, 9);
          col = l.dist[i] < 2 ? ICE[3] : nn > 0.62 ? ICE[3] : nn > 0.4 ? ICE[2] : ICE[1];
          if (l.dist[i] > iw - 1.2) col = ICE[0];
          if (hash(x >> 1, y >> 1, 7) > 0.97) col = ICE[0];
        }
      }
      const k4 = i * 4;
      d[k4] = col[0]; d[k4 + 1] = col[1]; d[k4 + 2] = col[2]; d[k4 + 3] = 255;
      if (open) o[k4 + 3] = 255;
    }
    c.putImageData(id, 0, 0); oc.putImageData(od, 0, 0);
    if (winter) {
      // cracks in the ice
      const P = LB.paint(c);
      for (let k = 0; k < 7; k++) {
        let x = 180 + hash(k, 1, 3) * 250, y = 150 + hash(k, 2, 3) * 80;
        for (let s = 0; s < 14; s++) {
          const i = Math.round(y) * W + Math.round(x);
          if (l.pond[i] && !LB.inMask(openCv, x, y)) P.px(x, y, '#7a9cbc');
          x += (hash(k, s, 4) - 0.5) * 3; y += (hash(k, s, 5) - 0.3) * 2;
        }
      }
    }
    baseKey = k;
    pts = null;
    return baseCv;
  }
  function points() {
    if (pts) return pts;
    const l = lay();
    const notDock = (p) => !(p[0] > DOCK.x0 - 3 && p[0] < DOCK.x1 + 6 && p[1] > DOCK.y0 - 2);
    pts = {
      glint: LB.maskPoints(openCv, 70, 5).filter(notDock),
      shimmer: LB.maskPoints(openCv, 60, 6).filter(notDock),
      rain: LB.maskPoints(openCv, 50, 7).filter(notDock),
      star: LB.maskPoints(openCv, 34, 8).filter(notDock),
      fish: LB.maskPoints(openCv, 3, 9).filter(notDock),
    };
    return pts;
  }

  function sunPath(ctx, S, P) {
    const g = S.L.golden * (S.weather === 'clear' ? 1 : 0.2) * (1 - S.L.night);
    if (g < 0.08) return;
    const cx = S.time < 12 ? 380 : 214, l = lay();
    const col = LB.mix('#ffe4a0', S.L.skyHor, 0.25);
    ctx.save();
    for (let k = 0; k < 64; k++) {
      const y = 140 + Math.floor(hash(k, 1, 88) * 100);
      const spread = 10 + (y - 140) * 0.35;
      const x = Math.round(cx + (hash(k, 2, 88) - 0.5) * spread * 2 + Math.sin(S.t * 0.5 + k) * 2);
      const v = Math.sin(S.t * (1.2 + hash(k, 3, 88)) + k * 2.3);
      if (v < 0.2 || !LB.inMask(openCv, x, y)) continue;
      ctx.globalAlpha = g * (0.35 + 0.65 * v) * (1 - Math.abs(x - cx) / (spread * 1.2));
      const len = 1 + Math.floor(hash(k, 4, 88) * 4);
      P.hline(x, x + len, y, col);
    }
    ctx.restore();
  }

  function drawWaterfall(ctx, S, P) {
    const l = lay(), t = S.t, winter = S.season === 'winter';
    const T = ['#f4fbff', '#c2e4ee', '#84bccc', '#4e8ea6'];
    for (let x = WF0; x < WF1; x++) {
      const c = x - WF0, mid = 1 - Math.abs(c - 7.5) / 8;
      const flowing = !winter || Math.abs(c - 7.5) < 3;
      const sp = 52 + hash(c, 0, 1) * 26, L = 3 + Math.floor(hash(c, 1, 1) * 4);
      for (let y = l.LIP[x] - 1; y <= l.FOOT[x] + 1; y++) {
        let col;
        if (flowing) {
          const h = hash(c, Math.floor((y - t * sp) / L), 77);
          if ((c === 0 || c === WF1 - WF0 - 1) && h < 0.45) continue;
          col = h > 0.74 - 0.28 * mid ? T[0] : h > 0.44 ? T[1] : h > 0.18 ? T[2] : T[3];
          if (y < l.LIP[x] + 2 && mid > 0.25) col = y < l.LIP[x] + 1 ? '#e8f6fa' : T[1];
        } else {
          // frozen: icicle columns hanging from the lip
          const len = (l.FOOT[x] - l.LIP[x]) * (0.45 + hash(c, 2, 3) * 0.55);
          if (y - l.LIP[x] > len) continue;
          col = c % 3 === 0 ? '#a8c8e0' : c % 3 === 1 ? '#e6f2fa' : '#c8dcec';
          if (y - l.LIP[x] > len - 2) col = '#88aecb';
        }
        P.px(x, y, col);
      }
    }
    // foam and spray where it lands
    const fy = l.FOOT[330] + 2;
    const frame = Math.floor(t * 9);
    const n = winter ? 10 : 34;
    for (let k = 0; k < n; k++) {
      const a = hash(k, frame, 3) * Math.PI, rr = Math.sqrt(hash(k, frame, 4));
      const x = Math.round(330 + Math.cos(a) * rr * (winter ? 8 : 17)), y = Math.round(fy + Math.sin(a) * rr * 6);
      P.px(x, y, hash(k, frame, 5) > 0.4 ? '#f4fbff' : '#c6e2ea');
      if (hash(k, frame, 6) > 0.6) P.px(x + 1, y, '#e6f4f8');
    }
    if (!winter) {
      ctx.save();
      for (let k = 0; k < 6; k++) {
        const u = ((t * 0.35 + k / 6) % 1);
        ctx.globalAlpha = (1 - u) * 0.32;
        P.disc(330 + (k - 2.5) * 5 + u * (k - 2.5) * 6, fy - 2 - u * 14, 2 + u * 4, '#eef6fa');
      }
      ctx.restore();
    }
  }

  function drawStream(ctx, S, P) {
    const l = lay(), t = S.t, winter = S.season === 'winter';
    const sky = LB.mix(S.L.skyTop, '#2a6a78', 0.6);
    const base = [skyComp(LB.mix('#2c6e7c', sky, 0.3), S), skyComp(LB.mix('#3e8a90', sky, 0.25), S), skyComp(LB.mix('#6aaaa8', sky, 0.2), S)];
    for (const [x, y, s, e, h] of l.streamPx) {
      let c;
      if (winter) {
        c = e >= 2 && Math.sin(s * 0.5 - t * 2 + h) > 0.2 ? '#4a7a8c' : e === 0 ? '#a8c4da' : '#d6e6f2';
        if (e >= 3) c = '#3a6a7e';
      } else {
        c = e === 0 ? base[2] : e === 1 ? base[1] : base[0];
        const v = Math.sin(s * 0.55 - t * 6 + (x - y) * 0.1 + h * 0.7);
        const v2 = Math.sin(s * 0.31 - t * 4.2 + h * 0.5 + x * 0.05);
        if (v > 0.93 && v2 > 0.2 && e > 0) c = '#e2f2f4';
        else if (v > 0.75 && v2 > 0 && e > 1) c = base[1];
        if (y > l.LIP[x] - 7 && e > 0 && hash(x, Math.floor(y + t * 20), 4) > 0.75) c = '#e8f4f6';
      }
      P.px(x, y, c);
    }
  }

  function drawDucks(ctx, S, P) {
    if (S.season === 'winter' || S.L.night > 0.5) return;
    for (let k = 0; k < 2; k++) {
      const a = S.t * 0.06 + k * 0.5;
      const x = Math.round(312 + Math.cos(a) * 62 + k * 8), y = Math.round(196 + Math.sin(a) * 16 + k * 4);
      const left = Math.sin(a) > 0;
      // the wake
      ctx.save(); ctx.globalAlpha = 0.5;
      for (let w = 1; w < 6; w++) { const bx = x + (left ? w + 2 : -w - 2); P.px(bx, y + 1 + Math.floor(w / 2), '#cfe6ee'); P.px(bx, y + 1 - Math.floor(w / 2) + 1, '#cfe6ee'); }
      ctx.restore();
      const s = left ? -1 : 1;
      P.rect(x - 3, y - 1, 7, 3, '#8a7660'); P.hline(x - 3, x + 3, y - 1, '#a89478'); P.px(x - 3 * s, y - 1, '#f0ece0');
      P.rect(x + 2 * s - (s < 0 ? 1 : 0), y - 4, 2, 3, '#2e6a3e'); P.px(x + 2 * s, y - 4, '#4e9a5a');
      P.px(x + 4 * s - (s < 0 ? 0 : 0), y - 3, '#e8b030');
      P.px(x + 2 * s, y - 1, '#f0ece0');
    }
  }

  // window glass in scene coords
  const hx0 = HOUSE.x - Math.floor(HW / 2), hy0 = HOUSE.y - HH;
  const WINDOWS = HOUSE_WIN.map(([x, y, w, h], k) => k === 2 ? [hx0 + 56, hy0 + 46, 8, 8] : [hx0 + x, hy0 + y, w, h]);
  const PORCH = [hx0 + HOUSE_LAMP[0], hy0 + HOUSE_LAMP[1]];
  const CHIM = [hx0 + HOUSE_CHIMNEY[0], hy0 + HOUSE_CHIMNEY[1]];
  const DOCKLAMP = [DOCK.x1 + 4, DOCK.y0 - 12];
  const POSTLAMP = [168, 142 - 31];
  const FISHER = [253, 208];

  LB.add({
    id: 'verdance', order: 20, section: 'place',
    name: 'Millrace Farm', world: 'Verdance',
    blurb: 'The farm with some shape to the land: a stone step with a waterfall coming down it into a millpond, and the farmhouse on the terrace above, upside down in the water.',
    see: [
      'The house, the trees and the rock face mirrored in the pond, wobbling as the water moves',
      'Water that is light at the shallow edge and deep under the fall, with foam and rings where the fall lands',
      'A roof made of rows of shingles with moss toward the eaves, deep eaves throwing shade on the wall',
      'The field through the year: sprouts, wheat and greens, pumpkins, snowy furrows',
      'At night the lit windows and lanterns streak across the water',
    ],
    build: 'The land shapes (the step, the pond, the stair) are the Blender kit we already have with a better finish. The reflections, waterfall and lapping shore are a new water pass in the engine. The house and trees would become hand-drawn sprites.',
    now: 'verdance.png',
    w: W, h: H,
    init() { lay(); },
    ground(ctx, S) { ctx.drawImage(groundArt(S.season, S.weather), 0, 0); },
    shadows(sh, S) {
      const l = lay(), dust = S.season !== 'winter' && S.weather === 'snow';
      // the step throws a band of shade onto the low ground
      const sun = S.L.sun, k = 0.5, hc = 34;
      const top = [], bot = [];
      for (let x = -40; x <= W + 40; x += 4) { const fx = l.FOOT[clamp(x, 0, W - 1)]; top.push([x, fx]); bot.push([x + sun.dx * hc * k, fx + sun.dy * hc * k]); }
      LB.paint(sh.ctx).poly(top.concat(bot.reverse()), '#000');
      for (const t of l.trees) sh.cast(treeSprite(t, S.season, dust), t.x, t.y, null, null, { k: 0.85 });
      sh.cast(houseSprite(S.season, dust), HOUSE.x, HOUSE.y, null, null, { k: 0.8 });
      sh.cast(woodpileSprite(S.season, dust), 306, 94);
      sh.cast(scarecrowSprite(S.season, dust), FIELD.x0 + 54, FIELD.y0 + 44);
      sh.pole(168, 142, 34, 3);
      for (let x = FIELD.x0; x <= FIELD.x1; x += 12) { sh.pole(x, FIELD.y0, 9, 3); sh.pole(x, FIELD.y1, 9, 3); }
      for (let y = FIELD.y0 + 12; y <= FIELD.y1; y += 12) { sh.pole(FIELD.x0, y, 9, 3); sh.pole(FIELD.x1, y, 9, 3); }
      for (const [x, y, big] of l.rocks) sh.blob(x + 2, y - 1, big ? 10 : 6, big ? 4 : 3);
    },
    water(ctx, S, P) {
      const l = lay(), winter = S.season === 'winter';
      ctx.drawImage(pondBase(S), 0, 0);
      const pp = points();
      // the world upside down, wobbling
      LB.ripple(ctx, reflection(S), openCv, S, { amp: S.weather === 'rain' ? 2.4 : 1.6, freq: 0.8, speed: 1.8, alpha: S.weather === 'fog' ? 0.28 : 0.44, y0: 128, y1: 250, grow: true });
      // lily pads
      if (!winter) {
        for (let k = 0; k < l.pads.length; k++) {
          if (S.season === 'autumn' && k % 2) continue;
          const [x, y0, ph] = l.pads[k];
          const y = y0 + Math.round(Math.sin(S.t * 0.7 + ph * 9) * 0.6);
          const C = S.season === 'autumn' ? ['#6a4a2a', '#8a6a3a', '#aa8a4a'] : ['#2e6a36', '#4a8c40', '#74b04e'];
          P.ellipse(x, y, 3.5, 2, C[0]); P.ellipse(x, y - 1, 3, 1.4, C[1]); P.px(x - 2, y - 2, C[2]); P.px(x - 1, y - 2, C[2]);
          P.line(x, y, x + 3, y - 1, C[0]);
          if (S.season !== 'autumn' && k % 3 === 0) { P.px(x - 1, y - 2, '#f4a8c8'); P.px(x, y - 2, '#fff2f6'); P.px(x - 1, y - 3, '#fff2f6'); }
        }
      }
      drawDucks(ctx, S, P);
      // shimmer on the open water and glints toward the sun
      ctx.save();
      const hi = LB.mix(S.L.skyHor, '#ffffff', 0.45);
      for (const [x, y, ph] of pp.shimmer) {
        const v = Math.sin(S.t * 0.9 * (0.6 + ph) + ph * 30);
        if (v < 0.55) continue;
        ctx.globalAlpha = (v - 0.55) * 1.6;
        const len = 2 + Math.floor(ph * 3), ox = Math.round(Math.sin(S.t * 0.3 + ph * 10) * 2);
        P.hline(x + ox, x + ox + len - 1, y, hi);
      }
      ctx.restore();
      LB.glints(ctx, pp.glint, S);
      sunPath(ctx, S, P);
      // the low shore laps: a moving light line
      const lap = winter ? null : LB.mix('#d8ecea', S.L.skyHor, 0.25);
      if (lap) for (const [x, y] of l.shore) {
        const v = Math.sin(S.t * 1.5 + x * 0.33 + y * 0.21);
        if (v > 0.15 && LB.inMask(openCv, x, y)) P.px(x, y, lap);
      }
      drawWaterfall(ctx, S, P);
      LB.rings(ctx, [[322, l.FOOT[322] + 6, 0], [338, l.FOOT[338] + 7, 0.4], [330, l.FOOT[330] + 10, 0.75]], S, { period: 2.2, r: 11, alpha: 0.55 });
      if (S.weather === 'rain') LB.rings(ctx, pp.rain, S, { period: 1, r: 4, alpha: 0.6 });
      else if (!winter) LB.rings(ctx, pp.fish, S, { period: 5, r: 7, alpha: 0.5 });
      drawStream(ctx, S, P);
    },
    objects(ctx, S) { ctx.drawImage(objectsArt(S.season, S.weather), 0, 0); },
    live(ctx, S, P) {
      const l = lay(), t = S.t, night = S.L.night;
      // chimney smoke, leaning with the breeze
      ctx.save();
      for (let k = 0; k < 9; k++) {
        const u = ((t * 0.22 + k / 9) % 1);
        const x = CHIM[0] + u * u * 22 + Math.sin(u * 7 + k) * 1.5, y = CHIM[1] - u * 34;
        ctx.globalAlpha = (1 - u) * 0.55;
        P.disc(x, y, 1.5 + u * 4, u < 0.3 ? '#e8e4e0' : '#d0d0d8');
      }
      ctx.restore();
      // a rowboat by the dock
      const bob = Math.round(Math.sin(t * 1.1) * 0.6);
      if (S.season !== 'winter') LB.blit(ctx, boatSprite(S.season), 278, 228 + bob);
      // the farmer walks the path; someone fishes off the dock
      const pathPts = LB.memo('verd-walk', () => catmull(l.mainPath.slice(1, -1), 1));
      const len = pathPts.length - 1, period = 34;
      const u = (t % period) / period, f = u < 0.5 ? u * 2 : 2 - u * 2;
      const idx = Math.round(4 + f * (len - 8));
      const [px, py] = pathPts[idx], nxt = pathPts[clamp(idx + (u < 0.5 ? 2 : -2), 0, len)];
      const dx = nxt[0] - px, dy = nxt[1] - py;
      const dir = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
      LB.person(ctx, Math.round(px), Math.round(py) + 2, 'farmer', { dir, walk: true, t, seed: 3 });
      const [fx, fy] = FISHER;
      LB.person(ctx, fx, fy, 'fisher', { dir: 'up', t, seed: 5, item: null });
      const by = 189 + Math.round(Math.sin(t * 1.3) * 0.7), bx = fx + 23;
      P.line(fx + 6, fy - 18, fx + 21, fy - 38, '#5a3a24'); P.line(fx + 7, fy - 18, fx + 21, fy - 37, '#8a6440');
      ctx.save(); ctx.globalAlpha = 0.6; P.line(fx + 21, fy - 38, bx, by - 1, '#eef2f6'); ctx.restore();
      P.px(bx, by, '#e83a2a'); P.px(bx, by - 1, '#f8f8f8'); P.px(bx + 1, by, '#a82a22');
      LB.rings(ctx, [[bx, by + 1, 0.2]], S, { period: 3.4, r: 5, alpha: 0.45 });
      // birds by day, butterflies in the warm months, leaves and petals drifting
      if (night < 0.4 && S.weather !== 'rain') {
        const cyc = (t % 26) / 26;
        for (let k = 0; k < 3; k++) {
          const bx = Math.round(-30 + cyc * (W + 60) - k * 9), byy = Math.round(30 + k * 5 + Math.sin(t * 0.8 + k) * 3);
          const up = Math.floor(t * 6 + k) % 2;
          P.px(bx, byy, '#2a2a3a'); P.px(bx - 1, byy - up, '#2a2a3a'); P.px(bx + 1, byy - up, '#2a2a3a');
          if (up) { P.px(bx - 2, byy - 1, '#2a2a3a'); P.px(bx + 2, byy - 1, '#2a2a3a'); }
        }
      }
      if (night < 0.3 && S.weather === 'clear' && (S.season === 'spring' || S.season === 'summer')) {
        LB.motes(ctx, S, { n: 6, x: 360, y: 150, w: 120, h: 110, colors: ['#fff8e8', '#ffd84a', '#f4a8c8'], size: 2, seed: 4 });
        LB.motes(ctx, S, { n: 4, x: 20, y: 120, w: 120, h: 50, colors: ['#ffd84a', '#fff8e8'], size: 2, seed: 5 });
      }
      if (S.season === 'autumn') LB.motes(ctx, S, { n: 14, x: 0, y: 0, w: W, h: H, fall: 14, colors: ['#d87a2a', '#c44a2a', '#e8b03a'], seed: 6 });
      if (S.season === 'spring') LB.motes(ctx, S, { n: 10, x: 400, y: 150, w: 80, h: 110, fall: 9, colors: ['#f6c2d2', '#fff4f6'], seed: 7 });
      // mist on the water at dawn, and in fog
      const dawn = LB.smooth(4.5, 6, S.time) * (1 - LB.smooth(7.5, 9.5, S.time));
      const mist = S.weather === 'fog' ? 0.25 : dawn * (S.weather === 'clear' ? 0.38 : 0.2);
      if (mist > 0.02) {
        const tex = LB.memo('verd-mist', () => {
          const cv = LB.canvas(W * 2, 70), c = LB.ctx2d(cv), id = c.createImageData(W * 2, 70), d = id.data;
          for (let y = 0; y < 70; y++) for (let x = 0; x < W * 2; x++) {
            const n = LB.fbm(x * 0.012, y * 0.09, 21, 3, Math.round(W * 2 * 0.012)) * (1 - Math.abs(y - 35) / 35);
            const a = n > 0.42 ? 0.4 : n > 0.3 ? 0.22 : n > 0.22 ? 0.1 : 0;
            const k = (y * W * 2 + x) * 4; d[k] = 236; d[k + 1] = 242; d[k + 2] = 246; d[k + 3] = a * 255;
          }
          c.putImageData(id, 0, 0);
          return cv;
        });
        ctx.save(); ctx.globalAlpha = mist;
        const off = Math.round((t * 3) % (W * 2));
        ctx.drawImage(tex, -off, 150); ctx.drawImage(tex, W * 2 - off, 150);
        ctx.restore();
      }
    },
    emissive(ctx, S, P) {
      const on = LB.smooth(0.2, 0.6, S.L.night);
      if (on <= 0.01) return;
      ctx.save(); ctx.globalAlpha = on;
      const l = lay();
      for (const [x, y, w, h] of WINDOWS) {
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          if (xx === Math.floor(w / 2) || (h > 10 && yy === 6) || (h <= 10 && yy === 4)) continue;
          P.px(x + xx, y + yy, yy < 2 ? '#ffe9a8' : (xx + yy) % 7 === 0 ? '#ffd27a' : '#ffc860');
        }
      }
      P.rect(PORCH[0], PORCH[1], 2, 3, '#fff2b8');
      P.rect(DOCKLAMP[0], DOCKLAMP[1], 2, 3, '#fff2b8');
      P.rect(POSTLAMP[0] - 2, POSTLAMP[1] - 2, 5, 5, '#ffe8a0');
      // the lit windows and lamps streak across the water
      const refl = (x, y, w, h, col) => {
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          const X = x + xx, Y = 2 * l.FOOT[X] - (y + yy);
          const ox = Math.round(1.5 * Math.sin(Y * 0.9 + S.t * 2.2));
          if (!LB.inMask(openCv, X + ox, Y)) continue;
          ctx.globalAlpha = on * (0.45 + 0.2 * Math.sin(Y * 1.7 + S.t * 3));
          P.px(X + ox, Y, col);
        }
      };
      for (const [x, y, w, h] of WINDOWS) refl(x, y, w, h, '#ffcf70');
      // and the lanterns' long light on the water
      for (const [lx, ly] of [DOCKLAMP]) {
        for (let k = 0; k < 18; k++) {
          const Y = 2 * l.FOOT[lx] - ly + k * 2 - 60;
          const Yw = ly + 14 + k * 2;
          const ox = Math.round(2 * Math.sin(Yw * 0.7 + S.t * 2));
          if (!LB.inMask(openCv, lx + ox, Yw)) continue;
          ctx.globalAlpha = on * 0.6 * (1 - k / 18);
          P.hline(lx + ox - 1, lx + ox + 1 + (k % 2), Yw, '#ffd88a');
        }
      }
      // stars in the pond on a clear night, fireflies in summer
      if (S.weather === 'clear') {
        for (const [x, y, ph] of points().star) {
          const v = 0.5 + 0.5 * Math.sin(S.t * (1 + ph) + ph * 20);
          ctx.globalAlpha = on * v * 0.8;
          P.px(x + Math.round(Math.sin(S.t + y) * 0.6), y, '#d6e0ff');
        }
        if (S.season === 'summer' || S.season === 'spring') {
          ctx.globalAlpha = on;
          LB.motes(ctx, S, { n: 22, x: 160, y: 120, w: 300, h: 130, blink: true, colors: ['#e8ff8a', '#fff6b0'], seed: 9 });
          LB.motes(ctx, S, { n: 10, x: 0, y: 20, w: 160, h: 80, blink: true, colors: ['#e8ff8a'], seed: 10 });
        }
      }
      ctx.restore();
    },
    lights(S) {
      const out = [
        { x: PORCH[0] + 1, y: PORCH[1] + 3, r: 34, c: '#ffb050', flicker: 1 },
        { x: DOCKLAMP[0] + 1, y: DOCKLAMP[1] + 10, r: 36, c: '#ffb050', flicker: 1.2 },
        { x: POSTLAMP[0], y: POSTLAMP[1] + 20, r: 44, c: '#ffc070', flicker: 0.5, sq: 0.8 },
      ];
      for (const [x, y, w, h] of WINDOWS) out.push({ x: x + w / 2, y: y + h, r: 22, c: '#ffb860', i: 0.7, sq: 0.7 });
      return out;
    },
    after(ctx, S) {
      if (S.L.golden > 0.3) LB.rays(ctx, S, { n: 4, angle: 0.75, width: 22, alpha: 0.05 * S.L.golden, x0: -120, len: 200 });
    },
    bloom(ctx, S, P) {
      if (S.L.night < 0.4 && S.weather === 'clear') { LB.glints(ctx, points().glint, S); sunPath(ctx, S, P); }
    },
  });
})();
