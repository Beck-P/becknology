// node shoot.js <outdir> <scene id> <spec> [<spec> ...]
//   spec = time,season,weather,finish[,t[,width]]   e.g. 18.2,summer,clear,soft  or  23,winter,snow,hd2d,4.5,1440
// Screenshots the scene alone in dev.html (headless Chromium), one PNG per spec, and prints any page errors.
const { chromium } = require('playwright');
const path = require('path');
const [out, id, ...specs] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files'] });
  for (const spec of specs.length ? specs : ['18.2,summer,clear,soft']) {
    const [time, season, weather, finish, t, width] = spec.split(',');
    const p = await (await b.newContext({ viewport: { width: (+width || 1440) + 20, height: 1000 }, deviceScaleFactor: 1 })).newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
    const url = 'file://' + path.join(__dirname, 'dev.html') + `?id=${id}&time=${time}&season=${season}&weather=${weather}&finish=${finish}&t=${t || 3}&width=${width || 1440}`;
    const t0 = Date.now();
    await p.goto(url);
    await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
    await p.waitForTimeout(400);
    const err = await p.evaluate(() => window.__err && window.__err());
    if (err) errs.push('SCENE ' + err);
    const el = await p.$('#dev');
    const f = path.join(out, `${id}_${time}_${season}_${weather}_${finish}${t ? '_t' + t : ''}.png`);
    await el.screenshot({ path: f });
    // time to draw one full frame (statics included) — keep it well under 100 ms
    const ms = await p.evaluate(() => { const t0 = performance.now(); LB.state.time += 0.3; LB.redraw(); LB.state.time -= 0.3; LB.redraw(); return ((performance.now() - t0) / 2).toFixed(1); });
    console.log('shot', f, `(load ${Date.now() - t0} ms, full redraw ~${ms} ms)`, errs.length ? '\n  ' + errs.join('\n  ') : '');
    await p.close();
  }
  await b.close();
})();
