const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load/.test(m.text())) console.log('CONSOLE', m.text()); });
  await p.route(/supabase-js|supabase\.co/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'purple' }); BridgeIntro.hide(); });
  await p.evaluate(() => BridgeMine.goFloor(15)); await p.waitForTimeout(2600);
  const info = await p.evaluate(() => {
    BridgeInventory.addItem('cutlass', 1);
    const w = BridgeWorld.getWorld();
    return { world: BridgeWorld.getWorldId(), creatures: w.interactions.filter(i => i.type === 'hostile').map(h => h.creature + '@' + h.x + ',' + h.y) };
  });
  console.log(JSON.stringify(info));
  // walk the pilot to stand next to the first creature and fight it
  const fight = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld(), h = w.interactions.find(i => i.type === 'hostile');
    // find an open neighbour of the creature
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [h.x + d[0], h.y + d[1]]).find(c => !w.collisions[c[1]][c[0]]);
    await new Promise(r => BridgeWorld.load(BridgeWorld.getWorldId(), () => r()));
    return { h: h.creature, at: [h.x, h.y], n };
  });
  console.log('target', JSON.stringify(fight));
  await p.screenshot({ path: out + '_floor.png' });
  // spawn a creature right beside the pilot and fight it
  const res = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    const free = [[0, 1], [1, 0], [-1, 0]].map(d => [px + d[0], py + d[1]]).find(c => !w.collisions[c[1]][c[0]]);
    const h = BridgeCombat.spawn(w, 'crab', free[0], free[1]);
    const face = free[1] > py ? 'down' : free[0] > px ? 'right' : 'left';
    BridgeCharacter.setFacing(face);
    BridgeInventory.selectSlot(0);
    const slots = []; for (let i = 0; i < 10; i++) slots.push(BridgeInventory.getSelectedItemId());
    const sel = BridgeInventory.getAll();
    let hp0 = BridgeInventory.getStats().hp, swings = 0;
    // pick the cutlass slot
    for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === 'cutlass') break; }
    await new Promise(r => setTimeout(r, 1500));       // let it wind up and strike once
    const hpAfterStrike = BridgeInventory.getStats().hp;
    while (w.interactions.indexOf(h) >= 0 && swings < 10) { BridgeCharacter.setFacing(face); BridgeInventory.useSelected(); swings++; await new Promise(r => setTimeout(r, 320)); }
    return { kind: h.creature, swings, killed: w.interactions.indexOf(h) < 0, hp0, hpAfterStrike, loot: BridgeLoot.count(), sel: Object.keys(sel) };
  });
  console.log('fight', JSON.stringify(res));
  await p.screenshot({ path: out + '_fight.png' });
  // black out
  await p.evaluate(() => { BridgeInventory.takeDamage(999); });
  await p.waitForTimeout(1200); await p.screenshot({ path: out + '_faint.png' });
  await p.waitForTimeout(3500);
  console.log('after faint', await p.evaluate(() => BridgeWorld.getWorldId() + ' hp ' + BridgeInventory.getStats().hp));
  await p.screenshot({ path: out + '_woke.png' });
  await b.close();
})();
