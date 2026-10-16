// a dance-off over the wire at Club Void (or in step: node t_dance.js 'In step')
const T = require(__dirname + '/tg_lib.js');
const mode = process.argv[2] || 'Dance-off';
const dancer = (p, skill) => p.evaluate(skill => {           // a dancer that hits each arrow on its beat (skill: how often)
  window.__dancer = setInterval(() => {
    const r = BridgeDance._run(); if (!r || !r.players[0]) return;
    const b = BridgeDance.beat(), pl = r.players[0];
    pl.notes.forEach((n, i) => {
      if (n.hit || n.tried) return;
      if (Math.abs(b - n.beat) < 0.04) { n.tried = true; if (Math.random() < skill) BridgeDance._hit(n.lane, 0); }
    });
  }, 8);
}, skill);
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'arcadia-club', { x: 8, y: 4 }, { x: 10, y: 4 });
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^The dance floor/); await beck.waitForTimeout(300);
  console.log('modes:', await T.dlg(beck));
  await T.click(beck, new RegExp('^' + mode)); await beck.waitForTimeout(300);
  console.log('levels:', await T.dlg(beck));
  await T.click(beck, /^Easy/); await beck.waitForTimeout(300);
  await T.click(beck, /^10 coins each/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(800);
  await dancer(beck, 1); await dancer(aly, 0.7);
  console.log('runs', await beck.evaluate(() => !!BridgeDance._run()), await aly.evaluate(() => !!BridgeDance._run()));
  console.log('positions', await beck.evaluate(() => [BridgeCharacter.getX(), BridgeCharacter.getY()]), await aly.evaluate(() => [BridgeCharacter.getX(), BridgeCharacter.getY()]));
  await beck.waitForTimeout(9000);
  await beck.screenshot({ path: T.S + '/shots/dance_beck.png' });
  await aly.screenshot({ path: T.S + '/shots/dance_aly.png' });
  const sc = p => p.evaluate(() => { const r = BridgeDance._run(); return r ? r.players.map(pl => pl.name + ' ' + pl.score + ' combo ' + pl.combo) : 'done'; });
  console.log('scores beck', await sc(beck), '| aly', await sc(aly));
  for (let i = 0; i < 40; i++) { await beck.waitForTimeout(1000); if (!(await T.sess(beck)) && !(await T.sess(aly))) break; }
  await beck.waitForTimeout(1200);
  console.log('beck:', await T.dlg(beck));
  console.log('aly:', await T.dlg(aly));
  await beck.screenshot({ path: T.S + '/shots/dance_end_beck.png' });
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
