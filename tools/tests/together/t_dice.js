// liar's dice together at the lodge: Beck runs the table, Alyssa sits in, Sigrun fills the third cup (or heads up)
const T = require(__dirname + '/tg_lib.js');
const seats = process.argv[2] || 'With';                     // 'With' (three cups) or 'Heads up'
const world = process.argv[3] || 'hoarfell-lodge';
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const sp = world === 'hoarfell-lodge' ? [{ x: 12, y: 4 }, { x: 13, y: 4 }] : [{ x: 12, y: 3 }, { x: 13, y: 3 }];
  const { beck, aly } = await T.two(b, world, sp[0], sp[1]);
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^(Fell Dice|Bones)/); await beck.waitForTimeout(300);
  console.log('stakes:', await T.dlg(beck));
  await beck.screenshot({ path: T.S + '/shots/dice_stakes.png' });
  await T.click(beck, new RegExp('^' + seats + '.*25 each')); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(2000);
  const view = p => p.evaluate(() => { const g = BridgeLodge._g(); if (!g) return null; return { me: g.me, phase: g.phase, turn: g.turn, bid: g.bid, n: g.players.map(p => p.name + ':' + p.n + ':' + (p.dice || []).join('')), log: g.log.length }; });
  console.log('beck view', JSON.stringify(await view(beck)));
  console.log('aly view', JSON.stringify(await view(aly)));
  await beck.screenshot({ path: T.S + '/shots/dice_beck_start.png' });
  await aly.screenshot({ path: T.S + '/shots/dice_aly_start.png' });
  let shot = 0;
  const play = async (p) => p.evaluate(() => {          // on my turn: call a big bid a lie, else bid the suggestion
    const g = BridgeLodge._g(); if (!g || g.headless) return 'none';
    if (g.phase === 'reveal') { BridgeLodge._act('next'); return 'next'; }
    if (g.phase !== 'bid' || g.turn !== g.me || g.players[g.me].n === 0) return 'wait';
    if (g.bid && g.bid.by !== g.me && (g.bid.q >= 4 || g.bid.q >= g.players.reduce((a, p) => a + p.n, 0))) { BridgeLodge._act('liar'); return 'liar'; }
    BridgeLodge._act('bid'); return 'bid';
  });
  for (let i = 0; i < 240; i++) {
    const a = await play(beck), c = await play(aly);
    if (i === 6 && !shot) { shot = 1; await aly.screenshot({ path: T.S + '/shots/dice_aly_mid.png' }); await beck.screenshot({ path: T.S + '/shots/dice_beck_mid.png' }); }
    if ((a === 'liar' || c === 'liar') && shot === 1) { await beck.waitForTimeout(300); shot = 2; await aly.screenshot({ path: T.S + '/shots/dice_aly_reveal.png' }); }
    const sb = await T.sess(beck), sa = await T.sess(aly);
    if (!sb && !sa && i > 3) break;
    await beck.waitForTimeout(500);
  }
  await beck.waitForTimeout(1500);
  console.log('END beck', JSON.stringify(await view(beck)), JSON.stringify(await T.sess(beck)));
  console.log('END aly', JSON.stringify(await view(aly)), JSON.stringify(await T.sess(aly)));
  console.log('beck dialog:', await T.dlg(beck));
  console.log('aly dialog:', await T.dlg(aly));
  await beck.screenshot({ path: T.S + '/shots/dice_beck_end.png' });
  await aly.screenshot({ path: T.S + '/shots/dice_aly_end.png' });
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
