// The bow (js/arms.js `bow`, js/bows.js): a full draw reaches a creature far off and hits ×1.25; a quick snap falls
// short; the draw's poses come off the bow's own sheet (pilot-bow-…) with the bow in hand; a fire arrow from the pack
// sets a creature burning and is used up; another pilot's arrow is only for show. Shots of the draw, full and loose.
// node bow.js OUT
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.removeItem('bridge_midnight'); });
  const p = await ctx.newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load|api\/talk/.test(m.text())) console.log('CONSOLE', m.text()); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2000);
  await p.evaluate(() => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot({ id: '1', name: 'BECK', suit_color: 'gold' }); window._coins = 0; BridgeProgression.awardCoins = n => { window._coins += n; return Promise.resolve(window._coins); }; });
  await p.waitForTimeout(600);
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-midnight', () => { BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 24, y: 30 } }); r(); })));
  await p.waitForTimeout(1500);
  const setup = () => p.evaluate(() => {
    const w = BridgeWorld.getWorld();
    w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    BridgeInventory.restoreAll();
    if (!BridgeInventory.getCount('elven_bow')) BridgeInventory.addItem('elven_bow', 1);
    for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === 'elven_bow') break; }
    // a clear row to the right to shoot down
    const px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    for (let x = px + 1; x < px + 11; x++) if (w.collisions[py]) w.collisions[py][x] = 0;
    BridgeCharacter.setFacing('right');
    return BridgeInventory.getSelectedItemId();
  });
  console.log('selected', await setup());
  // a full draw at a wight eight tiles off
  const full = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    const h = BridgeCombat.spawn(w, 'wight', px + 8, py); h.blink = 0; h._hp = h.maxHP = 400; h.windupMs = 99999; h.speed = 0; h.pace = 1e9;
    BridgeArms.keyDown(); BridgeInventory.useSelected();
    await new Promise(r => setTimeout(r, 300));
    const mid = BridgeArms.pose(BridgeArms.state(), performance.now());
    await new Promise(r => setTimeout(r, 800));
    const atFull = BridgeArms.pose(BridgeArms.state(), performance.now());
    BridgeArms.keyUp();
    await new Promise(r => setTimeout(r, 1200));
    return { mid: mid && mid.col, sheet: mid && mid.sheet, full: atFull && atFull.col, dealt: 400 - h._hp };
  });
  console.log('full draw:', JSON.stringify(full), full.dealt >= 30 ? 'ok' : 'FAILED (no hit at range)');
  // a quick snap at the same distance: falls short
  await setup();
  const snap = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    const h = BridgeCombat.spawn(w, 'wight', px + 8, py); h.blink = 0; h._hp = h.maxHP = 400; h.windupMs = 99999;
    BridgeArms.keyDown(); BridgeInventory.useSelected(); BridgeArms.keyUp();
    await new Promise(r => setTimeout(r, 1400));
    return { dealt: 400 - h._hp };
  });
  console.log('snap shot:', JSON.stringify(snap), snap.dealt === 0 ? 'ok (fell short)' : 'FAILED (a snap reached 8 tiles)');
  // close in, a snap lands for less than the full draw did
  await setup();
  const close = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    const h = BridgeCombat.spawn(w, 'wight', px + 2, py); h.blink = 0; h._hp = h.maxHP = 400; h.windupMs = 99999;
    BridgeArms.keyDown(); BridgeInventory.useSelected(); BridgeArms.keyUp();
    await new Promise(r => setTimeout(r, 1200));
    return { dealt: 400 - h._hp };
  });
  console.log('close snap:', JSON.stringify(close), close.dealt > 0 && close.dealt < full.dealt ? 'ok' : 'FAILED');
  // a fire arrow from the pack: burns, and is used up
  await setup();
  const fire = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    BridgeInventory.addItem('fire_arrow', 3);
    for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === 'fire_arrow') break; }
    const h = BridgeCombat.spawn(w, 'wight', px + 4, py); h.blink = 0; h._hp = h.maxHP = 400; h.windupMs = 99999;
    BridgeArms.keyDown(); BridgeInventory.useSelected();
    await new Promise(r => setTimeout(r, 700));
    const drawing = BridgeArms.state() && BridgeArms.state().kind;
    BridgeArms.keyUp();
    await new Promise(r => setTimeout(r, 1000));
    return { drawing, left: BridgeInventory.getCount('fire_arrow'), dealt: 400 - h._hp, burning: h._burnUntil > performance.now() - 3000 };
  });
  console.log('fire arrow:', JSON.stringify(fire), fire.left === 2 && fire.burning ? 'ok' : 'FAILED');
  // shots: the draw at full in each direction, and the loose
  await setup();
  for (const f of ['right', 'down', 'left', 'up']) {
    await p.evaluate((f) => { BridgeCharacter.setFacing(f); BridgeArms.keyDown(); BridgeInventory.useSelected(); }, f);
    await p.waitForTimeout(1100);
    await p.screenshot({ path: OUT + '/bow_full_' + f + '.png' });
    await p.evaluate(() => BridgeArms.keyUp());
    await p.waitForTimeout(90);
    await p.screenshot({ path: OUT + '/bow_loose_' + f + '.png' });
    await p.waitForTimeout(900);
  }
  // someone else's arrow: drawn, but harmless here
  const ghost = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    const h = BridgeCombat.spawn(w, 'wight', px + 3, py); h._hp = h.maxHP = 400; h.windupMs = 99999;
    BridgeBows.ghost(BridgeCharacter.getRenderPos(), 'right', 1, 0);
    const n = BridgeBows._arrows().length;
    await new Promise(r => setTimeout(r, 900));
    return { flying: n, dealt: 400 - h._hp };
  });
  console.log('ghost arrow:', JSON.stringify(ghost), ghost.flying === 1 && ghost.dealt === 0 ? 'ok' : 'FAILED');
  console.log('errors:', errors);
  await b.close();
})();
