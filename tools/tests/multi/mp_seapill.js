const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar'); await enter(aly, 'lumar');
  await beck.waitForTimeout(1500);
  console.log('before: beck sees', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name + ' ' + a.x.toFixed(0) + ',' + a.y.toFixed(0))));
  await aly.evaluate(() => BridgeSloop.start('lumar', null, { aboard: true }));
  for (let i = 0; i < 6; i++) { await beck.waitForTimeout(600); console.log('  t', i, await aly.evaluate(() => BridgeSloop.isRunning() + ' ' + BridgeSloop._phase() + ' inst=' + BridgeMulti.myInst()), '| beck:', await beck.evaluate(() => { const p = BridgeNet.peers()[0]; const a = Object.values(BridgeMulti.others())[0]; return (p && p.inst + ' ' + p.act) + ' avatar ' + (a ? Math.round(performance.now() - a.seen) + 'ms' : 'none'); })); }
  console.log('aly sailing: beck sees avatars', await beck.evaluate(() => Object.keys(BridgeMulti.others()).length), '| pill', await beck.evaluate(() => document.getElementById('mp-pill').innerText.replace(/\n/g, ' ')));
  console.log('aly side: pill shown', await aly.evaluate(() => { const e = document.getElementById('mp-pill'); const r = e.getBoundingClientRect(); return getComputedStyle(e).display + ' z' + getComputedStyle(e).zIndex + ' top' + Math.round(r.top) + ' ' + e.innerText.replace(/\n/g, ' '); }));
  await aly.screenshot({ path: `${S}/seapill_aly.png` });
  await aly.evaluate(() => document.getElementById('mp-pill').click()); await aly.waitForTimeout(500);
  console.log('panel at sea', await aly.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') + ' z' + getComputedStyle(d).zIndex : 'none'; }));
  await aly.screenshot({ path: `${S}/seapill_panel.png` });
  await b.close();
})();
