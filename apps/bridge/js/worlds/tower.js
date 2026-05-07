/**
 * Tower World Module — A sorceress's stone tower interior.
 *
 * Cold dark stone, candlelit corners, runes carved into the floor,
 * a magic crystal at the center, and the sorceress herself. All drawers
 * follow the strict 16-px-per-tile pixel art spec in apps/bridge/CLAUDE.md.
 */
(function () {

  // Tower floor — strict pixel art. 8u stone slabs with 1u dark grout cross.
  function drawTowerFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    var BASE_A = '#2a2638';
    var BASE_B = '#252134';
    var DARK = '#15101e';
    var HI = '#3a3450';
    ctx.fillStyle = (col + row) % 2 === 0 ? BASE_A : BASE_B;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 8*u - u, ts, u);
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillStyle = HI;
    ctx.fillRect(x, y, ts, u);
    ctx.fillRect(x, y + 8*u, ts, u);
    // Speckle (1u purple)
    if (seed % 5 === 0) {
      ctx.fillStyle = '#5040a0';
      ctx.fillRect(x + 3*u, y + 11*u, u, u);
    }
    if (seed % 7 === 0) {
      ctx.fillStyle = '#7868a8';
      ctx.fillRect(x + 12*u, y + 4*u, u, u);
    }
  }

  // Tower wall — strict pixel art. 4u dark cap + 12u brick body, 1u
  // mortar courses and offset joints. Whole-u rects only.
  function drawTowerWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DARK = '#080418';
    var CAP = '#0e0820';
    var CAP_HI = '#2a2040';
    var BRICK = '#1a1430';
    // Cap
    ctx.fillStyle = CAP;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x, y, ts, u);
    // Body
    ctx.fillStyle = BRICK;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    // 1u mortar courses
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 8*u, ts, u);
    ctx.fillRect(x, y + 12*u, ts, u);
    // Brick joints
    var off1 = (row % 2 === 0) ? 8 : 4;
    var off2 = (row % 2 === 0) ? 4 : 12;
    var off3 = (row % 2 === 0) ? 12 : 8;
    ctx.fillRect(x + off1*u, y + 5*u, u, 3*u);
    ctx.fillRect(x + off2*u, y + 9*u, u, 3*u);
    ctx.fillRect(x + off3*u, y + 13*u, u, 3*u);
  }

  // Tower door — strict pixel art. Iron-banded oak with pull ring,
  // purple wisp glow above.
  function drawTowerDoor(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0408';
    var STONE = '#0e0820';
    var WOOD_DK = '#2a1808';
    var WOOD = '#5a3a1a';
    var WOOD_HI = '#7a4e22';
    var IRON = '#1a1a1e';
    // Stone arch (12u × 13u)
    ctx.fillStyle = STONE;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 13*u);
    // Door body
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 12*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 11*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, u);
    // Vertical plank seam
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 8*u, y + 3*u, u, 11*u);
    // Iron straps (1u × 10u)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, u);
    ctx.fillRect(x + 3*u, y + 12*u, 10*u, u);
    // Iron rivets (1u corners)
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 3*u, y + 5*u, u, u);
    ctx.fillRect(x + 12*u, y + 5*u, u, u);
    ctx.fillRect(x + 3*u, y + 12*u, u, u);
    ctx.fillRect(x + 12*u, y + 12*u, u, u);
    // Iron pull-ring (stepped O, 3u × 3u with 1u-thick wall)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 10*u, y + 8*u, 3*u, u);
    ctx.fillRect(x + 10*u, y + 9*u, u, 1*u);
    ctx.fillRect(x + 12*u, y + 9*u, u, u);
    ctx.fillRect(x + 10*u, y + 10*u, 3*u, u);
    // Purple wisp (atmospheric — gradient allowed)
    var pulse = 0.5 + Math.sin(time / 800) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.5;
    var grad = ctx.createRadialGradient(x + ts/2, y + 2*u, 0, x + ts/2, y + 2*u, ts * 0.5);
    grad.addColorStop(0, 'rgba(160,100,240,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Crystal altar — strict pixel art. Stepped diamond with 3-tone facets,
  // atmospheric purple halo.
  function drawCrystalAltar(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#080418';
    var ALTAR_DK = '#0e0820';
    var ALTAR = '#1a1430';
    var ALTAR_HI = '#2a2040';
    var CRYSTAL_DK = '#3a1860';
    var CRYSTAL = '#503090';
    var CRYSTAL_HI = '#8060c0';
    var CRYSTAL_GLINT = '#c0a0f0';
    // Altar base (10u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, 5*u);
    ctx.fillStyle = ALTAR;
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, 4*u);
    ctx.fillStyle = ALTAR_HI;
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, u);
    // Halo (atmospheric)
    var pulse = 0.7 + Math.sin(time / 600 + col + row) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    var grad = ctx.createRadialGradient(x + ts/2, y + 5*u, 0, x + ts/2, y + 5*u, ts * 1.4);
    grad.addColorStop(0, 'rgba(160, 100, 240, ' + (pulse * 0.55).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts, y - ts, ts * 3, ts * 3);
    ctx.globalCompositeOperation = 'source-over';
    // Diamond — stepped (whole-u): 1u tip → 3u → 5u → 7u → 5u → 3u → 1u
    // Outline first
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + 3*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, u);
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, u);
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    // Body (one row inside)
    ctx.fillStyle = CRYSTAL;
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + 3*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, u);
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, u);
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    // Highlight column (1u, left of center)
    ctx.fillStyle = CRYSTAL_HI;
    ctx.fillRect(x + 7*u, y + 2*u, u, u);
    ctx.fillRect(x + 6*u, y + 3*u, u, u);
    ctx.fillRect(x + 5*u, y + 4*u, u, u);
    ctx.fillRect(x + 6*u, y + 5*u, u, u);
    // Glint (1u top)
    ctx.fillStyle = CRYSTAL_GLINT;
    ctx.fillRect(x + 7*u, y + 2*u, u, u);
  }

  // Sorceress — strict pixel art. 8u-wide robed figure with hood,
  // 1u glowing eyes, atmospheric aura.
  function drawSorceress(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0a0418';
    var ROBE_DK = '#2a1040';
    var ROBE = '#3a2050';
    var ROBE_HI = '#503070';
    var BELT = '#a060d0';
    var EYE = '#c0a0f0';
    var bob = Math.sin(time / 700) > 0.85 ? -u : 0;
    // Hood (8u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + u + bob, 8*u, 5*u);
    ctx.fillStyle = ROBE;
    ctx.fillRect(x + 4*u, y + u + bob, 8*u, 5*u);
    ctx.fillStyle = ROBE_HI;
    ctx.fillRect(x + 4*u, y + u + bob, 8*u, u);
    // Hood shadow (face cavity)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    // Eyes — 1u glowing
    var eyeBlink = Math.sin(time / 800) > 0.3 ? 1 : 0;
    if (eyeBlink) {
      ctx.fillStyle = EYE;
      ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
      ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    }
    // Robe body (10u × 9u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 5*u + bob, 10*u, 10*u);
    ctx.fillStyle = ROBE_DK;
    ctx.fillRect(x + 3*u, y + 5*u + bob, 10*u, 9*u);
    ctx.fillStyle = ROBE;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 8*u);
    // Belt (1u)
    ctx.fillStyle = BELT;
    ctx.fillRect(x + 3*u, y + 9*u + bob, 10*u, u);
    // Hem dark band
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 14*u, 10*u, u);
    // Aura (atmospheric)
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

  // Candle — strict pixel art. 2u-wide candle on 4u base, 2-frame flame.
  function drawCandle(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0a0a0a';
    var BASE_DK = '#1a1a1e';
    var BASE = '#3a3a3a';
    var BASE_HI = '#5a5a5a';
    var WAX_DK = '#a0a090';
    var WAX = '#e0e0d0';
    // Base (4u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 11*u, 4*u, 3*u);
    ctx.fillStyle = BASE_DK;
    ctx.fillRect(x + 6*u, y + 11*u, 4*u, 2*u);
    ctx.fillStyle = BASE;
    ctx.fillRect(x + 6*u, y + 11*u, 4*u, u);
    // Foot (6u × 1u)
    ctx.fillStyle = BASE_HI;
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, u);
    // Candle (2u × 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 4*u);
    ctx.fillStyle = WAX;
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 4*u);
    ctx.fillStyle = WAX_DK;
    ctx.fillRect(x + 8*u, y + 7*u, u, 4*u);   // 1u right shadow
    // Wick (1u)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 7*u, y + 6*u, u, u);
    // Flame — 2-frame stepped pyramid
    var flameFrame = Math.floor(time / 180) % 2;
    var flick = 0.7 + Math.sin(time / 130 + col) * 0.3;
    ctx.globalAlpha = flick;
    ctx.fillStyle = '#ffc060';
    if (flameFrame === 0) {
      ctx.fillRect(x + 7*u, y + 4*u, u, u);
      ctx.fillRect(x + 7*u, y + 5*u, 2*u, u);
    } else {
      ctx.fillRect(x + 7*u, y + 4*u, 2*u, u);
      ctx.fillRect(x + 7*u, y + 5*u, u, u);
    }
    ctx.fillStyle = '#fff0a0';
    ctx.fillRect(x + 7*u, y + 5*u, u, u);
    ctx.globalAlpha = 1;
    // Halo (atmospheric)
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

  // Bookshelf — strict pixel art. 3 shelves with 2u × 3u books.
  function drawBookshelf(ctx, x, y, ts, time, col, row) {
    drawTowerWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0e08';
    var WOOD = '#3a2410';
    var WOOD_HI = '#5a3a1a';
    // Bookshelf box (14u × 9u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 5*u, 14*u, 10*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + u, y + 5*u, 14*u, 9*u);
    // Shelf boards (1u each)
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + u, y + 5*u, 14*u, u);
    ctx.fillRect(x + u, y + 9*u, 14*u, u);
    ctx.fillRect(x + u, y + 13*u, 14*u, u);
    // Books (2u × 3u each)
    var bookColors = ['#7a2030', '#5a2070', '#205070', '#705020', '#206050'];
    for (var s = 0; s < 2; s++) {
      var sy = y + (s === 0 ? 6 : 10) * u;
      for (var b = 0; b < 6; b++) {
        ctx.fillStyle = bookColors[(s * 5 + b) % bookColors.length];
        ctx.fillRect(x + (2 + b * 2)*u, sy, u, 3*u);
        ctx.fillStyle = DARK;
        ctx.fillRect(x + (3 + b * 2)*u, sy, u, 3*u);
      }
    }
  }

  // Floor rune — strict pixel art. Stepped octagonal ring + 1u cardinal
  // marks.
  function drawRune(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var pulse = 0.5 + Math.sin(time / 800 + col + row) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#a070e0';
    // Stepped octagonal ring (whole-u)
    ctx.fillRect(x + 6*u, y + 3*u, 4*u, u);     // top edge
    ctx.fillRect(x + 4*u, y + 4*u, 2*u, u);
    ctx.fillRect(x + 10*u, y + 4*u, 2*u, u);
    ctx.fillRect(x + 3*u, y + 5*u, u, u);
    ctx.fillRect(x + 12*u, y + 5*u, u, u);
    ctx.fillRect(x + 3*u, y + 6*u, u, 4*u);     // left edge
    ctx.fillRect(x + 12*u, y + 6*u, u, 4*u);    // right edge
    ctx.fillRect(x + 3*u, y + 10*u, u, u);
    ctx.fillRect(x + 12*u, y + 10*u, u, u);
    ctx.fillRect(x + 4*u, y + 11*u, 2*u, u);
    ctx.fillRect(x + 10*u, y + 11*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + 12*u, 4*u, u);
    // Cardinal marks (1u × 2u each)
    ctx.fillStyle = '#c0a0f0';
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 2*u);
    ctx.fillRect(x + 7*u, y + 9*u, 2*u, 2*u);
    ctx.fillRect(x + 5*u, y + 7*u, 2*u, 2*u);
    ctx.fillRect(x + 9*u, y + 7*u, 2*u, 2*u);
    ctx.globalAlpha = 1;
  }

  function drawTowerBackground(ctx, w, h, time) {
    ctx.fillStyle = '#0a0518';
    ctx.fillRect(0, 0, w, h);
  }

  // Alchemy table — strict pixel art. Wood table + flat 2u × 3u potion
  // bottles + open book.
  function drawAlchemyTable(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0e08';
    var WOOD = '#3a2410';
    var WOOD_HI = '#5a3a1a';
    // Table top (12u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 6*u, 12*u, 3*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 2*u, y + 6*u, 12*u, 2*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 2*u, y + 6*u, 12*u, u);
    // Legs (1u × 6u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 8*u, u, 6*u);
    ctx.fillRect(x + 12*u, y + 8*u, u, 6*u);
    // Green potion (2u × 3u with 1u bubble)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 3*u, 2*u, 3*u);
    ctx.fillStyle = '#40a060';
    ctx.fillRect(x + 4*u, y + 3*u, 2*u, 3*u);
    var bubble = Math.sin(time / 250) > 0 ? 1 : 0;
    if (bubble) {
      ctx.fillStyle = '#a0e0a0';
      ctx.fillRect(x + 4*u, y + 3*u, u, u);
    }
    // Cork
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 4*u, y + 2*u, 2*u, u);
    // Purple potion (2u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 3*u);
    ctx.fillStyle = '#a060d0';
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 3*u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
    // Beaker (2u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 10*u, y + 4*u, 2*u, 2*u);
    ctx.fillStyle = '#80a0c0';
    ctx.fillRect(x + 10*u, y + 4*u, 2*u, 2*u);
    ctx.fillStyle = '#a0c0d0';
    ctx.fillRect(x + 10*u, y + 4*u, 2*u, u);
    // Open book (3u × 1u)
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 5*u, y + 5*u, 3*u, u);
    ctx.fillStyle = '#f0e0c0';
    ctx.fillRect(x + 5*u, y + 5*u, 3*u, u);
  }

  // Telescope — strict pixel art. Dark barrel + brass collar + tripod.
  function drawTelescope(ctx, x, y, ts, time, col, row) {
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#080418';
    var BARREL = '#3a3a48';
    var BARREL_HI = '#5a5a68';
    var BRASS = '#a08040';
    var BRASS_HI = '#e0c060';
    // Tripod (1u × 8u central pole + 2u angled legs)
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 7*u, y + 6*u, 2*u, 8*u);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 7*u, y + 6*u, u, 8*u);
    // Tripod legs (stepped diagonals)
    ctx.fillStyle = '#1a1a1e';
    for (var d = 0; d < 4; d++) {
      ctx.fillRect(x + (5 - d)*u, y + (10 + d)*u, u, u);
      ctx.fillRect(x + (10 + d)*u, y + (10 + d)*u, u, u);
    }
    // Barrel (12u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 3*u, 12*u, 3*u);
    ctx.fillStyle = BARREL;
    ctx.fillRect(x + 2*u, y + 3*u, 12*u, 2*u);
    ctx.fillStyle = BARREL_HI;
    ctx.fillRect(x + 2*u, y + 3*u, 12*u, u);
    // Eyepiece (2u × 2u)
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 2*u, y + 3*u, 2*u, 2*u);
    ctx.fillStyle = BRASS_HI;
    ctx.fillRect(x + 2*u, y + 3*u, 2*u, u);
    // Far end (2u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 12*u, y + 3*u, 2*u, 2*u);
    // Brass collar (2u × 1u)
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 7*u, y + 4*u, 2*u, u);
  }

  // Cauldron — strict pixel art. Stepped iron pot with 3-tone potion,
  // 1u animated steam, atmospheric halo.
  function drawCauldron(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#000000';
    var IRON_DK = '#0a0a0a';
    var IRON = '#1a1a1e';
    var IRON_HI = '#3a3a3a';
    var POTION_DK = '#3a1860';
    var POTION = '#7030a0';
    var POTION_HI = '#a060d0';
    // Tripod legs (1u verticals)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 4*u, y + 11*u, u, 4*u);
    ctx.fillRect(x + 11*u, y + 11*u, u, 4*u);
    ctx.fillRect(x + 8*u, y + 11*u, u, 4*u);
    // Pot — stepped oval (12u → 14u → 12u)
    ctx.fillStyle = IRON_DK;
    ctx.fillRect(x + 3*u, y + 7*u, 10*u, 1*u);
    ctx.fillRect(x + 2*u, y + 8*u, 12*u, 4*u);
    ctx.fillRect(x + 3*u, y + 12*u, 10*u, 1*u);
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 3*u, y + 7*u, 10*u, u);
    ctx.fillRect(x + 2*u, y + 8*u, 12*u, 3*u);
    ctx.fillRect(x + 3*u, y + 11*u, 10*u, u);
    // Rim (1u top highlight)
    ctx.fillStyle = IRON_HI;
    ctx.fillRect(x + 2*u, y + 8*u, 12*u, u);
    // Potion surface (10u × 1u)
    ctx.fillStyle = POTION_DK;
    ctx.fillRect(x + 3*u, y + 8*u, 10*u, u);
    ctx.fillStyle = POTION;
    ctx.fillRect(x + 4*u, y + 8*u, 8*u, u);
    // Bubbles (1u, frame-stepped)
    var bubble = Math.sin(time / 200) > 0;
    if (bubble) {
      ctx.fillStyle = POTION_HI;
      ctx.fillRect(x + 6*u, y + 8*u, u, u);
      ctx.fillRect(x + 9*u, y + 8*u, u, u);
    }
    // Steam (1u animated)
    var stFrame = Math.floor(time / 200) % 4;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#c0a0d0';
    for (var s = 0; s < 2; s++) {
      var stY = y + (Math.max(0, 5 - stFrame - s)) * u;
      ctx.fillRect(x + (6 + s * 4)*u, stY, u, u);
    }
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

  // Familiar — strict pixel art. Stepped black cat with 1u glowing eyes.
  function drawFamiliar(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#000000';
    var FUR_DK = '#0a0a0a';
    var FUR = '#1a1a1a';
    var EYE = '#ffe080';
    var bob = Math.sin(time / 600) > 0.5 ? -u : 0;
    // Body (8u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 7*u + bob, 8*u, 5*u);
    ctx.fillStyle = FUR;
    ctx.fillRect(x + 3*u, y + 7*u + bob, 8*u, 4*u);
    // Head (4u × 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 5*u + bob, 4*u, 4*u);
    ctx.fillStyle = FUR;
    ctx.fillRect(x + 3*u, y + 5*u + bob, 4*u, 3*u);
    // Ears (1u × 2u each)
    ctx.fillStyle = FUR_DK;
    ctx.fillRect(x + 3*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    // Tail (curled, stepped 1u)
    ctx.fillStyle = FUR;
    ctx.fillRect(x + 11*u, y + 7*u + bob, u, 4*u);
    ctx.fillRect(x + 12*u, y + 6*u + bob, u, 2*u);
    ctx.fillRect(x + 11*u, y + 6*u + bob, u, u);
    // Glowing eyes (1u, blink)
    var blink = Math.sin(time / 1500) > 0.3;
    if (blink) {
      ctx.fillStyle = EYE;
      ctx.fillRect(x + 4*u, y + 6*u + bob, u, u);
      ctx.fillRect(x + 5*u, y + 6*u + bob, u, u);
    }
    // Aura (atmospheric)
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

  // Scroll pile — strict pixel art. 3 stacked scrolls + 1u red wax seal.
  function drawScrollPile(ctx, x, y, ts, time, col, row) {
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#3a2810';
    var PAPER_DK = '#a89870';
    var PAPER = '#d8c8a0';
    var PAPER_HI = '#f0e0b0';
    var INK = '#6a4a30';
    // Bottom scroll (10u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 11*u, 10*u, 3*u);
    ctx.fillStyle = PAPER_DK;
    ctx.fillRect(x + 3*u, y + 11*u, 10*u, 2*u);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x + 3*u, y + 11*u, 10*u, u);
    // Mid scroll (8u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 9*u, 8*u, 2*u);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x + 4*u, y + 9*u, 8*u, u);
    ctx.fillStyle = PAPER_HI;
    ctx.fillRect(x + 4*u, y + 9*u, 8*u, u);
    // Top open scroll (6u × 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, 5*u);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, 4*u);
    ctx.fillStyle = PAPER_HI;
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, u);
    // Ink lines (1u)
    ctx.fillStyle = INK;
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    // Wax seal (1u)
    ctx.fillStyle = '#3a0810';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    ctx.fillStyle = '#a02030';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    ctx.fillStyle = '#e04060';
    ctx.fillRect(x + 7*u, y + 8*u, u, u);
  }

  // Spell circle — strict pixel art. Stepped octagonal ring + 1u center
  // crystal, atmospheric halo.
  function drawSpellCircle(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawTowerFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var pulse = 0.6 + Math.sin(time / 700 + col + row) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#a070e0';
    // Outer stepped octagonal ring
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, u);
    ctx.fillRect(x + 4*u, y + 3*u, 2*u, u);
    ctx.fillRect(x + 10*u, y + 3*u, 2*u, u);
    ctx.fillRect(x + 3*u, y + 4*u, u, u);
    ctx.fillRect(x + 12*u, y + 4*u, u, u);
    ctx.fillRect(x + 2*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 13*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 3*u, y + 11*u, u, u);
    ctx.fillRect(x + 12*u, y + 11*u, u, u);
    ctx.fillRect(x + 4*u, y + 12*u, 2*u, u);
    ctx.fillRect(x + 10*u, y + 12*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + 13*u, 4*u, u);
    // Inner triangle (stepped)
    ctx.fillStyle = '#c0a0f0';
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + 6*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 7*u, 6*u, u);
    ctx.fillRect(x + 5*u, y + 8*u, 6*u, u);   // base
    // Center crystal (1u)
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 2*u);
    ctx.globalAlpha = 1;
    // Halo (atmospheric)
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
