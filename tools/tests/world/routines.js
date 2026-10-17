// Daily routines (js/routines.js, assets/routines.json): the cast keep a day by their planet's clock — at work while
// their shop's open, out of an evening, abed at night — walking between, through doors, stopping when you're beside them;
// a visitor can still be talked to; the Map knows where everyone is. node world/routines.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-17T03:20'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: a[1] != null ? { x: a[1], y: a[2] } : undefined }); r(); })), [w, x, y]);
  const at = async (iso) => { await ev((iso) => BridgeClock._at(iso), iso); await p.waitForTimeout(600); };
  const spots = (labels) => ev((L) => { const w = BridgeWorld.getWorld(); return L.map(l => { const i = w.interactions.find(x => x.label === l); return l + (i ? '@' + i.x + ',' + i.y : ' out'); }).join('  '); }, labels);
  const V = ['BRIDGET', 'MAGS', 'PERCY', 'WAT', 'NELL', 'OLD LUDD'];

  // every routine: spots that aren't solid, a way through for every walk
  const problems = await ev(() => BridgeRoutines._check());
  console.log('routines check: errors ' + problems.length + (problems.length ? ' — ' + problems.join('; ') : ''));

  // Brambleford (Verdance: a six-hour day from ET midnight)
  await go('verdance-village', 14, 15); await p.waitForTimeout(1500);
  console.log('at work, 3:20:', await spots(V));
  await at('2026-10-17T04:10');
  console.log('afternoon, 4:10:', await spots(V));
  await at('2026-10-17T04:40');
  console.log('sunset, 4:40:', await spots(V));
  console.log('tiles: bakery door open', await ev(() => BridgeWorld.getWorld().collisions[11][6] === 0), '· Bridget stands solid', await ev(() => BridgeWorld.getWorld().collisions[12][11] === 1));
  await p.screenshot({ path: SHOTS + '/routines_hayloft.png' });
  await at('2026-10-17T05:40');
  console.log('late, 5:40:', await spots(V));

  // a walk: Wat sets off from the smithy for the Hayloft; stand in his way and he stops for you
  await at('2026-10-17T04:40');
  const since = await ev(() => BridgeRoutines._stop('wat').since);
  await ev((ms) => BridgeClock._at(Date.parse('2026-10-17T08:40:00Z') - ms + 6000), since);       // 6 s into his walk (EDT)
  await p.waitForTimeout(300);
  const wat = () => ev(() => { const m = BridgeRoutines._here().find(x => x.id === 'wat'), a = m && m.st; return a ? { x: +a.x.toFixed(2), y: +a.y.toFixed(2), walk: a.walk, facing: a.facing } : null; });
  const w1 = await wat();
  await p.screenshot({ path: SHOTS + '/routines_walking.png' });
  console.log('walking:', JSON.stringify(w1), '· drawn walking', await ev(() => !BridgeWorld.getWorld().scene.actors.some(a => a.sheet === 'npc-vsmith')), '· his talk point moved', await ev(() => !!BridgeWorld.getWorld().interactions.find(i => i.label === 'WAT' && !(i.x === 33 && i.y === 18))));
  await ev((w) => BridgeCharacter.init(Math.round(w.x) + (w.facing === 'left' ? -1 : w.facing === 'right' ? 1 : 0), Math.round(w.y) + (w.facing === 'up' ? -1 : w.facing === 'down' ? 1 : 0)), w1);
  await p.waitForTimeout(1500);
  const w2 = await wat(); await p.waitForTimeout(1500); const w3 = await wat();
  console.log('beside you: stopped', w2.x === w3.x && w2.y === w3.y, '· turned to you', w3.walk == null);
  await ev(() => BridgeCharacter.init(40, 22));
  await p.waitForTimeout(1500);
  const w4 = await wat();
  console.log('you step away: walks on', w4.x !== w3.x || w4.y !== w3.y);

  // shop hours and the people who keep them agree, all day
  const agree = await ev(() => {
    const pairs = [['bridget', 'THE CRUSTY LOAF'], ['percy', "PENNYWORTH'S"], ['wat', 'ANVIL & HOOF'], ['nell', 'FLOWER STALL'], ['mags', 'THE HAYLOFT']];
    const out = [];
    for (let m = 0; m < 360; m += 5) {
      BridgeClock._at(Date.parse('2026-10-17T04:00:00Z') + m * 60000);          // Verdance's day from ET midnight
      pairs.forEach(([id, shop]) => {
        if (!BridgeHours.open('verdance-village', shop)) return;
        const w = BridgeRoutines.where(id);
        if (!(w && w.home)) out.push(id + ' away from ' + shop + ' at ' + BridgeClock.time('verdance').text);
      });
    }
    return out;
  });
  console.log('shops kept while open:', agree.length ? agree.slice(0, 6).join('; ') : 'all');

  // Crownhaven (Lumar: an eight-hour day from ET midnight): the bosun on the quay by day, at the Crown & Anchor of an evening
  await at('2026-10-17T03:00');
  await go('lumar-crown', 23, 31); await p.waitForTimeout(1500);
  console.log('morning on the quay:', await spots(['BOSUN']), '· people.js knows him here', await ev(() => (BridgePeople.find('lumar-crown', 'BOSUN') || {}).name),
    '· his clues count as at the pub', await ev(() => (BridgeWorld.getWorld().interactions.find(i => i.label === 'BOSUN') || {}).home.world));
  console.log('the Map: where is he', JSON.stringify(await ev(() => BridgeRoutines.where('bosun'))));
  await go('lumar-crown-pub', 8, 9); await p.waitForTimeout(1200);
  console.log('the pub by morning:', await spots(['BOSUN', 'SALT ANNIE', 'CUTTER JOSS', 'HETTY']));
  await at('2026-10-17T06:45');
  console.log('the pub of an evening:', await spots(['BOSUN', 'SALT ANNIE', 'CUTTER JOSS', 'HETTY', 'SHIPWRIGHT']));
  await p.screenshot({ path: SHOTS + '/routines_pub.png' });
  await b.close();
})();
