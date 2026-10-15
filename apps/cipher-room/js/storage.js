/**
 * localStorage helpers for the Enigma relay cipher terminal.
 * Stores: the leaderboard identity, game state, completion history, stats.
 * Dates are the player's LOCAL calendar day (YYYY-MM-DD), so the daily
 * intercepts turn over at local midnight, not UTC.
 */

const CipherStorage = (function () {
  const PREFIX = 'cipher_room_';

  /** Local calendar date as YYYY-MM-DD (d defaults to now). */
  function localDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** The day before a YYYY-MM-DD date, in local time. */
  function previousDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return localDate(new Date(y, m - 1, d - 1));
  }

  /** The Bridge pilot's name (the codename everywhere on the station), or ''. */
  function getPilotName() {
    try { return (localStorage.getItem('bridge_pilot') || '').trim(); } catch { return ''; }
  }

  /** The codename to play under: the Bridge pilot, else a codename set here. */
  function getCodename() {
    const pilot = getPilotName();
    if (pilot) return pilot;
    const agent = get('agent');
    return agent && agent.codename ? agent.codename : '';
  }

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
    try { localStorage.removeItem(PREFIX + gameStateKey(dateStr, type)); } catch { /* storage blocked */ }
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
    const completions = getCompletions();
    if (completions.length === 0) return 0;
    const days = new Set(completions.map(c => c.date));

    // Count consecutive local days with at least one completion.
    // Today may still be undecoded: then the streak counts through yesterday.
    const today = localDate();
    let checkDate = days.has(today) ? today : previousDate(today);
    let streak = 0;
    while (days.has(checkDate)) {
      streak++;
      checkDate = previousDate(checkDate);
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
    localDate, getPilotName, getCodename,
    getAgent, setAgent,
    saveGameState, loadGameState,
    saveCompletion, isCompleted, getCompletionTime,
    getBestTime, getStreak, getTotalCompleted, getStats,
    getCompletions,
  };
})();
