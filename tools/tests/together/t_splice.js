// Splice together in NULL's den: a race (same board) or four hands (one board for two)
const T = require(__dirname + '/tg_lib.js');
const mode = process.argv[2] || 'Race';
// solve some of the board: turn each junction until it matches the spanning tree (from `from`, every `step`th cell)
const solve = (p, from, step, limit) => p.evaluate(([from, step, limit]) => {
  const g = BridgeSplice._board(); let turns = 0, n = g.n;
  for (let i = from; i < n * n && turns < limit; i += step) {
    let k = 0; while (g.cells[i] !== g.solution[i] && k++ < 4) { BridgeSplice._turn(i % n, Math.floor(i / n)); turns++; }
  }
  return turns;
}, [from, step, limit]);
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'null-den', { x: 6, y: 4 }, { x: 9, y: 4 });
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Splice/); await beck.waitForTimeout(300);
  console.log('modes:', await T.dlg(beck));
  await T.click(beck, new RegExp('^' + mode)); await beck.waitForTimeout(300);
  await T.click(beck, /^25 coins each/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(1500);
  const board = p => p.evaluate(() => { const g = BridgeSplice._board(); return g && g.n + ':' + g.solution.join(',') + '|' + g.src + ',' + g.dst; });
  const bb = await board(beck), ba = await board(aly);
  console.log('same board:', bb === ba, bb && bb.slice(0, 40));
  if (mode === 'Race') {
    await solve(aly, 0, 1, 6); await aly.waitForTimeout(800);
    await beck.screenshot({ path: T.S + '/shots/splice_race_beck.png' });
    console.log('beck sees:', await beck.evaluate(() => document.querySelector('.sp-them').textContent));
    await solve(beck, 0, 1, 200); await beck.waitForTimeout(800);
    await solve(aly, 0, 1, 200); await aly.waitForTimeout(1500);
  } else {
    await solve(beck, 0, 2, 200); await beck.waitForTimeout(400);       // Beck takes the even cells
    const cells = p => p.evaluate(() => BridgeSplice._board().cells.join(','));
    console.log('copies agree after Beck:', (await cells(beck)) === (await cells(aly)));
    await aly.screenshot({ path: T.S + '/shots/splice_hands_aly.png' });
    await solve(aly, 1, 2, 200); await aly.waitForTimeout(1500);        // Alyssa the odd ones: the feed goes through
  }
  console.log('status beck:', await beck.evaluate(() => document.querySelector('.sp-status').textContent));
  console.log('status aly:', await aly.evaluate(() => document.querySelector('.sp-status').textContent));
  await beck.screenshot({ path: T.S + '/shots/splice_end_beck_' + mode + '.png' });
  await aly.screenshot({ path: T.S + '/shots/splice_end_aly_' + mode + '.png' });
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
