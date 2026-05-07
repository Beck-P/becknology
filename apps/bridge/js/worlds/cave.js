/**
 * Cave World Module — A dragon's cave beneath the spore sea.
 *
 * Red rocky walls, dark stone floor, glowing lava cracks, scattered
 * treasure, and a dragon at the back of the chamber.
 */
(function () {

  function drawCaveFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 23 + row * 17) % 100;
    // Dark uneven stone
    var base = (col + row) % 2 === 0 ? '#2a1a18' : '#251614';
    ctx.fillStyle = base;
    ctx.fillRect(x, y, ts, ts);
    // Cracks/grout
    ctx.fillStyle = '#15080a';
    ctx.fillRect(x, y + Math.floor(ts/2) - Math.max(1, u * 0.3), ts, Math.max(1, u * 0.5));
    ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.3), y, Math.max(1, u * 0.5), ts);
    // Speckle pebbles
    if (seed % 5 === 0) {
      ctx.fillStyle = '#3a2018';
      ctx.fillRect(x + 4*u, y + 11*u, 2*u, Math.max(1, u * 0.7));
    }
    if (seed % 7 === 0) {
      ctx.fillStyle = '#5a3020';
      ctx.fillRect(x + 11*u, y + 3*u, Math.max(1, u * 1.5), Math.max(1, u * 0.7));
    }
  }

  function drawCaveWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = (col * 19 + row * 31) % 100;
    // Dark red stone
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(x, y, ts, Math.floor(ts * 0.3));
    ctx.fillStyle = '#3a1a14';
    ctx.fillRect(x, y + Math.floor(ts * 0.3), ts, ts - Math.floor(ts * 0.3));
    // Cap highlight
    ctx.fillStyle = '#4a2418';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.5));
    // Rocky bumps (irregular)
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(x + (seed % 7)*u, y + Math.floor(ts * 0.5), Math.max(1, u * 1.4), Math.max(1, u * 0.6));
    ctx.fillRect(x + ((seed * 3) % 6) * u + 4*u, y + Math.floor(ts * 0.7), Math.max(1, u * 1.6), Math.max(1, u * 0.5));
    ctx.fillStyle = '#5a2818';
    ctx.fillRect(x + ((seed * 5) % 5) * u + 2*u, y + Math.floor(ts * 0.4), Math.max(1, u * 1.2), Math.max(1, u * 0.4));
  }

  function drawLavaCrack(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Pulsing lava in the floor crack
    var pulse = 0.7 + Math.sin(time / 400 + col + row) * 0.3;
    // Halo first
    ctx.globalCompositeOperation = 'screen';
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts);
    grad.addColorStop(0, 'rgba(255, 100, 40, ' + (pulse * 0.6).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    // Crack shape
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, 4*u);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(x + 3*u, y + 7*u, ts - 6*u, 2*u);
    ctx.fillStyle = '#ffc060';
    ctx.fillRect(x + 4*u, y + Math.floor(7.5*u), ts - 8*u, Math.max(1, u));
    ctx.globalAlpha = 1;
    // Specks of ember
    var t = Math.floor(time / 100);
    for (var s = 0; s < 3; s++) {
      var sx = x + ((s * 7 + t + col * 3) % 14)*u;
      var sy = y + 4*u + ((s * 11 + Math.floor(t/2)) % 4)*u;
      ctx.fillStyle = 'rgba(255, 180, 80, ' + (Math.random() * 0.7 + 0.3).toFixed(2) + ')';
      ctx.fillRect(sx, sy, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    }
  }

  function drawDragon(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Anchor draws the full dragon across this 3x2 area centered on (col, row)
    var areaW = ts * 3;
    var areaH = ts * 2;
    // Body breathing
    var bob = Math.sin(time / 1200) > 0 ? 0 : -Math.max(1, u * 0.5);
    // Body — long red form
    ctx.fillStyle = '#702018';
    ctx.fillRect(x, y + 6*u + bob, areaW, areaH - 8*u);
    // Body highlight
    ctx.fillStyle = '#902820';
    ctx.fillRect(x, y + 6*u + bob, areaW, Math.max(1, u * 0.8));
    // Head (left side)
    ctx.fillStyle = '#702018';
    ctx.fillRect(x, y + 4*u + bob, ts, 8*u);
    // Snout
    ctx.fillStyle = '#902820';
    ctx.fillRect(x - 2*u, y + 7*u + bob, 4*u, 4*u);
    // Eye glow
    var eye = 0.7 + Math.sin(time / 400) * 0.3;
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(x + 4*u, y + 6*u + bob, 0, x + 4*u, y + 6*u + bob, 3*u);
    glow.addColorStop(0, 'rgba(255, 200, 60, ' + eye.toFixed(2) + ')');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, areaW, areaH);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 4*u, y + 6*u + bob, Math.max(1, u * 1.4), Math.max(1, u * 1.4));
    // Horns
    ctx.fillStyle = '#3a1010';
    ctx.fillRect(x + 3*u, y + 2*u + bob, Math.max(1, u * 0.8), 3*u);
    ctx.fillRect(x + 6*u, y + 2*u + bob, Math.max(1, u * 0.8), 3*u);
    // Tail (right side)
    ctx.fillStyle = '#702018';
    ctx.fillRect(x + areaW - 3*u, y + 7*u + bob, 4*u, 4*u);
    ctx.fillRect(x + areaW - 1*u, y + 8*u + bob, 3*u, 2*u);
    // Spines along back
    ctx.fillStyle = '#3a1010';
    for (var sp = 0; sp < 6; sp++) {
      ctx.fillRect(x + (4 + sp * 4)*u, y + 5*u + bob, Math.max(1, u * 0.8), 2*u);
    }
    // Wing tucked
    ctx.fillStyle = '#5a1810';
    ctx.beginPath();
    ctx.moveTo(x + 10*u, y + 6*u + bob);
    ctx.lineTo(x + 18*u, y + 5*u + bob);
    ctx.lineTo(x + 18*u, y + 9*u + bob);
    ctx.lineTo(x + 12*u, y + 10*u + bob);
    ctx.closePath();
    ctx.fill();
  }

  function drawCaveEntrance(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Floor base
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    // Cave-mouth arch back to the surface — a bright opening framed by rock
    ctx.fillStyle = '#1a0808';
    ctx.beginPath();
    ctx.moveTo(x + 2*u, y + ts - 2*u);
    ctx.lineTo(x + 2*u, y + 4*u);
    ctx.quadraticCurveTo(x + ts/2, y, x + ts - 2*u, y + 4*u);
    ctx.lineTo(x + ts - 2*u, y + ts - 2*u);
    ctx.closePath();
    ctx.fill();
    // Daylight inside the arch (the way out)
    var pulse = 0.7 + Math.sin(time / 1500) * 0.15;
    ctx.fillStyle = '#3a2818';
    ctx.beginPath();
    ctx.moveTo(x + 3*u, y + ts - 3*u);
    ctx.lineTo(x + 3*u, y + 5*u);
    ctx.quadraticCurveTo(x + ts/2, y + 2*u, x + ts - 3*u, y + 5*u);
    ctx.lineTo(x + ts - 3*u, y + ts - 3*u);
    ctx.closePath();
    ctx.fill();
    // Light leaking down the steps
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var grad = ctx.createRadialGradient(x + ts/2, y + 5*u, 0, x + ts/2, y + 5*u, ts * 0.9);
    grad.addColorStop(0, 'rgba(255,210,140,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.3, y - ts*0.3, ts * 1.6, ts * 1.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Stone steps leading UP into the arch
    var stepW1 = ts - 6*u, stepW2 = ts - 8*u, stepW3 = ts - 10*u;
    ctx.fillStyle = '#3a1a14';
    ctx.fillRect(x + 3*u, y + 8*u, stepW1, Math.max(1, u * 1.2));
    ctx.fillRect(x + 4*u, y + 11*u, stepW2, Math.max(1, u * 1.2));
    ctx.fillRect(x + 5*u, y + ts - 2*u, stepW3, Math.max(1, u * 1.2));
    // Step highlights
    ctx.fillStyle = '#5a2818';
    ctx.fillRect(x + 3*u, y + 8*u, stepW1, Math.max(1, u * 0.4));
    ctx.fillRect(x + 4*u, y + 11*u, stepW2, Math.max(1, u * 0.4));
    ctx.fillRect(x + 5*u, y + ts - 2*u, stepW3, Math.max(1, u * 0.4));
  }

  function drawTreasure(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Pile of gold coins
    ctx.fillStyle = '#806020';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 12*u, 6*u, Math.max(1, u * 1.4), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8a040';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 11*u, 5*u, Math.max(1, u * 1.2), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c860';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 10*u, 3*u, Math.max(1, u * 0.7), 0, 0, Math.PI * 2);
    ctx.fill();
    // Individual coins
    var twinkle = Math.sin(time / 300 + col + row);
    ctx.fillStyle = twinkle > 0.7 ? '#ffe080' : '#c8a040';
    ctx.fillRect(x + 5*u, y + 8*u, Math.max(1, u * 1.5), Math.max(1, u * 0.8));
    ctx.fillRect(x + 8*u, y + 7*u, Math.max(1, u * 1.5), Math.max(1, u * 0.8));
    ctx.fillRect(x + 10*u, y + 9*u, Math.max(1, u * 1.2), Math.max(1, u * 0.7));
    // Gem
    ctx.fillStyle = '#a02050';
    ctx.beginPath();
    ctx.moveTo(x + Math.floor(ts * 0.65), y + 5*u);
    ctx.lineTo(x + Math.floor(ts * 0.7), y + 8*u);
    ctx.lineTo(x + Math.floor(ts * 0.6), y + 8*u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5080';
    ctx.fillRect(x + Math.floor(ts * 0.63), y + 5*u, Math.max(1, u * 0.5), 2*u);
  }

  function drawStalagmite(ctx, x, y, ts, time, col, row) {
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Pointed stone rising from floor
    ctx.fillStyle = '#3a1a14';
    ctx.beginPath();
    ctx.moveTo(x + ts/2, y + 3*u);
    ctx.lineTo(x + ts/2 + 3*u, y + 13*u);
    ctx.lineTo(x + ts/2 - 3*u, y + 13*u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a2818';
    ctx.beginPath();
    ctx.moveTo(x + ts/2, y + 3*u);
    ctx.lineTo(x + ts/2 + Math.max(1, u), y + 13*u);
    ctx.lineTo(x + ts/2 - Math.max(1, u), y + 13*u);
    ctx.closePath();
    ctx.fill();
  }

  function drawCaveBackground(ctx, w, h, time) {
    ctx.fillStyle = '#1a0a08';
    ctx.fillRect(0, 0, w, h);
    // Subtle ember warmth at the bottom (lava glow up from below)
    var grad = ctx.createLinearGradient(0, h * 0.5, 0, h);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(140, 40, 20, 0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawLavaPool(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var pulse = 0.7 + Math.sin(time / 350 + col + row) * 0.3;
    // Halo first
    ctx.globalCompositeOperation = 'screen';
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 1.4);
    grad.addColorStop(0, 'rgba(255, 100, 40, ' + (pulse * 0.7).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    // Pool of lava covers most of tile
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff6020';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    ctx.fillStyle = '#ffa040';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 6*u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 5*u, y + 5*u, ts - 10*u, ts - 10*u);
    ctx.globalAlpha = 1;
    // Bubbles
    var bubbleX = x + ((time / 80 + col * 7) % 14) * u;
    var bubbleY = y + ((time / 60 + row * 3) % 14) * u;
    ctx.fillStyle = '#ff8030';
    ctx.fillRect(bubbleX, bubbleY, Math.max(1, u * 0.6), Math.max(1, u * 0.6));
  }

  function drawSkeleton(ctx, x, y, ts, time, col, row) {
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Skull
    ctx.fillStyle = '#d8c8a0';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 4*u, Math.max(1, u * 2.4), Math.max(1, u * 2), 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye sockets
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + Math.max(1, 3.5*u), Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    ctx.fillRect(x + Math.floor(ts * 0.55), y + Math.max(1, 3.5*u), Math.max(1, u * 0.7), Math.max(1, u * 0.7));
    // Jaw
    ctx.fillStyle = '#a89870';
    ctx.fillRect(x + Math.floor(ts * 0.42), y + Math.max(1, 4.5*u), Math.max(1, u * 2), Math.max(1, u * 0.6));
    // Spine
    ctx.fillStyle = '#d8c8a0';
    for (var s = 0; s < 5; s++) {
      ctx.fillRect(x + Math.floor(ts/2) - Math.max(1, u * 0.5), y + (6 + s) * u, Math.max(1, u), Math.max(1, u * 0.6));
    }
    // Ribs
    ctx.fillStyle = '#a89870';
    for (var rb = 0; rb < 3; rb++) {
      ctx.fillRect(x + 4*u, y + (7 + rb) * u, ts - 8*u, Math.max(1, u * 0.4));
    }
    // Arm bones
    ctx.fillStyle = '#d8c8a0';
    ctx.fillRect(x + 3*u, y + 8*u, 2*u, Math.max(1, u * 0.7));
    ctx.fillRect(x + ts - 5*u, y + 8*u, 2*u, Math.max(1, u * 0.7));
  }

  function drawOreVein(ctx, x, y, ts, time, col, row) {
    drawCaveWall(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Glittering gold vein in the rock
    var positions = [
      { x: 3, y: 5, c: '#e8c860' },
      { x: 4, y: 6, c: '#ffd870' },
      { x: 6, y: 7, c: '#e8c860' },
      { x: 9, y: 4, c: '#ffd870' },
      { x: 11, y: 8, c: '#c8a040' },
      { x: 8, y: 11, c: '#e8c860' },
      { x: 5, y: 10, c: '#ffd870' }
    ];
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      ctx.fillStyle = p.c;
      ctx.fillRect(x + p.x * u, y + p.y * u, Math.max(1, u * 1.2), Math.max(1, u * 0.7));
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + p.x * u, y + p.y * u, Math.max(1, u * 0.4), Math.max(1, u * 0.3));
    }
  }

  function drawWoodenSupport(ctx, x, y, ts, time, col, row) {
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Vertical posts on both sides
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2*u, y, Math.max(1, u * 1.4), ts);
    ctx.fillRect(x + ts - 3*u, y, Math.max(1, u * 1.4), ts);
    // Highlight
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 2*u, y, Math.max(1, u * 0.5), ts);
    ctx.fillRect(x + ts - 3*u, y, Math.max(1, u * 0.5), ts);
    // Horizontal beam at top
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + u, y, ts - 2*u, Math.max(1, u * 1.4));
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + u, y, ts - 2*u, Math.max(1, u * 0.5));
    // Diagonal cross-braces
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = Math.max(1, u * 0.7);
    ctx.beginPath();
    ctx.moveTo(x + 3*u, y + 2*u);
    ctx.lineTo(x + ts - 3*u, y + 6*u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + ts - 3*u, y + 2*u);
    ctx.lineTo(x + 3*u, y + 6*u);
    ctx.stroke();
    // Iron bolts
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 3*u, y + Math.max(1, u * 0.4), Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    ctx.fillRect(x + ts - 4*u, y + Math.max(1, u * 0.4), Math.max(1, u * 0.5), Math.max(1, u * 0.5));
  }

  function drawGlowMushroom(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var pulse = 0.7 + Math.sin(time / 800 + col + row) * 0.3;
    // Mushroom #1 (large, center)
    // Stem
    ctx.fillStyle = '#a89880';
    ctx.fillRect(x + 6*u, y + 8*u, 2*u, 5*u);
    // Cap
    ctx.fillStyle = '#a060d0';
    ctx.beginPath();
    ctx.ellipse(x + 7*u, y + 7*u, Math.max(1, u * 3), Math.max(1, u * 1.7), 0, 0, Math.PI * 2);
    ctx.fill();
    // Cap highlight
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#e0a0f8';
    ctx.beginPath();
    ctx.ellipse(x + 7*u, y + Math.max(1, 6.5*u), Math.max(1, u * 2.5), Math.max(1, u * 1), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Spots
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 5*u, y + 7*u, Math.max(1, u * 0.6), Math.max(1, u * 0.6));
    ctx.fillRect(x + 8*u, y + 7*u, Math.max(1, u * 0.6), Math.max(1, u * 0.6));
    ctx.fillRect(x + 7*u, y + 6*u, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    // Mushroom #2 (small, side)
    ctx.fillStyle = '#a89880';
    ctx.fillRect(x + 11*u, y + 11*u, Math.max(1, u * 1), 3*u);
    ctx.fillStyle = '#a060d0';
    ctx.beginPath();
    ctx.ellipse(x + 11*u + Math.max(1, u * 0.5), y + 10*u, Math.max(1, u * 1.5), Math.max(1, u), 0, 0, Math.PI * 2);
    ctx.fill();
    // Halo
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

  function drawDragonEgg(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawCaveFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Nest of dark twigs
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 11*u, 6*u, Math.max(1, u * 2), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(x + 3*u, y + 11*u, ts - 6*u, Math.max(1, u * 0.7));
    // Egg
    var pulse = 0.7 + Math.sin(time / 600) * 0.3;
    ctx.fillStyle = '#702018';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + 8*u, Math.max(1, u * 2.5), Math.max(1, u * 3.5), 0, 0, Math.PI * 2);
    ctx.fill();
    // Egg pattern
    ctx.fillStyle = '#a04030';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 6*u, Math.max(1, u * 1.2), Math.max(1, u * 0.5));
    ctx.fillRect(x + Math.floor(ts * 0.5), y + 8*u, Math.max(1, u * 1), Math.max(1, u * 0.5));
    ctx.fillRect(x + Math.floor(ts * 0.42), y + 9*u, Math.max(1, u * 1.5), Math.max(1, u * 0.5));
    // Highlight
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#c06060';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 6*u, Math.max(1, u * 0.6), Math.max(1, u * 1));
    ctx.globalAlpha = 1;
    // Inner glow
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
