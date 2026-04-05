/**
 * BridgeCockpit — Cockpit view using PNG sprite.
 *
 * The cockpit image is drawn over the starfield canvas. Dark windshield
 * pixels are made transparent so stars show through. DOM hotspots overlay
 * for click interaction:
 *   - Center screen → star map
 *   - Left panel → stats (OFFLINE in Phase 1)
 *   - Right panel → upgrades (OFFLINE in Phase 1)
 */
var BridgeCockpit = (function () {
  var overlay;
  var shown = false;
  var cockpitCanvas = null;

  // Hotspot positions (% of viewport) — matched to cockpit image layout
  var LAYOUT = {
    center: { x: 0.33, y: 0.44, w: 0.34, h: 0.26 },
    left:   { x: 0.02, y: 0.52, w: 0.22, h: 0.38 },
    right:  { x: 0.76, y: 0.52, w: 0.22, h: 0.38 },
  };

  // ---- Load and process cockpit sprite ----
  function loadCockpit() {
    var img = new Image();
    img.onload = function () {
      cockpitCanvas = document.createElement('canvas');
      cockpitCanvas.width = img.width;
      cockpitCanvas.height = img.height;
      var cctx = cockpitCanvas.getContext('2d');
      cctx.drawImage(img, 0, 0);

      // Remove white/near-white background ONLY in the windshield area (top 55%)
      // Bottom of image stays opaque (console/desk area)
      var data = cctx.getImageData(0, 0, cockpitCanvas.width, cockpitCanvas.height);
      var px = data.data;
      var cutoffY = Math.floor(cockpitCanvas.height * 0.55);

      for (var y = 0; y < cockpitCanvas.height; y++) {
        if (y > cutoffY) break; // only process top portion
        for (var x = 0; x < cockpitCanvas.width; x++) {
          var i = (y * cockpitCanvas.width + x) * 4;
          var r = px[i], g = px[i + 1], b = px[i + 2];
          if (r > 245 && g > 245 && b > 245) {
            px[i + 3] = 0;
          } else if (r > 210 && g > 210 && b > 210) {
            var avg = (r + g + b) / 3;
            var fade = Math.max(0, Math.min(255, Math.round((255 - avg) * (255 / 45))));
            px[i + 3] = Math.min(px[i + 3], fade);
          }
        }
      }
      cctx.putImageData(data, 0, 0);
    };
    img.src = '/bridge/assets/cockpit.png';
  }

  loadCockpit();

  // ================================================================

  function show() {
    overlay = document.getElementById('cockpit-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');
    shown = true;

    var pilot = BridgeState.getPilot();
    var pilotName = pilot ? pilot.name : 'PILOT';

    overlay.innerHTML =
      // Center screen hotspot (star map) — prominent, clickable
      '<div class="cockpit-hotspot cockpit-nav" id="hotspot-center" style="' + rectStyle(LAYOUT.center) + '">' +
        '<div class="cockpit-nav-label">CLICK TO NAVIGATE</div>' +
      '</div>' +
      // Left panel (offline)
      '<div class="cockpit-hotspot offline" style="' + rectStyle(LAYOUT.left) + '">' +
        '<div class="cockpit-label" style="width:100%;top:8px;">STATS</div>' +
        '<div class="offline-text" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">OFFLINE</div>' +
      '</div>' +
      // Right panel (offline)
      '<div class="cockpit-hotspot offline" style="' + rectStyle(LAYOUT.right) + '">' +
        '<div class="cockpit-label" style="width:100%;top:8px;">UPGRADES</div>' +
        '<div class="offline-text" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">OFFLINE</div>' +
      '</div>' +
      // Pilot switch
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

  /** Draw cockpit image over the starfield each frame. */
  function draw(ctx, w, h) {
    if (!shown || !cockpitCanvas) return;

    // Draw cockpit: responsive sizing, pinned to bottom
    var imgAspect = cockpitCanvas.width / cockpitCanvas.height;
    var drawW, drawH, drawX, drawY;

    if (w > h) {
      // Landscape / desktop: fill width
      drawW = w;
      drawH = w / imgAspect;
    } else {
      // Portrait / mobile: fill at least 55% of height so console is usable
      drawH = h * 0.55;
      drawW = drawH * imgAspect;
      // But never narrower than the screen
      if (drawW < w) {
        drawW = w;
        drawH = w / imgAspect;
      }
    }

    drawX = (w - drawW) / 2;
    drawY = h - drawH;

    ctx.drawImage(cockpitCanvas, drawX, drawY, drawW, drawH);
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
