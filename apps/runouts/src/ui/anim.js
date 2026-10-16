// Small helpers for animating a table from its state: everything moves from the moment the screen first saw it
// (a card dealt, a hand settled), so a host and a guest each play the same motion on their own clocks.
import { PAL, FX, small } from '../art/pix.js';

export class Memo {
  constructor() { this.seen = new Map(); this.fx = new FX(); this.floats = []; }
  /** When this key was first seen (performance time, seconds). */
  at(key, t) { if (!this.seen.has(key)) this.seen.set(key, t); return this.seen.get(key); }
  has(key) { return this.seen.has(key); }
  forget(prefix) { for (const k of this.seen.keys()) if (k.startsWith(prefix)) this.seen.delete(k); }
  /** A number floating up off the felt (+120 / −25). */
  float(x, y, s, col, t) { this.floats.push({ x, y, s, col, t }); }
  drawFloats(ctx, t) {
    this.floats = this.floats.filter((f) => t - f.t < 1.8);
    for (const f of this.floats) {
      const k = (t - f.t) / 1.8, y = f.y - k * 22;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      const w = String(f.s).length * 4 + 3;
      ctx.fillStyle = 'rgba(8,4,24,0.85)'; ctx.fillRect(Math.round(f.x - w / 2), Math.round(y) - 1, w, 7);
      small(ctx, f.s, f.x, Math.round(y), f.col || PAL.green, { align: 'center' });
      ctx.globalAlpha = 1;
    }
  }
}
/** 0 → 1 over dur seconds from t0 (clamped). */
export const prog = (t, t0, dur) => (t0 == null ? 1 : Math.max(0, Math.min(1, (t - t0) / dur)));
