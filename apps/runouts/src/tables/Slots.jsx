// The slot machines: pick a cabinet (Neon 7s, Starfall, Koi Fortune), set the bet, pull the lever. The reels spin
// and stop one by one (holding their breath when a bonus is close), winning lines light up and count up, comets
// start free spins, lanterns open the pearl bonus. Playing together, the other pilot's machine runs beside yours.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SL from '../games/slots.js';
import { tableInfo } from '../core/tables.js';
import { secureRandom } from '../core/rng.js';
import { PAL, text, small, rect, glow, ease, clamp, line, hash } from '../art/pix.js';
import { symbol } from '../art/symbols.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, Btn, Banner, Help, useKeys, Together, useWallet } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';
import { runState } from '../core/wallet.js';

const THEME = {
  neon7: { cab: '#3a1450', cab2: '#24093a', trim: '#f078a8', glass: '#f4f0f8', glass2: '#d8d0e8', sign: '#f078a8', line: '#ff4090', lights: ['#f078a8', '#ffe080'] },
  starfall: { cab: '#16204a', cab2: '#0c1230', trim: '#5cc8d0', glass: '#0c1028', glass2: '#141a3c', sign: '#80e0e8', line: '#80e0e8', lights: ['#5cc8d0', '#c070f0'] },
  koi: { cab: '#6a1420', cab2: '#400a14', trim: '#e0c060', glass: '#f8f0e0', glass2: '#e8dcc4', sign: '#ffe080', line: '#ffd040', lights: ['#ffe080', '#e84040'] },
};
const MACHINE_BY_TABLE = (id) => { const n = parseInt((String(id).match(/(\d+)$/) || [])[1] || '1', 10); return SL.MACHINE_IDS[(n - 1) % 3]; };
const SPEED = 22;                       // cells a second while spinning

export default function Slots({ wallet, table, stakes, link, onBack, backLabel, say }) {
  useWallet(wallet);
  const info = useMemo(() => tableInfo('slots', table, stakes), [table, stakes]);
  const bets = info.limits.bets;
  const [mid, setMid] = useState(() => MACHINE_BY_TABLE(info.id));
  const [bet, setBet] = useState(bets[1] || bets[0]);
  const [spin, setSpin] = useState(null);          // { r: play(), at, idx (free spin index), picks }
  const [auto, setAuto] = useState(0);
  const [banner, setBanner] = useState(null);
  const [help, setHelp] = useState(false);
  const [peer, setPeer] = useState(() => (link ? { idle: true, m: 'neon7' } : null));   // their machine, beside yours
  const [gone, setGone] = useState(false);
  const [session, setSession] = useState(0);
  const memo = useRef(new Memo()).current;
  const stage = useRef(null);
  const live = useRef({ busy: false, paid: new Set(), key: 0 });
  const M = SL.MACHINES[mid], TH = THEME[mid];
  const spinRef = useRef(null);
  spinRef.current = spin;

  useEffect(() => {
    if (!link) return;
    link.on('spin', (d) => setPeer(d));
    link.onGone(() => setGone(true));
    link.ready();
  }, [link]);

  // what the screen is doing right now, from the spin and the clock
  const timeline = useCallback((sp, now) => {
    if (!sp) return { stage: 'idle' };
    const cur = sp.idx >= 0 && sp.r.bonus && sp.r.bonus.kind === 'free' ? sp.r.bonus.spins[sp.idx] : sp.r;
    const el = (now - sp.at) / 1000;
    const stopsAt = stopTimes(M, cur);
    const done = stopsAt[stopsAt.length - 1] + 0.25;
    return { stage: el < done ? 'spinning' : 'showing', cur, el, stopsAt, done };
  }, [M]);

  const settle = useCallback((sp) => {
    if (!sp || live.current.paid.has(sp.key)) return;
    live.current.paid.add(sp.key);
    wallet.pay(sp.r.pay, 'slots', 'slots:' + sp.key, 0);
    const net = sp.r.pay - sp.r.bet;
    if (net > 0) recordWin('slots', net);
    setSession((s) => s + net);
    runState(false);
  }, [wallet]);
  useEffect(() => { if (link) link.score(session, session > 0 ? 'UP ' + session : session < 0 ? 'DOWN ' + -session : 'EVEN'); }, [session, link]);
  useEffect(() => () => { const sp = spinRef.current; if (sp && !live.current.paid.has(sp.key)) { live.current.paid.add(sp.key); wallet.pay(sp.r.pay, 'slots', 'slots:' + sp.key, 0); } runState(false); }, []); // eslint-disable-line

  const pull = useCallback(async () => {
    if (live.current.busy) return;
    const now = performance.now();
    // a spin still showing: finish it first (pay what it won)
    if (spin) {
      const tl = timeline(spin, now);
      if (spin.r.bonus && spin.r.bonus.kind === 'pick' && spin.picks.length < 3) return;
      if (spin.r.bonus && spin.r.bonus.kind === 'free' && spin.idx < spin.r.bonus.spins.length - 1) return;
      if (tl.stage === 'spinning') { setSpin({ ...spin, at: spin.at - 10000 }); return; }
      settle(spin);
    }
    if (bet > wallet.balance) { sfx('deny'); say('Not enough chips for that bet'); setAuto(0); return; }
    live.current.busy = true;
    const ok = await wallet.stake(bet, 'slots');
    if (!ok) { live.current.busy = false; say('The cage didn’t take it'); setAuto(0); return; }
    const r = SL.play(mid, bet, secureRandom);
    wallet.hold(r.pay, 'slots');
    runState(true, 'Reels spinning · Esc again to leave (it pays)');
    const key = Date.now() + ':' + (live.current.key++);
    setSpin({ r, at: performance.now(), idx: -1, picks: [], key });
    memo.forget('sp'); setBanner(null);
    sfx('launch'); memo.lever = performance.now() / 1000;
    if (link && !link.isGone()) link.send('spin', { m: mid, grid: r.grid, win: r.pay, bet, bonus: r.bonus ? r.bonus.kind : null });
    live.current.busy = false;
  }, [spin, bet, wallet, mid, link, say, timeline, settle, memo]);

  // auto play, free spins rolling on, the bonus handover
  useEffect(() => {
    const t = setInterval(() => {
      if (!spin) { if (auto > 0) { setAuto((a) => a - 1); pull(); } return; }
      const tl = timeline(spin, performance.now());
      if (tl.stage !== 'showing') return;
      const b = spin.r.bonus;
      const since = tl.el - tl.done;
      if (b && b.kind === 'free') {
        if (spin.idx < b.spins.length - 1 && since > (spin.idx < 0 ? 2.4 : 1.6)) { setSpin({ ...spin, idx: spin.idx + 1, at: performance.now() }); return; }
        if (spin.idx === b.spins.length - 1 && since > 1.2 && !live.current.paid.has(spin.key)) settle(spin);
      } else if (b && b.kind === 'pick') {
        if (spin.picks.length >= 3 && since > 0) { if (!memo.has('pickdone' + spin.key)) memo.at('pickdone' + spin.key, performance.now() / 1000); else if (performance.now() / 1000 - memo.seen.get('pickdone' + spin.key) > 1.6) settle(spin); }
      } else if (since > 0.4) settle(spin);
      if (auto > 0 && live.current.paid.has(spin.key) && since > 1.2) { setAuto((a) => a - 1); pull(); }
    }, 150);
    return () => clearInterval(t);
  }, [spin, auto, pull, timeline, settle, memo]);

  // the big moments
  useEffect(() => {
    if (!spin) return;
    const b = spin.r.bonus;
    const id = setTimeout(() => {
      const r = spin.r;
      if (spin.idx < 0) {
        const win = r.win, x = win / r.bet;
        if (b && b.kind === 'free') { setBanner({ text: b.spins.length + ' FREE SPINS', sub: 'every win ×' + b.mult, tone: 'win big', k: Date.now() }); sfx('bigwin'); }
        else if (b && b.kind === 'pick') { setBanner({ text: 'PEARL BONUS', sub: 'pick three pearls', tone: 'win', k: Date.now() }); sfx('bigwin'); }
        else if (x >= 50) { setBanner({ text: 'MEGA WIN', sub: num(win), tone: 'win big', k: Date.now() }); sfx('bigwin'); memo.fx.coins(stage.current.size().W / 2, stage.current.size().H * 0.5, 70); }
        else if (x >= 15) { setBanner({ text: 'BIG WIN', sub: num(win), tone: 'win big', k: Date.now() }); sfx('bigwin'); memo.fx.coins(stage.current.size().W / 2, stage.current.size().H * 0.5, 40); }
        else if (win > 0) sfx('win');
      }
    }, Math.round(timeline(spin, spin.at).done * 1000) + 60);
    return () => clearTimeout(id);
  }, [spin]); // eslint-disable-line
  useEffect(() => {
    if (!spin || !spin.r.bonus || spin.r.bonus.kind !== 'free' || spin.idx !== spin.r.bonus.spins.length - 1) return;
    const id = setTimeout(() => { const tot = spin.r.bonus.total; setBanner({ text: 'BONUS WIN', sub: num(tot) + ' from ' + spin.r.bonus.spins.length + ' free spins', tone: tot > 0 ? 'win big' : '', k: Date.now() }); if (tot > 0) { sfx('bigwin'); memo.fx.coins(stage.current.size().W / 2, stage.current.size().H * 0.5, 50); } }, 2600);
    return () => clearTimeout(id);
  }, [spin]); // eslint-disable-line

  const pickPearl = (i) => {
    if (!spin || !spin.r.bonus || spin.r.bonus.kind !== 'pick' || spin.picks.includes(i) || spin.picks.length >= 3) return;
    const picks = [...spin.picks, i];
    setSpin({ ...spin, picks });
    sfx(picks.length === 3 ? 'bigwin' : 'coin');
    if (picks.length === 3) setTimeout(() => setBanner({ text: 'PEARLS PAY ' + num(spin.r.bonus.total), tone: 'win big', k: Date.now() }), 500);
  };

  const betDown = () => { const i = bets.indexOf(bet); if (i > 0) { setBet(bets[i - 1]); sfx('chip'); } };
  const betUp = () => { const i = bets.indexOf(bet); if (i < bets.length - 1) { setBet(bets[i + 1]); sfx('chip'); } };
  const busyNow = spin && timeline(spin, performance.now()).stage === 'spinning';
  const inBonus = spin && spin.r.bonus && ((spin.r.bonus.kind === 'free' && spin.idx < spin.r.bonus.spins.length - 1) || (spin.r.bonus.kind === 'pick' && spin.picks.length < 3));
  useKeys({ ' ': () => pull(), Enter: () => pull(), ArrowUp: betUp, ArrowDown: betDown }, [pull, bet]);

  // ---- drawing ------------------------------------------------------------------------------------------------------------
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000, now = performance.now();
    ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, W, H);
    // the floor of the slot hall: rows of other machines glowing in the dark
    for (let i = 0; i < Math.ceil(W / 34) + 1; i++) {
      const x = i * 34 - 6, c = THEME[SL.MACHINE_IDS[i % 3]];
      rect(ctx, x, 4, 26, H * 0.32, c.cab2);
      rect(ctx, x + 3, 8, 20, 6, c.trim + '55');
      rect(ctx, x + 4, 18, 18, 14, 'rgba(255,255,255,0.05)');
      if (Math.floor(t * 2 + i) % 5 === 0) rect(ctx, x + 3, 8, 20, 6, c.trim + 'aa');
    }
    ctx.fillStyle = 'rgba(16,8,32,0.72)'; ctx.fillRect(0, 0, W, H);
    const port = H > W * 1.05;
    const peerW = peer && !port ? Math.round(W * 0.24) : 0;
    const cw = M.reels === 3 ? 26 : 22, chh = 22;
    const rw = cw * M.reels + (M.reels - 1) * 2, rh = chh * 3;
    const cabW = Math.min(W - peerW - 12, rw + 44), cabH = Math.min(H - 6, rh + 84);
    const cx = Math.round((W - peerW) / 2), cabX = cx - Math.round(cabW / 2), cabY = Math.round((H - cabH) / 2) + (port ? -10 : 0);
    drawCabinet(ctx, { x: cabX, y: cabY, w: cabW, h: cabH, rw, rh, cw, chh, t, now, spin, M, TH, f, timeline, memo, mid, lever: memo.lever, onLever: true });
    if (peer && !port) drawPeer(ctx, W - peerW + 2, 6, peerW - 6, H - 12, peer, t, link && link.peer.name, gone);
    memo.fx.update(f.dt); memo.fx.draw(ctx);
    memo.drawFloats(ctx, t);
  };

  function drawCabinet(ctx, o) {
    const { x, y, w, h, rw, rh, cw, chh, t, spin: sp, M: Mm, TH: th, f } = o;
    // body
    rect(ctx, x - 2, y - 2, w + 4, h + 4, PAL.ink);
    rect(ctx, x, y, w, h, th.cab);
    rect(ctx, x, y + h - 12, w, 12, th.cab2);
    rect(ctx, x + 2, y + 2, w - 4, 1, 'rgba(255,255,255,0.18)');
    // chasing lights round the edge
    const n = Math.floor((w + h) / 5);
    for (let i = 0; i < n * 2; i++) {
      const per = 2 * (w + h), d = (i * per) / (n * 2);
      let lx, ly;
      if (d < w) { lx = x + d; ly = y + 1; } else if (d < w + h) { lx = x + w - 2; ly = y + d - w; } else if (d < 2 * w + h) { lx = x + w - (d - w - h); ly = y + h - 2; } else { lx = x + 1; ly = y + h - (d - 2 * w - h); }
      const on = (Math.floor(t * 8) + i) % 4 === 0;
      rect(ctx, lx, ly, 1, 1, on ? th.lights[i % 2] : 'rgba(255,255,255,0.15)');
    }
    // the sign
    const signY = y + 6;
    rect(ctx, x + 8, signY, w - 16, 20, '#0a0418');
    rect(ctx, x + 8, signY + 19, w - 16, 1, th.trim);
    glow(ctx, x + w / 2, signY + 10, w * 0.4, th.sign + '66', 0.6 + Math.sin(t * 5) * 0.1);
    text(ctx, Mm.name, x + w / 2, signY + 4, th.sign, { align: 'center', outline: '#1a0820' });
    small(ctx, Mm.lines.length + ' LINES', x + w / 2, signY + 13, 'rgba(255,255,255,0.6)', { align: 'center' });
    // the reels
    const rx = Math.round(x + (w - rw) / 2), ry = signY + 26;
    rect(ctx, rx - 3, ry - 3, rw + 6, rh + 6, PAL.ink);
    rect(ctx, rx - 2, ry - 2, rw + 4, rh + 4, th.trim);
    rect(ctx, rx - 1, ry - 1, rw + 2, rh + 2, PAL.ink);
    const tl = sp ? o.timeline(sp, o.now) : { stage: 'idle' };
    const cur = tl.cur || null;
    const strips = SL.strips(Mm);
    const idle = o.memo.idleStops || (o.memo.idleStops = {});
    if (!idle[o.mid]) idle[o.mid] = strips.map((s, i) => Math.floor(hash(i + 3) * s.length));
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    for (let r = 0; r < Mm.reels; r++) {
      const strip = strips[r], L = strip.length, X = rx + r * (cw + 2);
      rect(ctx, X, ry, cw, rh, th.glass);
      rect(ctx, X, ry, cw, 2, th.glass2); rect(ctx, X, ry + rh - 3, cw, 3, th.glass2);
      let pos, moving = false;
      if (cur && tl.stage === 'spinning') {
        const st = tl.stopsAt[r];
        if (tl.el < st) { pos = cur.stops[r] - 1 + (st - tl.el) * SPEED; moving = true; }
        else { const k = (tl.el - st) / 0.18; pos = cur.stops[r] - 1 - (k < 1 ? Math.sin(k * Math.PI) * 0.18 : 0); if (!o.memo.has('stop' + sp.key + sp.idx + r)) { o.memo.at('stop' + sp.key + sp.idx + r, t); sfx('stop'); } }
      } else if (cur) pos = cur.stops[r] - 1;
      else pos = idle[o.mid][r] - 1;
      const base = Math.floor(pos), frac = pos - base;
      for (let i = -1; i < 4; i++) {
        const sym = strip[(((base + i) % L) + L) % L];
        const sy = Math.round(ry + (i - frac) * chh + (chh - 16) / 2);
        const img = symbol(sym);
        if (moving) {
          ctx.globalAlpha = 0.85; ctx.drawImage(img, X + Math.round((cw - 16) / 2), sy);
          ctx.globalAlpha = 0.35; ctx.drawImage(img, X + Math.round((cw - 16) / 2), sy - 5); ctx.globalAlpha = 1;
        } else ctx.drawImage(img, X + Math.round((cw - 16) / 2), sy);
      }
      if (moving && Math.floor(t * 30) % 3 === 0) sfx('reel', 60);
      // the anticipation glow when the reel's holding its breath
      if (moving && cur && tl.stopsAt[r] - (r ? tl.stopsAt[r - 1] : 0) > 0.6 && tl.el > (r ? tl.stopsAt[r - 1] : 0)) { ctx.globalAlpha = 0.25 + Math.sin(t * 20) * 0.15; rect(ctx, X, ry, cw, rh, th.line); ctx.globalAlpha = 1; }
    }
    // the shine on the glass
    ctx.globalAlpha = 0.12; rect(ctx, rx, ry + 2, rw, 3, '#ffffff'); ctx.globalAlpha = 1;
    // winning lines, one after another
    if (cur && tl.stage === 'showing') {
      const wins = cur.wins || [];
      const sc = cur.scatter ? cur.scatter.cells : cur.trigger ? cur.trigger.cells : null;
      const since = tl.el - tl.done;
      const show = wins.length ? wins[Math.floor(since / 0.9) % wins.length] : null;
      if (show) {
        const cells = show.cells, full = Mm.lines[show.line];
        const pts = full.map((row, r) => [rx + r * (cw + 2) + cw / 2, ry + row * chh + chh / 2]);
        for (let i = 0; i < pts.length - 1; i++) { line(ctx, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, PAL.ink, 2); line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], th.line, 2); }
        for (const [r, row] of cells) frame(ctx, rx + r * (cw + 2), ry + row * chh, cw, chh, Math.floor(t * 6) % 2 ? th.line : PAL.white);
      }
      if (sc && Math.floor(since * 3) % 2 === 0) for (const [r, row] of sc) frame(ctx, rx + r * (cw + 2), ry + row * chh, cw, chh, PAL.gold3);
    }
    ctx.restore();
    // the win panel under the reels
    const py = ry + rh + 6;
    rect(ctx, rx - 2, py, rw + 4, 16, '#0a0418');
    rect(ctx, rx - 2, py + 15, rw + 4, 1, th.trim);
    const r0 = sp ? sp.r : null;
    let winNow = 0, label = 'GOOD LUCK';
    if (cur && tl.stage === 'showing') {
      const b = r0.bonus;
      if (b && b.kind === 'free' && sp.idx >= 0) { winNow = b.spins.slice(0, sp.idx + 1).reduce((a, s) => a + s.win, 0); label = 'FREE ' + (sp.idx + 1) + '/' + b.spins.length + ' ×' + b.mult; }
      else { const ramp = clamp((tl.el - tl.done) / 0.8, 0, 1); winNow = Math.round(r0.win * ease.out(ramp)); label = r0.win ? 'WIN' : b ? 'BONUS!' : 'NO WIN'; if (r0.win && ramp < 1 && Math.floor(t * 20) % 2) sfx('tick', 40); }
      if (b && b.kind === 'pick' && sp.picks.length) { winNow = r0.win + sp.picks.reduce((a, _, k) => a + b.prizes[k], 0); label = 'PEARLS'; }
    } else if (cur && tl.stage === 'spinning') { label = sp.idx >= 0 ? 'FREE SPIN ' + (sp.idx + 1) : 'SPINNING'; }
    small(ctx, label, rx + 2, py + 5, PAL.cyan2);
    text(ctx, num(winNow), rx + rw - 1, py + 4, winNow ? PAL.gold3 : 'rgba(255,240,168,0.4)', { align: 'right' });
    // the coin tray
    const ty = y + h - 14;
    rect(ctx, x + 14, ty, w - 28, 9, PAL.ink); rect(ctx, x + 15, ty + 1, w - 30, 7, '#1a1028'); rect(ctx, x + 15, ty + 1, w - 30, 1, th.trim + '88');
    for (let i = 0; i < 7; i++) rect(ctx, x + 20 + i * 5 + (i % 2), ty + 4 + (i % 2), 4, 2, i % 3 ? PAL.gold2 : PAL.gold);
    // the lever
    const lx = x + w + 2, ly = y + 34;
    const pullK = o.lever ? prog(t, o.lever, 0.45) : 1, dip = Math.sin(clamp(pullK, 0, 1) * Math.PI) * 18;
    rect(ctx, lx, ly, 5, 30, '#2a2a3e'); rect(ctx, lx + 1, ly + 1, 3, 28, '#5a5a78');
    rect(ctx, lx + 1, ly - 18 + dip, 3, 22 - dip * 0.4, '#c8c8d8');
    rect(ctx, lx - 1, ly - 24 + dip, 7, 7, PAL.ink); rect(ctx, lx, ly - 23 + dip, 5, 5, '#e02a3a'); rect(ctx, lx + 1, ly - 22 + dip, 2, 2, '#ff8090');
    f.hit('lever', lx - 4, ly - 28, 14, 60);
    f.hit('reels', rx, ry, rw, rh);
    // the pearl bonus
    if (r0 && r0.bonus && r0.bonus.kind === 'pick' && tl.stage === 'showing' && (sp.picks.length < 3 || tl.el - tl.done < 9)) {
      const pw = Math.min(w - 8, 120), ph = 86, px = Math.round(x + (w - pw) / 2), pyy = Math.round(ry - 4);
      rect(ctx, px - 2, pyy - 2, pw + 4, ph + 4, PAL.ink); rect(ctx, px, pyy, pw, ph, '#2a0a14'); rect(ctx, px, pyy, pw, 1, PAL.gold);
      text(ctx, sp.picks.length < 3 ? 'PICK ' + (3 - sp.picks.length) + ' PEARLS' : 'PEARLS PAY ' + num(r0.bonus.total), px + pw / 2, pyy + 4, PAL.gold3, { align: 'center' });
      for (let i = 0; i < 9; i++) {
        const gx = px + 14 + (i % 3) * Math.round((pw - 28) / 2), gy = pyy + 24 + Math.floor(i / 3) * 21;
        const k = sp.picks.indexOf(i);
        if (k >= 0) {
          const amt = r0.bonus.prizes[k];
          rect(ctx, gx - 13, gy - 3, 26, 10, '#5a3a12'); small(ctx, num(amt), gx, gy - 1, PAL.gold3, { align: 'center' });
        } else {
          const bob = Math.round(Math.sin(t * 3 + i) * 1);
          ctx.fillStyle = PAL.ink; ctx.fillRect(gx - 5, gy - 4 + bob, 10, 10);
          ctx.fillStyle = '#f0e8ff'; ctx.fillRect(gx - 4, gy - 3 + bob, 8, 8);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(gx - 3, gy - 2 + bob, 3, 2);
          ctx.fillStyle = '#c8b8e8'; ctx.fillRect(gx - 1, gy + 3 + bob, 5, 2);
          if (sp.picks.length < 3) f.hit('pearl' + i, gx - 8, gy - 6, 16, 16, i);
          if (f.hover === 'pearl' + i) frame(ctx, gx - 6, gy - 5 + bob, 12, 12, PAL.gold3);
        }
      }
    }
  }

  function drawPeer(ctx, x, y, w, h, d, t, name, left) {
    const m = SL.MACHINES[d.m] || SL.MACHINES.neon7, th = THEME[d.m] || THEME.neon7;
    rect(ctx, x, y, w, h, 'rgba(8,4,24,0.6)');
    small(ctx, (name || 'THEM').toUpperCase() + (left ? ' LEFT' : '’S MACHINE'), x + w / 2, y + 3, PAL.cyan2, { align: 'center' });
    if (d.idle) { small(ctx, left ? '' : 'NO SPINS YET', x + w / 2, y + 30, PAL.grey, { align: 'center' }); return; }
    const cw = Math.min(18, Math.floor((w - 8) / m.reels)), ch = 18;
    const rx = Math.round(x + (w - cw * m.reels) / 2), ry = y + 14;
    rect(ctx, rx - 2, ry - 2, cw * m.reels + 4, ch * 3 + 4, th.trim);
    for (let r = 0; r < m.reels; r++) for (let row = 0; row < 3; row++) {
      rect(ctx, rx + r * cw, ry + row * ch, cw, ch, th.glass);
      const img = symbol(d.grid[r][row]);
      ctx.save(); ctx.beginPath(); ctx.rect(rx + r * cw, ry + row * ch, cw, ch); ctx.clip();
      ctx.drawImage(img, rx + r * cw + Math.round((cw - 16) / 2), ry + row * ch + 1);
      ctx.restore();
    }
    small(ctx, d.win ? 'WON ' + num(d.win) : 'BET ' + num(d.bet), x + w / 2, ry + ch * 3 + 6, d.win ? PAL.gold3 : PAL.grey, { align: 'center' });
    if (d.bonus) small(ctx, d.bonus === 'free' ? 'FREE SPINS!' : 'PEARL BONUS!', x + w / 2, ry + ch * 3 + 14, PAL.pink, { align: 'center' });
    void t;
  }

  const onHit = (id, data) => { if (id === 'lever' || id === 'reels') pull(); else if (id.startsWith('pearl')) pickPearl(data); };

  return (
    <div className="table-screen fade-in">
      <TopBar title="Slots" sub={M.name + ' · ' + M.theme} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage ref={stage} draw={draw} onHit={onHit} target={{ land: [330, 190], port: [190, 290] }} />
        <div className="overlays">
          <div className="machine-tabs">
            {SL.MACHINE_IDS.map((id) => <button key={id} type="button" className={'mtab' + (id === mid ? ' on' : '')} disabled={!!spin && (busyNow || inBonus)} onClick={() => { if (id !== mid) { if (spin) settle(spin); setSpin(null); setMid(id); sfx('open'); } }}>{SL.MACHINES[id].name}</button>)}
          </div>
          {banner && <Banner {...banner} />}
        </div>
      </div>
      <div className="controls">
        <div className="left slot-bet">
          <span className="info">Bet</span>
          <Btn small onClick={betDown} disabled={bets.indexOf(bet) <= 0 || busyNow}>−</Btn>
          <span className="bet-val">{num(bet)}</span>
          <Btn small onClick={betUp} disabled={bets.indexOf(bet) >= bets.length - 1 || busyNow}>+</Btn>
        </div>
        <div className="right">
          <Btn small kind={auto ? 'pink' : 'dark'} onClick={() => setAuto(auto ? 0 : 10)}>{auto ? 'Stop · ' + auto : 'Auto 10'}</Btn>
          <Btn kind="gold" wide onClick={pull} disabled={!!inBonus || bet > wallet.balance} hot="␣">{busyNow ? 'Stop' : 'Spin'}</Btn>
        </div>
      </div>
      <Help open={help} title={M.name} onClose={() => setHelp(false)}>
        <p>{M.theme}. Wins pay left to right along the lines, from the first reel; the bet is spread over every line.</p>
        <h4>Pays (× the line bet)</h4>
        {mid === 'neon7' ? (
          <table><tbody>
            <tr><td>Three crowns</td><td>{M.pays.crown}</td></tr><tr><td>Three sevens</td><td>{M.pays.seven}</td></tr>
            <tr><td>Three triple bars</td><td>{M.pays.bar3}</td></tr><tr><td>Three double bars</td><td>{M.pays.bar2}</td></tr>
            <tr><td>Three bells</td><td>{M.pays.bell}</td></tr><tr><td>Three bars</td><td>{M.pays.bar}</td></tr>
            <tr><td>Three cherries / two</td><td>{M.pays.cherry3} / {M.pays.cherry2}</td></tr><tr><td>Any three bars</td><td>{M.pays.anybar}</td></tr>
            <tr><td>A crown in a win</td><td>×2 each</td></tr>
          </tbody></table>
        ) : (
          <table><tbody>
            {Object.keys(M.pays).map((k) => <tr key={k}><td>{k.length > 1 ? k[0].toUpperCase() + k.slice(1) : k} × 3 / 4 / 5</td><td>{M.pays[k].join(' / ')}</td></tr>)}
          </tbody></table>
        )}
        {M.scatter && <p>Three or more comets anywhere pay {M.scatter.pays[3]}/{M.scatter.pays[4]}/{M.scatter.pays[5]}× the total bet and start {M.scatter.free} free spins with every win doubled; comets in the free spins add {M.scatter.retrigger} more.</p>}
        {M.pick && <p>Three lanterns (reels 1, 3 and 5) open the pearl bonus: pick three of nine pearls, each worth 1× to 25× your bet.</p>}
        <p>Return to player about {Math.round(M.rtp * 1000) / 10}%.</p>
      </Help>
    </div>
  );
}

function stopTimes(M, cur) {
  const out = [];
  let t = 0.55;
  const special = (sym) => M.syms[sym] && (M.syms[sym].scatter || M.syms[sym].bonus);
  let seen = 0;
  for (let r = 0; r < M.reels; r++) {
    if (r > 0) t += 0.28 + (seen >= 2 ? 0.75 : 0);
    out.push(t);
    seen += cur.grid[r].filter(special).length;
  }
  return out;
}
function frame(ctx, x, y, w, h, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
}
