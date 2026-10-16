// asking someone who's somewhere else (the players pill): they come over, then you both play
const T = require(__dirname + '/tg_lib.js');
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  await T.reset();
  const beck = await T.player(b, T.S, T.BECK), aly = await T.player(b, T.S, T.ALY);
  await T.cdn(beck.context()); await T.cdn(aly.context());
  await T.enter(beck, 'arcadia', { x: 6, y: 4 }); await T.enter(aly, 'arcadia-street', null);
  await beck.waitForTimeout(2500);
  // from the players pill: Beck's card for Alyssa
  await beck.evaluate(() => BridgeMulti.panel()); await beck.waitForTimeout(300);
  await T.click(beck, /^Alyssa/); await beck.waitForTimeout(300);
  console.log('card:', await T.dlg(beck));
  await T.click(beck, /^Play a game/); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await beck.screenshot({ path: T.S + '/shots/travel_picker.png' });
  await T.click(beck, /^Missile Command/); await beck.waitForTimeout(300);
  await T.click(beck, /^Co-op/); await beck.waitForTimeout(300);
  await T.click(beck, /^Just for fun/); await beck.waitForTimeout(1500);
  console.log('aly asked:', await T.dlg(aly));
  await aly.screenshot({ path: T.S + '/shots/travel_ask.png' });
  await T.click(aly, /^Go and play/);
  for (let i = 0; i < 20; i++) { await aly.waitForTimeout(1000); if (await aly.evaluate(() => BridgeCabinetModal.isOpen())) break; }
  console.log('aly world:', await aly.evaluate(() => BridgeWorld.getWorldId()), 'cabinets open:', await beck.evaluate(() => BridgeCabinetModal.isOpen()), await aly.evaluate(() => BridgeCabinetModal.isOpen()));
  await aly.waitForTimeout(6000);
  const fb = T.frame(beck), fa = T.frame(aly);
  console.log('modes', fb && await fb.evaluate(() => BridgeArcade.api.mode()), fa && await fa.evaluate(() => BridgeArcade.api.mode()));
  await fb.evaluate(() => { BridgeArcade.api.score = 7100; }); await fa.evaluate(() => { BridgeArcade.api.score = 6300; });
  await beck.waitForTimeout(1200);
  await aly.screenshot({ path: T.S + '/shots/coop_play_aly.png' });
  console.log('bar aly:', await aly.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  await fb.evaluate(() => BridgeArcade.api.over()); await fa.evaluate(() => BridgeArcade.api.over());
  await beck.waitForTimeout(2000);
  console.log('bar beck:', await beck.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  await beck.screenshot({ path: T.S + '/shots/coop_verdict_beck.png' });
  console.log('errors:', T.errs.length);
  await b.close();
})();
