const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const click = (p, re) => p.evaluate(src => { const r = new RegExp(src); const b = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(e => r.test(e.innerText)); if (b) { b.click(); return true; } return false; }, re.source);
const dlg = p => p.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 220) : 'none'; });
const aid = '22222222-2222-2222-2222-222222222222', bid = '11111111-1111-1111-1111-111111111111';
const st = p => p.evaluate(() => { const b = BridgeSloop._boat(); return b ? BridgeSloop._phase() + ' ' + b.x.toFixed(1) + ',' + b.r.toFixed(1) + ' h' + b.h.toFixed(2) + ' v' + b.v.toFixed(2) : 'no boat'; });
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar-crown'); 
  const sp = await beck.evaluate(() => ({ x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }));
  await enter(aly, 'lumar-crown', { x: sp.x + 1, y: sp.y });
  await beck.waitForTimeout(1500);
  await beck.evaluate(id => BridgeMulti.menu(id), aid); await beck.waitForTimeout(300);
  console.log('menu:', await dlg(beck));
  await click(beck, /Sail together/); await beck.waitForTimeout(900);
  console.log('aly:', await dlg(aly));
  await click(aly, /Come aboard/); await aly.waitForTimeout(800);
  for (let i = 0; i < 30; i++) { await beck.waitForTimeout(400); if (await beck.evaluate(() => BridgeSloop._phase()) === 'sail') break; }
  await beck.waitForTimeout(1000);
  console.log('running', await beck.evaluate(() => BridgeSloop.isRunning()), await aly.evaluate(() => BridgeSloop.isRunning()), '| crew', await beck.evaluate(() => { const c = BridgeSloop._crew(); return c.crewOf && c.crewOf.name; }), await aly.evaluate(() => { const c = BridgeSloop._crew(); return c.captainOf && c.captainOf.name + ' mirror ' + !!c.mirror; }));
  console.log('beck', await st(beck), '| aly', await st(aly));
  // Beck sails out a way
  await beck.keyboard.down('ArrowRight'); await beck.waitForTimeout(1500); await beck.keyboard.up('ArrowRight');
  await beck.waitForTimeout(3000);
  console.log('after sailing: beck', await st(beck), '| aly', await st(aly));
  await beck.screenshot({ path: `${S}/sail_beck.png` });
  await aly.screenshot({ path: `${S}/sail_aly.png` });
  // course: Beck sets one; Alyssa's sea lays out the same
  await beck.evaluate(() => { const [A] = BridgeSloop._isles(), bt = BridgeSloop._boat(); bt.x = A.exit[0] + 6; bt.r = A.exit[1] + 6; });
  await beck.waitForTimeout(600);
  console.log('set course', await beck.evaluate(() => BridgeSloop.setCourse('lumar')));
  await beck.waitForTimeout(3000);
  console.log('B: beck', await beck.evaluate(() => { const B = BridgeSloop._isles()[1]; return B && B.id + ' ' + B.ox + ',' + B.oy; }), '| aly', await aly.evaluate(() => { const B = BridgeSloop._isles()[1]; return B && B.id + ' ' + B.ox + ',' + B.oy; }));
  console.log('things match', await beck.evaluate(() => BridgeSloop._things().map(t => t.kind + Math.round(t.x)).join(',')) === await aly.evaluate(() => BridgeSloop._things().map(t => t.kind + Math.round(t.x)).join(',')));
  // Alyssa can't steer: her keys do nothing
  const h0 = await aly.evaluate(() => BridgeSloop._boat().h);
  await aly.keyboard.down('ArrowLeft'); await aly.waitForTimeout(800); await aly.keyboard.up('ArrowLeft');
  console.log('aly steering ignored (follows beck):', Math.abs(await aly.evaluate(() => BridgeSloop._boat().h) - await beck.evaluate(() => BridgeSloop._boat().h)) < 0.1);
  // Beck stops and puts back in: Alyssa comes ashore with him
  await beck.evaluate(() => BridgeSloop.stop('lumar-crown', true));
  await aly.waitForTimeout(4000);
  console.log('ashore: beck', await beck.evaluate(() => BridgeSloop.isRunning() + ' ' + BridgeWorld.getWorldId()), '| aly', await aly.evaluate(() => BridgeSloop.isRunning() + ' ' + BridgeWorld.getWorldId()));
  await b.close();
})();
