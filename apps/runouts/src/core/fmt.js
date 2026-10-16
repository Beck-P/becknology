export const num = (n) => Math.round(n || 0).toLocaleString('en-US');
export function short(n) {
  n = Math.round(n || 0);
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return num(n);
}
export const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + num(Math.abs(n));
export const mult = (m) => m.toFixed(2) + '×';
