// Arcadia, Rainline Street: a purpose-made Blender diorama in the game's kit (dioramas/arcadia_rainline.py — the District
// frontages, real-typeface neon, our own taxi, van, counter and street), relit live. The street is wet: a mirror pass of
// the road, pavements and puddles (renders/arcadia/street_pack.py) gives the reflections, smeared down the asphalt at
// night the way neon smears in rain.
(function () {
  const LB = window.LB;
  const CROP = { name: 'main', c0: 1, r0: 1.6 };              // tiles: the frame's top-left in the diorama
  const dirs = { 32: 'assets/arcadia-rainline-32', 48: 'assets/arcadia-rainline-48' };
  const RF = 5.6, C45 = Math.SQRT1_2;                         // the shopfronts' faces (dioramas/arcadia_rainline.py)
  // where things are, in the scene's tiles (the frame turns them into pixels)
  // steam: the grate in the road, the manhole, and the noodle bar's stock pot (x, screen row where it starts, strength)
  const GRATES = [[10.6, 7.95, 1], [5.3, 8.4, 0.45], [1.25, RF + 0.52 - 1.47 * C45, 0.7]];
  const extra = new Map();

  function img(src) {
    if (!extra.has(src)) { const i = new Image(); i.ok = false; i.onload = () => { i.ok = true; }; i.onerror = () => { i.failed = true; }; i.src = src; extra.set(src, i); }
    const i = extra.get(src);
    return i.ok ? i : null;
  }
  const px = (G, col, row) => [(col - CROP.c0) * G.meta.ts, (row - CROP.r0) * G.meta.ts];
  const wetness = (S) => ({ rain: 1, fog: 0.75, clear: 0.6, snow: 0.45 }[S.weather] || 0.6);

  // the reflection of the street's flat colours, lit for the hour (cached per frame size + quarter hour)
  function litRefl(G, S) {
    const src = img(G.dir + '/street_refl.png');
    if (!src || !G.Lt) return null;
    const key = 'arc-refl:' + G.dir + ':' + Math.round(S.time * 8) + S.weather;
    return LB.memo(key, () => {
      const c = LB.canvas(G.w, G.h), x = LB.ctx2d(c);
      x.drawImage(src, 0, 0);
      const Lt = G.Lt;
      const b = Math.min(1, 1.1 * (1 - Math.exp(-(Lt.sky * 0.9 + Lt.sun * 0.5 + Lt.moon * 0.4 + 0.12))));
      const k = Lt.skyC.map((v, i) => Math.min(255, 255 * b * (Lt.sky * v + Lt.sun * Lt.sunC[i]) / (Lt.sky + Lt.sun + 1e-4)));
      x.globalCompositeOperation = 'multiply'; x.fillStyle = LB.css(k); x.fillRect(0, 0, G.w, G.h);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0);
      return c;
    });
  }

  function steam(ctx, S, G, P) {
    const sc = G.meta.ts / 32;
    for (const [col, row, k] of GRATES) {
      const [x, y] = px(G, col, row);
      if (x < -20 || x > G.w + 20) continue;
      for (let i = 0; i < 9; i++) {
        const u = ((S.t * 0.16 + i / 9 + col) % 1);
        const xx = x + Math.sin(u * 6 + i * 2.1 + S.t * 0.7) * 4 * sc + u * u * 10 * sc;
        const yy = y - u * 46 * sc * k;
        ctx.save();
        ctx.globalAlpha = (1 - u) * (0.12 + 0.18 * k) * (S.weather === 'rain' ? 1.2 : 1);
        P.disc(xx, yy, (2 + u * 7) * sc, u < 0.35 ? '#d8d4e8' : '#b8b4cc');
        ctx.restore();
      }
    }
  }

  const def = LB.relit.scene({
    id: 'arcadia', order: 60, section: 'place',
    seasons: ['summer'], seasonNote: 'Arcadia has weather, not seasons',
    weathers: ['rain', 'clear', 'fog'],
    name: 'Rainline Street', world: 'Arcadia',
    blurb: 'A street built for this page in the game\'s own Blender kit: a noodle bar, a 24-hour mart, a bar with a holo-ad on its roof, a shuttered shop and a hotel, over a road still wet from the rain. Every sign shows twice, once on the wall and once in the road.',
    see: [
      'The whole street is one 3D model: stacked floors, balconies, AC units, pipes, cables with string lights, neon in real typefaces on brackets',
      'The wet road mirroring the shopfronts, and at night the neon smeared in long wobbling streaks down the asphalt',
      'Light pools from the scene\'s own lamps and signs coming up as the sky goes dark; by day the signs sit back in grey-blue smog',
      'Rain rippling the puddles, steam from the grate and the noodle pot, people out in it',
      'Try HD-2D at night: the glow and the soft focus at the top and bottom are what make it feel like Octopath',
    ],
    build: 'A new scene script made of kit pieces the game already has (the District shopfronts, the neon signs, the street props) plus a few new ones: the taxi, the van, the noodle counter, which then join the kit for every street after it. The engine adds a mirror pass for the wet street and the light for the hour, both shared with every world.',
    now: 'arcadia.jpg',
    dirs,
    water(ctx, S, P, G) {
      const mask = img(G.dir + '/street_mask.png');
      if (!mask) return;
      const w = wetness(S), sc = G.meta.ts / 32;
      // the street's own reflection: buildings upside down in the puddles, faint on the wet paving
      const rl = litRefl(G, S);
      if (rl) LB.ripple(ctx, rl, mask, S, { amp: (S.weather === 'rain' ? 1.4 : 0.8) * sc, freq: 0.7 / sc, speed: 2.4, alpha: 0.55 * w, slot: 'arc-r' + G.w });
      // the neon in the wet: lit things mirrored, then smeared down the road in steps (brighter at night)
      const gl = img(G.dir + '/street_glow.png');
      if (gl && G.Lt) {
        const on = Math.max(G.Lt.glow, 0.32);
        LB.ripple(ctx, gl, mask, S, { amp: (S.weather === 'rain' ? 1.8 : 1.1) * sc, freq: 0.55 / sc, speed: 2.0, alpha: 0.85 * on * w, composite: 'lighter', slot: 'arc-g' + G.w });
        const tmp = LB.memo('arc-smear:' + G.w, () => LB.canvas(G.w, G.h)), tc = LB.ctx2d(tmp);
        tc.globalCompositeOperation = 'source-over'; tc.globalAlpha = 1; tc.clearRect(0, 0, G.w, G.h);
        const steps = Math.round(7 * sc);
        for (let i = 1; i <= steps; i++) {
          tc.globalAlpha = 0.55 * (1 - i / (steps + 1));
          const wob = Math.round(Math.sin(S.t * 2.3 + i * 1.7) * sc);
          tc.drawImage(gl, wob, i * Math.round(2 * sc));
        }
        tc.globalAlpha = 1; tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * on * w * w; ctx.drawImage(tmp, 0, 0); ctx.restore();
      }
      // rings in the puddles when it rains
      if (S.weather === 'rain') {
        const mcv = LB.memo('arc-maskcv:' + G.dir, () => { const c = LB.canvas(G.w, G.h); LB.ctx2d(c).drawImage(mask, 0, 0); return c; });
        const pts = LB.memo('arc-rings:' + G.dir, () => LB.maskPoints(mcv, Math.round(G.w * G.h / 3500), 31));
        LB.rings(ctx, pts, S, { period: 1.1, r: Math.round(3 * sc), alpha: 0.4, color: '#c8d0f0' });
      }
    },
    live(ctx, S, P, G) {
      const sc = G.meta.ts / 32, ts = G.meta.ts;
      steam(ctx, S, G, P);
      // back to front: someone at the noodle counter, someone hurrying along the shops, the pilot on the crosswalk
      const [cx0, cy0] = px(G, 1.75, RF + 1.02);
      LB.chibi(ctx, Math.round(cx0), Math.round(cy0), 'dockhand', { dir: 'up', t: S.t, scale: sc, sun: S.L.sun, seed: 7 });
      const period = 26, u = (S.t % period) / period, goingRight = u < 0.5;
      const f = goingRight ? u * 2 : 2 - u * 2;
      const [wx, wy] = px(G, 3.4 + f * 8.8, 6.42);
      LB.chibi(ctx, Math.round(wx), Math.round(wy), 'cyber', { dir: goingRight ? 'right' : 'left', walk: true, t: S.t, scale: sc, sun: S.L.sun, seed: 2 });
      const pu = (S.t % 18) / 18, down = pu < 0.5, pf = down ? pu * 2 : 2 - pu * 2;
      const [qx, qy] = px(G, 14.25, 6.75 + pf * 2.55);
      LB.chibi(ctx, Math.round(qx), Math.round(qy), 'pilot', { dir: down ? 'down' : 'up', walk: true, t: S.t, scale: sc, sun: S.L.sun, seed: 5 });
      // a drone's blinking light drifting over the lane at night
      if (G.Lt && G.Lt.glow > 0.2) {
        const dx = ((S.t * 9) % (G.w + 60)) - 30, dy = 1.6 * ts + Math.sin(S.t * 0.8) * 4 * sc;
        P.rect(dx - 2 * sc, dy, 5 * sc, 2 * sc, '#2a2a3a');
        if (Math.floor(S.t * 2) % 2) P.rect(dx, dy + 2 * sc, Math.max(1, sc), Math.max(1, sc), '#ff4060');
      }
    },
    emissive(ctx, S, P, G) {
      // the signs stay on all day (dim in the smog); the relight's glow only brings them up at dusk
      if (!G.glow || !G.Lt) return;
      const bloom = ctx.canvas.classList && ctx.canvas.classList.contains('bloom');
      const extraOn = Math.max(0, 0.6 - G.Lt.glow) * (bloom ? 0.25 : 1);
      if (extraOn > 0.01) { ctx.save(); ctx.globalAlpha = extraOn; ctx.drawImage(G.glow, 0, 0); ctx.restore(); }
    },
    weatherFx: { fogAlpha: 0.16 },
    after(ctx, S, P, G) {
      // the city's smog by day: a grey-blue veil, thicker up high (and all day and night in fog)
      if (!G.Lt) return;
      const day = Math.max(1 - G.Lt.night, S.weather === 'fog' ? 0.7 : 0);
      if (day < 0.05) return;
      ctx.save();
      const g = ctx.createLinearGradient(0, 0, 0, G.h);
      const fogK = S.weather === 'fog' ? 1.7 : 1, fc = G.Lt.night > 0.5 ? '#3a3e5e' : '#8e9cbc';
      g.addColorStop(0, LB.css(fc, 0.32 * day * fogK));
      g.addColorStop(0.55, LB.css(fc, 0.14 * day * fogK));
      g.addColorStop(1, LB.css(fc, 0.06 * day * fogK));
      ctx.fillStyle = g; ctx.fillRect(0, 0, G.w, G.h);
      ctx.restore();
    },
  });
  // load the street's reflection with the rest of the render, so the first frame already has it
  const basePrep = def.prepare;
  def.prepare = () => {
    const v = LB.relit.VERSIONS[LB.state.version] || LB.relit.VERSIONS.model;
    const dir = dirs[v.ts] || dirs[32];
    const names = ['street_refl', 'street_glow', 'street_mask'].map((n) => dir + '/' + n + '.png');
    const p = basePrep();
    const people = LB.chibi && LB.chibi.ready ? LB.chibi.ready(['dockhand', 'cyber', 'pilot'], LB.state.chibi || 'round', v.ts / 32) : null;
    if (people && !LB.chibi.loaded(['dockhand', 'cyber', 'pilot'], LB.state.chibi || 'round', v.ts / 32)) names.push(null);
    const waits = names.filter(Boolean).map((src) => { img(src); const i = extra.get(src); return i.ok || i.failed ? null : new Promise((r) => { i.addEventListener('load', r); i.addEventListener('error', r); }); }).filter(Boolean);
    if (names.includes(null)) waits.push(people);
    if (!p && !waits.length) return null;
    return Promise.all([p, ...waits]);
  };
  LB.add(def);
})();
