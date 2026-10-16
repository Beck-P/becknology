const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const click = (p, re) => p.evaluate(src => { const r = new RegExp(src); const b = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(e => r.test(e.innerText)); if (b) { b.click(); return true; } return false; }, re.source);
const dlg = p => p.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 260) : 'none'; });
const aid = '22222222-2222-2222-2222-222222222222', bid = '11111111-1111-1111-1111-111111111111';
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  // Alyssa owns an island with a cottage, and a farm with a few tilled plots
  await aly.evaluate(() => {
    localStorage.setItem('bridge_holm', JSON.stringify({ owned: true, name: "Alyssa's Rest", built: { house: 1, garden: 1 }, store: {}, chest: 300, log: [] }));
    localStorage.setItem('bridge_homestead', JSON.stringify({ owned: Date.now(), name: 'Clover Farm' }));
    localStorage.setItem('bridge_farm', JSON.stringify({ tiles: { '20,20': { t: 1 }, '21,20': { t: 1 }, '22,20': { t: 1 } }, can: 1 }));
    ['BridgeHolm', 'BridgeHomestead', 'BridgeFarm'].forEach(k => window[k].reload());
    return BridgeCloud.flush();
  });
  await enter(beck, 'lumar-square'); await enter(aly, 'lumar-square');
  await beck.waitForTimeout(1200);
  // partners
  await beck.evaluate(id => BridgeMulti.menu(id), aid); await beck.waitForTimeout(300);
  console.log('beck menu:', await dlg(beck));
  await click(beck, /Be partners/); await beck.waitForTimeout(800);
  console.log('aly asked:', await dlg(aly));
  await click(aly, /^Yes$/); await aly.waitForTimeout(800);
  console.log('partners:', await beck.evaluate(id => BridgePartner.is(id), aid), await aly.evaluate(id => BridgePartner.is(id), bid));
  // Alyssa goes home to her island; Beck goes to her
  await enter(aly, 'lumar-holm');
  await beck.waitForTimeout(1500);
  await beck.evaluate(() => BridgeMulti.panel()); await beck.waitForTimeout(300);
  await click(beck, /Alyssa/); await beck.waitForTimeout(300);
  console.log('card:', await dlg(beck));
  await click(beck, /^Go to Alyssa/); await beck.waitForTimeout(3500);
  console.log('beck in', await beck.evaluate(() => BridgeWorld.getWorldId()), 'inst', await beck.evaluate(() => BridgeMulti.myInst()).then(s => s.slice(0, 16)), 'visiting', await beck.evaluate(() => JSON.stringify(BridgePartner.visiting())));
  console.log('beck sees her holm:', await beck.evaluate(() => BridgeHolm.owned()), await beck.evaluate(() => { try { return JSON.parse(localStorage.getItem('bridge_holm')).name; } catch (e) { return null; } }), '| his own raw', await beck.evaluate(() => window.__lsGet('bridge_holm')));
  await beck.waitForTimeout(2500);
  console.log('they see each other:', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)), await aly.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)));
  await beck.screenshot({ path: `${S}/pt_holm.png` });
  // Beck changes her place (as a module would): it reaches her
  await beck.evaluate(() => { const h = JSON.parse(localStorage.getItem('bridge_holm')); h.built.warehouse = 1; localStorage.setItem('bridge_holm', JSON.stringify(h)); });
  await aly.waitForTimeout(800);
  console.log('aly got it:', await aly.evaluate(() => JSON.parse(localStorage.getItem('bridge_holm')).built.warehouse), 'her module', await aly.evaluate(() => BridgeHolm.built('warehouse')));
  // the ledger is hers
  await beck.evaluate(() => BridgeHolm.use({ act: 'deed', label: 'ALYSSA\'S REST' })); await beck.waitForTimeout(300);
  console.log('ledger:', await beck.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' ').slice(0, 120) : 'none'; }));
  await beck.keyboard.press('Escape'); await beck.waitForTimeout(300);
  // Beck leaves: his own back
  await enter(beck, 'lumar');
  await beck.waitForTimeout(800);
  console.log('after leaving: visiting', await beck.evaluate(() => BridgePartner.visiting()), 'holm', await beck.evaluate(() => localStorage.getItem('bridge_holm')), 'inst', await beck.evaluate(() => BridgeMulti.myInst()));
  // Alyssa offline: Beck visits from her card and builds; it lands in her cloud save
  await aly.evaluate(() => BridgeCloud.flush());
  await aly.close();
  await beck.waitForTimeout(13000);                                     // the stand-in notices a closed page on its next ping
  await beck.evaluate(() => BridgeMulti.panel()); await beck.waitForTimeout(300);
  console.log('panel offline:', await dlg(beck));
  await click(beck, /Alyssa/); await beck.waitForTimeout(300);
  await click(beck, /Alyssa's places/); await beck.waitForTimeout(3500);
  console.log('places:', await dlg(beck));
  await click(beck, /Alyssa's Rest/); await beck.waitForTimeout(3000);
  console.log('offline visit: in', await beck.evaluate(() => BridgeWorld.getWorldId()), 'built', await beck.evaluate(() => BridgeHolm.built('warehouse')));
  await beck.evaluate(() => { const h = JSON.parse(localStorage.getItem('bridge_holm')); h.built.quarters = 1; localStorage.setItem('bridge_holm', JSON.stringify(h)); });
  await beck.waitForTimeout(2500);
  const dump = await (await fetch('http://127.0.0.1:8767/dump')).json();
  const row = dump.tables.pilot_saves.find(r => r.pilot_id === aid);
  console.log('her cloud save now:', JSON.parse(row.data.bridge_holm).built, 'rev', row.rev);
  // farm on Verdance: tend hers
  await enter(beck, 'verdance');
  await beck.waitForTimeout(800);
  console.log('own farm tilled', await beck.evaluate(() => BridgeFarm.journal().tilled), 'visiting', await beck.evaluate(() => BridgePartner.visiting()));
  await beck.evaluate(id => BridgePartner.visit(id, 'verdance', function () {}), aid); await beck.waitForTimeout(1500);
  console.log('tending hers: tilled', await beck.evaluate(() => BridgeFarm.journal().tilled), 'farm name', await beck.evaluate(() => BridgeHomestead.journal && BridgeHomestead.journal().name));
  await b.close();
})();
