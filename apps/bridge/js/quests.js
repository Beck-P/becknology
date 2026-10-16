/**
 * BridgeQuests — threads of story found by exploring.
 *
 * A quest (assets/quests.json) is a set of clues, each tied to an
 * interaction somewhere in the worlds ({world, label}). Using that
 * interaction finds the clue: the first clue starts the quest, the last
 * completes it and pays its reward (BridgeProgression.recordAchievement,
 * once per pilot). Order doesn't matter — you piece it together however
 * you wander — unless a clue says `after: <clue id>` (or a list of them),
 * when it only counts once those are found. Progress is kept in localStorage.
 *
 * UI: a toast under the place label when something is found, and the
 * journal (J, or the Journal pill) listing every quest begun, its clues
 * found and how many are still missing.
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
  var journal = null, toastEl = null, toastTimer = null, pill = null;

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
    if (!defs || !inter) return;
    Object.keys(defs).forEach(function (id) {
      var q = defs[id];
      q.clues.forEach(function (c) {
        var wm = c.on.world;                      // 'lumar-rose-mine-*' matches any of the mine's floors
        if (!(wm === worldId || (wm.slice(-1) === '*' && worldId.indexOf(wm.slice(0, -1)) === 0)) || c.on.label !== inter.label) return;
        if (c.after && ![].concat(c.after).every(function (a) { return state[id] && state[id].clues[a]; })) return;   // only once those are found
        var s = state[id] || (state[id] = { clues: {}, started: Date.now() });
        if (s.clues[c.id]) return;
        var fresh = !Object.keys(s.clues).length;
        s.clues[c.id] = Date.now();
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
        if (journal && journal.classList.contains('visible')) render();
      });
    });
  }

  // ---- the toast ---------------------------------------------------------------------------
  // ---- the log ----------------------------------------------------------------------------------
  var LOG_KEY = 'bridge_log', LOG_MAX = 250, logged = [], logAll = false;
  try { logged = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') || []; } catch (e) { logged = []; }
  var QUIET = { 'Course set': 1, 'Whiteout': 1, 'Online': 1 };                   // hints of the moment, not things you did
  function note(kicker, title, sub) {
    if (QUIET[kicker]) return;
    var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld && BridgeWorld.getWorld(), last = logged[0];
    if (last && last.k === kicker && last.t === title && last.s === (sub || '') && Date.now() - last.at < 10000) return;
    logged.unshift({ at: Date.now(), k: kicker, t: title, s: sub || '', w: (w && w.name) || '' });
    if (logged.length > LOG_MAX) logged.length = LOG_MAX;
    try { localStorage.setItem(LOG_KEY, JSON.stringify(logged)); } catch (e) { /* private mode: this session only */ }
    if (journal && journal.classList.contains('visible') && !inCodex) render();
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

  // ---- the journal --------------------------------------------------------------------------
  function render() {
    var ids = Object.keys(defs || {}).filter(function (id) { return state[id]; });
    ids.sort(function (a, b) { return (!!state[a].done - !!state[b].done) || (state[b].started - state[a].started); });
    var html = '<div class="qj-head"><span class="qj-title">Journal</span>' +
      (typeof BridgeCodex !== 'undefined' ? '<button class="qj-tab qj-codex">Collection <i>' + BridgeCodex.count() + '/' + BridgeCodex.total() + '</i></button>' : '') +
      '<button class="qj-close" aria-label="Close"><span class="ip-key">Esc</span></button></div>';
    if (logged.length) {
      var shown = logAll ? logged : logged.slice(0, 8);
      html += '<section class="qj-quest qj-crew qj-log"><div class="qj-q-head"><span class="qj-q-title">Your log</span>' +
        '<span class="qj-q-count">' + logged.length + (logged.length >= LOG_MAX ? '+' : '') + '</span></div><ul class="qj-clues">' +
        shown.map(function (e) {
          return '<li class="found"><b>' + esc(e.k) + '</b> · ' + esc(e.t) + (e.s ? ' — ' + esc(e.s) : '') +
            '<span class="qj-log-when">' + (e.w && cap(e.w) !== e.t ? esc(cap(e.w)) + ' · ' : '') + ago(e.at) + '</span></li>';
        }).join('') + '</ul>' +
        (logged.length > 8 ? '<button class="qj-tab qj-log-more">' + (logAll ? 'Show less' : 'Show all ' + logged.length) + '</button>' : '') + '</section>';
    }
    var crew = typeof BridgeCrew !== 'undefined' ? BridgeCrew.list() : [];
    if (crew.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">Your crew</span>' +
        '<span class="qj-q-count">' + crew.length + '</span></div><ul class="qj-clues">' +
        crew.map(function (c) { return '<li class="found"><b>' + esc(c.name) + '</b>, ' + esc(c.role) + ' - ' + esc(c.perkText) + '</li>'; }).join('') +
        '</ul></section>';
    }
    var biz = typeof BridgeBusiness !== 'undefined' ? BridgeBusiness.summary() : [];
    if (biz.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">Your businesses</span>' +
        '<span class="qj-q-count">' + biz.length + '</span></div><ul class="qj-clues">' +
        biz.map(function (b) {
          return '<li class="found"><b>' + esc(b.name) + '</b> - ' + b.perHour + ' coins an hour' + (b.manager ? ', run by ' + esc(b.manager) : '') +
            (b.pending ? '. <b>' + b.pending + '</b> waiting to collect' : '') + '</li>';
        }).join('') + '</ul></section>';
    }
    var fished = typeof BridgeFishing !== 'undefined' ? BridgeFishing.journal() : { fish: [], bottles: [] };
    if (fished.fish.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">Fish</span>' +
        '<span class="qj-q-count">' + fished.fish.length + ' kinds</span></div><ul class="qj-clues">' +
        fished.fish.slice().sort(function (a, b) { return (b.tier || 0) - (a.tier || 0); }).map(function (f) {
          var T = f.tier && typeof BridgeFishArt !== 'undefined' ? BridgeFishArt.TIERS[f.tier] : null;   // the rare ones first, in their colour
          return '<li class="found"><b' + (T ? ' style="color:' + T.col + '"' : '') + '>' + esc(f.name) + '</b>' + (T ? ' <i>' + T.name.toLowerCase() + '</i>' : '') + ' \u00d7' + f.n + (f.best ? ', biggest ' + f.best + ' cm' : '') + '</li>';
        }).join('') +
        '</ul></section>';
    }
    if (fished.bottles.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">Messages in bottles</span>' +
        '<span class="qj-q-count">' + fished.bottles.length + '</span></div><ul class="qj-clues">' +
        fished.bottles.map(function (b) { return '<li class="found">' + esc(b) + '</li>'; }).join('') + '</ul></section>';
    }
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
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">' + esc(stead && stead.owned ? stead.name : 'The farm on Verdance') + '</span>' +
        '<span class="qj-q-count">' + farm.tilled + ' tilled</span></div><ul class="qj-clues">' +
        led.map(function (l) { return '<li class="found">' + l + '</li>'; }).join('') +
        farm.rows.map(function (r) {
          var bits = [];
          if (r.n) bits.push(r.n + ' in the ground' + (r.ripe ? ', <b>' + r.ripe + ' ready</b>' : '') + (r.dry ? ', ' + r.dry + ' thirsty' : ''));
          if (r.picked) bits.push(r.picked + ' brought in');
          return '<li class="found"><b>' + esc(r.name.charAt(0) + r.name.slice(1).toLowerCase()) + '</b> - ' + bits.join('; ') + '</li>';
        }).join('') + '</ul></section>';
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
    if (fleetLines.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">Your fleet</span>' +
        '<span class="qj-q-count">' + (typeof BridgeFleet !== 'undefined' ? BridgeFleet.all().length : 1) + ' ships</span></div><ul class="qj-clues">' +
        fleetLines.map(function (l) { return '<li class="found">' + l + '</li>'; }).join('') + '</ul></section>';
    }
    var curios = typeof BridgeMagic !== 'undefined' ? BridgeMagic.journal() : [];
    if (curios.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">The Lantern Beyond</span>' +
        '<span class="qj-q-count">' + curios.length + ' of ' + BridgeMagic.total + ' curios</span></div><ul class="qj-clues">' +
        curios.map(function (c) { return '<li class="found"><b>' + esc(c.name) + '</b> - ' + esc(c.lore) + '</li>'; }).join('') +
        (curios.length < BridgeMagic.total ? '<li>The rest of the tale is out there. Wendel the Peddler sells rumours, and a lantern.</li>' : '') + '</ul></section>';
    }
    var ridge = typeof BridgeExpedition !== 'undefined' ? BridgeExpedition.journal() : [];
    if (ridge.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">The Last Ridge</span>' +
        '<span class="qj-q-count">past the Hoarspire</span></div><ul class="qj-clues">' +
        ridge.map(function (l) { return '<li class="found">' + l + '</li>'; }).join('') + '</ul></section>';
    }
    var peaks = [];
    if (typeof BridgeClimb !== 'undefined') Object.keys(BridgeClimb.ROUTES).forEach(function (id) {
      var r = BridgeClimb.records(id);
      if (r && r.ascents) peaks.push('<b>' + esc(cap(BridgeClimb.ROUTES[id].name)) + '</b> (' + BridgeClimb.ROUTES[id].grade + ') - climbed ' + r.ascents + 'x, best ' + clock(r.best));
    });
    if (typeof BridgeSki !== 'undefined') Object.keys(BridgeSki.RUNS).forEach(function (id) {
      var b = BridgeSki.best(id);
      if (b) peaks.push('<b>' + esc(cap(BridgeSki.RUNS[id].name)) + '</b> (' + BridgeSki.RUNS[id].mark + ') - best run ' + clock(b));
    });
    if (peaks.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">Hoarfell</span>' +
        '<span class="qj-q-count">' + peaks.length + '</span></div><ul class="qj-clues">' +
        peaks.map(function (l) { return '<li class="found">' + l + '</li>'; }).join('') + '</ul></section>';
    }
    if (!logged.length && !ids.length && !crew.length && !biz.length && !fished.fish.length && !farm.rows.length && !(stead && stead.owned) && !curios.length && !peaks.length && !ridge.length && !fleetLines.length) {
      html += '<div class="qj-empty">Nothing yet. Talk to people, look at things, go where the paths go.</div>';
    }
    ids.forEach(function (id) {
      var q = defs[id], s = state[id], p = progress(id);
      html += '<section class="qj-quest' + (p.done ? ' done' : '') + '">' +
        '<div class="qj-q-head"><span class="qj-q-title">' + esc(q.title) + '</span>' +
        '<span class="qj-q-count">' + (p.done ? 'Complete' : p.found + ' / ' + p.total) + '</span></div>' +
        '<div class="qj-q-where">' + esc(q.where) + '</div>' +
        '<p class="qj-q-text">' + esc(p.done ? q.done : q.start) + '</p><ul class="qj-clues">';
      q.clues.forEach(function (c) {
        if (s.clues[c.id]) html += '<li class="found">' + esc(c.text) + '</li>';
      });
      if (!p.done && p.found < p.total) {
        html += '<li class="missing">' + (p.total - p.found) + ' more to find</li>';
      }
      html += '</ul></section>';
    });
    journal.innerHTML = '<div class="qj-panel">' + html + '</div>';
    journal.querySelector('.qj-close').addEventListener('click', close);
    var cx = journal.querySelector('.qj-codex');
    if (cx) cx.addEventListener('click', collection);
    var more = journal.querySelector('.qj-log-more');
    if (more) more.addEventListener('click', function () { logAll = !logAll; render(); });
    inCodex = false;
  }
  // the Collection (js/codex.js), in the journal's own panel; Esc comes back
  var inCodex = false;
  function collection() {
    inCodex = true;
    var panel = journal.querySelector('.qj-panel');
    panel.classList.add('cx-panel');
    BridgeCodex.render(panel, render);
  }

  function open() {
    if (!defs) return;
    if (!journal) {
      journal = document.createElement('div');
      journal.id = 'quest-journal';
      journal.addEventListener('click', function (e) { if (e.target === journal) close(); });
      document.body.appendChild(journal);
    }
    render();
    journal.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
  }

  function close() {
    if (!journal || !journal.classList.contains('visible')) return;
    journal.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  function onKey(e) {
    if (e.key === 'Escape' && inCodex) { e.preventDefault(); e.stopPropagation(); render(); return; }
    if (e.key === 'Escape' || e.key === 'j' || e.key === 'J') { e.preventDefault(); e.stopPropagation(); close(); }
  }

  function toggle() {
    if (journal && journal.classList.contains('visible')) close(); else open();
  }

  // ---- the Journal pill, shown while you're in a world -----------------------------------------
  function init() {
    load();
    pill = document.createElement('button');
    pill.id = 'journal-pill';
    pill.innerHTML = '<span class="ip-key">J</span> Journal';
    pill.addEventListener('click', toggle);
    document.body.appendChild(pill);
    if (typeof BridgeState !== 'undefined') {
      BridgeState.onChange(function (s) { pill.style.display = s === 'world' ? 'flex' : 'none'; if (s !== 'world') close(); });
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
           log: function () { return logged.slice(); },
           found: found, finished: finished, def: function (id) { return defs ? defs[id] || null : null; },
           progress: function (id) { return defs && defs[id] ? progress(id) : null; },
           reset: function () { state = {}; save(); } };
})();
