/**
 * BridgeDarts — darts in a bar (spec-deeper-worlds A8): three darts against whoever's behind the bar.
 *
 * The Drip's DARTBOARD (the Undercity) and the Lantern's DART BOARD (Lumar's tavern) — the boards already drawn in the
 * scenes — become interactions of type `darts` as their worlds load (js/arcadia-deep.js `decorate`, `BOARDS` here: who
 * you play at each). They throw first: three darts, their total. Then you: a crosshair sweeps across the board — press
 * to stop it — then up and down — press again — and the dart flies, a hand's wobble off where you stopped. Beat their
 * total and you take the pot; level, you each take your stake back.
 *
 * The board is a real one (20 at the top, `ORDER` round from there; trebles and doubles, the outer bull 25 and the bull
 * 50), drawn in code a pixel at a time on a cork wall (The Drip's has the photo of a man in a Halcyon suit pinned to the
 * bull). Keys: Space / E / Enter throw, Esc leave. Touch: tap the board or Throw.
 *
 *   BridgeDarts.play(inter)       from a board
 *   BridgeDarts.score(x, y)       a point on the board (x, y in board radii from the bull, y down) → { n, label }
 *   BridgeDarts._g()              the game in play (tests) · _throw(x, y) a dart where you like
 */
var BridgeDarts = (function () {
  function has(n) { return typeof window[n] !== 'undefined'; }
  function sfx(n) { if (has('BridgeAudio') && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  var ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  // who you play at each board, and what they say
  var BOARDS = {
    'arcadia-dive':  { label: 'DARTBOARD', who: 'Nell', sheet: 'npc-nell', skill: 0.17, photo: true, stake: 10,
                       hi: 'NELL WIPES HER HANDS ON THE BAR TOWEL AND TAKES THE DARTS OFF THE NAIL. "THREE EACH. HIGHEST TOTAL TAKES THE POT. I THROW FIRST, IT\'S MY BAR."',
                       win: 'NOT BAD. FOR A TOURIST.', lose: 'THE BULL\'S MINE. IT\'S ALWAYS MINE.', draw: 'LEVEL. AGAIN?' },
    'lumar-tavern':  { label: 'DART BOARD', who: 'Fenwick', sheet: 'npc-merchant', skill: 0.24, stake: 5,
                       hi: 'FENWICK THE MERCHANT LOOKS UP FROM HIS ALE. "DARTS? I\'LL GIVE YOU A GAME. THREE EACH, HIGHEST TOTAL. MIND THE WALL - IT\'S BEEN HIT MORE THAN THE BOARD."',
                       win: 'WELL THROWN. I\'LL BUY THE NEXT ONE. TOMORROW.', lose: 'TWENTY YEARS OF SITTING NEXT TO THAT BOARD. IT RUBS OFF.', draw: 'A DRAW. LIKE MOST OF MY DEALS.' }
  };
  var R = 60, W = 156, H = 156, CX = 78, CY = 78;          // the board in native pixels
  // a point → its score: r, y in board radii (1 = the double ring's outer edge)
  function score(x, y) {
    var r = Math.sqrt(x * x + y * y);
    if (r <= 0.05) return { n: 50, label: 'BULL' };
    if (r <= 0.1) return { n: 25, label: '25' };
    if (r > 1) return { n: 0, label: 'MISSED' };
    var a = Math.atan2(x, -y) * 180 / Math.PI;               // 0 at the top, clockwise
    var seg = ORDER[Math.floor(((a + 9 + 360) % 360) / 18)];
    if (r >= 0.92) return { n: seg * 2, label: 'DOUBLE ' + seg };
    if (r >= 0.55 && r <= 0.62) return { n: seg * 3, label: 'TREBLE ' + seg };
    return { n: seg, label: String(seg) };
  }
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // ---- the board, drawn once ------------------------------------------------------------------------------------------
  var FONT = { '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#', '##', '.#', '.#', '.#'], '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'], '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'] };
  var boardImg = {};
  function board(photo) {
    var k = photo ? 'p' : 'n';
    if (boardImg[k]) return boardImg[k];
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    function put(px, py, col) { var i = (py * W + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    var CORK = [[122, 84, 50], [108, 72, 42], [134, 94, 58]], RING = [24, 20, 22];
    for (var py = 0; py < H; py++) for (var px = 0; px < W; px++) {
      var dx = (px + 0.5 - CX) / R, dy = (py + 0.5 - CY) / R, r = Math.sqrt(dx * dx + dy * dy);
      if (r > 1.3) { put(px, py, CORK[(px * 7 + py * 13 + ((px * py) % 5)) % 3]); continue; }   // the cork wall round it
      if (r > 1.0) { put(px, py, r > 1.27 ? [10, 8, 10] : RING); continue; }                       // the number ring
      var a = Math.atan2(dx, -dy) * 180 / Math.PI, i = Math.floor(((a + 9 + 360) % 360) / 18), even = i % 2 === 0;
      var col;
      if (r <= 0.05) col = [200, 40, 40];
      else if (r <= 0.1) col = [40, 140, 70];
      else if (r >= 0.92 || (r >= 0.55 && r <= 0.62)) col = even ? [196, 42, 42] : [38, 134, 68];
      else col = even ? [26, 22, 24] : [232, 218, 182];
      // the wire: a dark pixel where rings and segments meet
      var m = (((a + 9) % 18) + 18) % 18, edgeA = Math.min(m, 18 - m) * Math.PI / 180 * R * r < 0.5;
      if ([0.05, 0.1, 0.55, 0.62, 0.92].some(function (e) { return Math.abs(r - e) < 0.6 / R; }) || (r > 0.1 && edgeA)) col = [150, 150, 150];
      put(px, py, col);
    }
    x.putImageData(img, 0, 0);
    // the numbers round the ring
    x.fillStyle = '#e8e0cc';
    ORDER.forEach(function (n, j) {
      var ang = j * 18 * Math.PI / 180, s = String(n), w = s.split('').reduce(function (t, ch) { return t + FONT[ch][0].length + 1; }, -1);
      var nx = Math.round(CX + Math.sin(ang) * R * 1.135 - w / 2), ny = Math.round(CY - Math.cos(ang) * R * 1.135 - 2.5);
      s.split('').forEach(function (ch) { FONT[ch].forEach(function (row, yy) { for (var xx = 0; xx < row.length; xx++) if (row[xx] === '#') x.fillRect(nx + xx, ny + yy, 1, 1); }); nx += FONT[ch][0].length + 1; });
    });
    if (photo) {                                              // The Drip's: a photo of a man in a Halcyon suit, pinned to the bull
      x.fillStyle = '#d8d4c8'; x.fillRect(CX - 4, CY - 6, 9, 11);
      x.fillStyle = '#8a8478'; x.fillRect(CX - 3, CY - 5, 7, 9);
      x.fillStyle = '#e0c0a0'; x.fillRect(CX - 1, CY - 4, 3, 3);
      x.fillStyle = '#2a2c3a'; x.fillRect(CX - 2, CY - 1, 5, 4);
      x.fillStyle = '#e8e8f0'; x.fillRect(CX, CY - 1, 1, 2);
      x.fillStyle = '#d02a2a'; x.fillRect(CX, CY - 7, 1, 1);
    }
    return (boardImg[k] = c);
  }

  // ---- the game -------------------------------------------------------------------------------------------------------
  var g = null, el = null, cv = null, raf = 0;
  var SWEEP_X = 1300, SWEEP_Y = 1100;                        // ms for a crosshair to cross the board and back half
  function play(inter) {
    var B = BOARDS[has('BridgeWorld') ? BridgeWorld.getWorldId() : ''] || BOARDS['arcadia-dive'];
    BridgeInteractions.choose({
      title: 'Darts with ' + B.who,
      text: B.hi,
      rows: [{ label: 'A game for ' + B.stake, sub: B.stake + ' each: beat ' + B.who + '\'s three darts for ' + (B.stake * 2), note: B.stake + ' coins', pick: function () { start(B, B.stake); } },
             { label: 'Just a game', sub: 'for the fun of it', pick: function () { start(B, 0); } }],
      closeLabel: 'Not now'
    });
  }
  function start(B, stake) {
    var go = function () {
      g = { B: B, stake: stake, them: [], you: [], phase: 'them', t0: performance.now(), aim: null, log: '', over: null };
      open();
      theirTurn();
    };
    if (!stake) return go();
    if (!has('BridgeProgression') || !BridgeProgression.wagerCoins) return BridgeInteractions.say(B.label, 'THE PAYMENT WON\'T GO THROUGH RIGHT NOW.');
    BridgeProgression.wagerCoins(stake, 'casino:darts').then(function (r) {
      if (!r || !r.ok) return BridgeInteractions.say(B.label, 'YOU HAVEN\'T THE ' + stake + ' COINS. A GAME FOR NOTHING, THEN?');
      go();
    });
  }
  function total(list) { return list.reduce(function (t, d) { return t + d.s.n; }, 0); }
  // they throw: aiming at the treble 20, their hand as steady as their `skill` (how far a dart strays, in radii)
  function theirTurn() {
    var k = 0;
    g.log = g.B.who.toUpperCase() + ' STEPS UP TO THE OCHE.';
    var next = function () {
      if (!g || g.phase !== 'them') return;
      if (k >= 3) { g.phase = 'you'; g.shown = g.them.slice(); setTimeout(function () { if (!g) return; g.shown = []; yourTurn(); }, 1300); paint(); return; }
      var x = gauss() * g.B.skill, y = -0.585 + gauss() * g.B.skill, s = score(x, y);
      g.them.push({ x: x, y: y, s: s }); g.shown = g.them.slice();
      g.log = g.B.who.toUpperCase() + ': ' + s.label + '.';
      sfx(s.n ? 'thud' : 'error');
      k++; paint();
      setTimeout(next, 750);
    };
    paint();
    setTimeout(next, 700);
  }
  function yourTurn() {
    g.phase = 'aimx'; g.t0 = performance.now(); g.aim = { x: 0, y: 0 };
    g.log = 'YOUR THROW. ' + g.B.who.toUpperCase() + ' HAS ' + total(g.them) + ' TO BEAT.';
    loop();
  }
  function tri(t, period) { var u = (t / period) % 2; return u < 1 ? u : 2 - u; }   // 0..1..0
  function loop() {
    cancelAnimationFrame(raf);
    var step = function () {
      if (!g || (g.phase !== 'aimx' && g.phase !== 'aimy')) return;
      var t = performance.now() - g.t0;
      if (g.phase === 'aimx') g.aim.x = -1.1 + 2.2 * tri(t, SWEEP_X);
      else g.aim.y = -1.1 + 2.2 * tri(t, SWEEP_Y);
      paint();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function press() {
    if (!g) return;
    if (g.over) return again();
    if (g.phase === 'aimx') { g.phase = 'aimy'; g.t0 = performance.now(); g.aim.y = -1.1; sfx('click'); return; }
    if (g.phase === 'aimy') return throwAt(g.aim.x, g.aim.y, true);
  }
  function throwAt(ax, ay, wobble) {
    var x = ax + (wobble ? gauss() * 0.05 : 0), y = ay + (wobble ? gauss() * 0.05 : 0), s = score(x, y);
    g.you.push({ x: x, y: y, s: s });
    g.log = 'YOU: ' + s.label + '. ' + (s.n >= 50 ? 'THE BAR GOES QUIET.' : s.n >= 40 ? 'NICE.' : '');
    sfx(s.n ? 'thud' : 'error');
    if (g.you.length >= 3) return finish();
    g.phase = 'aimx'; g.t0 = performance.now(); g.aim = { x: 0, y: 0 };
    paint(); loop();
  }
  function finish() {
    var a = total(g.you), b = total(g.them), won = a > b, level = a === b;
    g.phase = 'done';
    g.over = { won: won, level: level, you: a, them: b };
    cancelAnimationFrame(raf);
    var pot = g.stake * 2;
    if (g.stake && has('BridgeProgression') && BridgeProgression.awardCoins) {
      if (won) BridgeProgression.awardCoins(pot, 'casino:darts-won');
      else if (level) BridgeProgression.awardCoins(g.stake, 'casino:darts-back');
    }
    sfx(won ? 'coin' : level ? 'click' : 'error');
    g.log = (won ? 'YOU WIN, ' + a + ' TO ' + b + '.' + (g.stake ? ' +' + pot + ' COINS.' : '') : level ? 'LEVEL AT ' + a + '.' + (g.stake ? ' STAKES BACK.' : '') : g.B.who.toUpperCase() + ' WINS, ' + b + ' TO ' + a + '.') +
      ' ' + g.B.who.toUpperCase() + ': "' + (won ? g.B.win : level ? g.B.draw : g.B.lose) + '"';
    paint();
  }
  function again() { var B = g.B, st = g.stake; close(); start(B, st); }

  // ---- the panel ------------------------------------------------------------------------------------------------------
  function open() {
    if (!el) {
      el = document.createElement('div');
      el.id = 'darts';
      el.innerHTML = '<div class="dt-panel"><div class="dt-head"><span class="dt-title">Darts</span><span class="dt-pot"></span>' +
        '<button class="qj-close dt-close" aria-label="Leave the board"><span class="ip-key">Esc</span></button></div>' +
        '<canvas class="dt-board"></canvas>' +
        '<div class="dt-score"><div class="dt-side dt-them"><canvas width="32" height="32"></canvas><span><span class="dt-name"></span><br><span class="dt-darts"></span></span><b>0</b></div>' +
        '<div class="dt-side dt-you"><span><span>You</span><br><span class="dt-darts"></span></span><b>0</b></div></div>' +
        '<div class="dt-log"></div>' +
        '<div class="dt-controls"><button class="dt-throw" data-a="throw">Throw</button><button data-a="leave">Leave</button></div>' +
        '<div class="dt-help">Stop the line across, then the line down: the dart goes where they cross. <span class="dt-keys">Space throw · Esc leave</span></div></div>';
      document.body.appendChild(el);
      cv = el.querySelector('.dt-board'); cv.width = W; cv.height = H;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (b && b.classList.contains('dt-close')) return close();
        if (b && b.dataset.a === 'leave') return close();
        if (b && b.dataset.a === 'throw') return press();
      });
      cv.addEventListener('pointerdown', function (e) { e.preventDefault(); press(); });
    }
    el.classList.add('visible');
    el.querySelector('.dt-title').textContent = 'Darts with ' + g.B.who;
    var face = el.querySelector('.dt-them canvas');
    if (has('BridgeLook') && BridgeLook.npcFace) BridgeLook.npcFace(face, g.B.sheet, {});
    el.querySelector('.dt-name').textContent = g.B.who;
    if (has('BridgeControls')) BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    paint();
  }
  function close() {
    cancelAnimationFrame(raf);
    if (el) el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    if (has('BridgeControls')) BridgeControls.enable();
    g = null;
  }
  function onKey(e) {
    if (!g) return;
    e.stopPropagation();
    var k = e.key;
    if (k === 'Escape') { e.preventDefault(); return close(); }
    if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') { e.preventDefault(); if (!e.repeat) press(); }
  }
  function dart(c, d, col) {
    var px = Math.round(CX + d.x * R), py = Math.round(CY + d.y * R);
    c.fillStyle = '#0a0a0a'; c.fillRect(px - 1, py - 1, 3, 3);
    c.fillStyle = '#c8c8d0'; c.fillRect(px, py - 4, 1, 4);        // the barrel, toward you and up
    c.fillStyle = col; c.fillRect(px - 2, py - 7, 5, 3); c.fillRect(px - 1, py - 8, 3, 1);
  }
  function paint() {
    if (!el || !g) return;
    var c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(board(g.B.photo), 0, 0);
    (g.phase === 'them' || g.phase === 'you' ? g.shown || [] : []).forEach(function (d) { dart(c, d, '#3a8ad8'); });
    if (g.phase !== 'them' && g.phase !== 'you') g.you.forEach(function (d) { dart(c, d, '#e8a030'); });
    if (g.phase === 'aimx' || g.phase === 'aimy') {
      var ax = Math.round(CX + g.aim.x * R), ay = Math.round(CY + g.aim.y * R);
      c.fillStyle = g.phase === 'aimx' ? 'rgba(255,240,140,0.95)' : 'rgba(255,240,140,0.55)';
      c.fillRect(ax, 0, 1, H);
      if (g.phase === 'aimy') { c.fillStyle = 'rgba(255,240,140,0.95)'; c.fillRect(0, ay, W, 1); c.fillStyle = '#fff'; c.fillRect(ax - 1, ay - 1, 3, 3); }
    }
    el.querySelector('.dt-pot').textContent = g.stake ? 'POT ' + (g.stake * 2) + ' COINS' : 'FOR FUN';
    var sides = el.querySelectorAll('.dt-side');
    sides[0].classList.toggle('turn', g.phase === 'them');
    sides[1].classList.toggle('turn', g.phase === 'aimx' || g.phase === 'aimy');
    sides[0].querySelector('b').textContent = total(g.them);
    sides[1].querySelector('b').textContent = total(g.you);
    sides[0].querySelector('.dt-darts').textContent = g.them.map(function (d) { return d.s.label; }).join(' · ') || ' ';
    sides[1].querySelector('.dt-darts').textContent = g.you.map(function (d) { return d.s.label; }).join(' · ') || ' ';
    el.querySelector('.dt-log').textContent = g.log;
    var tb = el.querySelector('.dt-throw');
    tb.textContent = g.over ? 'Again' : g.phase === 'aimy' ? 'Throw' : 'Stop';
    tb.disabled = !(g.over || g.phase === 'aimx' || g.phase === 'aimy');
  }

  function init() { if (has('BridgeInteractions') && BridgeInteractions.register) BridgeInteractions.register('darts', play, 'Play'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return { play: play, score: score, BOARDS: BOARDS, ORDER: ORDER, _g: function () { return g; }, _close: close,
           _throw: function (x, y) { if (g && (g.phase === 'aimx' || g.phase === 'aimy')) throwAt(x, y, false); },
           _skip: function () { if (g && g.phase === 'them') { while (g.them.length < 3) { var x = gauss() * g.B.skill, y = -0.585 + gauss() * g.B.skill; g.them.push({ x: x, y: y, s: score(x, y) }); } g.phase = 'you'; g.shown = []; yourTurn(); } } };
})();
