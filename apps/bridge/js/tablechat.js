/**
 * Table chat (BridgeTableChat): talk to whoever you're playing with without leaving the game.
 *
 * Beck: "if you're playing with somebody, you can send them messages while you're at that table still."
 * Shown over any game screen - the cabinet (Royale Link's tables, the arcade, chess...), Fell Dice and Bones,
 * the dance floor, pachinko, Splice - while there's someone to talk to: the pilot you're playing with in a
 * play-together session (js/together.js), else everyone in the same place (js/multi.js `others`).
 *
 * A 💬 pill sits in the cabinet's top bar (clear of the game's own buttons), else bottom-left over the game; what they
 * say pops up beside it for a few seconds and the pill counts what you haven't read. Open it for the last messages, a line to type in and quick lines (GG, Nice hand!...).
 * Typing never reaches the game: the input's keys are stopped at the window before any game handler sees them
 * (Enter sends, Esc closes the box and gives the game its keys back). '/' opens it in games drawn in this page
 * (the dice, the dance, pachinko, Splice); in the cabinet the game's iframe has the keys, so tap or click it.
 *
 * Messages are js/multi.js's 'say' event ({ t, i }, the same as *Say something*), sent only to the people above.
 * While the chat shows, multi.js hands incoming 'say's here (heardHere) instead of a bubble you couldn't see.
 */
var BridgeTableChat = (function () {
  var QUICK = ['GG', 'Nice hand!', 'Unlucky', 'One more?', 'Good luck', '😂', '🔥', '🍀'];
  var el = null, panelEl = null, logEl = null, inEl = null, popEl = null, pillEl = null, badgeEl = null;
  var open = false, shown = false, unread = 0, log = [], popTimer = 0, lastSent = 0;

  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function M() { return typeof BridgeMulti !== 'undefined' ? BridgeMulti : null; }
  function T() { return typeof BridgeTogether !== 'undefined' ? BridgeTogether : null; }
  function cap(t) { return M() && M().cap ? M().cap(t) : String(t || ''); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nameOf(id) { var p = N() && N().peer(id); return cap(p ? p.name : 'Someone'); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }

  // a game covering the world
  function gameOpen() {
    if (typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.isOpen()) return true;
    if (typeof BridgeLodge !== 'undefined' && BridgeLodge.isOpen && BridgeLodge.isOpen()) return true;
    if (typeof BridgeDance !== 'undefined' && BridgeDance.isOpen && BridgeDance.isOpen()) return true;
    return !!document.querySelector('#pachinko.visible, #splice.visible');
  }
  // who hears you: the one you're playing with, else everyone here
  function recipients() {
    var S = T() && T().session && T().session();
    if (S && S.peer && S.state !== 'settled' && N() && N().peer(S.peer)) return [S.peer];
    var o = M() && M().others && M().others();
    return o ? Object.keys(o).filter(function (id) { return N() && N().peer(id); }) : [];
  }
  function who(ids) {
    if (!ids.length) return '';
    return ids.length === 1 ? nameOf(ids[0]) : ids.length === 2 ? nameOf(ids[0]) + ' & ' + nameOf(ids[1]) : ids.length + ' here';
  }

  function build() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'tchat';
    el.innerHTML =
      '<div class="tc-panel">' +
        '<div class="tc-head"><span class="tc-to"></span><button class="tc-x" aria-label="Close">×</button></div>' +
        '<div class="tc-log"></div>' +
        '<div class="tc-quick">' + QUICK.map(function (q) { return '<button class="tc-q">' + esc(q) + '</button>'; }).join('') + '</div>' +
        '<form class="tc-form"><input class="tc-in" maxlength="90" autocomplete="off" enterkeyhint="send" placeholder="Say something…"><button class="tc-send">Send</button></form>' +
      '</div>' +
      '<div class="tc-pop"></div>';
    document.body.appendChild(el);
    panelEl = el.querySelector('.tc-panel'); logEl = el.querySelector('.tc-log'); inEl = el.querySelector('.tc-in'); popEl = el.querySelector('.tc-pop');
    pillEl = document.createElement('button');
    pillEl.className = 'tc-pill';
    pillEl.title = 'Chat (/)';
    pillEl.innerHTML = '<span class="tc-ico">💬</span><span class="tc-lbl">Chat</span><span class="tc-badge"></span>';
    badgeEl = pillEl.querySelector('.tc-badge');
    pillEl.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(); });
    popEl.addEventListener('click', function (e) { e.preventDefault(); openBox(); });
    el.querySelector('.tc-x').addEventListener('click', function (e) { e.preventDefault(); close(); });
    el.querySelector('.tc-form').addEventListener('submit', function (e) { e.preventDefault(); send(inEl.value); });
    el.querySelectorAll('.tc-q').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); send(b.textContent); }); });
    // clicks inside don't fall through to the game (or close a modal behind)
    [el, pillEl].forEach(function (x) {
      ['mousedown', 'pointerdown', 'touchstart', 'click'].forEach(function (t) { x.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    });
    place();
  }

  // the pill sits in the cabinet's bar (clear of the game's own buttons), else bottom-left over a game drawn in
  // this page; the box and what they say open beside it, below a pill up top, above one down below
  function place() {
    if (!el) return;
    var bar = typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.isOpen() && document.querySelector('#cabinet-modal-overlay .cm-right');
    var home = bar || el;
    if (pillEl.parentNode !== home) home.insertBefore(pillEl, home.firstChild);
    pillEl.classList.toggle('tc-inbar', !!bar);
    pillEl.classList.toggle('tc-on', shown);
    if (!shown) return;
    var r = pillEl.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    var below = r.top + r.height / 2 < H / 2, right = r.left + r.width / 2 > W / 2;
    [panelEl, popEl].forEach(function (b) {
      b.style.top = below ? Math.round(r.bottom + 8) + 'px' : '';
      b.style.bottom = below ? '' : Math.round(H - r.top + 8) + 'px';
      var w = b.offsetWidth;                            // 0 while hidden: placed again as it shows
      b.style.left = Math.round(Math.max(8, Math.min(W - w - 8, right ? r.right - w : r.left))) + 'px';
    });
  }

  function render() {
    if (!el) return;
    el.querySelector('.tc-to').textContent = 'To ' + (who(recipients()) || '…');
    var since = Date.now() - 15 * 60 * 1000;
    logEl.innerHTML = log.filter(function (m) { return m.at > since; }).slice(-30).map(function (m) {
      return '<div class="tc-m' + (m.me ? ' tc-me' : '') + '"><b>' + esc(m.me ? 'You' : m.name) + '</b> ' + esc(m.t) + '</div>';
    }).join('') || '<div class="tc-empty">Nothing said yet.</div>';
    logEl.scrollTop = logEl.scrollHeight;
    badgeEl.textContent = unread ? String(unread) : '';
    pillEl.classList.toggle('tc-unread', !!unread);
  }

  function toggle() { if (open) close(); else openBox(); }
  function openBox() {
    build();
    open = true; unread = 0;
    el.classList.add('tc-open'); pillEl.classList.add('tc-active');
    hidePop(); place();
    render();
    // a phone's keyboard would cover the game and the quick lines: tap the line to type
    if (!document.documentElement.classList.contains('touch')) setTimeout(function () { try { inEl.focus(); } catch (e) { /* */ } }, 30);
  }
  function close() {
    open = false;
    if (!el) return;
    el.classList.remove('tc-open'); pillEl.classList.remove('tc-active');
    try { inEl.blur(); } catch (e) { /* */ }
    // the game gets its keys back
    var f = document.getElementById('cabinet-iframe');
    if (f && typeof BridgeCabinetModal !== 'undefined' && BridgeCabinetModal.isOpen()) try { f.focus(); } catch (e) { /* */ }
  }

  function send(text) {
    text = String(text || '').trim().slice(0, 90);
    if (!text || !N()) return;
    var now = Date.now();
    if (now - lastSent < 350) return;                     // a held key or a double tap isn't two messages
    lastSent = now;
    var to = recipients();
    if (!to.length) return;
    var inst = M() && M().myInst ? M().myInst() : null;
    to.forEach(function (id) { N().send('say', { t: text, i: inst, tc: 1 }, id); });
    log.push({ me: true, t: text, at: now });
    if (inEl) inEl.value = '';
    sfx('blip');
    render();
  }

  // someone said something: here, while the chat shows (js/multi.js asks before bubbling it)
  function heardHere(from, text) {
    if (!shown) return false;
    var mine = recipients();
    var S = T() && T().session && T().session();
    if (mine.indexOf(from) < 0 && !(S && S.peer === from)) return false;
    log.push({ me: false, name: nameOf(from), t: String(text).slice(0, 90), at: Date.now() });
    if (!open) { unread++; pop(nameOf(from), text); }
    sfx('click');
    render();
    return true;
  }
  function pop(name, text) {
    if (!popEl) return;
    popEl.innerHTML = '<b>' + esc(name) + '</b> ' + esc(text);
    popEl.classList.add('tc-show');
    place();
    clearTimeout(popTimer);
    popTimer = setTimeout(hidePop, 6000);
  }
  function hidePop() { if (popEl) popEl.classList.remove('tc-show'); clearTimeout(popTimer); }

  // keys typed into the box are the box's alone (the game never hears them, down or up)
  function inBox(e) { return e.target && e.target.closest && e.target.closest('#tchat'); }
  window.addEventListener('keydown', function (e) {
    if (!el || !shown) return;
    if (inBox(e)) {
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      return;                                           // Enter submits the form; everything else types
    }
    // '/' opens it over a game drawn in this page (the cabinet's iframe keeps its own keys)
    if (e.key === '/' && !open && !/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) {
      e.preventDefault(); e.stopImmediatePropagation(); openBox();
    }
  }, true);
  ['keyup', 'keypress'].forEach(function (t) {
    window.addEventListener(t, function (e) { if (el && shown && inBox(e)) e.stopImmediatePropagation(); }, true);
  });

  // show it while a game covers the world and someone's there to hear
  setInterval(function () {
    var want = gameOpen() && recipients().length > 0;
    if (want !== shown) {
      shown = want;
      if (want) { build(); render(); }
      else if (el) { close(); hidePop(); unread = 0; render(); }
    }
    if (el) { place(); if (shown) el.querySelector('.tc-to').textContent = 'To ' + (who(recipients()) || '…'); }
  }, 400);

  return { heardHere: heardHere, open: openBox, close: close, isShown: function () { return shown; }, _log: function () { return log; } };
})();
