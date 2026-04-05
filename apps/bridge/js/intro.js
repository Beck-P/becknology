/**
 * BridgeIntro — Ship flying through space + BECKNOLOGY ASCII art.
 *
 * Ship viewed from ~45° behind: we see the rear hull face, cockpit dome
 * peeking over the top, engine nacelles on the sides, massive flame trails
 * going straight down. Inspired by retro pixel art space shooter aesthetic.
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
    // Top surface (brighter — lit from above)
    tMid:     '#585878',
    tLight:   '#707094',
    tBright:  '#8888ac',
    tHi:      '#a0a0c4',
    tPeak:    '#b8b8d8',
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
    // Engine exhaust
    eDark:    '#1840b0',
    eMid:     '#3068e0',
    eBright:  '#5898ff',
    eWhite:   '#90c0ff',
    eGlow:    '#b0d8ff',
    // Nacelle
    nDark:    '#1a1a30',
    nMid:     '#2a2a44',
    nLight:   '#3c3c5c',
    nHi:      '#505074',
    nBright:  '#646490',
    // Engine bell
    bDark:    '#8a4010',
    bMid:     '#b06020',
    bBright:  '#d08030',
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

  var ASCII_LOGO =
    ' ██████╗ ███████╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗   ██╗\n' +
    ' ██╔══██╗██╔════╝██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝\n' +
    ' ██████╔╝█████╗  ██║     █████╔╝ ██╔██╗ ██║██║   ██║██║     ██║   ██║██║  ███╗╚████╔╝\n' +
    ' ██╔══██╗██╔══╝  ██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║     ██║   ██║██║   ██║ ╚██╔╝\n' +
    ' ██████╔╝███████╗╚██████╗██║  ██╗██║ ╚████║╚██████╔╝███████╗╚██████╔╝╚██████╔╝  ██║\n' +
    ' ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝  ╚═╝';

  // ================================================================
  //  SHIP RENDERER — 45° rear view
  //
  //  Layout (wider than tall):
  //    [cockpit dome peeking over top, centered]
  //    [hull top surface — foreshortened, bright]
  //    [nacelle] [hull rear face — large, dark] [nacelle]
  //    [exhaust]                                [exhaust]
  //    [flames ↓]                               [flames ↓]
  //
  //  Ship is ~31px wide × ~20px tall (body). Flames extend below.
  //  Origin at center. Y-negative = top.
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

    // ===== COCKPIT DOME (peeking over the top of hull) =====
    // Small dome visible above the hull — we see it from behind
    rect(-3, -12, 7, 1, C.outline);
    rect(-2, -13, 5, 1, C.outline);
    rect(-1, -14, 3, 1, C.outline);

    // Dome fill (back of dome — darker blue since we see the rear)
    rect(-2, -13, 5, 1, C.gDark);
    rect(-1, -14, 3, 1, C.gDark);
    rect(-2, -12, 5, 1, C.gMid);

    // Dome glare (reflected light on top curve)
    px(0, -14, C.gMid);
    px(0, -13, C.gBright);
    px(1, -13, C.gHi);
    px(-1, -13, C.gBright);

    // ===== HULL TOP SURFACE (foreshortened — only 3-4 rows visible) =====
    // This is the top of the ship peeking out — lit by starlight, bright
    rect(-6, -11, 13, 1, C.outline);
    rect(-7, -10, 15, 1, C.tPeak);    // brightest edge (catches light)
    rect(-8, -9, 17, 1, C.tHi);
    rect(-8, -8, 17, 1, C.tBright);
    rect(-9, -7, 19, 1, C.tLight);    // transitioning to rear face

    // Top surface highlight details
    px(0, -10, C.tPeak);
    mpx(2, -10, C.tHi);
    mpx(4, -9, C.tBright);
    // Panel line on top surface
    for (var x = -7; x <= 7; x++) px(x, -8, C.tMid);
    for (var x = -6; x <= 6; x++) px(x, -9, C.tPeak);

    // ===== HULL REAR FACE (main visible area — darker, large) =====
    // This is what faces the camera — the back of the ship
    rect(-9, -6, 19, 1, C.outline);    // top edge of rear face
    rect(-9, -5, 19, 10, C.hLight);    // base fill
    rect(-9, 5, 19, 1, C.outline);     // bottom edge

    // Side outlines
    for (var y = -6; y <= 5; y++) { px(-9, y, C.outline); px(9, y, C.outline); }

    // Rear face shading — darker at edges, lighter center
    for (var y = -5; y <= 4; y++) {
      px(-8, y, C.hDark);
      px(8, y, C.hDark);
      px(-7, y, C.hMid);
      px(7, y, C.hMid);
    }
    // Center vertical highlight
    for (var y = -5; y <= 4; y++) px(0, y, C.hHi);

    // Rear face horizontal panel lines
    for (var x = -8; x <= 8; x++) px(x, -2, C.hDark);
    for (var x = -7; x <= 7; x++) px(x, -3, C.hBright);
    for (var x = -8; x <= 8; x++) px(x, 2, C.hDark);
    for (var x = -7; x <= 7; x++) px(x, 1, C.hBright);

    // ===== RED ACCENT PANELS on rear face =====
    // Left panel
    rect(-7, -5, 3, 3, C.rDark);
    rect(-6, -5, 2, 2, C.rMid);
    px(-6, -5, C.rBright);
    // Lower left
    rect(-7, 0, 3, 3, C.rDark);
    rect(-6, 0, 2, 2, C.rMid);
    px(-6, 0, C.rBright);

    // Right panel
    rect(5, -5, 3, 3, C.rDark);
    rect(5, -5, 2, 2, C.rMid);
    px(6, -5, C.rBright);
    // Lower right
    rect(5, 0, 3, 3, C.rDark);
    rect(5, 0, 2, 2, C.rMid);
    px(6, 0, C.rBright);

    // Accent highlights
    px(-5, -4, C.rHi);
    px(6, -4, C.rHi);
    px(-5, 1, C.rHi);
    px(6, 1, C.rHi);

    // ===== HULL DETAIL PIXELS =====
    // Vents / panel details on rear face
    mpx(2, -5, C.hDark);
    mpx(2, -4, C.hMid);
    mpx(3, 3, C.hDark);
    mpx(3, 4, C.hMid);
    // Status lights
    mpx(1, -1, C.hPeak);
    px(0, 0, C.hWhite);

    // ===== WINGS (stubby, extending from sides of rear face) =====
    // From this angle, wings are foreshortened — just thick stubs
    // Left wing
    rect(-14, -7, 5, 1, C.outline);
    rect(-14, -6, 5, 10, C.nMid);
    rect(-14, 4, 5, 1, C.outline);
    // Wing shading
    for (var y = -6; y <= 3; y++) {
      px(-14, y, C.outline);
      px(-13, y, C.nDark);
      px(-10, y, C.nBright);
    }
    // Wing panel line
    for (var x = -13; x <= -10; x++) px(x, -1, C.nDark);
    for (var x = -13; x <= -10; x++) px(x, -2, C.nHi);

    // Right wing (mirrored)
    rect(10, -7, 5, 1, C.outline);
    rect(10, -6, 5, 10, C.nMid);
    rect(10, 4, 5, 1, C.outline);
    for (var y = -6; y <= 3; y++) {
      px(14, y, C.outline);
      px(13, y, C.nDark);
      px(10, y, C.nBright);
    }
    for (var x = 10; x <= 13; x++) px(x, -1, C.nDark);
    for (var x = 10; x <= 13; x++) px(x, -2, C.nHi);

    // Wing-tip red accents
    rect(-14, -5, 1, 3, C.rDark);
    rect(-14, -4, 1, 1, C.rMid);
    rect(14, -5, 1, 3, C.rDark);
    rect(14, -4, 1, 1, C.rMid);

    // ===== ENGINE NACELLES (flanking hull, below wings) =====
    // Left nacelle
    rect(-13, 4, 4, 1, C.outline);
    rect(-13, 5, 4, 5, C.nLight);
    rect(-13, 10, 4, 1, C.outline);
    // Nacelle shading
    for (var y = 5; y <= 9; y++) {
      px(-13, y, C.outline);
      px(-12, y, C.nDark);
      px(-10, y, C.nBright);
    }
    // Nacelle red stripe
    px(-13, 6, C.rMid); px(-13, 7, C.rMid); px(-13, 8, C.rMid);

    // Right nacelle
    rect(10, 4, 4, 1, C.outline);
    rect(10, 5, 4, 5, C.nLight);
    rect(10, 10, 4, 1, C.outline);
    for (var y = 5; y <= 9; y++) {
      px(13, y, C.outline);
      px(12, y, C.nDark);
      px(10, y, C.nBright);
    }
    px(13, 6, C.rMid); px(13, 7, C.rMid); px(13, 8, C.rMid);

    // ===== ENGINE BELLS / EXHAUST PORTS =====
    // Left engine bell (warm glow ring)
    rect(-13, 10, 4, 1, C.bDark);
    rect(-12, 10, 2, 1, C.bMid);
    rect(-12, 11, 2, 1, C.bBright);
    px(-11, 10, C.bBright);
    // Exhaust port glow
    rect(-12, 12, 2, 1, C.eBright);
    px(-11, 12, C.eWhite);

    // Right engine bell
    rect(10, 10, 4, 1, C.bDark);
    rect(11, 10, 2, 1, C.bMid);
    rect(11, 11, 2, 1, C.bBright);
    px(11, 10, C.bBright);
    rect(11, 12, 2, 1, C.eBright);
    px(11, 12, C.eWhite);

    // ===== CENTRAL ENGINE (between nacelles, in hull) =====
    // Visible rear exhaust in center hull
    rect(-3, 5, 7, 1, C.outline);
    rect(-2, 5, 5, 1, C.hDark);
    rect(-2, 6, 5, 1, C.bDark);
    rect(-1, 6, 3, 1, C.bMid);
    rect(-1, 7, 3, 1, C.eBright);
    px(0, 7, C.eWhite);
  }

  // ---- ENGINE FLAMES (animated — going straight down) ----
  function drawThrust(ctx, cx, cy, s, time) {
    function px(x, y, c) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil(s), Math.ceil(s));
    }

    var flicker = Math.sin(time * 0.015) * 0.5 + 0.5;
    // Three engine positions: left nacelle (-11), center (0), right nacelle (11)
    var engines = [
      { x: -11, size: 1.0 },
      { x: 0,   size: 0.7 },
      { x: 11,  size: 1.0 },
    ];

    for (var e = 0; e < engines.length; e++) {
      var ex = engines[e].x;
      var sz = engines[e].size;
      var flameLen = Math.floor((10 + flicker * 6) * sz);
      var flameW = Math.max(1, Math.floor(2 * sz));

      for (var f = 0; f < flameLen; f++) {
        var fy = 13 + f;
        var t = f / flameLen;

        // Core (blue → white)
        var coreAlpha = (1 - t) * (0.7 + Math.random() * 0.3);
        if (f < 2) {
          ctx.fillStyle = 'rgba(144, 192, 255, ' + coreAlpha + ')';
        } else if (f < 4) {
          ctx.fillStyle = 'rgba(88, 152, 255, ' + coreAlpha + ')';
        } else {
          ctx.fillStyle = 'rgba(48, 104, 224, ' + (coreAlpha * 0.7) + ')';
        }
        ctx.fillRect(
          Math.round(cx + ex * s), Math.round(cy + fy * s),
          Math.ceil(s), Math.ceil(s)
        );

        // Orange/yellow outer flame (wider, flickering)
        var spread = Math.floor(f * 0.5 * sz) + 1;
        for (var sx = -spread; sx <= spread; sx++) {
          if (sx === 0) continue;
          var sAlpha = (1 - t) * 0.5 * (0.4 + Math.random() * 0.6);
          if (f < 3) {
            ctx.fillStyle = 'rgba(240, 160, 40, ' + sAlpha + ')';
          } else if (f < 6) {
            ctx.fillStyle = 'rgba(220, 120, 30, ' + sAlpha + ')';
          } else {
            ctx.fillStyle = 'rgba(200, 90, 20, ' + (sAlpha * 0.6) + ')';
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
        cx + ex * s, cy + 13 * s, 0,
        cx + ex * s, cy + 13 * s, s * 7 * sz
      );
      grad.addColorStop(0, 'rgba(240, 160, 60, 0.15)');
      grad.addColorStop(0.4, 'rgba(200, 100, 30, 0.06)');
      grad.addColorStop(1, 'rgba(200, 100, 30, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(
        cx + (ex - 8) * s, cy + 10 * s,
        s * 16, s * 22
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

    // Ship scale — responsive to viewport
    var baseScale = Math.min(w, h) / 180;
    var scale = Math.max(2, Math.round(baseScale));

    // Ship position: centered, upper-middle area (flames trail down)
    var shipX = w / 2;
    var shipY = h * 0.38;

    // Gentle bob
    anim.bobPhase += 0.015;
    var bob = Math.sin(anim.bobPhase) * 4;

    if (anim.zooming) {
      var zoomElapsed = now - anim.zoomStart;
      var t = Math.min(1, zoomElapsed / anim.zoomDuration);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Ship scales up as camera closes in from behind
      scale = scale * (1 + eased * 12);
      // Ship lifts up slightly then drops past as we fly into cockpit
      var lift = Math.min(1, t * 3);
      var drop = Math.max(0, (t - 0.35) / 0.65);
      shipY = h * 0.38 - lift * h * 0.06 + drop * drop * h * 0.8;
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

    // Render
    drawShip(ctx, shipX, shipY + bob, scale);
    drawThrust(ctx, shipX, shipY + bob, scale, elapsed);

    // Ambient glow
    if (!anim.zooming) {
      var grd = ctx.createRadialGradient(shipX, shipY + bob, 0, shipX, shipY + bob, scale * 22);
      grd.addColorStop(0, 'rgba(100, 80, 160, 0.05)');
      grd.addColorStop(1, 'rgba(100, 80, 160, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(shipX - scale * 22, shipY + bob - scale * 22, scale * 44, scale * 44);
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
