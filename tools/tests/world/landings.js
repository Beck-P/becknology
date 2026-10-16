const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  for (const loc of (process.argv[3] || 'lumar,arcadia,enigma,singularity,verdance,hoarfell,sylvara').split(',')) {
    await p.evaluate(() => new Promise(r => BridgeWorld.load('hangar', () => { BridgeState.transition('world', { worldId: 'hangar' }); r(); })));
    await p.waitForTimeout(1500);
    await p.evaluate((loc) => BridgeShip.descend({ id: loc }), loc);
    for (let i = 0; i < 40 && await p.evaluate(() => BridgeShip.isBusy()); i++) await p.waitForTimeout(300);
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/land_${loc}.png` });
    console.log(loc, await p.evaluate(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY(), BridgeCharacter.getFacing()]));
  }
  await b.close();
})();
