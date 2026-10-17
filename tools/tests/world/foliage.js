// The trees through the year (js/foliage.js): a scene's leaf pass recoloured for each season on its planet — autumn's
// colours tree by tree, bare or snowy winters, blossom in spring, evergreens unchanged. node world/foliage.js [shots] [world]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots', WORLD = process.argv[3] || 'verdance', AT = process.argv[4] || '2026-10-16T15:00', POS = (process.argv[5] || '5,4').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
  await p.goto('http://127.0.0.1:8766/bridge/?at=' + AT); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w) => p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  await p.evaluate(() => ['verdance', 'lumar'].forEach(r => BridgeWeather._pin(r, 'fair')));
  await go(WORLD); await p.waitForTimeout(1500);
  await p.evaluate((q) => { BridgeCharacter.init(q[0], q[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, POS);
  await p.waitForTimeout(1200);
  console.log('leaves in the render:', await p.evaluate((w) => { const s = BridgeScene.get ? BridgeScene.get(w) : null; return s ? !!s.baseLeaves : 'n/a'; }, WORLD), '· season now', JSON.stringify(await p.evaluate((w) => BridgeFoliage.season(w), WORLD)));
  for (const s of ['summer', 'autumn', 'winter', 'spring']) {
    await p.evaluate((s) => {
      BridgeFoliage._force(s);
      if (typeof BridgeSeasons !== 'undefined') BridgeSeasons._force(['spring', 'summer', 'autumn', 'winter'].indexOf(s));
    }, s);
    await p.evaluate((w) => BridgeFoliage.apply(w), WORLD);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SHOTS}/foliage_${WORLD}_${s}.png` });
    console.log(s, 'grade', await p.evaluate((w) => BridgeFoliage.season(w).id, WORLD));
  }
  await b.close();
})();
