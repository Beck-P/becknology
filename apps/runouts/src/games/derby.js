// The Arcadia Derby: six runners, fixed odds. Each runner has a pace, a finish (stamina) and a temperament; the
// house runs the race a thousand times in its head to price it (a 12% margin on the win book, 15% on place), then
// runs it once for real. Back a runner to WIN (first past the post) or to PLACE (first or second).
import { clone, int, gauss, shuffle } from '../core/rng.js';

const T = { bets: 20000, race: 15000, result: 6000 };
export const SILKS = ['#e84040', '#f0c040', '#40a0f0', '#40d080', '#f078a8', '#f4f0f8'];
const NAMES = ['Neon Nellie', 'Spark Plug', 'Void Runner', 'Pixel Pony', 'Lucky Liz', 'Midnight Mile', 'Chrome Comet', 'Static Storm',
  'Glitch Gallop', 'Rain Dancer', 'Synth Stallion', 'Holo Hoof', 'Turbo Tango', 'Last Call', 'Jackpot Jo', 'Velvet Rocket', 'Cyber Mare', 'Dusk Dash'];
const MARGIN = { win: 0.88, place: 0.85 };

/** A field of six with their hidden form. */
export function field(rng) {
  const names = shuffle(rng, NAMES).slice(0, 6);
  return names.map((name, i) => ({
    i, name, silk: SILKS[i],
    pace: 1 + gauss(rng) * 0.015,            // cruising speed
    finish: 0.75 + rng() * 0.5,              // how well they last the last third
    jump: rng(),                             // how they break from the gate
    nerve: 0.012 + rng() * 0.022,            // how much they wobble
  }));
}

/** One race: positions over time (samples) and the finishing order (indexes). */
export function race(runners, rng, samples = 0) {
  const L = 1000, dt = 0.5, n = runners.length;
  const pos = new Array(n).fill(0), done = new Array(n).fill(0), trace = [];
  const order = [];
  const day = runners.map(() => 1 + gauss(rng) * 0.022);        // form on the day
  let t = 0;
  while (order.length < n && t < 200) {
    t += dt;
    for (let k = 0; k < n; k++) {
      if (done[k]) continue;
      const r = runners[k], frac = pos[k] / L;
      let v = 15 * r.pace * day[k] * (1 + gauss(rng) * r.nerve);
      if (frac < 0.08) v *= 0.7 + 0.3 * r.jump + frac * 3;                 // out of the gate
      if (frac > 0.66) v *= 1 + (r.finish - 1) * ((frac - 0.66) / 0.34) * 0.32;   // the last third: stayers come, sprinters fade
      pos[k] += v * dt;
      if (pos[k] >= L) { done[k] = t - (pos[k] - L) / v; pos[k] = L; }
    }
    const fin = runners.map((r, k) => k).filter((k) => done[k] && !order.includes(k)).sort((a, b) => done[a] - done[b]);
    order.push(...fin);
    if (samples) trace.push(pos.map((p) => Math.round(p)));
  }
  return { order, trace, time: t, finish: done };
}

/** Price the field: win and place odds (decimal, the stake included) from 1,200 simulated races. */
export function price(runners, rng, sims = 900) {
  const win = new Array(runners.length).fill(0), place = new Array(runners.length).fill(0);
  for (let i = 0; i < sims; i++) {
    const { order } = race(runners, rng);
    win[order[0]]++; place[order[0]]++; place[order[1]]++;
  }
  const odds = (p, m) => {
    const o = (m / Math.max(p, 0.004));
    return Math.min(100, Math.max(1.1, o < 4 ? Math.round(o * 10) / 10 : o < 12 ? Math.round(o * 2) / 2 : Math.round(o)));
  };
  return runners.map((r, k) => ({ win: odds(win[k] / sims, MARGIN.win), place: odds(place[k] / sims, MARGIN.place), pWin: win[k] / sims }));
}

export function pays(bets, odds, order) {
  let p = 0;
  for (const k in bets) {
    const kind = k[0], i = +k.slice(1);
    if (kind === 'w' && order[0] === i) p += Math.floor(bets[k] * odds[i].win);
    if (kind === 'p' && (order[0] === i || order[1] === i)) p += Math.floor(bets[k] * odds[i].place);
  }
  return p;
}
export const sum = (b) => Object.values(b || {}).reduce((a, x) => a + x, 0);

// ---- the table -------------------------------------------------------------------------------------------------------
export function create({ seats, limits, now = Date.now(), rng }) {
  const s = { game: 'derby', v: 1, round: 1, phase: 'bet', wait: null, until: null, now, limits: { ...limits }, seats: seats.map(seat), hist: [], msg: '' };
  card(s, now, rng);
  return s;
}
function seat(x) { return { id: x.id, name: x.name, kind: x.kind || 'pilot', npc: x.npc || null, bets: {}, ready: false, result: null, left: false }; }
const pilots = (s) => s.seats.filter((x) => x.kind === 'pilot' && !x.left);

function card(s, now, rng) {
  s.runners = field(rng);
  s.odds = price(s.runners, rng);
  s.race = null; s.phase = 'bet'; s.until = null; s.wait = null;
  s.msg = 'RACE ' + s.round + ' · PLACE YOUR BETS';
  for (const x of s.seats) { x.bets = {}; x.ready = false; }
}
function off(s, now, rng) {
  const r = race(s.runners, rng, 1);
  // the trace is sampled every 0.5 s of race time; the screen plays it back over T.race
  const step = Math.max(1, Math.ceil(r.trace.length / 90));
  const trace = r.trace.filter((_, i) => i % step === 0 || i === r.trace.length - 1);
  s.race = { at: now, dur: T.race, order: r.order, trace };
  s.phase = 'race'; s.until = null; s.msg = "THEY'RE OFF";
  s.wait = now + T.race;
}

export function act(state, a, env) {
  const s = clone(state), now = env.now, x = s.seats.find((y) => y.id === a.seat);
  switch (a.t) {
    case 'join': if (!s.seats.some((y) => y.id === a.who.id)) s.seats.push(seat(a.who)); else s.seats.find((y) => y.id === a.who.id).left = false; break;
    case 'leave': if (!x) return null; x.left = true; if (s.phase === 'bet') { s.seats = s.seats.filter((y) => y !== x); maybeOff(s, now, env.rng); } break;
    case 'bets': {
      if (s.phase !== 'bet' || !x || x.ready) return null;
      for (const k in a.bets) {
        if (!/^[wp][0-5]$/.test(k) || !(a.bets[k] >= s.limits.min) || a.bets[k] > s.limits.max) return null;
      }
      x.bets = { ...a.bets }; x.ready = true;
      maybeOff(s, now, env.rng);
      if (s.phase === 'bet' && !s.until) { s.until = now + T.bets; s.wait = s.until; }
      break;
    }
    default: return null;
  }
  s.v++; s.now = now;
  return s;
}
function maybeOff(s, now, rng) { const ps = pilots(s); if (ps.some((x) => x.ready) && ps.every((x) => x.ready)) off(s, now, rng); }

export function tick(state, env) {
  const now = env.now;
  if (state.wait == null || now < state.wait) return null;
  const s = clone(state);
  s.now = now;
  if (s.phase === 'bet') { s.until = null; s.wait = null; if (pilots(s).some((x) => x.ready)) off(s, now, env.rng); }
  else if (s.phase === 'race') {
    for (const x of s.seats) {
      if (x.left || !Object.keys(x.bets).length) { x.result = null; continue; }
      const pay = pays(x.bets, s.odds, s.race.order), staked = sum(x.bets);
      x.result = { round: s.round, pay, staked, net: pay - staked };
    }
    const w = s.runners[s.race.order[0]];
    s.hist = [{ round: s.round, name: w.name, silk: w.silk, odds: s.odds[w.i].win }, ...s.hist].slice(0, 6);
    s.phase = 'result'; s.msg = w.name.toUpperCase() + ' WINS'; s.wait = now + T.result;
  } else if (s.phase === 'result') { s.round++; card(s, now, env.rng); }
  s.v++;
  return s;
}
export function view(s) { const v = { ...s, ifc: {} }; for (const x of s.seats) if (x.kind === 'pilot') v.ifc[x.id] = ifClosed(s, x.id); return v; }
export function ifClosed(s, id) {
  const x = s.seats.find((y) => y.id === id);
  if (!x || x.left) return 0;
  if (s.phase === 'bet') return x.ready ? sum(x.bets) : 0;
  if (s.phase === 'race') return pays(x.bets, s.odds, s.race.order);
  return x.result && x.result.round === s.round ? x.result.pay : 0;
}
export function adopt(v, env) { const s = clone(v); delete s.ifc; s.wait = Math.max(env.now + 400, s.wait || 0); return s; }
export { int };
