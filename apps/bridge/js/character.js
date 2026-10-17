/**
 * BridgeCharacter — Player character with grid-based movement.
 *
 * Sprite-sheet pilot rendered from a Blender model (tools/bridge-art/characters.py):
 * 4-frame idle + 8-frame walk in four directions, one sheet per suit, build and head, recoloured
 * for the suit colour, skin and hair by js/look.js.
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

  // ---- a pose (js/ski.js) ------------------------------------------------------------------------
  // A mode that moves the pilot itself (skiing) poses them: where they are
  // (x, y: the floor point under them, tile units, not whole tiles), which
  // sport sheet (characters.py pilot-ski / pilot-climb), the frame (row,
  // col), mirrored (flip: the sheets face right; left is the mirror) and how
  // high off the ground (lift, native px; the shadow stays down; light: the tile whose light they take, when the
  // floor under them is inside something, like a stair). Their tile
  // follows, so loot, interactions and the camera still work.
  // walk: the ordinary sheet, posed — a mode walking the pilot off the grid, up a stair (js/lodge.js)
  var SPORT = { ski: { w: 40, h: 56, ox: 20, oy: 45 }, climb: { w: 32, h: 64, ox: 16, oy: 61 }, walk: { w: 32, h: 48, ox: 16, oy: 45 } };
  var pose = null;
  function setPose(p) {
    pose = p || null;
    if (!pose) return;
    seat = null;
    player.x = player.targetX = Math.floor(pose.x);
    player.y = player.targetY = Math.floor(pose.y);
    player.moveProgress = 1;
    player.walking = false;
  }
  function getPose() { return pose; }

  function getX() { return player.x; }
  function getY() { return player.y; }
  function setFacing(dir) {
    if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') {
      player.facing = dir;
    }
  }
  function getFacing() { return player.facing; }
  function isMoving() { return player.moveProgress < 1 || !!rolling; }

  /** Get the interpolated render position (smooth between tiles). */
  function getRenderPos() {
    if (pose) return { x: pose.x - 0.5, y: pose.y - 1 + 3 / 32 };
    if (rolling) {                                  // the dodge roll: quick off the mark, easing in to where it stops
      var rk = Math.min(1, (performance.now() - rolling.t0) / rolling.dur), e = 1 - Math.pow(1 - rk, 2);
      return { x: rolling.fx + (rolling.tx - rolling.fx) * e, y: rolling.fy + (rolling.ty - rolling.fy) * e };
    }
    if (seat) return { x: seat.x - 0.5, y: seat.y - 1 + 3 / 32 };
    var p = Math.min(1, player.moveProgress);
    return {
      x: player.x + (player.targetX - player.x) * p,
      y: player.y + (player.targetY - player.y) * p
    };
  }

  // ---- the dodge roll (js/arms.js): from where you are to n tiles on (they've been checked clear), dur ms ----
  var rolling = null;
  function roll(dx, dy, n, dur) {
    if (pose || seat) return false;
    var from = getRenderPos(), sx = Math.round(from.x), sy = Math.round(from.y);
    rolling = { fx: from.x, fy: from.y, tx: sx + dx * n, ty: sy + dy * n, t0: performance.now(), dur: dur };
    player.x = player.targetX = sx; player.y = player.targetY = sy;
    player.moveProgress = 1; player.walking = false;
    player.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    return true;
  }
  function isRolling() { return !!rolling; }

  /** Try to move in a direction. Returns true if movement started. */
  function tryMove(dx, dy, collisions, mapW, mapH) {
    if (pose) return false;
    if (rolling) return false;
    if (seat) { seat = null; return false; }              // moving gets you up first
    var A = typeof BridgeArms !== 'undefined' ? BridgeArms : null;
    if (A && A.busy()) {                                  // a swing holds you through its landing; a charge lets you turn
      if (A.charging()) { player.facing = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down'; return false; }
      if (A.rooted()) return false;
      A.cancel();                                         // moving cuts the recovery short
    }
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
    if (rolling && performance.now() - rolling.t0 >= rolling.dur) {
      player.x = player.targetX = rolling.tx; player.y = player.targetY = rolling.ty;
      rolling = null;
    }
    if (typeof BridgeArms !== 'undefined') BridgeArms.update();
    if (player.moveProgress < 1) {
      var step = player.moveSpeed * (typeof BridgeGear !== 'undefined' ? BridgeGear.speed() : 1) * dt;
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

  // ---- Sprite sheets (tools/bridge-art/pilots.sh → assets/characters/pilots/) ----
  // Frames are 32×48 native px; rows are
  // down/right/up/left, columns are idle 0-3 then walk 0-7.
  var FRAME_W = 32, FRAME_H = 48;
  var DIR_ROW = { down: 0, right: 1, up: 2, left: 3 };
  var IDLE_SEQ = [0, 1, 2, 1];   // breathe; frame 2 also blinks the antenna
  // the idle frame at a time: breathing, and one beat in twelve (every ~4 s) idle3 — idle1 with the eyes shut, a blink
  function idleCol(now) { var k = Math.floor(now / 340), c = IDLE_SEQ[k % IDLE_SEQ.length]; return k % 12 === 5 ? 3 : c; }
  var WALK_CYCLE_TILES = 2.4;    // tiles per full 8-frame stride
  var sheets = {};

  // The sheet for what you're wearing (js/gear.js: style and colour) and how you look (js/look.js), standing,
  // seated or in a sport pose. A key reads '[sit-|ski-|climb-][<style>-]<colour>@<look code>'; a key with no
  // look (a rival's 'ski-coat-red') is drawn with the default look.
  function sheetKey(sport) {
    var pilot = BridgeState.getPilot();
    var G = typeof BridgeGear !== 'undefined' ? BridgeGear : null;
    var colour = (G && G.colour()) || (pilot && pilot.suit_color);
    if (!SUIT_COLORS[colour]) colour = 'purple';
    var style = G ? G.style() : 'flight';
    var pre = sport ? sport + '-' : pose && pose.kind !== 'walk' ? pose.kind + '-' : seat ? 'sit-' : '';
    return pre + (style && style !== 'flight' ? style + '-' : '') + colour + '@' + BridgeLook.code(BridgeLook.get());
  }

  // the sheet to draw now: while a new one loads (you've just changed suit or look) keep the last good one
  var lastGood = null;
  function liveSheet(key) {
    var sh = getSheet(key);
    if (sh.ready) { lastGood = sh; return sh; }
    return lastGood || sh;
  }

  function getSheet(key) {
    if (!sheets[key]) {
      var at = key.indexOf('@'), base = at < 0 ? key : key.slice(0, at);
      var parts = base.split('-'), colour = parts.pop();
      var mode = parts[0] === 'sit' || parts[0] === 'ski' || parts[0] === 'climb' || parts[0] === 'attack' ? parts.shift() : '';
      var look = at < 0 ? BridgeLook.clean(null) : BridgeLook.parse(key.slice(at + 1));
      sheets[key] = BridgeLook.sheet(mode, parts[0] || 'flight', colour, look);
    }
    return sheets[key];
  }

  // a sheet with every frame mirrored in place (a sport sheet faces right; left is its mirror)
  function mirrored(key, fw) {
    var base = getSheet(key);
    if (!base.ready) return null;
    if (!base.flip) {
      var c = document.createElement('canvas');
      c.width = base.img.width; c.height = base.img.height;
      var x = c.getContext('2d');
      for (var col = 0; col * fw < c.width; col++) {
        x.setTransform(-1, 0, 0, 1, (col + 1) * fw + col * fw, 0);
        x.drawImage(base.img, col * fw, 0, fw, c.height, col * fw, 0, fw, c.height);
      }
      base.flip = c;
    }
    return base.flip;
  }
  /** A sport sheet ready to draw — the pilot's own suit, or any 'ski-coat-red' — or null while it loads. */
  function sportImage(key, flip) {
    var kind = key.split('-')[0], m = SPORT[kind] || SPORT.walk;
    if (flip) return mirrored(key, m.w);
    var sh = getSheet(key);
    return sh.ready ? sh.img : null;
  }

  function drawSprite(ctx, sheet, sx, sy, ts) {
    var col;
    if (player.moveProgress < 1) {
      col = 4 + Math.floor(player.stride / (WALK_CYCLE_TILES / 8)) % 8;
    } else {
      col = idleCol(Date.now());
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
    if (pose) return posedItem(offX, offY, ts, sc, world, now);
    var sheet = liveSheet(sheetKey());
    var pos = getRenderPos();
    var footRow = pos.y + 1 - 3 / 32;
    var fit = fightLook();
    if (fit) {
      return { footRow: footRow, draw: function (ctx) {
        drawFighter(ctx, { sc: sc, world: world, offX: offX, offY: offY, ts: ts, now: now, key: baseKey(), sheet: sheet, x: pos.x, y: pos.y,
                           facing: player.facing, walking: player.moveProgress < 1, stride: player.stride, fight: fit.fight, held: fit.held, hurt: fit.hurt });
      } };
    }
    return {
      footRow: footRow,
      draw: function (ctx) {
        if (!sheet.ready) return;
        var col = player.moveProgress < 1
          ? 4 + Math.floor(player.stride / (WALK_CYCLE_TILES / 8)) % 8
          : idleCol(Date.now());
        var row = DIR_ROW[player.facing] || 0;
        var cx = Math.round(offX + (pos.x + 0.5) * ts);
        var footY = Math.round(offY + footRow * ts);
        BridgeScene.drawOccluded(ctx, sc, sheet.img, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H,
          cx - FRAME_W / 2, footY - (FRAME_H - 3), footRow, offX, offY,
          BridgeScene.tintAt(sc, world, pos.x, pos.y, now), { x: cx, y: footY, rx: 9, ry: 3 }, null, 'auto');
      }
    };
  }

  // ---- fighting (js/arms.js): an attack frame, or the walk frame, with the weapon in hand ---------------------------
  // The attack sheet (pilot-attack-…, 80 × 92 frames, attacks.json) and the weapon's own frame for the same pose
  // (assets/characters/weapons/<id>, cut where the body hides it) are put together and drawn as one, depth-tested
  // and lit like any character. o: { sc, world, offX, offY, ts, now (the world's clock, for the light), key (the
  // sheet key with no mode: '<style>-<colour>@<look>'), sheet (that walk sheet), x, y (render position), facing,
  // walking, stride, fight (a BridgeArms state, yours or someone's), held (the weapon id carried) }. Others' pilots
  // (js/multi.js) draw through this too.
  // A blow landing on you (interactions.js) sets `hurt`: for a moment you flash, white-hot then red, on your own pixels
  // and flinch — drawn through drawFighter (o.hurt, 0 to 1 through the flash), so it holds a weapon or not.
  var fcan = null, hurtAt = -1e9, HURT_MS = 280;
  function hurt() { hurtAt = performance.now(); }
  function fightLook() {
    var A = typeof BridgeArms !== 'undefined' ? BridgeArms : null;
    if (!A || seat || pose) return null;
    var f = A.state(), h = A.held(), k = (performance.now() - hurtAt) / HURT_MS;
    if (!(k >= 0 && k < 1)) k = -1;
    return f || h || k >= 0 ? { fight: f, held: h, hurt: k } : null;
  }
  function baseKey() { return sheetKey(); }
  function drawFighter(ctx, o) {
    var A = BridgeArms, L = A.layout(), t = performance.now();
    var p = o.fight ? A.pose(o.fight, t) : null;
    var at = o.key.indexOf('@'), look = at < 0 ? BridgeLook.clean(null) : BridgeLook.parse(o.key.slice(at + 1));
    var build = look.body === 'b' ? 'b' : 'a', dir = p ? p.facing : o.facing, row = DIR_ROW[dir] || 0;
    var img = null, sx, sy, fw, fh, ox, oy, frame, weapon = null;
    if (p && L) {
      var ash = getSheet('attack-' + o.key), ci = L.cols.indexOf(p.col);
      if (ash.ready && ci >= 0) {
        img = ash.img; fw = L.frame[0]; fh = L.frame[1]; ox = L.origin[0]; oy = L.origin[1];
        sx = ci * fw; sy = row * fh; frame = p.col; weapon = p.weapon;
      }
    }
    if (!img) {                                        // walking or standing (or the attack sheet still loading)
      var sh = o.sheet && o.sheet.ready ? o.sheet : null;
      if (!sh) return;
      var col = o.walking ? 4 + Math.floor(o.stride / (WALK_CYCLE_TILES / 8)) % 8 : idleCol(Date.now());
      img = sh.img; fw = FRAME_W; fh = FRAME_H; ox = 16; oy = 45; sx = col * FRAME_W; sy = row * FRAME_H;
      frame = col >= 4 ? 'walk' + (col - 4) : 'idle' + col;
      weapon = p && p.col.indexOf('roll-') === 0 ? null : o.held;
    }
    var c = weapon ? A.cell(weapon, build, dir, frame) : null;
    var x0 = -ox, y0 = -oy, x1 = fw - ox, y1 = fh - oy;
    if (c) { x0 = Math.min(x0, c.r[4]); y0 = Math.min(y0, c.r[5]); x1 = Math.max(x1, c.r[4] + c.r[2]); y1 = Math.max(y1, c.r[5] + c.r[3]); }
    var W = x1 - x0, H = y1 - y0;
    if (!fcan) fcan = document.createElement('canvas');
    if (fcan.width < W || fcan.height < H) { fcan.width = Math.max(fcan.width, W); fcan.height = Math.max(fcan.height, H); }
    var g = fcan.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, sx, sy, fw, fh, -ox - x0, -oy - y0, fw, fh);
    if (c) g.drawImage(c.img, c.r[0], c.r[1], c.r[2], c.r[3], c.r[4] - x0, c.r[5] - y0, c.r[2], c.r[3]);
    var hk = o.hurt >= 0 && o.hurt < 1 ? o.hurt : -1;
    if (hk >= 0) {                                      // struck: the flash, on the sprite's own pixels only
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = hk < 0.22 ? 'rgba(255,236,232,0.9)' : 'rgba(255,52,52,' + (0.72 * (1 - (hk - 0.22) / 0.78)).toFixed(2) + ')';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    var flinch = hk >= 0 && hk < 0.5 ? (Math.floor(t / 35) % 2 ? 1 : -1) : 0;
    var cx = Math.round(o.offX + (o.x + 0.5) * o.ts) + (p && p.shake || 0) + flinch, footRow = o.y + 1 - 3 / 32, footY = Math.round(o.offY + footRow * o.ts);
    var shadow = { x: cx, y: footY, rx: 9, ry: 3 };
    if (o.sc) {
      // the flash is light of its own: the room's light (tint) lifts toward white while it lasts, so it isn't muddied
      var tint = BridgeScene.tintAt(o.sc, o.world, o.x, o.y, o.now), tn = hk >= 0 && /^rgb\((\d+),(\d+),(\d+)\)$/.exec(String(tint).replace(/\s/g, ''));
      if (tn) tint = 'rgb(' + [1, 2, 3].map(function (i) { return Math.round(+tn[i] + (255 - tn[i]) * (1 - hk)); }).join(',') + ')';
      BridgeScene.drawOccluded(ctx, o.sc, fcan, 0, 0, W, H, cx + x0, footY + y0, footRow, o.offX, o.offY,
        tint, shadow, null, 'auto', true);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath(); ctx.ellipse(cx, footY, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fcan, 0, 0, W, H, cx + x0, footY + y0, W, H);
    }
  }

  function posedItem(offX, offY, ts, sc, world, now) {
    var p = pose, m = SPORT[p.kind], img = sportImage(sheetKey(), p.flip);
    return {
      footRow: p.y,
      draw: function (ctx) {
        if (!img) return;
        var cx = Math.round(offX + p.x * ts), footY = Math.round(offY + p.y * ts), lift = Math.round(p.lift || 0);
        var shadow = { x: cx, y: footY, rx: p.kind === 'ski' ? 10 : 8, ry: 3 };
        if (lift > 2) {      // in the air: the shadow stays on the snow, smaller the higher you are
          ctx.fillStyle = 'rgba(40, 50, 90, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx, footY, Math.max(4, 10 - lift / 5), Math.max(2, 3 - lift / 20), 0, 0, Math.PI * 2);
          ctx.fill();
          shadow = null;
        }
        BridgeScene.drawOccluded(ctx, sc, img, p.col * m.w, p.row * m.h, m.w, m.h,
          cx - m.ox, footY - m.oy - lift, p.y, offX, offY, BridgeScene.tintAt(sc, world, p.light ? p.light[0] : p.x - 0.5, p.light ? p.light[1] : p.y - 1, now), shadow, null, true);
      }
    };
  }

  /** The pilot's sprite right now: sheet image, frame rect and position (for echoes). */
  function frame() {
    if (hidden) return null;
    var sheet = liveSheet(sheetKey());
    if (!sheet.ready) return null;
    var col = player.moveProgress < 1
      ? 4 + Math.floor(player.stride / (WALK_CYCLE_TILES / 8)) % 8
      : idleCol(Date.now());
    var pos = getRenderPos();
    return { img: sheet.img, sx: col * FRAME_W, sy: (DIR_ROW[player.facing] || 0) * FRAME_H, w: FRAME_W, h: FRAME_H,
             x: pos.x, y: pos.y, footRow: pos.y + 1 - 3 / 32 };
  }

  /** Draw the character at native resolution. offX/offY = world origin, ts = native tile px. */
  function draw(ctx, offX, offY, ts) {
    if (hidden) return;
    if (pose) {                       // outside a scene (no depth to test against)
      var pm = SPORT[pose.kind], pimg = sportImage(sheetKey(), pose.flip);
      if (pimg) ctx.drawImage(pimg, pose.col * pm.w, pose.row * pm.h, pm.w, pm.h,
        Math.round(offX + pose.x * ts) - pm.ox, Math.round(offY + pose.y * ts) - pm.oy - Math.round(pose.lift || 0), pm.w, pm.h);
      return;
    }
    var pos = getRenderPos();
    var sx = Math.round(offX + pos.x * ts);
    var sy = Math.round(offY + pos.y * ts);

    var sheet = liveSheet(sheetKey());
    var fit = sheet.ready && fightLook();
    if (fit) {
      drawFighter(ctx, { sc: null, offX: offX, offY: offY, ts: ts, now: Date.now(), key: baseKey(), sheet: sheet, x: pos.x, y: pos.y, facing: player.facing,
                         walking: player.moveProgress < 1, stride: player.stride, fight: fit.fight, held: fit.held, hurt: fit.hurt });
      return;
    }
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
    setPose: setPose,
    getPose: getPose,
    sportImage: sportImage,
    sportKey: sheetKey,
    SPORT: SPORT,
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
    roll: roll,
    isRolling: isRolling,
    hurt: hurt,
    drawFighter: drawFighter,
    sheet: getSheet,
    setHidden: setHidden,
    isHidden: function () { return hidden; }
  };
})();
