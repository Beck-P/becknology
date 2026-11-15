const { chromium } = require('playwright');
// Small stories (spec-deeper-worlds V2, L3, A1, Y1): hooks the game already showed, given somewhere to go.
// Edda's Book played from Mags's gossip to Bridget's letter (the pages, the backs, four apples, the pie for sale);
// The Admiral from the crier to the cat and the parrot home at the chandler's window; Desh signed on at the spaceport
// (her perk on a ship's hold, still at the Old Mercy, buying from your pack and selling chrome); Ithil's fallen star
// (nothing without one, then the star named on the dial and in the telescope, more stars on a starfall night).
// node world/small_stories.js [shots] [part: edda|admiral|desh|ithil]
const OUT = process.argv[2] || __dirname + '/shots';
const ONLY = process.argv[3] || '';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => {
    ['bridge_quests', 'bridge_quest_meta', 'bridge_crew', 'bridge_letters'].forEach(k => localStorage.removeItem(k));
    BridgeState.setPilot({ id: 't', name: 'ALYSSA', suit_color: 'purple' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
  });
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]); await p.waitForTimeout(3000); };
  const shut = async () => {
    for (let i = 0; i < 3; i++) {
      const open = await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo, #item-get'));
      if (!open) break;
      const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close|done/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
      if (!hit) await p.keyboard.press('Escape');
      await p.waitForTimeout(500);
      if (await p.evaluate(() => !!document.getElementById('item-get'))) { await p.keyboard.press('Space'); await p.waitForTimeout(500); }
    }
  };
  // stand by a thing and use it (E), as a player would
  const use = async (label) => {
    const at = await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); return i ? [i.x, i.y] : null; }, label);
    if (!at) { fail('no ' + label + ' in ' + await p.evaluate(() => BridgeWorld.getWorldId())); return; }
    await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); BridgeInteractions.execute(i); }, label);
    await p.waitForTimeout(1600);
  };
  const topics = () => p.evaluate(() => [...document.querySelectorAll('.wd-opt')].map(b => b.textContent));
  const ask = async (q) => { const ok = await p.evaluate((q) => { const b = [...document.querySelectorAll('.wd-opt')].find(e => e.textContent === q); if (b) b.click(); return !!b; }, q); await p.waitForTimeout(1400); if (!ok) fail('no topic "' + q + '": ' + JSON.stringify(await topics())); return ok; };
  const said = async () => {                                         // once it's typed out (it stops growing)
    let last = '', same = 0;
    for (let i = 0; i < 60 && same < 3; i++) {                       // (a big place drawn in software can stall the typing a while)
      await p.waitForTimeout(500);
      const t = await p.evaluate(() => document.querySelector('.world-dialog.typing') ? '' : ((document.querySelector('.wd-text') || document.querySelector('.world-dialog')) || {}).innerText || '');
      same = t && t === last ? same + 1 : 0; last = t;
    }
    return last;
  };
  const has = (k) => p.evaluate((k) => BridgeQuests.has(k), k);
  const count = (id) => p.evaluate((id) => BridgeInventory.getCount(id), id);
  const carried = () => p.evaluate(() => BridgeKeyItems.carried().map(i => i.id).join(','));
  const tracker = () => p.evaluate(() => { const t = document.getElementById('quest-tracker'); return t && t.classList.contains('on') ? t.innerText : ''; });
  const part = (n) => !ONLY || ONLY === n;
  // the letter in the rack on the bridge, once it's done (js/talk.js checkMail): who it's from
  const mail = (q) => p.evaluate((q) => BridgeTalk.checkMail().then(() => { const m = BridgeTalk.letters().find(m => m.key === 'quest:' + q); return m ? m.name : null; }), q);

  // ---- Edda's Book: the rumour at the Hayloft, six pages, the backs, four apples, the pie ----
  if (part('edda')) {
    await go('verdance-village', [15, 13]);
    if ((await p.evaluate(() => BridgeQuests.startsHere('verdance-village')))['BRIDGET'] !== 'eddas-book') fail('no gold ! over Bridget');
    await use('MAGS'); await ask('Gossip'); await shut();
    if ((await p.evaluate(() => BridgeQuests.rumours())).indexOf('eddas-book') < 0) fail('Mags\'s gossip didn\'t make a rumour');
    const t0 = await tracker();
    if (!/Edda's Book/.test(t0) || !/Bridget/.test(t0)) fail('the tracker isn\'t on the rumour: ' + t0);
    await use('NELL'); await shut();
    if (await has('eddas-book/nell')) fail('a page found before Bridget began it');
    await use('BRIDGET');
    const tb = await topics();
    if (tb[0] !== "Edda's book") fail('Bridget\'s first topic: ' + JSON.stringify(tb));
    await ask("Edda's book");
    if (!/HONEY CAKE/.test(await said())) fail('Bridget\'s book topic');
    await shut();
    if (!await has('eddas-book/bridget')) fail('not begun at Bridget');
    if (await carried() !== 'book') fail('not carrying the book: ' + await carried());
    const t1 = await tracker();
    console.log('tracker after Bridget:', t1.replace(/\n/g, ' | ').slice(0, 200));
    if (!/1 \/ 7/.test(t1)) fail('the tracker\'s count: ' + t1);
    for (const who of ['NELL', 'WAT', 'OLD LUDD', 'MAGS']) {
      await use(who);
      const t = await topics();
      if (t[0] !== "Edda's page") fail(who + '\'s first topic: ' + JSON.stringify(t.slice(0, 3)));
      await ask("Edda's page");
      if (!/BACK/.test(await said())) fail(who + '\'s page says nothing about the back');
      await shut();
    }
    await go('verdance', [20, 12]);
    await use('HOLLIN'); await ask("Edda's page"); await shut();
    if (!await has('eddas-book/hollin')) fail('Hollin\'s page');
    await go('verdance-village', [15, 13]);
    await p.evaluate(() => BridgeInventory.removeItem('apple', BridgeInventory.getCount('apple')));
    await use('BRIDGET');
    if (await has('eddas-book/bake')) fail('baked without apples');
    const tb2 = await topics();
    if (tb2[0] !== 'The backs of the pages') fail('Bridget doesn\'t read the backs: ' + JSON.stringify(tb2));
    await ask('The backs of the pages');
    if (!/APPLES OFF HER OWN TREES/.test(await said())) fail('no word of apples');
    await p.screenshot({ path: OUT + '/ss_edda_backs.png' });
    await shut();
    const lead = await p.evaluate(() => BridgeQuests.leads('eddas-book', 2).join(' / '));
    if (!/four apples/i.test(lead) || !/Meadow Lane/.test(lead)) fail('the lead doesn\'t say what\'s wanted and where: ' + lead);
    const uses = await p.evaluate(() => BridgeUses.lines('apple').map(l => l.t).join(' / '));
    if (!/Edda's Book/.test(uses)) fail('the apple\'s card doesn\'t say the quest wants it: ' + uses);
    // the apples, picked off Edda's trees (the farm's forage)
    await go('verdance', [36, 13]);
    for (let i = 0; i < 2; i++) {
      await p.evaluate((n) => { const t = BridgeWorld.getWorld().interactions.filter(i => i.label === 'APPLE TREE')[n]; BridgeInteractions.execute(t); }, i);
      await p.waitForTimeout(900); await shut();
    }
    const apples = await count('apple');
    console.log('apples picked', apples);
    if (apples < 4) { await p.evaluate((n) => BridgeInventory.addItem('apple', 4 - n), apples); }
    await go('verdance-village', [15, 13]);
    await use('BRIDGET');
    await shut(); await p.waitForTimeout(3500); await shut();
    if (!await has('eddas-book')) fail('Edda\'s Book not done');
    if (await carried()) fail('still carrying: ' + await carried());
    if (await count('apple') !== Math.max(apples, 4) - 4) fail('the apples weren\'t handed over: ' + await count('apple'));
    if (await count('eddas_pie') < 1) fail('no pie kept');
    await use('BRIDGET');
    const tb3 = await topics();
    if (tb3.indexOf("Edda's pie") < 0) fail('Bridget doesn\'t sell the pie: ' + JSON.stringify(tb3));
    await ask("Edda's pie"); await p.waitForTimeout(600);
    const shop = await p.evaluate(() => (document.querySelector('#world-overlay') || {}).innerText || '');
    if (!/Edda's Apple Pie/i.test(shop)) fail('the pie isn\'t in her shop: ' + shop.slice(0, 160));
    await p.screenshot({ path: OUT + '/ss_edda_pie.png' });
    await shut();
    const pieUses = await p.evaluate(() => BridgeUses.lines('eddas_pie').map(l => l.t.replace(/<[^>]+>/g, '')).join(' / '));
    console.log('eddas_pie uses:', pieUses);
    if (!/Eat it/.test(pieUses) || !/Loved as a gift/.test(pieUses)) fail('the pie\'s uses: ' + pieUses);
    console.log('eddas-book', await has('eddas-book'), 'letter from', await mail('eddas-book'));
    if (await mail('eddas-book') !== 'Bridget Hale') fail('no letter from Bridget');
  }

  // ---- The Admiral: the crier, the Keep, Pim, the mudlark's tag, the bosun, the cat on the loggia, the parrot on the
  // crane, both home at the chandler's ----
  if (part('admiral')) {
    await go('lumar-crown-oldtown', [36, 15]);
    await use('TOWN CRIER'); await ask('The news'); await shut();
    if ((await p.evaluate(() => BridgeQuests.rumours())).indexOf('admiral') >= 0) fail('heard as a rumour from the one who starts it, after it started');
    if (!await has('admiral/crier')) fail('not begun at the crier');
    await use('TOWN CRIER');
    if ((await topics())[0] !== 'The Admirals') fail('the crier\'s first topic: ' + JSON.stringify(await topics()));
    await shut();
    await use('THE OLD KEEP');
    if (!/BRIDGE GATE/.test(await said())) fail('the Keep\'s moment');
    await shut();
    await use("THE CHANDLER'S");
    if (/CAPTAIN HUXLEY/.test(await said())) fail('the captain\'s home before anyone knows whose they are');
    await shut();
    await go('lumar-crown-office', [7, 5]);
    await use('PIM'); await ask('The parrot'); await shut();
    await go('lumar-crown-arsenal', [18, 31]);
    await use('THE CRANE'); await shut();
    if (await has('admiral/parrot')) fail('the parrot found before anyone said where');
    await go('lumar-crown-stilts', [31, 20]);
    await use('MUDLARK'); await ask('The brass tag'); await shut();
    await go('lumar-crown-arsenal', [18, 31]);
    await use('THE CRANE');
    if (!/SHOULDER/.test(await said())) fail('the crane\'s moment');
    await shut(); await p.waitForTimeout(800); await shut();
    await go('lumar-crown-bridge', [30, 14]);
    await use('THE LOGGIA');
    if (!/PICK HIM UP/.test(await said())) fail('the loggia\'s moment');
    await shut(); await p.waitForTimeout(800); await shut();
    if (await carried() !== 'cat,parrot') fail('carrying: ' + await carried());
    await p.screenshot({ path: OUT + '/ss_admiral_carrying.png' });
    // the bosun keeps a day (assets/routines.json): on Crownhaven's quay by day, the pub of an evening, away at night
    const bw = await p.evaluate(() => typeof BridgeRoutines !== 'undefined' ? BridgeRoutines.where('bosun') : null);
    console.log('the bosun is', JSON.stringify(bw));
    if (bw) { await go(bw.world, [bw.x || 12, (bw.y || 8) + 1]); await use('BOSUN'); }
    else {                                                             // (away for the night: as he'd be at the pub of an evening)
      await go('lumar-crown-pub', [12, 9]);
      await p.evaluate(() => BridgeInteractions.execute({ x: 12, y: 8, type: 'dialog', label: 'BOSUN', dialog: '', home: { world: 'lumar-crown-pub', label: 'BOSUN' } }));
      await p.waitForTimeout(1600);
    }
    await ask('Captain H...?');
    if (!/CHANDLER/.test(await said())) fail('the bosun doesn\'t say where');
    await shut();
    await go('lumar-crown-oldtown', [49, 11]);
    await use("THE CHANDLER'S");
    const home = await said();
    if (!/UP THE STAIRS/.test(home) || !/MY BOY/.test(home)) fail('both moments at the window: ' + home.slice(0, 200));
    await p.screenshot({ path: OUT + '/ss_admiral_home.png' });
    await shut(); await p.waitForTimeout(3000); await shut();
    if (!await has('admiral')) fail('The Admiral not done');
    if (await carried()) fail('still carrying: ' + await carried());
    if (await mail('admiral') !== 'Barnaby Toll') fail('no letter from the crier: ' + await mail('admiral'));
    await go('lumar-crown-oldtown', [49, 11]);
    await use("THE CHANDLER'S");
    if (!/IN THE WINDOW/.test(await said())) fail('they\'re not in the window after');
    await shut();
    console.log('admiral', await has('admiral'));
  }

  console.log('errors', errors);
  await b.close();
})();
