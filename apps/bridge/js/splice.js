/**
 * BridgeSplice — NULL's jobs: splice a feed through a junction box before
 * the trace finds you (the rig in NULL's den, an interaction of type
 * 'splice').
 *
 * A grid of junctions, each a piece of pipe — an end, a straight, a bend, a
 * tee. Tap one (or move with the arrows and press E) to turn it a quarter.
 * The feed comes in on the left at the tap and has to reach the screen on
 * the right; every junction it flows through lights up. Under the clock:
 * finish before the trace bar runs out. Every grid is a random spanning
 * tree over all the cells, so there's always a way through, then each
 * piece is turned at random.
 *
 * Jobs get bigger as you clear them (5×5 up to 7×7) and pay coins, up to
 * five paid jobs a day; after that the rig still runs, for the practice.
 * Progress lives in localStorage (bridge_splice).
 */
var BridgeSplice = (function () {
  var KEY = 'bridge_splice';
  var PAID_PER_DAY = 5;
  var N = 1, E = 2, S = 4, W = 8;
  var DIRS = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];

  var save = { level: 0, day: '', paid: 0, best: {} };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }

  var el = null, cv = null, ctx = null;
  var game = null, raf = 0;

  function rot(m) { return ((m << 1) | (m >> 3)) & 15; }
  function today() { return new Date().toDateString(); }
  function paidLeft() {
    if (save.day !== today()) { save.day = today(); save.paid = 0; store(); }
    return Math.max(0, PAID_PER_DAY - save.paid);
  }

  // ---- a puzzle --------------------------------------------------------------------------------
  function generate(n) {
    var cells = [], i, x, y;
    for (i = 0; i < n * n; i++) cells.push(0);
    // randomized depth-first spanning tree
    var seen = [], stack = [[Math.floor(Math.random() * n), Math.floor(Math.random() * n)]];
    seen[stack[0][1] * n + stack[0][0]] = true;
    while (stack.length) {
      var c = stack[stack.length - 1];
      var opts = DIRS.filter(function (d) {
        var nx = c[0] + d[1], ny = c[1] + d[2];
        return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx];
      });
      if (!opts.length) { stack.pop(); continue; }
      var d = opts[Math.floor(Math.random() * opts.length)];
      var nx = c[0] + d[1], ny = c[1] + d[2];
      cells[c[1] * n + c[0]] |= d[0];
      cells[ny * n + nx] |= d[3];
      seen[ny * n + nx] = true;
      stack.push([nx, ny]);
    }
    var src = Math.floor(Math.random() * n), dst = Math.floor(Math.random() * n);
    cells[src * n] |= W;
    cells[dst * n + n - 1] |= E;
    var solution = cells.slice();
    var turned = cells.map(function (m) {
      var k = Math.floor(Math.random() * 4);
      for (var t = 0; t < k; t++) m = rot(m);
      return m;
    });
    var g = { n: n, cells: turned, solution: solution, src: src, dst: dst };
    if (flow(g).done) return generate(n);          // never hand over a solved board
    return g;
  }

  // which junctions the feed reaches, and whether it gets to the screen
  function flow(g) {
    var n = g.n, lit = [], q = [];
    if (g.cells[g.src * n] & W) { lit[g.src * n] = true; q.push([0, g.src]); }
    while (q.length) {
      var c = q.shift(), m = g.cells[c[1] * n + c[0]];
      DIRS.forEach(function (d) {
        if (!(m & d[0])) return;
        var nx = c[0] + d[1], ny = c[1] + d[2];
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) return;
        var j = ny * n + nx;
        if (lit[j] || !(g.cells[j] & d[3])) return;
        lit[j] = true;
        q.push([nx, ny]);
      });
    }
    var last = g.dst * n + n - 1;
    return { lit: lit, done: !!(lit[last] && (g.cells[last] & E)) };
  }

  // ---- drawing -----------------------------------------------------------------------------------
  function cellPx() {
    var vw = window.innerWidth, vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    return Math.max(34, Math.min(64, Math.floor((Math.min(vw - 60, vh - 230)) / (game.g.n + 1))));
  }

  function draw(now) {
    if (!game) return;
    var g = game.g, n = g.n, cs = game.cs, pad = Math.round(cs / 2), dpr = window.devicePixelRatio || 1;
    var W2 = n * cs + pad * 2, H2 = n * cs;
    if (cv.width !== Math.round(W2 * dpr)) {
      cv.width = Math.round(W2 * dpr); cv.height = Math.round(H2 * dpr);
      cv.style.width = W2 + 'px'; cv.style.height = H2 + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W2, H2);
    var f = game.flow, pulse = 0.75 + 0.25 * Math.sin(now / 180);
    var lw = Math.max(5, Math.round(cs * 0.2));
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var i = y * n + x, m = g.cells[i], X = pad + x * cs, Y = y * cs, cx = X + cs / 2, cy = Y + cs / 2;
        ctx.fillStyle = (x + y) % 2 ? '#120e1e' : '#16122a';
        ctx.fillRect(X + 1, Y + 1, cs - 2, cs - 2);
        if (game.cursor && game.cursor[0] === x && game.cursor[1] === y && game.keys) {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
          ctx.strokeRect(X + 3, Y + 3, cs - 6, cs - 6);
        }
        var on = f.lit[i];
        var spin = game.spin[i] ? Math.max(0, 1 - (now - game.spin[i]) / 120) : 0;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-spin * Math.PI / 2);
        ctx.strokeStyle = on ? (f.done ? '#80ffb0' : 'rgba(96,232,240,' + pulse + ')') : '#4a3a6a';
        ctx.lineWidth = lw;
        ctx.lineCap = 'square';
        if (on) { ctx.shadowColor = f.done ? '#40ff90' : '#40e0e8'; ctx.shadowBlur = 10; }
        DIRS.forEach(function (d) {
          if (!(m & d[0])) return;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(d[1] * cs / 2, d[2] * cs / 2); ctx.stroke();
        });
        ctx.shadowBlur = 0;
        ctx.fillStyle = on ? '#c8fcff' : '#5a4a7a';
        var hub = [1, 2, 4, 8].indexOf(m) >= 0 ? lw * 1.1 : lw * 0.75;
        ctx.fillRect(-hub, -hub, hub * 2, hub * 2);
        ctx.restore();
      }
    }
    // the tap and the screen
    var sy = g.src * cs + cs / 2, ty = g.dst * cs + cs / 2;
    ctx.fillStyle = '#e040c0';
    ctx.fillRect(0, sy - lw * 1.4, pad - 2, lw * 2.8);
    ctx.fillStyle = f.done ? '#40ff90' : '#2a6a4a';
    ctx.fillRect(pad + n * cs + 2, ty - lw * 1.6, pad - 2, lw * 3.2);
  }

  function frame(now) {
    if (!game) return;
    if (game.state === 'play') {
      var left = game.ends - now;
      game.bar.style.width = Math.max(0, left / game.limit * 100) + '%';
      game.bar.classList.toggle('low', left < 8000);
      if (left <= 0) lose();
    }
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  // ---- play -----------------------------------------------------------------------------------------
  function turn(x, y) {
    if (!game || game.state !== 'play') return;
    var g = game.g, i = y * g.n + x;
    g.cells[i] = rot(g.cells[i]);
    game.spin[i] = performance.now();
    game.cursor = [x, y];
    game.flow = flow(g);
    if (game.flow.done) win();
  }

  function size() { return Math.min(7, 5 + Math.floor(save.level / 2)); }

  function start() {
    var n = size();
    game = game || {};
    game.g = generate(n);
    game.flow = flow(game.g);
    game.spin = [];
    game.cursor = [0, game.g.src];
    game.limit = (40 + (n - 5) * 18) * 1000;
    game.ends = performance.now() + game.limit;
    game.state = 'play';
    game.cs = cellPx();
    el.querySelector('.sp-job').textContent = 'Job ' + (save.level + 1) + ' · ' + n + '×' + n;
    status(paidLeft() ? 'Pays ' + pay() + ' coins. ' + paidLeft() + ' paid job' + (paidLeft() === 1 ? '' : 's') + ' left tonight.'
                      : 'No more paid jobs tonight. The rig runs anyway.');
    el.querySelector('.sp-again').style.display = 'none';
  }

  function pay() { return 30 + save.level * 10; }

  function status(t) { el.querySelector('.sp-status').textContent = t; }

  function win() {
    game.state = 'won';
    var secs = Math.round((performance.now() - (game.ends - game.limit)) / 100) / 10;
    var n = game.g.n;
    if (!save.best[n] || secs < save.best[n]) save.best[n] = secs;
    var coins = paidLeft() ? pay() : 0;
    save.level += 1;
    if (coins) save.paid += 1;
    store();
    status('SPLICED in ' + secs + 's.' + (coins ? ' +' + coins + ' coins from Vex.' : '') + ' Best ' + n + '×' + n + ': ' + save.best[n] + 's.');
    if (coins) {
      var paid = typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins
        ? BridgeProgression.awardCoins(coins, 'job:splice') : Promise.resolve(null);
      paid.then(function (bal) {
        if (bal !== null && bal !== undefined) return;
        save.paid = Math.max(0, save.paid - 1);         // didn't land: that job doesn't count against tonight's five
        store();
        if (game && game.state === 'won') status('SPLICED in ' + secs + 's. Vex couldn\'t pay out just now - no connection.');
      }, function () {});
    }
    var again = el.querySelector('.sp-again');
    again.textContent = 'Next job';
    again.style.display = '';
  }

  function lose() {
    game.state = 'lost';
    status('TRACE CAUGHT UP. Job blown - nobody got paid.');
    var again = el.querySelector('.sp-again');
    again.textContent = 'Try again';
    again.style.display = '';
  }

  function onKey(e) {
    if (!game) return;
    var k = e.key, c = game.cursor, n = game.g.n;
    var mv = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k];
    if (k === 'Escape') { close(); }
    else if (mv) { game.keys = true; game.cursor = [Math.max(0, Math.min(n - 1, c[0] + mv[0])), Math.max(0, Math.min(n - 1, c[1] + mv[1]))]; }
    else if (k === 'e' || k === 'E' || k === ' ' || k === 'Enter') {
      if (game.state === 'play') { game.keys = true; turn(c[0], c[1]); } else start();
    } else return;
    e.preventDefault(); e.stopPropagation();
  }

  function onPointer(e) {
    if (!game) return;
    var r = cv.getBoundingClientRect(), pad = Math.round(game.cs / 2);
    var x = Math.floor((e.clientX - r.left - pad) / game.cs), y = Math.floor((e.clientY - r.top) / game.cs);
    if (x < 0 || y < 0 || x >= game.g.n || y >= game.g.n) return;
    e.preventDefault();
    game.keys = false;
    turn(x, y);
  }

  function open() {
    if (!el) {
      el = document.createElement('div');
      el.id = 'splice';
      el.innerHTML = '<div class="sp-panel">' +
        '<div class="sp-head"><span class="sp-title">Splice</span><span class="sp-job"></span>' +
        '<button class="qj-close sp-close" aria-label="Close"><span class="ip-key">Esc</span></button></div>' +
        '<div class="sp-brief">Get the feed from the tap to the screen. Turn a junction by tapping it' +
        '<span class="sp-keys"> (or arrows and E)</span>.</div>' +
        '<div class="sp-trace"><span>Trace</span><div class="sp-bar"><div class="sp-fill"></div></div></div>' +
        '<canvas class="sp-grid"></canvas>' +
        '<div class="sp-status"></div><button class="sp-again"></button></div>';
      document.body.appendChild(el);
      cv = el.querySelector('.sp-grid');
      ctx = cv.getContext('2d');
      cv.addEventListener('pointerdown', onPointer);
      el.querySelector('.sp-close').addEventListener('click', close);
      el.querySelector('.sp-again').addEventListener('click', start);
      el.addEventListener('click', function (e) { if (e.target === el) close(); });
    }
    game = { bar: el.querySelector('.sp-fill') };
    start();
    el.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function close() {
    if (!el || !el.classList.contains('visible')) return;
    el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    cancelAnimationFrame(raf);
    game = null;
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  return { open: open, close: close, level: function () { return save.level; },
           _generate: generate, _flow: flow, _board: function () { return game && game.g; } };
})();
