const T = require(__dirname + '/tg_lib.js');
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await b.newPage();
  p.on('console', m => console.log('console', m.type(), m.text().slice(0, 200)));
  p.on('requestfailed', r => console.log('FAILED', r.url().slice(0, 120), r.failure() && r.failure().errorText));
  await p.goto('http://127.0.0.1:8766/chess?theme=ship'); await p.waitForTimeout(8000);
  console.log('booted', await p.evaluate(() => window.__wizardChessBooted));
  await b.close();
})();
