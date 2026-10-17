// The hall of finds (js/trophies.js): built from its lot on the holm once the cottage is up; inside, an empty board,
// plinth or case says where to look; what you've found yourself — a legend landed, a relic out of the Undercroft, a
// scale off the Gloamserpent, the Lantern Beyond — goes on show on its spot, drawn and readable; a find made while
// you're away from the hall turns up there too. node world/trophies.js [shots]
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
      localStorage.setItem('bridge_holm', JSON.stringify({ owned: true, name: 'Starling Holm', built: { house: 1, dock: 1 }, store: {}, chest: 0, log: [] }));
      localStorage.setItem('bridge_dungeon', JSON.stringify({ nights: {}, best: 0, relics: ['drowned_bell', 'barrow_crown'] }));
    }
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

  console.log('errors', errors);
  await b.close();
})();
