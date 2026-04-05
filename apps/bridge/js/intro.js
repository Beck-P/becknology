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
  //  SHIP RENDERER — Procedural pixel art, ~20° behind-angle view
  //
  //  Perspective baked into the art:
  //    - Nose/cockpit (top) is SMALL and foreshortened (far from camera)
  //    - Rear hull + engines (bottom) are LARGE and wide (close to camera)
  //    - Visible rear hull face between engine nacelles
  //    - Wings attach wide at rear, narrow at front
  //  Origin (0,0) = center of ship. Nose points up (negative Y).
  // ================================================================

  function drawShip(ctx, cx, cy, s) {
    function px(x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(s), Math.ceil(s));
    }
    function rect(x, y, w, h, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(w * s), Math.ceil(h * s));
    }
    function mpx(x, y, c) { px(x, y, c); px(-x - 1, y, c); }
    function mrect(x, y, w, h, c) { rect(x, y, w, h, c); rect(-x - w, y, w, h, c); }
    function hullRow(y, hw, c) { rect(-hw, y, hw * 2 + 1, 1, c); }

    // ----- 1. HULL BODY — behind-angle perspective -----
    // Nose is narrow (far away), rear is wide (close to camera)
    // The hull widens progressively toward the bottom
    var hull = [
      // Nose — tight, foreshortened
      [-16, 0], [-15, 1], [-14, 1], [-13, 2], [-12, 2],
      // Cockpit zone — small (it's far away)
      [-11, 3], [-10, 3], [-9, 3], [-8, 3],
      // Forward hull — starts widening
      [-7, 4], [-6, 4], [-5, 5], [-4, 5],
      // Mid hull — wider
      [-3, 6], [-2, 6], [-1, 7], [0, 7],
      // Rear hull — widest (closest to camera)
      [1, 7], [2, 8], [3, 8], [4, 8], [5, 8],
      [6, 8], [7, 8], [8, 7], [9, 7],
      [10, 6], [11, 5],
    ];

    // Base fill
    for (var i = 0; i < hull.length; i++) {
      hullRow(hull[i][0], hull[i][1], C.hLight);
    }

    // ----- 2. HULL SHADING -----
    // Outline edges
    for (var i = 0; i < hull.length; i++) {
      var y = hull[i][0], hw = hull[i][1];
      px(-hw, y, C.outline);
      px(hw, y, C.outline);
    }
    px(0, -16, C.outline);
    // Bottom outline (rear face top edge)
    for (var x = -5; x <= 5; x++) px(x, 11, C.outline);

    // Dark edge band
    for (var i = 0; i < hull.length; i++) {
      var y = hull[i][0], hw = hull[i][1];
      if (hw > 1) { px(-hw + 1, y, C.hDark); px(hw - 1, y, C.hDark); }
    }

    // Mid-dark band
    for (var i = 0; i < hull.length; i++) {
      var y = hull[i][0], hw = hull[i][1];
      if (hw > 2) { px(-hw + 2, y, C.hMid); px(hw - 2, y, C.hMid); }
    }

    // Center highlight stripe
    for (var i = 0; i < hull.length; i++) {
      px(0, hull[i][0], C.hHi);
    }

    // Nose tip highlight
    px(0, -15, C.hWhite);
    px(0, -14, C.hBright);

    // ----- 3. HULL PANEL LINES -----
    var panelYs = [-7, -3, 2, 7];
    for (var p = 0; p < panelYs.length; p++) {
      var py = panelYs[p];
      for (var i = 0; i < hull.length; i++) {
        if (hull[i][0] === py) {
          var hw = hull[i][1];
          for (var x = -hw + 1; x <= hw - 1; x++) px(x, py, C.hDark);
          if (py > -16) {
            for (var x = -hw + 2; x <= hw - 2; x++) px(x, py - 1, C.hBright);
          }
          break;
        }
      }
    }

    // ----- 4. COCKPIT CANOPY (small — it's far away) -----
    rect(-1, -11, 3, 1, C.gDark);
    rect(-2, -10, 5, 1, C.gMid);
    rect(-2, -9, 5, 1, C.gBright);
    rect(-1, -8, 3, 1, C.gDark);
    // Specular
    px(0, -10, C.gHi);
    px(0, -9, C.gGlare);
    px(1, -9, C.gHi);
    px(-1, -10, C.gBright);
    // Outline
    px(-2, -10, C.outline); px(2, -10, C.outline);
    px(-2, -9, C.outline);  px(2, -9, C.outline);
    px(-1, -11, C.outline); px(1, -11, C.outline);
    px(-1, -8, C.outline);  px(1, -8, C.outline);

    // ----- 5. RED ACCENT PANELS (bigger toward rear) -----
    // Forward panels (smaller)
    mrect(3, -5, 1, 3, C.rDark);
    mrect(3, -4, 1, 1, C.rMid);

    // Main panels (wider, on the wide rear hull)
    mrect(4, -1, 3, 6, C.rDark);
    mrect(4, 0, 3, 4, C.rMid);
    mrect(5, 0, 2, 4, C.rBright);
    mrect(6, 1, 1, 2, C.rHi);

    // ----- 6. HULL DETAILS -----
    mpx(1, -13, C.hDark);
    mpx(1, -12, C.hMid);
    // Running lights
    mpx(2, -5, C.hPeak);
    mpx(3, 0, C.hPeak);
    // Rear hull panel details
    mpx(2, 8, C.hDark);
    mpx(3, 8, C.hDark);
    mpx(2, 9, C.hMid);
    mpx(3, 9, C.hMid);

    // ----- 7. WINGS (wider at rear, taper forward) -----
    var wingRows = [
      // Attach further forward but narrow
      { y: -2, x1: -8,  x2: -7 },
      { y: -1, x1: -9,  x2: -7 },
      { y: 0,  x1: -11, x2: -7 },
      { y: 1,  x1: -13, x2: -7 },
      // Widest at rear (close to camera = bigger)
      { y: 2,  x1: -14, x2: -8 },
      { y: 3,  x1: -15, x2: -8 },
      { y: 4,  x1: -15, x2: -8 },
      { y: 5,  x1: -14, x2: -8 },
      { y: 6,  x1: -13, x2: -8 },
      { y: 7,  x1: -11, x2: -8 },
      { y: 8,  x1: -9,  x2: -7 },
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

    // Wing panel lines
    for (var i = 0; i < wingRows.length; i++) {
      var wr = wingRows[i];
      if (wr.y === 2 || wr.y === 6) {
        for (var x = wr.x1 + 1; x <= wr.x2 - 1; x++) {
          px(x, wr.y, C.wDark);
          px(-x - 1, wr.y, C.wDark);
        }
      }
    }

    // Wing-tip accents (red)
    px(-15, 3, C.rMid); px(-15, 4, C.rMid); px(-14, 2, C.rDark);
    px(14, 3, C.rMid);  px(14, 4, C.rMid);  px(13, 2, C.rDark);

    // ----- 8. VISIBLE REAR HULL FACE -----
    // Because we're looking from behind, we can see the back face
    // between the engine nacelles — darker, catches less light
    rect(-5, 12, 11, 3, C.hDark);
    rect(-4, 12, 9, 3, C.hMid);
    rect(-3, 13, 7, 1, C.hLight);
    // Panel line on rear face
    for (var x = -4; x <= 4; x++) px(x, 12, C.outline);
    // Rear face edge details
    px(-5, 12, C.outline); px(5, 12, C.outline);
    px(-5, 13, C.outline); px(5, 13, C.outline);
    px(-5, 14, C.outline); px(5, 14, C.outline);

    // ----- 9. ENGINE NACELLES (large — closest to camera) -----
    // Left nacelle — wider/taller than before
    rect(-7, 11, 4, 1, C.outline);
    rect(-7, 12, 4, 1, C.hDark);
    rect(-7, 13, 4, 1, C.hMid);
    rect(-7, 14, 4, 1, C.hLight);
    rect(-7, 15, 4, 1, C.hBright);
    rect(-7, 16, 4, 1, C.hLight);
    rect(-7, 17, 4, 1, C.hMid);
    rect(-7, 18, 4, 1, C.outline);
    // Inner shading
    px(-5, 12, C.hLight); px(-5, 13, C.hBright);
    px(-5, 14, C.hHi);    px(-5, 15, C.hWhite);
    px(-5, 16, C.hHi);    px(-5, 17, C.hBright);
    // Red accent on nacelle
    px(-7, 14, C.rMid); px(-7, 15, C.rMid); px(-7, 16, C.rMid);

    // Right nacelle (mirrored)
    rect(4, 11, 4, 1, C.outline);
    rect(4, 12, 4, 1, C.hDark);
    rect(4, 13, 4, 1, C.hMid);
    rect(4, 14, 4, 1, C.hLight);
    rect(4, 15, 4, 1, C.hBright);
    rect(4, 16, 4, 1, C.hLight);
    rect(4, 17, 4, 1, C.hMid);
    rect(4, 18, 4, 1, C.outline);
    px(5, 12, C.hLight); px(5, 13, C.hBright);
    px(5, 14, C.hHi);    px(5, 15, C.hWhite);
    px(5, 16, C.hHi);    px(5, 17, C.hBright);
    px(7, 14, C.rMid); px(7, 15, C.rMid); px(7, 16, C.rMid);

    // ----- 10. ENGINE EXHAUST PORTS -----
    rect(-7, 19, 4, 1, C.eDark);
    rect(-6, 19, 2, 1, C.eMid);
    rect(-6, 20, 2, 1, C.eBright);
    px(-5, 19, C.eBright);

    rect(4, 19, 4, 1, C.eDark);
    rect(5, 19, 2, 1, C.eMid);
    rect(5, 20, 2, 1, C.eBright);
    px(5, 19, C.eBright);
  }

  // ---- ENGINE FLAMES (animated) ----
  function drawThrust(ctx, cx, cy, s, time) {
    function px(x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(s), Math.ceil(s));
    }

    // Two engine positions (wider nacelles, centered at x=-5.5 and x=5.5)
    var engines = [-5, 5];
    var flicker = Math.sin(time * 0.02) * 0.5 + 0.5;

    for (var e = 0; e < engines.length; e++) {
      var ex = engines[e];

      // Core flame (blue-white, tight)
      px(ex, 21, C.eWhite);
      px(ex, 22, C.eBright);
      px(ex, 23, C.eMid);

      // Outer flame (orange/yellow, wider and flickering)
      var flameLen = 8 + Math.floor(flicker * 5);
      for (var f = 0; f < flameLen; f++) {
        var fy = 21 + f;
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
        cx + ex * s, cy + 21 * s, 0,
        cx + ex * s, cy + 21 * s, s * 6
      );
      grad.addColorStop(0, 'rgba(88, 152, 255, 0.2)');
      grad.addColorStop(0.5, 'rgba(88, 152, 255, 0.06)');
      grad.addColorStop(1, 'rgba(88, 152, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(
        cx + (ex - 6) * s, cy + 18 * s,
        s * 12, s * 18
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
      // ---- Zoom animation (camera approaches from behind at ~20°) ----
      var zoomElapsed = now - anim.zoomStart;
      var t = Math.min(1, zoomElapsed / anim.zoomDuration);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Ship scales up as camera closes in from behind
      scale = scale * (1 + eased * 14);
      // Ship drifts upward on screen (camera behind it, looking over it)
      // then past mid-screen the ship drops below as we pass through into cockpit
      var liftPhase = Math.min(1, t * 2.5); // 0→1 in first 40%
      var dropPhase = Math.max(0, (t - 0.4) / 0.6); // 0→1 in last 60%
      shipY = h * 0.48 - liftPhase * h * 0.08 + dropPhase * dropPhase * h * 0.9;
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

    // ---- Render ship (behind-angle perspective baked into art) ----
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
