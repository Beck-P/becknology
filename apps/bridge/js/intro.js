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

  // ---- Ship pixel art (19 wide × 25 tall) ----
  // Top-down isometric: nose at top, engines at bottom
  // Palette: . = transparent
  var PALETTE = {
    d: '#181828', // dark hull
    m: '#282842', // mid hull
    l: '#38385a', // light hull
    h: '#4a4a70', // hull highlight
    p: '#7858b0', // purple accent
    P: '#9878d0', // bright purple
    c: '#3a5a80', // cockpit glass
    C: '#5880a8', // cockpit bright
    e: '#38a8b0', // engine cyan
    E: '#58d0d8', // engine bright
    w: '#585870', // wing edge
  };

  var SHIP = [
    '.........d.........',  //  0  nose tip
    '........dmd........',  //  1
    '.......dmlmd.......',  //  2
    '......dmlllmd......',  //  3
    '.....dmlcClmd.....',  //  4  cockpit
    '.....dmcCCCmd.....',  //  5
    '....dmlcClllmd....',  //  6
    '....dmllllllmd....',  //  7
    '...dmlPllllPlmd...',  //  8  accent stripes
    '...dmPlllllPmmd...',  //  9
    '..dmlPlllllPlmd...',  // 10
    '..dmPlllllllPmd...',  // 11  widest body
    '.dmlPlllllllPlmd..',  // 12
    '.dmPlllllllllPmd..',  // 13
    'wdmPlllllllllPmdw.',  // 14  wings
    'wdmPlllllllllPmdww',  // 15
    '.wdmPllllllPmdww..',  // 16
    '..wdmPlllllPdw....',  // 17
    '...wdmPllPmdw.....',  // 18
    '....wdmlllmd......',  // 19
    '....wdm.l.mdw.....',  // 20  engine gap
    '.....de...ed......',  // 21  engines
    '.....eE...Ee......',  // 22
    '......E...E.......',  // 23  thrust glow
    '...................',  // 24
  ];

  var SHIP_W = SHIP[0].length;
  var SHIP_H = SHIP.length;

  // ---- Animation state ----
  var anim = {
    t0: 0,           // start timestamp
    bobPhase: 0,     // gentle float
    logoOpacity: 0,  // 0→1 fade in
    promptOpacity: 0,
    zooming: false,
    zoomStart: 0,
    zoomDuration: 2000,
    active: false,
    thrustParticles: [],
  };

  // ---- ASCII logo (same as hub) ----
  var ASCII_LOGO =
    ' ██████╗ ███████╗ ██████╗██╗  ██╗███╗   ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗   ██╗\n' +
    ' ██╔══██╗██╔════╝██╔════╝██║ ██╔╝████╗  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝╚██╗ ██╔╝\n' +
    ' ██████╔╝█████╗  ██║     █████╔╝ ██╔██╗ ██║██║   ██║██║     ██║   ██║██║  ███╗╚████╔╝\n' +
    ' ██╔══██╗██╔══╝  ██║     ██╔═██╗ ██║╚██╗██║██║   ██║██║     ██║   ██║██║   ██║ ╚██╔╝\n' +
    ' ██████╔╝███████╗╚██████╗██║  ██╗██║ ╚████║╚██████╔╝███████╗╚██████╔╝╚██████╔╝  ██║\n' +
    ' ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝  ╚═╝';

  function show() {
    overlay = document.getElementById('intro-overlay');
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.classList.add('active');

    // Logo + prompt start invisible, fade in via draw()
    overlay.innerHTML =
      '<pre class="intro-ascii" id="intro-logo" style="opacity:0">' + ASCII_LOGO + '</pre>' +
      '<p class="intro-prompt" id="intro-prompt" style="opacity:0">CLICK TO BEGIN</p>';

    anim.t0 = performance.now();
    anim.active = true;
    anim.zooming = false;
    anim.logoOpacity = 0;
    anim.promptOpacity = 0;
    anim.bobPhase = 0;
    anim.thrustParticles = [];

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

  /** Called every frame from main.js when state === 'intro'. */
  function draw(ctx, w, h) {
    if (!anim.active) return;

    var now = performance.now();
    var elapsed = now - anim.t0;

    // ---- Ship rendering ----
    var baseScale = Math.min(w, h) / 220; // ship scales with viewport
    var scale = Math.max(2, Math.round(baseScale));

    // Ship position: centered, slightly above middle
    var shipX = w / 2;
    var shipY = h * 0.48;

    // Gentle bob
    anim.bobPhase += 0.02;
    var bob = Math.sin(anim.bobPhase) * 3;

    if (anim.zooming) {
      // ---- Zoom animation (3rd person → 1st person) ----
      var zoomElapsed = now - anim.zoomStart;
      var t = Math.min(1, zoomElapsed / anim.zoomDuration);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out quad

      // Ship scales up dramatically
      scale = scale * (1 + eased * 12);

      // Ship moves down (camera moving over/into it)
      shipY = h * 0.48 + eased * h * 0.6;

      // Fade out logo and prompt
      var logoEl = document.getElementById('intro-logo');
      var promptEl = document.getElementById('intro-prompt');
      if (logoEl) logoEl.style.opacity = Math.max(0, 1 - t * 3);
      if (promptEl) promptEl.style.opacity = Math.max(0, 1 - t * 4);

      // Flash at the end
      if (t > 0.85) {
        var flashAlpha = (t - 0.85) / 0.15;
        ctx.fillStyle = 'rgba(160, 120, 220, ' + (flashAlpha * 0.6) + ')';
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

      // ---- Prompt fade in after 2.5s ----
      if (elapsed > 2500 && anim.promptOpacity < 1) {
        anim.promptOpacity = Math.min(1, (elapsed - 2500) / 800);
        var promptEl = document.getElementById('intro-prompt');
        if (promptEl) promptEl.style.opacity = anim.promptOpacity;
      }
    }

    // ---- Draw ship ----
    drawShip(ctx, shipX, shipY + bob, scale);

    // ---- Draw thrust particles ----
    drawThrust(ctx, shipX, shipY + bob, scale, now);

    // ---- Ship ambient glow ----
    if (!anim.zooming) {
      var grd = ctx.createRadialGradient(shipX, shipY + bob, 0, shipX, shipY + bob, scale * SHIP_W * 0.8);
      grd.addColorStop(0, 'rgba(120, 88, 176, 0.04)');
      grd.addColorStop(1, 'rgba(120, 88, 176, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(shipX - scale * SHIP_W, shipY + bob - scale * SHIP_H, scale * SHIP_W * 2, scale * SHIP_H * 2);
    }
  }

  function drawShip(ctx, cx, cy, scale) {
    var startX = cx - (SHIP_W / 2) * scale;
    var startY = cy - (SHIP_H / 2) * scale;

    for (var row = 0; row < SHIP_H; row++) {
      var line = SHIP[row];
      for (var col = 0; col < line.length; col++) {
        var ch = line[col];
        if (ch === '.') continue;
        var color = PALETTE[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round(startX + col * scale),
          Math.round(startY + row * scale),
          Math.ceil(scale),
          Math.ceil(scale)
        );
      }
    }
  }

  function drawThrust(ctx, cx, cy, scale, now) {
    // Engine positions (relative to ship center, in pixel coords)
    var engineL = { x: -4, y: SHIP_H / 2 + 1 };
    var engineR = { x: 4, y: SHIP_H / 2 + 1 };

    var engines = [engineL, engineR];
    var startX = cx;
    var startY = cy;

    for (var e = 0; e < engines.length; e++) {
      var eng = engines[e];
      var ex = startX + eng.x * scale;
      var ey = startY + eng.y * scale;

      // Flickering thrust particles
      for (var p = 0; p < 3; p++) {
        var px = ex + (Math.random() - 0.5) * scale * 2;
        var py = ey + Math.random() * scale * 4;
        var size = scale * (0.3 + Math.random() * 0.5);
        var alpha = 0.3 + Math.random() * 0.5;

        ctx.fillStyle = Math.random() > 0.5
          ? 'rgba(88, 208, 216, ' + alpha + ')'
          : 'rgba(160, 230, 235, ' + alpha + ')';
        ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(size), Math.ceil(size));
      }

      // Engine glow
      var grd = ctx.createRadialGradient(ex, ey, 0, ex, ey, scale * 3);
      grd.addColorStop(0, 'rgba(88, 208, 216, 0.15)');
      grd.addColorStop(1, 'rgba(88, 208, 216, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(ex - scale * 3, ey - scale * 1, scale * 6, scale * 6);
    }
  }

  function onBegin() {
    if (anim.zooming || !anim.active) return;
    // Don't allow click before logo is visible
    if (anim.logoOpacity < 0.3) return;

    anim.zooming = true;
    anim.zoomStart = performance.now();

    // Accelerate starfield during zoom
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
