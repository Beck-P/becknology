// The mountain railway (js/railway.js): the cutscene from Fellhaven to Aurelle and back. Shoots every shot in each
// season and at a few hours (a contact sheet each, `rail_<season>_<hour>.png`), then rides it for real: the first ride
// can't be skipped, a later one can. node world/railway.js [shots]
const { chromium } = require('playwright');
const fs = require('fs');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeRailway._reset(); });
  await p.evaluate(() => BridgeCine.load());
  const have = await p.evaluate(() => ['train', 'train-lit', 'train-small', 'train-small-lit'].map(n => n + ':' + BridgeCine.has(n)).join(' '));
  console.log('railway: sprites', have);
  if (/false/.test(have)) { errs++; console.log('railway: ERROR a train sprite is missing'); }

  // every shot, by season and hour, into a contact sheet (each frame 480 × 270, two across)
  const LIGHT = { day: { sun: 1, dusk: 0 }, golden: { sun: 0.55, dusk: 0.85 }, night: { sun: 0, dusk: 0 } };
  const CASES = [['winter', 'day'], ['spring', 'day'], ['summer', 'day'], ['autumn', 'day'], ['summer', 'golden'], ['autumn', 'golden'],
                 ['winter', 'night'], ['spring', 'night']];
  for (const [season, hour] of CASES) {
    const data = await p.evaluate((o) => {
      const env = Object.assign({ season: o.season }, o.light, o.hour === 'night' ? { aurora: o.season === 'winter' ? 1 : 0 } : {});
      const names = BridgeRailway.SHOTS, W = 480, H = 270, sheet = document.createElement('canvas');
      sheet.width = W * 2 + 6; sheet.height = Math.ceil(names.length / 2) * (H + 6);
      const g = sheet.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height);
      let ms = 0;
      names.forEach((n, i) => {
        const t0 = performance.now();
        const c = BridgeRailway._frame(n, n === 'depart' ? 0.62 : n === 'arrive' ? 0.6 : n === 'tunnel' ? 0.4 : 0.5, env, 'fellhaven', 'aurelle', W, H);
        ms = Math.max(ms, performance.now() - t0);
        g.drawImage(c, (i % 2) * (W + 6), Math.floor(i / 2) * (H + 6));
      });
      return { url: sheet.toDataURL('image/png'), ms: Math.round(ms) };
    }, { season, hour, light: LIGHT[hour] });
    fs.writeFileSync(`${SHOTS}/rail_${season}_${hour}.png`, Buffer.from(data.url.split(',')[1], 'base64'));
    console.log('railway:', season, hour, '· slowest frame', data.ms, 'ms');
    if (data.ms > 60) console.log('railway: slow frame (', data.ms, 'ms )');
  }
  // the other way: Aurelle's station leaving, Fellhaven's arriving, at dusk in winter
  const back = await p.evaluate(() => {
    const W = 480, H = 270, s = document.createElement('canvas'); s.width = W * 2 + 6; s.height = H;
    const g = s.getContext('2d');
    g.drawImage(BridgeRailway._frame('depart', 0.2, { season: 'winter', sun: 0.4, dusk: 0.9 }, 'aurelle', 'fellhaven', W, H), 0, 0);
    g.drawImage(BridgeRailway._frame('arrive', 0.95, { season: 'winter', sun: 0.4, dusk: 0.9 }, 'aurelle', 'fellhaven', W, H), W + 6, 0);
    return s.toDataURL('image/png');
  });
  fs.writeFileSync(`${SHOTS}/rail_back.png`, Buffer.from(back.split(',')[1], 'base64'));
  // the hour from the planet's clock (no override)
  const clock = await p.evaluate(() => { const E = BridgeRailway.env(); return E.season + ' sun ' + E.sun.toFixed(2) + ' dusk ' + E.dusk.toFixed(2); });
  console.log('railway: from the clock', clock);

  if (process.env.RAIL_QUICK) { console.log('railway: errors', errs); await b.close(); process.exit(errs ? 1 : 0); }
  // the ride itself: the first can't be skipped, the next can
  const ride = async (skipAt) => {
    await p.evaluate(() => { window.__railDone = false; BridgeRailway.ride('fellhaven', 'aurelle').then(() => { window.__railDone = true; }); });
    await p.waitForTimeout(skipAt);
    await p.keyboard.press('Space');
    await p.waitForTimeout(600);
    return p.evaluate(() => window.__railDone);
  };
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${SHOTS}/rail_live_start.png` });
  const first = await ride(3000);
  await p.screenshot({ path: `${SHOTS}/rail_live_first.png` });
  console.log('railway: first ride skipped by Space?', first, '(should be false)');
  if (first) { errs++; console.log('railway: ERROR the first ride could be skipped'); }
  // let the first one run to its end (about 84 s)
  for (let i = 0; i < 100 && !(await p.evaluate(() => window.__railDone)); i++) await p.waitForTimeout(1000);
  const ended = await p.evaluate(() => window.__railDone && BridgeRailway.seen());
  console.log('railway: first ride ran to the end and is remembered', ended);
  if (!ended) { errs++; console.log('railway: ERROR the first ride never finished'); }
  const second = await ride(2500);
  console.log('railway: second ride skipped by Space?', second, '(should be true)');
  if (!second) { errs++; console.log('railway: ERROR a later ride could not be skipped'); }
  console.log('railway: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
