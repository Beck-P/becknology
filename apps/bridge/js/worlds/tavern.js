/**
 * Tavern World Module — A cozy interior tavern.
 *
 * Wood-plank floor, paneled walls, a long bar counter with stools,
 * round tables, a warm fireplace, and a bartender. All drawers conform
 * to the strict 16-px-per-tile pixel art spec in apps/bridge/CLAUDE.md.
 */
(function () {

  // Wood-plank floor — 4 horizontal 4u planks, hard 1u top highlight + 1u
  // bottom seam per plank. Whole-u rects only.
  function drawWoodFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    var BASE = (col + row) % 2 === 0 ? '#7a5430' : '#6e4a28';
    var SEAM = '#3a2410';
    var HI = '#9a6e44';
    var GRAIN = '#5a3818';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // 4 planks (4u tall each). 1u top highlight + 1u bottom seam.
    for (var p = 0; p < 4; p++) {
      var py = y + p * 4 * u;
      ctx.fillStyle = HI;
      ctx.fillRect(x, py, ts, u);              // top highlight
      ctx.fillStyle = SEAM;
      ctx.fillRect(x, py + 3*u, ts, u);        // bottom seam
      // Grain dash (1u tall)
      if ((seed + p) % 3 === 0) {
        ctx.fillStyle = GRAIN;
        var gx = x + ((seed * (p + 1)) % 8) * u;
        ctx.fillRect(gx, py + u, 4*u, u);
      }
    }
    // Knot
    if (seed % 11 === 0) {
      ctx.fillStyle = '#2a1808';
      ctx.fillRect(x + 4*u, y + 6*u, 2*u, 2*u);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x + 4*u, y + 6*u, u, u);
    }
  }

  // Tavern wall — strict pixel art. 8u dado + 8u wainscot, hard chair-rail
  // band, vertical panel seams.
  function drawTavernWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DADO_DK = '#2a1808';
    var DADO = '#3a2410';
    var DADO_HI = '#5a3a18';
    var RAIL = '#8a5e30';
    var WAINSCOT = '#5a3a1a';
    var WAINSCOT_DK = '#3a2410';
    // Top dado (8u)
    ctx.fillStyle = DADO;
    ctx.fillRect(x, y, ts, 8*u);
    ctx.fillStyle = DADO_HI;
    ctx.fillRect(x, y, ts, u);     // 1u top highlight
    // Chair-rail (1u rail + 1u shadow)
    ctx.fillStyle = RAIL;
    ctx.fillRect(x, y + 7*u, ts, u);
    ctx.fillStyle = DADO_DK;
    ctx.fillRect(x, y + 8*u, ts, u);
    // Wainscot (8u)
    ctx.fillStyle = WAINSCOT;
    ctx.fillRect(x, y + 9*u, ts, 7*u);
    // Vertical panel seams (1u verticals every 4u)
    ctx.fillStyle = WAINSCOT_DK;
    ctx.fillRect(x + 4*u, y + 9*u, u, 7*u);
    ctx.fillRect(x + 12*u, y + 9*u, u, 7*u);
  }

  // Bar counter — strict pixel art. 16u × 16u tile with 2u top + 14u front,
  // 1u brass nail studs, varied 3u × 4u mug/bottle.
  function drawBarCounter(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DARK = '#1a0e08';
    var WOOD = '#5a3a1a';
    var WOOD_HI = '#7a4e22';
    // Body
    ctx.fillStyle = WOOD;
    ctx.fillRect(x, y, ts, ts);
    // 2u top edge highlight
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x, y, ts, 2*u);
    // 1u shadow under top
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 2*u, ts, u);
    // Vertical center stile (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 8*u, y + 3*u, u, 13*u);
    // Brass nail studs (1u each)
    ctx.fillStyle = '#c8a850';
    ctx.fillRect(x + 2*u, y, u, u);
    ctx.fillRect(x + 13*u, y, u, u);
    // Mug or bottle on counter
    var seed = (col * 11 + row * 17) % 4;
    if (seed === 0) {
      // Mug (3u × 4u with 1u handle)
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 5*u, y + 4*u, 3*u, 4*u);
      ctx.fillStyle = '#c8aa70';
      ctx.fillRect(x + 5*u, y + 4*u, 3*u, 4*u);
      ctx.fillStyle = '#8a6840';
      ctx.fillRect(x + 5*u, y + 4*u, 3*u, u);
      // Foam (1u)
      ctx.fillStyle = '#f0e8d0';
      ctx.fillRect(x + 5*u, y + 4*u, 3*u, u);
      // Handle (1u × 2u)
      ctx.fillStyle = '#a08850';
      ctx.fillRect(x + 8*u, y + 5*u, u, 2*u);
    } else if (seed === 1) {
      // Bottle (2u × 5u with 1u cork)
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 6*u, y + 3*u, 2*u, 5*u);
      ctx.fillStyle = '#1a4a2a';
      ctx.fillRect(x + 6*u, y + 3*u, 2*u, 5*u);
      ctx.fillStyle = '#205a35';
      ctx.fillRect(x + 6*u, y + 3*u, u, 5*u);
      // Cork (1u × 1u)
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(x + 6*u, y + 2*u, 2*u, u);
      // Highlight (1u)
      ctx.fillStyle = '#80c8a0';
      ctx.fillRect(x + 6*u, y + 4*u, u, 2*u);
    }
  }

  // Stool — strict pixel art. Stepped 6u × 1u seat + 1u-wide single
  // central leg + 4u foot ring.
  function drawStool(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#2a1808';
    var WOOD = '#5a3a1a';
    var WOOD_HI = '#7a4e22';
    // Seat — 6u wide, 2u tall (stepped: 4u core + 1u flares)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, 3*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, 2*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, u);
    // Leg (1u wide, 6u tall)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 6*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 7*u, y + 7*u, u, 6*u);
    // Foot ring (4u × 1u)
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 6*u, y + 12*u, 4*u, u);
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 13*u, 4*u, u);
    // 1u floor shadow
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, u);
  }

  // Round table — strict pixel art. Stepped circle (10u × 3u), 2u pedestal,
  // 4u base, varied 4u × 1u item on top.
  function drawTavernTable(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#2a1808';
    var WOOD = '#5a3a1a';
    var WOOD_HI = '#7a4e22';
    // Top — stepped circle (8u → 10u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, 1*u);
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, 3*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, 2*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, u);
    // Pedestal (2u wide)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, 5*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 7*u, y + 8*u, u, 5*u);
    // Base (4u × 1u)
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 6*u, y + 13*u, 4*u, u);
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, u);
    // Item on table
    var seed = (col * 7 + row * 11) % 3;
    if (seed === 0) {
      // Plate (5u × 1u with food)
      ctx.fillStyle = '#a8a890';
      ctx.fillRect(x + 6*u, y + 4*u, 4*u, u);
      ctx.fillStyle = '#d8d8c0';
      ctx.fillRect(x + 6*u, y + 4*u, 4*u, u);
      ctx.fillStyle = '#a08040';
      ctx.fillRect(x + 7*u, y + 4*u, 2*u, u);
    } else if (seed === 1) {
      // Two mugs (2u × 2u each)
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 5*u, y + 3*u, 2*u, 2*u);
      ctx.fillRect(x + 9*u, y + 3*u, 2*u, 2*u);
      ctx.fillStyle = '#c8aa70';
      ctx.fillRect(x + 5*u, y + 3*u, 2*u, 2*u);
      ctx.fillRect(x + 9*u, y + 3*u, 2*u, 2*u);
      ctx.fillStyle = '#f0e8d0';
      ctx.fillRect(x + 5*u, y + 3*u, 2*u, u);
      ctx.fillRect(x + 9*u, y + 3*u, 2*u, u);
    }
  }

  // Fireplace — strict pixel art. Stone surround + dark inner pit + 4-frame
  // flame animation. Atmospheric halo gradient allowed.
  function drawFireplace(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0408';
    var STONE_DK = '#1a1414';
    var STONE = '#3a3030';
    var STONE_HI = '#5a4848';
    var WOOD = '#3a2410';
    // Stone surround
    ctx.fillStyle = STONE_DK;
    ctx.fillRect(x, y + 2*u, ts, 12*u);
    ctx.fillStyle = STONE;
    ctx.fillRect(x, y + 2*u, ts, 12*u);
    // Stone block lines
    ctx.fillStyle = STONE_DK;
    ctx.fillRect(x, y + 6*u, ts, u);
    ctx.fillRect(x, y + 10*u, ts, u);
    ctx.fillRect(x + 8*u, y + 2*u, u, 4*u);
    ctx.fillRect(x + 4*u, y + 6*u, u, 4*u);
    ctx.fillRect(x + 12*u, y + 6*u, u, 4*u);
    // Top highlight (1u)
    ctx.fillStyle = STONE_HI;
    ctx.fillRect(x, y + 2*u, ts, u);
    // Inner pit (10u × 7u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 8*u);
    // Logs (1u tall each, stepped)
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 4*u, y + 11*u, 8*u, u);
    ctx.fillRect(x + 5*u, y + 12*u, 6*u, u);
    // Flame — 3-frame animation, stepped pyramid
    var frame = Math.floor(time / 150) % 3;
    var flick = 0.7 + Math.sin(time / 130 + col + row) * 0.3;
    ctx.globalAlpha = flick;
    ctx.fillStyle = '#ff8030';
    if (frame === 0) {
      ctx.fillRect(x + 6*u, y + 8*u, 4*u, 3*u);
      ctx.fillRect(x + 7*u, y + 7*u, 2*u, u);
    } else if (frame === 1) {
      ctx.fillRect(x + 6*u, y + 8*u, 4*u, 3*u);
      ctx.fillRect(x + 7*u, y + 6*u, 2*u, 2*u);
    } else {
      ctx.fillRect(x + 6*u, y + 8*u, 4*u, 3*u);
      ctx.fillRect(x + 7*u, y + 7*u, 2*u, u);
      ctx.fillRect(x + 8*u, y + 6*u, u, u);
    }
    ctx.fillStyle = '#ffc060';
    ctx.fillRect(x + 7*u, y + 9*u, 2*u, 2*u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 8*u, y + 10*u, u, u);
    ctx.globalAlpha = 1;
    // Halo (atmospheric — gradient allowed)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.4 * flick;
    var grad = ctx.createRadialGradient(x + ts/2, y + 10*u, 0, x + ts/2, y + 10*u, ts * 1.4);
    grad.addColorStop(0, 'rgba(255, 160, 60, 0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts, y - ts, ts * 3, ts * 3);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Tavern door — strict pixel art. 12u × 13u door with iron straps,
  // brass knob, warm interior glow.
  function drawTavernDoor(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var DARK = '#0a0606';
    var WOOD_DK = '#3a2410';
    var WOOD = '#5a3a1a';
    var WOOD_HI = '#7a4e22';
    var IRON = '#1a1a1e';
    var BRASS = '#a08040';
    var BRASS_HI = '#e0c060';
    // Wall context (8u dado + 8u wainscot, matches drawTavernWall)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x, y, ts, 8*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x, y + 9*u, ts, 7*u);
    ctx.fillStyle = '#8a5e30';
    ctx.fillRect(x, y + 7*u, ts, u);
    // Door frame (14u × 14u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + u, 14*u, 14*u);
    // Door body (12u × 13u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 13*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 12*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, u);
    // Vertical plank seams (1u each)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 6*u, y + 2*u, u, 12*u);
    ctx.fillRect(x + 10*u, y + 2*u, u, 12*u);
    // Iron straps (1u tall × 12u wide at top + bottom thirds)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, u);
    ctx.fillRect(x + 2*u, y + 12*u, 12*u, u);
    // Hinges (2u × 1u at left edge)
    ctx.fillRect(x + 2*u, y + 4*u, 2*u, u);
    ctx.fillRect(x + 2*u, y + 12*u, 2*u, u);
    // Brass knob (1u)
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 12*u, y + 8*u, u, u);
    ctx.fillStyle = BRASS_HI;
    ctx.fillRect(x + 12*u, y + 8*u, u, u);
    // Warm interior glow (atmospheric — gradient allowed)
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

  // Bartender — strict pixel art. 8u-wide character with 1u outline,
  // 3-tone shading.
  function drawBartender(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var DARK = '#1a0a0a';
    var SKIN = '#e0c0a0';
    var SKIN_SH = '#a08070';
    var APRON = '#704040';
    var APRON_HI = '#a05858';
    var APRON_TIE = '#4a2020';
    var HAIR = '#3a2410';
    var bob = Math.sin(time / 600) > 0.85 ? -u : 0;
    // Head outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 5*u);
    // Hair (top 2u)
    ctx.fillStyle = HAIR;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 2*u);
    // Skin
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    // Eyes
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Mustache (1u band)
    ctx.fillStyle = HAIR;
    ctx.fillRect(x + 5*u, y + 5*u + bob, 6*u, u);
    // Body outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    // Apron
    ctx.fillStyle = APRON;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = APRON_HI;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    ctx.fillStyle = APRON_TIE;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Legs (2u × 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Boots
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Shelf — strict pixel art. 1u shelf board + 3 bottles (2u × 4u each).
  function drawShelf(ctx, x, y, ts, time, col, row) {
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0a06';
    var SHELF = '#3a2410';
    var SHELF_HI = '#5a3a1a';
    // Top shelf board (16u × 1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 4*u, ts, 2*u);
    ctx.fillStyle = SHELF;
    ctx.fillRect(x, y + 4*u, ts, u);
    ctx.fillStyle = SHELF_HI;
    ctx.fillRect(x, y + 4*u, ts, u);
    // Bottles (2u × 4u with 1u cork)
    var bottles = [
      [2, '#1a4a2a', '#3a8a4a'],
      [7, '#4a1a2a', '#a04050'],
      [12, '#1a2a4a', '#3a5a90']
    ];
    for (var i = 0; i < bottles.length; i++) {
      var bx = bottles[i][0];
      ctx.fillStyle = DARK;
      ctx.fillRect(x + bx*u, y, 2*u, 4*u);
      ctx.fillStyle = bottles[i][1];
      ctx.fillRect(x + bx*u, y, 2*u, 4*u);
      ctx.fillStyle = bottles[i][2];
      ctx.fillRect(x + bx*u, y, u, 4*u);
      // Cork
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(x + bx*u, y, 2*u, u);
    }
    // Lower shelf board
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 9*u, ts, 2*u);
    ctx.fillStyle = SHELF;
    ctx.fillRect(x, y + 9*u, ts, u);
    // Items (1u × 3u each)
    ctx.fillStyle = '#a08050';
    ctx.fillRect(x + 3*u, y + 6*u, 3*u, 3*u);
    ctx.fillStyle = '#806030';
    ctx.fillRect(x + 8*u, y + 7*u, 4*u, 2*u);
  }

  // Window — strict pixel art. 12u × 6u window with 2u frame, 1u mullions,
  // soft blue glass.
  function drawWindow(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var DARK = '#1a0a06';
    var FRAME = '#3a2410';
    var GLASS = '#3a607a';
    var GLASS_HI = '#5a90b0';
    // Window frame (14u × 8u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + u, 14*u, 8*u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + u, y + u, 14*u, 8*u);
    // Glass (12u × 6u)
    ctx.fillStyle = GLASS;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 6*u);
    ctx.fillStyle = GLASS_HI;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, u);  // 1u top highlight
    // Mullions (1u cross)
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 8*u, y + 2*u, u, 6*u);
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);
    // Sill (14u × 1u)
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + u, y + 9*u, 14*u, u);
  }

  function drawTavernBackground(ctx, w, h, time) {
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(0, 0, w, h);
  }

  // Piano — strict pixel art. Dark wood body + 8u × 2u keys + 1u black keys.
  function drawPiano(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0a0408';
    var WOOD_DK = '#1a1008';
    var WOOD = '#3a2410';
    var WOOD_HI = '#5a3a1a';
    // Body
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 9*u);
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 8*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, u);
    // White keys (10u × 2u)
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(x + 3*u, y + 8*u, 10*u, 2*u);
    // Black keys (1u × 1u, at positions 1, 2, 4, 5, 6 of 7)
    var blackKeys = [1, 2, 4, 5, 6];
    ctx.fillStyle = '#0a0a0a';
    for (var k = 0; k < blackKeys.length; k++) {
      ctx.fillRect(x + (3 + blackKeys[k])*u, y + 8*u, u, u);
    }
    // White key dividers (1u verticals)
    ctx.fillStyle = '#a09080';
    for (var w = 1; w < 7; w++) {
      ctx.fillRect(x + (3 + w)*u + u, y + 9*u, u, u);
    }
    // Pedal
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 8*u, y + 11*u, u, u);
    // Sheet music stand
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 4*u, y + 2*u, 8*u, 2*u);
    ctx.fillStyle = '#d0c8a0';
    ctx.fillRect(x + 5*u, y + 2*u, 6*u, u);
  }

  // Dart board — strict pixel art. Stepped concentric circles (whole-u).
  function drawDartBoard(ctx, x, y, ts, time, col, row) {
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Mounting board (8u × 8u)
    ctx.fillStyle = '#1a0e06';
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 9*u);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 8*u);
    // Stepped concentric circles
    // Outer black ring (8u stepped circle)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, u);
    ctx.fillRect(x + 4*u, y + 6*u, 8*u, 6*u);
    ctx.fillRect(x + 5*u, y + 12*u, 6*u, u);
    // Red/green ring
    ctx.fillStyle = '#a02030';
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, u);
    ctx.fillRect(x + 4*u, y + 7*u, 8*u, 4*u);
    ctx.fillRect(x + 5*u, y + 11*u, 6*u, u);
    ctx.fillStyle = '#1a601a';
    ctx.fillRect(x + 5*u, y + 7*u, 6*u, u);
    ctx.fillRect(x + 5*u, y + 10*u, 6*u, u);
    ctx.fillStyle = '#a02030';
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 4*u);
    // Inner white
    ctx.fillStyle = '#a09080';
    ctx.fillRect(x + 6*u, y + 8*u, 4*u, 2*u);
    // Bullseye
    ctx.fillStyle = '#a02030';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, 2*u);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 7*u, y + 8*u, u, u);
    // Dart (1u stick + 1u tip)
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 9*u, y + 6*u, u, 2*u);
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(x + 10*u, y + 5*u, u, u);
  }

  // Stove — strict pixel art. Iron body + pot on top + flame view window.
  function drawStove(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0a0a0a';
    var IRON_DK = '#1a1018';
    var IRON = '#3a3a3a';
    var POT = '#3a3a3a';
    var POT_HI = '#5a5a5a';
    // Stove body (12u × 10u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, 10*u);
    ctx.fillStyle = IRON_DK;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, 9*u);
    // Stove top (14u × 1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 4*u, 14*u, 2*u);
    // Pot (8u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 2*u, 8*u, 3*u);
    ctx.fillStyle = POT;
    ctx.fillRect(x + 4*u, y + 2*u, 8*u, 3*u);
    ctx.fillStyle = POT_HI;
    ctx.fillRect(x + 4*u, y + 2*u, 8*u, u);
    // Pot lid (8u × 1u)
    ctx.fillStyle = IRON_DK;
    ctx.fillRect(x + 4*u, y + 2*u, 8*u, u);
    // Steam (1u animated)
    var stFrame = Math.floor(time / 200) % 4;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#e0e0e0';
    for (var s = 0; s < 2; s++) {
      var stY = y + ((stFrame + s * 3) % 4) * u;
      ctx.fillRect(x + (6 + s * 4)*u, stY, u, u);
    }
    ctx.globalAlpha = 1;
    // Stove door (8u × 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 8*u, 8*u, 5*u);
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(x + 4*u, y + 8*u, 8*u, 4*u);
    // Fire window (6u × 2u)
    var fire = 0.7 + Math.sin(time / 150) * 0.3;
    ctx.globalAlpha = fire;
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(x + 5*u, y + 9*u, 6*u, 2*u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 7*u, y + 9*u, 2*u, u);
    ctx.globalAlpha = 1;
    // Halo (atmospheric)
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

  // Patron — strict pixel art. 8u-wide character with 1u outline.
  function drawPatron(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0a0a0a';
    var pal = [
      { suit: '#3a607a', suit_hi: '#5a90b0', skin: '#e0c0a0', hair: '#3a2410' },
      { suit: '#603030', suit_hi: '#a05050', skin: '#d0a880', hair: '#2a1a08' },
      { suit: '#506030', suit_hi: '#809060', skin: '#e8d0b0', hair: '#5a3a1a' }
    ];
    var p = pal[(col * 7 + row * 11) % 3];
    var bob = Math.sin(time / 700 + col * 5) > 0.85 ? -u : 0;
    // Head outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 5*u);
    // Hair
    ctx.fillStyle = p.hair;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 2*u);
    // Skin
    ctx.fillStyle = p.skin;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    // Eyes
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Smile
    ctx.fillStyle = p.hair;
    ctx.fillRect(x + 7*u, y + 5*u + bob, 2*u, u);
    // Body
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = p.suit;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = p.suit_hi;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Mug arm (1u × 2u + 2u × 2u mug)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 12*u, y + 7*u, 2*u, 2*u);
    ctx.fillStyle = '#c8aa70';
    ctx.fillRect(x + 12*u, y + 7*u, 2*u, 2*u);
    ctx.fillStyle = '#f0e8d0';
    ctx.fillRect(x + 12*u, y + 7*u, 2*u, u);
    // Legs
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Boots
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Barrel — strict pixel art. 10u × 9u body with 3 iron bands + tap.
  function drawBarrel(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0a04';
    var WOOD_DK = '#3a2410';
    var WOOD = '#5a3a1a';
    var WOOD_HI = '#7a4e22';
    var IRON = '#1a1a1e';
    var IRON_HI = '#3a3a3a';
    var BRASS = '#a08040';
    // Body (10u × 9u with hard outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 10*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 9*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, u);
    // Iron bands (1u each at top, mid, bottom)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, u);
    ctx.fillRect(x + 3*u, y + 8*u, 10*u, u);
    ctx.fillRect(x + 3*u, y + 11*u, 10*u, u);
    ctx.fillStyle = IRON_HI;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, 1);
    // Vertical plank seams (1u verticals)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 8*u, y + 6*u, u, 5*u);
    // Tap (2u × 2u with 1u spout)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 12*u, y + 9*u, 2*u, 2*u);
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 12*u, y + 9*u, 2*u, 2*u);
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(x + 12*u, y + 9*u, u, u);
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 13*u, y + 11*u, u, 2*u);
  }

  // Coat rack — strict pixel art. 1u-wide pole + 1u hooks + hat + coat.
  function drawCoatRack(ctx, x, y, ts, time, col, row) {
    drawWoodFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0e08';
    var WOOD = '#3a2410';
    var WOOD_HI = '#5a3a1a';
    var BRASS = '#a08040';
    // Pole (1u × 11u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 11*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 7*u, y + 3*u, u, 11*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 7*u, y + 3*u, u, u);
    // Hooks (1u brass)
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 5*u, y + 3*u, 2*u, u);
    ctx.fillRect(x + 9*u, y + 3*u, 2*u, u);
    // Hat (3u × 1u brim + 2u × 1u crown)
    ctx.fillStyle = '#3a2030';
    ctx.fillRect(x + 4*u, y + 4*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 3*u, 2*u, u);
    // Coat (4u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 9*u, y + 4*u, 4*u, 5*u);
    ctx.fillStyle = '#603020';
    ctx.fillRect(x + 9*u, y + 4*u, 4*u, 4*u);
    ctx.fillStyle = '#a04040';
    ctx.fillRect(x + 9*u, y + 4*u, 4*u, u);
    // Base (4u × 1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 13*u, 4*u, u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 6*u, y + 13*u, 4*u, u);
  }

  // Wall painting — strict pixel art. Brass frame + flat sea/ship scene.
  function drawWallPainting(ctx, x, y, ts, time, col, row) {
    drawTavernWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var FRAME_DK = '#5a3010';
    var FRAME = '#a08040';
    var FRAME_HI = '#e0c060';
    var SKY = '#3a4858';
    var SEA = '#205040';
    var HORIZON = '#1a3050';
    // Frame outline (10u × 8u)
    ctx.fillStyle = FRAME_DK;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 8*u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 8*u);
    ctx.fillStyle = FRAME_HI;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, u);   // 1u top highlight
    // Inner painting area (8u × 6u)
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(x + 4*u, y + 4*u, 8*u, 6*u);
    ctx.fillStyle = SKY;
    ctx.fillRect(x + 4*u, y + 4*u, 8*u, 3*u);
    ctx.fillStyle = HORIZON;
    ctx.fillRect(x + 4*u, y + 7*u, 8*u, u);
    ctx.fillStyle = SEA;
    ctx.fillRect(x + 4*u, y + 8*u, 8*u, 2*u);
    // Sun (1u)
    ctx.fillStyle = '#e8c060';
    ctx.fillRect(x + 11*u, y + 5*u, u, u);
    // Ship silhouette
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);     // hull
    ctx.fillRect(x + 7*u, y + 5*u, u, 2*u);     // mast
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
