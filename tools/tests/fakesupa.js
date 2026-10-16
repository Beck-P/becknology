// A fake supabase-js (createClient) talking to fakesupa.py on :8767 — injected by the tests before the page's scripts.
(function () {
  var BASE = 'http://127.0.0.1:8767';
  function post(path, body) {
    return fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function Query(table) { this.q = { table: table, op: 'select', filters: [] }; }
  Query.prototype.select = function (cols) { if (this.q.op === 'select') this.q.cols = cols; else this.q.returning = cols; return this; };
  Query.prototype.insert = function (row) { this.q.op = 'insert'; this.q.row = row; return this; };
  Query.prototype.upsert = function (row, o) { this.q.op = 'upsert'; this.q.row = row; this.q.onConflict = o && o.onConflict; return this; };
  Query.prototype.update = function (patch) { this.q.op = 'update'; this.q.patch = patch; return this; };
  Query.prototype.delete = function () { this.q.op = 'delete'; return this; };
  Query.prototype.eq = function (c, v) { this.q.filters.push([c, 'eq', v]); return this; };
  Query.prototype.is = function (c, v) { this.q.filters.push([c, 'is', v]); return this; };
  Query.prototype.in = function (c, v) { this.q.filters.push([c, 'in', v]); return this; };
  Query.prototype.order = function (c, o) { this.q.order = [c, !(o && o.ascending === false)]; return this; };
  Query.prototype.limit = function (n) { this.q.limit = n; return this; };
  Query.prototype.maybeSingle = function () { this.q.single = 'maybe'; return this; };
  Query.prototype.single = function () { this.q.single = 'one'; return this; };
  Query.prototype.then = function (a, b) { return post('/db', this.q).then(a, b); };

  var cid = Math.random().toString(36).slice(2), es = null, chans = {};
  function stream() {
    if (es) return;
    es = new EventSource(BASE + '/rt/stream?cid=' + cid);
    es.onmessage = function (e) {
      var m = JSON.parse(e.data), ch = chans[m.channel];
      if (!ch || ch._dead || (m.mid && m.mid !== ch.mid)) return;
      if (m.type === 'broadcast') ch._fire('broadcast', m.event, { type: 'broadcast', event: m.event, payload: m.payload });
      if (m.type === 'presence') {
        ch._state = m.state;
        Object.keys(m.joins || {}).forEach(function (k) { ch._fire('presence', 'join', { key: k, newPresences: m.joins[k] }); });
        Object.keys(m.leaves || {}).forEach(function (k) { ch._fire('presence', 'leave', { key: k, leftPresences: m.leaves[k] }); });
        ch._fire('presence', 'sync', {});
      }
    };
  }
  var seq = 0, faults = { failTracks: 0 };
  function Channel(name, opts) {
    this.mid = cid + '/' + (++seq); this.state = 'closed';
    this.name = name; this.key = opts && opts.config && opts.config.presence && opts.config.presence.key; this._h = []; this._state = {};
    this.self = !!(opts && opts.config && opts.config.broadcast && opts.config.broadcast.self);
  }
  Channel.prototype.on = function (type, filter, cb) { this._h.push({ type: type, ev: filter && filter.event, cb: cb }); return this; };
  Channel.prototype._fire = function (type, ev, arg) { this._h.forEach(function (h) { if (h.type === type && (!h.ev || h.ev === ev || h.ev === '*')) h.cb(arg); }); };
  Channel.prototype.subscribe = function (cb) {
    var self = this; chans[this.name] = this; stream();
    self.state = 'joining';
    var go = function () { post('/rt/join', { cid: self.mid, channel: self.name, key: self.key }).then(function () { self.state = 'joined'; if (cb) cb('SUBSCRIBED'); }); };
    if (es.readyState === 1) go(); else es.addEventListener('open', go, { once: true });
    return this;
  };
  Channel.prototype.track = function (meta) {
    if (this._dead) return Promise.resolve('timed out');
    if (faults.failTracks > 0) { faults.failTracks--; return new Promise(function (r) { setTimeout(function () { r('timed out'); }, 300); }); }
    return post('/rt/track', { cid: this.mid, channel: this.name, key: this.key, meta: meta }).then(function () { return 'ok'; });
  };
  Channel.prototype.untrack = function () { return post('/rt/untrack', { cid: this.mid, channel: this.name }).then(function () { return 'ok'; }); };
  Channel.prototype.send = function (m) { if (this._dead) return Promise.resolve('timed out'); return post('/rt/send', { cid: this.mid, channel: this.name, event: m.event, payload: m.payload, self: this.self }).then(function () { return 'ok'; }); };
  Channel.prototype.presenceState = function () { return this._state; };
  Channel.prototype.unsubscribe = function () { if (chans[this.name] === this) delete chans[this.name]; this.state = 'closed'; return post('/rt/leave', { cid: this.mid, channel: this.name }); };

  var client = {
    from: function (t) { return new Query(t); },
    rpc: function (fn, args) { return post('/rpc', { fn: fn, args: args }); },
    channel: function (name, opts) { return new Channel(name, opts); },
    removeChannel: function (ch) { return ch.unsubscribe(); },
    getChannels: function () { return Object.keys(chans).map(function (k) { return chans[k]; }); }
  };
  window.supabase = { createClient: function () { return client; } };
  window.__fakeSupa = { cid: cid, post: post, faults: faults,
    // the server forgets your presence while the channel stays up
    dropPresence: function () { var ch = chans['bridge-lobby']; return ch && post('/rt/untrack', { cid: ch.mid, channel: ch.name }); },
    // the socket dies under the channel: nothing in or out, and the server times you out
    breakChannel: function () { var ch = chans['bridge-lobby']; if (!ch) return; ch._dead = true; ch.state = 'errored'; post('/rt/leave', { cid: ch.mid, channel: ch.name }); } };
})();
