/**
 * BridgeSki — downhill on Hoarfell: three runs from the top of the chairlift
 * down to Fellhaven.
 *
 * Top-down, the slope scrolling up past you in a native buffer (320 × 200,
 * scaled by a whole number). ←/→ turn your skis (seven headings, straight
 * down to nearly across), ↓ tucks (faster), ↑ snowploughs (slower), Space
 * off a jump does a trick. Pass between each pair of flags — a missed gate
 * costs three seconds; hit a tree or a rock and you go down in a burst of
 * snow (two seconds to get up); moguls shake your speed off; ice won't let
 * you turn. Ski goggles show the line to the next gate. Touch: hold the left
 * or right of the slope to turn, the bottom to tuck.
 *
 * Runs (fixed, so you can learn them): the Nursery Slope (green), Pinewood
 * (blue) and the Couloir (black — Ansgar lets you on once you've finished
 * Pinewood). Best times in localStorage bridge_ski; a finish pays coins, the
 * first well, then once a day each.
 *
 *   BridgeSki.start(runId)    // the lift (js/worlds/hoarfell.js) or the summit's start gate
 *   BridgeSki.RUNS
 */
var BridgeSki = (function () {
  var KEY = 'bridge_ski';
  var BW = 320, BH = 200;
  var RUNS = {
    nursery:  { name: 'THE NURSERY SLOPE', colour: '#3aa060', mark: 'green', length: 2200, seed: 5, width: 230, trees: 0.5, rocks: 0.1,
                moguls: 0.3, ice: 0, gates: 9, gateW: 54, jumps: 1, grav: 120, first: 40, again: 10 },
    pinewood: { name: 'PINEWOOD', colour: '#3a7ae0', mark: 'blue', length: 3400, seed: 17, width: 210, trees: 1.3, rocks: 0.3,
                moguls: 0.6, ice: 0.15, gates: 14, gateW: 44, jumps: 2, grav: 140, first: 90, again: 20 },
    couloir:  { name: 'THE COULOIR', colour: '#2a2a34', mark: 'black', length: 4400, seed: 29, width: 150, trees: 1.0, rocks: 0.9,
                moguls: 0.5, ice: 0.4, gates: 18, gateW: 36, jumps: 3, grav: 170, needs: 'pinewood', first: 200, again: 40 }
  };
  var HEAD = [-1.2, -0.85, -0.45, 0, 0.45, 0.85, 1.2];              // the seven headings (radians off straight down)
  var SUIT = { purple: '#8a64d0', cyan: '#40c8d8', gold: '#e0b040', green: '#4aa860', red: '#d04a40', white: '#e8e8f0' };

  var save = load();
  var el = null, cv = null, ctx = null, raf = 0, last = 0, g = null, keys = {}, touch = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { runs: {} }; } catch (e) { return { runs: {} }; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function day() { return Math.floor(Date.now() / 86400000); }
  function rngFor(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function fmt(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  function unlocked(id) { var n = RUNS[id].needs; return !n || !!(save.runs[n] && save.runs[n].best); }

  // ---- the course -------------------------------------------------------------------------------------------
  // the piste wanders: centre(y) is where its middle is at distance y down the run
  function build(id) {
    var D = RUNS[id], rnd = rngFor(D.seed * 977 + 3), L = D.length;
    var ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    function centre(y) { return 160 + 50 * Math.sin(y / 420 + ph[0]) + 22 * Math.sin(y / 170 + ph[1]) + 10 * Math.sin(y / 70 + ph[2]); }
    var things = [];
    function free(x, y, r) { return things.every(function (t) { return Math.hypot(t.x - x, t.y - y) > r + t.r; }); }
    // gates down the middle, alternating red and blue, set a little either side of the line
    var gates = [];
    for (var i = 0; i < D.gates; i++) {
      var gy = 240 + (L - 420) * (i + 0.5) / D.gates, gx = centre(gy) + (i % 2 ? 1 : -1) * 18 * rnd();
      gates.push({ x: gx, y: gy, w: D.gateW, col: i % 2 ? '#2a6ae0' : '#d83a2e', passed: false, missed: false });
      things.push({ x: gx - D.gateW / 2, y: gy, r: 4, kind: 'pole' }, { x: gx + D.gateW / 2, y: gy, r: 4, kind: 'pole' });
    }
    for (var j = 0; j < D.jumps; j++) {
      var jy = 500 + (L - 900) * (j + 0.5) / D.jumps + 60, jx = centre(jy) + (rnd() - 0.5) * 30;
      things.push({ x: jx, y: jy, r: 14, kind: 'jump' });
    }
    var area = L / 100;
    function scatter(kind, per, r, spread) {
      for (var n = 0; n < per * area; n++) {
        var y = 160 + rnd() * (L - 260), side = spread ? (rnd() - 0.5) * spread : (rnd() < 0.5 ? -1 : 1) * (D.width / 2 - 8 + rnd() * 50);
        var x = centre(y) + side;
        if (free(x, y, r + 6)) things.push({ x: x, y: y, r: r, kind: kind, v: Math.floor(rnd() * 3) });
      }
    }
    scatter('tree', D.trees * 1.4, 6, D.width * 0.9);        // in the piste
    scatter('tree', 3.0, 6, 0);                               // its edges
    scatter('rock', D.rocks, 5, D.width * 0.9);
    scatter('mogul', D.moguls * 2, 5, D.width * 0.8);
    scatter('ice', D.ice, 14, D.width * 0.7);
    things.sort(function (a, b) { return a.y - b.y; });
    return { centre: centre, gates: gates, things: things, length: L };
  }

  // ---- a run --------------------------------------------------------------------------------------------------
  function start(id, opts) {
    var D = RUNS[id];
    if (!D) return;
    ensure();
    var c = build(id);
    opts = opts || (g && g.opts) || {};
    g = { id: id, D: D, c: c, opts: opts, finished: false, x: c.centre(80), y: 80, h: 3, v: 30, t: 0, pen: 0, phase: 'ready', down: 0, air: 0, trick: 0, tricks: 0,
          missed: 0, passed: 0, trail: [], spray: [], cam: 0, nextGate: 0, hits: 0 };
    el.querySelector('.cl-title').textContent = D.name;
    el.querySelector('.cl-grade').textContent = D.mark.toUpperCase() + ' RUN';
    var best = save.runs[id] && save.runs[id].best;
    card('<b>' + D.name + '</b><br>' + D.gates + ' gates, ' + (D.length / 40).toFixed(0) + ' m down to the lodge.' +
         (best ? ' Your best: ' + fmt(best) + '.' : '') + '<br>← → turn · ↓ tuck · ↑ snowplough · Space off a jump: a trick',
         [['Push off', go], ['Ride back down', close]]);
    el.classList.add('visible');
    fit();
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('resize', fit);
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function go() { card(null); g.phase = 'run'; sfx('open'); }

  function frame(now) {
    if (!g) return;
    var dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    if (g.phase === 'run') update(dt, now);
    draw(now);
    hud();
    raf = requestAnimationFrame(frame);
  }

  var turnHeld = 0;
  function update(dt, now) {
    var D = g.D;
    g.t += dt;
    var left = keys.ArrowLeft || keys.a || keys.A || (touch && touch.side < 0);
    var right = keys.ArrowRight || keys.d || keys.D || (touch && touch.side > 0);
    var tuck = keys.ArrowDown || keys.s || keys.S || (touch && touch.tuck);
    var plough = keys.ArrowUp || keys.w || keys.W;
    var onIce = g.c.things.some(function (t) { return t.kind === 'ice' && Math.abs(t.y - g.y) < t.r && Math.abs(t.x - g.x) < t.r * 1.6; });
    if (g.down > 0) {                                             // down in the snow, getting up
      g.down -= dt;
      g.v = Math.max(0, g.v - 200 * dt);
      if (g.down <= 0) {                                          // up again, beside what you hit
        g.h = 3; g.v = 20;
        var o = g.crashOn;
        if (o) { g.x = clamp(o.x + (g.x < o.x ? -1 : 1) * (o.r + 7), 8, BW - 8); o.hit = true; g.crashOn = null; }
      }
      return;
    }
    // turning: one heading step per press, or per 0.14 s held
    turnHeld -= dt;
    if (!onIce && g.air <= 0 && (left || right) && turnHeld <= 0) {
      g.h = clamp(g.h + (left ? -1 : 1), 0, 6);
      turnHeld = 0.14;
      if (g.v > 60) spray(4);
    }
    if (!left && !right) turnHeld = 0;
    var a = HEAD[g.h], down = Math.cos(a);
    var acc = D.grav * down * (tuck ? 1.35 : 1) - (plough ? 220 : 0) - 0.012 * g.v * g.v - (Math.abs(a) > 1 ? 60 : 0);
    if (g.air > 0) acc = D.grav * 0.6;
    g.v = clamp(g.v + acc * dt, 0, tuck ? 260 : 220);
    if (plough && g.v > 30) spray(1);
    g.x = clamp(g.x + Math.sin(a) * g.v * dt, 8, BW - 8);
    g.y += Math.max(0, down) * g.v * dt;
    if (g.air > 0) {
      g.air -= dt;
      if (g.air <= 0) {
        if (g.trick > 0 && g.trick < 0.95) { g.tricks++; g.pen -= 1.0; float('A spin off the jump! -1.0s'); sfx('success'); }
        else if (g.trick >= 0.95) { crash('You land the trick... on your face.'); }
        g.trick = 0;
        sfx('sit');
      }
    }
    // the piste's edge: deep snow slows you hard
    var off = Math.abs(g.x - g.c.centre(g.y)) - D.width / 2;
    if (off > 0) g.v = Math.max(20, g.v - off * 4 * dt * 10);
    // things in the way
    var near = g.c.things;
    for (var i = 0; i < near.length; i++) {
      var t = near[i];
      if (t.y < g.y - 20) continue;
      if (t.y > g.y + 20) break;
      var d = Math.hypot(t.x - g.x, (t.y - g.y) * 1.4);
      if (g.air > 0 || t.hit) continue;
      if ((t.kind === 'tree' || t.kind === 'rock' || t.kind === 'pole') && d < t.r + 3) { crash(t.kind === 'tree' ? 'Into a tree.' : t.kind === 'rock' ? 'A rock under the snow.' : 'You take out a gate pole.', t); break; }
      if (t.kind === 'mogul' && d < t.r + 2 && !t.bumped) { t.bumped = true; g.v *= 0.82; spray(5); sfx('step'); }
      if (t.kind === 'jump' && d < t.r && g.v > 50) { g.air = 0.45 + g.v / 400; g.trick = 0; sfx('lift'); spray(8); }
    }
    // gates: between the flags as you pass their row
    var gt = g.c.gates[g.nextGate];
    if (gt && g.y >= gt.y) {
      if (Math.abs(g.x - gt.x) <= gt.w / 2) { gt.passed = true; g.passed++; sfx('blip'); }
      else { gt.missed = true; g.missed++; g.pen += 3; float('Missed a gate: +3s'); sfx('error'); }
      g.nextGate++;
    }
    if (g.y >= g.c.length) finish();
    // tracks
    if (g.air <= 0 && (!g.trail.length || g.y - g.trail[g.trail.length - 1].y > 2)) {
      g.trail.push({ x: g.x, y: g.y, h: g.h });
      if (g.trail.length > 240) g.trail.shift();
    }
  }

  function crash(why, t) {
    if (g.down > 0) return;
    g.down = 1.6; g.hits++; g.crashOn = t || null;
    g.v = 0; spray(18);
    sfx('crumble');
    float(why);
  }
  function spray(n) {
    for (var i = 0; i < n; i++) g.spray.push({ x: g.x + (Math.random() - 0.5) * 6, y: g.y + 4, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 30, life: 1 });
  }
  var msgTimer = 0;
  function float(t) {                                             // a line under the slope: a missed gate, a trick, a tree
    var m = el.querySelector('.cl-msg');
    m.textContent = t;
    m.classList.add('on');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { m.classList.remove('on'); }, 1600);
  }

  function finish() {
    g.phase = 'done';
    g.finished = true;
    var D = g.D, total = g.t + g.pen, rec = save.runs[g.id] || (save.runs[g.id] = { runs: 0, best: 0, paid: 0 });
    var first = !rec.best, nb = !rec.best || total < rec.best;
    rec.runs++;
    if (nb) rec.best = total;
    var pay = first ? D.first : rec.paid !== day() ? D.again : 0;
    if (pay) rec.paid = day();
    store();
    sfx('quest');
    if (pay && typeof BridgeProgression !== 'undefined') BridgeProgression.awardCoins(pay, 'ski:' + g.id);
    if (first && typeof BridgeProgression !== 'undefined') BridgeProgression.recordAchievement('skied_' + g.id, 0, { source: 'ski' });
    card('<b>FINISH.</b> ' + D.name + ' in <b>' + fmt(total) + '</b>' + (nb && !first ? ' - a new best!' : '') + '<br>' +
         g.passed + ' of ' + D.gates + ' gates' + (g.missed ? ' (+' + g.missed * 3 + 's)' : '') + (g.tricks ? ', ' + g.tricks + ' trick' + (g.tricks > 1 ? 's' : '') + ' (-' + g.tricks + 's)' : '') +
         (g.hits ? ', ' + g.hits + (g.hits > 1 ? ' falls' : ' fall') : ', clean') + '.' + (pay ? '<br>' + pay + ' coins.' : ''),
         [['Again', function () { var o = g.opts; g.finished = false; start(g.id, o); go(); }], ['Down to the village', close]]);
  }

  // ---- drawing -------------------------------------------------------------------------------------------------
  var snowTex = null;
  function makeSnow() {
    snowTex = document.createElement('canvas');
    snowTex.width = 64; snowTex.height = 64;
    var sx = snowTex.getContext('2d'), img = sx.createImageData(64, 64), d = img.data;
    for (var y = 0; y < 64; y++) for (var x = 0; x < 64; x++) {
      var n = Math.sin(x * 0.4 + Math.sin(y * 0.21) * 3) * 0.5 + Math.sin(y * 0.33 + x * 0.07) * 0.5;
      var b = n > 0.55 ? 1 : n < -0.6 ? -1 : 0, o = (y * 64 + x) * 4;
      var c = b > 0 ? [250, 252, 255] : b < 0 ? [214, 226, 242] : [236, 242, 250];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    sx.putImageData(img, 0, 0);
  }

  function draw(now) {
    if (!snowTex) makeSnow();
    var cam = g.y - 60, D = g.D;
    // snow, scrolling
    var oy = Math.floor(cam % 64);
    for (var ty = -oy - 64; ty < BH; ty += 64) for (var tx = 0; tx < BW; tx += 64) ctx.drawImage(snowTex, tx, ty);
    var camX = 160;
    // the piste's edges: deep untracked snow either side, a blue tinge
    for (var r = 0; r < BH; r += 2) {
      var wy = cam + r, cx = g.c.centre(wy) + camX - 160, hw = D.width / 2;
      ctx.fillStyle = 'rgba(150,175,215,0.18)';
      ctx.fillRect(0, r, Math.max(0, Math.round(cx - hw)), 2);
      ctx.fillRect(Math.round(cx + hw), r, BW, 2);
    }
    // tracks
    ctx.fillStyle = 'rgba(160,180,210,0.6)';
    g.trail.forEach(function (p) {
      var sy = Math.round(p.y - cam), a = HEAD[p.h], ox = Math.round(Math.cos(a) * 2);
      if (sy < -2 || sy > BH) return;
      ctx.fillRect(Math.round(p.x) - ox - 1, sy, 1, 1); ctx.fillRect(Math.round(p.x) + ox + 1, sy, 1, 1);
    });
    // the racing line to the next gate, with goggles
    var gt = g.c.gates[g.nextGate];
    if (gt && has('ski_goggles') && g.phase === 'run') {
      ctx.fillStyle = 'rgba(255,210,80,0.55)';
      for (var s = 1; s < 12; s++) {
        var px = g.x + (gt.x - g.x) * s / 12, py = g.y + (gt.y - g.y) * s / 12;
        if (s % 2) ctx.fillRect(Math.round(px), Math.round(py - cam), 2, 1);
      }
    }
    // things, back to front
    var list = g.c.things.filter(function (t) { return t.y > cam - 30 && t.y < cam + BH + 30; });
    list.forEach(function (t) { if (t.kind === 'ice' || t.kind === 'mogul' || t.kind === 'jump') flat(t, cam); });
    var skierDrawn = false;
    list.forEach(function (t) {
      if (t.kind === 'ice' || t.kind === 'mogul' || t.kind === 'jump') return;
      if (!skierDrawn && t.y > g.y) { skier(now, cam); skierDrawn = true; }
      upright(t, cam, now);
    });
    g.c.gates.forEach(function (gg) { flag(gg, cam, now); });
    if (!skierDrawn) skier(now, cam);
    // the finish: a banner, the lodge's roofs
    var fy = Math.round(g.c.length - cam);
    if (fy < BH + 40) {
      var fx = g.c.centre(g.c.length);
      ctx.fillStyle = '#2a2a34'; ctx.fillRect(Math.round(fx - 50), fy - 22, 2, 22); ctx.fillRect(Math.round(fx + 48), fy - 22, 2, 22);
      ctx.fillStyle = '#d83a2e'; ctx.fillRect(Math.round(fx - 48), fy - 22, 96, 7);
      ctx.fillStyle = '#fff';
      for (var q = 0; q < 12; q++) ctx.fillRect(Math.round(fx - 44 + q * 8), fy - 20, 4, 3);
      ctx.fillStyle = 'rgba(40,40,60,0.25)';
      for (var q2 = 0; q2 < 24; q2++) ctx.fillRect(Math.round(fx - 48 + q2 * 4), fy, 2, 2);
      for (var hcount = 0; hcount < 4; hcount++) chalet(Math.round(fx - 120 + hcount * 70), fy + 30 + (hcount % 2) * 10);
    }
    // spray
    g.spray.forEach(function (p) {
      p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.vy += 2; p.life -= 0.03;
      ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, p.life).toFixed(2) + ')';
      ctx.fillRect(Math.round(p.x), Math.round(p.y - cam), 2, 2);
    });
    g.spray = g.spray.filter(function (p) { return p.life > 0; });
    // falling snow
    for (var f = 0; f < 50; f++) {
      var fx2 = (f * 71 + now * (0.01 + (f % 3) * 0.006)) % BW, fy2 = (f * 37 + now * (0.03 + (f % 4) * 0.01)) % BH;
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(Math.round(fx2), Math.round(fy2), 1, 1);
    }
  }

  function flat(t, cam) {
    var x = Math.round(t.x), y = Math.round(t.y - cam);
    if (t.kind === 'ice') {
      ctx.fillStyle = 'rgba(150,200,235,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, t.r * 1.6, t.r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x - 6, y - 3, 5, 1); ctx.fillRect(x + 3, y + 2, 4, 1);
    } else if (t.kind === 'mogul') {
      ctx.fillStyle = '#c6d4ea'; ctx.fillRect(x - 5, y, 10, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 2, 8, 3);
    } else if (t.kind === 'jump') {
      ctx.fillStyle = '#9ab4dc'; ctx.fillRect(x - 13, y + 2, 26, 4);
      ctx.fillStyle = '#d8e6f8'; ctx.fillRect(x - 13, y - 6, 26, 8);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 13, y - 6, 26, 2);
      ctx.fillStyle = '#e8b030'; ctx.fillRect(x - 14, y - 7, 2, 2); ctx.fillRect(x + 12, y - 7, 2, 2);
    }
  }
  function upright(t, cam, now) {
    var x = Math.round(t.x), y = Math.round(t.y - cam);
    if (t.kind === 'tree') {
      ctx.fillStyle = 'rgba(70,90,140,0.25)'; ctx.fillRect(x - 2, y, 12, 3);
      ctx.fillStyle = '#4a2e1a'; ctx.fillRect(x - 1, y - 3, 2, 4);
      var tones = ['#1e3a30', '#2a4e3e', '#3a6450'];
      for (var i = 0; i < 3; i++) {
        var w = 11 - i * 3, yy = y - 4 - i * 5;
        ctx.fillStyle = '#10221a'; ctx.fillRect(x - (w >> 1) - 1, yy - 4, w + 2, 6);
        ctx.fillStyle = tones[(i + t.v) % 3]; ctx.fillRect(x - (w >> 1), yy - 4, w, 5);
        ctx.fillStyle = '#f4f8fc'; ctx.fillRect(x - (w >> 1) + 1, yy - 4, w - 2, 1);
      }
      ctx.fillStyle = '#f4f8fc'; ctx.fillRect(x - 1, y - 21, 2, 2);
    } else if (t.kind === 'rock') {
      ctx.fillStyle = '#2a2c36'; ctx.fillRect(x - 5, y - 4, 10, 6);
      ctx.fillStyle = '#5a6070'; ctx.fillRect(x - 4, y - 4, 8, 4);
      ctx.fillStyle = '#f4f8fc'; ctx.fillRect(x - 4, y - 5, 7, 2);
    }
  }
  function flag(gg, cam, now) {
    var y = Math.round(gg.y - cam);
    if (y < -20 || y > BH + 10) return;
    [-1, 1].forEach(function (s) {
      var x = Math.round(gg.x + s * gg.w / 2);
      ctx.fillStyle = 'rgba(70,90,140,0.3)'; ctx.fillRect(x, y, 5, 1);
      ctx.fillStyle = '#2a2a34'; ctx.fillRect(x, y - 14, 1, 14);
      var wave = Math.round(Math.sin(now / 150 + gg.y) * 1);
      ctx.fillStyle = gg.missed ? '#7a7a88' : gg.col;
      ctx.fillRect(x + (s < 0 ? -6 : 1), y - 14 + wave, 6, 5);
      if (gg.passed) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + (s < 0 ? -4 : 3), y - 12 + wave, 2, 1); }
    });
  }
  function chalet(x, y) {
    ctx.fillStyle = '#5a3420'; ctx.fillRect(x, y, 34, 14);
    ctx.fillStyle = '#ffd890'; ctx.fillRect(x + 5, y + 5, 4, 4); ctx.fillRect(x + 25, y + 5, 4, 4);
    ctx.fillStyle = '#f4f6fa'; ctx.fillRect(x - 3, y - 8, 40, 8);
    ctx.fillStyle = '#c8d4e6'; ctx.fillRect(x - 3, y - 1, 40, 1);
  }

  function skier(now, cam) {
    var col = SUIT[(typeof BridgeGear !== 'undefined' && BridgeGear.colour()) || (BridgeState.getPilot() || {}).suit_color] || SUIT.purple;
    var x = Math.round(g.x), y = Math.round(g.y - cam), a = HEAD[g.h];
    var lift = g.air > 0 ? Math.round(Math.sin(Math.min(1, 1 - g.air / (0.45 + g.v / 400)) * Math.PI) * 8) : 0;
    ctx.fillStyle = 'rgba(70,90,140,0.35)'; ctx.fillRect(x - 4, y + 2, 9, 2);              // shadow stays on the snow
    y -= lift;
    if (g.down > 0) {                                                                        // sprawled in the snow
      ctx.fillStyle = col; ctx.fillRect(x - 5, y - 2, 10, 4);
      ctx.fillStyle = '#e8c8a8'; ctx.fillRect(x + 5, y - 2, 3, 3);
      ctx.fillStyle = '#2a2a34'; ctx.fillRect(x - 9, y + 3, 7, 1); ctx.fillRect(x + 2, y - 6, 1, 7);
      return;
    }
    // skis along the heading
    var sx = Math.sin(a), sy = Math.cos(a);
    ctx.fillStyle = '#c83a2e';
    for (var i = -6; i <= 6; i++) {
      ctx.fillRect(Math.round(x - 2 + sx * i), Math.round(y + sy * i * 0.5 + 1), 1, 1);
      ctx.fillRect(Math.round(x + 2 + sx * i), Math.round(y + sy * i * 0.5 + 1), 1, 1);
    }
    var tuck = keys.ArrowDown || keys.s || keys.S || (touch && touch.tuck);
    var trickSpin = g.trick > 0 ? Math.round(Math.sin(g.trick * 12) * 3) : 0;
    var bodyH = tuck ? 6 : 9;
    ctx.fillStyle = '#14141c'; ctx.fillRect(x - 3 + trickSpin, y - bodyH - 1, 7, bodyH + 1);
    ctx.fillStyle = col; ctx.fillRect(x - 2 + trickSpin, y - bodyH, 5, bodyH);
    ctx.fillStyle = '#14141c'; ctx.fillRect(x - 2 + trickSpin, y - bodyH - 5, 5, 5);
    ctx.fillStyle = col; ctx.fillRect(x - 1 + trickSpin, y - bodyH - 4, 3, 3);
    ctx.fillStyle = '#ffd860'; ctx.fillRect(x - 1 + trickSpin, y - bodyH - 3, 3, 1);         // goggles
    // poles
    ctx.fillStyle = '#2a2a34';
    ctx.fillRect(x - 5, y - bodyH + 2, 1, bodyH + 1); ctx.fillRect(x + 5, y - bodyH + 2, 1, bodyH + 1);
    // scarf in the wind
    ctx.fillStyle = '#c83a2e'; ctx.fillRect(x - 1 - Math.round(sx * 3), y - bodyH - 1 - Math.round(g.v / 60), 2, 2);
  }

  // ---- panel (shares the climbing panel's look) ------------------------------------------------------------------
  function ensure() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'ski';
    el.innerHTML = '<div class="cl-panel">' +
      '<div class="cl-head"><span class="cl-title"></span><span class="cl-grade"></span><span class="cl-time"></span>' +
      '<button class="qj-close sk-close" aria-label="Stop"><span class="ip-key">Esc</span></button></div>' +
      '<div class="cl-stage"><canvas class="cl-wall"></canvas><div class="cl-card"></div></div>' +
      '<div class="cl-bar"><span class="cl-lbl">Speed</span><span class="cl-stam"><i></i></span><span class="cl-alt"></span></div>' +
      '<div class="cl-msg"></div><div class="cl-hint">← → turn · ↓ tuck · ↑ snowplough · Space off a jump · Esc stop</div></div>';
    document.body.appendChild(el);
    cv = el.querySelector('.cl-wall'); ctx = cv.getContext('2d');
    cv.width = BW; cv.height = BH;
    el.querySelector('.sk-close').addEventListener('click', close);
    function pt(e) {
      var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      touch = { side: y > 0.75 ? 0 : x < 0.4 ? -1 : x > 0.6 ? 1 : 0, tuck: y > 0.75 };
      if (g && g.air > 0 && g.trick === 0) g.trick = 0.01;
    }
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); pt(e); });
    cv.addEventListener('pointermove', function (e) { if (touch) pt(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { cv.addEventListener(n, function () { touch = null; }); });
  }
  function fit() {
    if (!el) return;
    var vw = window.innerWidth, vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    var s = Math.min((vw - 40) / BW, (vh - 170) / BH);
    s = s >= 2 ? Math.floor(s) : Math.max(1, s);
    cv.style.width = Math.round(BW * s) + 'px'; cv.style.height = Math.round(BH * s) + 'px';
  }
  function card(html, buttons) {
    var c = el.querySelector('.cl-card');
    if (!html) { c.style.display = 'none'; g.cardButtons = null; return; }
    c.innerHTML = '<p>' + html + '</p><div class="cl-btns">' + buttons.map(function (b, i) { return '<button data-i="' + i + '"' + (i ? '' : ' class="primary"') + '>' + b[0] + '</button>'; }).join('') + '</div>';
    c.style.display = 'flex';
    c.querySelectorAll('button').forEach(function (bt) { bt.addEventListener('click', function () { buttons[+bt.getAttribute('data-i')][1](); }); });
    g.cardButtons = buttons;
  }
  function hud() {
    var pct = clamp(g.v / 260, 0, 1), st = el.querySelector('.cl-stam i');
    st.style.width = Math.round(pct * 100) + '%';
    st.style.background = pct > 0.8 ? '#f0b040' : '#7ad0f0';
    el.querySelector('.cl-alt').textContent = Math.round(g.v / 4) + ' km/h · gate ' + Math.min(g.nextGate + 1, g.D.gates) + ' of ' + g.D.gates;
    el.querySelector('.cl-time').textContent = g.phase === 'ready' ? '' : fmt(g.t + g.pen);
  }
  function close() {
    if (!el || !el.classList.contains('visible')) return;
    el.classList.remove('visible');
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('resize', fit);
    var done = g && g.opts && g.opts.done, finished = !!(g && g.finished);
    keys = {}; touch = null; g = null;
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
    if (done) done(finished);
  }
  function onKey(e) {
    if (!g) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'Escape') return close();
    if (g.phase !== 'run') {
      if ((e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') && !e.repeat && g.cardButtons) g.cardButtons[0][1]();
      return;
    }
    keys[e.key] = true;
    if (e.key === ' ' && g.air > 0 && g.trick === 0) g.trick = 0.01;
  }
  function onKeyUp(e) { if (g) { e.preventDefault(); e.stopPropagation(); } keys[e.key] = false; }

  // tricks spin while you're airborne; land before the spin's done
  setInterval(function () { if (g && g.trick > 0 && g.air > 0) g.trick += 0.05; }, 40);

  return { start: start, close: close, RUNS: RUNS, unlocked: unlocked, best: function (id) { return save.runs[id] && save.runs[id].best; },
           isOpen: function () { return !!g; }, _g: function () { return g; }, _keys: keys };
})();
