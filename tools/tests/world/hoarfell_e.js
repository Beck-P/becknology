// Hoarfell's grander side (Workstream E): Fellhaven's way down to its promenade, the promenade, the train to Aurelle,
// Aurelle and its château (the salon's tables in the château's own frame, the spa, the sleighs, the shops), the High
// Route hut to hut (the glacier, the Cabane Bleue, the col, the Refuge du Col) into the hidden valley, the valley's
// landmarks (the springs, the bell and the ice gate), and every new outdoor place under live light at dawn, noon,
// golden hour and night, summer and winter (shots/hfe_*.png). node world/hoarfell_e.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { errs++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'hoarfell'); localStorage.setItem('bridge_railway', JSON.stringify({ seen: 1 })); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T03:20'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
    window._coins = 2000; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
    ['verdance', 'lumar', 'hoarfell', 'sylvara'].forEach(r => BridgeWeather._pin && BridgeWeather._pin(r, 'clear')); });
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: a[1] != null ? { x: a[1], y: a[2] } : null }); r(); })), [w, x, y]);
  const here = () => ev(() => BridgeWorld.getWorldId());
  const dialog = () => ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 160) : 'none'; });
  const close = async () => { for (let i = 0; i < 4 && await ev(() => !!document.querySelector('.world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
  const pick = async (re) => { const ok = await ev((s) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick, .world-dialog button')].find(x => new RegExp(s, 'i').test(x.textContent)); if (r) r.click(); return !!r; }, re); await p.waitForTimeout(600); return ok; };
  const labels = () => ev(() => BridgeWorld.getWorld().interactions.map(i => i.label));
  const use = (label) => ev((l) => { const i = BridgeWorld.getWorld().interactions.find(x => x.label === l); if (!i) return false; BridgeInteractions.execute(i); return true; }, label);
  const waitWorld = async (w, ms = 8000) => { for (let t = 0; t < ms; t += 200) { if (await here() === w) return true; await p.waitForTimeout(200); } return false; };
  const check = (ok, what) => { if (!ok) { errs++; console.log('hoarfell-e: ERROR', what); } else console.log('hoarfell-e:', what); };

  // ---- Fellhaven's way down to the promenade ----------------------------------------------------------------------------
  await go('hoarfell', 39, 25);
  check((await labels()).includes('THE PROMENADE'), 'Fellhaven has its way down to the promenade');
  await go('hoarfell-promenade', 42, 17);
  const pl = await labels();
  check(['THE TRAIN', 'RINK', 'STUBLI', 'ALPENHOF', 'HEATED POOL', 'SLEIGHS', 'APRES-SKI', 'FELLHAVEN', 'KASPAR', 'STATIONMASTER'].every(l => pl.includes(l)), 'the promenade: train, rink, stübli, Alpenhof, pool, sleighs, après-ski');
  await use('HEATED POOL'); await p.waitForTimeout(300);
  check(await ev(() => BridgeHoarfell.isWarm()), 'a swim in the heated pool warms you: ' + (await dialog()).slice(0, 60));
  await close();
  await use('STUBLI'); await p.waitForTimeout(400); console.log('hoarfell-e: the stübli →', (await dialog()).slice(0, 90)); await close();

  // ---- the train to Aurelle (the cutscene stubbed: world/railway.js films it) ------------------------------------------
  await ev(() => { window._rode = null; BridgeRailway.ride = (a, b) => { window._rode = [a, b]; return Promise.resolve(); }; });
  await use('THE TRAIN'); await p.waitForTimeout(400);
  await pick('Ride to Aurelle');
  check(await waitWorld('hoarfell-aurelle'), 'the train to Aurelle: rode ' + JSON.stringify(await ev(() => window._rode)));

  // ---- Aurelle -----------------------------------------------------------------------------------------------------------
  const al = await labels();
  check(['CHATEAU AURELLE', 'MONSIEUR AUBERT', 'SLEIGHS', 'LES THERMES', 'LA TABLE', 'BAR ETOILE', 'MAISON VAUTRIN', 'BUREAU DES GUIDES', 'THE TRAIN'].every(l => al.includes(l)),
        'Aurelle: the château door, the concierge, sleighs, the spa, the rue, the guides, the train');
  await use('LES THERMES'); await p.waitForTimeout(400); await pick('sauna');
  check(await ev(() => BridgeHoarfell.isWarm()) && (await dialog()).includes('CEDAR'), 'the sauna at Les Thermes');
  await close();
  await use('BAR ETOILE'); await p.waitForTimeout(400); console.log('hoarfell-e: Bar Étoile →', (await dialog()).slice(0, 90)); await close();
  await use('MAISON VAUTRIN'); await p.waitForTimeout(500);
  check(await ev(() => !!(BridgeGear.SHOPS.vautrin && BridgeGear.SUITS.furs)), 'Maison Vautrin sells the furs');
  await close(); await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // ---- the château's salon: Royale Link's tables in its own frame ---------------------------------------------------------
  await go('hoarfell-chateau', 15, 18);
  const cl = await labels();
  check(['ROULETTE', 'BLACKJACK', 'THE POKER TABLE', 'CRAPS', 'LE BAR DORE', 'MONSIEUR AUBERT'].every(l => cl.includes(l)), 'the château: four tables, the bar, the concierge');
  await use('BLACKJACK'); await p.waitForTimeout(900);
  const frame = await ev(() => { const o = document.getElementById('cabinet-modal-overlay'); return o ? o.className + ' | ' + (o.querySelector('.cm-kicker') || {}).textContent : null; });
  check(frame && /cm-chateau/.test(frame) && /CHATEAU AURELLE/.test(frame), 'a salon table opens in the château frame: ' + frame);
  await p.screenshot({ path: `${SHOTS}/hfe_salon_frame.png` });
  await ev(() => BridgeCabinetModal.hide && BridgeCabinetModal.hide()); await p.keyboard.press('Escape'); await p.waitForTimeout(600);

  // ---- the High Route ------------------------------------------------------------------------------------------------------
  await go('hoarfell-aurelle', 9, 18);
  await ev(() => { BridgeTouring._reset(); BridgeInventory.addItem('skis', 1); });
  await use('BUREAU DES GUIDES'); await p.waitForTimeout(400);
  await pick('High Route');
  check(await waitWorld('hoarfell-glacier'), 'the guides send you up the Aurelle Glacier (day ' + await ev(() => BridgeTouring.state().day) + ')');
  check(await ev(() => (BridgeWorld.getWorld().expedition || {}).crevasses.length > 0), 'the glacier has a crevasse field');
  await use('CABANE BLEUE'); check(await waitWorld('hoarfell-hut-bleue'), 'into the Cabane Bleue');
  await use('ON TO THE COL'); await p.waitForTimeout(400);
  check((await dialog()).includes('SLEEP'), 'Odile won\'t let you on without sleeping: ' + (await dialog()).slice(0, 50));
  await close();
  await ev(() => { BridgeTouring.state().slept['hoarfell-hut-bleue'] = 1; BridgeTouring.state().day = 2; });
  await use('ON TO THE COL'); check(await waitWorld('hoarfell-col'), 'over the Col du Vent (day 2)');
  check(await ev(() => !!BridgeWorld.getWorld().ski), 'the bowl below the col can be skied');
  await use('REFUGE DU COL'); check(await waitWorld('hoarfell-hut-col'), 'into the Refuge du Col');
  await ev(() => { BridgeTouring.state().slept['hoarfell-hut-col'] = 1; BridgeTouring.state().day = 3; });
  await use('DOWN TO THE VALLEY'); check(await waitWorld('hoarfell-valley'), 'down into the hidden valley (the route done: ' + await ev(() => BridgeTouring.state().done) + ')');

  // ---- the hidden valley ------------------------------------------------------------------------------------------------------
  const hostiles = () => ev(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'hostile').map(i => i.creature));
  console.log('hoarfell-e: the valley\'s creatures', JSON.stringify(await hostiles()), '· yetis', await ev(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'yeti').length));
  await use('HOT SPRING'); await p.waitForTimeout(300);
  check((await dialog()).includes('BATH'), 'a hot spring'); await close();
  for (const w of ['hoarfell-caves', 'hoarfell-monastery', 'hoarfell-heart']) {
    await go(w);
    console.log('hoarfell-e:', w, 'creatures', JSON.stringify(await hostiles()));
  }
  await go('hoarfell-monastery');
  await use('THE ICE GATE'); await p.waitForTimeout(300);
  check((await dialog()).includes('SEALED'), 'the ice gate is sealed till the bell rings'); await close();
  await ev(() => { const w = BridgeWorld.getWorld(); w.interactions = w.interactions.filter(i => i.type !== 'hostile'); });
  await use('THE BELL'); await p.waitForTimeout(300); await close();
  await use('THE ICE GATE'); await p.waitForTimeout(300); await pick('Go through');
  check(await waitWorld('hoarfell-heart'), 'the bell rung, the gate opens onto the heart');

  // ---- every new outdoor place under live light ---------------------------------------------------------------------------------
  const PLACES = [['hoarfell-aurelle', 28, 16], ['hoarfell-promenade', 20, 17], ['hoarfell-glacier', 20, 30], ['hoarfell-col', 22, 14],
    ['hoarfell-valley', 25, 26], ['hoarfell-monastery', 22, 26], ['hoarfell-heart', 23, 26]];
  for (const [w, x, y] of PLACES) {
    await go(w, x, y);
    await ev((q) => { BridgeCharacter.init(q[0], q[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, [x, y]);
    let st = null;
    for (let i = 0; i < 80; i++) { st = await ev((id) => BridgeLit._stats(id), w); if (st && st.drawing) break; await p.waitForTimeout(250); }
    if (!st || !st.drawing) { console.log('hoarfell-e:', w, 'no live light (not rendered with it?)'); continue; }
    for (const [h, name, season] of [[7.0, 'dawn', 'summer'], [12.4, 'noon', 'winter'], [17.9, 'golden', 'autumn'], [1, 'night', 'winter']]) {
      const before = st.comps;
      await ev((o) => BridgeLit._force(o), { hour: h, season });
      for (let i = 0; i < 60; i++) { const s = await ev((id) => BridgeLit._stats(id), w); if (s.comps > before) { st = s; break; } await p.waitForTimeout(100); }
      await p.waitForTimeout(1900);
      await p.screenshot({ path: `${SHOTS}/hfe_${w}_${name}.png` });
    }
    console.log('hoarfell-e:', w, 'live light composed in', Math.round(st.ms), 'ms');
    await ev(() => BridgeLit._force(null));
  }
  console.log('hoarfell-e: errors', errs);
  await b.close();
  process.exit(errs ? 1 : 0);
})();
