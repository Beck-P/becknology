// The look of a fight on Midnight Isle: a creature's wind-up marked on the ground, a cracked sentinel's slam, a wisp's
// bolt flying and landing on you, your blow landing (steel, embers), a hound's bite landing on you, loot popping out and
// lying there, your staff's bolt, the Bell Warden's toll winding up and ringing out — each caught off the canvas at that moment, cropped round the pilot and blown up ×3
// (OUT/look_<moment>.png). And a check on what the fight draws: any filled or stroked rectangle 6 × 6 or bigger from
// the fight's own drawing (js/fx.js, loot.js, magic.js, combat.js's marks and bolts) is a box, and there should be none.
// node combat/look.js OUT
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/shots';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.removeItem('bridge_midnight');
    // the box watch: rectangles drawn by the fight's own code while a moment plays
    window._boxes = [];
    const P = CanvasRenderingContext2D.prototype;
    ['fillRect', 'strokeRect'].forEach((fn) => {
      const orig = P[fn];
      P[fn] = function (x, y, w, h) {
        if (window._watch && Math.abs(w) >= 6 && Math.abs(h) >= 6 && this.globalCompositeOperation !== 'source-atop') {
          const st = String(new Error().stack).split('\n').slice(2).join('\n');
          const m = /\/js\/(fx|loot|magic|combat)\.js:(\d+)/.exec(st.split('\n')[0] || '');
          // (the creatures' own sprites and the health bars aside)
          if (m && !/at (drawCreature|bar|bossBar|sceneItems) /.test(st)) window._boxes.push(m[1] + '.js:' + m[2] + ' ' + fn + ' ' + Math.round(w) + 'x' + Math.round(h) + ' ' + this.fillStyle);
        }
        return orig.apply(this, arguments);
      };
    });
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load|api\/talk/.test(m.text())) console.log('CONSOLE', m.text()); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T23:00'); await p.waitForTimeout(2000);
  await p.evaluate(() => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot({ id: '1', name: 'BECK', suit_color: 'gold' }); BridgeProgression.awardCoins = n => Promise.resolve(n); });
  await p.waitForTimeout(600);
  await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar-midnight', () => { BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 24, y: 30 } }); r(); })));
  await p.waitForTimeout(1800);
  await p.evaluate(() => {
    ['cutlass', 'emberbrand', 'wispcaller'].forEach(id => BridgeInventory.addItem(id, 1));
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window._L = {
      sleep, frame,
      clear() {
        const w = BridgeWorld.getWorld();
        w.interactions.filter(h => h.type === 'hostile').forEach(h => { w.collisions[h.y][h.x] = 0; });
        w.interactions = w.interactions.filter(h => h.type !== 'hostile');
        BridgeLoot.clear(); BridgeInventory.restoreAll();
      },
      hold(id) { for (let i = 0; i < 10; i++) { BridgeInventory.selectSlot(i); if (BridgeInventory.getSelectedItemId() === id) return; } },
      spawn(kind, dx, dy, o) { const w = BridgeWorld.getWorld(); const h = BridgeCombat.spawn(w, kind, BridgeCharacter.getX() + dx, BridgeCharacter.getY() + dy); h.blink = 0; return Object.assign(h, o || {}); },
      async until(f, ms) { for (let t = 0; t < (ms || 4000) && !f(); t += 8) await sleep(8); },
      // the fight's clock (performance.now) held at t while a frame is drawn — the page is slow headless, so a moment
      // is caught by when it happened, not by when the frame comes — and let go again
      hold_(t) { if (!this._pn) this._pn = performance.now.bind(performance); performance.now = () => t; },
      thaw() { if (this._pn) { performance.now = this._pn; this._pn = null; } },
      // that frame, round the pilot (8 × 5 tiles), blown up ×3 with no smoothing
      async grab(t) {
        if (t) this.hold_(t);
        await frame();
        const c = document.getElementById('bridge-canvas'), v = BridgeWorld.getScreenView(), dpr = c.width / c.clientWidth;
        const pos = BridgeCharacter.getRenderPos(), T = v.ts * dpr;
        const x = Math.round((v.offX + (pos.x - 2.5) * v.ts) * dpr), y = Math.round((v.offY + (pos.y - 3) * v.ts) * dpr), w = Math.round(8 * T), h = Math.round(5 * T);
        const o = document.createElement('canvas'); o.width = w * 3; o.height = h * 3;
        const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, x, y, w, h, 0, 0, w * 3, h * 3);
        return o.toDataURL('image/png');
      }
    };
  });
  const moments = {
    // a hound winding up on the tile you stand on, two thirds of the way through
    windup: async () => { const h = _L.spawn('hound', 1, 0, { windupMs: 1200 }); await _L.until(() => h._attackPhase === 'winding');
      const g = await _L.grab(h._attackStart + 800); h.windupMs = 1e9; return [['windup', g]]; },
    // a cracked sentinel's slam: the tile you're on and the four round it
    slam: async () => { const h = _L.spawn('sentinel', 1, 0, { windupMs: 1400 }); h._hp = 30; await _L.until(() => h._attackPhase === 'winding');
      const g = await _L.grab(h._attackStart + 900); h.windupMs = 1e9; return [['slam', g]]; },
    // a wisp four tiles off: its bolt in flight, then landing on you
    bolt: async () => { const h = _L.spawn('wisp', 4, 0, { windupMs: 250, strikeMs: 600, moveCooldown: 1e9 }); await _L.until(() => h._attackPhase === 'striking');
      const a = await _L.grab(h._attackStart + 300); _L.thaw(); await _L.until(() => h._attackPhase === 'recovering'); const c = await _L.grab(h._attackStart + 40);
      h.windupMs = 1e9; return [['bolt_flying', a], ['bolt_landed', c]]; },
    // your cutlass landing on a wight, just after and a beat later
    hit: async () => { _L.hold('cutlass'); BridgeCharacter.setFacing('right'); const h = _L.spawn('wight', 1, 0, { windupMs: 1e9, maxHP: 900, _hp: 900 });
      BridgeInventory.useSelected(); await _L.until(() => h._hp < 900); const a = await _L.grab(h._hitAt + 40), c = await _L.grab(h._hitAt + 160);
      return [['hit', a], ['hit_later', c]]; },
    // the Emberbrand's chop: embers
    burn: async () => { _L.hold('emberbrand'); BridgeCharacter.setFacing('right'); const h = _L.spawn('wight', 1, 0, { windupMs: 1e9, maxHP: 900, _hp: 900 });
      BridgeInventory.useSelected(); await _L.until(() => h._hp < 900); return [['hit_burn', await _L.grab(h._hitAt + 50)]]; },
    // a hound's bite landing on you
    hurt: async () => { const hp0 = BridgeInventory.getStats().hp; const h = _L.spawn('hound', 1, 0, { windupMs: 250 });
      await _L.until(() => BridgeInventory.getStats().hp < hp0); const t = h._attackStart, a = await _L.grab(t + 40), c = await _L.grab(t + 160);
      h.windupMs = 1e9; return [['hurt', a], ['hurt_later', c]]; },
    // drops popping out of a kill and lying on the ground
    loot: async () => { const x = BridgeCharacter.getX(), y = BridgeCharacter.getY(), t = performance.now();
      BridgeLoot.spawn(x + 3, y - 1, 'wisp_ember', 1); BridgeLoot.spawn(x + 3, y, 'moonstone', 1); BridgeLoot.spawn(x + 2, y + 1, 'midnight_crystal', 1);
      const a = await _L.grab(t + 170), c = await _L.grab(t + 1100); return [['loot_falling', a], ['loot_lying', c]]; },
    // the Wispcaller's wisp thrown down the way you face
    staff: async () => { _L.hold('wispcaller'); BridgeCharacter.setFacing('right'); BridgeInventory.useSelected(); await _L.sleep(330); return [['staff_bolt', await _L.grab()]]; },
    // the Bell Warden two tiles off: its toll winding up (the ring of tiles two out), then ringing out
    toll: async () => { const h = _L.spawn('warden', 2, 0, { windupMs: 1400, moveCooldown: 1e9 }); h._engaged = true; await _L.until(() => h._attackPhase === 'winding');
      const a = await _L.grab(h._attackStart + 1000); _L.thaw(); await _L.until(() => h._attackPhase === 'striking'); const c = await _L.grab(h._attackStart + 200);
      h.windupMs = 1e9; return [['toll', a], ['toll_rings', c]]; }
  };
  let total = 0;
  for (const name of Object.keys(moments)) {
    await p.evaluate(() => { _L.clear(); window._boxes = []; window._watch = true; });
    await p.waitForTimeout(150);
    const shots = await p.evaluate(`(${moments[name].toString()})()`);
    await p.evaluate(() => _L.thaw());
    const boxes = await p.evaluate(() => { window._watch = false; return [...new Set(window._boxes)]; });
    total += boxes.length;
    for (const [n, url] of shots) fs.writeFileSync(OUT + '/look_' + n + '.png', Buffer.from(url.split(',')[1], 'base64'));
    console.log(name + ': ' + shots.map(s => 'look_' + s[0] + '.png').join(' ') + ' · boxes ' + boxes.length + (boxes.length ? ' ' + boxes.slice(0, 4).join(' | ') : ''));
    await p.waitForTimeout(400);
  }
  console.log('box errors: ' + total);
  await b.close();
})();
