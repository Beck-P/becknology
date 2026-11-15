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

  console.log(errors ? 'FAILED with ' + errors + ' problem(s)' : 'OK');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
