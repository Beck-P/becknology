// Randomness for the Royale's tables. The house deals with crypto randomness (secureRandom); anything that must
// come out the same on two screens, or in a test, uses a seeded stream (seeded: mulberry32).

export function secureRandom() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  if (c && c.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
}

/** A seeded random stream (mulberry32): () => [0, 1). */
export function seeded(seed) {
  let s = (seed | 0) || 0x9e3779b9;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h | 0;
}

/** An integer in [0, n). */
export function int(rng, n) { return n <= 0 ? 0 : Math.min(n - 1, Math.floor(rng() * n)); }
export function pick(rng, list) { return list[int(rng, list.length)]; }
export function range(rng, a, b) { return a + rng() * (b - a); }

/** Fisher–Yates on a copy. */
export function shuffle(rng, items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(rng, i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** Pick an index by weight. */
export function weighted(rng, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}

export function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
