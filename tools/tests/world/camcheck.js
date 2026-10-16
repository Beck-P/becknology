const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  for (const w of process.argv[2].split(',')) {
    await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => {
      const dk = BridgeWorld.getWorld().interactions.find(i => i.type === 'go_sailing');
      BridgeState.transition('world', { worldId: w, spawn: { x: dk.x, y: dk.y - 1 } }); r();
    })), w);
    await p.waitForTimeout(2500);
    await p.evaluate(() => { window.__log = []; const v0 = BridgeWorld.getView; let last = null;
      (function tick() { try { const c = BridgeSloop._cam && BridgeSloop._cam(); const v = BridgeWorld.getView(); window.__log.push([performance.now() | 0, BridgeSloop._phase(), v.offX, v.offY, c ? c.x : null, c ? c.y : null, c ? c.ox : null, c ? c.oy : null]); } catch (e) { window.__err = String(e); } if (window.__log.length < 3000) setTimeout(tick, 16); })(); });
    await p.evaluate((w) => BridgeSloop.board(w), w);
    for (let k = 0; k < 14; k++) { await p.waitForTimeout(500); console.log(k, await p.evaluate(() => [window.__log.length, BridgeSloop._phase(), BridgeSloop.isRunning(), performance.now() | 0])); }
    const log = await p.evaluate(() => window.__log); console.log('err', await p.evaluate(() => window.__err));
    console.log([...new Set(log.map(l => l[1]))].join(','), log.length); const i = log.findIndex(l => l[1] === 'cast');
    console.log(w, 'world before:', JSON.stringify(log[Math.max(0, i - 1)]), 'sea first:', JSON.stringify(log[i]), 'expected cam', log[i] && [log[i][6] * 32 - log[i - 1][2], log[i][7] * 32 - log[i - 1][3]]);
    await p.evaluate(() => BridgeSloop.stop()); await p.waitForTimeout(1500);
  }
  await b.close();
})();
