const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const aid = '22222222-2222-2222-2222-222222222222', bid = '11111111-1111-1111-1111-111111111111';
const foes = p => p.evaluate(() => BridgeWorld.getWorld().interactions.filter(h => h.type === 'hostile').map(h => h.fid + ' ' + h.x + ',' + h.y + ' ' + Math.round(h._hp)).sort().join(' | '));
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar-midnight', { x: 24, y: 30 });
  await beck.waitForTimeout(1500);
  await enter(aly, 'lumar-midnight', { x: 25, y: 30 });
  await beck.waitForTimeout(2500);
  console.log('host: beck', await beck.evaluate(() => BridgeFight.host()), 'aly', await aly.evaluate(() => BridgeFight.host()), '| shared', await beck.evaluate(() => BridgeFight.shared()), await aly.evaluate(() => BridgeFight.shared()));
  const fb = await foes(beck), fa = await foes(aly);
  console.log('same creatures:', fb === fa); if (fb !== fa) { console.log(' B', fb); console.log(' A', fa); }
  // Alyssa walks toward the sentinels; the nearest goes for her
  await aly.evaluate(() => { BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 20, y: 22 } }); });
  await aly.waitForTimeout(500);
  const hp0 = await aly.evaluate(() => BridgeInventory.getStats().hp);
  await aly.waitForTimeout(7000);
  const hp1 = await aly.evaluate(() => BridgeInventory.getStats().hp);
  console.log('aly hp', hp0, '->', hp1, '| beck hp', await beck.evaluate(() => BridgeInventory.getStats().hp));
  console.log('after 7s same creatures:', (await foes(beck)) === (await foes(aly)));
  console.log(' B', await foes(beck));
  console.log(' A', await foes(aly));
  // Alyssa hits the nearest creature
  const hit = await aly.evaluate(() => { const w = BridgeWorld.getWorld(), px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    const h = w.interactions.filter(i => i.type === 'hostile').sort((a, b) => (Math.abs(a.x - px) + Math.abs(a.y - py)) - (Math.abs(b.x - px) + Math.abs(b.y - py)))[0];
    BridgeItems.strike(w, h, 30, BridgeItems.get('cutlass')); return h.fid + ' ' + Math.round(h._hp); });
  await beck.waitForTimeout(500);
  console.log('aly hit', hit, '| beck sees', await beck.evaluate(f => { const h = BridgeWorld.getWorld().interactions.find(i => i.fid === f); return h ? Math.round(h._hp) : 'gone'; }, hit.split(' ')[0]));
  // and finishes it
  const coins0 = await aly.evaluate(() => window._coins), bcoins0 = await beck.evaluate(() => window._coins);
  await aly.evaluate(f => { const w = BridgeWorld.getWorld(), h = w.interactions.find(i => i.fid === f); if (h) BridgeItems.strike(w, h, 500, BridgeItems.get('cutlass')); }, hit.split(' ')[0]);
  await beck.waitForTimeout(800);
  console.log('killed: aly has it?', await aly.evaluate(f => !!BridgeWorld.getWorld().interactions.find(i => i.fid === f), hit.split(' ')[0]), 'beck has it?', await beck.evaluate(f => !!BridgeWorld.getWorld().interactions.find(i => i.fid === f), hit.split(' ')[0]),
    '| coins aly', coins0, '->', await aly.evaluate(() => window._coins), 'beck', bcoins0, '->', await beck.evaluate(() => window._coins));
  await aly.screenshot({ path: `${S}/fight_aly.png` });
  // Beck walks over; Alyssa goes down
  await beck.evaluate(() => { const p = BridgeCharacter; BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 22, y: 22 } }); });
  await beck.waitForTimeout(1500);
  await aly.evaluate(() => { const st = BridgeInventory.getStats(); BridgeInventory.takeDamage(st.hp); });
  await aly.waitForTimeout(1200);
  console.log('aly down?', await aly.evaluate(() => BridgeFight.down()), 'banner', await aly.evaluate(() => { const e = document.getElementById('down-banner'); return e ? e.innerText.replace(/\n/g, ' / ') : 'none'; }));
  console.log('beck sees her down', await beck.evaluate(id => BridgeFight.isDown(id), aid), 'prompt', await beck.evaluate(() => { const t = BridgeWorld.getWorld().interactions.find(i => i.type === 'player'); return t && t.prompt; }));
  await beck.screenshot({ path: `${S}/fight_down.png` });
  await beck.evaluate(id => BridgeMulti.menu(id), aid);
  await aly.waitForTimeout(1200);
  console.log('aly up:', !(await aly.evaluate(() => BridgeFight.down())), 'hp', await aly.evaluate(() => BridgeInventory.getStats().hp), 'controls', await aly.evaluate(() => typeof BridgeControls !== 'undefined'));
  // the warden: tougher for two
  await beck.evaluate(() => { BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 40, y: 22 } }); });
  await aly.evaluate(() => { BridgeState.transition('world', { worldId: 'lumar-midnight', spawn: { x: 41, y: 24 } }); });
  await beck.waitForTimeout(3000);
  console.log('warden', await beck.evaluate(() => { const h = BridgeWorld.getWorld().interactions.find(i => i.creature === 'warden'); return h ? h._hp + '/' + h.maxHP + ' engaged ' + !!h._engaged : 'none'; }), '| aly sees', await aly.evaluate(() => { const h = BridgeWorld.getWorld().interactions.find(i => i.creature === 'warden'); return h ? h._hp + '/' + h.maxHP + ' engaged ' + !!h._engaged : 'none'; }));
  await aly.screenshot({ path: `${S}/fight_warden.png` });
  // the mine together
  await enter(beck, 'lumar-rose-mine', { x: 10, y: 8 }); await enter(aly, 'lumar-rose-mine', { x: 11, y: 8 });
  await beck.waitForTimeout(2000);
  await beck.evaluate(() => BridgeMine.goFloor(4));
  await aly.waitForTimeout(1500);
  console.log('aly asked:', await aly.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; }));
  await aly.evaluate(() => { const bt = [...document.querySelectorAll('.wd-opt')].find(e => /Follow/.test(e.innerText)); bt && bt.click(); });
  await aly.waitForTimeout(3500);
  console.log('insts', await beck.evaluate(() => BridgeMulti.myInst()), await aly.evaluate(() => BridgeMulti.myInst()));
  const rocks = p => p.evaluate(() => BridgeWorld.getWorld().interactions.filter(i => i.type === 'rock').map(i => i.x + ',' + i.y).sort().join(' '));
  console.log('same rocks', (await rocks(beck)) === (await rocks(aly)), '| same creatures', (await foes(beck)) === (await foes(aly)), '| see each other', await beck.evaluate(() => Object.keys(BridgeMulti.others()).length), await aly.evaluate(() => Object.keys(BridgeMulti.others()).length));
  // Beck breaks a rock (Hob's pick, plenty of energy)
  const rk = await beck.evaluate(() => { BridgeInventory.addItem('star_pickaxe', 1); BridgeInventory.restoreEnergy(999); const r = BridgeWorld.getWorld().interactions.find(i => i.type === 'rock'); window._rk = r; return r.x + ',' + r.y + ' hp ' + r._rock.hp; });
  for (let k = 0; k < 4; k++) { await beck.evaluate(() => BridgeMine.use(window._rk)); await beck.waitForTimeout(320); }
  await aly.waitForTimeout(600);
  console.log('rock', rk, 'beck still has', await beck.evaluate(xy => !!BridgeWorld.getWorld().interactions.find(i => i.type === 'rock' && i.x + ',' + i.y === xy), rk.split(' ')[0]), 'aly still has', await aly.evaluate(xy => !!BridgeWorld.getWorld().interactions.find(i => i.type === 'rock' && i.x + ',' + i.y === xy), rk.split(' ')[0]));
  await b.close();
})();
