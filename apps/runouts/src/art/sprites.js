// Cards, chips and dice, drawn once into small canvases and kept.
import { PAL, sprite, baked, text, small, disc, ring, ease, clamp } from './pix.js';
import { rankLabel } from '../core/cards.js';
import { CHIPS, chipStack } from '../core/tables.js';

// ---- cards (22 × 30; small 15 × 21) -----------------------------------------------------------------------------------
export const CW = 22, CH = 30, SW = 15, SH = 21;
const PIP7 = {
  s: ['...#...', '..###..', '.#####.', '#######', '#######', '.#.#.#.', '...#...'],
  c: ['..###..', '..###..', '##.#.##', '#######', '##.#.##', '...#...', '..###..'],
  h: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  d: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
};
const PIP5 = {
  s: ['..#..', '.###.', '#####', '#####', '..#..'],
  c: ['.###.', '.###.', '#####', '#.#.#', '..#..'],
  h: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  d: ['..#..', '.###.', '#####', '.###.', '..#..'],
};
const BIG = {
  s: ['.....#.....', '....###....', '...#####...', '..#######..', '.#########.', '###########', '###########', '.####.####.', '.....#.....', '....###....'],
  c: ['....###....', '...#####...', '...#####...', '....###....', '.###.#.###.', '###########', '###########', '.###.#.###.', '.....#.....', '....###....'],
  h: ['.###...###.', '#####.#####', '###########', '###########', '###########', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....'],
  d: ['.....#.....', '....###....', '...#####...', '..#######..', '.#########.', '###########', '.#########.', '..#######..', '...#####...', '....###....', '.....#.....'],
};
export const SUIT_COL = { s: '#1c1830', c: '#1c1830', h: '#d02a3a', d: '#d02a3a' };
const SUIT_HI = { s: '#4a4470', c: '#4a4470', h: '#ff6a78', d: '#ff6a78' };

function pipSprite(set, name, s, col) { return sprite(name + s + col, set[s], { '#': col }); }

function cardBase(g, w, h, fill = PAL.cream) {
  g.fillStyle = PAL.ink; g.fillRect(1, 0, w - 2, h); g.fillRect(0, 1, w, h - 2);
  g.fillStyle = fill; g.fillRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#ffffff'; g.fillRect(2, 1, w - 4, 1);
  g.fillStyle = '#d8d0c0'; g.fillRect(2, h - 2, w - 4, 1); g.fillRect(w - 2, 2, 1, h - 4);
}
// a face card: a little crowned figure in the suit's colour, framed in gold
function court(g, x, y, r, s) {
  const col = SUIT_COL[s], hi = SUIT_HI[s];
  g.fillStyle = PAL.gold2; g.fillRect(x, y, 14, 16);
  g.fillStyle = '#efe4c8'; g.fillRect(x + 1, y + 1, 12, 14);
  const P = { k: col, h: hi, g: PAL.gold, G: PAL.gold2, f: '#f0c8a0', e: PAL.ink, w: '#ffffff', r: '#c83040' };
  const rows = {
    13: ['..g.g.g...', '..ggggg...', '..fffff...', '..fefef...', '..fffff...', '..ffwff...', '.kkhkhkk..', 'kkkhkkhkk.', 'kkgkkkgkk.', 'kkkkGkkkk.', 'kk.kkk.kk.'],
    12: ['...gGg....', '..ggggg...', '.hfffffh..', '.hfefefh..', '.hfffffh..', '.hffrffh..', '.kkhkhkk..', 'kkkkgkkkk.', 'kkhkkkhkk.', 'kkkkgkkkk.', 'kk.kkk.kk.'],
    11: ['...kkk....', '..kkkkkG..', '..fffff...', '..fefef...', '..fffff...', '..ffwff...', '.kkgkgkk..', 'kkkkhkkkk.', 'kkgkkkgkk.', 'kkkkhkkkk.', 'kk.kkk.kk.'],
  }[r];
  g.drawImage(sprite('court' + r + s, rows, P), x + 2, y + 3);
}
/** A card face. small: the 15 × 21 card. */
export function cardFace(c, isSmall = false) {
  const w = isSmall ? SW : CW, h = isSmall ? SH : CH;
  return baked('card' + (isSmall ? 's' : '') + c.r + c.s, w, h, (g) => {
    cardBase(g, w, h);
    const col = SUIT_COL[c.s], lab = rankLabel(c.r);
    if (isSmall) {
      if (lab === '10') { small(g, '10', 2, 2, col); } else text(g, lab, 2, 2, col);
      g.drawImage(pipSprite(PIP5, 'p5', c.s, col), 2, 11);
      g.drawImage(pipSprite(PIP7, 'p7', c.s, col), w - 9, h - 9);
      return;
    }
    if (lab === '10') { text(g, '1', 1, 2, col); text(g, '0', 6, 2, col); } else text(g, lab, 2, 2, col);
    g.drawImage(pipSprite(PIP5, 'p5', c.s, col), 2, 11);
    if (c.r >= 11 && c.r <= 13) court(g, 6, 11, c.r, c.s);
    else {
      const big = sprite('big' + c.s + col, BIG[c.s], { '#': col });
      g.drawImage(big, Math.round((w - big.width) / 2) + 2, c.r === 14 ? 12 : 13);
      if (c.r === 14) { g.fillStyle = PAL.gold; g.fillRect(w - 5, h - 5, 2, 2); }
    }
  });
}
/** The house's card back: velvet, gold border, a neon crown. */
export function cardBack(isSmall = false) {
  const w = isSmall ? SW : CW, h = isSmall ? SH : CH;
  return baked('back' + (isSmall ? 's' : ''), w, h, (g) => {
    cardBase(g, w, h, '#3a1450');
    g.fillStyle = PAL.gold2; g.fillRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#2a0c3c'; g.fillRect(3, 3, w - 6, h - 6);
    for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) {
      const d = (x + y) % 4, e = (x - y + 40) % 4;
      if (d === 0 || e === 0) { g.fillStyle = (x + y) % 8 === 0 ? '#f078a8' : '#6a2a80'; g.fillRect(x, y, 1, 1); }
    }
    const crown = ['#.#.#', '#####', '#####'];
    const cr = sprite('backcrown', crown, { '#': PAL.gold3 });
    g.fillStyle = '#2a0c3c'; g.fillRect(Math.round(w / 2) - 4, Math.round(h / 2) - 3, 9, 6);
    g.drawImage(cr, Math.round(w / 2) - 2, Math.round(h / 2) - 1);
  });
}
/** Draw a card at x, y (top-left). flip: 0 = back … 1 = face (squeezes through the edge). */
export function drawCard(ctx, c, x, y, o = {}) {
  const f = o.flip == null ? 1 : clamp(o.flip, 0, 1), face = f >= 0.5 && c && c.r;
  const img = face ? cardFace(c, o.small) : cardBack(o.small);
  const sx = Math.max(0.08, Math.abs(Math.cos(f * Math.PI)));
  const w = img.width, h = img.height, cw = Math.max(1, Math.round(w * sx));
  x = Math.round(x); y = Math.round(y);
  if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + Math.round((w - cw) / 2) + 1, y + 2, cw, h); }
  if (o.lift) y -= o.lift;
  ctx.drawImage(img, 0, 0, w, h, x + Math.round((w - cw) / 2), y, cw, h);
  if (o.glow) { ctx.fillStyle = o.glow; ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillRect(x - 1, y + h, w + 2, 1); ctx.fillRect(x - 1, y, 1, h); ctx.fillRect(x + w, y, 1, h); }
  if (o.dim) { ctx.fillStyle = 'rgba(8,4,24,' + o.dim + ')'; ctx.fillRect(x + Math.round((w - cw) / 2), y, cw, h); }
}

// ---- chips --------------------------------------------------------------------------------------------------------------
/** A chip on the felt, seen at the tables' angle: 12 × 9 (top 12 × 7, a 2 px edge). */
const CHIP_ROWS = [
  '...kkkkkk...',
  '.kkllleffkk.',
  'kfllffffffdk',
  'keffffffffek',
  'kfffffffffdk',
  '.kkffeefdkk.',
  'kdeddddeddek',
  '.kkkkkkkkkk.',
];
const darker = (hex, k = 0.62) => { const n = parseInt(hex.slice(1), 16); const c = (s) => Math.round(((n >> s) & 255) * k); return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')'; };
/** A chip on the felt, seen at the tables' angle: 12 × 8 (its top face, then a 2 px edge with stripes). */
export function chipSprite(ch) {
  return sprite('chip8' + ch.v, CHIP_ROWS, { k: PAL.ink, f: ch.face, l: ch.lit, e: ch.edge, d: darker(ch.face) });
}
/** A stack of chips for an amount, bottom centre at (x, y). Returns the top y. */
export function drawStack(ctx, amount, x, y, o = {}) {
  if (!(amount > 0)) return y;
  const list = chipStack(amount, o.max || 10);
  let top = y;
  list.forEach((ch, i) => {
    const img = chipSprite(ch);
    const jx = o.neat ? 0 : [0, 1, 0, -1][(i * 3 + Math.round(amount)) % 4];
    ctx.drawImage(img, Math.round(x - 6) + jx, Math.round(y - 8 - i * 2));
    top = y - 8 - i * 2;
  });
  if (o.label !== false) {
    const s = typeof o.label === 'string' ? o.label : short(amount);
    const w = s.length * 4 + 3;
    const ly = o.labelBelow ? y + 2 : top - 8;
    ctx.fillStyle = 'rgba(8,4,24,0.85)'; ctx.fillRect(Math.round(x - w / 2), ly, w, 7);
    small(ctx, s, x, ly + 1, o.labelCol || PAL.gold3, { align: 'center' });
  }
  return top;
}
function short(n) { return n >= 10000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (Math.round(n / 100) / 10 + 'K').replace('.0K', 'K') : String(n); }
export { short as chipShort };

/** A chip for the rack (DOM): 26 × 26 top-down with the denomination on it. */
export function rackChip(ch, size = 26) {
  return baked('rack' + ch.v + ':' + size, size, size, (g) => {
    const c = size / 2 - 0.5, r = size / 2 - 0.5;
    disc(g, c, c + 1, r, 'rgba(0,0,0,0.5)');
    disc(g, c, c, r, PAL.ink);
    disc(g, c, c, r - 1, ch.face);
    // edge spots
    g.fillStyle = ch.edge;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.round(c + Math.cos(a) * (r - 3)), y = Math.round(c + Math.sin(a) * (r - 3));
      g.fillRect(x - 1, y - 1, 3, 3);
    }
    disc(g, c, c, r - 6, ch.edge);
    disc(g, c, c, r - 7, ch.face);
    disc(g, c - 1, c - 2, r - 10, ch.lit);
    disc(g, c, c, r - 9, ch.face);
    const lab = ch.label;
    small(g, lab, c + 0.5, c - 2, ch.ink, { align: 'center' });
  });
}
export { CHIPS };

// ---- dice ---------------------------------------------------------------------------------------------------------------
const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
const DICE = { red: { a: '#d02838', b: '#a01828', c: '#ff6070', pip: '#fff4f0' }, ivory: { a: '#f4f0e6', b: '#c8c0b0', c: '#ffffff', pip: '#1c1830' }, gold: { a: '#e8c050', b: '#a07820', c: '#fff0a0', pip: '#3a2008' } };
/** A die face, 11 × 11 (a 2 px side under it). */
export function dieFace(n, style = 'red') {
  const P = DICE[style];
  return baked('die' + style + n, 11, 12, (g) => {
    g.fillStyle = PAL.ink; g.fillRect(1, 0, 9, 12); g.fillRect(0, 1, 11, 10);
    g.fillStyle = P.b; g.fillRect(1, 1, 9, 10);
    g.fillStyle = P.a; g.fillRect(1, 1, 9, 8);
    g.fillStyle = P.c; g.fillRect(2, 1, 7, 1);
    g.fillStyle = P.pip;
    for (const [px, py] of PIPS[n]) g.fillRect(2 + px * 3, [2, 4, 7][py], 2, 2);
  });
}
/** A die caught mid-tumble (turned 45°): 13 × 13. */
export function dieSpin(k, style = 'red') {
  const P = DICE[style];
  return baked('dspin' + style + k, 13, 13, (g) => {
    const c = 6;
    for (let y = 0; y < 13; y++) {
      const w = 6 - Math.abs(y - c);
      g.fillStyle = PAL.ink; g.fillRect(c - w - 1 < 0 ? 0 : c - w - 1, y, (w + 1) * 2 + 1 > 13 ? 13 : (w + 1) * 2 + 1, 1);
      g.fillStyle = y > c ? P.b : P.a; g.fillRect(c - w, y, w * 2 + 1, 1);
    }
    g.fillStyle = P.pip;
    const pts = k % 2 ? [[6, 6]] : [[4, 4], [8, 8], [6, 6]];
    for (const [x, y] of pts) g.fillRect(x, y, 1, 1);
  });
}

// ---- motion helpers ------------------------------------------------------------------------------------------------------
/** Where something flying from a to b is at time t (0..1), with an arc. */
export function arc(ax, ay, bx, by, t, lift = 12) {
  const e = ease.out(t);
  return [ax + (bx - ax) * e, ay + (by - ay) * e - Math.sin(clamp(t, 0, 1) * Math.PI) * lift];
}
