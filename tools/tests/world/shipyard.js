// Your own shipyard (js/shipyard.js): the slipway built from the holm's lot once the workshop's up; a hull plan bought
// from the yard that builds her (a `workshop` shop); a keel laid and named; materials put in from your pack and the
// holm's store, stage by stage; a shipwright hired on the payroll; time skipped until she waits on her materials, then
// until she's done; her colours chosen; launched into the fleet at the holm; a part off the racks fitted for nothing; a
// ship lying there repainted; the ledger's rows. node world/shipyard.js [shots]
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
      localStorage.setItem('bridge_fleet', JSON.stringify({ ships: [
        { id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] },
        { id: 'c2', type: 'cutter', name: 'Swift', at: 'lumar-holm', hull: 1, hold: {}, guns: [], fits: [] }
      ], sailing: 'gull', n: 2, crew: [], cn: 0, hired: {} }));
    }
    const real = Date.now; window._off = 0; Date.now = () => real() + window._off;
  });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(3500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 60000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : undefined }); r(); })), [w, at]);
  const dialog = () => ev(() => ((document.querySelector('.world-dialog') || {}).innerText || 'none').replace(/\n+/g, ' | '));
  const row = (re) => ev((s) => { const o = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => new RegExp(s).test(x.textContent)); if (!o) return false; o.click(); return true; }, re.source);
  const btn = (re) => ev((s) => { const o = [...document.querySelectorAll('.world-dialog .wd-opt')].find(x => new RegExp(s).test(x.textContent) && !x.disabled); if (!o) return false; o.click(); return true; }, re.source);
  const shut = () => ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  const job = () => ev(() => JSON.stringify(BridgeShipyard._state().job && { stage: BridgeShipyard._state().job.stage, ready: !!BridgeShipyard._state().job.ready, put: BridgeShipyard._state().job.put }));
  const skip = (mins) => ev((m) => { window._off += m * 60000; BridgeShipyard._advance(); return BridgeShipyard.summary().line; }, mins);
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };

  // ---- the slip below the garden wall, built from its own interaction ---------------------------------------------------
  await go('lumar-holm', [10, 18]); await wait(2000);
  const it = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.act === 'slipway'); return i && [i.x, i.y, i.label, i.prompt]; });
  console.log('slipway interaction:', JSON.stringify(it));
  expect('a SLIPWAY at the head of the old slip', it && it[2] === 'SLIPWAY' && it[3] === 'PRESS E TO LOOK');
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(x => x.act === 'slipway'))); await wait(400);
  console.log('offer:', (await dialog()).slice(0, 220));
  await btn(/Build it/); await wait(2500);
  const built = await ev(() => ({ built: BridgeHolm.built('slipway'), layer: BridgeWorld.getWorld().scene.layers.slipway, coins: window._coins }));
  console.log('built:', JSON.stringify(built));
  expect('built for 12,000, the slip layer on', built.built && built.layer === 'built' && built.coins === 48000);
  await shut();
  await ev(() => BridgeShipyard.open()); await wait(300);
  const empty = await dialog();
  console.log('the slipway:', empty.slice(0, 300));
  expect('no plans yet: every keel wants its plans and says where to get them', /Lay a keel: cutter/.test(empty) && /Bess Tolliver/.test(empty));
  await shut();

  // ---- a cutter's plans from Bess ---------------------------------------------------------------------------------------
  await ev(() => BridgeWorkshop.shop('bess', { name: 'Bess Tolliver', id: 'bess' })); await wait(300);
  console.log('bess:', (await dialog()).slice(0, 260));
  await row(/Plans: build a cutter/); await wait(500);
  const plans = await ev(() => ({ known: BridgeShipyard.known('cutter'), coins: window._coins }));
  expect('the cutter\'s plans for 900', plans.known && plans.coins === 47100);
  await shut();

  // ---- lay a keel, name her ---------------------------------------------------------------------------------------------
  await ev(() => BridgeShipyard.open()); await wait(300);
  await row(/Lay a keel: cutter/); await wait(300);
  await ev(() => { const f = document.querySelector('.world-dialog .wd-chooser-input'); f.querySelector('input').value = 'Holm Lass'; f.querySelector('button').click(); }); await wait(400);
  console.log('keel:', (await dialog()).slice(0, 260));
  const laid = await ev(() => { const j = BridgeShipyard._state().job; return j && [j.type, j.name, j.stage]; });
  expect('the keel down for the Holm Lass, a cutter', laid && laid[0] === 'cutter' && laid[1] === 'Holm Lass' && laid[2] === 0);
  const hull0 = await ev(() => BridgeShipyard.stage());
  expect('the holm shows a keel on the slip', hull0 === 'keel');

  // ---- materials: the keel and the planking, from the pack and the store (the rigging still to come) ------------------
  await ev(() => { BridgeInventory.addItem('oak_plank', 6); BridgeInventory.addItem('iron_bar', 4); BridgeHolm.storeAdd('plank', 24); BridgeHolm.storeAdd('pitch', 4); });
  await shut(); await ev(() => BridgeShipyard.open()); await wait(300);
  await row(/Put in materials/); await wait(400);
  console.log('put in:', (await dialog()).slice(0, 260));
  const put1 = JSON.parse(await job());
  expect('the keel and the planking stocked from pack and store', put1.put[0].oak_plank === 6 && put1.put[0].iron_bar === 2 && put1.put[1].plank === 24 && put1.put[1].iron_bar === 2 && put1.put[1].pitch === 4);
  const left = await ev(() => ({ pack: BridgeInventory.getCount('oak_plank'), store: BridgeHolm.stored('plank') }));
  expect('taken out of the pack and the store', left.pack === 0 && !left.store);

  // nobody working her yet
  const idle = await skip(120);
  console.log('two hours, nobody on her:', idle);
  expect('nothing happens without a shipwright', /nobody working her/.test(idle));

  // ---- a shipwright -----------------------------------------------------------------------------------------------------
  await shut(); await ev(() => BridgeShipyard.open()); await wait(300);
  await row(/Shipwrights/); await wait(300);
  console.log('shipwrights:', (await dialog()).slice(0, 300));
  const c0 = await ev(() => window._coins);
  await row(/apprentice shipwright/); await wait(500);
  const wr = await ev(() => BridgeShipyard.summary().wrights.length);
  const c1 = await ev(() => window._coins);
  expect('an apprentice shipwright taken on, a day\'s wage up front', wr === 1 && c1 < c0);
  const masterLocked = await ev(() => BridgeShipyard.candidates().find(c => c.grade === 'master').locked);
  expect('no master shipwright till a ship\'s been launched', masterLocked);

  // ---- time: the keel and the planking, then she waits on her rigging ----------------------------------------------------
  const mid = await skip(7 * 60);
  console.log('seven hours on:', mid);
  const j1 = JSON.parse(await job());
  expect('keel laid, planked, waiting on the rigging\'s materials', j1.stage === 2 && !j1.ready && /waiting on materials/.test(mid));
  expect('the holm shows her planked', (await ev(() => BridgeShipyard.stage())) === 'planked');
  await ev(() => { BridgeInventory.addItem('rope', 8); BridgeInventory.addItem('sailcloth', 4); });
  await shut(); await ev(() => BridgeShipyard.open()); await wait(300);
  await row(/Put in materials/); await wait(300);
  const done = await skip(4 * 60);
  console.log('four hours more:', done);
  expect('rigged: ready to launch', /ready to launch/.test(done) && JSON.parse(await job()).ready);
  const needs = await ev(() => BridgeLedger.needs().map(n => n.name).join(' | '));
  console.log('ledger needs:', needs);
  expect('the ledger says she\'s finished', /Holm Lass is finished/.test(needs));

  // ---- her colours, and the launch --------------------------------------------------------------------------------------
  await shut(); await ev(() => BridgeShipyard.open()); await wait(300);
  await row(/Her name and colours/); await wait(300);
  await row(/Paint/); await wait(300);
  await row(/Navy blue/); await wait(300);
  await row(/Figurehead/); await wait(300);
  await row(/A starling/); await wait(300);
  console.log('colours:', (await dialog()).slice(0, 200));
  await wait(900);
  const art = await ev(() => { const c = document.querySelector('.wd-art'); if (!c || !c.width) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
  await p.screenshot({ path: SHOTS + '/shipyard_colours.png' });
  expect('her colours screen draws her as she\'ll be', art > 500);
  await btn(/Done/); await wait(300);
  await p.screenshot({ path: SHOTS + '/shipyard_ready.png' });
  await row(/Launch her/); await wait(600);
  console.log('launch:', (await dialog()).slice(0, 220));
  const ship = await ev(() => { const s = BridgeFleet.all().find(x => x.name === 'Holm Lass'); return s && { type: s.type, at: s.at, look: s.look, built: s.built }; });
  console.log('her:', JSON.stringify(ship));
  expect('launched: a cutter of your own lying at the holm, in navy with a starling at her bow', ship && ship.type === 'cutter' && ship.at === 'lumar-holm' && ship.built && ship.look.paint === 'navy' && ship.look.figure === 'starling');
  expect('the slip empty again', (await ev(() => BridgeShipyard._state().job)) === null && (await ev(() => BridgeShipyard.stage())) === null);
  expect('a master shipwright will come now', !(await ev(() => BridgeShipyard.candidates().find(c => c.grade === 'master').locked)));

  // ---- fit out and repaint what lies here -------------------------------------------------------------------------------
  await ev(() => BridgeHolm.storeAdd('part_swivel', 1));
  await shut(); await ev(() => BridgeShipyard.open()); await wait(300);
  await row(/Fit out a ship lying here/); await wait(300);
  console.log('fit out:', (await dialog()).slice(0, 260));
  await row(/Holm Lass: Swivel/); await wait(400);
  const fitted = await ev(() => ({ guns: BridgeFleet.all().find(x => x.name === 'Holm Lass').guns, racks: BridgeHolm.stored('part_swivel') || 0, coins: window._coins }));
  console.log('fitted:', JSON.stringify(fitted));
  expect('the swivel off the racks onto her, for nothing', fitted.guns.indexOf('swivel') >= 0 && fitted.racks === 0);
  await shut(); await ev(() => BridgeShipyard.open()); await wait(300);
  await row(/Repaint a ship lying here/); await wait(300);
  await row(/Swift/); await wait(300);
  await row(/Sails/); await wait(300);
  await row(/Red/); await wait(300);
  await btn(/Done/); await wait(300);
  const swift = await ev(() => BridgeFleet.get('c2').look);
  expect('the Swift in red sails', swift && swift.sails === 'red');
  // drawn so: her portrait in red cloth, the same ship in no colours of her own none
  const reds = await ev(() => new Promise(res => {
    const s = BridgeFleet.get('c2'), mk = (ship) => { const c = document.createElement('canvas'); document.body.appendChild(c); BridgeSloop.portrait(c, ship); return c; };
    const lass = BridgeFleet.all().find(x => x.name === 'Holm Lass');
    const a = mk(s), plain = mk(Object.assign({}, s, { id: 'plain', look: null })), navy = mk(lass), bare = mk(Object.assign({}, lass, { id: 'bare', look: null }));
    setTimeout(() => {
      const RED = ['c44234', '98302a', '6a2018'], NAVY = BridgeShipKit.PAINT.navy.map(h => h.slice(1)), hex = (d, i) => ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0');
      const count = (c, set) => { if (!c.width) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (set.indexOf(hex(d, i)) >= 0) n++; return n; };
      const out = { red: count(a, RED), plain: count(plain, RED), navy: count(navy, NAVY), bare: count(bare, NAVY) };
      [a, plain, navy, bare].forEach(c => c.remove()); res(out);
    }, 1800);
  }));
  console.log('her colours in the portraits:', JSON.stringify(reds));
  expect('the Swift drawn under red sails', reds.red > 40 && reds.plain >= 0 && reds.plain < 5);
  expect('the Holm Lass drawn with navy topsides', reds.navy > 40 && reds.bare >= 0 && reds.bare < 5);
  // and the Holm Lass lying at the holm's pier in navy, a starling at her bow
  await shut(); await ev(() => BridgeCharacter.init(20, 23)); await wait(1800);
  await p.screenshot({ path: SHOTS + '/shipyard_moored.png' });

  // ---- the ledger -------------------------------------------------------------------------------------------------------
  const roster = await ev(() => BridgeLedger.roster().map(r => r.name + ':' + r.state).join(', '));
  console.log('roster:', roster);
  expect('the shipwright on the staff board', /:on/.test(roster));
  console.log('summary:', JSON.stringify(await ev(() => BridgeShipyard.summary())).slice(0, 300));
  await shut();
  await ev(() => BridgeMenu.open('ledger', { focus: 'staff' })); await wait(800);
  await p.screenshot({ path: SHOTS + '/shipyard_ledger.png' });
  const staffTxt = await ev(() => document.querySelector('#game-menu') ? document.querySelector('#game-menu').innerText : '');
  expect('the ledger\'s staff page lists the shipwright on the slipway', /on the slipway/.test(staffTxt));

  console.log('errors', errors);
  await b.close();
})();
