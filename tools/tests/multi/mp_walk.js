const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await enter(beck, 'lumar-square'); await enter(aly, 'lumar-square');
  await beck.waitForTimeout(1500);
  const start = await aly.evaluate(() => ({ x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }));
  console.log('start', start, 'beck sees', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.x.toFixed(2) + ',' + a.y.toFixed(2))));
  await aly.keyboard.down('ArrowUp');
  const samples = [];
  for (let i = 0; i < 8; i++) { await beck.waitForTimeout(150); samples.push(await beck.evaluate(() => { const a = Object.values(BridgeMulti.others())[0]; return a ? a.y.toFixed(2) + (a.walking ? 'w' : '') : '-'; })); }
  await aly.keyboard.up('ArrowUp');
  await beck.waitForTimeout(600);
  console.log('beck saw her y over time', samples.join(' '), '| she ended', await aly.evaluate(() => BridgeCharacter.getRenderPos().y.toFixed(2)), 'beck shows', await beck.evaluate(() => Object.values(BridgeMulti.others())[0].y.toFixed(2)));
  await beck.screenshot({ path: `${S}/mp_square_beck.png` });
  await aly.screenshot({ path: `${S}/mp_square_aly_m.png` });
  await b.close();
})();
