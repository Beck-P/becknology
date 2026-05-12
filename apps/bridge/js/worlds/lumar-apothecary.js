/**
 * Lumar Apothecary interior.
 *
 * Witchy herb shop: bubbling cauldron with green steam, wall of glowing
 * jars (colour cycle), hanging herb bundles from rafters, workbench with
 * mortar & pestle, witchy NPC, candle on a small altar.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0e0a14'); g.addColorStop(1, '#06040a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // Wall — dark wood plank.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#1a0e14'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#2a1a20'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3a2830'; ctx.fillRect(x, y, ts, u);
    ctx.fillStyle = '#0e0608';
    ctx.fillRect(x + 5*u, y, u, ts);
    ctx.fillRect(x + 11*u, y, u, ts);
    // Mossy patch (occasional)
    var seed = (col * 17 + row * 31) % 13;
    if (seed === 0) {
      ctx.fillStyle = '#1a3018';
      ctx.fillRect(x + 2*u, y + 10*u, 3*u, 2*u);
      ctx.fillStyle = '#3a5030';
      ctx.fillRect(x + 2*u, y + 10*u, 3*u, u);
    }
  }

  // Floor — dark stained wood.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#1a0e14'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#2a1a20'; ctx.fillRect(x, y, ts, u);
    ctx.fillStyle = '#0e0608';
    ctx.fillRect(x, y + 5*u, ts, u);
    ctx.fillRect(x, y + 11*u, ts, u);
  }

  // Cauldron — wide black pot with bubbling green liquid + rising green smoke.
  function drawCauldron(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Pot body
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, 9*u);
    ctx.fillStyle = '#1a1820'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, 8*u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 2*u, y + 5*u, u, 7*u);
    ctx.fillStyle = '#0e0608'; ctx.fillRect(x + 13*u, y + 5*u, u, 7*u);
    // Rim
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + u, y + 4*u, 14*u, 2*u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + u, y + 4*u, 14*u, u);
    // Handles
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x, y + 6*u, 2*u, 2*u);
    ctx.fillRect(x + 14*u, y + 6*u, 2*u, 2*u);
    // Green liquid surface — animated bubbles
    ctx.fillStyle = '#1a3018';
    ctx.fillRect(x + 3*u, y + 6*u, 10*u, 2*u);
    ctx.fillStyle = '#3a6030';
    ctx.fillRect(x + 3*u + Math.floor(Math.sin(t / 700) * 2) * u, y + 7*u, 4*u, u);
    for (var b = 0; b < 4; b++) {
      var bp = ((Math.floor(t / 180) + b * 7) % 14);
      var bx = x + (4 + (b * 2) % 8) * u;
      var by = y + 7*u - Math.floor(bp / 3) * u;
      if (bp < 9) {
        ctx.globalAlpha = 0.7 - bp * 0.07;
        ctx.fillStyle = '#a0e860';
        ctx.fillRect(bx, by, u, u);
      }
    }
    ctx.globalAlpha = 1;
    // Green steam rising
    for (var s = 0; s < 6; s++) {
      var sx = x + (4 + (s % 3) * 3) * u;
      var phase = (Math.floor(t / 130 + s * 5)) % 16;
      var sy = y + 4*u - phase * u;
      if (phase < 13) {
        ctx.globalAlpha = Math.max(0, 0.55 - phase * 0.04 - (s >= 3 ? 0.12 : 0));
        ctx.fillStyle = s % 2 === 0 ? '#80c060' : '#a0e890';
        var puff = (phase < 4) ? 1 : 2;
        ctx.fillRect(sx, sy, u * puff, u * puff);
      }
    }
    ctx.globalAlpha = 1;
    // Warm fire under cauldron (orange glow + black logs)
    var fp = 0.7 + Math.sin(t / 280) * 0.2;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = fp * 0.45;
    var hg = ctx.createRadialGradient(x + ts/2, y + 13*u, 0, x + ts/2, y + 13*u, 9*u);
    hg.addColorStop(0, 'rgba(255, 140, 60, 0.85)'); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x - 2*u, y + 8*u, ts + 4*u, ts/2);
    ctx.restore();
  }

  // Wall jar shelf — 3 rows of glowing jars with colour cycle.
  function drawJarShelf(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Shelf
    ctx.fillStyle = '#0e0608'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, 12*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + 7*u, ts - 2*u, u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + 12*u, ts - 2*u, u);
    // Jars on each row, cycling colours
    var phase = (t / 3000 + col * 0.3) % 3;
    var ROW_COLS = [
      ['#a040c0', '#c860e0'], ['#5cc8d0', '#90e0e8'], ['#c8a840', '#e8c870'], ['#5ac070', '#80e890'], ['#d04080', '#f060a0']
    ];
    for (var sh = 0; sh < 2; sh++) {
      var sy = y + (3 + sh * 5) * u;
      for (var j = 0; j < 4; j++) {
        var jx = x + (1 + j * 3) * u;
        var ix = (col * 11 + sh * 7 + j) % ROW_COLS.length;
        var ix2 = (ix + Math.floor(phase)) % ROW_COLS.length;
        var c = ROW_COLS[ix2];
        ctx.fillStyle = '#0a0608'; ctx.fillRect(jx, sy, 2*u, 4*u);
        ctx.fillStyle = c[0]; ctx.fillRect(jx, sy + u, 2*u, 3*u);
        ctx.fillStyle = c[1]; ctx.fillRect(jx, sy + u, 2*u, u);
        // Cork on top
        ctx.fillStyle = '#3a2410'; ctx.fillRect(jx, sy, 2*u, u);
      }
    }
    // Halo
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.22 + Math.sin(t / 700) * 0.06;
    var hg = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts);
    var halo = phase < 1 ? 'rgba(232, 80, 220, 0.5)' : (phase < 2 ? 'rgba(120, 220, 232, 0.45)' : 'rgba(255, 200, 80, 0.45)');
    hg.addColorStop(0, halo); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x - ts*0.3, y, ts * 1.6, ts);
    ctx.restore();
  }

  // Workbench with mortar and pestle + open book.
  function drawWorkbench(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 6*u, 12*u, 8*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y + 6*u, 12*u, 7*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2*u, y + 6*u, 12*u, u);
    // Mortar and pestle
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 3*u, y + 7*u, 4*u, 4*u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 3*u, y + 7*u, 4*u, 3*u);
    ctx.fillStyle = '#5a5858'; ctx.fillRect(x + 3*u, y + 7*u, 4*u, u);
    ctx.fillStyle = '#5a3018'; ctx.fillRect(x + 4*u, y + 8*u, 2*u, u);  // herbs inside
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 6*u, y + 6*u, u, 4*u);  // pestle handle
    // Open spellbook
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 8*u, y + 7*u, 5*u, 5*u);
    ctx.fillStyle = '#e0d8b0'; ctx.fillRect(x + 8*u, y + 7*u, 5*u, 4*u);
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 10*u, y + 7*u, 1, 4*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 9*u, y + 8*u, 1, 1);  // text dot
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 11*u, y + 8*u, 1, 1);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 9*u, y + 9*u, 2, 1);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 11*u, y + 9*u, 2, 1);
  }

  // Apothecary NPC — hooded witch with green-tinted skin.
  function drawWitch(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    var bob = Math.sin(t / 1100) > 0.85 ? -u : 0;
    // Tall pointed hat
    ctx.fillStyle = DK; ctx.fillRect(x + 7*u, y + bob - u, 2*u, u);
    ctx.fillStyle = DK; ctx.fillRect(x + 6*u, y + bob, 4*u, u);
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, 2*u);
    ctx.fillStyle = '#2a1830'; ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, u);
    // Hat band
    ctx.fillStyle = '#a08040'; ctx.fillRect(x + 4*u, y + 2*u + bob, 8*u, u);
    // Head (slight green tint)
    ctx.fillStyle = DK; ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    ctx.fillStyle = '#a8c890'; ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Mouth (small grin)
    ctx.fillStyle = DK; ctx.fillRect(x + 7*u, y + 5*u + bob, 2*u, 1);
    // Robe
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = '#2a1830'; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = '#5a3060'; ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Pendant
    ctx.fillStyle = '#a040c0'; ctx.fillRect(x + 7*u, y + 7*u + bob, 2*u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Hanging herb bundles from ceiling.
  function drawHangingHerbs(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    // Beam
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(x, y + 2*u, ts, u);
    // Rope hangers
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 3*u, y + 3*u, 1, 2*u);
    ctx.fillRect(x + 8*u, y + 3*u, 1, 2*u);
    ctx.fillRect(x + 12*u, y + 3*u, 1, 2*u);
    // Herb bundles
    var HERBS = [['#5a3060', '#a040c0'], ['#3a5018', '#5a8030'], ['#806020', '#a08840']];
    var positions = [3, 8, 12];
    for (var i = 0; i < positions.length; i++) {
      var c = HERBS[(col + i) % HERBS.length];
      var hx = x + (positions[i] - 1) * u;
      var hy = y + 5*u;
      ctx.fillStyle = '#0a0608'; ctx.fillRect(hx, hy, 3*u, 6*u);
      ctx.fillStyle = c[0]; ctx.fillRect(hx, hy, 3*u, 5*u);
      ctx.fillStyle = c[1]; ctx.fillRect(hx, hy, 3*u, u);
      // Tied at the top
      ctx.fillStyle = '#3a2410'; ctx.fillRect(hx + u, hy, u, u);
    }
  }

  // Candle on small altar.
  function drawCandle(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Stone altar
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 5*u, y + 8*u, 6*u, 6*u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 5*u, y + 8*u, 6*u, 5*u);
    ctx.fillStyle = '#5a5858'; ctx.fillRect(x + 5*u, y + 8*u, 6*u, u);
    // Candle holder
    ctx.fillStyle = '#a08040'; ctx.fillRect(x + 7*u, y + 5*u, 2*u, 4*u);
    // Candle (wax)
    ctx.fillStyle = '#e0d8b0'; ctx.fillRect(x + 7*u, y + 3*u, 2*u, 3*u);
    // Wick
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 8*u - 1, y + 2*u, 1, u);
    // Flame (animated)
    var fp = 0.85 + Math.sin(t / 90) * 0.15;
    ctx.fillStyle = 'rgba(255, 220, 140, ' + fp.toFixed(2) + ')';
    ctx.fillRect(x + 7*u + 1, y + u + Math.floor(Math.sin(t/120)*0.5), u, 2*u);
    ctx.fillStyle = 'rgba(255, 140, 60, ' + (fp * 0.85).toFixed(2) + ')';
    ctx.fillRect(x + 7*u + 1, y + 2*u, u, u);
    // Glow
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = fp * 0.4;
    var hg = ctx.createRadialGradient(x + 8*u, y + 2*u, 0, x + 8*u, y + 2*u, ts);
    hg.addColorStop(0, 'rgba(255, 220, 140, 0.8)'); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x - ts * 0.3, y - ts * 0.3, ts * 1.6, ts);
    ctx.restore();
  }

  // Window
  function drawWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 7*u);
    var t = time || 0;
    var phase = (t / 4000 + col) % 3;
    var glass = phase < 1 ? '#3a1840' : (phase < 2 ? '#181a40' : '#1a3040');
    ctx.fillStyle = glass;
    ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, 5*u);
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + ts/2 - 1, y + 4*u, 2, 7*u);
  }

  function drawDoor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#2a1830'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, ts - 4*u);
    ctx.fillStyle = '#5a3060'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    var t = time || 0;
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(200, 140, 232, ' + (0.55 + bob * 0.2).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + ts - 4*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 9*u, y + ts - 3*u, u, u);
  }

  BridgeWorld.registerTileset('lumar-apothecary', {
    1: drawWall,
    2: drawFloor,
    3: drawCauldron,
    4: drawJarShelf,
    5: drawWorkbench,
    6: drawWitch,
    7: drawHangingHerbs,
    8: drawCandle,
    9: drawWindow,
    10: drawDoor
  });

  BridgeWorld.registerBackground('lumar-apothecary', drawBackground);
})();
