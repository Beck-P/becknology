// a sailing race between two pilots (js/race.js through js/together.js, js/sloop.js): asked on Diggen's Point's quay, a
// course to Tern Holm, both down to their sloops, side by side off the pier till the gun, one gun; each sees the other
// sloop on the water; a helmsman sails each (tools/tests/autohelm.js); the first across Tern Holm's harbour mouth takes it.
// `party` (argv[2]): the two are a party first (js/party.js) — each still races her own sloop: nobody is called aboard
const T = require(__dirname + '/tg_lib.js');
const AUTOHELM = require(__dirname + '/../autohelm.js');
(async () => {
  const b = await T.chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const { beck, aly } = await T.two(b, 'lumar', null, null);
  const sp = await beck.evaluate(() => ({ x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }));
  await aly.evaluate(([x, y]) => BridgeState.transition('world', { worldId: 'lumar', spawn: { x: x + 1, y: y } }), [sp.x, sp.y]);
  await beck.waitForTimeout(1500);
  for (const p of [beck, aly]) await p.evaluate(() => BridgeWeather._pin('lumar', 'breezy'));
  const PARTY = process.argv[2] === 'party';
  if (PARTY) {
    await beck.evaluate(id => BridgeMulti.menu(id), T.AID); await beck.waitForTimeout(300);
    await T.click(beck, /Invite to play together/); await aly.waitForTimeout(900);
    await T.click(aly, /^Play together$/); await aly.waitForTimeout(900);
    console.log('party:', await beck.evaluate(id => BridgeParty.has(id), T.AID), await aly.evaluate(id => BridgeParty.has(id), T.BID));
    for (const p of [beck, aly]) if (await p.evaluate(() => !!document.querySelector('.world-dialog'))) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  }
  const called = p => p.evaluate(() => ['party-check', 'party-call', 'party-wait'].filter(i => { const e = document.getElementById(i); return e && e.offsetParent; }));
  await beck.evaluate(id => BridgeTogether.pick(id), T.AID); await beck.waitForTimeout(300);
  console.log('picker:', await T.dlg(beck));
  await T.click(beck, /^Sailing race/); await beck.waitForTimeout(300);
  console.log('courses:', await T.dlg(beck));
  await beck.screenshot({ path: T.S + '/shots/race_sail_courses.png' });
  await T.click(beck, /^To Tern Holm/); await beck.waitForTimeout(300);
  await T.click(beck, /^10 coins each/); await beck.waitForTimeout(1200);
  console.log('aly asked:', await T.dlg(aly));
  await T.click(aly, /^Play$/);
  const st = p => p.evaluate(() => { const r = BridgeSloop._race(), b = BridgeSloop._boat(), peers = BridgeSloop._seaPeers();
    return { phase: BridgeSloop._phase(), gun: r && r.gun, ready: r && r.ready, done: r && r.done, ms: r && r.ms, place: r && r.place, lane: r && r.lane && r.lane.map(v => +v.toFixed(1)),
             x: b && +b.x.toFixed(1), r: b && +b.r.toFixed(1), v: b && +b.v.toFixed(2), peers: Object.values(peers).map(o => o.name + '@' + o.x.toFixed(0) + ',' + o.r.toFixed(0) + ' rg' + o.rg + (o.rf ? ' rf' + o.rf : '')) }; });
  const party = [];
  for (let i = 0; i < 40; i++) { await beck.waitForTimeout(500); const a = await st(beck), c = await st(aly);
    if (PARTY) party.push(...(await called(beck)).map(x => 'beck:' + x), ...(await called(aly)).map(x => 'aly:' + x));
    if (a.gun && c.gun) break; if (i % 4 === 0) console.log('start: beck', JSON.stringify(a), '| aly', JSON.stringify(c)); }
  if (PARTY) console.log('party panels while starting:', [...new Set(party)].join(' ') || 'none', '| crewing:', ...(await Promise.all([beck, aly].map(p => p.evaluate(() => { const c = BridgeSloop._crew(); return JSON.stringify({ crewOf: c.crewOf || null, captainOf: c.captainOf || null }); })))));
  console.log('gun: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/race_sail_line.png' });
  await beck.evaluate(AUTOHELM); await aly.evaluate(AUTOHELM);
  await beck.waitForTimeout(12000);
  console.log('racing: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/race_sail_beck.png' });
  await aly.screenshot({ path: T.S + '/shots/race_sail_aly.png' });
  for (let i = 0; i < 200; i++) {
    await beck.waitForTimeout(1000);
    const sb = await T.sess(beck), sa = await T.sess(aly);
    if ((!sb || sb.state === 'settled') && (!sa || sa.state === 'settled')) break;
    if (i % 15 === 0) console.log(i + 's beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  }
  console.log('end: beck', JSON.stringify(await st(beck)), '| aly', JSON.stringify(await st(aly)));
  await beck.screenshot({ path: T.S + '/shots/race_sail_end.png' });
  for (const p of [beck, aly]) await p.evaluate(() => window.__helm && window.__helm.stop());
  await beck.waitForTimeout(1500);
  console.log('beck verdict:', await T.dlg(beck));
  console.log('aly verdict:', await T.dlg(aly));
  console.log('coins', await T.coins(beck), await T.coins(aly));
  console.log('errors:', T.errs.length);
  await b.close();
})();
