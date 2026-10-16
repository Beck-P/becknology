// Businesses and the people who run them (js/business.js): buying one, hiring, takings only while it's open and
// staffed, a payday out of the takings, staff walking out unpaid, a venue that needs a manager, moving staff, the
// screen at the stall and an owner selling up in conversation. Time runs on a stand-in Date.now. node world/business.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const H = 3600000;
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('bridge_ship_location', 'lumar');
    const real = Date.now; window._off = 0; Date.now = () => real() + window._off;
  });
  await p.goto('http://127.0.0.1:8766/bridge/'); await p.waitForTimeout(2500);
  await p.evaluate(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 5000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  const st = (id) => ev((id) => { const s = BridgeBusiness.status(id); return { open: s.open, running: s.running, banks: s.banks, staff: s.staff.map(x => x.name + '/' + x.tier), pending: BridgeBusiness.pending(id), today: s.today, banked: s.banked }; }, id);
  // jump the clock forward an hour at a time (each tick works out the takings from where it left off)
  const ahead = (hours) => ev(async (hours) => { for (let i = 0; i < hours; i++) { window._off += 3600000; BridgeBusiness._tick(); await new Promise(r => setTimeout(r, 5)); } }, hours);

  console.log('catalogue', await ev(() => BridgeBusiness.all().length + ' businesses: ' + BridgeBusiness.all().map(d => d.kind).join(',')));
  console.log('buy fish stall', JSON.stringify(await ev(() => BridgeBusiness.buy('fish-stall'))), 'coins', await ev(() => window._coins));
  console.log('status bought, nobody hired', JSON.stringify(await st('fish-stall')));
  await ahead(8);
  console.log('after 8h with nobody: pending', await ev(() => BridgeBusiness.pending('fish-stall')));
  const cands = await ev(() => BridgeBusiness.candidates('fish-stall'));
  console.log('candidates', cands.map(c => c.name + ' ' + c.tier + ' ' + c.wage).join(' | '));
  const c0 = await ev(() => window._coins);
  console.log('hire hand', JSON.stringify((await ev((c) => BridgeBusiness.hire('fish-stall', c), cands[0])).ok), 'paid', c0 - await ev(() => window._coins), '(wage ' + cands[0].wage + ')');
  console.log('candidates now', (await ev(() => BridgeBusiness.candidates('fish-stall'))).length, '(the hand is taken)');
  console.log('full stall: hire again', JSON.stringify(await ev((c) => BridgeBusiness.hire('fish-stall', c), cands[1])));
  // a whole Lumar day (8 h) with a hand: it earns only in its open hours
  let open = 0;
  for (let i = 0; i < 24; i++) { if (await ev(() => BridgeBusiness.openNow('fish-stall'))) open++; await ahead(1); }
  const s1 = await st('fish-stall');
  console.log('24h with a hand: open', open, 'of 24 sampled hours; pending', s1.pending, '(rate 75 a 1.0 skill-ish hand; capped at', await ev(() => Math.round(75 * 1.6 * BridgeBusiness.cap('fish-stall'))) + ')');
  // payday: the next ET day's wage comes out of what the stall's holding
  const owe0 = await ev(() => BridgeBusiness.owing().total);
  console.log('wages owed after the day turned', owe0, 'staff', JSON.stringify(await ev(() => BridgeBusiness.staff().map(x => [x.name, Math.ceil(x.owe), x.missed]))));
  console.log('collect', JSON.stringify(await ev(() => BridgeBusiness.collect('fish-stall'))));
  // broke: no takings, no coins — two paydays and the hand walks out
  // (the stall's takings frozen: its clock set ahead, so nothing accrues to pay them from)
  const broke = () => ev(() => { const s = BridgeBusiness._state().biz['fish-stall']; s.held = 0; s.bank = 0; s.last = Date.now() + 9e8; window._coins = 0; });
  for (let d = 0; d < 3; d++) {      // the wage is owed a day ahead: two paydays pass with it unpaid by the third
    await broke();
    await ev(() => { window._off += 86400000; BridgeBusiness._tick(); });
    await wait(50);
    console.log('payday', d + 1, 'unpaid: owing', JSON.stringify(await ev(() => BridgeBusiness.owing())));
  }
  await ev(() => { BridgeBusiness._state().biz['fish-stall'].last = Date.now(); });
  console.log('three paydays, two unpaid: staff', JSON.stringify(await ev(() => BridgeBusiness.staff().map(x => x.name))), 'log:', await ev(() => BridgeBusiness.log()[0].t));
  // a venue: a hand alone won't open it; a manager does, and banks to you
  await ev(() => { window._coins = 200000; });
  await ev(() => BridgeBusiness.buy('hayloft'));
  const vc = await ev(() => BridgeBusiness.candidates('hayloft'));
  await ev((c) => BridgeBusiness.hire('hayloft', c), vc.find(c => c.tier === 'hand'));
  console.log('venue with a hand', JSON.stringify(await st('hayloft')));
  await ev((c) => BridgeBusiness.hire('hayloft', c), vc.find(c => c.tier === 'manager'));
  const before = await ev(() => window._coins);
  await ahead(12);
  const v = await st('hayloft');
  console.log('venue with a manager, 12h:', JSON.stringify(v), 'coins banked in', await ev(() => window._coins) - before);
  // a specialist in their own trade
  const sp = vc.find(c => c.tier === 'specialist');
  await ev((c) => BridgeBusiness.hire('hayloft', c), sp);
  console.log('specialist', sp.title, 'perHour', await ev(() => BridgeBusiness.perHour('hayloft')));
  // move the hand to the crusty loaf (same planet: within the hour)
  await ev(() => BridgeBusiness.buy('crusty-loaf'));
  const hand = await ev(() => BridgeBusiness.staff('hayloft').find(x => x.tier === 'hand').id);
  console.log('move', JSON.stringify(await ev((id) => BridgeBusiness.move(id, 'crusty-loaf'), hand)), 'loaf staff now', (await st('crusty-loaf')).staff.length, '(on the way)');
  await ahead(1);
  console.log('an hour later at the loaf', JSON.stringify((await st('crusty-loaf')).staff));
  // the screen at the stall, and the ledger
  await ev(() => new Promise(r => BridgeWorld.load('lumar-sapphire', () => { BridgeState.transition('world', { worldId: 'lumar-sapphire' }); r(); })));
  await wait(1500);
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'FISH STALL'); BridgeInteractions.execute(it); });
  await wait(500);
  console.log('stall screen:', (await ev(() => document.querySelector('.world-dialog').innerText)).replace(/\n+/g, ' / ').slice(0, 400));
  await p.screenshot({ path: SHOTS + '/biz_stall.png' });
  await ev(() => [...document.querySelectorAll('.wd-opt')].find(x => /Hire someone/.test(x.textContent)).click());
  await wait(400);
  console.log('hire screen:', (await ev(() => document.querySelector('.world-dialog').innerText)).replace(/\n+/g, ' / ').slice(0, 400));
  await p.screenshot({ path: SHOTS + '/biz_hire.png' });
  await p.keyboard.press('Escape');
  // Bridget sells up in conversation
  await ev(() => new Promise(r => BridgeWorld.load('verdance-village', () => { BridgeState.transition('world', { worldId: 'verdance-village' }); r(); })));
  await wait(1500);
  const talk = await ev(() => {
    const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'PERCY');
    if (!it) return 'no PERCY';
    BridgeInteractions.execute(it);
    const o = [...document.querySelectorAll('.wd-opt')].map(x => x.textContent);
    const btn = [...document.querySelectorAll('.wd-opt')].find(x => /sell up/.test(x.textContent));
    if (btn) btn.click();
    return o.join(' | ');
  });
  await wait(500);
  console.log('Percy topics:', talk);
  console.log('after asking:', (await ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none')).replace(/\n+/g, ' / ').slice(0, 300));
  await p.screenshot({ path: SHOTS + '/biz_percy.png' });
  await b.close();
})();
