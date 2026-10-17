// The other ships out on the water (js/sloop.js: the routes, the grounds, the loopers): a crowded calm sea, a Crimson
// pirate, a navy patrol, the fishing grounds - by night and by day - and every island's pier with the sloop at her new
// size. Checks the routes keep off the land and out of the harbour mouths, that the ships are where the clock says
// whichever island you cast off from (so two pilots see the same ships), that no trader sails the Crimson or the
// Midnight Sea, and that they keep clear of you and of each other. node world/sea.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const NIGHT = '2026-10-16T07:20', DAY = '2026-10-16T12:00';           // Lumar's midnight and noon (its 8-hour day)
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  const bad = (m) => { errs++; console.log('FAILED', m); };
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=' + NIGHT); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });

  const sailFrom = async (id) => {
    await p.evaluate(() => { if (BridgeSloop.isRunning()) BridgeSloop.stop(); });
    await p.waitForTimeout(600);
    await p.evaluate((id) => new Promise(r => BridgeWorld.load(id, () => { BridgeState.transition('world', { worldId: id }); r(); })), id);
    await p.waitForTimeout(1500);
    await p.evaluate((id) => BridgeSloop.start(id), id);
    for (let i = 0; i < 80 && (await p.evaluate(() => BridgeSloop._phase())) !== 'sail'; i++) await p.waitForTimeout(250);
  };
  // put her at chart (cx, cy), stopped, the camera on her
  const goTo = async (cx, cy, h) => {
    await p.evaluate(([cx, cy, h]) => { const w = BridgeSloop._toWorld(cx, cy), bt = BridgeSloop._boat(); bt.x = w.x; bt.r = w.r; bt.v = 0; if (h != null) bt.h = h; BridgeSloop._snap(); }, [cx, cy, h]);
    await p.waitForTimeout(1600);
  };
  // the gap between two hulls' keel lines (as js/sloop.js keeps them apart)
  const keel = (o) => { const L = o.L / 2 - 0.25, c = Math.cos(o.h), s = Math.sin(o.h); return [o.x - c * L, o.r - s * L, o.x + c * L, o.r + s * L]; };
  const onKeel = (px, py, S) => { const dx = S[2] - S[0], dy = S[3] - S[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - S[0]) * dx + (py - S[1]) * dy) / L)) : 0; return Math.hypot(px - S[0] - dx * t, py - S[1] - dy * t); };
  const gap = (a, b) => { const A = keel(a), B = keel(b); return Math.min(onKeel(A[0], A[1], B), onKeel(A[2], A[3], B), onKeel(B[0], B[1], A), onKeel(B[2], B[3], A)); };
  // the boat put abeam of the nearest ship of a role, a couple of tiles off, so she's framed beside it
  const frameOn = async (role) => {
    const ok = await p.evaluate((role) => {
      const bt = BridgeSloop._boat(), o = BridgeSloop._traffic().filter(o => o.role === role || o.kind === role).sort((a, b) => Math.hypot(a.x - bt.x, a.r - bt.r) - Math.hypot(b.x - bt.x, b.r - bt.r))[0];
      if (!o) return false;
      let px = -Math.sin(o.h), pr = Math.cos(o.h);                     // abeam of her, on her northern side (she's below you)
      if (pr > 0) { px = -px; pr = -pr; }
      const d = (o.spec.beam + 1.23) / 2 + 2.3;
      bt.x = o.x + px * d; bt.r = o.r + pr * d; bt.h = o.h; bt.v = 0; BridgeSloop._snap(); return true;
    }, role);
    await p.waitForTimeout(350);
    return ok;
  };
  // night, then day (Lumar's noon), framed on a role each time
  const both = async (name, role) => {
    if (role) await frameOn(role);
    await shot(name + '_night');
    await p.evaluate((at) => BridgeClock._at(at), DAY); await p.waitForTimeout(1300);
    if (role) await frameOn(role);
    await shot(name + '_day');
    await p.evaluate((at) => BridgeClock._at(at), NIGHT); await p.waitForTimeout(500);
  };
  const shot = (name) => p.screenshot({ path: `${SHOTS}/sea_${name}.png` });
  // the other ships near you (onScreen: only those in view), and which sea each is on
  const seen = (onScreen) => p.evaluate((on) => {
    const cm = BridgeSloop._cam();
    return BridgeSloop._traffic().filter(o => !on || ((o.x * 32 - cm.x) > -40 && (o.x * 32 - cm.x) < cm.W + 40 && (o.r * 32 - cm.y) > -20 && (o.r * 32 - cm.y) < cm.H + 60))
      .map(o => ({ kind: o.kind || 'sloop', role: o.role, x: o.x, r: o.r, h: o.h, L: o.spec ? o.spec.L : 3.2, B: o.spec ? o.spec.beam : 1.23, sea: BridgeSloop._sea(o.x, o.r) }));
  }, !!onScreen);

  await sailFrom('lumar');
  const chk = await p.evaluate(() => BridgeSloop._planCheck());
  console.log('routes', chk.routes, 'ships', chk.ships, 'grounds', chk.grounds, 'route points', chk.pts, 'on land', chk.land, 'in a harbour mouth', chk.mouth, JSON.stringify(chk.kinds));
  if (chk.ships < 30) bad('only ' + chk.ships + ' ships on the routes');
  if (chk.land) bad(chk.land + ' route points within 6 tiles of land');
  if (chk.mouth) bad(chk.mouth + ' route points in a harbour mouth');

  // the same ships at the same moment whichever island you cast off from (the chart's own frame, the clock)
  const T = Math.floor(Date.now() / 1000) + 30;
  const fromLumar = await p.evaluate((T) => BridgeSloop._shipsAt(T), T);
  // and no trader in the Crimson or the Midnight Sea, ever (sampled through a day)
  const traders = await p.evaluate((T) => {
    let shown = 0, wrong = 0;
    for (let k = 0; k < 96; k++) BridgeSloop._shipsAt(T + k * 900).forEach(s => { if (s.role === 'merchant' && s.shown) { shown++; const c = BridgeSloop._toWorld(s.X / 600, s.Y / 432); const sea = BridgeSloop._sea(c.x, c.r); if (sea === 'crimson' || sea === 'midnight') wrong++; } });
    return { shown, wrong };
  }, T);
  console.log('traders sampled', traders.shown, 'in the Crimson or Midnight', traders.wrong);
  if (traders.wrong) bad(traders.wrong + ' traders shown in the Crimson or the Midnight Sea');

  // a crowded calm sea: the stretch of water with the most ships in view right now
  const best = await p.evaluate(() => {
    const T = Date.now() / 1000, S = BridgeSloop._shipsAt(T).filter(s => s.shown);
    let top = null, n = 0;
    S.forEach(a => { const c = S.filter(b => Math.abs(b.X - a.X) < 12 && Math.abs(b.Y - a.Y) < 8); if (c.length > n) { n = c.length; top = c; } });
    const mx = top.reduce((t, b) => t + b.X, 0) / n, my = top.reduce((t, b) => t + b.Y, 0) / n;
    return { n, cx: mx / 600, cy: (my - 2) / 432 };
  });
  console.log('busiest water', best.n, 'ships on the routes there');
  await goTo(best.cx, best.cy);
  let vis = await seen(true);
  console.log('in view', vis.length, JSON.stringify(vis.map(v => v.kind)));
  if (vis.length < 2) bad('a quiet sea where it should be busy: ' + vis.length + ' in view');
  vis = await seen();
  const me = await p.evaluate(() => { const b = BridgeSloop._boat(); return { x: b.x, r: b.r, h: b.h, L: 3.2, B: 1.23 }; });   // where she was as they were measured
  await shot('crowded_night');
  const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / ((performance.now() - t0) / 1000)); })(); }));
  console.log('frames a second with them all in view:', fps.toFixed(1));
  let close = 0;
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], c = vis[j], d = gap(a, c);
    if (d < (a.B + c.B) / 2 + 0.3) { close++; console.log('close: ' + a.kind + ' and ' + c.kind + ' ' + d.toFixed(2) + ' apart'); }
  }
  if (close > 2) bad(close + ' pairs of ships on top of each other');
  vis.forEach(v => { if (gap(v, me) < (v.B + me.B) / 2 + 0.6) bad('the ' + v.kind + ' sailed into you'); });
  await p.evaluate((at) => BridgeClock._at(at), DAY); await p.waitForTimeout(1200);
  await shot('crowded_day');
  await p.evaluate((at) => BridgeClock._at(at), NIGHT); await p.waitForTimeout(600);
  await both('merchant', 'merchant');

  // a navy patrol in company, and a fishing ground (a trawler with her net out, dories at anchor)
  for (const [role, name] of [['navy', 'navy'], ['fisher', 'trawler'], ['privateer', 'privateer'], ['m_galleon', 'merchant_galleon'], ['navy_galleon', 'man_of_war']]) {
    const at = await p.evaluate((role) => { const s = BridgeSloop._shipsAt(Date.now() / 1000 + 1.5).find(s => (s.role === role || s.kind === role) && s.shown); return s && { cx: s.X / 600, cy: (s.Y - 3) / 432, kind: s.kind }; }, role);
    if (!at) { bad('no ' + role + ' on the routes'); continue; }
    await goTo(at.cx, at.cy);
    await frameOn(role);
    vis = await seen(true);
    console.log(name + ':', JSON.stringify(vis.map(v => v.kind)));
    if (!vis.some(v => v.role === role || v.kind === role)) bad('no ' + role + ' in view where the plan has one');
    await both(name, role);
  }
  // hail one
  const hailed = await p.evaluate(() => { const o = BridgeSloop._traffic()[0]; if (!o) return null; BridgeSloop._hail(o); return o.role; });
  await p.waitForTimeout(400);
  console.log('hailed a', hailed, ':', await p.evaluate(() => (BridgeSloop._msg() || '').slice(0, 140)));

  // pirates lurking in the Crimson (from the cells: sail in and look about)
  let pirate = null;
  for (const [cx, cy] of [[0.27, 0.70], [0.24, 0.66], [0.30, 0.80], [0.12, 0.66], [0.33, 0.88], [0.20, 0.92]]) {
    await goTo(cx, cy);
    await p.waitForTimeout(600);
    pirate = await p.evaluate(() => { const o = BridgeSloop._traffic().find(o => o.role === 'pirate'); return o && { x: o.x, r: o.r, kind: o.kind }; });
    if (pirate) break;
  }
  if (!pirate) bad('no pirates lurking in the Crimson');
  else {
    await frameOn('pirate');
    console.log('pirate:', pirate.kind, 'sea', await p.evaluate(() => { const bt = BridgeSloop._boat(); return BridgeSloop._sea(bt.x, bt.r); }));
    await both('pirate', 'pirate');
  }
  // the Midnight Sea: nobody
  await goTo(0.24, 0.30);
  await p.waitForTimeout(800);
  const near = await seen(), mid = near.filter(v => v.sea === 'midnight');
  console.log('on the Midnight Sea:', mid.length, 'ships (' + near.length + ' in the seas round it)');
  if (mid.length) bad('traffic on the Midnight Sea: ' + JSON.stringify(mid.map(v => v.kind)));
  const reds = near.concat(await seen()).filter(v => v.sea === 'crimson' && (v.role === 'merchant' || v.role === 'fisher' || v.role === 'sloop'));
  if (reds.length) bad('traders or fishermen in the Crimson: ' + JSON.stringify(reds.map(v => v.kind)));

  // cast off from another island: the same ships at the same moment
  await sailFrom('lumar-tern');
  const fromTern = await p.evaluate((T) => BridgeSloop._shipsAt(T), T);
  let diff = 0;
  fromLumar.forEach((s, i) => { const o = fromTern[i]; if (!o || Math.abs(o.X - s.X) > 1e-6 || Math.abs(o.Y - s.Y) > 1e-6) diff++; });
  console.log('same ships from Tern Holm as from Diggen\'s Point:', diff ? diff + ' differ' : 'all ' + fromLumar.length);
  if (diff) bad(diff + ' ships elsewhere when cast off from another island');
  await p.evaluate(() => BridgeSloop.stop()); await p.waitForTimeout(1500);

  // every island's pier, the sloop at her new size lying across its end
  for (const id of ['lumar', 'lumar-crown', 'lumar-tern', 'lumar-holm', 'lumar-sapphire', 'lumar-rose', 'lumar-crimson', 'lumar-midnight']) {
    await p.evaluate((id) => new Promise(r => BridgeWorld.load(id, () => {
      const d = BridgeWorld.getWorld().interactions.find(i => i.type === 'go_sailing' || i.label === 'DOCK');
      BridgeState.transition('world', { worldId: id, spawn: d ? { x: d.x, y: d.y - 1 } : null }); r();
    })), id);
    await p.waitForTimeout(2600);
    await p.screenshot({ path: `${SHOTS}/sea_pier_${id}.png` });
    if (id === 'lumar-crown' || id === 'lumar-tern') {                   // and by day
      await p.evaluate((at) => BridgeClock._at(at), DAY); await p.waitForTimeout(1400);
      await p.screenshot({ path: `${SHOTS}/sea_pier_${id}_day.png` });
      await p.evaluate((at) => BridgeClock._at(at), NIGHT); await p.waitForTimeout(400);
    }
  }
  console.log('errors:', errs);
  await b.close();
})();
