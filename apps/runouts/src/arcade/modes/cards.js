// Playing cards in pixels: a face (rank in the corner, the suit under it), a back (the house's red diamonds), and
// the seats round the card table.
import { PAL, text, suit, clamp, ease } from "../kit.js";

const RANK = { 11: "J", 12: "Q", 13: "K", 14: "A", 10: "10" };
export const rankLabel = (r) => RANK[r] || String(r);

/** A card at (x, y) top-left, w × h; flip 0..1 turns it over (0 = back, 1 = face) with a squeeze through the middle. */
export function card(ctx, x, y, c, flip = 1, w = 13, h = 18, glow = null) {
  const f = clamp(flip, 0, 1), face = f >= 0.5, sx = Math.abs(Math.cos(f * Math.PI));
  const cw = Math.max(1, Math.round(w * sx)), ox = Math.round((w - cw) / 2);
  x = Math.round(x) + ox; y = Math.round(y);
  if (glow) { ctx.fillStyle = glow; ctx.fillRect(x - 2, y - 2, cw + 4, h + 4); }
  ctx.fillStyle = PAL.ink; ctx.fillRect(x - 1, y - 1, cw + 2, h + 2);
  if (!face || !c) {
    ctx.fillStyle = "#b02030"; ctx.fillRect(x, y, cw, h);
    ctx.fillStyle = "#d84050";
    for (let j = 1; j < h - 1; j += 3) for (let i = 1 + ((j / 3) % 2); i < cw - 1; i += 3) ctx.fillRect(x + i, y + j, 1, 1);
    if (cw > 4) { ctx.fillStyle = "#f0c0c8"; ctx.fillRect(x + 1, y + 1, cw - 2, 1); }
    return;
  }
  ctx.fillStyle = PAL.cream; ctx.fillRect(x, y, cw, h);
  if (cw < w - 2) return;
  const red = c.suit === "h" || c.suit === "d", col = red ? "#d02a3a" : PAL.ink;
  const r = rankLabel(c.rank);
  if (r === "10") { text(ctx, "1", x + 1, y + 1, col); text(ctx, "0", x + 5, y + 1, col); }
  else text(ctx, r, x + 1, y + 1, col);
  if (h >= 22) suit(ctx, c.suit, x + Math.round(w / 2) - 2, y + 11, col, 1);
  else suit(ctx, c.suit, x + w - 6, y + h - 8, col, 1);
}

/** Where the players stand round the card table (tiles): along the back, then the ends, then the near side. */
export function seatsAround(n, a) {
  const [cx, cr] = a.centre, rx = a.rx, ry = a.ry;
  const back = n <= 5 ? n : 4, ends = n <= 5 ? 0 : 2, front = Math.max(0, n - back - ends);
  const out = [];
  for (let i = 0; i < back; i++) out.push({ x: back === 1 ? cx : cx - rx * 0.78 + (rx * 1.56 * i) / (back - 1), r: cr - ry - 0.3, facing: "down" });
  if (ends) { out.push({ x: cx - rx - 0.45, r: cr + 0.1, facing: "right" }); out.push({ x: cx + rx + 0.45, r: cr + 0.1, facing: "left" }); }
  for (let i = 0; i < front; i++) out.push({ x: front === 1 ? cx : cx - rx * 0.5 + (rx * 1.0 * i) / (front - 1), r: cr + ry + 0.55, facing: "up" });
  return out;
}

/** The hands along the bottom: a panel per player with their cards (and a line under), laid out to fit. */
export function handStrip(ctx, s, list, opts) {
  const n = list.length, cardW = opts.cardW || 13, cardH = opts.cardH || 18, ncards = opts.ncards || 2, over = opts.overlap || 3;
  const handW = cardW + (ncards - 1) * (cardW - over);
  const pw = Math.max(handW + 8, n <= 6 ? 64 : 44), rows = n * (pw + 4) > 470 ? 2 : 1, perRow = Math.ceil(n / rows);
  const ph = cardH + 22, y0 = 270 - rows * (ph + 3) - 2;
  ctx.fillStyle = "rgba(8,4,24,0.86)";
  ctx.fillRect(0, y0 - 3, 480, 270 - y0 + 3);
  ctx.fillStyle = PAL.pink; ctx.fillRect(0, y0 - 3, 480, 1);
  const boxes = [];
  for (let k = 0; k < n; k++) {
    const rr = Math.floor(k / perRow), cnt = Math.min(perRow, n - rr * perRow), ci = k - rr * perRow;
    const tw = cnt * (pw + 4) - 4, x = Math.round(240 - tw / 2 + ci * (pw + 4)), y = y0 + rr * (ph + 3);
    boxes.push({ x, y, w: pw, h: ph, cx: x + Math.round((pw - handW) / 2), cy: y + 11 });
  }
  return { boxes, handW, cardW, cardH, over };
}

export { ease };
