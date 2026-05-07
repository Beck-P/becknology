/**
 * Tower World Module — A sorceress's stone tower interior.
 *
 * Cold dark stone, candlelit corners, runes carved into the floor,
 * a magic crystal at the center, and the sorceress herself.
 */
(function () {

  function drawTowerFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    // Dark stone tiles, alternating slight tone
    var base = (col + row) % 2 === 0 ? '#2a2638' : '#252134';
    ctx.fillStyle = base;
    ctx.fillRect(x, y, ts, ts);
    // Grout lines
    ctx.fillStyle = '#15101e';
    ctx.fillRect(x, y + Math.floor(ts/2) - Math.max(1, u * 0.3), ts, Math.max(1, u * 0.5));
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.3), y, Math.max(1, u * 0.5), ts);
    // Speckle / wear
    if (seed % 5 === 0) {
      ctx.fillStyle = 'rgba(120, 80, 200, 0.12)';
      ctx.fillRect(x + 3*u, y + 11*u, u, u);
    }
    if (seed % 7 === 0) {
      ctx.fillStyle = 'rgba(200, 180, 240, 0.10)';
      ctx.fillRect(x + 12*u, y + 4*u, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    }
  }

  function drawTowerWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    // Top cap (deep stone)
    ctx.fillStyle = '#0e0820';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.3));
    // Wall body
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(x, y + Math.floor(ts * 0.3), ts, ts - Math.floor(ts * 0.3));
    // Cap highlight
    ctx.fillStyle = '#2a2040';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.5));
    // Brick lines (alternating courses)
    ctx.fillStyle = '#080418';
    ctx.fillRect(x, y + Math.floor(ts * 0.55), ts, Math.max(1, u * 0.5));
    ctx.fillRect(x, y + Math.floor(ts * 0.78), ts, Math.max(1, u * 0.5));
    var brickOff = (row % 2 === 0) ? 0 : Math.floor(ts * 0.5);
    ctx.fillRect(x + ((Math.floor(ts * 0.5) + brickOff) % ts), y + Math.floor(ts * 0.3), Math.max(1, u * 0.5), Math.floor(ts * 0.25));
    ctx.fillRect(x + ((Math.floor(ts * 0.25) + (1 - row % 2) * Math.floor(ts * 0.5)) % ts), y + Math.floor(ts * 0.55), Math.max(1, u * 0.5), Math.floor(ts * 0.23));
  }

  function drawTowerDoor(ctx, x, y, ts, time, col, row) {
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Wooden door inset on the floor
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.max(1, u * 0.6));
    // Iron straps
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, Math.max(1, u * 0.6));
    ctx.fillRect(x + 2*u, y + 11*u, ts - 4*u, Math.max(1, u * 0.6));
    // Doorknob
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + ts - 5*u, y + 8*u, Math.max(1, u * 1.2), Math.max(1, u * 1.2));
  }

  function drawCrystalAltar(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Altar base
    ctx.fillStyle = '#0e0820';
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, 5*u);
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, Math.max(1, u * 0.6));
    // Pulse halo
    var pulse = 0.7 + Math.sin(time / 600 + col + row) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    var grad = ctx.createRadialGradient(x + ts/2, y + 5*u, 0, x + ts/2, y + 5*u, ts * 1.4);
    grad.addColorStop(0, 'rgba(160, 100, 240, ' + (pulse * 0.55).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts, y - ts, ts * 3, ts * 3);
    ctx.globalCompositeOperation = 'source-over';
    // Crystal — diamond shape
    ctx.fillStyle = '#503090';
    ctx.beginPath();
    ctx.moveTo(x + ts/2, y + 2*u);
    ctx.lineTo(x + ts/2 + 4*u, y + 6*u);
    ctx.lineTo(x + ts/2, y + 9*u);
    ctx.lineTo(x + ts/2 - 4*u, y + 6*u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8060c0';
    ctx.beginPath();
    ctx.moveTo(x + ts/2, y + 2*u);
    ctx.lineTo(x + ts/2 + 2*u, y + 6*u);
    ctx.lineTo(x + ts/2, y + 9*u);
    ctx.lineTo(x + ts/2 - 2*u, y + 6*u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c0a0f0';
    ctx.fillRect(x + ts/2, y + 3*u, Math.max(1, u), 3*u);
  }

  function drawSorceress(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var bob = Math.sin(time / 700) > 0.85 ? -u : 0;
    // Robe — long
    ctx.fillStyle = '#3a2050';
    ctx.fillRect(x + 3*u, y + (5*u) + bob, 10*u, 9*u);
    // Robe lighter trim
    ctx.fillStyle = '#503070';
    ctx.fillRect(x + 3*u, y + (5*u) + bob, 10*u, Math.max(1, u * 0.6));
    // Belt
    ctx.fillStyle = '#a060d0';
    ctx.fillRect(x + 3*u, y + (9*u) + bob, 10*u, Math.max(1, u * 0.6));
    // Hood/head
    ctx.fillStyle = '#3a2050';
    ctx.fillRect(x + 4*u, y + (1*u) + bob, 8*u, 5*u);
    // Face shadow
    ctx.fillStyle = '#1a0a30';
    ctx.fillRect(x + 5*u, y + (3*u) + bob, 6*u, 3*u);
    // Glowing eyes
    var eyeBlink = Math.sin(time / 800) > 0.3 ? 1 : 0;
    if (eyeBlink) {
      ctx.fillStyle = '#c0a0f0';
      ctx.fillRect(x + 6*u, y + (3*u) + bob, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
      ctx.fillRect(x + 9*u, y + (3*u) + bob, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    }
    // Subtle aura
    var pulse = 0.5 + Math.sin(time / 500) * 0.2;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.3;
    var grad = ctx.createRadialGradient(x + ts/2, y + 7*u, 0, x + ts/2, y + 7*u, ts);
    grad.addColorStop(0, 'rgba(160,100,240,0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 2*u, y - 2*u, ts + 4*u, ts + 4*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawCandle(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Candleholder base
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 6*u, y + 11*u, 4*u, 3*u);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, Math.max(1, u * 0.6));
    // Candle
    ctx.fillStyle = '#e0e0d0';
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 4*u);
    ctx.fillStyle = '#b0b0a0';
    ctx.fillRect(x + Math.floor(8.4*u), y + 7*u, Math.max(1, u * 0.5), 4*u);
    // Wick
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + Math.floor(7.8*u), y + 6*u, Math.max(1, u * 0.4), Math.max(1, u));
    // Flame
    var flick = 0.7 + Math.sin(time / 130 + col) * 0.3;
    ctx.globalAlpha = flick;
    ctx.fillStyle = '#ffc060';
    ctx.fillRect(x + Math.floor(7.5*u), y + 4*u, Math.max(1, u), Math.max(1, u * 2));
    ctx.fillStyle = '#fff0a0';
    ctx.fillRect(x + Math.floor(7.7*u), y + Math.floor(4.5*u), Math.max(1, u * 0.6), Math.max(1, u));
    ctx.globalAlpha = 1;
    // Halo
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.4 * flick;
    var grad = ctx.createRadialGradient(x + 8*u, y + 5*u, 0, x + 8*u, y + 5*u, 8*u);
    grad.addColorStop(0, 'rgba(255, 200, 100, 0.65)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 4*u, y - 4*u, ts + 8*u, ts + 8*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawBookshelf(ctx, x, y, ts, time, col, row) {
    drawTowerWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Bookshelf box
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + u, y + Math.floor(ts * 0.32), ts - 2*u, Math.floor(ts * 0.48));
    // Shelves
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + u, y + Math.floor(ts * 0.32), ts - 2*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + u, y + Math.floor(ts * 0.48), ts - 2*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + u, y + Math.floor(ts * 0.66), ts - 2*u, Math.max(1, u * 0.5));
    // Books on each shelf
    var bookColors = ['#7a2030', '#5a2070', '#205070', '#705020', '#206050'];
    for (var s = 0; s < 2; s++) {
      var sy = y + Math.floor(ts * (s === 0 ? 0.34 : 0.50));
      for (var b = 0; b < 5; b++) {
        ctx.fillStyle = bookColors[(s * 5 + b) % bookColors.length];
        ctx.fillRect(x + (2 + b * 2)*u, sy, Math.max(1, u * 1.4), Math.max(1, u * 2.5));
      }
    }
  }

  function drawRune(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var pulse = 0.5 + Math.sin(time / 800 + col + row) * 0.3;
    // Rune circle
    ctx.strokeStyle = 'rgba(160, 100, 240, ' + pulse.toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, u * 0.5);
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, 5*u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, 3*u, 0, Math.PI * 2);
    ctx.stroke();
    // Cross marks
    ctx.fillStyle = 'rgba(200, 160, 255, ' + pulse.toFixed(2) + ')';
    ctx.fillRect(x + ts/2 - Math.max(1, u * 0.3), y + 3*u, Math.max(1, u * 0.6), 2*u);
    ctx.fillRect(x + ts/2 - Math.max(1, u * 0.3), y + 11*u, Math.max(1, u * 0.6), 2*u);
    ctx.fillRect(x + 3*u, y + ts/2 - Math.max(1, u * 0.3), 2*u, Math.max(1, u * 0.6));
    ctx.fillRect(x + 11*u, y + ts/2 - Math.max(1, u * 0.3), 2*u, Math.max(1, u * 0.6));
  }

  function drawTowerBackground(ctx, w, h, time) {
    ctx.fillStyle = '#0a0518';
    ctx.fillRect(0, 0, w, h);
  }

  BridgeWorld.registerTileset('tower', {
    1: drawTowerWall,
    2: drawTowerFloor,
    3: drawTowerDoor,
    4: drawCrystalAltar,
    5: drawSorceress,
    6: drawCandle,
    7: drawBookshelf,
    8: drawRune
  });

  BridgeWorld.registerBackground('tower', drawTowerBackground);

})();
