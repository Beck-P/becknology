const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  for (const [w, pick] of [['arcadia-casino', ['bj-1', 'roulette-2', 'craps-3', 'slots-4', 'derby-1', 'crash-2', 'link-1']], ['arcadia-casino-cards', ['poker-1', 'runouts-plinko', 'runouts-hall']]]) {
    await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
    await p.waitForTimeout(1500);
    for (const t of pick) {
      const url = await p.evaluate(async (t) => {
        const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'casino' && i.table === t);
        if (!it) return 'MISSING ' + t;
        BridgeInteractions.execute(it);
        await new Promise(r => setTimeout(r, 900));
        const f = document.querySelector('#cabinet-modal-overlay iframe');
        const u = f ? f.getAttribute('src') : 'no frame';
        if (window.BridgeCabinetModal) BridgeCabinetModal.hide();
        await new Promise(r => setTimeout(r, 500));
        return it.label + ' -> ' + u;
      }, t);
      console.log(w, t, url);
    }
  }
  await b.close();
})();
