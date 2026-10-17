// Hoarfell: a mountain tarn under Fellhaven — a purpose-made 3D diorama in the game's own Blender kit
// (dioramas/hoarfell_tarn.py: Look Book 1's composition built as real models), relit live. Always winter: the engine's
// snow-on-whatever-faces-up is skipped (the diorama is snowy already) and the snow is shaded by its own little shader
// (below) — pink-gold lit snow and violet shade at dawn and golden hour, white and blue at noon, blue under warm windows
// at night. The open water under the frozen falls is the engine's water; the rest of the tarn is modelled ice.
(function () {
  const LB = window.LB;
  const C0 = [1, -1.6];                                         // the frame's top-left in the diorama (tiles, screen rows)
  // where things are, in diorama tiles (dioramas/hoarfell_tarn.json)
  const SMOKE = [[1.55, 0.721], [15.18, 3.402]];                 // from dioramas/hoarfell_tarn.json
  const PATH = [[-0.5, 7.8], [1.6, 7.0], [3.6, 6.3], [6.0, 5.95], [8.6, 5.85], [11.0, 6.15], [13.0, 6.55], [14.1, 6.85]];
  const RINK = [10.8, 4.15, 1.45, 0.72];
  const FISHER = [7.05, 3.72];
  const PEOPLE = ['skier', 'pilot', 'fisher'];
  const at = (col, row) => [(col - C0[0]) * 32, (row - C0[1]) * 32];      // diorama tile → native px at 32 px a tile
  const variant = () => LB.state.chibi || 'round';
  const toy = () => /^toy/.test(LB.state.version || '');

  const def = LB.relit.scene({
    id: 'hoarfell', order: 50, section: 'place', world: 'Hoarfell', name: 'Fellhaven Tarn',
    seasons: ['winter'], seasonNote: 'Always winter on Hoarfell',
    blurb: 'A mountain tarn under the crags, built new as a 3D diorama in the game\'s own model kit: a frozen waterfall, open water beneath it, the rest ice you can skate on, a chalet and a cabin, firs heavy with snow. At dawn and in the evening the snow turns pink and gold and the shade goes violet; at night it\'s blue under the windows.',
    see: [
      'Alpenglow: sunlit snow turns pink and gold at dawn and golden hour while the shade goes violet',
      'The frozen waterfall hanging down the crag, the open water below it mirroring the ice',
      'Ice with cracks, a swept rink and skate marks, an ice-fishing hole; snow sculpted into drifts and banks',
      'Shadows of the firs, the chalet and the lamps swinging round with the sun; the lamps and windows warm the blue snow at night',
    ],
    build: 'Everything here is built from the game\'s Blender kit, so it matches the other worlds, with a few new pieces: a front-gabled chalet, the ice curtain, crags and a sculpted snow ground. A real Hoarfell would be built the same way at full size; the snow colours by the hour and the water are engine work every snowy place shares.',
    now: 'hoarfell.jpg',
    dirs: { 32: 'assets/hoarfell-tarn-32', 48: 'assets/hoarfell-tarn-48' },
    live(ctx, S, P, G) { live(ctx, S, P, G); },
  });

  // ---- load: the passes, then the people ----
  const basePrep = def.prepare;
  const peopleReady = {};
  def.prepare = function (state) {
    const p = basePrep();
    const sc = /hd$/.test(state.version || '') ? 1.5 : 1, key = variant() + sc;
    if (!peopleReady[key] && LB.chibi && LB.chibi.ready) {
      const q = LB.chibi.ready(PEOPLE, variant(), sc).then(() => { peopleReady[key] = true; });
      return p ? Promise.all([p, q]) : q;
    }
    return p;
  };

  // ---- the ground: the engine's light, then the snow re-coloured by the hour ----
  // Snow is shaded from the light passes alone: the sun's share of the light decides lit vs shade (measured against
  // the best-lit snow this hour, so low dawn and evening sun still reads as lit), the sky pass gives the hollows, and the
  // colours come from the hour. Everything that isn't snow keeps the engine's colours with a lighter warm/cool lean.
  const hx = (c) => { c = LB.rgb(c); return [c[0], c[1], c[2]]; };
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const DEC = new Float32Array(256);
  for (let v = 0; v < 256; v++) DEC[v] = (v / 255) * (v / 255) * 4;
  function snowColours(S) {
    const L = S.L, t = S.time, gold = L.golden, night = L.night;
    const late = LB.clamp((t - 18.6) / 0.8, 0, 1);
    // pink-gold only where the sun lands; the shade stays a cool blue-grey on white (a touch deeper late on), not violet
    const goldLit = t < 12 ? hx('#ffd0d2') : mix3(hx('#ffdcbc'), hx('#ffaa9c'), late);
    const goldSh = t < 12 ? hx('#b0bad8') : mix3(hx('#adb8d8'), hx('#96a0c8'), late);
    let lit = mix3(hx('#fbfcff'), goldLit, gold), sh = mix3(hx('#bcc8e8'), goldSh, gold);
    lit = mix3(lit, hx('#8494d6'), night); sh = mix3(sh, hx('#3c4584'), night);
    if (S.weather !== 'clear') {
      const grey = mix3(hx('#dfe3ec'), hx('#4a5280'), night);
      lit = mix3(lit, grey, 0.65); sh = mix3(sh, mix3(grey, hx('#9aa2c4'), 0.5 * (1 - night)), 0.5);
    }
    return { lit, sh };
  }
  const ICE_LIT = hx('#c4e2f2'), ICE_SH = hx('#6c90b6');
  const baseGround = def.ground;
  def.ground = function (ctx, S, P) {
    const S2 = Object.assign({}, S, { season: 'summer', weather: S.weather === 'snow' ? 'fog' : S.weather });
    baseGround.call(this, ctx, S2, P);
    const G = Object.values(def._G).find((g) => g.w === ctx.canvas.width && g.h === ctx.canvas.height);
    if (!G || !G.sunMask) return;
    const w = G.w, h = G.h, N = w * h;
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const sm = LB.ctx2d(G.sunMask).getImageData(0, 0, w, h).data;
    const A = G.albedo, F = G.info, SK = G.sky, LP = G.lamps, Lt = G.Lt || {};
    const L = S.L, gold = L.golden, night = L.night, day = 1 - night;
    const { lit, sh } = snowColours(S);
    const hard = toy();
    const wf = S.weather === 'clear' ? 1 : 0.35;
    const isSnow = (p) => {
      const ar = A[p], ag = A[p + 1], ab = A[p + 2], al = 0.3 * ar + 0.59 * ag + 0.11 * ab;
      if (al < 195 || Math.max(ar, ag, ab) - Math.min(ar, ag, ab) > 46) return 0;      // the crag's pale rock stays rock
      const f = F[p + 1];
      if (f & 8) return 0;                                       // the open water
      if (f & 48) return al;                                     // the ground and the roofs
      return ab - ar < 20 ? al : 0;                              // white things on objects; not the bluish ice
    };
    if (!G._snowRef) {
      let sum = 0, n = 0;
      for (let i = 0; i < N; i++) { const al = isSnow(i * 4); if (al > 190) { sum += al; n++; } }
      G._snowRef = n ? sum / n : 230;
    }
    const ref = G._snowRef;
    const hist = new Uint32Array(256);
    let ns = 0;
    for (let i = 0; i < N; i++) { const p = i * 4; if (isSnow(p) > 200) { hist[sm[p + 3]]++; ns++; } }
    let acc = 0, p95 = 255;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= ns * 0.05) { p95 = v; break; } }
    const sunUp = S.time > 6.2 && S.time < 19.6 ? 1 : 0;
    const norm = Math.max(40, p95) / 255;
    for (let i = 0; i < N; i++) {
      const p = i * 4;
      if (d[p + 3] === 0) continue;
      let share = sm[p + 3] / 255;
      const al = isSnow(p);
      if (al) {
        let litness = LB.smooth(0.3, 0.78, share / norm) * sunUp * (0.35 + 0.65 * wf);
        if (hard) litness = litness > 0.62 ? 1 : litness > 0.25 ? 0.5 : 0;
        const skyL = DEC[SK[p]];
        let relief = LB.clamp(0.72 + 0.28 * skyL, 0.62, 1.04);
        if (hard) relief = relief > 0.95 ? 1 : relief > 0.82 ? 0.9 : 0.78;
        // two kinds only: fresh snow, and the trodden path (a touch darker and cooler) — no grain
        const lane = al / ref < 0.92;
        const tone = (lane ? 0.87 : 1) * relief;
        let r = (sh[0] + (lit[0] - sh[0]) * litness) * tone, g = (sh[1] + (lit[1] - sh[1]) * litness) * tone, b = (sh[2] + (lit[2] - sh[2]) * litness) * tone;
        if (lane) { r *= 0.97; b *= 1.03; }
        if (LP) { const k = (Lt.lamp || 0) * 0.85; r += DEC[LP[p]] * k * 255 * 0.9; g += DEC[LP[p + 1]] * k * 255 * 0.8; b += DEC[LP[p + 2]] * k * 255 * 0.55; }
        d[p] = r; d[p + 1] = g; d[p + 2] = b;
        continue;
      }
      // ice (bluish, not the open water): the snow's colours by the hour leaned toward blue, its marks kept
      const f2 = F[p + 1];
      if (!(f2 & 8) && A[p + 2] - A[p] > 18) {
        const ial = 0.3 * A[p] + 0.59 * A[p + 1] + 0.11 * A[p + 2];
        if (ial > 120) {
          let litness = LB.smooth(0.3, 0.78, share / norm) * sunUp * (0.35 + 0.65 * wf);
          if (hard) litness = litness > 0.62 ? 1 : litness > 0.25 ? 0.5 : 0;
          const lr = mix3(lit, ICE_LIT, 0.45), sr = mix3(sh, ICE_SH, 0.42);
          const mark = LB.clamp(ial / 205, 0.62, 1.12);
          let r = (sr[0] + (lr[0] - sr[0]) * litness) * mark, g = (sr[1] + (lr[1] - sr[1]) * litness) * mark, b = (sr[2] + (lr[2] - sr[2]) * litness) * mark;
          if (LP) { const kk = (Lt.lamp || 0) * 0.6; r += DEC[LP[p]] * kk * 230; g += DEC[LP[p + 1]] * kk * 200; b += DEC[LP[p + 2]] * kk * 150; }
          d[p] = r; d[p + 1] = g; d[p + 2] = b;
          continue;
        }
      }
      // not snow: lean lit parts warm and shade cool, more at golden hour
      if (hard) share = share > 0.45 ? 1 : 0;
      const kLit = share * (0.06 + 0.22 * gold) * day * wf, kSh = (1 - share) * (0.05 + 0.08 * gold) * day;
      let r = d[p], g = d[p + 1], b = d[p + 2];
      r *= 1 + kLit * 0.9; g *= 1 + kLit * 0.55; b *= 1 + kLit * 0.4;
      r *= 1 - kSh * 0.18; g *= 1 - kSh * 0.22; b *= 1 + kSh * 0.1;
      d[p] = r; d[p + 1] = g; d[p + 2] = b;
    }
    ctx.putImageData(img, 0, 0);
  };

  // ---- what moves: the people, chimney smoke, glints on the ice, snow you can see against snow ----
  def.weatherFx = false;
  function pathAt(u) {
    let total = 0;
    const seg = [];
    for (let i = 0; i + 1 < PATH.length; i++) { const l = Math.hypot(PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1]); seg.push(l); total += l; }
    let dd = u * total;
    for (let i = 0; i < seg.length; i++) {
      if (dd <= seg[i]) { const t = dd / seg[i]; return [PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * t, PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * t, PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1]]; }
      dd -= seg[i];
    }
    const n = PATH.length - 1;
    return [PATH[n][0], PATH[n][1], 1, 0];
  }
  const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  function live(ctx, S, P, G) {
    const k = S.scale || 1, t = S.t, v = variant(), sun = S.L.sun;
    if (S.weather === 'rain' || S.weather === 'fog') LB.weatherFx(ctx, S);
    // glints on the ice
    if (G && !G._icePts) {
      const pts = [], r = LB.rng(5), A = G.albedo, F = G.info;
      for (let tries = 0; tries < 60000 && pts.length < G.w * G.h / 1100; tries++) {
        const x = Math.floor(r() * G.w), y = Math.floor(r() * G.h), p = (y * G.w + x) * 4;
        if (A[p + 3] > 200 && !(F[p + 1] & 8) && A[p + 2] - A[p] > 18 && 0.3 * A[p] + 0.59 * A[p + 1] + 0.11 * A[p + 2] > 170) pts.push([x, y, r()]);
      }
      G._icePts = pts;
    }
    if (G && G._icePts.length && S.weather !== 'snow') LB.glints(ctx, G._icePts, S, { rate: 0.7, big: k > 1.2, color: S.L.night > 0.5 ? '#c8d6ff' : LB.mix('#ffffff', '#ffd6c0', S.L.golden) });
    // the people: a skier walking the lantern path, the pilot skating round the rink, someone fishing through the ice
    const people = [];
    {
      const period = 30, u = (t % period) / period, f = u < 0.5 ? u * 2 : 2 - u * 2;
      const [x, y, dx, dy] = pathAt(0.08 + f * 0.8);
      const [px, py] = at(x, y);
      people.push({ y: py, d: () => LB.chibi(ctx, Math.round(px * k), Math.round(py * k), 'skier', { dir: dirOf(u < 0.5 ? dx : -dx, u < 0.5 ? dy : -dy), walk: true, t, variant: v, scale: k, seed: 2, sun }) });
    }
    {
      const a = t * 0.55, x = RINK[0] + Math.cos(a) * RINK[2] * 0.7, y = RINK[1] + Math.sin(a) * RINK[3] * 0.7;
      const [px, py] = at(x, y);
      people.push({ y: py, d: () => LB.chibi(ctx, Math.round(px * k), Math.round(py * k), 'pilot', { dir: dirOf(-Math.sin(a), Math.cos(a) * 0.5), walk: true, t: t * 0.6, variant: v, scale: k, seed: 5, sun }) });
    }
    {
      const [px, py] = at(FISHER[0], FISHER[1]);
      people.push({ y: py, d: () => LB.chibi(ctx, Math.round(px * k), Math.round(py * k), 'fisher', { dir: 'down', t, variant: v, scale: k, seed: 7, sun, item: null }) });
    }
    people.sort((a, b) => a.y - b.y).forEach((p) => p.d());
    // chimney smoke
    for (const [col, row] of SMOKE) {
      const [sx, sy] = at(col, row);
      ctx.save();
      for (let q = 0; q < 8; q++) {
        const u = ((t * 0.2 + q / 8) % 1);
        ctx.globalAlpha = (1 - u) * 0.5;
        P.disc((sx + u * u * 18 + Math.sin(u * 6 + q) * 1.5) * k, (sy - u * 34) * k, (1.5 + u * 4.5) * k, u < 0.3 ? '#eef0f6' : '#d4d8e4');
      }
      ctx.restore();
    }
    if (S.weather === 'snow') snowfall(ctx, S, P, k);
  }
  // shaded flakes: a white pixel with a blue-grey one under it, so they show on snow as well as on the firs
  function snowfall(ctx, S, P, k) {
    const W = S.w, H = S.h, t = S.t, n = Math.round((W * H) / (700 * k * k));
    for (let i = 0; i < n; i++) {
      const h1 = LB.hash(i, 1, 41), h2 = LB.hash(i, 2, 41), h3 = LB.hash(i, 3, 41);
      const sp = (12 + h3 * 16) * k;
      const y = Math.floor((h2 * (H + 10) + t * sp) % (H + 10)) - 5;
      const x = Math.floor((((h1 * W + Math.sin(t * 0.9 + i) * 5 * k + t * 6 * k) % W) + W) % W);
      const big = h3 > 0.7 || (k > 1.2 && h3 > 0.4);
      P.px(x, y + 1, '#9aa6c4');
      P.px(x, y, '#ffffff');
      if (big) { P.px(x + 1, y + 1, '#9aa6c4'); P.px(x + 1, y, '#f4f8ff'); P.px(x, y + 2, '#b4bed6'); }
    }
  }

  LB.add(def);
})();
