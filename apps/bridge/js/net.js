/**
 * BridgeNet — the wire between players: one Supabase Realtime channel (`bridge-lobby`, no tables needed) that every
 * signed-in pilot joins. Presence says who's online and where (each pilot tracks a small `meta`: name, suit, world,
 * place, what they're doing); broadcast carries everything else as `{ e: event, d: data, from, to }` — to everyone,
 * or to one pilot (`to`). js/multi.js builds playing together on it.
 *
 *   BridgeNet.set({ world, place, act, ... })   your presence (merged; sent at most once a second)
 *   BridgeNet.send(event, data[, toPilotId])    broadcast (or to one pilot)
 *   BridgeNet.on(event, fn(data, fromId))       events from others; also 'peers' (fn(list)), 'join', 'leave', 'up'
 *   BridgeNet.peers() / .peer(id) / .me() / .online()
 *
 * No client (offline, the CDN blocked) or the channel won't join: nothing happens, the game is single-player.
 */
var BridgeNet = (function () {
  var TOPIC = 'bridge-lobby';
  var ch = null, me = null, up = false, meta = {}, sentMeta = '', trackAt = 0, trackTimer = 0, handlers = {}, peers = {};

  function client() { return typeof BridgeDB !== 'undefined' && BridgeDB.client ? BridgeDB.client() : null; }
  function emit(e, a, b) { (handlers[e] || []).forEach(function (f) { try { f(a, b); } catch (err) { console.warn('[net] ' + e + ':', err); } }); }

  function connect(pilot) {
    var c = client();
    if (!pilot || !pilot.id) return;
    if (me && me.id === pilot.id && ch) return;
    if (ch && c && c.removeChannel) { try { c.removeChannel(ch); } catch (e) { /* */ } }
    ch = null; up = false; peers = {}; me = { id: pilot.id, name: pilot.name };
    if (!c || !c.channel) return;
    try {
      ch = c.channel(TOPIC, { config: { broadcast: { self: false }, presence: { key: pilot.id } } });
      ch.on('broadcast', { event: 'm' }, function (msg) {
        var p = msg && msg.payload;
        if (!p || !me || p.from === me.id || (p.to && p.to !== me.id)) return;
        emit(p.e, p.d, p.from);
      });
      ch.on('presence', { event: 'sync' }, sync);
      ch.subscribe(function (status) {
        if (status === 'SUBSCRIBED') { up = true; sentMeta = ''; track(true); emit('up'); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') up = false;
      });
    } catch (e) { console.warn('[net] no realtime:', e); ch = null; }
  }

  function sync() {
    if (!ch || !me) return;
    var st = ch.presenceState() || {}, next = {};
    Object.keys(st).forEach(function (k) {
      if (k === me.id) return;
      var list = st[k] || [];
      var m = list[list.length - 1];
      if (m) next[k] = m;
    });
    Object.keys(next).forEach(function (k) { if (!peers[k]) emit('join', next[k], k); });
    Object.keys(peers).forEach(function (k) { if (!next[k]) emit('leave', peers[k], k); });
    peers = next;
    emit('peers', list());
  }
  function list() { return Object.keys(peers).map(function (k) { return Object.assign({ id: k }, peers[k]); }); }

  // presence: merged, and sent at most once a second (presence is for where you are, not every step)
  function set(m) {
    Object.keys(m || {}).forEach(function (k) { meta[k] = m[k]; });
    track(false);
  }
  function track(now) {
    if (!up || !ch || !me) return;
    var body = Object.assign({ id: me.id, name: me.name }, meta), json = JSON.stringify(body);
    if (json === sentMeta) return;
    var wait = now ? 0 : Math.max(0, 1000 - (Date.now() - trackAt));
    clearTimeout(trackTimer);
    trackTimer = setTimeout(function () {
      var b2 = Object.assign({ id: me.id, name: me.name }, meta), j2 = JSON.stringify(b2);
      if (j2 === sentMeta || !ch) return;
      sentMeta = j2; trackAt = Date.now();
      try { ch.track(b2); } catch (e) { /* */ }
    }, wait);
  }

  function send(e, d, to) {
    if (!up || !ch || !me) return false;
    try { ch.send({ type: 'broadcast', event: 'm', payload: { e: e, d: d, from: me.id, to: to || null } }); } catch (err) { return false; }
    return true;
  }
  function on(e, f) { (handlers[e] = handlers[e] || []).push(f); }

  if (typeof BridgeState !== 'undefined') {
    var set0 = BridgeState.setPilot;
    BridgeState.setPilot = function (data) { set0(data); if (data && data.id) connect(data); };
  }

  return { set: set, send: send, on: on, connect: connect, peers: list, peer: function (id) { return peers[id] ? Object.assign({ id: id }, peers[id]) : null; },
           me: function () { return me; }, online: function () { return up; } };
})();
