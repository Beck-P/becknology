// The Wayfarer grown longer (js/wayfarer.js, js/galley.js, js/worlds/wayfarer.js): the bridge's door aft onto the
// passage, its bays sealed, a bay that won't be fitted with nobody aboard, a crew member hired and the galley fitted (the
// Chandler's list, the bay's door now a door), into the galley and mess at breakfast by the ship's clock, Dorrie at the
// pass: breakfast (more energy, on the bars, the chip), broth, something to take, a fish for the pot and the next meal's
// special, the menu; the galley dark at night with bread and cheese under a cloth. node world/wayfarer.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && !/supabase|\/api\//.test(r.url())) console.log('http', r.status(), r.url().replace(/^https?:\/\/[^/]+/, '')); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); });
  // 13:00 ET: the ship's day began at noon, so her clock reads 06:00 — breakfast
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 20000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', at ? { worldId: w, spawn: at } : { worldId: w }); r(); })), [w, at]);
  const text = () => ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none');
  const flat = (t) => t.replace(/\n+/g, ' | ');
  const close = async () => { if (await ev(() => !!document.querySelector('.world-dialog'))) await p.keyboard.press('Escape'); await wait(400); };   // Esc with nothing open leaves the room
  const stand = async (x, y, facing) => {
    await ev(([x, y, f]) => { BridgeCharacter.init(x, y); BridgeCharacter.setFacing(f); }, [x, y, facing]);
    await wait(400);
    return ev(() => { const t = BridgeInteractions.getTarget(); return t ? t.label : 'nothing'; });
  };
  const row = (re) => ev((s) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => new RegExp(s).test(x.textContent)); if (!r) return 'no row'; r.click(); return 'ok'; }, re.source);
  const btn = (re) => ev((s) => { const r = [...document.querySelectorAll('.world-dialog .wd-opt')].find(x => new RegExp(s).test(x.textContent)); if (!r) return 'no button'; r.click(); return 'ok'; }, re.source);
  const quiet = () => ev(() => document.querySelectorAll('.quest-toast, #quest-toast').forEach(x => x.remove()));

  console.log('ship\'s clock:', JSON.stringify(await ev(() => BridgeWayfarer.clock())));
  // the bridge's door aft
  await go('bridge'); await wait(1500);
  console.log('the passage door:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.target === 'ship-passage').map(i => [i.x, i.y]))));
  console.log('at the door, target:', await stand(13, 12, 'down'));
  await p.keyboard.press('e'); await wait(2500);
  console.log('through the door:', JSON.stringify(await ev(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY()])));
  await quiet();
  console.log('bays:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.module).map(i => i.module + ':' + i.type))));
  await p.screenshot({ path: SHOTS + '/wayfarer_passage_sealed.png' });

  // a sealed bay: no crew, no galley
  console.log('at bay 1, target:', await stand(5, 4, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('bay 1:', flat(await text()).slice(0, 200));
  console.log('fit with no crew:', JSON.stringify(await ev(() => BridgeWayfarer.fit('galley'))));
  await close();

  // a crew member aboard, then the Chandler's list
  await ev(async () => { const ok = BridgePeople.all().okafor; await BridgeCrew.hire(Object.assign({ id: 'okafor' }, ok)); });
  await ev(() => BridgeWayfarer.shop()); await wait(800);
  console.log('the modules:', flat(await text()).slice(0, 360));
  console.log('ship art drawn:', await ev(() => { const c = document.querySelector('.world-dialog .wd-art'); return c ? c.width + 'x' + c.height : 'none'; }));
  await p.screenshot({ path: SHOTS + '/wayfarer_modules.png' });
  console.log('pick galley:', await row(/Galley/)); await wait(600);
  console.log('confirm:', flat(await text()).slice(0, 160));
  console.log('fit it:', await btn(/Fit it/)); await wait(1200);
  console.log('after:', flat(await text()).slice(0, 160));
  await close(); await quiet();
  console.log('coins left:', await ev(() => window._coins), 'fitted:', JSON.stringify(await ev(() => BridgeWayfarer.list())), 'key:', await ev(() => BridgeWayfarer.key()));
  console.log('bay layers:', JSON.stringify(await ev(() => BridgeScene.getLayers ? BridgeScene.getLayers('ship-passage') : 'n/a')));
  await go('ship-passage', { x: 6, y: 5 }); await wait(1500); await quiet();
  console.log('bays now:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.module).map(i => i.module + ':' + i.type))));
  await p.screenshot({ path: SHOTS + '/wayfarer_passage_fitted.png' });
  console.log('the watch bill:', await stand(1, 5, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('watch bill:', flat(await text()).slice(0, 200));
  await close();
  console.log('scuttlebutt:', await stand(8, 5, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('the butt:', flat(await text()).slice(0, 160));
  await close();
  console.log('the hatch:', await stand(25, 6, 'right'));
  await p.keyboard.press('e'); await wait(800);
  console.log('below:', flat(await text()).slice(0, 160));
  await close();

  // into the galley
  console.log('at the galley door:', await stand(6, 4, 'up'));
  await p.keyboard.press('e'); await wait(2500); await quiet();
  console.log('in:', JSON.stringify(await ev(() => [BridgeWorld.getWorldId(), BridgeWorld.getWorld().name, BridgeCharacter.getX(), BridgeCharacter.getY()])));
  console.log('Dorrie:', JSON.stringify(await ev(() => BridgeWorld.getWorld().scene.actors.map(a => a.sheet + '@' + a.x + ',' + a.y))));
  await wait(800);
  await p.screenshot({ path: SHOTS + '/wayfarer_galley.png' });
  console.log('the menu:', await stand(12, 5, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('menu:', flat(await text()).slice(0, 260));
  await close();

  const st0 = await ev(() => BridgeInventory.getStats());
  console.log('at the pass:', await stand(9, 6, 'left'));
  await p.keyboard.press('e'); await wait(900);
  console.log('Dorrie says:', flat(await text()).slice(0, 300));
  console.log('her face:', await ev(() => !!document.querySelector('.world-dialog .wd-portrait')));
  await p.screenshot({ path: SHOTS + '/wayfarer_cook.png' });
  console.log('breakfast:', await row(/Have your breakfast/)); await wait(800);
  const st1 = await ev(() => BridgeInventory.getStats());
  console.log('energy before', st0.energy + '/' + st0.maxEnergy, 'after', st1.energy + '/' + st1.maxEnergy, 'fed:', JSON.stringify(await ev(() => { const f = BridgeGalley.fed(); return f && [f.name, f.energy, Math.round((f.until - Date.now()) / 60000)]; })));
  console.log('chip:', await ev(() => (document.getElementById('wf-fed') || {}).textContent || 'none'));
  await p.keyboard.press('e'); await wait(800);
  console.log('again:', flat(await text()).slice(0, 120));
  console.log('broth:', await row(/broth/)); await wait(800);
  console.log('after broth:', flat(await text()).slice(0, 100));
  console.log('to take:', await row(/take with you/)); await wait(800);
  console.log('stew in pack:', await ev(() => BridgeInventory.getCount('bowl_of_stew')));
  await close();
  // a fish for the pot: the next meal's special
  await ev(() => BridgeInventory.addItem('silverfin', 1));
  await p.keyboard.press('e'); await wait(800);
  console.log('fish:', await row(/fish for the pot/)); await wait(800);
  console.log('after the fish:', flat(await text()).slice(0, 160), '| special:', await ev(() => BridgeGalley.special()), '| silverfin left:', await ev(() => BridgeInventory.getCount('silverfin')));
  await close();

  // dinner, an hour of real time later (ship 12:00): the special with it
  const sp0 = await ev(() => BridgeGear.speed());
  await ev(() => BridgeClock._at('2026-10-16T14:00'));
  console.log('ship\'s clock now:', await ev(() => BridgeWayfarer.clock().text), 'meal:', await ev(() => (BridgeGalley.mealNow() || {}).name));
  await p.keyboard.press('e'); await wait(800);
  console.log('dinner:', await row(/Have your dinner/)); await wait(800);
  console.log('speed', sp0.toFixed(3), '->', (await ev(() => BridgeGear.speed())).toFixed(3), 'fed:', JSON.stringify(await ev(() => { const f = BridgeGalley.fed(); return f && [f.name, f.hp, f.special]; })));
  await close();
  // night: the galley's dark
  await ev(() => BridgeClock._at('2026-10-16T15:50'));
  console.log('ship\'s clock now:', await ev(() => BridgeWayfarer.clock().text));
  console.log('at the pass at night:', await stand(9, 6, 'left'));
  await p.keyboard.press('e'); await wait(800);
  console.log('at night:', flat(await text()).slice(0, 220));
  await close();
  // after supper (ship 20:00): the crew round the card table, a hand of Eights for coins
  await ev(() => BridgeClock._at('2026-10-16T15:20'));
  await wait(1500);
  console.log('ship\'s clock now:', await ev(() => BridgeWayfarer.clock().text), '| crew aboard:', JSON.stringify(await ev(() => BridgeAboard.roster().map(r => r.name + ': ' + r.doing + ' (' + r.where + ')'))));
  console.log('at the cards:', JSON.stringify(await ev(() => BridgeAboard.atCards())), '| drawn here:', JSON.stringify(await ev(() => BridgeAboard._here().map(h => h.id + (h.st ? '@' + h.st.x + ',' + h.st.y + (h.st.pose ? ' ' + h.st.pose : '') : ' gone')))));
  console.log('the card table:', await stand(17, 10, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('cards:', flat(await text()).slice(0, 200));
  const c0 = await ev(() => window._coins);
  console.log('sit in:', await row(/Sit in for coins/)); await wait(1200);
  console.log('dealt:', JSON.stringify(await ev(() => { const g = BridgeEights._g(); return g && { players: g.players.map(p => p.name + ':' + p.hand.length), top: g.pile[g.pile.length - 1], pot: g.pot }; })), '| seated:', await ev(() => BridgeCharacter.isSeated()));
  await p.screenshot({ path: SHOTS + '/wayfarer_eights.png' });
  for (let i = 0; i < 400; i++) {                       // play it out: lay the first card that goes (an eight calls hearts), else draw, else pass
    const st = await ev(() => { const g = BridgeEights._g(); if (!g) return 'gone'; if (g.over) return 'over'; if (g.turn !== 0) return 'wait';
      const c = g.players[0].hand.find(x => BridgeEights._fits(x)); if (c) { BridgeEights._lay(c, 'h'); return 'lay ' + c; } BridgeEights._act(g.drew ? 'pass' : 'draw'); return g.drew ? 'pass' : 'draw'; });
    if (st === 'over' || st === 'gone') break;
    await wait(st === 'wait' ? 400 : 120);
  }
  const res = await ev(() => { const g = BridgeEights._g(); return g && g.over ? { winner: g.players[g.over.winner].name, pot: g.pot, log: g.log.map(l => (l.who ? (l.who.ai ? l.who.name : 'You') + ': ' : '') + l.text) } : null; });
  await wait(600);
  console.log('cards over:', JSON.stringify(res), '| coins', c0, '->', await ev(() => window._coins));
  await p.screenshot({ path: SHOTS + '/wayfarer_eights_over.png' });
  await ev(() => BridgeEights._close()); await wait(300);
  // the crew walking: back to the bridge for the first watch's end
  await go('bridge'); await wait(1500);
  console.log('bridge at 20:00:', JSON.stringify(await ev(() => BridgeAboard._here().map(h => h.id + (h.st ? '@' + Math.round(h.st.x * 10) / 10 + ',' + Math.round(h.st.y * 10) / 10 + (h.st.walk != null ? ' walking' : '') : ' gone')))));
  await ev(() => BridgeClock._at('2026-10-16T17:00'));          // the next ship's day at 06:00: up from below to breakfast
  await go('ship-passage', { x: 3, y: 6 }); await wait(500);
  const seen = [];
  for (let i = 0; i < 24; i++) {
    const h = await ev(() => BridgeAboard._here().filter(h => h.st).map(h => h.id + '@' + Math.round(h.st.x) + ',' + Math.round(h.st.y) + (h.st.walk != null ? '~' : '')).join(' '));
    if (h) seen.push(i * 10 + 's ' + h);
    await ev(() => BridgeClock._at(BridgeClock.now() + 10000)); await wait(250);
  }
  console.log('passage from 06:00:', seen.join(' | ') || 'nobody');
  await p.screenshot({ path: SHOTS + '/wayfarer_passage_walk.png' });
  // the observatory and the greenhouse deck: a second hand aboard, both fitted
  await ev(async () => { const pp = BridgePeople.all().pip; await BridgeCrew.hire(Object.assign({ id: 'pip' }, pp)); });
  console.log('fit observatory:', JSON.stringify(await ev(() => BridgeWayfarer.fit('observatory'))), 'greenhouse:', JSON.stringify(await ev(() => BridgeWayfarer.fit('greenhouse'))));
  console.log('fitted:', JSON.stringify(await ev(() => BridgeWayfarer.list())), 'key:', await ev(() => BridgeWayfarer.key()), 'sprite:', JSON.stringify(await ev(() => { const s = BridgeCine.ship(); return s && [s.name, s.w, s.h]; })));
  await ev(() => BridgeClock._at('2026-10-16T13:30'));            // ship 09:00, the forenoon
  await go('ship-passage', { x: 12, y: 5 }); await wait(1200); await quiet();
  console.log('bays now:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.module).map(i => i.module + ':' + i.type))));
  console.log('at bay 2:', await stand(12, 4, 'up'));
  await p.keyboard.press('e'); await wait(2500); await quiet();
  console.log('in:', JSON.stringify(await ev(() => [BridgeWorld.getWorldId(), BridgeWorld.getWorld().name])));
  await wait(600);
  await p.screenshot({ path: SHOTS + '/wayfarer_observatory.png' });
  console.log('the telescope:', await stand(8, 8, 'up'));
  await p.keyboard.press('e'); await wait(1500);
  console.log('tonight:', await ev(() => BridgeObservatory.tonight().name), '| view open:', await ev(() => !!document.querySelector('#view-panel.visible, #view-panel.open, #view-panel:not([hidden])')), '| logged:', JSON.stringify(await ev(() => BridgeObservatory.seen())), '| coins', await ev(() => window._coins));
  await p.screenshot({ path: SHOTS + '/wayfarer_telescope.png' });
  await p.keyboard.press('Escape'); await wait(800);
  console.log('the star chart:', await stand(2, 9, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('chart:', flat(await text()).slice(0, 220));
  await close();
  console.log('the orrery:', await stand(14, 9, 'right'));
  await p.keyboard.press('e'); await wait(800);
  console.log('orrery:', flat(await text()).slice(0, 160));
  await close();
  console.log('the log:', await stand(13, 5, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('log:', flat(await text()).slice(0, 200));
  await close();

  await go('ship-greenhouse'); await wait(1500); await quiet();
  console.log('greenhouse picks:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'forage').map(i => i.label + '@' + i.x + ',' + i.y + ':' + i.item))));
  await p.screenshot({ path: SHOTS + '/wayfarer_greenhouse.png' });
  console.log('the water butt:', await stand(10, 5, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('water:', flat(await text()).slice(0, 140), '| watered:', await ev(() => BridgeGreenhouse.watered()));
  await close();
  console.log('the salad bed:', await stand(8, 5, 'down'));
  const h0 = await ev(() => BridgeInventory.getCount('salad_greens'));
  await p.keyboard.press('e'); await wait(2500);
  console.log('salad greens', h0, '->', await ev(() => BridgeInventory.getCount('salad_greens')), '| greens for the galley:', await ev(() => !!BridgeGalley._state().greens));
  console.log('the bench:', await stand(8, 5, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('bench:', flat(await text()).slice(0, 260));
  await close();
  console.log('crew at 09:00:', JSON.stringify(await ev(() => BridgeAboard.roster().map(r => r.name + ': ' + r.doing + ' (' + r.where + ')'))));
  await b.close();
})();
