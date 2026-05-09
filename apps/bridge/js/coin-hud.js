/**
 * BridgeCoinHUD — Persistent top-right coin balance display.
 *
 * Stays visible in any bridge world (Bridge, Quarters, Arcadia, etc.).
 * On state change to 'world', refreshes from Supabase to catch any
 * coin earnings the player picked up while inside an app.
 *
 * The number animates with a smooth count-up ticker when it changes —
 * old "you got 15 coins" feel without a popup toast. Subtle pulse on
 * the icon while the ticker is running.
 *
 * Hidden during intro/identity (those are pre-pilot states).
 */
var BridgeCoinHUD = (function () {

  var hud = null;        // root element
  var iconEl = null;
  var numberEl = null;

  var displayValue = 0;     // what's currently shown
  var targetValue = 0;      // where we want to be
  var animFrame = null;
  var lastFrameTs = 0;

  // ---- Build the DOM element on first init ----
  function ensureHUD() {
    if (hud) return hud;
    hud = document.createElement('div');
    hud.id = 'coin-hud';
    hud.style.cssText =
      'position:fixed;top:54px;right:16px;z-index:50;' +
      'display:none;align-items:center;gap:8px;' +
      'padding:6px 14px 6px 10px;' +
      'background:rgba(10,18,28,0.78);' +
      'border:1px solid rgba(255,200,80,0.45);' +
      'border-radius:24px;' +
      'font-family:"Courier New",Consolas,monospace;' +
      'color:#ffe080;font-size:14px;letter-spacing:2px;' +
      'box-shadow:0 0 14px rgba(255,200,80,0.18),inset 0 0 6px rgba(255,200,80,0.05);' +
      'pointer-events:none;' +
      'transition:transform 0.2s ease, box-shadow 0.2s ease;';

    // Coin icon — small canvas with a procedural gold disc
    iconEl = document.createElement('canvas');
    iconEl.width = 22; iconEl.height = 22;
    iconEl.style.cssText = 'width:22px;height:22px;display:block;flex:none;';
    drawCoinIcon(iconEl);

    numberEl = document.createElement('span');
    numberEl.id = 'coin-hud-num';
    numberEl.textContent = '0';
    numberEl.style.cssText = 'min-width:2ch;text-align:right;';

    hud.appendChild(iconEl);
    hud.appendChild(numberEl);
    document.body.appendChild(hud);
    return hud;
  }

  // ---- Procedural coin icon (gold disc with shine) ----
  function drawCoinIcon(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    // Outer dark rim
    ctx.fillStyle = '#664018';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    // Body gradient
    var g = ctx.createRadialGradient(cx - 2, cy - 3, 1, cx, cy, 10);
    g.addColorStop(0, '#ffe890');
    g.addColorStop(0.6, '#e0a040');
    g.addColorStop(1, '#a06820');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.strokeStyle = '#7a4818';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed star/dot in center
    ctx.fillStyle = '#7a4818';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Top-left highlight
    ctx.fillStyle = 'rgba(255,255,200,0.55)';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Show / hide based on bridge state ----
  function show() {
    ensureHUD();
    hud.style.display = 'flex';
  }

  function hide() {
    if (hud) hud.style.display = 'none';
  }

  // ---- Ticker animation: smooth count-up to the target ----
  function setBalance(value, opts) {
    ensureHUD();
    if (!Number.isFinite(value)) value = 0;
    var animate = !opts || opts.animate !== false;
    var fromCurrent = displayValue;

    if (!animate) {
      displayValue = value;
      targetValue = value;
      numberEl.textContent = String(value);
      cancelTicker();
      return;
    }

    targetValue = value;
    if (Math.abs(targetValue - displayValue) < 0.5) {
      displayValue = targetValue;
      numberEl.textContent = String(Math.round(displayValue));
      return;
    }
    startTicker();

    // Subtle pulse while ticking
    if (targetValue > fromCurrent) {
      hud.style.transform = 'scale(1.08)';
      hud.style.boxShadow = '0 0 22px rgba(255,200,80,0.45),inset 0 0 8px rgba(255,200,80,0.15)';
      setTimeout(function () {
        if (!hud) return;
        hud.style.transform = '';
        hud.style.boxShadow = '0 0 14px rgba(255,200,80,0.18),inset 0 0 6px rgba(255,200,80,0.05)';
      }, 600);
    }
  }

  function startTicker() {
    if (animFrame !== null) return;
    lastFrameTs = performance.now();
    animFrame = requestAnimationFrame(tickerStep);
  }

  function cancelTicker() {
    if (animFrame !== null) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function tickerStep(ts) {
    var dt = Math.min(48, ts - lastFrameTs);
    lastFrameTs = ts;

    var delta = targetValue - displayValue;
    if (Math.abs(delta) < 0.5) {
      displayValue = targetValue;
      numberEl.textContent = String(targetValue);
      animFrame = null;
      return;
    }

    // Speed scales with magnitude — small deltas tick fast, big ones flow
    // through the digits dramatically.
    var step = Math.sign(delta) * Math.max(1, Math.abs(delta) * 0.10) * (dt / 16);
    displayValue += step;
    if ((delta > 0 && displayValue > targetValue) ||
        (delta < 0 && displayValue < targetValue)) {
      displayValue = targetValue;
    }
    numberEl.textContent = String(Math.round(displayValue));

    animFrame = requestAnimationFrame(tickerStep);
  }

  // ---- Refresh from Supabase ----
  function refreshFromServer() {
    if (typeof BridgeProgression === 'undefined') return;
    BridgeProgression.getBalance().then(function (balance) {
      // Always show in world states; default to 0 if Supabase is unreachable
      // or the schema isn't applied yet.
      show();
      setBalance(balance == null ? 0 : balance);
    });
  }

  // ---- State machine integration ----
  function init() {
    ensureHUD();

    // Hide for pre-pilot states; show in any 'world' state
    BridgeState.onChange(function (newState) {
      if (newState === 'world') {
        show();
        // Refresh from server to pick up any coins earned inside an app
        refreshFromServer();
      } else if (newState === 'starmap' || newState === 'travel' || newState === 'landing') {
        // Keep HUD visible during navigation states
        show();
      } else {
        hide();
      }
    });

    // Listen for in-tab coin updates (from BridgeProgression in same window)
    if (typeof BridgeProgression !== 'undefined') {
      BridgeProgression.onCoinChange(function (e) {
        show();
        setBalance(e.balance);
      });
    }
  }

  return { init: init, show: show, hide: hide, setBalance: setBalance, refresh: refreshFromServer };
})();
