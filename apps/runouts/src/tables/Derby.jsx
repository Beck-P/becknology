// The Arcadia Derby: the race card (each runner's silks, form and fixed odds to WIN and to PLACE), chips on the
// card, then they're off: six horses down the straight under the city's neon, the camera running with the leaders,
// the commentary along the bottom, a photo at the post.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as D from '../games/derby.js';
import { useTable } from '../core/useTable.js';
import { tableInfo, chipsFor } from '../core/tables.js';
import { PAL, text, small, rect, glow, ease, clamp, hash } from '../art/pix.js';
import { horse } from '../art/horse.js';
import Stage from '../ui/Stage.jsx';
import { TopBar, ChipRack, Btn, Banner, Clock, Help, useKeys, Together, useWallet, CoinIcon } from '../ui/Shell.jsx';
import { Memo, prog } from '../ui/anim.js';
import { sfx } from '../core/sound.js';
import { num, signed } from '../core/fmt.js';
import { recordWin } from '../core/wins.js';

const SETTLED = ['result'];
const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];

export default function Derby({ wallet, table, stakes, link, onBack, backLabel, say }) {
  useWallet(wallet);
  const info = useMemo(() => tableInfo('derby', table, stakes), [table, stakes]);
  const me = useMemo(() => (link ? link.me : { id: 'me', name: wallet.pilot || 'You' }), [link, wallet.pilot]);
  const chips = useMemo(() => chipsFor(info.limits), [info]);
  const [chip, setChip] = useState(() => chips[1].v);
  const [pend, setPend] = useState({});
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [banner, setBanner] = useState(null);
  const [gone, setGone] = useState(false);
  const [call, setCall] = useState('');
  const memo = useRef(new Memo()).current;

  const create = useCallback((env) => D.create({ seats: [{ ...me, kind: 'pilot' }], limits: info.limits, now: env.now, rng: env.rng }), [info, me]);
  const T = useTable({ engine: D, create, link, me, wallet, game: 'derby', settled: SETTLED });
  const v = T.view;
  useEffect(() => { if (link) { T.setWho({ name: me.name }); link.onGone(() => setGone(true)); } }, [link]); // eslint-disable-line
  const mine = v && v.seats.find((x) => x.id === me.id);
  const betting = v && v.phase === 'bet' && mine && !mine.ready;
  const pendTotal = Object.values(pend).reduce((a, b) => a + b, 0);
  useEffect(() => { if (v && v.phase !== 'bet') setPend({}); }, [v && v.phase]); // eslint-disable-line
  useEffect(() => { if (link) T.sendPending(pend); }, [pendTotal]); // eslint-disable-line

  const prev = useRef({});
  useEffect(() => {
    if (!v) return;
    const p = prev.current;
    if (v.phase !== p.phase || v.round !== p.round) {
      if (v.phase === 'bet') { setBanner({ text: 'RACE ' + v.round, sub: 'six runners · place your bets', tone: 'fade', k: Date.now() }); setCall(''); }
      else if (v.phase === 'race') { setBanner({ text: "THEY'RE OFF!", tone: 'fade', k: Date.now() }); sfx('gate'); }
      else if (v.phase === 'result') {
        const r = mine && mine.result && mine.result.round === v.round ? mine.result : null;
        const w = v.runners[v.race.order[0]];
        setBanner({ text: w.name.toUpperCase() + ' WINS', sub: r ? (r.pay ? 'you collect ' + num(r.pay) : 'not this time') : 'at ' + v.odds[w.i].win.toFixed(1) + ' to win', tone: r && r.net > 0 ? (r.net >= info.limits.min * 10 ? 'win big' : 'win') : '', k: Date.now() });
        if (r) { sfx(r.net > 0 ? 'bigwin' : 'lose'); if (r.net > 0) recordWin('derby', r.net); }
        sfx('bell');
      }
      p.phase = v.phase; p.round = v.round;
    }
  }, [v]); // eslint-disable-line

  const add = (k) => {
    if (!betting || busy) return;
    const next = (pend[k] || 0) + chip;
    if (next > info.limits.max) { sfx('deny'); say('Max ' + num(info.limits.max) + ' a bet'); return; }
    if (pendTotal + chip > wallet.balance) { sfx('deny'); say('Not enough chips'); return; }
    setPend({ ...pend, [k]: next }); sfx('chip');
  };
  const take = (k) => { if (!pend[k]) return; const n = { ...pend }; delete n[k]; setPend(n); sfx('chip'); };
  const clear = () => { setPend({}); sfx('chips'); };
  const go = async () => {
    if (!betting || busy || !pendTotal) return;
    for (const k in pend) if (pend[k] < info.limits.min) { say('Minimum ' + num(info.limits.min) + ' a bet'); return; }
    setBusy(true);
    const ok = await wallet.stake(pendTotal, 'derby');
    if (!ok) { setBusy(false); say('The cage didn’t take it'); return; }
    if (!T.act({ t: 'bets', bets: pend })) await wallet.pay(pendTotal, 'derby', 'refund:' + Date.now(), 0);
    setPend({}); setBusy(false);
  };
  useKeys({ ' ': go, Enter: go, 1: () => setChip(chips[0].v), 2: () => setChip(chips[1].v), 3: () => setChip(chips[2].v), 4: () => setChip(chips[3].v), 5: () => setChip(chips[4].v) }, [betting, pend, chip, busy]);

  // ---- the race on the screen ---------------------------------------------------------------------------------------------
  const draw = (ctx, f) => {
    const { W, H } = f, t = performance.now() / 1000;
    if (!v) { ctx.fillStyle = '#0c0818'; ctx.fillRect(0, 0, W, H); return; }
    const race = v.phase !== 'bet' && v.race ? v.race : null;
    const el = race ? clamp((T.now() - race.at) / race.dur, 0, 1) : 0;
    const tr = race ? race.trace : null;
    const pos = (i) => {
      if (!tr) return 0;
      const fIdx = el * (tr.length - 1), a = Math.floor(fIdx), b = Math.min(tr.length - 1, a + 1), k = fIdx - a;
      return tr[a][i] + (tr[b][i] - tr[a][i]) * k;
    };
    const n = v.runners.length;
    const lead = race ? Math.max(...v.runners.map((r) => pos(r.i))) : 0;
    const span = Math.max(180, W * 0.9);                       // track units on screen
    const camX = race ? clamp(lead - span * 0.72, -40, 1000 - span + 50) : -40;
    const sx = (u) => Math.round(((u - camX) / span) * W);
    // sky, the city, neon
    for (let y = 0; y < H * 0.36; y++) { const k = y / (H * 0.36); ctx.fillStyle = k < 0.33 ? '#0a0418' : k < 0.66 ? '#140a2a' : '#22103a'; ctx.fillRect(0, y, W, 1); }
    for (let i = 0; i < 40; i++) {
      const bx = Math.round(((i * 37 - camX * 0.25) % (W + 60) + W + 60) % (W + 60)) - 30;
      const bh = 20 + Math.round(hash(i) * 34), bw = 10 + Math.round(hash(i + 9) * 12), by = Math.round(H * 0.36) - bh;
      rect(ctx, bx, by, bw, bh, i % 3 ? '#1a1030' : '#24143c');
      for (let wy = by + 3; wy < by + bh - 2; wy += 4) for (let wx = bx + 2; wx < bx + bw - 2; wx += 3) if (hash(wx * 7 + wy) > 0.62) rect(ctx, wx, wy, 1, 2, hash(wx + wy) > 0.5 ? '#f078a8' : '#ffe080');
    }
    // the grandstand and the crowd
    const gy = Math.round(H * 0.36), gh = Math.round(H * 0.14);
    rect(ctx, 0, gy, W, gh, '#2a1838');
    for (let x = 0; x < W; x += 3) for (let r = 0; r < 3; r++) {
      const cx_ = ((x + Math.round(camX * 0.6)) % 600 + 600) % 600, jump = race && el < 1 ? (Math.floor(t * 6 + x) % 5 === 0 ? 1 : 0) : 0;
      rect(ctx, x, gy + 3 + r * 4 - jump, 2, 2, ['#f078a8', '#5cc8d0', '#ffe080', '#f4f0e6', '#a080f0'][(cx_ * 7 + r) % 5]);
    }
    rect(ctx, 0, gy + gh - 2, W, 2, '#120a1c');
    // the sign
    const signX = sx(500) - 50;
    if (signX > -110 && signX < W) { rect(ctx, signX, gy - 18, 100, 13, PAL.ink); text(ctx, 'ARCADIA DERBY', signX + 50, gy - 15, Math.floor(t * 2) % 7 ? PAL.pink : '#6a2a50', { align: 'center' }); }
    // the track
    const ty = gy + gh, th_ = H - ty - 4, lane = Math.floor(th_ / (n + 0.6));
    for (let y = ty; y < H; y++) { const k = (y - ty) / (H - ty); ctx.fillStyle = k < 0.08 ? '#f4f0e6' : (Math.floor((y - ty) / 2) % 2 ? '#7a4a2a' : '#6e4224'); ctx.fillRect(0, y, W, 1); }
    // rail posts and furlong markers
    for (let u = Math.floor(camX / 25) * 25; u < camX + span + 25; u += 25) { const x = sx(u); rect(ctx, x, ty - 6, 1, 6, '#f4f0e6'); if (u % 100 === 0 && u > 0 && u < 1000) { rect(ctx, x - 1, ty - 14, 3, 14, '#f4f0e6'); small(ctx, String((1000 - u) / 100), x + 4, ty - 13, '#f4f0e6'); } }
    rect(ctx, 0, ty - 6, W, 1, '#f4f0e6');
    // start gate and finish post
    const gx = sx(0);
    if (gx > -20 && gx < W + 20) for (let i = 0; i < n; i++) { rect(ctx, gx - 2, ty + 6 + i * lane, 3, lane - 2, '#c8c8d8'); rect(ctx, gx + 1, ty + 6 + i * lane, 1, lane - 2, race ? '#40e080' : '#e84040'); }
    const fx = sx(1000);
    if (fx > -10 && fx < W + 10) { for (let y = ty - 18; y < H; y += 3) { rect(ctx, fx, y, 3, 3, Math.floor((y - ty) / 3) % 2 ? '#ffffff' : '#1c1830'); } text(ctx, 'FINISH', fx + 6, ty - 18, PAL.gold3); }
    // the horses, back lanes first
    for (let i = 0; i < n; i++) {
      const r = v.runners[i], p = pos(i);
      const x = sx(p) - 22, y = ty + 4 + i * lane + lane - 20;
      const running = race && p < 1000 && el < 1;
      const fr = running ? Math.floor(t * 12 + i) % 4 : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 4, y + 18, 18, 2);
      ctx.drawImage(horse(i, r.silk, fr), x, y + (running && fr % 2 ? -1 : 0));
      // the number cloth tag
      rect(ctx, x - 9, y + 6, 8, 7, PAL.ink); rect(ctx, x - 8, y + 7, 6, 5, r.silk); small(ctx, String(i + 1), x - 5, y + 7, r.silk === '#f4f0f8' ? PAL.ink : PAL.white, { align: 'center' });
      if (running && Math.floor(t * 12 + i) % 4 === 0) { rect(ctx, x + 3, y + 19, 2, 1, '#a07040'); if (i === 0) sfx('hoof', 120); }
      const myBet = mine && (mine.bets['w' + i] || mine.bets['p' + i]);
      if (myBet) { rect(ctx, x + 10, y - 6, 5, 4, PAL.gold); rect(ctx, x + 11, y - 2, 3, 1, PAL.gold); }
    }
    // placings at the end
    if (race && el >= 1) {
      race.order.slice(0, 3).forEach((ri, k) => {
        const p = pos(ri), x = sx(p) - 22, y = ty + 4 + ri * lane + lane - 20;
        rect(ctx, x + 22, y - 2, 14, 8, k === 0 ? PAL.gold : k === 1 ? '#c8c8d8' : '#c08040');
        small(ctx, ORD[k], x + 29, y - 1, PAL.ink, { align: 'center' });
      });
      if (!memo.has('photo' + v.round)) { memo.at('photo' + v.round, t); memo.fx.burst(sx(1000), ty + 20, 30, [PAL.white, PAL.gold3], { speed: 80 }); }
      const ph = prog(t, memo.seen.get('photo' + v.round), 0.25);
      if (ph < 1) { ctx.globalAlpha = 1 - ph; rect(ctx, 0, 0, W, H, '#ffffff'); ctx.globalAlpha = 1; }
    }
    // the commentary
    if (race && el < 1) {
      const order = v.runners.map((r) => r.i).sort((a, b) => pos(b) - pos(a));
      const leader = v.runners[order[0]];
      let c = leader.name.toUpperCase() + ' LEADS';
      if (el < 0.08) c = 'AND THEY’RE OFF!';
      else if (el > 0.78) c = 'DOWN THE STRETCH — ' + leader.name.toUpperCase() + ' FROM ' + v.runners[order[1]].name.toUpperCase();
      else if (memo.leader != null && memo.leader !== order[0]) { memo.callT = t; memo.callTxt = leader.name.toUpperCase() + ' TAKES THE LEAD!'; }
      memo.leader = order[0];
      if (memo.callT && t - memo.callT < 1.6) c = memo.callTxt;
      if (c !== call) setTimeout(() => setCall(c), 0);
    }
    glow(ctx, W * 0.5, ty, W * 0.6, 'rgba(255,220,160,0.06)', 1);
    memo.fx.update(f.dt); memo.fx.draw(ctx);
  };

  const card = v && (v.phase === 'bet');
  return (
    <div className="table-screen fade-in">
      <TopBar title="Derby" sub={info.name + ' · win & place · ' + num(info.limits.min) + '–' + num(info.limits.max)} wallet={wallet} onBack={onBack} backLabel={backLabel} onHelp={() => setHelp(true)}>
        <Together link={link} gone={gone} />
      </TopBar>
      <div className="stage-box">
        <Stage draw={draw} target={{ land: [360, 200], port: [190, 280] }} />
        <div className="overlays">
          {card && (
            <div className="race-card panel">
              <div className="rc-head"><span>RACE {v.round}</span><span className="rc-sub">{mine && mine.ready ? 'your bets are in' : 'tap the odds to bet'}</span></div>
              <div className="rc-rows">
                {v.runners.map((r, i) => {
                  const o = v.odds[i], mw = (mine && mine.bets['w' + i]) || pend['w' + i] || 0, mp = (mine && mine.bets['p' + i]) || pend['p' + i] || 0;
                  const peer = T.peerPend || {};
                  return (
                    <div key={i} className="rc-row">
                      <span className="rc-silk" style={{ background: r.silk }}>{i + 1}</span>
                      <span className="rc-name">{r.name}<span className="rc-form">{'★'.repeat(Math.max(1, Math.min(5, Math.round(o.pWin * 14))))}</span></span>
                      <button type="button" className={'rc-odds' + (mw ? ' on' : '')} disabled={!betting} onClick={() => add('w' + i)} onContextMenu={(e) => { e.preventDefault(); take('w' + i); }}>
                        <span className="rc-lab">WIN</span>{o.win.toFixed(o.win < 10 ? 1 : 0)}{mw ? <b><CoinIcon size={10} />{num(mw)}</b> : null}{peer['w' + i] ? <i>{num(peer['w' + i])}</i> : null}
                      </button>
                      <button type="button" className={'rc-odds' + (mp ? ' on' : '')} disabled={!betting} onClick={() => add('p' + i)} onContextMenu={(e) => { e.preventDefault(); take('p' + i); }}>
                        <span className="rc-lab">PLACE</span>{o.place.toFixed(o.place < 10 ? 1 : 0)}{mp ? <b><CoinIcon size={10} />{num(mp)}</b> : null}{peer['p' + i] ? <i>{num(peer['p' + i])}</i> : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {v && v.phase !== 'bet' && <div className="commentary">{v.phase === 'result' ? v.race.order.slice(0, 3).map((ri, k) => ORD[k] + ' ' + v.runners[ri].name.toUpperCase()).join('  ·  ') : call}</div>}
          {banner && <Banner {...banner} />}
          {v && v.until && <Clock until={v.until} now={T.now} total={20000} />}
        </div>
      </div>
      <div className="controls">
        {betting ? (
          <>
            <div className="left"><ChipRack chips={chips} value={chip} onPick={setChip} balance={wallet.balance - pendTotal} /></div>
            <div className="right">
              <Btn small onClick={clear} disabled={!pendTotal}>Clear</Btn>
              <Btn kind="gold" wide onClick={go} disabled={busy || !pendTotal} hot="␣">{link ? 'Ready' : 'Start the race'}{pendTotal ? ' ' + num(pendTotal) : ''}</Btn>
            </div>
          </>
        ) : (
          <div className="mid"><span className="info big">{v ? (v.phase === 'bet' ? 'Bets in · waiting for the off' : v.phase === 'race' ? 'And they’re running…' : (() => { const r = mine && mine.result && mine.result.round === v.round ? mine.result : null; return r ? (r.pay ? 'You collect ' + num(r.pay) + ' (' + signed(r.net) + ')' : 'The house keeps ' + num(r.staked)) : v.msg; })()) : ''}</span></div>
        )}
      </div>
      <Help open={help} title="The Arcadia Derby" onClose={() => setHelp(false)}>
        <p>Six runners a race. Back one to <b>WIN</b> (first past the post) or to <b>PLACE</b> (first or second). The odds on the card are what a 1-coin bet returns, stake included: 4.5 to win pays 45 on a 10.</p>
        <p>The house prices every race by running it a thousand times before the off (form stars show who it fancies) and keeps about 12% of the win book. Then it&apos;s run once, for real.</p>
        <p>Tap an odds button to put the chip you&apos;ve picked on it; right-click to take a bet off.</p>
      </Help>
    </div>
  );
}
void ease;
