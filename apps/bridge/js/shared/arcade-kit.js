/**
 * BridgeArcade — the shared cabinet for the Bridge's arcade games.
 *
 * A game is a handful of callbacks; the kit does the rest the same way for
 * every cabinet, so they all look, feel and pay like part of one world:
 *
 *   - a native low-res buffer (the game's own size, e.g. 320×240), scaled
 *     to fit the window by a whole number (smaller only when it must), crisp
 *   - a fixed 60 Hz step however fast the screen refreshes
 *   - input: keys (key-repeat filtered, edge presses), the pointer in native
 *     pixels, and on touch screens an overlay of buttons the game names
 *   - the screens: a title (attract mode, best score, how to play), pause
 *     (P, or Esc, or leaving the tab), game over (score, best, coins; input
 *     locked for a moment so a held key can't skip it)
 *   - a 5×7 pixel font (api.text) and the world palettes (BridgeArcade.PAL)
 *   - small synthesised sounds (api.beep / api.noise)
 *   - scores: best, plays and last run per game in localStorage
 *     `bridge_scores` (the Bridge reads it for the Arcade's high-score boards
 *     and the game room); coins through BridgeProgression, paid as you go
 *     (api.award, e.g. per wave) plus a score bonus at the end, at most
 *     DAILY_CAP a game a day; `played_<id>` and `first_light` trophies
 *   - inside the Bridge's cabinet (an iframe): Esc pauses a run and Esc
 *     again leaves; the run's result goes back to the Bridge for a toast
 *
 *   BridgeArcade.run({
 *     id: 'asteroids', title: 'ASTEROIDS', w: 320, h: 240, pal: 'arcadia',
 *     help: ['ARROWS TURN AND THRUST', 'SPACE FIRES'],
 *     touch: [{ key: 'ArrowLeft', label: '<', side: 'left' }, ...],
 *     coins: { per: 60, best: 20 },            // end of run: score / per, +best on a new best
 *     start(api)  — a new run          update(api, dt)  — 60×/s while playing
 *     draw(g, api, mode)  — every frame ('title', 'play', 'pause', 'over')
 *     attract(api, dt)  — optional, steps the title screen's demo
 *   })
 *
 *   api: w, h, t (seconds), score, lives, level, rnd(), down(key), pressed(key), fire(),
 *        pointer {x, y, down, pressed}, text(g, s, x, y, col, scale, align),
 *        line(g, x0, y0, x1, y1, col), poly(g, pts, col), circle(g, x, y, r, col, fill),
 *        beep(freq, dur, type, vol, slide), noise(dur, vol, freq), award(coins, why),
 *        over() — end the run, flash(col), shake(px)
 */
(function (global) {
  var FONT = {'A':'0e11111f111111', 'B':'1e11111e11111e', 'C':'0e11101010110e', 'D':'1e11111111111e', 'E':'1f10101e10101f', 'F':'1f10101e101010', 'G':'0e11101711110f', 'H':'1111111f111111', 'I':'0e04040404040e', 'J':'0702020212120c', 'K':'11121418141211', 'L':'1010101010101f', 'M':'111b1515111111', 'N':'11191513111111', 'O':'0e11111111110e', 'P':'1e11111e101010', 'Q':'0e11111115120d', 'R':'1e11111e141211', 'S':'0f10100e01011e', 'T':'1f040404040404', 'U':'1111111111110e', 'V':'11111111110a04', 'W':'11111115151b11', 'X':'11110a040a1111', 'Y':'11110a04040404', 'Z':'1f01020408101f', '0':'0e11131519110e', '1':'040c040404040e', '2':'0e11010204081f', '3':'1e01010e01011e', '4':'02060a121f0202', '5':'1f101e0101110e', '6':'0e10101e11110e', '7':'1f010204080808', '8':'0e11110e11110e', '9':'0e11110f01010e', ' ':'00000000000000', '.':'00000000000004', ',':'00000000000408', ':':'00040000000400', '!':'04040404040004', '?':'0e110102040004', '-':'0000000e000000', '+':'0004041f040400', '/':'01020204080810', "'":'04040000000000', 'x':'0000110a040a11', '*':'00150e1f0e1500', '<':'02040810080402', '>':'08040201020408', '(':'02040808080402', ')':'08040202020408', '%':'191a0204080b13', '#':'0a0a1f0a1f0a0a', '=':'00001f001f0000', '@':'0e11171517100f', '$':'040f140e051e04', '&':'0c12140815120d', '"':'0a0a0000000000'};
  var GLYPH = {};
  Object.keys(FONT).forEach(function (c) {
    var h = FONT[c], rows = [];
    for (var i = 0; i < 7; i++) rows.push(parseInt(h.substr(i * 2, 2), 16));
    GLYPH[c] = rows;
  });

  // the world palettes (apps/bridge/CLAUDE.md)
  var PAL = {
    arcadia: { bg: '#080418', bg2: '#140c28', dark: '#1a1530', mid: '#2a2a3e', hi: '#3a3a52', pink: '#f078a8', pink2: '#e870c0',
               mag: '#a040c0', cyan: '#5cc8d0', cyan2: '#80e0e8', purp: '#7080e8', purp2: '#3a1840', yel: '#e8c040',
               green: '#40e080', red: '#e84040', white: '#f0eef8', grey: '#8a84a8' },
    enigma:  { bg: '#060c12', bg2: '#0e1820', dark: '#1a2530', mid: '#253540', hi: '#38505e', cyan: '#40c8d8', cyan2: '#80e0e8',
               green: '#40e080', red: '#e84040', yel: '#e8c040', orange: '#e06040', blue: '#40a8e0', white: '#e0f0f4', grey: '#6a8890' },
    lumar:   { bg: '#0a1210', bg2: '#12201c', dark: '#1a1e20', mid: '#3a4848', wood: '#5a3a1a', wood2: '#7a4e22', sea: '#2a7050',
               foam: '#90e0a8', glow: '#ffe080', amber: '#c08840', brass: '#e0c060', white: '#f2ede2', grey: '#8a9a90', red: '#d06050' },
    ship:    { bg: '#0c0806', bg2: '#1a1208', dark: '#24160c', mid: '#3e2614', hi: '#6e4828', brass: '#d0a048', brass2: '#a08040',
               leather: '#6a2a22', parch: '#d8c8a0', ink: '#3a2a1a', cyan: '#40c8d8', amber: '#ffb050', white: '#f2ece0', grey: '#9a8a78' }
  };

  var DAILY_CAP = 150;

  function scores() { try { return JSON.parse(localStorage.getItem('bridge_scores') || '{}') || {}; } catch (e) { return {}; } }
  function saveScores(s) { try { localStorage.setItem('bridge_scores', JSON.stringify(s)); } catch (e) { /* private mode */ } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  var inFrame = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  function toParent(msg) { if (inFrame) try { window.parent.postMessage(msg, '*'); } catch (e) { /* gone */ } }

  function run(G) {
    global.__bridgeOwnsEsc = true;                 // progression.js leaves Esc to us
    var W = G.w, H = G.h;
    var P = PAL[G.pal || 'arcadia'];
    document.documentElement.style.background = P.bg;
    document.body.style.cssText += ';margin:0;background:' + P.bg + ';overflow:hidden;height:100vh;display:flex;align-items:center;' +
      'justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none;';
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.style.cssText = 'image-rendering:pixelated;image-rendering:crisp-edges;display:block;';
    document.body.appendChild(cv);
    var g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;

    var touch = 'ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var pad = null;
    function fit() {
      var bw = window.innerWidth, bh = window.innerHeight - (touch && G.touch ? 96 : 0);
      var s = Math.min(bw / W, bh / H);
      s = s >= 1 ? Math.floor(s) : s;
      cv.style.width = Math.round(W * s) + 'px';
      cv.style.height = Math.round(H * s) + 'px';
      cv.style.marginBottom = touch && G.touch ? '96px' : '0';
    }
    window.addEventListener('resize', fit);

    // ---- input ----------------------------------------------------------------------------------
    var keys = {}, edges = {}, lockUntil = 0;
    var ptr = { x: W / 2, y: H / 2, down: false, pressed: false };
    var FIRE = { ' ': 1, Enter: 1, z: 1, Z: 1 };
    function keyDown(k, repeat) {
      if (!keys[k] && !repeat) edges[k] = true;
      keys[k] = true;
    }
    window.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'Escape') { e.preventDefault(); onEsc(); return; }
      if (k === 'p' || k === 'P') { if (!e.repeat) togglePause(); return; }
      if (k === 'm' || k === 'M') { if (!e.repeat) muted = !muted; return; }
      if (/^(Arrow|Space| )/.test(k) || FIRE[k]) e.preventDefault();
      keyDown(k, e.repeat);
      if (!e.repeat && (FIRE[k] || k === ' ')) wake();
    });
    window.addEventListener('keyup', function (e) { keys[e.key] = false; });
    window.addEventListener('blur', function () { keys = {}; if (mode === 'play') setMode('pause'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && mode === 'play') setMode('pause'); });
    function toNative(e) {
      var r = cv.getBoundingClientRect();
      ptr.x = (e.clientX - r.left) / r.width * W;
      ptr.y = (e.clientY - r.top) / r.height * H;
    }
    cv.addEventListener('pointerdown', function (e) { toNative(e); ptr.down = true; ptr.pressed = true; wake(); e.preventDefault(); });
    window.addEventListener('pointermove', function (e) { toNative(e); });
    window.addEventListener('pointerup', function () { ptr.down = false; });

    function buildPad() {
      if (!touch || !G.touch || pad) return;
      pad = document.createElement('div');
      pad.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:96px;display:flex;justify-content:space-between;align-items:center;' +
        'padding:0 14px;box-sizing:border-box;gap:10px;pointer-events:none;';
      var sides = { left: document.createElement('div'), right: document.createElement('div') };
      ['left', 'right'].forEach(function (s) { sides[s].style.cssText = 'display:flex;gap:10px;pointer-events:auto;'; pad.appendChild(sides[s]); });
      G.touch.forEach(function (b) {
        var el = document.createElement('div');
        el.textContent = b.label;
        el.style.cssText = 'width:' + (b.wide ? 96 : 64) + 'px;height:64px;border-radius:14px;display:flex;align-items:center;justify-content:center;' +
          'font:20px monospace;color:' + P.white + ';background:rgba(255,255,255,0.08);border:2px solid ' + (b.col || P.cyan) + ';' +
          'touch-action:none;user-select:none;-webkit-user-select:none;';
        var on = function (e) { e.preventDefault(); keyDown(b.key, false); el.style.background = 'rgba(255,255,255,0.22)'; wake(); };
        var off = function (e) { e.preventDefault(); keys[b.key] = false; el.style.background = 'rgba(255,255,255,0.08)'; };
        el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
        el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
        sides[b.side || 'right'].appendChild(el);
      });
      document.body.appendChild(pad);
    }

    // ---- sound ------------------------------------------------------------------------------------
    var ac = null, muted = false;
    function audio() {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
      if (ac && ac.state === 'suspended') ac.resume();
      return ac;
    }
    function bridgeSoundOff() {
      try { var a = JSON.parse(localStorage.getItem('bridge_audio') || '{}'); return a.mode === 'off'; } catch (e) { return false; }
    }
    function beep(freq, dur, type, vol, slide) {
      if (muted || bridgeSoundOff() || !audio()) return;
      var t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
      gn.gain.setValueAtTime((vol || 0.08), t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    var nbuf = null;
    function noise(dur, vol, freq) {
      if (muted || bridgeSoundOff() || !audio()) return;
      if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
      s.buffer = nbuf; f.type = 'lowpass'; f.frequency.value = freq || 1800;
      gn.gain.setValueAtTime(vol || 0.15, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(gn); gn.connect(ac.destination); s.start(t); s.stop(t + dur + 0.02);
    }

    // ---- text -------------------------------------------------------------------------------------
    function text(c, s, x, y, col, scale, align) {
      s = String(s).toUpperCase();
      scale = scale || 1;
      var w = s.length * 6 * scale - scale;
      if (align === 'center') x -= Math.floor(w / 2); else if (align === 'right') x -= w;
      c.fillStyle = col || P.white;
      for (var i = 0; i < s.length; i++) {
        var rows = GLYPH[s[i]] || GLYPH['?'];
        for (var r = 0; r < 7; r++) {
          var bits = rows[r];
          if (!bits) continue;
          for (var b = 0; b < 5; b++) if (bits & (16 >> b)) c.fillRect(Math.round(x + (i * 6 + b) * scale), Math.round(y + r * scale), scale, scale);
        }
      }
      return w;
    }

    // crisp lines and circles, a pixel at a time (no anti-aliasing)
    function line(c, x0, y0, x1, y1, col) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      c.fillStyle = col;
      var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, n = 0;
      while (n++ < 2000) {
        c.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        var e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    function poly(c, pts, col) { for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; line(c, a[0], a[1], b[0], b[1], col); } }
    function circle(c, cx, cy, r, col, fill) {
      cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
      c.fillStyle = col;
      if (fill) { for (var y = -r; y <= r; y++) { var w = Math.round(Math.sqrt(r * r - y * y)); c.fillRect(cx - w, cy + y, w * 2 + 1, 1); } return; }
      var x = r, y2 = 0, err = 1 - r;
      while (x >= y2) {
        [[x, y2], [y2, x], [-y2, x], [-x, y2], [-x, -y2], [-y2, -x], [y2, -x], [x, -y2]].forEach(function (p) { c.fillRect(cx + p[0], cy + p[1], 1, 1); });
        y2++;
        if (err < 0) err += 2 * y2 + 1; else { x--; err += 2 * (y2 - x) + 1; }
      }
    }

    // ---- the run ----------------------------------------------------------------------------------
    var mode = 'title', modeAt = 0, shakeT = 0, shakePx = 0, flashT = 0, flashCol = '#fff';
    var api = {
      w: W, h: H, t: 0, score: 0, lives: 0, level: 1, pal: P, mode: function () { return mode; },
      rnd: Math.random, down: function (k) { return !!keys[k]; }, pressed: function (k) { return !!edges[k]; },
      pointer: ptr, text: text, beep: beep, noise: noise, line: line, poly: poly, circle: circle,
      award: function (n, why) { pay(n, why); },
      over: function () { if (mode === 'play') endRun(); },
      shake: function (px) { shakePx = Math.max(shakePx, px); shakeT = 0.3; },
      flash: function (col) { flashCol = col || '#fff'; flashT = 0.12; },
      fire: function () { return !!(edges[' '] || edges.Enter || edges.z || edges.Z); }
    };
    var run$ = { paid: 0, startedAt: 0 };
    var best = (scores()[G.id] || {}).best || 0;

    function setMode(m) {
      mode = m; modeAt = api.t;
      toParent({ type: 'bridge-run-state', game: G.id, active: m === 'play' || m === 'pause', paused: m === 'pause' });
    }
    function wake() {
      audio();
      if (mode === 'title' || (mode === 'over' && performance.now() > lockUntil)) startRun();
      else if (mode === 'pause') setMode('play');
    }
    function togglePause() { if (mode === 'play') setMode('pause'); else if (mode === 'pause') setMode('play'); }
    function onEsc() {
      if (mode === 'play') { setMode('pause'); return; }
      if (inFrame) toParent({ type: 'bridge-request-close', source: 'arcade' });
      else if (mode === 'pause') setMode('play');
    }
    function startRun() {
      api.score = 0; api.level = 1; api.lives = 0;
      run$ = { paid: 0, startedAt: Date.now() };
      edges = {};
      G.start(api);
      setMode('play');
      var s = scores(), r = s[G.id] || {};
      r.plays = (r.plays || 0) + 1; s[G.id] = r; saveScores(s);
      if (r.plays === 1 && global.BridgeProgression) {
        BridgeProgression.recordAchievement('first_light', 100, { game: G.id });
        BridgeProgression.recordAchievement('played_' + G.id.replace(/-/g, '_'), 25, { game: G.id });
      }
    }
    function pay(n, why) {
      n = Math.floor(n);
      if (n <= 0 || !global.BridgeProgression) return 0;
      var s = scores(), d = s._daily || {};
      if (d.date !== today()) d = { date: today() };
      var left = DAILY_CAP - (d[G.id] || 0);
      n = Math.min(n, Math.max(0, left));
      if (n <= 0) return 0;
      d[G.id] = (d[G.id] || 0) + n; s._daily = d; saveScores(s);
      run$.paid += n;
      BridgeProgression.awardCoins(n, G.id + ':' + (why || 'run'), { score: api.score });
      return n;
    }
    var result = null;
    function endRun() {
      var s = scores(), r = s[G.id] || {};
      var newBest = api.score > (r.best || 0);
      if (newBest) r.best = api.score;
      r.last = api.score; r.lastAt = Date.now(); s[G.id] = r; saveScores(s);
      best = r.best || 0;
      var c = G.coins || { per: 50, best: 20 };
      var earned = pay(Math.floor(api.score / c.per) + (newBest && api.score > 0 ? c.best : 0), 'score');
      result = { score: api.score, best: best, newBest: newBest, coins: run$.paid };
      toParent({ type: 'bridge-run-ended', game: G.id, title: G.title, score: api.score, best: best, newBest: newBest, coins: run$.paid });
      lockUntil = performance.now() + 1100;
      setMode('over');
      keys = {};
      beep(newBest ? 660 : 220, 0.5, 'triangle', 0.08, newBest ? 2 : 0.5);
      return earned;
    }

    // ---- the frame --------------------------------------------------------------------------------
    var acc = 0, last = performance.now(), STEP = 1 / 60;
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      while (acc >= STEP) {
        api.t += STEP;
        if (mode === 'play') G.update(api, STEP);
        else if (mode === 'title' && G.attract) G.attract(api, STEP);
        edges = {}; ptr.pressed = false;
        if (shakeT > 0) shakeT -= STEP; else shakePx = 0;
        if (flashT > 0) flashT -= STEP;
        acc -= STEP;
      }
      g.save();
      if (shakeT > 0) g.translate(Math.round((Math.random() - 0.5) * shakePx), Math.round((Math.random() - 0.5) * shakePx));
      G.draw(g, api, mode);
      g.restore();
      if (flashT > 0) { g.globalAlpha = Math.min(0.5, flashT * 4); g.fillStyle = flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      overlay();
      requestAnimationFrame(frame);
    }

    function panel(y0, h) {
      g.fillStyle = 'rgba(4,2,10,0.78)';
      g.fillRect(0, y0, W, h);
      g.fillStyle = P.pink || P.cyan; g.fillRect(0, y0, W, 1); g.fillRect(0, y0 + h - 1, W, 1);
    }
    function blink(on) { return Math.floor(api.t * 2.5) % 2 === 0 || !on; }
    function overlay() {
      var cx = Math.floor(W / 2), big = W >= 300 ? 3 : 2;
      if (mode === 'title') {
        panel(Math.floor(H * 0.22), Math.floor(H * 0.56));
        var y = Math.floor(H * 0.22) + 10;
        text(g, G.title, cx + 1, y + 1, P.mag || P.dark, big, 'center');
        text(g, G.title, cx, y, P.cyan2 || P.white, big, 'center');
        y += 7 * big + 8;
        (G.help || []).forEach(function (l) { text(g, l, cx, y, P.grey, 1, 'center'); y += 10; });
        y += 4;
        if (best) { text(g, 'BEST ' + best, cx, y, P.yel || P.brass, 1, 'center'); y += 12; }
        if (blink(true)) text(g, touch ? 'TAP TO PLAY' : 'PRESS SPACE TO PLAY', cx, y, P.white, 1, 'center');
      } else if (mode === 'pause') {
        panel(Math.floor(H / 2) - 22, 44);
        text(g, 'PAUSED', cx, Math.floor(H / 2) - 14, P.white, 2, 'center');
        text(g, inFrame ? 'SPACE RESUMES - ESC LEAVES' : 'SPACE RESUMES', cx, Math.floor(H / 2) + 6, P.grey, 1, 'center');
      } else if (mode === 'over' && result) {
        panel(Math.floor(H * 0.25), Math.floor(H * 0.5));
        var yy = Math.floor(H * 0.25) + 10;
        text(g, 'GAME OVER', cx, yy, P.pink || P.red, big, 'center'); yy += 7 * big + 8;
        text(g, 'SCORE ' + result.score, cx, yy, P.white, 1, 'center'); yy += 11;
        text(g, result.newBest && result.score ? 'NEW BEST!' : 'BEST ' + result.best, cx, yy, P.yel || P.brass, 1, 'center'); yy += 11;
        if (result.coins) { text(g, '+' + result.coins + ' COINS', cx, yy, P.green || P.glow, 1, 'center'); yy += 11; }
        if (performance.now() > lockUntil && blink(true)) text(g, touch ? 'TAP TO PLAY AGAIN' : 'SPACE TO PLAY AGAIN', cx, yy + 4, P.white, 1, 'center');
      }
    }

    // a back link only when played on its own, never inside the Bridge
    if (!inFrame && G.backLink !== false) {
      var a = document.createElement('a');
      a.href = '/bridge'; a.textContent = '← BRIDGE';
      a.style.cssText = 'position:fixed;top:10px;left:12px;font:12px monospace;letter-spacing:2px;color:' + P.grey + ';text-decoration:none;';
      document.body.appendChild(a);
    }
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'bridge-pause' && mode === 'play') setMode('pause');
    });

    fit();
    buildPad();
    requestAnimationFrame(frame);
    toParent({ type: 'bridge-iframe-ready' });
    return api;
  }

  global.BridgeArcade = { run: run, PAL: PAL, font: GLYPH, scores: scores };
})(window);
