// The first hour (quests.json `first-hour`, Learning the Ropes; js/quests.js deeds, invitations, setting aside): a new
// pilot signs up on the title page and is offered it (a rumour from a letter on the bridge, the ship parked over Lumar);
// takes the shuttle down; Bess Tolliver on the pier begins it; each step is done for real — a fish landed off the pier,
// sold to Bess, ship's biscuit bought from her tin, the Gull taken out and put back, the way back up to the ship — and it
// ends with the coins, her pennant in the pack and the next rumour (The Ship Mark). Played through on a desktop by day
// and on a phone at night in a storm (with the fish stall shut). Then: set aside from the tracker, across a reload, Bess
// not starting it while it's set aside, picked up again by asking her; set aside mid-way from the journal, deeds not
// counting while it is, picked up with the journal's button; an existing save never pulled in (no rumour, no gold !,
// Bess doesn't begin it, a returning sign-in isn't welcomed) though it can ask Bess for it. Shots fh_*.png in OUT.
// node world/firsthour.js [shots dir]
const CHROME = require(__dirname + '/../chrome.js');
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/../shots';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8766/?at=';
const DAY = '2026-10-17T13:00', NIGHT = '2026-10-17T09:00';      // Lumar midday, and the middle of the night
let errors = 0;
const fail = (m) => { errors++; console.log('FAILED: ' + m); };
const Q = 'first-hour';

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };

  async function open(name, o) {
    const ctx = o.ctx || await b.newContext(o.phone ? PHONE : { viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => { errors++; console.log(name, 'PAGEERR', e.message.slice(0, 200)); });
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) { errors++; console.log(name, 'CONSOLE-ERR', m.text().slice(0, 200)); } });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    if (o.init) await p.addInitScript(o.init);
    await p.goto(URL + (o.at || DAY), { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.waitForFunction(() => typeof BridgeIntro !== 'undefined' && BridgeIntro._state().booted, null, { timeout: 60000 }).catch(() => console.log(name, 'the title was slow'));
    await p.waitForTimeout(1200);
    await coins(p);
    return { p, ctx };
  }
  // a purse that answers (the Supabase CDN is blocked here)
  const coins = (p) => p.evaluate(() => {
    window._coins = window._coins || 0;
    BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false, reason: 'coins' }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); };
    BridgeProgression.getBalance = () => Promise.resolve(window._coins);
    BridgeProgression.recordAchievement = (k, n) => { window._coins += n; window._ach = (window._ach || []).concat(k); return Promise.resolve(true); };
  });
  const st = (p) => p.evaluate((Q) => ({ prog: BridgeQuests.progress(Q), offered: BridgeQuests.offered(Q), aside: BridgeQuests.aside(Q), tracked: BridgeQuests.tracked(),
                                          rumours: BridgeQuests.rumours(), world: BridgeWorld.getWorldId && BridgeWorld.getWorldId() }), Q);
  const tracker = (p) => p.evaluate(() => { const t = document.getElementById('quest-tracker'); return t && t.classList.contains('on') && getComputedStyle(t).display !== 'none' ? t.innerText.replace(/\s+/g, ' ') : ''; });
  const shot = (p, f) => p.screenshot({ path: OUT + '/' + f });
  const waitWorld = (p, w, ms) => p.waitForFunction((w) => BridgeState.getState() === 'world' && BridgeWorld.getWorldId() === w && BridgeWorld.isActive(), w, { timeout: ms || 40000 }).then(() => true, () => false);
  const found = (p, n, ms) => p.waitForFunction(([Q, n]) => (BridgeQuests.progress(Q) || {}).found >= n, [Q, n], { timeout: ms || 8000 }).then(() => true, () => false);
  const touchy = (p) => p.evaluate(() => document.documentElement.classList.contains('touch'));
  // stand at x,y facing f and use whatever's there: E on a desktop, a tap on the prompt pill on a phone
  async function use(p, x, y, f) {
    await p.evaluate(([x, y, f]) => { BridgeCharacter.init(x, y); BridgeCharacter.setFacing(f); }, [x, y, f]);
    await p.waitForTimeout(700);
    if (await touchy(p)) {
      const ok = await p.evaluate(() => { const e = document.getElementById('interact-prompt'); return !!(e && e.classList.contains('visible')); });
      if (!ok) console.log('  (no prompt pill showing at ' + x + ',' + y + ')');
      await p.tap('#interact-prompt').catch(() => p.keyboard.press('e'));
    } else await p.keyboard.press('e');
    await p.waitForTimeout(1300);
  }
  const click = async (p, sel, text) => {
    const box = await p.evaluate(([sel, text]) => { const e = [...document.querySelectorAll(sel)].find(e => !text || e.textContent.trim().indexOf(text) === 0); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, [sel, text]);
    if (!box) return false;
    if (await touchy(p)) await p.touchscreen.tap(box[0], box[1]); else await p.mouse.click(box[0], box[1]);
    await p.waitForTimeout(500);
    return true;
  };
  const topics = (p) => p.evaluate(() => [...document.querySelectorAll('.wd-convo .wd-opt')].map(e => e.textContent + (e.classList.contains('nudge') ? '*' : '')));
  const shut = async (p) => { for (let i = 0; i < 4 && await p.evaluate(() => !!document.getElementById('world-dialog')); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); } };
  const BESS = [9, 14, 'up'], FISH = [9, 15, 'down'], DOCK = [8, 15, 'down'];

  // a new pilot from the title page: New pilot, a callsign, Register
  async function signUp(p, name) {
    await p.evaluate(() => { BridgeDB.createPilot = async (n, c) => ({ id: 'new-' + n + '-' + Date.now(), name: n, suit_color: c }); });
    const hit = await p.evaluate(() => { const e = [...document.querySelectorAll('.ti-item, button, [data-i]')].find(e => /^new pilot$/i.test((e.innerText || '').trim())); if (e) { e.click(); return true; } return false; });
    if (!hit) await p.evaluate(() => BridgeIdentity.show({ form: 'new' }));
    await p.waitForSelector('#pilot-name', { timeout: 8000 });
    await p.fill('#pilot-name', name);
    await p.click('#btn-register');
    if (!await waitWorld(p, 'bridge', 45000)) fail('the new pilot never reached the bridge');
    await coins(p);
    await p.waitForFunction((Q) => BridgeQuests.offered(Q), Q, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(1500);
  }

  // ---- the whole thing, as a new pilot -------------------------------------------------------------------------------
  async function playThrough(tag, o) {
    const { p, ctx } = await open(tag, o);
    if (o.storm) await p.evaluate(() => BridgeWeather._pin('lumar', 'storm'));
    await signUp(p, tag === 'wide' ? 'NEWBIE' : 'PIP');
    let s = await st(p);
    const loc = await p.evaluate(() => localStorage.getItem('bridge_ship_location'));
    console.log(tag + ' on the bridge: offered ' + s.offered + ', rumours ' + s.rumours.join() + ', ship over ' + loc + ' | tracker: ' + await tracker(p));
    if (!s.offered || s.rumours.indexOf(Q) < 0) fail(tag + ': a new pilot isn\'t offered the first hour');
    if (loc !== 'lumar') fail(tag + ': the new pilot\'s ship isn\'t over Lumar: ' + loc);
    if (!/Learning the Ropes/.test(await tracker(p)) || !/hangar/i.test(await tracker(p))) fail(tag + ': the tracker isn\'t leading to the shuttle: ' + await tracker(p));
    await shot(p, 'fh_' + tag + '_1_bridge.png');

    // down: the hangar door, the shuttle
    await use(p, 1, 9, 'left');
    if (!await waitWorld(p, 'hangar', 20000)) { fail(tag + ': the hangar door'); await p.evaluate(() => new Promise(r => BridgeWorld.load('hangar', () => { BridgeState.transition('world', { worldId: 'hangar' }); r(); }))); }
    await p.waitForTimeout(1500);
    await use(p, 8, 9, 'up');
    if (!await waitWorld(p, 'lumar', 30000)) fail(tag + ': the shuttle didn\'t take the new pilot down to Lumar (' + (await st(p)).world + ')');
    await p.waitForTimeout(2500);
    const mark = await p.evaluate(() => BridgeQuests.startsHere('lumar'));
    if (mark.HARBOURMASTER !== Q) fail(tag + ': no gold ! over Bess: ' + JSON.stringify(mark));
    await shot(p, 'fh_' + tag + '_2_landed.png');

    // Bess: it begins; her topic for the step is lit
    await use(p, ...BESS);
    s = await st(p);
    const t1 = await topics(p);
    console.log(tag + ' Bess: ' + JSON.stringify(s.prog) + ' topics ' + t1.join(' / '));
    if (!s.prog || s.prog.found !== 1) fail(tag + ': talking to Bess didn\'t begin it');
    if (t1[0] !== 'A boat for me?*') fail(tag + ': Bess\'s first step isn\'t lit first: ' + t1[0]);
    if (t1.some(t => /Show me the ropes/.test(t))) fail(tag + ': "Show me the ropes?" still offered once begun');
    await click(p, '.wd-convo .wd-opt', 'A boat for me?'); await p.waitForTimeout(1500);
    await shot(p, 'fh_' + tag + '_3_bess.png');
    await shut(p);
    console.log(tag + ' tracker after Bess: ' + await tracker(p));
    if (!/1 \/ 6/.test(await tracker(p)) || !/fish/i.test(await tracker(p))) fail(tag + ': the tracker isn\'t on the fish: ' + await tracker(p));
    if (o.phone && !/tap A/.test(await tracker(p)) && !/tap A/.test(await p.evaluate((Q) => BridgeQuests.leads(Q, 1)[0], Q))) fail('phone: the lead talks in keys: ' + await p.evaluate((Q) => BridgeQuests.leads(Q, 1)[0], Q));

    // a fish, off the pier: cast, a bite, struck, reeled (the reel helped along: the fight is its own test's)
    await use(p, ...FISH);
    if (!await p.evaluate(() => BridgeFishing.isOpen())) fail(tag + ': no fishing off the pier');
    const tapRod = async (down) => { if (o.phone) await p.evaluate((down) => { const c = document.querySelector('#fishing .fi-water'); c.dispatchEvent(new PointerEvent(down ? 'pointerdown' : 'pointerup', { bubbles: true })); }, down); else if (down) await p.keyboard.down(' '); else await p.keyboard.up(' '); };
    await tapRod(true); await p.waitForTimeout(1150); await tapRod(false);
    await p.waitForTimeout(300);
    await p.evaluate(() => { const s = BridgeFishing._state(); if (s && s.phase === 'wait') { s.catchId = 'silverfin'; s.nibbles = []; } });
    await p.waitForFunction(() => { const s = BridgeFishing._state(); return s && s.phase === 'bite'; }, null, { timeout: 12000 }).catch(() => fail(tag + ': no bite (' + JSON.stringify((BridgeFishing._state() || {}).phase) + ')'));
    await tapRod(true); await p.waitForTimeout(120); await tapRod(false);
    await p.evaluate(() => { const s = BridgeFishing._state(); if (s && s.phase === 'reel') { s.progress = 0.995; s.fish = s.ft = s.zone + s.zoneH / 2; } });
    await p.waitForTimeout(1200);
    await shot(p, 'fh_' + tag + '_4_fish.png');
    await p.waitForTimeout(2500);
    if (o.phone) await p.evaluate(() => { const c = document.getElementById('fish-reveal'); if (c) c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    else await p.keyboard.press(' ');
    await p.waitForTimeout(600);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    if (await p.evaluate(() => BridgeFishing.isOpen())) await p.evaluate(() => BridgeFishing.close());
    if (!await found(p, 2)) fail(tag + ': landing a fish didn\'t count: ' + JSON.stringify((await st(p)).prog) + ' pack ' + await p.evaluate(() => BridgeInventory.getCount('silverfin')));
    console.log(tag + ' after the fish: ' + JSON.stringify((await st(p)).prog) + ', silverfin in the pack ' + await p.evaluate(() => BridgeInventory.getCount('silverfin')) + ' | ' + await tracker(p));
    await shot(p, 'fh_' + tag + '_5_fish_done.png');

    // sold to Bess (the fish stall's shut at night: she's always on her pier)
    await use(p, ...BESS);
    const t2 = await topics(p);
    if (t2[0] !== 'I caught one!*') fail(tag + ': Bess\'s sell step isn\'t lit: ' + t2.join(' / '));
    await click(p, '.wd-convo .wd-opt', 'Sell her your catch'); await p.waitForTimeout(900);
    if (!await click(p, '.wd-opt[data-act="all"]')) fail(tag + ': no sell sheet from Bess');
    await p.waitForTimeout(1500);
    await shut(p);
    if (!await found(p, 3)) fail(tag + ': selling the fish didn\'t count: ' + JSON.stringify((await st(p)).prog));
    console.log(tag + ' after selling: ' + JSON.stringify((await st(p)).prog) + ', coins ' + await p.evaluate(() => window._coins));

    // bought from her biscuit tin
    await use(p, ...BESS);
    await click(p, '.wd-convo .wd-opt', 'A tin of biscuit?'); await p.waitForTimeout(1200);
    await shot(p, 'fh_' + tag + '_6_biscuit.png');
    if (!await click(p, '#vendor-items .wd-btn')) fail(tag + ': no biscuit tin');
    await p.waitForTimeout(900);
    await shut(p);
    if (!await found(p, 4)) fail(tag + ': buying didn\'t count: ' + JSON.stringify((await st(p)).prog));
    console.log(tag + ' after buying: ' + JSON.stringify((await st(p)).prog) + ', biscuit ' + await p.evaluate(() => BridgeInventory.getCount('sea_biscuit')) + ' | ' + await tracker(p));

    // the Gull out and back
    await use(p, ...DOCK);
    await p.waitForFunction(() => BridgeSloop.isRunning() && BridgeSloop._phase() === 'sail', null, { timeout: 30000 }).catch(() => fail(tag + ': never under sail (' + JSON.stringify([BridgeSloop.isRunning(), BridgeSloop._phase && BridgeSloop._phase()]) + ')'));
    await p.waitForTimeout(3000);
    await shot(p, 'fh_' + tag + '_7_sailing.png');
    await p.waitForTimeout(19000);
    let back = null;                                   // (the first passage opens How to sail by itself: Esc puts that away first)
    for (let i = 0; i < 3 && !back; i++) {
      await p.keyboard.press('Escape'); await p.waitForTimeout(700);
      back = await p.evaluate(() => { const e = [...document.querySelectorAll('#sloop-menu button')].find(e => /^Put back/.test(e.textContent.trim())); if (e) { e.click(); return e.textContent; } return null; });
    }
    if (!back) { console.log(tag + '  (no Put back in the menu: stopping her)'); await p.evaluate(() => BridgeSloop.stop('lumar')); }
    if (!await waitWorld(p, 'lumar', 30000)) fail(tag + ': not back ashore');
    if (!await found(p, 5, 12000)) fail(tag + ': sailing out and back didn\'t count: ' + JSON.stringify((await st(p)).prog));
    await p.waitForTimeout(1500);
    console.log(tag + ' after sailing (' + back + '): ' + JSON.stringify((await st(p)).prog) + ' | ' + await tracker(p));
    await shot(p, 'fh_' + tag + '_8_back.png');

    // and home: Return to ship
    if (!await click(p, '#world-back')) fail(tag + ': no Return to ship');
    if (!await waitWorld(p, 'hangar', 30000)) fail(tag + ': Return to ship didn\'t get there (' + (await st(p)).world + ')');
    await p.waitForTimeout(6000);
    s = await st(p);
    const pennant = await p.evaluate(() => BridgeInventory.getCount('gull_pennant'));
    console.log(tag + ' home: ' + JSON.stringify(s.prog) + ', pennant ' + pennant + ', rumours ' + s.rumours.join() + ', coins ' + await p.evaluate(() => window._coins) + ', achievements ' + await p.evaluate(() => (window._ach || []).join()) + ' | ' + await tracker(p));
    if (!s.prog.done) fail(tag + ': the first hour isn\'t done');
    if (pennant !== 1) fail(tag + ': no pennant in the pack');
    if (s.rumours.indexOf('ship-mark') < 0) fail(tag + ': no hand-on rumour (The Ship Mark)');
    if (!/Ship Mark/.test(await tracker(p))) fail(tag + ': the tracker hasn\'t moved on to the next rumour: ' + await tracker(p));
    await shot(p, 'fh_' + tag + '_9_home.png');
    await p.keyboard.press('j'); await p.waitForTimeout(900);
    const jn = await p.evaluate(() => (document.querySelector('.jn') || {}).innerText || '');
    if (!/Learning the Ropes/.test(jn) || !/Ship Mark/.test(jn)) fail(tag + ': the journal: ' + jn.slice(0, 300));
    await shot(p, 'fh_' + tag + '_10_journal.png');
    await ctx.close();
  }

  await playThrough('wide', { at: DAY });
  await playThrough('phone', { at: NIGHT, phone: true, storm: true });

  // ---- set aside and picked up again, across reloads -------------------------------------------------------------------
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    let { p } = await open('aside', { ctx });
    await signUp(p, 'SKIPPER');
    if (!await click(p, '.qtr-skip')) fail('aside: no Not now on the tracker');
    await p.waitForTimeout(800);
    let s = await st(p);
    console.log('aside: set aside before beginning: aside ' + s.aside + ', tracked ' + s.tracked + ', tracker "' + await tracker(p) + '"');
    if (!s.aside || s.tracked === Q || /Learning the Ropes/.test(await tracker(p))) fail('aside: the tracker still follows it');
    await shot(p, 'fh_aside_1.png');
    const pilot = await p.evaluate(() => BridgeState.getPilot());
    const again = async () => {
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => typeof BridgeIntro !== 'undefined' && BridgeIntro._state().booted, null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(1500);
      await p.evaluate((pl) => { BridgeIntro.hide(); BridgeState.setPilot(pl); }, pilot);
      await coins(p);
      await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar', () => { BridgeState.transition('world', { worldId: 'lumar' }); r(); })));
      await p.waitForTimeout(3000);
    };
    await again();
    s = await st(p);
    if (!s.aside || s.prog.found) fail('aside: not kept across the reload ' + JSON.stringify(s));
    if (BESS && (await p.evaluate(() => BridgeQuests.startsHere('lumar'))).HARBOURMASTER) fail('aside: a gold ! over Bess while it\'s set aside');
    await use(p, ...BESS);
    if ((await st(p)).prog.found) fail('aside: talking to Bess began it while it was set aside');
    const tt = await topics(p);
    if (!tt.some(t => /^Show me the ropes\?/.test(t))) fail('aside: Bess doesn\'t offer it again: ' + tt.join(' / '));
    await click(p, '.wd-convo .wd-opt', 'Show me the ropes?'); await p.waitForTimeout(1500);
    await shut(p);
    s = await st(p);
    console.log('aside: asked Bess: ' + JSON.stringify(s.prog) + ', aside ' + s.aside + ' | ' + await tracker(p));
    if (s.prog.found !== 1 || s.aside || !/Learning the Ropes/.test(await tracker(p))) fail('aside: asking Bess didn\'t pick it up');
    await p.evaluate(() => BridgeQuests.did('catch', { id: 'silverfin' }));
    if (!await found(p, 2)) fail('aside: a fish after picking it up didn\'t count');
    // set aside mid-way, from the journal
    await p.keyboard.press('j'); await p.waitForTimeout(900);
    if (!await click(p, '.jn-aside')) fail('aside: no Not now in the journal');
    await p.waitForTimeout(500);
    await shot(p, 'fh_aside_2_journal.png');
    await p.keyboard.press('j'); await p.waitForTimeout(500);
    await again();
    await p.evaluate(() => BridgeQuests.did('sell'));
    await p.waitForTimeout(500);
    s = await st(p);
    console.log('aside: mid-way, after a reload and a sale: ' + JSON.stringify(s.prog) + ', aside ' + s.aside + ' | tracker "' + await tracker(p) + '"');
    if (!s.aside || s.prog.found !== 2) fail('aside: a deed counted while it was set aside, or it didn\'t stay aside');
    await p.keyboard.press('j'); await p.waitForTimeout(900);
    if (!await click(p, '.jn-track', 'Pick it up')) fail('aside: no Pick it up in the journal');
    await p.keyboard.press('j'); await p.waitForTimeout(500);
    await p.evaluate(() => BridgeQuests.did('sell'));
    if (!await found(p, 3)) fail('aside: picked up, a sale didn\'t count');
    s = await st(p);
    console.log('aside: picked up: ' + JSON.stringify(s.prog) + ' | ' + await tracker(p));
    await ctx.close();
  }

  // ---- an existing save: never pulled in -------------------------------------------------------------------------------
  {
    const old = () => {
      if (localStorage.getItem('bridge_test_seeded')) return;
      localStorage.setItem('bridge_test_seeded', '1');
      localStorage.setItem('bridge_pilot', JSON.stringify({ id: 'vet-1', name: 'BECK', suit_color: 'gold' }));
      localStorage.setItem('bridge_ship_location', 'lumar');
      localStorage.setItem('bridge_log', JSON.stringify([{ at: Date.now() - 864e5, k: 'Arrived', t: 'Lumar Harbor', s: '', w: '' }]));
      localStorage.setItem('bridge_quests', JSON.stringify({ crystals: { clues: { ilsa: Date.now() - 864e5 }, started: Date.now() - 864e5 } }));
      localStorage.setItem('bridge_people', JSON.stringify({ bess: { met: Date.now() - 864e5, asked: {} } }));
    };
    const { p, ctx } = await open('veteran', { init: old });
    await p.evaluate(() => { BridgeIntro.hide(); BridgeState.setPilot({ id: 'vet-1', name: 'BECK', suit_color: 'gold' }); });
    await coins(p);
    await p.evaluate(() => new Promise(r => BridgeWorld.load('lumar', () => { BridgeState.transition('world', { worldId: 'lumar' }); r(); })));
    await p.waitForTimeout(3500);
    let s = await st(p);
    const mark = await p.evaluate(() => BridgeQuests.startsHere('lumar'));
    console.log('veteran: offered ' + s.offered + ', rumours ' + s.rumours.join() + ', starts here ' + JSON.stringify(mark) + ' | tracker "' + await tracker(p) + '"');
    if (s.offered || s.rumours.indexOf(Q) >= 0 || mark.HARBOURMASTER || /Learning the Ropes/.test(await tracker(p))) fail('veteran: an existing save was offered the first hour');
    await use(p, ...BESS);
    s = await st(p);
    const tt = await topics(p);
    console.log('veteran: Bess: ' + JSON.stringify(s.prog) + ' topics ' + tt.join(' / '));
    if (s.prog.found) fail('veteran: talking to Bess began it');
    if (!tt.some(t => /^Show me the ropes\?/.test(t))) fail('veteran: Bess doesn\'t offer it');
    await shot(p, 'fh_veteran_bess.png');
    await click(p, '.wd-convo .wd-opt', 'Show me the ropes?'); await p.waitForTimeout(1200);
    await shut(p);
    s = await st(p);
    if (s.prog.found !== 1) fail('veteran: asking Bess didn\'t begin it');
    console.log('veteran: asked for it: ' + JSON.stringify(s.prog) + ' | ' + await tracker(p));
    // a returning pilot signing in on a new browser isn't welcomed as new
    const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const { p: p2 } = await open('sign-in', { ctx: c2 });
    await p2.evaluate(() => { BridgeDB.lookupPilot = async (n) => ({ id: 'vet-2', name: n, suit_color: 'gold' }); BridgeDB.updateLastSeen = async () => {}; BridgeIdentity.show({ form: 'returning' }); });
    await p2.fill('#pilot-name', 'ALYSSA');
    await p2.click('#btn-login');
    await waitWorld(p2, 'bridge', 45000);
    await p2.waitForTimeout(2500);
    const s2 = await st(p2);
    console.log('sign-in: offered ' + s2.offered + ', rumours ' + s2.rumours.join());
    if (s2.offered || s2.rumours.indexOf(Q) >= 0) fail('sign-in: a returning pilot was welcomed as new');
    await c2.close();
    await ctx.close();
  }

  await b.close();
  console.log('errors: ' + errors);
  process.exit(errors ? 1 : 0);
})().catch(e => { console.log('FAILED: ' + (e.stack || e)); process.exit(1); });
