// Craps: one side of the big table. The point boxes along the back, the come and don't come, the field, the don't
// pass bar and the pass line nearest you, the centre's propositions to one side. Whoever has the dice throws them
// at the far wall; they tumble back, the stickman calls it, the dealers pay and sweep. The dice go round the table:
// keep them until you seven out.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as C from '../games/craps.js';
import { useTable } from '../core/useTable.js';
import { tableInfo, chipsFor } from '../core/tables.js';
import { PAL, FELTS, text, small, glow, ease, clamp, rect, disc } from '../art/pix.js';
import { drawStack, dieFace, dieSpin, arc } from '../art/sprites.js';
import { slab } from '../art/felt.js';
import { figure, plate, PILOT_SHEETS } from '../art/people.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, ChipRack, Btn, Banner, Clock, Help, useKeys, Together, useWallet } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num, signed } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';
import { seeded } from '../core/rng.js';

const SETTLED = ['result'];
const PTS = [4, 5, 6, 8, 9, 10];
const PT_LABEL = { 4: '4', 5: '5', 6: 'SIX', 8: '8', 9: 'NINE', 10: '10' };
const PROPS = [['any7', 'ANY SEVEN', '4 TO 1'], ['h6', 'HARD 6', '9 TO 1'], ['h8', 'HARD 8', '9 TO 1'], ['h4', 'HARD 4', '7 TO 1'], ['h10', 'HARD 10', '7 TO 1'], ['anyc', 'ANY CRAPS', '7 TO 1'], ['yo', 'YO 11', '15 TO 1']];

export default function Craps({ wallet, table, stakes, link, onBack, backLabel, say }) {
  useWallet(wallet);
  const info = useMemo(() => tableInfo('craps', table, stakes), [table, stakes]);
  const me = useMemo(() => (link ? link.me : { id: 'me', name: wallet.pilot || 'You' }), [link, wallet.pilot]);
  const chips = useMemo(() => chipsFor(info.limits), [info]);
  const [chip, setChip] = useState(() => chips[1].v);
  const [pend, setPend] = useState([]);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [banner, setBanner] = useState(null);
  const [gone, setGone] = useState(false);
  const memo = useRef(new Memo()).current;
  const stage = useRef(null);
  const layout = useRef(null);

  const create = useCallback((env) => {
    const regs = info.regulars.slice(0, link ? 1 : 2);
    const seats = [{ ...me, kind: 'pilot', pos: 2 }, ...regs.map((p, i) => ({ id: 'npc-' + p.id, name: p.name, kind: 'npc', npc: p.id, pos: i === 0 ? 0 : 4 }))];
    return C.create({ seats, limits: info.limits, now: env.now, rng: env.rng });
  }, [info, link, me]);
  const T = useTable({ engine: C, create, link, me, wallet, game: 'craps', settled: SETTLED, who: { name: me.name, pos: 3 } });
  const v = T.view;
  useEffect(() => { if (link) { T.setWho({ name: me.name, pos: 3 }); link.onGone(() => setGone(true)); } }, [link]); // eslint-disable-line

  const mine = v && v.seats.find((x) => x.id === me.id);
  const betting = v && v.phase === 'bet' && mine && !mine.ready;
  const shooter = v && v.seats.find((x) => x.id === v.shooter);
  const iShoot = shooter && shooter.id === me.id;
  const adds = useMemo(() => { const b = {}; for (const p of pend) b[p.k] = (b[p.k] || 0) + p.v; return b; }, [pend]);
  const pendTotal = pend.reduce((a, p) => a + p.v, 0);
  useEffect(() => { if (v && v.phase !== 'bet') setPend([]); }, [v && v.phase]); // eslint-disable-line
  useEffect(() => { if (link) T.sendPending(adds); }, [pendTotal]); // eslint-disable-line

  const prev = useRef({});
  useEffect(() => {
    if (!v) return;
    const p = prev.current;
    if (v.phase !== p.phase || v.round !== p.round) {
      if (v.phase === 'bet' && !p.phase) setBanner({ text: v.point ? 'THE POINT IS ' + v.point : 'COMING OUT', sub: info.name + ' · ' + num(info.limits.min) + '–' + num(info.limits.max), tone: 'fade', k: Date.now() });
      else if (v.phase === 'roll') { setBanner(null); sfx('dice'); }
      else if (v.phase === 'result') {
        const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
        const won = r ? r.pay : 0, lost = r ? Object.values(r.lost || {}).reduce((a, b) => a + b, 0) : 0;
        setTimeout(() => {
          setBanner({ text: v.msg, sub: won ? 'you collect ' + num(won) : lost ? 'you lose ' + num(lost) : '', tone: won ? (won >= info.limits.min * 10 ? 'win big' : 'win') : lost ? 'lose' : 'quiet', k: Date.now() });
          if (won) { sfx(won >= info.limits.min * 10 ? 'bigwin' : 'win'); recordWin('craps', won); } else if (lost) sfx('lose');
        }, 150);
      } else if (v.phase === 'bet' && p.phase === 'result') setBanner(null);
      p.phase = v.phase; p.round = v.round;
    }
  }, [v]); // eslint-disable-line

  // what a tap on the felt bets
  const keyFor = (spot) => {
    if (!mine) return null;
    const have = mine.bets;
    if (spot === 'passodds') return 'po';
    if (spot === 'dpodds') return 'dpo';
    if (/^box\d+$/.test(spot)) return 'p' + spot.slice(3);
    if (/^come\d+$/.test(spot)) return 'co' + spot.slice(4);
    if (/^dcp\d+$/.test(spot)) return 'do' + spot.slice(3);
    void have;
    return spot;
  };
  const add = useCallback((spot, amt) => {
    if (!betting || busy || !v) return;
    const k = keyFor(spot);
    if (!k) return;
    const next = { ...adds, [k]: (adds[k] || 0) + amt };
    if (!C.canBet(v, mine.bets, next)) {
      sfx('deny');
      const why = (k === 'pass' || k === 'dp') && v.point ? 'The line’s closed while the point is on' : (k === 'come' || k === 'dc') && !v.point ? 'Come bets go down once there’s a point' : /o/.test(k) ? 'Odds go behind a line bet (up to 3-4-5×)' : 'Minimum ' + num(info.limits.min) + ', maximum ' + num(info.limits.max);
      say(why); return;
    }
    if (pendTotal + amt > wallet.balance) { sfx('deny'); say('Not enough chips'); return; }
    setPend((p) => [...p, { k, v: amt }]); sfx('chip');
  }, [betting, busy, v, adds, mine, pendTotal, wallet.balance, info, say]); // eslint-disable-line
  const undo = () => { if (!pend.length) return; setPend((p) => p.slice(0, -1)); sfx('chip'); };
  const clear = () => { if (!pend.length) return; setPend([]); sfx('chips'); };
  const roll = async () => {
    if (!betting || busy) return;
    setBusy(true);
    if (pendTotal) {
      const ok = await wallet.stake(pendTotal, 'craps');
      if (!ok) { setBusy(false); say('The cage didn’t take it'); return; }
    }
    if (!T.act({ t: 'ready', adds }) && pendTotal) await wallet.pay(pendTotal, 'craps', 'refund:' + Date.now(), 0);
    setPend([]); setBusy(false);
  };
  useKeys({ ' ': roll, Enter: roll, z: undo, Backspace: undo, 1: () => setChip(chips[0].v), 2: () => setChip(chips[1].v), 3: () => setChip(chips[2].v), 4: () => setChip(chips[3].v), 5: () => setChip(chips[4].v) }, [betting, pend, busy]);

  // ---- drawing ------------------------------------------------------------------------------------------------------------
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000, F = FELTS[info.felt];
    ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
    if (!v) return;
    const port = H > W * 1.05;
    const L = makeLayout(W, H, port);
    layout.current = L;
    // the stickman behind the far wall
    figure(ctx, info.dealer.sheet, L.stick[0], L.fy + 12, { t, clip: L.fy - 3 });
    ctx.drawImage(slab(W, H, info.felt, L.fx, L.fy, L.fw, L.fh, 5), 0, 0);
    // the back wall's diamonds (what the dice bounce off)
    for (let x = L.fx + 4; x < L.fx + L.fw - 4; x += 6) { rect(ctx, x, L.fy + 1, 3, 2, '#3a1a4a'); rect(ctx, x + 1, L.fy + 1, 1, 1, '#6a3a80'); }
    glow(ctx, W / 2, L.fy + L.fh * 0.4, W * 0.5, 'rgba(255,230,160,0.07)', 1);
    const ink = F.print, line = 'rgba(232,216,144,0.75)';
    const outline = (r) => { ctx.fillStyle = line; ctx.fillRect(r[0], r[1], r[2] + 1, 1); ctx.fillRect(r[0], r[1] + r[3], r[2] + 1, 1); ctx.fillRect(r[0], r[1], 1, r[3] + 1); ctx.fillRect(r[0] + r[2], r[1], 1, r[3] + 1); };
    const hov = (id, r) => { if (betting) { f.hit(id, r[0], r[1], r[2], r[3]); if (f.hover === id) { ctx.fillStyle = 'rgba(255,240,160,0.18)'; ctx.fillRect(r[0] + 1, r[1] + 1, r[2] - 1, r[3] - 1); } } };
    // point boxes
    for (const n of PTS) {
      const r = L.box[n]; outline(r); hov('box' + n, r);
      text(ctx, PT_LABEL[n], r[0] + r[2] / 2 + 1, r[1] + Math.round(r[3] * 0.55) - 3, n === 6 || n === 9 ? '#ffe080' : PAL.cream, { align: 'center', shadow: PAL.ink });
      small(ctx, n === 4 || n === 10 ? '9:5' : n === 5 || n === 9 ? '7:5' : '7:6', r[0] + r[2] / 2 + 1, r[1] + r[3] - 7, ink, { align: 'center' });
    }
    const dcR = L.dc; outline(dcR); hov('dc', dcR); small(ctx, "DON'T", dcR[0] + dcR[2] / 2 + 1, dcR[1] + dcR[3] - 14, ink, { align: 'center' }); small(ctx, 'COME', dcR[0] + dcR[2] / 2 + 1, dcR[1] + dcR[3] - 8, ink, { align: 'center' });
    const cm = L.come; outline(cm); hov('come', cm); text(ctx, 'COME', cm[0] + cm[2] / 2, cm[1] + cm[3] / 2 - 3, '#e84060', { align: 'center', scale: 1, shadow: PAL.ink });
    const fd = L.field; outline(fd); hov('field', fd);
    const fn = [2, 3, 4, 9, 10, 11, 12];
    fn.forEach((n, i) => { const x = fd[0] + Math.round((fd[2] * (i + 0.5)) / fn.length); const two = n === 2 || n === 12; if (two) { disc(ctx, x, fd[1] + fd[3] / 2 - 1, 5, 'rgba(232,216,144,0.25)', 4); } small(ctx, String(n), x + 1, fd[1] + fd[3] / 2 - 3, two ? '#ffe080' : PAL.cream, { align: 'center' }); });
    small(ctx, 'FIELD', fd[0] + 3, fd[1] + 2, ink);
    small(ctx, '2 & 12 PAY DOUBLE', fd[0] + fd[2] - 3 - 4 * 17, fd[1] + fd[3] - 7, ink);
    const dp = L.dp; outline(dp); hov('dp', dp); small(ctx, "DON'T PASS BAR", dp[0] + dp[2] / 2, dp[1] + dp[3] / 2 - 2, ink, { align: 'center' });
    const ps = L.pass; outline(ps); hov('pass', ps); text(ctx, 'PASS LINE', ps[0] + ps[2] / 2, ps[1] + ps[3] / 2 - 3, PAL.cream, { align: 'center', shadow: PAL.ink });
    // odds spots behind the line once there's a point
    if (v.point && mine && (mine.bets.pass || adds.pass)) { const r = L.passOdds; ctx.globalAlpha = 0.85; dashed(ctx, r, PAL.gold); ctx.globalAlpha = 1; small(ctx, 'ODDS', r[0] + r[2] / 2 + 1, r[1] + 2, PAL.gold, { align: 'center' }); hov('passodds', r); }
    if (v.point && mine && (mine.bets.dp || adds.dp)) { const r = L.dpOdds; dashed(ctx, r, PAL.gold); small(ctx, 'LAY', r[0] + r[2] / 2 + 1, r[1] + 2, PAL.gold, { align: 'center' }); hov('dpodds', r); }
    // the centre's propositions
    const pr = L.props; rect(ctx, pr[0], pr[1], pr[2], pr[3], 'rgba(0,0,0,0.25)'); outline(pr);
    PROPS.forEach(([k, name, pays], i) => {
      const r = L.prop[k]; outline(r); hov(k, r);
      small(ctx, name, r[0] + 3, r[1] + 2, k === 'any7' ? '#e84060' : PAL.cream);
      small(ctx, pays, r[0] + r[2] - 2, r[1] + r[3] - 6, '#ffe080', { align: 'right' });
      void i;
    });
    // the puck
    const pk = v.point ? L.box[v.point] : L.dc;
    const pkT = memo.at('puck' + (v.point || 0) + ':' + v.rolls, t), pkp = ease.out(prog(t, pkT, 0.4));
    const lastPk = memo.lastPuck || [pk[0] + pk[2] / 2, pk[1] + 7];
    const tx = pk[0] + pk[2] / 2, ty = pk[1] + 7, px = lastPk[0] + (tx - lastPk[0]) * pkp, py = lastPk[1] + (ty - lastPk[1]) * pkp;
    if (pkp >= 1) memo.lastPuck = [tx, ty];
    disc(ctx, px, py + 1, 5, PAL.ink, 4); disc(ctx, px, py, 5, v.point ? '#f4f0e6' : '#1a1622', 4);
    small(ctx, v.point ? 'ON' : 'OFF', px + 1, py - 2, v.point ? '#1a1622' : '#f4f0e6', { align: 'center' });

    // chips: everyone's, mine last (on top); pending ones are mine too
    const res = v.phase === 'result';
    const resT = res ? memo.at('res' + v.round, t) : null;
    const owners = v.seats.filter((x) => !x.left);
    for (const x of owners.sort((a, b) => (a.id === me.id) - (b.id === me.id))) {
      const isMe = x.id === me.id;
      const bets = { ...x.bets };
      if (isMe) for (const k in adds) bets[k] = (bets[k] || 0) + adds[k];
      else if (link && x.id === link.peer.id && !x.ready) for (const k in T.peerPend) bets[k] = (bets[k] || 0) + T.peerPend[k];
      const off = x.pos === 2 ? 0 : x.pos < 2 ? -1 : 1;
      const home = isMe ? [W / 2, H + 12] : L.seat[x.pos] || [W / 2, H];
      const r = res && x.result && x.result.round === v.round ? x.result : null;
      // bets that came down this roll: winners paid and handed back, losers swept to the centre
      if (r) {
        for (const k in r.lost) {
          const [bx, by] = spotXY(L, k, off); const kk = prog(t, resT + 0.35, 0.5);
          if (kk < 1) { const [ax, ay] = arc(bx, by, L.bank[0], L.bank[1], kk, 10); drawStack(ctx, r.lost[k], ax, ay, { label: false, max: 5 }); }
        }
        for (const k in r.wins) {
          const [bx, by] = spotXY(L, k, off), stays = !!x.bets[k];
          const kk = prog(t, resT + 0.35, 0.5), back = prog(t, resT + 1.5, 0.55), e = ease.in(back);
          const winAmt = stays ? r.wins[k] : r.wins[k];
          if (kk < 1) { const [ax, ay] = arc(L.bank[0], L.bank[1], bx + 10, by, kk, 10); drawStack(ctx, winAmt, ax, ay, { label: false, max: 6 }); if (!stays) drawStack(ctx, Math.round(r.wins[k] / 2), bx, by, { label: false, max: 5 }); }
          else if (back < 1) drawStack(ctx, winAmt, bx + 10 + (home[0] - bx - 10) * e, by + (home[1] - by) * e, { label: false, max: 6 });
          if (kk >= 1 && !memo.has('wf' + v.round + x.id + k)) { memo.at('wf' + v.round + x.id + k, t); memo.float(bx + 6, by - 12, '+' + num(r.wins[k]), isMe ? PAL.green : PAL.cream, t); if (isMe) { sfx('chips'); memo.fx.burst(bx + 6, by - 4, 8, [PAL.gold, PAL.gold3], { up: true, speed: 45 }); } }
        }
        // a come bet travelling to its number
        for (const from in r.moved || {}) {
          const to = r.moved[from], [ax, ay] = spotXY(L, from, off), [bx, by] = spotXY(L, to, off), kk = ease.inOut(prog(t, resT + 0.4, 0.6));
          if (kk < 1) { drawStack(ctx, bets[to], ax + (bx - ax) * kk, ay + (by - ay) * kk, { label: false, max: 6 }); delete bets[to]; }
        }
      }
      for (const k in bets) {
        if (!bets[k]) continue;
        const [bx, by] = spotXY(L, k, off);
        drawStack(ctx, bets[k], bx, by, { label: isMe && (f.hover === k || adds[k]) ? undefined : false, max: 6, neat: true });
        if (!isMe) { ctx.fillStyle = PAL.ink; ctx.fillRect(Math.round(bx) + 3, Math.round(by) - 11, 4, 4); ctx.fillStyle = x.kind === 'npc' ? PAL.grey : PAL.cyan; ctx.fillRect(Math.round(bx) + 4, Math.round(by) - 10, 2, 2); }
        if (isMe && /^(c|d)(4|5|6|8|9|10)$/.test(k) && betting && v.point) f.hit((k[0] === 'c' ? 'come' : 'dcp') + k.slice(1), bx - 7, by - 12, 14, 14);
      }
    }

    // people round the rail
    for (const x of owners) {
      if (x.id === me.id) continue;
      const np = info.regulars.find((p) => 'npc-' + p.id === x.id);
      const sh = link && x.id === link.peer.id ? PILOT_SHEETS[1] : np && np.sheet;
      const s = L.seat[x.pos];
      if (sh && s && !port) figure(ctx, sh, s[0], s[1] + 8, { t, row: x.pos < 2 ? 3 : 1, phase: x.pos });
    }
    // the dice
    drawDice(ctx, L, v, t);
    // name plates, and who's shooting
    for (const x of owners) {
      const isMe = x.id === me.id, s = isMe ? [W / 2, H - 13] : L.seat[x.pos];
      if (!s || (port && !isMe)) continue;
      const shoots = v.shooter === x.id;
      const pw = plate(ctx, isMe ? 'YOU' : x.name, s[0], isMe ? s[1] : s[1] + 12, isMe ? PAL.gold : link && x.id === link.peer.id ? PAL.cyan : PAL.grey, { lit: shoots, W, max: 7 });
      if (shoots) { const dx = Math.min(W - 12, Math.max(Math.round(s[0] + pw / 2 + 2), Math.round(pw + 3))), dy = (isMe ? s[1] : s[1] + 12) - 1; ctx.drawImage(dieFace(5, 'red'), dx, dy); }
    }
    memo.fx.update(f.dt); memo.fx.draw(ctx);
    memo.drawFloats(ctx, t);
  };

  function drawDice(ctx, L, v, t) {
    const ro = v.phase === 'roll' ? v.roll : null;
    const final = v.dice;
    if (!ro) {
      // the dice resting where they landed (or in front of the shooter between rolls)
      const rest = memo.rest || [[L.fx + L.fw * 0.48, L.fy + L.fh * 0.5], [L.fx + L.fw * 0.53, L.fy + L.fh * 0.52]];
      final.forEach((d, i) => ctx.drawImage(dieFace(d, 'red'), Math.round(rest[i][0]), Math.round(rest[i][1])));
      return;
    }
    const s = (T.now() - ro.at) / ro.dur;
    const rng = seeded(ro.seed);
    const shooterSeat = v.seats.find((x) => x.id === ro.by);
    const start = shooterSeat && shooterSeat.id === me.id ? [L.fx + L.fw / 2, L.fy + L.fh + 6] : shooterSeat ? (L.seat[shooterSeat.pos] || [L.fx + L.fw / 2, L.fy + L.fh]) : [L.fx + L.fw / 2, L.fy + L.fh];
    const wallY = L.fy + 4;
    for (let i = 0; i < 2; i++) {
      const endX = L.fx + L.fw * (0.36 + rng() * 0.28) + i * 14, endY = L.fy + L.fh * (0.3 + rng() * 0.25);
      const hitX = L.fx + L.fw * (0.3 + rng() * 0.4) + i * 10;
      let x, y, tumbling = true;
      if (s < 0.4) { const k = s / 0.4; x = start[0] + (hitX - start[0]) * k + i * 6; y = start[1] + (wallY - start[1]) * k - Math.sin(k * Math.PI) * 18; }
      else if (s < 0.75) { const k = (s - 0.4) / 0.35; x = hitX + (endX - hitX) * ease.out(k); y = wallY + (endY - wallY) * ease.out(k) - Math.abs(Math.sin(k * Math.PI * 2)) * 8 * (1 - k); }
      else { x = endX; y = endY; tumbling = false; }
      if (s >= 0.4 && !memo.has('thud' + ro.at)) { memo.at('thud' + ro.at, t); sfx('thud'); }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(x) + 1, Math.round(endY > y ? y + 10 : y + 10), 10, 2);
      if (tumbling) {
        const fr = Math.floor(t * 18 + i * 3);
        if (fr % 3 === 0) ctx.drawImage(dieSpin(fr, 'red'), Math.round(x) - 1, Math.round(y) - 1);
        else ctx.drawImage(dieFace(1 + (fr * 7 + i * 3) % 6, 'red'), Math.round(x), Math.round(y));
      } else ctx.drawImage(dieFace(ro.dice[i], 'red'), Math.round(x), Math.round(y));
      if (!memo.rest || memo.restAt !== ro.at) { memo.rest = memo.rest || [[0, 0], [0, 0]]; }
      if (!tumbling) { memo.rest[i] = [x, y]; memo.restAt = ro.at; }
    }
  }

  const onHit = (id, data, o) => { if (o.alt) { const k = keyFor(id); const i = pend.map((p) => p.k).lastIndexOf(k); if (i >= 0) { setPend((p) => p.filter((_, j) => j !== i)); sfx('chip'); } return; } add(id, chip); };
  const onDrop = (x, y, val) => { setChip(val); const h = stage.current && stage.current.hitAtClient(x, y); if (h) add(h.id, val); };

  let controls;
  if (!v) controls = null;
  else if (betting) {
    controls = (
      <>
        <div className="left"><ChipRack chips={chips} value={chip} onPick={setChip} onDrop={onDrop} balance={wallet.balance - pendTotal} /></div>
        <div className="right">
          <Btn small onClick={undo} disabled={!pend.length} hot="Z">Undo</Btn>
          <Btn small onClick={clear} disabled={!pend.length}>Clear</Btn>
          <span className="info">{iShoot ? 'Your dice' : shooter ? shooter.name + ' shoots' : ''}</span>
          <Btn kind="gold" wide onClick={roll} disabled={busy} hot="␣">{link ? 'Ready' : iShoot ? 'Roll' : 'Let it roll'}{pendTotal ? ' ' + num(pendTotal) : ''}</Btn>
        </div>
      </>
    );
  } else {
    const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
    const onTable = mine ? C.sum(mine.bets) : 0;
    const msg = v.phase === 'bet' ? 'Waiting for the table' : v.phase === 'roll' ? (shooter ? shooter.name + (iShoot ? ' — you' : '') + ' rolling…' : 'Rolling…') : r && r.pay ? 'You collect ' + num(r.pay) : v.msg;
    controls = <div className="mid"><span className="info big">{msg}{onTable ? ' · ' + num(onTable) + ' on the table' : ''}</span></div>;
  }

  return (
    <div className="table-screen fade-in">
      <TopBar title="Craps" sub={info.name + ' · ' + num(info.limits.min) + '–' + num(info.limits.max) + ' · odds 3-4-5×'} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage ref={stage} draw={draw} onHit={onHit} target={{ land: [400, 220], port: [190, 300] }} />
        <div className="overlays">
          {banner && <Banner {...banner} />}
          {v && v.until && <Clock until={v.until} now={T.now} total={15000} />}
        </div>
      </div>
      <div className="controls">{controls}</div>
      <Help open={help} title="Craps" onClose={() => setHelp(false)}>
        <p>The first roll is the <b>come-out</b>: 7 or 11 wins the pass line, 2, 3 or 12 (craps) loses it. Any other number becomes the <b>point</b> (the puck turns ON). Now the shooter rolls until the point comes again (pass wins) or a 7 (seven out: pass loses and the dice move on).</p>
        <h4>Bets</h4>
        <table><tbody>
          <tr><td>Pass line / Come</td><td>1 to 1</td></tr>
          <tr><td>Don&apos;t pass / Don&apos;t come (12 is a push)</td><td>1 to 1</td></tr>
          <tr><td>Odds behind a line or come bet (up to 3-4-5×)</td><td>true odds: 2:1, 3:2, 6:5</td></tr>
          <tr><td>Place 4 or 10 / 5 or 9 / 6 or 8</td><td>9:5 / 7:5 / 7:6</td></tr>
          <tr><td>Field (one roll): 3 4 9 10 11, 2 and 12 double</td><td>1:1 / 2:1</td></tr>
          <tr><td>Any seven / any craps / yo 11</td><td>4:1 / 7:1 / 15:1</td></tr>
          <tr><td>Hard 4 or 10 / hard 6 or 8</td><td>7:1 / 9:1</td></tr>
        </tbody></table>
        <p>Tap a spot to put the chip you&apos;ve picked on it; tap your come chips on a number to back them with odds. Place bets and hardways are off on the come-out. Walking away takes your chips down.</p>
      </Help>
    </div>
  );
}

function dashed(ctx, r, col) { ctx.fillStyle = col; for (let x = r[0]; x < r[0] + r[2]; x += 3) { ctx.fillRect(x, r[1], 2, 1); ctx.fillRect(x, r[1] + r[3], 2, 1); } for (let y = r[1]; y < r[1] + r[3]; y += 3) { ctx.fillRect(r[0], y, 1, 2); ctx.fillRect(r[0] + r[2], y, 1, 2); } }

/** Where everything is on the felt for a W × H screen. */
function makeLayout(W, H, port) {
  const L = { box: {}, prop: {}, seat: {} };
  if (!port) {
    L.fx = 40; L.fy = 34; L.fw = W - 80; L.fh = H - 34 - 20;
    const x0 = L.fx + 6, y0 = L.fy + 8, propW = Math.round(L.fw * 0.24), mainW = L.fw - propW - 18;
    const bh = Math.round(L.fh * 0.27), dcW = Math.round(mainW * 0.14), bw = Math.floor((mainW - dcW) / 6);
    L.dc = [x0, y0, dcW, bh];
    PTS.forEach((n, i) => { L.box[n] = [x0 + dcW + i * bw, y0, bw, bh]; });
    const rowH = Math.round((L.fh - bh - 16) / 4.2);
    L.come = [x0, y0 + bh, mainW, rowH];
    L.field = [x0, y0 + bh + rowH, mainW, rowH];
    L.dp = [x0, y0 + bh + rowH * 2, mainW, Math.round(rowH * 0.7)];
    L.pass = [x0, L.dp[1] + L.dp[3], mainW, L.fy + L.fh - 6 - (L.dp[1] + L.dp[3])];
    L.passOdds = [L.pass[0] + Math.round(mainW / 2) + 14, L.pass[1] + 2, 24, L.pass[3] - 4];
    L.dpOdds = [L.dp[0] + Math.round(mainW / 2) + 18, L.dp[1] + 1, 20, L.dp[3] - 2];
    L.props = [x0 + mainW + 8, y0, propW, L.fh - 14];
    const ph = Math.floor(L.props[3] / 4);
    L.prop.any7 = [L.props[0], L.props[1], propW, ph];
    L.prop.h6 = [L.props[0], L.props[1] + ph, Math.floor(propW / 2), ph]; L.prop.h10 = [L.props[0] + Math.floor(propW / 2), L.props[1] + ph, Math.ceil(propW / 2), ph];
    L.prop.h8 = [L.props[0], L.props[1] + ph * 2, Math.floor(propW / 2), ph]; L.prop.h4 = [L.props[0] + Math.floor(propW / 2), L.props[1] + ph * 2, Math.ceil(propW / 2), ph];
    L.prop.anyc = [L.props[0], L.props[1] + ph * 3, Math.floor(propW / 2), L.props[3] - ph * 3]; L.prop.yo = [L.props[0] + Math.floor(propW / 2), L.props[1] + ph * 3, Math.ceil(propW / 2), L.props[3] - ph * 3];
    L.seat = { 0: [L.fx - 18, L.fy + L.fh * 0.62], 4: [L.fx + L.fw + 18, L.fy + L.fh * 0.62], 1: [L.fx + L.fw * 0.25, H - 13], 3: [L.fx + L.fw * 0.75, H - 13] };
    L.stick = [x0 + Math.round(mainW * 0.55), 0];
  } else {
    L.fx = 4; L.fy = 30; L.fw = W - 8; L.fh = H - 30 - 22;
    const x0 = L.fx + 4, w = L.fw - 8;
    let y = L.fy + 6;
    const ph = 12;
    L.props = [x0, y, w, ph * 3];
    const third = Math.floor(w / 3);
    L.prop.any7 = [x0, y, w, ph];
    L.prop.h6 = [x0, y + ph, Math.floor(w / 4), ph]; L.prop.h10 = [x0 + Math.floor(w / 4), y + ph, Math.floor(w / 4), ph]; L.prop.h8 = [x0 + Math.floor(w / 2), y + ph, Math.floor(w / 4), ph]; L.prop.h4 = [x0 + Math.floor((w * 3) / 4), y + ph, w - Math.floor((w * 3) / 4), ph];
    L.prop.anyc = [x0, y + ph * 2, Math.floor(w / 2), ph]; L.prop.yo = [x0 + Math.floor(w / 2), y + ph * 2, w - Math.floor(w / 2), ph];
    y += ph * 3 + 6;
    const bh = Math.round((L.fh - 60) * 0.26);
    PTS.forEach((n, i) => { L.box[n] = [x0 + (i % 3) * third, y + Math.floor(i / 3) * Math.round(bh / 2), third, Math.round(bh / 2)]; });
    y += bh + 2;
    const rest = L.fy + L.fh - 4 - y, rowH = Math.round(rest / 4.6);
    L.dc = [x0, y, Math.round(w * 0.24), rowH];
    L.come = [x0 + Math.round(w * 0.24), y, w - Math.round(w * 0.24), rowH];
    L.field = [x0, y + rowH, w, rowH];
    L.dp = [x0, y + rowH * 2, w, Math.round(rowH * 0.8)];
    L.pass = [x0, L.dp[1] + L.dp[3], w, L.fy + L.fh - 4 - (L.dp[1] + L.dp[3])];
    L.passOdds = [L.pass[0] + Math.round(w / 2) + 14, L.pass[1] + 2, 22, L.pass[3] - 4];
    L.dpOdds = [L.dp[0] + Math.round(w / 2) + 16, L.dp[1] + 1, 20, L.dp[3] - 2];
    L.seat = { 0: [W * 0.15, H - 10], 4: [W * 0.85, H - 10], 1: [W * 0.3, H - 10], 3: [W * 0.7, H - 10] };
    L.stick = [W / 2, 0];
  }
  L.bank = [L.props[0] + L.props[2] / 2, L.props[1] + 4];
  return L;
}

/** Where a bet's chips sit (off: −1 left of centre, 0 mine, 1 right). */
function spotXY(L, k, off) {
  const mid = (r, dx = 0, dy = 0) => [r[0] + r[2] / 2 + dx, r[1] + r[3] / 2 + 5 + dy];
  const sx = off * 16;
  let m;
  if (k === 'pass') return mid(L.pass, sx - 20, 0);
  if (k === 'po') return mid(L.passOdds, 0, 1);
  if (k === 'dp') return mid(L.dp, sx - 22, 0);
  if (k === 'dpo') return mid(L.dpOdds, 0, 0);
  if (k === 'come') return mid(L.come, sx + 30, 0);
  if (k === 'dc') return mid(L.dc, off * 5, 0);
  if (k === 'field') return mid(L.field, sx - 4, 0);
  if (L.prop[k]) return mid(L.prop[k], off * 4, 1);
  if ((m = k.match(/^p(\d+)$/))) return mid(L.box[+m[1]], off * 5, 4);
  if ((m = k.match(/^c(\d+)$/))) return mid(L.box[+m[1]], off * 5 - 5, -5);
  if ((m = k.match(/^co(\d+)$/))) return mid(L.box[+m[1]], off * 5 + 3, -5);
  if ((m = k.match(/^d(\d+)$/))) { const b = L.box[+m[1]]; return [b[0] + 7 + off * 3, b[1] + 9]; }
  if ((m = k.match(/^do(\d+)$/))) { const b = L.box[+m[1]]; return [b[0] + 13 + off * 3, b[1] + 9]; }
  return [L.fx + L.fw / 2, L.fy + L.fh / 2];
}
void clamp; void signed;
