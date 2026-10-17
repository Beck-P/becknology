// Buildings with character: one street, five worlds — an elven tree-house (Sylvara), a thatched bakery (Verdance), a
// timber-framed inn (Lumar), a log chalet (Hoarfell) and a noodle shop (Arcadia). Every building is drawn in code from
// parts (roofs in courses, walls by material, windows that glow at night) with the season laid over it.
(function () {
  'use strict';
  const W = 704, H = 270, BASE = 208, KERB = 224;
  const ZB = [127, 257, 425, 578]; // where one world's ground gives way to the next
  const R5 = (c, o) => LB.ramp(c, 5, o);

  // ---------- palettes ----------
  const SNOW = ['#8e9bc4', '#b5c2e1', '#d5def0', '#ecf1f9', '#ffffff'];
  const IRON = R5('#3c3c48');
  const GLASS = ['#141f33', '#1f2f48', '#2f4565', '#56709a', '#9cb6d4'];
  const OAK = R5('#5e3c22');
  const WOOD = R5('#8a5a32');
  const SLATE = R5('#5a6886', { spread: 0.9 });
  const SALT = R5('#6c7e7e', { spread: 0.9 });
  const PLASTER = R5('#e8dabc', { spread: 0.55 });
  const TEAL = R5('#2e706c');
  const THATCH = R5('#c49a4e', { spread: 0.85 });
  const WASH = R5('#ece3cf', { spread: 0.5 });
  const FIELD = R5('#8e8578');
  const SAGE = R5('#6e8e5a');
  const BRICK = R5('#a65a3c');
  const LOG = R5('#94603a');
  const RED = R5('#b4392f');
  const BARK = R5('#6c4a34');
  const BIRCH = R5('#e4d8bc', { spread: 0.6 });
  const CLAD = R5('#424a64');
  const CONC = R5('#8e919f', { spread: 0.8 });
  const METAL = R5('#5c6070');
  const FLOWERS = {
    spring: ['#f4a6c4', '#f6e27a', '#ffffff', '#c8a0f0'],
    summer: ['#e2443a', '#ffffff', '#f2903a', '#e85a8a'],
    autumn: ['#e48a2a', '#9a4a9e', '#d6582c', '#f0c040'],
  };
  const LEAF = {
    spring: R5('#7cb850'),
    summer: R5('#4a8a3c'),
    autumn: R5('#cc8030', { spread: 0.62 }),
    winter: R5('#3e6a52'),
  };
  const IVY = { spring: R5('#5e9a44'), summer: R5('#3e7e3a'), autumn: R5('#c0452e'), winter: null };

  // ---------- drawing helpers ----------
  // fill a rect pixel by pixel from fn(i, j, x, y) → colour (or null), merging runs of one colour
  function fillFn(P, x0, y0, w, h, fn) {
    const ctx = P.ctx;
    for (let j = 0; j < h; j++) {
      let runC = null, runX = 0;
      for (let i = 0; i <= w; i++) {
        const c = i < w ? fn(i, j, x0 + i, y0 + j) : null;
        if (c !== runC) {
          if (runC) { ctx.fillStyle = runC; ctx.fillRect(x0 + runX, y0 + j, i - runX, 1); }
          runC = c; runX = i;
        }
      }
    }
  }
  function inPoly(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function polyBox(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    return [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)];
  }
  // fill a polygon with a material function
  function polyFn(P, pts, fn) {
    const [x0, y0, x1, y1] = polyBox(pts);
    fillFn(P, x0, y0, x1 - x0 + 1, y1 - y0 + 1, (i, j, x, y) => (inPoly(pts, x + 0.5, y + 0.5) ? fn(x, y) : null));
  }

  // random-bond stonework: stones of varied length in courses of varied height, lit top, shaded bottom and right
  function stoneWall(P, x0, y0, w, h, S, seed, o) {
    o = o || {};
    const rng = LB.rng(seed);
    P.rect(x0, y0, w, h, o.mortar || S[0]);
    let y = 0;
    while (y < h) {
      const ch = Math.min(h - y, rng.int(o.chMin || 5, o.chMax || 7));
      let x = -rng.int(0, 7);
      while (x < w) {
        const sw = rng.int(o.swMin || 7, o.swMax || 13);
        const t = rng(), k = t < 0.25 ? 1 : t > 0.82 ? 3 : 2;
        const sx = Math.max(0, x + 1), ex = Math.min(w, x + sw), sy = y + 1, ey = y + ch;
        if (ex - sx >= 2 && ey - sy >= 2) {
          P.rect(x0 + sx, y0 + sy, ex - sx, ey - sy, S[k]);
          P.rect(x0 + sx, y0 + sy, ex - sx, 1, S[Math.min(4, k + 1)]);
          P.rect(x0 + sx, y0 + ey - 1, ex - sx, 1, S[k - 1]);
          if (ex - sx > 4) P.rect(x0 + ex - 1, y0 + sy + 1, 1, ey - sy - 1, S[k - 1]);
          if (rng() < 0.3) P.px(x0 + sx, y0 + sy, o.mortar || S[0]); // a chipped corner
          if (rng() < 0.12 && ex - sx > 6) P.px(x0 + sx + 2 + rng.int(0, ex - sx - 5), y0 + sy + 1 + rng.int(0, Math.max(0, ey - sy - 3)), S[k - 1]);
        }
        x += sw;
      }
      y += ch;
    }
  }
  function brickWall(P, x0, y0, w, h, B, mortar, seed) {
    fillFn(P, x0, y0, w, h, (i, j) => {
      const row = Math.floor(j / 4), r = j % 4;
      if (r === 3) return mortar;
      const bx = i + (row % 2) * 4, bi = Math.floor(bx / 8);
      if (bx % 8 === 7) return mortar;
      const h1 = LB.hash(bi, row, seed), k = h1 < 0.2 ? 1 : h1 > 0.85 ? 3 : 2;
      return r === 0 ? B[Math.min(4, k + 1)] : B[k];
    });
  }
  // round logs laid horizontally: a dark gap, a lit top, the body, a shaded underside; grain streaks
  function logWall(P, x0, y0, w, h, L, seed) {
    fillFn(P, x0, y0, w, h, (i, j) => {
      const r = j % 7, row = Math.floor(j / 7);
      if (r === 0) return L[0];
      if (r === 1) return L[3];
      if (r === 6) return L[1];
      if (r === 5) return LB.hash(i >> 2, row, seed) < 0.5 ? L[1] : L[2];
      const g = LB.hash(Math.floor((i + row * 5) / 5), row * 7 + r, seed + 3);
      return g < 0.1 ? L[1] : g > 0.93 ? L[3] : L[2];
    });
  }
  function logEnds(P, x, y0, h, L) {
    for (let j = 0; j + 6 <= h; j += 7) {
      P.disc(x, y0 + j + 3, 3, L[1]);
      P.disc(x, y0 + j + 3, 2, '#d8b07a');
      P.px(x, y0 + j + 3, '#a8784a'); P.px(x - 1, y0 + j + 2, '#ecca94');
    }
  }
  function planks(P, x0, y0, w, h, Wd, pw, seed) {
    fillFn(P, x0, y0, w, h, (i, j) => {
      const p = Math.floor(i / pw), c = i % pw;
      if (c === pw - 1) return Wd[0];
      if (c === 0) return Wd[3];
      const g = LB.hash(p, Math.floor(j / 3), seed);
      return g < 0.12 ? Wd[1] : Wd[2];
    });
  }
  function plaster(P, x0, y0, w, h, Pl, seed) {
    fillFn(P, x0, y0, w, h, (i, j, x, y) => {
      const n = LB.fbm(x * 0.09, y * 0.12, seed, 3);
      const low = j > h - 6 ? 1 : 0; // a little grime toward the foot
      if (n < 0.33 - low * 0.15) return Pl[1];
      if (n > 0.7) return Pl[3];
      return Pl[2];
    });
  }
  // slates or shingles in courses, seen from above: a dark line where each course shades the next, its butt catching light
  function slateAt(x, y, S, seed, o) {
    o = o || {};
    const ch = o.ch || 6, tw = o.tw || 8, y0 = o.y0 || 0;
    const jj = y - y0, course = Math.floor(jj / ch), r = ((jj % ch) + ch) % ch;
    const off = (course % 2) * (tw >> 1) + Math.floor(LB.hash(course, 0, seed) * 3);
    const ti = Math.floor((x + off) / tw), c = (((x + off) % tw) + tw) % tw;
    const h = LB.hash(ti, course, seed);
    let k = h < 0.2 ? 1 : h > 0.86 ? 3 : 2;
    if (o.moss && LB.hash(ti, course, seed + 9) < o.moss(y)) return r === ch - 1 ? o.mossR[0] : o.mossR[r === ch - 2 ? 3 : 2];
    if (r === ch - 1) return S[0];
    if (r === ch - 2) k = Math.min(4, k + 1);
    if (c === 0 && r >= 1) return S[Math.max(0, k - 2)];
    if (r === 0) k = Math.max(1, k - 1);
    return S[k];
  }
  // straw thatch: bands of bundles, vertical straw streaks, each band's rounded lip shading the band below
  function thatchAt(x, y, T, seed, y0) {
    const bh = 9, bw = 7, bx = ((x % bw) + bw) % bw;
    const scallop = Math.round(1.6 * Math.sin((Math.PI * bx) / bw));
    const jj = y - (y0 || 0) - scallop + Math.floor(LB.hash(Math.floor(x / bw), 0, seed) * 2);
    const band = Math.floor(jj / bh), r = jj % bh;
    if (r === bh - 1) return T[0];
    if (r === bh - 2) return LB.hash(x, band, seed + 1) < 0.6 ? T[1] : T[2];
    if (r === 0) return LB.hash(x, band, seed + 2) < 0.5 ? T[3] : T[2];
    const s = LB.hash(x, band, seed + 3), s2 = LB.hash(x, (jj >> 2), seed + 4);
    if (s < 0.14) return T[1];
    if (s > 0.8 && s2 > 0.3) return T[3];
    if (s2 > 0.95) return T[4];
    return T[2];
  }
  // snow lying on a surface; lit: 1 on a slope facing the key light, 0 in shade
  function snowAt(x, y, lit, seed) {
    const n = LB.fbm(x * 0.07, y * 0.16, seed, 3);
    let k = lit ? (n > 0.55 ? 4 : 3) : (n > 0.6 ? 3 : 2);
    if (n < 0.34) k -= 1;
    if (lit && LB.hash(x, y, seed) > 0.992) return SNOW[4];
    return SNOW[Math.max(1, k)];
  }
  // snow lying on a roof: the courses underneath still show as faint steps; vertical: courses run up and down the screen
  function snowRoofAt(x, y, lit, seed, o) {
    o = o || {};
    const ch = o.ch || 6, along = o.vertical ? x : y - (o.y0 || 0);
    const r = ((along % ch) + ch) % ch, course = Math.floor(along / ch);
    const n = LB.fbm(x * 0.06, y * 0.12, seed, 3);
    let k = lit === true ? 3 : lit === false ? 2 : lit;
    if (n > 0.64) k += 1; else if (n < 0.34) k -= 1;
    if (r === ch - 1 && LB.hash(o.vertical ? y >> 2 : x >> 2, course, seed) > 0.2) k -= 1;
    if (r === 0 && k < 4 && LB.hash(o.vertical ? y >> 2 : x >> 2, course, seed + 1) > 0.5) k += 1;
    if (k >= 3 && LB.hash(x, y, seed) > 0.994) return SNOW[4];
    return SNOW[LB.clamp(k, 1, 4)];
  }
  // a lip of snow along an edge, overhanging by 2–4 px, with icicles here and there
  function snowLip(P, x0, x1, y, seed, icicles) {
    for (let x = x0; x <= x1; x++) {
      const d = 2 + Math.round(LB.noise(x * 0.25, 1, seed) * 2);
      P.rect(x, y - 2, 1, 2, SNOW[3]);
      P.rect(x, y, 1, d, SNOW[3]);
      P.px(x, y + d - 1, SNOW[1]);
      if (LB.hash(x, 3, seed) > 0.6) P.px(x, y - 2, SNOW[4]);
      if (icicles && LB.hash(x, 7, seed) > 1 - icicles) {
        const len = 2 + Math.floor(LB.hash(x, 8, seed) * 7);
        P.rect(x, y + d, 1, len, '#cfe0f4'); P.px(x, y + d, '#ffffff');
        if (len > 4) P.px(x, y + d + len - 1, '#9fb8dc');
      }
    }
  }
  // snow resting on top of a ledge (sill, box, rail)
  function snowCap(P, x0, x1, y, seed) {
    for (let x = x0; x <= x1; x++) {
      const t = 1 + Math.round(LB.noise(x * 0.4, 2, seed) * 1.6);
      P.rect(x, y - t, 1, t, SNOW[3]);
      P.px(x, y - t, SNOW[4]);
    }
  }

  // a window: frame, glass that reflects the sky, panes; registers its glass for the night glow
  function windowAt(P, meta, x, y, w, h, o) {
    o = o || {};
    const F = o.frame || OAK, fw = o.fw || 2;
    P.rect(x, y, w, h, F[1]);
    P.rect(x + 1, y + 1, w - 2, h - 2, F[3]);
    const gx = x + fw, gy = y + fw, gw = w - fw * 2, gh = h - fw * 2;
    for (let j = 0; j < gh; j++) P.rect(gx, gy + j, gw, 1, j < gh * 0.28 ? GLASS[3] : j < gh * 0.62 ? GLASS[2] : GLASS[1]);
    // the reflection of the sky: a soft diagonal band of light across the glass
    for (let k = 0; k < gw + gh; k += 9) for (let d = 0; d < 2; d++) {
      for (let j = 0; j < gh; j++) { const i = k + d - j; if (i >= 0 && i < gw && (j + i) % 3 !== 2) P.px(gx + i, gy + j, j < gh * 0.4 ? GLASS[4] : GLASS[3]); }
    }
    const cols = o.cols || 2, rows = o.rows || 2;
    const mull = [], mullR = [];
    for (let c = 1; c < cols; c++) { const mx = gx + Math.round((c * gw) / cols); P.rect(mx, gy, 1, gh, F[2]); mull.push(mx); }
    for (let r = 1; r < rows; r++) { const my = gy + Math.round((r * gh) / rows); P.rect(gx, my, gw, 1, F[2]); mullR.push(my); }
    P.rect(gx, gy, gw, 1, F[0]); P.rect(gx, gy, 1, gh, F[0]); // the frame's shadow on the glass
    meta.panes.push({ x: gx, y: gy, w: gw, h: gh, mull, mullR, lit: o.lit == null ? 0.8 : o.lit, warm: o.warm || '#ffd88a', seed: x * 7 + y });
    if (o.sill) { P.rect(x - 2, y + h, w + 4, 2, o.sill[3]); P.rect(x - 2, y + h + 2, w + 4, 1, o.sill[1]); }
  }
  function shutter(P, x, y, w, h, S, heart) {
    P.rect(x, y, w, h, S[1]);
    P.rect(x + 1, y + 1, w - 2, h - 2, S[2]);
    for (let j = y + 3; j < y + h - 2; j += 3) P.rect(x + 1, j, w - 2, 1, S[1]);
    P.rect(x + 1, y + 1, 1, h - 2, S[3]);
    if (heart) { const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2) - 1; P.px(cx - 1, cy, '#f4ead8'); P.px(cx + 1, cy, '#f4ead8'); P.rect(cx - 1, cy + 1, 3, 1, '#f4ead8'); P.px(cx, cy + 2, '#f4ead8'); }
  }
  function windowBox(P, x, y, w, season, seed) {
    // the plants first, so the box sits in front of their stems
    if (season === 'winter') {
      for (let i = 1; i < w - 1; i += 3) { P.rect(x + i, y + 1, 1, 3, '#2e5a3e'); P.px(x + i + 1, y + 2, '#3e6e4a'); }
    } else {
      const Lf = LEAF[season === 'autumn' ? 'summer' : season], fl = FLOWERS[season];
      for (let i = 0; i < w; i++) {
        const t = 1 + Math.floor(LB.hash(i, 1, seed) * 3);
        P.rect(x + i, y + 3 - t, 1, t + 1, LB.hash(i, 2, seed) > 0.5 ? Lf[2] : Lf[1]);
        if (LB.hash(i, 3, seed) > 0.7) P.px(x + i, y + 3 - t, Lf[3]);
      }
      const r = LB.rng(seed);
      for (let i = 1; i < w - 1; i += 2 + r.int(0, 2)) {
        const c = fl[r.int(0, fl.length - 1)], fy = y - r.int(0, 2);
        P.px(x + i, fy, c); if (r() > 0.5) P.px(x + i + 1, fy, c); P.px(x + i, fy + 1, LB.shade(c, -0.5));
      }
      // a trailing stem over the front
      P.rect(x + 2, y + 6, 1, 4, Lf[1]); P.px(x + 3, y + 8, Lf[2]); P.rect(x + w - 4, y + 6, 1, 3, Lf[1]);
    }
    P.rect(x, y + 3, w, 5, WOOD[2]);
    P.rect(x, y + 3, w, 1, WOOD[3]);
    P.rect(x, y + 7, w, 1, WOOD[0]);
    P.rect(x + 1, y + 5, w - 2, 1, WOOD[1]);
    if (season === 'winter') snowCap(P, x - 1, x + w, y + 4, seed);
  }
  function wallLantern(P, meta, x, y, o) {
    o = o || {};
    P.rect(x - (o.flip ? -1 : 3), y - 3, 3, 1, IRON[1]); // bracket
    P.rect(x - 3, y - 1, 7, 2, IRON[2]); P.px(x, y - 2, IRON[2]);
    P.rect(x - 3, y + 1, 7, 8, IRON[0]);
    P.rect(x - 2, y + 2, 5, 6, '#c09a5a'); P.rect(x - 2, y + 2, 1, 6, '#d8b878');
    P.rect(x - 2, y + 5, 5, 1, IRON[1]);
    P.rect(x - 1, y + 9, 3, 1, IRON[1]);
    meta.lamps.push({ x, y: y + 4, c: o.c || '#ffcf70' });
  }
  function barrel(P, x, y) { // x, y: bottom-left
    P.rect(x + 1, y - 13, 10, 13, WOOD[2]);
    P.rect(x, y - 11, 12, 9, WOOD[2]);
    P.rect(x + 1, y - 13, 3, 13, WOOD[3]); P.rect(x, y - 11, 2, 9, WOOD[3]);
    P.rect(x + 9, y - 12, 2, 12, WOOD[1]);
    for (const hy of [y - 11, y - 4]) P.rect(x, hy, 12, 1, IRON[1]);
    P.rect(x + 1, y - 14, 10, 2, WOOD[1]); P.rect(x + 2, y - 14, 8, 1, WOOD[3]);
  }
  function crate(P, x, y, w, h) {
    P.rect(x, y - h, w, h, WOOD[2]);
    P.rect(x, y - h, w, 1, WOOD[4]); P.rect(x, y - h, 1, h, WOOD[3]);
    P.rect(x + w - 1, y - h, 1, h, WOOD[0]); P.rect(x, y - 1, w, 1, WOOD[0]);
    P.line(x + 1, y - 2, x + w - 2, y - h + 1, WOOD[1]);
    P.rect(x, y - h + 3, w, 1, WOOD[1]);
  }
  function smokeAt(meta, x, y) { meta.smoke.push({ x, y }); }

  // a leafy crown: dark clusters behind, lit clusters on top toward the upper left, each with a shaded lower-right rim
  function crown(P, cx, cy, rx, ry, Lr, seed, o) {
    o = o || {};
    const r = LB.rng(seed);
    const put = (n, rad0, rad1, kOff, spread) => {
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * spread;
        const x = cx + Math.cos(a) * d * rx, y = cy + Math.sin(a) * d * ry;
        const lit = -((x - cx) / rx) * 0.6 - ((y - cy) / ry) * 0.9 + (r() - 0.5) * 0.6 + kOff;
        const k = LB.clamp(Math.round(2 + lit * 1.4), 0, 4);
        const rad = rad0 + r() * (rad1 - rad0);
        P.blob(x + 1, y + 1, rad, Lr[Math.max(0, k - 1)], i + seed, 0.3, 0.85);
        P.blob(x, y, rad, Lr[k], i + seed, 0.3, 0.85);
        if (k >= 3 && r() < 0.5) P.blob(x - rad * 0.3, y - rad * 0.35, rad * 0.4, Lr[Math.min(4, k + 1)], i + seed + 5, 0.4, 0.8);
        if (o.snow && (y - cy) / ry < 0.35 && r() < 0.7) {
          // snow only lands on leaves already there (no flakes floating past the crown's edge)
          P.ctx.globalCompositeOperation = 'source-atop';
          P.ellipse(Math.round(x - rad * 0.15), Math.round(y - rad * 0.55), Math.max(1, rad * 0.55), Math.max(1, rad * 0.22), SNOW[3]);
          P.px(Math.round(x - rad * 0.3), Math.round(y - rad * 0.65), SNOW[4]);
          P.ctx.globalCompositeOperation = 'source-over';
        }
        if (o.blossom && k >= 2 && r() < 0.55) for (let b = 0; b < 3; b++) P.px(x + r.int(-rad, rad) * 0.7, y + r.int(-rad, rad) * 0.6, r() < 0.5 ? '#ffffff' : '#f6c6da');
      }
    };
    put(16, 9, 14, -0.9, 0.85);
    put(46, 6, 10, 0, 0.92);
    put(26, 3, 6, 0.6, 0.85);
    // sprigs past the edge so the outline is ragged, not round
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, x = cx + Math.cos(a) * rx * 1.02, y = cy + Math.sin(a) * ry * 1.0;
      const lit = -Math.cos(a) * 0.6 - Math.sin(a) * 0.9;
      P.px(x, y, Lr[LB.clamp(Math.round(2 + lit * 1.4), 0, 4)]);
      if (r() < 0.4) P.px(x + (Math.cos(a) > 0 ? 1 : -1), y, Lr[LB.clamp(Math.round(1.5 + lit * 1.4), 0, 4)]);
    }
  }

  // ---------- the buildings (each: a cached sprite + where its glass, lamps and chimneys are) ----------
  function build(key, w, h, g, fn) {
    return LB.memo('bld:' + key, () => {
      const cv = LB.canvas(w, h), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const meta = { panes: [], lamps: [], smoke: [], orbs: [], neon: [], screens: [] };
      fn(P, ctx, meta);
      const out = LB.outline(cv, 'sel', 1.25), oc = LB.ctx2d(out);
      // the ground row is where the building meets the street: no outline under it
      oc.clearRect(0, g, w, h - g); oc.drawImage(cv, 0, g, w, h - g, 0, g, w, h - g);
      return { cv: out, meta, w, h, g };
    });
  }

  // Lumar: the Gull & Lantern — saltstone below, a jettied timber-framed floor above, slate roof with a front gable
  function inn(season) {
    return build('inn:' + season, 158, 206, 200, (P, ctx, meta) => {
      const snow = season === 'winter';
      // ground floor in saltstone
      stoneWall(P, 10, 144, 138, 56, SALT, 11, { chMin: 6, chMax: 8, swMin: 9, swMax: 16 });
      stoneWall(P, 10, 192, 138, 8, R5('#56676a'), 12, { chMin: 8, chMax: 8, swMin: 14, swMax: 22 });
      // upper floor: plaster between oak posts, rails and braces
      plaster(P, 4, 93, 150, 47, PLASTER, 3);
      const beam = (x, y, w, h) => { P.rect(x, y, w, h, OAK[2]); P.rect(x, y, Math.min(w, 1), h, OAK[3]); P.rect(x + w - 1, y, 1, h, OAK[1]); };
      for (const px of [4, 56, 100, 150]) beam(px, 93, 5, 47);
      beam(4, 134, 151, 5); beam(4, 93, 151, 4);
      const brace = (x0, y0, x1, y1) => { for (let d = 0; d < 3; d++) P.line(x0 + d, y0, x1 + d, y1, d === 0 ? OAK[3] : d === 2 ? OAK[1] : OAK[2]); };
      brace(61, 97, 93, 133); brace(93, 97, 61, 133); // a St Andrew's cross under the gable
      brace(9, 133, 16, 98); brace(144, 133, 137, 98);
      // the jetty: the upper floor sits out over the ground floor on joists
      P.rect(2, 139, 154, 5, OAK[1]); P.rect(2, 139, 154, 1, OAK[3]);
      for (let x = 6; x < 154; x += 8) { P.rect(x, 140, 3, 3, OAK[3]); P.px(x + 2, 142, OAK[0]); }
      P.rect(10, 144, 138, 4, SALT[0]); P.rect(10, 148, 138, 1, SALT[1]); // the jetty's shade on the stone
      // upper windows with shutters and boxes
      for (const wx of [22, 112]) {
        shutter(P, wx - 8, 101, 7, 26, TEAL); shutter(P, wx + 25, 101, 7, 26, TEAL);
        windowAt(P, meta, wx, 101, 24, 26, { frame: TEAL, cols: 2, rows: 3, lit: 0.85 });
        windowBox(P, wx - 2, 125, 28, season, wx);
      }
      // ground floor windows: wide, small panes, stone sills
      for (const wx of [18, 106]) {
        P.rect(wx - 3, 155, 39, 3, SALT[3]); P.rect(wx - 3, 155, 39, 1, SALT[4]); // lintel
        windowAt(P, meta, wx, 158, 34, 27, { frame: TEAL, cols: 4, rows: 2, lit: 1, warm: '#ffc874', sill: SALT });
      }
      // the door: arched, oak planks, iron straps, a stone surround
      const dx = 66, dw = 26, dTop = 150;
      for (let j = 0; j < 50; j++) {
        const y = dTop + j, half = j < 13 ? Math.round(Math.sqrt(169 - (13 - j) * (13 - j))) : 13;
        P.rect(79 - half - 3, y, half * 2 + 6, 1, j < 13 ? SALT[3] : SALT[2]);
      }
      for (let j = 0; j < 50; j++) {
        const y = dTop + 3 + j, half = j < 10 ? Math.round(Math.sqrt(100 - (10 - j) * (10 - j))) : 10;
        if (y < 200) planks(P, 79 - half, y, half * 2, 1, R5('#6e4426'), 5, 4);
      }
      for (const sy of [170, 187]) { P.rect(70, sy, 18, 2, IRON[1]); for (let x = 71; x < 88; x += 4) P.px(x, sy, IRON[3]); }
      P.disc(85, 180, 2, IRON[2]); P.px(85, 180, IRON[0]);
      for (let k = 0; k < 7; k++) { const a = Math.PI * (1 - k / 6); P.px(79 + Math.round(Math.cos(a) * 12), dTop + 13 - Math.round(Math.sin(a) * 12), SALT[1]); }
      // steps out onto the street
      P.rect(62, 200, 34, 3, SALT[3]); P.rect(62, 200, 34, 1, SALT[4]); P.rect(64, 203, 30, 2, SALT[2]);
      wallLantern(P, meta, 59, 158); wallLantern(P, meta, 99, 158, { flip: true });
      // props
      barrel(P, 138, 200); barrel(P, 147, 200);
      crate(P, 12, 200, 13, 11); crate(P, 15, 189, 9, 7);
      // ---- roof: a hipped slate roof over the eaves, a front gable in the middle, a brick chimney
      const roof = [[12, 10], [146, 10], [157, 93], [0, 93]];
      const mossR = R5('#6a7a48');
      polyFn(P, roof, (x, y) => (y < 15 ? SLATE[1] : slateAt(x, y, SLATE, 21, { y0: 15, moss: (yy) => (yy > 70 ? 0.08 : 0.02), mossR })));
      // ridge tiles
      for (let x = 13; x < 146; x++) { const s = (x - 13) % 6; P.px(x, 13, s < 4 ? SLATE[3] : SLATE[1]); P.px(x, 14, s < 4 ? SLATE[2] : SLATE[0]); P.px(x, 15, SLATE[0]); }
      // hips: the corner lines down to the eaves
      P.line(12, 10, 0, 93, SLATE[3]); P.line(13, 10, 1, 93, SLATE[1]);
      P.line(146, 10, 157, 93, SLATE[0]);
      // fascia and gutter along the eaves
      P.rect(0, 89, 158, 3, OAK[1]); P.rect(0, 89, 158, 1, OAK[3]); P.rect(0, 92, 158, 1, IRON[0]);
      // the eaves' shadow on the plaster
      P.rect(4, 97, 150, 2, PLASTER[0]);
      // front gable: plaster and timber face, round window, oak bargeboards, its own slates behind
      const A = [79, 34];
      polyFn(P, [[A[0], A[1] - 4], [108, 92], [50, 92]], (x, y) => slateAt(x, y, SLATE, 23, { y0: 15 }));
      const face = [[79, 44], [104, 90], [54, 90]];
      polyFn(P, face, (x, y) => { const n = LB.fbm(x * 0.09, y * 0.12, 5, 3); return n < 0.33 ? PLASTER[1] : n > 0.7 ? PLASTER[3] : PLASTER[2]; });
      P.rect(77, 46, 4, 44, OAK[2]); P.px(77, 46, OAK[3]);
      P.rect(62, 77, 34, 3, OAK[2]); P.rect(62, 77, 34, 1, OAK[3]);
      P.disc(79, 64, 7, OAK[1]); P.disc(79, 64, 6, OAK[3]); P.disc(79, 64, 5, GLASS[2]);
      P.rect(74, 59, 5, 3, GLASS[3]); P.rect(75, 59, 2, 1, GLASS[4]); P.rect(79, 59, 1, 11, OAK[2]); P.rect(74, 64, 11, 1, OAK[2]);
      meta.panes.push({ x: 74, y: 59, w: 11, h: 11, round: 5, cx: 79, cy: 64, mull: [79], mullR: [64], lit: 0.6, warm: '#ffd88a', seed: 5 });
      for (let d = 0; d < 4; d++) {
        P.line(A[0], A[1] + d, 48 + d, 93, d === 0 ? OAK[3] : d === 3 ? OAK[0] : OAK[2]);
        P.line(A[0], A[1] + d, 110 - d, 93, d === 0 ? OAK[2] : d === 3 ? OAK[0] : OAK[1]);
      }
      P.rect(78, 30, 3, 4, OAK[3]); P.px(79, 29, OAK[2]); // the finial
      // valleys behind the gable
      P.line(66, 20, 49, 88, SLATE[0]); P.line(92, 20, 109, 88, SLATE[0]);
      P.line(79, 16, 79, 31, SLATE[3]);
      // chimney
      brickWall(P, 118, 6, 15, 30, R5('#8e4e38'), '#4a2a22', 31);
      P.rect(118, 6, 1, 30, BRICK[3]);
      P.rect(116, 3, 19, 4, SALT[2]); P.rect(116, 3, 19, 1, SALT[4]); P.rect(116, 6, 19, 1, SALT[0]);
      for (const cx of [121, 129]) { P.rect(cx - 2, -1 + 1, 5, 3, '#b0643c'); P.rect(cx - 2, 0, 5, 1, '#d08a5a'); P.rect(cx - 1, 0, 3, 1, '#3a2018'); smokeAt(meta, cx, 0); }
      P.rect(117, 35, 17, 2, IRON[2]); // flashing
      if (snow) {
        polyFn(P, roof, (x, y) => {
          if (y > 86 || (inPoly([[A[0], A[1] - 6], [112, 93], [46, 93]], x + 0.5, y + 0.5))) return null;
          const lx = 12 + (y - 10) * (-12 / 83), rx = 146 + (y - 10) * (11 / 83), n = LB.noise(x * 0.3, y * 0.3, 5) * 2.5;
          if (x < lx + 2 + n || x > rx - 2 - n || y < 13 + n * 0.6) return null;
          const end = x < lx + 8 ? 4 : x > rx - 8 ? 2 : 3;
          return snowRoofAt(x, y, end, 41, { y0: 15 });
        });
        polyFn(P, [[A[0], A[1] - 6], [112, 93], [46, 93]], (x, y) => (inPoly(face, x + 0.5, y + 0.5) || y > 86 ? null : snowRoofAt(x, y, x < A[0] ? 3 : 2, 43, { y0: 15 })));
        P.line(66, 20, 49, 86, SNOW[1]); P.line(92, 20, 109, 86, SNOW[1]); P.line(79, 16, 79, 31, SNOW[4]);
        for (let x = 13; x < 146; x++) { P.px(x, 13, SNOW[4]); P.px(x, 14, SNOW[3]); P.px(x, 15, (x % 6) < 4 ? SNOW[2] : SNOW[1]); }
        snowLip(P, 0, 157, 88, 44, 0.3);
        snowCap(P, 116, 135, 3, 45);
        for (let d = 0; d < 2; d++) { P.line(A[0], A[1] - 1 + d, 48, 91 + d, SNOW[4]); P.line(A[0], A[1] - 1 + d, 110, 91 + d, SNOW[3]); }
        snowCap(P, 2, 155, 139, 46);
        for (const wx of [18, 106]) snowCap(P, wx - 2, wx + 35, 185, wx);
        snowCap(P, 137, 158, 186, 47);
      }
      meta.sign = { x: 156, y: 104 };
    });
  }

  // Verdance: the bakery — whitewashed walls on a fieldstone foot, a deep thatch with an eyebrow over the attic window
  function bakery(season) {
    return build('bakery:' + season, 128, 192, 184, (P, ctx, meta) => {
      const snow = season === 'winter';
      plaster(P, 6, 104, 116, 72, WASH, 7);
      // quoins at the corners
      for (let y = 106; y < 176; y += 8) { for (const qx of [6, 116]) { P.rect(qx, y, 6, 4, FIELD[3]); P.rect(qx, y, 6, 1, FIELD[4]); P.rect(qx, y + 3, 6, 1, FIELD[1]); } }
      stoneWall(P, 6, 172, 116, 12, FIELD, 17, { chMin: 6, chMax: 6, swMin: 8, swMax: 14 });
      // the eaves' deep shadow on the wall
      P.rect(6, 104, 116, 4, WASH[0]); P.rect(6, 108, 116, 2, WASH[1]);
      // shop window with bread on the shelves, a striped awning
      windowAt(P, meta, 14, 130, 44, 40, { frame: SAGE, cols: 4, rows: 3, lit: 1, warm: '#ffc070', sill: FIELD });
      meta.panes[meta.panes.length - 1].shop = true;
      for (const [sy, n] of [[146, 6], [159, 5]]) for (let i = 0; i < n; i++) {
        const bx = 18 + i * 7 + (sy === 159 ? 3 : 0);
        P.ellipse(bx + 2, sy, 3, 2, '#7a4a26'); P.rect(bx, sy - 1, 3, 1, '#a46a36');
      }
      const stripes = ['#efe6d2', '#6e8e5a'];
      for (let x = 10; x < 62; x++) {
        const c = stripes[Math.floor((x - 10) / 6) % 2];
        P.rect(x, 116, 1, 12, c);
        P.px(x, 116, LB.shade(c, 0.4)); P.px(x, 127, LB.shade(c, -0.4));
        if ((x - 10) % 6 < 3) P.px(x, 128, LB.shade(c, -0.5)); // scalloped edge
      }
      P.rect(10, 116, 52, 1, '#ffffff');
      P.rect(14, 129, 44, 2, '#4a4038'); // the awning's shade on the glass
      // the sign over the door: a loaf on a board
      P.rect(64, 116, 28, 13, OAK[1]); P.rect(65, 117, 26, 11, OAK[2]); P.rect(65, 117, 26, 1, OAK[3]);
      P.ellipse(77, 122, 7, 3, '#c88a3e'); P.ellipse(77, 121, 6, 2, '#e0aa58');
      for (const sx of [73, 77, 81]) P.line(sx, 121, sx + 1, 123, '#9a6430');
      // the Dutch door
      planks(P, 68, 136, 20, 48, R5('#6e8e5a'), 5, 9);
      P.rect(67, 135, 22, 1, SAGE[0]); P.rect(67, 135, 1, 49, SAGE[0]); P.rect(88, 135, 1, 49, SAGE[0]);
      P.rect(68, 159, 20, 2, SAGE[3]); P.rect(68, 161, 20, 1, SAGE[0]);
      P.disc(84, 166, 1, '#e0c070');
      P.rect(70, 140, 16, 9, GLASS[2]); P.rect(70, 140, 16, 3, GLASS[3]); P.rect(78, 140, 1, 9, SAGE[2]);
      meta.panes.push({ x: 70, y: 140, w: 16, h: 9, mull: [78], mullR: [], lit: 1, warm: '#ffc070', seed: 3 });
      P.rect(66, 184, 24, 3, FIELD[3]); P.rect(66, 184, 24, 1, FIELD[4]); // step
      // the right window with a box of flowers
      windowAt(P, meta, 96, 128, 20, 26, { frame: SAGE, cols: 2, rows: 2, lit: 0.7 });
      windowBox(P, 94, 154, 24, season, 96);
      // a rose up the right corner
      const vine = IVY[season];
      for (let y = 112; y < 182; y++) {
        const x = 118 + Math.round(Math.sin(y * 0.21) * 2);
        P.px(x, y, '#5a3a22');
        if (vine && LB.hash(y, 1, 3) > 0.35) { P.px(x - 1, y, vine[2]); if (LB.hash(y, 2, 3) > 0.5) P.px(x + 1, y - 1, vine[3]); if (LB.hash(y, 4, 3) > 0.7) P.px(x - 2, y + 1, vine[1]); }
        if (season === 'summer' && LB.hash(y, 5, 3) > 0.9) { P.px(x + 1, y, '#e86a8a'); P.px(x + 1, y + 1, '#b03a5a'); }
        if (season === 'spring' && LB.hash(y, 5, 3) > 0.92) P.px(x + 1, y, '#f6d0dc');
      }
      // flour sacks and a basket of loaves
      const sack = (x, y) => { P.rect(x, y - 12, 12, 12, '#8a7c64'); P.rect(x - 1, y - 10, 14, 9, '#8a7c64'); P.rect(x + 1, y - 11, 10, 11, '#e6dcc6'); P.rect(x, y - 9, 12, 8, '#e6dcc6'); P.rect(x + 1, y - 11, 3, 11, '#f6f0e2'); P.rect(x + 9, y - 10, 2, 10, '#bcae94'); P.rect(x + 2, y - 7, 8, 2, '#6a88b0'); P.rect(x + 3, y - 13, 6, 2, '#cfc2a6'); P.px(x + 5, y - 14, '#8a7a5a'); };
      sack(50, 184); sack(58, 186); sack(54, 176);
      crate(P, 98, 184, 16, 9);
      for (let i = 0; i < 3; i++) { P.ellipse(102 + i * 4, 174, 2, 1, '#c88a3e'); P.px(101 + i * 4, 173, '#e6b060'); }
      // ---- the thatch
      const roof = [[14, 12], [114, 12], [127, 96], [126, 102], [1, 102], [0, 96]];
      polyFn(P, roof, (x, y) => thatchAt(x, y, THATCH, 3, 14));
      // rounded hips: shade the ends
      for (let y = 12; y < 102; y++) {
        const t = (y - 12) / 90, lx = Math.round(14 - 14 * t), rx = Math.round(114 + 13 * t);
        for (let d = 0; d < 4; d++) { P.px(lx + d, y, d < 2 ? THATCH[3] : THATCH[2]); P.px(rx - d, y, d < 2 ? THATCH[0] : THATCH[1]); }
      }
      // the eave: a thick rounded lip of straw ends
      for (let x = 0; x < 128; x++) {
        P.rect(x, 96, 1, 7, THATCH[1]);
        P.px(x, 96, THATCH[3]); P.px(x, 97, THATCH[2]);
        if (LB.hash(x, 9, 2) > 0.4) P.px(x, 100, THATCH[0]);
        if (LB.hash(x, 8, 2) > 0.6) P.px(x, 103, THATCH[1]);
        P.px(x, 102, THATCH[0]);
      }
      // ridge cap with a cut pattern
      for (let x = 14; x < 115; x++) {
        P.rect(x, 9, 1, 7, THATCH[2]); P.px(x, 9, THATCH[4]); P.px(x, 10, THATCH[3]);
        const s = (x - 14) % 8;
        const depth = s < 4 ? s : 8 - s;
        P.rect(x, 16, 1, 2 + depth, THATCH[2]); P.px(x, 17 + depth, THATCH[0]);
        if (s === 4) P.px(x, 13, THATCH[1]);
      }
      // the eyebrow over the attic window
      for (let x = 26; x < 68; x++) {
        const t = (x - 47) / 21, yy = Math.round(62 - 14 * Math.sqrt(Math.max(0, 1 - t * t)));
        P.rect(x, yy, 1, 4, THATCH[3]); P.px(x, yy, THATCH[4]); P.px(x, yy + 4, THATCH[0]); P.px(x, yy + 5, THATCH[1]);
      }
      P.rect(36, 66, 22, 12, THATCH[1]);
      windowAt(P, meta, 38, 64, 18, 14, { frame: OAK, cols: 2, rows: 1, lit: 0.6 });
      P.rect(36, 78, 22, 2, THATCH[0]);
      // straw finials: a little bird on the ridge
      P.rect(96, 4, 6, 4, THATCH[3]); P.rect(101, 2, 3, 3, THATCH[3]); P.px(104, 3, '#8a6a2a'); P.rect(94, 6, 3, 2, THATCH[2]);
      // the oven chimney
      brickWall(P, 14, 0, 13, 26, R5('#9a5038'), '#4a2a22', 7);
      P.rect(14, 0, 1, 26, BRICK[3]); P.rect(12, 0, 17, 2, FIELD[2]); P.rect(12, 0, 17, 1, FIELD[4]);
      P.rect(16, 0, 9, 1, '#2a1a14');
      smokeAt(meta, 20, 0);
      P.rect(13, 24, 15, 3, THATCH[0]);
      if (snow) {
        polyFn(P, roof, (x, y) => {
          const lx = 14 + (y - 12) * (-14 / 90), rx = 114 + (y - 12) * (13 / 90), n = LB.noise(x * 0.3, y * 0.3, 6) * 2.5;
          if (y > 93 || x < lx + 2 + n || x > rx - 2 - n) return null;
          return snowRoofAt(x, y, x < lx + 8 ? 4 : x > rx - 8 ? 2 : 3, 51, { ch: 9, y0: 14 });
        });
        for (let x = 14; x < 115; x++) { P.px(x, 9, SNOW[4]); P.px(x, 16, SNOW[2]); }
        for (let x = 26; x < 68; x++) { const t = (x - 47) / 21, yy = Math.round(62 - 14 * Math.sqrt(Math.max(0, 1 - t * t))); P.rect(x, yy - 2, 1, 3, SNOW[3]); P.px(x, yy - 2, SNOW[4]); }
        snowLip(P, 0, 127, 95, 52, 0.25);
        snowCap(P, 12, 28, 1, 53);
        snowCap(P, 10, 61, 117, 54);
        snowCap(P, 64, 91, 116, 55);
      }
    });
  }

  // Hoarfell: a log chalet, gable to the street, a carved balcony, red shutters, snow on everything
  function chalet(season) {
    return build('chalet:' + season, 142, 198, 190, (P, ctx, meta) => {
      // walls: logs below, boards in the gable
      logWall(P, 10, 98, 122, 92, LOG, 5);
      for (const ex of [7, 134]) logEnds(P, ex, 98, 88, LOG);
      stoneWall(P, 8, 183, 126, 7, R5('#7c7e88'), 9, { chMin: 7, chMax: 7, swMin: 9, swMax: 15 });
      // ground floor: door with a carved frame, shuttered windows
      for (const wx of [22, 98]) {
        shutter(P, wx - 7, 151, 7, 24, RED, true); shutter(P, wx + 20, 151, 7, 24, RED, true);
        windowAt(P, meta, wx, 151, 20, 24, { frame: R5('#f0e4cc', { spread: 0.5 }), cols: 2, rows: 2, lit: 1, warm: '#ffc468' });
        P.rect(wx - 8, 175, 36, 2, LOG[3]); P.rect(wx - 8, 177, 36, 1, LOG[0]);
      }
      planks(P, 61, 146, 20, 44, R5('#5a6e4a'), 5, 11);
      P.rect(58, 142, 26, 4, LOG[3]); P.rect(58, 142, 26, 1, LOG[4]); P.rect(58, 146, 3, 44, LOG[3]); P.rect(81, 146, 3, 44, LOG[1]);
      for (const [hx, hy] of [[66, 156], [74, 156], [70, 168]]) { P.rect(hx, hy, 3, 3, '#3e4e34'); P.px(hx + 1, hy + 1, '#2a3424'); }
      P.disc(77, 171, 1, '#e0c070');
      wallLantern(P, meta, 53, 152);
      // upper floor windows behind the balcony
      for (const wx of [30, 92]) {
        shutter(P, wx - 6, 104, 6, 20, RED, false); shutter(P, wx + 20, 104, 6, 20, RED, false);
        windowAt(P, meta, wx, 104, 20, 20, { frame: R5('#f0e4cc', { spread: 0.5 }), cols: 2, rows: 2, lit: 0.7, warm: '#ffc468' });
      }
      // the balcony: a floor on joists, then carved boards with heart cut-outs
      P.rect(10, 138, 122, 5, LOG[1]); P.rect(10, 138, 122, 1, LOG[3]);
      for (let x = 12; x < 132; x += 7) { P.rect(x, 139, 3, 3, LOG[3]); P.px(x + 2, 141, LOG[0]); }
      P.rect(10, 143, 122, 3, LOG[0]);
      for (let x = 10; x < 132; x += 5) {
        P.rect(x, 122, 5, 16, '#c8925a'); P.rect(x, 122, 1, 16, '#e0b07a'); P.rect(x + 4, 122, 1, 16, '#8a5a34');
        P.px(x + 2, 136, '#8a5a34'); P.rect(x + 1, 137, 3, 1, '#8a5a34');
        if (((x - 10) / 5) % 2 === 1) { P.px(x + 1, 127, '#3a2414'); P.px(x + 3, 127, '#3a2414'); P.rect(x + 1, 128, 3, 1, '#3a2414'); P.px(x + 2, 129, '#3a2414'); }
      }
      P.rect(8, 119, 126, 3, '#a87444'); P.rect(8, 119, 126, 1, '#d8a46c'); P.rect(8, 122, 126, 1, '#5a3a20');
      for (const px of [8, 70, 130]) { P.rect(px, 119, 4, 24, '#a87444'); P.rect(px, 119, 1, 24, '#d8a46c'); }
      // firewood and skis
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - (r === 2 ? 1 : 0); i++) {
        const lx = 14 + i * 6 + (r % 2) * 3, ly = 186 - r * 5;
        P.disc(lx, ly, 3, '#7a4e2c'); P.disc(lx, ly, 2, '#d6a874'); P.px(lx, ly, '#a8784a'); P.px(lx - 1, ly - 1, '#ecc490');
      }
      for (const [sx, c] of [[118, '#c0392f'], [122, '#2f6fb0']]) { P.line(sx, 150, sx + 3, 189, c); P.line(sx + 1, 150, sx + 4, 189, LB.shade(c, 0.4)); P.px(sx, 149, c); }
      P.line(127, 156, 129, 189, IRON[3]);
      // ---- the roof: two snowy slopes seen from above, the ridge running back from the gable's peak
      const A = [71, 64], Ab = [71, 24], L = [0, 99], Lb = [0, 59], Rr = [141, 99], Rb = [141, 59];
      const left = [Ab, A, L, Lb], right = [Ab, Rb, Rr, A];
      // gable face: vertical boards with a small window, under the roof edges
      polyFn(P, [[71, 70], [128, 98], [14, 98]], (x, y) => { const c = x % 5; return c === 0 ? LOG[0] : c === 1 ? LOG[3] : LB.hash(Math.floor(x / 5), y >> 2, 3) < 0.15 ? LOG[1] : LOG[2]; });
      windowAt(P, meta, 64, 80, 14, 14, { frame: R5('#f0e4cc', { spread: 0.5 }), cols: 2, rows: 2, lit: 0.6, warm: '#ffc468' });
      P.rect(14, 96, 114, 2, LOG[0]);
      // wooden shakes, then a pillow of snow lying on them, short of the side and back edges where the wind thins it
      const SHAKE = R5('#6e4c34');
      polyFn(P, left, (x, y) => slateAt(x, y, SHAKE, 71, { ch: 4, tw: 5 }));
      polyFn(P, right, (x, y) => slateAt(x, y, R5('#5a3c2a'), 72, { ch: 4, tw: 5 }));
      const lineDist = (a, b, x, y) => Math.abs((b[0] - a[0]) * (a[1] - y) - (a[0] - x) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
      const snowy = (x, y) => {
        const leftSide = x <= 71, side = leftSide ? left : right;
        if (!inPoly(side, x + 0.5, y + 0.5)) return false;
        const n = LB.noise(x * 0.35, y * 0.35, 77) * 2.4;
        const back = lineDist(Ab, leftSide ? Lb : Rb, x, y), outer = leftSide ? x : 141 - x;
        return back > 1.5 + n && outer > 2.5 + n;
      };
      for (const [side, lit] of [[left, true], [right, false]]) {
        polyFn(P, side, (x, y) => {
          if (!snowy(x, y)) return null;
          if (!snowy(x, y + 1) || !snowy(x + (lit ? -1 : 1), y + 1)) return lit ? SNOW[2] : SNOW[1];
          if (!snowy(x, y - 1)) return lit ? SNOW[4] : SNOW[3];
          return snowRoofAt(x, y, lit ? 3 : 2, lit ? 61 : 62, { ch: 999 });
        });
      }
      P.line(71, 23, 71, 64, SNOW[4]); P.line(72, 23, 72, 64, SNOW[1]);
      // drifts: soft ridges of snow across each slope
      for (let k = 0; k < 4; k++) {
        const t = 0.25 + k * 0.2;
        for (let x = 10; x < 69; x++) { const y = Math.round(LB.lerp(24, 64, t) + (71 - x) * (35 / 71) * 0.98 + Math.sin(x * 0.3 + k) * 1.5); if (LB.hash(x, k, 5) > 0.25) P.px(x, y, SNOW[2]); P.px(x, y - 1, SNOW[4]); }
        for (let x = 74; x < 131; x++) { const y = Math.round(LB.lerp(24, 64, t) + (x - 71) * (35 / 70) * 0.98 + Math.sin(x * 0.3 + k) * 1.5); if (LB.hash(x, k, 6) > 0.25) P.px(x, y, SNOW[1]); P.px(x, y - 1, SNOW[3]); }
      }
      // the bargeboards along the front edges, carved, with the snow overhanging them
      for (let d = 0; d < 4; d++) {
        P.line(A[0], A[1] + 2 + d, L[0] + 2, L[1] + 1 + d, d === 0 ? '#d8a46c' : d === 3 ? '#4a2a14' : '#a87444');
        P.line(A[0], A[1] + 2 + d, Rr[0] - 2, Rr[1] + 1 + d, d === 0 ? '#c8925a' : d === 3 ? '#3a2010' : '#8a5a34');
      }
      for (let x = 4; x < 138; x += 6) { const y = x < 71 ? Math.round(A[1] + 6 + (71 - x) * (35 / 71)) : Math.round(A[1] + 6 + (x - 71) * (35 / 70)); P.px(x, y, '#3a2010'); }
      for (let x = 0; x <= 141; x++) {
        const y = x < 71 ? Math.round(A[1] + (71 - x) * (35 / 71)) : Math.round(A[1] + (x - 71) * (35 / 70));
        P.rect(x, y - 1, 1, 3, x < 71 ? SNOW[4] : SNOW[3]);
        P.px(x, y + 2, SNOW[1]);
        if (LB.hash(x, 7, 9) > 0.55 && (x < 60 || x > 82)) {
          const len = 2 + Math.floor(LB.hash(x, 8, 9) * 8);
          P.rect(x, y + 6, 1, len, '#cfe0f4'); P.px(x, y + 6, '#ffffff'); if (len > 4) P.px(x, y + 5 + len, '#9fb8dc');
        }
      }
      // chimney on the right slope
      stoneWall(P, 104, 36, 13, 18, R5('#7c7e88'), 13, { chMin: 4, chMax: 5, swMin: 5, swMax: 8 });
      P.rect(102, 32, 17, 4, '#5a5c68'); P.rect(102, 32, 17, 1, '#8a8c98');
      snowCap(P, 102, 118, 32, 63); P.rect(106, 34, 9, 1, '#2a2a30');
      P.rect(104, 52, 13, 3, SNOW[1]);
      smokeAt(meta, 110, 31);
      // snow on the balcony rail, sills and a drift along the foot of the walls
      snowCap(P, 8, 133, 119, 64);
      for (const wx of [22, 98]) snowCap(P, wx - 8, wx + 27, 175, wx + 1);
      snowCap(P, 10, 31, 181, 65);
      for (let x = 2; x < 140; x++) {
        if (x > 58 && x < 84) continue;
        const d = 2 + Math.round(LB.noise(x * 0.15, 4, 7) * 4);
        P.rect(x, 190 - d, 1, d, SNOW[3]); P.px(x, 190 - d, SNOW[4]);
      }
      meta.smallLamp = true;
      void season;
    });
  }

  // Sylvara: a door into a great tree, round windows in the bark, a balcony, lanterns hung from the boughs
  function treehouse(season) {
    return build('tree:' + season, 124, 210, 200, (P, ctx, meta) => {
      const snow = season === 'winter';
      // the trunk: wide root flare, bark in vertical ridges, moss toward the light
      const halfAt = (y) => (y > 170 ? 30 + Math.pow((y - 170) / 30, 2) * 26 : y > 90 ? 24 + ((y - 90) / 80) * 6 : 24);
      fillFn(P, 0, 50, 124, 151, (i, j, x, y) => {
        const hw = halfAt(y), dx = x - 62;
        if (Math.abs(dx) > hw) return null;
        const u = (dx + hw) / (2 * hw);
        const n = LB.noise(x * 0.45, y * 0.06, 3), m = LB.fbm(x * 0.1, y * 0.07, 9, 3);
        let k = u < 0.25 ? 3 : u < 0.62 ? 2 : u < 0.85 ? 1 : 0;
        if (n < 0.3) k = Math.max(0, k - 1); else if (n > 0.78 && k < 4) k += 1;
        if (m > 0.62 && u < 0.6 && y < 185) return m > 0.7 ? '#7a9a4a' : '#5e7e3c';
        return BARK[k];
      });
      // roots reaching out over the ground
      for (const [x0, x1, y1] of [[40, 8, 200], [48, 22, 201], [80, 114, 200], [74, 100, 201], [56, 50, 202]]) {
        for (let d = 0; d < 3; d++) P.line(x0, 182 + d, x1, y1 - 2 + d, BARK[d === 0 ? 3 : d === 1 ? 2 : 0]);
      }
      // the door: a round arch of birch, teal planks, a porthole
      for (let j = 0; j < 50; j++) {
        const y = 150 + j, half = j < 14 ? Math.round(Math.sqrt(196 - (14 - j) * (14 - j))) : 14;
        P.rect(62 - half, y, half * 2, 1, BIRCH[2]);
      }
      for (let k = 0; k < 9; k++) { const a = Math.PI * (k / 8); P.px(62 + Math.round(Math.cos(a) * 13), 164 - Math.round(Math.sin(a) * 13), BIRCH[4]); }
      for (let j = 0; j < 47; j++) {
        const y = 153 + j, half = j < 11 ? Math.round(Math.sqrt(121 - (11 - j) * (11 - j))) : 11;
        planks(P, 62 - half, y, half * 2, 1, R5('#2f7a72'), 4, 13);
      }
      P.disc(62, 166, 3, BIRCH[1]); P.disc(62, 166, 2, GLASS[2]); P.px(61, 165, GLASS[4]);
      meta.panes.push({ x: 60, y: 164, w: 5, h: 5, round: 2, cx: 62, cy: 166, mull: [], mullR: [], lit: 1, warm: '#ffe0a0', seed: 9 });
      P.disc(69, 182, 1, '#f0d070');
      // leaf carvings either side of the door
      for (const sx of [46, 77]) for (let k = 0; k < 4; k++) { P.px(sx, 170 + k * 7, '#9adca0'); P.px(sx + 1, 171 + k * 7, '#6aac78'); }
      // round windows in the bark
      for (const [wx, wy, wr] of [[42, 124, 7], [84, 106, 6]]) {
        P.disc(wx, wy, wr + 1, BIRCH[1]); P.disc(wx, wy, wr, BIRCH[3]); P.disc(wx, wy, wr - 1, GLASS[2]);
        P.rect(wx - wr + 2, wy - wr + 2, wr, 2, GLASS[3]); P.px(wx - 2, wy - 3, GLASS[4]);
        P.rect(wx, wy - wr + 1, 1, wr * 2 - 1, BIRCH[2]);
        meta.panes.push({ x: wx - wr + 1, y: wy - wr + 1, w: wr * 2 - 1, h: wr * 2 - 1, round: wr - 1, cx: wx, cy: wy, mull: [wx], mullR: [], lit: 1, warm: '#ffe0a0', seed: wx });
      }
      // a curved balcony on the right with a rail
      P.rect(80, 92, 36, 5, '#a87a4a'); P.rect(80, 92, 36, 1, '#d4a46e'); P.rect(80, 96, 36, 1, '#5a3a20');
      for (let x = 82; x < 116; x += 5) P.rect(x, 82, 1, 10, '#c8945c');
      P.rect(80, 81, 37, 2, '#d4a46e'); P.rect(80, 83, 37, 1, '#6a4424');
      P.line(98, 97, 92, 116, '#6a4424'); P.line(99, 97, 93, 116, '#a87a4a'); // a strut
      // elven lamp posts by the door
      for (const lx of [36, 90]) {
        P.rect(lx, 178, 2, 22, '#c8b48c'); P.px(lx, 178, '#e8dcb8');
        P.line(lx + 1, 178, lx + (lx < 62 ? 4 : -2), 172, '#c8b48c');
        meta.orbs.push({ x: lx + (lx < 62 ? 4 : -2), y: 170 });
        P.disc(lx + (lx < 62 ? 4 : -2), 170, 3, '#5a8a86'); P.disc(lx + (lx < 62 ? 4 : -2), 170, 2, '#a8d8d0');
      }
      // mushrooms and ferns at the foot
      for (const [mx, my, c] of [[20, 199, '#c43a32'], [26, 201, '#c43a32'], [104, 200, '#5ac8d8'], [99, 202, '#5ac8d8']]) {
        P.rect(mx, my - 3, 1, 3, '#efe6d0'); P.ellipse(mx, my - 4, 3, 1, c); P.px(mx - 1, my - 5, LB.shade(c, 0.5));
        if (c === '#c43a32') P.px(mx + 1, my - 4, '#ffffff');
        if (c === '#5ac8d8') meta.orbs.push({ x: mx, y: my - 4, small: true });
      }
      // the crown, with boughs showing under it
      for (const [x0, y0, x1, y1] of [[56, 70, 20, 54], [66, 68, 104, 50], [60, 74, 44, 60]]) {
        for (let d = 0; d < 3; d++) P.line(x0, y0 + d, x1, y1 + d, BARK[d === 0 ? 3 : d === 1 ? 2 : 0]);
      }
      crown(P, 62, 34, 60, 33, LEAF[season], 31, { snow, blossom: season === 'spring' });
      // lanterns hung from the boughs on cords
      for (const [lx, top, bot] of [[16, 56, 80], [108, 52, 74]]) {
        P.rect(lx, top, 1, bot - top, '#4a3a2a');
        P.disc(lx, bot + 3, 4, '#3a5a5a'); P.disc(lx, bot + 3, 3, '#8ad0c4'); P.px(lx - 1, bot + 1, '#d8fff4');
        P.rect(lx - 2, bot - 1, 5, 2, '#c8a45c');
        meta.orbs.push({ x: lx, y: bot + 3 });
      }
      // hanging vines with small flowers
      if (season !== 'winter') for (const vx of [6, 30, 90, 118]) {
        const len = 10 + (vx % 7) * 2;
        for (let j = 0; j < len; j++) { P.px(vx + Math.round(Math.sin(j * 0.5) * 1), 58 + j, LEAF[season][1]); if (j % 4 === 2) P.px(vx + 1, 58 + j, season === 'autumn' ? '#f0c040' : '#f0e0ff'); }
      }
      if (snow) {
        snowCap(P, 80, 116, 92, 71); snowCap(P, 80, 117, 81, 72);
        for (const [x0, x1, y] of [[6, 30, 199], [88, 118, 199]]) snowCap(P, x0, x1, y, x0);
      }
    });
  }

  // Arcadia: a noodle shop under three floors of flats — neon, a half-up shutter, a fire escape, cables, a vending machine
  const GLYPH = {
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  };
  const KANJI = [
    ['0010100', '1111111', '0010100', '0111110', '0100010', '0111110', '0100010'],
    ['0001000', '1111111', '0100010', '0011100', '0100010', '1111111', '0001000'],
    ['1110111', '1010101', '1110111', '0001000', '1111111', '0010100', '1100011'],
  ];
  function shop(season) {
    return build('shop:' + season, 124, 210, 200, (P, ctx, meta) => {
      const snow = season === 'winter';
      // the facade: dark cladding panels with concrete floor bands
      fillFn(P, 2, 30, 120, 170, (i, j, x, y) => {
        const px = i % 20, py = (j + 4) % 22;
        if (px === 19 || py === 21) return CLAD[1];
        if (px === 0 || py === 0) return CLAD[3];
        // calm panels; a little grime toward each panel's foot
        if (py > 17 && LB.hash(x, y, 4) > 0.6) return LB.mix(CLAD[2], CLAD[1], 0.5);
        return LB.hash(Math.floor(i / 20), Math.floor((j + 4) / 22), 5) > 0.7 ? LB.mix(CLAD[2], CLAD[3], 0.3) : CLAD[2];
      });
      for (const by of [30, 74, 118]) { P.rect(0, by, 124, 4, CONC[2]); P.rect(0, by, 124, 1, CONC[4]); P.rect(0, by + 4, 124, 1, CLAD[0]); }
      // flats: windows with blinds, AC units dripping
      const winCols = ['#ff7ab8', '#ffd890', '#7ae8ff', '#ffd890', '#ff9a5a', '#ffd890'];
      let wi = 0;
      for (const fy of [38, 82]) {
        for (const [wx, ww] of [[10, 22], [42, 30], [84, 22]]) {
          P.rect(wx, fy, ww, 28, METAL[1]); P.rect(wx + 1, fy + 1, ww - 2, 26, METAL[3]);
          P.rect(wx + 2, fy + 2, ww - 4, 24, GLASS[1]);
          P.rect(wx + 2, fy + 2, ww - 4, 8, GLASS[2]);
          const blinds = LB.hash(wx, fy, 1) > 0.4;
          if (blinds) for (let y = fy + 2; y < fy + 2 + 10 + (wx % 3) * 4; y += 2) P.rect(wx + 2, y, ww - 4, 1, '#8a8c98');
          for (let k = 0; k < ww - 4; k += 7) P.line(wx + 2 + k, fy + 25, wx + 2 + k + 6, fy + 19, GLASS[3]);
          P.rect(wx + Math.floor(ww / 2), fy + 2, 1, 24, METAL[2]);
          meta.panes.push({ x: wx + 2, y: fy + 2, w: ww - 4, h: 24, mull: [wx + Math.floor(ww / 2)], mullR: [], lit: LB.hash(wx, fy, 3) > 0.25 ? 1 : 0, warm: winCols[wi++ % winCols.length], blinds, seed: wx + fy });
          P.rect(wx - 1, fy + 28, ww + 2, 2, CONC[3]);
          // AC unit under some windows, with a drip stain
          if (LB.hash(wx, fy, 2) > 0.35) {
            const ax = wx + ww - 14;
            P.rect(ax, fy + 31, 13, 9, '#c4c6cc'); P.rect(ax, fy + 31, 13, 1, '#e8eaee'); P.rect(ax + 12, fy + 31, 1, 9, '#8a8c96');
            for (let k = 0; k < 4; k++) P.rect(ax + 2, fy + 33 + k * 2, 6, 1, '#6a6c78');
            P.disc(ax + 10, fy + 35, 2, '#6a6c78');
            P.rect(ax + 6, fy + 40, 1, 7, CLAD[1]); P.rect(ax + 6, fy + 47, 1, 3, CLAD[1]);
          }
        }
      }
      // fire escape down the right
      for (const fy of [70, 114]) {
        P.rect(80, fy, 40, 4, METAL[2]); for (let x = 80; x < 120; x += 2) P.px(x, fy + 1, METAL[0]);
        P.rect(80, fy, 40, 1, METAL[4]);
        P.rect(80, fy - 8, 40, 1, METAL[3]); for (let x = 80; x <= 120; x += 8) P.rect(x, fy - 8, 1, 8, METAL[3]);
      }
      for (let k = 0; k < 18; k++) P.px(108 + Math.round(k * 0.6), 74 + k * 2.2, METAL[3]);
      P.line(108, 74, 118, 113, METAL[2]); P.line(111, 74, 121, 113, METAL[2]);
      for (let k = 0; k < 7; k++) { const t = k / 7; P.line(108 + t * 10, 74 + t * 39, 111 + t * 10, 74 + t * 39, METAL[3]); }
      // the sign band: a dark board for the neon
      P.rect(16, 122, 66, 22, '#1a1a26'); P.rect(16, 122, 66, 1, '#4a4a5c'); P.rect(16, 143, 66, 1, '#0a0a12');
      let gx = 22;
      for (const ch of 'RAMEN') {
        const g = GLYPH[ch];
        for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') { P.px(gx + c * 2, 126 + r * 2, '#5a3a4a'); meta.neon.push([gx + c * 2, 126 + r * 2, '#ff5aa8']); meta.neon.push([gx + c * 2 + 1, 126 + r * 2, '#ff5aa8']); meta.neon.push([gx + c * 2, 127 + r * 2, '#ff5aa8']); }
        gx += 12;
      }
      // the blade sign on the left with three glyphs
      P.rect(0, 40, 12, 72, '#121a24'); P.rect(0, 40, 12, 1, '#3a4a5c'); P.rect(11, 40, 1, 72, '#0a0e14');
      P.rect(12, 50, 3, 2, METAL[2]); P.rect(12, 100, 3, 2, METAL[2]);
      KANJI.forEach((g, n) => { for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (g[r][c] === '1') { const x = 2 + c, y = 46 + n * 22 + r * 2; P.px(x, y, '#2a5a64'); meta.neon.push([x, y, '#5af0ff']); meta.neon.push([x, y + 1, '#5af0ff']); } });
      // cables sagging across
      for (const [y0, sag] of [[118, 9], [120, 14]]) for (let x = 0; x < 124; x++) { const t = x / 123; P.px(x, Math.round(y0 + sag * 4 * t * (1 - t)), '#14141c'); }
      // the shop: a shutter half up over the lit counter, a glass door with a noren
      P.rect(6, 150, 70, 2, CONC[3]);
      P.rect(8, 152, 66, 40, '#20202c');
      for (let y = 152; y < 168; y++) P.rect(8, y, 66, 1, (y - 152) % 3 === 0 ? METAL[3] : (y - 152) % 3 === 1 ? METAL[2] : METAL[1]);
      P.rect(8, 168, 66, 2, METAL[0]); P.rect(38, 168, 6, 1, METAL[4]);
      P.rect(10, 170, 62, 21, '#3a2e30');
      meta.screens.push({ x: 10, y: 170, w: 62, h: 21, kind: 'counter' });
      for (const bx of [16, 30, 44, 58]) { P.ellipse(bx, 184, 4, 2, '#e8e0d0'); P.rect(bx - 4, 184, 9, 1, '#a8a098'); }
      P.rect(10, 186, 62, 5, '#5a4038'); P.rect(10, 186, 62, 1, '#8a6a5a');
      P.rect(6, 191, 70, 9, CLAD[1]); P.rect(6, 191, 70, 1, CLAD[3]);
      P.rect(80, 158, 22, 42, METAL[1]); P.rect(82, 160, 18, 40, GLASS[1]); P.rect(82, 160, 18, 12, GLASS[2]);
      P.line(84, 196, 98, 166, GLASS[3]);
      meta.panes.push({ x: 82, y: 160, w: 18, h: 40, mull: [], mullR: [], lit: 1, warm: '#ffcf8a', seed: 4 });
      for (let x = 80; x < 102; x++) { const strip = Math.floor((x - 80) / 5); P.rect(x, 158, 1, (x - 80) % 5 === 4 ? 4 : 12, '#20305a'); if (strip === 2 && x > 90 && x < 93) P.rect(x, 162, 1, 5, '#e8e4dc'); }
      // posters and a vending machine
      for (const [px, py, pw, ph, c] of [[104, 150, 9, 12, '#e8c84a'], [113, 152, 8, 10, '#e05a6a'], [105, 162, 7, 8, '#5ac0e0']]) { P.rect(px, py, pw, ph, c); P.rect(px, py, pw, 1, LB.shade(c, 0.4)); P.rect(px + 1, py + 3, pw - 3, 1, LB.shade(c, -0.6)); P.px(px + pw - 1, py + ph - 1, CLAD[2]); }
      P.rect(104, 166, 18, 34, '#c8302c'); P.rect(104, 166, 18, 1, '#f06a5a'); P.rect(121, 166, 1, 34, '#80201c');
      P.rect(106, 169, 14, 16, '#1a2232');
      meta.screens.push({ x: 106, y: 169, w: 14, h: 16, kind: 'vending' });
      P.rect(108, 189, 10, 3, '#1a1a22'); P.rect(106, 194, 14, 1, '#80201c');
      // graffiti
      for (const [x, y] of [[20, 196], [21, 195], [22, 196], [23, 197], [24, 195], [26, 196], [27, 195], [28, 197]]) P.px(x, y, '#5ae0b0');
      // ---- the roof seen from above: parapet, tar and gravel, an AC unit, a water tank, an aerial
      fillFn(P, 2, 2, 120, 26, (i, j, x, y) => (LB.hash(x, y, 5) > 0.9 ? '#4a4a58' : LB.hash(x >> 1, y >> 1, 6) > 0.8 ? '#2e2e3a' : '#363644'));
      P.rect(0, 0, 124, 2, CONC[3]); P.rect(0, 28, 124, 2, CONC[4]); P.rect(0, 0, 2, 30, CONC[3]); P.rect(122, 0, 2, 30, CONC[1]);
      P.rect(10, 6, 22, 16, '#b8bac4'); P.rect(10, 6, 22, 1, '#e0e2e8'); P.rect(31, 6, 1, 16, '#7a7c88');
      P.disc(21, 14, 5, '#5a5c68'); P.disc(21, 14, 4, '#3a3c48'); P.line(18, 11, 24, 17, '#8a8c98'); P.line(18, 17, 24, 11, '#8a8c98');
      P.disc(94, 14, 10, '#6a4a34'); P.disc(94, 14, 9, '#8a6444'); for (let k = -8; k <= 8; k += 3) P.rect(94 + k, 6, 1, 16, '#6a4a34');
      P.disc(94, 14, 3, '#5a3a24'); P.rect(84, 14, 2, 1, '#3a3a44');
      P.rect(62, 4, 1, 22, METAL[3]); P.line(56, 8, 68, 8, METAL[3]); P.line(58, 12, 66, 12, METAL[3]);
      if (snow) {
        fillFn(P, 2, 2, 120, 26, (i, j, x, y) => (LB.fbm(x * 0.12, y * 0.2, 9, 2) > 0.36 ? snowAt(x, y, true, 81) : null));
        snowCap(P, 10, 31, 7, 82); snowCap(P, 0, 123, 1, 83);
        for (const by of [30, 74, 118]) snowCap(P, 0, 123, by + 1, by);
        snowCap(P, 80, 120, 70, 84); snowCap(P, 80, 120, 114, 85); snowCap(P, 104, 121, 167, 86);
      }
    });
  }

  // ---------- street layout ----------
  const SPOTS = [
    { make: treehouse, x: 64 },
    { make: bakery, x: 192 },
    { make: inn, x: 337 },
    { make: chalet, x: 504 },
    { make: shop, x: 642 },
  ];
  // the border between two worlds' ground is a patchy band, not a line: one material breaks up into the other
  const zoneAt = (x, y) => {
    for (let i = 0; i < ZB.length; i++) {
      const v = (x - ZB[i]) / 9 + (LB.fbm(x * 0.13, y * 0.13, 7 + i, 2) - 0.5) * 2.6;
      if (v < 0) return i;
    }
    return 4;
  };

  // ---------- the ground: one street across five worlds ----------
  function groundTex(season, wet) {
    return LB.memo('bld-ground:' + season + ':' + wet, () => {
      const cv = LB.canvas(W, H), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const id = ctx.createImageData(W, H), d = id.data;
      const winter = season === 'winter';
      const grassBase = { spring: '#76ae4e', summer: '#5c9a44', autumn: '#8e9a48', winter: '#5c9a44' }[season];
      const G = R5(grassBase).map(LB.rgb), M = R5(season === 'autumn' ? '#6a7a3a' : '#4c7a3e').map(LB.rgb);
      const SN = SNOW.map(LB.rgb), DIRT = R5('#a8845a').map(LB.rgb), COB = R5('#7e808c').map(LB.rgb), COBW = R5('#8a7c6c').map(LB.rgb);
      const FLAG = R5('#8e968a').map(LB.rgb), ASP = R5('#454756').map(LB.rgb), SW = R5('#94969f', { spread: 0.7 }).map(LB.rgb), PAVE = R5('#7c8686').map(LB.rgb);
      const dark = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
      const wk = wet ? 0.82 : 1;
      const snowy = (x, y, seed) => {
        const n = LB.fbm(x * 0.04, y * 0.09, seed, 3);
        if (LB.hash(x, y, seed) > 0.994) return SN[4];
        return n > 0.64 ? SN[4] : n > 0.38 ? SN[3] : mid(SN[3], SN[2], 0.6);
      };
      const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const Gl = mid(G[2], G[3], 0.4), Gd = mid(G[2], G[1], 0.35), Ml = mid(M[2], M[3], 0.4), Md = mid(M[2], M[1], 0.35);
      const grass = (x, y) => { const n = LB.fbm(x * 0.03, y * 0.05, 2, 3); return n > 0.6 ? Gl : n < 0.36 ? Gd : G[2]; };
      const moss = (x, y) => { const n = LB.fbm(x * 0.04, y * 0.06, 6, 3); return n > 0.6 ? Ml : n < 0.36 ? Md : M[2]; };
      // cobbles: rows of rounded setts with dark joints
      const cobble = (x, y) => {
        const row = Math.floor((y - KERB) / 6), r = (y - KERB) % 6;
        const off = (row % 2) * 4, ti = Math.floor((x + off) / 8), c = (x + off) % 8;
        const h = LB.hash(ti, row, 17), base = h < 0.3 ? COBW : COB;
        if (r === 5 || c === 7) return winter && LB.hash(x, y, 2) > 0.3 ? SN[2] : dark(COB[0], 0.8);
        if ((r === 0 || r === 4) && (c === 0 || c === 6)) return dark(COB[0], 0.9);
        let k = h > 0.8 ? 3 : 2;
        if (r === 0 || c === 0) k = Math.min(4, k + 1);
        if (r === 4 || c === 6) k = 1;
        if (wet && r === 1 && c === 1) return [230, 236, 246];
        return base[k];
      };
      // big flags of stone for the Lumar pavement
      const flags = (x, y) => {
        const row = Math.floor((y - BASE) / 8), off = (row % 2) * 9;
        const c = (x + off) % 18, r = (y - BASE) % 8, ti = Math.floor((x + off) / 18);
        if (c === 17 || r === 7) return PAVE[0];
        const h = LB.hash(ti, row, 5);
        if (r === 0 || c === 0) return PAVE[3];
        return PAVE[h < 0.3 ? 1 : 2];
      };
      // Sylvara: worn flagstones in moss
      const voro = (x, y, cell, seed) => {
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        let b1 = 1e9, b2 = 1e9, id1 = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const cx = (gx + i) * cell + LB.hash(gx + i, gy + j, seed) * cell, cy = (gy + j) * cell + LB.hash(gx + i, gy + j, seed + 1) * cell;
          const dd = Math.hypot(x - cx, (y - cy) * 1.2);
          if (dd < b1) { b2 = b1; b1 = dd; id1 = (gx + i) * 131 + (gy + j); } else if (dd < b2) b2 = dd;
        }
        return [b1, b2, id1];
      };
      const flagMoss = (x, y) => {
        const [b1, b2, id1] = voro(x, y, 13, 23);
        if (b2 - b1 < 2.2) return winter ? SN[2] : M[1];
        const h = LB.hash(id1, 1, 3);
        let k = h < 0.3 ? 1 : 2;
        if (b2 - b1 < 3.4) k = 1;
        if (b1 < 2.5 && h > 0.4) k = 3;
        if (winter && b2 - b1 > 4 && LB.fbm(x * 0.1, y * 0.1, 3, 2) > 0.5) return SN[3];
        return FLAG[k];
      };
      // a dirt lane with two wheel ruts
      const lane = (x, y) => {
        const n = LB.fbm(x * 0.04, y * 0.07, 12, 3);
        const rut = Math.abs(y - 240 - Math.sin(x * 0.04) * 1.5) < 2.2 || Math.abs(y - 257 - Math.sin(x * 0.04 + 1) * 1.5) < 2.2;
        const rutEdge = Math.abs(y - 237.5 - Math.sin(x * 0.04) * 1.5) < 0.8 || Math.abs(y - 254.5 - Math.sin(x * 0.04 + 1) * 1.5) < 0.8;
        if (winter) { if (rut) return LB.fbm(x * 0.15, y * 0.3, 4, 2) > 0.55 ? DIRT[1] : SN[1]; return snowy(x, y, 31); }
        if (rut) return LB.hash(x >> 1, y, 3) > 0.85 ? DIRT[2] : DIRT[1];
        if (rutEdge) return DIRT[3];
        const g = LB.hash(x >> 1, y >> 1, 9);
        if (g > 0.93) return DIRT[3];
        if (g < 0.05) return DIRT[1];
        return n > 0.62 ? mid(DIRT[2], DIRT[3], 0.4) : DIRT[2];
      };
      const asphalt = (x, y) => {
        if (y < KERB + 3) return y === KERB ? SW[4] : y === KERB + 1 ? SW[3] : SW[1];
        const n = LB.fbm(x * 0.05, y * 0.09, 13, 2);
        if (y >= 248 && y < 250 && (x % 22) < 12) return [220, 214, 170];
        if (winter && (y < KERB + 7 || LB.fbm(x * 0.07, y * 0.15, 8, 3) > 0.62)) return SN[2];
        if (LB.hash(x >> 1, y >> 1, 4) > 0.95) return ASP[3];
        return n > 0.62 ? mid(ASP[2], ASP[3], 0.4) : n < 0.36 ? mid(ASP[2], ASP[1], 0.5) : ASP[2];
      };
      const sidewalk = (x, y) => {
        const c = (x - 3) % 20, r = (y - BASE) % 16;
        if (c === 19 || r === 15) return SW[1];
        if (winter && LB.fbm(x * 0.08, y * 0.2, 5, 3) > 0.45) return SN[3];
        return LB.hash(Math.floor((x - 3) / 20), Math.floor((y - BASE) / 16), 3) > 0.7 ? SW[3] : SW[2];
      };
      const snowRoad = (x, y) => {
        const track = Math.abs(y - 242 - Math.sin(x * 0.05) * 2) < 2 || Math.abs(y - 250 - Math.sin(x * 0.05) * 2) < 2;
        if (track) return SN[1];
        return snowy(x, y, 41);
      };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const z = zoneAt(x, y);
        let c;
        if (y < BASE) {
          c = z === 0 ? (winter ? snowy(x, y, 1) : moss(x, y)) : z === 1 || z === 2 ? (winter ? snowy(x, y, 2) : grass(x, y)) : z === 3 ? snowy(x, y, 3) : SW[1];
        } else if (y < KERB + (z === 1 ? Math.round(2 * Math.sin(x * 0.2)) : 0)) {
          c = z === 0 ? (winter ? snowy(x, y, 1) : moss(x, y)) : z === 1 ? (winter ? snowy(x, y, 2) : grass(x, y)) : z === 2 ? flags(x, y) : z === 3 ? snowy(x, y, 3) : sidewalk(x, y);
        } else {
          c = z === 0 ? flagMoss(x, y) : z === 1 ? lane(x, y) : z === 2 ? cobble(x, y) : z === 3 ? snowRoad(x, y) : asphalt(x, y);
        }
        if (wet) c = dark(c, wk);
        const i = (y * W + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      ctx.putImageData(id, 0, 0);
      // kerb faces between pavement and street for Lumar
      for (let x = ZB[1] + 4; x < ZB[2] - 2; x++) { P.px(x, KERB - 1, LB.hex(PAVE[3])); P.px(x, KERB, LB.hex(PAVE[0])); }
      // marks scattered by rule: tufts at the edges of grass and moss, pebbles on the lane, leaves in autumn
      const r = LB.rng(5);
      const Gh = G.map(LB.hex), Mh = M.map(LB.hex);
      const tuft = (x, y, R) => { P.px(x - 2, y - 1, R[3]); P.px(x - 1, y - 2, R[4]); P.px(x, y - 1, R[3]); P.px(x + 1, y - 3, R[4]); P.px(x + 2, y - 1, R[3]); P.rect(x - 1, y, 3, 1, R[1]); };
      if (!winter) {
        for (let i = 0; i < 520; i++) {
          const x = r.int(2, W - 3), y = r.int(4, KERB + 4), z = zoneAt(x, y);
          if (z > 1 && !(z === 2 && y < BASE)) continue;
          if (y >= KERB - 2 && r() < 0.4) continue;
          const nearEdge = y > KERB - 6 || y < 12;
          if (!nearEdge && r() < 0.55) continue;
          tuft(x, y, z === 0 ? Mh : Gh);
        }
        // flowers in the Verdance verge
        const fl = FLOWERS[season] || FLOWERS.summer;
        for (let i = 0; i < 60; i++) {
          const x = r.int(ZB[0] + 6, ZB[1] - 6), y = r.int(BASE + 2, KERB - 2);
          const c = fl[r.int(0, fl.length - 1)];
          P.px(x, y, c); P.px(x, y + 1, Gh[1]); if (r() < 0.4) { P.px(x + 1, y, c); }
        }
        // ferns in the Sylvara moss
        for (let i = 0; i < 14; i++) {
          const x = r.int(4, ZB[0] - 8), y = r.int(BASE + 3, KERB - 1);
          for (let k = -3; k <= 3; k++) { P.line(x, y, x + k * 2, y - 3 - (3 - Math.abs(k)), k < 0 ? Mh[3] : Mh[2]); }
          P.px(x, y - 6, Mh[4]);
        }
        // pebbles on the lane
        for (let i = 0; i < 70; i++) {
          const x = r.int(ZB[0] + 4, ZB[1] - 4), y = r.int(KERB + 2, H - 2);
          P.px(x, y, LB.hex(DIRT[4])); P.px(x + 1, y, LB.hex(DIRT[1]));
        }
        if (season === 'autumn') {
          const lv = ['#d8782a', '#c4452e', '#e8b440', '#a85a2a'];
          for (let i = 0; i < 260; i++) {
            const x = r.int(0, ZB[2] + 10), y = r.int(BASE - 8, H - 1);
            const c = lv[r.int(0, 3)];
            P.px(x, y, c); if (r() < 0.5) P.px(x + 1, y, LB.shade(c, -0.4));
          }
        }
      } else {
        // footprints through the snow
        for (let x = 6; x < ZB[2]; x += 9) { const y = 246 + Math.round(Math.sin(x * 0.07) * 3) + ((x / 9) % 2 ? 3 : 0); P.rect(x, y, 2, 3, SNOW[1]); P.px(x, y, SNOW[0]); }
      }
      // footprints on Hoarfell's road always
      for (let x = ZB[2] + 6; x < ZB[3]; x += 9) { const y = 258 + ((x / 9) % 2 ? 3 : 0); P.rect(x, y, 2, 3, SNOW[1]); P.px(x, y, SNOW[0]); }
      // Arcadia: a manhole and a drain grate
      P.ellipse(668, 252, 8, 4, '#2a2c36'); P.ellipse(668, 252, 7, 3, '#4a4c58'); for (let k = -5; k <= 5; k += 2) P.rect(668 + k, 250, 1, 5, '#2a2c36');
      P.rect(600, KERB + 3, 12, 3, '#1a1a22'); for (let k = 0; k < 12; k += 2) P.px(600 + k, KERB + 4, '#5a5c68');
      return cv;
    });
  }

  // street furniture standing on the pavement (cast shadows too)
  function streetLamp(season) { // a Lumar iron lantern post
    return LB.sprite('bld-lamp:' + season, 14, 64, (P) => {
      P.rect(6, 12, 3, 50, IRON[1]); P.rect(6, 12, 1, 50, IRON[3]);
      P.rect(4, 58, 7, 6, IRON[1]); P.rect(4, 58, 7, 1, IRON[3]);
      P.rect(2, 0, 11, 3, IRON[2]); P.rect(3, 3, 9, 9, IRON[0]); P.rect(4, 4, 7, 7, '#c09a5a'); P.rect(4, 4, 2, 7, '#d8b878');
      P.rect(5, 12, 5, 1, IRON[2]);
      if (season === 'winter') { P.rect(2, -1 + 1, 11, 1, SNOW[4]); }
    }, { outline: 'sel' });
  }
  function snowman() {
    return LB.sprite('bld-snowman', 20, 34, (P) => {
      P.disc(10, 25, 8, SNOW[3]); P.disc(9, 23, 6, SNOW[4]); P.disc(10, 13, 6, SNOW[3]); P.disc(9, 11, 4, SNOW[4]);
      P.rect(6, 1, 9, 6, '#2a2a34'); P.rect(4, 6, 13, 2, '#2a2a34'); P.rect(6, 5, 9, 1, '#c0392f');
      P.px(8, 11, '#1a1a22'); P.px(12, 11, '#1a1a22'); P.rect(10, 13, 3, 1, '#e8862a');
      P.rect(4, 17, 13, 2, '#c0392f'); P.rect(13, 19, 2, 5, '#c0392f');
      P.line(2, 14, -0 + 0, 10, '#5a3a22');
    }, { outline: 'sel' });
  }
  function bench() {
    return LB.sprite('bld-bench', 26, 16, (P) => {
      P.rect(1, 2, 24, 3, WOOD[2]); P.rect(1, 2, 24, 1, WOOD[4]);
      P.rect(1, 7, 24, 3, WOOD[2]); P.rect(1, 7, 24, 1, WOOD[3]); P.rect(1, 10, 24, 1, WOOD[0]);
      P.rect(3, 10, 2, 6, IRON[1]); P.rect(21, 10, 2, 6, IRON[1]); P.rect(3, 4, 2, 4, IRON[1]); P.rect(21, 4, 2, 4, IRON[1]);
    }, { outline: 'sel' });
  }
  function streetLight() { // Arcadia: a tall curved street light
    return LB.sprite('bld-streetlight', 22, 92, (P) => {
      P.rect(4, 10, 3, 80, METAL[1]); P.rect(4, 10, 1, 80, METAL[3]);
      P.rect(2, 86, 7, 6, METAL[1]);
      P.rect(4, 6, 14, 3, METAL[2]); P.rect(4, 6, 14, 1, METAL[4]);
      P.rect(12, 9, 8, 2, '#d8f4ff');
    }, { outline: 'sel' });
  }
  // a snowy pine for the hill behind the chalet: tiers fringed with drooping needles, snow along each tier's top
  function pine(seed, size) {
    return LB.sprite('bld-pine:' + seed + ':' + size, 36, 60, (P) => {
      const N = R5('#2e5a4c'), r = LB.rng(seed);
      P.rect(16, 46, 4, 13, BARK[1]); P.rect(16, 46, 1, 13, BARK[3]);
      const tiers = 5;
      for (let t = 0; t < tiers; t++) {
        const top = 4 + t * 9 * size, bot = top + 14 * size, half = (5 + t * 3.2) * size;
        for (let y = Math.floor(top); y < bot; y++) {
          const f = (y - top) / (bot - top), hw = Math.round(half * f + 1);
          for (let x = 18 - hw; x <= 18 + hw; x++) {
            const edge = Math.abs(x - 18) / Math.max(1, hw);
            if (edge > 0.85 && LB.hash(x, y, seed) > 0.6) continue;
            const lit = x < 18 ? (edge > 0.4 ? 3 : 2) : edge > 0.5 ? 1 : 2;
            P.px(x, y, f > 0.82 ? N[Math.max(0, lit - 1)] : N[lit]);
          }
        }
        // snow along the tier's upper slope, heavier on the lit side
        for (let x = 18 - half * 0.9; x <= 18 + half * 0.6; x++) {
          const yy = Math.round(top + (bot - top) * (Math.abs(x - 18) / half) * 0.8 + 1);
          P.px(x, yy, x < 18 ? SNOW[4] : SNOW[2]); if (x < 18 && r() < 0.6) P.px(x, yy + 1, SNOW[3]);
        }
      }
      P.rect(17, 2, 2, 3, SNOW[4]);
    }, { outline: 'sel' });
  }
  const PINES = [[436, 74, 1, 1], [452, 58, 2, 0.85], [566, 70, 3, 1], [585, 0, 4, 0], [421, 60, 5, 0.8], [556, 50, 6, 0.8]];
  const PROPS = (season) => {
    const list = [
      { spr: streetLamp(season), x: 264, y: 222, light: { dx: 0, dy: -60, c: '#ffc868' } },
      { spr: bench(), x: 234, y: 221 },
      { spr: streetLight(), x: 590, y: 225, light: { dx: 6, dy: -84, c: '#bfeaff' } },
      { spr: snowman(), x: 446, y: 222 },
    ];
    return list;
  };

  // ---------- the scene ----------
  let puddleA = null, puddleW = null, puddlePtsA = null, puddlePtsW = null;
  let refl = null, reflKey = '';
  const emi = { cv: null, refl: null };
  const smokeList = [];
  function placed(season) {
    return SPOTS.map((s) => { const b = s.make(season); return { b, x: s.x, ox: s.x - Math.floor(b.w / 2), oy: BASE - b.g }; });
  }

  LB.add({
    id: 'buildings', order: 80, section: 'building',
    name: 'Buildings with character', world: 'Every world',
    blurb: 'One street, five worlds: an elven tree-house, a thatched bakery, a timber-framed inn, a log chalet and a noodle shop. Each one has a shape you could pick out from its shadow, materials you can count, and the small things people leave by a door.',
    see: [
      'Roofs built from rows of slates, straw and snow, each row catching the light and shading the one below',
      'Deep eaves and an overhanging upper floor that throw shade on the walls',
      'Glass that reflects the sky by day and glows at night, with lamps that pool light on the street',
      'The seasons on every building: blossom and window boxes, red ivy, snow on roofs and sills, icicles',
      'Chimney smoke, a swinging inn sign, neon that flickers and shows in the puddle',
    ],
    build: 'Each building here is drawn in code from a small kit of parts (roof, wall, window, door, trim) with a snowy and a night version, so a whole street can share them and still look different. In the game we would do the same for houses and shops and keep the 3D renders for the ground and the light. The kit is the main job; each world\'s buildings then go quickly.',
    now: 'brambleford.png',
    w: W, h: H,
    clouds: { alpha: 0.16, speed: 4 },
    init() {
      // puddles: Arcadia's are always there; the rest appear in rain and spring
      const mk = (list) => {
        const cv = LB.canvas(W, H), P = LB.paint(LB.ctx2d(cv));
        for (const [x, y, rx, ry, s] of list) P.blob(x, y, rx, '#fff', s, 0.25, ry / rx);
        return cv;
      };
      puddleA = mk([[622, 244, 22, 6, 3], [688, 262, 14, 4, 4], [652, 236, 9, 3, 5]]);
      puddleW = mk([[300, 246, 14, 4, 6], [372, 258, 11, 3, 7], [210, 248, 12, 3, 8], [176, 262, 8, 2, 9], [60, 244, 9, 3, 10]]);
      puddlePtsA = LB.maskPoints(puddleA, 30, 3);
      puddlePtsW = LB.maskPoints(puddleW, 40, 4);
      emi.cv = LB.canvas(W, H);
      emi.refl = LB.canvas(W, H);
    },
    ground(ctx, S) { ctx.drawImage(groundTex(S.season, S.wet ? 1 : 0), 0, 0); },
    shadows(sh, S) {
      for (const [x, y, sd, sz] of PINES) if (sz) sh.cast(pine(sd, sz), x, y, null, null, { k: 0.4 });
      for (const p of placed(S.season)) sh.cast(p.b.cv, p.x, BASE, p.x - p.ox, p.b.g, { k: 0.26 });
      for (const pr of PROPS(S.season)) { if (pr.spr === snowman() && S.season !== 'winter') continue; sh.cast(pr.spr, pr.x, pr.y, null, null, { k: 0.5 }); }
    },
    water(ctx, S, P) {
      const masks = [[puddleA, puddlePtsA]];
      if (S.wet || S.season === 'spring') masks.push([puddleW, puddlePtsW]);
      for (const [mask, pts] of masks) {
        const tmp = LB.memo('bld-pud-' + (mask === puddleA ? 'a' : 'w'), () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
        tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
        const g = tc.createLinearGradient(0, 228, 0, 270);
        g.addColorStop(0, LB.mix(S.L.skyHor, '#20283a', 0.35)); g.addColorStop(1, LB.mix(S.L.skyTop, '#1a2030', 0.45));
        tc.fillStyle = g; tc.fillRect(0, 0, W, H);
        tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0);
        ctx.drawImage(tmp, 0, 0);
        if (refl) LB.ripple(ctx, refl, mask, S, { amp: 0.8, freq: 0.9, speed: 2, alpha: 0.7, y0: 226, y1: 270 });
        LB.glints(ctx, pts, S, { rate: 1.1 });
        if (S.weather === 'rain') LB.rings(ctx, pts.slice(0, 14), S, { period: 1.2, r: 4, alpha: 0.6 });
      }
      // the wet lip of each puddle
      ctx.save(); ctx.globalAlpha = 0.5;
      const lip = LB.memo('bld-pudlip', () => {
        const cv = LB.canvas(W, H), c = LB.ctx2d(cv);
        for (const m of [puddleA, puddleW]) { c.drawImage(m, 0, -1); }
        c.globalCompositeOperation = 'destination-out'; c.drawImage(puddleA, 0, 0); c.drawImage(puddleW, 0, 0);
        c.globalCompositeOperation = 'source-in'; c.fillStyle = '#e8eef8'; c.fillRect(0, 0, W, H);
        return cv;
      });
      if (S.wet || S.season === 'spring') ctx.drawImage(lip, 0, 0);
      ctx.restore();
    },
    objects(ctx, S) {
      // back to front: the pines on the slope behind, the buildings, then the street furniture on the pavement
      for (const [x, y, sd, sz] of PINES) if (sz) LB.blit(ctx, pine(sd, sz), x, y);
      for (const p of placed(S.season)) ctx.drawImage(p.b.cv, p.ox, p.oy);
      for (const pr of PROPS(S.season)) {
        if (pr.spr === snowman() && S.season !== 'winter') continue;
        LB.blit(ctx, pr.spr, pr.x, pr.y);
      }
      const k = S.season;
      if (reflKey !== k + Math.round(S.time * 4)) { reflKey = k + Math.round(S.time * 4); refl = LB.mirror(ctx.canvas, BASE, 0, W); }
    },
    live(ctx, S, P) {
      const pl = placed(S.season);
      // chimney smoke: soft puffs rising and leaning with the wind
      for (const p of pl) for (const s of p.b.meta.smoke) {
        const sx = p.ox + s.x, sy = p.oy + s.y;
        for (let i = 0; i < 7; i++) {
          const ph = (S.t * 0.22 + i / 7 + (sx % 7) * 0.05) % 1;
          const x = sx + ph * 20 + Math.sin(S.t * 0.8 + i * 1.7) * 2 * ph, y = sy - 2 - ph * 46;
          const rr = 1.5 + ph * 5;
          ctx.save(); ctx.globalAlpha = (1 - ph) * (S.wet ? 0.35 : 0.55);
          P.disc(x, y, rr, ph < 0.3 ? '#e8e6ea' : '#d0d0d8');
          P.disc(x - rr * 0.4, y - rr * 0.3, rr * 0.55, '#f6f6f8');
          ctx.restore();
        }
      }
      // the inn sign swinging on its bracket
      const inn = pl[2], sg = inn.b.meta.sign;
      const ax = inn.ox + sg.x, ay = inn.oy + sg.y;
      P.rect(ax, ay, 20, 2, IRON[1]); P.rect(ax, ay, 20, 1, IRON[3]);
      P.line(ax + 1, ay + 2, ax + 8, ay + 8, IRON[1]); P.px(ax + 9, ay + 8, IRON[1]); P.px(ax + 9, ay + 7, IRON[1]);
      const sw = Math.round(Math.sin(S.t * 1.4) * 1.6);
      const bx = ax + 3 + sw, by = ay + 7;
      P.line(ax + 5, ay + 2, bx + 2, by, IRON[2]); P.line(ax + 17, ay + 2, bx + 14, by, IRON[2]);
      P.rect(bx - 1, by - 1, 19, 17, '#2a1a10');
      P.rect(bx, by, 17, 15, OAK[2]); P.rect(bx, by, 17, 1, OAK[3]); P.rect(bx, by + 14, 17, 1, OAK[0]);
      P.rect(bx + 5, by + 5, 7, 7, '#e0a838'); P.rect(bx + 5, by + 5, 2, 7, '#f4cc60'); P.rect(bx + 12, by + 7, 2, 3, '#e0a838');
      P.rect(bx + 4, by + 3, 9, 3, '#f8f2e4'); P.px(bx + 12, by + 3, '#d8d0c0');
      // steam from Arcadia's manhole
      for (let i = 0; i < 6; i++) {
        const ph = (S.t * 0.35 + i / 6) % 1, x = 668 + Math.sin(S.t + i) * 3 + ph * 6, y = 250 - ph * 34;
        ctx.save(); ctx.globalAlpha = (1 - ph) * 0.4; P.disc(x, y, 2 + ph * 6, '#dfe4ee'); ctx.restore();
      }
      // people on the street: two walking, one by the tree-house door
      if (LB.person) {
        const span = W + 80;
        const x1 = ((S.t * 16) % span) - 40, x2 = span - ((S.t * 12 + 300) % span) - 40;
        LB.person(ctx, 64, 218, 'elf', { dir: 'down', t: S.t, seed: 2 });
        LB.person(ctx, Math.round(x2), 262, S.season === 'winter' ? 'mountaineer' : 'merchant', { dir: 'left', walk: true, t: S.t, seed: 4 });
        LB.person(ctx, Math.round(x1), 248, 'pilot', { dir: 'right', walk: true, t: S.t, seed: 1 });
      }
      // falling leaves in autumn, fireflies on summer nights round the tree, blossom drifting in spring
      if (S.season === 'autumn') LB.motes(ctx, S, { n: 14, fall: 10, colors: ['#e08a2a', '#c4452e', '#f0c040'], seed: 3, x: 0, w: 140, h: 220 });
      if (S.season === 'spring') LB.motes(ctx, S, { n: 10, fall: 7, colors: ['#ffffff', '#f6c6da'], seed: 4, x: 0, w: 140, h: 210 });
    },
    emissive(ctx, S, P) {
      const pl = placed(S.season);
      const dark = LB.smooth(0.12, 0.6, S.L.night);
      const ec = LB.ctx2d(emi.cv); ec.clearRect(0, 0, W, H);
      const E = LB.paint(ec);
      // lit windows
      if (dark > 0.02) {
        for (const p of pl) for (const pn of p.b.meta.panes) {
          if (!pn.lit || LB.hash(pn.seed, 1, 7) > pn.lit) continue;
          const x = p.ox + pn.x, y = p.oy + pn.y;
          ec.globalAlpha = dark;
          if (pn.round) {
            E.disc(p.ox + pn.cx, p.oy + pn.cy, pn.round, pn.warm); E.disc(p.ox + pn.cx - 1, p.oy + pn.cy - 1, Math.max(1, pn.round - 2), LB.shade(pn.warm, 0.5));
          } else {
            E.rect(x, y, pn.w, pn.h, LB.shade(pn.warm, -0.2));
            E.rect(x + 1, y + 1, pn.w - 2, Math.max(1, pn.h - 3), pn.warm);
            E.rect(x + 2, y + 2, Math.max(1, pn.w - 5), Math.max(1, Math.floor(pn.h / 2) - 2), LB.shade(pn.warm, 0.45));
            if (pn.blinds) for (let yy = y + 1; yy < y + pn.h - 2; yy += 2) E.rect(x, yy, pn.w, 1, LB.shade(pn.warm, -0.45));
          }
          for (const mx of pn.mull) E.rect(p.ox + mx, y, 1, pn.h, '#2a1c16');
          for (const my of pn.mullR) E.rect(x, p.oy + my, pn.w, 1, '#2a1c16');
          if (pn.shop) for (const [sy, n] of [[146, 6], [159, 5]]) for (let i = 0; i < n; i++) { const bx = p.ox + 18 + i * 7 + (sy === 159 ? 3 : 0); E.ellipse(bx + 2, p.oy + sy, 3, 2, '#8a4e22'); E.rect(bx, p.oy + sy - 1, 3, 1, '#c07a3a'); }
          ec.globalAlpha = 1;
        }
        // lantern flames
        for (const p of pl) for (const l of p.b.meta.lamps) {
          ec.globalAlpha = dark; const x = p.ox + l.x, y = p.oy + l.y;
          E.rect(x - 2, y - 2, 5, 6, '#ffc860'); E.rect(x - 1, y - 1, 3, 3, '#fff2c0'); ec.globalAlpha = 1;
        }
        for (const pr of PROPS(S.season)) if (pr.light && pr.spr === streetLamp(S.season)) { ec.globalAlpha = dark; E.rect(pr.x - 3, pr.y - 60, 7, 7, '#ffc860'); E.rect(pr.x - 2, pr.y - 59, 4, 4, '#fff2c0'); ec.globalAlpha = 1; }
        ec.globalAlpha = dark; E.rect(590 + 5, 225 - 92 + 9, 8, 2, '#f0fcff'); ec.globalAlpha = 1;
      }
      // elven orbs glow a little even by day
      const orb = 0.35 + 0.65 * dark;
      for (const p of pl) for (const o of p.b.meta.orbs) {
        const x = p.ox + o.x, y = p.oy + o.y, pulse = 0.85 + 0.15 * Math.sin(S.t * 1.6 + x);
        ec.globalAlpha = orb * pulse;
        if (o.small) { E.px(x, y, '#9ff4ff'); E.px(x - 1, y, '#5ad8f0'); } else { E.disc(x, y, 2, '#b8fff0'); E.px(x - 1, y - 1, '#ffffff'); }
        ec.globalAlpha = 1;
      }
      // neon: on all day, brighter at night, one letter stuttering
      const shopP = pl[4];
      const neonA = 0.7 + 0.3 * dark;
      const stutter = Math.sin(S.t * 13) > 0.3 || Math.sin(S.t * 0.7) < 0.6;
      for (const [x, y, c] of shopP.b.meta.neon) {
        if (c === '#ff5aa8' && x > 60 && x < 74 && !stutter) continue;
        ec.globalAlpha = neonA; E.px(shopP.ox + x, shopP.oy + y, c);
      }
      ec.globalAlpha = 1;
      for (const sc of shopP.b.meta.screens) {
        const x = shopP.ox + sc.x, y = shopP.oy + sc.y;
        if (sc.kind === 'vending') {
          ec.globalAlpha = 0.85 + 0.15 * dark;
          E.rect(x, y, sc.w, sc.h, '#dff4ff');
          for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { E.rect(x + 1 + c * 3, y + 1 + r * 5, 2, 3, ['#e05a5a', '#5aa0e0', '#f0d060', '#60c080'][(r + c) % 4]); }
          ec.globalAlpha = 1;
        } else if (dark > 0.02) {
          ec.globalAlpha = dark;
          E.rect(x, y, sc.w, sc.h, '#ffb070'); E.rect(x, y, sc.w, 6, '#ffd8a0');
          for (const bx of [6, 20, 34, 48]) { E.ellipse(x + bx, y + 14, 4, 2, '#fff4e4'); E.rect(x + bx - 4, y + 14, 9, 1, '#c89070'); }
          E.rect(x, y + 16, sc.w, 5, '#6a3a2a');
          ec.globalAlpha = 1;
        }
      }
      // the open sign on the door
      ec.globalAlpha = 0.6 + 0.4 * dark; E.rect(shopP.ox + 85, shopP.oy + 176, 12, 5, '#ff4a6a'); E.rect(shopP.ox + 86, shopP.oy + 177, 10, 3, '#ffd0d8'); ec.globalAlpha = 1;
      ctx.drawImage(emi.cv, 0, 0);
      // fireflies round the great tree on summer nights
      if (S.season === 'summer' && S.L.night > 0.4) LB.motes(ctx, S, { n: 14, blink: true, colors: ['#f4ffa0', '#d8ff80'], seed: 7, x: 4, y: 110, w: 130, h: 100 });
      // the neon and lit windows, upside down in the puddles
      const rc = LB.ctx2d(emi.refl); rc.setTransform(1, 0, 0, 1, 0, 0); rc.clearRect(0, 0, W, H);
      rc.save(); rc.translate(0, 2 * BASE); rc.scale(1, -1); rc.drawImage(emi.cv, 0, 0); rc.restore();
      LB.ripple(ctx, emi.refl, puddleA, S, { amp: 0.8, freq: 0.9, speed: 2, alpha: 0.55, y0: 226, y1: 270, slot: 'emi' });
      if (S.wet || S.season === 'spring') LB.ripple(ctx, emi.refl, puddleW, S, { amp: 0.8, freq: 0.9, speed: 2, alpha: 0.5, y0: 226, y1: 270, slot: 'emi' });
    },
    lights(S) {
      const pl = placed(S.season), L = [];
      for (const p of pl) for (const l of p.b.meta.lamps) L.push({ x: p.ox + l.x, y: p.oy + l.y + 6, r: 30, c: l.c, flicker: 1 });
      for (const p of pl) for (const o of p.b.meta.orbs) if (!o.small) L.push({ x: p.ox + o.x, y: p.oy + o.y, r: 22, c: '#7ae8d8', i: 0.8 });
      // window light spilling onto the pavement
      for (const p of pl) for (const pn of p.b.meta.panes) {
        if (!pn.lit || pn.round || LB.hash(pn.seed, 1, 7) > pn.lit || p.oy + pn.y + pn.h < BASE - 50) continue;
        L.push({ x: p.ox + pn.x + pn.w / 2, y: BASE + 7, r: Math.max(18, pn.w), c: pn.warm, sq: 0.4, i: 0.8 });
      }
      L.push({ x: 264, y: 166, r: 44, c: '#ffc868', flicker: 1 });
      L.push({ x: 602, y: 214, r: 56, c: '#bfeaff', sq: 0.6 });
      // neon spills pink and cyan on the street day and night (brighter at night)
      L.push({ x: 622, y: 200, r: 60, c: '#ff5aa8', always: true, i: 0.25 + 0.75 * S.L.night, sq: 0.7 });
      L.push({ x: 586, y: 190, r: 40, c: '#5af0ff', always: true, i: 0.2 + 0.6 * S.L.night });
      L.push({ x: 690, y: 196, r: 26, c: '#dff4ff', always: true, i: 0.2 + 0.5 * S.L.night });
      return L;
    },
  });
})();
