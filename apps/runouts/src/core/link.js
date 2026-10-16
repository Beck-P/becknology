// Two pilots at one table. In the Bridge, *Play a game…* with someone opens Royale Link in both cabinets with
// `?together=` (js/together.js there; /bridge/js/shared/together-frame.js here carries the messages): whoever
// asked runs the table (the host: the dealer's shoe, the wheel, the regulars, the clock) and the other sends their
// moves and is sent the table as it changes. Each pilot's chips are their own: they stake and are paid by their own
// Bridge. If one leaves, the other carries on alone (taking the table over if it was the host who went).
const cap = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());

/** The together session from the Bridge, or null. game: the Royale game id ('blackjack', …). */
export function togetherLink() {
  const T = typeof window !== 'undefined' ? window.BridgeTogetherFrame : null;
  if (!T || !T.cfg) return null;
  const cfg = T.cfg;
  const game = String(cfg.g || '').replace(/^royale-/, '');
  const host = !!cfg.host;
  const goneFns = [];
  let gone = false;
  const fireGone = () => { if (gone) return; gone = true; goneFns.forEach((f) => { try { f(); } catch (e) { /* */ } }); };
  T.on('gone', fireGone);
  T.on('peer', (p) => { if (p && p.done) fireGone(); });
  return {
    kind: 'together', host, game, mode: cfg.mode || 'house', opts: cfg.opts || {},
    me: { id: host ? 'p-host' : 'p-guest', name: cap(cfg.me || 'You') },
    peer: { id: host ? 'p-guest' : 'p-host', name: cap(cfg.vs || 'Them') },
    send: (k, d) => T.send(k, d),
    on: (k, fn) => T.on('data', (m) => { if (m && m.k === k) fn(m.d); }),
    onGone: (fn) => goneFns.push(fn),
    isGone: () => gone,
    ready: () => T.ready(),
    score: (n, label) => T.score(Math.round(n), false, label),
  };
}
