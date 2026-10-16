// Crash: the Rocket. Everyone at the pad bets, it launches, the multiplier climbs (×e^(0.09 t)) and it blows up at a
// point the house drew before launch: P(it reaches m) = 0.96 / m, so 4% of rockets never leave the pad and every
// cash-out is worth 96% of fair. Cash out any time before it blows (or set an auto cash-out) and the bet pays
// bet × multiplier.
import { clone } from '../core/rng.js';

export const K = 0.09;                        // growth per second
export const EDGE = 0.96;
const T = { bets: 9000, boom: 3200, max: 1000 };
export const multAt = (ms) => Math.max(1, Math.floor(Math.exp(K * Math.max(0, ms) / 1000) * 100) / 100);
export const timeFor = (m) => (Math.log(m) / K) * 1000;

/** Where this rocket blows: ≥ 1.00, two decimals. */
export function crashPoint(rng) {
  const u = rng();
  const m = EDGE / (1 - u);
  return m < 1 ? 1 : Math.min(T.max, Math.floor(m * 100) / 100);
}

export function create({ seats, limits, now = Date.now(), rng }) {
  const s = { game: 'crash', v: 1, round: 1, phase: 'bet', wait: null, until: null, now, limits: { ...limits }, seats: seats.map(seat), hist: [], flight: null, msg: '' };
  void rng;
  open(s, now);
  return s;
}
function seat(x) { return { id: x.id, name: x.name, kind: x.kind || 'pilot', npc: x.npc || null, bet: 0, auto: 0, ready: false, cash: 0, result: null, left: false }; }
const pilots = (s) => s.seats.filter((x) => x.kind === 'pilot' && !x.left);

function open(s, now) {
  s.phase = 'bet'; s.flight = null; s.until = null; s.wait = null; s.msg = 'PLACE YOUR BETS';
  for (const x of s.seats) { x.bet = 0; x.auto = 0; x.ready = false; x.cash = 0; }
}
function launch(s, now, rng) {
  const at = crashPoint(rng);
  s.flight = { at: now + 1200, crash: at, dur: timeFor(at) };
  s.phase = 'fly'; s.until = null; s.msg = '';
  // npcs at the pad: they bet and pick a cash-out of their own
  for (const x of s.seats) if (x.kind === 'npc' && !x.left) { x.bet = s.limits.min * (1 + Math.floor(rng() * 4)); x.auto = Math.round((1.2 + rng() * rng() * 6) * 100) / 100; x.ready = true; }
  s.wait = s.flight.at + s.flight.dur;
}

export function act(state, a, env) {
  const s = clone(state), now = env.now, x = s.seats.find((y) => y.id === a.seat);
  switch (a.t) {
    case 'join': if (!s.seats.some((y) => y.id === a.who.id)) s.seats.push(seat(a.who)); else s.seats.find((y) => y.id === a.who.id).left = false; break;
    case 'leave': if (!x) return null; x.left = true; if (s.phase === 'bet') { s.seats = s.seats.filter((y) => y !== x); maybeGo(s, now, env.rng); } break;
    case 'bet': {
      if (s.phase !== 'bet' || !x || x.ready || !(a.amount >= s.limits.min) || a.amount > s.limits.max) return null;
      x.bet = Math.floor(a.amount); x.auto = a.auto >= 1.01 ? Math.round(a.auto * 100) / 100 : 0; x.ready = true;
      maybeGo(s, now, env.rng);
      if (s.phase === 'bet' && !s.until) { s.until = now + T.bets; s.wait = s.until; }
      break;
    }
    case 'cash': {                                  // cash out at the multiplier the pilot saw (if the rocket was still up)
      if (s.phase !== 'fly' || !x || !x.bet || x.cash) return null;
      const m = Math.max(1, Math.floor(a.at * 100) / 100);
      const live = multAt(now - s.flight.at + 400);
      if (m >= s.flight.crash || m > live) return null;
      x.cash = m;
      break;
    }
    default: return null;
  }
  s.v++; s.now = now;
  return s;
}
function maybeGo(s, now, rng) { const ps = pilots(s); if (ps.some((x) => x.ready) && ps.every((x) => x.ready)) launch(s, now, rng); }

export function tick(state, env) {
  const now = env.now;
  if (state.wait == null || now < state.wait) return null;
  const s = clone(state);
  s.now = now;
  if (s.phase === 'bet') { s.until = null; s.wait = null; if (pilots(s).some((x) => x.ready)) launch(s, now, env.rng); }
  else if (s.phase === 'fly') {
    const c = s.flight.crash;
    for (const x of s.seats) {
      if (x.left || !x.bet) { x.result = null; continue; }
      if (!x.cash && x.auto && x.auto < c) x.cash = x.auto;
      const pay = x.cash ? Math.floor(x.bet * x.cash) : 0;
      x.result = { round: s.round, pay, staked: x.bet, net: pay - x.bet, at: x.cash || 0 };
    }
    s.hist = [c, ...s.hist].slice(0, 16);
    s.phase = 'boom'; s.msg = 'BUSTED @ ' + c.toFixed(2) + '×'; s.wait = now + T.boom;
  } else if (s.phase === 'boom') { s.round++; open(s, now); }
  s.v++;
  return s;
}

export function view(s) { const v = { ...s, ifc: {} }; for (const x of s.seats) if (x.kind === 'pilot') v.ifc[x.id] = ifClosed(s, x.id, s.now); return v; }
/** Before launch the bet comes back; in flight, walking away cashes out where the rocket is (if it's still up). */
export function ifClosed(s, id, now = Date.now()) {
  const x = s.seats.find((y) => y.id === id);
  if (!x || x.left || !x.bet) return 0;
  if (s.phase === 'bet') return x.ready ? x.bet : 0;
  if (s.phase === 'fly') {
    if (x.cash) return Math.floor(x.bet * x.cash);
    const m = multAt(now - s.flight.at);
    if (x.auto && x.auto < s.flight.crash && m >= x.auto) return Math.floor(x.bet * x.auto);
    return m < s.flight.crash && now >= s.flight.at ? Math.floor(x.bet * m) : now < s.flight.at ? x.bet : 0;
  }
  return x.result && x.result.round === s.round ? x.result.pay : 0;
}
export function adopt(v, env) { const s = clone(v); delete s.ifc; s.wait = Math.max(env.now + 400, s.wait || 0); return s; }
