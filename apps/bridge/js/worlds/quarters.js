/**
 * Pilot's Quarters — the cozy interior of your ship.
 *
 * Slice 1a of the Bridge progression roadmap. The "canvas" — visuals,
 * navigation, and atmosphere only. No economy, no shop, no trophies yet.
 *
 * Major elements:
 *   - Warm wood floor + dark metal walls (warmer than Enigma, cozier)
 *   - Big viewport across the top wall with animated stars + occasional
 *     planet / passing ship events (procedural)
 *   - Bed, desk + log terminal, trophy shelves (empty), 4 decor slots
 *     (drawn as ghost silhouettes that hint at what would go there)
 *   - Cockpit door at the south wall (interactable, leaves to cockpit)
 *   - A small drone-pet that bobs around the room with idle personality
 *   - Welcome toast on entry ("WELCOME HOME" first time / "WELCOME BACK")
 *
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Palette (mirrors apps/bridge/CLAUDE.md "Quarters" section) ----
  var PAL = {
    wallDark:   '#1a1410',
    wallMid:    '#2a2018',
    wallHi:     '#3a2820',
    wallRim:    '#4a3a30',
    floorDark:  '#3a2410',
    floorMid:   '#5a3a1a',
    floorHi:    '#7a4e22',
    floorAlt:   '#4a2e14',
    floorGrain: '#2a1808',
    cyanDark:   '#1a3038',
    cyan:       '#40c8d8',
    cyanHi:     '#80e0e8',
    lampWarm:   '#ffe080',
    lampMid:    '#c08840',
    brass:      '#a08040',
    brassHi:    '#e0c060',
    bedDeep:    '#2a1840',
    bedMid:     '#5a4078',
    bedHi:      '#8060c0',
    pillow:     '#d4c8b0',
    pillowSh:   '#a89880',
    space:      '#050510',
    spaceMid:   '#0a0a1a',
    droneBody:  '#80e0e8',
    droneCore:  '#1a3038',
    droneLED:   '#ffe080',
    ghost:      'rgba(140, 140, 160, 0.16)',
    ghostHi:    'rgba(180, 180, 200, 0.28)',
    ghostLine:  'rgba(180, 180, 200, 0.42)'
  };

  // ============================================================
  //  TILE DRAWS
  // ============================================================

  // Subtle warm wood plank look. Uses col/row to vary the seam pattern
  // so the room doesn't read as a perfect grid.
  function drawFloorBase(ctx, x, y, ts, time, col, row, alt) {
    var u = ts / 16;
    var seed = ((col * 13 + row * 7) | 0) % 100;

    // Base plank color
    ctx.fillStyle = alt ? PAL.floorAlt : PAL.floorDark;
    ctx.fillRect(x, y, ts, ts);

    // Mid plank highlight stripe (long axis of plank — horizontal here)
    ctx.fillStyle = PAL.floorMid;
    ctx.fillRect(x, y + Math.floor(2 * u), ts, Math.floor(3 * u));
    ctx.fillRect(x, y + Math.floor(9 * u), ts, Math.floor(3 * u));

    // Plank seam line (horizontal, between planks)
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(x, y + Math.floor(7 * u), ts, Math.max(1, Math.floor(u * 0.5)));
    ctx.fillRect(x, y + ts - Math.max(1, Math.floor(u * 0.5)), ts, Math.max(1, Math.floor(u * 0.5)));

    // Random grain knot
    if (seed % 7 === 0) {
      ctx.fillStyle = PAL.floorGrain;
      ctx.fillRect(x + Math.floor((2 + (seed % 8)) * u), y + Math.floor(4 * u), u, u);
    }
    if (seed % 11 === 0) {
      ctx.fillStyle = PAL.floorHi;
      ctx.fillRect(x + Math.floor(((seed * 3) % 12) * u), y + Math.floor(11 * u), 2 * u, u);
    }
  }

  function drawFloor(ctx, x, y, ts, time, col, row) {
    drawFloorBase(ctx, x, y, ts, time, col, row, false);
  }

  function drawFloorAlt(ctx, x, y, ts, time, col, row) {
    drawFloorBase(ctx, x, y, ts, time, col, row, true);
  }

  // Dark metal wall with subtle plate seams.
  function drawWall(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var seed = ((col * 17 + row * 11) | 0) % 100;

    ctx.fillStyle = PAL.wallMid;
    ctx.fillRect(x, y, ts, ts);

    // Top edge highlight (gives depth)
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x, y, ts, Math.max(1, Math.floor(u * 0.6)));

    // Bottom shadow (darker line)
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x, y + ts - u, ts, u);

    // Vertical seam every few tiles
    if (col % 3 === 0) {
      ctx.fillStyle = PAL.wallDark;
      ctx.fillRect(x, y, Math.max(1, Math.floor(u * 0.5)), ts);
    }

    // Tiny rivets at corners
    if (seed % 5 === 0) {
      ctx.fillStyle = PAL.wallRim;
      ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), u, u);
    }
  }

  // Cyan strip light along floor edges. Subtle pulse alpha.
  function drawCyanStrip(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;

    // Use floor base underneath so it blends in
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Pulsing cyan strip
    var pulse = 0.55 + Math.sin(time / 1100 + col * 0.4) * 0.15;
    ctx.fillStyle = 'rgba(64, 200, 216, ' + pulse.toFixed(2) + ')';
    ctx.fillRect(x, y + Math.floor(u * 0.5), ts, Math.max(1, Math.floor(u * 1.5)));
    // Bright core
    ctx.fillStyle = 'rgba(160, 240, 248, ' + (pulse * 0.8).toFixed(2) + ')';
    ctx.fillRect(x, y + u, ts, Math.max(1, Math.floor(u * 0.5)));
  }

  // Viewport tile — just draws the deep-space color. Animated stars/planets
  // are drawn in the overlay so they flow continuously across tile edges.
  function drawViewport(ctx, x, y, ts, time, col, row) {
    ctx.fillStyle = PAL.space;
    ctx.fillRect(x, y, ts, ts);

    // Subtle frame line at the bottom of the viewport (where it meets the wall)
    if (row === 2) {
      var u = ts / 16;
      ctx.fillStyle = PAL.wallRim;
      ctx.fillRect(x, y + ts - u, ts, u);
      ctx.fillStyle = 'rgba(64, 200, 216, 0.5)';
      ctx.fillRect(x, y + ts - Math.floor(u * 1.5), ts, Math.max(1, Math.floor(u * 0.5)));
    }
    // Subtle frame line at the top (under top wall)
    if (row === 1) {
      var u2 = ts / 16;
      ctx.fillStyle = PAL.wallDark;
      ctx.fillRect(x, y, ts, u2);
    }
  }

  // ---- Bed (2x2, anchor at col 1 row 4) ----
  // Each tile draws its own quadrant. Layout (relCol/relRow):
  //   (0,0): headboard left + pillow left
  //   (1,0): headboard right + pillow right
  //   (0,1): blanket left + foot
  //   (1,1): blanket right + foot
  function drawBed(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var relCol = col - 1; // 0 or 1
    var relRow = row - 4; // 0 or 1
    var leftEdge = (relCol === 0);
    var rightEdge = (relCol === 1);

    // Floor underneath
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    if (relRow === 0) {
      // Top quadrant: headboard + pillow + start of blanket
      // Headboard (rows 0-4 of full bed = rows 0-4 of this tile)
      ctx.fillStyle = PAL.floorDark;
      ctx.fillRect(x, y, ts, Math.floor(4 * u));
      // Brass trim along top
      ctx.fillStyle = PAL.brass;
      ctx.fillRect(x, y, ts, Math.max(1, u));
      ctx.fillStyle = PAL.brassHi;
      ctx.fillRect(x, y, ts, Math.max(1, Math.floor(u * 0.5)));
      // Headboard wood grain
      ctx.fillStyle = PAL.floorGrain;
      ctx.fillRect(x, y + Math.floor(2 * u), ts, Math.max(1, Math.floor(u * 0.4)));

      // Pillow (rows 4-8 of bed)
      var pillowL = leftEdge ? 2 * u : 0;
      var pillowR = rightEdge ? ts - 2 * u : ts;
      ctx.fillStyle = PAL.pillow;
      ctx.fillRect(x + pillowL, y + Math.floor(4 * u), pillowR - pillowL, Math.floor(4 * u));
      // Pillow shadow underneath
      ctx.fillStyle = PAL.pillowSh;
      ctx.fillRect(x + pillowL, y + Math.floor(7 * u), pillowR - pillowL, Math.max(1, u));

      // Blanket starts (rows 8-16 of bed)
      var blankL = leftEdge ? 2 * u : 0;
      var blankR = rightEdge ? ts - 2 * u : ts;
      ctx.fillStyle = PAL.bedMid;
      ctx.fillRect(x + blankL, y + Math.floor(8 * u), blankR - blankL, ts - Math.floor(8 * u));
      // Blanket fold highlight
      ctx.fillStyle = PAL.bedHi;
      ctx.fillRect(x + blankL, y + Math.floor(8 * u), blankR - blankL, Math.max(1, u));
      // Subtle pattern stitching
      ctx.fillStyle = PAL.bedDeep;
      ctx.fillRect(x + blankL, y + Math.floor(12 * u), blankR - blankL, Math.max(1, Math.floor(u * 0.4)));

      // Side rails
      if (leftEdge) {
        ctx.fillStyle = PAL.floorGrain;
        ctx.fillRect(x, y, 2 * u, ts);
      }
      if (rightEdge) {
        ctx.fillStyle = PAL.floorGrain;
        ctx.fillRect(x + ts - 2 * u, y, 2 * u, ts);
      }
    } else {
      // Bottom quadrant: rest of blanket + foot
      var bL = leftEdge ? 2 * u : 0;
      var bR = rightEdge ? ts - 2 * u : ts;

      // Blanket main body
      ctx.fillStyle = PAL.bedMid;
      ctx.fillRect(x + bL, y, bR - bL, ts - 2 * u);
      // Folds — diagonal-ish accents at varying rows
      ctx.fillStyle = PAL.bedHi;
      ctx.fillRect(x + bL, y + Math.floor(3 * u), bR - bL, Math.max(1, Math.floor(u * 0.5)));
      ctx.fillStyle = PAL.bedDeep;
      ctx.fillRect(x + bL, y + Math.floor(8 * u), bR - bL, Math.max(1, Math.floor(u * 0.4)));
      ctx.fillStyle = PAL.bedHi;
      ctx.fillRect(x + bL, y + Math.floor(11 * u), bR - bL, Math.max(1, Math.floor(u * 0.4)));

      // Foot of bed (bottom edge — wood + brass)
      ctx.fillStyle = PAL.floorDark;
      ctx.fillRect(x + bL, y + ts - 2 * u, bR - bL, 2 * u);
      ctx.fillStyle = PAL.brass;
      ctx.fillRect(x + bL, y + ts - 2 * u, bR - bL, Math.max(1, Math.floor(u * 0.5)));

      // Side rails
      if (leftEdge) {
        ctx.fillStyle = PAL.floorGrain;
        ctx.fillRect(x, y, 2 * u, ts);
      }
      if (rightEdge) {
        ctx.fillStyle = PAL.floorGrain;
        ctx.fillRect(x + ts - 2 * u, y, 2 * u, ts);
      }
    }
  }

  // ---- Desk (3x2, anchor at col 11 row 4) ----
  // Layout (relCol):
  //   relCol 0 = left side (drawer column)
  //   relCol 1 = center (terminal screen)
  //   relCol 2 = right side (coffee mug + papers)
  // Layout (relRow):
  //   relRow 0 = upper portion (terminal + wall mount)
  //   relRow 1 = lower portion (desk surface + drawers)
  function drawDesk(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var relCol = col - 11;
    var relRow = row - 4;

    // Floor underneath the desk
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    if (relRow === 0) {
      // Upper portion — wall-mounted terminal + back panel
      // Back panel (full tile)
      ctx.fillStyle = PAL.floorDark;
      ctx.fillRect(x, y + Math.floor(2 * u), ts, ts - 2 * u);
      // Top brass trim
      ctx.fillStyle = PAL.brass;
      ctx.fillRect(x, y + Math.floor(2 * u), ts, Math.max(1, u));

      // Center column: terminal screen
      if (relCol === 1) {
        // Screen bezel
        ctx.fillStyle = PAL.wallDark;
        ctx.fillRect(x + 2 * u, y + Math.floor(4 * u), ts - 4 * u, Math.floor(8 * u));
        // Screen surface — animated cyan with subtle scanlines
        var screenAlpha = 0.7 + Math.sin(time / 800) * 0.1;
        ctx.fillStyle = 'rgba(64, 200, 216, ' + screenAlpha.toFixed(2) + ')';
        ctx.fillRect(x + 3 * u, y + Math.floor(5 * u), ts - 6 * u, Math.floor(6 * u));
        // Scanline
        var scanY = (Math.floor(time / 80) % 6);
        ctx.fillStyle = 'rgba(160, 240, 248, 0.6)';
        ctx.fillRect(x + 3 * u, y + Math.floor((5 + scanY) * u), ts - 6 * u, Math.max(1, Math.floor(u * 0.5)));
        // Screen text mock — a few static "lines"
        ctx.fillStyle = 'rgba(20, 40, 50, 0.6)';
        ctx.fillRect(x + 4 * u, y + Math.floor(6 * u), 4 * u, Math.max(1, Math.floor(u * 0.4)));
        ctx.fillRect(x + 4 * u, y + Math.floor(8 * u), 6 * u, Math.max(1, Math.floor(u * 0.4)));
        ctx.fillRect(x + 4 * u, y + Math.floor(10 * u), 3 * u, Math.max(1, Math.floor(u * 0.4)));
      } else {
        // Side columns: small wall lights / control panels
        ctx.fillStyle = PAL.wallRim;
        ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(5 * u), Math.floor(8 * u), Math.floor(6 * u));
        // Indicator LEDs
        var ledOn = Math.sin(time / 600 + relCol * 1.5) > 0 ? 1 : 0.3;
        ctx.fillStyle = 'rgba(64, 200, 216, ' + ledOn.toFixed(2) + ')';
        ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(6 * u), u, u);
        ctx.fillStyle = 'rgba(255, 224, 128, ' + ((1 - ledOn) + 0.4).toFixed(2) + ')';
        ctx.fillRect(x + Math.floor(8 * u), y + Math.floor(6 * u), u, u);
      }
    } else {
      // Lower portion — desk surface + front panel
      // Desk surface (top edge of this tile)
      ctx.fillStyle = PAL.floorMid;
      ctx.fillRect(x, y, ts, Math.floor(2 * u));
      ctx.fillStyle = PAL.floorHi;
      ctx.fillRect(x, y, ts, Math.max(1, Math.floor(u * 0.5)));
      // Desk front (drawer face)
      ctx.fillStyle = PAL.floorDark;
      ctx.fillRect(x, y + Math.floor(2 * u), ts, ts - 2 * u);
      // Drawer divider (vertical seam every tile)
      ctx.fillStyle = PAL.floorGrain;
      ctx.fillRect(x, y + Math.floor(2 * u), Math.max(1, Math.floor(u * 0.4)), ts - 2 * u);
      // Drawer handle (centered on the front of each tile)
      ctx.fillStyle = PAL.brass;
      ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(8 * u), Math.floor(4 * u), Math.max(1, u));
      ctx.fillStyle = PAL.brassHi;
      ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(8 * u), Math.floor(4 * u), Math.max(1, Math.floor(u * 0.5)));
    }
  }

  // ---- Trophy shelf (single tile, empty) ----
  // ---- Storage locker (single tile — your personal inventory chest) ----
  function drawStorageLocker(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Locker body — dark metal cube with brass + cyan accents
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(3 * u), Math.floor(12 * u), Math.floor(11 * u));
    // Top highlight
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(3 * u), Math.floor(12 * u), Math.max(1, u));
    // Bottom shadow
    ctx.fillStyle = PAL.chairDeep;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(13 * u), Math.floor(12 * u), Math.max(1, u));

    // Brass top trim
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(3 * u) - Math.max(1, Math.floor(u * 0.6)), Math.floor(12 * u), Math.max(1, Math.floor(u * 0.6)));
    ctx.fillStyle = PAL.brassHi;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(3 * u) - Math.max(1, Math.floor(u * 0.6)), Math.floor(12 * u), Math.max(1, Math.floor(u * 0.3)));

    // Locker face — split into two doors with cyan seam
    var seamPulse = 0.6 + Math.sin(time / 800) * 0.25;
    ctx.fillStyle = 'rgba(64, 200, 216, ' + seamPulse.toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(8 * u) - Math.max(1, Math.floor(u * 0.3)), y + Math.floor(4 * u), Math.max(1, Math.floor(u * 0.6)), Math.floor(9 * u));

    // Door handles (small brass knobs left and right of seam)
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(7 * u), Math.max(1, u), Math.max(1, u));
    ctx.fillRect(x + Math.floor(9 * u), y + Math.floor(7 * u), Math.max(1, u), Math.max(1, u));

    // Status LED top-center, pulsing cyan
    var ledOn = (Math.floor(time / 700) % 2) === 0;
    ctx.fillStyle = ledOn ? 'rgba(120, 240, 248, 1)' : 'rgba(40, 100, 110, 0.6)';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(4 * u), Math.floor(2 * u), Math.max(1, Math.floor(u * 0.7)));

    // Tiny indicator panel below LED — shows "STORAGE" via a few dashes
    ctx.fillStyle = 'rgba(120, 220, 240, 0.4)';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(11 * u), Math.floor(2 * u), Math.max(1, Math.floor(u * 0.4)));
    ctx.fillRect(x + Math.floor(8 * u), y + Math.floor(11 * u), Math.floor(2 * u), Math.max(1, Math.floor(u * 0.4)));

    // Subtle glow above (matches catalog terminal aesthetic)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var halo = ctx.createRadialGradient(x + ts / 2, y + Math.floor(5 * u), 0, x + ts / 2, y + Math.floor(5 * u), 5 * u);
    halo.addColorStop(0, 'rgba(64, 200, 216, ' + (0.18 * seamPulse).toFixed(2) + ')');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 2 * u, y - 2 * u, ts + 4 * u, ts + 2 * u);
    ctx.restore();
  }

  // ---- Chess table (single tile — small wooden side-table with chess board) ----
  // Interactable: enters the chess app. Theme is the cozy library / fireplace
  // chess opening trainer, which fits Quarters' lived-in vibe.
  function drawChessTable(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Table top (warm wood) — square with brass edge
    var topY = Math.floor(5 * u);
    ctx.fillStyle = PAL.floorMid;
    ctx.fillRect(x + Math.floor(2 * u), y + topY, Math.floor(12 * u), Math.floor(8 * u));
    ctx.fillStyle = PAL.floorHi;
    ctx.fillRect(x + Math.floor(2 * u), y + topY, Math.floor(12 * u), Math.max(1, u));
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(2 * u), y + topY + Math.floor(8 * u) - Math.max(1, u), Math.floor(12 * u), Math.max(1, u));

    // Chess board on top — 4x4 visible squares (smaller than 8x8 for tile scale)
    var boardX = x + Math.floor(4 * u);
    var boardY = y + topY + Math.floor(2 * u);
    var sq = Math.floor(2 * u);
    for (var rr = 0; rr < 4; rr++) {
      for (var cc = 0; cc < 4; cc++) {
        var dark = (rr + cc) % 2 === 0;
        ctx.fillStyle = dark ? '#3a2410' : '#d4c8b0';
        ctx.fillRect(boardX + cc * sq, boardY + rr * sq, sq, sq);
      }
    }
    // Board border
    ctx.strokeStyle = PAL.floorGrain;
    ctx.lineWidth = Math.max(1, Math.floor(u * 0.4));
    ctx.strokeRect(boardX, boardY, sq * 4, sq * 4);

    // A couple of "pieces" — one dark, one light, suggesting an in-progress game
    var piecePulse = 0.7 + Math.sin(time / 1100) * 0.15;
    ctx.fillStyle = 'rgba(20, 12, 6, ' + piecePulse.toFixed(2) + ')';
    ctx.fillRect(boardX + Math.floor(sq * 0.5), boardY + Math.floor(sq * 0.5), Math.max(1, Math.floor(u * 1.0)), Math.max(1, Math.floor(u * 1.0)));
    ctx.fillStyle = 'rgba(212, 200, 176, ' + piecePulse.toFixed(2) + ')';
    ctx.fillRect(boardX + sq * 2 + Math.floor(sq * 0.5), boardY + sq * 2 + Math.floor(sq * 0.5), Math.max(1, Math.floor(u * 1.0)), Math.max(1, Math.floor(u * 1.0)));

    // Table legs (visible under the top)
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(13 * u), Math.max(1, Math.floor(u * 0.8)), Math.floor(2 * u));
    ctx.fillRect(x + Math.floor(12 * u), y + Math.floor(13 * u), Math.max(1, Math.floor(u * 0.8)), Math.floor(2 * u));

    // Subtle warm glow above the table — invites interaction
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var halo = ctx.createRadialGradient(x + ts / 2, y + Math.floor(7 * u), 0, x + ts / 2, y + Math.floor(7 * u), Math.floor(8 * u));
    halo.addColorStop(0, 'rgba(255, 200, 80, 0.10)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 2 * u, y, ts + 4 * u, ts);
    ctx.restore();
  }

  // Earned trophy keys cached on quarters entry. Stable order — index in
  // TROPHY_ORDER maps to which shelf slot (left-to-right) that trophy occupies.
  var TROPHY_ORDER = ['first_light', 'cabinet_crusher', 'wayfarer', 'settled_in', 'bookworm'];
  var earnedTrophies = new Set();

  function getTrophyForShelf(col) {
    // Shelves run cols 4..9 (6 tiles). Slot index = col - 4.
    var slotIdx = col - 4;
    if (slotIdx < 0 || slotIdx >= TROPHY_ORDER.length) return null;
    var key = TROPHY_ORDER[slotIdx];
    return earnedTrophies.has(key) ? key : null;
  }

  function drawTrophyShelf(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Wall behind shelf (upper portion, dark)
    ctx.fillStyle = PAL.wallMid;
    ctx.fillRect(x, y, ts, Math.floor(8 * u));

    // Shelf surface — wood with brass trim
    ctx.fillStyle = PAL.floorMid;
    ctx.fillRect(x, y + Math.floor(7 * u), ts, Math.floor(2 * u));
    // Top of shelf highlight
    ctx.fillStyle = PAL.floorHi;
    ctx.fillRect(x, y + Math.floor(7 * u), ts, Math.max(1, Math.floor(u * 0.5)));
    // Brass front edge
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x, y + Math.floor(8 * u) + Math.max(0, Math.floor(u * 0.5)), ts, Math.max(1, Math.floor(u * 0.6)));

    // Shelf bracket underneath (centered)
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(9 * u), 2 * u, Math.floor(2 * u));

    var trophyKey = getTrophyForShelf(col);
    if (trophyKey) {
      // Earned — draw the trophy on the shelf surface, plus a subtle pedestal
      drawTrophyPedestal(ctx, x, y, ts);
      var fn = TROPHY_DRAW[trophyKey];
      if (fn) fn(ctx, x, y, ts, time);
      // Subtle gold halo around the trophy
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      var halo = ctx.createRadialGradient(
        x + ts / 2, y + Math.floor(4.5 * u), 0,
        x + ts / 2, y + Math.floor(4.5 * u), Math.floor(5 * u)
      );
      halo.addColorStop(0, 'rgba(255, 220, 120, 0.18)');
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.fillRect(x - 2 * u, y - 2 * u, ts + 4 * u, ts + 2 * u);
      ctx.restore();
    } else {
      // Empty — faint silhouette hint of where a trophy would sit
      ctx.fillStyle = PAL.ghost;
      ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(4 * u), Math.floor(6 * u), Math.floor(3 * u));
    }
  }

  // Small brass pedestal under each earned trophy
  function drawTrophyPedestal(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(6.5 * u), Math.floor(6 * u), Math.max(1, Math.floor(u * 0.5)));
    ctx.fillStyle = PAL.brassHi;
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(6.5 * u), Math.floor(6 * u), Math.max(1, Math.floor(u * 0.3)));
  }

  // ---- Trophy sprite drawers (each ~6-8 art units, perched on the shelf) ----
  // Drawn within the shelf tile; centered around col/row x + ~ts/2.

  // First Light — small gold star
  function drawTrophyStar(ctx, x, y, ts, time) {
    var u = ts / 16;
    var cx = x + Math.floor(8 * u);
    var cy = y + Math.floor(4 * u);
    var twinkle = 0.85 + Math.sin(time / 600) * 0.15;
    ctx.fillStyle = 'rgba(255, 220, 120, ' + twinkle.toFixed(2) + ')';
    // 4-point star — vertical/horizontal arms + center
    ctx.fillRect(cx - Math.floor(u * 0.5), cy - 2 * u, u, 5 * u);
    ctx.fillRect(cx - 2 * u, cy - Math.floor(u * 0.5), 5 * u, u);
    ctx.fillStyle = 'rgba(255, 255, 200, ' + (twinkle * 0.95).toFixed(2) + ')';
    ctx.fillRect(cx - Math.floor(u * 0.5), cy - Math.floor(u * 0.5), u, u);
  }

  // Cabinet Crusher — tiny arcade cabinet silhouette
  function drawTrophyCabinet(ctx, x, y, ts, time) {
    var u = ts / 16;
    var cx = x + Math.floor(8 * u);
    var topY = y + Math.floor(2 * u);
    // Cabinet body
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(cx - 2 * u, topY, 4 * u, 5 * u);
    // Marquee top
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(cx - 2 * u, topY, 4 * u, Math.max(1, u));
    // Pulsing screen
    var pulse = 0.6 + Math.sin(time / 400) * 0.3;
    ctx.fillStyle = 'rgba(232, 112, 192, ' + pulse.toFixed(2) + ')';
    ctx.fillRect(cx - Math.floor(1.5 * u), topY + Math.floor(1.5 * u), 3 * u, 2 * u);
    // Joystick
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(cx - Math.max(1, Math.floor(u * 0.5)), topY + 4 * u, Math.max(1, u), Math.max(1, u));
  }

  // Wayfarer — small compass with rotating needle
  function drawTrophyCompass(ctx, x, y, ts, time) {
    var u = ts / 16;
    var cx = x + Math.floor(8 * u);
    var cy = y + Math.floor(4 * u);
    // Compass body (brass disc)
    ctx.fillStyle = PAL.brass;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a16';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8 * u, 0, Math.PI * 2);
    ctx.fill();
    // Rotating needle
    var ang = time / 1500;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = '#e84040';
    ctx.fillRect(-Math.max(1, Math.floor(u * 0.4)), -2 * u, Math.max(1, Math.floor(u * 0.7)), 2 * u);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-Math.max(1, Math.floor(u * 0.4)), 0, Math.max(1, Math.floor(u * 0.7)), 2 * u);
    ctx.restore();
  }

  // Settled In — small armchair / pillow trophy
  function drawTrophyChair(ctx, x, y, ts, time) {
    var u = ts / 16;
    var cx = x + Math.floor(8 * u);
    var topY = y + Math.floor(2 * u);
    // Chair back
    ctx.fillStyle = PAL.bedMid;
    ctx.fillRect(cx - 2 * u, topY, 4 * u, 3 * u);
    ctx.fillStyle = PAL.bedHi;
    ctx.fillRect(cx - 2 * u, topY, 4 * u, Math.max(1, u));
    // Seat cushion
    ctx.fillStyle = PAL.bedDeep;
    ctx.fillRect(cx - 2 * u, topY + 3 * u, 4 * u, Math.max(1, u));
    ctx.fillStyle = PAL.pillow;
    ctx.fillRect(cx - Math.floor(1.5 * u), topY + Math.floor(1.5 * u), 3 * u, Math.max(1, u));
    // Brass legs
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(cx - 2 * u, topY + 4 * u, Math.max(1, Math.floor(u * 0.5)), Math.max(1, u));
    ctx.fillRect(cx + Math.floor(1.5 * u), topY + 4 * u, Math.max(1, Math.floor(u * 0.5)), Math.max(1, u));
  }

  // Bookworm — small open book with glow
  function drawTrophyBook(ctx, x, y, ts, time) {
    var u = ts / 16;
    var cx = x + Math.floor(8 * u);
    var topY = y + Math.floor(2.5 * u);
    // Book covers (open)
    ctx.fillStyle = '#5a2018';
    ctx.fillRect(cx - 3 * u, topY, 3 * u, Math.floor(3.5 * u));
    ctx.fillRect(cx, topY, 3 * u, Math.floor(3.5 * u));
    // Pages (cream)
    ctx.fillStyle = PAL.pillow;
    ctx.fillRect(cx - Math.floor(2.5 * u), topY + Math.floor(0.5 * u), Math.floor(2.5 * u), Math.floor(2.5 * u));
    ctx.fillRect(cx, topY + Math.floor(0.5 * u), Math.floor(2.5 * u), Math.floor(2.5 * u));
    // Text lines
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(cx - Math.floor(2 * u), topY + Math.floor(1 * u), Math.max(1, Math.floor(u * 1.5)), Math.max(1, Math.floor(u * 0.4)));
    ctx.fillRect(cx - Math.floor(2 * u), topY + Math.floor(1.7 * u), Math.max(1, Math.floor(u * 1.5)), Math.max(1, Math.floor(u * 0.4)));
    ctx.fillRect(cx + Math.floor(0.5 * u), topY + Math.floor(1 * u), Math.max(1, Math.floor(u * 1.5)), Math.max(1, Math.floor(u * 0.4)));
    ctx.fillRect(cx + Math.floor(0.5 * u), topY + Math.floor(1.7 * u), Math.max(1, Math.floor(u * 1.5)), Math.max(1, Math.floor(u * 0.4)));
    // Binding
    ctx.fillStyle = '#3a1010';
    ctx.fillRect(cx - Math.max(1, Math.floor(u * 0.3)), topY, Math.max(1, Math.floor(u * 0.6)), Math.floor(3.5 * u));
  }

  var TROPHY_DRAW = {
    first_light:     drawTrophyStar,
    cabinet_crusher: drawTrophyCabinet,
    wayfarer:        drawTrophyCompass,
    settled_in:      drawTrophyChair,
    bookworm:        drawTrophyBook
  };

  // ---- Rug (3x2, anchor at col 4 row 7) ----
  // Concentric pattern centered on the rug center.
  function drawRug(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var relCol = col - 4; // 0..2
    var relRow = row - 7; // 0..1

    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Compute distance from rug center (in art units across the full 3x2 rug)
    // Rug dimensions: 48 art units wide × 32 art units tall
    // Rug center in art units: (24, 16)
    // This tile's position in art units: (relCol*16, relRow*16) to (+16, +16)
    // We'll iterate over the tile's area and color by distance band.

    // Easier approach: draw the rug as a series of concentric ovals.
    // Each tile draws the portion that falls within its bounds.
    var rugCx = (1.5 - relCol) * 16 * u; // pixels from this tile's origin to rug center X
    var rugCy = (1 - relRow) * 16 * u;
    // Negate to get vector from tile origin to rug center
    rugCx = (1.5 - relCol) * 16 * u;
    rugCy = (1 - relRow) * 16 * u;

    // Outer ring — deep red
    fillOvalBand(ctx, x, y, ts, ts, x + rugCx, y + rugCy, 22 * u, 28 * u, '#5a2018');
    // Mid ring — burnt orange
    fillOvalBand(ctx, x, y, ts, ts, x + rugCx, y + rugCy, 14 * u, 21 * u, '#a04020');
    // Inner ring — gold
    fillOvalBand(ctx, x, y, ts, ts, x + rugCx, y + rugCy, 8 * u, 13 * u, '#c08838');
    // Center — deep red star
    fillOvalBand(ctx, x, y, ts, ts, x + rugCx, y + rugCy, 0, 7 * u, '#5a2018');
    // Tiny center dot
    fillOvalBand(ctx, x, y, ts, ts, x + rugCx, y + rugCy, 0, 2 * u, '#e0c060');

    // Border accent — thin dark line between rings
    ctx.strokeStyle = '#2a1008';
    ctx.lineWidth = Math.max(1, Math.floor(u * 0.4));
    ctx.beginPath();
    ctx.ellipse(x + rugCx, y + rugCy, 22 * u, 14 * u, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Fill a horizontal-ellipse band on the canvas, clipped to the tile's bounds.
  // (Used for the rug's concentric pattern.)
  function fillOvalBand(ctx, tileX, tileY, tileW, tileH, cx, cy, innerR, outerR, color) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(tileX, tileY, tileW, tileH);
    ctx.clip();
    // Outer ellipse fill
    ctx.fillStyle = color;
    ctx.beginPath();
    // Squashed vertically (rug aspect 3:2)
    ctx.ellipse(cx, cy, outerR, outerR * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    if (innerR > 0) {
      // Cut out inner ellipse
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.ellipse(cx, cy, innerR, innerR * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  // ---- Cockpit door ----
  // Two adjacent tiles (col 7-8, row 11). Bright cyan-trimmed door with
  // a blinking LED above.
  function drawCockpitDoor(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    // Wall behind
    ctx.fillStyle = PAL.wallMid;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x, y, ts, Math.max(1, Math.floor(u * 0.6)));

    // Door panel (most of tile, framed by wall)
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x, y + Math.floor(2 * u), ts, ts - 4 * u);

    // Door surface — slightly lighter
    var doorColor = PAL.wallHi;
    ctx.fillStyle = doorColor;
    if (col === 7) {
      ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(3 * u), ts - 2 * u, ts - 6 * u);
    } else {
      ctx.fillRect(x, y + Math.floor(3 * u), ts - 2 * u, ts - 6 * u);
    }

    // Center seam (between the two door tiles — cyan-lit)
    var seamPulse = 0.6 + Math.sin(time / 700) * 0.3;
    ctx.fillStyle = 'rgba(64, 200, 216, ' + seamPulse.toFixed(2) + ')';
    if (col === 7) {
      ctx.fillRect(x + ts - Math.max(1, u), y + Math.floor(3 * u), Math.max(1, u), ts - 6 * u);
    } else {
      ctx.fillRect(x, y + Math.floor(3 * u), Math.max(1, u), ts - 6 * u);
    }

    // Top frame brass accent
    ctx.fillStyle = PAL.brass;
    if (col === 7) {
      ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), ts - 2 * u, Math.max(1, Math.floor(u * 0.5)));
    } else {
      ctx.fillRect(x, y + Math.floor(2 * u), ts - 2 * u, Math.max(1, Math.floor(u * 0.5)));
    }

    // Blinking LED above door (only on left tile, centered on the door pair)
    if (col === 7) {
      var ledOn = (Math.floor(time / 600) % 2) === 0;
      var ledColor = ledOn ? 'rgba(120, 240, 140, 1)' : 'rgba(40, 100, 60, 0.5)';
      ctx.fillStyle = ledColor;
      ctx.fillRect(x + ts - Math.floor(u * 1.5), y + Math.floor(0.5 * u), Math.floor(2 * u), u);
      // LED halo when on
      if (ledOn) {
        var grad = ctx.createRadialGradient(
          x + ts - Math.floor(u * 0.5), y + u,
          0,
          x + ts - Math.floor(u * 0.5), y + u,
          4 * u
        );
        grad.addColorStop(0, 'rgba(120, 240, 140, 0.4)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(x + ts - 5 * u, y - 3 * u, 8 * u, 8 * u);
      }
    }

    // Floor seam at bottom
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(x, y + ts - Math.max(1, u), ts, Math.max(1, u));
  }

  // ---- Catalog terminal (single tile at 14, 9) ----
  function drawCatalogTerminal(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Base unit (lower portion)
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(8 * u), ts - 4 * u, Math.floor(7 * u));
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(8 * u), ts - 4 * u, Math.max(1, Math.floor(u * 0.5)));

    // Holo-display column (rises out of base)
    ctx.fillStyle = PAL.wallMid;
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(2 * u), Math.floor(4 * u), Math.floor(7 * u));

    // Holo-screen surface (animated cyan)
    var screenPulse = 0.6 + Math.sin(time / 500) * 0.25;
    ctx.fillStyle = 'rgba(64, 200, 216, ' + screenPulse.toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(3 * u), Math.floor(2 * u), Math.floor(5 * u));
    // Bright core
    ctx.fillStyle = 'rgba(180, 240, 248, ' + (screenPulse * 0.7).toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(7 * u) + Math.max(0, Math.floor(u * 0.4)), y + Math.floor(3 * u) + Math.max(0, Math.floor(u * 0.4)), Math.floor(2 * u) - Math.max(0, Math.floor(u * 0.8)), Math.floor(5 * u) - Math.max(0, Math.floor(u * 0.8)));
    // "OFFLINE" scanline pattern
    var scanRow = Math.floor(time / 200) % 5;
    ctx.fillStyle = 'rgba(20, 40, 50, 0.7)';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor((3 + scanRow) * u), Math.floor(2 * u), Math.max(1, Math.floor(u * 0.5)));

    // Brass base trim
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(15 * u), ts - 4 * u, Math.max(1, u));

    // Floating projector glow above the holo-column
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var grad = ctx.createRadialGradient(
      x + ts / 2, y + Math.floor(5 * u),
      0,
      x + ts / 2, y + Math.floor(5 * u),
      6 * u
    );
    grad.addColorStop(0, 'rgba(64, 200, 216, ' + (screenPulse * 0.4).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 3 * u, y - 3 * u, ts + 6 * u, ts + 3 * u);
    ctx.restore();
  }

  // ---- Decor slot silhouettes (faint outline of what would go there) ----

  // ---- Owned-decor cache: slot_key → item_key ----
  var ownedDecor = {};
  function refreshDecor() {
    if (typeof BridgeProgression === 'undefined') return;
    BridgeProgression.getDecor().then(function (d) { ownedDecor = d || {}; });
  }

  function drawSlotPlant(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    var owned = ownedDecor.plant;
    if (owned === 'houseplant') return drawOwnedHouseplant(ctx, x, y, ts);
    if (owned === 'bonsai')     return drawOwnedBonsai(ctx, x, y, ts);

    // Pot outline (truncated cone)
    ctx.fillStyle = PAL.ghost;
    // Pot body
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(11 * u), Math.floor(6 * u), Math.floor(4 * u));
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(13 * u), Math.floor(8 * u), Math.floor(2 * u));
    // Pot top edge
    ctx.fillStyle = PAL.ghostHi;
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(11 * u), Math.floor(6 * u), Math.max(1, u));

    // Plant leaves (very faint silhouette above pot)
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(5 * u), Math.floor(2 * u), Math.floor(6 * u));
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(7 * u), Math.floor(2 * u), Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(9 * u), y + Math.floor(7 * u), Math.floor(2 * u), Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(8 * u), Math.floor(2 * u), Math.floor(2 * u));
    ctx.fillRect(x + Math.floor(10 * u), y + Math.floor(8 * u), Math.floor(2 * u), Math.floor(2 * u));
  }

  function drawSlotLamp(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    var owned = ownedDecor.lamp;
    if (owned === 'floor_lamp')     return drawOwnedFloorLamp(ctx, x, y, ts, time);
    if (owned === 'crystal_lamp')   return drawOwnedCrystalLamp(ctx, x, y, ts, time);
    if (owned === 'driftwood_lamp') return drawOwnedDriftwoodLamp(ctx, x, y, ts, time);

    // Lamp base
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(13 * u), Math.floor(6 * u), Math.floor(2 * u));
    ctx.fillStyle = PAL.ghostHi;
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(13 * u), Math.floor(6 * u), Math.max(1, u));

    // Lamp pole (thin vertical)
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(5 * u), Math.floor(2 * u), Math.floor(8 * u));

    // Lamp shade (cone)
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(2 * u), Math.floor(8 * u), Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(1 * u), Math.floor(6 * u), Math.max(1, u));
    ctx.fillStyle = PAL.ghostHi;
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(4 * u), Math.floor(8 * u), Math.max(1, u));
  }

  function drawSlotPoster(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    // Wall behind (this slot replaces a wall tile)
    drawWall(ctx, x, y, ts, time, col, row);

    if (ownedDecor.poster === 'holo_poster') {
      return drawOwnedHoloPoster(ctx, x, y, ts, time);
    }

    // Poster outline (rectangle)
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), ts - 4 * u, ts - 4 * u);
    // Poster border (slightly stronger)
    ctx.strokeStyle = PAL.ghostLine;
    ctx.lineWidth = Math.max(1, Math.floor(u * 0.5));
    ctx.strokeRect(x + Math.floor(2 * u), y + Math.floor(2 * u), ts - 4 * u, ts - 4 * u);

    // Hint of poster content (lines)
    ctx.fillStyle = PAL.ghostHi;
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(5 * u), ts - 8 * u, Math.max(1, u));
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(8 * u), ts - 10 * u, Math.max(1, u));
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(11 * u), ts - 9 * u, Math.max(1, u));
  }

  function drawSlotNebulaTank(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    if (ownedDecor.tank === 'nebula_tank') {
      return drawOwnedNebulaTank(ctx, x, y, ts, time);
    }

    // Stand base
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(13 * u), Math.floor(10 * u), Math.floor(2 * u));
    ctx.fillStyle = PAL.ghostHi;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(13 * u), Math.floor(10 * u), Math.max(1, u));

    // Stand legs
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(10 * u), u, Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(11 * u), y + Math.floor(10 * u), u, Math.floor(3 * u));

    // Tank silhouette (cube outline)
    ctx.strokeStyle = PAL.ghostLine;
    ctx.lineWidth = Math.max(1, Math.floor(u * 0.5));
    ctx.strokeRect(x + Math.floor(3 * u), y + Math.floor(2 * u), Math.floor(10 * u), Math.floor(8 * u));

    // Tank glass hint (very faint vertical highlight)
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(3 * u), u, Math.floor(6 * u));
  }

  // ---- Shelf slot — small wall-mounted shelf for Lumar trinkets ----
  function drawSlotShelf(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    // Wall behind
    ctx.fillStyle = PAL.wallMid;
    ctx.fillRect(x, y, ts, Math.floor(8 * u));

    // Shelf surface — wood plank with brass front edge
    ctx.fillStyle = PAL.floorMid;
    ctx.fillRect(x, y + Math.floor(7 * u), ts, Math.floor(2 * u));
    ctx.fillStyle = PAL.floorHi;
    ctx.fillRect(x, y + Math.floor(7 * u), ts, Math.max(1, Math.floor(u * 0.5)));
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x, y + Math.floor(8 * u) + Math.max(0, Math.floor(u * 0.5)), ts, Math.max(1, Math.floor(u * 0.5)));
    // Bracket below
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(9 * u), 2 * u, Math.floor(2 * u));
    // Floor underneath the wall+shelf area (rest of the tile)
    drawFloorBase(ctx, x, y + Math.floor(11 * u), ts, time, col, row, false);
    // Hack: above floorBase repaints the lower portion so it fits naturally with neighbors.
    ctx.fillStyle = PAL.floorMid;
    ctx.fillRect(x, y + Math.floor(11 * u), ts, ts - Math.floor(11 * u));

    var owned = ownedDecor.shelf;
    if (owned === 'glass_float')   return drawOwnedGlassFloat(ctx, x, y, ts, time);
    if (owned === 'kelp_canister') return drawOwnedKelpCanister(ctx, x, y, ts, time);
    if (owned === 'brass_compass') return drawOwnedBrassCompass(ctx, x, y, ts, time);

    // Empty — small ghost silhouette of a knick-knack
    ctx.fillStyle = PAL.ghost;
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(3 * u), Math.floor(4 * u), Math.floor(4 * u));
  }

  // ---- Owned decor sprites — drawn in place when player has bought the item ----

  function drawOwnedHouseplant(ctx, x, y, ts) {
    var u = ts / 16;
    // Pot
    ctx.fillStyle = '#7a4818';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(11 * u), Math.floor(6 * u), Math.floor(4 * u));
    ctx.fillStyle = '#a06820';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(11 * u), Math.floor(6 * u), Math.max(1, u));
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(13 * u), Math.floor(8 * u), Math.floor(2 * u));
    // Soil
    ctx.fillStyle = '#3a1a08';
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(12 * u), Math.floor(4 * u), u);
    // Leaves
    ctx.fillStyle = '#3a8038';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(5 * u), Math.floor(2 * u), Math.floor(6 * u));
    ctx.fillStyle = '#5aa050';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(7 * u), Math.floor(2 * u), Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(9 * u), y + Math.floor(7 * u), Math.floor(2 * u), Math.floor(3 * u));
    ctx.fillStyle = '#3a8038';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(8 * u), Math.floor(2 * u), Math.floor(2 * u));
    ctx.fillRect(x + Math.floor(10 * u), y + Math.floor(8 * u), Math.floor(2 * u), Math.floor(2 * u));
  }

  function drawOwnedBonsai(ctx, x, y, ts) {
    var u = ts / 16;
    // Wide shallow pot
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(12 * u), Math.floor(10 * u), Math.floor(3 * u));
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(12 * u), Math.floor(10 * u), u);
    // Trunk
    ctx.fillStyle = '#3a1810';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(7 * u), Math.floor(2 * u), Math.floor(5 * u));
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(9 * u), Math.floor(2 * u), Math.floor(2 * u));
    // Foliage clouds
    ctx.fillStyle = '#3a8038';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(5 * u), Math.floor(4 * u), Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(8 * u), y + Math.floor(4 * u), Math.floor(4 * u), Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(7 * u), Math.floor(6 * u), u);
    ctx.fillStyle = '#5aa050';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(5 * u), Math.floor(4 * u), u);
    ctx.fillRect(x + Math.floor(8 * u), y + Math.floor(4 * u), Math.floor(4 * u), u);
  }

  function drawOwnedFloorLamp(ctx, x, y, ts, time) {
    var u = ts / 16;
    // Base
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(13 * u), Math.floor(6 * u), Math.floor(2 * u));
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(13 * u), Math.floor(6 * u), u);
    // Pole
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(5 * u), Math.floor(2 * u), Math.floor(8 * u));
    // Shade
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(2 * u), Math.floor(8 * u), Math.floor(3 * u));
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(4 * u), Math.floor(8 * u), u);
    // Warm halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(x + ts / 2, y + Math.floor(4 * u), 0, x + ts / 2, y + Math.floor(4 * u), 6 * u);
    var pulse = 0.7 + Math.sin(time / 800) * 0.1;
    glow.addColorStop(0, 'rgba(255, 224, 128, ' + (0.5 * pulse).toFixed(2) + ')');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 3 * u, y - 3 * u, ts + 6 * u, ts);
    ctx.restore();
  }

  function drawOwnedCrystalLamp(ctx, x, y, ts, time) {
    var u = ts / 16;
    // Base
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(13 * u), Math.floor(6 * u), Math.floor(2 * u));
    ctx.fillStyle = '#3a2858';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(13 * u), Math.floor(6 * u), u);
    // Crystal column
    var pulse = 0.85 + Math.sin(time / 700) * 0.15;
    ctx.fillStyle = '#503090';
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(4 * u), Math.floor(4 * u), Math.floor(9 * u));
    ctx.fillStyle = 'rgba(192, 144, 232, ' + pulse.toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(4 * u), Math.floor(2 * u), Math.floor(9 * u));
    ctx.fillStyle = 'rgba(220, 180, 240, ' + (pulse * 0.7).toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(4 * u), Math.max(1, u), Math.floor(9 * u));
    // Glow
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(x + ts / 2, y + Math.floor(6 * u), 0, x + ts / 2, y + Math.floor(6 * u), 7 * u);
    glow.addColorStop(0, 'rgba(192, 144, 232, ' + (0.5 * pulse).toFixed(2) + ')');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 3 * u, y - 3 * u, ts + 6 * u, ts);
    ctx.restore();
  }

  function drawOwnedHoloPoster(ctx, x, y, ts, time) {
    var u = ts / 16;
    // Frame
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), ts - 4 * u, ts - 4 * u);
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), ts - 4 * u, Math.max(1, Math.floor(u * 0.5)));
    // Poster surface — animated cyan/purple gradient
    var pulse = 0.85 + Math.sin(time / 900) * 0.15;
    var grad = ctx.createLinearGradient(x + 3 * u, y + 3 * u, x + ts - 3 * u, y + ts - 3 * u);
    grad.addColorStop(0, 'rgba(96, 64, 160, ' + pulse.toFixed(2) + ')');
    grad.addColorStop(1, 'rgba(64, 200, 216, ' + pulse.toFixed(2) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(3 * u), ts - 6 * u, ts - 6 * u);
    // Big star burst
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(5 * u), Math.floor(2 * u), Math.floor(6 * u));
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(7 * u), Math.floor(6 * u), Math.floor(2 * u));
  }

  function drawOwnedNebulaTank(ctx, x, y, ts, time) {
    var u = ts / 16;
    // Stand
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(13 * u), Math.floor(10 * u), Math.floor(2 * u));
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(13 * u), Math.floor(10 * u), Math.max(1, Math.floor(u * 0.5)));
    // Tank glass
    ctx.fillStyle = '#0a0418';
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(2 * u), Math.floor(10 * u), Math.floor(11 * u));
    // Nebula gradient inside
    var swirl = 0.85 + Math.sin(time / 1300) * 0.15;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + Math.floor(3 * u), y + Math.floor(2 * u), Math.floor(10 * u), Math.floor(11 * u));
    ctx.clip();
    var grad = ctx.createRadialGradient(x + 8 * u, y + 7 * u, 0, x + 8 * u, y + 7 * u, 7 * u);
    grad.addColorStop(0, 'rgba(192, 144, 232, ' + swirl.toFixed(2) + ')');
    grad.addColorStop(0.5, 'rgba(96, 80, 180, ' + (swirl * 0.6).toFixed(2) + ')');
    grad.addColorStop(1, 'rgba(20, 12, 40, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 3 * u, y + 2 * u, 10 * u, 11 * u);
    // Tiny stars
    ctx.fillStyle = '#fff';
    var starOff = Math.floor(time / 100) % 7;
    ctx.fillRect(x + 5 * u, y + (4 + starOff % 3) * u, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.fillRect(x + 10 * u, y + (6 + starOff % 4) * u, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.fillRect(x + 7 * u, y + (10 - starOff % 3) * u, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.restore();
    // Glass border + reflection
    ctx.strokeStyle = 'rgba(160, 240, 248, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3 * u + 0.5, y + 2 * u + 0.5, 10 * u - 1, 11 * u - 1);
    ctx.fillStyle = 'rgba(160, 240, 248, 0.25)';
    ctx.fillRect(x + 4 * u, y + 3 * u, Math.max(1, u * 0.8), 4 * u);
  }

  // ---- Lumar dockside item renderers (in-room sprites for owned items) ----

  function drawOwnedDriftwoodLamp(ctx, x, y, ts, time) {
    var u = ts / 16;
    // Wide weathered stone base
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(13 * u), Math.floor(8 * u), Math.floor(2 * u));
    ctx.fillStyle = '#7a6a48';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(13 * u), Math.floor(8 * u), Math.max(1, u));
    // Twisted driftwood pole
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(5 * u), Math.floor(2 * u), Math.floor(8 * u));
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(x + Math.floor(6 * u), y + Math.floor(7 * u), Math.max(1, u), Math.floor(2 * u));
    ctx.fillRect(x + Math.floor(9 * u), y + Math.floor(9 * u), Math.max(1, u), Math.floor(2 * u));
    // Frosted-glass shade
    ctx.fillStyle = '#8aa0a8';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(2 * u), Math.floor(8 * u), Math.floor(3 * u));
    ctx.fillStyle = '#c8e0e8';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(2 * u), Math.floor(8 * u), Math.max(1, u));
    // Warm halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(x + ts / 2, y + Math.floor(4 * u), 0, x + ts / 2, y + Math.floor(4 * u), 7 * u);
    var pulse = 0.7 + Math.sin(time / 900) * 0.1;
    glow.addColorStop(0, 'rgba(255, 210, 140, ' + (0.5 * pulse).toFixed(2) + ')');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 3 * u, y - 3 * u, ts + 6 * u, ts);
    ctx.restore();
  }

  function drawOwnedGlassFloat(ctx, x, y, ts, time) {
    var u = ts / 16;
    // Item sits ON the shelf (drawn at row ~2-7 of the tile)
    var cx = x + ts / 2, cy = y + Math.floor(4.5 * u);
    // Glass orb with gradient
    var grad = ctx.createRadialGradient(cx - u, cy - u, 0, cx, cy, 3 * u);
    grad.addColorStop(0, '#c8f0e8');
    grad.addColorStop(0.6, '#5aa098');
    grad.addColorStop(1, '#205848');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, Math.floor(2.8 * u), 0, Math.PI * 2); ctx.fill();
    // Net wrap (X pattern)
    ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 2 * u, cy - 2 * u); ctx.lineTo(cx + 2 * u, cy + 2 * u);
    ctx.moveTo(cx + 2 * u, cy - 2 * u); ctx.lineTo(cx - 2 * u, cy + 2 * u);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = 'rgba(220, 240, 232, 0.5)';
    ctx.beginPath(); ctx.arc(cx - u, cy - u, Math.max(1, Math.floor(u * 0.7)), 0, Math.PI * 2); ctx.fill();
  }

  function drawOwnedKelpCanister(ctx, x, y, ts, time) {
    var u = ts / 16;
    var cx = x + ts / 2;
    var topY = y + Math.floor(2 * u);
    // Canister glass
    ctx.fillStyle = '#0a1820';
    ctx.fillRect(cx - 2 * u, topY, 4 * u, 5 * u);
    // Bioluminescent water
    var grad = ctx.createLinearGradient(0, topY, 0, topY + 5 * u);
    grad.addColorStop(0, 'rgba(96, 200, 160, 0.6)');
    grad.addColorStop(1, 'rgba(40, 100, 80, 0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - Math.floor(1.7 * u), topY + Math.max(1, Math.floor(u * 0.3)), Math.floor(3.4 * u), 5 * u - Math.max(1, Math.floor(u * 0.5)));
    // Kelp strands
    ctx.fillStyle = '#3a8038';
    ctx.fillRect(cx - Math.floor(1.5 * u), topY + 1 * u, Math.max(1, Math.floor(u * 0.6)), 4 * u);
    ctx.fillRect(cx, topY + 2 * u, Math.max(1, Math.floor(u * 0.6)), 3 * u);
    ctx.fillRect(cx + Math.floor(1 * u), topY + 1 * u, Math.max(1, Math.floor(u * 0.6)), 4 * u);
    // Glow particles
    var sparkle = (Math.floor(time / 200) % 4);
    ctx.fillStyle = '#a8f0c8';
    ctx.fillRect(cx - u + (sparkle * Math.max(1, Math.floor(u * 0.5))), topY + 2 * u, Math.max(1, Math.floor(u * 0.6)), Math.max(1, Math.floor(u * 0.6)));
    // Brass cap
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(cx - 2 * u, topY, 4 * u, Math.max(1, u));
    ctx.fillStyle = PAL.brassHi;
    ctx.fillRect(cx - 2 * u, topY, 4 * u, Math.max(1, Math.floor(u * 0.4)));
    // Subtle bioluminescent halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var halo = ctx.createRadialGradient(cx, topY + Math.floor(3 * u), 0, cx, topY + Math.floor(3 * u), 5 * u);
    halo.addColorStop(0, 'rgba(120, 240, 184, 0.18)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 2 * u, y - u, ts + 4 * u, ts);
    ctx.restore();
  }

  function drawOwnedBrassCompass(ctx, x, y, ts, time) {
    var u = ts / 16;
    var cx = x + ts / 2;
    var cy = y + Math.floor(4.5 * u);
    // Compass body (brass disc)
    ctx.fillStyle = PAL.brass;
    ctx.beginPath(); ctx.arc(cx, cy, Math.floor(3 * u), 0, Math.PI * 2); ctx.fill();
    // Inner face (dark)
    ctx.fillStyle = '#0a1418';
    ctx.beginPath(); ctx.arc(cx, cy, Math.floor(2.2 * u), 0, Math.PI * 2); ctx.fill();
    // Brass tick marks (N/E/S/W)
    ctx.fillStyle = PAL.brassHi;
    ctx.fillRect(cx - Math.max(1, Math.floor(u * 0.35)), cy - Math.floor(2.7 * u), Math.max(1, Math.floor(u * 0.7)), Math.max(1, Math.floor(u * 0.6)));
    ctx.fillRect(cx + Math.floor(2.1 * u), cy - Math.max(1, Math.floor(u * 0.35)), Math.max(1, Math.floor(u * 0.6)), Math.max(1, Math.floor(u * 0.7)));
    ctx.fillRect(cx - Math.max(1, Math.floor(u * 0.35)), cy + Math.floor(2.1 * u), Math.max(1, Math.floor(u * 0.7)), Math.max(1, Math.floor(u * 0.6)));
    ctx.fillRect(cx - Math.floor(2.7 * u), cy - Math.max(1, Math.floor(u * 0.35)), Math.max(1, Math.floor(u * 0.6)), Math.max(1, Math.floor(u * 0.7)));
    // Slowly rotating needle
    var ang = time / 2000;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = '#e84040';
    ctx.fillRect(-Math.max(1, Math.floor(u * 0.4)), -Math.floor(2 * u), Math.max(1, Math.floor(u * 0.8)), Math.floor(2 * u));
    ctx.fillStyle = '#fff';
    ctx.fillRect(-Math.max(1, Math.floor(u * 0.4)), 0, Math.max(1, Math.floor(u * 0.8)), Math.floor(2 * u));
    ctx.restore();
    // Glass dome highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.beginPath(); ctx.arc(cx - u, cy - u, Math.max(1, Math.floor(u * 0.9)), 0, Math.PI * 2); ctx.fill();
  }

  // ============================================================
  //  VIEWPORT OVERLAY — animated stars, planets, ships
  // ============================================================

  // Viewport rect in tile coords: cols 1-14, rows 1-2
  var VP_COL_MIN = 1;
  var VP_COL_MAX = 15; // exclusive
  var VP_ROW_MIN = 1;
  var VP_ROW_MAX = 3;  // exclusive

  // Stars drift left across the viewport. Three depth layers for parallax.
  var vpStars = null;
  function initViewportStars() {
    vpStars = [];
    var layers = [
      { count: 18, speed: 0.012, size: 1, brightness: 0.55 },
      { count: 14, speed: 0.020, size: 1.2, brightness: 0.78 },
      { count: 8,  speed: 0.034, size: 1.8, brightness: 1.0 }
    ];
    for (var l = 0; l < layers.length; l++) {
      var lay = layers[l];
      for (var i = 0; i < lay.count; i++) {
        vpStars.push({
          x: Math.random(),  // 0..1 across viewport width
          y: Math.random(),  // 0..1 across viewport height
          spd: lay.speed,
          sz: lay.size,
          br: lay.brightness * (0.7 + Math.random() * 0.3),
          twPhase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  // Drifting planet event state (occasional planet crosses viewport L→R)
  var vpPlanet = null; // { active, x, y, r, color, secondaryColor, ringed, vy }
  var vpNextPlanetAt = 0;
  function maybeSpawnPlanet(now) {
    if (vpPlanet && vpPlanet.active) return;
    if (now < vpNextPlanetAt) return;

    var palettes = [
      { primary: '#5a3a78', secondary: '#3a2050', ring: false },
      { primary: '#3a8060', secondary: '#205040', ring: false },
      { primary: '#a05030', secondary: '#704020', ring: false },
      { primary: '#4060a0', secondary: '#2a3870', ring: true },
      { primary: '#a09030', secondary: '#705a18', ring: true },
      { primary: '#80a0c0', secondary: '#506880', ring: false }
    ];
    var p = palettes[Math.floor(Math.random() * palettes.length)];
    vpPlanet = {
      active: true,
      x: -0.15,
      y: 0.25 + Math.random() * 0.5,
      r: 0.04 + Math.random() * 0.05, // radius as fraction of viewport height
      color: p.primary,
      secondary: p.secondary,
      ringed: p.ring,
      ringTilt: Math.random() * 0.5 + 0.3,
      spd: 0.00012 + Math.random() * 0.00010,
      bandSeed: Math.random() * 100
    };
  }

  // Ship streak event (small ship streaks past)
  var vpShip = null;
  var vpNextShipAt = 0;
  function maybeSpawnShip(now) {
    if (vpShip && vpShip.active) return;
    if (now < vpNextShipAt) return;
    var dirRight = Math.random() > 0.5;
    vpShip = {
      active: true,
      x: dirRight ? -0.1 : 1.1,
      y: 0.2 + Math.random() * 0.6,
      spd: (dirRight ? 1 : -1) * (0.0008 + Math.random() * 0.0006),
      trail: []
    };
  }

  function drawViewportOverlay(ctx, world, offX, offY, ts, time) {
    if (!vpStars) initViewportStars();

    // Compute viewport rect in screen coords
    var vpX = Math.floor(offX + VP_COL_MIN * ts);
    var vpY = Math.floor(offY + VP_ROW_MIN * ts);
    var vpW = Math.ceil((VP_COL_MAX - VP_COL_MIN) * ts);
    var vpH = Math.ceil((VP_ROW_MAX - VP_ROW_MIN) * ts);

    ctx.save();
    // Clip to viewport rect — content stays inside the window
    ctx.beginPath();
    ctx.rect(vpX, vpY, vpW, vpH);
    ctx.clip();

    // Subtle deep-space gradient (top slightly purple, bottom slightly black)
    var bgGrad = ctx.createLinearGradient(0, vpY, 0, vpY + vpH);
    bgGrad.addColorStop(0, 'rgba(20, 12, 40, 0.55)');
    bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(vpX, vpY, vpW, vpH);

    // Stars
    for (var i = 0; i < vpStars.length; i++) {
      var s = vpStars[i];
      s.x -= s.spd * 0.016; // approx-frame-rate independent
      if (s.x < -0.02) {
        s.x = 1.05;
        s.y = Math.random();
        s.br = 0.4 + Math.random() * 0.6;
      }
      var sx = vpX + s.x * vpW;
      var sy = vpY + s.y * vpH;
      var twinkle = 0.6 + Math.sin(time / 350 + s.twPhase) * 0.4;
      var alpha = Math.min(1, s.br * twinkle);
      ctx.fillStyle = 'rgba(220, 220, 255, ' + alpha.toFixed(2) + ')';
      ctx.fillRect(sx, sy, s.sz, s.sz);
    }

    // Planet event
    maybeSpawnPlanet(time);
    if (vpPlanet && vpPlanet.active) {
      vpPlanet.x += vpPlanet.spd * 16;
      drawPlanet(ctx, vpX, vpY, vpW, vpH, vpPlanet, time);
      if (vpPlanet.x > 1.2) {
        vpPlanet.active = false;
        vpNextPlanetAt = time + 30000 + Math.random() * 40000;
      }
    } else if (vpNextPlanetAt === 0) {
      vpNextPlanetAt = time + 8000 + Math.random() * 6000;
    }

    // Ship event
    maybeSpawnShip(time);
    if (vpShip && vpShip.active) {
      vpShip.x += vpShip.spd * 16;
      vpShip.trail.unshift({ x: vpShip.x, y: vpShip.y });
      if (vpShip.trail.length > 12) vpShip.trail.pop();
      drawShipStreak(ctx, vpX, vpY, vpW, vpH, vpShip);
      if (vpShip.x < -0.15 || vpShip.x > 1.15) {
        vpShip.active = false;
        vpShip.trail = [];
        vpNextShipAt = time + 90000 + Math.random() * 60000;
      }
    } else if (vpNextShipAt === 0) {
      vpNextShipAt = time + 22000 + Math.random() * 18000;
    }

    ctx.restore();
  }

  function drawPlanet(ctx, vpX, vpY, vpW, vpH, p, time) {
    var cx = vpX + p.x * vpW;
    var cy = vpY + p.y * vpH;
    var r = p.r * vpH;

    // Planet body
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Day/night terminator (shadow on right)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(cx, cy - r, r * 1.2, r * 2);
    ctx.restore();

    // Atmospheric/banding hint (a slightly different color stripe)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = p.secondary;
    ctx.fillRect(cx - r, cy - r * 0.2, r * 2, r * 0.15);
    ctx.fillRect(cx - r, cy + r * 0.35, r * 2, r * 0.18);
    ctx.restore();

    // Highlight rim (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.3, r, 0, Math.PI * 2);
    ctx.stroke();

    // Ring (if applicable)
    if (p.ringed) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.4);
      ctx.strokeStyle = 'rgba(220, 200, 180, 0.55)';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.7, r * p.ringTilt, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Ring shadow on planet (occluded portion)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.7, r * p.ringTilt, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawShipStreak(ctx, vpX, vpY, vpW, vpH, ship) {
    var sx = vpX + ship.x * vpW;
    var sy = vpY + ship.y * vpH;

    // Engine trail (fading line)
    if (ship.trail.length > 1) {
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (var i = 1; i < ship.trail.length; i++) {
        var t = ship.trail[i];
        var tx = vpX + t.x * vpW;
        var ty = vpY + t.y * vpH;
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
    }

    // Tiny ship body (3-4 px)
    ctx.fillStyle = '#c0d0e0';
    ctx.fillRect(Math.floor(sx) - 2, Math.floor(sy) - 1, 4, 2);
    // Engine glow
    var dir = ship.spd > 0 ? -3 : 3;
    ctx.fillStyle = 'rgba(120, 200, 255, 0.9)';
    ctx.fillRect(Math.floor(sx) + dir, Math.floor(sy), 2, 1);
  }

  // ============================================================
  //  DRONE PET
  // ============================================================

  // Hangouts in tile coordinates (where the drone idles).
  // Picks one at random, drifts there, idles, picks another.
  var DRONE_HANGOUTS = [
    { x: 1.8, y: 4.5 },   // above the bed
    { x: 6.5, y: 4.8 },   // above the trophy shelves
    { x: 12.0, y: 4.8 },  // above the desk
    { x: 7.5, y: 6.5 },   // center of room
    { x: 6.0, y: 7.5 },   // above the rug
    { x: 13.5, y: 9.0 },  // near the catalog terminal
    { x: 9.0, y: 9.0 },   // above the nebula tank slot
    { x: 4.0, y: 8.0 }    // near the plant slot
  ];

  var drone = {
    x: 7.5,
    y: 6.5,
    targetX: 7.5,
    targetY: 6.5,
    bobPhase: Math.random() * Math.PI * 2,
    ledPhase: 0,
    ledBoost: 0,        // increased on player entry, decays
    nextHangoutAt: 0,
    hangoutDuration: 0
  };

  function pickNewHangout(time) {
    var pick;
    var attempts = 0;
    do {
      pick = DRONE_HANGOUTS[Math.floor(Math.random() * DRONE_HANGOUTS.length)];
      attempts++;
    } while (attempts < 5 && Math.abs(pick.x - drone.targetX) < 1 && Math.abs(pick.y - drone.targetY) < 1);
    drone.targetX = pick.x;
    drone.targetY = pick.y;
    drone.hangoutDuration = 6000 + Math.random() * 9000;
    drone.nextHangoutAt = time + drone.hangoutDuration;
  }

  function updateDrone(time, world) {
    if (drone.nextHangoutAt === 0) drone.nextHangoutAt = time + 3000;
    if (time > drone.nextHangoutAt) pickNewHangout(time);

    // Drift toward target
    var dx = drone.targetX - drone.x;
    var dy = drone.targetY - drone.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.02) {
      var stepSpeed = 0.012;
      drone.x += (dx / dist) * Math.min(stepSpeed, dist);
      drone.y += (dy / dist) * Math.min(stepSpeed, dist);
    }

    // Bob
    drone.bobPhase += 0.04;

    // If player is directly underneath, gently lift drone away
    if (typeof BridgeCharacter !== 'undefined') {
      var px = BridgeCharacter.getX();
      var py = BridgeCharacter.getY();
      var pdx = drone.x - px;
      var pdy = drone.y - py;
      var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < 1.2) {
        // Push drone up and away
        if (drone.y > 3.5) {
          drone.y -= 0.04;
        }
        drone.x += pdx * 0.02;
      }
    }

    // LED boost decays
    if (drone.ledBoost > 0) drone.ledBoost = Math.max(0, drone.ledBoost - 0.012);
  }

  function drawDrone(ctx, offX, offY, ts, time) {
    var u = ts / 16;
    var bob = Math.sin(drone.bobPhase) * (1.5 * u);
    var sx = offX + drone.x * ts;
    var sy = offY + drone.y * ts + bob;

    // Shadow on the floor below
    var shadowGrad = ctx.createRadialGradient(sx, sy + 8 * u, 0, sx, sy + 8 * u, 5 * u);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
    shadowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(sx - 5 * u, sy + 6 * u, 10 * u, 4 * u);

    // Body — small rounded rectangle (cyan)
    ctx.fillStyle = PAL.droneCore;
    ctx.fillRect(sx - 3 * u, sy - 2 * u, 6 * u, 4 * u);
    ctx.fillStyle = PAL.droneBody;
    ctx.fillRect(sx - Math.floor(2.5 * u), sy - Math.floor(1.5 * u), 5 * u, 3 * u);
    // Highlight on top
    ctx.fillStyle = 'rgba(220, 240, 248, 0.7)';
    ctx.fillRect(sx - 2 * u, sy - Math.floor(1.5 * u), 4 * u, Math.max(1, Math.floor(u * 0.7)));

    // Antenna
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(sx - Math.max(1, Math.floor(u * 0.5)), sy - Math.floor(3.5 * u), Math.max(1, u), Math.max(1, Math.floor(1.5 * u)));

    // Top LED — blinks faster when boosted
    var ledRate = drone.ledBoost > 0 ? 200 : 800;
    var ledOn = (Math.floor(time / ledRate) % 2) === 0;
    var ledColor = ledOn ? PAL.droneLED : '#806838';
    ctx.fillStyle = ledColor;
    ctx.fillRect(sx - Math.max(1, Math.floor(u * 0.5)), sy - Math.floor(4 * u), Math.max(1, u), Math.max(1, u));

    // LED halo when on
    if (ledOn) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      var grad = ctx.createRadialGradient(sx, sy - Math.floor(4 * u), 0, sx, sy - Math.floor(4 * u), 4 * u);
      grad.addColorStop(0, 'rgba(255, 224, 128, 0.55)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(sx - 4 * u, sy - 8 * u, 8 * u, 8 * u);
      ctx.restore();
    }

    // Eye lens (front face) — single dark pixel that occasionally shifts
    var eyeShift = Math.floor(time / 1200) % 3 - 1; // -1, 0, 1
    ctx.fillStyle = '#0a1418';
    ctx.fillRect(sx + eyeShift * Math.max(1, Math.floor(u * 0.5)), sy - Math.max(1, Math.floor(u * 0.4)), Math.max(1, u), Math.max(1, u));

    // Tiny propulsion underglow
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var propGrad = ctx.createRadialGradient(sx, sy + 2 * u, 0, sx, sy + 2 * u, 3 * u);
    propGrad.addColorStop(0, 'rgba(64, 200, 216, 0.55)');
    propGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = propGrad;
    ctx.fillRect(sx - 3 * u, sy + u, 6 * u, 4 * u);
    ctx.restore();
  }

  // ============================================================
  //  COFFEE MUG STEAM (anchored to desk)
  // ============================================================

  var steamParticles = [];
  function updateSteam(time) {
    // Spawn occasionally
    if (Math.random() < 0.025) {
      steamParticles.push({
        x: 0,
        y: 0,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        drift: (Math.random() - 0.5) * 0.4
      });
    }
    for (var i = steamParticles.length - 1; i >= 0; i--) {
      var p = steamParticles[i];
      p.life++;
      p.y -= 0.3;
      p.x += p.drift;
      if (p.life > p.maxLife) steamParticles.splice(i, 1);
    }
  }

  function drawSteam(ctx, offX, offY, ts, time) {
    var u = ts / 16;
    // Mug position: on the right end of the desk surface (col 13, row 5, top portion)
    var mugX = offX + 13.4 * ts;
    var mugY = offY + 5.1 * ts;

    // Draw the mug itself first (small)
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(mugX, mugY, Math.floor(2 * u), Math.floor(2 * u));
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(mugX, mugY, Math.floor(2 * u), Math.max(1, Math.floor(u * 0.6)));
    // Coffee surface (dark)
    ctx.fillStyle = '#1a0a06';
    ctx.fillRect(mugX + Math.max(1, Math.floor(u * 0.3)), mugY + Math.max(1, Math.floor(u * 0.3)), Math.floor(2 * u) - Math.max(1, Math.floor(u * 0.6)), Math.max(1, Math.floor(u * 0.5)));
    // Handle
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(mugX + Math.floor(2 * u), mugY + Math.floor(u * 0.5), Math.max(1, Math.floor(u * 0.5)), Math.max(1, u));

    // Steam particles
    for (var i = 0; i < steamParticles.length; i++) {
      var p = steamParticles[i];
      var a = (1 - p.life / p.maxLife) * 0.45;
      if (a <= 0) continue;
      ctx.fillStyle = 'rgba(220, 220, 240, ' + a.toFixed(2) + ')';
      ctx.fillRect(mugX + u + p.x, mugY - p.y * 0.4, Math.max(1, Math.floor(u * 0.6)), Math.max(1, Math.floor(u * 0.6)));
    }
  }

  // ============================================================
  //  OVERLAY (called by BridgeWorld between game markers and character)
  // ============================================================

  function quartersOverlay(ctx, world, offX, offY, ts, time) {
    drawViewportOverlay(ctx, world, offX, offY, ts, time);
    updateSteam(time);
    drawSteam(ctx, offX, offY, ts, time);
    updateDrone(time, world);
    drawDrone(ctx, offX, offY, ts, time);
  }

  // ============================================================
  //  WELCOME TOAST
  // ============================================================

  var toastShownThisLoad = false;
  function showWelcomeToast(isFirstTime, pilotName) {
    // Avoid stacking on rapid re-entry
    var existing = document.getElementById('quarters-toast');
    if (existing) existing.remove();

    var name = (pilotName || 'PILOT').toUpperCase();
    var msg = isFirstTime
      ? 'WELCOME HOME, ' + name
      : 'WELCOME BACK, ' + name;

    var toast = document.createElement('div');
    toast.id = 'quarters-toast';
    toast.textContent = msg;
    toast.style.cssText =
      'position:fixed;top:8%;left:50%;transform:translateX(-50%);' +
      'padding:14px 36px;background:rgba(10,18,28,0.92);' +
      'border:1px solid rgba(64,200,216,0.6);' +
      'color:#80e0e8;font-family:"Courier New",Consolas,monospace;' +
      'font-size:14px;letter-spacing:4px;text-align:center;z-index:9999;' +
      'pointer-events:none;opacity:0;transition:opacity 0.5s ease;' +
      'box-shadow:0 0 24px rgba(64,200,216,0.3),inset 0 0 12px rgba(64,200,216,0.08);';
    document.body.appendChild(toast);

    // Fade in
    setTimeout(function () { toast.style.opacity = '1'; }, 50);
    // Hold then fade out
    setTimeout(function () { toast.style.opacity = '0'; }, 3500);
    // Remove
    setTimeout(function () { if (toast && toast.parentNode) toast.remove(); }, 4200);
  }

  // ============================================================
  //  REGISTER
  // ============================================================

  BridgeWorld.registerTileset('quarters', {
    1: drawWall,
    2: drawFloor,
    3: drawFloorAlt,
    4: drawCyanStrip,
    5: drawViewport,
    6: drawBed,
    7: drawDesk,
    8: drawTrophyShelf,
    9: drawRug,
    10: drawCockpitDoor,
    11: drawCatalogTerminal,
    12: drawSlotPlant,
    13: drawSlotLamp,
    14: drawSlotPoster,
    15: drawSlotNebulaTank,
    17: drawChessTable,
    18: drawStorageLocker,
    19: drawSlotShelf
  });

  BridgeWorld.registerOverlay('quarters', quartersOverlay);

  // ---- State listener: welcome toast on quarters entry ----
  // Track lastWorldId so we fire on real world changes (e.g. bridge→quarters,
  // not on re-renders that re-dispatch transition('world') with same worldId).
  var lastWorldId = null;
  BridgeState.onChange(function (newState, prevState, context) {
    var newWorldId = (newState === 'world' && context) ? context.worldId : null;
    var prevWorldId = lastWorldId;
    lastWorldId = newWorldId !== null ? newWorldId : lastWorldId;
    if (newWorldId !== 'quarters') return;
    if (prevWorldId === 'quarters') return;

    var firstTime = !localStorage.getItem('bridge_quarters_welcomed');
    if (firstTime) localStorage.setItem('bridge_quarters_welcomed', '1');
    var pilot = BridgeState.getPilot();
    var name = pilot ? pilot.name : null;

    // Boost the drone's LED briefly to "wake up" when player arrives
    drone.ledBoost = 1;

    // Refresh earned trophies so shelves render with whatever the pilot has.
    if (typeof BridgeProgression !== 'undefined') {
      BridgeProgression.getAchievements().then(function (set) {
        earnedTrophies = set;
      });
    }

    // Face the player INTO the room on entry (so first sight is "look around"
    // not "look at the door I just came through"). Only override if they're
    // standing at the spawn — preserves last-known facing for restored sessions.
    // Defer to next tick so it runs AFTER BridgeWorld.show → Character.init.
    setTimeout(function () {
      if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.setFacing) return;
      var w = BridgeWorld.getWorld();
      var spawn = w && w.spawns && w.spawns.player;
      if (spawn && BridgeCharacter.getX() === spawn[0] && BridgeCharacter.getY() === spawn[1]) {
        BridgeCharacter.setFacing('up');
      }
    }, 0);

    // Refresh owned decor so the slots paint the actual items.
    refreshDecor();

    // Slight delay so the world fade-in completes first
    setTimeout(function () {
      showWelcomeToast(firstTime, name);
    }, 350);
  });

  // Public — Catalog calls refreshDecor() right after a purchase so the
  // newly owned item paints immediately on the slot.
  window.BridgeQuarters = { refreshDecor: refreshDecor };

})();
