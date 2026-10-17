// Starling Holm in the new look (scenes/lumar_holm.py): the island as you find it and built right up, shot by live light
// at dawn, noon, golden hour and night and in each season, and how long a composition takes. Fails on page errors, if it
// never draws live.
// node world/holm_look.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots', WORLD = 'lumar-holm';
const ALL = { house: 1, dock: 1, garden: 1, warehouse: 1, quarters: 1, workshop: 1, slipway: 1, hall: 1, resort: 1 };
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errs = 0;
  for (const [state, built] of [['base', null], ['built', ALL]]) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript((built) => {
      localStorage.setItem('bridge_ship_location', 'lumar');
      if (built) localStorage.setItem('bridge_holm', JSON.stringify({ owned: true, name: 'Starling Holm', built, store: {}, chest: 0, log: [] }));
    }, built);
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T12:00'); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    await p.evaluate(() => ['verdance', 'lumar', 'hoarfell', 'sylvara'].forEach(r => BridgeWeather._pin(r, 'fair')));
    await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), WORLD);
    await p.evaluate(() => { BridgeCharacter.init(21, 15); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); });
    const stats = () => p.evaluate((w) => BridgeLit._stats(w), WORLD);
    let st = null;
    for (let i = 0; i < 80; i++) { st = await stats(); if (st && st.drawing) break; await p.waitForTimeout(250); }
    console.log(state, ': live', !!(st && st.drawing), '· composed in', st && Math.round(st.ms), 'ms');
    if (!st || !st.drawing) { errs++; console.log('ERROR never drew live'); await p.close(); continue; }
    const shots = [[7, 'summer', 'dawn'], [12.4, 'summer', 'noon'], [17.9, 'summer', 'golden'], [1, 'summer', 'night'],
                   [12.4, 'spring', 'spring'], [12.4, 'autumn', 'autumn'], [12.4, 'winter', 'winter'], [17.9, 'autumn', 'golden_autumn']];
    for (const [hour, season, name] of shots) {
      const before = (await stats()).comps;
      await p.evaluate((o) => BridgeLit._force(o), { hour, season });
      for (let i = 0; i < 60; i++) { const s = await stats(); if (s.comps > before) break; await p.waitForTimeout(100); }
      await p.waitForTimeout(1900);
      await p.screenshot({ path: `${SHOTS}/holm_${state}_${name}.png` });
    }
    console.log(state, ': compositions', (await stats()).comps, '· last ms', Math.round((await stats()).ms));
    await p.close();
  }
  console.log('holm look: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
