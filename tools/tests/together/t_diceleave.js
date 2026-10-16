// three cups, and Alyssa walks away after the first round: Beck plays it out against Sigrun and isn't called off
const T = require(__dirname + '/tg_lib.js');
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'hoarfell-lodge', { x: 12, y: 4 }, { x: 13, y: 4 });
  await beck.evaluate(id => BridgeTogether.ask(id, { g: 'dice', mode: 'table', wager: 25, opts: { table: 'fell', seats: 3 } }), T.AID);
  await beck.waitForTimeout(1200);
  await T.click(aly, /^Play$/); await aly.waitForTimeout(2500);
  await aly.keyboard.press('Escape'); await aly.waitForTimeout(1500);   // Alyssa leaves the table
  console.log('aly:', await T.dlg(aly), '| aly sess', await T.sess(aly));
  console.log('beck table:', await beck.evaluate(() => { const g = BridgeLodge._g(); return g && g.players.map(p => p.name + ':' + p.n).join(' ') + ' · ' + g.log.slice(-1).map(e => e.k).join(); }));
  const play = p => p.evaluate(() => {
    const g = BridgeLodge._g(); if (!g || g.headless) return 'none';
    if (g.phase === 'reveal') { BridgeLodge._act('next'); return 'next'; }
    if (g.phase !== 'bid' || g.turn !== g.me || g.players[g.me].n === 0) return 'wait';
    BridgeLodge._act(g.bid && g.bid.by !== g.me && (g.bid.q >= 4 || g.bid.q >= g.players.reduce((a, p) => a + p.n, 0)) ? 'liar' : 'bid'); return 'act';
  });
  for (let i = 0; i < 200; i++) { if ((await play(beck)) === 'none') break; await beck.waitForTimeout(500); }
  await beck.waitForTimeout(1500);
  console.log('beck:', await T.dlg(beck));
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
