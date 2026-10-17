// Your ships, sent anywhere (js/fleet.js order): a ship left at Midnight Isle sails home to the holm once; any ship can
// be sent to any island from the ledger's fleet page or a harbourmaster, wherever you are, and comes in after a passage;
// the Ferryman's book shows your ships. node world/orders.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('bridge_ship_location', 'lumar');
      localStorage.setItem('bridge_holm', JSON.stringify({ owned: true, name: 'Starling Holm', built: { dock: true }, store: {}, chest: 0, log: [] }));
      localStorage.setItem('bridge_fleet', JSON.stringify({ ships: [
        { id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] },
        { id: 's2', type: 'brigantine', name: 'Good Hope', at: 'lumar-midnight', hull: 0.9, hold: {}, guns: [], fits: [] }
      ], sailing: 's2', n: 2, crew: [], cn: 0, hired: {} }));
    }
    const real = Date.now; window._off = 0; Date.now = () => real() + window._off;
  });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(3500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const ship = () => ev(() => { const s = BridgeFleet.get('s2'); return { at: s.at, away: s.away ? { to: s.away.to, passage: s.away.passage } : null, sailing: BridgeFleet._state().sailing, where: BridgeFleet.where(s) }; });
  console.log('left at Midnight, after a load:', JSON.stringify(await ship()), '· rescued once:', await ev(() => BridgeFleet._state().rescued));
  // send her anywhere: to Crownhaven
  const r = await ev(() => BridgeFleet.order('s2', 'lumar-crown'));
  console.log('sent to Crownhaven:', JSON.stringify(r), JSON.stringify(await ship()));
  console.log('the holm keeps out of a passage:', JSON.stringify(await ev(() => BridgeHolm.returns ? BridgeHolm.returns().length : 'n/a')));
  await ev((m) => { window._off += m * 60000 + 1000; BridgeFleet.arrivals(); }, r.mins);
  console.log('after the passage:', JSON.stringify(await ship()));
  // from the ledger's fleet page: tap her, pick where
  await ev(() => new Promise(r => BridgeWorld.load('lumar-crown', () => { BridgeState.transition('world', { worldId: 'lumar-crown' }); r(); })));
  await p.waitForTimeout(1500);
  await ev(() => BridgeMenu.open('ledger'));
  await p.waitForTimeout(800);
  await ev(() => [...document.querySelectorAll('.lg-act')].find(li => /Good Hope/.test(li.textContent)).click());
  await p.waitForTimeout(600);
  console.log('send screen:', (await ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none')).replace(/\n+/g, ' | ').slice(0, 300));
  await p.screenshot({ path: SHOTS + '/orders_send.png' });
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Starling Holm/.test(x.textContent)).click());
  await p.waitForTimeout(500);
  console.log('orders given:', (await ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none')).replace(/\n+/g, ' | ').slice(0, 200), JSON.stringify(await ship()));
  await ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  // the Ferryman's book
  await ev(() => new Promise(r => BridgeWorld.load('lumar-midnight', () => { BridgeState.transition('world', { worldId: 'lumar-midnight' }); r(); })));
  await p.waitForTimeout(1500);
  await ev(() => BridgeHarbour.open('lumar-midnight'));
  await p.waitForTimeout(600);
  console.log('the Ferryman:', (await ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none')).replace(/\n+/g, ' | ').slice(0, 260));
  await b.close();
})();
