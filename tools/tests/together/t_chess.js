// a game of chess over the wire: Beck (Ivory) and Alyssa (Obsidian) play the fool's mate
const T = require(__dirname + '/tg_lib.js');
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js'), args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const { beck, aly } = await T.two(b, 'arcadia', { x: 5, y: 4 }, { x: 7, y: 4 });
  for (const p of [beck, aly]) await p.evaluate(() => BridgeGames.note({ type: 'app', target: '/chess?theme=ship' }));
  await beck.waitForTimeout(3500);                                   // presence carries what you've found
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Chess/); await beck.waitForTimeout(300);
  console.log('stakes:', await T.dlg(beck));
  await T.click(beck, /^25 coins each/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/);
  await beck.waitForTimeout(3000);
  const fb = T.frame(beck), fa = T.frame(aly);
  await fb.waitForFunction(() => window.__chessNet, null, { timeout: 30000 });
  await fa.waitForFunction(() => window.__chessNet, null, { timeout: 30000 });
  await beck.waitForTimeout(3000);
  console.log('bar beck:', await beck.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  console.log('status beck:', await fb.evaluate(() => document.getElementById('wizard-status').textContent), '| aly:', await fa.evaluate(() => document.getElementById('wizard-status').textContent));
  await beck.screenshot({ path: T.S + '/shots/chess_beck_start.png' });
  const mv = async (f, a, z) => { await f.evaluate(([a, z]) => { const g = __chessNet.game; g.handleSquareClick(a); g.handleSquareClick(z); }, [a, z]); };
  const fen = f => f.evaluate(() => __chessNet.game.chess.fen());
  // Ivory can't move Obsidian's pieces, nor out of turn
  await mv(fa, 'e7', 'e5'); await beck.waitForTimeout(500);
  console.log('aly out of turn ignored:', (await fen(fa)).split(' ')[0] === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  await mv(fb, 'f2', 'f3'); await beck.waitForTimeout(4000);
  console.log('after f3:', await fen(fb), '|', await fen(fa));
  await mv(fa, 'e7', 'e5'); await beck.waitForTimeout(4000);
  await mv(fb, 'g2', 'g4'); await beck.waitForTimeout(4000);
  console.log('after g4:', await fen(fb) === await fen(fa));
  await aly.screenshot({ path: T.S + '/shots/chess_aly_mid.png' });
  console.log('bar aly:', await aly.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  await mv(fa, 'd8', 'h4'); await beck.waitForTimeout(6000);
  console.log('mate:', await fb.evaluate(() => __chessNet.game.chess.isCheckmate()), await fa.evaluate(() => __chessNet.game.chess.isCheckmate()));
  console.log('beck board:', await fb.evaluate(() => { const g = __chessNet.game; return { anim: g.animating, review: g.reviewMode, q: g.netQueue, fen: g.chess.fen() }; }));
  await beck.waitForTimeout(5000);
  console.log('beck board later:', await fb.evaluate(() => { const g = __chessNet.game; return { anim: g.animating, review: g.reviewMode, q: g.netQueue, fen: g.chess.fen(), mate: g.chess.isCheckmate() }; }));
  console.log('status beck:', await fb.evaluate(() => document.getElementById('wizard-status').textContent), '| aly:', await fa.evaluate(() => document.getElementById('wizard-status').textContent));
  console.log('bar beck:', await beck.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')), '| aly:', await aly.evaluate(() => document.getElementById('cabinet-vs').innerText.replace(/\n/g, ' ')));
  await beck.screenshot({ path: T.S + '/shots/chess_beck_end.png' });
  await aly.screenshot({ path: T.S + '/shots/chess_aly_end.png' });
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
