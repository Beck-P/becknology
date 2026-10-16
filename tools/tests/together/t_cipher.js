// the cipher terminal together on Enigma's relay deck: a race, or decode together
const T = require(__dirname + '/tg_lib.js');
const mode = process.argv[2] || 'Race';
const fill = (f, from, step, limit) => f.evaluate(([from, step, limit]) => {
  const p = CipherGame._puzzle(); let k = 0, n = 0;
  for (let r = 0; r < p.size; r++) for (let c = 0; c < p.size; c++) {
    if (p.templateGrid[r][c] !== 1) continue;
    if (k++ % step !== from) continue;
    if (n++ >= limit) return n;
    CipherGame._type(r, c, p.letterGrid[r][c]);
  }
  return n;
}, [from, step, limit]);
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'enigma', { x: 3, y: 5 }, { x: 4, y: 5 });
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Cipher/); await beck.waitForTimeout(300);
  console.log('modes:', await T.dlg(beck));
  await T.click(beck, new RegExp('^' + mode)); await beck.waitForTimeout(300);
  await T.click(beck, /^Just for fun/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(4000);
  const fb = T.frame(beck), fa = T.frame(aly);
  console.log('frame url', fb && fb.url().slice(0, 120));
  console.log('frame body', fb && (await fb.evaluate(() => document.body.innerText.slice(0, 300) + ' | ' + typeof CipherGame + ' ' + typeof CipherGenerator)));
  await fb.waitForFunction(() => typeof CipherGame !== 'undefined' && CipherGame._puzzle());
  await fa.waitForFunction(() => typeof CipherGame !== 'undefined' && CipherGame._puzzle());
  await beck.waitForTimeout(1500);
  const word = f => f.evaluate(() => CipherGame._puzzle().letterGrid.map(r => r.join('')).join('/'));
  console.log('same intercept:', (await word(fb)) === (await word(fa)));
  if (mode === 'Race') {
    await fill(fa, 0, 1, 8); await aly.waitForTimeout(800);
    console.log('beck sees:', await fb.evaluate(() => document.getElementById('tg-peer').textContent));
    await beck.screenshot({ path: T.S + '/shots/cipher_race_beck.png' });
    await fill(fb, 0, 1, 99); await beck.waitForTimeout(800);
    await fill(fa, 0, 1, 99); await aly.waitForTimeout(1500);
  } else {
    await fill(fb, 0, 2, 99); await beck.waitForTimeout(1000);
    console.log('aly grid has beck\'s letters:', await fa.evaluate(() => CipherGame._grid().flat().filter(Boolean).length));
    await aly.screenshot({ path: T.S + '/shots/cipher_decode_aly.png' });
    await fill(fa, 1, 2, 99); await aly.waitForTimeout(1500);
  }
  console.log('verdict beck:', await fb.evaluate(() => { const e = document.getElementById('tg-verdict'); return e && e.textContent; }));
  console.log('verdict aly:', await fa.evaluate(() => { const e = document.getElementById('tg-verdict'); return e && e.textContent; }));
  console.log('bar beck:', await beck.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  await beck.screenshot({ path: T.S + '/shots/cipher_end_beck_' + mode + '.png' });
  console.log('errors:', T.errs.length);
  await b.close();
})();
