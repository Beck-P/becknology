// A party guest aboard a Wayfarer grown longer (js/wayfarer.js, js/aboard.js, js/party.js): Beck has the galley fitted
// and a hand aboard; Alyssa, in his party, comes aboard his bridge, goes aft — his bays as he's fitted them, not hers —
// into his galley, where his crew keep their day and Dorrie is at the pass; she can eat there but not fit his bays; out
// of a window his galleon is the longer one (presence `shipk`). Two pilots on the Supabase stand-in.
const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const aid = ALY.id, bid = BECK.id;
const dlg = p => p.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 220) : 'none'; });
const click = (p, re) => p.evaluate(src => { const r = new RegExp(src); const b = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(e => r.test(e.innerText)); if (b) { b.click(); return true; } return false; }, re.source);
async function until(p, fn, arg, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await p.evaluate(fn, arg)) return true; await p.waitForTimeout(250); } return false; }

(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  [beck, aly].forEach((p, i) => p.on('console', m => { if (m.type() === 'error') console.log(['beck', 'aly'][i], 'CONSOLE-ERR', m.text().slice(0, 200)); }));
  // Beck: a hand aboard and the galley fitted; Alyssa: nothing fitted
  await beck.evaluate(async () => {
    window._coins = 5000;
    const ok = BridgePeople.all().okafor; await BridgeCrew.hire(Object.assign({ id: 'okafor' }, ok));
    await BridgeWayfarer.fit('galley');
  });
  console.log('beck fitted:', JSON.stringify(await beck.evaluate(() => BridgeWayfarer.list())), '| aly fitted:', JSON.stringify(await aly.evaluate(() => BridgeWayfarer.list())));
  await enter(beck, 'bridge', { x: 10, y: 10 }); await enter(aly, 'lumar-square');
  await beck.waitForTimeout(1500);

  // a party
  await beck.evaluate(id => BridgeMulti.menu(id), aid); await beck.waitForTimeout(500);
  await click(beck, /Invite to play together/); await aly.waitForTimeout(900);
  await click(aly, /^Play together$/); await aly.waitForTimeout(900);
  console.log('party:', await beck.evaluate(id => BridgeParty.has(id), aid), await aly.evaluate(id => BridgeParty.has(id), bid));
  await until(aly, (id) => !!(BridgeNet.peer(id) || {}).shipk, bid, 6000);
  console.log('his galleon as aly sees her:', await aly.evaluate(id => (BridgeNet.peer(id) || {}).shipk, bid));

  // aboard his bridge, then aft
  console.log('aboard:', await aly.evaluate(id => BridgeParty.aboard(id, 'bridge', { x: 13, y: 12 }), bid));
  await until(aly, () => BridgeWorld.getWorldId() === 'bridge', null, 10000);
  await aly.waitForTimeout(2000);
  console.log('aly: guest of', await aly.evaluate(() => BridgeParty.guestOf()), '| host ship mods', JSON.stringify(await aly.evaluate(() => (BridgeParty.hostShip() || {}).wayfarer)),
              '| mods she sees', JSON.stringify(await aly.evaluate(() => BridgeWayfarer.list())));
  await aly.evaluate(() => { const d = BridgeWorld.getWorld().interactions.find(i => i.target === 'ship-passage'); BridgeCharacter.init(d.x, d.y - 1); BridgeCharacter.setFacing('down'); });
  await aly.waitForTimeout(400); await aly.keyboard.press('e');
  await until(aly, () => BridgeWorld.getWorldId() === 'ship-passage', null, 10000);
  await aly.waitForTimeout(1500);
  console.log('aly in the passage:', await aly.evaluate(() => BridgeWorld.getWorldId()), '| bays', JSON.stringify(await aly.evaluate(() => BridgeWorld.getWorld().interactions.filter(i => i.module).map(i => i.module + ':' + i.type))),
              '| still his ship', await aly.evaluate(() => BridgeParty.guestOf()));
  await aly.screenshot({ path: `${S}/wayfarer_guest_passage.png` });
  // his sealed bay isn't hers to fit
  await aly.evaluate(() => { BridgeCharacter.init(12, 4); BridgeCharacter.setFacing('up'); }); await aly.waitForTimeout(400);
  await aly.keyboard.press('e'); await aly.waitForTimeout(700);
  console.log('aly at his sealed bay:', await dlg(aly));
  await aly.keyboard.press('Escape'); await aly.waitForTimeout(300);
  // into his galley
  await aly.evaluate(() => { BridgeCharacter.init(5, 4); BridgeCharacter.setFacing('up'); }); await aly.waitForTimeout(400);
  await aly.keyboard.press('e');
  await until(aly, () => BridgeWorld.getWorldId() === 'ship-galley', null, 10000);
  await aly.waitForTimeout(2000);
  console.log('aly in his galley:', await aly.evaluate(() => BridgeWorld.getWorldId()), '| his crew there', JSON.stringify(await aly.evaluate(() => BridgeAboard.roster().map(r => r.name + ': ' + r.doing))),
              '| drawn', JSON.stringify(await aly.evaluate(() => BridgeAboard._here().filter(h => h.st).map(h => h.id))));
  console.log('the same as he sees:', JSON.stringify(await beck.evaluate(() => BridgeAboard.roster().map(r => r.name + ': ' + r.doing))));
  await aly.screenshot({ path: `${S}/wayfarer_guest_galley.png` });
  await b.close();
})();
