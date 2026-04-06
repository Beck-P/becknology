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

  // ---- Tileset Registry ----
  // Each tileset maps tile IDs to draw functions: fn(ctx, x, y, ts)
  // x, y = top-left screen pixel; ts = rendered tile size

  var TILESETS = {
    arcadia: {
      1: drawWall,
      2: drawFloor,
      3: drawFloorLight,
      4: drawWallDark,
      5: drawRunoutsCabinet,
      6: drawHighScoreBoard,
      7: drawEntrance,
      8: drawNeonSign,
      9: drawCabinet
    }
  };

  // ---- Arcadia Tile Draw Functions ----

  function drawFloor(ctx, x, y, ts) {
    var h = ts / 2;
    ctx.fillStyle = '#2a2240';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#2e2648';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
  }

  function drawFloorLight(ctx, x, y, ts) {
    var h = ts / 2;
    ctx.fillStyle = '#3a3260';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3e3670';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
  }

  function drawWall(ctx, x, y, ts) {
    var capH = Math.floor(ts * 0.3);
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x, y, ts, capH);
    ctx.fillStyle = '#2a2245';
    ctx.fillRect(x, y + capH, ts, ts - capH);
    // Brick lines
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x, y + Math.floor(ts * 0.5), ts, 1);
    ctx.fillRect(x + Math.floor(ts * 0.4), y + capH, 1, Math.floor(ts * 0.2));
    ctx.fillRect(x + Math.floor(ts * 0.7), y + Math.floor(ts * 0.5), 1, Math.floor(ts * 0.2));
    ctx.fillRect(x + Math.floor(ts * 0.2), y + Math.floor(ts * 0.7), 1, Math.floor(ts * 0.15));
  }

  function drawWallDark(ctx, x, y, ts) {
    var capH = Math.floor(ts * 0.3);
    ctx.fillStyle = '#151230';
    ctx.fillRect(x, y, ts, capH);
    ctx.fillStyle = '#201a3a';
    ctx.fillRect(x, y + capH, ts, ts - capH);
    ctx.fillStyle = '#151230';
    ctx.fillRect(x, y + Math.floor(ts * 0.5), ts, 1);
    ctx.fillRect(x + Math.floor(ts * 0.4), y + capH, 1, Math.floor(ts * 0.2));
    ctx.fillRect(x + Math.floor(ts * 0.7), y + Math.floor(ts * 0.5), 1, Math.floor(ts * 0.2));
  }

  function drawCabinet(ctx, x, y, ts) {
    var u = ts / 16;
    // Body
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    // Screen top edge
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Screen
    ctx.fillStyle = '#3855a0';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, Math.floor(ts * 0.35));
    // Screen glint
    ctx.fillStyle = '#8090c0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, 2*u, 2*u);
    // Controls
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    // Joystick
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    // Legs
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawRunoutsCabinet(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Pink screen
    ctx.fillStyle = '#d06090';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, Math.floor(ts * 0.35));
    // Brighter glint
    ctx.fillStyle = '#f0a0c0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, 2*u, 2*u);
    // Controls
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    // Legs
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawHighScoreBoard(ctx, x, y, ts) {
    var u = ts / 16;
    // Panel body
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    // Screen
    ctx.fillStyle = '#40b060';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 7*u);
    // Text lines
    ctx.fillStyle = '#2a7040';
    for (var i = 0; i < 4; i++) {
      ctx.fillRect(x + 4*u, y + (4 + i * 2)*u, ts - 8*u, u);
    }
    // Frame
    ctx.strokeStyle = '#2a4a2a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
  }

  function drawNeonSign(ctx, x, y, ts) {
    var u = ts / 16;
    // Sign body
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + u, y + u, ts - 2*u, Math.floor(ts * 0.35));
    // Neon bar
    ctx.fillStyle = '#c040d0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.2));
    // Mounting brackets
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.4), u, 3*u);
    ctx.fillRect(x + ts - 3*u, y + Math.floor(ts * 0.4), u, 3*u);
    // Wall below sign
    var capH = Math.floor(ts * 0.3);
    ctx.fillStyle = '#2a2245';
    ctx.fillRect(x, y + Math.floor(ts * 0.55), ts, ts - Math.floor(ts * 0.55));
  }

  function drawEntrance(ctx, x, y, ts) {
    // Floor base
    drawFloor(ctx, x, y, ts);
    // Threshold line
    ctx.fillStyle = '#4a4268';
    ctx.fillRect(x, y, ts, Math.max(1, ts / 16));
    ctx.fillRect(x, y + ts - Math.max(1, ts / 16), ts, Math.max(1, ts / 16));
  }

  // ---- Glow Helpers ----

  function drawGlow(ctx, cx, cy, radius, r, g, b, alpha) {
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
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

  function update() {
    if (!active || !world) return;

    // Poll controls → move character
    var dir = BridgeControls.getDir();
    if (dir.dx !== 0 || dir.dy !== 0) {
      BridgeCharacter.tryMove(dir.dx, dir.dy, world.collisions, world.width, world.height);
    }

    // Update character animation
    BridgeCharacter.update();

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

    // Check interactions
    if (typeof BridgeInteractions !== 'undefined') {
      BridgeInteractions.update(world, BridgeCharacter, BridgeControls);
    }
  }

  function draw(ctx, w, h) {
    if (!active || !world) return;

    var ts = tileSize * scale;
    var tileset = TILESETS[world.tileset] || {};

    // Viewport offset (camera centered on screen)
    var offX = w / 2 - camera.x * ts;
    var offY = h / 2 - camera.y * ts;

    // Determine visible tile range
    var startCol = Math.max(0, Math.floor(-offX / ts));
    var startRow = Math.max(0, Math.floor(-offY / ts));
    var endCol = Math.min(world.width, Math.ceil((w - offX) / ts));
    var endRow = Math.min(world.height, Math.ceil((h - offY) / ts));

    // Pass 1: Draw tiles
    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var tileId = world.tiles[row][col];
        if (tileId === 0) continue;

        var tx = Math.floor(offX + col * ts);
        var ty = Math.floor(offY + row * ts);
        var drawFn = tileset[tileId];

        if (drawFn) {
          drawFn(ctx, tx, ty, Math.ceil(ts));
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
    getCamera: function () { return camera; },
    getScale: function () { return scale; },
    getTileSize: function () { return tileSize; }
  };
})();
