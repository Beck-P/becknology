const { chromium } = require('playwright');
// Quest starts, rumours, leads and the tracker (js/quests.js; Alyssa and Beck: mark where a quest starts but not every
// clue, leads that point the way without giving it away, and rumours from people's gossip). In Sylvara: the gold ! over
// the queen (and on the map) before The Queen's Favour begins; the weaver's gossip putting it in the journal as a
// rumour, with the tracker following it; talking to the queen starting it, the ! gone, the tracker on its leads; a lead
// changing as the quest moves on; Track in the journal; the tracker folded up. Shots in OUT.
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { ['bridge_quests', 'bridge_quest_meta'].forEach(k => localStorage.removeItem(k)); BridgeState.setPilot({ id: 't', name: 'ALYSSA', suit_color: 'purple' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide(); });
  const fail = (m) => console.log('FAILED: ' + m);
  const go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]); await p.waitForTimeout(3500); };
  const shut = async () => {
    const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
    if (!hit) await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
  };
  const use = async (x, y, face = 'up') => { await p.evaluate(([x, y, f]) => { BridgeCharacter.init(x, y); BridgeCharacter.setFacing(f); }, [x, y, face]); await p.waitForTimeout(700); await p.keyboard.press('e'); await p.waitForTimeout(1800); };
  const ask = (q) => p.evaluate((q) => { const b = [...document.querySelectorAll('.wd-opt')].find(e => e.textContent === q); if (b) b.click(); return !!b; }, q);
  const tracker = () => p.evaluate(() => { const t = document.getElementById('quest-tracker'); return t && t.classList.contains('on') ? t.innerText : ''; });
  const starts = (w) => p.evaluate((w) => BridgeQuests.startsHere(w), w);

  // before anything: a ! over the queen, nothing tracked
  await go('sylvara-hall', [11, 8]);
  if ((await starts('sylvara-hall'))['QUEEN ALYSSARA'] !== 'queens-favour') fail('no start marked on the queen: ' + JSON.stringify(await starts('sylvara-hall')));
  if (await tracker()) fail('the tracker is up with nothing to follow');
  await p.screenshot({ path: OUT + '/qt_start_marker.png' });
  const mapped = await p.evaluate(() => typeof BridgeMap !== 'undefined' && BridgeMap.markers ? BridgeMap.markers('sylvara-hall').filter(m => m.cat === 'start').map(m => m.name) : null);
  if (mapped && !mapped.length) fail('the start isn\'t on the map');

  // a rumour: the weaver's gossip
  await go('sylvara', [6, 18]);
  const at = await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'WEAVER'); return [i.x, i.y]; });
  await use(at[0], at[1] + 1);
  if (!await ask('Heard anything?')) fail('the weaver has no gossip');
  await p.waitForTimeout(1500);
  await shut();
  const rum = await p.evaluate(() => BridgeQuests.rumours());
  if (rum.join() !== 'queens-favour') fail('no rumour heard: ' + JSON.stringify(rum));
  const t1 = await tracker();
  if (!/RUMOUR/i.test(t1) || !/The Queen's Favour/.test(t1) || !/quiet word/.test(t1)) fail('the tracker isn\'t following the rumour: ' + t1);
  await p.screenshot({ path: OUT + '/qt_rumour.png' });
  await p.keyboard.press('j'); await p.waitForTimeout(800);
  const jn = await p.evaluate(() => (document.querySelector('.jn') || {}).innerText || '');
  if (!/Rumours/i.test(jn) || !/heard from Sefa/i.test(jn)) fail('the journal has no rumour: ' + jn.slice(0, 300));
  await p.screenshot({ path: OUT + '/qt_journal_rumour.png' });
  await p.keyboard.press('j'); await p.waitForTimeout(500);

  // the queen starts it: the ! goes, the tracker follows the quest's leads
  await go('sylvara-hall', [11, 8]);
  await use(11, 6); await shut();
  if ((await starts('sylvara-hall'))['QUEEN ALYSSARA']) fail('still marked after the quest began');
  const t2 = await tracker();
  if (!/1 \/ 5/.test(t2) || !/bard|herbalist|willow/i.test(t2)) fail('the tracker\'s leads: ' + t2);
  if (/RUMOUR/i.test(t2)) fail('still a rumour once begun');
  await p.screenshot({ path: OUT + '/qt_tracking.png' });

  // the ribbon in hand: the tracker shows it, and the lead to Beckolas
  await go('sylvara', [6, 18]);
  await use(6, 18); await shut(); await p.waitForTimeout(900); await p.keyboard.press('Space'); await p.waitForTimeout(600);
  const t3 = await tracker();
  if (!/Ribbon/.test(t3) || !/Beckolas/.test(t3)) fail('the tracker doesn\'t show what you carry: ' + t3);
  await p.screenshot({ path: OUT + '/qt_carrying.png' });

  // folded up, and back
  await p.evaluate(() => document.querySelector('.qtr-min').click()); await p.waitForTimeout(1200);
  if (await p.evaluate(() => document.querySelectorAll('#quest-tracker .qtr-leads').length)) fail('folded, but the leads still show');
  await p.screenshot({ path: OUT + '/qt_folded.png' });
  await p.evaluate(() => document.querySelector('.qtr-min').click()); await p.waitForTimeout(1200);

  // Track in the journal: a second quest to choose
  await p.evaluate(() => BridgeQuests.hear('keepers-log', 'Hetty'));
  await p.waitForTimeout(500);
  await p.keyboard.press('j'); await p.waitForTimeout(800);
  const clicked = await p.evaluate(() => { const b = document.querySelector('.jn-track[data-q="keepers-log"]'); if (b) b.click(); return !!b; });
  if (!clicked) fail('no Track button on the rumour');
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/qt_journal_track.png' });
  await p.keyboard.press('j'); await p.waitForTimeout(1300);
  if (!/Three Long, One Short/.test(await tracker())) fail('Track didn\'t switch the tracker: ' + await tracker());
  console.log('tracker', JSON.stringify(await tracker()));
  await b.close();
})();
