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

    // Gravitational lensing grid — concentric rings warped toward singularity
    ctx.strokeStyle = 'rgba(80, 50, 140, 0.15)';
    ctx.lineWidth = 1;
    for (var r = 1; r <= 6; r++) {
      var radius = r * w * 0.08;
      ctx.beginPath();
      // Stretched ellipse (compressed near singularity, expanded outward)
      var rx = radius * (1 + (r * 0.04));
      var ry = radius * (1 - (r * 0.02));
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Stars being pulled inward — with stretching trail near center
    for (var i = 0; i < voidStars.length; i++) {
      var s = voidStars[i];
      var sx = s.x * w;
      var sy = s.y * h;
      var dx = cx - sx;
      var dy = cy - sy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        // Acceleration: speed increases as star approaches center
        var pull = s.speed * (1 + (1 - Math.min(1, dist / (w * 0.5))) * 4);
        s.x += (dx / dist) * pull;
        s.y += (dy / dist) * pull;
      }

      // Respawn
      if (dist < w * 0.05 || s.x < 0 || s.x > 1 || s.y < 0 || s.y > 1) {
        var edge = Math.floor(Math.random() * 4);
        if (edge === 0) { s.x = 0; s.y = Math.random(); }
        else if (edge === 1) { s.x = 1; s.y = Math.random(); }
        else if (edge === 2) { s.x = Math.random(); s.y = 0; }
        else { s.x = Math.random(); s.y = 1; }
        s.brightness = Math.random() * 0.4 + 0.1;
      }

      var proximityBoost = Math.max(0, 1 - dist / (w * 0.4));
      var alpha = s.brightness + proximityBoost * 0.4;
      // Stretched trail: nearer the center, longer trail toward the singularity
      if (proximityBoost > 0.4 && dist > 1) {
        var tailLen = proximityBoost * 18;
        var nx = dx / dist;
        var ny = dy / dist;
        ctx.strokeStyle = 'rgba(200, 180, 255, ' + (alpha * 0.5).toFixed(2) + ')';
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + nx * tailLen, sy + ny * tailLen);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(200, 180, 255, ' + alpha.toFixed(2) + ')';
      ctx.fillRect(sx, sy, s.size, s.size);
    }
  }

  // ---- Tile Draw Functions ----

  // Helper for organic crack pattern.
  // Combines several primitives (random orientations + offsets per tile)
  // so adjacent tiles don't repeat — the playfield should not read as a grid.
  function drawPlatformCracks(ctx, x, y, ts, seed, color) {
    var u = ts / 16;
    ctx.fillStyle = color;
    var lw = Math.max(1, u * 0.5);
    // Decompose seed into independent randoms so we don't lock to one pattern.
    var r1 = seed % 7;
    var r2 = (seed * 3) % 11;
    var r3 = (seed * 5) % 13;
    var r4 = (seed * 7) % 17;
    var ox = r1 % 4, oy = r2 % 4;
    // Primitive 1 — vertical hairline (offset)
    if (seed % 4 !== 3) {
      ctx.fillRect(x + (3 + ox) * u, y + (2 + oy) * u, lw, (4 + (r3 % 5)) * u);
    }
    // Primitive 2 — horizontal hairline (different offset)
    if (seed % 5 !== 0) {
      ctx.fillRect(x + (4 + r2 % 5) * u, y + (8 + r1 % 4) * u, (3 + r4 % 4) * u, lw);
    }
    // Primitive 3 — small diagonal step (sometimes)
    if (seed % 3 === 0) {
      var dStartX = (1 + r1 % 8);
      var dStartY = (3 + r2 % 6);
      var dLen = 3 + (r3 % 3);
      for (var d = 0; d < dLen; d++) {
        ctx.fillRect(x + (dStartX + d) * u, y + (dStartY + d) * u, lw, lw);
      }
    }
    // Primitive 4 — speckle dot (rarely)
    if (seed % 6 === 0) {
      ctx.fillRect(x + (2 + r4 % 11) * u, y + (12 + r1 % 3) * u, lw, lw);
    }
  }

  function drawPlatform(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 19 + row * 31) % 100;

    // Stone surface
    ctx.fillStyle = '#2a2040';
    ctx.fillRect(x, y, ts, ts);

    // Stone texture variation — randomized per tile so they don't repeat
    var off1 = (seed % 7) * u;
    var off2 = ((seed * 3) % 5) * u;
    ctx.fillStyle = '#252038';
    ctx.fillRect(x + 2*u + off1*0.4, y + 2*u + off2*0.5, 5*u, 3*u);
    ctx.fillStyle = '#2e2448';
    ctx.fillRect(x + 9*u - off2*0.5, y + 8*u + off1*0.3, 5*u, 4*u);

    // Speckle noise
    if (seed % 3 === 0) {
      ctx.fillStyle = 'rgba(80,60,140,0.15)';
      ctx.fillRect(x + 3*u, y + 11*u, u, u);
    }
    if (seed % 5 === 0) {
      ctx.fillStyle = 'rgba(40,30,80,0.4)';
      ctx.fillRect(x + 12*u, y + 3*u, 2*u, u);
    }

    // Organic cracks
    drawPlatformCracks(ctx, x, y, ts, seed, '#1a1530');

    // Subtle purple tint near singularity (right side of map)
    if (col > 9) {
      var intensity = (col - 9) / 6;
      var hueShift = Math.sin(time / 1500 + col) * 0.5 + 0.5;
      ctx.fillStyle = 'rgba(120, 60, 200, ' + (intensity * 0.10 * (0.7 + hueShift * 0.3)).toFixed(3) + ')';
      ctx.fillRect(x, y, ts, ts);
      // Distortion ripple — faint warp lines
      if (intensity > 0.4) {
        var rip = Math.sin(time / 600 + col + row) * 0.5 + 0.5;
        ctx.globalAlpha = rip * 0.18 * intensity;
        ctx.fillStyle = '#a080e0';
        ctx.fillRect(x, y + Math.floor(8 * u + rip * 4 * u), ts, Math.max(1, u * 0.5));
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawPlatformDark(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17 + 7) % 100;

    ctx.fillStyle = '#1c1432';
    ctx.fillRect(x, y, ts, ts);
    // Variation
    var off = (seed % 4) * u;
    ctx.fillStyle = '#221838';
    ctx.fillRect(x + 2*u + off*0.5, y + 4*u, 5*u, 3*u);
    ctx.fillStyle = '#1a1230';
    ctx.fillRect(x + 8*u, y + 10*u + off*0.3, 4*u, 3*u);

    // Cracks (different seed for variety)
    drawPlatformCracks(ctx, x, y, ts, seed + 2, '#0e0820');

    // Speckle
    if (seed % 4 === 0) {
      ctx.fillStyle = 'rgba(100,60,180,0.2)';
      ctx.fillRect(x + 11*u, y + 11*u, u, u);
    }

    // Purple tint near singularity
    if (col > 9) {
      var intensity = (col - 9) / 6;
      var hueShift = Math.sin(time / 1500 + col) * 0.5 + 0.5;
      ctx.fillStyle = 'rgba(120, 60, 200, ' + (intensity * 0.10 * (0.7 + hueShift * 0.3)).toFixed(3) + ')';
      ctx.fillRect(x, y, ts, ts);
    }
  }

  function drawPlatformEdge(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 13 + row * 19) % 100;
    // Outer edge — darker chunkier
    ctx.fillStyle = '#0e0820';
    ctx.fillRect(x, y, ts, ts);
    // Slightly lighter inner
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    // Crumbling edge bits — small fragments around the edge
    ctx.fillStyle = '#0a0418';
    if (seed % 3 === 0) ctx.fillRect(x + u, y + u, u, u);
    if (seed % 4 === 0) ctx.fillRect(x + ts - 2*u, y + u, u, u);
    if (seed % 5 === 0) ctx.fillRect(x + u, y + ts - 2*u, u, u);
    if (seed % 6 === 0) ctx.fillRect(x + ts - 2*u, y + ts - 2*u, u, u);
    // Drifting fragments — pulled toward singularity
    var drift = ((time / 80) + seed) % 16;
    ctx.fillStyle = 'rgba(100,60,180,0.4)';
    ctx.fillRect(x + 16*u - drift * u, y + 5*u + (seed % 4)*u, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    // Edge wear
    ctx.fillStyle = '#080414';
    ctx.fillRect(x + 6*u, y + u, 3*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + u, y + 8*u, Math.max(1, u * 0.5), 3*u);
  }

  function drawCrystal(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Edge base
    drawPlatformEdge(ctx, x, y, ts, time, col, row);

    // Pulsing halo first
    var pulse = 0.7 + Math.sin(time / 800 + col + row * 0.3) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.4;
    var grad = ctx.createRadialGradient(x + 7*u, y + 8*u, 0, x + 7*u, y + 8*u, 8*u);
    grad.addColorStop(0, 'rgba(160,100,240,0.5)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 2*u, y - 2*u, ts + 4*u, ts + 4*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Main crystal — angular triangle/diamond
    ctx.globalAlpha = pulse;
    // Outer dark facet
    ctx.fillStyle = '#503090';
    ctx.beginPath();
    ctx.moveTo(x + 7*u, y + 2*u);
    ctx.lineTo(x + 11*u, y + 7*u);
    ctx.lineTo(x + 8*u, y + 12*u);
    ctx.lineTo(x + 4*u, y + 8*u);
    ctx.closePath();
    ctx.fill();
    // Mid facet
    ctx.fillStyle = '#8060c0';
    ctx.beginPath();
    ctx.moveTo(x + 7*u, y + 2*u);
    ctx.lineTo(x + 9*u, y + 7*u);
    ctx.lineTo(x + 7*u, y + 11*u);
    ctx.lineTo(x + 5*u, y + 7*u);
    ctx.closePath();
    ctx.fill();
    // Inner bright facet
    ctx.fillStyle = '#a080e0';
    ctx.beginPath();
    ctx.moveTo(x + 7*u, y + 3*u);
    ctx.lineTo(x + 8*u, y + 7*u);
    ctx.lineTo(x + 7*u, y + 10*u);
    ctx.closePath();
    ctx.fill();
    // Tip highlight
    ctx.fillStyle = '#e0c0f8';
    ctx.fillRect(x + 7*u, y + 2*u, u, 2*u);
    // Side small crystals
    ctx.fillStyle = '#6040a0';
    ctx.beginPath();
    ctx.moveTo(x + 11*u, y + 8*u);
    ctx.lineTo(x + 13*u, y + 11*u);
    ctx.lineTo(x + 10*u, y + 12*u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8060c0';
    ctx.beginPath();
    ctx.moveTo(x + 3*u, y + 9*u);
    ctx.lineTo(x + 5*u, y + 12*u);
    ctx.lineTo(x + 2*u, y + 12*u);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSingularityCore(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Void base
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, ts, ts);

    var cx = x + ts / 2;
    var cy = y + ts / 2;

    // Far halo (additive)
    ctx.globalCompositeOperation = 'screen';
    var pulse = 0.7 + Math.sin(time / 800) * 0.3;
    var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14*u);
    halo.addColorStop(0, 'rgba(180,120,255,' + (pulse * 0.45).toFixed(2) + ')');
    halo.addColorStop(0.4, 'rgba(120,60,200,' + (pulse * 0.25).toFixed(2) + ')');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 8*u, y - 8*u, ts + 16*u, ts + 16*u);
    ctx.globalCompositeOperation = 'source-over';

    // Rotating accretion ring (4 rotating arcs)
    ctx.save();
    ctx.translate(cx, cy);
    var ringRot = time / 600;
    for (var r = 0; r < 4; r++) {
      ctx.save();
      ctx.rotate(ringRot + (r * Math.PI / 2));
      ctx.fillStyle = 'rgba(200,160,255,0.6)';
      ctx.fillRect(2*u, -Math.max(1, u * 0.7), 4*u, Math.max(1, u * 1.4));
      ctx.restore();
    }
    ctx.restore();

    // Outer ring (slightly pulsing)
    ctx.globalAlpha = pulse * 0.7;
    ctx.fillStyle = '#a080e0';
    ctx.beginPath();
    ctx.arc(cx, cy, 6*u, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright disc
    var fastPulse = 0.85 + Math.sin(time / 250) * 0.15;
    ctx.globalAlpha = fastPulse;
    ctx.fillStyle = '#e0d0ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4*u, 0, Math.PI * 2);
    ctx.fill();

    // White-hot center
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2*u, 0, Math.PI * 2);
    ctx.fill();

    // Tiny lensing particles spiraling inward
    for (var i = 0; i < 6; i++) {
      var p = (time / 200 + i * (Math.PI / 3)) % (Math.PI * 2);
      var dist = (((time / 30 + i * 17) % 60)) / 60 * 7*u + 3*u;
      var px = cx + Math.cos(p) * dist;
      var py = cy + Math.sin(p) * dist;
      ctx.fillStyle = 'rgba(220,200,255,0.7)';
      ctx.fillRect(px, py, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    }

    ctx.globalAlpha = 1;
  }

  function drawSingularityRing(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Void base
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, ts, ts);

    var cx = x + ts / 2;
    var cy = y + ts / 2;

    // Energy wisps — animated streaks based on tile position relative to core
    // (We don't know exact core pos, but ring tiles are arranged around it)
    var phase = time / 500 + (col * 7 + row * 11) * 0.2;

    // Spiraling streak: a curved rectangle that rotates
    ctx.globalCompositeOperation = 'screen';
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(phase);
    var streakAlpha = 0.4 + Math.sin(time / 300 + col + row) * 0.3;
    ctx.globalAlpha = streakAlpha;
    var streakGrad = ctx.createLinearGradient(-7*u, 0, 7*u, 0);
    streakGrad.addColorStop(0, 'transparent');
    streakGrad.addColorStop(0.5, 'rgba(160,100,240,0.7)');
    streakGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(-7*u, -Math.max(1, u * 0.5), 14*u, Math.max(1, u));
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // Twinkle dots
    var d1Phase = (time / 400 + col * 1.7 + row * 2.3);
    var d2Phase = (time / 250 + col * 2.1);
    var d1 = (Math.sin(d1Phase) + 1) * 0.5;
    var d2 = (Math.sin(d2Phase) + 1) * 0.5;
    ctx.fillStyle = 'rgba(200,160,255,' + d1.toFixed(2) + ')';
    ctx.fillRect(x + 3*u, y + 11*u, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.fillStyle = 'rgba(180,140,240,' + d2.toFixed(2) + ')';
    ctx.fillRect(x + 11*u, y + 4*u, Math.max(1, u * 0.7), Math.max(1, u * 0.7));

    ctx.globalAlpha = 1;
  }

  // ---- Ship (PNG-based) ----
  // Docked ship sprite with white background removed.
  // Anchor tile (col 1, row 3) draws the full ship across 3x3 tiles.

  var shipCanvas = null;

  function loadShipSprite() {
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
        if (r > 240 && g > 240 && b > 240) {
          px[i + 3] = 0;
        } else if (r > 200 && g > 200 && b > 200) {
          var avg = (r + g + b) / 3;
          var fade = Math.max(0, Math.min(255, Math.round((255 - avg) * (255 / 55))));
          px[i + 3] = Math.min(px[i + 3], fade);
        }
      }
      sctx.putImageData(data, 0, 0);
    };
    img.src = '/bridge/assets/ship-docked.png';
  }
  loadShipSprite();

  function drawShipBody(ctx, x, y, ts, time, col, row) {
    // Void behind all ship tiles
    ctx.fillStyle = '#050510';
    ctx.fillRect(x, y, ts, ts);

    // Anchor tile draws the full ship spanning 3x3 tiles
    if (col === 1 && row === 3 && shipCanvas) {
      var areaW = ts * 3;
      var areaH = ts * 3;
      // Scale ship to fill most of the 3x3 area, preserving aspect ratio
      var aspect = shipCanvas.width / shipCanvas.height;
      var shipW, shipH;
      if (aspect > 1) {
        shipW = areaW * 0.95;
        shipH = shipW / aspect;
      } else {
        shipH = areaH * 0.95;
        shipW = shipH * aspect;
      }
      var destX = x + (areaW - shipW) / 2;
      var destY = y + (areaH - shipH) / 2;
      ctx.drawImage(shipCanvas, 0, 0, shipCanvas.width, shipCanvas.height, destX, destY, shipW, shipH);
    }
  }

  function drawShipCockpit(ctx, x, y, ts) {
    // Void — ship image drawn by the anchor body tile
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
