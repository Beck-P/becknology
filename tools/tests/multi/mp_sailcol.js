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
  await enter(beck, 'lumar'); 
  const sp = await beck.evaluate(() => ({ x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }));
  await enter(aly, 'lumar', { x: sp.x + 1, y: sp.y });
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
  await beck.keyboard.down('ArrowRight'); await beck.waitForTimeout(1200); await beck.keyboard.up('ArrowRight');
  await beck.waitForTimeout(1500);
  await beck.evaluate(() => { const [A] = BridgeSloop._isles(), bt = BridgeSloop._boat(); bt.x = A.exit[0] + 6; bt.r = A.exit[1] + 6; });
  await beck.waitForTimeout(600);
  console.log('commit', await beck.evaluate(() => { BridgeSloop._commit('lumar-crimson'); return true; }));
  await beck.waitForTimeout(1500);
  // islands load as they come over the horizon: run down the course until Crimson's harbour is known
  for (let i = 0; i < 24 && !(await beck.evaluate(() => !!BridgeSloop._isles()[1])); i++) {
    await beck.evaluate(() => { const [r] = BridgeSloop._route(), bt = BridgeSloop._boat(), q = r && r[r.length - 1]; if (q) { bt.x += (q[0] - bt.x) * 0.4; bt.r += (q[1] - bt.r) * 0.4; bt.v = 0; } });
    await beck.waitForTimeout(700);
  }
  const pals = p => p.evaluate(() => { const [A, B] = BridgeSloop._isles(); return (A && A.pal) + ' -> ' + (B ? B.id + ' ' + B.pal : 'NO B'); });
  console.log('beck', await pals(beck), '| aly', await pals(aly));
  await beck.evaluate(() => { const [A, B] = BridgeSloop._isles(), bt = BridgeSloop._boat(); bt.x = B.exit[0]; bt.r = B.exit[1]; bt.v = 0; });
  await beck.waitForTimeout(2500);
  console.log('near B: beck', await st(beck), '| aly', await st(aly));
  await beck.screenshot({ path: `${S}/sailcol_beck.png` }); await aly.screenshot({ path: `${S}/sailcol_aly.png` });
  await b.close();
})();
