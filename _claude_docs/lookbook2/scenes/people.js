// Look Book 2: the people, three ways — the game's 3D chibis as they are, with painted faces, and rounder.
(function () {
  const LB = window.LB;
  const TS_OF = { model: 32, toy: 32, modelhd: 48, toyhd: 48 };
  const sc = () => (TS_OF[LB.state.version] || 32) / 32;
  const CAST = ['pilot', 'farmer', 'baker', 'fisher', 'elf', 'skier', 'cyber', 'sailor', 'dockhand'];
  const ROWS = [{ variant: 'today', label: 'TODAY' }, { variant: 'faces', label: 'FACES' }, { variant: 'round', label: 'ROUND' }];
  const FEET = [2.8, 5.9, 9.0];               // each row's feet, in tiles
  const WT = 20, HT = 9.375;                 // the strip, in tiles

  // a 3 × 5 pixel font for the row labels
  const FONT = {
    T: ['111', '010', '010', '010', '010'], O: ['111', '101', '101', '101', '111'], D: ['110', '101', '101', '101', '110'],
    A: ['010', '101', '111', '101', '101'], Y: ['101', '101', '010', '010', '010'], F: ['111', '100', '110', '100', '100'],
    C: ['011', '100', '100', '100', '011'], E: ['111', '100', '110', '100', '111'], S: ['011', '100', '010', '001', '110'],
    R: ['110', '101', '110', '101', '101'], U: ['101', '101', '101', '101', '111'], N: ['101', '111', '111', '111', '101'],
  };
  function label(P, text, x, y, u, fg, bg) {
    let cx = x;
    for (const ch of text) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') {
        P.rect(cx + c * u - u, y + r * u, u * 3, u, bg); P.rect(cx + c * u, y + r * u - u, u, u * 3, bg);
      }
      cx += 4 * u;
    }
    cx = x;
    for (const ch of text) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') P.rect(cx + c * u, y + r * u, u, u, fg);
      cx += 4 * u;
    }
  }

  let asked = {};
  const def = {
    id: 'people', order: 90, section: 'people', world: 'Every world', name: 'The people, three ways',
    blurb: 'The game\'s own 3D people, kept as they are. The middle row paints a face on them the way Stardew does; the bottom row also makes them rounder and softer. Switch to an HD version to see them at 48 pixels a tile.',
    see: [
      'Top row: the game today. The eyes are two dark blocks on the model',
      'Middle row: the same models with a face painted on: eyes with a shine, a smile, blush on some',
      'Bottom row: bigger, rounder heads, a fringe, softer hands and shoes, hats sitting a little higher so the eyes show',
      'Everyone breathes and blinks now and then; the pilot walks with more bounce and a wider arm swing',
      'Their shadows on the ground follow the sun through the day',
    ],
    build: 'These are the game\'s Blender models with small changes. The eye blocks come off and the face is painted in pixels after the render, so it stays crisp at any size; the round version smooths the shapes and seats the hats higher. Each character re-renders in seconds, so switching the whole cast is mostly a matter of picking the look.',
    w: 640, h: 300,
    clouds: false,
    dims() { const s = sc(); return [Math.round(WT * 32 * s), Math.round(HT * 32 * s)]; },
    scale: sc,
    prepare() {
      const s = sc();
      if (asked[s]) return null;
      asked[s] = true;
      return Promise.all(ROWS.map((r) => LB.chibi.ready(CAST, r.variant, s)));
    },
    ground(ctx, S, P) {
      const s = sc(), u = 32 * s, W = Math.round(WT * u), H = Math.round(HT * u), px = s > 1 ? 2 : 1;
      const winter = S.season === 'winter', autumn = S.season === 'autumn', spring = S.season === 'spring';
      const grass = LB.ramp(winter ? '#e6edf6' : autumn ? '#8a9a4a' : spring ? '#76b04c' : '#5c9c44', 5);
      const path = LB.ramp(winter ? '#c8d0dc' : '#c8a878', 5);
      P.rect(0, 0, W, H, grass[2]);
      // the meadow: soft patches in tile units, then tufts placed by hand-ish rules
      // gentle light and dark drifts, edged at the pixel (not in squares), with a ragged rim of tufts
      for (let y = 0; y < H; y += px) for (let x = 0; x < W; x += px) {
        const n = LB.fbm(x / u * 0.32, y / u * 0.45, 4, 3) + (LB.hash(x, y, 5) - 0.5) * 0.035;
        if (n > 0.62) P.rect(x, y, px, px, grass[3]);
        else if (n < 0.34) P.rect(x, y, px, px, winter ? LB.mix(grass[2], grass[1], 0.45) : grass[1]);
      }
      // the paths: one under each row, organic edges, a light lip above and a dark one below
      for (const fy of FEET) {
        for (let x = 0; x < W; x++) {
          const tx = x / u;
          const top = Math.round((fy - 0.72 + 0.09 * Math.sin(tx * 1.7 + fy) + 0.06 * (LB.noise(tx * 2, fy, 8) - 0.5)) * u);
          const bot = Math.round((fy + 0.5 + 0.08 * Math.sin(tx * 1.3 + fy * 2) + 0.06 * (LB.noise(tx * 2, fy, 9) - 0.5)) * u);
          P.rect(x, top, 1, bot - top, path[2]);
          P.rect(x, top, 1, px, winter ? '#ffffff' : grass[4]);
          P.rect(x, bot, 1, px, grass[0]);
          if (LB.hash(x, Math.round(fy * 10), 3) < 0.06) {
            const py = top + Math.floor(LB.hash(x, 7, 4) * (bot - top - 3 * px)) + px;
            P.rect(x, py, px * (1 + (LB.hash(x, 8, 4) < 0.4 ? 1 : 0)), px, LB.hash(x, 9, 4) < 0.5 ? path[1] : path[3]);
          }
        }
      }
      // tufts and flowers on the grass (never on the paths)
      const r = LB.rng(11);
      const onPath = (y) => FEET.some((fy) => y > (fy - 0.85) * u && y < (fy + 0.62) * u);
      for (let i = 0; i < WT * HT * 3.2; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H);
        if (onPath(y)) continue;
        if (winter) { if (r() < 0.25) P.rect(x, y, px * 2, px, '#c6d2e4'); continue; }
        const c = r() < 0.5 ? grass[4] : grass[1];
        P.rect(x, y, px, px * 2, c); P.rect(x - px, y + px, px, px, c); P.rect(x + px, y + px, px, px, c);
        if (r() < (spring ? 0.16 : autumn ? 0.03 : 0.07)) P.rect(x, y - px, px * 2, px * 2, LB.rng(i)() < 0.5 ? '#f4e9f0' : spring ? '#f4a8c4' : '#f0d050');
        if (autumn && r() < 0.18) P.rect(x + 2 * px, y, px * 2, px, r() < 0.5 ? '#c8682c' : '#d8a038');
      }
    },
    live(ctx, S, P) {
      const s = sc(), u = 32 * s, W = WT * u, t = S.t;
      const sun = S.L.sun;
      ROWS.forEach((row, ri) => {
        const fy = FEET[ri] * u;
        CAST.forEach((name, i) => {
          LB.chibi(ctx, Math.round((3.25 + i * 1.86) * u), Math.round(fy), name, { variant: row.variant, scale: s, t, seed: i * 1.7 + ri, sun, dir: 'down' });
        });
        // the pilot strolls along in front, there and back
        const span = W - 3.2 * u, period = 16, k = (t / period + 0.965) % 1, there = k < 0.5;
        const f = there ? k * 2 : 2 - k * 2;
        const x = 2.9 * u + f * (span - 0.4 * u);
        LB.chibi(ctx, Math.round(x), Math.round(fy + 0.36 * u), 'pilot', { variant: row.variant, scale: s, t, seed: 9, walk: true, dir: there ? 'right' : 'left', sun });
      });
    },
    after(ctx, S, P) {
      const s = sc(), u = 32 * s, k = Math.round(s * 2);
      ROWS.forEach((row, ri) => label(P, row.label, Math.round(0.35 * u), Math.round((FEET[ri] - 1.15) * u), k, '#f4ead6', '#1a1626'));
    },
  };
  LB.add(def);
})();
