const { chromium } = require('playwright');
const OUT = process.argv[2], WS = (process.argv[3] || 'lumar').split(','), MODE = process.argv[4] || 'all';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  for (const w of WS) {
    const d = await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => {
      const dk = BridgeWorld.getWorld().interactions.find(i => i.type === 'go_sailing');
      BridgeState.transition('world', { worldId: w, spawn: { x: dk.x, y: dk.y - 1 } }); r(dk && { x: dk.x, y: dk.y });
    })), w);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `${OUT}/${w}_0dock.png` });
    if (MODE === 'all' || MODE === 'board') {
      await p.evaluate((w) => BridgeSloop.board(w), w);
      for (let i = 1; i <= 14; i++) { await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${w}_b${String(i).padStart(2, '0')}.png` }); }
      console.log(w, 'phase', await p.evaluate(() => BridgeSloop._phase && BridgeSloop._phase()));
      await p.evaluate(() => BridgeSloop.stop && BridgeSloop.stop());
      await p.waitForTimeout(800);
    }
    if (MODE === 'all' || MODE === 'land') {
      await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: null }); r(); })), w);
      await p.waitForTimeout(1500);
      await p.evaluate((w) => BridgeSloop._disembark(w), w);
      for (let i = 1; i <= 10; i++) { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${w}_d${String(i).padStart(2, '0')}.png` }); }
      console.log(w, 'landed at', await p.evaluate(() => [BridgeCharacter.getX(), BridgeCharacter.getY(), BridgeCharacter.isHidden(), !!BridgeCharacter.getPose()]));
    }
  }
  await b.close();
})();
