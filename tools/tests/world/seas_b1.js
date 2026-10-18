// The Sapphire and Rose seas (workstream B1): Lanternfall, the cliff town; the floating market and the glassworks off
// Sapphire Port; Rosewell, the bathhouse town on Rose Cove's springs, its bathhouse and tea house. Every place loads and
// can be reached from where it's meant to be (the gate on Sapphire Port's quay, the path up from Rose Cove, the
// sloop's pier); every interaction stands where you can reach it; standing on a terrace draws you up on it and wading
// into a pool sinks you (scene.heights); the places do what they say (the donkeys, the tavernas, the church's lamp, the
// lantern maker, blowing glass, the bath, the pools, tea, the silk groves and the looms, a reading); shots of each
// place by day, at golden hour and by night (`shots/b1_*.png`).
// node world/seas_b1.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const PLACES = [
  // world, where to stand for a look, what to call it
  ['lumar-cliff', 30, 31, 'cliff_port'], ['lumar-cliff', 30, 19, 'cliff_promenade'], ['lumar-cliff', 33, 12, 'cliff_rim'],
  ['lumar-sapphire-market', 18, 12, 'market'], ['lumar-sapphire-glassworks', 8, 8, 'glassworks'],
  ['lumar-rose-springs', 21, 24, 'rosewell_street'], ['lumar-rose-springs', 20, 12, 'rosewell_terraces'], ['lumar-rose-springs', 21, 3, 'rosewell_grove'],
  ['lumar-rose-bathhouse', 8, 9, 'bathhouse'], ['lumar-rose-teahouse', 7, 7, 'teahouse']
];
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  const bad = (m) => { errs++; console.log('seas: ERROR ' + m); };
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T12:00'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 900; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
    BridgeWeather._pin('lumar', 'fair'); });
  const ev = (f, a) => p.evaluate(f, a);
  const go = async (w, x, y) => {
    await ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: { x: a[1], y: a[2] } }); r(); })), [w, x, y]);
    await ev((a) => { BridgeCharacter.init(a[0], a[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, [x, y]);
    await p.waitForTimeout(1200);
  };
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; });
  const close = async () => { for (let i = 0; i < 3 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const act = async (type, a) => {
    const ok = await ev((q) => { const i = BridgeWorld.getWorld().interactions.find(x => x.type === q[0] && x.act === q[1]); if (!i) return false; BridgeInteractions.execute(i); return true; }, [type, a]);
    await p.waitForTimeout(600);
    return ok;
  };
  const pick = async (re) => { const ok = await ev((s) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick, .world-dialog button')].find(x => new RegExp(s, 'i').test(x.textContent)); if (r) r.click(); return !!r; }, re); await p.waitForTimeout(700); return ok; };
  const coins = () => ev(() => window._coins);
  const count = (id) => ev((i) => BridgeInventory.getCount(i), id);
  const stats = () => ev(() => BridgeInventory.getStats());

  // ---- every place: loads, its interactions reachable, its people there ----------------------------------------------
  for (const w of ['lumar-cliff', 'lumar-sapphire-market', 'lumar-sapphire-glassworks', 'lumar-rose-springs', 'lumar-rose-bathhouse', 'lumar-rose-teahouse']) {
    const W = await ev((id) => fetch('/bridge/assets/worlds/' + id + '.json').then(r => r.json()), w);
    const C = W.collisions, open = (x, y) => C[y] && C[y][x] === 0;
    const far = W.interactions.filter(it => !(open(it.x, it.y) || [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(d => open(it.x + d[0], it.y + d[1]))));
    const sp = W.spawns.player, walk = C.flat().filter(v => v === 0).length;
    console.log(`seas: ${w} · ${W.width}×${W.height} · walkable ${walk} · interactions ${W.interactions.length} · actors ${(W.scene.actors || []).length}` +
      ` · lift ${W.scene.heights ? 'yes' : 'no'} · spawn open ${open(sp[0], sp[1])}`);
    if (!open(sp[0], sp[1])) bad(w + ' spawn ' + sp + ' is not walkable');
    far.forEach(it => bad(`${w}: ${it.label} at ${it.x},${it.y} has nowhere to stand by it`));
    const people = await ev(() => fetch('/bridge/assets/people.json').then(r => r.json()));
    W.interactions.filter(it => it.type === 'dialog' && !it.dialog).forEach(it => {
      if (!Object.values(people).some(pp => (pp.at || []).some(a => a.world === w && a.label === it.label))) bad(`${w}: ${it.label} has no one in people.json`);
    });
  }

  // ---- the ways in: Sapphire Port's gate, Rose Cove's path, the sloop's pier ------------------------------------------
  for (const [w, target] of [['lumar-sapphire', 'lumar-sapphire-market'], ['lumar-rose', 'lumar-rose-springs']]) {
    await go(w, ...(w === 'lumar-rose' ? [51, 22] : [44, 22]));
    const it = await ev((t) => { const i = BridgeWorld.getWorld().interactions.find(x => x.target === t); if (!i) return null; const C = BridgeWorld.getWorld().collisions; return { x: i.x, y: i.y, open: C[i.y][i.x] === 0 }; }, target);
    console.log('seas: the way from', w, 'to', target, JSON.stringify(it));
    if (!it) bad(w + ' has no way to ' + target); else if (!it.open) bad(w + "'s way to " + target + ' stands on a wall');
    if (it) {
      await ev((t) => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(x => x.target === t)), target);
      let now = null;
      for (let i = 0; i < 16 && now !== target; i++) { await p.waitForTimeout(500); now = await ev(() => BridgeWorld.getWorldId()); }
      if (now !== target) bad('going from ' + w + ' ended up in ' + now);
    }
  }
  const moor = await ev(() => { const I = BridgeVoyage._isles['lumar-cliff']; return I ? { name: I.name, pal: I.pal } : null; });
  console.log('seas: Lanternfall on the chart', JSON.stringify(moor));
  if (!moor || moor.pal !== 'sapphire') bad('Lanternfall is not in the Sapphire Sea on the chart');

  // ---- height: standing on the terraces, wading into a pool ----------------------------------------------------------
  await go('lumar-cliff', 33, 12);
  const up = await ev(() => { const sc = BridgeScene.get('lumar-cliff'); return { rim: BridgeScene.liftAt(sc, 33.5, 12.5), prom: BridgeScene.liftAt(sc, 30.5, 19.5), port: BridgeScene.liftAt(sc, 30.5, 30.5),
    px: BridgeScene.liftPx(sc, 33.5, 12.9), stair: BridgeScene.liftAt(sc, 17.5, 14.0) }; });
  console.log('seas: Lanternfall heights', JSON.stringify(up));
  if (!(up.rim > 8 && up.prom > 5 && up.port < 0.5 && up.px > 150)) bad('the terraces are not raised where they should be');
  if (!(up.stair > 7.5 && up.stair < 9)) bad('the stair down from the rim does not ramp');
  await p.screenshot({ path: SHOTS + '/b1_lift_rim.png' });
  await go('lumar-rose-springs', 15, 12);
  const wade = await ev(() => { const sc = BridgeScene.get('lumar-rose-springs'); return BridgeScene.liftAt(sc, 15.5, 12.5); });
  console.log('seas: wading in a Rosewell pool, height', wade);
  if (!(wade < 1.5)) bad('the bathing pool does not sink you');
  await p.screenshot({ path: SHOTS + '/b1_wade.png' });

  // ---- what the places do --------------------------------------------------------------------------------------------
  await go('lumar-cliff', 46, 29);
  let c0 = await coins();
  await act('lanternfall', 'donkey_up'); await pick('Ride up');
  await p.waitForTimeout(2600);
  const pos = await ev(() => ({ w: BridgeWorld.getWorldId(), x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }));
  console.log('seas: donkey up · coins', c0, '→', await coins(), '· now', JSON.stringify(pos));
  if (pos.y > 21) bad('the donkey did not take you up');
  await go('lumar-cliff', 33, 12);
  await ev(() => BridgeInventory.useEnergy && BridgeInventory.useEnergy(60));
  let e0 = (await stats()).energy; c0 = await coins();
  await act('lanternfall', 'taverna'); await pick('fritters');
  console.log('seas: taverna · coins', c0, '→', await coins(), '· energy', e0, '→', (await stats()).energy, '·', (await dialog()).slice(0, 80)); await close();
  if (await coins() !== c0 - 8) bad('the taverna did not charge for the fritters');
  await act('lanternfall', 'lamp'); await pick('Light a lamp');
  console.log('seas: church lamp ·', (await dialog()).slice(0, 90), '· warm', await ev(() => BridgeHoarfell.isWarm())); await close();
  await act('lanternfall', 'bell'); console.log('seas: bell ·', (await dialog()).slice(0, 60)); await close();
  await go('lumar-cliff', 21, 19);
  await act('lanternfall', 'lanterns'); await pick('caldera lantern');
  console.log('seas: lantern maker · caldera lanterns', await count('caldera_lantern')); await close();
  if (await count('caldera_lantern') < 1) bad('the lantern maker sold nothing');

  // the glassworks: the pipe, three presses
  await go('lumar-sapphire-glassworks', 4, 6);
  await act('sapphire', 'glassblow'); await pick('Blow a float');
  await p.waitForTimeout(400);
  for (let i = 0; i < 3; i++) {
    // wait for the needle to come round near the gold, then press
    await ev(() => new Promise(r => setTimeout(r, 300)));
    await p.keyboard.press('Space'); await p.waitForTimeout(500);
  }
  const g = await ev(() => BridgeSapphire._glass());
  await p.screenshot({ path: SHOTS + '/b1_glassblow.png' });
  console.log('seas: glassblowing ·', JSON.stringify(g));
  if (!g || !g.done) bad('the glassblowing never finished');
  await p.keyboard.press('Space'); await p.waitForTimeout(400);
  console.log('seas: after the pipe · floats', await count('glass_float'), '· sea glass', await count('sea_glass'));

  // Rosewell: the bath, a soak, tea, the silk groves, the looms, a reading
  await go('lumar-rose-bathhouse', 13, 9);
  await ev(() => { BridgeInventory.useEnergy && BridgeInventory.useEnergy(80); });
  c0 = await coins();
  await act('rose', 'bath'); await pick('Bathe');
  const sb = await stats();
  console.log('seas: the bath · coins', c0, '→', await coins(), '· energy', sb.energy, '/', sb.maxEnergy, '· warm', await ev(() => BridgeHoarfell.isWarm())); await close();
  if (sb.energy < sb.maxEnergy) bad('the bath did not rest you');
  await go('lumar-rose-springs', 15, 12);
  await act('rose', 'soak'); console.log('seas: soak ·', (await dialog()).slice(0, 70)); await close();
  await act('rose', 'silk'); console.log('seas: silk · cocoons', await count('silk_cocoon')); await close();
  if (await count('silk_cocoon') < 2) bad('the silk groves gave nothing');
  await ev(() => BridgeInventory.addItem('silk_cocoon', 5));
  await act('rose', 'looms'); await pick('Weave');
  console.log('seas: looms · scarves', await count('silk_scarf')); await close();
  if (await count('silk_scarf') < 1) bad('the looms wove nothing');
  await act('rose', 'reading'); await pick('read');
  console.log('seas: reading ·', (await dialog()).slice(0, 90)); await close();
  await go('lumar-rose-teahouse', 4, 4);
  c0 = await coins();
  await act('rose', 'tea'); await pick('Emberleaf');
  console.log('seas: tea · coins', c0, '→', await coins()); await close();

  // the floating market's traders buy what you find
  await go('lumar-sapphire-market', 11, 11);
  await ev(() => BridgeInventory.addItem('bluefin', 2));
  c0 = await coins();
  const sold = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === 'NERYS'); BridgeInteractions.execute(i); return !!i; });
  await p.waitForTimeout(800);
  console.log('seas: Nerys ·', sold, (await dialog()).slice(0, 100)); await close();

  // ---- each place by day, golden hour and night ------------------------------------------------------------------
  for (const [w, x, y, name] of PLACES) {
    await go(w, x, y);
    const lit = await ev((id) => { const sc = BridgeScene.get(id); return !!(sc && sc.lit); }, w);
    for (const [h, t] of lit ? [[7.0, 'dawn'], [12.4, 'noon'], [18.2, 'golden'], [23.0, 'night']] : [[0, 'room']]) {
      if (lit) { await ev((hh) => BridgeLit._force({ hour: hh, season: 'summer' }), h); await p.waitForTimeout(2600); }
      await p.screenshot({ path: `${SHOTS}/b1_${name}_${t}.png` });
    }
    if (lit) for (const s of ['autumn', 'winter']) { await ev((ss) => BridgeLit._force({ hour: 12.4, season: ss }), s); await p.waitForTimeout(2400); await p.screenshot({ path: `${SHOTS}/b1_${name}_${s}.png` }); }
    if (lit) await ev(() => BridgeLit._force(null));
    console.log('seas: shot', name, lit ? '(live light)' : '');
  }
  console.log('seas: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
