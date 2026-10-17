// What a fight takes out of you (js/arms.js): a roll, each class's charged blow, a staff's bolt; the second wind (three
// quarters of it back once you stop for a breath, none while you keep swinging); energy spent off the fight (the mine,
// the cold) not coming back; too tired to roll. node combat/energy.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 } });
  await ctx.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.removeItem('bridge_midnight'); });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load|api\/talk/.test(m.text())) console.log('CONSOLE', m.text()); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/'); await p.waitForTimeout(2000);
  await p.evaluate(() => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot({ id: '1', name: 'BECK', suit_color: 'gold' }); BridgeProgression.awardCoins = n => Promise.resolve(n); });
  await p.waitForTimeout(600);
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-midnight', () => { BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 24, y: 30 } }); r(); })));
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms)), en = () => BridgeInventory.getStats().energy;
    const w = BridgeWorld.getWorld();
    w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    const W = ['iron_dagger', 'cutlass', 'emberbrand', 'boarding_pike', 'war_maul', 'tidebreaker', 'wispcaller', 'old_pickaxe'];
    W.forEach(id => BridgeInventory.addItem(id, 1));
    const hold = (id) => { for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === id) return; } };
    const out = {};
    const full = async () => { BridgeInventory.restoreAll(); await sleep(50); };
    // a roll, straight up the open path and back
    await full(); let e0 = en(); BridgeCharacter.setFacing('up'); BridgeArms.roll(); out.roll = e0 - en(); await sleep(700);
    BridgeCharacter.setFacing('down'); BridgeArms.roll(); await sleep(700);
    // each class's charged blow: hold through a swing, a beat more, let go (into the air)
    out.charged = {};
    for (const id of W) {
      await full(); hold(id); BridgeCharacter.setFacing('right'); e0 = en();
      BridgeArms.keyDown(); BridgeInventory.useSelected();
      for (let i = 0; i < 150 && !(BridgeArms.state() || {}).full; i++) await sleep(16);
      const wasFull = !!(BridgeArms.state() || {}).full, e1 = en();          // (a staff's opening swing threw a bolt already)
      BridgeArms.keyUp(); await sleep(60);
      out.charged[id] = wasFull ? e1 - en() : 'never charged';
      await sleep(900);
    }
    // a plain bolt from the staff
    await sleep(1500); await full(); hold('wispcaller'); e0 = en(); BridgeInventory.useSelected(); await sleep(400); out.bolt = e0 - en();
    await sleep(1500);
    // the second wind: five rolls (up and down the path), then nothing for a moment, then a breath
    await full(); e0 = en();
    for (let k = 0; k < 5; k++) { if (k) await sleep(560); BridgeCharacter.setFacing(k % 2 ? 'down' : 'up'); BridgeArms.roll(); }
    const spent = e0 - en(); await sleep(600); const early = en();
    await sleep(3000); const later = en();
    out.wind = { spent, after5rolls: e0 - spent, half_second_on: early, three_seconds_on: later, came_back: later - (e0 - spent) };
    // keep swinging and nothing comes back; stop and it does
    await full(); e0 = en();
    for (let k = 0; k < 4; k++) { BridgeCharacter.setFacing(k % 2 ? 'down' : 'up'); BridgeArms.roll(); await sleep(560); }
    const low = en(); hold('cutlass'); BridgeCharacter.setFacing('right');
    for (let k = 0; k < 10; k++) { BridgeInventory.useSelected(); await sleep(300); }
    const whileSwinging = en(); await sleep(3000);
    out.swinging = { after_rolls: low, after_3s_of_swings: whileSwinging, after_3s_still: en() };
    // spent off the fight (a pick on rock, the cold): it doesn't come back
    await full(); BridgeInventory.useEnergy(10); const offFight = en(); await sleep(3000);
    out.offFight = { after: offFight, three_seconds_on: en() };
    // too tired to roll
    await full(); BridgeInventory.useEnergy(BridgeInventory.getStats().energy - 2);
    out.tired = { energy: en(), rolled: BridgeArms.roll() };
    BridgeInventory.restoreAll();
    return out;
  });
  console.log('energy a roll: ' + r.roll + ' · a bolt: ' + r.bolt);
  console.log('energy charged: ' + Object.entries(r.charged).map(([k, v]) => k + ' ' + v).join(' · '));
  console.log('energy second wind: ' + JSON.stringify(r.wind));
  console.log('energy while swinging: ' + JSON.stringify(r.swinging));
  console.log('energy off the fight: ' + JSON.stringify(r.offFight));
  console.log('energy too tired: ' + JSON.stringify(r.tired));
  const bad = [];
  if (r.roll !== 3) bad.push('roll ' + r.roll);
  if (r.bolt !== 2) bad.push('bolt ' + r.bolt);
  if (!(r.wind.came_back >= Math.floor(r.wind.spent * 0.75) - 1 && r.wind.came_back <= Math.ceil(r.wind.spent * 0.75))) bad.push('second wind ' + r.wind.came_back + ' of ' + r.wind.spent);
  if (r.wind.half_second_on !== r.wind.after5rolls) bad.push('came back too soon');
  if (r.swinging.after_3s_of_swings !== r.swinging.after_rolls) bad.push('came back while swinging');
  if (!(r.swinging.after_3s_still > r.swinging.after_rolls)) bad.push('never came back after swinging');
  if (r.offFight.three_seconds_on !== r.offFight.after) bad.push('off-fight energy came back');
  if (r.tired.rolled) bad.push('rolled when too tired');
  console.log('energy errors: ' + bad.length + (bad.length ? ' ' + bad.join(' · ') : ''));
  await b.close();
})();
