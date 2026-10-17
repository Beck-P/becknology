// The weather (js/weather.js): every place's spells over a fortnight (how often each kind comes), the forecast, what it
// does (trade, the cold, the sea, a storm flattening crops) and how it looks — a screenshot of each kind, pinned.
// node world/weather.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  // how often each kind comes, spell by spell over a fortnight from now
  console.log('mix', JSON.stringify(await ev(() => {
    const out = {};
    for (const r of Object.keys(BridgeWeather.REGIONS)) {
      const n = {}, t0 = BridgeClock.now(), len = BridgeWeather.REGIONS[r].spell * 3600000;
      for (let t = t0; t < t0 + 14 * 86400000; t += len) { const k = BridgeWeather.at(r, t).kind; n[k] = (n[k] || 0) + 1; }
      out[r] = n;
    }
    return out;
  })));
  console.log('outlook lumar:', await ev(() => BridgeWeather.outlook('lumar')));
  console.log('outlook hoarfell:', await ev(() => BridgeWeather.outlook('hoarfell')));
  console.log('same for everyone (deterministic):', await ev(() => JSON.stringify(BridgeWeather.at('lumar', 1.8e12)) === JSON.stringify(BridgeWeather.at('lumar', 1.8e12))));
  // what it does
  const fx = await ev(() => {
    const W = BridgeWeather, o = {};
    W._pin('lumar', 'storm'); W._pin('hoarfell', 'blizzard'); W._pin('arcadia', 'blackout');
    o.stormSea = W.sea(); o.pirates = W.pirates(); o.fish = W.fishLuck('sea_sapphire');
    o.tradeStall = W.trade('lumar-sapphire', Date.now()); o.tradePub = W.trade('lumar-crown-pub', Date.now());
    o.cold = W.cold('hoarfell-piste'); o.climb = W.climb();
    o.blackoutStreet = W.trade('arcadia-street', Date.now()); o.blackoutRoyale = W.trade('arcadia-casino', Date.now());
    W._pin('lumar'); W._pin('hoarfell'); W._pin('arcadia');
    return o;
  });
  console.log('effects', JSON.stringify(fx));
  // a storm on Verdance flattens a tall crop: it waits to be staked up
  const crop = await ev(() => {
    BridgeWeather._pin('verdance', 'storm');
    const s = JSON.parse(localStorage.getItem('bridge_farm') || '{}');
    const t0 = Date.now() - 5 * 3600000;
    s.tiles = {}; for (let i = 0; i < 8; i++) s.tiles[(10 + i) + ',20'] = { wet: Date.now() + 9e6, crop: { k: 'pumpkin', g: 0.6 * 6 * 21600000, need: 6 * 21600000, t: t0 } };
    localStorage.setItem('bridge_farm', JSON.stringify(s));
    return 'set';
  });
  await p.reload(); await wait(2500);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); BridgeWeather._pin('verdance', 'storm'); });
  await ev(() => new Promise(r => BridgeWorld.load('verdance', () => { BridgeState.transition('world', { worldId: 'verdance' }); r(); })));
  await wait(2500);
  console.log('storm on the field:', await ev(() => { const s = JSON.parse(localStorage.getItem('bridge_farm')); return Object.values(s.tiles).map(t => t.crop.flat ? 'flat' : 'up').join(' '); }));
  await ev(() => BridgeWeather._pin('verdance'));
  // how each looks
  const shot = async (world, region, kind, at, name, setup) => {
    await ev(([r, k, a]) => { if (a) BridgeClock._at(a); BridgeWeather._pin(r, k); }, [region, kind, at]);
    await ev((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), world);
    await wait(setup || 1800);
    await ev(() => BridgeWeather._badge());
    console.log('shot', name, '| badge:', await ev(() => { const s = document.querySelector('.world-wx'); return s && s.style.display !== 'none' ? s.title : '-'; }));
    await p.screenshot({ path: SHOTS + '/wx_' + name + '.png' });
    await ev((r) => BridgeWeather._pin(r), region);
  };
  await shot('lumar-square', 'lumar', 'storm', '2026-10-16T13:00', 'square_storm');
  await shot('lumar-square', 'lumar', 'fog', null, 'square_fog');
  await shot('verdance', 'verdance', 'rain', null, 'verdance_rain');
  await shot('verdance', 'verdance', 'heat', null, 'verdance_heat');
  await shot('hoarfell', 'hoarfell', 'blizzard', null, 'hoarfell_blizzard');
  await shot('hoarfell', 'hoarfell', 'clear', '2026-10-16T23:30', 'hoarfell_aurora');
  await shot('sylvara', 'sylvara', 'mist', '2026-10-16T13:00', 'sylvara_mist');
  await shot('sylvara', 'sylvara', 'starfall', '2026-10-16T22:30', 'sylvara_starfall', 3500);
  await shot('arcadia-street', 'arcadia', 'blackout', null, 'arcadia_blackout');
  await shot('arcadia-street', 'arcadia', 'smog', null, 'arcadia_smog');
  // at sea in fog: the islands gone, the Sapphire light sweeping through
  await ev(() => { BridgeClock._at('2026-10-16T13:00'); BridgeWeather._pin('lumar', 'fog'); });
  await ev(() => new Promise(r => BridgeWorld.load('lumar-sapphire', () => { BridgeState.transition('world', { worldId: 'lumar-sapphire' }); r(); })));
  await wait(1500);
  await ev(() => BridgeSloop.start('lumar-sapphire', null, { aboard: true }));
  for (let i = 0; i < 60 && (await ev(() => BridgeSloop._phase())) !== 'sail'; i++) await wait(300);
  await wait(4000);
  console.log('shot sea_fog', JSON.stringify(await ev(() => BridgeWeather.sea())));
  await p.screenshot({ path: SHOTS + '/wx_sea_fog.png' });
  await ev(() => BridgeWeather._pin('lumar', 'storm'));
  await wait(3000);
  await p.screenshot({ path: SHOTS + '/wx_sea_storm.png' });
  console.log('chronometer:', (await ev(() => BridgeHours.chronometer())).replace(/\n+/g, ' | ').slice(0, 400));
  await b.close();
})();
