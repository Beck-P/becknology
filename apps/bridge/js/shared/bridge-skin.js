/**
 * BridgeSkin — drops a consistent bridge top bar onto deep app pages
 * (chess, cipher-room, typist, aether-seas, genart, runouts) and plays
 * a fade-in/fade-out transition. The bridge does the matching fade
 * before navigating here.
 *
 * Pages should include:
 *   <link rel="stylesheet" href="/bridge/css/bridge-skin.css">
 *   <script src="/bridge/js/shared/bridge-skin.js" data-title="CHESS"></script>
 *
 * Setting data-title on the script tag controls the centered title text.
 * If omitted, defaults to document.title's first word.
 *
 * If running inside an iframe (cabinet modal mode), the skin auto-hides
 * — the bridge's modal chrome takes over.
 */
(function () {
  // Don't render any skin when embedded in the cabinet modal.
  var inIframe = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  if (inIframe) return;

  var scriptEl = document.currentScript ||
                 document.querySelector('script[src*="bridge-skin.js"]');
  var title = (scriptEl && scriptEl.getAttribute('data-title')) ||
              (document.title || 'APP').split(/[—·:|]/)[0].trim();

  // Build elements ASAP. We append them after DOMContentLoaded so the host
  // page's body exists.
  function build() {
    if (document.getElementById('bridge-skin-bar')) return;

    // Fade overlay
    var fade = document.createElement('div');
    fade.id = 'bridge-skin-fade';
    document.body.appendChild(fade);

    // Top bar
    var bar = document.createElement('div');
    bar.id = 'bridge-skin-bar';
    bar.innerHTML =
      '<button id="bridge-skin-back" type="button">&larr; BRIDGE</button>' +
      '<div id="bridge-skin-title">' + escapeHtml(title.toUpperCase()) + '</div>' +
      '<div id="bridge-skin-coin">' +
        '<canvas width="18" height="18"></canvas>' +
        '<span id="bridge-skin-coin-num">…</span>' +
      '</div>';
    document.body.appendChild(bar);

    // Hide any preexisting "back to hub" links the host page might have.
    // Common patterns: anchor href="/" or href="/index.html" with "back" or "hub" text.
    var anchors = document.querySelectorAll('a');
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var href = (a.getAttribute('href') || '').trim();
      var text = (a.textContent || '').trim().toLowerCase();
      if ((href === '/' || href === '/index.html') &&
          /back|hub|home/.test(text)) {
        a.classList.add('bridge-skin-hide-existing-back');
      }
    }

    // Paint coin icon
    var coinCanvas = document.querySelector('#bridge-skin-coin canvas');
    if (coinCanvas) drawCoinIcon(coinCanvas);

    // Wire ← BRIDGE
    document.getElementById('bridge-skin-back').addEventListener('click', function () {
      fadeOutAndNavigate('/bridge');
    });

    // Fade in
    setTimeout(function () {
      fade.classList.add('in');
      bar.classList.add('show');
    }, 30);

    // Pull live balance
    refreshBalance();
    // Refresh occasionally — cheap way to keep it ~accurate during long sessions.
    setInterval(refreshBalance, 8000);

    // Listen for any in-session coin events (from progression.js)
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.onCoinChange) {
      BridgeProgression.onCoinChange(function (e) {
        var el = document.getElementById('bridge-skin-coin-num');
        if (el && typeof e.balance === 'number') el.textContent = String(e.balance);
      });
    }
  }

  function refreshBalance() {
    if (typeof BridgeProgression === 'undefined') return;
    BridgeProgression.getBalance().then(function (b) {
      var el = document.getElementById('bridge-skin-coin-num');
      if (el) el.textContent = String(b == null ? 0 : b);
    });
  }

  function fadeOutAndNavigate(url) {
    var fade = document.getElementById('bridge-skin-fade');
    var bar = document.getElementById('bridge-skin-bar');
    if (fade) { fade.classList.remove('in'); fade.classList.add('out'); }
    if (bar) bar.classList.remove('show');
    setTimeout(function () { window.location.href = url; }, 280);
  }

  function drawCoinIcon(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.fillStyle = '#664018';
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    var g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 8);
    g.addColorStop(0, '#ffe890'); g.addColorStop(0.6, '#e0a040'); g.addColorStop(1, '#a06820');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a4818'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#7a4818';
    ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,200,0.55)';
    ctx.beginPath(); ctx.arc(cx - 2.4, cy - 2.6, 1.7, 0, Math.PI * 2); ctx.fill();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
