/**
 * BridgeRoyale — the Neon Royale's live parts (the casino in Arcadia: tools/bridge-art/scenes/arcadia_casino*.py).
 *
 * The renders leave these to the engine, at the positions the scene scripts wrote into each world JSON's
 * `casino.live` block (screen tiles):
 *   wheels   the roulette wheels: the pocket ring turning, the ball run round the track, slowing, dropping into a
 *            pocket and riding round with it, cleared for the next spin
 *   screens  [x0, y0, x1, y1, kind]: the race-and-sports book (`race`, `sports`, `odds`), the crash screen and its
 *            rail (`crash`, `crashbet` — the same round on both: the rocket climbing, the multiplier, the bang),
 *            Royale Link (`link`), the Card Room's board (`board`), and every Runouts cabinet's attract loop
 *            (`runouts:<mode>`, `runouts:hall`)
 *   chases   the slot machines' light pipes and toppers (playable machines run hotter)
 *   bulbs    marquee bulbs chasing (the stage's apron, the prize car's plinth)
 *   glints   chip stacks catching the light; dice tumbling down the craps tubs
 * Rooms with a `casino.sky` rect (Aurum, the Crown Room) get the live skyline and rain behind their great windows.
 * On the District street the Royale's two searchlights sweep the sky (`royale.beams`) and its tall screens play the
 * house's own ads (js/skyline.js kind 'royale').
 *
 * The Crown Room's rope (`royale_vip`): opens for a pilot whose poker winnings (BridgeCasino.pokerWon(), from
 * js/casino.js) reach BridgeCasino.HIGH_ROLLER; otherwise Bruno says how far short you are. Without BridgeCasino
 * the rope stays shut.
 *
 *   BridgeRoyale.crashAt(now)   the crash round now: { m, crashed, t } (shared by every screen)
 *   BridgeRoyale.vipOpen()      may this pilot go up to the Crown Room?
 */
var BridgeRoyale = (function () {
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  // ---- a 3 x 5 pixel font for numbers on the screens (a scoreboard's digits are art, not UI text) ----------------
  var DIG = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    'x': '000101010101000', '.': '000000000000010', '-': '000000111000000', '+': '000010111010000', '$': '011110010011110'
  };
  function digits(ctx, str, x, y, s, col) {
    var cx = Math.round(x);
    for (var i = 0; i < str.length; i++) {
      var g = DIG[str.charAt(i)];
      if (!g) { cx += 2 * s; continue; }
      var w = str.charAt(i) === '.' ? 1 : 3;
      for (var b = 0; b < 15; b++) {
        if (g.charAt(b) !== '1') continue;
        var col0 = b % 3;
        if (w === 1) col0 = 0;
        if (w === 1 && b % 3 !== 1) continue;
        px(ctx, cx + col0 * s, y + Math.floor(b / 3) * s, s, s, col);
      }
      cx += (w + 1) * s;
    }
    return cx - x;
  }
  function textW(str, s) { var w = 0; for (var i = 0; i < str.length; i++) w += (str.charAt(i) === '.' ? 2 : 4) * s; return w; }
  // pixel "words": runs of little blocks standing in for writing too small to read
  function words(ctx, x, y, w, col, seed) {
    var cx = x;
    while (cx < x + w - 2) {
      var n = 2 + Math.floor(hash(seed + cx) * 5);
      px(ctx, cx, y, Math.min(n, x + w - cx), 2, col);
      cx += n + 2;
    }
  }

  // ---- roulette wheels ------------------------------------------------------------------------------------------------
  var REDS = { 1: 1, 3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 14: 1, 16: 1, 18: 1, 19: 1, 21: 1, 23: 1, 25: 1, 27: 1, 30: 1, 32: 1, 34: 1, 36: 1 };
  var ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  var wheelCache = {};
  var FRAMES = 72;
  function wheelFrame(R, f) {                          // the pocket ring turned to frame f, as a little canvas
    var key = R + ':' + f;
    if (wheelCache[key]) return wheelCache[key];
    var size = R * 2 + 2, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var c = cv.getContext('2d'), img = c.createImageData(size, size), d = img.data;
    var rot = f * 2 * Math.PI / FRAMES;
    for (var j = 0; j < size; j++) {
      for (var i = 0; i < size; i++) {
        var dx = i - R - 0.5 + 0.5, dy = j - R - 0.5 + 0.5, r = Math.sqrt(dx * dx + dy * dy) / R;
        if (r < 0.46 || r > 0.97) continue;
        var col;
        if (r > 0.84) col = [42, 22, 12];                                   // the ball track
        else if (r < 0.56) col = [200, 160, 64];                            // the gold cone's foot
        else {
          var a = (Math.atan2(dy, dx) - rot + Math.PI * 4) % (Math.PI * 2);   // the ring turns with +rot, like the ball
          var p = Math.floor(a / (Math.PI * 2) * 37) % 37, n = ORDER[p];
          var edge = Math.abs((a / (Math.PI * 2) * 37) % 1 - 0.5) > 0.42 && r > 0.6;
          col = edge ? [200, 160, 64] : n === 0 ? [26, 138, 64] : REDS[n] ? [176, 26, 36] : [20, 18, 22];
        }
        var k = (j * size + i) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    wheelCache[key] = cv;
    return cv;
  }
  function drawWheel(ctx, wv, i, offX, offY, ts, now) {
    var R = Math.max(6, Math.round(wv[2] * ts)), cx = Math.round(offX + wv[0] * ts), cy = Math.round(offY + wv[1] * ts);
    var T = 14, t = (now / 1000 + i * 5.3) % T, wheelA = now / 1000 * 0.55 + i;
    var f = ((Math.round(wheelA / (Math.PI * 2) * FRAMES) % FRAMES) + FRAMES) % FRAMES;
    ctx.drawImage(wheelFrame(R, f), cx - R - 1, cy - R - 1);
    if (t > 12.2) return;                                                // the croupier has cleared the ball
    var spin = function (tt) { return -(7 * tt - 3 / 7 * tt * tt); };
    var ballA, br;
    if (t < 7) {
      ballA = spin(t) + i * 2.1;
      br = t < 5.4 ? 0.9 : 0.9 - (t - 5.4) / 1.6 * 0.2 + Math.abs(Math.sin(t * 9)) * 0.04 * (7 - t);
    } else {
      var lock = spin(7) + i * 2.1 - (now / 1000 - (t - 7)) * 0.55 - i;    // where the ball sat relative to the wheel
      ballA = wheelA + lock;
      br = 0.7;
    }
    var bx = cx + Math.cos(ballA) * R * br, by = cy + Math.sin(ballA) * R * br;
    px(ctx, bx - 1, by - 1, 2, 2, '#f8f8f0');
    px(ctx, bx - 1, by - 1, 1, 1, '#ffffff');
  }

  // ---- the crash round (one for the whole house, so the big screen and the rail agree) -------------------------------
  var CRASH_T = 18;
  function crashAt(now) {
    var s = now / 1000, round = Math.floor(s / CRASH_T), t = s - round * CRASH_T;
    var u = hash(round * 7 + 3), mc = Math.max(1.05, Math.min(14, 0.97 / (1 - u * 0.93)));      // most crash early; now and then one flies
    var tc = Math.min(13, Math.log(mc) / 0.19);
    var flying = t < tc;
    return { t: t, tc: tc, m: flying ? Math.exp(0.19 * t) : mc, crashed: !flying, round: round, since: t - tc };
  }
  function fmtM(m) { return (Math.floor(m * 100) / 100).toFixed(2) + 'x'; }
  function drawCrash(ctx, x, y, w, h, now) {
    var C = crashAt(now);
    px(ctx, x, y, w, h, C.crashed && C.since < 0.25 ? '#4a0a10' : '#0a0618');
    for (var gx = x + 8; gx < x + w; gx += 16) px(ctx, gx, y, 1, h, '#1a1030');
    for (var gy = y + h - 6; gy > y; gy -= 12) px(ctx, x, gy, w, 1, '#1a1030');
    // the curve: time across, multiplier up (scaled to the round so far)
    var span = Math.max(4, C.crashed ? C.tc : C.t), top = Math.max(2, C.m);
    var lx = x + 6, lw = w - 26, ly = y + h - 6, lh = h - 22, last = null;
    for (var i = 0; i <= lw; i++) {
      var tt = i / lw * span;
      if (tt > (C.crashed ? C.tc : C.t)) break;
      var mm = Math.exp(0.19 * tt), yy = ly - (mm - 1) / (top - 1 + 1e-6) * lh;
      px(ctx, lx + i, yy, 1, Math.max(1, ly - yy), 'rgba(255,112,64,0.18)');
      px(ctx, lx + i, yy, 1, 2, C.crashed ? '#c03030' : '#ff9050');
      last = [lx + i, yy];
    }
    if (last) {
      if (!C.crashed) {                                     // the rocket at the tip, flame flickering
        var rx = last[0], ry = last[1];
        px(ctx, rx - 1, ry - 7, 3, 6, '#e8e8f0');
        px(ctx, rx, ry - 9, 1, 2, '#e8e8f0');
        px(ctx, rx - 2, ry - 3, 1, 2, '#ff4060');
        px(ctx, rx + 2, ry - 3, 1, 2, '#ff4060');
        px(ctx, rx, ry - 6, 1, 1, '#40c8ff');
        var fl = 2 + Math.floor(hash(Math.floor(now / 60)) * 3);
        px(ctx, rx - 1, ry - 1, 3, fl, '#ffd040');
        px(ctx, rx, ry - 1 + fl, 1, 2, '#ff6020');
      } else if (C.since < 1.2) {                           // the bang
        for (var p = 0; p < 14; p++) {
          var a = hash(p + C.round * 31) * Math.PI * 2, d = C.since * (14 + hash(p * 3) * 16);
          px(ctx, last[0] + Math.cos(a) * d, last[1] + Math.sin(a) * d, 2, 2, p % 2 ? '#ffd040' : '#ff4020');
        }
      }
    }
    var s = Math.max(2, Math.floor(h / 26)), str = fmtM(C.m);
    digits(ctx, str, x + 6, y + 5, s, C.crashed ? '#ff3040' : '#ffe0a0');
    if (C.crashed && C.since > 1.5) {                        // the next round counting in
      var left = (CRASH_T - C.t) / (CRASH_T - C.tc - 1.5);
      px(ctx, x + 6, y + h - 4, (w - 12) * Math.max(0, Math.min(1, left)), 2, '#ff7040');
    }
  }
  function drawCrashBet(ctx, x, y, w, h, now) {
    var C = crashAt(now);
    px(ctx, x, y, w, h, '#0a0618');
    var str = fmtM(C.m), s = 1, tw = textW(str, s);
    digits(ctx, str, x + Math.max(1, Math.round((w - tw) / 2)), y + Math.round(h / 2) - 2, s, C.crashed ? '#ff3040' : '#ffd090');
    if (!C.crashed) px(ctx, x + 1, y + 1, Math.round((w - 2) * Math.min(1, C.t / 13)), 1, '#ff7040');
    else if (Math.floor(now / 200) % 2) px(ctx, x, y, w, 1, '#ff3040');
  }

  // ---- the race and sports book ---------------------------------------------------------------------------------------
  var SILKS = ['#e84040', '#40c8ff', '#ffd040', '#40e080', '#ff60d0', '#f0f0f0'];
  function drawRace(ctx, x, y, w, h, now, seed) {
    var T = 26, s = now / 1000 + seed * 3.7, race = Math.floor(s / T), t = s - race * T;
    px(ctx, x, y, w, h, '#0e3a1a');
    var sky = Math.round(h * 0.22);
    px(ctx, x, y, w, sky, '#1a1a40');
    for (var b = 0; b < 6; b++) px(ctx, x + ((b * 23 - t * 18) % w + w) % w, y + sky - 4, 12, 4, '#2a2a5a');     // the stands going by
    px(ctx, x, y + sky, w, 1, '#f0f0f0');
    px(ctx, x, y + h - 2, w, 1, '#f0f0f0');
    for (var st = 0; st < w; st += 6) px(ctx, x + ((st - t * 40) % w + w) % w, y + sky + 1, 3, h - sky - 3, 'rgba(255,255,255,0.04)');
    var lanes = 5, lh = (h - sky - 4) / lanes, run = Math.max(0, Math.min(1, (t - 2) / 16));
    var prog = [];
    for (var i = 0; i < lanes; i++) {                                 // each horse's run: a steady pace plus a surge
      var sp = 0.85 + hash(race * 13 + i) * 0.2, kick = hash(race * 7 + i * 3) * 0.12;
      prog.push(run * sp + kick * Math.max(0, run - 0.6) * 2.5);
    }
    var lead = Math.max.apply(null, prog), mean = prog.reduce(function (a, b) { return a + b; }, 0) / lanes;
    var finishing = run >= 1;
    for (var j = 0; j < lanes; j++) {
      var hx = x + w * 0.5 + (prog[j] - mean) * w * 2.2, hy = y + sky + 2 + j * lh + lh * 0.2;
      var leg = finishing ? 0 : Math.floor(now / 90 + j) % 2;
      px(ctx, hx - 4, hy + 1, 7, 3, '#6a3a1a');                   // the horse
      px(ctx, hx + 2, hy, 2, 2, '#6a3a1a');
      px(ctx, hx - 4 + leg, hy + 4, 1, 2, '#3a2010');
      px(ctx, hx + 1 - leg, hy + 4, 1, 2, '#3a2010');
      px(ctx, hx - 1, hy - 2, 2, 3, SILKS[j]);                      // the jockey's silks
      if (finishing && prog[j] === lead && Math.floor(now / 250) % 2) px(ctx, hx - 5, hy - 3, 11, 9, 'rgba(255,240,160,0.35)');
    }
    if (run > 0.9) px(ctx, x + w * 0.5 + (1 - mean) * w * 2.2, y + sky + 1, 1, h - sky - 3, '#f0f0f0');     // the post
    if (t < 2) digits(ctx, String(2 - Math.floor(t)), x + w / 2 - 2, y + sky + (h - sky) / 2 - 3, 2, '#ffe080');
  }
  function drawSports(ctx, x, y, w, h, now, seed) {
    var s = now / 1000 + seed * 5, which = Math.floor(s / 11) % 2;
    var bg = which ? '#a8581e' : '#1d6a2a', line = which ? '#f0d8b0' : '#e8f0e8';
    px(ctx, x, y, w, h, bg);
    for (var st = 0; st < w; st += 8) px(ctx, x + st, y, 4, h, which ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)');
    px(ctx, x + w / 2, y + 2, 1, h - 4, line);
    px(ctx, x + 2, y + 2, w - 4, 1, line);
    px(ctx, x + 2, y + h - 3, w - 4, 1, line);
    var ballX = x + w / 2 + Math.sin(s * 0.9) * w * 0.32, ballY = y + h / 2 + Math.sin(s * 1.7) * h * 0.25;
    for (var p = 0; p < 10; p++) {
      var team = p < 5, a = hash(p + seed) * 6.28;
      var homeX = x + w * (team ? 0.3 : 0.7) + Math.cos(a) * w * 0.15, homeY = y + h * (0.25 + 0.5 * hash(p * 3 + seed));
      var pxx = homeX + (ballX - homeX) * 0.35 + Math.sin(s * 2 + p) * 2, pyy = homeY + (ballY - homeY) * 0.3;
      px(ctx, pxx, pyy, 2, 3, team ? '#e84040' : '#40a0ff');
    }
    px(ctx, ballX, ballY, 2, 2, '#ffffff');
    px(ctx, x + 2, y + 2, 22, 7, 'rgba(8,8,20,0.85)');                 // the score bug
    var sc = Math.floor(hash(Math.floor(s / 11) + seed) * 4) + '-' + Math.floor(hash(Math.floor(s / 11) * 3 + seed) * 4);
    digits(ctx, sc, x + 4, y + 3, 1, '#ffe080');
  }
  function drawOdds(ctx, x, y, w, h, now, seed) {
    px(ctx, x, y, w, h, '#06102a');
    var rows = Math.max(1, Math.floor((h - 2) / 7)), tick = Math.floor(now / 2200);
    for (var r = 0; r < rows; r++) {
      var ry = y + 2 + r * 7;
      words(ctx, x + 2, ry + 1, Math.max(4, w * 0.5), r % 2 ? '#a0b0e0' : '#e0e8ff', seed * 17 + r * 5);
      var o = (1 + Math.floor(hash(seed + r * 11 + tick) * 9)) + '-' + (1 + Math.floor(hash(seed * 3 + r + tick) * 4));
      var col = hash(seed + r + tick * 3) > 0.7 ? '#40e080' : hash(seed * 2 + r + tick) > 0.7 ? '#ff5050' : '#ffd040';
      digits(ctx, o, x + w - textW(o, 1) - 2, ry, 1, col);
    }
    var tk = ((now / 30) % (w + 40)) | 0;
    px(ctx, x, y + h - 3, w, 3, '#1a0a30');
    words(ctx, x + w - tk, y + h - 2, 40, '#ff60d0', seed + 99);
  }

  // ---- Royale Link, the Card Room's board -------------------------------------------------------------------------------
  function crown(ctx, cx, cy, s, col) {
    px(ctx, cx - 3 * s, cy, 7 * s, 2 * s, col);
    px(ctx, cx - 3 * s, cy - 2 * s, s, 2 * s, col);
    px(ctx, cx, cy - 3 * s, s, 3 * s, col);
    px(ctx, cx + 3 * s, cy - 2 * s, s, 2 * s, col);
    px(ctx, cx - s, cy - s, s, s, col);
    px(ctx, cx + 2 * s, cy - s, s, s, col);
  }
  function drawLink(ctx, x, y, w, h, now, seed) {
    px(ctx, x, y, w, h, '#081430');
    crown(ctx, x + Math.round(w / 2) - 0, y + 4, 1, '#e8c060');
    var sel = Math.floor(now / 1500 + seed) % 3;
    for (var r = 0; r < 3; r++) {
      var ry = y + 7 + r * 4;
      if (ry + 3 > y + h) break;
      if (r === sel) px(ctx, x + 1, ry - 1, w - 2, 4, 'rgba(92,200,208,0.35)');
      words(ctx, x + 3, ry, w - 6, r === sel ? '#e0fcff' : '#5cc8d0', seed * 7 + r);
    }
  }
  function drawBoard(ctx, x, y, w, h, now) {
    px(ctx, x, y, w, h, '#100818');
    px(ctx, x + 2, y + 2, w - 4, 6, '#3a2a08');
    crown(ctx, x + Math.round(w / 2), y + 6, 1, '#ffd060');
    var rows = Math.floor((h - 12) / 7), tick = Math.floor(now / 4000);
    for (var r = 0; r < rows; r++) {
      var ry = y + 11 + r * 7, col = r === 0 ? '#ffd060' : '#c0c8e0';
      digits(ctx, String(r + 1), x + 3, ry, 1, col);
      words(ctx, x + 9, ry + 1, w * 0.45, col, r * 13 + 4);
      var chipsN = String(Math.floor((9 - r) * 1000 + hash(r + tick) * 900));
      digits(ctx, chipsN, x + w - textW(chipsN, 1) - 3, ry, 1, r === 0 ? '#ffd060' : '#40e080');
    }
  }

  // ---- the Runouts cabinets' attract loops (tiny screens, ~20 px) -------------------------------------------------------
  function drawRunouts(ctx, mode, x, y, w, h, now, seed) {
    var t = now / 1000 + seed, cx = x + w / 2, cy = y + h / 2;
    px(ctx, x, y, w, h, '#0a0614');
    switch (mode) {
      case 'holdem': case 'plo': case 'high-card':
        var n = mode === 'plo' ? 4 : mode === 'high-card' ? 1 : 2, flip = Math.floor(t / 1.2) % (n + 2);
        for (var i = 0; i < n; i++) {
          var cxx = cx - n * 3 + i * 6;
          px(ctx, cxx, cy - 4, 5, 8, i < flip ? '#f4f0e8' : '#2a3a8a');
          if (i < flip) px(ctx, cxx + 2, cy - 1, 1, 2, i % 2 ? '#e02030' : '#141216');
        }
        break;
      case 'rng':
        digits(ctx, String(Math.floor(hash(Math.floor(t * 8)) * 100)), cx - 4, cy - 2, 1, '#40e0d0');
        break;
      case 'wheel':
        for (var k = 0; k < 8; k++) {
          var a = k * Math.PI / 4 + t * 3;
          px(ctx, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 2, 2, k % 2 ? '#ffd040' : '#ff5050');
        }
        px(ctx, cx, cy - 8, 1, 2, '#ffffff');
        break;
      case 'dice':
        var bounce = Math.abs(Math.sin(t * 4)) * 4;
        px(ctx, cx - 7, cy - bounce, 5, 5, '#f0f0f0');
        px(ctx, cx + 2, cy - 4 + bounce, 5, 5, '#f0f0f0');
        px(ctx, cx - 5, cy - bounce + 2, 1, 1, '#c01a24');
        px(ctx, cx + 4, cy - 2 + bounce, 1, 1, '#c01a24');
        break;
      case 'coin-flips':
        var cw = Math.max(1, Math.round(Math.abs(Math.cos(t * 5)) * 6));
        px(ctx, cx - cw / 2, cy - 4, cw, 8, Math.cos(t * 5) > 0 ? '#ffd040' : '#c89020');
        break;
      case 'black-marble':
        for (var m = 0; m < 5; m++) {
          var my = y + ((t * 14 + m * 9) % (h + 4)) - 2;
          px(ctx, x + 3 + m * (w - 6) / 5, my, 3, 3, m === Math.floor(t / 3) % 5 ? '#141018' : '#e8e8f0');
        }
        break;
      case 'slots':
        for (var r = 0; r < 3; r++) {
          var off = Math.floor(t * (6 + r * 2)) % 3;
          px(ctx, x + 2 + r * (w - 4) / 3, cy - 3, (w - 4) / 3 - 1, 7, '#e8e4dc');
          px(ctx, x + 3 + r * (w - 4) / 3, cy - 1, 3, 3, ['#e02030', '#ffd040', '#40c8ff'][(off + r) % 3]);
        }
        break;
      case 'horse-race':
        for (var hh = 0; hh < 3; hh++) {
          var hx = x + ((t * (6 + hh) + hh * 5) % (w - 4)) + 1;
          px(ctx, hx, y + 4 + hh * 5, 4, 2, SILKS[hh]);
        }
        break;
      case 'rocket':
        var ry = y + h - ((t * 10) % (h + 8));
        px(ctx, cx - 1, ry, 3, 5, '#e8e8f0');
        px(ctx, cx, ry + 5, 1, 2 + Math.floor(t * 20) % 2, '#ffb030');
        break;
      case 'space-invaders':
        var sx = Math.round(Math.sin(t * 1.5) * 3);
        for (var iv = 0; iv < 3; iv++) {
          px(ctx, x + 3 + iv * 6 + sx, y + 4, 4, 2, '#40ff70');
          px(ctx, x + 3 + iv * 6 + sx + (Math.floor(t * 4) % 2 ? 0 : 3), y + 6, 1, 1, '#40ff70');
        }
        px(ctx, cx - 1, y + h - 3, 3, 2, '#5cc8d0');
        break;
      case 'bomb':
        px(ctx, cx - 3, cy - 2, 6, 6, '#2a2a34');
        if (Math.floor(t * 8) % 2) px(ctx, cx + 3, cy - 5, 2, 2, '#ffd040');
        if ((t % 4) > 3.7) px(ctx, x, y, w, h, 'rgba(255,90,40,0.55)');
        break;
      case 'plinko':
        for (var pg = 0; pg < 9; pg++) px(ctx, x + 3 + (pg % 3) * 6 + (Math.floor(pg / 3) % 2) * 3, y + 4 + Math.floor(pg / 3) * 4, 1, 1, '#5cc8ff');
        var py = y + ((t * 9) % h), pxx = cx + Math.sin(t * 7) * 4;
        px(ctx, pxx, py, 2, 2, '#ff60d0');
        break;
      case 'battle-royale':
        var rad = 2 + ((1 - (t % 6) / 6) * (Math.min(w, h) / 2 - 2));
        ctx.strokeStyle = '#ffd040';
        ctx.strokeRect(Math.round(cx - rad), Math.round(cy - rad), Math.round(rad * 2), Math.round(rad * 2));
        for (var d = 0; d < 4; d++) px(ctx, cx + Math.cos(d * 1.6 + t) * rad * 0.6, cy + Math.sin(d * 1.6 + t) * rad * 0.6, 1, 1, '#ff5050');
        break;
      case 'stock-market':
        var last = null;
        for (var sx2 = 0; sx2 < w - 2; sx2++) {
          var v = cy + Math.sin((sx2 + t * 8) * 0.4) * 3 + Math.sin((sx2 + t * 8) * 0.13) * 3;
          px(ctx, x + 1 + sx2, v, 1, 1, last !== null && v < last ? '#40e080' : '#ff5050');
          last = v;
        }
        break;
      default:                                                         // the hall's desk: RUNOUTS in pink, pulsing
        px(ctx, x + 1, cy - 2, w - 2, 4, 'rgba(255,96,208,' + (0.4 + 0.3 * Math.sin(t * 3)).toFixed(2) + ')');
        crown(ctx, cx, cy - 3, 1, '#ffd040');
    }
    for (var sl = y; sl < y + h; sl += 2) px(ctx, x, sl, w, 1, 'rgba(0,0,0,0.18)');    // scanlines
  }

  function drawScreen(ctx, s, i, offX, offY, ts, now) {
    var x = Math.round(offX + s[0] * ts), y = Math.round(offY + s[1] * ts);
    var w = Math.round((s[2] - s[0]) * ts), h = Math.round((s[3] - s[1]) * ts);
    if (w < 3 || h < 3) return;
    if (x > ctx.canvas.width || y > ctx.canvas.height || x + w < 0 || y + h < 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    var kind = s[4];
    if (kind === 'race') drawRace(ctx, x, y, w, h, now, i);
    else if (kind === 'sports') drawSports(ctx, x, y, w, h, now, i);
    else if (kind === 'odds') drawOdds(ctx, x, y, w, h, now, i);
    else if (kind === 'crash') drawCrash(ctx, x, y, w, h, now);
    else if (kind === 'crashbet') drawCrashBet(ctx, x, y, w, h, now);
    else if (kind === 'link') drawLink(ctx, x, y, w, h, now, i);
    else if (kind === 'board') drawBoard(ctx, x, y, w, h, now);
    else if (String(kind).indexOf('runouts:') === 0) drawRunouts(ctx, kind.slice(8), x, y, w, h, now, i * 0.37);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';                          // the glass
    ctx.fillRect(x, y, w, 1);
  }

  // ---- slot chases, bulbs, glints, dice --------------------------------------------------------------------------------
  function drawChases(ctx, L, offX, offY, ts, now) {
    for (var i = 0; i < L.length; i++) {
      var c = L[i], hot = c[6], col = c[7];
      var y0 = offY + c[1] * ts, y1 = offY + c[2] * ts, len = y1 - y0;
      var per = hot ? 900 : 1500, ph = ((now + i * 377) % per) / per;
      var sides = [c[0], c[8] != null ? c[8] - 0.04 : c[0]];
      for (var sI = 0; sI < 2; sI++) {
        var sx = Math.round(offX + sides[sI] * ts) + (sI ? -1 : 0);
        var yy = y1 - ((ph + sI * 0.5) % 1) * len;
        px(ctx, sx, yy - 2, 1, 3, '#ffffff');
        px(ctx, sx, yy + 1, 1, 2, col);
        if (hot) { var y2 = y1 - ((ph + sI * 0.5 + 0.33) % 1) * len; px(ctx, sx, y2 - 1, 1, 2, '#fff8e0'); }
      }
      // the topper's bulbs blinking across it
      var tx0 = offX + c[3] * ts, tx1 = offX + c[5] * ts, ty = Math.round(offY + c[4] * ts) - 1;
      var nB = Math.max(3, Math.round((tx1 - tx0) / 4)), step = Math.floor(now / (hot ? 140 : 240));
      for (var b = 0; b < nB; b++) {
        if ((b + step + i) % 3) continue;
        px(ctx, tx0 + b * (tx1 - tx0) / (nB - 1) - 0.5, ty - 3, 1, 1, '#fff8d0');
      }
      if (hot && Math.floor(now / 500 + i) % 4 === 0) {               // a playable machine winks: try me
        ctx.fillStyle = 'rgba(255,240,180,0.10)';
        ctx.fillRect(Math.round(tx0) - 2, ty - 6, Math.round(tx1 - tx0) + 4, Math.round(y1 - ty) + 6);
      }
    }
  }
  function drawBulbs(ctx, B, offX, offY, ts, now) {
    var step = Math.floor(now / 150);
    for (var i = 0; i < B.length; i++) {
      if ((i + step) % 3) continue;
      var x = Math.round(offX + B[i][0] * ts), y = Math.round(offY + B[i][1] * ts);
      px(ctx, x - 1, y - 1, 2, 2, '#fffbe8');
      ctx.fillStyle = 'rgba(255,214,140,0.3)';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }
  function drawGlints(ctx, G, offX, offY, ts, now) {
    var slot = Math.floor(now / 160);
    for (var i = 0; i < G.length; i++) {
      if (hash(slot * 13 + i * 7) > 0.035) continue;
      var x = Math.round(offX + G[i][0] * ts), y = Math.round(offY + G[i][1] * ts) - 1;
      px(ctx, x, y - 1, 1, 3, '#fffef0');
      px(ctx, x - 1, y, 3, 1, '#fffef0');
    }
  }
  function drawDice(ctx, D, offX, offY, ts, now) {
    for (var i = 0; i < D.length; i++) {
      var T = 7, t = ((now / 1000 + i * 2.3) % T);
      if (t > 1.0) continue;                                            // a roll every few seconds, down the tub
      var x0 = offX + (D[i][0] - 1.6) * ts, x1 = offX + (D[i][0] + 0.2) * ts, y = offY + D[i][1] * ts;
      for (var d = 0; d < 2; d++) {
        var x = x0 + (x1 - x0) * Math.min(1, t * (1.1 - d * 0.15)), hop = Math.abs(Math.sin(t * 14 + d)) * 4 * (1 - t);
        px(ctx, x + d * 3, y - hop - d, 2, 2, '#fbf6ec');
      }
    }
  }

  // ---- the city behind the great windows (Aurum, the Crown Room) ---------------------------------------------------------
  var skyCv = null;
  function drawSky(ctx, world, offX, offY, ts, now) {
    if (typeof BridgeSkyline === 'undefined') return;
    var S = world.casino.sky;
    var x = Math.round(offX + S[0] * ts), y = Math.round(offY + S[1] * ts), w = Math.round((S[2] - S[0]) * ts), h = Math.round((S[3] - S[1]) * ts);
    var H = Math.max(160, h * 3);
    if (!skyCv) skyCv = document.createElement('canvas');
    if (skyCv.width !== w || skyCv.height !== H) { skyCv.width = w; skyCv.height = H; }
    var c = skyCv.getContext('2d');
    c.imageSmoothingEnabled = false;
    var real = BridgeWorld.getView, vOffY = Math.round((0.55 * H - H / 2) / 0.55 + H / 2 - 6 * 32);
    BridgeWorld.getView = function () { return { offX: w / 2 - 16 * 32, offY: vOffY, ts: 32, w: w, h: H }; };
    try {
      BridgeSkyline.draw(c, w, H, now, { baseRow: 6, railRow: 8, centerCol: 16 });
      if (BridgeSkyline.rain) BridgeSkyline.rain(c, w, H, now, { drops: 50 });
    } finally { BridgeWorld.getView = real; }
    ctx.drawImage(skyCv, 0, Math.round(H * 0.4 - h / 2), w, h, x, y, w, h);
  }

  // ---- the street: the Royale's searchlights sweep the sky -----------------------------------------------------------------
  function drawBeams(ctx, world, offX, offY, ts, now) {
    var B = world.royale.beams || [];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < B.length; i++) {
      var ox = offX + B[i][0] * ts, oy = offY + B[i][1] * ts;
      var a = -Math.PI / 2 + Math.sin(now / 2600 + i * 2.4) * 0.55, L = 420, spread = 0.07;
      var g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * L, oy + Math.sin(a) * L);
      g.addColorStop(0, i % 2 ? 'rgba(255,120,200,0.20)' : 'rgba(255,220,150,0.20)');
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - spread) * L, oy + Math.sin(a - spread) * L);
      ctx.lineTo(ox + Math.cos(a + spread) * L, oy + Math.sin(a + spread) * L);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  BridgeWorld.registerSceneHooks('arcadia', {
    behind: function (ctx, world, offX, offY, ts, now) {
      if (world.royale) drawBeams(ctx, world, offX, offY, ts, now);
      if (world.casino && world.casino.sky) drawSky(ctx, world, offX, offY, ts, now);
    },
    ground: function (ctx, world, offX, offY, ts, now) {
      var L = world.casino && world.casino.live;
      if (!L) return;
      var i;
      for (i = 0; i < (L.screens || []).length; i++) drawScreen(ctx, L.screens[i], i, offX, offY, ts, now);
      for (i = 0; i < (L.wheels || []).length; i++) drawWheel(ctx, L.wheels[i], i, offX, offY, ts, now);
      drawChases(ctx, L.chases || [], offX, offY, ts, now);
      drawBulbs(ctx, L.bulbs || [], offX, offY, ts, now);
      drawGlints(ctx, L.glints || [], offX, offY, ts, now);
      drawDice(ctx, L.dice || [], offX, offY, ts, now);
    }
  });

  // ---- the Crown Room's rope ------------------------------------------------------------------------------------------------
  function vipNeed() {
    var C = typeof BridgeCasino !== 'undefined' ? BridgeCasino : null;
    var need = C && C.HIGH_ROLLER != null ? C.HIGH_ROLLER : 1000;
    var won = C && typeof C.pokerWon === 'function' ? Number(C.pokerWon()) || 0 : null;
    return { need: need, won: won };
  }
  function vipOpen() { var v = vipNeed(); return v.won !== null && v.won >= v.need; }
  function rope(inter) {
    var v = vipNeed();
    if (v.won !== null && v.won >= v.need) {
      if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('door');
      BridgeInteractions.say('THE CROWN ROOM', 'BRUNO UNHOOKS THE VELVET ROPE BEFORE YOU REACH IT. "THE DUCHESS HAS BEEN ASKING AFTER YOU. UP YOU GO."');
      setTimeout(function () { BridgeWorld.enterWorld(inter.target || 'arcadia-casino-vip', inter.spawn || [10, 12]); }, 1200);
      return;
    }
    var short = v.won === null ? v.need : Math.max(1, v.need - v.won);
    BridgeInteractions.say('THE CROWN ROOM', 'A BIG MAN IN A RED COAT STEPS IN FRONT OF THE ROPE, POLITE AS A WALL.\n\n"THE CROWN ROOM IS FOR PLAYERS THE CARD ' +
      'ROOM KNOWS. WIN ' + v.need + ' AT THE POKER TABLES AND THE DUCHESS WILL KNOW YOUR NAME."\n\n' +
      (v.won === null || v.won <= 0 ? 'HE NODS AT THE CARD ROOM\'S ARCH. "THE TABLES ARE THAT WAY."' :
        '"YOU\'RE ' + short + ' SHORT. CLOSE ENOUGH TO SMELL THE CHAMPAGNE."'));
  }
  function init() {                                                     // js/interactions.js loads after the world scripts
    if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) BridgeInteractions.register('royale_vip', rope, 'Go up');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { crashAt: crashAt, vipOpen: vipOpen, vipNeed: vipNeed };
})();
