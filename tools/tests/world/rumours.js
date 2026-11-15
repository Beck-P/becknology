// Rumours that lead somewhere (spec-deeper-worlds X5; CLAUDE.md, *Rumours that lead somewhere*). Every gossip topic in
// people.json tagged `rumour` names a quest that exists, every one tagged `lead` names an entry in assets/leads.json, and
// every lead points at something really in the game: its world, its label live in that world once every module has
// decorated it (or, for a lead with no world, someone who stands at that label), its festival, its board. The main
// story's gossip stays unwired. A sample on each planet heard by talking: into the Journal under Rumours with who said it
// and its way there, a Map button once you've been, gone once you follow it up; Next up carrying one; the Journal on a
// desktop and a phone. Then the things that were only worth selling (the leftovers): each shows a use on its card and
// the use works — the silk scarf loved, the glass float put up in your quarters (sold back for its own worth, not the
// shop's), the goldfish in a tank, a lantern drawing fish after dark, ember glass folded into fire arrows by Wren, the
// autograph loved by a collector. node world/rumours.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const GOSSIP = ['Heard anything?', 'Rumours', 'Gossip', 'Village gossip'];
// the main story's gossip (the plan's *The main story*): never wired
const STORY = ['crown_guard', 'ione', 'cliff_aris', 'mette', 'bryn', 'rose_lior', 'juno', 'inge'];
const LEFTOVERS = ['silk_scarf', 'glass_float', 'caldera_lantern', 'leaf_lantern', 'ember_glass', 'autograph', 'goldfish_bag'];
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };
  async function page(ctxOpts, at) {
    const p = await (await b.newContext(ctxOpts)).newPage();
    p.on('pageerror', e => { console.log('PAGEERR', e.message.slice(0, 200)); errors++; });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => {
      if (sessionStorage.getItem('rm_seeded')) return;
      sessionStorage.setItem('rm_seeded', '1');
      ['bridge_quests', 'bridge_quest_meta', 'bridge_log_seen', 'bridge_made_decor'].forEach(k => localStorage.removeItem(k));
      localStorage.setItem('bridge_ship_location', 'lumar');
      const slots = ['silk_scarf', 'glass_float', 'caldera_lantern', 'leaf_lantern', 'ember_glass', 'autograph', 'goldfish_bag'].map(id => ({ id, count: 2 }));
      localStorage.setItem('bridge.inventory.v2', JSON.stringify({ slots, selected: 0, hp: 100, maxHP: 100, energy: 100, maxEnergy: 100 }));
      localStorage.setItem('bridge_homes', JSON.stringify({ owned: { 'lumar-home': 1 }, have: { fish_tank: 1 }, layout: { 'lumar-home': [{ id: 'fish_tank', x: 6, y: 2 }] }, seen: { 'lumar-home': 1 } }));
    });
    await p.goto('http://127.0.0.1:8766/bridge/?at=' + (at || '2026-11-14T13:00')); await p.waitForTimeout(5000);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    return p;
  }
  const go = (p, w, at) => p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : undefined }); r(); })), [w, at]);
  const shut = (p) => p.evaluate(() => { document.querySelectorAll('.world-dialog').forEach(x => x.remove()); if (BridgeControls.enable) BridgeControls.enable(); });

  // ---- 1. every rumour and lead resolves to something real ---------------------------------------------------------
  const v = await page({ viewport: { width: 1200, height: 800 } });   // (its own page: loading every place marks it visited)
  const data = await v.evaluate((G) => {
    const P = BridgePeople.all(), Q = BridgeQuests.defs(), L = BridgeQuests.leadDefs(), out = { rumour: [], lead: [], plain: [], badQ: [], badL: [] };
    Object.keys(P).forEach(pid => (P[pid].topics || []).forEach(t => {
      const w = (P[pid].at && P[pid].at[0] || {}).world || '';
      if (t.rumour) [].concat(t.rumour).forEach(q => { out.rumour.push([pid, q, w]); if (!Q[q]) out.badQ.push(pid + ':' + q); });
      if (t.lead) [].concat(t.lead).forEach(l => { out.lead.push([pid, l, w]); if (!L[l]) out.badL.push(pid + ':' + l); });
      if (G.indexOf(t.q) >= 0 && !t.rumour && !t.lead) out.plain.push([pid, w]);
    }));
    out.leads = L;
    out.at = {}; Object.keys(P).forEach(pid => (P[pid].at || []).forEach(a => { (out.at[a.label] = out.at[a.label] || []).push(a.world); }));
    out.fest = Object.keys(BridgeFestivals.all() || {});
    return out;
  }, GOSSIP);
  expect('every rumour names a quest (' + data.rumour.length + ')', !data.badQ.length || console.log('  ', data.badQ));
  expect('every lead names an entry in leads.json (' + data.lead.length + ')', !data.badL.length || console.log('  ', data.badL));
  const used = new Set(data.lead.map(l => l[1]));
  expect('every entry in leads.json is said by someone', Object.keys(data.leads).every(id => used.has(id)) || console.log('  unused:', Object.keys(data.leads).filter(id => !used.has(id))));
  expect('the main story\'s gossip stays unwired', STORY.every(pid => data.plain.some(x => x[0] === pid)) || console.log('  wired:', STORY.filter(pid => !data.plain.some(x => x[0] === pid))));
  // each lead's place, label, festival and board, checked live: the world loaded with every module's decorate run
  const worlds = {};
  Object.keys(data.leads).forEach(id => { const L = data.leads[id]; if (L.world) (worlds[L.world] = worlds[L.world] || []).push(id); });
  for (const w of Object.keys(worlds)) {
    const labels = await v.evaluate((w) => new Promise(r => BridgeWorld.load(w, (d) => r(((d || BridgeWorld.getWorld() || {}).interactions || []).map(i => i.label)), () => r(null))), w).catch(() => null);
    worlds[w].forEach(id => {
      const L = data.leads[id];
      expect('lead ' + id + ': ' + w + (L.label ? ' · ' + L.label : ''), labels && (!L.label || labels.indexOf(L.label) >= 0));
    });
  }
  Object.keys(data.leads).forEach(id => {
    const L = data.leads[id];
    if (!L.world) expect('lead ' + id + ': someone stands at ' + L.label, !!data.at[L.label]);
    if (L.festival) expect('lead ' + id + ': festival ' + L.festival + ' exists', data.fest.indexOf(L.festival) >= 0);
    if (L.kind === 'festival') expect('lead ' + id + ' (a festival) names one', !!L.festival);
    if (L.board) expect('lead ' + id + ': board ' + L.board, L.board === 'farm' || ['lumar', 'arcadia', 'hoarfell', 'verdance', 'enigma', 'sylvara'].indexOf(L.board) >= 0);
    expect('lead ' + id + ' has a title, where and text', !!(L.title && L.where && L.text && L.kind));
  });
  // the counts, by planet (for the record)
  const planet = (w) => /^lumar|^hangar/.test(w) ? 'Lumar' : /^arcadia|^chrome|^cyber|^junk/.test(w) ? 'Arcadia' : /^hoarfell/.test(w) ? 'Hoarfell' : /^verdance/.test(w) ? 'Verdance' : /^sylvara/.test(w) ? 'Sylvara' : w;
  const tally = {};
  const gossipPids = new Set(await v.evaluate((G) => { const P = BridgePeople.all(); return Object.keys(P).filter(pid => (P[pid].topics || []).some(t => G.indexOf(t.q) >= 0 && (t.rumour || t.lead))); }, GOSSIP));
  data.rumour.concat(data.lead).forEach(([pid, , w]) => { if (gossipPids.has(pid)) { const k = planet(w); tally[k] = tally[k] || { wired: new Set(), colour: 0, story: 0 }; tally[k].wired.add(pid); } });
  data.plain.forEach(([pid, w]) => { const k = planet(w); tally[k] = tally[k] || { wired: new Set(), colour: 0, story: 0 }; if (STORY.indexOf(pid) >= 0) tally[k].story++; else tally[k].colour++; });
  console.log('by planet (people with gossip that leads somewhere / colour / the main story\'s):',
    Object.keys(tally).map(k => k + ' ' + tally[k].wired.size + '/' + tally[k].colour + '/' + tally[k].story).join(', '));

  await v.context().close();

  // ---- 2. a sample on each planet, heard by talking -----------------------------------------------------------------
  const p = await page({ viewport: { width: 1200, height: 800 } });
  async function hear(world, label) {
    await go(p, world); await p.waitForTimeout(2500);
    const ok = await p.evaluate((label) => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === label); if (!it) return false; BridgeInteractions.execute(it); return true; }, label);
    await p.waitForTimeout(900);
    const asked = await p.evaluate((G) => { const b = [...document.querySelectorAll('.wd-opt')].find(e => G.indexOf(e.textContent) >= 0); if (b) b.click(); return b ? b.textContent : null; }, GOSSIP);
    await p.waitForTimeout(1600);
    await shut(p);
    return ok && asked;
  }
  const SAMPLES = [                                        // (ending on Hoarfell, so Next up has the lead about where you are)
    ['Sylvara', 'sylvara', 'HERBALIST', { quest: 'under-the-willow' }],
    ['Lumar', 'lumar-sapphire-market', 'OLD DORAN', { lead: 'glassworks-pipe' }],
    ['Arcadia', 'arcadia-dive', 'NELL', { lead: 'dredge' }],
    ['Verdance', 'verdance', 'MARLO', { lead: 'mori-kitchen' }],
    ['Hoarfell', 'hoarfell', 'TOVE', { lead: 'ice-hole' }]
  ];
  for (const [pl, w, label, want] of SAMPLES) {
    const asked = await hear(w, label);
    const st = await p.evaluate(() => ({ leads: BridgeQuests.leadsOpen(), rumours: BridgeQuests.rumours() }));
    expect(pl + ': asked ' + label + ' (' + asked + ') and it went in the journal', !!asked && (want.lead ? st.leads.indexOf(want.lead) >= 0 : st.rumours.indexOf(want.quest) >= 0));
  }
  // a festival's lead (Juniper's, about the Harvest Fair: her café opens with the village fund, so she isn't always there to ask)
  await p.evaluate(() => BridgeQuests.lead('harvest-fair', 'Juniper Lowe')); await p.waitForTimeout(600);
  // the Journal: the rumours with who said them, the way there, a Map button where you've been
  await p.evaluate(() => BridgeMenu.open('journal')); await p.waitForTimeout(800);
  const jn = await p.evaluate(() => {
    const arts = [...document.querySelectorAll('.jn-lead')].map(a => ({ id: a.getAttribute('data-lead'), text: a.innerText, map: !!a.querySelector('.jn-go') }));
    return { arts, next: [...document.querySelectorAll('.jn-next li')].map(l => l.innerText.replace(/\n+/g, ' | ')) };
  });
  console.log('journal leads:', jn.arts.map(a => a.id + (a.map ? ' [Map]' : '')).join(', '));
  console.log('next up:', jn.next.join(' || '));
  const pipe = jn.arts.find(a => a.id === 'glassworks-pipe'), fair = jn.arts.find(a => a.id === 'harvest-fair');
  expect('a lead in the journal says who said it and the way there', pipe && /heard from Old Doran/i.test(pipe.text) && /Ione at the Sapphire Glassworks/.test(pipe.text));
  expect('a festival lead says when it\'s next', fair && /(Next in \d+ days?|On now)\./.test(fair.text));
  expect('the Hoarfell lead has a Map button (you\'ve been to Fellhaven)', jn.arts.some(a => a.id === 'ice-hole' && a.map));
  expect('no Map button for a place you\'ve never been (the Glassworks)', pipe && !pipe.map);
  expect('Next up carries the lead about where you are (Fellhaven\'s ice hole)', jn.next.some(n => /^HERE \| Char under the ice/i.test(n)));
  expect('Next up no longer promises that rumours start quests', !jn.next.some(n => /rumours start quests/i.test(n)));
  await p.screenshot({ path: SHOTS + '/rm_journal_desktop.png' });
  await p.evaluate(() => { const r = document.querySelector('.jn-sub'); if (r) r.scrollIntoView(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: SHOTS + '/rm_journal_rumours.png' });
  await p.evaluate(() => BridgeMenu.close()); await p.waitForTimeout(300);
  // following one up: to the Glassworks (now on the map), then the pipe itself
  await go(p, 'lumar-sapphire-glassworks'); await p.waitForTimeout(2000);
  await p.evaluate(() => BridgeMenu.open('journal')); await p.waitForTimeout(600);
  expect('been there: the Glassworks lead has its Map button now', await p.evaluate(() => !!document.querySelector('.jn-lead[data-lead="glassworks-pipe"] .jn-go')));
  await p.evaluate(() => BridgeMenu.close()); await p.waitForTimeout(300);
  await p.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE PIPE'); BridgeInteractions.execute(it); }); await p.waitForTimeout(800);
  await shut(p);
  expect('using the pipe follows the lead up: gone from the open leads, in the log', await p.evaluate(() => BridgeQuests.leadsOpen().indexOf('glassworks-pipe') < 0 && BridgeQuests.log().some(e => e.k === 'Followed up' && e.t === 'The glassblower\'s pipe')));
  await go(p, 'arcadia-sump'); await p.waitForTimeout(2000);
  expect('a lead about a place (the Dredge) is followed up by getting there', await p.evaluate(() => BridgeQuests.leadsOpen().indexOf('dredge') < 0));
  // a lead that's moot isn't told: Desh already crew
  const moot = await p.evaluate(() => { const was = BridgeCrew.isHired; BridgeCrew.isHired = (id) => id === 'desh' || was(id); const r = BridgeQuests.lead('desh-crew', 'Mama Keiko'); BridgeCrew.isHired = was; return r.length; });
  expect('a lead that\'s already true (Desh signed on) isn\'t told', moot === 0);
  const meta = await p.evaluate(() => localStorage.getItem('bridge_quest_meta'));

  // ---- 3. the leftovers: a use on each card, and the use works -----------------------------------------------------
  async function card(id) {
    await p.evaluate(() => { if (!BridgeMenu.isOpen()) BridgeMenu.open('backpack'); else BridgeMenu.show('backpack'); });
    await p.waitForTimeout(500);
    return p.evaluate((id) => {
      const name = BridgeItems.get(id).name;
      const slot = [...document.querySelectorAll('#game-menu .bp-slot')].find(s => s.title.indexOf(name) === 0);
      if (!slot) return 'NO SLOT';
      slot.dispatchEvent(new MouseEvent('mouseenter'));
      const d = document.querySelector('#game-menu .bp-detail');
      return d ? d.innerText.replace(/\n+/g, ' | ') : 'NO CARD';
    }, id);
  }
  await go(p, 'lumar-square', [16, 16]); await p.waitForTimeout(2000);
  const WANT = { silk_scarf: /Loved as a gift by anyone/, glass_float: /Decor: use it from the hotbar to put it on the shelf in your quarters/,
                 caldera_lantern: /Carry it: after dark, fish come up to its light/, leaf_lantern: /Carry it: after dark/,
                 ember_glass: /Made into Fire Arrow at Wren's lantern stall/, autograph: /Loved as a gift by/, goldfish_bag: /A fish tank: put it in one of yours/ };
  for (const id of LEFTOVERS) {
    const c = await card(id);
    console.log(id + ':', c.slice(0, 260));
    expect(id + ': a use on its card, and not "only worth selling"', WANT[id].test(c) && !/Only worth selling/.test(c));
    if (id === 'glass_float') await p.screenshot({ path: SHOTS + '/rm_card_float.png' });
  }
  expect('none of them is an orphan any more', await p.evaluate((L) => L.every(id => !BridgeUses.onlySale(id)), LEFTOVERS));
  await p.evaluate(() => BridgeMenu.close()); await p.waitForTimeout(300);
  // the scarf, given: loved, by someone with no taste listed for it and someone with
  const scarf = await p.evaluate(() => ['bess', 'hollin', 'elf_child', 'wick', 'juno'].map(pid => BridgeGifts.taste(pid, 'silk_scarf')));
  expect('the silk scarf is loved by anyone: ' + scarf.join(','), scarf.every(t => t === 'love'));
  await p.evaluate(() => BridgeGifts.open(Object.assign(Object.create(BridgePeople.all().bess), { id: 'bess' }))); await p.waitForTimeout(400);
  await p.evaluate(() => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Spore Silk Scarf/.test(x.textContent)); if (r) r.click(); }); await p.waitForTimeout(700);
  const said = await p.evaluate(() => (document.querySelector('.world-dialog') || {}).innerText || '');
  expect('given to Bess, she loves it', /BESS|GIFT|DESK DRAWER|LIGHTS UP/i.test(said) && await p.evaluate(() => (BridgeGifts._given().bess || {}).known && BridgeGifts._given().bess.known.silk_scarf === 'love'));
  await shut(p);
  expect('the autograph is loved by a collector (Percy) and a fan (Mimi)', await p.evaluate(() => BridgeGifts.taste('percy', 'autograph') === 'love' && BridgeGifts.taste('mimi', 'autograph') === 'love'));
  // the glass float, put up: free, taken from the pack, and sold back later for its own worth
  const fl = await p.evaluate(async () => {
    window._decor = [];
    BridgeProgression.purchaseDecor = (slot, key, price) => { window._decor.push([slot, key, price]); return Promise.resolve({ ok: true, balance: 100, destination: 'slot' }); };
    const before = BridgeInventory.getCount('glass_float');
    BridgeInventory.useItem('glass_float');
    await new Promise(r => setTimeout(r, 400));
    const item = BridgeCatalog.getItemByKey('glass_float');
    return { before, after: BridgeInventory.getCount('glass_float'), decor: window._decor, made: BridgeCatalog.made('glass_float'), sell: BridgeCatalog.sellPriceOf(item), shop: Math.floor(item.price / 2) };
  });
  console.log('glass float:', JSON.stringify(fl));
  expect('the float goes up on the shelf for nothing, out of the pack', fl.decor.length === 1 && fl.decor[0][0] === 'shelf' && fl.decor[0][1] === 'glass_float' && fl.decor[0][2] === 0 && fl.after === fl.before - 1);
  expect('a float you made sells back for its worth (18), not the shop\'s 90: nothing minted', fl.made === 1 && fl.sell === 18 && fl.shop === 90);
  await shut(p);
  // a lantern, carried: after dark the fish come sooner; by day nothing
  const lamp = await p.evaluate(() => { const w = BridgeWorld.getWorldId(); return { now: BridgeFishing.lampPull(), sun: BridgeClock.sky(w).sun }; });
  console.log('lantern at 1pm:', JSON.stringify(lamp));
  expect('by day a lantern does nothing for the fish', lamp.now === 1);
  // ember glass, folded by Wren into fire arrows
  await go(p, 'sylvara-roots'); await p.waitForTimeout(2000);
  const fold = await p.evaluate(async () => {
    const e0 = BridgeInventory.getCount('ember_glass'), f0 = BridgeInventory.getCount('fire_arrow');
    const t = BridgePeople.all().elf_lanternmaker.topics.find(t => t.sylvan === 'fold:ember');
    BridgeSylvara.topic(t.sylvan, BridgePeople.all().elf_lanternmaker, t.a);
    await new Promise(r => setTimeout(r, 300));
    const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Fire arrows from ember glass/.test(x.textContent));
    if (r) r.click();
    await new Promise(r => setTimeout(r, 300));
    return { topic: !!t, e: BridgeInventory.getCount('ember_glass') - e0, f: BridgeInventory.getCount('fire_arrow') - f0 };
  });
  console.log('Wren folds:', JSON.stringify(fold));
  expect('Wren has an Ember glass? topic, and one ember glass makes four fire arrows', fold.topic && fold.e === -1 && fold.f === 4);
  await shut(p);
  // the goldfish, into the tank at home
  await go(p, 'lumar-home'); await p.waitForTimeout(2500);
  const tank = await p.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'tank'); if (it) BridgeInteractions.execute(it); return !!it; });
  await p.waitForTimeout(400);
  const row = (re) => p.evaluate((re) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => new RegExp(re).test(x.textContent)); if (r) r.click(); return !!r; }, re);
  await row('Put a fish in'); await p.waitForTimeout(400);
  const listed = await row('^\\s*Goldfish'); await p.waitForTimeout(500);
  const inTank = await p.evaluate(() => (BridgeHome._save().layout['lumar-home'].find(e => e.id === 'fish_tank').fish || []).map(f => f.id));
  expect('the goldfish goes in the tank at home (listed as Goldfish, out of its bag)', tank && listed && inTank.indexOf('goldfish_bag') >= 0);
  await shut(p);
  await p.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'tank'); if (it) BridgeAquarium.look(it); }); await p.waitForTimeout(1500);
  await p.screenshot({ path: SHOTS + '/rm_goldfish_tank.png' });
  await p.evaluate(() => BridgeAquarium.away && BridgeAquarium.away()); await p.waitForTimeout(400);

  // ---- 4. after dark: a lantern draws the fish; the Journal on a phone ---------------------------------------------
  const ph = await page({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, '2026-11-14T23:30');
  await ph.evaluate((m) => { localStorage.setItem('bridge_quest_meta', m); }, meta);
  await ph.reload(); await ph.waitForTimeout(5000);
  await ph.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await go(ph, 'lumar-sapphire'); await ph.waitForTimeout(2500);
  const night = await ph.evaluate(() => ({ k: BridgeFishing.lampPull(), sun: BridgeClock.sky('lumar-sapphire').sun }));
  console.log('lantern at night:', JSON.stringify(night));
  expect('after dark a lantern in the pack makes fish bite sooner (x0.8)', night.sun < 0.3 && night.k === 0.8);
  await ph.evaluate(() => BridgeMenu.open('journal')); await ph.waitForTimeout(900);
  const phj = await ph.evaluate(() => ({ leads: document.querySelectorAll('.jn-lead').length, wide: document.documentElement.scrollWidth <= window.innerWidth + 1,
    text: ((document.querySelector('.jn-lead') || {}).innerText || '').replace(/\n+/g, ' | ') }));
  console.log('phone journal:', JSON.stringify(phj));
  expect('the Journal on a phone lists the leads, nothing off the side', phj.leads >= 2 && phj.wide);
  await ph.evaluate(() => { const r = document.querySelector('.jn-lead'); if (r) r.scrollIntoView(); }); await ph.waitForTimeout(300);
  await ph.screenshot({ path: SHOTS + '/rm_journal_phone.png' });
  await ph.evaluate(() => { const b = document.querySelector('.jn-forget'); if (b) b.click(); }); await ph.waitForTimeout(400);
  expect('Done takes a lead off the list', await ph.evaluate(() => document.querySelectorAll('.jn-lead').length) === phj.leads - 1);

  console.log(errors ? errors + ' error(s)' : 'all good');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
