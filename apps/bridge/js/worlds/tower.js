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
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Floor at the bottom (where the player stands)
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    // Stone wall arch behind the door (top portion)
    ctx.fillStyle = '#0e0820';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.65));
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(x + Math.max(1, u), y + Math.max(1, u), ts - 2*u, Math.floor(ts * 0.6));
    // Heavy iron-banded oak door
    var dx = x + 2*u, dy = y + 2*u;
    var dw = ts - 4*u, dh = Math.floor(ts * 0.55);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(dx + Math.max(1, u * 0.5), dy + Math.max(1, u * 0.5), dw - u, dh - u);
    // Vertical planks
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(dx + Math.floor(dw * 0.5), dy, Math.max(1, u * 0.5), dh);
    // Iron rivets on straps
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(dx, dy + 2*u, dw, Math.max(1, u * 0.7));
    ctx.fillRect(dx, dy + dh - 3*u, dw, Math.max(1, u * 0.7));
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(dx + Math.max(1, u * 0.5), dy + 2*u, Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    ctx.fillRect(dx + dw - Math.max(1, u * 1), dy + 2*u, Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    ctx.fillRect(dx + Math.max(1, u * 0.5), dy + dh - 3*u, Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    ctx.fillRect(dx + dw - Math.max(1, u * 1), dy + dh - 3*u, Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    // Big iron pull-ring on the door
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = Math.max(1, u * 0.6);
    ctx.beginPath();
    ctx.arc(dx + dw - 3*u, dy + Math.floor(dh * 0.55), Math.max(1, u * 1.1), 0, Math.PI * 2);
    ctx.stroke();
    // Magic wisp / EXIT sign above the door (subtle purple glow)
    var pulse = 0.5 + Math.sin(time / 800) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.5;
    var grad = ctx.createRadialGradient(x + ts/2, y + Math.floor(ts * 0.2), 0, x + ts/2, y + Math.floor(ts * 0.2), ts * 0.5);
    grad.addColorStop(0, 'rgba(160,100,240,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

  function drawAlchemyTable(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Table
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, 2*u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, Math.max(1, u * 0.5));
    // Legs
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(x + 3*u, y + 8*u, Math.max(1, u), 6*u);
    ctx.fillRect(x + ts - 4*u, y + 8*u, Math.max(1, u), 6*u);
    // Bubbling potion bottle (green)
    var bubble = Math.sin(time / 250) * 0.5 + 0.5;
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(x + 4*u, y + 3*u, 2*u, 3*u);
    ctx.fillStyle = '#40a060';
    ctx.fillRect(x + 4*u, y + Math.floor(4*u - bubble * u), 2*u, Math.max(1, u * (2 + bubble)));
    ctx.globalAlpha = bubble;
    ctx.fillStyle = '#a0e0a0';
    ctx.fillRect(x + Math.floor(4.5*u), y + 3*u, Math.max(1, u), Math.max(1, u * 0.5));
    ctx.globalAlpha = 1;
    // Purple potion bottle
    ctx.fillStyle = '#3a2050';
    ctx.fillRect(x + 7*u, y + 4*u, Math.max(1, u * 1.4), 2*u);
    ctx.fillStyle = '#a060d0';
    ctx.fillRect(x + 7*u, y + Math.floor(4.5*u), Math.max(1, u * 1.4), Math.max(1, u * 1.5));
    // Cork
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + Math.floor(7.3*u), y + Math.max(1, u * 3.5), Math.max(1, u * 0.8), Math.max(1, u * 0.6));
    // Beaker on table
    ctx.fillStyle = '#a0c0d0';
    ctx.fillRect(x + 10*u, y + 4*u, 2*u, 2*u);
    ctx.fillStyle = '#80a0c0';
    ctx.fillRect(x + Math.floor(10.5*u), y + 3*u, Math.max(1, u * 0.6), Math.max(1, u * 1.4));
    // Ingredient pile
    ctx.fillStyle = '#604030';
    ctx.fillRect(x + 13*u, y + 5*u, Math.max(1, u * 1.4), Math.max(1, u));
    // Open book
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 4*u, y + Math.max(1, 5.5*u), 3*u, Math.max(1, u * 0.6));
    ctx.fillStyle = '#f0e0c0';
    ctx.fillRect(x + Math.floor(4.5*u), y + Math.max(1, 5.5*u), Math.max(1, u * 2), Math.max(1, u * 0.4));
  }

  function drawTelescope(ctx, x, y, ts, time, col, row) {
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Tripod
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.4), y + 6*u, Math.max(1, u * 0.8), 8*u);
    ctx.fillRect(x + 4*u, y + 12*u, Math.max(1, u * 0.5), 2*u);
    ctx.fillRect(x + ts - 5*u, y + 12*u, Math.max(1, u * 0.5), 2*u);
    // Telescope barrel — angled
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 4*u, y + 3*u, ts - 8*u, 2*u);
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(x + 4*u, y + 3*u, ts - 8*u, Math.max(1, u * 0.5));
    // Eyepiece
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 3*u, y + 3*u, Math.max(1, u * 1.5), 2*u);
    // Far end
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + ts - 6*u, y + 3*u, Math.max(1, u * 2), 2*u);
    // Brass collar
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.6), y + 4*u, Math.max(1, u * 1.2), Math.max(1, u * 0.5));
  }

  function drawCauldron(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Tripod stand
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 4*u, y + 11*u, Math.max(1, u * 0.6), 4*u);
    ctx.fillRect(x + ts - 5*u, y + 11*u, Math.max(1, u * 0.6), 4*u);
    ctx.fillRect(x + Math.floor(ts/2), y + 11*u, Math.max(1, u * 0.6), 4*u);
    // Cauldron pot
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 9*u, 6*u, Math.max(1, u * 2.5), 0, 0, Math.PI * 2);
    ctx.fill();
    // Bubbling potion inside
    var bubble = Math.sin(time / 200) * 0.3 + 0.7;
    ctx.fillStyle = '#7030a0';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 8*u, Math.max(1, u * 5), Math.max(1, u * 1.5), 0, 0, Math.PI * 2);
    ctx.fill();
    // Bubbles
    ctx.fillStyle = '#a060d0';
    ctx.globalAlpha = bubble;
    ctx.beginPath();
    ctx.arc(x + ts/2 - 2*u, y + 7*u, Math.max(1, u * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + ts/2 + 2*u, y + Math.max(1, 7.5*u), Math.max(1, u * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Steam rising
    var steam = (time / 100) % 6;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#c0a0d0';
    ctx.fillRect(x + ts/2 - 2*u, y + Math.max(0, 5*u - steam * u), Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.fillRect(x + ts/2 + 2*u, y + Math.max(0, 4*u - steam * u), Math.max(1, u * 0.6), Math.max(1, u * 0.6));
    ctx.globalAlpha = 1;
    // Magical halo
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35;
    var grad = ctx.createRadialGradient(x + ts/2, y + 8*u, 0, x + ts/2, y + 8*u, ts);
    grad.addColorStop(0, 'rgba(160, 80, 220, 0.55)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawFamiliar(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Floating black cat / familiar
    var bob = Math.sin(time / 600) * u * 0.5;
    // Body — black cat curled
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 8*u + bob, 4*u, Math.max(1, u * 2.5), 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.arc(x + 5*u, y + 7*u + bob, Math.max(1, u * 1.5), 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(x + 4*u, y + 5*u + bob);
    ctx.lineTo(x + Math.floor(4.5*u), y + 6*u + bob);
    ctx.lineTo(x + Math.floor(3.5*u), y + 6*u + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 6*u, y + 5*u + bob);
    ctx.lineTo(x + Math.floor(6.5*u), y + 6*u + bob);
    ctx.lineTo(x + Math.floor(5.5*u), y + 6*u + bob);
    ctx.closePath();
    ctx.fill();
    // Tail (curled)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 9*u, y + 6*u + bob, 2*u, Math.max(1, u));
    ctx.fillRect(x + 11*u, y + 5*u + bob, Math.max(1, u), 3*u);
    // Glowing yellow eyes
    var blink = Math.sin(time / 1500) > 0.3;
    if (blink) {
      ctx.fillStyle = '#ffe080';
      ctx.fillRect(x + Math.floor(4.5*u), y + 7*u + bob, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
      ctx.fillRect(x + Math.floor(5.5*u), y + 7*u + bob, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    }
    // Magic aura
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25;
    var grad = ctx.createRadialGradient(x + ts/2, y + 8*u, 0, x + ts/2, y + 8*u, ts * 0.7);
    grad.addColorStop(0, 'rgba(160, 100, 240, 0.5)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 2*u, y - 2*u, ts + 4*u, ts + 4*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawScrollPile(ctx, x, y, ts, time, col, row) {
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Pile of rolled scrolls
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(x + 3*u, y + 11*u, ts - 6*u, 2*u);
    ctx.fillStyle = '#a89870';
    ctx.fillRect(x + 3*u, y + 11*u, ts - 6*u, Math.max(1, u * 0.5));
    // Stacked scroll
    ctx.fillStyle = '#e8d8a8';
    ctx.fillRect(x + 4*u, y + 9*u, ts - 8*u, 2*u);
    ctx.fillStyle = '#b89870';
    ctx.fillRect(x + 4*u, y + 9*u, ts - 8*u, Math.max(1, u * 0.5));
    // Top scroll (open with red wax seal)
    ctx.fillStyle = '#f0e0c0';
    ctx.fillRect(x + 5*u, y + 6*u, ts - 10*u, 3*u);
    ctx.fillStyle = '#a02030';
    ctx.beginPath();
    ctx.arc(x + ts/2, y + Math.floor(7.5*u), Math.max(1, u * 0.7), 0, Math.PI * 2);
    ctx.fill();
    // Text lines on scroll
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(x + Math.floor(5.5*u), y + Math.floor(6.5*u), Math.max(1, u * 1.5), Math.max(1, u * 0.4));
    ctx.fillRect(x + Math.floor(5.5*u), y + Math.floor(7.3*u), Math.max(1, u * 1.5), Math.max(1, u * 0.4));
  }

  function drawSpellCircle(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var pulse = 0.6 + Math.sin(time / 700 + col + row) * 0.3;
    // Outer rotating ring
    ctx.save();
    ctx.translate(x + ts/2, y + ts/2);
    ctx.rotate(time / 3000);
    ctx.strokeStyle = 'rgba(160, 100, 240, ' + pulse.toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, u * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, 6*u, 0, Math.PI * 2);
    ctx.stroke();
    // Inner triangle
    ctx.beginPath();
    ctx.moveTo(0, -4*u);
    ctx.lineTo(Math.cos(Math.PI/6) * 4*u, Math.sin(Math.PI/6) * 4*u);
    ctx.lineTo(-Math.cos(Math.PI/6) * 4*u, Math.sin(Math.PI/6) * 4*u);
    ctx.closePath();
    ctx.stroke();
    // Inner ring
    ctx.beginPath();
    ctx.arc(0, 0, 2*u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Center floating crystal
    ctx.fillStyle = '#c0a0f0';
    ctx.fillRect(x + ts/2 - Math.max(1, u * 0.5), y + ts/2 - Math.max(1, u * 0.5), Math.max(1, u), Math.max(1, u));
    // Glow
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 0.8);
    grad.addColorStop(0, 'rgba(180, 120, 240, 0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.3, y - ts*0.3, ts * 1.6, ts * 1.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  BridgeWorld.registerTileset('tower', {
    1: drawTowerWall,
    2: drawTowerFloor,
    3: drawTowerDoor,
    4: drawCrystalAltar,
    5: drawSorceress,
    6: drawCandle,
    7: drawBookshelf,
    8: drawRune,
    9: drawAlchemyTable,
    10: drawTelescope,
    11: drawCauldron,
    12: drawFamiliar,
    13: drawScrollPile,
    14: drawSpellCircle
  });

  BridgeWorld.registerBackground('tower', drawTowerBackground);

})();
