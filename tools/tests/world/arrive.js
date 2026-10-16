const { chromium } = require('playwright');
const OUT = process.argv[2], DEST = process.argv[3] || 'lumar-crown';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar', () => { BridgeState.transition('world', { worldId: 'lumar' }); r(); })));
  await p.waitForTimeout(1500);
  await p.evaluate(() => BridgeSloop.start('lumar', null, { aboard: true }));
  for (let i = 0; i < 60 && (await p.evaluate(() => BridgeSloop._phase())) !== 'sail'; i++) await p.waitForTimeout(300);
  // over to the destination, near its berth
  const I = await p.evaluate((d) => { const c = BridgeVoyage._isles[d]; const w = BridgeSloop._toWorld(c.x, c.y); const bt = BridgeSloop._boat(); bt.x = (w[0] !== undefined ? w[0] : w.x); bt.r = (w[1] !== undefined ? w[1] : w.r) + 30; bt.v = 0; BridgeSloop._snap(); return [bt.x, bt.r]; }, DEST);
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(400); if (await p.evaluate((d) => !!(BridgeSloop._loaded()[d] && BridgeSloop._loaded()[d].berth), DEST)) break; }
  const berth = await p.evaluate((d) => { const I = BridgeSloop._loaded()[d]; const bt = BridgeSloop._boat(); bt.x = I.berth[0]; bt.r = I.berth[1] + 1.5; bt.v = 0; bt.h = -Math.PI / 2; BridgeSloop._snap(); return I.berth; }, DEST);
  console.log('berth', berth);
  await p.waitForTimeout(1500);
  console.log('prompt', await p.evaluate(() => { const q = BridgeSloop._prompt(); return q && q.text; }));
  await p.keyboard.press('e');
  const log = [];
  for (let i = 0; i < 70; i++) {
    await p.waitForTimeout(150);
    const st = await p.evaluate(() => { const c = BridgeSloop.isRunning() && BridgeSloop._cam(), v = BridgeWorld.getView();
      const sea = c ? [((c.x + c.W / 2) / 32 - c.bx).toFixed(2), ((c.y + c.H / 2) / 32 - c.by).toFixed(2)] : null;
      const wc = [((-v.offX + v.w / 2) / v.ts).toFixed(2), ((-v.offY + v.h / 2) / v.ts).toFixed(2)];
      return [BridgeSloop.isRunning(), BridgeSloop._phase(), BridgeWorld.getWorldId(), 'seat', c && JSON.stringify(c.seat), 'sea', JSON.stringify(sea), 'world', JSON.stringify(wc), 'pilot', BridgeCharacter.getX(), BridgeCharacter.getY()]; });
    log.push(st.join(' '));
    if (i % 2 === 0) await p.screenshot({ path: `${OUT}/a_${String(i).padStart(2, '0')}.png` });
  }
  console.log(log.join(' || '));
  await b.close();
})();
