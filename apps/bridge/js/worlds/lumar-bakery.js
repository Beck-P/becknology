/**
 * Lumar Bakery interior.
 *
 * Warm bake shop: brick oven with animated firebox + heat shimmer, long
 * dough counter, bread display shelf, baker NPC kneading, flour sacks
 * on the floor, hanging baskets of bread.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1e1410'); g.addColorStop(1, '#160e08');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // Wall — cream plaster + dark timber framing (Tudor-ish).
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#e8d8b0'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#a89870'; ctx.fillRect(x, y, ts, u);
    // Timber framing
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x, y, ts, 2*u);
    ctx.fillRect(x, y + ts - 2*u, ts, 2*u);
    ctx.fillRect(x + 7*u, y, u, ts);
    // Diagonal brace
    var seed = (col * 17 + row * 31) % 4;
    if (seed === 0) {
      ctx.fillStyle = '#3a2410';
      for (var i = 0; i < 12; i++) {
        ctx.fillRect(x + i*u, y + (12 - i)*u, u, u);
      }
    }
  }

  // Floor — terracotta tile.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#5a3018'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#7a4830'; ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillStyle = '#7a4830'; ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    ctx.fillStyle = '#3a1810';
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // Flour dust (deterministic)
    var seed = (col * 23 + row * 11) % 9;
    if (seed === 0) { ctx.fillStyle = '#e8d8b0'; ctx.fillRect(x + 4*u, y + 9*u, u, u); }
    if (seed === 5) { ctx.fillStyle = '#e8d8b0'; ctx.fillRect(x + 11*u, y + 4*u, u, u); }
  }

  // Brick oven — wide arched mouth with hot flickering interior + heat shimmer.
  function drawOven(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#a04030'; ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Brick rows
    ctx.fillStyle = '#5a1810';
    for (var r2 = 0; r2 < 4; r2++) ctx.fillRect(x + u, y + (3 + r2 * 3)*u, ts - 2*u, u);
    // Arched mouth
    var mX = x + 3*u, mY = y + 7*u;
    var mW = 10*u, mH = 7*u;
    ctx.fillStyle = '#0a0408'; ctx.fillRect(mX, mY, mW, mH);
    // Fire inside
    var fp = 0.7 + Math.sin(t / 160) * 0.2 + Math.sin(t / 55) * 0.08;
    ctx.fillStyle = 'rgba(232, 100, 40, ' + fp.toFixed(2) + ')';
    ctx.fillRect(mX + u, mY + u, mW - 2*u, mH - 2*u);
    ctx.fillStyle = 'rgba(255, 180, 60, ' + (fp * 0.85).toFixed(2) + ')';
    ctx.fillRect(mX + 2*u, mY + 2*u, mW - 4*u, mH - 4*u);
    // Bread loaves inside (silhouettes)
    ctx.fillStyle = '#5a3018';
    ctx.fillRect(mX + 2*u, mY + 4*u, 2*u, u);
    ctx.fillRect(mX + 6*u, mY + 4*u, 2*u, u);
    // Stone arch above the mouth (1u brick row curved)
    ctx.fillStyle = '#7a3018';
    ctx.fillRect(x + 2*u, y + 6*u, 12*u, u);
    // Heat shimmer above oven — wavy vertical bars
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25 + Math.sin(t / 200) * 0.08;
    for (var s = 0; s < 5; s++) {
      var sx = x + (3 + s * 2) * u + Math.sin(t / 250 + s) * u;
      ctx.fillStyle = 'rgba(255, 180, 100, 0.5)';
      ctx.fillRect(Math.floor(sx), y - 3*u, u, 4*u);
    }
    ctx.restore();
    // Halo cast
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = fp * 0.4;
    var hg = ctx.createRadialGradient(x + ts/2, y + ts - 2*u, 0, x + ts/2, y + ts - 2*u, ts * 1.3);
    hg.addColorStop(0, 'rgba(255, 140, 60, 0.85)'); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x - ts * 0.5, y, ts * 2, ts * 1.5);
    ctx.restore();
  }

  // Long display counter with bread loaves.
  function drawDisplayCounter(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + u, y + u, ts - 2*u, u);
    // Bread loaves on top — 2-3 per tile, golden brown
    var loaves = [
      ['#c8783c', '#e8a050'],
      ['#a05030', '#c87040'],
      ['#d09050', '#f0b070']
    ];
    for (var i = 0; i < 3; i++) {
      var lc = loaves[(col * 5 + row * 3 + i) % loaves.length];
      var lx = x + (2 + i * 4) * u;
      var ly = y + 4*u;
      ctx.fillStyle = '#1a0a08'; ctx.fillRect(lx, ly, 3*u, 3*u);
      ctx.fillStyle = lc[0]; ctx.fillRect(lx, ly, 3*u, 3*u);
      ctx.fillStyle = lc[1]; ctx.fillRect(lx, ly, 3*u, u);
      // Slash on top
      ctx.fillStyle = '#5a2810';
      ctx.fillRect(lx + u, ly + u, u, u);
    }
    // Glass-front 1u line
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y + 8*u, ts, u);
  }

  // Dough table — flat wood with a lump of dough being kneaded.
  function drawDoughTable(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, 9*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, 8*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);
    // Flour dusting on top
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(x + 3*u, y + 7*u, 10*u, u);
    // Dough lump (slight knead pulse)
    var p = 1 + Math.sin(t / 380) * 0.05;
    var dW = Math.floor(5*u * p), dH = Math.floor(2*u * p);
    var dX = x + 8*u - Math.floor(dW / 2);
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(dX, y + 8*u, dW, dH + u);
    ctx.fillStyle = '#e8d8b0'; ctx.fillRect(dX, y + 8*u, dW, dH);
    ctx.fillStyle = '#f8f0d0'; ctx.fillRect(dX, y + 8*u, dW, 1);
    // Rolling pin
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 4*u, y + 11*u, 5*u, u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 3*u, y + 11*u, u, u);
    ctx.fillRect(x + 9*u, y + 11*u, u, u);
  }

  // Baker NPC — flour-dusted apron, baker's hat.
  function drawBaker(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    // Knead motion bob
    var bob = Math.sin(t / 300) > 0.5 ? -u : 0;
    // Baker's hat (tall white poof)
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + bob, 8*u, 2*u);
    ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + 4*u, y + bob, 8*u, u);
    ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + 5*u, y + bob - u, 6*u, u);
    // Hat band
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 2*u + bob, 8*u, u);
    // Head
    ctx.fillStyle = DK; ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    ctx.fillStyle = '#d8b890'; ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Big mustache
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 6*u, y + 5*u + bob, 4*u, u);
    // Body — flour-dusted apron
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + 5*u, y + 7*u + bob, 6*u, 4*u);
    ctx.fillStyle = '#e0d0a0'; ctx.fillRect(x + 5*u, y + 7*u + bob, 6*u, u);
    // Flour smudges
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 7*u, y + 8*u + bob, u, u);
    ctx.fillRect(x + 10*u, y + 9*u + bob, u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Flour sack pile.
  function drawFlourSack(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Two sacks stacked
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + 2*u, y + 8*u, 12*u, 7*u);
    ctx.fillStyle = '#e0d0a0'; ctx.fillRect(x + 2*u, y + 8*u, 6*u, 6*u);
    ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + 2*u, y + 8*u, 6*u, u);
    ctx.fillStyle = '#e0d0a0'; ctx.fillRect(x + 8*u, y + 9*u, 6*u, 6*u);
    ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + 8*u, y + 9*u, 6*u, u);
    // Tie at the top
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 4*u, y + 7*u, 2*u, u);
    ctx.fillRect(x + 10*u, y + 8*u, 2*u, u);
    // FLOUR label
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 3*u, y + 11*u, 4*u, u);
  }

  // Hanging bread basket — from a rope under the ceiling.
  function drawBreadBasket(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    // Rope
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + ts/2 - 1, y, 2, 4*u);
    // Basket
    var bcx = x + ts/2, by = y + 4*u;
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(bcx - 4*u, by, 8*u, 5*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(bcx - 4*u, by, 8*u, 4*u);
    ctx.fillStyle = '#7a5a30'; ctx.fillRect(bcx - 4*u, by, 8*u, u);
    // Loaves inside
    ctx.fillStyle = '#c8783c'; ctx.fillRect(bcx - 3*u, by + 2*u, 3*u, 2*u);
    ctx.fillStyle = '#a05030'; ctx.fillRect(bcx, by + 2*u, 3*u, 2*u);
    ctx.fillStyle = '#e8a050'; ctx.fillRect(bcx - 3*u, by + 2*u, 3*u, u);
    ctx.fillStyle = '#c87040'; ctx.fillRect(bcx, by + 2*u, 3*u, u);
  }

  // Window with warm-yellow glow.
  function drawWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 7*u);
    var t = time || 0;
    var p = 0.8 + Math.sin(t / 600 + col) * 0.12;
    ctx.fillStyle = 'rgba(255, 220, 120, ' + p.toFixed(2) + ')';
    ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, 5*u);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + ts/2 - 1, y + 4*u, 2, 7*u);
  }

  // Door / exit.
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

  BridgeWorld.registerTileset('lumar-bakery', {
    1: drawWall,
    2: drawFloor,
    3: drawOven,
    4: drawDisplayCounter,
    5: drawDoughTable,
    6: drawBaker,
    7: drawFlourSack,
    8: drawBreadBasket,
    9: drawWindow,
    10: drawDoor
  });

  BridgeWorld.registerBackground('lumar-bakery', drawBackground);
})();
