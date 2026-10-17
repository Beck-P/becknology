// Festivals (js/festivals.js, assets/festivals.json): on the calendar (a season's last weekend), the place put up and
// its people gathered, the Harvest Fair's produce show and Lantern Tide's derby paying a placing once, the stall, a
// paper lantern on the tide. node world/festivals.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T03:20'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: { x: a[1], y: a[2] } }); r(); })), [w, x, y]);
  const at = async (iso) => { await ev((iso) => BridgeClock._at(iso), iso); await p.waitForTimeout(500); };
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; });
  const close = async () => { for (let i = 0; i < 3 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };

  const problems = await ev(() => BridgeFestivals._check());
  console.log('festivals check: errors ' + problems.length + (problems.length ? ' — ' + problems.join('; ') : ''));

  // the calendar: a Wednesday has none, this Saturday the Harvest Fair, the next the Lantern Tide
  for (const d of ['2026-10-14T12:00', '2026-10-17T12:00', '2026-10-18T12:00', '2026-10-24T12:00', '2026-10-31T12:00']) {
    await at(d);
    console.log('on ' + d.slice(0, 10) + ':', JSON.stringify(await ev(() => BridgeFestivals.on().map(f => f.id))));
  }
  await at('2026-10-17T12:00');
  console.log('lantern tide in', await ev(() => (BridgeFestivals.next('lantern_tide') / 86400000).toFixed(1)), 'days');

  // the Harvest Fair, Brambleford square, Verdance midday
  await at('2026-10-17T03:20');
  await go('verdance-village', 13, 18); await p.waitForTimeout(2000);
  console.log('fair put up:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.festival).map(i => i.label + '@' + i.x + ',' + i.y))),
    '· table solid', await ev(() => BridgeWorld.getWorld().collisions[16][12] === 1));
  console.log('gathered:', JSON.stringify(await ev(() => BridgeRoutines._here().filter(m => m.st && m.st.walk == null).map(m => m.id + '@' + m.st.x + ',' + m.st.y))));
  await p.waitForTimeout(3000);
  console.log('told:', await ev(() => (document.querySelector('.quest-toast') || {}).innerText.replace(/\n+/g, ' / ')));
  await p.screenshot({ path: SHOTS + '/festival_fair.png' });
  await ev(() => { BridgeInventory.addItem('pumpkin', 1); BridgeInventory.addItem('turnip', 2); });
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'JUDGING TABLE')));
  await p.waitForTimeout(600);
  console.log('the show:', (await dialog()).slice(0, 300));
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /pumpkin/.test(x.textContent)).click());
  await p.waitForTimeout(600);
  const judged = await dialog();
  console.log('judged:', judged.slice(0, 260), '· rosettes', await ev(() => ['blue_rosette', 'red_rosette', 'yellow_rosette'].map(id => BridgeInventory.getCount(id)).join('/')));
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /turnip/.test(x.textContent)).click());
  await p.waitForTimeout(600);
  console.log('a turnip after: paid again', /PLACE:/.test(await dialog()), '· pumpkin still counts', /YOU — PUMPKIN/.test(await dialog()));
  await close();
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'FAIR STALL')));
  await p.waitForTimeout(600);
  console.log('the stall:', (await dialog()).slice(0, 160));
  await close();
  await at('2026-10-17T05:40');
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'JUDGING TABLE')));
  await p.waitForTimeout(2500);
  console.log('late:', (await dialog()).slice(0, 140));
  await close();

  // Lantern Tide, Crownhaven quay, after dark next Saturday
  await at('2026-10-24T07:00');
  await go('lumar-crown', 30, 32); await p.waitForTimeout(2500);
  console.log('on the quay:', JSON.stringify(await ev(() => BridgeRoutines._here().filter(m => m.st).map(m => m.id + '@' + m.st.x + ',' + m.st.y))), '· annie is', JSON.stringify(await ev(() => BridgeRoutines.where('annie'))));
  await p.screenshot({ path: SHOTS + '/festival_tide.png' });
  await ev(() => BridgeFestivals.caught('bluefin', 60));
  await ev(() => BridgeFestivals.caught('moon_eel', 140));
  await ev(() => BridgeCharacter.init(12, 33));
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'DERBY BOARD')));
  await p.waitForTimeout(400);
  await p.keyboard.press('e'); await p.waitForTimeout(400);                        // past the typing
  const board = await dialog();
  console.log('the derby:', board.slice(0, 320));
  await close();
  await ev(() => { BridgeInventory.addItem('paper_lantern', 1); });
  await ev(() => BridgeCharacter.init(30, 33));
  await ev(() => { const s = [...Array(40).keys()].find(i => BridgeInventory.getSelectedItemId && (BridgeInventory.selectSlot(i), BridgeInventory.getSelectedItemId() === 'paper_lantern')); BridgeInventory.useSelected(); });
  await p.waitForTimeout(400);
  console.log('a paper lantern:', await ev(() => (document.querySelector('.quest-toast') || {}).innerText.replace(/\n+/g, ' / ')), '· left', await ev(() => BridgeInventory.getCount('paper_lantern')));
  await b.close();
})();
