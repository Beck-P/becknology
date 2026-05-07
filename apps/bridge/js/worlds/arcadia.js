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

  // Arcade floor — strict pixel art. 8u checker with 1u dark grout cross
  // and deterministic 1u debris.
  function drawFloor(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var BASE = '#2a2240';
    var TILE = '#332858';
    var GROUT = '#15102a';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = TILE;
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // 1u grout cross (whole-u)
    ctx.fillStyle = GROUT;
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
    // 1u debris/sparkle
    var seed = (col * 41 + row * 17) % 19;
    if (seed === 0) {
      ctx.fillStyle = '#a08060';
      ctx.fillRect(x + 4*u, y + 11*u, u, u);
    } else if (seed === 5) {
      ctx.fillStyle = '#7050a0';
      ctx.fillRect(x + 11*u, y + 4*u, u, u);
    } else if (seed === 11) {
      ctx.fillStyle = '#403858';
      ctx.fillRect(x + 6*u, y + 13*u, u, u);
    }
  }

  // Lit version — same pattern, brighter base.
  function drawFloorLight(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var BASE = '#3a3260';
    var TILE = '#463a78';
    var GROUT = '#251c40';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    ctx.fillStyle = TILE;
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    ctx.fillStyle = GROUT;
    ctx.fillRect(x + 8*u - u, y, u, ts);
    ctx.fillRect(x, y + 8*u - u, ts, u);
  }

  // Cyberpunk wall — strict pixel art. 4u dark cap + 12u brick body with
  // 1u mortar lines and alternating courses. Whole-u rects only.
  function drawWall(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var CAP_DK = '#15102a';
    var CAP = '#1e1835';
    var CAP_HI = '#3a3252';
    var BRICK = '#2a2245';
    var MORTAR = '#15102a';
    // 4u cap
    ctx.fillStyle = CAP;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x, y, ts, u);            // 1u top highlight
    // 12u brick body
    ctx.fillStyle = BRICK;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    // 1u mortar courses
    ctx.fillStyle = MORTAR;
    ctx.fillRect(x, y + 8*u, ts, u);
    ctx.fillRect(x, y + 12*u, ts, u);
    // Vertical brick joints (alternating per row)
    var off1 = (row % 2 === 0) ? 8 : 4;
    var off2 = (row % 2 === 0) ? 4 : 12;
    var off3 = (row % 2 === 0) ? 12 : 8;
    ctx.fillRect(x + off1*u, y + 5*u, u, 3*u);
    ctx.fillRect(x + off2*u, y + 9*u, u, 3*u);
    ctx.fillRect(x + off3*u, y + 13*u, u, 3*u);
    // Wear speckles (1u)
    var seed = (col * 23 + row * 11) % 7;
    if (seed === 0) {
      ctx.fillStyle = '#1e1a35';
      ctx.fillRect(x + 3*u, y + 6*u, u, u);
    } else if (seed === 3) {
      ctx.fillStyle = '#1e1a35';
      ctx.fillRect(x + 11*u, y + 10*u, u, u);
    }
  }

  // Dark wall variant — strict pixel art. Same structure as drawWall but
  // deeper palette.
  function drawWallDark(ctx, x, y, ts, time, col, row) {
    col = col || 0; row = row || 0;
    var u = ts / 16;
    var CAP_DK = '#0e0820';
    var CAP = '#151230';
    var CAP_HI = '#251c40';
    var BRICK = '#201a3a';
    var MORTAR = '#0e0820';
    ctx.fillStyle = CAP;
    ctx.fillRect(x, y, ts, 4*u);
    ctx.fillStyle = CAP_HI;
    ctx.fillRect(x, y, ts, u);
    ctx.fillStyle = BRICK;
    ctx.fillRect(x, y + 4*u, ts, 12*u);
    ctx.fillStyle = MORTAR;
    ctx.fillRect(x, y + 8*u, ts, u);
    ctx.fillRect(x, y + 12*u, ts, u);
    var off1 = (row % 2 === 0) ? 8 : 4;
    var off2 = (row % 2 === 0) ? 4 : 12;
    var off3 = (row % 2 === 0) ? 12 : 8;
    ctx.fillRect(x + off1*u, y + 5*u, u, 3*u);
    ctx.fillRect(x + off2*u, y + 9*u, u, 3*u);
    ctx.fillRect(x + off3*u, y + 13*u, u, 3*u);
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

  // Neon-themed arcade door — dark metallic frame with hot-pink neon outline,
  // smoked-glass panels, and pink-purple light leaking out. Matches the
  // arcadia world's neon palette so it doesn't read as a wood cottage.
  function drawArcadeDoor(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    // Wall-dark base (matches surrounding wall_dark tiles)
    ctx.fillStyle = '#1a1530';
    ctx.fillRect(x, y, ts, ts);
    // Cap highlight (continuity with wall_dark)
    ctx.fillStyle = '#251c40';
    ctx.fillRect(x, y, ts, Math.max(1, u * 0.5));
    // Dark metallic door frame (almost black)
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.max(1, u * 0.6), y + Math.max(1, u * 0.6), ts - Math.max(1, u * 1.2), ts - Math.max(1, u * 1.2));
    // Inner door area — smoked glass with vertical pink-purple gradient
    var dx = x + Math.max(1, u * 1.5);
    var dy = y + Math.max(1, u * 1.5);
    var dw = ts - Math.max(1, u * 3);
    var dh = ts - Math.max(1, u * 3);
    var glassGrad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
    glassGrad.addColorStop(0, '#1a0a20');
    glassGrad.addColorStop(0.5, '#3a1840');
    glassGrad.addColorStop(1, '#1a0a20');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(dx, dy, dw, dh);
    // Vertical center line — gap between sliding glass doors
    ctx.fillStyle = '#0a0418';
    ctx.fillRect(dx + Math.floor(dw * 0.5) - Math.max(1, u * 0.3), dy, Math.max(1, u * 0.6), dh);
    // Horizontal middle bar (frame divider)
    ctx.fillStyle = '#080418';
    ctx.fillRect(dx, dy + Math.floor(dh * 0.55), dw, Math.max(1, u * 0.5));
    // Pulsing pink neon outline around the door
    var pulse = 0.65 + Math.sin(time / 350 + col + row) * 0.35;
    if ((Math.floor(time / 80) + col * 7) % 113 === 0) pulse *= 0.45; // rare flicker
    var neonAlpha = Math.max(0.3, Math.min(1, pulse));
    ctx.strokeStyle = 'rgba(232, 80, 168, ' + neonAlpha.toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, u * 0.5);
    ctx.strokeRect(dx, dy, dw, dh);
    // Inner brighter outline (the neon tube core)
    ctx.strokeStyle = 'rgba(255, 180, 220, ' + (neonAlpha * 0.7).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, u * 0.25);
    ctx.strokeRect(dx + Math.max(1, u * 0.4), dy + Math.max(1, u * 0.4), dw - Math.max(1, u * 0.8), dh - Math.max(1, u * 0.8));
    // Touch/scan panel (right side, instead of a knob)
    var panelX = dx + dw + Math.max(1, u * 0.4);
    if (panelX + Math.max(1, u * 1.4) < x + ts) {
      ctx.fillStyle = '#202036';
      ctx.fillRect(panelX, dy + Math.floor(dh * 0.4), Math.max(1, u * 1.4), Math.max(1, u * 2.4));
      // Glowing scan slit
      ctx.fillStyle = 'rgba(255,80,180,' + neonAlpha.toFixed(2) + ')';
      ctx.fillRect(panelX + Math.max(1, u * 0.3), dy + Math.floor(dh * 0.5), Math.max(1, u * 0.8), Math.max(1, u * 0.4));
    }
    // Big neon halo bleeding out of the doorway — pink/violet
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = neonAlpha * 0.55;
    var halo = ctx.createRadialGradient(x + ts/2, y + ts/2, 0, x + ts/2, y + ts/2, ts * 1.2);
    halo.addColorStop(0, 'rgba(232, 80, 200, 0.7)');
    halo.addColorStop(0.5, 'rgba(160, 60, 200, 0.25)');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x - ts * 0.5, y - ts * 0.5, ts * 2, ts * 2);
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

  // Cyberpunk sidewalk — strict pixel art. 8u × 8u pavers with 1u grout
  // cross + deterministic 1u grit specks.
  function drawSidewalk(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var BASE = '#3a3650';
    var TILE_LT = '#403c5a';
    var TILE_DK = '#363248';
    var GROUT = '#28253a';
    ctx.fillStyle = BASE;
    ctx.fillRect(x, y, ts, ts);
    // 2x2 paver pattern (alternating per col+row)
    var lighten = (col + row) % 2 === 0 ? TILE_LT : TILE_DK;
    ctx.fillStyle = lighten;
    ctx.fillRect(x, y, 8*u, 8*u);
    ctx.fillRect(x + 8*u, y + 8*u, 8*u, 8*u);
    // 1u grout cross
    ctx.fillStyle = GROUT;
    ctx.fillRect(x, y + 8*u - u, ts, u);
    ctx.fillRect(x + 8*u - u, y, u, ts);
    // 1u grit speckles
    var seed = (col * 31 + row * 17) % 11;
    if (seed === 0) {
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(x + 3*u, y + 5*u, u, u);
    } else if (seed === 4) {
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(x + 11*u, y + 11*u, u, u);
    } else if (seed === 7) {
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(x + 12*u, y + 3*u, u, u);
    }
  }

  // Cyberpunk lamp post — strict pixel art. 2u-wide pole, 8u × 3u hood,
  // 4u × 2u bulb with hard 1u top highlight, atmospheric warm halo.
  function drawLampPost(ctx, x, y, ts, time, col, row) {
    drawSidewalk(ctx, x, y, ts);
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var POLE_DK = '#1a1a1a';
    var POLE = '#3a3a3a';
    var POLE_HI = '#555555';
    var HOOD_DK = '#1a1408';
    var HOOD = '#2a2418';
    var HOOD_HI = '#4a3820';
    // Pole (2u × 11u, 1u left highlight)
    ctx.fillStyle = POLE_DK;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, 11*u);
    ctx.fillStyle = POLE;
    ctx.fillRect(x + 7*u, y + 3*u, u, 11*u);
    ctx.fillStyle = POLE_HI;
    ctx.fillRect(x + 7*u, y + 3*u, u, u);
    // Hood (8u × 3u outline)
    ctx.fillStyle = HOOD_DK;
    ctx.fillRect(x + 4*u, y + u, 8*u, 3*u);
    ctx.fillStyle = HOOD;
    ctx.fillRect(x + 5*u, y + u, 6*u, 2*u);
    ctx.fillStyle = HOOD_HI;
    ctx.fillRect(x + 5*u, y + u, 6*u, u);
    // Bulb pulse
    var phase = time / 700 + col * 2.3 + row * 1.7;
    var pulse = 0.85 + Math.sin(phase) * 0.15;
    if ((Math.floor(time / 70) + col * 11) % 113 === 0) pulse *= 0.5;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe070';
    ctx.fillRect(x + 6*u, y + 2*u, 4*u, 2*u);
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(x + 7*u, y + 2*u, 2*u, u);
    ctx.globalAlpha = 1;
    // Halo (atmospheric gradient — allowed by spec)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = pulse * 0.35;
    var grad = ctx.createRadialGradient(x + 8*u, y + 3*u, 0, x + 8*u, y + 3*u, 6*u);
    grad.addColorStop(0, 'rgba(255,224,128,0.7)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 2*u, y - 2*u, ts + 4*u, ts/2 + 2*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Base (4u × 2u)
    ctx.fillStyle = POLE_DK;
    ctx.fillRect(x + 6*u, y + 14*u, 4*u, 2*u);
    ctx.fillStyle = POLE_HI;
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

  // Bench — strict pixel art. 14u × 4u wooden slat, 2u-wide iron legs,
  // 1u top highlight. Whole-u rects only.
  function drawBench(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#1a0e08';
    var WOOD = '#3a2818';
    var WOOD_HI = '#5a4830';
    var IRON_DK = '#0e0e15';
    var IRON = '#1a1a22';
    var IRON_HI = '#2a2a35';
    // Slat outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 6*u, 14*u, 5*u);
    ctx.fillStyle = WOOD;
    ctx.fillRect(x + u, y + 6*u, 14*u, 4*u);
    ctx.fillStyle = WOOD_HI;
    ctx.fillRect(x + u, y + 6*u, 14*u, u);
    // Plank seam (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, y + 8*u, 14*u, u);
    // Iron legs (2u × 5u)
    ctx.fillStyle = IRON_DK;
    ctx.fillRect(x + 2*u, y + 10*u, 2*u, 5*u);
    ctx.fillRect(x + 12*u, y + 10*u, 2*u, 5*u);
    ctx.fillStyle = IRON;
    ctx.fillRect(x + 2*u, y + 10*u, 2*u, 4*u);
    ctx.fillRect(x + 12*u, y + 10*u, 2*u, 4*u);
    ctx.fillStyle = IRON_HI;
    ctx.fillRect(x + 2*u, y + 10*u, u, 4*u);
    ctx.fillRect(x + 12*u, y + 10*u, u, 4*u);
    // Floor shadow (1u)
    ctx.fillStyle = '#0a080e';
    ctx.fillRect(x + u, y + 14*u, 14*u, u);
  }

  // Table — strict pixel art. 12u × 4u top, 1u legs, 1u top highlight.
  function drawTable(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0e0a18';
    var TOP = '#403648';
    var TOP_HI = '#5a4e62';
    var SIDE = '#2a2235';
    var LEG = '#1a1622';
    // Top outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 5*u);
    ctx.fillStyle = TOP;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 4*u);
    ctx.fillStyle = TOP_HI;
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, u);
    // Side band (1u shadow)
    ctx.fillStyle = SIDE;
    ctx.fillRect(x + 2*u, y + 8*u, 12*u, u);
    // Legs (1u × 6u)
    ctx.fillStyle = LEG;
    ctx.fillRect(x + 3*u, y + 9*u, u, 5*u);
    ctx.fillRect(x + 12*u, y + 9*u, u, 5*u);
    // Item on top
    var item = (col * 7 + row * 11) % 3;
    if (item === 0) {
      // Coffee cup (3u × 2u with handle)
      ctx.fillStyle = '#3a1c10';
      ctx.fillRect(x + 6*u, y + 2*u, 3*u, 2*u);
      ctx.fillStyle = '#7a4a30';
      ctx.fillRect(x + 6*u, y + 2*u, 3*u, u);
    } else if (item === 1) {
      // Gold token (1u)
      ctx.fillStyle = '#806820';
      ctx.fillRect(x + 7*u, y + 3*u, 2*u, 2*u);
      ctx.fillStyle = '#e8c870';
      ctx.fillRect(x + 7*u, y + 3*u, u, u);
    } else {
      // Card (3u × 1u)
      ctx.fillStyle = '#388890';
      ctx.fillRect(x + 7*u, y + 3*u, 3*u, 2*u);
      ctx.fillStyle = '#5cc8d0';
      ctx.fillRect(x + 7*u, y + 3*u, 3*u, u);
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

  // Arcadia NPC — strict pixel art. 8u-wide character with 1u outline,
  // 3-tone shading, varied hat per seed.
  function drawNpc(ctx, x, y, ts, time, col, row) {
    drawFloor(ctx, x, y, ts);
    time = time || 0; col = col || 0; row = row || 0;
    var u = ts / 16;
    var seed = col * 13 + row * 29;
    var pal = NPC_PALETTES[seed % NPC_PALETTES.length];
    var hat = NPC_HATS[seed % NPC_HATS.length];
    var DARK = '#0a0a16';
    var bob = Math.sin(time / 600 + col * 7) > 0.85 ? -u : 0;
    // Shadow (1u)
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(x + 4*u, y + 14*u, 8*u, u);
    // Head outline (6u × 5u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 5*u);
    // Skin
    ctx.fillStyle = pal.skin;
    ctx.fillRect(x + 5*u, y + u + bob, 6*u, 5*u);
    // Hair / hat
    if (hat === 'cap') {
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 4*u, y + u + bob, 8*u, 2*u);
      ctx.fillStyle = pal.suit;
      ctx.fillRect(x + 4*u, y + u + bob, 8*u, u);
      ctx.fillStyle = pal.light;
      ctx.fillRect(x + 5*u, y + 2*u + bob, 4*u, u);
    } else if (hat === 'antenna') {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 5*u, y + u + bob, 6*u, u);
      ctx.fillStyle = DARK;
      ctx.fillRect(x + 7*u, y + bob, u, 2*u);
      var antPulse = 0.6 + Math.sin(time / 400 + col) * 0.4;
      ctx.globalAlpha = antPulse;
      ctx.fillStyle = pal.light;
      ctx.fillRect(x + 7*u, y + bob, u, u);
      ctx.globalAlpha = 1;
    } else if (hat === 'horns') {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 5*u, y + u + bob, 6*u, u);
      ctx.fillRect(x + 4*u, y + bob, u, 2*u);
      ctx.fillRect(x + 11*u, y + bob, u, 2*u);
    } else {
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x + 5*u, y + u + bob, 6*u, u);
    }
    // Eyes (1u, blink occasionally)
    var blinkPhase = ((time + col * 1500 + row * 700) / 100) % 60;
    var blinking = blinkPhase < 3;
    ctx.fillStyle = DARK;
    if (!blinking) {
      ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
      ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    } else {
      ctx.fillRect(x + 6*u, y + 4*u + bob, u, u);
      ctx.fillRect(x + 9*u, y + 4*u + bob, u, u);
    }
    // Body outline (8u × 6u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 6*u);
    // Suit
    ctx.fillStyle = pal.suit;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, 5*u);
    ctx.fillStyle = pal.light;
    ctx.fillRect(x + 4*u, y + 6*u + bob, 8*u, u);   // 1u shoulder highlight
    ctx.fillStyle = pal.dark;
    ctx.fillRect(x + 4*u, y + 10*u + bob, 8*u, u);  // belt
    // Legs (2u × 4u each)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 5*u, y + 11*u + bob, 2*u, 4*u);
    ctx.fillRect(x + 9*u, y + 11*u + bob, 2*u, 4*u);
    // Feet (1u row)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 14*u, 4*u, u);
    ctx.fillRect(x + 8*u, y + 14*u, 4*u, u);
  }

  // ---- Register with engine ----

  // ---- Street features (Stardew-style neon city) ----

  // Hover bike — strict pixel art. 12u × 4u fairing with 8u canopy, 2u
  // engine pods. Whole-u rects only. Hover glow stays as gradient.
  function drawHoverBike(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#080418';
    var BODY_DK = '#1a1a26';
    var BODY = '#3a3a48';
    var BODY_HI = '#5a5a68';
    var CANOPY = '#388890';
    var CANOPY_HI = '#80e0e8';
    var ACCENT = '#a040c0';
    // Hover glow (atmospheric — gradient allowed)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.55;
    var grad = ctx.createRadialGradient(x + ts/2, y + 13*u, 0, x + ts/2, y + 13*u, 7*u);
    grad.addColorStop(0, 'rgba(232,80,200,0.6)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - u, y + 8*u, ts + 2*u, ts - 6*u);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Bike body — hover offset (whole-u snap)
    var hover = Math.sin(time / 600 + col) > 0.5 ? -u : 0;
    var by = y + 6*u + hover;
    // Main fairing outline
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, by + 2*u, 12*u, 5*u);
    ctx.fillStyle = BODY_DK;
    ctx.fillRect(x + 2*u, by + 2*u, 12*u, 4*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 2*u, by + 3*u, 12*u, 2*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 2*u, by + 2*u, 12*u, u);   // 1u top highlight
    // Cockpit canopy (8u × 2u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, by, 8*u, 2*u);
    ctx.fillStyle = CANOPY;
    ctx.fillRect(x + 4*u, by, 8*u, 2*u);
    ctx.fillStyle = CANOPY_HI;
    ctx.fillRect(x + 4*u, by, 8*u, u);
    // Engine pods (2u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + u, by + 3*u, 2*u, 3*u);
    ctx.fillRect(x + 13*u, by + 3*u, 2*u, 3*u);
    // Engine glow (1u × 1u)
    var eGlow = 0.8 + Math.sin(time / 150) * 0.2;
    ctx.globalAlpha = eGlow;
    ctx.fillStyle = '#ff80c0';
    ctx.fillRect(x + u, by + 4*u, 2*u, u);
    ctx.fillRect(x + 13*u, by + 4*u, 2*u, u);
    ctx.globalAlpha = 1;
    // Accent stripe (1u purple)
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x + 3*u, by + 5*u, 10*u, u);
  }

  function drawHoloBillboard(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawWallDark(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Billboard frame
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.max(1, u * 0.5), y + Math.max(1, u * 0.5), ts - u, ts * 0.55);
    // Holo screen background
    var bx = x + Math.max(1, u);
    var by = y + Math.max(1, u);
    var bw = ts - 2*u;
    var bh = Math.floor(ts * 0.5);
    // Color cycles between pink/purple/cyan over time
    var phase = (time / 2000) % 3;
    var bg;
    if (phase < 1) bg = '#3a1840';
    else if (phase < 2) bg = '#181a40';
    else bg = '#1a3040';
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by, bw, bh);
    // Animated content — scrolling bands of color
    var scroll = (time / 80) % bh;
    ctx.fillStyle = phase < 1 ? '#e870c0' : (phase < 2 ? '#7080e8' : '#70e0e8');
    ctx.globalAlpha = 0.7;
    ctx.fillRect(bx, by + scroll, bw, Math.max(1, u * 0.6));
    ctx.fillRect(bx, by + (scroll + bh * 0.4) % bh, bw, Math.max(1, u * 0.4));
    ctx.globalAlpha = 1;
    // Text-like bars on the screen
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(bx + 2*u, by + 2*u, bw - 4*u, Math.max(1, u * 0.5));
    ctx.fillRect(bx + 2*u, by + 4*u, bw - 5*u, Math.max(1, u * 0.5));
    ctx.fillRect(bx + 3*u, by + 6*u, bw - 6*u, Math.max(1, u * 0.5));
    // Scanline
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    var scanY = ((time / 25 + col * 30) % bh);
    ctx.fillRect(bx, by + scanY, bw, Math.max(1, u * 0.5));
    // Mounting brackets
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.55), Math.max(1, u * 0.6), 3*u);
    ctx.fillRect(x + ts - 3*u, y + Math.floor(ts * 0.55), Math.max(1, u * 0.6), 3*u);
    // Subtle light cast on wall below
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.25;
    var glowColor = phase < 1 ? '160, 60, 200' : (phase < 2 ? '60, 80, 200' : '60, 180, 200');
    ctx.fillStyle = 'rgba(' + glowColor + ', 0.5)';
    ctx.fillRect(x, y + ts * 0.6, ts, ts * 0.4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // Food cart — strict pixel art. 12u × 7u body with 12u × 3u striped
  // awning, 3u stepped wheels, animated 1u steam. Whole-u rects only.
  function drawFoodCart(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#180a18';
    var CART = '#a02050';
    var CART_HI = '#e040a0';
    var CART_SH = '#601838';
    var WHEEL = '#1a1a1e';
    var HUB = '#3a3a3a';
    var STRIPE_A = '#3a1840';
    var STRIPE_B = '#7030a0';
    // Cart body (12u × 7u with outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, 7*u);
    ctx.fillStyle = CART;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, 6*u);
    ctx.fillStyle = CART_HI;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);
    ctx.fillStyle = CART_SH;
    ctx.fillRect(x + 2*u, y + 11*u, 12*u, u);
    // Counter window (8u × 3u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 6*u, 8*u, 3*u);
    // Bowl on counter (3u × 1u)
    ctx.fillStyle = '#a08040';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    ctx.fillStyle = '#e0c060';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, u);
    // Awning (12u × 3u, alternating stripes)
    for (var sIx = 0; sIx < 4; sIx++) {
      ctx.fillStyle = (sIx % 2 === 0) ? STRIPE_A : STRIPE_B;
      ctx.fillRect(x + 2*u + sIx * 3*u, y + 2*u, 3*u, 3*u);
    }
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 2*u, y + 5*u, 12*u, u);     // bottom shadow
    // Wheels — stepped circles (whole-u)
    var wheels = [4, 12];
    for (var wi = 0; wi < 2; wi++) {
      var wx = x + wheels[wi] * u;
      ctx.fillStyle = WHEEL;
      ctx.fillRect(wx - u, y + 12*u, 2*u, u);
      ctx.fillRect(wx - 2*u, y + 13*u, 4*u, 2*u);
      ctx.fillRect(wx - u, y + 15*u, 2*u, u);
      ctx.fillStyle = HUB;
      ctx.fillRect(wx, y + 13*u, u, 2*u);
    }
    // Sign (4u × 1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 6*u, y, 4*u, u);
    ctx.fillStyle = '#ffe080';
    ctx.fillRect(x + 6*u, y, 4*u, u);
    // Steam (1u animated)
    for (var stIx = 0; stIx < 3; stIx++) {
      var stY = y + ((Math.floor(time / 200) + stIx * 6) % 6) * u;
      ctx.globalAlpha = 0.6 - (stIx * 0.15);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(x + 7*u + stIx * u, stY, u, u);
    }
    ctx.globalAlpha = 1;
  }

  // Trash can — strict pixel art. 8u × 8u body with 1u left highlight,
  // 10u × 1u lid. Whole-u rects only.
  function drawTrashCan(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#0a0a0e';
    var BODY = '#3a3a3a';
    var BODY_HI = '#5a5a5a';
    var BODY_SH = '#1a1a1e';
    // Body (8u × 8u, with outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, 9*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 4*u, y + 5*u, 8*u, 8*u);
    ctx.fillStyle = BODY_HI;
    ctx.fillRect(x + 4*u, y + 5*u, u, 8*u);   // 1u left highlight
    ctx.fillStyle = BODY_SH;
    ctx.fillRect(x + 11*u, y + 5*u, u, 8*u);  // 1u right shadow
    // Vertical seams (1u dark)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 5*u, u, 8*u);
    // Lid (10u × 1u with outline)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 2*u);
    ctx.fillStyle = BODY;
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, u);
    // Lid handle (1u)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 3*u, 2*u, u);
    // Recycle logo (3u × 3u stepped)
    ctx.fillStyle = '#40e080';
    ctx.fillRect(x + 7*u, y + 8*u, 2*u, 2*u);
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(x + 7*u, y + 8*u, u, u);
    // Shadow (1u)
    ctx.fillStyle = '#0a080e';
    ctx.fillRect(x + 4*u, y + 14*u, 8*u, u);
  }

  // Crosswalk — strict pixel art. Vertical 2u-wide white stripes.
  function drawCrosswalk(ctx, x, y, ts, time, col, row) {
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(x, y, 2*u, ts);
    ctx.fillRect(x + 4*u, y, 2*u, ts);
    ctx.fillRect(x + 8*u, y, 2*u, ts);
    ctx.fillRect(x + 12*u, y, 2*u, ts);
  }

  function drawShopWindow(ctx, x, y, ts, time, col, row) {
    time = time || 0; col = col || 0; row = row || 0;
    drawWallDark(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    // Window frame
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.max(1, u), y + 2*u, ts - 2*u, ts * 0.55);
    // Window glass — neon-tinted
    var phase = (col + row) % 3;
    var glassColor = phase === 0 ? '#3a1840' : (phase === 1 ? '#1a3040' : '#181a40');
    ctx.fillStyle = glassColor;
    ctx.fillRect(x + 2*u, y + 3*u, ts - 4*u, Math.floor(ts * 0.42));
    // Animated display item inside (silhouette)
    var itemPulse = 0.6 + Math.sin(time / 800 + col) * 0.2;
    ctx.globalAlpha = itemPulse;
    ctx.fillStyle = phase === 0 ? '#e870c0' : (phase === 1 ? '#70e0e8' : '#7080e8');
    if (phase === 0) {
      // Vinyl record
      ctx.beginPath();
      ctx.arc(x + ts/2, y + Math.floor(ts * 0.32), Math.max(1, u * 2.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#080418';
      ctx.beginPath();
      ctx.arc(x + ts/2, y + Math.floor(ts * 0.32), Math.max(1, u * 0.7), 0, Math.PI * 2);
      ctx.fill();
    } else if (phase === 1) {
      // Headphones / cyber gear silhouette
      ctx.fillRect(x + Math.floor(ts * 0.3), y + 4*u, Math.floor(ts * 0.4), 3*u);
      ctx.fillRect(x + Math.floor(ts * 0.25), y + 5*u, Math.max(1, u), 2*u);
      ctx.fillRect(x + Math.floor(ts * 0.7), y + 5*u, Math.max(1, u), 2*u);
    } else {
      // Books stacked
      ctx.fillRect(x + 4*u, y + 5*u, ts - 8*u, Math.max(1, u));
      ctx.fillRect(x + 3*u, y + 6*u, ts - 6*u, Math.max(1, u));
      ctx.fillRect(x + 4*u, y + 7*u, ts - 8*u, Math.max(1, u));
    }
    ctx.globalAlpha = 1;
    // Window mullions
    ctx.fillStyle = '#080418';
    ctx.fillRect(x + Math.floor(ts * 0.5) - Math.max(1, u * 0.3), y + 2*u, Math.max(1, u * 0.6), Math.floor(ts * 0.55));
    ctx.fillRect(x + 2*u, y + Math.floor(ts * 0.32), ts - 4*u, Math.max(1, u * 0.5));
    // Reflection on glass
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + 2*u, y + 3*u, Math.max(1, u * 1.2), Math.floor(ts * 0.42));
  }

  // Traffic cone — strict pixel art. Stepped pyramid silhouette + 1u
  // white stripe + 6u × 1u base. Whole-u rects only.
  function drawTrafficCone(ctx, x, y, ts, time, col, row) {
    drawSidewalk(ctx, x, y, ts, time, col, row);
    var u = ts / 16;
    var DARK = '#3a1810';
    var ORANGE = '#e08030';
    var ORANGE_HI = '#ffa050';
    var WHITE = '#f0f0f0';
    var BASE = '#1a1a1e';
    // Stepped cone (whole-u: 2u, 4u, 6u tall stack)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 8*u);
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 6*u);
    ctx.fillRect(x + 5*u, y + 11*u, 6*u, 2*u);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, 7*u);
    ctx.fillRect(x + 6*u, y + 7*u, 4*u, 5*u);
    ctx.fillRect(x + 5*u, y + 11*u, 6*u, u);
    // 1u top highlight
    ctx.fillStyle = ORANGE_HI;
    ctx.fillRect(x + 7*u, y + 5*u, u, 7*u);
    ctx.fillRect(x + 6*u, y + 7*u, u, 5*u);
    ctx.fillRect(x + 5*u, y + 11*u, u, u);
    // White stripe (1u high band, hard-edged)
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + 6*u, y + 9*u, 4*u, u);
    // Base (8u × 1u)
    ctx.fillStyle = BASE;
    ctx.fillRect(x + 4*u, y + 13*u, 8*u, u);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 4*u, y + 13*u, 8*u, u);
    // Shadow under (1u)
    ctx.fillStyle = '#0a080e';
    ctx.fillRect(x + 4*u, y + 14*u, 8*u, u);
  }

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
    21: drawArcadeDoor,
    22: drawHoverBike,
    23: drawHoloBillboard,
    24: drawFoodCart,
    25: drawTrashCan,
    26: drawCrosswalk,
    27: drawShopWindow,
    28: drawTrafficCone
  });

})();
