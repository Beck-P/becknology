// The legacy homes (js/home.js, js/estate.js; scenes arcadia_penthouse.py, lumar_manor*.py, lumar_holm_resort.py):
// buys the Penthouse and Ashcombe House and builds the Starling, walks through every room (the penthouse's inside and
// its roof deck; the great hall, the drawing room, the library, the dining room and the master bedroom up the stairs;
// the Starling's lobby and terrace), puts a piece of furniture down in each with the furnishing tray (H, E), checks the
// doors between the rooms lead both ways and the Starling's staff stand at their posts as they're hired, and takes a
// screenshot of each by night and (on Lumar) by day. node world/homes.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const NIGHT = '2026-10-16T23:30', DAY = '2026-10-16T20:00';            // Lumar's clock: past dusk, and midday
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errors++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  p.on('requestfailed', r => {                       // (a request the page itself dropped, leaving or reloading, isn't a missing file)
    if (/\/bridge\/assets\//.test(r.url()) && !/ABORTED/.test((r.failure() || {}).errorText || '')) { errors++; console.log('MISSING', r.url().slice(0, 160)); }
  });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=' + NIGHT); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  await ev(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 3000000;
    BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
    BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
  });
  const go = (w) => ev((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  const here = () => ev(() => BridgeWorld.getWorldId());
  const clear = () => ev(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  const at = async (x, y) => { await ev(([x, y]) => BridgeCharacter.init(x, y), [x, y]); await wait(900); };
  const time = async (t) => { await ev((t) => BridgeClock._at(t), t); await wait(700); };
  const use = async (label, n) => { await ev(([l, n]) => { const its = BridgeWorld.getWorld().interactions.filter(i => i.label === l); BridgeInteractions.execute(its[n || 0]); }, [label, n]); await wait(1800); };
  // through a door: wait till the next world is in (a big room's images take a moment), then a little for the scene
  const arrive = async (w) => { await p.waitForFunction((w) => BridgeWorld.getWorldId() === w, w, { timeout: 10000 }).catch(() => {}); await wait(800); };
  const shot = async (name) => { await p.screenshot({ path: SHOTS + '/homes_' + name + '.png' }); };
  // the furnishing tray: H, then E puts the first spare piece down in front of you (or a tile along, if that one's no good)
  const furnish = async (x, y) => {
    await at(x, y);
    const w = await here();
    const before = await ev((w) => (BridgeHome._save().layout[w] || []).length, w);
    await p.keyboard.press('h'); await wait(500);
    let n = before, why = '';
    for (let i = 0; i < 6 && n === before; i++) {
      await p.keyboard.press('e'); await wait(350);
      n = await ev((w) => (BridgeHome._save().layout[w] || []).length, w);
      if (n === before) { why = await ev(() => (document.querySelector('#home-tray .hm-msg') || {}).textContent || ''); await p.keyboard.press('ArrowRight'); await wait(150); }
    }
    const piece = await ev((w) => { const L = BridgeHome._save().layout[w] || []; const q = L[L.length - 1]; return q ? q.id + ' at ' + q.x + ',' + q.y : 'nothing'; }, w);
    await p.keyboard.press('Escape'); await wait(500);
    console.log('furnished', w + ':', n > before ? piece : 'NOTHING PLACED (' + why + ')');
  };
  const sky = (w) => ev((w) => { const k = BridgeClock.sky(w); return k.part + ' (sun ' + k.sun.toFixed(2) + ')'; }, w);

  // ---- the Penthouse: inside and out on the roof deck -----------------------------------------------------------------
  await go('arcadia-skypad'); await wait(1500);
  await ev(() => BridgeHome.buy('arcadia-penthouse')); await wait(400); await clear();
  await use('PENTHOUSE'); await arrive('arcadia-penthouse');
  console.log('homes: through the brass door:', await here(), '· spawn', JSON.stringify(await ev(() => [BridgeCharacter.getX(), BridgeCharacter.getY()])));
  const ph = await ev(() => { const w = BridgeWorld.getWorld(); return { size: w.width + 'x' + w.height, backdrop: !!w.scene.backdrop, skyline: !!w.skyline, dry: !!(w.skyline && w.skyline.rain.dry),
    glass: (w.penthouse.glass || []).length, bulbs: (w.penthouse.bulbs || []).length, pool: !!w.penthouse.pool }; });
  console.log('homes: the penthouse', JSON.stringify(ph));
  await at(11, 15); await shot('penthouse_lift');
  await at(5, 7); await shot('penthouse_bedroom');
  await at(15, 7); await shot('penthouse_bar');
  await at(20, 9); await shot('penthouse_doors');
  await at(28, 7); await shot('penthouse_deck_pool');
  await at(28, 13); await shot('penthouse_deck_fire');
  await furnish(6, 9);
  await furnish(26, 8);
  await at(26, 8); await shot('penthouse_deck_furnished');
  await use('LOUNGER'); await wait(1500);
  console.log('homes: on a lounger, seated', await ev(() => BridgeCharacter.isSeated()));
  await p.keyboard.press('Escape'); await wait(1200);                                // look away from the city, and get up
  await ev(() => BridgeCharacter.stand && BridgeCharacter.stand()); await wait(600);
  console.log('homes: looked away:', await ev(() => !(document.getElementById('view-panel') || { classList: { contains: () => false } }).classList.contains('visible')));

  // ---- Ashcombe House: the great hall and the rooms off it ------------------------------------------------------------
  await go('lumar-crown'); await wait(1500);
  await ev(() => BridgeHome.buy('lumar-manor')); await wait(400); await clear();
  await ev(() => BridgeHome.buyPiece('bookshelf')); await ev(() => BridgeHome.buyPiece('potted_plant'));
  await use('ASHCOMBE HOUSE'); await arrive('lumar-manor');
  console.log('homes: through the front door:', await here(), '· the hall', JSON.stringify(await ev(async () => { const w = BridgeWorld.getWorld(); const m = await (await fetch('/bridge/assets/scenes/lumar-manor/scene.json')).json();
    return [w.width + 'x' + w.height, (w.scene.windows || []).length + ' windows', 'light by ' + JSON.stringify(m.cycle || null)]; })));
  for (const t of [NIGHT, DAY]) {
    await time(t);
    const tag = t === NIGHT ? 'night' : 'day';
    console.log('homes: the sky over the hall:', await sky('lumar-manor'));
    await at(12, 8); await shot('manor_hall_' + tag);
    await at(4, 11); await shot('manor_stair_' + tag);
    await at(20, 8); await shot('manor_hall_east_' + tag);
  }
  await time(NIGHT);
  await furnish(11, 6);
  const rooms = [['THE DRAWING ROOM', 'THE HALL', [4, 7], [9, 8], 'drawing'], ['THE LIBRARY', 'THE HALL', [16, 8], [9, 8], 'library'],
                 ['THE DINING ROOM', 'THE HALL', [14, 9], [11, 8], 'dining'], ['STAIRS', 'STAIRS', [6, 7], [10, 7], 'bedroom']];
  for (const [door, back, spot, view, room] of rooms) {
    await go('lumar-manor'); await wait(1200);
    await use(door); await arrive('lumar-manor-' + room);
    const w = await here();
    console.log('homes: through', door, '->', w, '· furnishable', await ev(() => !!BridgeHome.HOMES[BridgeWorld.getWorldId()] && BridgeHome.owns(BridgeWorld.getWorldId())));
    await furnish(spot[0], spot[1]);
    for (const t of [NIGHT, DAY]) {
      await time(t);
      await at(view[0], view[1]); await shot(w.replace('lumar-manor-', 'manor_') + '_' + (t === NIGHT ? 'night' : 'day'));
    }
    await time(NIGHT);
    await use(back); await arrive('lumar-manor');
    console.log('homes: and back through', back, '->', await here(), 'at', JSON.stringify(await ev(() => [BridgeCharacter.getX(), BridgeCharacter.getY()])));
  }

  // ---- the Starling: built on the holm, its door into the lobby, its staff at their posts -----------------------------
  await ev(() => { const st = BridgeHolm._state(); st.owned = Date.now(); st.built = { dock: Date.now(), house: Date.now(), resort: Date.now() };
    localStorage.setItem('bridge_holm', JSON.stringify(st)); BridgeBusiness.grant('holm-resort'); });
  await go('lumar-holm'); await wait(1800);
  console.log('homes: the Starling\'s door:', JSON.stringify(await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.label === 'THE STARLING'); return it && [it.type, it.target, it.x, it.y]; })));
  await use('THE STARLING'); await arrive('lumar-holm-resort');
  const roles = () => ev(() => (BridgeWorld.getWorld().scene.actors || []).map(a => a.role).join(',') || 'nobody');
  console.log('homes: inside the Starling:', await here(), '· staff, no one hired:', await roles());
  await ev(() => { const c = BridgeBusiness.candidates('holm-resort'); const m = c.find(x => x.tier === 'manager') || c[0]; return BridgeBusiness.hire('holm-resort', m); }); await wait(500);
  await ev(() => { const c = BridgeBusiness.candidates('holm-resort'); return c.length ? BridgeBusiness.hire('holm-resort', c[0]) : null; }); await wait(500);
  await go('lumar-holm-resort'); await wait(1800);
  console.log('homes: the Starling with two staff hired:', await roles(), '· running', await ev(() => BridgeBusiness.status('holm-resort').running));
  await use('THE STARLING');
  console.log('homes: the front desk keeps the books:', (await ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none')).replace(/\n+/g, ' / ').slice(0, 160));
  await clear(); await ev(() => BridgeControls.enable && BridgeControls.enable());
  await furnish(5, 11);
  for (const t of [NIGHT, DAY]) {
    await time(t);
    const tag = t === NIGHT ? 'night' : 'day';
    await at(11, 8); await shot('starling_lobby_' + tag);
    await at(11, 4); await shot('starling_terrace_' + tag);
  }
  // out again onto the holm, and back to its door on foot (the sand along its front opens once it's built)
  await time(DAY);
  await use('OUTSIDE'); await arrive('lumar-holm');
  console.log('homes: out of the Starling:', await here(), 'at', JSON.stringify(await ev(() => [BridgeCharacter.getX(), BridgeCharacter.getY()])),
    '· its door in reach on foot:', await ev(() => {
      const w = BridgeWorld.getWorld(), d = w.interactions.find(i => i.label === 'THE STARLING'), c = w.collisions;
      const seen = new Set(), q = [[BridgeCharacter.getX(), BridgeCharacter.getY()]];
      while (q.length) {
        const [x, y] = q.shift(), k = x + ',' + y;
        if (seen.has(k) || !c[y] || c[y][x] !== 0) continue;
        seen.add(k);
        if (Math.abs(x - d.x) + Math.abs(y - d.y) === 1) return true;
        q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      return false;
    }));
  await at(35, 21); await shot('starling_outside');
  console.log('homes: coins left', await ev(() => window._coins), '· errors:', errors);
  await b.close();
})();
