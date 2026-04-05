/**
 * BridgeIntro — Ship flying through space + BECKNOLOGY ASCII art.
 *
 * Ship body from PNG sprite (top ~48% cropped, flames removed).
 * Animated procedural engine flames drawn below the sprite.
 */
var BridgeIntro = (function () {
  var overlay;
  var bound = false;
  var shipCanvas = null;

  // Sprite crop: only draw the ship body (top portion), not the baked-in flames
  // Ship PNG is 1536 × 1024. Ship body ends ~row 490, flames below that.
  var CROP_RATIO = 0.48; // draw top 48% of sprite = ship body + engine bells

  // Engine exhaust positions as % of sprite width (where flames originate)
  // Left engine center: ~32% from left, Right: ~68% from left
  var ENGINE_LEFT = 0.32;
  var ENGINE_RIGHT = 0.68;

  // ---- Load and process the ship sprite ----
  function loadShip() {
    var img = new Image();
    img.onload = function () {
      shipCanvas = document.createElement('canvas');
      shipCanvas.width = img.width;
      shipCanvas.height = img.height;
      var sctx = shipCanvas.getContext('2d');
      sctx.drawImage(img, 0, 0);

      // Remove white/near-white background
      var data = sctx.getImageData(0, 0, shipCanvas.width, shipCanvas.height);
      var px = data.data;
      for (var i = 0; i < px.length; i += 4) {
        var r = px[i], g = px[i + 1], b = px[i + 2];
        if (r > 245 && g > 245 && b > 245) {
          px[i + 3] = 0;
        } else if (r > 210 && g > 210 && b > 210) {
          var avg = (r + g + b) / 3;
          var fade = Math.max(0, Math.min(255, Math.round((255 - avg) * (255 / 45))));
          px[i + 3] = Math.min(px[i + 3], fade);
        }
      }
      sctx.putImageData(data, 0, 0);
    };
    img.src = '/bridge/assets/ship.png';
  }

  loadShip();

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
  //  ANIMATED ENGINE FLAMES
  //  Blue-white core → orange → yellow, angling outward like reference
  // ================================================================

  function drawFlames(ctx, shipLeft, shipBottom, shipW, elapsed) {
    var flicker = Math.sin(elapsed * 0.012) * 0.5 + 0.5;
    var flicker2 = Math.cos(elapsed * 0.017) * 0.5 + 0.5;

    var engines = [
      { xPct: ENGINE_LEFT,  fl: flicker,  drift: -0.4 },  // left flame drifts left
      { xPct: ENGINE_RIGHT, fl: flicker2, drift: 0.4 },   // right flame drifts right
    ];

    for (var e = 0; e < engines.length; e++) {
      var eng = engines[e];
      var ex = shipLeft + shipW * eng.xPct;
      var ey = shipBottom;
      var flameLen = 18 + Math.floor(eng.fl * 12);
      var pxSize = Math.max(2, shipW / 120);  // flame "pixel" size scales with ship

      for (var f = 0; f < flameLen; f++) {
        var t = f / flameLen;
        // Flame drifts outward (matching reference angle)
        var xOff = f * eng.drift * pxSize;
        var fy = ey + f * pxSize;

        // Flame widens then tapers
        var widthMult = f < 3 ? (f / 3) : Math.max(0, 1 - (f - 3) / (flameLen - 3));
        var spread = Math.max(0, Math.floor(widthMult * 5));

        // Core (blue → white, tight)
        if (t < 0.5) {
          var coreAlpha = (1 - t * 1.5) * (0.7 + Math.random() * 0.3);
          if (f < 2) ctx.fillStyle = 'rgba(180, 210, 255, ' + coreAlpha + ')';
          else if (f < 5) ctx.fillStyle = 'rgba(88, 152, 255, ' + coreAlpha + ')';
          else ctx.fillStyle = 'rgba(48, 104, 224, ' + (coreAlpha * 0.6) + ')';
          ctx.fillRect(
            Math.round(ex + xOff - pxSize / 2), Math.round(fy),
            Math.ceil(pxSize), Math.ceil(pxSize)
          );
        }

        // Orange/yellow outer flame
        for (var sx = -spread; sx <= spread; sx++) {
          var dist = Math.abs(sx);
          var sAlpha = (1 - t) * (0.5 + Math.random() * 0.5) * Math.max(0.15, 1 - dist * 0.22);

          if (f < 3) ctx.fillStyle = 'rgba(255, 220, 80, ' + sAlpha + ')';
          else if (f < 6) ctx.fillStyle = 'rgba(250, 170, 40, ' + sAlpha + ')';
          else if (f < 10) ctx.fillStyle = 'rgba(230, 120, 30, ' + (sAlpha * 0.8) + ')';
          else if (f < 16) ctx.fillStyle = 'rgba(200, 80, 25, ' + (sAlpha * 0.6) + ')';
          else ctx.fillStyle = 'rgba(60, 80, 180, ' + (sAlpha * 0.4) + ')';

          ctx.fillRect(
            Math.round(ex + xOff + sx * pxSize - pxSize / 2), Math.round(fy),
            Math.ceil(pxSize), Math.ceil(pxSize)
          );
        }

        // Random bright sparks
        if (Math.random() < 0.12 && f > 2 && f < flameLen - 3) {
          var sparkX = ex + xOff + (Math.random() - 0.5) * spread * pxSize * 2;
          var sparkAlpha = (1 - t) * 0.9;
          ctx.fillStyle = 'rgba(255, 230, 120, ' + sparkAlpha + ')';
          ctx.fillRect(
            Math.round(sparkX), Math.round(fy),
            Math.ceil(pxSize * 0.8), Math.ceil(pxSize * 0.8)
          );
        }
      }

      // Engine glow halo
      var glowR = pxSize * 14;
      var grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowR);
      grad.addColorStop(0, 'rgba(255, 180, 60, 0.14)');
      grad.addColorStop(0.3, 'rgba(240, 120, 40, 0.06)');
      grad.addColorStop(1, 'rgba(200, 80, 20, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(ex - glowR, ey - glowR * 0.3, glowR * 2, glowR * 2);
    }
  }

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
    if (!anim.active || !shipCanvas) return;

    var now = performance.now();
    var elapsed = now - anim.t0;

    // Ship sizing — cropped sprite (body only, no baked flames)
    var shipW = Math.min(w, h) * 0.35;
    var cropH = shipCanvas.height * CROP_RATIO;
    var shipH = shipW * (cropH / shipCanvas.width);

    // Ship position
    var shipX = w / 2;
    var shipY = h * 0.35;

    // Bob
    anim.bobPhase += 0.015;
    var bob = Math.sin(anim.bobPhase) * 5;

    if (anim.zooming) {
      var zoomElapsed = now - anim.zoomStart;
      var t = Math.min(1, zoomElapsed / anim.zoomDuration);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      var zoomScale = 1 + eased * 8;
      shipW *= zoomScale;
      shipH *= zoomScale;

      var lift = Math.min(1, t * 3);
      var drop = Math.max(0, (t - 0.35) / 0.65);
      shipY = h * 0.35 - lift * h * 0.05 + drop * drop * h * 0.6;
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

    // Compute draw position (centered on cockpit area ~35% from top of cropped sprite)
    var drawX = shipX - shipW / 2;
    var drawY = shipY + bob - shipH * 0.35;

    // ---- Draw animated flames FIRST (behind the ship) ----
    drawFlames(ctx, drawX, drawY + shipH, shipW, elapsed);

    // ---- Draw ship body (cropped — top portion only) ----
    ctx.drawImage(
      shipCanvas,
      0, 0, shipCanvas.width, cropH,    // source: top portion only
      drawX, drawY, shipW, shipH        // destination
    );

    // Subtle ambient glow
    if (!anim.zooming) {
      var grd = ctx.createRadialGradient(shipX, shipY + bob, 0, shipX, shipY + bob, shipW * 0.7);
      grd.addColorStop(0, 'rgba(100, 80, 160, 0.04)');
      grd.addColorStop(1, 'rgba(100, 80, 160, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(shipX - shipW, shipY + bob - shipH, shipW * 2, shipH * 2);
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
