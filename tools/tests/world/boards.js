// Notice boards (js/boards.js): every planet's boards open with today's three requests; the same three on two pages on
// the same day and others the next; filling one from the pack pays, takes the things, warms that person to you and
// can't be done twice; nothing asked for that can't be had (a source in the game, no buying it cheaper than it pays);
// the Journal's Next up points at a request you can fill; the farm's own order board unchanged for a save that already
// has orders; what a day's boards pay; desktop and phone. Screenshots: shots/boards_*.png. node world/boards.js [shots]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SHOTS = process.argv[2] || __dirname + '/shots';
const ROOT = path.join(__dirname, '../../../apps/bridge');
const AT = '2026-11-16T10:30';                                 // a Monday morning, Eastern time
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errs = 0;
  const fail = (m) => { errs++; console.log('boards: ERROR', m); };
  const today = (() => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); })();
  async function page(opts, at, seed) {
    const ctx = await b.newContext(opts || { viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript((sd) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('bridge_ship_location', 'lumar');
      localStorage.removeItem('bridge_boards');
      for (const k in (sd || {})) localStorage.setItem(k, sd[k]);
    }, seed || null);
    await p.goto('http://127.0.0.1:8766/bridge/?at=' + (at || AT)); await p.waitForTimeout(3500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
      window._coins = 1000;                                    // coins without a server: a purse in the page
      BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
      BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
    });
    return p;
  }
  const go = (p, w, x, y) => p.evaluate((q) => new Promise(r => BridgeWorld.load(q[0], () => {
    BridgeState.transition('world', { worldId: q[0], spawn: { x: q[1], y: q[2] } }); BridgeCharacter.init(q[1], q[2]);
    if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); r();
  })), [w, x, y]);
  const rowsShown = (p) => p.evaluate(() => [...document.querySelectorAll('.wd-sell-row')].map(e => ({
    name: e.querySelector('.sp-name').textContent, sub: e.querySelector('.sp-have').textContent, note: e.querySelector('.sp-price').textContent, off: e.classList.contains('none') })));

  const p = await page();
  const spots = await p.evaluate(() => BridgeBoards.SPOTS);

  // ---- every board on every planet opens ----
  for (const planet of Object.keys(spots)) {
    if (!spots[planet].length) { console.log('boards:', planet, 'has no board drawn anywhere (its table waits for one)'); continue; }
    for (const s of spots[planet]) {
      await go(p, s[0], 5, 5);
      await p.waitForTimeout(600);
      const it = await p.evaluate((q) => {
        const i = BridgeWorld.getWorld().interactions.find(x => x.label === q[1] && (x.type === 'notice_board' || x.type === 'lodge_board'));
        if (!i) return null;
        BridgeCharacter.init(i.x, i.y + 1); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera();
        BridgeInteractions.execute(i);
        return { type: i.type, x: i.x, y: i.y };
      }, s);
      if (!it) { fail(s[0] + ' has no board at ' + s[1]); continue; }
      await p.waitForTimeout(500);
      const rows = await rowsShown(p), ttl = await p.evaluate(() => (document.querySelector('.wd-title') || {}).textContent);
      console.log('boards:', s[0], '·', ttl, '·', rows.map(r => r.name + ' (' + r.note + ')').join(' | '));
      if (rows.length !== 3) fail(s[0] + ' shows ' + rows.length + ' requests, not 3');
      if (s === spots[planet][0]) await p.screenshot({ path: SHOTS + '/boards_' + planet + '.png' });
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    }
  }

  // ---- the tables: real people, real things, a way to get each, no buying it cheaper than it pays ----
  const tables = await p.evaluate(() => {
    const out = {};
    for (const pl in BridgeBoards.REQUESTS) out[pl] = BridgeBoards.REQUESTS[pl].map(q => ({ who: q.who, item: q.item, n: q.n, w: q.w || 1,
      person: !!BridgePeople.all()[q.who], exists: !!BridgeItems.get(q.item), pay: BridgeBoards.payFor(q), best: BridgeBoards.bestPrice(q.item) }));
    return out;
  });
  const SKIP = /(^|\/)(items|gifts|codex|boards|storage|homestead|fishart|aquarium|pet)\.js$|(^|\/)(people|crowds|businesses)\.json$/;
  const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const q = path.join(d, f); if (fs.statSync(q).isDirectory()) { if (!/scenes|characters|portraits|backdrops|cine|native|audio/.test(f)) walk(q); } else if (/\.(js|json)$/.test(f) && !SKIP.test(q)) files.push([q, fs.readFileSync(q, 'utf8')]); } })(ROOT + '/js');
  (function walk(d) { for (const f of fs.readdirSync(d)) { const q = path.join(d, f); if (fs.statSync(q).isDirectory()) { if (f === 'worlds') walk(q); } else if (/\.json$/.test(f) && !SKIP.test(q)) files.push([q, fs.readFileSync(q, 'utf8')]); } })(ROOT + '/assets');
  const vendor = {};                                            // the cheapest anyone sells it for, in the places' own shops
  for (const f of fs.readdirSync(ROOT + '/assets/worlds')) {
    const d = JSON.parse(fs.readFileSync(ROOT + '/assets/worlds/' + f, 'utf8'));
    (d.interactions || []).forEach(i => (i.items || []).forEach(x => { if (x.id && x.price) vendor[x.id] = Math.min(vendor[x.id] || 1e9, x.price); }));
  }
  const wanted = {};
  for (const pl in tables) {
    let tot = 0;
    for (const q of tables[pl]) {
      if (!q.person) fail(pl + ': nobody called ' + q.who);
      if (!q.exists) fail(pl + ': no item ' + q.item);
      const re = new RegExp('[\'"]' + q.item + '[\'"]');
      const src = files.filter(([f, t]) => re.test(t)).map(([f]) => path.basename(f));
      if (!src.length) fail(pl + ': nothing in the game gives ' + q.item);
      if (vendor[q.item] && q.pay / q.n > vendor[q.item]) fail(pl + ': ' + q.item + ' sells at ' + vendor[q.item] + ' and the board pays ' + (q.pay / q.n).toFixed(1) + ' each');
      if (q.pay < q.best * q.n * 1.3) fail(pl + ': ' + q.who + '\'s ' + q.item + ' pays ' + q.pay + ', hardly over a sale (' + q.best * q.n + ')');
      wanted[q.item] = (wanted[q.item] || []).concat(pl);
      tot += q.w;
    }
    console.log('boards:', pl, tables[pl].length, 'requests;', tables[pl].map(q => q.item + '×' + q.n + '=' + q.pay).join(', '));
  }
  console.log('boards: orphans now wanted:', ['wolf_pelt', 'rime_shell', 'bat_wing', 'golem_core', 'wraith_essence', 'wyrm_scale', 'glass_float', 'silk_scarf', 'beeswax_candles', 'honey_crock',
    'scrap_metal', 'circuit', 'chrome_part', 'sump_pearl', 'goldfish_bag'].map(id => id + (wanted[id] ? ' (' + wanted[id].join(', ') + ')' : ' NOT WANTED')).join('; '));

  // ---- what a day's boards pay (each planet's requests over 60 of its days, and a real day's worth) ----
  const econ = await p.evaluate(() => {
    const out = {}, perReal = { lumar: 3, verdance: 4, hoarfell: 2, sylvara: 1, arcadia: 1, enigma: 1 };
    for (const pl in BridgeBoards.REQUESTS) {
      let sum = 0, max = 0, keys = new Set();
      for (let d = 0; d < 60; d++) {
        const k = 'x' + d, t = BridgeBoards.todays(pl, k).reduce((a, q) => a + BridgeBoards.payFor(q), 0);
        sum += t; max = Math.max(max, t);
      }
      out[pl] = { avg: Math.round(sum / 60), max, realDay: Math.round(sum / 60 * perReal[pl]) };
    }
    return out;
  });
  console.log('boards: a board-day pays on average', JSON.stringify(econ));

  // ---- the same three on two pages on the same day, others the next ----
  const mine = await p.evaluate(() => Object.keys(BridgeBoards.REQUESTS).map(pl => pl + ':' + BridgeBoards.todays(pl).map(q => q.who + '/' + q.item).join(',')));
  const p2 = await page({ viewport: { width: 1100, height: 720 } });
  const theirs = await p2.evaluate(() => Object.keys(BridgeBoards.REQUESTS).map(pl => pl + ':' + BridgeBoards.todays(pl).map(q => q.who + '/' + q.item).join(',')));
  console.log('boards: today', mine.join(' · '));
  if (mine.join() !== theirs.join()) fail('two pages read different boards: ' + theirs.join(' · '));
  await p2.close();
  const p3 = await page({ viewport: { width: 1100, height: 720 } }, '2026-11-17T10:30');
  const next = await p3.evaluate(() => Object.keys(BridgeBoards.REQUESTS).map(pl => pl + ':' + BridgeBoards.todays(pl).map(q => q.who + '/' + q.item).join(',')));
  console.log('boards: next day', next.join(' · '));
  const same = mine.filter((m, i) => m === next[i]);
  if (same.length > 1) fail('the next day\'s boards are the same as today\'s: ' + same.join(' · '));
  await p3.close();

  // ---- filling one from the pack ----
  await go(p, 'lumar-square', 16, 16); await p.waitForTimeout(600);
  const q0 = await p.evaluate(() => { const q = BridgeBoards.today('lumar')[0]; BridgeInventory.addItem(q.item, q.n); return q; });
  const before = await p.evaluate((q) => ({ coins: window._coins, have: BridgeInventory.getCount(q.item), feel: BridgeTalk.feeling(q.who) }), q0);
  await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'notice_board')));
  await p.waitForTimeout(400);
  let rows = await rowsShown(p);
  const ri = rows.findIndex(r => r.name === q0.name);
  if (ri < 0 || rows[ri].off) fail('the request ' + q0.name + ' can\'t be picked with ' + q0.n + ' ' + q0.item + ' in the pack');
  await p.screenshot({ path: SHOTS + '/boards_fill_before.png' });
  await p.locator('.wd-sell-row').nth(ri).click();
  await p.waitForTimeout(700);
  const after = await p.evaluate((q) => ({ coins: window._coins, have: BridgeInventory.getCount(q.item), feel: BridgeTalk.feeling(q.who), done: BridgeBoards.today('lumar')[0].done,
                                            saved: JSON.parse(localStorage.getItem('bridge_boards')) }), q0);
  rows = await rowsShown(p);
  console.log('boards: filled', q0.name, q0.n, q0.item, '· coins', before.coins, '->', after.coins, '· pack', before.have, '->', after.have, '· feeling', before.feel, '->', after.feel, '· row now', JSON.stringify(rows[ri]));
  await p.screenshot({ path: SHOTS + '/boards_fill_after.png' });
  if (after.coins - before.coins !== q0.pay) fail('paid ' + (after.coins - before.coins) + ', not ' + q0.pay);
  if (before.have - after.have !== q0.n) fail('took ' + (before.have - after.have) + ' ' + q0.item + ', not ' + q0.n);
  if (!(after.feel > before.feel)) fail(q0.who + '\'s feeling didn\'t move');
  if (!after.done || !rows[ri] || !rows[ri].off) fail('the request isn\'t marked filled');
  if (!after.saved || !after.saved.lumar || after.saved.lumar.done.length !== 1) fail('not kept in bridge_boards: ' + JSON.stringify(after.saved));
  // again, straight through the row's pick (as if clicked twice), with the things in the pack once more
  const twice = await p.evaluate(async (q) => {
    BridgeInventory.addItem(q.item, q.n);
    const c = window._coins, row = BridgeBoards.rows('lumar', null).find(r => r.label === q.name);
    row.pick(); await new Promise(r => setTimeout(r, 300));
    return { paid: window._coins - c, have: BridgeInventory.getCount(q.item) };
  }, q0);
  if (twice.paid !== 0 || twice.have !== q0.n) fail('filled twice: ' + JSON.stringify(twice));
  await p.keyboard.press('Escape');

  // ---- the Journal's Next up ----
  const nx = await p.evaluate(() => {
    const q = BridgeBoards.today('lumar').find(x => !x.done); BridgeInventory.addItem(q.item, q.n);
    return { q, lines: BridgeBoards.nextUp('lumar-square') };
  });
  console.log('boards: next up', JSON.stringify(nx.lines));
  if (!nx.lines.length || nx.lines[0].tag !== 'Board') fail('no Board line in Next up when carrying ' + nx.q.item);
  await p.evaluate(() => BridgeMenu.open('journal')); await p.waitForTimeout(600);
  const jn = await p.evaluate(() => [...document.querySelectorAll('.jn-next li')].map(l => l.textContent).filter(t => /^Board/.test(t)));
  console.log('boards: in the journal', JSON.stringify(jn));
  if (!jn.length) fail('the journal shows no Board line');
  await p.screenshot({ path: SHOTS + '/boards_journal.png' });
  await p.keyboard.press('Escape');
  await p.close();

  // ---- the farm's order board, unchanged for a save that already has orders ----
  const H = 3600000;
  const fp = await page({ viewport: { width: 1280, height: 800 } }, null, {
    bridge_ship_location: 'verdance',
    bridge_homestead: JSON.stringify({ owned: Date.now() - 48 * H, orders: { day: today, done: ['tove:pumpkin', 'miyu:carrot', 'regular:turnip'] }, ledger: { coins: 500, rounds: 3, orders: 7, shipped: {} } })
  });
  await go(fp, 'verdance', 34, 26); await fp.waitForTimeout(800);
  // the pick as it always was (js/homestead.js before the boards)
  const oldPick = (day, len) => { const seed = day.split('-').reduce((a, x) => a * 31 + +x, 7), picks = []; let i = 0; while (picks.length < 3 && i < 40) { const j = Math.abs((seed * 9301 + 49297 * (i + 1)) % 233280) % len; if (picks.indexOf(j) < 0) picks.push(j); i++; } return picks; };
  let farmOk = true;
  for (let d = 0; d < 40; d++) {
    const day = '2026-' + (1 + (d % 12)) + '-' + (1 + d % 28);
    const n = await fp.evaluate((q) => BridgeBoards.daily(q, 17, 3, 7), day);
    if (n.join() !== oldPick(day, 17).join()) { farmOk = false; fail('the farm\'s pick moved on ' + day + ': ' + n + ' vs ' + oldPick(day, 17)); }
  }
  await fp.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'farm_board')));
  await fp.waitForTimeout(400);
  const frows = await rowsShown(fp), fsave = await fp.evaluate(() => BridgeHomestead._s().orders);
  console.log('boards: the farm\'s board', JSON.stringify(frows), '· its save', JSON.stringify(fsave), '· pick unchanged over 40 days:', farmOk);
  if (frows.length !== 3) fail('the farm board shows ' + frows.length + ' orders');
  if (fsave.day !== today || fsave.done.length !== 3) fail('the farm\'s orders save was changed: ' + JSON.stringify(fsave));
  const ofarm = await fp.evaluate(() => { const v = BridgeWorld.getWorld().interactions.find(i => i.label === 'NOTICE BOARD'); return v && v.type; });
  if (ofarm !== 'farm_board') fail('the farm\'s NOTICE BOARD became ' + ofarm);
  // fill one: still the farm's way (coins, the ledger)
  await fp.keyboard.press('Escape');
  const ff = await fp.evaluate(async () => {
    const s = BridgeHomestead._s(); s.orders = { day: s.orders.day, done: [] };
    BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'farm_board'));
    await new Promise(r => setTimeout(r, 300));
    const names = [...document.querySelectorAll('.wd-sell-row .sp-have')].map(e => e.textContent);
    return { names };
  });
  console.log('boards: the farm\'s orders today', JSON.stringify(ff.names));
  await fp.keyboard.press('Escape');
  await fp.close();

  // ---- on a phone ----
  const ph = await page({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await go(ph, 'verdance-village', 15, 13); await ph.waitForTimeout(1500);
  await ph.evaluate(() => { const q = BridgeBoards.today('verdance')[1]; BridgeInventory.addItem(q.item, q.n); BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'notice_board')); });
  await ph.waitForTimeout(600);
  const prow = await rowsShown(ph);
  const fits = await ph.evaluate(() => { const r = document.querySelector('.wd-sell-row'); const b = r && r.getBoundingClientRect(); return b ? b.right <= innerWidth + 1 && b.left >= -1 : false; });
  console.log('boards: on a phone', JSON.stringify(prow.map(r => r.name + ' ' + r.note)), 'fits:', fits);
  if (prow.length !== 3 || !fits) fail('the board on a phone: ' + prow.length + ' rows, fits ' + fits);
  await ph.screenshot({ path: SHOTS + '/boards_phone.png' });
  await ph.close();

  console.log('boards: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
