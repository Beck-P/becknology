/**
 * BridgeAboard — the crew's day aboard the Wayfarer, by the ship's clock (BridgeWayfarer.clock: four real hours to the
 * ship's day, a 24-hour face).
 *
 * Beck: crew "walking between their posts and off duty by the ship's clock rather than standing at their posts". Each
 * hand you've hired keeps a day (`day(id)`): asleep below through the middle watch (one of them keeps the night watch on
 * the bridge instead, by turns, and sleeps the forenoon), at their post on the bridge (`crewPosts` in bridge.json),
 * breakfast at 06:00, dinner at 12:00 and supper at 18:00 at the mess tables when the galley's fitted (else below), an
 * errand in the forenoon (the watch bill, the scuttlebutt, the lockers), one of them off duty in the afternoon by turns,
 * and after supper the card table — three of them round it, the rest at the tables over a mug — till they turn in at
 * 23:00. Dorrie the cook (the galley's) keeps hers: the range and the pass from 05:00, her cards after the dishes, below
 * at 23:00.
 *
 * A stop's start is staggered a little for each person, and from one stop to the next they walk — out of one room by
 * its door, along the passage, in by the next — at a steady pace round what's solid, down the hatch to their berths.
 * Where everyone is comes from the clock and who's aboard alone, so a party guest aboard (js/party.js: the host's crew
 * come over with `pship`) sees them in the same places. In the room you're in: standing or sitting they're one of the
 * world's actors (a seated sheet at the tables and the cards), walking this module draws them; their talk point goes
 * with them (people.js knows them aboard: `p.at`), and the tile they stand on is solid.
 *
 *   BridgeAboard.decorate(worldId, data, over)  as a ship room loads (js/crew.js hands it the bridge, and the rest here)
 *   BridgeAboard.where(id)     → { room, x, y, doing, state } (state: post · off · below · walking)
 *   BridgeAboard.roster()      → the watch bill's rows; .below() → who's down in their berths; .gossip() → a line at the cask
 *   BridgeAboard.atCards()     → who's at the card table now (js/eights.js deals them in)
 */
var BridgeAboard = (function () {
  var SPEED = 1.1;                         // tiles a real second
  var ROOMS = ['bridge', 'ship-passage', 'ship-galley', 'ship-observatory', 'ship-greenhouse'];
  var MODULE_ROOM = { 'ship-galley': 'galley', 'ship-observatory': 'observatory', 'ship-greenhouse': 'greenhouse' };
  var HATCH = { room: 'ship-passage', x: 26, y: 5 };      // the way below
  // standing and seated sheets (characters.py: the cast's own sheets are one or the other)
  var SHEETS = {
    regular: ['npc-regular-stand', 'npc-regular'], traveller: ['npc-traveler-stand', 'npc-traveler'],
    corra: ['npc-watcher', 'npc-watcher-sit'], okafor: ['npc-okafor', 'npc-okafor-sit'], pip: ['npc-pawn-customer', 'npc-pawn-customer-sit'],
    dorrie: ['npc-dorrie', 'npc-dorrie-sit']
  };
  // places aboard: the mess benches (facing the table), the card table's chairs, errands, the off-duty corners
  var SPOT = {
    mess: [[10, 5, 'down'], [11, 5, 'down'], [12, 5, 'down'], [13, 5, 'down'], [11, 7, 'up'], [12, 7, 'up'], [13, 7, 'up']],
    cards: [[16, 8, 'right'], [18, 8, 'left'], [17, 7, 'down']],
    errand: [['ship-passage', 2, 5, 'up', 'reading the watch bill'], ['ship-passage', 8, 5, 'up', 'at the scuttlebutt'],
             ['ship-passage', 15, 5, 'up', 'at their locker'], ['ship-passage', 18, 5, 'up', 'at their locker']],
    pass: ['ship-galley', 7, 6, 'right'], range: ['ship-galley', 3, 5, 'up'], sink: ['ship-galley', 7, 5, 'up'],
    greens: [['ship-greenhouse', 8, 7, 'up', 'picking greens'], ['ship-greenhouse', 13, 7, 'up', 'tying in the tomatoes'], ['ship-greenhouse', 3, 7, 'down', 'weeding the strawberries']],
    stars: [['ship-observatory', 7, 7, 'up', 'at the telescope'], ['ship-observatory', 13, 10, 'up', 'stargazing'], ['ship-observatory', 2, 8, 'up', 'over the star chart']]
  };

  var data = {};                            // every ship room's world JSON as built (fetched once)
  ROOMS.forEach(function (r) {
    fetch('/bridge/assets/worlds/' + r + '.json').then(function (x) { return x.ok ? x.json() : null; }).then(function (d) { if (d) data[r] = d; }).catch(function () {});
  });
  function has(n) { return typeof window[n] !== 'undefined'; }
  function W() { return has('BridgeWayfarer') ? BridgeWayfarer : null; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function cast() { return has('BridgePeople') && BridgePeople.all ? BridgePeople.all() : {}; }

  // ---- who's aboard -----------------------------------------------------------------------------------------------
  var over = null;                          // aboard someone else's Wayfarer: their crew (js/party.js)
  function hostShip() { return has('BridgeParty') && BridgeParty.hostShip ? BridgeParty.hostShip() : null; }
  function crewIds() {
    var h = hostShip(), C = cast(), ids;
    if (h) ids = Object.keys(h.crew || {});
    else ids = has('BridgeCrew') && BridgeCrew.list ? BridgeCrew.list().map(function (p) { return p.id; }) : [];
    return ids.filter(function (id) { return C[id] && C[id].crew; }).sort();
  }
  function galley() { return W() ? W().fitted('galley') : false; }
  function fitted(id) { return W() ? W().fitted(id) : false; }
  function people() { var ids = crewIds(); if (galley()) ids = ids.concat(['dorrie']); return ids; }

  // ---- the day ----------------------------------------------------------------------------------------------------
  function post(id) {
    var P = data.bridge && data.bridge.crewPosts && data.bridge.crewPosts[id];
    return P ? { room: 'bridge', x: P.x, y: P.y, facing: P.facing || 'up', pose: P.pose, doing: 'at their post', state: 'post' } : below('at their post');
  }
  function below(doing) { return { room: 'below', doing: doing || 'below in their berth', state: 'below' }; }
  function at(arr, doing, state, pose) { return { room: arr[0], x: arr[1], y: arr[2], facing: arr[3], pose: pose, doing: doing || arr[4], state: state || 'off' }; }
  function inGalley(s, doing, state, pose) { return { room: 'ship-galley', x: s[0], y: s[1], facing: s[2], pose: pose || 'sit', doing: doing, state: state || 'off' }; }

  /** Someone's timetable today: [[ship hour, place], …] from midnight. */
  function day(id, c) {
    c = c || (W() ? W().clock() : { day: 0 });
    var ids = crewIds(), k = ids.indexOf(id), n = ids.length, g = galley();
    if (id === 'dorrie') {
      return [[0, below('asleep')], [5, at(SPOT.range, 'lighting the range', 'post')], [5.6, at(SPOT.pass, 'at the pass', 'post')],
              [9.5, fitted('greenhouse') ? at(SPOT.greens[0], 'picking greens for dinner', 'post') : at(SPOT.sink, 'at the sink', 'post')], [10.4, at(SPOT.range, 'at the range', 'post')], [11.6, at(SPOT.pass, 'at the pass', 'post')],
              [14.2, at(SPOT.sink, 'at the sink', 'post')], [15.2, at(SPOT.range, 'at the range', 'post')], [17.6, at(SPOT.pass, 'at the pass', 'post')],
              [21, n < 3 ? inGalley(SPOT.cards[2], 'at the cards') : inGalley(SPOT.mess[4], 'with her feet up')], [23, below('asleep')]];
    }
    if (k < 0) return [[0, post(id)]];
    var night = n > 1 && (c.day % n) === k, off = n > 1 && ((c.day + 1) % n) === k;
    var seat = SPOT.mess[k % SPOT.mess.length], meal = function (name) { return g ? inGalley(seat, name + ' in the mess') : below(name + ' below'); };
    var errand = SPOT.errand[(hash(id) + c.day) % SPOT.errand.length];
    var out = [];
    if (night) out.push([0, Object.assign(post(id), { doing: 'keeping the night watch' })]);
    else out.push([0, below('asleep')]);
    out.push([6, meal('breakfast')]);
    if (night) out.push([7, below('sleeping off the night watch')]);
    else { out.push([7, post(id)]); out.push([9.4 + (hash(id) % 10) / 10, at(errand, null, 'off')]); out.push([10, post(id)]); }
    out.push([12, meal('dinner')]);
    out.push([13, post(id)]);
    if (off) {
      out.push([15, fitted('greenhouse') ? at(SPOT.greens[1 + k % 2], null, 'off') : fitted('observatory') ? at(SPOT.stars[2], null, 'off')
                  : g ? inGalley(SPOT.mess[(k + 3) % SPOT.mess.length], 'off duty, a mug of tea') : below('off duty')]);
      out.push([17, post(id)]);
    }
    out.push([18, meal('supper')]);
    // after supper: three round the card table (by turns), the rest at the tables, or below with no galley
    var deal = (k - c.day % Math.max(1, n) + n * 8) % Math.max(1, n);
    if (g && deal < 3) out.push([19, inGalley(SPOT.cards[deal], 'at the cards')]);
    else if (fitted('observatory') && deal < 5) out.push([19, at(SPOT.stars[deal - 3], null, 'off')]);
    else if (g) out.push([19, inGalley(seat, 'yarning over a mug')]);
    else out.push([19, below('off duty')]);
    if (night) out.push([22.5, post(id)]);
    else out.push([23, below('asleep')]);
    return out;
  }
  // a little later or earlier for each person, so nobody moves in step (ship hours)
  function lag(id) { return ((hash(id + 'lag') % 1000) / 1000) * 0.3; }

  /** { cur, prev, since (real ms into the stop) } */
  function stopNow(id, c) {
    c = c || W().clock();
    var D = day(id, c), h = c.h, i = -1;
    var starts = D.map(function (e) { return e[0] + (e[0] ? lag(id) : 0); });
    for (var j = 0; j < D.length; j++) if (starts[j] <= h) i = j;
    var sinceH = i < 0 ? h + 24 - starts[D.length - 1] : h - starts[i];
    if (i < 0) i = D.length - 1;
    return { cur: D[i][1], prev: D[(i - 1 + D.length) % D.length][1], since: sinceH / 24 * c.len, index: i };
  }

  // ---- routes: room to room by the doors ------------------------------------------------------------------------------
  function doorTo(room, other) {
    var d = data[room];
    if (other === 'below') return room === HATCH.room ? [HATCH.x, HATCH.y] : null;
    var I = (d && d.interactions) || [];
    for (var i = 0; i < I.length; i++) if (I[i].type === 'enter_world' && I[i].target === other) return [I[i].x, I[i].y];
    return null;
  }
  var LINKS = { bridge: ['ship-passage'], 'ship-passage': ['bridge', 'ship-galley', 'ship-observatory', 'ship-greenhouse', 'below'],
                'ship-galley': ['ship-passage'], 'ship-observatory': ['ship-passage'], 'ship-greenhouse': ['ship-passage'], below: ['ship-passage'] };
  function roomPath(a, b) {
    if (a === b) return [a];
    var prev = {}, q = [a]; prev[a] = a;
    for (var i = 0; i < q.length; i++) (LINKS[q[i]] || []).forEach(function (n) { if (prev[n] == null) { prev[n] = q[i]; q.push(n); } });
    if (prev[b] == null) return null;
    var out = [b]; while (out[0] !== a) out.unshift(prev[out[0]]);
    return out;
  }
  var paths = {};
  function path(room, a, b) {
    var key = room + ':' + a + '>' + b;
    if (paths[key] !== undefined) return paths[key];
    var d = data[room];
    if (!d) return null;
    var w = d.width, h = d.height, C = d.collisions, start = a[1] * w + a[0], goal = b[1] * w + b[0], prev = new Int32Array(w * h).fill(-1), q = [start];
    prev[start] = start;
    for (var qi = 0; qi < q.length && prev[goal] < 0; qi++) {
      var c = q[qi], x = c % w, y = (c - x) / w;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) {
        var nx = x + dd[0], ny = y + dd[1], n = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || prev[n] >= 0) return;
        if (n !== goal && C[ny] && C[ny][nx] === 1 && !(C[y] && C[y][x] === 1)) return;   // out of a solid start (the hatch, a bench) any way
        prev[n] = c; q.push(n);
      });
    }
    if (prev[goal] < 0) return (paths[key] = null);
    var out = [];
    for (var at2 = goal; at2 !== start; at2 = prev[at2]) out.push([at2 % w, (at2 - at2 % w) / w]);
    out.push(a);
    return (paths[key] = out.reverse());
  }
  // the walk from one place to the next: legs [{ room, P (tiles), len }]
  var routes = {};
  function route(from, to) {
    var key = JSON.stringify([from.room, from.x, from.y, to.room, to.x, to.y]);
    if (routes[key] !== undefined) return routes[key];
    var rp = roomPath(from.room, to.room), legs = [];
    if (!rp) return (routes[key] = null);
    for (var i = 0; i < rp.length; i++) {
      var r = rp[i];
      if (r === 'below') continue;
      var a = i === 0 ? [from.x, from.y] : doorTo(r, rp[i - 1]), b = i === rp.length - 1 ? [to.x, to.y] : doorTo(r, rp[i + 1]);
      if (!a || !b || a[0] == null || b[0] == null) return (routes[key] = null);
      var P = a[0] === b[0] && a[1] === b[1] ? [a] : path(r, a, b);
      if (!P) return (routes[key] = null);
      legs.push({ room: r, P: P, len: P.length - 1 });
    }
    return (routes[key] = legs);
  }
  function along(P, s) {
    if (s >= P.length - 1) return { x: P[P.length - 1][0], y: P[P.length - 1][1], done: true };
    var i = Math.floor(s), f = s - i, a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    return { x: a[0] + dx * f, y: a[1] + dy * f, facing: dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up' };
  }

  /** Where someone is now: { room, x, y, facing, pose, doing, state, walk (tiles into the walk, walking) }. */
  function where(id, c) {
    if (!W()) return null;
    var S = stopNow(id, c), cur = S.cur, prev = S.prev;
    if (cur.room === prev.room && cur.x === prev.x && cur.y === prev.y) return cur;
    var R = route(prev, cur);
    if (!R) return cur;
    var s = S.since / 1000 * SPEED;
    for (var i = 0; i < R.length; i++) {
      if (s <= R[i].len) {
        var p = along(R[i].P, s);
        return { room: R[i].room, x: p.x, y: p.y, facing: p.facing || 'down', doing: 'on their way: ' + cur.doing, state: 'walking', walk: s, to: cur };
      }
      s -= R[i].len;
    }
    return cur;
  }

  // ---- in the room you're in --------------------------------------------------------------------------------------
  var Here = null;                          // { id: worldId, data, people: { id: m } }
  function label(id) { var p = cast()[id]; return id === 'dorrie' ? 'DORRIE' : p ? p.name.toUpperCase() : id.toUpperCase(); }
  function sheets(id) { var p = cast()[id]; return SHEETS[id] || [p && p.sheet, p && p.sheet]; }
  function decorate(worldId, d, overCrew) {
    if (ROOMS.indexOf(worldId) < 0 || !d) return false;
    over = overCrew || null;
    if (d.scene) {
      d.scene.actors = (d.scene.actors || []).filter(function (a) { return a.sheet !== 'npc-dorrie'; });   // she keeps her own day
    }
    d.interactions = (d.interactions || []).filter(function (it) { return !it.crewOf; });
    var C = cast();
    // aboard, people.js knows each of the crew in every room (so talking to them aboard counts for quests at home)
    crewIds().forEach(function (id) {
      var p = C[id], L = label(id);
      if (p && !p.at.some(function (e) { return e.world === worldId && e.label === L; })) p.at.push({ world: worldId, label: L });
    });
    Here = { id: worldId, data: d, people: {} };
    return true;
  }
  function home(id) { var p = cast()[id]; return p && p.at.filter(function (e) { return ROOMS.indexOf(e.world) < 0; })[0]; }
  function show(id, st) {
    var d = Here.data, A = d.scene.actors, I = d.interactions, m = Here.people[id];
    if (!m) m = Here.people[id] = { id: id, actor: { sheet: sheets(id)[0] } };
    m.st = st;
    var standing = st && st.walk == null, ai = A.indexOf(m.actor);
    if (standing && ai < 0) A.push(m.actor);
    if (!standing && ai >= 0) A.splice(ai, 1);
    if (!st) { if (m.inter) { var ii = I.indexOf(m.inter); if (ii >= 0) I.splice(ii, 1); } solid(m, null); return; }
    m.actor.x = st.x; m.actor.y = st.y; m.actor.facing = st.facing || 'down'; m.actor.pose = standing ? st.pose : undefined;
    m.actor.sheet = sheets(id)[standing && st.pose === 'sit' ? 1 : 0];
    if (!m.inter) {
      m.inter = id === 'dorrie' ? { type: 'galley', part: 'cook', label: 'DORRIE', prompt: 'PRESS E TO TALK', crewOf: id }
                                : { type: 'dialog', label: label(id), prompt: 'PRESS E TO TALK', dialog: '', home: home(id), crewOf: id };
    }
    if (I.indexOf(m.inter) < 0) I.push(m.inter);
    m.inter.x = Math.round(st.x); m.inter.y = Math.round(st.y);
    solid(m, standing && st.pose !== 'sit' ? [Math.round(st.x), Math.round(st.y)] : null);
  }
  function solid(m, xy) {
    var C = Here.data.collisions;
    if (m.solidAt && (!xy || xy[0] !== m.solidAt[0] || xy[1] !== m.solidAt[1])) { C[m.solidAt[1]][m.solidAt[0]] = m.solidWas; m.solidAt = null; }
    if (xy && !m.solidAt && C[xy[1]]) { m.solidWas = C[xy[1]][xy[0]]; C[xy[1]][xy[0]] = 1; m.solidAt = xy; }
  }
  var cardsShown = null;
  function tick(world) {
    if (!Here || Here.data !== world || !W()) return;
    var c = W().clock(), ids = people();
    if (Here.id === 'ship-galley') {                 // the cards out on the baize while anyone's sat at them
      var on = atCards().length ? 'on' : null;
      if (on !== cardsShown && has('BridgeScene') && BridgeScene.setLayers) { cardsShown = on; BridgeScene.setLayers('ship-galley', { cards: on }); }
    } else cardsShown = undefined;
    Object.keys(Here.people).forEach(function (id) { if (ids.indexOf(id) < 0) show(id, null); });
    ids.forEach(function (id) {
      var st = where(id, c);
      if (!data[Here.id]) return;
      show(id, st && st.room === Here.id ? st : null);
    });
  }
  // the ones walking, a stride at a time (js/scene.js's walker frames), depth-tested and lit
  var FW = 32, FH = 48, DIR = { down: 0, right: 1, up: 2, left: 3 }, imgs = {};
  function sheet(name) {
    if (!imgs[name]) { var e = imgs[name] = { img: new Image(), ready: false }; e.img.onload = function () { e.ready = true; }; e.img.src = '/bridge/assets/characters/' + name + '.png'; }
    return imgs[name];
  }
  function walking(world, offX, offY, ts, now, sc) {
    if (!Here || Here.data !== world || !sc || !has('BridgeScene')) return [];
    var out = [];
    Object.keys(Here.people).forEach(function (id) {
      var st = Here.people[id].st, sh = st && st.walk != null && sheet(sheets(id)[0]);
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
  if (has('BridgeWorld') && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('*', { ground: function (ctx, world) { tick(world); }, items: walking });
  }

  // ---- for the rest of the ship -------------------------------------------------------------------------------------
  var ROOM_NAME = { bridge: 'the bridge', 'ship-passage': 'the passage', 'ship-galley': 'the mess', 'ship-observatory': 'the observatory',
                    'ship-greenhouse': 'the greenhouse', below: 'below' };
  function roster() {
    if (!W()) return [];
    var c = W().clock(), C = cast();
    return people().map(function (id) {
      var st = where(id, c) || below(), p = C[id];
      return { id: id, name: id === 'dorrie' ? 'Dorrie Kettle' : p.name, role: id === 'dorrie' ? 'Cook' : p.crew.role, sheet: sheets(id)[0],
               doing: st.doing, where: ROOM_NAME[st.state === 'walking' ? st.to.room : st.room] || st.room, state: st.state === 'walking' ? 'off' : st.state };
    });
  }
  function belowNow() { return roster().filter(function (r) { return r.state === 'below'; }).map(function (r) { return r.name.split(' ')[0]; }); }
  function atCards() {
    if (!W() || !galley()) return [];
    var c = W().clock();
    return people().filter(function (id) { var st = where(id, c); return st && st.room === 'ship-galley' && /cards/.test(st.doing) && st.walk == null; });
  }
  var GOSSIP = {
    regular: 'BRAM, BY THE CASK: "CURRENTS OFF CRIMSON ARE RUNNING CONTRARY THIS WEEK. MARK MY WORDS."',
    okafor: 'OKAFOR, WIPING HER HANDS: "NUMBER TWO RING\'S SINGING A HALF-TONE FLAT. NOTHING TO WORRY ABOUT. PROBABLY."',
    traveller: 'ANSEL: "SAPPHIRE WILL BUY ANYTHING THAT GLOWS. I\'VE SAID IT BEFORE. I\'LL SAY IT AGAIN."',
    corra: 'CORRA, LOW: "SOMEBODY\'S BEEN AT THE COOK\'S BISCUITS. I KNOW WHO. I\'M NOT SAYING."',
    pip: 'PIP: "I BET DORRIE I COULD GET ROUND THE WHOLE SHIP WITHOUT TOUCHING THE DECK. I LOST."'
  };
  function gossip() {
    var ids = crewIds();
    if (!ids.length || !W()) return null;
    var c = W().clock(), near = ids.filter(function (id) { var st = where(id, c); return st && st.room === 'ship-passage'; });
    var pick = (near.length ? near : ids)[(c.day + Math.floor(c.h)) % (near.length || ids.length)];
    return near.length ? GOSSIP[pick] || null : 'THE TALK AT THE CASK, SECOND HAND: ' + (GOSSIP[pick] || '').replace(/^[A-Z]+[^:]*: /, '');
  }

  // js/crew.js stands the crew at their posts on the bridge: aboard, they keep their day instead
  if (has('BridgeCrew') && BridgeCrew.decorate) {
    var dec0 = BridgeCrew.decorate;
    BridgeCrew.decorate = function (wid, d, ov) {
      if (ROOMS.indexOf(wid) >= 0) return decorate(wid, d, ov);
      return dec0.apply(this, arguments);
    };
  }

  return { decorate: decorate, where: where, day: day, roster: roster, below: belowNow, atCards: atCards, gossip: gossip,
           label: label, sheets: sheets, _here: function () { return Here ? Object.keys(Here.people).map(function (id) { var m = Here.people[id]; return { id: id, st: m.st }; }) : []; },
           _route: route, _data: function () { return data; } };
})();
