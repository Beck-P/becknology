// Running it from the office (the empire plan's chunk 3): captains hired onto your ships, standing orders that run on
// the clock while the game's closed (a trade loop; a supply run from the holm's warehouse to the Tern's Rest), what they
// made banked to you and filed in the treasury, the morning dispatch (seeded by the date; a choice that changes what
// your captains do), and the office's panels — the desk, the chart table's live route lines, the workshop book (queue
// from it), the treasury's graphs — on a desktop and a phone. node world/empire.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
  const p = await ctx.newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errors++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  p.on('response', r => { if (r.status() >= 400 && !/supabase|\/api\//.test(r.url())) console.log('http', r.status(), r.url().replace(/^https?:\/\/[^/]+/, '')); });
  await ctx.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  // the clock can be moved on across a reload (the game closed and opened again later): sessionStorage keeps the offset
  await ctx.addInitScript(() => {
    localStorage.setItem('bridge_ship_location', 'lumar');
    const real = Date.now; window._off = +(sessionStorage.getItem('_off') || 0); Date.now = () => real() + window._off;
  });
  const URL = 'http://127.0.0.1:8766/bridge/?at=2026-10-16T09:00';   // (BRIDGE_PORT: chrome.js answers it from this checkout)
  await p.goto(URL); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  const stub = () => ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = +(sessionStorage.getItem('_coins') || 900000);
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, sessionStorage.setItem('_coins', window._coins), { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve((window._coins += n, sessionStorage.setItem('_coins', window._coins), window._coins));
  });
  await stub();
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', at ? { worldId: w, spawn: { x: at[0], y: at[1] } } : { worldId: w }); r(); })), [w, at]);
  const text = () => ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none');
  const flat = (t) => t.replace(/\n+/g, ' | ');
  const row = (re) => ev((src) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => new RegExp(src).test(x.textContent) && !x.classList.contains('none') && !x.classList.contains('info')); if (r) r.click(); return !!r; }, re.source);
  const btn = (re) => ev((src) => { const r = [...document.querySelectorAll('.world-dialog .wd-opt')].find(x => new RegExp(src).test(x.textContent) && !x.disabled); if (r) r.click(); return !!r; }, re.source);
  const done = async () => { await ev(() => { const b = [...document.querySelectorAll('.world-dialog .wd-opt')].pop(); if (b) b.click(); }); await wait(400); };
  const stand = async (x, y, facing) => {
    await ev(([x, y, f]) => { BridgeCharacter.init(x, y); BridgeCharacter.setFacing(f); }, [x, y, facing]);
    await wait(400);
    return ev(() => { const t = BridgeInteractions.getTarget(); return t ? t.label : 'nothing'; });
  };
  const clip = (r, pad) => ev(([r, pad]) => {
    const v = BridgeWorld.getScreenView();
    return { x: v.offX + (r[0] - pad) * v.ts, y: v.offY + (r[1] - pad) * v.ts, width: (r[2] - r[0] + 2 * pad) * v.ts, height: (r[3] - r[1] + 2 * pad) * v.ts };
  }, [r, pad]);
  const noToasts = () => ev(() => document.querySelectorAll('.quest-toast, #quest-toast').forEach(x => x.remove()));

  // ---- an empire to run: two ships with hands, the holm with its dock, warehouse and workshop, the Tern's Rest -----------
  await go('lumar-crown'); await wait(1200);
  console.log('set up:', JSON.stringify(await ev(async () => {
    localStorage.setItem('bridge_holm', JSON.stringify({ owned: true, name: 'Starling Holm', built: { dock: 1, warehouse: 1, quarters: 1, workshop: 1 },
      store: { silverfin: 30, harbour_crab: 18, egg: 24, turnip: 16, pine_log: 12 }, chest: 0, log: [] }));
    BridgeHolm.reload();
    await BridgeFleet.buy('cutter', 'lumar-crown');
    await BridgeFleet.buy('brigantine', 'lumar-crown');
    for (const r of BridgeFleet.recruits('lumar-crown')) await BridgeFleet.hire(r, 'lumar-crown');
    const cut = BridgeFleet.all().find(s => s.type === 'cutter'), h = BridgeFleet.crew()[0];
    if (h) BridgeFleet.assign(h.id, cut.id);                     // a hand for the cutter too
    await BridgeBusiness.buy('terns-rest');
    for (const c of BridgeBusiness.candidates('terns-rest')) await BridgeBusiness.hire('terns-rest', c);
    return { ships: BridgeFleet.all().map(s => s.name + ' (' + s.type + ')'), hands: BridgeFleet.crew().length, staff: BridgeBusiness.staff().length,
             stock: BridgeBusiness.stockOf('terns-rest'), store: BridgeHolm.stored() };
  })));
  const ids = await ev(() => { const a = BridgeFleet.all(); return { cutter: a.find(s => s.type === 'cutter').id, brig: a.find(s => s.type === 'brigantine').id }; });

  // ---- captains: three a day; hired onto a ship each -----------------------------------------------------------------
  console.log('captains for hire:', JSON.stringify(await ev(() => BridgeOrders.candidates().map(c => c.name + ' · ' + c.title + ' · ' + c.wage + '/day' + (c.locked ? ' (locked: ' + c.locked + ')' : '')))));
  console.log('hire:', JSON.stringify(await ev(async (ids) => {
    const cs = BridgeOrders.candidates();
    const a = await BridgeOrders.hire(cs[0], ids.cutter), c = await BridgeOrders.hire(cs[1], ids.brig);
    return [a.ok, c.ok, BridgeOrders.captainOf(ids.cutter).name, BridgeOrders.captainOf(ids.brig).name, BridgeBusiness.staff('captain').length + ' on the payroll'];
  }, ids)));

  // ---- standing orders: the cutter on today's best loop, the brigantine on a supply run to the Tern's Rest ------------------
  console.log('best loops for the cutter:', JSON.stringify(await ev((id) => BridgeOrders.loops(id).map(x => x.ports.join('>') + ' ~' + x.est.profit + '/run every ' + x.est.mins + 'min'), ids.cutter)));
  console.log('orders given:', JSON.stringify(await ev((ids) => {
    const best = BridgeOrders.loops(ids.cutter)[0];
    const a = BridgeOrders.set(ids.cutter, { kind: 'trade', ports: best.ports });
    const c = BridgeOrders.set(ids.brig, { kind: 'supply', to: 'terns-rest' });
    return [a, c, BridgeFleet.where(BridgeFleet.get(ids.cutter)), BridgeFleet.where(BridgeFleet.get(ids.brig))];
  }, ids)));
  const before = await ev(() => ({ coins: window._coins, stock: BridgeBusiness.stockOf('terns-rest').units, store: BridgeHolm.stored(), runs: BridgeOrders.summary().runs }));
  console.log('before the time away:', JSON.stringify(before));

  // ---- the game closed for eight hours: the orders run on the clock, worked out as it opens again ------------------------
  await ev(() => { sessionStorage.setItem('_off', String(window._off + 8 * 3600000)); });
  await p.goto(URL); await wait(2500); await stub();
  await go('lumar-crown'); await wait(800);
  const after = await ev(() => {
    BridgeOrders.advance();
    return { coins: window._coins, stock: BridgeBusiness.stockOf('terns-rest').units, store: BridgeHolm.stored(), sum: BridgeOrders.summary(),
             lines: BridgeOrders.list().map(x => x.ship.name + ': ' + x.line), runs: BridgeOrders.list().map(x => x.order ? x.order.last.map(r => '+' + r.made + ' ' + r.story).slice(0, 3) : []) };
  });
  console.log('after eight hours away:', JSON.stringify(after).slice(0, 900));
  await wait(600);
  console.log('orders away: runs ' + after.sum.runs + ', made ' + after.sum.made + ', coins ' + (await ev(() => window._coins) - before.coins) + ' more (stock at the Tern\'s Rest ' + before.stock + ' → ' + after.stock + ')');

  // ---- the treasury: where the money came from ---------------------------------------------------------------------------
  console.log('treasury:', JSON.stringify(await ev(() => { const w = BridgeTreasury.week(); return Object.keys(w.tot).map(k => k + ' in ' + w.tot[k].in + ' out ' + w.tot[k].out).concat(['net ' + w.net]); })));
  console.log('hints:', JSON.stringify(await ev(() => BridgeTreasury.hints().map(h => h.kind + ': ' + h.text))));

  // ---- the morning dispatch: seeded by the date, a choice that changes what the captains do --------------------------------
  console.log('dispatch today:', JSON.stringify(await ev(() => BridgeDispatch.today().map(i => i.kind + ': ' + i.title + ' [' + i.choices.map(c => c.key).join('/') + ']'))));
  console.log('same seed, same dispatch:', JSON.stringify(await ev(() => { const a = BridgeDispatch.today().map(i => i.title).join('|'); const d = BridgeDispatch._state().day; BridgeDispatch._day(d); const b2 = BridgeDispatch.today().map(i => i.title).join('|'); BridgeDispatch._day(null); BridgeDispatch.today(); return a === b2; })));
  // a day with a blockade: buy the escort — the risk on those legs drops
  console.log('a blockade:', JSON.stringify(await ev(async () => {
    const d0 = BridgeDispatch._state().day;
    for (let d = d0 + 1; d < d0 + 40; d++) {
      BridgeDispatch._day(d);
      const it = BridgeDispatch.today().find(i => i.kind === 'blockade');
      if (!it) continue;
      const t = it.fx.from + 3600000, before = BridgeDispatch.blockade(it.sea, t);
      const r = await BridgeDispatch.pick(it.id, 'escort');
      return { day: d - d0, sea: it.sea, kinds: BridgeDispatch.today().map(i => i.kind), before: before.choice, after: BridgeDispatch.blockade(it.sea, t).choice, text: r.text, fee: it.fee };
    }
    return 'none in 40 days';
  })));
  console.log('a storm closes a port:', JSON.stringify(await ev(() => {
    const d0 = BridgeDispatch._state().day;
    for (let d = d0 + 1; d < d0 + 40; d++) {
      BridgeDispatch._day(d);
      const it = BridgeDispatch.today().find(i => i.kind === 'storm');
      if (it) return { day: d - d0, port: it.port, closed: BridgeDispatch.closed(it.port, it.fx.from + 3600000), open_before: BridgeDispatch.closed(it.port, it.fx.from - 3600000) };
    }
    return 'none';
  })));
  await ev(() => { BridgeDispatch._day(null); BridgeDispatch._state().day = null; BridgeDispatch.today(); });
  // a buyer taken on: a contract a captain can carry
  console.log('a buyer:', JSON.stringify(await ev(async () => {
    const d0 = BridgeDispatch._state().day;
    for (let d = d0; d < d0 + 30; d++) {
      BridgeDispatch._day(d);
      const it = BridgeDispatch.today().find(i => i.kind === 'buyer');
      if (!it) continue;
      const r = await BridgeDispatch.pick(it.id, 'take');
      return { text: r.text, contract: BridgeTrade.mine().filter(c => c.dispatch).map(c => c.n + ' ' + c.good + ' ' + c.from + '>' + c.to + ' fee ' + c.fee) };
    }
    return 'none';
  })));
  await ev(() => { BridgeDispatch._day(null); BridgeDispatch._state().day = null; BridgeDispatch.today(); });

  // ---- the office: the desk, the chart's lines, the workshop book, the treasury ---------------------------------------------
  await go('office', [8, 9]); await wait(1800); await noToasts();
  await stand(8, 9, 'down'); await wait(1200);
  const chart = await ev(() => BridgeWorld.getWorld().office.chart);
  await p.screenshot({ path: SHOTS + '/empire_room.png' });
  await p.screenshot({ path: SHOTS + '/empire_chart.png', clip: await clip(chart, 0.5) });
  console.log('route lines on the chart:', await ev(() => {
    const c = document.getElementById('bridge-canvas') || document.querySelector('canvas'), v = BridgeWorld.getScreenView(), r = BridgeWorld.getWorld().office.chart;
    const g = c.getContext('2d'), dpr = c.width / c.clientWidth, cols = BridgeOrders.routes().map(x => x.colour);
    const d = g.getImageData(Math.round((v.offX + r[0] * v.ts) * dpr), Math.round((v.offY + r[1] * v.ts) * dpr), Math.round((r[2] - r[0]) * v.ts * dpr), Math.round((r[3] - r[1]) * v.ts * dpr)).data;
    const rgb = cols.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const n = rgb.map(() => 0);
    for (let i = 0; i < d.length; i += 4) rgb.forEach((q, k) => { if (Math.abs(d[i] - q[0]) + Math.abs(d[i + 1] - q[1]) + Math.abs(d[i + 2] - q[2]) < 70) n[k]++; });
    return cols.map((c, k) => c + ': ' + n[k] + ' px').join(', ');
  }));
  await p.screenshot({ path: SHOTS + '/empire_letter_sealed.png', clip: await clip([6.5, 4.2, 10.8, 6.6], 0.2) });
  console.log('the letter on the desk is sealed:', JSON.stringify(await ev(() => BridgeDispatch.unread() > 0)));
  console.log('at the desk, target:', await stand(8, 6, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('desk:', flat(await text()).slice(0, 500));
  await p.screenshot({ path: SHOTS + '/empire_desk.png' });
  await row(/morning dispatch/); await wait(600);
  console.log('dispatch:', flat(await text()).slice(0, 400));
  await p.screenshot({ path: SHOTS + '/empire_dispatch.png' });
  await ev(() => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].filter(x => !x.classList.contains('none'))[0]; if (r) r.click(); });
  await wait(600);
  console.log('a dispatch item:', flat(await text()).slice(0, 400));
  await p.screenshot({ path: SHOTS + '/empire_item.png' });
  await done(); await wait(300);
  await stand(8, 9, 'down'); await wait(1500);
  await p.screenshot({ path: SHOTS + '/empire_letter.png', clip: await clip([6.5, 4.2, 10.8, 6.6], 0.2) });

  // the chart table: standing orders, a ship, her orders changed there
  console.log('at the chart, target:', await stand(3, 9, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('orders:', flat(await text()).slice(0, 500));
  await p.screenshot({ path: SHOTS + '/empire_orders.png' });
  await row(/Cutter|cutter/); await wait(700);
  console.log('her orders:', flat(await text()).slice(0, 500));
  await p.screenshot({ path: SHOTS + '/empire_ship.png' });
  await row(/→ back|Supply/); await wait(600);
  await row(/trade loop/); await wait(900);
  console.log('loops:', flat(await text()).slice(0, 400));
  await row(/Choose the ports/); await wait(500);
  await row(/Tern Holm/); await wait(400); await row(/Crimson Reach/); await wait(400);
  await btn(/That's her loop/); await wait(800);
  console.log('changed:', flat(await text()).slice(0, 300));
  await done();
  console.log('routes now:', JSON.stringify(await ev(() => BridgeOrders.routes().map(r => r.kind + ' ' + r.loop.join('>') + (r.leg ? ' (' + r.leg.from + '>' + r.leg.to + ')' : '')))));
  // a buyer's contract on her loop: the captain carries it herself
  console.log('a contract for her loop:', JSON.stringify(await ev(() => {
    BridgeTrade.take({ id: 'dispatch:test', from: 'lumar-tern', to: 'lumar-crimson', good: 'salt_fish', n: 10, fee: 500, due: BridgeTrade.today() + 3, dispatch: true });
    return BridgeTrade.mine().filter(c => c.dispatch).map(c => c.id);
  })));

  // the workshop book: its queue, its smiths, what's made; queue more from here
  console.log('at the workshop book, target:', await stand(10, 6, 'up'));
  await p.keyboard.press('e'); await wait(800);
  console.log('workshop book:', flat(await text()).slice(0, 300));
  await btn(/Queue more/); await wait(500);
  await row(/Materials/); await wait(500);
  await row(/pine planks/i); await wait(500);
  await row(/One/); await wait(700);
  console.log('queued:', flat(await text()).slice(0, 300));
  await p.screenshot({ path: SHOTS + '/empire_workshop.png' });
  await done();

  // the counting table: the treasury and its graphs
  console.log('at the counting table, target:', await stand(12, 8, 'up'));
  await p.keyboard.press('e'); await wait(900);
  console.log('treasury panel:', flat(await text()).slice(0, 600));
  console.log('graph:', JSON.stringify(await ev(() => { const c = document.querySelector('.world-dialog .wd-art'); return c ? [c.width, c.height, c.style.width] : 'none'; })));
  await p.screenshot({ path: SHOTS + '/empire_treasury.png' });
  await done();

  // the ledger: today, the treasury, standing orders, captains on the payroll
  await ev(() => BridgeMenu.open('ledger')); await wait(900);
  console.log('ledger sections:', JSON.stringify(await ev(() => [...document.querySelectorAll('#game-menu .jn-sec-title')].map(x => x.textContent))));
  console.log('ledger orders:', flat(await ev(() => (document.querySelector('.lg-orders') || {}).innerText || 'none')).slice(0, 400));
  console.log('staff page captains:', JSON.stringify(await ev(() => [...document.querySelectorAll('.lg-staff .lg-row b')].map(x => x.textContent).filter(t => /mate|captain|master/.test(t)))));
  await p.screenshot({ path: SHOTS + '/empire_ledger.png' });
  await ev(() => { const s = document.querySelector('.lg-treasury'); if (s) s.scrollIntoView(); }); await wait(300);
  await p.screenshot({ path: SHOTS + '/empire_ledger_treasury.png' });
  await p.keyboard.press('Escape'); await wait(400);
  console.log('board roster:', JSON.stringify(await ev(() => BridgeLedger.roster().map(x => x.name + ':' + x.state))));

  console.log('needs you:', JSON.stringify(await ev(() => BridgeOrders.needs().map(n => n.name + ': ' + n.sub))));
  // six hours on: the buyer's crates delivered on her loop; then stop her: she finishes her leg and lies at that port
  await ev(() => { sessionStorage.setItem('_off', String(window._off + 6 * 3600000)); window._off += 6 * 3600000; BridgeOrders.advance(); });
  console.log('the contract after six hours:', JSON.stringify(await ev(() => ({ open: BridgeTrade.mine().filter(c => c.dispatch).map(c => c.id), runs: (BridgeOrders.get(BridgeFleet.all().find(s => s.type === 'cutter').id) || { last: [] }).last.map(r => '+' + r.made + ' ' + r.story).slice(0, 3) }))));
  console.log('stop:', JSON.stringify(await ev((id) => { BridgeOrders.stop(id); const o = BridgeOrders.get(id); return { stopping: !!(o && o.stop), line: BridgeFleet.where(BridgeFleet.get(id)) }; }, ids.cutter)));
  await ev(() => { sessionStorage.setItem('_off', String(window._off + 4 * 3600000)); window._off += 4 * 3600000; BridgeOrders.advance(); });
  console.log('after it:', JSON.stringify(await ev((id) => ({ order: !!BridgeOrders.get(id), where: BridgeFleet.where(BridgeFleet.get(id)) }), ids.cutter)));
  console.log('treasury at the end:', JSON.stringify(await ev(() => { const w = BridgeTreasury.week(); return Object.keys(w.tot).map(k => k + ' ' + w.tot[k].in + '/' + w.tot[k].out); })));

  // ---- a phone: the desk, the dispatch and the treasury fit ------------------------------------------------------------------
  const ph = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ph.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await ph.addInitScript(() => {
    localStorage.setItem('bridge_ship_location', 'lumar');
    const real = Date.now; window._off = +(sessionStorage.getItem('_off') || 0); Date.now = () => real() + window._off;
  });
  const q = await ph.newPage();
  q.on('pageerror', e => { errors++; console.log('PAGEERR(phone)', e.message.slice(0, 200)); });
  // the same save: copy it across
  const save = await ev(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^bridge_/.test(k)) o[k] = localStorage.getItem(k); } return { o, off: window._off }; });
  await q.goto(URL); await q.waitForTimeout(1500);
  await q.evaluate((s) => { Object.keys(s.o).forEach(k => localStorage.setItem(k, s.o[k])); sessionStorage.setItem('_off', String(s.off)); sessionStorage.setItem('_coins', '500000'); }, save);
  await q.goto(URL); await q.waitForTimeout(2500);
  await q.evaluate(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); window._coins = 500000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  await q.evaluate(() => new Promise(r => BridgeWorld.load('office', () => { BridgeState.transition('world', { worldId: 'office', spawn: { x: 8, y: 6 } }); r(); }))); await q.waitForTimeout(1800);
  await q.evaluate(() => document.querySelectorAll('.quest-toast, #quest-toast').forEach(x => x.remove()));
  await q.screenshot({ path: SHOTS + '/empire_phone_room.png' });
  await q.evaluate(() => BridgeOffice.desk()); await q.waitForTimeout(700);
  await q.screenshot({ path: SHOTS + '/empire_phone_desk.png' });
  await q.evaluate(() => BridgeDispatch.open()); await q.waitForTimeout(700);
  await q.screenshot({ path: SHOTS + '/empire_phone_dispatch.png' });
  await q.evaluate(() => BridgeOffice.treasury()); await q.waitForTimeout(700);
  console.log('phone treasury fits:', JSON.stringify(await q.evaluate(() => { const d = document.querySelector('.world-dialog'), r = d.getBoundingClientRect(), a = d.querySelector('.wd-art').getBoundingClientRect(); return { dialog: [Math.round(r.left), Math.round(r.right)], art: [Math.round(a.left), Math.round(a.right)], vw: innerWidth }; })));
  await q.screenshot({ path: SHOTS + '/empire_phone_treasury.png' });
  await q.evaluate(() => BridgeOrders.open()); await q.waitForTimeout(700);
  await q.screenshot({ path: SHOTS + '/empire_phone_orders.png' });
  console.log('errors:', errors);
  await b.close();
})();
