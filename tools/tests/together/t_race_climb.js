// a climbing race between two pilots (js/race.js through js/together.js): up the Staircase from the same foot, each on
// their own holds, the foot waits for both, one clock; each climber sees the other on the face (a little aside); the
// first to the top takes it. A little hand climbs for each: the highest good hold in reach, every so often.
const T = require(__dirname + '/tg_lib.js');
const CLIMBBOT = (pace) => {
  if (window.__climbbot) clearInterval(window.__climbbot);
  window.__climbbot = setInterval(() => {
    const g = BridgeClimb._g();
    if (!g || g.phase !== 'climb' || g.anim || !g.started) return;
    const stand = g.at.kind === 'ledge' || g.at.kind === 'top';
    if (stand && g.stam < 85) return;                                // rest on a ledge
    if (!stand && g.stam < 35 && BridgeInventory.getCount('chalk') > 0) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    let best = -1, bz = -1e9;
    g.cands.forEach((c, i) => { if (c.ok && c.h.kind !== 'loose' && c.p.z > bz) { bz = c.p.z; best = i; } });
    if (best >= 0) BridgeClimb._reach(best);
  }, pace);
};
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'hoarfell-face', { x: 6, y: 34 }, { x: 9, y: 34 });
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Climbing race/); await beck.waitForTimeout(300);
  console.log('routes:', await T.dlg(beck));
  await T.click(beck, /^The Staircase/); await beck.waitForTimeout(300);
  await T.click(beck, /^Just for fun/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/); await aly.waitForTimeout(2500);
  const st = p => p.evaluate(() => { const g = BridgeClimb._g(); const o = Object.values(BridgeMulti.others())[0];
    return { phase: g && g.phase, count: g && +(+g.count).toFixed(2), started: g && g.started, now: Date.now() % 100000, z: g && +g.hand.z.toFixed(1), t: g && +g.t.toFixed(1), other: o && { posed: !!o.pose, kind: o.pose && o.pose.kind, x: +o.x.toFixed(1), lift: Math.round(o.lift || 0) } }; });
  console.log('at the foot: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  console.log('race beck', JSON.stringify(await beck.evaluate(() => BridgeRace._r())), '| aly', JSON.stringify(await aly.evaluate(() => BridgeRace._r())));
  for (const p of [beck, aly]) await p.evaluate(() => BridgeInventory.addItem('chalk', 6));
  await beck.evaluate(CLIMBBOT, 560); await aly.evaluate(CLIMBBOT, 640);
  await beck.waitForTimeout(9000);
  console.log('climbing: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/race_climb_beck.png' });
  await aly.screenshot({ path: T.S + '/shots/race_climb_aly.png' });
  for (let i = 0; i < 150; i++) {
    await beck.waitForTimeout(1000);
    const sb = await T.sess(beck), sa = await T.sess(aly);
    if ((!sb || sb.state === 'settled') && (!sa || sa.state === 'settled')) break;
    if (i % 10 === 0) console.log(i + 's beck', JSON.stringify(await st(beck)), JSON.stringify(sb && sb.mine), '| aly', JSON.stringify(await st(aly)), JSON.stringify(sa && sa.mine));
    // the top's menu: walk out onto the summit (the verdict waits for it to close)
    for (const p of [beck, aly]) if (/THE TOP/.test(await T.dlg(p))) await T.click(p, /^Walk out onto the summit|^Abseil/);
  }
  for (const p of [beck, aly]) if (/THE TOP/.test(await T.dlg(p))) await T.click(p, /^Walk out onto the summit|^Abseil/);
  await beck.waitForTimeout(2500);
  console.log('beck verdict:', await T.dlg(beck));
  console.log('aly verdict:', await T.dlg(aly));
  await beck.screenshot({ path: T.S + '/shots/race_climb_verdict.png' });
  console.log('errors:', T.errs.length);
  await b.close();
})();
