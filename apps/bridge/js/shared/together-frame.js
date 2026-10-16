/**
 * BridgeTogetherFrame — the game's side of playing together (js/together.js is the Bridge's side).
 *
 * When two pilots play one of the Bridge's games against (or with) each other, the Bridge opens the game in its
 * cabinet (js/cabinet-modal.js) with `?together=<json>` on the URL: { sid, g (game), mode ('duel', 'team',
 * 'tandem', 'match', 'race'), seed, me, vs (names), host (true for whoever asked), side, wager, target }. This file
 * reads it and carries messages between the game and the Bridge, which relays them to the other pilot's game:
 *
 *   T.cfg                     the session, as above
 *   T.ready()                 loaded and waiting: the run starts on 'start' once both games are ready
 *   T.score(n, done, label)   your score as it goes (sent at most 4 times a second), and your final one (done)
 *   T.result(outcome)         a game that decides itself ('win', 'lose', 'draw' — chess)
 *   T.send(k, d)              anything for the other pilot's copy of the game (moves, positions, letters)
 *   T.on(k, fn)               'start', 'peer' ({ s, done, label }), 'data' ({ k, d }), 'verdict' ({ text, outcome }),
 *                             'gone' (they left)
 *   T.rng(salt)               a seeded random function: the same numbers in both games
 *   T.peer                    their latest { s, done, label }
 *
 * Without `?together` (a normal game) window.BridgeTogetherFrame is null and nothing here runs.
 */
(function (global) {
  var cfg = null;
  try { var q = new URLSearchParams(global.location.search).get('together'); if (q) cfg = JSON.parse(q); } catch (e) { cfg = null; }
  if (!cfg || !cfg.sid) { global.BridgeTogetherFrame = null; return; }
  var inFrame = (function () { try { return global.self !== global.top; } catch (e) { return true; } })();
  var handlers = {}, sentAt = 0, sentS = null, timer = 0, pending = null;

  function post(type, body) {
    if (!inFrame) return;
    try { global.parent.postMessage(Object.assign({ type: 'bridge-together-' + type, sid: cfg.sid }, body || {}), '*'); } catch (e) { /* gone */ }
  }
  function emit(k, d) { (handlers[k] || []).forEach(function (f) { try { f(d); } catch (e) { console.warn('[together] ' + k, e); } }); }

  global.addEventListener('message', function (e) {
    var d = e && e.data;
    if (!d || typeof d.type !== 'string' || d.type.indexOf('bridge-together-') !== 0) return;
    if (d.sid && d.sid !== cfg.sid) return;
    var k = d.type.slice('bridge-together-'.length);
    if (k === 'peer') api.peer = { s: d.s, done: !!d.done, label: d.label };
    emit(k, d);
  });

  // the same numbers on both sides: mulberry32 from the session's seed (and a salt per use)
  function rng(salt) {
    var s = (cfg.seed | 0) ^ hash(String(salt || ''));
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h | 0; }

  function score(n, done, label) {
    if (api.over) return;
    if (done) { clearTimeout(timer); pending = null; api.over = true; post('score', { s: n, done: true, label: label }); return; }
    if (n === sentS && !label) return;
    pending = { s: n, label: label };
    var wait = Math.max(0, 250 - (Date.now() - sentAt));
    if (timer) return;
    timer = setTimeout(function () {
      timer = 0;
      if (!pending || api.over) return;
      sentAt = Date.now(); sentS = pending.s;
      post('score', { s: pending.s, label: pending.label });
      pending = null;
    }, wait);
  }

  var api = global.BridgeTogetherFrame = {
    cfg: cfg, peer: { s: 0, done: false, label: '' }, over: false,
    ready: function () { post('ready'); },
    score: score,
    result: function (outcome) { post('result', { outcome: outcome }); },
    send: function (k, d) { post('data', { k: k, d: d }); },
    on: function (k, f) { (handlers[k] = handlers[k] || []).push(f); },
    rng: rng
  };
})(window);
