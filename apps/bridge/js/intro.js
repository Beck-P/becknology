/**
 * BridgeIntro — Ship flying through space + BECKNOLOGY ASCII art.
 *
 * Sequence:
 *   1. Ship flies through starfield (top-down isometric view)
 *   2. BECKNOLOGY logo fades in after ~1.5s
 *   3. "CLICK TO BEGIN" appears
 *   4. On click/enter: camera zooms into ship (3rd → 1st person), then cockpit
 */
var BridgeIntro = (function () {
  var overlay;
  var bound = false;

  // ---- Ship colors ----
  var C = {
    // Hull
    outline:  '#0a0a16',
    hDark:    '#1e1e36',
    hMid:     '#30304c',
    hLight:   '#4a4a6a',
    hBright:  '#646488',
    hHi:      '#8080a2',
    hWhite:   '#9c9cba',
    hPeak:    '#b4b4d0',
    // Cockpit glass
    gDark:    '#1450a8',
    gMid:     '#2070d8',
    gBright:  '#3898f0',
    gHi:      '#68c0ff',
    gGlare:   '#a0e0ff',
    // Red/orange panels
    rDark:    '#6c2020',
    rMid:     '#a43434',
    rBright:  '#cc4838',
    rHi:      '#e06048',
    // Engine
    eDark:    '#1840b0',
    eMid:     '#3068e0',
    eBright:  '#5898ff',
    eWhite:   '#90c0ff',
    eGlow:    '#b0d8ff',
    // Wings
    wDark:    '#1a1a30',
    wMid:     '#282844',
    wLight:   '#3a3a5a',
    wHi:      '#4c4c70',
  };

  // ---- Animation state ----
  var anim = {
    t0: 0,
    bobPhase: 0,
    logoOpacity: 0,
    promptOpacity: 0,
    zooming: false,
    zoomStart: 0,
    zoomDuration: 2000,
    active: false,
  };

  // ---- ASCII logo (same as hub) ----
  var ASCII_LOGO =
    ' ██████╗ ███████╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗   ██╗\n' +
    ' ██╔══██╗██╔════╝██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝\n' +
    ' ██████╔╝█████╗  ██║     █████╔╝ ██╔██╗ ██║██║   ██║██║     ██║   ██║██║  ███╗╚████╔╝\n' +
    ' ██╔══██╗██╔══╝  ██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║     ██║   ██║██║   ██║ ╚██╔╝\n' +
    ' ██████╔╝███████╗╚██████╗██║  ██╗██║ ╚████║╚██████╔╝███████╗╚██████╔╝╚██████╔╝  ██║\n' +
    ' ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝  ╚═╝';

  // ================================================================
  //  SHIP RENDERER — Procedural pixel art
  //  Drawn with pixel-snapped rects for clean pixel art look.
  //  Ship is ~25px wide × 35px tall at base, scaled by `s` (pixel size).
  //  Origin (0,0) = center of ship. Nose points up (negative Y).
  // ================================================================

  function drawShip(ctx, cx, cy, s) {
    // -- helpers --
    function px(x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(s), Math.ceil(s));
    }
    function rect(x, y, w, h, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(w * s), Math.ceil(h * s));
    }
    // Symmetric pair of pixels
    function mpx(x, y, c) { px(x, y, c); px(-x - 1, y, c); }
    // Symmetric pair of rects
    function mrect(x, y, w, h, c) { rect(x, y, w, h, c); rect(-x - w, y, w, h, c); }
    // Symmetric row: draws from -hw to +hw (centered)
    function hullRow(y, hw, c) { rect(-hw, y, hw * 2 + 1, 1, c); }

    // ----- 1. HULL BODY (base fill) -----
    // Hull profile: [y, halfWidth] — defines the fuselage silhouette
    var hull = [
      [-17, 0], [-16, 1], [-15, 1], [-14, 2], [-13, 2],
      [-12, 3], [-11, 3], [-10, 4], [-9, 5], [-8, 5],
      [-7, 5], [-6, 5], [-5, 5], [-4, 5], [-3, 5],
      [-2, 6], [-1, 6], [0, 6], [1, 6], [2, 6],
      [3, 6], [4, 5], [5, 5], [6, 5], [7, 5],
      [8, 5], [9, 4], [10, 4], [11, 3], [12, 3],
    ];

    // Fill hull with mid tone
    for (var i = 0; i < hull.length; i++) {
      hullRow(hull[i][0], hull[i][1], C.hLight);
    }

    // ----- 2. HULL SHADING (3D depth) -----
    // Outline edges
    for (var i = 0; i < hull.length; i++) {
      var y = hull[i][0], hw = hull[i][1];
      px(-hw, y, C.outline);
      px(hw, y, C.outline);
    }
    // Top/bottom outline
    px(0, -17, C.outline);
    for (var x = -3; x <= 3; x++) px(x, 12, C.outline);

    // Dark edge band (second pixel from edge)
    for (var i = 0; i < hull.length; i++) {
      var y = hull[i][0], hw = hull[i][1];
      if (hw > 1) { px(-hw + 1, y, C.hDark); px(hw - 1, y, C.hDark); }
    }

    // Mid-dark band (third from edge)
    for (var i = 0; i < hull.length; i++) {
      var y = hull[i][0], hw = hull[i][1];
      if (hw > 2) { px(-hw + 2, y, C.hMid); px(hw - 2, y, C.hMid); }
    }

    // Center highlight stripe (bright vertical line down center)
    for (var i = 0; i < hull.length; i++) {
      var y = hull[i][0];
      px(0, y, C.hHi);
    }

    // Nose tip highlight
    px(0, -16, C.hWhite);
    px(0, -15, C.hBright);

    // ----- 3. HULL PANEL LINES (horizontal) -----
    var panelLines = [-12, -6, 0, 6];
    for (var p = 0; p < panelLines.length; p++) {
      var py = panelLines[p];
      // Find hull width at this y
      for (var i = 0; i < hull.length; i++) {
        if (hull[i][0] === py) {
          var hw = hull[i][1];
          for (var x = -hw + 1; x <= hw - 1; x++) {
            px(x, py, C.hDark);
          }
          // Bright line just above (catching light)
          if (py > -17) {
            for (var x = -hw + 2; x <= hw - 2; x++) {
              px(x, py - 1, C.hBright);
            }
          }
          break;
        }
      }
    }

    // ----- 4. COCKPIT CANOPY -----
    // Blue dome shape over the nose section
    rect(-2, -12, 5, 1, C.gDark);     // bottom edge
    rect(-3, -11, 7, 1, C.gDark);
    rect(-3, -10, 7, 1, C.gMid);
    rect(-2, -9, 5, 1, C.gBright);    // brightest
    rect(-2, -8, 5, 1, C.gMid);
    rect(-1, -7, 3, 1, C.gDark);      // top narrowing

    // Canopy highlights (specular glare)
    px(-1, -10, C.gBright);
    px(0, -10, C.gHi);
    px(1, -10, C.gBright);
    px(0, -9, C.gGlare);              // bright glare spot
    px(1, -9, C.gHi);
    px(-1, -9, C.gHi);

    // Canopy outline
    px(-3, -11, C.outline);
    px(3, -11, C.outline);
    px(-3, -10, C.outline);
    px(3, -10, C.outline);
    px(-2, -12, C.outline);
    px(2, -12, C.outline);
    px(-2, -8, C.outline);
    px(2, -8, C.outline);
    px(-1, -7, C.outline);
    px(1, -7, C.outline);

    // ----- 5. RED/ORANGE ACCENT PANELS -----
    // Left and right hull panels — inspired by the reference's red blocks
    // Upper panels (rows -5 to -1)
    mrect(3, -5, 2, 5, C.rDark);
    mrect(3, -4, 2, 3, C.rMid);
    mrect(4, -4, 1, 3, C.rBright);    // bright inner edge

    // Lower panels (rows 1 to 5)
    mrect(3, 1, 2, 5, C.rDark);
    mrect(3, 2, 2, 3, C.rMid);
    mrect(4, 2, 1, 3, C.rBright);

    // Small accent dots (panel details)
    mpx(3, -3, C.rHi);
    mpx(3, 3, C.rHi);

    // ----- 6. HULL DETAIL PIXELS -----
    // Vent/intake marks on upper hull
    mpx(2, -14, C.hDark);
    mpx(2, -13, C.hMid);

    // Lower hull panel details
    mpx(1, 7, C.hDark);
    mpx(2, 7, C.hDark);
    mpx(1, 8, C.hMid);
    mpx(2, 8, C.hMid);

    // Bright rivets/lights along hull
    mpx(1, -4, C.hPeak);
    mpx(1, 2, C.hPeak);

    // ----- 7. WINGS -----
    // Swept-back wings extending from hull at rows -2 to 6
    // Left wing
    var wingRows = [
      { y: -1, x1: -7, x2: -6 },
      { y: 0, x1: -9, x2: -6 },
      { y: 1, x1: -11, x2: -6 },
      { y: 2, x1: -12, x2: -6 },
      { y: 3, x1: -12, x2: -6 },
      { y: 4, x1: -11, x2: -5 },
      { y: 5, x1: -10, x2: -5 },
      { y: 6, x1: -8, x2: -5 },
      { y: 7, x1: -7, x2: -5 },
    ];

    for (var i = 0; i < wingRows.length; i++) {
      var wr = wingRows[i];
      // Left wing
      for (var x = wr.x1; x <= wr.x2; x++) {
        var shade = C.wMid;
        if (x === wr.x1 || x === wr.x2) shade = C.outline;
        else if (x === wr.x1 + 1) shade = C.wDark;
        else if (x === wr.x2 - 1) shade = C.wHi;
        px(x, wr.y, shade);
      }
      // Right wing (mirrored)
      for (var x = wr.x1; x <= wr.x2; x++) {
        var mx = -x - 1;
        var shade = C.wMid;
        if (x === wr.x1 || x === wr.x2) shade = C.outline;
        else if (x === wr.x1 + 1) shade = C.wHi;
        else if (x === wr.x2 - 1) shade = C.wDark;
        px(mx, wr.y, shade);
      }
    }

    // Wing panel line
    for (var i = 0; i < wingRows.length; i++) {
      var wr = wingRows[i];
      if (wr.y === 2 || wr.y === 5) {
        for (var x = wr.x1 + 1; x <= wr.x2 - 1; x++) {
          px(x, wr.y, C.wDark);
          px(-x - 1, wr.y, C.wDark);
        }
      }
    }

    // Wing-tip accents (red)
    px(-12, 2, C.rMid);
    px(-12, 3, C.rMid);
    px(-11, 1, C.rDark);
    px(11, 2, C.rMid);
    px(11, 3, C.rMid);
    px(10, 1, C.rDark);

    // ----- 8. ENGINE NACELLES -----
    // Two pods separated by a gap, extending from rear hull
    // Left nacelle
    rect(-4, 10, 3, 1, C.outline);
    rect(-4, 11, 3, 1, C.hDark);
    rect(-4, 12, 3, 1, C.hMid);
    rect(-4, 13, 3, 1, C.hLight);
    rect(-4, 14, 3, 1, C.hMid);
    rect(-4, 15, 3, 1, C.outline);
    // Nacelle inner shading
    px(-3, 11, C.hLight);
    px(-3, 12, C.hBright);
    px(-3, 13, C.hHi);
    px(-3, 14, C.hBright);

    // Right nacelle (mirrored)
    rect(2, 10, 3, 1, C.outline);
    rect(2, 11, 3, 1, C.hDark);
    rect(2, 12, 3, 1, C.hMid);
    rect(2, 13, 3, 1, C.hLight);
    rect(2, 14, 3, 1, C.hMid);
    rect(2, 15, 3, 1, C.outline);
    px(3, 11, C.hLight);
    px(3, 12, C.hBright);
    px(3, 13, C.hHi);
    px(3, 14, C.hBright);

    // Red accent on nacelles
    px(-4, 12, C.rMid);
    px(-4, 13, C.rMid);
    px(4, 12, C.rMid);
    px(4, 13, C.rMid);

    // ----- 9. ENGINE GLOW (static part) -----
    // Blue-white exhaust ports
    px(-3, 15, C.eDark);
    px(-2, 15, C.eMid);
    px(2, 15, C.eDark);
    px(3, 15, C.eMid);

    rect(-4, 16, 3, 1, C.eMid);
    rect(2, 16, 3, 1, C.eMid);
    px(-3, 16, C.eBright);
    px(3, 16, C.eBright);
  }

  // ---- ENGINE FLAMES (animated) ----
  function drawThrust(ctx, cx, cy, s, time) {
    function px(x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(s), Math.ceil(s));
    }

    // Two engine positions (left at x=-3, right at x=3)
    var engines = [-3, 3];
    var flicker = Math.sin(time * 0.02) * 0.5 + 0.5;

    for (var e = 0; e < engines.length; e++) {
      var ex = engines[e];

      // Core flame (blue-white, tight)
      px(ex, 17, C.eWhite);
      px(ex, 18, C.eBright);
      px(ex, 19, C.eMid);

      // Outer flame (orange/yellow, wider and flickering)
      var flameLen = 6 + Math.floor(flicker * 4);
      for (var f = 0; f < flameLen; f++) {
        var fy = 17 + f;
        var alpha = 1 - (f / flameLen);
        var spread = Math.floor(f * 0.4);

        // Core
        var coreAlpha = alpha * (0.6 + Math.random() * 0.4);
        ctx.fillStyle = 'rgba(88, 152, 255, ' + coreAlpha + ')';
        ctx.fillRect(Math.round(cx + ex * s), Math.round(cy + fy * s), Math.ceil(s), Math.ceil(s));

        // Orange outer glow
        for (var sx = -spread; sx <= spread; sx++) {
          if (sx === 0) continue;
          var sAlpha = alpha * 0.4 * (0.5 + Math.random() * 0.5);
          if (f < 3) {
            ctx.fillStyle = 'rgba(220, 120, 40, ' + sAlpha + ')';
          } else {
            ctx.fillStyle = 'rgba(240, 170, 50, ' + sAlpha + ')';
          }
          ctx.fillRect(
            Math.round(cx + (ex + sx) * s),
            Math.round(cy + fy * s),
            Math.ceil(s), Math.ceil(s)
          );
        }
      }

      // Engine glow halo
      var grad = ctx.createRadialGradient(
        cx + ex * s, cy + 17 * s, 0,
        cx + ex * s, cy + 17 * s, s * 5
      );
      grad.addColorStop(0, 'rgba(88, 152, 255, 0.15)');
      grad.addColorStop(0.5, 'rgba(88, 152, 255, 0.05)');
      grad.addColorStop(1, 'rgba(88, 152, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(
        cx + (ex - 5) * s, cy + 14 * s,
        s * 10, s * 14
      );
    }
  }

  // ================================================================
  //  MAIN DRAW + ANIMATION
  // ================================================================

  function show() {
    overlay = document.getElementById('intro-overlay');
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.classList.add('active');

    overlay.innerHTML =
      '<pre class="intro-ascii" id="intro-logo" style="opacity:0">' + ASCII_LOGO + '</pre>' +
      '<p class="intro-prompt" id="intro-prompt" style="opacity:0">CLICK TO BEGIN</p>';

    anim.t0 = performance.now();
    anim.active = true;
    anim.zooming = false;
    anim.logoOpacity = 0;
    anim.promptOpacity = 0;
    anim.bobPhase = 0;

    if (!bound) {
      bound = true;
      overlay.addEventListener('click', onBegin);
      overlay.addEventListener('touchend', function (e) {
        e.preventDefault();
        onBegin();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && anim.active && !anim.zooming && anim.promptOpacity > 0.5) {
          onBegin();
        }
      });
    }
  }

  function draw(ctx, w, h) {
    if (!anim.active) return;

    var now = performance.now();
    var elapsed = now - anim.t0;

    // Ship scale — responsive to viewport, ~3px per virtual pixel
    var baseScale = Math.min(w, h) / 200;
    var scale = Math.max(2, Math.round(baseScale));

    // Ship position: centered, slightly above middle
    var shipX = w / 2;
    var shipY = h * 0.48;

    // Gentle bob
    anim.bobPhase += 0.015;
    var bob = Math.sin(anim.bobPhase) * 4;

    if (anim.zooming) {
      // ---- Zoom animation ----
      var zoomElapsed = now - anim.zoomStart;
      var t = Math.min(1, zoomElapsed / anim.zoomDuration);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      scale = scale * (1 + eased * 14);
      shipY = h * 0.48 + eased * h * 0.7;
      bob = bob * (1 - eased);

      var logoEl = document.getElementById('intro-logo');
      var promptEl = document.getElementById('intro-prompt');
      if (logoEl) logoEl.style.opacity = Math.max(0, 1 - t * 3);
      if (promptEl) promptEl.style.opacity = Math.max(0, 1 - t * 4);

      if (t > 0.8) {
        var flashAlpha = (t - 0.8) / 0.2;
        ctx.fillStyle = 'rgba(160, 120, 220, ' + (flashAlpha * 0.7) + ')';
        ctx.fillRect(0, 0, w, h);
      }

      if (t >= 1) {
        anim.active = false;
        finishTransition();
        return;
      }
    } else {
      // ---- Logo fade in after 1.5s ----
      if (elapsed > 1500 && anim.logoOpacity < 1) {
        anim.logoOpacity = Math.min(1, (elapsed - 1500) / 1000);
        var logoEl = document.getElementById('intro-logo');
        if (logoEl) logoEl.style.opacity = anim.logoOpacity;
      }
      if (elapsed > 2500 && anim.promptOpacity < 1) {
        anim.promptOpacity = Math.min(1, (elapsed - 2500) / 800);
        var promptEl = document.getElementById('intro-prompt');
        if (promptEl) promptEl.style.opacity = anim.promptOpacity;
      }
    }

    // ---- Render ship ----
    drawShip(ctx, shipX, shipY + bob, scale);
    drawThrust(ctx, shipX, shipY + bob, scale, elapsed);

    // ---- Ambient glow around ship ----
    if (!anim.zooming) {
      var grd = ctx.createRadialGradient(shipX, shipY + bob, 0, shipX, shipY + bob, scale * 20);
      grd.addColorStop(0, 'rgba(100, 80, 160, 0.06)');
      grd.addColorStop(1, 'rgba(100, 80, 160, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(shipX - scale * 20, shipY + bob - scale * 20, scale * 40, scale * 40);
    }
  }

  function onBegin() {
    if (anim.zooming || !anim.active) return;
    if (anim.logoOpacity < 0.3) return;

    anim.zooming = true;
    anim.zoomStart = performance.now();
    BridgeStarfield.setMode('streak');
  }

  function finishTransition() {
    BridgeStarfield.setMode('drift');
    overlay.classList.remove('active');
    overlay.style.display = 'none';

    var cached = BridgeState.getCachedPilotName();
    if (cached) {
      BridgeDB.lookupPilot(cached).then(function (result) {
        if (result && !result.error) {
          BridgeState.setPilot(result);
          BridgeDB.updateLastSeen(result.id);
          BridgeState.transition('cockpit');
        } else {
          BridgeState.clearPilot();
          BridgeState.transition('identity');
        }
      });
    } else {
      BridgeState.transition('identity');
    }
  }

  function hide() {
    anim.active = false;
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  return { show: show, draw: draw, hide: hide };
})();
