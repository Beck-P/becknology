// Portraits on the talk card (tools/bridge-art/portraits.py → assets/portraits/, js/look.js): a face seen from the front
// for the cast (the queen-regent on her throne, Queen Alyssara, Beckolas, an elf bard with his ears, Hollin in his
// straw hat, the Ferryman, Pip the young elf), a passer-by in their wardrobe's colours, another pilot in a helmet, a hand
// in the harbour's hiring list and a captain's face (24 × 24, half size); the expressions; the old crop when there's no
// portrait file; on a desktop and a phone. node world/portraits.js [shots]
const { chromium } = require('playwright');
const SHOTS = process.argv[2] || __dirname + '/shots';
let errors = 0;
const bad = (m) => { errors++; console.log('BAD', m); };
(async () => {
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  async function page(opts) {
    const p = await (await b.newContext(opts)).newPage();
    p._asked = new Set();                     // portrait files the page has asked for
    p.on('request', r => { const m = /\/bridge\/assets\/portraits\/(.+)\.png/.exec(r.url()); if (m) p._asked.add(m[1]); });
    p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('CONSOLE-ERR', m.text().slice(0, 200)); });
    await p.route(/supabase-js|supabase\.co|@supabase/, r => r.abort());
    await p.addInitScript(() => localStorage.setItem('bridge_ship_location', 'lumar'));
    await p.goto('http://127.0.0.1:8766/bridge/?at=2026-10-16T13:00'); await p.waitForTimeout(2500);
    await p.evaluate(() => {
      BridgeState.setPilot({ id: 't', name: 'BECK', suit_color: 'gold' }); BridgeIntro.hide();
      window._coins = 500000;
      BridgeProgression.wagerCoins = (n) => Promise.resolve(window._coins >= n ? (window._coins -= n, { ok: true, balance: window._coins }) : { ok: false, reason: 'coins' });
      BridgeProgression.awardCoins = (n) => Promise.resolve(window._coins += n);
    });
    return p;
  }
  const p = await page({ viewport: { width: 1200, height: 800 } });
  const ev = (f, a) => p.evaluate(f, a);
  const wait = (ms) => p.waitForTimeout(ms);
  const go = (pg, w) => pg.evaluate((w) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), w);
  const shut = async (pg) => {                 // Esc out of the card (its keys go with it), then clear anything left
    for (let i = 0; i < 3 && await pg.evaluate(() => !!document.querySelector('.world-dialog.visible')); i++) { await pg.keyboard.press('Escape'); await pg.waitForTimeout(250); }
    await pg.evaluate(() => document.querySelectorAll('.world-dialog').forEach(x => x.remove()));
  };
  // the card's portrait: which file it came from, and that its face is drawn (the face's middle opaque, not the old crop)
  const card = (pg, file) => pg.evaluate(async (file) => {
    for (let t = 0; t < 40; t++) {
      const cv = document.querySelector('.world-dialog .wd-portrait');
      if (cv) {
        const g = cv.getContext('2d'), mid = g.getImageData(32, 30, 1, 1).data[3];
        if (mid > 0) return { ok: true, w: cv.width, shown: cv.offsetWidth, title: (document.querySelector('.world-dialog .wd-title') || {}).textContent };
      }
      await new Promise(r => setTimeout(r, 100));
    }
    const cv = document.querySelector('.world-dialog .wd-portrait');
    return { ok: false, canvas: !!cv, title: (document.querySelector('.world-dialog .wd-title') || {}).textContent };
  }, file);
  async function talk(pg, world, label, file, shot) {
    await go(pg, world); await pg.waitForTimeout(900);
    const found = await pg.evaluate((label) => {
      const it = BridgeWorld.getWorld().interactions.find(i => i.label === label);
      if (it) BridgeInteractions.execute(it);
      return !!it;
    }, label);
    if (!found) { bad('no ' + label + ' in ' + world); return; }
    const r = await card(pg, file);
    r.file = pg._asked.has(file);
    console.log('portrait', label, '(' + file + '):', JSON.stringify(r));
    if (!r.ok || !r.file) bad('no portrait for ' + label);
    if (shot) await pg.screenshot({ path: SHOTS + '/' + shot + '.png' });
    await shut(pg);
  }

  // the cast
  await talk(p, 'sylvara-hall', 'QUEEN ALYSSARA', 'npc-alyssa', 'portrait_alyssa');
  await talk(p, 'sylvara-hall', 'BECKOLAS', 'npc-beckolas', 'portrait_beckolas');
  await talk(p, 'sylvara', 'BARD', 'npc-elf-bard');
  await talk(p, 'sylvara', 'YOUNG ELF', 'npc-elf-child', 'portrait_child');
  await talk(p, 'verdance', 'HOLLIN', 'npc-hollin', 'portrait_hollin');
  await talk(p, 'lumar-midnight', 'THE FERRYMAN', 'npc-ferryman', 'portrait_ferryman');
  // the queen-regent on her throne (her audience, js/crown.js)
  await talk(p, 'lumar-crown-palace', 'THE QUEEN-REGENT', 'npc-queen', 'portrait_queen');

  // a free-talk reply changes their face: happy, then sad (the expressions are frames of the strip)
  await go(p, 'verdance'); await wait(700);
  const faces = await ev(async () => {
    BridgeTalk.enabled = () => true;
    let n = 0;
    BridgeTalk.say = () => Promise.resolve(n++ ? { reply: 'oh. that is a shame.', feeling: -1, mood: 'sad', action: 'none' } : { reply: 'ha! wonderful.', feeling: 1, mood: 'delighted', action: 'none' });
    BridgeInteractions.execute(BridgeWorld.getWorld().interactions.find(i => i.label === 'HOLLIN'));
    await new Promise(r => setTimeout(r, 800));
    const cv = document.querySelector('.world-dialog .wd-portrait'), g = cv.getContext('2d');
    const snap = () => Array.from(g.getImageData(16, 20, 32, 24).data).join(',');
    const seen = [snap()];
    const say = (t) => { const f = document.querySelector('.wd-say'), i = f.querySelector('input'); i.value = t; f.dispatchEvent(new Event('submit', { cancelable: true })); };
    say('I brought you a melon'); await new Promise(r => setTimeout(r, 400)); seen.push(snap());
    say('the melon fell in the sea'); await new Promise(r => setTimeout(r, 400)); seen.push(snap());
    return { neutral_vs_happy: seen[0] !== seen[1], happy_vs_sad: seen[1] !== seen[2] };
  });
  console.log('portrait expressions follow the talk:', JSON.stringify(faces));
  if (!faces.neutral_vs_happy || !faces.happy_vs_sad) bad('the face did not change with the reply');
  await p.screenshot({ path: SHOTS + '/portrait_talk_sad.png' });
  await shut(p);

  // a passer-by (js/crowd.js): their body's portrait in their own colours, beside what they say
  await go(p, 'arcadia-street'); await wait(1500);
  // the first standing one we can get beside with nothing else nearer (a door or a stall would take the E)
  let near = null;
  const stand = await ev(() => BridgeCrowd._here().filter(e => !e.walk && e.alpha === 1).slice(0, 6));
  for (const e of stand) {
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      await ev(([e, dx, dy]) => BridgeState.transition('world', { worldId: 'arcadia-street', spawn: { x: Math.round(e.x) + dx, y: Math.round(e.y) + dy } }), [e, dx, dy]);
      await wait(500);
      const it = await ev(() => { const i = BridgeWorld.getWorld().interactions.find(i => i.type === 'crowd'); return i ? { name: i.label, body: i.crowd.plan.who.body } : null; });
      if (it) { near = it; break; }
    }
    if (near) break;
  }
  if (near) {
    // talk to them as E would (straight to their interaction: someone else stood near — a visitor on their rounds — would take the key)
    await ev((name) => { const i = BridgeWorld.getWorld().interactions.find(i => i.type === 'crowd' && i.label === name); if (i) BridgeInteractions.execute(i); }, near.name);
    await wait(700);
    const r = await card(p, 'crowd/' + near.body);
    r.file = p._asked.has('crowd/' + near.body);
    r.said = await ev(() => { const d = document.querySelector('.world-dialog'); return d ? d.innerText.replace(/\n+/g, ' / ').slice(0, 120) : null; });
    const keyed = await ev(() => {          // no key colour left on it (each swapped for their own)
      const cv = document.querySelector('.world-dialog .wd-portrait'); if (!cv) return -1;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, keys = BridgeCrowd.XKEYS, set = {};
      Object.keys(keys).forEach(k => keys[k].forEach(h => { set[parseInt(h.slice(1), 16)] = 1; }));
      ['#00284c', '#003c70', '#0058a0', '#f05878'].forEach(h => { set[parseInt(h.slice(1), 16)] = 1; });
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && set[(d[i] << 16) | (d[i + 1] << 8) | d[i + 2]]) n++;
      return n;
    });
    console.log('portrait passer-by', near.name, '(' + near.body + '):', JSON.stringify(r), 'key pixels left', keyed);
    if (!r.ok || !r.file) bad('no portrait for a passer-by');
    if (keyed) bad(keyed + ' key-coloured pixels left on a passer-by\'s portrait');
    await p.screenshot({ path: SHOTS + '/portrait_crowd.png' });
    await shut(p);
  } else bad('nobody standing in the street to talk to');

  // another pilot in their helmet (js/multi.js's card when you walk up to them), and a captain's face, 24 × 24
  const pilots = await ev(async () => {
    const draw = (w, fn) => { const c = document.createElement('canvas'); c.width = c.height = w; document.body.appendChild(c); fn(c); return c; };
    const helm = draw(64, (c) => BridgeLook.pilotFace(c, 'cyan@a.short.0.1.tan.black', 'Alyssa'));
    const bare = draw(64, (c) => BridgeLook.pilotFace(c, 'coat-red@b.curly.0.0.deep.auburn', 'Kit'));
    const capt = draw(24, (c) => BridgeLook.face(c, 'Captain Oduya:k1', 'coat', 'gold'));
    await new Promise(r => setTimeout(r, 1200));
    const op = (c, x, y) => c.getContext('2d').getImageData(x, y, 1, 1).data[3] > 0;
    return { helmet: op(helm, 32, 30), bare: op(bare, 32, 30), captain: op(capt, 12, 12) };
  });
  pilots.files = [...p._asked].filter(f => /^pilots\//.test(f));
  console.log('portrait pilots:', JSON.stringify(pilots));
  if (!pilots.helmet || !pilots.bare || !pilots.captain) bad('a pilot\'s portrait did not draw');
  if (pilots.files.indexOf('pilots/a-helmet') < 0) bad('the helmet portrait was not used');

  // a hand in the harbour's hiring list: a face each, from the pilots' portraits at half size
  await go(p, 'lumar-crown'); await wait(1200);
  await ev(() => BridgeFleet.buy('brigantine', 'lumar-crown'));
  await ev(() => BridgeHarbour.hands('lumar-crown'));
  await wait(1500);
  const hands = await ev(() => ({
    faces: [...document.querySelectorAll('canvas.sp-face')].filter(c => c.getContext('2d').getImageData(12, 10, 1, 1).data[3] > 0).length,
    rows: document.querySelectorAll('canvas.sp-face').length
  }));
  hands.files = [...p._asked].filter(f => /^pilots\/coat-/.test(f)).length;
  console.log('portrait hands in the hiring list:', JSON.stringify(hands));
  if (!hands.rows || hands.faces < hands.rows || !hands.files) bad('the hands\' faces are not portraits');
  await p.screenshot({ path: SHOTS + '/portrait_hands.png' });
  await shut(p);

  // no portrait file: the card falls back to the head cropped out of the sheet
  await p.route(/\/portraits\/npc-baker\.png/, r => r.fulfill({ status: 404, body: '' }));
  const fb = await ev(async () => {
    const c = document.createElement('canvas'); c.width = c.height = 64; document.body.appendChild(c);
    const h = BridgeLook.npcFace(c, 'npc-baker');
    await new Promise(r => setTimeout(r, 1200));
    return { ok: h.ok, drawn: c.getContext('2d').getImageData(32, 32, 1, 1).data[3] > 0 };
  });
  console.log('portrait fallback (no file):', JSON.stringify(fb));
  if (fb.ok !== false || !fb.drawn) bad('no fallback without a portrait file');

  // on a phone: the card at ×1
  const ph = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await talk(ph, 'sylvara-hall', 'BECKOLAS', 'npc-beckolas', 'portrait_phone_beckolas');
  await talk(ph, 'verdance', 'HOLLIN', 'npc-hollin', 'portrait_phone_hollin');

  console.log('portrait errors:', errors);
  await b.close();
})().catch(e => { console.log('FAILED', e.message); process.exit(1); });
