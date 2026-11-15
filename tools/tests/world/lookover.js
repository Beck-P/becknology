// The look-over: a place shot whole, section by section, at the zoom a player sees it (a 1280 × 800 desktop: 64 px a
// tile), with you, the cast, the walkers and the crowd drawn, in each light it has — and once more with an overlay
// that shows what the picture alone doesn't: which tiles you can't walk on, which you can walk on but never reach,
// every interaction (doors and exits teal, people gold, the rest orange), where you land and arrive (spawns, the
// shuttle, every door elsewhere that leads here), the scene's actors, walkers' routes, the crowd's spots and seats and
// its ways in, and the events' spots. So "in the way" and "looks walkable but isn't" can be seen, not guessed.
// (*Checking the worlds* in apps/bridge/CLAUDE.md.)
//
// node world/lookover.js <world> [<world> …] [--hours noon,golden,night] [--season winter] [--at 2026-10-14T03:20]
//                        [--out DIR] [--rect x0,y0,x1,y1] [--pos x,y]
//   --hours   any of dawn (7), noon (12.5), golden (18.2), night (22.5) or a number on the 24-hour face — for a
//             scene with live light; a scene with baked day/dusk/night states is shot in each of those; a room
//             with one light, once
//   --at      the game's clock (the crowd and the events go by it; default 2026-10-14T03:20, daytime on Hoarfell)
//   --rect    shoot just these tiles (default: the whole place the camera can show)
//   --pos     where you stand (default: the world's spawn)
// Writes to <out>/<world>/ (default tools/tests/shots/lookover/<world>/):
//   <light>_r<row>c<col>.png  each section with a ruler of tile numbers round it (its tile rect in report.txt)
//   overlay_r<row>c<col>.png  the same sections at noon with the overlay
//   full_<light>.png, full_overlay.png  the sections stitched into the whole place at half size (32 px a tile)
//   report.txt  the sections, the counts, and what the overlay finds on its own (arrivals or people on solid
//               ground, routes through walls, interactions nobody can reach, a spot in a doorway)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2), worlds = [], opt = {};
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i]; else worlds.push(args[i]); }
if (!worlds.length) { console.log('usage: node world/lookover.js <world> [<world> …] [--hours noon,golden,night] [--out DIR]'); process.exit(2); }
const OUT = opt.out || path.join(__dirname, '..', 'shots', 'lookover');
const AT = opt.at || '2026-10-14T03:20';
const NAMED = { dawn: 7, noon: 12.5, golden: 18.2, night: 22.5 };
const HOURS = (opt.hours || 'noon,golden,night').split(',').map((h) => [isNaN(+h) ? h : 'h' + h, NAMED[h] != null ? NAMED[h] : +h]);
const ROOT = path.join(__dirname, '..', '..', '..', 'apps', 'bridge', 'assets');
const W = 1280, H = 800, RULER = 22;

// every way into a world from elsewhere: doors, stairs, lifts and exits in other worlds that name it, with a spawn
function arrivals(id) {
  const out = [], dir = path.join(ROOT, 'worlds');
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
    for (const it of d.interactions || []) {
      const to = it.target || it.targetWorld || it.world;
      if (to === id && Array.isArray(it.spawn)) out.push({ x: it.spawn[0], y: it.spawn[1], from: f.replace('.json', '') + ' ' + (it.label || it.type) });
    }
  }
  return out;
}

(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js'), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const walkers = JSON.parse(fs.readFileSync(path.join(ROOT, 'walkers.json'), 'utf8'));
  let errs = 0;
  for (const WORLD of worlds) {
    const t0 = Date.now(), dir = path.join(OUT, WORLD);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(dir, f));
    const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
    p.on('pageerror', (e) => { errs++; console.log('PAGEERR', e.message.slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, (r) => r.abort());
    await p.addInitScript(() => { localStorage.setItem('bridge_railway', JSON.stringify({ seen: 1 })); });
    await p.goto('http://127.0.0.1:8766/bridge/?gpu=1&at=' + AT); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
      ['verdance', 'lumar', 'hoarfell', 'sylvara', 'arcadia'].forEach((r) => BridgeWeather._pin && BridgeWeather._pin(r, 'clear'));
    });
    const ok = await p.evaluate((w) => new Promise((r) => { const t = setTimeout(() => r(false), 15000); BridgeWorld.load(w, () => { clearTimeout(t); BridgeState.transition('world', { worldId: w }); r(true); }); }), WORLD);
    if (!ok) { errs++; console.log('lookover: ERROR', WORLD, 'did not load'); await p.close(); continue; }
    await p.evaluate(() => {
      if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(600);       // no frost over the picture
      if (typeof BridgeExpedition !== 'undefined' && BridgeExpedition._wx) { const x = BridgeExpedition._wx(); x.end = 0; x.next = Infinity; }   // nor a whiteout
    });
    const info = await p.evaluate(() => {
      const w = BridgeWorld.getWorld(), sc = w.scene && BridgeScene.get(w.scene.id);
      const m = sc && sc.meta;
      let B = { x0: 0, y0: 0, x1: w.width, y1: w.height };
      if (w.view) B = { x0: w.view[0], y0: w.view[1], x1: w.view[2], y1: w.view[3] + 1.6 };
      else if (w.scene && w.scene.backdrop && m) B = { x0: Math.min(0, -m.originX / 32), x1: Math.max(w.width, (m.width - m.originX) / 32), y0: Math.min(0, -m.originY / 32), y1: Math.max(w.height, (m.height - m.originY) / 32) + 1.6 };
      return { B, w: w.width, h: w.height, fixed: !!w.fixedCamera, spawn: (w.spawns && w.spawns.player) || [Math.floor(w.width / 2), Math.floor(w.height / 2)],
        lit: !!(sc && sc.lit), cycle: m && m.cycle || null, states: m && m.states || [] };
    });
    const spawn = opt.pos ? opt.pos.split(',').map(Number) : info.spawn;
    await p.evaluate((q) => { BridgeCharacter.init(q[0], q[1]); }, spawn);
    await p.addStyleTag({ content: 'body *{visibility:hidden!important} #bridge-canvas{visibility:visible!important}' });
    await p.waitForTimeout(1500);    // the crowd steps out

    // the sections: camera centres stepped across what the camera can show, overlapping by three tiles
    const ts = 64, halfW = W / 2 / ts, halfH = H / 2 / ts;
    let B = info.B;
    if (opt.rect) { const r = opt.rect.split(',').map(Number); B = { x0: r[0], y0: r[1], x1: r[2], y1: r[3] }; }
    const centres = (a0, a1, half) => {
      if (a1 - a0 <= 2 * half) return [(a0 + a1) / 2];
      const n = Math.ceil((a1 - a0 - 2 * half) / (2 * half - 3)) + 1, out = [];
      for (let i = 0; i < n; i++) out.push(a0 + half + (a1 - a0 - 2 * half) * (n === 1 ? 0.5 : i / (n - 1)));
      return out;
    };
    const cx = centres(B.x0, B.x1, halfW), cy = centres(B.y0, B.y1, halfH);

    // the lights: live light by the hour, baked day/dusk/night by its weights, or the one light a room has
    let lights;
    if (info.lit) lights = HOURS.map(([name, hour]) => ({ name, hour }));
    else if (info.cycle) lights = ['day', 'dusk', 'night'].filter((k) => info.cycle[k]).map((k) => ({ name: k, cycle: k }));
    else lights = [{ name: 'as_is' }];
    const stats = () => p.evaluate((w) => BridgeLit._stats(w), WORLD);
    if (info.lit) for (let i = 0; i < 60; i++) { const s = await p.evaluate(() => BridgeLit._stats(BridgeWorld.getWorld().scene.id)); if (s && s.drawing) break; await p.waitForTimeout(250); }
    const sections = [];   // { r, c, rect: [x0, y0, x1, y1] in tiles, shots: { light: Buffer } }
    for (let r = 0; r < cy.length; r++) for (let c = 0; c < cx.length; c++) sections.push({ r, c, at: [cx[c], cy[r]], shots: {} });
    const sid = await p.evaluate(() => BridgeWorld.getWorld().scene && BridgeWorld.getWorld().scene.id);
    for (const L of lights) {
      if (L.hour != null) {
        const before = (await p.evaluate((s) => BridgeLit._stats(s), sid)).comps;
        await p.evaluate((o) => BridgeLit._force(o), { hour: L.hour, season: opt.season });
        for (let i = 0; i < 80; i++) { const s = await p.evaluate((s) => BridgeLit._stats(s), sid); if (s.comps > before) break; await p.waitForTimeout(100); }
        await p.waitForTimeout(2200);
      } else if (L.cycle) {
        await p.evaluate((k) => { window.__lkW = window.__lkW || BridgeClock.weights; BridgeClock.weights = () => ({ day: k === 'day' ? 1 : 0, dusk: k === 'dusk' ? 1 : 0, night: k === 'night' ? 1 : 0 }); }, L.cycle);
        await p.waitForTimeout(900);
      }
      for (const S of sections) {
        await p.evaluate((q) => { BridgeWorld.setFocus({ x: q[0], y: q[1] }); BridgeWorld.snapCamera(); }, S.at);
        await p.waitForTimeout(220);
        const v = await p.evaluate(() => BridgeWorld.getScreenView());
        S.view = { offX: v.offX, offY: v.offY, ts: v.ts };
        S.rect = [-v.offX / v.ts, -v.offY / v.ts, (W - v.offX) / v.ts, (H - v.offY) / v.ts].map((n) => +n.toFixed(2));
        S.shots[L.name] = (await p.screenshot()).toString('base64');
      }
    }
    if (info.lit) await p.evaluate(() => BridgeLit._force(null));
    if (info.cycle && !info.lit) await p.evaluate(() => { if (window.__lkW) BridgeClock.weights = window.__lkW; });

    // what the overlay draws, from the page as it stands (interactions the scripts added at load included)
    const data = await p.evaluate(() => {
      const w = BridgeWorld.getWorld(), id = BridgeWorld.getWorldId();
      const ev = typeof BridgeEvents !== 'undefined' && BridgeEvents.EV ? Object.keys(BridgeEvents.EV).map((k) => BridgeEvents.EV[k]).filter((E) => E.at && (E.world === id || (E.worlds || [])[0] === id)).map((E) => ({ x: E.at[0], y: E.at[1], name: E.name })) : [];
      const cr = typeof BridgeCrowd !== 'undefined' && BridgeCrowd._spots ? BridgeCrowd._spots() : null;
      return { collisions: w.collisions, interactions: w.interactions.filter((i) => i.x != null).map((i) => ({ x: i.x, y: i.y, type: i.type, label: i.label || '', target: i.target || i.targetWorld || '', walker: i.walker || null })),
        actors: ((w.scene && w.scene.actors) || []).map((a) => ({ x: a.x, y: a.y, sheet: a.sheet, pose: a.pose || '' })),
        spawn: w.spawns && w.spawns.player, shuttle: w.shuttle && w.shuttle.spawn, events: ev, crowd: cr, here: typeof BridgeCrowd !== 'undefined' ? BridgeCrowd._here().length : 0 };
    });
    data.walkers = (walkers[WORLD] || []).map((wk) => ({ path: wk.path, sheet: wk.sheet, talk: wk.talk || '' }));
    data.arrivals = arrivals(WORLD);

    // reachability: flood from the spawn and every arrival over open tiles
    const C = data.collisions, open = (x, y) => y >= 0 && y < info.h && x >= 0 && x < info.w && C[y][x] !== 1;
    const reach = C.map((row) => row.map(() => 0)), q = [];
    for (const s of [data.spawn, data.shuttle, ...data.arrivals.map((a) => [a.x, a.y])]) if (s && open(s[0], s[1]) && !reach[s[1]][s[0]]) { reach[s[1]][s[0]] = 1; q.push(s); }
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (open(nx, ny) && !reach[ny][nx]) { reach[ny][nx] = 1; q.push([nx, ny]); } } }
    data.reach = reach;

    // what it finds on its own
    const finds = [];
    // (js/interactions.js: within 1.5 tiles, or two ahead across a solid tile — a counter)
    const R = (x, y) => !!(reach[y] && reach[y][x]);
    const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => R(x + dx, y + dy)) ||
      [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => R(x + dx, y + dy) && !open(x + dx / 2, y + dy / 2));
    for (const a of data.arrivals) if (!open(a.x, a.y)) finds.push(`arrival on a solid tile ${a.x},${a.y} (from ${a.from})`);
    if (data.spawn && !open(data.spawn[0], data.spawn[1])) finds.push(`spawn on a solid tile ${data.spawn}`);
    for (const a of data.actors) if (a.pose !== 'sit' && open(a.x, a.y)) finds.push(`actor ${a.sheet} on a walkable tile ${a.x},${a.y} (people walk through them)`);
    for (const i of data.interactions) if (!i.walker && !near(i.x, i.y)) finds.push(`interaction ${i.label || i.type} at ${i.x},${i.y}: nowhere reachable beside it`);
    for (const wk of data.walkers) for (let k = 0; k < wk.path.length - 1; k++) {
      const [ax, ay] = wk.path[k], [bx, by] = wk.path[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
      const bad = new Set();
      for (let s = 0; s <= n; s++) { const x = Math.round(ax + (bx - ax) * s / n), y = Math.round(ay + (by - ay) * s / n); if (!open(x, y)) bad.add(x + ',' + y); }
      if (bad.size) finds.push(`walker ${wk.sheet} route crosses solid ${[...bad].join(' ')}`);
    }
    const doors = data.interactions.filter((i) => /enter_world|leave_world|shuttle/.test(i.type));
    for (const sp of (data.crowd && data.crowd.spots) || []) for (const d of doors) if (Math.abs(sp[0] - d.x) + Math.abs(sp[1] - d.y) <= 0 && sp[2] !== 'source') finds.push(`crowd spot in the doorway of ${d.label} ${sp[0]},${sp[1]}`);
    for (const e of data.events) if (!open(e.x, e.y)) finds.push(`event "${e.name}" at a solid tile ${e.x},${e.y}`);

    // compose: rulers round each section, the overlay, the stitched whole
    const cp = await b.newPage({ viewport: { width: 400, height: 300 } });
    const composed = await cp.evaluate(async ([sections, data, info, lights, RULER, W, H]) => {
      const img = (b64) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + b64; });
      const COL = { door: '#20e0d0', person: '#ffd040', thing: '#ff8a30', actor: '#ff50d0', walker: '#40c8ff', spawn: '#50ff70', event: '#ff3050', crowd: '#ffffff' };
      function overlay(x, S) {
        const { offX, offY, ts } = S.view, T = (tx, ty) => [offX + tx * ts, offY + ty * ts];
        const C = data.collisions;
        for (let y = 0; y < C.length; y++) for (let xx = 0; xx < C[y].length; xx++) {
          const [px, py] = T(xx, y);
          if (px < -ts || py < -ts || px > W || py > H) continue;
          if (C[y][xx] === 1) { x.fillStyle = 'rgba(255,40,40,0.30)'; x.fillRect(px, py, ts, ts); }
          else if (!data.reach[y][xx]) { x.fillStyle = 'rgba(255,170,0,0.35)'; x.fillRect(px, py, ts, ts); }
        }
        x.strokeStyle = 'rgba(255,255,255,0.13)'; x.lineWidth = 1;
        for (let xx = 0; xx <= C[0].length; xx++) { const [px] = T(xx, 0); x.beginPath(); x.moveTo(px + 0.5, 0); x.lineTo(px + 0.5, H); x.stroke(); }
        for (let y = 0; y <= C.length; y++) { const [, py] = T(0, y); x.beginPath(); x.moveTo(0, py + 0.5); x.lineTo(W, py + 0.5); x.stroke(); }
        const label = (txt, px, py, col) => { x.font = 'bold 11px sans-serif'; const w = x.measureText(txt).width + 6; x.fillStyle = 'rgba(0,0,0,0.75)'; x.fillRect(px - w / 2, py - 7, w, 14); x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, px, py); };
        const box = (tx, ty, col, lw) => { const [px, py] = T(tx, ty); x.strokeStyle = col; x.lineWidth = lw || 3; x.strokeRect(px + 2, py + 2, ts - 4, ts - 4); return [px + ts / 2, py + ts / 2]; };
        for (const wk of data.walkers) {
          x.strokeStyle = COL.walker; x.lineWidth = 3; x.setLineDash([8, 5]); x.beginPath();
          wk.path.forEach(([tx, ty], k) => { const [px, py] = T(tx + 0.5, ty + 0.5); k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); x.setLineDash([]);
          const [px, py] = T(wk.path[0][0] + 0.5, wk.path[0][1] + 0.5); label('walk ' + (wk.talk || wk.sheet.replace('npc-', '')), px, py + 14, COL.walker);
        }
        if (data.crowd) {
          for (const [tx, ty, kind] of data.crowd.spots) {
            const [px, py] = T(tx + 0.5, ty + 0.5);
            x.fillStyle = kind === 'seat' ? '#c0a0ff' : kind === 'source' ? '#9cff9c' : kind === 'wander' ? 'rgba(255,255,255,0.6)' : '#ffffff';
            x.beginPath(); x.arc(px, py, kind === 'wander' ? 3 : 5, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke();
          }
        }
        for (const a of data.actors) { const c = box(a.x, a.y, COL.actor, 3); label(a.sheet.replace('npc-', '') + (a.pose ? ' ' + a.pose : ''), c[0], c[1] - 20, COL.actor); }
        for (const i of data.interactions) {
          const col = /enter_world|leave_world|shuttle|exit/.test(i.type) ? COL.door : i.type === 'dialog' ? COL.person : COL.thing;
          const c = box(i.x, i.y, col, 3);
          label((i.label || i.type) + (i.target ? ' → ' + i.target.replace(/^hoarfell-?/, '') : ''), c[0], c[1] + 18, col);
        }
        for (const e of data.events) { const [px, py] = T(e.x + 0.5, e.y + 0.5); x.fillStyle = COL.event; x.beginPath(); x.moveTo(px, py - 9); x.lineTo(px + 9, py); x.lineTo(px, py + 9); x.lineTo(px - 9, py); x.fill(); label('event: ' + e.name, px, py - 16, COL.event); }
        const star = (tx, ty, txt) => { const [px, py] = T(tx + 0.5, ty + 0.5); x.fillStyle = COL.spawn; x.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 4 : 10; x.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r); } x.fill(); label(txt, px, py - 16, COL.spawn); };
        if (data.spawn) star(data.spawn[0], data.spawn[1], 'spawn');
        if (data.shuttle) star(data.shuttle[0], data.shuttle[1], 'shuttle');
        for (const a of data.arrivals) star(a.x, a.y, '← ' + a.from.replace(/^hoarfell-?/, ''));
      }
      function ruled(im, S, over) {
        const c = document.createElement('canvas'); c.width = W + RULER; c.height = H + RULER;
        const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
        x.save(); x.translate(RULER, RULER); x.drawImage(im, 0, 0); if (over) overlay(x, S); x.restore();
        const { offX, offY, ts } = S.view;
        x.fillStyle = '#ddd'; x.font = '10px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
        for (let t = Math.ceil(S.rect[0]); t < S.rect[2]; t++) { const px = RULER + offX + (t + 0.5) * ts; if (px > RULER && px < c.width) x.fillText(String(t), px, RULER / 2); }
        x.save(); for (let t = Math.ceil(S.rect[1]); t < S.rect[3]; t++) { const py = RULER + offY + (t + 0.5) * ts; if (py > RULER && py < c.height) x.fillText(String(t), RULER / 2, py); } x.restore();
        return c.toDataURL('image/png').split(',')[1];
      }
      const out = { files: {} };
      const bx0 = Math.min(...sections.map((S) => S.rect[0])), by0 = Math.min(...sections.map((S) => S.rect[1]));
      const bx1 = Math.max(...sections.map((S) => S.rect[2])), by1 = Math.max(...sections.map((S) => S.rect[3]));
      const names = lights.map((L) => L.name);
      for (const name of [...names, 'overlay']) {
        const src = name === 'overlay' ? (names.includes('noon') ? 'noon' : names[0]) : name;
        const full = document.createElement('canvas'); full.width = Math.round((bx1 - bx0) * 32); full.height = Math.round((by1 - by0) * 32);
        const fx = full.getContext('2d'); fx.imageSmoothingEnabled = false;
        for (const S of sections) {
          const im = await img(S.shots[src]);
          out.files[`${name}_r${S.r}c${S.c}.png`] = ruled(im, S, name === 'overlay');
          let tile = im;
          if (name === 'overlay') { const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'); tx.drawImage(im, 0, 0); overlay(tx, S); tile = t; }
          // only the part of each section nearest its own centre (halfway to its neighbours'), so the vignette at
          // the edges of a frame doesn't stripe the whole
          const nb = (k, d) => sections.find((o) => o.r === S.r + (k === 'r' ? d : 0) && o.c === S.c + (k === 'c' ? d : 0));
          const L = nb('c', -1), Rr = nb('c', 1), U = nb('r', -1), D = nb('r', 1);
          const mx = (o) => (o.rect[0] + o.rect[2]) / 2, my = (o) => (o.rect[1] + o.rect[3]) / 2;
          const cx0 = L ? (mx(L) + mx(S)) / 2 : S.rect[0], cx1 = Rr ? (mx(Rr) + mx(S)) / 2 : S.rect[2];
          const cy0 = U ? (my(U) + my(S)) / 2 : S.rect[1], cy1 = D ? (my(D) + my(S)) / 2 : S.rect[3];
          const sx = (cx0 - S.rect[0]) * S.view.ts, sy = (cy0 - S.rect[1]) * S.view.ts, sw = (cx1 - cx0) * S.view.ts, sh = (cy1 - cy0) * S.view.ts;
          fx.drawImage(tile, sx, sy, sw, sh, Math.round((cx0 - bx0) * 32), Math.round((cy0 - by0) * 32), Math.round(sw / 2), Math.round(sh / 2));
        }
        out.files[`full_${name}.png`] = full.toDataURL('image/png').split(',')[1];
      }
      return out;
    }, [sections.map((S) => ({ r: S.r, c: S.c, at: S.at, rect: S.rect, view: S.view, shots: S.shots })), data, info, lights, RULER, W, H]);
    await cp.close();
    for (const [f, b64] of Object.entries(composed.files)) fs.writeFileSync(path.join(dir, f), Buffer.from(b64, 'base64'));
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const rep = [`${WORLD}: ${info.w} × ${info.h} tiles, camera bounds ${JSON.stringify(B)}, ${sections.length} sections, lights ${lights.map((L) => L.name).join(' ')}`,
      `interactions ${data.interactions.length}, actors ${data.actors.length}, walkers ${data.walkers.length}, arrivals ${data.arrivals.length}, crowd out ${data.here}, events ${data.events.length}`,
      ...sections.map((S) => `r${S.r}c${S.c}: tiles x ${S.rect[0]}…${S.rect[2]}, y ${S.rect[1]}…${S.rect[3]}`),
      `finds (${finds.length}):`, ...finds.map((f) => '  ' + f), `took ${secs} s`].join('\n');
    fs.writeFileSync(path.join(dir, 'report.txt'), rep + '\n');
    console.log('lookover:', WORLD, '→', dir, '·', sections.length, 'sections ×', lights.length + 1, '·', finds.length, 'finds ·', secs, 's');
    for (const f of finds) console.log('lookover:   ', f);
    await p.close();
  }
  await b.close();
  process.exit(errs ? 1 : 0);
})();
