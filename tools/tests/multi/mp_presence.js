const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const sees = (p) => p.evaluate(() => BridgeNet.peers().map(q => q.name + '@' + (q.inst || '-') + (q.away ? '(away)' : '')).join(' ') + ' | avatars: ' + Object.values(BridgeMulti.others()).map(a => a.name).join(','));
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar'); await enter(aly, 'lumar');
  await beck.waitForTimeout(1500);
  console.log('0 start      beck:', await sees(beck), '|| aly:', await sees(aly));

  // A: her presence updates time out (twice) as she walks into the tavern
  await aly.evaluate(() => { window.__fakeSupa.faults.failTracks = 2; });
  await enter(aly, 'lumar-tavern');
  await beck.waitForTimeout(1200);
  console.log('A +1s        beck:', await sees(beck));
  await beck.waitForTimeout(6000);
  console.log('A +7s        beck:', await sees(beck));
  await enter(aly, 'lumar'); await beck.waitForTimeout(2500);
  console.log('A back       beck:', await sees(beck));

  // B: the server forgets her presence; the channel is fine
  await aly.evaluate(() => window.__fakeSupa.dropPresence());
  await beck.waitForTimeout(1500);
  console.log('B +1.5s      beck:', await sees(beck));
  await beck.waitForTimeout(12000);
  console.log('B +13s       beck:', await sees(beck), '|| debug', JSON.stringify(await beck.evaluate(() => { const d = BridgeNet.debug(); return { presence: d.presence, heard: d.heard }; })));

  // C: Beck's socket dies under him
  await beck.evaluate(() => window.__fakeSupa.breakChannel());
  await beck.waitForTimeout(1500);
  console.log('C +1.5s      aly:', await sees(aly), '|| beck up?', await beck.evaluate(() => JSON.stringify({ up: BridgeNet.online(), st: BridgeNet.debug().state })));
  await beck.waitForTimeout(8000);
  console.log('C +9.5s      aly:', await sees(aly), '|| beck:', await sees(beck), await beck.evaluate(() => BridgeNet.debug().state));

  // D: Beck opens a second tab (hidden, somewhere else)
  const ctx2 = await b.newContext({ viewport: { width: 800, height: 600 } });
  await ctx2.addInitScript({ path: S + '/fakesupa.js' });
  await ctx2.addInitScript(() => { Object.defineProperty(Document.prototype, 'hidden', { get: () => true, configurable: true }); localStorage.setItem('bridge_ship_location', 'lumar'); });
  const beck2 = await ctx2.newPage();
  if (process.env.OLDNET) { await beck2.route(/\/bridge\/js\/net\.js/, r => r.fulfill({ path: S + "/old_net.js", contentType: "text/javascript" })); await beck2.route(/\/bridge\/js\/multi\.js/, r => r.fulfill({ path: S + "/old_multi.js", contentType: "text/javascript" })); }
  await beck2.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await beck2.goto('http://127.0.0.1:8766/'); await beck2.waitForTimeout(2200);
  await beck2.evaluate(w => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot(w); }, BECK);
  await beck2.waitForTimeout(3500);                                   // the cloud save may reload it once
  await beck2.evaluate(w => { BridgeIntro.hide && BridgeIntro.hide(); if (!BridgeState.getPilot()) BridgeState.setPilot(w); }, BECK);
  await beck2.waitForTimeout(800);
  await enter(beck2, 'lumar-crown');
  await aly.waitForTimeout(4000);
  console.log('D 2 tabs     aly:', await sees(aly));
  // Beck moves in his front tab: still with her?
  await beck.keyboard.down('ArrowDown'); await beck.waitForTimeout(400); await beck.keyboard.up('ArrowDown');
  await aly.waitForTimeout(4000);
  console.log('D +4s        aly:', await sees(aly));
  await b.close();
})();
