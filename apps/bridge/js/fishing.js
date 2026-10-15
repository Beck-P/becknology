/**
 * BridgeFishing — fishing off Lumar's piers (interactions of type 'fish',
 * added from assets/fishing.json as a world loads).
 *
 * Hold to cast (let go at the top of the swing to cast far — far casts find
 * the rarer fish), wait for the bobber to go under, strike, then reel: hold
 * to lift the catch zone, let go to drop it, and keep the fish inside it
 * until the line's full. Each spot draws from its island's pool: silverfin
 * everywhere, bluefin and rays off Sapphire, shrimp in Rose Cove, ember
 * snappers and coins from the Heron off Crimson, moon eels round Midnight —
 * and star pearls in the moon pool; perch and the odd sun carp in the farm pond
 * on Verdance, char and frostfin through the ice on Fellhaven's pond. Old boots.
 * Messages in bottles.
 *
 * What you've caught (how many, the biggest) and the messages you've read
 * are kept in localStorage (bridge_fish) and listed in the journal.
 */
var BridgeFishing = (function () {
  var KEY = 'bridge_fish';
  var ZONE = 0.32;                   // the catch zone's height on the reel
  var POOLS = {
    harbour:  [['silverfin', 50], ['spore_minnow', 25], ['harbour_crab', 10], ['old_boot', 10], ['bottle', 5]],
    sapphire: [['silverfin', 30], ['bluefin', 30], ['glowtail', 10], ['sapphire_ray', 10], ['old_boot', 10], ['bottle', 10]],
    rose:     [['silverfin', 30], ['rose_shrimp', 35], ['glowtail', 15], ['old_boot', 10], ['bottle', 10]],
    crimson:  [['ember_snapper', 35], ['silverfin', 25], ['heron_coin', 15], ['old_boot', 15], ['bottle', 10]],
    midnight: [['glowtail', 30], ['silverfin', 25], ['moon_eel', 20], ['old_boot', 10], ['bottle', 15]],
    moonpool: [['moon_eel', 50], ['glowtail', 35], ['star_pearl', 15]],
    pond:     [['pond_perch', 60], ['sun_carp', 12], ['old_boot', 20], ['bottle', 8]],
    ice:      [['arctic_char', 62], ['frostfin', 18], ['old_boot', 20]]
  };
  // how each one fights on the line: speed it darts, how wild, the sizes it comes in (cm)
  var FIGHT = {
    silverfin: [0.8, 0.25, 18, 34], spore_minnow: [1.1, 0.4, 6, 12], harbour_crab: [0.5, 0.15, 10, 22],
    rose_shrimp: [1.0, 0.35, 8, 16], bluefin: [1.3, 0.45, 40, 90], glowtail: [1.2, 0.6, 20, 40],
    ember_snapper: [1.1, 0.4, 30, 60], sapphire_ray: [0.9, 0.3, 50, 110], moon_eel: [1.6, 0.7, 60, 140],
    star_pearl: [1.8, 0.8, 1, 2], pond_perch: [0.7, 0.25, 12, 28], sun_carp: [1.2, 0.55, 30, 70], arctic_char: [0.9, 0.35, 25, 60], frostfin: [1.4, 0.6, 8, 16], old_boot: [0.25, 0.0, 26, 31], heron_coin: [0.3, 0.05, 3, 4], bottle: [0.35, 0.05, 20, 30]
  };
  var BOTTLES = [
    "IF YOU FIND THIS, I AM STILL ON THE STACK OFF CRIMSON. BRING ROPE. - H.M.",
    "TO WHOEVER IS LISTENING AT THE MOON POOL: WE HEAR YOU TOO.",
    "GRAN WILDE'S FISH PIE: FISH. PIE. TELL NOBODY.",
    "DAY FORTY ON THE ROCK. THE CRAB AND I HAVE COME TO AN UNDERSTANDING.",
    "E.B. WAS HERE. THE SEA WAS GREEN AND I WAS NOT AFRAID.",
    "WHOEVER TOOK MY BOOT: I HAVE THE OTHER ONE. WE CAN WORK SOMETHING OUT.",
    "THE DRAGON IS NOT ANGRY. THE DRAGON IS WAITING. THERE IS A DIFFERENCE.",
    "IF THE SPORES GLOW BRIGHTER TONIGHT, SOMETHING IS COMING UP FROM THE DEEP. GO INSIDE.",
    "THE ROSE COVE WINDMILL CHIMES IN A PATTERN. IT ISN'T RANDOM. IT'S A NAME.",
    "I THREW THIS IN THE SEA AT ARCADIA. HOW DID IT GET HERE?",
    "BRAM - I'LL COME BACK FOR YOU. KEEP THE CORNER WARM. - E.",
    "THE SEA REMEMBERS EVERY SHIP THAT CROSSES IT. SOME NIGHTS IT SAYS THEIR NAMES."
  ];

  var log = { caught: {}, bottles: [], casts: 0 };
  try { log = Object.assign(log, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) { /* private mode */ } }

  var spots = null;
  fetch('/bridge/assets/fishing.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { spots = d; }).catch(function () { spots = {}; });

  // fishing spots join the world's interactions as it loads
  function decorate(worldId, data) {
    (spots && spots[worldId] || []).forEach(function (s) {
      data.interactions.push({ x: s.x, y: s.y, type: 'fish', label: s.label || 'OFF THE PIER', prompt: 'PRESS E TO FISH', pool: s.pool });
    });
  }

  // ---- the panel -----------------------------------------------------------------------------------
  var el = null, cv = null, ctx = null, raf = 0, st = null, held = false;
  var W = 420, H = 150;

  function name(id) {
    if (id === 'bottle') return 'Message in a bottle';
    var it = typeof BridgeItems !== 'undefined' && BridgeItems.get(id);
    return it ? it.name : id;
  }

  function pick(pool, power) {
    var list = (POOLS[pool] || POOLS.harbour).map(function (e) { return [e[0], e[1] <= 15 && power > 0.7 ? e[1] * 1.6 : e[1]]; });
    var total = list.reduce(function (a, e) { return a + e[1]; }, 0), r = Math.random() * total;
    for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[0][0];
  }

  function set(phase, extra) {
    st.phase = phase; st.t0 = performance.now();
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx({ wait: 'splash', bite: 'plop', caught: 'catch', lost: 'fail' }[phase]);
    if (extra) Object.keys(extra).forEach(function (k) { st[k] = extra[k]; });
    var hint = { ready: 'Hold to cast', charge: 'Let go to cast', wait: 'Wait for a bite…', bite: 'Strike!', reel: 'Hold to lift, let go to drop - keep it in the zone',
                 caught: 'Again: hold to cast · Esc to stop', lost: 'Hold to cast again · Esc to stop' }[phase] || '';
    el.querySelector('.fi-hint').textContent = hint;
  }

  function press() {
    held = true;
    if (!st) return;
    if (st.phase === 'ready' || st.phase === 'caught' || st.phase === 'lost') set('charge');
    else if (st.phase === 'bite') hook();
    else if (st.phase === 'wait') { set('lost', { msg: 'Too soon - you pulled it out of the water.' }); }
  }

  function release() {
    held = false;
    if (st && st.phase === 'charge') {
      var t = (performance.now() - st.t0) / 1200;
      var power = 1 - Math.abs((t % 2) - 1);              // the swing goes up and down; let go near the top
      log.casts += 1; store();
      set('wait', { power: power, wait: 1500 + Math.random() * 3500, nibbles: [] });
      var n = Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) st.nibbles.push(400 + Math.random() * (st.wait - 600));
    }
  }

  function hook() {
    var id = pick(st.pool, st.power), f = FIGHT[id] || FIGHT.silverfin;
    set('reel', { catchId: id, fight: f, zone: 0.1, zv: 0, fish: 0.5, ft: 0.5, progress: 0.32, last: performance.now() });
  }

  function land() {
    var id = st.catchId, f = st.fight;
    var size = Math.round(f[2] + Math.pow(Math.random(), 1.6) * (f[3] - f[2]));
    var msg;
    if (id === 'bottle') {
      var unread = BOTTLES.map(function (b, i) { return i; }).filter(function (i) { return log.bottles.indexOf(i) < 0; });
      var k = unread.length ? unread[Math.floor(Math.random() * unread.length)] : Math.floor(Math.random() * BOTTLES.length);
      if (log.bottles.indexOf(k) < 0) log.bottles.push(k);
      msg = '“' + BOTTLES[k] + '”';
    } else {
      var c = log.caught[id] || (log.caught[id] = { n: 0, best: 0 });
      c.n += 1;
      var best = !FIGHT[id] || ['old_boot', 'heron_coin', 'star_pearl'].indexOf(id) >= 0 ? false : size > c.best;
      if (best) c.best = size;
      var kept = typeof BridgeInventory !== 'undefined' ? BridgeInventory.addItem(id, 1) : true;
      msg = (['old_boot', 'heron_coin', 'star_pearl'].indexOf(id) >= 0 ? '' : size + ' cm' + (best && c.n > 1 ? ' - your biggest yet! ' : '. ')) +
            (kept === false ? 'No room in your pack, so you let it go.' : 'Into your pack.');
    }
    store();
    set('caught', { result: id, msg: msg });
  }

  function frame(now) {
    if (!st) return;
    var dt = Math.min(0.05, (now - (st.lastFrame || now)) / 1000);
    st.lastFrame = now;
    var e = now - st.t0;
    if (st.phase === 'wait') {
      if (e > st.wait) set('bite', { window: 850 });
    } else if (st.phase === 'bite') {
      if (e > st.window) set('lost', { msg: 'It got away.' });
    } else if (st.phase === 'reel') {
      var f = st.fight;
      // the fish darts toward a target that keeps moving
      if (Math.random() < dt * (0.6 + f[1] * 3)) st.ft = Math.max(0.05, Math.min(0.95, st.ft + (Math.random() - 0.5) * (0.4 + f[1])));
      st.fish += (st.ft - st.fish) * Math.min(1, dt * f[0] * 2.2);
      // tuned for a calm game: commons nearly always land, moon eels and pearls make you work
      st.zv += (held ? 1.6 : -1.4) * dt;
      st.zv = Math.max(-0.8, Math.min(0.8, st.zv));
      st.zone += st.zv * dt;
      if (st.zone < 0) { st.zone = 0; st.zv = Math.max(0, -st.zv * 0.3); }
      if (st.zone > 1 - ZONE) { st.zone = 1 - ZONE; st.zv = Math.min(0, -st.zv * 0.3); }
      var inside = st.fish >= st.zone && st.fish <= st.zone + ZONE;
      st.progress += (inside ? 0.4 : -0.2 * (0.6 + f[0] * 0.4)) * dt;
      if (st.progress >= 1) land();
      else if (st.progress <= 0) set('lost', { msg: 'The line goes slack.' });
    }
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function draw(now) {
    var dpr = window.devicePixelRatio || 1;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the spore sea at night - or, on Verdance, a farm pond in the afternoon sun, lily pads and glints
    var pond = st.pool === 'pond', ice = st.pool === 'ice';
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, ice ? '#1a3a5a' : pond ? '#3a7a70' : '#0c2a26'); g.addColorStop(1, ice ? '#08182a' : pond ? '#18403a' : '#06120f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (pond) {
      [[70, 40, 9], [210, 96, 12], [330, 30, 8], [400, 110, 10]].forEach(function (l, j) {
        var lx = (l[0] + Math.sin(now / 2400 + j) * 3) % W;
        ctx.fillStyle = '#2a6a2a'; ctx.beginPath(); ctx.ellipse(lx, l[1], l[2], l[2] * 0.55, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(lx, l[1]); ctx.fill();
        ctx.fillStyle = '#4a9a3a'; ctx.fillRect(Math.round(lx - l[2] * 0.6), Math.round(l[1] - 1), Math.round(l[2] * 0.5), 1);
        if (j === 1) { ctx.fillStyle = '#f0b0d0'; ctx.fillRect(Math.round(lx + 2), Math.round(l[1] - 3), 3, 3); }
      });
    }
    for (var i = 0; i < 26; i++) {
      var sx = (i * 73 + now * 0.006 * (1 + i % 3)) % W, sy = 20 + (i * 37) % (H - 30) + Math.sin(now / 900 + i) * 3;
      ctx.fillStyle = (ice ? 'rgba(190,230,255,' : pond ? 'rgba(255,250,220,' : 'rgba(96,240,192,') + (0.15 + 0.2 * Math.abs(Math.sin(now / 700 + i))).toFixed(2) + ')';
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, pond ? 1 : 2);
    }
    if (ice) {                                                   // under the ice: the hole's bright ring above, bubbles rising
      ctx.fillStyle = 'rgba(200,235,255,0.18)'; ctx.fillRect(0, 0, W, 10);
      ctx.fillStyle = 'rgba(230,245,255,0.5)'; ctx.fillRect(0, 9, W, 1);
    }
    for (var w = 0; w < 5; w++) {
      ctx.fillStyle = 'rgba(160,230,210,0.08)';
      ctx.fillRect(Math.round((w * 97 + now * 0.01) % W), 30 + w * 22, 40, 1);
    }
    var ph = st.phase, e = now - st.t0;
    // the rod tip, top left, and where the bobber sits
    var tipX = 26, tipY = 14;
    var dist = st.power != null ? 120 + st.power * 190 : 0;
    var bx = 60 + dist, by = 78;
    if (ph === 'charge') {
      var t = (e / 1200), p = 1 - Math.abs((t % 2) - 1);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(14, H - 22, 160, 10);
      ctx.fillStyle = p > 0.7 ? '#ffe080' : '#60f0c0'; ctx.fillRect(14, H - 22, Math.round(160 * p), 10);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.strokeRect(14 + 112, H - 22, 48, 10);
    }
    if (ph === 'wait' || ph === 'bite' || ph === 'reel') {
      var dip = 0;
      if (ph === 'wait') st.nibbles.forEach(function (n) { if (e > n && e < n + 260) dip = 3; });
      if (ph === 'bite') dip = 7 + Math.sin(e / 40) * 2;
      if (ph === 'reel') { bx = 60 + dist * (1 - st.progress * 0.6); dip = 4 + Math.sin(now / 60) * 3; }
      ctx.strokeStyle = 'rgba(230,230,210,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo((tipX + bx) / 2, by - 10, bx, by + dip); ctx.stroke();
      ctx.fillStyle = '#e8e8e0'; ctx.fillRect(bx - 3, by + dip - 6, 6, 4);
      ctx.fillStyle = '#d83030'; ctx.fillRect(bx - 3, by + dip - 2, 6, 4);
      ctx.strokeStyle = 'rgba(160,240,220,' + (0.5 - (now % 1200) / 2400).toFixed(2) + ')';
      ctx.strokeRect(Math.round(bx - 8 - (now % 1200) / 60), by + 4, Math.round(16 + (now % 1200) / 30), 1);
      if (ph === 'bite') {
        ctx.fillStyle = '#ffe080'; ctx.font = 'bold 22px "Pixelify Sans", monospace';
        ctx.fillText('!', bx - 4, by - 14);
      }
    }
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(tipX, tipY); ctx.stroke();
    if (ph === 'reel') {
      // the reel: a tall bar on the right, the zone, the fish, the line filling
      var rx = W - 46, ry = 10, rh = H - 20, rw = 18;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(rx - 4, ry - 4, rw + 26, rh + 8);
      ctx.fillStyle = '#10302a'; ctx.fillRect(rx, ry, rw, rh);
      var zy = ry + rh * (1 - st.zone - ZONE);
      ctx.fillStyle = 'rgba(96,240,192,0.45)'; ctx.fillRect(rx, Math.round(zy), rw, Math.round(rh * ZONE));
      var fy = ry + rh * (1 - st.fish);
      ctx.fillStyle = '#ffe080'; ctx.fillRect(rx + 4, Math.round(fy) - 3, rw - 8, 6);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(rx + rw + 6, ry, 8, rh);
      ctx.fillStyle = st.progress > 0.66 ? '#80ffb0' : st.progress > 0.33 ? '#ffe080' : '#ff8060';
      ctx.fillRect(rx + rw + 6, Math.round(ry + rh * (1 - st.progress)), 8, Math.round(rh * st.progress));
    }
    var res = el.querySelector('.fi-result');
    if (ph === 'caught' || ph === 'lost') {
      if (res.getAttribute('data-for') !== String(st.t0)) {
        res.setAttribute('data-for', String(st.t0));
        res.innerHTML = '';
        if (ph === 'caught') {
          var ic = document.createElement('canvas'); ic.width = 48; ic.height = 48; ic.className = 'fi-icon';
          var it = st.result !== 'bottle' && typeof BridgeItems !== 'undefined' && BridgeItems.get(st.result);
          var ix = ic.getContext('2d'); ix.imageSmoothingEnabled = false;
          if (it && it.draw) it.draw(ix, 0, 0, 48);
          else { ix.fillStyle = '#4aa880'; ix.fillRect(18, 8, 12, 32); ix.fillStyle = '#e8e0c8'; ix.fillRect(20, 14, 8, 14); ix.fillStyle = '#8a6a40'; ix.fillRect(21, 4, 6, 5); }
          res.appendChild(ic);
        }
        var tx = document.createElement('div'); tx.className = 'fi-text';
        tx.innerHTML = (ph === 'caught' ? '<b>' + esc(name(st.result)) + '</b><br>' : '') + esc(st.msg || '');
        res.appendChild(tx);
      }
      res.style.display = '';
    } else res.style.display = 'none';
  }

  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'keydown' && !e.repeat) press();
      if (e.type === 'keyup') release();
    }
  }

  function open(inter) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'fishing';
      el.innerHTML = '<div class="fi-head"><span class="fi-title">Fishing</span><span class="fi-hint"></span>' +
        '<button class="qj-close fi-close" aria-label="Close"><span class="ip-key">Esc</span></button></div>' +
        '<canvas class="fi-water"></canvas><div class="fi-result" style="display:none"></div>';
      document.body.appendChild(el);
      cv = el.querySelector('.fi-water'); ctx = cv.getContext('2d');
      cv.style.width = '100%';
      var down = function (e) { e.preventDefault(); press(); };
      var up = function (e) { e.preventDefault(); release(); };
      cv.addEventListener('pointerdown', down);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', function () { if (held) release(); });
      el.querySelector('.fi-close').addEventListener('click', close);
    }
    st = { pool: (inter && inter.pool) || 'harbour' };
    held = false;
    set('ready');
    el.classList.add('visible');
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKey, true);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function close() {
    if (!el || !el.classList.contains('visible')) return;
    el.classList.remove('visible');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKey, true);
    cancelAnimationFrame(raf);
    st = null;
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  // for the journal: what you've caught, the messages you've read
  function journal() {
    return {
      fish: Object.keys(log.caught).map(function (id) { return { name: name(id), n: log.caught[id].n, best: log.caught[id].best }; }),
      bottles: log.bottles.map(function (i) { return BOTTLES[i]; })
    };
  }

  return { decorate: decorate, open: open, close: close, journal: journal, _state: function () { return st; } };
})();
