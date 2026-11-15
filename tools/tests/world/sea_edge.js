// An island's own water and the open sea read as one body of water (js/sea.js `shelter` / `calmOver`, *Still water
// that belongs to its sea* in apps/bridge/CLAUDE.md). Each island at noon (and one at golden hour and at night), its
// water layer as drawn this frame: the sheltered still water against the open water of the same depth must be close in
// colour, lightness aside (the old still water was one grey-blue in every sea: a slab round each island, worst in the Crimson), a little
// darker (it still reads as still), there at all where there's a harbour, and nowhere near the render's edge (so no
// straight outline where the island's picture ends). Shots of each beside the open sea: shots/sea_edge_*.png.
// node world/sea_edge.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const CASES = [            // world, where to look (tiles), the hour on the 24-hour face
  ['lumar-tern', [19, 22], 12.5], ['lumar-cinder', [26, 32], 12.5], ['lumar-sapphire', [28, 30], 12.5],
  ['lumar-rose', [28, 24], 12.5], ['lumar-crimson', [28, 38], 12.5], ['lumar-holm', [21, 26], 12.5],
  ['lumar-tern', [19, 22], 18.2], ['lumar-cinder', [26, 32], 22.5]
];
const MAX_D = 16;          // how far apart the still water's colour and the open water's may be (lightness aside)
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  const bad = (m) => { errs++; console.log('FAILED', m); };
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_railway', JSON.stringify({ seen: 1 })); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T03:20'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeWeather._pin && BridgeWeather._pin('lumar', 'clear'); BridgeBloom._force(0); });
  let loaded = null;
  for (const [world, at, hour] of CASES) {
    if (loaded !== world) {
      const ok = await p.evaluate((w) => new Promise((r) => { const t = setTimeout(() => r(false), 30000); BridgeWorld.load(w, () => { clearTimeout(t); BridgeState.transition('world', { worldId: w }); r(true); }); }), world);
      if (!ok) { bad(world + ' did not load'); continue; }
      loaded = world;
      await p.evaluate((q) => BridgeCharacter.init(q[0], q[1]), at);
    }
    // look where there's most still deep water to set beside the open (a screen's worth round it), else where asked
    for (let i = 0; i < 60 && !(await p.evaluate(() => { const S = BridgeSea._shore(BridgeWorld.getWorld().scene.id); return S && S.ready; })); i++) await p.waitForTimeout(250);
    const look = await p.evaluate(() => {
      const sc = BridgeScene.get(BridgeWorld.getWorld().scene.id), S = BridgeSea._shore(sc.id);
      if (!S || !S.calm) return null;
      const cd = S.calm.getContext('2d').getImageData(0, 0, S.W, S.H).data, tw = Math.ceil(S.W / 32), th = Math.ceil(S.H / 32), n = new Float32Array(tw * th);
      for (let y = 0; y < S.H; y += 2) for (let x = 0; x < S.W; x += 2) if (cd[(y * S.W + x) * 4 + 3] === 255 && S.band[y * S.W + x] === 3) n[(y >> 5) * tw + (x >> 5)]++;
      let best = -1, at = null;
      for (let ty = 0; ty + 10 <= th; ty++) for (let tx = 0; tx + 16 <= tw; tx++) {
        let sum = 0;
        for (let y = ty; y < ty + 10; y++) for (let x = tx; x < tx + 16; x++) sum += n[y * tw + x];
        if (sum > best) { best = sum; at = [tx + 8 - sc.meta.originX / 32, ty + 5 - sc.meta.originY / 32]; }
      }
      return best > 0 ? at : null;
    });
    const focus = look || at;
    await p.evaluate((q) => { BridgeWorld.setFocus({ x: q[0], y: q[1] }); BridgeWorld.snapCamera(); }, focus);
    // the hour forced, and a new composition of it made (the sea takes its light from the live light's)
    const sid = await p.evaluate(() => BridgeWorld.getWorld().scene.id);
    for (let i = 0; i < 80; i++) { const s = await p.evaluate((s) => BridgeLit._stats(s), sid); if (s && s.drawing) break; await p.waitForTimeout(250); }
    const comps = ((await p.evaluate((s) => BridgeLit._stats(s), sid)) || {}).comps || 0;
    await p.evaluate((h) => BridgeLit._force({ hour: h, season: 'summer' }), hour);
    for (let i = 0; i < 80; i++) { const s = await p.evaluate((s) => BridgeLit._stats(s), sid); if (s && s.comps > comps) break; await p.waitForTimeout(150); }
    await p.waitForTimeout(1500);
    let r = null;
    for (let i = 0; i < 60; i++) {
      await p.waitForTimeout(500);
      r = await p.evaluate(() => {
        const sc = BridgeScene.get(BridgeWorld.getWorld().scene.id), S = BridgeSea._shore(sc.id);
        if (!S || !S.ready || !S.v) return null;
        const L = BridgeSea._light(BridgeWorld.getWorld().sea || 'emerald', sc.id).L;
        const lt = sc.lit && BridgeLit.light(sc.id);
        if (!lt) return null;
        const v = S.v, W = S.W, lay = S.layer.getContext('2d').getImageData(v[0], v[1], v[2], v[3]).data;
        let calm = null, edge = 0, any = 0;
        if (S.calm) {
          const cd = S.calm.getContext('2d').getImageData(0, 0, W, S.H).data;
          calm = (x, y) => cd[(y * W + x) * 4 + 3];
          for (let y = 0; y < S.H; y++) for (let x = 0; x < W; x++) {
            const a = cd[(y * W + x) * 4 + 3];
            if (a) any++;
            if (a && (x < 24 || y < 24 || x >= W - 24 || y >= S.H - 24)) edge++;
          }
        }
        const st = [[], [], []], op = [[], [], []];
        for (let y = 0; y < v[3]; y += 2) for (let x = 0; x < v[2]; x += 2) {
          const gx = v[0] + x, gy = v[1] + y, i = gy * W + gx;
          if (S.band[i] !== 3) continue;
          const o = (y * v[2] + x) * 4, a = calm ? calm(gx, gy) : 0, into = a >= 250 ? st : a === 0 ? op : null;
          if (!into || lay[o + 3] < 250) continue;
          into[0].push(lay[o]); into[1].push(lay[o + 1]); into[2].push(lay[o + 2]);
        }
        const mean = (l) => l.length ? l.reduce((s, n) => s + n, 0) / l.length : NaN;
        return { still: st[0].length, open: op[0].length, s: st.map(mean), o: op.map(mean), edge, any, night: L.night };
      });
      if (r && r.still > 200 && r.open > 200) break;
    }
    const tag = world + ' @' + hour;
    if (!r) { bad(tag + ': its water never drew'); continue; }
    // the hue apart (each colour over its own lightness, at the open water's lightness), and how much darker it lies
    const luma = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], ls = luma(r.s), lo = luma(r.o);
    const d = Math.hypot(...[0, 1, 2].map((i) => (r.s[i] / ls - r.o[i] / lo) * lo)), dark = ls / lo;
    console.log('sea_edge:', tag, '· still', r.still, 'px', r.s.map(Math.round).join(','), '· open', r.open, 'px', r.o.map(Math.round).join(','),
      '· hue apart', d.toFixed(1), '· lightness', dark.toFixed(2), '· still water near the edge', r.edge, 'px of', r.any);
    if (!r.any) bad(tag + ': no still water at all (a harbour should have some)');
    if (r.edge) bad(tag + ': still water reaches the render\'s edge (' + r.edge + ' px): a straight outline where the picture ends');
    if (r.still > 200 && r.open > 200) {
      if (d > MAX_D) bad(tag + ': the still water\'s colour is ' + d.toFixed(1) + ' off the open water\'s (want under ' + MAX_D + '): a slab of another colour');
      // (the open water's lightness in one view leans on how much of its swell is in it: a few per cent either way)
      if (dark > 1.1) bad(tag + ': the still water is lighter than the open water (it should lie darker)');
      if (dark < 0.72) bad(tag + ': the still water is far darker than the open water (' + dark.toFixed(2) + '): a hole in the sea');
    } else console.log('sea_edge:', tag, '· not enough of both in view to compare');
    await p.screenshot({ path: SHOTS + '/sea_edge_' + world + '_' + hour + '.png' });
  }
  await b.close();
  console.log(errs ? 'sea_edge: ' + errs + ' problem(s)' : 'sea_edge: ok');
  process.exit(errs ? 1 : 0);
})();
