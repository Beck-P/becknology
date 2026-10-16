/**
 * BridgeMulti — playing together (on js/net.js). Whoever else is signed in and in the same place shows up: walking,
 * sitting, in their own suit, a name over their head. Walk up to them (E) for the menu — wave, send a heart, say
 * something; give, trade and write letters (js/trade-gift.js); make partners (js/partner.js). The players pill
 * (top left, while anyone else is online) says who's on and where; from it you can go to them.
 *
 * Personal places — your homes, your island, the Wayfarer — are one copy per owner: two pilots in "the cottage" are
 * each in their own unless one is visiting the other's (`visiting`, set by js/partner.js), so `inst(worldId)` is the
 * world plus whose it is, and only pilots in the same instance see each other.
 *
 * On the wire: presence meta { name, key (suit sheet), inst, world, place, act, sea }; broadcast 'pos' { i (inst),
 * x, y, f, k, mv } at most ten times a second while you move (and every two seconds standing still) and only when
 * someone's in the same place; 'hi' { i } on arriving (they answer with where they are); 'emote' { k }; 'say' { t };
 * 'where' / 'here' { world, inst, x, y } for going to someone.
 */
var BridgeMulti = (function () {
  var PERSONAL = { bridge: 1, quarters: 1, gameroom: 1, hangar: 1, 'lumar-home': 1, 'arcadia-home': 1, 'verdance-home': 1, 'lumar-holm-home': 1, 'lumar-holm': 1 };
  var DIR_ROW = { down: 0, right: 1, up: 2, left: 3 }, IDLE = [0, 1, 2, 1];
  var others = {}, visiting = null, lastInst = null, sentAt = 0, sentJson = '', metaAt = 0, layer = null, tags = {}, pill = null, selfTag = null;
  var last = performance.now(), gone = {};

  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function me() { var n = N(); return n && n.me(); }
  function inWorld() { return typeof BridgeState !== 'undefined' && BridgeState.getState() === 'world' && typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld(); }
  function worldId() { return inWorld() ? BridgeWorld.getWorldId() : null; }
  function inst(wid, owner) {
    if (!wid) return null;
    if (/^lumar-rose-mine-[abc]$/.test(wid) && typeof BridgeMine !== 'undefined' && BridgeMine.party) return wid + '#' + BridgeMine.party();
    if (!PERSONAL[wid]) return wid;
    var m = me();
    return wid + '@' + (owner || visiting || (m && m.id) || '');
  }
  function myInst() { return inst(worldId()); }
  function cap(t) { return String(t || '').toLowerCase().replace(/(^|\s|-)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function suitKey() {
    if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.sportKey) return 'purple';
    return String(BridgeCharacter.sportKey()).replace(/^(sit|ski|climb|walk)-/, '');
  }

  // ---- what you're up to (your presence) -----------------------------------------------------------------------------
  function activity() {
    if (typeof BridgeSloop !== 'undefined' && BridgeSloop.isRunning && BridgeSloop.isRunning()) return 'sailing';
    if (typeof BridgeVoyage !== 'undefined' && BridgeVoyage.covers && BridgeVoyage.covers()) return 'sailing';
    var s = typeof BridgeState !== 'undefined' ? BridgeState.getState() : '';
    if (s !== 'world') return s === 'intro' || s === 'identity' ? 'arriving' : 'aboard';
    if (typeof BridgeFishing !== 'undefined' && BridgeFishing.isOpen && BridgeFishing.isOpen()) return 'fishing';
    if (typeof BridgeCharacter !== 'undefined' && BridgeCharacter.isSeated && BridgeCharacter.isSeated()) return 'sitting';
    return 'exploring';
  }
  var DOING = { sailing: 'out sailing', fishing: 'fishing', sitting: 'sitting down', exploring: 'exploring', aboard: 'aboard the Wayfarer', arriving: 'just arriving' };
  function placeOf(p) {
    if (!p) return '';
    if (p.act === 'sailing') return p.sea ? 'at sea, bound for ' + p.sea : 'at sea';
    if (p.act === 'aboard') return 'aboard the Wayfarer';
    return p.place || '';
  }
  function updateMeta() {
    var n = N();
    if (!n) return;
    var w = BridgeWorld && BridgeWorld.getWorld && BridgeWorld.getWorld(), act = activity(), sea = null;
    if (act === 'sailing' && typeof BridgeSloop !== 'undefined' && BridgeSloop.course) {
      var to = BridgeSloop.course(), I = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles || {};
      sea = to && I[to] ? I[to].name : null;
    }
    var st = typeof BridgeInventory !== 'undefined' && BridgeInventory.getStats ? BridgeInventory.getStats() : null;
    n.set({ key: suitKey(), world: worldId(), inst: myInst(), place: inWorld() && w ? cap(w.name) : '', act: act, sea: sea, visiting: visiting || null,
            hp: st && st.maxHP ? Math.round(st.hp / st.maxHP * 100) : 100 });
  }

  // ---- other pilots, here --------------------------------------------------------------------------------------------
  function avatar(id) {
    var p = N() && N().peer(id);
    return others[id] || (others[id] = { id: id, name: p ? p.name : 'Someone', x: 0, y: 0, tx: 0, ty: 0, f: 'down', k: 'purple', mv: false, stride: 0, seen: 0, fresh: true });
  }
  function onPos(d, from) {
    if (!d || d.i !== myInst()) return;
    var a = avatar(from), p = N().peer(from);
    if (p) a.name = p.name;
    a.tx = d.x; a.ty = d.y; a.f = d.f || 'down'; a.k = d.k || 'purple'; a.mv = !!d.mv; a.seen = performance.now(); a.metaT = p ? p.t : null;
    if (a.fresh) { a.x = d.x; a.y = d.y; a.fresh = false; }
  }
  // gone: nothing from them for 9 s, or they say they're somewhere else — at once if they've said so since their last
  // step here, else (presence lagging behind their own position messages, which are tagged with this place) after 3 s
  function prune(now) {
    var here = myInst(), n = N();
    Object.keys(others).forEach(function (id) {
      var a = others[id], p = n && n.peer(id), elsewhere = !p || (p.inst && p.inst !== here);
      if (!here || now - a.seen > 9000 || (elsewhere && (now - a.seen > 3000 || (p && p.t !== a.metaT)))) drop(id);
    });
  }
  function drop(id) {
    delete others[id];
    if (tags[id]) { tags[id].remove(); delete tags[id]; }
    var w = BridgeWorld.getWorld && BridgeWorld.getWorld();
    if (w && w.interactions) w.interactions = w.interactions.filter(function (i) { return !(i.type === 'player' && i.pid === id); });
  }

  // you, on the wire: where you are while someone else is in the same place
  function sendPos(now) {
    var n = N(), here = myInst();
    if (!n || !n.online() || !here) return;
    var anyone = n.peers().some(function (p) { return p.inst === here; });
    if (!anyone) return;
    var rp = BridgeCharacter.getRenderPos(), body = { i: here, x: Math.round(rp.x * 100) / 100, y: Math.round(rp.y * 100) / 100, f: BridgeCharacter.getFacing(),
      k: String(BridgeCharacter.sportKey()).replace(/^(ski|climb)-/, ''), mv: !!(BridgeCharacter.isMoving && BridgeCharacter.isMoving()) };
    var json = JSON.stringify(body);
    if ((json !== sentJson && now - sentAt > 100) || now - sentAt > 2000) { n.send('pos', body); sentJson = json; sentAt = now; }
  }

  function step(dt) {
    Object.keys(others).forEach(function (id) {
      var a = others[id], dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d > 4) { a.x = a.tx; a.y = a.ty; return; }
      var mv = Math.min(d, Math.max(4.5, d * 9) * dt);
      if (d > 0.001) { a.x += dx / d * mv; a.y += dy / d * mv; a.stride += mv; }
      a.walking = d > 0.03 || a.mv;
    });
  }

  // in the scene, sorted with everyone else and depth-tested against the render like you are
  function items(world, offX, offY, ts, now, sc) {
    if (!sc || typeof BridgeScene === 'undefined') return [];
    return Object.keys(others).map(function (id) {
      var a = others[id], footRow = a.y + 1 - 3 / 32;
      return { footRow: footRow, draw: function (ctx) {
        var img = BridgeCharacter.sportImage(a.k);
        if (!img) return;
        var seated = /^sit-/.test(a.k);
        var col = a.walking && !seated ? 4 + Math.floor(a.stride / 0.3) % 8 : IDLE[Math.floor(now / 340) % IDLE.length];
        var cx = Math.round(offX + (a.x + 0.5) * ts), footY = Math.round(offY + footRow * ts);
        BridgeScene.drawOccluded(ctx, sc, img, col * 32, (DIR_ROW[a.f] || 0) * 48, 32, 48, cx - 16, footY - 45, footRow, offX, offY,
          BridgeScene.tintAt(sc, world, a.x, a.y, now), { x: cx, y: footY, rx: 9, ry: 3 });
      } };
    });
  }

  // walk up to them: a prompt like anyone else's (interactions.js runs 'player' through BridgeMulti.menu)
  function syncTargets() {
    var w = BridgeWorld.getWorld && BridgeWorld.getWorld();
    if (!w || !w.interactions) return;
    Object.keys(others).forEach(function (id) {
      var a = others[id], it = null;
      for (var i = 0; i < w.interactions.length; i++) if (w.interactions[i].type === 'player' && w.interactions[i].pid === id) { it = w.interactions[i]; break; }
      if (!it) { it = { type: 'player', pid: id, label: String(a.name).toUpperCase(), prompt: 'PRESS E TO MEET' }; w.interactions.push(it); }
      it.x = Math.round(a.x); it.y = Math.round(a.y + 0.2); it.label = String(a.name).toUpperCase();
      it.prompt = (api.promptFor && api.promptFor(id)) || 'PRESS E TO MEET';      // someone down: help them up (js/fight.js)
    });
  }

  // ---- names and bubbles over heads (the DOM, placed from the world's screen view each frame) --------------------
  function ensureLayer() {
    if (layer) return layer;
    layer = document.createElement('div'); layer.id = 'mp-layer';
    document.body.appendChild(layer);
    return layer;
  }
  function tagFor(id, name) {
    if (tags[id]) return tags[id];
    var t = document.createElement('div');
    t.className = 'mp-tag' + (id === 'self' ? ' self' : '');
    t.innerHTML = '<div class="mp-bubble"></div>' + (id === 'self' ? '' : '<div class="mp-name"></div>');
    if (id !== 'self') t.querySelector('.mp-name').textContent = name;
    ensureLayer().appendChild(t);
    return (tags[id] = t);
  }
  var bubbles = {};                                    // id or 'self' -> { html, until }
  function bubble(id, html, ms) { bubbles[id] = { html: html, until: performance.now() + (ms || 2600), at: performance.now() }; }
  function placeTags(now) {
    var sv = inWorld() && BridgeWorld.getScreenView ? BridgeWorld.getScreenView() : null;
    if (layer) layer.style.display = sv && sv.ts ? '' : 'none';
    if (!sv || !sv.ts) return;
    var k = sv.ts / 32;
    var place = function (id, x, y, name) {
      var t = tagFor(id, name), b = bubbles[id], bel = t.querySelector('.mp-bubble');
      var show = b && now < b.until;
      if (show && bel.getAttribute('data-at') !== String(b.at)) { bel.innerHTML = b.html; bel.setAttribute('data-at', String(b.at)); }
      t.classList.toggle('talking', !!show);
      t.classList.toggle('down', id !== 'self' && !!(api.isDown && api.isDown(id)));
      if (id !== 'self') health(t, id);
      var tg = typeof BridgeInteractions !== 'undefined' && BridgeInteractions.getTarget && BridgeInteractions.getTarget();
      t.classList.toggle('targeted', !!(tg && tg.type === 'player' && tg.pid === id));   // the prompt says their name already
      if (id === 'self' && !show) { t.style.display = 'none'; return; }
      t.style.display = '';
      var cx = sv.offX + (x + 0.5) * sv.ts, top = sv.offY + (y + 1 - 3 / 32) * sv.ts - 46 * k;
      t.style.transform = 'translate3d(' + Math.round(cx) + 'px,' + Math.round(top) + 'px,0) translate(-50%,-100%)';
    };
    Object.keys(others).forEach(function (id) { var a = others[id]; place(id, a.x, a.y, a.name); });
    if (typeof BridgeCharacter !== 'undefined') { var rp = BridgeCharacter.getRenderPos(); place('self', rp.x, rp.y, ''); }
  }

  // their health under their name, while they're hurt (presence `hp`, a percentage, sent as it changes)
  function health(t, id) {
    var p = N() && N().peer(id), hp = p && typeof p.hp === 'number' ? p.hp : 100, bar = t.querySelector('.mp-hp');
    if (hp >= 100) { if (bar) bar.style.display = 'none'; return; }
    if (!bar) { bar = document.createElement('div'); bar.className = 'mp-hp'; bar.innerHTML = '<i></i>'; t.appendChild(bar); }
    bar.style.display = '';
    var fill = bar.firstChild, w = Math.max(0, Math.min(100, hp)) + '%';
    if (fill.style.width !== w) { fill.style.width = w; fill.className = hp < 34 ? 'low' : ''; }
  }

  // ---- emotes and saying something ----------------------------------------------------------------------------------
  var EMOTES = { wave: '<span class="mp-emo">👋</span>', heart: '<span class="mp-emo mp-heart">♥</span>' };
  function emote(k) {
    if (!EMOTES[k]) return;
    bubble('self', EMOTES[k]);
    if (N()) N().send('emote', { k: k, i: myInst() });
    sfx(k === 'heart' ? 'pickup' : 'blip');
  }
  function say(text) {
    text = String(text || '').trim().slice(0, 90);
    if (!text) return;
    bubble('self', esc(text), 5200);
    if (N()) N().send('say', { t: text, i: myInst() });
  }
  function heard(id, html, ms, plain) {
    if (others[id]) bubble(id, html, ms);
    else {                                                           // somewhere else: it comes as a note
      var p = N() && N().peer(id);
      toast(p ? p.name : 'Someone', plain, '');
    }
  }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }

  // ---- the menu: walking up to someone ------------------------------------------------------------------------------
  var extras = [];                                    // other modules add their buttons: fn(id, peer) -> [{label, act}] (give, trade, partners)
  function addMenu(fn) { extras.push(fn); }
  function menu(id) {
    if (api.direct && api.direct(id)) return;            // a module acts on them straight away (js/fight.js: help them up)
    var p = N() && N().peer(id), name = p ? p.name : (others[id] && others[id].name) || 'Them';
    var buttons = [
      { label: 'Wave', act: function () { emote('wave'); } },
      { label: 'Send a heart', act: function () { emote('heart'); } },
      { label: 'Say something', act: function () { sayBox(id); return false; } }
    ];
    extras.forEach(function (f) { try { buttons = buttons.concat(f(id, p) || []); } catch (e) { /* */ } });
    choose({ title: cap(name), text: (cap(name) + ' is ' + (DOING[p && p.act] || 'here') + '.').toUpperCase(), buttons: buttons, closeLabel: 'Done' });
  }
  function sayBox(id) {
    choose({ title: 'Say something', text: 'THEY\'LL SEE IT OVER YOUR HEAD.', input: { placeholder: 'Hi!', max: 90, button: 'Say', submit: function (v) { say(v); } },
             buttons: [{ label: 'Back', act: function () { if (id) menu(id); else panel(); return false; } }] });
  }
  function choose(spec) { if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.choose) BridgeInteractions.choose(spec); }

  // ---- the players pill and panel -----------------------------------------------------------------------------------
  function ensurePill() {
    if (pill) return pill;
    pill = document.createElement('button');
    pill.id = 'mp-pill'; pill.type = 'button';
    pill.addEventListener('click', function (e) { e.preventDefault(); panel(); });
    document.body.appendChild(pill);
    return pill;
  }
  // partners who aren't on (js/partner.js sets `friends`): still on the pill, for their places and letters
  function away() {
    var n = N(), on = n ? n.peers().map(function (p) { return p.id; }) : [];
    return (api.friends ? api.friends() : []).filter(function (f) { return on.indexOf(f.id) < 0; });
  }
  function paintPill() {
    var n = N(), list = n ? n.peers() : [], off = away(), el = ensurePill(), show = inWorld() && (list.length || off.length);
    el.style.display = show ? 'flex' : 'none';
    if (!show) return;
    var first = list[0], html = first
      ? '<span class="mp-dot"></span><span class="mp-who">' + esc(cap(first.name)) + '</span><span class="mp-where">' + esc(placeOf(first)) + '</span>' +
        (list.length > 1 ? '<span class="mp-more">+' + (list.length - 1) + '</span>' : '')
      : '<span class="mp-dot off"></span><span class="mp-who">' + esc(cap(off[0].name)) + '</span><span class="mp-where">offline</span>';
    if (el.getAttribute('data-html') !== html) { el.innerHTML = html; el.setAttribute('data-html', html); }
  }
  var panelExtras = [];                               // other modules: fn() -> [{label, act}] (letters, partner places)
  function addPanel(fn) { panelExtras.push(fn); }
  function panel() {
    var n = N(), list = n ? n.peers() : [];
    var rows = list.map(function (p) {
      return { label: cap(p.name), sub: placeOf(p) + ' · ' + (DOING[p.act] || 'online'), note: others[p.id] ? 'here' : '', pick: function () { peerCard(p.id); return false; } };
    }).concat(away().map(function (f) {
      return { label: cap(f.name), sub: 'offline', note: '♥', pick: function () { peerCard(f.id); return false; } };
    }));
    var buttons = [{ label: 'Wave', act: function () { emote('wave'); } }, { label: 'Say something', act: function () { sayBox(null); return false; } }];
    panelExtras.forEach(function (f) { try { buttons = buttons.concat(f() || []); } catch (e) { /* */ } });
    choose({ title: 'Who\'s on', text: rows.length ? null : 'NOBODY ELSE IS ON RIGHT NOW.', rows: rows, buttons: buttons, closeLabel: 'Done' });
  }
  function peerCard(id) {
    var p = N() && N().peer(id);
    if (!p) {                                         // a partner who's away: their places, a letter
      var f = away().filter(function (x) { return x.id === id; })[0];
      if (!f) { panel(); return; }
      var bs = [];
      extras.forEach(function (fn) { try { bs = bs.concat(fn(id, null, true) || []); } catch (e) { /* */ } });
      bs.push({ label: 'Back', act: function () { panel(); return false; } });
      choose({ title: cap(f.name), text: (cap(f.name) + ' isn\'t on right now.').toUpperCase(), buttons: bs, closeLabel: 'Done' });
      return;
    }
    var buttons = [], why = canGo(p);
    if (others[id]) buttons.push({ label: 'Walk over', act: function () { menu(id); return false; } });
    else buttons.push({ label: why ? 'Go to ' + cap(p.name) + ' (' + why + ')' : 'Go to ' + cap(p.name), disabled: !!why, act: function () { goTo(id); } });
    buttons.push({ label: 'Wave', act: function () { emote('wave'); } });
    buttons.push({ label: 'Send a heart', act: function () { emote('heart'); } });
    extras.forEach(function (f) { try { buttons = buttons.concat(f(id, p, true) || []); } catch (e) { /* */ } });
    buttons.push({ label: 'Back', act: function () { panel(); return false; } });
    choose({ title: cap(p.name), text: (cap(p.name) + ' is ' + (DOING[p.act] || 'online') + (placeOf(p) ? ' — ' + placeOf(p) : '') + '.').toUpperCase(), buttons: buttons, closeLabel: 'Done' });
  }

  // ---- going to someone: ask where exactly, load their world, step in beside them ------------------------------------
  var goGuard = {};                                   // other modules decide about personal places (js/partner.js)
  function canGo(p) {
    if (!p || !p.world) return p && p.act === 'sailing' ? 'at sea' : 'not ashore';
    if (p.act === 'sailing') return 'at sea';
    if (typeof BridgeSloop !== 'undefined' && BridgeSloop.isRunning && BridgeSloop.isRunning()) return 'you\'re at sea';
    if (!inWorld()) return 'land first';
    if (PERSONAL[p.world]) { var g = goGuard.personal; return g ? g(p) : 'their place'; }
    return '';
  }
  var asking = null;
  function goTo(id) {
    var n = N(), p = n && n.peer(id);
    if (!p || canGo(p)) return;
    asking = { id: id, at: Date.now() };
    n.send('where', {}, id);
    setTimeout(function () { if (asking && asking.id === id) { var q = n.peer(id); asking = null; if (q && q.world) travel({ world: q.world, inst: q.inst, x: null, y: null, owner: q.inst && q.inst.split('@')[1] }); } }, 2500);
  }
  function travel(at) {
    var dig = /#(\d+)\.(\d+)$/.exec(at.inst || '');            // down the mine: their floor, their dig (js/mine.js)
    if (dig && typeof BridgeMine !== 'undefined') { BridgeMine.goFloor(+dig[1], +dig[2]); return; }
    var owner = at.inst && at.inst.indexOf('@') > 0 ? at.inst.split('@')[1] : null, m = me();
    var go = function () {
      BridgeWorld.load(at.world, function (w) {
        var spot = near(w, at.x, at.y);
        BridgeState.transition('world', { worldId: at.world, spawn: spot });
        sfx('door');
      });
    };
    if (owner && m && owner !== m.id && goGuard.visit) goGuard.visit(owner, at.world, go);   // their place: js/partner.js loads it
    else { if (owner && m && owner === m.id) visiting = null; go(); }
  }
  // a free tile next to (x, y), or the world's own spawn
  function near(w, x, y) {
    if (x == null || !w || !w.collisions) return null;
    var cx = Math.round(x), cy = Math.round(y + 0.2), best = null;
    for (var r = 1; r <= 4 && !best; r++) {
      var ring = [];
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push([dx, dy]);
      // beside them first, then in front, then behind (where they'd hide you)
      ring.sort(function (a, b) { var k = function (p) { return (p[1] === 0 ? 0 : p[1] > 0 ? 1 : 2) * 10 + Math.abs(p[0]); }; return k(a) - k(b); });
      for (var i = 0; i < ring.length && !best; i++) {
        var tx = cx + ring[i][0], ty = cy + ring[i][1];
        if (ty >= 0 && ty < w.height && tx >= 0 && tx < w.width && w.collisions[ty][tx] === 0) best = { x: tx, y: ty };
      }
    }
    return best;
  }

  // ---- the loop -----------------------------------------------------------------------------------------------------
  function frame() {
    requestAnimationFrame(frame);
    var now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    var here = myInst();
    if (here !== lastInst) {                         // arrived somewhere: say hello, forget whoever was where you were
      Object.keys(others).forEach(drop);
      lastInst = here;
      if (here && N()) N().send('hi', { i: here });
      updateMeta();
    }
    if (now - metaAt > 700) { metaAt = now; updateMeta(); paintPill(); }
    if (here) {
      sendPos(now);
      step(dt);
      prune(now);
      syncTargets();
    }
    placeTags(now);
  }

  function wire() {
    var n = N();
    if (!n) return;
    n.on('pos', onPos);
    n.on('clue', onClue);
    n.on('hi', function (d) { if (d && d.i === myInst()) { sentJson = ''; sentAt = 0; } });
    n.on('emote', function (d, from) { if (d && EMOTES[d.k]) heard(from, EMOTES[d.k], 2600, d.k === 'heart' ? 'sent you a heart ♥' : 'waves'); });
    n.on('say', function (d, from) { if (d && d.t) { heard(from, esc(d.t), 5200, '“' + d.t + '”'); if (typeof BridgeQuests !== 'undefined' && BridgeQuests.note && others[from]) { /* in person: not logged */ } } });
    n.on('where', function (d, from) {
      var rp = inWorld() ? BridgeCharacter.getRenderPos() : null;
      n.send('here', { world: worldId(), inst: myInst(), x: rp ? rp.x : null, y: rp ? rp.y : null }, from);
    });
    n.on('here', function (d, from) { if (asking && asking.id === from && d && d.world) { asking = null; travel(d); } });
    // a dropped connection coming straight back isn't news
    n.on('join', function (p, id) { if (p && p.name && !(gone[id] && Date.now() - gone[id] < 90000)) { toast('Online', cap(p.name), placeOf(p) || 'just arrived'); sfx('blip'); } });
    n.on('leave', function (p, id) { gone[id] = Date.now(); drop(id); });
    n.on('peers', paintPill);
  }

  // ---- found together: a clue you find with someone beside you (6 tiles) counts for them too ---------------------------
  function shareClues() {
    if (typeof BridgeQuests === 'undefined' || !BridgeQuests.onInteract || BridgeQuests.__shared) return;
    var on0 = BridgeQuests.onInteract;
    BridgeQuests.onInteract = function (worldId, inter) {
      var before = BridgeQuests.found().length;
      on0.apply(this, arguments);
      if (sharing || !inter || BridgeQuests.found().length === before || typeof BridgeCharacter === 'undefined') return;
      var here = myInst(), rp = BridgeCharacter.getRenderPos(), n = N();
      Object.keys(others).forEach(function (id) {
        var a = others[id];
        if (n && Math.hypot(a.x - rp.x, a.y - rp.y) <= 6) n.send('clue', { w: worldId, label: inter.label, i: here }, id);
      });
    };
    BridgeQuests.__shared = true;
  }
  var sharing = false;
  function onClue(d, from) {
    if (!d || !d.label || typeof BridgeQuests === 'undefined') return;
    var before = BridgeQuests.found().length;
    sharing = true;
    try { BridgeQuests.onInteract(d.w, { label: d.label }); } finally { sharing = false; }
    if (BridgeQuests.found().length > before) { var p = N() && N().peer(from); toast('Found together', 'With ' + cap(p ? p.name : 'your mate'), 'It\'s in your journal too'); }
  }
  shareClues();

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { items: items });
  wire();
  requestAnimationFrame(frame);

  var api = { menu: menu, panel: panel, emote: emote, say: say, inst: inst, myInst: myInst, PERSONAL: PERSONAL, addMenu: addMenu, addPanel: addPanel,
           guard: goGuard, travel: travel, visiting: function () { return visiting; }, setVisiting: function (id) { visiting = id || null; },
           others: function () { return others; }, cap: cap, placeOf: placeOf, friends: null,
           promptFor: null, direct: null, isDown: null };   // js/fight.js: a downed partner's prompt, helping them up
  return api;
})();
