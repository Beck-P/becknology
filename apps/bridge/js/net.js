/**
 * BridgeNet — the wire between players: one Supabase Realtime channel (`bridge-lobby`, no tables needed) that every
 * signed-in pilot joins. Presence says who's online and where (each pilot tracks a small `meta`: name, suit, world,
 * place, what they're doing); broadcast carries everything else as `{ e: event, d: data, from, to }` — to everyone,
 * or to one pilot (`to`). js/multi.js builds playing together on it.
 *
 *   BridgeNet.set({ world, place, act, ... })   your presence (merged; sent at most once a second)
 *   BridgeNet.send(event, data[, toPilotId])    broadcast (or to one pilot)
 *   BridgeNet.on(event, fn(data, fromId))       events from others; also 'peers' (fn(list)), 'join', 'leave', 'up'
 *   BridgeNet.peers() / .peer(id) / .me() / .online() / .debug()
 *
 * Presence alone proved flaky (Beck and Alyssa saw each other go "offline" or show in the wrong place, then vanish):
 * a track that timed out was never retried, a dropped channel was never rebuilt, and two open tabs of one pilot
 * fought over where they were. So: every meta carries `t` (when it changed) and `away` (the tab is hidden), and the
 * freshest wins — from presence, or from the heartbeat `_hb` every pilot broadcasts every few seconds; anyone heard
 * from in the last 20 s counts as online even if presence lost them; a track that fails is sent again; presence is
 * re-sent every 25 s regardless; and a channel that isn't joined (or a tab back from a long sleep) is rebuilt.
 *
 * No client (offline, the CDN blocked) or the channel won't join: nothing happens, the game is single-player.
 */
var BridgeNet = (function () {
  var TOPIC = 'bridge-lobby', GRACE = 20000, HB = 8000, RETRACK = 25000;
  var ch = null, me = null, up = false, meta = {}, metaT = 0, sentMeta = '', trackAt = 0, trackTimer = 0, handlers = {};
  var pres = {}, heard = {}, peers = {}, builtAt = 0, hiddenAt = 0, hbAt = 0;
  var TAB = Math.random().toString(36).slice(2, 8);         // this page: one pilot may have two open
  // a budget: Supabase counts every message against the project, and a burst over its limit drops messages or the
  // channel itself (you'd vanish for the other player until it's rebuilt). Frequent state (positions, a fight's or a
  // game's running state) waits its turn when we're over ~12 a second and only the latest of each goes; everything
  // else (a hit, a trade, a final score) always goes.
  var LOW = { pos: 1, sea: 1, helm: 1, fs: 1, sf: 1, 'g-score': 1 }, BUDGET = 12, sends = [], later = {}, laterT = 0;
  var stats = { sent: 0, deferred: 0, rebuilds: 0, status: [], system: [] };
  // which of two metas says where someone really is: the tab in front, then the newest
  function better(a, b) { if (!b) return true; if (!!a.away !== !!b.away) return !a.away; return (a.t || 0) >= (b.t || 0); }

  function client() { return typeof BridgeDB !== 'undefined' && BridgeDB.client ? BridgeDB.client() : null; }
  function emit(e, a, b) { (handlers[e] || []).forEach(function (f) { try { f(a, b); } catch (err) { console.warn('[net] ' + e + ':', err); } }); }

  function connect(pilot) {
    if (!pilot || !pilot.id) return;
    if (me && me.id === pilot.id && ch) return;
    me = { id: pilot.id, name: pilot.name };
    pres = {}; heard = {}; peers = {};
    build();
  }
  function build() {
    var c = client();
    if (ch && c && c.removeChannel) { try { c.removeChannel(ch); } catch (e) { /* */ } }
    if (ch) stats.rebuilds++;
    ch = null; up = false; builtAt = Date.now();
    if (!c || !c.channel || !me) return;
    try {
      var mine = ch = c.channel(TOPIC, { config: { broadcast: { self: false }, presence: { key: me.id } } });
      ch.on('broadcast', { event: 'm' }, function (msg) {
        var p = msg && msg.payload;
        if (!p || !me || p.from === me.id || (p.to && p.to !== me.id)) return;
        var h = heard[p.from] || (heard[p.from] = { at: 0, tabs: {} });
        h.at = Date.now();
        if (p.e === '_hb') { if (p.d) h.tabs[p.d.tab || '_'] = { meta: p.d, at: h.at }; merge(); return; }
        if (!peers[p.from]) merge();
        emit(p.e, p.d, p.from);
      });
      ch.on('presence', { event: 'sync' }, function () { if (ch === mine) sync(); });
      try { ch.on('system', {}, function (m) { stats.system.push([Date.now(), m && (m.message || m.status || JSON.stringify(m).slice(0, 120))]); if (stats.system.length > 10) stats.system.shift(); }); } catch (e) { /* */ }
      ch.subscribe(function (status, err) {
        stats.status.push([Date.now(), status + (err ? ' ' + (err.message || err) : '')]); if (stats.status.length > 10) stats.status.shift();
        if (status !== 'SUBSCRIBED') console.warn('[net] channel', status, err || '');
        if (ch !== mine) return;
        if (status === 'SUBSCRIBED') { up = true; sentMeta = ''; track(true); beat(); emit('up'); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') up = false;
      });
    } catch (e) { console.warn('[net] no realtime:', e); ch = null; }
  }

  // presence: per pilot the freshest meta — two tabs of one pilot both track under its key; the one in front wins
  function sync() {
    if (!ch || !me) return;
    var st = ch.presenceState() || {}, next = {};
    Object.keys(st).forEach(function (k) {
      if (k === me.id) return;
      var best = null;
      (st[k] || []).forEach(function (m) { if (better(m, best)) best = m; });
      if (best) next[k] = best;
    });
    pres = next;
    merge();
  }
  // who's online: in presence, or heard from lately; where they are: whichever says so most recently
  function merge() {
    var now = Date.now(), next = {};
    Object.keys(pres).forEach(function (k) { next[k] = pres[k]; });
    Object.keys(heard).forEach(function (k) {
      var h = heard[k];
      if (now - h.at > GRACE) return;
      Object.keys(h.tabs).forEach(function (tb) {
        var e = h.tabs[tb];
        if (now - e.at > GRACE) { delete h.tabs[tb]; return; }
        if (!next[k] || better(e.meta, next[k])) next[k] = e.meta;
      });
      if (!next[k]) next[k] = { id: k, name: (peers[k] && peers[k].name) || 'Someone' };
    });
    var joined = Object.keys(next).filter(function (k) { return !peers[k]; }), left = Object.keys(peers).filter(function (k) { return !next[k]; });
    var was = peers;
    peers = next;
    joined.forEach(function (k) { emit('join', next[k], k); });
    left.forEach(function (k) { emit('leave', was[k], k); });
    emit('peers', list());
  }
  function list() { return Object.keys(peers).map(function (k) { return Object.assign({}, peers[k], { id: k }); }); }

  // presence: merged, and sent at most once a second (presence is for where you are, not every step)
  function set(m) {
    var changed = false;
    Object.keys(m || {}).forEach(function (k) { if (JSON.stringify(meta[k]) !== JSON.stringify(m[k])) changed = true; meta[k] = m[k]; });
    if (changed) metaT = Date.now();
    track(false);
  }
  function body() { return Object.assign({ id: me.id, name: me.name }, meta, { away: !!document.hidden, t: metaT, tab: TAB }); }
  function track(now) {
    if (!up || !ch || !me) return;
    var json = JSON.stringify(body());
    if (json === sentMeta) return;
    var wait = now ? 0 : Math.max(0, 1000 - (Date.now() - trackAt));
    clearTimeout(trackTimer);
    trackTimer = setTimeout(function () {
      if (!ch || !up) return;
      var b2 = body(), j2 = JSON.stringify(b2), mine = ch;
      if (j2 === sentMeta) return;
      sentMeta = j2; trackAt = Date.now();
      var again = function () { if (ch === mine && sentMeta === j2) { sentMeta = ''; setTimeout(function () { track(true); }, 2500); } };
      try {
        var r = ch.track(b2);
        if (r && r.then) r.then(function (res) { if (res && res !== 'ok') again(); }, again);
      } catch (e) { again(); }
    }, wait);
  }
  // the heartbeat: your meta to everyone, every few seconds (and whenever presence can't be trusted to have it)
  function beat() {
    if (!up || !ch || !me) return;
    hbAt = Date.now();
    send('_hb', body());
  }

  function send(e, d, to) {
    if (!up || !ch || !me) return false;
    var now = Date.now();
    while (sends.length && now - sends[0] > 1000) sends.shift();
    if (LOW[e] && !(d && d.done) && sends.length >= BUDGET) {          // over budget: keep the latest, send it shortly
      later[e + '|' + (to || '')] = [e, d, to]; stats.deferred++;
      if (!laterT) laterT = setTimeout(flush, 150);
      return true;
    }
    delete later[e + '|' + (to || '')];
    sends.push(now); stats.sent++;
    try {
      var r = ch.send({ type: 'broadcast', event: 'm', payload: { e: e, d: d, from: me.id, to: to || null } });
      if (r && r.then) r.then(null, function () { /* the watchdog sees to a dead channel */ });
    } catch (err) { return false; }
    return true;
  }
  function flush() {
    laterT = 0;
    var k = Object.keys(later);
    if (!k.length) return;
    var now = Date.now();
    while (sends.length && now - sends[0] > 1000) sends.shift();
    k.slice(0, Math.max(1, BUDGET - sends.length)).forEach(function (key) {
      var m = later[key]; delete later[key];
      sends.push(Date.now()); stats.sent++;
      try { ch && ch.send({ type: 'broadcast', event: 'm', payload: { e: m[0], d: m[1], from: me.id, to: m[2] || null } }); } catch (err) { /* */ }
    });
    if (Object.keys(later).length) laterT = setTimeout(flush, 150);
  }
  function on(e, f) { (handlers[e] = handlers[e] || []).push(f); }

  // ---- keeping it alive ----------------------------------------------------------------------------------------------
  setInterval(function () {
    if (!me) return;
    var now = Date.now();
    if (!ch) { if (client() && now - builtAt > 5000) build(); return; }
    var state = ch.state;                          // supabase-js: 'joined' | 'joining' | 'errored' | 'closed' | 'leaving'
    if ((state && state !== 'joined' && now - builtAt > 12000) || (!up && now - builtAt > 15000)) { build(); return; }
    if (now - hbAt > HB) beat();
    if (now - trackAt > RETRACK) { sentMeta = ''; track(true); }
    merge();                                       // anyone not heard from in a while has gone
  }, 2000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { hiddenAt = Date.now(); track(true); return; }
    if (!me) return;
    // back from a long sleep (a phone in a pocket): the socket's likely dead and doesn't know it yet — start fresh
    if (hiddenAt && Date.now() - hiddenAt > 15000) build();
    else { sentMeta = ''; track(true); beat(); }
    hiddenAt = 0;
  });

  if (typeof BridgeState !== 'undefined') {
    var set0 = BridgeState.setPilot;
    BridgeState.setPilot = function (data) { set0(data); if (data && data.id) connect(data); };
  }

  return { set: set, send: send, on: on, connect: connect, peers: list, peer: function (id) { return peers[id] ? Object.assign({}, peers[id], { id: id }) : null; },
           me: function () { return me; }, online: function () { return up; },
           debug: function () { return { up: up, state: ch && ch.state, stats: stats, presence: Object.keys(pres), heard: Object.keys(heard).map(function (k) { return k + ' ' + Math.round((Date.now() - heard[k].at) / 1000) + 's ' + Object.keys(heard[k].tabs).length + ' tab(s)'; }), peers: list() }; } };
})();
