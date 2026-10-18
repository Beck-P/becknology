const { chromium } = require('playwright');
// Sylvara's two quests played through, start to finish, both out of order (Alyssa: who you talk to first shouldn't
// matter): The Queen's Favour from the willow first, then Under the Willow (its sequel) from the glade first.
// Checks the things in them (js/keyitems.js): the ribbon and the moonflower held up on a card only once what was said
// has been read, in the Backpack under Quest items, carried until given, flying to Beckolas as they're handed over;
// the topics that open as the story moves (`when` / `until`); the finale waiting for everything; the keepsake layer at
// the end. Shots in OUT.
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|supabase/i.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2500);
  await p.evaluate(() => { localStorage.removeItem('bridge_quests'); BridgeState.setPilot({ id: 't', name: 'ALYSSA', suit_color: 'purple' }); if (typeof BridgeIntro !== 'undefined') BridgeIntro.hide(); });
  const fail = (m) => console.log('FAILED: ' + m);
  const go = async (w, at) => { await p.evaluate(([w, at]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: { x: at[0], y: at[1] } }); r(); })), [w, at]); await p.waitForTimeout(3500); };
  const shut = async () => {
    const hit = await p.evaluate(() => { const b = [...document.querySelectorAll('#world-overlay button, #world-overlay .wd-opt')].find(e => /goodbye|leave|close/i.test(e.textContent)); if (b) { b.click(); return true; } return false; });
    if (!hit) await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
  };
  const use = async (x, y, face = 'up') => { await p.evaluate(([x, y, f]) => { BridgeCharacter.init(x, y); BridgeCharacter.setFacing(f); }, [x, y, face]); await p.waitForTimeout(700); await p.keyboard.press('e'); await p.waitForTimeout(1800); };
  const topics = () => p.evaluate(() => [...document.querySelectorAll('.wd-opt')].map(b => b.textContent + (b.classList.contains('nudge') ? '*' : '')));
  const talk = async (x, y, want) => {
    await use(x, y);
    const t = await topics();
    if (want && t[0] !== want + '*') fail('first topic ' + JSON.stringify(t[0]) + ', wanted ' + want);
    await shut();
  };
  const walker = async (label, want) => {
    const at = await p.evaluate((l) => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === l); return [i.x, i.y]; }, label);
    await talk(at[0], at[1] + 1, want);
  };
  // what was said, once it's typed out (a fixed wait read it half-typed where the frames run slow: a big wood in a
  // software-drawn headless browser)
  const said = async () => { await p.waitForFunction(() => !document.querySelector('.world-dialog.typing'), null, { timeout: 15000 }).catch(() => {});
    return p.evaluate(() => (document.querySelector('.world-dialog') || {}).innerText || ''); };
  const has = (k) => p.evaluate((k) => BridgeQuests.has(k), k);
  const card = () => p.evaluate(() => !!document.getElementById('item-get'));
  const carried = () => p.evaluate(() => BridgeKeyItems.carried().map(i => i.id).join(','));

  // ---- The Queen's Favour, out of order: the ribbon before anyone's said a word about it ----
  await go('sylvara', [6, 18]);
  await use(6, 18);
  const found = await said();
  if (!/GREEN SILK/.test(found)) fail('the willow didn\'t give up the ribbon first thing: ' + found.slice(0, 80));
  if (await card()) fail('the ribbon card came up over the willow\'s words');
  await shut(); await p.waitForTimeout(900);
  if (!await card()) fail('no card for the ribbon');
  await p.screenshot({ path: OUT + '/sylvara_ribbon.png' });
  await p.waitForTimeout(500); await p.keyboard.press('Space'); await p.waitForTimeout(500);
  if (await card()) fail('Space didn\'t put the ribbon card away');
  if (await carried() !== 'ribbon') fail('not carrying the ribbon: ' + await carried());
  // the Backpack has it, under Quest items
  await p.keyboard.press('i'); await p.waitForTimeout(700);
  const qs = await p.evaluate(() => [...document.querySelectorAll('.bp-qslot')].map(b => b.dataset.q));
  if (qs.join() !== 'queens-favour/ribbon') fail('the Backpack\'s quest items: ' + JSON.stringify(qs));
  await p.evaluate(() => { const b = document.querySelector('.bp-qslot'); if (b) b.click(); }); await p.waitForTimeout(300);
  const det = await p.evaluate(() => (document.querySelector('.bp-detail') || {}).innerText || '');
  if (!/Beckolas's Ribbon/.test(det) || !/For Beckolas/.test(det)) fail('the ribbon\'s card in the Backpack: ' + det.slice(0, 120));
  await p.screenshot({ path: OUT + '/sylvara_backpack.png' });
  await p.keyboard.press('i'); await p.waitForTimeout(500);
  await go('sylvara-hall', [9, 6]);
  await use(9, 5);
  if (await carried() !== '') fail('still carrying after giving it back');
  await shut();
  if (await has('queens-favour')) fail('done before the queen, the bard and the herbalist');
  await talk(11, 6);
  await go('sylvara', [17, 12]);
  await talk(17, 12); await talk(34, 12);
  if (!await has('queens-favour')) fail('The Queen\'s Favour not done');
  if (await has('under-the-willow/flower') || await carried()) fail('the sequel started on the word that finished the first');
  console.log('queens-favour', await has('queens-favour'));

  // ---- Under the Willow, out of order: the glade first, Beckolas and the queen last ----
  await talk(17, 12, 'Help Beckolas say it');
  await use(34, 12); await shut(); await p.waitForTimeout(900);
  if (!await card()) fail('no card for the moonflower');
  await p.screenshot({ path: OUT + '/sylvara_moonflower.png' });
  await p.waitForTimeout(500); await p.keyboard.press('Space'); await p.waitForTimeout(500);
  await walker('LAMPLIGHTER', 'Light the willow');
  await walker('WEAVER', 'Ribbons for the willow');
  if (await carried() !== 'moonflower') fail('not carrying the moonflower: ' + await carried());
  await use(6, 18);
  if (await has('under-the-willow/vow')) fail('the moment came before Beckolas and the queen knew');
  await shut();
  await go('sylvara-hall', [9, 6]);
  await talk(9, 5, 'The queen... and you?');
  if (await carried() !== '') fail('still carrying the moonflower');
  await talk(11, 6, 'Something on your mind?');
  if (!await has('under-the-willow/invite')) fail('the queen wasn\'t told: the Moonwell, at dusk');
  await go('sylvara', [6, 18]);
  await use(6, 18);
  const moment = await said();                                       // (the moment types itself out)
  if (!/FINALLY/.test(moment)) fail('no moment at the willow');
  await shut(); await p.waitForTimeout(800);
  if (!await has('under-the-willow')) fail('Under the Willow not done');
  const lay = await p.evaluate(() => BridgeScene.getLayers('sylvara').willow);
  if (lay !== 'lit') fail('the willow keepsake isn\'t up: ' + lay);
  await p.evaluate(() => BridgeCharacter.init(11, 21)); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/sylvara_keepsake.png' });
  console.log('under-the-willow', await has('under-the-willow'), 'keepsake', lay);
  await b.close();
})();
