/**
 * Tech Repair Shop — Arcadia interior.
 *
 * Cluttered electronics workshop. Pegboard wall hung with tools, a long
 * workbench piled with circuit boards and a soldering iron whose tip
 * glows red and emits smoke wisps, parts bins behind the bench, a
 * half-disassembled hover-drone on a stand, a diagnostic terminal with
 * scrolling text, technician with welding goggles, and overhead work
 * lamps casting hard cones of light.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a14');
    grad.addColorStop(1, '#080812');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Wall — pegboard with hanging tool silhouettes.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DK = '#0a0a14';
    var BASE = '#3a2818';
    var BASE_HI = '#5a3a1a';
    var DOT = '#1a0e08';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = BASE_HI;
    ctx.fillRect(x, y, ts, u);
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + ts - u, ts, u);
    // Pegboard dot grid (1u dots)
    ctx.fillStyle = DOT;
    for (var pr = 0; pr < 4; pr++) {
      for (var pc = 0; pc < 4; pc++) {
        ctx.fillRect(x + (2 + pc * 4) * u, y + (3 + pr * 3) * u, 1, 1);
      }
    }
    // Hanging tool (deterministic per col/row): screwdriver, wrench, pliers
    var tool = (col * 17 + row * 31) % 5;
    ctx.fillStyle = '#1a1a26';
    if (tool === 0) {
      // Screwdriver (vertical, yellow handle)
      ctx.fillRect(x + 7*u, y + 3*u, 2*u, 4*u);
      ctx.fillStyle = '#c8a840';
      ctx.fillRect(x + 7*u, y + 3*u, 2*u, 2*u);
      ctx.fillStyle = '#a0a0b0';
      ctx.fillRect(x + 7*u, y + 5*u, 2*u, 2*u);
    } else if (tool === 2) {
      // Wrench (horizontal)
      ctx.fillRect(x + 3*u, y + 4*u, 8*u, 2*u);
      ctx.fillStyle = '#a0a0b0';
      ctx.fillRect(x + 3*u, y + 4*u, 8*u, u);
    } else if (tool === 4) {
      // Pliers (vertical)
      ctx.fillRect(x + 7*u, y + 4*u, 2*u, 5*u);
      ctx.fillStyle = '#a04040';
      ctx.fillRect(x + 7*u, y + 7*u, 2*u, 2*u);
    }
  }

  // Workshop floor — concrete with oil splotches.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#1e1c20';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#252128';
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    ctx.fillStyle = '#15131a';
    ctx.fillRect(x + 7*u, y, u, ts);
    ctx.fillRect(x, y + 7*u, ts, u);
    // Oil stain
    var s = (col * 23 + row * 11) % 13;
    if (s === 0) {
      ctx.fillStyle = '#0a0e10';
      ctx.fillRect(x + 4*u, y + 9*u, 4*u, 3*u);
      ctx.fillStyle = '#15181a';
      ctx.fillRect(x + 4*u, y + 9*u, 4*u, u);
    } else if (s === 5) {
      ctx.fillStyle = '#0a0e10';
      ctx.fillRect(x + 11*u, y + 4*u, 3*u, 2*u);
    }
    // Stray screw
    if ((col + row) % 9 === 0) {
      ctx.fillStyle = '#a0a0b0';
      ctx.fillRect(x + 12*u, y + 12*u, u, u);
    }
  }

  // Workbench — long with circuit board, soldering iron (animated glow + smoke wisp).
  function drawWorkbench(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    var DK = '#0a0a14';
    var TOP = '#3a2410';
    var TOP_HI = '#5a3a1a';
    var EDGE = '#2a3848';
    drawFloor(ctx, x, y, ts, time, col, row);
    // Bench top
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + 4*u, ts, ts - 6*u);
    ctx.fillStyle = TOP;
    ctx.fillRect(x, y + 4*u, ts, ts - 7*u);
    ctx.fillStyle = TOP_HI;
    ctx.fillRect(x, y + 4*u, ts, u);
    // Edge cyan strip — diagnostic LED
    ctx.fillStyle = EDGE;
    ctx.fillRect(x, y + ts - 3*u, ts, u);
    var pulse = 0.7 + Math.sin(t / 600 + col * 0.3) * 0.2;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(120, 220, 232, 0.85)';
    ctx.fillRect(x, y + ts - 3*u, ts, 1);
    ctx.restore();
    // Items on bench (deterministic per col)
    var item = (col * 7 + row * 11) % 5;
    if (item === 0) {
      // Circuit board with chips
      ctx.fillStyle = '#0e2010';
      ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 6*u);
      ctx.fillStyle = '#1a4020';
      ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 5*u);
      // Chips
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(x + 4*u, y + 6*u, 3*u, 2*u);
      ctx.fillRect(x + 9*u, y + 7*u, 2*u, 2*u);
      // LED dots
      ctx.fillStyle = 'rgba(255, 80, 80, ' + (0.7 + Math.sin(t/300) * 0.3).toFixed(2) + ')';
      ctx.fillRect(x + 4*u, y + 5*u, u, u);
      ctx.fillStyle = 'rgba(120, 220, 232, ' + (0.7 + Math.sin(t/280 + 1) * 0.3).toFixed(2) + ')';
      ctx.fillRect(x + ts - 5*u, y + 9*u, u, u);
      // Solder traces
      ctx.fillStyle = '#a08040';
      ctx.fillRect(x + 4*u, y + 8*u, 7*u, 1);
    } else if (item === 1) {
      // Soldering iron — glowing red tip + smoke
      ctx.fillStyle = DK;
      ctx.fillRect(x + 4*u, y + 7*u, 8*u, u);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x + 4*u, y + 7*u, 5*u, u);
      // Tip
      var tipPulse = 0.8 + Math.sin(t / 200) * 0.2;
      ctx.fillStyle = 'rgba(232, 80, 40, ' + tipPulse + ')';
      ctx.fillRect(x + 11*u, y + 7*u, u, u);
      ctx.fillStyle = 'rgba(255, 200, 100, ' + tipPulse + ')';
      ctx.fillRect(x + 11*u, y + 7*u, 1, 1);
      // Smoke wisp
      for (var s = 0; s < 4; s++) {
        var sp = (Math.floor(t / 240 + s * 7)) % 8;
        var sy = y + 7*u - sp * u;
        if (sp < 6) {
          ctx.globalAlpha = Math.max(0, 0.45 - sp * 0.06);
          ctx.fillStyle = '#888894';
          ctx.fillRect(x + 11*u, sy, u, u);
        }
      }
      ctx.globalAlpha = 1;
      // Heat halo
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = tipPulse * 0.4;
      var glow = ctx.createRadialGradient(x + 11*u + 0.5, y + 7*u + 0.5, 0, x + 11*u + 0.5, y + 7*u + 0.5, 4*u);
      glow.addColorStop(0, 'rgba(255, 120, 60, 0.85)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(x + 7*u, y + 4*u, 8*u, 8*u);
      ctx.restore();
      // Coil cable
      ctx.fillStyle = DK;
      for (var c2 = 0; c2 < 4; c2++) {
        ctx.fillRect(x + 4*u - c2 * u, y + 8*u, 1, 1);
      }
    } else if (item === 2) {
      // Tray with screws
      ctx.fillStyle = DK;
      ctx.fillRect(x + 3*u, y + 6*u, 8*u, 4*u);
      ctx.fillStyle = '#3a3848';
      ctx.fillRect(x + 3*u, y + 6*u, 8*u, 3*u);
      // Screws inside
      ctx.fillStyle = '#a0a0b0';
      ctx.fillRect(x + 4*u, y + 7*u, 1, 1);
      ctx.fillRect(x + 6*u, y + 8*u, 1, 1);
      ctx.fillRect(x + 8*u, y + 7*u, 1, 1);
      ctx.fillRect(x + 9*u, y + 8*u, 1, 1);
    } else if (item === 3) {
      // Multimeter
      ctx.fillStyle = DK;
      ctx.fillRect(x + 4*u, y + 5*u, 7*u, 5*u);
      ctx.fillStyle = '#a04040';
      ctx.fillRect(x + 4*u, y + 5*u, 7*u, 4*u);
      // LCD display
      ctx.fillStyle = '#0e3018';
      ctx.fillRect(x + 5*u, y + 6*u, 5*u, 2*u);
      ctx.fillStyle = '#5cc070';
      ctx.fillRect(x + 5*u, y + 6*u, 5*u, u);
      // Probe wires
      ctx.fillStyle = '#a04040';
      ctx.fillRect(x + 4*u, y + 9*u, u, 2*u);
      ctx.fillStyle = '#3a3848';
      ctx.fillRect(x + 10*u, y + 9*u, u, 2*u);
    }
    // Legs of bench
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + ts - 2*u, 2*u, 2*u);
    ctx.fillRect(x + ts - 2*u, y + ts - 2*u, 2*u, 2*u);
  }

  // Parts bin — wall-mounted drawer rack with colored drawer fronts.
  function drawPartsBin(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var FRAME = '#3a3848';
    ctx.fillStyle = DK;
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, 11*u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    ctx.fillStyle = '#5a5868';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, 1);
    // Drawers — 3 rows × 3 cols of small bins
    var COLORS = ['#a04040', '#5cc8d0', '#c8a840', '#7060d0', '#5ac070', '#888888'];
    for (var dr = 0; dr < 3; dr++) {
      for (var dc = 0; dc < 3; dc++) {
        var dx = x + (1 + dc * 4) * u;
        var dy = y + (3 + dr * 3) * u;
        ctx.fillStyle = '#0e0a14';
        ctx.fillRect(dx, dy, 4*u - 1, 3*u - 1);
        ctx.fillStyle = COLORS[(col + row + dr + dc * 3) % COLORS.length];
        ctx.fillRect(dx + 1, dy + 1, 4*u - 3, 2*u);
        // Handle
        ctx.fillStyle = '#a0a0b0';
        ctx.fillRect(dx + u, dy + u, 2*u, 1);
        // Label
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(dx + u, dy + 2*u - 1, 2*u, 1);
      }
    }
  }

  // Half-disassembled hover-drone on a stand. Animated faint power flicker.
  function drawDrone(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var BODY = '#3a3848';
    var BODY_HI = '#5a5868';
    var PINK = '#e870c0';
    // Stand
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 9*u, 4*u, 5*u);
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(x + 6*u, y + 9*u, 4*u, u);
    // Floor pad
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(x + 4*u, y + 13*u, 8*u, 2*u);
    // Drone body — squat oval
    ctx.fillStyle = DK;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 5*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 4*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, u);
    // Eye / sensor
    var pulse = 0.7 + Math.sin(t / 800) * 0.18;
    if ((Math.floor(t / 100)) % 47 === 0) pulse *= 0.4;
    ctx.fillStyle = 'rgba(120, 220, 232, ' + pulse.toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 2*u);
    // Open chassis panel — exposed wires + components
    ctx.fillStyle = DK;
    ctx.fillRect(x + 9*u, y + 5*u, 3*u, 2*u);
    ctx.fillStyle = '#1a4020';
    ctx.fillRect(x + 9*u, y + 5*u, 3*u, 2*u);
    // Wires hanging out
    ctx.fillStyle = '#a04040';
    ctx.fillRect(x + 10*u, y + 7*u, 1, 2*u);
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(x + 11*u, y + 7*u, 1, 2*u);
    // Pink underglow (drone is partly powered)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var glow = ctx.createRadialGradient(x + 8*u, y + 9*u, 0, x + 8*u, y + 9*u, 7*u);
    glow.addColorStop(0, 'rgba(232, 80, 200, 0.7)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - u, y + 6*u, ts + 2*u, ts);
    ctx.restore();
  }

  // Diagnostic terminal — wall-mounted screen with scrolling text.
  function drawTerminal(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    // Frame
    ctx.fillStyle = DK;
    ctx.fillRect(x + u, y + 3*u, ts - 2*u, 9*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 7*u);
    // Screen background — dark green
    ctx.fillStyle = '#0a1a14';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 7*u);
    // Scrolling green text rows
    var pulse = 0.85 + Math.sin(t / 400 + col) * 0.15;
    var GREEN = 'rgba(80, 220, 130,';
    ctx.fillStyle = GREEN + (pulse * 0.95).toFixed(2) + ')';
    var rows = 4;
    for (var r2 = 0; r2 < rows; r2++) {
      var scrollOff = ((Math.floor(t / 150) + r2 * 7 + col * 3) % 12);
      var rowY = y + (5 + r2 * 1.5) * u;
      var width = (ts - 6*u) - (scrollOff * u) % (ts - 6*u);
      ctx.fillRect(x + 3*u, rowY, Math.max(2*u, width), 1);
    }
    // 1u "cursor" blinking at bottom
    if ((Math.floor(t / 500)) % 2 === 0) {
      ctx.fillStyle = '#a8e8a8';
      ctx.fillRect(x + 3*u, y + 10*u, u, 1);
    }
    // Frame highlights
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 1);
    // Halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.32;
    var halo = ctx.createRadialGradient(x + ts/2, y + 7*u, 0, x + ts/2, y + 7*u, ts);
    halo.addColorStop(0, 'rgba(80, 220, 130, 0.6)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts*0.3, y, ts * 1.6, ts);
    ctx.restore();
  }

  // Technician — welding goggles, leather apron.
  function drawTechnician(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var SKIN = '#c0a080';
    var APRON = '#3a2410';
    var APRON_HI = '#5a3a1a';
    var GOGGLE = '#1a3030';
    var GOGGLE_LIGHT = '#5cc8d0';
    var bob = Math.sin(t / 400) > 0.7 ? -u : 0;   // working motion
    // Hair
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    // Head
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    // Welding goggles strap (horizontal across head)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 2*u);
    ctx.fillStyle = GOGGLE;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 2*u);
    // Goggle lenses (cyan glow)
    ctx.fillStyle = GOGGLE_LIGHT;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Body
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    // Apron
    ctx.fillStyle = APRON;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = APRON_HI;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Tool belt with pockets
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Tools sticking out of belt
    ctx.fillStyle = '#c8a840';
    ctx.fillRect(x + 5*u, y + 9*u + bob, u, 2*u);
    ctx.fillStyle = '#a0a0b0';
    ctx.fillRect(x + 10*u, y + 9*u + bob, u, 2*u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet (work boots)
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
    // Holding tool in hand (right side, animated)
    if (Math.sin(t / 400) > 0) {
      ctx.fillStyle = '#a04040';
      ctx.fillRect(x + 11*u, y + 7*u + bob, u, 4*u);
      ctx.fillStyle = '#a0a0b0';
      ctx.fillRect(x + 11*u, y + 6*u + bob, u, u);
    } else {
      ctx.fillStyle = '#a04040';
      ctx.fillRect(x + 4*u, y + 7*u + bob, u, 4*u);
      ctx.fillStyle = '#a0a0b0';
      ctx.fillRect(x + 4*u, y + 6*u + bob, u, u);
    }
  }

  // Customer — anxious, holding a broken device.
  function drawCustomer(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var SKIN = '#d8c0a0';
    var COAT = '#403850';
    var COAT_HI = '#5a5070';
    var bob = Math.sin(t / 1500 + col) > 0.85 ? -u : 0;
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = COAT;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = COAT_HI;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
    // Holding broken device — small box with crack
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 9*u + bob, 4*u, 3*u);
    ctx.fillStyle = '#7060d0';
    ctx.fillRect(x + 6*u, y + 9*u + bob, 4*u, 2*u);
    // Crack across device
    ctx.fillStyle = DK;
    ctx.fillRect(x + 7*u, y + 9*u + bob, 1, 2*u);
    ctx.fillRect(x + 8*u, y + 10*u + bob, 1, 1);
  }

  // Work lamp — angled spotlight on wall.
  function drawWorkLamp(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Articulated arm
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(x + 6*u, y, 4*u, 5*u);
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(x + 6*u, y, 4*u, u);
    // Lamp head — angled cone
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, 3*u);
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, 2*u);
    ctx.fillStyle = '#5a5868';
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    // Bulb (cyan-white)
    var pulse = 0.85 + Math.sin(t / 600 + col) * 0.12;
    ctx.fillStyle = 'rgba(220, 240, 255, ' + pulse + ')';
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    // Hard cone of light cast downward
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.5;
    var cone = ctx.createLinearGradient(x + 8*u, y + 7*u, x + 8*u, y + 16*u);
    cone.addColorStop(0, 'rgba(220, 240, 255, 0.7)');
    cone.addColorStop(1, 'transparent');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x + 5*u, y + 7*u);
    ctx.lineTo(x + 11*u, y + 7*u);
    ctx.lineTo(x + 14*u, y + ts);
    ctx.lineTo(x + 2*u, y + ts);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Coiled cable hanging on wall.
  function drawCableCoil(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    // Hook
    ctx.fillStyle = DK;
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, 2*u);
    // Coil — a stack of nested ovals
    ctx.fillStyle = DK;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, 8*u);
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, 7*u);
    // Coil ridges (1u dark stripes alternating)
    for (var i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0a0a14' : '#252538';
      ctx.fillRect(x + 3*u, y + (5 + i + i)*u, 10*u, 1);
    }
    // Plug end hanging
    ctx.fillStyle = '#a0a0b0';
    ctx.fillRect(x + 11*u, y + 12*u, 2*u, 2*u);
  }

  // Door — exit threshold.
  function drawDoor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#3a1830';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, ts - 4*u);
    ctx.fillStyle = '#5a2848';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(255, 200, 232, ' + (0.55 + bob * 0.2).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + ts - 4*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 9*u, y + ts - 3*u, u, u);
  }

  // Window — looking out at the dark street.
  function drawWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 8*u);
    var phase = (t / 4000 + col * 0.4) % 3;
    var glass = phase < 1 ? '#3a1830' : (phase < 2 ? '#181a40' : '#1a3040');
    ctx.fillStyle = glass;
    ctx.fillRect(x + 3*u, y + 5*u, ts - 6*u, 6*u);
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + ts/2 - 1, y + 4*u, 2, 8*u);
    ctx.fillRect(x + 3*u, y + 7*u, ts - 6*u, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 3*u, y + 5*u, u, 6*u);
  }

  BridgeWorld.registerTileset('tech-repair-shop', {
    1: drawWall,
    2: drawFloor,
    3: drawWorkbench,
    4: drawPartsBin,
    5: drawDrone,
    6: drawTerminal,
    7: drawDoor,
    8: drawWorkLamp,
    9: drawTechnician,
    10: drawCustomer,
    11: drawCableCoil,
    12: drawWindow
  });

  BridgeWorld.registerBackground('tech-repair-shop', drawBackground);

})();
