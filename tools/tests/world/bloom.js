// The spore bloom (js/bloom.js): a night or two a month the whole sea lights up. Checks the calendar (one or two bloom
// days every month, the same on two pages, on only at night and only on those days), then shoots a bloom night and an
// ordinary one on Diggen's Point, Crownhaven and Rose Cove, at sea in the sloop in the Emerald and the Rose Sea, and the
// chart; and measures what the bloom costs a frame. node world/bloom.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const BLOOM = '2026-11-09T08:00', PLAIN = '2026-11-03T08:00';     // Lumar's midnight on a bloom day (the November new moon) and on an ordinary day
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  let errs = 0;
  const bad = (m) => { errs++; console.log('bloom: FAILED', m); };
  const page = async (at) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
    await p.goto('http://127.0.0.1:8766/bridge/?gpu=1&at=' + at); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeWeather._pin('lumar', 'fair'); });
    return p;
  };

  // ---- the calendar ------------------------------------------------------------------------------------------------------
  const p = await page(BLOOM), p2 = await page(PLAIN);
  const cal = (pg) => pg.evaluate(() => {
    const out = {};
    for (let y = 2026; y <= 2028; y++) for (let m = 1; m <= 12; m++) out[y + '-' + m] = BridgeBloom.nights(y, m);
    // through a bloom day and an ordinary one, every 20 minutes
    const t0 = Date.parse('2026-11-08T12:00:00Z'), ks = [];
    for (let i = 0; i < 72 * 3; i++) ks.push(+BridgeBloom.on(t0 + i * 1200000).toFixed(3));
    return { months: out, ks, next: BridgeBloom.next(Date.parse('2026-10-17T16:00:00Z')), label: BridgeBloom.label(Date.parse('2026-10-17T16:00:00Z')) };
  });
  const A = await cal(p), B2 = await cal(p2);
  const counts = Object.values(A.months).map(n => n.length);
  console.log('bloom: days a month', counts.join(''), '· e.g.', JSON.stringify(A.months['2026-11']), JSON.stringify(A.months['2026-12']));
  if (counts.some(n => n < 1 || n > 2)) bad('a month without one or two bloom days');
  if (JSON.stringify(A) !== JSON.stringify(B2)) bad('two pages disagree about the calendar');
  else console.log('bloom: the same calendar on two pages');
  const lit = A.ks.filter(k => k > 0.5).length, half = A.ks.filter(k => k > 0 && k < 1).length;
  console.log('bloom: through 3 days from 8 Nov, 20-minute steps lit', lit, 'easing', half, 'dark', A.ks.length - lit - half, '· from 17 Oct:', A.label, JSON.stringify(A.next));
  // the 9th and 10th of November are bloom days: six Lumar nights, each lit some 3-5 hours (12-16 steps)
  if (lit < 60 || lit > 100) bad('the bloom lit for ' + lit + ' steps of 20 minutes over three days (expected six Lumar nights)');
  if (!half) bad('the bloom never eased in or out');
  const onNow = await p.evaluate(() => BridgeBloom.on()), offNow = await p2.evaluate(() => BridgeBloom.on());
  console.log('bloom: at', BLOOM, onNow.toFixed(2), '· at', PLAIN, offNow.toFixed(2));
  if (onNow < 0.9) bad('not on at Lumar midnight on a bloom day');
  if (offNow > 0) bad('on on an ordinary night');
  await p2.close();

  // ---- the islands, a bloom night and an ordinary one ------------------------------------------------------------------
  const go = async (w, x, y) => {
    await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
    await p.evaluate((q) => { BridgeCharacter.init(q[0], q[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, [x, y]);
    await p.waitForTimeout(2500);
  };
  // what the sea's drawing costs a frame (js/sea.js): one frame's calls caught, then played again 30 times, the clock
  // moved on 70 ms each time so the shore's animation is worked out afresh every time (its worst case), on the frame's
  // own canvas; and the frames a second over a second
  const cost = () => p.evaluate(() => new Promise(r => {
    const S = BridgeSea, names = ['drawSea', 'drawWater', 'drawSeaAt', 'drawWaterAt'], orig = {}, calls = [];
    names.forEach(n => { orig[n] = S[n]; S[n] = function () { calls.push([n, this, Array.from(arguments)]); return orig[n].apply(this, arguments); }; });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      names.forEach(n => { S[n] = orig[n]; });
      const t0 = performance.now();
      for (let i = 1; i <= 30; i++) calls.forEach(c => { const a = c[2].slice(); a[4 - (c[0] === 'drawSea' || c[0] === 'drawSeaAt' ? 1 : 0)] += i * 70; orig[c[0]].apply(c[1], a); });
      const ms = (performance.now() - t0) / 30;
      let frames = 0; const f0 = performance.now();
      (function f() { frames++; if (performance.now() - f0 < 1000) requestAnimationFrame(f); else r({ ms, fps: frames / ((performance.now() - f0) / 1000), calls: calls.length }); })();
    }));
  }));
  // in bloom and without, twice each in turn, the quicker of each kept (the machine's own noise is a few ms)
  const costs = async () => {
    const on = [], off = [];
    for (let i = 0; i < 2; i++) {
      await p.evaluate(() => BridgeBloom._force(null)); await p.waitForTimeout(200); on.push(await cost());
      await p.evaluate(() => BridgeBloom._force(0)); await p.waitForTimeout(200); off.push(await cost());
    }
    await p.evaluate(() => BridgeBloom._force(null));
    const best = (l) => l.reduce((a, b) => (a.ms < b.ms ? a : b));
    return { on: best(on), off: best(off) };
  };
  const both = async (name) => {
    const c = await costs();
    await p.evaluate(() => BridgeBloom._force(null)); await p.waitForTimeout(600);
    await p.screenshot({ path: `${SHOTS}/bloom_${name}.png` });
    await p.evaluate(() => BridgeBloom._force(0)); await p.waitForTimeout(600);
    await p.screenshot({ path: `${SHOTS}/bloom_${name}_plain.png` });
    await p.evaluate(() => BridgeBloom._force(null));
    console.log('bloom:', name, '· the sea a frame', c.on.ms.toFixed(2), 'ms in bloom,', c.off.ms.toFixed(2), 'ms without', '· fps', c.on.fps.toFixed(0), '/', c.off.fps.toFixed(0));
    return [c.on.ms, c.off.ms];
  };
  const extra = [];
  await go('lumar', 8, 13);
  const noted = await p.evaluate(() => BridgeBloom._noted());
  const crowd = await p.evaluate(() => BridgeCrowd._here ? BridgeCrowd._here().filter(e => /^bloom:/.test(e.gather || '')).length : -1);
  console.log('bloom: arriving on Diggen\'s Point, noted:', JSON.stringify(noted), '· gathered on the quay:', crowd);
  if (!noted.length) bad('no note of the bloom on coming ashore');
  if (crowd < 2) bad('nobody gathered on the quay to watch');
  extra.push(await both('diggens'));
  await go('lumar-crown', 22, 35);
  console.log('bloom: gathered on Crownhaven\'s quay:', await p.evaluate(() => BridgeCrowd._here().filter(e => /^bloom:/.test(e.gather || '')).length));
  extra.push(await both('crownhaven'));
  await go('lumar-rose', 28, 24);
  extra.push(await both('rose'));

  // ---- at sea in the sloop --------------------------------------------------------------------------------------------
  await go('lumar', 8, 13);
  await p.evaluate(() => BridgeSloop.start('lumar'));
  for (let i = 0; i < 80 && (await p.evaluate(() => BridgeSloop._phase())) !== 'sail'; i++) await p.waitForTimeout(250);
  const isles = await p.evaluate(() => { const I = BridgeVoyage._isles, o = {}; Object.keys(I).forEach(k => { o[k] = { x: I[k].x, y: I[k].y }; }); return o; });
  const sailAt = async (cx, cy, h, v) => {
    await p.evaluate(([cx, cy, h, v]) => { const w = BridgeSloop._toWorld(cx, cy), bt = BridgeSloop._boat(); bt.x = w.x; bt.r = w.r; bt.h = h; bt.v = v; BridgeSloop._snap(); }, [cx, cy, h, v]);
    await p.waitForTimeout(3000);
  };
  const seaShot = async (name, cx, cy) => {
    await p.evaluate(() => BridgeBloom._force(null));
    await sailAt(cx, cy, 0.3, 4);
    await p.screenshot({ path: `${SHOTS}/bloom_sea_${name}.png` });
    const c = await costs();
    await p.evaluate(() => BridgeBloom._force(0));
    await sailAt(cx, cy, 0.3, 4);
    await p.screenshot({ path: `${SHOTS}/bloom_sea_${name}_plain.png` });
    await p.evaluate(() => BridgeBloom._force(null));
    console.log('bloom: at sea,', name, 'sea · the sea a frame', c.on.ms.toFixed(2), 'ms in bloom,', c.off.ms.toFixed(2), 'ms without · fps', c.on.fps.toFixed(0), '/', c.off.fps.toFixed(0));
    extra.push([c.on.ms, c.off.ms]);
  };
  await seaShot('emerald', isles['lumar-crown'].x + 0.01, isles['lumar-crown'].y + 0.075);
  await seaShot('rose', isles['lumar-rose'].x - 0.02, isles['lumar-rose'].y + 0.07);
  // the chart
  await p.evaluate(() => BridgeChart.open()); await p.waitForTimeout(1500);
  const note = await p.evaluate(() => (document.querySelector('#sea-chart .ch-bloom') || {}).textContent || '');
  console.log('bloom: the chart says', JSON.stringify(note));
  if (!/bloom/i.test(note)) bad('no note of the bloom on the chart');
  await p.screenshot({ path: `${SHOTS}/bloom_chart.png` });
  await p.evaluate(() => BridgeChart.close());

  // what the bloom adds, against what the sea costs anyway (software graphics here: a phone's card does it far quicker)
  const add = extra.map(([on, off]) => on - off), worst = Math.max.apply(null, add);
  console.log('bloom: what it adds to the sea a frame:', extra.map(([on, off]) => (on - off).toFixed(1) + ' ms (' + Math.round((on - off) / off * 100) + '%)').join(', '));
  extra.forEach(([on, off]) => { if (on - off > 3 && (on - off) / off > 0.5) bad('the bloom adds ' + (on - off).toFixed(1) + ' ms a frame (' + Math.round((on - off) / off * 100) + '% of the sea\'s own)'); });
  console.log('bloom: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
