/**
 * Cyber Noodle Bar — Arcadia interior.
 *
 * Small dimly-lit ramen joint. Long counter with stools, a steaming
 * noodle pot in the kitchen, hanging paper lanterns, a flickering
 * neon menu, a chef working behind the bar, and a couple of patrons.
 *
 * Tile drawers below register against the 'cyber-noodle-bar' tileset.
 * The matching world JSON lives at
 *   apps/bridge/assets/worlds/cyber-noodle-bar.json
 */
(function () {

  // ---- Backdrop ----
  // Soft warm gradient so the void around the room doesn't read as black.
  function drawBackground(ctx, w, h, time) {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0612');
    grad.addColorStop(1, '#06040c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // ---- Tiles ----

  // Interior wall — dark wood-panel with a subtle horizontal grain and a 1u
  // top cap so it reads as a vertical surface.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var DK = '#0e0a14';
    var BASE = '#1a1228';
    var BASE_HI = '#251a36';
    var GRAIN = '#15102a';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // 1u top highlight
    ctx.fillStyle = BASE_HI;
    ctx.fillRect(x, y, ts, u);
    // 1u bottom shadow
    ctx.fillStyle = DK;
    ctx.fillRect(x, y + ts - u, ts, u);
    // 1u horizontal grain lines (2 of them per tile)
    ctx.fillStyle = GRAIN;
    ctx.fillRect(x, y + 5*u, ts, u);
    ctx.fillRect(x, y + 11*u, ts, u);
    // 1u vertical seams every 8u
    ctx.fillStyle = DK;
    ctx.fillRect(x + 8*u - u, y + u, u, ts - 2*u);
    // Deterministic 1u rivet/peg
    var seed = (col * 17 + row * 31) % 11;
    if (seed === 0) {
      ctx.fillStyle = '#3a2848';
      ctx.fillRect(x + 4*u, y + 8*u, u, u);
    } else if (seed === 5) {
      ctx.fillStyle = '#3a2848';
      ctx.fillRect(x + 12*u, y + 3*u, u, u);
    }
  }

  // Floor — dark tile with a faint reflective sheen near the player.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var BASE = '#1a1830';
    var TILE = '#221e3a';
    var GROUT = '#0e0a18';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // 8u checker
    ctx.fillStyle = TILE;
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // Grout cross
    ctx.fillStyle = GROUT;
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // Subtle pink sheen (animated, 1 in 7 tiles)
    var puddle = ((col || 0) * 53 + (row || 0) * 11) % 11;
    if (puddle < 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = 'rgba(232, 80, 200, 0.7)';
      ctx.fillRect(x + 4*u, y + 10*u, 8*u, 4*u);
      var shimmer = ((Math.floor((time || 0) / 240) + col + row) % 4);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + (5 + shimmer)*u, y + 11*u, u, u);
      ctx.restore();
    }
    // 1u debris speck
    var s = (col * 31 + row * 7) % 19;
    if (s === 0) {
      ctx.fillStyle = '#0a0814';
      ctx.fillRect(x + 3*u, y + 5*u, u, u);
    } else if (s === 7) {
      ctx.fillStyle = '#0a0814';
      ctx.fillRect(x + 11*u, y + 12*u, u, u);
    }
  }

  // Kitchen floor — hexagonal-tile-ish concrete with grease specks. Different
  // from the dining-floor so the kitchen reads as its own zone.
  function drawKitchenFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    ctx.fillStyle = '#181420';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#221c2a';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // 1u grout outline
    ctx.fillStyle = '#0e0a14';
    ctx.fillRect(x, y, ts, u);
    ctx.fillRect(x, y + ts - u, ts, u);
    ctx.fillRect(x, y, u, ts);
    ctx.fillRect(x + ts - u, y, u, ts);
    // grease specks
    var s = (col * 23 + row * 7) % 11;
    if (s === 0) {
      ctx.fillStyle = '#3a2810';
      ctx.fillRect(x + 5*u, y + 6*u, u, u);
    } else if (s === 4) {
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(x + 10*u, y + 10*u, u, u);
    }
  }

  // Counter — long dark-wood bar with a 1u cyan top edge that pulses.
  function drawCounter(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    // Base
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Top wood highlight
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + u, y + u, ts - 2*u, u);
    // 1u plank seam
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x, y + 9*u, ts, u);
    // Cyan neon edge along the front (south side) of the counter
    var pulse = 0.85 + Math.sin(t / 600 + col * 0.7) * 0.15;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(120, 220, 232, 0.95)';
    ctx.fillRect(x, y + ts - 2*u, ts, u);
    ctx.fillStyle = 'rgba(80, 180, 220, 0.7)';
    ctx.fillRect(x, y + ts - u, ts, u);
    // Soft halo cast onto floor below
    ctx.globalAlpha = pulse * 0.45;
    var halo = ctx.createLinearGradient(x, y + ts, x, y + ts + 6*u);
    halo.addColorStop(0, 'rgba(120, 220, 232, 0.7)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x, y + ts, ts, 6*u);
    ctx.restore();
    // Random napkin holder / condiment caddy on top (deterministic per col)
    var item = (col * 7 + row * 13) % 5;
    if (item === 0) {
      // Napkin holder
      ctx.fillStyle = '#0a0814';
      ctx.fillRect(x + 5*u, y + 2*u, 4*u, 4*u);
      ctx.fillStyle = '#e0e0e8';
      ctx.fillRect(x + 6*u, y + 3*u, 2*u, 3*u);
    } else if (item === 2) {
      // Soy sauce bottle
      ctx.fillStyle = '#0a0814';
      ctx.fillRect(x + 6*u, y + 2*u, 2*u, 5*u);
      ctx.fillStyle = '#3a1830';
      ctx.fillRect(x + 6*u, y + 3*u, 2*u, 3*u);
      ctx.fillStyle = '#5a2848';
      ctx.fillRect(x + 6*u, y + 3*u, u, 3*u);
    }
  }

  // Stool — small round stool with cushion + 4 legs.
  function drawStool(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0e0a14';
    var SEAT = '#3a1830';
    var SEAT_HI = '#7a2a58';
    var POLE = '#1a1626';
    var POLE_HI = '#2a2638';
    // Cushion (round-ish, 6u × 3u)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 4*u, 8*u, 4*u);
    ctx.fillStyle = SEAT;
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, 3*u);
    ctx.fillStyle = SEAT_HI;
    ctx.fillRect(x + 5*u, y + 4*u, 6*u, u);
    // Center pole
    ctx.fillStyle = DK;
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 6*u);
    ctx.fillStyle = POLE;
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 5*u);
    ctx.fillStyle = POLE_HI;
    ctx.fillRect(x + 7*u, y + 7*u, u, 5*u);
    // Footring (4u wide, 1u tall)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 13*u, 4*u, u);
    // Floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 5*u, y + 14*u, 6*u, u);
  }

  // Noodle pot — large stainless pot with rolling steam.
  function drawNoodlePot(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawKitchenFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0814';
    var BODY = '#404048';
    var BODY_HI = '#6a6a72';
    var BODY_SH = '#252530';
    var BROTH = '#3a2410';
    var BROTH_LIGHT = '#7a4a18';
    // Pot body (10u × 8u)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, 9*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, 8*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 3*u, y + 5*u, 10*u, u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 3*u, y + 5*u, u, 7*u);
    ctx.fillStyle = BODY_SH;
    ctx.fillRect(x + 12*u, y + 5*u, u, 7*u);
    // Rim
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 2*u);
    ctx.fillStyle = '#5a5a64';
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, u);
    // Handles (left + right)
    ctx.fillStyle = DK;
    ctx.fillRect(x + u, y + 7*u, 2*u, 3*u);
    ctx.fillRect(x + 13*u, y + 7*u, 2*u, 3*u);
    // Broth surface — animated swirl
    var swirl = Math.sin(t / 600) * 0.5 + 0.5;
    ctx.fillStyle = BROTH;
    ctx.fillRect(x + 4*u, y + 6*u, 8*u, 2*u);
    ctx.fillStyle = BROTH_LIGHT;
    ctx.fillRect(x + 5*u + Math.floor(swirl * 2*u), y + 7*u, 4*u, u);
    // Bubbles — random 1u bubbles pop up and float
    for (var b = 0; b < 4; b++) {
      var bp = ((Math.floor(t / 150) + b * 7) % 12);
      var bx = x + (5 + (b * 2) % 6) * u;
      var by = y + 7*u - Math.floor(bp / 3) * u;
      if (bp < 9) {
        ctx.globalAlpha = 0.7 - bp * 0.06;
        ctx.fillStyle = '#e0c890';
        ctx.fillRect(bx, by, u, u);
      }
    }
    ctx.globalAlpha = 1;
    // Steam — 3 columns of rising 1u puffs
    for (var s = 0; s < 6; s++) {
      var sx = x + (4 + (s % 3) * 3)*u;
      var phase = (Math.floor(t / 140 + s * 5)) % 14;
      var sy = y + 4*u - phase * u;
      if (phase < 12) {
        var alpha = Math.max(0, 0.55 - phase * 0.04 - (s >= 3 ? 0.12 : 0));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s % 2 === 0 ? '#e8e8f0' : '#c8c8d8';
        var puff = (phase < 4) ? 1 : 2;
        ctx.fillRect(sx, sy, u * puff, u * puff);
      }
    }
    ctx.globalAlpha = 1;
    // Soft warm glow under the pot — fire / induction element
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var fl = 0.7 + Math.sin(t / 300) * 0.2;
    ctx.globalAlpha = fl * 0.5;
    var firegrad = ctx.createRadialGradient(x + ts/2, y + 13*u, 0, x + ts/2, y + 13*u, 7*u);
    firegrad.addColorStop(0, 'rgba(255, 160, 80, 0.85)');
    firegrad.addColorStop(0.6, 'rgba(232, 80, 80, 0.4)');
    firegrad.addColorStop(1, 'transparent');
    ctx.fillStyle = firegrad;
    ctx.fillRect(x - 2*u, y + 8*u, ts + 4*u, ts/2);
    ctx.restore();
  }

  // Lit menu board — wide rectangle with cycling neon menu items.
  // Designed for use in a row of identical tiles (back wall mounting).
  function drawMenuBoard(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Menu frame
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, 11*u);
    // Inner panel — dark lit background
    ctx.fillStyle = '#181030';
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, 9*u);
    // Cycling neon menu lines (each tile shows 2-3 horizontal "menu rows")
    // The hue-cycle phase varies per col so adjacent tiles aren't in lockstep.
    var phase = (t / 1500 + col * 0.6) % 3;
    var hue = phase < 1 ? 'rgba(232, 80, 200,' : (phase < 2 ? 'rgba(120, 220, 232,' : 'rgba(255, 200, 80,');
    var pulse = 0.78 + Math.sin(t / 500 + col * 1.4) * 0.18;
    ctx.fillStyle = hue + (pulse * 0.95).toFixed(2) + ')';
    ctx.fillRect(x + 3*u, y + 4*u, ts - 6*u, u);
    ctx.fillRect(x + 3*u, y + 7*u, ts - 7*u, u);
    ctx.fillRect(x + 3*u, y + 10*u, ts - 5*u, u);
    // 1u price marks on the right
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(x + ts - 5*u, y + 4*u, 2*u, u);
    ctx.fillRect(x + ts - 4*u, y + 7*u, u, u);
    ctx.fillRect(x + ts - 6*u, y + 10*u, 3*u, u);
    // Atmospheric halo bleeding off the menu
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.4;
    var halo = ctx.createRadialGradient(x + ts/2, y + 8*u, 0, x + ts/2, y + 8*u, ts);
    var haloColor = phase < 1 ? 'rgba(232, 80, 200, 0.6)' : (phase < 2 ? 'rgba(120, 220, 232, 0.55)' : 'rgba(255, 200, 80, 0.55)');
    halo.addColorStop(0, haloColor);
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts * 0.4, y - ts * 0.2, ts * 1.8, ts * 1.6);
    ctx.restore();
    // 1u rivet on each corner of the menu frame
    ctx.fillStyle = '#3a2848';
    ctx.fillRect(x + 2*u, y + 3*u, u, u);
    ctx.fillRect(x + ts - 3*u, y + 3*u, u, u);
    ctx.fillRect(x + 2*u, y + 11*u, u, u);
    ctx.fillRect(x + ts - 3*u, y + 11*u, u, u);
  }

  // Hanging paper lantern — round red lantern with warm glow + gentle sway.
  function drawHangingLantern(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    // Sway phase per-col so adjacent lanterns drift independently
    var sway = Math.sin(t / 1200 + col * 0.7) * u;
    var cx = x + ts / 2 + sway;
    // Cord
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(cx - 0.5, y, 1, 5*u);
    // Lantern body — stepped circle
    var DK = '#3a0808';
    var BODY = '#a01818';
    var HI = '#e84040';
    var topY = y + 5*u;
    ctx.fillStyle = DK;
    ctx.fillRect(cx - 4*u, topY, 8*u, 6*u);
    ctx.fillRect(cx - 3*u, topY - u, 6*u, u);
    ctx.fillRect(cx - 3*u, topY + 6*u, 6*u, u);
    ctx.fillStyle = BODY;
    ctx.fillRect(cx - 3*u, topY, 6*u, 6*u);
    ctx.fillRect(cx - 4*u, topY + u, u, 4*u);
    ctx.fillRect(cx + 3*u, topY + u, u, 4*u);
    // 1u top highlight
    ctx.fillStyle = HI;
    ctx.fillRect(cx - 3*u, topY, 6*u, u);
    // Vertical ribs
    ctx.fillStyle = DK;
    ctx.fillRect(cx - 1, topY + u, 1, 5*u);
    // Tassel below
    ctx.fillRect(cx - 0.5, topY + 7*u, 1, 2*u);
    ctx.fillStyle = '#e8c860';
    ctx.fillRect(cx - 1, topY + 9*u, 2, u);
    // Warm glow
    var pulse = 0.75 + Math.sin(t / 600 + col * 1.3) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.55;
    var glow = ctx.createRadialGradient(cx, topY + 3*u, 0, cx, topY + 3*u, 9*u);
    glow.addColorStop(0, 'rgba(255, 140, 100, 0.85)');
    glow.addColorStop(0.5, 'rgba(232, 80, 60, 0.35)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - ts * 0.3, y, ts * 1.6, ts * 1.4);
    ctx.restore();
  }

  // Spice / bottle shelf — kitchen wall with rows of jars and bottles.
  function drawSpiceShelf(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    var SHELF = '#3a2410';
    var SHELF_DK = '#1a0e08';
    var SHELF_HI = '#5a3a1a';
    // 2 horizontal shelves
    ctx.fillStyle = SHELF_DK;
    ctx.fillRect(x + u, y + 5*u, ts - 2*u, 2*u);
    ctx.fillRect(x + u, y + 11*u, ts - 2*u, 2*u);
    ctx.fillStyle = SHELF;
    ctx.fillRect(x + u, y + 5*u, ts - 2*u, u);
    ctx.fillRect(x + u, y + 11*u, ts - 2*u, u);
    ctx.fillStyle = SHELF_HI;
    ctx.fillRect(x + u, y + 5*u, ts - 2*u, 1);
    ctx.fillRect(x + u, y + 11*u, ts - 2*u, 1);
    // Bottles & jars on each shelf — varied colors
    var COLORS = ['#3a1830', '#1a3040', '#3a1810', '#1a3a20', '#403018', '#2a1840'];
    var TOPS = ['#5a2848', '#5cc8d0', '#a04040', '#5cb070', '#806820', '#7060d0'];
    for (var s = 0; s < 2; s++) {
      var shelfY = y + (s === 0 ? 2*u : 8*u);
      for (var b = 0; b < 4; b++) {
        var bx = x + (1 + b * 4) * u + (s * u);
        var idx = (col * 11 + row * 7 + s * 3 + b) % COLORS.length;
        var bottleH = 3*u;
        if ((col + s + b) % 3 === 0) bottleH = 2*u;
        ctx.fillStyle = SHELF_DK;
        ctx.fillRect(bx, shelfY, 2*u, bottleH + u);
        ctx.fillStyle = COLORS[idx];
        ctx.fillRect(bx, shelfY, 2*u, bottleH);
        // 1u top cap
        ctx.fillStyle = TOPS[idx];
        ctx.fillRect(bx, shelfY, 2*u, u);
        // 1u left highlight
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(bx, shelfY, u, bottleH);
      }
    }
  }

  // Chef NPC — apron, headband, larger sprite. Stays put behind counter.
  function drawChef(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawKitchenFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0a16';
    var SKIN = '#e0c0a0';
    var APRON = '#e8e8f0';
    var APRON_DK = '#a0a0b0';
    var BAND = '#e84040';        // red headband
    var BAND_HI = '#ff8080';
    var SHIRT = '#252040';
    // Slight stir bob
    var bob = Math.sin(t / 320) > 0.6 ? -u : 0;
    // Headband
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, u);
    ctx.fillStyle = BAND;
    ctx.fillRect(x + 4*u, y + 1*u + bob, 8*u, u);
    ctx.fillStyle = BAND_HI;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 1*u, u);
    // Headband knot (left side, trailing)
    ctx.fillStyle = BAND;
    ctx.fillRect(x + 3*u, y + 2*u + bob, u, 2*u);
    // Head
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = SKIN;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    // Eyes
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Mustache
    ctx.fillRect(x + 7*u, y + 5*u + bob, 2*u, u);
    // Body outline
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    // Apron
    ctx.fillStyle = APRON;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    // Apron strap
    ctx.fillStyle = APRON_DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    // Apron strings (tied behind, shown as 1u dark line at sides of waist)
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 9*u + bob, u, u);
    ctx.fillRect(x + 11*u, y + 9*u + bob, u, u);
    // Pants/shirt visible below apron
    ctx.fillStyle = SHIRT;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 6*u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
    // Stir motion: holds a ladle — small handle visible in front
    if (Math.sin(t / 320) > 0) {
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x + 11*u, y + 7*u + bob, 3*u, u);
      ctx.fillStyle = '#5a5a64';
      ctx.fillRect(x + 13*u, y + 8*u + bob, 2*u, 2*u);
    } else {
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x + 1*u, y + 7*u + bob, 3*u, u);
      ctx.fillStyle = '#5a5a64';
      ctx.fillRect(x, y + 8*u + bob, 2*u, 2*u);
    }
  }

  // Patron NPC — varied palette, sitting eating noodles. Slight bob to imply slurping.
  function drawPatron(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawFloor(ctx, x, y, ts, time, col, row);
    var PALETTES = [
      { suit:'#5cc8d0', light:'#90e0e8', dark:'#388890', skin:'#c0a080', hair:'#1a0e1a' },
      { suit:'#a040c0', light:'#c060e0', dark:'#601880', skin:'#e8d0b0', hair:'#3a1a30' },
      { suit:'#c8a840', light:'#e8c870', dark:'#806820', skin:'#e0c0a0', hair:'#1a0e08' },
      { suit:'#d04080', light:'#f078a8', dark:'#80285a', skin:'#d0a880', hair:'#1a0e08' }
    ];
    var pal = PALETTES[(col * 13 + row * 29) % PALETTES.length];
    var DK = '#0a0a16';
    // Slurp bob: occasional 1u dip + chopstick motion
    var slurp = (Math.sin(t / 380 + col * 1.7) > 0.7);
    var bob = slurp ? u : 0;
    // Hair
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, 2*u);
    ctx.fillStyle = pal.hair;
    ctx.fillRect(x + 5*u, y + 1*u + bob, 6*u, u);
    // Head
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    ctx.fillStyle = pal.skin;
    ctx.fillRect(x + 5*u, y + 2*u + bob, 6*u, 4*u);
    // Eyes
    ctx.fillStyle = DK;
    ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
    ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    // Body
    ctx.fillStyle = DK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    ctx.fillStyle = pal.suit;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = pal.light;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);
    // Legs
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
    // Bowl in front
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, 2*u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 5*u, y + 13*u, 6*u, u);
    // Noodles in bowl (yellow)
    ctx.fillStyle = '#e8c860';
    ctx.fillRect(x + 6*u, y + 13*u, 4*u, u);
    // Chopsticks held up to mouth when slurping
    if (slurp) {
      ctx.fillStyle = '#c0a070';
      ctx.fillRect(x + 7*u, y + 6*u + bob, u, 4*u);
      ctx.fillRect(x + 8*u, y + 6*u + bob, u, 4*u);
    }
    // 1u steam from bowl
    var sp = (Math.floor(t / 220) + col) % 5;
    ctx.globalAlpha = 0.5 - sp * 0.08;
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(x + 7*u, y + 12*u - sp * u, u, u);
    ctx.globalAlpha = 1;
  }

  // Small standing table — round top with single pedestal.
  function drawSmallTable(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0814';
    // Top
    ctx.fillStyle = DK;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 4*u);
    ctx.fillStyle = '#3a2848';
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 3*u);
    ctx.fillStyle = '#5a4068';
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, u);
    // Pedestal
    ctx.fillStyle = DK;
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 5*u);
    ctx.fillStyle = '#1a1626';
    ctx.fillRect(x + 7*u, y + 7*u, 2*u, 4*u);
    // Foot
    ctx.fillStyle = DK;
    ctx.fillRect(x + 5*u, y + 12*u, 6*u, u);
    // Item on top — a tiny ramen bowl + chopsticks
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(x + 6*u, y + 5*u, 4*u, 2*u);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 6*u, y + 5*u, 4*u, u);
    ctx.fillStyle = '#e8c860';
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, u);
    // 1u chopstick
    ctx.fillStyle = '#c0a070';
    ctx.fillRect(x + 10*u, y + 4*u, u, 2*u);
  }

  // Door / exit threshold. Walkable; the leave_world interaction sits on it.
  function drawDoor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawFloor(ctx, x, y, ts, time, col, row);
    // Threshold mat
    ctx.fillStyle = '#3a1830';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, ts - 4*u);
    ctx.fillStyle = '#5a2848';
    ctx.fillRect(x + u, y + 2*u, ts - 2*u, u);
    // Animated arrow pointing out (subtle)
    var t = time || 0;
    var bob = Math.sin(t / 600) * 0.5;
    ctx.fillStyle = 'rgba(255, 200, 232, ' + (0.55 + bob * 0.2).toFixed(2) + ')';
    ctx.fillRect(x + 7*u, y + ts - 4*u, 2*u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 9*u, y + ts - 3*u, u, u);
  }

  // Windows — small horizontal strips, dark with neon outline. Used on the
  // front wall flanking the door so the room reads as facing a street.
  function drawWindow(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    drawWall(ctx, x, y, ts, time, col, row);
    var t = time || 0;
    // Frame
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + 2*u, y + 5*u, ts - 4*u, 6*u);
    // Glass — color shifts slowly as if reflecting the neon street
    var phase = (t / 4000 + col * 0.3) % 3;
    var glass = phase < 1 ? '#3a1830' : (phase < 2 ? '#181a40' : '#1a3040');
    ctx.fillStyle = glass;
    ctx.fillRect(x + 3*u, y + 6*u, ts - 6*u, 4*u);
    // Mullion
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + ts/2 - u/2, y + 5*u, 1, 6*u);
    // Reflection
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 3*u, y + 6*u, u, 4*u);
  }

  // Neon strip on wall — thin pink horizontal tube, animated pulse.
  function drawNeonStrip(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawWall(ctx, x, y, ts, time, col, row);
    var pulse = 0.78 + Math.sin(t / 400 + col * 0.9) * 0.18;
    if ((Math.floor(t / 90) + col * 7) % 113 === 0) pulse *= 0.45;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse;
    // Tube core
    ctx.fillStyle = 'rgba(255, 160, 220, 0.95)';
    ctx.fillRect(x + 2*u, y + 8*u, ts - 4*u, u);
    // Bright center line
    ctx.fillStyle = 'rgba(255, 220, 240, 0.9)';
    ctx.fillRect(x + 3*u, y + 8*u, ts - 6*u, 1);
    // Halo
    ctx.globalAlpha = pulse * 0.45;
    var halo = ctx.createRadialGradient(x + ts/2, y + 8.5*u, 0, x + ts/2, y + 8.5*u, ts * 0.7);
    halo.addColorStop(0, 'rgba(232, 80, 200, 0.7)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts * 0.3, y + 4*u, ts * 1.6, 10*u);
    ctx.restore();
    // Bracket clamps at each end
    ctx.fillStyle = '#3a2848';
    ctx.fillRect(x + u, y + 7*u, u, 3*u);
    ctx.fillRect(x + ts - 2*u, y + 7*u, u, 3*u);
  }

  // Cooler / fridge cabinet — tall fridge with glass front showing colored drinks.
  function drawCooler(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var t = time || 0;
    drawKitchenFloor(ctx, x, y, ts, time, col, row);
    var DK = '#0a0814';
    var BODY = '#1e2838';
    var BODY_HI = '#3a4858';
    // Body
    ctx.fillStyle = DK;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, 1);
    // Glass front (large)
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 7*u);
    // Cyan back-glow
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var glow = 0.7 + Math.sin(t / 700) * 0.1;
    ctx.globalAlpha = glow * 0.6;
    var grad = ctx.createLinearGradient(x, y, x, y + ts);
    grad.addColorStop(0, 'rgba(120, 220, 232, 0.7)');
    grad.addColorStop(1, 'rgba(80, 60, 200, 0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 3*u, y + 3*u, ts - 6*u, ts - 7*u);
    ctx.restore();
    // Drink bottles inside (3 shelves × 3 bottles)
    var DRINK_COLORS = [['#e84040','#ff8080'], ['#5cc8d0','#90e0e8'], ['#c8a840','#e8c870'], ['#a040c0','#c860e0']];
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
    // Reflection band on glass
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x + 3*u, y + 3*u, u, ts - 7*u);
    // Door handle (right side)
    ctx.fillStyle = '#a0a0b0';
    ctx.fillRect(x + ts - 4*u, y + 5*u, u, 5*u);
  }

  BridgeWorld.registerTileset('cyber-noodle-bar', {
    1: drawWall,
    2: drawFloor,
    3: drawCounter,
    4: drawStool,
    5: drawNoodlePot,
    6: drawMenuBoard,
    7: drawDoor,
    8: drawHangingLantern,
    9: drawChef,
    10: drawPatron,
    11: drawSmallTable,
    12: drawSpiceShelf,
    13: drawKitchenFloor,
    14: drawNeonStrip,
    15: drawWindow,
    16: drawCooler
  });

  BridgeWorld.registerBackground('cyber-noodle-bar', drawBackground);

})();
