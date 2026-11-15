// Lumar, deeper (spec-deeper-worlds L4–L7; js/lumar-deep.js and friends). Played through as a pilot would:
//   sovereign  Harrow's gossip → the Arsenal's ledger (not logs; a share put in from the pack and a ship's hold at
//              Crownhaven) → the launch on a regatta Friday at the Arsenal (the happening, the crowd, the last shore) →
//              coins, a plan, your name in the book; the stocks' and the fitting-out quay's words after; kept across a reload
//   bounty     the WANTED board's three (the same on two pages, new next week), read → a wanted ship hunts you on her sea →
//              sunk in a real sea fight → claimed from Scarlet Dee (coins, plunder), not twice
//   riddle     the dragon's riddle: the same on two pages, a wrong answer (no coin, no second try), the next Lumar day a
//              right one (a heron coin); the Map's Come back for, the Journal's Next up
//   booths     the Old Bridge's three booths: a silk line bought and used (the rare-fish odds while it's on), a posy, a
//              toffee ship and who loves it; the item cards' uses; a phone
// node world/lumar_deeper.js [shots] [part: sovereign|bounty|riddle|booths]
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname + '/shots';
const ONLY = process.argv[3] || '';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errors = 0;
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const part = (n) => !ONLY || ONLY === n;
  const open = async (vp, at, fleet) => {
    const ctx = await b.newContext(vp || { viewport: { width: 1100, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript((fleet) => {
      if (sessionStorage.getItem('ld_fresh')) return;                // once: a reload keeps what was saved
      sessionStorage.setItem('ld_fresh', '1');
      ['bridge_quests', 'bridge_quest_meta', 'bridge_lumar_deep', 'bridge_letters', 'bridge_workshop', 'bridge.inventory.v2'].forEach(k => localStorage.removeItem(k));
      localStorage.setItem('bridge_ship_location', 'lumar');
      if (fleet) localStorage.setItem('bridge_fleet', JSON.stringify(fleet));
    }, fleet || null);
    await p.goto('http://127.0.0.1:8766/bridge/' + (at ? '?at=' + at : '')); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
      window._coins = 5000;
      BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
      BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
    });
    const H = { p };
    H.ev = (f, a) => p.evaluate(f, a);
    H.go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', at ? { worldId: w, spawn: { x: at[0], y: at[1] } } : { worldId: w }); r(); })), [w, at]); await p.waitForTimeout(2500); };
    H.shut = async () => {
      for (let i = 0; i < 4; i++) {
        if (await p.evaluate(() => !!document.getElementById('item-get'))) { await p.keyboard.press('Space'); await p.waitForTimeout(600); continue; }
        const isOpen = await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo'));
        if (!isOpen) break;
        const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close|done|walk|not|later|good|step|back away/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
        if (!hit) await p.keyboard.press('Escape');
        await p.waitForTimeout(500);
      }
    };
    H.use = async (label) => {
      const ok = await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); if (i) BridgeInteractions.execute(i); return !!i; }, label);
      if (!ok) fail('no ' + label + ' in ' + await p.evaluate(() => BridgeWorld.getWorldId()));
      await p.waitForTimeout(1500);
    };
    H.inter = (label) => p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); return i ? { type: i.type, act: i.act, prompt: i.prompt, x: i.x, y: i.y, dialog: i.dialog } : null; }, label);
    H.topics = () => p.evaluate(() => [...document.querySelectorAll('.wd-opt')].map(b => b.textContent));
    H.ask = async (q) => { const ok = await p.evaluate((q) => { const b = [...document.querySelectorAll('.wd-opt')].find(e => e.textContent === q); if (b) b.click(); return !!b; }, q); await p.waitForTimeout(1400); if (!ok) fail('no topic "' + q + '": ' + JSON.stringify(await H.topics())); return ok; };
    H.text = () => p.evaluate(() => ((document.querySelector('.wd-text') || document.querySelector('.world-dialog')) || {}).innerText || '');
    H.said = async () => {
      let last = '', same = 0;
      for (let i = 0; i < 40 && same < 3; i++) { await p.waitForTimeout(400); const t = await H.text(); same = t && t === last ? same + 1 : 0; last = t; }
      return last;
    };
    H.rows = () => p.evaluate(() => [...document.querySelectorAll('.world-dialog .wd-sell-row')].map(r => r.innerText.replace(/\n+/g, ' / ')));
    H.pickRow = async (rx) => { const ok = await p.evaluate((src) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row')].find(e => new RegExp(src, 'i').test(e.innerText)); if (r) r.click(); return !!r; }, rx); await p.waitForTimeout(800); if (!ok) fail('no row /' + rx + '/: ' + JSON.stringify(await H.rows())); return ok; };
    H.count = (id) => p.evaluate((id) => BridgeInventory.getCount(id), id);
    H.give = (id, n) => p.evaluate(([id, n]) => BridgeInventory.give(id, n), [id, n]);
    H.coins = () => p.evaluate(() => window._coins);
    H.st = () => p.evaluate(() => JSON.parse(localStorage.getItem('bridge_lumar_deep') || '{}'));
    H.nextUp = () => p.evaluate(() => (BridgeLumarDeep.nextUp(BridgeWorld.getWorldId()) || []).map(n => n.title + ': ' + n.text));
    H.back = (w) => p.evaluate((w) => BridgeLumarDeep.comeBack(w), w);
    H.leads = () => p.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('bridge_quest_meta') || '{}').leads) || {}));
    return H;
  };

  // ---- L7 · The Sovereign II -------------------------------------------------------------------------------------------
  if (part('sovereign')) {
    // Friday 20 November 2026 at 1:55pm Eastern: regatta day, five minutes before the 2pm slot
    const fleet = { ships: [{ id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] },
                            { id: 'c2', type: 'cutter', name: 'Swift', at: 'lumar-crown', hull: 1, hold: { iron_bar: 3 }, guns: [], fits: [] }], sailing: 'gull', n: 2, crew: [], cn: 0, hired: {} };
    const H = await open(null, '2026-11-20T13:55', fleet), p = H.p;
    await H.go('lumar-crown-hill', [20, 20]);
    await H.use('ACADEMY MASTER'); await H.ask('Heard anything?'); await H.shut();
    if ((await H.leads()).indexOf('sovereign') < 0) fail('Harrow\'s gossip isn\'t a lead');
    await H.go('lumar-crown-arsenal', [52, 16]);
    const led = await H.inter('THE ARSENAL');
    console.log('the office:', JSON.stringify(led));
    if (!led || led.type !== 'lumardeep' || led.act !== 'ledger') fail('THE ARSENAL isn\'t the ledger');
    if (!(await H.back('lumar-crown-arsenal')).some(s => /Sovereign/.test(s))) fail('no Come back for at the Arsenal');
    await H.give('oak_log', 6); await H.give('oak_plank', 12); await H.give('iron_bar', 5); await H.give('rope', 10); await H.give('pitch', 6); await H.give('sailcloth', 3);
    await H.use('THE ARSENAL');
    let t = await H.said(), rows = await H.rows();
    console.log('ledger rows:', JSON.stringify(rows));
    if (!/CLERK/.test(t)) fail('the clerk isn\'t in the ledger: ' + t.slice(0, 120));
    if (rows.some(r => /Oak Log/i.test(r))) fail('the ledger asks for logs');
    await p.screenshot({ path: OUT + '/ld_sov_ledger.png' });
    for (const rx of ['Oak Plank', 'Iron Bar', 'Rope', 'Pitch', 'Sailcloth']) await H.pickRow(rx);
    let S = await H.st();
    console.log('entered:', JSON.stringify(S.sov));
    if (S.sov.given.iron_bar !== 8) fail('the hold at Crownhaven didn\'t make up the iron (' + S.sov.given.iron_bar + ')');
    if (await H.count('oak_log') !== 6) fail('logs were taken');
    if (S.sov.done) fail('done one bolt of sailcloth short');
    const hold = await H.ev(() => (BridgeFleet.get('c2').hold || {}).iron_bar || 0);
    if (hold !== 0) fail('the ship\'s iron is still in her hold: ' + hold);
    console.log('next up, one short:', JSON.stringify(await H.nextUp()));
    if (!(await H.nextUp()).some(n => /Sovereign II · 39\/40/.test(n))) fail('Next up doesn\'t count the share');
    await H.shut();
    await H.give('sailcloth', 1);
    await H.use('THE ARSENAL'); await H.pickRow('Sailcloth');
    S = await H.st();
    if (!S.sov.done) fail('not done with every nail in');
    t = await H.said();
    console.log('done:', t.slice(0, 200).replace(/\n/g, ' '));
    if (!/REGATTA DAY/.test(t)) fail('the clerk doesn\'t send you to the launch');
    await H.shut();
    if (!(await H.nextUp()).some(n => /launches/.test(n))) fail('Next up doesn\'t point at the launch');
    if ((await H.ev(() => BridgeLumarDeep.launchDue(Math.floor(BridgeClock.now() / 1200000))))) fail('due before the slot it starts in');
    // the 2pm slot: the launch is on
    await H.ev(() => BridgeClock._at('2026-11-20T14:02'));
    await p.waitForTimeout(2500);
    const live = await H.ev(() => BridgeEvents.live ? BridgeEvents.live('lumar-crown-arsenal').map(e => e.name) : []);
    console.log('live at the Arsenal:', JSON.stringify(live));
    if (!live.some(n => /Sovereign/.test(n))) fail('no launch on a regatta Friday');
    await H.go('lumar-crown-arsenal', [44, 30]);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: OUT + '/ld_sov_launch.png' });
    const plan0 = await H.ev(() => BridgeWorkshop.known('long_nine'));
    const c0 = await H.coins();
    await H.use('THE LAUNCH');
    t = await H.said();
    console.log('the shore:', t.slice(0, 160).replace(/\n/g, ' '));
    if (!/MAUL/.test(t)) fail('no maul');
    await p.screenshot({ path: OUT + '/ld_sov_shore.png' });
    await H.shut();
    if (await H.coins() - c0 !== 600) fail('the launch paid ' + (await H.coins() - c0));
    if (plan0 || !(await H.ev(() => BridgeWorkshop.known('long_nine')))) fail('the long nine\'s plan wasn\'t taught');
    await H.use('THE LAUNCH'); await H.shut();
    if (await H.coins() - c0 !== 600) fail('paid twice');
    await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide(); });
    await H.go('lumar-crown-arsenal', [52, 16]);
    const stocks = await H.inter('ON THE STOCKS'), fit = await H.inter('FITTING OUT');
    if (!/SISTER/.test(stocks.dialog || '')) fail('the stocks still hold the Sovereign: ' + stocks.dialog);
    if (!/SOVEREIGN II, FITTING OUT/.test(fit.dialog || '')) fail('she isn\'t at the fitting-out quay');
    await H.use('THE ARSENAL');
    rows = await H.rows();
    if (!rows.some(r => /BECK/.test(r))) fail('your name isn\'t in the book: ' + JSON.stringify(rows));
    await p.screenshot({ path: OUT + '/ld_sov_book.png' });
    await H.shut();
    // a regatta Friday after: no launch (she's gone)
    await H.ev(() => BridgeClock._at('2026-11-27T15:02'));
    if ((await H.ev(() => BridgeLumarDeep.launchDue(Math.floor(BridgeClock.now() / 1200000))))) fail('she launches again the next Friday');
    await p.context().close();
  }

  // ---- L6 · Cinder Key's bounties --------------------------------------------------------------------------------------
  if (part('bounty')) {
    const fleet = { ships: [{ id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] },
                            { id: 'c2', type: 'cutter', name: 'Swift', at: 'lumar-cinder', hull: 1, hold: {}, guns: ['long_nine', 'long_nine'], fits: [] }],
                    sailing: 'c2', n: 2, crew: [{ id: 'k1', name: 'Tam', role: 'gunner', skill: 2, sea: 'Crimson', ship: 'c2' }], cn: 1, hired: {} };
    const H = await open(null, '2026-11-17T21:00', fleet), p = H.p;
    const H2 = await open(null, '2026-11-17T21:00');
    const a = await H.ev(() => BridgeLumarDeep.bounties().map(b => b.id + ' ' + b.ship + ' ' + b.captain));
    const a2 = await H2.ev(() => BridgeLumarDeep.bounties().map(b => b.id + ' ' + b.ship + ' ' + b.captain));
    const nx = await H.ev(() => BridgeLumarDeep.bounties(BridgeClock.now() + 7 * 86400000).map(b => b.ship).join(','));
    console.log('this week:', JSON.stringify(a), '· next week:', nx);
    if (JSON.stringify(a) !== JSON.stringify(a2)) fail('two pages read different boards: ' + JSON.stringify(a2));
    if (nx === a.map(s => s.split(' ').slice(1, 3).join(' ')).join(',')) fail('the same three next week');
    await H2.p.context().close();
    await H.go('lumar-cinder-tavern', [9, 8]);
    await H.go('lumar-crown-pub', [10, 8]);
    await H.use('CUTTER JOSS'); await H.ask('Bounties?'); await H.shut();
    if ((await H.leads()).indexOf('bounties') < 0) fail('Joss\'s gossip isn\'t a lead');
    if (await H.ev(() => BridgeLumarDeep.hunting(['crimson']))) fail('hunted before reading the board');
    await H.go('lumar-cinder', [28, 23]);
    await H.use('WANTED');
    const wt = await H.said(), wr = await H.rows();
    console.log('the board:', JSON.stringify(wr));
    if (wr.length !== 3) fail('the board shows ' + wr.length);
    if (!/HUNTING/.test(wt)) fail('no word that they\'ll come looking');
    await p.screenshot({ path: OUT + '/ld_bounty_board.png' });
    await H.shut();
    const W = await H.ev(() => BridgeLumarDeep.hunting(['crimson']));
    if (!W || W.kind !== 'raider') fail('no raider hunting on the Crimson: ' + JSON.stringify(W));
    // out to sea from Cinder Key: the wanted raider comes for her
    await H.ev(() => { BridgeFleet.sail('c2'); BridgeSloop.start('lumar-cinder', null, { aboard: true }); });
    await p.waitForTimeout(7000);
    await H.ev(() => BridgeSloop._commit('lumar-crimson'));
    await p.waitForTimeout(2500);
    let foe = null;
    for (let i = 0; i < 40 && !foe; i++) {
      foe = await H.ev(() => { BridgeSeaFight._foes().length = 0; BridgeSeaFight.plan(); const o = BridgeSeaFight._foes()[0]; return o && o.wanted ? { id: o.wanted, name: o.K.name, kind: o.kind } : null; });
    }
    console.log('the hunter:', JSON.stringify(foe));
    if (!foe) fail('no wanted ship came');
    else {
      if (foe.id !== W.id || foe.kind !== 'raider') fail('the wrong ship: ' + JSON.stringify(foe));
      // put her on the beam, nearly sunk, and let the guns finish her
      await H.ev(() => { const bt = BridgeSloop._boat(), o = BridgeSeaFight._foes()[0]; o.state = 'fight'; o.x = bt.x + Math.cos(bt.h + Math.PI / 2) * 4; o.r = bt.r + Math.sin(bt.h + Math.PI / 2) * 4; o.h = bt.h; o.hp = 2; bt.v = 0; });
      await p.waitForTimeout(1200);
      await p.screenshot({ path: OUT + '/ld_bounty_fight.png' });
      for (let i = 0; i < 30; i++) {
        await p.waitForTimeout(500);
        if ((await H.st()).bounty && (await H.st()).bounty.beaten[W.id]) break;
        await H.ev(() => { const bt = BridgeSloop._boat(), o = BridgeSeaFight._foes()[0]; if (o && o.state !== 'sink') { o.x = bt.x + Math.cos(bt.h + Math.PI / 2) * 4; o.r = bt.r + Math.sin(bt.h + Math.PI / 2) * 4; o.v = 0; } });
      }
      if (!(await H.st()).bounty.beaten[W.id]) fail('sunk but not noted');
    }
    await H.ev(() => { try { BridgeSloop.stop && BridgeSloop.stop(); } catch (e) { } });
    await H.go('lumar-cinder', [28, 30]);
    if (!(await H.nextUp()).some(n => /bounty to claim/.test(n))) fail('Next up doesn\'t say claim it');
    const c0 = await H.coins(), idol0 = await H.count('plunder_idol');
    await H.use('HARBOURMASTER');
    if (!(await H.topics()).includes('The bounties')) fail('Dee has no bounties topic: ' + JSON.stringify(await H.topics()));
    await H.ask('The bounties');
    const dt = await H.said();
    console.log('Dee:', dt.slice(0, 200).replace(/\n/g, ' '));
    await p.screenshot({ path: OUT + '/ld_bounty_claim.png' });
    await H.shut();
    if (await H.coins() - c0 !== 450) fail('the bounty paid ' + (await H.coins() - c0));
    if (await H.count('plunder_idol') !== idol0 + 1) fail('no idol from the cabin');
    await H.use('HARBOURMASTER'); await H.ask('The bounties'); await H.shut();
    if (await H.coins() - c0 !== 450) fail('paid twice');
    if (await H.ev(() => BridgeLumarDeep.hunting(['crimson']))) fail('the sunk raider still hunting');
    // a crewmate's word: a sunk wanted ship counts for her too (js/seafight.js sf-prize carries it)
    const pid = await H.ev(() => BridgeLumarDeep.bounties()[1].id);
    await H.ev((id) => BridgeLumarDeep.beaten(id), pid);
    if (!(await H.st()).bounty.beaten[pid]) fail('beaten(id) from the wire not kept');
    await p.context().close();
  }

  // ---- L5 · The dragon's riddle ----------------------------------------------------------------------------------------
  if (part('riddle')) {
    const H = await open(null, '2026-11-18T10:00'), p = H.p;
    const H2 = await open(null, '2026-11-18T10:00');
    const r1 = await H.ev(() => BridgeLumarDeep.riddle()), r2 = await H2.ev(() => BridgeLumarDeep.riddle());
    if (JSON.stringify(r1) !== JSON.stringify(r2)) fail('two pages, two riddles');
    if (r1.options.length !== 4 || r1.options.indexOf(r1.answer) < 0) fail('the options: ' + JSON.stringify(r1));
    if (/EGG|LISTEN/.test(r1.q)) fail('the riddle touches the main story: ' + r1.q);
    await H2.p.context().close();
    const all = await H.ev(() => { const out = {}; for (let i = 0; i < 60; i++) { const r = BridgeLumarDeep.riddle(BridgeClock.now() + i * 8 * 3600000); out[r.answer] = 1; if (/EGG|LISTEN/.test(r.q)) out.BAD = r.q; } return Object.keys(out); });
    console.log('answers over 60 Lumar days:', all.join(' | '));
    if (all.indexOf('BAD') >= 0) fail('a riddle about the egg');
    await H.go('lumar-crimson', [30, 30]);
    const corra = await H.ev(() => BridgeWorld.getWorld().interactions.find(i => i.label === 'CRIMSON WATCHER'));
    if (corra) { await H.use('CRIMSON WATCHER'); await H.ask('The dragon'); await H.shut(); if ((await H.leads()).indexOf('dragon-riddle') < 0) fail('Corra\'s word isn\'t a lead'); }
    await H.go('lumar-crimson-cave', [12, 7]);
    if (!(await H.back('lumar-crimson-cave')).some(s => /riddle/.test(s))) fail('no Come back for in the cave');
    await H.use('DRAGON');
    const t = await H.said();
    console.log('the riddle:', t.replace(/\n/g, ' ').slice(-200));
    if (t.indexOf(r1.q) < 0) fail('not today\'s riddle');
    await p.screenshot({ path: OUT + '/ld_riddle_ask.png' });
    const wrong = r1.options.find(o => o !== r1.answer);
    await H.pickRow('^' + wrong.replace(/'/g, '.'));
    const tw = await H.said();
    if (!/NO\./.test(tw)) fail('a wrong answer wasn\'t refused: ' + tw.slice(0, 100));
    await H.shut();
    if (await H.count('heron_coin') !== 0) fail('a coin for a wrong answer');
    await H.use('DRAGON');
    if (await H.rows().then(r => r.length)) fail('a second guess the same day');
    await H.shut();
    // the next Lumar day: a new riddle, and the right answer
    await H.ev(() => BridgeClock._at('2026-11-18T18:30'));
    const r3 = await H.ev(() => BridgeLumarDeep.riddle());
    if (r3.day === r1.day) fail('the same Lumar day eight hours on');
    console.log('next up the next day:', JSON.stringify(await H.nextUp()));
    if (!(await H.nextUp()).some(n => /riddle/.test(n))) fail('Next up doesn\'t mention a new riddle');
    await H.use('DRAGON');
    await H.pickRow('^' + r3.answer.replace(/'/g, '.'));
    const tr = await H.said();
    console.log('right:', tr.slice(0, 160).replace(/\n/g, ' '));
    await p.screenshot({ path: OUT + '/ld_riddle_right.png' });
    await H.shut();
    if (await H.count('heron_coin') !== 1) fail('no heron coin for the right answer');
    await p.context().close();
  }

  // ---- L4 · The Old Bridge's booths ------------------------------------------------------------------------------------
  if (part('booths')) {
    for (const phone of [false, true]) {
      const vp = phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : null;
      const H = await open(vp, '2026-11-18T11:00'), p = H.p;
      await H.go('lumar-crown-bridge', [24, 11]);
      const booths = await H.ev(() => BridgeWorld.getWorld().interactions.filter(i => /BOOTH/.test(i.label)).map(i => i.label + '@' + i.x + ',' + i.y + ':' + i.type));
      console.log((phone ? 'phone ' : '') + 'booths:', booths.join(' '));
      if (booths.filter(s => /lumardeep/.test(s)).length !== 3) fail('the booths aren\'t open: ' + booths.join(' '));
      if (phone) {
        await H.use('SWEET BOOTH');
        await p.screenshot({ path: OUT + '/ld_booth_phone.png' });
        await H.pickRow('Toffee Ship');
        await H.shut();
        if (await H.count('toffee_ship') !== 1) fail('no toffee ship on the phone');
        await p.context().close();
        continue;
      }
      await H.use('TACKLE BOOTH');
      await p.screenshot({ path: OUT + '/ld_booth_tackle.png' });
      await H.pickRow('Silk Line');
      await H.shut();
      if (await H.count('silk_line') !== 1) fail('no silk line bought');
      if (await H.coins() !== 4970) fail('the line cost ' + (5000 - await H.coins()));
      const uses = await H.ev(() => BridgeUses.lines('silk_line').map(l => l.t.replace(/<[^>]+>/g, '')));
      console.log('silk line uses:', JSON.stringify(uses));
      if (!uses.length || uses.some(u => /only worth selling/i.test(u))) fail('the line has no use on its card');
      if (await H.ev(() => BridgeLumarDeep.lineOn())) fail('the line on before it\'s used');
      await H.ev(() => BridgeInventory.useItem('silk_line'));
      await p.waitForTimeout(500);
      if (!(await H.ev(() => BridgeLumarDeep.lineOn()))) fail('the line didn\'t go on');
      if (await H.count('silk_line') !== 0) fail('the line wasn\'t used up');
      await H.ev(() => BridgeClock._at('2026-11-18T18:30'));
      if (await H.ev(() => BridgeLumarDeep.lineOn())) fail('the line still on after a Lumar day');
      await H.ev(() => BridgeClock._at('2026-11-18T11:00'));
      await H.use('FLOWER BOOTH'); await H.pickRow('Posy'); await H.shut();
      if (await H.count('posy') !== 1) fail('no posy');
      await H.use('SWEET BOOTH'); await H.pickRow('Toffee Ship'); await H.shut();
      if (await H.count('toffee_ship') !== 1) fail('no toffee ship');
      const tu = await H.ev(() => BridgeUses.lines('toffee_ship').map(l => l.t.replace(/<[^>]+>/g, '')));
      console.log('toffee uses:', JSON.stringify(tu));
      if (!tu.some(u => /love/i.test(u))) fail('nobody loves a toffee ship on its card');
      if (!(await H.back('lumar-crown-bridge')).some(s => /booths/.test(s))) fail('no Come back for on the bridge');
      await H.go('lumar-crown-pub', [10, 8]);
      await H.use('SALT ANNIE'); await H.ask('Advice for a captain'); await H.shut();
      if ((await H.leads()).indexOf('bridge-booths') < 0) fail('Annie\'s advice isn\'t a lead');
      await p.context().close();
    }
  }

  console.log(errors ? errors + ' errors' : 'lumar deeper ok');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
