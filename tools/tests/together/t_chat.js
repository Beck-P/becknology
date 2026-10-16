// table chat: Beck and Alyssa at one Royale blackjack table talk without leaving it; then over Fell Dice (in-page)
const T = require(__dirname + '/tg_lib.js');
const W = +(process.argv[2] || 1100), H = +(process.argv[3] || 720);
const st = p => p.evaluate(() => {
  const pill = document.querySelector('.tc-pill'), pop = document.querySelector('#tchat .tc-pop'), panel = document.querySelector('#tchat .tc-panel');
  const vis = e => !!e && getComputedStyle(e).display !== 'none';
  const r = e => { if (!vis(e)) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round).join(','); };
  return { shown: BridgeTableChat.isShown(), inbar: !!(pill && pill.classList.contains('tc-inbar')), pill: r(pill), badge: pill && pill.querySelector('.tc-badge').textContent,
    pop: vis(pop) ? pop.innerText : null, panel: r(panel), to: document.querySelector('#tchat .tc-to') && document.querySelector('#tchat .tc-to').textContent,
    log: [...document.querySelectorAll('#tchat .tc-m')].map(e => e.innerText), bubbles: document.querySelectorAll('.mp-tag.talking').length };
});
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'arcadia-casino', { x: 15, y: 9 }, { x: 16, y: 9 });
  if (W !== 1100) for (const p of [beck, aly]) { await p.setViewportSize({ width: W, height: H }); await p.evaluate(() => document.documentElement.classList.add('touch')); }
  console.log('before a game:', JSON.stringify(await st(beck)));
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(400);
  console.log('picker:', await T.dlg(beck));
  console.log('pick', await T.click(beck, /^Blackjack/)); await beck.waitForTimeout(400);
  console.log('modes:', await T.dlg(beck));
  console.log('mode', await T.click(beck, /^At one table/)); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(4000);
  console.log('cabinets', await beck.evaluate(() => BridgeCabinetModal.isOpen()), await aly.evaluate(() => BridgeCabinetModal.isOpen()));
  console.log('beck chat:', JSON.stringify(await st(beck)));
  if (process.env.BAR) {
    for (const [p, w] of [[beck, 'beck'], [aly, 'aly']]) {
      await p.evaluate(() => { document.querySelector('.tc-pill').style.visibility = 'hidden'; document.querySelector('.tc-pill').style.position = 'absolute'; });
      await p.screenshot({ path: T.S + '/shots/bar_' + w + '_nopill.png', clip: { x: 0, y: 0, width: W, height: 60 } });
      await p.evaluate(() => { document.querySelector('.tc-pill').style.visibility = ''; document.querySelector('.tc-pill').style.position = ''; });
      await p.screenshot({ path: T.S + '/shots/bar_' + w + '_pill.png', clip: { x: 0, y: 0, width: W, height: 60 } });
      console.log(w, 'bar parts', JSON.stringify(await p.evaluate(() => ['.cm-title', '.cm-mid', '.cm-coins', '#cabinet-vs', '.cm-right', '.tc-pill', '#cabinet-leave-btn'].map(s => { const e = document.querySelector(s); if (!e) return s + ':none'; const b = e.getBoundingClientRect(); return s + ':' + Math.round(b.left) + '-' + Math.round(b.right); }))));
    }
  }
  console.log('aly chat:', JSON.stringify(await st(aly)));
  // Beck opens the box from the bar and types; the game's keys stay with the box
  await beck.click('.tc-pill'); await beck.waitForTimeout(300);
  await beck.click('#tchat .tc-in');                    // on a phone the box doesn't pull the keyboard up by itself: tap the line
  console.log('focus in box', await beck.evaluate(() => document.activeElement && document.activeElement.className));
  await beck.keyboard.type('Hit me, dealer. Double down? q w e'); await beck.keyboard.press('Enter'); await beck.waitForTimeout(900);
  console.log('cabinet still open (typed q/w/e/space)', await beck.evaluate(() => BridgeCabinetModal.isOpen()));
  console.log('beck after send:', JSON.stringify(await st(beck)));
  console.log('aly heard:', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/chat_beck_open.png' });
  await aly.screenshot({ path: T.S + '/shots/chat_aly_pop.png' });
  // Alyssa answers with a quick line from the box
  await aly.click('#tchat .tc-pop'); await aly.waitForTimeout(300);
  console.log('aly open, badge cleared:', JSON.stringify(await st(aly)));
  await aly.evaluate(() => [...document.querySelectorAll('#tchat .tc-q')].find(b => b.textContent === 'Good luck').click()); await aly.waitForTimeout(900);
  console.log('beck log:', JSON.stringify((await st(beck)).log));
  await aly.screenshot({ path: T.S + '/shots/chat_aly_open.png' });
  // Esc in the box closes the box only, not the cabinet
  await beck.focus('#tchat .tc-in'); await beck.keyboard.press('Escape'); await beck.waitForTimeout(400);
  console.log('after Esc in box: panel', (await st(beck)).panel, 'cabinet open', await beck.evaluate(() => BridgeCabinetModal.isOpen()), 'focus', await beck.evaluate(() => document.activeElement && document.activeElement.id));
  // a second message arrives with the box closed: counted
  await aly.focus('#tchat .tc-in'); await aly.keyboard.type('one more hand?'); await aly.keyboard.press('Enter'); await aly.waitForTimeout(900);
  console.log('beck unread:', JSON.stringify(await st(beck)));
  await beck.screenshot({ path: T.S + '/shots/chat_beck_pop.png' });
  // leave the table: the chat goes, words go back to bubbles
  await beck.evaluate(() => BridgeCabinetModal.hide && BridgeCabinetModal.hide()); await aly.evaluate(() => BridgeCabinetModal.hide && BridgeCabinetModal.hide());
  await beck.waitForTimeout(1500);
  console.log('after leaving:', JSON.stringify(await st(beck)), 'sess', JSON.stringify(await T.sess(beck)));
  await aly.evaluate(() => BridgeMulti.say('see you at the bar')); await beck.waitForTimeout(700);
  console.log('in the world, a bubble:', (await st(beck)).bubbles);
  console.log('errors:', T.errs.length);
  await b.close();
})();
