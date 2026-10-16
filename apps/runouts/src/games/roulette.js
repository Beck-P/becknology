// Roulette at the Neon Royale: a European single-zero wheel. Inside bets (straight 35:1, split 17:1, street and
// trio 11:1, corner and first four 8:1, six line 5:1) and outside bets (columns and dozens 2:1, red/black,
// odd/even, 1-18/19-36 1:1). Zero takes the even-money bets. House edge 1/37 ≈ 2.7% on every bet.
import { clone, int } from '../core/rng.js';

export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const colorOf = (n) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');
const T = { bets: 15000, spin: 7600, result: 4800 };

const seq = (a, n, step = 1) => Array.from({ length: n }, (_, i) => a + i * step);
/** The numbers a bet key covers (null if the key isn't a real bet). */
export function covers(key) {
  const k = String(key);
  let m;
  if ((m = k.match(/^n(\d+)$/))) { const n = +m[1]; return n >= 0 && n <= 36 ? [n] : null; }
  if ((m = k.match(/^sp:(\d+)-(\d+)$/))) {
    const a = +m[1], b = +m[2];
    if (a === 0 && (b === 1 || b === 2 || b === 3)) return [0, b];
    if (a < 1 || b > 36 || a >= b) return null;
    if (b === a + 3) return [a, b];
    if (b === a + 1 && a % 3 !== 0) return [a, b];
    return null;
  }
  if ((m = k.match(/^st:(\d+)$/))) { const a = +m[1]; return a >= 1 && a <= 34 && a % 3 === 1 ? seq(a, 3) : null; }
  if (k === 'tr:0-1-2') return [0, 1, 2];
  if (k === 'tr:0-2-3') return [0, 2, 3];
  if (k === 'fo') return [0, 1, 2, 3];
  if ((m = k.match(/^co:(\d+)$/))) { const a = +m[1]; return a >= 1 && a <= 32 && a % 3 !== 0 ? [a, a + 1, a + 3, a + 4] : null; }
  if ((m = k.match(/^ln:(\d+)$/))) { const a = +m[1]; return a >= 1 && a <= 31 && a % 3 === 1 ? seq(a, 6) : null; }
  if ((m = k.match(/^col([123])$/))) return seq(+m[1], 12, 3);
  if ((m = k.match(/^doz([123])$/))) return seq((+m[1] - 1) * 12 + 1, 12);
  if (k === 'red') return seq(1, 36).filter((n) => REDS.has(n));
  if (k === 'black') return seq(1, 36).filter((n) => !REDS.has(n));
  if (k === 'odd') return seq(1, 18, 2);
  if (k === 'even') return seq(2, 18, 2);
  if (k === 'low') return seq(1, 18);
  if (k === 'high') return seq(19, 18);
  return null;
}
/** "x to 1" for a bet key. */
export function odds(key) { const c = covers(key); return c ? 36 / c.length - 1 : 0; }
/** What a bet returns (stake included) when the ball lands on n. */
export function betPays(key, amt, n) { const c = covers(key); return c && c.includes(n) ? amt * (odds(key) + 1) : 0; }
export function totalPays(bets, n) { let p = 0; for (const k in bets) p += betPays(k, bets[k], n); return p; }
export const sum = (bets) => Object.values(bets || {}).reduce((a, b) => a + b, 0);

export const NAMES = { red: 'RED', black: 'BLACK', odd: 'ODD', even: 'EVEN', low: '1-18', high: '19-36', col1: '2 TO 1', col2: '2 TO 1', col3: '2 TO 1', doz1: '1st 12', doz2: '2nd 12', doz3: '3rd 12', fo: '0-1-2-3' };
export function betName(k) {
  if (NAMES[k]) return NAMES[k];
  const c = covers(k);
  if (!c) return k;
  if (c.length === 1) return 'STRAIGHT ' + c[0];
  const kind = { 2: 'SPLIT', 3: k.startsWith('tr') ? 'TRIO' : 'STREET', 4: 'CORNER', 6: 'SIX LINE' }[c.length] || '';
  return kind + ' ' + c.join('-');
}

// ---- the table -------------------------------------------------------------------------------------------------------
export function create({ seats, limits, now = Date.now(), rng }) {
  const s = { game: 'roulette', v: 1, round: 1, phase: 'bet', wait: null, until: null, now, limits: { ...limits },
    seats: seats.map(seat), spin: null, hist: [], msg: 'PLACE YOUR BETS' };
  openRound(s, now, rng);
  return s;
}
function seat(x) { return { id: x.id, name: x.name, kind: x.kind || 'pilot', npc: x.npc || null, pos: x.pos ?? 0, bets: {}, ready: false, result: null, left: false }; }
const pilots = (s) => s.seats.filter((x) => x.kind === 'pilot' && !x.left);

const NPC_BETS = [['red'], ['black'], ['n17'], ['doz2'], ['odd', 'n7'], ['col3'], ['co:17'], ['n32', 'n0'], ['high'], ['st:13'], ['sp:8-11'], ['low', 'n3']];
function openRound(s, now, rng) {
  s.phase = 'bet'; s.spin = null; s.until = null; s.wait = null; s.msg = 'PLACE YOUR BETS';
  for (const x of s.seats) {
    x.bets = {}; x.ready = false;
    if (x.kind === 'npc' && !x.left && rng() < 0.85) {
      for (const k of NPC_BETS[int(rng, NPC_BETS.length)]) x.bets[k] = Math.min(s.limits.max, s.limits.min * [1, 2, 5, 5, 10][int(rng, 5)]);
      x.ready = true;
    }
  }
}

export function validBets(s, bets) {
  let ok = true;
  for (const k in bets) {
    const a = bets[k];
    if (!covers(k) || !(a >= s.limits.min) || a > s.limits.max || a !== Math.floor(a)) ok = false;
  }
  return ok && Object.keys(bets).length > 0;
}

function spin(s, now, rng) {
  const n = WHEEL[int(rng, 37)];
  s.phase = 'spin'; s.until = null; s.msg = 'NO MORE BETS';
  s.spin = { at: now, dur: T.spin, n, turns: 3 + int(rng, 3), wheel0: rng() * Math.PI * 2 };
  s.wait = now + T.spin;
}

export function act(state, a, env) {
  const s = clone(state), now = env.now, x = s.seats.find((y) => y.id === a.seat);
  switch (a.t) {
    case 'join': {
      if (s.seats.some((y) => y.id === a.who.id)) { s.seats.find((y) => y.id === a.who.id).left = false; break; }
      s.seats.push(seat({ ...a.who, pos: s.seats.length }));
      break;
    }
    case 'leave': {
      if (!x) return null;
      x.left = true;
      if (s.phase === 'bet') { s.seats = s.seats.filter((y) => y !== x); maybeSpin(s, now, env.rng); }
      break;
    }
    case 'bets': {
      if (s.phase !== 'bet' || !x || x.kind !== 'pilot' || x.ready || !validBets(s, a.bets)) return null;
      x.bets = { ...a.bets }; x.ready = true;
      maybeSpin(s, now, env.rng);
      if (s.phase === 'bet' && !s.until) { s.until = now + T.bets; s.wait = s.until; s.msg = 'BETS CLOSE SOON'; }
      break;
    }
    default: return null;
  }
  s.v++; s.now = now;
  return s;
}
function maybeSpin(s, now, rng) {
  const ps = pilots(s);
  if (ps.some((x) => x.ready) && ps.every((x) => x.ready)) spin(s, now, rng);
}

export function tick(state, env) {
  const now = env.now;
  if (state.wait == null || now < state.wait) return null;
  const s = clone(state);
  s.now = now;
  if (s.phase === 'bet') {
    s.until = null; s.wait = null;
    if (pilots(s).some((x) => x.ready)) spin(s, now, env.rng);
  } else if (s.phase === 'spin') {
    const n = s.spin.n;
    for (const x of s.seats) {
      if (x.left || !Object.keys(x.bets).length) { x.result = null; continue; }
      const staked = sum(x.bets), pay = totalPays(x.bets, n);
      x.result = { round: s.round, n, pay, staked, net: pay - staked };
    }
    s.hist = [n, ...s.hist].slice(0, 14);
    s.phase = 'result'; s.msg = n + ' ' + colorOf(n).toUpperCase(); s.wait = now + T.result;
  } else if (s.phase === 'result') { s.round++; openRound(s, now, env.rng); }
  s.v++;
  return s;
}

export function view(s) {
  const v = { ...s, ifc: {} };
  for (const x of s.seats) if (x.kind === 'pilot') v.ifc[x.id] = ifClosed(s, x.id);
  return v;
}
/** Before the spin a confirmed bet comes back; once the ball's in the air it's whatever it wins. */
export function ifClosed(s, id) {
  const x = s.seats.find((y) => y.id === id);
  if (!x || x.left) return 0;
  if (s.phase === 'bet') return x.ready ? sum(x.bets) : 0;
  if (s.phase === 'spin') return totalPays(x.bets, s.spin.n);
  return x.result && x.result.round === s.round ? x.result.pay : 0;
}
export function adopt(v, env) { const s = clone(v); delete s.ifc; s.wait = Math.max(env.now + 400, s.wait || 0); return s; }
