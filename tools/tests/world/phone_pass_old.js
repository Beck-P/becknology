// The phone pass over the game's older screens (the second ease pass, November 15): the same checks as world/phone_pass.js
// — no panel wider than the screen or off its foot, every control at least 36 px, nothing drawn over a control, the last
// entry of a long list reachable, the touch controls gone while it's up, a way to close it by a tap — on the menu's tabs,
// shops and storage, the sea, making and running things, the games, getting around and fighting.
// Shots po_<screen>_<size>.png in OUT.   node world/phone_pass_old.js [shots dir] [screen ids, comma-separated] [sizes]
const fillPack = () => { ['silverfin', 'wheat', 'moonflower', 'posy', 'fondue', 'farm_cheese', 'silk_cocoon', 'owlmoss', 'medkit', 'iron_ore', 'rope', 'lumber', 'apple', 'egg', 'milk', 'bread', 'coffee', 'cod', 'herring', 'pumpkin'].forEach((id, n) => { try { BridgeInventory.addItem(id, 1 + n % 4); } catch (e) {} }); };

const HOLM = JSON.stringify({ owned: true, name: 'Starling Holm', built: { house: 1, dock: 1, workshop: 1, slipway: 1 }, store: {}, chest: 0, log: [] });
const FLEET = JSON.stringify({ ships: [{ id: 'gull', type: 'sloop', name: 'Little Gull', at: null, hull: 1, hold: {}, guns: [], fits: [] }, { id: 'c2', type: 'cutter', name: 'Swift', at: 'lumar', hull: 0.6, hold: { timber: 2, salt_fish: 4 }, guns: [], fits: [] }], sailing: 'gull', n: 2, crew: [], cn: 0, hired: {} });
global.PHONE_PREFIX = 'po_';
global.PHONE_PANELS = '#splice.visible .sp-panel, #pachinko.visible .pk-panel, #letter-rack.visible .lr-panel, #fell-dice.visible .fd-panel, #quest-journal.visible .qj-panel, ' +
  '#sloop-menu, #starmap-overlay, #locker-overlay, #catalog-overlay, #stats-overlay, #cabinet-modal-overlay, #sea-chart, #gear-dialog, #treasure-map, #trade-panel, #view-panel, #tank-view, #glassblow, #dance-hud, #home-tray';
global.PHONE_SCREENS = [
  // ---- the menu, every tab, a full pack ----
  { id: 'm_pack', menu: 'backpack', world: 'lumar', at: [9, 16], prep: fillPack },
  { id: 'm_map', menu: 'map', world: 'lumar-square', at: [11, 12] },
  { id: 'm_journal', menu: 'journal', world: 'lumar', at: [9, 16] },
  { id: 'm_journal_long', menu: 'journal', world: 'lumar', at: [9, 16],                      // a long log and quests under way: it scrolls, its last line reachable
    seed: { bridge_log: JSON.stringify(Array.from({ length: 250 }, (_, i) => ({ at: 1763000000000 - i * 3600000, k: i % 3 ? 'Clue' : 'Found', t: 'Something worth remembering, number ' + i, s: 'somewhere on Lumar, by the harbour', w: 'Lumar Harbor' }))),
            bridge_quests: JSON.stringify({ 'eddas-book': { clues: { gossip: 1 }, started: 1 }, admiral: { clues: { crier: 1 }, started: 1 }, 'thaelins-verse': { clues: { ask: 1 }, started: 1 } }) },
    act: async (p) => { const r = await p.evaluate(() => { const pg = document.querySelector('#game-menu .gm-page'); if (!pg) return 'no page'; pg.scrollTop = pg.scrollHeight; const last = [...pg.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim()).pop(); const b = last.getBoundingClientRect(); return b.bottom <= innerHeight + 1 ? 'ok' : 'the foot of the journal is off the screen (' + Math.round(b.bottom) + ')'; }); if (r !== 'ok') throw new Error(r); } },
  { id: 'm_fish', menu: 'fish', world: 'lumar', at: [9, 16] },
  { id: 'm_coll', menu: 'collection', world: 'lumar', at: [9, 16] },
  { id: 'm_ledger', menu: 'ledger', world: 'lumar', at: [9, 16] },
  { id: 'm_neon', menu: 'backpack', world: 'arcadia-street', at: [20, 10], prep: fillPack },
  // ---- shops, storage, trading ----
  { id: 'chandler', world: 'bridge', at: [16, 12], use: "SHIP'S CHANDLER" },
  { id: 'cashier', world: 'arcadia-shop', at: [10, 8], use: 'CASHIER' },
  { id: 'vendor', world: 'arcadia-atrium', at: [4, 5], use: 'NOVA' },
  { id: 'seachest', world: 'bridge', at: [4, 12], use: 'SEA CHEST', prep: fillPack },
  { id: 'locker', world: 'quarters', at: [12, 10], use: 'STORAGE LOCKER', prep: fillPack },
  { id: 'catalog', world: 'quarters', at: [14, 10], use: 'CATALOG TERMINAL' },
  // ---- the ship ----
  { id: 'logs', world: 'bridge', at: [1, 5], use: "SHIP'S LOGS" },
  { id: 'letters', world: 'bridge', at: [18, 5], use: 'LETTER RACK' },
  { id: 'warp', world: 'bridge', at: [9, 9], use: 'WARP MAP' },
  { id: 'galley', world: 'ship-galley', at: [8, 7], use: 'THE PASS' },
  // ---- the sea, harbours ----
  { id: 'seachart', world: 'lumar-crown-office', at: [5, 5], use: 'THE FIVE SEAS' },
  // ---- the harbours (js/harbour.js), the holm's workshop and slipway ----
  { id: 'harbour', world: 'lumar', at: [9, 14], open: () => BridgeHarbour.open('lumar'), seed: { bridge_fleet: FLEET } },
  { id: 'yard', world: 'lumar', at: [9, 14], open: () => BridgeHarbour.yard('lumar'), seed: { bridge_fleet: FLEET } },
  { id: 'repairs', world: 'lumar', at: [9, 14], open: () => BridgeHarbour.repairs('lumar'), seed: { bridge_fleet: FLEET } },
  { id: 'hands', world: 'lumar', at: [9, 14], open: () => BridgeHarbour.hands('lumar'), seed: { bridge_fleet: FLEET } },
  { id: 'contracts', world: 'lumar', at: [9, 14], open: () => BridgeHarbour.open('lumar'), then: ['Contracts'], seed: { bridge_fleet: FLEET } },
  { id: 'market', world: 'lumar', at: [9, 14], open: () => BridgeHarbour.open('lumar'), then: ['Market'], seed: { bridge_fleet: FLEET } },
  { id: 'workshop', world: 'lumar-holm', at: [13, 11], use: (i) => i.act === 'workshop', seed: { bridge_holm: HOLM, bridge_fleet: FLEET } },
  { id: 'slipway', world: 'lumar-holm', at: [13, 11], use: (i) => i.act === 'slipway', seed: { bridge_holm: HOLM, bridge_fleet: FLEET } },
  // ---- making and running things ----
  { id: 'desk', world: 'office', at: [7, 6], use: "CAPTAIN'S DESK" },
  { id: 'toolshed', world: 'verdance', at: [20, 8], use: 'TOOL SHED' },
  { id: 'stand', world: 'verdance-downs', at: [21, 17], use: 'THE FARM STAND' },
  { id: 'kitchen', world: 'verdance-home', at: [11, 5], use: 'KITCHEN TABLE' },
  // ---- games ----
  { id: 'splice', world: 'null-den', at: [7, 4], use: 'THE RIG' },
  { id: 'pachinko', world: 'arcadia-lucky-7', at: [1, 3], use: 'SEVEN SEAS' },
  { id: 'prizes', world: 'arcadia-lucky-7', at: [9, 4], use: 'PRIZE COUNTER' },
  { id: 'felldice', world: 'hoarfell-lodge', at: [13, 7], use: 'DICE TABLE' },
  { id: 'felldice_game', world: 'hoarfell-lodge', at: [13, 7], use: 'DICE TABLE', then: ['10 coins'], wait: 2500 },
  { id: 'cabinet', world: 'arcadia', at: [3, 3], use: 'ASTEROIDS' },
  { id: 'chess', world: 'quarters', at: [4, 7], use: 'CHESS TABLE' },
  { id: 'holdem', world: 'arcadia-casino-cards', at: [4, 7], use: "TEXAS HOLD'EM" },
  { id: 'dance', world: 'arcadia-club', at: [9, 7], use: 'DANCE FLOOR' },
  { id: 'dance_game', world: 'arcadia-club', at: [9, 7], use: 'DANCE FLOOR', then: ['on the beat'], wait: 3000 },
  // ---- getting around ----
  { id: 'lift', world: 'arcadia-skywalk', at: [2, 5], use: 'LIFT · STREET' },
  { id: 'aircab', world: 'arcadia-skypad', at: [18, 12], use: 'AIR CAB' },
  { id: 'loop', world: 'arcadia-oldquarter', at: [33, 9], use: 'THE LOOP' },
  { id: 'train', world: 'hoarfell-promenade', at: [30, 25], use: 'THE TRAIN' },
  { id: 'departures', world: 'hoarfell-promenade', at: [14, 25], use: 'DEPARTURES' },
  { id: 'routes', world: 'hoarfell', at: [10, 11], use: 'ROUTE BOARD' },
  { id: 'skigate', world: 'hoarfell-summit', at: [8, 13], use: 'START GATE' },
  // ---- fighting ----
  { id: 'implants', world: 'arcadia-chopshop', at: [6, 8], use: 'THE CHAIR' },
  { id: 'cage', world: 'arcadia-pit', at: [18, 19], use: 'THE CAGE' },
];

// ---- a plain line over the controls while riding, sailing and in a fight (the morning's pass checked walking, fishing and
// a line opened from a conversation); the sloop's own screens on a phone: its HUD, the menu at the tiller, how to sail ----
global.PHONE_EXTRA = async ({ page, go, useIt, press, audit, closeByTap, tapAt, fail, OUT, ONLY }) => {
  if (ONLY && !['ride', 'sea', 'fight', 'huds', 'pills'].some(k => ONLY.indexOf(k) >= 0)) return;
  // ---- the HUD's pills on a phone, walking (the way back, the Menu, the sound, the chart, Furnish, the players): each a finger's worth ----
  if (!ONLY || ONLY.indexOf('pills') >= 0) {
    for (const [w, x, y] of [['lumar', 9, 16], ['bridge', 10, 10]]) {
      const p = await page('small');
      await go(p, w, x, y); await p.waitForTimeout(2500);
      const r = await p.evaluate(() => [...document.querySelectorAll('.world-back, #journal-pill, #sound-pill, #chart-pill, #home-pill, #mp-pill, #quest-tracker .qt-min, .tc-pill, #act-pill')].filter(e => { const c = getComputedStyle(e), b = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 4; })
        .map(e => { const b = e.getBoundingClientRect(); return { n: (e.id || e.className).toString().split(' ')[0], w: Math.round(b.width), h: Math.round(b.height) }; }));
      await p.screenshot({ path: OUT + '/po_pills_' + w + '.png' });
      console.log('pills ' + w + ': ' + r.map(q => q.n + ' ' + q.w + 'x' + q.h).join(', '));
      r.filter(q => Math.min(q.w, q.h) < 35.5).forEach(q => fail('pills ' + w + ': ' + q.n + ' ' + q.w + 'x' + q.h + ' (under 36)'));
      await p.context().close();
    }
  }
  // ---- the HUDs of play (a ski run, a climb, a fight in the cage): nothing of them off the screen, and nothing
  // of them under the touch stick and buttons, which stay up while you play ----
  if (!ONLY || ONLY.indexOf('huds') >= 0) {
    const HUDS = [
      { id: 'ski', world: 'hoarfell-summit', use: 'START GATE', prep: () => BridgeInventory.addItem('skis', 1), then: ['Race The Nursery Slope'], wait: 5000 },
      { id: 'climb', world: 'hoarfell-face', use: 'THE STAIRCASE', then: [], wait: 4000 },
      { id: 'cage', world: 'arcadia-pit', use: 'THE CAGE', then: ['Climb in'], close: true, wait: 4000 },
    ];
    for (const size of ['phone', 'small']) for (const H of HUDS) {
      const p = await page(size);
      try {
        if (H.prep) await p.evaluate(H.prep).catch(() => {});
        await go(p, H.world, (H.at || [5, 5])[0], (H.at || [5, 5])[1]); await p.waitForTimeout(1500);
        if (H.use) await useIt(p, H.use);
        for (const t of (H.then || [])) await press(p, t);
        if (H.close) { await p.waitForTimeout(1500); await closeByTap(p); }               // (the line that starts it, read)
        await p.waitForTimeout(H.wait || 2000);
        await p.screenshot({ path: OUT + '/po_hud_' + H.id + '_' + size + '.png' });
        const r = await p.evaluate(() => {
          const vw = innerWidth, vh = innerHeight, out = [];
          const vis = (e) => { const c = getComputedStyle(e), b = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 4 && b.height > 4; };
          const nm = (e) => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '') || e.tagName;
          const ctl = [...document.querySelectorAll('.stick, .dpad-action, .dpad-item, #sf-fire')].filter(vis);
          const hud = [...document.querySelectorAll('.sport-hud *, #ski-hud *, #climb-hud *, #quest-tracker, #coin-hud, .world-watch, #dance-hud *, [class*="-hud"] > *')].filter(e => vis(e) && e.children.length === 0 && (e.textContent || '').trim());
          const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
          hud.forEach(h => { const b = h.getBoundingClientRect();
            if (b.left < -1 || b.right > vw + 1 || b.top < -1 || b.bottom > vh + 1) out.push(nm(h) + ' "' + h.textContent.trim().slice(0, 20) + '" off the screen');
            ctl.forEach(c => { if (hit(b, c.getBoundingClientRect())) out.push(nm(h) + ' "' + h.textContent.trim().slice(0, 20) + '" under ' + nm(c)); }); });
          return { hud: hud.length, ctl: ctl.map(nm).join(' '), problems: [...new Set(out)] };
        });
        console.log('hud ' + H.id + ' (' + size + '): ' + r.hud + ' bits of HUD, controls ' + r.ctl + (r.problems.length ? '\n    ' + r.problems.join('\n    ') : ' ok'));
        r.problems.forEach(m => fail('hud ' + H.id + ' (' + size + '): ' + m));
      } catch (e) { fail('hud ' + H.id + ' (' + size + '): ' + e.message.slice(0, 120)); }
      await p.context().close();
    }
  }
  const CTL = ['.stick', '.dpad-action', '#inventory-panel', '#sloop-menu-btn', '#sloop-chart-btn', '#sf-fire', '#chart-pill'];
  const ctl = (p) => p.evaluate((qs) => qs.map(q => { const e = document.querySelector(q); if (!e) return q + ':none'; const c = getComputedStyle(e); const r = e.getBoundingClientRect();
    return q + ':' + (c.display === 'none' || r.width < 2 ? 'none' : c.visibility === 'hidden' || +c.opacity < 0.05 ? 'hidden' : 'shown'); }).join(' '), CTL);
  // a line said over it: nothing of the controls on top of the card, and back as they were after
  const sayOver = async (p, tag) => {
    const before = await ctl(p);
    await p.evaluate(() => BridgeInteractions.say('A NOTE', 'Somebody has carved their initials here, and a little boat.')); await p.waitForTimeout(600);
    const a = await audit(p), during = await ctl(p);
    if (/^(sea|fight)/.test(tag)) {                                       // at sea the island's way back and name stay under the sloop
      const land = await p.evaluate(() => { const e = document.getElementById('world-back'); if (!e) return false; const c = getComputedStyle(e), r = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 2 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) && e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
      if (land) fail(tag + ': the island\'s way back shows over the sloop while a line is up');
    }
    await p.screenshot({ path: OUT + '/po_' + tag + '_line.png' });
    const over = await p.evaluate(() => { const d = document.querySelector('#world-overlay .world-dialog'); if (!d) return 'no card';
      const r = d.getBoundingClientRect(), out = [];
      for (let x = r.left + 6; x < r.right; x += 24) for (let y = r.top + 6; y < r.bottom; y += 18) { const h = document.elementFromPoint(x, y); if (h && !d.contains(h)) out.push((h.id || h.className || h.tagName) + ''); }
      return [...new Set(out)].join(' '); });
    const out = await closeByTap(p); await p.waitForTimeout(500);
    const after = await ctl(p);
    console.log(tag + ': before ' + before + ' | during ' + during + ' | after ' + after + (over ? ' | over the card: ' + over : ''));
    a.problems.forEach(m => fail(tag + ' line: ' + m));
    if (/stick:shown|dpad-action:shown|inventory-panel:shown/.test(during)) fail(tag + ': the touch controls show over a line: ' + during);
    if (over) fail(tag + ': something over the line\'s card: ' + over);
    if (!out) fail(tag + ': the line didn\'t close by a tap');
    if (after !== before) fail(tag + ': not back as they were: ' + before + ' → ' + after);
  };
  if (!ONLY || ONLY.indexOf('ride') >= 0) {
    const p = await page('phone', { bridge_country: JSON.stringify({ horse: { coat: 'bay', name: 'Clover' }, riding: 'horse' }) });
    await go(p, 'verdance-east', 20, 18); await p.waitForTimeout(1500);
    console.log('ride: riding ' + await p.evaluate(() => BridgeCountryside.riding()));
    await sayOver(p, 'ride');
    await p.context().close();
  }
  if (!ONLY || ONLY.indexOf('sea') >= 0 || ONLY.indexOf('fight') >= 0) {
    for (const size of ['phone', 'small']) {
      const p = await page(size);
      await go(p, 'lumar', 9, 16); await p.waitForTimeout(1200);
      await p.evaluate(() => BridgeSloop.start('lumar', null, { aboard: true })); await p.waitForTimeout(6000);
      await p.screenshot({ path: OUT + '/po_sea_howto_first_' + size + '.png' });   // (the first time out, how to sail comes up by itself)
      { const h = await audit(p); h.problems.forEach(m => fail('sea how-to, first time (' + size + '): ' + m)); }
      await p.evaluate(() => { const m = document.getElementById('sloop-menu'); if (m) { const b = [...m.querySelectorAll('button')].find(e => /Got it|Keep sailing/.test(e.textContent)); b && b.click(); } }); await p.waitForTimeout(600);
      await p.screenshot({ path: OUT + '/po_sea_hud_' + size + '.png' });
      const small = await p.evaluate(() => ['#sloop-menu-btn', '#sloop-chart-btn'].map(q => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 2 && Math.min(r.width, r.height) < 36 ? q + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) : null; }).filter(Boolean));
      small.forEach(m => fail('sea (' + size + '): small: ' + m));
      if (!ONLY || ONLY.indexOf('sea') >= 0) {
        await sayOver(p, 'sea_' + size);
        // the menu at the tiller, by a tap on ⋯
        const btn = await p.evaluate(() => { const e = document.getElementById('sloop-menu-btn'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
        if (!btn) fail('sea (' + size + '): no ⋯ button at the tiller');
        else {
          await tapAt(p, btn[0], btn[1]); await p.waitForTimeout(700);
          const a = await audit(p); await p.screenshot({ path: OUT + '/po_sea_menu_' + size + '.png' });
          console.log('sea menu (' + size + '): ' + a.panels.join(' ') + (a.problems.length ? '\n    ' + a.problems.join('\n    ') : ' ok'));
          if (!a.panels.length) fail('sea (' + size + '): the menu at the tiller didn\'t open');
          a.problems.forEach(m => fail('sea menu (' + size + '): ' + m));
          // how to sail, from it
          const how = await p.evaluate(() => { const b = [...document.querySelectorAll('#sloop-menu button')].find(e => /How to sail/.test(e.textContent)); if (!b) return null; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
          if (how) {
            await tapAt(p, how[0], how[1]); await p.waitForTimeout(700);
            const h = await audit(p); await p.screenshot({ path: OUT + '/po_sea_howto_' + size + '.png' });
            console.log('sea how-to (' + size + '): ' + h.panels.join(' ') + (h.problems.length ? '\n    ' + h.problems.join('\n    ') : ' ok'));
            h.problems.forEach(m => fail('sea how-to (' + size + '): ' + m));
            if (!(await closeByTap(p))) fail('sea how-to (' + size + '): no way to close it by a tap');
          } else fail('sea (' + size + '): no How to sail in the menu');
          await p.evaluate(() => { const m = document.getElementById('sloop-menu'); if (m) { const b = [...m.querySelectorAll('button')].find(e => /Keep sailing|Got it/.test(e.textContent)); b && b.click(); } }); await p.waitForTimeout(400);
        }
      }
      if (!ONLY || ONLY.indexOf('fight') >= 0) {
        await p.evaluate(() => BridgeSeaFight._spawn('cutter'));
        await p.waitForFunction(() => !!document.getElementById('sloop-menu'), null, { timeout: 10000 }).catch(() => {});   // her hail, answered before the line
        await p.waitForTimeout(400);
        await p.evaluate(() => { const m = document.getElementById('sloop-menu'); if (m) { const bs = [...m.querySelectorAll('button')].filter(e => !e.disabled), b = bs.find(e => /^Fight/.test(e.textContent)) || bs.find(e => /Run for it|Got it/.test(e.textContent)); b && b.click(); } }); await p.waitForTimeout(1500);
        await p.screenshot({ path: OUT + '/po_fight_hud_' + size + '.png' });
        await sayOver(p, 'fight_' + size);
      }
      await p.context().close();
    }
  }
};
require('./phone_pass.js');
