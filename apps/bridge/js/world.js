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
  // World modules register tilesets via registerTileset(name, { tileId: drawFn })
  // Each draw function signature: fn(ctx, x, y, ts)

  var TILESETS = {};

  function registerTileset(name, drawFns) {
    TILESETS[name] = drawFns;
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
    registerTileset: registerTileset,
    getCamera: function () { return camera; },
    getScale: function () { return scale; },
    getTileSize: function () { return tileSize; }
  };
})();
