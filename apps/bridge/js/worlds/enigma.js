/**
 * Enigma Station World Module — Abandoned deep-space intelligence outpost.
 *
 * Cold cyan/teal palette. Metal corridors, blinking server racks,
 * cracked viewports, flickering terminals.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Tile Draw Functions ----

  function drawMetalWall(ctx, x, y, ts) {
    var u = ts / 16;
    // Top cap (darker)
    ctx.fillStyle = '#121c25';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.3));
    // Front face
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(x, y + Math.floor(ts * 0.3), ts, ts - Math.floor(ts * 0.3));
    // Panel lines
    ctx.fillStyle = '#121c25';
    ctx.fillRect(x, y + Math.floor(ts * 0.55), ts, 1);
    ctx.fillRect(x + Math.floor(ts * 0.5), y + Math.floor(ts * 0.3), 1, Math.floor(ts * 0.25));
    // Rivet dots
    ctx.fillStyle = '#253540';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.35), u, u);
    ctx.fillRect(x + ts - 3*u, y + Math.floor(ts * 0.35), u, u);
  }

  function drawMetalFloor(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#182028';
    ctx.fillRect(x, y, ts, ts);
    // Grid plate pattern
    ctx.fillStyle = '#1e2830';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Cross grooves
    ctx.fillStyle = '#141c24';
    ctx.fillRect(x + Math.floor(ts * 0.5), y, 1, ts);
    ctx.fillRect(x, y + Math.floor(ts * 0.5), ts, 1);
  }

  function drawCorridorFloor(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#1e2a35';
    ctx.fillRect(x, y, ts, ts);
    // Center strip (lighter)
    ctx.fillStyle = '#243040';
    ctx.fillRect(x + 3*u, y, ts - 6*u, ts);
    // Edge grooves
    ctx.fillStyle = '#162028';
    ctx.fillRect(x + 2*u, y, u, ts);
    ctx.fillRect(x + ts - 3*u, y, u, ts);
  }

  function drawServerRack(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Rack body
    ctx.fillStyle = '#152025';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Frame
    ctx.fillStyle = '#1a2830';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);

    // Blinking LEDs (3 rows of lights, each on its own cycle)
    var seed = col * 13 + row * 29;
    for (var i = 0; i < 3; i++) {
      var ledY = y + (3 + i * 4) * u;
      for (var j = 0; j < 4; j++) {
        var ledX = x + (3 + j * 3) * u;
        var phase = Math.floor(time / 300) + seed + i * 7 + j * 11;
        var on = (phase % 5) !== 0;
        if (on) {
          var colors = ['#40c080', '#40c080', '#c06040', '#40a0c0'];
          ctx.fillStyle = colors[(i + j + seed) % 4];
        } else {
          ctx.fillStyle = '#1a2530';
        }
        ctx.fillRect(ledX, ledY, u, u);
      }
    }

    // Vent slots at bottom
    ctx.fillStyle = '#0e1820';
    ctx.fillRect(x + 3*u, y + ts - 3*u, ts - 6*u, u);
    ctx.fillRect(x + 3*u, y + ts - 5*u, ts - 6*u, u);
  }

  function drawTerminal(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Wall base
    drawMetalWall(ctx, x, y, ts);

    // Terminal screen on wall face
    var pulse = 0.7 + Math.sin(time / 500 + col * 5) * 0.3;
    ctx.fillStyle = '#0a1520';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.35), ts - 4*u, Math.floor(ts * 0.4));
    // Screen content (cyan)
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#40c8d8';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.38), ts - 6*u, Math.floor(ts * 0.34));
    // Scan line
    var scanY = ((time / 50 + col * 30) % (ts * 0.34));
    ctx.fillStyle = 'rgba(100, 220, 240, 0.3)';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.38) + scanY, ts - 6*u, u);
    ctx.globalAlpha = 1;
    // Text lines
    ctx.fillStyle = '#0a2030';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.45), ts - 8*u, u);
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.55), ts - 10*u, u);
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.62), ts - 8*u, u);
  }

  function drawViewport(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Wall base
    drawMetalWall(ctx, x, y, ts);

    // Viewport window on wall face
    ctx.fillStyle = '#050a15';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.3), ts - 6*u, Math.floor(ts * 0.5));

    // Stars through viewport
    ctx.fillStyle = '#ffffff';
    var seed = Math.floor(x / ts) * 17 + Math.floor(y / ts) * 31;
    for (var i = 0; i < 5; i++) {
      var sx = x + ((seed * (i + 1) * 7) % (ts - 8*u)) + 4*u;
      var sy = y + Math.floor(ts * 0.32) + ((seed * (i + 1) * 13) % Math.floor(ts * 0.44));
      var twinkle = Math.sin(time / 800 + i * 2.5) * 0.3 + 0.7;
      ctx.globalAlpha = twinkle * 0.6;
      ctx.fillRect(sx, sy, u, u);
    }
    ctx.globalAlpha = 1;

    // Crack line
    ctx.fillStyle = '#1a3040';
    ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.35), u, Math.floor(ts * 0.15));
    ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.5), u, Math.floor(ts * 0.1));

    // Frame
    ctx.strokeStyle = '#253540';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3*u, y + Math.floor(ts * 0.3), ts - 6*u, Math.floor(ts * 0.5));
  }

  function drawBlastDoor(ctx, x, y, ts) {
    var u = ts / 16;
    // Floor base
    drawCorridorFloor(ctx, x, y, ts);
    // Door frame marks
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(x, y, ts, u);
    ctx.fillRect(x, y + ts - u, ts, u);
    // Hazard stripe
    ctx.fillStyle = '#403020';
    ctx.fillRect(x + 4*u, y, 2*u, u);
    ctx.fillRect(x + 10*u, y, 2*u, u);
  }

  function drawAntenna(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Floor base
    drawCorridorFloor(ctx, x, y, ts);

    // Antenna base
    ctx.fillStyle = '#253540';
    ctx.fillRect(x + 6*u, y + 10*u, 4*u, 5*u);
    // Pole
    ctx.fillStyle = '#2a3a48';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, 8*u);
    // Dish
    ctx.fillStyle = '#354550';
    ctx.fillRect(x + 4*u, y + u, 8*u, 3*u);
    ctx.fillStyle = '#2a3a48';
    ctx.fillRect(x + 5*u, y + 2*u, 6*u, u);

    // Blinking light on top
    var blink = Math.sin(time / 400) > 0.3;
    ctx.fillStyle = blink ? '#40c8d8' : '#1a3040';
    ctx.fillRect(x + 7*u, y + u, 2*u, u);
  }

  function drawWallPanel(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0;
    var u = ts / 16;

    // Wall base
    drawMetalWall(ctx, x, y, ts);

    // Panel indicator light
    var phase = Math.floor(time / 600) + col * 7;
    var on = (phase % 4) !== 0;
    ctx.fillStyle = on ? '#40c080' : '#152520';
    ctx.fillRect(x + 7*u, y + Math.floor(ts * 0.4), 2*u, 2*u);

    // Panel border
    ctx.fillStyle = '#253540';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.35), ts - 8*u, 1);
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.65), ts - 8*u, 1);
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

  function drawStationBackground(ctx, w, h, time) {
    if (!bgInited) {
      bgInited = true;
      for (var i = 0; i < 60; i++) {
        bgStars.push({
          x: Math.random(), y: Math.random(),
          size: Math.random() + 0.5,
          brightness: Math.random() * 0.3 + 0.1,
          speed: Math.random() * 0.3 + 0.8
        });
      }
    }

    // Dark deep-space background
    ctx.fillStyle = '#030810';
    ctx.fillRect(0, 0, w, h);

    // Subtle teal nebula
    var neb = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
    neb.addColorStop(0, 'rgba(30, 80, 90, 0.06)');
    neb.addColorStop(1, 'transparent');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);

    // Static stars (gentle twinkle)
    for (var i = 0; i < bgStars.length; i++) {
      var s = bgStars[i];
      var twinkle = Math.sin(time / (800 * s.speed) + i * 1.7) * 0.15 + s.brightness;
      ctx.fillStyle = 'rgba(180, 220, 240, ' + twinkle.toFixed(2) + ')';
      ctx.fillRect(s.x * w, s.y * h, s.size, s.size);
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

})();
