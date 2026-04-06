/**
 * Arcadia World Module — Neon arcade planet.
 *
 * Tileset draw functions for Arcadia's tile types.
 * ¾ view with brick walls, arcade cabinets, neon signs.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Tile Draw Functions ----
  // Each receives (ctx, x, y, ts, time, col, row) where ts = rendered tile size

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

  function drawCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var SCREEN_COLORS = ['#3855a0', '#388850', '#a07038', '#388890'];
    var GLINT_COLORS = ['#8090c0', '#80c090', '#c0a080', '#80c0c0'];
    var idx = (col * 3 + row * 7) % 4;
    var phase = (time / 800) + (col * 7 + row * 13);
    var brightness = 1 + Math.sin(phase) * 0.15;
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    ctx.globalAlpha = Math.min(1, brightness);
    ctx.fillStyle = SCREEN_COLORS[idx];
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, Math.floor(ts * 0.35));
    ctx.fillStyle = GLINT_COLORS[idx];
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, 2*u, 2*u);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawRunoutsCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var phase = (time / 600) + (col * 5 + row * 11);
    var brightness = 1 + Math.sin(phase) * 0.15;
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    ctx.globalAlpha = Math.min(1, brightness);
    ctx.fillStyle = '#d06090';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, Math.floor(ts * 0.35));
    ctx.fillStyle = '#f0a0c0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, 2*u, 2*u);
    ctx.globalAlpha = 1;
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

  function drawNeonSign(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = col * 17 + row * 31;
    var t = Math.floor(time / 80);
    var flicker = 1;
    if ((t + seed) % 37 === 0 || (t + seed) % 53 === 0) {
      flicker = 0.4 + Math.random() * 0.3;
    } else {
      flicker = 0.9 + Math.sin(time / 400 + seed) * 0.1;
    }
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + u, y + u, ts - 2*u, Math.floor(ts * 0.35));
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#c040d0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.2));
    ctx.globalAlpha = 1;
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

  function drawFloorDark(ctx, x, y, ts) {
    var h = ts / 2;
    ctx.fillStyle = '#221c38';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#261e40';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
  }

  function drawFloorWorn(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#2a2240';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#1e1a30';
    ctx.fillRect(x + 3*u, y + 5*u, 2*u, u);
    ctx.fillRect(x + 8*u, y + 10*u, 3*u, u);
    ctx.fillRect(x + 6*u, y + 2*u, u, 2*u);
  }

  function drawPoster(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var POSTER_COLORS = ['#d06090', '#5cc8d0', '#c8a840', '#60b060'];
    var idx = (col * 5 + row * 3) % 4;
    drawWall(ctx, x, y, ts);
    var fx = x + 3*u;
    var fy = y + Math.floor(ts * 0.35);
    var fw = ts - 6*u;
    var fh = Math.floor(ts * 0.45);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = POSTER_COLORS[idx];
    ctx.fillRect(fx + u, fy + u, fw - 2*u, fh - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(fx + u, fy + Math.floor(fh * 0.35), fw - 2*u, u);
    ctx.fillRect(fx + u, fy + Math.floor(fh * 0.6), fw - 2*u, u);
  }

  function drawBrokenCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    var screenX = x + 3*u;
    var screenY = y + 3*u;
    var screenW = ts - 6*u;
    var screenH = Math.floor(ts * 0.35);
    var garble = ((Math.floor(time / 100) + col * 23 + row * 41) % 67 === 0);
    if (garble) {
      var gColors = ['#d06090', '#3855a0', '#40b060', '#c8a840'];
      ctx.fillStyle = gColors[(col + row) % 4];
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX, screenY + 2*u, screenW, u);
      ctx.fillRect(screenX, screenY + 5*u, screenW, u);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#0e0c1a';
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.fillStyle = '#1a1530';
      ctx.fillRect(screenX + u, screenY + u, 2*u, u);
      ctx.fillRect(screenX + u + u, screenY + 2*u, u, u);
      ctx.fillRect(screenX + 2*u + u, screenY + 3*u, 2*u, u);
    }
    ctx.fillStyle = '#1a1530';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawSidewalk(ctx, x, y, ts) {
    var h = ts / 2;
    ctx.fillStyle = '#3a3650';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3e3a55';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
    ctx.fillStyle = '#333050';
    ctx.fillRect(x, y + ts - 1, ts, 1);
  }

  function drawLampPost(ctx, x, y, ts) {
    drawSidewalk(ctx, x, y, ts);
    var u = ts / 16;
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 11*u);
    ctx.fillStyle = '#c8a840';
    ctx.fillRect(x + 5*u, y + u, 6*u, 3*u);
    ctx.fillStyle = '#f0d870';
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, u);
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, 2*u);
  }

  function drawEntranceSign(ctx, x, y, ts, time) {
    time = time || 0;
    ctx.fillStyle = '#0e0c1a';
    ctx.fillRect(x, y, ts, ts);
    var flicker = 0.85 + Math.sin(time / 500) * 0.15;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#d06090';
    var u = ts / 16;
    ctx.fillRect(x + u, y + 3*u, ts - 2*u, 10*u);
    ctx.fillStyle = '#1a0a20';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 8*u);
    ctx.fillStyle = '#d06090';
    ctx.fillRect(x + 4*u, y + 5*u, ts - 8*u, u);
    ctx.fillRect(x + 3*u, y + 6*u, 2*u, 5*u);
    ctx.fillRect(x + ts - 5*u, y + 6*u, 2*u, 5*u);
    ctx.fillRect(x + 4*u, y + 8*u, ts - 8*u, u);
    ctx.globalAlpha = 1;
  }

  function drawBench(ctx, x, y, ts) {
    drawFloor(ctx, x, y, ts);
    var u = ts / 16;
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(x + u, y + 6*u, ts - 2*u, 4*u);
    ctx.fillStyle = '#5a4838';
    ctx.fillRect(x + u, y + 6*u, ts - 2*u, u);
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 2*u, y + 10*u, 2*u, 4*u);
    ctx.fillRect(x + ts - 4*u, y + 10*u, 2*u, 4*u);
  }

  function drawTable(ctx, x, y, ts) {
    drawFloor(ctx, x, y, ts);
    var u = ts / 16;
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 3*u);
    ctx.fillStyle = '#2a2235';
    ctx.fillRect(x + 2*u, y + 7*u, ts - 4*u, 2*u);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 3*u, y + 9*u, u, 5*u);
    ctx.fillRect(x + ts - 4*u, y + 9*u, u, 5*u);
  }

  function drawVendingMachine(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0;
    var u = ts / 16;
    ctx.fillStyle = '#1e2838';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    var phase = (time / 1200) + col * 11;
    var glow = 0.8 + Math.sin(phase) * 0.2;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#3868a0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.4));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d06060';
    ctx.fillRect(x + 3*u, y + 3*u, 2*u, 2*u);
    ctx.fillStyle = '#60b060';
    ctx.fillRect(x + 6*u, y + 3*u, 2*u, 2*u);
    ctx.fillStyle = '#c8a840';
    ctx.fillRect(x + 9*u, y + 3*u, 2*u, 2*u);
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(x + 3*u, y + 6*u, 2*u, 2*u);
    ctx.fillStyle = '#d06090';
    ctx.fillRect(x + 6*u, y + 6*u, 2*u, 2*u);
    ctx.fillStyle = '#888';
    ctx.fillRect(x + ts - 4*u, y + Math.floor(ts * 0.5), 2*u, 3*u);
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 3*u, y + ts - 4*u, ts - 6*u, 2*u);
  }

  var NPC_COLORS = ['#c8a840', '#5cc8d0', '#d06060'];

  function drawNpc(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts);
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var colorIdx = (col * 3 + row * 5) % 3;
    var c = NPC_COLORS[colorIdx];
    var bob = Math.sin(time / 600 + col * 7) > 0.8 ? -u : 0;
    ctx.fillStyle = c;
    ctx.fillRect(x + 4*u, y + (u)+bob, 8*u, 5*u);
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 5*u, y + (3*u)+bob, 2*u, 2*u);
    ctx.fillRect(x + 9*u, y + (3*u)+bob, 2*u, 2*u);
    ctx.fillStyle = c;
    ctx.fillRect(x + 3*u, y + (6*u)+bob, 10*u, 5*u);
    ctx.fillRect(x + 4*u, y + (11*u)+bob, 3*u, 4*u);
    ctx.fillRect(x + 9*u, y + (11*u)+bob, 3*u, 4*u);
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 3*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 9*u, y + 14*u, 4*u, u);
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
    9: drawCabinet,
    10: drawFloorDark,
    11: drawFloorWorn,
    12: drawPoster,
    13: drawBrokenCabinet,
    14: drawSidewalk,
    15: drawLampPost,
    16: drawEntranceSign,
    17: drawBench,
    18: drawTable,
    19: drawVendingMachine,
    20: drawNpc
  });

})();
