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
      if (sessionStorage.getItem('ad_fresh')) return;                // once: a reload keeps what was saved
      sessionStorage.setItem('ad_fresh', '1');
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

  // ---- A3 · Fishing in the Sump -----------------------------------------------------------------------------------------
  // a spot off the quay by Teo's boat (and the station platform's), a sump eel landed and on its card, Teo buying it, the
  // eel's Uses line (the junk off a line is Gage's, as it always was), the platform's spot
  if (part('fish')) {
    const H = await open(), p = H.p;
    const spots = await H.ev(() => new Promise(r => { const out = {}; let n = 0; ['arcadia-sump', 'arcadia-sump-rave'].forEach(w => fetch('/bridge/assets/worlds/' + w + '.json').then(x => x.json()).then(d => { d.interactions = d.interactions || []; BridgeFishing.decorate(w, d);
      out[w] = d.interactions.filter(i => i.type === 'fish').map(i => ({ x: i.x, y: i.y, pool: i.pool, water: d.collisions[i.y][i.x], stand: [[0, -1], [0, 1], [1, 0], [-1, 0]].some(o => d.collisions[i.y + o[1]] && d.collisions[i.y + o[1]][i.x + o[0]] === 0) }));
      if (++n === 2) r(out); })); }));
    console.log('spots:', JSON.stringify(spots));
    ['arcadia-sump', 'arcadia-sump-rave'].forEach(w => { if (!(spots[w] || []).length) fail('no fishing in ' + w); (spots[w] || []).forEach(s => { if (s.pool !== 'sump' || !s.water || !s.stand) fail(w + ' spot ' + JSON.stringify(s)); }); });
    await H.go('arcadia-sump', [20, 18]);
    await H.ev(() => { BridgeCharacter.setFacing && BridgeCharacter.setFacing('down'); });
    await H.use('OFF THE QUAY', "i.type === 'fish' && i.x === 20");
    if (!await H.ev(() => BridgeFishing.isOpen())) fail('no fishing off the quay');
    await p.keyboard.down(' '); await p.waitForTimeout(1150); await p.keyboard.up(' '); await p.waitForTimeout(300);
    await H.ev(() => { const s = BridgeFishing._state(); if (s && s.phase === 'wait') { s.catchId = 'sump_eel'; s.nibbles = []; } });
    await p.waitForFunction(() => { const s = BridgeFishing._state(); return s && s.phase === 'bite'; }, null, { timeout: 15000 }).catch(() => fail('no bite'));
    await p.screenshot({ path: OUT + '/ad_fish_bite.png' });
    await p.keyboard.down(' '); await p.waitForTimeout(120); await p.keyboard.up(' ');
    await H.ev(() => { const s = BridgeFishing._state(); if (s && s.phase === 'reel') { s.progress = 0.995; s.fish = s.ft = s.zone + s.zoneH / 2; } });
    await p.waitForTimeout(1800);
    const card = await H.ev(() => (document.getElementById('fish-reveal') || {}).innerText || '');
    if (!/Sump Eel/.test(card)) fail('the card: ' + card);
    if (!await H.ev(() => !!document.querySelector('#fish-reveal .fr-art canvas'))) fail('the eel isn\'t drawn on its card');
    await p.screenshot({ path: OUT + '/ad_fish_card.png' });
    await p.waitForTimeout(2500); await p.keyboard.press(' '); await p.waitForTimeout(600);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    if (await H.ev(() => BridgeFishing.isOpen())) await H.ev(() => BridgeFishing.close());
    if (await H.count('sump_eel') !== 1) fail('the eel not in the pack: ' + await H.count('sump_eel'));
    const uses = await H.ev(() => BridgeUses.lines('sump_eel').map(l => l.t.replace(/<[^>]+>/g, '')));
    console.log('sump eel, uses:', JSON.stringify(uses));
    if (!uses.some(t => /Old Teo/.test(t))) fail('no Teo line on the eel');
    // junk off a line: no size, Gage buys it
    await H.ev(() => { BridgeInventory.addItem('sump_eel', 2); BridgeInventory.addItem('circuit', 1); });
    await H.use('NOODLE BOAT');
    const rows = await H.rows(); console.log('the boat:', JSON.stringify(rows));
    const c0 = await H.coins();
    await H.pickRow('line-caught'); await H.shut();
    if ((await H.coins()) - c0 !== 3 * 14) fail('Teo paid ' + ((await H.coins()) - c0) + ' for three eels');
    if (await H.count('sump_eel')) fail('eels left after selling');
    await H.go('arcadia-sump-rave', [4, 14]);
    await H.use('PLATFORM EDGE', "i.type === 'fish'");
    if (!await H.ev(() => BridgeFishing.isOpen())) fail('no fishing off the platform');
    await p.waitForTimeout(600);
    await p.screenshot({ path: OUT + '/ad_fish_platform.png' });
    await H.ev(() => BridgeFishing.close());
    await b.contexts()[0].close();
  }

  // ---- A5 · Chrome you can tune -------------------------------------------------------------------------------------------
  // street chrome in at Sallow's chair, steadied there for two chrome parts and a circuit (not without them), half the
  // glitches for a week and still so after a reload; at LUMEN a chrome part down off a designer piece
  if (part('tune')) {
    const H = await open(), p = H.p;
    await H.go('arcadia-chopshop', [6, 8]);
    await H.use('THE CHAIR');
    await H.pickRow('Scrap Knuckles'); await H.pickRow('Put it in'); await H.shut();
    if (!await H.ev(() => BridgeImplants.has('scrap_knuckles'))) fail('no knuckles in');
    await H.use('THE CHAIR');
    const r0 = await H.rows();
    console.log('the chair:', JSON.stringify(r0.filter(r => /Steady/.test(r))));
    if (!r0.some(r => /Steady: Scrap Knuckles.*2 chrome parts and 1 circuit board/.test(r))) fail('no steadying row');
    await H.pickRow('Steady: Scrap Knuckles');
    if (!/PARTS, NOT PROMISES/.test(await H.said())) fail('steadied with no parts');
    await H.shut();
    if (await H.ev(() => BridgeImplants.steadied('arm'))) fail('steadied with no parts');
    const raw = await H.ev(() => { const real = Math.random, fx = BridgeFX.spawnFloatingText; let n = 0; BridgeFX.spawnFloatingText = function () { n++; };
      Math.random = () => 0.015; try { BridgeImplants._tick(); return n; } finally { Math.random = real; BridgeFX.spawnFloatingText = fx; } });
    if (raw !== 1) fail('an unsteadied arm didn\'t glitch on a roll of 0.015: ' + raw);
    await H.ev(() => { BridgeInventory.addItem('chrome_part', 3); BridgeInventory.addItem('circuit', 1); });
    await H.use('THE CHAIR'); await H.pickRow('Steady: Scrap Knuckles');
    if (!/HALF THE GLITCHES/.test(await H.said())) fail('no word of the steadying');
    await p.screenshot({ path: OUT + '/ad_tune_done.png' });
    await H.shut();
    if (!await H.ev(() => BridgeImplants.steadied('arm'))) fail('not steadied');
    if (await H.count('chrome_part') !== 1 || await H.count('circuit') !== 0) fail('the parts not taken: ' + await H.count('chrome_part') + ' chrome, ' + await H.count('circuit') + ' circuit');
    const days = await H.ev(() => (BridgeImplants.installed().arm.steady - Date.now()) / 86400000);
    if (days < 6.9 || days > 7.01) fail('steadied for ' + days + ' days');
    await H.use('THE CHAIR');
    const r1 = await H.rows();
    if (!r1.some(r => /steadied: half the glitches for 7 more days/.test(r))) fail('the chair doesn\'t say it\'s steadied: ' + JSON.stringify(r1));
    await p.screenshot({ path: OUT + '/ad_tune_chair.png' });
    await H.shut();
    const uses = await H.ev(() => BridgeUses.lines('chrome_part').map(l => l.t.replace(/<[^>]+>/g, '')));
    console.log('chrome part, uses:', JSON.stringify(uses));
    if (!uses.some(t => /Doc Sallow/.test(t)) || !uses.some(t => /Iris Kade/.test(t))) fail('the chrome part\'s uses');
    // the glitch rate, halved: the tick's roll under a stubbed Math.random
    // (a roll between half the odds and the odds: a glitch untuned, none steadied — about once in four minutes walking, now eight)
    const rolls = await H.ev(() => { const real = Math.random, fx = BridgeFX.spawnFloatingText; let n = 0; BridgeFX.spawnFloatingText = function () { n++; };
      Math.random = () => 0.015; try { BridgeImplants._tick(); const steadyN = n; return steadyN; } finally { Math.random = real; BridgeFX.spawnFloatingText = fx; } });
    if (rolls !== 0) fail('a steadied arm glitched on a roll of 0.015');
    // after a reload
    await p.reload(); await p.waitForTimeout(2500);
    if (!await H.ev(() => BridgeImplants.steadied('arm'))) fail('the steadying gone after a reload');
    await H.ev(() => {
      BridgeState.setPilot({ id: 't', name: 'ALYSSA', suit_color: 'purple' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide();
      window._coins = 5000;
      BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
      BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
    });
    // LUMEN: a chrome part down
    await H.go('arcadia-boutique', [8, 8]);
    await H.use('THE COLLECTION');
    await H.pickRow('Seraph Arm');
    const r2 = await H.rows(); console.log('Seraph Arm:', JSON.stringify(r2));
    if (!r2.some(r => /a chrome part down.*2080 coins/.test(r))) fail('no deposit row');
    await p.screenshot({ path: OUT + '/ad_tune_deposit.png' });
    const c0 = await H.coins();
    await H.pickRow('a chrome part down'); await p.waitForTimeout(600); await H.shut();
    if (!await H.ev(() => BridgeImplants.has('seraph_arm'))) fail('the Seraph Arm not fitted');
    if (c0 - await H.coins() !== 2080) fail('paid ' + (c0 - await H.coins()));
    if (await H.count('chrome_part') !== 0) fail('the deposit not taken');
    if (await H.ev(() => BridgeImplants.steadied('arm'))) fail('a designer arm still "steadied"');
    await b.contexts()[0].close();
  }

  console.log(errors ? errors + ' FAILED' : 'arcadia_deeper OK');
  await b.close();
  process.exit(errors ? 1 : 0);
})();
