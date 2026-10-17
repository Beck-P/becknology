// Morwen's tower grown (Workstream B2): from her room up the iron stair to the stillroom (Idris Thorne, the drowned
// scholar, bound in his ward circle and drawn see-through), on up to the star chamber (the orrery, the scrying pool
// showing the Midnight Sea tonight), and back down. node world/tower.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400 && /\/bridge\//.test(r.url())) console.log('MISSING', r.status(), r.url().slice(0, 140)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T23:00'); await p.waitForTimeout(3500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : undefined }); r(); })), [w, at]);
  const dialog = () => ev(() => ((document.querySelector('.world-dialog') || {}).innerText || 'none').replace(/\n+/g, ' | '));
  const shut = () => ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  const use = (label) => ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l); if (!i) return false; BridgeInteractions.execute(i); return true; }, label);
  const here = () => ev(() => BridgeWorld.getWorldId());
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };

  await go('lumar-midnight-tower', [6, 4]); await wait(2500);
  await p.screenshot({ path: SHOTS + '/tower_1.png' });
  expect('the stair up from her room', await use('STAIRS UP'));
  await wait(2500);
  expect('up in the stillroom', (await here()) === 'lumar-midnight-tower-2');
  const ghost = await ev(() => (BridgeWorld.getWorld().scene.actors || []).find(a => a.ghost));
  expect('Idris, bound in his circle, a ghost', ghost && ghost.sheet === 'npc-ghost-scholar');
  await ev(() => BridgeCharacter.setPosition ? BridgeCharacter.setPosition(5, 7) : 0); await wait(1200);
  await p.screenshot({ path: SHOTS + '/tower_2.png' });
  await use('IDRIS THORNE'); await wait(600);
  const talk = await dialog();
  console.log('topics:', talk.slice(0, 200));
  expect('he talks (people.json): Saltmere, the bell, the Gloaming', /Saltmere/i.test(talk) && /Gloaming/i.test(talk));
  await p.screenshot({ path: SHOTS + '/tower_idris.png' });
  await shut();
  expect('on up the stair', await use('STAIRS UP'));
  await wait(2500);
  expect('the star chamber', (await here()) === 'lumar-midnight-tower-3');
  await p.screenshot({ path: SHOTS + '/tower_3.png' });
  await use('SCRYING POOL'); await wait(4000);
  const pool = await dialog();
  console.log('the pool:', pool.slice(0, 260));
  expect('the scrying pool shows the Midnight Sea tonight', /TONIGHT/.test(pool) && /MOON/.test(pool));
  await shut();
  expect('back down', await use('STAIRS DOWN'));
  await wait(2500);
  expect('back in the stillroom', (await here()) === 'lumar-midnight-tower-2');
  await use('STAIRS DOWN'); await wait(2500);
  expect('back in her room', (await here()) === 'lumar-midnight-tower');
  console.log('errors: ' + errors);
  await b.close();
})();
