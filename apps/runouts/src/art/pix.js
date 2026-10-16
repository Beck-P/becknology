// The Royale's pixel kit: everything on the tables is drawn into a small native canvas and scaled up by a whole
// number (ui/Stage.jsx), like the Bridge's world. The 5×7 font is the Bridge arcade kit's; the palette is
// Arcadia's neon (Bridge CLAUDE.md) with the casino's velvet, gold and felt.

export const PAL = {
  ink: '#0c0814', void: '#080418', velvet: '#1c0c2c', velvet2: '#2a1240', plum: '#3a1840', metal: '#1a1530', metal2: '#2a2a3e',
  gold: '#e0c060', gold2: '#a08040', gold3: '#fff0a8', brass: '#c8a048', goldDark: '#5a4418',
  pink: '#f078a8', pink2: '#e870c0', mag: '#a040c0', cyan: '#5cc8d0', cyan2: '#80e0e8', purp: '#7080e8',
  white: '#f4f0f8', cream: '#f4f0e6', grey: '#8a84a8', dim: '#5a5478', red: '#e02a3a', red2: '#a81828', green: '#40e080',
  yel: '#e8c040', orange: '#f09040',
};
export const FELTS = {
  green: { a: '#1d6b45', b: '#175a3a', c: '#114630', d: '#0b3322', print: '#e8d890', line: '#2f8a5c' },
  blue: { a: '#1e4f86', b: '#184272', c: '#12345c', d: '#0b2442', print: '#e8e0b0', line: '#3168a8' },
  crimson: { a: '#7a1c34', b: '#66162b', c: '#521122', d: '#3a0b17', print: '#f0d898', line: '#9a2a46' },
  vip: { a: '#2a1a3e', b: '#221432', c: '#1a0f28', d: '#110a1c', print: '#ffe080', line: '#4a2e66' },
};

// ---- the font ------------------------------------------------------------------------------------------------------------
const FONT = {'A':'0e11111f111111','B':'1e11111e11111e','C':'0e11101010110e','D':'1e11111111111e','E':'1f10101e10101f','F':'1f10101e101010','G':'0e11101711110f','H':'1111111f111111','I':'0e04040404040e','J':'0702020212120c','K':'11121418141211','L':'1010101010101f','M':'111b1515111111','N':'11191513111111','O':'0e11111111110e','P':'1e11111e101010','Q':'0e11111115120d','R':'1e11111e141211','S':'0f10100e01011e','T':'1f040404040404','U':'1111111111110e','V':'11111111110a04','W':'11111115151b11','X':'11110a040a1111','Y':'11110a04040404','Z':'1f01020408101f','0':'0e11131519110e','1':'040c040404040e','2':'0e11010204081f','3':'1e01010e01011e','4':'02060a121f0202','5':'1f101e0101110e','6':'0e10101e11110e','7':'1f010204080808','8':'0e11110e11110e','9':'0e11110f01010e',' ':'00000000000000','.':'00000000000004',',':'00000000000408',':':'00040000000400','!':'04040404040004','?':'0e110102040004','-':'0000000e000000','+':'0004041f040400','/':'01020204080810',"'":'04040000000000','x':'0000110a040a11','*':'00150e1f0e1500','<':'02040810080402','>':'08040201020408','(':'02040808080402',')':'08040202020408','%':'191a0204080b13','#':'0a0a1f0a1f0a0a','=':'00001f001f0000','@':'0e11171517100f','$':'040f140e051e04','&':'0c12140815120d','"':'0a0a0000000000'};
// a narrow 3×5 font for small numbers on chips, pockets and boards
const SMALL = { A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152', K: '55655', L: '44447', M: '57755', N: '57775', O: '25552', P: '65644', Q: '25573', R: '65655', S: '34216', T: '72222', U: '55553', V: '55522', W: '55775', X: '55255', Y: '55222', Z: '71247', '!': '22202', '?': '71202', "'": '22000', ',': '00024', '(': '12221', ')': '42224', '&': '25257', '=': '07070', '>': '42124', '<': '12421', 0: '75557', 1: '26227', 2: '71747', 3: '71717', 4: '55711', 5: '74717', 6: '74757', 7: '71122', 8: '75757', 9: '75717', '-': '00700', '+': '02720', '.': '00002', x: '05250', ' ': '00000', ':': '02020', '/': '11244', $: '27672', '%': '51245' };
const GLYPH = {}, SGLYPH = {};
for (const c in FONT) { const h = FONT[c], rows = []; for (let i = 0; i < 7; i++) rows.push(parseInt(h.substr(i * 2, 2), 16)); GLYPH[c] = rows; }
for (const c in SMALL) SGLYPH[c] = [...SMALL[c]].map((x) => parseInt(x, 16));

const norm = (s) => String(s).toUpperCase().replace(/[‘’]/g, "'").replace(/×/g, 'x').replace(/−/g, '-').replace(/·/g, '-').replace(/[^A-Z0-9 .,:!?\-+/'x*<>()%#=@$&"]/g, '');
export function textW(s, scale = 1) { const n = norm(s).length; return n ? (n * 6 - 1) * scale : 0; }
/** Text in the 5×7 font. o: align, scale, shadow (colour), outline (colour). Returns the width. */
export function text(ctx, s, x, y, col, o = {}) {
  let str = norm(s);
  if (o.max && str.length > o.max) str = str.slice(0, o.max - 1) + '.';
  const sc = o.scale || 1, w = (str.length * 6 - 1) * sc;
  const x0 = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x), y0 = Math.round(y);
  const draw = (c, ox, oy) => {
    ctx.fillStyle = c;
    for (let i = 0; i < str.length; i++) {
      const g = GLYPH[str[i]] || GLYPH['?'];
      for (let r = 0; r < 7; r++) { const bits = g[r]; if (!bits) continue; for (let b = 0; b < 5; b++) if (bits & (16 >> b)) ctx.fillRect(x0 + ox + (i * 6 + b) * sc, y0 + oy + r * sc, sc, sc); }
    }
  };
  if (o.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) draw(o.outline, ox * sc, oy * sc);
  if (o.shadow) draw(o.shadow, 0, sc);
  draw(col, 0, 0);
  return w;
}
export function smallW(s) { return String(s).length * 4 - 1; }
const snorm = (s) => String(s).toUpperCase().replace(/\u00d7/g, 'x').replace(/\u2212/g, '-').replace(/\u00b7/g, '-').replace(/[\u2018\u2019]/g, "'");
/** Numbers in the 3×5 font. */
export function small(ctx, s, x, y, col, o = {}) {
  const str = snorm(s), w = str.length * 4 - 1;
  const x0 = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x), y0 = Math.round(y);
  const draw = (c, ox, oy) => {
    ctx.fillStyle = c;
    for (let i = 0; i < str.length; i++) {
      const g = SGLYPH[str[i]] || SGLYPH[' '];
      for (let r = 0; r < 5; r++) for (let b = 0; b < 3; b++) if (g[r] & (4 >> b)) ctx.fillRect(x0 + ox + i * 4 + b, y0 + oy + r, 1, 1);
    }
  };
  if (o.outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(o.outline, ox, oy);
  if (o.shadow) draw(o.shadow, 0, 1);
  draw(col, 0, 0);
  return w;
}

// ---- shapes --------------------------------------------------------------------------------------------------------------
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  out: (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3),
  in: (t) => Math.pow(clamp(t, 0, 1), 3),
  inOut: (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  back: (t) => { t = clamp(t, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  bounce: (t) => {
    t = clamp(t, 0, 1); const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};
export function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
/** A pixel panel: outline, fill, a light top edge and a dark bottom. */
export function box(ctx, x, y, w, h, fill, line = PAL.ink, hi = null, lo = null) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = line; ctx.fillRect(x + 1, y, w - 2, h); ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  if (hi) { ctx.fillStyle = hi; ctx.fillRect(x + 2, y + 1, w - 4, 1); }
  if (lo) { ctx.fillStyle = lo; ctx.fillRect(x + 2, y + h - 2, w - 4, 1); }
}
/** A filled ellipse on the pixel grid. */
export function disc(ctx, cx, cy, rx, col, ry = rx) {
  ctx.fillStyle = col;
  const R = Math.ceil(ry);
  for (let y = -R; y <= R; y++) {
    const k = 1 - (y * y) / (ry * ry);
    if (k < 0) continue;
    const w = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
/** An ellipse outline, one pixel thick. */
export function ring(ctx, cx, cy, rx, col, ry = rx, thick = 1) {
  ctx.fillStyle = col;
  const steps = Math.ceil(Math.max(rx, ry) * 7);
  let lx = null, ly = null;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2, x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    if (x === lx && y === ly) continue;
    ctx.fillRect(x, y, thick, thick); lx = x; ly = y;
  }
}
/** A one-pixel line (Bresenham). */
export function line(ctx, x0, y0, x1, y1, col, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  ctx.fillStyle = col;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, guard = 0;
  for (;;) {
    ctx.fillRect(x0, y0, w, w);
    if ((x0 === x1 && y0 === y1) || guard++ > 4000) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
/** A soft glow (the one non-pixel thing: light). */
export function glow(ctx, x, y, r, col, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// ---- sprites from strings ------------------------------------------------------------------------------------------------
const cache = new Map();
/** rows: strings, a character a pixel ('.' clear), pal: char → colour. Cached as a canvas. */
export function sprite(key, rows, pal) {
  if (cache.has(key)) return cache.get(key);
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.' || ch === ' ') continue; g.fillStyle = pal[ch] || '#ff00ff'; g.fillRect(x, y, 1, 1); } });
  cache.set(key, c);
  return c;
}
/** A canvas drawn once by fn(g, w, h) and kept. */
export function baked(key, w, h, fn) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  cache.set(key, c);
  return c;
}
export function draw(ctx, img, x, y, o = {}) {
  if (!img) return;
  const w = img.width, h = img.height;
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.flipX || o.sx) {
    ctx.save();
    const sx = o.sx || 1;
    ctx.translate(Math.round(x + (w * Math.abs(sx)) / 2), 0);
    ctx.scale(o.flipX ? -sx : sx, 1);
    ctx.drawImage(img, Math.round(-w / 2), Math.round(y));
    ctx.restore();
  } else ctx.drawImage(img, Math.round(x), Math.round(y));
  if (o.alpha != null) ctx.globalAlpha = 1;
}
/** A tinted copy of a sprite (silhouettes, flashes). */
export function tinted(img, col, key) {
  return baked('tint:' + key + col, img.width, img.height, (g) => {
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = col; g.fillRect(0, 0, img.width, img.height);
  });
}

// ---- particles -----------------------------------------------------------------------------------------------------------
export class FX {
  constructor() { this.p = []; }
  burst(x, y, n, cols = [PAL.gold, PAL.white], o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.up ? -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 2.4) : Math.random() * Math.PI * 2;
      const sp = (o.speed || 60) * (0.4 + Math.random() * 0.8);
      this.p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.gravity ?? 120, col: cols[i % cols.length], life: (o.life || 0.9) * (0.6 + Math.random() * 0.6), size: o.size || (Math.random() < 0.3 ? 2 : 1), kind: o.kind || 'spark' });
    }
  }
  coins(x, y, n) { this.burst(x, y, n, [PAL.gold, PAL.gold3, PAL.brass], { up: true, speed: 110, gravity: 260, life: 1.4, kind: 'coin' }); }
  confetti(W, n, cols) { for (let i = 0; i < n; i++) this.p.push({ x: Math.random() * W, y: -Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 40, g: 40, col: cols[i % cols.length], life: 3 + Math.random(), size: 2, kind: 'confetti' }); }
  update(dt) {
    this.p = this.p.filter((q) => {
      q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.kind === 'confetti') q.vx += Math.sin(q.life * 6) * 2;
      return q.life > 0;
    });
  }
  draw(ctx) {
    for (const q of this.p) {
      ctx.globalAlpha = clamp(q.life * 2, 0, 1);
      ctx.fillStyle = q.col;
      if (q.kind === 'coin') {
        const w = Math.abs(Math.round(Math.cos(q.life * 9) * 2)) + 1;
        ctx.fillRect(Math.round(q.x - w / 2), Math.round(q.y - 2), w, 4);
        ctx.fillStyle = PAL.gold2; ctx.fillRect(Math.round(q.x - w / 2), Math.round(q.y + 1), w, 1);
      } else ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.kind === 'confetti' && Math.floor(q.life * 10) % 2 ? 1 : q.size);
    }
    ctx.globalAlpha = 1;
  }
}
