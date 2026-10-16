// The lobby's art: the NEON ROYALE sign, and a small live scene on every game's tile (the same pieces the tables
// are drawn with), so the lobby moves like a casino floor.
import { PAL, FELTS, text, textW, small, glow, rect, disc, hash, line } from './pix.js';
import { drawCard, drawStack, dieFace, dieSpin } from './sprites.js';
import { drawWheel } from './wheel.js';
import { symbol } from './symbols.js';
import { horse } from './horse.js';
import { halfMoon, oval, feltAt } from './felt.js';
import { modeIcon } from '../tables/runouts/modes.js';

/** The neon sign: tube letters with a crown, buzzing and now and then flickering. */
export function drawSign(ctx, f, high, word) {
  const { W, H } = f, t = f.t;
  ctx.clearRect(0, 0, W, H);
  const w1 = word || 'NEON ROYALE';
  const sc = Math.max(1, Math.min(4, Math.floor((W - 8) / textW(w1)), Math.floor((H - 14) / 9)));
  const tw = textW(w1, sc), x = Math.round((W - tw) / 2), y = Math.round((H - 7 * sc) / 2) + 4;
  const flick = (Math.floor(t * 7) % 23 === 0) || (Math.floor(t * 11) % 37 === 0);
  const col = high ? PAL.gold3 : PAL.pink, edge = high ? '#5a3a08' : '#3a0c28';
  glow(ctx, W / 2, H / 2, W * 0.55, high ? 'rgba(255,220,120,0.5)' : 'rgba(240,120,168,0.5)', flick ? 0.12 : 0.32 + Math.sin(t * 3) * 0.04);
  text(ctx, w1, x, y, flick ? '#5a2440' : col, { scale: sc, outline: edge });
  if (!flick) { ctx.globalAlpha = 0.45; text(ctx, w1, x, y - Math.max(1, sc - 2), '#ffffff', { scale: sc }); ctx.globalAlpha = 1; text(ctx, w1, x, y, col, { scale: sc }); }
  // the crown over the middle
  const cx = Math.round(W / 2), cy = y - 6;
  const crown = ['#.#.#', '#####', '#####'];
  crown.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '#') rect(ctx, cx - 5 + i * 2, cy + j * 2 - 2, 2, 2, flick ? '#5a4418' : PAL.gold); });
  // the bulbs along the bottom edge
  for (let i = 0; i < Math.floor(tw / 6); i++) rect(ctx, x + i * 6 + 2, y + 7 * sc + 3, 2, 2, (Math.floor(t * 6) + i) % 3 ? 'rgba(255,224,128,0.35)' : PAL.gold3);
}

function feltBG(ctx, W, H, felt = 'green') {
  const F = FELTS[felt];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    ctx.fillStyle = feltAt(F, Math.sqrt(dx * dx + dy * dy) * 0.8, x, y); ctx.fillRect(x, y, 1, 1);
  }
}
const cache = new Map();
function bake(key, W, H, fn) {
  const k = key + W + 'x' + H;
  if (!cache.has(k)) { const c = document.createElement('canvas'); c.width = W; c.height = H; fn(c.getContext('2d')); cache.set(k, c); }
  return cache.get(k);
}

const TILES = {
  blackjack(ctx, W, H, t, high) {
    ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(halfMoon(W, H + 10, high ? 'vip' : 'green', { top: 8, rail: 5 }).img, 0, -2);
    text(ctx, 'BLACKJACK', W / 2, Math.round(H * 0.62), 'rgba(232,216,144,0.8)', { align: 'center' });
    small(ctx, 'PAYS 3 TO 2', W / 2, Math.round(H * 0.62) + 9, 'rgba(232,216,144,0.6)', { align: 'center' });
    const flip = (Math.sin(t * 1.2) + 1) / 2;
    drawCard(ctx, { r: 14, s: 's', id: 1 }, W / 2 - 24, 12, { flip: 1 });
    drawCard(ctx, { r: 13, s: 'h', id: 2 }, W / 2 + 2, 12, { flip: flip > 0.5 ? 1 : 0 });
    drawStack(ctx, 75, W / 2 - 34, H - 8, { label: false });
    drawStack(ctx, 525, W / 2 + 34, H - 8, { label: false });
  },
  roulette(ctx, W, H, t) {
    ctx.drawImage(bake('rfelt', W, H, (g) => feltBG(g, W, H, 'green')), 0, 0);
    const R = Math.min(W * 0.3, H * 0.48);
    const a = t * 0.8;
    drawWheel(ctx, W / 2, H / 2, Math.round(R), 0.72, a);
    const ba = -t * 2.3;
    disc(ctx, W / 2 + Math.cos(ba) * R * 0.86, H / 2 + Math.sin(ba) * R * 0.86 * 0.72, 1.5, '#ffffff');
  },
  craps(ctx, W, H, t) {
    ctx.drawImage(bake('cfelt', W, H, (g) => { feltBG(g, W, H, 'green'); g.globalAlpha = 0.8; text(g, 'PASS LINE', W / 2, H - 14, '#e8d890', { align: 'center' }); g.fillStyle = 'rgba(232,216,144,0.6)'; g.fillRect(6, H - 18, W - 12, 1); g.fillRect(6, H - 5, W - 12, 1); g.globalAlpha = 1; }), 0, 0);
    const cyc = t % 3, k = Math.min(1, cyc / 1.2);
    for (let i = 0; i < 2; i++) {
      const x = 14 + k * (W * 0.5) + i * 14, y = H * 0.25 + Math.abs(Math.sin(k * Math.PI * 3)) * -10 * (1 - k) + 10 + i * 4;
      if (k < 1) { const fr = Math.floor(t * 16 + i); ctx.drawImage(fr % 2 ? dieSpin(fr, 'red') : dieFace(1 + fr % 6, 'red'), Math.round(x), Math.round(y)); }
      else ctx.drawImage(dieFace(i ? 5 : 2, 'red'), Math.round(x), Math.round(y));
    }
    if (cyc > 1.3) text(ctx, 'SEVEN!', W / 2 + 18, 8, PAL.gold3, { align: 'center', outline: PAL.ink });
  },
  poker(ctx, W, H, t, high) {
    ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(oval(W, H, high ? 'vip' : 'blue', { cy: H / 2, rx: W * 0.44, ry: H * 0.36, rail: 5 }).img, 0, 0);
    const cards = [{ r: 14, s: 'h' }, { r: 13, s: 'h' }, { r: 12, s: 'h' }, { r: 11, s: 'h' }, { r: 10, s: 'h' }];
    const shown = Math.min(5, Math.floor((t % 5) * 1.6));
    cards.forEach((c, i) => drawCard(ctx, { ...c, id: i + 10 }, W / 2 - 40 + i * 16, H / 2 - 14, { flip: i < shown ? 1 : 0, small: true }));
    drawStack(ctx, 840, W / 2, H / 2 + 22, { label: false });
  },
  slots(ctx, W, H, t) {
    ctx.fillStyle = '#16081e'; ctx.fillRect(0, 0, W, H);
    const cw = 22, x0 = Math.round(W / 2 - cw * 1.5 - 2), y0 = Math.round(H / 2 - 14);
    rect(ctx, x0 - 8, y0 - 18, cw * 3 + 20, 52, '#3a1450'); rect(ctx, x0 - 6, y0 - 16, cw * 3 + 16, 10, '#0a0418');
    text(ctx, 'NEON 7s', W / 2, y0 - 14, PAL.pink, { align: 'center' });
    const syms = ['seven', 'bell', 'cherry', 'bar3', 'crown', 'bar'];
    for (let r = 0; r < 3; r++) {
      rect(ctx, x0 + r * (cw + 2), y0, cw, 24, '#f4f0f8');
      const spinning = (t % 4) < 1.4 + r * 0.4;
      const sym = spinning ? syms[Math.floor(t * 14 + r * 3) % syms.length] : 'seven';
      ctx.drawImage(symbol(sym), x0 + r * (cw + 2) + 3, y0 + 4 + (spinning ? (Math.floor(t * 30) % 3) - 1 : 0));
    }
    for (let i = 0; i < 14; i++) rect(ctx, x0 - 8 + i * 6, y0 + 32, 2, 2, (Math.floor(t * 8) + i) % 3 ? '#5a2a50' : PAL.gold3);
  },
  derby(ctx, W, H, t) {
    for (let y = 0; y < H; y++) rect(ctx, 0, y, W, 1, y < H * 0.35 ? '#140a2a' : Math.floor(y / 2) % 2 ? '#7a4a2a' : '#6e4224');
    for (let i = 0; i < 8; i++) rect(ctx, ((i * 23 - t * 30) % (W + 20) + W + 20) % (W + 20) - 10, Math.round(H * 0.35) - 8, 2, 8, '#f4f0e6');
    rect(ctx, 0, Math.round(H * 0.35), W, 1, '#f4f0e6');
    const silk = ['#e84040', '#f0c040', '#40a0f0'];
    for (let i = 0; i < 3; i++) {
      const x = ((W * 0.15 + i * 9 + Math.sin(t * 1.3 + i) * 10 + t * 10) % (W + 30)) - 26;
      ctx.drawImage(horse(i, silk[i], Math.floor(t * 12 + i) % 4), Math.round(x), Math.round(H * 0.38 + i * 12));
    }
  },
  crash(ctx, W, H, t) {
    for (let y = 0; y < H; y++) rect(ctx, 0, y, W, 1, y < H * 0.4 ? '#06030f' : y < H * 0.7 ? '#100828' : '#1c0c34');
    for (let i = 0; i < 25; i++) rect(ctx, Math.round(hash(i) * W), Math.round(((hash(i * 3) * H + t * 20) % H)), 1, 1, 'rgba(255,255,255,0.6)');
    const cyc = t % 5, m = Math.exp(0.35 * Math.min(cyc, 4));
    let lx = 6, ly = H - 6;
    for (let i = 1; i <= 20; i++) { const tt = (Math.min(cyc, 4) * i) / 20, mm = Math.exp(0.35 * tt); const x = 6 + (tt / 4) * (W - 30), y = H - 6 - ((mm - 1) / 3.2) * (H - 20); line(ctx, lx, ly, x, y, PAL.pink); lx = x; ly = y; }
    if (cyc < 4) ctx.drawImage(symbol('rocket'), Math.round(lx - 8), Math.round(ly - 14));
    else { disc(ctx, lx, ly, 4 + (cyc - 4) * 14, 'rgba(255,170,80,' + (1 - (cyc - 4)) + ')'); }
    text(ctx, m.toFixed(2) + 'x', W - 6, 6, cyc < 4 ? PAL.green : '#ff6070', { align: 'right', outline: PAL.ink });
  },
  runouts(ctx, W, H, t) {
    ctx.fillStyle = '#0a0618'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) rect(ctx, 0, y, W, 1, 'rgba(255,255,255,0.03)');
    const ids = ['dice', 'wheel', 'rocket', 'bomb', 'holdem', 'horse-race', 'coin-flips', 'plinko'];
    for (let i = 0; i < 4; i++) {
      const id = ids[(i + Math.floor(t / 2)) % ids.length];
      modeIcon(ctx, id, Math.round(W * (0.2 + (i % 2) * 0.6)), Math.round(H * (0.3 + Math.floor(i / 2) * 0.42)), t + i);
    }
  },
};

/** A game's tile. */
export function drawTile(id, ctx, f, high) {
  const { W, H } = f;
  ctx.imageSmoothingEnabled = false;
  (TILES[id] || TILES.runouts)(ctx, W, H, f.t, high);
}
/** A runouts game's tile: its picture on the big screen. */
export function drawMode(id, ctx, f) {
  const { W, H } = f;
  ctx.fillStyle = '#0a0618'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) rect(ctx, 0, y, W, 1, 'rgba(255,255,255,0.03)');
  glow(ctx, W / 2, H / 2, W * 0.5, 'rgba(240,120,168,0.18)', 1);
  modeIcon(ctx, id, Math.round(W / 2), Math.round(H / 2), f.t);
}
