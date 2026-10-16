// How the Royale's regulars play hold'em. Each decision estimates the hand's equity by dealing the rest out a few
// hundred times (score7), weighs it against the pot odds, and colours it with the player's personality
// (core/people.js: tight, aggro, bluff). Not a solver: a table of characters who mostly make sense.
import { score7, SUITS } from '../core/cards.js';
import { npcById } from '../core/people.js';

/** The share of the pot this hand wins against n random hands with the board run out (Monte Carlo). */
export function equity(hole, board, nOpp, iters, rng) {
  const used = new Set([...hole, ...board].map((c) => c.r * 4 + SUITS.indexOf(c.s)));
  const deck = [];
  for (let r = 2; r <= 14; r++) for (let k = 0; k < 4; k++) if (!used.has(r * 4 + k)) deck.push({ r, s: SUITS[k] });
  const need = 5 - board.length, n = deck.length, take = need + 2 * nOpp;
  let won = 0;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < take; i++) { const j = i + Math.floor(rng() * (n - i)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    const full = board.concat(deck.slice(0, need));
    const mine = score7(hole.concat(full));
    let ties = 0, beat = false;
    for (let o = 0; o < nOpp; o++) {
      const v = score7([deck[need + o * 2], deck[need + o * 2 + 1], ...full]);
      if (v > mine) { beat = true; break; }
      if (v === mine) ties++;
    }
    if (!beat) won += ties ? 1 / (ties + 1) : 1;
  }
  return won / iters;
}

const DEFAULT = { tight: 0.5, aggro: 0.5, bluff: 0.1 };
const round = (v, unit) => Math.max(unit, Math.round(v / unit) * unit);

/** The regular in seat x decides: { t: 'fold' | 'check' | 'call' | 'raise', to }. */
export function decide(s, x, rng) {
  const p = (x.npc && npcById(x.npc)) || DEFAULT;
  const opp = Math.min(4, s.seats.filter((y) => y !== x && y.inHand && !y.folded).length || 1);
  const pot = s.pot + s.seats.reduce((a, y) => a + y.bet, 0);
  const toCall = Math.min(x.stack, s.curBet - x.bet);
  const bb = s.blinds.bb, pre = s.board.length === 0;
  const eq = equity(x.hole, s.board, opp, pre ? 160 : 240, rng);
  const rel = eq * (opp + 1);                                 // 1 = an average hand at this table
  const canRaise = x.stack > toCall;
  const all = x.bet + x.stack;
  const raiseTo = (frac) => {
    const target = s.curBet + Math.max(s.minRaise, bb, round(pot * frac, bb));
    const to = Math.min(all, round(target, pre ? bb : Math.max(1, s.blinds.sb)));
    return to >= all * 0.72 ? all : to;
  };
  const r = rng();
  if (toCall <= 0) {
    if (canRaise && rel >= 1.45 - p.aggro * 0.3 && r < 0.45 + p.aggro * 0.45) return { t: 'raise', to: raiseTo(0.45 + rng() * 0.5) };
    if (canRaise && !pre && opp <= 2 && r < p.bluff) return { t: 'raise', to: raiseTo(0.5) };
    return { t: 'check' };
  }
  const odds = toCall / (pot + toCall);
  const big = toCall > x.stack * 0.5;
  if (canRaise && rel >= 1.85 - p.aggro * 0.35 && r < 0.3 + p.aggro * 0.55) return { t: 'raise', to: raiseTo(0.7 + rng() * 0.5) };
  const need = odds * (1 + p.tight * 0.45) + (big ? 0.08 * p.tight : 0);
  if (eq >= need) return { t: 'call' };
  if (pre && toCall <= bb && rel >= 0.75 + p.tight * 0.5) return { t: 'call' };
  if (canRaise && !big && r < p.bluff * 0.35) return { t: 'raise', to: raiseTo(0.6) };
  return { t: 'fold' };
}
