/**
 * Lumar World Module — Mysterious emerald spore sea.
 *
 * Inspired by Brandon Sanderson's Tress of the Emerald Sea.
 * Saltstone island with wooden docks extending into a shimmering
 * emerald spore sea. Moonlit atmosphere, silver accents.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Tile Draw Functions ----

  // Saltstone wall — strict pixel art. Dark stone block with 1u top cap and
  // 1u brick-course mortar lines. Whole-u rects only.
  function drawSaltstoneWall(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 19 + row * 31) % 100;
    var DARK = '#0a0c0d';
    var STONE_DK = '#1a1e20';
    var STONE_MD = '#252a28';
    var STONE_HI = '#3a4848';
    // Dark cap row (top 4u)
    ctx.fillStyle = '#0e1212';
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = STONE_HI;
    ctx.fillRect(x, y, ts, u);            // 1u top highlight
    // Front face (rows 4-15)
    ctx.fillStyle = STONE_DK;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    // Brick courses — 4u tall, mortar joints at rows 4, 8, 12 (1u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 8*u, ts, u);
    ctx.fillRect(x, y + 12*u, ts, u);
    // Vertical brick joints (alternating per row)
    var off1 = (row % 2 === 0) ? 8 : 4;
    var off2 = (row % 2 === 0) ? 4 : 12;
    var off3 = (row % 2 === 0) ? 12 : 8;
    ctx.fillRect(x + off1*u, y + 5*u, u, 3*u);
    ctx.fillRect(x + off2*u, y + 9*u, u, 3*u);
    ctx.fillRect(x + off3*u, y + 13*u, u, 3*u);
    // Salt-crystal sparkle — 1u squares at deterministic positions, animated
    var sparkle = (Math.sin(time / 1500 + col + row * 0.5) + 1) * 0.5;
    ctx.globalAlpha = 0.25 + sparkle * 0.3;
    ctx.fillStyle = '#b0c0c0';
    if (seed < 60) ctx.fillRect(x + 3*u, y + 6*u, u, u);
    if (seed > 30) ctx.fillRect(x + 10*u, y + 10*u, u, u);
    if (seed % 17 === 0) ctx.fillRect(x + 5*u, y + 14*u, u, u);
    if (seed % 11 === 0) ctx.fillRect(x + 12*u, y + 14*u, u, u);
    ctx.globalAlpha = 1;
    // Silver trim band (1u just below the cap)
    ctx.fillStyle = '#80908c';
    ctx.fillRect(x, y + 4*u, ts, u);
  }

  // Black cliff — dark basalt face, impassable. Layered jagged silhouettes
  // suggest a vertical rockface even though we're top-down. Deterministic
  // 1u speckles + a few catch-light sparkles so the cliff doesn't read flat.
  function drawBlackCliff(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 41) % 100;
    var DEEP = '#06080c';
    var STONE = '#0e1218';
    var STONE_HI = '#1a2030';
    var FISSURE = '#020308';
    var SPARK = '#3a4858';
    // Base slab — almost black
    ctx.fillStyle = DEEP;
    ctx.fillRect(x, y, ts, ts);
    // Lighter top edge (catches moonlight)
    ctx.fillStyle = STONE;
    ctx.fillRect(x, y, ts, 5*u);
    // 1u top highlight ridge
    ctx.fillStyle = STONE_HI;
    ctx.fillRect(x, y, ts, u);
    // Jagged silhouette break — 2u stepped notch in the top edge per seed
    if (seed < 30) {
      ctx.fillStyle = DEEP;
      ctx.fillRect(x + 3*u, y, 4*u, 2*u);
    } else if (seed < 55) {
      ctx.fillStyle = DEEP;
      ctx.fillRect(x + 9*u, y, 3*u, 2*u);
    }
    // Vertical fissures — 1u dark cracks running down
    ctx.fillStyle = FISSURE;
    var off1 = (row % 2 === 0) ? 5 : 9;
    var off2 = (row % 2 === 0) ? 12 : 2;
    ctx.fillRect(x + off1*u, y + 5*u, u, 11*u);
    ctx.fillRect(x + off2*u, y + 7*u, u, 9*u);
    // 1u rough chunks (deterministic pebble pattern)
    ctx.fillStyle = STONE;
    if (seed > 20) ctx.fillRect(x + 2*u, y + 9*u, 2*u, u);
    if (seed > 45) ctx.fillRect(x + 7*u, y + 12*u, 2*u, u);
    if (seed > 65) ctx.fillRect(x + 11*u, y + 6*u, 2*u, u);
    if (seed > 80) ctx.fillRect(x + 4*u, y + 14*u, u, u);
    // Catch-light sparkles — animated faintly like wet stone reflecting moonlight
    var sparkle = (Math.sin(time / 1600 + col * 1.3 + row * 0.7) + 1) * 0.5;
    ctx.globalAlpha = 0.15 + sparkle * 0.18;
    ctx.fillStyle = SPARK;
    if (seed % 7 === 0) ctx.fillRect(x + 8*u, y + 3*u, u, u);
    if (seed % 11 === 0) ctx.fillRect(x + 13*u, y + 11*u, u, u);
    ctx.globalAlpha = 1;
  }

  // Stone steps / trail tile — walkable cobblestone path with a slight
  // worn look. Used for the cliff trail in the harbor.
  function drawCliffTrail(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 19 + row * 31) % 100;
    var STONE = '#3a3640';
    var STONE_LT = '#4a4852';
    var STONE_DK = '#2a2630';
    var MOSS = '#2a4830';
    var GRIT = '#1a1820';
    // Base stone
    ctx.fillStyle = STONE;
    ctx.fillRect(x, y, ts, ts);
    // Stepped paver pattern — irregular slabs
    ctx.fillStyle = STONE_LT;
    if (row % 2 === 0) {
      ctx.fillRect(x, y, 8*u, 7*u);
      ctx.fillRect(x + 8*u, y + 7*u, 8*u, 9*u);
    } else {
      ctx.fillRect(x + 8*u, y, 8*u, 7*u);
      ctx.fillRect(x, y + 7*u, 8*u, 9*u);
    }
    // Dark mortar lines between slabs (1u grout)
    ctx.fillStyle = STONE_DK;
    ctx.fillRect(x + 7*u, y, u, ts);
    ctx.fillRect(x, y + 6*u, ts, u);
    // Edge wear — 1u dark on the cliff side
    ctx.fillStyle = STONE_DK;
    ctx.fillRect(x, y + ts - u, ts, u);
    // Moss tuft on a corner (occasional)
    if (seed < 18) {
      ctx.fillStyle = MOSS;
      ctx.fillRect(x + 2*u, y + 2*u, u, 2*u);
      ctx.fillRect(x + u, y + 3*u, u, u);
    } else if (seed > 70 && seed < 88) {
      ctx.fillStyle = MOSS;
      ctx.fillRect(x + 11*u, y + 12*u, 2*u, u);
    }
    // 1u grit speckles
    ctx.fillStyle = GRIT;
    if (seed % 13 === 0) ctx.fillRect(x + 4*u, y + 10*u, u, u);
    if (seed % 17 === 0) ctx.fillRect(x + 12*u, y + 4*u, u, u);
  }

  // Saltstone floor — strict pixel art. Flat slab with hard 1u highlight,
  // 1u shadow grouting, and small variation per tile via seed.
  function drawSaltstoneFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    var BASE = '#252a28';
    var DARK = '#161a18';
    var HI = '#3a4240';
    // Base slab
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // Slab seams — 1u dark grooves, brick-style offset every 8u
    var seamOff = (row % 2 === 0) ? 0 : 8;
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 8*u, ts, u);                  // horizontal seam
    ctx.fillRect(x + seamOff*u, y, u, 8*u);           // top vertical seam
    ctx.fillRect(x + ((seamOff + 8) % 16)*u, y + 9*u, u, 7*u); // bottom vertical seam
    // 1u top highlight on each slab
    ctx.fillStyle = HI;
    ctx.fillRect(x, y, ts, u);
    ctx.fillRect(x, y + 9*u, ts, u);
    // Salt-crystal speckle — deterministic 1u squares
    ctx.fillStyle = '#5a6262';
    if (seed < 30) ctx.fillRect(x + 3*u, y + 4*u, u, u);
    if (seed > 70) ctx.fillRect(x + 11*u, y + 12*u, u, u);
    if (seed % 7 === 0) ctx.fillRect(x + 5*u, y + 11*u, u, u);
    if (seed % 13 === 0) ctx.fillRect(x + 12*u, y + 4*u, u, u);
    // Rare 1u moss square
    if (seed % 19 === 0) {
      ctx.fillStyle = '#3a6038';
      ctx.fillRect(x + 13*u, y + 14*u, u, u);
    }
  }

  // Dock planks — strict 16-px-per-tile pixel art. 4 horizontal planks per
  // tile, hard 1u dark seams + 1u top highlight per plank. Whole-u only.
  function drawDockPlanks(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = col * 13 + row * 17;
    var darkBase = (col + row) % 2 === 0 ? '#3a3020' : '#352a1c';
    var seam = '#181208';
    var hi = '#4a3a28';
    var grain = '#2a2014';
    // Base
    ctx.fillStyle = darkBase;
    ctx.fillRect(x, y, ts, ts);
    // 4 planks, each 4u tall: 0-3, 4-7, 8-11, 12-15
    for (var p = 0; p < 4; p++) {
      var py = y + p * 4 * u;
      ctx.fillStyle = hi;
      ctx.fillRect(x, py, ts, u);              // top highlight 1u
      ctx.fillStyle = seam;
      ctx.fillRect(x, py + 3*u, ts, u);        // bottom seam 1u
      // Optional grain dash on the plank (1u tall)
      if ((seed + p) % 3 === 0) {
        ctx.fillStyle = grain;
        var gx = x + ((seed * (p + 1)) % 8) * u;
        ctx.fillRect(gx, py + u, 4*u, u);
      }
    }
    // Iron nails — 1u square at fixed positions
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(x + u, y + 2*u, u, u);
    ctx.fillRect(x + ts - 2*u, y + 6*u, u, u);
    ctx.fillRect(x + u, y + 10*u, u, u);
    ctx.fillRect(x + ts - 2*u, y + 14*u, u, u);
  }

  // Shared sea drawer — handles all 5 sea variants via color triplets.
  function drawSeaShared(ctx, x, y, ts, time, col, row, baseColor, midColor, hiColor, particleColor) {
    var u = ts / 16;
    // Base
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, ts, ts);
    // Smooth wave bands — render multiple thin horizontal lines with sin-shifted brightness.
    // The sine uses world-space position so adjacent tiles blend (no block boundaries).
    var bands = 8;
    for (var b = 0; b < bands; b++) {
      var bandPhase = (time / 600) + (row + b * 0.125) * 1.6 + col * 0.3;
      var bandAlpha = (Math.sin(bandPhase) * 0.5 + 0.5);
      ctx.globalAlpha = bandAlpha * 0.32;
      ctx.fillStyle = midColor;
      ctx.fillRect(x, y + b * 2*u, ts, 2*u);
    }
    ctx.globalAlpha = 1;
    // Foam crests — sparse highlights riding the waves
    for (var c = 0; c < 3; c++) {
      var cPhase = (time / 800) + col * 1.5 + row * 0.9 + c * 2;
      var cBright = Math.sin(cPhase);
      if (cBright > 0.5) {
        ctx.globalAlpha = (cBright - 0.5) * 1.4 * 0.4;
        ctx.fillStyle = hiColor;
        var cy = y + ((c * 5 + Math.floor((time / 200) % 10)) % 16) * u;
        ctx.fillRect(x + (c * 3 + 1) * u, cy, 4*u, Math.max(1, u * 0.6));
      }
    }
    ctx.globalAlpha = 1;
    // Drifting particles — accumulate position so they actually flow across tiles.
    var seed = col * 17 + row * 31;
    var nParticles = 3;
    for (var p = 0; p < nParticles; p++) {
      var pPhase = time / 4000 + p * 0.3;
      var px = ((seed * (p + 1) * 7 + Math.floor(pPhase * 14)) % 14) + 1;
      var py = (((seed * (p + 2) * 11) % 14) + Math.floor(time / 600 + p * 3)) % 14;
      var pAlpha = 0.5 + Math.sin(time / 500 + seed * 0.1 + p) * 0.4;
      ctx.globalAlpha = Math.max(0.1, pAlpha);
      ctx.fillStyle = particleColor;
      ctx.fillRect(x + px*u, y + py*u, u, u);
    }
    ctx.globalAlpha = 1;
  }

  function drawSporeSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#1a4030', '#2a7050', '#90e0a8', '#60d090');
  }

  function drawCrimsonSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#401a1a', '#702830', '#e09080', '#c04848');
  }

  function drawSapphireSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#1a2a40', '#284070', '#9ac0e8', '#5080c0');
  }

  function drawRoseSea(ctx, x, y, ts, time, col, row) {
    drawSeaShared(ctx, x, y, ts, time || 0, col || 0, row || 0,
      '#401a30', '#702850', '#e8a0c8', '#c050a0');
  }

  function drawMidnightSea(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSeaShared(ctx, x, y, ts, time, col, row,
      '#0a0a10', '#181828', '#7090c0', '#404868');
    // Iridescent shift over base — periodic violet/teal sheen
    var u = ts / 16;
    var iri = (Math.sin(time / 1500 + col * 0.3 + row * 0.5) + 1) * 0.5;
    var sheenR = Math.round(40 + iri * 60);
    var sheenG = Math.round(20 + iri * 30);
    var sheenB = Math.round(80 + iri * 80);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = 'rgb(' + sheenR + ',' + sheenG + ',' + sheenB + ')';
    ctx.fillRect(x, y, ts, ts);
    ctx.globalAlpha = 1;
  }

  // Shore — strict 16-px-per-tile pixel art. Coastline transition: animated
  // sea base + wet saltstone slab with foam crests at the edges. Reads as
  // "land meets sea" no matter which side it's placed on.
  function drawShore(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Animated sea underneath so the shore aligns with adjacent sea tiles
    drawSporeSea(ctx, x, y, ts, time, col, row);
    // Wet saltstone slab — 12u × 12u centered, with hard outline
    var SAND_DARK = '#2a2820';
    var SAND_MID = '#5a544a';
    var SAND_HI = '#76705c';
    var FOAM = '#90e0a8';
    // Outline (1u dark)
    ctx.fillStyle = '#0e0c08';
    ctx.fillRect(x + u, y + u, 14*u, 14*u);
    // Slab body
    ctx.fillStyle = SAND_MID;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 12*u);
    // Top highlight band (1u)
    ctx.fillStyle = SAND_HI;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, u);
    // Bottom shadow band (1u)
    ctx.fillStyle = SAND_DARK;
    ctx.fillRect(x + 2*u, y + 13*u, 12*u, u);
    // Pebble specks (deterministic)
    var seed = (col * 13 + row * 19) % 100;
    ctx.fillStyle = SAND_DARK;
    ctx.fillRect(x + 4*u, y + 5*u, u, u);
    ctx.fillRect(x + 9*u, y + 7*u, u, u);
    ctx.fillRect(x + 6*u, y + 10*u, u, u);
    if (seed % 3 === 0) ctx.fillRect(x + 12*u, y + 4*u, u, u);
    if (seed % 5 === 0) ctx.fillRect(x + 3*u, y + 11*u, u, u);
    // Foam crests on all four edges — animated with slow pulse
    var foamPulse = (Math.sin(time / 700 + col + row) + 1) * 0.5;
    ctx.globalAlpha = 0.5 + foamPulse * 0.3;
    ctx.fillStyle = FOAM;
    // Top foam (1u dashes)
    ctx.fillRect(x + 3*u, y, 2*u, u);
    ctx.fillRect(x + 8*u, y, 3*u, u);
    ctx.fillRect(x + 13*u, y, u, u);
    // Bottom foam
    ctx.fillRect(x + 4*u, y + 15*u, 3*u, u);
    ctx.fillRect(x + 10*u, y + 15*u, 2*u, u);
    // Left foam
    ctx.fillRect(x, y + 4*u, u, 2*u);
    ctx.fillRect(x, y + 10*u, u, 3*u);
    // Right foam
    ctx.fillRect(x + 15*u, y + 6*u, u, 2*u);
    ctx.fillRect(x + 15*u, y + 12*u, u, u);
    ctx.globalAlpha = 1;
  }

  // Silver dock post — strict pixel art. 4u-wide post on animated sea.
  // 1u left highlight, 1u right shadow, hard 1u rope ring.
  function drawSilverPost(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSporeSea(ctx, x, y, ts, time, col, row);
    var DARK = '#0e1414';
    var SH = '#1e2424';
    var MID = '#384040';
    var HI = '#5a6868';
    var BRIGHT = '#a0b0ac';
    // Reflection of post in water (1u columns, below the post)
    ctx.globalAlpha = 0.3 + Math.sin(time / 600 + col) * 0.1;
    ctx.fillStyle = '#c0d0d0';
    ctx.fillRect(x + 7*u, y + 11*u, 2*u, 4*u);
    ctx.globalAlpha = 1;
    // Outline (5u × 13u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + u, 6*u, 13*u);
    // Body
    ctx.fillStyle = MID;
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, 11*u);
    // 1u left highlight column
    ctx.fillStyle = HI;
    ctx.fillRect(x + 6*u, y + 2*u, u, 11*u);
    // 1u right shadow column
    ctx.fillStyle = SH;
    ctx.fillRect(x + 9*u, y + 2*u, u, 11*u);
    // Silver cap (3u tall)
    ctx.fillStyle = HI;
    ctx.fillRect(x + 5*u, y + u, 6*u, u);
    ctx.fillStyle = BRIGHT;
    var gleam = 0.7 + Math.sin(time / 2000 + col + row) * 0.3;
    ctx.globalAlpha = gleam;
    ctx.fillRect(x + 6*u, y + u, 2*u, u);
    ctx.globalAlpha = 1;
    // Rope ring (1u dark band)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 6*u, y + 4*u, 4*u, u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 6*u, y + 4*u, 4*u, u);
    // Knot bump (1u)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 9*u, y + 4*u, u, u);
    // Base bracket (2u × 6u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, 2*u);
    ctx.fillStyle = HI;
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, u);
  }

  // Spore shore — strict pixel art. Top edge of land peeking out from sea.
  function drawSporeShore(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSporeSea(ctx, x, y, ts, time, col, row);
    var DARK = '#0e0c08';
    var STONE = '#252a28';
    var STONE_HI = '#3a4240';
    // Land slab — top 4u
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = STONE;
    ctx.fillRect(x, y + u, ts, 3*u);
    ctx.fillStyle = STONE_HI;
    ctx.fillRect(x, y + u, ts, u);          // 1u top highlight
    // Foam crests at the wet edge (1u dashes)
    ctx.fillStyle = '#90e0a8';
    ctx.fillRect(x + 2*u, y + 4*u, 3*u, u);
    ctx.fillRect(x + 8*u, y + 4*u, 2*u, u);
    ctx.fillRect(x + 12*u, y + 4*u, 2*u, u);
  }

  // Procedural fallback wall + window — strict pixel art. Whole-u rects only.
  // 8u × 6u window with hard 1u silver frame, animated warm interior glow,
  // simple silhouette per tile.
  function drawBuilding(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0c0d';
    var FRAME = '#506060';
    var FRAME_HI = '#7a8a8a';
    var GLOW = '#c08840';
    var GLOW_HI = '#ffd070';
    // Window recess (8u × 6u, centered horizontally, mid-height)
    var wx = x + 4*u, wy = y + 6*u, ww = 8*u, wh = 6*u;
    // Outline
    ctx.fillStyle = DARK;
    ctx.fillRect(wx, wy, ww, wh);
    // Warm glow fill (flickers)
    var flicker = 0.55 + Math.sin(time / 1200 + col * 5) * 0.2 + Math.sin(time / 280 + row) * 0.15;
    ctx.globalAlpha = Math.max(0.3, Math.min(1, flicker));
    ctx.fillStyle = GLOW;
    ctx.fillRect(wx + u, wy + u, ww - 2*u, wh - 2*u);
    ctx.fillStyle = GLOW_HI;
    ctx.fillRect(wx + 2*u, wy + 2*u, ww - 4*u, wh - 4*u);
    ctx.globalAlpha = 1;
    // Silhouette in window (varies by seed)
    var seed = (col * 11 + row * 17) % 4;
    ctx.fillStyle = '#1a1008';
    if (seed === 0) {
      // Person at table
      ctx.fillRect(wx + 3*u, wy + 2*u, 2*u, 2*u);
      ctx.fillRect(wx + 2*u, wy + 4*u, 4*u, u);
    } else if (seed === 1) {
      // Plant
      ctx.fillRect(wx + 3*u, wy + u, 2*u, 4*u);
      ctx.fillRect(wx + 2*u, wy + 2*u, 4*u, u);
    } else if (seed === 2) {
      // Bookshelf bands
      ctx.fillRect(wx + u, wy + 2*u, 6*u, u);
      ctx.fillRect(wx + u, wy + 4*u, 6*u, u);
    }
    // Window frame (1u silver around the recess, inside)
    ctx.fillStyle = FRAME;
    ctx.fillRect(wx, wy, ww, u);                   // top
    ctx.fillRect(wx, wy + wh - u, ww, u);          // bottom
    ctx.fillRect(wx, wy, u, wh);                   // left
    ctx.fillRect(wx + ww - u, wy, u, wh);          // right
    // Window cross-mullion (1u)
    ctx.fillRect(wx + 4*u - 0, wy, u, wh);
    ctx.fillRect(wx, wy + 3*u, ww, u);
    // 1u top frame highlight
    ctx.fillStyle = FRAME_HI;
    ctx.fillRect(wx, wy, ww, u);
    // Sill (1u dark band, 10u wide)
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(wx - u, wy + wh, ww + 2*u, u);
  }

  // Wall-mounted lantern — strict pixel art. 4u × 4u lantern hanging from
  // a 1u L-shaped iron bracket. Whole-u rects only.
  function drawLantern(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var IRON_DK = '#0a0606';
    var IRON = '#1e1e1e';
    var IRON_HI = '#3a3a3a';
    // Bracket — 1u arm 5u long, 1u down-stop 4u tall
    ctx.fillStyle = IRON_DK;
    ctx.fillRect(x + 6*u, y + 5*u, 5*u, u);     // arm
    ctx.fillRect(x + 10*u, y + 5*u, u, 4*u);    // hanger
    ctx.fillStyle = IRON_HI;
    ctx.fillRect(x + 6*u, y + 5*u, 5*u, u);     // (overdraw lighter then darken below for shading)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 6*u, y + 5*u, 5*u, u);
    // Lantern body outline (4u × 5u)
    ctx.fillStyle = IRON_DK;
    ctx.fillRect(x + 8*u, y + 8*u, 4*u, 5*u);
    // Body interior (warm dark)
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(x + 9*u, y + 9*u, 2*u, 3*u);
    // Cage bars (1u verticals)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 8*u, y + 8*u, u, 5*u);
    ctx.fillRect(x + 11*u, y + 8*u, u, 5*u);
    // Top rim + bottom drip (1u)
    ctx.fillRect(x + 8*u, y + 8*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 12*u, 4*u, u);
    // Flame — 2-frame animation
    var flameFrame = Math.floor(time / 180) % 2;
    var flick = 0.85 + Math.sin(time / 200 + col) * 0.15;
    ctx.globalAlpha = flick;
    ctx.fillStyle = '#ffe080';
    if (flameFrame === 0) {
      ctx.fillRect(x + 9*u, y + 9*u, 2*u, 2*u);
      ctx.fillStyle = '#ffa040';
      ctx.fillRect(x + 10*u, y + 10*u, u, u);
    } else {
      ctx.fillRect(x + 9*u, y + 9*u, 2*u, u);
      ctx.fillRect(x + 10*u, y + 10*u, u, u);
      ctx.fillStyle = '#ffa040';
      ctx.fillRect(x + 9*u, y + 10*u, u, u);
    }
    ctx.globalAlpha = 1;
    // Warm halo (atmospheric gradient — allowed by spec)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35 * flick;
    var grad = ctx.createRadialGradient(x + 10*u, y + 10*u, 0, x + 10*u, y + 10*u, 10*u);
    grad.addColorStop(0, 'rgba(255, 200, 80, 0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 5*u, y - 2*u, ts + 10*u, ts + 4*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // ---- Building sprite loader ----
  // Generic helper for the multi-tile PNG buildings (tavern, inn, lighthouse,
  // etc.). Each sprite is anchored at the bottom-center tile of its footprint
  // and renders extending UP and OUT across the building's full footprint.
  // Loads the PNG, then post-processes the alpha channel to strip the soft
  // anti-aliased halo that DALL-E-style generators leave around the subject.
  var spriteCache = {};
  // Target source resolution after chunkify — each pixel of the chunked canvas
  // becomes ~3 screen pixels at our render scale, matching our procedural
  // art's "u = ts/16" pixel chunkiness. Lower = blockier. Tune per-sprite.
  function loadBuildingSprite(key, path, chunkWidth) {
    if (spriteCache[key]) return spriteCache[key];
    var entry = { canvas: null, ready: false };
    spriteCache[key] = entry;
    var img = new Image();
    img.onload = function () {
      // Step 1: source canvas at native size for alpha cleanup
      var src = document.createElement('canvas');
      src.width = img.width;
      src.height = img.height;
      var sCtx = src.getContext('2d');
      sCtx.drawImage(img, 0, 0);
      try {
        var data = sCtx.getImageData(0, 0, src.width, src.height);
        var px = data.data;
        // Aggressive halo cleanup — DALL-E renders the image with a soft
        // anti-aliased boundary into a cream/white background. Even if the
        // alpha is opaque, the colour at the edge is bright + low-saturation.
        // Strip:
        //  1) any pure-white pixel (it's the bg)
        //  2) any low-saturation bright pixel near full alpha (halo bleed)
        //  3) any partially-transparent pixel that's biased toward white
        for (var i = 0; i < px.length; i += 4) {
          var r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
          if (a === 0) continue;
          var maxC = Math.max(r, g, b);
          var minC = Math.min(r, g, b);
          var sat = maxC - minC;
          // Pure / near-white
          if (maxC > 230 && sat < 25) {
            px[i + 3] = 0;
            continue;
          }
          // Partial alpha + bright = halo edge
          if (a < 230 && maxC > 200 && sat < 40) {
            px[i + 3] = 0;
            continue;
          }
          // Cream/off-white interior pixel that bled in (very light, low sat)
          if (maxC > 215 && sat < 18 && (r + g + b) > 620) {
            px[i + 3] = 0;
          }
        }
        sCtx.putImageData(data, 0, 0);
      } catch (e) { /* CORS — skip */ }

      // Step 2: chunkify — downscale with nearest-neighbor to a low base
      // resolution so the sprite reads as chunky pixel art matching the
      // procedural tiles around it.
      var CW = chunkWidth || 96;
      var aspect = src.width / src.height;
      var CH = Math.round(CW / aspect);
      var c = document.createElement('canvas');
      c.width = CW;
      c.height = CH;
      var cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(src, 0, 0, CW, CH);
      entry.canvas = c;
      entry.ready = true;
    };
    img.src = path;
    return entry;
  }
  // Preload the sprites with chunky base resolutions tuned to ~20 px per
  // tile, slightly above strict Stardew 16-px density. Procedural drawers
  // around them use 16-art-pixels-per-tile via whole-u rects, so 20 keeps
  // building detail (lantern, sign, knocker) readable without the buildings
  // looking smoother than the world.
  loadBuildingSprite('tavern', '/bridge/assets/buildings/tavern.png', 80);
  loadBuildingSprite('inn', '/bridge/assets/buildings/inn.png', 100);
  loadBuildingSprite('lighthouse', '/bridge/assets/buildings/lighthouse.png', 60);
  loadBuildingSprite('smithy', '/bridge/assets/buildings/smithy.png', 64);
  loadBuildingSprite('apothecary', '/bridge/assets/buildings/apothecary.png', 64);
  loadBuildingSprite('bakery', '/bridge/assets/buildings/bakery.png', 64);
  loadBuildingSprite('fishmonger-stall', '/bridge/assets/buildings/fishmonger-stall.png', 64);
  loadBuildingSprite('ship-dock', '/bridge/assets/buildings/ship-dock.png', 140);
  // Square props + the second tower batch — share the same loader via the
  // BridgeSprites global so cave + bridge worlds can reuse the cache too.
  BridgeSprites.load('bell-tower', '/bridge/assets/buildings/bell-tower.png', 48);
  BridgeSprites.load('sorceress-tower', '/bridge/assets/buildings/sorceress-tower.png', 60);
  BridgeSprites.load('fountain', '/bridge/assets/props/fountain.png', 60);
  BridgeSprites.load('bulletin-board', '/bridge/assets/props/bulletin-board.png', 42);
  BridgeSprites.load('market-cart', '/bridge/assets/props/market-cart.png', 60);
  BridgeSprites.load('crates-barrels', '/bridge/assets/props/crates-barrels.png', 40);

  // tilesW/tilesH = footprint in tiles. anchorOffsetX = which column within
  // the sprite the anchor tile sits at, measured from the LEFT edge (0-based).
  // Sprite renders so that its bottom edge aligns with the anchor tile's
  // bottom edge.
  function drawBuildingSprite(ctx, x, y, ts, key, tilesW, tilesH, anchorOffsetX) {
    var s = spriteCache[key];
    if (!s || !s.ready) {
      // Subtle placeholder while loading — empty
      return;
    }
    var areaW = ts * tilesW;
    var areaH = ts * tilesH;
    var destX = x - anchorOffsetX * ts;
    var destY = y + ts - areaH;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.canvas, destX, destY, areaW, areaH);
  }

  // Procedural animation overlays for the PNG buildings — give them life
  // without modifying the static art.

  function drawChimneySmoke(ctx, anchorX, anchorY, ts, time, seed) {
    // anchorX, anchorY = top-left of the chimney "vent" in screen pixels
    var u = ts / 16;
    var puffs = 4;
    for (var i = 0; i < puffs; i++) {
      var phase = (time / 220) + i * 1.3 + seed * 0.7;
      var lifecycle = (phase % 5);                // 0..5
      var rise = lifecycle * 1.6 * u;             // travels up over lifecycle
      var sway = Math.sin(phase * 2) * u * 0.6;
      var pSize = (1.4 + i * 0.25 + lifecycle * 0.3) * u;
      var alpha = Math.max(0, 0.7 - lifecycle * 0.14);
      if (alpha <= 0) continue;
      ctx.fillStyle = 'rgba(220,220,220,' + alpha.toFixed(2) + ')';
      ctx.fillRect(anchorX + sway, anchorY - rise, pSize, pSize);
    }
  }

  function drawWindowFlicker(ctx, areaX, areaY, areaW, areaH, time, seed, color) {
    // Subtle pulsing warm overlay to simulate "lit windows from inside"
    var pulse = 0.55 + Math.sin(time / 1300 + seed) * 0.15;
    if ((Math.floor(time / 90) + seed * 7) % 173 === 0) pulse *= 0.4; // rare flicker
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.10;
    ctx.fillStyle = color;
    ctx.fillRect(areaX, areaY + areaH * 0.2, areaW, areaH * 0.55);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Tavern PNG — 4 wide × 5 tall, anchor at column index 1
  function drawTavernPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'tavern', 4, 5, 1);
    // Building footprint in screen pixels
    var areaW = ts * 4, areaH = ts * 5;
    var destX = x - 1 * ts;
    var destY = y + ts - areaH;
    // Window flicker — warm yellow
    drawWindowFlicker(ctx, destX, destY, areaW, areaH, time, col + row, 'rgba(255, 220, 120, 1)');
    // Chimney smoke — chimney is at upper-right of the tavern PNG (~80% across, ~10% down)
    var chimneyX = destX + areaW * 0.78;
    var chimneyY = destY + areaH * 0.08;
    drawChimneySmoke(ctx, chimneyX, chimneyY, ts, time, col + row);
  }

  function drawInnPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'inn', 5, 5, 2);
    var areaW = ts * 5, areaH = ts * 5;
    var destX = x - 2 * ts;
    var destY = y + ts - areaH;
    drawWindowFlicker(ctx, destX, destY, areaW, areaH, time, col + row + 11, 'rgba(255, 220, 140, 1)');
    // Inn chimney is at upper-right, slightly less far right
    var chimneyX = destX + areaW * 0.74;
    var chimneyY = destY + areaH * 0.10;
    drawChimneySmoke(ctx, chimneyX, chimneyY, ts, time, col + row + 5);
  }

  // Smithy PNG — 3 wide × 4 tall. Adds a flickering hot-orange forge glow
  // through the open front + chimney smoke + warm ground-light pool.
  function drawSmithyPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'smithy', 3, 4, 1);
    var areaW = ts * 3, areaH = ts * 4;
    var destX = x - 1 * ts;
    var destY = y + ts - areaH;
    // Forge flicker — the open front is centred low on the facade.
    var t = time || 0;
    var pulse = 0.7 + Math.sin(t / 220 + (col || 0)) * 0.15 + Math.sin(t / 90) * 0.1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.55;
    var forgeCx = destX + areaW * 0.5;
    var forgeCy = destY + areaH * 0.65;
    var forge = ctx.createRadialGradient(forgeCx, forgeCy, 0, forgeCx, forgeCy, areaW * 0.7);
    forge.addColorStop(0, 'rgba(255, 160, 80, 0.9)');
    forge.addColorStop(0.5, 'rgba(232, 100, 40, 0.45)');
    forge.addColorStop(1, 'transparent');
    ctx.fillStyle = forge;
    ctx.fillRect(destX, destY + areaH * 0.35, areaW, areaH * 0.6);
    // Warm pool spilling onto the cobble in front
    ctx.globalAlpha = pulse * 0.4;
    var pool = ctx.createRadialGradient(forgeCx, destY + areaH, 0, forgeCx, destY + areaH, areaW * 0.9);
    pool.addColorStop(0, 'rgba(255, 140, 60, 0.7)');
    pool.addColorStop(1, 'transparent');
    ctx.fillStyle = pool;
    ctx.fillRect(destX - areaW * 0.3, destY + areaH * 0.85, areaW * 1.6, areaH * 0.4);
    ctx.restore();
    // Lantern flicker beside the entrance — small warm dot, left side
    var lanternCx = destX + areaW * 0.12;
    var lanternCy = destY + areaH * 0.62;
    var lp = 0.7 + Math.sin(t / 350 + (col || 0) * 1.3) * 0.25;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = lp * 0.6;
    var lan = ctx.createRadialGradient(lanternCx, lanternCy, 0, lanternCx, lanternCy, ts * 0.6);
    lan.addColorStop(0, 'rgba(255, 220, 140, 0.95)');
    lan.addColorStop(1, 'transparent');
    ctx.fillStyle = lan;
    ctx.fillRect(lanternCx - ts, lanternCy - ts, ts * 2, ts * 2);
    ctx.restore();
    // Chimney smoke — upper-right corner
    var chimneyX = destX + areaW * 0.82;
    var chimneyY = destY + areaH * 0.06;
    drawChimneySmoke(ctx, chimneyX, chimneyY, ts, time, col + row + 17);
  }

  // Apothecary PNG — 3 wide × 4 tall. Jar-window glow cycles between warm
  // yellow / muted cyan / muted magenta + faint green-tinted chimney smoke
  // + lantern flicker.
  function drawApothecaryPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'apothecary', 3, 4, 1);
    var areaW = ts * 3, areaH = ts * 4;
    var destX = x - 1 * ts;
    var destY = y + ts - areaH;
    var t = time || 0;
    // Window glow cycles colour (jars catching candlelight)
    var phase = (t / 4200 + (col || 0) * 0.3) % 3;
    var col1 = phase < 1 ? 'rgba(255, 220, 140, 1)' : (phase < 2 ? 'rgba(160, 230, 240, 1)' : 'rgba(232, 140, 220, 1)');
    drawWindowFlicker(ctx, destX, destY, areaW, areaH, time, col + row + 31, col1);
    // Lantern flicker beside the door
    var lanternCx = destX + areaW * 0.78;
    var lanternCy = destY + areaH * 0.78;
    var lp = 0.75 + Math.sin(t / 380 + (col || 0) * 1.5) * 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = lp * 0.55;
    var lan = ctx.createRadialGradient(lanternCx, lanternCy, 0, lanternCx, lanternCy, ts * 0.7);
    lan.addColorStop(0, 'rgba(255, 220, 140, 0.95)');
    lan.addColorStop(1, 'transparent');
    ctx.fillStyle = lan;
    ctx.fillRect(lanternCx - ts, lanternCy - ts, ts * 2, ts * 2);
    ctx.restore();
    // Green-tinted chimney smoke (overlay the standard smoke with a green tint)
    var chimneyX = destX + areaW * 0.78;
    var chimneyY = destY + areaH * 0.05;
    drawChimneySmoke(ctx, chimneyX, chimneyY, ts, time, col + row + 47);
    // Subtle violet ground pool — the witchy halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.18 + Math.sin(t / 900) * 0.05;
    var halo = ctx.createRadialGradient(destX + areaW * 0.5, destY + areaH, 0, destX + areaW * 0.5, destY + areaH, areaW * 0.8);
    halo.addColorStop(0, 'rgba(180, 140, 220, 0.6)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(destX - areaW * 0.2, destY + areaH * 0.8, areaW * 1.4, areaH * 0.4);
    ctx.restore();
  }

  // Bakery PNG — 3 wide × 4 tall. Standard window glow + chimney smoke +
  // lantern flicker + warm ground pool.
  function drawBakeryPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'bakery', 3, 4, 1);
    var areaW = ts * 3, areaH = ts * 4;
    var destX = x - 1 * ts;
    var destY = y + ts - areaH;
    drawWindowFlicker(ctx, destX, destY, areaW, areaH, time, col + row + 23, 'rgba(255, 220, 120, 1)');
    // Lantern above the door — upper-mid front
    var t = time || 0;
    var lanternCx = destX + areaW * 0.55;
    var lanternCy = destY + areaH * 0.68;
    var lp = 0.75 + Math.sin(t / 340 + (col || 0) * 1.1) * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = lp * 0.55;
    var lan = ctx.createRadialGradient(lanternCx, lanternCy, 0, lanternCx, lanternCy, ts * 0.65);
    lan.addColorStop(0, 'rgba(255, 220, 140, 0.95)');
    lan.addColorStop(1, 'transparent');
    ctx.fillStyle = lan;
    ctx.fillRect(lanternCx - ts, lanternCy - ts, ts * 2, ts * 2);
    ctx.restore();
    // Chimney smoke (upper-right)
    var chimneyX = destX + areaW * 0.80;
    var chimneyY = destY + areaH * 0.08;
    drawChimneySmoke(ctx, chimneyX, chimneyY, ts, time, col + row + 71);
    // Warm yellow pool out the front
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.22 + Math.sin(t / 700) * 0.05;
    var pool = ctx.createRadialGradient(destX + areaW * 0.5, destY + areaH, 0, destX + areaW * 0.5, destY + areaH, areaW * 0.9);
    pool.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
    pool.addColorStop(1, 'transparent');
    ctx.fillStyle = pool;
    ctx.fillRect(destX - areaW * 0.3, destY + areaH * 0.8, areaW * 1.6, areaH * 0.4);
    ctx.restore();
  }

  // Fishmonger stall PNG — 3 wide × 3 tall. Cool-cyan salty halo + a 1px
  // awning sway every few frames (the awning is the upper "roof" plane).
  function drawFishmongerStallPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'fishmonger-stall', 3, 3, 1);
    var areaW = ts * 3, areaH = ts * 3;
    var destX = x - 1 * ts;
    var destY = y + ts - areaH;
    var t = time || 0;
    // Salty cool-cyan halo around the stall
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.18 + Math.sin(t / 1100) * 0.05;
    var halo = ctx.createRadialGradient(destX + areaW * 0.5, destY + areaH * 0.6, 0, destX + areaW * 0.5, destY + areaH * 0.6, areaW * 0.9);
    halo.addColorStop(0, 'rgba(140, 200, 220, 0.55)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(destX - areaW * 0.2, destY + areaH * 0.2, areaW * 1.4, areaH * 0.9);
    ctx.restore();
  }

  // Ship-dock PNG — 7 wide × 4 tall. Anchor at (col, row) with anchorOffsetX=3
  // (centred). Adds porthole-row window glow, bow-lantern flicker, captain's
  // cabin window, a tiny flag-wave at the topmast, and a soft water-reflection
  // halo under the hull.
  function drawShipDockPng(ctx, x, y, ts, time, col, row) {
    drawBuildingSprite(ctx, x, y, ts, 'ship-dock', 7, 4, 3);
    var areaW = ts * 7, areaH = ts * 4;
    var destX = x - 3 * ts;
    var destY = y + ts - areaH;
    var t = time || 0;
    // Captain's cabin window — upper-left of the ship's body
    drawWindowFlicker(ctx, destX, destY, areaW, areaH, time, col + row + 91, 'rgba(255, 220, 140, 1)');
    // Bow lantern — small warm pulse on the bow (right side of the PNG)
    var lanternCx = destX + areaW * 0.92;
    var lanternCy = destY + areaH * 0.45;
    var lp = 0.7 + Math.sin(t / 320 + (col || 0)) * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = lp * 0.6;
    var lan = ctx.createRadialGradient(lanternCx, lanternCy, 0, lanternCx, lanternCy, ts * 0.85);
    lan.addColorStop(0, 'rgba(255, 220, 140, 0.95)');
    lan.addColorStop(1, 'transparent');
    ctx.fillStyle = lan;
    ctx.fillRect(lanternCx - ts * 1.2, lanternCy - ts * 1.2, ts * 2.4, ts * 2.4);
    ctx.restore();
    // Water reflection halo under the hull
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.18 + Math.sin(t / 1400) * 0.04;
    var ref = ctx.createLinearGradient(0, destY + areaH * 0.85, 0, destY + areaH * 1.1);
    ref.addColorStop(0, 'rgba(120, 220, 180, 0.5)');
    ref.addColorStop(1, 'transparent');
    ctx.fillStyle = ref;
    ctx.fillRect(destX, destY + areaH * 0.85, areaW, areaH * 0.3);
    ctx.restore();
  }

  function drawLighthousePng(ctx, x, y, ts, time, col, row) {
    var areaW = ts * 3, areaH = ts * 7;
    var destX = x - 1 * ts;
    var destY = y + ts - areaH;
    // Pre-fill the footprint with the cliff-trail base colour so the sea
    // background can't leak through the PNG's transparent base pixels —
    // the rocky base of the lighthouse renders with thin transparent
    // gaps that would otherwise show emerald sea right under the
    // lighthouse door.
    ctx.fillStyle = '#3a3640';
    ctx.fillRect(destX, destY, areaW, areaH);
    drawBuildingSprite(ctx, x, y, ts, 'lighthouse', 3, 7, 1);
    // Lamp pulse — single big warm glow at the top of the lighthouse
    var pulse = 0.6 + Math.sin(time / 700) * 0.25;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.55;
    var lampCx = destX + areaW * 0.5;
    var lampCy = destY + areaH * 0.10;
    var grad = ctx.createRadialGradient(lampCx, lampCy, 0, lampCx, lampCy, areaW * 1.2);
    grad.addColorStop(0, 'rgba(255, 220, 120, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 180, 80, 0.35)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(destX - areaW, destY - areaH * 0.3, areaW * 3, areaH);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // ---- Ship (reuse docked ship PNG) ----

  var shipCanvas = null;

  function loadShipSprite() {
    var img = new Image();
    img.onload = function () {
      shipCanvas = document.createElement('canvas');
      shipCanvas.width = img.width;
      shipCanvas.height = img.height;
      var sctx = shipCanvas.getContext('2d');
      sctx.drawImage(img, 0, 0);
      var data = sctx.getImageData(0, 0, shipCanvas.width, shipCanvas.height);
      var px = data.data;
      for (var i = 0; i < px.length; i += 4) {
        var r = px[i], g = px[i + 1], b = px[i + 2];
        if (r > 240 && g > 240 && b > 240) {
          px[i + 3] = 0;
        } else if (r > 200 && g > 200 && b > 200) {
          var avg = (r + g + b) / 3;
          var fade = Math.max(0, Math.min(255, Math.round((255 - avg) * (255 / 55))));
          px[i + 3] = Math.min(px[i + 3], fade);
        }
      }
      sctx.putImageData(data, 0, 0);
    };
    img.src = '/bridge/assets/ship-docked.png';
  }
  loadShipSprite();

  function drawShipBody(ctx, x, y, ts, time, col, row) {
    ctx.fillStyle = '#0e2018';
    ctx.fillRect(x, y, ts, ts);
    if (col === 2 && row === 2 && shipCanvas) {
      var areaW = ts * 2;
      var areaH = ts * 2;
      var aspect = shipCanvas.width / shipCanvas.height;
      var shipW, shipH;
      if (aspect > 1) {
        shipW = areaW * 0.9;
        shipH = shipW / aspect;
      } else {
        shipH = areaH * 0.9;
        shipW = shipH * aspect;
      }
      var destX = x + (areaW - shipW) / 2;
      var destY = y + (areaH - shipH) / 2;
      ctx.drawImage(shipCanvas, 0, 0, shipCanvas.width, shipCanvas.height, destX, destY, shipW, shipH);
    }
  }

  function drawShipCockpit(ctx, x, y, ts) {
    ctx.fillStyle = '#0e2018';
    ctx.fillRect(x, y, ts, ts);
  }

  // ---- Custom Background ----

  var bgStars = [];
  var bgInited = false;
  var bgId = null;

  function drawLumarBackground(ctx, w, h, time) {
    var worldData = BridgeWorld.getWorld();

    // Pick the sea drawer for this zone — anywhere the camera shows past
    // the map edge gets tiled with actual animated sea, so the world feels
    // like it extends infinitely.
    var zoneName = worldData && worldData.name;
    var seaDrawer = drawSporeSea;
    if (zoneName === 'Crimson Reach') seaDrawer = drawCrimsonSea;
    else if (zoneName === 'Sapphire Port') seaDrawer = drawSapphireSea;
    else if (zoneName === 'Rose Cove') seaDrawer = drawRoseSea;
    else if (zoneName === 'Midnight Isle') seaDrawer = drawMidnightSea;
    // The Market Square is inland — paint the off-map background as cobble
    // instead of sea so void footprint margins on the buildings don't leak
    // emerald green between them.
    else if (zoneName === 'Lumar Market Square') seaDrawer = drawCobblestone;

    // Use the engine's camera + scale so off-map sea tiles align with the
    // in-map sea tiles seeded by the same (col, row).
    var camera = BridgeWorld.getCamera();
    var ts = BridgeWorld.getTileSize() * BridgeWorld.getScale();
    var offX = w / 2 - camera.x * ts;
    var offY = h / 2 - camera.y * ts;

    var startCol = Math.floor(-offX / ts) - 1;
    var endCol = Math.ceil((w - offX) / ts) + 1;
    var startRow = Math.floor(-offY / ts) - 1;
    var endRow = Math.ceil((h - offY) / ts) + 1;

    for (var r = startRow; r < endRow; r++) {
      for (var c = startCol; c < endCol; c++) {
        var tx = Math.floor(offX + c * ts);
        var ty = Math.floor(offY + r * ts);
        seaDrawer(ctx, tx, ty, ts, time, c, r);
      }
    }
  }

  // ---- Register ----

  // ---- Guard NPC ----

  // Guard NPC — strict pixel art. 8u-wide character on dock planks.
  // 1u outline, 3-tone shading, idle bob.
  function drawGuard(ctx, x, y, ts, time) {
    time = time || 0;
    var u = ts / 16;
    drawDockPlanks(ctx, x, y, ts);
    var DARK = '#0e1414';
    var UNIFORM = '#384848';
    var UNIFORM_HI = '#506060';
    var SKIN = '#9a8068';
    var SKIN_SH = '#6a5040';
    var bob = Math.sin(time / 800) > 0.85 ? -u : 0;
    // Helmet outline (8u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, 3*u);
    // Helmet body
    ctx.fillStyle = UNIFORM;
    ctx.fillRect(x + 4*u, y + 2*u + bob, 8*u, 2*u);
    // Helmet 1u top highlight
    ctx.fillStyle = UNIFORM_HI;
    ctx.fillRect(x + 4*u, y + 2*u + bob, 8*u, u);
    // Face (visible 4u × 2u below helmet brim)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 4*u + bob, 6*u, 2*u);
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 4*u + bob, 6*u, 2*u);
    // Eyes (1u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 5*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 5*u + bob, u, u);
    // Body outline (8u × 6u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    // Body uniform
    ctx.fillStyle = UNIFORM;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    // 1u shoulder highlight
    ctx.fillStyle = UNIFORM_HI;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Belt + silver buckle (1u)
    ctx.fillStyle = '#808888';
    ctx.fillRect(x + 4*u, y + 9*u + bob, 8*u, u);
    ctx.fillStyle = '#e0e8e4';
    ctx.fillRect(x + 7*u, y + 9*u + bob, 2*u, u);
    // Legs (3u × 3u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Boots (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // ---- New Tile Draw Functions ----

  // Procedural fallback lighthouse (mostly unused — lighthouse PNG is preferred).
  // Strict pixel art version, whole-u rects only.
  function drawLighthouse(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var DARK = '#0e1212';
    var BRICK = '#262c2c';
    var BRICK_HI = '#3a4242';
    // Tower body (8u × 9u, centered)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 3*u, 8*u, 11*u);
    ctx.fillStyle = BRICK;
    ctx.fillRect(x + 5*u, y + 3*u, 6*u, 11*u);
    // Brick courses (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, u);
    ctx.fillRect(x + 5*u, y + 9*u, 6*u, u);
    ctx.fillRect(x + 5*u, y + 12*u, 6*u, u);
    // Top railing (1u)
    ctx.fillStyle = BRICK_HI;
    ctx.fillRect(x + 4*u, y + 3*u, 8*u, u);
    // Light housing (4u wide, 2u tall)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + u, 4*u, 2*u);
    // Pulsing bulb
    var pulse = 0.7 + Math.sin(time / 500) * 0.2 + Math.sin(time / 230) * 0.1;
    ctx.globalAlpha = Math.min(1, pulse);
    ctx.fillStyle = '#ffe480';
    ctx.fillRect(x + 7*u, y + u, 2*u, 2*u);
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(x + 7*u, y + u, 2*u, u);
    ctx.globalAlpha = 1;
    // Sweeping beam (atmospheric — gradient allowed)
    var sweep = Math.sin(time / 1500);
    var beamLeft = -8*u + sweep * 4*u;
    var beamRight = 8*u + sweep * 4*u;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff0a0';
    ctx.beginPath();
    ctx.moveTo(x + 8*u, y + 2*u);
    ctx.lineTo(x + 8*u + beamLeft, y - 12*u);
    ctx.lineTo(x + 8*u + beamRight, y - 12*u);
    ctx.closePath();
    ctx.fill();
    // Bulb halo
    ctx.globalAlpha = pulse * 0.5;
    var grad = ctx.createRadialGradient(x + 8*u, y + 2*u, 0, x + 8*u, y + 2*u, 5*u);
    grad.addColorStop(0, 'rgba(255,228,128,0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y - 3*u, ts, 8*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Crate — strict pixel art. 10u × 10u wooden box with 1u outline, 1u top
  // highlight, 1u right shadow column, hard plank seams + iron corners.
  function drawCrate(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    var DARK = '#1a0e08';
    var WOOD_SH = '#2a1808';
    var WOOD_MD = '#5a3e20';
    var WOOD_HI = '#7a542a';
    // Drop shadow under crate (1u)
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(x + 3*u, y + 13*u, 11*u, u);
    // Outline (12u × 11u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 11*u);
    // Body
    ctx.fillStyle = WOOD_MD;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 9*u);
    // Top highlight (1u)
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, u);
    // Right shadow column (1u)
    ctx.fillStyle = WOOD_SH;
    ctx.fillRect(x + 12*u, y + 4*u, u, 8*u);
    // Plank seams (1u dark) + 1u highlight under each
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, u);
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 3*u, y + 7*u, 10*u, u);
    ctx.fillRect(x + 3*u, y + 10*u, 10*u, u);
    // Iron corner brackets (1u squares with 1u dark outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 3*u, 2*u, u);
    ctx.fillRect(x + 11*u, y + 3*u, 2*u, u);
    ctx.fillRect(x + 3*u, y + 11*u, 2*u, u);
    ctx.fillRect(x + 11*u, y + 11*u, 2*u, u);
    ctx.fillStyle = '#3a3a3e';
    ctx.fillRect(x + 3*u, y + 3*u, u, u);
    ctx.fillRect(x + 12*u, y + 3*u, u, u);
    ctx.fillRect(x + 3*u, y + 11*u, u, u);
    ctx.fillRect(x + 12*u, y + 11*u, u, u);
    // Stamped marking — 1u grid per variant
    var seed = (col * 7 + row * 11) % 3;
    ctx.fillStyle = '#1a0e06';
    if (seed === 0) {
      // Triangle stamp (3u tall)
      ctx.fillRect(x + 8*u, y + 5*u, u, u);
      ctx.fillRect(x + 7*u, y + 6*u, 3*u, u);
      ctx.fillRect(x + 7*u, y + 7*u, 3*u, u);
    } else if (seed === 1) {
      // Square stamp
      ctx.fillRect(x + 7*u, y + 5*u, 3*u, u);
      ctx.fillRect(x + 7*u, y + 5*u, u, 3*u);
      ctx.fillRect(x + 9*u, y + 5*u, u, 3*u);
      ctx.fillRect(x + 7*u, y + 7*u, 3*u, u);
    } else {
      // X stamp
      ctx.fillRect(x + 7*u, y + 5*u, u, u);
      ctx.fillRect(x + 9*u, y + 5*u, u, u);
      ctx.fillRect(x + 8*u, y + 6*u, u, u);
      ctx.fillRect(x + 7*u, y + 7*u, u, u);
      ctx.fillRect(x + 9*u, y + 7*u, u, u);
    }
  }

  // Salt crystal cluster — strict pixel art. Stepped pyramid shapes (whole-u
  // rects only) instead of triangles, hard 1u outline + facet highlights.
  function drawSaltCrystal(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawShore(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0e0e';
    var SH = '#7a8884';
    var MID = '#b0bcb8';
    var HI = '#dce4e0';
    // Big crystal — stepped pyramid 1u-2u-3u-4u-5u (centered around col 6)
    var bx = x + 4*u;
    ctx.fillStyle = DARK;
    ctx.fillRect(bx + 2*u, y + 4*u, 1*u, 1*u);
    ctx.fillRect(bx + 1*u, y + 5*u, 3*u, 1*u);
    ctx.fillRect(bx + 0*u, y + 6*u, 5*u, 4*u);
    ctx.fillStyle = MID;
    ctx.fillRect(bx + 2*u, y + 5*u, 1*u, 1*u);
    ctx.fillRect(bx + 1*u, y + 6*u, 3*u, 3*u);
    ctx.fillStyle = HI;
    ctx.fillRect(bx + 2*u, y + 4*u, 1*u, 1*u);
    ctx.fillRect(bx + 2*u, y + 6*u, 1*u, 2*u);   // facet highlight
    ctx.fillStyle = SH;
    ctx.fillRect(bx + 3*u, y + 6*u, 1*u, 3*u);   // facet shadow
    // Small crystal left
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 1*u, y + 7*u, 1*u, 1*u);
    ctx.fillRect(x + 0*u, y + 8*u, 3*u, 2*u);
    ctx.fillStyle = HI;
    ctx.fillRect(x + 1*u, y + 7*u, 1*u, 1*u);
    ctx.fillStyle = MID;
    ctx.fillRect(x + 1*u, y + 8*u, 2*u, 2*u);
    // Small crystal right
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 12*u, y + 6*u, 1*u, 1*u);
    ctx.fillRect(x + 11*u, y + 7*u, 3*u, 3*u);
    ctx.fillStyle = MID;
    ctx.fillRect(x + 12*u, y + 7*u, 1*u, 2*u);
    ctx.fillStyle = HI;
    ctx.fillRect(x + 12*u, y + 6*u, 1*u, 1*u);
  }

  // Small rock — strict pixel art. Stepped silhouette, 1u outline,
  // 3-tone shading.
  function drawSmallRock(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 13 + row * 17) % 4;
    var DARK = '#0a0a08';
    var SH = '#181818';
    var MID = '#2a2a28';
    var HI = '#3a3a36';
    // Stone shape per seed (whole-u rects)
    ctx.fillStyle = DARK;
    if (seed === 0) {
      ctx.fillRect(x + 3*u, y + 8*u, 1*u, 1*u);
      ctx.fillRect(x + 2*u, y + 9*u, 11*u, 5*u);
      ctx.fillRect(x + 1*u, y + 10*u, 13*u, 4*u);
    } else if (seed === 1) {
      ctx.fillRect(x + 4*u, y + 6*u, 8*u, 1*u);
      ctx.fillRect(x + 3*u, y + 7*u, 10*u, 7*u);
    } else if (seed === 2) {
      ctx.fillRect(x + 2*u, y + 9*u, 4*u, 5*u);
      ctx.fillRect(x + 7*u, y + 7*u, 8*u, 7*u);
    } else {
      ctx.fillRect(x + 4*u, y + 8*u, 9*u, 6*u);
    }
    // Body fill
    ctx.fillStyle = MID;
    if (seed === 0) {
      ctx.fillRect(x + 3*u, y + 10*u, 10*u, 3*u);
    } else if (seed === 1) {
      ctx.fillRect(x + 4*u, y + 8*u, 8*u, 5*u);
    } else if (seed === 2) {
      ctx.fillRect(x + 3*u, y + 10*u, 3*u, 3*u);
      ctx.fillRect(x + 8*u, y + 8*u, 6*u, 5*u);
    } else {
      ctx.fillRect(x + 5*u, y + 9*u, 7*u, 4*u);
    }
    // 1u top highlight
    ctx.fillStyle = HI;
    if (seed === 0) ctx.fillRect(x + 3*u, y + 10*u, 10*u, u);
    else if (seed === 1) ctx.fillRect(x + 4*u, y + 8*u, 8*u, u);
    else if (seed === 2) { ctx.fillRect(x + 3*u, y + 10*u, 3*u, u); ctx.fillRect(x + 8*u, y + 8*u, 6*u, u); }
    else ctx.fillRect(x + 5*u, y + 9*u, 7*u, u);
    // 1u shadow band
    ctx.fillStyle = SH;
    if (seed === 0) ctx.fillRect(x + 3*u, y + 13*u, 10*u, u);
    else if (seed === 1) ctx.fillRect(x + 4*u, y + 13*u, 8*u, u);
    else if (seed === 2) ctx.fillRect(x + 8*u, y + 13*u, 6*u, u);
    else ctx.fillRect(x + 5*u, y + 13*u, 7*u, u);
  }

  // Crystal cluster — strict pixel art. Stepped pyramid + secondary spike.
  function drawCrystal(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    drawSmallRock(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0a08';
    var SH = '#403848';
    var MID = '#605880';
    var HI = '#9080b0';
    // Main crystal — stepped pyramid centered col 7-8
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 1*u, 1*u, 1*u);
    ctx.fillRect(x + 6*u, y + 2*u, 3*u, 1*u);
    ctx.fillRect(x + 5*u, y + 3*u, 5*u, 5*u);
    ctx.fillStyle = MID;
    ctx.fillRect(x + 7*u, y + 2*u, 1*u, 1*u);
    ctx.fillRect(x + 6*u, y + 3*u, 3*u, 4*u);
    ctx.fillStyle = HI;
    ctx.fillRect(x + 7*u, y + 1*u, 1*u, 1*u);
    ctx.fillRect(x + 7*u, y + 3*u, 1*u, 3*u);   // facet highlight
    ctx.fillStyle = SH;
    ctx.fillRect(x + 8*u, y + 3*u, 1*u, 4*u);   // facet shadow
    // Secondary crystal (right)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 11*u, y + 4*u, 1*u, 1*u);
    ctx.fillRect(x + 10*u, y + 5*u, 3*u, 4*u);
    ctx.fillStyle = MID;
    ctx.fillRect(x + 11*u, y + 5*u, 1*u, 3*u);
    ctx.fillStyle = HI;
    ctx.fillRect(x + 11*u, y + 4*u, 1*u, 1*u);
  }

  // Market stall — strict pixel art. Striped awning, posts, counter, varied
  // goods. Whole-u rects only.
  function drawMarketStall(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    var DARK = '#1a1010';
    var POST = '#3a2410';
    var POST_HI = '#5a3a1a';
    var STRIPE_A = '#7a3030';
    var STRIPE_B = '#a04040';
    var COUNTER = '#2e2618';
    var COUNTER_HI = '#5a4828';
    // Awning outline (16u × 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + u, ts, 4*u);
    // Awning stripes — alternating 4u wide
    for (var sIx = 0; sIx < 4; sIx++) {
      ctx.fillStyle = (sIx % 2 === 0) ? STRIPE_A : STRIPE_B;
      ctx.fillRect(x + sIx * 4*u, y + u, 4*u, 3*u);
    }
    // Awning top highlight (1u)
    ctx.fillStyle = '#c05050';
    ctx.fillRect(x, y + u, ts, u);
    // Awning bottom shadow (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 4*u, ts, u);
    // Tassels (1u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 5*u, u, 2*u);
    ctx.fillRect(x + 8*u, y + 5*u, u, 2*u);
    ctx.fillRect(x + 13*u, y + 5*u, u, 2*u);
    // Posts (1u wide, 6u tall)
    ctx.fillStyle = POST;
    ctx.fillRect(x + 2*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 13*u, y + 5*u, u, 6*u);
    ctx.fillStyle = POST_HI;
    ctx.fillRect(x + 2*u, y + 5*u, u, u);     // 1u top highlights
    ctx.fillRect(x + 13*u, y + 5*u, u, u);
    // Counter (14u × 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 9*u, 14*u, 5*u);
    ctx.fillStyle = COUNTER;
    ctx.fillRect(x + u, y + 9*u, 14*u, 4*u);
    ctx.fillStyle = COUNTER_HI;
    ctx.fillRect(x + u, y + 9*u, 14*u, u);    // top highlight
    // Goods variants
    var seed = (col * 11 + row * 13) % 4;
    if (seed === 0) {
      // Fish — 3 fish on counter, 2u × 1u each, with 1u eye
      ctx.fillStyle = '#7090a0';
      ctx.fillRect(x + 3*u, y + 7*u, 3*u, u);
      ctx.fillRect(x + 7*u, y + 7*u, 3*u, u);
      ctx.fillRect(x + 11*u, y + 7*u, 3*u, u);
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 5*u, y + 7*u, u, u);
      ctx.fillRect(x + 9*u, y + 7*u, u, u);
      ctx.fillRect(x + 13*u, y + 7*u, u, u);
    } else if (seed === 1) {
      // Crystals — 3 stepped pyramids
      ctx.fillStyle = '#a0c0d0';
      ctx.fillRect(x + 4*u, y + 7*u, u, u);
      ctx.fillRect(x + 3*u, y + 8*u, 3*u, u);
      ctx.fillStyle = '#c0a0b0';
      ctx.fillRect(x + 8*u, y + 6*u, u, u);
      ctx.fillRect(x + 7*u, y + 7*u, 3*u, 2*u);
      ctx.fillStyle = '#a0d0c0';
      ctx.fillRect(x + 12*u, y + 7*u, u, u);
      ctx.fillRect(x + 11*u, y + 8*u, 3*u, u);
    } else {
      // Sacks — 3 round-ish 3u × 2u rectangles with 1u tied tops
      ctx.fillStyle = '#7a6840';
      ctx.fillRect(x + 3*u, y + 7*u, 3*u, 2*u);
      ctx.fillRect(x + 7*u, y + 6*u, 3*u, 3*u);
      ctx.fillRect(x + 11*u, y + 7*u, 3*u, 2*u);
      ctx.fillStyle = '#9a8050';
      ctx.fillRect(x + 3*u, y + 7*u, 3*u, u);
      ctx.fillRect(x + 7*u, y + 6*u, 3*u, u);
      ctx.fillRect(x + 11*u, y + 7*u, 3*u, u);
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 4*u, y + 6*u, u, u);
      ctx.fillRect(x + 8*u, y + 5*u, u, u);
      ctx.fillRect(x + 12*u, y + 6*u, u, u);
    }
    // Sign on awning — 3 1u dots (no text)
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(x + 6*u, y + 2*u, u, u);
    ctx.fillRect(x + 8*u, y + 2*u, u, u);
    ctx.fillRect(x + 10*u, y + 2*u, u, u);
  }

  // Wanted poster — strict pixel art. 10u × 10u parchment with hard
  // header band, silhouette portrait, text rows. Whole-u rects only.
  function drawWantedPoster(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var DARK = '#1a0e08';
    var PAPER = '#8a7a60';
    var PAPER_HI = '#a89868';
    var INK = '#3a2818';
    var pX = x + 3*u, pY = y + 3*u, pW = 10*u, pH = 10*u;
    // Outline
    ctx.fillStyle = DARK;
    ctx.fillRect(pX, pY, pW, pH);
    // Paper body
    ctx.fillStyle = PAPER;
    ctx.fillRect(pX + u, pY + u, pW - 2*u, pH - 2*u);
    // Top highlight (1u)
    ctx.fillStyle = PAPER_HI;
    ctx.fillRect(pX + u, pY + u, pW - 2*u, u);
    // WANTED header band (8u × 1u)
    ctx.fillStyle = INK;
    ctx.fillRect(pX + u, pY + 2*u, pW - 2*u, u);
    // Silhouette portrait per seed
    var seed = (col * 13 + row * 19) % 3;
    ctx.fillStyle = INK;
    if (seed === 0) {
      // Hooded
      ctx.fillRect(pX + 4*u, pY + 4*u, 2*u, 2*u);
      ctx.fillRect(pX + 3*u, pY + 6*u, 4*u, 2*u);
    } else if (seed === 1) {
      // Hat
      ctx.fillRect(pX + 3*u, pY + 4*u, 4*u, u);     // brim
      ctx.fillRect(pX + 4*u, pY + 5*u, 2*u, u);     // crown
      ctx.fillRect(pX + 4*u, pY + 6*u, 2*u, u);     // face
      ctx.fillRect(pX + 3*u, pY + 7*u, 4*u, u);     // shoulders
    } else {
      // Generic
      ctx.fillRect(pX + 4*u, pY + 4*u, 2*u, 2*u);
      ctx.fillRect(pX + 3*u, pY + 6*u, 4*u, 2*u);
    }
    // Reward text lines (1u dark bands)
    ctx.fillStyle = INK;
    ctx.fillRect(pX + 2*u, pY + 8*u, 6*u, u);
    ctx.fillRect(pX + 3*u, pY + 9*u, 4*u, u);
    // Pin tacks (1u red squares)
    ctx.fillStyle = '#a02020';
    ctx.fillRect(pX + u, pY + u, u, u);
    ctx.fillRect(pX + pW - 2*u, pY + u, u, u);
  }

  // NPC — strict pixel art. 8u-wide townsperson. 1u outline, hat in
  // varied color, simple face, idle bob.
  function drawNpc(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneFloor(ctx, x, y, ts);
    var DARK = '#1a1410';
    var SKIN = '#9a8068';
    var SKIN_SH = '#6a5040';
    // Per-NPC body color (deterministic by tile)
    var bodies = ['#607060', '#806050', '#506070', '#705a40', '#404858'];
    var hilite = ['#809080', '#a08070', '#708090', '#907a60', '#606878'];
    var i = (col * 7 + row * 13) % bodies.length;
    var BODY = bodies[i];
    var BODY_HI = hilite[i];
    var bob = Math.sin(time / 800 + col * 3 + row * 5) > 0.85 ? -u : 0;
    // Head outline (6u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 5*u);
    // Hair/hat (full top 2u in body color)
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, u);   // 1u hat highlight
    // Face
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    // Eyes (1u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Body outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    // Body fill
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 5*u, y + 6*u + bob, 6*u, 5*u);
    // 1u shoulder highlight
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 5*u, y + 6*u + bob, 6*u, u);
    // Belt (1u)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Legs (2u × 4u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Boots (1u row)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // ---- Door / entrance tiles for buildings, towers, and caves ----

  // Tavern entrance — strict pixel art. Wooden door embedded in saltstone,
  // warm glow leaking out, brass knob. Whole-u rects only.
  function drawTavernEntrance(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0606';
    var STONE = '#0e1212';
    var WOOD_DK = '#3a2410';
    var WOOD = '#5a3a1a';
    var WOOD_HI = '#7a4e22';
    var IRON = '#1a1a1e';
    var BRASS = '#a08040';
    var BRASS_HI = '#e0c060';
    // Stone arch (12u × 13u)
    ctx.fillStyle = STONE;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 13*u);
    // Door body (10u × 12u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 12*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 11*u);
    // Top highlight (1u)
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, u);
    // Vertical plank seams (1u)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 6*u, y + 3*u, u, 11*u);
    ctx.fillRect(x + 9*u, y + 3*u, u, 11*u);
    // Iron straps (1u tall × 10u wide at top + bottom thirds)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, u);
    ctx.fillRect(x + 3*u, y + 12*u, 10*u, u);
    // Hinges (2u × 1u at left edge)
    ctx.fillRect(x + 3*u, y + 5*u, 2*u, u);
    ctx.fillRect(x + 3*u, y + 12*u, 2*u, u);
    // Brass doorknob (1u)
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 11*u, y + 9*u, u, u);
    ctx.fillStyle = BRASS_HI;
    ctx.fillRect(x + 11*u, y + 9*u, u, u);   // single 1u accent
    // Warm glow halo (atmospheric gradient — allowed by spec)
    var pulse = 0.6 + Math.sin(time / 1100 + col + row) * 0.2;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 1.2);
    grad.addColorStop(0, 'rgba(255,180,90,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Hanging sign above door (5u × 2u plaque)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 5*u, y + u, 6*u, 2*u);
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 7*u, y + u + u, 2*u, u);   // sign emblem (1u)
  }

  // Cave entrance — strict pixel art. Stepped arch + glowing maw.
  function drawCaveEntranceWall(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var ARCH_DK = '#0a0408';
    var INNER = '#000';
    // Stepped arch (whole-u rects, pyramid-like)
    ctx.fillStyle = ARCH_DK;
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, u);     // top of arch
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, u);
    ctx.fillRect(x + 2*u, y + 7*u, 12*u, 8*u);  // arch body
    // Inner darkness
    ctx.fillStyle = INNER;
    ctx.fillRect(x + 6*u, y + 5*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, u);
    ctx.fillRect(x + 4*u, y + 7*u, 8*u, u);
    ctx.fillRect(x + 3*u, y + 8*u, 10*u, 7*u);
    // Stalactites (1u × 2u)
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(x + 6*u, y + 7*u, u, 2*u);
    ctx.fillRect(x + 9*u, y + 7*u, u, 2*u);
    // Lava glow (atmospheric gradient — allowed by spec)
    var pulse = 0.5 + Math.sin(time / 700 + col) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts*0.7, 0, x + ts/2, y + ts*0.7, ts * 0.9);
    grad.addColorStop(0, 'rgba(255,80,30,0.85)');
    grad.addColorStop(0.5, 'rgba(180,40,20,0.4)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // ---- Town features (Stardew-style) ----

  // Cobblestone path — strict 16-px-per-tile pixel art. Small stones (~3u)
  // packed tight so each tile reads like a path, not 4 huge bricks. Mortar
  // gaps are 1u dark, every stone gets 3-tone shading.
  function drawCobblestone(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    // Mortar base
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(x, y, ts, ts);
    // Stone palette — earthy warm grey, 4 midtone variants
    var SHADES = ['#4a4138', '#544a40', '#4e4538', '#564c44'];
    var HI = '#6a6058';
    var SH = '#2a2620';
    // Pick one of 4 patterns. All use 3-4u stones for fine detail.
    var pattern = seed % 4;
    var stones;
    if (pattern === 0) {
      // 4×4 grid of 3u stones with 1u mortar gaps
      stones = [];
      for (var sy0 = 0; sy0 < 4; sy0++) {
        for (var sx0 = 0; sx0 < 4; sx0++) {
          stones.push([sx0 * 4, sy0 * 4, 3, 3]);
        }
      }
    } else if (pattern === 1) {
      // Brick-style courses, 4 rows of staggered ~5u stones
      stones = [
        [0, 0, 5, 3], [6, 0, 4, 3], [11, 0, 5, 3],
        [0, 4, 3, 3], [4, 4, 5, 3], [10, 4, 3, 3], [14, 4, 2, 3],
        [0, 8, 5, 3], [6, 8, 4, 3], [11, 8, 5, 3],
        [0, 12, 3, 3], [4, 12, 5, 3], [10, 12, 3, 3], [14, 12, 2, 3]
      ];
    } else if (pattern === 2) {
      // 3 rows of mixed-width stones
      stones = [
        [0, 0, 4, 4], [5, 0, 5, 4], [11, 0, 5, 4],
        [0, 5, 5, 5], [6, 5, 4, 5], [11, 5, 5, 5],
        [0, 11, 5, 4], [6, 11, 4, 4], [11, 11, 5, 4]
      ];
    } else {
      // Densely packed small irregular stones (3u core, varied positions)
      stones = [
        [0, 0, 3, 3], [4, 0, 4, 3], [9, 0, 3, 3], [13, 0, 3, 3],
        [0, 4, 4, 3], [5, 4, 3, 3], [9, 4, 4, 3], [14, 4, 2, 3],
        [0, 8, 3, 3], [4, 8, 3, 3], [8, 8, 4, 3], [13, 8, 3, 3],
        [0, 12, 4, 3], [5, 12, 3, 3], [9, 12, 3, 3], [13, 12, 3, 3]
      ];
    }
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i];
      var sxp = x + s[0] * u, syp = y + s[1] * u;
      var sw = s[2] * u, sh = s[3] * u;
      ctx.fillStyle = SHADES[(seed + i) % SHADES.length];
      ctx.fillRect(sxp, syp, sw, sh);
      ctx.fillStyle = HI;
      ctx.fillRect(sxp, syp, sw, u);              // top highlight 1u
      ctx.fillStyle = SH;
      ctx.fillRect(sxp, syp + sh - u, sw, u);     // bottom shadow 1u
    }
    // Occasional moss / weathering — 1u squares, deterministic
    if (seed % 11 === 0) {
      ctx.fillStyle = '#4a8048';
      ctx.fillRect(x + 6*u, y + 6*u, u, u);
    }
    if (seed % 13 === 5) {
      ctx.fillStyle = '#3a6038';
      ctx.fillRect(x + 13*u, y + 11*u, u, u);
    }
    if (seed % 7 === 3) {
      ctx.fillStyle = '#241e18';
      ctx.fillRect(x + 2*u, y + 11*u, u, u);     // pebble
    }
  }

  // Bell tower — strict pixel art. Stepped pyramid roof, stone base with
  // arched bell housing, swinging bell. Whole-u rects only.
  // Bell tower — 2 wide × 4 tall, anchor at column index 0 (left).
  // Paint cobblestone across the bottom-row footprint so the void cell to
  // the right of the anchor (set in lumar-square.json to prevent overpaint)
  // doesn't show the background color.
  function drawBellTower(ctx, x, y, ts, time, col, row) {
    drawCobblestone(ctx, x, y, ts, time, col, row);
    drawCobblestone(ctx, x + ts, y, ts, time, col + 1, row);
    BridgeSprites.draw(ctx, x, y, ts, 'bell-tower', 2, 4, 0);
  }

  // Spray overlay for the fountain PNG. The PNG already paints two large
  // mint-green arcs curving from the spout to the basin edges — this
  // overlay adds droplets travelling along those same paths so the water
  // reads as actively flowing, plus splash dots where each arc lands.
  // Sprite-local landmarks tuned to the generated PNG composition.
  function drawFountainSpray(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var spriteX = x - ts;
    var spriteY = y - 2 * ts;
    var spriteW = 3 * ts;
    var spriteH = 3 * ts;
    var spoutX = spriteX + spriteW * 0.5;
    // Water emerges from the top of the figurine spout, not the
    // pedestal — start the drops up where the PNG arcs actually begin.
    var spoutY = spriteY + spriteH * 0.22;
    var basinY = spriteY + spriteH * 0.53;
    var landingReach = spriteW * 0.22; // final x distance from center
    var bulgeReach = spriteW * 0.06;   // extra x at the arc's mid-fall peak
    var seed = (col || 0) * 0.31 + (row || 0) * 0.17;

    // Mint / teal palette sampled from the PNG's painted arcs.
    var ARC_HI = 'rgba(208, 232, 216, ';   // foam highlight
    var ARC_MID = 'rgba(176, 216, 192, ';  // mid water
    var ARC_LO = 'rgba(144, 200, 168, ';   // deep water

    // Two arcs (left, right) — many droplets packed tight so the eye
    // reads them as a continuous flowing stream instead of discrete
    // drops. Path = linear x (lands at landingReach) + sin(πt) bulge
    // (peaks outward at mid-fall) + t² y, matching the PNG's painted
    // arcs that bulge out then curve slightly back in to land. Each
    // droplet is 2u wide so the stream reads thick.
    var sides = [-1, 1];
    for (var a = 0; a < 2; a++) {
      var sign = sides[a];
      for (var i = 0; i < 10; i++) {
        var phase = (time / 280) + i * 0.09 + a * 0.045 + seed;
        var t = phase - Math.floor(phase);
        var dropX = spoutX + sign * (landingReach * t + bulgeReach * Math.sin(t * Math.PI));
        var dropY = spoutY + (basinY - spoutY) * t * t;
        var color = i === 0 ? ARC_HI : i < 4 ? ARC_MID : ARC_LO;
        var alpha = (0.95 - i * 0.07).toFixed(2);
        ctx.fillStyle = color + alpha + ')';
        ctx.fillRect(Math.floor(dropX) - u, Math.floor(dropY), 2 * u, u);
      }
    }

    // Splash dots flickering at the two landing points.
    var splashFrame = Math.floor(time / 130) % 4;
    for (var sp = 0; sp < 2; sp++) {
      if (((splashFrame + sp) % 4) < 2) {
        var sx = spoutX + sides[sp] * landingReach;
        ctx.fillStyle = ARC_HI + '0.85)';
        ctx.fillRect(Math.floor(sx - u), Math.floor(basinY), u, u);
        ctx.fillRect(Math.floor(sx + u), Math.floor(basinY), u, u);
        ctx.fillStyle = ARC_LO + '0.55)';
        ctx.fillRect(Math.floor(sx), Math.floor(basinY + u), u, u);
      }
    }

    // Slow expanding ripple on the basin surface — centered on the
    // pedestal, drifts outward to the basin rim.
    var ringPhase = (time / 1300) - Math.floor(time / 1300);
    var ringRadius = ringPhase * 10 * u;
    var ringAlpha = 0.4 * (1 - ringPhase);
    if (ringAlpha > 0.05) {
      var cx = spoutX, cy = basinY + 4 * u;
      ctx.fillStyle = ARC_MID + ringAlpha.toFixed(2) + ')';
      ctx.fillRect(Math.floor(cx - ringRadius), Math.floor(cy), u, u);
      ctx.fillRect(Math.floor(cx + ringRadius), Math.floor(cy), u, u);
      ctx.fillRect(Math.floor(cx), Math.floor(cy - ringRadius * 0.4), u, u);
      ctx.fillRect(Math.floor(cx), Math.floor(cy + ringRadius * 0.4), u, u);
    }
  }

  // Town fountain — 3 wide × 3 tall, anchor at column index 1 (center).
  function drawFountain(ctx, x, y, ts, time, col, row) {
    drawCobblestone(ctx, x, y, ts, time, col, row);
    drawCobblestone(ctx, x + ts, y, ts, time, col + 1, row);
    BridgeSprites.draw(ctx, x, y, ts, 'fountain', 3, 3, 1);
    drawFountainSpray(ctx, x, y, ts, time, col, row);
  }

  // Bulletin board — 2 wide × 3 tall, anchor at column index 0 (left).
  function drawBulletinBoard(ctx, x, y, ts, time, col, row) {
    drawCobblestone(ctx, x, y, ts, time, col, row);
    drawCobblestone(ctx, x + ts, y, ts, time, col + 1, row);
    BridgeSprites.draw(ctx, x, y, ts, 'bulletin-board', 2, 3, 0);
  }

  // Fishing net hung to dry — strict pixel art. 1u-wide wooden frame poles,
  // 1u net grid bars, 1u sinkers. Whole-u rects only.
  function drawFishingNet(ctx, x, y, ts, time, col, row) {
    drawDockPlanks(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var FRAME = '#2a1808';
    var FRAME_HI = '#5a3a1a';
    var NET = '#5a4830';
    // Frame top + sides (1u each)
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, u);          // top
    ctx.fillRect(x + 2*u, y + 2*u, u, 11*u);          // left
    ctx.fillRect(x + 13*u, y + 2*u, u, 11*u);         // right
    ctx.fillStyle = FRAME_HI;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, u);          // 1u highlight on top
    // Net grid — 1u verticals every 2u, 1u horizontals every 2u
    ctx.fillStyle = NET;
    for (var nx = 4; nx < 13; nx += 2) {
      ctx.fillRect(x + nx*u, y + 3*u, u, 10*u);
    }
    for (var ny = 4; ny < 13; ny += 2) {
      ctx.fillRect(x + 3*u, y + ny*u, 10*u, u);
    }
    // Sinkers (1u dark squares)
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 5*u, y + 13*u, u, u);
    ctx.fillRect(x + 9*u, y + 13*u, u, u);
  }

  // Crab trap — strict pixel art. Whole-u grid for the wire mesh.
  function drawCrabTrap(ctx, x, y, ts, time, col, row) {
    drawDockPlanks(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var FRAME = '#2a1808';
    var WIRE = '#7a5630';
    var WIRE_HI = '#a07840';
    // Trap body — 10u × 8u
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, 8*u);
    // Wire mesh — 1u-wide vertical bars at 2u intervals
    ctx.fillStyle = WIRE;
    for (var bx = 0; bx < 5; bx++) {
      ctx.fillRect(x + (4 + bx * 2)*u, y + 6*u, u, 6*u);
    }
    // 1u horizontal mid-band
    ctx.fillRect(x + 4*u, y + 9*u, 9*u, u);
    // Highlights
    ctx.fillStyle = WIRE_HI;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, u);    // top band
    // Bottom shadow
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(x + 3*u, y + 12*u, 10*u, u);
    // Buoy — 2u × 2u red square with darker outline
    ctx.fillStyle = '#1a0606';
    ctx.fillRect(x + 12*u, y + 3*u, 2*u, 2*u);
    ctx.fillStyle = '#c83040';
    ctx.fillRect(x + 12*u, y + 3*u, 2*u, 2*u);
    ctx.fillStyle = '#f08070';
    ctx.fillRect(x + 12*u, y + 3*u, u, u);     // 1u highlight
  }

  // Captain's house — strict pixel art. Stepped porthole (whole-u rects),
  // hard 1u brass rim, anchor crest above door.
  function drawCaptainHouse(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var BRASS_DK = '#604020';
    var BRASS = '#a08040';
    var BRASS_HI = '#e0c060';
    var GLASS_DK = '#1a2030';
    var GLASS = '#3a4858';
    var GLASS_HI = '#5a78a0';
    // Porthole — 6u × 6u stepped circle (whole-u rects)
    var cx = x + 8*u, cy = y + 7*u;
    // Brass rim outline
    ctx.fillStyle = BRASS_DK;
    ctx.fillRect(cx - 2*u, cy - 3*u, 4*u, u);   // top
    ctx.fillRect(cx - 3*u, cy - 2*u, 6*u, 4*u); // mid
    ctx.fillRect(cx - 2*u, cy + 2*u, 4*u, u);   // bottom
    ctx.fillStyle = BRASS;
    ctx.fillRect(cx - u, cy - 3*u, 2*u, u);
    ctx.fillRect(cx - 2*u, cy - 2*u, 4*u, u);
    ctx.fillRect(cx - 3*u, cy - u, 6*u, u);
    ctx.fillRect(cx - 3*u, cy, 6*u, u);
    ctx.fillRect(cx - 2*u, cy + u, 4*u, u);
    ctx.fillRect(cx - u, cy + 2*u, 2*u, u);
    // Glass interior (4u × 4u stepped)
    ctx.fillStyle = GLASS;
    ctx.fillRect(cx - u, cy - 2*u, 2*u, u);
    ctx.fillRect(cx - 2*u, cy - u, 4*u, 2*u);
    ctx.fillRect(cx - u, cy + u, 2*u, u);
    // Glass highlight (1u)
    ctx.fillStyle = GLASS_HI;
    ctx.fillRect(cx - 2*u, cy - u, u, u);
    // Cross strut (1u brass band)
    ctx.fillStyle = BRASS;
    ctx.fillRect(cx - 3*u, cy, 6*u, u);
    // Anchor crest above door (3u × 2u)
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 7*u, y + u, 2*u, 2*u);
    ctx.fillStyle = '#5a4828';
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, u);   // anchor cross arm
  }

  // Captain statue — strict pixel art. Whole-u rects only, hard outline,
  // 3-tone shading (highlight / midtone / shadow + dark outline).
  function drawCaptainStatue(ctx, x, y, ts, time, col, row) {
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0e1212';
    var SH = '#2a3030';
    var MID = '#5a5048';
    var HI = '#7a7068';
    // Pedestal — 8u × 3u stone block, with hard outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 12*u, 8*u, 3*u);
    ctx.fillStyle = SH;
    ctx.fillRect(x + 4*u, y + 12*u, 8*u, u);
    ctx.fillStyle = MID;
    ctx.fillRect(x + 5*u, y + 12*u, 6*u, u);  // top of pedestal lighter
    // Statue body — 4u × 5u
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 5*u);  // outline
    ctx.fillStyle = MID;
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 5*u);
    ctx.fillStyle = HI;
    ctx.fillRect(x + 6*u, y + 7*u, u, 5*u);    // left highlight column
    ctx.fillStyle = SH;
    ctx.fillRect(x + 9*u, y + 7*u, u, 5*u);    // right shadow column
    // Coat collar — 1u dark band
    ctx.fillStyle = SH;
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    // Head — 2u × 2u
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 2*u);  // outline
    ctx.fillStyle = MID;
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 2*u);
    ctx.fillStyle = HI;
    ctx.fillRect(x + 7*u, y + 5*u, u, u);      // forehead highlight
    // Tricorn hat — 6u × 1u brim + 2u × 1u crown
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, u);    // brim
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, u);    // crown
    ctx.fillStyle = SH;
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, u);    // brim midtone overlay
    // Outstretched arm — 3u × 1u extending right
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 10*u, y + 8*u, 3*u, u);
    ctx.fillStyle = MID;
    ctx.fillRect(x + 10*u, y + 8*u, 3*u, u);
  }

  // Inn entrance — strict pixel art. Wooden door, simple sign, cool blue
  // glow pulse. Whole-u rects only.
  function drawInnEntrance(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawSaltstoneWall(ctx, x, y, ts, time, col, row);
    var DARK = '#0a0606';
    var STONE = '#0e1212';
    var WOOD_DK = '#2a1808';
    var WOOD = '#4a3a20';
    var WOOD_HI = '#6a5a30';
    var IRON = '#1a1a1e';
    var BRASS = '#a08040';
    // Stone arch (12u × 13u)
    ctx.fillStyle = STONE;
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 13*u);
    // Door body (10u × 12u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 12*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 11*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, u);
    // Vertical center plank seam (1u)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 8*u, y + 3*u, u, 11*u);
    // Iron bands (1u)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, u);
    ctx.fillRect(x + 3*u, y + 11*u, 10*u, u);
    // Brass knob (1u)
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 11*u, y + 9*u, u, u);
    // Hanging "INN" sign (6u × 2u)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 5*u, y + u, 6*u, 2*u);
    ctx.fillStyle = BRASS;
    ctx.fillRect(x + 6*u, y + u + u, 4*u, u);   // sign band
    // Z (sleep symbol — 1u stair)
    ctx.fillStyle = WOOD_DK;
    ctx.fillRect(x + 7*u, y + u + u, u, u);
    ctx.fillRect(x + 8*u, y + 2*u, u, u);
    // Cool blue pulse (atmospheric — gradient allowed)
    var pulse = 0.5 + Math.sin(time / 1500) * 0.2;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.3;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts);
    grad.addColorStop(0, 'rgba(100,160,200,0.5)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.3, y - ts*0.3, ts * 1.6, ts * 1.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Fish market stall — strict pixel art. Blue-striped awning, ice bed,
  // 3 fish in 1u-2u rectangles. Whole-u rects only.
  function drawFishMarket(ctx, x, y, ts, time, col, row) {
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0e1218';
    var POST = '#3a2410';
    var POST_HI = '#5a3a1a';
    var STRIPE_A = '#3060a0';
    var STRIPE_B = '#a0c0e0';
    var ICE = '#a0c0e8';
    var ICE_HI = '#d0e0f0';
    var COUNTER = '#2e2618';
    var COUNTER_HI = '#5a4828';
    // Awning outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + u, ts, 4*u);
    // Stripes (alternating 4u wide)
    for (var sIx = 0; sIx < 4; sIx++) {
      ctx.fillStyle = (sIx % 2 === 0) ? STRIPE_A : STRIPE_B;
      ctx.fillRect(x + sIx * 4*u, y + u, 4*u, 3*u);
    }
    // Top highlight + bottom shadow (1u)
    ctx.fillStyle = '#80a0c8';
    ctx.fillRect(x, y + u, ts, u);
    ctx.fillStyle = '#205080';
    ctx.fillRect(x, y + 4*u, ts, u);
    // Posts (1u × 6u)
    ctx.fillStyle = POST;
    ctx.fillRect(x + 2*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 13*u, y + 5*u, u, 6*u);
    ctx.fillStyle = POST_HI;
    ctx.fillRect(x + 2*u, y + 5*u, u, u);
    ctx.fillRect(x + 13*u, y + 5*u, u, u);
    // Counter (14u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 9*u, 14*u, 5*u);
    ctx.fillStyle = COUNTER;
    ctx.fillRect(x + u, y + 9*u, 14*u, 4*u);
    ctx.fillStyle = COUNTER_HI;
    ctx.fillRect(x + u, y + 9*u, 14*u, u);
    // Ice bed (12u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 7*u, 12*u, 3*u);
    ctx.fillStyle = ICE;
    ctx.fillRect(x + 2*u, y + 7*u, 12*u, 2*u);
    ctx.fillStyle = ICE_HI;
    ctx.fillRect(x + 2*u, y + 7*u, 12*u, u);
    // Fish — silver, brown, red — each 3u × 1u with 1u eye/tail
    ctx.fillStyle = '#90a0b0';
    ctx.fillRect(x + 3*u, y + 8*u, 3*u, u);
    ctx.fillStyle = '#c0d0e0';
    ctx.fillRect(x + 3*u, y + 8*u, 2*u, u);
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 8*u, u, u);
    ctx.fillStyle = '#a08070';
    ctx.fillRect(x + 7*u, y + 8*u, 3*u, u);
    ctx.fillStyle = '#c0a090';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 9*u, y + 8*u, u, u);
    ctx.fillStyle = '#a04030';
    ctx.fillRect(x + 11*u, y + 8*u, 3*u, u);
    ctx.fillStyle = '#e08060';
    ctx.fillRect(x + 11*u, y + 8*u, 2*u, u);
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 13*u, y + 8*u, u, u);
    // Sign (4u × 1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y, 4*u, u);
  }

  // Lantern post — strict pixel art. Whole-u rects only, hard 3-tone
  // shading. Procedural flicker on the flame, halo as gradient (the only
  // gradient allowed per spec — atmosphere/light overlay).
  function drawLanternPost(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var cx = x + 8*u;     // tile center X (whole-u)
    // Iron pole — 1u wide, 10u tall, with shadow side 1u and highlight side none
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(cx - u, y + 4*u, u, 10*u);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(cx, y + 4*u, u, 10*u);
    // Base — 4u wide × 1u tall stone footing
    ctx.fillStyle = '#252a28';
    ctx.fillRect(cx - 2*u, y + 14*u, 4*u, u);
    ctx.fillStyle = '#0e1212';
    ctx.fillRect(cx - 2*u, y + 15*u, 4*u, u);
    // Lantern body — 4u × 4u with hard outline + 3-tone interior
    ctx.fillStyle = '#0a0408';
    ctx.fillRect(cx - 2*u, y + 2*u, 4*u, 4*u);          // outline
    ctx.fillStyle = '#2a1808';
    ctx.fillRect(cx - 2*u, y + 2*u, 4*u, u);            // top
    ctx.fillRect(cx - 2*u, y + 5*u, 4*u, u);            // bottom
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(cx - 2*u, y + 3*u, u, 2*u);            // left bar
    ctx.fillRect(cx + u,   y + 3*u, u, 2*u);            // right bar
    // Flame — 2-frame animation (alternates shape)
    var flameFrame = Math.floor(time / 180) % 2;
    var flick = 0.85 + Math.sin(time / 200 + col) * 0.15;
    ctx.globalAlpha = flick;
    ctx.fillStyle = '#ffe080';
    if (flameFrame === 0) {
      ctx.fillRect(cx - u, y + 3*u, 2*u, 2*u);
      ctx.fillStyle = '#ffa040';
      ctx.fillRect(cx, y + 4*u, u, u);
    } else {
      ctx.fillRect(cx - u, y + 3*u, 2*u, u);
      ctx.fillRect(cx, y + 4*u, u, u);
      ctx.fillStyle = '#ffa040';
      ctx.fillRect(cx, y + 3*u, u, u);
    }
    ctx.globalAlpha = 1;
    // Halo — gradient (atmosphere overlay, allowed by spec)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.45 * flick;
    var grad = ctx.createRadialGradient(cx, y + 4*u, 0, cx, y + 4*u, 8*u);
    grad.addColorStop(0, 'rgba(255, 200, 100, 0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 4*u, y - 4*u, ts + 8*u, ts + 8*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Market cart — 3 wide × 2 tall, anchor at column index 1 (center).
  function drawMarketCartPng(ctx, x, y, ts, time, col, row) {
    drawCobblestone(ctx, x, y, ts, time, col, row);
    drawCobblestone(ctx, x + ts, y, ts, time, col + 1, row);
    BridgeSprites.draw(ctx, x, y, ts, 'market-cart', 3, 2, 1);
  }

  // Crates + barrels — 2 wide × 2 tall, anchor at column index 0 (left).
  function drawCratesBarrelsPng(ctx, x, y, ts, time, col, row) {
    drawCobblestone(ctx, x, y, ts, time, col, row);
    drawCobblestone(ctx, x + ts, y, ts, time, col + 1, row);
    BridgeSprites.draw(ctx, x, y, ts, 'crates-barrels', 2, 2, 0);
  }

  // Sorceress's tower — 3 wide × 5 tall, anchor at column index 1 (center).
  // Used in lumar-midnight where the saltstone-shore platform meets the sea.
  function drawSorceressTowerPng(ctx, x, y, ts, time, col, row) {
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);
    drawSaltstoneFloor(ctx, x + ts, y, ts, time, col + 1, row);
    BridgeSprites.draw(ctx, x, y, ts, 'sorceress-tower', 3, 5, 1);
  }

  // Hostile stone statue — squat humanoid carving with faintly glowing
  // amethyst eyes. Sits on a 2u plinth. Designed to read as Midnight Isle
  // sentinel: grim grey saltstone + a single magenta highlight.
  function drawStoneStatue(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var DARK = '#08080a';
    var SH   = '#181820';
    var MID  = '#2a2a30';
    var HI   = '#3e3e44';
    var EYE  = '#c060e0';
    var EYE_HI = '#ffa0ff';

    // Plinth (bottom 3u)
    ctx.fillStyle = DARK; ctx.fillRect(x + 2*u, y + 12*u, 12*u, 4*u);
    ctx.fillStyle = MID;  ctx.fillRect(x + 3*u, y + 12*u, 10*u, 3*u);
    ctx.fillStyle = HI;   ctx.fillRect(x + 3*u, y + 12*u, 10*u, 1*u);
    ctx.fillStyle = SH;   ctx.fillRect(x + 3*u, y + 15*u, 10*u, 1*u);

    // Torso (6u wide × 4u tall)
    ctx.fillStyle = DARK; ctx.fillRect(x + 4*u, y + 7*u, 8*u, 6*u);
    ctx.fillStyle = MID;  ctx.fillRect(x + 5*u, y + 7*u, 6*u, 5*u);
    ctx.fillStyle = HI;   ctx.fillRect(x + 5*u, y + 7*u, 6*u, 1*u);
    ctx.fillStyle = SH;   ctx.fillRect(x + 5*u, y + 11*u, 6*u, 1*u);

    // Head (4u wide × 3u tall)
    ctx.fillStyle = DARK; ctx.fillRect(x + 5*u, y + 3*u, 6*u, 4*u);
    ctx.fillStyle = MID;  ctx.fillRect(x + 6*u, y + 3*u, 4*u, 4*u);
    ctx.fillStyle = HI;   ctx.fillRect(x + 6*u, y + 3*u, 4*u, 1*u);

    // Eyes — faint pulse driven by time
    var pulse = 0.65 + 0.35 * Math.sin((time || 0) / 320);
    ctx.fillStyle = EYE;
    ctx.fillRect(x + 6*u, y + 5*u, 1*u, 1*u);
    ctx.fillRect(x + 9*u, y + 5*u, 1*u, 1*u);
    ctx.fillStyle = EYE_HI;
    ctx.globalAlpha = pulse;
    ctx.fillRect(x + 6*u, y + 5*u, 1*u, 1*u);
    ctx.fillRect(x + 9*u, y + 5*u, 1*u, 1*u);
    ctx.globalAlpha = 1;
  }

  // Shattered statue — what remains after the player kills a sentinel.
  // A low pile of broken stone fragments; walkable (collisions cleared
  // by killHostile). No glow.
  function drawStoneRubble(ctx, x, y, ts, time, col, row) {
    var u = ts / 16;
    var DARK = '#08080a';
    var SH   = '#181820';
    var MID  = '#2a2a30';
    var HI   = '#3e3e44';

    // Paint the floor underneath first — rubble is a pile on top of the
    // surrounding saltstone, not a void cell, so the surrounding pattern
    // must continue beneath it.
    drawSaltstoneFloor(ctx, x, y, ts, time, col, row);

    // Mound of broken chunks across the bottom 5u
    ctx.fillStyle = DARK; ctx.fillRect(x + 2*u, y + 11*u, 12*u, 5*u);
    ctx.fillStyle = MID;  ctx.fillRect(x + 3*u, y + 11*u, 10*u, 4*u);
    ctx.fillStyle = HI;   ctx.fillRect(x + 3*u, y + 11*u, 10*u, 1*u);

    // Scattered chunks above the base
    ctx.fillStyle = DARK; ctx.fillRect(x + 5*u, y + 9*u,  3*u, 2*u);
    ctx.fillStyle = MID;  ctx.fillRect(x + 5*u, y + 9*u,  3*u, 1*u);
    ctx.fillStyle = DARK; ctx.fillRect(x + 9*u, y + 10*u, 3*u, 1*u);
    ctx.fillStyle = SH;   ctx.fillRect(x + 9*u, y + 10*u, 3*u, 1*u);
  }

  BridgeWorld.registerTileset('lumar', {
    1: drawSaltstoneWall,
    2: drawSaltstoneFloor,
    3: drawDockPlanks,
    4: drawSporeSea,
    5: drawShore,
    6: drawSilverPost,
    7: drawSporeShore,
    8: drawBuilding,
    9: drawLantern,
    10: drawShipBody,
    11: drawShipCockpit,
    12: drawGuard,
    13: drawCrimsonSea,
    14: drawSapphireSea,
    15: drawRoseSea,
    16: drawMidnightSea,
    18: drawLighthouse,
    19: drawCrate,
    20: drawSaltCrystal,
    21: drawSmallRock,
    22: drawCrystal,
    23: drawMarketStall,
    24: drawWantedPoster,
    25: drawNpc,
    26: drawTavernEntrance,
    27: drawCaveEntranceWall,
    28: drawCobblestone,
    29: drawBellTower,
    30: drawFountain,
    31: drawBulletinBoard,
    32: drawFishingNet,
    33: drawCrabTrap,
    34: drawCaptainHouse,
    35: drawCaptainStatue,
    36: drawInnEntrance,
    37: drawFishMarket,
    38: drawLanternPost,
    39: drawTavernPng,
    40: drawInnPng,
    41: drawLighthousePng,
    42: drawSmithyPng,
    43: drawApothecaryPng,
    44: drawBakeryPng,
    45: drawFishmongerStallPng,
    46: drawShipDockPng,
    47: drawBlackCliff,
    48: drawCliffTrail,
    49: drawMarketCartPng,
    50: drawCratesBarrelsPng,
    51: drawSorceressTowerPng,
    60: drawStoneStatue,
    61: drawStoneRubble
  });

  BridgeWorld.registerBackground('lumar', drawLumarBackground);

  // Hostile-entity overlay: stone sentinels render at their current
  // pathfinding position instead of being baked into world.tiles, so
  // moving them doesn't leave a trail of restored cells behind.
  BridgeWorld.registerOverlay('lumar', function (ctx, world, offX, offY, ts, time) {
    if (!world || !world.interactions) return;
    for (var i = 0; i < world.interactions.length; i++) {
      var h = world.interactions[i];
      if (h.type !== 'hostile') continue;
      var drawer = (h.tileId === 60 || !h.tileId) ? drawStoneStatue : null;
      if (!drawer) continue;
      drawer(ctx, offX + h.x * ts, offY + h.y * ts, ts, time, h.x, h.y);
    }
  });

})();
