const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({ viewport: { width: 1460, height: 900 } })).newPage();
  for (const v of ['model', 'modelhd']) {
    await p.goto(`http://127.0.0.1:8790/dev.html?id=postcard&time=18.2&season=summer&weather=clear&finish=soft&version=${v}&width=1440`);
    await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
    await p.waitForTimeout(800);
    const ms = await p.evaluate(() => { const pn = LB.panels[0]; pn.draw(1); const t0 = performance.now(); for (let i = 0; i < 20; i++) pn.draw(1 + i * 0.033); return ((performance.now() - t0) / 20).toFixed(1); });
    console.log(v, 'per frame', ms, 'ms');
  }
  await b.close();
})();
