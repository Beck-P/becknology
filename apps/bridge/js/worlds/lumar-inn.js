/**
 * Lumar Inn — Blue Lantern Inn interior.
 *
 * Warm lobby: reception counter with brass bell, fireplace at the back
 * (animated firebox + chimney smoke pulse), guest tables with food, two
 * patrons seated, stairs to "upper floor" (decorative — railing only),
 * innkeeper behind the counter, sconces on the walls.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#160e08');
    g.addColorStop(1, '#0c0806');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // Interior wall — warm wood panelling, dark beam top.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#1a1008'; ctx.fillRect(x, y, ts, 2*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x, y + 2*u, ts, u);
    // Vertical wood planks
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x + 4*u, y + 3*u, u, ts - 4*u);
    ctx.fillRect(x + 8*u, y + 3*u, u, ts - 4*u);
    ctx.fillRect(x + 12*u, y + 3*u, u, ts - 4*u);
    // Bottom baseboard
    ctx.fillStyle = '#1a1008'; ctx.fillRect(x, y + ts - u, ts, u);
    // Wall sconce — occasional
    var seed = (col * 17 + row * 31) % 11;
    if (seed === 0) {
      var t = time || 0;
      var p = 0.75 + Math.sin(t / 380 + col * 1.3) * 0.18;
      ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 7*u, y + 8*u, 2*u, 4*u);
      ctx.fillStyle = '#a08040'; ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = p * 0.55;
      var sc = ctx.createRadialGradient(x + 8*u, y + 9*u, 0, x + 8*u, y + 9*u, 5*u);
      sc.addColorStop(0, 'rgba(255, 220, 140, 0.85)'); sc.addColorStop(1, 'transparent');
      ctx.fillStyle = sc; ctx.fillRect(x, y + 5*u, ts, 10*u);
      ctx.restore();
    }
  }

  // Wood plank floor.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x, y, ts, u);
    // Plank seams
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x, y + 5*u, ts, u);
    ctx.fillRect(x, y + 11*u, ts, u);
    // Nails
    var seed = (col * 23 + row * 17) % 9;
    if (seed === 0) { ctx.fillStyle = '#5a4828'; ctx.fillRect(x + 3*u, y + 6*u, u, u); }
  }

  // Long reception counter with brass bell.
  function drawCounter(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    ctx.fillStyle = '#0e0808'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + u, y + u, ts - 2*u, u);
    // Top edge (south side — counter front)
    ctx.fillStyle = '#1a1008'; ctx.fillRect(x, y + ts - 2*u, ts, 2*u);
    // Item on top — bell or ledger
    var item = (col * 7 + row * 11) % 4;
    if (item === 0) {
      // Brass bell
      ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 6*u, y + 2*u, 4*u, 5*u);
      ctx.fillStyle = '#a08040'; ctx.fillRect(x + 6*u, y + 3*u, 4*u, 4*u);
      ctx.fillStyle = '#e0c060'; ctx.fillRect(x + 6*u, y + 3*u, 4*u, u);
      ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
      // Catch-light glint
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 7*u, y + 4*u, u, u);
    } else if (item === 2) {
      // Open ledger
      ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 4*u, y + 3*u, 8*u, 5*u);
      ctx.fillStyle = '#e0d8b0'; ctx.fillRect(x + 4*u, y + 3*u, 8*u, 4*u);
      ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 8*u - 1, y + 3*u, 2, 4*u);
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 5*u, y + 4*u, 2*u, 1);
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 9*u, y + 4*u, 2*u, 1);
    }
    // Faint counter underglow
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
    ctx.fillRect(x, y + ts - 2*u, ts, 4*u);
    ctx.restore();
  }

  // Fireplace — brick arch with animated firebox.
  function drawFireplace(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    // Brick frame
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#5a3030'; ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Brick rows
    ctx.fillStyle = '#3a1818';
    for (var r2 = 0; r2 < 4; r2++) ctx.fillRect(x + u, y + (3 + r2 * 3)*u, ts - 2*u, u);
    // Mantel
    ctx.fillStyle = '#1a1008'; ctx.fillRect(x, y + ts/2 - u, ts, u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x, y + ts/2, ts, 2*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x, y + ts/2, ts, u);
    // Firebox opening
    var fbX = x + 4*u, fbY = y + ts/2 + 3*u;
    var fbW = ts - 8*u, fbH = ts/2 - 4*u;
    ctx.fillStyle = '#0a0408'; ctx.fillRect(fbX, fbY, fbW, fbH);
    // Fire — flickering rectangle + ember dots
    var fp = 0.7 + Math.sin(t / 180) * 0.18 + Math.sin(t / 60) * 0.08;
    ctx.fillStyle = 'rgba(232, 100, 40, ' + fp.toFixed(2) + ')';
    ctx.fillRect(fbX + u, fbY + u, fbW - 2*u, fbH - 2*u);
    ctx.fillStyle = 'rgba(255, 180, 60, ' + (fp * 0.85).toFixed(2) + ')';
    ctx.fillRect(fbX + 2*u, fbY + 2*u, fbW - 4*u, fbH - 3*u);
    // Embers
    for (var e = 0; e < 4; e++) {
      var ep = (Math.floor(t / 220 + e * 7)) % 12;
      if (ep < 8) {
        var ex = fbX + u + ((e * 3 + 1) % (fbW / u - 2)) * u;
        var ey = fbY + fbH - 2*u - ep * (u * 0.5);
        ctx.globalAlpha = Math.max(0, 0.7 - ep * 0.08);
        ctx.fillStyle = '#ffe080'; ctx.fillRect(ex, ey, u, u);
      }
    }
    ctx.globalAlpha = 1;
    // Halo cast
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = fp * 0.4;
    var hg = ctx.createRadialGradient(x + ts/2, y + ts - 4*u, 0, x + ts/2, y + ts - 4*u, ts * 1.2);
    hg.addColorStop(0, 'rgba(255, 140, 60, 0.85)'); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x - ts * 0.5, y, ts * 2, ts * 1.4);
    ctx.restore();
  }

  // Guest table with two chairs + plate of food.
  function drawTable(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Table top
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, 7*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, 6*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);
    // Plate of food
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 6*u, y + 7*u, 4*u, 3*u);
    ctx.fillStyle = '#e0d8b0'; ctx.fillRect(x + 6*u, y + 7*u, 4*u, 2*u);
    ctx.fillStyle = '#a04040'; ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    // Two chairs (visible at the sides)
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + u, y + 7*u, 2*u, 3*u);
    ctx.fillRect(x + 13*u, y + 7*u, 2*u, 3*u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + u, y + 7*u, 2*u, u);
    ctx.fillRect(x + 13*u, y + 7*u, 2*u, u);
    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 3*u, y + 12*u, 10*u, u);
  }

  // Innkeeper NPC — apron, jovial.
  function drawInnkeeper(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    var bob = Math.sin(t / 900) > 0.85 ? -u : 0;
    // Hair / hat
    ctx.fillStyle = DK; ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, u);
    // Head
    ctx.fillStyle = DK; ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = '#d8b890'; ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Big rosy cheeks
    ctx.fillStyle = '#c08070';
    ctx.fillRect(x + 5*u, y + 5*u + bob, u, u);
    ctx.fillRect(x + 10*u, y + 5*u + bob, u, u);
    // Body — apron
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = '#a04040'; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = '#e0d8b0'; ctx.fillRect(x + 5*u, y + 7*u + bob, 6*u, 4*u);  // apron
    ctx.fillStyle = '#a04040'; ctx.fillRect(x + 5*u, y + 7*u + bob, 6*u, u);    // apron top trim
    // Belt
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Legs + feet
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Patron NPC — seated, varied palettes.
  function drawPatron(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var PALS = [
      { suit: '#3a4858', light: '#5a6878', skin: '#c0a080', hair: '#1a0e08' },
      { suit: '#5a3a1a', light: '#7a5a30', skin: '#d8b890', hair: '#3a1818' },
      { suit: '#1a3040', light: '#3a5060', skin: '#e8d0b0', hair: '#1a0e08' }
    ];
    var pal = PALS[(col * 13 + row * 29) % PALS.length];
    var DK = '#0a0608';
    var bob = Math.sin(t / 1200 + col) > 0.85 ? -u : 0;
    ctx.fillStyle = pal.hair; ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    ctx.fillStyle = DK; ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = pal.skin; ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = pal.hair; ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = pal.suit; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = pal.light; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
    // Tankard in hand
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 11*u, y + 8*u + bob, 2*u, 3*u);
    ctx.fillStyle = '#a08040'; ctx.fillRect(x + 11*u, y + 8*u + bob, 2*u, u);
  }

  // Stair to upper floor (decorative — railing visible, treads going up off-map).
  function drawStairs(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Stair treads — pile of stepped planks going north
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y, 12*u, 13*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y, 12*u, 12*u);
    // Step highlights — going up (each step gets a brighter 1u top edge)
    for (var s = 0; s < 5; s++) {
      var sy = y + s * 2*u + u;
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(x + 2*u, sy, 12*u, u);
    }
    // Railings (vertical posts)
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + 2*u, y, u, 13*u);
    ctx.fillRect(x + 13*u, y, u, 13*u);
    // Up-arrow indicator (very subtle)
    var t = time || 0;
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(255, 220, 140, ' + (0.4 + bob * 0.15).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + 6*u, u, u);
    ctx.fillRect(x + 9*u, y + 6*u, u, u);
  }

  // Window — small with warm-yellow glow.
  function drawWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 7*u);
    var t = time || 0;
    var p = 0.78 + Math.sin(t / 600 + col) * 0.15;
    ctx.fillStyle = 'rgba(255, 220, 120, ' + p.toFixed(2) + ')';
    ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, 5*u);
    // Cross mullion
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + ts/2 - 1, y + 4*u, 2, 7*u);
    ctx.fillRect(x + 2*u, y + 7*u, ts - 4*u, 1);
    // Halo
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = p * 0.3;
    var hg = ctx.createRadialGradient(x + ts/2, y + 8*u, 0, x + ts/2, y + 8*u, ts * 0.9);
    hg.addColorStop(0, 'rgba(255, 220, 120, 0.7)'); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x - ts * 0.3, y, ts * 1.6, ts);
    ctx.restore();
  }

  // Door / exit threshold.
  function drawDoor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, ts - 4*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    var t = time || 0;
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(255, 220, 140, ' + (0.55 + bob * 0.2).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + ts - 4*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 9*u, y + ts - 3*u, u, u);
  }

  // Coat rack (decoration)
  function drawCoatRack(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, 12*u);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, 11*u);
    // Hooks
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 5*u, y + 4*u, 2*u, u);
    ctx.fillRect(x + 9*u, y + 4*u, 2*u, u);
    // Hanging coat
    ctx.fillStyle = '#3a4858';
    ctx.fillRect(x + 4*u, y + 5*u, 3*u, 5*u);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(x + 4*u, y + 5*u, 3*u, u);
    // Base
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x + 5*u, y + 14*u, 6*u, u);
  }

  BridgeWorld.registerTileset('lumar-inn', {
    1: drawWall,
    2: drawFloor,
    3: drawCounter,
    4: drawFireplace,
    5: drawTable,
    6: drawInnkeeper,
    7: drawPatron,
    8: drawStairs,
    9: drawWindow,
    10: drawDoor,
    11: drawCoatRack
  });

  BridgeWorld.registerBackground('lumar-inn', drawBackground);
})();
