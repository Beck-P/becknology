/**
 * Arcadia Shop — cyberpunk corner store interior.
 *
 * Bright, fluorescent-lit convenience store. Two product aisles, a
 * cooler wall full of glowing drinks, magazine rack with rotating ads,
 * a chrome counter with a credit reader, a cashier behind the counter,
 * a browsing customer, and a humming overhead fluorescent.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0e0c1a');
    grad.addColorStop(1, '#0a0a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Wall — concrete with a hot-pink horizontal neon trim halfway up.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DK = '#0e0a18';
    var BASE = '#1e1a30';
    var BASE_HI = '#2e2a40';
    var GROOVE = '#15102a';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = BASE_HI;
    ctx.fillRect(x, y, ts, u);
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + ts - u, ts, u);
    // Vertical concrete grooves every 4u
    ctx.fillStyle = GROOVE;
    ctx.fillRect(x + 4*u - 1, y + u, 1, ts - 2*u);
    ctx.fillRect(x + 12*u - 1, y + u, 1, ts - 2*u);
  }

  // Linoleum tile floor — shiny.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#1e1e26';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#26262e';
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // 1u dark grout
    ctx.fillStyle = '#10101a';
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // Faint reflection band — animated
    var t = time || 0;
    if ((col + row) % 5 === 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.12;
      var phase = (t / 5000 + col * 0.3) % 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + (Math.floor(phase * 14) - 2)*u, y + 9*u, 4*u, 1);
      ctx.restore();
    }
  }

  // Chrome counter — reflective top with credit reader and bag dispenser.
  function drawCounter(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    var DK = '#0a0a14';
    var BODY = '#3a3848';
    var BODY_HI = '#6a6a78';
    var BODY_TOP = '#a0a0b0';
    ctx.fillStyle = DK;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    ctx.fillStyle = BODY_TOP;
    ctx.fillRect(x + u, y + u, ts - 2*u, 2*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + u, y + u, ts - 2*u, 1);
    // Pink underglow strip on front
    var pulse = 0.78 + Math.sin(t / 600 + col * 0.7) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(232, 80, 200, 0.95)';
    ctx.fillRect(x, y + ts - 2*u, ts, u);
    ctx.fillStyle = 'rgba(255,180,220,0.7)';
    ctx.fillRect(x, y + ts - 2*u, ts, 1);
    ctx.restore();
    // Items on top — credit reader, cigarettes, snacks
    var item = (col * 7 + row * 11) % 5;
    if (item === 0) {
      // Credit reader (POS terminal)
      ctx.fillStyle = DK;
      ctx.fillRect(x + 5*u, y + 3*u, 6*u, 5*u);
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(x + 5*u, y + 3*u, 6*u, 4*u);
      // Screen cyan
      var scrPulse = 0.7 + Math.sin(t / 400) * 0.2;
      ctx.fillStyle = 'rgba(120, 220, 232, ' + scrPulse + ')';
      ctx.fillRect(x + 6*u, y + 4*u, 4*u, 2*u);
      // Card slot
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    } else if (item === 1) {
      // Display rack of small items
      ctx.fillStyle = DK;
      ctx.fillRect(x + 4*u, y + 3*u, 8*u, 4*u);
      ctx.fillStyle = '#3a1830';
      ctx.fillRect(x + 4*u, y + 3*u, 8*u, 3*u);
      // Tiny vials/cigarettes (vertical 1u stripes in different colors)
      var COLS = ['#5cc8d0', '#a04040', '#c8a840', '#7060d0', '#5ac070'];
      for (var c2 = 0; c2 < 5; c2++) {
        ctx.fillStyle = COLS[c2 % COLS.length];
        ctx.fillRect(x + (5 + c2) * u, y + 4*u, u, 2*u);
      }
    } else if (item === 3) {
      // Bag dispenser — small box
      ctx.fillStyle = DK;
      ctx.fillRect(x + 5*u, y + 3*u, 6*u, 5*u);
      ctx.fillStyle = '#3a3848';
      ctx.fillRect(x + 5*u, y + 3*u, 6*u, 4*u);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(x + 6*u, y + 7*u, 4*u, u);
    }
  }

  // Snack shelf — three rows of brightly-colored product.
  function drawSnackShelf(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DK = '#0a0a14';
    var SHELF = '#3a3848';
    var SHELF_HI = '#5a5868';
    drawFloor(ctx, x, y, ts, time, col, row);
    // Vertical shelf body — narrow upright
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    ctx.fillStyle = SHELF;
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    ctx.fillStyle = SHELF_HI;
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, u);
    // 3 rows of products
    var BAGS = [
      ['#e84040', '#ff8080'],
      ['#5cc8d0', '#90e0e8'],
      ['#c8a840', '#e8c870'],
      ['#a040c0', '#c860e0'],
      ['#5ac070', '#80e890']
    ];
    for (var s = 0; s < 3; s++) {
      var sy = y + (3 + s * 3) * u;
      ctx.fillStyle = DK;
      ctx.fillRect(x + 3*u, sy + 2*u, ts - 6*u, u);
      // 3 bags per row
      for (var b = 0; b < 3; b++) {
        var bx = x + (3 + b * 3) * u;
        var c = BAGS[(col * 11 + row * 7 + s * 3 + b) % BAGS.length];
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(bx, sy, 2*u, 2*u);
        ctx.fillStyle = c[0];
        ctx.fillRect(bx, sy, 2*u, 2*u);
        ctx.fillStyle = c[1];
        ctx.fillRect(bx, sy, u, u);
      }
    }
    // Price stickers (yellow squares)
    ctx.fillStyle = '#e8c860';
    ctx.fillRect(x + 12*u, y + 4*u, u, u);
    ctx.fillRect(x + 4*u, y + 10*u, u, u);
  }

  // Magazine rack — vertical rotating ad images. Animated cycle.
  function drawMagazineRack(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var FRAME = '#3a3848';
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 2*u, y + ts - 2*u, ts - 4*u, u);
    // Three magazines stacked
    var COVERS = [
      ['#a04060', '#fff'],
      ['#5cc8d0', '#0a3040'],
      ['#c8a840', '#3a2410'],
      ['#7060d0', '#fff']
    ];
    for (var m = 0; m < 3; m++) {
      var my = y + (2 + m * 4) * u;
      var idx = ((Math.floor(t / 4000) + col + m) % COVERS.length);
      var cv = COVERS[idx];
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(x + 3*u, my, ts - 6*u, 3*u);
      ctx.fillStyle = cv[0];
      ctx.fillRect(x + 3*u, my, ts - 6*u, 3*u);
      // Title bar
      ctx.fillStyle = cv[1];
      ctx.fillRect(x + 4*u, my + u, ts - 8*u, u);
    }
  }

  // Cooler — drinks fridge with glowing colored bottles. (Refines the noodle bar version.)
  function drawCooler(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0814';
    var BODY = '#1e2838';
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillStyle = '#3a4858';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, 1);
    // Glass area
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 7*u);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.6 + Math.sin(t / 700) * 0.08;
    var grad = ctx.createLinearGradient(x, y, x, y + ts);
    grad.addColorStop(0, 'rgba(120, 220, 232, 0.7)');
    grad.addColorStop(1, 'rgba(80, 60, 200, 0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 7*u);
    ctx.restore();
    // Drink bottles
    var DRINK_COLORS = [['#e84040','#ff8080'], ['#5cc8d0','#90e0e8'], ['#c8a840','#e8c870'], ['#a040c0','#c860e0'], ['#5ac070','#80e890']];
    for (var s = 0; s < 3; s++) {
      var sy = y + (4 + s * 3) * u;
      for (var b = 0; b < 3; b++) {
        var bx = x + (4 + b * 3) * u;
        var dc = DRINK_COLORS[(col * 7 + s * 11 + b) % DRINK_COLORS.length];
        ctx.fillStyle = '#0a0814';
        ctx.fillRect(bx, sy, 2*u, 3*u);
        ctx.fillStyle = dc[0];
        ctx.fillRect(bx, sy, 2*u, 2*u);
        ctx.fillStyle = dc[1];
        ctx.fillRect(bx, sy, u, u);
      }
    }
    // Reflection
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 3*u, y + 3*u, u, ts - 7*u);
    // Handle
    ctx.fillStyle = '#a0a0b0';
    ctx.fillRect(x + ts - 4*u, y + 5*u, u, 5*u);
  }

  // Cashier — short, in a vest, behind the counter.
  function drawCashier(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var SKIN = '#c0a080';
    var HAIR = '#1a0e08';
    var VEST = '#a04040';
    var VEST_HI = '#d06060';
    var SHIRT = '#e0e0e8';
    var bob = Math.sin(t / 1200) > 0.85 ? -u : 0;
    // Hair
    ctx.fillStyle = HAIR;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    // Head
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = HAIR;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, u);
    // Eyes
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Body
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = SHIRT;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    // Vest
    ctx.fillStyle = VEST;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = VEST_HI;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Shirt collar visible at neck
    ctx.fillStyle = SHIRT;
    ctx.fillRect(x + 7*u, y + 6*u + bob, 2*u, 2*u);
    // Name tag — yellow square
    ctx.fillStyle = '#c8a840';
    ctx.fillRect(x + 9*u, y + 8*u + bob, 2*u, u);
    // Belt
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Customer — browsing NPC with a basket.
  function drawCustomer(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var SKIN = '#e0c0a0';
    var COAT = '#3a4858';
    var COAT_HI = '#5a6878';
    var bob = Math.sin(t / 1100 + col) > 0.85 ? -u : 0;
    // Hair
    ctx.fillStyle = '#3a1818';
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    // Head
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = '#3a1818';
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, u);
    // Eyes
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Body
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = COAT;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = COAT_HI;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Belt
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
    // Basket in hand
    ctx.fillStyle = DK;
    ctx.fillRect(x + 11*u, y + 9*u + bob, 4*u, 3*u);
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 11*u, y + 9*u + bob, 4*u, 2*u);
    // Item poking out
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(x + 12*u, y + 8*u + bob, u, 2*u);
  }

  // Fluorescent ceiling tube — long horizontal lit panel with humming flicker.
  function drawFluorescent(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Frame
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(x + u, y + 5*u, ts - 2*u, 4*u);
    // Tube
    var pulse = 0.85 + Math.sin(t / 400 + col * 1.1) * 0.12;
    if ((Math.floor(t / 70) + col * 11) % 113 === 0) pulse *= 0.4;
    ctx.fillStyle = 'rgba(232, 240, 255, ' + pulse + ')';
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, 2*u);
    // 1u bright center
    ctx.fillStyle = 'rgba(255, 255, 255, ' + pulse + ')';
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, 1);
    // Halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var halo = ctx.createLinearGradient(x, y + 7*u, x, y + 14*u);
    halo.addColorStop(0, 'rgba(220, 235, 255, 0.6)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x, y + 7*u, ts, 8*u);
    ctx.restore();
    // Bracket clamps at each end
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(x + u, y + 5*u, u, 4*u);
    ctx.fillRect(x + ts - 2*u, y + 5*u, u, 4*u);
  }

  // Wall poster — promotional ad with cycling colors.
  function drawWallPoster(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Frame
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, 9*u);
    // Inside - cycle background color
    var phase = (t / 3000 + col * 0.3) % 3;
    var bg = phase < 1 ? '#3a1830' : (phase < 2 ? '#0a3040' : '#3a3018');
    ctx.fillStyle = bg;
    ctx.fillRect(x + 3*u, y + 4*u, ts - 6*u, 7*u);
    // Big title bar
    var pulse = 0.85 + Math.sin(t / 500 + col) * 0.15;
    ctx.fillStyle = phase < 1 ? 'rgba(232, 80, 200,' : (phase < 2 ? 'rgba(120, 220, 232,' : 'rgba(255, 200, 80,');
    ctx.fillStyle += pulse + ')';
    ctx.fillRect(x + 4*u, y + 5*u, ts - 8*u, 2*u);
    // Subtitle bar
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x + 4*u, y + 8*u, ts - 8*u, u);
    ctx.fillRect(x + 4*u, y + 10*u, ts - 9*u, u);
    // Tape corners
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 2*u, y + 3*u, 2*u, u);
    ctx.fillRect(x + ts - 4*u, y + 3*u, 2*u, u);
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

  // Front window — clear glass with neon street reflection.
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
    // Mullion
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + ts/2 - 1, y + 4*u, 2, 8*u);
    ctx.fillRect(x + 3*u, y + 7*u, ts - 6*u, 1);
    // Reflection
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 3*u, y + 5*u, u, 6*u);
  }

  // Vending machine inside — coin-op snack dispenser, flat rectangular.
  function drawVending(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a14';
    var BODY = '#1e2838';
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#3a4858';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    // Display
    var pulse = 0.7 + Math.sin(t / 900 + col) * 0.15;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillStyle = '#5cc8d0';
    ctx.fillRect(x + 3*u, y + 2*u, ts - 6*u, ts/3);
    ctx.restore();
    // Buttons grid (3x2)
    var BCOLORS = ['#d04040','#5ac070','#c8a840','#5cc8d0','#a040c0','#80388c'];
    for (var b = 0; b < 6; b++) {
      var bx = x + (3 + (b % 3) * 3) * u;
      var by = y + (8 + Math.floor(b/3) * 2) * u;
      ctx.fillStyle = BCOLORS[b];
      ctx.fillRect(bx, by, 2*u, 2*u);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(bx, by, 2*u, 1);
    }
    // Slot
    ctx.fillStyle = DK;
    ctx.fillRect(x + ts - 5*u, y + ts/3 + 2*u, 2*u, u);
    // Dispense tray
    ctx.fillStyle = DK;
    ctx.fillRect(x + 3*u, y + ts - 4*u, ts - 6*u, 2*u);
  }

  BridgeWorld.registerTileset('arcadia-shop', {
    1: drawWall,
    2: drawFloor,
    3: drawCounter,
    4: drawSnackShelf,
    5: drawMagazineRack,
    6: drawCooler,
    7: drawDoor,
    8: drawFluorescent,
    9: drawCashier,
    10: drawCustomer,
    11: drawWallPoster,
    12: drawVending,
    13: drawWindow
  });

  BridgeWorld.registerBackground('arcadia-shop', drawBackground);

})();
