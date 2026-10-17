// Sleep takes a little time (js/actions.js rest): health and energy come back as you sleep, a key wakes you with what
// you've got, sleeping till both are full wakes you by yourself; the clinic's recovery bed is quicker. node world/sleep.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w) => ev((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  const stats = () => ev(() => { const s = BridgeInventory.getStats(); return Math.round(s.hp) + '/' + s.maxHP + ' hp, ' + Math.round(s.energy) + '/' + s.maxEnergy + ' en'; });
  const hurt = (hp, en) => ev((a) => { const s = BridgeInventory.getStats(); BridgeInventory.takeDamage ? BridgeInventory.takeDamage(s.hp - a[0]) : 0; BridgeInventory.useEnergy(s.energy - a[1]); }, [hp, en]);
  const bed = () => ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.action === 'sleep'); BridgeActions.run(it); return it.label; });

  await go('quarters'); await p.waitForTimeout(1500);
  await hurt(30, 20);
  console.log('before:', await stats());
  console.log('sleeping in the', await bed());
  await p.waitForTimeout(6000);
  console.log('after 6 s asleep:', await stats(), '· asleep', await ev(() => BridgeActions.sleeping()));
  await p.screenshot({ path: SHOTS + '/sleep_resting.png' });
  await p.keyboard.press('Space');
  await p.waitForTimeout(800);
  console.log('woken early:', (await ev(() => (document.querySelector('#sleep-fade .sf-text') || {}).textContent || 'none')), '·', await stats());
  await p.waitForTimeout(2000);
  console.log('up and about:', !(await ev(() => BridgeActions.sleeping())));
  // sleep it through: wakes by itself, full
  await hurt(80, 75);
  await bed();
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && await ev(() => !(document.querySelector('#sleep-fade.woke')))) await p.waitForTimeout(500);
  console.log('slept through in', Math.round((Date.now() - t0) / 1000), 's:', (await ev(() => (document.querySelector('#sleep-fade .sf-text') || {}).textContent || 'none')), '·', await stats());
  await p.waitForTimeout(2500);
  // the clinic's recovery bed: twice the pace
  await go('chrome-clinic'); await p.waitForTimeout(1500);
  await hurt(30, 100);
  await bed();
  await p.waitForTimeout(5000);
  console.log('recovery bed, 5 s:', await stats());
  await ev(() => BridgeActions._wake());
  await b.close();
})();
