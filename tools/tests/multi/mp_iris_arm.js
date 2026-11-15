// Chrome All the Way Up (quests.json iris-arm) found together: Beck finds each clue with Alyssa beside him. What she gets
// at each step (js/multi.js `onClue`, `shared: true`): the clue, the hand and the arm as her own quest's things, the
// reward into her own coins — nothing taken from her; the heap's gate (Saint Ruin beaten) is the finder's, and alone
// with Ruin unbeaten she can't dig; Iris Kade's favour is each pilot's own.
const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  let errs = 0;
  const bad = (m) => { errs++; console.log('BAD', m); };
  for (const p of [beck, aly]) await p.evaluate(() => { ['bridge_quests', 'bridge_quest_meta', 'bridge_implants', 'bridge_under'].forEach(k => localStorage.removeItem(k)); BridgeQuests.reset(); BridgeProgression.recordAchievement = (k, n) => { window._coins += n; return Promise.resolve(true); }; });
  const shut = async (p) => { for (let i = 0; i < 4; i++) { if (await p.evaluate(() => !!document.getElementById('item-get'))) { await p.keyboard.press('Space'); await p.waitForTimeout(400); continue; } if (!await p.evaluate(() => !!document.querySelector('#world-overlay .world-dialog, #world-overlay .wd-convo'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const use = async (p, label) => { const w = await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); if (i) BridgeInteractions.execute(i); return i ? '' : BridgeWorld.getWorldId(); }, label); if (w) bad('no ' + label + ' in ' + w); await p.waitForTimeout(1600); };
  const both = async (w, a, c) => { await enter(beck, w, { x: a[0], y: a[1] }); await enter(aly, w, { x: c[0], y: c[1] }); await beck.waitForTimeout(2200); };
  const st = async (p) => p.evaluate(() => ({ found: Object.keys((JSON.parse(localStorage.getItem('bridge_quests') || '{}')['iris-arm'] || {}).clues || {}),
    done: BridgeQuests.has('iris-arm'), carried: BridgeKeyItems.carried('iris-arm').map(i => i.id).sort().join(','), coins: window._coins }));
  const step = async (name) => { const B = await st(beck), A = await st(aly); console.log(name.padEnd(10), '| beck', JSON.stringify(B), '| aly', JSON.stringify(A)); return [B, A]; };

  await both('arcadia-chopshop', [7, 6], [8, 7]);
  console.log('near', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)));
  await use(beck, 'DOC SALLOW'); await shut(beck); await aly.waitForTimeout(1200);
  let [B, A] = await step('sallow');
  if (A.found.indexOf('sallow') < 0) bad('Alyssa didn\'t get Sallow\'s clue beside him');
  await both('chrome-clinic', [7, 6], [8, 6]);
  await use(beck, 'DOCTOR'); await shut(beck); await aly.waitForTimeout(1200);
  [B, A] = await step('file');
  if (A.found.indexOf('file') < 0) bad('the file not shared');
  // the heap: Beck has beaten Saint Ruin, Alyssa hasn't
  await beck.evaluate(() => { const s = BridgeUndercity._save(); s.knuckles = true; s.ruin = 'x'; });
  await aly.evaluate(() => { const s = BridgeUndercity._save(); s.knuckles = false; s.ruin = null; });
  // first Alyssa alone (Beck still at the clinic): the heap is shut for her
  await enter(aly, 'arcadia-scrapyard', { x: 46, y: 12 }); await aly.waitForTimeout(1500);
  await use(aly, 'THRONE'); await shut(aly);
  [B, A] = await step('aly alone');
  if (A.found.indexOf('hand') >= 0) bad('Alyssa dug the heap alone with Saint Ruin unbeaten');
  await both('arcadia-scrapyard', [45, 12], [47, 12]);
  await use(beck, 'THRONE'); await shut(beck); await aly.waitForTimeout(1500); await shut(aly);
  [B, A] = await step('hand');
  if (B.carried !== 'hand') bad('Beck isn\'t carrying the hand');
  if (A.carried !== 'hand') bad('Alyssa, beside him, isn\'t carrying her hand: ' + A.carried);
  await both('arcadia-pit', [26, 5], [25, 6]);
  await use(beck, 'TALLY'); await shut(beck); await aly.waitForTimeout(1500); await shut(aly);
  [B, A] = await step('arm');
  if (A.carried !== 'arm,hand') bad('Alyssa\'s arm: ' + A.carried);
  const coins0 = [B.coins, A.coins];
  await both('arcadia-boutique', [4, 8], [5, 9]);
  await use(beck, 'IRIS KADE'); await beck.waitForTimeout(2500); await shut(beck); await aly.waitForTimeout(2000); await shut(aly);
  [B, A] = await step('iris');
  if (!B.done || !A.done) bad('not done for both');
  if (A.carried) bad('Alyssa still carrying ' + A.carried);
  if (B.coins - coins0[0] !== 400 || A.coins - coins0[1] !== 400) bad('the reward: beck +' + (B.coins - coins0[0]) + ', aly +' + (A.coins - coins0[1]));
  // the favour: each pilot's own
  for (const p of [beck, aly]) { await use(p, 'THE COLLECTION'); await shut(p); }
  await beck.evaluate(() => { window._coins += 2000; return BridgeImplants.install('seraph_arm', { price: BridgeImplants.priceIn('lumen', 'seraph_arm').price, favour: 'kade' }); });
  await beck.waitForTimeout(800);
  const fav = [await beck.evaluate(() => BridgeImplants.favourOpen('lumen')), await aly.evaluate(() => BridgeImplants.favourOpen('lumen'))];
  console.log('favour open after Beck used his: beck', fav[0], '| aly', fav[1]);
  if (fav[0] || !fav[1]) bad('the favour isn\'t each pilot\'s own');
  console.log(errs ? errs + ' BAD' : 'mp_iris_arm OK');
  await b.close();
  process.exit(errs ? 1 : 0);
})();
