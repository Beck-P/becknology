/**
 * Enigma Station World Module — Abandoned deep-space intelligence outpost.
 *
 * Cold cyan/teal palette. Metal corridors, blinking server racks,
 * cracked viewports, flickering terminals.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Tile Draw Functions ----

  // Metal wall — strict pixel art. 4u dark cap + 12u panel body, 1u panel
  // seams, 1u rivets at four corners.
  function drawMetalWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DARK = '#0a1218';
    var CAP = '#0e1820';
    var CAP_HI = '#2a3a48';
    var PANEL = '#1a2530';
    // Cap (4u)
    ctx.fillStyle = CAP;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x, y, ts, u);
    // Panel body (12u)
    ctx.fillStyle = PANEL;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    // 1u under-cap shadow line
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 4*u, ts, u);
    // 1u panel seams (vertical center + horizontal mid)
    ctx.fillRect(x + 8*u, y + 5*u, u, 11*u);
    ctx.fillRect(x, y + 9*u, ts, u);
    // Rivets — 1u corner dots
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x + 2*u, y + 6*u, u, u);
    ctx.fillRect(x + 13*u, y + 6*u, u, u);
    ctx.fillRect(x + 2*u, y + 13*u, u, u);
    ctx.fillRect(x + 13*u, y + 13*u, u, u);
    // 1u oil streak
    var seed = (col * 19 + row * 31) % 17;
    if (seed === 0) {
      ctx.fillStyle = '#080c10';
      ctx.fillRect(x + 5*u, y + 6*u, u, 6*u);
    }
  }

  // Metal floor — strict pixel art. 14u × 14u plate with 1u border, 1u
  // cross grooves, deterministic 1u grime.
  function drawMetalFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DARK = '#0a1218';
    var BASE = '#182028';
    var PLATE = '#1e2830';
    var PLATE_HI = '#243040';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // Plate (14u × 14u)
    ctx.fillStyle = PLATE;
    ctx.fillRect(x + u, y + u, 14*u, 14*u);
    // 1u cross grooves
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // 1u corner highlights
    ctx.fillStyle = PLATE_HI;
    ctx.fillRect(x + 2*u, y + 2*u, 2*u, u);
    ctx.fillRect(x + 9*u, y + 2*u, 2*u, u);
    ctx.fillRect(x + 2*u, y + 9*u, 2*u, u);
    ctx.fillRect(x + 9*u, y + 9*u, 2*u, u);
    // 1u grime
    var seed = (col * 13 + row * 23) % 11;
    if (seed === 0) {
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 5*u, y + 11*u, u, u);
      ctx.fillRect(x + 6*u, y + 11*u, u, u);
    } else if (seed === 5) {
      ctx.fillStyle = '#2a4848';
      ctx.fillRect(x + 11*u, y + 5*u, u, u);
    }
  }

  // Corridor floor — strict pixel art. 10u center strip + 1u edge grooves +
  // animated 4u chevron (atmospheric glow allowed for the chevron).
  function drawCorridorFloor(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var DARK = '#0a141c';
    var BASE = '#1e2a35';
    var STRIP = '#243040';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // Center strip (10u wide)
    ctx.fillStyle = STRIP;
    ctx.fillRect(x + 3*u, y, 10*u, ts);
    // 1u edge grooves
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y, u, ts);
    ctx.fillRect(x + 13*u, y, u, ts);
    // Chevron animation — frame-stepped, whole-u
    var aoff = Math.floor((time / 80) % 16) * u;
    var ax = x + 6*u;
    // Atmospheric glow halo
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(80,180,220,0.7)';
    ctx.fillRect(ax, y + aoff, 4*u, u);
    ctx.fillRect(ax + u, y + aoff + u, 2*u, u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Bright core (1u)
    ctx.fillStyle = '#a0e0e0';
    ctx.fillRect(ax + u, y + aoff, 2*u, u);
  }

  function drawServerRack(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Rack body
    ctx.fillStyle = '#0e1820';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Frame inner
    ctx.fillStyle = '#1a2830';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    // Outer outline
    ctx.fillStyle = '#050a10';
    ctx.fillRect(x + u, y + u, ts - 2*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + u, y + ts - 2*u, ts - 2*u, Math.max(1, u * 0.5));

    // Blinking LEDs (3 rows × 4 cols, each on its own cycle)
    var seed = col * 13 + row * 29;
    var LED_COLORS = ['#40e080', '#40c080', '#e06040', '#40a8e0', '#e0c040'];
    for (var i = 0; i < 3; i++) {
      var ledY = y + (3 + i * 4) * u;
      for (var j = 0; j < 4; j++) {
        var ledX = x + (3 + j * 3) * u;
        var phase = (time / 200) + seed * 0.1 + i * 1.7 + j * 2.3;
        var lit = (Math.sin(phase) > -0.3);
        var color = LED_COLORS[(i + j + seed) % LED_COLORS.length];
        if (lit) {
          // Glow halo (additive)
          ctx.globalCompositeOperation = 'screen';
          var grad = ctx.createRadialGradient(ledX + u*0.5, ledY + u*0.5, 0, ledX + u*0.5, ledY + u*0.5, 2*u);
          grad.addColorStop(0, color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.7;
          ctx.fillRect(ledX - 2*u, ledY - 2*u, 5*u, 5*u);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
          ctx.fillRect(ledX, ledY, u, u);
        } else {
          ctx.fillStyle = '#0a1218';
          ctx.fillRect(ledX, ledY, u, u);
        }
      }
    }

    // Activity progress bar — scrolling
    var pbY = y + 14 * u;
    ctx.fillStyle = '#0a1218';
    ctx.fillRect(x + 3*u, pbY, ts - 6*u, Math.max(1, u * 0.7));
    var pbProg = (Math.sin(time / 800 + col + row * 0.5) + 1) * 0.5;
    ctx.fillStyle = '#40c8d8';
    ctx.fillRect(x + 3*u, pbY, (ts - 6*u) * pbProg, Math.max(1, u * 0.7));

    // Vent slots at bottom
    ctx.fillStyle = '#050a10';
    ctx.fillRect(x + 3*u, y + ts - 3*u, ts - 6*u, u);
    ctx.fillRect(x + 3*u, y + ts - 5*u, ts - 6*u, u);
  }

  function drawTerminal(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Wall base
    drawMetalWall(ctx, x, y, ts, time, col, row);

    // Bezel
    ctx.fillStyle = '#050a10';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.33), ts - 4*u, Math.floor(ts * 0.42));

    // Screen background — dark teal
    var sx = x + 3*u;
    var sy = y + Math.floor(ts * 0.36);
    var sw = ts - 6*u;
    var sh = Math.floor(ts * 0.36);
    ctx.fillStyle = '#082030';
    ctx.fillRect(sx, sy, sw, sh);

    // Cascading "code" lines — different per terminal seed
    var seed = col * 11 + row * 17;
    var lines = 4;
    for (var i = 0; i < lines; i++) {
      var lineY = sy + Math.floor(sh * (0.15 + i * 0.2));
      var lineCol = (Math.floor(time / 400) + seed + i * 3) % 4;
      var lineLen = ((seed * (i + 1)) % 6) + 4;
      var lineColors = ['#40c8d8', '#a0e8f0', '#3088a0', '#5cc0d0'];
      ctx.fillStyle = lineColors[lineCol];
      ctx.globalAlpha = 0.85 - i * 0.1;
      ctx.fillRect(sx + u, lineY, lineLen * u * 0.6, Math.max(1, u * 0.7));
      // Cursor block at end of last line
      if (i === lines - 1) {
        var blink = (Math.floor(time / 350) % 2) === 0;
        if (blink) {
          ctx.fillStyle = '#a0e8f0';
          ctx.fillRect(sx + u + lineLen * u * 0.6 + u, lineY, Math.max(1, u * 0.6), Math.max(1, u * 0.7));
        }
      }
    }
    ctx.globalAlpha = 1;

    // Scan line sweeping down
    var scanY = ((time / 30 + col * 30) % sh);
    ctx.fillStyle = 'rgba(160, 240, 255, 0.18)';
    ctx.fillRect(sx, sy + scanY, sw, Math.max(1, u * 1.2));

    // CRT scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (var sl = 0; sl < sh; sl += 2*u) {
      ctx.fillRect(sx, sy + sl, sw, Math.max(1, u * 0.4));
    }

    // Screen flicker (rare)
    if ((Math.floor(time / 80) + seed) % 73 === 0) {
      ctx.fillStyle = 'rgba(160,240,255,0.2)';
      ctx.fillRect(sx, sy, sw, sh);
    }

    // Bezel highlight
    ctx.fillStyle = 'rgba(80,120,140,0.3)';
    ctx.fillRect(sx, sy, sw, Math.max(1, u * 0.4));
  }

  function drawViewport(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Wall base
    drawMetalWall(ctx, x, y, ts, time, col, row);

    // Outer frame (heavy bezel)
    ctx.fillStyle = '#050a10';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.28), ts - 4*u, Math.floor(ts * 0.54));

    // Viewport interior
    var vx = x + 3*u;
    var vy = y + Math.floor(ts * 0.3);
    var vw = ts - 6*u;
    var vh = Math.floor(ts * 0.5);
    // Deep space gradient (top darker, bottom lighter)
    var grad = ctx.createLinearGradient(vx, vy, vx, vy + vh);
    grad.addColorStop(0, '#040810');
    grad.addColorStop(0.5, '#0a1828');
    grad.addColorStop(1, '#102030');
    ctx.fillStyle = grad;
    ctx.fillRect(vx, vy, vw, vh);

    // Distant nebula glow
    var neb = ctx.createRadialGradient(vx + vw * 0.3, vy + vh * 0.6, 0, vx + vw * 0.3, vy + vh * 0.6, vw * 0.6);
    neb.addColorStop(0, 'rgba(40,120,160,0.12)');
    neb.addColorStop(1, 'transparent');
    ctx.fillStyle = neb;
    ctx.fillRect(vx, vy, vw, vh);

    // Stars (more, with movement parallax)
    var seed = col * 17 + row * 31 + 7;
    var driftX = (time / 8000) * vw;
    for (var i = 0; i < 14; i++) {
      var sx = vx + (((seed * (i + 1) * 7) % 1000) / 1000) * vw;
      sx = ((sx - vx + driftX * (0.3 + (i % 3) * 0.2)) % vw) + vx;
      var sy = vy + (((seed * (i + 1) * 13) % 1000) / 1000) * vh;
      var size = (i % 3 === 0) ? Math.max(1, u * 0.7) : Math.max(1, u * 0.4);
      var twinkle = Math.sin(time / (600 + i * 80) + i * 2.5) * 0.3 + 0.7;
      ctx.fillStyle = i % 5 === 0 ? '#ffe0b0' : '#ffffff';
      ctx.globalAlpha = twinkle * 0.85;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1;

    // Distant planet (rare)
    if (((col + row) % 4) === 1) {
      var px = vx + vw * 0.7;
      var py = vy + vh * 0.3;
      var pr = vw * 0.08;
      var pgrad = ctx.createRadialGradient(px - pr*0.3, py - pr*0.3, 0, px, py, pr);
      pgrad.addColorStop(0, '#a0c0e0');
      pgrad.addColorStop(1, '#304060');
      ctx.fillStyle = pgrad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crack lines — more elaborate
    ctx.strokeStyle = 'rgba(140,180,210,0.4)';
    ctx.lineWidth = Math.max(1, u * 0.4);
    ctx.beginPath();
    ctx.moveTo(vx + vw * 0.25, vy + vh * 0.15);
    ctx.lineTo(vx + vw * 0.35, vy + vh * 0.45);
    ctx.lineTo(vx + vw * 0.30, vy + vh * 0.7);
    ctx.lineTo(vx + vw * 0.45, vy + vh * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vx + vw * 0.35, vy + vh * 0.45);
    ctx.lineTo(vx + vw * 0.55, vy + vh * 0.55);
    ctx.stroke();

    // Inner reflection sheen
    ctx.fillStyle = 'rgba(120,180,210,0.06)';
    ctx.fillRect(vx, vy, vw, Math.max(1, u * 1.2));

    // Frame outline
    ctx.strokeStyle = '#2a3a48';
    ctx.lineWidth = Math.max(1, u * 0.4);
    ctx.strokeRect(vx, vy, vw, vh);
    // Bottom drip indicator
    ctx.fillStyle = '#3a5060';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.82), 2*u, Math.max(1, u * 0.5));
  }

  // Blast door — strict pixel art. Hazard chevron stripes + 2u warning
  // light + 1u corner rivets.
  function drawBlastDoor(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawCorridorFloor(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0e15';
    // Door frame top/bottom (2u tall each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y, ts, 2*u);
    ctx.fillRect(x, y + 14*u, ts, 2*u);
    // Hazard chevrons — 2u wide alternating yellow/black
    for (var i = 0; i < 8; i++) {
      ctx.fillStyle = (i % 2 === 0) ? '#e8b830' : DARK;
      ctx.fillRect(x + i * 2*u, y, 2*u, u);
      ctx.fillStyle = (i % 2 === 0) ? DARK : '#e8b830';
      ctx.fillRect(x + i * 2*u, y + 15*u, 2*u, u);
    }
    // Warning light (2u × 1u)
    var warn = (Math.sin(time / 250) > 0);
    if (warn) {
      ctx.fillStyle = '#e83838';
      ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
      // Atmospheric halo
      ctx.globalCompositeOperation = 'screen';
      var grad = ctx.createRadialGradient(x + 8*u, y + 2*u, 0, x + 8*u, y + 2*u, 5*u);
      grad.addColorStop(0, 'rgba(232,56,56,0.6)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 2*u, y, ts + 4*u, 6*u);
      ctx.globalCompositeOperation = 'source-over';
    }
    // Corner rivets (1u each)
    ctx.fillStyle = '#3a4a58';
    ctx.fillRect(x + u, y + 3*u, u, u);
    ctx.fillRect(x + 14*u, y + 3*u, u, u);
    ctx.fillRect(x + u, y + 12*u, u, u);
    ctx.fillRect(x + 14*u, y + 12*u, u, u);
  }

  function drawAntenna(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Floor base
    drawCorridorFloor(ctx, x, y, ts, time, col, row);

    // Antenna base
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(x + 6*u, y + 10*u, 4*u, 5*u);
    ctx.fillStyle = '#2a3a48';
    ctx.fillRect(x + 6*u, y + 10*u, 4*u, u);
    // Pole
    ctx.fillStyle = '#2a3a48';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, 8*u);
    ctx.fillStyle = '#3a4a58';
    ctx.fillRect(x + 7*u, y + 2*u, u, 8*u);

    // Dish — tilted with subtle scanning rotation suggested by widths
    var sweep = (Math.sin(time / 1500 + col) + 1) * 0.5;
    var dishLeft = 4*u + sweep * u;
    var dishRight = 4*u - sweep * u;
    ctx.fillStyle = '#354550';
    ctx.fillRect(x + dishLeft, y + u, 16*u - dishLeft - dishRight, 3*u);
    ctx.fillStyle = '#1e2830';
    ctx.fillRect(x + dishLeft + u, y + 2*u, 16*u - dishLeft - dishRight - 2*u, u);
    // Center transmitter
    ctx.fillStyle = '#404a50';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, 2*u);

    // Blinking light on top with halo
    var blink = (Math.sin(time / 400) > 0);
    if (blink) {
      ctx.globalCompositeOperation = 'screen';
      var grad = ctx.createRadialGradient(x + 8*u, y + u, 0, x + 8*u, y + u, 4*u);
      grad.addColorStop(0, 'rgba(64,200,216,0.7)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y - 3*u, ts, 6*u);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#80e8f0';
      ctx.fillRect(x + 7*u, y + u, 2*u, u);
    } else {
      ctx.fillStyle = '#1a3040';
      ctx.fillRect(x + 7*u, y + u, 2*u, u);
    }

    // Cable from base to floor
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(x + 5*u, y + 14*u, u, u);
    ctx.fillRect(x + 10*u, y + 14*u, u, u);
  }

  function drawWallPanel(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Wall base
    drawMetalWall(ctx, x, y, ts, time, col, row);

    // Recessed panel
    var px = x + 3*u;
    var py = y + Math.floor(ts * 0.36);
    var pw = ts - 6*u;
    var ph = Math.floor(ts * 0.32);
    ctx.fillStyle = '#0a1218';
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#15202a';
    ctx.fillRect(px + u, py + u, pw - 2*u, ph - 2*u);

    // Three indicator lights — green / amber / red on different cycles.
    // Larger lights with a brighter halo so they read at distance.
    var seed = col * 11 + row * 23;
    var COLORS = ['#40e080', '#e8c040', '#e84040'];
    for (var i = 0; i < 3; i++) {
      var lx = px + (1.5 + i * 3) * u;
      var ly = py + Math.floor(ph * 0.35);
      var phase = (time / (200 + i * 100)) + seed * 0.1 + i * 1.7;
      var on = (Math.sin(phase) > -0.2);
      var col_i = COLORS[i];
      if (on) {
        // Glow pass
        ctx.globalCompositeOperation = 'screen';
        var grad = ctx.createRadialGradient(lx + u, ly + u, 0, lx + u, ly + u, 4*u);
        grad.addColorStop(0, col_i);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(lx - 3*u, ly - 3*u, 8*u, 8*u);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = col_i;
        ctx.fillRect(lx, ly, 2*u, 2*u);
        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(lx + u*0.3, ly + u*0.3, u, u);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#0e141a';
        ctx.fillRect(lx, ly, 2*u, 2*u);
      }
    }
    // Mini gauge bar
    var gauge = (Math.sin(time / 1200 + col) + 1) * 0.5;
    ctx.fillStyle = '#0a1218';
    ctx.fillRect(px + u, py + ph - 2*u, pw - 2*u, Math.max(1, u * 0.6));
    ctx.fillStyle = '#40c8d8';
    ctx.fillRect(px + u, py + ph - 2*u, (pw - 2*u) * gauge, Math.max(1, u * 0.6));
  }

  // ---- Ship (reuse docked ship PNG) ----

  var shipCanvas = null;

  function loadShipSprite() {
    var img = new Image();
    img.onload = function () {
      shipCanvas = document.createElement('canvas');
      shipCanvas.width = img.width;
      shipCanvas.height = img.height;
      var sctx = shipCanvas.getContext('2d');
      sctx.drawImage(img, 0, 0);
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
    ctx.fillStyle = '#050a15';
    ctx.fillRect(x, y, ts, ts);

    // Anchor tile draws full ship across 3x2 area
    if (col === 1 && row === 2 && shipCanvas) {
      var areaW = ts * 3;
      var areaH = ts * 2;
      var aspect = shipCanvas.width / shipCanvas.height;
      var shipW, shipH;
      if (aspect > areaW / areaH) {
        shipW = areaW * 0.9;
        shipH = shipW / aspect;
      } else {
        shipH = areaH * 0.9;
        shipW = shipH * aspect;
      }
      var destX = x + (areaW - shipW) / 2;
      var destY = y + (areaH - shipH) / 2;
      ctx.drawImage(shipCanvas, 0, 0, shipCanvas.width, shipCanvas.height, destX, destY, shipW, shipH);
    }
  }

  function drawShipCockpit(ctx, x, y, ts) {
    ctx.fillStyle = '#050a15';
    ctx.fillRect(x, y, ts, ts);
  }

  // ---- Custom Background ----

  var bgStars = [];
  var bgInited = false;
  var shootingStar = null;

  function drawStationBackground(ctx, w, h, time) {
    if (!bgInited) {
      bgInited = true;
      for (var i = 0; i < 100; i++) {
        bgStars.push({
          x: Math.random(), y: Math.random(),
          size: Math.random() * 1.4 + 0.5,
          brightness: Math.random() * 0.3 + 0.1,
          speed: Math.random() * 0.3 + 0.8,
          parallax: Math.random() * 0.5 + 0.5,
          warm: Math.random() < 0.15
        });
      }
    }

    // Dark deep-space background
    ctx.fillStyle = '#030810';
    ctx.fillRect(0, 0, w, h);

    // Subtle drifting teal nebula
    var nebX = w * 0.3 + Math.sin(time / 8000) * w * 0.05;
    var nebY = h * 0.4 + Math.cos(time / 9000) * h * 0.05;
    var neb = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, w * 0.55);
    neb.addColorStop(0, 'rgba(30, 80, 90, 0.10)');
    neb.addColorStop(1, 'transparent');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);

    // Second nebula — distant orange
    var nebX2 = w * 0.75 + Math.cos(time / 11000) * w * 0.04;
    var nebY2 = h * 0.7;
    var neb2 = ctx.createRadialGradient(nebX2, nebY2, 0, nebX2, nebY2, w * 0.4);
    neb2.addColorStop(0, 'rgba(120, 70, 60, 0.05)');
    neb2.addColorStop(1, 'transparent');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, w, h);

    // Stars with parallax drift — brighter so they actually read
    var driftX = (time / 60000) * w;
    for (var i = 0; i < bgStars.length; i++) {
      var s = bgStars[i];
      var sx = ((s.x * w + driftX * s.parallax) % w + w) % w;
      var sy = s.y * h;
      // Boost baseline brightness (was 0.1-0.4, now 0.4-0.85) and amp twinkle
      var twinkle = Math.sin(time / (800 * s.speed) + i * 1.7) * 0.25 + s.brightness * 1.6 + 0.25;
      twinkle = Math.min(1, twinkle);
      var col = s.warm ? '255, 220, 180' : '200, 230, 250';
      ctx.fillStyle = 'rgba(' + col + ', ' + twinkle.toFixed(2) + ')';
      ctx.fillRect(sx, sy, s.size, s.size);
      // Halo for the brighter stars
      if (s.size > 1.2) {
        ctx.fillStyle = 'rgba(' + col + ', ' + (twinkle * 0.3).toFixed(2) + ')';
        ctx.fillRect(sx - 1, sy, s.size + 2, s.size);
        ctx.fillRect(sx, sy - 1, s.size, s.size + 2);
      }
    }

    // Occasional shooting star
    if (!shootingStar && Math.random() < 0.001) {
      shootingStar = {
        x: Math.random() * w * 0.5,
        y: Math.random() * h * 0.4,
        vx: 1.5 + Math.random() * 1.5,
        vy: 0.4 + Math.random() * 0.6,
        life: 0,
        maxLife: 60 + Math.random() * 40
      };
    }
    if (shootingStar) {
      var ss = shootingStar;
      ss.life++;
      ss.x += ss.vx * 4;
      ss.y += ss.vy * 4;
      var sa = Math.max(0, 1 - ss.life / ss.maxLife);
      ctx.strokeStyle = 'rgba(220,240,255,' + (sa * 0.8).toFixed(2) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ss.x - ss.vx * 12, ss.y - ss.vy * 12);
      ctx.lineTo(ss.x, ss.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + sa.toFixed(2) + ')';
      ctx.fillRect(ss.x, ss.y, 1.5, 1.5);
      if (ss.life > ss.maxLife) shootingStar = null;
    }
  }

  // ---- Register ----

  BridgeWorld.registerTileset('enigma', {
    1: drawMetalWall,
    2: drawMetalFloor,
    3: drawCorridorFloor,
    4: drawServerRack,
    5: drawTerminal,
    6: drawViewport,
    7: drawBlastDoor,
    8: drawAntenna,
    9: drawWallPanel,
    10: drawShipBody,
    11: drawShipCockpit
  });

  BridgeWorld.registerBackground('enigma', drawStationBackground);

  // ---- Power Flicker Effect ----
  // Periodic station-wide dimming that makes the outpost feel like its
  // power supply is failing — double-flicker like a fluorescent tube.

  var flickerOverlay = null;

  function startFlicker() {
    setInterval(function () {
      var w = BridgeWorld.getWorld();
      if (!w || w.tileset !== 'enigma' || !BridgeWorld.isActive()) return;

      // ~8% chance each second → roughly every 10-15 seconds
      if (Math.random() > 0.08) return;

      // Create or reuse the overlay div
      if (!flickerOverlay) {
        flickerOverlay = document.createElement('div');
        flickerOverlay.style.cssText =
          'position:fixed;top:0;left:0;right:0;bottom:0;' +
          'background:rgba(0,0,0,0);pointer-events:none;z-index:14;' +
          'transition:background 0.05s;';
        document.body.appendChild(flickerOverlay);
      }

      // Double-flicker: dim → brief return → dim again → clear
      flickerOverlay.style.background = 'rgba(0,0,0,0.35)';
      setTimeout(function () {
        flickerOverlay.style.background = 'rgba(0,0,0,0.05)';
      }, 80);
      setTimeout(function () {
        flickerOverlay.style.background = 'rgba(0,0,0,0.30)';
      }, 150);
      setTimeout(function () {
        flickerOverlay.style.background = 'rgba(0,0,0,0)';
      }, 300);
    }, 1000);
  }

  startFlicker();

})();
