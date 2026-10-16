// The clock (js/clock.js) and opening hours (js/hours.js): every planet's day on Eastern time, the seasons on the
// calendar, the sky's blend over a scene, and a shut shop saying when it opens. node world/clock.js
const { chromium } = require('playwright');
const at = (t) => 'http://127.0.0.1:8766/bridge/?at=' + t;
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); });
  await p.goto(at('2026-10-16T19:20')); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const sky = (w) => p.evaluate((w) => { const k = BridgeClock.sky(w); return [k.planet, k.time ? k.time.text : '-', k.part, k.season ? k.season.name : '-', +k.sun.toFixed(2)]; }, w);
  for (const w of ['lumar', 'verdance', 'hoarfell', 'sylvara', 'arcadia-street', 'enigma', 'lumar-midnight']) console.log('sky', w, JSON.stringify(await sky(w)));
  // the same instant in two ways: ET wall time in the URL, and the seasons all autumn this week
  console.log('seasons', JSON.stringify(await p.evaluate(() => ['lumar', 'verdance', 'hoarfell', 'sylvara'].map(x => BridgeClock.season(x).name))));
  console.log('verdance seasons.js agrees', await p.evaluate(() => BridgeSeasons.now().name === BridgeClock.season('verdance').name));
  // a Lumar shop at night: the bakery's shut and says when it opens
  await p.evaluate(() => BridgeClock._at('2026-10-16T23:30'));
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-bakery', () => { BridgeState.transition('world', { worldId: 'lumar-bakery' }); r(); })));
  await p.waitForTimeout(1200);
  const tryShop = async (label) => p.evaluate((label) => {
    const it = BridgeWorld.getWorld().interactions.find(i => i.label === label);
    if (!it) return 'no ' + label;
    BridgeInteractions.execute(it);
    const d = document.querySelector('.world-dialog');
    const t = d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 220) : 'none';
    document.querySelectorAll('.world-dialog').forEach(x => x.remove());
    return t;
  }, label);
  console.log('bakery at night:', await tryShop('BAKERY'));
  await p.evaluate(() => BridgeClock._at('2026-10-16T17:00'));            // Lumar 1:00 + ... in its morning
  await p.evaluate(() => BridgeClock._at('2026-10-16T18:40'));
  console.log('bakery in the morning:', (await tryShop('BAKERY')).slice(0, 60));
  console.log('hours', JSON.stringify(await p.evaluate(() => BridgeHours.hours('lumar-bakery', 'BAKERY'))));
  // the ship's chronometer
  console.log('chronometer:', (await p.evaluate(() => BridgeHours.chronometer())).replace(/\n+/g, ' | '));
  await b.close();
})();
