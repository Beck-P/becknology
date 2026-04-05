/**
 * BridgeIntro — Ship flying through space + BECKNOLOGY ASCII art.
 *
 * Ship viewed from behind — tall portrait shape matching retro pixel art style:
 *   - Large blue cockpit dome at top
 *   - Hull body tapering downward with red accent panels
 *   - Two engine pods at bottom with massive flame trails
 */
var BridgeIntro = (function () {
  var overlay;
  var bound = false;

  // ---- Ship colors ----
  var C = {
    outline:  '#0a0a16',
    // Hull (rear face — darker)
    hDark:    '#1e1e36',
    hMid:     '#30304c',
    hLight:   '#4a4a6a',
    hBright:  '#646488',
    hHi:      '#8080a2',
    hWhite:   '#9c9cba',
    hPeak:    '#b8b8d4',
    // Hull top edge (brighter — catches light)
    tBright:  '#8888ac',
    tHi:      '#a4a4c8',
    tPeak:    '#c0c0dc',
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
    // Engine bell
    bDark:    '#8a4010',
    bMid:     '#b86820',
    bBright:  '#d89030',
    bHi:      '#e8a840',
  };

  // ---- Animation ----
  var anim = {
    t0: 0, bobPhase: 0, logoOpacity: 0, promptOpacity: 0,
    zooming: false, zoomStart: 0, zoomDuration: 2000, active: false,
  };

  var ASCII_LOGO =
    ' ██████╗ ███████╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗   ██╗\n' +
    ' ██╔══██╗██╔════╝██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝\n' +
    ' ██████╔╝█████╗  ██║     █████╔╝ ██╔██╗ ██║██║   ██║██║     ██║   ██║██║  ███╗╚████╔╝\n' +
    ' ██╔══██╗██╔══╝  ██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║     ██║   ██║██║   ██║ ╚██╔╝\n' +
    ' ██████╔╝███████╗╚██████╗██║  ██╗██║ ╚████║╚██████╔╝███████╗╚██████╔╝╚██████╔╝  ██║\n' +
    ' ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝  ╚═╝';

  // ================================================================
  //  SHIP — tall portrait shape, ~19px wide × ~30px tall
  //
  //  From top to bottom:
  //    1. Cockpit dome (blue, prominent, ~7px wide)
  //    2. Hull shoulder (widest, ~17px)
  //    3. Hull body with red panels, tapering down (~15px → ~13px)
  //    4. Hull narrows to engine mount (~11px)
  //    5. Two engine pods (~5px wide each, separated by ~3px gap)
  //    6. Exhaust ports + massive animated flames
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

    // ===== 1. COCKPIT DOME =====
    // Prominent blue dome at top — the defining feature
    //   row -15: tip (1px)
    //   row -14: 3px
    //   row -13: 5px
    //   row -12: 7px wide
    //   row -11: 7px (base, meets hull)

    // Dome outline
    px(0, -15, C.outline);
    rect(-1, -14, 3, 1, C.outline);
    rect(-2, -13, 5, 1, C.outline);
    rect(-3, -12, 7, 1, C.outline);
    rect(-3, -11, 7, 1, C.outline);

    // Dome glass fill
    px(0, -15, C.gMid);
    rect(-1, -14, 3, 1, C.gDark);
    rect(-2, -13, 5, 1, C.gMid);
    rect(-3, -12, 7, 1, C.gBright);
    rect(-3, -11, 7, 1, C.gMid);

    // Specular highlight (bright reflection on dome)
    px(0, -14, C.gBright);
    px(0, -13, C.gHi);
    px(1, -13, C.gGlare);
    px(0, -12, C.gHi);
    px(1, -12, C.gGlare);
    px(-1, -12, C.gHi);

    // Dome outline edges
    px(-3, -12, C.outline); px(3, -12, C.outline);
    px(-3, -11, C.outline); px(3, -11, C.outline);
    px(-2, -13, C.outline); px(2, -13, C.outline);

    // ===== 2. HULL TOP EDGE (bright — catches light from above) =====
    rect(-5, -10, 11, 1, C.tPeak);
    rect(-6, -9, 13, 1, C.tHi);
    rect(-7, -8, 15, 1, C.tBright);
    // Outline top edge
    rect(-5, -10, 11, 1, C.outline); // top line
    rect(-5, -10, 1, 1, C.outline);  px(5, -10, C.outline);
    // Re-fill interior
    rect(-4, -10, 9, 1, C.tPeak);
    rect(-5, -9, 11, 1, C.tHi);
    px(-6, -9, C.outline); px(6, -9, C.outline);
    rect(-6, -8, 13, 1, C.tBright);
    px(-7, -8, C.outline); px(7, -8, C.outline);

    // ===== 3. HULL BODY (rear face — main visible area) =====
    // Tapers from 17px wide at top to 13px at bottom
    var hullRows = [
      { y: -7, hw: 8 },   // 17px wide
      { y: -6, hw: 8 },
      { y: -5, hw: 8 },
      { y: -4, hw: 7 },   // 15px
      { y: -3, hw: 7 },
      { y: -2, hw: 7 },
      { y: -1, hw: 7 },
      { y: 0,  hw: 7 },
      { y: 1,  hw: 6 },   // 13px — narrowing
      { y: 2,  hw: 6 },
      { y: 3,  hw: 6 },
      { y: 4,  hw: 6 },
      { y: 5,  hw: 5 },   // 11px — engine mount
      { y: 6,  hw: 5 },
    ];

    // Base fill
    for (var i = 0; i < hullRows.length; i++) {
      var r = hullRows[i];
      rect(-r.hw, r.y, r.hw * 2 + 1, 1, C.hLight);
    }

    // Side outlines
    for (var i = 0; i < hullRows.length; i++) {
      var r = hullRows[i];
      px(-r.hw, r.y, C.outline);
      px(r.hw, r.y, C.outline);
    }

    // Edge shading (dark sides = 3D depth)
    for (var i = 0; i < hullRows.length; i++) {
      var r = hullRows[i];
      if (r.hw > 1) { px(-r.hw + 1, r.y, C.hDark); px(r.hw - 1, r.y, C.hDark); }
      if (r.hw > 2) { px(-r.hw + 2, r.y, C.hMid);  px(r.hw - 2, r.y, C.hMid); }
    }

    // Center highlight stripe
    for (var i = 0; i < hullRows.length; i++) {
      px(0, hullRows[i].y, C.hHi);
    }

    // Bottom outline
    for (var x = -5; x <= 5; x++) px(x, 7, C.outline);

    // ===== 4. HULL PANEL LINES =====
    // Horizontal dividers across the hull
    var panelYs = [-4, 0, 4];
    for (var p = 0; p < panelYs.length; p++) {
      var py = panelYs[p];
      for (var i = 0; i < hullRows.length; i++) {
        if (hullRows[i].y === py) {
          var hw = hullRows[i].hw;
          for (var x = -hw + 1; x <= hw - 1; x++) px(x, py, C.hDark);
          // Bright edge above panel line
          for (var x = -hw + 2; x <= hw - 2; x++) px(x, py - 1, C.hBright);
          break;
        }
      }
    }

    // ===== 5. RED ACCENT PANELS =====
    // Upper pair (rows -6 to -4)
    rect(-7, -6, 3, 3, C.rDark);
    rect(-6, -6, 2, 2, C.rMid);
    px(-6, -6, C.rBright);
    px(-5, -5, C.rHi);

    rect(5, -6, 3, 3, C.rDark);
    rect(5, -6, 2, 2, C.rMid);
    px(6, -6, C.rBright);
    px(5, -5, C.rHi);

    // Lower pair (rows -1 to 1)
    rect(-6, -1, 3, 3, C.rDark);
    rect(-5, -1, 2, 2, C.rMid);
    px(-5, -1, C.rBright);
    px(-4, 0, C.rHi);

    rect(4, -1, 3, 3, C.rDark);
    rect(4, -1, 2, 2, C.rMid);
    px(5, -1, C.rBright);
    px(4, 0, C.rHi);

    // ===== 6. HULL DETAILS =====
    // Center panel detail (engine indicator lights)
    mpx(1, -2, C.hPeak);
    mpx(1, -3, C.hDark);
    px(0, -6, C.hWhite);
    px(0, -5, C.hPeak);

    // Lower hull vents
    mpx(2, 3, C.hDark);
    mpx(2, 5, C.hDark);
    mpx(3, 5, C.hMid);

    // ===== 7. ENGINE PODS =====
    // Two pods hanging below the hull, separated by a gap
    // Left pod (x: -5 to -2, y: 7 to 14)
    rect(-5, 7, 4, 1, C.outline);
    rect(-5, 8, 4, 6, C.hLight);
    rect(-5, 14, 4, 1, C.outline);
    // Pod side outlines
    for (var y = 8; y <= 13; y++) { px(-5, y, C.outline); px(-2, y, C.outline); }
    // Pod shading
    for (var y = 8; y <= 13; y++) {
      px(-4, y, C.hDark);
      px(-3, y, C.hBright);
    }
    px(-3, 9, C.hHi);
    px(-3, 10, C.hHi);
    px(-3, 11, C.hHi);
    // Pod red stripe
    px(-5, 9, C.rMid);  px(-5, 10, C.rMid); px(-5, 11, C.rMid);
    px(-5, 10, C.rBright);

    // Right pod (mirrored)
    rect(2, 7, 4, 1, C.outline);
    rect(2, 8, 4, 6, C.hLight);
    rect(2, 14, 4, 1, C.outline);
    for (var y = 8; y <= 13; y++) { px(2, y, C.outline); px(5, y, C.outline); }
    for (var y = 8; y <= 13; y++) {
      px(4, y, C.hDark);
      px(3, y, C.hBright);
    }
    px(3, 9, C.hHi);
    px(3, 10, C.hHi);
    px(3, 11, C.hHi);
    px(5, 9, C.rMid); px(5, 10, C.rMid); px(5, 11, C.rMid);
    px(5, 10, C.rBright);

    // ===== 8. ENGINE BELLS =====
    // Warm-colored bell at bottom of each pod
    // Left bell
    rect(-5, 14, 4, 1, C.bDark);
    rect(-4, 14, 2, 1, C.bMid);
    rect(-5, 15, 4, 1, C.bMid);
    rect(-4, 15, 2, 1, C.bBright);
    rect(-5, 16, 4, 1, C.bBright);
    rect(-4, 16, 2, 1, C.bHi);
    // Exhaust port
    rect(-4, 17, 2, 1, C.eMid);
    px(-3, 17, C.eBright);
    px(-4, 17, C.eMid);

    // Right bell
    rect(2, 14, 4, 1, C.bDark);
    rect(3, 14, 2, 1, C.bMid);
    rect(2, 15, 4, 1, C.bMid);
    rect(3, 15, 2, 1, C.bBright);
    rect(2, 16, 4, 1, C.bBright);
    rect(3, 16, 2, 1, C.bHi);
    rect(3, 17, 2, 1, C.eMid);
    px(3, 17, C.eBright);
    px(4, 17, C.eMid);

    // ===== 9. STRUT connecting hull to pods =====
    // Small connector between hull bottom and pod tops
    rect(-1, 7, 3, 2, C.hMid);
    px(0, 7, C.hBright);
    px(0, 8, C.hLight);
  }

  // ---- MASSIVE ENGINE FLAMES ----
  function drawThrust(ctx, cx, cy, s, time) {
    var flicker = Math.sin(time * 0.012) * 0.5 + 0.5;
    var flicker2 = Math.cos(time * 0.018) * 0.5 + 0.5;

    // Two engines: left at x=-3.5, right at x=3.5
    var engines = [
      { x: -3, w: 2 },
      { x: 3,  w: 2 },
    ];

    for (var e = 0; e < engines.length; e++) {
      var ex = engines[e].x;
      var ew = engines[e].w;
      var fl = e === 0 ? flicker : flicker2;

      // Flame length — MASSIVE, 2-3x ship height
      var flameLen = Math.floor(20 + fl * 10);

      for (var f = 0; f < flameLen; f++) {
        var fy = 18 + f;
        var t = f / flameLen;

        // Flame widens then tapers
        var widthMult = f < 4 ? (f / 4) : (1 - (f - 4) / (flameLen - 4));
        var spread = Math.max(0, Math.floor(widthMult * 4));

        // Core (blue-white, tight)
        if (f < flameLen * 0.4) {
          var coreAlpha = (1 - t) * (0.7 + Math.random() * 0.3);
          if (f < 2) {
            ctx.fillStyle = 'rgba(160, 200, 255, ' + coreAlpha + ')';
          } else if (f < 5) {
            ctx.fillStyle = 'rgba(88, 152, 255, ' + coreAlpha + ')';
          } else {
            ctx.fillStyle = 'rgba(48, 104, 224, ' + (coreAlpha * 0.6) + ')';
          }
          for (var dx = 0; dx < ew; dx++) {
            ctx.fillRect(
              Math.round(cx + (ex + dx) * s), Math.round(cy + fy * s),
              Math.ceil(s), Math.ceil(s)
            );
          }
        }

        // Orange/yellow outer flame
        for (var sx = -spread; sx <= spread + ew - 1; sx++) {
          var distFromCore = sx < 0 ? -sx : (sx >= ew ? sx - ew + 1 : 0);
          var sAlpha = (1 - t) * (0.5 + Math.random() * 0.5);
          sAlpha *= Math.max(0.2, 1 - distFromCore * 0.3);

          if (f < 4) {
            ctx.fillStyle = 'rgba(255, 200, 60, ' + sAlpha + ')';
          } else if (f < 8) {
            ctx.fillStyle = 'rgba(240, 150, 40, ' + sAlpha + ')';
          } else if (f < 14) {
            ctx.fillStyle = 'rgba(220, 110, 30, ' + (sAlpha * 0.7) + ')';
          } else {
            ctx.fillStyle = 'rgba(180, 70, 20, ' + (sAlpha * 0.4) + ')';
          }
          ctx.fillRect(
            Math.round(cx + (ex + sx) * s),
            Math.round(cy + fy * s),
            Math.ceil(s), Math.ceil(s)
          );
        }

        // Bright sparks/embers
        if (Math.random() < 0.15 && f > 3) {
          var sparkX = ex + Math.floor(Math.random() * (spread * 2 + ew)) - spread;
          var sparkAlpha = (1 - t) * 0.8;
          ctx.fillStyle = 'rgba(255, 220, 100, ' + sparkAlpha + ')';
          ctx.fillRect(
            Math.round(cx + sparkX * s), Math.round(cy + fy * s),
            Math.ceil(s), Math.ceil(s)
          );
        }
      }

      // Engine glow halo (warm orange)
      var grad = ctx.createRadialGradient(
        cx + (ex + 0.5) * s, cy + 18 * s, 0,
        cx + (ex + 0.5) * s, cy + 18 * s, s * 10
      );
      grad.addColorStop(0, 'rgba(255, 180, 60, 0.18)');
      grad.addColorStop(0.3, 'rgba(240, 130, 40, 0.08)');
      grad.addColorStop(1, 'rgba(200, 80, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(
        cx + (ex - 10) * s, cy + 14 * s,
        s * 22, s * 30
      );
    }
  }

  // ================================================================
  //  ANIMATION + EVENTS
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

    var baseScale = Math.min(w, h) / 160;
    var scale = Math.max(2, Math.round(baseScale));

    // Ship in upper-center (flames trail down below)
    var shipX = w / 2;
    var shipY = h * 0.32;

    anim.bobPhase += 0.015;
    var bob = Math.sin(anim.bobPhase) * 4;

    if (anim.zooming) {
      var zoomElapsed = now - anim.zoomStart;
      var t = Math.min(1, zoomElapsed / anim.zoomDuration);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      scale = scale * (1 + eased * 12);
      var lift = Math.min(1, t * 3);
      var drop = Math.max(0, (t - 0.35) / 0.65);
      shipY = h * 0.32 - lift * h * 0.05 + drop * drop * h * 0.7;
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

    drawShip(ctx, shipX, shipY + bob, scale);
    drawThrust(ctx, shipX, shipY + bob, scale, elapsed);

    if (!anim.zooming) {
      var grd = ctx.createRadialGradient(shipX, shipY + bob, 0, shipX, shipY + bob, scale * 20);
      grd.addColorStop(0, 'rgba(100, 80, 160, 0.04)');
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
