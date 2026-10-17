// The graphics card's share (js/gpu.js): the glow runs where it should (outdoors, Arcadia) and not where it shouldn't
// (indoors elsewhere, turned off); a lost graphics context falls back to the plain frame and comes back when restored;
// software graphics leave it off unless ?gpu=1. node world/gpu.js [shots]
const { chromium } = require('playwright');
const CHROME = require(__dirname + '/../chrome.js');          // first, so BRIDGE_PORT's rerouting is in place for launch
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const open = async (q) => {
    const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-17T00:00' + q); await p.waitForTimeout(2500);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    return p;
  };
  const go = (p, w) => p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  const frames = async (p, ms) => { const a = (await p.evaluate(() => BridgeGPU.stats())).frames; await p.waitForTimeout(ms || 1000); return (await p.evaluate(() => BridgeGPU.stats())).frames - a; };
  // the frame is still being drawn: the middle of the screen isn't empty
  const drawn = (p) => p.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'); const d = x.getImageData(c.width / 2 - 20, c.height / 2 - 20, 40, 40).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s > 0; });

  // software graphics (as here): off by default
  let p = await open('');
  await go(p, 'arcadia-street'); await p.waitForTimeout(1500);
  console.log('software graphics, no ?gpu: glow frames', await frames(p), '· active', (await p.evaluate(() => BridgeGPU.stats())).active, '· drawn', await drawn(p));
  await p.close();

  p = await open('&gpu=1');
  for (const [w, want] of [['arcadia-street', 'on'], ['lumar-square', 'on'], ['cyber-noodle-bar', 'on'], ['lumar-tavern', 'off']]) {
    await go(p, w); await p.waitForTimeout(1500);
    const n = await frames(p);
    console.log('glow in', w, n > 0 ? 'on' : 'off', '(want ' + want + ')', '· drawn', await drawn(p));
    await p.screenshot({ path: SHOTS + '/gpu_' + w + '.png' });
  }
  // a lost context: back to the plain frame, then the glow again once it's restored
  await go(p, 'arcadia-street'); await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__lose = BridgeGPU._gl().getExtension('WEBGL_lose_context'); window.__lose.loseContext(); });
  await p.waitForTimeout(600);
  console.log('context lost: glow frames', await frames(p), '· active', (await p.evaluate(() => BridgeGPU.stats())).active, '· drawn', await drawn(p));
  await p.evaluate(() => window.__lose.restoreContext());
  await p.waitForTimeout(800);
  console.log('context restored: glow frames', (await frames(p)) > 0 ? 'some' : 'none', '· drawn', await drawn(p));
  // turned off by the pilot, and on again
  await p.evaluate(() => BridgeGPU.setOn(false));
  console.log('turned off: glow frames', await frames(p), '· drawn', await drawn(p), '· kept', await p.evaluate(() => localStorage.getItem('bridge_gpu')));
  await p.evaluate(() => BridgeGPU.setOn(true));
  console.log('turned on: glow frames', (await frames(p)) > 0 ? 'some' : 'none');
  await b.close();
})();
