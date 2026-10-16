// pachinko together at Lucky 7: race the tray (or beat the house)
const T = require(__dirname + '/tg_lib.js');
const mode = process.argv[2] || 'Race the tray';
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'arcadia-lucky-7', { x: 4, y: 4 }, { x: 5, y: 4 });
  const boxB = await beck.evaluate(() => BridgePachinko.balls());
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Pachinko/); await beck.waitForTimeout(300);
  console.log('modes:', await T.dlg(beck));
  await T.click(beck, new RegExp('^' + mode)); await beck.waitForTimeout(300);
  await T.click(beck, /^10 coins each/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(1500);
  for (const p of [beck, aly]) await p.evaluate(() => { const g = BridgePachinko._game(); g.power = 0.55; g.firing = true; });
  await beck.waitForTimeout(6000);
  await beck.screenshot({ path: T.S + '/shots/pach_beck.png' });
  const st = p => p.evaluate(() => { const g = BridgePachinko._game(); return g && g.match ? { left: g.match.left, won: g.match.won, them: g.match.them, over: g.match.over } : null; });
  console.log('beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  for (let i = 0; i < 40; i++) { await beck.waitForTimeout(1000); if (!(await T.sess(beck)) && !(await T.sess(aly))) break; }
  console.log('beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  console.log('status beck:', await beck.evaluate(() => document.querySelector('.pk-status').textContent));
  console.log('status aly:', await aly.evaluate(() => document.querySelector('.pk-status').textContent));
  console.log('box untouched:', boxB === await beck.evaluate(() => BridgePachinko.balls()));
  await aly.screenshot({ path: T.S + '/shots/pach_aly_end.png' });
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
