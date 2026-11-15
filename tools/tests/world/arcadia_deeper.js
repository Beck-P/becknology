// Arcadia, deeper (spec-deeper-worlds A3, A5–A8; js/arcadia-deep.js and friends). Played through as a pilot would:
//   quest  Chrome All the Way Up (quests.json iris-arm): Nakuri's gossip, the gold ! over Sallow, Sallow → the clinic's
//          file → the heap under Saint Ruin's throne (shut until he's beaten) → Tally in the Pit → Iris Kade in LUMEN;
//          the hand and the arm held up and handed over, the reward, her favour (one designer piece at clinic price, once)
// node world/arcadia_deeper.js [shots] [part: quest]
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname + '/shots';
const ONLY = process.argv[3] || '';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errors = 0;
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const part = (n) => !ONLY || ONLY === n;
  const open = async (vp) => {
    const ctx = await b.newContext(vp || { viewport: { width: 1100, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => {
      ['bridge_quests', 'bridge_quest_meta', 'bridge_implants', 'bridge_under', 'bridge_letters', 'bridge_arcadia_deep', 'bridge_fish'].forEach(k => localStorage.removeItem(k));
      localStorage.setItem('bridge_ship_location', 'arcadia');
    });
    await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'ALYSSA', suit_color: 'purple' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
      window._coins = 5000;
      BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
      BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
      BridgeProgression.recordAchievement = (k, n) => { window._coins += n; window._ach = (window._ach || []).concat(k); return Promise.resolve(true); };
    });
    const H = { p };
    H.ev = (f, a) => p.evaluate(f, a);
    H.go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', at ? { worldId: w, spawn: { x: at[0], y: at[1] } } : { worldId: w }); r(); })), [w, at]); await p.waitForTimeout(2500); };
    H.shut = async () => {
      for (let i = 0; i < 4; i++) {
        if (await p.evaluate(() => !!document.getElementById('item-get'))) { await p.keyboard.press('Space'); await p.waitForTimeout(600); continue; }
        const isOpen = await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo'));
        if (!isOpen) break;
        const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close|done|walk|not/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
        if (!hit) await p.keyboard.press('Escape');
        await p.waitForTimeout(500);
      }
    };
    H.use = async (label, pred) => {
      const ok = await p.evaluate(([l, pred]) => { const f = pred ? new Function('i', 'return ' + pred) : (i) => i.label === l; const i = BridgeWorld.getWorld().interactions.find(f); if (i) BridgeInteractions.execute(i); return !!i; }, [label, pred || null]);
      if (!ok) fail('no ' + label + ' in ' + await p.evaluate(() => BridgeWorld.getWorldId()));
      await p.waitForTimeout(1500);
    };
    H.topics = () => p.evaluate(() => [...document.querySelectorAll('.wd-opt')].map(b => b.textContent));
    H.ask = async (q) => { const ok = await p.evaluate((q) => { const b = [...document.querySelectorAll('.wd-opt')].find(e => e.textContent === q); if (b) b.click(); return !!b; }, q); await p.waitForTimeout(1400); if (!ok) fail('no topic "' + q + '": ' + JSON.stringify(await H.topics())); return ok; };
    H.said = async () => {
      let last = '', same = 0;
      for (let i = 0; i < 40 && same < 3; i++) {
        await p.waitForTimeout(400);
        const t = await p.evaluate(() => ((document.querySelector('.wd-text') || document.querySelector('.world-dialog')) || {}).innerText || '');
        same = t && t === last ? same + 1 : 0; last = t;
      }
      return last;
    };
    H.rows = () => p.evaluate(() => [...document.querySelectorAll('.world-dialog .wd-sell-row')].map(r => r.innerText.replace(/\n+/g, ' / ')));
    H.pickRow = async (rx) => { const ok = await p.evaluate((src) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row')].find(e => new RegExp(src, 'i').test(e.innerText)); if (r) r.click(); return !!r; }, rx); await p.waitForTimeout(700); if (!ok) fail('no row /' + rx + '/: ' + JSON.stringify(await H.rows())); return ok; };
    H.has = (k) => p.evaluate((k) => BridgeQuests.has(k), k);
    H.carried = () => p.evaluate(() => BridgeKeyItems.carried().map(i => i.id).sort().join(','));
    H.count = (id) => p.evaluate((id) => BridgeInventory.getCount(id), id);
    H.coins = () => p.evaluate(() => window._coins);
    return H;
  };

  // ---- A7 · Chrome All the Way Up --------------------------------------------------------------------------------------
  if (part('quest')) {
    const H = await open(), p = H.p;
    await H.go('chrome-clinic', [7, 6]);
    await H.use('DOCTOR'); await H.ask('Iris Kade'); await H.shut();
    if ((await H.ev(() => BridgeQuests.rumours())).indexOf('iris-arm') < 0) fail('Nakuri\'s gossip didn\'t make a rumour');
    if (await H.has('iris-arm/file')) fail('the file found before Sallow began it');
    await H.go('arcadia-chopshop', [7, 7]);
    if ((await H.ev(() => BridgeQuests.startsHere('arcadia-chopshop')))['DOC SALLOW'] !== 'iris-arm') fail('no gold ! over Sallow');
    await H.use('DOC SALLOW');
    const ts = await H.topics();
    if (ts[0] !== "Iris Kade's arm") fail('Sallow\'s first topic: ' + JSON.stringify(ts));
    await H.ask("Iris Kade's arm");
    if (!/NAKURI/.test(await H.said())) fail('Sallow doesn\'t send you to Nakuri');
    await p.screenshot({ path: OUT + '/ad_quest_sallow.png' });
    await H.shut();
    if (!await H.has('iris-arm/sallow')) fail('not begun at Sallow');
    const tr = await H.ev(() => { const t = document.getElementById('quest-tracker'); return t ? t.innerText : ''; });
    console.log('tracker after Sallow:', tr.replace(/\n/g, ' | ').slice(0, 200));
    if (!/Chrome All the Way Up/.test(tr)) fail('the tracker isn\'t on it: ' + tr);
    await H.go('chrome-clinic', [7, 6]);
    await H.use('DOCTOR');
    if ((await H.topics())[0] !== 'The old file') fail('Nakuri\'s file isn\'t first: ' + JSON.stringify(await H.topics()));
    await H.ask('The old file'); if (!/CROWN/.test(await H.said())) fail('no crown in the file'); await H.shut();
    if (!await H.has('iris-arm/file')) fail('the file');
    // the heap: shut while Saint Ruin's never been beaten
    await H.go('arcadia-scrapyard', [46, 11]);
    await H.ev(() => { const s = BridgeUndercity._save(); s.knuckles = false; s.ruin = null; });
    await H.use('THRONE'); await H.shut();
    if (await H.has('iris-arm/hand')) fail('the hand found with Saint Ruin unbeaten');
    const toast = await H.ev(() => (document.querySelector('.quest-toast, #quest-toast') || {}).innerText || '');
    console.log('the heap, unbeaten:', toast.replace(/\n/g, ' | '));
    await H.ev(() => { const s = BridgeUndercity._save(); s.knuckles = true; });
    await H.use('THRONE');
    if (!/A HAND/.test(await H.said())) fail('the heap\'s moment not shown');
    await p.keyboard.press('e'); await p.waitForTimeout(1800);                 // the words put away: the hand held up
    if (!await H.ev(() => !!document.getElementById('item-get'))) fail('the hand not held up');
    await p.screenshot({ path: OUT + '/ad_quest_hand.png' });
    await H.shut();
    if (await H.carried() !== 'hand') fail('not carrying the hand: ' + await H.carried());
    await H.go('arcadia-pit', [26, 6]);
    await H.use('TALLY');
    if ((await H.topics())[0] !== "Ruin's bet") fail('Tally\'s first topic: ' + JSON.stringify(await H.topics()));
    await H.ask("Ruin's bet"); await H.said(); await H.shut(); await H.shut();
    if (await H.carried() !== 'arm,hand') fail('not carrying the arm and hand: ' + await H.carried());
    const nu = await H.ev(() => BridgeQuests.leads('iris-arm', 1)[0] || '');
    if (!/Iris Kade/.test(nu)) fail('the lead after Tally: ' + nu);
    const c0 = await H.coins();
    await H.go('arcadia-boutique', [4, 8]);
    await H.use('IRIS KADE'); await p.waitForTimeout(2500);
    if (!await H.has('iris-arm')) fail('not done at Iris Kade');
    if (await H.carried() !== '') fail('still carrying: ' + await H.carried());
    if ((await H.coins()) - c0 !== 400) fail('the reward: ' + ((await H.coins()) - c0));
    const ti = await H.topics();
    if (ti[0] !== 'The arm') fail('Iris\'s first topic: ' + JSON.stringify(ti));
    await H.ask('The arm'); await H.said();
    await p.screenshot({ path: OUT + '/ad_quest_iris.png' });
    await H.ask('Fit me something'); await p.waitForTimeout(800);
    const rows = await H.rows();
    console.log('LUMEN with the favour:', JSON.stringify(rows.slice(0, 3)));
    if (!rows.some(r => /Seraph Arm.*favour.*600 coins/.test(r))) fail('no clinic price on the Seraph Arm');
    await p.screenshot({ path: OUT + '/ad_quest_favour.png' });
    await H.pickRow('Seraph Arm'); await H.pickRow('Put it in'); await p.waitForTimeout(800); await H.shut();
    if (!await H.ev(() => BridgeImplants.has('seraph_arm'))) fail('the Seraph Arm not fitted');
    if ((await H.coins()) !== c0 + 400 - 600) fail('paid ' + (c0 + 400 - (await H.coins())) + ', not 600');
    if (await H.ev(() => BridgeImplants.favourOpen('lumen'))) fail('the favour still open after using it');
    const p2 = await H.ev(() => BridgeImplants.priceIn('lumen', 'gazelle_legs').price);
    if (p2 !== 2400) fail('a second piece at ' + p2);
    await b.contexts()[0].close();
  }

  console.log(errors ? errors + ' FAILED' : 'arcadia_deeper OK');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
