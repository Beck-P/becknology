const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const aid = '22222222-2222-2222-2222-222222222222', bid = '11111111-1111-1111-1111-111111111111';
const check = async (beck, aly, label) => {
  await aly.waitForTimeout(3000);
  const r = await aly.evaluate(id => { const a = BridgeMulti.others()[id], p = BridgeNet.peer(id); return { seen: !!a, peerInst: p && p.inst, peerAct: p && p.act, mine: BridgeMulti.myInst() }; }, bid);
  const rb = await beck.evaluate(id => ({ seen: !!BridgeMulti.others()[id], mine: BridgeMulti.myInst(), sailing: BridgeSloop.isRunning(), covers: BridgeVoyage.covers ? BridgeVoyage.covers() : null, state: BridgeState.getState() }), aid);
  console.log((r.seen && rb.seen ? 'OK  ' : 'FAIL') + ' ' + label.padEnd(26), '| aly sees beck', r.seen, 'beck@', r.peerInst, r.peerAct, '| aly@', r.mine, '|| beck sees aly', rb.seen, 'beck@', rb.mine, 'sailing', rb.sailing, 'covers', rb.covers, rb.state);
};
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar'); await enter(aly, 'lumar');
  await check(beck, aly, 'start in lumar');
  await enter(beck, 'lumar-tavern'); await enter(beck, 'lumar', { x: 8, y: 14 });
  await check(beck, aly, 'tavern and back');
  await beck.keyboard.press('Tab'); await beck.waitForTimeout(800);
  await check(beck, aly, 'menu open');
  await beck.keyboard.press('Escape'); await beck.waitForTimeout(400);
  await beck.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.type === 'fish'); BridgeFishing.open(i); });
  await check(beck, aly, 'fishing open');
  await beck.evaluate(() => BridgeFishing.close());
  // sail out of the harbour and put back in
  await beck.evaluate(() => BridgeSloop.start('lumar', null, { aboard: true }));
  for (let i = 0; i < 40 && (await beck.evaluate(() => BridgeSloop._phase())) !== 'sail'; i++) await beck.waitForTimeout(300);
  await beck.waitForTimeout(1500);
  console.log('   (while sailing, aly sees beck?', await aly.evaluate(id => !!BridgeMulti.others()[id], bid), ')');
  await beck.evaluate(() => BridgeSloop.stop && BridgeSloop.stop('lumar', true));
  for (let i = 0; i < 20; i++) { await beck.waitForTimeout(500); if (await beck.evaluate(() => !BridgeSloop.isRunning() && BridgeState.getState() === 'world' && BridgeWorld.getWorldId() === 'lumar')) break; }
  await check(beck, aly, 'put back in at lumar');
  // a cabinet duel together? the menu of games — just the picker and cancel
  await beck.evaluate(id => BridgeTogether && BridgeTogether.pick && BridgeTogether.pick(id), aid); await beck.waitForTimeout(500);
  await beck.keyboard.press('Escape'); await beck.waitForTimeout(400);
  await check(beck, aly, 'games picker');
  // both to Crownhaven, Beck by sailing
  await beck.evaluate(() => BridgeSloop.start('lumar', 'lumar-crown', { aboard: true }));
  for (let i = 0; i < 40 && (await beck.evaluate(() => BridgeSloop._phase())) !== 'sail'; i++) await beck.waitForTimeout(300);
  await beck.evaluate(() => BridgeSloop.stop && BridgeSloop.stop('lumar-crown', true));
  for (let i = 0; i < 30; i++) { await beck.waitForTimeout(500); if (await beck.evaluate(() => !BridgeSloop.isRunning() && BridgeState.getState() === 'world' && BridgeWorld.getWorldId() === 'lumar-crown')) break; }
  await enter(aly, 'lumar-crown');
  await check(beck, aly, 'landed at crownhaven');
  await b.close();
})();
