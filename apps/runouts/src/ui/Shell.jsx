// The parts every table shares: the bar along the top (back to the lobby, the table, your chips), the chip rack
// and the buttons along the bottom, the banner that announces each phase, the rules sheet.
import React, { useEffect, useRef, useState } from 'react';
import { num, signed } from '../core/fmt.js';
import { rackChip } from '../art/sprites.js';
import { sfx, soundOn, setSound } from '../core/sound.js';

export function useWallet(wallet) {
  const [, set] = useState(0);
  useEffect(() => (wallet ? wallet.on(() => set((n) => n + 1)) : undefined), [wallet]);
  return wallet;
}

/** A number that rolls to its new value, with a little +N / −N popping off it. */
export function Rolling({ value, className = '' }) {
  const [shown, setShown] = useState(value);
  const [pop, setPop] = useState(null);
  const ref = useRef({ from: value, to: value, t0: 0, raf: 0 });
  useEffect(() => {
    const r = ref.current;
    if (value === r.to) return;
    const d = value - r.to;
    setPop({ d, k: Date.now() });
    r.from = shown; r.to = value; r.t0 = performance.now();
    cancelAnimationFrame(r.raf);
    const step = (ts) => {
      const k = Math.min(1, (ts - r.t0) / 650), e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(r.from + (r.to - r.from) * e));
      if (k < 1) r.raf = requestAnimationFrame(step);
    };
    r.raf = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(() => () => cancelAnimationFrame(ref.current.raf), []);
  return (
    <span className={'rolling ' + className}>
      {num(shown)}
      {pop && <span key={pop.k} className={'pop ' + (pop.d > 0 ? 'up' : 'down')}>{signed(pop.d)}</span>}
    </span>
  );
}

export function CoinIcon({ size = 16 }) {
  return <span className="coin-ico" style={{ width: size, height: size }} aria-hidden="true" />;
}

export function Balance({ wallet, extra }) {
  useWallet(wallet);
  if (!wallet) return null;
  return (
    <div className="balance" title={wallet.kind === 'bridge' ? 'Your Bridge coins' : 'Play chips (this browser)'}>
      <CoinIcon />
      <Rolling value={wallet.balance} />
      <span className="balance-lab">{wallet.label}</span>
      {extra}
    </div>
  );
}

export function SoundToggle() {
  const [on, setOn] = useState(soundOn());
  return (
    <button type="button" className="icon-btn" aria-label={on ? 'Sound off' : 'Sound on'} title={on ? 'Sound off' : 'Sound on'}
      onClick={() => { setSound(!on); setOn(!on); if (!on) setTimeout(() => sfx('chip'), 30); }}>
      <span className={'ico ' + (on ? 'ico-sound' : 'ico-mute')} />
    </button>
  );
}

export function TopBar({ title, sub, wallet, onBack, backLabel = 'Lobby', onHelp, children }) {
  return (
    <header className="topbar">
      <div className="tb-left">
        {onBack && <button type="button" className="back-btn" onClick={() => { sfx('click'); onBack(); }}><span className="chev">◀</span><span className="back-lab">{backLabel}</span></button>}
        <div className="tb-title">
          <span className="tb-name">{title}</span>
          {sub && <span className="tb-sub">{sub}</span>}
        </div>
      </div>
      <div className="tb-right">
        {children}
        <Balance wallet={wallet} />
        <SoundToggle />
        {onHelp && <button type="button" className="icon-btn" aria-label="How to play" title="How to play" onClick={() => { sfx('click'); onHelp(); }}><span className="ico ico-help">?</span></button>}
      </div>
    </header>
  );
}

/** The chip rack: tap a chip to pick it, or drag one straight onto the felt. */
export function ChipRack({ chips, value, onPick, onDrop, onAgain, balance = Infinity, disabled }) {
  const drag = useRef(null);
  const [ghost, setGhost] = useState(null);
  const start = (e, ch) => {
    if (disabled) return;
    drag.current = { ch, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) { d.moved = true; onPick(d.ch.v); }
    if (d.moved) setGhost({ v: d.ch.v, x: e.clientX, y: e.clientY });
  };
  const end = (e) => {
    const d = drag.current;
    drag.current = null;
    setGhost(null);
    if (!d) return;
    if (!d.moved) { if (onAgain && value === d.ch.v) { onAgain(d.ch.v); return; } onPick(d.ch.v); sfx('chip'); return; }   // the chip you hold, tapped again: on your spot
    if (onDrop) onDrop(e.clientX, e.clientY, d.ch.v);
  };
  const g = ghost && chips.find((c) => c.v === ghost.v);
  return (
    <div className={'chip-rack' + (disabled ? ' off' : '')}>
      {chips.map((ch, i) => {
        const img = rackChip(ch, 26);
        return (
          <button key={ch.v} type="button" className={'rack-chip' + (value === ch.v ? ' on' : '') + (ch.v > balance ? ' poor' : '')}
            aria-label={'Chip ' + ch.v} title={num(ch.v) + ' (' + (i + 1) + ')'}
            onPointerDown={(e) => start(e, ch)} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = null; setGhost(null); }}>
            <CanvasImg img={img} />
          </button>
        );
      })}
      {g && <div className="chip-ghost" style={{ left: ghost.x, top: ghost.y }}><CanvasImg img={rackChip(g, 26)} /></div>}
    </div>
  );
}

/** Show a baked canvas as an image (scaled up crisply by CSS). */
export function CanvasImg({ img, className = '' }) {
  const [src, setSrc] = useState('');
  useEffect(() => { if (img) setSrc(img.toDataURL()); }, [img]);
  return src ? <img className={'px-img ' + className} src={src} alt="" draggable="false" /> : null;
}

export function Btn({ kind = 'dark', children, onClick, disabled, title, hot, wide, small }) {
  return (
    <button type="button" className={'pbtn pbtn-' + kind + (wide ? ' wide' : '') + (small ? ' small' : '')} disabled={disabled} title={title}
      onClick={(e) => { if (disabled) return; sfx('click'); onClick && onClick(e); }}>
      {children}
      {hot && <span className="hot">{hot}</span>}
    </button>
  );
}

/** The big line across the felt: PLACE YOUR BETS / DEALER BUSTS / a win. tone: '' | 'win' | 'lose' | 'big'. */
export function Banner({ text, sub, tone = '', k }) {
  if (!text) return null;
  return (
    <div key={k || text} className={'banner ' + tone}>
      <div className="banner-text">{text}</div>
      {sub && <div className="banner-sub">{sub}</div>}
    </div>
  );
}

/** A countdown ring (bets close in …). */
export function Clock({ until, now, total = 15000 }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(t); }, []);
  if (!until) return null;
  const left = Math.max(0, until - now());
  const s = Math.ceil(left / 1000);
  return (
    <div className={'clock' + (s <= 3 ? ' hurry' : '')} style={{ '--p': Math.max(0, Math.min(1, left / total)) }}>
      <span>{s}</span>
    </div>
  );
}

export function Help({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head"><span>{title}</span><button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Keys while a table's open: { ' ': fn, '1': fn, … }. */
export function useKeys(map, deps) {
  useEffect(() => {
    const k = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const f = map[e.key] || map[e.key.toLowerCase()];
      if (f) { e.preventDefault(); f(e); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Who else is at the table (playing together): a small chip in the bar. */
export function Together({ link, gone }) {
  if (!link) return null;
  return <div className={'together' + (gone ? ' gone' : '')}><span className="dot" />{gone ? link.peer.name + ' left' : 'with ' + link.peer.name}</div>;
}
