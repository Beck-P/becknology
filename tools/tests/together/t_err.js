const T = require(__dirname + '/tg_lib.js');
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 } });
  await ctx.addInitScript({ path: __dirname + '/../fakesupa.js' });
  await ctx.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.stack));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await b.close();
})();
