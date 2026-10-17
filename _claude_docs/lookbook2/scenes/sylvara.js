// Sylvara: Elderglade Brook — a purpose-made diorama built with the game's Blender kit (dioramas/sylvara_brook.py), relit
// live: ancient trees closing over the top of the view, a brook with a cascade and stepping stones, an elven door.
(function () {
  const LB = window.LB;
  const RL = LB.relit;
  // the crop, in the scene's tiles (its top-left), and where things are in it
  const CROP = { name: 'brook', c0: 1, r0: 0.4 };
  const T = (c, r) => [(c - CROP.c0) * 32, (r - CROP.r0) * 32];      // a tile (col, row) → 32-px native px in the crop

  // ---- the forest's air: drawn things lit like the scene (relit scenes skip the grade) ----
  const tint = (G) => {
    const L = G.Lt;
    if (!L) return [1, 1, 1];
    const s = L.sky + L.sun * 0.85 + L.moon + 1e-4;
    const b = 1.1 * (1 - Math.exp(-(L.sky + L.sun * 0.8 + L.moon * 1.2)));
    return [0, 1, 2].map((i) => LB.clamp(b * (L.sky * L.skyC[i] + L.sun * 0.85 * L.sunC[i] + L.moon * L.moonC[i]) / s, 0, 1.15));
  };
  function lit(ctx, S, G, draw, slot) {
    const W = S.w, H = S.h;
    const a = LB.memo('syl-air-a:' + W + 'x' + H + slot, () => LB.canvas(W, H)), b = LB.memo('syl-air-b:' + W + 'x' + H + slot, () => LB.canvas(W, H));
    const ac = LB.ctx2d(a), bc = LB.ctx2d(b);
    ac.globalCompositeOperation = 'source-over'; ac.globalAlpha = 1; ac.clearRect(0, 0, W, H);
    draw(ac);
    bc.globalCompositeOperation = 'source-over'; bc.clearRect(0, 0, W, H); bc.drawImage(a, 0, 0);
    const t = tint(G);
    ac.globalCompositeOperation = 'multiply'; ac.fillStyle = LB.css([t[0] * 255, t[1] * 255, t[2] * 255]); ac.fillRect(0, 0, W, H);
    ac.globalCompositeOperation = 'destination-in'; ac.drawImage(b, 0, 0);
    ctx.drawImage(a, 0, 0);
  }
  // the lamps, windows and mushrooms the render glows with, found once: light pools round them
  function glowSpots(G) {
    if (G._spots) return G._spots;
    const cell = Math.round(12 * G.w / 480), buckets = new Map();
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      const p = (y * G.w + x) * 4, r = G.emis[p], g = G.emis[p + 1], b = G.emis[p + 2];
      if (r + g + b < 120) continue;
      const k = ((x / cell) | 0) + ',' + ((y / cell) | 0);
      const e = buckets.get(k) || { x: 0, y: 0, n: 0, r: 0, g: 0, b: 0 };
      e.x += x; e.y += y; e.n++; e.r += r; e.g += g; e.b += b;
      buckets.set(k, e);
    }
    G._spots = [...buckets.values()].filter((e) => e.n >= 2).map((e) => ({ x: e.x / e.n, y: e.y / e.n, n: e.n, c: [e.r / e.n, e.g / e.n, e.b / e.n] }));
    return G._spots;
  }
  // fireflies, falling leaves, petals, morning mist, weather — all the moving air
  function air(ctx, S, G) {
    const sc = S.scale;
    lit(ctx, S, G, (c) => {
      if (S.season === 'autumn') LB.motes(c, S, { n: 26, fall: 9 * sc, colors: ['#d8742c', '#c24a2c', '#e0ac3c', '#b8622a'], seed: 3 });
      if (S.season === 'spring') LB.motes(c, S, { n: 14, fall: 6 * sc, colors: ['#f6c4d4', '#fff2f6'], seed: 4 });
      if (S.season === 'summer' && S.L.night < 0.35 && S.weather === 'clear') LB.motes(c, S, { n: 12, colors: ['#fff6c8', '#e8f0a0'], seed: 5 });
      // a low mist through the trees at dawn, and in fog
      const dawn = S.time > 5 && S.time < 9.5 ? LB.smooth(5, 6.5, S.time) * (1 - LB.smooth(8.2, 9.5, S.time)) : 0;
      const mist = S.weather === 'fog' ? 0.36 : S.weather === 'rain' ? 0.14 : dawn * 0.26;
      if (mist > 0.02) LB.fog(c, S, mist);
      if (S.weather === 'rain' || S.weather === 'snow') LB.weatherFx(c, S, { mask: G.water });
    }, 'air');
  }
  function fireflies(ctx, S) {
    if (S.L.night < 0.4 || S.season === 'winter' || S.weather === 'rain' || S.weather === 'snow') return;
    const n = S.season === 'summer' ? 34 : S.season === 'spring' ? 14 : 8;
    LB.motes(ctx, S, { n, blink: true, colors: ['#e8ff8a', '#fff6a0', '#b8ff9a'], size: S.scale > 1 ? 2 : 1, seed: 8, x: 10 * S.scale, y: 70 * S.scale, w: 460 * S.scale, h: 190 * S.scale });
  }
  // sunlight slanting down through the gaps in the canopy: each shaft fades out toward the ground
  function shafts(ctx, S, G) {
    const L = G.Lt;
    if (!L || L.sun < 0.06) return;
    const W = S.w, H = S.h, sc = S.scale;
    const k = S.finish === 'hd2d' ? 1.45 : S.finish === 'soft' ? 1.1 : 0.8;
    const cv = LB.memo('syl-rays:' + W + 'x' + H, () => LB.canvas(W, H)), c = LB.ctx2d(cv);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
    const ang = (S.time < 12.5 ? -1 : 1) * LB.lerp(0.62, 0.28, Math.min(1, L.elev * 1.3));
    LB.rays(c, S, { n: 3, x0: (S.time < 12.5 ? 150 : 40) * sc, spacing: 130 * sc, width: 20 * sc, angle: ang, alpha: (0.13 + 0.12 * L.golden) * k * Math.min(1, L.sun), len: H * 0.85, y0: 0 });
    // fade with distance from the canopy, in a few steps (it stays pixel art)
    const mask = LB.memo('syl-raymask:' + W + 'x' + H, () => {
      const m = LB.canvas(W, H), mc = LB.ctx2d(m), steps = 6;
      for (let i = 0; i < steps; i++) {
        mc.globalAlpha = 1 - i / steps;
        mc.fillStyle = '#000'; mc.fillRect(0, Math.round((i / steps) * H * 0.85), W, Math.ceil(H * 0.85 / steps) + 1);
      }
      return m;
    });
    c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cv, 0, 0); ctx.restore();
  }

  const def = RL.scene({
    id: 'sylvara', order: 40, section: 'place', world: 'Sylvara', name: 'Elderglade Brook',
    now: 'sylvara.jpg',
    blurb: 'A corner of the wood elves\' forest built new in the game\'s own Blender kit, to the richness of the first look book: ancient trees closing over the top, a brook winding between real banks, a little waterfall over a log, an elven door in a trunk. Same 3D models, same 45° view, lit live for the hour.',
    see: [
      'Trunks built as real shapes: buttressed feet, bark ridges, roots diving into the moss, ivy climbing toward you',
      'The brook dropping over a mossy log into a lower pool, banks that slope into the water, stones in the shallows',
      'Ferns, mushrooms, mossy boulders, a fallen log with bracket fungi: the small things at the elves\' scale',
      'Shafts of sun through the canopy by day; at night the door, the lanterns, glowing mushrooms and spores',
    ],
    build: 'Built from the same Blender kit as the game\'s scenes, with richer pieces added: lofted trunks and logs, fern fronds, shaped banks. Rendered with a sun at six times of day, and the engine blends them so the shadows move. A scene like this builds and renders in about ten minutes, so each world\'s outdoor places could be redone this way.',
    dirs: { 32: 'assets/sylvara-' + CROP.name + '-32', 48: 'assets/sylvara-' + CROP.name + '-48' },
    live(ctx, S, P, G) {
      const sc = S.scale, t = S.t;
      // one elf stands by the door; one walks the path over the stepping stones and back
      const u = (t % 26) / 26, f = u < 0.5 ? u * 2 : 2 - u * 2;
      const a = T(4.5, 8.35), b = T(11.6, 7.65);
      const items = [
        { x: T(12.15, 7.35)[0], y: T(12.15, 7.35)[1], dir: 'down', walk: false, seed: 2 },
        { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dir: u < 0.5 ? 'right' : 'left', walk: true, seed: 5 },
      ].sort((p, q) => p.y - q.y);
      const sun = S.L.sun.alpha > 0.02 && G.Lt && G.Lt.sun > 0.05 ? S.L.sun : null;
      for (const p of items) LB.chibi(ctx, Math.round(p.x * sc), Math.round(p.y * sc), 'elf', { dir: p.dir, walk: p.walk, t, scale: sc, seed: p.seed, sun });
      air(ctx, S, G);
    },
    emissive(ctx, S) { fireflies(ctx, S); },
    lights(S, G) {
      const sc = G.w / 480;
      return glowSpots(G).map((s) => ({ x: s.x, y: s.y, r: (10 + Math.min(10, s.n * 0.5)) * sc, c: s.c, i: 0.42, flicker: s.c[0] > s.c[2] ? 0.6 : 0 }));
    },
    after(ctx, S, P, G) {
      const L = G.Lt;
      if (!L) return;
      shafts(ctx, S, G);
      // the forest at night isn't black: a little teal moonlight caught in the leaves
      if (L.night > 0.05) {
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.32 * L.night;
        ctx.fillStyle = '#123630'; ctx.fillRect(0, 0, S.w, S.h); ctx.restore();
      }
      // late sun warms the glade
      if (L.golden > 0.05 && L.sun > 0.05) {
        ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22 * L.golden * Math.min(1, L.sun);
        ctx.fillStyle = '#ffb060'; ctx.fillRect(0, 0, S.w, S.h); ctx.restore();
      }
    },
  });
  def.weatherFx = false;            // drawn in air(), lit like the scene
  // the elves load with the render, so the first frame has them
  const prep = def.prepare;
  const variant = () => LB.state.chibi || LB.chibi.defaultVariant;
  def.prepare = (state) => {
    const p = prep(state);
    const sc = def.scale(), v = variant();
    if (p) return p.then(() => LB.chibi.ready(['elf'], v, sc));
    if (!LB.chibi.loaded(['elf'], v, sc)) {
      const key = v + sc;
      if (def._chibiWait === key) return null;               // asked once; a missing sheet mustn't loop
      def._chibiWait = key;
      return LB.chibi.ready(['elf'], v, sc).then(() => {});
    }
    return null;
  };
  LB.add(def);
})();
