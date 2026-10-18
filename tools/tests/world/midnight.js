// The Midnight Sea grown (Workstream B2): Saltmere, the drowned village (the drowned walking it as ghosts, the drowned
// fishers who come at you, its bell-ringer), the Gloaming (where she sails on the clock, coming alongside her at sea,
// boarding her, her deck and her captain, going back down into your boat where you left it), and the quest that ties
// them to Morwen's tower: The Gloaming's Light, played through. node world/midnight.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && /\/bridge\//.test(r.url())) console.log('MISSING', r.status(), r.url().slice(0, 140)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1');
    localStorage.setItem('bridge_charts', JSON.stringify({ seas: { emerald: true, midnight: true }, visited: { 'lumar-midnight': 1, 'lumar-saltmere': 1 } }));
  });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T23:00'); await p.waitForTimeout(3500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeProgression.awardCoins = (n) => Promise.resolve(n); });
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : undefined }); r(); })), [w, at]);
  const dialog = () => ev(() => ((document.querySelector('.world-dialog') || {}).innerText || 'none').replace(/\n+/g, ' | '));
  const shut = async () => { await ev(() => document.querySelectorAll('.world-dialog, .ki-card, #keyitem-card').forEach(x => x.remove())); await wait(200); };
  const use = (label) => ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l); if (!i) return false; BridgeInteractions.execute(i); return true; }, label);
  const here = () => ev(() => BridgeWorld.getWorldId());
  const clues = () => ev(() => ['idris', 'tobiah', 'pool', 'captain', 'lantern', 'home'].filter(c => BridgeQuests.has('gloaming-light/' + c)));
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };

  // ---- the quest begins with Idris, in Morwen's stillroom ---------------------------------------------------------------------
  await go('lumar-midnight-tower-2'); await wait(2500);
  await use('IDRIS THORNE'); await wait(1500); await shut();
  console.log('clues:', JSON.stringify(await clues()));

  // ---- Saltmere ------------------------------------------------------------------------------------------------------------------
  await go('lumar-saltmere'); await wait(3500);
  const S = await ev(() => { const w = BridgeWorld.getWorld(); return { sea: w.sea, labels: w.interactions.map(i => i.label), drowned: w.interactions.filter(i => i.creature === 'drowned').length,
    ghosts: (w.scene.actors || []).filter(a => a.ghost).length }; });
  console.log('saltmere:', JSON.stringify(S));
  expect('Saltmere in the Midnight Sea, its dock, light, chapel and bell-ringer', S.sea === 'midnight' && ['DOCK', 'HARBOUR LIGHT', 'THE CHAPEL', 'TOBIAH'].every(l => S.labels.includes(l)));
  expect('the drowned fishers come up out of the water', S.drowned >= 3);
  expect('the bell-ringer a ghost', S.ghosts >= 1);
  await wait(1500);
  await p.screenshot({ path: SHOTS + '/midnight_saltmere.png' });
  await use('TOBIAH'); await wait(1800); await shut();
  const c1 = await clues();
  console.log('clues:', JSON.stringify(c1));
  expect('Idris and Tobiah tell you about the Gloaming', c1.includes('idris') && c1.includes('tobiah'));
  await go('lumar-midnight-tower-3'); await wait(2500);
  await use('SCRYING POOL'); await wait(1500);
  console.log('pool:', (await dialog()).slice(0, 160));
  await shut();
  expect('the scrying pool shows where she is', (await clues()).includes('pool'));

  // ---- the Gloaming at sea: where the clock has her; alongside; aboard --------------------------------------------------------
  await ev(() => new Promise(r => { BridgeSloop.start('lumar-saltmere'); r(); }));
  for (let i = 0; i < 80 && (await ev(() => BridgeSloop._phase())) !== 'sail'; i++) await wait(250);
  const g = await ev(() => BridgeSloop.ghostShip());
  console.log('the Gloaming:', JSON.stringify(g));
  expect('she sails in the Midnight Sea', g && g.cx > 0.02 && g.cx < 0.18 && g.cy > 0.15 && g.cy < 0.4);
  const same = await ev(() => { const a = BridgeSloop._ghostChart(1000000), b2 = BridgeSloop._ghostChart(1000000); return a.cx === b2.cx && a.cy === b2.cy; });
  expect('her place comes from the clock (the same for everyone)', same);
  await ev((g) => { const w = BridgeSloop._toWorld(g.cx, g.cy), bt = BridgeSloop._boat(); bt.x = w.x + 1.5; bt.r = w.r + 3.4; bt.v = 0; bt.h = 0; bt.reef = 0; BridgeSloop._snap(); }, g);
  await wait(1800);
  const pr = await ev(() => { const o = BridgeSloop._prompt(); return o && o.text; });
  console.log('prompt beside her:', pr);
  expect('alongside her, sail down: Board the Gloaming', /Board the Gloaming/.test(pr || ''));
  await p.screenshot({ path: SHOTS + '/midnight_gloaming_sea.png' });
  const before = await ev(() => BridgeSloop.chartPos());
  await ev(() => BridgeSloop._boardGhost()); await wait(5000);
  expect('aboard the Gloaming', (await here()) === 'lumar-gloaming');
  const D = await ev(() => { const w = BridgeWorld.getWorld(); return { spectres: w.interactions.filter(i => i.creature === 'spectre').length, labels: w.interactions.map(i => i.label) }; });
  console.log('deck:', JSON.stringify(D));
  expect('her deck: her captain, her lantern, the way back down, her mad crew', D.spectres >= 1 && ['CAPTAIN MARROW', 'STERN LANTERN', 'YOUR BOAT'].every(l => D.labels.includes(l)));
  await wait(1500);
  await p.screenshot({ path: SHOTS + '/midnight_gloaming_deck.png' });
  await use('CAPTAIN MARROW'); await wait(1500); await shut();
  await use('STERN LANTERN'); await wait(2500); await shut();
  await ev(() => document.querySelectorAll('.keyitem, .ki-get, [class*="keyitem"]').forEach(x => x.remove()));
  const c2 = await clues();
  console.log('clues:', JSON.stringify(c2));
  expect('the captain asks, and you take her stern lantern', c2.includes('captain') && c2.includes('lantern'));

  // ---- back down into your boat, where you left it -------------------------------------------------------------------------------
  await use('YOUR BOAT'); await wait(4500);
  for (let i = 0; i < 40 && (await ev(() => BridgeSloop._phase())) !== 'sail'; i++) await wait(250);
  const after = await ev(() => ({ running: BridgeSloop.isRunning(), phase: BridgeSloop._phase(), at: BridgeSloop.chartPos() }));
  console.log('back in the boat:', JSON.stringify(after), 'left at', JSON.stringify(before));
  expect('back on the water where you left it', after.running && after.phase === 'sail' && Math.abs(after.at.x - before.x) < 0.01 && Math.abs(after.at.y - before.y) < 0.01);

  // ---- the lantern hung at Saltmere: the quest done ---------------------------------------------------------------------------------
  await ev(() => BridgeSloop.stop('lumar-saltmere')); await wait(4000);
  await use('HARBOUR LIGHT'); await wait(2500); await shut();
  const done = await ev(() => BridgeQuests.finished().some(q => q.id === 'gloaming-light'));
  expect('the Gloaming\'s light lit: the quest done', done);
  await wait(1200);
  await p.screenshot({ path: SHOTS + '/midnight_light_lit.png' });
  await ev(() => BridgeCombat.faint()); await wait(4500);
  expect('black out on Saltmere, come round on its quay', (await here()) === 'lumar-saltmere');
  await shut();
  console.log('errors: ' + errors);
  await b.close();
})();
