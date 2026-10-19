// Lumar's harbours at work (js/harbourlife.js, js/sloop.js, js/events.js): on every harbour island, the fishing fleet at
// its berths by night, casting off at dawn, gone by day and coming home at dusk (Lumar's own clock: 8-hour days from
// 0:00, 8:00 and 16:00 ET); the catch auction due on each fishing quay as they come in; a merchantman alongside the
// crane and the crane swinging her cargo ashore; the quay's work by day. At sea: the grounds empty by night, the fleet
// on them by day and steaming home at dusk; and each sea's boats in their own colours. Screenshots: harbour_*.png.
// node world/harbours.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const DAY = '2026-10-17T00:00';                                      // a Lumar day starts at ET midnight
const ISLES = ['lumar', 'lumar-crown', 'lumar-tern', 'lumar-holm', 'lumar-sapphire', 'lumar-rose', 'lumar-crimson'];
const AUCTIONS = { 'lumar': 'auction_diggen', 'lumar-crown': 'auction_crown', 'lumar-tern': 'auction', 'lumar-sapphire': 'auction_sapphire', 'lumar-rose': 'auction_rose', 'lumar-crimson': 'auction_crimson' };
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  const bad = (m) => { errs++; console.log('FAILED', m); };
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=' + DAY); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeWeather._pin('lumar', 'fair'); });   // (no rain: the quay at work)
  const ev = (f, a) => p.evaluate(f, a);
  const shot = (n) => p.screenshot({ path: `${SHOTS}/harbour_${n}.png` });
  const at = (ms) => ev((ms) => { BridgeClock._at(ms); BridgeEvents._clear(); }, ms);   // (_clear: the events look again, the clock having gone back)
  const et = (ms) => new Date(ms - 4 * 3600000).toISOString().slice(0, 16);  // (EDT, for reading)

  // the quay's spots, and the events' (the auctions among them)
  const qp = await ev(() => BridgeHarbourLife._check());
  console.log('harbour spots check: errors ' + qp.length + (qp.length ? ' — ' + qp.join('; ') : ''));
  if (qp.length) errs += qp.length;
  const ep = await ev(() => BridgeEvents._check());
  console.log('events check: errors ' + ep.length + (ep.length ? ' — ' + ep.join('; ') : ''));
  if (ep.length) errs += ep.length;

  // the day: sunrise and sunset by Lumar's clock, and the fleet as a whole through it
  const D = await ev(() => { const d = BridgeHarbourLife.dayOf(BridgeClock.now()); return d; });
  const t0 = D.start, rise = D.start + D.sunrise, set = D.start + D.sunset;
  console.log('Lumar day from', et(t0), 'sunrise', et(rise), 'sunset', et(set));
  const phases = await ev(([t0, len]) => { const out = []; for (let k = 0; k < 48; k++) { const f = BridgeHarbourLife.fleet(t0 + k * len / 48); if (!out.length || out[out.length - 1][1] !== f.phase) out.push([k, f.phase]); } return out; }, [t0, D.len]);
  console.log('the fleet through the day:', JSON.stringify(phases));
  if (phases.map(x => x[1]).join(',') !== 'home,leaving,out,returning,home') bad('the fleet\'s day is out of order: ' + JSON.stringify(phases));

  const go = async (id) => {
    await ev((id) => new Promise(r => BridgeWorld.load(id, () => {
      const d = BridgeWorld.getWorld().interactions.find(i => i.type === 'go_sailing' || i.label === 'DOCK');
      BridgeState.transition('world', { worldId: id, spawn: d ? { x: d.x, y: d.y - 1 } : null }); r();
    })), id);
    await p.waitForTimeout(2600);
    // the berths are laid out once the island's shore and the boat sheet are in (a big render takes a few seconds more)
    for (let k = 0; k < 60 && !(await ev((id) => !!BridgeSloop.harbour(id), id)); k++) await p.waitForTimeout(250);
  };
  const boats = (id) => ev((id) => BridgeSloop._harbourAt(id), id);
  const count = (L, st) => (L || []).filter(o => o.kind !== 'm_brig' && o.kind !== 'm_cutter' && (!st || o.state === st)).length;
  // put the camera on a point (tiles) and hold it there
  const look = async (x, y) => { await ev(([x, y]) => { BridgeCharacter.setHidden(true); BridgeWorld.setMode({ solo: true, focus: () => ({ x: x, y: y }), update: () => {}, end: () => BridgeCharacter.setHidden(false) }); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, [x, y]); await p.waitForTimeout(600); };

  for (const id of ISLES) {
    await at(t0 + 30 * 60000);                                         // night: everyone in
    await go(id);
    let L = await boats(id);
    const H = await ev((id) => { const h = BridgeSloop.harbour(id); return h && { n: h.boats.length, kinds: h.boats.map(b => b.kind), merchant: h.merchant && { x: h.merchant.x, r: h.merchant.r, kind: h.merchant.kind }, berths: h.boats.map(b => [+b.x.toFixed(1), +b.r.toFixed(1), b.kind]) }; }, id);
    console.log(id + ': berths', JSON.stringify(H));
    if (!H || !H.n) { bad(id + ': no fishing boats at their berths'); continue; }
    console.log(id + ' night: home ' + count(L, 'home') + ' of ' + H.n);
    if (count(L, 'home') !== H.n) bad(id + ': not every boat in by night');
    await shot(id + '_night');
    // dawn: the first boat to cast off, a little way out
    const T = await ev(([id, n]) => { const out = []; for (let i = 0; i < n; i++) { const h = BridgeSloop.harbour(id).boats[i]; out.push(Object.assign(BridgeHarbourLife.times(id, h.fi, BridgeClock.now()), { fi: h.fi })); } return out; }, [id, H.n]);
    const first = T.slice().sort((a, b) => a.dep - b.dep)[0], last = T.slice().sort((a, b) => b.arr - a.arr)[0];
    await at(first.dep + 2500);                                        // (a berth near the map's edge is out of sight in seconds)
    await p.waitForTimeout(400);
    L = await boats(id);
    console.log(id + ' dawn ' + et(first.dep) + ': leaving ' + count(L, 'leaving') + ', home ' + count(L, 'home'));
    if (!count(L, 'leaving')) bad(id + ': nobody casting off at dawn');
    const lv = L.find(o => o.state === 'leaving');
    if (lv) await look(lv.x, lv.r - 2);
    await shot(id + '_dawn');
    await at(first.dep + 6000); await p.waitForTimeout(300);
    await shot(id + '_dawn2');
    // by day: all out
    await at(Math.round((rise + set) / 2));
    await p.waitForTimeout(400);
    L = await boats(id);
    console.log(id + ' day: in harbour ' + count(L));
    if (count(L)) bad(id + ': ' + count(L) + ' boats still in by day');
    await go(id);
    await shot(id + '_day');
    // dusk: the last one coming in
    await at(last.arr - 5000);
    await p.waitForTimeout(400);
    L = await boats(id);
    console.log(id + ' dusk ' + et(last.arr) + ': coming in ' + count(L, 'returning') + ', home ' + count(L, 'home'));
    if (!count(L, 'returning')) bad(id + ': nobody coming in at dusk');
    const rt = L.find(o => o.state === 'returning');
    if (rt) await look(rt.x, rt.r - 2);
    await shot(id + '_dusk');
    // the catch auction on the quay, due as they come in
    if (AUCTIONS[id]) {
      const due = await ev(([id, ev]) => { const s = BridgeEvents._schedule(id, 9).filter(e => e.id === ev); return s.map(e => e.start); }, [id, AUCTIONS[id]]);
      const want = await ev((id) => BridgeHarbourLife.auctionAt(id, BridgeClock.now()), id);
      console.log(id + ' auction due', due.map(et).join(', '), '(the boats in by ' + et(want) + ')');
      const one = due.find(s => Math.abs(s - want) < 25 * 60000);
      if (!one) bad(id + ': no auction as the boats come in');
      else {
        await at(one + 40000);
        await go(id);
        await p.waitForTimeout(3500);
        const run = await ev(() => BridgeEvents._running());
        const gat = await ev(() => typeof BridgeCrowd !== 'undefined' && BridgeCrowd._here ? BridgeCrowd._here().filter(c => c.gather).length : -1);
        console.log(id + ' auction: running ' + JSON.stringify(run) + ' · gathered ' + gat);
        if (!run.some(k => k.indexOf(AUCTIONS[id] + '@') === 0)) bad(id + ': the auction isn\'t on when it\'s due');
        const a = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === 'THE CATCH AUCTION'); return i && [i.x, i.y]; });
        if (a) await look(a[0], a[1] + 1);
        await shot(id + '_auction');
      }
    }
    // a merchantman alongside, the crane at work
    if (H.merchant) {
      const slot = await ev(([id, t]) => { for (let k = 0; k < 96; k++) { const T = t + k * 5 * 60000, m = BridgeHarbourLife.merchant(id, T); if (m && m.state === 'alongside') return T - m.since; } return null; }, [id, rise]);
      if (!slot) { bad(id + ': no merchantman alongside all day (from ' + rise + ')'); continue; }
      const C = 32000;
      await at(slot + 3 * C + 1500);
      await go(id);
      await look(H.merchant.x, H.merchant.r - 2.5);
      const states = [];
      for (const s of [1.5, 7, 12, 15, 19, 24, 29]) {
        await at(slot + 3 * C + s * 1000); await p.waitForTimeout(250);
        states.push(await ev((id) => { const k = BridgeHarbourLife.crane(id); return [+k.a.toFixed(2), +k.drop.toFixed(2), k.crate]; }, id));
        await shot(id + '_crane_' + String(s).replace('.', '_'));
      }
      console.log(id + ' crane through a cycle [swing, drop, crate]:', JSON.stringify(states));
      const fps = await ev(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else r(n / ((performance.now() - t0) / 1000)); })(); }));
      console.log(id + ' frames a second with the ship, the crane and the boats in view: ' + fps.toFixed(1));
      if (!(states.some(s => s[0] === 0 && s[2]) && states.some(s => s[0] === 1 && s[2]) && states.some(s => s[0] > 0 && s[0] < 1))) bad(id + ': the crane isn\'t swinging crates ashore');
      const L2 = await boats(id), mm = L2.find(o => o.kind === H.merchant.kind);
      if (!mm || mm.state !== 'alongside') bad(id + ': the merchantman isn\'t alongside the crane');
      // and her coming in
      await at(slot - 50000); await p.waitForTimeout(400);
      await shot(id + '_merchant_in');
    }
    // the quay's work by day
    await at(Math.round(rise + (set - rise) * 0.3));
    await go(id);
    const W = await ev((id) => BridgeHarbourLife.HARBOURS[id], id);
    for (const [k, w] of [['sail', W.sail], ['nets', W.nets], ['rope', W.rope]]) {
      if (!w) continue;
      const pt = w.at || w.from;
      await look(pt[0] + 1, pt[1]);
      await shot(id + '_' + k);
    }
  }

  // at sea: the grounds empty by night, the fleet out by day, steaming home at dusk
  const sea = await ev(([t0, rise, set]) => {
    const n = (T, f) => BridgeSloop._fleetAt(T).filter(f).length;
    const tw = BridgeSloop._fleetAt(t0).length;
    return { all: tw, night: n(t0 + 1800000, x => x.at), noon: n((rise + set) / 2, x => x.at && !x.at.transit), dawnOut: Math.max(...[...Array(80).keys()].map(m => n(rise - 900000 + m * 30000, x => x.at && x.at.transit === 'out'))),
             duskIn: Math.max(...[...Array(80).keys()].map(m => n(set - 2400000 + m * 30000, x => x.at && x.at.transit === 'home'))) };
  }, [t0, rise, set]);
  console.log('trawlers at sea:', JSON.stringify(sea));
  if (sea.night) bad(sea.night + ' trawlers on the grounds by night');
  if (sea.noon !== sea.all) bad('only ' + sea.noon + ' of ' + sea.all + ' trawlers on their grounds by day');
  if (!sea.dawnOut || !sea.duskIn) bad('nobody steaming out at dawn or home at dusk');

  // and on the water: a trawler steaming home at dusk, then each sea's boats in their own colours
  const sailFrom = async (id) => {
    await ev(() => { if (BridgeSloop.isRunning()) BridgeSloop.stop(); });
    await p.waitForTimeout(600);
    await ev((id) => new Promise(r => BridgeWorld.load(id, () => { BridgeState.transition('world', { worldId: id }); r(); })), id);
    await p.waitForTimeout(1500);
    await ev((id) => BridgeSloop.start(id), id);
    for (let i = 0; i < 80 && (await ev(() => BridgeSloop._phase())) !== 'sail'; i++) await p.waitForTimeout(250);
  };
  const frame = async (f) => {
    const ok = await ev((f) => {
      const bt = BridgeSloop._boat(), o = BridgeSloop._traffic().filter(new Function('o', 'return ' + f)).sort((a, b) => Math.hypot(a.x - bt.x, a.r - bt.r) - Math.hypot(b.x - bt.x, b.r - bt.r))[0];
      if (!o) return false;
      let px = -Math.sin(o.h), pr = Math.cos(o.h); if (pr > 0) { px = -px; pr = -pr; }
      const d = (o.spec.beam + 1.23) / 2 + 2.3; bt.x = o.x + px * d; bt.r = o.r + pr * d; bt.h = o.h; bt.v = 0; BridgeSloop._snap(); return o.kind + ' ' + (o.sea || '') + ' ' + (o.house || '');
    }, f);
    await p.waitForTimeout(500);
    return ok;
  };
  const near = async (f, T) => {             // the boat to the nearest ship matching f at T (chart frame), then frame on her
    await ev(([f, T]) => {
      const s = BridgeSloop._shipsAt(T / 1000).filter(new Function('o', 'return ' + f))[0];
      const a = BridgeSloop._toWorld(0, 0), b1 = BridgeSloop._toWorld(1, 1);
      if (s) { const w = BridgeSloop._toWorld(s.X / (b1.x - a.x), (s.Y - 3) / (b1.r - a.r)); const bt = BridgeSloop._boat(); bt.x = w.x; bt.r = w.r; bt.v = 0; BridgeSloop._snap(); }
    }, [f, T]);
    await p.waitForTimeout(1800);
  };
  const homeT = await ev((set) => { for (let m = 0; m < 80; m++) { const T = set - 2400000 + m * 30000; if (BridgeSloop._fleetAt(T).some(x => x.home === 'lumar-crown' && x.at && x.at.transit === 'home')) return T; } return set - 1500000; }, set);
  await at(homeT);
  await sailFrom('lumar-crown');
  const home = await ev(() => { const S = BridgeSloop._fleetAt(BridgeClock.now()).find(x => x.at && x.at.transit === 'home'); if (!S) return null; const a = BridgeSloop._toWorld(0, 0), b1 = BridgeSloop._toWorld(1, 1); const w = BridgeSloop._toWorld(S.at.X / (b1.x - a.x), (S.at.Y - 3) / (b1.r - a.r)); const bt = BridgeSloop._boat(); bt.x = w.x; bt.r = w.r; bt.v = 0; BridgeSloop._snap(); return S.home; });
  await p.waitForTimeout(1800);
  console.log('steaming home at dusk:', home, await frame("o.role === 'fisher' && o.transit === 'home'"));
  await shot('sea_dusk_home');
  await at(Math.round((rise + set) / 2));
  for (const [from, sea, f] of [['lumar-crown', 'emerald', "o.role === 'fisher'"], ['lumar-sapphire', 'sapphire', "o.role === 'fisher'"], ['lumar-rose', 'rose', "o.role === 'fisher'"],
                                ['lumar-sapphire', 'sapphire_merchant', "o.role === 'merchant' && o.sea === 'sapphire'"], ['lumar-rose', 'rose_merchant', "o.role === 'merchant' && o.sea === 'rose'"],
                                ['lumar-crown', 'emerald_merchant', "o.role === 'merchant' && o.sea === 'emerald'"]]) {
    await sailFrom(from);
    const T = await ev(() => Date.now());
    if (/merchant/.test(sea)) await near("o.role === 'merchant' && o.shown", T + 1500);
    else {
      await ev((from) => { const S = BridgeSloop._fleetAt(BridgeClock.now()).find(x => x.home === from && x.at); if (!S) return; const a = BridgeSloop._toWorld(0, 0), b1 = BridgeSloop._toWorld(1, 1); const w = BridgeSloop._toWorld(S.at.X / (b1.x - a.x), (S.at.Y - 3) / (b1.r - a.r)); const bt = BridgeSloop._boat(); bt.x = w.x; bt.r = w.r; bt.v = 0; BridgeSloop._snap(); }, from);
      await p.waitForTimeout(1800);
    }
    const who = await frame(f);
    console.log('the ' + sea + ' sea:', who || 'none in view');
    await shot('sea_' + sea);
  }
  await sailFrom('lumar-crimson');
  for (const [cx, cy] of [[0.27, 0.70], [0.24, 0.66], [0.30, 0.80], [0.12, 0.66], [0.33, 0.88]]) {
    await ev(([cx, cy]) => { const w = BridgeSloop._toWorld(cx, cy), bt = BridgeSloop._boat(); bt.x = w.x; bt.r = w.r; bt.v = 0; BridgeSloop._snap(); }, [cx, cy]);
    await p.waitForTimeout(1200);
    if (await ev(() => BridgeSloop._traffic().some(o => o.role === 'pirate'))) break;
  }
  console.log('the crimson sea:', await frame("o.role === 'pirate'"));
  await shot('sea_crimson');
  console.log('errors:', errs);
  await b.close();
})();
