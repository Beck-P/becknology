// Brambleford grows (js/village.js) and the horse (js/countryside.js): Station Road as you first find it (the tea rooms
// shut, the dairy to let, the plots, the halt closed, the bridge down), the way there from Brambleford's street, the
// village fund, every project finished and Station Road reloaded (each place open, its people at their doors, the
// bridge walkable), more people about; then a horse bought from Hobb, ridden (quicker than walking), got down from and
// waiting, and the buggy. Screenshots: shots/vg_*.png. node world/verdance_growth.js [shots]
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
    localStorage.removeItem('bridge_village'); localStorage.removeItem('bridge_country');
  });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T12:00'); await p.waitForTimeout(3000);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.evaluate(() => BridgeWeather._pin('verdance', 'fair'));
  await p.evaluate(() => {                                  // coins without a server: a purse in the page
    window._coins = 100000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const go = (w, x, y) => p.evaluate((q) => new Promise(r => BridgeWorld.load(q[0], () => {
    BridgeState.transition('world', { worldId: q[0], spawn: { x: q[1], y: q[2] } }); BridgeCharacter.init(q[1], q[2]);
    if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); r();
  })), [w, x, y]);
  const fail = (m) => { errs++; console.log('village: ERROR', m); };

  // Brambleford's street runs on east to Station Road
  await go('verdance-village', 43, 11);
  const east = await p.evaluate(() => BridgeWorld.getWorld().interactions.filter(it => it.target === 'verdance-east').map(it => [it.x, it.y]));
  console.log('village: ways east from Brambleford', JSON.stringify(east));
  if (!east.length) fail('no way from Brambleford to Station Road');

  // Station Road, as you first find it
  await go('verdance-east', 15, 13);
  await p.waitForTimeout(2500);
  const first = await p.evaluate(() => { const w = BridgeWorld.getWorld(); return { layers: w.scene.layers, actors: w.scene.actors.map(a => a.sheet), bridge: w.collisions[26][18],
    people: w.interactions.filter(it => ['JUNIPER', 'HESTER', 'MR PIKE'].indexOf(it.label) >= 0).length }; });
  console.log('village: at first', JSON.stringify(first));
  if (first.layers.cafe !== 'shut' || first.layers.bridge !== 'broken') fail('Station Road should start shut up');
  if (first.bridge !== 1) fail('the broken bridge should not be walkable');
  if (first.people) fail('the people a project brings are there before it');
  await p.screenshot({ path: SHOTS + '/vg_before.png' });
  // the fund board
  await p.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'village_fund'); BridgeInteractions.execute(it); });
  await p.waitForTimeout(500);
  const board = await p.evaluate(() => [...document.querySelectorAll('.wd-sell-row .sp-name')].map(e => e.textContent));
  console.log('village: the fund board', JSON.stringify(board));
  if (board.length !== 5) fail('the fund board should list five projects');
  await p.screenshot({ path: SHOTS + '/vg_fund.png' });
  await p.keyboard.press('Escape');

  // every project done
  await p.evaluate(() => ['bridge', 'cafe', 'dairy', 'homes', 'station'].forEach(id => BridgeVillage._finish(id)));
  await go('verdance-east', 15, 13);
  await p.waitForTimeout(2500);
  const after = await p.evaluate(() => { const w = BridgeWorld.getWorld(); return { layers: w.scene.layers, actors: w.scene.actors.map(a => a.sheet), bridge: w.collisions[26][18],
    sites: w.interactions.filter(it => it.type === 'village_site').map(it => it.label), stage: BridgeVillage.stage(),
    crowd: BridgeCrowd._count('verdance-east', Date.now()), town: BridgeCrowd._count('verdance-village', Date.now()) }; });
  console.log('village: all done', JSON.stringify(after));
  if (after.layers.cafe !== 'open' || after.layers.station !== 'open' || after.layers.homes !== 'built') fail('the projects should show');
  if (after.actors.indexOf('npc-juniper') < 0 || after.actors.indexOf('npc-pike') < 0) fail('the new people should be at their doors');
  if (after.bridge !== 0) fail('the mended bridge should be walkable');
  await p.screenshot({ path: SHOTS + '/vg_after.png' });
  // the café, the dairy
  await p.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.site === 'cafe'); BridgeInteractions.execute(it); });
  await p.waitForTimeout(400);
  const menu = await p.evaluate(() => [...document.querySelectorAll('.wd-sell-row .sp-name')].map(e => e.textContent));
  console.log('village: the Kettle & Crumb', JSON.stringify(menu));
  if (!menu.some(t => /Tea/.test(t))) fail('the café has no menu');
  await p.screenshot({ path: SHOTS + '/vg_cafe.png' });
  await p.keyboard.press('Escape');

  // a horse: bought (the state, as Hobb would leave it), whistled, ridden
  await p.evaluate(() => { localStorage.setItem('bridge_country', JSON.stringify({ horse: { coat: 'chestnut', name: 'Bramble' }, buggy: true })); BridgeCountryside.reload();
    BridgeInventory.addItem('horse_whistle', 1); });
  await go('verdance-east', 3, 14);
  await p.evaluate(() => BridgeLit._force({ hour: 12.4, season: 'summer' }));
  await p.evaluate(() => BridgeCountryside.whistle());
  await p.waitForTimeout(400);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.wd-sell-row')].find(e => /Ride/.test(e.textContent)); if (b) b.click(); });
  await p.waitForTimeout(800);
  const rid = await p.evaluate(() => ({ riding: BridgeCountryside.riding(), mount: !!BridgeCharacter.getMount() }));
  console.log('village: up on Bramble', JSON.stringify(rid));
  if (rid.riding !== 'horse' || !rid.mount) fail('not riding');
  await p.screenshot({ path: SHOTS + '/vg_riding.png' });
  // quicker than walking: hold right for a second
  const x0 = await p.evaluate(() => BridgeCharacter.getX());
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(2400);
  const x1 = await p.evaluate(() => BridgeCharacter.getX());
  console.log('village: half a second riding east,', x1 - x0, 'tiles');
  await p.screenshot({ path: SHOTS + '/vg_riding2.png' });
  for (const f of ['down', 'up', 'left']) {
    await p.evaluate((f) => BridgeCharacter.setFacing ? BridgeCharacter.setFacing(f) : null, f);
    await p.waitForTimeout(250);
    await p.screenshot({ path: SHOTS + '/vg_riding_' + f + '.png' });
  }
  await p.evaluate(() => BridgeCountryside.down());
  await p.waitForTimeout(400);
  const left = await p.evaluate(() => ({ at: BridgeCountryside._s().at, waiting: BridgeWorld.getWorld().interactions.filter(it => it.type === 'horse').length }));
  console.log('village: got down,', JSON.stringify(left));
  if (!left.waiting) fail('the horse should wait where you left it');
  // the buggy
  await p.evaluate(() => { const s = BridgeCountryside._s(); s.riding = 'buggy'; s.at = null; BridgeCharacter.setMount(null); });
  await go('verdance-east', 6, 14);
  await p.evaluate(() => BridgeLit._force({ hour: 12.4, season: 'summer' }));
  await p.waitForTimeout(2400);
  await p.screenshot({ path: SHOTS + '/vg_buggy.png' });
  const bg = await p.evaluate(() => BridgeCharacter.getMount() && BridgeCharacter.getMount().what);
  console.log('village: driving the', bg);
  if (bg !== 'buggy') fail('not driving the buggy');
  // indoors you're on your feet
  await go('verdance-home', 5, 6);
  const inside = await p.evaluate(() => ({ riding: BridgeCountryside.riding(), mount: !!BridgeCharacter.getMount() }));
  console.log('village: indoors', JSON.stringify(inside));
  if (inside.mount) fail('riding indoors');
  console.log('village: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
