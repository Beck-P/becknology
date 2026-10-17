// Music that changes with the moment (js/audio.js): outdoors the band follows the sky and the weather; a festival
// open where you are plays its own tune; sitting down in a tavern starts the band. node world/music.js
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_audio', JSON.stringify({ mode: 'all' })); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-14T03:20'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.keyboard.press('Shift');                                          // audio starts on a key
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: { x: a[1], y: a[2] } }); r(); })), [w, x, y]);
  const band = async (wait) => { await p.waitForTimeout(wait || 5000); const s = await ev(() => BridgeAudio._state()); return s.song + ' · ' + s.mood + ' · ' + s.bpm + ' bpm · filter ' + s.cutoff; };
  const at = (iso) => ev((iso) => BridgeClock._at(iso), iso);

  await go('verdance-village', 13, 18);
  console.log('Brambleford by day:', await band(1500));
  await at('2026-10-14T05:40');
  console.log('Brambleford at night:', await band());
  await at('2026-10-14T03:20');
  await ev(() => BridgeWeather._pin('verdance', 'rain'));
  console.log('Brambleford in the rain:', await band());
  await ev(() => BridgeWeather._pin('verdance', 'storm'));
  console.log('Brambleford in a storm:', await band());
  await ev(() => BridgeWeather._pin('verdance'));
  await at('2026-10-17T03:20');
  console.log('the Harvest Fair:', await band(), '· ambience', await ev(() => BridgeAudio._state().amb));
  await at('2026-10-17T05:40');
  console.log('the fair shut for the night:', await band());

  await at('2026-10-14T03:20');
  await go('lumar-tavern', 7, 9);
  console.log('the tavern:', await band(1500));
  await ev(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'STOOL')));
  console.log('sat down: seated', await ev(() => BridgeCharacter.isSeated()), '·', await band());
  await ev(() => BridgeCharacter.stand());                                   // up again (Esc would be back to the ship)
  console.log('stood up: seated', await ev(() => BridgeCharacter.isSeated()), '·', await band());

  await at('2026-10-24T07:00');
  await go('lumar-crown', 30, 32);
  console.log('Lantern Tide:', await band());
  await b.close();
})();
