const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const click = (p, re) => p.evaluate(src => { const r = new RegExp(src); const b = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(e => r.test(e.innerText)); if (b) { b.click(); return true; } return false; }, re.source);
const dlg = p => p.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 220) : 'none'; });
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar-square'); await enter(aly, 'lumar-square');
  await beck.evaluate(() => { BridgeInventory.addItem('bluefin', 5); BridgeInventory.addItem('crownfin', 1); });
  await aly.evaluate(() => { BridgeInventory.addItem('sea_glass', 4); });
  await beck.waitForTimeout(1200);
  const aid = '22222222-2222-2222-2222-222222222222', bid = '11111111-1111-1111-1111-111111111111';
  // GIVE: Beck gives 3 bluefin; Alyssa takes them
  await beck.evaluate(id => BridgeShare.give(id), aid); await beck.waitForTimeout(300);
  await click(beck, /Sapphire Bluefin/); await beck.waitForTimeout(300);
  console.log('beck howmany:', await dlg(beck));
  await click(beck, /^5$|^All 5$/); await beck.waitForTimeout(900);
  console.log('beck bluefin after hold', await beck.evaluate(() => BridgeInventory.getCount('bluefin')), '| aly sees:', await dlg(aly));
  await aly.screenshot({ path: `${S}/sh_gift.png` });
  await click(aly, /Take it/); await aly.waitForTimeout(900);
  console.log('aly bluefin', await aly.evaluate(() => BridgeInventory.getCount('bluefin')), 'beck pending', await beck.evaluate(() => Object.keys(BridgeShare._pending()).length));
  // GIVE declined: coins come back
  await beck.evaluate(id => BridgeShare.give(id), aid); await beck.waitForTimeout(300);
  await click(beck, /Coins/); await beck.waitForTimeout(300);
  await beck.evaluate(() => { const f = document.querySelector('.wd-chooser-input'); f.querySelector('input').value = '40'; f.requestSubmit(); }); await beck.waitForTimeout(900);
  console.log('beck coins after hold', await beck.evaluate(() => window._coins), '| aly:', await dlg(aly));
  await click(aly, /No thanks/); await aly.waitForTimeout(900);
  console.log('beck coins after decline', await beck.evaluate(() => window._coins), 'aly coins', await aly.evaluate(() => window._coins));
  // TRADE: Beck's crownfin for Alyssa's 4 sea glass + 30 coins
  await beck.evaluate(id => BridgeShare.trade(id), aid); await beck.waitForTimeout(900);
  console.log('aly asked:', await dlg(aly));
  await click(aly, /^Trade$/); await aly.waitForTimeout(900);
  console.log('panels', await beck.evaluate(() => !!document.getElementById('trade-panel')), await aly.evaluate(() => !!document.getElementById('trade-panel')));
  await beck.evaluate(() => { [...document.querySelectorAll('.tp-pack .tp-item')].find(e => /Crownfin/.test(e.innerText)).click(); }); await beck.waitForTimeout(400);
  for (let i = 0; i < 4; i++) { await aly.evaluate(() => { [...document.querySelectorAll('.tp-pack .tp-item')].find(e => /Sea Glass/.test(e.innerText)).click(); }); await aly.waitForTimeout(250); }
  await aly.evaluate(() => { const i = document.querySelector('.tp-coins input'); i.value = '30'; i.dispatchEvent(new Event('change')); }); await aly.waitForTimeout(500);
  await beck.screenshot({ path: `${S}/sh_trade.png` });
  console.log('beck sees theirs:', await beck.evaluate(() => document.querySelector('.tp-theirs').innerText.replace(/\n/g, ' ')));
  await beck.evaluate(() => document.querySelector('.tp-ready').click()); await beck.waitForTimeout(300);
  await aly.evaluate(() => document.querySelector('.tp-ready').click()); await aly.waitForTimeout(1500);
  console.log('after trade: beck crownfin', await beck.evaluate(() => BridgeInventory.getCount('crownfin')), 'sea glass', await beck.evaluate(() => BridgeInventory.getCount('sea_glass')), 'coins', await beck.evaluate(() => window._coins),
              '| aly crownfin', await aly.evaluate(() => BridgeInventory.getCount('crownfin')), 'sea glass', await aly.evaluate(() => BridgeInventory.getCount('sea_glass')), 'coins', await aly.evaluate(() => window._coins),
              '| panels', await beck.evaluate(() => !!document.getElementById('trade-panel')), await aly.evaluate(() => !!document.getElementById('trade-panel')));
  // LETTER to Alyssa while she's offline, with 2 bluefin attached
  await aly.close();
  await beck.waitForTimeout(1500);
  await beck.evaluate(id => BridgeShare.compose(id), aid); await beck.waitForTimeout(300);
  await beck.evaluate(() => { const f = document.querySelector('.wd-chooser-input'); f.querySelector('input').value = 'Meet me on the holm tonight. Bring the good bait.'; f.requestSubmit(); }); await beck.waitForTimeout(400);
  await click(beck, /Put something in/); await beck.waitForTimeout(300);
  await click(beck, /Sea Glass/); await beck.waitForTimeout(300);
  console.log('beck howmany:', await dlg(beck));
  await click(beck, /^1$/); await beck.waitForTimeout(1000);
  const dump = await (await fetch('http://127.0.0.1:8767/dump')).json();
  console.log('mail rows', JSON.stringify(dump.tables.pilot_mail.map(m => [m.from_name, m.body.slice(0, 20), m.items, m.coins, m.opened_at])));
  const aly2 = await player(b, S, ALY);
  await aly2.waitForTimeout(5000);                                        // the cloud pulls her game onto this "device" and reloads
  console.log('aly2 after reload: pilot', await aly2.evaluate(() => BridgeState.getPilot() && BridgeState.getPilot().name), 'state', await aly2.evaluate(() => BridgeState.getState()), 'world', await aly2.evaluate(() => BridgeWorld.getWorldId()));
  if (!(await aly2.evaluate(() => BridgeState.getPilot()))) await aly2.evaluate(w => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot(w); }, ALY);
  await aly2.waitForTimeout(1000);
  if (await aly2.evaluate(() => BridgeState.getState()) !== 'world') await enter(aly2, 'lumar-square');
  await aly2.waitForTimeout(4000);
  console.log('aly2 letter:', await dlg(aly2));
  await aly2.screenshot({ path: `${S}/sh_letter.png` });
  await click(aly2, /Take it|Keep it/); await aly2.waitForTimeout(800);
  const d2 = await (await fetch('http://127.0.0.1:8767/dump')).json();
  console.log('aly2 sea glass', await aly2.evaluate(() => BridgeInventory.getCount('sea_glass')), 'opened', !!d2.tables.pilot_mail[0].opened_at, 'log', await aly2.evaluate(() => BridgeQuests.log().slice(0, 2).map(e => e.k + ': ' + e.t)));
  await b.close();
})();
