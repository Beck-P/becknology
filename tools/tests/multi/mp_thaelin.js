// Thaelin's Lost Verse (quests.json thaelins-verse) found together: Beck and Alyssa down the Silverrun. It's a quest
// you're asked into (`invite`: Thaelin's topic), so a verse Beck finds beside Alyssa before she's asked Thaelin is his
// alone; once she has, each verse he finds with her beside him is hers too (js/multi.js `onClue`, `shared: true`), and
// the ending pays each pilot their own reward. A place not open yet is shut for both; once it opens, it's found together.
const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, process.argv[2], BECK), aly = await player(b, process.argv[2], ALY);
  let errs = 0;
  const bad = (m) => { errs++; console.log('BAD', m); };
  const Q = 'thaelins-verse';
  for (const p of [beck, aly]) await p.evaluate(() => { ['bridge_quests', 'bridge_quest_meta', 'bridge_fardeep'].forEach(k => localStorage.removeItem(k)); BridgeQuests.reset(); BridgeProgression.recordAchievement = (k, n) => { window._coins += n; return Promise.resolve(true); }; });
  const shut = async (p) => { for (let i = 0; i < 4; i++) { if (await p.evaluate(() => !!document.getElementById('item-get'))) { await p.keyboard.press('Space'); await p.waitForTimeout(400); continue; } if (!await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const use = async (p, label) => { const w = await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); if (i) BridgeInteractions.execute(i); return i ? '' : BridgeWorld.getWorldId(); }, label); if (w) bad('no ' + label + ' in ' + w); await p.waitForTimeout(1600); };
  const both = async (w, a, c) => { await enter(beck, w, { x: a[0], y: a[1] }); await enter(aly, w, { x: c[0], y: c[1] }); await beck.waitForTimeout(2200); };
  const st = async (p) => p.evaluate((Q) => ({ found: Object.keys((JSON.parse(localStorage.getItem('bridge_quests') || '{}')[Q] || {}).clues || {}).join(','), done: BridgeQuests.has(Q), coins: window._coins }), Q);
  const step = async (name) => { const B = await st(beck), A = await st(aly); console.log(name.padEnd(10), '| beck', JSON.stringify(B), '| aly', JSON.stringify(A)); return [B, A]; };
  const begin = (p) => p.evaluate((Q) => BridgeQuests.begin(Q, 'Thaelin'), Q);

  await begin(beck);
  await both('sylvara-boughs', [8, 11], [9, 12]);
  console.log('near', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)));
  await use(beck, 'LOOKOUT'); await shut(beck); await aly.waitForTimeout(1200);
  let [B, A] = await step('lookout');
  if (B.found.indexOf('lookout') < 0) bad('Beck didn\'t find the lookout\'s verse');
  if (A.found) bad('Alyssa, never asked into it, got ' + A.found);
  await begin(aly); await use(aly, 'LOOKOUT'); await shut(aly);
  await both('sylvara-tavern', [4, 8], [5, 8]);
  await use(beck, 'THE STAGE'); await shut(beck); await aly.waitForTimeout(1500); await shut(aly);
  [B, A] = await step('stage');
  if (A.found.indexOf('stage') < 0) bad('the stage\'s verse not found together');
  // the cave behind the falls is open: its verse found together in the cave, at the carving
  await both('sylvara-fallcave', [10, 4], [11, 4]);
  await use(beck, 'THE CARVING'); await shut(beck); await aly.waitForTimeout(1500); await shut(aly);
  [B, A] = await step('cave');
  if (A.found.indexOf('falls') < 0) bad('the cave\'s verse not found together');
  // the lake and the Deepwood: found together where each is open; one not open yet is shut for both, then opened
  // (the same game for both) and found together
  for (const [w, l, clue, ids] of [['sylvara-lake', 'FIRE RING', 'lake', ['sylvara-lake']], ['sylvara-deepwood', 'THE POOL', 'deep', ['sylvara-deepwood']]]) {
    const open = await beck.evaluate((w) => BridgeSylvara.isOpen(w), w);
    if (open) {
      const at = await beck.evaluate((w) => fetch('/bridge/assets/worlds/' + w + '.json').then(r => r.json()), w).then(d => { const i = d.interactions.find(i => i.label === l); const free = (x, y) => d.collisions[y] && d.collisions[y][x] === 0;
        const sp = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].map(o => [i.x + o[0], i.y + o[1]]).filter(q => free(q[0], q[1])); return sp; });
      await both(w, at[0], at[1] || at[0]);
      await use(beck, l); await shut(beck); await aly.waitForTimeout(1500); await shut(aly);
    } else {
      await beck.evaluate(([w, l]) => BridgeQuests.onInteract(w, { label: l }), [w, l]); await aly.waitForTimeout(1200);
      [B, A] = await step(clue + ' shut');
      if (B.found.indexOf(clue) >= 0 || A.found.indexOf(clue) >= 0) bad('the ' + clue + '\'s verse found while shut');
      for (const p of [beck, aly]) await p.evaluate((ids) => ids.forEach(i => BridgeSylvara.OPEN.push(i)), ids);
      await beck.evaluate(([w, l]) => BridgeQuests.onInteract(w, { label: l }), [w, l]); await aly.waitForTimeout(1200);
    }
    [B, A] = await step(clue + (open ? ' (open)' : ' (opened)'));
    if (A.found.indexOf(clue) < 0) bad('the ' + clue + '\'s verse not found together');
  }
  [B, A] = await step('opened');
  if (A.found.split(',').length !== 6) bad('Alyssa\'s verses once open: ' + A.found);
  const c0 = [B.coins, A.coins];
  await both('sylvara-hall', [4, 4], [5, 5]);
  await use(beck, 'HARP'); await beck.waitForTimeout(1500); await shut(beck); await aly.waitForTimeout(2000); await shut(aly);
  [B, A] = await step('song');
  if (!B.done || !A.done) bad('not done for both');
  if (B.coins - c0[0] !== 350 || A.coins - c0[1] !== 350) bad('the reward: beck +' + (B.coins - c0[0]) + ', aly +' + (A.coins - c0[1]));
  console.log(errs ? errs + ' BAD' : 'mp_thaelin OK');
  await b.close();
  process.exit(errs ? 1 : 0);
})();
