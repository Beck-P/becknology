// Timepieces (js/gear.js → the time by the place's name, js/hours.js) and the legacy goals (js/legacy.js): a wrist
// chrono bought at Cyber Gear, your statue commissioned in Crownhaven, the Sovereign from the Royal Yard, the
// Legacy list in the ledger. node world/legacy.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 3000000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const go = (w) => ev((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  // a timepiece: before, the sky icon alone; after, the planet's time beside it
  await go('lumar-sapphire'); await wait(1200);
  const sky = () => ev(() => { BridgeHours._tick(); const s = document.querySelector('.world-sky'); return s ? s.innerText.trim() || '(icon)' : '-'; });
  console.log('time by the name, no timepiece:', await sky());
  await go('arcadia-street'); await wait(1200);
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'CYBER GEAR'); BridgeInteractions.execute(it); });
  await wait(500);
  const rows = await ev(() => [...document.querySelectorAll('.gear-row')].map(r => r.innerText.replace(/\n+/g, ' ')));
  console.log('cyber gear sells:', rows.join(' | '));
  await ev(() => { const rs = [...document.querySelectorAll('.gear-row')]; const i = rs.findIndex(r => /World Watch/.test(r.innerText)); rs[i].click(); rs[i].click(); });
  await wait(400);
  console.log('bought:', await ev(() => document.querySelector('.gear-note').innerText), '· coins', await ev(() => window._coins));
  await ev(() => BridgeGear.close());
  console.log('time by the name in Arcadia (Eastern time):', await sky());
  await go('lumar-sapphire'); await wait(1200);
  console.log('time by the name on Lumar:', await sky());
  // tap it: the world watch, every world's time and weather on one face
  await ev(() => document.querySelector('.world-sky').click());
  await wait(500);
  console.log('world watch:', (await ev(() => (document.querySelector('#world-watch') || {}).innerText || 'none')).replace(/\n+/g, ' | '));
  await p.screenshot({ path: SHOTS + '/legacy_watch.png' });
  await ev(() => document.body.click());
  console.log('closed on a click elsewhere:', await ev(() => !document.querySelector('#world-watch')));
  await go('bridge'); await wait(1200);
  console.log('time by the name on the ship:', await sky());
  // the statue
  await go('lumar-crown'); await wait(1500);
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'STATUE'); BridgeInteractions.execute(it); });
  await wait(500);
  console.log('statue offer:', (await ev(() => document.querySelector('.world-dialog').innerText)).replace(/\n+/g, ' / ').slice(0, 300));
  await ev(() => { const o = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Commission/.test(x.textContent)); o.click(); });
  await wait(800);
  console.log('commissioned:', JSON.stringify(await ev(() => { const s = BridgeLegacy._state().statue; return s && [s.name, !!s.look]; })), '· coins', await ev(() => window._coins));
  await ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  // stand in front of it and look
  await ev(() => { BridgeControls.enable && BridgeControls.enable(); BridgeCharacter.init(32, 26); });
  await wait(1500);
  await p.screenshot({ path: SHOTS + '/legacy_statue.png' });
  // the Sovereign
  console.log('royal yard builds:', await ev(() => BridgeFleet.spec('sovereign').name + ' ' + BridgeFleet.spec('sovereign').price));
  console.log('buy the Sovereign:', JSON.stringify(await ev(() => BridgeFleet.buy('sovereign', 'lumar-crown').then(r => [r.ok, r.ship && r.ship.name]))), '· coins', await ev(() => window._coins));
  console.log('her resale value:', await ev(() => BridgeFleet.value(BridgeFleet.all().find(s => s.type === 'sovereign'))));
  // the Penthouse: its brass door on Skyport 7's roof pad
  await go('arcadia-skypad'); await wait(1500);
  console.log('penthouse door:', JSON.stringify(await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'PENTHOUSE'); return it && [it.type, it.x, it.y]; })));
  await ev(() => BridgeHome.buy('arcadia-penthouse')); await wait(400);
  await ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'PENTHOUSE'); BridgeInteractions.execute(it); });
  await wait(2500);
  console.log('through the door:', await ev(() => BridgeWorld.getWorldId()), '· coins', await ev(() => window._coins));
  await p.screenshot({ path: SHOTS + '/legacy_penthouse.png' });
  // Ashcombe House on Crownhaven's waterfront
  await go('lumar-crown'); await wait(1500);
  await ev(() => BridgeHome.buy('lumar-manor')); await wait(400);
  await ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'ASHCOMBE HOUSE'); BridgeInteractions.execute(it); });
  await wait(2500);
  console.log('through the door:', await ev(() => BridgeWorld.getWorldId()), '· coins', await ev(() => window._coins));
  await p.screenshot({ path: SHOTS + '/legacy_manor.png' });
  // the Starling on your holm: the dock rebuilt, the resort built, a manager hired
  await ev(() => { const st = BridgeHolm._state(); st.owned = Date.now(); st.built = { dock: Date.now(), house: Date.now(), resort: Date.now() }; localStorage.setItem('bridge_holm', JSON.stringify(st)); BridgeBusiness.grant('holm-resort'); });
  await go('lumar-holm'); await wait(2000);
  console.log('the Starling:', JSON.stringify(await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE STARLING'); return it && [it.x, it.y, BridgeWorld.getWorld().scene.layers.resort]; })));
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE STARLING'); BridgeInteractions.execute(it); });
  await wait(500);
  console.log('its books:', (await ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none')).replace(/\n+/g, ' / ').slice(0, 220));
  await ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  await ev(() => BridgeCharacter.init(34, 22)); await wait(1200);
  await p.screenshot({ path: SHOTS + '/legacy_resort.png' });
  // the ledger's Legacy list
  console.log('legacy:', JSON.stringify(await ev(() => BridgeLegacy.list().map(g => g.name + (g.done ? ' ✓' : '')))));
  await b.close();
})();
