// The Crimson Sea grown (Workstream B2): Cinder Key - Tortuga's cove and town, the harbourmistress's book, Vesper Quick
// the fence buying hot goods (and pirates leaving plunder when you beat them), the Salt Rat (its Bones table), the
// stormwatch (the forecast, a storm glass bought), the crater (ember imps and magma crabs, ember glass, blacking out on
// the boardwalk); and Cinder Key on the chart and at sea. node world/crimson.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && /\/bridge\//.test(r.url())) console.log('MISSING', r.status(), r.url().slice(0, 140)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); } });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T23:00'); await p.waitForTimeout(3500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 5000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : undefined }); r(); })), [w, at]);
  const dialog = () => ev(() => ((document.querySelector('.world-dialog') || {}).innerText || 'none').replace(/\n+/g, ' | '));
  const btn = (re) => ev((s) => { const o = [...document.querySelectorAll('.world-dialog .wd-opt, .world-dialog button')].find(x => new RegExp(s).test(x.textContent) && !x.disabled); if (!o) return false; o.click(); return true; }, re.source);
  const shut = () => ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  const use = (label) => ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l); if (!i) return false; BridgeInteractions.execute(i); return true; }, label);
  const here = () => ev(() => BridgeWorld.getWorldId());
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };

  // ---- Cinder Key: the island loads, its ways in, its people --------------------------------------------------------------
  await go('lumar-cinder'); await wait(3000);
  const isl = await ev(() => { const w = BridgeWorld.getWorld(); return { name: w.name, sea: w.sea, labels: w.interactions.map(i => i.label), actors: (w.scene.actors || []).map(a => a.sheet) }; });
  console.log('cinder:', isl.name, isl.labels.length, 'interactions', JSON.stringify(isl.actors));
  ['DOCK', 'THE SALT RAT', 'STORMWATCH', 'THE CRATER TRAIL', 'THE FENCE', 'SHIPWRIGHT', 'HARBOURMASTER'].forEach(l => expect('Cinder Key has ' + l, isl.labels.includes(l)));
  expect('its sea is the Crimson', isl.sea === 'crimson');
  await p.screenshot({ path: SHOTS + '/crimson_cove.png' });
  await ev(() => BridgeLit && BridgeLit._force && BridgeLit._force({ hour: 12.4 })); await wait(2500);
  await p.screenshot({ path: SHOTS + '/crimson_cove_noon.png' });
  await ev(() => BridgeLit && BridgeLit._force && BridgeLit._force({ hour: 17.9 })); await wait(2500);
  await p.screenshot({ path: SHOTS + '/crimson_cove_dusk.png' });
  await ev(() => BridgeLit && BridgeLit._force && BridgeLit._force(null)); await wait(500);

  // ---- the fence: hot goods off pirates, sold to her and nobody else -----------------------------------------------------
  const hot = await ev(() => { let got = null; for (let i = 0; i < 40 && !got; i++) got = BridgeCrimson.prize({ name: 'a pirate cutter' }); return got; });
  console.log('plunder:', hot);
  expect('a beaten pirate leaves plunder now and then', /^plunder_/.test(hot || ''));
  await wait(400);
  const it = await ev((id) => { const i = BridgeItems.get(id); return { value: i.value, fence: i.fence, n: BridgeInventory.getCount(id) }; }, hot);
  expect('hot goods: worth nothing to a trader, something to the fence', it.value === 0 && it.fence > 0 && it.n >= 1);
  await use('THE FENCE'); await wait(800);
  const fence = await dialog();
  console.log('fence:', fence.slice(0, 200));
  expect('Vesper Quick talks, and buys', /VESPER QUICK/.test(fence) && /What'll you buy/.test(fence));
  await btn(/What'll you buy/); await wait(1500);
  const sheet = await dialog();
  console.log('sell sheet:', sheet.slice(0, 220));
  expect('her sell sheet lists the plunder', new RegExp(await ev((id) => BridgeItems.get(id).name, hot), 'i').test(sheet));
  await shut();

  // ---- the harbourmistress's book ------------------------------------------------------------------------------------------
  const hm = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === 'HARBOURMASTER'); return i && [i.x, i.y, i.type]; });
  console.log('harbourmaster:', JSON.stringify(hm));
  expect('Scarlet Dee keeps the harbour', !!hm);

  // ---- the Salt Rat, its Bones table ------------------------------------------------------------------------------------------
  await use('THE SALT RAT'); await wait(3000);
  expect('into the Salt Rat', (await here()) === 'lumar-cinder-tavern');
  await p.screenshot({ path: SHOTS + '/crimson_tavern.png' });
  await use('DICE TABLE'); await wait(800);
  const dice = await dialog();
  console.log('dice:', dice.slice(0, 160));
  expect('Bones at the Salt Rat, with Red Annis and Gash', /ANNIS|GASH|BONES/i.test(dice) || await ev(() => !!document.querySelector('.fd-panel')));
  await shut(); await ev(() => document.querySelectorAll('.fd-panel').forEach(x => x.remove()));
  await use('ROOK'); await wait(700);
  expect('Rook behind the bar', /ROOK/.test(await dialog()));
  await shut();
  await use('THE COVE'); await wait(3000);
  expect('back out on the boardwalk', (await here()) === 'lumar-cinder');

  // ---- the stormwatch: the forecast, a storm glass ---------------------------------------------------------------------------
  await use('STORMWATCH'); await wait(3000);
  expect('up in the stormwatch', (await here()) === 'lumar-cinder-stormwatch');
  await p.screenshot({ path: SHOTS + '/crimson_stormwatch.png' });
  await use('BAROMETER BOARD'); await wait(800);
  const board = await dialog();
  console.log('board:', board.slice(0, 260));
  expect('the board says what the sea will do', /NOW:/.test(board) && /COMING:/.test(board));
  await btn(/storm glass/i); await wait(800);
  expect('a storm glass bought, carried, working', await ev(() => BridgeInventory.getCount('storm_glass') === 1 && BridgeCrimson.stormGlass()));
  await shut();
  await use('DOOR'); await wait(3000);

  // ---- the crater: its creatures, ember glass, blacking out ---------------------------------------------------------------------
  await use('THE CRATER TRAIL'); await wait(3500);
  expect('up the trail into the crater', (await here()) === 'lumar-cinder-volcano');
  const crit = await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile').map(i => i.creature));
  console.log('crater creatures:', JSON.stringify(crit));
  expect('ember imps and magma crabs', crit.filter(c => c === 'imp').length >= 3 && crit.filter(c => c === 'magma').length >= 2);
  const glass = await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.label === 'EMBER GLASS').length);
  expect('ember glass to gather', glass >= 4);
  await wait(1500);
  await p.screenshot({ path: SHOTS + '/crimson_crater.png' });
  await ev(() => BridgeCombat.faint()); await wait(4500);
  console.log('after blacking out:', await here());
  expect('black out in the crater, come round on the boardwalk', (await here()) === 'lumar-cinder');
  await shut();

  // ---- on the chart, at sea --------------------------------------------------------------------------------------------------------
  const chart = await ev(() => { const I = BridgeVoyage._isles['lumar-cinder']; return I && [I.x, I.y, I.pal]; });
  expect('Cinder Key on the chart, in the Crimson', chart && chart[2] === 'crimson');
  console.log('errors: ' + errors);
  await b.close();
})();
