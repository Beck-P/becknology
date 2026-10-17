// The Midnight Sea's monsters (js/seafight.js): the Gloamserpent, wisp eels and the Deep Maw, each spawned off a sloop in
// the Midnight Sea and fought with the hand harpoon (F) - how they surface and dive, what they do to the hull, the kill
// and its trophies. node combat/monsters.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 1000; BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n); });
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-tern', () => { BridgeState.transition('world', { worldId: 'lumar-tern' }); r(); })));
  await p.waitForTimeout(1500);
  await p.evaluate(() => BridgeSloop.start('lumar-tern', null, { aboard: true }));
  for (let i = 0; i < 60 && (await p.evaluate(() => BridgeSloop._phase())) !== 'sail'; i++) await p.waitForTimeout(300);
  const w = await p.evaluate(() => { const c = BridgeVoyage._isles['lumar-midnight']; return BridgeSloop._toWorld(c.x, c.y); });
  await p.evaluate((w) => { const bt = BridgeSloop._boat(); bt.x = w.x + 6; bt.r = w.r + 34; bt.v = 0; bt.reef = 0; BridgeSloop._snap(); }, w);
  await p.waitForTimeout(1500);
  console.log('out on the', await p.evaluate(() => { const bt = BridgeSloop._boat(); return BridgeSloop._sea(bt.x, bt.r); }), 'sea');
  const pack = () => p.evaluate(() => JSON.stringify(['gloam_scale', 'abyss_ink', 'deep_pearl'].map(id => [id, BridgeInventory.getCount(id)])));
  for (const kind of ['serpent', 'eel', 'kraken']) {
    await p.evaluate(() => { BridgeSeaFight._foes().length = 0; BridgeFleet.active().ship.hull = 1; });
    await p.evaluate((k) => BridgeSeaFight._spawn(k), kind);
    const seen = {}, hp0 = await p.evaluate(() => BridgeSeaFight._foes().reduce((a, o) => a + o.hp, 0));
    let shot = 0, hp1 = hp0;
    for (let i = 0; i < 120; i++) {
      await p.waitForTimeout(250);
      const st = await p.evaluate(() => BridgeSeaFight._foes().map(o => o.state + (o.under ? '~' : '')));
      st.forEach(s => seen[s] = 1);
      if (kind === 'kraken' && i === 40) await p.evaluate(() => { const o = BridgeSeaFight._foes()[0]; if (o) o.hp = 20; });   // (a boss: speed it up)
      if (kind === 'serpent' && i === 50) await p.evaluate(() => { const o = BridgeSeaFight._foes()[0]; if (o) o.hp = 9; });
      await p.keyboard.press('f');
      if (shot < 2 && st.some(s => /coil|rear|latch|grip/.test(s)) && i > 6 + shot * 10) { await p.screenshot({ path: `${SHOTS}/monster_${kind}_${shot}.png` }); shot++; }
      hp1 = await p.evaluate(() => BridgeSeaFight._foes().reduce((a, o) => a + Math.max(0, o.hp), 0));
      if (!st.length || st.every(s => s === 'sink')) break;
    }
    await p.waitForTimeout(800);
    console.log(kind + ':', 'states', Object.keys(seen).join(' '), '· hp', hp0, '->', hp1, '· hull', await p.evaluate(() => BridgeFleet.active().ship.hull.toFixed(2)),
                '· coins', await p.evaluate(() => window._coins), '· trophies', await pack());
  }
  await b.close();
})();
