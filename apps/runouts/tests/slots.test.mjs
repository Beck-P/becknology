import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/games/slots.js';
import { seeded } from '../src/core/rng.js';

// Return to player by simulation. Measured over 800,000 spins each (see games/slots.js): Neon 7s ≈ 94.6%,
// Starfall ≈ 95.5%, Koi Fortune ≈ 95.3%. Here a shorter run, with room for its noise.
for (const id of S.MACHINE_IDS) {
  test('RTP of ' + id + ' is fair but keeps a house edge', () => {
    const rng = seeded(2024 + id.length);
    const N = 120000, bet = 100;
    let back = 0, hits = 0;
    for (let i = 0; i < N; i++) { const r = S.play(id, bet, rng); back += r.pay; if (r.pay) hits++; }
    const rtp = back / (N * bet);
    assert.ok(rtp > 0.9 && rtp < 0.99, id + ' RTP ' + rtp.toFixed(4));
    assert.ok(hits / N > 0.2, id + ' hits often enough to be fun: ' + (hits / N).toFixed(3));
  });
}

test('a spin is decided in full when it is paid for', () => {
  const rng = seeded(7);
  let free = null, pick = null;
  for (let i = 0; i < 20000 && !(free && pick); i++) {
    const a = S.play('starfall', 20, rng); if (a.bonus && !free) free = a;
    const b = S.play('koi', 20, rng); if (b.bonus && !pick) pick = b;
  }
  assert.ok(free && free.bonus.kind === 'free' && free.bonus.spins.length >= 8);
  assert.equal(free.pay, free.win + free.bonus.spins.reduce((a, s) => a + s.win, 0));
  assert.ok(pick && pick.bonus.kind === 'pick' && pick.bonus.prizes.length === 9);
  assert.equal(pick.bonus.total, pick.bonus.prizes.slice(0, 3).reduce((a, b) => a + b, 0));
});

const col = (a, b, c) => [a, b, c];
test('neon 7s: crowns are wild and double the line; three crowns are the jackpot', () => {
  const P = S.MACHINES.neon7.pays;
  const mid = (g) => S.lineWins('neon7', g).find((w) => w.line === 0);
  assert.equal(mid([col('blank', 'seven', 'blank'), col('blank', 'seven', 'blank'), col('blank', 'seven', 'blank')]).pay, P.seven);
  assert.equal(mid([col('blank', 'seven', 'blank'), col('blank', 'crown', 'blank'), col('blank', 'seven', 'blank')]).pay, P.seven * 2);
  assert.equal(mid([col('blank', 'crown', 'blank'), col('blank', 'crown', 'blank'), col('blank', 'seven', 'blank')]).pay, P.seven * 4);
  assert.equal(mid([col('blank', 'crown', 'blank'), col('blank', 'crown', 'blank'), col('blank', 'crown', 'blank')]).pay, P.crown);
  assert.equal(mid([col('blank', 'bar', 'blank'), col('blank', 'bar3', 'blank'), col('blank', 'bar2', 'blank')]).pay, P.anybar);
  assert.equal(mid([col('blank', 'cherry', 'blank'), col('blank', 'cherry', 'blank'), col('blank', 'bell', 'blank')]).pay, P.cherry2);
  assert.equal(mid([col('blank', 'bell', 'blank'), col('blank', 'cherry', 'blank'), col('blank', 'cherry', 'blank')]), undefined, 'cherries count from the left');
});

test('video reels: wilds stand in from the left, a run of wilds pays as wilds', () => {
  const P = S.MACHINES.starfall.pays;
  const g = (syms) => syms.map((x) => ['J', x, 'Q']);
  const mid = (gr) => S.lineWins('starfall', gr).find((w) => w.line === 0);
  assert.equal(mid(g(['planet', 'star', 'planet', 'A', 'K'])).pay, P.planet[0]);
  assert.equal(mid(g(['star', 'star', 'planet', 'planet', 'K'])).pay, P.planet[1]);
  assert.equal(mid(g(['star', 'star', 'star', 'star', 'star'])).pay, P.star[2]);
  assert.equal(mid(g(['star', 'star', 'star', 'J', 'K'])).pay, Math.max(P.star[0], P.J[1]));
  assert.equal(mid(g(['A', 'K', 'A', 'A', 'A'])), undefined, 'a line pays from the first reel');
  assert.equal(S.MACHINES.starfall.lines.length, 20);
  assert.equal(S.MACHINES.koi.lines.length, 10);
});
