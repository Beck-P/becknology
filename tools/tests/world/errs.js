const { chromium } = require('playwright');
const fs = require('fs');
// a JSON list of world ids, or every world in apps/bridge/assets/worlds
const WS = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2])) : fs.readdirSync(__dirname + '/../../../apps/bridge/assets/worlds').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let cur = 'boot'; const errs = [];
  p.on('pageerror', e => errs.push([cur, 'PAGEERR', e.message.slice(0, 200)]));
  // a missing file is caught (with its URL) by the response check below; /api/talk is Vercel's, not served locally
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) errs.push([cur, 'console', m.text().slice(0, 200)]); });
  p.on('response', r => { if (r.status() >= 400 && !/supabase|\/api\//.test(r.url())) errs.push([cur, 'http ' + r.status(), r.url().replace('http://127.0.0.1:8766', '')]); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); });
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  for (const w of WS) {
    cur = w;
    try {
      await p.evaluate((w) => new Promise((r, j) => { const t = setTimeout(() => j('timeout'), 20000); BridgeWorld.load(w, () => { clearTimeout(t); BridgeState.transition('world', { worldId: w }); r(); }); }), w);
      await p.waitForTimeout(1500);
    } catch (e) { errs.push([w, 'load', String(e).slice(0, 120)]); }
  }
  const seen = new Set();
  errs.forEach(e => { const k = e.join('|'); if (!seen.has(k)) { seen.add(k); console.log(JSON.stringify(e)); } });
  console.log('worlds', WS.length, 'errors', seen.size);
  await b.close();
})();
