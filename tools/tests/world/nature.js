// The outdoors alive (js/nature.js): the trees leaning in the wind, gusts over the grass, light and rings on still water,
// butterflies, fireflies, falling leaves, a flock over — what it finds in a scene's leaf pass, frames that move, what a
// frame costs. node world/nature.js [shots] [world] [AT] [POS]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots', WORLD = process.argv[3] || 'lumar-holm', AT = process.argv[4] || '2026-10-16T13:00';
const POS = (process.argv[5] || '20,14').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
  await p.goto('http://127.0.0.1:8766/bridge/?at=' + AT); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w) => p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  await p.evaluate(() => ['verdance', 'lumar'].forEach(r => BridgeWeather._pin(r, 'fair')));
  await go(WORLD); await p.waitForTimeout(1500);
  await p.evaluate((q) => { BridgeCharacter.init(q[0], q[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, POS);
  const scene = await p.evaluate(() => BridgeWorld.getWorld().scene.id);
  // the canvas, twice, a moment apart: how much of it moved
  const moved = () => p.evaluate(() => new Promise(res => {
    const c = document.querySelector('canvas'), x = c.getContext('2d');
    const a = x.getImageData(0, 0, c.width, c.height).data;
    setTimeout(() => {
      const b = x.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++;
      res((100 * n / (a.length / 4)).toFixed(2) + '%');
    }, 700);
  }));
  for (const [season, wind] of [['summer', 0], ['summer', 2], ['autumn', 1.3], ['spring', 0.8]]) {
    await p.evaluate((a) => { BridgeFoliage._force(a[0]); BridgeFoliage.apply(BridgeWorld.getWorldId()); BridgeNature._wind(a[1]); }, [season, wind]);
    await p.waitForTimeout(3500);
    console.log(`${season}, wind ${wind}: moved ${await moved()} · ${JSON.stringify(await p.evaluate((s) => BridgeNature._stats(s), scene))}`);
    await p.screenshot({ path: `${SHOTS}/nature_${WORLD}_${season}_${wind}.png` });
  }
  // a flock over
  await p.evaluate((s) => BridgeNature._flock(s), scene);
  await p.waitForTimeout(2500);
  console.log('a flock over:', JSON.stringify(await p.evaluate((s) => BridgeNature._stats(s).flock, scene)));
  await p.screenshot({ path: `${SHOTS}/nature_${WORLD}_flock.png` });
  // at night in summer: fireflies
  await p.evaluate(() => { BridgeFoliage._force('summer'); BridgeFoliage.apply(BridgeWorld.getWorldId()); BridgeClock._at('2026-10-16T23:30'); });
  await p.waitForTimeout(3000);
  console.log('a summer night:', JSON.stringify(await p.evaluate((s) => BridgeNature._stats(s), scene)));
  await p.screenshot({ path: `${SHOTS}/nature_${WORLD}_night.png` });
  // indoors: nothing
  await go('lumar-tavern'); await p.waitForTimeout(1500);
  console.log('indoors:', JSON.stringify(await p.evaluate(() => BridgeNature._stats(BridgeWorld.getWorld().scene.id))));
  await b.close();
})();
