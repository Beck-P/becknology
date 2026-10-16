import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/games/craps.js';
import { seeded } from '../src/core/rng.js';

test('the come-out: 7 and 11 win the pass line, 2 3 12 lose it, bar 12 for the don\'t', () => {
  assert.equal(C.resolve({ pass: 10 }, null, 3, 4).pay, 20);
  assert.equal(C.resolve({ pass: 10 }, null, 5, 6).pay, 20);
  assert.deepEqual(C.resolve({ pass: 10 }, null, 1, 1).lost, { pass: 10 });
  assert.equal(C.resolve({ dp: 10 }, null, 1, 2).pay, 20);
  const bar = C.resolve({ dp: 10 }, null, 6, 6);
  assert.equal(bar.pay, 0); assert.equal(bar.bets.dp, 10, 'pushes: stays up');
  assert.deepEqual(C.resolve({ dp: 10 }, null, 5, 2).lost, { dp: 10 });
  const pt = C.resolve({ pass: 10 }, null, 2, 4);
  assert.equal(pt.pay, 0); assert.equal(pt.bets.pass, 10);
  assert.equal(C.nextPoint(null, 6), 6);
  assert.equal(C.nextPoint(null, 7), null);
});

test('on a point: made pays the line and true odds; seven out loses them', () => {
  const made = C.resolve({ pass: 10, po: 20 }, 4, 2, 2);
  assert.equal(made.wins.pass, 20); assert.equal(made.wins.po, 20 + 40);       // 2:1 on a 4
  const six = C.resolve({ pass: 10, po: 50 }, 6, 2, 4);
  assert.equal(six.wins.po, 50 + 60);                                          // 6:5 on a 6
  const five = C.resolve({ pass: 10, po: 40 }, 5, 1, 4);
  assert.equal(five.wins.po, 40 + 60);                                         // 3:2 on a 5
  const out = C.resolve({ pass: 10, po: 20, dp: 5, dpo: 12 }, 4, 3, 4);
  assert.deepEqual(Object.keys(out.lost).sort(), ['pass', 'po']);
  assert.equal(out.wins.dp, 10); assert.equal(out.wins.dpo, 12 + 6);           // lay 1:2 against a 4
  assert.equal(C.nextPoint(4, 7), null);
  assert.equal(C.nextPoint(4, 4), null);
  assert.equal(C.nextPoint(4, 9), 4);
});

test('come bets travel to their number; come odds are off on the come-out', () => {
  const r = C.resolve({ come: 10 }, 6, 4, 4);
  assert.equal(r.bets.c8, 10); assert.equal(r.moved.come, 'c8');
  const hit = C.resolve({ c8: 10, co8: 25 }, 6, 5, 3);
  assert.equal(hit.wins.c8, 20); assert.equal(hit.wins.co8, 25 + 30);
  const sevenOut = C.resolve({ c8: 10, co8: 25 }, 6, 3, 4);
  assert.deepEqual(Object.keys(sevenOut.lost).sort(), ['c8', 'co8']);
  const comeOut7 = C.resolve({ c8: 10, co8: 25 }, null, 3, 4);
  assert.deepEqual(comeOut7.lost, { c8: 10 }); assert.equal(comeOut7.wins.co8, 25, 'odds come back');
  const newCome = C.resolve({ come: 10, c8: 10 }, 5, 4, 4);
  assert.equal(newCome.wins.c8, 20); assert.equal(newCome.bets.c8, 10, 'the new come bet takes the 8 the old one just won on');
});

test('field, place bets, hardways and the centre', () => {
  assert.equal(C.resolve({ field: 10 }, null, 1, 1).pay, 30);
  assert.equal(C.resolve({ field: 10 }, null, 6, 6).pay, 30);
  assert.equal(C.resolve({ field: 10 }, null, 4, 5).pay, 20);
  assert.deepEqual(C.resolve({ field: 10 }, null, 3, 4).lost, { field: 10 });
  const p6 = C.resolve({ p6: 12 }, 8, 3, 3);
  assert.equal(p6.wins.p6, 14); assert.equal(p6.bets.p6, 12, 'a place bet stays up');
  assert.equal(C.resolve({ p4: 10 }, 5, 2, 2).wins.p4, 18);
  assert.equal(C.resolve({ p5: 10 }, 6, 1, 4).wins.p5, 14);
  assert.equal(C.resolve({ p6: 12 }, null, 3, 3).pay, 0, 'off on the come-out');
  assert.deepEqual(C.resolve({ p6: 12 }, 8, 3, 4).lost, { p6: 12 });
  assert.equal(C.resolve({ h8: 5 }, 6, 4, 4).wins.h8, 45);
  assert.deepEqual(C.resolve({ h8: 5 }, 6, 5, 3).lost, { h8: 5 });
  assert.equal(C.resolve({ any7: 5 }, null, 1, 6).pay, 25);
  assert.equal(C.resolve({ anyc: 5 }, null, 1, 2).pay, 40);
  assert.equal(C.resolve({ yo: 5 }, null, 5, 6).pay, 80);
});

test('the pass line keeps the house edge at 1.41% (exact over every roll)', () => {
  // the probability of winning a pass line bet, summed exactly
  const p = (t) => (6 - Math.abs(t - 7)) / 36;
  let win = p(7) + p(11);
  for (const pt of C.POINTS) win += p(pt) * (p(pt) / (p(pt) + p(7)));
  const edge = 1 - 2 * win;
  assert.ok(Math.abs(edge - 0.01414) < 0.0001, 'edge ' + edge);
  // and the odds are fair: true odds return exactly what they risk
  for (const pt of C.POINTS) {
    const r = C.resolve({ pass: 1, po: 60 }, pt, pt - 1 > 6 ? 6 : 1, pt - (pt - 1 > 6 ? 6 : 1));
    const pw = p(pt) / (p(pt) + p(7));
    assert.ok(Math.abs(pw * r.wins.po - 60) < 1e-9, 'odds on ' + pt + ' are fair');
  }
});

test('what can go down when', () => {
  const s = { point: null, limits: { min: 5, max: 500 } };
  assert.ok(C.canBet(s, {}, { pass: 10 }));
  assert.ok(!C.canBet(s, {}, { come: 10 }), 'no come bets on the come-out');
  assert.ok(!C.canBet(s, {}, { po: 10 }), 'no odds without a point');
  const on = { point: 6, limits: { min: 5, max: 500 } };
  assert.ok(!C.canBet(on, {}, { pass: 10 }), 'the line is closed once the point is on');
  assert.ok(C.canBet(on, { pass: 10 }, { po: 50 }), '5× odds on the 6');
  assert.ok(!C.canBet(on, { pass: 10 }, { po: 60 }));
  assert.ok(C.canBet(on, {}, { come: 10, field: 5, p8: 6 * 2 }));
  assert.ok(!C.canBet(on, {}, { field: 2 }), 'under the minimum');
});

test('a shooter keeps the dice until they seven out', () => {
  const rng = seeded(11);
  let s = C.create({ seats: [{ id: 'me', name: 'Me', kind: 'pilot', pos: 1 }, { id: 'v', name: 'Vega', kind: 'npc', npc: 'vega', pos: 0 }], limits: { min: 5, max: 500 }, now: 0, rng });
  const first = s.shooter;
  let now = 0, changes = 0, sevens = 0;
  for (let i = 0; i < 200; i++) {
    if (s.phase === 'bet') s = C.act(s, { t: 'ready', seat: 'me', adds: s.point == null && !s.seats.find((x) => x.id === 'me').bets.pass ? { pass: 5 } : {} }, { now: ++now, rng });
    else { now = s.wait; const was = { shooter: s.shooter, point: s.point }; s = C.tick(s, { now, rng }); if (s.phase === 'result') { const t = s.dice[0] + s.dice[1]; if (was.point != null && t === 7) { sevens++; assert.notEqual(s.shooter, was.shooter); } else assert.equal(s.shooter, was.shooter); if (s.shooter !== was.shooter) changes++; } }
  }
  assert.ok(first);
  assert.equal(changes, sevens, 'the dice only move on a seven-out');
});
