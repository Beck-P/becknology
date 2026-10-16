// People at the tables: the Bridge's own character sheets (32 × 48 frames; rows down/right/up/left, columns idle
// 0-3 then walk 0-7), so the dealers and regulars look like the folk out in Arcadia.
import { PAL, text, textW } from './pix.js';

const imgs = new Map();
export function sheet(name) {
  if (!imgs.has(name)) {
    const e = { img: new Image(), ready: false, failed: false };
    e.img.onload = () => { e.ready = true; };
    e.img.onerror = () => { e.failed = true; };
    e.img.src = '/bridge/assets/characters/' + name + '.png';
    imgs.set(name, e);
  }
  return imgs.get(name);
}
export const PILOT_SHEETS = ['pilot-runner-red', 'pilot-runner-cyan'];

/**
 * A figure standing (or sitting) behind something, feet at (x, footY). o.t: seconds (idle bob), o.row: facing
 * (0 down), o.clip: only draw rows above this y (a table edge hides the rest), o.mood: 'cheer' | 'slump'.
 */
export function figure(ctx, name, x, footY, o = {}) {
  const s = sheet(name);
  if (!s.ready) return false;
  const t = o.t || 0;
  let col = [0, 1, 2, 1][Math.floor(t * 2.9 + (o.phase || 0)) % 4], dy = 0;
  if (o.mood === 'cheer') { dy = -Math.round(Math.abs(Math.sin(t * 8)) * 3); col = 4 + (Math.floor(t * 10) % 8); }
  if (o.mood === 'slump') dy = 1;
  const sx = col * 32, sy = (o.row || 0) * 48;
  const dx = Math.round(x - 16), top = Math.round(footY - 45 + dy);
  let h = 48;
  if (o.clip != null) h = Math.max(0, Math.min(48, Math.round(o.clip - top)));
  if (h <= 0) return true;
  ctx.drawImage(s.img, sx, sy, 32, h, dx, top, 32, h);
  if (o.mood === 'slump') { ctx.fillStyle = 'rgba(20,10,40,0.3)'; ctx.fillRect(dx + 6, top + 10, 20, Math.min(h, 34)); }
  return true;
}

/** A name plate: dark pill with a coloured underline. lit: filled with the colour (their turn). */
export function plate(ctx, name, x, y, col, o = {}) {
  const s = String(name).toUpperCase().slice(0, o.max || 9);
  const w = textW(s) + 6;
  let x0 = Math.round(x - w / 2);
  if (o.W) x0 = Math.max(1, Math.min(o.W - w - 1, x0));
  const y0 = Math.round(y);
  x = x0 + w / 2;
  ctx.fillStyle = o.lit ? col : 'rgba(8,4,24,0.88)';
  ctx.fillRect(x0, y0, w, 11);
  ctx.fillStyle = o.lit ? PAL.white : col; ctx.fillRect(x0, y0 + 10, w, 1);
  text(ctx, s, x, y0 + 2, o.lit ? PAL.ink : (o.fg || PAL.white), { align: 'center' });
  return w;
}
