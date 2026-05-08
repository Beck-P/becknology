/**
 * Junk Pawn Shop — Arcadia interior.
 *
 * Cluttered low-light pawnshop. Wall shelves of mismatched gear, a long
 * counter with a clattery register, a pawnbroker behind the counter, a
 * standing safe, glass display cases, junk piles on the carpet, a vintage
 * clock that ticks, and a single caged ceiling lamp swinging slightly.
 */
(function () {

  function drawBackground(ctx, w, h, time) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0e0810');
    grad.addColorStop(1, '#08060a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Wall — peeling paint over old plaster, exposed wires running across.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DK = '#0a0608';
    var BASE = '#2a201a';
    var BASE_HI = '#3a2e26';
    var PEEL = '#4a3830';
    var WIRE = '#1a0e08';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // 1u top highlight
    ctx.fillStyle = BASE_HI;
    ctx.fillRect(x, y, ts, u);
    // 1u bottom shadow
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + ts - u, ts, u);
    // Peeling paint patches (deterministic)
    var seed = (col * 17 + row * 31) % 13;
    if (seed === 0) {
      ctx.fillStyle = PEEL;
      ctx.fillRect(x + 3*u, y + 4*u, 4*u, 3*u);
      ctx.fillStyle = '#5a4838';
      ctx.fillRect(x + 3*u, y + 4*u, 4*u, u);
    } else if (seed === 5) {
      ctx.fillStyle = PEEL;
      ctx.fillRect(x + 9*u, y + 9*u, 3*u, 2*u);
    }
    // 1u horizontal exposed wire
    ctx.fillStyle = WIRE;
    ctx.fillRect(x, y + 13*u, ts, u);
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(x + (col % 16)*u, y + 13*u, u, u);
  }

  // Worn red-carpet floor with cigarette burns.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#3a1010';
    ctx.fillRect(x, y, ts, ts);
    // Pattern: subtle weave checkers
    ctx.fillStyle = '#481818';
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // Worn patch lines
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(x + 7*u, y, u, ts);
    ctx.fillRect(x, y + 7*u, ts, u);
    // Burn / stain
    var s = (col * 23 + row * 11) % 17;
    if (s === 0) {
      ctx.fillStyle = '#1a0808';
      ctx.fillRect(x + 4*u, y + 9*u, 3*u, 2*u);
    } else if (s === 7) {
      ctx.fillStyle = '#0e0606';
      ctx.fillRect(x + 11*u, y + 4*u, u, u);
      ctx.fillRect(x + 12*u, y + 5*u, u, u);
    }
  }

  // Long wood counter — varnished oak with a brass strip.
  function drawCounter(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DK = '#1a0e08';
    var WOOD = '#3a2410';
    var WOOD_HI = '#5a3a1a';
    var BRASS = '#a08040';
    var BRASS_HI = '#e0c060';
    ctx.fillStyle = DK;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + u, y + u, ts - 2*u, u);
    // Brass strip on top edge (south side)
    ctx.fillStyle = BRASS;
    ctx.fillRect(x, y + ts - 3*u, ts, u);
    ctx.fillStyle = BRASS_HI;
    ctx.fillRect(x, y + ts - 3*u, ts, 1);
    // Front panel — 1u shadow
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + ts - 2*u, ts, 2*u);
    // Random doodad on top: cash register / lamp / receipt book
    var item = (col * 5 + row * 7) % 6;
    if (item === 0) {
      // Cash register — chunky black box with cream keys
      ctx.fillStyle = DK;
      ctx.fillRect(x + 4*u, y + 2*u, 8*u, 6*u);
      ctx.fillStyle = '#1a1626';
      ctx.fillRect(x + 4*u, y + 2*u, 8*u, 5*u);
      ctx.fillStyle = '#3a3650';
      ctx.fillRect(x + 4*u, y + 2*u, 8*u, u);
      // Display
      ctx.fillStyle = '#403018';
      ctx.fillRect(x + 5*u, y + 3*u, 6*u, 2*u);
      ctx.fillStyle = '#a08040';
      ctx.fillRect(x + 5*u, y + 3*u, 6*u, u);
      // Keys
      ctx.fillStyle = '#e8e0c0';
      for (var k = 0; k < 3; k++) {
        ctx.fillRect(x + (5 + k * 2) * u, y + 6*u, u, u);
      }
    } else if (item === 2) {
      // Banker's lamp — green shade
      ctx.fillStyle = DK;
      ctx.fillRect(x + 6*u, y + 2*u, 4*u, 2*u);
      ctx.fillStyle = '#1a3a1a';
      ctx.fillRect(x + 6*u, y + 2*u, 4*u, u);
      ctx.fillStyle = '#3a6a3a';
      ctx.fillRect(x + 6*u, y + 2*u, u, u);
      // Stem + base
      ctx.fillStyle = '#a08040';
      ctx.fillRect(x + 7*u, y + 4*u, 2*u, 3*u);
      // Warm glow under the shade
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      var pulse = 0.7 + Math.sin((time||0) / 1100 + col) * 0.15;
      ctx.globalAlpha = pulse * 0.45;
      var lampGlow = ctx.createRadialGradient(x + 8*u, y + 4*u, 0, x + 8*u, y + 4*u, 6*u);
      lampGlow.addColorStop(0, 'rgba(255, 220, 140, 0.85)');
      lampGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = lampGlow;
      ctx.fillRect(x - 2*u, y, ts + 4*u, ts);
      ctx.restore();
    } else if (item === 4) {
      // Receipt book + pen
      ctx.fillStyle = '#0a0814';
      ctx.fillRect(x + 5*u, y + 4*u, 6*u, 3*u);
      ctx.fillStyle = '#e0d8b0';
      ctx.fillRect(x + 5*u, y + 4*u, 6*u, 2*u);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x + 6*u, y + 5*u, 4*u, 1);
      ctx.fillStyle = '#a08040';
      ctx.fillRect(x + 11*u, y + 3*u, 2*u, u);
    }
  }

  // Wall shelf — three shelves with random pawned items.
  function drawWallShelf(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    var SHELF = '#3a2410';
    var SHELF_DK = '#1a0e08';
    var SHELF_HI = '#5a3a1a';
    // 3 shelves
    for (var s = 0; s < 3; s++) {
      var sy = y + (3 + s * 4) * u;
      ctx.fillStyle = SHELF_DK;
      ctx.fillRect(x + u, sy, ts - 2*u, 2*u);
      ctx.fillStyle = SHELF;
      ctx.fillRect(x + u, sy, ts - 2*u, u);
      ctx.fillStyle = SHELF_HI;
      ctx.fillRect(x + u, sy, ts - 2*u, 1);
    }
    // Items on shelves — varied silhouettes
    var ITEMS = [
      // [color, type 0..3]
      ['#5cc8d0', 0], ['#a04040', 1], ['#c8a840', 2], ['#7060d0', 3], ['#5ac070', 0], ['#d04080', 2], ['#888888', 1], ['#e0c060', 3]
    ];
    for (var sh = 0; sh < 3; sh++) {
      var ix = (col * 11 + row * 7 + sh * 5) % ITEMS.length;
      var item = ITEMS[ix];
      var ix2 = (col * 13 + row * 11 + sh * 5 + 3) % ITEMS.length;
      var item2 = ITEMS[ix2];
      var sy = y + (1 + sh * 4) * u;
      // Item 1
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x + 2*u, sy, 4*u, 2*u);
      ctx.fillStyle = item[0];
      if (item[1] === 0) ctx.fillRect(x + 3*u, sy, 3*u, 2*u);            // box-shape
      else if (item[1] === 1) { ctx.fillRect(x + 3*u, sy + u, 3*u, u); ctx.fillRect(x + 4*u, sy, u, u); } // bottle
      else if (item[1] === 2) { ctx.fillRect(x + 3*u, sy, 3*u, u); ctx.fillRect(x + 4*u, sy + u, u, u); } // crown / trinket
      else { ctx.fillRect(x + 2*u, sy, 4*u, 2*u); ctx.fillStyle='#0a0608'; ctx.fillRect(x + 3*u, sy + u, 2*u, u); } // device
      // Item 2
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(x + 9*u, sy, 4*u, 2*u);
      ctx.fillStyle = item2[0];
      if (item2[1] === 0) ctx.fillRect(x + 10*u, sy, 3*u, 2*u);
      else if (item2[1] === 1) { ctx.fillRect(x + 10*u, sy + u, 3*u, u); ctx.fillRect(x + 11*u, sy, u, u); }
      else if (item2[1] === 2) { ctx.fillRect(x + 10*u, sy, 3*u, u); ctx.fillRect(x + 11*u, sy + u, u, u); }
      else { ctx.fillRect(x + 9*u, sy, 4*u, 2*u); ctx.fillStyle='#0a0608'; ctx.fillRect(x + 10*u, sy + u, 2*u, u); }
    }
    // Price tag string (1u line dangling from one shelf)
    ctx.fillStyle = '#e0c860';
    ctx.fillRect(x + 6*u, y + 3*u, u, u);
    ctx.fillStyle = '#a08840';
    ctx.fillRect(x + 6*u, y + 4*u, u, u);
  }

  // Standing safe — large iron safe with combination dial. Slight wobble glow.
  function drawSafe(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    var BODY = '#1a1820';
    var BODY_HI = '#3a3848';
    var DIAL = '#a08040';
    var DIAL_HI = '#e0c060';
    // Body
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, 1);
    // Door panel inset
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 3*u, ts - 8*u, ts - 6*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 4*u, y + 3*u, ts - 8*u, ts - 6*u);
    // Combination dial — circular knob
    var t = time || 0;
    var dialAngle = Math.sin(t / 1500) * 0.6;
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 5*u, 4*u, 4*u);
    ctx.fillStyle = DIAL;
    ctx.fillRect(x + 6*u, y + 5*u, 4*u, 4*u);
    ctx.fillStyle = DIAL_HI;
    ctx.fillRect(x + 6*u, y + 5*u, 4*u, u);
    // Dial pointer — animated
    ctx.fillStyle = DK;
    var pointerOffset = Math.floor(dialAngle * 2);
    ctx.fillRect(x + 7*u + pointerOffset, y + 5*u, u, 2*u);
    // Handle — chunky bar
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 10*u, 6*u, 2*u);
    ctx.fillStyle = DIAL;
    ctx.fillRect(x + 5*u, y + 10*u, 6*u, u);
    // Hinges
    ctx.fillStyle = DK;
    ctx.fillRect(x + 3*u, y + 4*u, u, 2*u);
    ctx.fillRect(x + 3*u, y + 9*u, u, 2*u);
  }

  // Glass display case — low cabinet with random items inside.
  function drawDisplayCase(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    var FRAME = '#3a2410';
    var FRAME_HI = '#5a3a1a';
    var GLASS = '#1a1a26';
    // Frame
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, 8*u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 2*u, y + 13*u, ts - 4*u, u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + 2*u, y + 6*u, u, 8*u);
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + ts - 3*u, y + 6*u, u, 8*u);
    ctx.fillStyle = FRAME_HI;
    ctx.fillRect(x + 2*u, y + 6*u, ts - 4*u, 1);
    // Glass interior
    ctx.fillStyle = GLASS;
    ctx.fillRect(x + 3*u, y + 7*u, ts - 6*u, 6*u);
    // Items inside — 2-3 small silhouettes
    var ITEMS = [
      ['#c8a840', '#e0c060'],      // gold piece
      ['#5cc8d0', '#90e0e8'],      // blue gem
      ['#a04040', '#e08080'],      // red orb
      ['#7060d0', '#a090f0']       // purple chip
    ];
    var pickA = ITEMS[(col * 17 + row * 11) % ITEMS.length];
    var pickB = ITEMS[(col * 7 + row * 23 + 5) % ITEMS.length];
    ctx.fillStyle = pickA[0];
    ctx.fillRect(x + 4*u, y + 9*u, 3*u, 2*u);
    ctx.fillStyle = pickA[1];
    ctx.fillRect(x + 4*u, y + 9*u, 3*u, u);
    ctx.fillStyle = pickB[0];
    ctx.fillRect(x + 8*u, y + 9*u, 3*u, 2*u);
    ctx.fillStyle = pickB[1];
    ctx.fillRect(x + 8*u, y + 9*u, 3*u, u);
    // Glass reflection band — animated
    var t = time || 0;
    var reflX = ((Math.floor(t / 50)) % (ts - 6*u));
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 3*u + reflX, y + 7*u, 2*u, 6*u);
    ctx.globalAlpha = 1;
    // Mid divider
    ctx.fillStyle = FRAME;
    ctx.fillRect(x + Math.floor(ts/2) - u/2, y + 7*u, 1, 6*u);
  }

  // Pawnbroker NPC — visor, suspenders, eyepiece.
  function drawPawnbroker(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    var SKIN = '#d8b890';
    var SKIN_SH = '#a08868';
    var SHIRT = '#d8d0a8';
    var VEST = '#3a1818';
    var VISOR = '#1a3a1a';
    var VISOR_HI = '#3a6a3a';
    var SUSP = '#0a0608';
    var bob = Math.sin(t / 1100) > 0.85 ? -u : 0;
    // Visor front
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 2*u + bob, 8*u, 2*u);
    ctx.fillStyle = VISOR;
    ctx.fillRect(x + 4*u, y + 2*u + bob, 8*u, u);
    ctx.fillStyle = VISOR_HI;
    ctx.fillRect(x + 4*u, y + 2*u + bob, u, u);
    // Bald head with side hair
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 3*u + bob, 6*u, 3*u);
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(x + 5*u, y + 3*u + bob, u, 2*u);
    ctx.fillRect(x + 10*u, y + 3*u + bob, u, 2*u);
    // Eye / monocle
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Monocle ring around right eye
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 8*u, y + 3*u + bob, 3*u, u);
    ctx.fillRect(x + 8*u, y + 5*u + bob, 3*u, u);
    ctx.fillRect(x + 8*u, y + 4*u + bob, u, u);
    // Mustache
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(x + 7*u, y + 5*u + bob, 2*u, u);
    // Body outline
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    // Shirt
    ctx.fillStyle = SHIRT;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    // Vest panels
    ctx.fillStyle = VEST;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 2*u, 5*u);
    ctx.fillRect(x + 10*u, y + 6*u + bob, 2*u, 5*u);
    // Suspenders crossing the shirt
    ctx.fillStyle = SUSP;
    ctx.fillRect(x + 6*u, y + 6*u + bob, u, 4*u);
    ctx.fillRect(x + 9*u, y + 6*u + bob, u, 4*u);
    // Bowtie
    ctx.fillStyle = '#a04040';
    ctx.fillRect(x + 7*u, y + 6*u + bob, 2*u, u);
    // Belt
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Pants
    ctx.fillStyle = '#2a2030';
    ctx.fillRect(x + 5*u, y + 11*u + bob, 6*u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Customer NPC — in dark hooded coat browsing.
  function drawCustomer(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0608';
    var COAT = '#2a1820';
    var COAT_HI = '#3a2830';
    var COAT_DK = '#1a0e10';
    var SKIN = '#d8b8a0';
    var bob = Math.sin(t / 1300) > 0.85 ? -u : 0;
    // Hood top
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, 5*u);
    ctx.fillStyle = COAT;
    ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, 4*u);
    ctx.fillStyle = COAT_HI;
    ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, u);
    // Face inside hood — partially obscured
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 6*u, y + 3*u + bob, 4*u, 2*u);
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
    ctx.fillStyle = COAT_DK;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Coat seam down center
    ctx.fillStyle = COAT_DK;
    ctx.fillRect(x + 7*u, y + 6*u + bob, u, 5*u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // Caged ceiling light — yellow bulb in a wire cage, hanging on a chain.
  function drawCagedLight(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Sway
    var sway = Math.sin(t / 1400 + col * 0.5) * 0.7;
    var cx = x + ts / 2 + sway;
    // Chain
    ctx.fillStyle = '#1a1a22';
    for (var ci = 0; ci < 4; ci++) ctx.fillRect(cx - 0.5, y + ci * u, 1, u - 1);
    // Cage frame — square, 6u × 5u
    var top = y + 5*u;
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(cx - 4*u, top, 8*u, 6*u);
    ctx.fillStyle = '#1a1626';
    ctx.fillRect(cx - 3*u, top + u, 6*u, 4*u);
    // Cage wire bars (1u verticals)
    ctx.fillStyle = '#0a0608';
    for (var b = 0; b < 5; b++) {
      ctx.fillRect(cx - 4*u + b * 2*u, top, u, 6*u);
    }
    // Bulb
    var pulse = 0.78 + Math.sin(t / 900 + col) * 0.18;
    if ((Math.floor(t / 80) + col * 11) % 113 === 0) pulse *= 0.55;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe070';
    ctx.fillRect(cx - 2*u, top + u, 4*u, 3*u);
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(cx - u, top + u, 2*u, u);
    ctx.globalAlpha = 1;
    // Halo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.45;
    var halo = ctx.createRadialGradient(cx, top + 3*u, 0, cx, top + 3*u, 9*u);
    halo.addColorStop(0, 'rgba(255, 220, 120, 0.85)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts*0.4, y, ts * 1.8, ts * 1.4);
    ctx.restore();
  }

  // Vintage clock — round wood frame, ticking second hand.
  function drawClock(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Frame
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + 2*u, y + 2*u, 12*u, 12*u);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, 10*u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 3*u, y + 3*u, 10*u, u);
    // Face
    ctx.fillStyle = '#e8e0c0';
    ctx.fillRect(x + 4*u, y + 4*u, 8*u, 8*u);
    ctx.fillStyle = '#0a0608';
    // 12 markers at 4 cardinal points
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, u);
    ctx.fillRect(x + 7*u, y + 10*u, 2*u, u);
    ctx.fillRect(x + 5*u, y + 7*u, u, 2*u);
    ctx.fillRect(x + 10*u, y + 7*u, u, 2*u);
    // Hands — minute (ticks per second) + hour (slow)
    var sec = (t / 1000) % 60;
    var ang = sec * Math.PI * 2 / 60;
    var cx = x + 8*u, cy = y + 8*u;
    var hx = cx + Math.cos(ang - Math.PI/2) * 3*u;
    var hy = cy + Math.sin(ang - Math.PI/2) * 3*u;
    ctx.strokeStyle = '#0a0608';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // Hour hand (slower)
    var hourAng = (t / 60000) % (Math.PI * 2);
    var hHx = cx + Math.cos(hourAng - Math.PI/2) * 2*u;
    var hHy = cy + Math.sin(hourAng - Math.PI/2) * 2*u;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(hHx, hHy);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }

  // Junk pile on the floor — chaotic heap of mismatched stuff.
  function drawJunkPile(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    var COLORS = ['#3a1830', '#5cc8d0', '#a04040', '#c8a840', '#7060d0', '#5ac070', '#888888'];
    // Base shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 3*u, y + 12*u, 10*u, 2*u);
    // Stacked silhouettes — 5 shapes deterministic per col/row
    for (var i = 0; i < 7; i++) {
      var px = x + ((col * 7 + row * 11 + i * 5) % 8 + 3) * u;
      var py = y + (10 - (i % 4)) * u;
      var w = 2 + ((i + col) % 3);
      var h = 1 + ((i + row) % 2);
      ctx.fillStyle = '#0a0608';
      ctx.fillRect(px, py, w*u, h*u);
      ctx.fillStyle = COLORS[(col * 5 + row * 7 + i) % COLORS.length];
      ctx.fillRect(px, py, w*u, h*u - 1);
    }
    // 1u gleam highlight
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(x + 7*u, y + 9*u, u, u);
  }

  // Door — exit threshold.
  function drawDoor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Threshold mat — old red/gold
    ctx.fillStyle = '#3a1010';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, ts - 4*u);
    ctx.fillStyle = '#5a2010';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, u);
    // Arrow out
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(255, 220, 160, ' + (0.55 + bob * 0.2).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + ts - 4*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 9*u, y + ts - 3*u, u, u);
  }

  // Barred window — small with bars showing the night street outside.
  function drawBarredWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Frame
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 6*u);
    // Glass — slowly shifting reflection
    var phase = (t / 4000 + col * 0.4) % 3;
    var glass = phase < 1 ? '#3a1830' : (phase < 2 ? '#181a40' : '#1a3040');
    ctx.fillStyle = glass;
    ctx.fillRect(x + 3*u, y + 6*u, ts - 6*u, 4*u);
    // Iron bars (3 verticals)
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(x + 5*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 8*u, y + 5*u, u, 6*u);
    ctx.fillRect(x + 11*u, y + 5*u, u, 6*u);
    // Reflection
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + 3*u, y + 6*u, u, 4*u);
  }

  BridgeWorld.registerTileset('junk-pawn-shop', {
    1: drawWall,
    2: drawFloor,
    3: drawCounter,
    4: drawWallShelf,
    5: drawSafe,
    6: drawDisplayCase,
    7: drawDoor,
    8: drawCagedLight,
    9: drawPawnbroker,
    10: drawCustomer,
    11: drawClock,
    12: drawJunkPile,
    13: drawBarredWindow
  });

  BridgeWorld.registerBackground('junk-pawn-shop', drawBackground);

})();
