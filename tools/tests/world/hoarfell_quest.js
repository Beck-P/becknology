const { chromium } = require('playwright');
// The Last Monk (Hoarfell's first quest) played from rumour to letter, out of order where order isn't needed, and the
// hidden valley's loot put to use (spec-deeper-worlds H1, H2). Checks: Bram's gossip puts it in the journal as a rumour;
// Anselm starts it and his topics open as it moves; the lamps first (refused without a bow, then three fire arrows
// taken and the bow kept), the bell tried too early (not found), the spring before the fears (two golem cores), the
// chorten refused with one phial and taken with three; the bell rings for him over the courtyard's cold ones and ends
// it; the letter. Then the monastery after: quiet by day with the hall a bed and the fountain a bath, the valley's
// yetis at the stair of an evening, the cold ones back at night; Anselm's tea. And the six drops: each one's card lists
// a use, and each is taken by whoever wants it (Maison Vautrin's furs, a yeti and a rime shell, Mirelle's sell topic,
// Morwen's, the Workshop's two recipes). Desktop, and the card and Anselm on a phone. Shots in OUT.
const OUT = process.argv[2] || require('path').join(__dirname, '..', 'shots');
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errors = 0;
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const run = async (vp, phone) => {
    const ctx = await b.newContext(phone ? { viewport: vp, isMobile: true, hasTouch: true } : { viewport: vp });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('PAGEERR', e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      ['bridge_quests', 'bridge_quest_meta', 'bridge_valley', 'bridge_alpine', 'bridge_gear', 'bridge_mail', 'bridge_people'].forEach(k => localStorage.removeItem(k));
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'blue' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
    });
    await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'blue' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
      // no coins to move in a test page, and nothing here should knock us out while we look about
      BridgeProgression.wagerCoins = () => Promise.resolve({ ok: true });
      BridgeInventory.takeDamage = () => {};
      for (let i = 0; i < 30; i++) BridgeInventory.removeItem(BridgeInventory.getAll && Object.keys(BridgeInventory.getAll())[0], 999);
    });
    return p;
  };
  const p = await run({ width: 1100, height: 800 });
  const go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]); await p.waitForTimeout(3000); };
  const shut = async () => {
    for (let i = 0; i < 3; i++) {
      const open = await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo, .chooser, #world-overlay [class*="dialog"]'));
      if (!open) break;
      const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close|not now|done/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
      if (!hit) await p.keyboard.press('Escape');
      await p.waitForTimeout(500);
    }
    await p.evaluate(() => { const k = document.getElementById('item-get'); if (k) k.click(); });
  };
  const at = (label) => p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); return i ? [i.x, i.y] : null; }, label);
  // use the interaction itself, as a press of E on it would
  const use = async (label) => { await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); BridgeCharacter.init(i.x, i.y + 1); BridgeInteractions.execute(i); }, label); await p.waitForTimeout(1200); };
  const said = async () => { await p.waitForFunction(() => !document.querySelector('.world-dialog.typing'), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(600); return p.evaluate(() => (document.querySelector('#world-overlay') || {}).innerText || ''); };
  const topics = () => p.evaluate(() => [...document.querySelectorAll('.wd-opt')].map(b => b.textContent + (b.classList.contains('nudge') ? '*' : '')));
  const pickTopic = async (re) => { const ok = await p.evaluate((s) => { const b = [...document.querySelectorAll('.wd-opt')].find(e => new RegExp(s).test(e.textContent)); if (b) b.click(); return !!b; }, re); await p.waitForTimeout(1500); return ok; };
  const has = (k) => p.evaluate((k) => BridgeQuests.has(k), k);
  const give = (id, n) => p.evaluate(([id, n]) => BridgeInventory.addItem(id, n), [id, n]);
  const count = (id) => p.evaluate((id) => BridgeInventory.getCount(id), id);
  const toast = () => p.evaluate(() => (document.querySelector('.quest-toast') || {}).innerText || '');
  const hostiles = () => p.evaluate(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile' && i._hp > 0).length);
  const time = (part) => p.evaluate((part) => {           // set the clock to the next time Hoarfell's monastery is in `part`
    const t0 = Date.now();
    for (let m = 0; m < 3 * 24 * 60; m += 5) { BridgeClock._at(t0 + m * 60000); if (BridgeValley.part('hoarfell-monastery') === part) return m; }
    return -1;
  }, part);

  // ---- the rumour, from Bram at the Refuge du Col ----
  await go('hoarfell-hut-col', [8, 9]);
  await use('BRAM');
  if (!await pickTopic('Heard anything')) fail('Bram has no Heard anything?');
  await shut(); await p.waitForTimeout(800);
  const rum = await p.evaluate(() => BridgeQuests.rumours());
  if (rum.indexOf('last-monk') < 0) fail('no rumour from Bram: ' + JSON.stringify(rum));
  console.log('rumours', rum.join(','));

  // ---- Anselm starts it ----
  await go('hoarfell-monastery', [22, 33]);
  if (!(await p.evaluate(() => BridgeQuests.startsHere('hoarfell-monastery')))['BROTHER ANSELM']) fail('no gold ! over Anselm');
  await use('BROTHER ANSELM');
  const t1 = await topics();
  if (t1[0] !== 'Why not go in?*') fail('Anselm\'s first topic: ' + t1[0]);
  if (!await has('last-monk/anselm')) fail('the quest didn\'t start on Anselm');
  await p.screenshot({ path: OUT + '/hq_anselm.png' });
  await shut();
  console.log('leads', JSON.stringify(await p.evaluate(() => BridgeQuests.leads('last-monk', 4))));

  // ---- the lamps first: three fire arrows, a bow ----
  await give('fire_arrow', 3);
  await use('THE HALL'); await shut();
  if (await has('last-monk/lamps')) fail('the lamps lit without a bow');
  if (!/You need a bow/.test(await toast())) fail('no toast saying a bow is needed: ' + await toast());
  if (await count('fire_arrow') !== 3) fail('arrows taken without lighting the lamps');
  await give('elven_bow', 1);
  await use('THE HALL');
  const lamps = await said();
  if (!/FIRST LAMP CATCHES/.test(lamps)) fail('no moment at the hall: ' + lamps.slice(0, 120));
  await shut();
  if (!await has('last-monk/lamps')) fail('the lamps clue not found');
  if (await count('fire_arrow') !== 0 || await count('elven_bow') !== 1) fail('arrows/bow after: ' + await count('fire_arrow') + '/' + await count('elven_bow'));

  // ---- the bell too early ----
  await use('THE BELL'); await shut();
  if (await has('last-monk/bell')) fail('the bell ended it before the fears and the spring');

  // ---- the spring before the fears ----
  await go('hoarfell-valley', [26, 19]);
  await give('golem_core', 2);
  await use('HOT SPRING');
  const spring = await said();
  if (!/GREY STONES/.test(spring)) fail('no moment at the spring: ' + spring.slice(0, 120));
  await shut();
  if (!await has('last-monk/spring') || await count('golem_core') !== 0) fail('the spring: ' + await has('last-monk/spring') + ' cores ' + await count('golem_core'));
  // ---- the chorten: one phial isn't enough ----
  await give('wraith_essence', 1);
  await use('CHORTEN'); await shut();
  if (await has('last-monk/fears')) fail('the fears laid with one phial');
  if (!/3 Wraith Essence \(you have 1\)/.test(await toast())) fail('the chorten\'s toast: ' + await toast());
  await give('wraith_essence', 2);
  await use('CHORTEN');
  const fears = await said();
  if (!/LESS WORRIED/.test(fears)) fail('no moment at the chorten: ' + fears.slice(0, 120));
  await shut();
  if (!await has('last-monk/fears') || await count('wraith_essence') !== 0) fail('the fears: ' + await has('last-monk/fears'));
  await p.screenshot({ path: OUT + '/hq_chorten.png' });

  // ---- the bell, over the cold ones (the courtyard isn't cleared) ----
  await time('day');
  await go('hoarfell-monastery', [22, 33]);
  await use('BROTHER ANSELM');
  const t2 = await topics();
  if (t2[0] !== 'The bell*') fail('Anselm\'s first topic before the bell: ' + t2[0]);
  await shut();
  const cold = await hostiles();
  if (!cold) fail('no cold ones in the courtyard to ring over');
  await use('THE BELL');
  const bell = await said();
  if (!/START TO SING/.test(bell) || !/GATE CRACKS/.test(bell)) fail('no moment at the bell: ' + bell.slice(0, 160));
  await p.screenshot({ path: OUT + '/hq_bell.png' });
  await shut(); await p.waitForTimeout(800);
  if (!await has('last-monk')) fail('The Last Monk not done');
  if (!(await p.evaluate(() => BridgeAlpine._save().bell))) fail('the bell didn\'t open the ice gate');
  const mail = await p.evaluate(() => BridgeTalk.checkMail().then(g => g.map(m => m.from + ': ' + String(m.text).slice(0, 30))));
  if (!mail.some(m => /anselm/i.test(m))) fail('no letter from Anselm: ' + JSON.stringify(mail));
  console.log('done', await has('last-monk'), 'with', cold, 'cold ones about; letters', JSON.stringify(mail));

  // ---- the monastery after ----
  await go('hoarfell-monastery', [22, 33]);
  const day = await p.evaluate(() => ({ cold: BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile').length,
    hall: BridgeWorld.getWorld().interactions.find(i => i.label === 'THE HALL'), fount: BridgeWorld.getWorld().interactions.find(i => i.label === 'FOUNTAIN'),
    yetis: BridgeWorld.getWorld().interactions.filter(i => i.type === 'yeti').length }));
  if (day.cold || day.yetis) fail('by day: ' + day.cold + ' cold ones, ' + day.yetis + ' yetis');
  if (day.hall.type !== 'vale' || !/REST/.test(day.hall.prompt) || day.fount.type !== 'vale' || !/BATHE/.test(day.fount.prompt)) fail('hall/fountain after: ' + JSON.stringify([day.hall, day.fount]));
  await p.evaluate(() => { BridgeHoarfell._save && 0; localStorage.setItem('bridge_hoarfell', JSON.stringify({ warm: 0, signed: 0 })); });
  await use('FOUNTAIN');
  if (!/STEAMS LIKE A BATH/.test(await said())) fail('the fountain isn\'t a bath');
  await shut();
  await use('BROTHER ANSELM');
  const t3 = await topics();
  ['The hall', 'Tea for the road?', 'The evenings'].forEach(q => { if (!t3.some(t => t.indexOf(q) === 0)) fail('Anselm after: no ' + q + ' in ' + JSON.stringify(t3)); });
  if (t3.some(t => /Why not go in|The bell/.test(t))) fail('Anselm still has the quest\'s topics: ' + JSON.stringify(t3));
  await pickTopic('Tea for the road');
  const shop = await p.evaluate(() => (document.querySelector('#world-overlay') || {}).innerText || '');
  if (!/Prayer-Flag Tea/i.test(shop)) fail('Anselm\'s tea isn\'t on sale: ' + shop.slice(0, 120));
  await shut();
  await p.evaluate(() => BridgeCharacter.init(22, 16)); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/hq_after_day.png' });
  const dusk = await time('evening');
  await go('hoarfell-monastery', [22, 33]);
  const ev = await p.evaluate(() => ({ cold: BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile').length,
    yetis: BridgeWorld.getWorld().interactions.filter(i => i.type === 'yeti').map(i => i.yeti) }));
  if (dusk < 0 || ev.cold || ev.yetis.join() !== 'hoarfell-valley#0,hoarfell-valley#1') fail('of an evening: ' + JSON.stringify(ev));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/hq_after_dusk.png' });
  await time('night');
  await go('hoarfell-monastery', [22, 33]);
  const nt = await p.evaluate(() => ({ cold: BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile').length, yetis: BridgeWorld.getWorld().interactions.filter(i => i.type === 'yeti').length }));
  if (nt.cold !== cold || nt.yetis) fail('at night: ' + JSON.stringify(nt));
  console.log('after: day', JSON.stringify({ cold: day.cold, yetis: day.yetis }), 'dusk', JSON.stringify(ev), 'night', JSON.stringify(nt));
  await p.evaluate(() => BridgeClock._at(null));

  // ---- the valley's loot: what each card says it's for ----
  const want = { wolf_pelt: ['want'], rime_shell: ['yeti'], bat_wing: ['buyer'], golem_core: ['make'], wraith_essence: ['buyer'], wyrm_scale: ['make'] };
  for (const id of Object.keys(want)) {
    const r = await p.evaluate((id) => ({ ks: BridgeUses.lines(id).map(l => l.k), html: BridgeUses.html(id, { max: 9 }).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), only: BridgeUses.onlySale(id) }), id);
    want[id].forEach(k => { if (r.ks.indexOf(k) < 0) fail(id + ' has no ' + k + ' use: ' + r.ks.join(',')); });
    if (r.only) fail(id + ' is still only worth selling');
    console.log('uses', id, '-', r.html.trim().slice(0, 260));
  }
  // a quest step's use goes once the quest's done; before, it shows (a fresh pilot)
  const qline = await p.evaluate(() => BridgeUses.lines('golem_core').some(l => l.k === 'quest'));
  if (qline) fail('the golem core still says the finished quest wants it');
  // the Backpack's card for a pelt
  await give('wolf_pelt', 4);
  await p.keyboard.press('i'); await p.waitForTimeout(800);
  await p.evaluate(() => { const s = [...document.querySelectorAll('[data-slot], .bp-slot, .inv-slot')].find(e => /pelt/i.test(e.title || e.getAttribute('aria-label') || e.dataset.id || '')); if (s) s.click(); });
  await p.waitForTimeout(500);
  const card = await p.evaluate(() => (document.querySelector('.bp-detail') || {}).innerText || '');
  console.log('pelt card:', card.replace(/\s+/g, ' ').slice(0, 200));
  await p.screenshot({ path: OUT + '/hq_pelt_card.png' });
  await p.keyboard.press('i'); await p.waitForTimeout(500);

  // ---- and who takes each ----
  // Maison Vautrin: the furs of four pelts, then she buys them
  await go('hoarfell-aurelle', [32, 28]);
  await use('MAISON VAUTRIN');
  if (!await p.evaluate(() => { const r = [...document.querySelectorAll('#world-overlay button, #world-overlay [class*="row"]')].find(e => /Furs from your own pelts/.test(e.textContent)); if (r) { r.click(); return true; } return false; })) fail('no furs-from-pelts row at Maison Vautrin');
  await p.waitForTimeout(1500);
  const furs = await p.evaluate(() => ({ style: BridgeGear.style(), pelts: BridgeInventory.getCount('wolf_pelt') }));
  if (furs.style !== 'furs' || furs.pelts !== 0) fail('Vautrin\'s furs: ' + JSON.stringify(furs));
  await shut();
  await use('MAISON VAUTRIN');
  const v2 = await p.evaluate(() => (document.querySelector('#world-overlay') || {}).innerText || '');
  if (!/Sell her your pelts/.test(v2)) fail('Vautrin doesn\'t buy pelts once the coat\'s made');
  await shut();
  // a yeti and a rime shell: twice the trust
  await go('hoarfell-valley', [6, 33]);
  const yt = await p.evaluate(() => { const o = BridgeValley._yetis()[0], id = o.id, was = BridgeValley._save().yetis[id].trust; BridgeValley._feed(o, 'rime_shell'); return { was, now: BridgeValley._save().yetis[id].trust, left: BridgeInventory.getCount('rime_shell') }; });
  if (yt.now - yt.was !== 2 || yt.left) fail('the yeti and the rime shell: ' + JSON.stringify(yt));
  await shut();
  // Mirelle buys bat wings and wraith essence
  await give('bat_wing', 2); await give('wraith_essence', 1);
  await go('sylvara', [34, 12]);
  await use('HERBALIST');
  await pickTopic('Things from the cold');
  const mir = await p.evaluate(() => (document.querySelector('#world-overlay') || {}).innerText || '');
  if (!/Ice Bat Wing/i.test(mir) || !/Wraith Essence/i.test(mir)) fail('Mirelle\'s sell sheet: ' + mir.slice(0, 160));
  await p.screenshot({ path: OUT + '/hq_mirelle.png' });
  await shut();
  const morwen = await p.evaluate(() => { const t = BridgePeople.all().morwen || Object.values(BridgePeople.all()).find(x => x.name === 'Morwen'); return (t.topics.find(x => x.sell) || {}).sell; });
  if (!morwen || !morwen.some(s => s.id === 'bat_wing') || !morwen.some(s => s.id === 'wraith_essence')) fail('Morwen doesn\'t buy them: ' + JSON.stringify(morwen));
  // the Workshop: a golem core into a hearthstone, wyrm scales into plating; the hearthstone warms
  const ws = await p.evaluate(() => ({ h: BridgeWorkshop.RECIPES.hearthstone && BridgeWorkshop.RECIPES.hearthstone.in, w: BridgeWorkshop.RECIPES.wyrmscale && BridgeWorkshop.RECIPES.wyrmscale.in,
    part: !!BridgeItems.get('part_wyrmscale'), fit: !!BridgeFleet.FITS.wyrmscale }));
  if (!ws.h || ws.h.golem_core !== 1 || !ws.w || ws.w.wyrm_scale !== 4 || !ws.part) fail('the Workshop\'s recipes: ' + JSON.stringify(ws));
  const warm = await p.evaluate(() => { localStorage.setItem('bridge_hoarfell', '{"warm":0}'); const t = Date.now(); BridgeItems.get('hearthstone').onUse(BridgeInventory); return true; });
  console.log('workshop', JSON.stringify(ws), 'hearthstone', warm);

  // ---- on a phone: Anselm, and a golem core's card (a fresh pilot: the quest's use shows) ----
  const q = await run({ width: 390, height: 780 }, true);
  await q.evaluate(() => new Promise(r => BridgeWorld.load('hoarfell-monastery', () => { BridgeState.transition('world', { worldId: 'hoarfell-monastery', spawn: { x: 6, y: 15 } }); r(); })));
  await q.waitForTimeout(3000);
  await q.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'BROTHER ANSELM'); BridgeCharacter.init(i.x, i.y + 1); BridgeInteractions.execute(i); });
  await q.waitForTimeout(2500);
  await q.screenshot({ path: OUT + '/hq_phone_anselm.png' });
  const fresh = await q.evaluate(() => BridgeUses.lines('golem_core').map(l => l.k));
  if (fresh.indexOf('quest') < 0) fail('a fresh pilot\'s golem core doesn\'t say The Last Monk wants it: ' + fresh);
  console.log('phone: golem core uses', fresh.join(','));
  console.log('errors', errors);
  await b.close();
})();
