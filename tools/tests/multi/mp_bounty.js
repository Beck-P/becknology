// Cinder Key's bounties sunk together (js/lumar-deep.js, js/seafight.js): Beck captains, Alyssa crews. Both read the
// same week's three; a wanted raider comes for them and goes down with Alyssa at the swivel; the captain's word
// (`sf-prize` carrying `wanted`) marks it for her too; each claims their own from Scarlet Dee, neither is paid twice.
const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const click = (p, re) => p.evaluate(src => { const r = new RegExp(src); const b = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(e => r.test(e.innerText)); if (b) { b.click(); return true; } return false; }, re.source);
const aid = '22222222-2222-2222-2222-222222222222';
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  let errs = 0;
  const bad = (m) => { errs++; console.log('BAD', m); };
  for (const p of [beck, aly]) await p.evaluate(() => { localStorage.removeItem('bridge_lumar_deep'); localStorage.setItem('bridge_sail_taught', '1'); BridgeLumarDeep.reload(); });
  const W = [await beck.evaluate(() => BridgeLumarDeep.bounties()), await aly.evaluate(() => BridgeLumarDeep.bounties())];
  console.log('this week: beck', W[0].map(x => x.ship).join(', '), '| aly', W[1].map(x => x.ship).join(', '));
  if (JSON.stringify(W[0]) !== JSON.stringify(W[1])) bad('two different boards');
  const raider = W[0][0];
  // both read the board on Cinder Key
  await enter(beck, 'lumar-cinder', { x: 28, y: 23 }); await enter(aly, 'lumar-cinder', { x: 29, y: 23 });
  for (const p of [beck, aly]) { await p.evaluate(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.label === 'WANTED'); BridgeInteractions.execute(i); }); await p.waitForTimeout(1200); await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  if (!(await aly.evaluate(() => BridgeLumarDeep.hunting(['crimson'])))) bad('Alyssa read the board but nobody hunts her');
  // out together from the pier, Beck at the helm
  await beck.waitForTimeout(1500);
  await beck.evaluate(id => BridgeMulti.menu(id), aid); await beck.waitForTimeout(400);
  await click(beck, /Sail together/); await beck.waitForTimeout(900);
  await click(aly, /Come aboard/); await aly.waitForTimeout(800);
  for (let i = 0; i < 30; i++) { await beck.waitForTimeout(400); if (await beck.evaluate(() => BridgeSloop._phase()) === 'sail') break; }
  const crew = await aly.evaluate(() => { const c = BridgeSloop._crew(); return !!(c && c.captainOf); });
  console.log('aly crewing:', crew);
  if (!crew) bad('Alyssa isn\'t aboard as crew');
  await beck.evaluate(() => { const bt = BridgeSloop._boat(); bt.r += 22; });
  await beck.waitForTimeout(1500);
  // the wanted raider (planned as js/seafight.js `plan` makes her: the bounty's id on her, her name over her)
  await beck.evaluate((W) => { BridgeSeaFight._foes().length = 0; BridgeSeaFight._spawn('raider'); const o = BridgeSeaFight._foes()[0]; o.wanted = W.id; o.K = Object.assign({}, o.K, { name: W.ship + ', wanted' }); }, raider);
  for (let i = 0; i < 30; i++) { await beck.waitForTimeout(400); if (await beck.evaluate(() => !!document.querySelector('.sloop-menu') && /HEAVE TO/.test(document.querySelector('.sloop-menu').innerText))) break; }
  await beck.evaluate(() => { const b = [...document.querySelectorAll('.sloop-menu button')].find(e => /fight/i.test(e.innerText)); b && b.click(); });
  await beck.waitForTimeout(500);
  await beck.evaluate(() => { const o = BridgeSeaFight._foes()[0], b = BridgeSloop._boat(); o.x = b.x + Math.cos(b.h + Math.PI / 2) * 4; o.r = b.r + Math.sin(b.h + Math.PI / 2) * 4; o.h = b.h; o.hp = 1; });
  for (let i = 0; i < 25; i++) {
    await aly.keyboard.press('f'); await aly.waitForTimeout(800);
    if (await beck.evaluate(() => !BridgeSeaFight._foes()[0] || BridgeSeaFight._foes()[0].state === 'sink')) break;
    await beck.evaluate(() => { const o = BridgeSeaFight._foes()[0], b = BridgeSloop._boat(); if (o) { o.x = b.x + Math.cos(b.h + Math.PI / 2) * 4; o.r = b.r + Math.sin(b.h + Math.PI / 2) * 4; o.v = 0; } });
  }
  await aly.waitForTimeout(2000);
  await aly.screenshot({ path: `${S}/bounty_sunk_aly.png` });
  const beaten = [await beck.evaluate((id) => !!BridgeLumarDeep._st().bounty.beaten[id], raider.id), await aly.evaluate((id) => !!BridgeLumarDeep._st().bounty.beaten[id], raider.id)];
  console.log('sunk, noted: beck', beaten[0], '| aly', beaten[1]);
  if (!beaten[0] || !beaten[1]) bad('the sinking isn\'t each one\'s to claim');
  // ashore, each claims from Scarlet Dee
  await beck.evaluate(() => { try { BridgeSloop.stop && BridgeSloop.stop(); } catch (e) { } });
  await aly.evaluate(() => { try { BridgeSloop.stop && BridgeSloop.stop(); } catch (e) { } });
  await enter(beck, 'lumar-cinder', { x: 27, y: 30 }); await enter(aly, 'lumar-cinder', { x: 29, y: 30 });
  const c0 = [await beck.evaluate(() => window._coins), await aly.evaluate(() => window._coins)];
  for (const p of [beck, aly, beck, aly]) { await p.evaluate(() => BridgeLumarDeep.claim()); await p.waitForTimeout(800); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  const c1 = [await beck.evaluate(() => window._coins), await aly.evaluate(() => window._coins)];
  const idols = [await beck.evaluate(() => BridgeInventory.getCount('plunder_idol')), await aly.evaluate(() => BridgeInventory.getCount('plunder_idol'))];
  console.log('claimed twice each: beck +' + (c1[0] - c0[0]) + ' idols ' + idols[0] + ' | aly +' + (c1[1] - c0[1]) + ' idols ' + idols[1]);
  if (c1[0] - c0[0] !== raider.pay || c1[1] - c0[1] !== raider.pay) bad('each should be paid ' + raider.pay + ' once');
  if (idols[0] < 1 || idols[1] < 1) bad('an idol each');
  console.log(errs ? errs + ' errors' : 'bounty together ok');
  await b.close();
  process.exit(errs ? 1 : 0);
})();
