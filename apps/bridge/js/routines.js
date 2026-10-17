/**
 * BridgeRoutines — the cast keep a day, by their planet's clock (assets/routines.json).
 *
 * Beck: daily routines for the cast. A person's day is a timetable: each stop starts at one of the day's anchors
 * (js/hours.js: midnight · small · dawn · sunrise · morning · noon · afternoon · sunset · evening · late), which move
 * with the seasons the way shop hours do, so a shopkeeper's "at work" is the same anchors as their shop's hours:
 *
 *   "bridget": [["dawn", "home"], ["afternoon", { "x": 14, "y": 12, "facing": "left" }], ["late", "away", { "via": [38, 17] }]]
 *
 *   home    their own spot, where the world JSON stands them
 *   away    out of sight (abed, at sea); via [x, y]: the door they go in by, in their own place
 *   { world?, x, y, facing?, pose? }    somewhere else (world: their own if not given)
 *
 * Where someone is comes from the clock alone, so everyone playing sees them in the same place. A few minutes after
 * a stop's anchor (a different few for each person) they set off from the last stop and walk to the new one at a
 * steady pace, round what's solid — through a door when it's in another place (the door to there, else the way
 * out), then gone. To their own spot they set off a few minutes before its anchor instead, so a shopkeeper is in
 * before the shop opens. Stand beside someone walking and they stop and turn to you, and walk on when you go.
 *
 * In the place you're in, their actor and their talk point go with them, and the tile they stand on is solid
 * (walking, it isn't). Standing, they're one of the world's actors (world.scene.actors, drawn by js/scene.js);
 * walking, this module draws them, a step at a time, the way js/scene.js draws the walkers. Away from their own place
 * they can still be talked to: people.js finds them by the place they're visiting, and a quest's clues still count
 * (quests.js reads the talk point's `home`).
 *
 * BridgeRoutines.decorate(worldId, data)  as a world loads (js/world.js): the people who keep a day there.
 * BridgeRoutines.where(id)               → { world, x, y, home } | null: where someone is, or is headed (null: away).
 * BridgeRoutines.adjust(worldId, data)   a place's JSON as it stands now, for the Map tab (no walking: where they're headed).
 */
var BridgeRoutines = (function () {
  var R = null;
  var SPEED = 1.1;                     // tiles a second, as the villagers stroll
  var STAGGER = 0.03;                  // of a day: how late after its anchor someone sets off, at most
  fetch('/bridge/assets/routines.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { R = d; }).catch(function () { R = {}; });

  var W = null;                        // the place you're in: { id, data, people: [...], base (collisions without people) }

  function cast() { return typeof BridgePeople !== 'undefined' && BridgePeople.all ? BridgePeople.all() : null; }
  function hashFrac(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
  function homeOf(p) { return p && p.at && p.at[0]; }

  // ---- the day: which stop, since when ------------------------------------------------------------------------------
  /** { cur, prev, since (ms into the stop), len } for someone, or null (no clock there, or no day kept). */
  function stopNow(id) {
    var day = R && R[id], p = cast() && cast()[id], home = homeOf(p);
    if (!day || !day.length || !home || typeof BridgeClock === 'undefined' || typeof BridgeHours === 'undefined') return null;
    var planet = BridgeClock.planet(home.world), T = BridgeClock.time(planet);
    if (!T) return null;
    // off to their own spot a little before its anchor, anywhere else a little after: a shopkeeper is in before the
    // shop opens and doesn't leave till it's shut
    var A = BridgeHours.anchors(planet), H = 3600000, lag = hashFrac(id) * STAGGER * T.len;
    var starts = day.map(function (e) { return (typeof e[0] === 'number' ? e[0] * A.len : A[e[0]]) * H + (e[1] === 'home' ? -lag : lag); });
    for (var j = 1; j < starts.length; j++) starts[j] = Math.max(starts[j], starts[j - 1] + 1);
    var i = -1;
    for (var k = 0; k < day.length; k++) if (starts[k] <= T.t) i = k;
    var since;
    if (i < 0) { i = day.length - 1; since = T.t + T.len - starts[i]; }       // still last night's stop
    else since = T.t - starts[i];
    return { cur: day[i], prev: day[(i - 1 + day.length) % day.length], since: since, len: T.len, index: i };
  }

  // a stop's place: { world, x, y, facing, pose } or null (away); `spot` is their own spot (in their own place)
  function placeOf(e, p, spot) {
    var where = e[1], home = homeOf(p);
    if (where === 'away') return null;
    if (where === 'home' || where == null) return spot ? { world: home.world, x: spot.x, y: spot.y, facing: spot.facing, pose: spot.pose } : { world: home.world };
    return { world: where.world || home.world, x: where.x, y: where.y, facing: where.facing || 'down', pose: where.pose };
  }

  // ---- paths --------------------------------------------------------------------------------------------------------
  var paths = {};
  function path(base, w, h, a, b, key) {
    if (paths[key] !== undefined) return paths[key];
    var start = a[1] * w + a[0], goal = b[1] * w + b[0], prev = new Int32Array(w * h).fill(-1), q = [start];
    prev[start] = start;
    for (var qi = 0; qi < q.length && prev[goal] < 0; qi++) {
      var c = q[qi], x = c % w, y = (c - x) / w;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1], n = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || prev[n] >= 0) return;
        if (n !== goal && base[ny] && base[ny][nx] === 1) return;        // a door or a counter can be the end of the walk
        prev[n] = c; q.push(n);
      });
    }
    if (prev[goal] < 0) return (paths[key] = null);
    var out = [];
    for (var at = goal; at !== start; at = prev[at]) out.push([at % w, (at - at % w) / w]);
    out.push(a);
    return (paths[key] = out.reverse());
  }
  // where along a path, s tiles in: { x, y, facing, done }
  function along(P, s) {
    if (s >= P.length - 1) return { x: P[P.length - 1][0], y: P[P.length - 1][1], done: true };
    var i = Math.floor(s), f = s - i, a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    return { x: a[0] + dx * f, y: a[1] + dy * f, facing: dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up', done: false };
  }

  // ---- doors --------------------------------------------------------------------------------------------------------
  // the way between this place and `other` (a world id, or null: out of sight): its door to there, a given one, else the way out
  function doorTo(data, other, given, from) {
    var I = data.interactions || [], best = null, bd = Infinity;
    if (other) for (var i = 0; i < I.length; i++) {
      if ((I[i].type === 'enter_world' && I[i].target === other) || (I[i].type === 'leave_world' && I[i].leaveTo === other)) return [I[i].x, I[i].y];
    }
    if (given) return given;
    ['leave_world', 'enter_world'].some(function (t) {
      I.forEach(function (it) {
        if (it.type !== t) return;
        var d = from ? Math.abs(it.x - from[0]) + Math.abs(it.y - from[1]) : 0;
        if (d < bd) { bd = d; best = [it.x, it.y]; }
      });
      return !!best;
    });
    return best;
  }

  // ---- someone in the place you're in -------------------------------------------------------------------------------
  /** Where someone is in this place now: { x, y, facing, pose, walk (tiles walked, while walking) } or null. */
  function stateIn(m, now) {
    var S = stopNow(m.id);
    if (!S) return m.spot && m.homeHere ? { x: m.spot.x, y: m.spot.y, facing: m.spot.facing, pose: m.spot.pose } : null;
    var cur = placeOf(S.cur, m.p, m.spot), prev = placeOf(S.prev, m.p, m.spot), wid = W.id;
    var curHere = cur && cur.world === wid && cur.x != null, prevHere = prev && prev.world === wid && prev.x != null;
    if (!curHere && !prevHere) return null;
    // the walk: from the last stop (or the door they come in by) to this one (or the door they leave by)
    var homeHere = homeOf(m.p).world === wid;
    var a = prevHere ? [prev.x, prev.y] : doorTo(W.data, prev && prev.world, homeHere && S.prev[2] && S.prev[2].via, curHere ? [cur.x, cur.y] : null);
    var b = curHere ? [cur.x, cur.y] : doorTo(W.data, cur && cur.world, homeHere && S.cur[2] && S.cur[2].via, a);
    var stand = curHere ? { x: cur.x, y: cur.y, facing: cur.facing, pose: cur.pose } : null;
    if (!a || !b || (a[0] === b[0] && a[1] === b[1])) return stand;
    var P = path(W.base, W.data.width, W.data.height, a, b, wid + ':' + a + '>' + b);
    if (!P) return stand;                                           // no way through: they're simply there
    // stopped to talk: the walk waits while you're beside them
    var key = S.index;
    if (m.stopKey !== key) { m.stopKey = key; m.held = 0; m.holdAt = null; }
    var s = Math.max(0, ((m.holdAt != null ? m.holdAt : S.since) - m.held) / 1000 * SPEED);
    var pos = along(P, s);
    if (pos.done) return stand;
    if (typeof BridgeCharacter !== 'undefined' && BridgeCharacter.getX) {
      var dx = BridgeCharacter.getX() - pos.x, dy = BridgeCharacter.getY() - pos.y, near = Math.abs(dx) < 1.6 && Math.abs(dy) < 1.6;
      if (near && m.holdAt == null) m.holdAt = S.since;
      else if (!near && m.holdAt != null) { m.held += S.since - m.holdAt; m.holdAt = null; }
      if (m.holdAt != null) return { x: pos.x, y: pos.y, facing: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') };
    }
    return { x: pos.x, y: pos.y, facing: pos.facing, walk: s };
  }

  function show(m, st) {
    var data = W.data, A = data.scene.actors, I = data.interactions;
    m.st = st;
    if (!m.actor) m.actor = { sheet: m.p.sheet };
    var ai = A.indexOf(m.actor), standing = st && st.walk == null;
    if (standing && ai < 0) A.push(m.actor);                      // standing: the world draws them
    if (!standing && ai >= 0) A.splice(ai, 1);                    // walking (drawn below) or gone
    if (!st) {
      if (m.inter) { var ii = I.indexOf(m.inter); if (ii >= 0) I.splice(ii, 1); }
      solid(m, null);
      return;
    }
    m.actor.x = st.x; m.actor.y = st.y; m.actor.facing = st.facing || 'down';
    m.actor.pose = standing ? st.pose : undefined;
    if (!m.inter) m.inter = visitor(m);
    if (I.indexOf(m.inter) < 0) I.push(m.inter);
    m.inter.x = Math.round(st.x) + (m.dx || 0); m.inter.y = Math.round(st.y) + (m.dy || 0);
    solid(m, st.walk == null && st.pose !== 'sit' && Math.round(st.x) === st.x && Math.round(st.y) === st.y ? [st.x, st.y] : null);
  }
  // the tile someone stands on is solid while they stand there (and given back as it was when they move)
  function solid(m, at) {
    var C = W.data.collisions;
    if (m.solidAt && (!at || at[0] !== m.solidAt[0] || at[1] !== m.solidAt[1])) {
      C[m.solidAt[1]][m.solidAt[0]] = m.solidWas;
      m.solidAt = null;
    }
    if (at && !m.solidAt && C[at[1]]) { m.solidWas = C[at[1]][at[0]]; C[at[1]][at[0]] = 1; m.solidAt = at; }
  }
  // a talk point for someone away from home: people.js knows them here too, and quests.js by `home`
  function visitor(m) {
    var home = homeOf(m.p);
    var at = m.p.at.filter(function (a) { return a.world === W.id && a.label === home.label; })[0];
    if (!at) m.p.at.push({ world: W.id, label: home.label, visiting: true });
    return { x: 0, y: 0, type: 'dialog', label: home.label, prompt: 'PRESS E TO TALK', dialog: '', home: { world: home.world, label: home.label } };
  }

  // ---- taking over a place's people as it loads ---------------------------------------------------------------------
  function decorate(worldId, data) {
    W = { id: worldId, data: data, people: null };
    if (data.scene) data.scene.actors = data.scene.actors || [];
    data.interactions = data.interactions || [];
  }
  function takeOver() {
    var data = W.data, C = cast();
    W.people = [];
    if (!C || !R || !data.scene || !data.collisions) return;
    W.base = data.collisions.map(function (row) { return row.slice(); });
    Object.keys(R).forEach(function (id) {
      if (id.charAt(0) === '_') return;
      var p = C[id], home = homeOf(p);
      if (!p || !home) return;
      var visits = R[id].some(function (e) { return e[1] && e[1].world === W.id; });
      if (home.world !== W.id && !visits) return;
      var m = { id: id, p: p, homeHere: home.world === W.id };
      if (m.homeHere) {
        var it = data.interactions.filter(function (i) { return i.label === home.label; })[0];
        var best = null, bd = Infinity;
        data.scene.actors.forEach(function (a) {
          if (a.sheet !== p.sheet) return;
          var d = it ? Math.abs(a.x - it.x) + Math.abs(a.y - it.y) : 0;
          if (d < bd) { bd = d; best = a; }
        });
        if (!best || !it) return;                                    // not stood anywhere here: leave them be
        m.actor = best; m.inter = it; m.dx = it.x - best.x; m.dy = it.y - best.y;
        m.spot = { x: best.x, y: best.y, facing: best.facing, pose: best.pose };
        // their own tile is solid because they stand there: open it for the walks, and while they're not there
        if (best.pose !== 'sit' && data.collisions[best.y] && data.collisions[best.y][best.x] === 1) {
          W.base[best.y][best.x] = 0; data.collisions[best.y][best.x] = 0;
        }
      }
      W.people.push(m);
    });
  }
  // every frame in a scene world, before the people are drawn
  function tick(world, now) {
    if (!W || W.data !== world) return;
    if (!W.people) { if (!R || !cast() || !Object.keys(cast()).length) return; takeOver(); }
    for (var i = 0; i < W.people.length; i++) show(W.people[i], stateIn(W.people[i], now));
  }
  // the ones walking, a step at a time: js/scene.js's walker frames (4–11 a stride), depth-tested and lit as it does
  var FW = 32, FH = 48, DIR = { down: 0, right: 1, up: 2, left: 3 }, sheets = {};
  function sheet(name) {
    if (!sheets[name]) {
      var e = sheets[name] = { img: new Image(), ready: false };
      e.img.onload = function () { e.ready = true; };
      e.img.src = '/bridge/assets/characters/' + name + '.png';
    }
    return sheets[name];
  }
  function walking(world, offX, offY, ts, now, sc) {
    if (!W || W.data !== world || !W.people || !sc || typeof BridgeScene === 'undefined') return [];
    var out = [];
    W.people.forEach(function (m) {
      var st = m.st, sh = st && st.walk != null && sheet(m.p.sheet);
      if (!sh || !sh.ready) return;
      var footRow = st.y + 0.9;
      out.push({ footRow: footRow, draw: function (ctx) {
        var col = 4 + Math.floor(st.walk / 0.3) % 8, cx = Math.round(offX + (st.x + 0.5) * ts), footY = Math.round(offY + footRow * ts);
        BridgeScene.drawOccluded(ctx, sc, sh.img, col * FW, (DIR[st.facing] || 0) * FH, FW, FH, cx - FW / 2, footY - (FH - 3), footRow,
          offX, offY, BridgeScene.tintAt(sc, world, Math.round(st.x), Math.round(st.y), now), { x: cx, y: footY, rx: 8, ry: 3 });
      } });
    });
    return out;
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('*', { ground: function (ctx, world, offX, offY, ts, now) { tick(world, now); }, items: walking });
  }

  // ---- elsewhere: the Map tab ---------------------------------------------------------------------------------------
  /** Where someone is now (where they're headed, if walking): { world, x, y, home } — x, y only if known (not at
   *  their own spot) — or null (away). */
  function where(id) {
    var S = stopNow(id), p = cast() && cast()[id];
    if (!S) return null;
    var c = placeOf(S.cur, p, null);
    return c ? { world: c.world, x: c.x, y: c.y, home: S.cur[1] === 'home' } : null;
  }
  /** A place's JSON as it stands now: who's out, who's visiting (the Map tab's markers). */
  function adjust(worldId, data) {
    var C = cast();
    if (!R || !C || !data || !data.interactions) return data;
    Object.keys(R).forEach(function (id) {
      var p = C[id], home = homeOf(p);
      if (!p || !home || id.charAt(0) === '_') return;
      var w = where(id);
      if (home.world === worldId && !(w && w.world === worldId))
        data.interactions = data.interactions.filter(function (i) { return i.label !== home.label; });
      if (home.world === worldId && w && w.world === worldId && w.x != null)
        data.interactions.forEach(function (i) { if (i.label === home.label) { i.x = w.x; i.y = w.y; } });
      if (home.world !== worldId && w && w.world === worldId && w.x != null)
        data.interactions.push({ x: w.x, y: w.y, type: 'dialog', label: home.label, home: { world: home.world, label: home.label } });
    });
    return data;
  }

  // ---- the tests: every routine's spots open, every walk with a way through (the same paths and doors as above) ----
  function check() {
    var C = cast(), worlds = {}, out = [];
    var need = {};
    Object.keys(R).forEach(function (id) {
      if (id.charAt(0) === '_') return;
      var p = C[id];
      if (!p || !homeOf(p)) { out.push(id + ': nobody of that name in people.json'); return; }
      need[homeOf(p).world] = 1;
      R[id].forEach(function (e) { if (e[1] && e[1].world) need[e[1].world] = 1; });
    });
    return Promise.all(Object.keys(need).map(function (w) {
      return fetch('/bridge/assets/worlds/' + w + '.json').then(function (r) { return r.json(); }).then(function (d) { worlds[w] = d; });
    })).then(function () {
      var saved = W;
      Object.keys(R).forEach(function (id) {
        var p = C[id];
        if (id.charAt(0) === '_' || !p || !homeOf(p)) return;
        var home = homeOf(p), hd = worlds[home.world], spot = null;
        var it = hd.interactions.filter(function (i) { return i.label === home.label; })[0];
        (hd.scene.actors || []).forEach(function (a) { if (a.sheet === p.sheet && (!spot || (it && Math.abs(a.x - it.x) + Math.abs(a.y - it.y) < Math.abs(spot.x - it.x) + Math.abs(spot.y - it.y)))) spot = a; });
        if (!spot || !it) { out.push(id + ': not stood anywhere in ' + home.world); return; }
        var day = R[id];
        day.forEach(function (e, k) {
          var cur = placeOf(e, p, spot), prev = placeOf(day[(k - 1 + day.length) % day.length], p, spot);
          if (cur && cur.pose !== 'sit' && !(cur.world === home.world && cur.x === spot.x && cur.y === spot.y) && worlds[cur.world].collisions[cur.y][cur.x] === 1)
            out.push(id + ' at ' + e[0] + ': stands on a solid tile in ' + cur.world);
          [cur, prev].forEach(function (pl) {
            if (!pl) return;
            var d = worlds[pl.world], base = d.collisions.map(function (row) { return row.slice(); });
            if (spot.pose !== 'sit' && pl.world === home.world) base[spot.y][spot.x] = 0;
            W = { id: pl.world, data: d, base: base };
            var homeHere = pl.world === home.world, cin = cur && cur.world === pl.world, pin = prev && prev.world === pl.world;
            var prevE = day[(k - 1 + day.length) % day.length];
            var a = pin ? [prev.x, prev.y] : doorTo(d, prev && prev.world, homeHere && prevE[2] && prevE[2].via, cin ? [cur.x, cur.y] : null);
            var b = cin ? [cur.x, cur.y] : doorTo(d, cur && cur.world, homeHere && e[2] && e[2].via, a);
            if (!a || !b) out.push(id + ' at ' + e[0] + ': no door in ' + pl.world);
            else if ((a[0] !== b[0] || a[1] !== b[1]) && !path(base, d.width, d.height, a, b, 'check:' + pl.world + ':' + a + '>' + b)) out.push(id + ' at ' + e[0] + ': no way from ' + a + ' to ' + b + ' in ' + pl.world);
          });
        });
      });
      W = saved;
      return out;
    });
  }

  /** The people kept here and where they are this frame (the tests). */
  function here() { return W && W.people ? W.people.map(function (m) { return { id: m.id, st: m.st || null }; }) : []; }

  return { decorate: decorate, where: where, adjust: adjust, _stop: stopNow, _check: check, _here: here };
})();
