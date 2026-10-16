// Crash: the Rocket. Bets on the pad, a countdown, launch: the multiplier climbs as the rocket rises out of
// Arcadia, through the clouds and into the stars, until it blows. Cash out before it does (or let the auto cash-out
// do it): bet × multiplier. Everyone at the pad rides the same rocket.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as K from '../games/crash.js';
import { useTable } from '../core/useTable.js';
import { tableInfo, chipsFor } from '../core/tables.js';
import { PAL, text, small, rect, glow, clamp, hash, disc, line } from '../art/pix.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, ChipRack, Btn, Banner, Help, useKeys, Together, useWallet } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num, mult } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';

const SETTLED = ['boom'];
const AUTOS = [0, 1.5, 2, 3, 5, 10];

export default function Crash({ wallet, table, stakes, link, onBack, backLabel, say }) {
  useWallet(wallet);
  const info = useMemo(() => tableInfo('crash', table, stakes), [table, stakes]);
  const me = useMemo(() => (link ? link.me : { id: 'me', name: wallet.pilot || 'You' }), [link, wallet.pilot]);
  const chips = useMemo(() => chipsFor(info.limits), [info]);
  const [amount, setAmount] = useState(() => Math.max(info.limits.min, chips[1].v * 2));
  const [autoX, setAutoX] = useState(0);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [banner, setBanner] = useState(null);
  const [gone, setGone] = useState(false);
  const [, tick] = useState(0);
  const memo = useRef(new Memo()).current;

  const create = useCallback((env) => {
    const regs = info.regulars.slice(0, link ? 2 : 3);
    const seats = [{ ...me, kind: 'pilot' }, ...regs.map((p) => ({ id: 'npc-' + p.id, name: p.name, kind: 'npc', npc: p.id }))];
    return K.create({ seats, limits: info.limits, now: env.now, rng: env.rng });
  }, [info, link, me]);
  const T = useTable({ engine: K, create, link, me, wallet, game: 'crash', settled: SETTLED });
  const v = T.view;
  useEffect(() => { if (link) { T.setWho({ name: me.name }); link.onGone(() => setGone(true)); } }, [link]); // eslint-disable-line
  const mine = v && v.seats.find((x) => x.id === me.id);
  const flying = v && v.phase === 'fly';
  const elapsed = flying ? T.now() - v.flight.at : 0;
  const live = flying ? (elapsed < 0 ? 1 : Math.min(K.multAt(elapsed), v.flight.crash)) : 1;
  const myIn = mine && mine.bet > 0;
  const canCash = flying && myIn && !mine.cash && elapsed > 0 && live < v.flight.crash;

  // the cash-out button counts up; the Bridge always knows what walking away is worth
  useEffect(() => {
    if (!flying) return undefined;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (myIn) wallet.hold(K.ifClosed(v, me.id, T.now()), 'crash');
    }, 120);
    return () => clearInterval(id);
  }, [flying, myIn, v]); // eslint-disable-line

  const prev = useRef({});
  useEffect(() => {
    if (!v) return;
    const p = prev.current;
    if (v.phase !== p.phase || v.round !== p.round) {
      if (v.phase === 'bet' && p.phase) setBanner(null);
      if (v.phase === 'fly') { setBanner(null); setTimeout(() => sfx('launch'), Math.max(0, v.flight.at - T.now())); }
      if (v.phase === 'boom') {
        const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
        sfx('boom');
        setBanner({ text: 'BUSTED @ ' + mult(v.hist[0]), sub: r ? (r.pay ? 'you cashed out at ' + mult(r.at) + ' · ' + num(r.pay) : 'it took your ' + num(r.staked)) : '', tone: r && r.pay ? 'win' : 'lose', k: Date.now() });
        if (r && r.net > 0) recordWin('crash', r.net);
      }
      p.phase = v.phase; p.round = v.round;
    }
    // someone cashed out: a ping
    if (v.phase === 'fly') for (const x of v.seats) if (x.cash && !memo.has('cash' + v.round + x.id)) { memo.at('cash' + v.round + x.id, performance.now() / 1000); if (x.id === me.id) { sfx('coin'); setBanner({ text: 'CASHED OUT', sub: mult(x.cash) + ' · ' + num(Math.floor(x.bet * x.cash)), tone: 'win fade', k: Date.now() }); } }
  }, [v]); // eslint-disable-line

  const placeBet = async () => {
    if (!v || v.phase !== 'bet' || !mine || mine.ready || busy) return;
    if (amount < info.limits.min || amount > info.limits.max) { say('Bets ' + num(info.limits.min) + '–' + num(info.limits.max)); return; }
    setBusy(true);
    const ok = await wallet.stake(amount, 'crash');
    if (!ok) { setBusy(false); say('Not enough chips'); return; }
    if (!T.act({ t: 'bet', amount, auto: autoX })) await wallet.pay(amount, 'crash', 'refund:' + Date.now(), 0);
    setBusy(false); sfx('chips');
  };
  const cashOut = () => {
    const vv = T.view;
    if (!vv || vv.phase !== 'fly') return;
    const me_ = vv.seats.find((x) => x.id === me.id), e = T.now() - vv.flight.at;
    if (!me_ || !me_.bet || me_.cash || e <= 0) return;
    const m = K.multAt(e);
    if (m >= vv.flight.crash) return;
    T.act({ t: 'cash', at: m });
  };
  const addChip = (val) => { const n = Math.min(info.limits.max, (amount === Math.max(info.limits.min, chips[1].v * 2) && !memo.touched ? 0 : amount) + val); memo.touched = true; setAmount(Math.max(info.limits.min, n)); sfx('chip'); };
  useKeys({ ' ': () => (flying ? cashOut() : placeBet()), Enter: () => (flying ? cashOut() : placeBet()) }, [flying, canCash, amount, autoX, busy, v]);

  // ---- drawing ----------------------------------------------------------------------------------------------------------
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000;
    if (!v) { ctx.fillStyle = '#0a0418'; ctx.fillRect(0, 0, W, H); return; }
    const fl = v.phase === 'fly' || v.phase === 'boom' ? v.flight : null;
    const el = fl ? T.now() - fl.at : -1;
    const m = fl ? (v.phase === 'boom' ? fl.crash : el < 0 ? 1 : Math.min(K.multAt(el), fl.crash)) : 1;
    const alt = fl && el > 0 ? Math.log(m) / Math.log(1.0001 + 9) : 0;      // 0 at the pad … 1 at 10×
    const climb = clamp(alt, 0, 3);
    // the sky: night city at the bottom, then cloud, then the dark, then stars
    const camY = climb * H * 1.2;
    const SKY = ['#2a1240', '#1c0c34', '#100828', '#06030f'], EDGE = [0.25, 0.45, 0.7];
    for (let y = 0; y < H; y++) {
      const worldY = H - y + camY, k = worldY / (H * 3.6);
      const band = k < EDGE[0] ? 0 : k < EDGE[1] ? 1 : k < EDGE[2] ? 2 : 3;
      ctx.fillStyle = SKY[band]; ctx.fillRect(0, y, W, 1);
      // a dithered seam where one band gives way to the next
      const near = EDGE.findIndex((e) => Math.abs(k - e) < 0.012);
      if (near >= 0) { ctx.fillStyle = SKY[k < EDGE[near] ? near + 1 : near]; for (let x = (y & 1); x < W; x += 2) ctx.fillRect(x, y, 1, 1); }
    }
    // stars that appear as it climbs
    for (let i = 0; i < 90; i++) {
      const sx_ = Math.round(hash(i * 3.1) * W), sy = Math.round(((hash(i * 7.7) * H * 3 + camY * 0.5) % (H * 3)) - H * 2 + H);
      if (sy < 0 || sy >= H) continue;
      const vis = clamp(climb - 0.4 + hash(i) * 0.5, 0, 1);
      if (vis > 0.2) rect(ctx, sx_, sy, 1, 1, Math.floor(t * 3 + i) % 9 ? 'rgba(255,255,255,' + vis + ')' : PAL.cyan2);
    }
    // the city falls away beneath
    const groundY = H - 24 + camY;
    if (groundY - 70 < H) {
      for (let i = 0; i < 30; i++) {
        const bx = Math.round(i * (W / 24)) - 6, bh = 26 + Math.round(hash(i + 1) * 44), bw = Math.round(W / 24) + 2;
        rect(ctx, bx, groundY - bh, bw, bh + 40, i % 2 ? '#1a1030' : '#22143a');
        for (let wy = groundY - bh + 3; wy < groundY; wy += 4) for (let wx = bx + 2; wx < bx + bw - 1; wx += 3) if (hash(wx * 3 + wy) > 0.6) rect(ctx, wx, wy, 1, 2, hash(wx) > 0.5 ? '#f078a8' : '#ffe080');
      }
      rect(ctx, 0, groundY, W, 40, '#120a1c');
      // the pad
      const px = Math.round(W * 0.5);
      rect(ctx, px - 20, groundY - 4, 40, 4, '#3a3a52'); rect(ctx, px - 20, groundY - 4, 40, 1, '#8a84a8');
      rect(ctx, px - 17, groundY - 30, 2, 26, '#5a5478'); rect(ctx, px + 15, groundY - 30, 2, 26, '#5a5478');
      for (let y = groundY - 28; y < groundY - 4; y += 4) { rect(ctx, px - 17, y, 6, 1, '#5a5478'); }
    }
    // clouds drifting past
    for (let i = 0; i < 6; i++) {
      const cy = Math.round(H * 0.6 - H * 1.5 + camY * 0.9 - i * 60 + 300);
      if (cy < -20 || cy > H + 20) continue;
      const cx = Math.round(((hash(i) * W + t * 6 * (i % 2 ? 1 : -1)) % (W + 80) + W + 80) % (W + 80)) - 40;
      for (let k = 0; k < 5; k++) disc(ctx, cx + k * 9, cy + (k % 2) * 2, 8, 'rgba(160,140,200,0.18)', 4);
    }
    // the rocket
    const rx = Math.round(W * 0.5), baseY = H - 24 - 30;
    const ry = Math.round(fl && el > 0 ? Math.max(H * 0.42, baseY - climb * H * 0.9) : baseY);
    const shake = v.phase === 'fly' && el > 0 ? Math.round(Math.sin(t * 50) * Math.min(1.5, climb)) : 0;
    if (v.phase !== 'boom') {
      // exhaust
      if (fl && el > -900) {
        for (let i = 0; i < 6; i++) { const len = 6 + Math.random() * (el > 0 ? 18 : 4); rect(ctx, rx - 3 + i, ry + 24, 1, Math.round(len * (i === 0 || i === 5 ? 0.5 : 1)), i % 2 ? '#ffe080' : '#ff8030'); }
        memo.fx.burst(rx + shake, ry + 28, el > 0 ? 2 : 1, ['#ff8030', '#ffe080', '#a0a0b0'], { speed: 30, gravity: -10, life: 0.6 });
      }
      drawRocket(ctx, rx - 7 + shake, ry, t);
      // the cash-out tags flying off the rocket
      for (const x of v.seats) if (x.cash && memo.has('cash' + v.round + x.id)) {
        const k = prog(t, memo.seen.get('cash' + v.round + x.id), 1.6);
        if (k < 1) { const tx = rx + (x.id === me.id ? -30 : 26 + (hash(x.id.length) * 20)), ty = ry - 6 + k * 40; small(ctx, x.name.toUpperCase().slice(0, 6) + ' ' + x.cash.toFixed(2) + 'X', tx, ty, x.id === me.id ? PAL.green : PAL.cream, { align: 'center', outline: PAL.ink }); }
      }
    } else {
      // the bang
      if (!memo.has('boom' + v.round)) { memo.at('boom' + v.round, t); memo.fx.burst(rx, ry + 10, 70, ['#ff8030', '#ffe080', '#e84040', '#ffffff'], { speed: 120, gravity: 40, life: 1.4, size: 2 }); }
      const k = prog(t, memo.seen.get('boom' + v.round), 0.5);
      if (k < 1) { glow(ctx, rx, ry + 10, 40 + k * 60, 'rgba(255,180,90,0.9)', 1 - k); disc(ctx, rx, ry + 10, 6 + k * 20, 'rgba(255,240,200,' + (1 - k) + ')'); }
    }
    // the multiplier
    const col = v.phase === 'boom' ? '#ff6070' : m >= 10 ? PAL.gold3 : m >= 2 ? PAL.green : PAL.white;
    const label = v.phase === 'bet' ? '' : el < 0 ? 'T-' + Math.ceil(-el / 1000) : m.toFixed(2) + 'x';
    if (label) text(ctx, label, W / 2, Math.round(H * 0.16), col, { align: 'center', scale: W > 300 ? 3 : 2, outline: PAL.ink });
    // the curve, top left
    const gw = Math.min(110, Math.round(W * 0.3)), gh = Math.round(gw * 0.55), gx = 8, gy = 8;
    rect(ctx, gx, gy, gw, gh, 'rgba(8,4,24,0.75)'); rect(ctx, gx, gy + gh, gw, 1, PAL.dim); rect(ctx, gx, gy, 1, gh, PAL.dim);
    if (fl && el > 0) {
      const tmax = Math.max(8000, el * 1.15), mmax = Math.max(2, m * 1.2);
      let lx = gx, ly = gy + gh;
      for (let i = 1; i <= 40; i++) {
        const tt = (el * i) / 40, mm = K.multAt(tt);
        const x = gx + Math.round((tt / tmax) * (gw - 2)), y = gy + gh - Math.round(((mm - 1) / (mmax - 1)) * (gh - 2));
        line(ctx, lx, ly, x, y, v.phase === 'boom' ? '#ff6070' : PAL.pink); lx = x; ly = y;
      }
      rect(ctx, lx - 1, ly - 1, 3, 3, PAL.white);
    }
    small(ctx, 'MULTIPLIER', gx + 3, gy + 2, PAL.dim);
    // the last rockets
    const hs = v.hist.slice(v.phase === 'boom' ? 1 : 0, 12);
    let hx = W - 6;
    for (const c of hs) {
      const s = c.toFixed(c >= 10 ? 0 : 1) + 'X', w = s.length * 4 + 4;
      hx -= w + 2;
      if (hx < gw + 14) break;
      rect(ctx, hx, 8, w, 9, c < 1.5 ? '#6a1828' : c < 2 ? '#5a2a3a' : c < 10 ? '#1a5a3a' : '#6a5010');
      small(ctx, s, hx + w / 2, 10, PAL.white, { align: 'center' });
    }
    // who's on board
    let ly2 = gy + gh + 10;
    for (const x of v.seats) {
      if (!x.bet && v.phase !== 'bet') continue;
      if (v.phase === 'bet' && !x.ready) continue;
      const res = x.result && x.result.round === v.round ? x.result : null;
      const s = x.name.toUpperCase().slice(0, 7) + ' ' + num(x.bet) + (x.cash ? ' @' + x.cash.toFixed(2) : res ? ' BUST' : '');
      rect(ctx, gx, ly2 - 1, s.length * 4 + 5, 8, 'rgba(8,4,24,0.75)');
      small(ctx, s, gx + 2, ly2, x.id === me.id ? PAL.gold3 : x.cash ? PAL.green : res ? '#ff8aa0' : PAL.cream);
      ly2 += 9;
    }
    memo.fx.update(f.dt); memo.fx.draw(ctx);
  };

  const ready = mine && mine.ready;
  let controls;
  if (!v) controls = null;
  else if (v.phase === 'bet' && !ready) {
    controls = (
      <>
        <div className="left"><ChipRack chips={chips} value={null} onPick={addChip} balance={wallet.balance - amount} /></div>
        <div className="right crash-set">
          <span className="info">Bet <b>{num(amount)}</b></span>
          <Btn small onClick={() => { setAmount(info.limits.min); memo.touched = true; }}>Min</Btn>
          <span className="info">Auto</span>
          <select className="auto-pick" value={autoX} onChange={(e) => setAutoX(+e.target.value)} aria-label="Auto cash-out">
            {AUTOS.map((a) => <option key={a} value={a}>{a ? a.toFixed(1) + '×' : 'off'}</option>)}
          </select>
          <Btn kind="gold" wide onClick={placeBet} disabled={busy || amount > wallet.balance} hot="␣">Bet {num(amount)}</Btn>
        </div>
      </>
    );
  } else if (flying && myIn) {
    controls = (
      <div className="mid">
        {mine.cash ? <span className="info big">Cashed out at {mult(mine.cash)} · {num(Math.floor(mine.bet * mine.cash))}</span>
          : <Btn kind="green" wide onClick={cashOut} disabled={!canCash} hot="␣"><span className="cash-big">Cash out {num(Math.floor(mine.bet * live))}</span></Btn>}
      </div>
    );
  } else {
    controls = <div className="mid"><span className="info big">{v.phase === 'bet' ? 'On the pad · waiting for launch' : v.phase === 'fly' ? 'Sitting this one out' : v.msg}</span></div>;
  }

  return (
    <div className="table-screen fade-in">
      <TopBar title="Crash" sub={'The Rocket · ' + num(info.limits.min) + '–' + num(info.limits.max) + ' · cash out before it blows'} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage draw={draw} target={{ land: [340, 190], port: [190, 290] }} />
        <div className="overlays">{banner && <Banner {...banner} />}</div>
      </div>
      <div className="controls">{controls}</div>
      <Help open={help} title="Crash" onClose={() => setHelp(false)}>
        <p>Bet before launch. The rocket climbs and the multiplier with it; <b>cash out</b> any time and your bet pays that multiple. When it blows, every bet still riding is lost.</p>
        <p>Set <b>Auto</b> to cash out on your own at a multiplier. Where it blows is drawn before launch: it reaches 2× about half the time, 10× about one in ten; 4% never leave the pad. Walking away mid-flight cashes you out where it is.</p>
      </Help>
    </div>
  );
}

function drawRocket(ctx, x, y, t) {
  x = Math.round(x); y = Math.round(y);
  const R = [
    '......kk......', '.....kWWk.....', '.....kWwk.....', '....kWwwwk....', '....kWwwgk....', '...kWwwwwgk...',
    '...kWwkkwgk...', '...kWkcckgk...', '...kWkcCkgk...', '...kWwkkwgk...', '...kWwwwwgk...', '...krrrrrrk...',
    '...kWwwwwgk...', '...kWwwwwgk...', '...kWwwwwgk...', '...kWwwwwgk...', '..kkWwwwwgkk..', '.krkWwwwwgkrk.',
    '.krkWwwwwgkrk.', 'krrkWwwwwgkrrk', 'krrkkkkkkkkrrk', 'kkk.kgggk.kkk.', '....kooook....', '.....kyyk.....'];
  const P = { k: '#0c0814', W: '#ffffff', w: '#d8d4e8', g: '#8a84a8', c: '#5cc8d0', C: '#c8f8ff', r: '#e84060', o: '#ffb040', y: '#ffe080' };
  R.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c === '.') continue; ctx.fillStyle = P[c] || '#f0f'; ctx.fillRect(x + i, y + j, 1, 1); } });
  if (Math.floor(t * 10) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 7, 1, 1); }
}
