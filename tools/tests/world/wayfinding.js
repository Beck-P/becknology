const { chromium } = require('playwright');
// The way there (js/route.js; Beck, Nov 2026: "where to go to reach the next destination is clear"). Real cases, each a
// fresh save of its own: the Admiral's clues two doors away in Crownhaven (the Land Gate, then the Quay Stairs), Keeper's
// Log over the sea at Sapphire Port, a place on another level of Arcadia asked for from the Map ("Show me the way": a door,
// then the Core Express), Ithil's star on a world never visited (up to the ship, the helm, the jump), and the lighthouse
// not yet visited (the way goes as far as its island and stops). For each: the route's legs, the tracker's words, the door,
// pier, lift or helm that's marked (and, walked through, the mark on the next), the Map's route, and nothing left once
// you're there. Then the route between every pair of landing places and piers, on a new save and on one that's been
// everywhere: no exception, nowhere it hasn't been walked through, no closed gate. Desktop and phone; shots wf_*.png in OUT.
//   node world/wayfinding.js [shots dir]
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/shots';
fs.mkdirSync(OUT, { recursive: true });
let errors = 0;
const fail = (m) => { errors++; console.log('FAILED: ' + m); };
const T = Date.now();
const LUMAR = ['bridge', 'hangar', 'quarters', 'lumar', 'lumar-square', 'lumar-crown', 'lumar-crown-oldtown', 'lumar-crown-office', 'lumar-crown-stilts', 'lumar-crown-pub'];
const seenOf = (list) => JSON.stringify(Object.fromEntries(list.map(w => [w, T])));

(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  async function page(phone, seed) {
    const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) { errors++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript((sd) => {
      if (sessionStorage.getItem('wf')) return;
      sessionStorage.setItem('wf', '1');
      localStorage.setItem('bridge_ship_location', 'lumar');
      for (const k in (sd || {})) localStorage.setItem(k, sd[k]);
    }, seed || null);
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-11-16T15:00'); await p.waitForTimeout(3000);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    await p.waitForFunction(() => typeof BridgeMap !== 'undefined' && BridgeMap.atlas() && BridgeQuests.defs() && Object.keys(BridgeQuests.defs()).length, null, { timeout: 15000 });
    return p;
  }
  // into a world, standing a few steps from what's labelled `near` (or anywhere open)
  const go = (p, w, near, d = 3) => p.evaluate(([w, near, d]) => new Promise(r => BridgeWorld.load(w, (W) => {
    W = BridgeWorld.getWorld() || W;
    const free = (x, y) => W.collisions[y] && W.collisions[y][x] === 0;
    let at = null;
    const it = near && W.interactions.find(i => i.label === near || i.type === near);
    if (it) {
      const seen = {}, q = [];
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(s => { if (free(it.x + s[0], it.y + s[1])) q.push([it.x + s[0], it.y + s[1]]); });
      while (q.length) {
        const c = q.shift(), k = c.join(); if (seen[k]) continue; seen[k] = 1;
        if (Math.abs(c[0] - it.x) + Math.abs(c[1] - it.y) >= d) { at = c; break; }
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(s => { if (free(c[0] + s[0], c[1] + s[1])) q.push([c[0] + s[0], c[1] + s[1]]); });
      }
    }
    if (!at) { for (let y = Math.floor(W.height / 2); y < W.height && !at; y++) for (let x = 0; x < W.width; x++) if (free(x, y)) { at = [x, y]; break; } }
    BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); BridgeCharacter.init(at[0], at[1]);
    if (BridgeWorld.snapCamera) BridgeWorld.snapCamera();
    r(at);
  })), [w, near, d]).then(async (at) => { await p.waitForTimeout(2200); return at; });
  // walk up to the marked thing: beside it, facing it — the pill — then through it (E)
  const atMark = (p) => p.evaluate(() => {
    const W = BridgeWorld.getWorld(), m = BridgeRoute.nextAt();
    if (!m) return null;
    const it = W.interactions.find(i => BridgeRoute.isNext(i)), free = (x, y) => W.collisions[y] && W.collisions[y][x] === 0;
    for (const d of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) if (free(it.x + d[0], it.y + d[1])) { BridgeCharacter.init(it.x + d[0], it.y + d[1]); BridgeCharacter.setFacing(d[2]); break; }
    if (BridgeWorld.snapCamera) BridgeWorld.snapCamera();
    return it.label;
  });
  const through = (p) => p.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => BridgeRoute.isNext(i)); if (it) BridgeInteractions.execute(it); return !!it; }).then(async (ok) => { await p.waitForTimeout(2600); return ok; });
  const pill = (p) => p.evaluate(() => { const e = document.getElementById('interact-prompt'); return e && e.classList.contains('visible') ? e.innerText.replace(/\s+/g, ' ') : ''; });
  const tracker = (p) => p.evaluate(() => { const t = document.getElementById('quest-tracker'); return t && t.classList.contains('on') ? t.innerText.replace(/\s+/g, ' ') : ''; });
  const way = (p) => p.evaluate(() => { const e = document.querySelector('#quest-tracker.on .qtr-way'); return e ? e.textContent : ''; });
  const legs = (p) => p.evaluate(() => { BridgeQuests.refreshTracker(); const r = BridgeRoute.current(); return r && r.legs ? r.legs.map(l => l.kind + ':' + l.label + '>' + l.to) : r && r.here ? ['HERE'] : [JSON.stringify(r)]; });
  const mark = (p) => p.evaluate(() => { const m = BridgeRoute.nextAt(); return m ? m.label : null; });
  const refresh = async (p) => { await p.evaluate(() => BridgeQuests.refreshTracker()); await p.waitForTimeout(1300); };
  const shot = (p, n) => p.screenshot({ path: OUT + '/wf_' + n + '.png' });
  const mapAll = async (p) => {
    await p.evaluate(() => BridgeMenu.open('map', { all: true })); await p.waitForTimeout(1500);
    return p.evaluate(() => {
      const w = document.querySelector('.mp-way'), end = document.querySelector('.mp-node.way-end');
      if (end) end.scrollIntoView({ block: 'center' });
      return { strip: w ? w.innerText.replace(/\s+/g, ' ') : '', end: end ? end.textContent : '', on: [...document.querySelectorAll('.mp-node.on-way')].map(e => e.textContent) };
    });
  };
  const closeMenu = async (p) => { await p.evaluate(() => BridgeMenu.close()); await p.waitForTimeout(600); };
  const expect = (what, got, rx) => { if (!rx.test(got)) fail(what + ': ' + JSON.stringify(got)); else console.log('  ' + what + ': ' + (typeof got === 'string' ? got : JSON.stringify(got))); };

  for (const phone of [false, true]) {
    const sz = phone ? 'phone' : 'desk';
    console.log('=== ' + sz);

    // ---- 1. The Admiral's clues: the Mudlark on the Stilts, two doors from the Old Town ------------------------------
    {
      const p = await page(phone, { bridge_log_seen: seenOf(LUMAR), bridge_quests: JSON.stringify({ admiral: { started: T, clues: { crier: T, keep: T, pim: T } } }), bridge_quest_meta: JSON.stringify({ track: 'admiral' }) });
      await go(p, 'lumar-crown-oldtown', 'LAND GATE', 5); await refresh(p);
      expect('admiral legs', (await legs(p)).join(' | '), /^door:LAND GATE>lumar-crown \| door:QUAY STAIRS>lumar-crown-stilts$/);
      expect('admiral tracker', await way(p), /^Through the Land Gate, then down the Quay Stairs$/);
      expect('admiral mark', await mark(p), /^LAND GATE$/);
      await shot(p, 'admiral_tracker_' + sz);
      await atMark(p); await p.waitForTimeout(900);
      expect('admiral pill', await pill(p), /this way/);
      await shot(p, 'admiral_door_' + sz);
      await through(p); await refresh(p);
      expect('admiral after the gate: where', await p.evaluate(() => BridgeWorld.getWorldId()), /^lumar-crown$/);
      expect('admiral after the gate: mark', await mark(p), /^QUAY STAIRS$/);
      expect('admiral after the gate: tracker', await way(p), /^Down the Quay Stairs$/);
      const m = await mapAll(p);
      expect('admiral map strip', m.strip, /The way to The Stilts.*Down the Quay Stairs.*You.*The Stilts/i);
      expect('admiral map end', m.end, /Stilts/);
      await shot(p, 'admiral_map_' + sz);
      await closeMenu(p);
      await atMark(p); await p.waitForTimeout(600); await through(p); await refresh(p);
      expect('admiral there: route', (await legs(p)).join(), /^HERE$/);
      if (await way(p)) fail('admiral there: the tracker still gives a way: ' + await way(p));
      if (await mark(p)) fail('admiral there: still a mark');
      expect('admiral there: the tracker keeps the lead', await tracker(p), /mudlark/i);
      await p.context().close();
    }

    // ---- 2. Keeper's Log: over the sea to Sapphire Port, then into the lighthouse ------------------------------------
    {
      const p = await page(phone, { bridge_log_seen: seenOf(LUMAR.concat(['lumar-sapphire', 'lumar-sapphire-lighthouse'])), bridge_quest_meta: JSON.stringify({ heard: { 'keepers-log': { t: T, who: 'Hetty' } }, track: 'keepers-log' }) });
      await go(p, 'lumar', 'go_sailing', 4); await refresh(p);
      expect('sea legs', (await legs(p)).join(' | '), /^sea:GO SAILING>lumar-sapphire \| door:LIGHTHOUSE>lumar-sapphire-lighthouse$/);
      expect('sea tracker', await way(p), /^Sail to Sapphire Port \(south-east\), then into the Lighthouse$/);
      expect('sea mark', await mark(p), /DOCK|PIER|SLOOP/i);
      await shot(p, 'sea_tracker_' + sz);
      await p.evaluate(() => BridgeMenu.open('journal')); await p.waitForTimeout(1200);
      expect('sea journal (Next up)', await p.evaluate(() => [...document.querySelectorAll('.jn-next .jn-way')].map(e => e.textContent).join(' / ')), /Sail to Sapphire Port/);
      await shot(p, 'sea_journal_' + sz);
      await closeMenu(p);
      await go(p, 'lumar-sapphire', 'LIGHTHOUSE', 4); await refresh(p);           // (sailed: the passage is the sloop's own test)
      expect('sea ashore: mark', await mark(p), /^LIGHTHOUSE$/);
      expect('sea ashore: tracker', await way(p), /^Into the Lighthouse$/);
      await atMark(p); await p.waitForTimeout(600); await through(p); await refresh(p);
      expect('sea there', (await legs(p)).join(), /^HERE$/);
      if (await mark(p) || await way(p)) fail('sea there: a mark or a way left');
      await p.context().close();
    }

    // ---- 3. Not been yet: the lighthouse on a charted island you haven't landed on ---------------------------------
    {
      const p = await page(phone, { bridge_log_seen: seenOf(LUMAR), bridge_charts: JSON.stringify({ seas: { emerald: true, sapphire: true }, visited: {}, hinted: 1 }), bridge_quest_meta: JSON.stringify({ heard: { 'keepers-log': { t: T, who: 'Hetty' } }, track: 'keepers-log' }) });
      await go(p, 'lumar-crown', 'go_sailing', 4); await refresh(p);
      expect('unvisited legs (as far as the island)', (await legs(p)).join(' | '), /^sea:GO SAILING>lumar-sapphire$/);
      expect('unvisited tracker', await way(p), /^Sail to Sapphire Port \(south-east\)$/);
      if (/Lighthouse/i.test(await way(p))) fail('unvisited: the way names the place');
      await go(p, 'lumar-sapphire', 'LIGHTHOUSE', 6); await refresh(p);
      expect('unvisited on the island: route', (await legs(p)).join(), /^HERE$/);
      if (await mark(p)) fail('unvisited on the island: a door is marked (a spoiler): ' + await mark(p));
      await p.context().close();
    }

    // ---- 4. Arcadia: the Spires from the street, asked for from the Map -----------------------------------------------
    {
      const p = await page(phone, { bridge_log_seen: seenOf(['bridge', 'hangar', 'arcadia-skypad', 'arcadia-skywalk', 'arcadia-street', 'arcadia-spaceport', 'arcadia-spires']), bridge_ship_location: 'arcadia' });
      await go(p, 'arcadia-street', 'THE SPACEPORT', 4);
      await p.evaluate(() => BridgeMenu.open('map', { world: 'arcadia-spires' })); await p.waitForTimeout(1500);
      const btn = await p.evaluate(() => { const b = document.querySelector('.mp-wayto [data-a="way"]'); return b ? b.textContent + ' | ' + (document.querySelector('.mp-wayto span') || {}).textContent : ''; });
      expect('arcadia map button', btn, /^Show me the way \| To the Spaceport, then take the Core Express to the Spires$/);
      await shot(p, 'arcadia_mapbutton_' + sz);
      await p.evaluate(() => document.querySelector('.mp-wayto [data-a="way"]').click()); await p.waitForTimeout(500);
      await closeMenu(p); await refresh(p);
      expect('arcadia showing', await p.evaluate(() => BridgeRoute.showing()), /^arcadia-spires$/);
      expect('arcadia tracker', await tracker(p), /THE WAY.*The Spires.*To the Spaceport, then take the Core Express to the Spires/i);
      expect('arcadia mark', await mark(p), /SPACEPORT/);
      await shot(p, 'arcadia_tracker_' + sz);
      await atMark(p); await p.waitForTimeout(600); await through(p); await refresh(p);
      expect('arcadia at the spaceport: legs', (await legs(p)).join(' | '), /^lift:CORE EXPRESS>arcadia-spires$/);
      expect('arcadia at the spaceport: the lift is marked', await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => BridgeRoute.isNext(i)); return i ? i.type + ':' + i.label : ''; }), /^express_lift:/);
      await atMark(p); await p.waitForTimeout(900);
      expect('arcadia lift pill', await pill(p), /this way/);
      await shot(p, 'arcadia_lift_' + sz);
      const m = await mapAll(p);
      expect('arcadia map strip', m.strip, /The way to The Spires.*Stop.*Core Express/i);
      await shot(p, 'arcadia_map_' + sz);
      await closeMenu(p);
      await go(p, 'arcadia-spires', null); await refresh(p);                       // (ridden: the lift's own test)
      if (await p.evaluate(() => BridgeRoute.showing())) fail('arcadia: still showing the way once there');
      if (await tracker(p)) fail('arcadia: the tracker is still up once there: ' + await tracker(p));
      await p.context().close();
    }

    // ---- 5. Another world, never visited: Ithil's star on Sylvara ----------------------------------------------------
    {
      const p = await page(phone, { bridge_log_seen: seenOf(LUMAR), bridge_quest_meta: JSON.stringify({ heard: { 'ithils-star': { t: T, who: 'someone' } }, track: 'ithils-star' }) });
      await go(p, 'lumar', 'shuttle', 4); await refresh(p);
      expect('jump legs', (await legs(p)).join(' | '), /^up:SHUTTLE>hangar \| door:BRIDGE>bridge \| jump:HELM>sylvara$/);
      expect('jump tracker', await way(p), /^Up to the ship, then jump to Sylvara$/);
      expect('jump mark: the shuttle', await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => BridgeRoute.isNext(i)); return i ? i.type : ''; }), /^shuttle$/);
      await shot(p, 'jump_shuttle_' + sz);
      await go(p, 'hangar', 'BRIDGE', 3); await refresh(p);
      expect('jump in the hangar', await way(p), /^To the Bridge, then jump to Sylvara$/);
      expect('jump hangar mark', await mark(p), /^BRIDGE$/);
      await atMark(p); await p.waitForTimeout(400); await through(p); await refresh(p);
      expect('jump on the bridge: mark', await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => BridgeRoute.isNext(i)); return i ? i.type : ''; }), /^warp_map$/);
      expect('jump on the bridge: tracker', await way(p), /^Jump to Sylvara$/);
      await shot(p, 'jump_helm_' + sz);
      const m = await mapAll(p);
      expect('jump map strip', m.strip, /The way to Sylvara.*You.*Hangar|The way to Sylvara.*You.*Elderglade/i);
      await closeMenu(p);
      await p.evaluate(() => BridgeOrbit.setLocation('sylvara'));
      await go(p, 'sylvara', null); await refresh(p);
      expect('jump there (the world: the lead takes over)', (await legs(p)).join(), /^HERE$/);
      if (await way(p) || await mark(p)) fail('jump there: a way or a mark left');
      await p.context().close();
    }

    // ---- 6. Every pair of landing places and piers: a new save, and one that's been everywhere ----------------------
    if (!phone) {
      const p = await page(false, {});
      await go(p, 'bridge', null);
      const res = await p.evaluate(() => {
        const A = BridgeMap.atlas(), roots = A.systems.map(s => s.root).concat(A.isles), out = { pairs: 0, ways: 0, none: [], bad: [], ms: 0 };
        const check = (S, tag) => {
          const t0 = performance.now();
          roots.forEach(a => roots.forEach(z => {
            if (a === z) return;
            out.pairs++;
            let r;
            try { r = BridgeRoute.find(a, z, { seen: S }); } catch (e) { out.bad.push(tag + ' ' + a + '>' + z + ' threw ' + e.message); return; }
            if (!r) { out.bad.push(tag + ' ' + a + '>' + z + ' null'); return; }
            if (r.none) { out.none.push(tag + ' ' + a + '>' + z); return; }
            if (!r.legs) return;
            out.ways++;
            const G = JSON.parse(localStorage.getItem('bridge_gates') || '{}');
            r.legs.forEach((l, i) => {
              const last = i === r.legs.length - 1;
              if (!S[l.to] && !last && l.to !== 'hangar' && l.to !== 'bridge') out.bad.push(tag + ' ' + a + '>' + z + ' through ' + l.to + ', not been');
              if (l.kind === 'gate' && !G[l.from + ':' + l.label]) out.bad.push(tag + ' ' + a + '>' + z + ' through a closed gate ' + l.label);
            });
          }));
          out.ms += performance.now() - t0;
        };
        check({ bridge: 1 }, 'new');
        const all = {}; Object.keys(A.worlds).forEach(w => all[w] = 1);
        check(all, 'everywhere');
        // everywhere, from every place to every landing place and pier and back: which have no way
        let n = 0; const t1 = performance.now(), cut = [];
        Object.keys(A.worlds).forEach(a => roots.forEach(z => {
          if (a === z) return;
          n += 2;
          [[a, z], [z, a]].forEach(([x, y]) => { let r; try { r = BridgeRoute.find(x, y, { seen: all }); } catch (e) { out.bad.push('everywhere ' + x + '>' + y + ' threw ' + e.message); return; } if (!r || r.none) cut.push(x + '>' + y); });
        }));
        out.allPairs = n; out.allNone = cut; out.allMs = Math.round(performance.now() - t1);
        // the alley gate shut, though you've been beyond it: never through it
        const r = BridgeRoute.find('arcadia-street', 'null-den', { seen: all });
        out.alley = r && r.legs ? r.legs.map(l => l.kind + ':' + l.label).join(' | ') : JSON.stringify(r);
        return out;
      });
      console.log('pairs ' + res.pairs + ', ways ' + res.ways + ' (' + Math.round(res.ms) + ' ms); no way on a new save: ' + res.none.filter(x => /^new/.test(x)).length +
        ', everywhere: ' + res.none.filter(x => /^everywhere/.test(x)).length + '; every place to and from them (' + res.allPairs + '): ' + res.allNone.length + ' with no way (' + res.allMs + ' ms)' +
        (res.allNone.length ? '\n    ' + [...new Set(res.allNone.map(x => x.split('>').find(w => !/^(lumar|arcadia-skypad|enigma-dock|singularity|verdance-village|hoarfell|sylvara|bridge)$/.test(w) && !/^lumar-[a-z]+$/.test(w)) || x))].join(', ') : ''));
      res.bad.forEach(fail);
      res.none.filter(x => /^everywhere/.test(x)).forEach(x => fail('no way between landing places: ' + x));
      if (res.ways < 40) fail('too few ways between landing places on a new save and everywhere: ' + res.ways);
      expect('the alley gate shut: the way to NULL\'s den', res.alley, /^(?!.*ALLEY GATE)/);
      await p.context().close();
    }
  }
  console.log('wayfinding: errors', errors);
  await b.close();
  process.exit(errors ? 1 : 0);
})();
