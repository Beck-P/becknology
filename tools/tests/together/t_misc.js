// the edges: a "not now", someone watching (a third pilot), a partner vanishing mid-duel, a stake left on the table
const T = require(__dirname + '/tg_lib.js');
const NICO = { id: '33333333-3333-3333-3333-333333333333', name: 'NICO', suit_color: 'purple' };
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'arcadia', { x: 5, y: 4 }, { x: 7, y: 4 });
  // 1. not now
  await beck.evaluate(id => BridgeTogether.ask(id, { g: 'breakout', mode: 'duel', wager: 10, opts: {} }), T.AID); await beck.waitForTimeout(1200);
  await T.click(aly, /^Not now$/); await beck.waitForTimeout(1000);
  console.log('after not now: beck sess', await T.sess(beck), 'toast:', await beck.evaluate(() => { const t = document.querySelector('.quest-toast'); return t && t.innerText.replace(/\n/g, ' '); }));
  // 2. a third pilot watches
  const nico = await T.player(b, T.S, NICO);
  await T.cdn(nico.context());
  await T.enter(nico, 'arcadia', { x: 9, y: 5 });
  await beck.evaluate(id => BridgeTogether.ask(id, { g: 'breakout', mode: 'duel', wager: 25, opts: {} }), T.AID); await beck.waitForTimeout(1200);
  await T.click(aly, /^Play$/); await beck.waitForTimeout(8000);
  const fb = T.frame(beck), fa = T.frame(aly);
  await fb.evaluate(() => { BridgeArcade.api.score = 812; }); await fa.evaluate(() => { BridgeArcade.api.score = 640; });
  await nico.waitForTimeout(4000);
  console.log('nico sees badges:', await nico.evaluate(() => [...document.querySelectorAll('.tg-badge')].map(e => e.innerText)));
  await nico.evaluate(id => BridgeMulti.menu(id), T.BID); await nico.waitForTimeout(300);
  console.log('nico menu:', await T.dlg(nico));
  await T.click(nico, /^Watch Beck/); await nico.waitForTimeout(1500);
  console.log('nico watch card:', await nico.evaluate(() => document.getElementById('tg-watch').innerText.replace(/\n/g, ' | ')));
  await nico.screenshot({ path: T.S + '/shots/watch_nico.png' });
  // 3. Alyssa vanishes mid-duel: Beck's stake comes back
  console.log('coins before', await T.coins(beck));
  await aly.close();
  for (let i = 0; i < 40; i++) { await beck.waitForTimeout(1000); if (!(await T.sess(beck))) { console.log('refunded after', i + 1, 's'); break; } }
  console.log('beck after alyssa left: coins', await T.coins(beck), 'sess', await T.sess(beck));
  console.log('beck cabinet:', await fb.evaluate(() => BridgeArcade.api.mode()));
  await beck.screenshot({ path: T.S + '/shots/vanish_beck.png' });
  // 4. a stake on the table when the page closed comes back next time
  await beck.evaluate(() => localStorage.setItem('bridge_together', JSON.stringify({ stake: { sid: 'old1', n: 30, g: 'chess', at: Date.now() - 60000 } })));
  await beck.reload(); await beck.waitForTimeout(7000);
  console.log('after reload: stake left', await beck.evaluate(() => JSON.parse(localStorage.getItem('bridge_together')).stake || null),
              '| log:', await beck.evaluate(() => (BridgeQuests.log ? BridgeQuests.log() : []).slice(0, 3).map(e => e.k + ': ' + e.t + ' ' + (e.s || '')).join(' / ')));
  console.log('errors:', T.errs.length);
  await b.close();
})();
