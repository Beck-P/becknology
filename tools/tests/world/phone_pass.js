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
// to pick by its text); menu: a menu tab instead; seed: localStorage before the page loads; prep: run in the page first.
const SCREENS = [
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
  { id: 'journal', menu: 'journal', world: 'lumar', at: [9, 16] },
  { id: 'map', menu: 'map', world: 'lumar', at: [9, 16] },
  { id: 'pack', menu: 'backpack', world: 'lumar', at: [9, 16], prep: () => { BridgeInventory.addItem('silverfin', 2); BridgeInventory.addItem('wheat', 3); } },
  { id: 'ledger', menu: 'ledger', world: 'lumar', at: [9, 16] },
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
  const PANELS = '#world-overlay .world-dialog, #game-menu.open .gm-card, #darts.visible, #eights, #fishing, #transit-ride, #fish-reveal, #item-get, #festival-screen';
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
      const small = ctl.filter(e => { const b = e.getBoundingClientRect(); return Math.min(b.width, b.height) < 35.5; });
      if (small.length) out.push(small.length + ' small: ' + small.slice(0, 6).map(e => { const b = e.getBoundingClientRect(); return '"' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 18) + '" ' + Math.round(b.width) + 'x' + Math.round(b.height); }).join(', '));
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
    return { panels: panels.map(name), problems: out };
  }, PANELS);
  // a way out by a tap: a close/back/goodbye control, or the card itself (a line said)
  async function closeByTap(p) {
    const before = await openPanels(p);
    if (!before.length) return true;
    const box = await p.evaluate((sel) => {
      const vis = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 4 && r.height > 4; };
      const pn = [...document.querySelectorAll(sel)].filter(vis).pop();
      const els = [...pn.querySelectorAll('button, .wd-opt, .wd-btn, .wd-hint, .qj-close, [data-act], .gm-x, .gm-close, .wd-sell-row.pick')].filter(vis);
      const e = els.find(e => /^(✕|×|close|goodbye|leave|done|back|not now|walk away|never mind|cancel|stand up|quit|that's all|bye)/i.test(e.textContent.trim()) || /close/i.test(e.getAttribute('aria-label') || '') || e.classList.contains('wd-hint') || e.classList.contains('qj-close'))
        || els.find(e => /(✕|×|close|goodbye|leave|done|not now|walk away|never mind|cancel)\s*$/i.test(e.textContent.trim()));
      const t = e || pn;
      t.scrollIntoView({ block: 'nearest' });
      const r = t.getBoundingClientRect();
      return { x: r.x + Math.min(r.width / 2, 40), y: r.y + Math.min(r.height / 2, 20), what: e ? e.textContent.trim().slice(0, 20) || e.className : 'the card' };
    }, PANELS);
    for (let i = 0; i < 4; i++) {
      await tapAt(p, box.x, box.y); await p.waitForTimeout(700);
      if (!(await openPanels(p)).length) return box.what;
      if (box.what !== 'the card') break;                                   // a line typing out: the first tap finishes it
    }
    return false;
  }

  for (const size of USE) {
    for (const S of SCREENS) {
      if (ONLY && ONLY.indexOf(S.id) < 0) continue;
      const p = await page(size, S.seed);
      try {
        await go(p, S.world, S.at[0], S.at[1]); await p.waitForTimeout(1500);
        if (S.prep) await p.evaluate(S.prep).catch(e => console.log(S.id, 'prep:', e.message.slice(0, 80)));
        let how = '';
        if (S.menu) { await p.evaluate((m) => BridgeMenu.open(m), S.menu); await p.waitForTimeout(1200); how = 'menu ' + S.menu; }
        else { const r = await useIt(p, S.use); if (!r.ok) { fail(S.id + ': ' + r.why); await p.context().close(); continue; } how = r.how; }
        for (const t of (S.then || [])) { if (!await press(p, t)) console.log('  ' + S.id + ': no "' + t + '" to tap'); }
        await p.waitForTimeout(S.wait || 600);
        const a = await audit(p);
        await p.screenshot({ path: OUT + '/pp_' + S.id + '_' + size + '.png' });
        const out = await closeByTap(p);
        console.log(size + ' ' + S.id + ' [' + how + '] ' + a.panels.join(' ') + (a.problems.length ? '\n    ' + a.problems.join('\n    ') : ' ok') + (out ? '' : '\n    no way to close it by a tap'));
        if (!a.panels.length) fail(S.id + ' (' + size + '): nothing opened');
        a.problems.forEach(m => fail(S.id + ' (' + size + '): ' + m));
        if (!out) fail(S.id + ' (' + size + '): no way to close it by a tap');
      } catch (e) { fail(S.id + ' (' + size + '): ' + e.message.slice(0, 160)); }
      await p.context().close();
    }
  }
  console.log('phone_pass: errors', errors);
  await b.close();
  process.exit(errors ? 1 : 0);
})();
