// What a fight takes out of you (js/arms.js): a roll, each class's charged blow, a staff's bolt; the second wind (three
// quarters of it back once you stop for a breath, none while you keep swinging); energy spent off the fight (the mine,
// the cold) not coming back; too tired to roll. Costs are read the moment they're paid, and a check that needs the
// page's timers to keep up is only made when they did (headless under load, a 300 ms wait can run past a second).
// node combat/energy.js
const { chromium } = require('playwright');
const CHARGED = { iron_dagger: 2, cutlass: 3, emberbrand: 3, boarding_pike: 3, war_maul: 4, tidebreaker: 4, wispcaller: 2, old_pickaxe: 3 };
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
  const r = await p.evaluate(async (W) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms)), en = () => BridgeInventory.getStats().energy, now = () => performance.now();
    const w = BridgeWorld.getWorld();
    w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    W.forEach(id => BridgeInventory.addItem(id, 1));
    const hold = (id) => { for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === id) return; } };
    const settle = async () => { for (let i = 0; i < 200 && BridgeArms.state(); i++) await sleep(16); };
    const full = async () => { await settle(); BridgeInventory.restoreAll(); await sleep(50); };
    const rested = async () => { await full(); await sleep(1500); };   // and anything still owed from before let go (full: it's dropped)
    const spend3 = () => BridgeArms.spend ? BridgeArms.spend(3) : BridgeInventory.useEnergy(3);
    const out = {};
    // a roll, straight up the open path and back
    await full(); let e0 = en(); BridgeCharacter.setFacing('up'); BridgeArms.roll(); out.roll = e0 - en();
    await settle(); await sleep(200); BridgeCharacter.setFacing('down'); BridgeArms.roll();
    // each class's charged blow: hold through a swing, a beat more, let go (into the air); paid as you let go
    out.charged = {};
    for (const id of W) {
      await full(); hold(id); BridgeCharacter.setFacing('right');
      BridgeArms.keyDown(); BridgeInventory.useSelected();
      for (let i = 0; i < 200 && !(BridgeArms.state() || {}).full; i++) await sleep(16);
      const wasFull = !!(BridgeArms.state() || {}).full, e1 = en();          // (a staff's opening swing threw a bolt already)
      BridgeArms.keyUp();
      out.charged[id] = wasFull ? e1 - en() : 'never charged';
    }
    // a plain bolt from the staff: paid on the swing's landing frame
    await full(); hold('wispcaller'); e0 = en(); const tb = now(); BridgeInventory.useSelected();
    const swung = (BridgeArms.state() || {}).kind || 'none';
    for (let i = 0; i < 150 && en() === e0; i++) await sleep(16);
    out.bolt = e0 - en();
    if (!out.bolt) out.boltWhy = { held: BridgeInventory.getSelectedItemId(), swung, now: (BridgeArms.state() || {}).kind || 'none', ms: Math.round(now() - tb) };
    // the second wind: five rolls' worth spent on the fight, a moment with nothing, then a breath
    await rested(); e0 = en();
    for (let k = 0; k < 5; k++) spend3();
    const spent = e0 - en(), t0 = now();
    await sleep(500); const early = en(), earlyMs = Math.round(now() - t0);
    while (now() - t0 < 4500) await sleep(100);
    out.wind = { spent, low: e0 - spent, early, early_ms: earlyMs, later: en(), came_back: en() - (e0 - spent) };
    // keep swinging and nothing comes back; stop and it does
    await rested(); for (let k = 0; k < 4; k++) spend3();
    const low = en(); hold('cutlass'); BridgeCharacter.setFacing('right');
    let gap = 0, last = now();
    for (const t1 = now(); now() - t1 < 3000;) { BridgeInventory.useSelected(); await sleep(250); gap = Math.max(gap, now() - last); last = now(); }
    const whileSwinging = en(); await settle();
    const t2 = now(); while (now() - t2 < 4000) await sleep(100);
    out.swinging = { low, after_3s_of_swings: whileSwinging, longest_gap_ms: Math.round(gap), after_a_breath: en() };
    // spent off the fight (a pick on rock, the cold): it doesn't come back
    await full(); BridgeInventory.useEnergy(10); const offFight = en(); await sleep(3000);
    out.offFight = { after: offFight, three_seconds_on: en() };
    // too tired to roll
    await full(); BridgeInventory.useEnergy(BridgeInventory.getStats().energy - 2);
    out.tired = { energy: en(), rolled: BridgeArms.roll() };
    BridgeInventory.restoreAll();
    return out;
  }, Object.keys(CHARGED));
  console.log('energy a roll: ' + r.roll + ' · a bolt: ' + r.bolt + (r.boltWhy ? ' ' + JSON.stringify(r.boltWhy) : ''));
  console.log('energy charged: ' + Object.entries(r.charged).map(([k, v]) => k + ' ' + v).join(' · '));
  console.log('energy second wind: ' + JSON.stringify(r.wind));
  console.log('energy while swinging: ' + JSON.stringify(r.swinging));
  console.log('energy off the fight: ' + JSON.stringify(r.offFight));
  console.log('energy too tired: ' + JSON.stringify(r.tired));
  const bad = [];
  if (r.roll !== 3) bad.push('roll ' + r.roll);
  if (r.bolt !== 2) bad.push('bolt ' + r.bolt);
  Object.keys(CHARGED).forEach(id => { if (r.charged[id] !== CHARGED[id]) bad.push(id + ' charged ' + r.charged[id]); });
  if (r.wind.came_back !== Math.floor(r.wind.spent * 0.75)) bad.push('second wind ' + r.wind.came_back + ' of ' + r.wind.spent);
  if (r.wind.early_ms < 1100 && r.wind.early !== r.wind.low) bad.push('came back too soon');
  if (r.swinging.longest_gap_ms < 1100 && r.swinging.after_3s_of_swings !== r.swinging.low) bad.push('came back while swinging');
  if (r.swinging.after_a_breath !== r.swinging.low + 9) bad.push('after swinging ' + (r.swinging.after_a_breath - r.swinging.low) + ' came back, not 9');
  if (r.offFight.three_seconds_on !== r.offFight.after) bad.push('off-fight energy came back');
  if (r.tired.rolled) bad.push('rolled when too tired');
  console.log('energy errors: ' + bad.length + (bad.length ? ' ' + bad.join(' · ') : ''));
  await b.close();
})();
