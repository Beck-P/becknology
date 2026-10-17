// Verdance's countryside (js/makers.js, js/countryside.js): each place along the lanes loads and its makers open —
// the Downs (the farm stand's honesty box selling while you're away, Larkspur Flowers, Cobb's cider), Thistlecombe
// (the roaster, the potter, the chandler, your market stall with Effie selling on market day and drawn in the square,
// Verdant & Co.'s orders for Arcadia's kitchens filled), Vinehallow (grapes picked, a cask laid down and drawn at each
// vintage over real weeks), Wendmill (wheat ground to flour, flour baked); the night-blooming moonflower and the
// twin-moon melon in the field; the train and the ferry. Screenshots: shots/vc_*.png. node world/verdance_country.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('bridge_ship_location', 'verdance');
    ['bridge_makers', 'bridge_country', 'bridge_village'].forEach(k => localStorage.removeItem(k));
  });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-17T12:00'); await p.waitForTimeout(3000);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.evaluate(() => BridgeWeather._pin('verdance', 'fair'));
  const fail = (m) => { errs++; console.log('country: ERROR', m); };
  const go = (w, x, y) => p.evaluate((q) => new Promise(r => BridgeWorld.load(q[0], () => {
    BridgeState.transition('world', { worldId: q[0], spawn: { x: q[1], y: q[2] } }); BridgeCharacter.init(q[1], q[2]);
    if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); r();
  })), [w, x, y]);
  const open = async (type, extra) => {
    await p.evaluate((q) => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === q[0] && (!q[1] || i[q[1][0]] === q[1][1])); if (!it) throw new Error('no ' + q[0]); BridgeInteractions.execute(it); }, [type, extra || null]);
    await p.waitForTimeout(350);
    const rows = await p.evaluate(() => [...document.querySelectorAll('.wd-sell-row .sp-name')].map(e => e.textContent));
    const title = await p.evaluate(() => { const t = document.querySelector('.wd-title'); return t ? t.textContent : ''; });
    return { title, rows };
  };
  const close = () => p.keyboard.press('Escape');
  const places = await p.evaluate(() => BridgeMakers.PLACES);
  console.log('country: places built', JSON.stringify(places));
  await p.evaluate(() => {                                  // coins without a server: a purse in the page
    window._coins = 100000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });

  // ---- the Downs ----
  if (places.indexOf('verdance-downs') >= 0) {
    await go('verdance-downs', 22, 18);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: SHOTS + '/vc_downs.png' });
    // the farm stand: stock it, then a day passes
    await p.evaluate(() => { BridgeInventory.addItem('carrot', 30); BridgeInventory.addItem('strawberry', 20); });
    let r = await open('farm_stand');
    console.log('country: the farm stand', JSON.stringify(r.rows));
    await p.evaluate(() => { const s = BridgeMakers._s().stand; s.stock = { carrot: 30, strawberry: 20 }; s.t = Date.now() - 24 * 3600000; BridgeMakers.standTick(Date.now()); });
    const st = await p.evaluate(() => { const s = BridgeMakers._s().stand; return { tin: s.tin, sold: s.sold, left: s.left.length, stock: s.stock }; });
    console.log('country: a day at the honesty box', JSON.stringify(st));
    if (!(st.sold > 0 && st.tin > 0)) fail('the stand sold nothing in a day');
    await close();
    r = await open('flower_farm'); console.log('country: Larkspur Flowers', JSON.stringify(r.rows)); await close();
    r = await open('cider_press'); console.log('country: Cobb\'s Cider', JSON.stringify(r.rows)); await close();
    r = await open('flower_bed'); await close();
    for (const h of [7.2, 12.4, 17.9, 1]) {
      await p.evaluate((h) => BridgeLit._force({ hour: h, season: 'summer' }), h); await p.waitForTimeout(2200);
      await p.screenshot({ path: SHOTS + '/vc_downs_' + h + '.png' });
    }
    await p.evaluate(() => BridgeLit._force(null));
  }

  // ---- Thistlecombe ----
  if (places.indexOf('verdance-market') >= 0) {
    await go('verdance-market', 24, 14);
    await p.waitForTimeout(2500);
    for (const m of ['roaster', 'potter', 'candles']) { const r = await open('maker', ['maker', m]); console.log('country:', r.title, JSON.stringify(r.rows)); await close(); }
    // your stall: Effie hired, goods laid out, a market day's selling
    await p.evaluate(() => { const s = BridgeMakers._s(); s.stall = { stock: { pumpkin: 6, honey: 10 }, till: 0, hired: Date.now() + 86400000, t: Date.now() - 8 * 3600000, sold: 0 }; BridgeMakers.stallTick(Date.now()); });
    const stall = await p.evaluate(() => { const s = BridgeMakers._s().stall; return { till: s.till, sold: s.sold, stock: s.stock }; });
    console.log('country: eight hours of Effie at the stall', JSON.stringify(stall), 'market day today:', await p.evaluate(() => BridgeMakers.marketDay()));
    if (!(stall.sold > 0)) fail('Effie sold nothing');
    await go('verdance-market', 18, 21);
    await p.waitForTimeout(2000);
    await p.screenshot({ path: SHOTS + '/vc_market_stall.png' });
    let r = await open('market_stall'); console.log('country: your stall', JSON.stringify(r.rows)); await close();
    // Verdant & Co.: fill today's first order
    const ord = await p.evaluate(() => { const j = BridgeMakers.todays()[0]; const o = BridgeMakers.ORDERS[j]; BridgeInventory.addItem(o.item, o.n); return o; });
    r = await open('export');
    console.log('country: Verdant & Co.', JSON.stringify(r.rows.slice(0, 4)));
    await p.evaluate(() => { const row = document.querySelector('.wd-sell-row.pick:not(.none)'); if (row) row.click(); });
    await p.waitForTimeout(600);
    const done = await p.evaluate(() => BridgeMakers._s().export.done.length);
    console.log('country: an order for', ord.where, 'filled:', done);
    if (!done) fail('the order was not filled');
    await close();
    await p.screenshot({ path: SHOTS + '/vc_market.png' });
  }

  // ---- Vinehallow: grapes, a cask, its vintages ----
  if (places.indexOf('verdance-hill') >= 0) {
    await go('verdance-hill', 22, 24);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: SHOTS + '/vc_hill.png' });
    await p.evaluate(() => BridgeInventory.addItem('grapes', 10));
    await open('winery');
    await p.evaluate(() => { const row = [...document.querySelectorAll('.wd-sell-row')].find(e => /Press/.test(e.textContent)); if (row) row.click(); });
    await p.waitForTimeout(400); await close();
    const ages = await p.evaluate(() => [0, 8, 22, 45].map(d => BridgeMakers.vintage(d * 86400000).id));
    console.log('country: a cask at 0, 8, 22, 45 days:', JSON.stringify(ages), '· casks', await p.evaluate(() => BridgeMakers._s().cellar.length));
    if (ages.join() !== 'wine_young,wine,wine_fine,wine_grand') fail('the vintages are wrong');
    const r = await open('cellar'); console.log('country: the cellar', JSON.stringify(r.rows)); await close();
  }

  // ---- Wendmill: wheat to flour ----
  if (places.indexOf('verdance-mill') >= 0) {
    await go('verdance-mill', 24, 18);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: SHOTS + '/vc_mill.png' });
    await p.evaluate(() => BridgeInventory.addItem('wheat', 9));
    await open('mill');
    await p.evaluate(() => { const row = [...document.querySelectorAll('.wd-sell-row')].find(e => /Grind/.test(e.textContent)); if (row) row.click(); });
    await p.waitForTimeout(500);
    const flour = await p.evaluate(() => BridgeInventory.getCount('flour'));
    console.log('country: nine wheat ground into', flour, 'flour');
    if (flour !== 3) fail('the mill should make three sacks from nine wheat');
    await close();
  }

  // ---- the field: the moonflower opens only by night, the twin-moon melon grows only by moonlight ----
  const moon = await p.evaluate(() => {
    const day = Date.UTC(2026, 9, 17, 16), out = { nightNoon: BridgeFarm.nightAt(day) };
    let t = day; while (!BridgeFarm.nightAt(t)) t += 600000;
    out.nightAfter = Math.round((t - day) / 60000) + ' min';
    out.lantern = BridgeFarm.moonLight(0, t).toFixed(2); out.button = BridgeFarm.moonLight(1, t).toFixed(2);
    return out;
  });
  console.log('country: moons', JSON.stringify(moon));
  if (moon.nightNoon) fail('noon should not be night');
  // the journey
  await p.evaluate(() => BridgeCountryside.journey('train', () => { window.__arrived = 1; }));
  await p.waitForTimeout(2400);
  await p.screenshot({ path: SHOTS + '/vc_train.png' });
  await p.waitForTimeout(3200);
  console.log('country: the train arrived', await p.evaluate(() => !!window.__arrived));
  await p.evaluate(() => BridgeCountryside.journey('ferry', () => { window.__ferried = 1; }));
  await p.waitForTimeout(2400);
  await p.screenshot({ path: SHOTS + '/vc_ferry.png' });
  await p.waitForTimeout(3200);
  console.log('country: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
