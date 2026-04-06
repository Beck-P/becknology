/**
 * BridgeWorld — Tile renderer + camera.
 *
 * Loads a world JSON, renders tiles as colored rectangles (placeholder).
 * Camera follows the player with smooth lerp, clamped to map edges.
 *
 * Usage:
 *   BridgeWorld.load('arcadia', callback)
 *   BridgeWorld.update()
 *   BridgeWorld.draw(ctx, w, h)
 */
var BridgeWorld = (function () {
  var world = null;    // loaded world data
  var camera = { x: 0, y: 0 };
  var tileSize = 16;
  var scale = 3;
  var active = false;
  var overlay = null;

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

    // Viewport offset (camera centered on screen)
    var offX = w / 2 - camera.x * ts;
    var offY = h / 2 - camera.y * ts;

    // Determine visible tile range
    var startCol = Math.max(0, Math.floor(-offX / ts));
    var startRow = Math.max(0, Math.floor(-offY / ts));
    var endCol = Math.min(world.width, Math.ceil((w - offX) / ts));
    var endRow = Math.min(world.height, Math.ceil((h - offY) / ts));

    // Draw tiles
    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        var tileId = world.tiles[row][col];
        var color = world.tileColors[String(tileId)];
        if (!color) continue; // transparent/void

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(offX + col * ts),
          Math.floor(offY + row * ts),
          Math.ceil(ts),
          Math.ceil(ts)
        );

        // Tile grid lines (subtle, for placeholder tiles)
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(
          Math.floor(offX + col * ts),
          Math.floor(offY + row * ts),
          Math.ceil(ts),
          Math.ceil(ts)
        );
      }
    }

    // Draw character
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
