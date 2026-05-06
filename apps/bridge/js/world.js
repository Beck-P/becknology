/**
 * BridgeWorld — Tile renderer + camera.
 *
 * Loads a world JSON, renders tiles via tileset registry (per-type draw functions).
 * Data-driven glow system reads tileGlow/ambientGlow from world JSON.
 * Camera follows the player with smooth lerp, clamped to map edges.
 */
var BridgeWorld = (function () {
  var world = null;
  var camera = { x: 0, y: 0 };
  var tileSize = 16;
  var scale = 3;
  var active = false;
  var overlay = null;

  // ---- Ambient Particles ----
  var particles = [];
  var PARTICLE_COUNT = 25;

  // ---- Tileset Registry ----
  // World modules register tilesets via registerTileset(name, { tileId: drawFn })
  // Each draw function signature: fn(ctx, x, y, ts)

  var TILESETS = {};
  var BACKGROUNDS = {};

  function registerTileset(name, drawFns) {
    TILESETS[name] = drawFns;
  }

  function registerBackground(name, drawFn) {
    BACKGROUNDS[name] = drawFn;
  }

  // ---- Glow Helpers ----

  function drawGlow(ctx, cx, cy, radius, r, g, b, alpha) {
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  function initParticles() {
    particles = [];
    if (!world || !world.tileGlow) return;
    var glowTiles = [];
    for (var row = 0; row < world.height; row++) {
      for (var col = 0; col < world.width; col++) {
        var tid = world.tiles[row][col];
        if (world.tileGlow[String(tid)]) {
          glowTiles.push({ x: col, y: row, glow: world.tileGlow[String(tid)] });
        }
      }
    }
    if (glowTiles.length === 0) return;
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var src = glowTiles[Math.floor(Math.random() * glowTiles.length)];
      particles.push(spawnParticle(src));
    }
  }

  function spawnParticle(src) {
    return {
      x: src.x + (Math.random() - 0.5) * 3,
      y: src.y + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 0.005,
      vy: -Math.random() * 0.008 - 0.002,
      life: Math.random(),
      maxLife: 0.8 + Math.random() * 0.4,
      r: src.glow.color[0],
      g: src.glow.color[1],
      b: src.glow.color[2],
      srcX: src.x,
      srcY: src.y
    };
  }

  function updateParticles() {
    if (!world || !world.tileGlow || particles.length === 0) return;
    var glowTiles = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += 0.008;
      var dx = p.x - p.srcX;
      var dy = p.y - p.srcY;
      if (p.life >= p.maxLife || (dx*dx + dy*dy) > 9) {
        if (glowTiles.length === 0) {
          for (var row = 0; row < world.height; row++) {
            for (var col = 0; col < world.width; col++) {
              var tid = world.tiles[row][col];
              if (world.tileGlow[String(tid)]) {
                glowTiles.push({ x: col, y: row, glow: world.tileGlow[String(tid)] });
              }
            }
          }
        }
        if (glowTiles.length > 0) {
          var src = glowTiles[Math.floor(Math.random() * glowTiles.length)];
          particles[i] = spawnParticle(src);
        }
      }
    }
  }

  function drawParticles(ctx, offX, offY, ts) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var alpha = p.life < 0.2
        ? p.life / 0.2
        : Math.max(0, 1 - (p.life - 0.2) / (p.maxLife - 0.2));
      alpha *= 0.6;
      if (alpha <= 0) continue;
      var sx = offX + p.x * ts;
      var sy = offY + p.y * ts;
      ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha.toFixed(2) + ')';
      ctx.fillRect(sx, sy, Math.max(1, ts * 0.06), Math.max(1, ts * 0.06));
    }
  }

  function load(worldId, callback) {
    var xhr = new XMLHttpRequest();
    // Cache-bust so JSON edits land without a hard reload (cheap — JSONs are tiny).
    xhr.open('GET', '/bridge/assets/worlds/' + worldId + '.json?v=' + Date.now());
    xhr.onload = function () {
      if (xhr.status === 200) {
        world = JSON.parse(xhr.responseText);
        tileSize = world.tileSize || 16;
        callback(world);
      }
    };
    xhr.send();
  }

  function getWorld() { return world; }
  function isActive() { return active; }

  function show(spawnOverride) {
    if (!world) return;
    active = true;

    overlay = document.getElementById('world-overlay');
    overlay.style.display = 'block';
    overlay.classList.add('active');

    // Always render an always-visible exit affordance — players should never
    // get stranded inside a world. The "LEAVE WORLD" link is the universal
    // escape hatch even for worlds that have a ship-tile exit.
    overlay.innerHTML =
      '<div class="world-hud">' +
        '<a class="world-back" id="world-back" title="Esc">&#9210; LEAVE WORLD</a>' +
        '<div class="interact-prompt" id="interact-prompt"></div>' +
      '</div>';

    document.getElementById('world-back').addEventListener('click', function (e) {
      e.preventDefault();
      leave();
    });

    // Esc as a global hotkey while in a world.
    if (!window.__bridgeEscBound) {
      window.__bridgeEscBound = true;
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && BridgeState.getState() === 'world' && active) {
          // If a dialog is open, let the dialog handler take it.
          if (document.getElementById('world-dialog')) return;
          e.preventDefault();
          leave();
        }
      });
    }

    // Init camera and character at spawn or restored position
    var sx = spawnOverride ? spawnOverride.x : world.spawns.player[0];
    var sy = spawnOverride ? spawnOverride.y : world.spawns.player[1];
    camera.x = sx;
    camera.y = sy;
    BridgeCharacter.init(sx, sy);
    initParticles();

    // Enable controls
    BridgeControls.enable();

    // Show d-pad on mobile
    if (window.innerWidth <= 768) {
      document.getElementById('dpad').style.display = 'grid';
    }

    // Calculate scale based on screen size
    recalcScale();
    window.addEventListener('resize', recalcScale);
  }

  function recalcScale() {
    // Aim for ~18-22 tiles visible horizontally
    var targetTilesX = 20;
    scale = Math.max(2, Math.floor(window.innerWidth / (tileSize * targetTilesX)));
  }

  function leave() {
    active = false;
    BridgeControls.disable();
    window.removeEventListener('resize', recalcScale);

    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }

    var dpad = document.getElementById('dpad');
    if (dpad) dpad.style.display = 'none';

    // Clear world position — player chose to leave
    BridgeState.clearWorldPos();
    BridgeState.transition('cockpit');
  }

  function sailTo(destination, destinationName) {
    if (!active) return;
    BridgeControls.disable();

    // Show sailing overlay
    var sailOverlay = document.getElementById('landing-overlay');
    sailOverlay.style.display = 'flex';
    sailOverlay.style.flexDirection = 'column';
    sailOverlay.style.alignItems = 'center';
    sailOverlay.style.justifyContent = 'center';
    sailOverlay.classList.add('active');
    sailOverlay.style.opacity = '1';
    sailOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
    sailOverlay.style.transition = 'opacity 1s';

    // Sailing animation — a small ship glyph drifting across with wake
    sailOverlay.innerHTML =
      '<div class="sail-anim" style="position:relative;width:280px;height:32px;margin-bottom:18px;overflow:hidden;">' +
        '<div class="sail-ship" style="position:absolute;top:8px;left:-40px;font-family:\'Courier New\',monospace;font-size:18px;color:#cfcfd8;letter-spacing:2px;animation:sail-glide 2.6s ease-in forwards;">⛵</div>' +
        '<div class="sail-wake" style="position:absolute;top:18px;left:0;right:0;height:2px;background:repeating-linear-gradient(90deg,rgba(120,160,200,0.35) 0,rgba(120,160,200,0.35) 8px,transparent 8px,transparent 14px);opacity:0.7;"></div>' +
      '</div>' +
      '<style>@keyframes sail-glide { from { left: -40px; } to { left: calc(100% + 20px); } }</style>' +
      '<div class="landing-text">SAILING...</div>' +
      '<div class="landing-subtitle" style="margin-top:12px;">' + (destinationName || destination).toUpperCase() + '</div>';

    // Load the destination zone
    load(destination, function () {
      // After 2s, fade out and show new zone
      setTimeout(function () {
        sailOverlay.style.opacity = '0';
        setTimeout(function () {
          sailOverlay.style.display = 'none';
          sailOverlay.classList.remove('active');
          // Re-show world with new zone data
          if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
          }
          show();
          BridgeControls.enable();
        }, 1000);
      }, 1500);
    });
  }

  function update() {
    if (!active || !world) return;

    // Poll controls → move character
    var dir = BridgeControls.getDir();
    if (dir.dx !== 0 || dir.dy !== 0) {
      BridgeCharacter.tryMove(dir.dx, dir.dy, world.collisions, world.width, world.height);
    }

    // Update character animation
    BridgeCharacter.update();

    if (world.fixedCamera) {
      // Fixed camera: center on map
      camera.x = world.width / 2;
      camera.y = world.height / 2;
    } else {
      // Smooth camera follow
      var pos = BridgeCharacter.getRenderPos();
      camera.x += (pos.x - camera.x) * 0.1;
      camera.y += (pos.y - camera.y) * 0.1;

      // Clamp camera to map edges
      var screenW = window.innerWidth;
      var screenH = window.innerHeight;
      var halfW = screenW / (2 * tileSize * scale);
      var halfH = screenH / (2 * tileSize * scale);

      camera.x = Math.max(halfW, Math.min(world.width - halfW, camera.x));
      camera.y = Math.max(halfH, Math.min(world.height - halfH, camera.y));
    }

    // Check interactions
    if (typeof BridgeInteractions !== 'undefined') {
      BridgeInteractions.update(world, BridgeCharacter, BridgeControls);
    }

    updateParticles();
  }

  function draw(ctx, w, h) {
    if (!active || !world) return;

    var ts = tileSize * scale;
    var tileset = TILESETS[world.tileset] || {};
    var now = Date.now();

    // Viewport offset (camera centered on screen)
    var offX = w / 2 - camera.x * ts;
    var offY = h / 2 - camera.y * ts;

    // Determine visible tile range
    var startCol = Math.max(0, Math.floor(-offX / ts));
    var startRow = Math.max(0, Math.floor(-offY / ts));
    var endCol = Math.min(world.width, Math.ceil((w - offX) / ts));
    var endRow = Math.min(world.height, Math.ceil((h - offY) / ts));

    // Pass 0: Custom background (if world has one registered)
    var bgFn = BACKGROUNDS[world.tileset];
    if (bgFn) {
      bgFn(ctx, w, h, now);
    }

    // Pass 1: Draw tiles
    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var tileId = world.tiles[row][col];
        if (tileId === 0) continue;

        var tx = Math.floor(offX + col * ts);
        var ty = Math.floor(offY + row * ts);
        var drawFn = tileset[tileId];

        if (drawFn) {
          drawFn(ctx, tx, ty, Math.ceil(ts), now, col, row);
        } else {
          // Fallback to flat color
          var color = world.tileColors[String(tileId)];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(tx, ty, Math.ceil(ts), Math.ceil(ts));
          }
        }
      }
    }

    // Pass 1.5: Interactive tile highlights
    if (world.interactions) {
      var px = BridgeCharacter.getX();
      var py = BridgeCharacter.getY();
      var facing = BridgeCharacter.getFacing();
      var checkX = px + (facing === 'right' ? 1 : facing === 'left' ? -1 : 0);
      var checkY = py + (facing === 'down' ? 1 : facing === 'up' ? -1 : 0);

      for (var i = 0; i < world.interactions.length; i++) {
        var inter = world.interactions[i];
        if (inter.x === checkX && inter.y === checkY && !BridgeCharacter.isMoving()) {
          var hx = Math.floor(offX + inter.x * ts);
          var hy = Math.floor(offY + inter.y * ts);
          var hPulse = 0.3 + Math.sin(now / 400) * 0.2;
          ctx.strokeStyle = 'rgba(40, 220, 80, ' + hPulse.toFixed(2) + ')';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx + 1, hy + 1, Math.ceil(ts) - 2, Math.ceil(ts) - 2);
        }
      }
    }

    // Pass 2: Glow (data-driven from world JSON)
    if (world.tileGlow) {
      ctx.globalCompositeOperation = 'screen';

      for (var row = startRow; row < endRow; row++) {
        for (var col = startCol; col < endCol; col++) {
          var tileId = world.tiles[row][col];
          var glow = world.tileGlow[String(tileId)];
          if (!glow) continue;

          var cx = offX + (col + 0.5) * ts;
          var cy = offY + (row + 0.5) * ts;
          var radius = ts * glow.radius;
          drawGlow(ctx, cx, cy, radius, glow.color[0], glow.color[1], glow.color[2], glow.alpha);
        }
      }

      // Ambient glow
      if (world.ambientGlow) {
        var ag = world.ambientGlow;
        var acx = w / 2;
        var acy = h / 2;
        var ar = w * ag.radius;
        drawGlow(ctx, acx, acy, ar, ag.color[0], ag.color[1], ag.color[2], ag.alpha);
      }

      // Ambient particles
      drawParticles(ctx, offX, offY, ts);

      ctx.globalCompositeOperation = 'source-over';
    }

    // Pass 2.7: Exit beacons — pulsing arrow over every leave_world tile so
    // the way back to the ship is impossible to miss.
    if (world.interactions) {
      var beat = (Math.sin(now / 350) + 1) * 0.5; // 0..1
      for (var bi = 0; bi < world.interactions.length; bi++) {
        var bint = world.interactions[bi];
        if (bint.type !== 'leave_world') continue;
        var bx = Math.floor(offX + bint.x * ts);
        var by = Math.floor(offY + bint.y * ts);
        // Soft halo
        ctx.globalCompositeOperation = 'screen';
        var bg = ctx.createRadialGradient(bx + ts/2, by + ts/2, 0, bx + ts/2, by + ts/2, ts * 1.4);
        bg.addColorStop(0, 'rgba(120, 220, 255, ' + (0.35 + beat * 0.35).toFixed(2) + ')');
        bg.addColorStop(1, 'transparent');
        ctx.fillStyle = bg;
        ctx.fillRect(bx - ts, by - ts, ts * 3, ts * 3);
        ctx.globalCompositeOperation = 'source-over';
        // Floating "↑ EXIT" arrow above the tile
        var floatY = by - ts * 0.6 - beat * (ts * 0.18);
        var arrowAlpha = 0.85 + beat * 0.15;
        ctx.fillStyle = 'rgba(180, 235, 255, ' + arrowAlpha.toFixed(2) + ')';
        var arrowW = ts * 0.5;
        var arrowCx = bx + ts/2;
        // Triangle head
        ctx.beginPath();
        ctx.moveTo(arrowCx, floatY);
        ctx.lineTo(arrowCx - arrowW/2, floatY + arrowW * 0.6);
        ctx.lineTo(arrowCx + arrowW/2, floatY + arrowW * 0.6);
        ctx.closePath();
        ctx.fill();
        // Arrow stem
        ctx.fillRect(arrowCx - arrowW * 0.18, floatY + arrowW * 0.55, arrowW * 0.36, arrowW * 0.55);
        // "EXIT" label
        ctx.font = 'bold ' + Math.max(8, Math.floor(ts * 0.18)) + 'px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(220, 245, 255, ' + arrowAlpha.toFixed(2) + ')';
        ctx.fillText('EXIT', arrowCx, floatY - ts * 0.05);
        ctx.textAlign = 'start';
      }
    }

    // Pass 3: Character (on top of glow)
    BridgeCharacter.draw(ctx, camera.x, camera.y, tileSize, scale);

    // Pass 4: Edge vignette — soften abrupt black map edges so out-of-bounds
    // areas read as a fade rather than a sharp render boundary.
    var vignetteW = Math.min(120, w * 0.12);
    var grad = ctx.createLinearGradient(0, 0, vignetteW, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vignetteW, h);
    var grad2 = ctx.createLinearGradient(w - vignetteW, 0, w, 0);
    grad2.addColorStop(0, 'transparent');
    grad2.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad2;
    ctx.fillRect(w - vignetteW, 0, vignetteW, h);
    var grad3 = ctx.createLinearGradient(0, 0, 0, vignetteW);
    grad3.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad3.addColorStop(1, 'transparent');
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, w, vignetteW);
    var grad4 = ctx.createLinearGradient(0, h - vignetteW, 0, h);
    grad4.addColorStop(0, 'transparent');
    grad4.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad4;
    ctx.fillRect(0, h - vignetteW, w, vignetteW);
  }

  return {
    load: load,
    getWorld: getWorld,
    isActive: isActive,
    show: show,
    leave: leave,
    update: update,
    draw: draw,
    sailTo: sailTo,
    registerTileset: registerTileset,
    registerBackground: registerBackground,
    getCamera: function () { return camera; },
    getScale: function () { return scale; },
    getTileSize: function () { return tileSize; }
  };
})();
