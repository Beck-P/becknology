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
    xhr.open('GET', '/bridge/assets/worlds/' + worldId + '.json');
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

    overlay.innerHTML =
      '<div class="world-hud">' +
        '<a class="world-back" id="world-back">&larr; LEAVE WORLD</a>' +
        '<div class="interact-prompt" id="interact-prompt"></div>' +
      '</div>';

    document.getElementById('world-back').addEventListener('click', function (e) {
      e.preventDefault();
      leave();
    });

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

    sailOverlay.innerHTML =
      '<div class="landing-text">SAILING...</div>' +
      '<div class="landing-subtitle" style="margin-top:16px;">' + (destinationName || destination).toUpperCase() + '</div>';

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

    // Pass 3: Character (on top of glow)
    BridgeCharacter.draw(ctx, camera.x, camera.y, tileSize, scale);
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
