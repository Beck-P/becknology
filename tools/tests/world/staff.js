// The people who work for you: faces and what each grade does in the harbour's hiring list and at a business, ship's
// hands on the daily payroll, the ledger's Staff & payroll page (faces, wages, what they bring in, managing someone
// from it) and the captain's desk on the bridge. node world/staff.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('bridge_ship_location', 'lumar');
    const real = Date.now; window._off = 0; Date.now = () => real() + window._off;
  });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 500000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const go = (w) => ev((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  const text = () => ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none');
  const shut = () => ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));

  // the harbour's hands: a face each, and what their grade does
  await go('lumar-crown'); await wait(1500);
  await ev(() => BridgeFleet.buy('brigantine', 'lumar-crown'));
  await ev(() => BridgeHarbour.open('lumar-crown'));
  await wait(400);
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Sign on hands/.test(x.textContent)).click());
  await wait(1500);
  console.log('hands looking for a berth:', (await text()).replace(/\n+/g, ' | ').slice(0, 500));
  console.log('faces drawn:', await ev(() => [...document.querySelectorAll('canvas.sp-face')].filter(c => c.getContext('2d').getImageData(12, 10, 1, 1).data[3] > 0).length));
  await p.screenshot({ path: SHOTS + '/staff_hands.png' });
  await ev(() => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].filter(x => !x.classList.contains('none'))[0]; r.click(); });
  await wait(400);
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-opt')].find(x => /Sign them on/.test(x.textContent)).click());
  await wait(600);
  console.log('signed on:', JSON.stringify(await ev(() => BridgeFleet.crew().map(c => [c.name, c.role, BridgeFleet.GRADES[c.skill], BridgeFleet.wage(c)]))));
  await shut();
  // a business: hiring with faces
  await ev(() => BridgeBusiness.buy('crown-anchor'));
  await ev(() => BridgeInteractions.business('crown-anchor', { v: 'hire' }));
  await wait(1500);
  console.log('hiring at the Crown & Anchor:', (await text()).replace(/\n+/g, ' | ').slice(0, 420));
  await p.screenshot({ path: SHOTS + '/staff_hire.png' });
  const cand = await ev(() => BridgeBusiness.candidates('crown-anchor'));
  for (const c of cand) await ev((c) => BridgeBusiness.hire('crown-anchor', c), c);
  await shut();
  // a payday: the ship's hand is owed a day's wage with everyone else
  await ev(() => { window._off += 86400000; BridgeBusiness._tick(); });
  await wait(300);
  console.log('after a payday, owing:', JSON.stringify(await ev(() => BridgeBusiness.owing())), '· coins', await ev(() => window._coins));
  // the ledger's staff page, from the captain's desk on the bridge
  await go('bridge'); await wait(1500);
  console.log('the desk:', JSON.stringify(await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.action === 'office'); return it && [it.label, it.x, it.y]; })));
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.action === 'office'); BridgeInteractions.execute(it); });
  await wait(1500);
  console.log('staff page:', (await ev(() => (document.querySelector('.lg-staff') || {}).innerText || 'none')).replace(/\n+/g, ' | ').slice(0, 700));
  await p.screenshot({ path: SHOTS + '/staff_ledger.png' });
  // tap someone: their card
  await ev(() => document.querySelector('.lg-staff .lg-act').click());
  await wait(700);
  console.log('tapped:', (await text()).replace(/\n+/g, ' | ').slice(0, 300));
  await p.screenshot({ path: SHOTS + '/staff_person.png' });
  await b.close();
})();
