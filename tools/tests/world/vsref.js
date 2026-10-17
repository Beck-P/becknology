// A place in the game beside the Look Book (tools/bridge-art/dioramas/ref): shoots the world live at the reference
// images' hours and seasons (noon in summer, golden hour in autumn, night in winter) through the glow and the vignette,
// cropped to a rect of tiles, and writes each next to its reference — the check a rebuilt place has to pass before it
// ships (*Making a new place* in apps/bridge/CLAUDE.md).
// node world/vsref.js <world> <ref name> [x0,y0,x1,y1] [x,y] [shots]
//   ref name: the start of a reference's file, e.g. verdance (verdance_toy_12.5_summer.png…); 'none' for no reference
//   x0,y0,x1,y1: the tiles to show (default: the Look Book dioramas' crop, 1,-1.2,16,7.24 — 15 × 8.44 tiles)
//   x,y: where the pilot stands (default: the middle of the rect)
// Writes <shots>/vsref_<world>_<hour>_<season>.png (the game on the left, the Look Book on the right, each at 2×).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [WORLD, REF = 'none', RECT = '1,-1.2,16,7.24', POS, SHOTS = __dirname + '/shots'] = process.argv.slice(2);
if (!WORLD) { console.log('usage: node world/vsref.js <world> <ref name> [x0,y0,x1,y1] [x,y] [shots]'); process.exit(2); }
const [x0, y0, x1, y1] = RECT.split(',').map(Number);
const pos = POS ? POS.split(',').map(Number) : [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)];
const REFDIR = path.join(__dirname, '../../bridge-art/dioramas/ref');
const MOMENTS = [[12.5, 'summer'], [18.2, 'autumn'], [22.5, 'winter']];
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js'), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })).newPage();
  let errs = 0;
  p.on('pageerror', (e) => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, (r) => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/?gpu=1&at=2026-10-16T12:00'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.evaluate(() => ['verdance', 'lumar', 'hoarfell', 'sylvara', 'arcadia'].forEach((r) => BridgeWeather._pin && BridgeWeather._pin(r, 'fair')));
  await p.evaluate((w) => new Promise((r) => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), WORLD);
  await p.evaluate((q) => { BridgeCharacter.init(q[0], q[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, pos);
  // hide the HUD so the frame is the place alone
  await p.addStyleTag({ content: 'body *{visibility:hidden!important} #bridge-canvas{visibility:visible!important}' });
  const lit = await p.evaluate((w) => { const sc = BridgeScene.get(w); return !!(sc && sc.lit); }, WORLD);
  for (let i = 0; i < 60 && lit; i++) { const s = await p.evaluate((w) => BridgeLit._stats(w), WORLD); if (s && s.drawing) break; await p.waitForTimeout(250); }
  for (const [hour, season] of MOMENTS) {
    if (lit) {
      const before = (await p.evaluate((w) => BridgeLit._stats(w), WORLD)).comps;
      await p.evaluate((o) => BridgeLit._force(o), { hour, season });
      for (let i = 0; i < 80; i++) { const s = await p.evaluate((w) => BridgeLit._stats(w), WORLD); if (s.comps > before) break; await p.waitForTimeout(100); }
      await p.waitForTimeout(2200);                  // the crossfade
    } else await p.waitForTimeout(800);
    const v = await p.evaluate(() => BridgeWorld.getScreenView());
    const clip = { x: Math.round(v.offX + x0 * v.ts), y: Math.round(v.offY + y0 * v.ts), width: Math.round((x1 - x0) * v.ts), height: Math.round((y1 - y0) * v.ts) };
    const game = await p.screenshot({ clip });
    const ref = REF === 'none' ? null : path.join(REFDIR, `${REF}_toy_${hour}_${season}.png`);
    const have = ref && fs.existsSync(ref) ? 'data:image/png;base64,' + fs.readFileSync(ref).toString('base64') : null;
    // put the two side by side (each scaled to 960 wide, nearest neighbour) on a page of their own
    const q = await b.newPage({ viewport: { width: 1940, height: 600 } });
    const out = await q.evaluate(async ([g, r]) => {
      const img = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
      const A = await img(g), B = r ? await img(r) : null;
      const W = 960, H = Math.round(A.height * W / A.width), Hb = B ? Math.round(B.height * W / B.width) : 0;
      const c = document.createElement('canvas'); c.width = B ? W * 2 + 20 : W; c.height = Math.max(H, Hb);
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(A, 0, 0, W, H); if (B) x.drawImage(B, W + 20, 0, W, Hb);
      return c.toDataURL('image/png');
    }, ['data:image/png;base64,' + game.toString('base64'), have]);
    await q.close();
    const f = path.join(SHOTS, `vsref_${WORLD}_${hour}_${season}.png`);
    fs.writeFileSync(f, Buffer.from(out.split(',')[1], 'base64'));
    console.log('vsref:', f, have ? '(beside ' + path.basename(ref) + ')' : '(no reference)');
  }
  if (lit) await p.evaluate(() => BridgeLit._force(null));
  await b.close();
  process.exit(errs ? 1 : 0);
})();
