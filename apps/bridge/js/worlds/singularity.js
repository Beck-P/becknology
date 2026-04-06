/**
 * The Singularity World Module — Cosmic anomaly at the edge of known space.
 *
 * A tiny floating platform over a swirling void. Minimal, abstract, eerie.
 * Custom animated void background, inward-pulling particles, color distortion
 * near the singularity core.
 *
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Void Background ----
  // Swirling dark purple/black patterns behind the tile layer.
  // Called by the engine before tiles if world has a customBackground function.

  var voidStars = [];
  var voidInited = false;

  function initVoid() {
    if (voidInited) return;
    voidInited = true;
    voidStars = [];
    for (var i = 0; i < 80; i++) {
      voidStars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.0003 + 0.0001,
        brightness: Math.random() * 0.4 + 0.1
      });
    }
  }

  function drawVoidBackground(ctx, w, h, time) {
    initVoid();

    // Deep black base
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);

    // Swirling void nebula — layered radial gradients
    var cx = w * 0.75;  // Singularity is on the right side
    var cy = h * 0.5;

    // Outer void swirl
    var swirl1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.6);
    swirl1.addColorStop(0, 'rgba(80, 40, 120, 0.15)');
    swirl1.addColorStop(0.3, 'rgba(40, 20, 80, 0.08)');
    swirl1.addColorStop(1, 'transparent');
    ctx.fillStyle = swirl1;
    ctx.fillRect(0, 0, w, h);

    // Inner bright core
    var pulse = 0.8 + Math.sin(time / 2000) * 0.2;
    var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.15);
    core.addColorStop(0, 'rgba(200, 160, 255, ' + (0.12 * pulse).toFixed(3) + ')');
    core.addColorStop(0.5, 'rgba(120, 80, 200, ' + (0.06 * pulse).toFixed(3) + ')');
    core.addColorStop(1, 'transparent');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);

    // Rotating accretion hint (subtle arcs)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time / 8000);
    var arc = ctx.createRadialGradient(0, -w * 0.12, 0, 0, -w * 0.12, w * 0.25);
    arc.addColorStop(0, 'rgba(160, 100, 220, 0.06)');
    arc.addColorStop(1, 'transparent');
    ctx.fillStyle = arc;
    ctx.fillRect(-w * 0.4, -w * 0.4, w * 0.8, w * 0.8);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-time / 12000 + 1.5);
    var arc2 = ctx.createRadialGradient(0, w * 0.1, 0, 0, w * 0.1, w * 0.2);
    arc2.addColorStop(0, 'rgba(100, 60, 180, 0.04)');
    arc2.addColorStop(1, 'transparent');
    ctx.fillStyle = arc2;
    ctx.fillRect(-w * 0.3, -w * 0.3, w * 0.6, w * 0.6);
    ctx.restore();

    // Stars being pulled inward
    for (var i = 0; i < voidStars.length; i++) {
      var s = voidStars[i];
      // Pull toward singularity center
      var sx = s.x * w;
      var sy = s.y * h;
      var dx = cx - sx;
      var dy = cy - sy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        s.x += (dx / dist) * s.speed;
        s.y += (dy / dist) * s.speed;
      }

      // Respawn if reached center or off screen
      if (dist < w * 0.05 || s.x < 0 || s.x > 1 || s.y < 0 || s.y > 1) {
        // Respawn at edges
        var edge = Math.floor(Math.random() * 4);
        if (edge === 0) { s.x = 0; s.y = Math.random(); }
        else if (edge === 1) { s.x = 1; s.y = Math.random(); }
        else if (edge === 2) { s.x = Math.random(); s.y = 0; }
        else { s.x = Math.random(); s.y = 1; }
        s.brightness = Math.random() * 0.4 + 0.1;
      }

      // Draw star — brighter as it approaches center
      var proximityBoost = Math.max(0, 1 - dist / (w * 0.4));
      var alpha = s.brightness + proximityBoost * 0.4;
      ctx.fillStyle = 'rgba(200, 180, 255, ' + alpha.toFixed(2) + ')';
      ctx.fillRect(sx, sy, s.size, s.size);
    }
  }

  // ---- Tile Draw Functions ----

  function drawPlatform(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Stone surface
    ctx.fillStyle = '#2a2040';
    ctx.fillRect(x, y, ts, ts);

    // Stone texture variation
    ctx.fillStyle = '#252038';
    ctx.fillRect(x + 3*u, y + 2*u, 4*u, 3*u);
    ctx.fillRect(x + 9*u, y + 8*u, 5*u, 4*u);

    // Crack lines
    ctx.fillStyle = '#1a1530';
    ctx.fillRect(x + 5*u, y + 6*u, u, 4*u);
    ctx.fillRect(x + 5*u, y + 9*u, 3*u, u);

    // Subtle purple tint near singularity (right side of map)
    if (col > 9) {
      var intensity = (col - 9) / 6;
      var hueShift = Math.sin(time / 1500 + col) * 0.5 + 0.5;
      ctx.fillStyle = 'rgba(120, 60, 200, ' + (intensity * 0.08 * (0.7 + hueShift * 0.3)).toFixed(3) + ')';
      ctx.fillRect(x, y, ts, ts);
    }
  }

  function drawPlatformDark(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    ctx.fillStyle = '#221838';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#1e1530';
    ctx.fillRect(x + 2*u, y + 4*u, 5*u, 3*u);
    ctx.fillRect(x + 8*u, y + 10*u, 4*u, 3*u);

    // Cracks
    ctx.fillStyle = '#151028';
    ctx.fillRect(x + 7*u, y + 3*u, u, 5*u);
    ctx.fillRect(x + 7*u, y + 7*u, 4*u, u);

    // Purple tint near singularity
    if (col > 9) {
      var intensity = (col - 9) / 6;
      var hueShift = Math.sin(time / 1500 + col) * 0.5 + 0.5;
      ctx.fillStyle = 'rgba(120, 60, 200, ' + (intensity * 0.08 * (0.7 + hueShift * 0.3)).toFixed(3) + ')';
      ctx.fillRect(x, y, ts, ts);
    }
  }

  function drawPlatformEdge(ctx, x, y, ts) {
    var u = ts / 16;
    // Darker edge stone
    ctx.fillStyle = '#1a1530';
    ctx.fillRect(x, y, ts, ts);
    // Slightly lighter inner
    ctx.fillStyle = '#201838';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    // Edge wear
    ctx.fillStyle = '#151028';
    ctx.fillRect(x + 6*u, y + u, 3*u, u);
    ctx.fillRect(x + u, y + 8*u, u, 3*u);
  }

  function drawCrystal(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Edge base
    drawPlatformEdge(ctx, x, y, ts);

    // Crystal growths
    var pulse = 0.7 + Math.sin(time / 1000) * 0.3;
    ctx.globalAlpha = pulse;

    ctx.fillStyle = '#8060c0';
    ctx.fillRect(x + 5*u, y + 3*u, 3*u, 8*u);
    ctx.fillRect(x + 4*u, y + 5*u, 2*u, 4*u);

    ctx.fillStyle = '#a080e0';
    ctx.fillRect(x + 6*u, y + 4*u, 2*u, 5*u);

    // Crystal tip highlight
    ctx.fillStyle = '#c0a0f0';
    ctx.fillRect(x + 6*u, y + 3*u, u, u);

    ctx.globalAlpha = 1;
  }

  function drawSingularityCore(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Void base
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, ts, ts);

    // Bright pulsing core
    var pulse = 0.6 + Math.sin(time / 800) * 0.4;
    var fastPulse = 0.8 + Math.sin(time / 300) * 0.2;

    // Outer ring
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillStyle = '#a080e0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);

    // Inner bright
    ctx.globalAlpha = fastPulse;
    ctx.fillStyle = '#d0c0ff';
    ctx.fillRect(x + 4*u, y + 4*u, ts - 8*u, ts - 8*u);

    // White hot center
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 6*u, y + 6*u, 4*u, 4*u);

    ctx.globalAlpha = 1;
  }

  function drawSingularityRing(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Void base
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, ts, ts);

    // Energy wisps
    var phase = time / 600;
    var pulse = 0.4 + Math.sin(phase) * 0.3;

    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#8060c0';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 6*u);

    // Flickering energy
    var flick = Math.sin(time / 200 + x) * 0.5 + 0.5;
    ctx.globalAlpha = flick * 0.3;
    ctx.fillStyle = '#c0a0f0';
    ctx.fillRect(x + 5*u, y + 5*u, ts - 10*u, ts - 10*u);

    ctx.globalAlpha = 1;
  }

  // ---- Ship (PNG-based) ----
  // Load the ship sprite used on the intro screen.
  // The ship spans a 2x2 tile area. The top-left tile (6 at col 2, row 3)
  // draws the full image; other ship tiles just draw void.

  var shipImg = new Image();
  shipImg.src = '/bridge/assets/ship.png';

  function drawShipBody(ctx, x, y, ts, time, col, row) {
    // Void behind
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, ts, ts);

    // Only the top-left ship tile (col 2, row 3) draws the full ship image
    if (col === 2 && row === 3 && shipImg.complete && shipImg.naturalWidth > 0) {
      // Ship image is tall with flames — crop to top 48% (body only, no flames)
      var srcW = shipImg.naturalWidth;
      var srcH = shipImg.naturalHeight * 0.48;
      var destW = ts * 2;
      var destH = ts * 2;
      // Center the ship body in the 2x2 tile area with slight padding
      var destX = x + ts * 0.1;
      var destY = y + ts * 0.15;
      ctx.drawImage(shipImg, 0, 0, srcW, srcH, destX, destY, destW * 0.8, destH * 0.7);
    }
  }

  function drawShipCockpit(ctx, x, y, ts) {
    // Void behind — ship image is drawn by the body tile
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, ts, ts);
  }

  // ---- Register tileset ----

  BridgeWorld.registerTileset('singularity', {
    1: drawPlatform,
    2: drawPlatformEdge,
    3: drawCrystal,
    4: drawSingularityCore,
    5: drawSingularityRing,
    6: drawShipBody,
    7: drawShipCockpit,
    8: drawPlatformDark
  });

  // ---- Register custom background ----
  // The engine calls this before tiles if it exists

  BridgeWorld.registerBackground('singularity', drawVoidBackground);

})();
