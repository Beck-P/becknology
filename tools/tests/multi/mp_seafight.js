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
  // out past the harbour; a pirate cutter comes for them
  await beck.evaluate(() => { const bt = BridgeSloop._boat(); bt.x += 30; bt.r += 25; });
  await beck.waitForTimeout(1500);
  await beck.evaluate(() => BridgeSeaFight._spawn('cutter'));
  let hailed = false;
  for (let i = 0; i < 40 && !hailed; i++) {
    await beck.waitForTimeout(400);
    hailed = await beck.evaluate(() => !!document.querySelector('.sloop-menu') && /HEAVE TO/.test(document.querySelector('.sloop-menu').innerText));
  }
  console.log('beck hailed', hailed, '| aly sees foes', await aly.evaluate(() => BridgeSeaFight._foes().map(o => o.kind + ' ' + o.state + ' ' + o.hp)));
  console.log('buttons', await beck.evaluate(() => [...document.querySelectorAll('.sloop-menu button')].map(e => e.innerText)));
  await beck.evaluate(() => { const b = [...document.querySelectorAll('.sloop-menu button')].find(e => /fight/i.test(e.innerText)); b && b.click(); });
  await beck.waitForTimeout(500);
  // bring them alongside: the cutter right off Alyssa's side, in swivel range
  await beck.evaluate(() => { const o = BridgeSeaFight._foes()[0], b = BridgeSloop._boat(); o.x = b.x + Math.cos(b.h + Math.PI / 2) * 4; o.r = b.r + Math.sin(b.h + Math.PI / 2) * 4; o.h = b.h; });
  await beck.waitForTimeout(1200);
  const hp0 = await beck.evaluate(() => BridgeSeaFight._foes()[0].hp);
  console.log('aly before F:', await aly.evaluate(() => { const b = BridgeSloop._boat(), o = BridgeSeaFight._foes()[0]; return o ? Math.hypot(o.x - b.x, o.r - b.r).toFixed(1) + ' state ' + o.state : 'no foe'; }));
  await aly.keyboard.press('f'); await aly.waitForTimeout(1300);
  const hp1 = await beck.evaluate(() => BridgeSeaFight._foes()[0] && BridgeSeaFight._foes()[0].hp);
  console.log('cutter hp', hp0, '->', hp1, '(includes Beck\'s guns) | aly view', await aly.evaluate(() => BridgeSeaFight._foes().map(o => o.state + ' ' + o.hp + '/' + o.max)));
  await aly.screenshot({ path: `${S}/seafight_aly.png` });
  await beck.screenshot({ path: `${S}/seafight_beck.png` });
  const c0 = await aly.evaluate(() => window._coins);
  await beck.evaluate(() => { const o = BridgeSeaFight._foes()[0]; o.hp = 1; });
  for (let i = 0; i < 20; i++) { await aly.keyboard.press('f'); await aly.waitForTimeout(800); if (await beck.evaluate(() => !BridgeSeaFight._foes()[0] || BridgeSeaFight._foes()[0].state === 'sink')) break; }
  await aly.waitForTimeout(1500);
  console.log('sunk:', await beck.evaluate(() => BridgeSeaFight._foes().map(o => o.state)), '| aly coins', c0, '->', await aly.evaluate(() => window._coins));
  await b.close();
})();
