// table chat over Fell Dice (a game drawn in this page): pill bottom-left, '/' opens, keys stay in the box
const T = require(__dirname + '/tg_lib.js');
const st = p => p.evaluate(() => {
  const pill = document.querySelector('.tc-pill'), pop = document.querySelector('#tchat .tc-pop'), panel = document.querySelector('#tchat .tc-panel');
  const vis = e => !!e && getComputedStyle(e).display !== 'none';
  const r = e => { if (!vis(e)) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round).join(','); };
  return { shown: BridgeTableChat.isShown(), inbar: !!(pill && pill.classList.contains('tc-inbar')), pill: r(pill), pop: vis(pop) ? pop.innerText : null, panel: r(panel), lodge: BridgeLodge.isOpen() };
});
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'hoarfell-lodge', { x: 12, y: 4 }, { x: 13, y: 4 });
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  await T.click(beck, /^(Fell Dice|Bones)/); await beck.waitForTimeout(300);
  await T.click(beck, /^Heads up.*25 each/); await beck.waitForTimeout(1200);
  await T.click(aly, /^Play$/); await aly.waitForTimeout(2500);
  console.log('beck:', JSON.stringify(await st(beck)));
  const g0 = await beck.evaluate(() => { const g = BridgeLodge._g(); return g && JSON.stringify({ bid: g.bid, turn: g.turn, phase: g.phase }); });
  await beck.keyboard.press('/'); await beck.waitForTimeout(300);
  console.log('after /:', JSON.stringify(await st(beck)), 'focus', await beck.evaluate(() => document.activeElement.className));
  await beck.keyboard.type('nice roll 1 2 3 4 5 6 b l'); await beck.keyboard.press('Enter'); await beck.waitForTimeout(800);
  const g1 = await beck.evaluate(() => { const g = BridgeLodge._g(); return g && JSON.stringify({ bid: g.bid, turn: g.turn, phase: g.phase }); });
  console.log('dice untouched by typing:', g0 === g1, g1);
  console.log('aly:', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/chat_dice_beck.png' });
  await aly.screenshot({ path: T.S + '/shots/chat_dice_aly.png' });
  await beck.keyboard.press('Escape'); await beck.waitForTimeout(300);
  console.log('Esc: box closed, dice still open:', JSON.stringify(await st(beck)));
  console.log('errors:', T.errs.length);
  await b.close();
})();
