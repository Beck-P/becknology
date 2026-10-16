const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar-crimson');
  const chest = await beck.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === 'SEA CHEST'); return [i.x, i.y]; });
  await enter(beck, 'lumar-crimson', { x: chest[0], y: chest[1] + 1 });
  await enter(aly, 'lumar-crimson', { x: chest[0] + 2, y: chest[1] + 1 });
  await beck.waitForTimeout(1800);
  console.log('near', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)));
  await beck.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(x => x.label === 'SEA CHEST')));
  await aly.waitForTimeout(1200);
  console.log('beck heron', await beck.evaluate(() => JSON.stringify(BridgeQuests.progress('heron'))), '| aly heron', await aly.evaluate(() => JSON.stringify(BridgeQuests.progress('heron'))));
  console.log('aly log', await aly.evaluate(() => BridgeQuests.log().slice(0, 2).map(e => e.k + ': ' + e.t)));
  await b.close();
})();
