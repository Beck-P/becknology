// Royale Link inside the Bridge's cabinet: coins staked and paid through the Bridge, Esc mid-round settles,
// a page closed with chips on the table pays them back on the next load.
const { chromium } = require('playwright');
const S = __dirname;
const DIR = S + '/shots';
const BECK = { id: '11111111-1111-1111-1111-111111111111', name: 'BECK', suit_color: 'gold' };
const [, , W = 1280, H = 800, name = 'brc', only = ''] = process.argv;

// the pilot's coins live in localStorage `_tc` (so a reload keeps them); every call logged in `_tl`
const SETUP = ([w]) => {
  try { BridgeIntro && BridgeIntro.hide && BridgeIntro.hide(); } catch (e) { /* */ }
  BridgeState.setPilot(w);
  const get = () => +(localStorage.getItem('_tc') || 0), set = (v) => localStorage.setItem('_tc', String(v));
  const lg = (e) => { const l = JSON.parse(localStorage.getItem('_tl') || '[]'); l.push(e); localStorage.setItem('_tl', JSON.stringify(l)); };
  window._setup = 1;
  BridgeProgression.getBalance = () => Promise.resolve(get());
  BridgeProgression.awardCoins = (n, why) => { set(get() + n); lg(['+', n, why]); return Promise.resolve(get()); };
  BridgeProgression.wagerCoins = (n, why) => { if (get() < n) return Promise.resolve({ ok: false, reason: 'coins' }); set(get() - n); lg(['-', n, why]); return Promise.resolve({ ok: true, balance: get() }); };
};
async function boot(ctx) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  p.on('console', (m) => { if ((m.type() === 'error' && !/Failed to load resource/.test(m.text())) || /\[casino\]/.test(m.text())) console.log('CONSOLE', m.type(), m.text().slice(0, 200)); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, (r) => r.abort());
  await p.goto('http://127.0.0.1:8766/bridge/');
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(2000);
    try { if (!(await p.evaluate(() => window._setup))) await p.evaluate(SETUP, [BECK]); else break; } catch (e) { /* reloading */ }
  }
  return p;
}
async function enter(p, world) {
  for (let i = 0; i < 3; i++) {
    try { await p.evaluate((w) => new Promise((r) => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w }); r(); })), world); break; }
    catch (e) { await p.waitForTimeout(2500); try { await p.evaluate(SETUP, [BECK]); } catch (e2) { /* */ } }
  }
  await p.waitForTimeout(900);
}
const frameOf = async (p) => { for (let i = 0; i < 40; i++) { const f = p.frames().find((x) => /\/runouts\//.test(x.url())); if (f) return f; await p.waitForTimeout(150); } return null; };
const coins = (p) => p.evaluate(() => +localStorage.getItem('_tc'));
const log = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('_tl') || '[]'));
const tot = (cards) => { let t = 0, a = 0; for (const c of cards) { if (!c.r) continue; t += c.r === 14 ? 11 : Math.min(10, c.r); if (c.r === 14) a++; } while (t > 21 && a) { t -= 10; a--; } return t; };
const ready = (f) => f.waitForFunction(() => window.__wallet && window.__wallet.kind === 'bridge' && window.__table && window.__table.view(), null, { timeout: 9000 });

(async () => {
  await fetch('http://127.0.0.1:' + (process.env.SUPA_PORT || 8767) + '/admin', { method: 'POST', body: JSON.stringify({ reset: true, missing: [] }) });
  const b = await chromium.launch({ executablePath: require(__dirname + '/../chrome.js') });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 600 });
  await ctx.addInitScript({ path: __dirname + '/../fakesupa.js' });
  await ctx.addInitScript(() => { if (!localStorage.getItem('_tc')) localStorage.setItem('_tc', '500'); });
  // the coins are ours from the first moment (a chip left on a table is paid back 5 s after load)
  await ctx.addInitScript(() => {
    if (location.pathname.indexOf('/bridge') !== 0) return;
    const get = () => +(localStorage.getItem('_tc') || 0), set = (v) => localStorage.setItem('_tc', String(v));
    const lg = (e) => { const l = JSON.parse(localStorage.getItem('_tl') || '[]'); l.push(e); localStorage.setItem('_tl', JSON.stringify(l)); };
    const t = setInterval(() => {
      const P = window.BridgeProgression;
      if (!P) return;
      clearInterval(t);
      P.getBalance = () => Promise.resolve(get());
      P.awardCoins = (n, why) => { set(get() + n); lg(['+', n, why]); return Promise.resolve(get()); };
      P.wagerCoins = (n, why) => { if (get() < n) return Promise.resolve({ ok: false, reason: 'coins' }); set(get() - n); lg(['-', n, why]); return Promise.resolve({ ok: true, balance: get() }); };
    }, 10);
  });
  let p = await boot(ctx);
  await enter(p, 'arcadia');
  const deco = await p.evaluate(() => BridgeWorld.getWorld().interactions.filter((i) => /runouts/.test(i.target || '')).map((i) => i.type + ' ' + i.target + ' ' + i.label));
  console.log('arcade cabinets now:', JSON.stringify(deco));

  if (!only || only === 'lobby') {
    // 1. a terminal (the old Runouts cabinet): the lobby in the casino frame, with the Bridge's coins
    await p.evaluate(() => { const it = BridgeWorld.getWorld().interactions.find((i) => /runouts/.test(i.target || '')); BridgeInteractions.execute(it); });
    const f = await frameOf(p);
    await f.waitForFunction(() => window.__wallet && window.__wallet.kind, null, { timeout: 8000 });
    console.log('lobby wallet', await f.evaluate(() => ({ kind: window.__wallet.kind, bal: window.__wallet.balance, pilot: window.__wallet.pilot })),
      'overlay', await p.evaluate(() => document.getElementById('cabinet-modal-overlay').className), 'found', await p.evaluate(() => BridgeGames.has('runouts')));
    await p.waitForTimeout(2000);
    await p.screenshot({ path: DIR + '/' + name + '_lobby.png' });
    await p.evaluate(() => BridgeCabinetModal.hide());
    await p.waitForTimeout(600);
  }

  if (!only || only === 'bj') {
    // 2. a blackjack table: bet, play it out, check the coins moved through the Bridge
    await p.evaluate(() => BridgeInteractions.execute({ type: 'casino', game: 'blackjack', table: 'bj-2', label: 'BLACKJACK', prompt: 'PRESS E TO PLAY' }));
    const f = await frameOf(p);
    console.log('url', f.url());
    await ready(f);
    await p.waitForTimeout(1200);
    const v = () => f.evaluate(() => { const x = window.__table.view(); const me = x.seats.find((s) => s.id === 'me'); return { phase: x.phase, turn: x.turn, me, dealer: x.dealer.cards }; });
    const canvas = async () => { const el = await f.$('.stage-box canvas'); return el.boundingBox(); };
    const bet = async (n) => { const box = await canvas(); for (let k = 0; k < n; k++) { await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.82); await p.waitForTimeout(140); } await p.keyboard.press('Space'); };
    for (let r = 0; r < 2; r++) {
      const c0 = await coins(p);
      await bet(3);
      await p.waitForTimeout(500);
      const staked = c0 - (await coins(p));
      let res = null;
      for (let i = 0; i < 120; i++) {
        await p.waitForTimeout(250);
        const s = await v();
        if (s.phase === 'insurance' && s.me.ins == null) { await p.keyboard.press('n'); continue; }
        if (s.phase === 'play' && s.turn && s.turn.s === 'me') {
          if (r === 0) await p.screenshot({ path: DIR + '/' + name + '_turn.png' });
          await p.waitForTimeout(300);
          await p.keyboard.press(tot(s.me.hands[s.turn.h].cards) < 17 ? 'h' : 's');
          continue;
        }
        if (s.phase === 'settle') { res = s; break; }
      }
      await p.waitForTimeout(2500);
      const c1 = await coins(p);
      const r0 = res && res.me.result, paid = r0 ? r0.pay : 0, st2 = r0 ? r0.staked : staked;
      console.log('round', r, 'coins', c0, '->', c1, 'result', JSON.stringify(r0), c1 === c0 - st2 + paid ? 'OK' : 'MISMATCH', 'bar', await p.evaluate(() => document.getElementById('cabinet-modal-coins').textContent));
      if (r === 0) await p.screenshot({ path: DIR + '/' + name + '_settle.png' });
      await p.waitForTimeout(1500);
    }
    // 3. Esc mid-round (my turn, cards out): warned first, then it settles as the table says (the hold), paid as it closes
    let mid = null, c1 = 0;
    for (let tries = 0; tries < 6 && !mid; tries++) {
      const c0 = await coins(p);
      await bet(4);
      for (let i = 0; i < 60; i++) {
        await p.waitForTimeout(200);
        const s = await v();
        if (s.phase === 'insurance' && s.me.ins == null) { await p.keyboard.press('n'); continue; }
        if (s.phase === 'play' && s.turn && s.turn.s === 'me') { mid = s; break; }
        if (s.phase === 'settle') break;
      }
      if (!mid) { console.log('  (no turn this round, again)', c0); await p.waitForTimeout(4000); }
    }
    await p.waitForTimeout(600);
    c1 = await coins(p);
    const st = await p.evaluate(() => BridgeCasino._state() && { hold: BridgeCasino._state().hold, open: localStorage.getItem('casino_open') });
    console.log('mid-round: my hand', JSON.stringify(mid.me.hands.map((h) => h.cards.map((c) => c.r))), 'dealer up', JSON.stringify(mid.dealer.map((c) => c.r)),
      'bridge hold', JSON.stringify(st), 'app held', await f.evaluate(() => window.__wallet.held), 'risk', await f.evaluate(() => window.__wallet.risk));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    console.log('after one Esc: open', await p.evaluate(() => BridgeCabinetModal.isOpen()), 'toast', await f.evaluate(() => (document.querySelector('.app-toast') || {}).textContent).catch(() => 'frame gone'));
    await p.screenshot({ path: DIR + '/' + name + '_esc.png' });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(1500);
    const c2 = await coins(p);
    console.log('after two Esc: open', await p.evaluate(() => BridgeCabinetModal.isOpen()), 'coins', c1, '->', c2, 'back', c2 - c1, 'hold was', st && st.hold, (c2 - c1) === (st && st.hold) ? 'OK' : 'MISMATCH',
      'casino_open', await p.evaluate(() => localStorage.getItem('casino_open')));
    await p.waitForTimeout(400);
    await p.screenshot({ path: DIR + '/' + name + '_closed.png' });
  }

  if (!only || only === 'leftover') {
    // 4. a page closed with chips on the table (a poker stack): they come back on the next load
    await p.evaluate(() => BridgeInteractions.execute({ type: 'casino', game: 'poker', table: 'poker-1', label: "HOLD'EM" }));
    const f = await frameOf(p);
    await f.waitForFunction(() => window.__wallet && window.__wallet.kind === 'bridge', null, { timeout: 9000 });
    await p.waitForTimeout(1200);
    const c0 = await coins(p);
    await f.click('text=/Buy in 200/');
    await p.waitForTimeout(1500);
    const c1 = await coins(p);
    console.log('poker buy-in: coins', c0, '->', c1, 'casino_open =', await p.evaluate(() => localStorage.getItem('casino_open')));
    await p.screenshot({ path: DIR + '/' + name + '_poker.png' });
    await p.close();
    const q = await ctx.newPage();
    await q.goto('http://127.0.0.1:8766/package.json');
    const o = await q.evaluate(() => localStorage.getItem('casino_open'));
    console.log('after the page closed, casino_open =', o);
    await q.evaluate(() => { const o = JSON.parse(localStorage.getItem('casino_open') || 'null'); if (o) { for (const k in o) o[k].at = Date.now() - 60000; localStorage.setItem('casino_open', JSON.stringify(o)); } });
    await q.close();
    p = await boot(ctx);
    await p.waitForTimeout(6000);
    const c2 = await coins(p);
    console.log('reloaded: coins', c1, '->', c2, 'back', c2 - c1, 'casino_open', await p.evaluate(() => localStorage.getItem('casino_open')), 'stats', await p.evaluate(() => JSON.stringify(BridgeCasino.stats())));
  }
  console.log('log', JSON.stringify(await log(p)));
  await b.close();
})();
