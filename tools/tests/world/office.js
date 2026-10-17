// The captain's office (js/worlds/office.js): through its door in the bridge's south wall; the desk (its menu: the ledger), the
// staff board (a face for everyone working for you, pinned live), the chart table (your ships as pins, one under way;
// orders: send one anywhere), the strongbox (the accounts: pay what's owed, a business's books), sitting at the desk,
// the window. node world/office.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && !/supabase|\/api\//.test(r.url())) console.log('http', r.status(), r.url().replace(/^https?:\/\/[^/]+/, '')); });
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
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', at ? { worldId: w, spawn: at } : { worldId: w }); r(); })), [w, at]);
  const text = () => ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none');
  const done = async () => { await ev(() => { const b = [...document.querySelectorAll('.world-dialog .wd-opt')].pop(); if (b) b.click(); }); await wait(400); };   // its Done / Leave
  const flat = (t) => t.replace(/\n+/g, ' | ');
  // stand at (x, y) facing a way; say what's in front of you
  const stand = async (x, y, facing) => {
    await ev(([x, y, f]) => { BridgeCharacter.init(x, y); BridgeCharacter.setFacing(f); }, [x, y, facing]);
    await wait(400);
    return ev(() => { const t = BridgeInteractions.getTarget(); return t ? t.label : 'nothing'; });
  };
  // the screen rect of a block of tiles (for close-up shots)
  const clip = (r, pad) => ev(([r, pad]) => {
    const v = BridgeWorld.getScreenView();
    return { x: v.offX + (r[0] - pad) * v.ts, y: v.offY + (r[1] - pad) * v.ts, width: (r[2] - r[0] + 2 * pad) * v.ts, height: (r[3] - r[1] + 2 * pad) * v.ts };
  }, [r, pad]);

  // an empire to run: a brigantine with hands aboard, a cutter sent off on a passage, a business and its staff, a crew member
  await go('lumar-crown'); await wait(1200);
  console.log('set up:', JSON.stringify(await ev(async () => {
    await BridgeFleet.buy('brigantine', 'lumar-crown');
    await BridgeFleet.buy('cutter', 'lumar-crown');
    for (const r of BridgeFleet.recruits('lumar-crown')) await BridgeFleet.hire(r, 'lumar-crown');
    await BridgeBusiness.buy('crown-anchor');
    for (const c of BridgeBusiness.candidates('crown-anchor')) await BridgeBusiness.hire('crown-anchor', c);
    const ok = BridgePeople.all().okafor; if (ok) await BridgeCrew.hire(Object.assign({ id: 'okafor' }, ok));
    const cut = BridgeFleet.all().find(s => s.type === 'cutter');
    const o = BridgeFleet.order(cut.id, 'lumar-rose');
    return { ships: BridgeFleet.all().map(s => s.name + ' (' + s.type + ')'), hands: BridgeFleet.crew().length, staff: BridgeBusiness.staff().length, sent: o };
  })));
  await ev(() => { window._off += 20 * 60000; });       // the cutter well out on her passage

  // the bridge: its door to the office
  await go('bridge'); await wait(1500);
  console.log('the office door:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.target === 'office').map(i => [i.x, i.y, i.label]))));
  console.log('the side table is a side table again:', JSON.stringify(await ev(() => (BridgeWorld.getWorld().interactions.find(i => i.x === 11 && i.y === 11) || {}).label)));
  console.log('at the door, target:', await stand(5, 12, 'down'));
  await p.screenshot({ path: SHOTS + '/office_door.png' });
  await p.keyboard.press('e'); await wait(2500);
  console.log('through the door:', JSON.stringify(await ev(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY()])));
  await ev(() => document.querySelectorAll('.quest-toast, #quest-toast').forEach(x => x.remove()));
  await p.screenshot({ path: SHOTS + '/office_room.png' });

  // walk up to the desk: the ledger
  await p.keyboard.down('ArrowUp'); await wait(1600); await p.keyboard.up('ArrowUp'); await wait(300);
  console.log('walked up to:', JSON.stringify(await ev(() => [BridgeCharacter.getX(), BridgeCharacter.getY(), (BridgeInteractions.getTarget() || {}).label])));
  await p.keyboard.press('e'); await wait(1200);
  console.log('the desk:', (await text()).replace(/\n+/g, ' | ').slice(0, 160));
  await ev(() => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /whole ledger/.test(x.textContent)); if (r) r.click(); });
  await wait(1000);
  console.log('the desk opens:', JSON.stringify(await ev(() => { const m = document.getElementById('game-menu'); return m && m.classList.contains('open') ? m.dataset.tab : 'closed'; })));
  await p.screenshot({ path: SHOTS + '/office_desk.png' });
  await p.keyboard.press('Escape'); await wait(500);

  // the staff board: everyone's face, and the staff page
  console.log('roster:', JSON.stringify(await ev(() => BridgeLedger.roster().map(x => x.name + ':' + x.state + (x.sheet ? ':' + x.sheet : '')))));
  const board = await ev(() => BridgeWorld.getWorld().office.board), chart = await ev(() => BridgeWorld.getWorld().office.chart);
  await stand(8, 9, 'down'); await wait(1500);                 // close-ups with nothing in front of them
  await p.screenshot({ path: SHOTS + '/office_board.png', clip: await clip(board, 0.6) });
  await p.screenshot({ path: SHOTS + '/office_chart.png', clip: await clip(chart, 0.5) });
  console.log('at the board, target:', await stand(13, 5, 'up'));
  console.log('faces drawn on the board:', await ev(() => {
    const c = document.getElementById('bridge-canvas') || document.querySelector('canvas'), v = BridgeWorld.getScreenView(), r = BridgeWorld.getWorld().office.board;
    const g = c.getContext('2d'), dpr = c.width / c.clientWidth;
    const d = g.getImageData(Math.round((v.offX + r[0] * v.ts) * dpr), Math.round((v.offY + r[1] * v.ts) * dpr), Math.round((r[2] - r[0]) * v.ts * dpr), Math.round((r[3] - r[1]) * v.ts * dpr)).data;
    let paper = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] > 160 && d[i + 2] > 120) paper++;
    return paper + ' card pixels';
  }));
  await p.keyboard.press('e'); await wait(1200);
  console.log('staff page:', flat(await ev(() => (document.querySelector('.lg-staff') || {}).innerText || 'none')).slice(0, 300));
  await p.screenshot({ path: SHOTS + '/office_staff.png' });
  await p.keyboard.press('Escape'); await wait(500);

  // the chart table: the ships pinned, and orders
  console.log('at the chart, target:', await stand(3, 9, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('orders:', flat(await text()).slice(0, 400));
  await p.screenshot({ path: SHOTS + '/office_orders.png' });
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].filter(x => !x.classList.contains('none'))[0].click());
  await wait(600);
  console.log('her screen:', flat(await text()).slice(0, 200));     // (js/orders.js: her captain, her orders, or send her once)
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Send her somewhere/.test(x.textContent)).click());
  await wait(600);
  console.log('send screen:', flat(await text()).slice(0, 200));
  await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Sapphire/.test(x.textContent)).click());
  await wait(600);
  console.log('orders given:', flat(await text()).slice(0, 260));
  console.log('ships now:', JSON.stringify(await ev(() => BridgeFleet.all().filter(s => s.type !== 'sloop').map(s => s.name + ': ' + BridgeFleet.where(s)))));
  await done();
  await ev(() => { window._off += 5 * 60000; }); await stand(8, 9, 'down'); await wait(800);
  await p.screenshot({ path: SHOTS + '/office_chart2.png', clip: await clip(chart, 0.5) });

  // a payday with an empty purse, then the strongbox: the accounts, and what's owed paid once there's money again
  await ev(() => { window._coins = 0; window._off += 86400000; BridgeBusiness._tick(); });
  console.log('owing after a payday:', JSON.stringify(await ev(() => BridgeBusiness.owing().total)));
  console.log('at the strongbox, target:', await stand(15, 8, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('accounts:', flat(await text()).slice(0, 500));
  await p.screenshot({ path: SHOTS + '/office_accounts.png' });
  const pay = await ev(() => { window._coins = 500000; const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /owed/.test(x.textContent)); if (r) r.click(); return !!r; });
  if (pay) { await wait(1200); console.log('after paying:', flat(await text()).slice(0, 200), '· owing', JSON.stringify(await ev(() => BridgeBusiness.owing().total))); }
  await ev(() => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Crown/.test(x.textContent)); if (r) r.click(); });
  await wait(700);
  console.log('its books:', flat(await text()).slice(0, 200));
  await done();

  // sit at the desk; look out of the window
  console.log('behind the desk, target:', await stand(9, 4, 'left'));
  await p.keyboard.press('e'); await wait(900);
  console.log('seated:', JSON.stringify(await ev(() => BridgeCharacter.isSeated())));
  await p.screenshot({ path: SHOTS + '/office_seated.png' });
  await p.keyboard.press('ArrowDown'); await wait(500);
  console.log('at the window, target:', await stand(10, 4, 'up'));
  await p.keyboard.press('e'); await wait(1800);
  console.log('the view:', JSON.stringify(await ev(() => { const v = document.getElementById('view-panel'); return v ? v.className : 'none'; })));
  await p.screenshot({ path: SHOTS + '/office_window.png' });
  await p.keyboard.press('Escape'); await wait(800);

  // and back out to the bridge
  console.log('at the way out, target:', await stand(8, 10, 'down'));
  await p.keyboard.press('e'); await wait(2500);
  console.log('back on the bridge:', JSON.stringify(await ev(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY()])));
  await b.close();
})();
