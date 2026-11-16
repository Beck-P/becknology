// A phone pass over the screens built on November 15 (and the shared dialogs they use): each one opened the way a player
// gets there (walked up to, the prompt pill tapped on a phone, E on a desktop; the menu's own screens from the menu) at a
// phone's 390 × 844 and a small phone's 360 × 640, and checked by measure: no dialog or panel wider than the screen or
// running off its bottom (a tall one scrolls inside the screen), every button and option at least 36 px on its short side,
// the last entry of a long option list reachable by scrolling and not under anything, and a way to close it by a tap.
// Shots pp_<screen>_<size>.png in OUT.   node world/phone_pass.js [shots dir] [screen ids, comma-separated] [sizes]
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/shots';
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const SIZES = { phone: { width: 390, height: 844 }, small: { width: 360, height: 640 }, land: { width: 844, height: 390 }, desk: { width: 1280, height: 800 } };
const USE = (process.argv[4] || 'phone,small').split(',');
fs.mkdirSync(OUT, { recursive: true });
let errors = 0;
const fail = (m) => { errors++; console.log('FAILED: ' + m); };

// ---- the screens ---------------------------------------------------------------------------------------------------------
// world + at: where to stand; use: the interaction (label, or a predicate on it); then: steps after it opens (a row or option
// to pick by its text); act: anything more, played from the test (a fish landed); menu: a menu tab instead; open: run in the page to open it instead; seed: localStorage before the page loads; prep: run in the page first.
const SCREENS = global.PHONE_SCREENS || [   // (world/phone_pass_old.js hands in the older screens and runs this same pass over them)
  { id: 'bess', world: 'lumar', at: [9, 14], use: 'HARBOURMASTER', prep: () => { ['first-hour'].forEach(q => BridgeQuests._done && BridgeQuests._done(q)); } },
  { id: 'shop', world: 'lumar-square', at: [19, 11], use: 'FISHMONGER' },
  { id: 'board', world: 'verdance-village', at: [15, 13], use: (i) => i.type === 'notice_board' },
  { id: 'fund', world: 'verdance-east', at: [15, 15], use: 'THE VILLAGE FUND', prep: () => { ['bridge', 'cafe', 'dairy', 'homes', 'station'].forEach(id => BridgeVillage._finish(id)); } },
  { id: 'darts', world: 'arcadia-dive', at: [13, 5], use: 'DARTBOARD' },
  { id: 'darts_game', world: 'arcadia-dive', at: [13, 5], use: 'DARTBOARD', then: ['Just a game'], wait: 2500 },
  { id: 'augustin', world: 'arcadia-members', at: [14, 9], use: 'SIR AUGUSTIN', seed: { bridge_spires: JSON.stringify({ member: true, since: 1, how: 'bought' }) } },
  { id: 'wagers', world: 'arcadia-members', at: [14, 9], use: 'SIR AUGUSTIN', then: ['Your wager book'], seed: { bridge_spires: JSON.stringify({ member: true, since: 1, how: 'bought' }) } },
  { id: 'members', world: 'arcadia-members', at: [14, 9], use: (i) => i.act === 'book', seed: { bridge_spires: JSON.stringify({ member: true, since: 1, how: 'bought' }) } },
  { id: 'eights', world: 'arcadia-members', at: [14, 9], use: 'LADY PERPETUA', then: ['A hand of Eights?', 'Sit down for 25'], wait: 1500, seed: { bridge_spires: JSON.stringify({ member: true, since: 1, how: 'bought' }) } },
  { id: 'sallow', world: 'arcadia-chopshop', at: [7, 7], use: 'DOC SALLOW' },
  { id: 'keyboard', world: 'hoarfell-chateau', at: [15, 18], use: 'KEY BOARD' },
  { id: 'ysolde', world: 'hoarfell', at: [9, 15], use: 'YSOLDE' },
  { id: 'elftavern', world: 'sylvara-tavern', at: [19, 9], use: 'TAVERN KEEPER' },
  { id: 'lodgeboard', world: 'hoarfell-lodge', at: [13, 4], use: 'THE BOARD' },
  { id: 'show', world: 'verdance-east', at: [12, 22], time: '2026-11-28T03:20', use: 'FLOWER TABLE', prep: () => { BridgeInventory.addItem('moonflower', 1); BridgeInventory.addItem('posy', 1); } },
  { id: 'fstall', world: 'verdance-east', at: [17, 20], time: '2026-11-28T03:20', use: 'BLOSSOM STALL' },
  { id: 'derby', world: 'hoarfell-promenade', at: [17, 16], time: '2026-12-19T05:30', use: 'ICE DERBY' },
  // Lumar, deeper (js/lumar-deep.js)
  { id: 'arsenal', world: 'lumar-crown-arsenal', at: [52, 16], use: 'THE ARSENAL' },
  { id: 'lastshore', world: 'lumar-crown-arsenal', at: [44, 30], time: '2026-11-20T14:02', use: 'THE LAST SHORE', optional: true },   // (there only on a launch day)
  { id: 'wanted', world: 'lumar-cinder', at: [28, 23], use: 'WANTED' },
  { id: 'dee', world: 'lumar-cinder', at: [28, 30], use: 'HARBOURMASTER' },
  { id: 'dragon', world: 'lumar-crimson-cave', at: [12, 7], use: 'DRAGON' },
  { id: 'booth', world: 'lumar-crown-bridge', at: [24, 11], time: '2026-11-18T11:00', use: 'SWEET BOOTH' },
  { id: 'donkeys', world: 'lumar-cliff', at: [44, 30], time: '2026-11-16T10:00', use: 'THE DONKEYS' },
  { id: 'taverna', world: 'lumar-cliff', at: [33, 12], use: 'TAVERNA' },
  // Sylvara, Enigma, the Brink and the ship, deeper (js/fardeep.js)
  { id: 'song', world: 'sylvara', at: [39, 24], use: 'BARD', then: ['Play The Long Way Home'], wait: 2500,
    act: async (p) => { await p.waitForTimeout(1500); await p.evaluate(() => { const d = document.querySelector('.world-dialog.typing'); if (d) d.click(); }); },   // (a long line: read to its end)
    seed: { bridge_quests: JSON.stringify({ 'thaelins-verse': { clues: { ask: 1, lookout: 1, stage: 1, falls: 1, lake: 1, deep: 1, song: 1 }, started: 1, done: 1 } }) } },
  { id: 'rivercard', world: 'sylvara-river', at: [24, 1], use: (i) => i.type === 'fish' && i.x === 21, act: async (p) => {
      await p.keyboard.down(' '); await p.waitForTimeout(1150); await p.keyboard.up(' '); await p.waitForTimeout(300);
      await p.evaluate(() => { const s = BridgeFishing._state(); if (s && s.phase === 'wait') { s.catchId = 'moon_carp'; s.nibbles = []; } });
      await p.waitForFunction(() => { const s = BridgeFishing._state(); return s && s.phase === 'bite'; }, null, { timeout: 15000 }).catch(() => {});
      await p.keyboard.down(' '); await p.waitForTimeout(120); await p.keyboard.up(' ');
      await p.evaluate(() => { const s = BridgeFishing._state(); if (s && s.phase === 'reel') { s.progress = 0.995; s.fish = s.ft = s.zone + s.zoneH / 2; } });
      await p.waitForFunction(() => !!document.getElementById('fish-reveal'), null, { timeout: 6000 }).catch(() => {});
    }, wait: 1200 },
  { id: 'ring', world: 'singularity', at: [8, 27], use: 'RING GATE',
    seed: { bridge_quests: JSON.stringify({ 'eddas-book': { clues: {}, started: 1, done: 1763100000000 }, admiral: { clues: {}, started: 1, done: 1763000000000 }, 'ithils-star': { clues: {}, started: 1, done: 1763200000000 } }),
            bridge_festivals: JSON.stringify({ 'harvest_fair@20400': { best: 12, what: "Edda's Apple Pie", paid: 1, n: 1 } }) } },
  { id: 'sights', world: 'ship-observatory', at: [9, 10], use: (i) => i.type === 'observatory' && i.part === 'log' },
  { id: 'dorrie', world: 'ship-galley', at: [8, 10], time: '2026-10-16T13:00', use: (i) => i.type === 'galley' && i.part === 'cook', prep: () => { BridgeInventory.addItem('fondue', 1); BridgeInventory.addItem('farm_cheese', 1); }, then: ['Something from the other worlds'] },
  { id: 'bench', world: 'ship-greenhouse', at: [9, 10], use: (i) => i.type === 'greenhouse' && i.part === 'bench', seed: { bridge_fardeep: JSON.stringify({ seeds: 1 }) } },
  { id: 'dispatches', world: 'enigma-hydro', at: [2, 9], use: 'OKAFOR', then: ['Station dispatches'], wait: 2500, seed: { bridge_fardeep: JSON.stringify({ dispatches: [1, 2, 3, 4, 5] }) } },
  { id: 'cloak', world: 'sylvara-roots', at: [1, 20], use: 'WEAVER', prep: () => { BridgeInventory.addItem('silk_cocoon', 4); BridgeInventory.addItem('owlmoss', 3); }, then: ['A warden\'s cloak?'] },
  // a plain line (BridgeInteractions.say): the touch controls go while it's up and come back as they were
  { id: 'say', world: 'lumar-square', at: [11, 10], use: 'FOUNTAIN' },
  { id: 'journal', menu: 'journal', world: 'lumar', at: [9, 16] },
  { id: 'map', menu: 'map', world: 'lumar', at: [9, 16] },
  { id: 'pack', menu: 'backpack', world: 'lumar', at: [9, 16], prep: () => { BridgeInventory.addItem('silverfin', 2); BridgeInventory.addItem('wheat', 3); } },
  { id: 'ledger', menu: 'ledger', world: 'lumar', at: [9, 16] },
  // the way there (js/route.js): a place's map with Show me the way, and All places with a route picked out
  { id: 'mapway', world: 'lumar', at: [9, 16], open: () => BridgeMenu.open('map', { world: 'lumar-crown-stilts' }), seed: { bridge_log_seen: JSON.stringify({ bridge: 1, hangar: 1, lumar: 1, 'lumar-square': 1, 'lumar-crown': 1, 'lumar-crown-oldtown': 1, 'lumar-crown-stilts': 1 }) } },
  { id: 'mapallway', world: 'lumar', at: [9, 16], open: () => { BridgeRoute.show('lumar-crown-stilts'); BridgeMenu.open('map', { all: true }); }, seed: { bridge_log_seen: JSON.stringify({ bridge: 1, hangar: 1, lumar: 1, 'lumar-square': 1, 'lumar-crown': 1, 'lumar-crown-oldtown': 1, 'lumar-crown-stilts': 1 }) } },
];

(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  async function page(size, seed) {
    const vp = SIZES[size], touch = size !== 'desk';
    const ctx = await b.newContext(touch ? { viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: vp });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log('PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) { errors++; console.log('CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript((sd) => {
      if (sessionStorage.getItem('pp')) return;
      sessionStorage.setItem('pp', '1');
      localStorage.setItem('bridge_ship_location', 'lumar');
      for (const k in (sd || {})) localStorage.setItem(k, sd[k]);
    }, seed || null);
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-11-16T17:00'); await p.waitForTimeout(3000);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
      window._coins = 5000;
      BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
      BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
      BridgeProgression.getBalance = () => Promise.resolve(window._coins);
    });
    return p;
  }
  const touchy = (p) => p.evaluate(() => document.documentElement.classList.contains('touch'));
  const go = (p, w, x, y) => p.evaluate((q) => new Promise(r => BridgeWorld.load(q[0], () => {
    BridgeState.transition('world', { worldId: q[0], spawn: { x: q[1], y: q[2] } }); BridgeCharacter.init(q[1], q[2]);
    if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); r();
  })), [w, x, y]);
  const tapAt = async (p, x, y) => { if (await touchy(p)) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
  // tap (or click) the first visible element matching sel whose text starts with / matches text
  async function press(p, text) {
    const box = await p.evaluate((t) => {
      const els = [...document.querySelectorAll('.wd-opt, .wd-btn, .wd-sell-row.pick, button, [data-act]')].filter(e => e.offsetParent !== null);
      const e = els.find(e => e.textContent.trim().indexOf(t) === 0) || els.find(e => e.textContent.indexOf(t) >= 0);
      if (!e) return null;
      e.scrollIntoView({ block: 'nearest' });
      const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2];
    }, text);
    if (!box) return false;
    await tapAt(p, box[0], box[1]); await p.waitForTimeout(900);
    return true;
  }
  // walk up to it: stand on a free tile beside it, facing it, then the prompt pill (a tap) or E
  async function useIt(p, use) {
    const spot = await p.evaluate((src) => {
      const f = src.fn ? new Function('return ' + src.fn)() : (i) => i.label === src.label;
      const W = BridgeWorld.getWorld(), i = W.interactions.find(f);
      if (!i) return null;
      const free = (x, y) => W.collisions[y] && W.collisions[y][x] === 0;
      const dirs = [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']];
      for (const d of dirs) if (free(i.x + d[0], i.y + d[1])) return { x: i.x + d[0], y: i.y + d[1], f: d[2], label: i.label };
      return { x: i.x, y: i.y + 1, f: 'up', label: i.label, blocked: true };
    }, typeof use === 'function' ? { fn: use.toString() } : { label: use });
    if (!spot) return { ok: false, why: 'not in this world' };
    await p.evaluate((s) => { BridgeCharacter.init(s.x, s.y); BridgeCharacter.setFacing(s.f); if (BridgeWorld.snapCamera) BridgeWorld.snapCamera(); }, spot);
    await p.waitForTimeout(900);
    const pill = await p.evaluate(() => { const e = document.getElementById('interact-prompt'); return e && e.classList.contains('visible') ? e.innerText.replace(/\s+/g, ' ') : ''; });
    if (await touchy(p)) { if (pill) await p.tap('#interact-prompt').catch(() => {}); }
    else await p.keyboard.press('e');
    await p.waitForTimeout(1300);
    let how = pill ? 'prompt "' + pill + '"' : 'no prompt';
    if (!(await openPanels(p)).length) {
      await p.evaluate((src) => { const f = src.fn ? new Function('return ' + src.fn)() : (i) => i.label === src.label; BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(f)); }, typeof use === 'function' ? { fn: use.toString() } : { label: use });
      await p.waitForTimeout(1300);
      how += ' (opened by hand)';
    }
    return { ok: true, how, label: spot.label };
  }
  const PANELS = '#world-overlay .world-dialog, #game-menu.open .gm-card, #darts.visible, #eights, #fishing, #transit-ride, #fish-reveal, #item-get, #festival-screen' +
    (global.PHONE_PANELS ? ', ' + global.PHONE_PANELS : '');
  const openPanels = (p) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter(e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 4 && r.height > 4;
  }).map(e => '#' + e.id + '.' + [...e.classList].join('.')), PANELS);

  // ---- the measure -----------------------------------------------------------------------------------------------------
  const audit = (p) => p.evaluate((sel) => {
    const vw = innerWidth, vh = innerHeight, out = [];
    const vis = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 4 && r.height > 4; };
    const panels = [...document.querySelectorAll(sel)].filter(vis);
    const name = (e) => (e.id ? '#' + e.id : '') + (e.className && e.className.baseVal === undefined ? '.' + String(e.className).trim().split(/\s+/).slice(0, 2).join('.') : '');
    panels.forEach(pn => {
      const r = pn.getBoundingClientRect();
      if (r.left < -1 || r.right > vw + 1) out.push(name(pn) + ' wider than the screen (' + Math.round(r.left) + '..' + Math.round(r.right) + ' of ' + vw + ')');
      if (r.top < -1 || r.bottom > vh + 1) out.push(name(pn) + ' off the screen (' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + vh + ')');
      // the controls: buttons and options, each at least 36 px on its short side
      const ctl = [...pn.querySelectorAll('button, .wd-opt, .wd-btn, .wd-sell-row.pick, [role=button], summary, .sp-b, .qj-close, .wd-hint, a[href], [data-act], [data-tab]')].filter(vis);
      // (exempt: the pack's slot grid, ten across by design, and the map's pins, whose tap reaches 9 px past the dot)
      const small = ctl.filter(e => { const b = e.getBoundingClientRect(); return !e.closest('.bp-slots, .gm-tabs') && !e.classList.contains('mp-pin') && Math.min(b.width, b.height) < 35.5; });
      if (small.length && document.documentElement.classList.contains('touch')) out.push(small.length + ' small: ' + small.slice(0, 6).map(e => { const b = e.getBoundingClientRect(); return '"' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18) + '" ' + Math.round(b.width) + 'x' + Math.round(b.height); }).join(', '));
      // nothing over a control in view (the coins' pill sat on the darts' close button)
      const over = ctl.filter(e => {
        const b = e.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2, pr = pn.getBoundingClientRect();
        if (cx < 0 || cy < 0 || cx > vw || cy > vh || cy < pr.top || cy > pr.bottom) return false;
        const h = document.elementFromPoint(cx, cy);
        return h && !e.contains(h) && !h.contains(e) && !pn.contains(h) && !h.closest('#fish-reveal');   // (a catch's card lies over the rod's panel until it's tapped away)
      });
      if (over.length) out.push(over.length + ' covered: ' + over.slice(0, 4).map(e => { const b = e.getBoundingClientRect(); const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return '"' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16) + '" by ' + name(h); }).join(', '));
      // the last of each list: scrolled to, inside the screen and the panel
      const lists = [...pn.querySelectorAll('.wd-options, .wd-sell, .wd-items, .wd-chooser')].filter(vis);
      lists.forEach(l => {
        const kids = [...l.children].filter(vis); if (!kids.length) return;
        const last = kids[kids.length - 1];
        last.scrollIntoView({ block: 'nearest' });
        const b = last.getBoundingClientRect(), pr = pn.getBoundingClientRect();
        if (b.bottom > Math.min(vh, pr.bottom) + 2 || b.top < Math.max(0, pr.top) - 2) out.push('last of ' + name(l) + ' unreachable ("' + last.textContent.trim().slice(0, 20) + '" at ' + Math.round(b.top) + '..' + Math.round(b.bottom) + ')');
        const hit = document.elementFromPoint(Math.min(vw - 2, Math.max(1, b.left + b.width / 2)), Math.min(vh - 2, Math.max(1, b.top + b.height / 2)));
        if (hit && !last.contains(hit) && !hit.contains(last)) out.push('last of ' + name(l) + ' covered by ' + name(hit));
      });
      pn.scrollTop = 0;
    });
    // nothing of the touch controls showing over an open screen
    if (panels.length && document.documentElement.classList.contains('touch')) {
      const ctlUp = [...document.querySelectorAll('.stick, .dpad-action, .dpad-item, #inventory-panel')].filter(e => vis(e) && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.05);
      if (ctlUp.length) out.push('the touch controls show over it: ' + ctlUp.map(name).join(' '));
    }
    return { panels: panels.map(name), problems: out };
  }, PANELS);
  // a way out by a tap: a close/back/goodbye control, or the card itself (a line said)
  async function closeByTap(p) {
    const before = await openPanels(p);
    if (!before.length) return true;
    const find = () => p.evaluate((sel) => {
      const vis = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 4 && r.height > 4; };
      const pns = [...document.querySelectorAll(sel)].filter(vis), pn = pns.find(e => e.matches('.world-dialog')) || pns.pop();   // a dialog over a panel first
      const els = [...pn.querySelectorAll('button, .wd-opt, .wd-btn, .wd-hint, .qj-close, [data-act], [role=button], .gm-x, .gm-close, .wd-sell-row.pick')].filter(vis);
      const e = els.find(e => /^(✕|×|close|goodbye|leave|done|back|not now|walk away|never mind|cancel|stand up|quit|that's all|bye|got it|keep sailing)\b/i.test(e.textContent.trim()) || /close|^back/i.test(e.getAttribute('aria-label') || '') || e.classList.contains('wd-hint') || e.classList.contains('qj-close'))
        || els.find(e => /(✕|×|close|goodbye|leave|done|not now|walk away|never mind|cancel)\s*$/i.test(e.textContent.trim()));
      document.querySelectorAll('[data-pp-closing]').forEach(x => x.removeAttribute('data-pp-closing')); pn.setAttribute('data-pp-closing', '1');
      const t = e || pn;
      t.scrollIntoView({ block: 'nearest' });
      const r = t.getBoundingClientRect();
      return { x: r.x + Math.min(r.width / 2, 40), y: r.y + Math.min(r.height / 2, 20), what: e ? e.textContent.trim().slice(0, 20) || e.className : 'the card' };
    }, PANELS);
    let box = await find();
    for (let i = 0; i < 8; i++) {                                         // (a long line: a page a tap)
      if (i) { const again = await p.evaluate(() => { const e = document.querySelector('[data-pp-closing]'); return !!(e && e.isConnected); }) && await openPanels(p); if (again && again.length) box = Object.assign(await find(), { what: box.what }); }   // (measured again: a card still sliding in moves)
      if (process.env.PP_DEBUG) console.log('  close: tap', JSON.stringify(box), await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) + '' : 'nothing'; }, [box.x, box.y]));
      await tapAt(p, box.x, box.y); await p.waitForTimeout(700);
      const gone = await p.evaluate(() => { const e = document.querySelector('[data-pp-closing]'); if (!e || !e.isConnected) return true; const c = getComputedStyle(e); return c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05 || e.getBoundingClientRect().width < 4; });
      if (gone) return box.what;                                            // (that screen: a panel under it, the fishing, may stay)
      if (box.what !== 'the card' && !/skip/i.test(box.what)) break;          // a line typing out: the first tap (on it, or its Skip) finishes it
    }
    return false;
  }

  for (const size of USE) {
    for (const S of SCREENS) {
      if (ONLY && ONLY.indexOf(S.id) < 0) continue;
      const p = await page(size, S.seed);
      try {
        if (S.time) await p.evaluate((t) => BridgeClock._at(t), S.time);
        if (S.prep) await p.evaluate(S.prep).catch(e => console.log(S.id, 'prep:', e.message.slice(0, 80)));
        await go(p, S.world, S.at[0], S.at[1]); await p.waitForTimeout(1500);
        let how = '';
        if (S.menu) { await p.evaluate((m) => BridgeMenu.open(m), S.menu); await p.waitForTimeout(1200); how = 'menu ' + S.menu; }
        else if (S.open) { await p.evaluate(S.open); await p.waitForTimeout(1200); how = 'opened by its module'; }   // (a screen a module opens from several places)
        else { const r = await useIt(p, S.use); if (!r.ok) { if (S.optional) console.log(size + ' ' + S.id + ': ' + r.why + ' (not on now)'); else fail(S.id + ': ' + r.why); await p.context().close(); continue; } how = r.how; }
        for (const t of (S.then || [])) { if (!await press(p, t)) console.log('  ' + S.id + ': no "' + t + '" to tap'); }
        if (S.act) await S.act(p);                                          // a screen got to by playing (a fish landed)
        await p.waitForTimeout(S.wait || 600);
        const a = await audit(p);
        await p.screenshot({ path: OUT + '/' + (global.PHONE_PREFIX || 'pp_') + S.id + '_' + size + '.png' });
        const out = await closeByTap(p);
        console.log(size + ' ' + S.id + ' [' + how + '] ' + a.panels.join(' ') + (a.problems.length ? '\n    ' + a.problems.join('\n    ') : ' ok') + (out ? '' : '\n    no way to close it by a tap'));
        if (!a.panels.length) fail(S.id + ' (' + size + '): nothing opened');
        a.problems.forEach(m => fail(S.id + ' (' + size + '): ' + m));
        if (!out) fail(S.id + ' (' + size + '): no way to close it by a tap');
      } catch (e) { fail(S.id + ' (' + size + '): ' + e.message.slice(0, 160)); }
      await p.context().close();
    }
  }
  if (global.PHONE_EXTRA) await global.PHONE_EXTRA({ page, go, useIt, press, audit, closeByTap, openPanels, tapAt, fail, OUT, ONLY });
  // ---- a plain line over the controls, and back as they were: walking, fishing, a line opened from another dialog ----
  if (!global.PHONE_SCREENS && (!ONLY || ONLY.indexOf('controls') >= 0)) {
    const p = await page('phone');
    const ctl = () => p.evaluate(() => ['.stick', '.dpad-action', '#inventory-panel'].map(q => { const e = document.querySelector(q); if (!e) return q + ':none'; const c = getComputedStyle(e); return q + ':' + (c.display === 'none' ? 'none' : c.visibility === 'hidden' || +c.opacity < 0.05 ? 'hidden' : 'shown'); }).join(' '));
    const sayAndClose = async (tag) => {
      const before = await ctl();
      await p.evaluate(() => BridgeInteractions.say('A NOTE', 'Somebody has carved their initials here, and a little boat.'));
      await p.waitForTimeout(500);
      const during = await ctl();
      await p.screenshot({ path: OUT + '/pp_controls_' + tag + '.png' });
      const out = await closeByTap(p);
      await p.waitForTimeout(400);
      const after = await ctl();
      console.log('controls ' + tag + ': before ' + before + ' | during ' + during + ' | after ' + after);
      if (/shown/.test(during)) fail('controls (' + tag + '): showing over a plain line: ' + during);
      if (!out) fail('controls (' + tag + '): the line didn\'t close by a tap');
      if (after !== before) fail('controls (' + tag + '): not back as they were: ' + before + ' → ' + after);
    };
    await go(p, 'lumar', 9, 16); await p.waitForTimeout(1500);
    await sayAndClose('walking');
    await p.evaluate(() => { BridgeCharacter.init(9, 15); BridgeCharacter.setFacing('down'); }); await p.waitForTimeout(800);
    await p.tap('#interact-prompt').catch(() => {}); await p.waitForTimeout(1200);
    if (await p.evaluate(() => BridgeFishing.isOpen())) {
      const a = await audit(p); a.problems.forEach(m => fail('fishing (phone): ' + m));      // the rod's own panel: its close in reach
      await sayAndClose('fishing');
      if (!(await p.evaluate(() => BridgeFishing.isOpen()))) fail('controls (fishing): closing the line put the rod away too');
    } else console.log('controls: no fishing off the pier here');
    await p.evaluate(() => { if (BridgeFishing.isOpen() && BridgeFishing.close) BridgeFishing.close(); }); await p.waitForTimeout(600);
    await go(p, 'lumar', 9, 13); await p.waitForTimeout(1200);
    // a line opened straight from a conversation (a dialog that opens another)
    const before = await ctl();
    if (!/stick:shown/.test(before)) fail('controls (chained): not up to begin with: ' + before);
    await p.evaluate(() => BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'HARBOURMASTER'))); await p.waitForTimeout(900);
    await p.evaluate(() => BridgeInteractions.say('THE HARBOUR BOOK', 'Every keel that ties up here, and what she carried.')); await p.waitForTimeout(500);
    const during = await ctl();
    await closeByTap(p); await p.waitForTimeout(400);
    const after = await ctl();
    console.log('controls chained: before ' + before + ' | during ' + during + ' | after ' + after);
    if (/shown/.test(during) || after !== before) fail('controls (chained): ' + during + ' → ' + after);
    await p.context().close();
  }

  // ---- the way there (js/route.js): the tracker's block for a place you asked the way to, and the pill's "this way" ----
  if (!global.PHONE_SCREENS && (!ONLY || ONLY.indexOf('way') >= 0)) {
    for (const size of USE) {
      const p = await page(size, { bridge_log_seen: JSON.stringify({ bridge: 1, hangar: 1, lumar: 1, 'lumar-square': 1, 'lumar-crown': 1, 'lumar-crown-oldtown': 1, 'lumar-crown-stilts': 1 }),
                                   bridge_quest_meta: JSON.stringify({ heard: { 'keepers-log': { t: 1, who: 'Hetty' } }, track: 'keepers-log' }) });
      await go(p, 'lumar', 9, 16); await p.waitForTimeout(1200);
      await p.evaluate(() => BridgeRoute.show('lumar-crown-stilts')); await p.waitForTimeout(1500);
      const t = await p.evaluate(() => {
        const vw = innerWidth, vh = innerHeight, e = document.querySelector('#quest-tracker.on'), out = [];
        if (!e) return { text: '', problems: ['no tracker'] };
        const r = e.getBoundingClientRect();
        if (r.left < 0 || r.right > vw || r.top < 0 || r.bottom > vh) out.push('the tracker off the screen ' + [r.left, r.top, r.right, r.bottom].map(Math.round));
        const s = e.querySelector('.qtr-stop'), b = s && s.getBoundingClientRect();
        if (!s) out.push('no Stop'); else if (Math.min(b.width, b.height) < 35.5) out.push('Stop is ' + Math.round(b.width) + 'x' + Math.round(b.height));
        else { const h = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); if (h && !s.contains(h)) out.push('Stop covered by ' + (h.id || h.className)); }
        [...document.querySelectorAll('#coin-hud, #journal-pill, #act-pill, #sound-pill, #chart-pill, #home-pill, #mp-pill')].forEach(o => { const q = o.getBoundingClientRect(); if (q.width && q.right > r.left && q.left < r.right && q.bottom > r.top && q.top < r.bottom) out.push('over ' + (o.id || o.className)); });
        return { text: e.innerText.replace(/\s+/g, ' '), problems: out };
      });
      await p.screenshot({ path: OUT + '/pp_way_' + size + '.png' });
      console.log(size + ' way: ' + t.text + (t.problems.length ? '\n    ' + t.problems.join('\n    ') : ' ok'));
      t.problems.forEach(m => fail('way (' + size + '): ' + m));
      if (!/Market Square|Harbour|ship|Crownhaven/i.test(t.text)) fail('way (' + size + '): no line in the tracker: ' + t.text);
      const tap = await p.evaluate(() => { const s = document.querySelector('.qtr-stop'); if (!s) return null; const b = s.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      if (tap) { await tapAt(p, tap[0], tap[1]); await p.waitForTimeout(1500); }
      const after = await p.evaluate(() => BridgeRoute.showing());
      if (after) fail('way (' + size + '): Stop didn\'t stop it');
      await p.context().close();
    }
  }

  // ---- a lead that names someone who's gone home for the night says when they're back (js/routines.js whereabouts) ----
  if (!global.PHONE_SCREENS && (!ONLY || ONLY.indexOf('lead') >= 0)) {
    const p = await page('phone');
    // through a day on Verdance's clock: Nell (the flower stall) is at her stall some of it and off home the rest
    const w = await p.evaluate(() => { const out = []; const t0 = Date.parse('2026-11-16T00:00:00Z'); for (let h = 0; h < 48; h++) { BridgeClock._at(t0 + h * 1800000); const a = BridgePeople.all().nell.at[0]; out.push(BridgeRoutines.whereabouts(a.world, a.label)); } return out; });
    const away = w.filter(x => x && x.away), there = w.filter(x => !x);
    console.log('lead: Nell over a day — away ' + away.length + ' half-hours (back ' + [...new Set(away.map(x => x.back))].join(', ') + '), there ' + there.length);
    if (!away.length || !there.length) fail('lead: Nell never away, or never there');
    if (away.some(x => !/morning|dawn|sunrise/.test(x.back))) fail('lead: Nell\'s back isn\'t the morning: ' + JSON.stringify(away[0]));
    await p.context().close();
  }

  console.log((global.PHONE_PREFIX ? 'phone_pass_old' : 'phone_pass') + ': errors', errors);
  await b.close();
  process.exit(errors ? 1 : 0);
})();
