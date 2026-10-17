// The Undercroft (js/dungeon.js): tonight's crypt — the hall and its board, floors the same for everyone tonight and
// never walled off, chests, traps, the guardian sealing every fifth stair, coming round in the hall, a new crypt
// tomorrow. Until its rooms are rendered, stand-ins are made from the Rose Mine's, to the same contract.
// node world/dungeon.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  // stand-ins, only while the real rooms aren't there: the mine's hall and floors, shaped to the Undercroft's contract
  const real = (await (await ctx.request.get('http://127.0.0.1:8766/bridge/assets/worlds/lumar-undercroft.json')).status()) === 200;
  if (!real) {
    await p.route(/\/assets\/worlds\/lumar-undercroft(-[abc])?\.json/, async r => {
      if (r.request().method() === 'HEAD') return r.fulfill({ status: 200, body: '' });      // is the hall there? (the way in asks)
      const m = r.request().url().match(/lumar-undercroft(?:-([abc]))?\.json/), layout = m[1];
      const res = await r.fetch({ url: 'http://127.0.0.1:8766/bridge/assets/worlds/lumar-rose-mine' + (layout ? '-' + layout : '') + '.json' });
      const d = await res.json();
      d.tileset = 'cave';
      if (!layout) {
        delete d.mine;
        d.spawns = { player: [7, 4] };
        d.interactions = d.interactions.filter(i => i.type !== 'mine_lift' && i.type !== 'mine_rack' && i.type !== 'mine_slate');
        d.interactions.push({ x: 4, y: 2, type: 'dialog', label: 'DEEPEST FLOOR', dialog: '' }, { x: 8, y: 2, type: 'dialog', label: 'STAIR DOWN', dialog: '' });
      } else {
        const up = d.mine.up; delete d.mine;
        const open = []; d.collisions.forEach((row, y) => row.forEach((v, x) => { if (!v) open.push([x, y]); }));
        d.dungeon = { layout, up, open };
        d.interactions.forEach(i => { if (i.type === 'mine_up') i.type = 'dungeon_up'; });
      }
      r.fulfill({ response: res, body: JSON.stringify(d) });
    });
  }
  console.log('rooms:', real ? 'the real ones' : 'stand-ins from the Rose Mine');
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T21:00'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w) => ev((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; });
  const close = async () => { for (let i = 0; i < 4 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('e'); await p.waitForTimeout(300); } };   // (Esc is back to the ship)
  const use = async (label) => {                                // E past a dialog's typing (only if one's up: E by a stair takes it)
    await ev((l) => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === l)), label); await p.waitForTimeout(400);
    if (await ev(() => !!document.querySelector('.world-dialog'))) { await p.keyboard.press('e'); await p.waitForTimeout(400); }
  };
  const arrive = () => p.waitForFunction(() => BridgeDungeon._here() && BridgeWorld.getWorld() === BridgeDungeon._here().data, null, { timeout: 15000 }).then(() => p.waitForTimeout(600));
  const floorInfo = () => ev(() => {
    const H = BridgeDungeon._here(), w = BridgeWorld.getWorld(), C = w.collisions.map(r => r.slice());
    w.interactions.forEach(i => { if (i.type === 'hostile') C[i._ry != null ? i._ry : i.y][i._rx != null ? i._rx : i.x] = 0; });   // they move: not walls
    const s = [w.spawns.player[0], w.spawns.player[1]], seen = { [s]: 1 }, q = [s];
    while (q.length) { const c = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { const n = [c[0] + d[0], c[1] + d[1]]; if (n[0] < 0 || n[1] < 0 || n[0] >= w.width || n[1] >= w.height || seen[n] || C[n[1]][n[0]]) return; seen[n] = 1; q.push(n); }); }
    let open = 0, reached = 0; C.forEach((row, y) => row.forEach((v, x) => { if (!v) { open++; if (seen[[x, y]]) reached++; } }));
    return { name: w.name, layout: w.dungeon.layout, stair: H.stair && H.stair.join(','), chests: H.chests.map(c => c.x + ',' + c.y).join(' '), traps: H.traps.length,
             creatures: w.interactions.filter(i => i.type === 'hostile').map(i => i.creature).join(','), guardian: !!H.guardian, walledOff: open - reached };
  });

  // the way in from Midnight's graveyard (put there until Midnight's render has its own)
  await go('lumar-midnight'); await p.waitForTimeout(1200);
  const portal = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.target === 'lumar-undercroft'); return i ? i.label + '@' + i.x + ',' + i.y : null; });
  console.log('the way in on Midnight:', portal);
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(x => x.target === 'lumar-undercroft')));
  await p.waitForFunction(() => BridgeWorld.getWorldId() === 'lumar-undercroft', null, { timeout: 15000 }).catch(() => {});
  console.log('through it:', await ev(() => BridgeWorld.getWorldId()));

  await go('lumar-undercroft'); await p.waitForTimeout(1200);
  console.log('the hall:', await ev(() => BridgeWorld.getWorld().name), '·', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(i => /^dungeon_/.test(i.type)).map(i => i.label + ':' + i.type))));
  await use('DEEPEST FLOOR');
  console.log('the board:', (await dialog()).slice(0, 160));
  await close();

  await use('STAIR DOWN'); await arrive();
  const f1 = await floorInfo();
  console.log('floor 1:', JSON.stringify(f1));
  await p.screenshot({ path: SHOTS + '/dungeon_floor1.png' });
  await ev(() => BridgeDungeon._go(1)); await arrive();
  const f1b = await floorInfo();
  console.log('floor 1 again, the same tonight:', f1b.layout === f1.layout && f1b.stair === f1.stair && f1b.chests === f1.chests);

  // a chest
  await ev(() => { const c = BridgeDungeon._here().chests[0]; BridgeCharacter.init(c.x, c.y + 1); });
  await use('CHEST');
  console.log('a chest:', (await dialog()).slice(0, 200));
  await close();
  await use('CHEST');
  console.log('again:', (await dialog()).slice(0, 80));
  await close();

  // a trap
  const before = await ev(() => BridgeInventory.getStats().hp);
  await ev(() => { const t = BridgeDungeon._here().traps[0]; BridgeCharacter.init(t.x, t.y); });
  await p.waitForTimeout(500);
  console.log('a trap: hp', before, '→', await ev(() => BridgeInventory.getStats().hp));

  // down the stair
  await ev(() => { BridgeInventory.restoreHP(100); const s = BridgeDungeon._here().stair; BridgeCharacter.init(s[0], s[1] + 1); });
  await use('STAIR DOWN'); await arrive();
  console.log('down:', (await floorInfo()).name);

  // floor 5: the guardian seals the stair
  await ev(() => BridgeDungeon._go(5)); await arrive();
  const f5 = await floorInfo();
  console.log('floor 5:', JSON.stringify(f5));
  await use('STAIR DOWN');
  console.log('sealed:', (await dialog()).slice(0, 90));
  await close();
  await ev(() => { const w = BridgeWorld.getWorld(), h = BridgeDungeon._here().guardian; BridgeInteractions.killHostile(w, h); });
  await p.waitForTimeout(600);
  await use('STAIR DOWN'); await arrive();
  console.log('the guardian down, the stair opens:', (await floorInfo()).name);

  // blacking out: back in the hall
  await ev(() => BridgeCombat.faint());
  await p.waitForTimeout(4500);
  console.log('blacked out, came round in:', await ev(() => BridgeWorld.getWorldId()), '·', (await dialog()).slice(0, 120));
  await close();
  await use('DEEPEST FLOOR');
  console.log('the board after:', (await dialog()).slice(0, 160));
  await close();
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'STAIR DOWN'))); await p.waitForTimeout(500);
  console.log('the stair from the hall:', (await dialog()).slice(0, 160));
  await close();

  // tomorrow night: another crypt
  await ev(() => BridgeClock._at('2026-10-15T21:00'));
  await ev(() => BridgeDungeon._go(1)); await arrive();
  const t1 = await floorInfo();
  console.log('tomorrow, floor 1 is new:', t1.stair !== f1.stair || t1.chests !== f1.chests || t1.layout !== f1.layout, '· walled off', t1.walledOff);
  await b.close();
})();
