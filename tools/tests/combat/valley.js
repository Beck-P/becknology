// The hidden valley's creatures (js/valley.js) and its yetis, on Fellhaven's open snow: each creature spawned beside
// the pilot — its wind-up and the tiles it marks, a blow landing on you, a blow of yours landing on it — the rime
// beetle's shell (a blow from the front glances, from behind it bites deeper, a maul drives through), the golem's frost
// armour cracking, the glacier wyrm (under the snow nothing touches it, its breach marks a 3×3, up and exposed it can
// be struck, its phases and the icicles), the rosters each valley world gets, and a yeti's trust over days. Each
// moment is shot round the pilot ×3 (OUT/valley_<moment>.png), and the fight's own drawing is watched for boxes as in
// look.js. node combat/valley.js OUT
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/shots';
let errors = 0;
function check(ok, what) { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) errors++; }
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    localStorage.setItem('bridge_ship_location', 'ice'); localStorage.removeItem('bridge_valley');
    window._boxes = [];
    const P = CanvasRenderingContext2D.prototype;
    ['fillRect', 'strokeRect'].forEach((fn) => {
      const orig = P[fn];
      P[fn] = function (x, y, w, h) {
        if (window._watch && Math.abs(w) >= 6 && Math.abs(h) >= 6 && this.globalCompositeOperation !== 'source-atop') {
          const st = String(new Error().stack).split('\n').slice(2).join('\n');
          const m = /\/js\/(fx|loot|combat|valley)\.js:(\d+)/.exec(st.split('\n')[0] || '');
          if (m && !/at (drawCreature|bar|bossBar|sceneItems|drawYeti) /.test(st)) window._boxes.push(m[1] + '.js:' + m[2] + ' ' + fn + ' ' + Math.round(w) + 'x' + Math.round(h));
        }
        return orig.apply(this, arguments);
      };
    });
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => { console.log('PAGEERR', e.message); errors++; });
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load|api\/talk/.test(m.text())) console.log('CONSOLE', m.text()); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T12:00'); await p.waitForTimeout(2000);
  await p.evaluate(() => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot({ id: '1', name: 'BECK', suit_color: 'gold' }); BridgeProgression.awardCoins = n => Promise.resolve(n); });
  await p.waitForTimeout(600);
  await p.evaluate(() => new Promise(r => BridgeWorld.load('hoarfell', () => { BridgeState.transition('world', { worldId: 'hoarfell', spawn: { x: 8, y: 19 } }); r(); })));
  await p.waitForTimeout(2200);
  await p.evaluate(() => {
    ['cutlass', 'war_maul', 'emberbrand'].forEach(id => BridgeInventory.addItem(id, 1));
    BridgeHoarfell.warm(999);
    if (window.BridgeEvents && BridgeEvents._clear) BridgeEvents._clear();
    if (window.BridgeCrowd && BridgeCrowd._off) BridgeCrowd._off(true);
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window._L = {
      sleep, frame,
      home() { BridgeCharacter.init(8, 19); BridgeCharacter.setFacing('right'); },
      clear() {
        const w = BridgeWorld.getWorld();
        w.interactions.filter(h => h.type === 'hostile').forEach(h => { if (w.collisions[h.y]) w.collisions[h.y][h.x] = 0; });
        w.interactions = w.interactions.filter(h => h.type !== 'hostile');
        BridgeLoot.clear(); BridgeInventory.restoreAll(); this.home();
      },
      hold(id) { for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === id) return; } },
      spawn(kind, dx, dy, o) { const h = BridgeValley._spawn(kind, BridgeCharacter.getX() + dx, BridgeCharacter.getY() + dy); h.blink = 0; return Object.assign(h, o || {}); },
      async until(f, ms) { for (let t = 0; t < (ms || 5000) && !f(); t += 8) await sleep(8); return f(); },
      hold_(t) { if (!this._pn) this._pn = performance.now.bind(performance); performance.now = () => t; },
      thaw() { if (this._pn) { performance.now = this._pn; this._pn = null; } },
      async grab(t, wTiles, hTiles, dxT) {
        if (t) this.hold_(t);
        await frame();
        const c = document.getElementById('bridge-canvas'), v = BridgeWorld.getScreenView(), dpr = c.width / c.clientWidth;
        const pos = BridgeCharacter.getRenderPos(), T = v.ts * dpr, W = wTiles || 8, H = hTiles || 5;
        const x = Math.round((v.offX + (pos.x - (dxT === undefined ? 2.5 : dxT)) * v.ts) * dpr), y = Math.round((v.offY + (pos.y - (H - 2)) * v.ts) * dpr);
        const o = document.createElement('canvas'); o.width = W * T * 3; o.height = H * T * 3;
        const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, x, y, W * T, H * T, 0, 0, W * T * 3, H * T * 3);
        this.thaw();
        return o.toDataURL('image/png');
      },
      // a blow of ours on h with weapon id, facing it; the damage it did
      async strike(h, id) {
        this.hold(id); const px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
        BridgeCharacter.setFacing(h.x > px ? 'right' : h.x < px ? 'left' : h.y > py ? 'down' : 'up');
        const hp = h._hp; BridgeArms && BridgeArms.reset && BridgeArms.reset();
        BridgeItems.strike(BridgeWorld.getWorld(), h, BridgeItems.get(id).damage, BridgeItems.get(id));
        return hp - h._hp;
      }
    };
  });
  const save = (name, url) => fs.writeFileSync(OUT + '/valley_' + name + '.png', Buffer.from(url.split(',')[1], 'base64'));
  await p.evaluate(() => { window._watch = true; });

  // ---- each creature: winds up, marks its tiles, strikes; a blow of ours lands --------------------------------------
  const kinds = [['wolf', 2, 0], ['wolf', 1, 0], ['beetle', 1, 0], ['beetle', 2, 0], ['bat', 3, 0], ['golem', 1, 0], ['wraith', 3, 0]];
  for (const [kind, dx, dy] of kinds) {
    const r = await p.evaluate(async ([kind, dx, dy]) => {
      _L.clear();
      const h = _L.spawn(kind, dx, dy, { moveCooldown: 1e9, aggroRange: 9 });
      if (kind === 'beetle') h._dir = 'left';
      const idle = await _L.grab(performance.now() + 200);
      const wound = await _L.until(() => h._attackPhase === 'winding', 6000);
      const cells = BridgeCombat.dangerCells(h).map(c => (c[0] - BridgeCharacter.getX()) + ',' + (c[1] - BridgeCharacter.getY()));
      const kindAt = h._kind;
      const g = await _L.grab(h._attackStart + (h._windFor || h.windupMs) * 0.7);
      const hp0 = BridgeInventory.getStats().hp;
      await _L.until(() => h._attackPhase === 'recovering', 6000);
      const s = await _L.grab(h._attackStart + 40);
      const took = hp0 - BridgeInventory.getStats().hp;
      h.windupMs = 1e9;
      return { wound, cells, kindAt, took, idle, g, s, label: h.label };
    }, [kind, dx, dy]);
    check(r.wound, kind + ' (' + dx + ' off) winds up: ' + r.kindAt + ' marking ' + r.cells.join(' '));
    check(r.took > 0, kind + ' strikes: -' + r.took);
    save(kind + '_' + dx + '_idle', r.idle); save(kind + '_' + dx + '_windup', r.g); save(kind + '_' + dx + '_strike', r.s);
  }

  // ---- the rime beetle's shell -------------------------------------------------------------------------------------
  const shell = await p.evaluate(async () => {
    _L.clear();
    const h = _L.spawn('beetle', 1, 0, { windupMs: 1e9, maxHP: 900, _hp: 900, moveCooldown: 1e9 });
    h._dir = 'left'; h._turnAt = performance.now() + 1e9;
    const front = await _L.strike(h, 'cutlass');
    h._dir = 'right';
    const back = await _L.strike(h, 'cutlass');
    h._dir = 'down';
    const side = await _L.strike(h, 'cutlass');
    h._dir = 'left';
    const maul = await _L.strike(h, 'war_maul');
    return { front, back, side, maul };
  });
  check(shell.front < shell.side && shell.front <= 6, 'beetle: a cutlass from the front glances (' + shell.front + '), from the side ' + shell.side);
  check(shell.back > shell.side, 'beetle: from behind it bites deeper (' + shell.back + ')');
  check(shell.maul >= 58, 'beetle: a maul from the front drives through (' + shell.maul + ')');

  // ---- the golem's frost armour ------------------------------------------------------------------------------------
  const armour = await p.evaluate(async () => {
    _L.clear();
    const h = _L.spawn('golem', 1, 0, { windupMs: 1e9, maxHP: 2000, _hp: 2000 });
    const rimed = await _L.strike(h, 'cutlass');
    const e = []; for (let i = 0; i < 3; i++) e.push(await _L.strike(h, 'emberbrand'));
    const after = await _L.strike(h, 'cutlass');
    return { rimed, e, cracked: !!h._cracked, after };
  });
  check(armour.rimed < 20, 'golem: the frost armour takes most of a cutlass (' + armour.rimed + ')');
  check(armour.cracked && armour.after === 40, 'golem: three fire blows crack it ' + armour.e.join('/') + ', then a cutlass lands in full (' + armour.after + ')');

  // ---- the glacier wyrm ----------------------------------------------------------------------------------------------
  const wyrm = await p.evaluate(async () => {
    _L.clear();
    const h = _L.spawn('wyrm', 3, 0);
    const out = {};
    await _L.until(() => h._init, 2000);
    out.under = h._attackPhase;
    await _L.sleep(400);
    out.rip = await _L.grab(performance.now(), 10, 6, 3.5);
    out.hitUnder = await _L.strike(h, 'cutlass');
    out.engaged = await _L.until(() => h._engaged, 3000);
    out.breach = await _L.until(() => h._attackPhase === 'winding' && h._kind === 'breach', 9000);
    out.cells = BridgeCombat.dangerCells(h).length;
    out.breachShot = await _L.grab(h._attackStart + h._windFor * 0.75, 10, 6, 3.5);
    const hp0 = BridgeInventory.getStats().hp;
    await _L.until(() => h._attackPhase === 'recovering', 4000);
    out.took = hp0 - BridgeInventory.getStats().hp;
    out.upShot = await _L.grab(h._attackStart + 150, 10, 7, 3.5);
    // up and exposed: a blow lands (standing beside it)
    const w = BridgeWorld.getWorld();
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [h.x + d[0], h.y + d[1]]).find(c => w.collisions[c[1]][c[0]] === 0);
    if (n) BridgeCharacter.init(n[0], n[1]);
    out.hitUp = await _L.strike(h, 'cutlass');
    // its phases: at two thirds it quickens and the icicles come
    h._hp = Math.round(h.maxHP * 0.6);
    await _L.until(() => h._phase === 2, 2000);
    out.phase2 = h._phase;
    await _L.until(() => BridgeValley._hazards().length > 0, 7000);
    out.ice = BridgeValley._hazards().length;
    out.iceShot = await _L.grab(performance.now(), 10, 6, 3.5);
    h._hp = Math.round(h.maxHP * 0.3);
    await _L.until(() => h._phase === 3, 2000);
    out.phase3 = h._phase;
    // back under after its moment
    out.dove = await _L.until(() => h._attackPhase === 'under', 9000);
    h.windupMs = 1e9; h._hp = 1;
    return out;
  });
  check(wyrm.under === 'under', 'wyrm starts under the snow');
  check(wyrm.hitUnder === 0, 'wyrm: under the snow nothing touches it');
  check(wyrm.engaged && wyrm.breach && wyrm.cells === 9, 'wyrm closes in and marks a 3x3 where it breaches (' + wyrm.cells + ')');
  check(wyrm.took > 0, 'wyrm breach lands on you: -' + wyrm.took);
  check(wyrm.hitUp > 0, 'wyrm: up and exposed, a blow lands (' + wyrm.hitUp + ')');
  check(wyrm.phase2 === 2 && wyrm.ice > 0, 'wyrm phase 2 at two thirds, icicles marked: ' + wyrm.ice);
  check(wyrm.phase3 === 3, 'wyrm phase 3 at a third');
  check(wyrm.dove, 'wyrm dives again after its moment');
  save('wyrm_ripples', wyrm.rip); save('wyrm_breach', wyrm.breachShot); save('wyrm_up', wyrm.upShot); save('wyrm_icicles', wyrm.iceShot);

  // ---- a kill drops what it should; the wyrm once a day, the Wyrmfang the first time ---------------------------------
  const drops = await p.evaluate(async () => {
    _L.clear();
    const w = BridgeWorld.getWorld(), h = _L.spawn('wyrm', 2, 0);
    h.drops = h.drops.concat([{ id: 'wyrmfang', min: 1, max: 1 }]);
    BridgeInteractions.killHostile(w, h);
    await _L.sleep(300);
    const sv = BridgeValley._save();
    return { day: !!sv.wyrm, fang: !!sv.fang, loot: BridgeLoot.count() };
  });
  check(drops.day && drops.fang && drops.loot > 0, 'wyrm killed: once today, the fang taken, loot on the snow (' + drops.loot + ')');

  // ---- rosters: what each valley world gets ---------------------------------------------------------------------------
  const rosters = await p.evaluate(() => {
    const base = BridgeWorld.getWorld(), out = {};
    ['hoarfell-valley', 'hoarfell-caves', 'hoarfell-monastery', 'hoarfell-heart'].forEach(id => {
      const data = { spawns: { player: [39, 25] }, collisions: base.collisions.map(r => r.slice()), interactions: [] };
      BridgeValley.decorate(id, data);
      out[id] = {};
      data.interactions.forEach(i => { const k = i.creature || i.type; out[id][k] = (out[id][k] || 0) + 1; });
      out[id].faint = !!data.onFaint;
    });
    // the world JSON's own block wins
    const d2 = { spawns: { player: [39, 25] }, collisions: base.collisions.map(r => r.slice()), interactions: [], valley: { spawns: [['golem', 8, 19], ['bat', 10, 19]], yetis: [[12, 19]] } };
    BridgeValley.decorate('hoarfell-somewhere', d2);
    out.own = d2.interactions.map(i => i.creature || i.type).join(',');
    return out;
  });
  console.log('rosters', JSON.stringify(rosters));
  check(rosters['hoarfell-valley'].wolf === 7 && rosters['hoarfell-valley'].yeti === 2, 'valley: three packs of wolves and two yetis');
  check(rosters['hoarfell-caves'].beetle === 4 && rosters['hoarfell-caves'].bat === 5, 'caves: beetles and bats');
  check(rosters['hoarfell-monastery'].golem === 3 && rosters['hoarfell-monastery'].wraith === 4, 'monastery: golems and wraiths');
  check(rosters['hoarfell-heart'].wyrm === undefined, 'heart: no wyrm the day it was killed');
  check(rosters.own === 'golem,bat,yeti', 'a world\'s own valley block: ' + rosters.own);

  // ---- a yeti: shy, then fed day by day ------------------------------------------------------------------------------
  await p.evaluate(() => new Promise(r => BridgeWorld.load('hoarfell', () => { BridgeState.transition('world', { worldId: 'hoarfell', spawn: { x: 8, y: 19 } }); r(); })));
  await p.waitForTimeout(1500);
  const yet = await p.evaluate(async () => {
    BridgeValley._reset(); BridgeHoarfell.warm(999);
    BridgeCharacter.init(5, 19);
    const o = BridgeValley._yeti(13, 19, 0), out = {};
    await _L.sleep(600);
    out.shot = await _L.grab(performance.now(), 12, 6, 0);
    // walk at it quickly: it hides
    for (let x = 6; x <= 10; x++) { BridgeCharacter.init(x, 19); await _L.sleep(110); }
    await _L.sleep(200);
    out.hid = o.state;
    out.hideShot = await _L.grab(performance.now(), 12, 6, 2);
    await _L.sleep(6500);
    const trust = [];
    for (let d = 0; d < 6; d++) {
      BridgeValley._day(d);
      BridgeValley._feed(o, d % 2 ? 'apple' : 'sweet_roll');
      BridgeValley._feed(o, 'apple');                                  // a second the same day doesn't count
      trust.push(BridgeValley._save().yetis[o.id].trust);
    }
    out.trust = trust;
    out.name = o.inter.label;
    out.gift = BridgeWorld.getWorld().interactions.filter(i => i.type === 'yeti_gift').length;
    out.walks = !!(BridgeValley._walker() && BridgeValley._walker().yeti === o);
    BridgeValley._day(0);
    out.sitShot = await _L.grab(performance.now(), 12, 6, 2);
    return out;
  });
  check(yet.hid === 'hide', 'a yeti hides from someone coming at it quickly (' + yet.hid + ')');
  check(yet.trust.join(',') === '1,2,3,4,5,5', 'fed once a day, its trust grows: ' + yet.trust.join(','));
  check(yet.name !== 'YETI', 'fed once, you learn its name: ' + yet.name);
  check(yet.gift === 1, 'at three it shows you something (' + yet.gift + ')');
  check(yet.walks, 'at five it walks with you');
  save('yeti', yet.shot); save('yeti_hiding', yet.hideShot); save('yeti_friend', yet.sitShot);

  // ---- with a trusted yeti beside you, a wolf keeps its distance ------------------------------------------------------
  const kept = await p.evaluate(async () => {
    const w = BridgeWorld.getWorld();
    w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
    w.interactions = w.interactions.filter(h => h.type !== 'hostile');
    BridgeCharacter.init(8, 19);
    const h = BridgeValley._spawn('wolf', 10, 19); h.moveCooldown = 300;
    const hp0 = BridgeInventory.getStats().hp;
    await _L.sleep(2500);
    return { took: hp0 - BridgeInventory.getStats().hp, d: Math.abs(h.x - 8) + Math.abs(h.y - 19) };
  });
  check(kept.took === 0 && kept.d >= 2, 'a wolf keeps its distance from a trusted yeti (' + kept.d + ' tiles, -' + kept.took + ')');

  const boxes = await p.evaluate(() => window._boxes.slice(0, 10));
  check(!boxes.length, 'no boxes in the valley\'s drawing' + (boxes.length ? ': ' + boxes.join(' | ') : ''));
  console.log('errors ' + errors);
  await b.close();
})();
