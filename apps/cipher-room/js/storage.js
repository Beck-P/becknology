/**
 * localStorage helpers for The Cipher Room.
 * Stores: agent info, game state, completion history, stats.
 */

const CipherStorage = (function () {
  const PREFIX = 'cipher_room_';

  function get(key) {
    try {
      const val = localStorage.getItem(PREFIX + key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  function set(key, val) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(val));
    } catch { /* quota exceeded — silent fail */ }
  }

  // --- Agent ---
  function getAgent() { return get('agent'); }
  function setAgent(agent) { set('agent', agent); }

  // --- Game State (in-progress) ---
  function gameStateKey(dateStr, type) { return `state_${dateStr}_${type}`; }

  function saveGameState(dateStr, type, grid, elapsedMs) {
    set(gameStateKey(dateStr, type), { grid, elapsedMs, savedAt: Date.now() });
  }

  function loadGameState(dateStr, type) {
    return get(gameStateKey(dateStr, type));
  }

  // --- Completions ---
  function getCompletions() { return get('completions') || []; }

  function saveCompletion(dateStr, type, timeSeconds) {
    const completions = getCompletions();
    // Don't duplicate
    if (completions.find(c => c.date === dateStr && c.type === type)) return;
    completions.push({ date: dateStr, type, timeSeconds, completedAt: Date.now() });
    set('completions', completions);
    // Clear in-progress state
    localStorage.removeItem(PREFIX + gameStateKey(dateStr, type));
  }

  function isCompleted(dateStr, type) {
    return getCompletions().some(c => c.date === dateStr && c.type === type);
  }

  function getCompletionTime(dateStr, type) {
    const c = getCompletions().find(c => c.date === dateStr && c.type === type);
    return c ? c.timeSeconds : null;
  }

  // --- Stats ---
  function getBestTime(type) {
    const completions = getCompletions().filter(c => c.type === type);
    if (completions.length === 0) return null;
    return Math.min(...completions.map(c => c.timeSeconds));
  }

  function getStreak() {
    const completions = getCompletions().sort((a, b) => b.date.localeCompare(a.date));
    if (completions.length === 0) return 0;

    // Count consecutive days with at least one completion
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let checkDate = today;

    while (true) {
      const hasCompletion = completions.some(c => c.date === checkDate);
      if (!hasCompletion) {
        // Allow today to be incomplete (streak counts through yesterday)
        if (checkDate === today) {
          const d = new Date(checkDate);
          d.setDate(d.getDate() - 1);
          checkDate = d.toISOString().slice(0, 10);
          continue;
        }
        break;
      }
      streak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().slice(0, 10);
    }

    return streak;
  }

  function getTotalCompleted() {
    return getCompletions().length;
  }

  function getStats(type) {
    const completions = getCompletions().filter(c => c.type === type);
    return {
      total: completions.length,
      bestTime: completions.length > 0 ? Math.min(...completions.map(c => c.timeSeconds)) : null,
      avgTime: completions.length > 0 ? Math.round(completions.reduce((a, c) => a + c.timeSeconds, 0) / completions.length) : null,
    };
  }

  return {
    getAgent, setAgent,
    saveGameState, loadGameState,
    saveCompletion, isCompleted, getCompletionTime,
    getBestTime, getStreak, getTotalCompleted, getStats,
    getCompletions,
  };
})();
