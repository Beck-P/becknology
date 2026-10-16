// The Neon Royale's games and tables: names, limits, and what a table id says about the table you're at.
// A table id comes from the casino in Arcadia (`bj-1`, `bj-2`, `poker-3`…) and only flavours the table: its felt,
// its dealer, who's sitting at it. `stakes: 'high'` is the high-roller room's limits.
import { hashStr, seeded, shuffle } from './rng.js';
import { NPCS, DEALERS } from './people.js';

// game ids are a contract with the casino in the Bridge (its `casino` interactions): don't rename them
export const GAMES = [
  { id: 'blackjack', name: 'Blackjack', tag: 'Beat the dealer to 21', blurb: 'Dealer stands on soft 17 · blackjack pays 3 to 2 · double, split, insurance' },
  { id: 'roulette', name: 'Roulette', tag: 'European single zero', blurb: 'Straight up pays 35 to 1 · splits, streets, corners, dozens, red or black' },
  { id: 'craps', name: 'Craps', tag: 'Roll the bones', blurb: 'Pass line, come, field, place bets and odds · the dice go round the table' },
  { id: 'poker', name: "Hold'em", tag: 'No-limit poker', blurb: "Texas hold'em with the regulars · blinds, four streets, showdown" },
  { id: 'slots', name: 'Slots', tag: 'Three machines', blurb: 'Neon 7s, Starfall and Koi Fortune · paylines, wilds and bonuses' },
  { id: 'derby', name: 'Derby', tag: 'The Arcadia Derby', blurb: 'Six runners, fixed odds · back one to win or to place' },
  { id: 'crash', name: 'Crash', tag: 'The Rocket', blurb: 'Ride the multiplier · cash out before it blows' },
  { id: 'runouts', name: 'Runouts', tag: 'Sixteen little games', blurb: "The arcade's old runouts · back a player to win, to dodge or to lose" },
];
export const gameById = (id) => GAMES.find((g) => g.id === id) || null;

// minimum and maximum bet a spot (poker: the blinds and the buy-in; slots: the bets on offer)
const LIMITS = {
  blackjack: { std: { min: 5, max: 500 }, high: { min: 100, max: 10000 } },
  roulette: { std: { min: 1, max: 250 }, high: { min: 25, max: 5000 } },
  craps: { std: { min: 5, max: 500 }, high: { min: 100, max: 10000 } },
  poker: { std: { sb: 1, bb: 2, buyMin: 40, buyMax: 400, buy: 200 }, high: { sb: 25, bb: 50, buyMin: 1000, buyMax: 10000, buy: 5000 } },
  slots: { std: { bets: [5, 10, 25, 50, 100] }, high: { bets: [100, 250, 500, 1000, 2500] } },
  derby: { std: { min: 5, max: 500 }, high: { min: 100, max: 10000 } },
  crash: { std: { min: 1, max: 500 }, high: { min: 50, max: 10000 } },
  runouts: { std: { min: 5, max: 500 }, high: { min: 100, max: 10000 } },
};
export function limitsFor(game, stakes) {
  const L = LIMITS[game] || LIMITS.blackjack;
  const l = stakes === 'high' ? L.high : L.std;
  if (l.min != null) return { ...l };
  if (l.bb) return { ...l, min: l.bb, max: l.buyMax };
  return { ...l, min: l.bets[0], max: l.bets[l.bets.length - 1] };
}

// chips: value, face colour, edge colour, light, label
export const CHIPS = [
  { v: 1, face: '#ece8f4', edge: '#5c74d8', lit: '#ffffff', ink: '#2a2440', label: '1' },
  { v: 5, face: '#d8283c', edge: '#f4ecd8', lit: '#ff6a78', ink: '#ffffff', label: '5' },
  { v: 25, face: '#1e9a56', edge: '#f4ecd8', lit: '#5ad890', ink: '#ffffff', label: '25' },
  { v: 100, face: '#22222e', edge: '#e8c050', lit: '#4a4a5e', ink: '#ffe080', label: '100' },
  { v: 500, face: '#7a38c8', edge: '#f0d8ff', lit: '#b078f0', ink: '#ffffff', label: '500' },
  { v: 1000, face: '#e8b830', edge: '#7a4a10', lit: '#fff0a0', ink: '#4a2a08', label: '1K' },
  { v: 5000, face: '#f078a8', edge: '#2a0a20', lit: '#ffc0d8', ink: '#2a0a20', label: '5K' },
];
/** The five chips in the rack at a table: the ordinary set, or the high-roller set. */
export function chipsFor(limits) {
  const want = (limits.max || 500) > 1000 ? [25, 100, 500, 1000, 5000] : [1, 5, 25, 100, 500];
  return CHIPS.filter((c) => want.includes(c.v));
}
/** Break an amount into a stack of chips, biggest first (for drawing). */
export function chipStack(amount, max = 12) {
  const out = [];
  let rest = Math.round(amount);
  for (let i = CHIPS.length - 1; i >= 0 && rest > 0; i--) {
    while (rest >= CHIPS[i].v && out.length < 60) { out.push(CHIPS[i]); rest -= CHIPS[i].v; }
  }
  return out.reverse().slice(-max);
}

const FELTS = ['green', 'blue', 'crimson'];
/** What a table id says: its number, felt, dealer and the regulars sitting at it (stable for the id). */
export function tableInfo(game, tableId, stakes) {
  const id = String(tableId || game + '-1');
  const n = parseInt((id.match(/(\d+)\s*$/) || [])[1] || '1', 10) || 1;
  const rng = seeded(hashStr(game + ':' + id));
  const high = stakes === 'high';
  const felt = high ? 'vip' : FELTS[(n - 1) % FELTS.length];
  const dealer = DEALERS[(n - 1 + (hashStr(game) >>> 0)) % DEALERS.length];
  const regulars = shuffle(rng, NPCS.filter((p) => !p.high === !high || p.any));
  return { id, n, felt, high, dealer, regulars, name: (high ? 'HIGH ROLLER ' : 'TABLE ') + n, limits: limitsFor(game, stakes) };
}
