// The farm hands work while you're away (js/farm.js work(), js/animals.js gather()): a field planted two days ago with
// Odile and Tam hired, opened from the ship — the turnips came in as they ripened (into the bin), were replanted from the
// seed box and grew again; the hens' eggs for each day are in the bin. node world/hands.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const now = Date.now(), H = 3600000, D = 24 * H;
    localStorage.setItem('bridge_ship_location', 'lumar');
    // the farm yours, Odile and Tam on for a week (hired two days ago), turnip seed in the box
    localStorage.setItem('bridge_homestead', JSON.stringify({ owned: now - 3 * D, hands: { odile: now + 5 * D, tam: now + 5 * D }, seeds: { seed_turnip: 40 }, bin: {} }));
    // eight turnips planted two days ago (a turnip takes a 6-hour Verdance day of wet ground), last looked at then
    const tiles = {};
    for (let i = 0; i < 8; i++) tiles[(10 + i) + ',20'] = { wet: 0, crop: { k: 'turnip', g: 0, need: 6 * H, t: now - 2 * D } };
    localStorage.setItem('bridge_farm', JSON.stringify({ tiles, can: 0, given: true, picked: {}, worked: now - 2 * D }));
    // two hens, last laid three days ago
    const day = Math.floor((now - new Date().getTimezoneOffset() * 60000) / D);
    localStorage.setItem('bridge_animals', JSON.stringify({ herd: [{ id: 'hen-1', kind: 'hen', name: 'Dot', hearts: 0, prodDay: day - 3 }, { id: 'hen-2', kind: 'hen', name: 'Bean', hearts: 0, prodDay: day - 3 }] }));
  });
  await p.goto('http://127.0.0.1:8766/bridge/'); await p.waitForTimeout(4000);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.waitForTimeout(31000);                                        // (the hens are gathered on a half-minute round)
  const r = await p.evaluate(() => {
    const f = BridgeFarm._save(), h = BridgeHomestead._s();
    return { world: BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null, picked: f.picked, bin: h.bin, seedsLeft: h.seeds.seed_turnip,
             growing: Object.values(f.tiles).map(t => t.crop ? Math.round(t.crop.g / t.crop.need * 100) + '%' : '-').join(' ') };
  });
  console.log('away two days, opened on the ship (' + r.world + '):');
  console.log('  turnips Odile brought in:', JSON.stringify(r.picked), '· seed left in the box:', r.seedsLeft);
  console.log('  in the bin for Marlo:', JSON.stringify(r.bin));
  console.log('  in the ground now:', r.growing);
  await b.close();
})();
