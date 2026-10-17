// node postcard/playtest.js — click the postcard and screenshot the camera move at a few moments
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({ viewport: { width: 980, height: 600 } })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:8790/dev.html?id=postcard&time=18.2&season=summer&weather=clear&finish=soft&version=model&width=960');
  await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.click('#dev');
  const t0 = Date.now();
  for (const at of [100, 700, 1300, 1800, 2400, 3400]) {
    await p.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    await (await p.$('#dev')).screenshot({ path: `shots/pc_play_${at}.png` });
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
