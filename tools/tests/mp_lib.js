// shared helpers for two-player tests
const { chromium } = require('playwright');
const BECK = { id: '11111111-1111-1111-1111-111111111111', name: 'BECK', suit_color: 'gold' };
const ALY = { id: '22222222-2222-2222-2222-222222222222', name: 'ALYSSA', suit_color: 'cyan' };
async function player(b, S, who, opts) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1100, height: 720 } }, opts || {}));
  await ctx.addInitScript({ path: __dirname + '/fakesupa.js' });
  await ctx.addInitScript(() => { localStorage.setItem('bridge_ship_location', 'lumar'); localStorage.setItem('bridge_sail_taught', '1'); });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log(who.name, 'PAGEERR', e.message));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  await p.goto('http://127.0.0.1:8766/'); await p.waitForTimeout(2200);
  await p.evaluate(w => { BridgeIntro.hide && BridgeIntro.hide(); BridgeState.setPilot(w);
    window._coins = 500; BridgeProgression.awardCoins = (n) => { window._coins += n; return Promise.resolve(window._coins); };
    BridgeProgression.wagerCoins = (n) => { if (window._coins < n) return Promise.resolve({ ok: false, reason: 'coins' }); window._coins -= n; return Promise.resolve({ ok: true, balance: window._coins }); }; }, who);
  await p.waitForTimeout(1200);
  return p;
}
async function enter(p, world, spawn) {
  await p.evaluate(([w, s]) => new Promise(r => BridgeWorld.load(w, () => { BridgeState.transition('world', { worldId: w, spawn: s }); r(); })), [world, spawn || null]);
  await p.waitForTimeout(800);
}
const SUPA = 'http://127.0.0.1:' + (process.env.SUPA_PORT || 8767);
async function reset() { await fetch(SUPA + '/admin', { method: 'POST', body: JSON.stringify({ reset: true, missing: [] }) }); }
module.exports = { chromium, BECK, ALY, player, enter, reset };
