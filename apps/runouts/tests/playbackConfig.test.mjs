import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSingleTotalSteps,
  getPlaybackConfig,
  getPlaybackConfigDiagnostics,
} from '../src/playbackConfig.js';

function makePlayers(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Player ${index + 1}`,
  }));
}

test('single-mode step counts match gameplay expectations', () => {
  assert.equal(getSingleTotalSteps({ modeId: 'coin-flips', players: makePlayers(4) }), 20);
  assert.equal(getSingleTotalSteps({ modeId: 'horse-race', turns: Array.from({ length: 9 }) }), 9);
  assert.equal(getSingleTotalSteps({ modeId: 'battle-royale', players: makePlayers(4), eliminationOrder: ['Player 1', 'Player 2', 'Player 3'] }), 3);
  assert.equal(getSingleTotalSteps({ modeId: 'space-invaders', players: makePlayers(5), eliminationOrder: ['Player 1', 'Player 2', 'Player 3', 'Player 4'] }), 4);
  assert.equal(getSingleTotalSteps({ modeId: 'stock-market', players: makePlayers(4) }), 2);
});

test('tournament playback adds two summary steps per round', () => {
  const tournament = {
    isTournament: true,
    rounds: [
      { modeId: 'coin-flips', players: makePlayers(3) },
      { modeId: 'horse-race', turns: Array.from({ length: 6 }) },
    ],
  };

  assert.deepEqual(getPlaybackConfig(tournament), {
    totalSteps: (3 * 5 + 2) + (6 + 2),
  });
});

test('diagnostics stay quiet for valid playback results', () => {
  const stockResult = {
    modeId: 'stock-market',
    draftPhase: false,
    players: makePlayers(3).map((player, index) => ({
      ...player,
      prices: Array.from({ length: 60 }, (_, priceIndex) => 100 + index + priceIndex),
    })),
  };

  assert.deepEqual(getPlaybackConfigDiagnostics(stockResult), []);
  assert.deepEqual(
    getPlaybackConfigDiagnostics({
      modeId: 'coin-flips',
      players: makePlayers(2),
    }),
    [],
  );
});

test('diagnostics flag broken playback data before it reaches the UI', () => {
  assert.deepEqual(
    getPlaybackConfigDiagnostics({
      isTournament: true,
      rounds: [],
    }),
    ['invalid totalSteps: 0', 'tournament result is missing rounds'],
  );

  assert.deepEqual(
    getPlaybackConfigDiagnostics({
      modeId: 'stock-market',
      draftPhase: false,
      players: [
        { name: 'A', prices: [100, 101] },
        { name: 'B', prices: [100] },
      ],
    }),
    ['stock-market chart mode is missing full price history'],
  );
});
