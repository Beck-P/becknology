// Playing together as a party (js/party.js): an invite and a yes; going back up to the ship together (aboard his
// Wayfarer: his instance, his furniture); a jump together (both ships, the wing in the cutscene, down together a tile
// apart); a "not this time"; casting off together (she's brought to the pier and crews); the mine's ladder (the same
// dig); leaving the party. Two pilots on the Supabase stand-in.
const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
const aid = ALY.id, bid = BECK.id;
const dlg = p => p.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 240) : 'none'; });
const click = (p, re) => p.evaluate(src => { const r = new RegExp(src); const b = [...document.querySelectorAll('.wd-opt, .wd-sell-row.pick')].find(e => r.test(e.innerText)); if (b) { b.click(); return true; } return false; }, re.source);
const panel = (p, id) => p.evaluate(i => { const e = document.getElementById(i); return e ? e.innerText.replace(/\n+/g, ' / ') : 'none'; }, id);
const where = p => p.evaluate(() => ({ w: BridgeWorld.getWorldId(), inst: (BridgeMulti.myInst() || '').replace(/@(.{4}).*/, '@$1…'), st: BridgeState.getState(), loc: BridgeOrbit.getLocation(),
  x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }));
async function until(p, fn, arg, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (await p.evaluate(fn, arg)) return true; await p.waitForTimeout(250); } return false; }

(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  [beck, aly].forEach((p, i) => p.on('console', m => { if (m.type() === 'error') console.log(['beck', 'aly'][i], 'CONSOLE-ERR', m.text().slice(0, 200)); }));
  await enter(beck, 'lumar'); await enter(aly, 'lumar-square');
  await beck.waitForTimeout(1500);

  // the invite, from her card on the players pill (she's elsewhere)
  console.log('beck menu has:', await beck.evaluate(id => { BridgeMulti.menu(id); return true; }, aid).then(() => dlg(beck)));
  await click(beck, /Invite to play together/); await aly.waitForTimeout(900);
  console.log('aly asked:', await dlg(aly));
  await click(aly, /^Play together$/); await aly.waitForTimeout(900);
  console.log('party: beck has her', await beck.evaluate(id => BridgeParty.has(id), aid), '| she has him', await aly.evaluate(id => BridgeParty.has(id), bid),
              '| saved', await aly.evaluate(() => localStorage.getItem('bridge_party').length > 10), '| pill gold', await beck.evaluate(() => document.getElementById('mp-pill').classList.contains('party')));

  // up to the ship: he's asked to wait; she comes and lands aboard his Wayfarer
  await beck.evaluate(() => BridgeShip.returnToShip());
  await aly.waitForTimeout(1200);
  console.log('beck waits:', await panel(beck, 'party-check'));
  console.log('aly called:', await panel(aly, 'party-call'));
  await aly.screenshot({ path: `${S}/party_call.png` });
  await beck.screenshot({ path: `${S}/party_check.png` });
  await aly.keyboard.press('e');
  await until(beck, () => BridgeWorld.getWorldId() === 'hangar' && !BridgeShip.isBusy(), null, 15000);
  await until(aly, () => BridgeWorld.getWorldId() === 'hangar', null, 15000);
  await aly.waitForTimeout(2500);
  console.log('up: beck', JSON.stringify(await where(beck)), '| aly', JSON.stringify(await where(aly)));
  console.log('aboard his: aly visiting him', await aly.evaluate(id => BridgeMulti.visiting() === id, bid), '| guestOf', await aly.evaluate(() => BridgeParty.guestOf()),
              '| they see each other', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)), await aly.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)));
  await aly.screenshot({ path: `${S}/party_aboard.png` });

  // the bridge, then the jump to Hoarfell together
  await enter(beck, 'bridge', { x: 10, y: 10 });
  await aly.evaluate(bid => BridgeMulti.travel({ world: 'bridge', inst: 'bridge@' + bid, x: 10, y: 10 }), bid);
  await aly.waitForTimeout(3500);
  console.log('bridge: aly', JSON.stringify(await where(aly)), '| the ship out of her window', await aly.evaluate(id => (BridgeNet.peer(id) || {}).ship, bid));
  await beck.evaluate(() => BridgeState.transition('starmap')); await beck.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { await beck.keyboard.press('ArrowRight'); await beck.waitForTimeout(80); }
  console.log('beck picks:', await beck.evaluate(() => document.querySelector('.nav-p-name').innerText));
  await beck.keyboard.down('Enter'); await beck.waitForTimeout(1300); await beck.keyboard.up('Enter');
  await aly.waitForTimeout(900);
  console.log('jump call:', await panel(aly, 'party-call'), '| beck:', await panel(beck, 'party-check'));
  await aly.evaluate(() => document.querySelector('#party-call .pc-come').click());
  await aly.waitForTimeout(1500);
  console.log('mid-jump:', await beck.evaluate(() => BridgeState.getState()), await aly.evaluate(() => BridgeState.getState()));
  await aly.screenshot({ path: `${S}/party_jump_wing.png` });
  await until(beck, () => BridgeWorld.getWorldId() === 'hoarfell' && !BridgeShip.isBusy(), null, 25000);
  await until(aly, () => BridgeWorld.getWorldId() === 'hoarfell' && !BridgeShip.isBusy(), null, 25000);
  await aly.waitForTimeout(1500);
  const bw = await where(beck), aw = await where(aly);
  console.log('landed: beck', JSON.stringify(bw), '| aly', JSON.stringify(aw), '| a tile apart', Math.abs(bw.x - aw.x) + Math.abs(bw.y - aw.y) >= 1,
              '| she sees him', await aly.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)));
  await aly.screenshot({ path: `${S}/party_landed.png` });

  // "not this time": he goes up alone
  await beck.evaluate(() => BridgeShip.returnToShip());
  await aly.waitForTimeout(1000);
  await aly.evaluate(() => document.querySelector('#party-call .pc-no').click());
  await until(beck, () => BridgeWorld.getWorldId() === 'hangar', null, 15000);
  console.log('declined: beck', (await where(beck)).w, '| aly stays', (await where(aly)).w, '| beck waiting', await beck.evaluate(() => !!BridgeParty._D()));

  // he jumps on to Sylvara and stays aboard: she comes from Hoarfell's snow and lands on his bridge
  await beck.waitForTimeout(1500);
  await beck.evaluate(() => { localStorage.setItem('bridge_stay_aboard', '1'); });
  await enter(beck, 'bridge', { x: 10, y: 10 });
  await beck.evaluate(() => BridgeState.transition('starmap')); await beck.waitForTimeout(500);
  for (let i = 0; i < 7 && !/SYLVARA/.test(await beck.evaluate(() => document.querySelector('.nav-p-name').innerText)); i++) { await beck.keyboard.press('ArrowRight'); await beck.waitForTimeout(80); }
  await beck.keyboard.down('Enter'); await beck.waitForTimeout(1300); await beck.keyboard.up('Enter');
  await aly.waitForTimeout(900);
  await aly.keyboard.press('Enter');
  await until(beck, () => BridgeWorld.getWorldId() === 'bridge' && BridgeState.getState() === 'world' && BridgeOrbit.getLocation() === 'sylvara', null, 25000);
  await until(aly, () => BridgeWorld.getWorldId() === 'bridge' && BridgeState.getState() === 'world', null, 25000);
  await aly.waitForTimeout(2500);
  console.log('stayed aboard: beck', JSON.stringify(await where(beck)), '| aly', JSON.stringify(await where(aly)), '| aboard his', await aly.evaluate(id => BridgeMulti.visiting() === id, bid),
              '| her ship out of his window', await beck.evaluate(id => (BridgeNet.peer(id) || {}).ship, aid));
  await beck.screenshot({ path: `${S}/party_stayed.png` });
  await beck.evaluate(() => { localStorage.removeItem('bridge_stay_aboard'); const s = document.getElementById('arrival-stay'); if (s) s.click(); });

  // casting off from Diggen's Point: she's at the square, comes to the pier and crews
  await enter(beck, 'lumar'); await enter(aly, 'lumar-square');
  await beck.waitForTimeout(1500);
  await beck.evaluate(() => BridgeSloop.board('lumar'));
  await aly.waitForTimeout(1000);
  console.log('sail call:', await panel(aly, 'party-call'));
  await aly.keyboard.press('Enter');
  await until(aly, () => BridgeWorld.getWorldId() === 'lumar', null, 10000);
  console.log('aly at the pier:', (await where(aly)).w, '| beck panel', await panel(beck, 'party-check'));
  await until(aly, () => BridgeSloop.isRunning(), null, 20000);
  await aly.waitForTimeout(2000);
  console.log('sailing: beck crewOf', await beck.evaluate(() => (BridgeSloop._crew().crewOf || {}).name), '| aly captainOf', await aly.evaluate(() => (BridgeSloop._crew().captainOf || {}).name),
              '| both running', await beck.evaluate(() => BridgeSloop.isRunning()), await aly.evaluate(() => BridgeSloop.isRunning()));
  await aly.screenshot({ path: `${S}/party_sail.png` });
  await beck.evaluate(() => BridgeSloop.stop('lumar', true));
  await until(aly, () => !BridgeSloop.isRunning(), null, 15000);
  await beck.waitForTimeout(1500);

  // the mine: he climbs down from the hall; she follows to his dig
  await enter(beck, 'lumar-rose-mine'); await enter(aly, 'lumar-rose');
  await beck.waitForTimeout(1200);
  await beck.evaluate(() => BridgeMine.goFloor(3));
  await aly.waitForTimeout(1000);
  console.log('mine call:', await panel(aly, 'party-call'));
  await aly.keyboard.press('e');
  await until(beck, () => /rose-mine-/.test(BridgeWorld.getWorldId() || ''), null, 10000);
  await until(aly, () => /rose-mine-/.test(BridgeWorld.getWorldId() || ''), null, 10000);
  await aly.waitForTimeout(1200);
  console.log('down: beck', await beck.evaluate(() => BridgeWorld.getWorldId() + ' ' + BridgeMine.party()), '| aly', await aly.evaluate(() => BridgeWorld.getWorldId() + ' ' + BridgeMine.party()),
              '| same dig', await beck.evaluate(() => BridgeMine.party()) === await aly.evaluate(() => BridgeMine.party()));

  // leaving
  await aly.evaluate(() => BridgeParty.leave()); await beck.waitForTimeout(900);
  console.log('left: beck has her', await beck.evaluate(id => BridgeParty.has(id), aid), '| she has him', await aly.evaluate(id => BridgeParty.has(id), bid));
  await beck.evaluate(() => BridgeShip.returnToShip());
  await beck.waitForTimeout(500);
  console.log('alone again: no wait', await beck.evaluate(() => !BridgeParty._D()));
  await b.close();
})().catch(e => { console.log('FAILED', e && e.stack || e); process.exit(1); });
