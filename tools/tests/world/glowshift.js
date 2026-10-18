// The glow mustn't flicker as the camera moves (Beck: "a weird flicker anytime I move"). Takes one finished frame of a
// place, moves its content a pixel at a time — what a camera step does — runs each through the glow (js/gpu.js) and
// compares the glow added, moved back into line: it should be the same wherever the camera stands.
// node world/glowshift.js [shots] [world] [x,y]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots', WORLD = process.argv[3] || 'arcadia-street', POS = (process.argv[4] || '20,10').split(',').map(Number), KEEP_SCENE = process.argv[5] === 'scene';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js'), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  let errs = 0;
  p.on('pageerror', e => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'arcadia'));
  await p.goto('http://127.0.0.1:8766/bridge/?gpu=1&at=2026-10-16T22:00'); await p.waitForTimeout(2500);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), WORLD);
  await p.evaluate((q) => { BridgeCharacter.init(q[0], q[1]); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, POS);
  await p.waitForTimeout(2000);
  const r = await p.evaluate((KEEP) => new Promise((done) => {
    // catch one finished frame on its way to the card
    const orig = BridgeGPU.present;
    BridgeGPU.present = function (buf, w, h, opts) {
      BridgeGPU.present = orig;
      const keep = document.createElement('canvas'); keep.width = w; keep.height = h;
      keep.getContext('2d').drawImage(buf, 0, 0);
      const out = orig.apply(this, arguments);
      setTimeout(() => {
        const res = [];
        const glowOf = (dx, dy) => {                 // the frame moved by (dx, dy), through the card: the glow it adds
          const s = document.createElement('canvas'); s.width = w; s.height = h;
          s.getContext('2d').drawImage(keep, dx, dy);
          const o = orig.call(BridgeGPU, s, w, h, Object.assign({}, opts, { scene: KEEP ? opts.scene : null, guess: KEEP ? opts.guess : 1, glow: 1, vignette: 0, offX: opts.offX + dx, offY: opts.offY + dy }));
          if (!o) return null;
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d'); g.drawImage(o, 0, 0);
          const A = g.getImageData(0, 0, w, h).data, B = s.getContext('2d').getImageData(0, 0, w, h).data;
          const d = new Float32Array(w * h);
          for (let i = 0; i < w * h; i++) d[i] = (A[i * 4] + A[i * 4 + 1] + A[i * 4 + 2] - B[i * 4] - B[i * 4 + 1] - B[i * 4 + 2]) / 3;
          return d;
        };
        const g0 = glowOf(0, 0);
        if (!g0) { done({ gpu: false }); return; }
        let total0 = 0; for (let i = 0; i < g0.length; i++) total0 += g0[i];
        for (const [dx, dy] of [[1, 0], [2, 0], [3, 0], [0, 1], [5, 3]]) {
          const g = glowOf(dx, dy);
          let diff = 0, n = 0, peak = 0;
          for (let y = 24; y < h - 24; y++) for (let x = 24; x < w - 24; x++) {
            const a = g0[y * w + x], bb = g[(y + dy) * w + x + dx], e = Math.abs(a - bb);
            diff += e; n++; if (e > peak) peak = e;
          }
          res.push({ dx, dy, meanDiff: +(diff / n).toFixed(3), peak: Math.round(peak) });
        }
        done({ gpu: true, w, h, glowMean: +(total0 / g0.length).toFixed(3), shifts: res });
      }, 50);
      return out;
    };
  }), KEEP_SCENE);
  console.log('glow shift:', JSON.stringify(r));
  await p.screenshot({ path: SHOTS + '/glowshift_' + WORLD + '.png' });
  // a level or two of rounding where the soft glow is shrunk to half and quarter size is invisible (and, where little
  // glows, all there is to measure); a pulse as you move is many levels somewhere (the flicker Beck saw peaked at 132)
  const bad = r.gpu && r.shifts.some((s) => s.peak > 8 || s.meanDiff > 0.05 * Math.max(1, r.glowMean) + 0.1);
  console.log('glow shift: ' + (r.gpu ? (bad ? 'ERROR the glow changes as the camera moves' : 'steady as the camera moves') : 'no GPU here (skipped)') + ' · errors ' + errs);
  await b.close();
  process.exit(errs || bad ? 1 : 0);
})();
