/**
 * BridgeRoute — the way there: from where you stand to where the thing you're following is (Beck, Nov 2026: "where
 * to go to reach the next destination is clear").
 *
 * A route is found over the atlas (assets/atlas.json, js/map.js): every world's ways out — doors and gates on foot,
 * Arcadia's lifts, cabs and the Loop, the chairlift, the funicular, the Aurelle train, the branch line and the ferry,
 * the climbs and the piste — plus the travel no door records: the sloop between Lumar's islands (a pier to any island
 * on your chart), the shuttle up from a landing site to the hangar and down to the world the ship is over, and a jump
 * from the helm on the bridge (which comes straight down at the far world's landing site). Only ways a pilot can use
 * now: the places it walks through are ones you've been (so a door you haven't taken is never given away, and a gate
 * or a members' door you once got through is open), a password gate only once it's open (`bridge_gates`), the sea
 * only to an island on your chart. A destination you haven't been to is as vague as its lead: the way goes to its
 * island (Lumar) or its world and stops there.
 *
 * Where it shows: the tracker (js/quests.js) and the journal's leads and Next up have the next leg from here in a few
 * words ("Through the North Gate, then down the Quay Stairs"); in the world, the door, lift or pier that is the next
 * leg wears a small gold "this way" mark (js/world.js drawScreenLayer calls `drawMark`) and its prompt pill says so
 * (js/interactions.js, `isNext`); the Map picks out the route among the places (js/map.js). "Show me the way" on a
 * place's map (`show(id)`) follows a route to it without a quest, until you're there. All of it is worked out when
 * you arrive somewhere or what you follow changes (`current`, memoised), never in a frame.
 *
 *   BridgeRoute.find(from, to) → { legs: [{ kind, from, to, label, x, y }], to, name, region, cost } | { here } | null
 *   BridgeRoute.current() / line(route) / show(id) / stop() / showing() / isNext(inter) / worlds() / lineTo(world)
 */
var BridgeRoute = (function () {
  var COST = { door: 1, gate: 1, climb: 3, ski: 2, lift: 2, cab: 3, loop: 3, train: 3, ferry: 3, sea: 8, up: 4, down: 4, jump: 10 };
  var KEY = 'bridge_route_to';                       // "Show me the way": a place, until you're there (this device's)
  var placeTo = null;
  try { placeTo = localStorage.getItem(KEY) || null; } catch (e) { placeTo = null; }

  function M() { return typeof BridgeMap !== 'undefined' ? BridgeMap : null; }
  function A() { var m = M(); return m && m.atlas ? m.atlas() : null; }
  function here() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function W(id) { var a = A(); return a && a.worlds[id] || null; }
  function norm(id) {                                // the mine's and the crypt's floors are one place
    var a = A();
    if (!a || !id || a.worlds[id]) return id;
    var m = String(id).replace(/-[bc]$/, '-a');
    return a.worlds[m] ? m : id;
  }
  function rootOf(sys) { var a = A(), s = a && a.systems.filter(function (x) { return x.id === sys; })[0]; return s ? s.root : null; }
  function sysOf(id) { var w = W(id); return w ? w.sys : null; }
  function shipAt() { var l = typeof BridgeOrbit !== 'undefined' && BridgeOrbit.getLocation ? BridgeOrbit.getLocation() : null; return l && l !== 'ship' && rootOf(l) ? l : null; }
  function seen() { var m = M(); return m && m.seen ? m.seen() : {}; }
  function onChart(isle, S) { return !!S[isle] || (typeof BridgeChart !== 'undefined' && BridgeChart.known ? BridgeChart.known(isle) : false); }
  function gates() { try { return JSON.parse(localStorage.getItem('bridge_gates') || '{}') || {}; } catch (e) { return {}; } }

  // what a destination is: the places that count as there, and the ones the way can head for
  function goal(to, S) {
    var a = A();
    if (!a || !to) return null;
    var pre = /-\*$/.test(to) ? to.slice(0, -1) : null, base = pre ? pre.slice(0, -1) : norm(to);
    var at = pre ? function (w) { return w === base || w.indexOf(pre) === 0; } : function (w) { return w === base; };
    var all = Object.keys(a.worlds).filter(at);
    if (!all.length) return null;
    var been = all.filter(function (w) { return S[w]; });
    if (been.length) return { at: at, targets: been, region: false, name: placeName(pre ? (S[base] ? base : been[0]) : base) };
    var w0 = a.worlds[a.worlds[base] ? base : all[0]];
    if (w0.sys === 'lumar' && w0.isle) {
      var isle = w0.isle;
      return { at: function (w) { var x = a.worlds[w]; return !!x && x.isle === isle; }, targets: onChart(isle, S) ? [isle] : [], region: true,
               name: M().isleName ? M().isleName(isle) : placeName(isle), isle: isle };
    }
    if (w0.sys === 'ship') return { at: function (w) { return sysOf(w) === 'ship'; }, targets: ['bridge'], region: true, name: 'the Wayfarer' };
    return { at: function (w) { return sysOf(w) === w0.sys; }, targets: [rootOf(w0.sys)], region: true, name: M().sysName ? M().sysName(w0.sys) : w0.sys };
  }

  // the ways on from a place, as legs
  function edges(u, ok, G) {
    var a = A(), w = a.worlds[u], out = [];
    if (!w) return out;
    w.exits.forEach(function (e) {
      if (!ok(e.to) || e.to === u) return;
      if (e.kind === 'gate' && !G[u + ':' + e.label]) return;          // a password gate: only once it's open
      out.push({ kind: e.kind, from: u, to: e.to, label: e.label, x: e.x, y: e.y });
    });
    if ((a.isles || []).indexOf(u) >= 0) (a.isles || []).forEach(function (v) {   // the sloop, pier to pier
      if (v !== u && ok(v) && onChart(v, G.__S)) out.push({ kind: 'sea', from: u, to: v, label: 'GO SAILING' });
    });
    var sys = w.sys, loc = shipAt();
    if (sys !== 'ship' && rootOf(sys) === u && ok('hangar')) out.push({ kind: 'up', from: u, to: 'hangar', label: 'SHUTTLE' });
    if (u === 'hangar' && loc && ok(rootOf(loc))) out.push({ kind: 'down', from: u, to: rootOf(loc), label: 'SHUTTLE' });
    if (u === 'bridge') a.systems.forEach(function (s) {
      if (s.id !== 'ship' && s.id !== loc && ok(s.root)) out.push({ kind: 'jump', from: u, to: s.root, label: 'HELM' });
    });
    return out;
  }

  function find(from, to, opts) {
    var a = A();
    if (!a || !from || !to) return null;
    from = norm(from);
    var S = (opts && opts.seen) || seen(), g = goal(to, S);
    if (!g || !W(from)) return null;
    if (g.at(from)) return { here: true, name: g.name, region: g.region };
    if (!g.targets.length) return { none: true, name: g.name, region: g.region, isle: g.isle };
    var T = {};
    g.targets.forEach(function (t) { T[t] = 1; });
    var ok = function (w) { return !!S[w] || !!T[w] || w === 'hangar' || w === 'bridge'; };
    var G = gates();
    G.__S = S;
    var dist = {}, prev = {}, done = {}, q = [from];
    dist[from] = 0;
    while (q.length) {
      var bi = 0;
      for (var i = 1; i < q.length; i++) if (dist[q[i]] < dist[q[bi]]) bi = i;
      var u = q.splice(bi, 1)[0];
      if (done[u]) continue;
      done[u] = 1;
      if (T[u]) {
        var legs = [], k = u;
        while (prev[k]) { legs.unshift(prev[k]); k = prev[k].from; }
        return { legs: legs, to: u, name: g.name, region: g.region, cost: dist[u] };
      }
      edges(u, ok, G).forEach(function (e) {
        var d = dist[u] + (COST[e.kind] || 2);
        if (dist[e.to] == null || d < dist[e.to]) { dist[e.to] = d; prev[e.to] = e; q.push(e.to); }
      });
    }
    return { none: true, name: g.name, region: g.region };
  }

  // ---- what you're following, and the way to it from here (memoised: worked out on arrival, or when it changes) --
  var memo = { key: null, route: null, dest: null };
  function dests() {
    if (placeTo) return { kind: 'place', list: [placeTo] };
    var Q = typeof BridgeQuests !== 'undefined' ? BridgeQuests : null, id = Q && Q.tracked ? Q.tracked() : null;
    return id && Q.places ? { kind: 'quest', id: id, list: Q.places(id) } : { kind: null, list: [] };
  }
  // the nearest of several: being at one of them wins; then a way to a place you know (the cheapest); then being on
  // the island or world of one you don't (the lead takes over there); then a way to such an island or world
  function rank(r) { return r.here ? (r.region ? 2 : 0) : r.none ? 4 : r.region ? 3 : 1; }
  function best(from, list, S) {
    var out = null;
    list.forEach(function (to) {
      var r = find(from, to, { seen: S });
      if (!r) return;
      if (!out || rank(r) < rank(out) || (rank(r) === rank(out) && r.cost < out.cost)) out = r;
    });
    return out;
  }
  function current() {
    var a = A(), h = here();
    if (!a || !h) return null;
    var D = dests(), S = seen();
    var chart = typeof BridgeChart !== 'undefined' && BridgeChart._state ? JSON.stringify(BridgeChart._state().seas || {}) : '';
    var key = h + '|' + D.kind + ':' + (D.id || '') + ':' + D.list.join(',') + '|' + Object.keys(S).length + '|' + shipAt() + '|' + chart + '|' + (localStorage.getItem('bridge_gates') || '').length;
    if (key === memo.key) return memo.route;
    var r = D.list.length ? best(h, D.list, S) : null;
    if (r && r.here && D.kind === 'place') { stop(true); return current(); }   // you're there: the way's done
    memo = { key: key, route: r, dest: D, n: (memo.n || 0) + 1 };
    target = null;
    return r;
  }

  // ---- in a few words ----------------------------------------------------------------------------------------------
  function title(t) { return String(t || '').toLowerCase().replace(/(^|[\s\-\/(&])([a-zà-ÿ])/g, function (m, x, y) { return x + y.toUpperCase(); }).replace(/'S\b/g, '\'s'); }
  function placeName(id) { var m = M(); return m && m.placeName ? m.placeName(id) : title(String(id).replace(/-/g, ' ')); }
  function theName(id) { return placeName(id).replace(/^The /, 'the '); }
  function cut(label) { return String(label || '').split(' · ')[0].trim(); }
  function noun(label) {
    var t = title(cut(label));
    if (/^The /.test(t)) return 'the ' + t.slice(4);
    if (/'s\b|^St /.test(t)) return t;
    return 'the ' + t;
  }
  function sameName(label, id) {
    var n = function (t) { return String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(the|to|back|of)\b/g, ' ').replace(/harbor/g, 'harbour').replace(/\s+/g, ' ').trim(); };
    var l = n(cut(label)), p = n(placeName(id));
    return !!l && !!p && (p.indexOf(l) >= 0 || l.indexOf(p) >= 0);
  }
  var GENERIC = /^(THE )?(DOOR|ENTRANCE|OUTSIDE|EXIT|PASSAGE|HATCH)$/;
  function bigger(a, b) { var A1 = W(a), B1 = W(b); return !!A1 && !!B1 && (B1.w * B1.h) > (A1.w * A1.h) * 1.5; }
  function compass(a, b) {
    var I = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles || {}, P = I[a], Q = I[b];
    if (!P || !Q) return '';
    var ang = Math.atan2(-(Q.y - P.y), Q.x - P.x) * 180 / Math.PI;           // 0 east, 90 north
    return ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'][((Math.round(ang / 45) % 8) + 8) % 8];
  }
  function phrase(L, S) {
    var lab = String(L.label || '').toUpperCase(), known = !S || S[L.to];
    var dest = known ? theName(L.to) : 'somewhere you haven\'t been';
    switch (L.kind) {
      case 'sea': var c = compass(L.from, L.to); return 'Sail to ' + (M().isleName ? M().isleName(L.to) : placeName(L.to)) + (c ? ' (' + c + ')' : '');
      case 'up': return 'Up to the ship';
      case 'down': return 'Down in the shuttle';
      case 'jump': return 'Jump to ' + (M().sysName ? M().sysName(sysOf(L.to)) : L.to);
      case 'cab': return 'An air cab to ' + dest;
      case 'loop': return 'Take the Loop to ' + dest;
      case 'train': return 'Take the train to ' + dest;
      case 'ferry': return 'Take the ferry to ' + dest;
      case 'ski': return 'Ski down from ' + noun(lab);
      case 'climb': return /^(ON|DOWN|UP|OUT|THE WAY)\b/.test(lab) ? title(lab).replace(/ The /g, ' the ') : 'Climb ' + noun(lab);
    }
    if (/STAIR|LADDER|STEPS/.test(lab)) {
      var dir = /\bUP\b/.test(lab) ? 'Up ' : /\bDOWN\b|QUAY/.test(lab) ? 'Down ' : 'Take ';
      return dir + noun(lab.replace(/\s+(UP|DOWN)$/, '').replace(/^(UP|DOWN)\s+/, ''));
    }
    if (L.kind === 'lift') return (/^(CHAIRLIFT|FUNICULAR)$/.test(lab) ? 'Up ' : 'Take ') + noun(lab) + (sameName(lab, L.to) || !known ? '' : ' to ' + dest);
    if (/^(TO|BACK TO) /.test(lab)) return title(lab).replace(/ The /g, ' the ');
    if (/^THE (WAY|TRAIL|LANE)\b/.test(lab)) return 'Take ' + noun(lab).replace(/ The /g, ' the ');
    if (/ (ROAD|LANE)$/.test(lab)) return 'Along ' + noun(lab);
    if (GENERIC.test(lab)) return known ? 'Out to ' + dest : 'Through the door';
    if (/GATE$|SKYBRIDGE/.test(cut(lab))) return 'Through ' + noun(lab);
    if (known && sameName(lab, L.to)) return 'To ' + dest;                  // the door names where it goes
    if (known && bigger(L.from, L.to)) return 'Out to ' + dest;             // out of a room into the place round it
    return 'Into ' + noun(lab);
  }
  function lc(t) { return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function shipDoor(L) { return L.kind !== 'jump' && L.kind !== 'up' && L.kind !== 'down' && sysOf(L.from) === 'ship' && sysOf(L.to) === 'ship'; }
  // the next leg, and the one after it that matters (walking about the ship on the way to the helm goes unsaid)
  function line(r) {
    if (!r) return '';
    if (r.none) return r.region && r.isle ? r.name + ' isn\'t on your chart yet: a harbourmaster sells it' : '';
    if (r.here || !r.legs || !r.legs.length) return '';
    var S = seen(), first = r.legs[0], rest = r.legs.slice(1).filter(function (l) { return !shipDoor(l); });
    var t = phrase(first, S);
    if (rest.length) t += ', then ' + lc(phrase(rest[0], S));
    return t;
  }
  function lineTo(world) { var h = here(); return h && world ? line(find(h, world)) : ''; }
  function lineFor(list) { var h = here(); return h && list && list.length ? line(best(h, list, seen())) : ''; }   // the nearest of several

  // ---- "Show me the way" ---------------------------------------------------------------------------------------------
  function show(id) {
    placeTo = id || null;
    try { if (placeTo) localStorage.setItem(KEY, placeTo); else localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
    memo.key = null; target = null;
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.refreshTracker) BridgeQuests.refreshTracker();
  }
  function stop(quiet) {
    if (!placeTo) return;
    placeTo = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
    memo.key = null; target = null;
    if (!quiet && typeof BridgeQuests !== 'undefined' && BridgeQuests.refreshTracker) BridgeQuests.refreshTracker();
  }
  // the tracker's block for a place you asked the way to (no quest): js/quests.js shows it in place of the quest
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function trackerBlock() {
    if (!placeTo) return '';
    var r = current();
    if (!placeTo) return '';
    var w = line(r);
    return '<div class="qtr-head"><span class="qtr-kicker">The way</span><button type="button" class="qtr-stop" title="Stop showing the way">Stop</button></div>' +
      '<div class="qtr-title qtr-dest">' + esc(placeName(placeTo)) + '</div>' +
      (w ? '<div class="qtr-way">' + esc(w) + '</div>' : r && r.none ? '<div class="qtr-way">No way you know leads there yet.</div>' : '');
  }
  function wayHTML() { var w = line(current()); return w ? '<div class="qtr-way">' + esc(w) + '</div>' : ''; }
  function sig() { current(); return (placeTo || '') + '|' + (memo.n || 0); }
  // the places along the way (for the Map): where you are first, where it's headed last
  function worlds() {
    var r = current();
    if (!r || !r.legs) return [];
    return [norm(here())].concat(r.legs.map(function (l) { return l.to; }));
  }

  // ---- the thing in the world that is the next leg ----------------------------------------------------------------
  var target = null;                                  // { world, n, key, members, cx, top }
  var TRANSIT = { express_lift: 1, air_cab: 1, loop_station: 1 };
  function findTarget(wid, data) {
    var r = memo.route, L = r && r.legs && r.legs[0], ints = data && data.interactions || [];
    var t = { world: wid, n: ints.length, key: memo.key, members: [] };
    if (!L || norm(wid) !== L.from) return t;
    var pool;
    if (L.kind === 'sea') pool = ints.filter(function (i) { return i.type === 'go_sailing'; });
    else if (L.kind === 'up' || L.kind === 'down') pool = ints.filter(function (i) { return i.type === 'shuttle'; });
    else if (L.kind === 'jump') pool = ints.filter(function (i) { return i.type === 'warp_map'; });
    else if (TRANSIT[ints.filter(function (i) { return i.label === L.label; }).map(function (i) { return i.type; })[0]] && typeof BridgeTransit !== 'undefined' && BridgeTransit.links) {
      pool = ints.filter(function (i) { if (!TRANSIT[i.type]) return false; var lk = BridgeTransit.links(i); return lk && lk.to.indexOf(L.to) >= 0; });
    } else {
      pool = ints.filter(function (i) { return i.label === L.label && !i.hidden; });
      if (!pool.length) pool = ints.filter(function (i) { return (i.type === 'enter_world' && norm(i.target) === L.to) || (i.type === 'leave_world' && norm(i.leaveTo) === L.to); });
    }
    pool = pool.filter(function (i) { return typeof i.x === 'number'; });
    if (!pool.length) return t;
    var seed = pool[0];
    if (typeof L.x === 'number') pool.forEach(function (i) { if (Math.abs(i.x - L.x) + Math.abs(i.y - L.y) < Math.abs(seed.x - L.x) + Math.abs(seed.y - L.y)) seed = i; });
    var mem = pool.filter(function (i) { return i.label === seed.label && Math.abs(i.x - seed.x) <= 3 && Math.abs(i.y - seed.y) <= 3; });
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity;
    mem.forEach(function (i) { x0 = Math.min(x0, i.x); x1 = Math.max(x1, i.x); y0 = Math.min(y0, i.y); });
    t.members = mem; t.cx = (x0 + x1 + 1) / 2; t.top = y0;
    return t;
  }
  function liveTarget() {
    var wid = here(), data = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null;
    if (!wid || !data) return null;
    var n = (data.interactions || []).length;
    if (!target || target.world !== wid || target.n !== n || target.key !== memo.key) {
      if (!target || target.world !== wid) current();          // arrived somewhere: the way from here, once
      target = findTarget(wid, data);
    }
    return target;
  }
  function isNext(inter) { var t = liveTarget(); return !!(t && inter && t.members.indexOf(inter) >= 0); }
  function nextAt() { var t = liveTarget(); return t && t.members.length ? { x: t.cx, y: t.top, label: t.members[0].label } : null; }

  // a small gold marker over it, pointing down at it ("this way"): in the gold ! 's style, quieter; at the screen's
  // edge, pointing, when it's off the screen. Nothing when nothing's followed, or when you're at it (the pill says).
  function drawMark(ctx, offX, offY, ts, now, w, h) {
    var t = liveTarget();
    if (!t || !t.members.length) return;
    var md = typeof BridgeWorld !== 'undefined' && BridgeWorld.getMode && BridgeWorld.getMode();
    if (md && md.solo) return;
    var pt = typeof BridgeInteractions !== 'undefined' && BridgeInteractions.getTarget ? BridgeInteractions.getTarget() : null;
    if (pt && t.members.indexOf(pt) >= 0) return;
    var s = Math.max(1, Math.round(ts / 22));
    var x = offX + t.cx * ts, y = offY + (t.top - 0.75) * ts + Math.round(Math.sin(now / 380) * 2.5);
    var m = 18 * s, top = 64, bot = h - 96, off = x < m || x > w - m || y < top || y > bot;
    ctx.save();
    if (off) {
      var cx = w / 2, cy = (top + bot) / 2, dx = x - cx, dy = y - cy;
      var k = Math.min(Math.abs((w / 2 - m) / (dx || 1e-6)), Math.abs(((bot - top) / 2) / (dy || 1e-6)));
      var ex = cx + dx * Math.min(1, k), ey = cy + dy * Math.min(1, k), a = Math.atan2(dy, dx);
      ctx.globalAlpha = 0.78;
      ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = 'rgba(30, 20, 8, 0.85)';
      ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd56a'; ctx.lineWidth = Math.max(1.5, s); ctx.stroke();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath(); ctx.moveTo(5 * s, 0); ctx.lineTo(-3 * s, -4.5 * s); ctx.lineTo(-1 * s, 0); ctx.lineTo(-3 * s, 4.5 * s); ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    var pulse = (now % 2400) / 2400;
    var g = ctx.createRadialGradient(x, y, 2, x, y, 14 * s);
    g.addColorStop(0, 'rgba(255, 210, 100, ' + (0.32 + 0.12 * Math.sin(pulse * Math.PI * 2)).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255, 210, 100, 0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(30, 20, 8, 0.88)';                         // a rounded tag with a point at the foot
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - 7 * s); ctx.lineTo(x + 7 * s, y - 7 * s); ctx.lineTo(x + 7 * s, y + 2 * s); ctx.lineTo(x, y + 9 * s); ctx.lineTo(x - 7 * s, y + 2 * s); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd56a'; ctx.lineWidth = Math.max(1.5, s); ctx.stroke();
    ctx.fillStyle = '#ffe08a';                                       // two chevrons, pointing down at it
    for (var i = 0; i < 2; i++) {
      var yy = y - 4 * s + i * 4 * s;
      ctx.beginPath(); ctx.moveTo(x - 4 * s, yy); ctx.lineTo(x, yy + 3 * s); ctx.lineTo(x + 4 * s, yy); ctx.lineTo(x + 4 * s, yy + 1.5 * s); ctx.lineTo(x, yy + 4.5 * s); ctx.lineTo(x - 4 * s, yy + 1.5 * s); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  setInterval(function () { try { current(); } catch (e) { /* the atlas not in yet */ } }, 1000);

  return { find: find, current: current, line: line, lineTo: lineTo, lineFor: lineFor, phrase: phrase, show: show, stop: stop, showing: function () { return placeTo; },
           trackerBlock: trackerBlock, wayHTML: wayHTML, sig: sig, worlds: worlds, isNext: isNext, nextAt: nextAt, drawMark: drawMark,
           _goal: function (to) { return goal(to, seen()); } };
})();
