// The Workshop on your holm (js/workshop.js): built from the holm's ledger once the dock's rebuilt, stood on its lot
// (the quarters' art moved there till it's rendered); materials gathered and bought, from your pack, the store and a
// hold at the jetty (a crate of pine timber broken open); work at your own bench and a smith hired to work the queue;
// time skipped and the work collected off the racks; a plan bought, a favour done; a gun you made fitted by a
// harbourmaster; the ledger's view and summary(). node world/workshop.js [shots]
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
      localStorage.setItem('bridge_fleet', JSON.stringify({ ships: [
        { id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] },
        { id: 'c2', type: 'cutter', name: 'Swift', at: 'lumar-holm', hull: 1, hold: { timber: 2 }, guns: [], fits: [] }
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
  const store = () => ev(() => JSON.stringify(BridgeHolm.stored()));
  const skip = (mins) => ev((m) => { window._off += m * 60000; return BridgeWorkshop._advance().map(f => f.text + ' (' + f.by + ')'); }, mins);
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };

  // ---- the holm, the workshop's lot, and building it from the interaction on the lot -----------------------------------
  await go('lumar-holm', [13, 11]); await wait(2000);
  const lot = await ev(() => { const w = BridgeWorld.getWorld(), it = w.interactions.find(i => i.act === 'workshop'); return { it: it && [it.x, it.y, it.label, it.prompt], lot: w.holm.lots.workshop, wall: w.collisions[8][12] }; });
  console.log('workshop lot before:', JSON.stringify(lot));
  expect('a WORKSHOP on the lot, open ground till it is built', lot.it && lot.it[2] === 'WORKSHOP' && lot.wall === 0);
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.act === 'workshop')));
  await wait(400);
  console.log('offer:', (await dialog()).slice(0, 260));
  await btn(/Build it/); await wait(2500);
  const after = await ev(() => { const w = BridgeWorld.getWorld(), sc = BridgeScene.get('lumar-holm');
    return { built: BridgeHolm.built('workshop'), layer: w.scene.layers.workshop, shown: !!(sc && sc.layers.find(L => L.slot === 'workshop' && L.key === 'built')),
             wall: w.collisions[8][12], smoke: w.scene.smoke.length, coins: window._coins }; });
  console.log('built:', JSON.stringify(after));
  expect('built for 9000, its lot walled, in the scene (its own render, or the stand-in) and its chimney smoking', after.built && after.layer === 'built' && after.shown && after.wall === 1 && after.coins === 51000);
  await ev(() => BridgeCharacter.init(13, 11)); await wait(1500);
  await p.screenshot({ path: SHOTS + '/workshop_holm.png' });

  // ---- materials: gathered on the holm, bought from Bess, ore from the mine, a crate in the cutter's hold -------------
  const pine = await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'forage' && i.item === 'pine_log'); if (!it) return null;
    const before = BridgeInventory.getCount('pine_log'); BridgeForage.gather(it); BridgeLoot.update(it.x + 0.5, it.y + 0.5);
    return { at: [it.x, it.y], label: it.label }; });
  console.log('windfall pine on the holm:', JSON.stringify(pine));
  expect('a pine forage spot on the holm', !!pine);
  await ev(() => BridgeWorkshop.shop('bess', { id: 'bess', name: 'Bess Tolliver' }, 'OFF THE POINT\'S OWN HILLS.'));
  await wait(300);
  console.log('Bess sells:', (await dialog()).slice(0, 240));
  await row(/Pine Log/); await wait(200); await btn(/Buy 5/); await wait(400);
  console.log('bought:', (await dialog()).slice(0, 120), '· pine in pack', await ev(() => BridgeInventory.getCount('pine_log')));
  await shut();
  await ev(() => { BridgeInventory.addItem('iron_ore', 12); BridgeInventory.addItem('oak_log', 6); BridgeInventory.addItem('sapphire_crystal', 4); });
  console.log('to hand, pine logs (pack + a crate in the Swift):', await ev(() => BridgeWorkshop.have('pine_log')));
  expect('a crate of pine timber counts as eight logs', await ev(() => BridgeWorkshop.have('pine_log') >= 16));

  // ---- the workshop: your bench ---------------------------------------------------------------------------------------
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.act === 'workshop')));
  await wait(400);
  console.log('workshop:', (await dialog()).slice(0, 300));
  await p.screenshot({ path: SHOTS + '/workshop_open.png' });
  await row(/Make something/); await wait(300);
  await p.screenshot({ path: SHOTS + '/workshop_book.png' });
  await row(/Saw oak planks/); await wait(300);
  console.log('card:', (await dialog()).slice(0, 300));
  await p.screenshot({ path: SHOTS + '/workshop_card.png' });
  await btn(/Work it yourself/); await wait(300);
  console.log('on your bench:', (await dialog()).slice(0, 160));
  const bench = await ev(() => { const j = BridgeWorkshop._state().bench; return j && [j.r, Math.round(j.need / 60000)]; });
  expect('oak planks on your bench', bench && bench[0] === 'oak_planks');

  // ---- the queue, and a smith to work it --------------------------------------------------------------------------------
  await shut();
  console.log('queue three iron bars:', JSON.stringify(await ev(() => BridgeWorkshop.queue('iron_bar', 3))));
  console.log('queue pine planks (from the crate):', JSON.stringify(await ev(() => { const r = BridgeWorkshop.queue('planks', 5); return r.ok; })), '· the Swift\'s hold', await ev(() => JSON.stringify(BridgeFleet.get('c2').hold)), '· store', await store());
  await ev(() => BridgeWorkshop.open()); await wait(300);
  await row(/Smiths/); await wait(300);
  await row(/Looking for work/); await wait(300);
  console.log('looking for work:', (await dialog()).slice(0, 360));
  await p.screenshot({ path: SHOTS + '/workshop_hire.png' });
  expect('a master won\'t come till the workshop\'s made 8 things', await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.none')].some(r => /Master smith/.test(r.textContent))));
  await row(/Apprentice smith/); await wait(300);
  await btn(/Take them on/); await wait(600);
  console.log('hired:', (await dialog()).slice(0, 200));
  const smiths = await ev(() => BridgeBusiness.staff('workshop').map(s => [s.name, s.grade, s.wage]));
  console.log('smiths:', JSON.stringify(smiths), '· coins', await ev(() => window._coins));
  expect('an apprentice smith on the payroll', smiths.length === 1 && smiths[0][1] === 'apprentice');
  await p.screenshot({ path: SHOTS + '/workshop_smiths.png' });
  await shut();

  // ---- time passes: your bench and the smith both work; the work lands on the racks ------------------------------------
  console.log('after 30 min:', JSON.stringify(await skip(30)));
  console.log('after 2 more hours:', JSON.stringify(await skip(120)));
  const racks = await ev(() => BridgeHolm.stored());
  console.log('the racks:', JSON.stringify(racks));
  expect('oak planks from your bench and iron bars and pine planks from the smith', racks.oak_plank >= 3 && racks.iron_bar >= 3 && racks.plank >= 15);
  console.log('summary:', JSON.stringify(await ev(() => { const s = BridgeWorkshop.summary(); return { line: s.line, made: s.made, idle: s.idle, jobs: s.jobs.length, log: s.log.map(l => l.t) }; })));

  // ---- a swivel gun, made by the smith; the racks to your pack -----------------------------------------------------------
  console.log('queue a swivel gun:', JSON.stringify(await ev(() => BridgeWorkshop.queue('swivel').ok)));
  console.log('an hour on:', JSON.stringify(await skip(60)));
  await ev(() => BridgeWorkshop.open()); await wait(300);
  await row(/The store/); await wait(300);
  console.log('the store:', (await dialog()).slice(0, 400));
  await p.screenshot({ path: SHOTS + '/workshop_store.png' });
  await row(/Swivel Gun/); await wait(300);
  console.log('took it:', (await dialog()).slice(0, 80), '· swivel in pack', await ev(() => BridgeInventory.getCount('part_swivel')));
  expect('a swivel gun you made, in your pack', await ev(() => BridgeInventory.getCount('part_swivel') === 1));
  await shut();

  // ---- plans: one bought from Agnes Rook, one taught by Mira for a favour, and the Plans page --------------------------
  await ev(() => BridgeWorkshop.shop('wright', { id: 'wright', name: 'Agnes Rook' }, 'I SELL WHAT\'S IN MY HEAD.'));
  await wait(300);
  await row(/Plan: Long Nine/); await wait(500);
  console.log('Agnes:', (await dialog()).slice(0, 200));
  expect('the long nine learnt', await ev(() => BridgeWorkshop.known('long_nine')));
  await ev(() => BridgeWorkshop.shop('mira', { id: 'mira', name: 'Mira Quell' }, 'THE CRYSTAL SAILS I TEACH. FOR A FAVOUR.'));
  await wait(300);
  await row(/Teach me/); await wait(500);
  console.log('Mira:', (await dialog()).slice(0, 220));
  expect('crystal-weave sails taught for four sapphire crystals', await ev(() => BridgeWorkshop.known('crystal_sails') && BridgeInventory.getCount('sapphire_crystal') === 0));
  await ev(() => BridgeWorkshop.open()); await wait(300);
  await row(/Plans/); await wait(300);
  await p.screenshot({ path: SHOTS + '/workshop_plans.png' });
  await shut();

  // ---- a found plan: read it and it's learnt ---------------------------------------------------------------------------
  await ev(() => BridgeInventory.addItem('plan_ironwood', 1));
  await ev(() => BridgeInventory.useItem('plan_ironwood'));
  expect('the ironwood plan read and learnt', await ev(() => BridgeWorkshop.known('ironwood') && !BridgeInventory.getCount('plan_ironwood')));

  // ---- the holm's own ledger has a line for it ------------------------------------------------------------------------
  await ev(() => BridgeHolm.ledger()); await wait(300);
  console.log('the holm\'s ledger:', (await dialog()).slice(0, 420));
  expect('the holm\'s ledger shows the workshop at work', /The workshop/.test(await dialog()));
  await shut();

  // ---- what they all look like: every material, part and plan's icon ---------------------------------------------------
  await ev(() => {
    const ids = Object.keys(BridgeItems.all()).filter(id => /^(pine_log|oak_log|plank|oak_plank|copper_ore|iron_bar|copper_sheet|flax|seed_flax|rope|pitch|sailcloth|glass|powder|moonglass|greenheart_rod|prospector_pick)$|^part_|^plan_/.test(id));
    const d = document.createElement('div'); d.id = 'icon-sheet';
    d.style.cssText = 'position:fixed;inset:40px;z-index:99999;background:#e8dcc0;color:#2a1a10;display:flex;flex-wrap:wrap;gap:10px;padding:16px;align-content:flex-start;font:11px monospace';
    ids.forEach(id => { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; BridgeItems.get(id).draw(g, 0, 0, 48);
      const w = document.createElement('div'); w.style.cssText = 'width:96px;text-align:center'; w.appendChild(c); w.appendChild(document.createElement('br')); w.appendChild(document.createTextNode(BridgeItems.get(id).name)); d.appendChild(w); });
    const f = document.createElement('canvas'); f.width = 128; f.height = 128; const fg = f.getContext('2d'); fg.imageSmoothingEnabled = false;
    fg.drawImage(BridgeFarm._sprite('flax', 3), 0, 0, 64, 128); fg.drawImage(BridgeFarm._sprite('flax', 4), 64, 0, 64, 128);
    const fw = document.createElement('div'); fw.style.cssText = 'width:128px;text-align:center;background:#68442a'; fw.appendChild(f); d.appendChild(fw);
    document.body.appendChild(d);
  });
  await wait(300);
  await p.screenshot({ path: SHOTS + '/workshop_icons.png' });
  await ev(() => document.getElementById('icon-sheet').remove());
  console.log('salvage at sea:', JSON.stringify(await ev(() => [0.5, 0.55, 0.97].map(r => BridgeWorkshop.salvage(r)))));
  console.log('materials in the Collection:', await ev(() => BridgeCodex.total()));

  // ---- the ledger: the workshop under your places, its smith under staff ------------------------------------------------
  await ev(() => BridgeWorkshop.queue('planks', 2));
  await ev(() => BridgeMenu.open('ledger')); await wait(800);
  const lg = await ev(() => [...document.querySelectorAll('.lg-row')].map(r => r.innerText.replace(/\n+/g, ' ')).filter(t => /workshop|smith|Saw|forge/i.test(t)));
  console.log('ledger:', JSON.stringify(lg).slice(0, 600));
  expect('the ledger shows the workshop and its smith', lg.some(t => /The workshop on/.test(t)) && lg.some(t => /apprentice smith at the workshop/i.test(t)));
  await ev(() => { const s = [...document.querySelectorAll('.jn-sec')].find(x => /Your places/.test(x.textContent)); if (s) s.scrollIntoView(); });
  await wait(300);
  await p.screenshot({ path: SHOTS + '/workshop_ledger.png' });
  await ev(() => BridgeMenu.close());

  // ---- a harbourmaster fits the swivel gun you made, for the yard's labour ----------------------------------------------
  await ev(() => { const s = BridgeFleet.get('c2'); s.at = 'lumar'; BridgeFleet.save(); });
  await go('lumar'); await wait(1500);
  await ev(() => BridgeHarbour.open('lumar')); await wait(400);
  await row(/Fit out/); await wait(300);
  await row(/Swift/); await wait(300);
  console.log('fit out:', (await dialog()).slice(0, 400));
  await p.screenshot({ path: SHOTS + '/workshop_fitout.png' });
  const c0 = await ev(() => window._coins);
  await row(/your own/); await wait(300);
  await btn(/Mount it/); await wait(600);
  const fitted = await ev(() => ({ guns: BridgeFleet.get('c2').guns, part: BridgeInventory.getCount('part_swivel'), coins: window._coins }));
  console.log('mounted:', (await dialog()).slice(0, 120), JSON.stringify(fitted), '· labour', c0 - fitted.coins);
  expect('the swivel gun mounted on the Swift for the labour only', fitted.guns.indexOf('swivel') >= 0 && fitted.part === 0 && c0 - fitted.coins < 180);
  await shut();

  // ---- a crafted-only fitting replaces what it betters ------------------------------------------------------------------
  console.log('ironwood over oak:', JSON.stringify(await ev(() => { const s = BridgeFleet.get('c2'); s.fits = ['oak']; const r = BridgeFleet.mount('c2', 'ironwood'); return [r.ok, s.fits, BridgeFleet.canFit(s, 'oak'), BridgeFleet.effective(s).hull]; })));
  // flax seed at the seed stall
  await go('verdance'); await wait(1500);
  console.log('seed stall sells:', JSON.stringify(await ev(() => (BridgeWorld.getWorld().interactions.find(i => i.label === 'SEED STALL') || {}).items.map(x => x.id))));
  expect('flax seed at the seed stall', await ev(() => (BridgeWorld.getWorld().interactions.find(i => i.label === 'SEED STALL') || { items: [] }).items.some(x => x.id === 'seed_flax')));
  console.log('errors:', errors);
  await b.close();
})();
