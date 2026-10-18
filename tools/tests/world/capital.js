// Crownhaven's districts (js/capital.js; scenes/lumar_crown_*.py): every district that's on main loads, its spawn and
// every way in and out stand on open ground, the doors between them go where they say and back (Crownhaven's own three
// found on the island's edges), the Lantern Theatre sells a ticket and plays tonight's piece, the guildsfolk talk; then
// each district is shot by day and night (live light) and the live compose is timed.
// node world/capital.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T21:30'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 500; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
    ['lumar'].forEach(r => BridgeWeather._pin(r, 'fair')); });
  const ev = (f, a) => p.evaluate(f, a);
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', a[1] != null ? { worldId: a[0], spawn: { x: a[1], y: a[2] } } : { worldId: a[0] }); r(); })), [w, x, y]);
  const here = () => ev(() => BridgeWorld.getWorldId());
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; });
  const close = async () => { for (let i = 0; i < 4 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const walkable = (w, x, y) => w.collisions && w.collisions[y] && w.collisions[y][x] === 0;
  // use a labelled thing in the world you're in; wait for wherever it takes you
  const use = async (label) => {
    const before = await here();
    const ok = await ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l); if (!i) return false; BridgeCharacter.init(i.x, i.y); BridgeInteractions.execute(i); return true; }, label);
    if (!ok) return null;
    for (let i = 0; i < 40; i++) { await p.waitForTimeout(150); if ((await here()) !== before) break; }
    await p.waitForTimeout(700);
    return here();
  };

  const built = await ev(() => Object.keys(BridgeCapital.BUILT));
  console.log('districts on main:', built.join(', '));
  // each district: spawn, every interaction and every way out on open ground or beside it
  for (const id of built) {
    await go(id);
    const w = await ev(() => { const w = BridgeWorld.getWorld(); return { collisions: w.collisions, spawns: w.spawns, inters: w.interactions.map(i => ({ l: i.label, t: i.type, x: i.x, y: i.y, to: i.target, sp: i.spawn })) }; });
    const sp = w.spawns.player;
    let bad = [];
    if (!walkable(w, sp[0], sp[1])) bad.push('spawn ' + sp);
    for (const i of w.inters) {
      const beside = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => walkable(w, i.x + dx, i.y + dy));
      // or across a counter, as js/interactions.js allows: two tiles straight ahead with a solid one between
      const near = beside || [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => walkable(w, i.x + dx, i.y + dy) && !walkable(w, i.x + dx / 2, i.y + dy / 2));
      if (!near) bad.push(i.l + ' at ' + i.x + ',' + i.y + ' has no open tile beside it');
    }
    errs += bad.length;
    console.log(id + ': ' + w.inters.length + ' things, ways out ' + w.inters.filter(i => i.t === 'enter_world').map(i => i.l + '→' + i.to).join(', ') + (bad.length ? ' · ERRORS ' + bad.join('; ') : ' · all reachable'));
  }

  // the doors: from Crownhaven into each district it opens on, and back
  await go('lumar-crown');
  const crown = await ev(() => BridgeWorld.getWorld().interactions.filter(i => /^(THE OLD TOWN|THE ARSENAL|QUAY STAIRS)$/.test(i.label)).map(i => [i.label, i.x, i.y, i.target]));
  console.log('Crownhaven\'s doors:', JSON.stringify(crown));
  for (const [label, x, y, to] of crown) {
    await go('lumar-crown');
    const got = await use(label);
    if (got !== to) { errs++; console.log('door ' + label + ': ERROR went to ' + got + ', wanted ' + to); continue; }
    const pos = await ev(() => [Math.round(BridgeCharacter.getX()), Math.round(BridgeCharacter.getY())]);
    const back = await ev(() => BridgeWorld.getWorld().interactions.find(i => i.target === 'lumar-crown'));
    const home = back ? await use(back.label) : null;
    const pos2 = await ev(() => [Math.round(BridgeCharacter.getX()), Math.round(BridgeCharacter.getY())]);
    const open = await ev((q) => { const w = BridgeWorld.getWorld(); return !!q && w.collisions[q[1]][q[0]] === 0; }, pos2);
    if (home !== 'lumar-crown' || !open) { errs++; console.log('door ' + label + ': ERROR back by ' + (back && back.label) + ' to ' + home + ' at ' + pos2 + ' open ' + open); }
    else console.log('door ' + label + ' → ' + to + ' (in at ' + pos + ') and back by ' + back.label + ' to ' + pos2 + ' beside ' + x + ',' + y);
  }
  // the gates between districts, wherever both sides are built
  for (const [from, label] of [['lumar-crown-oldtown', 'NORTH GATE'], ['lumar-crown-oldtown', 'BRIDGE GATE'], ['lumar-crown-canals', 'FUNICULAR'],
                               ['lumar-crown-bridge', 'EAST GATE'], ['lumar-crown-canals', 'SOUTH GATE'], ['lumar-crown-hill', 'FUNICULAR'],
                               ['lumar-crown-bridge', 'WEST GATE'], ['lumar-crown-arsenal', 'BRIDGE ROAD']]) {
    if (!built.includes(from)) continue;
    await go(from);
    const it = await ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l); return i && { t: i.type, to: i.target }; }, label);
    if (!it || it.t !== 'enter_world') { console.log('gate ' + from + ' ' + label + ': closed (' + (it ? it.t : 'missing') + ')'); continue; }
    const got = await use(label);
    const pos = await ev(() => [Math.round(BridgeCharacter.getX()), Math.round(BridgeCharacter.getY())]);
    const open = await ev((q) => BridgeWorld.getWorld().collisions[q[1]][q[0]] === 0, pos);
    if (got !== it.to || !open) { errs++; console.log('gate ' + from + ' ' + label + ': ERROR landed in ' + got + ' at ' + pos + ' open ' + open); }
    else console.log('gate ' + from + ' ' + label + ' → ' + got + ' at ' + pos);
  }

  // the Lantern Theatre: tonight's piece, a ticket, the play, the lift
  if (built.includes('lumar-crown-oldtown')) {
    await go('lumar-crown-oldtown');
    await ev(() => { BridgeInventory.useEnergy && BridgeInventory.useEnergy(40); });
    const e0 = await ev(() => BridgeInventory.getStats().energy);
    await use('THE LANTERN THEATRE');
    const box = await dialog();
    await ev(() => { const r = document.querySelector('.world-dialog .wd-sell-row.pick'); if (r) r.click(); }); await p.waitForTimeout(500);
    let cards = 0;
    for (let i = 0; i < 4; i++) { const d = await dialog(); if (d === 'none') break; const ok = await ev(() => { const r = document.querySelector('.world-dialog .wd-sell-row.pick'); if (r) { r.click(); return true; } return false; }); if (!ok) break; cards++; await p.waitForTimeout(400); }
    const end = await dialog();
    const e1 = await ev(() => BridgeInventory.getStats().energy);
    console.log('theatre: "' + box.slice(0, 110) + '" → ' + cards + ' cards · coins ' + await ev(() => window._coins) + ' · energy ' + e0 + ' → ' + e1 + ' · "' + end.slice(0, 70) + '"');
    if (cards < 3 || await ev(() => window._coins) !== 485) { errs++; console.log('theatre: ERROR the play didn\'t run or the ticket wasn\'t paid'); }
    await close();
    console.log('playbill:', (await ev(() => BridgeWorld.getWorld().interactions.find(i => i.label === 'PLAYBILL').dialog)).slice(0, 90));
  }
  // the guildsfolk and the cast talk (people.json), the shops open
  for (const [w, label, re] of [['lumar-crown-oldtown', 'TOWN CRIER', /OYEZ/], ['lumar-crown-canals', 'SAILMAKER', /RIGG/], ['lumar-crown-canals', 'CHARTMAKER', /INK/],
                                ['lumar-crown-canals', 'INSTRUMENT MAKER', /ORRERY/], ['lumar-crown-hill', 'ACADEMY MASTER', /STRAIGHT/],
                                ['lumar-crown-hill', 'ASTRONOMER', /STAR/], ['lumar-crown-stilts', 'MUDLARK', /HEAP/]]) {
    if (!built.includes(w)) continue;
    await go(w);
    await use(label);
    const d = await dialog();
    if (!re.test(d)) { errs++; console.log('talk ' + label + ': ERROR "' + d.slice(0, 90) + '"'); } else console.log('talk ' + label + ': "' + d.slice(0, 80) + '"');
    await close();
  }

  // each district by day and by night, the live compose's cost
  for (const id of built) {
    await go(id);
    const st = async () => ev((w) => BridgeLit._stats(w), id);
    let s = null;
    for (let i = 0; i < 80; i++) { s = await st(); if (s && s.drawing) break; await p.waitForTimeout(250); }
    if (!s || !s.drawing) { console.log(id + ': no live light (' + JSON.stringify(s) + ')'); continue; }
    for (const [hour, name] of [[12.4, 'noon'], [17.9, 'golden'], [1, 'night']]) {
      const before = (await st()).comps;
      await ev((h) => BridgeLit._force({ hour: h, season: 'summer' }), hour);
      for (let i = 0; i < 60; i++) { if ((await st()).comps > before) break; await p.waitForTimeout(100); }
      await p.waitForTimeout(1900);
      await p.screenshot({ path: SHOTS + '/capital_' + id + '_' + name + '.png' });
    }
    await ev(() => BridgeLit._force(null));
    console.log(id + ': live light composed in ' + Math.round((await st()).ms) + ' ms');
  }
  console.log('capital: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
