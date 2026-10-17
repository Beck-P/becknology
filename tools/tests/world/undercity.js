// Arcadia below (js/undercity.js, js/implants.js): the Undercity and the Sump. Every place loads and is joined both ways
// (the Backs ⇄ the Warrens ⇄ the Hawker Hall, The Drip, Sallow's, the Foundry, the Pit, the scrapyards, the Sump ⇄ the
// rave; the freight lift between the two levels), nothing walled off from its way in, its counters sell, the Rust Saints
// on their turf and the Sump's creatures out (the same for two pages, tougher below), Saint Ruin and the Dredge,
// blacking out and coming round at Mama Roo's / the shrine, the Pit's cage and its book, Gage buying scrap, a scrap
// pile, the shrine, Teo's boat, the dance floors; implants: bought at the chop shop and the clinic, what they add, a
// glitch, tuning at the clinic, a trophy fitted; shots of each place (shots/under_*.png).
// node world/undercity.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
const PLACES = ['arcadia-undercity', 'arcadia-hawker', 'arcadia-dive', 'arcadia-chopshop', 'arcadia-foundry', 'arcadia-pit', 'arcadia-scrapyard',
  'arcadia-sump', 'arcadia-sump-rave'];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const page = async () => {
    const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'arcadia'); localStorage.removeItem('bridge_implants'); localStorage.removeItem('bridge_under'); });
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T21:00'); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
      window._coins = 5000; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
      BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
    });
    return p;
  };
  const p = await page();
  const ev = (f, a) => p.evaluate(f, a);
  let errs = 0;
  const bad = (m) => { errs++; console.log('BAD', m); };
  const go = (w) => ev((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; });
  const closeAll = async () => { for (let i = 0; i < 5 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await ev(() => { const b = [...document.querySelectorAll('.world-dialog .wd-opt')].pop(); if (b) b.click(); }); await p.waitForTimeout(250); if (await ev(() => !!document.querySelector('.world-dialog'))) { await p.keyboard.press('e'); await p.waitForTimeout(250); } } };
  const use = async (pred) => { await ev((src) => { const f = new Function('i', 'return ' + src); BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(f)); }, pred); await p.waitForTimeout(500); };
  const pick = async (n) => { await ev((n) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick:not(.none)')]; if (r[n || 0]) r[n || 0].click(); }, n); await p.waitForTimeout(600); };
  // which open tiles can't be reached from the way in (hostiles move: not walls)
  const walled = () => ev(() => {
    const w = BridgeWorld.getWorld(), C = w.collisions.map(r => r.slice());
    w.interactions.forEach(i => { if (i.type === 'hostile') C[i.y][i.x] = 0; });
    const s = w.spawns.player, seen = { [s]: 1 }, q = [s];
    while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { const n = [c[0] + d[0], c[1] + d[1]]; if (n[0] < 0 || n[1] < 0 || n[0] >= w.width || n[1] >= w.height || seen[n] || C[n[1]][n[0]]) return; seen[n] = 1; q.push(n); }); }
    let open = 0, out = []; C.forEach((row, y) => row.forEach((v, x) => { if (!v) { open++; if (!seen[[x, y]]) out.push(x + ',' + y); } }));
    // every interaction: its tile or one next to it reachable
    const lost = w.interactions.filter(i => i.type !== 'hostile' && ![[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 2], [0, -2]].some(d => seen[[i.x + d[0], i.y + d[1]]])).map(i => i.label + '@' + i.x + ',' + i.y);
    return { open, walledOff: out.length, sample: out.slice(0, 6).join(' '), lost };
  });

  // ---- every place: loads, scene and people there, nothing walled off, every door both ways ---------------------------------
  const links = {};
  for (const w of PLACES.slice()) {                         // a place not there at all is a failure, but the rest still run
    const there = await ev((w) => fetch('/bridge/assets/worlds/' + w + '.json').then(r => r.ok), w);
    if (!there) { bad(w + ' is missing'); PLACES.splice(PLACES.indexOf(w), 1); }
  }
  for (const w of PLACES) {
    await go(w); await p.waitForTimeout(1800);
    const info = await ev(() => { const w = BridgeWorld.getWorld(); return { name: w.name, scene: !!(w.scene && w.scene.id), actors: (w.scene && w.scene.actors || []).length,
      hostiles: w.interactions.filter(i => i.type === 'hostile').map(i => i.creature), onFaint: w.onFaint ? w.onFaint.world : null,
      doors: w.interactions.filter(i => i.type === 'enter_world' || i.type === 'leave_world').map(i => (i.target || i.leaveTo) + '@' + (i.spawn || i.leaveSpawn)),
      shops: w.interactions.filter(i => i.type === 'vendor').map(i => i.label), under: w.interactions.filter(i => i.type === 'under').map(i => i.act) }; });
    const wl = await walled();
    links[w] = info.doors;
    console.log(w, '·', info.name, '· scene', info.scene, '· actors', info.actors, '· shops', info.shops.join('/'), '· acts', info.under.join('/'),
      '· hostiles', info.hostiles.length, '(' + [...new Set(info.hostiles)].join(',') + ')', '· faint →', info.onFaint, '· walled off', wl.walledOff, wl.sample);
    if (!info.scene) bad(w + ' has no scene');
    if (wl.walledOff) bad(w + ' walled off: ' + wl.sample);
    if (wl.lost.length) bad(w + ' unreachable: ' + wl.lost.join(' '));
    await p.screenshot({ path: SHOTS + '/under_' + w.replace('arcadia-', '') + '.png' });
  }
  // doors land on open ground, and each place you can go to leads back
  for (const w of PLACES) for (const d of links[w]) {
    const [to, sp] = d.split('@'), xy = sp.split(',').map(Number);
    const ok = await ev(([to, xy]) => fetch('/bridge/assets/worlds/' + to + '.json').then(r => r.ok ? r.json() : null).then(d => !d ? 'missing' : d.collisions[xy[1]] && d.collisions[xy[1]][xy[0]] === 0), [to, xy]);
    if (ok === 'missing') { bad(w + ' → ' + to + ': no such place'); continue; }
    if (!ok) bad(w + ' → ' + to + ' lands on a wall at ' + sp);
    if (PLACES.includes(to) && !links[to].some(x => x.startsWith(w + '@'))) bad(to + ' has no way back to ' + w);
  }
  // the Backs: the way down
  await go('arcadia-alley'); await p.waitForTimeout(1200);
  console.log('the way down from the Backs:', await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.target === 'arcadia-undercity'); return i ? i.label + '@' + i.x + ',' + i.y : 'none'; }));

  // ---- the same Saints for two pages; tougher below ------------------------------------------------------------------------------
  const roster = (pg, w) => pg.evaluate((w) => fetch('/bridge/assets/worlds/' + w + '.json').then(r => r.json()).then(d => JSON.stringify(BridgeUndercity._roster(w, d))), w);
  const p2 = await page();
  for (const w of ['arcadia-undercity', 'arcadia-scrapyard', 'arcadia-sump']) {
    if (!PLACES.includes(w)) continue;
    const a = await roster(p, w), b2 = await roster(p2, w);
    console.log('roster', w, a === b2 ? 'the same on two pages' : 'DIFFERENT', '·', JSON.parse(a).length, 'out');
    if (a !== b2) bad('roster differs on two pages: ' + w);
  }
  const tough = await ev(() => { const C = BridgeCombat.CREATURES, f = (ks) => Math.round(ks.reduce((a, k) => a + C[k].hp * C[k].damage, 0) / ks.length);
    return { undercity: f(['saint', 'shiv', 'scraprat']), sump: f(['drone', 'eel', 'husk']), bosses: C.ruin.hp + ' / ' + C.dredge.hp }; });
  console.log('tougher below (hp × damage, average):', JSON.stringify(tough));
  if (!(tough.sump > tough.undercity)) bad('the Sump is not tougher than the Undercity');

  // ---- a fight in the Warrens: the Saints come for you, and blacking out brings you round at Mama Roo's --------------------------
  await go('arcadia-undercity'); await p.waitForTimeout(1500);
  const saint = await ev(() => { const h = BridgeWorld.getWorld().interactions.find(i => i.type === 'hostile'); return h && { x: h.x, y: h.y, k: h.creature }; });
  console.log('a Saint on the turf:', JSON.stringify(saint));
  await ev((s) => { const w = BridgeWorld.getWorld(); const t = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [s.x + d[0], s.y + d[1]]).find(c => w.collisions[c[1]][c[0]] === 0);
    BridgeCharacter.init(t[0], t[1]); }, saint);
  await p.waitForTimeout(3500);
  await p.screenshot({ path: SHOTS + '/under_fight.png' });
  const hpAfter = await ev(() => BridgeInventory.getStats().hp);
  console.log('standing next to a Saint for 3.5 s: health', hpAfter);
  await ev(() => BridgeInventory.takeDamage(999)); await p.waitForTimeout(4500);
  console.log('blacked out → came round in', await ev(() => BridgeWorld.getWorldId()), '·', (await dialog()).slice(0, 90));
  await closeAll();

  // ---- shops, Gage, the book, a pile, the shrine, Teo -------------------------------------------------------------------------------
  await go('arcadia-undercity'); await p.waitForTimeout(1200);
  await use("i.label === 'NOODLE COUNTER'"); console.log("Mama Roo's sells:", (await dialog()).slice(0, 120)); await closeAll();
  await ev(() => { BridgeInventory.addItem('scrap_metal', 5); BridgeInventory.addItem('circuit', 2); });
  await use("i.act === 'scrap'"); const before = await ev(() => window._coins); await pick(2); await closeAll();
  console.log('Gage bought it all:', (await ev(() => window._coins)) - before, 'coins · scrap left', await ev(() => BridgeInventory.getCount('scrap_metal')));
  await use("i.act === 'bets'"); console.log('the book:', (await dialog()).slice(0, 110)); await pick(0); console.log('  ', (await dialog()).slice(0, 160)); await closeAll();
  if (PLACES.includes('arcadia-scrapyard')) {
  await go('arcadia-scrapyard'); await p.waitForTimeout(1200);
  console.log('the scrapyard: Saint Ruin today?', await ev(() => BridgeWorld.getWorld().interactions.some(i => i.creature === 'ruin')));
  await use("i.act === 'search'"); console.log('a scrap pile:', (await dialog()).slice(0, 120)); await closeAll();
  await use("i.act === 'search'"); console.log('the same pile again:', (await dialog()).slice(0, 80)); await closeAll();
  }
  if (PLACES.includes('arcadia-sump')) {
  await go('arcadia-sump'); await p.waitForTimeout(1200);
  console.log('the Sump: the Dredge today?', await ev(() => BridgeWorld.getWorld().interactions.some(i => i.creature === 'dredge')));
  await ev(() => BridgeInventory.takeDamage(40));
  await use("i.act === 'shrine'"); await pick(0); console.log('the shrine:', (await dialog()).slice(0, 140), '· health', await ev(() => BridgeInventory.getStats().hp)); await closeAll();
  await ev(() => BridgeInventory.addItem('eel_fillet', 2));
  await use("i.act === 'boat'"); await pick(1); console.log("Teo's boat:", (await dialog()).slice(0, 120)); await closeAll();
  await use("i.type === 'express_lift' || i.act === 'lift'"); console.log('the freight lift:', (await dialog()).slice(0, 140)); await closeAll();
  }
  if (PLACES.includes('arcadia-foundry')) {
  await go('arcadia-foundry'); await p.waitForTimeout(1000);
  await use("i.act === 'dance'"); console.log('the Foundry floor:', (await dialog()).slice(0, 80)); await closeAll();
  }

  // ---- the Pit: the cage, three rounds ------------------------------------------------------------------------------------------------
  if (PLACES.includes('arcadia-pit')) {
  await go('arcadia-pit'); await p.waitForTimeout(1200);
  await use("i.act === 'ring'"); await pick(0); await closeAll(); await p.waitForTimeout(1600);
  for (let round = 1; round <= 3; round++) {
    const foes = await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile' && i.pit).map(i => i.creature));
    console.log('the cage, round', round, ':', foes.join(','));
    if (!foes.length) { bad('no fighters in round ' + round); break; }
    await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile' && i.pit).forEach(h => { h._hp = 0; BridgeInteractions.killHostile(BridgeWorld.getWorld(), h); BridgeCombat.onKill(BridgeWorld.getWorld(), h); }));
    await p.waitForTimeout(2600);
  }
  console.log('after three rounds: coins', await ev(() => window._coins), '· still in a bout?', await ev(() => !!BridgeUndercity._ring()));
  await p.screenshot({ path: SHOTS + '/under_pit.png' });
  }

  // ---- implants ------------------------------------------------------------------------------------------------------------------------
  const st = () => ev(() => ({ max: BridgeInventory.getStats().maxHP + '/' + BridgeInventory.getStats().maxEnergy, speed: BridgeGear.speed().toFixed(2), b: BridgeImplants.bonus() }));
  console.log('implants: none —', JSON.stringify(await st()));
  await go('arcadia-chopshop'); await p.waitForTimeout(1000);
  await use("i.type === 'implants'"); console.log("Sallow's chair:", (await dialog()).slice(0, 160));
  const rows = await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].map(r => r.querySelector('.sp-name').innerText));
  console.log('  on offer:', rows.join(', '));
  await pick(0); await pick(0); await closeAll();
  for (const id of ['scrap_knuckles', 'gutter_heart', 'junk_springs', 'tin_plating']) await ev((id) => BridgeImplants.install(id), id);
  console.log('implants: street chrome in —', JSON.stringify(await st()), '· coins', await ev(() => window._coins));
  const dmg = await ev(() => { const w = BridgeItems.get('cutlass'); return [BridgeCombat.damageFor(w, { creature: 'saint' }), w.damage]; });
  console.log('  a cutlass now hits', dmg[0], '(from', dmg[1] + ') · a 10 blow lands as', await ev(() => BridgeImplants.absorb(10)));
  await ev(() => BridgeImplants._glitch('legs')); console.log('  a glitch, legs lock: speed', await ev(() => BridgeGear.speed().toFixed(2)));
  await ev(() => BridgeImplants._glitch('arm')); console.log('  a glitch, the arm: next blow', await ev(() => BridgeCombat.damageFor(BridgeItems.get('cutlass'), { creature: 'saint' })));
  await go('chrome-clinic'); await p.waitForTimeout(1000);
  await use("i.type === 'implants'"); const crow = await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].map(r => r.querySelector('.sp-name').innerText));
  console.log('the Chrome Clinic suite:', crow.join(', '));
  const tuneAt = crow.findIndex(r => /^Tune/.test(r));
  if (tuneAt < 0) bad('the clinic offers no tuning');
  await pick(tuneAt); console.log('  tuned:', (await dialog()).slice(0, 100)); await closeAll();
  await ev(() => BridgeInventory.addItem('ruin_knuckles', 1));
  await go('arcadia-chopshop'); await p.waitForTimeout(800);
  await use("i.type === 'implants'"); const trow = await ev(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].map(r => r.querySelector('.sp-name').innerText));
  console.log('carrying the knuckles, the chair offers:', trow.filter(r => /Ruin/.test(r)).join(', ') || 'NOTHING');
  await closeAll();
  console.log('fitted:', JSON.stringify(await ev(() => BridgeImplants.install('ruin_fist'))), '· knuckles left', await ev(() => BridgeInventory.getCount('ruin_knuckles')),
    '· installed', JSON.stringify(await ev(() => Object.entries(BridgeImplants.installed()).map(([s, v]) => s + ':' + v.id + (v.tuned ? '*' : '')))));

  console.log('errors', errs);
  await b.close();
})();
