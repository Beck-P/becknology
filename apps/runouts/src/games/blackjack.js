// Blackjack at the Neon Royale: six decks, the dealer stands on soft 17, blackjack pays 3 to 2, double on any two
// cards (after a split too), split up to four hands (aces once, one card each), insurance 2 to 1 when the dealer
// shows an ace, and the dealer peeks for blackjack under an ace or a ten.
//
// A pure engine (no DOM): create → act (a player's move) / tick (the house's clock) → view (what a seat may see).
// Every payout is what comes back to the player: the stake included (a win on 10 pays 20; a push 10).
import { makeShoe } from '../core/cards.js';
import { clone } from '../core/rng.js';

export const RULES = { decks: 6, cut: 0.25, bjPays: 1.5, maxHands: 4 };
const T = { deal: 380, npc: 850, dealer: 650, settle: 3600, insurance: 9000, turn: 25000, bets: 12000, npcBet: 0 };

export const value = (c) => (c.r === 14 ? 11 : Math.min(c.r, 10));
export function total(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { if (c.r == null) continue; t += value(c); if (c.r === 14) aces++; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return { t, soft: aces > 0 };
}
export const isBJ = (cards) => cards.length === 2 && total(cards).t === 21;

/** Basic strategy (6 decks, S17, double after split): 'hit' | 'stand' | 'double' | 'split'. */
export function basic(hand, up, opts = {}) {
  const cards = hand.cards, d = value(up) === 11 ? 11 : value(up);
  const canDouble = opts.canDouble !== false && cards.length === 2;
  const canSplit = opts.canSplit !== false && cards.length === 2 && value(cards[0]) === value(cards[1]);
  if (canSplit) {
    const v = value(cards[0]);
    if (v === 11 || v === 8) return 'split';
    if ((v === 2 || v === 3 || v === 7) && d <= 7) return 'split';
    if (v === 4 && (d === 5 || d === 6)) return 'split';
    if (v === 6 && d <= 6) return 'split';
    if (v === 9 && d <= 9 && d !== 7) return 'split';
  }
  const { t, soft } = total(cards);
  if (soft && t <= 21) {
    if (t >= 19) return 'stand';
    if (t === 18) { if (d >= 3 && d <= 6) return canDouble ? 'double' : 'stand'; return d >= 9 ? 'hit' : 'stand'; }
    if (t === 17) return canDouble && d >= 3 && d <= 6 ? 'double' : 'hit';
    if (t >= 15) return canDouble && d >= 4 && d <= 6 ? 'double' : 'hit';
    return canDouble && d >= 5 && d <= 6 ? 'double' : 'hit';
  }
  if (t >= 17) return 'stand';
  if (t >= 13) return d <= 6 ? 'stand' : 'hit';
  if (t === 12) return d >= 4 && d <= 6 ? 'stand' : 'hit';
  if (t === 11) return canDouble && d <= 10 ? 'double' : 'hit';
  if (t === 10) return canDouble && d <= 9 ? 'double' : 'hit';
  if (t === 9) return canDouble && d >= 3 && d <= 6 ? 'double' : 'hit';
  return 'hit';
}

// ---- the table -------------------------------------------------------------------------------------------------------
/**
 * seats: [{ id, name, kind: 'pilot' | 'npc', npc?, pos }] (pos 0..4, the dealer's left to right)
 */
export function create({ seats, limits, now = Date.now(), rng }) {
  const s = {
    game: 'blackjack', v: 1, round: 1, phase: 'bet', wait: null, until: null, now,
    limits: { min: limits.min, max: limits.max },
    shoe: makeShoe(rng, RULES.decks), dealt: 0, dealer: { cards: [] }, turn: null, queue: [], msg: 'PLACE YOUR BETS',
    seats: seats.map((x) => seat(x)), shuffled: true, hist: [],
  };
  openRound(s, now, rng);
  return s;
}
function seat(x) {
  return { id: x.id, name: x.name, kind: x.kind || 'pilot', npc: x.npc || null, pos: x.pos ?? 2, bet: 0, ready: false, ins: null, hands: [], result: null, left: false };
}
const pilots = (s) => s.seats.filter((x) => x.kind === 'pilot' && !x.left);
const inRound = (x) => x.bet > 0 && !x.left;

function openRound(s, now, rng) {
  s.phase = 'bet'; s.turn = null; s.queue = []; s.dealer = { cards: [] }; s.msg = 'PLACE YOUR BETS';
  s.until = null; s.wait = null;
  for (const x of s.seats) { x.bet = 0; x.ready = false; x.ins = null; x.hands = []; }
  // the regulars put theirs down as the round opens
  for (const x of s.seats) if (x.kind === 'npc' && !x.left) x.bet = npcBet(s, rng);
  if (s.shoe.length < RULES.decks * 52 * RULES.cut) { s.shoe = makeShoe(rng, RULES.decks); s.shuffled = true; s.msg = 'FRESH SHOE · PLACE YOUR BETS'; }
}
function npcBet(s, rng) {
  const m = s.limits.min, steps = [1, 1, 2, 2, 3, 5];
  return Math.min(s.limits.max, m * steps[Math.floor(rng() * steps.length)]);
}

function draw(s) { s.dealt++; return { ...s.shoe.pop(), up: true }; }

function startDeal(s, now) {
  const players = s.seats.filter(inRound).sort((a, b) => a.pos - b.pos);
  for (const x of players) x.hands = [{ cards: [], bet: x.bet, doubled: false, done: false, split: false, aces: false, out: null }];
  s.queue = [];
  for (const x of players) s.queue.push({ seat: x.id });
  s.queue.push({ dealer: true, up: true });
  for (const x of players) s.queue.push({ seat: x.id });
  s.queue.push({ dealer: true, up: false });
  s.phase = 'deal'; s.until = null; s.wait = now + 500; s.msg = ''; s.shuffled = false;
}

function dealOne(s) {
  const q = s.queue.shift();
  if (!q) return;
  const c = draw(s);
  if (q.dealer) { c.up = q.up; s.dealer.cards.push(c); return; }
  const x = s.seats.find((y) => y.id === q.seat);
  if (x && x.hands[0]) x.hands[0].cards.push(c);
}

const up = (s) => s.dealer.cards[0];
function dealerBJ(s) { return isBJ(s.dealer.cards); }

function afterDeal(s, now) {
  const u = up(s);
  if (u && u.r === 14 && pilots(s).some(inRound)) {
    s.phase = 'insurance'; s.msg = 'INSURANCE?';
    for (const x of s.seats) if (inRound(x)) x.ins = x.kind === 'npc' ? 0 : null;
    s.until = now + T.insurance; s.wait = s.until;
    return;
  }
  peek(s, now);
}
function peek(s, now) {
  const u = up(s);
  if (u && value(u) >= 10 && dealerBJ(s)) {
    s.dealer.cards[1].up = true; s.msg = 'DEALER BLACKJACK';
    for (const x of s.seats) for (const h of x.hands) h.done = true;
    settle(s, now);
    return;
  }
  if (u && value(u) >= 10) s.msg = u.r === 14 ? 'NO BLACKJACK' : '';
  s.phase = 'play'; s.turn = null;
  next(s, now);
}

// move the turn on to the next hand that still has to act
function next(s, now) {
  const order = s.seats.filter(inRound).sort((a, b) => a.pos - b.pos);
  let started = !s.turn;
  for (const x of order) {
    for (let h = 0; h < x.hands.length; h++) {
      if (!started) { if (s.turn.s === x.id && s.turn.h === h) started = true; continue; }
      const hand = x.hands[h];
      if (hand.done) continue;
      if (hand.cards.length < 2) hand.cards.push(draw(s));        // a split hand gets its second card as it comes up
      const tt = total(hand.cards).t;
      if (isBJ(hand.cards) && !hand.split) { hand.done = true; continue; }
      if (tt >= 21 || (hand.aces && hand.cards.length >= 2)) { hand.done = true; continue; }
      s.turn = { s: x.id, h };
      s.until = x.kind === 'pilot' && pilots(s).length > 1 ? now + T.turn : null;
      s.wait = x.kind === 'npc' ? now + T.npc : s.until;
      return;
    }
  }
  s.turn = null;
  dealerTurn(s, now);
}

function dealerTurn(s, now) {
  s.phase = 'dealer'; s.until = null; s.wait = now + T.dealer;
}
function dealerStep(s, now) {
  const hole = s.dealer.cards[1];
  if (hole && !hole.up) { hole.up = true; s.wait = now + T.dealer; return; }
  const live = s.seats.some((x) => inRound(x) && x.hands.some((h) => total(h.cards).t <= 21 && !(isBJ(h.cards) && !h.split)));
  const { t, soft } = total(s.dealer.cards);
  if (live && (t < 17)) { s.dealer.cards.push(draw(s)); s.wait = now + T.dealer; return; }
  void soft;                                                       // S17: soft 17 stands like any 17
  settle(s, now);
}

/** What a hand pays back against the dealer's cards. */
export function handPay(hand, dealerCards) {
  const p = total(hand.cards).t, d = total(dealerCards).t, dBJ = isBJ(dealerCards), pBJ = isBJ(hand.cards) && !hand.split;
  if (p > 21) return { out: 'bust', pay: 0 };
  if (pBJ && !dBJ) return { out: 'bj', pay: hand.bet + Math.floor(hand.bet * RULES.bjPays) };
  if (dBJ) return pBJ ? { out: 'push', pay: hand.bet } : { out: 'lose', pay: 0 };
  if (d > 21 || p > d) return { out: 'win', pay: hand.bet * 2 };
  if (p === d) return { out: 'push', pay: hand.bet };
  return { out: 'lose', pay: 0 };
}

function settle(s, now) {
  const dBJ = dealerBJ(s);
  for (const x of s.seats) {
    if (!inRound(x)) { x.result = null; continue; }
    let pay = 0, staked = 0;
    for (const h of x.hands) { const r = handPay(h, s.dealer.cards); h.out = r.out; pay += r.pay; staked += h.bet; }
    const insPay = x.ins > 0 && dBJ ? x.ins * 3 : 0;
    staked += x.ins > 0 ? x.ins : 0;
    pay += insPay;
    x.result = { round: s.round, pay, staked, net: pay - staked, ins: x.ins > 0 ? (dBJ ? 'won' : 'lost') : null };
  }
  const d = total(s.dealer.cards).t;
  s.msg = dBJ ? 'DEALER BLACKJACK' : d > 21 ? 'DEALER BUSTS' : 'DEALER HAS ' + d;
  s.hist = [{ round: s.round, d: dBJ ? 'BJ' : d > 21 ? 'BUST' : d }, ...s.hist].slice(0, 8);
  s.phase = 'settle'; s.turn = null; s.until = null; s.wait = now + T.settle;
}

// ---- moves -------------------------------------------------------------------------------------------------------------
export function act(state, a, env) {
  const s = clone(state), now = env.now;
  const x = s.seats.find((y) => y.id === a.seat);
  switch (a.t) {
    case 'join': {
      if (s.seats.some((y) => y.id === a.who.id)) { const y = s.seats.find((z) => z.id === a.who.id); y.left = false; break; }
      const used = s.seats.map((y) => y.pos), free = [3, 1, 2, 0, 4].find((p) => !used.includes(p));
      if (free == null) { const npc = s.seats.findIndex((y) => y.kind === 'npc' && !inRound(y)); if (npc < 0) return null; a.who.pos = s.seats[npc].pos; s.seats.splice(npc, 1); }
      s.seats.push(seat({ ...a.who, pos: a.who.pos ?? free }));
      break;
    }
    case 'leave': {
      if (!x) return null;
      x.left = true;
      for (const h of x.hands) h.done = true;
      if (s.phase === 'bet') { x.bet = 0; x.ready = false; s.seats = s.seats.filter((y) => y !== x); maybeDeal(s, now); }
      else if (s.turn && s.turn.s === x.id) next(s, now);
      break;
    }
    case 'bet': {                                    // a confirmed (staked) bet; solo tables deal at once
      if (s.phase !== 'bet' || !x || x.kind !== 'pilot') return null;
      const amt = Math.floor(a.amount);
      if (!(amt >= s.limits.min && amt <= s.limits.max)) return null;
      x.bet = amt; x.ready = true;
      maybeDeal(s, now);
      if (s.phase === 'bet' && !s.until) { s.until = now + T.bets; s.wait = s.until; s.msg = 'BETS CLOSE SOON'; }
      break;
    }
    case 'ins': {
      if (s.phase !== 'insurance' || !x || !inRound(x) || x.ins != null) return null;
      x.ins = a.take ? Math.floor(x.bet / 2) : 0;
      if (s.seats.filter(inRound).every((y) => y.ins != null)) { s.until = null; peek(s, now); }
      break;
    }
    case 'hit': case 'stand': case 'double': case 'split': {
      if (s.phase !== 'play' || !s.turn || !x || s.turn.s !== x.id) return null;
      if (!move(s, x, a.t, now)) return null;
      break;
    }
    default: return null;
  }
  s.v++; s.now = now;
  return s;
}

/** Everyone who's in has bet: deal (a solo table on the bet itself). */
function maybeDeal(s, now) {
  const ps = pilots(s);
  if (!ps.some((x) => x.ready)) return;
  if (ps.every((x) => x.ready)) startDeal(s, now);
}

export function legal(s, x) {
  if (!s.turn || s.turn.s !== x.id) return {};
  const h = x.hands[s.turn.h];
  if (!h) return {};
  const two = h.cards.length === 2;
  return {
    hit: true, stand: true,
    double: two && !h.aces,
    split: two && value(h.cards[0]) === value(h.cards[1]) && x.hands.length < RULES.maxHands && !(h.aces && h.split),
  };
}

function move(s, x, m, now) {
  const h = x.hands[s.turn.h], L = legal(s, x);
  if (!h || !L[m]) return false;
  if (m === 'hit') {
    h.cards.push(draw(s));
    const t = total(h.cards).t;
    if (t >= 21) { h.done = true; next(s, now); } else if (s.until) { s.until = now + T.turn; s.wait = s.until; }
  } else if (m === 'stand') { h.done = true; next(s, now); }
  else if (m === 'double') { h.bet *= 2; h.doubled = true; h.cards.push(draw(s)); h.done = true; next(s, now); }
  else if (m === 'split') {
    const aces = h.cards[0].r === 14;
    const nh = { cards: [h.cards.pop()], bet: h.bet, doubled: false, done: false, split: true, aces, out: null };
    h.split = true; h.aces = aces;
    h.cards.push(draw(s));
    x.hands.splice(s.turn.h + 1, 0, nh);
    if (aces) { h.done = true; nh.cards.push(draw(s)); nh.done = true; next(s, now); }
    else if (total(h.cards).t === 21) { h.done = true; next(s, now); }
  }
  return true;
}

// ---- the house's clock ----------------------------------------------------------------------------------------------
export function tick(state, env) {
  const now = env.now;
  if (state.wait == null || now < state.wait) return null;
  const s = clone(state);
  s.now = now;
  if (s.phase === 'bet') {
    s.until = null; s.wait = null;
    if (pilots(s).some((x) => x.ready)) startDeal(s, now);
    else s.msg = 'PLACE YOUR BETS';
  } else if (s.phase === 'deal') {
    dealOne(s);
    if (s.queue.length) s.wait = now + T.deal; else afterDeal(s, now);
  } else if (s.phase === 'insurance') {
    for (const x of s.seats) if (inRound(x) && x.ins == null) x.ins = 0;
    s.until = null; peek(s, now);
  } else if (s.phase === 'play') {
    const x = s.turn && s.seats.find((y) => y.id === s.turn.s);
    if (!x) { s.turn = null; dealerTurn(s, now); }
    else if (x.kind === 'npc') {
      const h = x.hands[s.turn.h], L = legal(s, x);
      let m = basic(h, up(s), { canDouble: L.double, canSplit: L.split });
      if (!L[m]) m = m === 'double' ? 'hit' : 'stand';
      move(s, x, m, now);
    } else move(s, x, 'stand', now);                  // out of time: stands
  } else if (s.phase === 'dealer') dealerStep(s, now);
  else if (s.phase === 'settle') { s.round++; openRound(s, now, env.rng); }
  s.v++;
  return s;
}

// ---- what a seat may see, and what it's owed if it walks away ---------------------------------------------------------
export function view(s, seatId) {
  const v = { ...s, shoe: undefined, shoeLeft: s.shoe.length, dealer: { cards: s.dealer.cards.map((c) => (c.up ? c : { id: c.id, up: false })) } };
  v.ifc = {};
  for (const x of s.seats) if (x.kind === 'pilot') v.ifc[x.id] = ifClosed(s, x.id);
  void seatId;
  return v;
}

/** If this seat walks away now: before the cards, the bet comes back; mid-hand, its hands stand and the round plays out. */
export function ifClosed(state, seatId) {
  const x = state.seats.find((y) => y.id === seatId);
  if (!x || !inRound(x)) return 0;
  if (state.phase === 'bet') return x.ready ? x.bet : 0;
  if (state.phase === 'settle') return x.result && x.result.round === state.round ? x.result.pay : 0;
  if (!state.shoe) return x.bet + (x.ins > 0 ? x.ins : 0);   // a view: can't see the shoe, give the stake back
  // play the rest out: this seat stands on everything, the others play as they would
  const s = clone(state);
  const me = s.seats.find((y) => y.id === seatId);
  for (const h of me.hands) h.done = true;
  if (me.ins == null) me.ins = 0;
  let guard = 0;
  while (s.phase !== 'settle' && guard++ < 400) {
    if (s.phase === 'bet') return x.bet;
    if (s.phase === 'deal') { dealOne(s); if (!s.queue.length) afterDeal(s, 0); if (me.hands[0]) for (const h of me.hands) h.done = true; continue; }
    if (s.phase === 'insurance') { for (const y of s.seats) if (inRound(y) && y.ins == null) y.ins = 0; peek(s, 0); continue; }
    if (s.phase === 'play') {
      const y = s.turn && s.seats.find((z) => z.id === s.turn.s);
      if (!y) { s.turn = null; dealerTurn(s, 0); continue; }
      const h = y.hands[s.turn.h], L = legal(s, y);
      let m = y.kind === 'npc' ? basic(h, up(s), { canDouble: L.double, canSplit: L.split }) : 'stand';
      if (!L[m]) m = 'stand';
      move(s, y, m, 0);
      continue;
    }
    if (s.phase === 'dealer') { dealerStep(s, 0); continue; }
  }
  const r = s.seats.find((y) => y.id === seatId).result;
  return r ? r.pay : x.bet;
}

/** Taking over a table from a view (the host left): fresh cards for what couldn't be seen. */
export function adopt(v, env) {
  const s = clone(v);
  s.shoe = makeShoe(env.rng, RULES.decks);
  s.dealer.cards = s.dealer.cards.map((c) => (c.r == null ? { ...s.shoe.pop(), up: false } : c));
  delete s.shoeLeft; delete s.ifc;
  s.wait = env.now + 600;
  return s;
}
