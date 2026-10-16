// Royale Link: the Neon Royale's gaming system. The same games as the casino's tables in Arcadia, reachable from any
// Royale Link terminal. URLs (the casino's interactions depend on these):
//   /runouts/?link=1                         the lobby (a terminal)
//   /runouts/?game=<id>&table=<id>[&stakes=high]   straight to a table (blackjack roulette craps poker slots derby crash)
//   /runouts/?game=runouts[&mode=<mode id>]   the Runouts section, or one of its games
//   ?together=<json>                          two pilots at one table (from the Bridge's *Play a game…*)
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lobby, { RunoutsLobby } from './ui/Lobby.jsx';
import { openWallet, frameReady, requestClose, inFrame } from './core/wallet.js';
import { togetherLink } from './core/link.js';
import { gameById } from './core/tables.js';
import { modeById } from './games/runouts.js';
import { sfx } from './core/sound.js';

const TABLES = {
  blackjack: lazy(() => import('./tables/Blackjack.jsx')),
  roulette: lazy(() => import('./tables/Roulette.jsx')),
  craps: lazy(() => import('./tables/Craps.jsx')),
  poker: lazy(() => import('./tables/Poker.jsx')),
  slots: lazy(() => import('./tables/Slots.jsx')),
  derby: lazy(() => import('./tables/Derby.jsx')),
  crash: lazy(() => import('./tables/Crash.jsx')),
  runouts: lazy(() => import('./tables/Runouts.jsx')),
};

function fromUrl(link) {
  const q = new URLSearchParams(window.location.search);
  if (link) return { name: 'table', game: link.game, table: (link.opts && link.opts.table) || link.game + '-1', stakes: link.opts && link.opts.stakes, mode: (link.opts && link.opts.mode) || null };
  const game = q.get('game');
  const stakes = q.get('stakes') === 'high' ? 'high' : null;
  if (game === 'runouts') {
    const mode = q.get('mode');
    if (mode && (modeById(mode) || mode === 'random')) return { name: 'table', game: 'runouts', mode, table: q.get('table') || 'runouts-' + mode, stakes };
    return { name: 'runouts', stakes };
  }
  if (game && game !== 'lobby' && gameById(game)) return { name: 'table', game, table: q.get('table') || game + '-1', stakes };
  return { name: 'lobby', stakes };
}
function toUrl(sc) {
  const q = new URLSearchParams();
  if (sc.name === 'lobby') q.set('link', '1');
  else if (sc.name === 'runouts') q.set('game', 'runouts');
  else { q.set('game', sc.game); if (sc.mode) q.set('mode', sc.mode); if (sc.table) q.set('table', sc.table); }
  if (sc.stakes === 'high') q.set('stakes', 'high');
  return window.location.pathname + '?' + q.toString();
}

export default function App() {
  const link = useMemo(() => togetherLink(), []);
  const [screen, setScreen] = useState(() => fromUrl(link));
  const [wallet, setWallet] = useState(null);
  const [toast, setToast] = useState(null);
  const escArmed = useRef(0);

  useEffect(() => { openWallet().then((w) => { window.__wallet = w; setWallet(w); }); frameReady(); }, []);
  const go = useCallback((sc) => {
    setScreen(sc);
    if (!link) try { window.history.replaceState(null, '', toUrl(sc)); } catch (e) { /* */ }
    sfx('open');
  }, [link]);
  const say = useCallback((t, ms = 2400) => { setToast({ t, k: Date.now() }); clearTimeout(say.timer); say.timer = setTimeout(() => setToast(null), ms); }, []);

  // Esc in the cabinet: a round in play warns once, then it leaves (the Bridge settles what's on the table)
  useEffect(() => {
    window.__bridgeOwnsEsc = true;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.modal-back')) return;
      if (!inFrame) { if (screen.name !== 'lobby') go(screen.name === 'table' && screen.game === 'runouts' && !link ? { name: 'runouts', stakes: screen.stakes } : { name: 'lobby', stakes: screen.stakes }); return; }
      if (wallet && (wallet.held > 0 || wallet.risk > 0) && Date.now() - escArmed.current > 2600) {
        escArmed.current = Date.now();
        say('Round in play · Esc again to leave — your bets settle');
        return;
      }
      requestClose('royale-esc');
    };
    const onMsg = (e) => { if (e.data && e.data.type === 'bridge-pause') { escArmed.current = Date.now(); say('Esc again to leave — your bets settle'); } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('message', onMsg); };
  }, [wallet, screen, go, link, say]);

  if (!wallet) {
    return (
      <div className="room"><div className="splash"><div className="splash-crown" /><div className="splash-name">ROYALE LINK</div><div className="splash-sub">connecting to the Neon Royale…</div></div></div>
    );
  }
  let body;
  if (screen.name === 'table') {
    const T = TABLES[screen.game];
    const back = link ? null : screen.game === 'runouts' ? () => go({ name: 'runouts', stakes: screen.stakes }) : () => go({ name: 'lobby', stakes: screen.stakes });
    body = (
      <Suspense fallback={<div className="splash"><div className="splash-sub">taking a seat…</div></div>}>
        <T key={screen.game + screen.table + (screen.mode || '')} wallet={wallet} table={screen.table} stakes={screen.stakes} mode={screen.mode}
          link={link} onBack={back} say={say} backLabel={screen.game === 'runouts' ? 'Runouts' : 'Lobby'} />
      </Suspense>
    );
  } else if (screen.name === 'runouts') {
    body = <RunoutsLobby wallet={wallet} stakes={screen.stakes} onBack={() => go({ name: 'lobby', stakes: screen.stakes })} onPick={(mode) => go({ name: 'table', game: 'runouts', mode, table: 'runouts-' + mode, stakes: screen.stakes })} />;
  } else {
    body = <Lobby wallet={wallet} stakes={screen.stakes} onPick={(g) => go(g === 'runouts' ? { name: 'runouts', stakes: screen.stakes } : { name: 'table', game: g, table: g + '-1', stakes: screen.stakes })}
      onStakes={(s) => go({ name: 'lobby', stakes: s })} />;
  }
  return (
    <div className="room">
      {body}
      {toast && <div key={toast.k} className="toast app-toast">{toast.t}</div>}
    </div>
  );
}
