/**
 * BridgeParty — playing together as a party, and travelling together. Beck: "send somebody an invite to play together,
 * work together, so then every time you go to travel somewhere, you need to wait for that person to come to the boats
 * or your ship or shuttle… and then that would solve the issue of coming to each other's Wayfarers."
 *
 * - The party: *Invite to play together* from someone's menu (or their card on the players pill); they say yes and
 *   you're a party, kept in `bridge_party` so it lasts a reload and a night away. More than two is fine: whoever joins
 *   is told who else is in it (`party-roster`). While anyone in your party is on, the players pill's dot is gold; its
 *   panel has *Your party* (who, where, online or not) and *Leave the party*.
 * - Travel waits for each other: whoever sets off — the jump from the nav chart (js/starmap.js), the shuttle down from
 *   the hangar and *Return to ship* (js/ship.js), casting off (js/sloop.js), the mine's ladder and lift (js/mine.js) —
 *   asks the others first (`depart`). Each is called (`pcall`), and the departure waits on a ready check (*Waiting for
 *   Alyssa…*: asking / on the way / ready / not this time) with *Go now* and *Call it off* (Esc). No answer in thirty
 *   seconds counts as no; someone on their way who isn't ready in forty-five is left behind. Once nobody's still to
 *   answer or arrive it goes — `pgo` to whoever's ready, `poff` to anyone left — with whoever came.
 * - Called (it waits out a conversation, a game, a jump; not at sea): *Beck is jumping to Hoarfell — come?* Come, and
 *   a jump takes your own Wayfarer too: the two galleons go through it side by side (js/cinematic.js `wing`) and down
 *   together to the pad, a tile apart (or, if they stay aboard, you come aboard their bridge); the shuttle down lands
 *   you beside them; going back up takes you aboard their Wayfarer, in their hangar; casting off brings you to their
 *   pier and aboard as crew (js/sloop.js's sail-together: you answer `sail-yes` and she casts off with you); the mine's
 *   ladder takes you down to their floor and their dig. Your ship always follows you (`BridgeOrbit.setLocation`).
 * - Aboard each other's Wayfarer: open to anyone in your party (js/partner.js `SHIP`): its furniture, chests and tanks
 *   through partner.js's lens, live to and from the owner; what you see aboard is theirs — their decor (`getDecor`),
 *   their crew at their posts (js/crew.js `decorate`), their game room (js/games.js `layers`) — asked of them as you
 *   come aboard (`pship?` → `pship`). Their office's books are theirs alone (js/worlds/office.js).
 * - In orbit together: presence carries where your ship is parked (`ship`), and every window aboard shows the others'
 *   galleons parked over the same world (`drawShips`, from js/orbit.js) — aboard theirs, your own.
 *
 *   BridgeParty.has(id) / .list() / .invite(id) / .leave() / .depart(spec, go(readyIds)) → true while it's waiting
 *   .aboard(owner, world, spot) → true if it's under way / .guestOf() → whose ship you're aboard (a name) or null / .drawShips(…)
 *   ._D() / ._C() (the departure you're waiting on, the call you said yes to — the tests)
 */
var BridgeParty = (function () {
  var KEY = 'bridge_party', ASK_MS = 30000, ARRIVE_MS = 45000, FOLLOW_MS = 90000;
  var SHIP = { bridge: 1, quarters: 1, gameroom: 1, hangar: 1, office: 1 };

  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function M() { return typeof BridgeMulti !== 'undefined' ? BridgeMulti : null; }
  function me() { var n = N(); return n && n.me(); }
  function cap(t) { return M() ? M().cap(t) : String(t || ''); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function state() { return typeof BridgeState !== 'undefined' ? BridgeState.getState() : ''; }
  function worldId() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }
  function sailing() { return typeof BridgeSloop !== 'undefined' && BridgeSloop.isRunning && BridgeSloop.isRunning(); }
  function hashFrac(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }

  // ---- the party ---------------------------------------------------------------------------------------------------
  function load() { try { var p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; p.members = p.members || {}; return p; } catch (e) { return { members: {} }; } }
  function store(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* private mode */ } }
  function has(id) { return !!(id && load().members[id]); }
  function list() {
    var m = load().members, n = N();
    return Object.keys(m).map(function (id) { return { id: id, name: m[id].name, since: m[id].since, on: !!(n && n.peer(id)) }; });
  }
  function nameOf(id) { var n = N(), p = n && n.peer(id), m = load().members[id]; return cap(p ? p.name : m ? m.name : 'them'); }
  function add(id, name) {
    var mm = me();
    if (!id || (mm && id === mm.id)) return;
    var p = load();
    if (!p.members[id]) p.members[id] = { name: name || nameOf(id), since: Date.now() };
    else if (name) p.members[id].name = name;
    store(p);
  }
  function drop(id) { var p = load(); delete p.members[id]; store(p); }

  function invite(id) {
    var n = N(), m = me();
    if (!n || !m || has(id)) return;
    n.send('party-ask', { name: m.name, with: list().map(function (x) { return { id: x.id, name: x.name }; }) }, id);
    toast('Play together', 'Asking ' + nameOf(id), 'Once they say yes, travel waits for each other');
  }
  function onAsk(d, from) {
    var n = N(), who = cap(d && d.name || nameOf(from));
    if (!d) return;
    if (has(from)) { n.send('party-yes', { name: me() && me().name }, from); return; }      // together already (an answer lost)
    var others = list().filter(function (x) { return x.id !== from && !(d.with || []).some(function (w) { return w.id === x.id; }); });
    whenFree(function () {
      choose({ title: who + ' wants to play together',
               text: ('Travel together: when one of you jumps, takes the shuttle, casts off or climbs down the mine, the other is asked along — ' +
                      'and you can come aboard each other\'s Wayfarer.' + (others.length ? ' You\'ll leave your party with ' + others.map(function (x) { return cap(x.name); }).join(' and ') + '.' : '')).toUpperCase(),
               buttons: [{ label: 'Play together', act: function () { join(from, d); } },
                         { label: 'Not now', act: function () { n.send('party-no', {}, from); } }], closeLabel: 'Not now' });
    });
  }
  function join(from, d) {
    var n = N(), m = me(), theirs = (d.with || []).map(function (w) { return w.id; });
    if (list().some(function (x) { return x.id !== from && theirs.indexOf(x.id) < 0; })) leave(true);   // a party of your own: leave it first
    add(from, d.name);
    (d.with || []).forEach(function (w) { add(w.id, w.name); });
    n.send('party-yes', { name: m && m.name }, from);
    toast('Playing together', 'With ' + cap(d.name), 'Travel waits for each other now');
    sfx('quest');
  }
  // everyone in it told who's in it (the one who asked does this as someone joins)
  function roster() {
    var n = N(), m = me();
    if (!n || !m) return;
    var all = list().map(function (x) { return { id: x.id, name: x.name }; }).concat([{ id: m.id, name: m.name }]);
    list().forEach(function (x) { n.send('party-roster', { members: all }, x.id); });
  }
  function leave(quiet) {
    var n = N(), was = list();
    was.forEach(function (x) { if (n) n.send('party-leave', {}, x.id); });
    store({ members: {} });
    if (D) callOff();
    if (C) { C = null; paintWait(); }
    if (!quiet && was.length) toast('Playing together', 'You left the party', 'You travel on your own again');
  }

  // ---- when they're free to be asked ----------------------------------------------------------------------------------
  // in the world or at the nav chart, no conversation or trade open, no game in the cabinet, not mid-flight
  function free() {
    var s = state();
    if (s !== 'world' && s !== 'starmap') return false;
    if (document.querySelector('.world-dialog') || document.getElementById('trade-panel')) return false;
    if (typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.isOpen && BridgeCabinetModal.isOpen()) return false;
    if (typeof BridgeShip !== 'undefined' && BridgeShip.isBusy && BridgeShip.isBusy()) return false;
    return true;
  }
  function whenFree(f, stale, since) {
    since = since || Date.now();
    if (stale && stale()) return;
    if (free()) { f(); return; }
    if (Date.now() - since > 60000) return;
    setTimeout(function () { whenFree(f, stale, since); }, 500);
  }

  // ---- setting off: the ready check (whoever's going) ------------------------------------------------------------------
  var D = null;            // { cid, spec, d, go, rows: { id: { name, st: asked | coming | ready | no | gone, why } }, timers }
  function what(d) {
    switch (d.kind) {
      case 'jump': return 'jumping to ' + cap(d.toName || d.to);
      case 'down': return 'taking the shuttle down to ' + (typeof BridgeOrbit !== 'undefined' ? BridgeOrbit.placeName(d.loc) : 'the world below');
      case 'up': return 'heading back up to the Wayfarer';
      case 'sail': return 'casting off from ' + (d.place ? cap(d.place) : 'the pier');
      case 'mine': return 'climbing down to floor ' + d.f;
    }
    return 'setting off';
  }
  /** Ask the party before setting off: true while it's asking (go(readyIds) runs when it's time); false to go now. */
  function depart(spec, go) {
    if (D) return true;                                    // already waiting on one
    var n = N(), m = me();
    if (!n || !m || !n.online() || C) return false;
    var on = list().filter(function (x) { return x.on; });
    if (!on.length) return false;
    var cid = rid(), rows = {}, w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld ? BridgeWorld.getWorld() : null;
    var rp = state() === 'world' && typeof BridgeCharacter !== 'undefined' && BridgeCharacter.getRenderPos ? BridgeCharacter.getRenderPos() : null;
    on.forEach(function (x) { rows[x.id] = { name: x.name, st: 'asked' }; });
    var d = Object.assign({ cid: cid, name: m.name, world: state() === 'world' ? worldId() : null, inst: M() ? M().myInst() : null,
                            x: rp ? rp.x : null, y: rp ? rp.y : null, place: w && w.name ? w.name : '' }, spec);
    D = { cid: cid, spec: spec, d: d, go: go, rows: rows, at: Date.now(), timers: [] };
    on.forEach(function (x) { n.send('pcall', d, x.id); });
    lockLeader(true);
    D.timers.push(setTimeout(function () { expire('asked', 'no answer'); }, ASK_MS));
    D.timers.push(setTimeout(function () { expire('coming', 'held up'); }, ARRIVE_MS));
    D.tick = setInterval(paintCheck, 1000);
    paintCheck();
    sfx('blip');
    return true;
  }
  function expire(st, why) {
    if (!D) return;
    Object.keys(D.rows).forEach(function (id) { var r = D.rows[id]; if (r.st === st) { r.st = 'gone'; r.why = why; } });
    check();
  }
  function check() {
    if (!D) return;
    var rows = D.rows, open = Object.keys(rows).filter(function (id) { return rows[id].st === 'asked' || rows[id].st === 'coming'; });
    paintCheck();
    if (!open.length) setTimeout(setOff, 400);              // a moment to read who's coming
  }
  // go, with whoever's ready (the sloop takes one mate)
  function setOff() {
    if (!D) return;
    var n = N(), cur = D, ready = Object.keys(cur.rows).filter(function (id) { return cur.rows[id].st === 'ready'; });
    if (cur.spec.kind === 'sail') ready = ready.slice(0, 1);
    Object.keys(cur.rows).forEach(function (id) {
      if (ready.indexOf(id) >= 0) n.send('pgo', { cid: cur.cid }, id);
      else if (cur.rows[id].st !== 'no') n.send('poff', { cid: cur.cid, why: 'went on without you' }, id);
    });
    end();
    if (ready.length) toast('Setting off', 'With ' + ready.map(nameOf).join(' and '), '');
    setTimeout(function () { cur.go(ready); }, ready.length ? 300 : 0);
  }
  function callOff() {
    if (!D) return;
    var n = N(), cur = D;
    Object.keys(cur.rows).forEach(function (id) { if (n) n.send('poff', { cid: cur.cid, why: 'called it off' }, id); });
    end();
  }
  function end() {
    if (!D) return;
    D.timers.forEach(clearTimeout);
    clearInterval(D.tick);
    D = null;
    lockLeader(false);
    paintCheck();
  }
  // the leader stays put while they wait (in the world; the nav chart has no walking)
  var locked = false;
  function lockLeader(on) {
    if (typeof BridgeControls === 'undefined') return;
    if (on && state() === 'world' && !locked) { locked = true; BridgeControls.disable(); }
    else if (!on && locked) { locked = false; BridgeControls.enable(); }
  }
  // Esc calls it off; nothing else reaches the game while you wait
  window.addEventListener('keydown', function (e) {
    if (D && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); callOff(); return; }
    var typing = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (callEl && callEl.parentNode && !typing) {
      if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') { e.preventDefault(); e.stopPropagation(); callEl.querySelector('.pc-come').click(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); callEl.querySelector('.pc-no').click(); }
    }
  }, true);

  var WORDS = { asked: 'asking…', coming: 'on the way', ready: 'ready', no: 'not this time', gone: '' };
  function paintCheck() {
    var el = document.getElementById('party-check');
    if (!D) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'party-check';
      el.className = 'party-panel';
      el.innerHTML = '<div class="pp-kicker"></div><div class="pp-title"></div><div class="pp-rows"></div>' +
        '<div class="pp-btns"><button type="button" class="pp-go"></button><button type="button" class="pp-off">Call it off</button></div>';
      el.querySelector('.pp-go').addEventListener('click', function () {
        if (!D) return;
        Object.keys(D.rows).forEach(function (id) { var r = D.rows[id]; if (r.st === 'asked' || r.st === 'coming') { r.st = 'gone'; r.why = 'left behind'; } });
        setOff();
      });
      el.querySelector('.pp-off').addEventListener('click', callOff);
      document.body.appendChild(el);
    }
    var rows = D.rows, ids = Object.keys(rows), wait = ids.filter(function (id) { return rows[id].st === 'asked' || rows[id].st === 'coming'; });
    var left = Math.max(0, Math.ceil((ASK_MS - (Date.now() - D.at)) / 1000));
    el.querySelector('.pp-kicker').textContent = 'You\'re ' + what(D.d);
    el.querySelector('.pp-title').textContent = wait.length ? 'Waiting for ' + wait.map(function (id) { return cap(rows[id].name); }).join(' and ') + '…' : 'Setting off…';
    el.querySelector('.pp-rows').innerHTML = ids.map(function (id) {
      var r = rows[id], word = r.st === 'gone' ? r.why || 'not coming' : r.st === 'asked' ? WORDS.asked + ' ' + left + 's' : WORDS[r.st];
      return '<div class="pp-row"><span class="pp-name">' + esc(cap(r.name)) + '</span><span class="pp-st pp-' + r.st + '">' + esc(word) + '</span></div>';
    }).join('');
    var anyReady = ids.some(function (id) { return rows[id].st === 'ready'; });
    el.querySelector('.pp-go').textContent = !wait.length ? 'Go' : anyReady ? 'Go now' : 'Go without them';
  }

  // ---- called: someone in your party is setting off ------------------------------------------------------------------
  var C = null;            // the call you said yes to: { cid, from, d, at, timer }
  var pending = {}, callEl = null;
  function cantCome() {
    if (sailing()) return 'you\'re at sea';
    if (state() === 'travel') return 'you\'re mid-jump';
    if (C) return 'you\'re setting off with ' + nameOf(C.from) + ' already';
    if (D) return 'you\'re setting off yourself';
    return '';
  }
  function onCall(d, from) {
    var n = N();
    if (!d || !d.cid) return;
    if (!has(from)) { n.send('pans', { cid: d.cid, come: false, why: 'not playing together' }, from); return; }
    var why = cantCome();
    if (why) { n.send('pans', { cid: d.cid, come: false, why: why }, from); toast(nameOf(from) + ' is ' + what(d), 'You can\'t come: ' + why, ''); return; }
    var got = Date.now();
    pending[d.cid] = true;
    whenFree(function () { showCall(d, from, got); }, function () { return !pending[d.cid] || Date.now() - got > ASK_MS - 2000; });
  }
  var SUB = {
    jump: function (d) { return 'Your Wayfarer jumps alongside theirs' + (d.stay ? ', and you come aboard theirs.' : ', and you go down together.'); },
    down: function () { return 'Ride down with them — your ship comes too.'; },
    up: function () { return 'Go up with them, aboard their Wayfarer.'; },
    sail: function () { return 'Come aboard as crew — you\'ll be taken to the pier.'; },
    mine: function () { return 'Follow them down to their dig.'; }
  };
  function showCall(d, from, got) {
    hideCall();
    var el = callEl = document.createElement('div');
    el.id = 'party-call';
    el.className = 'party-panel';
    el.innerHTML = '<div class="pp-kicker">Playing together</div><div class="pp-title">' + esc(nameOf(from) + ' is ' + what(d)) + '</div>' +
      '<div class="pp-text">' + esc((SUB[d.kind] || function () { return ''; })(d)) + '</div><div class="pp-bar"><i></i></div>' +
      '<div class="pp-btns"><button type="button" class="pc-come pp-go"><span class="ip-key">E</span> Come</button><button type="button" class="pc-no pp-off">Not this time</button></div>';
    document.body.appendChild(el);
    sfx('blip');
    var bar = el.querySelector('.pp-bar i'), until = got + ASK_MS - 1000;
    var tick = setInterval(function () {
      var f = Math.max(0, (until - Date.now()) / (ASK_MS - 1000));
      bar.style.width = (f * 100).toFixed(1) + '%';
      if (f <= 0 || !pending[d.cid]) { clearInterval(tick); if (callEl === el) hideCall(); }
    }, 200);
    el.querySelector('.pc-come').addEventListener('click', function () { clearInterval(tick); hideCall(); come(d, from); });
    el.querySelector('.pc-no').addEventListener('click', function () { clearInterval(tick); hideCall(); delete pending[d.cid]; N().send('pans', { cid: d.cid, come: false }, from); });
  }
  function hideCall() { if (callEl) { callEl.remove(); callEl = null; } }
  function come(d, from) {
    var n = N();
    delete pending[d.cid];
    var why = cantCome();
    if (why) { n.send('pans', { cid: d.cid, come: false, why: why }, from); return; }
    C = { cid: d.cid, from: from, d: d, at: Date.now() };
    C.timer = setTimeout(function () { if (C && C.cid === d.cid) { C = null; paintWait(); toast('Playing together', nameOf(from) + ' didn\'t set off', ''); } }, FOLLOW_MS);
    if (d.kind === 'sail') {                                         // to their pier first: ready once you're there
      n.send('pans', { cid: d.cid, come: true }, from);
      toPier(d, from);
    } else n.send('pans', { cid: d.cid, come: true, ready: true }, from);
    paintWait();
  }
  function toPier(d, from) {
    var cid = d.cid, sent = false;
    var here = function () { return state() === 'world' && worldId() === d.world && (!M() || M().myInst() === d.inst); };
    if (!here() && M() && d.world) {
      if (state() === 'starmap' && typeof BridgeStarmap !== 'undefined') BridgeStarmap.hide();
      M().travel({ world: d.world, inst: d.inst, x: d.x, y: d.y });
    }
    var poll = setInterval(function () {
      if (!C || C.cid !== cid) { clearInterval(poll); return; }
      if (here() && !sent) { sent = true; clearInterval(poll); N().send('pready', { cid: cid }, from); }
    }, 300);
  }
  function paintWait() {
    var el = document.getElementById('party-wait');
    if (!C) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'party-wait';
      el.className = 'party-panel pp-small';
      el.innerHTML = '<span class="pp-dot"></span><span class="pp-what"></span><button type="button" class="pp-off">Stay behind</button>';
      el.querySelector('.pp-off').addEventListener('click', function () {
        if (!C) return;
        N().send('pans', { cid: C.cid, come: false, why: 'stayed behind' }, C.from);
        clearTimeout(C.timer); C = null; paintWait();
      });
      document.body.appendChild(el);
    }
    el.querySelector('.pp-what').textContent = 'Setting off with ' + nameOf(C.from) + '…';
  }
  // what's in your hands when it's time to go: a conversation, a mode (skiing, a walk aboard), the nav chart
  function clearHands() {
    var dlg = document.querySelector('.world-dialog');
    if (dlg) { var opts = dlg.querySelectorAll('.wd-opt'); if (opts.length) opts[opts.length - 1].click(); }
    if (state() === 'starmap' && typeof BridgeStarmap !== 'undefined') BridgeStarmap.hide();
    if (typeof BridgeWorld !== 'undefined' && BridgeWorld.getMode && BridgeWorld.getMode() && BridgeWorld.setMode) BridgeWorld.setMode(null);
  }
  // time to go: with them, your own way
  function execute(d, from) {
    clearHands();
    switch (d.kind) {
      case 'jump': followJump(d, from); break;
      case 'down':
        if (typeof BridgeShip !== 'undefined') BridgeShip.rideDown(d.loc);
        break;
      case 'up': rideUp(d, from); break;
      case 'sail':
        N().send('sail-yes', { suit: suit() }, from);                // js/sloop.js: they cast off with you as crew
        break;
      case 'mine':
        if (typeof BridgeMine !== 'undefined') BridgeMine.goFloor(d.f, d.v);
        break;
    }
  }
  function suit() { return typeof BridgeCharacter !== 'undefined' && BridgeCharacter.sportKey ? String(BridgeCharacter.sportKey()).replace(/^(sit|ski|climb|walk)-/, '') : 'purple'; }
  function followJump(d, from) {
    var W = typeof BridgeStarmap !== 'undefined' && BridgeStarmap.world ? BridgeStarmap.world(d.to) : null;
    if (!W || typeof BridgeOrbit === 'undefined') return;
    var here = BridgeOrbit.getLocation();
    if (here === (W.loc || W.id)) {                                  // your ship's there already: meet them
      if (!d.stay || !aboard(from, 'bridge', { x: 11, y: 10 })) { if (typeof BridgeShip !== 'undefined') BridgeShip.rideDown(W.loc || W.id); }
      return;
    }
    BridgeOrbit.setLocation(W.id);
    BridgeState.transition('travel', { world: W, from: here, party: [from], follow: { leader: from, stay: !!d.stay } });
  }
  function rideUp(d, from) {
    var loc = typeof BridgeShip !== 'undefined' && BridgeShip.locationOf ? BridgeShip.locationOf(d.world) : null;
    if (loc && typeof BridgeOrbit !== 'undefined') BridgeOrbit.setLocation(loc);
    var fade = typeof BridgeShip !== 'undefined' && BridgeShip.fade ? BridgeShip.fade(true, 450) : Promise.resolve();
    fade.then(function () {
      if (!aboard(from, 'hangar', { x: 9, y: 9 })) {                // they've gone: your own hangar
        BridgeWorld.load('hangar', function () { BridgeState.transition('world', { worldId: 'hangar', spawn: { x: 8, y: 9 } }); if (BridgeShip.fade) BridgeShip.fade(false, 450); });
      }
    });
  }

  // ---- aboard someone's Wayfarer -----------------------------------------------------------------------------------
  var view = null, waits = {};      // what their ship looks like: { owner, decor, crew, games }
  function fetchView(owner) {
    var n = N();
    return new Promise(function (res) {
      if (!n || !n.peer(owner)) { view = { owner: owner, decor: {}, crew: {}, games: {} }; res(); return; }
      var r = rid(), done = false;
      waits[r] = function (v) { if (done) return; done = true; view = { owner: owner, decor: v.decor || {}, crew: v.crew || {}, games: v.games || {} }; res(); };
      n.send('pship?', { rid: r }, owner);
      setTimeout(function () { if (!done) { done = true; delete waits[r]; view = { owner: owner, decor: {}, crew: {}, games: {} }; res(); } }, 2500);
    });
  }
  function own(k) { try { return JSON.parse((window.__lsGet ? window.__lsGet(k) : localStorage.getItem(k)) || '{}') || {}; } catch (e) { return {}; } }
  /** Come aboard `owner`'s Wayfarer, into `world` beside `spot`: true if it's under way (they're in your party and on). */
  function aboard(owner, world, spot) {
    var n = N();
    if (!has(owner) || !n || !n.peer(owner) || typeof BridgePartner === 'undefined' || !BridgePartner.visit) return false;
    fetchView(owner).then(function () {
      BridgePartner.visit(owner, world, function () {
        BridgeWorld.load(world, function (w) {
          BridgeState.transition('world', { worldId: world, spawn: freeNear(w, spot) });
          if (typeof BridgeShip !== 'undefined' && BridgeShip.fade) BridgeShip.fade(false, 450);
          sfx('door');
        });
      });
    });
    return true;
  }
  function freeNear(w, at) {
    if (!at || !w || !w.collisions) return at || null;
    for (var r = 0; r <= 3; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      var x = at.x + dx, y = at.y + dy;
      if (y >= 0 && y < w.height && x >= 0 && x < w.width && w.collisions[y][x] === 0) return { x: x, y: y };
    }
    return at;
  }
  // whose Wayfarer you're aboard, if it isn't yours (js/partner.js's visit, of a ship)
  function shipHost() { var V = typeof BridgePartner !== 'undefined' && BridgePartner._V ? BridgePartner._V() : null; return V && V.ship ? V.owner : null; }
  function hostView() { var h = shipHost(); return h && view && view.owner === h ? view : null; }
  function guestOf() { var h = shipHost(); return h && SHIP[worldId()] ? nameOf(h) : null; }

  // their ship as you see it: decor, crew at their posts, the game room
  if (typeof BridgeCrew !== 'undefined' && BridgeCrew.decorate) {
    var dec0 = BridgeCrew.decorate;
    BridgeCrew.decorate = function (wid, data) { var v = SHIP[wid] && hostView(); return dec0.call(this, wid, data, v ? v.crew : undefined); };
  }
  if (typeof BridgeGames !== 'undefined' && BridgeGames.layers) {
    var lay0 = BridgeGames.layers;
    BridgeGames.layers = function (over) { var v = hostView(); return lay0.call(this, over || (v ? v.games : undefined)); };
  }
  if (typeof BridgeProgression !== 'undefined' && BridgeProgression.getDecor) {
    var dc0 = BridgeProgression.getDecor;
    BridgeProgression.getDecor = function () { var v = hostView(); return v ? Promise.resolve(Object.assign({}, v.decor)) : dc0.apply(this, arguments); };
  }

  // ---- their galleons out of the window -------------------------------------------------------------------------------
  var sprites = {}, cineAsked = false;
  function shipSprite(G, width) {
    if (sprites[width]) return sprites[width];
    var c = document.createElement('canvas'), k = width / G.w;
    c.width = width; c.height = Math.max(1, Math.round(G.h * k));
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(G.img, 0, 0, c.width, c.height);
    var d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    for (var i = 3; i < px.length; i += 4) px[i] = px[i] < 110 ? 0 : 255;          // the edge kept hard, like every sprite
    g.putImageData(d, 0, 0);
    return (sprites[width] = { img: c, w: c.width, h: c.height, k: k, anchors: G.anchors || {} });
  }
  /** js/orbit.js, every window aboard: the galleons of your party parked over the same world (yours, aboard theirs). */
  function drawShips(ctx, x, y, w, h, now, loc) {
    var n = N(), mm = me();
    if (!n || !mm) return;
    var host = shipHost(), mine = typeof BridgeOrbit !== 'undefined' ? BridgeOrbit.getLocation() : null, who = [];
    list().forEach(function (m) { if (!m.on || m.id === host) return; var p = n.peer(m.id); if (p && p.ship === loc) who.push(m.id); });
    if (host && mine === loc) who.push(mm.id);
    if (!who.length) return;
    var G = typeof BridgeCine !== 'undefined' && BridgeCine.get ? BridgeCine.get('mothership') : null;
    if (!G) { if (!cineAsked && typeof BridgeCine !== 'undefined' && BridgeCine.load) { cineAsked = true; BridgeCine.load(); } return; }
    who.forEach(function (id, i) {
      var a = hashFrac(id), b = hashFrac(id + '~');
      var sw = Math.max(18, Math.round(w * (0.15 + 0.06 * a))), sp = shipSprite(G, sw);
      var px = Math.round(x + w * (0.2 + 0.3 * b) + Math.sin(now / 9000 + a * 6) * w * 0.015);
      var py = Math.round(y + h * (0.1 + 0.16 * a) + Math.sin(now / 3100 + i) * 1.2);
      ctx.drawImage(sp.img, px, py);
      ctx.save();                                                    // her keel and engines glowing faintly, a lamp at the masthead
      ctx.globalCompositeOperation = 'lighter';
      for (var e = 0; e < 2; e++) {
        var an = sp.anchors['exhaust_' + e];
        if (an) { ctx.fillStyle = 'rgba(150,140,255,' + (0.5 + 0.3 * Math.sin(now / 240 + e)).toFixed(2) + ')'; ctx.fillRect(Math.round(px + an[0] * sp.k) - 1, Math.round(py + an[1] * sp.k), 2, 1); }
      }
      if (Math.floor(now / 900 + a * 10) % 3 === 0) { ctx.fillStyle = 'rgba(255,90,90,0.9)'; ctx.fillRect(px + Math.round(sp.w * 0.46), py, 1, 1); }
      ctx.restore();
    });
  }

  // ---- menus and the pill -------------------------------------------------------------------------------------------
  function partyCard() {
    var L = list();
    choose({ title: 'Your party', text: L.length ? 'WHEN ONE OF YOU SETS OFF, THE OTHERS ARE ASKED ALONG. YOU CAN COME ABOARD EACH OTHER\'S WAYFARER.' : 'NOBODY YET.',
             rows: L.map(function (x) {
               var p = N() && N().peer(x.id);
               return { label: cap(x.name), sub: x.on ? (M() ? M().placeOf(p) : '') || 'online' : 'offline', note: x.on ? 'play a game' : '', disabled: !x.on,
                        pick: function () { if (typeof BridgeTogether !== 'undefined' && BridgeTogether.pick) BridgeTogether.pick(x.id); return false; } };
             }),
             buttons: [{ label: 'Leave the party', disabled: !L.length, act: function () { leave(); } },
                       { label: 'Back', act: function () { if (M()) M().panel(); return false; } }], closeLabel: 'Done' });
  }
  if (M()) {
    M().addMenu(function (id, p) {
      if (has(id)) return [{ label: 'Playing together ✓', disabled: true }, { label: 'Leave the party', act: function () { leave(); } }];
      return p ? [{ label: 'Invite to play together', act: function () { invite(id); } }] : [];
    });
    M().addPanel(function () {
      var L = list();
      return L.length ? [{ label: 'Your party (' + L.map(function (x) { return cap(x.name); }).join(', ') + ')', act: function () { partyCard(); return false; } }] : [];
    });
    var fr0 = M().friends;                                         // your party on the pill when they're off, like partners
    M().friends = function () {
      var a = fr0 ? fr0() || [] : [];
      list().forEach(function (x) { if (!a.some(function (f) { return f.id === x.id; })) a.push({ id: x.id, name: x.name }); });
      return a;
    };
    // going to someone aboard their Wayfarer: what it looks like first
    var gv0 = M().guard.visit;
    if (gv0) M().guard.visit = function (owner, world, go) { if (SHIP[world] && has(owner)) fetchView(owner).then(function () { gv0(owner, world, go); }); else gv0(owner, world, go); };
  }
  setInterval(function () {
    var el = document.getElementById('mp-pill');
    if (el) el.classList.toggle('party', list().some(function (x) { return x.on; }));
    var n = N();
    if (n && me() && typeof BridgeOrbit !== 'undefined') n.set({ ship: BridgeOrbit.getLocation() });   // where your galleon is parked
  }, 1500);

  // ---- the wire ----------------------------------------------------------------------------------------------------
  function wire() {
    var n = N();
    if (!n) return;
    n.on('party-ask', onAsk);
    n.on('party-yes', function (d, from) { add(from, d && d.name); roster(); toast('Playing together', 'With ' + nameOf(from), 'Travel waits for each other now'); sfx('quest'); });
    n.on('party-no', function (d, from) { toast('Play together', nameOf(from) + ' said not now', ''); });
    n.on('party-roster', function (d, from) {
      if (!d || !has(from)) return;
      var m = me();
      (d.members || []).forEach(function (x) { if (!m || x.id !== m.id) add(x.id, x.name); });
    });
    n.on('party-leave', function (d, from) {
      if (!has(from)) return;
      var who = nameOf(from);
      drop(from);
      toast('Playing together', who + ' left the party', '');
      if (D && D.rows[from]) { D.rows[from].st = 'gone'; D.rows[from].why = 'left the party'; check(); }
      if (C && C.from === from) { clearTimeout(C.timer); C = null; paintWait(); }
    });
    n.on('pcall', onCall);
    n.on('pans', function (d, from) {
      if (!D || !d || d.cid !== D.cid || !D.rows[from]) return;
      var r = D.rows[from];
      r.st = d.come ? (d.ready ? 'ready' : 'coming') : 'no';
      if (!d.come && d.why) { r.st = 'gone'; r.why = d.why; }
      check();
    });
    n.on('pready', function (d, from) { if (D && d && d.cid === D.cid && D.rows[from]) { D.rows[from].st = 'ready'; check(); } });
    n.on('pgo', function (d, from) {
      if (!C || !d || d.cid !== C.cid || C.from !== from) return;
      var c = C;
      clearTimeout(c.timer); C = null; paintWait(); hideCall();
      execute(c.d, from);
    });
    n.on('poff', function (d, from) {
      if (!d) return;
      if (pending[d.cid]) { delete pending[d.cid]; hideCall(); }
      if (C && C.cid === d.cid) { clearTimeout(C.timer); C = null; paintWait(); toast('Playing together', nameOf(from) + ' ' + (d.why || 'went on'), ''); }
    });
    n.on('pship?', function (d, from) {
      if (!d || !has(from)) return;
      var send = function (decor) { n.send('pship', { rid: d.rid, decor: decor || {}, crew: own('bridge_crew'), games: own('bridge_games') }, from); };
      if (typeof BridgeProgression !== 'undefined' && dc0) dc0.call(BridgeProgression).then(send, function () { send({}); });
      else send({});
    });
    n.on('pship', function (d) { var f = d && waits[d.rid]; if (f) { delete waits[d.rid]; f(d); } });
    n.on('join', function (p, id) { if (has(id)) setTimeout(function () { toast('Playing together', nameOf(id) + ' is on', 'You\'re still a party'); }, 400); });
    n.on('leave', function (p, id) {
      if (D && D.rows[id] && (D.rows[id].st === 'asked' || D.rows[id].st === 'coming')) { D.rows[id].st = 'gone'; D.rows[id].why = 'went offline'; check(); }
      if (C && C.from === id) { clearTimeout(C.timer); C = null; paintWait(); toast('Playing together', nameOf(id) + ' went offline', 'You stay where you are'); }
    });
  }
  wire();

  return { has: has, list: list, invite: invite, leave: leave, depart: depart, aboard: aboard, guestOf: guestOf, drawShips: drawShips,
           _D: function () { return D; }, _C: function () { return C; }, _view: function () { return view; } };
})();
