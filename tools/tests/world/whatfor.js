// What things are for (js/uses.js, spec-deeper-worlds X1, X4, X6). The Backpack's item card names what a thing goes into,
// who loves it (by name only once you've met them), its Collection set, and plainly when it's only worth selling — on a
// desktop and a phone; a shop's row and the Collection's entry say the same. The Map: a marker's second line (what a
// dice table costs, what a person buys, a type the map has never heard of still marked plainly) and a place's
// *Come back for*. The Collection's new sets: an existing save holding a set's worth (pack and the ship's chest) is paid
// once, under one toast, and not again after a reload. node world/whatfor.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
const VALLEY = ['wolf_pelt', 'rime_shell', 'bat_wing', 'golem_core', 'wraith_essence', 'wyrm_scale'];
const BELOW = ['scrap_metal', 'circuit', 'chrome_part', 'sump_pearl', 'ruin_knuckles', 'dredge_heart'];
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  let errors = 0;
  const expect = (what, ok) => { console.log((ok ? 'ok  ' : 'BAD ') + what); if (!ok) errors++; };

  async function page(ctxOpts) {
    const p = await (await b.newContext(ctxOpts)).newPage();
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(([VALLEY, BELOW]) => {
      if (!localStorage.getItem('wf_seeded')) {                     // an existing save, from before the new sets
        localStorage.setItem('wf_seeded', '1');
        localStorage.setItem('bridge_ship_location', 'lumar');
        localStorage.setItem('bridge_codex', JSON.stringify({ found: { silverfin: 1, bread: 1 }, paid: {} }));
        const slots = ['pine_log', 'iron_ore', 'goldfish_bag', 'honey', 'seed_pumpkin'].concat(VALLEY.slice(0, 4)).concat(BELOW).map(id => ({ id, count: 2 }));
        localStorage.setItem('bridge.inventory.v2', JSON.stringify({ slots, selected: 0, hp: 100, maxHP: 100, energy: 100, maxEnergy: 100 }));
        localStorage.setItem('bridge_storage', JSON.stringify({ chests: { 'wayfarer-chest': [{ id: 'wraith_essence', count: 1 }, { id: 'wyrm_scale', count: 1 }] } }));
      }
      // every Collection payout and toast, counted from the first moment
      window._awards = []; window._toasts = [];
      let P, Q;
      Object.defineProperty(window, 'BridgeProgression', { configurable: true, get: () => P, set: (v) => {
        P = v; const a = v.awardCoins; v.awardCoins = function (n, why) { window._awards.push([n, why]); return a ? a.apply(v, arguments).catch(() => null) : Promise.resolve(null); };
      } });
      Object.defineProperty(window, 'BridgeQuests', { configurable: true, get: () => Q, set: (v) => {
        Q = v; const t = v.toast; v.toast = function (k, title, sub) { window._toasts.push([k, title, sub]); return t.apply(v, arguments); };
      } });
    }, [VALLEY, BELOW]);
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-11-14T13:00'); await p.waitForTimeout(5000);
    await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });
    return p;
  }
  const go = (p, w, at) => p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at ? { x: at[0], y: at[1] } : undefined }); r(); })), [w, at]);
  // the Backpack open on one item: its card's text
  async function card(p, id) {
    await p.evaluate(() => { if (!BridgeMenu.isOpen || !BridgeMenu.isOpen()) BridgeMenu.open('backpack'); });
    await p.waitForTimeout(500);
    return p.evaluate((id) => {
      const name = BridgeItems.get(id).name;
      const slot = [...document.querySelectorAll('#game-menu .bp-slot')].find(s => s.title.indexOf(name) === 0);
      if (!slot) return 'NO SLOT';
      slot.dispatchEvent(new MouseEvent('mouseenter'));
      const d = document.querySelector('#game-menu .bp-detail');
      return d ? d.innerText.replace(/\n+/g, ' | ') : 'NO CARD';
    }, id);
  }

  // ---- an existing save: the new sets it in effect holds pay once, under one toast ----------------------------------
  const p = await page({ viewport: { width: 1200, height: 800 } });
  const first = await p.evaluate(() => ({ awards: window._awards.filter(a => /^codex:/.test(a[1])), toasts: window._toasts.filter(t => t[0] === 'Collection'),
    paid: BridgeCodex._st().paid, since: BridgeCodex._st().since, news: window._toasts.filter(t => t[0] === 'New in your collection').length }));
  console.log('first start:', JSON.stringify(first));
  expect('the valley (four in the pack, two in the sea chest) and Below the street paid, once each', first.awards.length === 2 && first.paid.valley && first.paid.below &&
    first.awards.some(a => a[1] === 'codex:valley' && a[0] === 400));
  expect('one toast for both, no "new in your collection" spam', first.toasts.length === 1 && /2 sets complete/.test(first.toasts[0][1]) && first.news === 0);
  await p.reload(); await p.waitForTimeout(5000);
  const again = await p.evaluate(() => ({ awards: window._awards.filter(a => /^codex:/.test(a[1])).length, toasts: window._toasts.filter(t => t[0] === 'Collection').length }));
  console.log('after a reload:', JSON.stringify(again));
  expect('not paid again after a reload', again.awards === 0 && again.toasts === 0);
  const bon = await p.evaluate(() => ({ drop: BridgeCodex.dropK('wolf_pelt'), other: BridgeCodex.dropK('iron_ore'), below: BridgeCodex.bonus('below'), wood: BridgeCodex.bonus('wood'), says: BridgeCodex.BONUS.valley }));
  console.log('bonuses:', JSON.stringify(bon));
  expect('a finished new set gives its lasting bonus (the valley\'s drops a fifth more often), an unfinished one doesn\'t', bon.drop === 1.2 && bon.other === 1 && bon.below && !bon.wood);
  await p.evaluate(() => { BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide(); });

  // ---- the item card, on a desktop -----------------------------------------------------------------------------------
  await go(p, 'lumar-square', [16, 16]); await p.waitForTimeout(2500);
  const pine = await card(p, 'pine_log');
  console.log('pine log:', pine.slice(0, 400));
  expect('a recipe input: the Workshop and what it goes into', /USES/i.test(pine) && /Workshop: goes into Pine Plank and Pitch/.test(pine));
  const ore0 = await card(p, 'iron_ore');
  console.log('iron ore, before meeting Wat:', (ore0.match(/Loved[^|]*/) || ['(none)'])[0]);
  expect('a loved gift before meeting: someone in Brambleford', /Loved as a gift by someone in Brambleford/.test(ore0) && !/Wat/.test(ore0));
  await p.evaluate(() => { BridgeMenu.close(); BridgePeople.meet('wat'); });
  const ore1 = await card(p, 'iron_ore');
  console.log('iron ore, after:', (ore1.match(/Loved[^|]*/) || ['(none)'])[0]);
  expect('after meeting: by name', /Loved as a gift by Wat\b/.test(ore1));
  const pelt = await card(p, 'wolf_pelt');
  console.log('wolf pelt:', (pelt.match(/Collection[^|]*/) || ['(none)'])[0]);
  expect('a set member: its set and how far along', /Collection: The valley · 6 of 6, complete/.test(pelt));
  // a thing good for nothing but a sale (the goldfish was one, till it went in fish tanks: world/rumours.js): a stand-in,
  // so this stays true whatever gets a use next
  await p.evaluate(() => { const all = BridgeItems.all(); all.wf_trinket = { id: 'wf_trinket', name: 'Test Trinket', desc: 'A stand-in.', type: 'material', stackable: true, value: 5, draw: BridgeItems.get('stone').draw }; BridgeInventory.addItem('wf_trinket', 1); BridgeMenu.close(); });
  const fish = await card(p, 'wf_trinket');
  console.log('a trinket:', (fish.match(/Only worth[^|]*/) || ['(none)'])[0]);
  expect('only worth selling, said plainly', /Only worth selling/.test(fish));
  const honey = await card(p, 'honey');
  const more = await p.evaluate(() => { const d = document.querySelector('#game-menu .bp-detail .uses'); return d ? { shown: d.querySelectorAll(':scope > ul > li').length, more: (d.querySelector('summary') || {}).textContent || '' } : null; });
  console.log('honey:', JSON.stringify(more));
  expect('a busy item: three lines, the rest folded as "and N more"', more && more.shown === 3 && /^and \d+ more$/.test(more.more) && /Brew it with Mirelle/.test(honey));
  await p.evaluate(() => { const s = document.querySelector('#game-menu .uses-more summary'); if (s) s.click(); });
  await p.waitForTimeout(200);
  await (await p.$('#game-menu .bp-detail')).screenshot({ path: SHOTS + '/whatfor_card.png' });
  await p.screenshot({ path: SHOTS + '/whatfor_backpack.png' });
  const speed = await p.evaluate(() => { const t = performance.now(); for (let i = 0; i < 200; i++) BridgeUses.html('honey'); return performance.now() - t; });
  console.log('200 cards\' uses in', Math.round(speed), 'ms');
  expect('quick: a card\'s uses are drawn in well under a millisecond or two', speed < 400);
  // the Collection's entry, and a shop's row
  const cx = await p.evaluate(() => { BridgeMenu.open('collection'); return new Promise(r => setTimeout(() => {
    const tab = [...document.querySelectorAll('#game-menu .cx-tab')].find(x => x.textContent.indexOf('Materials') === 0); tab.click();
    setTimeout(() => { const c = [...document.querySelectorAll('#game-menu .cx-cell')].find(x => /Pine/.test(x.textContent)); if (c) c.click();
      r((document.querySelector('#game-menu .cx-detail') || {}).innerText || ''); }, 300); }, 500)); });
  console.log('the Collection\'s pine log:', cx.replace(/\n+/g, ' | ').slice(0, 300));
  expect('the Collection\'s entry says what it\'s for too', /Workshop: goes into/.test(cx));
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#game-menu .cx-tab')].map(x => x.textContent));
  console.log('sets:', tabs.join(' / '));
  expect('the new sets are in the Collection', ['The countryside', 'The wood', 'Below the street', 'The valley', 'Arcadia by night', 'Fellhaven fare'].every(n => tabs.some(t => t.indexOf(n) === 0)));
  await p.evaluate(() => BridgeMenu.close());
  const shop = await p.evaluate(() => { BridgeInteractions.execute({ type: 'vendor', label: 'TEST STALL', items: [{ id: 'seed_pumpkin', price: 12 }, { id: 'pine_log', price: 6 }] });
    return new Promise(r => setTimeout(() => r([...document.querySelectorAll('.wd-item-uses')].map(x => x.textContent)), 1200)); });
  console.log('a shop\'s rows:', JSON.stringify(shop));
  expect('a shop\'s row says what it\'s for', shop.some(t => /Plant it on the farm: Pumpkin/.test(t)) && shop.some(t => /Workshop/.test(t)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);

  // ---- the Map: a marker's second line, a plain marker for a type it doesn't know, Come back for -----------------------
  await go(p, 'hoarfell-lodge'); await p.waitForTimeout(2500);
  const lodge = await p.evaluate(() => BridgeMap.markers('hoarfell-lodge').map(m => m.cat + ':' + m.name + ':' + m.sub));
  console.log('the lodge:', lodge.join(' | ').slice(0, 500));
  expect('a dice table says what a game costs', lodge.some(m => /^game:Dice Table:Dice, 10–50 a game/.test(m)));
  const plain = await p.evaluate(() => { const w = BridgeWorld.getWorld();
    w.interactions.push({ x: 3, y: 3, type: 'board', label: 'NOTICE BOARD', prompt: 'PRESS E TO READ THE REQUESTS' });
    const m = BridgeMap.markers('hoarfell-lodge').find(x => x.name === 'Notice Board'); w.interactions.pop(); return m && m.cat + ':' + m.sub; });
  console.log('an interaction type the map doesn\'t know:', plain);
  expect('still gets a sensible plain marker', plain === 'use:Read the requests');
  await go(p, 'lumar-sapphire-market'); await p.waitForTimeout(2500);
  const stalls = await p.evaluate(() => BridgeMap.markers('lumar-sapphire-market').filter(m => m.cat === 'person').map(m => m.name + ': ' + m.sub));
  console.log('Sapphire\'s market, its people:', stalls.join(' | ').slice(0, 400));
  expect('a person\'s second line says what they buy, met or not', stalls.some(s => /· buys /.test(s)));
  await go(p, 'arcadia-scrapyard'); await p.waitForTimeout(2500);
  await p.evaluate(() => BridgeMenu.open('map')); await p.waitForTimeout(1800);
  const renew = await p.evaluate(() => (document.querySelector('#game-menu .mp-renew') || {}).innerText || '');
  console.log('the scrapyard, come back for:', renew.replace(/\n+/g, ' | '));
  expect('Come back for: the scrap piles once a day, Saint Ruin once a day', /scrap piles?, once a day/.test(renew) && /Saint Ruin, once a day/.test(renew));
  await p.evaluate(() => { const pin = [...document.querySelectorAll('#game-menu .mp-pin.mp-forage')][0]; if (pin) pin.click(); });
  await p.waitForTimeout(300);
  const tip = await p.evaluate(() => (document.querySelector('#game-menu .mp-info') || {}).innerText || '');
  console.log('a scrap pile\'s marker:', tip.replace(/\n+/g, ' | '));
  expect('a scrap pile\'s second line: once a day', /once a day/i.test(tip));
  await p.screenshot({ path: SHOTS + '/whatfor_map.png' });
  await p.evaluate(() => BridgeMenu.close());

  // ---- on a phone ------------------------------------------------------------------------------------------------------
  const ph = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await go(ph, 'lumar-square', [16, 16]); await ph.waitForTimeout(2500);
  const pc = await card(ph, 'honey');
  console.log('phone, honey:', pc.slice(0, 300));
  const fits = await ph.evaluate(() => { const u = document.querySelector('#game-menu .bp-detail .uses'); if (!u) return null; const r = u.getBoundingClientRect(); return { w: r.width, right: r.right, vw: innerWidth, sw: document.querySelector('#game-menu .gm-page').scrollWidth, cw: document.querySelector('#game-menu .gm-page').clientWidth }; });
  console.log('phone, the uses box:', JSON.stringify(fits));
  expect('on a phone: the Uses box fits the screen, no sideways scroll', fits && fits.right <= fits.vw + 1 && fits.sw <= fits.cw + 1 && /Uses/i.test(pc));
  await ph.evaluate(() => { const d = document.querySelector('#game-menu .bp-detail'); if (d) d.scrollIntoView(); });
  await ph.waitForTimeout(300);
  await (await ph.$('#game-menu .bp-detail')).screenshot({ path: SHOTS + '/whatfor_card_phone.png' });
  await ph.evaluate(() => BridgeMenu.close());
  await go(ph, 'arcadia-scrapyard'); await ph.waitForTimeout(2500);
  await ph.evaluate(() => BridgeMenu.open('map')); await ph.waitForTimeout(1800);
  const prenew = await ph.evaluate(() => (document.querySelector('#game-menu .mp-renew') || {}).innerText || '');
  expect('on a phone: Come back for on the Map', /once a day/.test(prenew));
  await ph.screenshot({ path: SHOTS + '/whatfor_map_phone.png' });

  // the to-do for other builders: what's still only worth selling
  const orphans = await p.evaluate(() => BridgeUses.orphans().map(o => o.id + ' (' + o.value + ')'));
  console.log('still only worth selling:', orphans.join(', '));
  console.log('errors', errors);
  await b.close();
})();
