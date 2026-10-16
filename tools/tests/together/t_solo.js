// the games alone, as before: nothing about playing together should show or change them
const T = require(__dirname + '/tg_lib.js');
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js'), args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  await T.reset();
  const p = await T.player(b, T.S, T.BECK);
  await T.cdn(p.context());
  const errs = []; p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::|Leaderboard/.test(m.text())) errs.push(m.text()); });
  // a cabinet: the normal title, a run, the normal game over
  await T.enter(p, 'arcadia', { x: 5, y: 4 });
  await p.evaluate(() => BridgeCabinetModal.show({ url: '/helicopter', title: 'HELICOPTER', gameKey: 'helicopter' }));
  await p.waitForTimeout(2500);
  let f = p.frames().find(x => /helicopter/.test(x.url()));
  console.log('together frame?', await f.evaluate(() => window.BridgeTogetherFrame), 'vs strip?', await p.evaluate(() => !!document.getElementById('cabinet-vs')));
  await f.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))); await p.waitForTimeout(400);
  console.log('mode after space:', await f.evaluate(() => BridgeArcade.api.mode()));
  await p.waitForTimeout(2500);
  console.log('mode later (fell):', await f.evaluate(() => BridgeArcade.api.mode()));
  await p.screenshot({ path: T.S + '/shots/solo_heli.png' });
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  console.log('cabinet closed:', !(await p.evaluate(() => BridgeCabinetModal.isOpen())));
  // the dice alone
  await T.enter(p, 'hoarfell-lodge', { x: 12, y: 4 });
  await p.evaluate(() => BridgeLodge.use({ type: 'dice', table: 'fell' })); await p.waitForTimeout(300);
  await T.click(p, /^10 coins/); await p.waitForTimeout(1200);
  const g = await p.evaluate(() => { const g = BridgeLodge._g(); return g && { me: g.me, n: g.players.map(x => x.name + ':' + x.n), net: g.net }; });
  console.log('solo table:', JSON.stringify(g));
  for (let i = 0; i < 60; i++) {
    const r = await p.evaluate(() => { const g = BridgeLodge._g(); if (!g) return 'over'; if (g.phase === 'reveal') { BridgeLodge._act('next'); return 'next'; } if (g.turn === 0 && g.phase === 'bid') { BridgeLodge._act(g.bid && g.bid.q >= 4 ? 'liar' : 'bid'); return 'act'; } return 'wait'; });
    if (r === 'over') break;
    await p.waitForTimeout(700);
  }
  console.log('dice ended:', await T.dlg(p));
  await p.keyboard.press('Escape');
  // splice and pachinko alone
  await T.enter(p, 'null-den', { x: 6, y: 4 });
  await p.evaluate(() => BridgeSplice.open()); await p.waitForTimeout(500);
  console.log('splice:', await p.evaluate(() => document.querySelector('.sp-job').textContent), '| them line:', await p.evaluate(() => !!document.querySelector('.sp-them')));
  await p.evaluate(() => BridgeSplice.close());
  await T.enter(p, 'arcadia-lucky-7', { x: 4, y: 4 });
  await p.evaluate(() => BridgePachinko.open({ machine: 'lucky-cat' })); await p.waitForTimeout(500);
  console.log('pachinko labels:', await p.evaluate(() => document.querySelector('.pk-balls-l').textContent + ' / ' + document.querySelector('.pk-net-l').textContent + ' / match? ' + document.getElementById('pachinko').classList.contains('match')));
  await p.evaluate(() => BridgePachinko.close());
  // chess against the engine still loads as before
  await T.enter(p, 'quarters', null);
  await p.evaluate(() => BridgeCabinetModal.show({ url: '/chess?theme=ship', title: 'CHESS', gameKey: 'chess' }));
  await p.waitForTimeout(12000);
  f = p.frames().find(x => /chess/.test(x.url()));
  console.log('chess mode select visible:', await f.evaluate(() => !document.getElementById('wc-mode').closest('.field-group').hidden), 'status:', await f.evaluate(() => document.getElementById('wizard-status').textContent.slice(0, 60)));
  console.log('console errors:', errs.length, errs.slice(0, 3));
  await b.close();
})();
