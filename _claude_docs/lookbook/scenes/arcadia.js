// Arcadia — Rainline Street: a neon street after dark, the wet asphalt mirroring every sign.
(function () {
  'use strict';
  const W = 480, H = 270;
  const BASE = 136;            // where the building fronts meet the far sidewalk (the mirror line)
  const CURB = 159;            // far curb lip
  const ST0 = 164, ST1 = 233;  // the street
  const NEAR = 237;            // near sidewalk starts
  const LANE = 198;            // centre line

  // ---------- tiny bitmap fonts ----------
  const F5 = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  };
  // made-up katakana-ish glyphs, 5 × 5
  const K5 = {
    ra: ['#####', '.....', '#####', '....#', '..##.'],
    ch: ['.....', '.....', '#####', '.....', '.....'],
    me: ['...#.', '#..#.', '.##..', '.#.#.', '#...#'],
    n: ['#...#', '.#..#', '....#', '...#.', '###..'],
    ho: ['..#..', '#####', '..#..', '#.#.#', '..#..'],
    te: ['#####', '.....', '#####', '..#..', '.#...'],
    ru: ['.#.#.', '.#.#.', '.#.#.', '.#.##', '#..#.'],
    ka: ['.#...', '#####', '.#..#', '.#..#', '#..##'],
    sa: ['.#.#.', '#####', '.#.#.', '...#.', '.##..'],
  };
  function glyph(P, rows, x, y, c) {
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') P.px(x + i, y + j, c);
  }
  // A neon word: 1 px pale tube cores inside a 1 px saturated halo (the outline pass). parts: letters or glyph keys.
  function neonWord(parts, glow, core, vertical, font) {
    font = font || F5;
    const gh = font === K5 ? 5 : 7, gw = 5, gap = font === K5 ? 3 : 2;
    const n = parts.length;
    const w = vertical ? gw + 2 : n * (gw + gap) - gap + 2;
    const h = vertical ? n * (gh + gap) - gap + 2 : gh + 2;
    return LB.sprite('arc-nw:' + parts.join('.') + glow + core + (vertical ? 'v' : 'h') + gh, w, h, (P) => {
      for (let i = 0; i < n; i++) {
        const g = font[parts[i]];
        if (!g) continue;
        glyph(P, g, 1 + (vertical ? 0 : i * (gw + gap)), 1 + (vertical ? i * (gh + gap) : 0), core);
      }
    }, { outline: glow });
  }
  function neonIcon(name, rows, glow, core) {
    return LB.sprite('arc-ni:' + name + glow + core, rows[0].length + 2, rows.length + 2, (P) => glyph(P, rows, 1, 1, core), { outline: glow });
  }
  const GLASS = ['###########', '.#.......#.', '..#..#..#..', '...#...#...', '....#.#....', '.....#.....', '.....#.....', '.....#.....', '.....#.....', '...#####...'];
  const CAT = ['#.........#', '##.......##', '#.#######.#', '#.........#', '#..#...#..#', '#.........#', '#....#....#', '.#..#.#..#.', '..#######..'];
  const ARROW = ['..#..', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'];

  // the neon on this street: [id, x, y, sprite fn, glow, core, flicker]
  const PINK = '#f05ca0', PINKC = '#ffd4e8', CYAN = '#3cc8d8', CYANC = '#dcfcff', PURP = '#8a6cf0', PURPC = '#ece4ff', YEL = '#f0c840', YELC = '#fff6cc';
  const dull = (c) => LB.mix(c, '#2a2638', 0.62);
  const SIGNS = [
    { id: 'ramen', x: 33, y: 71, make: (g, c) => neonWord(['R', 'A', 'M', 'E', 'N'], g, c), glow: PINK, core: PINKC },
    { id: 'blade', x: 105, y: 10, make: (g, c) => neonWord(['ka', 'ra', 'me', 'n', 'sa'], g, c, true, K5), glow: CYAN, core: CYANC },
    { id: 'glass', x: 203, y: 95, make: (g, c) => neonIcon('glass', GLASS, g, c), glow: CYAN, core: CYANC },
    { id: 'bar', x: 218, y: 98, make: (g, c) => neonWord(['B', 'A', 'R'], g, c), glow: PINK, core: PINKC },
    { id: 'arrow', x: 276, y: 100, make: (g, c) => neonIcon('arrow', ARROW, g, c), glow: PINK, core: PINKC, chase: true },
    { id: 'cat', x: 300, y: 69, make: (g, c) => neonIcon('cat', CAT, g, c), glow: CYAN, core: CYANC },
    { id: 'neko', x: 316, y: 71, make: (g, c) => neonWord(['N', 'E', 'K', 'O'], g, c), glow: PINK, core: PINKC, dead: 1 },
    { id: 'hotel', x: 465, y: 10, make: (g, c) => neonWord(['H', 'O', 'T', 'E', 'L'], g, c, true), glow: PURP, core: PURPC },
  ];

  // ---------- palettes ----------
  const R = {
    asph: LB.ramp('#3a3c50', 5),
    walk: LB.ramp('#5e5c74', 5),
    curb: LB.ramp('#78758e', 5),
    plaster: LB.ramp('#6a5468', 5),
    timber: LB.ramp('#4a3234', 5),
    clad: LB.ramp('#68708c', 5),
    tar: LB.ramp('#403e52', 5),
    metal: LB.ramp('#2e2b4a', 5),
    conc: LB.ramp('#5a6070', 5),
    tile: LB.ramp('#3c5868', 5),
    pole: LB.ramp('#707080', 5),
    snow: ['#9aa6c6', '#c4cee4', '#e4eaf6', '#f6f8fd', '#ffffff'],
  };
  const INK = '#120e1c';
  const LIT = ['#ffd38a', '#ffd38a', '#a8d4ff', '#ff9fd2', '#8ab0ff', '#ffe0a8'];

  // ---------- state built once ----------
  let windows = [];      // {x, y, w, h, c, th, blinds}
  let ledges = [];       // {x0, x1, y} — where snow settles on the facades
  let puddleMask = null, ringPts = null, glintPts = null, wetMasks = {};
  let cables = [];

  // ---------- facade helpers ----------
  function ledge(P, x0, x1, y, Rr, deep) {
    P.hline(x0, x1 - 1, y, Rr[4]);
    P.hline(x0, x1 - 1, y + 1, Rr[3]);
    if (deep) P.hline(x0, x1 - 1, y + 2, Rr[2]);
    P.hline(x0, x1 - 1, y + (deep ? 3 : 2), Rr[0]);
    ledges.push({ x0, x1, y });
  }
  function drips(P, x0, x1, y, Rr, r, n) {
    for (let i = 0; i < n; i++) {
      const x = r.int(x0, x1 - 1), len = r.int(3, 11);
      P.vline(x, y, y + len, Rr[1]);
      if (r.chance(0.5)) P.vline(x + 1, y, y + Math.floor(len / 2), Rr[1]);
    }
  }
  function windowAt(P, x, y, w, h, Rr, r, o) {
    o = o || {};
    P.rect(x - 1, y - 1, w + 2, h + 2, Rr[0]);         // reveal
    P.rect(x, y, w, h, '#232742');                      // glass
    P.rect(x, y, w, 1, '#1a1c32');
    // sky caught in the glass: a diagonal streak, top left
    for (let k = 0; k < 5; k++) P.rect(x + 2 + k, y + 2 + k * 2, 2, 2, '#3c4466');
    P.px(x + 2, y + 2, '#56608a');
    P.vline(x + Math.floor(w / 2), y, y + h - 1, Rr[1]); // mullion
    if (o.blinds) for (let yy = y + 1; yy < y + Math.round(h * o.blinds); yy += 2) P.hline(x, x + w - 1, yy, '#8a8aa0');
    if (o.curtain) { P.rect(x, y, 4, h, o.curtain); P.rect(x + w - 4, y, 4, h, o.curtain); P.vline(x + 3, y, y + h - 1, LB.shade(o.curtain, -0.5)); }
    if (o.plant) { const px = x + w - 7; P.rect(px, y + h - 3, 5, 3, '#8a5a3c'); P.blob(px + 2, y + h - 6, 3.5, '#3c7a48', 4, 0.3); P.px(px + 1, y + h - 8, '#6aa86a'); }
    if (o.cat) { const cx = x + 4; P.rect(cx, y + h - 5, 5, 5, '#141220'); P.px(cx, y + h - 6, '#141220'); P.px(cx + 4, y + h - 6, '#141220'); }
    // sill
    P.rect(x - 2, y + h + 1, w + 4, 1, Rr[4]);
    P.rect(x - 2, y + h + 2, w + 4, 1, Rr[0]);
    ledges.push({ x0: x - 2, x1: x + w + 2, y: y + h + 1 });
    windows.push({ x, y, w, h, c: o.lit || r.pick(LIT), th: r.range(0.25, 0.85), blinds: o.blinds, curtain: o.curtain, plant: o.plant, cat: o.cat });
  }
  function acUnit(P, x, y, r) {
    const A = LB.ramp('#a4a8b4', 5);
    P.rect(x, y + 1, 13, 9, A[2]);
    P.rect(x, y, 13, 2, A[4]);                  // top face catches the light
    for (let k = 0; k < 3; k++) P.hline(x + 1, x + 6, y + 3 + k * 2, A[0]);
    P.disc(x + 9, y + 5, 2.4, A[0]); P.px(x + 9, y + 5, A[3]); P.px(x + 8, y + 4, A[1]);
    P.rect(x, y + 10, 13, 1, A[0]);
    P.rect(x + 2, y + 11, 1, 2, '#3a3646'); P.rect(x + 10, y + 11, 1, 2, '#3a3646');
    ledges.push({ x0: x, x1: x + 13, y });
    const dl = r.int(5, 14);
    P.vline(x + 3, y + 13, y + 13 + dl, 'rgba(20,16,30,0.28)');
  }
  function pipe(P, x, y0, y1) {
    P.rect(x, y0, 1, y1 - y0, '#8a8c9c'); P.rect(x + 1, y0, 1, y1 - y0, '#4c4c60');
    for (let y = y0 + 6; y < y1; y += 14) P.rect(x - 1, y, 4, 1, '#2a283a');
  }
  function board(P, x, y, w, h) {
    P.rect(x, y, w, h, '#1a1424');
    P.hline(x, x + w - 1, y, '#3a3050'); P.vline(x, y, y + h - 1, '#2e2640');
    P.hline(x, x + w - 1, y + h - 1, '#0c0a14');
    P.px(x + 2, y + 2, '#4a405e'); P.px(x + w - 3, y + 2, '#4a405e');
  }

  // ---------- the facades (one canvas, cached per season and snow) ----------
  function facades(S) {
    const key = 'arc-fac:' + S.season + ':' + S.snow;
    return LB.memo(key, () => {
      windows = []; ledges = [];
      const cv = LB.canvas(W, BASE + 1), ctx = LB.ctx2d(cv), P = LB.paint(ctx);
      const r = LB.rng(4242);
      // ---- B1: the noodle bar (0..100): old plaster over a timber shopfront
      P.rect(0, 0, 100, 64, R.plaster[2]);
      // plaster stains, calm: a few big soft patches in one step lighter and darker
      for (const [x, y, rr, c] of [[18, 40, 9, 1], [74, 14, 7, 3], [52, 50, 6, 1]]) { ctx.globalAlpha = 0.5; P.blob(x, y, rr, R.plaster[c], 9 + x, 0.4, 0.7); ctx.globalAlpha = 1; }
      windowAt(P, 10, -16, 22, 18, R.plaster, r, {});
      windowAt(P, 58, -16, 22, 18, R.plaster, r, { blinds: 0.6 });
      ledge(P, 0, 100, 8, R.plaster);
      windowAt(P, 10, 20, 22, 28, R.plaster, r, { blinds: 0.45, plant: true });
      windowAt(P, 60, 20, 22, 28, R.plaster, r, { curtain: '#b04860', lit: '#ffd38a' });
      acUnit(P, 38, 30, r);
      drips(P, 10, 34, 51, R.plaster, r, 3);
      pipe(P, 96, 0, 136);
      ledge(P, 0, 100, 62, R.timber, true);
      // ground floor timber frame
      P.rect(0, 66, 100, 70, R.timber[1]);
      P.rect(2, 66, 4, 70, R.timber[2]); P.rect(2, 66, 1, 70, R.timber[3]);
      P.rect(93, 66, 4, 70, R.timber[2]); P.rect(93, 66, 1, 70, R.timber[3]);
      board(P, 14, 68, 72, 14);
      // the opening: a warm dark kitchen
      P.rect(6, 84, 87, 52, '#2a1a1e');
      P.rect(6, 84, 87, 2, '#170e12');
      kitchen(P, false);
      // noren: four indigo cloth panels
      for (let k = 0; k < 4; k++) {
        const nx = 9 + k * 21;
        P.rect(nx, 84, 19, 14, '#2c3a72'); P.rect(nx, 84, 19, 2, '#3e4e8e');
        P.rect(nx, 97, 19, 1, '#1e2852');
        P.vline(nx + 18, 86, 97, '#22306a');
        if (k === 1 || k === 2) glyph(P, K5[k === 1 ? 'ra' : 'me'], nx + 7, 89, '#e8e4f0');
      }
      P.hline(6, 92, 84, '#5a3a24');
      // ---- B2: the convenience store (100..186): cladding panels
      P.rect(100, 0, 86, 64, R.clad[2]);
      for (let x = 117; x < 186; x += 17) { P.vline(x, 0, 63, R.clad[1]); P.vline(x + 1, 0, 63, R.clad[3]); }
      P.hline(100, 185, 30, R.clad[1]); P.hline(100, 185, 31, R.clad[3]);
      windowAt(P, 124, -16, 20, 18, R.clad, r, {});
      windowAt(P, 156, -16, 20, 18, R.clad, r, { blinds: 1 });
      ledge(P, 100, 186, 8, R.clad);
      windowAt(P, 124, 18, 20, 26, R.clad, r, { cat: true });
      windowAt(P, 156, 18, 20, 26, R.clad, r, { blinds: 0.7 });
      acUnit(P, 128, 49, r);
      acUnit(P, 160, 49, r);
      board(P, 103, 6, 11, 58);
      pipe(P, 183, 0, 136);
      ledge(P, 100, 186, 62, R.clad, true);
      // ground floor: aluminium frame, the lightbox band, the glass front
      P.rect(100, 66, 86, 70, '#8a90a4');
      P.rect(104, 67, 78, 15, '#c8ccd4');                     // the lightbox (lit by emissive)
      P.rect(104, 84, 78, 52, '#1c2030');
      P.rect(102, 84, 2, 52, '#b0b6c6'); P.rect(182, 84, 2, 52, '#5c6274');
      P.rect(132, 84, 2, 52, '#9aa0b2'); P.rect(152, 84, 2, 52, '#9aa0b2');
      P.rect(104, 132, 78, 4, '#5a6072');
      // ---- B3: the bar (186..290): a low building, its roof seen from above
      P.rect(186, 0, 104, 56, R.tar[2]);
      for (let y = 6; y < 56; y += 9) P.hline(186, 289, y, R.tar[1]);
      for (let y = 7; y < 56; y += 9) P.hline(186, 289, y, R.tar[3]);
      // water tank on stilts
      P.rect(197, 34, 2, 14, '#3a3040'); P.rect(213, 34, 2, 14, '#3a3040'); P.rect(205, 36, 2, 12, '#2a2232');
      P.rect(195, 10, 22, 26, '#8a6a52'); P.rect(195, 10, 6, 26, '#a8866a'); P.rect(211, 10, 6, 26, '#6a4e3e');
      P.ellipse(206, 10, 11, 3, '#b8987a'); P.ellipse(206, 10, 8, 2, '#9a7a62');
      for (const yy of [16, 24, 32]) P.hline(195, 216, yy, '#4e3a30');
      // roof AC units: big fans seen from above
      for (const [ax, ay] of [[232, 30], [258, 16]]) {
        P.rect(ax, ay, 18, 12, '#9ea2b0'); P.rect(ax, ay, 18, 1, '#c4c8d4');
        P.disc(ax + 9, ay + 6, 4.6, '#2c2c3a'); P.line(ax + 6, ay + 3, ax + 12, ay + 9, '#6a6c7c'); P.line(ax + 12, ay + 3, ax + 6, ay + 9, '#6a6c7c');
        P.rect(ax, ay + 12, 18, 4, '#6a6e7e'); for (let k = 0; k < 4; k++) P.vline(ax + 2 + k * 4, ay + 12, ay + 15, '#4a4c5c');
        ledges.push({ x0: ax, x1: ax + 18, y: ay, roof: true });
      }
      // vent pipe, antenna, holo projector
      P.rect(226, 14, 5, 14, '#7a7c8a'); P.rect(226, 14, 2, 14, '#a0a2b0'); P.rect(225, 12, 7, 3, '#5a5c6c');
      P.rect(281, 4, 1, 40, '#2a2838'); P.rect(278, 14, 7, 1, '#2a2838'); P.rect(279, 24, 5, 1, '#2a2838'); P.rect(280, 44, 3, 3, '#3a3848');
      P.rect(240, 46, 10, 6, '#3a3850'); P.rect(240, 46, 10, 1, '#5a5870'); P.rect(244, 45, 3, 2, '#2a6a7a');
      // parapet
      P.rect(186, 56, 104, 6, R.tar[1]);
      P.hline(186, 289, 56, R.tar[4]); P.hline(186, 289, 57, R.tar[3]);
      P.hline(186, 289, 62, R.metal[0]);
      ledges.push({ x0: 186, x1: 290, y: 56 });
      // the metal front, horizontal panels with rivets
      P.rect(186, 63, 104, 73, R.metal[2]);
      for (let y = 74; y < 136; y += 12) { P.hline(186, 289, y, R.metal[1]); P.hline(186, 289, y + 1, R.metal[3]); for (let x = 190; x < 290; x += 10) P.px(x, y + 3, R.metal[4]); }
      // the lounge window band
      P.rect(195, 67, 86, 24, R.metal[0]);
      P.rect(196, 68, 84, 22, '#241c3a');
      for (let x = 196; x < 280; x += 14) P.vline(x, 68, 89, R.metal[1]);
      for (let k = 0; k < 6; k++) P.rect(198 + k * 14, 70, 3, 2, '#3a3256');
      ledges.push({ x0: 195, x1: 281, y: 66 });
      // door, portholes
      P.rect(250, 102, 22, 34, R.metal[0]);
      P.rect(252, 104, 18, 32, '#2a1a3e');
      P.rect(252, 104, 18, 1, '#120c1e');
      P.vline(261, 104, 135, '#1a1028');
      for (const px of [204, 228]) { P.disc(px, 121, 6, R.metal[0]); P.disc(px, 121, 4.4, '#1c2a3a'); P.px(px - 2, 119, '#3a5268'); }
      P.rect(282, 118, 5, 6, '#7a4a3a'); P.blob(284, 114, 4, '#2e6a44', 12, 0.35);
      // ---- B4: concrete apartments over a shuttered shop (290..378)
      P.rect(290, 0, 88, 64, R.conc[2]);
      for (let y = 4; y < 62; y += 12) for (let x = 296; x < 376; x += 16) { P.px(x, y, R.conc[0]); P.px(x, y + 1, R.conc[3]); }
      windowAt(P, 300, -16, 22, 18, R.conc, r, { blinds: 0.8 });
      windowAt(P, 342, -16, 22, 18, R.conc, r, {});
      ledge(P, 290, 378, 8, R.conc);
      // balcony: sliding door, plants, laundry, railing
      P.rect(302, 16, 34, 40, R.conc[0]);
      P.rect(303, 17, 32, 39, '#242842');
      P.vline(319, 17, 55, R.conc[1]);
      for (let k = 0; k < 4; k++) P.rect(305 + k, 19 + k * 3, 2, 2, '#3c4466');
      windows.push({ x: 303, y: 17, w: 32, h: 39, c: '#ffcf86', th: 0.4, curtain: '#c87a50' });
      P.line(338, 22, 374, 24, '#d8d4e0');
      const clothes = [[341, '#e05a6a', 7, 8], [350, '#f0e6d0', 5, 9], [357, '#5aa0d8', 6, 7], [365, '#f0d050', 4, 5], [370, '#e8e8f0', 3, 4]];
      for (const [cx, cc, cw, ch] of clothes) { P.rect(cx, 23, cw, ch, cc); P.rect(cx, 23, cw, 1, LB.shade(cc, 0.4)); P.rect(cx + cw - 1, 24, 1, ch - 1, LB.shade(cc, -0.4)); }
      for (const [px, pc] of [[342, '#3c7a48'], [360, '#4a8a3a'], [370, '#7a3a6a']]) {
        P.rect(px - 3, 50, 7, 6, '#9a5a3a'); P.rect(px - 3, 50, 7, 1, '#c07a50');
        P.blob(px, 44, 5, pc, px, 0.4); P.blob(px - 1, 42, 3, LB.shade(pc, 0.4), px + 3, 0.3);
      }
      P.rect(296, 56, 80, 2, R.conc[4]); P.rect(296, 58, 80, 4, R.conc[2]); P.hline(296, 375, 62, R.conc[0]);
      P.rect(296, 39, 80, 1, '#b8bccb'); P.rect(296, 40, 80, 1, '#5a5e70');
      for (let x = 297; x < 376; x += 3) P.vline(x, 41, 55, '#3e4254');
      ledges.push({ x0: 296, x1: 376, y: 39 }); ledges.push({ x0: 296, x1: 376, y: 56 });
      pipe(P, 291, 0, 136);
      ledge(P, 290, 378, 63, R.conc, false);
      // ground floor: sign board, the shutter, a side door
      P.rect(290, 66, 88, 70, R.conc[1]);
      board(P, 296, 67, 76, 15);
      P.rect(295, 85, 66, 51, R.conc[0]);
      for (let y = 87; y < 132; y += 3) { P.hline(296, 359, y, '#9a9cac'); P.hline(296, 359, y + 1, '#767888'); P.hline(296, 359, y + 2, '#585a6c'); }
      P.rect(296, 131, 64, 5, '#4a4c5c'); P.rect(324, 132, 8, 2, '#a8aab8');
      graffiti(P, 300, 96);
      P.rect(363, 90, 13, 46, R.conc[0]); P.rect(364, 92, 11, 44, '#3a3c50'); P.rect(366, 96, 7, 8, '#20223a'); P.px(372, 116, '#c8c8d0');
      P.rect(366, 86, 6, 3, '#4a4a5a');
      // ---- the alley (378..390): deep and dark
      P.rect(378, 0, 12, 136, '#141222');
      P.vline(378, 0, 135, '#22203a'); P.vline(389, 0, 135, '#0c0a14');
      pipe(P, 383, 0, 136);
      P.rect(380, 112, 8, 6, '#3a3848'); P.rect(380, 112, 8, 1, '#5a586c');
      P.blob(384, 132, 4, '#1c1a28', 3, 0.3);
      // ---- B5: the hotel (390..480): teal tile
      P.rect(390, 0, 90, 64, R.tile[2]);
      for (let y = 3, row = 0; y < 62; y += 6, row++) {
        P.hline(390, 479, y, LB.mix(R.tile[2], R.tile[1], 0.6));
        for (let x = 390 + (row % 2) * 5; x < 480; x += 10) P.vline(x, y + 1, y + 5, LB.mix(R.tile[2], R.tile[1], 0.45));
      }
      windowAt(P, 400, -16, 20, 18, R.tile, r, { curtain: '#d8b878' });
      windowAt(P, 432, -16, 20, 18, R.tile, r, {});
      ledge(P, 390, 480, 8, R.tile);
      windowAt(P, 400, 20, 20, 26, R.tile, r, { curtain: '#d8b878', lit: '#ffd38a' });
      windowAt(P, 432, 20, 20, 26, R.tile, r, { curtain: '#d8b878', lit: '#ffe0a8' });
      acUnit(P, 436, 50, r);
      board(P, 462, 7, 13, 48);
      ledge(P, 390, 480, 62, R.tile, true);
      P.rect(390, 66, 90, 70, R.tile[1]);
      for (let y = 70; y < 136; y += 6) P.hline(390, 479, y, LB.mix(R.tile[1], R.tile[0], 0.5));
      // lobby doors (lit by emissive), side windows
      P.rect(415, 90, 40, 46, '#3a2e2a'); P.rect(417, 92, 36, 44, '#4a3426');
      P.vline(435, 92, 135, '#2a1e1a');
      P.rect(397, 96, 12, 26, R.tile[0]); P.rect(398, 97, 10, 24, '#2a3046');
      P.rect(461, 96, 12, 26, R.tile[0]); P.rect(462, 97, 10, 24, '#2a3046');
      windows.push({ x: 398, y: 97, w: 10, h: 24, c: '#ffd9a0', th: 0.3, curtain: '#d8b878' });
      windows.push({ x: 462, y: 97, w: 10, h: 24, c: '#ffd9a0', th: 0.55, curtain: '#d8b878' });
      // base shadow line along every building
      P.hline(0, 479, 135, '#16121e');
      // ---- snow on every ledge, sill, AC unit, the roof
      if (S.snow > 0) snowOnFacade(P, S);
      // ---- unlit neon (the tubes by day)
      for (const s of SIGNS) ctx.drawImage(s.make(dull(s.glow), LB.mix(s.core, '#5a5470', 0.55)), s.x, s.y);
      return cv;
    });
  }
  // the back of the noodle bar, seen between the noren and the counter: shelves of bowls, bottles, the menu
  function kitchen(P, lit) {
    const wood = lit ? '#e8a060' : '#5a3a2c', bowl = lit ? '#fff6ea' : '#a8a098', rim = lit ? '#ff5a5a' : '#7a2a32';
    for (const sy of [108, 118]) P.hline(9, 56, sy, wood);
    for (let x = 11; x < 54; x += 6) { P.rect(x, 105, 4, 3, bowl); P.px(x, 105, rim); }
    const bottles = ['#6ac08a', '#e8c050', '#d85a5a', '#8ab0e8', '#f0e8d8'];
    for (let x = 11, k = 0; x < 55; x += 3, k++) P.rect(x, 114 + (k % 2), 1, 4 - (k % 2), lit ? bottles[k % 5] : LB.mix(bottles[k % 5], '#2a1a1e', 0.6));
    const board = lit ? '#fff2d8' : '#8a8070';
    P.rect(61, 100, 26, 15, board); P.rect(61, 100, 26, 1, lit ? '#ffffff' : '#a8a090'); P.rect(61, 114, 26, 1, lit ? '#c8a878' : '#5a5040');
    for (let k = 0; k < 3; k++) { P.hline(64, 64 + [16, 12, 18][k], 103 + k * 4, '#3a2a2a'); P.px(84, 103 + k * 4, '#c03040'); }
  }
  // a silhouette in a lit window: head, shoulders, body, h px tall standing on y
  function person(P, x, y, h, c) {
    P.disc(x, y - h + 2, 2.4, c);
    P.rect(x - 3, y - h + 5, 7, 2, c); P.rect(x - 2, y - h + 6, 5, h - 6, c);
  }
  function graffiti(P, x, y) {
    const spr = LB.sprite('arc-graffiti', 58, 32, (Q) => {
      // a big bubbly tag: three fat letters in two colours, a light rim, a few drips
      const blobs = [[9, 15, 9, '#e85a9a'], [24, 14, 9, '#e85a9a'], [39, 16, 9, '#e85a9a'], [16, 20, 6, '#f08ab8'], [33, 21, 6, '#f08ab8'], [47, 13, 6, '#3cc0c8']];
      for (const [bx, by, br, bc] of blobs) Q.blob(bx, by, br, bc, bx * 3 + by, 0.3, 0.8);
      for (const [bx, by] of [[9, 15], [24, 14], [39, 16]]) { Q.rect(bx - 2, by - 4, 5, 2, '#ffd0e4'); Q.px(bx - 1, by - 5, '#ffffff'); }
      Q.rect(14, 22, 1, 8, '#e85a9a'); Q.rect(30, 23, 1, 6, '#e85a9a'); Q.rect(42, 24, 1, 5, '#e85a9a');
      Q.rect(48, 6, 2, 2, '#f0d050'); Q.rect(52, 4, 1, 1, '#f0d050'); Q.rect(51, 9, 1, 1, '#f0d050');
    }, { outline: '#1a1028' });
    P.ctx.drawImage(spr, x, y);
  }
  function snowOnFacade(P, S) {
    const r = LB.rng(77);
    const thick = S.snow >= 1 ? 2 : 1;
    for (const l of ledges) {
      if (l.roof) continue;
      for (let x = l.x0; x < l.x1; x++) {
        const lump = LB.hash(x, l.y, 3) > 0.7 ? 1 : 0;
        const h = thick + lump;
        P.rect(x, l.y - h + 1, 1, h, R.snow[3]);
        P.px(x, l.y - h + 1, R.snow[4]);
        if (LB.hash(x, l.y, 9) > 0.86) P.px(x, l.y + 1, R.snow[2]); // a crumb fallen over the lip
      }
      P.px(l.x0, l.y, R.snow[1]); P.px(l.x1 - 1, l.y, R.snow[1]);
    }
    // the bar's roof under snow: big calm drifts, the tank and fans capped
    if (S.snow >= 1) {
      // the bar's roof under a smooth blanket: soft blue shade where the tank, fans and parapet stand
      P.rect(186, 0, 104, 56, R.snow[3]);
      for (let y = 6; y < 56; y += 9) P.hline(186, 289, y, LB.mix(R.snow[3], R.snow[2], 0.5));
      P.rect(186, 52, 104, 4, R.snow[2]); P.hline(186, 289, 55, R.snow[1]);
      P.ellipse(212, 49, 14, 3, R.snow[1]);
      for (const [ax, ay] of [[232, 30], [258, 16]]) P.rect(ax + 2, ay + 16, 18, 3, R.snow[1]);
      P.rect(195, 34, 2, 14, '#3a3040'); P.rect(213, 34, 2, 14, '#3a3040'); P.rect(205, 36, 2, 12, '#2a2232');
      P.rect(195, 10, 22, 26, '#8a6a52'); P.rect(195, 10, 6, 26, '#a8866a'); P.rect(211, 10, 6, 26, '#6a4e3e');
      for (const yy of [16, 24, 32]) P.hline(195, 216, yy, '#4e3a30');
      P.ellipse(206, 10, 11, 3, R.snow[4]); P.ellipse(206, 11, 10, 2, R.snow[3]);
      for (const [ax, ay] of [[232, 30], [258, 16]]) {
        P.rect(ax, ay, 18, 12, R.snow[3]); P.hline(ax, ax + 17, ay, R.snow[4]);
        P.disc(ax + 9, ay + 6, 4.6, '#2c2c3a'); P.disc(ax + 9, ay + 6, 2, '#5a5c6c');
        P.rect(ax, ay + 12, 18, 4, '#6a6e7e'); for (let k = 0; k < 4; k++) P.vline(ax + 2 + k * 4, ay + 12, ay + 15, '#4a4c5c');
      }
      P.rect(226, 14, 5, 14, '#7a7c8a'); P.rect(226, 14, 2, 14, '#a0a2b0'); P.rect(225, 12, 7, 3, R.snow[4]);
      P.rect(240, 46, 10, 6, '#3a3850'); P.rect(240, 45, 10, 2, R.snow[4]); P.rect(244, 47, 3, 2, '#2a6a7a');
      P.rect(281, 4, 1, 40, '#2a2838'); P.rect(278, 14, 7, 1, '#2a2838'); P.rect(279, 24, 5, 1, '#2a2838');
    } else {
      // a light dusting: the seams of the roof membrane hold a line of snow
      for (let y = 6; y < 56; y += 9) P.hline(186, 289, y - 1, R.snow[2]);
      P.hline(186, 289, 55, R.snow[2]);
    }
  }

  // ---------- sprites on the sidewalks ----------
  const vending = () => LB.sprite('arc-vend', 20, 44, (P) => {
    const B = LB.ramp('#d84a5a', 5);
    P.rect(1, 3, 18, 40, B[2]);
    P.rect(1, 1, 18, 3, B[4]); P.rect(1, 1, 18, 1, LB.shade(B[4], 0.5));
    P.rect(16, 3, 3, 40, B[1]);
    P.rect(3, 6, 12, 18, '#1c2034');                   // the display window (lit by emissive)
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) P.rect(4 + k * 3, 8 + row * 6, 2, 4, ['#5ac0e8', '#e8e050', '#f07a5a', '#7ae08a'][(row + k) % 4]);
    P.rect(3, 26, 12, 6, B[3]); for (let k = 0; k < 4; k++) P.px(4 + k * 3, 28, '#2a2a3a');
    P.rect(4, 35, 10, 5, '#141420'); P.rect(4, 35, 10, 1, '#2a2a3a');
    P.rect(1, 42, 18, 1, B[0]);
  }, { outline: 'sel' });
  const counter = () => LB.sprite('arc-counter', 84, 26, (P) => {
    const Wd = LB.ramp('#9a6a44', 5);
    P.rect(1, 1, 82, 6, Wd[3]); P.rect(1, 1, 82, 1, Wd[4]);
    for (let x = 10; x < 82; x += 18) P.vline(x, 1, 6, Wd[2]);
    P.rect(1, 7, 82, 18, Wd[1]);
    for (let x = 1; x < 82; x += 6) P.vline(x, 7, 24, Wd[0]);
    P.rect(1, 7, 82, 1, Wd[0]);
    // a cloth banner on the front: red with white glyphs
    P.rect(30, 9, 24, 13, '#b8303e'); P.rect(30, 9, 24, 1, '#e05060'); P.rect(30, 21, 24, 1, '#7a1a26');
    glyph(P, K5.ra, 32, 12, '#f4ece8'); glyph(P, K5.n, 40, 12, '#f4ece8'); P.px(47, 14, '#f4ece8'); P.px(48, 14, '#f4ece8');
    // bowls and the stock pot on top
    for (const bx of [14, 26]) { P.ellipse(bx, 4, 4, 1, '#ece4d8'); P.hline(bx - 3, bx + 3, 5, '#b03040'); }
    P.rect(58, 0, 14, 6, '#5a5c6c'); P.rect(58, 0, 14, 2, '#8a8c9c'); P.ellipse(65, 1, 6, 1, '#2a2a36');
  }, { outline: 'sel' });
  const stool = () => LB.sprite('arc-stool', 12, 12, (P) => {
    P.rect(5, 4, 2, 7, '#9aa0b0'); P.rect(5, 4, 1, 7, '#c8ccd8');
    P.ellipse(6, 10, 3, 1, '#4a4c5c');
    P.ellipse(6, 3, 4, 2, '#c03848'); P.hline(4, 7, 2, '#e85a6a');
  }, { outline: 'sel' });
  const utilityPole = (S) => LB.sprite('arc-pole:' + S.snow, 34, 134, (P) => {
    const Q = R.pole;
    P.rect(15, 4, 5, 130, Q[2]); P.rect(15, 4, 1, 130, Q[4]); P.rect(16, 4, 1, 130, Q[3]); P.rect(19, 4, 1, 130, Q[0]);
    P.rect(3, 8, 28, 3, '#5a5a68'); P.rect(3, 8, 28, 1, '#8a8a98');
    for (const ix of [5, 12, 23, 29]) { P.rect(ix, 5, 2, 3, '#e0e0e8'); P.px(ix, 5, '#ffffff'); }
    // transformer can
    P.rect(21, 22, 10, 16, '#7a7c88'); P.rect(21, 22, 3, 16, '#9a9cac'); P.rect(29, 22, 2, 16, '#5a5c68'); P.rect(21, 21, 10, 2, '#a8aab8');
    // the posters and stickers wrapped round its foot; a yellow sign plate
    P.rect(14, 74, 7, 10, '#e8c838'); P.rect(15, 76, 5, 1, '#2a2a2a'); P.rect(15, 79, 4, 1, '#2a2a2a');
    P.rect(14, 96, 7, 12, '#e8e4dc'); P.rect(15, 98, 5, 1, '#c03040'); P.rect(15, 101, 4, 1, '#3a3a4a'); P.rect(15, 103, 5, 1, '#3a3a4a');
    P.rect(14, 110, 7, 5, '#5ab0d8'); P.rect(14, 116, 7, 3, '#f07ab0');
    P.rect(13, 131, 9, 3, '#4a4a58');
    if (S.snow > 0) { P.rect(15, 3, 5, 2, R.snow[4]); P.hline(3, 30, 7, R.snow[3]); P.hline(21, 30, 20, R.snow[4]); }
  }, { outline: 'sel' });
  const streetLamp = (S) => LB.sprite('arc-lamp:' + S.snow, 30, 128, (P) => {
    P.rect(22, 14, 3, 112, '#3a3c4c'); P.rect(22, 14, 1, 112, '#6a6c7c');
    P.rect(20, 120, 7, 8, '#2c2e3c'); P.rect(20, 120, 7, 1, '#5a5c6c');
    // the arm curving out over the street, the long luminaire
    P.line(23, 14, 18, 8, '#3a3c4c'); P.line(18, 8, 10, 6, '#3a3c4c'); P.line(23, 15, 18, 9, '#2a2c38');
    P.rect(2, 4, 13, 4, '#2a2c3a'); P.rect(2, 4, 13, 1, '#5a5c6c'); P.rect(3, 8, 11, 1, '#b8d8ec');
    if (S.snow > 0) { P.rect(2, 3, 13, 1, R.snow[4]); P.rect(22, 13, 3, 1, R.snow[4]); }
  }, { outline: 'sel' });
  const planterTree = (S) => LB.sprite('arc-tree:' + S.season + ':' + S.snow, 46, 64, (P) => {
    const conc = LB.ramp('#8a8898', 5);
    P.rect(9, 52, 28, 11, conc[2]); P.rect(9, 52, 28, 3, conc[4]); P.rect(10, 53, 26, 2, '#4a3628'); P.rect(9, 62, 28, 1, conc[0]);
    P.rect(22, 30, 3, 23, '#5a3e30'); P.rect(22, 30, 1, 23, '#7a5440');
    const r = LB.rng(31);
    if (S.season === 'winter') {
      for (const [a, b, c2, d] of [[23, 34, 14, 22], [23, 36, 32, 24], [14, 22, 10, 14], [32, 24, 36, 15], [23, 30, 22, 12], [22, 12, 18, 6], [23, 14, 28, 6]]) P.line(a, b, c2, d, '#5a3e30');
      if (S.snow > 0) for (const [x, y] of [[14, 21], [10, 13], [32, 23], [36, 14], [22, 11], [18, 5], [28, 5]]) { P.rect(x - 1, y, 3, 1, R.snow[4]); }
      P.rect(10, 52, 26, 3, R.snow[3]);
      return;
    }
    const base = { spring: '#f0a0c0', summer: '#4a8c48', autumn: '#e0782c' }[S.season];
    const Rm = LB.ramp(base, 5);
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 14;
      const x = 23 + Math.cos(a) * d * 1.2, y = 20 + Math.sin(a) * d * 0.85;
      const lit = (23 - x) * 0.025 + (20 - y) * 0.05 + r() * 0.6;
      P.blob(x, y, 4 + r() * 2.5, Rm[LB.clamp(Math.round(1.4 + lit * 1.8), 0, 4)], i + 3, 0.3);
    }
    if (S.season === 'spring') for (let i = 0; i < 10; i++) P.px(10 + r.int(0, 26), 8 + r.int(0, 22), '#fff4f8');
  }, { outline: 'sel' });
  const bollard = () => LB.sprite('arc-bollard', 8, 16, (P) => {
    P.rect(2, 3, 4, 12, '#5a5c6c'); P.rect(2, 3, 1, 12, '#8a8c9c'); P.rect(2, 2, 4, 2, '#a8aab8');
    P.rect(2, 7, 4, 2, '#e0c040');
  }, { outline: 'sel' });
  const bins = () => LB.sprite('arc-bins', 30, 22, (P) => {
    for (const [bx, c] of [[2, '#3a6ab8'], [15, '#3a8a5a']]) {
      const B = LB.ramp(c, 5);
      P.rect(bx, 5, 12, 16, B[2]); P.rect(bx, 5, 3, 16, B[3]); P.rect(bx + 10, 5, 2, 16, B[1]);
      P.rect(bx - 1, 2, 14, 4, B[3]); P.rect(bx - 1, 2, 14, 1, B[4]);
      P.rect(bx + 4, 10, 4, 4, '#e8e8f0');
    }
  }, { outline: 'sel' });
  const bicycle = () => LB.sprite('arc-bike', 30, 20, (P) => {
    const ring = (cx, cy) => { for (let a = 0; a < 32; a++) { const t = (a / 32) * Math.PI * 2; P.px(cx + Math.round(Math.cos(t) * 5), cy + Math.round(Math.sin(t) * 5), '#2a2a36'); } P.px(cx, cy, '#8a8a9a'); };
    ring(7, 13); ring(22, 13);
    P.line(7, 13, 13, 7, '#d04a5a'); P.line(13, 7, 21, 7, '#d04a5a'); P.line(13, 7, 15, 13, '#d04a5a'); P.line(15, 13, 7, 13, '#d04a5a'); P.line(21, 7, 22, 13, '#d04a5a'); P.line(15, 13, 21, 7, '#d04a5a');
    P.rect(11, 5, 5, 1, '#2a2a36'); P.line(21, 7, 20, 3, '#5a5a6a'); P.rect(18, 3, 5, 1, '#2a2a36');
    P.rect(19, 4, 6, 3, '#9aa0b0');
  }, { outline: 'sel' });
  // hover cars, facing right
  function carSprite(key, body, accent) {
    return LB.sprite('arc-car:' + key, 62, 30, (P) => {
      const B = LB.ramp(body, 5);
      P.rect(18, 1, 26, 6, B[4]); P.rect(18, 1, 26, 1, LB.shade(B[4], 0.4));          // roof
      P.rect(30, 0, 8, 2, accent);                                                      // roof light
      P.rect(14, 6, 34, 8, '#20243a');                                                  // cabin glass
      P.rect(15, 7, 4, 2, '#4a5478'); P.rect(20, 8, 3, 1, '#4a5478');
      P.vline(30, 6, 13, B[1]); P.vline(46, 6, 13, B[1]);
      P.rect(46, 9, 13, 5, B[3]); P.rect(3, 9, 11, 5, B[3]);                            // hood and boot from above
      P.rect(2, 14, 58, 10, B[2]); P.hline(2, 59, 15, B[4]);                            // the side
      P.hline(2, 59, 22, B[0]); P.hline(2, 59, 23, B[0]);
      P.vline(30, 14, 21, B[1]); P.vline(45, 14, 21, B[1]);
      P.rect(6, 18, 18, 1, accent); P.rect(36, 18, 18, 1, accent);
      P.rect(10, 24, 42, 2, '#1a1c28');                                                  // hover pods
    }, { outline: 'sel' });
  }

  // ---------- ground ----------
  function puddles() {
    return [[78, 186, 24], [232, 214, 30], [352, 180, 19], [446, 219, 17], [150, 224, 12], [262, 254, 13], [404, 257, 10], [246, 149, 9], [36, 252, 9]];
  }
  function slabs(P, x0, x1, y0, y1, hgt, len, Rr, seed) {
    const r = LB.rng(seed);
    for (let y = y0, row = 0; y < y1; y += hgt, row++) {
      for (let x = x0 - (row % 2) * Math.floor(len / 2); x < x1; x += len) {
        const tone = r.chance(0.3) ? (r.chance(0.5) ? 1 : 3) : 2;
        const yy = Math.min(y1, y + hgt);
        P.rect(Math.max(x0, x), y, Math.min(len, x1 - Math.max(x0, x)), yy - y, LB.mix(Rr[2], Rr[tone], 0.5));
        P.hline(Math.max(x0, x), Math.min(x1 - 1, x + len - 1), y, Rr[3]);          // a light top edge
        if (x > x0) P.vline(x, y, yy - 1, Rr[1]);
        if (r.chance(0.08)) P.line(x + 4, y + 2, x + 9, yy - 2, Rr[1]);              // a crack
      }
      P.hline(x0, x1 - 1, Math.min(y1, y + hgt) - 1, Rr[1]);
    }
  }
  function drawGround(ctx, S, P) {
    // far sidewalk
    slabs(P, 0, W, 136, 154, 9, 22, R.walk, 7);
    P.hline(0, W - 1, 136, '#2a2636');
    // tactile paving strip
    P.rect(0, 154, W, 5, '#b89a3a'); P.hline(0, W - 1, 154, '#d8bc58'); P.hline(0, W - 1, 158, '#8a7228');
    for (let x = 1; x < W; x += 3) { P.px(x, 156, '#e8cc6a'); P.px(x, 157, '#9a8230'); }
    // the red carpet from the hotel doors
    P.rect(418, 136, 34, 18, '#9a2a3a'); P.hline(418, 451, 136, '#c04050'); P.vline(418, 136, 153, '#c04050'); P.vline(451, 136, 153, '#6a1828');
    P.hline(420, 449, 138, '#d8b060'); P.hline(420, 449, 151, '#d8b060');
    // a steam grate
    P.rect(326, 141, 18, 8, '#1a1824'); for (let x = 327; x < 344; x += 2) P.vline(x, 142, 147, '#4a4858');
    P.hline(326, 343, 141, '#6a6878');
    // curb and gutter
    P.rect(0, 159, W, 1, R.curb[4]); P.rect(0, 160, W, 3, R.curb[2]); P.hline(0, W - 1, 162, R.curb[1]);
    for (let x = 18; x < W; x += 30) P.vline(x, 159, 162, R.curb[1]);
    P.rect(0, 163, W, 1, '#1c1a28');
    P.rect(208, 160, 14, 3, '#141220'); for (let x = 209; x < 222; x += 2) P.vline(x, 160, 162, '#3a3848');
    // the street
    const A = R.asph;
    P.rect(0, 164, W, ST1 - 164, A[2]);
    // aggregate: small clusters on a coarse grid, sparse and calm
    for (let gy = 164; gy < ST1; gy += 5) for (let gx = 0; gx < W; gx += 7) {
      const h = LB.hash(gx, gy, 11);
      if (h < 0.1) { P.px(gx + 2, gy + 1, A[3]); P.px(gx + 3, gy + 1, A[3]); } else if (h > 0.9) { P.px(gx + 1, gy + 2, A[1]); P.px(gx + 2, gy + 3, A[1]); }
    }
    // wet tyre tracks: a touch darker where the wheels run
    ctx.save(); ctx.globalAlpha = 0.35;
    for (const ty of [172, 189, 207, 224]) P.rect(0, ty, W, 4, A[1]);
    ctx.restore();
    // centre line, worn
    for (let x = 6; x < W; x += 34) { P.rect(x, LANE, 20, 2, '#c8b060'); P.px(x + 6, LANE, A[2]); P.px(x + 15, LANE + 1, A[2]); }
    // crosswalk
    for (let y = 168; y < ST1 - 2; y += 8) {
      P.rect(414, y, 52, 4, '#d4d4dc'); P.hline(414, 465, y, '#ececf2');
      for (let k = 0; k < 5; k++) { const x = 414 + Math.floor(LB.hash(k, y, 3) * 50); P.rect(x, y + 1 + (k % 2), 2, 2, A[2]); }
    }
    // manhole, an oil stain, cracks
    P.ellipse(120, 214, 9, 4, '#2a2c3c'); P.ellipse(120, 214, 7, 3, '#4a4c5e');
    for (let k = -6; k <= 6; k += 3) P.vline(120 + k, 212, 216, '#34364a');
    P.hline(113, 127, 212, '#5a5c70');
    P.ellipse(300, 222, 10, 3, '#2c2c3e'); P.px(296, 221, '#7a5aa8'); P.px(297, 221, '#4a9a8a'); P.px(303, 222, '#9a6aa8'); P.px(304, 223, '#5aa898');
    for (const [x0, y0, len] of [[40, 210, 22], [190, 176, 18], [384, 202, 24]]) {
      let x = x0, y = y0;
      for (let k = 0; k < len; k++) { P.px(x, y, A[0]); P.px(x, y - 1, A[3]); x += 1; if (LB.hash(k, x0, 4) > 0.6) y += LB.hash(k, y0, 5) > 0.5 ? 1 : -1; }
    }
    // near curb and the near sidewalk
    P.rect(0, 233, W, 1, '#1c1a28');
    P.rect(0, 234, W, 3, R.curb[3]); P.hline(0, W - 1, 234, R.curb[4]);
    for (let x = 10; x < W; x += 30) P.vline(x, 234, 236, R.curb[1]);
    slabs(P, 0, W, 237, H, 11, 24, R.walk, 9);
    // puddle beds: a darker wet rim, a deep middle
    for (const [x, y, r] of puddles()) {
      P.blob(x, y, r + 2, LB.mix(A[1], A[0], 0.3), x * 7 + y, 0.25, 0.42);
      P.blob(x, y, r, '#1e2034', x * 7 + y, 0.25, 0.42);
    }
    // seasons on the ground
    if (S.snow >= 1) groundSnow(P, S);
    else if (S.snow > 0) dusting(P);
    if (S.season === 'autumn') litter(P, ['#e0782c', '#c84a2a', '#f0b040', '#9a5a2a'], 70);
    if (S.season === 'spring') litter(P, ['#f8c0d4', '#ffe4ee', '#f0a0c0'], 60);
  }
  function litter(P, cols, n) {
    const r = LB.rng(51);
    for (let i = 0; i < n; i++) {
      // leaves gather round the tree, in the gutters and at the walls
      const zone = r();
      let x, y;
      if (zone < 0.45) { x = 150 + r.range(-30, 34); y = r.int(240, 268); }
      else if (zone < 0.7) { x = r.int(0, W); y = r.chance(0.5) ? r.int(160, 165) : r.int(231, 236); }
      else { x = r.int(0, W); y = r.int(137, 152); }
      const c = r.pick(cols);
      P.px(x, y, c); if (r.chance(0.6)) P.px(x + 1, y, c); if (r.chance(0.3)) P.px(x, y + 1, LB.shade(c, -0.4));
    }
  }
  function dusting(P) {
    // snow catching in the slab joints and along the kerbs, nothing more
    for (const [y0, y1, hgt] of [[136, 154, 9], [237, H, 11]]) for (let y = y0; y < y1; y += hgt) P.hline(0, W - 1, y, R.snow[2]);
    P.hline(0, W - 1, 159, R.snow[3]); P.hline(0, W - 1, 234, R.snow[3]);
    for (let x = 0; x < W; x++) if (LB.hash(x >> 2, 3, 13) > 0.5) { P.px(x, 137, R.snow[3]); P.px(x, 153, R.snow[2]); }
  }
  function groundSnow(P, S) {
    // drifts against the walls, banks along both curbs, slush in the tyre tracks
    for (let x = 0; x < W; x++) {
      if (x >= 6 && x < 92) continue; // the noodle counter keeps its pavement swept
      const wh = 2 + Math.round(LB.fbm(x * 0.06, 1, 3, 2) * 6);
      P.rect(x, 137, 1, wh, R.snow[3]); P.px(x, 137 + wh, R.snow[1]);
    }
    for (const [y0, top] of [[151, true], [229, false]]) {
      for (let x = 0; x < W; x++) {
        if (top && x > 412 && x < 458) continue;
        const n = LB.fbm(x * 0.045, y0, 8, 3);
        const hgt = Math.round(3 + n * 9);
        const yb = top ? 159 : 234;
        P.rect(x, yb - hgt, 1, hgt, R.snow[3]);
        P.px(x, yb - hgt, R.snow[4]);
        if (LB.hash(x, y0, 2) > 0.85) P.px(x, yb - Math.floor(hgt / 2), R.snow[2]);
        P.px(x, yb - 1, R.snow[1]);
        if (LB.hash(x >> 2, y0, 6) > 0.8) P.px(x, yb - 2, '#8a8a9a'); // grit
      }
    }
    // the near pavement under snow, a trodden path down the middle with footprints in it
    P.rect(0, 237, W, H - 237, R.snow[3]);
    P.hline(0, W - 1, 237, R.snow[4]);
    for (let x = 0; x < W; x++) {
      const top = 249 + Math.round(LB.fbm(x * 0.05, 2, 6, 2) * 3), bot = 262 + Math.round(LB.fbm(x * 0.05, 4, 6, 2) * 3);
      P.rect(x, top, 1, bot - top, R.snow[2]);
      P.px(x, top, R.snow[1]);
    }
    for (let x = 4, k = 0; x < W; x += 9, k++) { const y = 254 + (k % 2) * 4; P.rect(x, y, 3, 2, R.snow[1]); P.px(x + 1, y + 1, '#8a96b4'); }
    // and the far pavement trodden grey between the drifts and the kerb bank
    for (let x = 0; x < W; x++) { if (x >= 6 && x < 92) continue; P.rect(x, 144, 1, 6, LB.mix(R.walk[2], R.snow[2], 0.55)); }
    for (const ty of [172, 189, 207, 224]) for (let x = 0; x < W; x++) if (LB.hash(x >> 2, ty, 4) > 0.55) P.px(x, ty + (LB.hash(x, ty, 5) > 0.5 ? 1 : 2), '#8a8c9e');
  }

  // ---------- cables overhead ----------
  function buildCables() {
    const c = [];
    const add = (ax, ay, bx, by, sag) => {
      const pts = [];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([ax + (bx - ax) * t, ay + (by - ay) * t + sag * 4 * t * (1 - t)]); }
      c.push(pts);
    };
    // from the near pole's cross-arm over the street to the buildings
    add(22, 140, 64, 8, 10); add(30, 140, 150, 14, 14); add(46, 140, 214, 58, 16); add(50, 141, -10, 120, 6);
    // along the street fronts
    add(-4, 30, 98, 34, 6); add(98, 34, 186, 12, 8); add(186, 12, 290, 6, 14); add(290, 6, 390, 10, 12); add(390, 10, 484, 4, 8);
    // from the lamp post over the street to B4
    add(300, 156, 336, 10, 12); add(301, 157, 484, 110, 10);
    return c;
  }
  const cableLayer = (S) => LB.memo('arc-cables:' + S.snow, () => {
    const cv = LB.canvas(W, H), P = LB.paint(LB.ctx2d(cv));
    for (const pts of cables) {
      for (let i = 1; i < pts.length; i++) P.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#141020');
      if (S.snow > 0) for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        if (Math.abs(y1 - y0) < Math.abs(x1 - x0) * 0.6 && LB.hash(i, Math.round(y0), 3) > 0.35) P.px(Math.round(x0), Math.round(y0) - 1, R.snow[4]);
      }
    }
    return cv;
  });

  // ---------- holo-ad ----------
  function holoFrame(k) {
    return LB.sprite('arc-holo' + k, 62, 28, (P) => {
      const c = k === 1 ? '#ff7ac0' : '#6ae8f0', c2 = k === 1 ? '#6ae8f0' : '#ff7ac0', hi = '#e8ffff';
      P.rect(0, 0, 62, 28, 'rgba(40,180,220,0.18)');
      P.hline(0, 61, 0, c); P.hline(0, 61, 27, c); P.vline(0, 0, 27, c); P.vline(61, 0, 27, c);
      P.rect(1, 1, 3, 1, hi); P.rect(58, 26, 3, 1, hi);
      if (k === 0) { // a bowl of ramen, steaming
        P.ellipse(16, 15, 10, 3, c); P.poly([[6, 15], [26, 15], [22, 22], [10, 22]], c); P.hline(8, 24, 15, hi);
        P.line(18, 4, 26, 13, c2); P.line(20, 4, 28, 12, c2);
        for (const sx of [11, 16]) { P.px(sx, 9, hi); P.px(sx + 1, 7, hi); P.px(sx, 5, hi); }
        glyph(P, F5.R, 31, 6, c); glyph(P, F5.A, 37, 6, c); glyph(P, F5.M, 43, 6, c); glyph(P, F5.E, 49, 6, c); glyph(P, F5.N, 55, 6, c);
        P.hline(32, 55, 16, c2); P.hline(32, 46, 19, c2); P.hline(32, 50, 22, c2);
      } else if (k === 1) { // a cat face
        glyph(P, CAT, 4, 8, c);
        glyph(P, F5.N, 22, 10, hi); glyph(P, F5.E, 29, 10, hi); glyph(P, F5.K, 36, 10, hi); glyph(P, F5.O, 43, 10, hi);
        P.hline(22, 47, 20, c2); P.px(52, 8, c2); P.px(55, 12, c2); P.px(53, 18, c2);
      } else { // a soda can with a lightning bolt
        P.rect(8, 4, 12, 20, c); P.rect(9, 5, 10, 18, 'rgba(40,180,220,0.35)'); P.ellipse(14, 4, 6, 1, hi);
        P.poly([[15, 8], [11, 15], [14, 15], [12, 21], [17, 13], [14, 13]], c2);
        glyph(P, F5.Z, 28, 8, c); glyph(P, F5.A, 35, 8, c); glyph(P, F5.P, 42, 8, c);
        P.hline(28, 50, 18, c2); P.hline(28, 44, 21, c2);
      }
      for (let y = 1; y < 27; y += 2) P.rect(1, y, 60, 1, 'rgba(0,10,20,0.35)');
    });
  }

  // ---------- moving things ----------
  const carX = (t) => ((t * 46) % (W + 180)) - 90;
  const vanX = (t) => W + 70 - ((t * 64 + 380) % (W + 700));
  const nearWalker = (t) => ({ x: ((t * 15) % (W + 60)) - 30, y: 257 });
  const farWalker = (t) => ({ x: W + 30 - ((t * 12 + 260) % (W + 60)), y: 151 });
  const drones = (t) => [0, 1].map((k) => ({ x: 240 + Math.sin(t * 0.21 + k * 2.6) * 210, y: 96 + k * 16 + Math.sin(t * 0.7 + k) * 6, k }));
  const umbrellaOn = (S) => S.weather === 'rain' || S.weather === 'snow';

  function umbrella(P, x, y, clear) {
    const top = y - 54;
    if (clear) {
      P.ctx.save(); P.ctx.globalAlpha = 0.45;
      P.ellipse(x, top + 6, 16, 6, '#d8e8f4'); P.rect(x - 16, top + 6, 33, 3, '#d8e8f4');
      P.ctx.restore();
      P.hline(x - 16, x + 16, top + 9, '#eaf4fc');
      P.px(x, top, '#ffffff');
    } else {
      P.ellipse(x, top + 6, 16, 6, '#2a2c48'); P.rect(x - 16, top + 6, 33, 3, '#2a2c48');
      P.ellipse(x - 3, top + 4, 8, 3, '#3e4268');
      for (let k = -2; k <= 2; k++) P.px(x + k * 8, top + 9, '#1c1e34');
      P.hline(x - 16, x + 16, top + 9, '#1c1e34');
    }
    P.vline(x, top + 9, y - 22, '#2a2a38');
  }

  // ---------- the lit facade (after the grade), the front mask, the street's streaks ----------
  const staticFront = () => LB.memo('arc-front-static', () => {
    const cv = LB.canvas(W, H), c = LB.ctx2d(cv);
    LB.blit(c, vending(), 176, 146);
    c.fillStyle = '#000'; c.fillRect(400, 82, 2, 70); c.fillRect(470, 82, 2, 70);
    return cv;
  });
  function litFacade(ctx, P, S, bloom) {
    const t = S.t, night = S.L.night;
    const dayK = bloom ? 0.35 + 0.65 * night : 1;
    const lit = LB.smooth(0.12, 0.6, night);
    // windows: each comes on at its own hour
    for (const w of windows) {
      if (night < w.th) continue;
      ctx.globalAlpha = LB.smooth(w.th, w.th + 0.15, night) * (bloom ? 0.6 : 1);
      P.rect(w.x, w.y, w.w, w.h, w.c);
      P.rect(w.x, w.y + w.h - 3, w.w, 3, LB.shade(w.c, -0.25));                 // the floor of the room, darker
      if (w.blinds) for (let yy = w.y + 1; yy < w.y + Math.round(w.h * w.blinds); yy += 2) P.hline(w.x, w.x + w.w - 1, yy, LB.shade(w.c, -0.45));
      if (w.curtain) { P.rect(w.x, w.y, 3, w.h, LB.shade(w.curtain, -0.2)); P.rect(w.x + w.w - 3, w.y, 3, w.h, LB.shade(w.curtain, -0.2)); }
      if (w.plant) { P.blob(w.x + w.w - 5, w.y + w.h - 6, 3.5, '#1a2a20', 4, 0.3); P.rect(w.x + w.w - 7, w.y + w.h - 3, 5, 3, '#2a1a14'); }
      if (w.cat) { const cx = w.x + 4; P.rect(cx, w.y + w.h - 5, 5, 5, '#141220'); P.px(cx, w.y + w.h - 6, '#141220'); P.px(cx + 4, w.y + w.h - 6, '#141220'); }
      if (w.w > 30) { // the balcony door: someone inside, a lamp
        person(P, w.x + 22, w.y + w.h - 1, 30, LB.shade(w.c, -0.6));
        P.rect(w.x + 6, w.y + w.h - 14, 2, 11, LB.shade(w.c, -0.5)); P.rect(w.x + 4, w.y + w.h - 17, 6, 3, '#fff4d8');
      } else if (!w.blinds && !w.cat && w.h > 20) { // a hanging lamp
        P.vline(w.x + 6, w.y, w.y + 5, LB.shade(w.c, -0.5)); P.rect(w.x + 4, w.y + 6, 5, 2, LB.shade(w.c, -0.5)); P.rect(w.x + 5, w.y + 8, 3, 1, '#fffaf0');
      }
    }
    ctx.globalAlpha = 1;
    // the noodle kitchen: a warm back wall, two lamps, the shelves lit
    ctx.globalAlpha = (0.35 + 0.65 * lit) * dayK;
    P.rect(6, 98, 87, 28, '#b0582e');
    for (const lx of [30, 72]) { P.ellipse(lx, 102, 17, 6, '#d8763e'); P.ellipse(lx, 100, 9, 3, '#f09a58'); }
    kitchen(P, true);
    for (const lx of [30, 72]) { P.rect(lx - 3, 98, 7, 2, '#3a2018'); P.hline(lx - 2, lx + 2, 100, '#fff2c8'); }
    // the bar's lounge upstairs: shelves of bottles, people at the window
    ctx.globalAlpha = lit * dayK;
    P.rect(196, 68, 84, 22, '#c0408e');
    for (let x = 198; x < 280; x += 3) P.rect(x, 74 + (x % 2), 1, 3, ['#ffd0f0', '#8af0ff', '#ffe08a'][x % 3]);
    P.hline(196, 279, 77, '#8a2a6a');
    for (const fx of [205, 222, 249, 266]) person(P, fx, 90, fx % 2 ? 13 : 11, '#4a1240');
    P.blob(237, 82, 5, '#2e1236', 2, 0.4); P.rect(236, 86, 3, 4, '#2e1236');
    for (let x = 196; x < 280; x += 14) P.vline(x, 68, 89, '#3a1a3a');
    // always lit: the store's lightbox and shelves, the hotel lobby, the bar door
    ctx.globalAlpha = (0.75 + 0.25 * night) * dayK;
    P.rect(104, 67, 78, 15, '#f4f8ff'); P.rect(104, 67, 78, 3, '#3ab070'); P.rect(104, 79, 78, 3, '#3a7ad0');
    glyph(P, F5['2'], 132, 71, '#c02838'); glyph(P, F5['4'], 139, 71, '#c02838'); glyph(P, F5.H, 146, 71, '#c02838');
    for (const [x0, x1] of [[104, 132], [154, 182]]) {
      P.rect(x0, 84, x1 - x0, 48, '#e8f2ff');
      for (const sy of [96, 108, 120]) { P.hline(x0, x1 - 1, sy, '#9aa6bc'); for (let x = x0 + 1; x < x1 - 1; x += 2) P.rect(x, sy - 4, 1, 4, ['#e85a5a', '#f0c040', '#5ab0e8', '#6ad08a', '#f08ac0'][(x + sy) % 5]); }
      P.rect(x0, 84, 3, 48, '#ffffff');
    }
    P.rect(134, 86, 18, 46, '#d8e6f8'); P.rect(140, 110, 6, 2, '#7a8aa0');
    P.rect(417, 92, 36, 44, '#ffcf8a'); P.vline(435, 92, 135, '#a07040');
    P.rect(417, 92, 36, 4, '#ffe8b8');
    P.rect(420, 112, 5, 22, '#4a6a3a'); P.blob(422, 108, 5, '#3a5a2e', 7, 0.4);
    P.rect(440, 120, 10, 6, '#8a5a30'); P.rect(443, 114, 3, 6, '#fff4d0');
    for (let x = 399; x < 476; x += 6) P.px(x, 80, '#fff2c8');
    P.rect(252, 104, 18, 32, '#8a5cf0'); P.rect(254, 106, 14, 30, '#b48cff'); P.vline(261, 104, 135, '#5a3aa0');
    for (const px of [204, 228]) { P.disc(px, 121, 4.4, '#5ad0d8'); P.px(px - 2, 119, '#d8ffff'); }
    ctx.globalAlpha = lit * dayK; P.rect(381, 30, 6, 8, '#ffc070'); P.vline(384, 30, 37, '#8a5a30');
    // neon: steady, except the NEKO sign's dying E and the arrow chasing down to the bar door
    for (const s of SIGNS) {
      let a = (bloom ? 1 : 0.85 + 0.15 * night) * dayK;
      if (s.id === 'arrow') a *= Math.floor(t * 4) % 3 === 0 ? 1 : 0.45;
      ctx.globalAlpha = a;
      ctx.drawImage(s.make(s.glow, s.core), s.x, s.y);
      if (s.dead && LB.noise(t * 7, 3, 5) < 0.68) { // the E is off most of the time, with a stutter now and then
        ctx.globalAlpha = 1;
        ctx.drawImage(neonWord(['E'], dull(s.glow), LB.mix(s.core, '#5a5470', 0.55)), s.x + 7, s.y);
      }
    }
    // paper lanterns
    const glow = LB.smooth(0.1, 0.5, night);
    for (const lx of [8, 92]) {
      ctx.globalAlpha = 1;
      const body = LB.mix('#c8303a', '#ff7a4a', glow);
      P.rect(lx - 1, 88, 3, 1, '#1a1010');
      P.ellipse(lx, 95, 5, 6, body); P.ellipse(lx - 1, 94, 3, 4, LB.mix(body, '#ffd0a0', 0.2 + 0.5 * glow));
      for (const ry of [92, 95, 98]) P.hline(lx - 4, lx + 4, ry, LB.shade(body, -0.35));
      P.rect(lx - 2, 89, 5, 1, '#1a1010'); P.rect(lx - 2, 101, 5, 1, '#1a1010');
    }
    // the holo-ad over the bar's roof, its projector beam
    const ha = holoAlpha(t) * (0.55 + 0.35 * night) * (bloom ? 0.8 : 1);
    ctx.globalAlpha = ha * 0.16;
    P.poly([[244, 46], [246, 46], [276, 29], [214, 29]], '#6ae8f0');
    const f = holoFrame(Math.floor(t / 4) % 3);
    ctx.globalAlpha = ha;
    if (LB.noise(t * 6, 2, 9) > 0.78) { for (let y = 0; y < 28; y += 4) ctx.drawImage(f, 0, y, 62, 4, 214 + (LB.hash(y, Math.floor(t * 10), 2) > 0.5 ? 2 : -2), 2 + y, 62, 4); }
    else ctx.drawImage(f, 214, 2);
    // the antenna's red light
    ctx.globalAlpha = Math.floor(t * 1.2) % 2 ? 1 : 0.15; P.rect(280, 3, 3, 2, '#ff4a4a');
    // winter: lights strung along the street-front cables
    if (S.season === 'winter' && night > 0.2) {
      const cols = ['#ff5a6a', '#5ae0a0', '#f0d050', '#6aa8ff', '#ff8ad8'];
      let idx = 0;
      for (const ci of [4, 5, 6, 7, 8]) {
        const pts = cables[ci];
        for (let i = 2; i < pts.length; i += 4) {
          ctx.globalAlpha = LB.smooth(0.2, 0.5, night) * (0.6 + 0.4 * Math.sin(t * 2 + idx));
          P.px(pts[i][0], pts[i][1] + 1, cols[idx++ % cols.length]);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  // Light on wet asphalt: the lit things mirrored, then each column runs on toward you in short broken dashes.
  const streakLayer = () => LB.memo('arc-streak', () => {
    const lay = LB.canvas(W, H), lc = LB.ctx2d(lay), lp = LB.paint(lc);
    for (const s of SIGNS) lc.drawImage(s.make(s.glow, s.core), s.x, s.y);
    lp.rect(104, 67, 78, 15, '#e0ecff'); lp.rect(421, 96, 28, 40, '#ffcf8a'); lp.rect(254, 106, 14, 30, '#a070ff');
    for (const x0 of [106, 156]) for (const x of [x0, x0 + 9, x0 + 18]) lp.rect(x, 88, 5, 42, '#c8dcf4');
    lp.rect(169, 108, 12, 18, '#c8ecff');
    for (const lx of [30, 72]) lp.ellipse(lx, 103, 8, 3, '#e8864a');
    for (const lx of [8, 92]) lp.ellipse(lx, 95, 5, 6, '#ff7a4a');
    const m = LB.mirror(lay, BASE, 0, W);
    const md = LB.ctx2d(m).getImageData(0, 0, W, H).data;
    const out = LB.canvas(W, H), oc = LB.ctx2d(out), od = oc.createImageData(W, H), d = od.data;
    for (let x = 0; x < W; x++) {
      let cr = 0, cg = 0, cb = 0, ca = 0;
      for (let y = BASE; y < H; y++) {
        const i = (y * W + x) * 4;
        if (md[i + 3] > 128) { // the reflection itself, crisp
          cr = md[i]; cg = md[i + 1]; cb = md[i + 2]; ca = 1;
          d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = 230;
          continue;
        }
        ca *= 0.94;
        if (ca < 0.06) continue;
        if (ca * 1.15 > LB.hash(x >> 1, y, 21) + 0.12) { d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = Math.round(255 * (0.2 + 0.55 * ca)); }
      }
    }
    oc.putImageData(od, 0, 0);
    return out;
  });

  // ---------- light pools ----------
  function lightsFor(S) {
    const n = S.L.night, a = 0.35 + 0.65 * n;
    const t = S.t, cx = carX(t), vx = vanX(t);
    const L = [
      { x: 52, y: 146, r: 56, c: '#ff6aa8', i: 0.8 * a, always: true, sq: 0.45 },
      { x: 8, y: 96, r: 14, c: '#ff8a5a', flicker: 1 }, { x: 92, y: 96, r: 14, c: '#ff8a5a', flicker: 1 },
      { x: 50, y: 140, r: 44, c: '#ffb070', i: 0.7, flicker: 0.6, sq: 0.4 },
      { x: 143, y: 146, r: 60, c: '#c8e8ff', i: 0.8 * a, always: true, sq: 0.4 },
      { x: 109, y: 36, r: 22, c: '#4ad8e8', i: 0.5 * a, always: true },
      { x: 176, y: 150, r: 26, c: '#7ad8ff', i: 0.8 * a, always: true, sq: 0.5 },
      { x: 222, y: 142, r: 46, c: '#ff6ab0', i: 0.7 * a, always: true, sq: 0.45 },
      { x: 261, y: 146, r: 34, c: '#a070ff', i: 0.8, sq: 0.5 },
      { x: 330, y: 142, r: 44, c: '#ff6aa8', i: 0.5 * a * nekoOn(t), always: true, sq: 0.45 },
      { x: 436, y: 146, r: 56, c: '#ffc888', i: 0.9, sq: 0.45 },
      { x: 468, y: 34, r: 22, c: '#9a7aff', i: 0.55 * a, always: true },
      { x: 244, y: 20, r: 34, c: '#4ae0f0', i: 0.4 * a * holoAlpha(t), always: true },
      { x: 286, y: 224, r: 64, c: '#cfe4ff', i: 0.95, sq: 0.5 },
      { x: 384, y: 34, r: 10, c: '#ffc070', i: 0.5 },
    ];
    if (cx > -60 && cx < W + 60) L.push({ x: cx + 64, y: 194, r: 44, c: '#fff0c8', i: 0.8 * a, always: true, sq: 0.4 });
    if (vx > -60 && vx < W + 60) L.push({ x: vx - 64, y: 228, r: 40, c: '#fff0c8', i: 0.75 * a, always: true, sq: 0.4 });
    return L;
  }
  function nekoOn(t) { return 0.75 + 0.25 * Math.sin(t * 9) ; }
  function holoAlpha(t) {
    const g = LB.noise(t * 5, 1, 9);
    return g > 0.8 ? 0.35 : 0.85 + 0.15 * Math.sin(t * 13);
  }

  // ---------- the scene ----------
  LB.add({
    id: 'arcadia', order: 60, section: 'place', world: 'Arcadia', name: 'Rainline Street',
    blurb: 'A side street in Arcadia after rain. The wet road works like a mirror, so every neon sign is drawn twice: once on the building and once, wobbling, in the puddles below.',
    see: [
      'Neon signs reflected in the puddles and smeared into long coloured streaks down the wet asphalt',
      'Buildings with depth: a roof with a water tank and fans, a balcony with laundry, AC units dripping, cables sagging over the street',
      'Light that changes the mood: grey smog by day, the signs taking over at dusk, steam glowing pink and blue at night',
      'Small life: a hover taxi, a delivery van, drones casting shadows, a man with an LED umbrella, a dead letter in the NEKO sign',
      'Switch to HD-2D at night: the bloom and the soft focus at the top and bottom are what make Octopath look like this',
    ],
    build: 'Most of this is lighting the game already has a hook for: a reflection pass that mirrors the lit signs into a wet-street mask, done in the engine, and a bloom layer. The storefronts would come from the District kit with more depth added (balconies, roof clutter, cables). The street effect is the quick part; the buildings take longer.',
    now: 'arcadia.png',
    w: W, h: H,
    weathers: ['rain', 'fog', 'clear', 'snow'],
    clouds: false,
    init(S) {
      cables = buildCables();
      puddleMask = LB.canvas(W, H);
      const P = LB.paint(LB.ctx2d(puddleMask));
      for (const [x, y, r] of puddles()) P.blob(x, y, r, '#fff', x * 7 + y, 0.25, 0.42);
      ringPts = LB.maskPoints(puddleMask, 46, 8);
      glintPts = LB.maskPoints(puddleMask, 30, 12);
    },
    ground(ctx, S, P) { drawGround(ctx, S, P); },
    shadows(sh, S) {
      const sun = S.L.sun;
      if (S.L.sunElev > 0.02) {
        // the towers shade the street; the low bar and the alley let the sun through
        const Q = LB.paint(sh.ctx);
        for (const [x0, x1, h] of [[0, 100, 150], [100, 186, 150], [186, 290, 74], [290, 378, 150], [390, 480, 150]]) {
          Q.poly([[x0, BASE], [x1, BASE], [x1 + sun.dx * h, BASE + sun.dy * h], [x0 + sun.dx * h, BASE + sun.dy * h]], '#000');
        }
      }
      sh.cast(vending(), 176, 146);
      sh.cast(counter(), 50, 151);
      sh.pole(401, 152, 70, 2); sh.pole(471, 152, 70, 2);
      sh.cast(utilityPole(S), 34, 268);
      sh.cast(streetLamp(S), 300, 268, 23);
      sh.cast(planterTree(S), 150, 267);
      for (const bx of [216, 236, 380]) sh.cast(bollard(), bx, 266);
      sh.cast(bins(), 440, 266);
      sh.cast(bicycle(), 352, 265);
    },
    water(ctx, S, P) {
      const night = S.L.night;
      // the sky in the puddles: smog grey by day, near black at night
      const sky = LB.mix(LB.mix(S.L.skyTop, S.L.skyHor, 0.5), '#5a6478', 0.45);
      ctx.save(); ctx.globalAlpha = 0.75; ctx.drawImage(LB.silhouette(puddleMask, sky), 0, 0); ctx.restore();
      // the buildings mirrored in the wet street
      const fac = facades(S);
      const refl = LB.memo('arc-refl:' + S.season + ':' + S.snow, () => {
        const full = LB.canvas(W, H); LB.ctx2d(full).drawImage(fac, 0, 0);
        return LB.mirror(full, BASE, 0, W);
      });
      const amp = S.weather === 'rain' ? 1.4 : 0.8;
      LB.ripple(ctx, refl, wetMask(S), S, { amp, freq: 0.55, speed: 2.4, alpha: 0.9, y0: BASE, y1: H, slot: 1 });
      if (S.weather === 'rain') LB.rings(ctx, ringPts, S, { period: 1.2, r: 4, alpha: 0.55, color: '#c8d8f0' });
      else LB.glints(ctx, glintPts, S, { color: night > 0.5 ? '#d8c8ff' : '#e8eef8', big: false });
    },
    objects(ctx, S, P) {
      ctx.drawImage(facades(S), 0, 0);
      LB.blit(ctx, vending(), 176, 146);
      LB.contact(ctx, 176, 146, 10, 2, 0.35);
      // hotel canopy: its glass top seen from above, bulbs along the front, two posts down to the pavement
      const Cn = LB.ramp('#7c96a4', 5);
      P.rect(396, 68, 80, 10, Cn[3]); P.hline(396, 475, 68, Cn[4]);
      for (let x = 406; x < 476; x += 14) P.vline(x, 69, 77, Cn[2]);
      P.rect(396, 78, 80, 4, '#2a2e3a'); for (let x = 399; x < 476; x += 6) P.px(x, 80, '#e8c890');
      if (S.snow > 0) { P.rect(396, 67, 80, S.snow >= 1 ? 6 : 2, R.snow[3]); P.hline(396, 475, 67, R.snow[4]); }
      for (const px of [400, 470]) { P.rect(px, 82, 2, 70, '#3a3e4c'); P.rect(px, 82, 1, 70, '#6a7080'); }
      // overhead noren beam lanterns' cords
      P.vline(8, 84, 88, '#2a1a1a'); P.vline(92, 84, 88, '#2a1a1a');
    },
    live(ctx, S, P) {
      const t = S.t;
      // everything standing in front of the shopfronts also goes into the front mask, so the lit interiors
      // and signs (drawn after the grade) stay behind them
      const fm = LB.memo('arc-frontmask', () => LB.canvas(W, H)), fc = LB.ctx2d(fm);
      fc.clearRect(0, 0, W, H);
      fc.drawImage(staticFront(), 0, 0);
      const items = [];
      // drones: their shadows on the street far below
      for (const d of drones(t)) {
        ctx.save(); ctx.globalAlpha = 0.25 * (0.4 + 0.6 * S.L.day); P.ellipse(d.x + 4, d.y + 92, 4, 1, '#14101e'); ctx.restore();
      }
      // traffic, with its reflection in the wet road
      const cars = [{ spr: carSprite('taxi', '#e8b830', '#ff6a8a'), x: carX(t), y: 196, flip: false }, { spr: carSprite('van', '#4a7ab8', '#5ae0f0'), x: vanX(t), y: 230, flip: true }];
      for (const c of cars) {
        if (c.x < -70 || c.x > W + 70) continue;
        const spr = c.flip ? LB.flipX(c.spr) : c.spr;
        const bob = Math.round(Math.sin(t * 3 + c.y) * 1);
        ctx.save(); ctx.globalAlpha = 0.3; ctx.translate(0, 2 * c.y); ctx.scale(1, -1); ctx.drawImage(spr, Math.round(c.x - 31), Math.round(c.y - 26)); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.4; P.ellipse(c.x, c.y + 1, 26, 2, '#0e0c16'); ctx.restore();
        items.push({ y: c.y, draw: (k) => k.drawImage(spr, Math.round(c.x - 31), Math.round(c.y - 30 + bob)) });
      }
      // the noodle bar: the cook behind the counter, a customer at it
      items.push({ y: 134, front: true, draw: (k) => LB.person(k, 50, 134, 'merchant', { dir: 'down', t, seed: 3 }) });
      items.push({ y: 151, front: true, draw: (k) => LB.blit(k, counter(), 50, 151) });
      for (const sx of [26, 74]) items.push({ y: 157, front: true, draw: (k) => LB.blit(k, stool(), sx, 158) });
      items.push({ y: 158, front: true, draw: (k) => LB.person(k, 50, 158, 'cyber-b', { dir: 'up', t, seed: 5 }) });
      // walkers
      const fw = farWalker(t), nw = nearWalker(t);
      items.push({ y: fw.y, front: true, draw: (k) => { LB.person(k, fw.x, fw.y, 'guard', { dir: 'left', walk: true, t, seed: 7 }); if (umbrellaOn(S)) umbrella(LB.paint(k), Math.round(fw.x), fw.y, true); } });
      items.push({ y: nw.y, draw: (k) => { LB.person(k, nw.x, nw.y, 'cyber', { dir: 'right', walk: true, t, seed: 9 }); if (umbrellaOn(S)) umbrella(LB.paint(k), Math.round(nw.x), nw.y, false); } });
      // the near pavement: pole, lamp, tree, bollards, bins, bicycle
      items.push({ y: 268, draw: (k) => LB.blit(k, utilityPole(S), 34, 268) });
      items.push({ y: 268, draw: (k) => LB.blit(k, streetLamp(S), 300, 268, 23) });
      items.push({ y: 267, draw: (k) => LB.blit(k, planterTree(S), 150, 267) });
      for (const bx of [216, 236, 380]) items.push({ y: 266, draw: (k) => LB.blit(k, bollard(), bx, 266) });
      items.push({ y: 266, draw: (k) => LB.blit(k, bins(), 440, 266) });
      items.push({ y: 265, draw: (k) => LB.blit(k, bicycle(), 352, 265) });
      items.sort((a, b) => a.y - b.y);
      for (const it of items) { it.draw(ctx); it.draw(fc); }
      // drones over everything
      for (const d of drones(t)) for (const k of [ctx, fc]) {
        const Q = LB.paint(k);
        Q.rect(d.x, d.y, 9, 3, '#2a2a3a'); Q.hline(d.x, d.x + 8, d.y, '#5a5a6e');
        const spin = Math.floor(t * 20) % 2;
        Q.hline(d.x - 3 + spin, d.x - 1 + spin, d.y - 1, '#8a8a9a'); Q.hline(d.x + 9 - spin, d.x + 11 - spin, d.y - 1, '#8a8a9a');
      }
      ctx.drawImage(cableLayer(S), 0, 0);
      // smog over the day
      const haze = 0.1 * S.L.day + (S.weather === 'rain' ? 0.05 : 0);
      if (haze > 0.01) { ctx.save(); ctx.globalAlpha = haze; ctx.fillStyle = '#8c96ac'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      if (S.season === 'autumn') LB.motes(ctx, S, { n: 8, fall: 14, x: 110, y: 190, w: 90, h: 80, colors: ['#e0782c', '#c84a2a', '#f0b040'], seed: 4 });
      if (S.season === 'spring') LB.motes(ctx, S, { n: 12, fall: 10, x: 105, y: 180, w: 100, h: 90, colors: ['#ffd4e4', '#f8b0cc'], seed: 5 });
    },
    emissive(ctx, S, P) {
      const t = S.t, night = S.L.night;
      const bloom = !!(ctx.canvas.classList && ctx.canvas.classList.contains('bloom'));
      // 1. the lit facade — windows, interiors, signs — drawn apart, cut by the front mask, then laid on
      const tmp = LB.memo('arc-etmp' + (bloom ? 'b' : 'm'), () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
      tc.globalAlpha = 1; tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
      litFacade(tc, LB.paint(tc), S, bloom);
      tc.globalAlpha = 1; tc.globalCompositeOperation = 'destination-out';
      tc.drawImage(LB.memo('arc-frontmask', () => LB.canvas(W, H)), 0, 0);
      tc.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.drawImage(tmp, 0, 0);
      // 2. the neon again, in the wet street: mirrored, then running down the asphalt in broken streaks —
      //    under the cars, the people and the posts, not over them
      const ra = (0.35 + 0.6 * night) * (S.weather === 'rain' ? 1 : S.weather === 'snow' ? 0.55 : 0.8) * (bloom ? 0.6 : 1);
      tc.clearRect(0, 0, W, H);
      LB.ripple(tc, streakLayer(), wetMask(S), S, { amp: S.weather === 'rain' ? 1.6 : 1, freq: 0.6, speed: 2.6, alpha: 1, y0: BASE, y1: H, slot: bloom ? 3 : 2 });
      tc.globalCompositeOperation = 'destination-out';
      tc.drawImage(LB.memo('arc-frontmask', () => LB.canvas(W, H)), 0, 0);
      tc.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = ra; ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(tmp, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // 3. things in front: the vending machine's window, headlights, drones, the LED umbrella, the lamp, steam
      const dayK = bloom ? 0.35 + 0.65 * night : 1;
      ctx.globalAlpha = (0.8 + 0.2 * night) * dayK;
      P.rect(169, 108, 12, 18, '#d8f4ff');
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) P.rect(170 + k * 3, 110 + row * 6, 2, 4, ['#3aa0d8', '#e0c030', '#e85a3a', '#4ac06a'][(row + k) % 4]);
      for (let k = 0; k < 4; k++) P.px(170 + k * 3, 130, ['#ff5a5a', '#5aff8a'][k % 2]);
      const cx = carX(t), vx = vanX(t);
      if (cx > -70 && cx < W + 70) {
        const ba = (0.05 + 0.1 * night) * (bloom ? 1 : 0.8);
        ctx.globalAlpha = ba; P.poly([[cx + 28, 186], [cx + 30, 190], [cx + 96, 202], [cx + 92, 182]], '#fff4d0');
        ctx.globalAlpha = ba; P.poly([[cx + 28, 186], [cx + 30, 190], [cx + 58, 195], [cx + 56, 185]], '#fff4d0');
        ctx.globalAlpha = 1;
        P.rect(cx + 27, 181, 3, 4, '#fffbe8'); P.rect(cx - 30, 181, 2, 4, '#ff3a4a');
        P.rect(cx - 1, 166, 8, 2, '#ff8aa8');
        ctx.globalAlpha = 0.5 + 0.3 * night; P.rect(cx - 21, 190, 42, 2, '#5ae0f0');
      }
      if (vx > -70 && vx < W + 70) {
        const bb = (0.05 + 0.1 * night) * (bloom ? 1 : 0.8);
        ctx.globalAlpha = bb; P.poly([[vx - 28, 220], [vx - 30, 224], [vx - 96, 236], [vx - 92, 216]], '#fff4d0');
        ctx.globalAlpha = bb; P.poly([[vx - 28, 220], [vx - 30, 224], [vx - 58, 229], [vx - 56, 219]], '#fff4d0');
        ctx.globalAlpha = 1;
        P.rect(vx - 30, 215, 3, 4, '#fffbe8'); P.rect(vx + 28, 215, 2, 4, '#ff3a4a');
        P.rect(vx - 7, 200, 8, 2, '#5ae0f0');
        ctx.globalAlpha = 0.5 + 0.3 * night; P.rect(vx - 21, 224, 42, 2, '#5ae0f0');
      }
      for (const d of drones(t)) {
        ctx.globalAlpha = 1;
        P.px(d.x, d.y + 1, Math.floor(t * 2 + d.k) % 2 ? '#ff4a5a' : '#3a1018');
        P.px(d.x + 8, d.y + 1, Math.floor(t * 2 + d.k + 1) % 2 ? '#5aff9a' : '#103a20');
        if (d.k === 0 && night > 0.3) { // a searchlight: a narrow cone, a spot on the street
          ctx.globalAlpha = 0.08 * LB.smooth(0.3, 0.8, night);
          P.poly([[d.x + 3, d.y + 3], [d.x + 6, d.y + 3], [d.x + 12, d.y + 92], [d.x - 3, d.y + 92]], '#9af4ff');
          ctx.globalAlpha = 0.18 * LB.smooth(0.3, 0.8, night);
          P.ellipse(d.x + 4, d.y + 92, 9, 3, '#9af4ff');
        }
      }
      if (umbrellaOn(S)) {
        const nw = nearWalker(t);
        ctx.globalAlpha = 0.4 + 0.6 * night;
        P.vline(Math.round(nw.x), nw.y - 45, nw.y - 22, '#7af0ff');
        P.hline(Math.round(nw.x) - 16, Math.round(nw.x) + 16, nw.y - 45, '#3ac8e0');
      }
      ctx.globalAlpha = LB.smooth(0.15, 0.55, night);
      P.rect(280, 148, 11, 1, '#f0f8ff');
      // steam off the stock pot, out of the grate, from the alley vent, catching the light round it
      const steam = [[73, 124, 14, '#ffd0e0', 1], [335, 141, 22, '#d0f0ff', S.snow > 0 || S.weather === 'snow' ? 1.6 : 1], [384, 110, 16, '#ffe0c0', 0.8]];
      for (const [sx, sy, rise, tint, k2] of steam) {
        const col = LB.mix('#e8ecf4', tint, 0.35 + 0.5 * night);
        const n = Math.round(7 * k2);
        for (let i = 0; i < n; i++) {
          const ph = ((t * 0.32 + i / n) % 1);
          const y = sy - ph * rise * 2.2, x = sx + Math.sin(ph * 5 + i * 1.7) * 3 + ph * 6;
          ctx.globalAlpha = (1 - ph) * (0.2 + 0.12 * night) * (bloom ? 0.6 : 1);
          P.blob(x, y, 2 + ph * 5, col, i + 1, 0.35);
        }
      }
      ctx.restore();
    },
    lights(S) { return lightsFor(S); },
    after(ctx, S, P) {
      // late in the day the sun finds the gap over the low bar and lays a warm shaft across the street
      const k = S.L.golden * (S.weather === 'clear' ? 1 : 0.25) * (1 - S.L.night);
      if (k < 0.05) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sway = Math.sin(S.t * 0.3) * 0.15;
      for (const [x0, w, a] of [[196, 46, 0.07], [214, 18, 0.06], [252, 26, 0.05]]) {
        ctx.globalAlpha = a * k * (0.85 + sway);
        P.poly([[x0, 0], [x0 + w, 0], [x0 + w + 120, 236], [x0 + 120, 236]], '#ffc890');
      }
      ctx.restore();
    },
  });
  function wetMask(S) {
    const k = S.weather;
    if (!wetMasks[k]) {
      const m = LB.canvas(W, H), c = LB.ctx2d(m);
      const street = k === 'rain' ? 0.55 : k === 'snow' ? 0.22 : 0.4;
      const walk = k === 'rain' ? 0.22 : k === 'snow' ? 0.08 : 0.14;
      c.fillStyle = 'rgba(255,255,255,' + walk + ')'; c.fillRect(0, BASE, W, ST0 - BASE); c.fillRect(0, NEAR, W, H - NEAR);
      c.fillStyle = 'rgba(255,255,255,' + street + ')'; c.fillRect(0, ST0, W, ST1 - ST0);
      c.drawImage(puddleMask, 0, 0);
      wetMasks[k] = m;
    }
    return wetMasks[k];
  }
})();
