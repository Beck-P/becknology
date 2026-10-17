// Hoarfell — Fellhaven Tarn: a mountain tarn half frozen under the Hoarspire's foothills. Open water under a frozen
// waterfall mirrors the cliff and the firs; the rest is ice with cracks, wind-blown snow and a swept rink. Two log
// chalets, a lantern path, a skater, a skier, an ice fisher. Alpenglow at dawn and dusk, an aurora on clear nights.
(function () {
  'use strict';
  const W = 480, H = 270;

  // ---------- palette (daylight; the grade does dusk and night) ----------
  const SN = { deep: '#7c84bc', shade: '#97a1d2', mid: '#b9c3e2', base: '#dbe3f0', lit: '#ecf0f7', hi: '#fafbfe' };
  const SNOW_ALL = [SN.deep, SN.shade, SN.mid, SN.base, SN.lit, SN.hi];
  const PATH = { edge: '#94a2c2', base: '#b2bed6', light: '#c4cee2', print: '#8a98b8' };
  const ICE = { deep: '#5a80b8', dark: '#78a6d8', base: '#a4c8ec', light: '#c2dcf4', hi: '#e2eefb' };
  const RINK = ['#6c98d0', '#7ca8da', '#8eb8e4'];
  const ROCK = ['#3c4252', '#4e5668', '#5c6476', '#6a7284', '#7c8496', '#8e96a8'];
  const FIR = ['#10221c', '#172d26', '#1f3c32', '#2a4c3e', '#38604e'];
  const WOOD = ['#2e1a0c', '#4a2a16', '#6a4024', '#7e4c2a', '#9a6a3e', '#b8865a'];
  const RED = ['#4a1814', '#6a2620', '#843228', '#a2463a'];
  const ICICLE = ['#6aa6cc', '#8ec4e2', '#bfe4f4', '#eef9ff'];
  const LOGEND = ['#7a5232', '#a87a4e', '#c89c6c', '#ddb886'];

  // ---------- layout ----------
  // the tarn: a main ellipse and a lobe reaching up under the frozen falls
  function lakeF(x, y) {
    const dx = (x - 300) / 142, dy = (y - 152) / 62;
    const a = Math.atan2(dy, dx);
    const wob = (LB.noise(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3, 41) - 0.5) * 0.28 + (LB.noise(Math.cos(a) * 5 + 9, Math.sin(a) * 5 + 9, 42) - 0.5) * 0.1;
    const f1 = (dx * dx + dy * dy) / ((1 + wob) * (1 + wob));
    const ex = (x - 236) / 86, ey = (y - 106) / 27;
    const b = Math.atan2(ey, ex);
    const wob2 = (LB.noise(Math.cos(b) * 3 + 1, Math.sin(b) * 3 + 1, 43) - 0.5) * 0.3;
    const f2 = (ex * ex + ey * ey) / ((1 + wob2) * (1 + wob2));
    return Math.min(f1, f2);
  }
  // open water: the part the falls' inflow keeps from freezing
  function openF(x, y) {
    const ex = (x - 236) / 98, ey = (y - 104) / 30;
    const n = (LB.fbm(x * 0.045, y * 0.07, 47, 3) - 0.5) * 0.7;
    return ex * ex + ey * ey + n;
  }
  const RINKC = { x: 334, y: 176, rx: 50, ry: 21 };
  const rinkF = (x, y) => ((x - RINKC.x) / RINKC.rx) ** 2 + ((y - RINKC.y) / RINKC.ry) ** 2;
  const HOLE = { x: 398, y: 128 };
  // the lantern path from the big chalet's door, along the shore to the rink and on to the cabin
  const PATHPTS = [[72, 170], [84, 188], [104, 206], [132, 224], [170, 238], [214, 244], [262, 242], [300, 232], [326, 214], [344, 206],
    [326, 214], [356, 226], [392, 236], [414, 250], [420, 266]];
  const PATH_MAIN = PATHPTS.slice(0, 10), PATH_CABIN = PATHPTS.slice(10);
  // the mountaineer's trail up the slope at the top right
  const TRAIL = [[372, 84], [386, 64], [376, 46], [394, 28], [384, 10], [396, -6]];

  function segDist(px, py, pts) {
    let best = 1e9, bt = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      let t = ((px - ax) * vx + (py - ay) * vy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(px - ax - vx * t, py - ay - vy * t);
      if (d < best) { best = d; bt = i + t; }
    }
    return [best, bt];
  }
  // a point along a polyline at distance s
  function along(pts, s) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay);
      if (s <= l) return [ax + ((bx - ax) * s) / l, ay + ((by - ay) * s) / l, bx - ax, by - ay];
      s -= l;
    }
    const n = pts.length - 1;
    return [pts[n][0], pts[n][1], pts[n][0] - pts[n - 1][0], pts[n][1] - pts[n - 1][1]];
  }
  const plen = (pts) => { let l = 0; for (let i = 0; i + 1 < pts.length; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return l; };

  // ---------- sprites ----------
  // A fir with snow lying on every tier's shelf. Lit from the upper left. Upper tiers hang over lower ones, so each
  // tier shows its snowy shelf and a fringe of drooping green tips below it.
  function pine(w, h, seed) {
    return LB.sprite('hf-pine-' + w + 'x' + h + '-' + seed, w + 4, h + 3, (P) => {
      const r = LB.rng(seed);
      const cx = Math.floor((w + 4) / 2), base = h + 2;
      const tw = Math.max(3, Math.round(w / 10)), trunkH = 6;
      P.rect(cx - Math.floor(tw / 2), base - trunkH, tw, trunkH, WOOD[2]);
      P.rect(cx - Math.floor(tw / 2), base - trunkH, 1, trunkH, WOOD[4]);
      P.rect(cx + Math.ceil(tw / 2) - 1, base - trunkH, 1, trunkH, WOOD[1]);
      const tiers = h > 70 ? 6 : h > 52 ? 5 : 4;
      const top = 1, bot = base - trunkH + 1, span = bot - top;
      for (let i = tiers - 1; i >= 0; i--) {
        const bY = top + Math.round((span * (i + 1)) / tiers);
        const tierH = Math.round((span / tiers) * (i === 0 ? 1.4 : 1.9));
        const aY = Math.max(top, bY - tierH);
        const halfW = (w / 2) * (0.28 + (0.72 * (i + 1)) / tiers) + r.range(-0.6, 0.6);
        const ph = r() * 10;
        const snowTop = i === 0 ? aY : aY + tierH * 0.3;
        for (let y = aY; y <= bY + 2; y++) {
          const f = (y - aY) / Math.max(1, bY - aY);
          const hwRow = Math.max(0.5, halfW * Math.pow(Math.min(1, f), 0.75)) + (LB.hash(y, i, seed) < 0.3 ? 1 : 0);
          for (let x = -Math.ceil(hwRow); x <= Math.ceil(hwRow); x++) {
            if (Math.abs(x) > hwRow) continue;
            const tip = Math.round(2.6 * Math.pow(0.5 + 0.5 * Math.cos(x * 1.2 + ph), 2));
            if (y > bY - 2 + tip) continue;
            const u = x / Math.max(1, hwRow);
            // the snow shelf's lower edge: lumpy clumps, lifting toward the tips
            const snowBot = bY - 3 - Math.round(2.2 * LB.noise(x * 0.45 + ph, i * 3, seed)) - (Math.abs(u) > 0.8 ? 2 : 0);
            let c;
            if (y >= snowTop && y < snowBot) {
              c = u < -0.5 ? SN.hi : u < -0.1 ? SN.lit : u < 0.35 ? SN.base : u < 0.7 ? SN.mid : SN.shade;
              if (y >= snowBot - 1) c = u < -0.2 ? SN.base : u < 0.4 ? SN.mid : SN.shade; // the clumps' rounded undersides
              if (y < snowTop + 1 && i > 0) c = u < 0.2 ? SN.lit : SN.mid;
            } else if (y >= snowBot && y < snowBot + 1) {
              c = FIR[0];
            } else {
              const stripe = (Math.floor(y + Math.abs(x) * 0.7) + i) % 4 === 0;
              let k = u < -0.4 ? 3 : u < 0.25 ? 2 : u < 0.7 ? 1 : 0;
              if (y > bY - 2 + tip - 1) k = Math.max(0, k - 1);
              if (stripe) k = Math.max(0, k - 1);
              c = FIR[k];
            }
            P.px(cx + x, y, c);
          }
        }
      }
      P.px(cx, 0, FIR[1]); P.px(cx, 1, SN.hi);
    }, { outline: '#14282a' });
  }

  // A crag: a few rock peaks shouldering together under snow. Each flank is lit or shaded by which way it faces
  // (left flanks catch the light), strata run across with a tilt, snow lies thick where it's flat and thin where steep.
  // o: {n peaks, cap (snow), band, jag, snowBase}
  function crag(key, w, h, seed, o) {
    o = o || {};
    return LB.memo('hf-crag-' + key, () => {
      const cv = LB.canvas(w + 2, h + 2), P = LB.paint(LB.ctx2d(cv));
      const r = LB.rng(seed), n = o.n || 3;
      const peaks = [];
      for (let i = 0; i < n; i++) {
        peaks.push({ cx: (w * (i + 0.5)) / n + r.range(-w / (5 * n), w / (5 * n)), hw: (w / n) * r.range(0.95, 1.35),
          mh: h * (i === Math.floor(n / 2) ? 1 : r.range(0.6, 0.88)), s: seed + i * 31 });
      }
      const top = new Float32Array(w);
      for (let x = 0; x < w; x++) {
        let best = Infinity;
        for (const m of peaks) {
          const u = Math.abs(x - m.cx) / m.hw;
          if (u >= 1) continue;
          const prof = Math.pow(1 - u, 0.75);
          best = Math.min(best, h - m.mh * prof + (LB.fbm(x * 0.13, m.s * 0.1, m.s, 2) - 0.5) * (o.jag || 8) * Math.min(1, prof * 2));
        }
        top[x] = best;
      }
      const slope = (x) => { const a = top[Math.max(0, x - 3)], b = top[Math.min(w - 1, x + 3)]; return (isFinite(a) && isFinite(b)) ? (b - a) / 6 : 0; };
      const tilt = r.range(-0.12, 0.12), band = o.band || 5;
      for (let x = 0; x < w; x++) {
        if (!isFinite(top[x])) continue;
        const t = Math.round(top[x]), d = slope(x);
        const facet = d < -0.35 ? 1 : d > 0.35 ? -1 : 0;           // left flanks lit, right flanks in shade
        const cap = Math.round(2 + (o.cap || 5) * Math.max(0, 1 - Math.abs(d) / 1.6) + LB.noise(x * 0.3, 7, seed) * 2);
        const bot = h - 1 - Math.round(LB.noise(x * 0.2, 3, seed) * 2);
        for (let y = Math.max(0, t); y <= bot; y++) {
          let c;
          if (y < t + cap) {
            c = y <= t ? (facet >= 0 ? SN.hi : SN.lit) : facet > 0 ? SN.lit : facet === 0 ? SN.base : SN.mid;
            if (y === t + cap - 1) c = facet > 0 ? SN.base : SN.shade;
          } else {
            const sy = y + x * tilt + LB.noise(x * 0.1, y * 0.07, seed) * 2;
            const bi = Math.floor(sy / band), inBand = sy - bi * band;
            let k = 2 + (LB.hash(bi, 1, seed) < 0.35 ? 1 : 0) + facet;
            if (inBand < 1 && facet >= 0) k += 1;
            if (inBand > band - 1.1) k -= 1;
            if (y < t + cap + 2) k -= 1;
            c = ROCK[LB.clamp(k, 0, 5)];
            // snow caught on ledges: longer runs on the lit flanks, few on the shaded
            if (inBand < 1.1 && y > t + cap + 3 && LB.noise(x * 0.09, bi * 2.3, seed + 8) > (facet > 0 ? 0.66 : 0.8)) c = facet > 0 ? SN.lit : SN.mid;
            // the odd vertical joint
            if (LB.hash(x, bi, seed + 3) < 0.035 && inBand > 1.5) c = ROCK[0];
          }
          P.px(1 + x, y, c);
        }
        if (LB.hash(x, 1, seed + 4) < 0.25) P.px(1 + x, t + cap, facet > 0 ? SN.base : SN.mid);
        if (o.snowBase) { const sb = Math.round(1 + LB.noise(x * 0.25, 9, seed) * 3); for (let y = bot - sb + 1; y <= bot; y++) P.px(1 + x, y, y === bot - sb + 1 ? SN.hi : facet >= 0 ? SN.lit : SN.base); }
      }
      return LB.outline(cv, '#3a3e56');
    });
  }
  const rockSprite = (key, w, h, seed) => crag(key, w, h, seed, { n: 2, cap: 4, band: 4, jag: 5, snowBase: true });

  // The crag under the falls, with the frozen waterfall draping its middle gully. Base on the water.
  const CLIFF = { x: 238, y: 86, w: 150, h: 78 };
  function cliffSprite() {
    return LB.memo('hf-cliff', () => {
      const rock = crag('cliff', CLIFF.w, CLIFF.h, 23, { n: 4, cap: 7, band: 6, jag: 10 });
      const cv = LB.canvas(rock.width, rock.height), c = LB.ctx2d(cv), P = LB.paint(c);
      c.drawImage(rock, 0, 0);
      const gx = Math.round(CLIFF.w / 2) + 1;
      // the gully behind the ice
      for (let y = 14; y < CLIFF.h; y++) {
        const wob = Math.round(Math.sin(y * 0.16) * 2);
        const half = Math.round(9 * (0.5 + 0.5 * (y / CLIFF.h)));
        P.hline(gx - half + wob, gx + half + wob, y, ROCK[0]);
      }
      // the frozen falls: columns of ice, each lit on its left, with bulges and pointed ends
      const r = LB.rng(61);
      let x = gx - 13;
      while (x < gx + 13) {
        const cw = r.int(2, 4);
        const yTop = 12 + Math.round(Math.abs(x - gx) * 0.6) + r.int(0, 4);
        const yBot = CLIFF.h - r.int(0, 6) - (Math.abs(x - gx) > 9 ? r.int(6, 18) : 0);
        for (let y = yTop; y <= yBot; y++) {
          const taper = yBot - y < 4 ? Math.ceil((cw * (yBot - y + 1)) / 5) : cw;
          const wob = Math.round(Math.sin(y * 0.16) * 2 * (1 - Math.abs(x - gx) / 20));
          for (let i = 0; i < taper; i++) {
            const xi = x + wob + i + Math.floor((cw - taper) / 2);
            let k = i === 0 ? 2 : i === taper - 1 ? 0 : 1;
            if ((y + x * 5) % 9 === 0) k = Math.min(3, k + 1);
            P.px(xi, y, ICICLE[k]);
          }
          if ((y * 3 + x) % 13 === 0 && taper > 1) P.px(x + wob, y, ICICLE[3]);
        }
        x += cw + (r() < 0.3 ? 1 : 0);
      }
      // ice heaped at the foot of the falls
      for (let i = 0; i < 7; i++) {
        const bx = gx - 14 + i * 5 + r.int(-1, 1), by = CLIFF.h - 1 - r.int(0, 2);
        P.disc(bx, by, r.int(2, 3), i % 3 ? ICICLE[2] : SN.lit);
        P.px(bx - 1, by - 1, ICICLE[3]);
      }
      return cv;
    });
  }

  // Ice cracks are drawn later; a front-gabled two-storey chalet with a balcony, 112 × 118, base at the bottom.
  const CHALET = { x: 72, y: 172, w: 112, h: 118 };
  function chaletSprite() {
    return LB.sprite('hf-chalet', CHALET.w, CHALET.h, (P, ctx) => {
      const B = 116; // ground line
      const L = 16, R = 96, C = 56;
      const eaveY = 84, apexF = 54, depth = 34;
      // --- walls: logs across the gable and the ground floor ---
      const roofEdge = (x) => (x <= C ? eaveY - ((x - 8) * (eaveY - apexF)) / (C - 8) : eaveY - ((104 - x) * (eaveY - apexF)) / (104 - C));
      for (let x = L; x < R; x++) {
        const top = Math.ceil(roofEdge(x)) + 1;
        for (let y = top; y < B - 4; y++) {
          const row = (y - 2) % 4;
          let k = row === 0 ? 4 : row === 3 ? 1 : 3;
          if (x < L + 3 || x > R - 4) k = Math.max(1, k - 1);
          if (LB.hash(x >> 2, y >> 2, 5) < 0.12 && row === 1) k = 2;
          P.px(x, y, WOOD[k]);
          if (row === 3 && (x * 7 + y) % 23 === 0) P.px(x, y, WOOD[0]);
        }
      }
      // under-eave shadow along the gable
      for (let x = L; x < R; x++) { const t = Math.ceil(roofEdge(x)) + 1; P.px(x, t, WOOD[0]); P.px(x, t + 1, WOOD[1]); }
      // log ends at the corners
      for (let y = 88; y < B - 4; y += 4) {
        for (const cx of [L - 1, R]) {
          P.rect(cx - 1, y, 4, 3, LOGEND[1]); P.px(cx, y + 1, LOGEND[3]); P.px(cx + 1, y + 1, LOGEND[2]);
          P.px(cx - 1, y + 2, LOGEND[0]); P.px(cx + 2, y + 2, LOGEND[0]);
        }
      }
      // stone foundation with snow piled against it
      for (let x = L - 2; x < R + 2; x++) for (let y = B - 4; y < B; y++) {
        const s = ((x + (y % 2) * 3) % 6 === 0) || y === B - 4;
        P.px(x, y, s ? ROCK[1] : ROCK[3 + ((x >> 1) + y) % 2]);
      }
      // --- balcony across the gable ---
      const bY = 78;
      P.rect(L + 2, bY + 7, R - L - 4, 2, WOOD[1]);          // floor edge
      P.rect(L + 2, bY + 9, R - L - 4, 1, WOOD[0]);          // its shadow
      for (let x = L + 3; x < R - 3; x += 3) { P.rect(x, bY + 1, 2, 6, WOOD[4]); P.px(x + 1, bY + 3, WOOD[1]); P.px(x, bY + 6, WOOD[2]); }
      P.rect(L + 2, bY, R - L - 4, 2, WOOD[3]); P.hline(L + 2, R - 3, bY, WOOD[5]);
      P.hline(L + 2, R - 3, bY - 1, SN.lit); for (let x = L + 4; x < R - 4; x += 5) P.px(x, bY - 2, SN.hi);
      // gable windows
      for (const wx of [44, 60]) {
        P.rect(wx - 1, 62, 10, 11, WOOD[1]);
        P.rect(wx, 63, 8, 9, '#26304a'); P.rect(wx, 63, 3, 3, '#3a4a6a'); P.px(wx + 1, 64, '#5a6a8a');
        P.vline(wx + 4, 63, 71, WOOD[2]); P.hline(wx, wx + 7, 67, WOOD[2]);
      }
      P.rect(55, 58, 2, 3, WOOD[1]); // a carved heart vent
      // --- ground floor: windows with red shutters, door, lantern ---
      for (const wx of [26, 76]) {
        P.rect(wx - 1, 93, 12, 12, WOOD[1]);
        P.rect(wx, 94, 10, 10, '#26304a'); P.rect(wx, 94, 4, 4, '#3a4a6a'); P.px(wx + 1, 95, '#5a6a8a');
        P.vline(wx + 5, 94, 103, WOOD[2]); P.hline(wx, wx + 9, 98, WOOD[2]);
        for (const sx of [wx - 5, wx + 11]) {
          P.rect(sx, 93, 4, 12, RED[2]); P.vline(sx, 93, 104, RED[3]); P.vline(sx + 3, 93, 104, RED[1]);
          P.hline(sx, sx + 3, 96, RED[1]); P.hline(sx, sx + 3, 101, RED[1]);
        }
        P.rect(wx - 2, 105, 14, 2, WOOD[4]); P.hline(wx - 2, wx + 11, 104, SN.hi); P.hline(wx - 1, wx + 9, 105, SN.lit);
      }
      // door with a small hood
      P.rect(49, 92, 14, 20, WOOD[0]);
      P.rect(50, 93, 12, 19, WOOD[2]);
      for (let x = 51; x < 62; x += 3) P.vline(x, 93, 111, WOOD[1]);
      P.vline(50, 93, 111, WOOD[3]); P.px(59, 103, '#d8b060');
      P.rect(46, 89, 20, 3, WOOD[3]); P.hline(46, 65, 89, WOOD[5]); P.hline(46, 65, 88, SN.lit); P.hline(47, 64, 87, SN.hi);
      P.rect(47, 112, 18, 4, ROCK[3]); P.hline(47, 64, 112, ROCK[5]); P.hline(48, 63, 115, SN.base);
      // the lantern by the door (glass left flat for the glow)
      P.rect(67, 94, 5, 7, '#2a2a34'); P.rect(68, 95, 3, 4, '#8a7a5a'); P.px(69, 93, '#2a2a34'); P.hline(67, 71, 93, SN.lit);
      // snow banked against the walls
      for (let x = L - 3; x < R + 3; x++) {
        if (x > 46 && x < 66) continue;
        const hgt = Math.round(2 + 2.5 * LB.noise(x * 0.18, 2, 9) + (x < L + 6 || x > R - 6 ? 2 : 0));
        for (let y = B - hgt; y < B; y++) P.px(x, y, y === B - hgt ? SN.hi : x < 50 ? SN.lit : SN.base);
      }
      // --- the roof: two snow planes meeting at the ridge, overhanging ---
      const roof = [];
      const leftPlane = [[8, 84 - depth], [C, apexF - depth], [C, apexF], [8, eaveY]];
      const rightPlane = [[C, apexF - depth], [104, 84 - depth], [104, eaveY], [C, apexF]];
      P.poly(leftPlane, SN.lit);
      P.poly(rightPlane, SN.base);
      // drift banding on each plane, following the slope
      for (let y = apexF - depth; y < eaveY + 1; y++) for (let x = 8; x < 104; x++) {
        const inL = x < C && y >= (84 - depth) - ((x - 8) * (eaveY - apexF)) / (C - 8) && y <= roofEdge(x);
        const inR = x >= C && y >= (84 - depth) - ((104 - x) * (eaveY - apexF)) / (104 - C) && y <= roofEdge(x);
        if (!inL && !inR) continue;
        const n = LB.noise(x * 0.3, y * 0.035, 77);
        if (inL) {
          const f = (C - x) / (C - 8); // 0 at the ridge, 1 at the eave
          let c = n > 0.66 ? SN.hi : n < 0.3 || f > 0.9 ? SN.base : SN.lit;
          if (f < 0.08) c = SN.hi;
          P.px(x, y, c);
        } else {
          const f = (x - C) / (104 - C);
          let c = f > 0.82 ? SN.shade : n > 0.68 ? SN.base : n < 0.3 || f > 0.6 ? SN.mid : SN.base;
          if (f < 0.06) c = SN.mid;
          P.px(x, y, c);
        }
        if (x === C - 1) P.px(x, y, SN.hi);
        if (x === C) P.px(x, y, SN.shade);
      }
      // where the snow has slid off the low right corner: dark slate shingles under a broken snow edge
      for (let y = 60; y <= eaveY; y++) for (let x = 84; x < 104; x++) {
        const inR = y >= (84 - depth) - ((104 - x) * (eaveY - apexF)) / (104 - C) && y <= roofEdge(x) - 1;
        if (!inR) continue;
        const edge = 66 + (x - 84) * 0.35 + LB.noise(x * 0.4, 3, 71) * 4;
        if (y < edge) continue;
        const row = (y - Math.round(x * 0.62)) % 3;
        P.px(x, y, row === 0 ? '#2e2a3a' : (x + y) % 5 === 0 ? '#4a4458' : '#3c3848');
        if (y < edge + 1.2) P.px(x, y, SN.shade);
      }
      // back gable edge (top) — a thin lit rim
      for (let x = 8; x <= 104; x++) {
        const y = x <= C ? (84 - depth) - ((x - 8) * (eaveY - apexF)) / (C - 8) : (84 - depth) - ((104 - x) * (eaveY - apexF)) / (104 - C);
        P.px(x, Math.round(y), SN.hi);
      }
      // side eaves: a lumpy cornice and icicles down the outer edges
      for (let y = 84 - depth; y < eaveY; y++) {
        P.px(8, y, SN.base); P.px(9, y, SN.lit); P.px(103, y, SN.deep);
        if (LB.hash(y, 1, 31) < 0.35) P.px(7, y, SN.lit);
        if (LB.hash(y, 2, 31) < 0.35) P.px(104, y, SN.shade);
      }
      // the chimney on the right plane
      const chx = 78, chy = 36;
      P.rect(chx, chy - 12, 9, 14, ROCK[3]);
      for (let y = chy - 12; y < chy + 2; y += 3) { P.hline(chx, chx + 8, y, ROCK[2]); P.px(chx + ((y / 3) % 2 ? 3 : 6), y + 1, ROCK[1]); }
      P.vline(chx, chy - 12, chy + 1, ROCK[4]); P.vline(chx + 8, chy - 12, chy + 1, ROCK[1]);
      P.rect(chx - 1, chy - 15, 11, 3, SN.lit); P.hline(chx - 1, chx + 9, chy - 15, SN.hi); P.hline(chx + 5, chx + 9, chy - 13, SN.mid);
      P.rect(chx + 2, chy - 13, 5, 1, ROCK[0]);
      P.hline(chx - 1, chx + 9, chy + 2, SN.base);
      // the front edge: carved bargeboards under a thick snow lip, icicles at the low corners
      for (let x = 6; x <= 106; x++) {
        const y = Math.round(roofEdge(Math.min(104, Math.max(8, x))));
        P.px(x, y + 1, WOOD[1]); P.px(x, y + 2, WOOD[0]);
        if (x % 4 === 0) P.px(x, y + 3, WOOD[1]);
        P.px(x, y, x < C ? SN.hi : SN.lit);
        P.px(x, y - 1, x < C ? SN.lit : SN.base);
        if (LB.hash(x, 3, 33) < 0.35) P.px(x, y + 1, x < C ? SN.lit : SN.base);
      }
      P.rect(C - 1, apexF - 4, 3, 4, WOOD[3]); P.px(C, apexF - 5, SN.hi);
      const ic = LB.rng(88);
      for (let x = 7; x <= 105; x++) {
        const y = Math.round(roofEdge(Math.min(104, Math.max(8, x)))) + 3;
        const nearCorner = x < 24 || x > 88;
        if (!nearCorner || ic() < 0.45) continue;
        const len = ic.int(2, nearCorner ? 7 : 3);
        for (let j = 0; j < len; j++) P.px(x, y + j, j === 0 ? ICICLE[3] : j < len - 1 ? ICICLE[1 + (j % 2)] : ICICLE[0]);
      }
    }, { outline: '#3c3450' });
  }
  const CHALET_WINDOWS = [[26, 94, 10, 10], [76, 94, 10, 10], [44, 63, 8, 9], [60, 63, 8, 9]];
  const CHALET_LANTERN = [68, 95, 3, 4];
  const CHALET_CHIMNEY = [82, 18];

  // A side-gabled log cabin, 82 × 74.
  const CABIN = { x: 420, y: 264, w: 82, h: 74 };
  function cabinSprite() {
    return LB.sprite('hf-cabin', CABIN.w, CABIN.h, (P) => {
      const B = 72, L = 9, R = 73, eave = 44, ridge = 14;
      for (let x = L; x < R; x++) for (let y = eave + 1; y < B - 3; y++) {
        const row = (y - 1) % 4;
        let k = row === 0 ? 4 : row === 3 ? 1 : 3;
        if (LB.hash(x >> 2, y >> 2, 15) < 0.12 && row === 1) k = 2;
        P.px(x, y, WOOD[k]);
      }
      P.hline(L, R - 1, eave + 1, WOOD[0]); P.hline(L, R - 1, eave + 2, WOOD[1]);
      for (let y = eave + 3; y < B - 3; y += 4) for (const cx of [L - 1, R]) {
        P.rect(cx - 1, y, 4, 3, LOGEND[1]); P.px(cx, y + 1, LOGEND[3]); P.px(cx + 1, y + 1, LOGEND[2]);
      }
      for (let x = L - 2; x < R + 2; x++) for (let y = B - 3; y < B; y++) P.px(x, y, (x + y * 3) % 5 === 0 ? ROCK[1] : ROCK[3]);
      // window with shutters, door, small window
      const wx = 18;
      P.rect(wx - 1, 50, 12, 11, WOOD[1]); P.rect(wx, 51, 10, 9, '#26304a'); P.rect(wx, 51, 4, 3, '#3a4a6a');
      P.vline(wx + 5, 51, 59, WOOD[2]); P.hline(wx, wx + 9, 55, WOOD[2]);
      for (const sx of [wx - 5, wx + 11]) { P.rect(sx, 50, 4, 11, RED[2]); P.vline(sx, 50, 60, RED[3]); P.vline(sx + 3, 50, 60, RED[1]); P.hline(sx, sx + 3, 55, RED[1]); }
      P.hline(wx - 2, wx + 11, 61, SN.hi); P.hline(wx - 2, wx + 11, 62, WOOD[4]);
      P.rect(43, 50, 12, 19, WOOD[0]); P.rect(44, 51, 10, 18, WOOD[2]);
      for (let x = 45; x < 54; x += 3) P.vline(x, 51, 68, WOOD[1]);
      P.vline(44, 51, 68, WOOD[3]); P.px(52, 60, '#d8b060');
      P.rect(60, 51, 7, 7, WOOD[1]); P.rect(61, 52, 5, 5, '#26304a'); P.px(61, 52, '#3a4a6a');
      P.hline(60, 66, 58, SN.lit);
      P.rect(56, 52, 4, 6, '#2a2a34'); P.rect(57, 53, 2, 3, '#8a7a5a'); P.hline(56, 59, 51, SN.lit);
      for (let x = L - 3; x < R + 3; x++) {
        if (x > 41 && x < 56) continue;
        const hgt = Math.round(2 + 3 * LB.noise(x * 0.2, 4, 19));
        for (let y = B - hgt; y < B; y++) P.px(x, y, y === B - hgt ? SN.hi : SN.lit);
      }
      // roof: back slope strip (lit), ridge, the long front slope (in soft shade), a cornice and icicles
      for (let x = 2; x < 80; x++) {
        const endL = x < 4 || x > 77;
        for (let y = 4; y <= eave; y++) {
          let c;
          if (y < ridge) c = y === 4 ? SN.hi : x < 40 ? SN.hi : SN.lit;
          else if (y === ridge) c = SN.hi;
          else if (y === ridge + 1) c = SN.mid;
          else {
            const f = (y - ridge) / (eave - ridge);
            const n = LB.noise(x * 0.035, y * 0.3, 91);
            c = f < 0.25 ? (n > 0.55 ? SN.lit : SN.base) : f < 0.7 ? (n > 0.66 ? SN.lit : n < 0.32 ? SN.mid : SN.base) : (n > 0.6 ? SN.base : SN.mid);
            if (f > 0.9) c = SN.shade;
          }
          if (endL) c = x < 4 ? SN.lit : SN.mid;
          if (x === 2 || x === 79) c = WOOD[1];
          P.px(x, y, c);
        }
      }
      // a dormer in the front slope: log cheeks, a window, its own little snow roof
      P.rect(50, 25, 14, 12, WOOD[3]);
      for (let y = 26; y < 37; y += 3) P.hline(50, 63, y, WOOD[2]);
      P.vline(50, 25, 36, WOOD[4]); P.vline(63, 25, 36, WOOD[1]);
      P.rect(53, 28, 8, 7, WOOD[1]); P.rect(54, 29, 6, 5, '#26304a'); P.px(54, 29, '#3a4a6a'); P.vline(57, 29, 33, WOOD[2]);
      P.hline(52, 61, 35, SN.hi); P.hline(49, 64, 37, SN.mid);
      P.poly([[47, 27], [57, 17], [67, 27], [67, 25], [57, 15], [47, 25]], SN.hi);
      P.poly([[47, 27], [57, 19], [57, 27]], SN.lit);
      P.poly([[57, 19], [67, 27], [57, 27]], SN.mid);
      P.hline(47, 66, 27, SN.base); P.px(48, 28, ICICLE[2]); P.px(48, 29, ICICLE[0]); P.px(65, 28, ICICLE[2]); P.px(65, 29, ICICLE[1]); P.px(65, 30, ICICLE[0]);
      // chimney on the left of the front slope
      P.rect(16, 8, 8, 16, ROCK[3]);
      for (let y = 8; y < 24; y += 3) P.hline(16, 23, y, ROCK[2]);
      P.vline(16, 8, 23, ROCK[4]); P.vline(23, 8, 23, ROCK[1]);
      P.rect(15, 5, 10, 3, SN.lit); P.hline(15, 24, 5, SN.hi); P.rect(18, 7, 4, 1, ROCK[0]);
      P.hline(15, 24, 24, SN.base);
      // cornice along the front eave
      for (let x = 1; x < 81; x++) {
        const lump = LB.noise(x * 0.3, 5, 55) > 0.55 ? 1 : 0;
        P.px(x, eave + 1, SN.base); if (lump) P.px(x, eave + 2, SN.mid);
        P.px(x, eave, SN.lit);
      }
      for (let y = 4; y <= eave; y++) { P.px(1, y, SN.lit); P.px(80, y, SN.mid); }
      const ic = LB.rng(17);
      for (let x = 2; x < 80; x++) {
        if (ic() < 0.5) continue;
        const len = ic.int(2, 7);
        for (let j = 0; j < len; j++) P.px(x, eave + 2 + j, j === 0 ? ICICLE[3] : j < len - 1 ? ICICLE[1 + (j % 2)] : ICICLE[0]);
      }
    }, { outline: '#3c3450' });
  }
  const CABIN_WINDOWS = [[18, 51, 10, 9], [61, 52, 5, 5], [54, 29, 6, 5]];
  const CABIN_LANTERN = [57, 53, 2, 3];
  const CABIN_CHIMNEY = [20, 4];

  const woodpile = () => LB.sprite('hf-woodpile', 30, 20, (P) => {
    const rows = [[6, 15], [5, 11], [4, 7]];
    rows.forEach(([n, y], row) => {
      for (let i = 0; i < n; i++) {
        const x = 5 + i * 4 + row * 2;
        P.disc(x, y, 2, WOOD[1]);
        P.rect(x - 1, y - 1, 3, 3, LOGEND[1]); P.px(x - 1, y - 1, LOGEND[3]); P.px(x, y - 1, LOGEND[2]); P.px(x - 1, y, LOGEND[2]); P.px(x + 1, y + 1, LOGEND[0]);
      }
    });
    // snow on the top logs and along the stack's back
    for (let x = 7; x < 25; x++) { P.px(x, 4, SN.hi); if (LB.hash(x, 2, 3) < 0.6) P.px(x, 5, SN.lit); }
    P.px(6, 5, SN.lit); P.px(25, 5, SN.base);
    for (let x = 2; x < 28; x++) P.px(x, 18, x < 14 ? SN.lit : SN.base);
  }, { outline: 'sel', strength: 1.1 });
  const skiRack = () => LB.sprite('hf-skirack', 26, 28, (P) => {
    P.vline(3, 6, 27, WOOD[1]); P.vline(4, 6, 27, WOOD[3]); P.vline(21, 6, 27, WOOD[1]); P.vline(22, 6, 27, WOOD[3]);
    P.rect(2, 7, 22, 2, WOOD[4]); P.hline(2, 23, 6, SN.hi);
    const cols = [['#b83a2e', '#d8604c'], ['#2a6ac0', '#4a8ae0'], ['#d8a628', '#f0c850']];
    cols.forEach(([d, l], i) => {
      const x = 6 + i * 5;
      P.rect(x, 4, 2, 22, d); P.vline(x, 4, 25, l); P.px(x, 3, l); P.px(x + 1, 3, d);
      P.rect(x + 2, 5, 1, 21, '#2a2a34');
    });
    P.hline(1, 24, 27, SN.base);
  }, { outline: 'sel' });
  const sled = () => LB.sprite('hf-sled', 22, 12, (P) => {
    P.hline(2, 18, 9, WOOD[0]); P.px(19, 8, WOOD[0]); P.px(20, 7, WOOD[0]); P.px(20, 6, WOOD[0]);
    P.hline(2, 18, 6, WOOD[0]);
    for (let x = 3; x < 18; x += 3) P.vline(x, 7, 8, WOOD[1]);
    P.rect(2, 3, 16, 3, RED[2]); P.hline(2, 17, 3, RED[3]); P.hline(2, 17, 5, RED[1]);
    for (let x = 4; x < 16; x += 4) P.vline(x, 3, 5, RED[1]);
    P.hline(5, 12, 2, SN.hi);
  }, { outline: 'sel' });
  const snowman = () => LB.sprite('hf-snowman', 18, 26, (P) => {
    const ball = (cx, cy, r) => { P.disc(cx, cy, r, SN.base); P.disc(cx - 1, cy - 1, r - 1, SN.lit); P.disc(cx - 2, cy - 2, Math.max(1, r - 3), SN.hi); for (let a = 0; a < 12; a++) { const th = a / 12 * Math.PI; P.px(cx + Math.round(Math.cos(th - 0.3) * r), cy + Math.round(Math.sin(th - 0.3) * r * 0.9), SN.mid); } };
    ball(9, 19, 6); ball(9, 10, 4); ball(9, 4, 3);
    P.px(8, 3, '#1c1c24'); P.px(10, 3, '#1c1c24'); P.px(11, 4, '#e07a2a'); P.px(12, 4, '#c05a1a');
    P.hline(6, 12, 7, RED[2]); P.vline(11, 7, 10, RED[2]); P.px(11, 10, RED[1]);
    P.line(5, 10, 1, 7, WOOD[1]); P.line(13, 10, 16, 8, WOOD[1]);
    P.px(9, 10, '#1c1c24'); P.px(9, 12, '#1c1c24');
  }, { outline: '#5a6290' });
  const lantern = () => LB.sprite('hf-lantern', 9, 26, (P) => {
    P.vline(4, 8, 25, WOOD[1]); P.vline(3, 8, 25, WOOD[3]);
    P.rect(1, 2, 7, 7, '#2a2a34'); P.rect(2, 3, 5, 5, '#8a7a5a'); P.px(2, 3, '#a8946a');
    P.hline(0, 8, 1, '#2a2a34'); P.hline(1, 7, 0, SN.hi);
    P.hline(2, 6, 25, SN.base);
  }, { outline: 'sel' });
  const bucket = () => LB.sprite('hf-bucket', 9, 9, (P) => {
    P.rect(1, 2, 7, 6, WOOD[3]); P.vline(1, 2, 7, WOOD[4]); P.vline(7, 2, 7, WOOD[1]);
    P.hline(1, 7, 4, '#3a3a44'); P.hline(1, 7, 2, WOOD[5]); P.rect(2, 1, 5, 1, '#1c2a3a');
  }, { outline: 'sel' });

  // ---------- placement ----------
  const PINES = [];
  const ROCKS = [];
  function layout() {
    if (PINES.length) return;
    const r = LB.rng(2024);
    const addPine = (x, y, s) => {
      const sizes = [[26, 46], [30, 56], [36, 66], [42, 78]];
      const [w, h] = sizes[LB.clamp(s, 0, 3)];
      PINES.push({ x, y, spr: pine(w, h, 100 + PINES.length * 7) });
    };
    // the slope behind the big chalet
    [[18, 66, 3], [44, 52, 2], [70, 40, 3], [100, 58, 2], [128, 40, 3], [8, 112, 2], [140, 70, 2], [158, 90, 1], [166, 50, 3]].forEach((p) => addPine(...p));
    // the slope at the top right, round the trail
    [[314, 40, 3], [324, 84, 1], [350, 56, 2], [358, 94, 1], [410, 40, 3], [440, 70, 2], [462, 34, 3], [470, 100, 2], [452, 128, 3], [474, 168, 2]].forEach((p) => addPine(...p));
    // framing the bottom
    [[466, 214, 3], [470, 262, 2], [12, 268, 3], [36, 252, 1], [204, 270, 2], [228, 272, 1]].forEach((p) => addPine(...p));
    // outcrops
    ROCKS.push({ x: 296, y: 66, spr: rockSprite('o1', 44, 30, 5) });
    ROCKS.push({ x: 424, y: 98, spr: rockSprite('o2', 30, 20, 9) });
    ROCKS.push({ x: 334, y: 92, spr: rockSprite('o8', 26, 16, 37) });
    ROCKS.push({ x: 150, y: 36, spr: rockSprite('o3', 54, 34, 13) });
    ROCKS.push({ x: 108, y: 82, spr: rockSprite('o4', 24, 15, 17) });
    ROCKS.push({ x: 448, y: 186, spr: rockSprite('o5', 34, 22, 21) });
    ROCKS.push({ x: 238, y: 252, spr: rockSprite('o6', 22, 13, 29) });
    ROCKS.push({ x: 52, y: 22, spr: rockSprite('o7', 40, 26, 31) });
  }
  // everything standing, back to front: [y, draw(ctx), shadow(sh)]
  function standing() {
    layout();
    const L = [];
    const cl = cliffSprite();
    L.push({ y: CLIFF.y, spr: cl, x: CLIFF.x, k: 0, refl: true });
    for (const p of PINES) L.push({ y: p.y, spr: p.spr, x: p.x, k: 1, refl: p.y < 112 });
    for (const r of ROCKS) L.push({ y: r.y, spr: r.spr, x: r.x, k: 0.8, refl: r.y < 112 });
    L.push({ y: CHALET.y, spr: chaletSprite(), x: CHALET.x, k: 0.7 });
    L.push({ y: CABIN.y, spr: cabinSprite(), x: CABIN.x, k: 0.7 });
    L.push({ y: 186, spr: woodpile(), x: 134, k: 0.8 });
    L.push({ y: 178, spr: skiRack(), x: 14, k: 0.9 });
    L.push({ y: 248, spr: sled(), x: 118, k: 0.6 });
    L.push({ y: 222, spr: snowman(), x: 60, k: 0.9 });
    L.push({ y: HOLE.y + 6, spr: bucket(), x: HOLE.x + 16, k: 0.5 });
    for (const [x, y] of LANTERNS) L.push({ y, spr: lantern(), x, k: 1, lantern: true });
    L.sort((a, b) => a.y - b.y);
    return L;
  }
  const LANTERNS = [[112, 216], [154, 244], [270, 250], [372, 218], [366, 248]];

  // ---------- the ground (computed once) ----------
  let G = null; // { art, lake, open, rink, litMask, shadeMask, openTop, openBot, snowPts, waterPts, bankCols }
  function buildGround() {
    if (G) return G;
    layout();
    const id = new ImageData(W, H), d = id.data;
    const lake = new Uint8Array(W * H), open = new Uint8Array(W * H), rink = new Uint8Array(W * H), cls = new Uint8Array(W * H);
    // 0 snow, 1 path, 2 ice, 3 water, 4 rink, 5 bank
    const hgt = new Float32Array((W + 2) * (H + 2));
    for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
      const u = x * 0.86 + y * 0.5, v = -x * 0.5 + y * 0.86; // drifts lie across the wind
      const n = LB.fbm(u / 120, v / 44, 3, 3), ridge = 1 - Math.abs(2 * n - 1);
      hgt[(y + 1) * (W + 2) + x + 1] = 0.8 * ridge * ridge + 0.2 * LB.fbm(u / 50, v / 24, 7, 2);
    }
    const hAt = (x, y) => hgt[(y + 1) * (W + 2) + x + 1];
    const col = (i, c) => { const a = LB.rgb(c); d[i] = a[0]; d[i + 1] = a[1]; d[i + 2] = a[2]; d[i + 3] = 255; };
    // streaks of wind-blown snow lying on the ice
    const streaks = [];
    { const r = LB.rng(71); for (let i = 0; i < 16; i++) streaks.push({ x: r.range(170, 440), y: r.range(110, 210), l: r.range(14, 40), w: r.range(2, 5), a: -0.38 + r.range(-0.12, 0.12), s: i * 13 }); }
    const streakAt = (x, y) => {
      let best = 0;
      for (const s of streaks) {
        const dx = x - s.x, dy = y - s.y;
        if (Math.abs(dx) > s.l + 4 || Math.abs(dy) > s.l) continue;
        const u = dx * Math.cos(s.a) + dy * Math.sin(s.a), v = -dx * Math.sin(s.a) + dy * Math.cos(s.a);
        const m = 1 - ((u / s.l) ** 2 + (v / s.w) ** 2) + (LB.noise(u * 0.25, v * 0.5, s.s) - 0.5) * 0.9;
        best = Math.max(best, m);
      }
      return best;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (lakeF(x, y) < 1) { lake[i] = 1; if (openF(x, y) < 1) open[i] = 1; if (rinkF(x, y) < 1) rink[i] = 1; }
    }
    const L = (x, y) => x >= 0 && y >= 0 && x < W && y < H && lake[y * W + x];
    const O = (x, y) => x >= 0 && y >= 0 && x < W && y < H && open[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, p = i * 4;
      if (lake[i]) {
        if (open[i]) { col(p, '#1a3446'); cls[i] = 3; continue; }
        if (rink[i]) {
          const rr = rinkF(x, y);
          const k = rr < 0.35 ? 0 : rr < 0.75 ? 1 : 2;
          col(p, RINK[k]); cls[i] = 4;
          // shadow of the swept snowbank along the far rim
          if (rr > 0.82 && y < RINKC.y) col(p, RINK[0]);
          continue;
        }
        // ice: calm bands of glossy and frosted ice
        const n = LB.fbm(x * 0.018, y * 0.035, 51, 3), m = LB.noise(x * 0.06, y * 0.1, 53);
        let c = n < 0.38 ? ICE.dark : n > 0.6 ? ICE.light : ICE.base;
        if (m > 0.78 && n > 0.45) c = ICE.light;
        // under the far bank the ice lies in its shadow
        if (!L(x, y - 3) || !L(x, y - 2)) c = ICE.dark;
        if (!L(x, y - 1)) c = ICE.deep;
        // a rim of white ice round the open water
        if (O(x - 1, y) || O(x + 1, y) || O(x, y - 1) || O(x, y + 1)) c = ICE.hi;
        else if (O(x - 2, y) || O(x + 2, y) || O(x, y - 2) || O(x, y + 2)) c = ICE.light;
        // the rink's snowbank
        const rr = rinkF(x, y);
        if (rr >= 1 && rr < 1.32) {
          const a = Math.atan2(y - RINKC.y, x - RINKC.x);
          const bump = 0.5 + 0.5 * LB.noise(Math.cos(a) * 4 + 2, Math.sin(a) * 4 + 2, 57);
          const band = 1 + 0.32 * bump;
          if (rr < band) {
            const lit = Math.cos(a + 2.2); // upper-left of the bank lit
            const edge = rr > band - 0.08;
            c = edge ? (y < RINKC.y ? SN.mid : SN.hi) : lit > 0.4 ? SN.hi : lit > -0.2 ? SN.lit : lit > -0.6 ? SN.base : SN.mid;
            cls[i] = 0; col(p, c); continue;
          }
        }
        const st = streakAt(x, y);
        if (st > 0.55) c = st > 0.85 ? SN.lit : st > 0.7 ? SN.base : '#c6d4ea';
        else if (st > 0.4 && LB.bayer(x, y) < 0.5) c = '#c6d4ea';
        col(p, c); cls[i] = 2;
        continue;
      }
      // the far bank: a face of snow in shadow above the water and ice
      let bank = 0;
      for (let k = 1; k <= 5; k++) if (L(x, y + k)) { bank = k; break; }
      // the path
      const [pd] = segDist(x, y, PATH_MAIN), [pd2] = segDist(x, y, PATH_CABIN), [td] = segDist(x, y, TRAIL);
      const pw = 5.2 + (LB.noise(x * 0.15, y * 0.15, 61) - 0.5) * 2.2;
      const onPath = Math.min(pd, pd2) < pw, onTrail = td < 2.6 + LB.noise(x * 0.2, y * 0.2, 62) * 1.2;
      // drifts: shading from the slope of the snow's height, in clean bands
      const gx = hAt(x + 1, y) - hAt(x - 1, y), gy = hAt(x, y + 1) - hAt(x, y - 1);
      let v = 0.62 + (gx * 1 + gy * 1.25) * 11;
      const hh = hAt(x, y);
      let c = v < 0.16 ? SN.shade : v < 0.34 ? SN.mid : v < 0.66 ? SN.base : v < 0.92 ? SN.lit : SN.hi;
      if (hh > 0.74 && v > 0.45) c = SN.hi; // a wind-cut crest
      if (bank) { c = bank <= 1 ? SN.deep : bank <= 3 ? SN.shade : SN.mid; cls[i] = 5; }
      else if (L(x, y - 1)) { c = SN.hi; } // the near bank's lit lip
      if (onPath || onTrail) {
        c = PATH.base; cls[i] = 1;
        const [qd] = segDist(x, y - 2, onTrail ? TRAIL : PATH_MAIN.concat(PATH_CABIN));
        const pw2 = onTrail ? 2.6 : pw;
        if (qd > pw2 - 0.5) c = PATH.edge;                // the bank's shadow on the far side
        if (LB.noise(x * 0.3, y * 0.3, 63) > 0.68) c = PATH.light;
      }
      if (!cls[i]) cls[i] = 0;
      col(p, c);
    }
    // tidy: lone pixels in the snow take their neighbours' colour
    const cp = new Uint8ClampedArray(d);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, p = i * 4;
      if (cls[i] !== 0) continue;
      const same = (q) => cp[q] === cp[p] && cp[q + 1] === cp[p + 1] && cp[q + 2] === cp[p + 2];
      const n = [p - 4, p + 4, p - W * 4, p + W * 4];
      if (!n.some(same)) { const q = n[0]; d[p] = cp[q]; d[p + 1] = cp[q + 1]; d[p + 2] = cp[q + 2]; }
    }
    const art = LB.canvas(W, H), ac = LB.ctx2d(art);
    ac.putImageData(id, 0, 0);
    const P = LB.paint(ac);
    // the drifts' wind-cut crests: a bright lip with a soft shadow under it
    { const r = LB.rng(13);
      for (let i = 0; i < 26; i++) {
        const x0 = r.range(0, W), y0 = r.range(8, H), len = r.range(10, 30), a = -0.5 + r.range(-0.15, 0.15), bow = r.range(-4, 4);
        for (let s = 0; s < len; s++) {
          const t = s / len, x = Math.round(x0 + Math.cos(a) * s), y = Math.round(y0 + Math.sin(a) * s + Math.sin(t * Math.PI) * bow);
          const idx = y * W + x;
          if (x < 1 || y < 1 || x >= W - 1 || y >= H - 2 || cls[idx] !== 0 || cls[idx + W] !== 0 || cls[idx + 2 * W] !== 0) continue;
          P.px(x, y, SN.hi);
          if (t > 0.15 && t < 0.85) P.px(x, y + 1, SN.mid);
          if (t > 0.3 && t < 0.7) P.px(x, y + 2, SN.base);
        }
      } }
    // ice cracks: wandering dark lines with a light lip, branching
    const iceAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (cls[(y | 0) * W + (x | 0)] === 2 || cls[(y | 0) * W + (x | 0)] === 4);
    const crack = (x, y, a, len, depth, r) => {
      for (let s = 0; s < len; s++) {
        a += r.range(-0.35, 0.35);
        x += Math.cos(a); y += Math.sin(a) * 0.7;
        if (!iceAt(x, y)) return;
        P.px(x, y, ICE.deep);
        if (iceAt(x + 1, y + 1)) P.px(x + 1, y + 1, ICE.hi);
        if (depth < 2 && r() < 0.06) crack(x, y, a + r.pick([-1, 1]) * r.range(0.6, 1.2), len * 0.5, depth + 1, r);
      }
    };
    { const r = LB.rng(97); for (let i = 0; i < 9; i++) { const x = r.range(250, 440), y = r.range(120, 205); crack(x, y, r.range(0, 6.28), r.range(20, 60), 0, r); } }
    // skate marks on the rink
    { const r = LB.rng(5);
      for (let i = 0; i < 16; i++) {
        const rx = r.range(8, RINKC.rx - 6), ry = rx * r.range(0.3, 0.45), cx = RINKC.x + r.range(-10, 10), cy = RINKC.y + r.range(-4, 4);
        const a0 = r.range(0, 6.28), a1 = a0 + r.range(1.2, 3.6);
        for (let a = a0; a < a1; a += 0.03) {
          const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
          if (rinkF(x, y) < 0.94) P.px(x, y, i % 3 ? '#b8dcf0' : '#d6eef9');
        }
      } }
    // the ice-fishing hole: dark water, a slushy rim, chunks of ice
    P.ellipse(HOLE.x, HOLE.y, 5, 2, ICE.hi); P.ellipse(HOLE.x, HOLE.y, 4, 2, '#0e1c28'); P.hline(HOLE.x - 2, HOLE.x + 1, HOLE.y - 1, '#1c3446');
    [[-7, 1], [6, -1], [7, 2], [-5, -2], [2, 3]].forEach(([dx, dy], k) => { P.px(HOLE.x + dx, HOLE.y + dy, k % 2 ? SN.hi : ICE.hi); P.px(HOLE.x + dx + 1, HOLE.y + dy, ICE.light); });
    // footprints along the paths, ski tracks along the trail
    const prints = (pts, step, spread) => {
      const total = plen(pts);
      for (let s = 4, k = 0; s < total - 2; s += step, k++) {
        const [x, y, vx, vy] = along(pts, s), n = Math.hypot(vx, vy) || 1;
        const ox = (-vy / n) * spread * (k % 2 ? 1 : -1), oy = (vx / n) * spread * (k % 2 ? 1 : -1);
        P.px(x + ox, y + oy, PATH.print); P.px(x + ox + 1, y + oy, PATH.print); P.px(x + ox, y + oy + 1, PATH.light);
      }
    };
    prints(PATH_MAIN, 5, 1.6); prints(PATH_CABIN, 5, 1.6); prints(TRAIL, 4, 1);
    // a fox's tracks across the open snow to the lake
    { const pts = [[0, 214], [22, 204], [40, 214], [58, 200], [80, 194], [104, 186], [122, 172], [146, 168], [160, 160]];
      const total = plen(pts);
      for (let s = 0; s < total; s += 4) { const [x, y] = along(pts, s); const xi = Math.round(x), yi = Math.round(y + (Math.floor(s / 4) % 2 ? 1 : -1)); if (cls[yi * W + xi] === 0) P.px(xi, yi, SN.shade); } }
    // dry grass poking through the snow
    { const r = LB.rng(33);
      const clumps = [[120, 70], [96, 100], [28, 132], [180, 82], [430, 120], [454, 236], [300, 258], [348, 250], [6, 200], [340, 96]];
      for (const [cx, cy] of clumps) for (let i = 0; i < 6; i++) {
        const x = Math.round(cx + r.range(-6, 6)), y = Math.round(cy + r.range(-3, 3));
        if (cls[y * W + x] !== 0) continue;
        const hh = r.int(2, 4);
        P.vline(x, y - hh + 1, y, r() < 0.5 ? '#b89a6a' : '#8a6a44');
        if (r() < 0.4) P.px(x + (r() < 0.5 ? -1 : 1), y - hh + 1, '#c8aa7a');
        P.px(x, y + 1, SN.mid);
      } }
    // contact shadows at the feet of things standing on the snow
    for (const o of standing()) {
      if (o.spr === cliffSprite()) continue;
      const w = o.spr.width;
      LB.contact(ac, o.x + 1, o.y - 1, Math.max(3, w * (o.lantern ? 0.3 : 0.36)), Math.max(1.5, w * 0.07), 0.3);
    }
    // masks
    const mk = (fn) => { const cv = LB.canvas(W, H), x = LB.ctx2d(cv), md = x.createImageData(W, H); for (let i = 0; i < W * H; i++) if (fn(i)) md.data[i * 4 + 3] = 255; x.putImageData(md, 0, 0); return cv; };
    const openMask = mk((i) => open[i]);
    const rinkMask = mk((i) => rink[i]);
    const openTop = new Int16Array(W).fill(-1), openBot = new Int16Array(W).fill(-1), bankCol = new Uint8Array(W);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (open[y * W + x]) { if (openTop[x] < 0) { openTop[x] = y; bankCol[x] = !L(x, y - 1) ? 1 : 0; } openBot[x] = y; }
    G = { art, cls, openMask, rinkMask, openTop, openBot, bankCol, lake };
    return G;
  }

  // ---------- standing art (computed once) ----------
  let O = null; // { art, refl (things that mirror in the water), windows, lanterns, chimneys }
  function buildObjects() {
    if (O) return O;
    const g = buildGround();
    const art = LB.canvas(W, H), ac = LB.ctx2d(art);
    const refl = LB.canvas(W, H), rc = LB.ctx2d(refl);
    const windows = [], lanterns = [], chimneys = [];
    for (const o of standing()) {
      LB.blit(ac, o.spr, o.x, o.y);
      if (o.refl) LB.blit(rc, o.spr, o.x, o.y);
      if (o.lantern) { const x0 = Math.round(o.x - Math.floor(o.spr.width / 2)), y0 = o.y - o.spr.height; lanterns.push([x0 + 2, y0 + 3, 5, 5]); }
    }
    const place = (S, spr, rects, out) => { const x0 = Math.round(S.x - Math.floor(spr.width / 2)), y0 = S.y - spr.height; for (const [x, y, w, h] of rects) out.push([x0 + x, y0 + y, w, h]); return [x0, y0]; };
    const [cx0, cy0] = place(CHALET, chaletSprite(), CHALET_WINDOWS, windows);
    place(CHALET, chaletSprite(), [CHALET_LANTERN], lanterns);
    chimneys.push([cx0 + CHALET_CHIMNEY[0], cy0 + CHALET_CHIMNEY[1]]);
    const [bx0, by0] = place(CABIN, cabinSprite(), CABIN_WINDOWS, windows);
    place(CABIN, cabinSprite(), [CABIN_LANTERN], lanterns);
    chimneys.push([bx0 + CABIN_CHIMNEY[0], by0 + CABIN_CHIMNEY[1]]);
    // only mirror columns where the open water meets the far bank (not where it meets ice)
    rc.globalCompositeOperation = 'destination-out';
    for (let x = 0; x < W; x++) if (!g.bankCol[x]) rc.fillRect(x, 0, 1, H);
    rc.globalCompositeOperation = 'source-over';
    const mirrored = LB.mirror(refl, (x) => (g.openTop[x] > 0 ? g.openTop[x] : 0), 0, W);
    // alpenglow masks: every snow pixel, sorted into lit faces and shaded faces
    const comp = LB.canvas(W, H), cc = LB.ctx2d(comp);
    cc.drawImage(g.art, 0, 0); cc.drawImage(art, 0, 0);
    const cd = cc.getImageData(0, 0, W, H).data;
    const litSet = new Set([SN.base, SN.lit, SN.hi, ICE.light, ICE.hi, ICE.base, ROCK[4], ROCK[5], ICICLE[2], ICICLE[3], '#c6d4ea'].map((c) => LB.rgb(c).join(',')));
    const shSet = new Set([SN.deep, SN.shade, SN.mid].map((c) => LB.rgb(c).join(',')));
    const litMask = LB.canvas(W, H), shadeMask = LB.canvas(W, H);
    const li = LB.ctx2d(litMask).createImageData(W, H), si = LB.ctx2d(shadeMask).createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const k = cd[i * 4] + ',' + cd[i * 4 + 1] + ',' + cd[i * 4 + 2];
      if (litSet.has(k)) li.data[i * 4 + 3] = 255; else if (shSet.has(k)) si.data[i * 4 + 3] = 255;
    }
    LB.ctx2d(litMask).putImageData(li, 0, 0); LB.ctx2d(shadeMask).putImageData(si, 0, 0);
    const snowPts = LB.maskPoints(litMask, 140, 8);
    const waterPts = LB.maskPoints(g.openMask, 70, 4);
    const starPts = LB.maskPoints(g.openMask, 40, 12);
    const ringPts = LB.maskPoints(g.openMask, 14, 21);
    O = { art, mirrored, windows, lanterns, chimneys, litMask, shadeMask, snowPts, waterPts, starPts, ringPts };
    return O;
  }

  // a scratch canvas per use
  const scratch = (name) => LB.memo('hf-scratch-' + name, () => LB.canvas(W, H));

  // ---------- people ----------
  function people(ctx, S) {
    const t = S.t;
    // the mountaineer, climbing the trail and coming back down
    const tl = plen(TRAIL), cyc = (t * 7) % (tl * 2), up = cyc < tl;
    const [mx, my] = along(TRAIL, Math.min(tl - 6, up ? cyc : tl * 2 - cyc));
    // the skater, gliding round the rink
    const a = t * 0.55;
    const sx = RINKC.x + Math.cos(a) * 34, sy = RINKC.y + 3 + Math.sin(a) * 11;
    const sdir = -Math.sin(a) > 0 ? 'right' : 'left';
    // the skier, walking the shore path with skis on the shoulder
    const pl = plen(PATH_MAIN), cyc2 = (t * 13) % (pl * 2), fwd = cyc2 < pl;
    const [kx, ky, vx, vy] = along(PATH_MAIN, fwd ? cyc2 : pl * 2 - cyc2);
    const kdir = Math.abs(vx) > Math.abs(vy) ? ((vx > 0) === fwd ? 'right' : 'left') : ((vy > 0) === fwd ? 'down' : 'up');
    const folk = [
      { y: my, draw: () => LB.person(ctx, Math.round(mx), Math.round(my), 'mountaineer', { dir: up ? 'up' : 'down', walk: true, t, seed: 3 }) },
      { y: sy, draw: () => {
        // a faint reflection of the skater in the swept ice
        const sc = scratch('skater');
        const c = LB.ctx2d(sc); c.clearRect(0, 0, W, H);
        LB.person(c, 64, 60, 'child', { dir: sdir, walk: true, t: t * 0.6, seed: 5 });
        const fl = scratch('skaterflip'), fc = LB.ctx2d(fl);
        fc.clearRect(0, 0, W, H); fc.save(); fc.translate(Math.round(sx) - 64, Math.round(sy) + 60 + 1); fc.scale(1, -1); fc.drawImage(sc, 0, 0, 128, 64, 0, 0, 128, 64); fc.restore();
        fc.globalCompositeOperation = 'destination-in'; fc.drawImage(G.rinkMask, 0, 0); fc.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.globalAlpha = 0.28; ctx.drawImage(fl, 0, 0); ctx.restore();
        LB.person(ctx, Math.round(sx), Math.round(sy), 'child', { dir: sdir, walk: true, t: t * 0.6, seed: 5 });
      } },
      { y: ky, draw: () => LB.person(ctx, Math.round(kx), Math.round(ky), 'skier', { dir: kdir, walk: true, t, seed: 7 }) },
      { y: HOLE.y + 5, draw: () => {
        LB.person(ctx, HOLE.x + 15, HOLE.y + 4, 'fisher', { dir: 'left', sit: true, t, seed: 9 });

      } },
    ];
    folk.sort((p, q) => p.y - q.y);
    for (const f of folk) f.draw();
  }

  // chimney smoke: soft puffs drifting up and off with the wind
  function smoke(ctx, S, x, y, seed) {
    const P = LB.paint(ctx);
    const dark = S.L.night > 0.5;
    for (let i = 0; i < 9; i++) {
      const k = ((S.t * 0.22 + i / 9 + seed * 0.13) % 1);
      const px = x + k * 26 + Math.sin(S.t * 0.9 + i * 1.7) * 2 * k, py = y - k * 34;
      const r = 1 + Math.round(k * 4);
      ctx.save(); ctx.globalAlpha = 0.85 * (1 - k);
      P.disc(px, py + 1, r, '#8a90a8');
      P.disc(px, py, r, dark ? '#a4aabe' : '#c4c8d6');
      P.disc(px - 1, py - 1, Math.max(0, r - 1), dark ? '#bcc2d2' : '#e2e6ee');
      ctx.restore();
    }
  }

  // snowfall: flakes of two sizes drifting down, each with a shaded underside so it shows against snow
  function snowfall(ctx, S) {
    const P = LB.paint(ctx), t = S.t;
    for (let i = 0; i < 220; i++) {
      const h1 = LB.hash(i, 1, 77), h2 = LB.hash(i, 2, 77), h3 = LB.hash(i, 3, 77);
      const near = h3 > 0.72, sp = near ? 26 + h3 * 10 : 12 + h3 * 10;
      const y = Math.round((h2 * (H + 10) + t * sp) % (H + 10)) - 5;
      const x = Math.round((((h1 * W + Math.sin(t * 0.8 + i) * (near ? 6 : 3) + t * (near ? 9 : 5)) % W) + W) % W);
      if (near) { P.rect(x, y, 2, 2, '#ffffff'); P.px(x + 1, y + 1, '#b8c2e0'); P.px(x + 2, y + 1, '#9aa4d0'); }
      else { P.px(x, y, '#ffffff'); P.px(x, y + 1, '#aeb8d8'); }
    }
  }

  // sleet: short slanting streaks and pellets of ice
  function sleet(ctx, S) {
    const P = LB.paint(ctx), t = S.t;
    const n = 260;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const h1 = LB.hash(i, 1, 41), h2 = LB.hash(i, 2, 41), h3 = LB.hash(i, 3, 41);
      const sp = 150 + h3 * 70;
      const y = ((h2 * (H + 30) + t * sp) % (H + 30)) - 15;
      const x = ((((h1 * (W + 60) - t * sp * 0.4) % (W + 60)) + (W + 60)) % (W + 60)) - 30;
      if (h3 > 0.6) { ctx.globalAlpha = 0.95; P.px(x, y, '#f4f7fc'); P.px(x, y + 1, '#8e9ac0'); }
      else { ctx.globalAlpha = 0.6; P.line(x, y, x - 2, y + 4, '#dde6f4'); }
    }
    ctx.restore();
  }

  LB.add({
    id: 'hoarfell', order: 50, section: 'place',
    name: 'Fellhaven Tarn', world: 'Hoarfell',
    blurb: 'A mountain lake below Fellhaven, half frozen. Open water under the frozen falls still holds the cliff and the firs upside down, and the rest is ice you can skate on.',
    see: [
      'Snow shaped into drifts, with cool blue-violet shadows and wind-cut crests, instead of flat white',
      'At dawn and golden hour the lit snow turns pink and gold (alpenglow) while the shadows go violet',
      'The cliff, the frozen waterfall and the firs mirrored in the open water, wobbling slowly',
      'Ice with cracks, drifted snow and a swept rink where a skater is faintly reflected',
      'At night: blue snow, warm windows, chimney smoke, and on clear nights an aurora shimmering on the water',
    ],
    build: 'Most of this is the engine work we would add anyway: a light pass that tints snow by the hour, and a reflection pass for open water (the Blender render gives us the mirrored layer). The firs, chalets and cliff would be new kit pieces or painted sprites with snow on every ledge. A medium job once the reflection and grading passes exist.',
    now: 'hoarfell.png',
    w: W, h: H,
    seasons: ['winter'], seasonNote: 'Always winter on Hoarfell',
    weatherFx: false,
    clouds: { alpha: 0.16, speed: 4 },
    init() { buildGround(); buildObjects(); },
    ground(ctx) { ctx.drawImage(buildGround().art, 0, 0); },
    shadows(sh, S) {
      for (const o of standing()) {
        if (o.k <= 0) continue;
        if (o.lantern) { sh.pole(o.x, o.y - 1, o.spr.height - 2, 2); continue; }
        sh.cast(o.spr, o.x, o.y - 1, null, null, { k: o.k });
      }
    },
    water(ctx, S, P) {
      const g = buildGround(), o = buildObjects(), L = S.L;
      // the sky's colour on the open water, deepening away from the edges
      const tmp = scratch('water'), tc = LB.ctx2d(tmp);
      tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1; tc.clearRect(0, 0, W, H);
      const glow = LB.clamp(L.golden * 1.15, 0, 1) * (S.weather === 'clear' ? 1 : 0.35);
      const sky = LB.mix(LB.mix(L.skyHor, L.skyTop, 0.35), '#b48ad0', glow * 0.75); // a lilac sky at dawn and dusk
      const sw = 0.3 + 0.3 * glow;
      const deep = LB.mix('#123048', sky, sw), mid = LB.mix('#1e4a66', sky, sw + 0.1), shallow = LB.mix('#33708e', sky, sw + 0.18);
      const tp = LB.paint(tc);
      for (let x = 0; x < W; x++) {
        const a = g.openTop[x], b = g.openBot[x];
        if (a < 0) continue;
        for (let y = a; y <= b; y++) {
          const e = Math.min(y - a, b - y);
          tp.px(x, y, e < 2 ? shallow : e < 6 ? mid : deep);
        }
      }
      tc.globalCompositeOperation = 'destination-in'; tc.drawImage(g.openMask, 0, 0);
      ctx.drawImage(tmp, 0, 0);
      // the far bank, the falls and the firs, upside down and wobbling
      LB.ripple(ctx, o.mirrored, g.openMask, S, { amp: 1, freq: 0.5, speed: 1.2, alpha: S.weather === 'clear' ? 0.58 : 0.42, slot: 1 });
      // at dawn and dusk the water takes the sky's blush too
      if (glow > 0.03) {
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.4 * glow;
        ctx.drawImage(LB.silhouette(g.openMask, '#9a5a8a'), 0, 0); ctx.restore();
      }
      // a dark line where the ice shelf overhangs the water, and its bright edge
      for (let x = 0; x < W; x++) {
        const a = g.openTop[x], b = g.openBot[x];
        if (a < 0) continue;
        if (!g.bankCol[x]) P.px(x, a, '#0e1c28');
        P.px(x, b, '#0e1c28');
      }
      // ripple highlights and glints toward the light
      const t = S.t;
      for (const [x, y, ph] of o.waterPts) {
        const v = Math.sin(t * 0.8 + ph * 20 + x * 0.05);
        if (v > 0.7) { ctx.save(); ctx.globalAlpha = 0.5; P.hline(x - 1, x + 1, y, LB.mix(sky, '#ffffff', 0.5)); ctx.restore(); }
      }
      LB.glints(ctx, o.waterPts, S, { rate: 1.1 });
      if (S.weather === 'rain' || S.weather === 'snow') LB.rings(ctx, o.ringPts, S, { period: 1.6, r: 4, alpha: 0.6 });
      // a couple of small floes turning slowly near the ice edge
      const floes = [[180, 118, 5], [292, 116, 4], [252, 128, 3]];
      for (const [fx, fy, fr] of floes) {
        const dx = Math.round(Math.sin(t * 0.15 + fx) * 2);
        if (!LB.inMask(g.openMask, fx + dx, fy)) continue;
        P.ellipse(fx + dx, fy + 1, fr, Math.max(1, fr * 0.45), '#0e1c28');
        P.ellipse(fx + dx, fy, fr, Math.max(1, fr * 0.45), ICE.light);
        P.hline(fx + dx - fr + 1, fx + dx, fy - 1, ICE.hi);
      }
    },
    objects(ctx) { ctx.drawImage(buildObjects().art, 0, 0); },
    live(ctx, S, P) {
      const o = buildObjects(), L = S.L;
      // alpenglow: lit snow blushes pink-gold, its shadows deepen to violet
      const glow = LB.clamp(L.golden * 1.15, 0, 1) * (S.weather === 'clear' ? 1 : 0.35);
      if (glow > 0.03) {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.75 * glow;
        ctx.drawImage(LB.silhouette(o.litMask, '#ff7ea0'), 0, 0);
        ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.3 * glow;
        ctx.drawImage(LB.silhouette(o.shadeMask, '#6a52b8'), 0, 0);
        ctx.restore();
      }
      // snow glitter
      const sparkle = S.L.day > 0.5 ? '#ffffff' : '#cfe0ff';
      if (S.weather === 'clear') LB.glints(ctx, o.snowPts, S, { rate: 0.9, color: glow > 0.3 ? '#fff0e8' : sparkle, big: false });
      for (const [i, [x, y]] of o.chimneys.entries()) smoke(ctx, S, x, y, i);
      people(ctx, S);
      if (S.weather === 'rain') sleet(ctx, S);
      else if (S.weather === 'snow') snowfall(ctx, S);
      else if (S.weather === 'fog') LB.weatherFx(ctx, S, { fogAlpha: 0.6 });
    },
    emissive(ctx, S, P) {
      const o = buildObjects(), g = buildGround(), L = S.L;
      const on = LB.smooth(0.2, 0.6, L.night);
      if (on > 0.01) {
        ctx.save(); ctx.globalAlpha = on;
        for (const [x, y, w, h] of o.windows) {
          P.rect(x, y, w, h, '#ffc866');
          P.rect(x + 1, y + 1, Math.max(1, Math.floor(w / 2) - 1), Math.max(1, Math.floor(h / 2) - 1), '#ffe6a8');
          if (w >= 8) { P.vline(x + Math.floor(w / 2), y, y + h - 1, '#5a3418'); P.hline(x, x + w - 1, y + Math.floor(h / 2) - 1, '#5a3418'); }
        }
        for (const [x, y, w, h] of o.lanterns) {
          const f = 0.85 + 0.15 * LB.noise(S.t * 5 + x, y, 3);
          ctx.globalAlpha = on * f;
          P.rect(x, y, w - 2 > 0 ? w - 2 : w, h - 1 > 0 ? h - 1 : h, '#ffe4a0');
          P.px(x, y, '#fff6d8');
        }
        ctx.restore();
      }
      // the aurora on still water: green curtains with violet hems, rippling in the reflection
      const aur = LB.smooth(0.55, 0.9, L.night) * (S.weather === 'clear' ? 1 : 0);
      if (aur > 0.02) {
        const tmp = scratch('aurora'), tc = LB.ctx2d(tmp), tp = LB.paint(tc);
        tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1; tc.clearRect(0, 0, W, H);
        for (let x = 0; x < W; x++) {
          const a = g.openTop[x], b = g.openBot[x];
          if (a < 0) continue;
          const v = LB.fbm(x * 0.022 + S.t * 0.05, S.t * 0.03, 81, 3);
          if (v < 0.5) continue;
          const k = (v - 0.5) * 2;
          const len = Math.round((b - a) * (0.4 + k * 0.6));
          for (let y = a; y <= a + len && y <= b; y++) {
            const f = (y - a) / Math.max(1, len);
            const wob = Math.round(Math.sin(y * 0.6 + S.t * 1.4) * 1);
            tc.globalAlpha = (f < 0.65 ? 0.55 : 0.55 * (1 - (f - 0.65) / 0.35)) * k;
            tp.px(x + wob, y, f < 0.2 ? '#c890ff' : f < 0.75 ? '#5cf0a8' : '#38c890');
          }
        }
        tc.globalAlpha = 1; tc.globalCompositeOperation = 'destination-in'; tc.drawImage(g.openMask, 0, 0);
        ctx.save(); ctx.globalAlpha = aur; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(tmp, 0, 0); ctx.restore();
      }
      // stars in the open water on clear nights
      if (L.night > 0.6 && S.weather === 'clear') {
        ctx.save(); ctx.globalAlpha = 0.8 * L.night;
        for (const [x, y, ph] of o.starPts) if (Math.sin(S.t * 0.7 + ph * 30) > -0.2) P.px(x + Math.round(Math.sin(S.t * 1.2 + y) * 0.6), y, ph > 0.7 ? '#ffffff' : '#bcd0ff');
        ctx.restore();
      }
    },
    lights(S) {
      const o = buildObjects();
      const out = [];
      for (const [x, y, w, h] of o.windows) out.push({ x: x + w / 2, y: y + h + (h > 9 ? 10 : 14), r: 24, sq: 0.55, c: '#ffb050', i: 0.9 });
      for (const [x, y] of o.lanterns) out.push({ x: x + 1, y: y + 6, r: 30, sq: 0.7, c: '#ffbc60', flicker: 1 });
      return out;
    },
    after(ctx, S) {
      // the aurora's light lying faintly on the snow
      const aur = LB.smooth(0.55, 0.9, S.L.night) * (S.weather === 'clear' ? 1 : 0);
      if (aur < 0.02) return;
      const o = buildObjects();
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = aur * (0.07 + 0.04 * Math.sin(S.t * 0.4));
      ctx.drawImage(LB.silhouette(o.litMask, '#48e0a0'), 0, 0);
      ctx.globalAlpha = aur * (0.05 + 0.03 * Math.sin(S.t * 0.31 + 2));
      ctx.drawImage(LB.silhouette(o.shadeMask, '#a070f0'), 0, 0);
      ctx.restore();
    },
  });
})();
