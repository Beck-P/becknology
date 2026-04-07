/**
 * BridgeCharacter — Player character with grid-based movement.
 *
 * ¾ view procedural sprite with 3-frame walk cycle + body bob.
 * Suit color from pilot data. Swap draw() internals for PNG sprite sheet later.
 *
 * Usage:
 *   BridgeCharacter.init(spawnX, spawnY)
 *   BridgeCharacter.update()   — call each frame
 *   BridgeCharacter.draw(ctx, camX, camY, tileSize, scale)
 */
var BridgeCharacter = (function () {
  var player = {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    moveProgress: 1,
    facing: 'down',
    walking: false,
    animFrame: 0,     // 0-3: cycle is 0→1→0→2 (stand/left/stand/right)
    animTimer: 0,
    moveSpeed: 0.12,
  };

  var SUIT_COLORS = {
    purple: { base: '#a078dc', light: '#c0a8ee', dark: '#6048a0' },
    cyan:   { base: '#5cc8d0', light: '#8ce0e8', dark: '#388890' },
    red:    { base: '#d06060', light: '#e89090', dark: '#903838' },
    green:  { base: '#60b060', light: '#90d090', dark: '#387838' },
    gold:   { base: '#c8a840', light: '#e0c870', dark: '#887028' },
    white:  { base: '#d0d0d0', light: '#f0f0f0', dark: '#909090' },
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

  /** Helper: fill a "pixel" rectangle scaled to tile size. */
  function px(ctx, sx, sy, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(sx + x, sy + y, w, h);
  }

  /** Get walk frame: 3-frame cycle mapped from animFrame 0-3 → stand/left/stand/right */
  function getWalkFrame() {
    // 0→stand, 1→left step, 2→stand, 3→right step
    var f = player.animFrame;
    if (f === 0 || f === 2) return 0;
    if (f === 1) return 1;
    return 2;
  }

  /** Draw the character — ¾ view procedural sprite with walk animation. */
  function draw(ctx, camX, camY, tileSize, scale) {
    var pos = getRenderPos();
    var dpr = window.devicePixelRatio || 1;
    var sx = (pos.x - camX) * tileSize * scale + ctx.canvas.width / (2 * dpr);
    var sy = (pos.y - camY) * tileSize * scale + ctx.canvas.height / (2 * dpr);
    var ts = tileSize * scale;

    var pilot = BridgeState.getPilot();
    var colors = SUIT_COLORS[(pilot && pilot.suit_color) || 'purple'];
    var base = colors.base;
    var light = colors.light;
    var dark = colors.dark;
    var outline = '#0a0a16';

    // Unit size (1 game pixel at current scale)
    var u = ts / 16;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + ts * 0.5, sy + ts - u, ts * 0.35, ts * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    var wf = getWalkFrame();
    // Body bob: shift up 1 unit on step frames, idle breathing when standing
    var bob = player.walking ? ((wf !== 0) ? -u : 0) : Math.sin(Date.now() / 800) * u * 0.5;

    if (player.facing === 'down') {
      // Head
      px(ctx, sx, sy, 4*u, (1*u)+bob, 8*u, 5*u, base);
      px(ctx, sx, sy, 5*u, (1*u)+bob, 6*u, u, light);  // hair highlight
      // Eyes
      px(ctx, sx, sy, 5*u, (3*u)+bob, 2*u, 2*u, outline);
      px(ctx, sx, sy, 9*u, (3*u)+bob, 2*u, 2*u, outline);
      // Body
      px(ctx, sx, sy, 3*u, (6*u)+bob, 10*u, 5*u, base);
      px(ctx, sx, sy, 3*u, (9*u)+bob, 10*u, u, dark);  // belt
      // Legs
      if (wf === 0) {
        px(ctx, sx, sy, 4*u, (11*u)+bob, 3*u, 4*u, base);
        px(ctx, sx, sy, 9*u, (11*u)+bob, 3*u, 4*u, base);
      } else if (wf === 1) {
        px(ctx, sx, sy, 3*u, (11*u)+bob, 3*u, 4*u, base);
        px(ctx, sx, sy, 10*u, (11*u)+bob, 3*u, 3*u, base);
      } else {
        px(ctx, sx, sy, 4*u, (11*u)+bob, 3*u, 3*u, base);
        px(ctx, sx, sy, 10*u, (11*u)+bob, 3*u, 4*u, base);
      }
      // Feet
      px(ctx, sx, sy, 3*u, 14*u, 4*u, u, outline);
      px(ctx, sx, sy, 9*u, 14*u, 4*u, u, outline);

    } else if (player.facing === 'up') {
      // Head (back view — no eyes, more hair)
      px(ctx, sx, sy, 4*u, (1*u)+bob, 8*u, 5*u, dark);
      px(ctx, sx, sy, 4*u, (1*u)+bob, 8*u, 2*u, base); // hair back
      // Body
      px(ctx, sx, sy, 3*u, (6*u)+bob, 10*u, 5*u, base);
      px(ctx, sx, sy, 3*u, (6*u)+bob, 10*u, u, dark);  // collar
      // Legs
      if (wf === 0) {
        px(ctx, sx, sy, 4*u, (11*u)+bob, 3*u, 4*u, base);
        px(ctx, sx, sy, 9*u, (11*u)+bob, 3*u, 4*u, base);
      } else if (wf === 1) {
        px(ctx, sx, sy, 3*u, (11*u)+bob, 3*u, 4*u, base);
        px(ctx, sx, sy, 10*u, (11*u)+bob, 3*u, 3*u, base);
      } else {
        px(ctx, sx, sy, 4*u, (11*u)+bob, 3*u, 3*u, base);
        px(ctx, sx, sy, 10*u, (11*u)+bob, 3*u, 4*u, base);
      }
      // Feet
      px(ctx, sx, sy, 3*u, 14*u, 4*u, u, outline);
      px(ctx, sx, sy, 9*u, 14*u, 4*u, u, outline);

    } else if (player.facing === 'left') {
      // Head (profile — narrower, one eye)
      px(ctx, sx, sy, 4*u, (1*u)+bob, 7*u, 5*u, base);
      px(ctx, sx, sy, 5*u, (1*u)+bob, 6*u, u, light);
      px(ctx, sx, sy, 5*u, (3*u)+bob, 2*u, 2*u, outline); // eye
      // Body (narrower)
      px(ctx, sx, sy, 4*u, (6*u)+bob, 8*u, 5*u, base);
      px(ctx, sx, sy, 4*u, (9*u)+bob, 8*u, u, dark);
      // Legs
      if (wf === 0) {
        px(ctx, sx, sy, 5*u, (11*u)+bob, 3*u, 4*u, base);
        px(ctx, sx, sy, 8*u, (11*u)+bob, 3*u, 4*u, dark);
      } else if (wf === 1) {
        px(ctx, sx, sy, 4*u, (11*u)+bob, 3*u, 4*u, base);
        px(ctx, sx, sy, 9*u, (11*u)+bob, 3*u, 3*u, dark);
      } else {
        px(ctx, sx, sy, 5*u, (11*u)+bob, 3*u, 3*u, base);
        px(ctx, sx, sy, 8*u, (11*u)+bob, 3*u, 4*u, dark);
      }
      // Feet
      px(ctx, sx, sy, 4*u, 14*u, 4*u, u, outline);
      px(ctx, sx, sy, 8*u, 14*u, 3*u, u, outline);

    } else { // right
      // Head (profile — mirrored)
      px(ctx, sx, sy, 5*u, (1*u)+bob, 7*u, 5*u, base);
      px(ctx, sx, sy, 5*u, (1*u)+bob, 6*u, u, light);
      px(ctx, sx, sy, 9*u, (3*u)+bob, 2*u, 2*u, outline); // eye
      // Body
      px(ctx, sx, sy, 4*u, (6*u)+bob, 8*u, 5*u, base);
      px(ctx, sx, sy, 4*u, (9*u)+bob, 8*u, u, dark);
      // Legs
      if (wf === 0) {
        px(ctx, sx, sy, 5*u, (11*u)+bob, 3*u, 4*u, dark);
        px(ctx, sx, sy, 8*u, (11*u)+bob, 3*u, 4*u, base);
      } else if (wf === 1) {
        px(ctx, sx, sy, 4*u, (11*u)+bob, 3*u, 3*u, dark);
        px(ctx, sx, sy, 9*u, (11*u)+bob, 3*u, 4*u, base);
      } else {
        px(ctx, sx, sy, 5*u, (11*u)+bob, 3*u, 4*u, dark);
        px(ctx, sx, sy, 8*u, (11*u)+bob, 3*u, 3*u, base);
      }
      // Feet
      px(ctx, sx, sy, 4*u, 14*u, 3*u, u, outline);
      px(ctx, sx, sy, 8*u, 14*u, 4*u, u, outline);
    }
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
