/**
 * Lumar Smithy interior.
 *
 * Hot forge: glowing furnace with animated flicker + sparks, anvil with
 * a half-finished blade, water trough (hisses when blade quenched),
 * tool wall, weapon rack, smith NPC swinging a hammer.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a0e08'); g.addColorStop(1, '#0e0606');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // Stone wall — soot-stained.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#1a1820'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#2a2830'; ctx.fillRect(x, y, ts, 5*u);
    ctx.fillStyle = '#3a3840'; ctx.fillRect(x, y, ts, u);
    // Brick mortar lines
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x, y + 5*u, ts, u);
    ctx.fillRect(x, y + 10*u, ts, u);
    var off1 = (row % 2 === 0) ? 8 : 4;
    var off2 = (row % 2 === 0) ? 4 : 12;
    ctx.fillRect(x + off1*u, y + u, u, 4*u);
    ctx.fillRect(x + off2*u, y + 6*u, u, 4*u);
    // Soot speck
    var seed = (col * 17 + row * 31) % 11;
    if (seed === 0) {
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x + 3*u, y + 8*u, 2*u, u);
    }
  }

  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#2a1810'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    ctx.fillStyle = '#15100a';
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // Soot smudge
    var seed = (col * 23 + row * 11) % 9;
    if (seed === 0) { ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 5*u, y + 11*u, 3*u, u); }
  }

  // Forge — large stone hearth, hot orange glow, animated sparks shooting up.
  function drawForge(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    // Stone hearth body
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Brick rows
    ctx.fillStyle = '#1a1820';
    for (var r2 = 0; r2 < 4; r2++) ctx.fillRect(x + u, y + (3 + r2 * 3)*u, ts - 2*u, u);
    // Forge mouth
    var mX = x + 2*u, mY = y + 5*u;
    var mW = 12*u, mH = 8*u;
    ctx.fillStyle = '#0a0408'; ctx.fillRect(mX, mY, mW, mH);
    // Coal interior with flicker
    var fp = 0.85 + Math.sin(t / 90) * 0.15 + Math.sin(t / 40) * 0.06;
    ctx.fillStyle = 'rgba(255, 80, 20, ' + fp.toFixed(2) + ')';
    ctx.fillRect(mX + u, mY + u, mW - 2*u, mH - 2*u);
    ctx.fillStyle = 'rgba(255, 200, 80, ' + (fp * 0.85).toFixed(2) + ')';
    ctx.fillRect(mX + 2*u, mY + 2*u, mW - 4*u, mH - 4*u);
    ctx.fillStyle = 'rgba(255, 255, 200, ' + (fp * 0.6).toFixed(2) + ')';
    ctx.fillRect(mX + 4*u, mY + 3*u, mW - 8*u, mH - 6*u);
    // Sparks shooting up out of the forge
    for (var s = 0; s < 5; s++) {
      var spP = (Math.floor(t / 70 + s * 13)) % 18;
      if (spP < 12) {
        var spx = mX + 2*u + ((s * 5 + 3) % (mW - 4*u));
        var spy = mY - spP * u;
        ctx.globalAlpha = Math.max(0, 0.9 - spP * 0.07);
        ctx.fillStyle = spP < 4 ? '#ffe080' : '#ff8040';
        ctx.fillRect(spx, spy, u, u);
      }
    }
    ctx.globalAlpha = 1;
    // Halo
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = fp * 0.55;
    var hg = ctx.createRadialGradient(x + ts/2, y + ts * 0.6, 0, x + ts/2, y + ts * 0.6, ts * 1.5);
    hg.addColorStop(0, 'rgba(255, 140, 60, 0.95)'); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x - ts * 0.6, y, ts * 2.2, ts * 1.6);
    ctx.restore();
  }

  // Anvil — heavy iron with half-finished blade glowing orange.
  function drawAnvil(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Stump base
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 4*u, y + 10*u, 8*u, 5*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 4*u, y + 10*u, 8*u, 4*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 4*u, y + 10*u, 8*u, u);
    // Anvil top (wide flat shape)
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 6*u, 12*u, 5*u);
    ctx.fillStyle = '#1a1820'; ctx.fillRect(x + 2*u, y + 6*u, 12*u, 4*u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 2*u, y + 6*u, 12*u, u);
    // Anvil horn (pointed left side)
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x, y + 7*u, 2*u, 3*u);
    ctx.fillStyle = '#1a1820'; ctx.fillRect(x, y + 7*u, 2*u, 2*u);
    // Hot blade resting on top
    var bp = 0.85 + Math.sin(t / 200) * 0.15;
    ctx.fillStyle = 'rgba(255, 120, 40, ' + bp.toFixed(2) + ')';
    ctx.fillRect(x + 3*u, y + 5*u, 8*u, u);
    ctx.fillStyle = 'rgba(255, 220, 100, ' + bp.toFixed(2) + ')';
    ctx.fillRect(x + 5*u, y + 5*u, 4*u, u);
    // Halo around blade
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = bp * 0.35;
    var hg = ctx.createRadialGradient(x + 7*u, y + 5*u, 0, x + 7*u, y + 5*u, 5*u);
    hg.addColorStop(0, 'rgba(255, 140, 60, 0.85)'); hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(x, y, ts, ts/2);
    ctx.restore();
  }

  // Water trough — wooden box with quench-water + occasional steam.
  function drawTrough(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Box
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + u, y + 6*u, 14*u, 9*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + 6*u, 14*u, 8*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + u, y + 6*u, 14*u, u);
    // Water
    ctx.fillStyle = '#1a3040'; ctx.fillRect(x + 2*u, y + 7*u, 12*u, 5*u);
    ctx.fillStyle = '#3a6070';
    ctx.fillRect(x + 2*u + Math.floor(Math.sin(t / 600) * 2) * u, y + 8*u, 4*u, u);
    // Steam puffs (when blade quenched, periodic)
    var steamPhase = (t % 6000);
    if (steamPhase < 1500) {
      var spu = Math.floor(steamPhase / 200);
      for (var s = 0; s < 3; s++) {
        var sx = x + (5 + s * 2) * u;
        var sy = y + 6*u - spu * u;
        if (sy > y - 4*u) {
          ctx.globalAlpha = Math.max(0, 0.6 - spu * 0.08);
          ctx.fillStyle = '#e0e8f0';
          ctx.fillRect(sx, sy, u, u);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // Tool wall — hammers, tongs, files hanging on pegs.
  function drawToolWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    // Peg board strip
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + 4*u, ts - 2*u, 8*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + u, y + 4*u, ts - 2*u, u);
    // Hanging tools
    // Hammer
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y + 5*u, u, 5*u);
    ctx.fillStyle = '#1a1820'; ctx.fillRect(x + u, y + 5*u, 3*u, 2*u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + u, y + 5*u, 3*u, u);
    // Tongs
    ctx.fillStyle = '#1a1820';
    ctx.fillRect(x + 7*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 8*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 6*u, y + 10*u, 4*u, u);
    // File
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 12*u, y + 5*u, u, 5*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 12*u, y + 10*u, u, 2*u);
  }

  // Weapon rack — finished swords leaning against a wood frame.
  function drawWeaponRack(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Rack frame
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 2*u, 12*u, 12*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y + 2*u, 12*u, 11*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2*u, y + 2*u, 12*u, u);
    // Sword 1
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 4*u, y + 4*u, u, 8*u);
    ctx.fillStyle = '#5a5858'; ctx.fillRect(x + 4*u, y + 4*u, u, u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 3*u, y + 11*u, 3*u, u);
    // Sword 2
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 8*u, y + 5*u, u, 7*u);
    ctx.fillStyle = '#5a5858'; ctx.fillRect(x + 8*u, y + 5*u, u, u);
    ctx.fillStyle = '#a08040'; ctx.fillRect(x + 7*u, y + 11*u, 3*u, u);
    // Axe
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 12*u, y + 4*u, u, 8*u);
    ctx.fillStyle = '#1a1820'; ctx.fillRect(x + 11*u, y + 4*u, 3*u, 2*u);
    ctx.fillStyle = '#3a3838'; ctx.fillRect(x + 11*u, y + 4*u, 3*u, u);
  }

  // Blacksmith NPC — burly, leather apron, hammer over shoulder, swinging.
  function drawSmith(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    // Hammer swing — alternating bob
    var swing = Math.sin(t / 280);
    var bob = swing > 0.5 ? -u : 0;
    // Hair / beard
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, 2*u);
    ctx.fillStyle = DK; ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 5*u);
    ctx.fillStyle = '#c08070'; ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 5*u, y + 5*u + bob, 6*u, 2*u);  // beard
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Body — leather apron + bare shoulders
    ctx.fillStyle = DK; ctx.fillRect(x + 4*u, y + 7*u + bob, 8*u, 5*u);
    ctx.fillStyle = '#c08070'; ctx.fillRect(x + 4*u, y + 7*u + bob, 8*u, u);  // shoulders
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 4*u, y + 8*u + bob, 8*u, 4*u);  // apron
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 4*u, y + 8*u + bob, 8*u, u);
    // Soot smudges
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 10*u + bob, 2*u, u);
    // Hammer in hand (swings position based on phase)
    var hx = swing > 0 ? x + 11*u : x + 3*u;
    ctx.fillStyle = '#3a2410'; ctx.fillRect(hx, y + 5*u + bob, u, 4*u);
    ctx.fillStyle = '#1a1820'; ctx.fillRect(hx - 1, y + 4*u + bob, u + 2, 2*u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 12*u + bob, 2*u, 3*u);
    ctx.fillRect(x + 9*u, y + 12*u + bob, 2*u, 3*u);
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Door / exit.
  function drawDoor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, ts - 4*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    // Iron bands
    ctx.fillStyle = '#1a1820';
    ctx.fillRect(x + u, y + 5*u, ts - 2*u, u);
    ctx.fillRect(x + u, y + 10*u, ts - 2*u, u);
    var t = time || 0;
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(255, 200, 100, ' + (0.55 + bob * 0.2).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + ts - 4*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 9*u, y + ts - 3*u, u, u);
  }

  // Window — fogged by heat.
  function drawWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 7*u);
    ctx.fillStyle = '#3a3060'; ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, 5*u);
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + ts/2 - 1, y + 4*u, 2, 7*u);
  }

  BridgeWorld.registerTileset('lumar-smithy', {
    1: drawWall,
    2: drawFloor,
    3: drawForge,
    4: drawAnvil,
    5: drawTrough,
    6: drawSmith,
    7: drawToolWall,
    8: drawWeaponRack,
    9: drawWindow,
    10: drawDoor
  });

  BridgeWorld.registerBackground('lumar-smithy', drawBackground);
})();
