// node shoot.js <outdir> <scene id> <spec> [<spec> ...]
//   spec = time,season,weather,finish,version[,t[,width]]   e.g. 18.2,summer,clear,soft,model  or  23,winter,snow,hd2d,toyhd,4.5,1440
// versions: model (32 px, smooth light) · toy (32 px, toy bands + outlines) · modelhd (48 px smooth) · toyhd (48 px toy)
// Needs the look book served: (cd <lookbook2> && python3 -m http.server 8790)   (shoot.js starts it if it's not up)
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const [out, id, ...specs] = process.argv.slice(2);
const up = () => new Promise((r) => http.get('http://127.0.0.1:8790/dev.html', (res) => { res.resume(); r(true); }).on('error', () => r(false)));
(async () => {
  if (!(await up())) { spawn('python3', ['-m', 'http.server', '8790'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref(); for (let i = 0; i < 30 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const spec of specs.length ? specs : ['18.2,summer,clear,soft,model']) {
    const [time, season, weather, finish, version, t, width] = spec.split(',');
    const p = await (await b.newContext({ viewport: { width: (+width || 1440) + 20, height: 1000 }, deviceScaleFactor: 1 })).newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
    const url = `http://127.0.0.1:8790/dev.html?id=${id}&time=${time}&season=${season}&weather=${weather}&finish=${finish}&version=${version || 'model'}&t=${t || 3}&width=${width || 1440}`;
    const t0 = Date.now();
    await p.goto(url);
    await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
    await p.waitForTimeout(500);
    const err = await p.evaluate(() => window.__err && window.__err());
    if (err) errs.push('SCENE ' + err);
    const el = await p.$('#dev');
    const f = path.join(out, `${id}_${version || 'model'}_${time}_${season}_${weather}_${finish}${t ? '_t' + t : ''}.png`);
    await el.screenshot({ path: f });
    const ms = await p.evaluate(() => { const t0 = performance.now(); LB.state.time += 0.3; LB.redraw(); LB.state.time -= 0.3; LB.redraw(); return ((performance.now() - t0) / 2).toFixed(1); });
    console.log('shot', f, `(load ${Date.now() - t0} ms, full redraw ~${ms} ms)`, errs.length ? '\n  ' + errs.join('\n  ') : '');
    await p.close();
  }
  await b.close();
})();
