import test from 'node:test';
import assert from 'node:assert/strict';
import * as BJ from '../src/games/blackjack.js';
import { seeded } from '../src/core/rng.js';

const C = (r, s = 's') => ({ r, s, id: Math.random(), up: true });
const hand = (rs, bet = 10, extra = {}) => ({ cards: rs.map((r) => C(r)), bet, split: false, ...extra });

test('totals: aces count soft, then hard', () => {
  assert.deepEqual(BJ.total([C(14), C(6)]), { t: 17, soft: true });
  assert.deepEqual(BJ.total([C(14), C(6), C(10)]), { t: 17, soft: false });
  assert.deepEqual(BJ.total([C(14), C(14), C(9)]), { t: 21, soft: true });
  assert.equal(BJ.total([C(13), C(12), C(2)]).t, 22);
  assert.ok(BJ.isBJ([C(14), C(11)]));
  assert.ok(!BJ.isBJ([C(14), C(5), C(5)]));
});

test('payouts: blackjack 3:2, wins 1:1, pushes, busts, dealer blackjack', () => {
  const d20 = [C(10), C(13)], d21bj = [C(14), C(12)], dBust = [C(10), C(6), C(9)];
  assert.deepEqual(BJ.handPay(hand([14, 13]), d20), { out: 'bj', pay: 25 });
  assert.deepEqual(BJ.handPay(hand([14, 13], 5), d20), { out: 'bj', pay: 12 });          // 7.50 rounds down
  assert.deepEqual(BJ.handPay(hand([10, 10]), d20), { out: 'push', pay: 10 });
  assert.deepEqual(BJ.handPay(hand([10, 9]), d20), { out: 'lose', pay: 0 });
  assert.deepEqual(BJ.handPay(hand([10, 9]), dBust), { out: 'win', pay: 20 });
  assert.deepEqual(BJ.handPay(hand([10, 6, 9]), dBust), { out: 'bust', pay: 0 });       // the player busts first
  assert.deepEqual(BJ.handPay(hand([10, 11]), d21bj), { out: 'lose', pay: 0 });
  assert.deepEqual(BJ.handPay(hand([14, 10]), d21bj), { out: 'push', pay: 10 });
  assert.deepEqual(BJ.handPay(hand([14, 10], 10, { split: true }), d20), { out: 'win', pay: 20 });   // 21 after a split isn't blackjack
  assert.deepEqual(BJ.handPay(hand([5, 6], 20), [C(10), C(7)]), { out: 'lose', pay: 0 });
});

test('basic strategy: a few textbook spots', () => {
  const up = (r) => C(r);
  assert.equal(BJ.basic(hand([10, 6]), up(10)), 'hit');
  assert.equal(BJ.basic(hand([10, 6]), up(6)), 'stand');
  assert.equal(BJ.basic(hand([6, 5]), up(10)), 'double');
  assert.equal(BJ.basic(hand([6, 5]), up(14)), 'hit');
  assert.equal(BJ.basic(hand([8, 8]), up(10)), 'split');
  assert.equal(BJ.basic(hand([14, 14]), up(6)), 'split');
  assert.equal(BJ.basic(hand([10, 10]), up(6)), 'stand');
  assert.equal(BJ.basic(hand([14, 7]), up(9)), 'hit');
  assert.equal(BJ.basic(hand([14, 7]), up(4)), 'double');
  assert.equal(BJ.basic(hand([10, 2]), up(4)), 'stand');
});

// drive a table: rig the shoe so the cards come out as listed (the shoe deals from its end)
function rigged(cards, seats = [{ id: 'me', name: 'Me', kind: 'pilot', pos: 2 }]) {
  const rng = seeded(1);
  const s = BJ.create({ seats, limits: { min: 5, max: 500 }, now: 0, rng });
  s.shoe = [...cards.map((r) => ({ r, s: 'h', id: Math.random() }))].reverse().concat([]);
  s.shoe = [...Array.from({ length: 200 }, () => ({ r: 2, s: 'c', id: Math.random() })), ...s.shoe];
  return { s, rng };
}
function run(s, rng, until, now = 0) {
  let guard = 0;
  while (!until(s) && guard++ < 200) {
    now = Math.max(now + 1, s.wait ?? now + 1);
    const n = BJ.tick(s, { now, rng });
    if (n) s = n;
  }
  return s;
}

test('a round: deal, stand, the dealer draws to 17 and stands on soft 17', () => {
  // order: me, dealer up, me, dealer hole; then the dealer's draws
  let { s, rng } = rigged([10, 6, 9, 14]);               // me 10+9 = 19; dealer 6 + A = soft 17: stands
  s = BJ.act(s, { t: 'bet', seat: 'me', amount: 10 }, { now: 1, rng });
  assert.equal(s.phase, 'deal');
  s = run(s, rng, (x) => x.phase === 'play');
  assert.equal(BJ.total(s.seats[0].hands[0].cards).t, 19);
  s = BJ.act(s, { t: 'stand', seat: 'me' }, { now: 5000, rng });
  s = run(s, rng, (x) => x.phase === 'settle', 5000);
  assert.equal(s.dealer.cards.length, 2, 'stood on soft 17');
  assert.equal(s.seats[0].result.pay, 20);
  assert.equal(s.seats[0].result.net, 10);
});

test('double and split put the right money on the table', () => {
  let { s, rng } = rigged([8, 10, 8, 7, 3, 10, 2]);       // me 8,8 vs 10 up; split: 8+3 (doubles to 21), 8+2; dealer hole 7 → 17
  s = BJ.act(s, { t: 'bet', seat: 'me', amount: 10 }, { now: 1, rng });
  s = run(s, rng, (x) => x.phase === 'play');
  s = BJ.act(s, { t: 'split', seat: 'me' }, { now: 9000, rng });
  assert.equal(s.seats[0].hands.length, 2);
  assert.equal(BJ.total(s.seats[0].hands[0].cards).t, 11);
  s = BJ.act(s, { t: 'double', seat: 'me' }, { now: 9001, rng });   // 8+3 doubles, gets a 10 → 21
  assert.equal(s.seats[0].hands[0].bet, 20);
  assert.equal(BJ.total(s.seats[0].hands[0].cards).t, 21);
  // second hand 8+2: stand on 10 then dealer 10+7 = 17
  s = BJ.act(s, { t: 'stand', seat: 'me' }, { now: 9002, rng });
  s = run(s, rng, (x) => x.phase === 'settle', 9002);
  const r = s.seats[0].result;
  assert.equal(r.staked, 30);
  assert.equal(r.pay, 40);                                   // the doubled 21 wins 40, the 10 loses
});

test('insurance pays 2:1 when the dealer has blackjack', () => {
  let { s, rng } = rigged([10, 14, 9, 13]);               // me 19, dealer A up, K in the hole
  s = BJ.act(s, { t: 'bet', seat: 'me', amount: 20 }, { now: 1, rng });
  s = run(s, rng, (x) => x.phase === 'insurance');
  assert.equal(BJ.ifClosed(s, 'me'), 0, 'walking away uninsured: the dealer\'s blackjack takes the bet');
  s = BJ.act(s, { t: 'ins', seat: 'me', take: true }, { now: 6000, rng });
  assert.equal(s.phase, 'settle');
  assert.equal(s.seats[0].result.staked, 30);
  assert.equal(s.seats[0].result.pay, 30);
  assert.equal(s.seats[0].result.ins, 'won');
});

test('walking away mid-hand stands and plays the round out; before the deal the bet comes back', () => {
  let { s, rng } = rigged([10, 6, 2, 10, 10]);            // me 12 vs 6 up, 10 in the hole; the dealer's next card 10 busts
  assert.equal(BJ.ifClosed(s, 'me'), 0);
  s = BJ.act(s, { t: 'bet', seat: 'me', amount: 10 }, { now: 1, rng });
  assert.equal(BJ.ifClosed(s, 'me'), 20, 'the deal is under way: the shoe already decides it');
  s = run(s, rng, (x) => x.phase === 'play');
  assert.equal(BJ.ifClosed(s, 'me'), 20, 'stands on 12, the dealer busts');
  assert.equal(s.phase, 'play', 'the real table is untouched');
  assert.equal(BJ.view(s, 'me').ifc.me, 20, 'the host works it out for every pilot');
  assert.equal(BJ.ifClosed(BJ.view(s, 'me'), 'me'), 10, 'a view without the shoe can only give the stake back');
  assert.equal(BJ.view(s, 'me').dealer.cards[1].r, undefined, 'the hole card is hidden');
});

test('two pilots: the first bet starts the clock, both ready deals at once', () => {
  const rng = seeded(3);
  let s = BJ.create({ seats: [{ id: 'a', name: 'A', kind: 'pilot', pos: 1 }, { id: 'b', name: 'B', kind: 'pilot', pos: 3 }, { id: 'n', name: 'Duke', kind: 'npc', npc: 'duke', pos: 4 }], limits: { min: 5, max: 500 }, now: 0, rng });
  assert.ok(s.seats[2].bet > 0, 'the regular has a bet down');
  s = BJ.act(s, { t: 'bet', seat: 'a', amount: 25 }, { now: 10, rng });
  assert.equal(s.phase, 'bet');
  assert.ok(s.until > 10);
  s = BJ.act(s, { t: 'bet', seat: 'b', amount: 50 }, { now: 20, rng });
  assert.equal(s.phase, 'deal');
  let now = 50000, guard = 0;
  while (s.phase !== 'settle' && guard++ < 100) {
    const t = s.turn && s.seats.find((y) => y.id === s.turn.s);
    if (t && t.kind === 'pilot') s = BJ.act(s, { t: 'stand', seat: t.id }, { now: now++, rng });
    else { now = Math.max(now + 1, s.wait ?? now + 1); s = BJ.tick(s, { now, rng }) || s; }
  }
  assert.equal(s.phase, 'settle');
  for (const id of ['a', 'b']) { const r = s.seats.find((y) => y.id === id).result; assert.ok(r && r.staked > 0 && r.pay >= 0); }
});

test('the house keeps an edge over basic strategy (simulated)', () => {
  const rng = seeded(99);
  let s = BJ.create({ seats: [{ id: 'me', name: 'Me', kind: 'pilot', pos: 2 }], limits: { min: 10, max: 500 }, now: 0, rng });
  let staked = 0, paid = 0, now = 0;
  for (let r = 0; r < 4000; r++) {
    s = BJ.act(s, { t: 'bet', seat: 'me', amount: 10 }, { now: ++now, rng });
    let guard = 0;
    while (s.phase !== 'settle' && guard++ < 60) {
      const me = s.seats[0];
      if (s.phase === 'insurance') { s = BJ.act(s, { t: 'ins', seat: 'me', take: false }, { now: ++now, rng }); continue; }
      if (s.phase === 'play' && s.turn && s.turn.s === 'me') {
        const L = BJ.legal(s, me), h = me.hands[s.turn.h];
        let m = BJ.basic(h, s.dealer.cards[0], { canDouble: L.double, canSplit: L.split });
        if (!L[m]) m = m === 'double' ? 'hit' : 'stand';
        s = BJ.act(s, { t: m, seat: 'me' }, { now: ++now, rng });
        continue;
      }
      now = Math.max(now + 1, s.wait ?? now + 1);
      s = BJ.tick(s, { now, rng }) || s;
    }
    staked += s.seats[0].result.staked; paid += s.seats[0].result.pay;
    now = Math.max(now + 1, s.wait); s = BJ.tick(s, { now, rng });
  }
  const rtp = paid / staked;
  assert.ok(rtp > 0.95 && rtp < 1.03, 'basic strategy returns about 99.5% (got ' + rtp.toFixed(4) + ')');
});
