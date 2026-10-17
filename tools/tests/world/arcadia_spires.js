// The Spires (Arcadia L480; scenes/arcadia_spires.py and its rooms, js/spires.js): the hub walked west to east and shot —
// the sky gardens and the tea salon, the crown plaza, the opera's steps, the sky docks — the backdrop (stars over the smog
// sea, js/skyline.js mode 'spires'), the tea salon's counter, the telescope's view, every room through its door and back
// (LUMEN and its collection, the Lyra and the stage from a box, Aurelle, the Orrery's door turning you away then letting a
// member in), the Spire Express down and the air cab, the crowd in its own wardrobe, the two happenings. Shots in OUT
// (`spires_*.png`).
const { chromium } = require('playwright');
const OUT = process.argv[2] || __dirname + '/../shots';
const BASE = 'http://127.0.0.1:8766/';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errors = 0;
  p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) { errors++; console.log('console', m.text().slice(0, 200)); } });
  p.on('response', r => { if (r.status() >= 400 && /\/bridge\//.test(r.url())) { errors++; console.log('missing', r.status(), r.url()); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto(BASE); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeSpires._reset(); });
  const go = (w, at) => p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : null }); r(); })), [w, at]);
  const where = () => p.evaluate(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY()]);
  const use = (pred) => p.evaluate((src) => { const f = new Function('i', 'return ' + src); const it = BridgeWorld.getWorld().interactions.find(f); if (it) BridgeInteractions.execute(it); return it && it.label; }, pred);
  const dialog = () => p.evaluate(() => { const d = document.querySelector('#world-overlay .wd-title'); const t = document.querySelector('#world-overlay .wd-text'); return d ? d.textContent + ' | ' + (t ? t.textContent.slice(0, 90) : '') : null; });
  const close = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(350); };
  const waitFor = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(250); } return false; };
  const shot = (n) => p.screenshot({ path: `${OUT}/spires_${n}.png` });

  // ---- the hub, west to east ----
  await go('arcadia-spires'); await p.waitForTimeout(3500);
  console.log('arrived at', JSON.stringify(await where()), 'skyline mode', await p.evaluate(() => BridgeWorld.getWorld().skyline.mode));
  for (const [n, at] of [['plaza', [40, 12]], ['fountain', [47, 27]], ['gardens', [15, 24]], ['tea', [9, 11]], ['opera_steps', [72, 12]],
                         ['docks', [76, 36]], ['edge', [47, 37]]]) {
    await go('arcadia-spires', at); await p.waitForTimeout(1800); await shot(n);
  }
  console.log('crowd here', await p.evaluate(() => BridgeCrowd._count ? BridgeCrowd._count('arcadia-spires') : null),
              'wardrobe', await p.evaluate(() => BridgeCrowd._place ? (BridgeCrowd._place() || {}).wardrobe : null));
  await go('arcadia-spires', [9, 11]); await p.waitForTimeout(1200);
  console.log('tea salon:', await use("i.label === 'THE TEA SALON'")); await p.waitForTimeout(500); console.log(' ', await dialog()); await shot('tea_menu'); await close();
  await go('arcadia-spires', [47, 37]); await p.waitForTimeout(1200);
  console.log('telescope:', await use("i.label === 'TELESCOPE'")); await p.waitForTimeout(1800); await shot('telescope');
  await p.keyboard.press('Escape'); await p.waitForTimeout(900);

  // ---- the rooms, through their doors and back ----
  for (const [label, wid] of [['LUMEN', 'arcadia-boutique'], ['THE LYRA', 'arcadia-opera'], ['AURELLE', 'arcadia-champagne']]) {
    await go('arcadia-spires');
    await p.waitForTimeout(1200);
    await use(`i.label === '${label}'`);
    await waitFor(() => !document.getElementById('landing-overlay') || getComputedStyle(document.getElementById('landing-overlay')).opacity === '0', 4000);
    await p.waitForTimeout(2600);
    console.log(label, '->', JSON.stringify(await where()));
    await shot(wid.replace('arcadia-', 'room_'));
    if (wid === 'arcadia-boutique') { await use("i.type === 'implants'"); await p.waitForTimeout(500); console.log(' collection:', await dialog()); await shot('lumen_collection'); await close(); }
    if (wid === 'arcadia-opera') { await use("i.label === 'THE BOXES'"); await p.waitForTimeout(1800); await shot('opera_box'); await p.keyboard.press('Escape'); await p.waitForTimeout(900); }
    if (wid === 'arcadia-champagne') { await use("i.label === 'THE GLASS'"); await p.waitForTimeout(1800); await shot('aurelle_glass'); await p.keyboard.press('Escape'); await p.waitForTimeout(900); }
    await use("i.type === 'leave_world'");
    await waitFor(() => BridgeWorld.getWorldId() === 'arcadia-spires', 6000);
    await p.waitForTimeout(800);
    console.log(' back out at', JSON.stringify(await where()));
  }
  // the Orrery: turned away at the grille, then in once you're a member
  await go('arcadia-spires'); await p.waitForTimeout(1200);
  await use("i.type === 'orrery_door'"); await p.waitForTimeout(500);
  console.log('orrery, not a member:', await dialog()); await shot('orrery_door'); await close();
  await p.evaluate(() => localStorage.setItem('bridge_spires', JSON.stringify({ member: true, how: 'test' })));
  await use("i.type === 'orrery_door'");
  await waitFor(() => BridgeWorld.getWorldId() === 'arcadia-members', 6000); await p.waitForTimeout(2600);
  console.log('orrery, a member ->', JSON.stringify(await where())); await shot('room_members');
  await use("i.type === 'leave_world'"); await waitFor(() => BridgeWorld.getWorldId() === 'arcadia-spires', 6000);

  // ---- getting away: the Spire Express's floors, the air cab's pads ----
  await go('arcadia-spires'); await p.waitForTimeout(1200);
  console.log('spire express:', await use("i.type === 'express_lift' && i.shaft === 'spire'")); await p.waitForTimeout(500);
  console.log(' offers', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.wd-chooser .wd-sell-row .sp-name')].map(e => e.textContent))));
  await close();
  await go('arcadia-spires', [70, 35]); await p.waitForTimeout(1200);
  console.log('air cab:', await use("i.type === 'air_cab'")); await p.waitForTimeout(500);
  console.log(' offers', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.wd-chooser .wd-sell-row .sp-name')].map(e => e.textContent))));
  await close();

  // ---- the happenings ----
  for (const ev of ['operaout', 'fireworks']) {
    await go('arcadia-spires', ev === 'operaout' ? [71, 16] : [78, 38]); await p.waitForTimeout(1200);
    await p.evaluate((ev) => BridgeEvents._force(ev, 40), ev); await p.waitForTimeout(2500);
    console.log('happening', ev, JSON.stringify(await p.evaluate(() => BridgeEvents._running().map(e => e.id || e))));
    await shot('event_' + ev);
    await p.evaluate(() => BridgeEvents._clear());
  }
  console.log('event check', JSON.stringify(await p.evaluate(() => (BridgeEvents._check() || []).filter(s => /spires|operaout|fireworks/.test(JSON.stringify(s))))));
  console.log('errors', errors);
  await b.close();
})();
