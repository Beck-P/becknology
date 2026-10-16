// Signal Relay together on Enigma's relay deck: a duel (or two operators)
const T = require(__dirname + '/tg_lib.js');
const mode = process.argv[2] || 'Signal duel';
const type = (f, n) => f.evaluate(n => { for (let i = 0; i < n && state === 'playing'; i++) typeChar(currentSentence[charIndex]); }, n);
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'enigma', { x: 14, y: 5 }, { x: 15, y: 5 });
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Signal Relay/); await beck.waitForTimeout(300);
  console.log('modes:', await T.dlg(beck));
  await T.click(beck, new RegExp('^' + mode)); await beck.waitForTimeout(300);
  await T.click(beck, /^25 coins each/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(3000);
  const fb = T.frame(beck), fa = T.frame(aly);
  await beck.screenshot({ path: T.S + '/shots/typist_wait.png' });
  await fb.waitForFunction(() => state === 'playing', null, { timeout: 15000 });
  await fa.waitForFunction(() => state === 'playing', null, { timeout: 15000 });
  console.log('same first message:', (await fb.evaluate(() => currentSentence)) === (await fa.evaluate(() => currentSentence)));
  for (let k = 0; k < 6; k++) { await type(fb, 30); await type(fa, 18); await beck.waitForTimeout(500); }
  await beck.screenshot({ path: T.S + '/shots/typist_play_beck.png' });
  console.log('hint beck:', await fb.evaluate(() => document.getElementById('sentences-done').textContent));
  await fb.evaluate(() => endGame()); await fa.evaluate(() => endGame());
  await beck.waitForTimeout(2000);
  console.log('verdict beck:', await fb.evaluate(() => document.getElementById('tg-line').textContent), '| aly:', await fa.evaluate(() => document.getElementById('tg-line').textContent));
  await aly.screenshot({ path: T.S + '/shots/typist_end_aly.png' });
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
