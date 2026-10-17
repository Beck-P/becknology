// Small happenings (js/events.js): every one forced in its own place and shot, the things you can do at them, the
// schedule the same on two pages, everyone's spots on open ground. node world/events.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
// [event, world, spawn x, y, ET time, seconds into it, weather pin]
const CASES = [
  ['trader', 'lumar-crown', 35, 33, '2026-10-14T03:20', 20],
  ['wedding', 'lumar-crown', 47, 23, '2026-10-14T03:20', 40],
  ['toyboats', 'lumar-crown', 34, 20, '2026-10-14T03:20', 30],
  ['fiddler', 'lumar-square', 15, 12, '2026-10-14T03:20', 20, ['lumar', 'fair']],
  ['brawl', 'lumar-square', 8, 9, '2026-10-14T07:30', 18],
  ['auction', 'lumar-tern', 28, 18, '2026-10-14T03:20', 20],
  ['celebrity', 'arcadia-street', 46, 11, '2026-10-14T21:00', 40],
  ['parcel', 'arcadia-street', 30, 11, '2026-10-14T21:00', 30],
  ['brownout', 'arcadia-street', 20, 11, '2026-10-14T21:00', 22],
  ['chase', 'arcadia-street', 22, 11, '2026-10-14T21:00', 4],
  ['hijack', 'arcadia-street', 22, 11, '2026-10-14T21:00', 6],
  ['hen', 'verdance-village', 20, 15, '2026-10-14T03:00', 12, ['verdance', 'fair']],
  ['mailcoach', 'verdance-village', 18, 22, '2026-10-14T03:00', 30, ['verdance', 'fair']],
  ['balloon', 'verdance-village', 24, 16, '2026-10-14T03:00', 70, ['verdance', 'fair']],
  ['kites', 'verdance-village', 30, 25, '2026-10-14T03:00', 20, ['verdance', 'cloudy']],
  ['rainbow', 'verdance-village', 22, 15, '2026-10-14T03:00', 60, ['verdance', 'fair']],
  ['blasting', 'hoarfell', 25, 15, '2026-10-14T03:00', 10, ['hoarfell', 'clear']],
  ['patrol', 'hoarfell', 30, 16, '2026-10-14T03:00', 14, ['hoarfell', 'clear']],
  ['sleigh', 'hoarfell', 22, 18, '2026-10-14T09:00', 14, ['hoarfell', 'clear']],
  ['snowball', 'hoarfell', 18, 23, '2026-10-14T03:00', 10, ['hoarfell', 'clear']],
  ['aurora', 'hoarfell', 21, 22, '2026-10-14T11:40', 20, ['hoarfell', 'clear']],
  ['lanterns', 'sylvara', 15, 21, '2026-10-14T18:40', 34, ['sylvara', 'clear']],
  ['stag', 'sylvara', 18, 16, '2026-10-14T22:00', 34, ['sylvara', 'clear']],
  ['bard', 'sylvara', 17, 15, '2026-10-14T15:00', 12, ['sylvara', 'clear']],
  ['flicker', 'enigma-ring', 16, 9, '2026-10-14T15:00', 5],
  ['door', 'enigma-ring', 27, 10, '2026-10-14T15:00', 3],
  ['comms', 'enigma', 9, 10, '2026-10-14T15:00', 6]
];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const page = async () => {
    const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); if (/\[events\]/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T03:20'); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
      window._coins = 900; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
      BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); }; });
    return p;
  };
  const p = await page();
  const ev = (f, a) => p.evaluate(f, a);
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: { x: a[1], y: a[2] } }); r(); })), [w, x, y]);
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; });
  const close = async () => { for (let i = 0; i < 3 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const use = async (label) => {
    const ok = await ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l && x.type === 'event'); if (!i) return false; BridgeInteractions.execute(i); return true; }, label);
    await p.waitForTimeout(500);
    if (ok) { await p.keyboard.press('e'); await p.waitForTimeout(250); }
    return ok;
  };
  const pick = async (re) => { const ok = await ev((s) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => new RegExp(s, 'i').test(x.textContent)); if (r) r.click(); return !!r; }, re); await p.waitForTimeout(500); return ok; };

  const problems = await ev(() => BridgeEvents._check());
  console.log('events check: errors ' + problems.length + (problems.length ? ' — ' + problems.join('; ') : ''));

  // the schedule: the same on a second page, a fair spread over a day
  const worlds = ['lumar-crown', 'lumar-square', 'lumar-tern', 'arcadia-street', 'verdance-village', 'hoarfell', 'sylvara', 'enigma-ring', 'enigma'];
  const p2 = await page();
  const s1 = await ev((w) => w.map(x => BridgeEvents._schedule(x, 6)), worlds);
  const s2 = await p2.evaluate((w) => w.map(x => BridgeEvents._schedule(x, 6)), worlds);
  console.log('schedule same on both pages:', JSON.stringify(s1) === JSON.stringify(s2), '· errors ' + (JSON.stringify(s1) === JSON.stringify(s2) ? 0 : 1));
  await p2.close();
  const day = await ev((w) => w.map(x => { const s = BridgeEvents._schedule(x, 24); const by = {}; s.forEach(e => by[e.id] = (by[e.id] || 0) + 1); return x + ' ' + s.length + ' ' + JSON.stringify(by); }), worlds);
  day.forEach(l => console.log('a day in ' + l));

  for (const c of CASES) {
    const [id, w, x, y, at, s, pin] = c;
    await ev((a) => { BridgeClock._at(a[0]); if (a[1]) BridgeWeather._pin(a[1][0], a[1][1]); }, [at, pin || null]);
    await go(w, x, y);
    await ev((a) => BridgeEvents._force(a[0], a[1]), [id, s]);
    await p.waitForTimeout(4500);                                   // long enough for a crowd to walk up
    const run = await ev(() => BridgeEvents._running());
    const crowd = await ev(() => typeof BridgeCrowd !== 'undefined' && BridgeCrowd._here ? BridgeCrowd._here().filter(c => c.gather).length : 'no crowds');
    await p.screenshot({ path: SHOTS + '/event_' + id + '.png' });
    let did = '';
    if (id === 'trader') { await use('SHIP\'S TRADER'); did = (await dialog()).slice(0, 120); await ev(() => document.querySelector('.world-dialog .wd-sell-row.pick:not(.none)').click()); await p.waitForTimeout(500); did += ' → coins ' + await ev(() => window._coins); }
    if (id === 'wedding') { await use('THE HAPPY COUPLE'); did = (await dialog()).slice(0, 90) + ' · cake ' + await ev(() => BridgeInventory.getCount('wedding_cake')); }
    if (id === 'toyboats') { await use('FOUNTAIN'); await pick('Back red'); did = (await dialog()).slice(0, 100); }
    if (id === 'fiddler') { await use('THE FIDDLER'); did = (await dialog()).slice(0, 100); }
    if (id === 'brawl') { await use('THE BRAWL'); await pick('Break it up'); did = (await dialog()).slice(0, 100) + ' · ale ' + await ev(() => BridgeInventory.getCount('mug_of_ale')); }
    if (id === 'auction') { await use('THE CATCH AUCTION'); await pick('Bid'); did = (await dialog()).slice(0, 110); }
    if (id === 'celebrity') { did = 'star at ' + await ev(() => JSON.stringify(BridgeWorld.getWorld().interactions.filter(i => i.label === 'THE STAR').map(i => [i.x, i.y]))); await ev(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE STAR'); if (i) BridgeInteractions.execute(i); }); await p.waitForTimeout(500); did += ' ' + (await dialog()).slice(0, 80) + ' · autograph ' + await ev(() => BridgeInventory.getCount('autograph')); }
    if (id === 'parcel') { await ev(() => BridgeEvents._force('parcel', 95)); await p.waitForTimeout(2200); did = 'loot on the street ' + await ev(() => typeof BridgeLoot !== 'undefined' && BridgeLoot.count ? BridgeLoot.count() : '?'); }
    if (id === 'hen') { const h = await ev(() => { const r = BridgeEvents._running()[0]; return null; }); await ev(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE HEN'); if (i) BridgeCharacter.init(i.x, i.y + 1); }); await p.waitForTimeout(150); await ev(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE HEN'); if (i) BridgeInteractions.execute(i); }); await p.waitForTimeout(500); did = (await dialog()).slice(0, 100) + ' · eggs ' + await ev(() => BridgeInventory.getCount('egg')); }
    if (id === 'mailcoach') { await ev(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE MAIL COACH'); if (i) BridgeInteractions.execute(i); }); await p.waitForTimeout(500); await p.keyboard.press('e'); await p.waitForTimeout(250); did = (await dialog()).slice(0, 120); }
    if (id === 'snowball') { await use('SNOWBALL FIGHT'); did = (await dialog()).slice(0, 80); await close(); await p.waitForTimeout(2500); await p.screenshot({ path: SHOTS + '/event_snowball_in.png' }); }
    if (id === 'aurora') { await use('TOVE\'S URN'); did = (await dialog()).slice(0, 80) + ' · cocoa ' + await ev(() => BridgeInventory.getCount('hot_cocoa')); }
    if (id === 'lanterns') { await use('THE PROCESSION'); did = (await dialog()).slice(0, 80) + ' · lantern ' + await ev(() => BridgeInventory.getCount('leaf_lantern')); }
    if (id === 'stag') { await ev(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE SPIRIT STAG'); if (i) { BridgeCharacter.init(i.x, i.y + 1); BridgeInteractions.execute(i); } }); await p.waitForTimeout(600); did = (await dialog()).slice(0, 90); }
    if (id === 'bard') { await use('THAELIN\'S SONG'); did = (await dialog()).slice(0, 90); }
    if (id === 'door') { await use('PRESSURE DOOR'); did = (await dialog()).slice(0, 80); }
    if (id === 'comms') { await use('ANTENNA ARRAY'); did = (await dialog()).slice(0, 110); }
    await close();
    console.log('event ' + id + ' in ' + w + ': running ' + JSON.stringify(run) + ' · gathered ' + crowd + (did ? ' | ' + did : ''));
    await ev((a) => { if (a) BridgeWeather._pin(a[0], null); BridgeEvents._clear(); }, pin || null);
  }
  // the journal heard about them, quietly
  console.log('journal notes:', await ev(() => JSON.parse(localStorage.getItem('bridge_log') || '[]').filter(l => l.k === 'Happening').length));
  // the hijack reaches the skywalk's screens too
  await ev(() => BridgeClock._at('2026-10-14T21:00'));
  await go('arcadia-skywalk', 15, 8);
  await ev(() => BridgeEvents._force('hijack', 4));
  await p.waitForTimeout(1500);
  console.log('screens on the skywalk show NULL:', await ev(() => BridgeEvents.screens() === 'null'));
  await p.screenshot({ path: SHOTS + '/event_hijack_skywalk.png' });
  await b.close();
})();
