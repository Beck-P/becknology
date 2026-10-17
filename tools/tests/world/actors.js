const { chromium } = require('playwright');
const fs = require('fs');
// a JSON list of world ids, or every world in apps/bridge/assets/worlds
const WS = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2])) : fs.readdirSync(__dirname + '/../../../apps/bridge/assets/worlds').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 160)));
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); });
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const out = [];
  for (const w of WS) {
    try {
      await p.evaluate((w) => new Promise((r, j) => { const t = setTimeout(() => j('timeout'), 20000); BridgeWorld.load(w, () => { clearTimeout(t); BridgeState.transition('world', { worldId: w }); r(); }); }), w);
      await p.waitForTimeout(1200);
      const res = await p.evaluate(async () => {
        const world = BridgeWorld.getWorld(), sc = BridgeScene.get(world.scene.id);
        if (!sc || !sc.ready) return 'noscene';
        const rows = { down: 0, right: 1, up: 2, left: 3 }, R = [];
        for (const a of world.scene.actors) {
          const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = '/bridge/assets/characters/' + a.sheet + '.png'; });
          if (!img) { R.push([a.sheet, a.x, a.y, 'nosheet']); continue; }
          const ts = 32, footRow = a.y + (a.pose === 'sit' ? 0.55 : 0.9);
          const cv = document.createElement('canvas'); cv.width = 120; cv.height = 120; const g = cv.getContext('2d');
          const offX = Math.round(60 - (a.x + 0.5) * ts), offY = Math.round(100 - footRow * ts);
          const cx = Math.round(offX + (a.x + 0.5) * ts), footY = Math.round(offY + footRow * ts);
          const dx = cx - 16, dy = footY - 45 - Math.round((a.lift || 0) * Math.SQRT1_2 * ts);
          const row = rows[a.facing] || 0;
          const depthRow = a.pose === 'sit' ? BridgeScene.seatedRow(footRow, a.facing) : footRow;   // as js/scene.js tests it
          BridgeScene.drawOccluded(g, sc, img, 0, row * 48, 32, 48, dx, dy, depthRow, offX, offY, null, null);
          const seen = g.getImageData(0, 0, 120, 120).data;
          const c2 = document.createElement('canvas'); c2.width = 32; c2.height = 48; const g2 = c2.getContext('2d'); g2.drawImage(img, 0, row * 48, 32, 48, 0, 0, 32, 48);
          const all = g2.getImageData(0, 0, 32, 48).data;
          let n = 0, m = 0; for (let k = 3; k < seen.length; k += 4) if (seen[k] > 120) n++; for (let k = 3; k < all.length; k += 4) if (all[k] > 120) m++;
          R.push([a.sheet, a.x, a.y, a.pose || '', m ? +(n / m).toFixed(2) : null]);
        }
        return R;
      });
      out.push([w, res]);
    } catch (e) { out.push([w, 'err ' + String(e).slice(0, 60)]); }
  }
  for (const [w, res] of out) {
    if (!Array.isArray(res)) { console.log(w, res); continue; }
    res.filter(r => typeof r[4] !== 'number' || r[4] < 0.6).forEach(r => console.log(w, JSON.stringify(r)));
  }
  console.log('worlds', out.length, 'actors', out.reduce((s, o) => s + (Array.isArray(o[1]) ? o[1].length : 0), 0));
  await b.close();
})();
