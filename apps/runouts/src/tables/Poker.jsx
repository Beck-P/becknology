// Hold'em: buy in, sit down with the regulars round the oval (or across from the other pilot), and play. Cards
// slide out from the dealer, bets slide in front of each seat and into the pot at the end of a street, the board
// turns over, a showdown lights the winning five and pushes the pot over. Stand up whenever: your stack is
// cashed back into coins (a hand in progress is folded).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as P from '../games/poker.js';
import { useTable } from '../core/useTable.js';
import { tableInfo } from '../core/tables.js';
import { npcById } from '../core/people.js';
import { PAL, text, small, glow, ease, rect } from '../art/pix.js';
import { oval } from '../art/felt.js';
import { drawCard, drawStack, CW, CH, SW, SH } from '../art/sprites.js';
import { figure, plate, PILOT_SHEETS } from '../art/people.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, Btn, Banner, Clock, Help, useKeys, Together, useWallet } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num, short } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';

const ANG = [90, 148, 205, 270, 335, 32];          // where each seat sits, counting round from yours
const holdFn = (meId) => (v) => (v && v.ifc ? v.ifc[meId] || 0 : 0);

export default function Poker(props) {
  const { wallet, table, stakes, link, onBack, backLabel, say } = props;
  useWallet(wallet);
  const info = useMemo(() => tableInfo('poker', table, stakes), [table, stakes]);
  const L = info.limits;
  const [buy, setBuy] = useState(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const opts = [L.buyMin, Math.round(L.buy / 2), L.buy, L.buyMax].filter((x, i, a) => a.indexOf(x) === i && x >= L.buyMin);
  const sit = async (amt) => {
    if (busy) return;
    if (amt > wallet.balance) { sfx('deny'); say('Not enough chips for that buy-in'); return; }
    setBusy(true);
    const ok = await wallet.stake(amt, 'poker');
    setBusy(false);
    if (!ok) { say('The cage didn’t take it'); return; }
    sfx('chips'); setBuy(amt);
  };
  if (buy) return <PokerTable {...props} info={info} buyIn={buy} help={help} setHelp={setHelp} />;
  return (
    <div className="table-screen fade-in">
      <TopBar title="Hold'em" sub={info.name + ' · no-limit · blinds ' + num(L.sb) + '/' + num(L.bb)} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)} />
      <div className="stage-box">
        <Stage target={{ land: [380, 210], port: [190, 300] }} draw={(ctx, f) => drawEmpty(ctx, f, info)} />
        <div className="overlays buyin">
          <div className="panel buyin-panel">
            <div className="bp-title">Take a seat</div>
            <div className="bp-sub">{info.name} · blinds {num(L.sb)}/{num(L.bb)} · buy in {num(L.buyMin)}–{num(L.buyMax)}</div>
            <div className="bp-who">{info.regulars.slice(0, 4).map((p) => p.name).join(' · ')}{link ? ' · ' + link.peer.name : ''}</div>
            <div className="bp-opts">
              {opts.map((a) => <Btn key={a} kind={a === L.buy ? 'gold' : 'dark'} disabled={busy || a > wallet.balance} onClick={() => sit(a)}>Buy in {num(a)}</Btn>)}
            </div>
            <div className="bp-note">Your chips at the table are {wallet.kind === 'bridge' ? 'Bridge coins' : 'play chips'}: stand up any time to cash them back.</div>
          </div>
        </div>
      </div>
      <div className="controls"><div className="mid"><span className="info">Pick a buy-in to sit down</span></div></div>
      <PokerHelp open={help} onClose={() => setHelp(false)} />
    </div>
  );
}

function drawEmpty(ctx, f, info) {
  const { W, H } = f;
  ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
  const port = H > W * 1.05;
  const O = oval(W, H, info.felt, port ? { cy: H * 0.5, rx: W * 0.42, ry: H * 0.36 } : { cy: H * 0.5, rx: W * 0.38, ry: H * 0.32 });
  ctx.drawImage(O.img, 0, 0);
  text(ctx, "HOLD'EM", O.cx, O.cy - 3, 'rgba(232,216,144,0.5)', { align: 'center', scale: 2 });
}

function PokerTable({ wallet, link, onBack, backLabel, say, info, buyIn, help, setHelp }) {
  const L = info.limits;
  const me = useMemo(() => (link ? link.me : { id: 'me', name: wallet.pilot || 'You' }), [link, wallet.pilot]);
  const [raiseTo, setRaiseTo] = useState(0);
  const [draft, setDraft] = useState(null);     // an exact amount being typed into the box (null: it shows raiseTo)
  const keepSel = useRef(false);                 // the click that focused the box doesn't undo selecting its number
  const [banner, setBanner] = useState(null);
  const [gone, setGone] = useState(false);
  const [left, setLeft] = useState(null);
  const [rebuy, setRebuy] = useState(false);
  const memo = useRef(new Memo()).current;
  const stage = useRef(null);
  const seen = useRef({ bets: {}, pot: 0 });

  const create = useCallback((env) => {
    const n = link ? (link.mode === 'ring' ? 2 : 0) : info.n === 2 ? 3 : info.n === 3 ? 5 : 4;
    const spots = link ? [1, 5] : n === 3 ? [1, 2, 4] : n === 5 ? [1, 2, 3, 4, 5] : [1, 2, 4, 5];
    const seats = [{ ...me, kind: 'pilot', pos: 0, stack: buyIn }];
    info.regulars.slice(0, n).forEach((p, i) => seats.push({ id: 'npc-' + p.id, name: p.name, kind: 'npc', npc: p.id, pos: spots[i], stack: Math.round(L.buy * (0.7 + ((i * 37) % 10) / 12)) }));
    return P.create({ seats, blinds: L, now: env.now, rng: env.rng });
  }, [info, link, me, buyIn, L]);
  const hold = useMemo(() => holdFn(me.id), [me.id]);
  const T = useTable({ engine: P, create, link, me, wallet, game: 'poker', settled: null, holdFn: hold, who: { name: me.name, stack: buyIn } });
  const v = T.view;
  useEffect(() => { if (link) { T.setWho({ name: me.name, stack: buyIn }); link.onGone(() => setGone(true)); } }, [link]); // eslint-disable-line

  // the other pilot's gone and you're alone at the felt: two of the regulars sit in so the game goes on
  useEffect(() => {
    if (!gone || !v || !T.isHost()) return;
    if (v.seats.filter((x) => !x.left && x.id !== me.id && (x.stack > 0 || x.inHand)).length) return;
    const have = new Set(v.seats.map((x) => x.id));
    const regs = info.regulars.filter((p) => !have.has('npc-' + p.id)).slice(0, 2);
    regs.forEach((p) => T.act({ t: 'join', who: { id: 'npc-' + p.id, name: p.name, kind: 'npc', npc: p.id, stack: L.buy } }));
    if (regs.length && say) say(regs.map((p) => p.name).join(' and ') + ' take the empty seats');
  }, [gone, v && v.seats.length]); // eslint-disable-line

  const mine = v && v.seats.find((x) => x.id === me.id);
  const o = v && mine ? P.options(v, me.id) : null;
  useEffect(() => { if (o) setRaiseTo(Math.min(o.maxTo, o.minTo)); setDraft(null); }, [o && o.minTo, o && o.maxTo, v && v.toAct]); // eslint-disable-line

  // the hand's story: banners, sounds, wins
  const prev = useRef({});
  useEffect(() => {
    if (!v) return;
    const p = prev.current;
    if (v.toAct === me.id && p.toAct !== me.id) { sfx('open'); }
    if ((v.phase === 'show' || v.phase === 'end') && p.hand !== v.hand + ':' + v.phase) {
      p.hand = v.hand + ':' + v.phase;
      const w = v.winners.find((x) => x.ids.includes(me.id));
      const myWin = mine ? mine.won : 0;
      if (w && myWin > 0) {
        const net = myWin - (mine.put || 0);
        setBanner({ text: v.winners.length > 1 && w.ids.length > 1 ? 'SPLIT POT' : 'YOU WIN', sub: num(myWin) + (w.label ? ' · ' + w.label.toLowerCase() : ''), tone: myWin >= L.bb * 30 ? 'win big' : 'win', k: Date.now() });
        setTimeout(() => sfx(myWin >= L.bb * 30 ? 'bigwin' : 'win'), 500);
        if (net > 0) recordWin('poker', net);
      } else if (v.winners[0]) {
        const who = v.seats.find((x) => x.id === v.winners[0].ids[0]);
        setBanner({ text: (who ? who.name : '').toUpperCase() + ' WINS', sub: num(v.winners[0].amt) + (v.winners[0].label ? ' · ' + v.winners[0].label.toLowerCase() : ''), tone: 'quiet', k: Date.now() });
      }
    }
    if (v.phase === 'deal' && p.dealt !== v.hand) { p.dealt = v.hand; setBanner(null); }
    if (mine && mine.stack === 0 && !mine.inHand && (v.phase === 'next' || v.phase === 'idle')) setRebuy(true);
    p.toAct = v.toAct;
  }, [v]); // eslint-disable-line

  const act = (a) => { if (!o) return; sfx(a.t === 'fold' ? 'flip' : a.t === 'check' ? 'click' : 'chips'); T.act(a); };
  const fold = () => act({ t: 'fold' });
  const call = () => act({ t: o && o.canCheck ? 'check' : 'call' });
  const raise = (to) => act({ t: 'raise', to: to || raiseTo });
  // the typed amount, taken: anything from the least raise to all in (said so when it's out of range)
  const commit = () => {
    if (draft == null || !o) return raiseTo;
    const n = parseInt(draft, 10);
    let to = raiseTo;
    if (isFinite(n) && n > 0) {
      to = Math.max(o.minTo, Math.min(o.maxTo, n));
      if (n < o.minTo && say) say('The least you can ' + (o.curBet ? 'raise to' : 'bet') + ' is ' + num(o.minTo));
      else if (n > o.maxTo && say) say('That\'s all in · ' + num(o.maxTo));
    }
    setRaiseTo(to); setDraft(null);
    return to;
  };
  const standUp = async () => {
    if (!v || !mine) { onBack && onBack(); return; }
    const cash = mine.stack;
    T.act({ t: 'leave' });
    await wallet.pay(cash, 'poker', 'cashout:' + Date.now(), 0);
    setLeft(cash);
  };
  const doRebuy = async (amt) => {
    const ok = await wallet.stake(amt, 'poker');
    if (!ok) { say('Not enough chips'); return; }
    T.act({ t: 'rebuy', amount: amt });
    setRebuy(false); sfx('chips');
  };
  useKeys({ f: fold, c: call, k: call, r: () => raise(), ' ': call }, [o, raiseTo]);

  // ---- drawing ------------------------------------------------------------------------------------------------------
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000;
    ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
    if (!v) return;
    const port = H > W * 1.05;
    const O = oval(W, H, info.felt, port ? { cy: Math.round(H * 0.44), rx: Math.round(W * 0.4), ry: Math.round(H * 0.3) } : { cy: Math.round(H * 0.45), rx: Math.round(W * 0.36), ry: Math.round(H * 0.3) });
    const cx = O.cx, cy = O.cy;
    const myPos = mine ? mine.pos : 0;
    const rel = (x) => ((x.pos - myPos) % 6 + 6) % 6;
    const seatAt = (r) => { const a = (ANG[r] * Math.PI) / 180; return { a, x: cx + Math.cos(a) * (O.rx + 10), y: cy + Math.sin(a) * (O.ry + 9), ix: cx + Math.cos(a) * O.rx * 0.62, iy: cy + Math.sin(a) * O.ry * 0.55, bx: cx + Math.cos(a) * O.rx * 0.78, by: cy + Math.sin(a) * O.ry * 0.68 }; };
    const topTaken = v.seats.some((x) => rel(x) === 3);
    const dealerXY = topTaken ? [cx - O.rx * 0.5, cy - O.ry - 4] : [cx, cy - O.ry - 6];
    // people behind the table (the far side) — and the dealer
    if (!topTaken) figure(ctx, info.dealer.sheet, cx, cy - O.ry + 6, { t, clip: cy - O.ry - 2 });
    const sheetOf = (x) => (x.kind === 'npc' ? (npcById(x.npc) || {}).sheet : link && x.id === link.peer.id ? PILOT_SHEETS[1] : null);
    for (const x of v.seats) {
      const r = rel(x);
      if (r === 0) continue;
      const s = seatAt(r);
      const sh = sheetOf(x);
      if (!sh) continue;
      const mood = (v.phase === 'show' || v.phase === 'end') && x.won > 0 ? 'cheer' : x.folded && x.inHand ? 'slump' : null;
      if (Math.sin(s.a) < -0.3) figure(ctx, sh, s.x, s.y + 14, { t, clip: s.y + 2, phase: r, mood });
    }
    ctx.drawImage(O.img, 0, 0);
    glow(ctx, cx, cy, O.rx * 1.1, 'rgba(255,230,160,0.07)', 1);
    // the people at the near ends sit beside the table
    for (const x of v.seats) {
      const r = rel(x);
      if (r === 0) continue;
      const s = seatAt(r), sh = sheetOf(x);
      if (!sh || Math.sin(s.a) >= -0.3 || port) continue;
    }
    for (const x of v.seats) {
      const r = rel(x), s = seatAt(r), sh = sheetOf(x);
      if (r === 0 || !sh || Math.sin(s.a) < -0.3 || port) continue;
      const mood = (v.phase === 'show' || v.phase === 'end') && x.won > 0 ? 'cheer' : null;
      figure(ctx, sh, s.x + (Math.cos(s.a) > 0 ? 14 : -14), s.y + 10, { t, row: Math.cos(s.a) > 0 ? 3 : 1, phase: r, mood });
    }
    // the board
    const bw = CW * 5 + 4 * 4, bx0 = Math.round(cx - bw / 2), by0 = Math.round(cy - CH / 2 - 6);
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(bx0 + i * (CW + 4), by0, CW, CH); }
    const winCards = new Set((v.phase === 'show' && v.winners[0] ? v.winners[0].cards : []) || []);
    const showT = v.phase === 'show' ? memo.at('show' + v.hand, t) : null;
    v.board.forEach((c, i) => {
      const t0 = memo.at('b' + c.id, t + (i < 3 && v.board.length >= 3 && !memo.has('b' + c.id) ? i * 0.12 : 0));
      const k = prog(t, t0, 0.3), fl = prog(t, t0 + 0.3, 0.2);
      if (k > 0 && k < 1 && !memo.has('bs' + c.id)) { memo.at('bs' + c.id, t); sfx('card'); }
      const tx = bx0 + i * (CW + 4), ty = by0;
      const x = dealerXY[0] + (tx - dealerXY[0]) * ease.out(k), y = dealerXY[1] + (ty - dealerXY[1]) * ease.out(k);
      const lit = showT != null && prog(t, showT, 1.2) >= 1 && winCards.has(c.id);
      drawCard(ctx, c, x, y, { flip: fl, lift: lit ? 3 : 0, glow: lit ? PAL.gold3 : null, dim: showT != null && prog(t, showT, 1.2) >= 1 && winCards.size && !lit ? 0.45 : 0 });
    });
    // the pot
    const potNow = v.pot + (v.phase === 'show' || v.phase === 'end' ? 0 : 0);
    const inBets = v.seats.reduce((a, x) => a + x.bet, 0);
    const potY = by0 + CH + 12;
    const shownPot = v.phase === 'show' || v.phase === 'end' ? v.winners.reduce((a, w) => a + w.amt, 0) : potNow;
    const potT = v.phase === 'show' || v.phase === 'end' ? memo.at('potgo' + v.hand + v.phase, t) : null;
    if (shownPot > 0) {
      if (potT == null || prog(t, potT, 1.4) < 0.01) {
        drawStack(ctx, shownPot, cx - 14, potY + 6, { label: false, max: 8 });
        rect(ctx, cx - 4, potY - 3, 40, 9, 'rgba(8,4,24,0.85)');
        small(ctx, 'POT ' + short(shownPot + (potT == null ? inBets : 0)), cx + 16, potY - 1, PAL.gold3, { align: 'center' });
      } else {
        // the pot slides to the winner(s)
        for (const w of v.winners) {
          const k = ease.inOut(prog(t, potT + (v.phase === 'show' ? 1.4 : 0.3), 0.7));
          w.ids.forEach((id) => {
            const x = v.seats.find((y) => y.id === id);
            if (!x) return;
            const s = seatAt(rel(x));
            const share = Math.round(w.amt / w.ids.length);
            if (k < 1) drawStack(ctx, share, cx - 14 + (s.bx - cx + 14) * k, potY + 6 + (s.by - potY - 6) * k, { label: false, max: 8 });
            if (k >= 1 && !memo.has('pw' + v.hand + id + w.pot)) { memo.at('pw' + v.hand + id + w.pot, t); memo.float(s.x, s.y - 18, '+' + num(share), id === me.id ? PAL.green : PAL.cream, t); if (id === me.id) { sfx('chips'); memo.fx.burst(s.x, s.y - 10, 16, [PAL.gold, PAL.gold3], { up: true, speed: 60 }); } }
          });
        }
      }
    }
    // the seats
    for (const x of v.seats) {
      const r = rel(x), s = seatAt(r), isMe = x.id === me.id;
      const col = isMe ? PAL.gold : link && x.id === link.peer.id ? PAL.cyan : PAL.grey;
      // hole cards
      if (x.hole.length && x.inHand) {
        const dealT = v.dealtAt ? memo.at('deal' + v.hand, t) : t;
        const order = v.seats.filter((y) => y.inHand).length;
        const idx = Math.max(0, v.seats.filter((y) => y.inHand).indexOf(x));
        x.hole.forEach((c, i) => {
          const t0 = dealT + (i * order + idx) * 0.17;
          const k = prog(t, t0, 0.3);
          if (k <= 0) return;
          if (k < 1 && !memo.has('hs' + c.id)) { memo.at('hs' + c.id, t); sfx('card'); }
          if (isMe) {
            const tx = cx - (port ? 22 : 24) + i * (port ? 18 : 22), ty = H - CH - 4 - (o ? 4 : 0);
            const x_ = dealerXY[0] + (tx - dealerXY[0]) * ease.out(k), y_ = dealerXY[1] + (ty - dealerXY[1]) * ease.out(k);
            const lit = showT != null && prog(t, showT, 1.2) >= 1 && winCards.has(c.id);
            drawCard(ctx, c, x_, y_, { flip: x.folded ? 0 : prog(t, t0 + 0.35, 0.2), lift: lit ? 3 : 0, glow: lit ? PAL.gold3 : null, dim: x.folded ? 0.55 : 0 });
          } else {
            const tx = s.ix - 9 + i * 7, ty = s.iy - 10;
            const x_ = dealerXY[0] + (tx - dealerXY[0]) * ease.out(k), y_ = dealerXY[1] + (ty - dealerXY[1]) * ease.out(k);
            if (x.folded) { if (k >= 1 && !memo.has('fold' + v.hand + x.id)) memo.at('fold' + v.hand + x.id, t); const fk = prog(t, memo.seen.get('fold' + v.hand + x.id), 0.4); if (fk < 1) drawCard(ctx, null, x_ + (cx - x_) * ease.in(fk), y_ + (cy - y_) * ease.in(fk), { flip: 0, small: true, dim: fk }); return; }
            const up = x.shown && c.r;
            const ft = up ? memo.at('sh' + c.id, t) : null;
            const lit = showT != null && prog(t, showT, 1.2) >= 1 && winCards.has(c.id);
            drawCard(ctx, c, x_, y_, { flip: up ? prog(t, ft, 0.25) : 0, small: true, lift: lit ? 2 : 0, glow: lit ? PAL.gold3 : null });
          }
        });
        if (x.shown && x.best && !isMe && showT != null && prog(t, showT, 0.6) >= 1) {
          const lab = x.best.label.toUpperCase().slice(0, 18), w = lab.length * 4 + 4;
          rect(ctx, s.ix - w / 2, s.iy + 12, w, 8, 'rgba(8,4,24,0.88)');
          small(ctx, lab, s.ix, s.iy + 13, x.won > 0 ? PAL.gold3 : PAL.cream, { align: 'center' });
        }
      }
      // bets in front of the seat, sliding in as they're made and to the pot when the street ends
      const prevBet = seen.current.bets[x.id] || 0;
      if (x.bet !== prevBet) {
        if (x.bet > prevBet) memo.seen.set('bet' + x.id, t); else if (x.bet === 0 && prevBet > 0) { memo.seen.set('sweep' + x.id, t); memo.seen.set('sweepAmt' + x.id, prevBet); }
        seen.current.bets[x.id] = x.bet;
      }
      if (x.bet > 0) {
        const k = ease.out(prog(t, memo.seen.get('bet' + x.id), 0.3));
        const fx_ = s.x, fy_ = s.y;
        drawStack(ctx, x.bet, fx_ + (s.bx - fx_) * k, fy_ + (s.by - fy_) * k, { label: k >= 1 ? short(x.bet) : false, max: 6 });
      } else if (memo.seen.has('sweep' + x.id)) {
        const k = prog(t, memo.seen.get('sweep' + x.id), 0.45);
        if (k < 1) drawStack(ctx, memo.seen.get('sweepAmt' + x.id), s.bx + (cx - 14 - s.bx) * ease.in(k), s.by + (potY + 6 - s.by) * ease.in(k), { label: false, max: 6 });
      }
      // the plate: name, stack, and what they just did
      const turn = v.toAct === x.id && v.phase === 'bet';
      const top_ = Math.sin(s.a) < -0.3;
      // across the table the plate goes over their head — or beside it when the screen's too short for that
      const crowded = !isMe && top_ && s.y - 44 < 2;
      const py = isMe ? H - 26 : crowded ? Math.max(2, s.y - 30) : top_ ? s.y - 44 : s.y + 6;
      const px = isMe ? (port ? cx - 70 : cx - 62) : crowded ? s.x + (Math.cos(s.a) < -0.2 ? -46 : 46)
        : s.x + (port ? 0 : top_ ? 0 : Math.cos(s.a) > 0.3 ? 14 : Math.cos(s.a) < -0.3 ? -14 : 0);
      if (!isMe || !port) {
        const w = plate(ctx, isMe ? 'YOU' : x.name, px, py, col, { lit: turn, W, max: 8 });
        const st = x.stack > 0 ? short(x.stack) : x.inHand ? 'ALL IN' : 'OUT';
        const sw = st.length * 4 + 4;
        rect(ctx, Math.round(px - sw / 2), py + 11, sw, 7, 'rgba(8,4,24,0.92)');
        small(ctx, st, px, py + 12, x.stack > 0 ? PAL.gold3 : '#ff8aa0', { align: 'center' });
        void w;
      } else {
        rect(ctx, 4, H - 20, 48, 16, 'rgba(8,4,24,0.88)');
        small(ctx, 'STACK', 7, H - 18, PAL.gold2); small(ctx, short(x.stack), 7, H - 11, PAL.gold3);
      }
      if (x.last && x.inHand && !(v.phase === 'show')) {
        const lab = x.last.slice(0, 12), w = lab.length * 4 + 5;
        const ly = isMe ? H - CH - 18 : crowded ? py + 20 : Math.max(0, py - 9);
        const lx = isMe ? cx + 44 : px;
        const kind = /FOLD/.test(lab) ? '#6a6488' : /RAISE|BET|ALL/.test(lab) ? '#c83a6a' : /CALL/.test(lab) ? '#2a8a5a' : '#3a3a5a';
        rect(ctx, Math.round(lx - w / 2), ly, w, 8, kind);
        small(ctx, lab, lx, ly + 1, PAL.white, { align: 'center' });
      }
      if (turn && x.kind === 'npc') { for (let d = 0; d < 3; d++) if (Math.floor(t * 3) % 4 > d) rect(ctx, px + 10 + d * 3, py - 4, 2, 2, PAL.gold3); }
      if (turn) glow(ctx, isMe ? cx : s.x, isMe ? H - 20 : s.y, 22, 'rgba(255,220,120,0.25)', 1);
      // the dealer button
      if (x.pos === v.btn && x.inHand) {
        const dx = Math.round(s.bx + (Math.cos(s.a) > 0 ? -14 : 14)), dy = Math.round(s.by + 6);
        ctx.fillStyle = PAL.ink; ctx.fillRect(dx - 4, dy - 3, 9, 7); ctx.fillRect(dx - 3, dy - 4, 7, 9);
        ctx.fillStyle = '#f4f0e6'; ctx.fillRect(dx - 3, dy - 3, 7, 7);
        small(ctx, 'D', dx, dy - 2, PAL.ink, { align: 'center' });
      }
    }
    memo.fx.update(f.dt); memo.fx.draw(ctx);
    memo.drawFloats(ctx, t);
  };

  if (left != null) {
    return (
      <div className="table-screen fade-in">
        <TopBar title="Hold'em" sub={info.name} wallet={wallet} onBack={onBack} backLabel={backLabel} />
        <div className="stage-box"><div className="overlays buyin"><div className="panel buyin-panel">
          <div className="bp-title">Cashed out</div>
          <div className="bp-sub">You stood up with {num(left)} ({left - buyIn >= 0 ? '+' : '−'}{num(Math.abs(left - buyIn))} on your buy-in)</div>
          <div className="bp-opts">{onBack && <Btn kind="gold" onClick={onBack}>Back to the lobby</Btn>}</div>
        </div></div></div>
        <div className="controls" />
      </div>
    );
  }

  let controls;
  if (!v || !mine) controls = null;
  else if (o) {
    const pot = o.pot;
    const presets = [['MIN', o.minTo], ['½ POT', Math.max(o.minTo, Math.min(o.maxTo, o.curBet + Math.round((pot + o.toCall) / 2)))], ['POT', Math.max(o.minTo, Math.min(o.maxTo, o.curBet + pot + o.toCall))], ['ALL IN', o.maxTo]];
    controls = (
      <div className="right poker-acts">
        <Btn kind="red" onClick={fold} hot="F">Fold</Btn>
        <Btn kind="green" wide onClick={call} hot="C">{o.canCheck ? 'Check' : (o.toCall >= o.stack ? 'All in ' : 'Call ') + num(o.toCall)}</Btn>
        {o.canRaise && (
          <div className="raise-box">
            <div className="raise-presets">{presets.map(([lab, val]) => <button key={lab} type="button" className={'mini' + (raiseTo === val ? ' on' : '')} onClick={() => { setRaiseTo(val); sfx('click'); }}>{lab}</button>)}</div>
            <div className="raise-row">
              <input type="range" min={o.minTo} max={o.maxTo} step={Math.max(1, L.sb)} value={raiseTo} onChange={(e) => { setRaiseTo(+e.target.value); setDraft(null); }} aria-label="Raise to" />
              <input className="raise-amt" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" enterKeyHint="go"
                value={draft != null ? draft : String(raiseTo)} title={'Type an exact amount · ' + num(o.minTo) + ' to ' + num(o.maxTo)}
                aria-label={(o.curBet ? 'Raise to' : 'Bet') + ', exact amount'}
                onFocus={(e) => { setDraft(String(raiseTo)); e.target.select(); keepSel.current = true; }}
                onMouseUp={(e) => { if (keepSel.current) { e.preventDefault(); keepSel.current = false; } }}
                onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); const to = commit(); e.target.blur(); raise(to); }
                  else if (e.key === 'Escape') { e.preventDefault(); setDraft(null); e.target.blur(); }
                }} />
            </div>
          </div>
        )}
        {o.canRaise && <Btn kind="gold" wide onClick={() => raise(commit())} hot="R">{raiseTo >= o.maxTo ? 'All in' : (o.curBet ? 'Raise to ' : 'Bet ') + num(raiseTo)}</Btn>}
      </div>
    );
  } else {
    const who = v.seats.find((x) => x.id === v.toAct);
    const msg = v.phase === 'bet' && who ? who.name + ' to act…' : v.phase === 'deal' ? 'Shuffle up and deal' : v.phase === 'show' || v.phase === 'end' ? v.msg : mine.folded && mine.inHand ? 'Folded · next hand soon' : v.phase === 'idle' ? v.msg || 'Waiting for players' : '';
    controls = (
      <>
        <div className="mid" style={{ width: 'auto' }}><span className="info big">{msg}</span></div>
        <div className="right">
          {rebuy && mine.stack === 0 ? [L.buyMin, L.buy].filter((a, i, arr) => arr.indexOf(a) === i).map((a) => <Btn key={a} kind="gold" small disabled={a > wallet.balance} onClick={() => doRebuy(a)}>Rebuy {num(a)}</Btn>) : null}
          <Btn small kind="dark" onClick={standUp}>Stand up{mine.stack ? ' · cash ' + num(mine.stack) : ''}</Btn>
        </div>
      </>
    );
  }

  return (
    <div className="table-screen fade-in">
      <TopBar title="Hold'em" sub={info.name + ' · blinds ' + num(L.sb) + '/' + num(L.bb) + (v ? ' · hand ' + v.hand : '')} wallet={wallet} onBack={async () => { await standUp(); }} backLabel="Stand up" onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage ref={stage} draw={draw} target={{ land: [380, 210], port: [190, 300] }} />
        <div className="overlays">
          {banner && <Banner {...banner} />}
          {v && v.until && v.toAct === me.id && <Clock until={v.until} now={T.now} total={30000} />}
        </div>
      </div>
      <div className="controls">{controls}</div>
      <PokerHelp open={help} onClose={() => setHelp(false)} />
    </div>
  );
}

function PokerHelp({ open, onClose }) {
  return (
    <Help open={open} title="Texas Hold'em" onClose={onClose}>
      <p>Two cards each, face down; five shared cards in the middle (the flop, the turn, the river). Make the best five-card hand from any of the seven. Bet, call, raise or fold each street; the last one standing, or the best hand at the showdown, takes the pot.</p>
      <h4>Hands, best first</h4>
      <table><tbody>
        {['Royal flush', 'Straight flush', 'Four of a kind', 'Full house', 'Flush', 'Straight', 'Three of a kind', 'Two pair', 'Pair', 'High card'].map((h, i) => <tr key={h}><td>{h}</td><td>{i + 1}</td></tr>)}
      </tbody></table>
      <h4>At the table</h4>
      <p>No-limit: raise anything from the minimum to all in — tap a preset, slide, or type the exact amount in the box (Enter bets it). Keys: F fold, C check or call, R raise. Stand up to cash your chips back; walking away mid-hand folds it.</p>
    </Help>
  );
}
