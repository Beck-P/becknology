// Runouts at the Royale: four at the counter (you, the regulars, whoever you brought), one of the sixteen old
// runouts to settle it. Back anyone to WIN, to stay SAFE (not last) or to come LAST; the game plays out on the big
// screen; everyone's ranked; the counter pays.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as RO from '../games/runouts.js';
import { useTable } from '../core/useTable.js';
import { tableInfo, chipsFor } from '../core/tables.js';
import { PAL, text, small, rect, glow, ease, clamp } from '../art/pix.js';
import { drawStack, arc } from '../art/sprites.js';
import { figure, plate, PILOT_SHEETS } from '../art/people.js';
import { npcById } from '../core/people.js';
import { MODE_DRAW, modeIcon } from './runouts/modes.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, ChipRack, Btn, Banner, Clock, Help, useKeys, Together, useWallet } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num, signed } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';

const SETTLED = ['result'];
export const PCOL = ['#f078a8', '#5cc8d0', '#e8c040', '#40e080'];
const SPOTS = [['w', 'WIN', '×3.8'], ['s', 'SAFE', '×1.27'], ['l', 'LAST', '×3.8']];
const ORD = ['1ST', '2ND', '3RD', '4TH'];
const ZOOM = { dice: 1, 'coin-flips': 1, 'black-marble': 1, rng: 1, 'high-card': 1, slots: 1, bomb: 1, 'space-invaders': 1, rocket: 1 };

export default function Runouts({ wallet, table, stakes, mode, link, onBack, backLabel, say }) {
  useWallet(wallet);
  const info = useMemo(() => tableInfo('runouts', table, stakes), [table, stakes]);
  const me = useMemo(() => (link ? link.me : { id: 'me', name: wallet.pilot || 'You' }), [link, wallet.pilot]);
  const chips = useMemo(() => chipsFor(info.limits), [info]);
  const [chip, setChip] = useState(() => chips[1].v);
  const [pend, setPend] = useState({});
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [picker, setPicker] = useState(false);
  const [banner, setBanner] = useState(null);
  const [gone, setGone] = useState(false);
  const memo = useRef(new Memo()).current;
  const stage = useRef(null);

  const create = useCallback((env) => {
    const regs = info.regulars.slice(0, link ? 2 : 3);
    const lineup = [{ id: me.id, name: me.name, kind: 'pilot' }];
    if (link) lineup.push({ id: link.peer.id, name: link.peer.name, kind: 'pilot' });
    for (const p of regs) if (lineup.length < 4) lineup.push({ id: 'npc-' + p.id, name: p.name, kind: 'npc', npc: p.id });
    return RO.create({ seats: [{ ...me, kind: 'pilot' }], lineup, mode: mode || 'random', limits: info.limits, now: env.now, rng: env.rng });
  }, [info, link, me, mode]);
  const T = useTable({ engine: RO, create, link, me, wallet, game: 'runouts', settled: SETTLED });
  const v = T.view;
  useEffect(() => { if (link) { T.setWho({ name: me.name }); link.onGone(() => setGone(true)); } }, [link]); // eslint-disable-line
  const mine = v && v.seats.find((x) => x.id === me.id);
  const betting = v && v.phase === 'bet' && mine && !mine.ready;
  const pendTotal = Object.values(pend).reduce((a, b) => a + b, 0);
  const M = v ? RO.modeById(v.mode) : null;
  useEffect(() => { if (v && v.phase !== 'bet') setPend({}); }, [v && v.phase]); // eslint-disable-line
  useEffect(() => { if (link) T.sendPending(pend); }, [pendTotal]); // eslint-disable-line

  const prev = useRef({});
  useEffect(() => {
    if (!v) return;
    const p = prev.current;
    if (v.phase !== p.phase || v.round !== p.round) {
      if (v.phase === 'bet') setBanner({ text: M ? M.name.toUpperCase() : 'RUNOUTS', sub: M ? M.blurb : '', tone: 'fade', k: Date.now() });
      else if (v.phase === 'play') { setBanner(null); sfx('gate'); memo.forget('m:'); }
      else if (v.phase === 'result') {
        const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
        const w = v.lineup[v.play.order[0]], l = v.lineup[v.play.order[v.play.order.length - 1]];
        setBanner({ text: (w.id === me.id ? 'YOU' : w.name.toUpperCase()) + ' WIN' + (w.id === me.id ? '' : 'S'), sub: (l.id === me.id ? 'you' : l.name.toLowerCase()) + ' came last' + (r ? ' · ' + (r.pay ? 'you collect ' + num(r.pay) : 'you lose ' + num(r.staked)) : ''), tone: r ? (r.net > 0 ? 'win' : 'lose') : '', k: Date.now() });
        if (r) { sfx(r.net > 0 ? 'win' : 'lose'); if (r.net > 0) recordWin('runouts', r.net); }
      }
      p.phase = v.phase; p.round = v.round;
    }
  }, [v]); // eslint-disable-line

  const add = (k) => {
    if (!betting || busy) return;
    const next = (pend[k] || 0) + chip;
    if (next > info.limits.max) { sfx('deny'); say('Max ' + num(info.limits.max) + ' a spot'); return; }
    if (pendTotal + chip > wallet.balance) { sfx('deny'); say('Not enough chips'); return; }
    setPend({ ...pend, [k]: next }); sfx('chip');
  };
  const take = (k) => { if (!pend[k]) return; const n = { ...pend }; delete n[k]; setPend(n); sfx('chip'); };
  const go = async () => {
    if (!betting || busy || !pendTotal) return;
    for (const k in pend) if (pend[k] < info.limits.min) { say('Minimum ' + num(info.limits.min) + ' a spot'); return; }
    setBusy(true);
    const ok = await wallet.stake(pendTotal, 'runouts');
    if (!ok) { setBusy(false); say('The cage didn’t take it'); return; }
    if (!T.act({ t: 'bets', bets: pend })) await wallet.pay(pendTotal, 'runouts', 'refund:' + Date.now(), 0);
    setPend({}); setBusy(false);
  };
  const pickMode = (m) => { T.act({ t: 'mode', mode: m }); setPicker(false); sfx('open'); };
  useKeys({ ' ': go, Enter: go, 1: () => setChip(chips[0].v), 2: () => setChip(chips[1].v), 3: () => setChip(chips[2].v), 4: () => setChip(chips[3].v), 5: () => setChip(chips[4].v) }, [betting, pend, chip, busy]);

  // ---- drawing ------------------------------------------------------------------------------------------------------
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000;
    ctx.fillStyle = '#12081e'; ctx.fillRect(0, 0, W, H);
    if (!v) return;
    const port = H > W * 1.05;
    const n = v.lineup.length;
    // the big screen
    const sh = Math.round(H * (port ? 0.46 : 0.56)), sx = 8, sy = 6, sw = W - 16;
    rect(ctx, sx - 3, sy - 3, sw + 6, sh + 6, PAL.ink); rect(ctx, sx - 2, sy - 2, sw + 4, sh + 4, '#3a2a52'); rect(ctx, sx - 1, sy - 1, sw + 2, sh + 2, PAL.ink);
    rect(ctx, sx, sy, sw, sh, '#0a0618');
    for (let y = sy; y < sy + sh; y += 2) rect(ctx, sx, y, sw, 1, 'rgba(255,255,255,0.025)');
    const A = { x: sx + 4, y: sy + 12, w: sw - 8, h: sh - 16 };
    const names = (i) => (v.lineup[i].id === me.id ? 'YOU' : v.lineup[i].name);
    if (v.phase === 'bet' || !v.play) {
      // between rounds: the next game's card
      const cy = sy + sh / 2;
      glow(ctx, W / 2, cy, sw * 0.4, 'rgba(240,120,168,0.15)', 1);
      modeIcon(ctx, v.mode, W / 2, cy - 12, t);
      text(ctx, M ? M.name : '', W / 2, cy + 12, PAL.gold3, { align: 'center', scale: port ? 1 : 2, outline: PAL.ink });
      if (!port) small(ctx, M ? M.blurb.toUpperCase() : '', W / 2, cy + 30, PAL.cyan2, { align: 'center' });
      small(ctx, v.pick === 'random' ? 'RANDOM GAME EACH ROUND' : 'NEXT UP', W / 2, sy + 4, PAL.dim, { align: 'center' });
    } else {
      const P = {
        s: v.play.script, k: Math.max(0, (T.now() - v.play.at) / 1000), dur: v.play.dur / 1000, n, col: PCOL, name: names, t, order: v.play.order,
        sfx: (nm, key) => { if (!memo.has('m:' + key)) { memo.at('m:' + key, t); sfx(nm); } },
      };
      // sparse games run on the screen at double size (the big screen's chunkier pixels)
      const z = ZOOM[v.mode] && A.h / 2 >= 52 ? 2 : 1;
      if (z === 2) {
        const w2 = Math.floor(A.w / 2), h2 = Math.floor(A.h / 2);
        const off = memo.off && memo.off.width === w2 && memo.off.height === h2 ? memo.off : (memo.off = Object.assign(document.createElement('canvas'), { width: w2, height: h2 }));
        const g = off.getContext('2d');
        g.clearRect(0, 0, w2, h2); g.imageSmoothingEnabled = false;
        try { MODE_DRAW[v.mode](g, { x: 0, y: 0, w: w2, h: h2 }, P); } catch (e) { console.warn(e); }
        ctx.drawImage(off, 0, 0, w2, h2, A.x + Math.floor((A.w - w2 * 2) / 2), A.y, w2 * 2, h2 * 2);
      } else try { (MODE_DRAW[v.mode] || (() => {}))(ctx, A, P); } catch (e) { console.warn(e); }
      small(ctx, (M ? M.name : '').toUpperCase(), sx + 4, sy + 3, PAL.dim);
      // the bar along the top of the screen: how far through
      rect(ctx, sx, sy + sh - 2, Math.round(sw * clamp(P.k / P.dur, 0, 1)), 2, PAL.pink);
    }
    // the counter: four players, each with WIN / SAFE / LAST
    const cy0 = sy + sh + (port ? 6 : 8), cw = Math.floor((W - 8) / n);
    const res = v.phase === 'result' && v.play ? v.play.order : null;
    const resT = res ? memo.at('res' + v.round, t) : null;
    for (let i = 0; i < n; i++) {
      const L = v.lineup[i], x0 = 4 + i * cw, cx = x0 + Math.round(cw / 2);
      const isMe = L.id === me.id, isPeer = link && L.id === link.peer.id;
      const sheet = isMe ? PILOT_SHEETS[0] : isPeer ? PILOT_SHEETS[1] : (npcById(L.npc) || {}).sheet;
      const rank = res ? res.indexOf(i) : -1;
      const mood = res && prog(t, resT, 0.4) >= 1 ? (rank === 0 ? 'cheer' : rank === n - 1 ? 'slump' : null) : null;
      // a little podium light in their colour
      glow(ctx, cx, cy0 + 16, 22, PCOL[i] + '40', 1);
      if (sheet && !port) figure(ctx, sheet, cx, cy0 + 40, { t, phase: i, mood, clip: cy0 + 34 });
      const deskY = port ? cy0 : cy0 + 32;
      rect(ctx, x0 + 2, deskY, cw - 4, 3, PCOL[i]);
      plate(ctx, names(i), cx, deskY + 5, PCOL[i], { lit: rank === 0 && prog(t, resT, 0.4) >= 1, W, max: 8 });
      if (rank >= 0 && prog(t, resT, 0.4) >= 1) {
        const lab = ORD[rank], bw = 18;
        rect(ctx, cx + (port ? -bw / 2 : 18), port ? deskY - 9 : deskY - 12, bw, 9, rank === 0 ? PAL.gold : rank === n - 1 ? '#a03048' : '#3a3a5a');
        small(ctx, lab, cx + (port ? 0 : 18 + bw / 2), (port ? deskY - 9 : deskY - 12) + 2, rank === 0 ? PAL.ink : PAL.white, { align: 'center' });
      }
      // the three spots
      const spotY = deskY + 18, avail = H - spotY - 2;
      SPOTS.forEach(([k, lab, pays], j) => {
        const key = k + i;
        let bx, by, bw, bh;
        if (port) { bw = cw - 6; bh = Math.min(16, Math.floor((avail - 4) / 3)); bx = x0 + 3; by = spotY + j * (bh + 2); }
        else { bw = Math.floor((cw - 10) / 3); bh = Math.min(26, avail - 2); bx = x0 + 4 + j * (bw + 1); by = spotY; }
        const won = res && ((k === 'w' && res[0] === i) || (k === 's' && res[n - 1] !== i) || (k === 'l' && res[n - 1] === i));
        const lit = won && prog(t, resT, 0.4) >= 1 && Math.floor(t * 4) % 2;
        rect(ctx, bx, by, bw, bh, PAL.ink);
        rect(ctx, bx + 1, by + 1, bw - 2, bh - 2, lit ? '#3a6a3a' : k === 'w' ? '#2a1a40' : k === 'l' ? '#3a1424' : '#1a2a34');
        if (betting) { f.hit(key, bx, by, bw, bh); if (f.hover === key) rect(ctx, bx + 1, by + 1, bw - 2, bh - 2, 'rgba(255,240,160,0.18)'); }
        small(ctx, lab, bx + (port ? 3 : bw / 2), by + 2, k === 'w' ? PAL.gold3 : k === 'l' ? '#ff8aa0' : PAL.cyan2, { align: port ? 'left' : 'center' });
        if (!port || bw > 40) small(ctx, pays, port ? bx + bw - 3 : bx + bw / 2, port ? by + 2 : by + bh - 7, PAL.dim, { align: port ? 'right' : 'center' });
        // chips: mine (in and pending), the other pilot's
        const amt = (mine && mine.bets[key]) || pend[key] || 0;
        const peerAmt = link && v.seats.find((y) => y.id === link.peer.id && y.ready) ? (v.seats.find((y) => y.id === link.peer.id).bets[key] || 0) : (T.peerPend[key] || 0);
        const chipX = bx + (port ? bw - 18 : bw / 2), chipY = by + (port ? bh - 1 : bh - 6);
        if (amt) {
          if (res && prog(t, resT, 0.5) >= 1) {
            const kk = prog(t, resT + 0.6, 0.6);
            if (won) { if (kk < 1) { drawStack(ctx, amt, chipX, chipY, { label: false, max: 4 }); const [ax, ay] = arc(W / 2, sy + sh, chipX + 8, chipY, kk, 8); drawStack(ctx, Math.floor(amt * RO.PAYS[k]) - amt, ax, ay, { label: false, max: 4 }); } else if (!memo.has('rf' + v.round + key)) { memo.at('rf' + v.round + key, t); memo.float(chipX, chipY - 14, '+' + num(Math.floor(amt * RO.PAYS[k])), PAL.green, t); sfx('chips'); } }
            else if (kk < 1) { const [ax, ay] = arc(chipX, chipY, W / 2, sy + sh, kk, 8); drawStack(ctx, amt, ax, ay, { label: false, max: 4 }); }
          } else drawStack(ctx, amt, chipX, chipY, { label: port ? false : undefined, max: 4, neat: true });
        }
        if (peerAmt) { drawStack(ctx, peerAmt, chipX - 9, chipY, { label: false, max: 3, neat: true }); rect(ctx, chipX - 12, chipY - 12, 3, 3, PAL.cyan); }
      });
    }
    memo.fx.update(f.dt); memo.fx.draw(ctx);
    memo.drawFloats(ctx, t);
  };

  const onHit = (id, data, o) => { if (o.alt) take(id); else add(id); };
  const onDrop = (x, y, val) => { setChip(val); const h = stage.current && stage.current.hitAtClient(x, y); if (h) { const k = h.id; const next = (pend[k] || 0) + val; if (next <= info.limits.max && pendTotal + val <= wallet.balance) { setPend({ ...pend, [k]: next }); sfx('chip'); } } };

  return (
    <div className="table-screen fade-in">
      <TopBar title={'Runouts' + (M ? ' · ' + M.name : '')} sub={info.name.replace('TABLE', 'COUNTER') + ' · ' + num(info.limits.min) + '–' + num(info.limits.max) + ' a spot'} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage ref={stage} draw={draw} onHit={onHit} target={{ land: [360, 210], port: [190, 300] }} />
        <div className="overlays">
          {banner && <Banner {...banner} />}
          {v && v.until && <Clock until={v.until} now={T.now} total={15000} />}
          {picker && (
            <div className="modal-back" onClick={() => setPicker(false)}>
              <div className="modal panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head"><span>Pick the game</span><button type="button" className="icon-btn" onClick={() => setPicker(false)}>✕</button></div>
                <div className="modal-body mode-list">
                  <button type="button" className="mode-row" onClick={() => pickMode('random')}><b>Random</b><span>a different one every round</span></button>
                  {RO.MODES.map((m) => <button key={m.id} type="button" className={'mode-row' + (v && v.mode === m.id ? ' on' : '')} onClick={() => pickMode(m.id)}><b>{m.name}</b><span>{m.blurb}</span></button>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="controls">
        {betting ? (
          <>
            <div className="left"><ChipRack chips={chips} value={chip} onPick={setChip} onDrop={onDrop} balance={wallet.balance - pendTotal} /></div>
            <div className="right">
              <Btn small onClick={() => setPicker(true)}>Game ▾</Btn>
              <Btn small onClick={() => { setPend({}); sfx('chips'); }} disabled={!pendTotal}>Clear</Btn>
              <Btn kind="gold" wide onClick={go} disabled={busy || !pendTotal} hot="␣">{link ? 'Ready' : 'Run it'}{pendTotal ? ' ' + num(pendTotal) : ''}</Btn>
            </div>
          </>
        ) : (
          <div className="mid"><span className="info big">{v ? (v.phase === 'bet' ? 'Bets in · waiting for the table' : v.phase === 'play' ? (M ? M.name : '') + ' — running out…' : (() => { const r = mine && mine.result && mine.result.round === v.round ? mine.result : null; return r ? (r.pay ? 'You collect ' + num(r.pay) + ' (' + signed(r.net) + ')' : 'The house keeps ' + num(r.staked)) : v.msg; })()) : ''}</span></div>
        )}
      </div>
      <Help open={help} title="Runouts" onClose={() => setHelp(false)}>
        <p>The arcade&apos;s old runouts, at the Royale. Four players line up; one of sixteen little games plays out and ranks them, first to last.</p>
        <table><tbody>
          <tr><td>WIN — they finish first</td><td>×3.8</td></tr>
          <tr><td>SAFE — they don&apos;t finish last</td><td>×1.27</td></tr>
          <tr><td>LAST — they finish last</td><td>×3.8</td></tr>
        </tbody></table>
        <p>Back anyone, yourself included, as many ways as you like. Every player has the same chance; the house keeps about 5%. Pick the next game with <b>Game ▾</b>, or leave it on random.</p>
      </Help>
    </div>
  );
}
void ease;
