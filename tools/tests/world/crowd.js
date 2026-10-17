// Crowds (js/crowd.js, assets/crowds.json): every place with a crowd has people out at its busy hour and nobody where
// it's meant to be lonely; the same people in the same spots on two pages; nobody standing in a wall; seats used one at
// a time; you walk through them; talking to one; a gathering and a reaction; umbrellas in the rain; screenshots.
// node world/crowd.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = (process.argv[2] || __dirname + '/shots') + '/crowd';
require('fs').mkdirSync(SHOTS, { recursive: true });
let errors = 0;
const bad = (m) => { errors++; console.log('BAD', m); };
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const page = async (at, vp) => {
    const p = await (await b.newContext({ viewport: vp || { width: 1200, height: 800 } })).newPage();
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
    await p.goto('http://127.0.0.1:8766/bridge/?at=' + at); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    await p.waitForFunction(() => BridgeCrowd._ready());
    return p;
  };
  const go = (p, w, x, y) => p.evaluate((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: a[1] != null ? { x: a[1], y: a[2] } : undefined }); r(); })), [w, x, y]);
  const p = await page('2026-10-14T21:30');      // Arcadia's rush; afternoon on Lumar (its day began at 4pm ET)
  const ev = (f, a) => p.evaluate(f, a);

  // what someone might want is a real thing
  const wants = await ev(() => fetch('/bridge/assets/crowds.json').then(r => r.json()).then(C => Object.values(C._wants).flat().filter(w => !BridgeItems.get(w.id)).map(w => w.id)));
  if (wants.length) bad('wants that are no item: ' + wants.join(', ')); else console.log('wants: every one an item');

  // every place with a crowd: people out, none in a wall, nobody on a seat twice
  const places = await ev(() => fetch('/bridge/assets/crowds.json').then(r => r.json()).then(C => Object.keys(C).filter(k => k[0] !== '_')));
  for (const w of places) {
    await go(p, w); await p.waitForTimeout(1600);
    const r = await ev((w) => {
      const W = BridgeWorld.getWorld(), C = W.collisions, here = BridgeCrowd._here(), place = BridgeCrowd._place();
      const walls = here.filter(e => !e.sit && e.alpha > 0.95 && (C[Math.round(e.y)] || [])[Math.round(e.x)] === 1);
      const seats = here.filter(e => e.sit).map(e => e.x + ',' + e.y);
      return { n: here.length, count: BridgeCrowd._count(w), place, walls: walls.map(e => e.name + '@' + e.x + ',' + e.y), dup: seats.length - new Set(seats).size,
               bodies: [...new Set(here.map(e => e.body))].join(' ') };
    }, w);
    console.log(w.padEnd(22), 'out', String(r.n).padStart(2), '/', String(r.count).padStart(2), '·', JSON.stringify(r.place), '·', r.bodies);
    if (!r.place || (r.count > 0 && r.n === 0)) bad(w + ': nobody out');
    if (r.walls.length) bad(w + ': standing in a wall: ' + r.walls.join(' '));
    if (r.dup) bad(w + ': two on one seat');
    if (['lumar-square', 'arcadia-street', 'lumar-crown', 'lumar-tavern', 'hoarfell', 'verdance-village', 'sylvara'].includes(w)) await p.screenshot({ path: SHOTS + '/' + w + '.png' });
  }
  // lonely places stay lonely
  for (const w of ['lumar-midnight', 'enigma', 'singularity', 'bridge', 'lumar-home']) {
    await go(p, w); await p.waitForTimeout(800);
    const n = await ev(() => BridgeCrowd._here().length);
    console.log('lonely', w, n);
    if (n) bad(w + ' has a crowd');
  }

  // over a minute and a half on the street (time running 20× quicker): they move, they come and go
  await go(p, 'arcadia-street'); await p.waitForTimeout(1000);
  await ev(() => BridgeClock._at(BridgeClock.now(), 20));
  const seen = new Set(); let moved = 0, last = {};
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(400);
    const h = await ev(() => BridgeCrowd._here());
    h.forEach(e => { if (last[e.name] && (Math.abs(last[e.name].x - e.x) + Math.abs(last[e.name].y - e.y) > 0.5)) moved++; last[e.name] = e; seen.add(e.name); });
  }
  await ev(() => BridgeClock._at(BridgeClock.now(), 1));
  console.log('street over a while: different people', seen.size, '· moves seen', moved);
  if (moved < 5) bad('nobody walks');

  // the same crowd on a second page (another pilot)
  const q = await page('2026-10-14T21:30');
  await go(q, 'arcadia-street'); await p.evaluate(() => BridgeClock._at('2026-10-14T21:31', 1)); await q.evaluate(() => BridgeClock._at('2026-10-14T21:31', 1));
  await p.waitForTimeout(600); await q.waitForTimeout(600);
  const plans = (pg) => pg.evaluate(() => [0, 1, 2, 3, 4, 5, 6, 7].map(i => JSON.stringify(BridgeCrowd._plan('arcadia-street', i))));
  const A = await plans(p), B = await plans(q);
  const same = A.filter((x, i) => x === B[i]).length;
  console.log('same plans on both pages', same + '/8');
  if (same < 8) bad('the two pages see different crowds');
  const hp = await p.evaluate(() => BridgeCrowd._here().map(e => e.name + Math.round(e.x)).sort().join(' '));
  const hq = await q.evaluate(() => BridgeCrowd._here().map(e => e.name + Math.round(e.x)).sort().join(' '));
  console.log('who is where, page 1:', hp.slice(0, 160)); console.log('who is where, page 2:', hq.slice(0, 160));

  // walk into one: they're never in your way
  const one = await ev(() => BridgeCrowd._here().find(e => !e.walk && !e.sit));
  if (one) {
    await ev((e) => BridgeState.transition('world', { worldId: 'arcadia-street', spawn: { x: Math.round(e.x) - 1, y: Math.round(e.y) } }), one);
    await p.waitForTimeout(500);
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(400);
    const x2 = await ev(() => BridgeCharacter.getX());
    console.log('walked through', one.name, 'from', Math.round(one.x) - 1, 'to', x2);
    if (x2 <= Math.round(one.x) - 1) bad('a passer-by blocked the way');
  }

  // talking to one: the nearest standing still, E
  const near = await ev(() => {
    const h = BridgeCrowd._here().filter(e => !e.walk && e.alpha === 1);
    return h[0] || null;
  });
  if (near) {
    await ev((e) => BridgeState.transition('world', { worldId: 'arcadia-street', spawn: { x: Math.round(e.x), y: Math.round(e.y) + 1 } }), near);
    await p.waitForTimeout(700);
    const it = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.type === 'crowd'); return i ? i.label : null; });
    await p.keyboard.press('e'); await p.waitForTimeout(700);
    const said = await ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 200) : null; });
    console.log('talk:', it, '→', said);
    if (!said) bad('talking to a passer-by showed nothing');
    await p.screenshot({ path: SHOTS + '/talk.png' });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }

  // a gathering round the fountain in the square, then a fright
  await go(p, 'lumar-square'); await p.waitForTimeout(800);
  await ev(() => BridgeCrowd.gather('lumar-square', { x: 13, y: 10, r: 3, n: 8, until: BridgeClock.now() + 60000, id: 'test-fiddler' }));
  await p.waitForTimeout(13000);
  const g = await ev(() => BridgeCrowd._here().filter(e => e.gather));
  const round = g.filter(e => Math.hypot(e.x - 13, e.y - 10) < 3.6 && !e.walk).length;
  console.log('gathered round the fountain:', round, 'of', g.length, 'coming');
  if (round < 3) bad('a gathering drew too few');
  await p.screenshot({ path: SHOTS + '/gather.png' });
  await ev(() => BridgeCrowd.react('lumar-square', { x: 13, y: 10, r: 5, kind: 'flee' }));
  await p.waitForTimeout(900);
  const fled = await ev(() => BridgeCrowd._here().filter(e => e.gather).map(e => Math.hypot(e.x - 13, e.y - 10)));
  console.log('after a fright, how far:', fled.map(d => d.toFixed(1)).join(' '));

  // rain: umbrellas
  await ev(() => { BridgeWeather._pin('lumar', 'rain'); });
  await go(p, 'lumar-crown'); await p.waitForTimeout(2000);
  await p.screenshot({ path: SHOTS + '/rain.png' });
  console.log('rain in Crownhaven: out', await ev(() => BridgeCrowd._here().length), 'count', await ev(() => BridgeCrowd._count('lumar-crown')));
  await ev(() => { BridgeWeather._pin('lumar', null); });

  // a phone: fewer at once
  const ph = await page('2026-10-14T21:30', { width: 390, height: 760 });
  await go(ph, 'arcadia-street'); await ph.waitForTimeout(1500);
  const pn = await ph.evaluate(() => BridgeCrowd._here().length);
  console.log('phone: on the street', pn);
  if (pn > 12) bad('too many on a phone');
  await ph.screenshot({ path: SHOTS + '/phone.png' });

  console.log('crowd errors: ' + errors);
  await b.close();
})();
