const { chromium } = require('playwright');
// Old long dialogs after the verse change of js/fardeep.js's work (js/interactions.js `reflow`: a paragraph starting
// with two spaces keeps its lines) and the phone pass: Bess's topics at Diggen's Point, the Market Square's bulletin
// board, the end of Under the Willow, each at desktop and phone size, measured to be on the screen and shot
// (`shots/fd_old_*.png`). A look, with a check that nothing runs off the screen. node world/far_dialogs.js [shots]
const OUT = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errors = 0;
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  for (const phone of [false, true]) {
    const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1100, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeWeather._pin && BridgeWeather._pin('lumar', 'clear'); });
    const go = (w, at) => p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]).then(() => p.waitForTimeout(2500));
    const shut = async () => { for (let i = 0; i < 4 && await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); } };
    const finish = () => p.evaluate(() => { const d = document.querySelector('.world-dialog.typing'); if (d) d.click(); });
    const measure = async (name) => {
      await p.waitForTimeout(900); await finish(); await p.waitForTimeout(400);
      const r = await p.evaluate(() => { const d = document.querySelector('#world-overlay .world-dialog'); if (!d) return null; const b = d.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: innerHeight, scrolls: d.scrollHeight > d.clientHeight + 2 }; });
      console.log((phone ? 'phone ' : 'desktop ') + name + ':', JSON.stringify(r));
      if (!r || r.top < 0 || r.bottom > r.h + 1) fail(name + ' off the screen');
      await p.screenshot({ path: OUT + '/fd_old_' + name + (phone ? '_phone' : '') + '.png' });
    };
    // Bess, a long topic
    await go('lumar', [20, 20]);
    const bess = await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'HARBOURMASTER'); if (i) BridgeInteractions.execute(i); return !!i; });
    if (!bess) fail('no Bess'); else {
      await p.waitForTimeout(900);
      await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay .wd-opt')].find(e => /Islands for sale/.test(e.innerText)) || [...document.querySelectorAll('#world-overlay .wd-opt')][0]; if (b) b.click(); });
      await measure('bess'); await shut();
    }
    // a notice board
    await go('lumar-square', [17, 16]);
    await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'BULLETIN BOARD')));
    await measure('board'); await shut();
    // the end of Under the Willow, the longest old quest moment
    const vow = await p.evaluate(() => BridgeQuests.def('under-the-willow').clues.find(c => c.id === 'vow').say);
    await go('sylvara', [17, 25]);
    await p.evaluate((t) => BridgeInteractions.say('WILLOW', t), vow);
    await measure('willow'); await shut();
    await ctx.close();
  }
  console.log(errors ? errors + ' FAILED' : 'far_dialogs OK');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
