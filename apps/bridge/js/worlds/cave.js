/**
 * Cave World Module — A dragon's cave beneath the spore sea.
 *
 * Red rocky walls, dark stone floor, glowing lava cracks, scattered
 * treasure, and a dragon at the back of the chamber.
 *
 * All drawers use strict 16-px-per-tile pixel art (whole-u rects only,
 * 3-tone shading, hard 1u outlines) per the spec in apps/bridge/CLAUDE.md.
 */
(function () {

  // Cave floor — strict pixel art. Dark uneven stone slabs with 1u dark
  // grout cross + deterministic 1u pebbles.
  function drawCaveFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    var BASE_A = '#2a1a18';
    var BASE_B = '#251614';
    var DARK = '#15080a';
    // Base
    ctx.fillStyle = (col + row) % 2 === 0 ? BASE_A : BASE_B;
    ctx.fillRect(x, y, ts, ts);
    // 1u dark grout cross
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 8*u - u, ts, u);
    ctx.fillRect(x + 8*u - u, y, u, ts);
    // Pebble specks (1u)
    if (seed % 5 === 0) {
      ctx.fillStyle = '#3a2018';
      ctx.fillRect(x + 4*u, y + 11*u, u, u);
      ctx.fillRect(x + 5*u, y + 11*u, u, u);
    }
    if (seed % 7 === 0) {
      ctx.fillStyle = '#5a3020';
      ctx.fillRect(x + 11*u, y + 3*u, u, u);
      ctx.fillRect(x + 12*u, y + 3*u, u, u);
    }
    if (seed % 11 === 3) {
      ctx.fillStyle = '#3a2018';
      ctx.fillRect(x + 2*u, y + 5*u, u, u);
    }
  }

  // Cave wall — strict pixel art. Dark red stone with hard 4u cap, 1u
  // mortar courses, irregular 1-2u rocky bumps deterministic per seed.
  function drawCaveWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 19 + row * 31) % 100;
    var DARK = '#1a0808';
    var STONE_DK = '#2a0a0a';
    var STONE = '#3a1a14';
    var STONE_HI = '#4a2418';
    var BUMP_HI = '#5a2818';
    // 4u cap
    ctx.fillStyle = STONE_DK;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = STONE_HI;
    ctx.fillRect(x, y, ts, u);
    // 12u body
    ctx.fillStyle = STONE;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    // 1u mortar lines
    ctx.fillStyle = DARK;
    ctx.fillRect(x, y + 9*u, ts, u);
    ctx.fillRect(x, y + 13*u, ts, u);
    // Brick offsets
    var off1 = (row % 2 === 0) ? 6 : 3;
    ctx.fillRect(x + off1*u, y + 5*u, u, 4*u);
    ctx.fillRect(x + (16 - off1)*u, y + 10*u, u, 3*u);
    ctx.fillRect(x + 8*u, y + 14*u, u, 2*u);
    // Bumps (1-2u darker patches)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + (seed % 7)*u, y + 7*u, 2*u, u);
    ctx.fillRect(x + ((seed * 3) % 6)*u + 4*u, y + 11*u, 2*u, u);
    ctx.fillStyle = BUMP_HI;
    ctx.fillRect(x + ((seed * 5) % 5)*u + 2*u, y + 6*u, u, u);
  }

  // Lava crack — strict pixel art. 1u outline + 3-tone gradient lava
  // (atmospheric halo allowed via gradient).
  function drawLavaCrack(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var pulse = 0.7 + Math.sin(time / 400 + col + row) * 0.3;
    // Halo (atmospheric — gradient allowed)
    ctx.globalCompositeOperation = 'screen';
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts);
    grad.addColorStop(0, 'rgba(255, 100, 40, ' + (pulse * 0.6).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    // Crack outline (12u × 4u)
    ctx.fillStyle = '#1a0606';
    ctx.fillRect(x + 2*u, y + 6*u, 12*u, 4*u);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff6020';
    ctx.fillRect(x + 3*u, y + 7*u, 10*u, 2*u);
    ctx.fillStyle = '#ffa040';
    ctx.fillRect(x + 4*u, y + 7*u, 8*u, u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 6*u, y + 8*u, 4*u, u);
    ctx.globalAlpha = 1;
    // Embers (1u, animated frame-stepped)
    var t = Math.floor(time / 100);
    for (var s = 0; s < 3; s++) {
      var sx = x + ((s * 7 + t + col * 3) % 14)*u;
      var sy = y + 4*u + ((s * 11 + Math.floor(t/2)) % 4)*u;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffa040';
      ctx.fillRect(sx, sy, u, u);
    }
    ctx.globalAlpha = 1;
  }

  // Dragon — strict pixel art. Stepped silhouette across 3-tile horizontal
  // span. Whole-u rects only.
  // Dragon — 3 wide × 2 tall, anchor at column index 1 (middle of the
  // existing 3-wide hoard nook). PNG, loaded once on first tile draw.
  BridgeSprites.load('dragon', '/bridge/assets/creatures/dragon.png', 96);
  function drawDragon(ctx, x, y, ts, time, col, row) {
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    BridgeSprites.draw(ctx, x, y, ts, 'dragon', 3, 2, 1);
  }

  // Cave entrance — strict pixel art. Stepped arch back to the surface
  // with daylight bleed. Atmospheric gradient allowed for the light.
  function drawCaveEntrance(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var DARK = '#1a0808';
    var INNER = '#3a2818';
    var STONE = '#3a1a14';
    var STONE_HI = '#5a2818';
    // Stepped arch (whole-u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 2*u, 6*u, u);
    ctx.fillRect(x + 4*u, y + 3*u, 8*u, u);
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, u);
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, 11*u);
    // Inner daylight
    ctx.fillStyle = INNER;
    ctx.fillRect(x + 6*u, y + 3*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, u);
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, 8*u);
    // Light leak (atmospheric — gradient allowed)
    var pulse = 0.7 + Math.sin(time / 1500) * 0.15;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var grad = ctx.createRadialGradient(x + ts/2, y + 5*u, 0, x + ts/2, y + 5*u, ts * 0.9);
    grad.addColorStop(0, 'rgba(255,210,140,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.3, y - ts*0.3, ts * 1.6, ts * 1.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Stone steps (each 1u tall)
    ctx.fillStyle = STONE;
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, u);
    ctx.fillRect(x + 4*u, y + 11*u, 8*u, u);
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, u);
    ctx.fillStyle = STONE_HI;
    ctx.fillRect(x + 3*u, y + 9*u, 10*u, u);
    ctx.fillRect(x + 4*u, y + 11*u, 8*u, u);
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, u);
  }

  // Treasure pile — strict pixel art. Stepped gold pile with 1u accent
  // coins + 1u red gem.
  function drawTreasure(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#2a1a04';
    var GOLD_DK = '#806020';
    var GOLD = '#c8a040';
    var GOLD_HI = '#e8c860';
    var GOLD_GLINT = '#ffe080';
    // Gold pile — stepped pyramid (12u → 8u → 4u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 11*u, 12*u, 4*u);
    ctx.fillStyle = GOLD_DK;
    ctx.fillRect(x + 2*u, y + 11*u, 12*u, 3*u);
    ctx.fillStyle = GOLD;
    ctx.fillRect(x + 4*u, y + 9*u, 8*u, 2*u);
    ctx.fillStyle = GOLD_HI;
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 2*u);
    // 1u top highlight on each layer
    ctx.fillStyle = GOLD_HI;
    ctx.fillRect(x + 2*u, y + 11*u, 12*u, u);
    ctx.fillRect(x + 4*u, y + 9*u, 8*u, u);
    ctx.fillStyle = GOLD_GLINT;
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    // Individual coins (1u glint twinkles)
    var twinkle = Math.sin(time / 300 + col + row);
    ctx.fillStyle = twinkle > 0.7 ? GOLD_GLINT : GOLD_HI;
    ctx.fillRect(x + 5*u, y + 8*u, u, u);
    ctx.fillRect(x + 9*u, y + 6*u, u, u);
    ctx.fillRect(x + 11*u, y + 9*u, u, u);
    // Gem — stepped pyramid
    ctx.fillStyle = '#3a0820';
    ctx.fillRect(x + 10*u, y + 5*u, u, 1*u);
    ctx.fillRect(x + 9*u, y + 6*u, 3*u, 2*u);
    ctx.fillStyle = '#a02050';
    ctx.fillRect(x + 10*u, y + 5*u, u, u);
    ctx.fillRect(x + 9*u, y + 6*u, 3*u, u);
    ctx.fillStyle = '#ff5080';
    ctx.fillRect(x + 10*u, y + 5*u, u, u);
  }

  // Stalagmite — strict pixel art. Stepped pyramid 1u → 3u → 5u.
  function drawStalagmite(ctx, x, y, ts, time, col, row) {
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0808';
    var STONE = '#3a1a14';
    var STONE_HI = '#5a2818';
    // Stepped pyramid (whole-u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 1*u);
    ctx.fillRect(x + 6*u, y + 4*u, 4*u, 2*u);
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, 8*u);
    ctx.fillStyle = STONE;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 1*u);
    ctx.fillRect(x + 6*u, y + 4*u, 4*u, 2*u);
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, 7*u);
    // 1u front highlight column
    ctx.fillStyle = STONE_HI;
    ctx.fillRect(x + 7*u, y + 3*u, u, u);
    ctx.fillRect(x + 6*u, y + 4*u, u, 2*u);
    ctx.fillRect(x + 5*u, y + 6*u, u, 7*u);
  }

  function drawCaveBackground(ctx, w, h, time) {
    ctx.fillStyle = '#1a0a08';
    ctx.fillRect(0, 0, w, h);
    var grad = ctx.createLinearGradient(0, h * 0.5, 0, h);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(140, 40, 20, 0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Lava pool — strict pixel art. Stepped concentric bands of 3-tone lava
  // colors, atmospheric halo, 1u animated bubbles.
  function drawLavaPool(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var pulse = 0.7 + Math.sin(time / 350 + col + row) * 0.3;
    // Halo
    ctx.globalCompositeOperation = 'screen';
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 1.4);
    grad.addColorStop(0, 'rgba(255, 100, 40, ' + (pulse * 0.7).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    // Stepped concentric pool (16u → 14u → 12u → 8u → 4u)
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(x + u, y + u, 14*u, 14*u);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff6020';
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 12*u);
    ctx.fillStyle = '#ffa040';
    ctx.fillRect(x + 4*u, y + 4*u, 8*u, 8*u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 6*u, y + 6*u, 4*u, 4*u);
    ctx.globalAlpha = 1;
    // Bubble (1u, frame-stepped)
    var bubbleX = x + ((Math.floor(time / 80) + col * 7) % 14 + 1) * u;
    var bubbleY = y + ((Math.floor(time / 60) + row * 3) % 14 + 1) * u;
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(bubbleX, bubbleY, u, u);
  }

  // Skeleton — strict pixel art. Stepped skull + 1u bone bands.
  function drawSkeleton(ctx, x, y, ts, time, col, row) {
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0808';
    var BONE_DK = '#a89870';
    var BONE = '#d8c8a0';
    var BONE_HI = '#f0e0b0';
    // Skull outline (5u × 4u stepped circle)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, 1*u);
    ctx.fillRect(x + 5*u, y + 3*u, 6*u, 4*u);
    // Skull body
    ctx.fillStyle = BONE;
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 3*u, 6*u, 3*u);
    ctx.fillStyle = BONE_HI;
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, u);   // 1u top highlight
    // Eye sockets (1u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 4*u, u, u);
    ctx.fillRect(x + 9*u, y + 4*u, u, u);
    // Jaw (4u × 1u darker)
    ctx.fillStyle = BONE_DK;
    ctx.fillRect(x + 6*u, y + 6*u, 4*u, u);
    // Teeth (1u dark dashes)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 6*u, u, u);
    ctx.fillRect(x + 9*u, y + 6*u, u, u);
    // Spine (1u verticals, 5 segments)
    ctx.fillStyle = BONE;
    for (var s = 0; s < 5; s++) {
      ctx.fillRect(x + 7*u, y + (8 + s)*u, 2*u, u);
    }
    // Ribs (1u horizontal bands)
    ctx.fillStyle = BONE_DK;
    ctx.fillRect(x + 4*u, y + 8*u, 8*u, u);
    ctx.fillRect(x + 4*u, y + 10*u, 8*u, u);
    ctx.fillRect(x + 4*u, y + 12*u, 8*u, u);
    // Arm bones (2u × 1u each)
    ctx.fillStyle = BONE;
    ctx.fillRect(x + 3*u, y + 8*u, 2*u, u);
    ctx.fillRect(x + 11*u, y + 8*u, 2*u, u);
  }

  // Ore vein — strict pixel art. 1-2u gold patches in cave wall.
  function drawOreVein(ctx, x, y, ts, time, col, row) {
    drawCaveWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var positions = [
      [3, 5, '#e8c860'],
      [4, 6, '#ffd870'],
      [6, 7, '#e8c860'],
      [9, 4, '#ffd870'],
      [11, 8, '#c8a040'],
      [8, 11, '#e8c860'],
      [5, 10, '#ffd870']
    ];
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      // 1u outline
      ctx.fillStyle = '#3a2810';
      ctx.fillRect(x + (p[0] - 1) * u, y + p[1] * u, 3*u, u);
      // Body
      ctx.fillStyle = p[2];
      ctx.fillRect(x + p[0] * u, y + p[1] * u, 2*u, u);
      // 1u highlight
      ctx.fillStyle = '#ffe080';
      ctx.fillRect(x + p[0] * u, y + p[1] * u, u, u);
    }
  }

  // Wooden support — strict pixel art. 1u-wide vertical posts + 1u
  // horizontal beam + stepped diagonal cross-braces. Whole-u rects only.
  function drawWoodenSupport(ctx, x, y, ts, time, col, row) {
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0e08';
    var WOOD = '#3a2410';
    var WOOD_HI = '#5a3a1a';
    var IRON = '#1a1a1e';
    // Vertical posts (1u wide, full height)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y, 2*u, ts);
    ctx.fillRect(x + 12*u, y, 2*u, ts);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 2*u, y, u, ts);
    ctx.fillRect(x + 12*u, y, u, ts);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 2*u, y, u, ts);
    ctx.fillRect(x + 12*u, y, u, ts);
    // Top beam (12u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y, 12*u, 2*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + 2*u, y, 12*u, u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + 2*u, y, 12*u, u);
    // Diagonal cross-braces (stepped 1u stair)
    ctx.fillStyle = WOOD;
    for (var d = 0; d < 5; d++) {
      ctx.fillRect(x + (4 + d)*u, y + (2 + d)*u, u, u);
      ctx.fillRect(x + (12 - d)*u, y + (2 + d)*u, u, u);
    }
    // Iron bolts (1u)
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 3*u, y, u, u);
    ctx.fillRect(x + 12*u, y, u, u);
  }

  // Glow mushroom — strict pixel art. Stepped purple cap on 2u stem,
  // 1u yellow spots, atmospheric halo.
  function drawGlowMushroom(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var pulse = 0.7 + Math.sin(time / 800 + col + row) * 0.3;
    var DARK = '#1a0a20';
    var STEM_DK = '#8a7a60';
    var STEM = '#a89880';
    var STEM_HI = '#c8b8a0';
    var CAP_DK = '#601890';
    var CAP = '#a060d0';
    var CAP_HI = '#e0a0f8';
    // Mushroom #1 — large central
    // Stem (2u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 8*u, 2*u, 5*u);
    ctx.fillStyle = STEM;
    ctx.fillRect(x + 6*u, y + 8*u, 2*u, 5*u);
    ctx.fillStyle = STEM_HI;
    ctx.fillRect(x + 6*u, y + 8*u, u, 5*u);   // 1u left highlight
    // Cap — stepped 4u → 6u → 4u
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 5*u, 4*u, u);
    ctx.fillRect(x + 4*u, y + 6*u, 6*u, 2*u);
    ctx.fillStyle = CAP;
    ctx.fillRect(x + 5*u, y + 5*u, 4*u, u);
    ctx.fillRect(x + 4*u, y + 6*u, 6*u, 2*u);
    ctx.fillStyle = CAP_HI;
    ctx.globalAlpha = pulse;
    ctx.fillRect(x + 5*u, y + 5*u, 4*u, u);
    ctx.globalAlpha = 1;
    // Yellow spots (1u)
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 5*u, y + 6*u, u, u);
    ctx.fillRect(x + 8*u, y + 6*u, u, u);
    ctx.fillRect(x + 6*u, y + 7*u, u, u);
    // Mushroom #2 — small side
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 11*u, y + 11*u, u, 3*u);
    ctx.fillRect(x + 10*u, y + 9*u, 3*u, 2*u);
    ctx.fillStyle = STEM;
    ctx.fillRect(x + 11*u, y + 11*u, u, 3*u);
    ctx.fillStyle = CAP;
    ctx.fillRect(x + 10*u, y + 9*u, 3*u, 2*u);
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x + 10*u, y + 9*u, 3*u, u);
    // Halo (atmospheric)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.3;
    var grad = ctx.createRadialGradient(x + 7*u, y + 7*u, 0, x + 7*u, y + 7*u, ts);
    grad.addColorStop(0, 'rgba(180, 100, 240, 0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.3, y - ts*0.3, ts * 1.6, ts * 1.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Dragon egg — strict pixel art. Stepped oval egg in nest of dark twigs.
  function drawDragonEgg(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0606';
    var NEST_DK = '#1a0808';
    var NEST = '#3a2410';
    var EGG_DK = '#3a0808';
    var EGG = '#702018';
    var EGG_HI = '#a04030';
    var HOTSPOT = '#c06060';
    // Nest — stepped oval (12u → 10u)
    ctx.fillStyle = NEST_DK;
    ctx.fillRect(x + 2*u, y + 11*u, 12*u, 3*u);
    ctx.fillStyle = NEST;
    ctx.fillRect(x + 3*u, y + 11*u, 10*u, 2*u);
    // Twig texture (1u dashes)
    ctx.fillStyle = NEST_DK;
    ctx.fillRect(x + 4*u, y + 12*u, 2*u, u);
    ctx.fillRect(x + 8*u, y + 12*u, 2*u, u);
    ctx.fillRect(x + 11*u, y + 12*u, u, u);
    // Egg outline (stepped 6u tall × 5u wide)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y + 4*u, 4*u, 1*u);
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, 7*u);
    // Egg body
    ctx.fillStyle = EGG;
    ctx.fillRect(x + 6*u, y + 4*u, 4*u, u);
    ctx.fillRect(x + 5*u, y + 5*u, 6*u, 6*u);
    // Egg pattern (1u darker bands)
    ctx.fillStyle = EGG_HI;
    ctx.fillRect(x + 6*u, y + 6*u, 2*u, u);
    ctx.fillRect(x + 9*u, y + 8*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + 9*u, 3*u, u);
    // 1u left highlight
    var pulse = 0.7 + Math.sin(time / 600) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = HOTSPOT;
    ctx.fillRect(x + 6*u, y + 5*u, u, 4*u);
    ctx.globalAlpha = 1;
    // Inner glow (atmospheric)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.35;
    var grad = ctx.createRadialGradient(x + ts/2, y + 8*u, 0, x + ts/2, y + 8*u, ts * 0.7);
    grad.addColorStop(0, 'rgba(255, 80, 40, 0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 2*u, y - 2*u, ts + 4*u, ts + 4*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  BridgeWorld.registerTileset('cave', {
    1: drawCaveWall,
    2: drawCaveFloor,
    3: drawCaveEntrance,
    4: drawLavaCrack,
    5: drawDragon,
    6: drawTreasure,
    7: drawStalagmite,
    8: drawLavaPool,
    9: drawSkeleton,
    10: drawOreVein,
    11: drawWoodenSupport,
    12: drawGlowMushroom,
    13: drawDragonEgg
  });

  BridgeWorld.registerBackground('cave', drawCaveBackground);

})();
