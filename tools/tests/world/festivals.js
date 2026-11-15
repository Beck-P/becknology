// Festivals (js/festivals.js, assets/festivals.json): on the calendar (a season's last weekend, the full moon, a bloom
// day), each place put up and its people gathered, every contest paying a placing once (the shows, the derbies — by
// centimetres and by kind — and the Ice Fair's Pinewood race), the stalls, a rosette pinned on the roll of honour and the
// stalls' discount, the bills on the notice boards, the Journal's Next up and the Map's Come back for, a paper lantern
// on the tide; every festival shot at desktop and phone size (shots/festival_*.png). node world/festivals.js [shots] [id]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;   // festival ids, comma-separated
// each festival: a moment it's open (ET), where to stand, and what to enter or land
const CASES = {
  blossom_show:      { at: '2026-11-28T03:20', stand: [12, 22], give: ['moonflower', 'posy'] },
  strawberry_supper: { at: '2026-12-05T04:20', stand: [14, 19], give: ['moonmelon', 'egg'] },
  cellar_fair:       { at: '2026-11-21T03:20', stand: [14, 20], give: ['wine_grand', 'jam'] },
  ice_fair:          { at: '2026-12-19T05:30', stand: [17, 16], fish: ['frostfin', 16, 8, 16], fish2: ['arctic_char', 30, 25, 60], run: ['pinewood', 12.2] },
  moonwell_night:    { at: '2026-11-23T22:00', stand: [14, 23], give: ['tidecalm_elixir', 'moonpetal'] },
  blessing_fleet:    { at: '2026-11-21T04:00', stand: [9, 11], fish: ['silverfin', 34, 18, 34], fish2: ['silverfin', 20, 18, 34] },
  bloom_night:       { at: '2027-10-28T23:00', stand: [21, 17], give: ['glass_float', 'sea_glass'] }
};
(async () => {
  let errs = 0;
  const fail = (m) => { errs++; console.log('festivals: ERROR', m); };
  const b = await chromium.launch({ executablePath: CHROME });
  async function open(opts) {
    const p = await (await b.newContext(opts)).newPage();
    p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T03:20'); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    return p;
  }
  const p = await open({ viewport: { width: 1200, height: 800 } });
  const ph = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const ev = (f, a) => p.evaluate(f, a);
  const go = (pg, w, x, y) => pg.evaluate((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: { x: a[1], y: a[2] } }); r(); })), [w, x, y]);
  const at = async (iso, pg) => { await (pg || p).evaluate((iso) => BridgeClock._at(iso), iso); await (pg || p).waitForTimeout(500); };
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; });
  const close = async () => { for (let i = 0; i < 3 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
  const use = (label) => ev((l) => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === l)), label);
  const pick = (re) => ev((s) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => new RegExp(s, 'i').test(x.textContent)); if (r) r.click(); return !!r; }, re);

  const problems = await ev(() => BridgeFestivals._check());
  console.log('festivals check: errors ' + problems.length + (problems.length ? ' — ' + problems.join('; ') : ''));
  errs += problems.length;
  const all = await ev(() => Object.keys(BridgeFestivals.all()));

  if (!ONLY) {
    // the calendar: a Wednesday has none, this Saturday the Harvest Fair, the next the Lantern Tide
    for (const d of ['2026-10-14T12:00', '2026-10-17T12:00', '2026-10-18T12:00', '2026-10-24T12:00', '2026-10-31T12:00']) {
      await at(d);
      console.log('on ' + d.slice(0, 10) + ':', JSON.stringify(await ev(() => BridgeFestivals.on().map(f => f.id))));
    }
    // a season of calendar: what's on each Saturday from mid-November, and the moon's
    const cal = [];
    for (const d of ['2026-11-21T12:00', '2026-11-24T12:00', '2026-11-28T12:00', '2026-12-05T12:00', '2026-12-12T12:00', '2026-12-19T12:00', '2027-10-28T23:00']) {
      await at(d);
      cal.push(d.slice(0, 10) + ' ' + (await ev(() => BridgeFestivals.on().map(f => f.id))).join('+'));
    }
    console.log('calendar:', cal.join(' · '));
    await at('2026-10-17T12:00');
    console.log('lantern tide in', await ev(() => (BridgeFestivals.next('lantern_tide') / 86400000).toFixed(1)), 'days');

    // the Harvest Fair, Brambleford square, Verdance midday
    await at('2026-10-17T03:20');
    await go(p, 'verdance-village', 13, 18); await p.waitForTimeout(2000);
    console.log('fair put up:', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.festival).map(i => i.label + '@' + i.x + ',' + i.y))),
      '· table solid', await ev(() => BridgeWorld.getWorld().collisions[16][12] === 1));
    console.log('gathered:', JSON.stringify(await ev(() => BridgeRoutines._here().filter(m => m.st && m.st.walk == null).map(m => m.id + '@' + m.st.x + ',' + m.st.y))));
    await p.waitForTimeout(3000);
    console.log('told:', await ev(() => (document.querySelector('.quest-toast') || {}).innerText.replace(/\n+/g, ' / ')));
    await p.screenshot({ path: SHOTS + '/festival_fair.png' });
    await ev(() => { BridgeInventory.addItem('pumpkin', 1); BridgeInventory.addItem('turnip', 2); BridgeInventory.addItem('eddas_pie', 1); });
    await use('JUDGING TABLE');
    await p.waitForTimeout(600);
    console.log('the show:', (await dialog()).slice(0, 300), '· edda\'s pie enterable', /Enter edda/i.test(await dialog()));
    await pick('pumpkin');
    await p.waitForTimeout(600);
    const judged = await dialog();
    console.log('judged:', judged.slice(0, 260), '· rosettes', await ev(() => ['blue_rosette', 'red_rosette', 'yellow_rosette'].map(id => BridgeInventory.getCount(id)).join('/')));
    await pick('turnip');
    await p.waitForTimeout(600);
    console.log('a turnip after: paid again', /PLACE:/.test(await dialog()), '· pumpkin still counts', /YOU — PUMPKIN/.test(await dialog()));
    // the roll of honour: a rosette pinned, the stall's prices down 5%
    const before = await ev(() => BridgeWorld.getWorld().interactions.find(i => i.label === 'FAIR STALL').items.map(x => x.price).join('/'));
    const pinned = await pick('Pin your');
    await p.waitForTimeout(500);
    const after = await ev(() => BridgeWorld.getWorld().interactions.find(i => i.label === 'FAIR STALL').items.map(x => x.price).join('/'));
    console.log('pinned a rosette:', pinned, '· roll', await ev(() => BridgeFestivals.pinned()), '· stall', before, '→', after, '·', (await dialog()).match(/ON THE ROLL[^/]*/) || '');
    if (!pinned || before === after) fail('pinning a rosette changed nothing');
    console.log('a rosette\'s uses:', await ev(() => BridgeUses.lines('red_rosette').map(l => l.t.replace(/<[^>]+>/g, '')).join(' | ')),
      '· only worth selling:', await ev(() => ['blue_rosette', 'red_rosette', 'yellow_rosette'].filter(id => BridgeUses.onlySale(id)).join(',') || 'none'));
    await close();
    await use('FAIR STALL');
    await p.waitForTimeout(600);
    console.log('the stall:', (await dialog()).slice(0, 160));
    await close();
    await at('2026-10-17T05:40');
    await use('JUDGING TABLE');
    await p.waitForTimeout(2500);
    console.log('late:', (await dialog()).slice(0, 140));
    await close();

    // Lantern Tide, Crownhaven quay, after dark next Saturday
    await at('2026-10-24T07:00');
    await go(p, 'lumar-crown', 30, 32); await p.waitForTimeout(2500);
    console.log('on the quay:', JSON.stringify(await ev(() => BridgeRoutines._here().filter(m => m.st).map(m => m.id + '@' + m.st.x + ',' + m.st.y))), '· annie is', JSON.stringify(await ev(() => BridgeRoutines.where('annie'))));
    await p.screenshot({ path: SHOTS + '/festival_tide.png' });
    await ev(() => BridgeFestivals.caught('bluefin', 60));
    await ev(() => BridgeFestivals.caught('moon_eel', 140));
    await ev(() => BridgeCharacter.init(12, 33));
    await use('DERBY BOARD');
    await p.waitForTimeout(400);
    await p.keyboard.press('e'); await p.waitForTimeout(400);                        // past the typing
    console.log('the derby:', (await dialog()).slice(0, 320));
    await close();
    await ev(() => { BridgeInventory.addItem('paper_lantern', 1); });
    await ev(() => BridgeCharacter.init(30, 33));
    await ev(() => { [...Array(40).keys()].find(i => BridgeInventory.getSelectedItemId && (BridgeInventory.selectSlot(i), BridgeInventory.getSelectedItemId() === 'paper_lantern')); BridgeInventory.useSelected(); });
    await p.waitForTimeout(400);
    console.log('a paper lantern:', await ev(() => (document.querySelector('.quest-toast') || {}).innerText.replace(/\n+/g, ' / ')), '· left', await ev(() => BridgeInventory.getCount('paper_lantern')));

    // leading players to them: Thursday before the Cellar Fair — the bill on Brambleford's board, Next up, the Map
    await at('2026-11-19T03:00');
    await go(p, 'verdance-village', 15, 13); await p.waitForTimeout(1500);
    await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.type === 'notice_board')));
    await p.waitForTimeout(600);
    const bill = await dialog();
    console.log('the board:', (bill.match(/A BILL PINNED[^/]*/) || ['(no bill)'])[0].slice(0, 160));
    if (!/CELLAR FAIR/.test(bill)) fail('no bill for the Cellar Fair on Brambleford\'s board');
    await close();
    const nx = await ev(() => BridgeFestivals.nextUp().map(n => n.tag + ': ' + n.title + ' — ' + n.text));
    console.log('next up:', JSON.stringify(nx));
    if (!nx.some(s => /Cellar Fair/.test(s))) fail('the Cellar Fair not in Next up');
    console.log('come back for (Vinehallow):', JSON.stringify(await ev(() => BridgeFestivals.soon('verdance-hill'))));
    console.log('the lodge\'s board (Hoarfell, week before the Ice Fair):', await (async () => { await at('2026-12-17T06:00'); return (await ev(() => BridgeBoards.head('hoarfell'))).slice(0, 90); })());
  }

  // ---- every other festival: on its calendar, put up, its people gathered, its contests paying once, its stall ----
  for (const id of Object.keys(CASES)) {
    if (ONLY && !ONLY.includes(id)) continue;
    if (!all.includes(id)) { console.log(id + ': (not in festivals.json)'); continue; }
    const C = CASES[id];
    await at(C.at);
    const f = await ev((id) => { const f = BridgeFestivals.all()[id]; return { name: f.name, world: f.world, on: BridgeFestivals.on().some(x => x.id === id), open: BridgeFestivals.open(f), contests: f.contests.map(c => ({ kind: c.kind, label: c.label })), stall: f.stall && f.stall.label, props: f.props, crowd: Object.keys(f.crowd || {}) }; }, id);
    console.log('\n' + id + ': on ' + C.at + ' ' + f.on + ', open ' + f.open);
    if (!f.on || !f.open) { fail(id + ' not on and open at ' + C.at); continue; }
    await go(p, f.world, C.stand[0], C.stand[1]); await p.waitForTimeout(2500);
    const put = await ev(() => { const w = BridgeWorld.getWorld(); return { ints: w.interactions.filter(i => i.festival).map(i => i.label + '@' + i.x + ',' + i.y) }; });
    const solid = await ev((pr) => pr.every(q => BridgeWorld.getWorld().collisions[q[2]][q[1]] === 1), f.props);
    console.log('  put up:', JSON.stringify(put.ints), '· props solid', solid);
    if (!solid) fail(id + ': props not solid');
    await p.waitForTimeout(2500);
    const here = await ev(() => BridgeRoutines._here().filter(m => m.st).map(m => m.id + '@' + Math.round(m.st.x) + ',' + Math.round(m.st.y)));
    console.log('  gathered:', JSON.stringify(here));
    const missing = f.crowd.filter(c => !here.some(h => h.startsWith(c + '@')) && !['hester', 'juniper'].includes(c));
    if (missing.length) fail(id + ': not gathered: ' + missing.join(', '));
    console.log('  told:', await ev(() => (document.querySelector('.quest-toast') || {}).innerText.replace(/\n+/g, ' / ')));
    await p.screenshot({ path: SHOTS + '/festival_' + id + '.png' });
    for (let i = 0; i < f.contests.length; i++) {
      const c = f.contests[i];
      if (c.kind === 'show') {
        await ev((g) => { BridgeInventory.addItem(g[0], 1); BridgeInventory.addItem(g[1], 1); }, C.give);
        await use(c.label); await p.waitForTimeout(600);
        console.log('  ' + c.label.toLowerCase() + ':', (await dialog()).slice(0, 260));
        await pick('Enter ' + await ev((g) => BridgeItems.get(g).name, C.give[0])); await p.waitForTimeout(600);
        const d1 = await dialog();
        await pick('Enter'); await p.waitForTimeout(600);
        const d2 = await dialog();
        console.log('  judged:', (d1.match(/^.*?POINTS[^/]*(\/ [^/]*PLACE[^/]*)?/) || [d1.slice(0, 160)])[0], '· again paid:', /PLACE:/.test(d2));
        if (!/PLACE:/.test(d1)) fail(id + ': the best entry didn\'t place');
        if (/PLACE:/.test(d2)) fail(id + ': paid twice');
        await close();
      } else {
        if (c.kind === 'derby') { await ev((a) => BridgeFestivals.caught(a[0], a[1], a[2], a[3]), C.fish2); await ev((a) => BridgeFestivals.caught(a[0], a[1], a[2], a[3]), C.fish); }
        else await ev((a) => BridgeFestivals.timed(a[0], a[1]), C.run);
        await use(c.label); await p.waitForTimeout(800);
        const d1 = await dialog();
        console.log('  ' + c.label.toLowerCase() + ':', d1.slice(0, 300));
        if (!/PLACE:/.test(d1)) fail(id + ': ' + c.label + ' didn\'t pay');
        await close();
        await use(c.label); await p.waitForTimeout(600);
        if (/PLACE:/.test(await dialog())) fail(id + ': ' + c.label + ' paid twice');
        await close();
      }
    }
    if (f.stall) {
      await use(f.stall); await p.waitForTimeout(600);
      const st = await dialog();
      console.log('  the stall:', st.slice(0, 200));
      if (!/Buy/.test(st)) fail(id + ': the stall has nothing to buy');
      await close();
    }
    // on a phone
    await at(C.at, ph);
    await go(ph, f.world, C.stand[0], C.stand[1]); await ph.waitForTimeout(3500);
    await ph.screenshot({ path: SHOTS + '/festival_' + id + '_phone.png' });
  }

  console.log('festivals: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
