// Getting round Arcadia (js/transit.js): the express lifts (the street's lift up to the Skywalk, across and up to Skyport 7,
// back down), a ride's frames on the way up through the smog to the Spires and down below the street, an air cab, the Loop
// (board at a station, the carriage running round the ring, step off at your stop), the Loop's train crossing over the
// District street, and the Map's side-on cutaway of the city. Shots in OUT (`transit_*.png`).
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname + '/../shots';
const BASE = 'http://127.0.0.1:8766/';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) { errors++; console.log('console', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto(BASE); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 500;                                       // the fares (a stand-in purse)
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' }); });
  const go = (w, at) => p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : null }); r(); })), [w, at]);
  const where = () => p.evaluate(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY()]);
  const use = (pred) => p.evaluate((src) => { const f = new Function('i', 'return ' + src); const it = BridgeWorld.getWorld().interactions.find(f); if (it) BridgeInteractions.execute(it); return it && it.label; }, pred);
  const rows = () => p.evaluate(() => [...document.querySelectorAll('.wd-chooser .wd-sell-row')].map(e => e.querySelector('.sp-name').textContent + (e.classList.contains('none') ? ' (here)' : '')));
  const pick = (name) => p.evaluate((name) => { const r = [...document.querySelectorAll('.wd-chooser .wd-sell-row')].find(e => e.querySelector('.sp-name').textContent === name); if (r) r.click(); return !!r; }, name);
  const waitFor = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(250); } return false; };

  // ---- the lifts: street → Skywalk (west pod) → across → Skyport 7 → back down ----
  await go('arcadia-street'); await p.waitForTimeout(1500);
  console.log('street lift:', await use("i.type === 'express_lift'"));
  await p.waitForTimeout(500);
  console.log('lift offers:', JSON.stringify(await rows()));
  await p.screenshot({ path: OUT + '/transit_lift_choose.png' });
  await pick('The Skywalk');
  await p.waitForTimeout(1600);
  await p.screenshot({ path: OUT + '/transit_lift_ride.png' });
  await waitFor(() => BridgeWorld.getWorldId() === 'arcadia-skywalk' && !document.getElementById('transit-ride'));
  await p.waitForTimeout(800);
  console.log('up the lift, now at', JSON.stringify(await where()));
  console.log('skyport pod:', await use("i.type === 'express_lift' && i.shaft === 'skyport'"));
  await p.waitForTimeout(400);
  await pick('Skyport 7');
  await waitFor(() => BridgeWorld.getWorldId() === 'arcadia-skypad' && !document.getElementById('transit-ride'));
  await p.waitForTimeout(800);
  console.log('across and up, now at', JSON.stringify(await where()));
  await use("i.type === 'express_lift'"); await p.waitForTimeout(400);
  await p.keyboard.press('Enter');                                 // the first row: the Skywalk
  await p.waitForTimeout(900); await p.keyboard.press('Space');     // skip the ride
  await waitFor(() => BridgeWorld.getWorldId() === 'arcadia-skywalk' && !document.getElementById('transit-ride'));
  console.log('skipped down, now at', JSON.stringify(await where()));

  // ---- a ride's frames: up through the smog to the Spires, down below the street, a cab across ----
  const film = async (spec, name, n, gap) => {
    await p.evaluate((spec) => BridgeTransit.ride(spec, () => BridgeTransit._close()), spec);
    for (let i = 0; i < n; i++) { await p.waitForTimeout(gap); await p.screenshot({ path: `${OUT}/transit_${name}_${i}.png` }); }
    await waitFor(() => !document.getElementById('transit-ride'));
  };
  await film({ kind: 'lift', from: 204, to: 480, title: 'Spire Express', dest: 'The Spires', shaft: { name: 'Spire Express' } }, 'up', 4, 1500);
  await film({ kind: 'lift', from: 0, to: -60, title: 'The Core Express', dest: 'The Sump', shaft: { name: 'The Core Express' } }, 'down', 2, 1500);
  await film({ kind: 'cab', from: 220, to: 460, title: 'Air cab', dest: 'The Spires' }, 'cab', 3, 2200);

  // ---- the Loop: whatever's built — board at a station, ride a leg, step off ----
  const st = await p.evaluate(() => BridgeTransit.stations().map(s => s.id));
  console.log('loop stations built:', JSON.stringify(st));
  if (st.length >= 2 && await p.evaluate(() => BridgeTransit.built('arcadia-loop'))) {
    const S = await p.evaluate(() => BridgeTransit.stations());
    await go(S[0].world, S[0].spawn); await p.waitForTimeout(1500);
    console.log('station:', await use("i.type === 'loop_station'")); await p.waitForTimeout(400);
    console.log('loop offers:', JSON.stringify(await rows()));
    await pick(S[1].name);
    await waitFor(() => BridgeWorld.getWorldId() === 'arcadia-loop');
    await p.waitForTimeout(2500);
    console.log('aboard:', JSON.stringify(await p.evaluate(() => BridgeTransit._trip())), 'seated', await p.evaluate(() => BridgeCharacter.isSeated()));
    await p.screenshot({ path: OUT + '/transit_loop_board.png' });
    await p.evaluate(() => BridgeTransit._skipLeg()); await p.waitForTimeout(6000);
    await p.screenshot({ path: OUT + '/transit_loop_speed.png' });
    await p.evaluate(() => BridgeTransit._skipLeg()); await p.waitForTimeout(1500);
    console.log('in at:', JSON.stringify(await p.evaluate(() => BridgeTransit._trip())));
    await p.screenshot({ path: OUT + '/transit_loop_platform.png' });
    console.log('doors:', await use("i.type === 'loop_doors'")); await p.waitForTimeout(400);
    await p.evaluate(() => { const b = [...document.querySelectorAll('.wd-opt')].find(e => /Step off/.test(e.textContent)); if (b) b.click(); });
    await waitFor(() => BridgeWorld.getWorldId() !== 'arcadia-loop');
    await p.waitForTimeout(800);
    console.log('stepped off at', JSON.stringify(await where()));
  }

  // ---- the carriage itself, with or without stations: she runs, the city streams past, she comes in ----
  await go('arcadia-loop'); await p.waitForTimeout(2500);
  console.log('aboard (no journey):', JSON.stringify(await p.evaluate(() => BridgeTransit._trip())));
  await p.evaluate(() => BridgeTransit._skipLeg()); await p.waitForTimeout(7000);
  const run = await p.evaluate(() => BridgeTransit._trip());
  console.log('aboard, running:', run.phase, Math.round(run.dist) > 0);
  await p.screenshot({ path: OUT + '/transit_loop_carriage.png' });

  // ---- the Loop's train over the street ----
  await go('arcadia-street'); await p.waitForTimeout(1500);
  if (await p.evaluate(() => !!(BridgeWorld.getWorld().skyline || {}).loop)) {
    await p.evaluate(() => { const P = 150; const now = Date.now() / 1000; const off = (P - (now % P) + 2.5) * 1000; BridgeTransit._shift = off; Date._real = Date._real || Date.now; Date.now = () => Date._real() + off; });
    await p.waitForTimeout(400);
    console.log('train crossing:', JSON.stringify(await p.evaluate(() => BridgeTransit._crossing())));
    await p.screenshot({ path: OUT + '/transit_street_train.png' });
    await p.evaluate(() => { Date.now = Date._real; });
  }

  // ---- the Map: Arcadia side on ----
  await p.evaluate(() => { ['arcadia-skypad', 'arcadia-skywalk', 'arcadia-street'].forEach(w => BridgeQuests.arrived(w, w)); });
  await p.evaluate(() => BridgeMenu.open('map', { all: true }));
  await p.waitForTimeout(1800);
  const cut = await p.$('.mp-sys-wide');
  console.log('cutaway places:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.mp-cut-pin')].map(e => e.textContent))));
  if (cut) { await cut.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await cut.screenshot({ path: OUT + '/transit_map_cutaway.png' }); }
  else { errors++; console.log('no cutaway on the map'); }
  await p.evaluate(() => BridgeMenu.close());
  console.log('errors', errors);
  await b.close();
})();
