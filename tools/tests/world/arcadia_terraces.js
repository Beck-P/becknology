// The Mid-Levels' Terraces (arcadia-terraces), Moonglow (arcadia-jazz) and the Atrium (arcadia-atrium): each loads and
// is shot whole and close up; walk the deck from the skybridge to the station and out onto Cirrus; every door both ways;
// the Spire Express and the cab rank offer their stops; a seat at Halo and at Moonglow; people at the bar talk; the
// proposal and the jam happenings forced and shot. Shots in OUT (`terraces_*.png`).
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname + '/../shots';
const BASE = 'http://127.0.0.1:8766/';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) { errors++; console.log('console', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto(BASE); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const go = (w, at) => p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : null }); r(); })), [w, at]);
  const where = () => p.evaluate(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY()]);
  const use = (pred) => p.evaluate((src) => { const f = new Function('i', 'return ' + src); const it = BridgeWorld.getWorld().interactions.find(f); if (it) BridgeInteractions.execute(it); return it && it.label; }, pred);
  const close = () => p.keyboard.press('Escape');
  const rows = () => p.evaluate(() => [...document.querySelectorAll('.wd-chooser .wd-sell-row')].map(e => e.querySelector('.sp-name').textContent));
  const text = () => p.evaluate(() => { const d = document.querySelector('#world-overlay .wd-text, #world-overlay .wd-body'); return d ? d.textContent.slice(0, 120) : ''; });
  const waitWorld = async (id) => { for (let i = 0; i < 40; i++) { if ((await where())[0] === id) return true; await p.waitForTimeout(250); } return false; };
  const walkable = (x, y) => p.evaluate(([x, y]) => !BridgeWorld.getWorld().collisions[y][x], [x, y]);
  const teleport = (x, y) => p.evaluate(([x, y]) => BridgeCharacter.setPosition ? BridgeCharacter.setPosition(x, y) : BridgeWorld.show({ x, y }), [x, y]);

  // ---- the Terraces: the whole hub, then close views ----
  await go('arcadia-terraces'); await p.waitForTimeout(3000);
  console.log('terraces at', JSON.stringify(await where()), 'scene', await p.evaluate(() => !!BridgeScene.get('arcadia-terraces')));
  for (const [name, x, y] of [['bridge', 2, 19], ['atrium', 31, 14], ['lobby', 45, 12], ['station', 73, 10], ['halo', 14, 31], ['lumen', 35, 31],
    ['cirrus', 58, 34], ['pad', 79, 31], ['east', 84, 22]]) {
    console.log(name, 'walkable', await walkable(x, y));
    await go('arcadia-terraces', [x, y]); await p.waitForTimeout(1600);
    await p.screenshot({ path: `${OUT}/terraces_${name}.png` });
  }
  // the Spire Express and the cab rank: their stops (whatever's built)
  await go('arcadia-terraces', [43, 12]); await p.waitForTimeout(1200);
  console.log('spire express:', await use("i.type === 'express_lift' && i.shaft === 'spire'")); await p.waitForTimeout(600);
  console.log('  offers', JSON.stringify(await rows())); await close(); await p.waitForTimeout(400);
  console.log('cab rank:', await use("i.type === 'air_cab'")); await p.waitForTimeout(600);
  console.log('  offers', JSON.stringify(await rows()), JSON.stringify(await text())); await close(); await p.waitForTimeout(400);
  console.log('loop:', await use("i.type === 'loop_station'")); await p.waitForTimeout(600);
  console.log('  offers', JSON.stringify(await rows()), JSON.stringify(await text())); await close(); await p.waitForTimeout(400);
  // people and a vendor
  for (const lab of ['NADIA', 'CHEF BASTIEN', 'HIRO', 'DOVE', 'THE LIFT ATTENDANT']) {
    await use(`i.label === '${lab}'`); await p.waitForTimeout(500);
    console.log('talk', lab, JSON.stringify(await p.evaluate(() => { const t = document.querySelector('#world-overlay .wd-title'); return t ? t.textContent : null; })));
    if (lab === 'NADIA') await p.screenshot({ path: `${OUT}/terraces_talk.png` });
    await close(); await p.waitForTimeout(300);
  }
  await use("i.label === 'CIRRUS BAR'"); await p.waitForTimeout(500);
  console.log('cirrus menu', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#world-overlay .sp-name, #world-overlay .vd-name')].map(e => e.textContent))));
  await close(); await p.waitForTimeout(300);
  // a seat at Halo (actions.json)
  const seat = await p.evaluate(() => BridgeWorld.getWorld().interactions.filter(i => i.label === 'HALO TABLE').length);
  console.log('halo seats', seat);
  // the happening on Halo's deck
  await go('arcadia-terraces', [16, 34]); await p.waitForTimeout(1200);
  await p.evaluate(() => BridgeEvents._force('proposal', 30)); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/terraces_proposal.png` });
  await p.evaluate(() => BridgeEvents._clear());

  // ---- through the doors: Moonglow, back; the Atrium, back; the skybridge to Skyport 7, back ----
  for (const [lab, dest, back] of [['MOONGLOW', 'arcadia-jazz', 'THE TERRACES'], ['THE ATRIUM', 'arcadia-atrium', 'THE TERRACES'],
    ['SKYBRIDGE · SKYPORT 7', 'arcadia-skypad', null]]) {
    await go('arcadia-terraces'); await p.waitForTimeout(1200);
    await use(`i.label === '${lab}'`);
    const ok = await waitWorld(dest); await p.waitForTimeout(2200);
    console.log('through', lab, '->', JSON.stringify(await where()), ok);
    await p.screenshot({ path: `${OUT}/terraces_in_${dest}.png` });
    if (back) {
      await use(`i.label === '${back}'`); await waitWorld('arcadia-terraces'); await p.waitForTimeout(800);
      console.log('  and back out at', JSON.stringify(await where()));
    }
  }
  // Moonglow inside: the band, a table, the jam
  await go('arcadia-jazz'); await p.waitForTimeout(2500);
  for (const lab of ['ODETTE', 'SOL', 'RAY', 'MINGO']) {
    await use(`i.label === '${lab}'`); await p.waitForTimeout(400);
    console.log('talk', lab, JSON.stringify(await p.evaluate(() => { const t = document.querySelector('#world-overlay .wd-title'); return t ? t.textContent : null; })));
    await close(); await p.waitForTimeout(300);
  }
  console.log('moonglow seats', await p.evaluate(() => BridgeWorld.getWorld().interactions.filter(i => i.action === 'sit').length));
  await go('arcadia-jazz', [7, 8]); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/terraces_jazz.png` });
  await p.evaluate(() => BridgeEvents._force('jam', 20)); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/terraces_jam.png` });
  await p.evaluate(() => BridgeEvents._clear());
  console.log('theme', await p.evaluate(() => typeof BridgeAudio !== 'undefined' && BridgeAudio.themeFor ? JSON.stringify(BridgeAudio.themeFor('arcadia-jazz')) : 'n/a'));
  // the Atrium inside
  await go('arcadia-atrium'); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/terraces_atrium.png` });
  await go('arcadia-atrium', [16, 8]); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/terraces_atrium_up.png` });
  await use("i.label === 'IRIS'"); await p.waitForTimeout(400);
  console.log('talk IRIS', JSON.stringify(await p.evaluate(() => { const t = document.querySelector('#world-overlay .wd-title'); return t ? t.textContent : null; })));
  await close();
  // a phone
  await p.setViewportSize({ width: 390, height: 760 }); await p.waitForTimeout(500);
  await go('arcadia-terraces', [58, 34]); await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/terraces_phone.png` });
  console.log('errors', errors);
  await b.close();
})();
