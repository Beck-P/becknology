// A contact sheet of the hidden valley's creatures beside Midnight's hound and sentinel, drawn straight from their
// drawers on a snow-coloured ground at game scale, then ×2 (OUT/valley_sheet.png): for judging the art.
// node combat/valley_sheet.js OUT
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/shots';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/'); await p.waitForTimeout(2000);
  const url = await p.evaluate(() => {
    const ts = 32, cell = 3 * ts, cols = 6;
    const cells = [
      ['hound', {}], ['hound', { _attackPhase: 'winding' }], ['sentinel', {}], ['sentinel', { _attackPhase: 'winding' }], ['warden', {}], ['wraith', {}],
      ['wolf', {}], ['wolf', { _rx: 0.5 }], ['wolf', { _rx: 0.5, t: 0.13 }], ['wolf', { _attackPhase: 'winding' }], ['wolf', { _attackPhase: 'striking' }], ['bat', {}],
      ['golem', {}], ['golem', { _attackPhase: 'winding' }], ['golem', { _attackPhase: 'striking' }], ['golem', { _cracked: true }], ['beetle', { _dir: 'left' }], ['wraith', { _attackPhase: 'winding' }],
      ['wyrm', { _attackPhase: 'recovering' }], ['wyrm', { _attackPhase: 'winding', _kind: 'bite' }], ['wyrm', { _attackPhase: 'striking', _kind: 'sweep' }],
      ['yeti', { state: 'wander' }], ['yeti', { state: 'wander', moving: true }], ['yeti', { state: 'wander', sit: true }], ['yeti', { state: 'hide' }], ['yeti', { state: 'wander', curious: true }],
    ];
    const rows = Math.ceil(cells.length / cols) + 1;
    const c = document.createElement('canvas'); c.width = cols * cell; c.height = rows * cell;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#dfe6f2'; g.fillRect(0, 0, c.width, c.height);
    let i = 0;
    cells.forEach(([kind, o]) => {
      const col = i % cols, row = Math.floor(i / cols); i += kind === 'wyrm' ? 2 : 1;
      const W = kind === 'wyrm' ? 2 * cell : cell;
      const x0 = (i - (kind === 'wyrm' ? 2 : 1)) % cols * cell, y0 = Math.floor((i - 1) / cols) * cell;
      g.fillStyle = (row + col) % 2 ? '#e8eef8' : '#dfe6f2'; g.fillRect(x0, y0, W, cell);
      const now = 1000 * (o.t || 0.5);
      if (kind === 'yeti') {
        const s = 2 * ts, cv = document.createElement('canvas'); cv.width = s; cv.height = s;
        BridgeValley._drawYeti(cv.getContext('2d'), Object.assign({ id: 'sheet', fx: 0, fy: 0, face: 1, seed: 1.3, goal: [0, 0] }, o), 2, now);
        g.drawImage(cv, x0 + (W - s) / 2, y0 + cell - s - 4);
        return;
      }
      const h = Object.assign({ creature: kind, x: 0, y: 0, _rx: 0, _ry: 0, _face: 1, maxHP: 100, _hp: 100, seed: 0, _surfaced: 0, _attackTarget: { x: 1, y: 0 } }, o);
      if (kind === 'wyrm') h._kind = h._kind || 'breach';
      BridgeCombat.drawCreature(g, h, x0 + W / 2, y0 + cell - 6, ts, now, true);
    });
    const o2 = document.createElement('canvas'); o2.width = c.width * 2; o2.height = c.height * 2;
    const g2 = o2.getContext('2d'); g2.imageSmoothingEnabled = false; g2.drawImage(c, 0, 0, o2.width, o2.height);
    return o2.toDataURL('image/png');
  });
  fs.writeFileSync(OUT + '/valley_sheet.png', Buffer.from(url.split(',')[1], 'base64'));
  console.log('sheet ' + OUT + '/valley_sheet.png');
  await b.close();
})();
