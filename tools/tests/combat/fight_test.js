const { chromium } = require('playwright');
const S = process.argv[2], KIND = process.argv[3] || 'cutter', CHOICE = process.argv[4] || 'Fight', SHIP = process.argv[5] || 'cutter2';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.route(/supabase-js|supabase\.co/, r => r.abort());
  await p.addInitScript(() => {
    localStorage.setItem('bridge_ship_location', 'lumar');
    localStorage.setItem('bridge_fleet', JSON.stringify({ ships: [
      { id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] },
      { id: 'cutter2', type: 'cutter', name: 'Swift', at: 'lumar', hull: 1, hold: { salt_fish: 10 }, guns: ['long_nine'], fits: [] },
      { id: 'galleon3', type: 'galleon', name: 'Sovereign', at: 'lumar', hull: 1, hold: {}, guns: ['long_nine', 'long_nine', 'carronade', 'carronade', 'moon_harpoon'], fits: ['moon_lantern'] }],
      sailing: 'cutter2', n: 3, crew: [{ id: 'c1', name: 'Tam', role: 'gunner', skill: 2, sea: 'Emerald', ship: 'cutter2' },
        { id: 'c2', name: 'A', role: 'gunner', skill: 2, sea: 'Emerald', ship: 'galleon3' }, { id: 'c3', name: 'B', role: 'gunner', skill: 2, sea: 'Emerald', ship: 'galleon3' },
        { id: 'c4', name: 'C', role: 'fighter', skill: 2, sea: 'Emerald', ship: 'galleon3' }, { id: 'c5', name: 'D', role: 'deckhand', skill: 2, sea: 'Emerald', ship: 'galleon3' },
        { id: 'c6', name: 'E', role: 'deckhand', skill: 2, sea: 'Emerald', ship: 'galleon3' }], cn: 6, hired: {} }));
  });
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 3000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true }) : { ok: false, reason: 'insufficient' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
    Math.random = (function () { let s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  });
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar', () => { BridgeState.transition('world', { worldId: 'lumar', spawn: null }); r(); })));
  await p.waitForTimeout(2000);
  await p.evaluate((s) => { BridgeFleet.sail(s); BridgeSloop.start('lumar', null, { aboard: true }); }, SHIP);
  await p.waitForTimeout(7000);
  console.log('phase', await p.evaluate(() => BridgeSloop._phase()));
  await p.evaluate(() => BridgeSloop._commit('lumar-sapphire'));
  await p.waitForTimeout(2500);
  await p.evaluate((k) => BridgeSeaFight._spawn(k), KIND);
  // sail on, holding the course
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowUp');
  for (let i = 0; i < (+process.argv[6] || 40); i++) {
    await p.waitForTimeout(500);
    const st = await p.evaluate(() => ({ menu: !!document.getElementById('sloop-menu'), foes: BridgeSeaFight._foes().map(f => [f.kind, f.state, Math.round(f.hp), +Math.hypot(f.x - BridgeSloop._boat().x, f.r - BridgeSloop._boat().r).toFixed(1)]), hull: BridgeFleet.active().ship.hull.toFixed(2) }));
    if (st.menu) {
      await p.screenshot({ path: `${S}/ft_hail.png` });
      await p.evaluate((c) => { const all = [...document.querySelectorAll('#sloop-menu button')]; const btn = all.find(e => e.textContent.startsWith(c)) || all.find(e => /Got it/.test(e.textContent)); btn && btn.click(); }, CHOICE);
      console.log('chose', CHOICE, JSON.stringify(st));
    }
    if (i % 4 === 0) console.log(i, JSON.stringify(st));
    if (i === 8 || i === 14 || i === 20) await p.screenshot({ path: `${S}/ft_${i}.png` });
    // steer to keep the foe abeam: turn toward a heading perpendicular to it
    await p.evaluate(() => {
      const b = BridgeSloop._boat(), f = BridgeSeaFight._foes()[0];
      if (!f) return;
      const rel = Math.atan2(f.r - b.r, f.x - b.x) - b.h, w = Math.atan2(Math.sin(rel), Math.cos(rel));
      const want = Math.abs(w) > 1.57 ? 0 : (w > 0 ? -1 : 1);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' })); document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
      if (want) document.dispatchEvent(new KeyboardEvent('keydown', { key: want < 0 ? 'ArrowLeft' : 'ArrowRight' }));
    });
    if (!(await p.evaluate(() => BridgeSloop.isRunning()))) { console.log('passage ended'); break; }
  }
  await p.screenshot({ path: `${S}/ft_end.png` });
  console.log('end', await p.evaluate(() => JSON.stringify({ coins: window._coins, ship: BridgeFleet.active().ship, w: BridgeWorld.getWorldId() })));
  await b.close();
})();
