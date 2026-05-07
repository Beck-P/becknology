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
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // The door tile sits in the south wall row — fill the whole tile as
    // wall + door so it reads as "this is the door in the wall."
    // Wall context (matches drawTavernWall coloring)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.5));
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x, y + Math.floor(ts * 0.5), ts, ts - Math.floor(ts * 0.5));
    // Chair-rail line for continuity with surrounding wall tiles
    ctx.fillStyle = '#8a5e30';
    ctx.fillRect(x, y + Math.floor(ts * 0.5) - Math.max(1, u * 0.5), ts, Math.max(1, u));
    // Stone door frame (full height)
    var fx = x + Math.max(1, u);
    var fy = y + Math.max(1, u);
    var fw = ts - 2*u;
    var fh = ts - 2*u;
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(fx, fy, fw, fh);
    // Door panel — fills almost the entire tile vertically
    var dx = x + 2*u;
    var dy = y + Math.max(1, u * 1.6);
    var dw = ts - 4*u;
    var dh = ts - Math.max(1, u * 2.4);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(dx, dy, dw, dh);
    // Top highlight
    ctx.fillStyle = '#7a4e22';
    ctx.fillRect(dx, dy, dw, Math.max(1, u * 0.5));
    ctx.fillRect(dx, dy, Math.max(1, u * 0.5), dh);
    // Vertical wood plank seams
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(dx + Math.floor(dw * 0.33), dy, Math.max(1, u * 0.4), dh);
    ctx.fillRect(dx + Math.floor(dw * 0.66), dy, Math.max(1, u * 0.4), dh);
    // Iron straps with rivets
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(dx, dy + Math.floor(dh * 0.20), dw, Math.max(1, u * 0.7));
    ctx.fillRect(dx, dy + Math.floor(dh * 0.78), dw, Math.max(1, u * 0.7));
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(dx + Math.max(1, u * 0.4), dy + Math.floor(dh * 0.20), Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    ctx.fillRect(dx + dw - Math.max(1, u * 1), dy + Math.floor(dh * 0.20), Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    ctx.fillRect(dx + Math.max(1, u * 0.4), dy + Math.floor(dh * 0.78), Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    ctx.fillRect(dx + dw - Math.max(1, u * 1), dy + Math.floor(dh * 0.78), Math.max(1, u * 0.4), Math.max(1, u * 0.4));
    // Brass doorknob (right side, mid-height)
    var knobX = dx + dw - Math.max(1, u * 2.2);
    var knobY = dy + Math.floor(dh * 0.5);
    ctx.fillStyle = '#a08040';
    ctx.beginPath();
    ctx.arc(knobX, knobY, Math.max(1, u * 0.9), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(knobX - Math.max(1, u * 0.4), knobY - Math.max(1, u * 0.4), Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    // Warm interior light leaking out (subtle)
    var glow = 0.55 + Math.sin(time / 1200 + col + row) * 0.15;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = glow * 0.3;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts);
    grad.addColorStop(0, 'rgba(255, 200, 120, 0.55)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.3, y - ts*0.3, ts * 1.6, ts * 1.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

  function drawPiano(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Piano body (dark wood)
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 8*u);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, Math.max(1, u * 0.8));
    // Top of piano lid
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, Math.max(1, u * 0.5));
    // Keys
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(x + 3*u, y + 8*u, ts - 6*u, 2*u);
    // Black keys
    ctx.fillStyle = '#0a0a0a';
    var keyW = (ts - 6*u) / 8;
    for (var k = 0; k < 7; k++) {
      if (k !== 2 && k !== 5) {
        ctx.fillRect(x + 3*u + (k + 0.6) * keyW, y + 8*u, keyW * 0.7, Math.max(1, u * 1.2));
      }
    }
    // White key dividers
    ctx.fillStyle = '#a09080';
    for (var w = 1; w < 8; w++) {
      ctx.fillRect(x + 3*u + w * keyW, y + 8*u + Math.max(1, u * 1.2), Math.max(1, u * 0.3), Math.max(1, u * 0.8));
    }
    // Pedal
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.5), y + 11*u, Math.max(1, u), Math.max(1, u * 0.8));
    // Sheet music stand
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + 2*u, ts - 8*u, 2*u);
    ctx.fillStyle = '#d0c8a0';
    ctx.fillRect(x + 5*u, y + 2*u, ts - 10*u, Math.max(1, u * 1.4));
  }

  function drawDartBoard(ctx, x, y, ts, time, col, row) {
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Wooden mounting board
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 3*u, y + 4*u, ts - 6*u, ts - 8*u);
    // Dart board concentric rings
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, Math.max(1, u * 4), 0, Math.PI * 2);
    ctx.fill();
    // Outer ring (red/green)
    ctx.fillStyle = '#a02030';
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, Math.max(1, u * 3.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a601a';
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, Math.max(1, u * 2.8), 0, Math.PI * 2);
    ctx.fill();
    // Inner segments
    ctx.fillStyle = '#a09080';
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, Math.max(1, u * 2.2), 0, Math.PI * 2);
    ctx.fill();
    // Bullseye
    ctx.fillStyle = '#a02030';
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, Math.max(1, u * 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(x + ts/2, y + ts/2, Math.max(1, u * 0.4), 0, Math.PI * 2);
    ctx.fill();
    // Dart sticking out
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + ts/2 + u, y + ts/2 - 2*u, Math.max(1, u * 0.4), 2*u);
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(x + ts/2 + u + Math.max(1, u * 0.5), y + ts/2 - 3*u, Math.max(1, u * 0.7), Math.max(1, u));
  }

  function drawStove(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Stove body — dark iron
    ctx.fillStyle = '#1a1018';
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 10*u);
    // Top with stove pot
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + u, y + 4*u, ts - 2*u, Math.max(1, u * 1.5));
    // Pot
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 4*u, y + 2*u, ts - 8*u, 3*u);
    // Pot lid
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 4*u, y + 2*u, ts - 8*u, Math.max(1, u * 0.5));
    // Steam from pot
    var steam = (time / 100) % 8;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + Math.max(0, 2*u - steam * u), Math.max(1, u * 0.7), Math.max(1, u * 0.8));
    ctx.fillRect(x + Math.floor(ts * 0.55), y + Math.max(0, u - steam * u), Math.max(1, u * 0.7), Math.max(1, u * 0.8));
    ctx.globalAlpha = 1;
    // Stove door (front)
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(x + 4*u, y + 8*u, ts - 8*u, 4*u);
    // Fire viewing window
    var fire = 0.7 + Math.sin(time / 150) * 0.3;
    ctx.globalAlpha = fire;
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(x + 5*u, y + 9*u, ts - 10*u, 2*u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + Math.floor(ts/2) - u, y + Math.floor(9.5*u), 2*u, Math.max(1, u));
    ctx.globalAlpha = 1;
    // Halo glow from stove
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35 * fire;
    var grad = ctx.createRadialGradient(x + ts/2, y + 10*u, 0, x + ts/2, y + 10*u, ts);
    grad.addColorStop(0, 'rgba(255,160,60,0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawPatron(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var bob = Math.sin(time / 700 + col * 5) > 0.85 ? -u : 0;
    // Variable color based on tile position
    var pal = [
      { suit: '#3a607a', skin: '#e0c0a0', hair: '#3a2410' },
      { suit: '#603030', skin: '#d0a880', hair: '#2a1a08' },
      { suit: '#506030', skin: '#e8d0b0', hair: '#5a3a1a' }
    ];
    var p = pal[(col * 7 + row * 11) % 3];
    // Body
    ctx.fillStyle = p.suit;
    ctx.fillRect(x + 3*u, y + (6*u) + bob, 10*u, 5*u);
    // Vest highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 3*u, y + (6*u) + bob, 10*u, Math.max(1, u * 0.5));
    // Arm holding mug
    ctx.fillStyle = p.suit;
    ctx.fillRect(x + 11*u, y + (8*u) + bob, 2*u, 2*u);
    ctx.fillStyle = '#c8aa70';
    ctx.fillRect(x + 12*u, y + (7*u) + bob, 2*u, 2*u);
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(x + 12*u, y + (7*u) + bob, 2*u, Math.max(1, u * 0.4));
    // Skin
    ctx.fillStyle = p.skin;
    ctx.fillRect(x + 4*u, y + (u) + bob, 8*u, 5*u);
    // Hair
    ctx.fillStyle = p.hair;
    ctx.fillRect(x + 4*u, y + (u) + bob, 8*u, Math.max(1, u * 1.4));
    // Eyes
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 5*u, y + (3*u) + bob, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.fillRect(x + 9*u, y + (3*u) + bob, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    // Smile
    ctx.fillStyle = p.hair;
    ctx.fillRect(x + 6*u, y + (4*u) + bob, 4*u, Math.max(1, u * 0.4));
    // Legs
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + (11*u) + bob, 3*u, 4*u);
    ctx.fillRect(x + 9*u, y + (11*u) + bob, 3*u, 4*u);
    // Boots
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(x + 3*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 9*u, y + 14*u, 4*u, u);
  }

  function drawBarrel(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Barrel body
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 3*u, y + 4*u, ts - 6*u, 9*u);
    // Iron bands (top and bottom)
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, Math.max(1, u * 0.7));
    ctx.fillRect(x + 3*u, y + 8*u, ts - 6*u, Math.max(1, u * 0.7));
    ctx.fillRect(x + 3*u, y + 11*u, ts - 6*u, Math.max(1, u * 0.7));
    // Wood plank vertical seams
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.3), y + 4*u, Math.max(1, u * 0.6), 9*u);
    // Top of barrel (round)
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 4*u, Math.max(1, u * 4.5), Math.max(1, u * 1.2), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + Math.max(1, 3.7*u), Math.max(1, u * 4.5), Math.max(1, u * 1.2), 0, 0, Math.PI * 2);
    ctx.fill();
    // Tap on the side
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + ts - 4*u, y + 9*u, Math.max(1, u * 1.5), Math.max(1, u * 1.2));
    ctx.fillRect(x + ts - 3*u, y + 10*u, Math.max(1, u * 0.6), Math.max(1, u * 1.2));
  }

  function drawCoatRack(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Pole
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.4), y + 3*u, Math.max(1, u * 0.8), 11*u);
    // Hooks at top
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 5*u, y + 3*u, 2*u, Math.max(1, u * 0.5));
    ctx.fillRect(x + ts - 7*u, y + 3*u, 2*u, Math.max(1, u * 0.5));
    // Hat hanging
    ctx.fillStyle = '#3a2030';
    ctx.fillRect(x + 4*u, y + 3*u, 4*u, 2*u);
    ctx.fillRect(x + 5*u, y + 2*u, 2*u, Math.max(1, u * 1.2));
    // Coat hanging
    ctx.fillStyle = '#603020';
    ctx.fillRect(x + 9*u, y + 4*u, 4*u, 5*u);
    ctx.fillStyle = '#3a1810';
    ctx.fillRect(x + 9*u, y + 4*u, 4*u, Math.max(1, u * 0.5));
    // Base
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(x + Math.floor(ts/2) - 2*u, y + 13*u, 4*u, Math.max(1, u * 0.8));
  }

  function drawWallPainting(ctx, x, y, ts, time, col, row) {
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Frame
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, 7*u);
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(x + Math.max(1, 3.5*u), y + Math.max(1, 3.5*u), ts - 7*u, 6*u);
    // Painting — sea / ship
    var grad = ctx.createLinearGradient(x, y + 4*u, x, y + 9*u);
    grad.addColorStop(0, '#3a4858');
    grad.addColorStop(0.5, '#1a3050');
    grad.addColorStop(1, '#205040');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 4*u, y + 4*u, ts - 8*u, 5*u);
    // Ship silhouette
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + Math.floor(ts/2) - 2*u, y + 6*u, 4*u, Math.max(1, u * 0.8));
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.4), y + 4*u, Math.max(1, u * 0.8), 2*u);
    // Sun/moon
    ctx.fillStyle = '#e8c060';
    ctx.beginPath();
    ctx.arc(x + Math.floor(ts/2) + 3*u, y + 5*u, Math.max(1, u * 0.7), 0, Math.PI * 2);
    ctx.fill();
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
    10: drawWindow,
    11: drawPiano,
    12: drawDartBoard,
    13: drawStove,
    14: drawPatron,
    15: drawBarrel,
    16: drawCoatRack,
    17: drawWallPainting
  });

  BridgeWorld.registerBackground('tavern', drawTavernBackground);

})();
