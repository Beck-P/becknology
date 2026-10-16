const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar-midnight', { x: 24, y: 30 }); await beck.waitForTimeout(1200);
  await enter(aly, 'lumar-midnight', { x: 26, y: 30 });
  await beck.waitForTimeout(2000);
  await aly.evaluate(() => BridgeInventory.takeDamage(55));
  await beck.waitForTimeout(2500);
  console.log('dbg', await beck.evaluate(() => JSON.stringify({ peer: BridgeNet.peers().map(p => [p.name, p.hp, p.inst]), others: Object.keys(BridgeMulti.others()), tags: document.querySelectorAll('.mp-tag').length })), await aly.evaluate(() => JSON.stringify(BridgeInventory.getStats())));
  console.log('beck sees her hp', await beck.evaluate(() => { const e = document.querySelector('.mp-tag .mp-hp i'); return e ? e.style.width + ' ' + e.className : 'none'; }));
  await beck.screenshot({ path: `${S}/mp_hp.png`, clip: { x: 350, y: 200, width: 400, height: 260 } });
  await b.close();
})();
