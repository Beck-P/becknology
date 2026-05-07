/**
 * Arcadia World Module — Neon arcade planet.
 *
 * Tileset draw functions for Arcadia's tile types.
 * ¾ view with brick walls, arcade cabinets, neon signs.
 * Registers itself with BridgeWorld on load.
 */
(function () {

  // ---- Tile Draw Functions ----
  // Each receives (ctx, x, y, ts, time, col, row) where ts = rendered tile size

  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var h = ts / 2;
    ctx.fillStyle = '#2a2240';
    ctx.fillRect(x, y, ts, ts);
    // Slightly higher contrast checker
    ctx.fillStyle = '#332858';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
    // Tile grout lines
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + h - Math.max(1, u*0.4), y, Math.max(1, u*0.5), ts);
    ctx.fillRect(x, y + h - Math.max(1, u*0.4), ts, Math.max(1, u*0.5));
    // Occasional debris/sparkle (deterministic per tile)
    var seed = (col * 41 + row * 17) % 19;
    if (seed === 0) {
      ctx.fillStyle = 'rgba(255,200,150,0.15)';
      ctx.fillRect(x + 4*u, y + 11*u, u, u);
    } else if (seed === 5) {
      ctx.fillStyle = 'rgba(120,80,160,0.25)';
      ctx.fillRect(x + 11*u, y + 4*u, u*0.8, u*0.8);
    }
  }

  function drawFloorLight(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var h = ts / 2;
    ctx.fillStyle = '#3a3260';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#463a78';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + h - Math.max(1, u*0.4), y, Math.max(1, u*0.5), ts);
    ctx.fillRect(x, y + h - Math.max(1, u*0.4), ts, Math.max(1, u*0.5));
  }

  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var capH = Math.floor(ts * 0.3);
    // Cap (top edge of wall) — slightly darker
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x, y, ts, capH);
    // Cap highlight
    ctx.fillStyle = '#3a3252';
    ctx.fillRect(x, y, ts, Math.max(1, u));
    // Wall body
    ctx.fillStyle = '#2a2245';
    ctx.fillRect(x, y + capH, ts, ts - capH);
    // Brick lines (mortar) — scale-aware
    var lw = Math.max(1, u * 0.4);
    ctx.fillStyle = '#15102a';
    ctx.fillRect(x, y + Math.floor(ts * 0.5), ts, lw);
    ctx.fillRect(x, y + Math.floor(ts * 0.75), ts, lw);
    // Vertical brick offsets per row (alternating courses)
    var brickShift = (row % 2 === 0) ? 0 : Math.floor(ts * 0.25);
    ctx.fillRect(x + (Math.floor(ts * 0.25) + brickShift) % ts, y + capH, lw, Math.floor((ts - capH) * 0.5));
    ctx.fillRect(x + (Math.floor(ts * 0.75) + brickShift) % ts, y + capH, lw, Math.floor((ts - capH) * 0.5));
    ctx.fillRect(x + (Math.floor(ts * 0.5) + (1 - row % 2) * Math.floor(ts * 0.25)) % ts, y + Math.floor(ts * 0.5), lw, Math.floor((ts - capH) * 0.5));
    // Subtle wear speckles deterministically
    var seed = col * 23 + row * 11;
    if (seed % 5 === 0) {
      ctx.fillStyle = '#1e1a35';
      ctx.fillRect(x + (seed % 13)*u*0.7 + u, y + capH + (seed % 5)*u, u*0.7, u*0.7);
    }
  }

  function drawWallDark(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var capH = Math.floor(ts * 0.3);
    ctx.fillStyle = '#151230';
    ctx.fillRect(x, y, ts, capH);
    ctx.fillStyle = '#251c40';
    ctx.fillRect(x, y, ts, Math.max(1, u));
    ctx.fillStyle = '#201a3a';
    ctx.fillRect(x, y + capH, ts, ts - capH);
    var lw = Math.max(1, u * 0.4);
    ctx.fillStyle = '#0e0820';
    ctx.fillRect(x, y + Math.floor(ts * 0.5), ts, lw);
    ctx.fillRect(x, y + Math.floor(ts * 0.75), ts, lw);
    var brickShift = (row % 2 === 0) ? 0 : Math.floor(ts * 0.25);
    ctx.fillRect(x + (Math.floor(ts * 0.25) + brickShift) % ts, y + capH, lw, Math.floor((ts - capH) * 0.5));
    ctx.fillRect(x + (Math.floor(ts * 0.75) + brickShift) % ts, y + capH, lw, Math.floor((ts - capH) * 0.5));
    ctx.fillRect(x + (Math.floor(ts * 0.5) + (1 - row % 2) * Math.floor(ts * 0.25)) % ts, y + Math.floor(ts * 0.5), lw, Math.floor((ts - capH) * 0.5));
  }

  function drawCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var SCREEN_COLORS = [
      ['#3855a0', '#5a78d0'], ['#388850', '#5cc080'], ['#a07038', '#d0a060'],
      ['#388890', '#5ac0c8'], ['#80388c', '#c060c0'], ['#a04040', '#d07070']
    ];
    var GLINT_COLORS = ['#a0b0d8', '#a0d8a8', '#d8c0a0', '#a0d8d8', '#d8a0d8', '#d8a0a0'];
    var idx = (col * 17 + row * 31 + col * row) % 6;
    var phase = (time / 800) + (col * 7 + row * 13);
    var pulse = 0.85 + Math.sin(phase) * 0.15;
    // Cabinet body
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Cabinet outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 3*u, y + u, u, ts - 2*u);
    // Screen — lerp between dim and bright based on pulse, no alpha clamp
    var sw = ts - 6*u;
    var sh = Math.floor(ts * 0.35);
    var sx = x + 3*u;
    var sy = y + 3*u;
    ctx.fillStyle = SCREEN_COLORS[idx][0];
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillStyle = SCREEN_COLORS[idx][1];
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    // Animated content: scrolling band that varies per cabinet
    var scroll = Math.floor((time / (200 + idx * 50)) % sh);
    ctx.fillStyle = GLINT_COLORS[idx];
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx, sy + scroll, sw, Math.max(1, u));
    ctx.globalAlpha = 1;
    // CRT scanlines on screen
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (var sl = 0; sl < sh; sl += 2*u) {
      ctx.fillRect(sx, sy + sl, sw, Math.max(1, u * 0.5));
    }
    // Marquee panel
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    // Joystick + buttons (control panel)
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    ctx.fillStyle = ['#d04040','#40b040','#4080d0','#d0d040'][(col+row) % 4];
    ctx.fillRect(x + Math.floor(ts * 0.55), y + Math.floor(ts * 0.6), u, u);
    ctx.fillRect(x + Math.floor(ts * 0.7), y + Math.floor(ts * 0.6), u, u);
    // Feet
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawRunoutsCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var phase = (time / 600) + (col * 5 + row * 11);
    var pulse = 0.7 + Math.sin(phase) * 0.3;
    // Body
    ctx.fillStyle = '#252040';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 3*u, y + u, u, ts - 2*u);
    // Screen — pink pulsing
    var sx = x + 3*u, sy = y + 3*u;
    var sw = ts - 6*u, sh = Math.floor(ts * 0.35);
    ctx.fillStyle = '#a04068';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    // Marquee text — three small "RUN" pixel blocks suggesting RUNOUTS
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.85;
    var blockW = Math.max(1, u * 1.2);
    ctx.fillRect(sx + Math.floor(sw * 0.18), sy + Math.floor(sh * 0.35), blockW, blockW);
    ctx.fillRect(sx + Math.floor(sw * 0.45), sy + Math.floor(sh * 0.35), blockW, blockW);
    ctx.fillRect(sx + Math.floor(sw * 0.72), sy + Math.floor(sh * 0.35), blockW, blockW);
    ctx.globalAlpha = 1;
    // Glint
    ctx.fillStyle = '#ffe0f0';
    ctx.fillRect(x + Math.floor(ts * 0.4), y + 4*u, u, u);
    // CRT scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (var sl = 0; sl < sh; sl += 2*u) {
      ctx.fillRect(sx, sy + sl, sw, Math.max(1, u * 0.5));
    }
    // Marquee
    ctx.fillStyle = '#3a1a30';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    ctx.globalAlpha = 0.8 + Math.sin(time / 350 + col) * 0.2;
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(x + 4*u, y + Math.floor(ts * 0.58), ts - 8*u, Math.max(1, u));
    ctx.globalAlpha = 1;
    // Joystick + buttons
    ctx.fillStyle = '#888';
    ctx.fillRect(x + Math.floor(ts * 0.35), y + Math.floor(ts * 0.55), 2*u, 3*u);
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(x + Math.floor(ts * 0.55), y + Math.floor(ts * 0.6), u, u);
    ctx.fillStyle = '#d040d0';
    ctx.fillRect(x + Math.floor(ts * 0.7), y + Math.floor(ts * 0.6), u, u);
    // Feet
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawHighScoreBoard(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Frame
    ctx.fillStyle = '#0e1c0e';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, ts - 4*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 3*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + 2*u, u, ts - 4*u);
    ctx.fillRect(x + ts - 3*u, y + 2*u, u, ts - 4*u);
    // Inner CRT — green phosphor with subtle scanlines
    var sx = x + 3*u, sy = y + 3*u;
    var sw = ts - 6*u, sh = ts - 7*u;
    var pulse = 0.85 + Math.sin(time / 600 + col + row) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#2a8a44';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    // Animated rows — each row scrolls slightly
    var rows = 4;
    for (var i = 0; i < rows; i++) {
      var rowOff = ((time / 80 + col * 7 + i * 50) % 24) / 24;
      var rowAlpha = 0.7 + Math.sin(time / 300 + i + col) * 0.2;
      ctx.globalAlpha = rowAlpha;
      ctx.fillStyle = i === 0 ? '#a8e8a8' : '#4ec076';
      ctx.fillRect(sx + u, sy + (1 + i * 2)*u, sw - 2*u, u);
      // Faux digit on right
      ctx.fillStyle = i === 0 ? '#fff8a0' : '#a8d8a8';
      ctx.fillRect(sx + sw - (3 + Math.floor(rowOff * 2))*u, sy + (1 + i * 2)*u, u, u);
    }
    ctx.globalAlpha = 1;
    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (var sl = 0; sl < sh; sl += 2*u) {
      ctx.fillRect(sx, sy + sl, sw, Math.max(1, u * 0.4));
    }
    // Title bar
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + ts - 4*u, ts - 4*u, 2*u);
    ctx.fillStyle = '#a8e8a8';
    ctx.fillRect(x + 4*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 6*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 8*u, y + ts - 3*u, u, u);
    ctx.fillRect(x + 10*u, y + ts - 3*u, u, u);
  }

  function drawNeonSign(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = col * 17 + row * 31;
    var t = Math.floor(time / 80);
    var flicker = 1;
    if ((t + seed) % 37 === 0 || (t + seed) % 53 === 0) {
      flicker = 0.4 + Math.random() * 0.3;
    } else {
      flicker = 0.9 + Math.sin(time / 400 + seed) * 0.1;
    }
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x + u, y + u, ts - 2*u, Math.floor(ts * 0.35));
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#c040d0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.2));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#333';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.4), u, 3*u);
    ctx.fillRect(x + ts - 3*u, y + Math.floor(ts * 0.4), u, 3*u);
    ctx.fillStyle = '#2a2245';
    ctx.fillRect(x, y + Math.floor(ts * 0.55), ts, ts - Math.floor(ts * 0.55));
  }

  function drawEntrance(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // A simple threshold/doormat (the entrance tiles are walkable foyer)
    ctx.fillStyle = '#4a4268';
    ctx.fillRect(x, y, ts, Math.max(1, u));
    ctx.fillRect(x, y + ts - Math.max(1, u), ts, Math.max(1, u));
  }

  // Proper closed-door tile — used at the arcade's street facade entrance
  // and at the side exit of the arcade interior.
  function drawArcadeDoor(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Stone / wall-dark base behind
    ctx.fillStyle = '#1e1835';
    ctx.fillRect(x, y, ts, ts);
    // Stone frame around door
    ctx.fillStyle = '#15102a';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.8));
    ctx.fillRect(x, y + ts - Math.max(1, u * 0.8), ts, Math.max(1, u * 0.8));
    ctx.fillRect(x, y, Math.max(1, u * 0.8), ts);
    ctx.fillRect(x + ts - Math.max(1, u * 0.8), y, Math.max(1, u * 0.8), ts);
    // Brass kickplate at top of door
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, Math.max(1, u * 1.2));
    // Door panel — vertical wooden door
    var dx = x + Math.max(1, u * 1.6);
    var dw = ts - 2 * Math.max(1, u * 1.6);
    var dy = y + Math.max(1, u * 1.6);
    var dh = ts - 2 * Math.max(1, u * 1.6);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(dx, dy, dw, dh);
    // Vertical wood grain
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(dx + Math.floor(dw * 0.33), dy, Math.max(1, u * 0.5), dh);
    ctx.fillRect(dx + Math.floor(dw * 0.66), dy, Math.max(1, u * 0.5), dh);
    // Top highlight
    ctx.fillStyle = '#7a4e22';
    ctx.fillRect(dx, dy, dw, Math.max(1, u * 0.5));
    ctx.fillRect(dx, dy, Math.max(1, u * 0.5), dh);
    // Iron hinges (left edge)
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(dx, dy + 2*u, Math.max(1, u * 1.2), Math.max(1, u * 0.8));
    ctx.fillRect(dx, dy + dh - 3*u, Math.max(1, u * 1.2), Math.max(1, u * 0.8));
    // Doorknob (right side, brass with glow)
    var knobX = dx + dw - 3*u;
    var knobY = dy + Math.floor(dh * 0.55);
    ctx.fillStyle = '#a08040';
    ctx.beginPath();
    ctx.arc(knobX + u*0.5, knobY + u*0.5, Math.max(1, u * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(knobX, knobY - Math.max(1, u * 0.3), Math.max(1, u * 0.5), Math.max(1, u * 0.5));
    // Subtle warm glow leaking through the door (light from inside)
    var glow = 0.55 + Math.sin(time / 1200 + col + row) * 0.15;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = glow * 0.35;
    var grad = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts);
    grad.addColorStop(0, 'rgba(255,200,120,0.55)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - ts*0.5, y - ts*0.5, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function drawFloorDark(ctx, x, y, ts) {
    var h = ts / 2;
    ctx.fillStyle = '#221c38';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#261e40';
    ctx.fillRect(x, y, h, h);
    ctx.fillRect(x + h, y + h, h, h);
  }

  function drawFloorWorn(ctx, x, y, ts) {
    var u = ts / 16;
    ctx.fillStyle = '#2a2240';
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = '#1e1a30';
    ctx.fillRect(x + 3*u, y + 5*u, 2*u, u);
    ctx.fillRect(x + 8*u, y + 10*u, 3*u, u);
    ctx.fillRect(x + 6*u, y + 2*u, u, 2*u);
  }

  function drawPoster(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var POSTER_THEMES = [
      { bg: '#d06090', accent: '#fff', icon: 'star' },
      { bg: '#5cc8d0', accent: '#08303a', icon: 'lightning' },
      { bg: '#c8a840', accent: '#403018', icon: 'crown' },
      { bg: '#60b060', accent: '#082a18', icon: 'arrow' },
      { bg: '#8060d0', accent: '#fff', icon: 'skull' }
    ];
    var idx = (col * 5 + row * 7) % POSTER_THEMES.length;
    var theme = POSTER_THEMES[idx];
    drawWall(ctx, x, y, ts);
    var fx = x + 3*u;
    var fy = y + Math.floor(ts * 0.32);
    var fw = ts - 6*u;
    var fh = Math.floor(ts * 0.5);
    // Frame
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(fx + u, fy + u, fw - 2*u, fh - 2*u);
    // Icon
    var icx = fx + Math.floor(fw / 2);
    var icy = fy + Math.floor(fh * 0.4);
    ctx.fillStyle = theme.accent;
    var s = Math.max(1, Math.floor(u * 0.8));
    if (theme.icon === 'star') {
      ctx.fillRect(icx - s, icy - 2*s, 2*s, s);
      ctx.fillRect(icx - 2*s, icy - s, 4*s, 2*s);
      ctx.fillRect(icx - s, icy + s, 2*s, s);
    } else if (theme.icon === 'lightning') {
      ctx.fillRect(icx, icy - 2*s, s, 2*s);
      ctx.fillRect(icx - s, icy, 2*s, s);
      ctx.fillRect(icx - s, icy + s, s, 2*s);
    } else if (theme.icon === 'crown') {
      ctx.fillRect(icx - 2*s, icy, s, 2*s);
      ctx.fillRect(icx, icy - s, s, 3*s);
      ctx.fillRect(icx + s, icy, s, 2*s);
      ctx.fillRect(icx - 2*s, icy + 2*s, 4*s, s);
    } else if (theme.icon === 'arrow') {
      ctx.fillRect(icx, icy - 2*s, s, 4*s);
      ctx.fillRect(icx - s, icy - s, s, s);
      ctx.fillRect(icx + s, icy - s, s, s);
    } else if (theme.icon === 'skull') {
      ctx.fillRect(icx - 2*s, icy - 2*s, 4*s, 3*s);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(icx - 2*s, icy - s, s, s);
      ctx.fillRect(icx + s, icy - s, s, s);
      ctx.fillStyle = theme.accent;
      ctx.fillRect(icx - s, icy + s, s, s);
      ctx.fillRect(icx, icy + s, s, s);
    }
    // Tape corners
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(fx, fy, 2*u, u);
    ctx.fillRect(fx + fw - 2*u, fy, 2*u, u);
  }

  function drawBrokenCabinet(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Body — slightly weathered
    ctx.fillStyle = '#1f1a32';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, ts - 2*u);
    ctx.fillStyle = '#15101e';
    ctx.fillRect(x + 3*u, y + u, ts - 6*u, 2*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 2*u, y + u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + ts - 2*u, ts - 4*u, u);
    ctx.fillRect(x + 2*u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 3*u, y + u, u, ts - 2*u);
    // Screen
    var screenX = x + 3*u;
    var screenY = y + 3*u;
    var screenW = ts - 6*u;
    var screenH = Math.floor(ts * 0.35);
    // Static base (dark with tiny noise)
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(screenX, screenY, screenW, screenH);
    // Noise specks
    for (var n = 0; n < 6; n++) {
      var nseed = (col * 13 + row * 17 + n * 19 + Math.floor(time / 80)) % 100;
      if (nseed < 50) {
        var nx = screenX + ((nseed * 7) % screenW);
        var ny = screenY + ((nseed * 11) % screenH);
        ctx.fillStyle = nseed % 2 ? '#3a3a4a' : '#1a1a2a';
        ctx.fillRect(nx, ny, Math.max(1, u * 0.5), Math.max(1, u * 0.5));
      }
    }
    // Garble — much more frequent (every ~1.5s, varies per cabinet)
    var garbleTick = (Math.floor(time / 90) + col * 23 + row * 41) % 17;
    if (garbleTick < 2) {
      var gColors = ['#d06090', '#3855a0', '#40b060', '#c8a840', '#80388c'];
      ctx.fillStyle = gColors[(col + row + Math.floor(time / 200)) % gColors.length];
      ctx.globalAlpha = 0.55;
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX, screenY + 2*u, screenW, Math.max(1, u));
      ctx.fillRect(screenX, screenY + 5*u, screenW, Math.max(1, u * 0.5));
      ctx.globalAlpha = 1;
    }
    // Diagonal crack
    ctx.strokeStyle = 'rgba(180,180,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX + screenW * 0.2, screenY + screenH * 0.3);
    ctx.lineTo(screenX + screenW * 0.5, screenY + screenH * 0.6);
    ctx.lineTo(screenX + screenW * 0.4, screenY + screenH * 0.85);
    ctx.stroke();
    // Marquee dimmer
    ctx.fillStyle = '#15101e';
    ctx.fillRect(x + 3*u, y + Math.floor(ts * 0.55), ts - 6*u, Math.floor(ts * 0.15));
    // Feet
    ctx.fillStyle = '#15101e';
    ctx.fillRect(x + 3*u, y + ts - 3*u, 2*u, 3*u);
    ctx.fillRect(x + ts - 5*u, y + ts - 3*u, 2*u, 3*u);
  }

  function drawSidewalk(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Base
    ctx.fillStyle = '#3a3650';
    ctx.fillRect(x, y, ts, ts);
    // Concrete pavers — 2x2 division with subtle tone variation per (col,row)
    var lighten = (col + row) % 2 === 0 ? '#403c5a' : '#363248';
    ctx.fillStyle = lighten;
    ctx.fillRect(x, y, ts/2, ts/2);
    ctx.fillRect(x + ts/2, y + ts/2, ts/2, ts/2);
    // Joint lines (scale-aware)
    ctx.fillStyle = '#28253a';
    ctx.fillRect(x, y + ts/2 - Math.max(1, u*0.5), ts, Math.max(1, u));
    ctx.fillRect(x + ts/2 - Math.max(1, u*0.5), y, Math.max(1, u), ts);
    // Occasional grit speckle
    var seed = col * 31 + row * 17;
    if (seed % 4 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + (seed % 11) * u * 0.8 + u, y + ((seed * 3) % 11) * u * 0.8 + u, Math.max(1, u*0.5), Math.max(1, u*0.5));
    }
  }

  function drawLampPost(ctx, x, y, ts, time, col, row) {
    drawSidewalk(ctx, x, y, ts);
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Pole
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 11*u);
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 7*u, y + 3*u, u, 11*u);
    // Hood
    ctx.fillStyle = '#2a2418';
    ctx.fillRect(x + 4*u, y + u, 8*u, 3*u);
    ctx.fillStyle = '#4a3820';
    ctx.fillRect(x + 5*u, y + u, 6*u, 2*u);
    // Bulb pulse
    var phase = time / 700 + col * 2.3 + row * 1.7;
    var pulse = 0.85 + Math.sin(phase) * 0.15;
    // Slight flicker (rare)
    if ((Math.floor(time / 70) + col * 11) % 113 === 0) pulse *= 0.5;
    // Inner bulb
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe070';
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, 2*u);
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
    // Soft halo around the bulb area
    var grad = ctx.createRadialGradient(
      x + 8*u, y + 3*u, 0,
      x + 8*u, y + 3*u, 6*u
    );
    grad.addColorStop(0, 'rgba(255,224,128,' + (0.35 * pulse).toFixed(2) + ')');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 2*u, y - 2*u, ts + 4*u, ts/2 + 2*u);
    ctx.globalAlpha = 1;
    // Base
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, 2*u);
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, u);
  }

  // 3x5 mini-pixel font for sign letters. Bits encoded MSB-left in 3-wide rows.
  var MINI_FONT = {
    A: [0b010,0b101,0b111,0b101,0b101],
    R: [0b110,0b101,0b110,0b101,0b101],
    C: [0b011,0b100,0b100,0b100,0b011],
    D: [0b110,0b101,0b101,0b101,0b110],
    I: [0b111,0b010,0b010,0b010,0b111],
    P: [0b110,0b101,0b110,0b100,0b100],
    L: [0b100,0b100,0b100,0b100,0b111],
    Y: [0b101,0b101,0b010,0b010,0b010],
    ' ': [0,0,0,0,0]
  };

  function drawMiniText(ctx, text, x, y, px, color) {
    ctx.fillStyle = color;
    var cx = x;
    for (var ci = 0; ci < text.length; ci++) {
      var ch = text[ci];
      var glyph = MINI_FONT[ch];
      if (!glyph) { cx += 4*px; continue; }
      for (var ry = 0; ry < 5; ry++) {
        var bits = glyph[ry];
        for (var rx = 0; rx < 3; rx++) {
          if (bits & (1 << (2 - rx))) {
            ctx.fillRect(cx + rx*px, y + ry*px, px, px);
          }
        }
      }
      cx += 4*px;
    }
  }

  function drawEntranceSign(ctx, x, y, ts, time, col) {
    time = time || 0; col = col || 0;
    var u = ts / 16;
    // Marquee: shows ARCADIA scrolling across the 4 sign tiles (cols 13..16).
    // Smooth crossfade between letters instead of a hard switch every 600ms.
    var word = 'ARCADIA';
    var period = 1000;
    var phase = time / period;
    var scroll = Math.floor(phase);
    var fadeT = phase - scroll;            // 0..1 transition position
    var letterIdx = ((col - 13) + scroll) % word.length;
    if (letterIdx < 0) letterIdx += word.length;
    var nextIdx = (letterIdx + 1) % word.length;
    var letter = word[letterIdx];
    var nextLetter = word[nextIdx];
    // Fade-out the current letter for the last 25% of the period, fade in the next.
    var oldAlpha = fadeT < 0.75 ? 1 : (1 - (fadeT - 0.75) / 0.25);
    var newAlpha = fadeT < 0.75 ? 0 : ((fadeT - 0.75) / 0.25);
    // Background
    ctx.fillStyle = '#0e0c1a';
    ctx.fillRect(x, y, ts, ts);
    // Sign frame
    ctx.fillStyle = '#1a0a20';
    ctx.fillRect(x + u, y + 3*u, ts - 2*u, 10*u);
    // Bracket fixtures (poles)
    ctx.fillStyle = '#3a2a30';
    ctx.fillRect(x + 2*u, y, u, 4*u);
    ctx.fillRect(x + ts - 3*u, y, u, 4*u);
    // Sign body — pink with flicker
    var flicker = 0.85 + Math.sin(time / 500 + col * 1.7) * 0.15;
    if ((Math.floor(time / 90) + col * 7) % 89 === 0) flicker *= 0.4;
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#f078a8';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 8*u);
    // Letter (centered) — render with crossfade
    var px = Math.max(1, Math.floor(u * 0.9));
    var letterW = 3 * px;
    var letterH = 5 * px;
    var lx = x + Math.floor((ts - letterW) / 2);
    var ly = y + 4*u + Math.floor((8*u - letterH) / 2);
    if (oldAlpha > 0) {
      ctx.globalAlpha = oldAlpha * flicker;
      drawMiniText(ctx, letter, lx, ly, px, '#1a0a20');
    }
    if (newAlpha > 0) {
      ctx.globalAlpha = newAlpha * flicker;
      drawMiniText(ctx, nextLetter, lx, ly, px, '#1a0a20');
    }
    ctx.globalAlpha = 1;
    // Light bulb dots along bottom
    for (var d = 0; d < 3; d++) {
      var dotX = x + (3 + d * 5)*u;
      var dotPulse = 0.6 + Math.sin(time / 250 + col + d) * 0.4;
      ctx.globalAlpha = dotPulse;
      ctx.fillStyle = '#ffe0a0';
      ctx.fillRect(dotX, y + 13*u, u, u);
    }
    ctx.globalAlpha = 1;
  }

  function drawBench(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Wooden slats
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(x + u, y + 6*u, ts - 2*u, 4*u);
    ctx.fillStyle = '#5a4830';
    ctx.fillRect(x + u, y + 6*u, ts - 2*u, Math.max(1, u));
    // Slat gaps (highlighted slat lines)
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(x + u, y + 8*u, ts - 2*u, Math.max(1, u * 0.5));
    // Wood grain
    ctx.fillStyle = 'rgba(40,20,10,0.4)';
    ctx.fillRect(x + 4*u, y + 7*u, 3*u, Math.max(1, u * 0.4));
    ctx.fillRect(x + 9*u, y + 7*u, 4*u, Math.max(1, u * 0.4));
    // Iron legs
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(x + 2*u, y + 10*u, 2*u, 5*u);
    ctx.fillRect(x + ts - 4*u, y + 10*u, 2*u, 5*u);
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(x + 2*u, y + 10*u, u, 5*u);
    ctx.fillRect(x + ts - 4*u, y + 10*u, u, 5*u);
    // Floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + u, y + 14*u, ts - 2*u, u);
  }

  function drawTable(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Top
    ctx.fillStyle = '#403648';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, 4*u);
    // Edge highlight
    ctx.fillStyle = '#5a4e62';
    ctx.fillRect(x + 2*u, y + 4*u, ts - 4*u, Math.max(1, u));
    // Side / shadow
    ctx.fillStyle = '#2a2235';
    ctx.fillRect(x + 2*u, y + 7*u, ts - 4*u, 2*u);
    // Legs
    ctx.fillStyle = '#1a1622';
    ctx.fillRect(x + 3*u, y + 9*u, u, 5*u);
    ctx.fillRect(x + ts - 4*u, y + 9*u, u, 5*u);
    // Sci-fi token on the table — varies per table
    var item = (col * 7 + row * 11) % 3;
    if (item === 0) {
      // Coffee cup
      ctx.fillStyle = '#7a4a30';
      ctx.fillRect(x + 6*u, y + 3*u, 3*u, 2*u);
      ctx.fillStyle = '#3a1c10';
      ctx.fillRect(x + 7*u, y + 3*u, u, u);
    } else if (item === 1) {
      // Token
      ctx.fillStyle = '#c8a840';
      ctx.fillRect(x + 7*u, y + 4*u, 2*u, u);
      ctx.fillStyle = '#e8c870';
      ctx.fillRect(x + 7*u, y + 4*u, u, u);
    } else {
      // Empty card
      ctx.fillStyle = '#5cc8d0';
      ctx.fillRect(x + 7*u, y + 4*u, 3*u, u);
    }
  }

  function drawVendingMachine(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Body
    ctx.fillStyle = '#1e2838';
    ctx.fillRect(x + u, y + u, ts - 2*u, ts - 2*u);
    // Outline
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + u, y + u, ts - 2*u, u);
    ctx.fillRect(x + u, y + ts - 2*u, ts - 2*u, u);
    ctx.fillRect(x + u, y + u, u, ts - 2*u);
    ctx.fillRect(x + ts - 2*u, y + u, u, ts - 2*u);
    // Display window
    var phase = (time / 1200) + col * 11;
    var glow = 0.8 + Math.sin(phase) * 0.2;
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#3868a0';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, Math.floor(ts * 0.4));
    ctx.globalAlpha = 1;
    // Display reflections
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 2*u, y + 2*u, ts - 4*u, u);
    // Buttons (3x2 grid)
    var buttonColors = ['#d06060', '#60b060', '#c8a840', '#5cc8d0', '#d06090', '#a060d0'];
    var hoverIdx = Math.floor(time / 400 + col * 3) % 6;
    for (var b = 0; b < 6; b++) {
      var bx = x + (3 + (b % 3) * 3)*u;
      var by = y + (3 + Math.floor(b / 3) * 3)*u;
      ctx.fillStyle = buttonColors[b];
      if (b === hoverIdx) {
        // "Selected" pulse — brighter
        ctx.globalAlpha = 0.7 + Math.sin(time / 150) * 0.3;
        ctx.fillRect(bx - u*0.5, by - u*0.5, 3*u, 3*u);
        ctx.globalAlpha = 1;
      }
      ctx.fillRect(bx, by, 2*u, 2*u);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(bx, by, 2*u, Math.max(1, u * 0.4));
    }
    // Coin slot
    ctx.fillStyle = '#888';
    ctx.fillRect(x + ts - 4*u, y + Math.floor(ts * 0.5), 2*u, 3*u);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + ts - 4*u + u*0.4, y + Math.floor(ts * 0.5) + u*0.5, u*1.2, u*0.5);
    // Dispense tray
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 3*u, y + ts - 4*u, ts - 6*u, 2*u);
    ctx.fillStyle = '#1a1a26';
    ctx.fillRect(x + 4*u, y + ts - 3*u, ts - 8*u, u);
  }

  var NPC_PALETTES = [
    { suit: '#c8a840', light: '#e8c870', dark: '#806820', skin: '#e0c0a0' },
    { suit: '#5cc8d0', light: '#90e0e8', dark: '#388890', skin: '#c0a080' },
    { suit: '#d06060', light: '#f08888', dark: '#883838', skin: '#e8d0b0' },
    { suit: '#7060d0', light: '#9080f0', dark: '#403880', skin: '#d0a880' },
    { suit: '#60a060', light: '#90c890', dark: '#386838', skin: '#e0c0a0' }
  ];
  var NPC_HATS = [null, 'cap', 'antenna', 'horns', 'cap'];

  function drawNpc(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts);
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = col * 13 + row * 29;
    var pal = NPC_PALETTES[seed % NPC_PALETTES.length];
    var hat = NPC_HATS[seed % NPC_HATS.length];
    var heightBoost = (seed % 3 === 0) ? -u : 0;
    var bob = Math.sin(time / 600 + col * 7) > 0.85 ? -u : 0;
    bob += heightBoost;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + ts*0.5, y + ts - u, ts*0.32, ts*0.1, 0, 0, Math.PI*2);
    ctx.fill();
    // Head
    ctx.fillStyle = pal.skin;
    ctx.fillRect(x + 4*u, y + (u)+bob, 8*u, 5*u);
    // Hair / hat
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x + 4*u, y + (u)+bob, 8*u, u);
    if (hat === 'cap') {
      ctx.fillStyle = pal.suit;
      ctx.fillRect(x + 3*u, y + (u)+bob, 9*u, 2*u);
      ctx.fillStyle = pal.light;
      ctx.fillRect(x + 5*u, y + (2*u)+bob, 4*u, u);
    } else if (hat === 'antenna') {
      ctx.fillStyle = '#444';
      ctx.fillRect(x + 7*u, y + bob, u, 2*u);
      var antPulse = 0.6 + Math.sin(time / 400 + col) * 0.4;
      ctx.globalAlpha = antPulse;
      ctx.fillStyle = pal.light;
      ctx.fillRect(x + 6*u, y + bob, 3*u, u);
      ctx.globalAlpha = 1;
    } else if (hat === 'horns') {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 3*u, y + bob, u, 2*u);
      ctx.fillRect(x + 12*u, y + bob, u, 2*u);
    }
    // Eyes — blink occasionally
    var blinkPhase = ((time + col * 1500 + row * 700) / 100) % 60;
    var blinking = blinkPhase < 3;
    if (!blinking) {
      ctx.fillStyle = '#0a0a16';
      ctx.fillRect(x + 5*u, y + (3*u)+bob, 2*u, 2*u);
      ctx.fillRect(x + 9*u, y + (3*u)+bob, 2*u, 2*u);
    } else {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 5*u, y + (4*u)+bob, 2*u, u);
      ctx.fillRect(x + 9*u, y + (4*u)+bob, 2*u, u);
    }
    // Body / suit
    ctx.fillStyle = pal.suit;
    ctx.fillRect(x + 3*u, y + (6*u)+bob, 10*u, 5*u);
    ctx.fillStyle = pal.light;
    ctx.fillRect(x + 3*u, y + (6*u)+bob, 10*u, u);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x + 3*u, y + (10*u)+bob, 10*u, u);
    // Legs
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x + 4*u, y + (11*u)+bob, 3*u, 4*u);
    ctx.fillRect(x + 9*u, y + (11*u)+bob, 3*u, 4*u);
    // Feet
    ctx.fillStyle = '#0a0a16';
    ctx.fillRect(x + 3*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 9*u, y + 14*u, 4*u, u);
  }

  // ---- Register with engine ----

  BridgeWorld.registerTileset('arcadia', {
    1: drawWall,
    2: drawFloor,
    3: drawFloorLight,
    4: drawWallDark,
    5: drawRunoutsCabinet,
    6: drawHighScoreBoard,
    7: drawEntrance,
    8: drawNeonSign,
    9: drawCabinet,
    10: drawFloorDark,
    11: drawFloorWorn,
    12: drawPoster,
    13: drawBrokenCabinet,
    14: drawSidewalk,
    15: drawLampPost,
    16: drawEntranceSign,
    17: drawBench,
    18: drawTable,
    19: drawVendingMachine,
    20: drawNpc,
    21: drawArcadeDoor
  });

})();
