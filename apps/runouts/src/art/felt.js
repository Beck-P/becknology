// The tables themselves: felt in four colours (green, blue, crimson, the high-roller room's black-violet), padded
// leather rails with a gold pinstripe, the dealer's chip tray and shoe. Shapes are filled row by row on the pixel
// grid with dithered bands for the light falling off toward the rail — no smooth gradients on the furniture.
import { PAL, FELTS, baked, text, textW, disc } from './pix.js';

const RAIL = { a: '#2a1208', b: '#4a2412', c: '#6e3a1e', d: '#160904', gold: '#c8a048', gold2: '#7a5a20' };
const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
/** A felt colour for a normalised distance from the centre (0 centre … 1 edge), dithered between bands. */
export function feltAt(F, d, x, y) {
  const b = bayer[y & 3][x & 3] / 16;
  const v = d * 3 + b * 0.9 - 0.45;
  return v < 1 ? F.a : v < 2 ? F.b : v < 2.75 ? F.c : F.d;
}

/** Fill the area under an ellipse's span function with felt (rows from y0 to y1; span(y) → [xl, xr] or null). */
function fillRows(g, F, y0, y1, span, cx, cy, rx, ry) {
  for (let y = y0; y <= y1; y++) {
    const s = span(y);
    if (!s) continue;
    const [xl, xr] = s;
    for (let x = xl; x <= xr; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      g.fillStyle = feltAt(F, Math.sqrt(dx * dx + dy * dy), x, y);
      g.fillRect(x, y, 1, 1);
    }
  }
}
const halfW = (rx, ry, dy) => { const k = 1 - (dy * dy) / (ry * ry); return k <= 0 ? -1 : Math.floor(rx * Math.sqrt(k)); };

/**
 * A blackjack table: the straight edge across the top (the dealer's side), the curved rail round the bottom.
 * → { img, cx, top, rx, ry } — the felt's ellipse is centred on (cx, top).
 */
export function halfMoon(W, H, felt, opts = {}) {
  const F = FELTS[felt] || FELTS.green;
  const top = opts.top ?? 30, rail = opts.rail ?? 7;
  const cx = Math.floor(W / 2), rx = Math.floor(W / 2) - 4, ry = H - top - 3;
  const img = baked('halfmoon' + W + 'x' + H + felt + top, W, H, (g) => {
    // the rail: leather round the curve, gold pinstripe on the inside
    for (let y = top; y < H; y++) {
      const w = halfW(rx, ry, y - top);
      if (w < 0) continue;
      const wi = halfW(rx - rail, ry - rail, y - top);
      g.fillStyle = RAIL.d; g.fillRect(cx - w - 1, y, (w + 1) * 2 + 1, 1);
      g.fillStyle = RAIL.b; g.fillRect(cx - w, y, w * 2 + 1, 1);
      if (wi >= 0) {
        const outer = w - wi;
        g.fillStyle = RAIL.c; g.fillRect(cx - w + 1, y, Math.max(1, Math.floor(outer / 3)), 1); g.fillRect(cx + w - Math.max(1, Math.floor(outer / 3)), y, Math.max(1, Math.floor(outer / 3)), 1);
      }
    }
    // the rail's highlight along the bottom of the curve
    for (let x = cx - rx + 6; x <= cx + rx - 6; x++) {
      const dx = (x - cx) / rx, k = 1 - dx * dx;
      if (k <= 0) continue;
      const y = Math.floor(top + ry * Math.sqrt(k));
      g.fillStyle = RAIL.c; g.fillRect(x, y - 2, 1, 1);
      g.fillStyle = RAIL.a; g.fillRect(x, y, 1, 1);
    }
    // gold pinstripe, then the felt inside it
    const frx = rx - rail, fry = ry - rail;
    for (let y = top; y <= top + fry; y++) {
      const w = halfW(frx, fry, y - top);
      if (w < 0) continue;
      g.fillStyle = RAIL.gold; g.fillRect(cx - w, y, w * 2 + 1, 1);
    }
    fillRows(g, F, top, top + fry - 1, (y) => { const w = halfW(frx - 1, fry - 1, y - top); return w < 0 ? null : [cx - w, cx + w]; }, cx, top + fry * 0.32, frx * 0.95, fry * 0.95);
    // the dealer's edge: a padded strip with a gold line
    g.fillStyle = RAIL.d; g.fillRect(cx - rx - 1, top - 4, (rx + 1) * 2 + 1, 5);
    g.fillStyle = RAIL.b; g.fillRect(cx - rx, top - 3, rx * 2 + 1, 3);
    g.fillStyle = RAIL.c; g.fillRect(cx - rx, top - 3, rx * 2 + 1, 1);
    g.fillStyle = RAIL.gold; g.fillRect(cx - rx + rail, top, (rx - rail) * 2 + 1, 1);
    // the printing on the felt
    if (opts.print) opts.print(g, { cx, top, rx: frx, ry: fry, F });
  });
  return { img, cx, top, rx: rx - rail, ry: ry - rail, F };
}

/** An oval poker table seen from the player's seat. → { img, cx, cy, rx, ry } (the felt). */
export function oval(W, H, felt, opts = {}) {
  const F = FELTS[felt] || FELTS.green;
  const cx = Math.floor(W / 2), cy = Math.floor(opts.cy ?? H * 0.47), rx = Math.floor(opts.rx ?? W * 0.44), ry = Math.floor(opts.ry ?? H * 0.34), rail = opts.rail ?? 8;
  const img = baked('oval' + W + 'x' + H + felt + cx + cy + rx + ry, W, H, (g) => {
    // shadow under the table
    for (let y = -ry - rail; y <= ry + rail + 6; y++) { const w = halfW(rx + rail + 2, ry + rail + 2, y - 4); if (w >= 0) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(cx - w, cy + y + 4, w * 2 + 1, 1); } }
    for (let y = -ry - rail; y <= ry + rail; y++) {
      const w = halfW(rx + rail, ry + rail, y);
      if (w < 0) continue;
      g.fillStyle = RAIL.d; g.fillRect(cx - w - 1, cy + y, (w + 1) * 2 + 1, 1);
      g.fillStyle = y < 0 ? RAIL.c : RAIL.b; g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
    for (let y = -ry - rail + 2; y <= ry + rail - 2; y++) {
      const w = halfW(rx + rail - 2, ry + rail - 2, y);
      if (w < 0) continue;
      g.fillStyle = y < -ry * 0.4 ? RAIL.c : RAIL.b; g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
    for (let y = -ry - 1; y <= ry + 1; y++) { const w = halfW(rx + 1, ry + 1, y); if (w >= 0) { g.fillStyle = RAIL.gold; g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
    fillRows(g, F, cy - ry, cy + ry, (y) => { const w = halfW(rx, ry, y - cy); return w < 0 ? null : [cx - w, cx + w]; }, cx, cy, rx, ry);
    // an inner line round the felt
    for (let y = -ry + 9; y <= ry - 9; y++) {
      const w = halfW(rx - 14, ry - 9, y);
      if (w < 0) continue;
      const wn = halfW(rx - 14, ry - 9, y + (y < 0 ? -1 : 1));
      g.fillStyle = F.line;
      if (wn < 0 || Math.abs(y) >= ry - 10) g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
      else { g.fillRect(cx - w, cy + y, Math.max(1, w - wn), 1); g.fillRect(cx + w - Math.max(1, w - wn) + 1, cy + y, Math.max(1, w - wn), 1); }
    }
    if (opts.print) opts.print(g, { cx, cy, rx, ry, F });
  });
  return { img, cx, cy, rx, ry, F };
}

/** A flat rectangular layout table (roulette, craps): felt with a rail all round. */
export function slab(W, H, felt, x, y, w, h, rail = 6) {
  const F = FELTS[felt] || FELTS.green;
  return baked('slab' + [W, H, felt, x, y, w, h].join(':'), W, H, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x - rail + 2, y - rail + 4, w + rail * 2, h + rail * 2);
    g.fillStyle = RAIL.d; g.fillRect(x - rail, y - rail, w + rail * 2, h + rail * 2);
    g.fillStyle = RAIL.b; g.fillRect(x - rail + 1, y - rail + 1, w + rail * 2 - 2, h + rail * 2 - 2);
    g.fillStyle = RAIL.c; g.fillRect(x - rail + 1, y - rail + 1, w + rail * 2 - 2, 2);
    g.fillStyle = RAIL.a; g.fillRect(x - rail + 1, y + h + rail - 2, w + rail * 2 - 2, 1);
    g.fillStyle = RAIL.gold; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const dx = (xx - x - w / 2) / (w / 2), dy = (yy - y - h / 2) / (h / 2);
      g.fillStyle = feltAt(F, Math.max(Math.abs(dx) * 0.9, Math.abs(dy) * 0.9) * 0.95, xx, yy);
      g.fillRect(xx, yy, 1, 1);
    }
  });
}

/** Text printed on the felt: centred, in the felt's ink. */
export function print(g, s, x, y, col, o = {}) { g.globalAlpha = o.alpha ?? 0.85; text(g, s, x, y, col, { align: 'center', scale: o.scale || 1 }); g.globalAlpha = 1; }
export { textW };

/** The dealer's chip tray: columns of chips in their colours. */
export function tray(ctx, x, y, w) {
  const cols = ['#ece8f4', '#d8283c', '#1e9a56', '#22222e', '#7a38c8', '#e8b830'];
  ctx.fillStyle = RAIL.d; ctx.fillRect(x - 1, y - 1, w + 2, 10);
  ctx.fillStyle = '#1a0e08'; ctx.fillRect(x, y, w, 8);
  const n = Math.floor((w - 2) / 6);
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length];
    ctx.fillStyle = c; ctx.fillRect(x + 1 + i * 6, y + 1, 5, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1 + i * 6, y + 1, 5, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let k = 2; k < 7; k += 2) ctx.fillRect(x + 1 + i * 6, y + k, 5, 1);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, w, 1);
}
/** The card shoe (and how full it is). */
export function shoe(ctx, x, y, frac = 1) {
  ctx.fillStyle = PAL.ink; ctx.fillRect(x - 1, y - 1, 28, 18);
  ctx.fillStyle = '#3a1c4a'; ctx.fillRect(x, y, 26, 16);
  ctx.fillStyle = '#5a2c6c'; ctx.fillRect(x, y, 26, 2);
  ctx.fillStyle = PAL.gold2; ctx.fillRect(x + 2, y + 3, 22, 1);
  const n = Math.max(1, Math.round(frac * 9));
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#2a0c3c' : '#6a2a80'; ctx.fillRect(x + 4 + i * 2, y + 5, 2, 9); }
  ctx.fillStyle = PAL.cream; ctx.fillRect(x + 3, y + 5, 1, 9);
  ctx.fillStyle = PAL.gold; ctx.fillRect(x + 24, y + 4, 1, 11);
}
/** A betting circle printed on the felt. */
export function betRing(ctx, x, y, r, col, o = {}) {
  const ry = Math.round(r * 0.62);
  for (let a = 0; a < 64; a++) {
    if (o.dashed && a % 4 === 3) continue;
    const t = (a / 64) * Math.PI * 2;
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x + Math.cos(t) * r), Math.round(y + Math.sin(t) * ry), 1, 1);
  }
  if (o.fill) { ctx.globalAlpha = o.fillA || 0.18; disc(ctx, x, y, r - 1, o.fill, ry - 1); ctx.globalAlpha = 1; }
}
