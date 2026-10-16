const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const bid = '11111111-1111-1111-1111-111111111111', aid = '22222222-2222-2222-2222-222222222222';
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar'); await enter(aly, 'lumar'); await aly.waitForTimeout(2500);
  console.log('start: aly sees beck', await aly.evaluate(id => !!BridgeMulti.others()[id], bid));
  // Beck's tab goes to the background: no steps, presence says away
  await beck.evaluate(() => { const o = BridgeNet.send; window._o = o; BridgeNet.send = function (e) { return e === 'pos' ? true : o.apply(this, arguments); }; BridgeNet.set({ away: true }); });
  await aly.waitForTimeout(15000);
  console.log('15s away: aly sees beck', await aly.evaluate(id => !!BridgeMulti.others()[id], bid), '| tag', await aly.evaluate(() => [...document.querySelectorAll('.mp-tag')].map(t => t.className + ':' + t.innerText).join(' ; ')));
  await beck.evaluate(() => { BridgeNet.send = window._o; BridgeNet.set({ away: false }); });
  // a burst of 50 live scores
  await aly.evaluate(() => { window._got = []; BridgeNet.on('g-score', d => window._got.push(d.s)); });
  await beck.evaluate(id => { for (let i = 1; i <= 50; i++) BridgeNet.send('g-score', { sid: 'x', s: i * 10, done: false }, id); BridgeNet.send('g-score', { sid: 'x', s: 999, done: true }, id); }, aid);
  await aly.waitForTimeout(2500);
  const got = await aly.evaluate(() => window._got.length + ' msgs, last ' + window._got[window._got.length - 1] + ', has final ' + window._got.includes(999));
  const st = await beck.evaluate(() => { const x = BridgeNet.debug().stats; return 'sent ' + x.sent + ' deferred ' + x.deferred + ' rebuilds ' + x.rebuilds; });
  console.log('burst: aly got', got, '| beck', st);
  await b.close();
})();
