// Craps at the Neon Royale. The dice go round the table: whoever holds them keeps shooting until they seven out.
// Line bets (pass / don't pass, come / don't come) pay even money; odds behind them pay true odds (3-4-5×);
// field (2 and 12 pay double), place bets (9:5 on 4/10, 7:5 on 5/9, 7:6 on 6/8, off on the come-out) and the
// centre's one-roll and hardway bets. A bet's `pay` is what comes back: stake and winnings for a bet that comes
// down, just the winnings for a place bet or hardway that stays up.
import { clone, int } from '../core/rng.js';

const T = { bets: 15000, roll: 2300, result: 2400 };
export const POINTS = [4, 5, 6, 8, 9, 10];
export const ODDS_MULT = { 4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5 };
const TRUE_ODDS = { 4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5] };   // pays a:b on a pass/come odds bet
const PLACE = { 4: [9, 5], 10: [9, 5], 5: [7, 5], 9: [7, 5], 6: [7, 6], 8: [7, 6] };
const HARD = { 4: 7, 10: 7, 6: 9, 8: 9 };
const win = (amt, [a, b]) => Math.floor((amt * a) / b);

export const BET_NAMES = {
  pass: 'PASS LINE', dp: "DON'T PASS", po: 'PASS ODDS', dpo: 'LAY ODDS', come: 'COME', dc: "DON'T COME", field: 'FIELD',
  any7: 'ANY SEVEN', anyc: 'ANY CRAPS', yo: 'YO 11', h4: 'HARD 4', h6: 'HARD 6', h8: 'HARD 8', h10: 'HARD 10',
};
export function betName(k) {
  if (BET_NAMES[k]) return BET_NAMES[k];
  let m;
  if ((m = k.match(/^p(\d+)$/))) return 'PLACE ' + m[1];
  if ((m = k.match(/^c(\d+)$/))) return 'COME ' + m[1];
  if ((m = k.match(/^co(\d+)$/))) return 'COME ODDS ' + m[1];
  if ((m = k.match(/^d(\d+)$/))) return "DON'T COME " + m[1];
  if ((m = k.match(/^do(\d+)$/))) return 'LAY ' + m[1];
  return k.toUpperCase();
}
/** One-roll bets come down win or lose. */
export const ONE_ROLL = new Set(['field', 'any7', 'anyc', 'yo']);
export const PAYS = { field: '1:1 · 2 & 12 PAY 2:1', any7: '4 TO 1', anyc: '7 TO 1', yo: '15 TO 1', h4: '7 TO 1', h10: '7 TO 1', h6: '9 TO 1', h8: '9 TO 1' };

/**
 * Resolve one roll against a seat's bets.
 * → { bets (what stays on the table), pay (comes back to the player now), wins: {key: pay}, lost: {key: amt}, moved: {from: to} }
 */
export function resolve(bets, point, d1, d2) {
  const t = d1 + d2, hard = d1 === d2, b = { ...bets }, wins = {}, lost = {}, moved = {};
  let pay = 0;
  const W = (k, p, stays) => { wins[k] = (wins[k] || 0) + p; pay += p; if (!stays) delete b[k]; };
  const L = (k) => { lost[k] = b[k]; delete b[k]; };
  const comeOut = point == null;
  // the line
  if (b.pass) {
    if (comeOut) { if (t === 7 || t === 11) W('pass', b.pass * 2); else if (t === 2 || t === 3 || t === 12) L('pass'); }
    else if (t === point) W('pass', b.pass * 2); else if (t === 7) L('pass');
  }
  if (b.po && !comeOut) { if (t === point) W('po', b.po + win(b.po, TRUE_ODDS[point])); else if (t === 7) L('po'); }
  if (b.dp) {
    if (comeOut) { if (t === 2 || t === 3) W('dp', b.dp * 2); else if (t === 12) { /* bar 12: a push */ } else if (t === 7 || t === 11) L('dp'); }
    else if (t === 7) W('dp', b.dp * 2); else if (t === point) L('dp');
  }
  if (b.dpo && !comeOut) { if (t === 7) W('dpo', b.dpo + win(b.dpo, [TRUE_ODDS[point][1], TRUE_ODDS[point][0]])); else if (t === point) L('dpo'); }
  // come points already out on numbers (resolved before the come box moves, so a new come bet can't hit on its own roll)
  for (const n of POINTS) {
    const c = 'c' + n, co = 'co' + n, d = 'd' + n, dO = 'do' + n;
    if (b[c]) { if (t === n) W(c, b[c] * 2); else if (t === 7) L(c); }
    if (b[co]) {
      if (t === n) W(co, b[co] + win(b[co], TRUE_ODDS[n]));
      else if (t === 7) { if (comeOut) W(co, b[co]); else L(co); }      // come odds are off on the come-out: returned
    }
    if (b[d]) { if (t === 7) W(d, b[d] * 2); else if (t === n) L(d); }
    if (b[dO]) { if (t === 7) W(dO, b[dO] + win(b[dO], [TRUE_ODDS[n][1], TRUE_ODDS[n][0]])); else if (t === n) L(dO); }
  }
  // the come box
  if (b.come) {
    if (t === 7 || t === 11) W('come', b.come * 2);
    else if (t === 2 || t === 3 || t === 12) L('come');
    else { const k = 'c' + t; b[k] = (b[k] || 0) + b.come; moved.come = k; delete b.come; }
  }
  if (b.dc) {
    if (t === 2 || t === 3) W('dc', b.dc * 2);
    else if (t === 12) { /* push, stays in the box */ }
    else if (t === 7 || t === 11) L('dc');
    else { const k = 'd' + t; b[k] = (b[k] || 0) + b.dc; moved.dc = k; delete b.dc; }
  }
  // place bets work when there's a point
  for (const n of POINTS) {
    const p = 'p' + n;
    if (!b[p] || comeOut) continue;
    if (t === n) W(p, win(b[p], PLACE[n]), true); else if (t === 7) L(p);
  }
  // hardways (off on the come-out)
  for (const n of [4, 6, 8, 10]) {
    const h = 'h' + n;
    if (!b[h] || comeOut) continue;
    if (t === n && hard) W(h, b[h] * HARD[n], true);
    else if (t === n || t === 7) L(h);
  }
  // one roll
  if (b.field) { if (t === 2 || t === 12) W('field', b.field * 3); else if ([3, 4, 9, 10, 11].includes(t)) W('field', b.field * 2); else L('field'); }
  if (b.any7) { if (t === 7) W('any7', b.any7 * 5); else L('any7'); }
  if (b.anyc) { if (t === 2 || t === 3 || t === 12) W('anyc', b.anyc * 8); else L('anyc'); }
  if (b.yo) { if (t === 11) W('yo', b.yo * 16); else L('yo'); }
  return { bets: b, pay, wins, lost, moved };
}
/** The point after a roll. */
export function nextPoint(point, t) {
  if (point == null) return POINTS.includes(t) ? t : null;
  return t === point || t === 7 ? null : point;
}
export const sum = (bets) => Object.values(bets || {}).reduce((a, b) => a + b, 0);

/** Can these new chips go down now? (adds: {key: amt}, on top of what's already on the table) */
export function canBet(s, have, adds) {
  const point = s.point, after = { ...have };
  for (const k in adds) {
    const a = adds[k];
    if (!(a > 0) || a !== Math.floor(a)) return false;
    after[k] = (after[k] || 0) + a;
  }
  for (const k in adds) {
    const v = after[k];
    if (k === 'pass' || k === 'dp') { if (point != null) return false; }
    else if (k === 'po') { if (point == null || !after.pass || v > after.pass * ODDS_MULT[point]) return false; continue; }
    else if (k === 'dpo') { if (point == null || !after.dp || v > after.dp * 6) return false; continue; }
    else if (k === 'come' || k === 'dc') { if (point == null) return false; }
    else if (/^co\d+$/.test(k)) { const n = +k.slice(2); if (!after['c' + n] || v > after['c' + n] * ODDS_MULT[n]) return false; continue; }
    else if (/^do\d+$/.test(k)) { const n = +k.slice(2); if (!after['d' + n] || v > after['d' + n] * 6) return false; continue; }
    else if (/^p(4|5|6|8|9|10)$/.test(k) || /^h(4|6|8|10)$/.test(k) || ONE_ROLL.has(k)) { /* any time */ }
    else return false;
    if (v < s.limits.min || v > s.limits.max) return false;
  }
  return true;
}

// ---- the table -------------------------------------------------------------------------------------------------------
export function create({ seats, limits, now = Date.now(), rng }) {
  const s = { game: 'craps', v: 1, round: 1, phase: 'bet', wait: null, until: null, now, limits: { ...limits }, point: null,
    seats: seats.map(seat), shooter: null, dice: [3, 4], roll: null, hist: [], msg: 'COMING OUT', rolls: 0 };
  s.shooter = order(s)[0] ? order(s)[0].id : null;
  openWindow(s, now, rng);
  return s;
}
function seat(x) { return { id: x.id, name: x.name, kind: x.kind || 'pilot', npc: x.npc || null, pos: x.pos ?? 0, bets: {}, ready: false, result: null, left: false, adds: null }; }
const pilots = (s) => s.seats.filter((x) => x.kind === 'pilot' && !x.left);
const order = (s) => s.seats.filter((x) => !x.left).sort((a, b) => a.pos - b.pos);

function openWindow(s, now, rng) {
  s.phase = 'bet'; s.until = null; s.wait = null; s.roll = null;
  for (const x of s.seats) {
    x.ready = false; x.adds = null;
    if (x.kind === 'npc' && !x.left) npcBets(s, x, rng);
  }
  const sh = s.seats.find((x) => x.id === s.shooter);
  if (sh && sh.kind === 'npc' && !pilots(s).length) s.wait = now + 4000;
  s.msg = s.point == null ? 'COMING OUT' : 'THE POINT IS ' + s.point;
}
function npcBets(s, x, rng) {
  const m = s.limits.min, b = x.bets;
  if (s.point == null) { if (!b.pass && !b.dp) { if (rng() < 0.85) b.pass = m * (1 + int(rng, 3)); else b.dp = m; } }
  else {
    if (b.pass && !b.po && rng() < 0.7) b.po = b.pass * Math.min(2, ODDS_MULT[s.point]);
    if (!b.p6 && rng() < 0.4) b.p6 = 6 * Math.max(1, Math.round(m / 6));
    if (!b.p8 && rng() < 0.4) b.p8 = 6 * Math.max(1, Math.round(m / 6));
    if (!b.come && rng() < 0.25) b.come = m;
  }
  if (rng() < 0.15) b.field = m;
  if (rng() < 0.06) b.h8 = Math.max(1, Math.round(m / 5));
  x.ready = true;
}

function throwDice(s, now, rng) {
  const d1 = 1 + int(rng, 6), d2 = 1 + int(rng, 6);
  s.phase = 'roll'; s.until = null; s.msg = '';
  s.roll = { at: now, dur: T.roll, dice: [d1, d2], by: s.shooter, seed: int(rng, 1e9) };
  s.wait = now + T.roll;
}

export function act(state, a, env) {
  const s = clone(state), now = env.now, x = s.seats.find((y) => y.id === a.seat);
  switch (a.t) {
    case 'join': {
      if (s.seats.some((y) => y.id === a.who.id)) { s.seats.find((y) => y.id === a.who.id).left = false; break; }
      s.seats.push(seat({ ...a.who, pos: a.who.pos ?? s.seats.length }));
      break;
    }
    case 'leave': {
      if (!x) return null;
      x.left = true; x.bets = {};
      if (s.shooter === x.id) passDice(s);
      if (s.phase === 'bet') maybeRoll(s, now, env.rng);
      break;
    }
    case 'ready': {                                  // the chips this pilot's put down (already staked), and they're ready
      if (s.phase !== 'bet' || !x || x.kind !== 'pilot' || x.ready) return null;
      const adds = a.adds || {};
      if (Object.keys(adds).length && !canBet(s, x.bets, adds)) return null;
      for (const k in adds) x.bets[k] = (x.bets[k] || 0) + adds[k];
      x.adds = adds; x.ready = true;
      maybeRoll(s, now, env.rng);
      if (s.phase === 'bet' && !s.until) { s.until = now + T.bets; s.wait = s.until; }
      break;
    }
    default: return null;
  }
  s.v++; s.now = now;
  return s;
}
function maybeRoll(s, now, rng) {
  const ps = pilots(s);
  if (!ps.length || ps.every((x) => x.ready)) throwDice(s, now, rng);
}
function passDice(s) {
  const o = order(s);
  if (!o.length) { s.shooter = null; return; }
  const i = o.findIndex((x) => x.id === s.shooter);
  s.shooter = o[(i + 1) % o.length].id;
}

export function tick(state, env) {
  const now = env.now;
  if (state.wait == null || now < state.wait) return null;
  const s = clone(state);
  s.now = now;
  if (s.phase === 'bet') { s.until = null; s.wait = null; throwDice(s, now, env.rng); }
  else if (s.phase === 'roll') {
    const [d1, d2] = s.roll.dice, t = d1 + d2;
    s.dice = [d1, d2]; s.rolls++;
    for (const x of s.seats) {
      if (x.left) continue;
      const r = resolve(x.bets, s.point, d1, d2);
      x.bets = r.bets;
      x.result = { round: s.round, pay: r.pay, wins: r.wins, lost: r.lost, moved: r.moved, staked: sum(x.adds || {}) };
    }
    const was = s.point, np = nextPoint(was, t);
    const name = { 2: 'ACES', 3: 'ACE-DEUCE', 4: 'FOUR', 5: 'FIVE', 6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN', 11: 'YO-LEVEN', 12: 'BOXCARS' }[t];
    const he = [4, 6, 8, 10].includes(t) ? (d1 === d2 ? ' THE HARD WAY' : ' EASY') : '';
    let msg = name + he;
    if (was == null) msg = t === 7 || t === 11 ? name + ' · FRONT LINE WINNER' : t === 2 || t === 3 || t === 12 ? name + ' · CRAPS' : name + ' · THE POINT IS ' + t;
    else if (t === was) msg = name + he + ' · WINNER!';
    else if (t === 7) msg = 'SEVEN OUT';
    s.point = np;
    if (was != null && t === 7) passDice(s);          // seven out: the dice move on
    s.hist = [{ d: [d1, d2], t, by: s.roll.by }, ...s.hist].slice(0, 12);
    s.phase = 'result'; s.msg = msg; s.wait = now + T.result;
  } else if (s.phase === 'result') { s.round++; openWindow(s, now, env.rng); }
  s.v++;
  return s;
}

export function view(s) {
  const v = { ...s, ifc: {} };
  for (const x of s.seats) if (x.kind === 'pilot') v.ifc[x.id] = ifClosed(s, x.id);
  return v;
}
/** Walking away takes your chips down: everything on the table comes back (and a roll in the air pays as it lands). */
export function ifClosed(s, id) {
  const x = s.seats.find((y) => y.id === id);
  if (!x || x.left) return 0;
  if (s.phase === 'roll') { const r = resolve(x.bets, s.point, s.roll.dice[0], s.roll.dice[1]); return r.pay + sum(r.bets); }
  const unpaid = s.phase === 'result' && x.result && x.result.round === s.round ? x.result.pay : 0;
  return unpaid + sum(x.bets);
}
export function adopt(v, env) { const s = clone(v); delete s.ifc; s.wait = Math.max(env.now + 400, s.wait || 0); return s; }
