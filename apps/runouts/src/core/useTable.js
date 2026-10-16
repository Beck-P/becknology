// Running a table: the host applies moves and the house's clock to the engine's state and shows (and sends) each
// seat its view; a guest shows what it's sent and sends its moves. It also squares the chips: a settled round is
// paid once (by key), and what the table owes you if you walk away is kept up to date with the wallet (and so the
// Bridge). Engines: { act, tick, view, ifClosed, adopt } (games/*.js).
import { useCallback, useEffect, useRef, useState } from 'react';
import { secureRandom } from './rng.js';
import { runState } from './wallet.js';

const SEND_GAP = 110;

export function useTable({ engine, create, link, me, wallet, game, settled, holdFn, onChange, who }) {
  const [view, setView] = useState(null);
  const [peerPend, setPeerPend] = useState({});
  const R = useRef(null);
  // who: how this pilot sits down at the host's table (a poker buy-in, a craps spot) — in the very first hello
  if (!R.current) R.current = { host: !link || link.host, state: null, view: null, skew: 0, timer: 0, sendAt: 0, sendTimer: 0, heard: false, session: Math.random().toString(36).slice(2, 8), who: who || null };
  const env = () => ({ now: Date.now(), rng: secureRandom });

  const show = useCallback((v) => { R.current.view = v; setView(v); if (onChange) onChange(v); }, [onChange]);

  const sendNow = useCallback(() => {
    const r = R.current;
    r.sendTimer = 0; r.sendAt = Date.now();
    if (!link || !r.state || link.isGone()) return;
    link.send('st', { v: engine.view(r.state, link.peer.id), clock: Date.now() });
  }, [engine, link]);

  const publish = useCallback(() => {
    const r = R.current;
    if (!r.state) return;
    show(engine.view(r.state, me.id));
    if (link && !r.sendTimer) {
      const wait = Math.max(0, SEND_GAP - (Date.now() - r.sendAt));
      r.sendTimer = setTimeout(sendNow, wait);
    }
    clearTimeout(r.timer);
    const w = r.state.wait;
    if (w != null) {
      r.timer = setTimeout(function step() {
        const n = engine.tick(r.state, env());
        if (n) { r.state = n; publish(); }
        else if (r.state.wait != null) r.timer = setTimeout(step, Math.max(16, r.state.wait - Date.now()));
      }, Math.max(0, w - Date.now()));
    }
  }, [engine, link, me.id, sendNow, show]);

  const apply = useCallback((a) => {
    const r = R.current;
    if (!r.host) { if (link) link.send('act', { ...a, seat: me.id }); return true; }
    const n = engine.act(r.state, { seat: me.id, ...a }, env());
    if (!n) return false;
    r.state = n; publish();
    return true;
  }, [engine, link, me.id, publish]);

  // start: the host builds the table; a guest says hello until the table arrives
  useEffect(() => {
    const r = R.current;
    let hiTimer = 0;
    if (r.host) { r.state = create(env()); publish(); }
    if (link) {
      link.on('pend', (d) => setPeerPend(d && d.bets ? d.bets : {}));
      if (r.host) {
        link.on('hi', (d) => {
          if (!r.host || !d || !d.who) return;
          // the guest says hello until it hears the table: sit them down once (a poker buy-in counted once)
          r.joined = r.joined || {};
          if (d.j && r.joined[d.j]) { sendNow(); return; }
          if (d.j) r.joined[d.j] = 1;
          const n = engine.act(r.state, { t: 'join', who: { ...d.who, id: link.peer.id, kind: 'pilot' } }, env());
          if (n) { r.state = n; }
          publish(); sendNow();
        });
        link.on('act', (a) => {
          if (!r.host || !a) return;
          const n = engine.act(r.state, { ...a, seat: link.peer.id }, env());
          if (n) { r.state = n; publish(); } else sendNow();
        });
      } else {
        link.on('st', (d) => {
          if (r.host || !d || !d.v) return;
          r.heard = r.heard || (d.v.seats || []).some((x) => x.id === me.id);   // hello until the table has you in it
          r.skew = Date.now() - (d.clock || Date.now());
          show(d.v);
        });
        const hi = () => { if (!r.heard && !r.host) { link.send('hi', { who: r.who || { name: me.name }, j: r.session }); hiTimer = setTimeout(hi, 1600); } };
        hi();
      }
      link.onGone(() => {
        if (r.host) {
          const n = r.state && engine.act(r.state, { t: 'leave', seat: link.peer.id }, env());
          if (n) { r.state = n; publish(); }
        } else if (r.view) {
          // the host went: this table carries on here
          r.host = true;
          r.state = engine.adopt(r.view, env());
          const n = engine.act(r.state, { t: 'leave', seat: link.peer.id }, env());
          if (n) r.state = n;
          publish();
        }
      });
      link.ready();
    }
    return () => {
      clearTimeout(r.timer); clearTimeout(r.sendTimer); clearTimeout(hiTimer);
      // leaving the table with chips still on it (back to the lobby): it settles like walking away from it
      if (wallet && wallet.held > 0) wallet.pay(wallet.held, game, game + ':' + r.session + ':leave', 0);
      if (link && !link.isGone()) { if (r.host) link.send('st', { v: null }); else link.send('act', { t: 'leave', seat: me.id }); }
      runState(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // squaring up: pay a settled round once, keep the hold current, tell the cabinet when a round's in play
  useEffect(() => {
    if (!view || !wallet) return;
    const seat = view.seats && view.seats.find((x) => x.id === me.id);
    const res = seat && seat.result;
    const key = res ? game + ':' + R.current.session + ':' + res.round : null;
    const isSettled = settled && res && res.round === view.round && settled.includes(view.phase);
    let hold = holdFn ? holdFn(view) : ((view.ifc && view.ifc[me.id]) || 0);
    if (isSettled && !holdFn) hold = Math.max(0, hold - res.pay);
    if (isSettled && !wallet.paid.has(key)) wallet.pay(res.pay, game, key, hold);
    else wallet.hold(hold, game);
    const live = hold > 0 || wallet.risk > 0;
    runState(live, live ? 'Round in play · Esc again to leave (it settles)' : '');
    if (link) {                                  // (on after they've gone: your final score is what the Bridge settles on)
      // how you stand: what's come back less what's gone in, plus what's on the table — but a round in play counts as
      // it stood before it (the hold then is the table's own look ahead, not something to show anyone); poker's hold is
      // just your stack
      const w = wallet, net = holdFn ? w.session.back - w.session.staked + w.held
        : w.risk > 0 ? w.session.back - (w.session.staked - w.risk) : w.session.back - w.session.staked + w.held;
      link.score(net, net > 0 ? 'UP ' + Math.round(net) : net < 0 ? 'DOWN ' + Math.round(-net) : 'EVEN');
    }
  }, [view, wallet, me.id, game, settled, holdFn, link]);

  // for tests and the curious: the table as this screen sees it
  if (typeof window !== 'undefined') window.__table = { view: () => R.current.view, state: () => R.current.state, host: () => R.current.host, game };
  const now = useCallback(() => Date.now() - R.current.skew, []);
  const setWho = useCallback((who) => { R.current.who = who; }, []);
  const sendPending = useCallback((bets) => { if (link && !link.isGone()) link.send('pend', { bets }); }, [link]);
  return { view, act: apply, now, peerPend, sendPending, setWho, isHost: () => R.current.host, state: () => R.current.state };
}
