// a ski race between two pilots (js/race.js through js/together.js): asked from the players menu on the pistes, a run
// and a stake picked, both taken to the gate side by side, the gate waits for both, one clock, each skiing (a little
// helmsman steers each at the next gate), each seeing the other ski in their own suit, the quicker time takes the pot
const T = require(__dirname + '/tg_lib.js');
const RUN = process.argv[2] || 'nursery';
// steers your skier at the next gate (or the finish), tucked when it's straight ahead
const SKIBOT = () => {
  if (window.__skibot) clearInterval(window.__skibot);
  const held = {};
  const key = (k, on) => { if (!!held[k] === !!on) return; held[k] = !!on; document.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: k, bubbles: true })); };
  window.__skibot = setInterval(() => {
    const s = BridgeSki._s(), w = BridgeWorld.getWorld();
    if (!s || !w || !w.ski || !s.id || s.phase !== 'run') { key('ArrowLeft', false); key('ArrowRight', false); key('ArrowDown', false); return; }
    const R = w.ski.runs[s.id], g = R.gates[s.gate] || [R.line[R.line.length - 1][0], w.ski.finish + 2];
    const want = Math.max(-1.2, Math.min(1.2, Math.atan2(g[0] - s.x, Math.max(0.6, g[1] - s.y)))), d = want - s.a;
    key('ArrowRight', d > 0.04); key('ArrowLeft', d < -0.04); key('ArrowDown', Math.abs(d) < 0.25);
  }, 30);
};
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'hoarfell-piste', { x: 34, y: 8 }, { x: 35, y: 8 });
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Ski race/); await beck.waitForTimeout(300);
  console.log('runs:', await T.dlg(beck));
  await beck.screenshot({ path: T.S + '/shots/race_ski_runs.png' });
  await T.click(beck, new RegExp('^' + { nursery: 'The Nursery Slope', pinewood: 'Pinewood', couloir: 'The Couloir' }[RUN])); await beck.waitForTimeout(300);
  console.log('stakes:', await T.dlg(beck));
  await T.click(beck, /^25 coins each/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(2500);
  const st = p => p.evaluate(() => { const s = BridgeSki._s(); const o = Object.values(BridgeMulti.others())[0];
    return { phase: s && s.phase, x: s && +s.x.toFixed(2), y: s && +s.y.toFixed(2), t: s && +s.t.toFixed(1), gate: s && s.gate, at: s && s.race && !!s.race.at,
             other: o && { posed: !!o.pose, kind: o.pose && o.pose.kind, x: +o.x.toFixed(1), y: +o.y.toFixed(1) } }; });
  console.log('at the gate: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/race_ski_gate.png' });
  await beck.evaluate(SKIBOT); await aly.evaluate(SKIBOT);
  await beck.waitForTimeout(4500);
  console.log('off: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/race_ski_beck.png' });
  await aly.screenshot({ path: T.S + '/shots/race_ski_aly.png' });
  await beck.waitForTimeout(5000);
  console.log('mid: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  await aly.screenshot({ path: T.S + '/shots/race_ski_aly_mid.png' });
  for (let i = 0; i < 120; i++) {
    await beck.waitForTimeout(1000);
    const sb = await T.sess(beck), sa = await T.sess(aly);
    if ((!sb || sb.state === 'settled') && (!sa || sa.state === 'settled')) break;
    if (i % 10 === 0) console.log(i + 's beck', JSON.stringify(sb && { mine: sb.mine, theirs: sb.theirs }), '| aly', JSON.stringify(sa && { mine: sa.mine, theirs: sa.theirs }));
  }
  await beck.waitForTimeout(1500);
  console.log('beck verdict:', await T.dlg(beck));
  console.log('aly verdict:', await T.dlg(aly));
  await beck.screenshot({ path: T.S + '/shots/race_ski_verdict.png' });
  console.log('coins', await T.coins(beck), await T.coins(aly), '(each started with 500 and put in 25; the pot is 50)');
  console.log('record', JSON.stringify(await beck.evaluate(id => BridgeTogether._record(id), T.AID)));
  console.log('errors:', T.errs.length);
  await b.close();
})();
