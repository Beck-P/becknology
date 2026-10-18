// The District grown out: Lantern Row (the old quarter) and its roof shrine, and the spaceport — their ways back to the
// street, each place walked and shot, the goldfish scoop and the shrine's fortunes, the Loop's stations,
// the Core Express and the air cab rank wired to js/transit.js, their happenings (sky lanterns, a freighter lifting off),
// the crowds out. node world/arcadia_district.js [shots]
const { chromium } = require('playwright');
const fs = require('fs');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  p.on('response', r => { if (r.status() === 404 && /\/bridge\//.test(r.url())) { errs++; console.log('MISSING', r.url()); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T21:30'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 500; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); }; });
  const ev = (f, a) => p.evaluate(f, a);
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: { x: a[1], y: a[2] } }); r(); })), [w, x, y]);
  const here = () => ev(() => [BridgeWorld.getWorldId(), BridgeCharacter.getX(), BridgeCharacter.getY()]);
  const settle = (ms) => p.waitForTimeout(ms || 2500);
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 220) : 'none'; });
  const close = async () => { for (let i = 0; i < 4 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const exec = (label) => ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l); if (!i) return false; BridgeInteractions.execute(i); return true; }, label);
  const walkable = (x, y) => ev((a) => { const w = BridgeWorld.getWorld(); return !w.collisions[a[1]][a[0]]; }, [x, y]);

  // ---- the ways back to the street (the street's own edges are wired once its rebuild lands) ------------------------
  await go('arcadia-oldquarter', 62, 11); await settle();
  await p.screenshot({ path: SHOTS + '/district_lanternrow_arrive.png' });
  console.log('lantern row -> street', await exec('THE NEON STREET')); await settle(2200);
  console.log('back ->', await here());
  await go('arcadia-spaceport', 1, 11); await settle();
  await p.screenshot({ path: SHOTS + '/district_spaceport_arrive.png' });
  console.log('spaceport -> street', await exec('THE NEON STREET')); await settle(2200);
  console.log('back ->', await here());

  // ---- Lantern Row, walked end to end, its people and things ---------------------------------------------------------
  await go('arcadia-oldquarter', 33, 11); await settle(3500);
  for (const [x, y, name] of [[6, 11, 'west'], [22, 12, 'ramen'], [33, 11, 'station'], [46, 12, 'jizo'], [58, 12, 'east'], [30, 16, 'promenade']]) {
    console.log('lantern row', name, [x, y], 'walkable', await walkable(x, y));
    await go('arcadia-oldquarter', x, y); await settle(1800);
    await p.screenshot({ path: SHOTS + '/district_lanternrow_' + name + '.png' });
  }
  for (const l of ['GRANNY UME', 'THE LANTERN MAKER', 'OLD HOSHI', 'MAMA KEIKO']) {
    await exec(l); await settle(600); console.log('talk', l, '->', (await dialog()).slice(0, 90)); await close();
  }
  await go('arcadia-oldquarter', 5, 13); await settle(1200);
  await exec('GOLDFISH SCOOP'); await settle(500);
  for (let i = 0; i < 4; i++) {
    await ev(() => { const r = document.querySelector('.world-dialog .wd-sell-row.pick'); if (r) r.click(); }); await settle(500);
    console.log('goldfish try', i, '->', (await dialog()).slice(0, 80)); await close(); await exec('GOLDFISH SCOOP'); await settle(400);
  }
  await close();
  console.log('goldfish caught', await ev(() => BridgeInventory.getCount('goldfish_bag')), 'coins', await ev(() => window._coins));
  console.log('loop station type', await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.type === 'loop_station'); return i && i.station; }),
              'loop track', JSON.stringify(await ev(() => BridgeWorld.getWorld().loop)));
  console.log('crowd out here', await ev(() => typeof BridgeCrowd !== 'undefined' && BridgeCrowd._count ? BridgeCrowd._count('arcadia-oldquarter') : 'n/a'));
  await ev(() => BridgeEvents._force('skylanterns', 40)); await settle(3500);
  await p.screenshot({ path: SHOTS + '/district_event_skylanterns.png' });
  console.log('skylanterns running', JSON.stringify(await ev(() => BridgeEvents._running())));
  await ev(() => BridgeEvents._clear());

  // ---- up the stair to the roof shrine and down again ----------------------------------------------------------------
  await go('arcadia-oldquarter', 8, 9); await settle();
  console.log('shrine steps', await exec('SHRINE STEPS')); await settle(2500);
  console.log('up ->', await here());
  await p.screenshot({ path: SHOTS + '/district_shrine.png' });
  await exec('OFFERING BOX'); await settle(500);
  await ev(() => { const r = document.querySelector('.world-dialog .wd-sell-row.pick'); if (r) r.click(); }); await settle(600);
  console.log('fortune ->', (await dialog()).slice(0, 160)); await close();
  await exec('KANNA'); await settle(500); console.log('talk KANNA ->', (await dialog()).slice(0, 90)); await close();
  console.log('stairs down', await exec('STAIRS DOWN')); await settle(2200);
  console.log('down ->', await here());

  // ---- the spaceport --------------------------------------------------------------------------------------------------
  for (const [x, y, name] of [[4, 11, 'customs'], [25, 11, 'core'], [41, 11, 'station'], [12, 24, 'oldmercy'], [36, 22, 'halcyon'], [56, 21, 'cabs'], [66, 26, 'slowhazard']]) {
    console.log('spaceport', name, [x, y], 'walkable', await walkable(x, y));
    await go('arcadia-spaceport', x, y); await settle(1800);
    await p.screenshot({ path: SHOTS + '/district_spaceport_' + name + '.png' });
  }
  for (const l of ['INSPECTOR HALLORAN', 'BRANNIGAN', 'CAPTAIN DESH']) {
    await exec(l); await settle(600); console.log('talk', l, '->', (await dialog()).slice(0, 90)); await close();
  }
  console.log('transit here', JSON.stringify(await ev(() => BridgeWorld.getWorld().interactions.filter(x => /express_lift|loop_station|air_cab/.test(x.type))
    .map(x => [x.type, x.shaft || x.station || x.pad, x.lobby || '', x.x, x.y]))));
  await go('arcadia-spaceport', 25, 10); await settle(1500);
  await exec('CORE EXPRESS'); await settle(800);
  console.log('core express ->', (await dialog()).slice(0, 160)); await close();
  await go('arcadia-spaceport', 57, 18); await settle(1500);
  await exec('AIR CAB'); await settle(800);
  console.log('air cab ->', (await dialog()).slice(0, 160)); await close();
  await go('arcadia-spaceport', 36, 25); await settle(1500);
  await ev(() => BridgeEvents._force('liftoff', 30)); await settle(3500);
  await p.screenshot({ path: SHOTS + '/district_event_liftoff.png' });
  await ev(() => BridgeEvents._clear());
  console.log('crowd out here', await ev(() => typeof BridgeCrowd !== 'undefined' && BridgeCrowd._count ? BridgeCrowd._count('arcadia-spaceport') : 'n/a'));

  // ---- a phone ------------------------------------------------------------------------------------------------------
  await p.setViewportSize({ width: 390, height: 760 }); await settle(800);
  await go('arcadia-oldquarter', 22, 11); await settle(2500);
  await p.screenshot({ path: SHOTS + '/district_phone_lanternrow.png' });
  console.log('errors', errs);
  await b.close();
})();
