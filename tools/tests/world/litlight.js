// Live light (js/litscene.js): a scene rendered with the lit passes is relit in the game for the hour, the season and the
// weather. Loads a lit scene, waits for the live picture, then walks it through the day (shadows should move, night
// should darken and light the lamps), the seasons and the weather, and checks a character's light follows.
// node world/litlight.js [shots] [world] [x,y]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots', WORLD = process.argv[3] || 'lumar-square', POS = (process.argv[4] || '13,12').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T12:00'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.evaluate(() => ['verdance', 'lumar', 'hoarfell', 'sylvara'].forEach(r => BridgeWeather._pin(r, 'fair')));
  await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), WORLD);
  await p.evaluate((q) => { BridgeCharacter.init(q[0], q[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, POS);
  const stats = () => p.evaluate((w) => BridgeLit._stats(w), WORLD);
  // the first live picture
  let st = null;
  for (let i = 0; i < 60; i++) { st = await stats(); if (st && st.drawing) break; await p.waitForTimeout(250); }
  console.log('live light: lit scene', !!st, '· drawing', !!(st && st.drawing), '· composed in', st && Math.round(st.ms), 'ms · still water', st && st.water);
  if (!st || !st.drawing) { console.log('live light: ERROR the scene never drew live'); await b.close(); process.exit(1); }
  async function at(o, name) {
    const before = (await stats()).comps;
    await p.evaluate((o) => BridgeLit._force(o), o);
    for (let i = 0; i < 60; i++) { const s = await stats(); if (s.comps > before) break; await p.waitForTimeout(100); }
    await p.waitForTimeout(1900);                     // the fade
    await p.screenshot({ path: `${SHOTS}/lit_${WORLD}_${name}.png` });
    const px = await p.evaluate(() => {
      const c = document.getElementById('bridge-canvas'), x = c && c.getContext('2d');
      if (!x) return null;
      const d = x.getImageData(c.width * 0.2 | 0, c.height * 0.2 | 0, c.width * 0.6 | 0, c.height * 0.6 | 0).data;
      let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i] + d[i + 1] + d[i + 2];
      return Math.round(s / (d.length / 16) / 3);
    });
    const tint = await p.evaluate((q) => { const sc = BridgeScene.get(q.w); return sc ? BridgeLit.tint(sc, q.x, q.y) : null; }, { w: WORLD, x: POS[0], y: POS[1] });
    return { px, tint };
  }
  const day = {};
  for (const [h, name] of [[7.2, 'morning'], [12.4, 'noon'], [17.9, 'golden'], [20.3, 'dusk'], [1, 'night']]) {
    day[name] = await at({ hour: h, season: 'summer' }, name);
    console.log('live light:', name, 'brightness', day[name].px, '· light on a figure', day[name].tint);
  }
  if (day.noon.px <= day.night.px) { errs++; console.log('live light: ERROR night is not darker than noon'); }
  if (day.noon.tint === day.night.tint) { errs++; console.log('live light: ERROR a figure is lit the same at noon and at night'); }
  for (const s of ['spring', 'autumn', 'winter']) { const r = await at({ hour: 12.4, season: s }, s); console.log('live light:', s, 'brightness', r.px); }
  for (const w of ['rain', 'fog', 'snow']) { const r = await at({ hour: 12.4, season: 'summer', weather: w }, w); console.log('live light:', w, 'brightness', r.px); }
  // walking across the square: the light on a figure changes smoothly (it once jumped from cobble to crevice: a flicker)
  await at({ hour: 15, season: 'summer' }, 'walk');
  const walk = await p.evaluate((q) => {
    const sc = BridgeScene.get(q.w), out = [];
    for (let x = 4; x <= 22; x += 0.125) out.push(BridgeLit.tint(sc, x, q.y));
    return out;
  }, { w: WORLD, y: POS[1] });
  const rgb = (c) => (/rgb\((\d+),(\d+),(\d+)\)/.exec(c || '') || [0, 0, 0, 0]).slice(1).map(Number);
  let jump = 0;
  for (let i = 1; i < walk.length; i++) { const a = rgb(walk[i - 1]), b2 = rgb(walk[i]); jump = Math.max(jump, ...a.map((v, k) => Math.abs(v - b2[k]))); }
  console.log('live light: walking across, the biggest change in a figure\'s light over an eighth of a tile', jump);
  if (jump > 14) { errs++; console.log('live light: ERROR a figure\'s light jumps as they walk'); }
  await p.evaluate(() => BridgeLit._force(null));
  console.log('live light: compositions', (await stats()).comps, '· errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
