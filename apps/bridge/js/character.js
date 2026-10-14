/**
 * BridgeCharacter — Player character with grid-based movement.
 *
 * Sprite-sheet pilot rendered from a Blender model (tools/bridge-art/pilot.py):
 * 4-frame idle + 8-frame walk in four directions, one sheet per suit colour.
 * The old procedural ¾-view sprite remains as a fallback while sheets load.
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
    moveSpeed: 6,     // tiles per second
    stride: 0,        // tiles walked, drives the walk cycle
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
    seat = null;
  }

  // ---- sitting (js/actions.js) --------------------------------------------------------------
  // A seat is where the pilot is drawn while sitting — a chair's seat in tile
  // units (the floor point under it), not a tile they stand on: their tile
  // doesn't change, so getting up puts them back where they were.
  var seat = null;
  function sit(s) {
    if (!s || player.moveProgress < 1) return false;
    seat = { x: s.x, y: s.y, facing: s.facing || player.facing };
    player.facing = seat.facing;
    return true;
  }
  function stand() { seat = null; }
  function isSeated() { return !!seat; }

  function getX() { return player.x; }
  function getY() { return player.y; }
  function setFacing(dir) {
    if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') {
      player.facing = dir;
    }
  }
  function getFacing() { return player.facing; }
  function isMoving() { return player.moveProgress < 1; }

  /** Get the interpolated render position (smooth between tiles). */
  function getRenderPos() {
    if (seat) return { x: seat.x - 0.5, y: seat.y - 1 + 3 / 32 };
    var p = Math.min(1, player.moveProgress);
    return {
      x: player.x + (player.targetX - player.x) * p,
      y: player.y + (player.targetY - player.y) * p
    };
  }

  /** Try to move in a direction. Returns true if movement started. */
  function tryMove(dx, dy, collisions, mapW, mapH) {
    if (seat) { seat = null; return false; }              // moving gets you up first
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

  /** Update movement interpolation. Call each frame with elapsed seconds. */
  function update(dt) {
    if (dt === undefined) dt = 1 / 60;
    if (player.moveProgress < 1) {
      var step = player.moveSpeed * dt;
      player.moveProgress += step;
      player.stride += step;
      if (player.moveProgress >= 1) {
        player.moveProgress = 1;
        player.x = player.targetX;
        player.y = player.targetY;
        player.walking = false;
        if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('step');
      }
      // Walk animation — a full 4-step cycle every 1.5 tiles walked
      player.animFrame = Math.floor(player.stride / 0.375) % 4;
    } else {
      player.animFrame = 0;
      player.stride = 0;
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

  // ---- Sprite sheets (tools/bridge-art/pilot.py → sprites_post.py) ----
  // One sheet per suit colour. Frames are 32×48 native px; rows are
  // down/right/up/left, columns are idle 0-3 then walk 0-7.
  var FRAME_W = 32, FRAME_H = 48;
  var DIR_ROW = { down: 0, right: 1, up: 2, left: 3 };
  var IDLE_SEQ = [0, 1, 2, 1];   // breathe; frame 2 also blinks the antenna
  var WALK_CYCLE_TILES = 2.4;    // tiles per full 8-frame stride
  var sheets = {};

  function getSheet(suit) {
    if (!sheets[suit]) {
      var img = new Image();
      sheets[suit] = { img: img, ready: false };
      img.onload = function () { sheets[suit].ready = true; };
      img.src = '/bridge/assets/characters/pilot-' + suit + '.png';     // 'sit-<suit>' for the seated sheet
    }
    return sheets[suit];
  }

  function drawSprite(ctx, sheet, sx, sy, ts) {
    var col;
    if (player.moveProgress < 1) {
      col = 4 + Math.floor(player.stride / (WALK_CYCLE_TILES / 8)) % 8;
    } else {
      col = IDLE_SEQ[Math.floor(Date.now() / 340) % IDLE_SEQ.length];
    }
    var row = DIR_ROW[player.facing] || 0;
    var k = ts / 32;
    var cx = sx + ts / 2;
    var footY = sy + ts - 3 * k;
    // Soft shadow pooled under the feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, footY, 9 * k, 3 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet.img, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
      Math.round(cx - FRAME_W * k / 2), Math.round(sy + ts - FRAME_H * k), FRAME_W * k, FRAME_H * k);
  }

  /**
   * In a pre-rendered scene: returns { footRow, draw(ctx) } so the world can
   * sort the pilot among NPCs, drawn depth-tested and lit by the room.
   */
  var hidden = false;
  function setHidden(h) { hidden = !!h; }

  function sceneItem(offX, offY, ts, sc, world, now) {
    if (hidden) return { footRow: 0, draw: function () {} };
    var pilot = BridgeState.getPilot();
    var suit = (pilot && SUIT_COLORS[pilot.suit_color]) ? pilot.suit_color : 'purple';
    var sheet = getSheet((seat ? 'sit-' : '') + suit);
    var pos = getRenderPos();
    var footRow = pos.y + 1 - 3 / 32;
    return {
      footRow: footRow,
      draw: function (ctx) {
        if (!sheet.ready) return;
        var col = player.moveProgress < 1
          ? 4 + Math.floor(player.stride / (WALK_CYCLE_TILES / 8)) % 8
          : IDLE_SEQ[Math.floor(Date.now() / 340) % IDLE_SEQ.length];
        var row = DIR_ROW[player.facing] || 0;
        var cx = Math.round(offX + (pos.x + 0.5) * ts);
        var footY = Math.round(offY + footRow * ts);
        BridgeScene.drawOccluded(ctx, sc, sheet.img, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
          cx - FRAME_W / 2, footY - (FRAME_H - 3), footRow, offX, offY,
          BridgeScene.tintAt(sc, world, pos.x, pos.y, now), { x: cx, y: footY, rx: 9, ry: 3 });
      }
    };
  }

  /** The pilot's sprite right now: sheet image, frame rect and position (for echoes). */
  function frame() {
    if (hidden) return null;
    var pilot = BridgeState.getPilot();
    var suit = (pilot && SUIT_COLORS[pilot.suit_color]) ? pilot.suit_color : 'purple';
    var sheet = getSheet((seat ? 'sit-' : '') + suit);
    if (!sheet.ready) return null;
    var col = player.moveProgress < 1
      ? 4 + Math.floor(player.stride / (WALK_CYCLE_TILES / 8)) % 8
      : IDLE_SEQ[Math.floor(Date.now() / 340) % IDLE_SEQ.length];
    var pos = getRenderPos();
    return { img: sheet.img, sx: col * FRAME_W, sy: (DIR_ROW[player.facing] || 0) * FRAME_H, w: FRAME_W, h: FRAME_H,
             x: pos.x, y: pos.y, footRow: pos.y + 1 - 3 / 32 };
  }

  /** Draw the character at native resolution. offX/offY = world origin, ts = native tile px. */
  function draw(ctx, offX, offY, ts) {
    if (hidden) return;
    var pos = getRenderPos();
    var sx = Math.round(offX + pos.x * ts);
    var sy = Math.round(offY + pos.y * ts);

    var pilot = BridgeState.getPilot();
    var suit = (pilot && SUIT_COLORS[pilot.suit_color]) ? pilot.suit_color : 'purple';
    var sheet = getSheet((seat ? 'sit-' : '') + suit);
    if (sheet.ready) {
      drawSprite(ctx, sheet, sx, sy, ts);
      return;
    }
    // Procedural fallback while the sheet loads

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
    var bob = player.walking ? ((wf !== 0) ? -u : 0) : Math.round(Math.sin(Date.now() / 800) * 0.5) * u;

    if (player.facing === 'down') {
      // Helmet (player marker — sets player apart from NPCs)
      px(ctx, sx, sy, 4*u, (1*u)+bob, 8*u, 5*u, dark);
      // Visor — horizontal stripe across eyes, glowing
      px(ctx, sx, sy, 3*u, (3*u)+bob, 10*u, 2*u, outline);
      px(ctx, sx, sy, 4*u, (3*u)+bob, 8*u, u, light);
      // Helmet top highlight
      px(ctx, sx, sy, 5*u, (1*u)+bob, 6*u, u, base);
      // Body — pilot suit
      px(ctx, sx, sy, 3*u, (6*u)+bob, 10*u, 5*u, base);
      // Chest emblem (player insignia)
      px(ctx, sx, sy, 7*u, (7*u)+bob, 2*u, 2*u, light);
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
      // Helmet (profile, one visor side visible)
      px(ctx, sx, sy, 4*u, (1*u)+bob, 7*u, 5*u, dark);
      px(ctx, sx, sy, 5*u, (1*u)+bob, 6*u, u, base);
      // Visor stripe — extends past front of helmet
      px(ctx, sx, sy, 3*u, (3*u)+bob, 8*u, 2*u, outline);
      px(ctx, sx, sy, 3*u, (3*u)+bob, 7*u, u, light);
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
      // Helmet (profile, mirrored)
      px(ctx, sx, sy, 5*u, (1*u)+bob, 7*u, 5*u, dark);
      px(ctx, sx, sy, 5*u, (1*u)+bob, 6*u, u, base);
      // Visor stripe — mirrored
      px(ctx, sx, sy, 5*u, (3*u)+bob, 8*u, 2*u, outline);
      px(ctx, sx, sy, 6*u, (3*u)+bob, 7*u, u, light);
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
    sit: sit,
    stand: stand,
    isSeated: isSeated,
    getX: getX,
    getY: getY,
    getFacing: getFacing,
    setFacing: setFacing,
    isMoving: isMoving,
    getRenderPos: getRenderPos,
    frame: frame,
    tryMove: tryMove,
    update: update,
    draw: draw,
    sceneItem: sceneItem,
    setHidden: setHidden,
    isHidden: function () { return hidden; }
  };
})();
