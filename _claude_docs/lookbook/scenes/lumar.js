// Lantern Quay — Lumar's harbour: timber-framed houses over a cobbled quay, boats moored in green water, the town
// mirrored and wobbling below, and at night the lanterns and windows streaking long and broken down the water.
(function () {
  'use strict';
  const W = 480, H = 270;
  const BASE = 100;          // the houses' front walls stand on this row
  const COP = 168;           // top of the quay's edge stones
  const WALL = 174;          // the quay wall's face starts
  const YW = 188;            // the waterline
  const WH = YW - COP;       // how tall the quay edge is, top of coping to water
  const WALK = 146;          // the sailor's path along the quay

  // ---------- palette (daylight; the grade makes dusk and night) ----------
  const C = {
    timber: '#5e3d1f',
    stone: '#7f8a86', cob: '#8d8a80', grout: '#403c42',
    coping: '#a3a69c', wallFace: '#5e6866',
    brick: '#9c5b45', iron: '#2f2d36', brass: '#b8913f',
    sea: '#2a7050', seaDeep: '#174636', foam: '#d2eade',
    glass: '#34465c', glow: '#ffe080', glow2: '#ffc458',
    snow: '#f2f6fc', snowShade: '#c6d2e8',
  };
  const HOUSES = [
    { x: -6, w: 66, fh: 58, gfh: 26, roof: 'gable', g: 16, rd: 34, roofC: '#56698c', wall: '#dccaa0', stone: true, jetty: true, shut: '#3e6a5a', chim: [0.72], boxes: true, seed: 11, shopFish: true },
    { x: 74, w: 88, fh: 72, gfh: 28, floors: 2, roof: 'ridge', rd: 28, roofC: '#5a7c4a', wall: '#ebdfc4', stone: true, jetty: true, shut: '#8c3c33', chim: [0.14, 0.86], dormer: true, inn: true, boxes: true, seed: 12 },
    { x: 174, w: 56, fh: 62, gfh: 26, roof: 'gable', g: 14, rd: 30, roofC: '#a9613f', wall: '#c9d4cd', jetty: true, shut: '#4a5c8c', chim: [0.78], ivy: true, seed: 13 },
    { x: 240, w: 90, fh: 54, gfh: 26, roof: 'ridge', rd: 36, roofC: '#405c68', wall: '#e6c9b0', stone: true, jetty: false, shut: '#3e6a5a', chim: [0.24, 0.7], shop: true, boxes: true, seed: 14 },
    { x: 344, w: 62, fh: 60, gfh: 26, roof: 'gable', g: 15, rd: 32, roofC: '#3f6b4b', wall: '#d7dae2', jetty: true, shut: '#c49b3a', chim: [0.25], boxes: true, seed: 15 },
    { x: 418, w: 74, fh: 66, gfh: 30, roof: 'ridge', rd: 34, roofC: '#56698c', wall: '#cdbb98', stone: true, jetty: false, shut: '#5b3b2a', chim: [], warehouse: true, seed: 16 },
  ];
  const POSTS = [{ x: 156 }, { x: 382 }];                 // lamp posts on the quay edge
  const BOLLARDS = [{ x: 44 }, { x: 266 }, { x: 452 }];

  let layouts = null, waterMask = null, wavePts = null, glintPts = null, ringPts = null, floes = null;
  let reflStatic = null, reflKey = '';
  const R = (c, n, o) => LB.ramp(c, n || 5, o);
  const spr = (key, w, h, draw) => LB.memo('spr:' + key, () => {
    const cv = LB.canvas(w, h), ctx = LB.ctx2d(cv);
    draw(LB.paint(ctx), ctx, w, h);
    return selout(cv);
  });

  // ---------- layout (never changes) ----------
  function layoutHouse(s) {
    const L = { s };
    L.gx0 = s.x; L.gx1 = s.x + s.w;
    L.ux0 = s.jetty ? s.x - 2 : s.x; L.ux1 = s.jetty ? s.x + s.w + 2 : s.x + s.w;
    L.ftop = BASE - s.fh;
    L.gTop = BASE - s.gfh;
    L.apex = s.roof === 'gable' ? L.ftop - s.g : L.ftop;
    L.rtop = L.apex - s.rd;
    L.cx = Math.round((L.ux0 + L.ux1) / 2);
    L.ex0 = L.ux0 - 3; L.ex1 = L.ux1 + 3; // eaves
    L.sx = L.ex0 - 2; L.sy = L.rtop - 24; L.sw = L.ex1 - L.ex0 + 4; L.sh = BASE + 2 - L.sy;
    const r = LB.rng(s.seed);
    L.windows = []; L.doors = []; L.chims = []; L.lanterns = []; L.sign = null;
    // ground floor
    const gy = BASE;
    if (s.inn) {
      L.doors.push({ x: L.cx - 8, y: gy - 20, w: 16, h: 20, arch: true });
      L.windows.push({ x: L.gx0 + 9, y: gy - 19, w: 18, h: 11, ground: true, lit: true, panes: 3 });
      L.windows.push({ x: L.gx1 - 27, y: gy - 19, w: 18, h: 11, ground: true, lit: true, panes: 3 });
      L.lanterns.push({ x: L.cx - 13, y: gy - 22 }, { x: L.cx + 13, y: gy - 22 });
      L.sign = { x: L.ux1 + 1, y: L.gTop - 3 };
    } else if (s.shop) {
      L.windows.push({ x: L.gx0 + 8, y: gy - 20, w: 40, h: 14, ground: true, lit: true, shop: true, panes: 5 });
      L.doors.push({ x: L.gx0 + 56, y: gy - 20, w: 12, h: 20 });
      L.windows.push({ x: L.gx1 - 18, y: gy - 18, w: 10, h: 11, ground: true, lit: r() < 0.6 });
    } else if (s.warehouse) {
      L.doors.push({ x: L.cx - 14, y: gy - 24, w: 28, h: 24, barn: true });
      L.windows.push({ x: L.gx0 + 5, y: gy - 19, w: 8, h: 10, ground: true, lit: false });
    } else if (s.shopFish) {
      L.windows.push({ x: L.gx0 + 10, y: gy - 18, w: 22, h: 11, ground: true, lit: true, panes: 3, fish: true });
      L.doors.push({ x: L.gx0 + 40, y: gy - 19, w: 12, h: 19 });
      L.lanterns.push({ x: L.gx1 - 4, y: gy - 23 });
    } else {
      const dx = s.seed % 2 ? L.gx0 + 8 : L.gx1 - 20;
      L.doors.push({ x: dx, y: gy - 19, w: 12, h: 19, arch: s.seed % 3 === 0 });
      const wx = s.seed % 2 ? L.gx1 - 22 : L.gx0 + 8;
      L.windows.push({ x: wx, y: gy - 18, w: 12, h: 11, ground: true, lit: r() < 0.8 });
      if (s.seed === 15) L.lanterns.push({ x: dx + 18, y: gy - 22 });
    }
    // upper floors
    const floors = s.floors || 1;
    const fh = (L.gTop - L.ftop) / floors;
    L.floorLines = [];
    for (let f = 0; f < floors; f++) {
      const top = Math.round(L.ftop + f * fh), bot = Math.round(L.ftop + (f + 1) * fh);
      L.floorLines.push(bot);
      const span = L.ux1 - L.ux0;
      if (s.warehouse) {
        L.windows.push({ x: L.cx - 6, y: top + 6, w: 12, h: bot - top - 9, loft: true, lit: false });
        L.windows.push({ x: L.ux0 + 6, y: top + 8, w: 8, h: 10, lit: r() < 0.4 });
        L.windows.push({ x: L.ux1 - 14, y: top + 8, w: 8, h: 10, lit: r() < 0.5 });
        continue;
      }
      const n = Math.max(1, Math.floor(span / 26));
      for (let i = 0; i < n; i++) {
        const cx = Math.round(L.ux0 + (span * (i + 0.5)) / n);
        const ww = 10, wh = Math.min(13, bot - top - 9);
        L.windows.push({ x: cx - ww / 2, y: top + 5, w: ww, h: wh, lit: r() < 0.72, flick: r() < 0.2, box: s.boxes && r() < 0.8 });
      }
    }
    if (s.roof === 'gable') L.windows.push({ x: L.cx - 3, y: L.apex + Math.round(s.g * 0.45), w: 6, h: 6, lit: r() < 0.5, attic: true });
    // chimneys
    for (const f of s.chim) {
      const x = Math.round(L.ex0 + (L.ex1 - L.ex0) * f);
      if (s.roof === 'ridge') L.chims.push({ x, base: L.rtop + 8, top: L.rtop - 9 });
      else L.chims.push({ x, base: L.rtop + 12 + Math.round(Math.abs(x - L.cx) * 0.3), top: L.rtop - 6 });
    }
    return L;
  }

  // ---------- pieces ----------
  function shingleRidge(P, x0, x1, y0, y1, col, rng, season, snow) {
    const T = R(col, 6);
    P.rect(x0, y0, x1 - x0, y1 - y0, T[2]);
    const ch = 4;
    let ci = 0;
    for (let y = y0 + 3; y < y1 - 1; y += ch, ci++) {
      const off = (ci % 2) * 3;
      const near = (y - y0) / (y1 - y0);
      for (let x = x0 - off; x < x1; x += 6) {
        const h = rng();
        let t = h < 0.15 ? 1 : h > 0.82 ? 3 : 2;
        if (near < 0.25 && h > 0.5) t = 3;
        const xa = Math.max(x0, x), xb = Math.min(x1, x + 6);
        if (xb <= xa) continue;
        P.rect(xa, y, xb - xa, ch - 2, T[t]);
        P.rect(xa, y + ch - 2, xb - xa, 1, T[Math.min(5, t + 1)]);   // lit butt edge
        if (x + 5 < x1 && x + 5 >= x0) P.rect(x + 5, y, 1, ch - 2, T[t - 1]); // joint
      }
      P.rect(x0, y + ch - 1, x1 - x0, 1, T[0]);                         // the course's shadow on the one below
    }
    // ridge cap
    P.rect(x0, y0, x1 - x0, 3, T[2]);
    P.rect(x0, y0, x1 - x0, 1, T[4]);
    P.rect(x0, y0 + 2, x1 - x0, 1, T[0]);
    for (let x = x0 + 3; x < x1; x += 7) P.rect(x, y0 + 1, 1, 1, T[1]);
    // moss toward the eave
    if (season !== 'winter' && snow < 1) {
      const M = R(season === 'autumn' ? '#7a7a3a' : '#5d7a3a', 4);
      for (let i = 0; i < (x1 - x0) / 9; i++) {
        const mx = x0 + rng() * (x1 - x0), my = y0 + (y1 - y0) * (0.55 + rng() * 0.42);
        P.rect(mx, my, 2 + rng() * 3, 1, M[1]); P.rect(mx + 1, my - 1, 2, 1, M[2]);
        if (rng() < 0.5) P.px(mx + 1, my, M[3]);
      }
    }
    // ends: bargeboards
    const B = R(C.timber, 4);
    P.rect(x0, y0, 2, y1 - y0, B[1]); P.rect(x0, y0, 1, y1 - y0, B[2]);
    P.rect(x1 - 2, y0, 2, y1 - y0, B[0]);
    // gutter
    P.rect(x0, y1 - 1, x1 - x0, 2, '#3a3a44'); P.rect(x0, y1 - 1, x1 - x0, 1, '#5c5e68');
    if (snow > 0) {
      const S0 = snow >= 1, sw = C.snow, ss = C.snowShade;
      for (let x = x0; x < x1; x++) {
        const edge = Math.round(2 + LB.noise(x * 0.25, 3, rng.seed || 5) * 3);
        const bottom = S0 ? y1 - edge : y0 + Math.round((y1 - y0) * (0.25 + 0.35 * LB.noise(x * 0.08, 9, 4)));
        if (S0) { P.rect(x, y0, 1, bottom - y0, sw); P.rect(x, bottom - 2, 1, 2, ss); }
        else {
          // a dusting: snow lies on the courses' tops, slates show between
          for (let y = y0; y < bottom; y++) if (((y - y0 - 3) % ch) < 2 || y < y0 + 3) P.px(x, y, (y % ch === 0) ? ss : sw);
        }
      }
      if (S0) { // a lumpy cornice and the odd icicle
        for (let x = x0; x < x1; x++) {
          if (LB.hash(x, 7, 3) < 0.12) P.rect(x, y1, 1, 1 + Math.floor(LB.hash(x, 8, 3) * 3), '#dfeaf6');
        }
        P.rect(x0, y0, x1 - x0, 1, '#ffffff');
      }
    }
  }

  function shingleGable(P, L, col, rng, season, snow) {
    const T = R(col, 6);
    const xL = L.ex0, xR = L.ex1, cx = L.cx, apex = L.apex, eave = L.ftop + 2, rd = L.s.rd;
    const ye = (x) => x <= cx ? apex + ((cx - x) / (cx - xL)) * (eave - apex) : apex + ((x - cx) / (xR - cx)) * (eave - apex);
    // planes, column by column (courses run front to back, parallel to the eaves)
    for (let x = xL; x < xR; x++) {
      const left = x < cx;
      const yb = Math.round(ye(x)), yt = yb - rd;
      const rel = left ? (x - xL) % 4 : (xR - 1 - x) % 4;
      const course = left ? Math.floor((x - xL) / 4) : Math.floor((xR - 1 - x) / 4);
      const base = left ? 3 : 1; // the left plane faces the light
      for (let y = yt; y <= yb; y++) {
        let t = base;
        if (rel === 0) t = base + 1;         // lit butt edge facing the eave
        else if (rel === 3) t = base - 1;    // shadow under the next course
        else if (((y - yt) + (course % 2) * 3) % 6 === 0) t = base - 1; // tile joint
        if (LB.hash(x >> 2, ((y - yt + (course % 2) * 3) / 6) | 0, L.s.seed) < 0.12 && rel !== 3) t = Math.max(0, t - 1);
        P.px(x, y, T[LB.clamp(t, 0, 5)]);
      }
    }
    // ridge
    for (let y = apex - rd; y <= apex; y++) { P.px(cx - 1, y, T[4]); P.px(cx, y, T[3]); P.px(cx + 1, y, T[1]); if ((y - apex) % 5 === 0) P.px(cx, y, T[2]); }
    // moss low on the planes
    if (season !== 'winter' && snow < 1) {
      const M = R(season === 'autumn' ? '#7a7a3a' : '#5d7a3a', 4);
      for (let i = 0; i < 8; i++) {
        const left = rng() < 0.5;
        const x = left ? xL + 2 + rng() * 8 : xR - 10 + rng() * 8;
        const y = ye(x) - rng() * rd * 0.8;
        P.rect(x, y, 1, 2 + rng() * 2, M[left ? 2 : 1]); P.px(x + (left ? 1 : -1), y + 1, M[left ? 3 : 2]);
      }
    }
    if (snow > 0) {
      for (let x = xL; x < xR; x++) {
        const left = x < cx;
        const yb = Math.round(ye(x)), yt = yb - rd;
        const lip = snow >= 1 ? 1 + Math.round(LB.noise(x * 0.3, 2, L.s.seed) * 2) : Math.round(rd * (0.4 + 0.4 * LB.noise(x * 0.1, 5, L.s.seed)));
        const c1 = left ? C.snow : C.snowShade, c2 = left ? '#d8e2f2' : '#a9b8d6';
        if (snow >= 1) { P.rect(x, yt, 1, yb - lip - yt, c1); P.px(x, yb - lip, c2); }
        else for (let y = yt; y < yb - lip; y++) if (((left ? x - xL : xR - x) % 4) < 2) P.px(x, y, c1);
      }
    }
    // bargeboards along the front edges
    const B = R(C.timber, 5);
    for (let x = xL; x < xR; x++) {
      const yb = Math.round(ye(x));
      P.px(x, yb, B[x < cx ? 3 : 1]); P.px(x, yb + 1, B[x < cx ? 2 : 0]);
      if (snow >= 1) P.px(x, yb - 1, x < cx ? '#ffffff' : '#dfe8f4');
    }
    P.rect(cx - 1, apex - 1, 3, 3, B[2]); P.px(cx, apex - 2, B[3]);
  }

  function chimney(P, x, base, top, snow) {
    const T = R(C.brick, 5);
    P.rect(x - 4, top, 9, base - top, T[2]);
    for (let y = top; y < base; y += 2) {
      P.rect(x - 4, y + 1, 9, 1, T[0]);
      const off = ((y - top) / 2) % 2 ? 0 : 2;
      for (let bx = x - 4 + off; bx < x + 5; bx += 4) P.px(bx, y, T[1]);
    }
    P.rect(x - 4, top, 2, base - top, T[3]); P.px(x - 4, top, T[4]);
    P.rect(x + 3, top, 2, base - top, T[1]);
    P.rect(x - 5, top - 2, 11, 2, '#8d918e'); P.rect(x - 5, top - 2, 11, 1, '#b8bcb6');
    const PT = R('#b4603c', 4);
    P.rect(x - 3, top - 5, 3, 3, PT[2]); P.px(x - 3, top - 5, PT[3]); P.px(x - 2, top - 5, PT[0]);
    P.rect(x + 1, top - 4, 3, 2, PT[1]); P.px(x + 2, top - 4, PT[0]);
    if (snow >= 1) { P.rect(x - 5, top - 3, 11, 1, C.snow); P.rect(x - 5, top - 2, 4, 1, C.snow); }
  }

  function timberWall(P, x0, x1, y0, y1, wallC, rng, braces) {
    const PL = R(wallC, 5, { shift: 14 }), TB = R(C.timber, 5);
    P.rect(x0, y0, x1 - x0, y1 - y0, PL[2]);
    // calm plaster: a few weathered clusters low on each panel
    for (let i = 0; i < (x1 - x0) * (y1 - y0) / 120; i++) {
      const x = x0 + rng() * (x1 - x0), y = y0 + (y1 - y0) * (0.5 + rng() * 0.5);
      P.rect(x, y, 1 + Math.floor(rng() * 3), 1, PL[1]);
      if (rng() < 0.3) P.px(x + 1, y - 1, PL[3]);
    }
    // posts at the corners
    P.rect(x0, y0, 2, y1 - y0, TB[3]); P.rect(x0 + 1, y0, 1, y1 - y0, TB[2]);
    P.rect(x1 - 2, y0, 2, y1 - y0, TB[1]); P.rect(x1 - 1, y0, 1, y1 - y0, TB[0]);
    return { PL, TB };
  }

  function stoneWall(P, x0, x1, y0, y1, rng) {
    const S = R(C.stone, 6, { shift: 18 });
    P.rect(x0, y0, x1 - x0, y1 - y0, S[0]);
    let row = 0;
    for (let y = y0; y < y1; y += 5, row++) {
      let x = x0 - (row % 2) * 5;
      while (x < x1) {
        const w = 7 + Math.floor(rng() * 7);
        const xa = Math.max(x0, x), xb = Math.min(x1, x + w - 1);
        if (xb > xa) {
          const t = 2 + (rng() < 0.25 ? 1 : 0) - (rng() < 0.2 ? 1 : 0);
          P.rect(xa, y, xb - xa, 4, S[t]);
          P.rect(xa, y, xb - xa, 1, S[t + 1]);
          P.rect(xa, y + 3, xb - xa, 1, S[t - 1]);
        }
        x += w;
      }
    }
    // quoins
    for (let y = y0, i = 0; y < y1; y += 5, i++) {
      const w = i % 2 ? 5 : 8;
      P.rect(x0, y, w, 4, S[4]); P.rect(x0, y, w, 1, S[5]);
      P.rect(x1 - w, y, w, 4, S[3]); P.rect(x1 - w, y, w, 1, S[4]);
    }
  }

  function windowAt(P, w, shut, season, snow, rng) {
    const TB = R(C.timber, 5), G = R(C.glass, 5), SH = R(shut, 5);
    if (!w.shop && !w.loft && !w.attic && !w.ground) {
      // open shutters, boarded
      for (const sx of [w.x - 5, w.x + w.w + 1]) {
        P.rect(sx, w.y - 1, 4, w.h + 2, SH[2]);
        P.rect(sx, w.y - 1, 1, w.h + 2, SH[3]);
        P.rect(sx + 2, w.y, 1, w.h, SH[1]);
        P.rect(sx, w.y + 2, 4, 1, SH[3]); P.rect(sx, w.y + w.h - 3, 4, 1, SH[3]);
        P.rect(sx + 3, w.y - 1, 1, w.h + 2, SH[0]);
      }
    }
    if (w.loft) { // the warehouse's loading door
      P.rect(w.x - 1, w.y - 1, w.w + 2, w.h + 2, TB[0]);
      P.rect(w.x, w.y, w.w, w.h, TB[2]);
      for (let x = w.x + 2; x < w.x + w.w; x += 3) P.rect(x, w.y, 1, w.h, TB[1]);
      P.line(w.x, w.y + w.h - 1, w.x + w.w - 1, w.y, TB[3]);
      return;
    }
    P.rect(w.x - 1, w.y - 1, w.w + 2, w.h + 2, TB[1]);
    P.rect(w.x - 1, w.y - 1, w.w + 2, 1, TB[3]);
    P.rect(w.x, w.y, w.w, w.h, G[1]);
    P.rect(w.x, w.y, w.w, Math.ceil(w.h / 2), G[2]);
    // the sky in the glass: a light corner and a diagonal sheen
    P.rect(w.x, w.y, 2, 1, G[4]); P.px(w.x, w.y + 1, G[3]);
    P.line(w.x + w.w - 3, w.y, w.x + w.w - 5, w.y + 2, G[3]);
    if (w.shop) { // goods on display
      const items = ['#c8a050', '#7a4030', '#d8c8a8', '#5a6a40'];
      for (let x = w.x + 2; x < w.x + w.w - 2; x += 4) {
        const h = 2 + Math.floor(rng() * 4);
        P.rect(x, w.y + w.h - h, 3, h, items[Math.floor(rng() * items.length)]);
      }
    }
    if (w.fish) {
      for (let x = w.x + 2; x < w.x + w.w - 4; x += 6) { P.rect(x, w.y + w.h - 3, 5, 2, '#a8b8c0'); P.px(x + 4, w.y + w.h - 3, '#5a6a78'); }
    }
    // mullions
    const panes = w.panes || 2;
    for (let i = 1; i < panes; i++) P.rect(Math.round(w.x + (w.w * i) / panes), w.y, 1, w.h, TB[2]);
    P.rect(w.x, Math.round(w.y + w.h / 2), w.w, 1, TB[2]);
    // sill
    P.rect(w.x - 2, w.y + w.h + 1, w.w + 4, 1, '#c8c4b4'); P.rect(w.x - 2, w.y + w.h + 2, w.w + 4, 1, '#6a6660');
    if (snow > 0) P.rect(w.x - 2, w.y + w.h, w.w + 4, 1, C.snow);
    if (w.box && !w.attic) {
      const BX = R('#7a5030', 4);
      P.rect(w.x - 1, w.y + w.h + 2, w.w + 2, 3, BX[2]); P.rect(w.x - 1, w.y + w.h + 2, w.w + 2, 1, BX[3]); P.rect(w.x - 1, w.y + w.h + 4, w.w + 2, 1, BX[0]);
      if (season === 'winter') { P.rect(w.x - 1, w.y + w.h + 1, w.w + 2, 1, C.snow); return; }
      const leaf = season === 'autumn' ? '#7a6a2a' : '#4a7a34';
      const fl = { spring: ['#f4a0c0', '#fff0a0', '#ffffff'], summer: ['#e04848', '#f0c040', '#c070e0', '#ffffff'], autumn: ['#e08030', '#a04020'] }[season];
      for (let x = w.x - 1; x < w.x + w.w + 1; x++) {
        const h = rng();
        P.px(x, w.y + w.h + 1, leaf);
        if (h < 0.55) P.px(x, w.y + w.h, LB.shade(leaf, 0.3));
        if (h < 0.35) P.px(x, w.y + w.h - (h < 0.15 ? 1 : 0), fl[Math.floor(rng() * fl.length)]);
      }
    }
  }

  function doorAt(P, d, snow) {
    const TB = R('#6a4424', 5), ST = R('#9a9c94', 4);
    if (d.barn) {
      P.rect(d.x - 2, d.y - 2, d.w + 4, d.h + 2, ST[1]);
      P.rect(d.x, d.y, d.w, d.h, TB[2]);
      for (let x = d.x + 2; x < d.x + d.w; x += 3) P.rect(x, d.y, 1, d.h, TB[1]);
      P.rect(d.x + d.w / 2 - 1, d.y, 2, d.h, TB[0]);
      P.line(d.x + 1, d.y + d.h - 2, d.x + d.w / 2 - 2, d.y + 2, TB[3]);
      P.line(d.x + d.w - 2, d.y + d.h - 2, d.x + d.w / 2 + 1, d.y + 2, TB[3]);
      P.rect(d.x, d.y + 3, d.w, 1, TB[3]); P.rect(d.x, d.y + d.h - 4, d.w, 1, TB[3]);
      return;
    }
    P.rect(d.x - 2, d.y - 2, d.w + 4, d.h + 2, ST[2]);
    P.rect(d.x - 2, d.y - 2, d.w + 4, 1, ST[3]);
    P.rect(d.x, d.y, d.w, d.h, TB[2]);
    if (d.arch) { P.rect(d.x, d.y, 2, 2, ST[2]); P.rect(d.x + d.w - 2, d.y, 2, 2, ST[2]); P.px(d.x + 2, d.y, ST[2]); P.px(d.x + d.w - 3, d.y, ST[2]); }
    for (let x = d.x + 3; x < d.x + d.w; x += 3) P.rect(x, d.y + 1, 1, d.h - 1, TB[1]);
    P.rect(d.x, d.y + 4, d.w, 1, TB[0]); P.rect(d.x, d.y + d.h - 5, d.w, 1, TB[0]);
    P.rect(d.x + 1, d.y + 1, 1, d.h - 1, TB[3]);
    P.px(d.x + d.w - 3, d.y + Math.round(d.h / 2), C.brass);
    // a step
    P.rect(d.x - 3, BASE - 1, d.w + 6, 2, ST[3]); P.rect(d.x - 3, BASE, d.w + 6, 1, ST[1]);
    if (snow >= 1) P.rect(d.x - 3, BASE - 2, d.w + 6, 1, C.snow);
  }

  function ivy(P, x, yTop, yBot, season, rng) {
    const leafC = { spring: '#7ab84a', summer: '#3f7a36', autumn: '#c0482c', winter: null }[season];
    const stem = '#5a4030';
    let cx = x;
    for (let y = yBot; y > yTop; y--) {
      cx += Math.round((rng() - 0.5) * 1.2);
      P.px(cx, y, stem);
      if (y % 7 === 0) for (let k = 1; k < 5; k++) P.px(cx + k, y - Math.round(k * 0.5), stem);
    }
    if (!leafC) return;
    const T = R(leafC, 4);
    for (let i = 0; i < 70; i++) {
      const y = yTop + rng() * (yBot - yTop), spread = 2 + (y - yTop) / (yBot - yTop) * 6;
      const lx = x + (rng() - 0.3) * spread * 2;
      const t = rng() < 0.35 ? 3 : rng() < 0.5 ? 2 : 1;
      P.rect(lx, y, 2, 2, T[t]); P.px(lx, y + 1, T[t - 1]);
      if (season === 'autumn' && rng() < 0.3) P.px(lx + 1, y, '#e8902c');
    }
  }

  function lanternSpr() {
    return spr('lq-lantern', 9, 13, (P) => {
      P.rect(2, 0, 5, 1, '#2a2830'); P.rect(1, 1, 7, 2, '#3a3842'); P.px(1, 1, '#5a5866');
      P.rect(2, 3, 5, 6, '#e8d8a8'); P.rect(2, 3, 1, 6, '#3a3842'); P.rect(6, 3, 1, 6, '#3a3842');
      P.rect(3, 4, 3, 4, '#8a7a5a');
      P.rect(1, 9, 7, 2, '#3a3842'); P.px(1, 9, '#5a5866'); P.rect(3, 11, 3, 1, '#2a2830');
      P.px(4, 12, '#2a2830');
    });
  }

  function buildHouse(L, season, snow) {
    const s = L.s, cv = LB.canvas(L.sw, L.sh), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
    ctx.translate(-L.sx, -L.sy);
    const rng = LB.rng(s.seed * 7 + 3);
    // walls
    if (s.stone) stoneWall(P, L.gx0, L.gx1, L.gTop, BASE, rng);
    else timberWall(P, L.gx0, L.gx1, L.gTop, BASE, s.wall, rng);
    const tw = timberWall(P, L.ux0, L.ux1, L.ftop, L.gTop, s.wall, rng);
    const TB = tw.TB, PL = tw.PL;
    // floor rails and the jetty's shadow on the floor below
    for (const fy of L.floorLines) {
      P.rect(L.ux0, fy - 2, L.ux1 - L.ux0, 2, TB[2]); P.rect(L.ux0, fy - 2, L.ux1 - L.ux0, 1, TB[3]);
      if (fy === L.gTop && s.jetty) {
        P.rect(L.gx0, fy, L.gx1 - L.gx0, 2, s.stone ? '#4c5654' : PL[0]);
        for (let x = L.ux0 + 3; x < L.ux1 - 2; x += 7) { P.rect(x, fy, 2, 2, TB[1]); P.px(x, fy, TB[2]); } // joist ends
      } else if (fy !== L.gTop) {
        // nothing
      }
    }
    P.rect(L.ux0, L.ftop, L.ux1 - L.ux0, 2, TB[1]);
    // posts between windows and braces in the blank panels
    const upper = L.windows.filter((w) => !w.ground && !w.attic);
    const posts = new Set([L.ux0 + 1, L.ux1 - 2]);
    for (const w of upper) { posts.add(w.x - 8); posts.add(w.x + w.w + 6); }
    const rowsTop = [L.ftop, ...L.floorLines.slice(0, -1)], rowsBot = L.floorLines;
    for (let f = 0; f < rowsBot.length; f++) {
      const top = rowsTop[f] + 2, bot = rowsBot[f] - 2;
      for (const px of posts) {
        if (px <= L.ux0 || px >= L.ux1 - 1) continue;
        P.rect(px, top, 2, bot - top, TB[2]); P.rect(px, top, 1, bot - top, TB[3]);
      }
      if (!s.warehouse) {
        // braces at the corners
        P.line(L.ux0 + 2, bot - 1, L.ux0 + 6, top + 1, TB[1]); P.line(L.ux0 + 3, bot - 1, L.ux0 + 7, top + 1, TB[2]);
        P.line(L.ux1 - 3, bot - 1, L.ux1 - 7, top + 1, TB[1]); P.line(L.ux1 - 4, bot - 1, L.ux1 - 8, top + 1, TB[0]);
      }
    }
    // the gable end
    if (s.roof === 'gable') {
      const top = L.apex;
      for (let y = top; y < L.ftop; y++) {
        const k = (y - top) / (L.ftop - top), half = Math.round(k * (L.ux1 - L.ux0) / 2);
        P.rect(L.cx - half, y, half * 2, 1, PL[2]);
      }
      P.rect(L.cx - 1, top + 2, 2, L.ftop - top - 2, TB[2]);
      P.rect(L.cx - Math.round((L.ux1 - L.ux0) * 0.32), L.ftop - Math.round(s.g * 0.35), Math.round((L.ux1 - L.ux0) * 0.64), 2, TB[2]);
    }
    // shadow under the eaves
    if (s.roof === 'ridge') { ctx.save(); ctx.globalAlpha = 0.35; P.rect(L.ux0, L.ftop + 2, L.ux1 - L.ux0, 3, '#2a2440'); ctx.restore(); }
    for (const w of L.windows) windowAt(P, w, s.shut, season, snow, rng);
    for (const d of L.doors) doorAt(P, d, snow);
    if (s.ivy) ivy(P, L.gx0 + 3, L.ftop + 6, BASE - 1, season, LB.rng(s.seed + 99));
    if (s.warehouse) {
      // the hoist beam over the loading door
      P.rect(L.cx - 2, L.ftop - 3, 4, 6, TB[1]); P.rect(L.cx - 1, L.ftop + 3, 2, 4, TB[2]);
      P.rect(L.cx - 3, L.ftop + 6, 6, 2, '#3a3842');
    }
    // roof
    if (s.roof === 'ridge') shingleRidge(P, L.ex0, L.ex1, L.rtop, L.ftop + 2, s.roofC, rng, season, snow);
    else shingleGable(P, L, s.roofC, rng, season, snow);
    if (s.dormer) {
      const dx = L.cx, dy = L.rtop + 12, PLd = R(s.wall, 5);
      P.rect(dx - 9, dy - 2, 18, 12, PLd[2]); P.rect(dx - 9, dy - 2, 2, 12, TB[3]); P.rect(dx + 7, dy - 2, 2, 12, TB[1]);
      windowAt(P, { x: dx - 4, y: dy, w: 8, h: 7, attic: true }, s.shut, season, snow, rng);
      const T = R(s.roofC, 5);
      for (let i = 0; i < 6; i++) { P.rect(dx - 10 + i, dy - 3 - i, 20 - i * 2, 1, i < 2 ? T[1] : T[2 + (i % 2)]); }
      P.rect(dx - 11, dy - 3, 22, 1, R(C.timber, 4)[2]);
      if (snow >= 1) for (let i = 0; i < 6; i++) P.rect(dx - 9 + i, dy - 4 - i, 18 - i * 2, 1, C.snow);
    }
    for (const c of L.chims) chimney(P, c.x, c.base, c.top, snow);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return selout(cv);
  }
  function selout(src) {
    const w = src.width, h = src.height, sd = LB.ctx2d(src).getImageData(0, 0, w, h).data;
    const out = LB.canvas(w, h), oc = LB.ctx2d(out);
    oc.drawImage(src, 0, 0);
    const od = oc.getImageData(0, 0, w, h), d = od.data, cache = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (sd[i + 3] >= 128) continue;
      let ni = -1;
      if (x > 0 && sd[i - 1] >= 128) ni = i - 4;
      else if (x < w - 1 && sd[i + 7] >= 128) ni = i + 4;
      else if (y > 0 && sd[i - w * 4 + 3] >= 128) ni = i - w * 4;
      else if (y < h - 1 && sd[i + w * 4 + 3] >= 128) ni = i + w * 4;
      if (ni < 0) continue;
      const key = (sd[ni] << 16) | (sd[ni + 1] << 8) | sd[ni + 2];
      if (!cache.has(key)) {
        const src = [sd[ni], sd[ni + 1], sd[ni + 2]], l = LB.toHsl(src)[2];
        cache.set(key, LB.rgb(l > 0.78 ? LB.mix(src, '#3c4258', 0.62) : LB.mix(LB.shade(src, -0.9), '#2a2632', 0.45)));
      }
      const c = cache.get(key);
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    oc.putImageData(od, 0, 0);
    return out;
  }

  function houseSprite(L, S) {
    return LB.memo('lq-h' + L.s.seed + S.season + S.snow, () => buildHouse(L, S.season, S.snow));
  }

  // ---------- quay props ----------
  const crateSpr = (snow) => spr('lq-crate' + snow, 16, 16, (P) => {
    const T = R('#9a7044', 5);
    P.rect(1, 5, 14, 10, T[2]); P.rect(1, 1, 14, 5, T[3]);
    P.rect(1, 1, 14, 1, T[4]); P.rect(1, 5, 14, 1, T[1]);
    for (let x = 1; x < 15; x += 5) P.rect(x, 6, 1, 9, T[1]);
    P.line(2, 14, 14, 7, T[3]); P.rect(1, 14, 14, 1, T[0]);
    if (snow) { P.rect(1, 1, 14, 3, C.snow); P.rect(2, 4, 11, 1, C.snowShade); }
  });
  const barrelSpr = (snow) => spr('lq-barrel' + snow, 14, 17, (P) => {
    const T = R('#8a5a32', 5);
    P.rect(2, 3, 10, 13, T[2]); P.rect(1, 5, 12, 9, T[2]);
    P.rect(2, 3, 3, 13, T[3]); P.rect(9, 3, 3, 13, T[1]);
    for (const y of [5, 12]) P.rect(1, y, 12, 1, '#3a3842');
    P.ellipse(7, 3, 5, 2, T[1]); P.ellipse(7, 3, 4, 1, T[3]);
    if (snow) P.ellipse(7, 2, 5, 2, C.snow);
  });
  const bollardSpr = (snow) => spr('lq-bollard' + snow, 10, 12, (P) => {
    P.rect(2, 3, 6, 9, '#3a3a44'); P.rect(2, 3, 2, 9, '#5a5c68'); P.rect(1, 1, 8, 3, '#2e2e38'); P.rect(2, 1, 4, 1, '#6a6c78');
    if (snow) { P.rect(1, 0, 8, 2, C.snow); }
  });
  const postSpr = (snow) => spr('lq-post' + snow, 12, 44, (P) => {
    P.rect(5, 12, 2, 30, '#2e2c36'); P.rect(5, 12, 1, 30, '#504e5c');
    P.rect(3, 40, 6, 4, '#2e2c36'); P.rect(3, 40, 2, 3, '#4a4856');
    P.rect(2, 10, 8, 2, '#2e2c36');
    P.rect(2, 1, 8, 2, '#3a3842'); P.rect(3, 0, 6, 1, '#2a2830');
    P.rect(3, 3, 6, 7, '#e8d8a8'); P.rect(3, 3, 1, 7, '#3a3842'); P.rect(8, 3, 1, 7, '#3a3842'); P.rect(4, 4, 4, 5, '#8a7a5a');
    if (snow) { P.rect(2, 0, 8, 1, C.snow); P.rect(2, 9, 8, 1, C.snow); }
  });
  const ropeSpr = () => spr('lq-rope', 18, 9, (P) => {
    const T = R('#b8a070', 4);
    P.ellipse(9, 4, 8, 4, T[1]); P.ellipse(9, 4, 6, 3, T[2]); P.ellipse(9, 4, 4, 2, T[1]); P.ellipse(9, 4, 2, 1, T[3]);
    for (let x = 2; x < 16; x += 3) P.px(x, 4 + (x % 2), T[0]);
  });
  const basketSpr = (season) => spr('lq-basket' + season, 14, 10, (P) => {
    const T = R('#a88050', 4);
    P.rect(1, 3, 12, 7, T[2]); for (let x = 1; x < 13; x += 2) P.rect(x, 4, 1, 6, T[1]); P.rect(1, 3, 12, 1, T[3]);
    if (season !== 'winter') for (let x = 2; x < 12; x += 3) { P.rect(x, 1, 3, 2, '#9ab0bc'); P.px(x + 2, 1, '#e0e8ee'); }
  });
  const netRack = (season, snow) => spr('lq-net' + season + snow, 50, 30, (P) => {
    const TB = R('#7a5434', 4);
    P.rect(2, 2, 3, 28, TB[2]); P.rect(2, 2, 1, 28, TB[3]); P.rect(45, 2, 3, 28, TB[1]);
    P.rect(1, 2, 48, 2, TB[2]); P.rect(1, 2, 48, 1, TB[3]);
    const net = '#6a7a72';
    for (let x = 5; x < 45; x += 3) for (let y = 4; y < 24; y++) {
      const sag = Math.round(Math.sin(((x - 5) / 40) * Math.PI) * 3);
      if ((x + y) % 3 === 0 || (x - y) % 3 === 0) P.px(x + ((y % 2) ? 1 : 0), y + sag, net);
    }
    for (let x = 7; x < 45; x += 7) { P.rect(x, 23 + Math.round(Math.sin(((x - 5) / 40) * Math.PI) * 3), 3, 2, '#d8a040'); }
    if (snow) { P.rect(1, 1, 48, 1, C.snow); }
  });

  const anchorSpr = (snow) => spr('lq-anchor' + snow, 26, 26, (P) => {
    const I = R('#5a5e6a', 5), RU = '#8a4a2a';
    P.rect(12, 3, 3, 18, I[2]); P.rect(12, 3, 1, 18, I[3]);
    P.rect(7, 6, 13, 2, I[2]); P.rect(7, 6, 13, 1, I[3]);
    P.ellipse(13, 2, 3, 2, I[1]); P.ellipse(13, 2, 1, 1, '#00000000');
    for (let a = 0; a <= 12; a++) { const th = Math.PI * (a / 12); P.rect(13 + Math.round(Math.cos(th) * 10), 18 + Math.round(Math.sin(th) * 5), 2, 2, a < 6 ? I[3] : I[1]); }
    P.rect(2, 15, 3, 3, I[2]); P.rect(22, 15, 3, 3, I[1]);
    for (const [x, y] of [[13, 10], [6, 21], [19, 22], [12, 16]]) P.px(x, y, RU);
    if (snow) { P.rect(7, 5, 13, 1, C.snow); P.px(13, 0, C.snow); }
  });
  const benchSpr = (snow) => spr('lq-bench' + snow, 26, 12, (P) => {
    const T = R('#7a5434', 5);
    P.rect(1, 2, 24, 3, T[2]); P.rect(1, 2, 24, 1, T[3]); P.rect(1, 6, 24, 2, T[3]); P.rect(1, 7, 24, 1, T[1]);
    for (const x of [3, 21]) { P.rect(x, 8, 2, 4, '#3a3842'); P.rect(x, 4, 2, 3, '#3a3842'); }
    if (snow) { P.rect(1, 1, 24, 1, C.snow); P.rect(1, 5, 24, 1, C.snow); }
  });
  const tubSpr = (season, snow) => spr('lq-tub' + season + snow, 14, 16, (P) => {
    const T = R('#8a5a34', 5);
    P.rect(2, 8, 10, 8, T[2]); P.rect(2, 8, 3, 8, T[3]); P.rect(9, 8, 3, 8, T[1]); P.rect(1, 9, 12, 1, '#3a3842'); P.rect(1, 14, 12, 1, '#3a3842');
    if (season === 'winter') { P.rect(3, 7, 8, 1, C.snow); P.px(6, 5, '#5a4030'); P.px(7, 4, '#5a4030'); return; }
    const leaf = R(season === 'autumn' ? '#8a7a30' : '#4a8a3a', 4);
    P.blob(7, 5, 5, leaf[1], 3, 0.3); P.blob(6, 4, 3, leaf[2], 4, 0.3); P.px(5, 2, leaf[3]);
    const fl = { spring: ['#ffd0e8', '#fff0a0'], summer: ['#e83a4a', '#ffffff', '#e8a030'], autumn: ['#e07028', '#b04020'] }[season];
    for (const [x, y] of [[4, 3], [9, 4], [6, 6], [10, 2], [3, 6]]) P.px(x, y, fl[(x + y) % fl.length]);
    if (snow) P.rect(3, 1, 7, 1, C.snow);
  });
  const potsSpr = (snow) => spr('lq-pots' + snow, 30, 22, (P) => {
    const T = R('#9a7a50', 4), N = '#5a6a62';
    const pot = (x, y) => { P.rect(x, y, 12, 9, T[1]); for (let i = 0; i < 12; i += 3) P.rect(x + i, y, 1, 9, T[2]); P.rect(x, y, 12, 1, T[3]); P.rect(x + 3, y + 3, 6, 4, N); P.rect(x, y + 8, 12, 1, T[0]); };
    pot(1, 12); pot(15, 12); pot(8, 3);
    if (snow) { P.rect(8, 2, 12, 2, C.snow); P.rect(1, 11, 6, 1, C.snow); P.rect(21, 11, 6, 1, C.snow); }
  });
  const cartSpr = (season, snow) => spr('lq-cart' + season + snow, 40, 26, (P) => {
    const T = R('#8a6038', 5);
    P.rect(4, 6, 30, 10, T[2]); P.rect(4, 6, 30, 2, T[3]); P.rect(4, 15, 30, 1, T[0]);
    for (let x = 8; x < 34; x += 6) P.rect(x, 8, 1, 7, T[1]);
    P.line(34, 12, 39, 16, T[1]); P.line(34, 13, 39, 17, T[0]);
    P.disc(11, 19, 6, '#4a3424'); P.disc(11, 19, 4, T[2]); P.disc(11, 19, 1, '#3a2a1a');
    for (const [a, b] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) P.px(11 + a, 19 + b, '#4a3424');
    // the day's catch, or snow
    if (snow) { P.rect(4, 4, 30, 3, C.snow); return; }
    if (season !== 'winter') for (let x = 6; x < 32; x += 5) { P.rect(x, 3, 5, 3, '#a8bcc8'); P.px(x + 4, 3, '#6a7a88'); P.px(x, 4, '#e0eaf0'); }
  });

  // the sloop and the rowboats, drawn at their waterline (bottom row)
  const sloopSpr = (snow) => spr('lq-sloop' + snow, 132, 124, (P) => {
    const wl = 123;
    const HULL = R('#2f5068', 6), WD = R('#b8925e', 5), TB = R('#6a4424', 5);
    // hull side, bow to the left
    const sheer = (x) => wl - 13 + Math.round(((x - 4) / 124) * 2 - Math.max(0, 14 - x) * 0.35);
    for (let x = 4; x < 128; x++) {
      const top = sheer(x), bow = Math.max(0, 16 - x), stern = Math.max(0, x - 121);
      const bot = wl - Math.round(bow * 0.7) - stern;
      if (bot <= top) continue;
      P.rect(x, top, 1, bot - top + 1, HULL[2]);
      P.px(x, top + 1, '#e8d8a0');                 // the cream wale
      P.px(x, top, HULL[4]);
      if (bot - top > 6) { P.rect(x, bot - 1, 1, 2, '#7a3a2c'); }
    }
    // deck seen from above: a long lens
    for (let x = 6; x < 126; x++) {
      const k = (x - 6) / 120, w = Math.round(Math.sin(Math.min(1, k * 1.25 + 0.1) * Math.PI * 0.5) * 9 * (k > 0.9 ? 0.9 : 1));
      const y = sheer(x);
      P.rect(x, y - w, 1, w, WD[2]);
      P.px(x, y - w, TB[1]);
      if ((x % 5) === 0) for (let yy = y - w + 1; yy < y; yy++) if ((yy & 1) === 0) P.px(x, yy, WD[1]);
    }
    for (let x = 8; x < 124; x++) { const y = sheer(x); P.px(x, y - 1, TB[2]); if ((x % 9) === 0) P.px(x, y - 2, WD[3]); }
    // cabin
    P.rect(70, wl - 30, 30, 10, TB[2]); P.rect(70, wl - 30, 30, 2, TB[3]); P.rect(70, wl - 22, 30, 2, TB[1]);
    for (const x of [75, 85, 94]) { P.rect(x, wl - 27, 3, 3, '#3a4a5c'); P.px(x, wl - 27, '#8aa0b4'); }
    // mast, boom, furled sail
    P.rect(46, 4, 3, wl - 26, TB[2]); P.rect(46, 4, 1, wl - 26, TB[3]);
    P.rect(40, 26, 15, 2, TB[1]);
    P.rect(48, wl - 36, 70, 2, TB[2]); P.rect(48, wl - 36, 70, 1, TB[3]);
    const SL = R('#e8dcbc', 4);
    for (let x = 50; x < 114; x++) {
      const h = 3 + Math.round(LB.noise(x * 0.3, 1, 8) * 2);
      P.rect(x, wl - 36 - h, 1, h, SL[2]); P.px(x, wl - 36 - h, SL[3]); P.px(x, wl - 37, SL[1]);
    }
    for (let x = 56; x < 114; x += 11) { P.rect(x, wl - 41, 2, 6, '#8a6a44'); }
    // rigging
    // a pennant
    P.rect(49, 4, 6, 2, '#c84040'); P.px(55, 5, '#c84040'); P.px(49, 4, '#e86060');
    if (snow) { P.rect(70, wl - 31, 30, 2, C.snow); for (let x = 52; x < 112; x++) P.px(x, wl - 41 + Math.round(LB.noise(x * 0.3, 1, 8) * 2), C.snow); }
  });
  const rowboatSpr = (k, snow) => spr('lq-row' + k + snow, 44, 18, (P) => {
    const HULL = R(k ? '#a84a3a' : '#3f6e5a', 5), IN = R('#a07a4c', 5);
    const wl = 17;
    for (let x = 2; x < 42; x++) {
      const e = Math.min(x - 2, 41 - x), w = Math.round(Math.min(1, e / 9) * 6);
      if (w <= 0) continue;
      P.rect(x, wl - 5 - w, 1, w, IN[2]);              // inside, from above
      P.px(x, wl - 5 - w, HULL[3]);                    // gunwale
      P.rect(x, wl - 5, 1, 5 - Math.max(0, 4 - e), HULL[2]); // side
      P.px(x, wl - 5, HULL[4]);
    }
    for (const x of [14, 28]) P.rect(x, wl - 10, 3, 5, IN[3]);
    P.rect(4, wl - 7, 36, 1, IN[1]);
    if (!k) { P.line(10, wl - 9, 30, wl - 4, '#c8a878'); P.rect(29, wl - 5, 4, 2, '#c8a878'); }
    if (snow) { for (let x = 6; x < 38; x++) P.px(x, wl - 9, C.snow); P.rect(14, wl - 11, 3, 1, C.snow); P.rect(28, wl - 11, 3, 1, C.snow); }
  });
  const BOATS = [
    { spr: (sn) => sloopSpr(sn), x: 270, wl: 240, ph: 0, rig: true },
    { spr: (sn) => rowboatSpr(0, sn), x: 132, wl: 212, ph: 1.7 },
    { spr: (sn) => rowboatSpr(1, sn), x: 30, wl: 254, ph: 3.1 },
  ];
  function rigging(ctx, x, y, h) {
    const P = LB.paint(ctx), wl = h - 1;
    ctx.save(); ctx.globalAlpha = 0.75;
    P.line(x + 47, y + 5, x + 7, y + wl - 18, '#4a4048');
    P.line(x + 48, y + 5, x + 125, y + wl - 15, '#4a4048');
    ctx.globalAlpha = 0.5;
    P.line(x + 47, y + 7, x + 38, y + wl - 15, '#4a4048'); P.line(x + 48, y + 7, x + 58, y + wl - 17, '#4a4048');
    ctx.restore();
  }
  const bob = (b, t) => Math.round(Math.sin(t * 1.1 + b.ph) * 1.1);

  // ---------- ground: back row, quay, edge, wall ----------
  function backdrop(P, S) {
    // what shows down the alleys: a back row of houses and their roofs, cooler and dimmer
    const rng = LB.rng(77);
    let x = -10;
    while (x < W) {
      const w = 40 + Math.floor(rng() * 30), wallTop = 36 + Math.floor(rng() * 16);
      const roof = rng.pick(['#4a5a74', '#4f6a4a', '#8a5a44', '#3c5058']);
      const T = R(LB.mix(roof, '#5a6488', 0.25), 5), PL = R(LB.mix(rng.pick(['#c8bca0', '#b8c0bc', '#c8b0a0']), '#7a809c', 0.3), 4);
      P.rect(x, wallTop, w, BASE - wallTop, PL[1]);
      for (let wx = x + 6; wx < x + w - 6; wx += 12) { P.rect(wx, wallTop + 8, 6, 8, '#2a3040'); P.px(wx, wallTop + 8, '#4a5468'); }
      P.rect(x - 2, 0, w + 4, wallTop + 2, T[2]);
      for (let y = 2; y < wallTop; y += 3) P.rect(x - 2, y + 2, w + 4, 1, T[1]);
      if (S.snow >= 1) P.rect(x - 2, 0, w + 4, wallTop - 1, '#d2dcee');
      P.rect(x - 2, wallTop, w + 4, 2, '#2a2a38');
      x += w + 2;
    }
    // alley floors: shaded cobbles running back
    P.rect(0, 84, W, BASE - 84, '#4a4a52');
  }

  function cobbles(S) {
    return LB.memo('lq-cob' + S.season + S.weather + S.snow, () => {
      const hgt = COP - BASE + 8;
      const cv = LB.canvas(W, hgt), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const wet = S.weather === 'rain';
      const rng = LB.rng(5);
      const walkY = WALK - BASE + 2;
      // flagstones along the house fronts, then a kerb
      const FL = R(wet ? '#8a887e' : '#b2a892', 6, { shift: 16 });
      const PAVE = 12;
      P.rect(0, 0, W, PAVE + 3, FL[0]);
      for (let row = 0; row < 2; row++) {
        let x = -((row * 11) % 17);
        const y = row * 6;
        while (x < W) {
          const w = 15 + Math.floor(rng() * 12), t = 3 + (rng() < 0.3 ? 1 : 0) - (rng() < 0.3 ? 1 : 0);
          P.rect(x, y, w - 1, 5, FL[t]); P.rect(x, y, w - 1, 1, FL[t + 1]); P.rect(x + w - 1, y, 1, 6, FL[1]);
          if (rng() < 0.25) { const cx = x + 3 + rng() * (w - 8); P.line(cx, y + 1, cx + 3, y + 4, FL[t - 2]); }
          x += w;
        }
      }
      P.rect(0, PAVE, W, 1, FL[5]); P.rect(0, PAVE + 1, W, 1, FL[3]); P.rect(0, PAVE + 2, W, 1, FL[1]);
      // setts: rounded stones in gently curving courses, their tone drifting in broad worn patches
      const base = wet ? LB.mix(C.cob, '#4c5468', 0.35) : C.cob;
      const ramps = [base, LB.mix(base, '#a08470', 0.35), LB.mix(base, '#74848e', 0.4), LB.mix(base, '#8c8a68', 0.3)].map((h) => R(h, 6, { shift: 18 }));
      const grout = LB.mix(base, '#2a2832', 0.55);
      P.rect(0, PAVE + 3, W, hgt - PAVE - 3, grout);
      for (let y = PAVE + 3, row = 0; y < hgt; y += 5, row++) {
        let x = -(row % 2) * 4 - Math.floor(rng() * 3);
        while (x < W) {
          const w = 6 + Math.floor(rng() * 4);
          const yy = y + Math.round(Math.sin(x * 0.028 + row * 0.9) * 1.2);
          const patch = LB.fbm(x * 0.025, yy * 0.06, 8, 2);
          const hr = rng(), ramp = ramps[hr < 0.62 ? 0 : hr < 0.76 ? 1 : hr < 0.9 ? 2 : 3];
          let t = 2 + (patch > 0.6 ? 1 : patch < 0.4 ? -1 : 0) + (rng() < 0.12 ? 1 : 0) - (rng() < 0.12 ? 1 : 0);
          if (Math.abs(yy - walkY + 2) < 9) t += 1; // the walked line is polished lighter
          t = LB.clamp(t, 1, 4);
          P.rect(x + 1, yy, w - 3, 1, ramp[t + 1]);
          P.rect(x, yy + 1, w - 1, 2, ramp[t]);
          P.px(x, yy + 1, ramp[t + 1]);
          P.rect(x + 1, yy + 3, w - 3, 1, ramp[t - 1]);
          if (wet && rng() < 0.45) P.px(x + 1 + Math.floor(rng() * (w - 3)), yy, ramp[5]);
          x += w;
        }
      }
      // moss in the joints at the foot of the walls and by the edge; a few sprouts where a stone is missing
      if (S.season !== 'winter') {
        const M = R(S.season === 'autumn' ? '#6a7034' : '#55803a', 4);
        for (let x = 0; x < W; x++) {
          if (LB.noise(x * 0.15, 2, 6) > 0.55) P.px(x, PAVE + 3, M[1]);
          if (LB.noise(x * 0.12, 5, 6) > 0.5) P.px(x, hgt - 2 - (x % 5 === 0 ? 1 : 0), M[(x % 3) ? 1 : 2]);
        }
        for (const [gx, gy] of [[22, 30], [196, 58], [358, 22], [470, 52]]) {
          P.blob(gx, gy, 3, '#5a4a3a', gx, 0.3, 0.6);
          P.px(gx - 1, gy - 1, M[2]); P.px(gx, gy - 2, M[3]); P.px(gx + 1, gy - 1, M[2]); P.px(gx + 2, gy, M[1]);
        }
      }
      if (S.season === 'autumn') {
        const LV = ['#d8802c', '#b8482a', '#e0a83a', '#8a5a2a'];
        for (let i = 0; i < 170; i++) {
          const near = rng() < 0.65;
          const x = rng() * W, y = near ? (rng() < 0.5 ? PAVE + 1 + rng() * 5 : hgt - 3 - rng() * 6) : PAVE + rng() * (hgt - PAVE);
          const c = LV[Math.floor(rng() * LV.length)];
          P.rect(x, y, 2, 1, c); if (rng() < 0.5) P.px(x + 1, y - 1, LB.shade(c, 0.3)); P.px(x, y + 1, LB.shade(c, -0.45));
        }
      }
      if (wet) { // puddles holding the sky
        for (const [px, py, rx, ry] of [[66, 40, 16, 3], [206, 54, 22, 4], [318, 30, 13, 3], [436, 50, 17, 3], [138, 22, 9, 2]]) {
          P.blob(px, py, rx, LB.mix(grout, '#20242e', 0.4), px, 0.2, ry / rx);
          P.blob(px, py, rx - 1, '#7f8ea6', px, 0.2, ry / rx);
          P.hline(px - rx + 4, px + rx - 6, py - ry + 1, '#aebcd0');
        }
      }
      if (S.snow > 0) {
        const full = S.snow >= 1;
        for (let x = 0; x < W; x++) for (let y = 0; y < hgt; y++) {
          const n = LB.fbm(x * 0.05, y * 0.11, 21, 3);
          const path = Math.abs(y - walkY + 3) < 8 + n * 5;
          if (full) {
            if (path) { if (n > 0.56) P.px(x, y, '#dde4f0'); else if (n > 0.5) P.px(x, y, '#b8c2d4'); }
            else P.px(x, y, n > 0.63 ? '#ffffff' : n < 0.36 ? '#d2dbec' : C.snow);
          } else if (!path && n > 0.53) P.px(x, y, n > 0.61 ? C.snow : '#e0e7f2');
        }
        if (full) for (let x = 6; x < W; x += 8) { const y = walkY - 4 + ((x / 8) % 2 ? 3 : 0); P.rect(x, y, 2, 1, '#9aa6be'); P.px(x, y - 1, '#c4ccdc'); }
      }
      return cv;
    });
  }

  function edge(S) {
    return LB.memo('lq-edge' + S.season + S.weather + S.snow, () => {
      const cv = LB.canvas(W, YW - COP + 4), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const rng = LB.rng(9), wet = S.weather === 'rain';
      const CP = R(wet ? LB.mix(C.coping, '#5a6070', 0.3) : C.coping, 5), WF = R(C.wallFace, 6, { shift: 16 });
      // coping: big dressed blocks, a light top and a front lip
      let x = -6;
      while (x < W) {
        const w = 18 + Math.floor(rng() * 14), t = 2 + (rng() < 0.3 ? 1 : 0) - (rng() < 0.2 ? 1 : 0);
        P.rect(x, 0, w - 1, 6, CP[t]); P.rect(x, 0, w - 1, 1, CP[t + 1]); P.rect(x, 5, w - 1, 1, CP[4]);
        P.rect(x + w - 1, 0, 1, 6, CP[0]);
        if (rng() < 0.4) P.rect(x + 3 + rng() * (w - 8), 2 + rng() * 2, 2, 1, CP[t - 1]);
        x += w;
      }
      // the wall face: two courses of saltstone, darker and wet near the water
      const fy = WALL - COP;
      P.rect(0, fy, W, YW - WALL, WF[1]);
      for (let c = 0; c < 2; c++) {
        let xx = -(c * 9);
        const y = fy + c * 7;
        while (xx < W) {
          const w = 14 + Math.floor(rng() * 12), t = 2 + (rng() < 0.3 ? 1 : 0) - (rng() < 0.25 ? 1 : 0) - c;
          P.rect(xx, y, w - 1, 6, WF[Math.max(0, t)]); P.rect(xx, y, w - 1, 1, WF[Math.max(0, t) + 1]);
          P.rect(xx + w - 1, y, 1, 7, WF[0]);
          xx += w;
        }
        P.rect(0, y + 6, W, 1, WF[0]);
      }
      // weed and barnacles at the tide line
      const weed = S.season === 'winter' ? '#3c5a50' : '#3f6a3a';
      for (let xx = 0; xx < W; xx++) {
        const h = Math.floor(LB.noise(xx * 0.3, 1, 2) * 4);
        for (let k = 0; k < h; k++) P.px(xx, YW - COP - 1 - k, k === h - 1 ? LB.shade(weed, 0.3) : weed);
        if (LB.hash(xx, 3, 4) < 0.08) P.px(xx, YW - COP - 5, '#c8ccc0');
      }
      P.rect(0, YW - COP - 1, W, 1, '#24302c');
      // mooring rings
      for (const rx of [100, 214, 330]) { P.rect(rx - 2, fy + 3, 5, 1, '#2a2830'); P.rect(rx - 2, fy + 6, 5, 1, '#2a2830'); P.px(rx - 3, fy + 4, '#2a2830'); P.px(rx - 3, fy + 5, '#2a2830'); P.px(rx + 3, fy + 4, '#4a4856'); P.px(rx + 3, fy + 5, '#2a2830'); }
      // the steps down to the water, cut into the wall (descending to the right)
      for (let i = 0; i < 6; i++) {
        const sx = 88 + i * 6, sy = 1 + i * 3;
        P.rect(sx, sy, 7, 2, CP[3]); P.rect(sx, sy + 2, 7, 2, WF[1]); P.rect(sx, sy, 7, 1, CP[4]);
        P.rect(sx + 7, sy, 1, YW - COP - sy, WF[0]);
      }
      P.rect(86, 0, 2, YW - COP, WF[0]);
      if (S.snow > 0) {
        for (let xx = 0; xx < W; xx++) {
          const d = S.snow >= 1 ? 4 + Math.round(LB.noise(xx * 0.2, 4, 5) * 2) : Math.round(LB.noise(xx * 0.15, 4, 5) * 4);
          if (d > 0) { P.rect(xx, 0, 1, Math.min(5, d), C.snow); if (d >= 4) P.px(xx, 5, '#e2eaf6'); }
        }
        for (let i = 0; i < 6; i++) P.rect(88 + i * 6, 1 + i * 3, 7, 1, C.snow);
      }
      return cv;
    });
  }

  // the ladder down the wall, into the water
  function ladder(P, x, top, bot) {
    for (const lx of [x, x + 6]) { P.rect(lx, top, 1, bot - top, '#2e2c36'); P.rect(lx + 1, top, 1, bot - top, '#4a4856'); }
    for (let y = top + 2; y < bot; y += 3) P.rect(x + 1, y, 5, 1, '#3a3842');
    P.rect(x - 1, top - 2, 2, 3, '#2e2c36'); P.rect(x + 6, top - 2, 2, 3, '#2e2c36');
  }

  // ---------- reflections ----------
  // rows above the waterline map below it: the quay wall upside down first, then (as you look further down) the
  // fronts of the houses and anything standing on the quay, each turned over about the ground it stands on.
  function buildReflection(S, houseLayer, edgeLayer) {
    const cv = LB.canvas(W, H), c = LB.ctx2d(cv);
    // the quay edge and wall, mirrored about the waterline
    c.save(); c.setTransform(1, 0, 0, -1, 0, 2 * YW); c.drawImage(groundEdgeCv, 0, COP, W, YW - COP, 0, COP, W, YW - COP); c.restore();
    // the houses, turned about their front walls and hung below the wall's reflection
    c.save(); c.setTransform(1, 0, 0, -1, 0, YW + WH + BASE); c.drawImage(houseLayer, 0, 0, W, BASE + 1, 0, 0, W, BASE + 1); c.restore();
    // posts and bollards on the edge, turned about the coping
    c.save(); c.setTransform(1, 0, 0, -1, 0, YW + WH + COP + 3); c.drawImage(edgeLayer, 0, 0, W, COP + 4, 0, 0, W, COP + 4); c.restore();
    c.globalCompositeOperation = 'destination-in'; c.drawImage(waterMask, 0, 0);
    return cv;
  }
  let groundEdgeCv = null;

  // ---------- light trails on the water ----------
  function lightSources(S) {
    const out = [];
    for (const L of layouts) {
      for (const w of L.windows) if (w.lit) out.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, base: BASE, k: w.ground ? 0.9 : 0.6, w: w.shop ? 3 : 2, seed: w.x });
      for (const l of L.lanterns) out.push({ x: l.x, y: l.y + 5, base: BASE, k: 1.3, w: 2, seed: l.x + 7 });
    }
    for (const p of POSTS) out.push({ x: p.x, y: COP + 3 - 37, base: COP + 3, k: 1.6, w: 2, seed: p.x + 3 });
    return out;
  }
  function drawTrails(ctx, S, strength) {
    if (strength < 0.02) return;
    const P = LB.paint(ctx);
    ctx.save();
    for (const s of lightSources(S)) {
      const my = YW + WH + (s.base - s.y);                // where the light itself sits, mirrored
      const len = 18 + s.k * 26, top = YW + 2, bot = Math.min(H, my + len);
      for (let y = top; y < bot; y++) {
        const d = y < my ? (my - y) / (my - top + 10) : (y - my) / len;
        let I = (1 - LB.clamp(d, 0, 1)) * s.k * strength;
        const brk = LB.noise(y * 0.5 + s.seed * 0.37, S.t * 0.9 + s.seed * 0.1, 31);
        if (brk < 0.46) continue;                          // broken into dashes that come and go
        I *= 0.45 + brk * 0.7;
        if (I < 0.06) continue;
        const jit = Math.round((LB.noise(y * 0.18, S.t * 0.6 + s.seed, 12) - 0.5) * (2 + (y - YW) / 30));
        const half = Math.max(0, Math.round((s.w - 1) * 0.5 + I * 2.6 * (0.5 + brk)));
        ctx.globalAlpha = LB.clamp(I * 1.1, 0, 1);
        P.rect(Math.round(s.x) - half + jit, y, half * 2 + 1, 1, I > 0.8 ? '#fff3c4' : I > 0.4 ? C.glow : C.glow2);
      }
    }
    ctx.restore();
  }

  // ---------- the scene ----------
  LB.add({
    id: 'lumar', order: 30, section: 'place', world: 'Lumar', name: 'Lantern Quay',
    blurb: 'Lumar’s harbour as a place you’d stop and look at. Tall timber houses lean over a cobbled quay, boats ride in green water, and the whole town hangs upside down in the harbour, rocking with the waves.',
    see: [
      'The houses, boats and lamps mirrored in the water, wobbling as the water moves',
      'After dark, every lantern and lit window streaks down the water in broken, shimmering lines',
      'Shadows across the quay that swing and stretch with the sun',
      'Snow on the roofs and coping in winter, leaves blown against the walls in autumn, puddles in the rain',
      'Small life: smoke from the chimneys, gulls, a sailor walking, someone fishing off the edge',
    ],
    build: 'The houses and boats are ordinary scene art; the new parts are engine effects we would add once and use on every harbour: a mirrored pass for reflections, light trails from every lamp, and foam where water meets stone. The effects are built once, then each harbour picks them up as it is re-drawn.',
    now: 'lumar.png',
    w: W, h: H,
    clouds: { alpha: 0.16, speed: 4 },
    init(S) {
      layouts = HOUSES.map(layoutHouse);
      waterMask = LB.canvas(W, H);
      LB.ctx2d(waterMask).fillStyle = '#fff'; LB.ctx2d(waterMask).fillRect(0, YW, W, H - YW);
      glintPts = LB.maskPoints(waterMask, 170, 41);
      ringPts = LB.maskPoints(waterMask, 70, 42);
      const r = LB.rng(43);
      wavePts = [];
      for (let i = 0; i < 300; i++) {
        const f = Math.pow(r(), 0.8), y = Math.round(YW + 3 + f * (H - YW - 3));
        wavePts.push({ x: r() * W, y, len: Math.round(2 + f * 6 + r() * 3), ph: r() * 6.28, sp: 0.7 + r() * 1.2, dark: r() < 0.4 });
      }
      floes = [];
      for (let i = 0; i < 18; i++) floes.push({ x: r() * W, y: YW + 2 + r() * 16, w: 6 + r() * 14, h: 2 + r() * 2, ph: r() * 6 });
    },
    ground(ctx, S, P) {
      backdrop(P, S);
      ctx.drawImage(cobbles(S), 0, BASE - 2);
      groundEdgeCv = groundEdgeCv || LB.canvas(W, H);
      const ge = LB.ctx2d(groundEdgeCv); ge.clearRect(0, 0, W, H);
      ge.drawImage(edge(S), 0, COP);
      ladder(LB.paint(ge), 424, COP + 1, YW);
      ctx.drawImage(groundEdgeCv, 0, 0);
      P.rect(0, YW, W, H - YW, C.seaDeep);
    },
    shadows(sh, S) {
      for (const L of layouts) {
        const spr = houseSprite(L, S);
        sh.cast(spr, L.sx + spr.width / 2, BASE + 1, spr.width / 2, BASE + 1 - L.sy, { k: 0.34 });
      }
      for (const p of POSTS) sh.pole(p.x, COP + 3, 40, 2);
      for (const b of BOLLARDS) sh.blob(b.x + 2, COP + 3, 5, 2);
      for (const [x, y] of [[252, 122], [236, 125], [268, 127], [222, 130], [24, 110], [66, 122], [118, 121]]) sh.blob(x + 3, y, 8, 3);
      sh.cast(cartSpr(S.season, S.snow >= 1), 190, 129, null, null, { k: 0.5 });
      sh.cast(netRack(S.season, S.snow), 448, 118, 25, 30, { k: 0.6 });
    },
    water(ctx, S, P) {
      const L = S.L, key = 'lq-wb' + S.season + S.weather + Math.round(S.time * 4);
      const base = LB.memo(key, () => {
        const cv = LB.canvas(W, H), c = LB.ctx2d(cv), Q = LB.paint(c);
        const deep = S.season === 'winter' ? '#1c4a48' : C.seaDeep;
        // far water (up by the wall) mirrors the horizon; nearer water mirrors the sky overhead and shows its own green
        const col = (f) => {
          const sky = LB.mix(L.skyHor, LB.mix(L.skyTop, '#8a78e0', 0.55 * L.golden), Math.min(1, f * 1.1));
          const own = LB.mix(C.sea, deep, f);
          return LB.mix(own, sky, (0.72 - 0.38 * f) * L.day + 0.08);
        };
        for (let y = YW; y < H; y++) {
          const f = (y - YW) / (H - YW);
          const band = Math.floor(f * 6) / 6, next = Math.min(1, band + 1 / 6);
          const cA = col(band), cB = col(next);
          const frac = (f - band) * 6;
          for (let x = 0; x < W; x++) Q.px(x, y, frac > 0.75 && LB.bayer(x, y) < (frac - 0.75) * 4 ? cB : cA);
        }
        // the wall's own shadow on the water just below it
        c.globalAlpha = 0.45; Q.rect(0, YW, W, 3, '#0e2420'); c.globalAlpha = 0.25; Q.rect(0, YW + 3, W, 2, '#0e2420');
        return cv;
      });
      ctx.drawImage(base, 0, 0);
      // the town upside down
      const rk = S.season + S.snow + Math.round(S.time * 4);
      if (rk !== reflKey || !reflStatic) { reflKey = rk; reflStatic = buildReflection(S, houseLayerCv, edgeLayerCv); }
      const comp = LB.memo('lq-refl-comp', () => LB.canvas(W, H)), cc = LB.ctx2d(comp);
      cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalCompositeOperation = 'source-over'; cc.clearRect(0, 0, W, H);
      cc.drawImage(reflStatic, 0, 0);
      // boats turned over about their own waterlines
      for (const b of BOATS) {
        const spr = b.spr(S.snow >= 1), wl = b.wl + bob(b, S.t);
        cc.setTransform(1, 0, 0, -1, 0, 2 * wl); cc.drawImage(spr, b.x, wl - spr.height + 1); cc.setTransform(1, 0, 0, 1, 0, 0);
      }
      // the people on the edge
      cc.setTransform(1, 0, 0, -1, 0, YW + WH + COP + 4); LB.person(cc, FISHER.x, COP + 4, 'fisher', { sit: true, dir: 'down', t: S.t }); cc.setTransform(1, 0, 0, 1, 0, 0);
      cc.globalCompositeOperation = 'source-atop'; cc.globalAlpha = 0.32;
      cc.fillStyle = LB.mix(C.seaDeep, LB.mix(L.skyHor, L.skyTop, 0.4), 0.3 + 0.4 * L.golden * L.day); cc.fillRect(0, YW, W, H - YW);
      cc.globalAlpha = 1;
      cc.globalCompositeOperation = 'destination-in'; cc.drawImage(waterMask, 0, 0); cc.globalCompositeOperation = 'source-over';
      LB.ripple(ctx, comp, waterMask, S, { amp: 2, freq: 0.55, speed: 1.8, alpha: 0.46 - 0.14 * L.golden - 0.12 * L.night, y0: YW, grow: true });
      // the water's own surface: short crests and troughs drifting and catching the light
      const hi = LB.mix(LB.mix(L.skyHor, L.skyTop, 0.3), '#ffffff', 0.3), lo = LB.mix(C.seaDeep, '#0a1a20', 0.4);
      const calm = S.weather === 'fog' ? 0.6 : 1;
      for (const w of wavePts) {
        const a = Math.sin(S.t * w.sp + w.ph);
        if (a < 0.25) continue;
        const x = Math.round(w.x + Math.sin(S.t * 0.4 + w.ph) * 3);
        ctx.globalAlpha = (a - 0.25) * (w.dark ? 0.8 : 0.7 * (0.4 + 0.6 * L.day)) * calm;
        P.rect(x, w.y, w.len, 1, w.dark ? lo : hi);
      }
      ctx.globalAlpha = 1;
      // ice along the wall in winter
      if (S.season === 'winter') {
        for (const f of floes) {
          const x = Math.round(f.x + Math.sin(S.t * 0.3 + f.ph) * 2), y = Math.round(f.y);
          P.ellipse(x, y, f.w / 2, f.h / 2, '#a9bccc'); P.ellipse(x, y - 1, f.w / 2 - 1, Math.max(1, f.h / 2 - 1), '#dce8f2');
        }
      }
      // foam where the water slaps the wall
      for (let x = 0; x < W; x++) {
        const n = LB.noise(x * 0.22, S.t * 0.9, 17);
        if (n > 0.42) P.px(x, YW, C.foam);
        if (n > 0.62) P.px(x, YW + 1, LB.mix(C.foam, C.sea, 0.35));
        if (n > 0.8 && (x % 3 === 0)) P.px(x, YW + 2 + Math.round(LB.noise(x, S.t, 2) * 2), LB.mix(C.foam, C.sea, 0.5));
      }
      LB.glints(ctx, glintPts, S, { rate: 1.6 });
      if (S.weather === 'rain') LB.rings(ctx, ringPts, S, { period: 1.1, r: 4, alpha: 0.6 });
    },
    objects(ctx, S, P) {
      // houses, back to front, into their own layer too (for the reflection)
      houseLayerCv = houseLayerCv || LB.canvas(W, H);
      const hc = LB.ctx2d(houseLayerCv); hc.clearRect(0, 0, W, H);
      for (const L of layouts) hc.drawImage(houseSprite(L, S), L.sx, L.sy);
      // bracket lanterns on the houses
      const lan = lanternSpr(), HP = LB.paint(hc);
      for (const L of layouts) for (const l of L.lanterns) {
        HP.rect(l.x - (l.x < L.cx ? -1 : 4), l.y - 3, 4, 1, '#2e2c36');
        hc.drawImage(lan, l.x - 4, l.y - 2);
      }
      // washing across two alleys
      const cloth = S.season === 'winter' ? [] : ['#e8e4d8', '#c85a4a', '#5a7ab0', '#e8c860', '#ffffff'];
      for (const [x0, x1, y] of [[58, 76, 44], [400, 420, 40]]) {
        HP.line(x0, y, x1, y + 2, '#5a5048');
        for (let i = 0; i < cloth.length && x0 + 2 + i * 4 < x1 - 2; i++) HP.rect(x0 + 2 + i * 4, y + 1 + Math.round(i * 0.4), 3, 4 + (i % 2), cloth[(i + x0) % cloth.length]);
      }
      ctx.drawImage(houseLayerCv, 0, 0);
      // things on the quay, back to front
      const sn = S.snow >= 1;
      const props = [
        { y: 110, f: () => LB.blit(ctx, basketSpr(S.season), 24, 110) },
        { y: 112, f: () => LB.blit(ctx, basketSpr(S.season), 40, 113) },
        { y: 118, f: () => LB.blit(ctx, netRack(S.season, sn), 448, 118) },
        { y: 122, f: () => LB.blit(ctx, crateSpr(sn), 252, 122) },
        { y: 123, f: () => LB.blit(ctx, crateSpr(sn), 252, 111) },
        { y: 124, f: () => LB.blit(ctx, barrelSpr(sn), 236, 125) },
        { y: 127, f: () => LB.blit(ctx, crateSpr(sn), 268, 127) },
        { y: 129, f: () => LB.blit(ctx, barrelSpr(sn), 222, 130) },
        { y: 120, f: () => LB.blit(ctx, benchSpr(sn), 118, 121) },
        { y: 119, f: () => LB.blit(ctx, tubSpr(S.season, sn), 98, 119) },
        { y: 119, f: () => LB.blit(ctx, tubSpr(S.season, sn), 140, 119) },
        { y: 121, f: () => LB.blit(ctx, potsSpr(sn), 66, 122) },
        { y: 128, f: () => LB.blit(ctx, cartSpr(S.season, sn), 190, 129) },
        { y: 160, f: () => LB.blit(ctx, ropeSpr(), 286, 162) },
        { y: 165, f: () => LB.blit(ctx, anchorSpr(sn), 334, 167) },
      ].sort((a, b) => a.y - b.y);
      for (const p of props) p.f();
      for (const [x, y] of [[24, 110], [40, 113], [252, 122], [236, 125], [268, 127], [222, 130], [66, 122], [190, 129], [118, 121], [334, 167]]) LB.contact(ctx, x, y, 8, 1, 0.22);
      // the edge things, in their own layer for the reflection
      edgeLayerCv = edgeLayerCv || LB.canvas(W, H);
      const ec = LB.ctx2d(edgeLayerCv); ec.clearRect(0, 0, W, H);
      for (const b of BOLLARDS) LB.blit(ec, bollardSpr(sn), b.x, COP + 4);
      for (const p of POSTS) LB.blit(ec, postSpr(sn), p.x, COP + 4);
      ctx.drawImage(edgeLayerCv, 0, 0);
      reflKey = '';
    },
    live(ctx, S, P) {
      const t = S.t, L = S.L;
      // chimney smoke drifting east
      for (const Lh of layouts) for (const c of Lh.chims) {
        for (let i = 0; i < 6; i++) {
          const p = ((t * 0.18 + i / 6 + c.x * 0.013) % 1);
          const x = c.x - 1 + p * 22 + Math.sin(t * 0.8 + i + c.x) * 1.5, y = c.top - 6 - p * 34;
          ctx.globalAlpha = (1 - p) * 0.55;
          P.disc(x, y, 1 + p * 4, LB.mix('#e6e8ee', '#9aa0b0', p));
        }
      }
      ctx.globalAlpha = 1;
      // the inn sign swinging
      const inn = layouts[1];
      if (inn.sign) {
        const sx = inn.sign.x, sy = inn.sign.y, sw = Math.round(Math.sin(t * 1.4) * 1.2);
        P.rect(sx - 1, sy, 14, 2, '#2e2c36'); P.rect(sx + 12, sy - 3, 2, 5, '#2e2c36');
        P.px(sx + 2, sy + 2, '#2e2c36'); P.px(sx + 9, sy + 2, '#2e2c36');
        const bx = sx + sw, by = sy + 4;
        P.rect(bx, by, 13, 10, '#2c4a3a'); P.rect(bx, by, 13, 1, '#c8a040'); P.rect(bx, by + 9, 13, 1, '#7a5a24');
        P.rect(bx, by, 1, 10, '#7a5a24'); P.rect(bx + 12, by, 1, 10, '#7a5a24');
        // a gold fish on it
        P.rect(bx + 3, by + 4, 5, 2, '#e0c060'); P.px(bx + 8, by + 3, '#e0c060'); P.px(bx + 8, by + 6, '#e0c060'); P.px(bx + 4, by + 4, '#2c4a3a');
        if (S.snow >= 1) P.rect(bx, by - 1, 13, 1, C.snow);
      }
      // the boats bobbing, and their mooring lines
      boatMask = boatMask || LB.canvas(W, H);
      const bm = LB.ctx2d(boatMask); bm.clearRect(0, 0, W, H);
      for (const b of BOATS) {
        const spr = b.spr(S.snow >= 1), wl = b.wl + bob(b, t);
        ctx.drawImage(spr, b.x, wl - spr.height + 1);
        bm.drawImage(LB.silhouette(spr, '#fff'), b.x, wl - spr.height + 1);
        if (b.rig) rigging(ctx, b.x, wl - spr.height + 1, spr.height);
        // foam lapping at the waterline
        for (let x = b.x + 6; x < b.x + spr.width - 6; x += 1) if (LB.noise(x * 0.3, t * 1.2, 5) > 0.6) P.px(x, wl + 1, C.foam);
      }
      const line = (x0, y0, x1, y1, sag) => {
        let px = x0, py = y0;
        for (let i = 1; i <= 8; i++) {
          const k = i / 8, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
          P.line(px, py, x, y, '#5a4a3a'); px = x; py = y;
        }
      };
      line(BOLLARDS[1].x, COP - 4, 276, 240 - 14 + bob(BOATS[0], t), 6);
      line(BOLLARDS[0].x, COP - 4, 34, 254 - 8 + bob(BOATS[2], t), 8);
      line(100, WALL + 4, 136, 212 - 8 + bob(BOATS[1], t), 4);
      // a gull on the far bollard, two more wheeling over (by day, not in rain)
      if (L.night < 0.5) {
        const gx = BOLLARDS[2].x, gy = COP - 6;
        P.rect(gx - 3, gy - 3, 7, 3, '#f2f2f4'); P.rect(gx - 3, gy - 2, 4, 1, '#9aa0aa'); P.px(gx + 3, gy - 5, '#f2f2f4'); P.rect(gx + 3, gy - 6, 2, 2, '#f2f2f4'); P.px(gx + 5, gy - 5, '#e0a020');
        P.px(gx - 1, gy, '#e0a020'); P.px(gx + 1, gy, '#e0a020');
        if (S.weather !== 'rain') for (let i = 0; i < 2; i++) {
          const a = t * 0.35 + i * 2.6, x = 240 + Math.cos(a) * (150 + i * 40), y = 150 + Math.sin(a) * 40 + i * 20;
          const flap = Math.sin(t * 6 + i) > 0;
          P.px(x, y, '#f4f4f6'); P.px(x - 1, y - (flap ? 1 : 0), '#f4f4f6'); P.px(x + 1, y - (flap ? 1 : 0), '#f4f4f6');
          P.px(x - 2, y - (flap ? 2 : 0), '#7a8090'); P.px(x + 2, y - (flap ? 2 : 0), '#7a8090');
          ctx.globalAlpha = 0.25; P.rect(x + 18, y + 40, 3, 1, '#20283c'); ctx.globalAlpha = 1;
        }
      }
      // spring bunting between the lamp posts
      if (S.season === 'spring') {
        const x0 = POSTS[0].x, x1 = POSTS[1].x, y0 = COP - 38;
        const cols = ['#e05050', '#f0d050', '#5090e0', '#f4f0e8', '#60b060'];
        let i = 0;
        for (let x = x0 + 2; x < x1 - 2; x++) {
          const k = (x - x0) / (x1 - x0), y = Math.round(y0 + Math.sin(k * Math.PI) * 12);
          P.px(x, y, '#3a3440');
          if ((x - x0) % 9 === 3) {
            const c = cols[i++ % cols.length], fl = Math.round(Math.sin(t * 3 + x) * 0.6);
            P.rect(x - 2, y + 1, 5, 2, c); P.rect(x - 1 + fl, y + 3, 3, 1, c); P.px(x + fl, y + 4, c);
          }
        }
      }
      // the sailor walking the quay, the fisher on the edge
      const span = 380, ph = ((t * 13) % (span * 2));
      const right = ph < span, sxp = 40 + (right ? ph : span * 2 - ph);
      LB.contact(ctx, sxp, WALK, 6, 1, 0.25);
      LB.person(ctx, Math.round(sxp), WALK, 'sailor', { walk: true, dir: right ? 'right' : 'left', t, seed: 2 });
      LB.person(ctx, FISHER.x, COP + 4, 'fisher', { sit: true, dir: 'down', t, seed: 5 });
      if (edgeLayerCv) ctx.drawImage(edgeLayerCv, 0, 0);
      // the rod and its line into the water, a float bobbing
      const fy = YW + 22 + Math.round(Math.sin(t * 1.3) * 1);
      ctx.globalAlpha = 0.55; P.line(FISHER.x + 19, COP - 50, FISHER.x + 30, fy - 1, '#e8eef2'); ctx.globalAlpha = 1;
      P.rect(FISHER.x + 30, fy - 1, 2, 2, '#e04040'); P.px(FISHER.x + 30, fy - 2, '#f4f4f4');
      if (S.weather === 'fog') { ctx.save(); ctx.beginPath(); ctx.rect(0, YW - 14, W, H); ctx.clip(); LB.fog(ctx, S, 0.32); ctx.restore(); }
      // autumn leaves blowing along
      if (S.season === 'autumn') LB.motes(ctx, S, { n: 14, fall: 18, y: 40, h: 140, colors: ['#e0902c', '#c04a2a', '#e8b840'], seed: 3 });
      if (S.season === 'spring' && S.weather === 'clear') LB.motes(ctx, S, { n: 8, fall: 10, y: 60, h: 120, colors: ['#ffd0e0', '#ffffff'], seed: 4 });
    },
    emissive(ctx, S, P) {
      const L = S.L, nf = LB.smooth(0.06, 0.5, L.night);
      const main = !/bloom/.test(ctx.canvas.className);
      // the sky's glow on the water at sunrise and sunset: reflected sky is brighter than anything lit by it
      const glow = Math.max(L.golden * 0.9, 0) * (S.weather === 'clear' ? 1 : 0.35);
      if (main && glow > 0.05) {
        const sh = LB.memo('lq-sheen', () => LB.canvas(W, H)), sc = LB.ctx2d(sh), Q = LB.paint(sc);
        sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'; sc.globalAlpha = 1; sc.clearRect(0, 0, W, H);
        for (let y = YW + 1; y < H; y++) {
          const f = (y - YW) / (H - YW), band = Math.floor(f * 5) / 5;
          sc.globalAlpha = (0.32 - 0.22 * band) * glow;
          Q.rect(0, y, W, 1, LB.mix(L.skyHor, '#b08ae8', Math.min(1, band * 1.3)));
        }
        sc.globalAlpha = 1;
        if (boatMask) { sc.globalCompositeOperation = 'destination-out'; sc.drawImage(boatMask, 0, 0); }
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(sh, 0, 0); ctx.restore();
      }
      // sunset caught in the glass
      if (L.golden > 0.1 && nf < 0.6) {
        ctx.save(); ctx.globalAlpha = 0.45 * L.golden * (1 - nf);
        for (const Lh of layouts) for (const w of Lh.windows) if (!w.loft) P.rect(w.x, w.y, w.w, Math.max(1, Math.floor(w.h / 3)), '#ffc890');
        ctx.restore();
      }
      if (L.golden > 0.15 && L.day > 0.5 && S.weather === 'clear') {
        ctx.save();
        for (const [x, y, ph] of glintPts) {
          const side = 1 - x / W;                       // the sun is low in the west: the glitter gathers on its side
          const v = Math.sin(S.t * (1.4 + ph) + ph * 50);
          if (v < 1 - 0.2 * side * L.golden) continue;
          ctx.globalAlpha = L.golden * (0.5 + 0.5 * side);
          P.px(x, y, '#ffe6a8'); if (v > 0.995) { P.px(x - 1, y, '#ffd080'); P.px(x + 1, y, '#ffd080'); }
        }
        ctx.restore();
      }
      if (nf < 0.02) return;
      ctx.save();
      for (const Lh of layouts) for (const w of Lh.windows) {
        if (!w.lit || w.loft) continue;
        let a = nf;
        if (w.flick) a *= 0.8 + 0.2 * LB.noise(S.t * 3, w.x, 2);
        ctx.globalAlpha = a;
        P.rect(w.x, w.y, w.w, w.h, C.glow2);
        P.rect(w.x, w.y, w.w, Math.ceil(w.h * 0.55), C.glow);
        P.rect(w.x + 1, w.y + 1, 2, 1, '#fff6d0');
        // the mullions stay dark against the light
        const panes = w.panes || 2;
        for (let i = 1; i < panes; i++) P.rect(Math.round(w.x + (w.w * i) / panes), w.y, 1, w.h, '#3a2410');
        P.rect(w.x, Math.round(w.y + w.h / 2), w.w, 1, '#3a2410');
        if (w.shop || w.fish) { // goods in silhouette
          for (let x = w.x + 2; x < w.x + w.w - 2; x += 4) P.rect(x, w.y + w.h - 3 - (x % 3), 3, 3 + (x % 3), '#5a3a1a');
        }
      }
      // flames
      for (const Lh of layouts) for (const l of Lh.lanterns) { ctx.globalAlpha = nf; P.rect(l.x - 1, l.y + 2, 3, 4, C.glow); P.px(l.x, l.y + 3, '#fff8e0'); }
      for (const p of POSTS) { ctx.globalAlpha = nf; P.rect(p.x - 2, COP + 4 - 40, 4, 5, C.glow); P.rect(p.x - 1, COP + 4 - 39, 2, 2, '#fff8e0'); }
      ctx.restore();
      // the light running down the water, hidden behind the boats
      const tmp = LB.memo('lq-trails', () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1; tc.clearRect(0, 0, W, H);
      drawTrails(tc, S, nf * (S.weather === 'fog' ? 0.6 : 1));
      if (boatMask) { tc.globalCompositeOperation = 'destination-out'; tc.drawImage(boatMask, 0, 0); tc.globalCompositeOperation = 'source-over'; }
      ctx.drawImage(tmp, 0, 0);
      // moths round the lamps
      if (S.season !== 'winter' && S.weather !== 'rain') {
        ctx.save(); ctx.globalAlpha = nf * 0.8;
        for (const p of POSTS) for (let i = 0; i < 3; i++) {
          const a = S.t * (2 + i) + i * 2, x = p.x + Math.cos(a) * (6 + i * 2), y = COP + 4 - 38 + Math.sin(a * 1.3) * (4 + i);
          P.px(x, y, '#fff4d0');
        }
        ctx.restore();
      }
    },
    lights(S) {
      const out = [];
      const k = S.finish === 'clean' ? 0.6 : 1;
      for (const Lh of layouts) {
        for (const l of Lh.lanterns) out.push({ x: l.x, y: l.y + 4, r: 48, c: '#ffb050', flicker: 1, sq: 0.8, i: 1.3 });
        for (const w of Lh.windows) if (w.lit && w.ground) out.push({ x: w.x + w.w / 2, y: BASE + 8, r: w.shop ? 38 : 26, c: '#ffc068', sq: 0.45, i: 1.2 });
        for (const w of Lh.windows) if (w.lit && !w.ground && !w.loft) out.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 14, c: '#ffc068', i: 0.6 });
      }
      for (const p of POSTS) out.push({ x: p.x, y: COP + 4 - 36, r: 64, c: '#ffb050', flicker: 1, sq: 0.85, i: 1.5 });
      for (const p of POSTS) out.push({ x: p.x, y: COP - 2, r: 34, c: '#ffb860', sq: 0.4, i: 1.1 }); // its pool on the cobbles
      for (const p of POSTS) out.push({ x: p.x, y: YW + WH + 37, r: 30, c: '#ffa040', i: 0.5, sq: 1.6 }); // its glow on the water
      for (const o of out) o.i = (o.i == null ? 1 : o.i) * k;
      return out;
    },
  });
  const FISHER = { x: 214 };
  let houseLayerCv = null, edgeLayerCv = null, boatMask = null;
})();
