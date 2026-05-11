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
 */
var BridgeCabinetModal = (function () {

  var overlayEl = null;
  var iframeEl = null;
  var coinNumEl = null;
  var titleEl = null;
  var deltaPopEl = null;
  var open = false;
  var current = null;     // { url, title, gameKey }
  var displayedBalance = 0;
  var targetBalance = 0;
  var animFrame = null;
  var lastFrameTs = 0;

  function show(opts) {
    if (open) return;
    if (!opts || !opts.url) return;
    open = true;
    current = opts;

    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();

    overlayEl = document.createElement('div');
    overlayEl.id = 'cabinet-modal-overlay';
    overlayEl.style.cssText =
      'position:fixed;inset:0;z-index:300;' +
      'background:rgba(4,8,14,0.96);' +
      'display:flex;flex-direction:column;' +
      'font-family:"Courier New",Consolas,monospace;color:#e0e0e0;' +
      'opacity:0;transition:opacity 0.18s ease;';

    overlayEl.innerHTML = renderShellHTML();
    document.body.appendChild(overlayEl);

    iframeEl = document.getElementById('cabinet-iframe');
    coinNumEl = document.getElementById('cabinet-modal-coins');
    titleEl   = document.getElementById('cabinet-modal-title');
    deltaPopEl = document.getElementById('cabinet-modal-delta-pop');

    // Seed coin HUD from current balance if we know it
    if (typeof BridgeProgression !== 'undefined') {
      BridgeProgression.getBalance().then(function (b) {
        var v = (b == null ? 0 : b);
        displayedBalance = v;
        targetBalance = v;
        if (coinNumEl) coinNumEl.textContent = String(v);
      });
    }

    // Fade in
    requestAnimationFrame(function () { overlayEl.style.opacity = '1'; });

    // Focus the iframe so keyboard events reach the game
    setTimeout(function () { if (iframeEl) try { iframeEl.focus(); } catch (e) {} }, 60);

    // Listen for postMessages from the game
    window.addEventListener('message', onMessage);
    // Also listen at the parent level — some games swallow Esc internally,
    // but if the iframe never gets focus the parent will catch it.
    window.addEventListener('keydown', onParentKey, true);

    // Close button
    document.getElementById('cabinet-leave-btn').addEventListener('click', hide);
  }

  function renderShellHTML() {
    var title = (current && current.title) ? current.title : 'GAME';
    return '' +
      // Top bar with bridge chrome
      '<div style="' +
        'flex:none;padding:12px 18px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;' +
        'background:linear-gradient(180deg,rgba(20,30,46,0.96),rgba(10,18,28,0.96));' +
        'border-bottom:1px solid rgba(64,200,216,0.5);' +
        'box-shadow:0 0 18px rgba(64,200,216,0.18);">' +
        // Title
        '<div style="display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:4px;color:#80e0e8;">' +
          '<span style="font-size:10px;letter-spacing:5px;color:rgba(64,200,216,0.7);">CABINET</span>' +
          '<span style="color:#888;">/</span>' +
          '<span id="cabinet-modal-title">' + escapeHtml(title) + '</span>' +
        '</div>' +
        // Coin HUD
        '<div style="display:flex;align-items:center;gap:8px;padding:4px 12px;' +
                  'background:rgba(0,0,0,0.45);border:1px solid rgba(255,200,80,0.45);' +
                  'border-radius:18px;font-size:13px;letter-spacing:2px;color:#ffe080;' +
                  'box-shadow:0 0 12px rgba(255,200,80,0.18);position:relative;">' +
          '<canvas width="20" height="20" id="cabinet-coin-icon" ' +
            'style="width:20px;height:20px;display:block;"></canvas>' +
          '<span id="cabinet-modal-coins" style="min-width:3ch;text-align:right;">0</span>' +
          '<div id="cabinet-modal-delta-pop" style="' +
            'position:absolute;top:-22px;right:8px;font-size:12px;letter-spacing:2px;color:#ffe080;' +
            'opacity:0;transition:opacity 0.3s ease, transform 0.6s ease;pointer-events:none;"></div>' +
        '</div>' +
        // Leave button
        '<div style="display:flex;justify-content:flex-end;">' +
          '<button id="cabinet-leave-btn" style="' +
            'padding:8px 16px;background:transparent;border:1px solid rgba(160,120,220,0.5);' +
            'color:rgba(220,200,255,0.85);font-family:inherit;font-size:11px;letter-spacing:4px;' +
            'border-radius:4px;cursor:pointer;transition:background 0.15s, color 0.15s, border-color 0.15s;">' +
            '← LEAVE GAME · ESC' +
          '</button>' +
        '</div>' +
      '</div>' +
      // Iframe container
      '<div style="flex:1;position:relative;overflow:hidden;background:#000;">' +
        '<iframe id="cabinet-iframe" src="' + escapeAttr(current ? current.url : 'about:blank') + '" ' +
          'allow="autoplay; gamepad" ' +
          'style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;"></iframe>' +
      '</div>';
  }

  function hide() {
    if (!open) return;
    open = false;
    window.removeEventListener('message', onMessage);
    window.removeEventListener('keydown', onParentKey, true);
    cancelTicker();
    if (overlayEl) {
      overlayEl.style.opacity = '0';
      var el = overlayEl;
      setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 200);
    }
    overlayEl = iframeEl = coinNumEl = titleEl = deltaPopEl = null;
    current = null;
    if (typeof BridgeControls !== 'undefined' && BridgeControls.enable) BridgeControls.enable();
    // Refresh the bridge HUD to show the new balance
    if (typeof BridgeCoinHUD !== 'undefined' && BridgeCoinHUD.refresh) BridgeCoinHUD.refresh();
  }

  function onParentKey(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      // Catch at parent — defensive in case iframe didn't postMessage.
      e.preventDefault();
      e.stopPropagation();
      hide();
    }
  }

  function onMessage(e) {
    var d = e && e.data;
    if (!d || !d.type || typeof d.type !== 'string') return;
    if (!d.type.indexOf || d.type.indexOf('bridge-') !== 0) return;

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

  return { show: show, hide: hide, isOpen: function () { return open; } };
})();
