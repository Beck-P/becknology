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

  function drawSaltstoneWall(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 19 + row * 31) % 100;
    // Dark cap
    ctx.fillStyle = '#0e1212';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.3));
    // Cap top highlight
    ctx.fillStyle = '#3a4848';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.5));
    // Front face — dark saltstone with mortar joints
    ctx.fillStyle = '#1a1e20';
    ctx.fillRect(x, y + Math.floor(ts * 0.3), ts, ts - Math.floor(ts * 0.3));
    // Mortar joints (alternating brick course offset)
    var joint = '#0a0c0d';
    ctx.fillStyle = joint;
    ctx.fillRect(x, y + Math.floor(ts * 0.55), ts, Math.max(1, u * 0.4));
    ctx.fillRect(x, y + Math.floor(ts * 0.78), ts, Math.max(1, u * 0.4));
    var brickOff = (row % 2 === 0) ? 0 : Math.floor(ts * 0.5);
    ctx.fillRect(x + ((Math.floor(ts * 0.5) + brickOff) % ts), y + Math.floor(ts * 0.3), Math.max(1, u * 0.4), Math.floor(ts * 0.25));
    ctx.fillRect(x + ((Math.floor(ts * 0.25) + (1 - row % 2) * Math.floor(ts * 0.5)) % ts), y + Math.floor(ts * 0.55), Math.max(1, u * 0.4), Math.floor(ts * 0.23));
    // Salt crystal veins — animated subtle sparkle
    var sparkle = (Math.sin(time / 1500 + col + row * 0.5) + 1) * 0.5;
    ctx.fillStyle = 'rgba(180, 200, 200, ' + (0.25 + sparkle * 0.3).toFixed(2) + ')';
    if (seed < 60) ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.4), 2*u, Math.max(1, u * 0.7));
    if (seed > 30) ctx.fillRect(x + 9*u, y + Math.floor(ts * 0.6), 3*u, Math.max(1, u * 0.7));
    if (seed % 17 === 0) ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.75), u, u);
    if (seed % 11 === 0) ctx.fillRect(x + 12*u, y + Math.floor(ts * 0.85), 2*u, Math.max(1, u * 0.5));
    // Silver trim at top
    ctx.fillStyle = '#5a6868';
    ctx.fillRect(x, y + Math.floor(ts * 0.28), ts, Math.max(1, u));
    ctx.fillStyle = '#80908c';
    ctx.fillRect(x, y + Math.floor(ts * 0.28), ts, Math.max(1, u * 0.4));
  }

  function drawSaltstoneFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    ctx.fillStyle = '#252a28';
    ctx.fillRect(x, y, ts, ts);
    // Stone texture — bigger, varied per tile
    ctx.fillStyle = '#2e3432';
    ctx.fillRect(x + 2*u, y + 2*u, 5*u, 4*u);
    ctx.fillRect(x + 9*u, y + 8*u, 4*u, 5*u);
    // Subtle highlight on stone
    ctx.fillStyle = '#363c38';
    ctx.fillRect(x + 2*u, y + 2*u, 5*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + 9*u, y + 8*u, 4*u, Math.max(1, u * 0.5));
    // Cracks
    ctx.fillStyle = '#161a18';
    ctx.fillRect(x + 7*u, y + 3*u, u, 6*u);
    ctx.fillRect(x + 7*u, y + 8*u, 4*u, u);
    // Salt-crystal speckle (deterministic)
    if (seed < 30) {
      ctx.fillStyle = 'rgba(220,230,225,0.18)';
      ctx.fillRect(x + 3*u, y + 12*u, u, u);
    }
    if (seed > 70) {
      ctx.fillStyle = 'rgba(220,230,225,0.14)';
      ctx.fillRect(x + 11*u, y + 4*u, u, u);
    }
    // Faint moss/spore patch (rare)
    if (seed % 13 === 0) {
      ctx.fillStyle = 'rgba(60, 140, 80, 0.12)';
      ctx.fillRect(x + 13*u, y + 13*u, 3*u, 3*u);
    }
  }

  function drawDockPlanks(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Wood base — slightly varied per tile (some lighter, some darker)
    var hue = (col + row) % 2 === 0 ? '#3a3020' : '#352a1c';
    ctx.fillStyle = hue;
    ctx.fillRect(x, y, ts, ts);
    // Plank lines (heavier shadow)
    ctx.fillStyle = '#181208';
    ctx.fillRect(x, y + 3*u, ts, Math.max(1, u * 0.8));
    ctx.fillRect(x, y + 7*u, ts, Math.max(1, u * 0.8));
    ctx.fillRect(x, y + 11*u, ts, Math.max(1, u * 0.8));
    ctx.fillRect(x, y + 15*u, ts, Math.max(1, u * 0.8));
    // Plank top highlight
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(x, y + 4*u, ts, Math.max(1, u * 0.4));
    ctx.fillRect(x, y + 8*u, ts, Math.max(1, u * 0.4));
    ctx.fillRect(x, y + 12*u, ts, Math.max(1, u * 0.4));
    // Wood grain — randomized per tile
    var seed = col * 13 + row * 17;
    ctx.fillStyle = 'rgba(70, 50, 30, 0.5)';
    ctx.fillRect(x + (seed % 4) * u, y + u, 4*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + ((seed * 3) % 6) * u + 2*u, y + 5*u, 5*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + ((seed * 5) % 6) * u + u, y + 9*u, 3*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + ((seed * 7) % 6) * u + 3*u, y + 13*u, 4*u, Math.max(1, u * 0.5));
    // Knot
    if (seed % 7 === 0) {
      ctx.fillStyle = '#1a1006';
      ctx.fillRect(x + 4*u, y + 5*u, 2*u, 2*u);
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(x + 4*u, y + 5*u, u, u);
    }
    // Nail dots — slight rust tint
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(x + u, y + 2*u, u, u);
    ctx.fillRect(x + ts - 2*u, y + 6*u, u, u);
    ctx.fillRect(x + u, y + 10*u, u, u);
    ctx.fillRect(x + ts - 2*u, y + 14*u, u, u);
    // Highlight on each nail
    ctx.fillStyle = '#5a5050';
    ctx.fillRect(x + u, y + 2*u, u * 0.5, u * 0.5);
    ctx.fillRect(x + ts - 2*u, y + 6*u, u * 0.5, u * 0.5);
    ctx.fillRect(x + u, y + 10*u, u * 0.5, u * 0.5);
    ctx.fillRect(x + ts - 2*u, y + 14*u, u * 0.5, u * 0.5);
  }

  // Shared sea drawer — handles all 5 sea variants via color triplets.
  function drawSeaShared(ctx, x, y, ts, time, col, row, baseColor, midColor, hiColor, particleColor) {
    var u = ts / 16;
    // Base
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, ts, ts);
    // Smooth wave bands — render multiple thin horizontal lines with sin-shifted brightness.
    // The sine uses world-space position so adjacent tiles blend (no block boundaries).
    var bands = 8;
    for (var b = 0; b < bands; b++) {
      var bandPhase = (time / 600) + (row + b * 0.125) * 1.6 + col * 0.3;
      var bandAlpha = (Math.sin(bandPhase) * 0.5 + 0.5);
      ctx.globalAlpha = bandAlpha * 0.32;
      ctx.fillStyle = midColor;
      ctx.fillRect(x, y + b * 2*u, ts, 2*u);
    }
    ctx.globalAlpha = 1;
    // Foam crests — sparse highlights riding the waves
    for (var c = 0; c < 3; c++) {
      var cPhase = (time / 800) + col * 1.5 + row * 0.9 + c * 2;
      var cBright = Math.sin(cPhase);
      if (cBright > 0.5) {
        ctx.globalAlpha = (cBright - 0.5) * 1.4 * 0.4;
        ctx.fillStyle = hiColor;
        var cy = y + ((c * 5 + Math.floor((time / 200) % 10)) % 16) * u;
        ctx.fillRect(x + (c * 3 + 1) * u, cy, 4*u, Math.max(1, u * 0.6));
      }
    }
    ctx.globalAlpha = 1;
    // Drifting particles — accumulate position so they actually flow across tiles.
    var seed = col * 17 + row * 31;
    var nParticles = 3;
    for (var p = 0; p < nParticles; p++) {
      var pPhase = time / 4000 + p * 0.3;
      var px = ((seed * (p + 1) * 7 + Math.floor(pPhase * 14)) % 14) + 1;
      var py = (((seed * (p + 2) * 11) % 14) + Math.floor(time / 600 + p * 3)) % 14;
      var pAlpha = 0.5 + Math.sin(time / 500 + seed * 0.1 + p) * 0.4;
      ctx.globalAlpha = Math.max(0.1, pAlpha);
      ctx.fillStyle = particleColor;
      ctx.fillRect(x + px*u, y + py*u, u, u);
    }
    ctx.globalAlpha = 1;
  }

  function drawSporeSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#1a4030', '#2a7050', '#90e0a8', '#60d090');
  }

  function drawCrimsonSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#401a1a', '#702830', '#e09080', '#c04848');
  }

  function drawSapphireSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#1a2a40', '#284070', '#9ac0e8', '#5080c0');
  }

  function drawRoseSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#401a30', '#702850', '#e8a0c8', '#c050a0');
  }

  function drawMidnightSea(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSeaShared(ctx, x, y, ts, time, col, row,
      '#0a0a10', '#181828', '#7090c0', '#404868');
    // Iridescent shift over base — periodic violet/teal sheen
    var u = ts / 16;
    var iri = (Math.sin(time / 1500 + col * 0.3 + row * 0.5) + 1) * 0.5;
    var sheenR = Math.round(40 + iri * 60);
    var sheenG = Math.round(20 + iri * 30);
    var sheenB = Math.round(80 + iri * 80);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = 'rgb(' + sheenR + ',' + sheenG + ',' + sheenB + ')';
    ctx.fillRect(x, y, ts, ts);
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

  function drawSilverPost(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Spore sea base (animated)
    drawSporeSea(ctx, x, y, ts, time, col, row);

    // Reflection of post in water (below) — shimmery
    ctx.globalAlpha = 0.25 + Math.sin(time / 600 + col) * 0.1;
    ctx.fillStyle = '#c0d0d0';
    ctx.fillRect(x + 7*u, y + 11*u, 2*u, 4*u);
    ctx.globalAlpha = 1;

    // Silver dock post — shaft
    ctx.fillStyle = '#384040';
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, 12*u);
    // Edge highlight
    ctx.fillStyle = '#5a6868';
    ctx.fillRect(x + 6*u, y + 2*u, Math.max(1, u * 0.7), 12*u);
    // Vertical dark line for depth
    ctx.fillStyle = '#1e2424';
    ctx.fillRect(x + 9*u, y + 2*u, Math.max(1, u * 0.5), 12*u);
    // Silver cap (brighter, with gleam)
    var gleam = 0.7 + Math.sin(time / 2000 + col + row) * 0.3;
    ctx.fillStyle = '#a0b0ac';
    ctx.fillRect(x + 5*u, y + u, 6*u, 2*u);
    ctx.globalAlpha = gleam;
    ctx.fillStyle = '#e0e8e4';
    ctx.fillRect(x + 6*u, y + u, 2*u, Math.max(1, u * 0.8));
    ctx.globalAlpha = 1;
    // Rope ring at top
    ctx.fillStyle = '#5a4828';
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, Math.max(1, u * 0.5));
    // Base bracket
    ctx.fillStyle = '#202828';
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, 2*u);
    ctx.fillStyle = '#3a4848';
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, Math.max(1, u * 0.4));
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
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Wall base
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);

    // Window recess
    ctx.fillStyle = '#050a08';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.35), ts - 8*u, Math.floor(ts * 0.35));

    // Warm interior glow through window — flicker
    var flicker = 0.55 + Math.sin(time / 1200 + col * 5) * 0.2 + Math.sin(time / 280 + row) * 0.15;
    ctx.globalAlpha = Math.max(0.2, Math.min(1, flicker));
    ctx.fillStyle = '#c08840';
    ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.38), ts - 10*u, Math.floor(ts * 0.28));
    // Inner brighter core
    ctx.fillStyle = '#ffd070';
    ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.4), ts - 12*u, Math.floor(ts * 0.18));
    ctx.globalAlpha = 1;

    // Silhouette inside window — different per (col,row)
    var seed = (col * 11 + row * 17) % 4;
    ctx.fillStyle = 'rgba(20,10,5,0.6)';
    if (seed === 0) {
      // Person sitting at table
      ctx.fillRect(x + 7*u, y + Math.floor(ts * 0.42), 2*u, 2*u);  // head
      ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.5), 4*u, 2*u);   // body
    } else if (seed === 1) {
      // Hanging plant
      ctx.fillRect(x + 8*u, y + Math.floor(ts * 0.38), 2*u, 4*u);
      ctx.fillRect(x + 7*u, y + Math.floor(ts * 0.44), 4*u, u);
    } else if (seed === 2) {
      // Bookshelf
      ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.4), 6*u, Math.max(1, u * 0.8));
      ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.5), 6*u, Math.max(1, u * 0.8));
      ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.58), 6*u, Math.max(1, u * 0.8));
    }
    // (seed === 3 leaves window empty for variety)

    // Window frame (silver) — proper rectangle
    ctx.fillStyle = '#506060';
    var fw = ts - 8*u;
    var fh = Math.floor(ts * 0.35);
    var fx = x + 4*u, fy = y + Math.floor(ts * 0.35);
    var fW = Math.max(1, u * 0.5);
    ctx.fillRect(fx, fy, fw, fW);            // top
    ctx.fillRect(fx, fy + fh - fW, fw, fW);  // bottom
    ctx.fillRect(fx, fy, fW, fh);            // left
    ctx.fillRect(fx + fw - fW, fy, fW, fh);  // right
    // Window cross
    ctx.fillRect(fx + fw/2 - fW/2, fy, fW, fh);
    ctx.fillRect(fx, fy + fh/2 - fW/2, fw, fW);
    // Sill (small ledge)
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(fx - u, fy + fh, fw + 2*u, Math.max(1, u * 0.6));
  }

  function drawLantern(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;

    // Wall base
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);

    // Lantern bracket — L-shaped, darker
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.35), u, 5*u);
    ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.35), 5*u, u);
    // Bracket bolt
    ctx.fillStyle = '#404848';
    ctx.fillRect(x + 6*u, y + Math.floor(ts * 0.35), u * 0.7, u * 0.7);

    // Lantern body — metal cage with bottom drip
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x + 8*u, y + Math.floor(ts * 0.36), 4*u, 5*u);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(x + 8*u, y + Math.floor(ts * 0.36), 4*u, Math.max(1, u * 0.6));
    ctx.fillRect(x + 8*u, y + Math.floor(ts * 0.36) + 4*u, 4*u, Math.max(1, u * 0.6));
    // Vertical cage bars
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(x + 8*u, y + Math.floor(ts * 0.36), Math.max(1, u * 0.5), 5*u);
    ctx.fillRect(x + 12*u - Math.max(1, u*0.5), y + Math.floor(ts * 0.36), Math.max(1, u * 0.5), 5*u);
    ctx.fillRect(x + 10*u, y + Math.floor(ts * 0.36), Math.max(1, u * 0.4), 5*u);

    // Flame — flickers vertically
    var flicker = 0.6 + Math.sin(time / 200 + col * 1.7) * 0.3 + Math.sin(time / 130 + row) * 0.1;
    var flameH = (2 + Math.sin(time / 250 + col) * 0.3) * u;
    ctx.globalAlpha = Math.min(1, flicker);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 9.5*u, y + Math.floor(ts * 0.4), u, flameH);
    ctx.fillStyle = '#ffa040';
    ctx.fillRect(x + 9*u, y + Math.floor(ts * 0.42), 2*u, u);

    // Big warm halo
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35 * flicker;
    var grad = ctx.createRadialGradient(x + 10*u, y + Math.floor(ts * 0.45), 0, x + 10*u, y + Math.floor(ts * 0.45), 10*u);
    grad.addColorStop(0, 'rgba(255, 200, 80, 0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 5*u, y - 2*u, ts + 10*u, ts + 4*u);
    ctx.globalCompositeOperation = 'source-over';
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
  var bgId = null;

  function drawLumarBackground(ctx, w, h, time) {
    var worldData = BridgeWorld.getWorld();

    // Pick the sea drawer for this zone — anywhere the camera shows past
    // the map edge gets tiled with actual animated sea, so the world feels
    // like it extends infinitely.
    var zoneName = worldData && worldData.name;
    var seaDrawer = drawSporeSea;
    if (zoneName === 'Crimson Reach') seaDrawer = drawCrimsonSea;
    else if (zoneName === 'Sapphire Port') seaDrawer = drawSapphireSea;
    else if (zoneName === 'Rose Cove') seaDrawer = drawRoseSea;
    else if (zoneName === 'Midnight Isle') seaDrawer = drawMidnightSea;

    // Use the engine's camera + scale so off-map sea tiles align with the
    // in-map sea tiles seeded by the same (col, row).
    var camera = BridgeWorld.getCamera();
    var ts = BridgeWorld.getTileSize() * BridgeWorld.getScale();
    var offX = w / 2 - camera.x * ts;
    var offY = h / 2 - camera.y * ts;

    var startCol = Math.floor(-offX / ts) - 1;
    var endCol = Math.ceil((w - offX) / ts) + 1;
    var startRow = Math.floor(-offY / ts) - 1;
    var endRow = Math.ceil((h - offY) / ts) + 1;

    for (var r = startRow; r < endRow; r++) {
      for (var c = startCol; c < endCol; c++) {
        var tx = Math.floor(offX + c * ts);
        var ty = Math.floor(offY + r * ts);
        seaDrawer(ctx, tx, ty, ts, time, c, r);
      }
    }
  }

  // ---- Register ----

  // ---- Guard NPC ----

  function drawGuard(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;

    // Dock planks base
    drawDockPlanks(ctx, x, y, ts);

    // Guard character — dark uniform, standing facing up (toward player)
    var bob = Math.sin(time / 800) > 0.85 ? -u : 0;
    // Head
    ctx.fillStyle = '#506060';
    ctx.fillRect(x + 4*u, y + (u)+bob, 8*u, 5*u);
    // Helmet/cap
    ctx.fillStyle = '#384848';
    ctx.fillRect(x + 3*u, y + (u)+bob, 10*u, 2*u);
    // Eyes (facing up — back of head visible, no eyes)
    ctx.fillStyle = '#2a3838';
    ctx.fillRect(x + 4*u, y + (u)+bob, 8*u, 2*u);
    // Body — dark uniform
    ctx.fillStyle = '#384848';
    ctx.fillRect(x + 3*u, y + (6*u)+bob, 10*u, 5*u);
    // Belt with silver buckle
    ctx.fillStyle = '#808888';
    ctx.fillRect(x + 6*u, y + (9*u)+bob, 4*u, u);
    // Legs
    ctx.fillStyle = '#2a3838';
    ctx.fillRect(x + 4*u, y + (11*u)+bob, 3*u, 4*u);
    ctx.fillRect(x + 9*u, y + (11*u)+bob, 3*u, 4*u);
    // Boots
    ctx.fillStyle = '#1a1e20';
    ctx.fillRect(x + 3*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 9*u, y + 14*u, 4*u, u);
  }

  // ---- New Tile Draw Functions ----

  function drawLighthouse(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Wall base
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    // Tower body — narrowing upward, brick courses
    ctx.fillStyle = '#262c2c';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.15), 8*u, Math.floor(ts * 0.55));
    ctx.fillStyle = '#303838';
    ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.1), 6*u, Math.floor(ts * 0.2));
    // Tower brick lines
    ctx.fillStyle = '#181c1c';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.3), 8*u, Math.max(1, u * 0.4));
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.5), 8*u, Math.max(1, u * 0.4));
    // Tower cap (railing)
    ctx.fillStyle = '#0e1212';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.08), 8*u, 2*u);
    ctx.fillStyle = '#3a4848';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.08), 8*u, Math.max(1, u * 0.4));
    // Light housing
    ctx.fillStyle = '#3a4040';
    ctx.fillRect(x + 5*u, y + u, 6*u, 3*u);
    // Sweeping beam (pseudo-rotating: width oscillates with sin)
    var sweep = Math.sin(time / 1500);
    var beamLeft = -8*u + sweep * 4*u;
    var beamRight = 8*u + sweep * 4*u;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff0a0';
    ctx.beginPath();
    ctx.moveTo(x + 8*u, y + 2*u);
    ctx.lineTo(x + 8*u + beamLeft, y - 12*u);
    ctx.lineTo(x + 8*u + beamRight, y - 12*u);
    ctx.closePath();
    ctx.fill();
    // Beam centerline (brighter)
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.moveTo(x + 8*u, y + 2*u);
    ctx.lineTo(x + 8*u + sweep * 4*u - 2*u, y - 12*u);
    ctx.lineTo(x + 8*u + sweep * 4*u + 2*u, y - 12*u);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Pulsing warm bulb
    var pulse = 0.7 + Math.sin(time / 500) * 0.2 + Math.sin(time / 230) * 0.1;
    ctx.globalAlpha = Math.min(1, pulse);
    ctx.fillStyle = '#ffe480';
    ctx.fillRect(x + 6*u, y + u, 4*u, 2*u);
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(x + 7*u, y + u, 2*u, u);
    // Bulb halo
    ctx.globalAlpha = pulse * 0.5;
    var grad = ctx.createRadialGradient(x + 8*u, y + 2*u, 0, x + 8*u, y + 2*u, 5*u);
    grad.addColorStop(0, 'rgba(255,228,128,0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y - 3*u, ts, 8*u);
    ctx.globalAlpha = 1;
  }

  function drawCrate(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Floor base
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    // Floor shadow under crate
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2*u, y + 13*u, 12*u, 2*u);
    // Wooden crate body
    ctx.fillStyle = '#4a3820';
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 10*u);
    // Top edge highlight
    ctx.fillStyle = '#5e4a30';
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, Math.max(1, u * 0.5));
    // Right-side shadow (depth)
    ctx.fillStyle = '#2a2010';
    ctx.fillRect(x + 12*u, y + 4*u, u, 9*u);
    ctx.fillRect(x + 3*u, y + 12*u, 10*u, u);
    // Plank lines (horizontal grooves)
    ctx.fillStyle = '#251608';
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, Math.max(1, u * 0.6));
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, Math.max(1, u * 0.6));
    // Cross brace (X across top half)
    ctx.fillStyle = '#5a4828';
    ctx.fillRect(x + 7*u, y + 3*u, Math.max(1, u * 0.7), 10*u);
    ctx.fillStyle = '#3a2c16';
    ctx.fillRect(x + 8*u, y + 3*u, Math.max(1, u * 0.4), 10*u);
    // Iron corners
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 3*u, y + 3*u, 2*u, Math.max(1, u * 0.6));
    ctx.fillRect(x + 11*u, y + 3*u, 2*u, Math.max(1, u * 0.6));
    ctx.fillRect(x + 3*u, y + 12*u, 2*u, Math.max(1, u * 0.6));
    ctx.fillRect(x + 11*u, y + 12*u, 2*u, Math.max(1, u * 0.6));
    // Stamped marking variation per crate
    var seed = (col * 7 + row * 11) % 3;
    ctx.fillStyle = 'rgba(30,20,10,0.7)';
    if (seed === 0) {
      // Triangle stamp
      ctx.fillRect(x + 9*u, y + 7*u, Math.max(1, u * 0.6), Math.max(1, u * 0.6));
      ctx.fillRect(x + 8.5*u, y + 7.5*u, Math.max(1, u * 1.5), Math.max(1, u * 0.6));
    } else if (seed === 1) {
      // Circle stamp
      ctx.beginPath();
      ctx.arc(x + 9.5*u, y + 7.5*u, u * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // X stamp
      ctx.fillRect(x + 9*u, y + 7*u, Math.max(1, u * 1.4), Math.max(1, u * 0.4));
      ctx.fillRect(x + 9.3*u, y + 6.7*u, Math.max(1, u * 0.4), Math.max(1, u * 1.4));
    }
  }

  function drawSaltCrystal(ctx, x, y, ts) {
    var u = ts / 16;
    // Shore base
    drawShore(ctx, x, y, ts);
    // Crystal formations — angular shapes pointing upward
    ctx.globalAlpha = 0.8;
    // Large crystal
    ctx.fillStyle = '#c0c8c4';
    ctx.beginPath();
    ctx.moveTo(x + 6*u, y + 2*u);
    ctx.lineTo(x + 9*u, y + 10*u);
    ctx.lineTo(x + 3*u, y + 10*u);
    ctx.closePath();
    ctx.fill();
    // Small crystal left
    ctx.fillStyle = '#d0d8d4';
    ctx.beginPath();
    ctx.moveTo(x + 3*u, y + 5*u);
    ctx.lineTo(x + 5*u, y + 10*u);
    ctx.lineTo(x + u, y + 10*u);
    ctx.closePath();
    ctx.fill();
    // Small crystal right
    ctx.fillStyle = '#b0b8b4';
    ctx.beginPath();
    ctx.moveTo(x + 11*u, y + 4*u);
    ctx.lineTo(x + 13*u, y + 10*u);
    ctx.lineTo(x + 9*u, y + 10*u);
    ctx.closePath();
    ctx.fill();
    // Highlight edges
    ctx.fillStyle = '#e0e8e4';
    ctx.fillRect(x + 6*u, y + 2*u, u, 3*u);
    ctx.fillRect(x + 11*u, y + 4*u, u, 2*u);
    ctx.globalAlpha = 1;
  }

  function drawSmallRock(ctx, x, y, ts) {
    var u = ts / 16;
    // Dark stone base
    ctx.fillStyle = '#1e1e1c';
    ctx.fillRect(x, y, ts, ts);
    // Irregular rock shape — highlight patches
    ctx.fillStyle = '#2a2a28';
    ctx.fillRect(x + 2*u, y + 3*u, 5*u, 4*u);
    ctx.fillRect(x + 8*u, y + 2*u, 6*u, 6*u);
    ctx.fillRect(x + 3*u, y + 8*u, 8*u, 5*u);
    ctx.fillRect(x + u, y + 7*u, 4*u, 3*u);
    // Shadow crevices
    ctx.fillStyle = '#141414';
    ctx.fillRect(x + 6*u, y + 4*u, u, 5*u);
    ctx.fillRect(x + 3*u, y + 7*u, 6*u, u);
    ctx.fillRect(x + 10*u, y + 8*u, u, 4*u);
    // Slight highlight on top
    ctx.fillStyle = '#323230';
    ctx.fillRect(x + 4*u, y + 2*u, 3*u, u);
    ctx.fillRect(x + 9*u, y + u, 4*u, u);
  }

  function drawCrystal(ctx, x, y, ts) {
    var u = ts / 16;
    // Rock base
    drawSmallRock(ctx, x, y, ts);
    // Purple/multi-colored crystal formations on top
    ctx.fillStyle = '#606058';
    ctx.beginPath();
    ctx.moveTo(x + 7*u, y + u);
    ctx.lineTo(x + 10*u, y + 8*u);
    ctx.lineTo(x + 4*u, y + 8*u);
    ctx.closePath();
    ctx.fill();
    // Highlight facet
    ctx.fillStyle = '#808078';
    ctx.beginPath();
    ctx.moveTo(x + 7*u, y + u);
    ctx.lineTo(x + 8*u, y + 5*u);
    ctx.lineTo(x + 5*u, y + 7*u);
    ctx.lineTo(x + 4*u, y + 8*u);
    ctx.closePath();
    ctx.fill();
    // Crystal tip highlight
    ctx.fillStyle = '#a0a098';
    ctx.fillRect(x + 7*u, y + u, u, 2*u);
    // Small secondary crystal
    ctx.fillStyle = '#706868';
    ctx.beginPath();
    ctx.moveTo(x + 11*u, y + 4*u);
    ctx.lineTo(x + 13*u, y + 9*u);
    ctx.lineTo(x + 9*u, y + 9*u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#908880';
    ctx.fillRect(x + 11*u, y + 4*u, u, u);
  }

  function drawMarketStall(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Floor base
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    // Awning shadow on floor
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x, y + 4*u, ts, 5*u);
    // Awning/roof — striped fabric
    ctx.fillStyle = '#4a4030';
    ctx.fillRect(x, y + u, ts, 3*u);
    // Awning stripes
    ctx.fillStyle = '#7a3030';
    var stripeW = ts / 5;
    for (var s = 0; s < 5; s += 2) {
      ctx.fillRect(x + s * stripeW, y + u, stripeW, 3*u);
    }
    // Awning scallop bottom edge
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(x, y + 4*u, ts, Math.max(1, u * 0.6));
    // Awning trim (top)
    ctx.fillStyle = '#5a5040';
    ctx.fillRect(x, y + u, ts, Math.max(1, u * 0.5));
    // Hanging tassels
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(x + 3*u, y + 4*u, Math.max(1, u * 0.5), 1.2*u);
    ctx.fillRect(x + 8*u, y + 4*u, Math.max(1, u * 0.5), 1.2*u);
    ctx.fillRect(x + 13*u, y + 4*u, Math.max(1, u * 0.5), 1.2*u);
    // Support posts
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(x + 2*u, y + 4*u, u, 5*u);
    ctx.fillRect(x + 13*u, y + 4*u, u, 5*u);
    ctx.fillStyle = '#5a4828';
    ctx.fillRect(x + 2*u, y + 4*u, Math.max(1, u * 0.4), 5*u);
    ctx.fillRect(x + 13*u, y + 4*u, Math.max(1, u * 0.4), 5*u);
    // Counter/table
    ctx.fillStyle = '#2e2618';
    ctx.fillRect(x + u, y + 9*u, 14*u, 4*u);
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(x + u, y + 9*u, 14*u, Math.max(1, u * 0.6));
    // Counter front shadow
    ctx.fillStyle = '#1e1610';
    ctx.fillRect(x + u, y + 12*u, 14*u, u);
    // Goods on counter — vary by tile seed
    var seed = (col * 11 + row * 13) % 4;
    if (seed === 0) {
      // Fish in baskets — green/gold colors
      ctx.fillStyle = '#506040';
      ctx.fillRect(x + 3*u, y + 7.5*u, 3*u, 1.5*u);
      ctx.fillStyle = '#7090a0';
      ctx.fillRect(x + 4*u, y + 7*u, 1.5*u, u);
      ctx.fillStyle = '#604040';
      ctx.fillRect(x + 7*u, y + 7.5*u, 3*u, 1.5*u);
      ctx.fillStyle = '#506060';
      ctx.fillRect(x + 11*u, y + 7.5*u, 3*u, 1.5*u);
    } else if (seed === 1) {
      // Crystals
      ctx.fillStyle = '#a0c0d0';
      ctx.beginPath();
      ctx.moveTo(x + 4*u, y + 6*u);
      ctx.lineTo(x + 5*u, y + 9*u);
      ctx.lineTo(x + 3*u, y + 9*u);
      ctx.fill();
      ctx.fillStyle = '#c0a0b0';
      ctx.beginPath();
      ctx.moveTo(x + 8*u, y + 5.5*u);
      ctx.lineTo(x + 9*u, y + 9*u);
      ctx.lineTo(x + 7*u, y + 9*u);
      ctx.fill();
      ctx.fillStyle = '#a0d0c0';
      ctx.beginPath();
      ctx.moveTo(x + 12*u, y + 6*u);
      ctx.lineTo(x + 13*u, y + 9*u);
      ctx.lineTo(x + 11*u, y + 9*u);
      ctx.fill();
    } else {
      // Sacks of spores/grain
      ctx.fillStyle = '#7a6840';
      ctx.fillRect(x + 3*u, y + 7*u, 3*u, 2*u);
      ctx.fillStyle = '#9a8050';
      ctx.fillRect(x + 3*u, y + 7*u, Math.max(1, u * 0.6), 2*u);
      ctx.fillStyle = '#7a6840';
      ctx.fillRect(x + 7*u, y + 6.5*u, 3*u, 2.5*u);
      ctx.fillStyle = '#9a8050';
      ctx.fillRect(x + 7*u, y + 6.5*u, Math.max(1, u * 0.6), 2.5*u);
      ctx.fillStyle = '#7a6840';
      ctx.fillRect(x + 11*u, y + 7*u, 3*u, 2*u);
    }
    // Sign on the awning — three small marks
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 6*u, y + 2.3*u, Math.max(1, u * 0.5), Math.max(1, u * 0.6));
    ctx.fillRect(x + 8*u, y + 2.3*u, Math.max(1, u * 0.5), Math.max(1, u * 0.6));
    ctx.fillRect(x + 10*u, y + 2.3*u, Math.max(1, u * 0.5), Math.max(1, u * 0.6));
  }

  function drawWantedPoster(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Wall base
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    // Poster — beige with weathering
    var pX = x + 3*u, pY = y + Math.floor(ts * 0.32), pW = 10*u, pH = 9*u;
    ctx.fillStyle = '#8a7a60';
    ctx.fillRect(pX, pY, pW, pH);
    // Aged stains
    ctx.fillStyle = 'rgba(50,30,10,0.2)';
    ctx.fillRect(pX + 6*u, pY + 2*u, 3*u, u);
    ctx.fillRect(pX + u, pY + 6*u, 2*u, u);
    // Poster shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(pX, pY + pH, pW, Math.max(1, u * 0.5));
    ctx.fillRect(pX + pW, pY, Math.max(1, u * 0.5), pH);
    // "WANTED" header strip
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(pX + u, pY + u, pW - 2*u, Math.max(1, u * 1.2));
    // Header micro-text dots
    ctx.fillStyle = '#8a7a60';
    for (var t = 0; t < 6; t++) {
      ctx.fillRect(pX + (1.5 + t * 1.3) * u, pY + 1.3*u, Math.max(1, u * 0.4), Math.max(1, u * 0.5));
    }
    // Silhouette portrait (different shape per poster)
    var seed = (col * 13 + row * 19) % 3;
    ctx.fillStyle = '#3a2818';
    if (seed === 0) {
      // Hooded figure
      ctx.fillRect(pX + 4*u, pY + 3*u, 2*u, 2*u);   // head
      ctx.fillRect(pX + 3*u, pY + 5*u, 4*u, 2*u);   // hood/shoulders
    } else if (seed === 1) {
      // Hat figure
      ctx.fillRect(pX + 3*u, pY + 3*u, 4*u, Math.max(1, u * 0.6));  // brim
      ctx.fillRect(pX + 4*u, pY + 3.5*u, 2*u, u);                   // crown
      ctx.fillRect(pX + 4*u, pY + 4.5*u, 2*u, u);                   // face
      ctx.fillRect(pX + 3*u, pY + 5.5*u, 4*u, 2*u);                 // body
    } else {
      // Generic person
      ctx.beginPath();
      ctx.arc(pX + 5*u, pY + 4*u, u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(pX + 3*u, pY + 5*u, 4*u, 2*u);
    }
    // Reward text lines
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(pX + 1.5*u, pY + 7.3*u, pW - 3*u, Math.max(1, u * 0.5));
    ctx.fillRect(pX + 2.5*u, pY + 8*u, pW - 5*u, Math.max(1, u * 0.5));
    // Tape corners
    ctx.fillStyle = 'rgba(220,210,180,0.5)';
    ctx.fillRect(pX, pY, 1.5*u, Math.max(1, u * 0.5));
    ctx.fillRect(pX + pW - 1.5*u, pY, 1.5*u, Math.max(1, u * 0.5));
  }

  function drawNpc(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Floor base
    drawSaltstoneFloor(ctx, x, y, ts);
    // Pick color based on position
    var colors = ['#607060', '#806050', '#506070'];
    var colorIdx = (col * 7 + row * 13) % colors.length;
    var bodyColor = colors[colorIdx];
    // Idle bob
    var bob = Math.sin(time / 800 + col * 3 + row * 5) > 0.85 ? -u : 0;
    // Head
    ctx.fillStyle = '#706858';
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 5*u);
    // Hair/hat
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 4*u, y + u + bob, 8*u, 2*u);
    // Face shadow (facing down)
    ctx.fillStyle = '#605848';
    ctx.fillRect(x + 5*u, y + 4*u + bob, 6*u, 2*u);
    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    // Belt
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(x + 4*u, y + 9*u + bob, 8*u, u);
    // Legs
    var legColor = '#2a2820';
    ctx.fillStyle = legColor;
    ctx.fillRect(x + 4*u, y + 11*u + bob, 3*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 3*u, 4*u);
    // Boots
    ctx.fillStyle = '#1a1a18';
    ctx.fillRect(x + 3*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 9*u, y + 14*u, 4*u, u);
  }

  // ---- Door / entrance tiles for buildings, towers, and caves ----

  // Wooden tavern door embedded in a saltstone wall — warm interior glow
  // leaks out, brass knob, iron hinges. Reads as "you can go in here."
  function drawTavernEntrance(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Saltstone wall context behind the door
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    // Stone arch frame
    ctx.fillStyle = '#0e1212';
    ctx.fillRect(x + Math.max(1, u), y + Math.max(1, u * 1.2), ts - 2*u, ts - Math.max(1, u * 1.5));
    // Wooden door panel
    var dx = x + 2*u, dy = y + 2*u;
    var dw = ts - 4*u, dh = ts - 3*u;
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(dx, dy, dw, dh);
    // Wood grain — vertical planks
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(dx + Math.floor(dw * 0.33), dy, Math.max(1, u * 0.5), dh);
    ctx.fillRect(dx + Math.floor(dw * 0.66), dy, Math.max(1, u * 0.5), dh);
    // Top highlight
    ctx.fillStyle = '#7a4e22';
    ctx.fillRect(dx, dy, dw, Math.max(1, u * 0.5));
    // Iron strap top + bottom
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(dx, dy + Math.max(1, u * 1.5), dw, Math.max(1, u * 0.7));
    ctx.fillRect(dx, dy + dh - Math.max(1, u * 2), dw, Math.max(1, u * 0.7));
    // Hinges
    ctx.fillRect(dx, dy + 2*u, Math.max(1, u * 1.2), Math.max(1, u * 0.8));
    ctx.fillRect(dx, dy + dh - 3*u, Math.max(1, u * 1.2), Math.max(1, u * 0.8));
    // Brass doorknob
    var knobX = dx + dw - 3*u;
    var knobY = dy + Math.floor(dh * 0.55);
    ctx.fillStyle = '#a08040';
    ctx.beginPath();
    ctx.arc(knobX + u*0.5, knobY + u*0.5, Math.max(1, u * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(knobX, knobY - Math.max(1, u * 0.2), Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    // Warm glow leaking from inside the tavern
    var pulse = 0.6 + Math.sin(time / 1100 + col + row) * 0.2;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 1.2);
    grad.addColorStop(0, 'rgba(255,180,90,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Hanging tavern sign above (small wood plaque)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + Math.floor(ts * 0.3), y + Math.max(1, u * 0.4), Math.floor(ts * 0.4), Math.max(1, u * 1.2));
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + Math.floor(ts * 0.45), y + Math.max(1, u * 0.6), Math.max(1, u * 0.5), Math.max(1, u * 0.8));
  }

  // Cave entrance — dark archway in a saltstone cliff with glowing red eyes
  // (lava reflection) inside the maw.
  function drawCaveEntranceWall(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    // Stone arch
    ctx.fillStyle = '#0a0408';
    ctx.beginPath();
    ctx.moveTo(x + 2*u, y + ts - u);
    ctx.lineTo(x + 2*u, y + 5*u);
    ctx.quadraticCurveTo(x + ts/2, y + Math.max(1, u * 0.8), x + ts - 2*u, y + 5*u);
    ctx.lineTo(x + ts - 2*u, y + ts - u);
    ctx.closePath();
    ctx.fill();
    // Inner darkness (slightly darker pit)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(x + 3*u, y + ts - 2*u);
    ctx.lineTo(x + 3*u, y + 6*u);
    ctx.quadraticCurveTo(x + ts/2, y + 2*u, x + ts - 3*u, y + 6*u);
    ctx.lineTo(x + ts - 3*u, y + ts - 2*u);
    ctx.closePath();
    ctx.fill();
    // Lava glow from deep inside
    var pulse = 0.5 + Math.sin(time / 700 + col) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts*0.7, 0, x + ts/2, y + ts*0.7, ts * 0.9);
    grad.addColorStop(0, 'rgba(255,80,30,0.85)');
    grad.addColorStop(0.5, 'rgba(180,40,20,0.4)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Stalactite hint at top of arch
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.moveTo(x + Math.floor(ts * 0.4), y + 4*u);
    ctx.lineTo(x + Math.floor(ts * 0.5), y + 6*u);
    ctx.lineTo(x + Math.floor(ts * 0.45), y + 4*u);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + Math.floor(ts * 0.6), y + 4*u);
    ctx.lineTo(x + Math.floor(ts * 0.55), y + 6*u);
    ctx.lineTo(x + Math.floor(ts * 0.65), y + 4*u);
    ctx.closePath();
    ctx.fill();
  }

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
    11: drawShipCockpit,
    12: drawGuard,
    13: drawCrimsonSea,
    14: drawSapphireSea,
    15: drawRoseSea,
    16: drawMidnightSea,
    18: drawLighthouse,
    19: drawCrate,
    20: drawSaltCrystal,
    21: drawSmallRock,
    22: drawCrystal,
    23: drawMarketStall,
    24: drawWantedPoster,
    25: drawNpc,
    26: drawTavernEntrance,
    27: drawCaveEntranceWall
  });

  BridgeWorld.registerBackground('lumar', drawLumarBackground);

})();
