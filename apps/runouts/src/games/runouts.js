// Runouts: the arcade's old pick-a-loser games, now a table at the Royale. Four players line up (you, the regulars,
// whoever you brought), the game plays out, and everyone ends up ranked first to last. You back any of them:
//   WIN  — they finish first        pays ×3.8  (fair ×4)
//   SAFE — they don't finish last   pays ×1.27 (fair ×1.33)
//   LAST — they finish last         pays ×3.8
// Mode ids are the old Runouts ids (the casino's walk-up stations open them by id): don't rename them.
import { makeShoe, bestHand, bestOmaha, compareScores, score7 } from '../core/cards.js';
import { clone, int, shuffle, gauss, pick } from '../core/rng.js';

export const MODES = [
  { id: 'holdem', name: "Texas Hold'em", kind: 'cards', blurb: 'Two cards each, the board runs out. Best hand wins.' },
  { id: 'plo', name: 'PLO', kind: 'cards', blurb: 'Four cards each, Omaha rules, a full showdown.' },
  { id: 'high-card', name: 'High Card', kind: 'cards', blurb: 'One card each. Spades break ties.' },
  { id: 'rng', name: 'Random Number', kind: 'luck', blurb: 'A number each, 1 to 100. Highest wins.' },
  { id: 'wheel', name: 'Wheel Spinner', kind: 'luck', blurb: 'The wheel knocks one out every spin.' },
  { id: 'dice', name: 'Dice Duel', kind: 'luck', blurb: 'Two dice each. Highest total wins.' },
  { id: 'coin-flips', name: 'Coin Gauntlet', kind: 'luck', blurb: 'Five flips each. Most heads wins.' },
  { id: 'black-marble', name: 'Black Marble', kind: 'luck', blurb: 'Draw from the bag. The black one puts you out.' },
  { id: 'slots', name: 'Slot Machine', kind: 'luck', blurb: 'A spin each. Best line wins.' },
  { id: 'horse-race', name: 'Horse Race', kind: 'shows', blurb: 'A horse each, once round the track.' },
  { id: 'rocket', name: 'Rocket Launch', kind: 'shows', blurb: 'Last rocket flying wins.' },
  { id: 'space-invaders', name: 'Space Invaders', kind: 'shows', blurb: 'An alien each. The cannon picks them off.' },
  { id: 'bomb', name: 'Bomb', kind: 'shows', blurb: "Hot potato. Don't hold it when it blows." },
  { id: 'plinko', name: 'Plinko', kind: 'shows', blurb: 'Drop a ball each. Biggest slot wins.' },
  { id: 'battle-royale', name: 'Battle Royale', kind: 'shows', blurb: 'The zone closes in. Last one standing.' },
  { id: 'stock-market', name: 'Stock Market', kind: 'shows', blurb: 'A stock each. Best portfolio at the bell.' },
];
export const MODE_IDS = MODES.map((m) => m.id);
export const modeById = (id) => MODES.find((m) => m.id === id) || null;
export const PAYS = { w: 3.8, s: 1.27, l: 3.8 };
const T = { bets: 15000, result: 5600 };

const SUIT_ORDER = { s: 4, h: 3, d: 2, c: 1 };
/** Rank indexes best → worst by a score (bigger better), ties settled by a coin the script remembers. */
function rankBy(scores, rng, cmp = (a, b) => b - a) {
  const tb = scores.map(() => rng());
  const idx = scores.map((_, i) => i);
  idx.sort((a, b) => cmp(scores[a], scores[b]) || tb[b] - tb[a]);
  const ties = [];
  for (let i = 1; i < idx.length; i++) if (cmp(scores[idx[i - 1]], scores[idx[i]]) === 0) ties.push([idx[i - 1], idx[i]]);
  return { order: idx, ties };
}

// ---- the games ---------------------------------------------------------------------------------------------------------
const RUN = {
  holdem(n, rng) {
    const deck = makeShoe(rng, 1);
    const hole = Array.from({ length: n }, () => [deck.pop(), deck.pop()]);
    const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    const best = hole.map((h) => bestHand(h, board));
    const { order, ties } = rankBy(best.map((b) => b.score), rng, (a, b) => compareScores(b, a));
    return { order, script: { hole, board, labels: best.map((b) => b.label), best: best.map((b) => b.cards.map((c) => c.id)), ties }, dur: 11500 };
  },
  plo(n, rng) {
    const deck = makeShoe(rng, 1);
    const hole = Array.from({ length: n }, () => [deck.pop(), deck.pop(), deck.pop(), deck.pop()]);
    const board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
    const best = hole.map((h) => bestOmaha(h, board));
    const { order, ties } = rankBy(best.map((b) => b.score), rng, (a, b) => compareScores(b, a));
    return { order, script: { hole, board, labels: best.map((b) => b.label), best: best.map((b) => b.cards.map((c) => c.id)), ties }, dur: 12500 };
  },
  'high-card'(n, rng) {
    const deck = makeShoe(rng, 1);
    const cards = Array.from({ length: n }, () => deck.pop());
    const { order } = rankBy(cards.map((c) => c.r * 10 + SUIT_ORDER[c.s]), rng);
    return { order, script: { cards }, dur: 7000 };
  },
  rng(n, rng) {
    const nums = shuffle(rng, Array.from({ length: 100 }, (_, i) => i + 1)).slice(0, n);
    const { order } = rankBy(nums, rng);
    return { order, script: { nums }, dur: 7500 };
  },
  wheel(n, rng) {
    let alive = Array.from({ length: n }, (_, i) => i);
    const spins = [], out = [];
    while (alive.length > 1) {
      const k = int(rng, alive.length);
      spins.push({ alive: alive.slice(), hit: alive[k], turns: 2 + rng() * 1.5, jitter: rng() * 0.6 + 0.2 });
      out.push(alive[k]);
      alive = alive.filter((x) => x !== alive[k]);
    }
    return { order: [alive[0], ...out.reverse()], script: { spins }, dur: 1200 + spins.length * 3400 };
  },
  dice(n, rng) {
    const rolls = Array.from({ length: n }, () => [1 + int(rng, 6), 1 + int(rng, 6)]);
    const totals = rolls.map((r) => r[0] + r[1]);
    // ties roll again (one more die each), as many times as it takes
    const extra = rolls.map(() => []);
    const key = (i) => totals[i] * 1000 + extra[i].reduce((a, d, k) => a + d * Math.pow(7, 2 - k), 0);
    for (let guard = 0; guard < 3; guard++) {
      const groups = {};
      for (let i = 0; i < n; i++) (groups[key(i)] = groups[key(i)] || []).push(i);
      const tied = Object.values(groups).filter((g) => g.length > 1).flat();
      if (!tied.length) break;
      for (const i of tied) extra[i].push(1 + int(rng, 6));
    }
    const { order } = rankBy(rolls.map((_, i) => key(i)), rng);
    return { order, script: { rolls, extra }, dur: 3200 + n * 900 + (extra.some((e) => e.length) ? 2200 : 0) };
  },
  'coin-flips'(n, rng) {
    const flips = Array.from({ length: n }, () => Array.from({ length: 5 }, () => (rng() < 0.5 ? 1 : 0)));
    const heads = flips.map((f) => f.reduce((a, b) => a + b, 0));
    const sd = flips.map(() => []);
    for (let guard = 0; guard < 6; guard++) {
      const k = (i) => heads[i] * 100 + sd[i].reduce((a, b, j) => a + b * Math.pow(2, 5 - j), 0);
      const seen = {};
      for (let i = 0; i < n; i++) (seen[k(i)] = seen[k(i)] || []).push(i);
      const tied = Object.values(seen).filter((g) => g.length > 1).flat();
      if (!tied.length) break;
      for (const i of tied) sd[i].push(rng() < 0.5 ? 1 : 0);
    }
    const k = (i) => heads[i] * 100 + sd[i].reduce((a, b, j) => a + b * Math.pow(2, 5 - j), 0);
    const { order } = rankBy(flips.map((_, i) => k(i)), rng);
    return { order, script: { flips, sd }, dur: 2200 + 5 * 900 + (sd.some((s) => s.length) ? 2400 : 0) };
  },
  'black-marble'(n, rng) {
    let alive = Array.from({ length: n }, (_, i) => i);
    const rounds = [], out = [];
    let first = int(rng, n);
    while (alive.length > 1) {
      const bag = alive.length + 2;                 // white marbles, and one black
      const draws = [];
      let at = alive.indexOf(first) >= 0 ? alive.indexOf(first) : 0, left = bag;
      for (;;) {
        const who = alive[at % alive.length];
        const black = rng() < 1 / left;
        draws.push({ who, black });
        if (black) break;
        left--; at++;
      }
      const loser = draws[draws.length - 1].who;
      rounds.push({ alive: alive.slice(), bag, draws });
      out.push(loser);
      alive = alive.filter((x) => x !== loser);
      first = alive[at % alive.length] ?? alive[0];
    }
    const steps = rounds.reduce((a, r) => a + r.draws.length, 0);
    return { order: [alive[0], ...out.reverse()], script: { rounds }, dur: 1200 + steps * 950 + rounds.length * 900 };
  },
  slots(n, rng) {
    const SYM = ['seven', 'bell', 'bar', 'cherry', 'star', 'lemon'];
    const W = [1, 2, 3, 4, 3, 4];
    const pickSym = () => { let r = rng() * 17; for (let i = 0; i < SYM.length; i++) { r -= W[i]; if (r < 0) return SYM[i]; } return 'lemon'; };
    const reels = Array.from({ length: n }, () => [pickSym(), pickSym(), pickSym()]);
    const val = { seven: 6, bell: 5, star: 4, bar: 3, cherry: 2, lemon: 1 };
    const score = reels.map((r) => {
      const same = r[0] === r[1] && r[1] === r[2], two = r[0] === r[1] || r[1] === r[2] || r[0] === r[2];
      const top = Math.max(...r.map((x) => val[x]));
      const pairSym = r[0] === r[1] || r[0] === r[2] ? r[0] : r[1];
      return same ? 300 + val[r[0]] * 10 : two ? 200 + val[pairSym] * 10 + top : r.reduce((a, x) => a + val[x], 0);
    });
    const { order } = rankBy(score.map((v, i) => v * 10 + (n - i)), rng);           // a tie goes to the earlier spin
    return { order, script: { reels, score }, dur: 2400 + n * 1300 };
  },
  'horse-race'(n, rng) {
    const L = 100, pos = new Array(n).fill(0), trace = [], speed = Array.from({ length: n }, () => 1 + gauss(rng) * 0.03);
    const order = [];
    for (let t = 0; t < 400 && order.length < n; t++) {
      for (let i = 0; i < n; i++) if (pos[i] < L) pos[i] = Math.min(L, pos[i] + speed[i] * (0.55 + rng() * 0.9) * (t > 20 && rng() < 0.08 ? 1.6 : 1));
      const fin = pos.map((p, i) => i).filter((i) => pos[i] >= L && !order.includes(i));
      shuffle(rng, fin).forEach((i) => order.push(i));
      if (t % 2 === 0) trace.push(pos.map((p) => Math.round(p * 10) / 10));
    }
    trace.push(pos.slice());
    return { order, script: { trace }, dur: 10500 };
  },
  rocket(n, rng) {
    const crash = Array.from({ length: n }, () => 1.6 + -Math.log(1 - rng() * 0.97) * 3.2);
    const { order } = rankBy(crash, rng);
    return { order, script: { crash }, dur: Math.min(13000, 1800 + Math.max(...crash) * 1000 + 1600) };
  },
  'space-invaders'(n, rng) {
    const out = shuffle(rng, Array.from({ length: n }, (_, i) => i));
    const survivor = out.pop();
    const misses = out.map(() => int(rng, 3));
    return { order: [survivor, ...out.reverse()], script: { shots: out.slice().reverse(), misses }, dur: 1800 + (n - 1) * 2600 + 1200 };
  },
  bomb(n, rng) {
    let alive = Array.from({ length: n }, (_, i) => i);
    const rounds = [], out = [];
    let holder = int(rng, n);
    while (alive.length > 1) {
      const passes = [holder];
      const len = 4 + int(rng, 7);
      for (let k = 0; k < len; k++) { const others = alive.filter((x) => x !== holder); holder = pick(rng, others); passes.push(holder); }
      rounds.push({ alive: alive.slice(), passes });
      out.push(holder);
      alive = alive.filter((x) => x !== holder);
      holder = pick(rng, alive);
    }
    const steps = rounds.reduce((a, r) => a + r.passes.length, 0);
    return { order: [alive[0], ...out.reverse()], script: { rounds }, dur: 800 + steps * 420 + rounds.length * 1500 };
  },
  plinko(n, rng) {
    const ROWS = 8, SLOTS = [100, 25, 10, 5, 1, 5, 10, 25, 100];
    const paths = Array.from({ length: n }, () => Array.from({ length: ROWS }, () => (rng() < 0.5 ? 0 : 1)));
    const land = paths.map((p) => p.reduce((a, b) => a + b, 0));
    const vals = land.map((l) => SLOTS[l]);
    const { order } = rankBy(vals.map((v, i) => v * 10 + (n - i)), rng);            // a tie goes to the earlier drop
    return { order, script: { paths, land, vals, slots: SLOTS }, dur: 1500 + n * 1700 + 900 };
  },
  'battle-royale'(n, rng) {
    const pos = Array.from({ length: n }, () => [0.15 + rng() * 0.7, 0.15 + rng() * 0.7]);
    const centre = [0.3 + rng() * 0.4, 0.3 + rng() * 0.4];
    // whoever's furthest from where the zone closes goes first, give or take a firefight
    const d = pos.map(([x, y]) => Math.hypot(x - centre[0], y - centre[1]) + rng() * 0.25);
    const { order } = rankBy(d, rng, (a, b) => a - b);
    return { order, script: { pos, centre }, dur: 2000 + (n - 1) * 2300 + 1200 };
  },
  'stock-market'(n, rng) {
    const TICKERS = ['$NEON', '$VOID', '$CHIP', '$MOON', '$GLOW', '$SYNC', '$RUST', '$HOLO'];
    const names = shuffle(rng, TICKERS).slice(0, n);
    const series = names.map(() => {
      let p = 100, drift = gauss(rng) * 0.6;
      const out = [p];
      for (let i = 0; i < 40; i++) { p = Math.max(5, p * (1 + (drift + gauss(rng) * 3.2) / 100)); if (rng() < 0.05) drift = gauss(rng) * 1.2; out.push(Math.round(p * 10) / 10); }
      return out;
    });
    const { order } = rankBy(series.map((s) => s[s.length - 1]), rng);
    return { order, script: { names, series }, dur: 10500 };
  },
};

/** Play a mode out: { order: [indexes best → worst], script, dur }. */
export function run(mode, n, rng) { return (RUN[mode] || RUN.dice)(n, rng); }

// ---- the table ---------------------------------------------------------------------------------------------------------
/**
 * players: [{ id, name, kind: 'pilot' | 'npc', npc? }] — the four who line up (pilots first, regulars to fill)
 * mode: a mode id, or 'random' (a new one each round)
 */
export function create({ seats, lineup, mode, limits, now = Date.now(), rng }) {
  const s = { game: 'runouts', v: 1, round: 1, phase: 'bet', wait: null, until: null, now, limits: { ...limits }, pick: mode || 'random',
    mode: null, lineup: lineup.slice(0, 4), seats: seats.map(seat), play: null, hist: [], msg: '' };
  open(s, now, rng);
  return s;
}
function seat(x) { return { id: x.id, name: x.name, kind: x.kind || 'pilot', bets: {}, ready: false, result: null, left: false }; }
const pilots = (s) => s.seats.filter((x) => x.kind === 'pilot' && !x.left);

function open(s, now, rng) {
  s.mode = s.pick === 'random' ? pick(rng, MODE_IDS.filter((m) => m !== s.mode)) : s.pick;
  s.phase = 'bet'; s.play = null; s.until = null; s.wait = null;
  s.msg = 'BACK A PLAYER';
  for (const x of s.seats) { x.bets = {}; x.ready = false; }
}
export const validKey = (k, n) => /^[wsl]\d$/.test(k) && +k[1] < n;
/** What a bet slip returns for a finishing order. */
export function pays(bets, order) {
  const n = order.length;
  let p = 0;
  for (const k in bets) {
    const i = +k[1], a = bets[k];
    if (k[0] === 'w' && order[0] === i) p += Math.floor(a * PAYS.w);
    if (k[0] === 's' && order[n - 1] !== i) p += Math.floor(a * PAYS.s);
    if (k[0] === 'l' && order[n - 1] === i) p += Math.floor(a * PAYS.l);
  }
  return p;
}
export const sum = (b) => Object.values(b || {}).reduce((a, x) => a + x, 0);

function go(s, now, rng) {
  const r = run(s.mode, s.lineup.length, rng);
  s.play = { at: now + 400, dur: r.dur, order: r.order, script: r.script };
  s.phase = 'play'; s.until = null; s.msg = '';
  s.wait = s.play.at + r.dur;
}

export function act(state, a, env) {
  const s = clone(state), now = env.now, x = s.seats.find((y) => y.id === a.seat);
  switch (a.t) {
    case 'join': {
      if (s.seats.some((y) => y.id === a.who.id)) { s.seats.find((y) => y.id === a.who.id).left = false; break; }
      s.seats.push(seat(a.who));
      // they take a regular's place in the line-up (from the next round if one's playing)
      if (!s.lineup.some((p) => p.id === a.who.id)) {
        const k = s.lineup.findIndex((p) => p.kind === 'npc');
        if (k >= 0 && s.phase === 'bet') s.lineup[k] = { id: a.who.id, name: a.who.name, kind: 'pilot' };
        else if (k >= 0) s.joinNext = { id: a.who.id, name: a.who.name, kind: 'pilot' };
      }
      break;
    }
    case 'leave': if (!x) return null; x.left = true; if (s.phase === 'bet') { s.seats = s.seats.filter((y) => y !== x); maybeGo(s, now, env.rng); } break;
    case 'mode': {                                   // a pilot picks the next game (between rounds)
      if (s.phase !== 'bet' || (a.mode !== 'random' && !modeById(a.mode)) || s.seats.some((y) => y.ready && y.kind === 'pilot')) return null;
      s.pick = a.mode; s.mode = a.mode === 'random' ? pick(env.rng, MODE_IDS) : a.mode;
      break;
    }
    case 'bets': {
      if (s.phase !== 'bet' || !x || x.ready) return null;
      for (const k in a.bets) if (!validKey(k, s.lineup.length) || !(a.bets[k] >= s.limits.min) || a.bets[k] > s.limits.max) return null;
      x.bets = { ...a.bets }; x.ready = true;
      maybeGo(s, now, env.rng);
      if (s.phase === 'bet' && !s.until) { s.until = now + T.bets; s.wait = s.until; }
      break;
    }
    default: return null;
  }
  s.v++; s.now = now;
  return s;
}
function maybeGo(s, now, rng) { const ps = pilots(s); if (ps.some((x) => x.ready) && ps.every((x) => x.ready)) go(s, now, rng); }

export function tick(state, env) {
  const now = env.now;
  if (state.wait == null || now < state.wait) return null;
  const s = clone(state);
  s.now = now;
  if (s.phase === 'bet') { s.until = null; s.wait = null; if (pilots(s).some((x) => x.ready)) go(s, now, env.rng); }
  else if (s.phase === 'play') {
    for (const x of s.seats) {
      if (x.left || !Object.keys(x.bets).length) { x.result = null; continue; }
      const pay = pays(x.bets, s.play.order), staked = sum(x.bets);
      x.result = { round: s.round, pay, staked, net: pay - staked };
    }
    const w = s.lineup[s.play.order[0]], l = s.lineup[s.play.order[s.play.order.length - 1]];
    s.hist = [{ mode: s.mode, win: w.name, last: l.name }, ...s.hist].slice(0, 8);
    s.phase = 'result'; s.msg = w.name.toUpperCase() + ' WINS · ' + l.name.toUpperCase() + ' LAST'; s.wait = now + T.result;
  } else if (s.phase === 'result') {
    if (s.joinNext) { const k = s.lineup.findIndex((p) => p.kind === 'npc'); if (k >= 0) s.lineup[k] = s.joinNext; s.joinNext = null; }
    s.round++; open(s, now, env.rng);
  }
  s.v++;
  return s;
}
export function view(s) { const v = { ...s, ifc: {} }; for (const x of s.seats) if (x.kind === 'pilot') v.ifc[x.id] = ifClosed(s, x.id); return v; }
export function ifClosed(s, id) {
  const x = s.seats.find((y) => y.id === id);
  if (!x || x.left) return 0;
  if (s.phase === 'bet') return x.ready ? sum(x.bets) : 0;
  if (s.phase === 'play') return pays(x.bets, s.play.order);
  return x.result && x.result.round === s.round ? x.result.pay : 0;
}
export function adopt(v, env) { const s = clone(v); delete s.ifc; s.wait = Math.max(env.now + 400, s.wait || 0); return s; }
export { score7 };
