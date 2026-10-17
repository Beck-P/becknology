// Seated people and their seats (Beck: "this guy is clipping through the bench"): someone sitting on a bench, a chair or
// a stool must never have the seat itself drawn across them. Every seat in assets/actions.json is sat on by you
// (js/actions.js → BridgeCharacter.sceneItem), the square's two benches by passers-by (js/crowd.js, found at a moment
// they're sitting there), and every seated scene actor (js/scene.js actorDrawList) is drawn: each one once against the
// render's depth and once against nothing, row by row. A row from the waist down (sprite row 26 on) hidden right across,
// with the figure showing again below it, is the seat cutting through them — BAD. A table or desk in front hides the lap
// down to the floor point in one block, and a chair's back seen from behind hides the small of the back down to the
// seat, which is as it should be; something higher up (a cable across a head) is only noted. Close-ups: the square's
// benches by day and by night with a passer-by on one and you on the other, you on a few other seats, a few seated
// actors (shots/seats/*.png). node world/seats.js [shots]
const { chromium } = require('playwright');
const fs = require('fs');
const SHOTS = (process.argv[2] || __dirname + '/shots') + '/seats';
fs.mkdirSync(SHOTS, { recursive: true });
const ROOT = __dirname + '/../../../apps/bridge/assets/';
let errors = 0;
const bad = (m) => { errors++; console.log('BAD', m); };
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 })).newPage();   // close-ups at 3 px a pixel
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T12:00'); await p.waitForTimeout(2500);   // midday on Lumar (its day: 8am-4pm ET)
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
  await p.waitForFunction(() => BridgeCrowd._ready());
  // clear skies for the pictures, and nothing over the scene
  await ev(() => { BridgeWeather._pin('lumar', 'fair'); BridgeWeather._pin('verdance', 'fair'); BridgeWeather._pin('hoarfell', 'clear'); BridgeWeather._pin('arcadia', 'clear'); });
  await p.addStyleTag({ content: '#interact-prompt, .quest-toast, .ev-bubble, #mp-layer, #act-pill { visibility: hidden !important; }' });
  // a seat with a view (the Skywalk's benches, Aurum's window tables) opens it a moment after you sit (0.45 s, then
  // 0.26 s of leaning in): put it away before the next
  const noView = () => ev(() => new Promise(r => setTimeout(() => { BridgeActions.closeView(); setTimeout(r, 500); }, 900)));
  const go = (w, x, y) => ev((a) => new Promise(r => BridgeWorld.load(a[0], () => { BridgeState.transition('world', { worldId: a[0], spawn: a[1] != null ? { x: a[1], y: a[2] } : undefined }); r(); })), [w, x, y]);

  // in the page: draw a seated figure's frame against the render's depth and against nothing, and compare row by row
  await ev(() => {
    // rows of the sprite above its floor point: [opaque, hidden] each
    window.__seatRows = (draw, floorY) => {
      const sc = BridgeScene.get(BridgeWorld.getWorld().scene.id);
      const open = Object.assign({}, sc, { depth: new Float32Array(sc.depth.length).fill(Infinity) });
      const box = draw.box;
      const shot = (s) => { const c = document.createElement('canvas'); c.width = box[0] + box[2] + 8; c.height = box[1] + box[3] + 8; const g = c.getContext('2d'); draw(g, s); return g; };
      const A = shot(open), B = shot(sc);
      const a = A.getImageData(box[0], box[1], box[2], box[3]).data, bb = B.getImageData(box[0], box[1], box[2], box[3]).data;
      const rows = [];
      for (let j = 0; j < box[3] && box[1] + j < floorY; j++) {
        let n = 0, h = 0;
        for (let i = 0; i < box[2]; i++) { const k = (j * box[2] + i) * 4 + 3; if (a[k] > 200) { n++; if (bb[k] <= 200) h++; } }
        rows.push([n, h]);
      }
      return rows;
    };
    // a band: a row (from..to) hidden right across, with more than half a row showing again below it, above the floor point
    window.__band = (rows, from, to) => {
      for (let j = from; j < Math.min(to, rows.length); j++) {
        if (rows[j][0] < 4 || rows[j][1] < rows[j][0]) continue;
        for (let k = j + 1; k < rows.length; k++) if (rows[k][0] >= 4 && rows[k][1] < rows[k][0] / 2) return [j, k];
      }
      return null;
    };
    window.__sum = (rows) => {
      let n = 0, h = 0; rows.forEach(r => { n += r[0]; h += r[1]; });
      return n ? Math.round(100 * h / n) : 0;
    };
    // the frame drawn by whatever draws it, recorded: BridgeScene.drawOccluded's arguments while __calls is a list
    const real = BridgeScene.drawOccluded;
    window.__calls = null;
    BridgeScene.drawOccluded = function () { if (window.__calls) window.__calls.push(Array.prototype.slice.call(arguments)); return real.apply(this, arguments); };
    window.__replay = (c) => {           // a recorded call as a draw, for __seatRows (no tint, no shadow, no x-ray), moved near the corner
      const OX = 40 - c[7], OY = 40 - c[8];
      const d = (g, s) => real(g, s, c[2], c[3], c[4], c[5], c[6], c[7] + OX, c[8] + OY, c[9], c[10] + OX, c[11] + OY, null, null, null, null, c[16]);
      d.box = [40, 40, c[5], c[6]];
      return d;
    };
  });

  // ---- you, on every seat ------------------------------------------------------------------------------------------
  const A = JSON.parse(fs.readFileSync(ROOT + 'actions.json'));
  let seatsSeen = 0;
  for (const w of Object.keys(A)) {
    const seats = A[w].filter(e => e.action === 'sit');
    if (!seats.length) continue;
    const at = seats[0].seat || [seats[0].x + 0.5, seats[0].y + 0.6];
    await go(w, Math.floor(at[0]), Math.round(at[1]) + 1); await p.waitForTimeout(1500);
    for (const s of seats) {
      const r = await ev(async (s) => {
        const W = BridgeWorld.getWorld();
        const it = W.interactions.find(i => i.action === 'sit' && i.label === s.label && (s.seat ? i.seat && i.seat[0] === s.seat[0] && i.seat[1] === s.seat[1] : i.x === s.x && i.y === s.y));
        if (!it) return { err: 'no interaction' };
        BridgeCharacter.stand();
        BridgeActions.run(it);
        if (!BridgeCharacter.isSeated()) return { err: 'not seated' };
        for (let t = 0; t < 40 && !BridgeCharacter.sportImage(BridgeCharacter.sportKey()); t++) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 150));
        const pos = BridgeCharacter.getRenderPos(), OX = Math.round(40 - pos.x * 32), OY = Math.round(80 - pos.y * 32);
        const item = (s2) => BridgeCharacter.sceneItem(OX, OY, 32, s2, W, Date.now()), floorY = Math.round(OY + (pos.y + 1 - 3 / 32) * 32);
        const draw = (g, s2) => item(s2).draw(g);
        draw.box = [Math.round(OX + (pos.x + 0.5) * 32) - 16, floorY - 45, 32, 48];
        const rows = __seatRows(draw, floorY);
        BridgeCharacter.stand();
        return { facing: it.facing || 'down', hid: __sum(rows), band: __band(rows, 26, 48), high: __band(rows, 0, 26) };
      }, s);
      if (s.view) await noView();
      seatsSeen++;
      const tag = (w + ' ' + s.label + ' ' + JSON.stringify(s.seat || [s.x, s.y])).padEnd(52);
      if (r.err) { bad(tag + r.err); continue; }
      console.log('you   ', tag, r.facing.padEnd(5), 'hidden', String(r.hid).padStart(2) + '%', r.band ? 'BAND rows ' + r.band.join('-') : '',
                  r.high ? '(note: something across the head, rows ' + r.high.join('-') + ')' : '');
      if (r.band) bad('you on ' + tag.trim() + ': the seat cuts across you (sprite rows ' + r.band.join(' to ') + ')');
    }
  }
  console.log('seats sat on:', seatsSeen);

  // ---- seated scene actors in every world ----------------------------------------------------------------------------
  const worlds = fs.readdirSync(ROOT + 'worlds').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).filter(w => {
    const j = JSON.parse(fs.readFileSync(ROOT + 'worlds/' + w + '.json'));
    return ((j.scene || {}).actors || []).some(a => a.pose === 'sit');
  }).sort();
  let actorsSeen = 0;
  for (const w of worlds) {
    await go(w); await p.waitForTimeout(1500);
    const res = await ev(async () => {
      const W = BridgeWorld.getWorld(), sc = BridgeScene.get(W.scene.id), out = [], now = Date.now();
      // every sheet loaded: the list stops growing (walkers first, then the actors in order, once each sheet is in)
      let n = -1;
      for (let t = 0; t < 40; t++) {
        const m = BridgeScene.actorDrawList(sc, W, 0, 0, 32, now).length;
        if (m === n && m >= W.scene.actors.length) break;
        n = m; await new Promise(r => setTimeout(r, 200));
      }
      const first = n - W.scene.actors.length;
      W.scene.actors.forEach((a, ai) => {
        if (a.pose !== 'sit') return;
        const OX = Math.round(40 - a.x * 32), OY = Math.round(80 - a.y * 32), lift = Math.round((a.lift || 0) * Math.SQRT1_2 * 32);
        const cx = Math.round(OX + (a.x + 0.5) * 32), floorY = Math.round(OY + (a.y + 0.55) * 32);
        const draw = (g, s2) => BridgeScene.actorDrawList(s2, W, OX, OY, 32, now)[first + ai].draw(g);
        draw.box = [cx - 16, floorY - 45 - lift, 32, 48];
        const rows = __seatRows(draw, floorY - lift);
        if (!rows.some(r => r[0])) { out.push({ a: a.sheet + '@' + a.x + ',' + a.y, err: 'not drawn' }); return; }
        out.push({ a: a.sheet + '@' + a.x + ',' + a.y, facing: a.facing || 'down', hid: __sum(rows), band: __band(rows, 26, 48), high: __band(rows, 0, 26) });
      });
      return out;
    });
    for (const r of res) {
      actorsSeen++;
      const tag = (w + ' ' + r.a).padEnd(52);
      if (r.err) { bad(tag + r.err); continue; }
      console.log('actor ', tag, r.facing.padEnd(5), 'hidden', String(r.hid).padStart(2) + '%', r.band ? 'BAND rows ' + r.band.join('-') : '',
                  r.high ? '(note: something across the head, rows ' + r.high.join('-') + ')' : '');
      if (r.band) bad('seated ' + tag.trim() + ': the seat cuts across them (sprite rows ' + r.band.join(' to ') + ')');
    }
  }
  console.log('seated actors drawn:', actorsSeen);

  // ---- the square's benches: passers-by sitting on them, you on the other, close up ------------------------------------
  await go('lumar-square', 12, 12); await p.waitForTimeout(1500);
  const seatsSq = A['lumar-square'].filter(e => e.action === 'sit');
  // a moment by day (an hour either side of Lumar's noon) when slot i of the crowd sits on seat i (slot i only ever sits there)
  const findSit = (i, base) => ev((a) => {
    const [i, base] = a;
    for (let day = 0; day < 6; day++) for (let m = -55; m <= 55; m += 0.5) {
      const t = base + day * 8 * 3600e3 + m * 60e3, pl = BridgeCrowd._plan('lumar-square', i, t);
      if (!pl) continue;
      const g = pl.segs.find(s => s.startsWith('sit@'));
      if (!g) continue;
      const [t0, t1] = g.split(' ')[1].split('-').map(Number), start = +pl.segs[0].split(' ')[1].split('-')[0];
      if (t > t0 + 5000 && t < t1 - 20000 && BridgeCrowd._count('lumar-square', start) > i) return t;
    }
    return null;
  }, [i, base]);
  const noon = await ev(() => BridgeClock.now());
  for (const night of [false, true]) {
    for (let i = 0; i < seatsSq.length; i++) {
      const base = noon + (night ? 4 * 3600e3 : 0);          // Lumar's midnight is four hours after its noon
      const t = await findSit(i, base);
      if (t == null) { console.log('no one sits on seat', i, 'within a few days', night ? 'by night' : 'by day'); continue; }
      await ev((t) => BridgeClock._at(t, 1), t);
      const you = seatsSq[1 - i] || null;                     // you on the other bench
      await go('lumar-square', Math.floor((you || seatsSq[i]).seat[0]), Math.round((you || seatsSq[i]).seat[1]) + 1); await p.waitForTimeout(1600);
      if (you) await ev((s) => { const it = BridgeWorld.getWorld().interactions.find(x => x.action === 'sit' && x.seat && x.seat[0] === s.seat[0]); BridgeActions.run(it); }, you);
      await p.waitForTimeout(500);
      const r = await ev(async (s) => {
        const here = BridgeCrowd._here().filter(e => e.sit);
        const who = here.find(e => Math.abs(e.x + 0.5 - s.seat[0]) < 0.6 && Math.abs(e.y + 0.5 - s.seat[1]) < 0.6);
        if (!who) return { err: 'nobody on it', here: here };
        window.__calls = [];
        await new Promise(r => setTimeout(r, 200));
        const calls = window.__calls; window.__calls = null;
        // their frame: the call whose sprite sits on the seat (x by its own view's offset)
        const c = calls.filter(c => c[5] === 32 && c[6] === 48 && Math.abs(c[7] - (Math.round(c[10] + s.seat[0] * 32) - 16)) <= 1
                                     && Math.abs(c[8] + 45 - Math.round(c[11] + (s.seat[1] + 0.05) * 32)) <= 2).pop();
        if (!c) return { err: 'not drawn', who: who.name };
        const rows = __seatRows(__replay(c), 40 + 45);
        return { who: who.name + ' (' + who.body + ')', depthRow: +c[9].toFixed(2), hid: __sum(rows), band: __band(rows, 26, 48) };
      }, seatsSq[i]);
      const tag = 'crowd  lumar-square BENCH ' + JSON.stringify(seatsSq[i].seat) + (night ? ' by night' : ' by day');
      if (r.err) { bad(tag + ': ' + r.err + ' ' + JSON.stringify(r.here || r.who || '')); continue; }
      console.log(tag.padEnd(58), r.who, '· depth row', r.depthRow, '· hidden', r.hid + '%', r.band ? 'BAND rows ' + r.band.join('-') : '');
      if (r.band) bad(tag + ': the bench cuts across ' + r.who + ' (sprite rows ' + r.band.join(' to ') + ')');
      // close-ups: both benches, the fountain between
      const clip = await ev(() => { const v = BridgeWorld.getScreenView(); return { x: Math.round(v.offX + 7.5 * v.ts), y: Math.round(v.offY + 8.6 * v.ts), width: Math.round(9 * v.ts), height: Math.round(3.4 * v.ts) }; });
      await p.screenshot({ path: SHOTS + '/square-' + (night ? 'night' : 'noon') + '-crowd-on-' + (i ? 'right' : 'left') + '.png', clip });
      await ev(() => BridgeCharacter.stand());
    }
  }
  await ev(() => BridgeClock._at('2026-10-16T12:00', 1));

  // ---- a few other seats, close up: you sitting -------------------------------------------------------------------
  for (const [w, label, k] of [['lumar-sapphire', 'BENCH', 0], ['hoarfell', 'BENCH', 0], ['verdance', 'BENCH', 0], ['arcadia-street', 'BENCH', 0],
                               ['office', "CAPTAIN'S CHAIR", 0], ['chrome-clinic', 'BENCH', 0], ['arcadia-casino-dining', 'TABLE FOR TWO', 0],
                               ['lumar-tavern', 'STOOL', 0], ['lumar-inn', 'ARMCHAIR', 0], ['lumar-inn', 'WINDOW', 0], ['arcadia-skywalk', 'BENCH', 0]]) {
    const s = A[w].filter(e => e.action === 'sit' && e.label === label)[k];
    const at = s.seat || [s.x + 0.5, s.y + 0.6];
    await go(w, Math.floor(at[0]), Math.round(at[1]) + 1); await p.waitForTimeout(1500);
    await ev((s) => { const it = BridgeWorld.getWorld().interactions.find(x => x.action === 'sit' && x.label === s.label && (!s.seat || (x.seat && x.seat[0] === s.seat[0]))); BridgeActions.run(it); }, s);
    if (s.view) await noView();
    await p.waitForTimeout(500);
    const clip = await ev((at) => { const v = BridgeWorld.getScreenView(); return { x: Math.round(v.offX + (at[0] - 2) * v.ts), y: Math.round(v.offY + (at[1] - 2.3) * v.ts), width: Math.round(4 * v.ts), height: Math.round(3.2 * v.ts) }; }, at);
    await p.screenshot({ path: SHOTS + '/you-' + w + '-' + label.toLowerCase().replace(/[^a-z]+/g, '-') + '.png', clip });
    await ev(() => BridgeCharacter.stand());
  }
  // seated scene actors, close up
  for (const [w, sheet] of [['sylvara', 'npc-elf-bard'], ['tech-repair-shop', 'npc-waiting'], ['lumar-sapphire-lamproom', 'npc-keeper'], ['arcadia-casino-cards', 'npc-patron-a'],
                            ['lumar-tern-inn', 'npc-fisher-a'], ['arcadia-casino-vip', 'npc-duchess']]) {
    const a = JSON.parse(fs.readFileSync(ROOT + 'worlds/' + w + '.json')).scene.actors.find(x => x.sheet === sheet);
    await go(w, Math.round(a.x), Math.round(a.y) + 2); await p.waitForTimeout(1600);
    const clip = await ev((a) => { const v = BridgeWorld.getScreenView(); return { x: Math.round(v.offX + (a.x - 1.5) * v.ts), y: Math.round(v.offY + (a.y - 1.6) * v.ts), width: Math.round(4 * v.ts), height: Math.round(3.2 * v.ts) }; }, a);
    await p.screenshot({ path: SHOTS + '/actor-' + w + '.png', clip });
  }

  await ev(() => ['lumar', 'verdance', 'hoarfell', 'arcadia'].forEach(r => BridgeWeather._pin(r, null)));
  console.log('seats errors: ' + errors);
  await b.close();
})();
