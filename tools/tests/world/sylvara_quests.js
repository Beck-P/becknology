const { chromium } = require('playwright');
// Sylvara's two quests played through, start to finish: The Queen's Favour, then Under the Willow (its sequel).
// Checks the things in them (js/keyitems.js): the ribbon and the moonflower held up on a card only once what was said
// has been read, carried until given, flying to Beckolas as they're handed over; the topics that open as the story
// moves (`when` / `until`); the willow's hint and its keepsake layer at the end. Shots in OUT.
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
  const has = (k) => p.evaluate((k) => BridgeQuests.has(k), k);
  const card = () => p.evaluate(() => !!document.getElementById('item-get'));
  const carried = () => p.evaluate(() => BridgeKeyItems.carried().map(i => i.id).join(','));

  // ---- The Queen's Favour ----
  await go('sylvara-hall', [11, 7]);
  await talk(11, 6);
  await go('sylvara', [6, 18]);
  await use(6, 18);
  const hint = await p.evaluate(() => (document.querySelector('.world-dialog') || {}).innerText || '');
  if (!/SOMEONE IN THE GLADE/.test(hint)) fail('the willow gives no hint before the bard and the herbalist');
  await shut();
  await talk(17, 12); await talk(34, 12);
  await use(6, 18);
  if (await card()) fail('the ribbon card came up over the willow\'s words');
  await shut(); await p.waitForTimeout(900);
  if (!await card()) fail('no card for the ribbon');
  await p.screenshot({ path: OUT + '/sylvara_ribbon.png' });
  await p.waitForTimeout(500); await p.keyboard.press('Space'); await p.waitForTimeout(500);
  if (await card()) fail('Space didn\'t put the ribbon card away');
  if (await carried() !== 'ribbon') fail('not carrying the ribbon: ' + await carried());
  await go('sylvara-hall', [9, 6]);
  await use(9, 5);
  if (await carried() !== '') fail('still carrying after giving it back');
  if (!await has('queens-favour')) fail('The Queen\'s Favour not done');
  await shut();
  console.log('queens-favour', await has('queens-favour'));

  // ---- Under the Willow ----
  await talk(11, 6, 'Something on your mind?');
  await talk(9, 5, 'The queen... and you?');
  await go('sylvara', [17, 12]);
  await talk(17, 12, 'Help Beckolas say it');
  await use(34, 12); await shut(); await p.waitForTimeout(900);
  if (!await card()) fail('no card for the moonflower');
  await p.screenshot({ path: OUT + '/sylvara_moonflower.png' });
  await p.waitForTimeout(500); await p.keyboard.press('Space'); await p.waitForTimeout(500);
  await walker('LAMPLIGHTER', 'Light the willow');
  await walker('WEAVER', 'Ribbons for the willow');
  if (await carried() !== 'moonflower') fail('not carrying the moonflower: ' + await carried());
  await go('sylvara-hall', [9, 6]);
  await talk(9, 5, 'The Moonwell, at dusk');
  if (await carried() !== '') fail('still carrying the moonflower');
  await talk(11, 6, 'The Moonwell, at dusk');
  await go('sylvara', [6, 18]);
  await use(6, 18); await p.waitForTimeout(6000);                  // (the moment types itself out)
  const moment = await p.evaluate(() => (document.querySelector('.world-dialog') || {}).innerText || '');
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
