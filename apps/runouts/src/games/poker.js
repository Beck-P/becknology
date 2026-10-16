// No-limit Texas hold'em at the Neon Royale: up to six seats, a moving button, blinds, four betting streets, side
// pots and a showdown. Chips at the table are a buy-in (the pilot's coins staked when they sit down, paid back when
// they stand up); the regulars play with the house's money and their own personalities (games/pokerAi.js).
import { makeShoe, bestHand, compareScores } from '../core/cards.js';
import { clone } from '../core/rng.js';
import { decide } from './pokerAi.js';

const T = { dealCard: 170, afterDeal: 700, npcMin: 900, npcMax: 2200, street: 950, show: 5200, end: 2600, next: 1400, turn: 30000 };
export const STREETS = ['pre', 'flop', 'turn', 'river'];

export function create({ seats, blinds, now = Date.now(), rng }) {
  const s = {
    game: 'poker', v: 1, hand: 0, phase: 'idle', wait: now + 900, until: null, now,
    blinds: { sb: blinds.sb, bb: blinds.bb }, buy: { min: blinds.buyMin, max: blinds.buyMax, def: blinds.buy },
    seats: seats.map(seat), btn: -1, deck: [], board: [], street: 'pre', toAct: null, curBet: 0, minRaise: blinds.bb,
    pot: 0, pots: [], winners: [], msg: 'WAITING FOR THE NEXT HAND', log: [], lastAggr: null, dealtAt: 0,
  };
  void rng;
  return s;
}
function seat(x) {
  return { id: x.id, name: x.name, kind: x.kind || 'pilot', npc: x.npc || null, pos: x.pos ?? 0, stack: x.stack || 0,
    hole: [], inHand: false, folded: false, allin: false, bet: 0, put: 0, acted: false, shown: false, last: '', left: false,
    won: 0, buyins: x.stack || 0, rebuys: 0, best: null };
}
const live = (s) => s.seats.filter((x) => x.inHand && !x.folded);
const canAct = (x) => x.inHand && !x.folded && !x.allin;
const bySeat = (s) => s.seats.slice().sort((a, b) => a.pos - b.pos);
const potTotal = (s) => s.pot + s.seats.reduce((a, x) => a + x.bet, 0);

/** The next seat after pos (round the table) matching f. */
function after(s, pos, f) {
  const o = bySeat(s);
  if (!o.length) return null;
  let i = o.findIndex((x) => x.pos > pos);
  if (i < 0) i = 0;
  for (let k = 0; k < o.length; k++) { const x = o[(i + k) % o.length]; if (f(x)) return x; }
  return null;
}

function startHand(s, now, rng) {
  const ready = s.seats.filter((x) => !x.left && x.stack > 0);
  if (ready.length < 2) { s.phase = 'idle'; s.wait = null; s.msg = s.seats.some((x) => x.kind === 'pilot' && !x.left) ? 'WAITING FOR PLAYERS' : ''; return; }
  s.hand++;
  s.deck = makeShoe(rng, 1); s.board = []; s.street = 'pre'; s.pot = 0; s.pots = []; s.winners = []; s.log = []; s.lastAggr = null;
  for (const x of s.seats) {
    Object.assign(x, { hole: [], inHand: !x.left && x.stack > 0, folded: false, allin: false, bet: 0, put: 0, acted: false, shown: false, last: '', best: null });
  }
  const btn = after(s, s.btn, (x) => x.inHand);
  s.btn = btn.pos;
  const n = s.seats.filter((x) => x.inHand).length;
  const sb = n === 2 ? btn : after(s, btn.pos, (x) => x.inHand);
  const bb = after(s, sb.pos, (x) => x.inHand);
  post(s, sb, s.blinds.sb, 'SMALL BLIND'); post(s, bb, s.blinds.bb, 'BIG BLIND');
  s.curBet = s.blinds.bb; s.minRaise = s.blinds.bb;
  // two cards each, one at a time round from the small blind
  const order = [];
  let p = sb;
  for (let i = 0; i < n; i++) { order.push(p); p = after(s, p.pos, (x) => x.inHand); }
  for (let r = 0; r < 2; r++) for (const x of order) x.hole.push(s.deck.pop());
  s.phase = 'deal'; s.dealtAt = now; s.msg = '';
  s.wait = now + T.dealCard * n * 2 + T.afterDeal;
  s.sbId = sb.id; s.bbId = bb.id;
  s.toAct = null;
}
function post(s, x, amt, label) {
  const a = Math.min(x.stack, amt);
  x.stack -= a; x.bet += a; x.put += a; x.last = label;
  if (!x.stack) x.allin = true;
}

function firstToAct(s) {
  if (s.street === 'pre') {
    const bb = s.seats.find((x) => x.id === s.bbId);
    return after(s, bb ? bb.pos : s.btn, canAct);
  }
  return after(s, s.btn, canAct);
}
function setTurn(s, x, now) {
  s.toAct = x ? x.id : null;
  if (!x) return;
  const pilots = s.seats.filter((y) => y.kind === 'pilot' && !y.left).length;
  s.until = x.kind === 'pilot' && pilots > 1 ? now + T.turn : null;
  s.wait = x.kind === 'npc' ? now + T.npcMin + Math.floor(Math.random() * (T.npcMax - T.npcMin)) : s.until;
}

function beginBetting(s, now) {
  s.phase = 'bet';
  const actors = live(s).filter((x) => !x.allin);
  if (live(s).length < 2) return endHand(s, now);
  if (actors.length < 2 && live(s).every((x) => x.allin || x.bet >= s.curBet)) return closeStreet(s, now);
  setTurn(s, firstToAct(s), now);
}

/** Legal moves for the seat to act: what calling costs, the least and most a raise can make the bet. */
export function options(s, id) {
  const x = s.seats.find((y) => y.id === id);
  if (!x || s.phase !== 'bet' || s.toAct !== id) return null;
  const toCall = Math.min(x.stack, s.curBet - x.bet);
  const maxTo = x.bet + x.stack;
  const minTo = Math.min(maxTo, s.curBet + Math.max(s.minRaise, s.blinds.bb));
  const raiseOk = x.stack > toCall;
  return { toCall, canCheck: toCall === 0, canRaise: raiseOk, minTo, maxTo, pot: potTotal(s), curBet: s.curBet, bet: x.bet, stack: x.stack };
}

function apply(s, x, a, now) {
  const o = options(s, x.id);
  if (!o) return false;
  if (a.t === 'fold') { x.folded = true; x.last = 'FOLD'; }
  else if (a.t === 'check') { if (!o.canCheck) return false; x.last = 'CHECK'; }
  else if (a.t === 'call') {
    if (o.canCheck) { x.last = 'CHECK'; }
    else { const c = o.toCall; x.stack -= c; x.bet += c; x.put += c; x.last = x.stack ? 'CALL ' + c : 'ALL IN'; if (!x.stack) x.allin = true; }
  } else if (a.t === 'raise') {
    if (!o.canRaise) return false;
    let to = Math.floor(a.to);
    if (!(to >= o.minTo || to === o.maxTo)) to = o.minTo;
    to = Math.min(to, o.maxTo);
    const add = to - x.bet, raise = to - s.curBet;
    x.stack -= add; x.bet = to; x.put += add;
    if (raise >= s.minRaise) s.minRaise = raise;
    const was = s.curBet;
    s.curBet = Math.max(s.curBet, to);
    x.last = !x.stack ? 'ALL IN' : was === 0 ? 'BET ' + to : 'RAISE TO ' + to;
    if (!x.stack) x.allin = true;
    // a full raise reopens the betting for everyone else
    if (to > was) for (const y of s.seats) if (y !== x && canAct(y)) y.acted = false;
    s.lastAggr = x.id;
  } else return false;
  x.acted = true;
  s.log = [{ id: x.id, name: x.name, a: x.last }, ...s.log].slice(0, 12);
  advance(s, x, now);
  return true;
}

function advance(s, x, now) {
  if (live(s).length < 2) return endHand(s, now);
  const done = live(s).every((y) => y.allin || (y.acted && y.bet === s.curBet));
  if (done) return closeStreet(s, now);
  setTurn(s, after(s, x.pos, (y) => canAct(y) && !(y.acted && y.bet === s.curBet)), now);
}

function closeStreet(s, now) {
  for (const x of s.seats) { s.pot += x.bet; x.bet = 0; x.acted = false; }
  s.curBet = 0; s.minRaise = s.blinds.bb; s.toAct = null; s.until = null;
  if (s.street === 'river') return showdown(s, now);
  s.phase = 'street'; s.wait = now + T.street;
}
function nextStreet(s, now) {
  const i = STREETS.indexOf(s.street);
  s.street = STREETS[i + 1];
  s.deck.pop();                                             // burn one
  const n = s.street === 'flop' ? 3 : 1;
  for (let k = 0; k < n; k++) s.board.push(s.deck.pop());
  for (const x of s.seats) if (x.inHand && !x.folded && x.last !== 'ALL IN') x.last = '';
  const actors = live(s).filter((x) => !x.allin);
  if (actors.length < 2) {                                  // everyone's all in: run it out
    for (const x of live(s)) x.shown = true;
    if (s.street === 'river') return showdown(s, now, true);
    s.phase = 'street'; s.wait = now + T.street + 500; return;
  }
  s.phase = 'bet';
  setTurn(s, firstToAct(s), now + 450);
}

/** Main pot and side pots from what everyone put in: [{ amt, elig: [ids] }]. */
export function buildPots(seats) {
  const rest = new Map(seats.filter((x) => x.put > 0).map((x) => [x.id, x.put]));
  const folded = new Set(seats.filter((x) => x.folded || !x.inHand).map((x) => x.id));
  const pots = [];
  while ([...rest.values()].some((v) => v > 0)) {
    const m = Math.min(...[...rest.values()].filter((v) => v > 0));
    let amt = 0; const elig = [];
    for (const [id, v] of rest) { if (v <= 0) continue; amt += Math.min(m, v); rest.set(id, v - Math.min(m, v)); if (!folded.has(id)) elig.push(id); }
    const last = pots[pots.length - 1];
    if (!elig.length && last) last.amt += amt;
    else if (last && last.elig.length === elig.length && last.elig.every((id) => elig.includes(id))) last.amt += amt;
    else pots.push({ amt, elig });
  }
  return pots;
}

function showdown(s, now, ranOut) {
  s.phase = 'show'; s.toAct = null; s.until = null;
  for (const x of s.seats) { s.pot += x.bet; x.bet = 0; }
  const contenders = live(s);
  for (const x of contenders) { x.best = bestHand(x.hole, s.board); x.shown = true; }
  const pots = buildPots(s.seats);
  s.pots = pots;
  const won = {};
  const wins = [];
  pots.forEach((p, i) => {
    const elig = contenders.filter((x) => p.elig.includes(x.id));
    if (!elig.length) return;
    let best = [elig[0]];
    for (const x of elig.slice(1)) {
      const c = compareScores(x.best.score, best[0].best.score);
      if (c > 0) best = [x]; else if (c === 0) best.push(x);
    }
    const share = Math.floor(p.amt / best.length);
    let odd = p.amt - share * best.length;
    const ordered = best.slice().sort((a, b) => ((a.pos - s.btn + 6) % 6 || 6) - ((b.pos - s.btn + 6) % 6 || 6));
    for (const x of ordered) { const a = share + (odd-- > 0 ? 1 : 0); won[x.id] = (won[x.id] || 0) + a; }
    wins.push({ pot: i, amt: p.amt, ids: best.map((x) => x.id), label: best[0].best.label, cards: best[0].best.cards.map((c) => c.id), side: i > 0 });
  });
  for (const x of s.seats) if (won[x.id]) { x.stack += won[x.id]; x.won = won[x.id]; } else x.won = 0;
  s.winners = wins;
  s.pot = 0;
  const top = wins[0];
  s.msg = top ? (top.ids.length > 1 ? 'SPLIT POT · ' + top.label.toUpperCase() : nameOf(s, top.ids[0]).toUpperCase() + ' WINS · ' + top.label.toUpperCase()) : '';
  s.wait = now + T.show + (ranOut ? 600 : 0);
}
function endHand(s, now) {
  for (const x of s.seats) { s.pot += x.bet; x.bet = 0; }
  const w = live(s)[0];
  const amt = s.pot;
  if (w) { w.stack += amt; w.won = amt; }
  for (const x of s.seats) if (x !== w) x.won = 0;
  s.winners = w ? [{ pot: 0, amt, ids: [w.id], label: '', cards: [], side: false }] : [];
  s.pots = [{ amt, elig: w ? [w.id] : [] }];
  s.pot = 0; s.phase = 'end'; s.toAct = null; s.until = null;
  s.msg = w ? w.name.toUpperCase() + ' TAKES IT' : '';
  s.wait = now + T.end;
}
const nameOf = (s, id) => (s.seats.find((x) => x.id === id) || { name: '?' }).name;

function between(s, now, rng) {
  // the regulars top up when they're short, and anyone who left goes
  for (const x of s.seats) {
    if (x.kind === 'npc' && x.stack < s.blinds.bb * 10) { x.stack = s.buy.def + Math.floor(rng() * s.buy.def * 0.5); x.rebuys++; x.last = 'REBUYS'; }
  }
  s.seats = s.seats.filter((x) => !x.left);
  s.phase = 'next'; s.wait = now + T.next;
}

// ---- moves ------------------------------------------------------------------------------------------------------------
export function act(state, a, env) {
  const s = clone(state), now = env.now, x = s.seats.find((y) => y.id === a.seat);
  switch (a.t) {
    case 'join': {
      const have = s.seats.find((y) => y.id === a.who.id);
      if (have) { have.left = false; have.stack += a.who.stack || 0; break; }
      const used = s.seats.map((y) => y.pos);
      let pos = [0, 3, 2, 4, 1, 5].find((p) => !used.includes(p));
      if (pos == null) {
        const npc = s.seats.find((y) => y.kind === 'npc' && !y.inHand) || s.seats.find((y) => y.kind === 'npc');
        if (!npc) return null;
        npc.left = true; if (!npc.inHand) s.seats = s.seats.filter((y) => y !== npc);
        pos = npc.pos;
        if (s.seats.some((y) => y.pos === pos)) pos = 6 + s.seats.length;
      }
      s.seats.push(seat({ ...a.who, pos }));
      if (s.phase === 'idle') { s.wait = now + 600; }
      break;
    }
    case 'rebuy': {
      if (!x || x.kind !== 'pilot' || x.inHand) return null;
      const add = Math.floor(a.amount);
      if (!(add > 0) || x.stack + add > s.buy.max) return null;
      x.stack += add; x.buyins += add; x.rebuys++;
      if (s.phase === 'idle') s.wait = now + 600;
      break;
    }
    case 'leave': {
      if (!x) return null;
      if (x.inHand && !x.folded && s.phase === 'bet') {
        if (s.toAct === x.id) apply(s, x, { t: 'fold' }, now);
        else { x.folded = true; x.last = 'FOLD'; if (live(s).length < 2) endHand(s, now); }
      } else if (x.inHand && !x.folded) { x.folded = true; if (live(s).length < 2 && (s.phase === 'deal' || s.phase === 'street')) endHand(s, now); }
      x.left = true; x.stack = 0;
      if (!x.inHand || s.phase === 'idle' || s.phase === 'next') s.seats = s.seats.filter((y) => y !== x);
      if (s.phase === 'idle') s.wait = now + 600;
      break;
    }
    case 'fold': case 'check': case 'call': case 'raise': {
      if (!x || x.kind !== 'pilot' || s.toAct !== x.id) return null;
      if (!apply(s, x, a, now)) return null;
      break;
    }
    default: return null;
  }
  s.v++; s.now = now;
  return s;
}

export function tick(state, env) {
  const now = env.now;
  if (state.wait == null || now < state.wait) return null;
  const s = clone(state);
  s.now = now;
  s.wait = null;
  if (s.phase === 'idle' || s.phase === 'next') startHand(s, now, env.rng);
  else if (s.phase === 'deal') beginBetting(s, now);
  else if (s.phase === 'bet') {
    const x = s.seats.find((y) => y.id === s.toAct);
    if (!x) advance(s, s.seats[0], now);
    else if (x.kind === 'npc') apply(s, x, decide(s, x, env.rng), now);
    else apply(s, x, options(s, x.id).canCheck ? { t: 'check' } : { t: 'fold' }, now);   // out of time
  } else if (s.phase === 'street') nextStreet(s, now);
  else if (s.phase === 'show' || s.phase === 'end') between(s, now, env.rng);
  s.v++;
  return s;
}

// ---- what a seat may see ----------------------------------------------------------------------------------------------
export function view(s, id) {
  const v = { ...s, deck: undefined, seats: s.seats.map((x) => (x.id === id || x.shown ? x : { ...x, hole: x.hole.map((c) => ({ id: c.id })), best: null })) };
  v.ifc = {};
  for (const x of s.seats) if (x.kind === 'pilot') v.ifc[x.id] = ifClosed(s, x.id);
  return v;
}
/** Walking away folds your hand: the chips behind you come back, what's in the pot stays. */
export function ifClosed(s, id) { const x = s.seats.find((y) => y.id === id); return x && !x.left ? x.stack : 0; }
export function adopt(v, env) {
  const s = clone(v);
  delete s.ifc;
  // the old host's game is gone mid-hand: call the hand off and give everyone back what they put in it
  if (['deal', 'bet', 'street'].includes(s.phase)) {
    for (const x of s.seats) { x.stack += x.put; x.bet = 0; x.put = 0; x.inHand = false; x.hole = []; }
    s.pot = 0; s.board = []; s.toAct = null; s.msg = 'HAND CALLED OFF';
  }
  s.phase = 'next'; s.wait = env.now + 1500; s.deck = [];
  return s;
}
