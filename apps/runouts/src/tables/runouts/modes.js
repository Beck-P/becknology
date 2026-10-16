// The sixteen runouts, drawn. Each mode draws its play-out into an area from its script (games/runouts.js) and the
// seconds since it started: draw(ctx, A, P) where A = { x, y, w, h } and P = { s (script), k (seconds), dur, n,
// col (a colour per player), name(i), t (wall clock), fx, sfx(name, key) }. The table draws the players and the
// ranking; a mode only plays its game out.
import { PAL, text, small, rect, disc, ring, line, ease, clamp, glow, hash } from '../../art/pix.js';
import { drawCard, dieFace, dieSpin, SW, SH } from '../../art/sprites.js';
import { symbol } from '../../art/symbols.js';
import { horse } from '../../art/horse.js';

const lerp = (a, b, k) => a + (b - a) * k;
const seg = (k, a, b) => clamp((k - a) / (b - a), 0, 1);
const cols = (A, n, i) => A.x + Math.round((A.w * (i + 0.5)) / n);

// ---- cards ---------------------------------------------------------------------------------------------------------------
function cardGame(holeN) {
  return (ctx, A, P) => {
    const { s, k, n } = P;
    const board = s.board, bw = SW * 5 + 4 * 3, bx = A.x + Math.round((A.w - bw) / 2), by = A.y + 6;
    const shown = k < 3 ? 0 : k < 5.5 ? 3 : k < 8 ? 4 : 5;
    board.forEach((c, i) => {
      const at = i < 3 ? 3 + i * 0.12 : i === 3 ? 5.5 : 8;
      drawCard(ctx, c, bx + i * (SW + 3), by, { small: true, flip: seg(k, at, at + 0.25) });
      if (k >= at && k < at + 0.05) P.sfx('flip', 'b' + i);
    });
    const hw = SW + (holeN - 1) * (holeN > 2 ? 6 : 10);
    for (let p = 0; p < n; p++) {
      const cx = cols(A, n, p), hy = by + SH + 12;
      s.hole[p].forEach((c, i) => {
        const at = 0.2 + (i * n + p) * 0.12;
        const kk = seg(k, at, at + 0.25);
        if (kk <= 0) return;
        const x = cx - Math.round(hw / 2) + i * (holeN > 2 ? 6 : 10), y = lerp(by - 20, hy, ease.out(kk));
        const final = k > P.dur - 1.2, best = final && s.best[p].includes(c.id);
        drawCard(ctx, c, x, y, { small: true, flip: seg(k, at + 0.2, at + 0.45), lift: best ? 2 : 0, glow: best ? P.col[p] : null });
      });
      if (shown >= 3) {
        const lab = labelAt(s, p, shown, holeN);
        const w = Math.min(A.w / n - 4, lab.length * 4 + 4);
        rect(ctx, cx - w / 2, hy + SH + 3, w, 8, 'rgba(8,4,24,0.85)');
        small(ctx, lab.slice(0, Math.floor((w - 4) / 4)), cx, hy + SH + 4, P.col[p], { align: 'center' });
      }
    }
    if (k > P.dur - 1.2) for (const c of board) { /* the winning five lit on the board */ }
  };
}
function labelAt(s, p, shown) {
  if (shown >= 5) return s.labels[p].toUpperCase();
  return shown === 3 ? 'ON THE FLOP' : 'ON THE TURN';
}

function highCard(ctx, A, P) {
  const { s, k, n } = P;
  for (let p = 0; p < n; p++) {
    const cx = cols(A, n, p), cy = A.y + A.h / 2 - 16;
    const at = 0.6 + p * 1.3, f = seg(k, at, at + 0.3);
    if (k > at && k < at + 0.05) P.sfx('flip', 'h' + p);
    const big = k > P.dur - 1.4 && P.order[0] === p;
    drawCard(ctx, s.cards[p], cx - 11, cy - (big ? 4 : 0), { flip: f, glow: big ? PAL.gold3 : null });
    if (f >= 1) small(ctx, ['', '', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING', 'ACE'][s.cards[p].r], cx, cy + 34, P.col[p], { align: 'center' });
  }
}

// ---- luck ----------------------------------------------------------------------------------------------------------------
function rngMode(ctx, A, P) {
  const { s, k, n } = P;
  for (let p = 0; p < n; p++) {
    const cx = cols(A, n, p), cy = A.y + A.h / 2 - 10;
    const stopAt = 1.6 + p * 1.2, done = k >= stopAt;
    const v = done ? s.nums[p] : 1 + Math.floor(hash(Math.floor(k * 20) + p * 13) * 100);
    rect(ctx, cx - 22, cy - 4, 44, 22, PAL.ink); rect(ctx, cx - 21, cy - 3, 42, 20, '#0a1a10');
    text(ctx, String(v).padStart(3, '0'), cx, cy + 1, done ? P.col[p] : '#40e080', { align: 'center', scale: 2 });
    if (done && k < stopAt + 0.05) P.sfx('stop', 'r' + p);
    if (!done && Math.floor(k * 20) % 2) P.sfx('tick', 'rt' + Math.floor(k * 20));
  }
}

function wheelMode(ctx, A, P) {
  const { s, k } = P;
  const R = Math.min(A.h / 2 - 6, A.w / 3), cx = A.x + A.w / 2, cy = A.y + A.h / 2;
  let i = Math.min(s.spins.length - 1, Math.max(0, Math.floor((k - 0.6) / 3.4)));
  const sp = s.spins[i], local = k - 0.6 - i * 3.4;
  const n = sp.alive.length, step = (Math.PI * 2) / n;
  const hitIdx = sp.alive.indexOf(sp.hit);
  // the pointer is at the top: the wheel ends with the hit segment's middle (jittered) under it
  const final = -Math.PI / 2 - (hitIdx + sp.jitter) * step;
  const spinK = clamp(local / 2.4, 0, 1);
  const ang = final - (1 - ease.out(spinK)) * sp.turns * Math.PI * 2;
  if (spinK < 1 && Math.floor(local * 14) !== Math.floor((local - 0.016) * 14)) P.sfx('tick', 'w' + i + Math.floor(local * 14));
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = Math.hypot(x, y);
    if (d > R) continue;
    let a = Math.atan2(y, x) - ang; a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sIdx = Math.floor(a / step), who = sp.alive[sIdx];
    const out = spinK >= 1 && local > 2.6 && who === sp.hit;
    ctx.fillStyle = d > R - 1.5 ? PAL.ink : d < 5 ? PAL.gold : a / step - sIdx < 0.04 ? PAL.ink : out && Math.floor(local * 8) % 2 ? '#ffffff' : P.col[who];
    ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
  }
  // the pointer
  for (let r = 0; r < 6; r++) rect(ctx, cx - (5 - r), cy - R - 6 + r, (5 - r) * 2 + 1, 1, r === 0 ? PAL.ink : PAL.gold3);
  if (spinK >= 1) { small(ctx, P.name(sp.hit).toUpperCase() + ' IS OUT', cx, cy + R + 4, P.col[sp.hit], { align: 'center', outline: PAL.ink }); if (local < 2.45) P.sfx('drop', 'wo' + i); }
}

function diceMode(ctx, A, P) {
  const { s, k, n } = P;
  for (let p = 0; p < n; p++) {
    const cx = cols(A, n, p), cy = A.y + A.h / 2 - 6;
    const at = 0.5 + p * 0.9, kk = seg(k, at, at + 0.8);
    if (kk <= 0) { ctx.globalAlpha = 0.3; ctx.drawImage(dieFace(1, 'ivory'), cx - 12, cy); ctx.drawImage(dieFace(1, 'ivory'), cx + 2, cy); ctx.globalAlpha = 1; continue; }
    if (kk < 1) {
      if (Math.floor(kk * 10) === 0) P.sfx('dice', 'd' + p);
      const fr = Math.floor(P.t * 16 + p);
      const jy = -Math.round(Math.abs(Math.sin(kk * Math.PI * 3)) * 10 * (1 - kk));
      ctx.drawImage(fr % 2 ? dieSpin(fr, 'ivory') : dieFace(1 + fr % 6, 'ivory'), cx - 13, cy + jy);
      ctx.drawImage(fr % 2 ? dieFace(1 + (fr * 5) % 6, 'ivory') : dieSpin(fr + 1, 'ivory'), cx + 2, cy + jy);
      continue;
    }
    ctx.drawImage(dieFace(s.rolls[p][0], 'ivory'), cx - 12, cy);
    ctx.drawImage(dieFace(s.rolls[p][1], 'ivory'), cx + 2, cy);
    text(ctx, String(s.rolls[p][0] + s.rolls[p][1]), cx, cy + 16, P.col[p], { align: 'center', scale: 2, outline: PAL.ink });
    const ex = s.extra[p];
    ex.forEach((d, j) => {
      const at2 = 0.5 + n * 0.9 + 0.8 + j * 1.0;
      if (k < at2) return;
      ctx.drawImage(dieFace(d, 'gold'), cx - 5 + j * 12 - (ex.length - 1) * 6, cy - 16);
      if (k < at2 + 0.05) P.sfx('dice', 'x' + p + j);
    });
  }
  if (s.extra.some((e) => e.length) && k > 0.5 + n * 0.9 + 0.6) small(ctx, 'TIE - ROLL OFF', A.x + A.w / 2, A.y + 4, PAL.gold3, { align: 'center' });
}

function coinMode(ctx, A, P) {
  const { s, k, n } = P;
  for (let p = 0; p < n; p++) {
    const cx = cols(A, n, p), x0 = cx - 18;
    let heads = 0;
    s.flips[p].forEach((f, i) => {
      const at = 0.6 + i * 0.9 + p * 0.12, kk = seg(k, at, at + 0.7);
      const step = Math.min(13, Math.floor((A.h - 22) / 5)), y = A.y + 4 + i * step;
      if (kk <= 0) { disc(ctx, cx, y + 4, 4, 'rgba(255,255,255,0.12)'); return; }
      if (kk < 1) {
        const w = Math.max(1, Math.round(Math.abs(Math.cos(kk * Math.PI * 6)) * 5));
        rect(ctx, cx - w, y - Math.round(Math.sin(kk * Math.PI) * 8), w * 2, 8, PAL.gold);
        if (kk < 0.1) P.sfx('coin', 'c' + p + i);
        return;
      }
      if (f) heads++;
      disc(ctx, cx, y + 4, 5, PAL.ink); disc(ctx, cx, y + 4, 4, f ? PAL.gold : '#8a84a8');
      small(ctx, f ? 'H' : 'T', cx + 1, y + 2, f ? '#5a3a08' : '#2a2440', { align: 'center' });
    });
    void x0;
    if (k > 0.6 + 4 * 0.9 + 0.8) small(ctx, heads + ' H', cx + 12, A.y + A.h - 10, P.col[p], { outline: PAL.ink });
    if (s.sd[p].length && k > 5.4) small(ctx, s.sd[p].map((x) => (x ? 'H' : 'T')).join(''), cx - 14, A.y + A.h - 10, PAL.gold3, { align: 'right' });
  }
}

function marbleMode(ctx, A, P) {
  const { s, k } = P;
  let tt = 0.8, out = new Set();
  const bx = A.x + A.w / 2, by = A.y + A.h / 2 + 4;
  // the bag
  disc(ctx, bx, by + 6, 18, PAL.ink, 14); disc(ctx, bx, by + 6, 17, '#5a3a70', 13); rect(ctx, bx - 8, by - 10, 16, 6, '#5a3a70'); rect(ctx, bx - 10, by - 6, 20, 2, PAL.gold2);
  for (const r of s.rounds) {
    for (const d of r.draws) {
      const kk = seg(k, tt, tt + 0.8);
      if (kk > 0 && kk < 1) {
        const tx = cols(A, P.n, d.who), ty = A.y + 10;
        const x = lerp(bx, tx, ease.out(kk)), y = lerp(by - 10, ty, ease.out(kk)) - Math.sin(kk * Math.PI) * 14;
        disc(ctx, x, y, 4, PAL.ink); disc(ctx, x, y, 3, d.black ? '#1c1830' : '#f4f0f8'); rect(ctx, x - 1, y - 2, 1, 1, '#ffffff');
        if (kk < 0.06) P.sfx(d.black ? 'boom' : 'tick', 'm' + tt);
      }
      if (k >= tt + 0.8 && d.black) out.add(d.who);
      tt += 0.95;
    }
    tt += 0.9;
  }
  for (let p = 0; p < P.n; p++) {
    const cx = cols(A, P.n, p);
    if (out.has(p)) { disc(ctx, cx, A.y + 10, 5, PAL.ink); disc(ctx, cx, A.y + 10, 4, '#1c1830'); small(ctx, 'OUT', cx, A.y + 18, '#ff6070', { align: 'center' }); }
  }
}

function slotsMode(ctx, A, P) {
  const { s, k, n } = P;
  const ALL = ['seven', 'bell', 'bar', 'cherry', 'star', 'lemon'];
  for (let p = 0; p < n; p++) {
    const cx = cols(A, n, p), cy = A.y + A.h / 2 - 12;
    rect(ctx, cx - 28, cy - 4, 56, 26, PAL.ink); rect(ctx, cx - 27, cy - 3, 54, 24, P.col[p]); rect(ctx, cx - 25, cy - 1, 50, 20, '#f4f0f8');
    for (let r = 0; r < 3; r++) {
      const at = 1 + p * 1.3 + r * 0.25, stopped = k >= at;
      const sym = stopped ? s.reels[p][r] : ALL[Math.floor(hash(Math.floor(P.t * 18) + r * 7 + p) * ALL.length)];
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 25, cy - 1, 50, 20); ctx.clip();
      ctx.drawImage(symbol(sym), cx - 24 + r * 17, cy + 1 + (stopped ? 0 : Math.round(hash(P.t * 9 + r) * 4) - 2));
      ctx.restore();
      if (stopped && k < at + 0.05) P.sfx('stop', 's' + p + r);
    }
  }
}

// ---- shows ---------------------------------------------------------------------------------------------------------------
function raceMode(ctx, A, P) {
  const { s, k, n } = P;
  const tr = s.trace, f = clamp(k / (P.dur - 1.2), 0, 1) * (tr.length - 1), a = Math.floor(f), b = Math.min(tr.length - 1, a + 1), m = f - a;
  const lane = Math.floor((A.h - 6) / n);
  for (let y = A.y; y < A.y + A.h; y++) rect(ctx, A.x, y, A.w, 1, Math.floor((y - A.y) / 2) % 2 ? '#7a4a2a' : '#6e4224');
  const finishX = A.x + A.w - 18;
  for (let y = A.y; y < A.y + A.h; y += 3) rect(ctx, finishX, y, 3, 3, Math.floor((y - A.y) / 3) % 2 ? '#ffffff' : '#1c1830');
  for (let p = 0; p < n; p++) {
    const pos = tr[a][p] + (tr[b][p] - tr[a][p]) * m;
    const x = A.x + 4 + Math.round((pos / 100) * (finishX - A.x - 30)), y = A.y + 3 + p * lane + lane - 20;
    const running = pos < 100;
    ctx.drawImage(horse(p, P.col[p], running ? Math.floor(P.t * 12 + p) % 4 : 1), x, y);
    if (running && p === 0 && Math.floor(P.t * 12) % 4 === 0) P.sfx('hoof', 'hf' + Math.floor(P.t * 3));
  }
}

function rocketMode(ctx, A, P) {
  const { s, k, n } = P;
  const max = Math.max(...s.crash), scale = (P.dur - 3.2) / max;
  for (let i = 0; i < 30; i++) rect(ctx, A.x + Math.round(hash(i) * A.w), A.y + Math.round(hash(i * 3) * A.h), 1, 1, 'rgba(255,255,255,0.5)');
  for (let p = 0; p < n; p++) {
    const cx = cols(A, n, p), t0 = 1.0, boomAt = t0 + s.crash[p] * scale, fly = Math.max(0, Math.min(k, boomAt) - t0);
    const y = A.y + A.h - 22 - Math.min(A.h - 30, fly * fly * 4);
    if (k < boomAt) {
      ctx.drawImage(symbol('rocket'), cx - 8, Math.round(y));
      if (k > t0) for (let j = 0; j < 3; j++) rect(ctx, cx - 1 + j - 1, Math.round(y) + 16 + j, 2, 2 + Math.round(Math.random() * 4), j % 2 ? '#ffe080' : '#ff8030');
    } else {
      const kk = clamp((k - boomAt) / 0.6, 0, 1);
      if (kk < 1) { disc(ctx, cx, y + 8, 3 + kk * 10, kk < 0.5 ? '#ffe080' : '#ff8030'); if (kk < 0.08) P.sfx('boom', 'rb' + p); }
      else small(ctx, 'BOOM', cx, y + 4, '#ff6070', { align: 'center' });
    }
    small(ctx, (Math.min(k, boomAt) > t0 ? (Math.min(k, boomAt) - t0) / scale : 0).toFixed(1) + 'S', cx, A.y + A.h - 6, P.col[p], { align: 'center' });
  }
}

function invadersMode(ctx, A, P) {
  const { s, k, n } = P;
  const dead = new Map();
  s.shots.forEach((who, i) => dead.set(who, 1.8 + i * 2.6 + 1.2));
  const cannonX = (() => {
    const i = Math.min(s.shots.length - 1, Math.max(0, Math.floor((k - 1.8) / 2.6)));
    const target = cols(A, n, s.shots[i]);
    const prevX = i > 0 ? cols(A, n, s.shots[i - 1]) : A.x + A.w / 2;
    return lerp(prevX, target, ease.inOut(seg(k - 1.8 - i * 2.6, 0, 0.8)));
  })();
  for (let p = 0; p < n; p++) {
    const cx = cols(A, n, p), y = A.y + 12 + Math.round(Math.min(k, 9) * 1.2) + (Math.floor(P.t * 2) % 2);
    const d = dead.get(p);
    if (d != null && k > d) { const kk = clamp((k - d) / 0.5, 0, 1); if (kk < 1) { for (let j = 0; j < 8; j++) rect(ctx, cx + Math.cos(j) * kk * 12, y + 6 + Math.sin(j) * kk * 12, 2, 2, P.col[p]); if (kk < 0.1) P.sfx('boom', 'iv' + p); } continue; }
    ctx.drawImage(symbol('alien'), cx - 8, y);
    rect(ctx, cx - 3, y + 17, 6, 2, P.col[p]);
  }
  // the cannon and its shots
  const by = A.y + A.h - 10;
  rect(ctx, cannonX - 7, by, 14, 5, '#40e080'); rect(ctx, cannonX - 1, by - 3, 2, 3, '#40e080');
  s.shots.forEach((who, i) => {
    const fireAt = 1.8 + i * 2.6 + 0.9, kk = seg(k, fireAt - (s.misses[i] ? 0.6 : 0), fireAt + 0.3);
    if (kk > 0 && kk < 1) { const tx = cols(A, n, who); rect(ctx, tx, lerp(by - 4, A.y + 20, kk), 1, 4, '#ffffff'); if (kk < 0.1) P.sfx('tick', 'sh' + i); }
  });
}

function bombMode(ctx, A, P) {
  const { s, k, n } = P;
  const cx = A.x + A.w / 2, cy = A.y + A.h / 2, R = Math.min(A.w / 2 - 20, A.h / 2 - 10);
  const posOf = (p) => { const a = -Math.PI / 2 + (p / n) * Math.PI * 2; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8]; };
  let tt = 0.8, holder = null, from = null, prog_ = 1, out = new Set(), boom = null;
  for (const r of s.rounds) {
    for (let j = 0; j < r.passes.length; j++) {
      if (k >= tt) { from = j > 0 ? r.passes[j - 1] : r.passes[0]; holder = r.passes[j]; prog_ = clamp((k - tt) / 0.38, 0, 1); }
      tt += 0.42;
    }
    const last = r.passes[r.passes.length - 1];
    if (k >= tt) { out.add(last); if (k < tt + 0.9) boom = { who: last, kk: (k - tt) / 0.9 }; }
    tt += 1.5;
  }
  for (let p = 0; p < n; p++) {
    const [x, y] = posOf(p);
    disc(ctx, x, y, 9, PAL.ink); disc(ctx, x, y, 8, out.has(p) ? '#3a3448' : P.col[p]);
    small(ctx, out.has(p) ? 'X' : String(p + 1), x + 1, y - 2, PAL.ink, { align: 'center' });
  }
  if (holder != null && !(boom && boom.kk < 1)) {
    const [ax, ay] = posOf(from), [bx, by] = posOf(holder);
    const x = lerp(ax, bx, ease.inOut(prog_)), y = lerp(ay, by, ease.inOut(prog_)) - Math.sin(prog_ * Math.PI) * 14;
    disc(ctx, x, y, 5, PAL.ink); disc(ctx, x, y, 4, '#2a2440'); rect(ctx, x + 2, y - 7, 1, 3, '#a08040');
    if (Math.floor(P.t * 12) % 2) rect(ctx, x + 2, y - 9, 2, 2, '#ffe080');
    if (prog_ < 0.1) P.sfx('tick', 'bp' + Math.floor(k * 3));
  }
  if (boom && boom.kk < 1) { const [x, y] = posOf(boom.who); glow(ctx, x, y, 30 * boom.kk + 10, 'rgba(255,170,80,0.9)', 1 - boom.kk); disc(ctx, x, y, 4 + boom.kk * 16, 'rgba(255,230,160,' + (1 - boom.kk) + ')'); if (boom.kk < 0.06) P.sfx('boom', 'bb' + boom.who); }
}

function plinkoMode(ctx, A, P) {
  const { s, k, n } = P;
  const rows = 8, slots = s.slots.length, top = A.y + 8, bottom = A.y + A.h - 14;
  const sw = Math.min(16, Math.floor((A.w - 10) / slots)), x0 = A.x + Math.round((A.w - sw * slots) / 2);
  const rowH = (bottom - top) / (rows + 1);
  for (let r = 0; r < rows; r++) for (let c = 0; c <= r; c++) {
    const x = x0 + sw * slots / 2 + (c - r / 2) * sw, y = top + (r + 1) * rowH;
    rect(ctx, Math.round(x), Math.round(y), 2, 2, '#c8c0e0');
  }
  s.slots.forEach((v, i) => { rect(ctx, x0 + i * sw, bottom, sw - 1, 12, v >= 100 ? '#6a5010' : v >= 25 ? '#2a5a3a' : '#2a2440'); small(ctx, String(v), x0 + i * sw + sw / 2, bottom + 3, PAL.white, { align: 'center' }); });
  for (let p = 0; p < n; p++) {
    const at = 1 + p * 1.7, kk = seg(k, at, at + 1.5);
    if (kk <= 0) continue;
    const path = s.paths[p];
    const fr = kk * (rows + 1), r = Math.floor(fr), m = fr - r;
    let c = 0;
    for (let j = 0; j < Math.min(r, rows); j++) c += path[j];
    const cNext = c + (r < rows ? path[r] : 0);
    const xAt = (row, cc) => x0 + sw * slots / 2 + (cc - row / 2) * sw + (row === rows + 0 ? 0 : 0);
    const x = r >= rows ? x0 + (s.land[p] + 0.5) * sw : lerp(xAt(r, c), xAt(r + 1, cNext), m);
    const y = top + Math.min(rows + 1, fr) * rowH - Math.sin(m * Math.PI) * 3;
    disc(ctx, x + 1, y, 3, PAL.ink); disc(ctx, x + 1, y, 2, P.col[p]);
    if (Math.floor(fr) !== Math.floor(fr - 0.05) && kk < 1) P.sfx('ball', 'pl' + p + r);
  }
}

function royaleMode(ctx, A, P) {
  const { s, k, n } = P;
  const sz = Math.min(A.w, A.h) - 8, mx = A.x + Math.round((A.w - sz) / 2), my = A.y + 4;
  for (let y = 0; y < sz; y += 4) for (let x = 0; x < sz; x += 4) rect(ctx, mx + x, my + y, 4, 4, hash(x * 3 + y) > 0.5 ? '#2a5a3a' : '#24502f');
  const elim = P.order.slice(1).reverse();          // first out first
  const outAt = new Map(elim.map((p, i) => [p, 2 + i * 2.3 + 1.6]));
  const shrink = clamp((k - 1) / (P.dur - 2.4), 0, 1);
  const zr = (1 - shrink * 0.92) * sz * 0.75, zx = mx + s.centre[0] * sz, zy = my + s.centre[1] * sz;
  ring(ctx, zx, zy, zr, '#5cc8d0', zr, 1);
  ctx.globalAlpha = 0.18; for (let y = 0; y < sz; y += 2) for (let x = (y / 2) % 2 ? 1 : 0; x < sz; x += 2) if (Math.hypot(mx + x - zx, my + y - zy) > zr) rect(ctx, mx + x, my + y, 1, 1, '#a040c0'); ctx.globalAlpha = 1;
  for (let p = 0; p < n; p++) {
    const ox = mx + s.pos[p][0] * sz, oy = my + s.pos[p][1] * sz;
    const pull = shrink * 0.6;
    const x = lerp(ox, zx, pull) + Math.sin(P.t * 2 + p) * 2, y = lerp(oy, zy, pull) + Math.cos(P.t * 1.7 + p) * 2;
    const d = outAt.get(p);
    if (d != null && k > d) { small(ctx, 'X', x, y - 2, '#ff6070', { align: 'center' }); if (k < d + 0.05) P.sfx('boom', 'br' + p); continue; }
    rect(ctx, x - 2, y - 2, 5, 5, PAL.ink); rect(ctx, x - 1, y - 1, 3, 3, P.col[p]);
  }
}

function stocksMode(ctx, A, P) {
  const { s, k, n } = P;
  const len = s.series[0].length, f = clamp(k / (P.dur - 1.2), 0, 1) * (len - 1);
  let lo = Infinity, hi = -Infinity;
  for (const ser of s.series) for (const v of ser) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const gx = A.x + 6, gy = A.y + 6, gw = A.w - 54, gh = A.h - 14;
  rect(ctx, gx, gy, gw, gh, 'rgba(8,4,24,0.6)');
  for (let i = 1; i < 4; i++) rect(ctx, gx, gy + Math.round((gh * i) / 4), gw, 1, 'rgba(255,255,255,0.06)');
  const Y = (v) => gy + gh - Math.round(((v - lo) / (hi - lo || 1)) * (gh - 2)) - 1;
  for (let p = 0; p < n; p++) {
    const ser = s.series[p];
    let lx = gx, ly = Y(ser[0]);
    for (let i = 1; i <= Math.floor(f); i++) { const x = gx + Math.round((i / (len - 1)) * (gw - 1)), y = Y(ser[i]); line(ctx, lx, ly, x, y, P.col[p]); lx = x; ly = y; }
    const cur = ser[Math.floor(f)];
    rect(ctx, lx - 1, ly - 1, 3, 3, PAL.white);
    small(ctx, s.names[p] + ' ' + Math.round(cur), gx + gw + 4, gy + 4 + p * 10, P.col[p]);
  }
  if (Math.floor(f * 2) % 2) P.sfx('tick', 'st' + Math.floor(f));
}

export const MODE_DRAW = {
  holdem: cardGame(2), plo: cardGame(4), 'high-card': highCard, rng: rngMode, wheel: wheelMode, dice: diceMode,
  'coin-flips': coinMode, 'black-marble': marbleMode, slots: slotsMode, 'horse-race': raceMode, rocket: rocketMode,
  'space-invaders': invadersMode, bomb: bombMode, plinko: plinkoMode, 'battle-royale': royaleMode, 'stock-market': stocksMode,
};

/** The little picture for a mode's lobby tile (and the felt between rounds). */
export function modeIcon(ctx, id, x, y, t) {
  const icons = { holdem: 'card', plo: 'card', 'high-card': 'card', rng: 'num', wheel: 'wheel', dice: 'dice', 'coin-flips': 'coin', 'black-marble': 'marble', slots: 'seven', 'horse-race': 'horse', rocket: 'rocket', 'space-invaders': 'alien', bomb: 'bomb', plinko: 'plinko', 'battle-royale': 'zone', 'stock-market': 'chart', random: 'random' };
  const k = icons[id] || 'random';
  if (k === 'card') { drawCard(ctx, { r: id === 'plo' ? 12 : 14, s: id === 'high-card' ? 's' : 'h', id: 1 }, x - 11, y - 15, { flip: 1 }); if (id !== 'high-card') drawCard(ctx, { r: 13, s: 'd', id: 2 }, x - 2, y - 13, { flip: 1 }); return; }
  if (k === 'num') { rect(ctx, x - 16, y - 8, 32, 16, PAL.ink); text(ctx, String(10 + Math.floor(hash(Math.floor(t * 4)) * 89)), x, y - 4, '#40e080', { align: 'center', scale: 1 }); return; }
  if (k === 'wheel') { const R = 13; for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) { const d = Math.hypot(xx, yy); if (d > R) continue; const a = ((Math.atan2(yy, xx) - t) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); ctx.fillStyle = d > R - 1.2 ? PAL.ink : ['#f078a8', '#5cc8d0', '#e8c040', '#40e080'][Math.floor(a / (Math.PI / 2))]; ctx.fillRect(x + xx, y + yy, 1, 1); } return; }
  if (k === 'dice') { ctx.drawImage(dieFace(1 + Math.floor(t * 2) % 6, 'ivory'), x - 13, y - 6); ctx.drawImage(dieFace(1 + Math.floor(t * 2 + 3) % 6, 'red'), x + 2, y - 6); return; }
  if (k === 'coin') { const w = Math.max(1, Math.round(Math.abs(Math.cos(t * 3)) * 8)); disc(ctx, x, y, w, PAL.gold, 8); return; }
  if (k === 'marble') { disc(ctx, x, y + 2, 12, '#5a3a70', 9); disc(ctx, x - 4, y - 8, 4, '#f4f0f8'); disc(ctx, x + 5, y - 9, 4, '#1c1830'); return; }
  if (k === 'horse') { ctx.drawImage(horse(1, '#f078a8', Math.floor(t * 10) % 4), x - 13, y - 10); return; }
  if (k === 'zone') { ring(ctx, x, y, 12 - (t % 2) * 3, '#5cc8d0'); for (let i = 0; i < 4; i++) rect(ctx, x - 8 + i * 5, y - 2 + (i % 2) * 4, 3, 3, ['#f078a8', '#5cc8d0', '#e8c040', '#40e080'][i]); return; }
  if (k === 'bomb') { disc(ctx, x, y + 2, 9, PAL.ink); disc(ctx, x, y + 2, 8, '#2a2440'); rect(ctx, x + 4, y - 10, 2, 5, '#a08040'); if (Math.floor(t * 8) % 2) rect(ctx, x + 4, y - 12, 3, 3, '#ffe080'); return; }
  if (k === 'plinko') { for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) rect(ctx, x - r * 4 + c * 8, y - 10 + r * 6, 2, 2, '#c8c0e0'); disc(ctx, x + Math.sin(t * 3) * 6, y - 12 + ((t * 20) % 26), 2, '#f078a8'); return; }
  if (k === 'chart') { let lx = x - 16, ly = y + 6; for (let i = 1; i <= 8; i++) { const nx = x - 16 + i * 4, ny = y + 6 - Math.round(hash(i + Math.floor(t)) * 10) - i; line(ctx, lx, ly, nx, ny, '#40e080'); lx = nx; ly = ny; } return; }
  if (k === 'random') { text(ctx, '?', x, y - 10, PAL.gold3, { align: 'center', scale: 3, outline: PAL.ink }); return; }
  ctx.drawImage(symbol(k), x - 8, y - 8);
}
void glow;
