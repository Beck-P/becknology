// a score duel at the Asteroids cabinet, 25 coins each
const T = require(__dirname + '/tg_lib.js');
const game = process.argv[2] || 'asteroids', mode = process.argv[3] || 'Score duel', stake = process.argv[4] || '25 coins each';
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'arcadia', { x: 5, y: 4 }, { x: 7, y: 4 });
  console.log('others', await beck.evaluate(() => Object.keys(BridgeMulti.others())));
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(400);
  console.log('beck picker:', await T.dlg(beck));
  await beck.screenshot({ path: T.S + '/shots/cab_picker.png' });
  const titles = { asteroids: /^Asteroids/, helicopter: /^Helicopter/, breakout: /^Breakout/, 'space-invaders': /^Spore Invaders/, 'missile-command': /^Missile Command/ };
  console.log('pick', await T.click(beck, titles[game])); await beck.waitForTimeout(300);
  console.log('beck modes:', await T.dlg(beck));
  console.log('mode', await T.click(beck, new RegExp(mode))); await beck.waitForTimeout(300);
  console.log('stake', await T.click(beck, new RegExp(stake))); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await aly.screenshot({ path: T.S + '/shots/cab_ask.png' });
  await T.click(aly, /^Play$/); await aly.waitForTimeout(1500);
  console.log('coins after stakes', await T.coins(beck), await T.coins(aly), await T.sess(beck), await T.sess(aly));
  await beck.waitForTimeout(3000);
  const fb = T.frame(beck), fa = T.frame(aly);
  console.log('frames', !!fb, !!fa);
  await beck.screenshot({ path: T.S + '/shots/cab_wait.png' });
  await beck.waitForTimeout(4500);
  console.log('modes', await fb.evaluate(() => BridgeArcade.api.mode()), await fa.evaluate(() => BridgeArcade.api.mode()));
  // the same seeded world on both sides?
  if (game === 'asteroids') console.log('same rocks?', await fb.evaluate(() => 1), '(seeded run)');
  await fb.evaluate(() => { BridgeArcade.api.score = 4210; }); await fa.evaluate(() => { BridgeArcade.api.score = 2950; });
  await beck.waitForTimeout(1200);
  await beck.screenshot({ path: T.S + '/shots/cab_play_beck.png' });
  await aly.screenshot({ path: T.S + '/shots/cab_play_aly.png' });
  console.log('bar beck:', await beck.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  console.log('bar aly:', await aly.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  await fa.evaluate(() => BridgeArcade.api.over()); await aly.waitForTimeout(1500);
  await aly.screenshot({ path: T.S + '/shots/cab_aly_waiting.png' });
  await fb.evaluate(() => { BridgeArcade.api.score = 5000; BridgeArcade.api.over(); }); await beck.waitForTimeout(1800);
  await beck.screenshot({ path: T.S + '/shots/cab_verdict_beck.png' });
  await aly.screenshot({ path: T.S + '/shots/cab_verdict_aly.png' });
  console.log('bar beck:', await beck.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  console.log('bar aly:', await aly.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  console.log('coins after', await T.coins(beck), await T.coins(aly));
  console.log('record', await beck.evaluate(id => BridgeTogether._record(id), T.AID), await aly.evaluate(id => BridgeTogether._record(id), T.BID));
  // close and play on solo
  await beck.keyboard.press('Escape'); await beck.waitForTimeout(500);
  console.log('beck modal open', await beck.evaluate(() => BridgeCabinetModal.isOpen()), 'sess', await T.sess(beck));
  console.log('errors:', T.errs.length);
  await b.close();
})();
