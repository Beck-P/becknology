const { chromium } = require('playwright');
// Hoarfell and Verdance, deeper (spec-deeper-worlds H5–H7, V4–V7; apps/bridge/CLAUDE.md *Hoarfell and Verdance,
// deeper*). Each part plays its thing through as a player would:
//   v4      the village's second ring: nothing before the five; this week's want on the fund board, short and then paid
//           (coins and sunflowers gone), the bench stood by the pond (solid, a line of its own), none next until the
//           week turns; the ring's Next up, Come back for and Juniper's topic; Best Kept Village read on a Friday, paid
//           once; all five done, shot by day and by night (the lamp and the moonflowers lit), and on a phone
// node world/hills_deeper.js [shots] [part]
const OUT = process.argv[2] || __dirname + '/shots';
const ONLY = process.argv[3] || '';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
  const p = await ctx.newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  const coins = async (n) => p.evaluate((n) => {
    window._coins = n;
    BridgeProgression.awardCoins = (k) => { window._coins += k; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = (k) => Promise.resolve(window._coins >= k ? (window._coins -= k, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
    if (BridgeProgression.getBalance) BridgeProgression.getBalance = () => Promise.resolve(window._coins);
  }, n);
  await p.evaluate(() => {
    ['bridge_quests', 'bridge_quest_meta', 'bridge_crew', 'bridge_village'].forEach(k => localStorage.removeItem(k));
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
    ['verdance', 'hoarfell', 'lumar', 'arcadia'].forEach((r) => BridgeWeather._pin && BridgeWeather._pin(r, 'clear'));
  });
  await coins(5000);
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]); await p.waitForTimeout(2500); };
  const shut = async () => {
    for (let i = 0; i < 4; i++) {
      const open = await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo, #item-get'));
      if (!open) break;
      const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close|done|back/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
      if (!hit) await p.keyboard.press('Escape');
      await p.waitForTimeout(500);
      if (await p.evaluate(() => !!document.getElementById('item-get'))) { await p.keyboard.press('Space'); await p.waitForTimeout(500); }
    }
  };
  const use = async (label) => {
    const ok = await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); if (i) BridgeInteractions.execute(i); return !!i; }, label);
    if (!ok) fail('no ' + label + ' in ' + await p.evaluate(() => BridgeWorld.getWorldId()));
    await p.waitForTimeout(1400);
    return ok;
  };
  const rows = () => p.evaluate(() => [...document.querySelectorAll('#world-overlay .wd-opt, #world-overlay .wd-sell-row, #world-overlay button')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  const pick = async (re) => {
    const ok = await p.evaluate((src) => { const r = new RegExp(src, 'i'); const b = [...document.querySelectorAll('#world-overlay .wd-opt, #world-overlay .wd-sell-row, #world-overlay button')].find(e => r.test(e.innerText) && !e.disabled && !e.classList.contains('none')); if (b) b.click(); return !!b; }, re.source);
    if (!ok) fail('no row ' + re + ' in: ' + (await rows()).join(' | '));
    await p.waitForTimeout(1200);
    return ok;
  };
  const text = () => p.evaluate(() => ((document.querySelector('#world-overlay .wd-text') || document.querySelector('#world-overlay .world-dialog')) || {}).innerText || '');
  const said = async () => {
    let last = '', same = 0;
    for (let i = 0; i < 60 && same < 3; i++) {
      await p.waitForTimeout(400);
      const t = await p.evaluate(() => document.querySelector('.world-dialog.typing') ? '' : ((document.querySelector('.wd-text') || document.querySelector('.world-dialog')) || {}).innerText || '');
      same = t && t === last ? same + 1 : 0; last = t;
    }
    return last;
  };
  const count = (id) => p.evaluate((id) => BridgeInventory.getCount(id), id);
  const give = (id, n) => p.evaluate(([id, n]) => BridgeInventory.addItem(id, n), [id, n]);
  const part = (n) => !ONLY || ONLY === n;
  // a weekday morning ET in a given week from now (dow 0 = Monday), so people are about and the week is known
  const pinDay = (weeks, dow, hour) => p.evaluate(([w, d, h]) => {
    const now = Date.now(), e = BridgeClock.etNow(), day = Math.floor(e / 86400000), mon = day - ((day + 3) % 7);
    const target = (mon + w * 7 + d) * 86400000 + h * 3600000;    // in ET ms
    BridgeClock._at(now + (target - e));
    return new Date(BridgeClock.etNow()).toISOString();
  }, [weeks, dow, hour]);

  // ---- V4 · the village's second ring ----
  if (part('v4')) {
    await pinDay(0, 1, 10);                                          // a Tuesday morning
    await go('verdance-east', [15, 15]);
    if (await p.evaluate(() => BridgeVillage.wantNow())) fail('a want before the five are done');
    if (await p.evaluate(() => BridgeQuests.has('gate:village-wants'))) fail('Juniper\'s topic open before the five');
    await p.evaluate(() => { ['bridge', 'cafe', 'dairy', 'homes', 'station'].forEach(id => BridgeVillage._finish(id)); });
    await go('verdance-east', [15, 15]);
    const w = await p.evaluate(() => (BridgeVillage.wantNow() || {}).id);
    if (w !== 'bench') fail('first want: ' + w);
    await use('THE VILLAGE FUND');
    const r1 = await rows();
    console.log('fund board:', r1.slice(0, 4).join(' | '));
    if (!r1.some(r => /This week: a bench by the duck pond/.test(r))) fail('the bench not on the board');
    await pick(/This week: a bench/);
    if (!/YOU'RE SHORT: 4 SUNFLOWER/.test(await text())) fail('short of sunflowers not said: ' + (await text()).slice(-80));
    await shut();
    await give('sunflower', 5);
    await use('THE VILLAGE FUND');
    await pick(/This week: a bench/);
    await pick(/Pay for it/);
    await p.waitForTimeout(800);
    const said1 = await said();
    if (!/DONE BY THE AFTERNOON/.test(said1)) fail('paying said: ' + said1.slice(0, 120));
    if (await count('sunflower') !== 1) fail('sunflowers left: ' + await count('sunflower'));
    if (await p.evaluate(() => window._coins) !== 4700) fail('coins after the bench: ' + await p.evaluate(() => window._coins));
    await shut();
    await p.waitForTimeout(2500);                                    // (Station Road reloads with it)
    const bench = await p.evaluate(() => { const W = BridgeWorld.getWorld(); return { solid: W.collisions[20][9], it: W.interactions.find(i => i.x === 9 && i.y === 20) }; });
    if (bench.solid !== 1) fail('the bench is not solid');
    if (!bench.it || !/BENCH/.test(bench.it.label)) fail('no line at the bench: ' + JSON.stringify(bench.it));
    if (await p.evaluate(() => BridgeVillage.wantNow())) fail('a second want the same week');
    if (!(await p.evaluate(() => BridgeQuests.has('gate:village-wants')))) fail('Juniper\'s topic still shut');
    // Juniper's topic gives the lead
    await use('JUNIPER');
    const jt = await rows();
    if (!jt.some(r => /The fund/.test(r))) fail('Juniper has no topic on the fund: ' + jt.join(' | '));
    else { await pick(/^The fund/); if (!(await p.evaluate(() => (JSON.parse(localStorage.getItem('bridge_quest_meta') || '{}').leads || {})['village-wants']))) fail('no lead from Juniper'); }
    await shut();
    // the next week: the duck house goes up; Next up and Come back for say so
    await pinDay(1, 1, 10);
    const w2 = await p.evaluate(() => (BridgeVillage.wantNow() || {}).id);
    if (w2 !== 'ducks') fail('the second week\'s want: ' + w2);
    const nu = await p.evaluate(() => BridgeVillage.nextUp().map(x => x.title).join(' / '));
    if (!/house for the ducks/.test(nu)) fail('Next up: ' + nu);
    const cb = await p.evaluate(() => BridgeVillage.comeBack('verdance-east').join(' / '));
    if (!/little want/.test(cb)) fail('Come back for: ' + cb);
    const card = await p.evaluate(() => BridgeUses.html('wheat'));
    if (!/Brambleford.s fund/.test(card)) fail('wheat\'s card says nothing of the fund');
    // Best Kept Village on the Friday of that week: read, paid once
    await pinDay(1, 4, 10);
    if (!(await p.evaluate(() => BridgeVillage.judging()))) fail('no judging on the Friday');
    await go('verdance-east', [15, 15]);
    await use('THE VILLAGE FUND');
    const before = await p.evaluate(() => window._coins);
    await pick(/Best Kept Village/);
    const rep = await said();
    if (!/HIGHLY COMMENDED/.test(rep) || !/BENCH BY THE DUCK POND/.test(rep)) fail('the judge said: ' + rep.slice(0, 200));
    await p.waitForTimeout(800);
    if (await p.evaluate(() => window._coins) !== before + 100) fail('the judging paid ' + (await p.evaluate(() => window._coins) - before));
    if (await count('yellow_rosette') !== 1) fail('no rosette');
    await shut();
    if (await p.evaluate(() => BridgeVillage.judging())) fail('judged twice in a week');
    // all five, then look at it by day, night and on a phone
    await p.evaluate(() => { ['ducks', 'tubs', 'lamp', 'birds'].forEach(id => BridgeVillage._want(id, BridgeClock.etNow() - 8 * 86400000)); });
    await go('verdance-east', [10, 22]);
    const solid = await p.evaluate(() => { const C = BridgeWorld.getWorld().collisions; return [[9, 20], [8, 20], [12, 18], [14, 14], [16, 14]].map(t => C[t[1]][t[0]]).join(''); });
    if (solid !== '11111') fail('props solid: ' + solid);
    await p.evaluate(() => BridgeLit._force({ hour: 12.5 }));
    await p.waitForTimeout(3500);
    await p.screenshot({ path: OUT + '/hd_v4_day.png' });
    await p.evaluate(() => BridgeLit._force({ hour: 22.5 }));
    await p.waitForTimeout(3500);
    await p.screenshot({ path: OUT + '/hd_v4_night.png' });
    await use('THE VILLAGE FUND');
    await p.screenshot({ path: OUT + '/hd_v4_board.png' });
    await shut();
    const ph = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
    ph.on('pageerror', e => { errors++; console.log('PAGEERR (phone)', e.message); });
    await ph.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await ph.goto('http://127.0.0.1:8766/'); await ph.waitForTimeout(2500);
    await ph.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
      ['bridge', 'cafe', 'dairy', 'homes', 'station'].forEach(id => BridgeVillage._finish(id));
      ['bench', 'ducks', 'tubs', 'lamp', 'birds'].forEach(id => BridgeVillage._want(id, BridgeClock.etNow() - 8 * 86400000));
    });
    await ph.evaluate(() => new Promise(r => BridgeWorld.load('verdance-east', () => { BridgeState.transition('world', { worldId: 'verdance-east', spawn: { x: 11, y: 21 } }); r(); })));
    await ph.evaluate(() => BridgeLit._force({ hour: 17.5 }));
    await ph.waitForTimeout(4000);
    await ph.screenshot({ path: OUT + '/hd_v4_phone.png' });
    console.log('v4 done');
  }

  // ---- H6 · Ysolde joins the crew ----
  if (part('h6')) {
    await p.evaluate(() => { localStorage.removeItem('bridge_crew'); localStorage.removeItem('bridge_expedition'); localStorage.removeItem('bridge_log_seen'); });
    await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeWeather._pin && BridgeWeather._pin('hoarfell', 'clear'); });
    await coins(1000);
    await pinDay(0, 1, 11);
    await go('hoarfell', [39, 25]);
    if (await p.evaluate(() => BridgeQuests.has('gate:last-ridge'))) fail('the ridge counted before you went');
    await use('YSOLDE');
    let t = await rows();
    if (t.some(r => /Past the hut/.test(r))) fail('her ridge topic before the ridge');
    await pick(/^Join my crew\?/);
    if (!/GET YOURSELF OUT ONTO THE LAST RIDGE/.test(await said())) fail('she signed on before the ridge');
    await shut();
    if (await p.evaluate(() => BridgeCrew.isHired('ysolde'))) fail('hired before the ridge');
    // the ridge: a minute of cold without her, timed (coldRate 2: a chill every 6 s)
    await go('hoarfell-ridge', [4, 40]);
    if (!(await p.evaluate(() => BridgeQuests.has('gate:last-ridge')))) fail('the ridge not counted');
    const chill = async () => {
      await p.evaluate(() => { BridgeInventory.restoreEnergy(100); });
      const e0 = await p.evaluate(() => BridgeInventory.getStats().energy);
      await p.waitForTimeout(25000);
      const e1 = await p.evaluate(() => BridgeInventory.getStats().energy);
      return e0 - e1;
    };
    const without = await chill();
    // back to Fellhaven: Mette's word, then Ysolde's
    await go('hoarfell-lodge', [8, 9]);
    await use('METTE');
    t = await rows();
    if (!t.some(r => /^Ysolde$/.test(r))) fail('Mette says nothing of Ysolde: ' + t.join(' | '));
    else { await pick(/^Ysolde$/); if (!(await p.evaluate(() => (JSON.parse(localStorage.getItem('bridge_quest_meta') || '{}').leads || {})['ysolde-crew']))) fail('no lead from Mette'); }
    await shut();
    const nu = await p.evaluate(() => BridgeVillage && window.BRIDGE_NEXTUP.map(f => f('hoarfell')).flat().map(x => x.title).join(' / '));
    if (!/Ysolde would sign on/.test(nu)) fail('Next up: ' + nu);
    await go('hoarfell', [39, 25]);
    await use('YSOLDE');
    t = await rows();
    if (!t.some(r => /Past the hut/.test(r))) fail('no ridge topic: ' + t.join(' | '));
    await pick(/^Join my crew\?/);
    const pitch = await said();
    if (!/PROBE LASHED TO YOUR PACK/.test(pitch)) fail('the pitch: ' + pitch.slice(0, 120));
    await p.screenshot({ path: OUT + '/hd_h6_pitch.png' });
    await pick(/^Join my crew\?/);                                   // (asking again signs her on)
    await p.waitForTimeout(2000);
    const hire = (await rows()).join(' | ');
    if (!(await p.evaluate(() => BridgeCrew.isHired('ysolde')))) { fail('not hired (rows: ' + hire + ')'); await p.evaluate(() => BridgeCrew.hire(BridgePeople.all().ysolde)); }
    await shut();
    if (await p.evaluate(() => window._coins) !== 760) console.log('coins after hiring:', await p.evaluate(() => window._coins));
    if (!(await p.evaluate(() => BridgeCrew.has('mountaineer')))) fail('the perk is not on');
    if (!(await p.evaluate(() => BridgeWorld.getWorld().interactions.some(i => i.label === 'YSOLDE')))) fail('she left her hut');
    // with her: less cold, and the probe goes in ahead of you
    await go('hoarfell-ridge', [4, 40]);
    const withHer = await chill();
    console.log('cold over 25 s on the ridge: without Ysolde', without, 'with', withHer);
    if (!(withHer < without)) fail('the cold took as much with her: ' + withHer + ' vs ' + without);
    await p.evaluate(() => { BridgeCharacter.init(4, 39); BridgeCharacter.setFacing('up'); });
    await p.waitForTimeout(2500);
    const seen = await p.evaluate(() => (JSON.parse(localStorage.getItem('bridge_expedition') || '{}').seen || {}));
    if (!seen['4,37']) fail('her probe found nothing two paces ahead: ' + JSON.stringify(seen));
    await p.screenshot({ path: OUT + '/hd_h6_probe.png' });
    console.log('h6 done');
  }

  // the first moment on a weekday (Mon–Thu ET) from now when everyone named is at their own spot (as small_stories.js)
  const pinAt = async (ids, label) => {
    const at = await p.evaluate(([ids]) => {
      const base = Date.now();
      for (let m = 0; m < 6 * 24 * 60; m += 5) {
        const ms = base + m * 60000;
        BridgeClock._at(ms);
        if (BridgeClock.etParts().dow > 3) continue;
        if (ids.every(id => { if (!BridgeRoutines._stop(id)) return true; const w = BridgeRoutines.where(id); return !!(w && w.home); })) return ms;
      }
      return null;
    }, [ids]);
    if (at == null) fail('no working hour found for ' + label);
  };

  // ---- V5 · Wat, Ludd and the horse ----
  if (part('v5')) {
    await p.evaluate(() => { localStorage.removeItem('bridge_deeper'); localStorage.removeItem('bridge_country'); localStorage.removeItem('bridge_quest_meta'); });
    await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    await coins(500);
    await pinAt(['wat', 'ludd'], 'Wat and Ludd');
    await go('verdance-village', [20, 14]);
    await use('WAT');
    if ((await rows()).some(r => /Shoe my horse/.test(r))) fail('Wat offers shoes with no horse');
    await shut();
    // a horse of your own (Hobb's), then Hobb's word and Wat's shoes
    await p.evaluate(() => localStorage.setItem('bridge_country', JSON.stringify({ horse: { name: 'Clover', coat: 'bay' } })));
    await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    await coins(500);
    await pinAt(['wat', 'ludd', 'hobb'], 'Wat, Ludd and Hobb');
    await go('verdance-east', [20, 20]);
    await use('HOBB');
    if (!(await rows()).some(r => /Her shoes/.test(r))) fail('Hobb says nothing of shoes');
    else { await pick(/^Her shoes/); if (!(await p.evaluate(() => (JSON.parse(localStorage.getItem('bridge_quest_meta') || '{}').leads || {})['wat-shoes']))) fail('no lead from Hobb'); }
    await shut();
    await go('verdance-village', [20, 14]);
    const nu = await p.evaluate(() => window.BRIDGE_NEXTUP.map(f => f('verdance-village')).flat().map(x => x.title).join(' / '));
    if (!/New shoes for Clover/.test(nu)) fail('Next up: ' + nu);
    await use('WAT');
    await pick(/^Shoe my horse/);
    await pick(/^Shoe Clover/);
    await p.waitForTimeout(800);
    if (await p.evaluate(() => window._coins) !== 480) fail('the shoes cost ' + (500 - await p.evaluate(() => window._coins)));
    if (await p.evaluate(() => BridgeDeeper.shod()) !== 1.15) fail('not shod');
    await shut();
    await p.evaluate(() => BridgeCountryside.whistle());
    await p.waitForTimeout(600);
    const sp = await p.evaluate(() => { const m = BridgeCharacter.getMount(); return m && m.speed; });
    if (!(Math.abs(sp - 1.9 * 1.15) < 0.01)) fail('riding speed shod: ' + sp);
    await p.evaluate(() => BridgeCountryside.whistle());
    await use('WAT'); await pick(/^Shoe my horse/);
    if (!/STILL NEW/.test(await said())) fail('Wat shod her twice in a day');
    await shut();
    // a Verdance day on: the shoes are just shoes
    await p.evaluate(() => { const s = BridgeDeeper._s(); s.shod = Date.now() - 1; });
    if (await p.evaluate(() => BridgeDeeper.shod()) !== 1) fail('still shod after the day');
    // Ludd grinds and buys back only his own
    await give('wheat', 7);
    await give('flour', 3);
    await use('OLD LUDD');
    await pick(/^Grind my wheat/);
    await pick(/^Grind your wheat/);
    if (await count('wheat') !== 1 || await count('flour') !== 5) fail('ground: wheat ' + await count('wheat') + ' flour ' + await count('flour'));
    await pick(/^Sell Ludd back his flour/);
    await p.waitForTimeout(800);
    if (await count('flour') !== 3) fail('Ludd bought back ' + (5 - await count('flour')) + ', not 2');
    if (await p.evaluate(() => window._coins) !== 480 + 56) fail('coins after Ludd: ' + await p.evaluate(() => window._coins));
    await p.screenshot({ path: OUT + '/hd_v5_ludd.png' });
    const r2 = await rows();
    if (!r2.some(r => /only what he ground/.test(r))) fail('Ludd would buy more: ' + r2.join(' | '));
    await shut();
    const card = await p.evaluate(() => BridgeUses.html('wheat') + BridgeUses.html('flour'));
    if (!/Old Ludd/.test(card)) fail('no Ludd on wheat\'s or flour\'s card');
    console.log('v5 done');
  }

  // ---- H5 · Room 13 ----
  if (part('h5')) {
    await p.evaluate(() => { ['bridge_quests', 'bridge_quest_meta', 'bridge_letters'].forEach(k => localStorage.removeItem(k)); });
    await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    await coins(100);
    await pinAt(['percy', 'aubert'], 'Percy and Aubert');
    const has = (k) => p.evaluate((k) => BridgeQuests.has(k), k);
    const carried = () => p.evaluate(() => BridgeKeyItems.carried().map(i => i.id).join(','));
    // the rumour: Aubert won't let 13
    await go('hoarfell-chateau', [15, 18]);
    if (!(await p.evaluate(() => BridgeQuests.startsHere('hoarfell-chateau')['KEY BOARD']))) fail('no gold ! on the key board');
    await use('MONSIEUR AUBERT');
    await pick(/^Number 13/);
    await shut();
    if (!(await p.evaluate(() => (JSON.parse(localStorage.getItem('bridge_quest_meta') || '{}').heard || {})['room-13']))) fail('no rumour from Aubert');
    // the junk pile before the board: nothing
    await go('junk-pawn-shop', [7, 8]);
    await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'JUNK PILE' && i.type === 'dialog'); BridgeInteractions.execute(i); });
    await p.waitForTimeout(1200);
    await shut();
    if (await has('room-13/key')) fail('the key found before the board');
    await go('hoarfell-chateau', [15, 18]);
    await use('KEY BOARD');
    if (!/NOT TO BE FORCED/.test(await said())) fail('the board\'s moment');
    await shut();
    if (!(await has('room-13/board'))) fail('the board not found');
    await use('MONSIEUR AUBERT');
    if (!(await rows()).some(r => /The guest in 13/.test(r))) fail('Aubert has nothing on the guest');
    await shut();
    // Arcadia: Joro's second pile
    await go('junk-pawn-shop', [7, 8]);
    await use('PAWNBROKER');
    if (!(await rows()).some(r => /A hotel key\?/.test(r))) fail('Joro knows nothing of a key');
    await shut();
    await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'JUNK PILE' && i.type === 'dialog'); BridgeInteractions.execute(i); });
    await p.waitForTimeout(1400);
    if (!/GREEN TASSEL/.test(await said())) fail('the pile\'s moment');
    await p.screenshot({ path: OUT + '/hd_h5_key.png' });
    await shut(); await p.waitForTimeout(800); await shut();
    if ((await carried()) !== 'key13') fail('carrying: ' + await carried());
    // back to the château: the safe
    await go('hoarfell-chateau', [15, 18]);
    await use('MONSIEUR AUBERT');
    await p.waitForTimeout(2500);
    await shut(); await p.waitForTimeout(1000); await shut(); await p.waitForTimeout(800); await shut();
    if (!(await has('room-13/safe')) || !(await has('room-13/watch')) || !(await has('room-13/slip'))) fail('the safe: ' + await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('bridge_quests') || '{}')['room-13'])));
    const c2 = await carried();
    if (!/watch13/.test(c2) || !/slip13/.test(c2) || /key13/.test(c2)) fail('carrying after the safe: ' + c2);
    await use('MONSIEUR AUBERT');
    if (!(await rows()).some(r => /^Room 13$/.test(r))) fail('no Room 13 topic');
    await shut();
    // the cage first: not yet (Percy's watch comes first)
    await go('arcadia-casino', [21, 26]);
    // (the cage window, before Percy: the cage opens as ever — not driven here, so the casino's own panel isn't opened)
    // Percy
    await go('verdance-village', [24, 13]);
    await use('PERCY');
    await p.waitForTimeout(2500);
    await shut(); await p.waitForTimeout(800); await shut();
    if (!(await has('room-13/percy'))) fail('Percy didn\'t take the watch');
    await use('PERCY');
    if (!(await rows()).some(r => /The gambler's watch/.test(r))) fail('Percy has nothing to say of it');
    await shut();
    // the cage pays
    await go('arcadia-casino', [21, 26]);
    const c0 = await p.evaluate(() => window._coins);
    await use('CAGE WINDOW');
    await p.waitForTimeout(2500);
    const cs = await said();
    if (!/THE ROYALE PAYS ON ITS OWN STAMP/.test(cs)) fail('the cage said: ' + cs.slice(0, 160));
    await p.screenshot({ path: OUT + '/hd_h5_cage.png' });
    await shut(); await p.waitForTimeout(800); await shut();
    if (!(await has('room-13'))) fail('Room 13 not done');
    console.log('coins at the end', await p.evaluate(() => window._coins), 'from', c0, '(the quest pays through recordAchievement)');
    if (await carried()) fail('still carrying: ' + await carried());
    console.log('h5 done');
  }

  // ---- V7 · the goat that answers to nothing ----
  if (part('v7')) {
    await p.evaluate(() => { ['bridge_deeper', 'bridge_quest_meta', 'bridge_village'].forEach(k => localStorage.removeItem(k)); });
    await p.reload(); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeWeather._pin && BridgeWeather._pin('verdance', 'clear'); });
    await coins(200);
    // by day: no goat in the lane
    await pinAt(['hobb', 'hester', 'hollin'], 'Hobb, Hester and Hollin');
    await p.evaluate(() => { for (let m = 0; m < 600 && BridgeDeeper.evening(); m += 5) BridgeClock._at(BridgeClock.now() + 5 * 60000); });
    await go('verdance', [30, 12]);
    await use('HOLLIN');
    if (!(await rows()).some(r => /Heard anything\?/.test(r))) fail('Hollin has no gossip');
    else { await pick(/^Heard anything\?/); if (!(await p.evaluate(() => (JSON.parse(localStorage.getItem('bridge_quest_meta') || '{}').leads || {})['lost-goat']))) fail('no lead from Hollin'); }
    await shut();
    await go('verdance-downs', [22, 12]);
    await p.waitForTimeout(800);
    if (await p.evaluate(() => BridgeWorld.getWorld().interactions.some(i => i.label === 'A GOAT'))) fail('a goat in the lane by day');
    const cb = await p.evaluate(() => BridgeDeeper.comeBack('verdance-downs').join(' / '));
    if (!/sunken lane/.test(cb)) fail('Come back for: ' + cb);
    // dusk
    const dusk = await p.evaluate(() => { for (let m = 0; m < 24 * 60; m += 2) { if (BridgeDeeper.evening()) return true; BridgeClock._at(BridgeClock.now() + 2 * 60000); } return false; });
    if (!dusk) fail('no evening found');
    await go('verdance-downs', [22, 12]);
    await p.evaluate(() => BridgeCharacter.setFacing('down'));
    await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + '/hd_v7_lane.png' });
    if (!(await use('A GOAT'))) fail('no goat at dusk');
    if (!/ANSWERS TO NOTHING/.test(await said())) fail('the goat\'s moment');
    await shut();
    if (await p.evaluate(() => BridgeDeeper._s().goat) !== 1) fail('the goat isn\'t following');
    // it follows: walk off down the lane and look
    for (const y of [13, 14, 15, 16, 17, 18]) { await p.evaluate((y) => BridgeCharacter.init(21, y), y); await p.waitForTimeout(250); }
    await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + '/hd_v7_following.png' });
    const nu = await p.evaluate(() => window.BRIDGE_NEXTUP.map(f => f('verdance-downs')).flat().map(x => x.title).join(' / '));
    if (!/A goat, following you/.test(nu)) fail('Next up: ' + nu);
    // Hobb
    await p.evaluate(() => ['bridge', 'cafe', 'dairy'].forEach(id => BridgeVillage._finish(id)));   // (Hester comes with the dairy)
    await pinAt(['hobb', 'hester'], 'Hobb and Hester');
    await go('verdance-east', [31, 20]);
    await use('HOBB');
    await pick(/^This goat\?/);
    if (!/MISS WHISKERS/.test(await said())) fail('Hobb\'s moment');
    await shut();
    if (await p.evaluate(() => BridgeDeeper._s().goat) !== 2) fail('the goat isn\'t home');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: OUT + '/hd_v7_home.png' });
    await use('HESTER');
    if (!(await rows()).some(r => /Hobb's recipe/.test(r))) fail('Hester has no recipe topic');
    else {
      await pick(/^Hobb's recipe/);
      await p.waitForTimeout(800);
      const bought = await p.evaluate(() => { const r = [...document.querySelectorAll('#world-overlay button')].find(e => /Buy/.test(e.textContent) && !e.disabled); if (r) r.click(); return !!r; });
      await p.waitForTimeout(1500);
      if (!bought || await count('goat_cheese') < 1) fail('no goat\'s cheese bought (row ' + bought + ')');
    }
    await shut();
    const card = await p.evaluate(() => BridgeUses.html('goat_cheese'));
    if (!/Cellar Fair/.test(card)) fail('the goat\'s cheese card: ' + card.replace(/<[^>]+>/g, '').slice(0, 200));
    console.log('v7 done');
  }

  console.log(errors ? 'FAILED with ' + errors + ' problem(s)' : 'OK');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
