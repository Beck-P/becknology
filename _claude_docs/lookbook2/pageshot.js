// node pageshot.js <out.png> <width> [wait ms] — the whole Look Book 2 page, served on :8790 (start it if needed)
const { chromium } = require('playwright');
const http = require('http');
const { spawn } = require('child_process');
const [out, width, wait] = process.argv.slice(2);
const up = () => new Promise((r) => http.get('http://127.0.0.1:8790/index.html', (res) => { res.resume(); r(true); }).on('error', () => r(false)));
(async () => {
  if (!(await up())) { spawn('python3', ['-m', 'http.server', '8790'], { cwd: __dirname, detached: true, stdio: 'ignore' }).unref(); for (let i = 0; i < 30 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200)); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await b.newContext({ viewport: { width: +width || 1280, height: 900 }, deviceScaleFactor: 1 })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts|Failed to load resource/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)); });
  await p.goto('http://127.0.0.1:8790/index.html');
  // scroll through so every scene loads and draws
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(900); }
  await p.waitForTimeout(+wait || 3000);
  console.log('scrollWidth vs viewport', await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  console.log('errors on stages', await p.evaluate(() => [...document.querySelectorAll('.stage-err')].map((e) => e.textContent)));
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
