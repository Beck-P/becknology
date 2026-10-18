// Sylvara's new places (workstream F) played: the ways between them (Elderglade's and the Heartwood Hall's joins, every
// exit landing on open ground), Aerin's range (a round of ten, the score, the coins), a rope arrow rigging the Owl's Rest
// zip line and riding it, a fire arrow lighting a high lantern, an arrow letting the nook's ladder down and the carved box
// in it, Corin's bows and Merrow's stall, brewing a Hearthfire Draught with Mirelle and drinking it (the cold can't touch
// you), a Swiftwater Tonic (a quicker step), night eyes, the river shrine's blessing, the Moonwell's source; and a shot of
// every new place at noon, golden hour and night (OUT/sylvara_<place>_<hour>.png). node sylvara_places.js OUT
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 760 } });
  await ctx.addInitScript(() => { ['bridge_bows', 'bridge_brewing', 'bridge_sylvara', 'bridge_canoe_seen'].forEach(k => localStorage.removeItem(k)); });
  const p = await ctx.newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase|api\/talk/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/?at=2026-10-17T12:30'); await p.waitForTimeout(2500);   // midday on Sylvara: the range is open
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'ALYSSA', suit_color: 'purple' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
    window._coins = 1e6; BridgeProgression.awardCoins = n => { window._coins += n; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = n => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); }; });
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]); await p.waitForTimeout(3000); };
  const shut = async () => {
    for (let i = 0; i < 3; i++) {
      const open = await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-body'));
      if (!open) return;
      const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close|done/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
      if (!hit) await p.keyboard.press('Escape');
      await p.waitForTimeout(500);
    }
  };
  const stand = (x, y, f) => p.evaluate(([x, y, f]) => { BridgeCharacter.init(x, y); BridgeCharacter.setFacing(f); }, [x, y, f]);
  const press = async () => { await p.keyboard.press('e'); await p.waitForTimeout(1400); };
  const text = () => p.evaluate(() => (document.querySelector('#world-overlay') || {}).innerText || '');
  const pick = async (re) => { const ok = await p.evaluate((s) => { const r = new RegExp(s, 'i'); const b = [...document.querySelectorAll('#world-overlay .wd-opt, #world-overlay button, #world-overlay .wd-sell-row')].find(e => r.test(e.textContent)); if (b) { b.click(); return true; } return false; }, re.source); await p.waitForTimeout(900); return ok; };
  const give = (id, n) => p.evaluate(([id, n]) => BridgeInventory.addItem(id, n), [id, n]);
  const select = (id) => p.evaluate((id) => { for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === id) return true; } return false; }, id);
  const shoot = async (ms) => { await p.evaluate(() => { BridgeArms.keyDown(); BridgeInventory.useSelected(); }); await p.waitForTimeout(ms); await p.evaluate(() => BridgeArms.keyUp()); await p.waitForTimeout(900); };
  const inter = (label) => p.evaluate((l) => BridgeWorld.getWorld().interactions.filter(i => i.label === l).map(i => [i.x, i.y]), label);
  const walkable = (w, x, y) => p.evaluate(([w, x, y]) => fetch('/bridge/assets/worlds/' + w + '.json').then(r => r.json()).then(d => d.collisions[y] && d.collisions[y][x] === 0), [w, x, y]);

  const isOpen = (w) => p.evaluate((w) => BridgeSylvara.isOpen(w), w);   // a place goes live as its render ships (BridgeSylvara.OPEN)
  const live = async (ws) => { for (const w of ws) if (!await isOpen(w)) { console.log('skipped (not open yet):', w); return false; } return true; };

  // ---- the ways between them ----------------------------------------------------------------------------------------
  const WORLDS = ['sylvara-roots', 'sylvara-boughs', 'sylvara-crown', 'sylvara-tavern', 'sylvara-river', 'sylvara-falls', 'sylvara-fallcave', 'sylvara-lake', 'sylvara-deepwood'];
  let exits = 0;
  for (const w of WORLDS) {
    const d = await p.evaluate((w) => fetch('/bridge/assets/worlds/' + w + '.json').then(r => r.json()), w);
    for (const it of d.interactions.filter(i => i.type === 'enter_world' || (i.type === 'sylvan' && i.kind === 'lift'))) {
      exits++;
      if (!it.spawn) continue;
      if (!await walkable(it.target, it.spawn[0], it.spawn[1])) fail(w + ' → ' + it.target + ' lands on a solid tile ' + it.spawn);
    }
  }
  await go('sylvara', [40, 18]);
  const joins = await p.evaluate(() => BridgeWorld.getWorld().interactions.filter(i => i._join).map(i => i.label));
  const wantJoins = (await isOpen('sylvara-roots') ? 1 : 0) + (await isOpen('sylvara-river') ? 1 : 0);
  if (joins.length !== wantJoins) fail('Elderglade\'s ways out: ' + joins);
  await go('sylvara-hall', [2, 8]);
  const hall = await p.evaluate(() => BridgeWorld.getWorld().interactions.filter(i => i._join).map(i => i.label));
  if (await isOpen('sylvara-crown') && !hall.includes('THE HEARTWOOD STAIR')) fail('no stair up from the Heartwood Hall');
  console.log('ways: exits checked', exits, 'elderglade', joins.join(', '), 'hall', hall.join(', '));

  // ---- Corin's bows, Merrow's stall ------------------------------------------------------------------------------------
  await go('sylvara-roots', [12, 9]);
  const corin = (await inter('BOWYER'))[0];
  await stand(corin[0], corin[1] + 1, 'up'); await press();
  if (!await pick(/your bows/)) fail('no "Your bows" topic on Corin');
  const shop = await text();
  if (!/ELVEN BOW|Elven Bow/i.test(shop)) fail('Corin\'s shop has no bow: ' + shop.slice(0, 120));
  await shut();
  console.log('shops: corin', /Elven Bow/i.test(shop));

  // ---- Aerin's range: ten arrows -------------------------------------------------------------------------------------
  await give('elven_bow', 1); await select('elven_bow');
  const line = await p.evaluate(() => { const R = BridgeWorld.getWorld().range; return R ? R.line : null; });
  if (!line) fail('no range in the Rootmarket');
  await stand(40, line[2], 'up'); await press();
  if (!await pick(/shoot a round/)) fail('no "Shoot a round"');
  await shut();
  const started = await p.evaluate(() => !!(BridgeBows._range() && BridgeBows._range().on));
  if (!started) fail('the round didn\'t start');
  for (let i = 0; i < 10; i++) { await shoot(950); }
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({ on: !!(BridgeBows._range() && BridgeBows._range().on), best: BridgeBows._st().best, rounds: BridgeBows._st().rounds }));
  if (after.on || after.rounds !== 1) fail('the round didn\'t finish: ' + JSON.stringify(after));
  await p.screenshot({ path: OUT + '/sylvara_range.png' });
  await shut();
  console.log('range: rounds', after.rounds, 'best', after.best, 'coins', await p.evaluate(() => window._coins - 1e6));

  if (await live(['sylvara-boughs'])) {
  // ---- the Boughs: a fire arrow lights a high lantern; an arrow lets the ladder down; the nook's box; the zip line ---------------
  await go('sylvara-boughs', [21, 26]);
  await give('fire_arrow', 2); await select('fire_arrow');
  const L0 = await p.evaluate(() => BridgeWorld.getWorld().lanterns[0]);
  await stand(L0.at[0], L0.at[1] + 3, 'up'); await shoot(500);
  if (!await p.evaluate((id) => BridgeBows.isLit(id), L0.id)) fail('the fire arrow didn\'t light ' + L0.id);
  await select('elven_bow');
  const SW = await p.evaluate(() => BridgeWorld.getWorld().switches[0]);
  await stand(SW.at[0], SW.at[1] - 2, 'down'); await shoot(400);
  const opened = await p.evaluate((sw) => sw.opens.every(c => BridgeWorld.getWorld().collisions[c[1]][c[0]] === 0), SW);
  if (!opened) fail('the switch didn\'t let the ladder down');
  const box = (await inter('CARVED BOX'))[0];
  await stand(box[0], box[1], 'up'); await press();
  if (!/COINS/.test(await text())) fail('the nook\'s box gave nothing');
  await shut();
  await give('rope_arrow', 1); await select('rope_arrow');
  const Z = await p.evaluate(() => BridgeWorld.getWorld().zips[0]);
  await stand(Z.from[0], Z.from[1], 'right'); await shoot(1100);
  if (!await p.evaluate(() => BridgeWorld.getWorld().interactions.some(i => i.kind === 'zip'))) fail('the rope arrow didn\'t rig the zip line');
  await stand(Z.from[0], Z.from[1], 'right'); await press();
  await p.waitForTimeout(1600);
  await p.screenshot({ path: OUT + '/sylvara_zip.png' });
  await p.waitForTimeout(2600);
  const at = await p.evaluate(() => [BridgeCharacter.getX(), BridgeCharacter.getY()]);
  if (at[0] !== Z.to[0] || at[1] !== Z.to[1]) fail('the zip line left you at ' + at + ', not ' + Z.to);
  console.log('boughs: lantern lit, ladder down, box opened, zip rigged and ridden to', at.join(','));
  }

  // ---- brewing with Mirelle, and what the potions do ------------------------------------------------------------------
  await go('sylvara', [34, 13]);
  for (const [id, n] of [['emberroot', 1], ['roseite', 1], ['honey', 2], ['windthistle', 1], ['owlmoss', 1], ['moonstone', 1]]) await give(id, n);
  const mirelle = (await inter('HERBALIST'))[0];
  await stand(mirelle[0], mirelle[1] + 1, 'up'); await press();
  if (!await pick(/brew with me/)) fail('no "Brew with me" on Mirelle');
  if (!await pick(/Hearthfire/)) fail('no Hearthfire row');
  await shut();
  if (await p.evaluate(() => BridgeInventory.getCount('hearthfire_draught')) !== 1) fail('no Hearthfire Draught brewed');
  await p.evaluate(() => { BridgeBrewing.open(); }); await p.waitForTimeout(600); await pick(/Swiftwater/); await shut();
  await p.evaluate(() => { BridgeBrewing.open(); }); await p.waitForTimeout(600); await pick(/Owl/); await shut();
  const before = await p.evaluate(() => ({ cold: BridgeGear.has('cold'), speed: BridgeMagic.speed(), eyes: BridgeGear.has('night_eyes') }));
  await p.evaluate(() => { ['hearthfire_draught', 'swiftwater_tonic', 'owl_eye_tincture'].forEach(id => { for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === id) { BridgeInventory.useSelected(); break; } } }); });
  const potions = await p.evaluate(() => ({ cold: BridgeGear.has('cold'), speed: BridgeMagic.speed(), eyes: BridgeGear.has('night_eyes') }));
  if (before.cold || !potions.cold) fail('the Hearthfire Draught didn\'t keep the cold off');
  if (!(potions.speed > before.speed)) fail('the Swiftwater Tonic didn\'t quicken you');
  if (!potions.eyes) fail('no night eyes');
  console.log('brewing: before', JSON.stringify(before), 'after', JSON.stringify(potions));

  if (await live(['sylvara-river', 'sylvara-lake'])) {
  // ---- the river shrine; the Moonwell's source -------------------------------------------------------------------------
  await go('sylvara-river', [24, 1]);
  await give('moonpetal', 1);
  const shrine = await p.evaluate(() => BridgeWorld.getWorld().interactions.find(i => i.kind === 'shrine'));
  await p.evaluate((s) => BridgeSylvara.use(s), shrine); await p.waitForTimeout(800); await shut();
  if (!await p.evaluate(() => BridgeBrewing.active('river'))) fail('no blessing from the shrine');
  await go('sylvara-lake', [21, 1]);
  await p.evaluate(() => BridgeInventory.takeDamage && BridgeInventory.takeDamage(40));
  const src = await p.evaluate(() => BridgeWorld.getWorld().interactions.find(i => i.kind === 'source'));
  await p.evaluate((s) => BridgeSylvara.use(s), src); await p.waitForTimeout(800); await shut();
  const hp = await p.evaluate(() => BridgeInventory.getStats());
  if (hp.hp < hp.maxHP) fail('the source didn\'t fill you up');
  console.log('river shrine blessing', true, 'source hp', hp.hp + '/' + hp.maxHP);
  }

  // ---- a shot of every place by the hour ---------------------------------------------------------------------------------
  const SPOTS = { 'sylvara-roots': [22, 24], 'sylvara-boughs': [21, 26], 'sylvara-crown': [12, 18], 'sylvara-river': [24, 1], 'sylvara-falls': [19, 23],
                  'sylvara-lake': [26, 30], 'sylvara-deepwood': [20, 24], 'sylvara-tavern': [12, 12], 'sylvara-fallcave': [9, 12] };
  for (const [w, at] of Object.entries(SPOTS)) {
    if (!await isOpen(w)) continue;
    await go(w, at);
    for (const hour of [12.4, 17.9, 1]) {
      await p.evaluate((h) => { if (typeof BridgeLit !== 'undefined' && BridgeLit._force) BridgeLit._force({ hour: h, season: 'summer', weather: 'clear' }); }, hour);
      await p.waitForTimeout(1600);
      await p.screenshot({ path: OUT + '/sylvara_' + w.replace('sylvara-', '') + '_' + hour + '.png' });
    }
  }
  console.log('errors:', errors);
  await b.close();
})();
