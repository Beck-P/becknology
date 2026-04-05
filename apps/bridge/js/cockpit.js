/**
 * BridgeCockpit — Cockpit frame renderer + interactive hotspots.
 *
 * Draws a pixel-art style cockpit frame on canvas.
 * DOM hotspots overlay the canvas for click interaction:
 *   - Center screen → star map
 *   - Left panel → stats (OFFLINE in Phase 1)
 *   - Right panel → upgrades (OFFLINE in Phase 1)
 */
var BridgeCockpit = (function () {
  var overlay;
  var shown = false;

  var LAYOUT = {
    windshield: { x: 0.15, y: 0.05, w: 0.70, h: 0.55 },
    console: { y: 0.60 },
    center: { x: 0.30, y: 0.62, w: 0.40, h: 0.28 },
    left: { x: 0.05, y: 0.65, w: 0.20, h: 0.22 },
    right: { x: 0.75, y: 0.65, w: 0.20, h: 0.22 },
  };

  function show() {
    overlay = document.getElementById('cockpit-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');
    shown = true;

    var pilot = BridgeState.getPilot();
    var pilotName = pilot ? pilot.name : 'PILOT';

    overlay.innerHTML =
      '<div class="cockpit-hotspot" id="hotspot-center" style="' + rectStyle(LAYOUT.center) + '">' +
        '<div class="cockpit-label" style="width:100%;top:8px;">STAR MAP</div>' +
      '</div>' +
      '<div class="cockpit-hotspot offline" style="' + rectStyle(LAYOUT.left) + '">' +
        '<div class="cockpit-label" style="width:100%;top:8px;">STATS</div>' +
        '<div class="offline-text" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">OFFLINE</div>' +
      '</div>' +
      '<div class="cockpit-hotspot offline" style="' + rectStyle(LAYOUT.right) + '">' +
        '<div class="cockpit-label" style="width:100%;top:8px;">UPGRADES</div>' +
        '<div class="offline-text" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">OFFLINE</div>' +
      '</div>' +
      '<a class="pilot-switch" id="pilot-switch">NOT ' + pilotName + '? SWITCH PILOT</a>';

    document.getElementById('hotspot-center').addEventListener('click', function () {
      BridgeState.transition('starmap');
    });

    document.getElementById('pilot-switch').addEventListener('click', function (e) {
      e.preventDefault();
      BridgeState.clearPilot();
      BridgeState.transition('identity');
    });

    if (window.innerWidth <= 768) {
      document.getElementById('dpad').style.display = 'grid';
    }
  }

  function rectStyle(r) {
    return 'left:' + (r.x * 100) + '%;top:' + (r.y * 100) + '%;' +
      'width:' + (r.w * 100) + '%;height:' + (r.h * 100) + '%;';
  }

  function draw(ctx, w, h) {
    if (!shown) return;

    var col = {
      frame: '#0d0d10',
      edge: '#1a1a22',
      accent: 'rgba(160, 120, 220, 0.08)',
      line: 'rgba(160, 120, 220, 0.12)',
      text: 'rgba(160, 120, 220, 0.15)'
    };

    // Console base (bottom 40%)
    var consoleY = h * LAYOUT.console.y;
    ctx.fillStyle = col.frame;
    ctx.fillRect(0, consoleY, w, h - consoleY);

    // Console top edge
    ctx.fillStyle = col.edge;
    ctx.fillRect(0, consoleY, w, 3);

    // Left pillar
    ctx.fillStyle = col.frame;
    ctx.fillRect(0, 0, w * 0.12, consoleY);
    ctx.fillStyle = col.edge;
    ctx.fillRect(w * 0.12, 0, 2, consoleY);

    // Right pillar
    ctx.fillStyle = col.frame;
    ctx.fillRect(w * 0.88, 0, w * 0.12, consoleY);
    ctx.fillStyle = col.edge;
    ctx.fillRect(w * 0.88 - 2, 0, 2, consoleY);

    // Top bar
    ctx.fillStyle = col.frame;
    ctx.fillRect(0, 0, w, h * 0.04);
    ctx.fillStyle = col.edge;
    ctx.fillRect(0, h * 0.04, w, 2);

    // Center screen border
    var cx = LAYOUT.center;
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx.x * w - 4, cx.y * h - 4, cx.w * w + 8, cx.h * h + 8);

    // Inner glow on center screen
    ctx.fillStyle = col.accent;
    ctx.fillRect(cx.x * w, cx.y * h, cx.w * w, cx.h * h);

    // Left panel border
    var lx = LAYOUT.left;
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.2)';
    ctx.strokeRect(lx.x * w - 2, lx.y * h - 2, lx.w * w + 4, lx.h * h + 4);

    // Right panel border
    var rx = LAYOUT.right;
    ctx.strokeRect(rx.x * w - 2, rx.y * h - 2, rx.w * w + 4, rx.h * h + 4);

    // Decorative lines on console
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 0.5;
    for (var i = 0; i < 3; i++) {
      var ly = consoleY + 8 + i * 12;
      ctx.beginPath();
      ctx.moveTo(w * 0.05, ly);
      ctx.lineTo(w * 0.25, ly);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.75, ly);
      ctx.lineTo(w * 0.95, ly);
      ctx.stroke();
    }

    // Small indicator dots
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(w * 0.06 + i * 10, h * 0.03, 2, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? 'rgba(100, 200, 120, 0.4)' : 'rgba(80, 80, 80, 0.3)';
      ctx.fill();
    }
  }

  function hide() {
    shown = false;
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
    var dpad = document.getElementById('dpad');
    if (dpad) dpad.style.display = 'none';
  }

  return { show: show, draw: draw, hide: hide };
})();
