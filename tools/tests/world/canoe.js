// Down the Silverrun by canoe (js/canoe.js), paddled with the arrow keys by a little helmsman that steers along the
// river's flow line: a canoe off the rack at the landing, under the bridge village, through the weir's chute, past the
// shrine island and on into the rapids (the next stretch: you arrive still in your canoe); land above the falls, carry
// down the stair, a canoe from the rack at the pool and on to Mirror Lake; step ashore on the beach. Then the fork: back
// at the falls, paddle off up the Deep Run into the Deepwood and land at the frogs' pool. Shots: OUT/canoe_*.png.
// node canoe.js OUT
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 760 } });
  const p = await ctx.newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase|api\/talk/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/?at=2026-10-17T12:30'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide(); });
  const fail = (m) => { errors++; console.log('FAILED: ' + m); };
  const go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]); await p.waitForTimeout(3000); };
  const wid = () => p.evaluate(() => BridgeWorld.getWorldId());
  const canoe = () => p.evaluate(() => { const s = BridgeCanoe._st(); return s ? { x: s.x, y: s.y } : null; });
  const KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  let held = {};
  const hold = async (want) => {
    for (const k of Object.keys(KEYS)) {
      if (want[k] && !held[k]) await p.keyboard.down(KEYS[k]);
      if (!want[k] && held[k]) await p.keyboard.up(KEYS[k]);
    }
    held = Object.assign({}, want);
  };
  // steer: toward a point a little way along the flow line from the nearest one (or at a target), in eight ways
  const steer = async (target, ms, until) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const s = await p.evaluate((target) => {
        const st = BridgeCanoe._st(), w = BridgeWorld.getWorld();
        if (!st || !w.river) return null;
        let tx, ty;
        if (target) { tx = target[0] + 0.5; ty = target[1] + 0.5; }
        else {
          const F = (w.river.flow || []).concat(...(w.river.flows || []));
          let bi = 0, bd = 1e9;
          F.forEach((f, i) => { const d = Math.hypot(f[0] - st.x, f[1] - st.y); if (d < bd) { bd = d; bi = i; } });
          const ahead = F[Math.min(F.length - 1, bi + 2)];
          tx = ahead[0]; ty = ahead[1];
        }
        return { dx: tx - st.x, dy: ty - st.y, x: st.x, y: st.y, w: BridgeWorld.getWorldId() };
      }, target);
      if (!s) { await hold({}); return null; }
      if (until && until(s)) { await hold({}); return s; }
      const a = Math.atan2(s.dy, s.dx), want = {};
      if (Math.cos(a) > 0.38) want.right = 1; if (Math.cos(a) < -0.38) want.left = 1;
      if (Math.sin(a) > 0.38) want.down = 1; if (Math.sin(a) < -0.38) want.up = 1;
      await hold(want);
      await p.waitForTimeout(120);
    }
    await hold({});
    return null;
  };
  const useKind = async (kind) => {
    const it = await p.evaluate((k) => BridgeWorld.getWorld().interactions.find(i => i.kind === k), kind);
    if (!it) { fail('no ' + kind + ' here in ' + await wid()); return false; }
    await p.evaluate((it) => { BridgeCharacter.init(it.x, it.y); BridgeSylvara.use(it); }, it);
    await p.waitForTimeout(600);
    return true;
  };

  // ---- the upper Silverrun: off the rack, down the river ----------------------------------------------------------------
  await go('sylvara-river', [24, 1]);
  await useKind('canoe');
  if (!await canoe()) fail('no canoe off the rack');
  let passed = { bridge: false, weir: false, island: false };
  const t0 = Date.now();
  let shotBridge = false;
  while (Date.now() - t0 < 90000 && await wid() === 'sylvara-river') {
    const s = await steer(null, 1500);
    const c = await canoe();
    if (!c) break;
    if (c.y > 13 && c.y < 16) { passed.bridge = true; if (!shotBridge) { shotBridge = true; await p.screenshot({ path: OUT + '/canoe_bridge.png' }); } }
    if (c.y > 21 && c.y < 23) passed.weir = true;
    if (c.y > 27 && c.y < 30) passed.island = true;
  }
  console.log('river: passed', JSON.stringify(passed), 'now in', await wid(), 'still in a canoe', !!await canoe());
  if (await wid() !== 'sylvara-falls') fail('didn\'t reach the falls by canoe');
  if (!await canoe()) fail('arrived at the falls on foot, not in the canoe');

  // ---- the rapids, down to the landing above the falls, ashore --------------------------------------------------------------
  await p.screenshot({ path: OUT + '/canoe_rapids.png' });
  await steer(null, 30000, (s) => s.y > 14.2);
  const landed = await steer([19, 16], 15000, (s) => Math.hypot(s.x - 19.5, s.y - 16.5) < 1.4);
  await p.screenshot({ path: OUT + '/canoe_above_falls.png' });
  await p.keyboard.press('e'); await p.waitForTimeout(800);
  if (await canoe()) fail('couldn\'t step ashore above the falls (' + JSON.stringify(landed) + ')');
  const moored = await p.evaluate(() => Object.keys(BridgeCanoe._moored()));
  console.log('falls: ashore above the falls, canoe moored in', moored.join(','));

  // ---- the fork: back out, up the Deep Run into the Deepwood --------------------------------------------------------------
  await useKind('launch');
  await steer([30, 14], 12000, (s) => s.x > 28);
  await steer([49, 15], 30000, (s) => s.w !== 'sylvara-falls');
  await p.waitForTimeout(2500);
  if (await wid() !== 'sylvara-deepwood') fail('the Deep Run didn\'t carry on into the Deepwood (in ' + await wid() + ')');
  else {
    await steer([14, 18], 30000, (s) => Math.hypot(s.x - 14.5, s.y - 18.5) < 2.0);
    await p.screenshot({ path: OUT + '/canoe_deepwood.png' });
    await p.keyboard.press('e'); await p.waitForTimeout(800);
    if (await canoe()) fail('couldn\'t land at the frogs\' pool');
    console.log('deepwood: landed at', await p.evaluate(() => [BridgeCharacter.getX(), BridgeCharacter.getY()]).then(a => a.join(',')));
  }

  // ---- below the falls: a canoe from the rack at the pool, down to Mirror Lake ------------------------------------------------
  await go('sylvara-falls', [19, 23]);
  await useKind('canoe');
  const t1 = Date.now();
  while (Date.now() - t1 < 60000 && await wid() === 'sylvara-falls') await steer(null, 1500);
  if (await wid() !== 'sylvara-lake') fail('didn\'t reach Mirror Lake (in ' + await wid() + ')');
  await steer([25, 25], 25000, (s) => Math.hypot(s.x - 25, s.y - 25) < 1.5);
  await p.evaluate(() => BridgeLit && BridgeLit._force && BridgeLit._force({ hour: 23, season: 'summer', weather: 'clear' }));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: OUT + '/canoe_lake_night.png' });
  await p.evaluate(() => BridgeLit && BridgeLit._force && BridgeLit._force({ hour: 12.4, season: 'summer', weather: 'clear' }));
  await steer([24, 26], 20000, (s) => Math.hypot(s.x - 24.5, s.y - 25.5) < 1.5);
  await p.keyboard.press('e'); await p.waitForTimeout(800);
  if (await canoe()) fail('couldn\'t step ashore on Mirror Lake\'s landing');
  console.log('lake: reached by canoe and ashore at', await p.evaluate(() => [BridgeCharacter.getX(), BridgeCharacter.getY()]).then(a => a.join(',')));
  console.log('errors:', errors);
  await b.close();
})();
