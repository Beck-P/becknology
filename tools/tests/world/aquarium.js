// Fish tanks (js/aquarium.js): buy one in a home's furnishing shop and the big one from the Ship's Chandler, put them
// down, put fish in (from the pack and from a ship's fish hold), take one out, look into the tank, the tank aboard and
// in Arcadia, still there after a reload, and a partner visiting sees it and its fish. node world/aquarium.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200), (e.stack || '').split('\n').slice(1, 4).join(' | ')));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('aq_seeded')) { localStorage.setItem('bridge_ship_location', 'lumar'); sessionStorage.setItem('aq_seeded', '1'); } });
  const boot = async () => {
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T21:30'); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
      window._coins = 20000;
      BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'insufficient' });
      BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
    });
  };
  await boot();
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  const go = (w, at) => ev(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: at || null }); r(); })), [w, at]);
  const text = () => ev(() => (document.querySelector('.world-dialog') || {}).innerText || 'none');
  const row = (re) => ev((re) => { const r = [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => new RegExp(re).test(x.textContent) && !x.classList.contains('none')); if (r) r.click(); return !!r; }, re);
  const btn = (re) => ev((re) => { const o = [...document.querySelectorAll('.world-dialog .wd-opt')].find(x => new RegExp(re).test(x.textContent)); if (o) o.click(); return !!o; }, re);
  const shut = () => ev(() => { document.querySelectorAll('.world-dialog').forEach(x => x.remove()); BridgeControls.enable && BridgeControls.enable(); });
  const tankAt = (x, y) => ev(([x, y]) => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'tank' && i._piece.x === x && i._piece.y === y); if (it) BridgeInteractions.execute(it); return !!it; }, [x, y]);
  const inTank = (x, y) => ev(([x, y]) => { const q = BridgeHome._save().layout[BridgeWorld.getWorldId()].find(e => e.x === x && e.y === y); return (q.fish || []).map(f => f.id); }, [x, y]);
  let errors = 0;
  const expect = (ok, what) => { if (!ok) { errors++; console.log('MISSED:', what); } };
  // the screen round a piece (x, y, w tiles), for a close crop
  const around = (x, y, w) => ev(([x, y, w]) => {
    const v = BridgeWorld.getScreenView(), r = document.getElementById('bridge-canvas').getBoundingClientRect();
    return { x: r.left + v.offX + (x - 1) * v.ts, y: r.top + v.offY + (y - 2.2) * v.ts, width: (w + 2) * v.ts, height: 4.4 * v.ts };
  }, [x, y, w]);
  // a tile's middle on the screen, for clicks in the furnishing tray's room
  const clickTile = (x, y) => ev(([x, y]) => {
    const v = BridgeWorld.getScreenView(), r = document.getElementById('bridge-canvas').getBoundingClientRect();
    const o = { clientX: r.left + v.offX + (x + 0.5) * v.ts, clientY: r.top + v.offY + (y + 0.5) * v.ts, button: 0, bubbles: true, pointerType: 'mouse' };
    document.getElementById('bridge-canvas').dispatchEvent(new PointerEvent('pointermove', o));
    document.getElementById('bridge-canvas').dispatchEvent(new PointerEvent('pointerdown', o));
  }, [x, y]);

  // the White House, bought
  await go('lumar-sapphire'); await wait(1200);
  await ev(() => BridgeHome.buy('lumar-home')); await wait(300); await shut();
  await go('lumar-home', { x: 8, y: 6 }); await wait(1800);
  const tanks = await ev(() => BridgeHome.pieces().filter(p => p.tank).map(p => [p.id, p.name, p.price, p.w + 'x' + p.d]));
  console.log('tanks in the catalogue:', JSON.stringify(tanks));
  expect(tanks.length === 2, 'two tanks in the catalogue');
  // buy the small tank in the furnishing shop (H): SHOP tab, tap it twice, put it down against the back wall
  await ev(() => BridgeHome.edit()); await wait(300);
  await ev(() => document.querySelector('#home-tray .hm-tab[data-tab="shop"]').click()); await wait(200);
  const card = () => ev(() => { const c = [...document.querySelectorAll('#home-tray .hm-card')].find(x => x.querySelector('.hm-pic[data-p="fish_tank"]')); c.click(); return c.innerText.replace(/\n/g, ' '); });
  console.log('shop card:', await card()); await wait(200); await card(); await wait(400);
  console.log('bought in the shop:', await ev(() => document.querySelector('#home-tray .hm-msg').innerText), '· coins', await ev(() => window._coins));
  await p.screenshot({ path: SHOTS + '/aquarium_shop.png' });
  await clickTile(6, 2); await wait(300);
  console.log('putting it down:', await ev(() => document.querySelector('#home-tray .hm-msg').innerText));
  await ev(() => BridgeHome.done()); await wait(300);
  console.log('placed:', JSON.stringify(await ev(() => BridgeHome._save().layout['lumar-home'].map(e => [e.id, e.x, e.y]))));
  expect(await ev(() => BridgeHome._save().layout['lumar-home'].some(e => e.id === 'fish_tank' && e.x === 6 && e.y === 2)), 'the tank put down at 6,2');
  await ev(() => BridgeCharacter.init(8, 5)); await wait(1500);
  await p.screenshot({ path: SHOTS + '/aquarium_room_empty.png' });
  await p.screenshot({ path: SHOTS + '/aquarium_room_empty_close.png', clip: await around(6, 2, 2) });

  // fish in from the pack, and one from the sloop's fish hold (she's at Sapphire's pier, below the house)
  await ev(() => { ['silverfin', 'silverfin', 'glowtail', 'coral_dragonet', 'harbour_crab', 'starfin', 'old_boot'].forEach(id => BridgeInventory.addItem(id, 1));
                   BridgeFleet.stowFish(BridgeFleet.active().ship, 'jade_marlin'); });
  await tankAt(6, 2); await wait(400);
  console.log('the tank:', (await text()).replace(/\n+/g, ' | ').slice(0, 300));
  await row('Put a fish in'); await wait(400);
  console.log('put a fish in:', (await text()).replace(/\n+/g, ' | ').slice(0, 400));
  for (const re of ['Silverfin', 'Glowtail', 'Coral Dragonet', 'Harbour Crab', 'Jade Marlin']) { console.log('in:', re, await row(re)); await wait(350); }
  console.log('after five:', (await text()).replace(/\n+/g, ' | ').slice(0, 300));
  const sixth = await row('Starfin');
  console.log('full - a sixth goes in?', sixth, '· in the tank', JSON.stringify(await inTank(6, 2)));
  expect(!sixth && (await inTank(6, 2)).length === 5, 'five in, and no sixth');
  const hold = await ev(() => BridgeFleet.catchOf(BridgeFleet.active().ship)), boots = /Old Boot/.test(await text());
  console.log('the hold now:', JSON.stringify(hold), '· the boot offered?', boots);
  expect(!hold.jade_marlin && !boots, 'the marlin out of the hold, no boot offered');
  // take one out
  await btn('Back'); await wait(400);
  await row('Take one out'); await wait(400);
  console.log('take one out:', (await text()).replace(/\n+/g, ' | ').slice(0, 300));
  await row('Silverfin'); await wait(400);
  console.log('taken out:', (await text()).split('\n')[1], '· silverfin in the pack', await ev(() => BridgeInventory.getCount('silverfin')), '· in the tank', JSON.stringify(await inTank(6, 2)));
  expect(await ev(() => BridgeInventory.getCount('silverfin')) === 2 && !(await inTank(6, 2)).includes('silverfin'), 'the silverfin back in the pack');
  await btn('Back'); await wait(400);
  await row('Put a fish in'); await wait(400); await row('Starfin'); await wait(400);
  await shut();
  console.log('how they swim (across, down, facing):', JSON.stringify(await ev(() => BridgeHome.at('fish_tank', 6, 2).fish.map(f => { const m = BridgeAquarium.swim(f, Date.now() / 1000); return [f.id, f.s, +m.u.toFixed(2), +m.v.toFixed(2), +m.fx.toFixed(2)]; }))));
  console.log('saved in bridge_homes:', await ev(() => JSON.stringify(JSON.parse(localStorage.getItem('bridge_homes')).layout['lumar-home'].map(e => [e.id, (e.fish || []).map(f => f.id)]))));
  await ev(() => BridgeCharacter.init(7, 4)); await wait(2500);
  await p.screenshot({ path: SHOTS + '/aquarium_room.png' });
  await p.screenshot({ path: SHOTS + '/aquarium_room_close.png', clip: await around(6, 2, 2) });
  await wait(1700);
  await p.screenshot({ path: SHOTS + '/aquarium_room_close2.png', clip: await around(6, 2, 2) });

  // look into it
  await tankAt(6, 2); await wait(300); await row('Look into the tank'); await wait(1600);
  console.log('looking:', await ev(() => BridgeAquarium.looking()), '·', await ev(() => document.querySelector('#tank-view .tv-title').innerText), '·', await ev(() => document.querySelector('#tank-view .tv-caption').innerText));
  console.log('names:', JSON.stringify(await ev(() => [...document.querySelectorAll('#tank-view .tv-name')].filter(e => e.style.display !== 'none').map(e => e.textContent))));
  await p.screenshot({ path: SHOTS + '/aquarium_look.png' });
  const fishXY = (re) => ev((re) => {
    const d = BridgeAquarium._drawn().find(d => new RegExp(re).test(BridgeItems.get(d.id).name)), cv = document.querySelector('#tank-view .tv-canvas'), k = cv.getBoundingClientRect().width / cv.width;
    return d && { x: (d.x + d.w / 2) * k, y: (d.y + d.h / 2) * k };
  }, re);
  const at = await fishXY('Starfin');
  if (at) { await p.mouse.move(at.x, at.y); await wait(300); }
  const said = await ev(() => document.querySelector('#tank-view .tv-caption').innerText);
  console.log('pointing at the starfin:', said);
  expect(/Starfin/.test(said), 'pointing at a fish names it');
  await wait(1500);
  await p.screenshot({ path: SHOTS + '/aquarium_look2.png' });
  await p.keyboard.press('Escape'); await wait(700);
  console.log('stepped back:', !(await ev(() => BridgeAquarium.looking())));
  expect(!(await ev(() => BridgeAquarium.looking())), 'Esc steps back');

  // the Grand Aquarium from the Ship's Chandler, put down in your quarters
  await go('bridge'); await wait(1500);
  await ev(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'chandler'); BridgeInteractions.execute(it); }); await wait(400);
  await row('Fish tanks'); await wait(400);
  console.log('the Chandler\'s tanks:', (await text()).replace(/\n+/g, ' | ').slice(0, 400));
  await p.screenshot({ path: SHOTS + '/aquarium_chandler.png' });
  await row('Grand Aquarium'); await wait(500);
  console.log('bought:', (await text()).split('\n')[1], '· coins', await ev(() => window._coins));
  await shut();
  await go('quarters', { x: 7, y: 8 }); await wait(1500);
  await ev(() => BridgeHome.edit()); await wait(300);
  await ev(() => [...document.querySelectorAll('#home-tray .hm-card')].find(x => x.querySelector('.hm-pic[data-p="aquarium"]')).click()); await wait(200);
  let spot = null;
  for (const [x, y] of [[5, 4], [4, 4], [6, 4], [3, 8]]) {
    await clickTile(x, y); await wait(250);
    if (await ev(() => BridgeHome._save().layout.quarters.some(e => e.id === 'aquarium'))) { spot = [x, y]; break; }
  }
  await ev(() => BridgeHome.done()); await wait(300);
  console.log('aquarium aboard at', JSON.stringify(spot));
  expect(spot, 'the Grand Aquarium put down aboard');
  await ev(() => ['crownfin', 'moon_eel', 'sapphire_ray', 'rose_shrimp', 'bluefin', 'sun_carp', 'emberjaw', 'spore_minnow', 'lantern_angler'].forEach(id => BridgeInventory.addItem(id, 1)));
  await tankAt(spot[0], spot[1]); await wait(300); await row('Put a fish in'); await wait(300);
  for (const re of ['Crownfin', 'Emberjaw', 'Moon Eel', 'Sapphire Ray', 'Lantern Angler', 'Sun Carp', 'Rose Shrimp', 'Sapphire Bluefin', 'Spore Minnow']) { await row(re); await wait(250); }
  console.log('aboard:', (await text()).split('\n').slice(1, 3).join(' | '));
  await shut();
  await ev((s) => BridgeCharacter.init(s[0] + 1, s[1] + 2), spot); await wait(2500);
  await p.screenshot({ path: SHOTS + '/aquarium_quarters.png', clip: await around(spot[0], spot[1], 3) });
  await tankAt(spot[0], spot[1]); await wait(300); await row('Look into the tank'); await wait(1800);
  await p.screenshot({ path: SHOTS + '/aquarium_look_big.png' });
  await p.keyboard.press('Escape'); await wait(700);

  // the capsule in Arcadia: a tank in neon
  await go('arcadia-street'); await wait(1200);
  await ev(() => BridgeHome.buy('arcadia-home')); await wait(300); await shut();
  await go('arcadia-home', { x: 7, y: 6 }); await wait(1500);
  await ev(() => BridgeHome.buyPiece('fish_tank')); await wait(200);
  await ev(() => BridgeHome.edit()); await wait(300);
  await ev(() => [...document.querySelectorAll('#home-tray .hm-card')].find(x => x.querySelector('.hm-pic[data-p="fish_tank"]')).click()); await wait(200);
  await clickTile(6, 2); await wait(250);
  await ev(() => BridgeHome.done()); await wait(300);
  await ev(() => ['glowtail', 'frostfin', 'spore_minnow'].forEach(id => BridgeInventory.addItem(id, 1)));
  await tankAt(6, 2); await wait(300); await row('Put a fish in'); await wait(300);
  for (const re of ['Glowtail', 'Frostfin', 'Spore Minnow']) { await row(re); await wait(250); }
  await shut();
  await ev(() => BridgeCharacter.init(8, 4)); await wait(2500);
  await p.screenshot({ path: SHOTS + '/aquarium_arcadia.png', clip: await around(6, 2, 2) });

  // after a reload, still there; the crab comes out, to leave room
  await boot();
  await go('lumar-home', { x: 8, y: 6 }); await wait(1800);
  console.log('after a reload:', JSON.stringify(await inTank(6, 2)));
  expect((await inTank(6, 2)).length === 5, 'the fish still there after a reload');
  await tankAt(6, 2); await wait(300); await row('Take one out'); await wait(300); await row('Harbour Crab'); await wait(300); await shut();
  const saved = await ev(() => window.__lsGet ? window.__lsGet('bridge_homes') : localStorage.getItem('bridge_homes'));

  // a partner visiting: Alyssa walks into Beck's house (his save from the cloud) and sees the tank and its fish
  const p2 = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, hasTouch: true });          // on her phone
  p2.on('pageerror', e => console.log('PAGEERR (aly)', e.message.slice(0, 200)));
  await p2.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p2.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T21:30'); await p2.waitForTimeout(2500);
  await p2.evaluate((saved) => {
    localStorage.setItem('bridge_partners', JSON.stringify({ t: { name: 'BECK', since: Date.now() } }));
    BridgeState.setPilot({ id: 'a', name: 'ALYSSA', suit_color: 'cyan' }); BridgeIntro.hide();
    window._wrote = [];
    BridgeCloud.peek = () => Promise.resolve({ bridge_homes: saved });
    BridgeCloud.write = (owner, k, v) => { window._wrote.push([owner, k, v]); return Promise.resolve(); };
    BridgeInventory.addItem('pond_perch', 1);
  }, saved);
  await p2.evaluate(() => new Promise(r => BridgePartner.visit('t', 'lumar-home', () => BridgeWorld.load('lumar-home', () => { BridgeState.transition('world', { worldId: 'lumar-home', spawn: { x: 7, y: 4 } }); r(); }))));
  await p2.waitForTimeout(2500);
  console.log('aly visiting:', JSON.stringify(await p2.evaluate(() => BridgePartner.visiting())), '· sees', JSON.stringify(await p2.evaluate(() => (BridgeHome.at('fish_tank', 6, 2) || {}).fish.map(f => f.id))));
  await p2.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'tank'); BridgeInteractions.execute(it); }); await p2.waitForTimeout(400);
  const hers = await p2.evaluate(() => document.querySelector('.world-dialog').innerText);
  console.log('aly at his tank:', hers.replace(/\n+/g, ' | ').slice(0, 300));
  expect(/BECK'S FISH TANK/i.test(hers) && !/Take one out/.test(hers), 'a visitor sees his tank and can\'t take one out');
  await p2.screenshot({ path: SHOTS + '/aquarium_partner.png' });
  await p2.evaluate(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Put a fish in/.test(x.textContent)).click()); await p2.waitForTimeout(300);
  await p2.evaluate(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Pond Perch/.test(x.textContent)).click()); await p2.waitForTimeout(2200);
  console.log('aly slips one in:', (await p2.evaluate(() => document.querySelector('.world-dialog').innerText)).split('\n')[1]);
  console.log('into his save:', JSON.stringify(await p2.evaluate(() => window._wrote.map(w => [w[0], w[1], JSON.parse(w[2]).layout['lumar-home'].find(e => e.id === 'fish_tank').fish.map(f => f.id)]))),
              '· her pack', await p2.evaluate(() => BridgeInventory.getCount('pond_perch')), '· her own homes untouched', await p2.evaluate(() => !window.__lsGet('bridge_homes')));
  expect(await p2.evaluate(() => window._wrote.some(w => w[0] === 't' && /pond_perch/.test(w[2]))), 'her present goes into his save');
  await p2.evaluate(() => { document.querySelectorAll('.world-dialog').forEach(x => x.remove()); BridgeControls.enable && BridgeControls.enable(); });
  await p2.waitForTimeout(1500);
  await p2.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find(i => i.type === 'tank'); BridgeInteractions.execute(it); }); await p2.waitForTimeout(300);
  await p2.evaluate(() => [...document.querySelectorAll('.world-dialog .wd-sell-row.pick')].find(x => /Look into/.test(x.textContent)).click()); await p2.waitForTimeout(1800);
  console.log('aly looks in:', await p2.evaluate(() => document.querySelector('#tank-view .tv-title').innerText), '·', JSON.stringify(await p2.evaluate(() => [...document.querySelectorAll('#tank-view .tv-name')].filter(e => e.style.display !== 'none').map(e => e.textContent))));
  await p2.screenshot({ path: SHOTS + '/aquarium_look_phone.png' });
  await p2.evaluate(() => BridgeAquarium.away()); await p2.waitForTimeout(700);
  await p2.screenshot({ path: SHOTS + '/aquarium_partner_room.png', clip: await p2.evaluate(() => {
    const v = BridgeWorld.getScreenView(), r = document.getElementById('bridge-canvas').getBoundingClientRect();
    return { x: r.left + v.offX + 5 * v.ts, y: r.top + v.offY - 0.2 * v.ts, width: 4 * v.ts, height: 4.4 * v.ts };
  }) });
  console.log('aquarium errors:', errors);
  await b.close();
})();
