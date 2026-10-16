// Your recent wins, for the lobby's board (this browser).
const KEY = 'royale_wins';
export function recentWins() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; }
}
export function recordWin(game, amt) {
  if (!(amt > 0)) return;
  try {
    const list = [{ game, amt: Math.round(amt), t: Date.now() }, ...recentWins()].slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) { /* */ }
}
