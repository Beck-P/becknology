// Playing cards and the poker hand evaluator (carried over from the old Runouts hold'em, which had it right).
// A card is { r: 2..14, s: 's' | 'h' | 'd' | 'c', id }.
import { shuffle } from './rng.js';

export const SUITS = ['s', 'h', 'd', 'c'];
export const SUIT_NAME = { s: 'spade', h: 'heart', d: 'diamond', c: 'club' };
export const SUIT_GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RANK_WORD = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };
const RANK_PLURAL = { 2: 'twos', 3: 'threes', 4: 'fours', 5: 'fives', 6: 'sixes', 7: 'sevens', 8: 'eights', 9: 'nines', 10: 'tens', 11: 'jacks', 12: 'queens', 13: 'kings', 14: 'aces' };

export const rankLabel = (r) => RANK_LABEL[r] || String(r);
export const rankWord = (r) => RANK_WORD[r];
export const rankPlural = (r) => RANK_PLURAL[r];
export const isRed = (c) => c.s === 'h' || c.s === 'd';
export const cardName = (c) => rankLabel(c.r) + SUIT_GLYPH[c.s];

let uid = 1;
/** n decks, shuffled, each card with an id that's unique for the life of the page. */
export function makeShoe(rng, decks = 1) {
  const cards = [];
  for (let d = 0; d < decks; d++) for (let r = 2; r <= 14; r++) for (const s of SUITS) cards.push({ r, s, id: uid++ });
  return shuffle(rng, cards);
}

export function compareScores(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const l = a[i] ?? 0, r = b[i] ?? 0;
    if (l !== r) return l - r;
  }
  return 0;
}

export function combinations(items, size) {
  const out = [], cur = [];
  (function walk(start, depth) {
    if (depth === size) { out.push(cur.slice()); return; }
    for (let i = start; i <= items.length - (size - depth); i++) { cur.push(items[i]); walk(i + 1, depth + 1); cur.pop(); }
  })(0, 0);
  return out;
}

function straightHigh(desc) {
  if (desc.length !== 5) return null;
  if (desc[0] === 14 && desc[1] === 5 && desc[2] === 4 && desc[3] === 3 && desc[4] === 2) return 5;
  for (let i = 1; i < 5; i++) if (desc[i - 1] - 1 !== desc[i]) return null;
  return desc[0];
}

export const HAND_NAMES = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

export function describeHand(score, cards) {
  const c = score[0];
  if (c === 8) return score[1] === 14 ? 'Royal flush' : `Straight flush, ${rankWord(score[1])} high`;
  if (c === 7) return `Four ${rankPlural(score[1])}`;
  if (c === 6) return `Full house, ${rankPlural(score[1])} over ${rankPlural(score[2])}`;
  if (c === 5) return `Flush, ${rankWord(score[1])} high`;
  if (c === 4) return `Straight, ${rankWord(score[1])} high`;
  if (c === 3) return `Three ${rankPlural(score[1])}`;
  if (c === 2) return `Two pair, ${rankPlural(score[1])} and ${rankPlural(score[2])}`;
  if (c === 1) return `Pair of ${rankPlural(score[1])}`;
  return `${rankWord(score[1])[0].toUpperCase() + rankWord(score[1]).slice(1)} high`;
}

/** Five cards → { score: [category, ...tiebreaks], label, cards }. */
export function evaluateFive(cards) {
  const desc = cards.map((c) => c.r).sort((a, b) => b - a);
  const counts = {};
  for (const r of desc) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.keys(counts).map((r) => ({ r: +r, n: counts[r] })).sort((a, b) => b.n - a.n || b.r - a.r);
  const flush = cards.every((c) => c.s === cards[0].s);
  const uniq = [...new Set(desc)];
  const straight = straightHigh(uniq);
  let score;
  if (flush && straight) score = [8, straight];
  else if (groups[0].n === 4) score = [7, groups[0].r, groups[1].r];
  else if (groups[0].n === 3 && groups[1] && groups[1].n === 2) score = [6, groups[0].r, groups[1].r];
  else if (flush) score = [5, ...desc];
  else if (straight) score = [4, straight];
  else if (groups[0].n === 3) score = [3, groups[0].r, ...groups.slice(1).map((g) => g.r).sort((a, b) => b - a)];
  else if (groups[0].n === 2 && groups[1] && groups[1].n === 2) {
    const pairs = groups.filter((g) => g.n === 2).map((g) => g.r).sort((a, b) => b - a);
    score = [2, pairs[0], pairs[1], (groups.find((g) => g.n === 1) || { r: 0 }).r];
  } else if (groups[0].n === 2) score = [1, groups[0].r, ...groups.filter((g) => g.n === 1).map((g) => g.r).sort((a, b) => b - a)];
  else score = [0, ...desc];
  return { score, label: describeHand(score, cards), cards };
}

/** The best five of hole cards + board (any five). */
export function bestHand(hole, board) {
  let best = null;
  for (const combo of combinations([...hole, ...board], 5)) {
    const e = evaluateFive(combo);
    if (!best || compareScores(e.score, best.score) > 0) best = e;
  }
  return best;
}

/** Omaha: exactly two from the hand and three from the board. */
export function bestOmaha(hole, board) {
  let best = null;
  for (const h of combinations(hole, 2)) for (const b of combinations(board, 3)) {
    const e = evaluateFive([...h, ...b]);
    if (!best || compareScores(e.score, best.score) > 0) best = e;
  }
  return best;
}

/** A fast seven-card (or 5/6) score: one number, bigger is better, in the same order as evaluateFive's scores. */
export function score7(cards) {
  const rc = new Array(15).fill(0), sc = { s: 0, h: 0, d: 0, c: 0 }, sm = { s: 0, h: 0, d: 0, c: 0 };
  let mask = 0;
  for (const c of cards) { rc[c.r]++; sc[c.s]++; sm[c.s] |= 1 << c.r; mask |= 1 << c.r; }
  const straight = (m) => {
    for (let h = 14; h >= 5; h--) {
      const need = h === 5 ? (1 << 14) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) : (0x1f << (h - 4));
      if ((m & need) === need) return h;
    }
    return 0;
  };
  const enc = (cat, ...k) => { let v = cat; for (let i = 0; i < 5; i++) v = v * 16 + (k[i] || 0); return v; };
  let fs = null;
  for (const s of SUITS) if (sc[s] >= 5) fs = s;
  if (fs) { const sf = straight(sm[fs]); if (sf) return enc(8, sf); }
  const quads = [], trips = [], pairs = [], singles = [];
  for (let r = 14; r >= 2; r--) {
    if (rc[r] === 4) quads.push(r); else if (rc[r] === 3) trips.push(r); else if (rc[r] === 2) pairs.push(r); else if (rc[r] === 1) singles.push(r);
  }
  if (quads.length) { const k = [...trips, ...pairs, ...singles].sort((a, b) => b - a)[0] || 0; return enc(7, quads[0], k); }
  if (trips.length && (trips.length > 1 || pairs.length)) return enc(6, trips[0], Math.max(trips[1] || 0, pairs[0] || 0));
  if (fs) { const rs = []; for (let r = 14; r >= 2 && rs.length < 5; r--) if (sm[fs] & (1 << r)) rs.push(r); return enc(5, ...rs); }
  const st = straight(mask);
  if (st) return enc(4, st);
  if (trips.length) return enc(3, trips[0], ...singles.slice(0, 2));
  if (pairs.length >= 2) { const k = [...pairs.slice(2), ...singles].sort((a, b) => b - a)[0] || 0; return enc(2, pairs[0], pairs[1], k); }
  if (pairs.length) return enc(1, pairs[0], ...singles.slice(0, 3));
  return enc(0, ...singles.slice(0, 5));
}
