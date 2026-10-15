// The Runouts arcade kit — what every game screen is drawn with.
//
// One native pixel screen (480 × 270, scaled by a whole number of device
// pixels), the Runout Room's Blender render as the world (the games are
// played at their stations: tools/bridge-art/scenes/runouts_room.py), the
// players as pilots from the Bridge in their suits, a 5×7 pixel font,
// particles, and the verdict. Same 32 px a tile and palette as the Bridge.

export const W = 480;
export const H = 270;
export const TS = 32;
const C45 = Math.SQRT1_2;

export const PAL = {
  bg: '#080418', bg2: '#140c28', dark: '#1a1530', mid: '#2a2a3e', hi: '#3a3a52',
  pink: '#f078a8', pink2: '#e870c0', mag: '#a040c0', cyan: '#5cc8d0', cyan2: '#80e0e8',
  purp: '#7080e8', purp2: '#3a1840', yel: '#e8c040', gold: '#ffd060', green: '#40e080',
  red: '#e84040', orange: '#f09040', white: '#f4f0f8', grey: '#8a84a8', ink: '#0c0814',
  felt: '#1e6a44', felt2: '#14482e', cream: '#f4f0e6', brass: '#c8a048',
};
// each player's colour, the same in every game (their name tag, their horse, their slice of the wheel)
export const PCOL = ['#f078a8', '#5cc8d0', '#e8c040', '#40e080', '#e84040', '#7080e8', '#f09040', '#e8e8f0'];

// ---- the font (the Bridge arcade kit's 5×7) ---------------------------------------------------------------
const FONT = {'A':'0e11111f111111','B':'1e11111e11111e','C':'0e11101010110e','D':'1e11111111111e','E':'1f10101e10101f','F':'1f10101e101010','G':'0e11101711110f','H':'1111111f111111','I':'0e04040404040e','J':'0702020212120c','K':'11121418141211','L':'1010101010101f','M':'111b1515111111','N':'11191513111111','O':'0e11111111110e','P':'1e11111e101010','Q':'0e11111115120d','R':'1e11111e141211','S':'0f10100e01011e','T':'1f040404040404','U':'1111111111110e','V':'11111111110a04','W':'11111115151b11','X':'11110a040a1111','Y':'11110a04040404','Z':'1f01020408101f','0':'0e11131519110e','1':'040c040404040e','2':'0e11010204081f','3':'1e01010e01011e','4':'02060a121f0202','5':'1f101e0101110e','6':'0e10101e11110e','7':'1f010204080808','8':'0e11110e11110e','9':'0e11110f01010e',' ':'00000000000000','.':'00000000000004',',':'00000000000408',':':'00040000000400','!':'04040404040004','?':'0e110102040004','-':'0000000e000000','+':'0004041f040400','/':'01020204080810',"'":'04040000000000','x':'0000110a040a11','*':'00150e1f0e1500','<':'02040810080402','>':'08040201020408','(':'02040808080402',')':'08040202020408','%':'191a0204080b13','#':'0a0a1f0a1f0a0a','=':'00001f001f0000','@':'0e11171517100f','$':'040f140e051e04','&':'0c12140815120d','"':'0a0a0000000000'};
const GLYPH = {};
Object.keys(FONT).forEach((c) => {
  const h = FONT[c], rows = [];
  for (let i = 0; i < 7; i++) rows.push(parseInt(h.substr(i * 2, 2), 16));
  GLYPH[c] = rows;
});
const SUITS = { h: [0, 10, 31, 31, 14, 4, 0], d: [0, 4, 14, 31, 14, 4, 0], c: [0, 14, 14, 31, 31, 4, 14], s: [0, 4, 14, 31, 31, 4, 14] };

function norm(s) {
  return String(s).toUpperCase().replace(/[‘’]/g, "'").replace(/[^A-Z0-9 .,:!?\-+/'x*<>()%#=@$&"]/g, '');
}
/** Width of a string in the 5×7 font at a scale. */
export function textW(s, scale = 1) {
  const n = norm(s).length;
  return n ? (n * 6 - 1) * scale : 0;
}
/** Draw text; returns its width. o: align ('left' | 'center' | 'right'), scale, shadow colour, max (characters). */
export function text(ctx, s, x, y, col, o = {}) {
  let str = norm(s);
  if (o.max && str.length > o.max) str = str.slice(0, o.max - 1) + '.';
  const sc = o.scale || 1, w = (str.length * 6 - 1) * sc;
  let x0 = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  const y0 = Math.round(y);
  const draw = (c, ox, oy) => {
    ctx.fillStyle = c;
    for (let i = 0; i < str.length; i++) {
      const g = GLYPH[str[i]] || GLYPH['?'];
      for (let r = 0; r < 7; r++) {
        const bits = g[r];
        if (!bits) continue;
        for (let b = 0; b < 5; b++) if (bits & (16 >> b)) ctx.fillRect(x0 + ox + (i * 6 + b) * sc, y0 + oy + r * sc, sc, sc);
      }
    }
  };
  if (o.shadow) draw(o.shadow, sc, sc);
  if (o.outline) { for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(o.outline, ox * sc, oy * sc); }
  draw(col, 0, 0);
  return w;
}
/** A suit pip (h d c s), 5×7, at a scale. */
export function suit(ctx, s, x, y, col, scale = 1) {
  const g = SUITS[s] || SUITS.s;
  ctx.fillStyle = col;
  for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (g[r] & (16 >> b)) ctx.fillRect(x + b * scale, y + r * scale, scale, scale);
}

// ---- small drawing helpers ------------------------------------------------------------------------------------------
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  out: (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3),
  in: (t) => Math.pow(clamp(t, 0, 1), 3),
  inOut: (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  back: (t) => { t = clamp(t, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  bounce: (t) => {
    t = clamp(t, 0, 1);
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};
export function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
/** A pixel box: outline, fill, a highlight along the top. */
export function box(ctx, x, y, w, h, fill, line = PAL.ink, hi = null) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = line; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  if (hi) { ctx.fillStyle = hi; ctx.fillRect(x + 1, y + 1, w - 2, 1); }
}
/** A filled pixel circle (or ellipse with ry). */
export function disc(ctx, cx, cy, r, col, ry = r) {
  ctx.fillStyle = col;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    const w = Math.floor(r * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (w >= 0 && Math.abs(y) <= ry) ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
/** A seeded random from a string (player names → stable little differences). */
export function seedOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

// ---- images --------------------------------------------------------------------------------------------------------
const imgs = {};
export function img(src) {
  if (!imgs[src]) {
    const e = { img: new Image(), ready: false };
    e.img.onload = () => { e.ready = true; };
    e.img.src = src;
    imgs[src] = e;
  }
  return imgs[src];
}

// ---- the room ------------------------------------------------------------------------------------------------------
// room.json: stations' rects on screen (tiles: x0, top row, x1, bottom row) and their anchors (tile units, x, row, z);
// room-play / room-show: the renders (full.png, depth.png, scene.json with the origin and depth range)
const ART = '/runouts/art/';
let room = null;
export function loadRoom() {
  if (room) return room;
  room = { ready: false, meta: null, json: null, play: img(ART + 'room-play/full.png'), show: img(ART + 'room-show/full.png'), depth: null };
  Promise.all([fetch(ART + 'room.json').then((r) => r.json()), fetch(ART + 'room-play/scene.json').then((r) => r.json())])
    .then(([json, meta]) => {
      room.json = json; room.meta = meta; room.ready = true;
      const d = new Image();
      d.onload = () => { room.depth = decodeDepth(d, meta); };
      d.src = ART + 'room-play/depth.png?v=' + (meta.rev || '');
    }).catch(() => {});
  return room;
}
function decodeDepth(im, meta) {
  const c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(im, 0, 0);
  const px = x.getImageData(0, 0, im.width, im.height).data, n = im.width * im.height, out = new Float32Array(n), span = meta.depthMax - meta.depthMin;
  for (let i = 0; i < n; i++) { const q = px[i * 4] * 256 + px[i * 4 + 1]; out[i] = q >= 65535 ? Infinity : meta.depthMin + (q / 65534) * span; }
  return out;
}
/** A point in the room (tiles: x, row, height) → room-image pixels. */
export function roomPx(x, r, z = 0) {
  const m = room && room.meta;
  return m ? [x * TS + m.originX, (r - z * C45) * TS + m.originY] : [x * TS, r * TS];
}
/** The camera (room-image px, top-left) that frames a station's rect (tiles), nudged by (dx, dy) tiles. */
export function frame(rectT, dx = 0, dy = 0) {
  const m = room && room.meta;
  if (!m) return { x: 0, y: 0 };
  const [x0, y0] = roomPx(rectT[0], rectT[1]), [x1, y1] = roomPx(rectT[2], rectT[3]);
  const cx = (x0 + x1) / 2 + dx * TS, cy = (y0 + y1) / 2 + dy * TS;
  return { x: Math.round(clamp(cx - W / 2, 0, m.width - W)), y: Math.round(clamp(cy - H / 2, 0, m.height - H)) };
}
export function drawRoom(ctx, cam, which = 'play') {
  const im = room && room[which];
  if (!im || !im.ready) { rect(ctx, 0, 0, W, H, PAL.bg); return false; }
  ctx.drawImage(im.img, -Math.round(cam.x), -Math.round(cam.y));
  return true;
}
export function station(id) { return room && room.json ? room.json.stations[id] : null; }
export function anchors(id) { return room && room.json ? room.json.anchors[id] : null; }
export function roomReady() { return !!(room && room.ready && room.play.ready); }

// a sprite with the room in front of it masked out (the Bridge's BridgeScene.drawOccluded): an upright
// billboard standing at footRow (tiles), so a table in front hides its legs
const tmp = typeof document !== 'undefined' ? document.createElement('canvas') : null;
export function drawOccluded(ctx, image, sx, sy, sw, sh, dx, dy, footRow, cam) {
  const m = room && room.meta;
  if (!m || !room.depth) { ctx.drawImage(image, sx, sy, sw, sh, dx, dy, sw, sh); return; }
  if (tmp.width < sw || tmp.height < sh) { tmp.width = Math.max(tmp.width, sw); tmp.height = Math.max(tmp.height, sh); }
  const t = tmp.getContext('2d', { willReadFrequently: true });
  t.clearRect(0, 0, sw, sh);
  t.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  const data = t.getImageData(0, 0, sw, sh), d = data.data;
  const th = ((m.theta || 45) * Math.PI) / 180, cot = Math.cos(th) / Math.sin(th), tan = Math.tan(th);
  for (let j = 0; j < sh; j++) {
    const Y = dy + j + cam.y;                                   // room-image row
    const srow = (Y - m.originY) / TS;
    let above = footRow - srow;
    if (above < 0) above = 0;
    const cd = -footRow * cot - above * tan;
    if (Y < 0 || Y >= m.height) continue;
    for (let i = 0; i < sw; i++) {
      const k = (j * sw + i) * 4 + 3;
      if (!d[k]) continue;
      const X = dx + i + cam.x;
      if (X < 0 || X >= m.width) continue;
      if (room.depth[Y * m.width + X] < cd - 0.04) d[k] = 0;
    }
  }
  t.putImageData(data, 0, 0);
  ctx.drawImage(tmp, 0, 0, sw, sh, dx, dy, sw, sh);
}

// ---- the players: pilots in their suits ------------------------------------------------------------------------------
const STYLES = ['', 'coat-', 'runner-', 'thermal-', 'plate-'];
const COLOURS = ['purple', 'cyan', 'gold', 'green', 'red', 'white'];
const COLOUR_OF = { '#f078a8': 'purple', '#5cc8d0': 'cyan', '#e8c040': 'gold', '#40e080': 'green', '#e84040': 'red', '#7080e8': 'purple',
                    '#f09040': 'gold', '#e8e8f0': 'white' };
/** Which pilot a player is: their colour's suit, a style each so no two look alike. */
export function avatarOf(i) {
  const colour = COLOUR_OF[PCOL[i % PCOL.length]] || COLOURS[i % COLOURS.length];
  return '/bridge/assets/characters/pilot-' + STYLES[(i * 3 + 1) % STYLES.length] + colour + '.png';
}
const ROW = { down: 0, right: 1, up: 2, left: 3 };
/** Draw player i's pilot with their feet at (x, y) (screen px). mood: idle | walk | cheer | slump | hit. */
export function pilot(ctx, i, x, y, facing = 'down', mood = 'idle', t = 0, occl = null) {
  const sh = img(avatarOf(i));
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x - 8, y - 1, 16, 3);
  ctx.fillRect(x - 6, y - 2, 12, 5);
  if (!sh.ready) return;
  let col = [0, 1, 2, 1][Math.floor(t * 3 + i * 0.7) % 4], dy = 0, dx = 0;
  if (mood === 'walk') col = 4 + (Math.floor(t * 10) % 8);
  if (mood === 'cheer') { dy = -Math.round(Math.abs(Math.sin(t * 9 + i)) * 6); col = 4 + (Math.floor(t * 12) % 8); }
  if (mood === 'slump') { dy = 1; col = 0; }
  if (mood === 'hit') dx = Math.round(Math.sin(t * 60) * 2);
  const sx = col * 32, sy = (ROW[facing] || 0) * 48, dxp = x - 16 + dx, dyp = y - 45 + dy;
  if (occl) drawOccluded(ctx, sh.img, sx, sy, 32, 48, dxp, dyp, occl.footRow, occl.cam);
  else ctx.drawImage(sh.img, sx, sy, 32, 48, dxp, dyp, 32, 48);
  if (mood === 'slump') { ctx.fillStyle = 'rgba(20,10,40,0.35)'; ctx.fillRect(dxp + 6, dyp + 12, 20, 34); }
}
/** A name tag: a dark pill with the player's colour, centred on x, its top at y. */
export function tag(ctx, name, x, y, col, o = {}) {
  const s = norm(name).slice(0, o.max || 8), w = textW(s) + 6;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y);
  ctx.fillStyle = o.bg || 'rgba(8,4,24,0.85)';
  ctx.fillRect(x0, y0, w, 11);
  ctx.fillStyle = col; ctx.fillRect(x0, y0 + 10, w, 1);
  if (o.lit) { ctx.fillStyle = col; ctx.fillRect(x0, y0, w, 11); }
  text(ctx, s, x, y0 + 2, o.lit ? PAL.ink : (o.fg || PAL.white), { align: 'center' });
  return w;
}

// ---- particles -------------------------------------------------------------------------------------------------------
export class FX {
  constructor() { this.p = []; }
  burst(x, y, n, kind = 'spark', cols = [PAL.gold, PAL.white]) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = kind === 'confetti' ? 40 + Math.random() * 90 : kind === 'smoke' ? 6 + Math.random() * 14 : 30 + Math.random() * 80;
      this.p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'confetti' ? 60 : kind === 'smoke' ? 18 : 20), kind,
                    col: cols[i % cols.length], life: kind === 'smoke' ? 1.4 + Math.random() : 0.6 + Math.random() * 0.8, size: kind === 'smoke' ? 3 : 1 + (Math.random() < 0.4) });
    }
  }
  rain(n, cols) { for (let i = 0; i < n; i++) this.p.push({ x: Math.random() * W, y: -Math.random() * 60, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40, kind: 'confetti', col: cols[i % cols.length], life: 4, size: 2 }); }
  update(dt) {
    this.p = this.p.filter((q) => {
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.kind === 'confetti') { q.vy += 90 * dt; q.vx *= 0.98; }
      else if (q.kind === 'smoke') { q.vy -= 4 * dt; q.vx *= 0.97; }
      else q.vy += 120 * dt;
      return q.life > 0;
    });
  }
  draw(ctx) {
    for (const q of this.p) {
      ctx.globalAlpha = q.kind === 'smoke' ? clamp(q.life / 1.5, 0, 0.6) : clamp(q.life * 2, 0, 1);
      ctx.fillStyle = q.col;
      const s = q.kind === 'smoke' ? Math.round(q.size + (1.5 - q.life) * 3) : q.size;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), s, q.kind === 'confetti' && Math.floor(q.life * 10) % 2 ? 1 : s);
    }
    ctx.globalAlpha = 1;
  }
}

// ---- the HUD and the verdict -----------------------------------------------------------------------------------------
/** The plate along the top: the game's name, what's at stake, how far into the reveal. */
export function hud(ctx, s, title, sub) {
  const t = norm(title);
  const w = textW(t) + 14;
  ctx.fillStyle = 'rgba(8,4,24,0.82)';
  ctx.fillRect(6, 6, w, 15);
  ctx.fillStyle = PAL.pink; ctx.fillRect(6, 20, w, 1);
  text(ctx, t, 13, 10, PAL.white);
  if (sub) {
    const st = norm(sub).slice(0, 34), sw = textW(st) + 10;
    ctx.fillStyle = 'rgba(8,4,24,0.7)';
    ctx.fillRect(6, 23, sw, 11);
    text(ctx, st, 11, 25, PAL.grey);
  }
  const n = s.total || 1;
  if (n > 1 && n <= 40) {
    const pw = Math.min(6, Math.floor(150 / n)), gap = pw > 3 ? 2 : 1, tw = n * (pw + gap) - gap;
    for (let i = 0; i < n; i++) rect(ctx, W - 8 - tw + i * (pw + gap), 10, pw, 4, i < s.step ? PAL.cyan : 'rgba(255,255,255,0.18)');
  }
}
/** The verdict: who's picked, stamped across the screen once it's done. */
export function verdict(ctx, s, extra) {
  if (!s.done) return;
  const r = s.result, k = clamp(s.doneT / 0.35, 0, 1), sc = k < 1 ? 1 + (1 - ease.out(k)) * 1.5 : 1;
  const tie = r.isTie && !r.selectedName;
  const win = r.selectionGoal === 'winner';
  const label = tie ? "IT'S A TIE" : win ? 'WINNER' : 'PICKED';
  const name = tie ? (r.tiedNames || []).join(' + ') : r.selectedName || '';
  const col = tie ? PAL.yel : win ? PAL.gold : PAL.red;
  const y = extra && extra.y != null ? extra.y : H - 46;
  ctx.save();
  ctx.translate(W / 2, y + 16);
  ctx.scale(sc, sc);
  ctx.globalAlpha = k;
  const bw = Math.max(textW(name, 2), textW(label)) + 30;
  ctx.fillStyle = 'rgba(8,4,24,0.92)';
  ctx.fillRect(-bw / 2, -17, bw, 34);
  ctx.fillStyle = col;
  ctx.fillRect(-bw / 2, -17, bw, 2); ctx.fillRect(-bw / 2, 15, bw, 2);
  ctx.fillRect(-bw / 2, -17, 2, 34); ctx.fillRect(bw / 2 - 2, -17, 2, 34);
  text(ctx, label, 0, -12, col, { align: 'center' });
  text(ctx, name, 0, -2, PAL.white, { align: 'center', scale: 2, shadow: PAL.ink });
  ctx.restore();
}
/** Is this player the picked one (or tied)? */
export function picked(s, p) { return !!(p && (p.selected || p.tied)); }
