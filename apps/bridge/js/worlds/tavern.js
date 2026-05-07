/**
 * Tavern World Module — A cozy interior tavern.
 *
 * Wood-plank floor, paneled walls, a long bar counter with stools,
 * round tables, a warm fireplace, and a bartender. Designed in the
 * Stardew Valley vein — clearly indoors, distinct from the outside world.
 */
(function () {

  function drawWoodFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    // Vary plank tone so adjacent tiles don't look identical
    var seed = (col * 23 + row * 17) % 100;
    var bands = (col + row) % 2 === 0 ? '#7a5430' : '#6e4a28';
    ctx.fillStyle = bands;
    ctx.fillRect(x, y, ts, ts);
    // Plank seam — every 4u horizontal line
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y + 4*u, ts, Math.max(1, u * 0.6));
    ctx.fillRect(x, y + 8*u, ts, Math.max(1, u * 0.6));
    ctx.fillRect(x, y + 12*u, ts, Math.max(1, u * 0.6));
    // Top highlight on each plank
    ctx.fillStyle = '#9a6e44';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.4));
    ctx.fillRect(x, y + 4*u + Math.max(1, u * 0.6), ts, Math.max(1, u * 0.3));
    ctx.fillRect(x, y + 8*u + Math.max(1, u * 0.6), ts, Math.max(1, u * 0.3));
    ctx.fillRect(x, y + 12*u + Math.max(1, u * 0.6), ts, Math.max(1, u * 0.3));
    // Wood grain
    ctx.fillStyle = 'rgba(40, 24, 10, 0.4)';
    ctx.fillRect(x + (seed % 5) * u, y + 1*u, 4*u, Math.max(1, u * 0.3));
    ctx.fillRect(x + ((seed * 3) % 5) * u + 2*u, y + 5*u, 5*u, Math.max(1, u * 0.3));
    ctx.fillRect(x + ((seed * 5) % 5) * u + u, y + 9*u, 4*u, Math.max(1, u * 0.3));
    ctx.fillRect(x + ((seed * 7) % 5) * u + 3*u, y + 13*u, 4*u, Math.max(1, u * 0.3));
    // Knot
    if (seed % 11 === 0) {
      ctx.fillStyle = '#2a1808';
      ctx.fillRect(x + 4*u, y + 6*u, 2*u, 2*u);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x + 4*u, y + 6*u, u, u);
    }
  }

  function drawTavernWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    // Top dado (darker upper half)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.5));
    // Lower wainscot — wood paneling
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x, y + Math.floor(ts * 0.5), ts, ts - Math.floor(ts * 0.5));
    // Chair rail (separator)
    ctx.fillStyle = '#8a5e30';
    ctx.fillRect(x, y + Math.floor(ts * 0.5) - Math.max(1, u * 0.5), ts, Math.max(1, u));
    ctx.fillStyle = '#4a2e16';
    ctx.fillRect(x, y + Math.floor(ts * 0.5) + Math.max(1, u), ts, Math.max(1, u * 0.4));
    // Vertical panel seams in lower half
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + Math.floor(ts * 0.5) - Math.max(1, u * 0.3), y + Math.floor(ts * 0.5), Math.max(1, u * 0.6), ts - Math.floor(ts * 0.5));
    // Subtle highlight on top dado
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.4));
  }

  function drawBarCounter(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    // Wood counter top
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x, y, ts, ts);
    // Counter top edge
    ctx.fillStyle = '#7a4e22';
    ctx.fillRect(x, y, ts, Math.max(1, u * 1.4));
    // Front panel detail
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y + Math.max(1, u * 1.4), ts, Math.max(1, u * 0.5));
    // Vertical stiles on the front
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + Math.floor(ts * 0.5) - Math.max(1, u * 0.3), y + Math.max(1, u * 2), Math.max(1, u * 0.6), ts - Math.max(1, u * 2.5));
    // Brass nail studs
    ctx.fillStyle = '#c8a850';
    ctx.fillRect(x + 2*u, y + Math.max(1, u * 0.5), Math.max(1, u * 0.6), Math.max(1, u * 0.6));
    ctx.fillRect(x + ts - 3*u, y + Math.max(1, u * 0.5), Math.max(1, u * 0.6), Math.max(1, u * 0.6));
    // Mug or bottle on counter (varies)
    var seed = (col * 11 + row * 17) % 4;
    if (seed === 0) {
      // Mug
      ctx.fillStyle = '#c8aa70';
      ctx.fillRect(x + 5*u, y + 4*u, 3*u, 4*u);
      ctx.fillStyle = '#8a6840';
      ctx.fillRect(x + 5*u, y + 4*u, 3*u, Math.max(1, u * 0.6));
      // Handle
      ctx.fillStyle = '#a08850';
      ctx.fillRect(x + 8*u, y + 5*u, Math.max(1, u * 0.7), 2*u);
      // Foam
      ctx.fillStyle = '#f0e8d0';
      ctx.fillRect(x + 5*u, y + 4*u, 3*u, Math.max(1, u * 0.4));
    } else if (seed === 1) {
      // Bottle
      ctx.fillStyle = '#1a4a2a';
      ctx.fillRect(x + 6*u, y + 3*u, 2*u, 5*u);
      ctx.fillStyle = '#205a35';
      ctx.fillRect(x + 6*u, y + 3*u, Math.max(1, u * 0.5), 5*u);
      // Cork
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(x + Math.floor(6.3 * u), y + 2*u, Math.max(1, u * 1.4), Math.max(1, u * 1));
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 6*u, y + 4*u, Math.max(1, u * 0.4), 2*u);
    }
    // (other seeds = empty counter)
  }

  function drawStool(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Seat
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 6*u, 4*u, Math.max(1, u * 1.2), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + Math.floor(5.5 * u), 4*u, Math.max(1, u * 1.2), 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#7a4e22';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + Math.floor(5.2 * u), 3*u, Math.max(1, u * 0.6), 0, 0, Math.PI * 2);
    ctx.fill();
    // Single leg in center (slim profile)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + ts/2 - Math.max(1, u * 0.6), y + 7*u, Math.max(1, u * 1.2), 6*u);
    // Foot ring
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + ts/2 - 2*u, y + 12*u, 4*u, Math.max(1, u * 0.8));
    // Floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 14*u, 3*u, Math.max(1, u * 0.7), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTavernTable(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Round tabletop
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 6*u, 6*u, Math.max(1, u * 1.6), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + Math.floor(5.5 * u), 6*u, Math.max(1, u * 1.6), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4e22';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 5*u, 5*u, Math.max(1, u * 0.7), 0, 0, Math.PI * 2);
    ctx.fill();
    // Pedestal leg
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + ts/2 - Math.max(1, u * 0.8), y + 7*u, Math.max(1, u * 1.6), 6*u);
    // Base
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 13*u, 4*u, Math.max(1, u * 0.8), 0, 0, Math.PI * 2);
    ctx.fill();
    // Item on table (varies)
    var seed = (col * 7 + row * 11) % 3;
    if (seed === 0) {
      // Plate with food
      ctx.fillStyle = '#d8d8c0';
      ctx.beginPath();
      ctx.ellipse(x + ts/2, y + 4*u, 3*u, Math.max(1, u * 0.7), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a08040';
      ctx.beginPath();
      ctx.ellipse(x + ts/2, y + Math.floor(3.7 * u), Math.max(1, u * 1.5), Math.max(1, u * 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (seed === 1) {
      // Two mugs
      ctx.fillStyle = '#c8aa70';
      ctx.fillRect(x + Math.floor(ts/2 - 3*u), y + 3*u, 2*u, Math.max(1, u * 1.6));
      ctx.fillRect(x + Math.floor(ts/2 + u), y + 3*u, 2*u, Math.max(1, u * 1.6));
      ctx.fillStyle = '#f0e8d0';
      ctx.fillRect(x + Math.floor(ts/2 - 3*u), y + 3*u, 2*u, Math.max(1, u * 0.5));
      ctx.fillRect(x + Math.floor(ts/2 + u), y + 3*u, 2*u, Math.max(1, u * 0.5));
    }
  }

  function drawFireplace(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Wall behind
    drawTavernWall(ctx, x, y, ts, time, col, row);
    // Stone hearth surround
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(x, y + 2*u, ts, ts - 4*u);
    // Inner opening (dark)
    ctx.fillStyle = '#0a0408';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, ts - 7*u);
    // Stone blocks pattern
    ctx.fillStyle = '#5a4848';
    ctx.fillRect(x, y + 2*u, ts, Math.max(1, u * 0.5));
    ctx.fillStyle = '#2a1e1e';
    ctx.fillRect(x, y + 6*u, ts, Math.max(1, u * 0.4));
    ctx.fillRect(x, y + 10*u, ts, Math.max(1, u * 0.4));
    ctx.fillRect(x + Math.floor(ts/2), y + 2*u, Math.max(1, u * 0.4), 4*u);
    ctx.fillRect(x + Math.floor(ts * 0.3), y + 6*u, Math.max(1, u * 0.4), 4*u);
    ctx.fillRect(x + Math.floor(ts * 0.7), y + 6*u, Math.max(1, u * 0.4), 4*u);
    // Logs
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.7), ts - 8*u, Math.max(1, u * 1.2));
    ctx.fillRect(x + 5*u, y + Math.floor(ts * 0.78), ts - 10*u, Math.max(1, u * 1.2));
    // Flickering flame
    var flick = 0.7 + Math.sin(time / 130 + col + row) * 0.3 + Math.sin(time / 70) * 0.1;
    flick = Math.max(0.3, Math.min(1, flick));
    var flameH = (3 + Math.sin(time / 200) * 0.6) * u;
    ctx.globalAlpha = flick;
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(x + Math.floor(ts/2 - 2*u), y + Math.floor(ts * 0.55), 4*u, flameH);
    ctx.fillStyle = '#ffc060';
    ctx.fillRect(x + Math.floor(ts/2 - u), y + Math.floor(ts * 0.55) + Math.max(1, u * 0.5), 2*u, flameH * 0.7);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + Math.floor(ts/2 - Math.max(1, u * 0.5)), y + Math.floor(ts * 0.55) + Math.max(1, u), Math.max(1, u), flameH * 0.4);
    ctx.globalAlpha = 1;
    // Big halo
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.4 * flick;
    var grad = ctx.createRadialGradient(x + ts/2, y + Math.floor(ts * 0.7), 0, x + ts/2, y + Math.floor(ts * 0.7), ts * 1.4);
    grad.addColorStop(0, 'rgba(255, 160, 60, 0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts, y - ts, ts * 3, ts * 3);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawTavernDoor(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Doormat
    ctx.fillStyle = '#704030';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    ctx.fillStyle = '#603020';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + 2*u, y + ts - 3*u, ts - 4*u, Math.max(1, u * 0.5));
    // Mat fringe
    ctx.fillStyle = '#502818';
    for (var fx = 0; fx < 6; fx++) {
      ctx.fillRect(x + (3 + fx*2)*u, y + Math.max(1, u * 1.4), Math.max(1, u * 0.5), Math.max(1, u * 0.6));
      ctx.fillRect(x + (3 + fx*2)*u, y + ts - 2*u, Math.max(1, u * 0.5), Math.max(1, u * 0.6));
    }
  }

  function drawBartender(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Floor base behind
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var bob = Math.sin(time / 600) > 0.85 ? -u : 0;
    // Apron/body
    ctx.fillStyle = '#704040';
    ctx.fillRect(x + 3*u, y + (6*u) + bob, 10*u, 5*u);
    // Apron strap
    ctx.fillStyle = '#5a3030';
    ctx.fillRect(x + 4*u, y + (6*u) + bob, 8*u, Math.max(1, u * 0.4));
    // Apron tie
    ctx.fillStyle = '#4a2020';
    ctx.fillRect(x + 3*u, y + (10*u) + bob, 10*u, Math.max(1, u * 0.6));
    // Skin (head)
    ctx.fillStyle = '#e0c0a0';
    ctx.fillRect(x + 5*u, y + (u) + bob, 6*u, 5*u);
    // Mustache
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 5*u, y + (4*u) + bob, 6*u, Math.max(1, u * 0.7));
    // Eyes
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 6*u, y + (3*u) + bob, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.fillRect(x + 9*u, y + (3*u) + bob, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    // Hair
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + (u) + bob, 8*u, Math.max(1, u * 1.4));
    // Legs
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + (11*u) + bob, 3*u, 4*u);
    ctx.fillRect(x + 9*u, y + (11*u) + bob, 3*u, 4*u);
    // Boots
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(x + 3*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 9*u, y + 14*u, 4*u, u);
  }

  function drawShelf(ctx, x, y, ts, time, col, row) {
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Shelf board
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y + 4*u, ts, Math.max(1, u));
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x, y + 4*u, ts, Math.max(1, u * 0.5));
    // Bottles on shelf — 3 different bottles
    var bottles = [
      { x: 2, color: '#1a4a2a', cork: '#5a3a1a' },
      { x: 7, color: '#4a1a2a', cork: '#5a3a1a' },
      { x: 12, color: '#1a2a4a', cork: '#5a3a1a' }
    ];
    for (var i = 0; i < bottles.length; i++) {
      var b = bottles[i];
      ctx.fillStyle = b.color;
      ctx.fillRect(x + b.x*u, y + 0*u, 2*u, 4*u);
      ctx.fillStyle = b.cork;
      ctx.fillRect(x + (b.x + 0.3)*u, y - Math.max(1, u * 0.5), Math.max(1, u * 1.4), Math.max(1, u));
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + b.x*u, y + 0*u, Math.max(1, u * 0.5), 3*u);
    }
    // Lower shelf board
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y + 9*u, ts, Math.max(1, u));
    // Items on lower shelf
    ctx.fillStyle = '#a08050';
    ctx.fillRect(x + 3*u, y + 6*u, 3*u, 3*u);
    ctx.fillStyle = '#806030';
    ctx.fillRect(x + 8*u, y + 7*u, 4*u, 2*u);
  }

  function drawWindow(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawTavernWall(ctx, x, y, ts, time, col, row);
    // Window frame
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.1), ts - 4*u, Math.floor(ts * 0.4));
    // Glass
    var glow = 0.5 + Math.sin(time / 1500) * 0.1;
    ctx.fillStyle = 'rgba(80,140,180,' + glow.toFixed(2) + ')';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.13), ts - 6*u, Math.floor(ts * 0.34));
    // Cross mullions
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + Math.floor(ts/2 - Math.max(1, u * 0.4)), y + Math.floor(ts * 0.1), Math.max(1, u * 0.8), Math.floor(ts * 0.4));
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.27), ts - 4*u, Math.max(1, u * 0.6));
    // Sill
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + u, y + Math.floor(ts * 0.5), ts - 2*u, Math.max(1, u * 0.8));
  }

  // ---- Custom background — soft warm interior light ----
  function drawTavernBackground(ctx, w, h, time) {
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(0, 0, w, h);
  }

  BridgeWorld.registerTileset('tavern', {
    1: drawTavernWall,
    2: drawWoodFloor,
    3: drawTavernDoor,
    4: drawBarCounter,
    5: drawStool,
    6: drawTavernTable,
    7: drawFireplace,
    8: drawBartender,
    9: drawShelf,
    10: drawWindow
  });

  BridgeWorld.registerBackground('tavern', drawTavernBackground);

})();
