// The derby, the rocket and the runouts.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../src/games/derby.js';
import * as K from '../src/games/crash.js';
import * as R from '../src/games/runouts.js';
import { seeded } from '../src/core/rng.js';

test('derby: the book has a margin, the race finishes in a full order', () => {
  const rng = seeded(31);
  for (let k = 0; k < 4; k++) {
    const f = D.field(rng), odds = D.price(f, rng, 800);
    const book = odds.reduce((a, o) => a + 1 / o.win, 0);
    assert.ok(book > 1.05 && book < 1.3, 'overround ' + book.toFixed(3));
    const r = D.race(f, rng, 1);
    assert.deepEqual(r.order.slice().sort(), [0, 1, 2, 3, 4, 5]);
    assert.ok(r.trace.length > 20);
  }
});

test('derby: win and place bets pay at the odds', () => {
  const odds = [{ win: 3.5, place: 1.6 }, { win: 5, place: 2 }, { win: 8, place: 3 }, { win: 9, place: 3.5 }, { win: 12, place: 4 }, { win: 20, place: 6 }];
  assert.equal(D.pays({ w0: 10 }, odds, [0, 1, 2, 3, 4, 5]), 35);
  assert.equal(D.pays({ p1: 10, w1: 10 }, odds, [0, 1, 2, 3, 4, 5]), 20);
  assert.equal(D.pays({ w2: 10, p2: 10 }, odds, [0, 1, 2, 3, 4, 5]), 0);
});

test('derby: a win bet returns about 88% at the offered odds (priced and raced independently)', () => {
  const rng = seeded(5), rng2 = seeded(55);
  let er = 0, n = 0;
  for (let i = 0; i < 25; i++) {
    const f = D.field(rng), odds = D.price(f, rng, 800), truth = D.price(f, rng2, 1500);
    for (let k = 0; k < 6; k++) { er += truth[k].pWin * odds[k].win; n++; }
  }
  const ret = er / n;
  assert.ok(ret > 0.8 && ret < 0.96, 'a win bet returns ' + ret.toFixed(3));
});

test('crash: P(reaching m) = 0.96 / m', () => {
  const rng = seeded(6);
  const N = 200000;
  let two = 0, ten = 0, one = 0;
  for (let i = 0; i < N; i++) { const c = K.crashPoint(rng); if (c >= 2) two++; if (c >= 10) ten++; if (c === 1) one++; }
  assert.ok(Math.abs(two / N - 0.48) < 0.01, '≥2×: ' + two / N);
  assert.ok(Math.abs(ten / N - 0.096) < 0.005, '≥10×: ' + ten / N);
  assert.ok(Math.abs(one / N - 0.0495) < 0.005, 'busts at 1.00×: ' + one / N);     // 4% on the pad, ~1% more under 1.01×
  assert.equal(K.multAt(0), 1);
  assert.ok(Math.abs(K.multAt(K.timeFor(2)) - 2) < 0.02);
});

test('crash: a cash-out pays bet × multiplier, missing it loses; auto cash-out works', () => {
  const rng = seeded(1);
  let s = K.create({ seats: [{ id: 'a', name: 'A', kind: 'pilot' }, { id: 'b', name: 'B', kind: 'pilot' }], limits: { min: 1, max: 500 }, now: 0, rng });
  s = K.act(s, { t: 'bet', seat: 'a', amount: 10 }, { now: 1, rng });
  s = K.act(s, { t: 'bet', seat: 'b', amount: 10, auto: 1.5 }, { now: 2, rng });
  assert.equal(s.phase, 'fly');
  s.flight.crash = 3; s.flight.dur = K.timeFor(3); s.wait = s.flight.at + s.flight.dur;
  const t2 = s.flight.at + K.timeFor(2) + 5;
  assert.equal(K.ifClosed(s, 'a', t2), 20, 'walking away cashes out where it is');
  s = K.act(s, { t: 'cash', seat: 'a', at: 2 }, { now: t2, rng });
  assert.equal(K.act(s, { t: 'cash', seat: 'a', at: 2.5 }, { now: t2 + 100, rng }), null, 'once only');
  s = K.tick(s, { now: s.wait, rng });
  assert.equal(s.phase, 'boom');
  assert.equal(s.seats[0].result.pay, 20);
  assert.equal(s.seats[1].result.pay, 15);
  assert.equal(K.act(K.create({ seats: [{ id: 'a', kind: 'pilot' }], limits: { min: 5, max: 50 }, now: 0, rng }), { t: 'bet', seat: 'a', amount: 1 }, { now: 1, rng }), null);
});

test('runouts: every mode ranks every player exactly once', () => {
  const rng = seeded(77);
  for (const m of R.MODE_IDS) {
    for (let k = 0; k < 25; k++) {
      const r = R.run(m, 4, rng);
      assert.deepEqual(r.order.slice().sort(), [0, 1, 2, 3], m);
      assert.ok(r.dur > 2000 && r.dur < 20000, m + ' runs ' + r.dur);
      assert.ok(r.script, m);
    }
  }
});

test('runouts: the old mode ids are all here', () => {
  const ids = ['holdem', 'plo', 'rng', 'wheel', 'dice', 'high-card', 'coin-flips', 'black-marble', 'slots', 'horse-race', 'rocket', 'space-invaders', 'bomb', 'plinko', 'battle-royale', 'stock-market'];
  assert.deepEqual(R.MODE_IDS.slice().sort(), ids.slice().sort());
});

test('runouts: win, safe and last pay with a house edge; each player is equally likely', () => {
  assert.equal(R.pays({ w0: 10 }, [0, 1, 2, 3]), 38);
  assert.equal(R.pays({ s0: 10, s3: 10 }, [0, 1, 2, 3]), 12);
  assert.equal(R.pays({ l3: 10 }, [0, 1, 2, 3]), 38);
  const rng = seeded(12);
  for (const m of ['dice', 'wheel', 'holdem', 'bomb']) {
    const first = [0, 0, 0, 0];
    for (let k = 0; k < 4000; k++) first[R.run(m, 4, rng).order[0]]++;
    for (const f of first) assert.ok(Math.abs(f / 4000 - 0.25) < 0.035, m + ' is fair to every seat: ' + first);
  }
  assert.ok(0.25 * R.PAYS.w < 1 && 0.75 * R.PAYS.s < 1);
});

test('runouts: a round at the table', () => {
  const rng = seeded(3);
  const lineup = [{ id: 'me', name: 'Me', kind: 'pilot' }, { id: 'vega', name: 'Vega', kind: 'npc' }, { id: 'duke', name: 'Duke', kind: 'npc' }, { id: 'moth', name: 'Moth', kind: 'npc' }];
  let s = R.create({ seats: [{ id: 'me', name: 'Me', kind: 'pilot' }], lineup, mode: 'dice', limits: { min: 5, max: 500 }, now: 0, rng });
  assert.equal(s.mode, 'dice');
  s = R.act(s, { t: 'bets', seat: 'me', bets: { w0: 10, s0: 10 } }, { now: 1, rng });
  assert.equal(s.phase, 'play');
  const owed = R.ifClosed(s, 'me');
  s = R.tick(s, { now: s.wait, rng });
  assert.equal(s.phase, 'result');
  assert.equal(s.seats[0].result.pay, owed);
  assert.equal(s.seats[0].result.staked, 20);
});
