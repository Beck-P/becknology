// Roulette: the wheel on one side, the felt layout on the other (the layout stands up on a phone). Chips go on a
// number, a line between numbers (split), the end of a row (street), a corner, the outside bets. SPIN: no more
// bets, the ball runs round the track, drops, rattles over the frets and settles; the dolly marks the number;
// losers are swept, winners paid.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as R from '../games/roulette.js';
import { useTable } from '../core/useTable.js';
import { tableInfo, chipsFor } from '../core/tables.js';
import { PAL, FELTS, text, small, disc, glow, ease, rect } from '../art/pix.js';
import { drawStack, arc } from '../art/sprites.js';
import { drawWheel, spinPose } from '../art/wheel.js';
import { slab } from '../art/felt.js';
import { figure } from '../art/people.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, ChipRack, Btn, Banner, Clock, Help, useKeys, Together, useWallet } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num, signed } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';

const SETTLED = ['result'];
const NUM_COL = { red: '#c8202e', black: '#16121e', green: '#1e9650' };

// ---- the layout in grid units: numbers in 12 columns × 3 rows (3, 6, 9… along the top), zero to the left,
// the columns' 2 to 1 to the right, dozens under, the even-money bets under those
const cellOf = (n) => { const c = Math.floor((n - 1) / 3); return [c, 2 - ((n - 1) % 3)]; };
function spots() {
  const out = [];
  for (let n = 1; n <= 36; n++) { const [c, r] = cellOf(n); out.push({ k: 'n' + n, r: [c, r, c + 1, r + 1], at: [c + 0.5, r + 0.5] }); }
  out.push({ k: 'n0', r: [-1, 0, 0, 3], at: [-0.5, 1.5] });
  for (let r = 0; r < 3; r++) out.push({ k: 'col' + (3 - r), r: [12, r, 13, r + 1], at: [12.5, r + 0.5] });
  for (let d = 0; d < 3; d++) out.push({ k: 'doz' + (d + 1), r: [d * 4, 3, d * 4 + 4, 4], at: [d * 4 + 2, 3.5] });
  ['low', 'even', 'red', 'black', 'odd', 'high'].forEach((k, i) => out.push({ k, r: [i * 2, 4, i * 2 + 2, 5], at: [i * 2 + 1, 4.5] }));
  // the lines between: splits, corners, streets, six lines, and zero's own
  const e = 0.17;
  for (let n = 1; n <= 36; n++) {
    const [c, r] = cellOf(n);
    if (n % 3 !== 0) out.push({ k: 'sp:' + n + '-' + (n + 1), r: [c + 0.2, r - e, c + 0.8, r + e], at: [c + 0.5, r], line: true });
    if (n <= 33) out.push({ k: 'sp:' + n + '-' + (n + 3), r: [c + 1 - e, r + 0.2, c + 1 + e, r + 0.8], at: [c + 1, r + 0.5], line: true });
    if (n % 3 !== 0 && n <= 32) out.push({ k: 'co:' + n, r: [c + 1 - e * 1.4, r - e * 1.4, c + 1 + e * 1.4, r + e * 1.4], at: [c + 1, r], line: true });
    if (n % 3 === 1) {
      out.push({ k: 'st:' + n, r: [c + 0.2, 3 - e, c + 0.8, 3 + e], at: [c + 0.5, 3], line: true });
      if (n <= 31) out.push({ k: 'ln:' + n, r: [c + 1 - e * 1.4, 3 - e, c + 1 + e * 1.4, 3 + e], at: [c + 1, 3], line: true });
    }
  }
  for (let r = 0; r < 3; r++) out.push({ k: 'sp:0-' + (3 - r), r: [-e, r + 0.2, e, r + 0.8], at: [0, r + 0.5], line: true });
  out.push({ k: 'tr:0-1-2', r: [-e * 1.4, 2 - e * 1.4, e * 1.4, 2 + e * 1.4], at: [0, 2], line: true });
  out.push({ k: 'tr:0-2-3', r: [-e * 1.4, 1 - e * 1.4, e * 1.4, 1 + e * 1.4], at: [0, 1], line: true });
  out.push({ k: 'fo', r: [-e * 1.4, 3 - e, e * 1.4, 3 + e], at: [0, 3], line: true });
  return out;
}
const SPOTS = spots();
const SPOT = Object.fromEntries(SPOTS.map((s) => [s.k, s]));

export default function Roulette({ wallet, table, stakes, link, onBack, backLabel, say }) {
  useWallet(wallet);
  const info = useMemo(() => tableInfo('roulette', table, stakes), [table, stakes]);
  const me = useMemo(() => (link ? link.me : { id: 'me', name: wallet.pilot || 'You' }), [link, wallet.pilot]);
  const chips = useMemo(() => chipsFor(info.limits), [info]);
  const [chip, setChip] = useState(() => chips[1].v);
  const [pend, setPend] = useState([]);                  // [{ k, v }] in the order they went down
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [banner, setBanner] = useState(null);
  const [gone, setGone] = useState(false);
  const memo = useRef(new Memo()).current;
  const stage = useRef(null);

  const create = useCallback((env) => {
    const regs = info.regulars.slice(0, link ? 1 : 2);
    const seats = [{ ...me, kind: 'pilot', pos: 0 }, ...regs.map((p, i) => ({ id: 'npc-' + p.id, name: p.name, kind: 'npc', npc: p.id, pos: i + 1 }))];
    return R.create({ seats, limits: info.limits, now: env.now, rng: env.rng });
  }, [info, link, me]);
  const T = useTable({ engine: R, create, link, me, wallet, game: 'roulette', settled: SETTLED });
  const v = T.view;
  useEffect(() => { if (link) { T.setWho({ name: me.name }); link.onGone(() => setGone(true)); } }, [link]); // eslint-disable-line

  const mine = v && v.seats.find((x) => x.id === me.id);
  const betting = v && v.phase === 'bet' && mine && !mine.ready;
  const pendBets = useMemo(() => { const b = {}; for (const p of pend) b[p.k] = (b[p.k] || 0) + p.v; return b; }, [pend]);
  const pendTotal = pend.reduce((a, p) => a + p.v, 0);
  useEffect(() => { if (link) T.sendPending(pendBets); }, [pendTotal]); // eslint-disable-line
  useEffect(() => { if (v && v.phase !== 'bet') setPend([]); }, [v && v.phase]); // eslint-disable-line

  const prev = useRef({});
  useEffect(() => {
    if (!v) return;
    const p = prev.current;
    if (v.phase !== p.phase || v.round !== p.round) {
      if (v.phase === 'bet') setBanner({ text: 'PLACE YOUR BETS', sub: p.phase ? '' : info.name + ' · ' + num(info.limits.min) + '–' + num(info.limits.max) + ' a spot', k: Date.now(), tone: 'fade' });
      else if (v.phase === 'spin') { setBanner({ text: 'NO MORE BETS', k: Date.now(), tone: 'fade quiet' }); sfx('whoosh'); }
      else if (v.phase === 'result') {
        const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
        const n = v.hist[0], col = R.colorOf(n);
        const big = r && r.net >= info.limits.min * 20;
        setBanner({ text: n + ' ' + col.toUpperCase(), sub: r ? (r.net > 0 ? 'you win ' + num(r.pay) : r.net < 0 ? 'no luck this spin' : 'even') : '', tone: r && r.net > 0 ? (big ? 'win big' : 'win') : '', k: Date.now() });
        if (r) { setTimeout(() => sfx(r.net > 0 ? (big ? 'bigwin' : 'win') : r.net < 0 ? 'lose' : 'push'), 300); if (r.net > 0) recordWin('roulette', r.net); if (big) memo.fx.coins(stage.current.size().W / 2, 40, 50); }
      }
      p.phase = v.phase; p.round = v.round;
    }
  }, [v]); // eslint-disable-line

  const add = useCallback((k, amt) => {
    if (!betting || busy) return;
    const onSpot = (pendBets[k] || 0) + amt;
    if (onSpot > info.limits.max) { sfx('deny'); say('Spot max is ' + num(info.limits.max)); return; }
    if (pendTotal + amt > wallet.balance) { sfx('deny'); say('Not enough chips'); return; }
    setPend((p) => [...p, { k, v: amt }]); sfx('chip');
    memo.at('drop:' + k + ':' + (pend.length + 1), performance.now() / 1000);
  }, [betting, busy, pendBets, pendTotal, info, wallet.balance, say, memo, pend.length]);
  const removeAt = (k) => { const i = pend.map((p) => p.k).lastIndexOf(k); if (i < 0) return; setPend((p) => p.filter((_, j) => j !== i)); sfx('chip'); };
  const undo = () => { if (!pend.length) return; setPend((p) => p.slice(0, -1)); sfx('chip'); };
  const clear = () => { if (!pend.length) return; setPend([]); sfx('chips'); };
  const rebet = () => { if (!last || !betting) return; const tot = last.reduce((a, p) => a + p.v, 0); if (tot > wallet.balance) { say('Not enough chips'); return; } setPend(last.slice()); sfx('chips'); };
  const double2 = () => { if (!pend.length) return; const next = [...pend, ...pend]; const tot = next.reduce((a, p) => a + p.v, 0); const b = {}; for (const p of next) b[p.k] = (b[p.k] || 0) + p.v; if (tot > wallet.balance || Object.values(b).some((x) => x > info.limits.max)) { say('Can’t double that'); return; } setPend(next); sfx('chips'); };
  const spin = async () => {
    if (!betting || busy || !pend.length) return;
    for (const k in pendBets) if (pendBets[k] < info.limits.min) { say('Each spot needs at least ' + num(info.limits.min)); sfx('deny'); return; }
    setBusy(true);
    const ok = await wallet.stake(pendTotal, 'roulette');
    if (!ok) { setBusy(false); say('The cage didn’t take it'); return; }
    if (!T.act({ t: 'bets', bets: pendBets })) await wallet.pay(pendTotal, 'roulette', 'refund:' + Date.now(), 0);
    setLast(pend.slice()); setPend([]); setBusy(false);
  };
  useKeys({ ' ': spin, Enter: spin, z: undo, Backspace: undo, r: rebet, 1: () => setChip(chips[0].v), 2: () => setChip(chips[1].v), 3: () => setChip(chips[2].v), 4: () => setChip(chips[3].v), 5: () => setChip(chips[4].v) }, [betting, pend, busy, last]);

  // ---- drawing --------------------------------------------------------------------------------------------------------
  const geo = useRef(null);
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000, F = FELTS[info.felt];
    ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
    if (!v) return;
    const port = H > W * 1.05;
    // where things go
    let wcx, wcy, WR, X0, Y0, cw, ch, fx, fy, fw, fh;
    if (!port) {
      WR = Math.min(Math.round(H * 0.34), Math.round(W * 0.16));
      fx = 8; fy = 30; fw = W - 16; fh = H - 38;
      wcx = fx + 8 + WR; wcy = fy + Math.round(fh * 0.46);
      const lx = wcx + WR + 16, lw = W - lx - 16;
      cw = Math.floor(lw / 14); ch = Math.min(Math.floor((fh - 30) / 5), Math.round(cw * 1.25));
      X0 = lx + Math.round((lw - cw * 14) / 2) + cw; Y0 = fy + Math.round((fh - ch * 5) / 2) + 4;
    } else {
      WR = Math.min(Math.round(W * 0.3), Math.round(H * 0.17));
      fx = 4; fy = 4; fw = W - 8; fh = H - 8;
      wcx = Math.round(W * 0.38); wcy = fy + 8 + Math.round(WR * 0.72);
      const top = wcy + Math.round(WR * 0.72) + 12;
      ch = Math.floor((H - top - 10) / 14); cw = Math.min(Math.floor((W - 16) / 5), ch * 3);
      X0 = Math.round((W - cw * 5) / 2); Y0 = top + ch;
    }
    const G = (gx, gy) => (port ? [X0 + (5 - gy) * cw, Y0 + gx * ch] : [X0 + gx * cw, Y0 + gy * ch]);
    const box = (r) => { const [a, b] = G(r[0], r[1]), [c, d] = G(r[2], r[3]); return [Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b)]; };
    geo.current = { G, box };
    // the croupier stands behind the table, between the wheel and the layout
    if (!port) figure(ctx, info.dealer.sheet, Math.round(X0 + cw * 1.5), fy + 12, { t, clip: fy - 3 });
    ctx.drawImage(slab(W, H, info.felt, fx, fy, fw, fh, 4), 0, 0);
    glow(ctx, W / 2, H * 0.3, W * 0.6, 'rgba(255,230,160,0.07)', 1);

    // the layout: printed cells
    const ink = F.print, lineC = 'rgba(232,216,144,0.7)';
    for (const s of SPOTS) {
      if (s.line) continue;
      const [x, y, w, h] = box(s.r);
      let fill = null, label = '', lc = PAL.cream;
      if (s.k.startsWith('n')) { const n = +s.k.slice(1); fill = NUM_COL[R.colorOf(n)]; label = String(n); }
      else if (s.k.startsWith('col')) label = '2-1';
      else if (s.k.startsWith('doz')) label = port ? ['1-12', '13-24', '25-36'][+s.k[3] - 1] : ['1ST 12', '2ND 12', '3RD 12'][+s.k[3] - 1];
      else label = { low: '1-18', high: '19-36', even: 'EVEN', odd: 'ODD', red: '', black: '' }[s.k];
      if (fill) { ctx.fillStyle = fill; ctx.fillRect(x + 2, y + 2, w - 3, h - 3); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 2, y + 2, w - 3, 1); }
      ctx.fillStyle = lineC; ctx.fillRect(x, y, w + 1, 1); ctx.fillRect(x, y + h, w + 1, 1); ctx.fillRect(x, y, 1, h + 1); ctx.fillRect(x + w, y, 1, h + 1);
      if (s.k === 'red' || s.k === 'black') {                     // the diamonds
        const cx = x + w / 2, cy = y + h / 2, d = Math.min(w, h) * 0.32;
        for (let i = -d; i <= d; i++) { const ww = Math.round((d - Math.abs(i)) * 1.6); ctx.fillStyle = s.k === 'red' ? '#d02838' : '#16121e'; ctx.fillRect(Math.round(cx - ww), Math.round(cy + i * 0.7), ww * 2 + 1, 1); }
      }
      if (label) {
        const big = w >= 14 && label.length <= 2;
        if (big && w >= 15 && h >= 10) text(ctx, label, x + w / 2 + 1, y + Math.round(h / 2) - 3, lc, { align: 'center', shadow: PAL.ink });
        else small(ctx, label, x + w / 2 + 1, y + Math.round(h / 2) - 2, s.k.startsWith('n') ? lc : ink, { align: 'center' });
      }
    }
    // hover and hit regions (lines over cells so the thin ones win)
    if (betting) {
      for (const s of SPOTS.filter((x) => !x.line)) { const [x, y, w, h] = box(s.r); f.hit(s.k, x, y, w, h, s); }
      for (const s of SPOTS.filter((x) => x.line)) { const [x, y, w, h] = box(s.r); f.hit(s.k, x - 1, y - 1, w + 2, h + 2, s); }
      if (f.hover && SPOT[f.hover]) {
        const covers = R.covers(f.hover);
        for (const n of covers) { const sp = SPOT['n' + n]; const [x, y, w, h] = box(sp.r); ctx.fillStyle = 'rgba(255,240,160,0.28)'; ctx.fillRect(x + 1, y + 1, w - 1, h - 1); }
        if (!f.hover.startsWith('n')) { const [x, y, w, h] = box(SPOT[f.hover].r); ctx.fillStyle = 'rgba(255,240,160,0.25)'; ctx.fillRect(x, y, w, h); }
      }
    }
    // the result: the winning number lit, the dolly on it
    const resultN = v.phase === 'result' ? v.hist[0] : null;
    const resT = resultN != null ? memo.at('res' + v.round, t) : null;
    if (resultN != null) {
      const [x, y, w, h] = box(SPOT['n' + resultN].r);
      if (Math.floor(t * 4) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1, y + 1, w - 1, h - 1); }
      const [dx, dy] = G(...SPOT['n' + resultN].at);
      const drop = ease.bounce(prog(t, resT, 0.5));
      dolly(ctx, dx, dy - 2 - (1 - drop) * 18);
    }

    // chips: the regulars', the other pilot's, mine (bets in, and chips still going down)
    const settled = resultN != null && prog(t, resT, 0.6) >= 1;
    const all = [];
    for (const x of v.seats) {
      const bets = x.id === me.id ? (x.ready ? x.bets : pendBets) : x.ready || x.result ? x.bets : link && x.id === link.peer.id ? T.peerPend : {};
      for (const k in bets) if (SPOT[k]) all.push({ who: x, k, amt: bets[k], mine: x.id === me.id });
    }
    all.sort((a, b) => (a.mine ? 1 : 0) - (b.mine ? 1 : 0));
    const home = port ? [W / 2, H + 10] : [W / 2, H + 10];
    for (const c of all) {
      const sp = SPOT[c.k]; let [px, py] = G(...sp.at);
      if (!c.mine) { px += c.who.pos % 2 ? -3 : 3; py -= 2; }
      if (settled) {
        const wins = R.covers(c.k).includes(resultN);
        const k = prog(t, resT + 0.7, 0.55), back = prog(t, resT + 2.2, 0.6);
        if (!wins) { if (k < 1) { const [ax, ay] = arc(px, py + 4, wcx, wcy, k, 10); drawStack(ctx, c.amt, ax, ay, { label: false, max: 5 }); } continue; }
        const pay = c.amt * R.odds(c.k);
        const dest = c.mine ? home : [px, -20];
        const e = ease.in(back);
        drawStack(ctx, c.amt, px + (dest[0] - px) * e, py + 4 + (dest[1] - py) * e, { label: false, max: 6 });
        if (k > 0) { const [ax, ay] = arc(wcx, wcy, px + 9, py + 4, Math.min(1, k), 12); drawStack(ctx, pay, ax + (dest[0] - ax) * e, ay + (dest[1] - ay) * e, { label: false, max: 8 }); }
        if (k >= 1 && !memo.has('pf' + v.round + c.who.id + c.k)) { memo.at('pf' + v.round + c.who.id + c.k, t); memo.float(px + 4, py - 10, '+' + num(pay + c.amt), c.mine ? PAL.green : PAL.cream, t); if (c.mine) sfx('chips'); }
        continue;
      }
      const tag = c.mine ? 'drop:' + c.k : null;
      void tag;
      drawStack(ctx, c.amt, px, py + 4, { label: c.mine && f.hover === c.k ? undefined : false, max: 6, neat: true });
      if (!c.mine) { ctx.fillStyle = PAL.ink; ctx.fillRect(Math.round(px) + 3, Math.round(py) - 3, 4, 4); ctx.fillStyle = c.who.kind === 'npc' ? PAL.grey : PAL.cyan; ctx.fillRect(Math.round(px) + 4, Math.round(py) - 2, 2, 2); }
    }

    // the wheel and the ball
    const sp = v.spin;
    let a = memo.idleA || 0;
    let ball = null, hil = -1;
    if (sp) {
      const loc = T.now() - sp.at;
      const pose = spinPose(sp, loc);
      a = pose.a; memo.idleA = a;
      ball = pose;
      if (pose.landed && v.phase === 'result') hil = Math.floor(t * 3) % 2 ? pose.p : -1;
      // ticks of the ball on the frets, the drop
      const pk = Math.floor((pose.ba - pose.a) / (Math.PI * 2 / 37));
      if (pk !== memo.lastPk && !pose.landed && loc > 0) { memo.lastPk = pk; if (pose.dropping) sfx('ball', 40); }
      if (pose.landed && !memo.has('drop' + v.round)) { memo.at('drop' + v.round, t); sfx('drop'); }
    } else { memo.idleA = (memo.idleA || 0) + f.dt * 0.25; a = memo.idleA; }
    const K = 0.72;
    drawWheel(ctx, wcx, wcy, WR, K, a, hil);
    if (ball) {
      const bx = wcx + Math.cos(ball.ba) * WR * ball.br, by = wcy + Math.sin(ball.ba) * WR * ball.br * K;
      disc(ctx, bx + 1, by + 1.5, 1.6, 'rgba(0,0,0,0.5)');
      disc(ctx, bx, by, 1.6, '#ffffff');
      ctx.fillStyle = '#c8c8d8'; ctx.fillRect(Math.round(bx), Math.round(by) + 1, 1, 1);
    }
    // the board of last numbers
    const hist = v.phase === 'spin' ? v.hist : v.hist;
    const hx = port ? wcx + WR + 12 : wcx - WR, hy = port ? wcy - Math.round(WR * K) : wcy + Math.round(WR * K) + 10;
    const n = port ? Math.min(8, Math.floor((H - hy) / 9)) : Math.min(hist.length, Math.floor((WR * 2) / 10));
    for (let i = 0; i < Math.min(n, hist.length); i++) {
      const num_ = hist[i], x = port ? hx : hx + i * 10, y = port ? hy + i * 9 : hy;
      const c = R.colorOf(num_);
      if (i === 0 && v.phase === 'spin') continue;
      rect(ctx, x, y, 9, 8, PAL.ink);
      rect(ctx, x + 1, y + 1, 7, 6, NUM_COL[c]);
      small(ctx, String(num_), x + 5, y + 2, PAL.white, { align: 'center' });
      if (i === 0) { rect(ctx, x, y + 8, 9, 1, PAL.gold); }
    }
    if (port && n) small(ctx, 'LAST', hx + 5, hy - 7, PAL.gold2, { align: 'center' });
    memo.fx.update(f.dt); memo.fx.draw(ctx);
    memo.drawFloats(ctx, t);
  };

  const onHit = (id, data, o) => { if (!data) return; if (o.alt) removeAt(id); else add(id, chip); };
  const onDrop = (x, y, val) => { setChip(val); const h = stage.current && stage.current.hitAtClient(x, y); if (h && SPOT[h.id]) add(h.id, val); };

  let controls;
  if (!v) controls = null;
  else if (betting) {
    controls = (
      <>
        <div className="left"><ChipRack chips={chips} value={chip} onPick={setChip} onDrop={onDrop} balance={wallet.balance - pendTotal} /></div>
        <div className="right">
          <Btn small onClick={undo} disabled={!pend.length} hot="Z">Undo</Btn>
          <Btn small onClick={clear} disabled={!pend.length}>Clear</Btn>
          {last && !pend.length ? <Btn small kind="cyan" onClick={rebet} hot="R">Rebet</Btn> : <Btn small onClick={double2} disabled={!pend.length}>×2</Btn>}
          <Btn kind="gold" wide onClick={spin} disabled={busy || !pend.length} hot="␣">{link ? 'Ready' : 'Spin'}{pendTotal ? ' ' + num(pendTotal) : ''}</Btn>
        </div>
      </>
    );
  } else {
    const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
    const msg = v.phase === 'bet' ? 'Bets in · waiting for the table' : v.phase === 'spin' ? 'No more bets · the ball’s rolling' : r ? (r.net > 0 ? 'You win ' + num(r.pay) + ' (' + signed(r.net) + ')' : r.pay > 0 ? 'Back ' + num(r.pay) + ' (' + signed(r.net) + ')' : 'The house takes ' + num(r.staked)) : v.msg;
    controls = <div className="mid"><span className="info big">{msg}</span></div>;
  }

  return (
    <div className="table-screen fade-in">
      <TopBar title="Roulette" sub={info.name + ' · single zero · ' + num(info.limits.min) + '–' + num(info.limits.max) + ' a spot'} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage ref={stage} draw={draw} onHit={onHit} target={{ land: [400, 200], port: [190, 300] }} />
        <div className="overlays">
          {banner && <Banner {...banner} />}
          {v && v.until && <Clock until={v.until} now={T.now} total={15000} />}
        </div>
      </div>
      <div className="controls">{controls}</div>
      <Help open={help} title="Roulette" onClose={() => setHelp(false)}>
        <p>Put chips on the layout, then <b>Spin</b>. Tap a number for a straight bet, the line between two numbers for a split, a crossing for a corner, the bottom edge of a column of three for a street; or the outside bets. Right-click (or hold) a spot to take a chip back.</p>
        <table><tbody>
          <tr><td>Straight up (one number)</td><td>35 to 1</td></tr>
          <tr><td>Split (two)</td><td>17 to 1</td></tr>
          <tr><td>Street, trio (three)</td><td>11 to 1</td></tr>
          <tr><td>Corner, 0-1-2-3 (four)</td><td>8 to 1</td></tr>
          <tr><td>Six line</td><td>5 to 1</td></tr>
          <tr><td>Column, dozen</td><td>2 to 1</td></tr>
          <tr><td>Red, black, odd, even, 1-18, 19-36</td><td>1 to 1</td></tr>
        </tbody></table>
        <p>One green zero: the even-money bets lose on it. The house edge is 2.7% on every bet.</p>
      </Help>
    </div>
  );
}

function dolly(ctx, x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x - 3, y + 7, 7, 2);
  ctx.fillStyle = PAL.ink; ctx.fillRect(x - 3, y - 1, 7, 9); ctx.fillRect(x - 2, y - 2, 5, 1);
  ctx.fillStyle = '#e8e4f0'; ctx.fillRect(x - 2, y, 5, 7);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y, 5, 1);
  ctx.fillStyle = PAL.gold; ctx.fillRect(x - 1, y - 1, 3, 1); ctx.fillRect(x - 2, y + 6, 5, 1);
}
