/**
 * BridgeQuests — threads of story found by exploring.
 *
 * A quest (assets/quests.json) is a set of clues, each tied to an
 * interaction somewhere in the worlds ({world, label}). Using that
 * interaction finds the clue: the first clue starts the quest, the last
 * completes it and pays its reward (BridgeProgression.recordAchievement,
 * once per pilot). Order doesn't matter — you piece it together however
 * you wander — unless a clue says `after: <clue id>` (or a list of them),
 * when it only counts once those are found. A quest with `needs: <quest id>`
 * doesn't begin until that quest is done (a sequel). A clue with `say` has
 * its moment shown in place of the thing's usual words as it's found
 * (js/interactions.js). Progress is kept in localStorage.
 *
 * UI: a toast under the place label when something is found, and the
 * journal — the game menu's Journal tab (J, or the Menu pill; js/menu.js):
 * Next up (what to do now: the quests under way and where their missing
 * clues are, takings, the farm, who here you haven't met, the ways on you
 * haven't taken), every quest begun with its clues found, the log, and the
 * rest of what's yours (crew, businesses, the farm, the fleet...).
 *
 * The log (localStorage bridge_log): what you've done, newest first, at the
 * top of the journal. Every toast lands in it (they all say "J Journal", so
 * the journal has to have it), and so do the first time you set foot in each
 * place (js/world.js) and the first time you meet each person (js/people.js).
 */
var BridgeQuests = (function () {
  var KEY = 'bridge_quests';
  var defs = null;
  var state = {};
  var toastEl = null, toastTimer = null, pill = null;

  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
    return fetch('/bridge/assets/quests.json?v=' + Date.now()).then(function (r) { return r.json(); })
      .then(function (d) { defs = d; }).catch(function () { defs = {}; });
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function progress(id) {
    var q = defs[id], s = state[id] || { clues: {} };
    var n = 0;
    q.clues.forEach(function (c) { if (s.clues[c.id]) n++; });
    return { found: n, total: q.clues.length, done: !!s.done };
  }

  // ---- finding clues ----------------------------------------------------------------------
  function onInteract(worldId, inter) {
    var hits = [];                                 // the clues found just now (js/interactions.js shows a clue's `say`)
    if (!defs || !inter) return hits;
    Object.keys(defs).forEach(function (id) {
      var q = defs[id];
      if (q.needs && !(state[q.needs] && state[q.needs].done)) return;   // a sequel waits for the quest before it
      q.clues.forEach(function (c) {
        var wm = c.on.world;                      // 'lumar-rose-mine-*' matches any of the mine's floors
        if (!(wm === worldId || (wm.slice(-1) === '*' && worldId.indexOf(wm.slice(0, -1)) === 0)) || c.on.label !== inter.label) return;
        if (c.after && ![].concat(c.after).every(function (a) { return state[id] && state[id].clues[a]; })) return;   // only once those are found
        var s = state[id] || (state[id] = { clues: {}, started: Date.now() });
        if (s.clues[c.id]) return;
        var fresh = !Object.keys(s.clues).length;
        s.clues[c.id] = Date.now();
        hits.push(c);
        var p = progress(id);
        if (p.found === p.total && !s.done) {
          s.done = Date.now();
          toast('Quest complete', q.title, '+' + q.reward + ' coins');
          if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('quest');
          if (typeof BridgeProgression !== 'undefined' && BridgeProgression.recordAchievement) {
            BridgeProgression.recordAchievement('quest_' + id, q.reward, { source: 'quest' });
          }
        } else if (fresh) {
          toast('New quest', q.title, q.start);
          if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('clue');
        } else {
          toast('Clue found', q.title, p.found + ' of ' + p.total);
          if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('clue');
        }
        save();
        if (shown()) render();
      });
    });
    return hits;
  }

  // 'quest' — is it done; 'quest/clue' — has that clue been found (people's topics use this: `when`, `until`)
  function has(key) {
    var k = String(key).split('/'), s = state[k[0]];
    return !!(s && (k[1] ? s.clues && s.clues[k[1]] : s.done));
  }

  // ---- the toast ---------------------------------------------------------------------------
  // ---- the log ----------------------------------------------------------------------------------
  var LOG_KEY = 'bridge_log', LOG_MAX = 250, logged = [], logAll = false;
  try { logged = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') || []; } catch (e) { logged = []; }
  var QUIET = { 'Course set': 1, 'Whiteout': 1, 'Online': 1, 'Made room': 1, 'The bells': 1, 'Weather': 1, 'Blizzard': 1 };                   // hints of the moment, not things you did
  function note(kicker, title, sub) {
    if (QUIET[kicker]) return;
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld && BridgeWorld.getWorld(), last = logged[0];
    if (last && last.k === kicker && last.t === title && last.s === (sub || '') && Date.now() - last.at < 10000) return;
    logged.unshift({ at: Date.now(), k: kicker, t: title, s: sub || '', w: (w && w.name) || '' });
    if (logged.length > LOG_MAX) logged.length = LOG_MAX;
    try { localStorage.setItem(LOG_KEY, JSON.stringify(logged)); } catch (e) { /* private mode: this session only */ }
    if (shown()) render();
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
  }
  // the first time you set foot somewhere (js/world.js calls this as each world finishes loading)
  var seen = {};
  try { seen = JSON.parse(localStorage.getItem('bridge_log_seen') || '{}') || {}; } catch (e) { seen = {}; }
  function arrived(worldId, name) {
    if (!worldId || seen[worldId]) return;
    seen[worldId] = Date.now();
    try { localStorage.setItem('bridge_log_seen', JSON.stringify(seen)); } catch (e) { /* private mode */ }
    if (name) setTimeout(function () { note('Arrived', cap(name), ''); }, 50);   // (after the world is current)
  }

  function toast(kicker, title, sub, hint) {
    note(kicker, title, sub);
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'quest-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<div class="qt-kicker">' + esc(kicker) + '</div><div class="qt-title">' + esc(title) + '</div>' +
      (sub ? '<div class="qt-sub">' + esc(sub) + '</div>' : '') + (hint === false ? '' : '<div class="qt-hint"><span class="ip-key">J</span> Journal</div>');
    toastEl.classList.remove('visible');
    void toastEl.offsetWidth;
    toastEl.classList.add('visible');
    if (pill) { pill.classList.remove('ping'); void pill.offsetWidth; pill.classList.add('ping'); }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('visible'); }, 4200);
  }

  function cap(t) { return String(t).toLowerCase().replace(/(^|\s)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function clock(t) { var m = Math.floor(t / 60), sec = t - m * 60; return m + ':' + (sec < 10 ? '0' : '') + sec.toFixed(1); }

  // ---- the journal: a page of the game menu (js/menu.js) ----------------------------------------------------------
  // Two columns on a wide screen: what to do next and your quests on the left, the log and everything else of yours
  // on the right. (Fish and the Collection have tabs of their own.)
  function li(t, cls) { return '<li' + (cls ? ' class="' + cls + '"' : '') + '>' + t + '</li>'; }
  function section(title, count, body, cls) {
    return '<section class="jn-sec' + (cls ? ' ' + cls : '') + '"><div class="jn-sec-head"><span class="jn-sec-title">' + esc(title) + '</span>' +
      (count !== '' && count != null ? '<span class="jn-count">' + count + '</span>' : '') + '</div>' + body + '</section>';
  }
  function M() { return typeof BridgeMap !== 'undefined' ? BridgeMap : null; }
  function placeOf(w) { var m = M(); return m && m.placeName ? m.placeName(w) : cap(String(w).replace(/-/g, ' ')); }
  function beenTo(w) { var m = M(); return w.slice(-1) === '*' ? Object.keys(seen).some(function (k) { return k.indexOf(w.slice(0, -1)) === 0; }) : m && m.visited ? m.visited(w) : !!seen[w]; }
  // where a quest's missing clues are: the places you know by name, the rest as somewhere on an island or a world
  function whereNext(id) {
    var q = defs[id], s = state[id] || { clues: {} }, by = {}, order = [];
    q.clues.forEach(function (c) {
      if (s.clues[c.id]) return;
      var w = c.on.world.slice(-1) === '*' ? c.on.world.slice(0, -2) : c.on.world;
      if (!by[w]) { by[w] = 0; order.push(w); }
      by[w]++;
    });
    return order.map(function (w) {
      var m = M(), known = beenTo(w), name = known ? placeOf(w) : (m && m.regionOf ? 'somewhere on ' + m.regionOf(w) + ' you haven\'t been' : 'somewhere you haven\'t been');
      return { world: w, known: known, text: name + (by[w] > 1 ? ' (' + by[w] + ')' : '') };
    });
  }

  // what to do next: active quests first, then things waiting for you, then where to look round here
  function nextUp() {
    var out = [], wid = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : '', m = M();
    var active = Object.keys(defs || {}).filter(function (id) { return state[id] && !state[id].done; })
      .sort(function (a, b) { return lastFound(b) - lastFound(a); });
    active.slice(0, 3).forEach(function (id) {
      var p = progress(id), w = whereNext(id)[0];
      out.push({ tag: 'Quest', title: defs[id].title + ' · ' + p.found + '/' + p.total, text: w ? 'Next, look ' + (w.known ? 'in ' : '') + w.text + '.' : '', world: w && w.known ? w.world : null });
    });
    if (typeof BridgeBusiness !== 'undefined') BridgeBusiness.summary().forEach(function (b) {
      if (b.pending > 0) out.push({ tag: 'Takings', title: b.pending + ' coins waiting', text: 'at ' + b.name + '.' });
    });
    if (typeof BridgeFarm !== 'undefined' && BridgeFarm.journal) {
      var ripe = BridgeFarm.journal().rows.reduce(function (a, r) { return a + (r.ripe || 0); }, 0);
      if (ripe) out.push({ tag: 'Farm', title: ripe + ' ready to pick', text: 'in your field on Verdance.', world: 'verdance' });
    }
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.freeSlots && BridgeInventory.freeSlots() === 0) {
      out.push({ tag: 'Pack', title: 'Your pack is full', text: 'Sell to a trader, or leave things in a chest: the sea chest on the bridge, the locker in your quarters.' });
    }
    // round here: people you haven't met, doors to places you haven't been
    if (wid && typeof BridgePeople !== 'undefined') {
      var all = BridgePeople.all(), unmet = Object.keys(all).filter(function (pid) {
        return !BridgePeople.met(pid) && all[pid].at.some(function (a) { return a.world === wid; });
      }).length;
      if (unmet) out.push({ tag: 'Here', title: unmet === 1 ? 'Someone here you haven\'t met' : unmet + ' people here you haven\'t met',
                            text: 'Walk up and talk (' + (document.documentElement.classList.contains('touch') ? 'A' : 'E') + '). Their rumours start quests.' });
    }
    if (m && m.newDoors) {
      var nd = m.newDoors(wid);
      if (nd) out.push({ tag: 'Explore', title: nd === 1 ? 'A way on from here you haven\'t taken' : nd + ' ways on from here you haven\'t taken', text: 'They\'re the ? marks on your map' + (document.documentElement.classList.contains('touch') ? '.' : ' (N).'), world: wid, tab: true });
    }
    if (m && m.unseenSystems) {
      var us = m.unseenSystems();
      if (us && out.length < 5) out.push({ tag: 'Voyage', title: us + (us === 1 ? ' world' : ' worlds') + ' you\'ve never set foot on', text: 'The helm on the Wayfarer\'s bridge jumps the ship. The shuttle takes you down.' });
    }
    if (logged.length < 6) {
      var tch = document.documentElement.classList.contains('touch');
      out.push({ tag: 'Tip', title: 'Look at everything', text: (tch ? 'Tap A' : 'Press E') + ' beside people, doors and things to talk, go in and use them. The menu (' + (tch ? 'the Menu button' : 'Tab') + ') has your backpack, the map and this journal.' });
    }
    return out.slice(0, 6);
  }
  function lastFound(id) { var s = state[id], t = s.started || 0; Object.keys(s.clues || {}).forEach(function (c) { t = Math.max(t, s.clues[c]); }); return t; }

  function render(el) {
    page = el || page;
    if (!page) return;
    var ids = Object.keys(defs || {}).filter(function (id) { return state[id]; });
    ids.sort(function (a, b) { return (!!state[a].done - !!state[b].done) || (lastFound(b) - lastFound(a)); });
    var left = '', right = '';
    // what to do next
    var nx = nextUp();
    left += section('Next up', '', nx.length ? '<ul class="jn-next">' + nx.map(function (n, i) {
      return '<li><span class="jn-tag">' + esc(n.tag) + '</span><div><b>' + esc(n.title) + '</b>' + (n.text ? '<span>' + esc(n.text) + '</span>' : '') + '</div>' +
        (n.world ? '<button type="button" class="gm-btn gm-btn-sm jn-go" data-w="' + esc(n.world) + '">Map</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<div class="jn-empty">All caught up. Go somewhere you haven\'t been.</div>', 'jn-first');
    // quests: the ones under way, then the finished ones folded up
    var going = ids.filter(function (id) { return !state[id].done; }), done = ids.filter(function (id) { return state[id].done; });
    var qh = going.map(function (id) {
      var q = defs[id], s = state[id], p = progress(id), nxt = whereNext(id);
      return '<article class="jn-quest"><div class="jn-q-head"><span class="jn-q-title">' + esc(q.title) + '</span><span class="jn-count">' + p.found + ' / ' + p.total + '</span></div>' +
        '<div class="jn-bar"><i style="width:' + Math.round(p.found / p.total * 100) + '%"></i></div>' +
        '<div class="jn-q-where">' + esc(q.where) + '</div><p class="jn-q-text">' + esc(q.start) + '</p><ul class="jn-clues">' +
        q.clues.filter(function (c) { return s.clues[c.id]; }).map(function (c) { return li(esc(c.text), 'found'); }).join('') +
        (nxt.length ? li('Still to find: ' + nxt.map(function (w) { return esc(w.text); }).join(' · '), 'missing') : '') + '</ul></article>';
    }).join('');
    if (done.length) {
      qh += '<details class="jn-done"' + (going.length ? '' : ' open') + '><summary>Finished · ' + done.length + '</summary>' + done.map(function (id) {
        var q = defs[id];
        return '<article class="jn-quest done"><div class="jn-q-head"><span class="jn-q-title">' + esc(q.title) + '</span><span class="jn-count">+' + q.reward + '</span></div>' +
          '<p class="jn-q-text">' + esc(q.done) + '</p></article>';
      }).join('') + '</details>';
    }
    left += section('Quests', ids.length ? going.length + ' under way' : '', qh || '<div class="jn-empty">None yet. People\'s rumours, odd things lying about and the notes on boards start them.</div>');
    // the log
    if (logged.length) {
      var shown = logAll ? logged : logged.slice(0, 10);
      right += section('Your log', logged.length + (logged.length >= LOG_MAX ? '+' : ''), '<ul class="jn-log">' + shown.map(function (e) {
        return '<li><b>' + esc(e.k) + '</b> · ' + esc(e.t) + (e.s ? ' — ' + esc(e.s) : '') +
          '<span class="jn-when">' + (e.w && cap(e.w) !== e.t ? esc(cap(e.w)) + ' · ' : '') + ago(e.at) + '</span></li>';
      }).join('') + '</ul>' + (logged.length > 10 ? '<button type="button" class="gm-btn gm-btn-sm jn-more">' + (logAll ? 'Show less' : 'Show all ' + logged.length) + '</button>' : ''));
    }
    right += others();
    if (!right) right = section('Your log', '', '<div class="jn-empty">Nothing yet. Talk to people, look at things, go where the paths go.</div>');
    page.innerHTML = '<div class="jn"><div class="jn-col">' + left + '</div><div class="jn-col">' + right + '</div></div>';
    page.querySelectorAll('.jn-go').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); if (typeof BridgeMenu !== 'undefined') BridgeMenu.show('map', { world: b.getAttribute('data-w') }); });
    });
    var more = page.querySelector('.jn-more');
    if (more) more.addEventListener('click', function (e) { e.stopPropagation(); logAll = !logAll; render(); });
  }

  // everything else that's yours: crew, businesses, the farm, your fleet, the curios, the mountain
  function others() {
    var html = '';
    var crew = typeof BridgeCrew !== 'undefined' ? BridgeCrew.list() : [];
    if (crew.length) html += section('Your crew', crew.length, '<ul class="jn-list">' +
      crew.map(function (c) { return li('<b>' + esc(c.name) + '</b>, ' + esc(c.role) + ' - ' + esc(c.perkText)); }).join('') + '</ul>');
    var biz = typeof BridgeBusiness !== 'undefined' ? BridgeBusiness.summary() : [];
    if (biz.length) html += section('Your businesses', biz.length, '<ul class="jn-list">' + biz.map(function (b) {
      return li('<b>' + esc(b.name) + '</b> - ' + (b.status.running ? b.perHour + ' coins an open hour' : 'shut, nobody working it') + (b.manager ? ', run by ' + esc(b.manager) : '') + (b.pending ? '. <b>' + b.pending + '</b> waiting to collect' : ''));
    }).join('') + '</ul>');
    var farm = typeof BridgeFarm !== 'undefined' ? BridgeFarm.journal() : { rows: [] };
    var stead = typeof BridgeHomestead !== 'undefined' ? BridgeHomestead.journal() : null;
    if (farm.rows.length || (stead && stead.owned)) {
      var led = [];
      if (stead && stead.owned) {
        led.push('<b>' + esc(stead.name) + '</b> - yours' + (stead.sprinklers ? ', ' + stead.sprinklers + ' sprinkler' + (stead.sprinklers > 1 ? 's' : '') : ''));
        if (stead.coins || stead.orders) led.push('Shipped ' + stead.coins + ' coins over ' + stead.rounds + ' of Marlo\'s rounds; ' + stead.orders + ' order' + (stead.orders === 1 ? '' : 's') + ' filled');
        if (stead.bin) led.push('In the bin for Marlo: ' + stead.bin + ' coins\' worth');
        var herd = typeof BridgeAnimals !== 'undefined' ? BridgeAnimals.journal() : [];
        if (herd.length) led.push('In the meadow: ' + herd.map(function (a) { return esc(a.name) + ' ' + '♥'.repeat(a.hearts) + (a.ready ? ' <b>(' + (a.kind === 'cow' ? 'milk' : 'an egg') + ' waiting)</b>' : ''); }).join(', '));
        if (typeof BridgeSeasons !== 'undefined') { var se = BridgeSeasons.now(), fv = BridgeSeasons.favours(); led.push('<b>' + se.name + '</b>, day ' + se.day + ' of 7' + (fv.length ? ' - ' + fv.join(', ') + ' grow quicker' : ' - everything grows slower till spring')); }
        if (stead.tam) led.push('Tam is watering for another ' + Math.max(1, Math.round((stead.tam - Date.now()) / 3600000)) + ' h');
        if (stead.odile) led.push('Odile is bringing it in for another ' + Math.max(1, Math.round((stead.odile - Date.now()) / 3600000)) + ' h');
      }
      html += section(stead && stead.owned ? stead.name : 'The farm on Verdance', farm.tilled + ' tilled', '<ul class="jn-list">' +
        led.map(function (l) { return li(l); }).join('') +
        farm.rows.map(function (r) {
          var bits = [];
          if (r.n) bits.push(r.n + ' in the ground' + (r.ripe ? ', <b>' + r.ripe + ' ready</b>' : '') + (r.dry ? ', ' + r.dry + ' thirsty' : ''));
          if (r.picked) bits.push(r.picked + ' brought in');
          return li('<b>' + esc(r.name.charAt(0) + r.name.slice(1).toLowerCase()) + '</b> - ' + bits.join('; '));
        }).join('') + '</ul>');
    }
    // your fleet on Lumar's seas: ships and where they lie, hands, cargo, contracts, the holm's voyages (js/fleet.js, trade.js, holm.js)
    var fleetLines = [];
    if (typeof BridgeFleet !== 'undefined') {
      var FL = BridgeFleet, T2 = typeof BridgeTrade !== 'undefined' ? BridgeTrade : null, sail = FL.active().ship.id;
      if (FL.all().length > 1 || FL.crew().length || (T2 && T2.mine().length)) {
        FL.all().forEach(function (sh) {
          var hold = Object.keys(sh.hold).map(function (id) { return sh.hold[id] + ' ' + (T2 ? T2.name(id) : id).toLowerCase(); });
          fleetLines.push('<b>' + esc(sh.name) + '</b>' + (sh.id === sail ? ' ⚓' : '') + ' - ' + esc(FL.line(sh)) + ', ' +
            (sh.away ? 'at sea, ' + Math.max(0, Math.ceil((sh.away.back - Date.now()) / 60000)) + ' min out' : esc(FL.where(sh))) + (hold.length ? '; carrying ' + esc(hold.join(', ')) : ''));
        });
        var ashore = FL.crew().filter(function (c) { return c.ship === 'holm'; }).length;
        if (FL.crew().length) fleetLines.push(FL.crew().length + ' hand' + (FL.crew().length > 1 ? 's' : '') + ' signed on' + (ashore ? ', ' + ashore + ' ashore in the quarters' : ''));
        if (T2) T2.mine().forEach(function (c) {
          var I = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles || {};
          if (!c.royal) fleetLines.push((c.charter ? 'Charter: ' : 'Contract: ') + c.n + ' ' + esc(T2.name(c.good).toLowerCase()) + ' to ' + esc(I[c.to] ? I[c.to].name : c.to) + ' for ' + c.fee + ' coins');
        });
      }
    }
    if (typeof BridgeCrown !== 'undefined' && BridgeCrown.journal()) fleetLines.push(BridgeCrown.journal());     // the Queen's commissions
    if (typeof BridgeHolm !== 'undefined' && BridgeHolm.owned()) fleetLines.push('<b>' + esc(BridgeHolm.name()) + '</b> is yours' + (BridgeHolm._state().chest ? ' - ' + BridgeHolm._state().chest + ' coins in its strongbox' : ''));
    if (fleetLines.length) html += section('Your fleet', (typeof BridgeFleet !== 'undefined' ? BridgeFleet.all().length : 1) + ' ships', '<ul class="jn-list">' + fleetLines.map(function (l) { return li(l); }).join('') + '</ul>');
    var curios = typeof BridgeMagic !== 'undefined' ? BridgeMagic.journal() : [];
    if (curios.length) html += section('The Lantern Beyond', curios.length + ' of ' + BridgeMagic.total + ' curios', '<ul class="jn-list">' +
      curios.map(function (c) { return li('<b>' + esc(c.name) + '</b> - ' + esc(c.lore)); }).join('') +
      (curios.length < BridgeMagic.total ? li('The rest of the tale is out there. Wendel the Peddler sells rumours, and a lantern.', 'missing') : '') + '</ul>');
    var ridge = typeof BridgeExpedition !== 'undefined' ? BridgeExpedition.journal() : [];
    if (ridge.length) html += section('The Last Ridge', 'past the Hoarspire', '<ul class="jn-list">' + ridge.map(function (l) { return li(l); }).join('') + '</ul>');
    var peaks = [];
    if (typeof BridgeClimb !== 'undefined') Object.keys(BridgeClimb.ROUTES).forEach(function (id) {
      var r = BridgeClimb.records(id);
      if (r && r.ascents) peaks.push('<b>' + esc(cap(BridgeClimb.ROUTES[id].name)) + '</b> (' + BridgeClimb.ROUTES[id].grade + ') - climbed ' + r.ascents + 'x, best ' + clock(r.best));
    });
    if (typeof BridgeSki !== 'undefined') Object.keys(BridgeSki.RUNS).forEach(function (id) {
      var b = BridgeSki.best(id);
      if (b) peaks.push('<b>' + esc(cap(BridgeSki.RUNS[id].name)) + '</b> (' + BridgeSki.RUNS[id].mark + ') - best run ' + clock(b));
    });
    if (peaks.length) html += section('Hoarfell', peaks.length, '<ul class="jn-list">' + peaks.map(function (l) { return li(l); }).join('') + '</ul>');
    return html;
  }

  var page = null;
  if (typeof BridgeMenu !== 'undefined') {
    BridgeMenu.page('journal', { render: function (el) { render(el); }, leave: function () { page = null; } });
  }
  function shown() { return !!page && typeof BridgeMenu !== 'undefined' && BridgeMenu.current() === 'journal'; }
  function open() { if (typeof BridgeMenu !== 'undefined') BridgeMenu.open('journal'); }
  function close() { if (shown()) BridgeMenu.close(); }
  function toggle() { if (typeof BridgeMenu !== 'undefined') BridgeMenu.toggle('journal'); }

  // ---- the Menu pill, shown while you're in a world (it opens the game menu; it was the Journal pill) ---------------
  function init() {
    load();
    pill = document.createElement('button');
    pill.id = 'journal-pill';
    pill.type = 'button';
    pill.innerHTML = '<span class="ip-key">Tab</span><span class="jp-ico" aria-hidden="true"></span>Menu';
    pill.title = 'Backpack (I), map (N), journal (J)';
    if (typeof BridgeMenu !== 'undefined' && BridgeMenu.icon) pill.querySelector('.jp-ico').appendChild(BridgeMenu.icon('backpack', 2));
    pill.addEventListener('click', function () { if (typeof BridgeMenu !== 'undefined') BridgeMenu.toggle(); });
    document.body.appendChild(pill);
    if (typeof BridgeState !== 'undefined') {
      BridgeState.onChange(function (s) { pill.style.display = s === 'world' ? 'flex' : 'none'; if (s !== 'world' && typeof BridgeMenu !== 'undefined') BridgeMenu.close(); });
      pill.style.display = BridgeState.getState && BridgeState.getState() === 'world' ? 'flex' : 'none';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /** Every quest with its state and the worlds its clues are in (for the nav chart). */
  function summary() {
    return Object.keys(defs || {}).map(function (id) {
      var q = defs[id], p = progress(id);
      return { id: id, title: q.title, started: !!state[id], done: p.done, found: p.found, total: p.total,
               worlds: q.clues.map(function (c) { return c.on.world; }) };
    });
  }

  /** Every clue found, as 'quest/clue' with when; and every quest finished, with when. */
  function found() {
    var out = [];
    Object.keys(state).forEach(function (id) {
      Object.keys(state[id].clues || {}).forEach(function (c) { out.push({ id: id + '/' + c, at: state[id].clues[c] }); });
    });
    return out.sort(function (a, b) { return a.at - b.at; });
  }
  function finished() {
    return Object.keys(state).filter(function (id) { return state[id].done; })
      .map(function (id) { return { id: id, at: state[id].done }; });
  }

  return { onInteract: onInteract, open: open, close: close, toggle: toggle, toast: toast, summary: summary, note: note, arrived: arrived,
           visited: function () { return seen; }, whereNext: function (id) { return defs && defs[id] ? whereNext(id) : []; }, render: function () { if (shown()) render(); },
           log: function () { return logged.slice(); },
           found: found, finished: finished, has: has, def: function (id) { return defs ? defs[id] || null : null; },
           progress: function (id) { return defs && defs[id] ? progress(id) : null; },
           reset: function () { state = {}; save(); } };
})();
