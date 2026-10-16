const { chromium, BECK, ALY, player, enter, reset } = require(process.argv[2] + '/mp_lib.js');
const S = process.argv[2];
(async () => {
  await reset();
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const beck = await player(b, S, BECK), aly = await player(b, S, ALY);
  await enter(beck, 'lumar');
  const sp = await beck.evaluate(() => ({ x: BridgeCharacter.getX(), y: BridgeCharacter.getY() }));
  await enter(aly, 'lumar', { x: sp.x + 2, y: sp.y });
  await beck.waitForTimeout(1500);
  console.log('online: beck sees', await beck.evaluate(() => BridgeNet.peers().map(p => p.name + '@' + p.inst + ' ' + p.act)), '| aly sees', await aly.evaluate(() => BridgeNet.peers().map(p => p.name + '@' + p.inst)));
  console.log('avatars: beck has', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name + ' ' + a.x.toFixed(1) + ',' + a.y.toFixed(1))), '| aly has', await aly.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name + ' ' + a.x.toFixed(1) + ',' + a.y.toFixed(1))));
  // Alyssa walks two steps down and waves; says hi
  await aly.keyboard.down('ArrowDown'); await aly.waitForTimeout(500); await aly.keyboard.up('ArrowDown');
  await aly.evaluate(() => { BridgeMulti.emote('heart'); });
  await beck.waitForTimeout(700);
  console.log('after walk: beck sees her at', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.x.toFixed(1) + ',' + a.y.toFixed(1))), 'she is at', await aly.evaluate(() => { const r = BridgeCharacter.getRenderPos(); return r.x.toFixed(1) + ',' + r.y.toFixed(1); }));
  await beck.screenshot({ path: `${S}/mp_beck.png` });
  await aly.evaluate(() => BridgeMulti.say('hi beck! race you to the tavern'));
  await beck.waitForTimeout(600);
  await beck.screenshot({ path: `${S}/mp_beck_say.png` });
  console.log('bubble', await beck.evaluate(() => [...document.querySelectorAll('.mp-tag.talking .mp-bubble')].map(e => e.innerText)));
  console.log('pill', await beck.evaluate(() => document.getElementById('mp-pill').innerText.replace(/\n/g, ' ')));
  // Beck walks up to her: the prompt and the menu
  const target = await beck.evaluate(() => { const t = BridgeWorld.getWorld().interactions.find(i => i.type === 'player'); return t && [t.x, t.y, t.label]; });
  console.log('target', target);
  await beck.evaluate(([x, y]) => { BridgeState.transition('world', { worldId: 'lumar', spawn: { x: x - 1, y: y } }); }, target);
  await beck.waitForTimeout(400);
  await beck.keyboard.press('ArrowRight'); await beck.waitForTimeout(300);
  console.log('prompt', await beck.evaluate(() => { const e = document.getElementById('interact-prompt'); return e && e.classList.contains('visible') ? e.innerText.replace(/\n/g, ' ') : 'none'; }));
  await beck.keyboard.press('e'); await beck.waitForTimeout(500);
  console.log('menu', await beck.evaluate(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ') : 'none'; }));
  await beck.screenshot({ path: `${S}/mp_menu.png` });
  await beck.keyboard.press('Escape'); await beck.waitForTimeout(300);
  // Alyssa goes into the tavern; Beck goes to her from the panel
  await enter(aly, 'lumar-tavern');
  await beck.waitForTimeout(1600);
  console.log('beck: her place', await beck.evaluate(() => BridgeNet.peers().map(p => BridgeMulti.placeOf(p))), 'avatars', await beck.evaluate(() => Object.keys(BridgeMulti.others()).length));
  await beck.evaluate(() => BridgeMulti.panel()); await beck.waitForTimeout(400);
  await beck.evaluate(() => { const r = document.querySelector('.wd-sell-row.pick'); r && r.click(); }); await beck.waitForTimeout(400);
  console.log('card', await beck.evaluate(() => document.querySelector('.world-dialog').innerText.replace(/\n+/g, ' / ')));
  await beck.evaluate(() => { const bt = [...document.querySelectorAll('.wd-opt')].find(e => /^Go to/.test(e.innerText)); bt && bt.click(); });
  await beck.waitForTimeout(3000);
  console.log('beck now in', await beck.evaluate(() => BridgeWorld.getWorldId()), 'sees', await beck.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)), 'aly sees', await aly.evaluate(() => Object.values(BridgeMulti.others()).map(a => a.name)));
  await beck.screenshot({ path: `${S}/mp_tavern.png` });
  await b.close();
})();
