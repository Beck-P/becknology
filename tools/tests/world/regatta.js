// the Emerald Regatta (js/race.js, js/sloop.js): when it sails (Fridays, a start every quarter hour), the harbour book's
// row, entering at Crownhaven (down to your sloop, the gun to come), postponed in a storm; then a short course raced against
// the fleet — lined up across the harbour mouth, the gun, a mark to round, the line, your placing — and what a placing pays
const { chromium } = require('playwright');
const AUTOHELM = require(__dirname + '/../autohelm.js');
const OUT = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => {
    BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 0; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
  });
  // when it sails (Eastern time): a Friday afternoon, late on a Friday, a Thursday
  console.log('schedule', JSON.stringify(await p.evaluate(() => {
    const at = s => { BridgeClock._at(s, 1); const S = BridgeRace.nextStart(); const e = new Date(BridgeClock.etAt(S.at)); return s + ' -> ' + e.toISOString().slice(0, 16) + ' (in ' + Math.round((S.at - BridgeClock.now()) / 60000) + ' min)' + (BridgeRace.regattaDay() ? ' regatta day' : ''); };
    return [at('2026-10-16T11:50:00'), at('2026-10-16T18:07:00'), at('2026-10-16T18:14:40'), at('2026-10-16T23:50:00'), at('2026-10-15T09:00:00')];
  })));
  await p.evaluate(() => BridgeClock._at('2026-10-16T18:13:30', 1));
  await p.evaluate(() => BridgeWeather._pin('lumar', 'breezy'));
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-crown', () => { BridgeState.transition('world', { worldId: 'lumar-crown' }); r(); })));
  await p.waitForTimeout(2500);
  // the harbour book
  const dlg = () => p.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 600) : 'none'; });
  const click = re => p.evaluate(src => { const r = new RegExp(src); const e = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(x => r.test(x.innerText)); if (e) { e.click(); return true; } return false; }, re.source);
  await p.evaluate(() => BridgeHarbour.open('lumar-crown')); await p.waitForTimeout(400);
  console.log('book:', (await dlg()).match(/The Emerald Regatta[^/]*\/[^/]*/));
  await click(/^The Emerald Regatta/); await p.waitForTimeout(400);
  console.log('regatta:', await dlg());
  await p.screenshot({ path: OUT + '/regatta_book.png' });
  // a storm: postponed
  await p.evaluate(() => BridgeWeather._pin('lumar', 'storm'));
  await p.evaluate(() => BridgeRace.enter('lumar-crown')); await p.waitForTimeout(300);
  console.log('in a storm:', await dlg());
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.evaluate(() => BridgeWeather._pin('lumar', 'breezy'));
  await p.waitForTimeout(300);
  // entering: down to the sloop, the gun to come
  console.log('entered', await p.evaluate(() => BridgeRace.enter('lumar-crown')));
  for (let i = 0; i < 60 && !(await p.evaluate(() => BridgeSloop.isRunning() && BridgeSloop._phase() === 'sail')); i++) await p.waitForTimeout(300);
  const rs = () => p.evaluate(() => { const r = BridgeSloop._race(), bt = BridgeSloop._boat(); return r && { id: r.spec.id, gun: r.gun, inSec: r.spec.at ? Math.round((r.spec.at - Date.now()) / 1000) : null, next: r.next, done: r.done, ms: r.ms && Math.round(r.ms), place: r.place,
    fleet: r.npcs.map(o => o.name + ' ' + Math.round(o.time / 1000) + 's'), v: +bt.v.toFixed(2) }; });
  console.log('waiting for the gun:', JSON.stringify(await rs()));
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/regatta_wait.png' });
  // out to the line: the fleet lies across the harbour mouth
  await p.evaluate(() => { const L = BridgeSloop._race().line, bt = BridgeSloop._boat(); bt.x = L[0] - 2; bt.r = L[1] - 6; bt.h = Math.PI / 2; bt.v = 0; BridgeSloop._snap(); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/regatta_line.png' });
  console.log('retire', await p.evaluate(() => { BridgeSloop.retire(); return BridgeSloop.racing(); }));
  await p.evaluate(() => BridgeSloop.stop('lumar-crown'));
  await p.waitForTimeout(2500);
  // a short course against the fleet: round a mark off Crownhaven's south side and back to the line
  await p.evaluate(() => BridgeClock._at(null));
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-crown', () => { BridgeState.transition('world', { worldId: 'lumar-crown' }); r(); })));
  await p.waitForTimeout(2000);
  console.log('short course boarded', await p.evaluate(() => {
    const s = BridgeRace._spec(4242); s.id = 'regatta-test'; s.at = Date.now() + 12000; s.marks = [{ isle: 'lumar-crown', side: 'south', off: 6 }];
    window.__fin = null; const f = s.onFinish; s.onFinish = (ms, pl, fd) => { window.__fin = { ms: Math.round(ms), pl: pl, n: fd.length }; f(ms, pl, fd); };
    return BridgeSloop.raceBoard('lumar-crown', s);
  }));
  for (let i = 0; i < 60 && !(await p.evaluate(() => BridgeSloop.isRunning() && BridgeSloop._phase() === 'sail')); i++) await p.waitForTimeout(300);
  console.log('aboard', JSON.stringify(await p.evaluate(() => ({ running: BridgeSloop.isRunning(), phase: BridgeSloop._phase(), racing: BridgeSloop.racing(), world: BridgeWorld.getWorldId(), mode: !!BridgeWorld.getMode() }))));
  await p.evaluate(AUTOHELM);
  for (let i = 0; i < 40 && !(await rs()).gun; i++) await p.waitForTimeout(500);
  console.log('the gun:', JSON.stringify(await rs()));
  await p.waitForTimeout(5000);
  await p.screenshot({ path: OUT + '/regatta_racing.png' });
  let shot = 0;
  for (let i = 0; i < 160; i++) {
    await p.waitForTimeout(1000);
    const st = await rs();
    if (st && st.next === 1 && !shot) { shot = 1; await p.screenshot({ path: OUT + '/regatta_mark.png' }); }
    if (i % 15 === 0) console.log(i + 's', JSON.stringify(st));
    if (!st || st.done) break;
  }
  console.log('finished', JSON.stringify(await p.evaluate(() => window.__fin)), JSON.stringify(await rs()));
  await p.screenshot({ path: OUT + '/regatta_finish.png' });
  await p.evaluate(() => window.__helm && window.__helm.stop());
  console.log('paid', await p.evaluate(() => window._coins), 'record', await p.evaluate(() => localStorage.getItem('bridge_regatta')));
  // what a placing pays: once a regatta day, a better one the difference; the cup the first win
  console.log('prizes', JSON.stringify(await p.evaluate(() => {
    localStorage.removeItem('bridge_regatta'); window._coins = 0;
    const s = BridgeRace._spec(5000), out = [];
    s.onFinish(200000, 3, [1, 2, 3, 4, 5, 6]); out.push('3rd ' + window._coins);
    s.onFinish(190000, 4, [1, 2, 3, 4, 5, 6]); out.push('then 4th ' + window._coins);
    s.onFinish(180000, 1, [1, 2, 3, 4, 5, 6]); out.push('then 1st ' + window._coins + ' cup ' + BridgeInventory.getCount('regatta_cup'));
    s.onFinish(170000, 1, [1, 2, 3, 4, 5, 6]); out.push('1st again ' + window._coins + ' cup ' + BridgeInventory.getCount('regatta_cup'));
    return out;
  })));
  await b.close();
})();
