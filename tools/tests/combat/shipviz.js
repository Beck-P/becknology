// Ships as fitted (js/shipkit.js): a galleon and a cutter with guns and fittings out at sea - each heading she's drawn
// at, by night and by day - then a broadside at a pirate (muzzle flashes, smoke, recoil, shots, splashes and hits),
// her ships lying at the pier, and the harbourmaster's card with her portrait. node combat/shipviz.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const FLEET = {
  ships: [{ id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: ['sheathing', 'moon_lantern'] },
          { id: 'galleon1', type: 'galleon', name: 'Old Faithful', at: 'lumar-tern', hull: 1, hold: {}, fits: ['sheathing', 'oak', 'storm_rig', 'moon_lantern'],
            guns: ['long_nine', 'carronade', 'moon_harpoon', 'chaser', 'swivel'] },
          { id: 'cutter1', type: 'cutter', name: 'Swift', at: 'lumar-tern', hull: 1, hold: {}, guns: ['swivel'], fits: ['roseite', 'crystal_sails'] },
          { id: 'raider1', type: 'raider', name: 'Red Gull', at: 'lumar-tern', hull: 1, hold: {}, guns: ['carronade', 'carronade', 'long_nine', 'chaser'], fits: ['storm_rig', 'oak'] },
          { id: 'brig1', type: 'brigantine', name: 'Good Hope', at: 'lumar-tern', hull: 1, hold: {}, guns: ['long_nine', 'long_nine', 'long_nine'], fits: ['roseite', 'sheathing'] }],
  sailing: 'galleon1', n: 5, crew: [], cn: 0, hired: {}, rescued: true
};
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript((F) => {
    localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1');
    if (!sessionStorage.getItem('fleet_set')) { localStorage.setItem('bridge_fleet', JSON.stringify(F)); sessionStorage.setItem('fleet_set', '1'); }
    // (the wire's handlers, kept as they're registered, so the crew's side of a fight can be played in this one page)
    let net;
    Object.defineProperty(window, 'BridgeNet', { configurable: true, get() { return net; }, set(v) {
      net = v; window.__netH = {};
      const on = v.on; v.on = function (e, f) { (window.__netH[e] = window.__netH[e] || []).push(f); return on.apply(v, arguments); };
    } });
  }, FLEET);
  const at = process.env.AT || '2026-10-16T07:20';                                 // Lumar's night (its 8-hour day)
  await p.goto('http://127.0.0.1:8766/bridge/?at=' + at); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 100000; BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
    BridgeProgression.wagerCoins = (n) => Promise.resolve({ ok: true, balance: window._coins -= n }); });
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-tern', () => {
    const d = BridgeWorld.getWorld().interactions.find(i => i.type === 'go_sailing');
    BridgeState.transition('world', { worldId: 'lumar-tern', spawn: d ? { x: d.x, y: d.y - 1 } : null }); r();
  })));
  await p.waitForTimeout(3500);
  // the fleet at the pier, and each ship's card in the harbourmaster's book (her portrait as she's fitted)
  await p.screenshot({ path: `${SHOTS}/shipviz_pier.png` });
  await p.evaluate(() => BridgeClock._at('2026-10-16T12:00')); await p.waitForTimeout(1500);   // and by day (Lumar's noon)
  await p.screenshot({ path: `${SHOTS}/shipviz_pier_day.png` });
  await p.evaluate((at) => BridgeClock._at(at), at); await p.waitForTimeout(800);
  for (const id of ['galleon1', 'cutter1', 'gull']) {
    await p.evaluate((id) => BridgeHarbour.card('lumar-tern', BridgeFleet.get(id)), id);
    await p.waitForTimeout(900);
    const art = await p.evaluate(() => { const c = document.querySelector('.wd-art'); return c ? [c.width, c.height, c.style.width] : null; });
    console.log('card', id, 'portrait', JSON.stringify(art));
    if (!art || art[0] < 40) { errs++; console.log('no portrait on', id + '\'s card'); }
    await p.screenshot({ path: `${SHOTS}/shipviz_card_${id}.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }

  const sail = async (id) => {
    await p.evaluate((id) => BridgeFleet.sail(id), id);
    await p.evaluate(() => BridgeSloop.start('lumar-tern', null, { aboard: true }));
    for (let i = 0; i < 60 && (await p.evaluate(() => BridgeSloop._phase())) !== 'sail'; i++) await p.waitForTimeout(300);
    const w = await p.evaluate(() => { const a = BridgeVoyage._isles['lumar-tern'], c = BridgeVoyage._isles['lumar']; return BridgeSloop._toWorld((a.x + c.x) / 2, (a.y + c.y) / 2); });
    await p.evaluate((w) => { const bt = BridgeSloop._boat(); bt.x = w.x; bt.r = w.r; bt.v = 0; BridgeSloop._snap(); }, w);
    await p.waitForTimeout(1200);
  };
  const stop = async () => { await p.evaluate(() => BridgeSloop.stop()); await p.waitForTimeout(2500); };
  // where she is on the screen (a clip round her, her masts above)
  const around = (w, h) => p.evaluate(([w, h]) => {
    const bt = BridgeSloop._boat(), cm = BridgeSloop._cam(), cv = document.getElementById('sloop-canvas'), z = cv.width / cm.W;
    const X = (bt.x * 32 - cm.x) * z, Y = (bt.r * 32 - cm.y) * z - h * 0.2;
    return { x: Math.max(0, Math.min(cv.width - w, Math.round(X - w / 2))), y: Math.max(0, Math.min(cv.height - h, Math.round(Y - h / 2))), width: w, height: h };
  }, [w, h]);

  // each heading, sails up: every 45 degrees
  await sail('galleon1');
  console.log('out on the', await p.evaluate(() => { const bt = BridgeSloop._boat(); return BridgeSloop._sea(bt.x, bt.r); }), 'sea');
  for (let k = 0; k < 8; k++) {
    await p.evaluate((k) => { const bt = BridgeSloop._boat(); bt.h = k * Math.PI / 4; bt.v = 0; BridgeSloop._snap(); }, k);
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/shipviz_galleon_h${k}.png`, clip: await around(760, 680) });
  }
  // every frame of the next second or so caught in the page (a screenshot takes longer than a muzzle flash lasts), after
  // `setup` (a string run in the page) - written as <name>_00.png ...
  const film = async (name, setup, n) => {
    const frames = await p.evaluate(([setup, n]) => new Promise((res) => {
      (0, eval)(setup);
      const cv = document.getElementById('sloop-canvas'), out = [], t0 = performance.now(), sc = document.createElement('canvas');
      sc.width = 800; sc.height = 560; const g = sc.getContext('2d');
      (function grab(now) {
        g.drawImage(cv, 240, 160, 800, 560, 0, 0, 800, 560);
        out.push([Math.round(now - t0), sc.toDataURL('image/png')]);
        if (now - t0 < 1600 && out.length < n) requestAnimationFrame(grab); else res(out);
      })(t0);
    }), [setup, n || 36]);
    frames.forEach(([ms, d], i) => require('fs').writeFileSync(`${SHOTS}/${name}_${String(i).padStart(2, '0')}.png`, Buffer.from(d.split(',')[1], 'base64')));
    console.log(name, 'frames', frames.length, 'over', frames[frames.length - 1][0], 'ms');
  };
  const lieTo = async (h) => { await p.evaluate((h) => { const bt = BridgeSloop._boat(); bt.h = h; bt.v = 0; bt.reef = 0; BridgeSloop._snap(); BridgeSeaFight._foes().length = 0; }, h); await p.waitForTimeout(1500); };

  // a broadside: a pirate raider lying abeam, our guns loaded; then the smoke drifting off
  await lieTo(0);
  await film('shipviz_fire', `var bt = BridgeSloop._boat(); BridgeSeaFight._spawn('raider');
    var o = BridgeSeaFight._foes()[0]; o.state = 'fight'; o.x = bt.x + 0.5; o.r = bt.r + 4.6; o.h = 0; o.hp = 400; o.max = 400;`);
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/shipviz_smoke_${i}.png`, clip: { x: 240, y: 160, width: 800, height: 560 } });
  }
  const fired = await p.evaluate(() => Object.keys(BridgeSloop._boat().__fired || {}).length), kit = await p.evaluate(() => BridgeShipKit.kitOf(BridgeSloop._boat()).mounts.length);
  console.log('guns mounted', kit, '· guns that fired', fired, '· foe hp after the broadside', await p.evaluate(() => BridgeSeaFight._foes().map(o => Math.round(o.hp)).join(',')));
  if (kit !== 5 || fired < 3) { errs++; console.log('the broadside: expected 5 guns and at least 3 firing'); }
  // a drowned ship on the other side: its ghostfire at us (green flashes, green fire), the moonglass harpoon's bolts back
  await lieTo(Math.PI);
  await film('shipviz_drowned', `var bt = BridgeSloop._boat(); BridgeSeaFight._spawn('drowned');
    var o = BridgeSeaFight._foes()[0]; o.state = 'hunt'; o.x = bt.x - 0.5; o.r = bt.r + 5; o.h = Math.PI; o.hp = 400; o.max = 400;
    o.guns.forEach(function (g) { g.t = 0; });`);
  // what a shot does where it comes down, one of each: a splash, a hit, green fire, moonglass
  await lieTo(0);
  await film('shipviz_burst', `var bt = BridgeSloop._boat();
    BridgeSeaFight._burst('splash', bt.x - 2, bt.r + 3.2, 1); BridgeSeaFight._burst('splash', bt.x + 2.5, bt.r + 3.4, 2.2);
    BridgeSeaFight._burst('hit', bt.x - 0.5, bt.r + 1, 1); BridgeSeaFight._burst('ghosthit', bt.x + 1.5, bt.r + 1, 1);`, 24);
  await p.evaluate(() => { BridgeSeaFight._foes().length = 0; });
  await stop();

  // crewing for someone else (sailing together): their galleon as they've fitted her (`sail-go` kit), and their broadside
  // as their game sends it (`sf`: a shot from each gun, with its gun and side) - her guns jump and flash here too
  const crewKit = 'long_nine,carronade,moon_harpoon,chaser,swivel|sheathing,oak,storm_rig,moon_lantern';
  await p.evaluate((kit) => BridgeSloop.start('lumar-tern', null, { crew: { id: 'cap', name: 'ALYSSA', suit: 'purple', type: 'galleon', shipName: 'Old Faithful', kit: kit } }), crewKit);
  for (let i = 0; i < 40 && (await p.evaluate(() => BridgeSloop._phase())) === 'load'; i++) await p.waitForTimeout(300);
  const at2 = await p.evaluate(() => { const a = BridgeVoyage._isles['lumar-tern'], c = BridgeVoyage._isles['lumar']; return BridgeSloop._toWorld((a.x + c.x) / 2, (a.y + c.y) / 2); });
  const helm = (w) => p.evaluate((w) => (window.__netH.helm || []).forEach((f) => f({ x: w.x, r: w.r, h: 0, v: 0, sheet: 1, boom: 0.3, side: 1, heel: 0, hoist: 0.1, rudder: 0, eff: 0, off: 2, ph: 'sail', pt: 9000, wn: 1.6, ws: 0.6 }, 'cap')), w);
  for (let i = 0; i < 16; i++) { await helm(at2); await p.waitForTimeout(450); }      // (her camera leaves the quay over six seconds)
  await p.evaluate(() => BridgeSloop._snap()); await helm(at2); await p.waitForTimeout(600);
  await film('shipviz_crew', `var bt = BridgeSloop._boat(), sh = function (gi, side, dx) { var M = BridgeShipKit.muzzle(bt, gi, side);
      return [M.x, M.r, bt.x + dx, bt.r + 4.6, 0.35, 0, gi === 2 ? 1 : 0, 0, gi, side, 0, M.z]; };
    (window.__netH.sf || []).forEach(function (f) { f({ hull: 1, f: [[7, 'raider', bt.x + 0.5, bt.r + 4.6, 0, 0, 90, 105, 'fight', 0, 0, 0.5, 1, 1, 0, 0]],
      s: [sh(2, 1, -1), sh(0, 1, 0), sh(1, 1, 0.6), sh(4, 1, 1.2)] }, 'cap'); });`, 20);
  const crewFired = await p.evaluate(() => Object.keys(BridgeSloop._boat().__fired || {}).length);
  console.log('crewing: her kit', await p.evaluate(() => BridgeShipKit.kitOf(BridgeSloop._boat()).guns.length), 'guns · guns seen firing', crewFired);
  if (crewFired !== 4) { errs++; console.log('the crew should see her 4 guns fire'); }
  await stop();

  // the sloop with her moon lantern, out on the Midnight Sea: its light on the water round her
  await sail('gull');
  await p.evaluate(() => { const c = BridgeVoyage._isles['lumar-midnight'], w = BridgeSloop._toWorld(c.x, c.y), bt = BridgeSloop._boat(); bt.x = w.x + 6; bt.r = w.r + 34; bt.v = 0; bt.reef = 0; bt.h = 0.4; BridgeSloop._snap(); });
  await p.waitForTimeout(2500);
  console.log('the sloop out on the', await p.evaluate(() => { const bt = BridgeSloop._boat(); return BridgeSloop._sea(bt.x, bt.r); }), 'sea');
  await p.screenshot({ path: `${SHOTS}/shipviz_moonlantern.png`, clip: await around(560, 480) });
  await stop();

  for (const id of ['cutter1', 'raider1', 'brig1']) {
    await sail(id);
    for (const k of [1, 3, 6]) {
      await p.evaluate((k) => { const bt = BridgeSloop._boat(); bt.h = k * Math.PI / 4; bt.v = 0; BridgeSloop._snap(); }, k);
      await p.waitForTimeout(350);
      await p.screenshot({ path: `${SHOTS}/shipviz_${id}_h${k}.png`, clip: await around(560, 520) });
    }
    await stop();
  }
  console.log('errors:', errs);
  await b.close();
})();
