/**
 * BridgeCharacter — Player character with grid-based movement.
 *
 * Moves tile-to-tile with smooth interpolation. Placeholder sprite
 * (colored square with direction dot) — swap for PNG sprite sheet later.
 *
 * Usage:
 *   BridgeCharacter.init(spawnX, spawnY)
 *   BridgeCharacter.update(collisionGrid)   — call each frame
 *   BridgeCharacter.draw(ctx, camX, camY, tileSize, scale)
 */
var BridgeCharacter = (function () {
  var player = {
    x: 0, y: 0,           // current tile position
    targetX: 0, targetY: 0, // destination tile
    moveProgress: 1,       // 0→1 interpolation (1 = arrived)
    facing: 'down',        // up/down/left/right
    walking: false,
    animFrame: 0,
    animTimer: 0,
    moveSpeed: 0.12,       // progress per frame
  };

  var SUIT_COLORS = {
    purple: '#a078dc',
    cyan:   '#5cc8d0',
    red:    '#d06060',
    green:  '#60b060',
    gold:   '#c8a840',
    white:  '#d0d0d0',
  };

  function init(spawnX, spawnY) {
    player.x = spawnX;
    player.y = spawnY;
    player.targetX = spawnX;
    player.targetY = spawnY;
    player.moveProgress = 1;
    player.facing = 'down';
    player.walking = false;
  }

  function getX() { return player.x; }
  function getY() { return player.y; }
  function getFacing() { return player.facing; }
  function isMoving() { return player.moveProgress < 1; }

  /** Get the interpolated render position (smooth between tiles). */
  function getRenderPos() {
    var p = Math.min(1, player.moveProgress);
    return {
      x: player.x + (player.targetX - player.x) * p,
      y: player.y + (player.targetY - player.y) * p
    };
  }

  /** Try to move in a direction. Returns true if movement started. */
  function tryMove(dx, dy, collisions, mapW, mapH) {
    // Update facing regardless of whether we can move
    if (dx < 0) player.facing = 'left';
    else if (dx > 0) player.facing = 'right';
    else if (dy < 0) player.facing = 'up';
    else if (dy > 0) player.facing = 'down';

    // Can't move if still interpolating
    if (player.moveProgress < 1) return false;

    var newX = player.x + dx;
    var newY = player.y + dy;

    // Bounds check
    if (newX < 0 || newX >= mapW || newY < 0 || newY >= mapH) return false;

    // Collision check
    if (collisions[newY] && collisions[newY][newX] === 1) return false;

    // Start movement
    player.targetX = newX;
    player.targetY = newY;
    player.moveProgress = 0;
    player.walking = true;
    return true;
  }

  /** Update movement interpolation. Call each frame. */
  function update() {
    if (player.moveProgress < 1) {
      player.moveProgress += player.moveSpeed;
      if (player.moveProgress >= 1) {
        player.moveProgress = 1;
        player.x = player.targetX;
        player.y = player.targetY;
        player.walking = false;
      }
      // Walk animation
      player.animTimer++;
      if (player.animTimer > 8) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 4;
      }
    } else {
      player.animFrame = 0;
    }
  }

  /** Draw the character. Placeholder: colored square + direction dot. */
  function draw(ctx, camX, camY, tileSize, scale) {
    var pos = getRenderPos();
    var dpr = window.devicePixelRatio || 1;
    var screenX = (pos.x - camX) * tileSize * scale + ctx.canvas.width / (2 * dpr);
    var screenY = (pos.y - camY) * tileSize * scale + ctx.canvas.height / (2 * dpr);
    var size = tileSize * scale;

    // Get suit color from pilot data
    var pilot = BridgeState.getPilot();
    var color = SUIT_COLORS[(pilot && pilot.suit_color) || 'purple'];

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(screenX + size * 0.1, screenY + size * 0.1, size * 0.8, size * 0.8);

    // Outline
    ctx.strokeStyle = '#0a0a16';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX + size * 0.1, screenY + size * 0.1, size * 0.8, size * 0.8);

    // Direction indicator (small dot showing which way we're facing)
    ctx.fillStyle = '#fff';
    var dotX = screenX + size * 0.5;
    var dotY = screenY + size * 0.5;
    var dotOff = size * 0.25;
    if (player.facing === 'up') dotY -= dotOff;
    else if (player.facing === 'down') dotY += dotOff;
    else if (player.facing === 'left') dotX -= dotOff;
    else if (player.facing === 'right') dotX += dotOff;

    ctx.beginPath();
    ctx.arc(dotX, dotY, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    init: init,
    getX: getX,
    getY: getY,
    getFacing: getFacing,
    isMoving: isMoving,
    getRenderPos: getRenderPos,
    tryMove: tryMove,
    update: update,
    draw: draw
  };
})();
