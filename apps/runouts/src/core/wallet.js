// Where the chips come from. Inside the Bridge's cabinet (an iframe) they're the pilot's Bridge coins, and every
// stake and payout goes through the Bridge (js/casino.js there) with what the table owes you if you walk away right
// now (`hold`), so a cabinet closed mid-round settles or refunds instead of losing or doubling coins:
//
//   → bridge-casino-hello {}                               ← bridge-casino-wallet { ok, balance, pilot }
//   → bridge-casino-stake { id, amount, game, hold }       ← bridge-casino-staked { id, ok, balance }
//   → bridge-casino-pay   { id, amount, game, key, hold }  ← bridge-casino-paid   { id, balance }
//   → bridge-casino-hold  { hold, game }                   (no answer)
//
// Standalone (/runouts in a tab) it's a play balance kept in this browser (localStorage `royale_chips`).
const LOCAL = 'royale_chips';
export const START = 1000;
export const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

function post(msg) { try { window.parent.postMessage(msg, '*'); } catch (e) { /* gone */ } }

const waiting = {};
let nextId = 1;
if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    const d = e && e.data;
    if (!d || typeof d.type !== 'string' || d.type.indexOf('bridge-casino-') !== 0) return;
    const w = d.id != null && waiting[d.id];
    if (w) { delete waiting[d.id]; clearTimeout(w.timer); w.done(d); }
    if (d.type === 'bridge-casino-wallet' && helloWait) { const f = helloWait; helloWait = null; f(d); }
  });
}
let helloWait = null;
function ask(type, body, ms = 9000) {
  const id = nextId++;
  return new Promise((resolve) => {
    waiting[id] = { done: resolve, timer: setTimeout(() => { delete waiting[id]; resolve(null); }, ms) };
    post({ type, id, ...body });
  });
}

class Wallet {
  constructor(kind, balance, pilot) {
    this.kind = kind;                       // 'bridge' | 'local'
    this.balance = balance;
    this.pilot = pilot || null;
    this.held = 0;
    this.subs = new Set();
    this.paid = new Set();
    this.label = kind === 'bridge' ? 'COINS' : 'CHIPS';
    this.session = { staked: 0, back: 0 };
    this.risk = 0;                          // staked since the last round settled: a round's in play
  }
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  log(e) { this.trail = (this.trail || []).concat([e]).slice(-60); }
  emit() { for (const f of this.subs) try { f(this); } catch (e) { /* */ } }
  set(b) { if (typeof b === 'number' && isFinite(b)) { this.balance = b; this.emit(); } }

  /** Take a stake off the balance. Resolves true when it's on the table. */
  async stake(amount, game) {
    amount = Math.floor(amount);
    if (!(amount > 0)) return true;
    this.log({ stake: amount, game, bal: this.balance });
    if (amount > this.balance) return false;
    if (this.kind === 'local') {
      this.balance -= amount; this.saveLocal();
      this.held += amount; this.session.staked += amount; this.risk += amount; this.emit();
      return true;
    }
    const r = await ask('bridge-casino-stake', { amount, game, hold: this.held + amount });
    if (!r || !r.ok) { if (r && typeof r.balance === 'number') this.set(r.balance); return false; }
    this.held += amount; this.session.staked += amount; this.risk += amount;
    if (typeof r.balance === 'number') this.balance = r.balance; else this.balance -= amount;
    this.emit();
    return true;
  }
  /** Pay out (once per key). hold: what's still owed on the table after this. */
  async pay(amount, game, key, hold) {
    if (key && this.paid.has(key)) return;
    if (key) { this.paid.add(key); this.risk = 0; }
    amount = Math.floor(amount);
    this.log({ pay: amount, game, key, hold, bal: this.balance });
    if (hold != null) this.held = Math.max(0, hold);
    if (!(amount > 0)) { if (hold != null) this.hold(hold, game, true); return; }
    this.session.back += amount;
    if (this.kind === 'local') { this.balance += amount; this.saveLocal(); this.emit(); return; }
    this.balance += amount; this.emit();
    const r = await ask('bridge-casino-pay', { amount, game, key, hold: this.held });
    if (r && typeof r.balance === 'number') this.set(r.balance);
  }
  /** What the table owes this player if they leave now (sent to the Bridge when it changes). */
  hold(v, game, force) {
    v = Math.max(0, Math.floor(v || 0));
    if (v === this.held && !force) return;
    this.held = v;
    if (this.kind === 'bridge') post({ type: 'bridge-casino-hold', hold: v, game });
  }
  saveLocal() { try { localStorage.setItem(LOCAL, String(this.balance)); } catch (e) { /* */ } }
  /** Standalone only: the cage tops you back up. */
  refill() { if (this.kind !== 'local') return; this.balance = Math.max(this.balance, START); this.saveLocal(); this.emit(); }
}

function local() {
  let b = START;
  try { const v = parseInt(localStorage.getItem(LOCAL), 10); if (Number.isFinite(v) && v >= 0) b = v; } catch (e) { /* */ }
  return new Wallet('local', b, null);
}

/** Find the wallet: the Bridge's coins when it answers from the frame we're in, else the local play balance. */
export function openWallet() {
  if (!inFrame) return Promise.resolve(local());
  return new Promise((resolve) => {
    const t = setTimeout(() => { helloWait = null; resolve(local()); }, 1500);
    helloWait = (d) => {
      clearTimeout(t);
      if (d.ok && typeof d.balance === 'number') { const w = new Wallet('bridge', d.balance, d.pilot); w.high = !!d.high; resolve(w); }
      else { const w = local(); w.note = d.reason === 'no_pilot' ? 'Sign in on the Bridge to play for coins' : ''; resolve(w); }
    };
    post({ type: 'bridge-casino-hello', v: 1 });
  });
}

// ---- the cabinet around us: ready, Esc, a round in play -----------------------------------------------------------------
export function frameReady() { if (inFrame) post({ type: 'bridge-iframe-ready' }); }
export function requestClose(source = 'royale') { if (inFrame) post({ type: 'bridge-request-close', source }); }
let lastRun = '';
/** Tell the cabinet whether a round's in play (the first Esc then warns instead of leaving). */
export function runState(active, hint) {
  const k = (active ? 1 : 0) + '|' + (hint || '');
  if (!inFrame || k === lastRun) return;
  lastRun = k;
  post({ type: 'bridge-run-state', game: 'runouts', active: !!active, paused: false, hint: hint || '' });
}
