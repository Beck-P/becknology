/**
 * The Bridge — your ship's command deck, with a holographic warp map.
 *
 * Walkable command-room replacement for the old first-person cockpit.
 * Players spawn here from the intro, walk to the central holo-pedestal,
 * press E to open the warp map (existing starmap UI), and jump to worlds.
 * A door at the south wall leads to Quarters.
 *
 * Major elements:
 *   - Polished metal floor + dark navy walls (cooler than Quarters' wood)
 *   - Big front-facing viewport across the top wall (animated stars +
 *     occasional planet/ship events) — this IS the ship's windshield
 *   - Central holographic star map: rotating sphere of star points with
 *     coloured planet markers (Arcadia/Lumar/Singularity/Enigma) and
 *     connection lines, projected from a glowing pedestal
 *   - Captain's chair behind the holo, facing forward
 *   - Side console banks (stub interactions for stats/comms/engineering/sensors)
 *   - Door south to Quarters
 *   - Welcome toast on entry
 *
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Palette (mirrors apps/bridge/CLAUDE.md "Bridge" section) ----
  var PAL = {
    wallDark:   '#0a1018',
    wallMid:    '#1a2028',
    wallHi:     '#2a3038',
    wallRim:    '#3a4048',
    floorDark:  '#1a2030',
    floorMid:   '#2a3040',
    floorHi:    '#3a4050',
    floorAlt:   '#252e40',
    floorGrain: '#0a0e18',
    cyanDark:   '#1a3038',
    cyan:       '#40c8d8',
    cyanHi:     '#80e0e8',
    cyanGlow:   '#c0f0f8',
    purple:     '#8060c0',
    purpleHi:   '#c0a0f0',
    holoCore:   '#1a2028',
    holoEmit:   '#80e0e8',
    brass:      '#a08040',
    brassHi:    '#e0c060',
    chairDeep:  '#0a0808',
    chairMid:   '#1a1410',
    chairHi:    '#2a1c14',
    chairTrim:  '#a08040',
    space:      '#050510'
  };

  // ============================================================
  //  TILE DRAWS
  // ============================================================

  // Polished metal floor — diamond plate hint, cyan-ish under-tint.
  function drawFloorBase(ctx, x, y, ts, time, col, row, alt) {
    var u = ts / 16;
    var seed = ((col * 13 + row * 7) | 0) % 100;

    ctx.fillStyle = alt ? PAL.floorAlt : PAL.floorDark;
    ctx.fillRect(x, y, ts, ts);

    // Mid-tone center band
    ctx.fillStyle = PAL.floorMid;
    ctx.fillRect(x + Math.floor(u), y + Math.floor(u), ts - 2 * u, ts - 2 * u);
    // Inner highlight (small)
    ctx.fillStyle = PAL.floorHi;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), Math.max(1, Math.floor(u * 0.5)), ts - 4 * u);

    // Tile seam — bevel between panels
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(x, y, ts, Math.max(1, Math.floor(u * 0.4)));
    ctx.fillRect(x, y, Math.max(1, Math.floor(u * 0.4)), ts);

    // Random rivet (corner)
    if (seed % 6 === 0) {
      ctx.fillStyle = PAL.wallRim;
      ctx.fillRect(x + Math.floor(13 * u), y + Math.floor(13 * u), Math.max(1, Math.floor(u * 0.7)), Math.max(1, Math.floor(u * 0.7)));
    }
  }

  function drawFloor(ctx, x, y, ts, time, col, row) {
    drawFloorBase(ctx, x, y, ts, time, col, row, false);
  }

  function drawFloorAlt(ctx, x, y, ts, time, col, row) {
    drawFloorBase(ctx, x, y, ts, time, col, row, true);
  }

  // Dark navy wall with subtle tech detail.
  function drawWall(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var seed = ((col * 17 + row * 11) | 0) % 100;

    ctx.fillStyle = PAL.wallMid;
    ctx.fillRect(x, y, ts, ts);

    // Top edge highlight
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x, y, ts, Math.max(1, Math.floor(u * 0.6)));
    // Bottom shadow
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x, y + ts - u, ts, u);

    // Vertical seam every few tiles
    if (col % 3 === 0) {
      ctx.fillStyle = PAL.wallDark;
      ctx.fillRect(x, y, Math.max(1, Math.floor(u * 0.5)), ts);
    }

    // Cyan accent line every several tiles
    if (col % 4 === 1 && row !== 0 && row !== 11) {
      ctx.fillStyle = 'rgba(64, 200, 216, 0.18)';
      ctx.fillRect(x, y + Math.floor(7 * u), Math.max(1, Math.floor(u * 0.5)), Math.floor(2 * u));
    }

    // Tiny rivets
    if (seed % 5 === 0) {
      ctx.fillStyle = PAL.wallRim;
      ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), u, u);
    }
  }

  // Cyan strip light (same logic as quarters, reused here visually).
  function drawCyanStrip(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    var pulse = 0.55 + Math.sin(time / 1100 + col * 0.4) * 0.15;
    ctx.fillStyle = 'rgba(64, 200, 216, ' + pulse.toFixed(2) + ')';
    ctx.fillRect(x, y + Math.floor(u * 0.5), ts, Math.max(1, Math.floor(u * 1.5)));
    ctx.fillStyle = 'rgba(160, 240, 248, ' + (pulse * 0.8).toFixed(2) + ')';
    ctx.fillRect(x, y + u, ts, Math.max(1, Math.floor(u * 0.5)));
  }

  // Viewport tile — solid space background; animated content lives in overlay.
  function drawViewport(ctx, x, y, ts, time, col, row) {
    ctx.fillStyle = PAL.space;
    ctx.fillRect(x, y, ts, ts);
    var u = ts / 16;
    if (row === 3) {
      ctx.fillStyle = PAL.wallRim;
      ctx.fillRect(x, y + ts - u, ts, u);
      ctx.fillStyle = 'rgba(64, 200, 216, 0.5)';
      ctx.fillRect(x, y + ts - Math.floor(u * 1.5), ts, Math.max(1, Math.floor(u * 0.5)));
    }
    if (row === 1) {
      ctx.fillStyle = PAL.wallDark;
      ctx.fillRect(x, y, ts, u);
    }
  }

  // ---- Holo pedestal (3-tile wide, single row at row 6 cols 8-10) ----
  // Each tile draws its portion of the cylindrical pedestal.
  function drawHoloPedestal(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var relCol = col - 8; // 0, 1, 2 (left, mid, right)

    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Pedestal body — dark metal cylinder from row middle to bottom
    var bodyTop = Math.floor(5 * u);
    var bodyBot = Math.floor(15 * u);

    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x, y + bodyTop, ts, bodyBot - bodyTop);
    // Mid highlight band
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x, y + bodyTop, ts, Math.max(1, Math.floor(u * 0.7)));
    // Lower shadow
    ctx.fillStyle = PAL.chairDeep;
    ctx.fillRect(x, y + bodyBot - Math.max(1, u), ts, Math.max(1, u));

    // Brass band around the upper rim
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x, y + bodyTop + Math.floor(u), ts, Math.max(1, Math.floor(u * 0.6)));
    ctx.fillStyle = PAL.brassHi;
    ctx.fillRect(x, y + bodyTop + Math.floor(u), ts, Math.max(1, Math.floor(u * 0.3)));

    // Emitter ring on top — only the middle tile renders the emitter circle
    if (relCol === 1) {
      var emitPulse = 0.7 + Math.sin(time / 400) * 0.3;
      // Emitter base ring
      ctx.fillStyle = PAL.holoCore;
      ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(3 * u), Math.floor(10 * u), Math.floor(2 * u));
      // Glow surface
      ctx.fillStyle = 'rgba(64, 200, 216, ' + emitPulse.toFixed(2) + ')';
      ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(3 * u), Math.floor(8 * u), Math.max(1, u));
      // Bright core
      ctx.fillStyle = 'rgba(192, 240, 248, ' + (emitPulse * 0.85).toFixed(2) + ')';
      ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(3 * u), Math.floor(6 * u), Math.max(1, Math.floor(u * 0.5)));
    } else {
      // Side tiles: small emitter shoulders
      var emitX = relCol === 0 ? Math.floor(13 * u) : 0;
      ctx.fillStyle = PAL.holoCore;
      ctx.fillRect(x + emitX, y + Math.floor(3 * u), Math.floor(3 * u), Math.floor(2 * u));
      ctx.fillStyle = 'rgba(64, 200, 216, 0.5)';
      ctx.fillRect(x + emitX, y + Math.floor(3 * u), Math.floor(3 * u), Math.max(1, u));
    }

    // Cable pattern on the body
    ctx.fillStyle = 'rgba(64, 200, 216, 0.35)';
    if (relCol === 0) {
      ctx.fillRect(x + Math.floor(11 * u), y + Math.floor(7 * u), Math.max(1, Math.floor(u * 0.5)), Math.floor(6 * u));
    } else if (relCol === 2) {
      ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(7 * u), Math.max(1, Math.floor(u * 0.5)), Math.floor(6 * u));
    }
  }

  // ---- Captain's chair (single tile at col 9 row 8, faces forward/up) ----
  function drawCaptainChair(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Tall back (top half) — viewed from behind, so it's a tall solid block
    ctx.fillStyle = PAL.chairMid;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(2 * u), Math.floor(10 * u), Math.floor(8 * u));
    ctx.fillStyle = PAL.chairHi;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(2 * u), Math.floor(10 * u), Math.max(1, u));

    // Chair top headrest curve hint
    ctx.fillStyle = PAL.chairDeep;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(2 * u), Math.max(1, u), Math.floor(8 * u));
    ctx.fillRect(x + Math.floor(12 * u), y + Math.floor(2 * u), Math.max(1, u), Math.floor(8 * u));

    // Brass trim accent (vertical center stripe, suggests captain's piping)
    ctx.fillStyle = PAL.chairTrim;
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(3 * u), Math.floor(2 * u), Math.floor(6 * u));
    ctx.fillStyle = PAL.brassHi;
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(3 * u), Math.max(1, Math.floor(u * 0.7)), Math.floor(6 * u));

    // Seat (lower portion — viewed top-down, looks like a darker rectangle)
    ctx.fillStyle = PAL.chairDeep;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(10 * u), Math.floor(12 * u), Math.floor(4 * u));
    // Seat cushion
    ctx.fillStyle = PAL.chairMid;
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(10 * u), Math.floor(10 * u), Math.floor(3 * u));

    // Armrests (small bumps either side)
    ctx.fillStyle = PAL.chairHi;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(11 * u), Math.floor(2 * u), Math.floor(3 * u));
    ctx.fillRect(x + Math.floor(12 * u), y + Math.floor(11 * u), Math.floor(2 * u), Math.floor(3 * u));

    // Base shadow under chair
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(14 * u), Math.floor(12 * u), Math.max(1, Math.floor(u * 0.7)));
  }

  // ---- Wall-mounted console (wall stations along sides) ----
  function drawConsole(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var seed = ((col * 19 + row * 31) | 0) % 100;
    drawFloorBase(ctx, x, y, ts, time, col, row, false);

    // Console body — dark metal box mounted floor-to-ceiling-ish
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x + Math.floor(u), y + Math.floor(2 * u), ts - 2 * u, ts - 4 * u);
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x + Math.floor(u), y + Math.floor(2 * u), ts - 2 * u, Math.max(1, Math.floor(u * 0.5)));

    // Display screen (cyan surface, scanline)
    ctx.fillStyle = PAL.holoCore;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(4 * u), ts - 4 * u, Math.floor(6 * u));
    var screenAlpha = 0.6 + Math.sin(time / 700 + seed) * 0.15;
    ctx.fillStyle = 'rgba(64, 200, 216, ' + screenAlpha.toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(5 * u), ts - 6 * u, Math.floor(4 * u));
    // Static "data" lines on screen
    ctx.fillStyle = 'rgba(20, 40, 50, 0.7)';
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(6 * u), Math.floor(4 * u), Math.max(1, Math.floor(u * 0.5)));
    ctx.fillRect(x + Math.floor(4 * u), y + Math.floor(7 * u), Math.floor(5 * u), Math.max(1, Math.floor(u * 0.5)));

    // LED indicators (different color per console)
    var ledOn = Math.sin(time / 600 + col * 1.5 + row) > 0 ? 1 : 0.3;
    var ledColors = [
      'rgba(64, 200, 216, ',  // cyan
      'rgba(255, 224, 128, ', // yellow
      'rgba(232, 64, 64, '    // red
    ];
    var col0 = ledColors[seed % 3];
    var col1 = ledColors[(seed + 1) % 3];
    ctx.fillStyle = col0 + ledOn.toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(3 * u), y + Math.floor(11 * u), u, u);
    ctx.fillStyle = col1 + ((1 - ledOn) + 0.3).toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(5 * u), y + Math.floor(11 * u), u, u);
    ctx.fillStyle = col0 + (ledOn * 0.7 + 0.2).toFixed(2) + ')';
    ctx.fillRect(x + Math.floor(7 * u), y + Math.floor(11 * u), u, u);

    // Lower control surface — a few buttons
    ctx.fillStyle = PAL.wallRim;
    ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(13 * u), ts - 4 * u, Math.max(1, u));

    // Brass top trim
    ctx.fillStyle = PAL.brass;
    ctx.fillRect(x + Math.floor(u), y + Math.floor(2 * u), ts - 2 * u, Math.max(1, Math.floor(u * 0.4)));
  }

  // ---- Door to quarters (south wall) ----
  function drawQuartersDoor(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;

    ctx.fillStyle = PAL.wallMid;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = PAL.wallHi;
    ctx.fillRect(x, y, ts, Math.max(1, Math.floor(u * 0.6)));

    // Door panel
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(x, y + Math.floor(2 * u), ts, ts - 4 * u);

    // Door surface — slightly lighter
    if (col === 8) {
      ctx.fillStyle = PAL.wallHi;
      ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(3 * u), ts - 2 * u, ts - 6 * u);
    } else {
      ctx.fillStyle = PAL.wallHi;
      ctx.fillRect(x, y + Math.floor(3 * u), ts - 2 * u, ts - 6 * u);
    }

    // Center cyan seam (between the two door tiles)
    var seamPulse = 0.6 + Math.sin(time / 700) * 0.3;
    ctx.fillStyle = 'rgba(64, 200, 216, ' + seamPulse.toFixed(2) + ')';
    if (col === 8) {
      ctx.fillRect(x + ts - Math.max(1, u), y + Math.floor(3 * u), Math.max(1, u), ts - 6 * u);
    } else {
      ctx.fillRect(x, y + Math.floor(3 * u), Math.max(1, u), ts - 6 * u);
    }

    // Top frame brass
    ctx.fillStyle = PAL.brass;
    if (col === 8) {
      ctx.fillRect(x + Math.floor(2 * u), y + Math.floor(2 * u), ts - 2 * u, Math.max(1, Math.floor(u * 0.5)));
    } else {
      ctx.fillRect(x, y + Math.floor(2 * u), ts - 2 * u, Math.max(1, Math.floor(u * 0.5)));
    }

    // Blinking LED above (only on left door tile, centered on the pair)
    if (col === 8) {
      var ledOn = (Math.floor(time / 600) % 2) === 0;
      ctx.fillStyle = ledOn ? 'rgba(120, 240, 140, 1)' : 'rgba(40, 100, 60, 0.5)';
      ctx.fillRect(x + ts - Math.floor(u * 1.5), y + Math.floor(0.5 * u), Math.floor(2 * u), u);
      if (ledOn) {
        var grad = ctx.createRadialGradient(
          x + ts - Math.floor(u * 0.5), y + u, 0,
          x + ts - Math.floor(u * 0.5), y + u, 4 * u
        );
        grad.addColorStop(0, 'rgba(120, 240, 140, 0.4)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(x + ts - 5 * u, y - 3 * u, 8 * u, 8 * u);
      }
    }

    // Floor seam
    ctx.fillStyle = PAL.floorGrain;
    ctx.fillRect(x, y + ts - Math.max(1, u), ts, Math.max(1, u));
  }

  // ============================================================
  //  VIEWPORT OVERLAY (animated stars + planet/ship events)
  // ============================================================

  var VP_COL_MIN = 1;
  var VP_COL_MAX = 17;
  var VP_ROW_MIN = 1;
  var VP_ROW_MAX = 4;

  var vpStars = null;
  function initViewportStars() {
    vpStars = [];
    var layers = [
      { count: 22, speed: 0.014, size: 1, brightness: 0.5 },
      { count: 16, speed: 0.022, size: 1.2, brightness: 0.78 },
      { count: 10, speed: 0.038, size: 1.8, brightness: 1.0 }
    ];
    for (var l = 0; l < layers.length; l++) {
      var lay = layers[l];
      for (var i = 0; i < lay.count; i++) {
        vpStars.push({
          x: Math.random(),
          y: Math.random(),
          spd: lay.speed,
          sz: lay.size,
          br: lay.brightness * (0.7 + Math.random() * 0.3),
          twPhase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  var vpPlanet = null;
  var vpNextPlanetAt = 0;
  function maybeSpawnPlanet(now) {
    if (vpPlanet && vpPlanet.active) return;
    if (now < vpNextPlanetAt) return;
    var palettes = [
      { primary: '#5a3a78', secondary: '#3a2050', ring: false },
      { primary: '#3a8060', secondary: '#205040', ring: false },
      { primary: '#a05030', secondary: '#704020', ring: false },
      { primary: '#4060a0', secondary: '#2a3870', ring: true },
      { primary: '#a09030', secondary: '#705a18', ring: true }
    ];
    var p = palettes[Math.floor(Math.random() * palettes.length)];
    vpPlanet = {
      active: true, x: -0.15, y: 0.2 + Math.random() * 0.55,
      r: 0.05 + Math.random() * 0.05,
      color: p.primary, secondary: p.secondary,
      ringed: p.ring, ringTilt: Math.random() * 0.5 + 0.3,
      spd: 0.00010 + Math.random() * 0.00010
    };
  }

  var vpShip = null;
  var vpNextShipAt = 0;
  function maybeSpawnShip(now) {
    if (vpShip && vpShip.active) return;
    if (now < vpNextShipAt) return;
    var dirRight = Math.random() > 0.5;
    vpShip = {
      active: true, x: dirRight ? -0.1 : 1.1,
      y: 0.2 + Math.random() * 0.6,
      spd: (dirRight ? 1 : -1) * (0.0008 + Math.random() * 0.0006),
      trail: []
    };
  }

  function drawPlanet(ctx, vpX, vpY, vpW, vpH, p, time) {
    var cx = vpX + p.x * vpW;
    var cy = vpY + p.y * vpH;
    var r = p.r * vpH;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(cx, cy - r, r * 1.2, r * 2);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(cx - r, cy - r * 0.2, r * 2, r * 0.15);
    ctx.fillRect(cx - r, cy + r * 0.35, r * 2, r * 0.18);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.3, r, 0, Math.PI * 2);
    ctx.stroke();
    if (p.ringed) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.4);
      ctx.strokeStyle = 'rgba(220, 200, 180, 0.55)';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.7, r * p.ringTilt, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.7, r * p.ringTilt, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawShipStreak(ctx, vpX, vpY, vpW, vpH, ship) {
    var sx = vpX + ship.x * vpW;
    var sy = vpY + ship.y * vpH;
    if (ship.trail.length > 1) {
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      for (var i = 1; i < ship.trail.length; i++) {
        var t = ship.trail[i];
        ctx.lineTo(vpX + t.x * vpW, vpY + t.y * vpH);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#c0d0e0';
    ctx.fillRect(Math.floor(sx) - 2, Math.floor(sy) - 1, 4, 2);
    var dir = ship.spd > 0 ? -3 : 3;
    ctx.fillStyle = 'rgba(120, 200, 255, 0.9)';
    ctx.fillRect(Math.floor(sx) + dir, Math.floor(sy), 2, 1);
  }

  function drawViewportOverlay(ctx, world, offX, offY, ts, time) {
    if (!vpStars) initViewportStars();

    var vpX = Math.floor(offX + VP_COL_MIN * ts);
    var vpY = Math.floor(offY + VP_ROW_MIN * ts);
    var vpW = Math.ceil((VP_COL_MAX - VP_COL_MIN) * ts);
    var vpH = Math.ceil((VP_ROW_MAX - VP_ROW_MIN) * ts);

    ctx.save();
    ctx.beginPath();
    ctx.rect(vpX, vpY, vpW, vpH);
    ctx.clip();

    // Slight blue-purple atmosphere
    var bgGrad = ctx.createLinearGradient(0, vpY, 0, vpY + vpH);
    bgGrad.addColorStop(0, 'rgba(20, 18, 50, 0.55)');
    bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(vpX, vpY, vpW, vpH);

    // Stars
    for (var i = 0; i < vpStars.length; i++) {
      var s = vpStars[i];
      s.x -= s.spd * 0.016;
      if (s.x < -0.02) {
        s.x = 1.05;
        s.y = Math.random();
        s.br = 0.4 + Math.random() * 0.6;
      }
      var sx = vpX + s.x * vpW;
      var sy = vpY + s.y * vpH;
      var twinkle = 0.6 + Math.sin(time / 350 + s.twPhase) * 0.4;
      var alpha = Math.min(1, s.br * twinkle);
      ctx.fillStyle = 'rgba(220, 230, 255, ' + alpha.toFixed(2) + ')';
      ctx.fillRect(sx, sy, s.sz, s.sz);
    }

    maybeSpawnPlanet(time);
    if (vpPlanet && vpPlanet.active) {
      vpPlanet.x += vpPlanet.spd * 16;
      drawPlanet(ctx, vpX, vpY, vpW, vpH, vpPlanet, time);
      if (vpPlanet.x > 1.2) {
        vpPlanet.active = false;
        vpNextPlanetAt = time + 25000 + Math.random() * 35000;
      }
    } else if (vpNextPlanetAt === 0) {
      vpNextPlanetAt = time + 5000 + Math.random() * 6000;
    }

    maybeSpawnShip(time);
    if (vpShip && vpShip.active) {
      vpShip.x += vpShip.spd * 16;
      vpShip.trail.unshift({ x: vpShip.x, y: vpShip.y });
      if (vpShip.trail.length > 12) vpShip.trail.pop();
      drawShipStreak(ctx, vpX, vpY, vpW, vpH, vpShip);
      if (vpShip.x < -0.15 || vpShip.x > 1.15) {
        vpShip.active = false;
        vpShip.trail = [];
        vpNextShipAt = time + 60000 + Math.random() * 50000;
      }
    } else if (vpNextShipAt === 0) {
      vpNextShipAt = time + 18000 + Math.random() * 18000;
    }

    ctx.restore();
  }

  // ============================================================
  //  HOLOGRAPHIC STAR MAP PROJECTION
  //  Drawn in overlay, anchored above the pedestal at (8-10, 6).
  // ============================================================

  // 3D points on a sphere — the ambient star field of the projection.
  var holoStars = null;
  function initHoloStars() {
    holoStars = [];
    for (var i = 0; i < 38; i++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = 0.55 + Math.random() * 0.45;
      holoStars.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        twPhase: Math.random() * Math.PI * 2
      });
    }
  }

  // Fixed planet markers — the discoverable worlds, in their hologram positions.
  var holoPlanets = [
    { name: 'ARCADIA',     x:  0.55, y: -0.20, z: -0.30, color: [232, 112, 192] },
    { name: 'LUMAR',       x: -0.45, y:  0.30, z:  0.35, color: [255, 224, 128] },
    { name: 'SINGULARITY', x:  0.20, y:  0.45, z:  0.50, color: [192, 144, 232] },
    { name: 'ENIGMA',      x: -0.30, y: -0.40, z: -0.45, color: [128, 224, 232] }
  ];

  // Player-proximity boost (0..1) — how close the player is to the pedestal.
  // Drives the "wakes up" effect when you walk over.
  function getProxBoost() {
    if (typeof BridgeCharacter === 'undefined') return 0;
    var px = BridgeCharacter.getX();
    var py = BridgeCharacter.getY();
    // Pedestal center is approx (9, 6.5)
    var dx = px - 9;
    var dy = py - 6.5;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > 4) return 0;
    return Math.max(0, 1 - d / 4);
  }

  function drawHologram(ctx, offX, offY, ts, time) {
    if (!holoStars) initHoloStars();

    // Hologram center in screen coords — floats just above the pedestal.
    // Pedestal is at cols 8-10 row 6 with the emitter at the top of those tiles.
    // Centering at row 4.8 keeps the projection visually anchored to the
    // emitter without bleeding into the viewport.
    var cx = offX + 9.5 * ts;
    var cy = offY + 4.8 * ts;
    var radiusPx = 1.7 * ts;     // visual sphere radius
    var rotY = time / 3500;      // spin slowly

    var prox = getProxBoost();
    var pulse = 0.65 + Math.sin(time / 500) * 0.18 + prox * 0.18;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Rising column from pedestal — narrow cyan beam connecting the
    // emitter (row ~6.2) to the hologram base.
    var colTop = cy + radiusPx * 0.55;
    var colBot = offY + 6.2 * ts;
    if (colBot > colTop) {
      var colGrad = ctx.createLinearGradient(cx, colTop, cx, colBot);
      colGrad.addColorStop(0, 'rgba(64, 200, 216, 0)');
      colGrad.addColorStop(1, 'rgba(64, 200, 216, ' + (0.36 + prox * 0.30).toFixed(2) + ')');
      ctx.fillStyle = colGrad;
      ctx.fillRect(cx - 0.6 * ts, colTop, 1.2 * ts, colBot - colTop);
    }

    // Outer halo
    var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx * 1.6);
    halo.addColorStop(0, 'rgba(64, 200, 216, ' + (0.18 * pulse).toFixed(2) + ')');
    halo.addColorStop(0.4, 'rgba(96, 96, 192, ' + (0.10 * pulse).toFixed(2) + ')');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - radiusPx * 1.6, cy - radiusPx * 1.6, radiusPx * 3.2, radiusPx * 3.2);

    // Equatorial grid plane — thin ellipses suggesting a horizontal projection plane
    var planeAlpha = (0.18 + prox * 0.18) * pulse;
    ctx.strokeStyle = 'rgba(128, 224, 232, ' + planeAlpha.toFixed(2) + ')';
    ctx.lineWidth = 1;
    for (var ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusPx * (ring / 3) * 0.95, radiusPx * (ring / 3) * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rotated sphere outline (a few tilted rings to suggest a 3D field)
    for (var ax = 0; ax < 3; ax++) {
      var theta = rotY + ax * (Math.PI / 3);
      ctx.strokeStyle = 'rgba(96, 192, 232, ' + (0.10 * pulse).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusPx * 0.95, radiusPx * 0.95 * Math.abs(Math.sin(theta)), theta * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ambient star points (rotated, projected, depth-shaded)
    var cosY = Math.cos(rotY);
    var sinY = Math.sin(rotY);
    var ambSorted = [];
    for (var i = 0; i < holoStars.length; i++) {
      var s = holoStars[i];
      var rx = s.x * cosY - s.z * sinY;
      var rz = s.x * sinY + s.z * cosY;
      var ry = s.y;
      // Simple perspective: nearer points appear larger
      var depth = 0.5 + rz * 0.5;     // 0 (back) .. 1 (front)
      var px = cx + rx * radiusPx;
      var py = cy + ry * radiusPx * 0.55; // squashed vertically
      ambSorted.push({ px: px, py: py, depth: depth, twPhase: s.twPhase });
    }
    // Draw back-to-front so closer stars are on top
    ambSorted.sort(function (a, b) { return a.depth - b.depth; });
    for (var j = 0; j < ambSorted.length; j++) {
      var p = ambSorted[j];
      var twinkle = 0.6 + Math.sin(time / 400 + p.twPhase) * 0.4;
      var a = (0.35 + p.depth * 0.55) * twinkle * pulse;
      var sz = 1 + p.depth * 1.5;
      ctx.fillStyle = 'rgba(160, 240, 248, ' + a.toFixed(2) + ')';
      ctx.fillRect(p.px - sz / 2, p.py - sz / 2, sz, sz);
    }

    // Connection lines between planet markers (faint, rotating with the projection)
    var planetProj = [];
    for (var k = 0; k < holoPlanets.length; k++) {
      var pl = holoPlanets[k];
      var px2 = pl.x * cosY - pl.z * sinY;
      var pz2 = pl.x * sinY + pl.z * cosY;
      var depth2 = 0.5 + pz2 * 0.5;
      planetProj.push({
        sx: cx + px2 * radiusPx,
        sy: cy + pl.y * radiusPx * 0.55,
        depth: depth2,
        color: pl.color,
        name: pl.name
      });
    }
    ctx.strokeStyle = 'rgba(96, 192, 232, ' + (0.18 * pulse).toFixed(2) + ')';
    ctx.lineWidth = 1;
    for (var a1 = 0; a1 < planetProj.length; a1++) {
      for (var b1 = a1 + 1; b1 < planetProj.length; b1++) {
        ctx.beginPath();
        ctx.moveTo(planetProj[a1].sx, planetProj[a1].sy);
        ctx.lineTo(planetProj[b1].sx, planetProj[b1].sy);
        ctx.stroke();
      }
    }

    // Planet markers — sorted back-to-front, bigger + brighter than ambient
    planetProj.sort(function (a, b) { return a.depth - b.depth; });
    for (var p1 = 0; p1 < planetProj.length; p1++) {
      var pp = planetProj[p1];
      var pa = (0.7 + pp.depth * 0.3) * pulse;
      var pr = 3 + pp.depth * 4;
      // Outer halo
      var pgrad = ctx.createRadialGradient(pp.sx, pp.sy, 0, pp.sx, pp.sy, pr * 5);
      pgrad.addColorStop(0, 'rgba(' + pp.color[0] + ',' + pp.color[1] + ',' + pp.color[2] + ',' + (pa * 0.7).toFixed(2) + ')');
      pgrad.addColorStop(1, 'transparent');
      ctx.fillStyle = pgrad;
      ctx.fillRect(pp.sx - pr * 5, pp.sy - pr * 5, pr * 10, pr * 10);
      // Solid core
      ctx.fillStyle = 'rgba(' + pp.color[0] + ',' + pp.color[1] + ',' + pp.color[2] + ',' + pa.toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(pp.sx, pp.sy, pr, 0, Math.PI * 2);
      ctx.fill();
      // Bright pixel at center
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (pa * 0.9).toFixed(2) + ')';
      ctx.fillRect(pp.sx - 1, pp.sy - 1, 2, 2);
    }

    // Scan line sweeping vertically across the hologram
    var scanY = cy - radiusPx * 0.95 + ((time / 30) % (radiusPx * 1.9));
    ctx.fillStyle = 'rgba(192, 240, 248, ' + (0.12 * pulse).toFixed(2) + ')';
    ctx.fillRect(cx - radiusPx, scanY, radiusPx * 2, Math.max(1, ts * 0.05));

    ctx.restore();
  }

  // ============================================================
  //  OVERLAY (called by BridgeWorld between glow and character)
  // ============================================================

  function bridgeOverlay(ctx, world, offX, offY, ts, time) {
    drawViewportOverlay(ctx, world, offX, offY, ts, time);
    drawHologram(ctx, offX, offY, ts, time);
  }

  // ============================================================
  //  WELCOME TOAST
  // ============================================================

  function showWelcomeToast(isFirstTime, pilotName) {
    var existing = document.getElementById('quarters-toast');
    if (existing) existing.remove();
    var existing2 = document.getElementById('bridge-toast');
    if (existing2) existing2.remove();

    var name = (pilotName || 'PILOT').toUpperCase();
    var msg = isFirstTime
      ? 'WELCOME TO THE BRIDGE, ' + name
      : 'CAPTAIN ON DECK, ' + name;

    var toast = document.createElement('div');
    toast.id = 'bridge-toast';
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

    setTimeout(function () { toast.style.opacity = '1'; }, 50);
    setTimeout(function () { toast.style.opacity = '0'; }, 3500);
    setTimeout(function () { if (toast && toast.parentNode) toast.remove(); }, 4200);
  }

  // ============================================================
  //  REGISTER
  // ============================================================

  BridgeWorld.registerTileset('bridge', {
    1: drawWall,
    2: drawFloor,
    3: drawFloorAlt,
    4: drawCyanStrip,
    5: drawViewport,
    6: drawHoloPedestal,
    7: drawCaptainChair,
    8: drawConsole,
    10: drawQuartersDoor
  });

  BridgeWorld.registerOverlay('bridge', bridgeOverlay);

  // ---- Welcome listener ----
  // Track which world we were last in so we only fire on actual world changes,
  // not on re-renders that re-fire transition('world') with the same worldId.
  var lastWorldId = null;
  BridgeState.onChange(function (newState, prevState, context) {
    var newWorldId = (newState === 'world' && context) ? context.worldId : null;
    var prevWorldId = lastWorldId;
    lastWorldId = newWorldId !== null ? newWorldId : lastWorldId;
    if (newWorldId !== 'bridge') return;
    if (prevWorldId === 'bridge') return;

    var firstTime = !localStorage.getItem('bridge_command_visited');
    if (firstTime) localStorage.setItem('bridge_command_visited', '1');
    var pilot = BridgeState.getPilot();
    var name = pilot ? pilot.name : null;

    // Face the player INTO the room on entry (not at the door behind them).
    setTimeout(function () {
      if (typeof BridgeCharacter === 'undefined' || !BridgeCharacter.setFacing) return;
      var w = BridgeWorld.getWorld();
      var spawn = w && w.spawns && w.spawns.player;
      if (spawn && BridgeCharacter.getX() === spawn[0] && BridgeCharacter.getY() === spawn[1]) {
        BridgeCharacter.setFacing('up');
      }
    }, 0);

    setTimeout(function () {
      showWelcomeToast(firstTime, name);
    }, 350);
  });

})();
