// Lumar (reference, off the page): Diggen's Point, the harbour beach — the game's own Blender scene (tools/bridge-art/scenes/lumar_harbor.py),
// relit live. The sea is a mirror at the waterline over the modelled seabed: sand shows through the shallows, the deep
// goes sea-green, foam laps the edge, the pier and the cliffs wobble in it, and after dark every lantern trails down the
// water. Extra pass: work-lumar/extra.py → <asset dir>/wdepth.png (depth under the water).
(function () {
  'use strict';
  const LB = window.LB, RL = LB.relit;
  const CROPS = {
    pier: { c0: 0.5, r0: 10.4, dirs: { 32: 'assets/lumar-pier-32', 48: 'assets/lumar-pier-48' } },
    lighthouse: { c0: 4.5, r0: 1.4, dirs: { 32: 'assets/lumar-lighthouse-32', 48: 'assets/lumar-lighthouse-48' } },
  };

  // ---- per render: depth under the water, the shallow edge, the lamps ----
  const extras = new Map();
  const peopleReady = new Set();
  function ensureExtra(G) {
    if (extras.has(G.dir)) return extras.get(G.dir).done;
    const E = { ready: false };
    extras.set(G.dir, E);
    E.done = new Promise((res) => {
      const img = new Image();
      img.onload = () => { build(G, E, img); E.ready = true; res(); };
      img.onerror = () => { E.ready = true; res(); };          // no depth pass: plain water
      img.src = G.dir + '/wdepth.png';
    });
    return E.done;
  }
  function maskCanvas(G, fn) {
    const c = LB.canvas(G.w, G.h), x = LB.ctx2d(c), id = x.createImageData(G.w, G.h);
    for (let i = 0, N = G.w * G.h; i < N; i++) { const a = fn(i); if (a > 0) { id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = a * 255; } }
    x.putImageData(id, 0, 0);
    return c;
  }
  function build(G, E, img) {
    const W = G.w, H = G.h, N = W * H;
    const c = LB.canvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, W, H).data;
    const depth = new Float32Array(N);
    for (let i = 0; i < N; i++) depth[i] = d[i * 4] === 255 ? -1 : d[i * 4] / 250;
    E.depth = depth;
    E.edge = [];
    for (let i = 0; i < N; i++) if (depth[i] >= 0 && depth[i] < 0.16) E.edge.push(i);
    E.shallow = maskCanvas(G, (i) => (depth[i] < 0 ? 0 : 0.85 * Math.pow(LB.clamp(1 - depth[i] / 0.3, 0, 1), 1.5)));
    E.lip = maskCanvas(G, (i) => (depth[i] < 0 ? 0 : LB.clamp(1 - depth[i] / 0.09, 0, 1)));
    E.deep = maskCanvas(G, (i) => (depth[i] < 0 ? 0 : LB.smooth(0.3, 1.0, depth[i])));
    // the topmost water pixel in each column
    E.colTop = new Int16Array(W).fill(-1);
    for (let xx = 0; xx < W; xx++) for (let yy = 0; yy < H; yy++) if (depth[yy * W + xx] >= 0) { E.colTop[xx] = yy; break; }
    // the info pass without the water flag: for lighting the seabed itself
    E.infoBed = new Uint8ClampedArray(G.info);
    for (let i = 0; i < N; i++) E.infoBed[i * 4 + 1] &= ~8;
    // lamps and lit windows: clusters of the glow pass
    const em = G.emis, seen = new Uint8Array(N), lamps = [];
    for (let i = 0; i < N; i++) {
      if (seen[i] || em[i * 4] + em[i * 4 + 1] + em[i * 4 + 2] < 90) continue;
      const stack = [i]; seen[i] = 1;
      let n = 0, sx = 0, sy = 0, r = 0, g = 0, b = 0, top = H, bot = 0;
      while (stack.length) {
        const j = stack.pop(), jx = j % W, jy = (j / W) | 0;
        n++; sx += jx; sy += jy; r += em[j * 4]; g += em[j * 4 + 1]; b += em[j * 4 + 2]; top = Math.min(top, jy); bot = Math.max(bot, jy);
        for (const k of [j - 1, j + 1, j - W, j + W]) {
          if (k < 0 || k >= N || seen[k]) continue;
          if (Math.abs((k % W) - jx) > 1) continue;
          if (em[k * 4] + em[k * 4 + 1] + em[k * 4 + 2] < 90) continue;
          seen[k] = 1; stack.push(k);
        }
      }
      if (n >= 2) lamps.push({ x: sx / n, y: sy / n, top, bot, n, c: [r / n, g / n, b / n] });
    }
    E.lamps = lamps;
  }

  function make(id, cropName, extra) {
    const CR = CROPS[cropName];
    const verTs = () => (RL.VERSIONS[LB.state.version] || RL.VERSIONS.model).ts;
    const def = RL.scene(Object.assign({
      id, dirs: CR.dirs,
      lights(S, G) {
        const E = extras.get(G.dir);
        if (!E || !E.lamps) return [];
        const k = G.w / 480;
        return E.lamps.map((l) => ({ x: l.x, y: l.y, r: (12 + Math.min(10, l.n * 0.6)) * k, c: l.c, flicker: 0.7, i: 0.8 }));
      },
      water(ctx, S, P, G) { waterExtras(ctx, S, P, G); lampTrails(ctx, S, P, G); },
      live(ctx, S, P, G) { liveThings(ctx, S, P, G, CR, cropName); },
      after(ctx, S, P, G) { if (cropName === 'lighthouse') beam(ctx, S, P, G, CR); },
    }, extra));
    const cur = () => def._G[CR.dirs[verTs()]];
    const prep0 = def.prepare;
    const people = () => {
      const sc = verTs() / 32, key = (LB.state.chibi || 'round') + sc;
      if (peopleReady.has(key)) return null;
      return LB.chibi.ready(['sailor', 'dockhand', 'fisher'], LB.state.chibi || 'round', sc).then(() => { peopleReady.add(key); });
    };
    def.prepare = (st) => {
      const p = prep0(st);
      if (p) return p.then(() => ensureExtra(cur())).then(people);
      const G = cur();
      if (G && !extras.has(G.dir)) return ensureExtra(G).then(people);
      if (G && !extras.get(G.dir).ready) return extras.get(G.dir).done.then(people);
      return people();
    };
    // the static part of the water, per hour: the deep darker, the sand through the shallows
    const g0 = def.ground;
    def.ground = function (ctx, S, P) {
      g0.call(def, ctx, S, P);
      const G = cur(), E = G && extras.get(G.dir);
      if (!G || !E || !E.depth) return;
      const W = G.w, H = G.h;
      const tmp = LB.memo('lumar-tmp:' + G.dir, () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
      if (S.season === 'winter') {
        // winter: the engine ices the water in from the shore; the open sea beyond keeps Lumar's own colour
        tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
        tc.drawImage(seaBase(G, E, S), 0, 0);
        if (G.open) { tc.globalCompositeOperation = 'destination-in'; tc.drawImage(G.open, 0, 0); }
        tc.globalCompositeOperation = 'source-over';
        ctx.drawImage(tmp, 0, 0);
        E.bed = null;
        return;
      }
      // the sea's colour by depth: aqua over the sand, sea-green, then deep teal-blue; tinted by the sky, lit for the hour
      ctx.drawImage(seaBase(G, E, S), 0, 0);
      // the seabed lit for the hour, seen through aqua water
      const G2 = Object.assign({}, G, { dir: G.dir + '#bed', info: E.infoBed, refl: null, _refl: null });
      const bed = LB.memo('lumar-bed:' + G.dir, () => LB.canvas(W, H)), bc = LB.ctx2d(bed);
      bc.globalCompositeOperation = 'source-over'; bc.clearRect(0, 0, W, H);
      RL.compose(G2, S, (RL.VERSIONS[LB.state.version] || RL.VERSIONS.model).style, bc);
      bc.globalCompositeOperation = 'multiply'; bc.fillStyle = '#86c8c0'; bc.fillRect(0, 0, W, H);
      bc.globalCompositeOperation = 'destination-in'; bc.drawImage(E.shallow, 0, 0);
      bc.globalCompositeOperation = 'source-over';
      ctx.drawImage(bed, 0, 0);
      // the wet lip, kept for drawing over the reflection each frame
      const lip = LB.memo('lumar-lip:' + G.dir, () => LB.canvas(W, H)), lc = LB.ctx2d(lip);
      lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, W, H); lc.drawImage(bed, 0, 0);
      lc.globalCompositeOperation = 'destination-in'; lc.drawImage(E.lip, 0, 0); lc.globalCompositeOperation = 'source-over';
      E.bed = lip;
    };
    return def;
  }


  // the sea, coloured by its depth (Lumar's own palette rather than the farm pond's), cached per hour/season/weather
  function seaBase(G, E, S) {
    const W = G.w, H = G.h, N = W * H, k = W / 480;
    const cv = LB.memo('lumar-sea:' + G.dir, () => LB.canvas(W, H)), c = LB.ctx2d(cv), id = c.createImageData(W, H), d = id.data;
    const Lt = G.Lt || RL.light(S, G), night = Lt.night, golden = Lt.golden;
    const rgb = (h) => LB.rgb(h).map((v) => v / 255);
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const sky = S.weather === 'rain' ? rgb('#6a7a86') : mix(rgb(S.L.skyTop), rgb(S.L.skyHor), 0.25 + 0.5 * golden);
    const g = golden * (S.weather === 'clear' ? 1 : 0.3) * (1 - night);
    let B = ['#56b2a4', '#348c88', '#236c74', '#1a4e62'].map((h, i) => mix(rgb(h), sky, 0.06 + i * 0.02));
    // golden hour: the sea goes deeper and cooler, so the warm glitter on it glows (warm on cool, not a grey mix);
    // only the shallows over the sand take a little of the evening's warmth
    B = B.map((col, i) => i === 0 ? mix(col, rgb('#e8b07a'), 0.22 * g) : [col[0] * (1 - 0.18 * g), col[1] * (1 - 0.12 * g), col[2] * (1 - 0.02 * g)]);
    B = B.map((col) => mix(col, B[2], 0.7 * night));
    const amb = rgb(S.L.amb);
    const b = LB.lerp(1.0, 0.34, night) * (S.weather === 'clear' ? 1 : 0.86) * (1 + 0.06 * golden);
    for (let i = 0; i < N; i++) {
      const dep = E.depth[i];
      if (dep < 0) continue;
      if (!E.seaN) {   // the band edges' wobble, once per render
        E.seaN = new Float32Array(N);
        for (let j = 0; j < N; j++) if (E.depth[j] >= 0) E.seaN[j] = (LB.noise((j % W) * 0.07 / k, ((j / W) | 0) * 0.12 / k, 4) - 0.5) * 0.12;
      }
      const dd = dep + E.seaN[i];
      const col = B[dd < 0.12 ? 0 : dd < 0.32 ? 1 : dd < 0.62 ? 2 : 3];
      d[i * 4] = col[0] * b * (0.55 + 0.45 * amb[0]) * 255;
      d[i * 4 + 1] = col[1] * b * (0.55 + 0.45 * amb[1]) * 255;
      d[i * 4 + 2] = col[2] * b * (0.55 + 0.45 * amb[2]) * 255;
      d[i * 4 + 3] = 255;
    }
    c.putImageData(id, 0, 0);
    return cv;
  }

  // ---- every frame on the water: the sandy lip, foam lapping, the evening glitter ----
  function glitter(ctx, S, P, G, E) {
    const g = (G.Lt ? G.Lt.golden : 0) * (S.weather === 'clear' ? 1 : 0.25) * (1 - (G.Lt ? G.Lt.night : 0));
    if (g < 0.1) return;
    const W = G.w, H = G.h, k = W / 480, t = S.t;
    if (!E.glitPts) {
      const r = LB.rng(41), pts = [];
      for (let n = 0; n < 4000 && pts.length < 260 * k; n++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H), i = y * W + x;
        if (E.depth[i] >= 0.08) pts.push([x, y, r()]);
      }
      E.glitPts = pts;
    }
    const sunX = S.time < 12 ? W * 0.85 : W * 0.15;
    const hi = LB.mix('#ffe2a4', S.L.skyHor, 0.2), hot = '#fff4d8';
    ctx.save();
    for (const [x, y, ph] of E.glitPts) {
      const near = 1 - Math.min(1, Math.abs(x - sunX) / (W * 0.75));
      const v = Math.sin(t * (1.1 + ph) + ph * 37);
      if (v < 0.35 - 0.3 * near) continue;
      ctx.globalAlpha = g * (0.3 + 0.7 * near) * Math.min(1, (v + 0.4));
      const len = Math.round((1 + Math.floor(ph * 3) + near * 3) * k), ox = Math.round(Math.sin(t * 0.4 + ph * 9) * 2 * k);
      P.hline(x + ox, x + ox + len - 1, y, near > 0.6 && v > 0.8 ? hot : hi);
    }
    ctx.restore();
  }
  function waterExtras(ctx, S, P, G) {
    const E = extras.get(G.dir);
    if (!E || !E.depth) return;
    const W = G.w, k = W / 480, t = S.t, Lt = G.Lt || {};
    if (S.season === 'winter') return;
    glitter(ctx, S, P, G, E);
    if (E.bed) ctx.drawImage(E.bed, 0, 0);
    // foam: a thin line at the very edge and a second one that runs in and out
    const day = 1 - (Lt.night || 0);
    const fc = LB.mix('#5a6890', '#f2f8fc', Math.min(1, 0.25 + day));
    const run = 0.045 + 0.035 * (0.5 + 0.5 * Math.sin(t * 1.15));
    ctx.save();
    for (const i of E.edge) {
      const d = E.depth[i], x = i % W, y = (i / W) | 0;
      const wob = 0.012 * Math.sin(x * 0.11 / k + t * 1.7);
      if (d < 0.012 + wob * 0.4) { ctx.globalAlpha = 0.75; P.px(x, y, fc); }
      else if (Math.abs(d - run - wob) < 0.011) { ctx.globalAlpha = 0.5 * (1 - run / 0.09); P.px(x, y, fc); }
    }
    ctx.restore();
  }

  // after dark: every lamp and lit window up the beach trails down the water, broken and shimmering (the engine's
  // mirrored glow only reaches lamps right at the water's edge)
  function lampTrails(ctx, S, P, G) {
    const E = extras.get(G.dir), Lt = G.Lt || {};
    const glow = Lt.glow || 0;
    if (!E || !E.lamps || glow <= 0.15 || S.season === 'winter') return;
    const W = G.w, k = W / 480, t = S.t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of E.lamps) {
      const lx = Math.round(l.x);
      if (lx < 0 || lx >= W || E.colTop[lx] < 0 || E.colTop[lx] < l.bot) continue;
      const y0 = E.colTop[lx], len = Math.round((26 + Math.min(30, l.n * 1.5)) * k);
      const c = LB.mix(LB.hex(l.c.map((v) => Math.min(255, v * 1.1))), '#fff2c0', 0.25);
      for (let yy = 0; yy < len; yy++) {
        const y = y0 + yy;
        if (y >= G.h || E.depth[y * W + lx] < 0) continue;
        if (LB.hash(lx, Math.floor((y + t * 7) / (2 * k)), 3) <= 0.42) continue;
        const fall = 1 - yy / len;
        const wx = Math.round(Math.sin(y * 0.5 / k + t * 2.6) * 1.6 * k);
        const wid = Math.max(1, Math.round((1 + fall * 2.2) * k));
        ctx.globalAlpha = glow * fall * 0.55;
        P.rect(lx + wx - Math.floor(wid / 2), y, wid, 1, c);
      }
    }
    ctx.restore();
  }

  // ---- people, gulls, a fishing line ----
  function liveThings(ctx, S, P, G, CR, cropName) {
    const ts = 32 * (G.w / 480), t = S.t;
    const at = (c, r) => [(c - CR.c0) * ts, (r - CR.r0) * ts];
    const items = [];
    const o = (extra) => Object.assign({ t, scale: S.scale, sun: S.L.sun }, extra);
    if (cropName === 'pier') {
      // the sailor walks the beach and back
      const per = 26, u = (t % per) / per, f = u < 0.5 ? u * 2 : 2 - u * 2;
      const [sx, sy] = at(9.9 + f * 4.6, 13.7);
      items.push({ y: sy, d: () => LB.chibi(ctx, Math.round(sx), Math.round(sy), 'sailor', o({ dir: u < 0.5 ? 'right' : 'left', walk: true, seed: 1 })) });
      const [dx, dy] = at(4.15, 12.95);
      items.push({ y: dy, d: () => LB.chibi(ctx, Math.round(dx), Math.round(dy), 'dockhand', o({ dir: 'down', seed: 2 })) });
      const [fx, fy] = at(8.05, 16.25);
      items.push({ y: fy, d: () => {
        LB.chibi(ctx, Math.round(fx), Math.round(fy), 'fisher', o({ dir: 'down', seed: 3 }));
        if (S.season === 'winter') return;
        // the line: from the rod's tip out to a bobber on the water
        const k = ts / 32, tip = [fx + 9 * k, fy - 30 * k], bob = [fx + 15 * k, fy + 22 * k + Math.round(Math.sin(t * 1.4) * k)];
        ctx.save(); ctx.globalAlpha = 0.55; P.line(tip[0], tip[1], bob[0], bob[1], '#e8eef4'); ctx.restore();
        P.rect(bob[0] - Math.floor(k), bob[1] - Math.floor(k), Math.max(2, Math.round(2 * k)), Math.max(2, Math.round(2 * k)), '#e8443a');
        P.px(bob[0] - Math.floor(k), bob[1] - Math.floor(k), '#ffffff');
        LB.rings(ctx, [[Math.round(bob[0]), Math.round(bob[1] + 2 * k), 0.3]], S, { period: 3.2, r: Math.round(5 * k), alpha: 0.4 });
      } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();
    // gulls riding the wind over the water by day
    const night = S.L.night;
    if (night < 0.5 && S.weather !== 'rain') {
      const k = ts / 32;
      for (let i = 0; i < 3; i++) {
        const per = 22 + i * 5, u = ((t + i * 7.3) % per) / per;
        const x = Math.round((-20 + u * (G.w + 40)) ), y = Math.round(G.h * (0.62 + 0.1 * i) + Math.sin(t * 0.7 + i * 2) * 8 * k);
        const up = Math.floor(t * 3 + i) % 3 === 0 ? 1 : 0;
        const c = LB.mix('#f4f2ee', '#c8c4cc', 0.3);
        P.rect(x - Math.round(2 * k), y - up, Math.round(2 * k), Math.max(1, Math.round(k)), c);
        P.rect(x, y, Math.max(1, Math.round(k)), Math.max(1, Math.round(k)), '#9a9aa4');
        P.rect(x + Math.max(1, Math.round(k)), y - up, Math.round(2 * k), Math.max(1, Math.round(k)), c);
        // its shadow on the water, offset with the sun
        ctx.save(); ctx.globalAlpha = 0.18 * (1 - night); P.rect(x + Math.round(10 * k), y + Math.round(26 * k), Math.round(4 * k), Math.max(1, Math.round(k)), '#1c3038'); ctx.restore();
      }
    }
  }

  // the lighthouse's beam sweeping round at night
  function beam(ctx, S, P, G, CR) {
    const glow = (G.Lt && G.Lt.glow) || 0;
    if (glow < 0.3) return;
    const E = extras.get(G.dir);
    const ts = 32 * (G.w / 480);
    const lx = (12.15 - CR.c0) * ts, ly = (2.55 - CR.r0) * ts;
    const a = S.t * 0.9, len = G.w * 0.9;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16 * glow * (0.6 + 0.4 * Math.abs(Math.cos(a)));
    const dx = Math.cos(a), dy = Math.sin(a) * 0.45, sp = 0.09;
    P.poly([[lx, ly], [lx + (dx - dy * sp * 4) * len, ly + (dy + dx * sp) * len], [lx + (dx + dy * sp * 4) * len, ly + (dy - dx * sp) * len]], '#fff0b8');
    ctx.restore();
    void E;
  }

  const COPY = {
    order: 30, section: 'place', world: 'Lumar', now: 'lumar.jpg',
    name: "Diggen's Point",
    blurb: "Lumar's harbour beach as the game already builds it in Blender: the same models and the same angle, now lit live for the hour, with a sea that mirrors the pier and the cliffs.",
    see: [
      'The pier, the cliffs and the lanterns mirrored in the sea, wobbling with the water',
      'Sand showing through the shallows, the deep going sea-green, foam lapping in and out',
      'After dark every lantern trails down the water, and the lamps light the sand around them',
      'Shadows from the real 3D shapes swinging round with the sun',
      'Rain rings on the sea, snow settling on the beach and the pier in winter',
    ],
    build: 'Nothing here is redrawn: it is the harbour scene the game renders today, exported as passes and lit in the engine. The water is the engine work: the mirror pass, the depth under the surface, foam and light trails. The same passes work for every coast.',
  };
  // Diggen's Point (today's harbour scene, relit) is kept for reference but off the page: Lantern Quay replaces it
  LB.add(make('lumar-diggens', 'pier', Object.assign({}, COPY, { section: 'test', order: 32 })));
  LB.add(make('lumar-lighthouse', 'lighthouse', Object.assign({}, COPY, { section: 'test', order: 31, name: 'The lighthouse on the point' })));
})();

// Lumar: Lantern Quay — a purpose-made Blender diorama (dioramas/lantern_quay.py) in the game's own kit: a row of
// jettied, timber-framed harbour houses (the Gull & Lantern inn, a fishmonger under its awning, a chandlery, a
// warehouse with a hoist), a cobbled quay full of life, a coped stone wall with steps and a ladder, and the harbour —
// a sloop with its sail furled, two rowboats on their lines. Lit live; the engine draws the water (its colour by
// depth, the quay mirrored in it, glints, rain rings, shore ice); this file adds the people, gulls, and every lamp
// and lit window trailing down the water after dark.
(function () {
  'use strict';
  const LB = window.LB, RL = LB.relit;
  const C0 = 1, R0 = 0;                               // the frame's top-left, in the diorama's tiles
  const dirs = { 32: 'assets/lanternquay-main-32', 48: 'assets/lanternquay-main-48' };
  const lampsBy = new Map();

  // lamps and lit windows: clusters of the glow pass (once per render size)
  function lamps(G) {
    if (lampsBy.has(G.dir)) return lampsBy.get(G.dir);
    const W = G.w, H = G.h, N = W * H, em = G.emis, seen = new Uint8Array(N), out = [];
    const lit = (i) => em[i * 4] + em[i * 4 + 1] + em[i * 4 + 2] > 120;
    for (let i = 0; i < N; i++) {
      if (seen[i] || !lit(i)) continue;
      const st = [i]; seen[i] = 1;
      let n = 0, sx = 0, sy = 0, r = 0, g = 0, b = 0, bot = 0;
      while (st.length) {
        const j = st.pop(), jx = j % W, jy = (j / W) | 0;
        n++; sx += jx; sy += jy; r += em[j * 4]; g += em[j * 4 + 1]; b += em[j * 4 + 2]; bot = Math.max(bot, jy);
        for (const q of [j - 1, j + 1, j - W, j + W]) {
          if (q < 0 || q >= N || seen[q] || Math.abs((q % W) - jx) > 1 || !lit(q)) continue;
          seen[q] = 1; st.push(q);
        }
      }
      if (n >= 3) out.push({ x: sx / n, y: sy / n, bot, n, c: [r / n, g / n, b / n] });
    }
    // the topmost open-water pixel in each column
    const top = new Int16Array(W).fill(-1);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (G.info[(y * W + x) * 4 + 1] & 8) { top[x] = y; break; }
    const L = { list: out, top };
    lampsBy.set(G.dir, L);
    return L;
  }

  // every lamp and lit window trails down the water after dark, in broken, shimmering dashes (Look Book 1's harbour)
  function trails(ctx, S, P, G) {
    const glow = (G.Lt && G.Lt.glow) || 0;
    if (glow < 0.15 || S.season === 'winter' || !G.open) return;
    const W = G.w, k = W / 480, t = S.t, L = lamps(G);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of L.list) {
      const lx = Math.round(l.x);
      const y0 = L.top[lx];
      if (y0 < 0 || y0 < l.bot) continue;
      const far = Math.min(1, (y0 - l.y) / (W * 0.35));          // a window high up trails fainter than a lamp at the edge
      const len = Math.round((22 + Math.min(34, l.n * 0.9)) * k * (1 - 0.35 * far));
      const c = LB.mix(LB.hex(l.c.map((v) => Math.min(255, v * 1.1))), '#fff2c0', 0.25);
      for (let yy = 0; yy < len; yy++) {
        const y = y0 + yy;
        if (y >= G.h || !LB.inMask(G.open, lx, y)) continue;
        if (LB.hash(lx, Math.floor((y + t * 7) / (2 * k)), 3) <= 0.4) continue;
        const fall = 1 - yy / len;
        const wx = Math.round(Math.sin(y * 0.5 / k + t * 2.6 + lx) * 1.6 * k);
        const wid = Math.max(1, Math.round((0.8 + fall * 2.2 * Math.min(1, l.n / 12)) * k));
        ctx.globalAlpha = glow * fall * 0.6 * (1 - 0.5 * far);
        P.rect(lx + wx - Math.floor(wid / 2), y, wid, 1, c);
      }
    }
    ctx.restore();
  }

  function gulls(ctx, S, P, G) {
    const night = S.L.night;
    if (night > 0.5 || S.weather === 'rain') return;
    const k = G.w / 480, t = S.t;
    for (let i = 0; i < 3; i++) {
      const per = 21 + i * 6, u = ((t + i * 7.3) % per) / per;
      const x = Math.round(-20 * k + u * (G.w + 40 * k)), y = Math.round(G.h * (0.12 + 0.2 * i) + Math.sin(t * 0.7 + i * 2) * 8 * k);
      const up = Math.floor(t * 3 + i) % 3 === 0 ? Math.max(1, Math.round(k)) : 0;
      const c = '#f4f2ee', s = Math.max(1, Math.round(k));
      P.rect(x - 2 * s, y - up, 2 * s, s, c); P.rect(x, y, s, s, '#9a9aa4'); P.rect(x + s, y - up, 2 * s, s, c);
      ctx.save(); ctx.globalAlpha = 0.16 * (1 - night); P.rect(x + Math.round(12 * k), y + Math.round(30 * k), 4 * s, s, '#1c2a30'); ctx.restore();
    }
  }

  function people(ctx, S, P, G) {
    const ts = G.w / 15, t = S.t, k = ts / 32;
    const at = (c, r, z) => [Math.round((c - C0) * ts), Math.round((r - R0 - (z || 0) * 0.7071) * ts)];
    const o = (extra) => Object.assign({ t, scale: S.scale, sun: S.L.sun }, extra);
    const items = [];
    // the sailor strolls the quay and back
    const per = 30, u = (t % per) / per, f = u < 0.5 ? u * 2 : 2 - u * 2;
    const [sx, sy] = at(5.3 + f * 6.2, 4.95);
    items.push({ y: sy, d: () => LB.chibi(ctx, sx, sy, 'sailor', o({ dir: u < 0.5 ? 'right' : 'left', walk: true, seed: 1 })) });
    // the dockhand by the crates outside the inn
    const [dx, dy] = at(4.55, 4.7);
    items.push({ y: dy, d: () => LB.chibi(ctx, dx, dy, 'dockhand', o({ dir: 'down', seed: 2 })) });
    // the fisher at the edge, a line out to the water
    const [fx, fy] = at(9.65, 6.0);
    items.push({ y: fy, d: () => {
      LB.chibi(ctx, fx, fy, 'fisher', o({ dir: 'down', seed: 3 }));
      if (S.season === 'winter') return;
      const tip = [fx + 9 * k, fy - 30 * k], bob = [fx + 16 * k, fy + 26 * k + Math.round(Math.sin(t * 1.4) * k)];
      ctx.save(); ctx.globalAlpha = 0.55; P.line(tip[0], tip[1], bob[0], bob[1], '#e8eef4'); ctx.restore();
      const s2 = Math.max(2, Math.round(2 * k));
      P.rect(bob[0] - Math.floor(k), bob[1] - Math.floor(k), s2, s2, '#e8443a');
      P.px(bob[0] - Math.floor(k), bob[1] - Math.floor(k), '#ffffff');
      LB.rings(ctx, [[Math.round(bob[0]), Math.round(bob[1] + 2 * k), 0.3]], S, { period: 3.2, r: Math.round(5 * k), alpha: 0.4 });
    } });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();
  }

  LB.add(RL.scene({
    id: 'lumar', order: 30, section: 'place', world: 'Lumar', now: 'lumar.jpg',
    name: 'Lantern Quay',
    blurb: "Lumar's harbour built new in our own 3D kit, the way the first look book drew it: tall timber houses leaning over a cobbled quay, boats on their lines, and the whole town hanging upside down in the water.",
    see: [
      'Houses with their upper floors jutting out on carved brackets, stone below and timber above, shutters, flower boxes and a hanging inn sign',
      'A quay you could walk round: a fish stall under its awning, nets drying, rope, lobster pots, an anchor, a cat asleep on a barrel',
      'The quay and the boats mirrored in the harbour, wobbling with the water',
      'After dark every lamp and lit window trails down the water',
      'Snow on the roofs, the cobbles and the boats in winter, rings on the water in the rain',
    ],
    build: 'A new scene script in the same Blender kit the game uses: the houses, quay and boats are kit parts with more detail added (oversailing upper floors, coursed stone, an awning, a hoist, a proper sloop). It renders as passes like every scene, and the engine lights it and draws the water.',
    dirs,
    ready: (v) => LB.chibi.ready(['sailor', 'dockhand', 'fisher'], LB.state.chibi || 'round', v.ts / 32),
    lights(S, G) {
      const k = G.w / 480;
      return lamps(G).list.filter((l) => l.n >= 6).map((l) => ({ x: l.x, y: l.y, r: (10 + Math.min(12, l.n * 0.4)) * k, c: l.c, flicker: 0.6, i: 0.45 }));
    },
    water(ctx, S, P, G) { trails(ctx, S, P, G); },
    live(ctx, S, P, G) { people(ctx, S, P, G); gulls(ctx, S, P, G); },
    // golden hour: the low sun warms the faces it reaches (the house fronts, the quay), the shade stays cool
    after(ctx, S, P, G) {
      const g = (G.Lt ? G.Lt.golden : 0) * (S.weather === 'clear' ? 1 : 0.3) * (1 - S.L.night);
      if (g < 0.08 || !G.sunMask) return;
      const W = G.w, H = G.h;
      const tmp = LB.memo('lq-warm:' + G.dir, () => LB.canvas(W, H)), tc = LB.ctx2d(tmp);
      tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
      tc.drawImage(G.sunMask, 0, 0);
      tc.globalCompositeOperation = 'source-in'; tc.fillStyle = '#ffb46a'; tc.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.55 * g; ctx.drawImage(tmp, 0, 0);
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.12 * g; ctx.drawImage(tmp, 0, 0);
      // the evening sky's bounce: the quay sits in the houses' long shadow, so lift the shade with warm air light
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.5 * g; ctx.fillStyle = '#3a2a2e'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.3 * g; ctx.fillStyle = '#ff9a50'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    },
  }));
})();
