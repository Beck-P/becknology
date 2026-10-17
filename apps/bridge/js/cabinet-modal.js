/**
 * BridgeCabinetModal — embed an arcade game as a modal iframe inside the
 * bridge. Bridge chrome (game title, coin HUD, ← LEAVE button) renders
 * above the iframe; the bridge itself stays mounted underneath so closing
 * the modal returns the player to exactly where they were (no reloads).
 *
 * Communication with the iframe is via postMessage; the game's
 * progression.js (loaded inside the iframe) emits:
 *   { type: 'bridge-iframe-ready' }
 *   { type: 'bridge-coins-changed', balance, delta, reason }
 *   { type: 'bridge-trophy-earned', key }
 *   { type: 'bridge-request-close', source }    // Esc inside game
 *
 * Playing together (js/together.js): show({ together: true }) adds a strip to the bar for the two of you
 * (setVersus), and the game's `bridge-together-*` messages (js/shared/together-frame.js) go to BridgeTogether,
 * which talks back through post(msg). Closing the cabinet tells it (frameClosed): a run cut short counts as it
 * stood, a game of chess is given up.
 *
 * The Neon Royale's games (Royale Link, /runouts — js/casino.js): show({ frame: 'casino', kicker }) or any /runouts
 * URL gets the casino frame (gold on velvet), its `bridge-casino-*` messages (stakes, payouts, what's on the table)
 * go to BridgeCasino, which moves the bar's coins with coins(balance, delta), and closing it tells BridgeCasino
 * (frameClosed) so whatever's still on the table comes back.
 */
var BridgeCabinetModal = (function () {

  var overlayEl = null;
  var iframeEl = null;
  var coinNumEl = null;
  var titleEl = null;
  var deltaPopEl = null;
  var open = false;
  var current = null;     // { url, title, gameKey }
  var runActive = false;  // a game run in progress (bridge-run-state): Esc pauses it before leaving
  var runHint = '';       // what the second Esc does, if the game says (chess played together: gives it up)
  var lastRun = null;     // the last finished run (bridge-run-ended), toasted on the way out
  var displayedBalance = 0;
  var targetBalance = 0;
  var animFrame = null;
  var lastFrameTs = 0;

  function isCasino(o) { return !!o && (o.frame === 'casino' || /^\/runouts(\/|\?|$)/.test(o.url || '')); }

  function frameFor() {
    if (isCasino(current)) return 'casino';
    var id = (typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId && BridgeWorld.getWorldId()) || '';
    if (/^enigma/.test(id)) return 'enigma';
    if (/^singularity/.test(id)) return 'void';
    if (/^(bridge|quarters|hangar|gameroom|office|ship-[a-z]+)$/.test(id)) return 'ship';
    if (/^lumar/.test(id)) return 'lumar';
    return 'arcadia';
  }

  function show(opts) {
    if (open) return;
    if (!opts || !opts.url) return;
    open = true;
    current = opts;
    runActive = false;
    lastRun = null;

    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();

    overlayEl = document.createElement('div');
    overlayEl.id = 'cabinet-modal-overlay';
    overlayEl.className = 'cm-' + frameFor() + (opts.together ? ' cm-together' : '');
    overlayEl.innerHTML = renderShellHTML();
    document.body.appendChild(overlayEl);

    iframeEl = document.getElementById('cabinet-iframe');
    coinNumEl = document.getElementById('cabinet-modal-coins');
    titleEl   = document.getElementById('cabinet-modal-title');
    deltaPopEl = document.getElementById('cabinet-modal-delta-pop');
    drawCoin(document.getElementById('cabinet-coin-icon'));

    // Seed coin HUD from current balance if we know it
    if (typeof BridgeProgression !== 'undefined') {
      BridgeProgression.getBalance().then(function (b) {
        var v = (b == null ? 0 : b);
        displayedBalance = v;
        targetBalance = v;
        if (coinNumEl) coinNumEl.textContent = String(v);
      });
    }

    requestAnimationFrame(function () { if (overlayEl) overlayEl.classList.add('visible'); });
    setTimeout(function () { if (iframeEl) try { iframeEl.focus(); } catch (e) {} }, 60);
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onParentKey, true);
    document.getElementById('cabinet-leave-btn').addEventListener('click', hide);
  }

  // the coin: a little gold disc in pixels
  function drawCoin(c) {
    if (!c) return;
    var g = c.getContext('2d');
    var rows = ['..####..', '.#$$$$#.', '#$$##$$#', '#$#$$$$#', '#$#$$$$#', '#$$##$$#', '.#$$$$#.', '..####..'];
    rows.forEach(function (r, y) {
      for (var x = 0; x < 8; x++) {
        var ch = r[x];
        if (ch === '.') continue;
        g.fillStyle = ch === '#' ? '#a07020' : '#ffd860';
        g.fillRect(x * 2 + 2, y * 2 + 2, 2, 2);
      }
    });
  }

  function renderShellHTML() {
    var title = (current && current.title) ? current.title : 'GAME';
    return '' +
      '<div class="cm-bar">' +
        '<div class="cm-title"><span class="cm-kicker">' + escapeHtml((current && current.kicker) || { enigma: 'TERMINAL', ship: 'GAME ROOM', void: 'THE BRINK', lumar: 'GAME', casino: 'NEON ROYALE' }[frameFor()] || 'CABINET') +
          '</span><span class="cm-sep">/</span><span id="cabinet-modal-title">' + escapeHtml(title) + '</span></div>' +
        '<div class="cm-mid"><div class="cm-coins"><canvas width="20" height="20" id="cabinet-coin-icon"></canvas>' +
          '<span id="cabinet-modal-coins">0</span><div id="cabinet-modal-delta-pop"></div></div>' +
          (current && current.together ? '<div class="cm-vs" id="cabinet-vs"></div>' : '') + '</div>' +
        '<div class="cm-right"><span class="cm-hint" id="cabinet-hint"></span>' +
          '<button id="cabinet-leave-btn"><span class="ip-key">Esc</span> Leave</button></div>' +
      '</div>' +
      '<div class="cm-screen">' +
        '<iframe id="cabinet-iframe" src="' + escapeAttr(current ? current.url : 'about:blank') + '" allow="autoplay; gamepad; fullscreen"></iframe>' +
      '</div>';
  }

  function hide() {
    if (!open) return;
    open = false;
    var was = current;
    window.removeEventListener('message', onMessage);
    window.removeEventListener('keydown', onParentKey, true);
    cancelTicker();
    if (overlayEl) {
      overlayEl.classList.remove('visible');
      var el = overlayEl;
      setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 200);
    }
    overlayEl = iframeEl = coinNumEl = titleEl = deltaPopEl = null;
    current = null;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    if (lastRun && typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) {
      BridgeQuests.toast(lastRun.title || 'Game', 'Score ' + lastRun.score + (lastRun.newBest && lastRun.score ? ' - a new best!' : ''),
        'Best ' + lastRun.best + (lastRun.coins ? ' \u00b7 +' + lastRun.coins + ' coins' : ''), false);
    }
    lastRun = null;
    // Refresh the bridge HUD to show the new balance
    if (typeof BridgeCoinHUD !== 'undefined' && BridgeCoinHUD.refresh) BridgeCoinHUD.refresh();
    if (isCasino(was) && typeof BridgeCasino !== 'undefined' && BridgeCasino.frameClosed) BridgeCasino.frameClosed();
    if (was && was.together && typeof BridgeTogether !== 'undefined' && BridgeTogether.frameClosed) BridgeTogether.frameClosed();
  }

  // the casino's chips are the pilot's coins: the bar follows each stake and payout (js/casino.js)
  function coins(balance, delta) {
    if (!open) return;
    if (typeof balance === 'number') { targetBalance = balance; startTicker(); }
    if (typeof delta === 'number' && delta > 0) showDeltaPop('+' + delta);
  }

  // playing together: the strip in the bar, and messages into the game
  function setVersus(html) {
    var el = document.getElementById('cabinet-vs');
    if (el && el.getAttribute('data-h') !== html) { el.innerHTML = html; el.setAttribute('data-h', html); }
  }
  function post(msg) {
    if (!open || !iframeEl) return;
    try { iframeEl.contentWindow.postMessage(msg, '*'); } catch (e) { /* gone */ }
  }

  function onParentKey(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      // Catch at parent — defensive in case iframe didn't postMessage. A run in
      // progress is paused first; Esc again leaves.
      e.preventDefault();
      e.stopPropagation();
      if (runActive) {
        runActive = false;
        try { iframeEl.contentWindow.postMessage({ type: 'bridge-pause' }, '*'); } catch (err) { /* gone */ }
        hint(runHint || 'Paused \u00b7 Esc again to leave');
        return;
      }
      hide();
    }
  }

  function hint(t) {
    var el = document.getElementById('cabinet-hint');
    if (!el) return;
    el.textContent = t || '';
    clearTimeout(hint.timer);
    if (t) hint.timer = setTimeout(function () { if (el) el.textContent = ''; }, 2600);
  }

  function onMessage(e) {
    var d = e && e.data;
    if (!d || !d.type || typeof d.type !== 'string') return;
    if (!d.type.indexOf || d.type.indexOf('bridge-') !== 0) return;
    if (d.type.indexOf('bridge-together-') === 0) {
      if (current && current.together && typeof BridgeTogether !== 'undefined') BridgeTogether.fromFrame(d);
      return;
    }
    if (d.type.indexOf('bridge-casino-') === 0) {
      if (isCasino(current) && typeof BridgeCasino !== 'undefined' && e.source === (iframeEl && iframeEl.contentWindow)) BridgeCasino.fromFrame(d);
      return;
    }

    if (d.type === 'bridge-iframe-ready') {
      // Game booted inside the iframe; focus it so keys reach it.
      if (iframeEl) try { iframeEl.focus(); } catch (err) {}
      return;
    }
    if (d.type === 'bridge-coins-changed') {
      if (typeof d.balance === 'number') {
        targetBalance = d.balance;
        startTicker();
      }
      if (typeof d.delta === 'number' && d.delta > 0) {
        showDeltaPop('+' + d.delta);
      }
      return;
    }
    if (d.type === 'bridge-trophy-earned') {
      showDeltaPop('★ TROPHY · ' + String(d.key || '').replace(/_/g, ' ').toUpperCase());
      return;
    }
    if (d.type === 'bridge-request-close') {
      hide();
      return;
    }
    if (d.type === 'bridge-run-state') {
      runActive = !!d.active && !d.paused;
      runHint = d.hint || '';
      if (d.paused) hint('Paused \u00b7 Esc again to leave');
      return;
    }
    if (d.type === 'bridge-run-ended') {
      lastRun = d;
      runActive = false;
      return;
    }
  }

  // ---- Coin ticker animation ----
  function startTicker() {
    if (animFrame !== null) return;
    lastFrameTs = performance.now();
    animFrame = requestAnimationFrame(tickerStep);
  }
  function cancelTicker() {
    if (animFrame !== null) { cancelAnimationFrame(animFrame); animFrame = null; }
  }
  function tickerStep(ts) {
    var dt = Math.min(48, ts - lastFrameTs);
    lastFrameTs = ts;
    var delta = targetBalance - displayedBalance;
    if (Math.abs(delta) < 0.5) {
      displayedBalance = targetBalance;
      if (coinNumEl) coinNumEl.textContent = String(targetBalance);
      animFrame = null;
      return;
    }
    var step = Math.sign(delta) * Math.max(1, Math.abs(delta) * 0.10) * (dt / 16);
    displayedBalance += step;
    if ((delta > 0 && displayedBalance > targetBalance) ||
        (delta < 0 && displayedBalance < targetBalance)) {
      displayedBalance = targetBalance;
    }
    if (coinNumEl) coinNumEl.textContent = String(Math.round(displayedBalance));
    animFrame = requestAnimationFrame(tickerStep);
  }

  function showDeltaPop(text) {
    if (!deltaPopEl) return;
    deltaPopEl.textContent = text;
    deltaPopEl.style.opacity = '1';
    deltaPopEl.style.transform = 'translateY(0)';
    requestAnimationFrame(function () {
      deltaPopEl.style.transform = 'translateY(-18px)';
    });
    setTimeout(function () {
      if (deltaPopEl) {
        deltaPopEl.style.opacity = '0';
        deltaPopEl.style.transform = 'translateY(0)';
      }
    }, 1800);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  return { show: show, hide: hide, isOpen: function () { return open; }, setVersus: setVersus, post: post, coins: coins };
})();
