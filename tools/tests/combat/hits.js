// Every weapon against a creature in front: does the swing land (on its frame), how much, the trait effects; a roll
// through a strike; a charged swing. node hits.js OUT
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.removeItem('bridge_midnight'); });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load|api\/talk/.test(m.text())) console.log('CONSOLE', m.text()); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2000);
  await p.evaluate(() => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot({ id: '1', name: 'BECK', suit_color: 'gold' }); window._coins = 0; BridgeProgression.awardCoins = n => { window._coins += n; return Promise.resolve(window._coins); }; });
  await p.waitForTimeout(600);
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-midnight', () => { BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 24, y: 30 } }); r(); })));
  await p.waitForTimeout(1500);
  const W = ['iron_dagger', 'veilpiercer', 'cutlass', 'star_blade', 'moonglass_sabre', 'emberbrand', 'rime_hatchet', 'boarding_pike', 'war_maul', 'wispcaller', 'moon_wand', 'old_pickaxe', 'ice_axe'];
  for (const id of W) {
    const r = await p.evaluate(async (id) => {
      const w = BridgeWorld.getWorld();
      w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
      w.interactions = w.interactions.filter(h => h.type !== 'hostile');
      BridgeInventory.addItem(id, 1); for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === id) break; }
      BridgeInventory.restoreAll();
      const px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
      BridgeCharacter.setFacing('right');
      const far = (id === 'wispcaller' || id === 'moon_wand') ? 3 : 1;
      const h = BridgeCombat.spawn(w, 'wight', px + far, py); h.blink = 0; h._hp = h.maxHP = 400; h.windupMs = 99999;
      const t0 = performance.now(); let hpAt = null;
      BridgeArms.keyDown(); BridgeInventory.useSelected(); BridgeArms.keyUp();
      const immediate = h._hp;
      for (let i = 0; i < 60 && hpAt === null; i++) { await new Promise(r => setTimeout(r, 16)); if (h._hp < 400) hpAt = Math.round(performance.now() - t0); }
      await new Promise(r => setTimeout(r, 900));
      return { id, cls: BridgeArms.classOf(BridgeItems.get(id)), immediate, landedAfter: hpAt, hp: h._hp, frost: h._frostUntil > performance.now() - 2000, burn: h._burnUntil > 0, x: h.x };
    }, id);
    console.log(JSON.stringify(r));
  }
  // a chain: three quick presses of the dagger, the third a lunge that reaches 2 tiles
  const chain = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld();
    w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === 'iron_dagger') break; }
    const px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    BridgeCharacter.setFacing('right');
    const h = BridgeCombat.spawn(w, 'sentinel', px + 1, py); h._hp = h.maxHP = 900; h.windupMs = 99999;
    const log = [];
    for (let k = 0; k < 3; k++) { BridgeInventory.useSelected(); await new Promise(r => setTimeout(r, 120)); log.push((BridgeArms.state() || {}).idx); }
    await new Promise(r => setTimeout(r, 900));
    return { idxs: log, dealt: 900 - h._hp };
  });
  console.log('chain', JSON.stringify(chain));
  // a roll through a strike: the wight winds up on you, you roll; no damage
  const roll = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld();
    w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    BridgeInventory.restoreAll();
    const px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    const h = BridgeCombat.spawn(w, 'hound', px + 1, py); h.windupMs = 500; h.blink = 0;
    const hp0 = BridgeInventory.getStats().hp;
    // wait for the wind-up, then roll at the last moment — straight up, where it's open
    for (let i = 0; i < 100 && h._attackPhase !== 'winding'; i++) await new Promise(r => setTimeout(r, 20));
    await new Promise(r => setTimeout(r, 380));
    const en0 = BridgeInventory.getStats().energy;
    BridgeCharacter.setFacing('up');
    const ok = BridgeArms.roll();
    await new Promise(r => setTimeout(r, 700));
    return { rolled: ok, hp0, hp1: BridgeInventory.getStats().hp, energy: en0 + '->' + BridgeInventory.getStats().energy, at: [px, py], now: [BridgeCharacter.getX(), BridgeCharacter.getY()] };
  });
  console.log('roll', JSON.stringify(roll));
  // a charged swing: hold F through the swing and a beat more, let go
  const charged = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld();
    w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    BridgeInventory.restoreAll();
    for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === 'cutlass') break; }
    const px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    BridgeCharacter.setFacing('right');
    const hs = [[1, 0], [-1, 0], [0, 1]].map(d => { const h = BridgeCombat.spawn(w, 'sentinel', px + d[0], py + d[1]); h._hp = h.maxHP = 900; h.windupMs = 99999; return h; });
    BridgeArms.keyDown(); BridgeInventory.useSelected();
    await new Promise(r => setTimeout(r, 600));
    const hpAfterSwing = hs.map(h => 900 - h._hp);
    const kind = (BridgeArms.state() || {}).kind;
    await new Promise(r => setTimeout(r, 800));
    const full = !!(BridgeArms.state() || {}).full;
    BridgeArms.keyUp();
    await new Promise(r => setTimeout(r, 900));
    return { afterSwing: hpAfterSwing, charging: kind, full, total: hs.map(h => 900 - h._hp), energy: BridgeInventory.getStats().energy };
  });
  console.log('charged', JSON.stringify(charged));
  await p.screenshot({ path: OUT + '/hits_end.png' });
  await b.close();
})();
