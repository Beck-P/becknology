/**
 * BridgeQuests — threads of story found by exploring.
 *
 * A quest (assets/quests.json) is a set of clues, each tied to an
 * interaction somewhere in the worlds ({world, label}). Using that
 * interaction finds the clue: the first clue starts the quest, the last
 * completes it and pays its reward (BridgeProgression.recordAchievement,
 * once per pilot). Order doesn't matter — you piece it together however
 * you wander. Progress is kept in localStorage.
 *
 * UI: a toast under the place label when something is found, and the
 * journal (J, or the Journal pill) listing every quest begun, its clues
 * found and how many are still missing.
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
  function toast(kicker, title, sub, hint) {
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

  // ---- the journal --------------------------------------------------------------------------
  function render() {
    var ids = Object.keys(defs || {}).filter(function (id) { return state[id]; });
    ids.sort(function (a, b) { return (!!state[a].done - !!state[b].done) || (state[b].started - state[a].started); });
    var html = '<div class="qj-head"><span class="qj-title">Journal</span><button class="qj-close" aria-label="Close">' +
      '<span class="ip-key">Esc</span></button></div>';
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
        fished.fish.map(function (f) { return '<li class="found"><b>' + esc(f.name) + '</b> \u00d7' + f.n + (f.best ? ', biggest ' + f.best + ' cm' : '') + '</li>'; }).join('') +
        '</ul></section>';
    }
    if (fished.bottles.length) {
      html += '<section class="qj-quest qj-crew"><div class="qj-q-head"><span class="qj-q-title">Messages in bottles</span>' +
        '<span class="qj-q-count">' + fished.bottles.length + '</span></div><ul class="qj-clues">' +
        fished.bottles.map(function (b) { return '<li class="found">' + esc(b) + '</li>'; }).join('') + '</ul></section>';
    }
    if (!ids.length && !crew.length && !biz.length && !fished.fish.length) {
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

  return { onInteract: onInteract, open: open, close: close, toggle: toggle, toast: toast, summary: summary,
           found: found, finished: finished, def: function (id) { return defs ? defs[id] || null : null; },
           progress: function (id) { return defs && defs[id] ? progress(id) : null; },
           reset: function () { state = {}; save(); } };
})();
