/**
 * BridgeLoot — Stardew-style loot drops with pop, bob, and magnet pickup.
 *
 *   BridgeLoot.spawn(tileX, tileY, itemId, count?)   // drop n copies
 *   BridgeLoot.update(playerX, playerY)              // call each frame
 *   BridgeLoot.draw(ctx, offX, offY, ts)             // render layer
 *   BridgeLoot.clear()                                // wipe on world load
 *
 * Drop lifecycle:
 *   pop phase (0–360ms): item launches from a small random offset with a
 *     parabolic arc — a real bounce — and lands.
 *   settled phase: subtle bob + soft shadow underneath. Stays put until
 *     picked up.
 *
 * Pickup:
 *   distance < MAGNET_R    → ease item toward the player ("magnet pull").
 *   distance < COLLECT_R   → add to BridgeInventory, remove the drop.
 *
 * Drops live in tile coordinates with sub-tile offsets so the bounce
 * arc lands cleanly. World units only — no DOM, no localStorage. Drops
 * are intentionally NOT persisted; sailing away abandons whatever you
 * left on the ground, same as Stardew leaving a day with floor loot.
 */
var BridgeLoot = (function () {

  var POP_MS       = 360;
  var POP_HEIGHT   = 0.55;   // tile units of arc peak
  var POP_SCATTER  = 0.45;   // tile units of horizontal spread at landing
  var BOB_AMP      = 0.10;   // tile units
  var BOB_PERIOD   = 700;    // ms per full bob cycle
  var MAGNET_R     = 1.10;   // tile distance where the magnet engages
  var COLLECT_R    = 0.35;   // tile distance where pickup fires
  var MAGNET_SPEED = 0.18;   // fraction of remaining distance closed per frame

  var drops = [];

  function spawn(tileX, tileY, itemId, count) {
    if (!BridgeItems.get(itemId)) return;
    var n = (typeof count === 'number') ? count : 1;
    var now = performance.now();
    for (var i = 0; i < n; i++) {
      // Random angle so the bounce scatters in all directions
      var angle = Math.random() * Math.PI * 2;
      var dist  = (Math.random() * 0.5 + 0.4) * POP_SCATTER;
      drops.push({
        itemId: itemId,
        spawnX: tileX + 0.5,                  // sub-tile starting point
        spawnY: tileY + 0.5,
        landX:  tileX + 0.5 + Math.cos(angle) * dist,
        landY:  tileY + 0.5 + Math.sin(angle) * dist,
        x: tileX + 0.5,
        y: tileY + 0.5,
        startTime: now,
        popMs: POP_MS,
        seed: Math.random() * 1000
      });
    }
  }

  function update(playerX, playerY) {
    if (drops.length === 0) return;
    if (typeof playerX !== 'number') return;
    var now = performance.now();

    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      var phase = now - d.startTime;
      var popping = phase < d.popMs;

      if (popping) {
        // Pop-arc interpolation — linear horizontal, parabolic vertical.
        var t = phase / d.popMs;
        d.x = d.spawnX + (d.landX - d.spawnX) * t;
        d.y = d.spawnY + (d.landY - d.spawnY) * t;
        // Vertical offset stored separately so draw() can subtract the
        // arc height without affecting the pickup hit-test.
        d._arcLift = Math.sin(t * Math.PI) * POP_HEIGHT;
      } else {
        d._arcLift = 0;
        // Magnet pull engages once landed.
        var dx = playerX + 0.5 - d.x;
        var dy = playerY + 0.5 - d.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAGNET_R) {
          d.x += dx * MAGNET_SPEED;
          d.y += dy * MAGNET_SPEED;
        }
        if (dist < COLLECT_R) {
          BridgeInventory.addItem(d.itemId, 1);
          drops.splice(i, 1);
          continue;
        }
      }
    }
  }

  function draw(ctx, offX, offY, ts) {
    if (drops.length === 0) return;
    var now = performance.now();
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var item = BridgeItems.get(d.itemId);
      if (!item) continue;

      // Pixel position of the item's centerpoint (sub-tile precise).
      var cx = offX + d.x * ts;
      var cy = offY + d.y * ts;

      // Soft shadow underneath, scaled by arc height (higher = smaller shadow)
      var arcLift = d._arcLift || 0;
      var shadowAlpha = 0.35 * (1 - arcLift / POP_HEIGHT);
      ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0.10, shadowAlpha).toFixed(2) + ')';
      var shadowW = ts * (0.45 - 0.10 * (arcLift / POP_HEIGHT));
      var shadowH = ts * 0.10;
      ctx.fillRect(Math.floor(cx - shadowW / 2),
                   Math.floor(cy + ts * 0.20 - shadowH / 2),
                   Math.ceil(shadowW), Math.ceil(shadowH));

      // Bob for landed drops (skip during pop).
      var bob = 0;
      if (arcLift === 0) {
        bob = Math.sin((now + d.seed) / BOB_PERIOD * Math.PI * 2) * BOB_AMP;
      }
      var iconSize = ts * 0.55;
      var iconX = cx - iconSize / 2;
      var iconY = cy - iconSize / 2 - arcLift * ts - bob * ts;

      // Faint sparkle halo so loot reads against any background.
      var pulse = 0.55 + 0.35 * Math.sin((now + d.seed) / 500);
      ctx.fillStyle = 'rgba(255,235,150,' + (pulse * 0.18).toFixed(2) + ')';
      ctx.fillRect(Math.floor(iconX - 1), Math.floor(iconY - 1),
                   Math.ceil(iconSize + 2), Math.ceil(iconSize + 2));

      // Item icon
      item.draw(ctx, iconX, iconY, iconSize);
    }
  }

  function clear() { drops.length = 0; }
  function count() { return drops.length; }

  return { spawn: spawn, update: update, draw: draw, clear: clear, count: count };
})();
