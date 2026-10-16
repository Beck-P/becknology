// Blackjack: you sit in the middle of the half-moon, the dealer across the felt, a couple of regulars at the ends.
// Chips on the circle, DEAL; cards fly out of the shoe and turn over; hit, stand, double, split; the dealer plays;
// winners are paid from the tray, losers swept into it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as BJ from '../games/blackjack.js';
import { useTable } from '../core/useTable.js';
import { tableInfo, chipsFor } from '../core/tables.js';
import { PAL, text, small, ease, glow, clamp } from '../art/pix.js';
import { halfMoon, tray, shoe, betRing, print } from '../art/felt.js';
import { drawCard, drawStack, CW, CH, SW, SH, arc } from '../art/sprites.js';
import { figure, plate, PILOT_SHEETS } from '../art/people.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, ChipRack, Btn, Banner, Clock, Help, useKeys, Together, useWallet } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num, signed } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';

const SETTLED = ['settle'];
const OUT_TXT = { bj: 'BLACKJACK', win: 'WIN', push: 'PUSH', lose: 'LOSE', bust: 'BUST' };
const OUT_COL = { bj: PAL.gold3, win: PAL.green, push: PAL.cream, lose: '#ff8aa0', bust: '#ff8aa0' };

export default function Blackjack({ wallet, table, stakes, link, onBack, backLabel, say }) {
  useWallet(wallet);
  const info = useMemo(() => tableInfo('blackjack', table, stakes), [table, stakes]);
  const me = useMemo(() => (link ? link.me : { id: 'me', name: wallet.pilot || 'You' }), [link, wallet.pilot]);
  const chips = useMemo(() => chipsFor(info.limits), [info]);
  const [chip, setChip] = useState(() => chips[Math.min(1, chips.length - 1)].v);
  const [pend, setPend] = useState([]);                 // chips on my circle, not yet bet
  const [last, setLast] = useState(0);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [banner, setBanner] = useState(null);
  const [gone, setGone] = useState(false);
  const memo = useRef(new Memo()).current;
  const stage = useRef(null);

  const create = useCallback((env) => {
    const npcs = info.regulars.slice(0, link ? 1 : info.n === 2 ? 1 : 2);
    const seats = [{ ...me, kind: 'pilot', pos: 2 }];
    const spots = link ? [0] : npcs.length === 1 ? [4] : [0, 4];
    npcs.forEach((p, i) => seats.push({ id: 'npc-' + p.id, name: p.name, kind: 'npc', npc: p.id, sheet: p.sheet, pos: spots[i] }));
    return BJ.create({ seats, limits: info.limits, now: env.now, rng: env.rng });
  }, [info, link, me]);
  const T = useTable({ engine: BJ, create, link, me, wallet, game: 'blackjack', settled: SETTLED });
  const v = T.view;
  useEffect(() => { if (link) { T.setWho({ name: me.name }); link.onGone(() => setGone(true)); } }, [link]); // eslint-disable-line

  const mine = v && v.seats.find((x) => x.id === me.id);
  const pendTotal = pend.reduce((a, b) => a + b, 0);
  const myTurn = v && v.phase === 'play' && v.turn && v.turn.s === me.id;
  const L = myTurn && mine ? BJ.legal(v, mine) : {};
  const hand = myTurn && mine ? mine.hands[v.turn.h] : null;
  const betting = v && v.phase === 'bet' && mine && !mine.ready;

  // phases → banners and sounds
  const prev = useRef({ phase: null, round: 0 });
  useEffect(() => {
    if (!v) return;
    const p = prev.current;
    if (v.phase !== p.phase || v.round !== p.round) {
      if (v.phase === 'bet' && p.phase !== 'bet') setBanner({ text: v.shuffled && p.phase ? 'FRESH SHOE' : 'PLACE YOUR BETS', sub: !p.phase ? info.name + ' \u00b7 ' + num(info.limits.min) + '\u2013' + num(info.limits.max) : v.shuffled ? 'place your bets' : '', k: Date.now(), tone: 'fade' });
      else if (v.phase === 'deal') setBanner(null);
      else if (v.phase === 'insurance' && mine && mine.bet > 0) setBanner({ text: 'INSURANCE?', sub: 'the dealer shows an ace · pays 2 to 1', k: Date.now() });
      else if (v.phase === 'play') setBanner(v.msg ? { text: v.msg, k: Date.now(), tone: 'fade quiet' } : null);
      else if (v.phase === 'dealer') setBanner(null);
      else if (v.phase === 'settle') {
        const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
        if (r) {
          const outs = mine.hands.map((h) => h.out);
          const big = outs.includes('bj') || r.net >= info.limits.min * 10;
          const t = outs.length === 1 ? (outs[0] === 'bj' ? 'BLACKJACK!' : outs[0] === 'win' ? 'YOU WIN' : outs[0] === 'push' ? 'PUSH' : outs[0] === 'bust' ? 'BUST' : 'DEALER WINS') : r.net > 0 ? 'YOU WIN' : r.net < 0 ? 'DEALER WINS' : 'EVEN';
          setBanner({ text: t, sub: (r.net ? signed(r.net) + ' · ' : '') + v.msg.toLowerCase(), tone: r.net > 0 ? (big ? 'win big' : 'win') : r.net < 0 ? 'lose' : '', k: Date.now() });
          setTimeout(() => sfx(r.net > 0 ? (big ? 'bigwin' : 'win') : r.net < 0 ? 'lose' : 'push'), 350);
          if (r.net > 0) { recordWin('blackjack', r.net); if (big) memo.fx.coins(stage.current ? stage.current.size().W / 2 : 200, 60, 40); }
          if (r.net > 0 || r.pay > 0) setLast((x) => x);
        } else setBanner({ text: v.msg, k: Date.now(), tone: 'fade quiet' });
      }
      p.phase = v.phase; p.round = v.round;
    }
  }, [v]); // eslint-disable-line

  // betting
  const add = useCallback((amt) => {
    if (!betting || busy) return;
    const room = Math.min(info.limits.max - pendTotal, wallet.balance - pendTotal);
    if (amt > room) { sfx('deny'); say(amt > wallet.balance - pendTotal ? 'Not enough chips' : 'Table max is ' + num(info.limits.max)); return; }
    setPend((p) => [...p, amt]); sfx('chip');
    memo.at('pend:' + (pend.length) + ':' + Date.now(), performance.now() / 1000);
  }, [betting, busy, info, pendTotal, wallet.balance, say, memo, pend.length]);
  const undo = () => { if (!pend.length) return; setPend((p) => p.slice(0, -1)); sfx('chip'); };
  const clear = () => { if (!pend.length) return; setPend([]); sfx('chips'); };
  const rebet = () => { if (!last || !betting) return; if (last > wallet.balance) { say('Not enough chips'); return; } setPend(splitChips(last, chips)); sfx('chips'); };
  const double2 = () => { if (!pendTotal) return; const t = Math.min(pendTotal * 2, info.limits.max, wallet.balance); setPend(splitChips(t, chips)); sfx('chips'); };
  useEffect(() => { if (link) T.sendPending(pend.length ? { main: pendTotal } : {}); }, [pendTotal]); // eslint-disable-line
  useEffect(() => { if (v && v.phase !== 'bet') setPend([]); }, [v && v.phase]); // eslint-disable-line

  const deal = async () => {
    if (!betting || busy) return;
    if (pendTotal < info.limits.min) { sfx('deny'); say('Minimum bet ' + num(info.limits.min)); return; }
    setBusy(true);
    const ok = await wallet.stake(pendTotal, 'blackjack');
    if (!ok) { setBusy(false); sfx('deny'); say('The cage didn’t take it — not enough coins?'); return; }
    if (!T.act({ t: 'bet', amount: pendTotal })) { await wallet.pay(pendTotal, 'blackjack', 'refund:' + Date.now(), 0); }
    setLast(pendTotal); setPend([]); setBusy(false);
  };
  const move = async (m) => {
    if (!myTurn || busy || !L[m]) return;
    if (m === 'double' || m === 'split') {
      setBusy(true);
      const ok = await wallet.stake(hand.bet, 'blackjack');
      setBusy(false);
      if (!ok) { sfx('deny'); say('Not enough chips to ' + m); return; }
    }
    sfx(m === 'stand' ? 'click' : 'card');
    T.act({ t: m });
  };
  const insure = async (take) => {
    if (!v || v.phase !== 'insurance' || !mine || mine.ins != null || busy) return;
    if (take) {
      setBusy(true);
      const ok = await wallet.stake(Math.floor(mine.bet / 2), 'blackjack');
      setBusy(false);
      if (!ok) { say('Not enough chips for insurance'); take = false; }
    }
    T.act({ t: 'ins', take });
  };
  useKeys({
    ' ': () => (betting ? deal() : myTurn ? move('stand') : null), Enter: () => (betting ? deal() : null),
    h: () => move('hit'), s: () => move('stand'), d: () => move('double'), p: () => move('split'),
    i: () => insure(true), n: () => insure(false), z: undo, Backspace: undo, r: rebet,
    1: () => setChip(chips[0].v), 2: () => setChip(chips[1].v), 3: () => setChip(chips[2].v), 4: () => setChip(chips[3].v), 5: () => chips[4] && setChip(chips[4].v),
  }, [betting, myTurn, L, pend, chip, busy, v]);

  // ---- drawing ------------------------------------------------------------------------------------------------------
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000;
    ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < W; x += 4) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(x, y, 1, 1); }
    if (!v) return;
    const port = H > W;
    const top = Math.max(port ? 40 : 44, Math.round(H * (port ? 0.13 : 0.21)));
    const tw = port ? Math.round(W * 1.5) : Math.min(W - 80, Math.round(H * 1.95));
    const G = halfMoon(tw, H, info.felt, { top, rail: port ? 6 : 8, print: (g, P) => {
      const y = P.top + Math.round(P.ry * (port ? 0.24 : 0.3));
      print(g, port ? 'BLACKJACK' : 'BLACKJACK PAYS 3 TO 2', P.cx, y, P.F.print, { alpha: 0.9 });
      g.globalAlpha = 0.6;
      if (port) small(g, 'PAYS 3 TO 2', P.cx, y + 9, P.F.print, { align: 'center' });
      small(g, 'DEALER MUST STAND ON SOFT 17', P.cx, y + (port ? 16 : 10), P.F.print, { align: 'center' });
      const iy = y + (port ? 25 : 19), iw = Math.round(P.rx * (port ? 0.3 : 0.4));
      g.globalAlpha = 0.4; g.fillStyle = P.F.print; g.fillRect(P.cx - iw, iy, iw * 2, 1); g.fillRect(P.cx - iw, iy + 8, iw * 2, 1);
      g.globalAlpha = 0.6; small(g, 'INSURANCE PAYS 2 TO 1', P.cx, iy + 2, P.F.print, { align: 'center' });
      g.globalAlpha = 1;
    } });
    const ox = Math.round((W - tw) / 2), cx = ox + G.cx;
    // the dealer, behind the table, the felt at their waist
    const dl = v.phase === 'settle' && mine && mine.result && mine.result.round === v.round ? (mine.result.net > 0 ? 'slump' : null) : null;
    glow(ctx, cx, top - 18, 46, 'rgba(255,200,120,0.18)', 1);
    figure(ctx, info.dealer.sheet, cx, top + 11, { t, clip: top - 2, mood: dl });
    ctx.drawImage(G.img, ox, 0);
    glow(ctx, cx, top + G.ry * 0.45, G.rx, 'rgba(255,230,160,0.08)', 1);
    // tray, shoe, discards
    tray(ctx, cx - 36, top + 2, 72);
    const shoeX = Math.min(W - 32, cx + Math.round(G.rx * 0.6)), shoeY = top + 3;
    shoe(ctx, shoeX, shoeY, (v.shoeLeft || 200) / 312);
    const from = [shoeX + 2, shoeY + 2];

    // seats round the curve: pos 0 (the dealer's left, our right) … pos 4
    const seatAng = (pos) => (port ? 90 - (2 - pos) * 22 : 24 + pos * 33) * Math.PI / 180;
    const seatXY = (pos) => {
      const a = seatAng(pos);
      return [Math.round(cx + Math.cos(a) * G.rx * (port ? 0.62 : 0.76)), Math.round(top + Math.sin(a) * G.ry * (port ? 0.8 : 0.8))];
    };
    // dealer's cards
    const dc = v.dealer.cards, dw = CW + (dc.length - 1) * 14;
    dc.forEach((c, i) => cardAt(ctx, c, cx - Math.round(dw / 2) + i * 14, top + 13, from, t, false));
    const dShown = dc.filter((c) => shown(c, t));
    if (dShown.length) {
      const dt_ = BJ.total(dShown).t;
      badge(ctx, dt_, cx + Math.round(dw / 2) + 4, top + 16, dShown.length === dc.length && BJ.isBJ(dc) ? 'bj' : dt_ > 21 ? 'bust' : null);
    }

    const settleT = v.phase === 'settle' ? memo.at('settle' + v.round, t) : null;
    const ordered = v.seats.slice().sort((a, b) => a.pos - b.pos);
    for (const x of ordered) {
      const [sx, sy] = seatXY(x.pos);
      const isMe = x.id === me.id, isPeer = link && x.id === link.peer.id;
      const col = isMe ? PAL.gold : isPeer ? PAL.cyan : PAL.grey;
      // people sitting at the ends of the table
      if (!isMe && !port && (x.kind === 'npc' || isPeer)) {
        const np = info.regulars.find((p) => 'npc-' + p.id === x.id);
        const a = seatAng(x.pos), left = x.pos >= 3;
        const fx = Math.round(cx + Math.cos(a) * (G.rx + (port ? 2 : 14))), fy = Math.round(top + Math.sin(a) * (G.ry + 8));
        const sheetName = isPeer ? PILOT_SHEETS[1] : np && np.sheet;
        if (sheetName) figure(ctx, sheetName, fx, fy + 6, { t, row: x.pos === 2 ? 2 : left ? 1 : 3, phase: x.pos, mood: x.result && x.result.round === v.round && settleT != null && prog(t, settleT, 0.8) >= 1 ? (x.result.net > 0 ? 'cheer' : x.result.net < 0 ? 'slump' : null) : null });
      }
      // the circle
      const canBet = isMe && betting;
      betRing(ctx, sx, sy, 13, isMe ? (canBet && (f.hover === 'ring' || pend.length) ? PAL.gold3 : PAL.gold) : 'rgba(232,216,144,0.55)', { fill: canBet ? PAL.gold : null, fillA: canBet ? 0.12 + Math.sin(t * 4) * 0.05 : 0 });
      if (canBet) f.hit('ring', sx - 18, sy - 14, 36, 28);
      // chips: what's bet, what's waiting to be bet
      const amt = x.bet || (isMe ? pendTotal : isPeer ? (T.peerPend.main || 0) : 0);
      const settled = settleT != null && x.result && x.result.round === v.round;
      if (!x.hands.length || !settled) {
        if (amt) drawStack(ctx, amt, sx, sy + 4, { label: true });
        x.hands.forEach((h, i) => { if (h.doubled) drawStack(ctx, h.bet / 2, sx + 12 + i * 4, sy + 6, { label: false }); });
        if (x.ins > 0) drawStack(ctx, x.ins, sx + Math.round((cx - sx) * 0.35), sy - 26 + Math.round((top - sy) * 0.1), { label: false });
      }
      // hands
      const n = x.hands.length, small_ = !isMe;
      const cw = small_ ? SW : CW, ch = small_ ? SH : CH;
      const lean = Math.round((cx - sx) * 0.1);
      x.hands.forEach((h, hi) => {
        const hx = sx - Math.round(((n - 1) * (cw + 12)) / 2) + hi * (cw + 12) + lean - Math.round(cw / 2);
        const hy = sy - ch - (small_ ? 9 : 11);
        const active = v.turn && v.turn.s === x.id && v.turn.h === hi && v.phase === 'play';
        h.cards.forEach((c, ci) => cardAt(ctx, c, hx + ci * (small_ ? 5 : 7), hy - ci * (small_ ? 3 : 4), from, t, small_, active ? 2 : 0));
        const vis = h.cards.filter((c) => shown(c, t));
        const tt = BJ.total(vis);
        const lastX = hx + (h.cards.length - 1) * (small_ ? 5 : 7) + cw, lastY = hy - (h.cards.length - 1) * (small_ ? 3 : 4);
        if (vis.length >= 2 || (vis.length && vis.length === h.cards.length)) {
          const kind = settled ? h.out : BJ.isBJ(h.cards) && !h.split ? 'bj' : tt.t > 21 ? 'bust' : null;
          badge(ctx, kind && settled ? OUT_TXT[kind] : kind === 'bj' ? 'BJ' : kind === 'bust' ? 'BUST' : (tt.soft && tt.t < 21 ? tt.t - 10 + '/' : '') + tt.t, lastX + 2, lastY - 2, kind);
        }
        if (active) {
          const bob = Math.round(Math.sin(t * 6) * 1.5);
          const ay = hy - (h.cards.length - 1) * (small_ ? 3 : 4) - 9 + bob, ax = hx + Math.round(cw / 2);
          for (let r = 0; r < 4; r++) { ctx.fillStyle = PAL.ink; ctx.fillRect(ax - 4 + r - 1, ay + r, (4 - r) * 2 + 3, 1); }
          for (let r = 0; r < 4; r++) { ctx.fillStyle = col; ctx.fillRect(ax - 4 + r, ay + r, (4 - r) * 2 + 1, 1); }
        }
        // settling: the dealer pays winners from the tray, sweeps the losers in; then it all comes back to you
        if (settled) {
          const k = prog(t, settleT + 0.25 + hi * 0.25, 0.5), back = prog(t, settleT + 1.9, 0.55);
          const trayXY = [cx, top + 6], home = isMe ? [sx, H + 12] : [sx + (x.pos >= 3 ? -40 : 40), sy + 10];
          const bx = sx + hi * 10 - Math.round((n - 1) * 5), by = sy + 4;
          if (h.out === 'win' || h.out === 'bj') {
            const payAmt = h.out === 'bj' ? Math.floor(h.bet * 1.5) : h.bet;
            if (k < 1) { const [px, py] = arc(trayXY[0], trayXY[1], bx + 12, by, k, 10); drawStack(ctx, h.bet, bx, by, { label: false }); drawStack(ctx, payAmt, px, py, { label: false, max: 6 }); }
            else if (back < 1) {
              const e = ease.in(back);
              drawStack(ctx, h.bet, bx + (home[0] - bx) * e, by + (home[1] - by) * e, { label: false });
              drawStack(ctx, payAmt, bx + 12 + (home[0] - bx - 12) * e, by + (home[1] - by) * e, { label: false });
            }
            if (memo.at('payfx' + v.round + x.id + hi, t) && k >= 1 && !memo.has('payfloat' + v.round + x.id + hi)) { memo.at('payfloat' + v.round + x.id + hi, t); memo.float(bx + 6, by - 14, '+' + payAmt, PAL.green, t); if (isMe) { sfx('chips'); memo.fx.burst(bx + 6, by - 4, 10, [PAL.gold, PAL.gold3], { up: true, speed: 50 }); } }
          } else if (h.out === 'push') {
            if (back < 1) drawStack(ctx, h.bet, bx + (home[0] - bx) * ease.in(back), by + (home[1] - by) * ease.in(back), { label: back < 0.1 ? 'PUSH' : false, labelCol: PAL.cream });
          } else if (h.out) {
            if (k < 1) { const [px, py] = arc(bx, by, trayXY[0], trayXY[1], k, 8); drawStack(ctx, h.bet, px, py, { label: false }); }
          }
        }
      });
      // insurance settling
      if (settled && x.ins > 0) {
        const k = prog(t, settleT + 0.2, 0.5), ix = sx + Math.round((cx - sx) * 0.35), iy = sy - 26;
        if (x.result.ins === 'won') { if (k < 1) drawStack(ctx, x.ins * 3, ix, iy, { label: '+' + x.ins * 2, labelCol: PAL.green }); }
        else if (k < 1) { const [px, py] = arc(ix, iy, cx, top + 6, k, 6); drawStack(ctx, x.ins, px, py, { label: false }); }
      }
      // the name plate (and how it went)
      const name = isMe ? 'YOU' : x.name;
      const res = settled ? x.result : null;
      plate(ctx, name, sx, sy + 12, col, { lit: v.turn && v.turn.s === x.id && v.phase === 'play' });
      if (res && prog(t, settleT, 0.6) >= 1) {
        const s = res.net ? signed(res.net).replace('−', '-') : 'EVEN';
        small(ctx, s, sx, sy + 25, res.net > 0 ? PAL.green : res.net < 0 ? '#ff8aa0' : PAL.cream, { align: 'center', outline: PAL.ink });
      } else if (x.kind === 'pilot' && v.phase === 'bet' && x.ready && !isMe) small(ctx, 'READY', sx, sy + 25, PAL.green, { align: 'center', outline: PAL.ink });
    }
    // chips I've just put down fly in from the rack
    memo.fx.update(f.dt); memo.fx.draw(ctx);
    memo.drawFloats(ctx, t);
  };

  // a card at (x, y): flies from the shoe the first time it's seen, turns over when it's turned up
  function cardAt(ctx, c, x, y, from, t, isSmall, lift = 0) {
    const t0 = memo.at('c' + c.id, t);
    if (t - t0 < 0.02 && !memo.has('snd' + c.id)) { memo.at('snd' + c.id, t); sfx('card'); }
    const k = prog(t, t0, 0.28);
    let px = x, py = y;
    if (k < 1) { const e = ease.out(k); px = from[0] + (x - from[0]) * e; py = from[1] + (y - from[1]) * e; }
    let flip = c.up && c.r ? 1 : 0;
    if (c.up && c.r) {
      const ft = memo.at('f' + c.id, t);
      const delay = k < 1 ? 0.28 : 0;
      flip = prog(t, ft + delay, 0.22);
      if (flip > 0.5 && !memo.has('fs' + c.id)) { memo.at('fs' + c.id, t); if (t - ft > 0.05) sfx('flip'); }
    }
    drawCard(ctx, c, px, py, { flip, small: isSmall, lift });
  }

  // a card has landed and turned over
  function shown(c, t) {
    if (!c.r || !c.up) return false;
    const t0 = memo.seen.get('c' + c.id), ft = memo.seen.get('f' + c.id);
    return t0 != null && ft != null && t - Math.max(t0 + 0.28, ft) > 0.2;
  }

  const onHit = (id) => { if (id === 'ring') add(chip); };
  const onDrop = (cxp, cyp, val) => { const h = stage.current && stage.current.hitAtClient(cxp, cyp); setChip(val); if (h && h.id === 'ring') add(val); };

  // ---- the bar along the bottom -----------------------------------------------------------------------------------------
  let controls;
  if (!v) controls = null;
  else if (betting) {
    controls = (
      <>
        <div className="left">
          <ChipRack chips={chips} value={chip} onPick={setChip} onDrop={onDrop} onAgain={(c) => add(c)} balance={wallet.balance - pendTotal} />
        </div>
        <div className="right">
          <Btn small onClick={undo} disabled={!pend.length} hot="Z">Undo</Btn>
          <Btn small onClick={clear} disabled={!pend.length}>Clear</Btn>
          {last > 0 && !pend.length ? <Btn small kind="cyan" onClick={rebet} hot="R">Rebet {num(last)}</Btn> : <Btn small onClick={double2} disabled={!pend.length}>×2</Btn>}
          <Btn kind="gold" wide onClick={deal} disabled={busy || pendTotal < info.limits.min} hot="␣">{pendTotal ? 'Deal ' + num(pendTotal) : 'Deal'}</Btn>
        </div>
      </>
    );
  } else if (v.phase === 'insurance' && mine && mine.bet > 0 && mine.ins == null) {
    controls = <div className="right"><span className="info">Insurance costs <b>{num(Math.floor(mine.bet / 2))}</b></span><Btn kind="cyan" onClick={() => insure(true)} hot="I">Insure</Btn><Btn onClick={() => insure(false)} hot="N">No thanks</Btn></div>;
  } else if (myTurn) {
    const tt = hand ? BJ.total(hand.cards) : { t: 0 };
    controls = (
      <div className="right">
        <span className="info">You have <b>{tt.soft && tt.t < 21 ? tt.t - 10 + '/' : ''}{tt.t}</b> vs <b>{v.dealer.cards[0] && v.dealer.cards[0].r ? BJ.total([v.dealer.cards[0]]).t : '?'}</b></span>
        <Btn kind="green" wide onClick={() => move('hit')} hot="H">Hit</Btn>
        <Btn kind="red" wide onClick={() => move('stand')} hot="S">Stand</Btn>
        <Btn kind="gold" onClick={() => move('double')} disabled={!L.double || busy || (hand && hand.bet > wallet.balance)} hot="D">Double</Btn>
        <Btn kind="cyan" onClick={() => move('split')} disabled={!L.split || busy || (hand && hand.bet > wallet.balance)} hot="P">Split</Btn>
      </div>
    );
  } else {
    let msg = '';
    const who = v.turn && v.seats.find((x) => x.id === v.turn.s);
    if (v.phase === 'bet' && mine && mine.ready) msg = 'Bet in · waiting for the table';
    else if (v.phase === 'deal') msg = 'Dealing…';
    else if (v.phase === 'insurance') msg = 'Insurance…';
    else if (v.phase === 'play' && who) msg = who.name + ' is playing…';
    else if (v.phase === 'dealer') msg = 'The dealer plays';
    else if (v.phase === 'settle') msg = v.msg;
    controls = <div className="mid"><span className="info">{msg}</span></div>;
  }

  return (
    <div className="table-screen fade-in">
      <TopBar title="Blackjack" sub={info.name + ' · ' + num(info.limits.min) + '–' + num(info.limits.max) + ' · dealer ' + info.dealer.name} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage ref={stage} draw={draw} onHit={onHit} target={{ land: [380, 200], port: [180, 270] }} />
        <div className="overlays">
          {banner && <Banner {...banner} />}
          {v && v.until && <Clock until={v.until} now={T.now} total={v.phase === 'play' ? 25000 : v.phase === 'insurance' ? 9000 : 12000} />}
        </div>
      </div>
      <div className="controls">{controls}</div>
      <Help open={help} title="Blackjack" onClose={() => setHelp(false)}>
        <p>Get closer to 21 than the dealer without going over. Picture cards count 10, aces 1 or 11.</p>
        <h4>The round</h4>
        <p>Put chips on your circle (tap it, or drag a chip from the rack) and press <b>Deal</b>. Then <b>Hit</b> for another card, <b>Stand</b> to keep what you have, <b>Double</b> your bet for exactly one more card, or <b>Split</b> a pair into two hands (a second bet). The dealer plays last: it draws to 16 and stands on every 17, soft 17 included.</p>
        <h4>Pays</h4>
        <table><tbody>
          <tr><td>Blackjack (an ace and a ten-card)</td><td>3 to 2</td></tr>
          <tr><td>Win</td><td>1 to 1</td></tr>
          <tr><td>Insurance (when the dealer shows an ace)</td><td>2 to 1</td></tr>
          <tr><td>Tie with the dealer</td><td>push</td></tr>
        </tbody></table>
        <h4>The table</h4>
        <p>Six decks, shuffled when the shoe runs low. Split up to four hands; split aces get one card each. Keys: Space deals, H S D P, Z undoes a chip.</p>
      </Help>
    </div>
  );
}

function badge(ctx, s, x, y, kind) {
  const str = String(s);
  const w = str.length * 4 + 3;
  const bg = kind === 'bj' ? PAL.gold : kind === 'bust' || kind === 'lose' ? '#c02838' : kind === 'win' ? '#20a060' : kind === 'push' ? '#5a5478' : 'rgba(8,4,24,0.9)';
  ctx.fillStyle = PAL.ink; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, w + 2, 9);
  ctx.fillStyle = bg; ctx.fillRect(Math.round(x), Math.round(y), w, 7);
  small(ctx, str, x + 2, y + 1, kind === 'bj' ? PAL.ink : PAL.white);
}
function splitChips(total, chips) {
  const out = [];
  let r = total;
  for (let i = chips.length - 1; i >= 0; i--) while (r >= chips[i].v && out.length < 30) { out.push(chips[i].v); r -= chips[i].v; }
  return out;
}
void clamp; void OUT_COL;
