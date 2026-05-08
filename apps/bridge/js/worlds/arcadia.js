/**
 * Arcadia World Module — Neon arcade planet.
 *
 * Tileset draw functions for Arcadia's tile types.
 * ¾ view with brick walls, arcade cabinets, neon signs.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Building sprite loader ----
  // Generic helper for multi-tile PNG buildings. Each sprite is anchored at
  // the bottom-center tile of its footprint and renders extending up and out.
  var spriteCache = {};

  function chunkify(src, chunkWidth) {
    var CW = chunkWidth || 96;
    var aspect = src.width / src.height;
    var CH = Math.round(CW / aspect);
    var c = document.createElement('canvas');
    c.width = CW;
    c.height = CH;
    var cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    cx.drawImage(src, 0, 0, CW, CH);
    return c;
  }

  // Edge flood-fill matte cleanup. DALL-E sometimes paints a non-white
  // background — for the cyberpunk PNGs it's typically a dark purple. The
  // whites-only cleanup below misses that. This pass:
  //   1. Samples a ring of edge pixels to learn the dominant matte color.
  //   2. BFS from every edge inward, flagging pixels whose color is similar
  //      to a learned matte color and whose alpha is opaque-ish.
  //   3. Stops the flood when it hits a pixel that's clearly part of the
  //      sprite (high saturation or far from any matte color), so internal
  //      dark pixels never get clipped.
  // Tolerance is conservative; stop conditions favor preserving sprite
  // pixels over removing matte. Anti-aliased edges get an alpha fade.
  function cleanMatteFlood(data, w, h) {
    var px = data.data;
    // Sample edge pixels to learn matte palette
    var samples = [];
    var step = Math.max(2, Math.floor(Math.min(w, h) / 64));
    for (var x = 0; x < w; x += step) {
      var iTop = (0 * w + x) * 4;
      var iBot = ((h - 1) * w + x) * 4;
      if (px[iTop + 3] > 80) samples.push([px[iTop], px[iTop + 1], px[iTop + 2]]);
      if (px[iBot + 3] > 80) samples.push([px[iBot], px[iBot + 1], px[iBot + 2]]);
    }
    for (var y = 0; y < h; y += step) {
      var iL = (y * w + 0) * 4;
      var iR = (y * w + (w - 1)) * 4;
      if (px[iL + 3] > 80) samples.push([px[iL], px[iL + 1], px[iL + 2]]);
      if (px[iR + 3] > 80) samples.push([px[iR], px[iR + 1], px[iR + 2]]);
    }
    if (samples.length < 8) return; // mostly transparent already; nothing to do

    // Cluster samples into up to 3 dominant colors. Cheap k-means lite —
    // initialize with first sample, then merge similar samples into clusters.
    var clusters = [];
    var clusterTol2 = 35 * 35;
    for (var s = 0; s < samples.length; s++) {
      var sample = samples[s];
      var matched = false;
      for (var c = 0; c < clusters.length; c++) {
        var cl = clusters[c];
        var dr = sample[0] - cl.r;
        var dg = sample[1] - cl.g;
        var db = sample[2] - cl.b;
        if (dr * dr + dg * dg + db * db < clusterTol2) {
          cl.r = (cl.r * cl.n + sample[0]) / (cl.n + 1);
          cl.g = (cl.g * cl.n + sample[1]) / (cl.n + 1);
          cl.b = (cl.b * cl.n + sample[2]) / (cl.n + 1);
          cl.n++;
          matched = true;
          break;
        }
      }
      if (!matched && clusters.length < 4) {
        clusters.push({ r: sample[0], g: sample[1], b: sample[2], n: 1 });
      }
    }
    // Keep clusters with at least 8% of samples — those are dominant matte tones.
    var minCount = Math.max(3, Math.floor(samples.length * 0.08));
    var matteColors = clusters.filter(function (c) { return c.n >= minCount; });
    if (matteColors.length === 0) return;

    // Tolerance for "this pixel is matte" — scaled by saturation of the matte.
    // Dark/desaturated mattes get a tighter tolerance to avoid eating dark
    // sprite pixels. Bright colored mattes (rare) get more leeway.
    var tol = 50;
    var tol2 = tol * tol;
    // Wider tolerance for partial-alpha fade
    var fadeTol2 = (tol + 25) * (tol + 25);

    function distToMatte2(r, g, b) {
      var best = Infinity;
      for (var k = 0; k < matteColors.length; k++) {
        var mc = matteColors[k];
        var dr = r - mc.r;
        var dg = g - mc.g;
        var db = b - mc.b;
        var d = dr * dr + dg * dg + db * db;
        if (d < best) best = d;
      }
      return best;
    }

    // BFS flood from every edge pixel. Use an Int32Array as a ring buffer.
    var visited = new Uint8Array(w * h);
    var qLen = w * h;
    var queue = new Int32Array(qLen * 2);
    var qHead = 0, qTail = 0;

    function enq(qx, qy) {
      if (qx < 0 || qx >= w || qy < 0 || qy >= h) return;
      var idx = qy * w + qx;
      if (visited[idx]) return;
      visited[idx] = 1;
      queue[qTail++] = qx;
      queue[qTail++] = qy;
    }
    for (var ex = 0; ex < w; ex++) { enq(ex, 0); enq(ex, h - 1); }
    for (var ey = 0; ey < h; ey++) { enq(0, ey); enq(w - 1, ey); }

    while (qHead < qTail) {
      var cx = queue[qHead++], cy = queue[qHead++];
      var i = (cy * w + cx) * 4;
      var a = px[i + 3];
      if (a === 0) {
        // Already transparent — propagate flood through it
        enq(cx + 1, cy); enq(cx - 1, cy); enq(cx, cy + 1); enq(cx, cy - 1);
        continue;
      }
      var d2 = distToMatte2(px[i], px[i + 1], px[i + 2]);
      if (d2 < tol2) {
        px[i + 3] = 0;
        enq(cx + 1, cy); enq(cx - 1, cy); enq(cx, cy + 1); enq(cx, cy - 1);
      } else if (d2 < fadeTol2) {
        // Anti-aliased fringe — fade alpha proportionally to distance from matte
        var t = (d2 - tol2) / (fadeTol2 - tol2); // 0 at matte edge → 1 at sprite
        var newA = Math.floor(a * t * 0.7);
        if (newA < a) px[i + 3] = newA;
        // Don't propagate through fringe pixels — sprite is just past them
      }
      // Otherwise: sprite pixel; flood stops here
    }
  }

  function loadBuildingSprite(key, path, chunkWidth) {
    if (spriteCache[key]) return spriteCache[key];
    var entry = { canvas: null, ready: false };
    spriteCache[key] = entry;
    var img = new Image();
    img.onload = function () {
      var src = document.createElement('canvas');
      src.width = img.width;
      src.height = img.height;
      var sCtx = src.getContext('2d');
      sCtx.drawImage(img, 0, 0);
      try {
        var data = sCtx.getImageData(0, 0, src.width, src.height);
        var px = data.data;
        // Pass 1: existing white/cream cleanup (for tavern/inn/lighthouse-style PNGs)
        for (var i = 0; i < px.length; i += 4) {
          var r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
          if (a === 0) continue;
          var maxC = Math.max(r, g, b);
          var minC = Math.min(r, g, b);
          var sat = maxC - minC;
          if (maxC > 230 && sat < 25) {
            px[i + 3] = 0;
            continue;
          }
          if (a < 230 && maxC > 200 && sat < 40) {
            px[i + 3] = 0;
            continue;
          }
          if (maxC > 215 && sat < 18 && (r + g + b) > 620) {
            px[i + 3] = 0;
          }
        }
        // Pass 2: edge flood-fill matte cleanup (catches purple/dark mattes
        // that the whites-only pass misses on the cyberpunk PNGs).
        cleanMatteFlood(data, src.width, src.height);
        sCtx.putImageData(data, 0, 0);
      } catch (e) { /* CORS — skip */ }

      entry.canvas = chunkify(src, chunkWidth || 96);
      entry.ready = true;
    };
    img.src = path;
    return entry;
  }

  loadBuildingSprite('arcade-sign', '/bridge/assets/buildings/arcade-sign.png', 112);
  loadBuildingSprite('arcadia-shop', '/bridge/assets/buildings/arcadia-shop.png', 104);
  loadBuildingSprite('neon-ramen-stand', '/bridge/assets/buildings/neon-ramen-stand.png', 92);
  loadBuildingSprite('holo-billboard-kiosk', '/bridge/assets/buildings/holo-billboard-kiosk.png', 84);
  loadBuildingSprite('token-kiosk', '/bridge/assets/buildings/token-kiosk.png', 78);
  loadBuildingSprite('hover-bike-dock', '/bridge/assets/buildings/hover-bike-dock.png', 78);
  loadBuildingSprite('arcade', '/bridge/assets/buildings/arcade.png', 112);
  loadBuildingSprite('cyber-noodle-bar', '/bridge/assets/buildings/cyber-noodle-bar.png', 96);
  loadBuildingSprite('tech-repair-shop', '/bridge/assets/buildings/tech-repair-shop.png', 96);
  loadBuildingSprite('chrome-clinic', '/bridge/assets/buildings/chrome-clinic.png', 100);
  loadBuildingSprite('junk-pawn-shop', '/bridge/assets/buildings/junk-pawn-shop.png', 96);

  function drawBuildingSprite(ctx, x, y, ts, key, tilesW, tilesH, anchorOffsetX) {
    var s = spriteCache[key];
    if (!s || !s.ready) return;
    var areaW = ts * tilesW;
    var areaH = ts * tilesH;
    var destX = x - anchorOffsetX * ts;
    var destY = y + ts - areaH;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.canvas, destX, destY, areaW, areaH);
  }

  function drawSpriteGlow(ctx, cx, cy, radius, color, alpha) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Pool of colored light cast onto the sidewalk under a PNG building —
  // sells the "this thing is glowing in a wet street" cyberpunk vibe.
  function drawGroundLight(ctx, cx, cy, radiusX, radiusY, color, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(radiusX, radiusY));
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.replace(/,\s*[\d.]+\s*\)$/, ',0.3)'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    // Ellipse-ish footprint via scale
    ctx.translate(cx, cy);
    ctx.scale(radiusX / Math.max(radiusX, radiusY), radiusY / Math.max(radiusX, radiusY));
    ctx.fillRect(-Math.max(radiusX, radiusY), -Math.max(radiusX, radiusY), Math.max(radiusX, radiusY) * 2, Math.max(radiusX, radiusY) * 2);
    ctx.restore();
  }

  function drawArcadeSignPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'arcade-sign', 5, 2, 2);
    var pulse = 0.65 + Math.sin((time || 0) / 600 + (col || 0)) * 0.18;
    // Brighter directional halo above the sign
    drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.6, ts * 3.5, 'rgba(232,80,200,0.85)', pulse * 0.42);
    // Wider secondary cyan rim
    drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.2, ts * 2.2, 'rgba(120,220,232,0.45)', pulse * 0.18);
    // Spillover light onto the wall directly below the sign
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 0.5, ts * 2.5, ts * 0.7, 'rgba(232,80,200,0.6)', 0.45 * pulse);
  }

  function drawArcadiaShopPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'arcadia-shop', 4, 3, 1);
    var pulse = 0.6 + Math.sin((time || 0) / 800 + (row || 0)) * 0.15;
    drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.9, ts * 1.8, 'rgba(232,80,200,0.55)', pulse * 0.18);
    // Pink sidewalk pool
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 1.2, ts * 2.8, ts * 1.0, 'rgba(232,80,200,0.55)', 0.32 * pulse);
  }

  function drawNeonRamenStandPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'neon-ramen-stand', 3, 3, 1);
    var u = ts / 16;
    var t = time || 0;
    // Warm yellow window glow halo
    var winPulse = 0.7 + Math.sin(t / 700 + (col || 0)) * 0.2;
    drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.6, ts * 1.8, 'rgba(255,200,120,0.7)', winPulse * 0.32);
    // Steam — fluffy three-column rise from the canopy
    for (var s = 0; s < 6; s++) {
      var sx = x - 2*u + (s % 3) * 3*u;
      var phase = Math.floor(t / 160 + s * 5) % 16;
      var sy = y - 3*ts + 4*u - phase * u;
      ctx.globalAlpha = Math.max(0, 0.55 - phase * 0.04 - (s >= 3 ? 0.1 : 0));
      ctx.fillStyle = s % 2 === 0 ? '#e8e8f0' : '#c8c8d8';
      var puff = (phase < 4) ? 1 : 2;
      ctx.fillRect(sx, sy, u * puff, u * puff);
    }
    ctx.globalAlpha = 1;
    // Warm sidewalk pool in front of stand
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 0.85, ts * 2.2, ts * 0.9, 'rgba(255,180,90,0.55)', 0.28 * winPulse);
  }

  function drawHoloBillboardKioskPng(ctx, x, y, ts, time, col, row) {
    // anchorOffsetX=2 (right-edge anchor) so the anchor is the last cell
    // rendered in iteration order — lets the footprint be filled with
    // SIDEWALK tiles (rather than void) without later cells overdrawing
    // the building's right edge. That kills the dark-purple cutout that
    // void-filled footprints leave behind on the sidewalk.
    drawBuildingSprite(ctx, x, y, ts, 'holo-billboard-kiosk', 3, 3, 2);
    var t = time || 0;
    // Cycle the cast color so the holo-billboard washes the street in
    // sync with whatever ad is on the screen.
    var phase = (t / 2400) % 3;
    var castColor = phase < 1 ? 'rgba(232,80,200,0.7)' : (phase < 2 ? 'rgba(120,140,232,0.65)' : 'rgba(80,220,232,0.7)');
    var pulse = 0.55 + Math.sin(t / 500 + (col || 0)) * 0.2;
    drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.9, ts * 2.0, castColor, pulse * 0.42);
    // Sidewalk wash
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 1.2, ts * 2.6, ts * 1.1, castColor, 0.28 * pulse);
  }

  function drawTokenKioskPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'token-kiosk', 2, 3, 0);
    var pulse = 0.55 + Math.sin((time || 0) / 700 + (row || 0)) * 0.2;
    drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.8, ts * 1.4, 'rgba(255,200,80,0.7)', pulse * 0.24);
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 0.85, ts * 1.6, ts * 0.7, 'rgba(255,200,80,0.6)', 0.3 * pulse);
  }

  function drawHoverBikeDockPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'hover-bike-dock', 2, 3, 0);
    var t = time || 0;
    var pulse = 0.7 + Math.sin(t / 450 + (col || 0)) * 0.18;
    drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.2, ts * 1.5, 'rgba(160,64,220,0.65)', pulse * 0.32);
    // Magenta hover thrust pool
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 0.85, ts * 1.8, ts * 0.7, 'rgba(232,80,200,0.7)', 0.4 * pulse);
    // Periodic engine flicker — quick brighter pulse every ~4s
    var flicker = (t % 4000) / 4000;
    if (flicker > 0.92) {
      drawSpriteGlow(ctx, x + ts * 0.5, y - ts * 0.1, ts * 1.6, 'rgba(120,220,232,0.85)', 0.6 * (1 - flicker) * 12);
    }
  }

  function drawArcadePng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'arcade', 5, 4, 4);
    var pulse = 0.7 + Math.sin((time || 0) / 560 + (col || 0)) * 0.18;
    var centerX = x - ts * 1.5;
    drawSpriteGlow(ctx, centerX, y - ts * 2.15, ts * 3.8, 'rgba(232,80,200,0.9)', pulse * 0.42);
    drawSpriteGlow(ctx, centerX, y - ts * 1.85, ts * 2.5, 'rgba(92,200,208,0.65)', pulse * 0.22);
    drawGroundLight(ctx, centerX, y + ts * 0.95, ts * 2.8, ts * 1.05, 'rgba(255,200,128,0.55)', 0.3 * pulse);
    drawGroundLight(ctx, centerX, y + ts * 0.85, ts * 2.3, ts * 0.8, 'rgba(232,80,200,0.65)', 0.32 * pulse);
  }

  function drawCyberNoodleBarPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'cyber-noodle-bar', 3, 4, 1);
    var t = time || 0;
    var pulse = 0.65 + Math.sin(t / 760 + (col || 0)) * 0.16;
    drawSpriteGlow(ctx, x + ts * 0.45, y - ts * 1.0, ts * 1.6, 'rgba(255,200,128,0.7)', pulse * 0.28);
    drawSpriteGlow(ctx, x + ts * 0.55, y - ts * 1.85, ts * 1.4, 'rgba(232,80,200,0.55)', pulse * 0.16);
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 0.95, ts * 2.0, ts * 0.85, 'rgba(255,176,96,0.55)', 0.28 * pulse);
  }

  function drawTechRepairShopPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'tech-repair-shop', 3, 4, 1);
    var pulse = 0.6 + Math.sin((time || 0) / 680 + (row || 0)) * 0.18;
    drawSpriteGlow(ctx, x + ts * 0.55, y - ts * 1.55, ts * 1.9, 'rgba(92,200,208,0.72)', pulse * 0.3);
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 0.95, ts * 2.0, ts * 0.85, 'rgba(92,200,208,0.55)', 0.28 * pulse);
  }

  function drawChromeClinicPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'chrome-clinic', 4, 4, 1);
    var pulse = 0.62 + Math.sin((time || 0) / 720 + (col || 0)) * 0.16;
    drawSpriteGlow(ctx, x + ts * 0.65, y - ts * 1.55, ts * 2.1, 'rgba(128,224,232,0.72)', pulse * 0.3);
    drawGroundLight(ctx, x + ts * 0.65, y + ts * 0.95, ts * 2.4, ts * 0.9, 'rgba(128,224,232,0.5)', 0.25 * pulse);
  }

  function drawJunkPawnShopPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'junk-pawn-shop', 3, 4, 1);
    var pulse = 0.5 + Math.sin((time || 0) / 900 + (row || 0)) * 0.14;
    drawSpriteGlow(ctx, x + ts * 0.45, y - ts * 1.45, ts * 1.5, 'rgba(232,80,200,0.5)', pulse * 0.2);
    drawGroundLight(ctx, x + ts * 0.5, y + ts * 0.9, ts * 1.7, ts * 0.75, 'rgba(255,210,128,0.42)', 0.22 * pulse);
  }

  // ---- Tile Draw Functions ----
  // Each receives (ctx, x, y, ts, time, col, row) where ts = rendered tile size

  // Arcade floor — strict pixel art. 8u checker with 1u dark grout cross
  // and deterministic 1u debris.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var BASE = '#2a2240';
    var TILE = '#332858';
    var GROUT = '#15102a';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = TILE;
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // 1u grout cross (whole-u)
    ctx.fillStyle = GROUT;
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // 1u debris/sparkle
    var seed = (col * 41 + row * 17) % 19;
    if (seed === 0) {
      ctx.fillStyle = '#a08060';
      ctx.fillRect(x + 4*u, y + 11*u, u, u);
    } else if (seed === 5) {
      ctx.fillStyle = '#7050a0';
      ctx.fillRect(x + 11*u, y + 4*u, u, u);
    } else if (seed === 11) {
      ctx.fillStyle = '#403858';
      ctx.fillRect(x + 6*u, y + 13*u, u, u);
    }
  }

  // Lit version — same pattern, brighter base, with a soft lamp pool overlay.
  function drawFloorLight(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var BASE = '#3a3260';
    var TILE = '#463a78';
    var GROUT = '#251c40';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = TILE;
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    ctx.fillStyle = GROUT;
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // Warm pool — gentle overhead lamp casts a halo on this floor tile
    var pulse = 0.8 + Math.sin(time / 700 + col * 0.3 + row * 0.7) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.32;
    var pool = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 0.85);
    pool.addColorStop(0, 'rgba(255,200,140,0.65)');
    pool.addColorStop(1, 'transparent');
    ctx.fillStyle = pool;
    ctx.fillRect(x - ts * 0.2, y - ts * 0.2, ts * 1.4, ts * 1.4);
    ctx.restore();
  }

  // Cyberpunk wall — strict pixel art. 4u dark cap + 12u brick body with
  // 1u mortar lines and alternating courses. Whole-u rects only.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var CAP_DK = '#15102a';
    var CAP = '#1e1835';
    var CAP_HI = '#3a3252';
    var BRICK = '#2a2245';
    var MORTAR = '#15102a';
    // 4u cap
    ctx.fillStyle = CAP;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x, y, ts, u);            // 1u top highlight
    // 12u brick body
    ctx.fillStyle = BRICK;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    // 1u mortar courses
    ctx.fillStyle = MORTAR;
    ctx.fillRect(x, y + 8*u, ts, u);
    ctx.fillRect(x, y + 12*u, ts, u);
    // Vertical brick joints (alternating per row)
    var off1 = (row % 2 === 0) ? 8 : 4;
    var off2 = (row % 2 === 0) ? 4 : 12;
    var off3 = (row % 2 === 0) ? 12 : 8;
    ctx.fillRect(x + off1*u, y + 5*u, u, 3*u);
    ctx.fillRect(x + off2*u, y + 9*u, u, 3*u);
    ctx.fillRect(x + off3*u, y + 13*u, u, 3*u);
    // Wear speckles (1u)
    var seed = (col * 23 + row * 11) % 7;
    if (seed === 0) {
      ctx.fillStyle = '#1e1a35';
      ctx.fillRect(x + 3*u, y + 6*u, u, u);
    } else if (seed === 3) {
      ctx.fillStyle = '#1e1a35';
      ctx.fillRect(x + 11*u, y + 10*u, u, u);
    }
  }

  // Dark wall variant — strict pixel art. Same structure as drawWall but
  // deeper palette.
  function drawWallDark(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var CAP_DK = '#0e0820';
    var CAP = '#151230';
    var CAP_HI = '#251c40';
    var BRICK = '#201a3a';
    var MORTAR = '#0e0820';
    ctx.fillStyle = CAP;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x, y, ts, u);
    ctx.fillStyle = BRICK;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    ctx.fillStyle = MORTAR;
    ctx.fillRect(x, y + 8*u, ts, u);
    ctx.fillRect(x, y + 12*u, ts, u);
    var off1 = (row % 2 === 0) ? 8 : 4;
    var off2 = (row % 2 === 0) ? 4 : 12;
    var off3 = (row % 2 === 0) ? 12 : 8;
    ctx.fillRect(x + off1*u, y + 5*u, u, 3*u);
    ctx.fillRect(x + off2*u, y + 9*u, u, 3*u);
    ctx.fillRect(x + off3*u, y + 13*u, u, 3*u);
  }

  function drawCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var SCREEN_COLORS = [
      ['#3855a0', '#5a78d0'], ['#388850', '#5cc080'], ['#a07038', '#d0a060'],
      ['#388890', '#5ac0c8'], ['#80388c', '#c060c0'], ['#a04040', '#d07070']
    ];
    var GLOW_COLORS = ['rgba(120,160,232,', 'rgba(120,232,160,', 'rgba(232,180,120,', 'rgba(120,232,232,', 'rgba(232,120,232,', 'rgba(232,120,120,'];
    var GLINT_COLORS = ['#a0b0d8', '#a0d8a8', '#d8c0a0', '#a0d8d8', '#d8a0d8', '#d8a0a0'];
    var idx = (col * 17 + row * 31 + col * row) % 6;
    var phase = (time / 800) + (col * 7 + row * 13);
    var pulse = 0.85 + Math.sin(phase) * 0.15;
    // Floor cast — colored pool of light spilling forward from the screen
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var castGrad = ctx.createRadialGradient(x + ts * 0.5, y + ts * 1.05, 0, x + ts * 0.5, y + ts * 1.05, ts * 1.0);
    castGrad.addColorStop(0, GLOW_COLORS[idx] + '0.6)');
    castGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = castGrad;
    ctx.fillRect(x - ts * 0.4, y + ts * 0.4, ts * 1.8, ts * 1.0);
    ctx.restore();
    // Cabinet body
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Cabinet outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 3*u, y + u, u, ts - 2*u);
    // Screen — lerp between dim and bright based on pulse, no alpha clamp
    var sw = ts - 6*u;
    var sh = Math.floor(ts * 0.35);
    var sx = x + 3*u;
    var sy = y + 3*u;
    ctx.fillStyle = SCREEN_COLORS[idx][0];
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillStyle = SCREEN_COLORS[idx][1];
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    // Animated content: scrolling band that varies per cabinet
    var scroll = Math.floor((time / (200 + idx * 50)) % sh);
    ctx.fillStyle = GLINT_COLORS[idx];
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx, sy + scroll, sw, Math.max(1, u));
    ctx.globalAlpha = 1;
    // CRT scanlines on screen
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (var sl = 0; sl < sh; sl += 2*u) {
      ctx.fillRect(sx, sy + sl, sw, Math.max(1, u * 0.5));
    }
    // Marquee panel
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    // Joystick + buttons (control panel)
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    ctx.fillStyle = ['#d04040','#40b040','#4080d0','#d0d040'][(col+row) % 4];
    ctx.fillRect(x + Math.floor(ts * 0.55), y + Math.floor(ts * 0.6), u, u);
    ctx.fillRect(x + Math.floor(ts * 0.7), y + Math.floor(ts * 0.6), u, u);
    // Feet
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawRunoutsCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var phase = (time / 600) + (col * 5 + row * 11);
    var pulse = 0.7 + Math.sin(phase) * 0.3;
    // Hot pink floor cast — Runouts gets the brightest pool because it's the
    // featured game in the arcade.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.55;
    var castGrad = ctx.createRadialGradient(x + ts * 0.5, y + ts * 1.1, 0, x + ts * 0.5, y + ts * 1.1, ts * 1.2);
    castGrad.addColorStop(0, 'rgba(232,120,168,0.75)');
    castGrad.addColorStop(0.5, 'rgba(160,40,120,0.4)');
    castGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = castGrad;
    ctx.fillRect(x - ts * 0.5, y + ts * 0.4, ts * 2.0, ts * 1.1);
    ctx.restore();
    // Body
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 3*u, y + u, u, ts - 2*u);
    // Screen — pink pulsing
    var sx = x + 3*u, sy = y + 3*u;
    var sw = ts - 6*u, sh = Math.floor(ts * 0.35);
    ctx.fillStyle = '#a04068';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    // Marquee text — three small "RUN" pixel blocks suggesting RUNOUTS
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.85;
    var blockW = Math.max(1, u * 1.2);
    ctx.fillRect(sx + Math.floor(sw * 0.18), sy + Math.floor(sh * 0.35), blockW, blockW);
    ctx.fillRect(sx + Math.floor(sw * 0.45), sy + Math.floor(sh * 0.35), blockW, blockW);
    ctx.fillRect(sx + Math.floor(sw * 0.72), sy + Math.floor(sh * 0.35), blockW, blockW);
    ctx.globalAlpha = 1;
    // Glint
    ctx.fillStyle = '#ffe0f0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, u, u);
    // CRT scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (var sl = 0; sl < sh; sl += 2*u) {
      ctx.fillRect(sx, sy + sl, sw, Math.max(1, u * 0.5));
    }
    // Marquee
    ctx.fillStyle = '#3a1a30';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    ctx.globalAlpha = 0.8 + Math.sin(time / 350 + col) * 0.2;
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.58), ts - 8*u, Math.max(1, u));
    ctx.globalAlpha = 1;
    // Joystick + buttons
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(x + Math.floor(ts * 0.55), y + Math.floor(ts * 0.6), u, u);
    ctx.fillStyle = '#d040d0';
    ctx.fillRect(x + Math.floor(ts * 0.7), y + Math.floor(ts * 0.6), u, u);
    // Feet
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawHighScoreBoard(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Frame
    ctx.fillStyle = '#0e1c0e';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 3*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + 2*u, u, ts - 4*u);
    ctx.fillRect(x + ts - 3*u, y + 2*u, u, ts - 4*u);
    // Inner CRT — green phosphor with subtle scanlines
    var sx = x + 3*u, sy = y + 3*u;
    var sw = ts - 6*u, sh = ts - 7*u;
    var pulse = 0.85 + Math.sin(time / 600 + col + row) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#2a8a44';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    // Animated rows — each row scrolls slightly
    var rows = 4;
    for (var i = 0; i < rows; i++) {
      var rowOff = ((time / 80 + col * 7 + i * 50) % 24) / 24;
      var rowAlpha = 0.7 + Math.sin(time / 300 + i + col) * 0.2;
      ctx.globalAlpha = rowAlpha;
      ctx.fillStyle = i === 0 ? '#a8e8a8' : '#4ec076';
      ctx.fillRect(sx + u, sy + (1 + i * 2)*u, sw - 2*u, u);
      // Faux digit on right
      ctx.fillStyle = i === 0 ? '#fff8a0' : '#a8d8a8';
      ctx.fillRect(sx + sw - (3 + Math.floor(rowOff * 2))*u, sy + (1 + i * 2)*u, u, u);
    }
    ctx.globalAlpha = 1;
    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (var sl = 0; sl < sh; sl += 2*u) {
      ctx.fillRect(sx, sy + sl, sw, Math.max(1, u * 0.4));
    }
    // Title bar
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + ts - 4*u, ts - 4*u, 2*u);
    ctx.fillStyle = '#a8e8a8';
    ctx.fillRect(x + 4*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 8*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 10*u, y + ts - 3*u, u, u);
  }

  function drawNeonSign(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = col * 17 + row * 31;
    var t = Math.floor(time / 80);
    var flicker = 1;
    if ((t + seed) % 37 === 0 || (t + seed) % 53 === 0) {
      flicker = 0.4 + Math.random() * 0.3;
    } else {
      flicker = 0.9 + Math.sin(time / 400 + seed) * 0.1;
    }
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + u, y + u, ts - 2*u, Math.floor(ts * 0.35));
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#c040d0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.2));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.4), u, 3*u);
    ctx.fillRect(x + ts - 3*u, y + Math.floor(ts * 0.4), u, 3*u);
    ctx.fillStyle = '#2a2245';
    ctx.fillRect(x, y + Math.floor(ts * 0.55), ts, ts - Math.floor(ts * 0.55));
  }

  function drawEntrance(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var t = time || 0;
    // A simple threshold/doormat (the entrance tiles are walkable foyer)
    ctx.fillStyle = '#4a4268';
    ctx.fillRect(x, y, ts, Math.max(1, u));
    ctx.fillRect(x, y + ts - Math.max(1, u), ts, Math.max(1, u));
    // Pulsing pink threshold strip — "you're crossing into something"
    var pulse = 0.7 + Math.sin(t / 400 + (col || 0) * 0.7) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.7;
    ctx.fillStyle = 'rgba(232,80,200,0.9)';
    ctx.fillRect(x, y + 7*u, ts, 2*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Pink halo bleeding in from the doorway
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.35;
    var halo = ctx.createRadialGradient(x + ts / 2, y + ts * 0.5, 0, x + ts / 2, y + ts * 0.5, ts * 1.3);
    halo.addColorStop(0, 'rgba(255,120,200,0.85)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts * 0.6, y - ts * 0.4, ts * 2.2, ts * 1.8);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Floor projector — animated cyan wedge of light projected from the entrance
  // door onto the interior floor. Drawn behind the door tile so the door
  // remains visible. Used by drawArcadeDoor to add a "doorway light spill"
  // effect onto the immediate sidewalk in front.
  function drawDoorLightBeam(ctx, cx, cy, ts, time, color, intensity) {
    var t = time || 0;
    var pulse = 0.7 + Math.sin(t / 800) * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * intensity;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 1.6);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.replace(/,\s*[\d.]+\s*\)$/, ',0.3)'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - ts * 1.6, cy - ts * 0.4, ts * 3.2, ts * 1.5);
    ctx.restore();
  }

  // Neon-themed arcade door — dark metallic frame with hot-pink neon outline,
  // smoked-glass panels, and pink-purple light leaking out. Matches the
  // arcadia world's neon palette so it doesn't read as a wood cottage.
  function drawArcadeDoor(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Wall-dark base (matches surrounding wall_dark tiles)
    ctx.fillStyle = '#1a1530';
    ctx.fillRect(x, y, ts, ts);
    // Cap highlight (continuity with wall_dark)
    ctx.fillStyle = '#251c40';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.5));
    // Dark metallic door frame (almost black)
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.max(1, u * 0.6), y + Math.max(1, u * 0.6), ts - Math.max(1, u * 1.2), ts - Math.max(1, u * 1.2));
    // Inner door area — smoked glass with vertical pink-purple gradient
    var dx = x + Math.max(1, u * 1.5);
    var dy = y + Math.max(1, u * 1.5);
    var dw = ts - Math.max(1, u * 3);
    var dh = ts - Math.max(1, u * 3);
    var glassGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
    glassGrad.addColorStop(0, '#1a0a20');
    glassGrad.addColorStop(0.5, '#3a1840');
    glassGrad.addColorStop(1, '#1a0a20');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(dx, dy, dw, dh);
    // Vertical center line — gap between sliding glass doors
    ctx.fillStyle = '#0a0418';
    ctx.fillRect(dx + Math.floor(dw * 0.5) - Math.max(1, u * 0.3), dy, Math.max(1, u * 0.6), dh);
    // Horizontal middle bar (frame divider)
    ctx.fillStyle = '#080418';
    ctx.fillRect(dx, dy + Math.floor(dh * 0.55), dw, Math.max(1, u * 0.5));
    // Pulsing pink neon outline around the door
    var pulse = 0.65 + Math.sin(time / 350 + col + row) * 0.35;
    if ((Math.floor(time / 80) + col * 7) % 113 === 0) pulse *= 0.45; // rare flicker
    var neonAlpha = Math.max(0.3, Math.min(1, pulse));
    ctx.strokeStyle = 'rgba(232, 80, 168, ' + neonAlpha.toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, u * 0.5);
    ctx.strokeRect(dx, dy, dw, dh);
    // Inner brighter outline (the neon tube core)
    ctx.strokeStyle = 'rgba(255, 180, 220, ' + (neonAlpha * 0.7).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, u * 0.25);
    ctx.strokeRect(dx + Math.max(1, u * 0.4), dy + Math.max(1, u * 0.4), dw - Math.max(1, u * 0.8), dh - Math.max(1, u * 0.8));
    // Touch/scan panel (right side, instead of a knob)
    var panelX = dx + dw + Math.max(1, u * 0.4);
    if (panelX + Math.max(1, u * 1.4) < x + ts) {
      ctx.fillStyle = '#202036';
      ctx.fillRect(panelX, dy + Math.floor(dh * 0.4), Math.max(1, u * 1.4), Math.max(1, u * 2.4));
      // Glowing scan slit
      ctx.fillStyle = 'rgba(255,80,180,' + neonAlpha.toFixed(2) + ')';
      ctx.fillRect(panelX + Math.max(1, u * 0.3), dy + Math.floor(dh * 0.5), Math.max(1, u * 0.8), Math.max(1, u * 0.4));
    }
    // Big neon halo bleeding out of the doorway — pink/violet
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = neonAlpha * 0.75;
    var halo = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 1.6);
    halo.addColorStop(0, 'rgba(232, 80, 200, 0.85)');
    halo.addColorStop(0.4, 'rgba(160, 60, 200, 0.35)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts * 0.7, y - ts * 0.5, ts * 2.4, ts * 2.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Light spill onto the sidewalk in front of the door
    drawDoorLightBeam(ctx, x + ts/2, y + ts * 1.1, ts, time, 'rgba(232,80,200,0.85)', 0.55);
  }

  function drawFloorDark(ctx, x, y, ts) {
    var h = ts / 2;
    ctx.fillStyle = '#221c38';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#261e40';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
  }

  function drawFloorWorn(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#2a2240';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#1e1a30';
    ctx.fillRect(x + 3*u, y + 5*u, 2*u, u);
    ctx.fillRect(x + 8*u, y + 10*u, 3*u, u);
    ctx.fillRect(x + 6*u, y + 2*u, u, 2*u);
  }

  function drawPoster(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var POSTER_THEMES = [
      { bg: '#d06090', accent: '#fff', icon: 'star' },
      { bg: '#5cc8d0', accent: '#08303a', icon: 'lightning' },
      { bg: '#c8a840', accent: '#403018', icon: 'crown' },
      { bg: '#60b060', accent: '#082a18', icon: 'arrow' },
      { bg: '#8060d0', accent: '#fff', icon: 'skull' }
    ];
    var idx = (col * 5 + row * 7) % POSTER_THEMES.length;
    var theme = POSTER_THEMES[idx];
    drawWall(ctx, x, y, ts);
    var fx = x + 3*u;
    var fy = y + Math.floor(ts * 0.32);
    var fw = ts - 6*u;
    var fh = Math.floor(ts * 0.5);
    // Subtle pulse — backlit poster
    var pulse = 0.85 + Math.sin(time / 1100 + col + row * 1.7) * 0.15;
    // Frame
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(fx + u, fy + u, fw - 2*u, fh - 2*u);
    ctx.globalAlpha = 1;
    // Icon
    var icx = fx + Math.floor(fw / 2);
    var icy = fy + Math.floor(fh * 0.4);
    ctx.fillStyle = theme.accent;
    var s = Math.max(1, Math.floor(u * 0.8));
    if (theme.icon === 'star') {
      ctx.fillRect(icx - s, icy - 2*s, 2*s, s);
      ctx.fillRect(icx - 2*s, icy - s, 4*s, 2*s);
      ctx.fillRect(icx - s, icy + s, 2*s, s);
    } else if (theme.icon === 'lightning') {
      ctx.fillRect(icx, icy - 2*s, s, 2*s);
      ctx.fillRect(icx - s, icy, 2*s, s);
      ctx.fillRect(icx - s, icy + s, s, 2*s);
    } else if (theme.icon === 'crown') {
      ctx.fillRect(icx - 2*s, icy, s, 2*s);
      ctx.fillRect(icx, icy - s, s, 3*s);
      ctx.fillRect(icx + s, icy, s, 2*s);
      ctx.fillRect(icx - 2*s, icy + 2*s, 4*s, s);
    } else if (theme.icon === 'arrow') {
      ctx.fillRect(icx, icy - 2*s, s, 4*s);
      ctx.fillRect(icx - s, icy - s, s, s);
      ctx.fillRect(icx + s, icy - s, s, s);
    } else if (theme.icon === 'skull') {
      ctx.fillRect(icx - 2*s, icy - 2*s, 4*s, 3*s);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(icx - 2*s, icy - s, s, s);
      ctx.fillRect(icx + s, icy - s, s, s);
      ctx.fillStyle = theme.accent;
      ctx.fillRect(icx - s, icy + s, s, s);
      ctx.fillRect(icx, icy + s, s, s);
    }
    // Tape corners
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(fx, fy, 2*u, u);
    ctx.fillRect(fx + fw - 2*u, fy, 2*u, u);
    // Atmospheric backlit halo so posters read as glowing wall ads
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.22;
    var halo = ctx.createRadialGradient(fx + fw/2, fy + fh/2, 0, fx + fw/2, fy + fh/2, ts * 0.85);
    halo.addColorStop(0, theme.bg);
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts * 0.2, y, ts * 1.4, ts);
    ctx.restore();
  }

  function drawBrokenCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Body — slightly weathered
    ctx.fillStyle = '#1f1a32';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#15101e';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 3*u, y + u, u, ts - 2*u);
    // Screen
    var screenX = x + 3*u;
    var screenY = y + 3*u;
    var screenW = ts - 6*u;
    var screenH = Math.floor(ts * 0.35);
    // Static base (dark with tiny noise)
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(screenX, screenY, screenW, screenH);
    // Noise specks
    for (var n = 0; n < 6; n++) {
      var nseed = (col * 13 + row * 17 + n * 19 + Math.floor(time / 80)) % 100;
      if (nseed < 50) {
        var nx = screenX + ((nseed * 7) % screenW);
        var ny = screenY + ((nseed * 11) % screenH);
        ctx.fillStyle = nseed % 2 ? '#3a3a4a' : '#1a1a2a';
        ctx.fillRect(nx, ny, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
      }
    }
    // Garble — much more frequent (every ~1.5s, varies per cabinet)
    var garbleTick = (Math.floor(time / 90) + col * 23 + row * 41) % 17;
    if (garbleTick < 2) {
      var gColors = ['#d06090', '#3855a0', '#40b060', '#c8a840', '#80388c'];
      ctx.fillStyle = gColors[(col + row + Math.floor(time / 200)) % gColors.length];
      ctx.globalAlpha = 0.55;
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX, screenY + 2*u, screenW, Math.max(1, u));
      ctx.fillRect(screenX, screenY + 5*u, screenW, Math.max(1, u * 0.5));
      ctx.globalAlpha = 1;
    }
    // Diagonal crack
    ctx.strokeStyle = 'rgba(180,180,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX + screenW * 0.2, screenY + screenH * 0.3);
    ctx.lineTo(screenX + screenW * 0.5, screenY + screenH * 0.6);
    ctx.lineTo(screenX + screenW * 0.4, screenY + screenH * 0.85);
    ctx.stroke();
    // Marquee dimmer
    ctx.fillStyle = '#15101e';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    // Feet
    ctx.fillStyle = '#15101e';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
    // Spark spitting from the crack — rare, deterministic per frame
    var sparkPhase = (Math.floor(time / 130) + col * 17 + row * 41) % 23;
    if (sparkPhase < 2) {
      var sparkX = screenX + screenW * 0.4;
      var sparkY = screenY + screenH * 0.7;
      ctx.fillStyle = 'rgba(255,232,160,0.9)';
      ctx.fillRect(sparkX, sparkY, u, u);
      ctx.fillStyle = 'rgba(255,180,80,0.7)';
      ctx.fillRect(sparkX - u, sparkY - u, u, u);
      ctx.fillRect(sparkX + u, sparkY + u, u, u);
      // Tiny halo around the spark
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.7;
      var sg = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, 4*u);
      sg.addColorStop(0, 'rgba(255,200,120,0.9)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(sparkX - 4*u, sparkY - 4*u, 8*u, 8*u);
      ctx.restore();
    }
  }

  // Cyberpunk sidewalk — strict pixel art. 8u × 8u pavers with 1u grout
  // cross + deterministic 1u grit specks. Wet-street puddle highlights tint
  // a few tiles per row for that "rain-slicked Blade Runner" mood.
  function drawSidewalk(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var BASE = '#3a3650';
    var TILE_LT = '#403c5a';
    var TILE_DK = '#363248';
    var GROUT = '#28253a';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // 2x2 paver pattern (alternating per col+row)
    var lighten = (col + row) % 2 === 0 ? TILE_LT : TILE_DK;
    ctx.fillStyle = lighten;
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // 1u grout cross
    ctx.fillStyle = GROUT;
    ctx.fillRect(x, y + 8*u - u, ts, u);
    ctx.fillRect(x + 8*u - u, y, u, ts);
    // 1u grit speckles
    var seed = (col * 31 + row * 17) % 11;
    if (seed === 0) {
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(x + 3*u, y + 5*u, u, u);
    } else if (seed === 4) {
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(x + 11*u, y + 11*u, u, u);
    } else if (seed === 7) {
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(x + 12*u, y + 3*u, u, u);
    }
    // Wet-street puddle reflection — 1 in 7 tiles, deterministic. A neon
    // tone leaks onto the wet pavement so the city feels rain-slicked.
    var puddle = (col * 53 + row * 11) % 13;
    if (puddle < 3) {
      var puddleColors = ['rgba(232,80,200,0.18)', 'rgba(120,220,232,0.16)', 'rgba(160,80,232,0.16)'];
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = puddleColors[puddle];
      ctx.fillRect(x + 3*u, y + 10*u, 8*u, 4*u);
      ctx.fillStyle = puddleColors[puddle];
      ctx.fillRect(x + 5*u, y + 11*u, 6*u, 2*u);
      // 1u shimmer that drifts slightly per frame
      var shimmer = ((Math.floor(time / 220) + col + row) % 4);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + (5 + shimmer)*u, y + 11*u, u, u);
      ctx.restore();
    }
  }

  // Cyberpunk lamp post — strict pixel art. 2u-wide pole, 8u × 3u hood,
  // 4u × 2u bulb with hard 1u top highlight, atmospheric warm halo.
  function drawLampPost(ctx, x, y, ts, time, col, row) {
    drawSidewalk(ctx, x, y, ts);
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var POLE_DK = '#1a1a1a';
    var POLE = '#3a3a3a';
    var POLE_HI = '#555555';
    var HOOD_DK = '#1a1408';
    var HOOD = '#2a2418';
    var HOOD_HI = '#4a3820';
    // Pole (2u × 11u, 1u left highlight)
    ctx.fillStyle = POLE_DK;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 11*u);
    ctx.fillStyle = POLE;
    ctx.fillRect(x + 7*u, y + 3*u, u, 11*u);
    ctx.fillStyle = POLE_HI;
    ctx.fillRect(x + 7*u, y + 3*u, u, u);
    // Hood (8u × 3u outline)
    ctx.fillStyle = HOOD_DK;
    ctx.fillRect(x + 4*u, y + u, 8*u, 3*u);
    ctx.fillStyle = HOOD;
    ctx.fillRect(x + 5*u, y + u, 6*u, 2*u);
    ctx.fillStyle = HOOD_HI;
    ctx.fillRect(x + 5*u, y + u, 6*u, u);
    // Bulb pulse
    var phase = time / 700 + col * 2.3 + row * 1.7;
    var pulse = 0.85 + Math.sin(phase) * 0.15;
    if ((Math.floor(time / 70) + col * 11) % 113 === 0) pulse *= 0.5;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe070';
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, 2*u);
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
    ctx.globalAlpha = 1;
    // Halo (atmospheric gradient — allowed by spec). Two-stage halo gives
    // a hot core and a soft outer pool that washes the sidewalk.
    ctx.globalCompositeOperation = 'screen';
    // Tight inner halo around the bulb
    ctx.globalAlpha = pulse * 0.55;
    var halo1 = ctx.createRadialGradient(x + 8*u, y + 3*u, 0, x + 8*u, y + 3*u, 5*u);
    halo1.addColorStop(0, 'rgba(255,236,160,0.95)');
    halo1.addColorStop(0.6, 'rgba(255,200,90,0.4)');
    halo1.addColorStop(1, 'transparent');
    ctx.fillStyle = halo1;
    ctx.fillRect(x - 2*u, y - 4*u, ts + 4*u, ts/2 + 6*u);
    // Wide soft pool down to the sidewalk
    ctx.globalAlpha = pulse * 0.35;
    var halo2 = ctx.createRadialGradient(x + 8*u, y + 8*u, 0, x + 8*u, y + 8*u, 14*u);
    halo2.addColorStop(0, 'rgba(255,200,90,0.65)');
    halo2.addColorStop(0.55, 'rgba(255,160,100,0.18)');
    halo2.addColorStop(1, 'transparent');
    ctx.fillStyle = halo2;
    ctx.fillRect(x - 8*u, y - 4*u, ts + 16*u, ts + 8*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Warm pool of light on the sidewalk directly below the lamp
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.5;
    var floor = ctx.createRadialGradient(x + 8*u, y + 16*u, 0, x + 8*u, y + 16*u, 10*u);
    floor.addColorStop(0, 'rgba(255,210,120,0.65)');
    floor.addColorStop(1, 'transparent');
    ctx.fillStyle = floor;
    ctx.fillRect(x - 6*u, y + 8*u, ts + 12*u, ts);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Base (4u × 2u)
    ctx.fillStyle = POLE_DK;
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, 2*u);
    ctx.fillStyle = POLE_HI;
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, u);
  }

  // 3x5 mini-pixel font for sign letters. Bits encoded MSB-left in 3-wide rows.
  var MINI_FONT = {
    A: [0b010,0b101,0b111,0b101,0b101],
    R: [0b110,0b101,0b110,0b101,0b101],
    C: [0b011,0b100,0b100,0b100,0b011],
    D: [0b110,0b101,0b101,0b101,0b110],
    I: [0b111,0b010,0b010,0b010,0b111],
    P: [0b110,0b101,0b110,0b100,0b100],
    L: [0b100,0b100,0b100,0b100,0b111],
    Y: [0b101,0b101,0b010,0b010,0b010],
    ' ': [0,0,0,0,0]
  };

  function drawMiniText(ctx, text, x, y, px, color) {
    ctx.fillStyle = color;
    var cx = x;
    for (var ci = 0; ci < text.length; ci++) {
      var ch = text[ci];
      var glyph = MINI_FONT[ch];
      if (!glyph) { cx += 4*px; continue; }
      for (var ry = 0; ry < 5; ry++) {
        var bits = glyph[ry];
        for (var rx = 0; rx < 3; rx++) {
          if (bits & (1 << (2 - rx))) {
            ctx.fillRect(cx + rx*px, y + ry*px, px, px);
          }
        }
      }
      cx += 4*px;
    }
  }

  function drawEntranceSign(ctx, x, y, ts, time, col) {
    time = time || 0; col = col || 0;
    var u = ts / 16;
    // Marquee: shows ARCADIA scrolling across the 4 sign tiles (cols 13..16).
    // Smooth crossfade between letters instead of a hard switch every 600ms.
    var word = 'ARCADIA';
    var period = 1000;
    var phase = time / period;
    var scroll = Math.floor(phase);
    var fadeT = phase - scroll;            // 0..1 transition position
    var letterIdx = ((col - 13) + scroll) % word.length;
    if (letterIdx < 0) letterIdx += word.length;
    var nextIdx = (letterIdx + 1) % word.length;
    var letter = word[letterIdx];
    var nextLetter = word[nextIdx];
    // Fade-out the current letter for the last 25% of the period, fade in the next.
    var oldAlpha = fadeT < 0.75 ? 1 : (1 - (fadeT - 0.75) / 0.25);
    var newAlpha = fadeT < 0.75 ? 0 : ((fadeT - 0.75) / 0.25);
    // Background
    ctx.fillStyle = '#0e0c1a';
    ctx.fillRect(x, y, ts, ts);
    // Sign frame — slightly thicker outer rim
    ctx.fillStyle = '#1a0a20';
    ctx.fillRect(x + u, y + 3*u, ts - 2*u, 10*u);
    ctx.fillStyle = '#280f30';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, u);    // top inner highlight
    // Bracket fixtures (poles)
    ctx.fillStyle = '#3a2a30';
    ctx.fillRect(x + 2*u, y, u, 4*u);
    ctx.fillRect(x + ts - 3*u, y, u, 4*u);
    // Sign body — pink with flicker, with a body-color shift in sync with letters
    var flicker = 0.85 + Math.sin(time / 500 + col * 1.7) * 0.15;
    if ((Math.floor(time / 90) + col * 7) % 89 === 0) flicker *= 0.4;
    var bodyPulse = 0.85 + Math.sin(time / 320 + col * 0.9) * 0.15;
    ctx.globalAlpha = flicker * bodyPulse;
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 8*u);
    // Top tube highlight (1u brighter band)
    ctx.fillStyle = '#ffb0d8';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, u);
    // Letter (centered) — render with crossfade
    var px = Math.max(1, Math.floor(u * 0.9));
    var letterW = 3 * px;
    var letterH = 5 * px;
    var lx = x + Math.floor((ts - letterW) / 2);
    var ly = y + 4*u + Math.floor((8*u - letterH) / 2);
    if (oldAlpha > 0) {
      ctx.globalAlpha = oldAlpha * flicker;
      drawMiniText(ctx, letter, lx, ly, px, '#1a0a20');
    }
    if (newAlpha > 0) {
      ctx.globalAlpha = newAlpha * flicker;
      drawMiniText(ctx, nextLetter, lx, ly, px, '#1a0a20');
    }
    ctx.globalAlpha = 1;
    // Light bulb dots along bottom
    for (var d = 0; d < 3; d++) {
      var dotX = x + (3 + d * 5)*u;
      var dotPulse = 0.6 + Math.sin(time / 250 + col + d) * 0.4;
      ctx.globalAlpha = dotPulse;
      ctx.fillStyle = '#ffe0a0';
      ctx.fillRect(dotX, y + 13*u, u, u);
    }
    ctx.globalAlpha = 1;
    // Pink atmospheric halo behind the marquee — sells the neon
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = flicker * bodyPulse * 0.55;
    var halo = ctx.createRadialGradient(x + ts / 2, y + 8*u, 0, x + ts / 2, y + 8*u, ts * 1.2);
    halo.addColorStop(0, 'rgba(255,120,200,0.85)');
    halo.addColorStop(0.6, 'rgba(160,60,200,0.25)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts * 0.6, y - ts * 0.5, ts * 2.2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Bench — strict pixel art. 14u × 4u wooden slat, 2u-wide iron legs,
  // 1u top highlight. Whole-u rects only.
  function drawBench(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0e08';
    var WOOD = '#3a2818';
    var WOOD_HI = '#5a4830';
    var IRON_DK = '#0e0e15';
    var IRON = '#1a1a22';
    var IRON_HI = '#2a2a35';
    // Slat outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 6*u, 14*u, 5*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + u, y + 6*u, 14*u, 4*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + u, y + 6*u, 14*u, u);
    // Plank seam (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 8*u, 14*u, u);
    // Iron legs (2u × 5u)
    ctx.fillStyle = IRON_DK;
    ctx.fillRect(x + 2*u, y + 10*u, 2*u, 5*u);
    ctx.fillRect(x + 12*u, y + 10*u, 2*u, 5*u);
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 2*u, y + 10*u, 2*u, 4*u);
    ctx.fillRect(x + 12*u, y + 10*u, 2*u, 4*u);
    ctx.fillStyle = IRON_HI;
    ctx.fillRect(x + 2*u, y + 10*u, u, 4*u);
    ctx.fillRect(x + 12*u, y + 10*u, u, 4*u);
    // Floor shadow (1u)
    ctx.fillStyle = '#0a080e';
    ctx.fillRect(x + u, y + 14*u, 14*u, u);
  }

  // Table — strict pixel art. 12u × 4u top, 1u legs, 1u top highlight.
  function drawTable(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0e0a18';
    var TOP = '#403648';
    var TOP_HI = '#5a4e62';
    var SIDE = '#2a2235';
    var LEG = '#1a1622';
    // Top outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 5*u);
    ctx.fillStyle = TOP;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 4*u);
    ctx.fillStyle = TOP_HI;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, u);
    // Side band (1u shadow)
    ctx.fillStyle = SIDE;
    ctx.fillRect(x + 2*u, y + 8*u, 12*u, u);
    // Legs (1u × 6u)
    ctx.fillStyle = LEG;
    ctx.fillRect(x + 3*u, y + 9*u, u, 5*u);
    ctx.fillRect(x + 12*u, y + 9*u, u, 5*u);
    // Item on top
    var item = (col * 7 + row * 11) % 3;
    if (item === 0) {
      // Coffee cup (3u × 2u with handle)
      ctx.fillStyle = '#3a1c10';
      ctx.fillRect(x + 6*u, y + 2*u, 3*u, 2*u);
      ctx.fillStyle = '#7a4a30';
      ctx.fillRect(x + 6*u, y + 2*u, 3*u, u);
    } else if (item === 1) {
      // Gold token (1u)
      ctx.fillStyle = '#806820';
      ctx.fillRect(x + 7*u, y + 3*u, 2*u, 2*u);
      ctx.fillStyle = '#e8c870';
      ctx.fillRect(x + 7*u, y + 3*u, u, u);
    } else {
      // Card (3u × 1u)
      ctx.fillStyle = '#388890';
      ctx.fillRect(x + 7*u, y + 3*u, 3*u, 2*u);
      ctx.fillStyle = '#5cc8d0';
      ctx.fillRect(x + 7*u, y + 3*u, 3*u, u);
    }
  }

  function drawVendingMachine(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Body
    ctx.fillStyle = '#1e2838';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + u, y + u, ts - 2*u, u);
    ctx.fillRect(x + u, y + ts - 2*u, ts - 2*u, u);
    ctx.fillRect(x + u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 2*u, y + u, u, ts - 2*u);
    // Display window
    var phase = (time / 1200) + col * 11;
    var glow = 0.8 + Math.sin(phase) * 0.2;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#3868a0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.4));
    ctx.globalAlpha = 1;
    // Display reflections
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, u);
    // Buttons (3x2 grid)
    var buttonColors = ['#d06060', '#60b060', '#c8a840', '#5cc8d0', '#d06090', '#a060d0'];
    var hoverIdx = Math.floor(time / 400 + col * 3) % 6;
    for (var b = 0; b < 6; b++) {
      var bx = x + (3 + (b % 3) * 3)*u;
      var by = y + (3 + Math.floor(b / 3) * 3)*u;
      ctx.fillStyle = buttonColors[b];
      if (b === hoverIdx) {
        // "Selected" pulse — brighter
        ctx.globalAlpha = 0.7 + Math.sin(time / 150) * 0.3;
        ctx.fillRect(bx - u*0.5, by - u*0.5, 3*u, 3*u);
        ctx.globalAlpha = 1;
      }
      ctx.fillRect(bx, by, 2*u, 2*u);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(bx, by, 2*u, Math.max(1, u * 0.4));
    }
    // Coin slot
    ctx.fillStyle = '#888';
    ctx.fillRect(x + ts - 4*u, y + Math.floor(ts * 0.5), 2*u, 3*u);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + ts - 4*u + u*0.4, y + Math.floor(ts * 0.5) + u*0.5, u*1.2, u*0.5);
    // Dispense tray
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 3*u, y + ts - 4*u, ts - 6*u, 2*u);
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(x + 4*u, y + ts - 3*u, ts - 8*u, u);
  }

  var NPC_PALETTES = [
    { suit: '#c8a840', light: '#e8c870', dark: '#806820', skin: '#e0c0a0' },
    { suit: '#5cc8d0', light: '#90e0e8', dark: '#388890', skin: '#c0a080' },
    { suit: '#d06060', light: '#f08888', dark: '#883838', skin: '#e8d0b0' },
    { suit: '#7060d0', light: '#9080f0', dark: '#403880', skin: '#d0a880' },
    { suit: '#60a060', light: '#90c890', dark: '#386838', skin: '#e0c0a0' }
  ];
  var NPC_HATS = [null, 'cap', 'antenna', 'horns', 'cap'];

  // Arcadia NPC — strict pixel art. 8u-wide character with 1u outline,
  // 3-tone shading, varied hat per seed.
  function drawNpc(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts);
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = col * 13 + row * 29;
    var pal = NPC_PALETTES[seed % NPC_PALETTES.length];
    var hat = NPC_HATS[seed % NPC_HATS.length];
    var DARK = '#0a0a16';
    var bob = Math.sin(time / 600 + col * 7) > 0.85 ? -u : 0;
    // Shadow (1u)
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(x + 4*u, y + 14*u, 8*u, u);
    // Head outline (6u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 5*u);
    // Skin
    ctx.fillStyle = pal.skin;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 5*u);
    // Hair / hat
    if (hat === 'cap') {
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 4*u, y + u + bob, 8*u, 2*u);
      ctx.fillStyle = pal.suit;
      ctx.fillRect(x + 4*u, y + u + bob, 8*u, u);
      ctx.fillStyle = pal.light;
      ctx.fillRect(x + 5*u, y + 2*u + bob, 4*u, u);
    } else if (hat === 'antenna') {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 5*u, y + u + bob, 6*u, u);
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 7*u, y + bob, u, 2*u);
      var antPulse = 0.6 + Math.sin(time / 400 + col) * 0.4;
      ctx.globalAlpha = antPulse;
      ctx.fillStyle = pal.light;
      ctx.fillRect(x + 7*u, y + bob, u, u);
      ctx.globalAlpha = 1;
    } else if (hat === 'horns') {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 5*u, y + u + bob, 6*u, u);
      ctx.fillRect(x + 4*u, y + bob, u, 2*u);
      ctx.fillRect(x + 11*u, y + bob, u, 2*u);
    } else {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 5*u, y + u + bob, 6*u, u);
    }
    // Eyes (1u, blink occasionally)
    var blinkPhase = ((time + col * 1500 + row * 700) / 100) % 60;
    var blinking = blinkPhase < 3;
    ctx.fillStyle = DARK;
    if (!blinking) {
      ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
      ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    } else {
      ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
      ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    }
    // Body outline (8u × 6u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    // Suit
    ctx.fillStyle = pal.suit;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = pal.light;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);   // 1u shoulder highlight
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);  // belt
    // Legs (2u × 4u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet (1u row)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // ---- Register with engine ----

  // ---- Street features (Stardew-style neon city) ----

  // Hover bike — strict pixel art. 12u × 4u fairing with 8u canopy, 2u
  // engine pods. Whole-u rects only. Hover glow stays as gradient.
  function drawHoverBike(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#080418';
    var BODY_DK = '#1a1a26';
    var BODY = '#3a3a48';
    var BODY_HI = '#5a5a68';
    var CANOPY = '#388890';
    var CANOPY_HI = '#80e0e8';
    var ACCENT = '#a040c0';
    // Hover glow (atmospheric — gradient allowed)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.55;
    var grad = ctx.createRadialGradient(x + ts/2, y + 13*u, 0, x + ts/2, y + 13*u, 7*u);
    grad.addColorStop(0, 'rgba(232,80,200,0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - u, y + 8*u, ts + 2*u, ts - 6*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Bike body — hover offset (whole-u snap)
    var hover = Math.sin(time / 600 + col) > 0.5 ? -u : 0;
    var by = y + 6*u + hover;
    // Main fairing outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, by + 2*u, 12*u, 5*u);
    ctx.fillStyle = BODY_DK;
    ctx.fillRect(x + 2*u, by + 2*u, 12*u, 4*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 2*u, by + 3*u, 12*u, 2*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 2*u, by + 2*u, 12*u, u);   // 1u top highlight
    // Cockpit canopy (8u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, by, 8*u, 2*u);
    ctx.fillStyle = CANOPY;
    ctx.fillRect(x + 4*u, by, 8*u, 2*u);
    ctx.fillStyle = CANOPY_HI;
    ctx.fillRect(x + 4*u, by, 8*u, u);
    // Engine pods (2u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, by + 3*u, 2*u, 3*u);
    ctx.fillRect(x + 13*u, by + 3*u, 2*u, 3*u);
    // Engine glow (1u × 1u)
    var eGlow = 0.8 + Math.sin(time / 150) * 0.2;
    ctx.globalAlpha = eGlow;
    ctx.fillStyle = '#ff80c0';
    ctx.fillRect(x + u, by + 4*u, 2*u, u);
    ctx.fillRect(x + 13*u, by + 4*u, 2*u, u);
    ctx.globalAlpha = 1;
    // Accent stripe (1u purple)
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x + 3*u, by + 5*u, 10*u, u);
  }

  function drawHoloBillboard(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawWallDark(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Billboard frame
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.max(1, u * 0.5), y + Math.max(1, u * 0.5), ts - u, ts * 0.55);
    // Holo screen background
    var bx = x + Math.max(1, u);
    var by = y + Math.max(1, u);
    var bw = ts - 2*u;
    var bh = Math.floor(ts * 0.5);
    // Color cycles between pink/purple/cyan over time
    var phase = (time / 2000) % 3;
    var bg;
    if (phase < 1) bg = '#3a1840';
    else if (phase < 2) bg = '#181a40';
    else bg = '#1a3040';
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, bw, bh);
    // Animated content — scrolling bands of color
    var scroll = (time / 80) % bh;
    ctx.fillStyle = phase < 1 ? '#e870c0' : (phase < 2 ? '#7080e8' : '#70e0e8');
    ctx.globalAlpha = 0.7;
    ctx.fillRect(bx, by + scroll, bw, Math.max(1, u * 0.6));
    ctx.fillRect(bx, by + (scroll + bh * 0.4) % bh, bw, Math.max(1, u * 0.4));
    ctx.globalAlpha = 1;
    // Text-like bars on the screen
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(bx + 2*u, by + 2*u, bw - 4*u, Math.max(1, u * 0.5));
    ctx.fillRect(bx + 2*u, by + 4*u, bw - 5*u, Math.max(1, u * 0.5));
    ctx.fillRect(bx + 3*u, by + 6*u, bw - 6*u, Math.max(1, u * 0.5));
    // Scanline
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    var scanY = ((time / 25 + col * 30) % bh);
    ctx.fillRect(bx, by + scanY, bw, Math.max(1, u * 0.5));
    // Mounting brackets
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.55), Math.max(1, u * 0.6), 3*u);
    ctx.fillRect(x + ts - 3*u, y + Math.floor(ts * 0.55), Math.max(1, u * 0.6), 3*u);
    // Subtle light cast on wall below
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25;
    var glowColor = phase < 1 ? '160, 60, 200' : (phase < 2 ? '60, 80, 200' : '60, 180, 200');
    ctx.fillStyle = 'rgba(' + glowColor + ', 0.5)';
    ctx.fillRect(x, y + ts * 0.6, ts, ts * 0.4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Food cart — strict pixel art. 12u × 7u body with 12u × 3u striped
  // awning, 3u stepped wheels, animated 1u steam. Whole-u rects only.
  function drawFoodCart(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#180a18';
    var CART = '#a02050';
    var CART_HI = '#e040a0';
    var CART_SH = '#601838';
    var WHEEL = '#1a1a1e';
    var HUB = '#3a3a3a';
    var STRIPE_A = '#3a1840';
    var STRIPE_B = '#7030a0';
    // Cart body (12u × 7u with outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, 7*u);
    ctx.fillStyle = CART;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, 6*u);
    ctx.fillStyle = CART_HI;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);
    ctx.fillStyle = CART_SH;
    ctx.fillRect(x + 2*u, y + 11*u, 12*u, u);
    // Counter window (8u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u, 8*u, 3*u);
    // Bowl on counter (3u × 1u)
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    // Awning (12u × 3u, alternating stripes)
    for (var sIx = 0; sIx < 4; sIx++) {
      ctx.fillStyle = (sIx % 2 === 0) ? STRIPE_A : STRIPE_B;
      ctx.fillRect(x + 2*u + sIx * 3*u, y + 2*u, 3*u, 3*u);
    }
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);     // bottom shadow
    // Wheels — stepped circles (whole-u)
    var wheels = [4, 12];
    for (var wi = 0; wi < 2; wi++) {
      var wx = x + wheels[wi] * u;
      ctx.fillStyle = WHEEL;
      ctx.fillRect(wx - u, y + 12*u, 2*u, u);
      ctx.fillRect(wx - 2*u, y + 13*u, 4*u, 2*u);
      ctx.fillRect(wx - u, y + 15*u, 2*u, u);
      ctx.fillStyle = HUB;
      ctx.fillRect(wx, y + 13*u, u, 2*u);
    }
    // Sign (4u × 1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y, 4*u, u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 6*u, y, 4*u, u);
    // Steam (1u animated)
    for (var stIx = 0; stIx < 3; stIx++) {
      var stY = y + ((Math.floor(time / 200) + stIx * 6) % 6) * u;
      ctx.globalAlpha = 0.6 - (stIx * 0.15);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(x + 7*u + stIx * u, stY, u, u);
    }
    ctx.globalAlpha = 1;
  }

  // Trash can — strict pixel art. 8u × 8u body with 1u left highlight,
  // 10u × 1u lid. Whole-u rects only.
  function drawTrashCan(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0a0a0e';
    var BODY = '#3a3a3a';
    var BODY_HI = '#5a5a5a';
    var BODY_SH = '#1a1a1e';
    // Body (8u × 8u, with outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, 9*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, 8*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 4*u, y + 5*u, u, 8*u);   // 1u left highlight
    ctx.fillStyle = BODY_SH;
    ctx.fillRect(x + 11*u, y + 5*u, u, 8*u);  // 1u right shadow
    // Vertical seams (1u dark)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 5*u, u, 8*u);
    // Lid (10u × 1u with outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 2*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, u);
    // Lid handle (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, u);
    // Recycle logo (3u × 3u stepped)
    ctx.fillStyle = '#40e080';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, 2*u);
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(x + 7*u, y + 8*u, u, u);
    // Shadow (1u)
    ctx.fillStyle = '#0a080e';
    ctx.fillRect(x + 4*u, y + 14*u, 8*u, u);
  }

  // Crosswalk — strict pixel art. Asphalt base + worn vertical 2u white stripes.
  function drawCrosswalk(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    // Asphalt base instead of sidewalk pavers
    var ASPHALT = '#1c1a26';
    var ASPHALT_LT = '#252330';
    var ASPHALT_DK = '#15131e';
    ctx.fillStyle = ASPHALT;
    ctx.fillRect(x, y, ts, ts);
    // Subtle grit specks — deterministic
    var seed = ((col || 0) * 31 + (row || 0) * 17) % 7;
    if (seed === 0) {
      ctx.fillStyle = ASPHALT_LT;
      ctx.fillRect(x + 3*u, y + 11*u, u, u);
    } else if (seed === 3) {
      ctx.fillStyle = ASPHALT_DK;
      ctx.fillRect(x + 12*u, y + 4*u, u, u);
    }
    // Worn white stripes — 2u wide, with a 1u dark groove and a 1u highlight
    var stripeXs = [0, 4, 8, 12];
    for (var i = 0; i < stripeXs.length; i++) {
      var sx = x + stripeXs[i] * u;
      ctx.fillStyle = '#0e0c14';
      ctx.fillRect(sx, y, 2*u, ts);
      ctx.fillStyle = '#c8c4b8';
      ctx.fillRect(sx, y, 2*u, ts);
      // 1u top highlight
      ctx.fillStyle = '#e8e4d0';
      ctx.fillRect(sx, y, u, ts);
      // Random scuff (deterministic per col,row,i)
      var scuffSeed = ((col || 0) * 17 + (row || 0) * 23 + i * 11) % 13;
      if (scuffSeed === 0) {
        ctx.fillStyle = ASPHALT;
        ctx.fillRect(sx, y + 4*u, 2*u, u);
      } else if (scuffSeed === 5) {
        ctx.fillStyle = ASPHALT;
        ctx.fillRect(sx, y + 11*u, 2*u, u);
      }
    }
  }

  // Asphalt road with center yellow lane stripe — paired with crosswalk to
  // sell the "this is a street, not a sidewalk" idea on the road row.
  function drawRoad(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var ASPHALT = '#1c1a26';
    var ASPHALT_LT = '#252330';
    var ASPHALT_DK = '#15131e';
    ctx.fillStyle = ASPHALT;
    ctx.fillRect(x, y, ts, ts);
    // Faint horizontal seams (1u)
    ctx.fillStyle = ASPHALT_DK;
    ctx.fillRect(x, y + 5*u, ts, u);
    ctx.fillRect(x, y + 11*u, ts, u);
    // 2u-wide yellow center lane stripe — dashed: only on every other column
    if (((col || 0) % 2) === 0) {
      ctx.fillStyle = '#0e0a04';
      ctx.fillRect(x + 7*u, y + 7*u, 2*u, 4*u);
      ctx.fillStyle = '#d8a050';
      ctx.fillRect(x + 7*u, y + 7*u, 2*u, 3*u);
      ctx.fillStyle = '#f8d090';
      ctx.fillRect(x + 7*u, y + 7*u, 2*u, u);
    }
    // 1u grit
    var seed = ((col || 0) * 23 + (row || 0) * 7) % 9;
    if (seed === 0) {
      ctx.fillStyle = ASPHALT_LT;
      ctx.fillRect(x + 2*u, y + 3*u, u, u);
    } else if (seed === 4) {
      ctx.fillStyle = ASPHALT_LT;
      ctx.fillRect(x + 13*u, y + 13*u, u, u);
    }
    // Faint wet-street reflection band
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#e870c0';
    ctx.fillRect(x, y + 9*u, ts, u);
    ctx.globalAlpha = 1;
  }

  function drawShopWindow(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawWallDark(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Window frame
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.max(1, u), y + 2*u, ts - 2*u, ts * 0.55);
    // Window glass — neon-tinted
    var phase = (col + row) % 3;
    var glassColor = phase === 0 ? '#3a1840' : (phase === 1 ? '#1a3040' : '#181a40');
    ctx.fillStyle = glassColor;
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, Math.floor(ts * 0.42));
    // Animated display item inside (silhouette)
    var itemPulse = 0.6 + Math.sin(time / 800 + col) * 0.2;
    ctx.globalAlpha = itemPulse;
    ctx.fillStyle = phase === 0 ? '#e870c0' : (phase === 1 ? '#70e0e8' : '#7080e8');
    if (phase === 0) {
      // Vinyl record
      ctx.beginPath();
      ctx.arc(x + ts/2, y + Math.floor(ts * 0.32), Math.max(1, u * 2.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#080418';
      ctx.beginPath();
      ctx.arc(x + ts/2, y + Math.floor(ts * 0.32), Math.max(1, u * 0.7), 0, Math.PI * 2);
      ctx.fill();
    } else if (phase === 1) {
      // Headphones / cyber gear silhouette
      ctx.fillRect(x + Math.floor(ts * 0.3), y + 4*u, Math.floor(ts * 0.4), 3*u);
      ctx.fillRect(x + Math.floor(ts * 0.25), y + 5*u, Math.max(1, u), 2*u);
      ctx.fillRect(x + Math.floor(ts * 0.7), y + 5*u, Math.max(1, u), 2*u);
    } else {
      // Books stacked
      ctx.fillRect(x + 4*u, y + 5*u, ts - 8*u, Math.max(1, u));
      ctx.fillRect(x + 3*u, y + 6*u, ts - 6*u, Math.max(1, u));
      ctx.fillRect(x + 4*u, y + 7*u, ts - 8*u, Math.max(1, u));
    }
    ctx.globalAlpha = 1;
    // Window mullions
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.floor(ts * 0.5) - Math.max(1, u * 0.3), y + 2*u, Math.max(1, u * 0.6), Math.floor(ts * 0.55));
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.32), ts - 4*u, Math.max(1, u * 0.5));
    // Reflection on glass
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + 2*u, y + 3*u, Math.max(1, u * 1.2), Math.floor(ts * 0.42));
  }

  // Traffic cone — strict pixel art. Stepped pyramid silhouette + 1u
  // white stripe + 6u × 1u base. Whole-u rects only.
  function drawTrafficCone(ctx, x, y, ts, time, col, row) {
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#3a1810';
    var ORANGE = '#e08030';
    var ORANGE_HI = '#ffa050';
    var WHITE = '#f0f0f0';
    var BASE = '#1a1a1e';
    // Stepped cone (whole-u: 2u, 4u, 6u tall stack)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 8*u);
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 6*u);
    ctx.fillRect(x + 5*u, y + 11*u, 6*u, 2*u);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 7*u);
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 5*u);
    ctx.fillRect(x + 5*u, y + 11*u, 6*u, u);
    // 1u top highlight
    ctx.fillStyle = ORANGE_HI;
    ctx.fillRect(x + 7*u, y + 5*u, u, 7*u);
    ctx.fillRect(x + 6*u, y + 7*u, u, 5*u);
    ctx.fillRect(x + 5*u, y + 11*u, u, u);
    // White stripe (1u high band, hard-edged)
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + 6*u, y + 9*u, 4*u, u);
    // Base (8u × 1u)
    ctx.fillStyle = BASE;
    ctx.fillRect(x + 4*u, y + 13*u, 8*u, u);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 4*u, y + 13*u, 8*u, u);
    // Shadow under (1u)
    ctx.fillStyle = '#0a080e';
    ctx.fillRect(x + 4*u, y + 14*u, 8*u, u);
  }

  // ---- Backdrop ----
  // Cyberpunk night sky for the outdoor street (Arcadia District).
  // Indoors (Arcadia Arcade) keeps a flat dark cabinet-hall background.
  var BG_STARS = null;
  var BG_SKYLINE = null;

  function ensureBgStars() {
    if (BG_STARS) return;
    BG_STARS = [];
    // Deterministic stars so they don't shimmer per resize
    for (var i = 0; i < 90; i++) {
      var s = Math.sin(i * 374.713) * 43758.5453;
      var rand1 = s - Math.floor(s);
      var s2 = Math.sin(i * 91.117) * 12345.6789;
      var rand2 = s2 - Math.floor(s2);
      var s3 = Math.sin(i * 17.31) * 9876.5432;
      var rand3 = s3 - Math.floor(s3);
      BG_STARS.push({
        x: rand1,
        y: rand2 * 0.55, // upper portion only
        size: rand3 < 0.85 ? 1 : 2,
        speed: 0.6 + rand3 * 0.8,
        phase: rand2 * 6.28,
        hue: rand3 < 0.4 ? 'pink' : (rand3 < 0.75 ? 'cyan' : 'white')
      });
    }
    // Distant skyline silhouette — deterministic block heights
    BG_SKYLINE = [];
    var skylineWidth = 64;
    for (var b = 0; b < skylineWidth; b++) {
      var sb = Math.sin(b * 51.91) * 1234.567;
      var rb = sb - Math.floor(sb);
      var sb2 = Math.sin(b * 17.713) * 4567.891;
      var rb2 = sb2 - Math.floor(sb2);
      BG_SKYLINE.push({
        h: 0.18 + rb * 0.32,
        windowSeed: rb2,
        antenna: rb < 0.18
      });
    }
  }

  function drawArcadiaBackground(ctx, w, h, time) {
    var worldData = BridgeWorld.getWorld();
    var isInterior = worldData && worldData.name === 'Arcadia Arcade';

    if (isInterior) {
      // Smooth cabinet-hall void color so void tiles fade out instead of
      // reading as raw black.
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0814');
      grad.addColorStop(1, '#08060f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    ensureBgStars();

    // Deep night sky gradient — magenta-purple top, hot pink horizon haze.
    // The lower bias is louder than realism — we want the sky to read as
    // "Blade Runner neon night" not a literal night sky.
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1a0828');
    sky.addColorStop(0.45, '#280a3a');
    sky.addColorStop(0.7, '#5a1850');
    sky.addColorStop(0.85, '#3a1a48');
    sky.addColorStop(1, '#180820');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal scanline-ish atmospheric haze bands
    ctx.globalAlpha = 0.08;
    for (var hb = 0; hb < 4; hb++) {
      var hbY = h * (0.18 + hb * 0.13);
      ctx.fillStyle = hb % 2 === 0 ? '#e870c0' : '#80e0e8';
      ctx.fillRect(0, hbY, w, 1);
    }
    ctx.globalAlpha = 1;

    // Distant moon/neon disk
    var moonX = w * 0.78;
    var moonY = h * 0.085;
    var moonR = Math.max(8, Math.min(w, h) * 0.025);
    var moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 5);
    moonGrad.addColorStop(0, 'rgba(255, 220, 180, 0.85)');
    moonGrad.addColorStop(0.3, 'rgba(255, 160, 220, 0.55)');
    moonGrad.addColorStop(0.7, 'rgba(160, 80, 200, 0.18)');
    moonGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = moonGrad;
    ctx.fillRect(moonX - moonR * 6, moonY - moonR * 6, moonR * 12, moonR * 12);
    ctx.fillStyle = 'rgba(255, 235, 210, 0.95)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    // Crater shadow (1 pixel)
    ctx.fillStyle = 'rgba(180, 140, 160, 0.55)';
    ctx.beginPath();
    ctx.arc(moonX - moonR * 0.35, moonY - moonR * 0.15, moonR * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Twinkling stars
    for (var i = 0; i < BG_STARS.length; i++) {
      var st = BG_STARS[i];
      var sx = Math.floor(st.x * w);
      var sy = Math.floor(st.y * h);
      var alpha = 0.45 + Math.sin(time / 600 * st.speed + st.phase) * 0.35;
      var color = st.hue === 'pink' ? 'rgba(232,140,200,' : (st.hue === 'cyan' ? 'rgba(120,220,232,' : 'rgba(240,240,255,');
      ctx.fillStyle = color + alpha.toFixed(2) + ')';
      ctx.fillRect(sx, sy, st.size, st.size);
    }

    // Distant skyline silhouette (parallax, 2 layers).
    // Position the skyline so its baseline sits where the top wall row begins,
    // so the buildings sit on the silhouette rather than floating above it.
    var camera = BridgeWorld.getCamera();
    var ts = BridgeWorld.getTileSize() * BridgeWorld.getScale();
    var camOffX = camera.x * ts;
    // The street's south wall is at row 13 (after our edits). The buildings
    // start around row 4 (top wall) and extend down. We want the skyline
    // baseline to sit just above row 4 in pixel coords.
    var topWallRow = 4;
    var topWallY = h / 2 - camera.y * ts + topWallRow * ts;

    // Far skyline (deeper, slower parallax)
    var skylineBaseY = topWallY + ts * 0.2;
    var skylineSlotW = w / 28;
    var farShift = (camOffX * 0.08) % skylineSlotW;
    ctx.fillStyle = '#1f0a2e';
    for (var b1 = 0; b1 < 32; b1++) {
      var sb = BG_SKYLINE[b1 % BG_SKYLINE.length];
      var bx = b1 * skylineSlotW - farShift - skylineSlotW;
      var bh = ts * (1.4 + sb.h * 1.6);
      ctx.fillRect(Math.floor(bx), Math.floor(skylineBaseY - bh), Math.ceil(skylineSlotW + 1), Math.ceil(bh + 2));
      // 1-2 lit windows
      if (sb.windowSeed > 0.5) {
        var wColor = sb.windowSeed > 0.85 ? 'rgba(232,120,200,0.7)' : 'rgba(120,220,232,0.55)';
        ctx.fillStyle = wColor;
        var winY = skylineBaseY - bh + bh * 0.4;
        ctx.fillRect(Math.floor(bx + skylineSlotW * 0.35), Math.floor(winY), Math.max(2, Math.floor(skylineSlotW * 0.18)), 2);
        ctx.fillStyle = '#1f0a2e';
      }
    }

    // Near skyline (closer, faster parallax, darker)
    var nearShift = (camOffX * 0.18) % skylineSlotW;
    ctx.fillStyle = '#10061d';
    for (var b2 = 0; b2 < 32; b2++) {
      var sb2 = BG_SKYLINE[(b2 + 7) % BG_SKYLINE.length];
      var bx2 = b2 * (skylineSlotW * 1.15) - nearShift - skylineSlotW;
      var bh2 = ts * (0.9 + sb2.h * 1.2);
      ctx.fillRect(Math.floor(bx2), Math.floor(skylineBaseY - bh2 + ts * 0.4), Math.ceil(skylineSlotW * 1.15 + 1), Math.ceil(bh2 + 2));
      if (sb2.antenna) {
        ctx.fillRect(Math.floor(bx2 + skylineSlotW * 0.5), Math.floor(skylineBaseY - bh2 + ts * 0.4 - 8), 1, 8);
        // Blinking antenna light
        var blink = ((Math.floor(time / 600) + b2) % 4) === 0;
        if (blink) {
          ctx.fillStyle = 'rgba(255,80,120,0.9)';
          ctx.fillRect(Math.floor(bx2 + skylineSlotW * 0.5), Math.floor(skylineBaseY - bh2 + ts * 0.4 - 9), 1, 1);
          ctx.fillStyle = '#10061d';
        }
      }
      if (sb2.windowSeed > 0.4) {
        var w2c = sb2.windowSeed > 0.7 ? 'rgba(255,160,200,0.8)' : 'rgba(160,240,255,0.65)';
        ctx.fillStyle = w2c;
        ctx.fillRect(Math.floor(bx2 + skylineSlotW * 0.4), Math.floor(skylineBaseY - bh2 + ts * 0.4 + bh2 * 0.5), Math.max(2, Math.floor(skylineSlotW * 0.2)), 2);
        ctx.fillStyle = '#10061d';
      }
    }

    // Drifting cyber-snow / embers (whole-pixel, deterministic seeds)
    for (var p = 0; p < 28; p++) {
      var ps = Math.sin(p * 173.31) * 5678.123;
      var pr = ps - Math.floor(ps);
      var ps2 = Math.sin(p * 51.713) * 4321.987;
      var pr2 = ps2 - Math.floor(ps2);
      var pSpeed = 0.04 + pr2 * 0.08;
      var px = (((pr * w) + (time * pSpeed * 0.18)) % (w + 40)) - 20;
      var pyBase = (pr2 * h * 0.85);
      var py = (pyBase + (time * pSpeed * 0.6) % h) % h;
      // Sway
      var sway = Math.sin(time / 800 + p) * 6;
      var alphaP = 0.35 + Math.sin(time / 700 + p * 1.3) * 0.25;
      ctx.fillStyle = pr < 0.6 ? 'rgba(232, 140, 220, ' + alphaP.toFixed(2) + ')' : 'rgba(140, 220, 232, ' + alphaP.toFixed(2) + ')';
      ctx.fillRect(Math.floor(px + sway), Math.floor(py), 1, 1);
    }

    // Drizzle — short diagonal streaks for foreground rain. Whole-pixel
    // values, deterministic per-frame seeds. Very subtle so it reads as
    // "atmospheric drizzle" not "downpour."
    for (var rd = 0; rd < 38; rd++) {
      var rs = Math.sin(rd * 53.713) * 9876.123;
      var rr = rs - Math.floor(rs);
      var rs2 = Math.sin(rd * 21.317) * 4567.987;
      var rr2 = rs2 - Math.floor(rs2);
      var speed = 0.55 + rr2 * 0.6;
      var rx = ((rr * w) + time * speed * 0.04) % (w + 60) - 30;
      var ry = ((rr2 * h) + time * speed * 0.55) % (h + 80) - 40;
      ctx.globalAlpha = 0.18 + rr * 0.18;
      ctx.fillStyle = rr < 0.5 ? 'rgba(220, 220, 240, 0.7)' : 'rgba(232, 200, 240, 0.5)';
      // Diagonal streak (3px tall, 1px wide, slight slant)
      ctx.fillRect(Math.floor(rx), Math.floor(ry), 1, 3);
      ctx.fillRect(Math.floor(rx) - 1, Math.floor(ry) + 2, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Periodic flying hover-craft passing across the upper sky
    var craftCycle = 12000;
    var craftT = (time % craftCycle) / craftCycle;
    if (craftT < 0.7) {
      var cx = -40 + craftT * (w + 80) / 0.7;
      var cy = h * 0.22 + Math.sin(craftT * Math.PI * 2) * 8;
      ctx.fillStyle = '#1a0820';
      ctx.fillRect(Math.floor(cx), Math.floor(cy), 14, 3);
      ctx.fillStyle = '#3a1840';
      ctx.fillRect(Math.floor(cx) + 2, Math.floor(cy), 10, 2);
      // Pink tail glow
      ctx.fillStyle = 'rgba(232,80,200,0.9)';
      ctx.fillRect(Math.floor(cx), Math.floor(cy) + 1, 2, 1);
      // Cyan headlight
      ctx.fillStyle = 'rgba(120,220,232,0.95)';
      ctx.fillRect(Math.floor(cx) + 13, Math.floor(cy) + 1, 1, 1);
      // Soft halo
      ctx.globalCompositeOperation = 'screen';
      var craftHalo = ctx.createRadialGradient(cx + 7, cy + 1, 0, cx + 7, cy + 1, 22);
      craftHalo.addColorStop(0, 'rgba(232,80,200,0.4)');
      craftHalo.addColorStop(1, 'transparent');
      ctx.fillStyle = craftHalo;
      ctx.fillRect(cx - 16, cy - 16, 50, 36);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Ground fog at the horizon — soft purple haze
    var fog = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.78);
    fog.addColorStop(0, 'transparent');
    fog.addColorStop(1, 'rgba(60, 20, 80, 0.45)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, h * 0.55, w, h * 0.25);
  }

  BridgeWorld.registerBackground('arcadia', drawArcadiaBackground);

  BridgeWorld.registerTileset('arcadia', {
    1: drawWall,
    2: drawFloor,
    3: drawFloorLight,
    4: drawWallDark,
    5: drawRunoutsCabinet,
    6: drawHighScoreBoard,
    7: drawEntrance,
    8: drawNeonSign,
    9: drawCabinet,
    10: drawFloorDark,
    11: drawFloorWorn,
    12: drawPoster,
    13: drawBrokenCabinet,
    14: drawSidewalk,
    15: drawLampPost,
    16: drawEntranceSign,
    17: drawBench,
    18: drawTable,
    19: drawVendingMachine,
    20: drawNpc,
    21: drawArcadeDoor,
    22: drawHoverBike,
    23: drawHoloBillboard,
    24: drawFoodCart,
    25: drawTrashCan,
    26: drawCrosswalk,
    27: drawShopWindow,
    28: drawTrafficCone,
    35: drawRoad,
    29: drawArcadeSignPng,
    30: drawArcadiaShopPng,
    31: drawNeonRamenStandPng,
    32: drawHoloBillboardKioskPng,
    33: drawTokenKioskPng,
    34: drawHoverBikeDockPng,
    36: drawArcadePng,
    37: drawCyberNoodleBarPng,
    38: drawTechRepairShopPng,
    39: drawChromeClinicPng,
    40: drawJunkPawnShopPng
  });

})();
