// The Royale's slot machines. Three cabinets, each its own maths:
//   NEON 7s   — three reels, five lines: sevens, bars, bells and cherries; the neon crown is wild and doubles a win
//               for every crown on the line (three crowns: the jackpot).
//   STARFALL  — five reels, twenty lines in space; the star is wild; three comets anywhere scatter-pay and start
//               eight free spins with every win doubled (and more comets add five more).
//   KOI FORTUNE — five reels, ten lines; the golden dragon is wild; three lanterns on reels 1, 3 and 5 open the
//               pearl bonus: three picks from nine pearls, each a multiple of the bet.
// A spin's whole outcome (bonus included) is decided when it's paid for, so a closed screen can always settle it.
// Return to player (by simulation, tests/slots.test.mjs): see RTP in the machine list below.
import { int, weighted } from '../core/rng.js';

const LINES20 = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0],
];
const LINES3 = [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]];

// symbol weights per reel → reel strips; pays are multiples of the line bet for 3, 4, 5 in a row
export const MACHINES = {
  neon7: {
    id: 'neon7', name: 'NEON 7s', reels: 3, rows: 3, lines: LINES3, theme: 'Classic three-reeler · crowns are wild',
    syms: {
      crown: { w: [2, 2, 2], wild: true },
      seven: { w: [4, 3, 3] }, bar3: { w: [5, 5, 4] }, bar2: { w: [6, 6, 6] }, bar: { w: [8, 8, 8] },
      bell: { w: [6, 6, 6] }, cherry: { w: [4, 6, 7] }, blank: { w: [14, 14, 14] },
    },
    // three of a kind (line bet ×); cherries count from the left; any three bars
    pays: { crown: 650, seven: 65, bar3: 26, bar2: 16, bar: 6, bell: 12, anybar: 3, cherry3: 6, cherry2: 3, cherry1: 0 },
    rtp: 0.946,
  },
  starfall: {
    id: 'starfall', name: 'STARFALL', reels: 5, rows: 3, lines: LINES20, theme: 'Twenty lines · comets start free spins',
    syms: {
      star: { w: [2, 2, 3, 3, 3], wild: true }, comet: { w: [3, 3, 3, 3, 3], scatter: true },
      planet: { w: [4, 4, 4, 4, 4] }, rocket: { w: [5, 5, 5, 5, 5] }, alien: { w: [6, 6, 6, 6, 6] },
      A: { w: [8, 8, 8, 8, 8] }, K: { w: [9, 9, 9, 9, 9] }, Q: { w: [10, 10, 10, 10, 10] }, J: { w: [11, 11, 11, 11, 11] },
    },
    pays: { star: [50, 250, 1200], planet: [30, 120, 480], rocket: [25, 75, 300], alien: [15, 50, 200], A: [10, 25, 95], K: [7, 20, 70], Q: [5, 15, 50], J: [5, 12, 40] },
    scatter: { sym: 'comet', pays: { 3: 2, 4: 10, 5: 50 }, free: 8, retrigger: 5, mult: 2 },
    rtp: 0.955,
  },
  koi: {
    id: 'koi', name: 'KOI FORTUNE', reels: 5, rows: 3, lines: LINES20.slice(0, 10), theme: 'Ten lines · lanterns open the pearl bonus',
    syms: {
      dragon: { w: [2, 2, 2, 2, 2], wild: true }, lantern: { w: [4, 0, 4, 0, 4], bonus: true },
      koi: { w: [4, 4, 4, 4, 4] }, lotus: { w: [5, 5, 5, 5, 5] }, jade: { w: [6, 6, 6, 6, 6] }, coin: { w: [7, 7, 7, 7, 7] },
      A: { w: [8, 9, 8, 9, 8] }, K: { w: [9, 10, 9, 10, 9] }, Q: { w: [10, 11, 10, 11, 10] },
    },
    pays: { dragon: [75, 350, 1800], koi: [45, 180, 750], lotus: [30, 120, 450], jade: [24, 75, 300], coin: [15, 45, 180], A: [9, 30, 105], K: [6, 24, 75], Q: [6, 18, 60] },
    pick: { picks: 3, prizes: [1, 2, 2, 3, 4, 5, 8, 10, 25] },     // × the total bet
    rtp: 0.953,
  },
};
export const MACHINE_IDS = ['neon7', 'starfall', 'koi'];

// reel strips: built once from the weights, symbols spread round the reel (a deterministic interleave)
const STRIPS = {};
export function strips(m) {
  if (STRIPS[m.id]) return STRIPS[m.id];
  const out = [];
  for (let r = 0; r < m.reels; r++) {
    const bag = [];
    for (const k in m.syms) for (let i = 0; i < m.syms[k].w[r]; i++) bag.push(k);
    // spread: sort by (i + 0.5) / count for each symbol so identical symbols are far apart
    const counts = {}, seen = {}, keyed = [];
    for (const k of bag) counts[k] = (counts[k] || 0) + 1;
    for (const k of bag) { seen[k] = (seen[k] || 0) + 1; keyed.push({ k, at: (seen[k] - 0.5) / counts[k] + (k.charCodeAt(0) % 7) * 0.0013 }); }
    keyed.sort((a, b) => a.at - b.at);
    out.push(keyed.map((x) => x.k));
  }
  STRIPS[m.id] = out;
  return out;
}

/** The 3 × reels window at the given stops: grid[reel][row]. */
export function windowAt(m, stops) {
  const st = strips(m);
  return stops.map((s, r) => { const L = st[r].length; return [st[r][(s - 1 + L) % L], st[r][s % L], st[r][(s + 1) % L]]; });
}

function evalNeon(m, grid) {
  const wins = [];
  m.lines.forEach((ln, li) => {
    const syms = ln.map((row, r) => grid[r][row]);
    const crowns = syms.filter((x) => x === 'crown').length;
    const base = syms.filter((x) => x !== 'crown');
    let pay = 0, label = '';
    if (crowns === 3) { pay = m.pays.crown; label = 'CROWN JACKPOT'; }
    else {
      const allSame = base.every((x) => x === base[0]);
      const isBar = (x) => x === 'bar' || x === 'bar2' || x === 'bar3';
      if (allSame && m.pays[base[0]] && base[0] !== 'cherry' && base[0] !== 'blank') { pay = m.pays[base[0]]; label = 'THREE ' + base[0].toUpperCase(); }
      else if (base.every(isBar)) { pay = m.pays.anybar; label = 'ANY BAR'; }
      if (!pay) {
        let ch = 0;
        for (const x of syms) { if (x === 'cherry' || x === 'crown') ch++; else break; }
        if (syms.some((x) => x === 'cherry')) {
          if (ch >= 3) { pay = m.pays.cherry3; label = 'THREE CHERRIES'; } else if (ch === 2) { pay = m.pays.cherry2; label = 'TWO CHERRIES'; } else if (ch === 1 && syms[0] === 'cherry') { pay = m.pays.cherry1; label = 'CHERRY'; }
        }
      }
      if (pay && crowns) { pay *= Math.pow(2, crowns); label += ' ×' + Math.pow(2, crowns); }
    }
    if (pay) wins.push({ line: li, pay, label, cells: ln.map((row, r) => [r, row]), sym: crowns === 3 ? 'crown' : base[0] });
  });
  return wins;
}

function evalLines(m, grid) {
  const wins = [];
  const wild = Object.keys(m.syms).find((k) => m.syms[k].wild);
  const special = (k) => m.syms[k].scatter || m.syms[k].bonus;
  m.lines.forEach((ln, li) => {
    const syms = ln.map((row, r) => grid[r][row]);
    // the run of wilds from the left pays as wilds; or the first real symbol with wilds standing in
    let wn = 0;
    while (wn < syms.length && syms[wn] === wild) wn++;
    const wildPay = wn >= 3 ? m.pays[wild][wn - 3] : 0;
    const first = syms.find((x) => x !== wild);
    let n = 0, symPay = 0;
    if (first && !special(first)) {
      while (n < syms.length && (syms[n] === first || syms[n] === wild)) n++;
      symPay = n >= 3 && m.pays[first] ? m.pays[first][n - 3] : 0;
    }
    if (wildPay >= symPay && wildPay > 0) wins.push({ line: li, pay: wildPay, sym: wild, n: wn, cells: ln.slice(0, wn).map((row, r) => [r, row]) });
    else if (symPay > 0) wins.push({ line: li, pay: symPay, sym: first, n, cells: ln.slice(0, n).map((row, r) => [r, row]) });
  });
  return wins;
}

/** The line wins on a grid (grid[reel][row]). */
export function lineWins(id, grid) { const m = MACHINES[id]; return id === 'neon7' ? evalNeon(m, grid) : evalLines(m, grid); }

/** Spin once: { stops, grid, wins, lineWin (× line bet), scatter, bonus }. free: a free spin (its own multiplier). */
function spinOnce(m, rng) {
  const st = strips(m);
  const stops = st.map((s) => int(rng, s.length));
  const grid = windowAt(m, stops);
  const wins = m.id === 'neon7' ? evalNeon(m, grid) : evalLines(m, grid);
  let lineWin = 0;
  for (const w of wins) lineWin += w.pay;
  const out = { stops, grid, wins, lineWin, scatter: null, trigger: null };
  if (m.scatter) {
    const cells = [];
    grid.forEach((col, r) => col.forEach((x, row) => { if (x === m.scatter.sym) cells.push([r, row]); }));
    if (cells.length >= 3) out.scatter = { n: cells.length, cells, pay: m.scatter.pays[Math.min(5, cells.length)] || 0 };
  }
  if (m.pick) {
    const cells = [];
    grid.forEach((col, r) => col.forEach((x, row) => { if (m.syms[x].bonus) cells.push([r, row]); }));
    if (cells.length >= 3) out.trigger = { kind: 'pick', cells };
  }
  if (out.scatter) out.trigger = { kind: 'free', cells: out.scatter.cells };
  return out;
}

/**
 * A paid spin, bonus and all. bet: the total bet. → { ...spin, win (coins, this spin's lines and scatter),
 * bonus: null | { kind: 'free', spins: [{ ...spin, win }], total } | { kind: 'pick', prizes, picks, total }, pay (everything) }
 */
export function play(id, bet, rng) {
  const m = MACHINES[id];
  const lineBet = bet / m.lines.length;
  const base = spinOnce(m, rng);
  const win = Math.floor(base.lineWin * lineBet + (base.scatter ? base.scatter.pay * bet : 0));
  const out = { machine: id, bet, ...base, win, bonus: null, pay: win };
  if (base.trigger && base.trigger.kind === 'free') {
    const spins = [];
    let left = m.scatter.free;
    while (left > 0 && spins.length < 60) {
      left--;
      const f = spinOnce(m, rng);
      const fw = Math.floor((f.lineWin * lineBet + (f.scatter ? f.scatter.pay * bet : 0)) * m.scatter.mult);
      if (f.scatter) left += m.scatter.retrigger;
      spins.push({ ...f, win: fw });
    }
    const total = spins.reduce((a, f) => a + f.win, 0);
    out.bonus = { kind: 'free', spins, total, mult: m.scatter.mult };
    out.pay += total;
  } else if (base.trigger && base.trigger.kind === 'pick') {
    const prizes = m.pick.prizes.slice();
    for (let i = prizes.length - 1; i > 0; i--) { const j = int(rng, i + 1); [prizes[i], prizes[j]] = [prizes[j], prizes[i]]; }
    // what the picks are worth doesn't depend on which pearls you touch: the k-th pick reveals prizes[order[k]]
    const total = prizes.slice(0, m.pick.picks).reduce((a, p) => a + p * bet, 0);
    out.bonus = { kind: 'pick', prizes: prizes.map((p) => p * bet), picks: m.pick.picks, total };
    out.pay += total;
  }
  return out;
}

/** The biggest single line or scatter pay this machine has, × total bet (for the paytable screen). */
export function payRows(id) {
  const m = MACHINES[id];
  if (id === 'neon7') {
    return [['crown', 'crown', 'crown', m.pays.crown], ['seven', 'seven', 'seven', m.pays.seven], ['bar3', 'bar3', 'bar3', m.pays.bar3], ['bar2', 'bar2', 'bar2', m.pays.bar2],
      ['bell', 'bell', 'bell', m.pays.bell], ['bar', 'bar', 'bar', m.pays.bar], ['cherry', 'cherry', 'cherry', m.pays.cherry3], ['bar', 'bar2', 'bar3', m.pays.anybar], ['cherry', 'cherry', null, m.pays.cherry2], ['cherry', null, null, m.pays.cherry1]]
      .map(([a, b, c, p]) => ({ syms: [a, b, c], pay: p, per: 'line' }));
  }
  return Object.keys(m.pays).map((k) => ({ sym: k, pays: m.pays[k], per: 'line' }));
}
export { weighted };
