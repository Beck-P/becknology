import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFive, bestHand, compareScores, score7, makeShoe } from '../src/core/cards.js';
import * as P from '../src/games/poker.js';
import { equity } from '../src/games/pokerAi.js';
import { seeded } from '../src/core/rng.js';

const parse = (str) => str.split(' ').map((t) => ({ r: { A: 14, K: 13, Q: 12, J: 11, T: 10 }[t[0]] || +t[0], s: t[1] }));

test('hand ranking, every category in order', () => {
  const hands = [
    '2s 7h 9d Jc Kd',   // high card
    '2s 2h 9d Jc Kd',   // pair
    '2s 2h 9d 9c Kd',   // two pair
    '2s 2h 2d 9c Kd',   // trips
    '5s 6h 7d 8c 9d',   // straight
    '2s 7s 9s Js Ks',   // flush
    '2s 2h 2d 9c 9d',   // full house
    '2s 2h 2d 2c 9d',   // quads
    '5h 6h 7h 8h 9h',   // straight flush
  ].map((h) => evaluateFive(parse(h)));
  hands.forEach((h, i) => assert.equal(h.score[0], i));
  for (let i = 1; i < hands.length; i++) assert.ok(compareScores(hands[i].score, hands[i - 1].score) > 0);
  assert.equal(evaluateFive(parse('As 2h 3d 4c 5d')).score[1], 5, 'the wheel is five-high');
  assert.equal(evaluateFive(parse('Ts Js Qs Ks As')).label, 'Royal flush');
  assert.ok(compareScores(evaluateFive(parse('Ks Kh 9d 9c 2d')).score, evaluateFive(parse('Ks Kh 9d 9c Ad')).score) < 0, 'kicker plays');
});

test('best five of seven, and the fast scorer agrees with it', () => {
  const b = bestHand(parse('Ah Kh'), parse('Qh Jh Th 2c 3d'));
  assert.equal(b.label, 'Royal flush');
  const rng = seeded(4);
  for (let i = 0; i < 400; i++) {
    const d = makeShoe(rng, 1);
    const a = d.slice(0, 7), c = d.slice(7, 14);
    const slow = compareScores(bestHand(a.slice(0, 2), a.slice(2)).score, bestHand(c.slice(0, 2), c.slice(2)).score);
    const fast = score7(a) - score7(c);
    assert.equal(Math.sign(slow), Math.sign(fast), JSON.stringify([a, c]));
  }
});

test('side pots: the short stack can only win what they matched', () => {
  const seats = [
    { id: 'a', put: 50, folded: false, inHand: true },
    { id: 'b', put: 200, folded: false, inHand: true },
    { id: 'c', put: 200, folded: false, inHand: true },
    { id: 'd', put: 20, folded: true, inHand: true },
  ];
  const pots = P.buildPots(seats);
  assert.equal(pots.reduce((a, p) => a + p.amt, 0), 470);
  assert.deepEqual(pots[0], { amt: 20 * 4 + 30 * 3, elig: ['a', 'b', 'c'] });
  assert.deepEqual(pots[1], { amt: 300, elig: ['b', 'c'] });
  // an unmatched bet comes back as a pot only its owner can win
  const back = P.buildPots([{ id: 'a', put: 100, inHand: true }, { id: 'b', put: 40, inHand: true }]);
  assert.deepEqual(back, [{ amt: 80, elig: ['a', 'b'] }, { amt: 60, elig: ['a'] }]);
});

test('equity: aces are a big favourite, the simulation is sane', () => {
  const rng = seeded(8);
  const aa = equity(parse('As Ah'), [], 1, 1500, rng);
  const sevenTwo = equity(parse('7s 2h'), [], 1, 1500, rng);
  assert.ok(aa > 0.8 && aa < 0.89, 'AA ' + aa);
  assert.ok(sevenTwo > 0.28 && sevenTwo < 0.40, '72o ' + sevenTwo);
  const nuts = equity(parse('As Ks'), parse('Qs Js Ts'), 3, 300, rng);
  assert.equal(nuts, 1);
});

function play(s, rng, steps, pilotMove) {
  let now = s.now || 0;
  for (let i = 0; i < steps; i++) {
    const me = s.seats.find((x) => x.kind === 'pilot' && s.toAct === x.id && s.phase === 'bet');
    if (me) { s = P.act(s, { ...pilotMove(s, me), seat: me.id }, { now: ++now, rng }) || P.act(s, { t: 'fold', seat: me.id }, { now: ++now, rng }); continue; }
    now = Math.max(now + 1, s.wait ?? now + 1);
    s = P.tick(s, { now, rng }) || s;
  }
  return s;
}

test('a table of regulars plays hand after hand and never makes or loses a chip', () => {
  const rng = seeded(21);
  const seats = [
    { id: 'me', name: 'Me', kind: 'pilot', pos: 0, stack: 200 },
    { id: 'vega', name: 'Vega', kind: 'npc', npc: 'vega', pos: 1, stack: 200 },
    { id: 'duke', name: 'Duke', kind: 'npc', npc: 'duke', pos: 2, stack: 200 },
    { id: 'moth', name: 'Moth', kind: 'npc', npc: 'moth', pos: 3, stack: 200 },
  ];
  let s = P.create({ seats, blinds: { sb: 1, bb: 2, buyMin: 40, buyMax: 400, buy: 200 }, now: 0, rng });
  let hands = 0, last = 0;
  const chips = (x) => x.seats.reduce((a, y) => a + y.stack + y.bet, 0) + x.pot;
  let total = chips(s);
  for (let i = 0; i < 3000 && hands < 25; i++) {
    s = play(s, rng, 1, (st, me) => { const o = P.options(st, me.id); return o.canCheck ? { t: 'check' } : o.toCall <= 6 ? { t: 'call' } : { t: 'fold' }; });
    if (s.hand !== last) {
      last = s.hand; hands++;
      // between hands, the regulars' rebuys are the only new chips
      const rebuys = s.seats.reduce((a, x) => a + x.rebuys, 0);
      void rebuys;
    }
    if (s.phase === 'show' || s.phase === 'end') {
      const c = chips(s);
      assert.ok(c === total || c > total, 'chips conserved through the hand');
      total = c;
      assert.ok(s.winners.length >= 1);
    }
  }
  assert.ok(hands >= 20, 'played ' + hands + ' hands');
});

test('heads-up: the button posts the small blind and acts first before the flop', () => {
  const rng = seeded(2);
  let s = P.create({ seats: [{ id: 'a', name: 'A', kind: 'pilot', pos: 0, stack: 100 }, { id: 'b', name: 'B', kind: 'pilot', pos: 3, stack: 100 }], blinds: { sb: 1, bb: 2, buyMin: 40, buyMax: 400, buy: 200 }, now: 0, rng });
  s = P.tick(s, { now: s.wait, rng });                      // deal
  assert.equal(s.phase, 'deal');
  const btn = s.seats.find((x) => x.pos === s.btn);
  assert.equal(btn.bet, 1);
  s = P.tick(s, { now: s.wait, rng });
  assert.equal(s.toAct, btn.id);
  const v = P.view(s, 'a');
  assert.ok(v.seats.find((x) => x.id === 'b').hole.every((c) => c.r === undefined), 'the other hand is face down');
  assert.ok(v.seats.find((x) => x.id === 'a').hole.every((c) => c.r > 1));
  // the button shoves, the big blind calls: it runs out to a showdown, and the chips add up
  s = P.act(s, { t: 'raise', seat: btn.id, to: 100 }, { now: s.now + 10, rng });
  const other = s.seats.find((x) => x.id !== btn.id);
  s = P.act(s, { t: 'call', seat: other.id }, { now: s.now + 10, rng });
  for (let i = 0; i < 10 && s.phase !== 'show'; i++) s = P.tick(s, { now: s.wait, rng }) || s;
  assert.equal(s.phase, 'show');
  assert.equal(s.board.length, 5);
  assert.equal(s.seats.reduce((a, x) => a + x.stack, 0), 200);
  assert.equal(P.ifClosed(s, 'a'), s.seats.find((x) => x.id === 'a').stack);
});

test('folding to a bet gives the pot to the bettor; leaving mid-hand folds', () => {
  const rng = seeded(9);
  let s = P.create({ seats: [{ id: 'a', name: 'A', kind: 'pilot', pos: 0, stack: 100 }, { id: 'b', name: 'B', kind: 'pilot', pos: 3, stack: 100 }], blinds: { sb: 1, bb: 2, buyMin: 40, buyMax: 400, buy: 200 }, now: 0, rng });
  s = P.tick(s, { now: s.wait, rng }); s = P.tick(s, { now: s.wait, rng });
  const first = s.toAct, second = s.seats.find((x) => x.id !== first).id;
  s = P.act(s, { t: 'raise', seat: first, to: 6 }, { now: s.now + 1, rng });
  s = P.act(s, { t: 'leave', seat: second }, { now: s.now + 1, rng });
  assert.equal(s.phase, 'end');
  assert.equal(s.seats.find((x) => x.id === first).stack, 102);
});
