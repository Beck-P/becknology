// The hall of finds (js/trophies.js): built from its lot on the holm once the cottage is up; inside, an empty board,
// plinth or case says where to look; what you've found yourself — a legend landed, a relic out of the Undercroft, a
// scale off the Gloamserpent, the Lantern Beyond — goes on show on its spot, drawn and readable; a find made while
// you're away from the hall turns up there too. The Cabinet of Wonders (js/wonders.js): a relic's waking known as soon as
// it's found, made at the Workshop, on its shelf in the hall, working (the Midnight Sea's things come half as often);
// an empty shelf says where the plan's from. node world/trophies.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('bridge_ship_location', 'lumar');
      localStorage.setItem('bridge_holm', JSON.stringify({ owned: true, name: 'Starling Holm', built: { house: 1, dock: 1, workshop: 1 }, store: {}, chest: 0, log: [] }));
      localStorage.setItem('bridge_dungeon', JSON.stringify({ nights: {}, best: 0, relics: ['drowned_bell', 'barrow_crown'] }));
    }
    const real = Date.now; window._off = 0; Date.now = () => real() + window._off;
  });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T21:00'); await p.waitForTimeout(3500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 20000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
    BridgeInventory.addItem('gloam_scale', 1); BridgeInventory.addItem('lantern_beyond', 1);
  });
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : undefined }); r(); })), [w, at]);
  const dialog = () => ev(() => ((document.querySelector('.world-dialog') || {}).innerText || 'none').replace(/\n+/g, ' | '));
  const btn = (re) => ev((s) => { const o = [...document.querySelectorAll('.world-dialog .wd-opt')].find(x => new RegExp(s).test(x.textContent) && !x.disabled); if (!o) return false; o.click(); return true; }, re.source);
  const shut = () => ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };

  // ---- what counts: the relics from the Undercroft's save, the things in your pack ------------------------------------
  const found = await ev(() => { BridgeTrophies.check(true); return Object.keys(BridgeTrophies._state().found).sort(); });
  console.log('found:', JSON.stringify(found));
  expect('the Undercroft\'s relics and what you carry count as found', ['barrow_crown', 'drowned_bell', 'gloam_scale', 'lantern_beyond'].every(id => found.indexOf(id) >= 0) && found.indexOf('nightglass') < 0);

  // ---- built from its lot on the holm ---------------------------------------------------------------------------------
  await go('lumar-holm', [35, 15]); await wait(2000);
  const it = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.act === 'hall'); return i && [i.x, i.y, i.label, i.prompt]; });
  console.log('hall interaction:', JSON.stringify(it));
  expect('THE HALL on the east lot', it && it[0] === 35 && it[1] === 13 && it[2] === 'THE HALL');
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(x => x.act === 'hall'))); await wait(400);
  console.log('offer:', (await dialog()).slice(0, 240));
  await btn(/Build it/); await wait(2500);
  const built = await ev(() => { const w = BridgeWorld.getWorld(), L = w.holm.lots.hall; return { built: BridgeHolm.built('hall'), layer: w.scene.layers.hall, wall: w.collisions[L[1]][L[0]], coins: window._coins }; });
  console.log('built:', JSON.stringify(built));
  expect('built for 7,500, its layer on and its lot walled', built.built && built.layer === 'built' && built.wall === 1 && built.coins === 12500);
  await shut();
  await p.screenshot({ path: SHOTS + '/trophies_holm.png' });

  // ---- inside: the finds on their spots, the empty ones saying where to look -------------------------------------------
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(x => x.act === 'hall'))); await wait(3000);
  const inside = await ev(() => ({ world: BridgeWorld.getWorldId(), spots: (BridgeWorld.getWorld().hall || {}).spots || [],
    plates: BridgeWorld.getWorld().interactions.filter(i => i.type === 'trophy').map(i => i.id + ':' + i.label) }));
  console.log('inside:', inside.world, inside.spots.length, 'spots;', inside.plates.join(', ').slice(0, 400));
  expect('in the hall, a plate on every spot', inside.world === 'lumar-holm-hall' && inside.spots.length >= 15 && inside.plates.length === inside.spots.length);
  expect('a find on show by name, an empty one as such', inside.plates.indexOf('lantern_beyond:THE LANTERN BEYOND') >= 0 && inside.plates.indexOf('nightglass:EMPTY BOARD') >= 0);
  const drawn = await ev(() => { const w = BridgeWorld.getWorld(); return BridgeTrophies._here() && BridgeTrophies._here().data === w; });
  expect('the hall\'s finds are drawn', drawn);
  await shut(); await wait(800);
  await p.screenshot({ path: SHOTS + '/trophies_hall.png' });
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'trophy' && i.id === 'lantern_beyond'))); await wait(400);
  const plate = await dialog();
  console.log('its plate:', plate.slice(0, 200));
  expect('its plate says what it is and when it was found', /THE LANTERN BEYOND/i.test(plate) && /FOUND/.test(plate));
  await p.screenshot({ path: SHOTS + '/trophies_plate.png' });
  await shut();
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'trophy' && i.id === 'nightglass'))); await wait(400);
  const hint = await dialog();
  console.log('an empty board:', hint.slice(0, 200));
  expect('an empty board says where to look', /MIDNIGHT SEA/.test(hint));
  await shut();

  // ---- a find made elsewhere turns up on its spot ----------------------------------------------------------------------
  await ev(() => { BridgeInventory.addItem('regatta_cup', 1); BridgeTrophies.check(false); }); await wait(400);
  const cup = await ev(() => BridgeWorld.getWorld().interactions.find(i => i.type === 'trophy' && i.id === 'regatta_cup').label);
  expect('the Regatta Cup on its plinth as soon as it\'s won', cup === 'THE REGATTA CUP');
  await ev(() => BridgeCharacter.init(9, 7)); await wait(1200);
  await p.screenshot({ path: SHOTS + '/trophies_close.png' });

  // ---- the Cabinet of Wonders: the Drowned Bell woken at the Workshop, onto its shelf, working -------------------------
  const plans = await ev(() => ({ bell: BridgeWorkshop.known('ferry_bell'), crown: BridgeWorkshop.known('crown_woken'), coin: BridgeWorkshop.known('coin_woken'), compass: BridgeWorkshop.known('storm_compass'), deep: BridgeWonders.deep() }));
  console.log('plans:', JSON.stringify(plans));
  expect('a relic\'s waking known once it\'s found, the others not yet', plans.bell && plans.crown && !plans.coin && !plans.compass && plans.deep === 1);
  const shelf0 = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.type === 'trophy' && x.id === 'storm_compass'); return i && i.label; });
  expect('an empty shelf in the cabinet', shelf0 === 'EMPTY SHELF');
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'trophy' && i.id === 'storm_compass'))); await wait(400);
  const card = await dialog();
  console.log('an empty shelf:', card.slice(0, 220));
  expect('it says what goes there and whose plan it is', /STORM COMPASS/.test(card) && /TAMSIN GALE/.test(card));
  await shut();
  const made = await ev(() => {
    ['drowned_bell'].forEach(id => BridgeInventory.addItem(id, 1)); BridgeInventory.addItem('moonglass', 2); BridgeInventory.addItem('songstone', 1);
    const r = BridgeWorkshop.start('ferry_bell', true), again = BridgeWorkshop.start('ferry_bell', false);
    return { ok: r.ok, again: again.reason, bell: BridgeInventory.getCount('drowned_bell') };
  });
  console.log('on the bench:', JSON.stringify(made));
  expect('the bell on your bench, its inputs taken, and only one of it', made.ok && made.again === 'one' && made.bell === 0);
  const done = await ev(() => { window._off += 31 * 3600000; BridgeWorkshop._advance(); return { has: BridgeWonders.has('ferry_bell'), deep: BridgeWonders.deep(), relic: BridgeTrophies.has('drowned_bell') }; });
  console.log('woken:', JSON.stringify(done));
  expect('woken: in the cabinet, the deep turning away, and the relic still on show', done.has && done.deep === 0.5 && done.relic);
  await ev(() => BridgeWorld.load('lumar-holm-hall', () => BridgeState.transition('world', { worldId: 'lumar-holm-hall', spawn: { x: 3, y: 4 } }))); await wait(2500);
  const shelf1 = await ev(() => BridgeWorld.getWorld().interactions.find(x => x.type === 'trophy' && x.id === 'ferry_bell').label);
  expect('on its shelf', shelf1 === 'THE FERRYMAN\'S BELL');
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'trophy' && i.id === 'drowned_bell'))); await wait(400);
  const relic = await dialog();
  console.log('the relic\'s plate:', relic.slice(0, 240));
  expect('the relic\'s plate says it\'s been woken', /WOKEN SINCE/.test(relic));
  await shut(); await ev(() => BridgeCharacter.init(3, 4)); await wait(1200);
  await p.screenshot({ path: SHOTS + '/trophies_cabinet.png' });

  // ---- the Collection: a completed set gives something for good ---------------------------------------------------------
  const eat = (bonus) => ev((b) => { const C = BridgeCodex._st(); if (b) C.paid.food = Date.now(); else delete C.paid.food;
    const inv = BridgeInventory, s0 = inv.getStats(); inv.useEnergy(s0.energy - 1); const e0 = inv.getStats().energy;
    const food = Object.values(BridgeItems.all()).find(it => it.type === 'food' && it.effects && it.effects.energy >= 20 && it.onUse);
    food.onUse.call(food, inv); return { id: food.id, gain: inv.getStats().energy - e0, bonus: BridgeCodex.bonus('food') }; }, bonus);
  const plain = await eat(false), fed = await eat(true);
  console.log('food:', JSON.stringify(plain), JSON.stringify(fed));
  expect('the food and drink set, complete, makes food go a quarter further', fed.bonus && fed.gain === Math.round(plain.gain * 1.25));
  await ev(() => BridgeMenu.open('collection')); await wait(800);
  const tab = (name) => ev((n) => { const b = [...document.querySelectorAll('#game-menu button, #game-menu [role=tab], #game-menu .cx-tab')].find(x => x.textContent.indexOf(n) === 0); if (b) b.click(); return !!b; }, name);
  const text = () => ev(() => document.querySelector('#game-menu') ? document.querySelector('#game-menu').innerText : '');
  await tab('From the farm'); await wait(300);
  const farm = await text();
  await tab('Food and drink'); await wait(300);
  const page = await text();
  console.log('the Collection:', (page.match(/Complete:[^\n]*/i) || ['(no complete line)'])[0], '|', (farm.match(/Find them all:[^\n]*/i) || ['(none)'])[0]);
  expect('the Collection says what each set gives, and what a complete one does now', /Complete: food goes a quarter further/i.test(page) && /crops grow a tenth quicker/i.test(farm));
  await p.screenshot({ path: SHOTS + '/trophies_collection.png' });

  console.log('errors', errors);
  await b.close();
})();
