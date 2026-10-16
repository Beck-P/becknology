import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/games/roulette.js';
import { seeded } from '../src/core/rng.js';

test('the wheel: 37 pockets, 18 red, 18 black, one green', () => {
  assert.equal(R.WHEEL.length, 37);
  assert.equal(new Set(R.WHEEL).size, 37);
  assert.equal(R.WHEEL.filter((n) => R.colorOf(n) === 'red').length, 18);
  assert.equal(R.colorOf(0), 'green');
  assert.equal(R.colorOf(32), 'red');                       // next to zero, red
  assert.equal(R.colorOf(26), 'black');
});

test('payout table', () => {
  const table = {
    n17: 35, 'sp:17-20': 17, 'sp:17-18': 17, 'sp:0-2': 17, 'st:16': 11, 'tr:0-1-2': 11, 'co:17': 8, fo: 8, 'ln:16': 5,
    col1: 2, doz2: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1,
  };
  for (const k in table) assert.equal(R.odds(k), table[k], k);
  assert.deepEqual(R.covers('co:17'), [17, 18, 20, 21]);
  assert.deepEqual(R.covers('st:16'), [16, 17, 18]);
  assert.deepEqual(R.covers('col1').slice(0, 3), [1, 4, 7]);
  // not real bets
  for (const k of ['sp:3-4', 'sp:12-13', 'co:3', 'st:2', 'n37', 'ln:34', 'nope']) assert.equal(R.covers(k), null, k);
});

test('what bets return (stake included), and zero takes the even-money bets', () => {
  assert.equal(R.betPays('n17', 10, 17), 360);
  assert.equal(R.betPays('red', 10, 1), 20);
  assert.equal(R.betPays('red', 10, 0), 0);
  assert.equal(R.betPays('doz3', 5, 36), 15);
  assert.equal(R.betPays('co:17', 10, 21), 90);
  assert.equal(R.totalPays({ red: 10, n3: 5, black: 10 }, 3), 20 + 180);
});

test('every bet has the same 1/37 house edge', () => {
  const keys = ['n0', 'n17', 'sp:17-20', 'st:1', 'tr:0-2-3', 'co:32', 'fo', 'ln:31', 'col3', 'doz1', 'red', 'black', 'odd', 'even', 'low', 'high'];
  for (const k of keys) {
    let back = 0;
    for (let n = 0; n <= 36; n++) back += R.betPays(k, 1, n);
    assert.ok(Math.abs(back / 37 - 36 / 37) < 1e-9, k + ' returns 36/37');
  }
});

test('a spin: bets in, the wheel decides, the result pays', () => {
  const rng = seeded(5);
  let s = R.create({ seats: [{ id: 'me', name: 'Me', kind: 'pilot' }, { id: 'v', name: 'Vega', kind: 'npc', npc: 'vega' }], limits: { min: 1, max: 250 }, now: 0, rng });
  assert.equal(R.act(s, { t: 'bets', seat: 'me', bets: { 'sp:3-4': 5 } }, { now: 1, rng }), null, 'not a real split');
  assert.equal(R.act(s, { t: 'bets', seat: 'me', bets: { red: 500 } }, { now: 1, rng }), null, 'over the limit');
  s = R.act(s, { t: 'bets', seat: 'me', bets: { red: 10, n7: 2 } }, { now: 1, rng });
  assert.equal(s.phase, 'spin');
  const n = s.spin.n;
  assert.equal(R.ifClosed(s, 'me'), R.totalPays({ red: 10, n7: 2 }, n), 'once the ball is in, leaving settles it');
  s = R.tick(s, { now: s.wait, rng });
  assert.equal(s.phase, 'result');
  const r = s.seats[0].result;
  assert.equal(r.n, n);
  assert.equal(r.staked, 12);
  assert.equal(r.pay, R.totalPays({ red: 10, n7: 2 }, n));
  s = R.tick(s, { now: s.wait, rng });
  assert.equal(s.phase, 'bet');
  assert.equal(s.round, 2);
});
