export function getSingleTotalSteps(result) {
  switch (result?.modeId) {
    case "holdem":
    case "plo":
      return (result?.players?.length ?? 4) + 4;
    case "rng":
    case "dice":
    case "high-card":
    case "black-marble":
    case "slots":
      return (result?.players?.length ?? 4);
    case "wheel":
      return 2;
    case "coin-flips":
      return (result?.players?.length ?? 4) * 5;
    case "horse-race":
      return result?.turns?.length ?? 12;
    case "rocket":
      return 2;
    case "space-invaders":
      return result?.eliminationOrder?.length ?? Math.max((result?.players?.length ?? 4) - 1, 1);
    case "bomb":
      return 2;
    case "plinko":
      return result?.players?.length ?? 4;
    case "battle-royale":
      return result?.eliminationOrder?.length ?? Math.max((result?.players?.length ?? 4) - 1, 1);
    case "stock-market":
      return 2;
    default:
      return 1;
  }
}

export function getPlaybackConfig(result) {
  if (!result) return { totalSteps: 1 };
  if (!result.isTournament) {
    return { totalSteps: getSingleTotalSteps(result) };
  }
  const totalSteps = (result.rounds || []).reduce((sum, round) => sum + getSingleTotalSteps(round) + 2, 0);
  return { totalSteps };
}

export function getPlaybackConfigDiagnostics(result) {
  if (!result) return [];

  const issues = [];
  const totalSteps = getPlaybackConfig(result).totalSteps;

  if (!Number.isInteger(totalSteps) || totalSteps < 1) {
    issues.push(`invalid totalSteps: ${String(totalSteps)}`);
  }

  if (result.isTournament) {
    if (!Array.isArray(result.rounds) || result.rounds.length === 0) {
      issues.push('tournament result is missing rounds');
    }
    return issues;
  }

  switch (result.modeId) {
    case 'coin-flips': {
      const expected = (result.players?.length ?? 0) * 5;
      if (totalSteps !== expected) issues.push(`coin-flips expected ${expected} steps, got ${totalSteps}`);
      break;
    }
    case 'horse-race': {
      const expected = result.turns?.length ?? 0;
      if (totalSteps !== expected) issues.push(`horse-race expected ${expected} turns, got ${totalSteps}`);
      break;
    }
    case 'space-invaders':
    case 'battle-royale': {
      const expected = result.eliminationOrder?.length ?? Math.max((result.players?.length ?? 0) - 1, 0);
      if (totalSteps !== expected) issues.push(`${result.modeId} expected ${expected} eliminations, got ${totalSteps}`);
      break;
    }
    case 'stock-market':
      if (!result.draftPhase && !result.players?.every((player) => Array.isArray(player.prices) && player.prices.length >= 60)) {
        issues.push('stock-market chart mode is missing full price history');
      }
      break;
    default:
      break;
  }

  return issues;
}
