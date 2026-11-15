const { chromium } = require('playwright');
// Sylvara, Enigma, the Brink and the ship, deeper (spec-deeper-worlds Y4–Y7, E1–E2, S1, W1–W2; apps/bridge/CLAUDE.md
// *Sylvara, Enigma, the Brink and the ship, deeper*; js/fardeep.js). Each part plays its thing through as a player would:
//   y6      Thaelin's Lost Verse: Fennick's rumour, Thaelin's topic begins it, the lookout and the stage found, the falls
//           shut (the tracker says so, the clue won't be found, Thaelin says so), then each place opened in turn as the
//           other worker's renders will (BridgeSylvara.OPEN) and its verse found, the hall's harp ends it, the song played
//           back, the stage's board after; the tracker shot at desktop and phone size
// node world/far_deeper.js [shots] [part]
const OUT = process.argv[2] || __dirname + '/shots';
const ONLY = process.argv[3] || '';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errors = 0;
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const page = async (phone) => {
    const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1100, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      ['bridge_quests', 'bridge_quest_meta', 'bridge_fardeep', 'bridge_fish'].forEach(k => localStorage.removeItem(k));
      BridgeQuests.reset();
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
      ['verdance', 'hoarfell', 'lumar', 'arcadia', 'sylvara'].forEach((r) => BridgeWeather._pin && BridgeWeather._pin(r, 'clear'));
      window._coins = 5000;
      BridgeProgression.awardCoins = (k) => { window._coins += k; return Promise.resolve(window._coins); };
      BridgeProgression.wagerCoins = (k) => Promise.resolve(window._coins >= k ? (window._coins -= k, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
      BridgeProgression.recordAchievement = (k, n) => { window._coins += n; return Promise.resolve(true); };
      if (BridgeProgression.getBalance) BridgeProgression.getBalance = () => Promise.resolve(window._coins);
    });
    return p;
  };
  const p = await page(false);
  // into a world, standing on open ground beside a label (never on its tile), or at a tile
  const go = async (w, at, pg) => {
    pg = pg || p;
    await pg.evaluate(([w, at]) => new Promise(r => fetch('/bridge/assets/worlds/' + w + '.json').then(x => x.json()).then(d => {
      let spot = Array.isArray(at) ? at : null;
      if (!spot) {
        const i = d.interactions.find(i => i.label === at);
        const free = (x, y) => d.collisions[y] && d.collisions[y][x] === 0 && !(x === i.x && y === i.y);
        for (let rr = 1; rr < 4 && !spot; rr++) for (let dy = -rr; dy <= rr && !spot; dy++) for (let dx = -rr; dx <= rr && !spot; dx++) if (free(i.x + dx, i.y + dy)) spot = [i.x + dx, i.y + dy];
      }
      BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: spot[0], y: spot[1] } }); r(); });
    })), [w, at]);
    await pg.waitForTimeout(2500);
  };
  const shut = async (pg) => {
    pg = pg || p;
    for (let i = 0; i < 4; i++) {
      const open = await pg.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo, #item-get'));
      if (!open) break;
      const hit = await pg.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close|done|back/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
      if (!hit) await pg.keyboard.press('Escape');
      await pg.waitForTimeout(500);
      if (await pg.evaluate(() => !!document.getElementById('item-get'))) { await pg.keyboard.press('Space'); await pg.waitForTimeout(500); }
    }
  };
  const use = async (label, pg) => {
    pg = pg || p;
    const ok = await pg.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); if (i) BridgeInteractions.execute(i); return !!i; }, label);
    if (!ok) fail('no ' + label + ' in ' + await pg.evaluate(() => BridgeWorld.getWorldId()));
    await pg.waitForTimeout(1400);
    return ok;
  };
  const rows = () => p.evaluate(() => [...document.querySelectorAll('#world-overlay .wd-opt, #world-overlay .wd-sell-row, #world-overlay button')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  const pick = async (re) => {
    const ok = await p.evaluate((src) => { const r = new RegExp(src, 'i'); const b = [...document.querySelectorAll('#world-overlay .wd-opt, #world-overlay .wd-sell-row, #world-overlay button')].find(e => r.test(e.innerText) && !e.disabled && !e.classList.contains('none')); if (b) b.click(); return !!b; }, re.source);
    if (!ok) fail('no row ' + re + ' in: ' + (await rows()).join(' | '));
    await p.waitForTimeout(1200);
    return ok;
  };
  const said = async (pg) => {
    pg = pg || p;
    let last = '', same = 0;
    for (let i = 0; i < 80 && same < 3; i++) {
      await pg.waitForTimeout(400);
      if (i === 6) await pg.evaluate(() => { const d = document.querySelector('.world-dialog.typing'); if (d) d.click(); });   // a long one: finish the typing
      const t = await pg.evaluate(() => document.querySelector('.world-dialog.typing') ? '' : ((document.querySelector('.wd-text') || document.querySelector('.world-dialog')) || {}).innerText || '');
      same = t && t === last ? same + 1 : 0; last = t;
    }
    return last;
  };
  const has = (k) => p.evaluate((k) => BridgeQuests.has(k), k);
  const count = (id) => p.evaluate((id) => BridgeInventory.getCount(id), id);
  const give = (id, n) => p.evaluate(([id, n]) => BridgeInventory.addItem(id, n), [id, n]);
  const shot = (name, pg) => (pg || p).screenshot({ path: OUT + '/fd_' + name + '.png' });
  const part = (n) => !ONLY || ONLY === n;

  // ---- Y6 · Thaelin's lost verse ----
  if (part('y6')) {
    const Q = 'thaelins-verse';
    await go('sylvara-tavern', 'TAVERN KEEPER');
    await use('TAVERN KEEPER'); await pick(/^Thaelin\?/); await said(); await shut();
    if (!(await p.evaluate(() => BridgeQuests.rumours())).includes(Q)) fail('Fennick\'s gossip didn\'t put the verse in the journal');
    await go('sylvara', 'BARD');
    await use('BARD'); await pick(/Your old song/); const t0 = await said(); await shut();
    if (!await has(Q + '/ask')) fail('Thaelin\'s topic didn\'t begin it'); else console.log('begun:', t0.slice(0, 90).replace(/\n/g, ' '));
    // not before its turn: the stage first does nothing
    await go('sylvara-tavern', 'THE STAGE');
    await use('THE STAGE'); await shut();
    if (await has(Q + '/stage')) fail('the stage found before the lookout');
    await go('sylvara-boughs', 'LOOKOUT');
    await use('LOOKOUT'); const t1 = await said(); await shut();
    if (!/I CLIMBED UNTIL THE LEAVES RAN OUT/.test(t1)) fail('the lookout showed no verse: ' + t1.slice(0, 80));
    if (!await has(Q + '/lookout')) fail('the lookout not found');
    await go('sylvara-tavern', 'THE STAGE');
    await use('THE STAGE'); const t2 = await said(); await shut();
    if (!/FENNICK POURED/.test(t2)) fail('the stage showed no verse');
    // the falls aren't open: the tracker says so, the clue can't be found, Thaelin says so
    const shutLead = await p.evaluate((Q) => { BridgeQuests.track(Q); return BridgeQuests.leads(Q, 2); }, Q);
    console.log('lead while shut:', shutLead[0]);
    if (!/roped off/i.test(shutLead[0] || '')) fail('the tracker didn\'t say the way to the falls is shut');
    await p.waitForTimeout(1200);
    await shot('y6_tracker');
    await p.evaluate(() => BridgeQuests.onInteract('sylvara-fallcave', { label: 'THE CARVING' }));
    if (await has(Q + '/falls')) fail('the falls\' verse found while its place is shut');
    await go('sylvara', 'BARD');
    await use('BARD'); await pick(/verses so far/); const t3 = await said(); await shut();
    if (!/FENNICK POURED/.test(t3) || !/ROPED OFF/.test(t3)) fail('Thaelin\'s read-back: ' + t3.slice(-160));
    // each place opens (as BridgeSylvara.OPEN will get it) and its verse can be had, in order
    for (const [ids, w, label, clue, words] of [[['sylvara-falls', 'sylvara-fallcave'], 'sylvara-fallcave', 'THE CARVING', 'falls', /BEHIND THE FALLING/],
                                                [['sylvara-lake'], 'sylvara-lake', 'FIRE RING', 'lake', /AND THEN CAME UP/],
                                                [['sylvara-deepwood'], 'sylvara-deepwood', 'THE POOL', 'deep', /COUNTING STARS/]]) {
      const lead = await p.evaluate(([Q, ids]) => { ids.forEach(i => BridgeSylvara.OPEN.push(i)); return BridgeQuests.leads(Q, 1)[0]; }, [Q, ids]);
      if (/roped off|isn't open|open yet/i.test(lead)) fail(clue + ': still says shut once open: ' + lead);
      const hit = await p.evaluate(([w, l]) => BridgeQuests.onInteract(w, { label: l }).map(c => c.say || ''), [w, label]);
      if (!await has(Q + '/' + clue) || !words.test(hit.join(''))) fail(clue + ': not found once its place opened');
    }
    await p.evaluate(() => { ['sylvara-falls', 'sylvara-fallcave', 'sylvara-lake', 'sylvara-deepwood'].forEach(i => { const k = BridgeSylvara.OPEN.indexOf(i); if (k >= 0) BridgeSylvara.OPEN.splice(k, 1); }); });
    const c0 = await p.evaluate(() => window._coins);
    await go('sylvara-hall', 'HARP');
    await use('HARP'); const t4 = await said(); await shut();
    if (!/ONLY GONE ASTRAY/.test(t4) || !/I THINK THE FROGS ARE RIGHT/.test(t4)) fail('the hall didn\'t hear the whole song');
    if (!await has(Q)) fail('not done at the harp');
    const c1 = await p.evaluate(() => window._coins);
    if (c1 - c0 !== 350) fail('reward: ' + (c1 - c0));
    await go('sylvara-tavern', 'THE STAGE');
    await use('THE STAGE'); const t5 = await said(); await shut();
    if (!/NO, REALLY/.test(t5)) fail('the stage\'s board after: ' + t5.slice(0, 80));
    await go('sylvara', 'BARD');
    await use('BARD'); await pick(/Play The Long Way Home/); const t6 = await said();
    if (!/ONLY GONE ASTRAY/.test(t6) || !/BEHIND THE FALLING/.test(t6)) fail('Thaelin\'s song after');
    await shot('y6_song'); await shut();
    // on a phone: the tracker while the falls are shut
    const ph = await page(true);
    await ph.evaluate((Q) => { const s = { [Q]: { clues: { ask: 1, lookout: 2, stage: 3 }, started: 1 } }; localStorage.setItem('bridge_quests', JSON.stringify(s)); }, Q);
    await ph.reload(); await ph.waitForTimeout(2500);
    await ph.evaluate((Q) => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide(); BridgeQuests.track(Q); }, Q);
    await go('sylvara-river', 'BOATWRIGHT', ph);
    await ph.waitForTimeout(6000);                                                   // (the weather's toast gone)
    const trk = await ph.evaluate(() => (document.getElementById('quest-tracker') || {}).innerText || '');
    if (!/roped off/i.test(trk)) fail('phone tracker: ' + trk);
    await shot('y6_tracker_phone', ph);
    await ph.context().close();
    console.log('y6 done');
  }

  // ---- Y7 · Silverrun fishing ----
  if (part('y7')) {
    const spots = await p.evaluate(() => fetch('/bridge/assets/worlds/sylvara-river.json').then(x => x.json()).then(d => { d.interactions = []; BridgeFishing.decorate('sylvara-river', d);
      return d.interactions.map(i => ({ label: i.label, x: i.x, y: i.y, pool: i.pool, water: d.river.water[i.y][i.x] !== '0', stand: [[0, -1], [0, 1], [1, 0], [-1, 0]].some(o => d.collisions[i.y + o[1]] && d.collisions[i.y + o[1]][i.x + o[0]] === 0) })); }));
    console.log('spots:', JSON.stringify(spots));
    if (spots.length !== 2) fail('river spots: ' + spots.length);
    spots.forEach(s => { if (s.pool !== 'river' || !s.water || !s.stand) fail('spot ' + JSON.stringify(s)); });
    // the moon carp: rare by day, more after dark, most under a full moon
    const odds = await p.evaluate(() => { const n = 6000, c = () => { let k = 0; for (let i = 0; i < n; i++) if (BridgeFishing._pick('river', 0.5) === 'moon_carp') k++; return k; };
      const sky = BridgeClock.sky, moon = BridgeClock.moon, out = {};
      for (const [name, sun, full] of [['day', 0.9, false], ['night', 0.05, false], ['fullmoon', 0.05, true]]) {
        BridgeClock.sky = () => ({ sun: sun, cycles: true }); BridgeClock.moon = () => ({ full: full }); out[name] = c();
      }
      BridgeClock.sky = sky; BridgeClock.moon = moon; return out; });
    console.log('moon carp in 6000 casts:', JSON.stringify(odds));
    if (!(odds.night > odds.day * 2.5) || !(odds.fullmoon > odds.night * 1.4)) fail('the moon carp isn\'t a night fish');
    await go('sylvara-river', [21, 5]);
    await p.evaluate(() => { BridgeCharacter.setFacing && BridgeCharacter.setFacing('down'); });
    await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.type === 'fish' && i.x === 21); BridgeInteractions.execute(i); });
    await p.waitForTimeout(800);
    if (!await p.evaluate(() => BridgeFishing.isOpen())) fail('no fishing off the dock');
    await p.keyboard.down(' '); await p.waitForTimeout(1150); await p.keyboard.up(' '); await p.waitForTimeout(300);
    await p.evaluate(() => { const s = BridgeFishing._state(); if (s && s.phase === 'wait') { s.catchId = 'moon_carp'; s.nibbles = []; } });
    await p.waitForFunction(() => { const s = BridgeFishing._state(); return s && s.phase === 'bite'; }, null, { timeout: 15000 }).catch(() => fail('no bite'));
    await shot('y7_bite');
    await p.keyboard.down(' '); await p.waitForTimeout(120); await p.keyboard.up(' ');
    await p.evaluate(() => { const s = BridgeFishing._state(); if (s && s.phase === 'reel') { s.progress = 0.995; s.fish = s.ft = s.zone + s.zoneH / 2; } });
    await p.waitForTimeout(1800);
    const card = await p.evaluate(() => (document.getElementById('fish-reveal') || {}).innerText || '');
    if (!/Moon Carp/.test(card)) fail('the card: ' + card);
    await shot('y7_card');
    await p.waitForTimeout(2500); await p.keyboard.press(' '); await p.waitForTimeout(600);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    if (await p.evaluate(() => BridgeFishing.isOpen())) await p.evaluate(() => BridgeFishing.close());
    if (await count('moon_carp') !== 1) fail('the carp not in the pack');
    const setOf = await p.evaluate(() => (BridgeCodex.setOf('moon_carp') || {}).id || BridgeCodex.setOf('moon_carp'));
    console.log('moon carp set:', JSON.stringify(setOf));
    for (const id of ['river_trout', 'silverscale', 'moon_carp']) {
      const u = await p.evaluate((id) => BridgeUses.lines(id).map(l => l.t.replace(/<[^>]+>/g, '')), id);
      console.log(id, 'uses:', JSON.stringify(u));
      if (!u.some(t => /Tamsin|someone/i.test(t))) fail(id + ': no buyer on its card');
      if (u.some(t => /Only worth selling/i.test(t))) fail(id + ' only worth selling');
    }
    // Tamsin: her lead, and she buys the catch
    await give('river_trout', 2); await give('silverscale', 1);
    await go('sylvara-river', 'BOATWRIGHT');
    await use('BOATWRIGHT'); await pick(/line off the dock/); await said(); await shut();
    if (!(await p.evaluate(() => BridgeQuests.leadsOpen())).includes('silverrun-fishing')) fail('Tamsin\'s lead not in the journal');
    const c0 = await p.evaluate(() => window._coins);
    await use('BOATWRIGHT'); await pick(/Sell her your catch/); await p.waitForTimeout(800);
    await shot('y7_tamsin');
    await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-sell-row')].find(e => /sell all|everything/i.test(e.innerText)); if (b) b.click(); });
    await p.waitForTimeout(1200); await shut();
    const paid = (await p.evaluate(() => window._coins)) - c0;
    console.log('Tamsin paid', paid);
    if (paid < 2 * 12 + 30) fail('Tamsin paid ' + paid);
    const cb = await p.evaluate(() => BridgeMap && BridgeMap.comeBack ? BridgeMap.comeBack('sylvara-river') : BridgeFarDeep.comeBack('sylvara-river'));
    console.log('come back for:', JSON.stringify(cb));
    if (!JSON.stringify(cb).includes('moon carp')) fail('no Come back for on the Silverrun');
    console.log('y7 done');
  }

  // ---- S1 · Echoes that grow ----
  if (part('s1')) {
    // a save that's done things: a quest (and the main story's, which mustn't show), a festival placing, a sea legend
    const fresh0 = async () => {
      await p.reload(); await p.waitForTimeout(2500);
      await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide(); });
    };
    await p.evaluate(() => {
      localStorage.setItem('bridge_quests', JSON.stringify({ 'eddas-book': { clues: {}, started: 1, done: Date.now() - 5 * 86400000 }, signal: { clues: {}, started: 1, done: Date.now() - 86400000 } }));
      localStorage.setItem('bridge_festivals', JSON.stringify({ 'harvest_fair@20400': { best: 12, what: "Edda's Apple Pie", paid: 1, n: 1 } }));
      localStorage.setItem('bridge_fish', JSON.stringify({ caught: { old_mossback: { n: 1, best: 288 } }, bottles: [], casts: 3 }));
      localStorage.removeItem('bridge_fardeep');
    });
    await fresh0();
    const d0 = await p.evaluate(() => BridgeFarDeep.deeds().map(d => d.title + ' | ' + d.sub + (d.fresh ? ' *' : '')));
    console.log('deeds:', JSON.stringify(d0));
    if (d0.length !== 3) fail('expected three deeds: ' + d0.length);
    if (d0.some(t => /Forty-Seven|signal/i.test(t))) fail('the main story in the scrapbook');
    await go('singularity', 'RING GATE');
    await p.waitForTimeout(1500);
    const nu = await p.evaluate(() => BridgeQuests.log().slice(0, 4).map(l => l.t).join(' / '));
    console.log('arrival:', nu);
    if (!/new echo/i.test(nu)) fail('no word of new echoes at the Brink');
    await use('RING GATE'); await p.waitForTimeout(800);
    let r = await rows(); console.log('ring:', JSON.stringify(r));
    if (!r.some(t => /Edda's Book/.test(t)) || !r.some(t => /Harvest Fair/.test(t)) || !r.some(t => /Old Mossback/i.test(t))) fail('the ring gate\'s scrapbook: ' + r.join(' | '));
    if (!r.some(t => /new/.test(t))) fail('nothing marked new');
    await shot('s1_ring');
    await shut();
    // something new finished elsewhere: it shows next time, and the old ones aren't new now
    await p.evaluate(() => { const q = JSON.parse(localStorage.getItem('bridge_quests')); q['ithils-star'] = { clues: {}, started: 1, done: Date.now() }; localStorage.setItem('bridge_quests', JSON.stringify(q)); });
    await fresh0();
    const nx = await p.evaluate(() => JSON.stringify(BridgeFarDeep.nextUp('lumar')));
    console.log('next up:', nx);
    if (!/A new echo/.test(nx)) fail('Next up: ' + nx);
    await go('singularity', 'RING GATE');
    await p.waitForTimeout(1500);
    await shot('s1_threads');
    await use('RING GATE'); await p.waitForTimeout(800);
    r = await rows();
    const fr = r.filter(t => /new ·/.test(t));
    console.log('fresh now:', JSON.stringify(fr));
    if (fr.length !== 1 || !/A Star of Your Own/.test(fr[0])) fail('the second visit: ' + JSON.stringify(fr));
    await shut();
    console.log('come back:', JSON.stringify(await p.evaluate(() => BridgeFarDeep.comeBack('singularity'))));
    console.log('s1 done');
  }

  // ---- W2 · Dorrie's specials ----
  if (part('w2')) {
    await p.evaluate(() => { BridgeClock._at('2026-10-16T13:00'); localStorage.removeItem('bridge_galley'); BridgeGalley._reset(); });   // ship's 06:00: breakfast
    await go('ship-galley', [9, 6]);
    await p.evaluate(() => { BridgeCharacter.setFacing('left');
      const c = BridgeStorage.chest('wayfarer-chest'); const k = c.slots.findIndex(x => !x); c.slots[k] = { id: 'fondue', count: 1 }; c.save();
      BridgeInventory.addItem('shoyu_ramen', 1); });
    const pass = async () => { await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'galley' && i.part === 'cook'))); await p.waitForTimeout(900); };
    await pass();
    let r = await rows(); console.log('the pass:', JSON.stringify(r.filter(t => /other worlds|fish/.test(t))));
    await pick(/other worlds/);
    r = await rows(); console.log('for the next meal:', JSON.stringify(r));
    if (!r.some(t => /Fondue.*ship/.test(t)) || !r.some(t => /Shoyu Ramen.*pack/.test(t))) fail('the goods aboard: ' + r.join(' | '));
    await shot('w2_goods');
    await pick(/^Fondue/);
    const left = await p.evaluate(() => BridgeStorage.chest('wayfarer-chest').slots.filter(x => x && x.id === 'fondue').length);
    if (left) fail('the fondue still in the chest');
    if (await p.evaluate(() => BridgeGalley.kind()) !== 'fondue') fail('special kind: ' + await p.evaluate(() => BridgeGalley.kind()));
    await pick(/Have your breakfast/);
    const f1 = await p.evaluate(() => { const f = BridgeGalley.fed(); return f && { warm: f.warm, energy: f.energy, kind: f.kind, special: f.special, warmNow: BridgeHoarfell.isWarm() }; });
    console.log('fed (fondue):', JSON.stringify(f1));
    if (!f1 || !f1.warm || f1.kind !== 'fondue') fail('breakfast with the fondue didn\'t warm you');
    const chip = await p.evaluate(() => (document.getElementById('wf-fed') || {}).title || '');
    console.log('chip:', chip);
    await shut();
    // dinner with Arcadia's noodles: a second wind
    await p.evaluate(() => BridgeClock._at('2026-10-16T14:00'));
    await pass(); await pick(/other worlds/); await pick(/Shoyu Ramen/);
    await pick(/Have your dinner/);
    const f2 = await p.evaluate(() => { const f = BridgeGalley.fed(); return f && { hp: f.hp, energy: f.energy, kind: f.kind, speed: f.speed }; });
    console.log('fed (noodles):', JSON.stringify(f2));
    if (!f2 || f2.energy !== 20 || f2.hp !== 25 || f2.speed) fail('dinner with noodles: ' + JSON.stringify(f2));
    await shut();
    // supper with your own farmhouse cheese: steadier
    await p.evaluate(() => { BridgeClock._at('2026-10-16T15:00'); BridgeInventory.addItem('farm_cheese', 1); });
    await pass(); await pick(/other worlds/); await pick(/Farmhouse Cheese/);
    await pick(/Have your supper/);
    const f3 = await p.evaluate(() => { const f = BridgeGalley.fed(); return f && { hp: f.hp, energy: f.energy, kind: f.kind }; });
    console.log('fed (cheese):', JSON.stringify(f3));
    if (!f3 || f3.hp !== 30 || f3.kind !== 'cheese') fail('supper with cheese: ' + JSON.stringify(f3));
    await shut();
    // an older save's special (no kind) is still a fish
    await p.evaluate(() => { const s = BridgeGalley._state(); s.special = 'silverfin'; delete s.kind; s.fed = null; });
    if (await p.evaluate(() => BridgeGalley.kind()) !== 'fish') fail('an old special isn\'t a fish');
    const u = await p.evaluate(() => BridgeUses.lines('fondue').map(l => l.t.replace(/<[^>]+>/g, '')));
    console.log('fondue uses:', JSON.stringify(u));
    if (!u.some(t => /Dorrie/.test(t))) fail('no Dorrie line on the fondue');
    await p.evaluate(() => { BridgeClock._at(null); BridgeGalley._reset(); });
    console.log('w2 done');
  }

  // ---- W1 · Sights that add up ----
  if (part('w1')) {
    await p.evaluate(() => { localStorage.setItem('bridge_ship_location', 'sylvara'); const s = BridgeObservatory._state(); s.seen = { canopy: 1, elflights: 2 }; s.charts = {}; });
    // a ship's day whose sight is the one Sylvara's sky still wants
    const day = await p.evaluate(() => { const t0 = Date.now(); for (let k = 0; k < 60; k++) { BridgeClock._at(t0 + k * 4 * 3600000); if (BridgeObservatory.tonight().id === 'greenmoon') return k; } return -1; });
    console.log('greenmoon on ship-day +', day);
    if (day < 0) fail('the moon never came up over Sylvara');
    await go('ship-observatory', [8, 9]);
    const c0 = await p.evaluate(() => window._coins);
    await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.part === 'scope')));
    await p.waitForTimeout(3600);
    await shot('w1_scope');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    if (await count('sky_chart_sylvara') !== 1) fail('no star chart of Sylvara\'s sky');
    console.log('coins', (await p.evaluate(() => window._coins)) - c0, '| set:', JSON.stringify(await p.evaluate(() => BridgeCodex.setOf('sky_chart_sylvara'))));
    const tst = await p.evaluate(() => BridgeQuests.log().slice(0, 3).map(l => l.t).join(' / '));
    console.log('log:', tst);
    if (!/star chart of Sylvara/i.test(tst)) fail('no word of the chart');
    await p.evaluate(() => BridgeItems.get('sky_chart_sylvara').onUse()); const t1 = await said(); await shut();
    if (!/SILVER-GREEN MOON/.test(t1)) fail('the chart reads: ' + t1.slice(0, 80));
    await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.part === 'log'))); await p.waitForTimeout(800);
    const lg = await rows(); console.log('log rows:', lg.length, JSON.stringify(lg.filter(t => /Sylvara/.test(t))));
    if (!lg.some(t => /Sylvara · charted/.test(t))) fail('the log doesn\'t show Sylvara charted');
    await shot('w1_log');
    await shut();
    // every world's sky: The night sky complete, and the log pays double
    await p.evaluate(() => { const s = BridgeObservatory._state(); BridgeObservatory.SIGHTS.forEach(S => { if (S.sky !== 'deep') s.seen[S.id] = 1; }); BridgeObservatory.charts(true); });
    await p.waitForTimeout(1500);
    console.log('night sky:', JSON.stringify(await p.evaluate(() => BridgeCodex.setOf('sky_chart_lumar'))));
    if (!await p.evaluate(() => BridgeCodex.bonus('sky'))) fail('The night sky not complete');
    const c1 = await p.evaluate(() => window._coins);
    await p.evaluate(() => { localStorage.setItem('bridge_ship_location', 'deep-space'); const s = BridgeObservatory._state(); delete s.seen[BridgeObservatory.tonight().id]; });
    await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.part === 'scope')));
    await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const paid = (await p.evaluate(() => window._coins)) - c1;
    console.log('a deep-sky sight logged, with the set:', paid);
    if (paid !== 80) fail('the log didn\'t pay double: ' + paid);
    await p.evaluate(() => { BridgeClock._at(null); localStorage.setItem('bridge_ship_location', 'lumar'); });
    console.log('w1 done');
  }

  // ---- E1 · Okafor's seeds, E2 · dispatches into the log ----
  if (part('e1')) {
    await p.evaluate(() => { const s = BridgeFarDeep._s(); s.seeds = 0; s.dispatches = []; window._fit = BridgeWayfarer.fitted; });
    await go('enigma-hydro', 'OKAFOR');
    await p.evaluate(() => { BridgeWayfarer.fitted = () => false; });
    await use('OKAFOR'); await pick(/swap for the garden/); let t = await said(); await shut();
    if (!/GREENHOUSE ON THAT SHIP/.test(t)) fail('Okafor without a greenhouse: ' + t.slice(0, 80));
    await p.evaluate(() => { BridgeWayfarer.fitted = (m) => m === 'greenhouse' || window._fit(m); });
    await use('OKAFOR'); await pick(/swap for the garden/); t = await said(); await shut();
    if (!/THREE BUNCHES/.test(t)) fail('Okafor without herbs: ' + t.slice(0, 80));
    await give('ship_herbs', 3);
    await use('OKAFOR'); await pick(/swap for the garden/); t = await said(); await shut();
    await p.waitForTimeout(800); await shut();
    if (await count('okafor_seedling') !== 1 || await count('ship_herbs') !== 0) fail('the swap: seedling ' + await count('okafor_seedling') + ', herbs ' + await count('ship_herbs'));
    console.log('the swap:', t.slice(0, 120).replace(/\n/g, ' '));
    console.log('next up:', JSON.stringify(await p.evaluate(() => BridgeFarDeep.nextUp('enigma-hydro').map(n => n.title))));
    await go('ship-greenhouse', [8, 8]);
    const bench = async () => { await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'greenhouse' && i.part === 'bench'))); await p.waitForTimeout(800); };
    await bench(); await pick(/Plant Okafor/); await said(); await shut();
    if (await count('okafor_seedling')) fail('the seedling not planted');
    await bench();
    let r = await rows(); console.log('bench:', JSON.stringify(r.filter(x => /glow/i.test(x))));
    await shot('e1_bench');
    await pick(/glow-tubers/); await p.waitForTimeout(600);
    if (await count('glow_tuber') !== 2) fail('glow-tubers: ' + await count('glow_tuber'));
    r = await rows(); console.log('bench after:', JSON.stringify(r.filter(x => /glow/i.test(x))));
    if (!r.some(x => /ready in 60 min/.test(x))) fail('the tubers not growing back');
    await shut();
    const u = await p.evaluate(() => BridgeUses.lines('glow_tuber').map(l => l.t.replace(/<[^>]+>/g, '')));
    console.log('glow-tuber uses:', JSON.stringify(u));
    if (!u.some(x => /glow brings fish/.test(x))) fail('the tuber\'s light not on its card');
    if (await p.evaluate(() => BridgeQuests.has('gate:okafor-swap'))) fail('the swap still offered once planted');
    await p.evaluate(() => { BridgeWayfarer.fitted = window._fit; });
    console.log('e1 done');
  }
  if (part('e2')) {
    await p.evaluate(() => { BridgeFarDeep._s().dispatches = []; });
    await go('enigma', 'CIPHER TERMINAL');
    for (let i = 0; i < 2; i++) { await p.evaluate(() => window.postMessage({ type: 'bridge-run-ended', game: 'cipher-room', title: 'Cipher Terminal', score: '01:23' }, '*')); await p.waitForTimeout(900); }
    const lg = await p.evaluate(() => BridgeQuests.log().filter(l => l.k === 'Dispatch decoded').map(l => l.t + ': ' + l.s));
    console.log('the log:', JSON.stringify(lg));
    if (lg.length !== 2 || !/Supply order 114/.test(lg.join()) || !/Shift swap/.test(lg.join())) fail('dispatches in the log: ' + lg.length);
    await shot('e2_toast');
    if (lg.some(x => /signal|wren|listen/i.test(x))) fail('a dispatch about the story');
    await p.evaluate(() => window.postMessage({ type: 'bridge-run-ended', game: 'asteroids', score: 9 }, '*')); await p.waitForTimeout(700);
    if (await p.evaluate(() => BridgeFarDeep._s().dispatches.length) !== 2) fail('another game filed a dispatch');
    await go('enigma-hydro', 'OKAFOR');
    await use('OKAFOR'); await pick(/Station dispatches/); const t = await said();
    if (!/PEACHES|POTTING GRIT/.test(t)) fail('Okafor\'s read-back: ' + t.slice(0, 100));
    await shot('e2_okafor'); await shut();
    if (!(await p.evaluate(() => BridgeQuests.leadsOpen())).includes('enigma-dispatches')) fail('no lead to the terminal');
    console.log('e2 done');
  }

  // ---- Y5 · The loomer's cloak ----
  if (part('y5')) {
    await p.evaluate(() => { BridgeFarDeep._s().cloak = 0; ['warden_cloak', 'silk_cocoon', 'owlmoss'].forEach(id => BridgeInventory.removeItem(id, BridgeInventory.getCount(id))); });
    // Aerin, wherever she is today: her lead
    await go('sylvara-roots', 'WEAVER');
    const aerinHere = await p.evaluate(() => !!BridgeWorld.getWorld().interactions.find(i => i.label === 'WARDEN' && i.type === 'dialog'));
    if (!aerinHere) await go('sylvara', 'WARDEN');
    await use('WARDEN'); await pick(/Your cloak/); await said(); await shut();
    if (!(await p.evaluate(() => BridgeQuests.leadsOpen())).includes('warden-cloak')) fail('Aerin\'s lead not in the journal');
    if (!aerinHere) await go('sylvara-roots', 'WEAVER');
    await use('WEAVER'); await pick(/warden's cloak/); let t = await said(); await shut();
    if (!/SHORT 4 SILK COCOON/.test(t)) fail('Ysane short: ' + t.slice(-120));
    await give('silk_cocoon', 4); await give('owlmoss', 3);
    console.log('next up:', JSON.stringify(await p.evaluate(() => BridgeFarDeep.nextUp('sylvara-roots').map(n => n.title))));
    const c0 = await p.evaluate(() => window._coins);
    await use('WEAVER'); await pick(/warden's cloak/); await p.waitForTimeout(600);
    await shot('y5_ysane');
    await pick(/Weave me/); t = await said(); await shut(); await p.waitForTimeout(600); await shut();
    console.log('woven:', t.slice(0, 100).replace(/\n/g, ' '));
    if (await count('warden_cloak') !== 1 || await count('silk_cocoon') || await count('owlmoss')) fail('the weaving: cloak ' + await count('warden_cloak'));
    if (c0 - await p.evaluate(() => window._coins) !== 150) fail('Ysane\'s fee');
    // creatures notice you later while it's carried; not once one's after you; the valley's howl still sets it
    const r = await p.evaluate(() => {
      const w = { interactions: [], collisions: [[0]] }, h = BridgeCombat.spawn(w, 'wolf' in BridgeCombat.CREATURES ? 'wolf' : 'hound', 0, 0), out = { with: h.aggroRange };
      const base = BridgeCombat.CREATURES[h.creature].aggro; out.base = base;
      h.aggroRange = 16; out.howl = h.aggroRange;
      h._engaged = true; out.engaged = h.aggroRange; h._engaged = false;
      BridgeInventory.removeItem('warden_cloak', 1); out.without = h.aggroRange; BridgeInventory.addItem('warden_cloak', 1);
      return out; });
    console.log('noticed from:', JSON.stringify(r));
    if (Math.abs(r.with - 16 * 0.8) > 0.01 && Math.abs(r.with - r.base * 0.8) > 0.01) fail('the cloak didn\'t hush it');
    if (r.howl !== 12.8 || r.engaged !== 16 || r.without !== 16) fail('aggro: ' + JSON.stringify(r));
    for (const id of ['warden_cloak', 'silk_cocoon']) console.log(id, 'uses:', JSON.stringify(await p.evaluate((id) => BridgeUses.lines(id).map(l => l.t.replace(/<[^>]+>/g, '')), id)));
    if (!(await p.evaluate(() => BridgeUses.lines('warden_cloak').map(l => l.t).join(' '))).includes('notice you later')) fail('the cloak\'s card');
    console.log('y5 done');
  }

  console.log(errors ? errors + ' FAILED' : 'far_deeper OK');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
