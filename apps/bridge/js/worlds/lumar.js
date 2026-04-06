/**
 * Lumar World Module — Mysterious emerald spore sea.
 *
 * Inspired by Brandon Sanderson's Tress of the Emerald Sea.
 * Saltstone island with wooden docks extending into a shimmering
 * emerald spore sea. Moonlit atmosphere, silver accents.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Tile Draw Functions ----

  function drawSaltstoneWall(ctx, x, y, ts) {
    var u = ts / 16;
    // Dark cap
    ctx.fillStyle = '#141818';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.3));
    // Front face — dark saltstone
    ctx.fillStyle = '#1a1e20';
    ctx.fillRect(x, y + Math.floor(ts * 0.3), ts, ts - Math.floor(ts * 0.3));
    // Salt crystal veins (white flecks)
    ctx.fillStyle = '#404848';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.4), 2*u, u);
    ctx.fillRect(x + 9*u, y + Math.floor(ts * 0.6), 3*u, u);
    ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.75), u, u);
    // Silver trim at top
    ctx.fillStyle = '#607070';
    ctx.fillRect(x, y + Math.floor(ts * 0.28), ts, u);
  }

  function drawSaltstoneFloor(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#252a28';
    ctx.fillRect(x, y, ts, ts);
    // Stone texture
    ctx.fillStyle = '#2a302e';
    ctx.fillRect(x + 2*u, y + 2*u, 5*u, 4*u);
    ctx.fillRect(x + 9*u, y + 8*u, 4*u, 5*u);
    // Cracks
    ctx.fillStyle = '#1e2220';
    ctx.fillRect(x + 7*u, y + 3*u, u, 6*u);
    ctx.fillRect(x + 7*u, y + 8*u, 4*u, u);
  }

  function drawDockPlanks(ctx, x, y, ts) {
    var u = ts / 16;
    // Wood base
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(x, y, ts, ts);
    // Plank lines (horizontal)
    ctx.fillStyle = '#2e2618';
    ctx.fillRect(x, y + 3*u, ts, u);
    ctx.fillRect(x, y + 7*u, ts, u);
    ctx.fillRect(x, y + 11*u, ts, u);
    ctx.fillRect(x, y + 15*u, ts, u);
    // Wood grain highlight
    ctx.fillStyle = '#443828';
    ctx.fillRect(x + 2*u, y + u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 5*u, 5*u, u);
    ctx.fillRect(x + 3*u, y + 9*u, 3*u, u);
    ctx.fillRect(x + 10*u, y + 13*u, 4*u, u);
    // Nail dots
    ctx.fillStyle = '#555';
    ctx.fillRect(x + u, y + 2*u, u, u);
    ctx.fillRect(x + ts - 2*u, y + 6*u, u, u);
    ctx.fillRect(x + u, y + 10*u, u, u);
    ctx.fillRect(x + ts - 2*u, y + 14*u, u, u);
  }

  function drawSporeSea(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Emerald base — animated shimmer
    var phase = time / 1200 + col * 0.7 + row * 0.5;
    var shimmer = 0.9 + Math.sin(phase) * 0.1;

    ctx.fillStyle = '#1a4030';
    ctx.fillRect(x, y, ts, ts);

    // Spore waves — lighter patches that move
    var wavePhase = time / 800 + col * 1.3 + row * 0.9;
    var wave = Math.sin(wavePhase) * 0.5 + 0.5;

    ctx.globalAlpha = wave * 0.3;
    ctx.fillStyle = '#2a6048';
    ctx.fillRect(x + 2*u, y + Math.floor(wave * 4)*u, ts - 4*u, 4*u);
    ctx.globalAlpha = 1;

    // Spore particles (tiny bright green dots)
    ctx.fillStyle = '#40a068';
    var seed = col * 17 + row * 31;
    var p1x = ((seed * 7 + Math.floor(time / 300)) % 14) + 1;
    var p1y = ((seed * 13 + Math.floor(time / 400)) % 12) + 2;
    var p2x = ((seed * 11 + Math.floor(time / 350)) % 12) + 2;
    var p2y = ((seed * 23 + Math.floor(time / 500)) % 10) + 3;
    ctx.globalAlpha = shimmer * 0.5;
    ctx.fillRect(x + p1x*u, y + p1y*u, u, u);
    ctx.fillRect(x + p2x*u, y + p2y*u, u, u);
    ctx.globalAlpha = 1;
  }

  function drawShore(ctx, x, y, ts) {
    var u = ts / 16;
    // Half saltstone, half spore transition
    ctx.fillStyle = '#252a28';
    ctx.fillRect(x, y, ts, ts);
    // Spore creep at edges
    ctx.fillStyle = '#1e3828';
    ctx.fillRect(x, y + ts - 3*u, ts, 3*u);
    // Salt crystals at shore edge
    ctx.fillStyle = '#404848';
    ctx.fillRect(x + 3*u, y + ts - 2*u, 2*u, u);
    ctx.fillRect(x + 8*u, y + ts - u, 3*u, u);
    ctx.fillRect(x + 13*u, y + ts - 2*u, u, u);
  }

  function drawSilverPost(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Spore sea base
    drawSporeSea(ctx, x, y, ts, time);

    // Silver dock post
    ctx.fillStyle = '#505858';
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, 12*u);
    // Silver cap (brighter)
    var gleam = 0.7 + Math.sin(time / 2000 + x) * 0.3;
    ctx.fillStyle = '#808888';
    ctx.globalAlpha = gleam;
    ctx.fillRect(x + 5*u, y + u, 6*u, 2*u);
    ctx.globalAlpha = 1;
    // Base
    ctx.fillStyle = '#404040';
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, 2*u);
  }

  function drawSporeShore(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Spore sea base
    drawSporeSea(ctx, x, y, ts, time, col, row);

    // Shore stone peeking through
    ctx.fillStyle = '#252a28';
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = '#1e3828';
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, 2*u);
  }

  function drawBuilding(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0;
    var u = ts / 16;

    // Wall base
    drawSaltstoneWall(ctx, x, y, ts);

    // Window
    ctx.fillStyle = '#0a1510';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.35), ts - 8*u, Math.floor(ts * 0.35));

    // Warm interior glow through window
    var flicker = 0.5 + Math.sin(time / 1500 + col * 5) * 0.2;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#805830';
    ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.38), ts - 10*u, Math.floor(ts * 0.28));
    ctx.globalAlpha = 1;

    // Window frame (silver)
    ctx.strokeStyle = '#506060';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4*u, y + Math.floor(ts * 0.35), ts - 8*u, Math.floor(ts * 0.35));
    // Window cross
    ctx.fillStyle = '#506060';
    ctx.fillRect(x + Math.floor(ts * 0.5) - 1, y + Math.floor(ts * 0.35), 1, Math.floor(ts * 0.35));
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.5), ts - 8*u, 1);
  }

  function drawLantern(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Wall base
    drawSaltstoneWall(ctx, x, y, ts);

    // Lantern bracket
    ctx.fillStyle = '#404040';
    ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.35), u, 4*u);
    ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.35), 4*u, u);

    // Lantern body
    ctx.fillStyle = '#302820';
    ctx.fillRect(x + 8*u, y + Math.floor(ts * 0.38), 3*u, 4*u);

    // Warm flame glow
    var flicker = 0.6 + Math.sin(time / 300 + x) * 0.3 + Math.sin(time / 170) * 0.1;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#c0a050';
    ctx.fillRect(x + 9*u, y + Math.floor(ts * 0.4), u, 2*u);
    ctx.globalAlpha = 1;
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
    ctx.fillStyle = '#0e2018';
    ctx.fillRect(x, y, ts, ts);
    if (col === 2 && row === 2 && shipCanvas) {
      var areaW = ts * 2;
      var areaH = ts * 2;
      var aspect = shipCanvas.width / shipCanvas.height;
      var shipW, shipH;
      if (aspect > 1) {
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
    ctx.fillStyle = '#0e2018';
    ctx.fillRect(x, y, ts, ts);
  }

  // ---- Custom Background ----

  var bgStars = [];
  var bgInited = false;

  function drawLumarBackground(ctx, w, h, time) {
    if (!bgInited) {
      bgInited = true;
      for (var i = 0; i < 40; i++) {
        bgStars.push({
          x: Math.random(), y: Math.random() * 0.5,
          size: Math.random() + 0.5,
          brightness: Math.random() * 0.2 + 0.05
        });
      }
    }

    // Dark night sky with green tint
    ctx.fillStyle = '#060e0a';
    ctx.fillRect(0, 0, w, h);

    // Green moon glow (large, low on horizon — oppressively close)
    var moonX = w * 0.7;
    var moonY = h * 0.15;
    var moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, w * 0.4);
    moonGlow.addColorStop(0, 'rgba(60, 140, 80, 0.12)');
    moonGlow.addColorStop(0.3, 'rgba(40, 100, 60, 0.06)');
    moonGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(0, 0, w, h);

    // Moon disc
    var moonR = w * 0.06;
    var pulse = 0.85 + Math.sin(time / 3000) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#3a8050';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#50a068';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Stars (dim, only in upper sky)
    for (var i = 0; i < bgStars.length; i++) {
      var s = bgStars[i];
      var twinkle = Math.sin(time / 1200 + i * 2.3) * 0.1 + s.brightness;
      ctx.fillStyle = 'rgba(180, 220, 200, ' + twinkle.toFixed(2) + ')';
      ctx.fillRect(s.x * w, s.y * h, s.size, s.size);
    }

    // Emerald sea haze at bottom
    var haze = ctx.createLinearGradient(0, h * 0.6, 0, h);
    haze.addColorStop(0, 'transparent');
    haze.addColorStop(1, 'rgba(30, 80, 50, 0.08)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- Register ----

  BridgeWorld.registerTileset('lumar', {
    1: drawSaltstoneWall,
    2: drawSaltstoneFloor,
    3: drawDockPlanks,
    4: drawSporeSea,
    5: drawShore,
    6: drawSilverPost,
    7: drawSporeShore,
    8: drawBuilding,
    9: drawLantern,
    10: drawShipBody,
    11: drawShipCockpit
  });

  BridgeWorld.registerBackground('lumar', drawLumarBackground);

})();
