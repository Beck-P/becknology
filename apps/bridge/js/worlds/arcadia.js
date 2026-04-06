/**
 * Arcadia World Module — Neon arcade planet.
 *
 * Tileset draw functions for Arcadia's tile types.
 * ¾ view with brick walls, arcade cabinets, neon signs.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Tile Draw Functions ----
  // Each receives (ctx, x, y, ts) where ts = rendered tile size

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
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    ctx.fillStyle = '#3855a0';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, Math.floor(ts * 0.35));
    ctx.fillStyle = '#8090c0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, 2*u, 2*u);
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
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
    ctx.fillStyle = '#d06090';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, Math.floor(ts * 0.35));
    ctx.fillStyle = '#f0a0c0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, 2*u, 2*u);
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawHighScoreBoard(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    ctx.fillStyle = '#40b060';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 7*u);
    ctx.fillStyle = '#2a7040';
    for (var i = 0; i < 4; i++) {
      ctx.fillRect(x + 4*u, y + (4 + i * 2)*u, ts - 8*u, u);
    }
    ctx.strokeStyle = '#2a4a2a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
  }

  function drawNeonSign(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + u, y + u, ts - 2*u, Math.floor(ts * 0.35));
    ctx.fillStyle = '#c040d0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.2));
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.4), u, 3*u);
    ctx.fillRect(x + ts - 3*u, y + Math.floor(ts * 0.4), u, 3*u);
    ctx.fillStyle = '#2a2245';
    ctx.fillRect(x, y + Math.floor(ts * 0.55), ts, ts - Math.floor(ts * 0.55));
  }

  function drawEntrance(ctx, x, y, ts) {
    drawFloor(ctx, x, y, ts);
    ctx.fillStyle = '#4a4268';
    ctx.fillRect(x, y, ts, Math.max(1, ts / 16));
    ctx.fillRect(x, y + ts - Math.max(1, ts / 16), ts, Math.max(1, ts / 16));
  }

  // ---- Register with engine ----

  BridgeWorld.registerTileset('arcadia', {
    1: drawWall,
    2: drawFloor,
    3: drawFloorLight,
    4: drawWallDark,
    5: drawRunoutsCabinet,
    6: drawHighScoreBoard,
    7: drawEntrance,
    8: drawNeonSign,
    9: drawCabinet
  });

})();
