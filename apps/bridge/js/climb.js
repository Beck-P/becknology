/**
 * BridgeClimb — climbing the cliffs above Fellhaven on Hoarfell.
 *
 * Its own mode, over the world: the cliff face drawn in a native buffer
 * (320 × 200, scaled by a whole number), scrolling as you go up, the sky
 * behind it deepening from alpenglow to stars and the village shrinking below.
 * You climb hold to hold: the holds in reach light up; ←/→ choose one, ↑ (or
 * E, Space, a click or tap on it) reaches for it. Every reach costs stamina —
 * a long one more, a crimp or an ice placement more again — and hanging
 * drains it, faster in the cold without a Thermal Suit and faster still when
 * the wind gusts on the Hoarspire (unless you're on a good jug). Ledges are
 * rests: stand on one and your arms come back; they're also the bolts — fall
 * with a climbing rope (or on the Staircase's fixed line) and you're caught at
 * the last one, without, you slide to the bottom. A fall costs health. Loose
 * holds crumble a moment after you take them; slopers spit you off when
 * you're tired; ice takes an ice axe. Chalk (C) dries your hands: +25 stamina.
 * Glowing hoar crystals in the rock are yours if you can reach them.
 *
 * Routes (fixed, so you can learn them): the Staircase (I), the Icefall
 * (III, needs an ice axe), the Hoarspire (V). Topping out pays (the first
 * ascent well, then once a day), keeps your best time, and lets you walk out
 * onto the summit (hoarfell-summit). Saved in localStorage bridge_climb.
 *
 *   BridgeClimb.start(routeId)       // a 'climb' interaction (js/worlds/hoarfell.js)
 *   BridgeClimb.board()              // the route board: grades, your ascents
 */
var BridgeClimb = (function () {
  var KEY = 'bridge_climb';
  var BW = 320, BH = 200;
  var REACH = 40;
  var ROUTES = {
    staircase: { name: 'THE STAIRCASE', grade: 'I', height: 560, seed: 11, ledgeEvery: 150, fixed: true, line: '#e0b030',
                 mix: { jug: 7, crimp: 2, sloper: 1 }, decoys: 1, loose: 0, wind: false, crystals: 1,
                 first: 60, again: 15, gift: ['edelweiss', 1], blurb: 'Big holds, a fixed line all the way. The one to learn on.' },
    icefall:   { name: 'THE ICEFALL', grade: 'III', height: 780, seed: 23, ledgeEvery: 190, needs: 'ice_axe', ice: true, line: '#3a8ae0',
                 mix: { ice: 8, jug: 1, crimp: 1 }, decoys: 2, loose: 0.06, wind: false, crystals: 3,
                 first: 150, again: 30, gift: ['hoar_crystal', 3], blurb: 'Up the frozen waterfall. You will want an ice axe.' },
    hoarspire: { name: 'THE HOARSPIRE', grade: 'V', height: 1100, seed: 41, ledgeEvery: 230, line: '#c83a2e',
                 mix: { jug: 3, crimp: 4, sloper: 3 }, decoys: 2, loose: 0.14, wind: true, crystals: 6,
                 first: 400, again: 60, gift: ['summit_crystal', 1], blurb: 'The peak itself. Small holds, loose rock, and the wind.' }
  };
  var KIND = {
    jug:     { cost: 0, hang: 1.0, name: 'a good jug' },
    crimp:   { cost: 4, hang: 1.7, name: 'a crimp' },
    sloper:  { cost: 2, hang: 1.4, name: 'a sloper' },
    ice:     { cost: 3, hang: 1.2, name: 'ice' },
    loose:   { cost: 0, hang: 1.0, name: 'loose rock' },
    crystal: { cost: 1, hang: 1.2, name: 'a crystal' },
    ledge:   { cost: 3, hang: 0, name: 'a ledge' },
    top:     { cost: 3, hang: 0, name: 'the top' }
  };
  var SUIT = { purple: '#8a64d0', cyan: '#40c8d8', gold: '#e0b040', green: '#4aa860', red: '#d04a40', white: '#e8e8f0' };

  var save = load();
  var el = null, cv = null, ctx = null, raf = 0, last = 0;
  var R = null, wall = null, g = null;          // the route, its rendered face, the climb in progress
  var keys = {};

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { routes: {} }; } catch (e) { return { routes: {} }; }
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  function rngFor(seed) {
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function day() { return Math.floor(Date.now() / 86400000); }
  function warm() { return typeof BridgeGear !== 'undefined' && BridgeGear.has('cold'); }
  function hash(x, y, s) { var h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // ---- the route ---------------------------------------------------------------------------------------
  function pick(rnd, mix) {
    var tot = 0, k;
    for (k in mix) tot += mix[k];
    var r = rnd() * tot;
    for (k in mix) { r -= mix[k]; if (r <= 0) return k; }
    return 'jug';
  }
  function build(id) {
    var D = ROUTES[id], rnd = rngFor(D.seed * 7919 + 13), holds = [];
    var start = { x: 160, y: 8, kind: 'ledge', w: 90, cp: true };
    holds.push(start);
    var cur = { x: 160, y: start.y + 20 }, nextLedge = D.ledgeEvery, lastLoose = false, main = [];
    while (cur.y < D.height - 40) {
      if (cur.y >= nextLedge) {
        var lx = clamp(cur.x + (rnd() - 0.5) * 30, 110, 210), ly = cur.y + 14 + rnd() * 8;
        var L = { x: lx, y: ly, kind: 'ledge', w: 36 + rnd() * 26, cp: true };
        holds.push(L); main.push(L);
        cur = { x: lx, y: ly + 20 };
        nextLedge += D.ledgeEvery;
        continue;
      }
      var x = clamp(cur.x + (rnd() - 0.5) * 52, 96, 224), y = cur.y + 15 + rnd() * 13;
      var kind = pick(rnd, D.mix);
      if (!lastLoose && rnd() < D.loose) kind = 'loose';
      lastLoose = kind === 'loose';
      var h = { x: x, y: y, kind: kind };
      holds.push(h); main.push(h);
      cur = { x: x, y: y };
      for (var d = 0; d < D.decoys; d++) {                         // other holds: other ways up, some of them bad
        if (rnd() < 0.45) continue;
        var dx = (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 22), dy = (rnd() - 0.4) * 22;
        holds.push({ x: clamp(x + dx, 90, 230), y: y + dy, kind: rnd() < D.loose * 2.2 ? 'loose' : pick(rnd, D.mix) });
      }
    }
    var top = { x: 160, y: D.height, kind: 'top', w: 240, cp: true };
    holds.push(top);
    // hoar crystals, off the line where you have to go out of your way
    var cand = main.filter(function (m) { return m.kind !== 'ledge' && m.y > 80; });
    for (var c = 0; c < D.crystals && cand.length; c++) {
      var m = cand.splice(Math.floor(rnd() * cand.length), 1)[0];
      holds.push({ x: clamp(m.x + (rnd() < 0.5 ? -1 : 1) * (22 + rnd() * 10), 88, 232), y: m.y + 6, kind: 'crystal' });
    }
    holds.forEach(function (hh, i) { hh.id = i; });
    return { holds: holds, start: start, top: top, main: main, height: D.height };
  }

  // the face itself, rendered once per route: noisy rock in four tones banded by strata, ice down the middle of
  // the Icefall, ragged edges where the sky shows round it
  var PAL = {
    rock: ['#2a2c38', '#3e4252', '#5a6074', '#7c8498', '#a8b0c4'],
    dark: ['#1e1e28', '#2e2e3c', '#444456', '#5e5e74', '#8a8aa4'],
    ice:  ['#2a4a6a', '#3e6e94', '#5e9ac0', '#8cc4e0', '#d0ecf8']
  };
  function paintWall(id) {
    var D = ROUTES[id], Hh = D.height + BH + 40, Wd = 240, x0 = 40;
    var c = document.createElement('canvas');
    c.width = Wd; c.height = Hh;
    var gx = c.getContext('2d'), img = gx.createImageData(Wd, Hh), d = img.data;
    var pal = id === 'hoarspire' ? PAL.dark : PAL.rock;
    function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    var P = pal.map(hex), PI = PAL.ice.map(hex);
    for (var yy = 0; yy < Hh; yy++) {
      var wy = Hh - 1 - yy;                                       // wall height at this row (0 = the foot)
      var edge = 18 + 14 * vnoise(wy / 40, 1, D.seed) + 8 * vnoise(wy / 11, 2, D.seed);
      for (var xx = 0; xx < Wd; xx++) {
        var o = (yy * Wd + xx) * 4;
        var fromEdge = Math.min(xx, Wd - 1 - xx);
        if (fromEdge < edge - 14) { d[o + 3] = 0; continue; }
        var wx = xx + x0;
        var n = vnoise(wx / 18, wy / 9, D.seed) * 0.55 + vnoise(wx / 6, wy / 4, D.seed + 3) * 0.3 + vnoise(wx / 2.5, wy / 2.5, D.seed + 5) * 0.15;
        var strata = Math.sin(wy / 7 + vnoise(wx / 30, wy / 30, D.seed + 9) * 6) * 0.12;
        var lit = n + strata + (xx / Wd - 0.5) * 0.25;                  // the sun from the left
        if (fromEdge < edge) lit -= 0.25;
        var iceBand = D.ice && Math.abs(wx - 160 + 18 * Math.sin(wy / 60)) < 56 + 10 * vnoise(wx / 9, wy / 13, 7);
        var pp = iceBand ? PI : P;
        var q = lit * 4.2 + (BAYER[(yy & 3) * 4 + (xx & 3)] / 16 - 0.5) * 0.9;
        var col = pp[clamp(Math.round(q), 0, 4)];
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    gx.putImageData(img, 0, 0);
    // cracks
    var rnd = rngFor(D.seed + 99);
    gx.fillStyle = 'rgba(10,10,18,0.55)';
    for (var k = 0; k < D.height / 14; k++) {
      var cx = 40 + rnd() * 160, cy = rnd() * Hh, len = 6 + rnd() * 18;
      for (var j = 0; j < len; j++) { gx.fillRect(Math.round(cx), Math.round(cy), 1, 1); cx += (rnd() - 0.5) * 1.6; cy += 1; }
    }
    return { canvas: c, x0: x0, Hh: Hh };
  }

  // ---- the climb ---------------------------------------------------------------------------------------------
  function anchorOf(h, nearX) {
    if (h.kind === 'ledge' || h.kind === 'top') return { x: clamp(nearX, h.x - h.w / 2 + 6, h.x + h.w / 2 - 6), y: h.y + 20 };
    return { x: h.x, y: h.y };
  }
  function reachTo(h, from) {                                     // the point of h your hand goes to, and how far
    var p = h.kind === 'ledge' || h.kind === 'top' ? { x: clamp(from.x, h.x - h.w / 2, h.x + h.w / 2), y: h.y } : { x: h.x, y: h.y };
    return { p: p, d: Math.hypot(p.x - from.x, p.y - from.y) };
  }
  function usable(h) {
    if (h.broke || h.taken) return false;
    if (h.kind === 'ice' && !has('ice_axe')) return false;
    return true;
  }
  function candidates() {
    var from = g.pos, out = [];
    g.wall.holds.forEach(function (h) {
      if (h === g.at || h.broke || h.taken) return;
      var r = reachTo(h, from);
      if (r.d > REACH || r.p.y < from.y - 30) return;
      if ((g.at.kind === 'ledge' || g.at.kind === 'top') && h.kind === 'ledge' && Math.abs(h.y - g.at.y) < 4) return;
      out.push({ h: h, p: r.p, d: r.d, ok: usable(h), a: Math.atan2(r.p.y - from.y, r.p.x - from.x) });
    });
    out.sort(function (a, b) { return b.a - a.a; });              // left to right across the top
    return out;
  }
  function refresh() {
    g.cands = candidates();
    var best = -1, by = -1e9;
    g.cands.forEach(function (c, i) { if (c.ok && c.p.y > by) { by = c.p.y; best = i; } });
    g.sel = best < 0 ? 0 : best;
  }

  function start(id) {
    var D = ROUTES[id];
    if (!D) return;
    ensure();
    R = id;
    wall = paintWall(id);
    var w = build(id);
    g = { wall: w, at: w.start, pos: anchorOf(w.start, 160), stam: 100, max: 100, t: 0, falls: 0, phase: 'ready', anim: null,
          gust: null, nextGust: 6 + Math.random() * 3, msg: '', camY: 0, crystals: 0, crumble: null, slip: 0, lastCp: w.start,
          snow: [], high: 0 };
    for (var i = 0; i < 60; i++) g.snow.push({ x: Math.random() * BW, y: Math.random() * BH, s: 0.3 + Math.random() * 0.7 });
    refresh();
    el.querySelector('.cl-title').textContent = D.name;
    el.querySelector('.cl-grade').textContent = 'Grade ' + D.grade;
    var best = save.routes[id] && save.routes[id].best;
    var warn = D.needs && !has(D.needs) ? ' You have no ice axe - the ice will be no use to you.' : '';
    var rope = D.fixed ? ' A fixed line runs all the way: a fall only takes you back to the last ledge.' :
      has('climbing_rope') ? ' You tie in to your rope: a fall takes you back to the last ledge.' : ' No rope: a fall takes you to the bottom.';
    intro(D.blurb + rope + warn + (best ? ' Your best: ' + fmt(best) + '.' : ''));
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

  function intro(text) {
    g.phase = 'ready';
    card('<b>' + ROUTES[R].name + '</b> &middot; grade ' + ROUTES[R].grade + '<br>' + text,
         [['Start climbing', go], ['Not today', close]]);
  }
  function go() { card(null); g.phase = 'climb'; g.t = 0; hint(); sfx('open'); }

  function hint() {
    var t = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'Tap a lit hold to reach for it.'
      : '← → choose a hold, ↑ reach. On a ledge you rest. C: chalk up. Esc: climb down.';
    el.querySelector('.cl-hint').textContent = t;
  }

  function reach(c) {
    if (!g || g.phase !== 'climb' || g.anim || !c) return;
    if (!c.ok) {
      sfx('error');
      say(c.h.kind === 'ice' ? 'Ice - you need an ice axe to use it.' : 'You can\'t use that.');
      return;
    }
    var cost = 3 + 8 * Math.pow(c.d / REACH, 2) + KIND[c.h.kind].cost;
    if (!warm()) cost += 1;
    g.stam -= cost;
    var to = anchorOf(c.h, g.pos.x);
    g.anim = { from: { x: g.pos.x, y: g.pos.y }, to: to, hand: c.p, h: c.h, t0: performance.now(), dur: 200 + c.d * 4 };
    sfx('step');
  }

  function arrive(h) {
    g.at = h;
    g.crumble = h.kind === 'loose' ? performance.now() + 1100 : null;
    g.slip = 0;
    if (h.cp && h.y >= g.lastCp.y) g.lastCp = h;
    if (h.kind === 'loose') { say('Loose! It shifts under your hand - move on.'); sfx('crumble'); }
    if (h.kind === 'crystal') {
      h.taken = true;
      g.crystals++;
      if (typeof BridgeInventory !== 'undefined') BridgeInventory.addItem('hoar_crystal', 1);
      sfx('pickup');
      say('A hoar crystal, prised out of the rock. Cold enough to burn.');
    }
    if (h.kind === 'ledge' && h !== g.wall.start) say(ROUTES[R].fixed || has('climbing_rope') ? 'A ledge. You clip into the bolt and shake out your arms.' : 'A ledge. Breathe.');
    if (h.kind === 'top') return summit();
    if (g.stam <= 0) return fall('Your arms give out.');
    refresh();
  }

  function fall(why) {
    if (g.phase !== 'climb') return;
    g.falls++;
    g.anim = null;
    var caught = ROUTES[R].fixed || has('climbing_rope');
    var to = caught ? g.lastCp : g.wall.start;
    g.phase = 'fall';
    g.fallAnim = { from: { x: g.pos.x, y: g.pos.y }, to: anchorOf(to, g.pos.x), h: to, t0: performance.now(), dur: 500 + Math.min(900, (g.pos.y - to.y) * 2) };
    sfx('fail');
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.takeDamage(6);
    say(why + ' ' + (caught ? 'The rope catches you at the last ledge.' : 'No rope - you slide all the way to the bottom.'));
  }

  function landed() {
    var h = g.fallAnim.h;
    g.at = h; g.pos = g.fallAnim.to; g.fallAnim = null; g.crumble = null;
    g.wall.holds.forEach(function (hh) { hh.broke = false; });      // the rock settles: loose holds are back, still loose
    g.stam = Math.max(g.stam, 30);
    g.phase = 'climb';
    var st = typeof BridgeInventory !== 'undefined' ? BridgeInventory.getStats() : { hp: 100 };
    if (st.hp <= 0) {
      close();
      if (typeof BridgeCombat !== 'undefined' && BridgeCombat.faint) BridgeCombat.faint();
      return;
    }
    refresh();
  }

  function summit() {
    var D = ROUTES[R], rec = save.routes[R] || (save.routes[R] = { ascents: 0, best: 0, paid: 0 });
    var first = !rec.ascents, t = g.t;
    rec.ascents++;
    var newBest = !rec.best || t < rec.best;
    if (newBest) rec.best = t;
    var pay = first ? D.first : rec.paid !== day() ? D.again : 0;
    if (pay) rec.paid = day();
    store();
    g.phase = 'top';
    sfx('quest');
    if (pay && typeof BridgeProgression !== 'undefined') BridgeProgression.awardCoins(pay, 'climb:' + R);
    if (first && D.gift && typeof BridgeInventory !== 'undefined') BridgeInventory.addItem(D.gift[0], D.gift[1]);
    if (first && typeof BridgeProgression !== 'undefined') BridgeProgression.recordAchievement('climbed_' + R, 0, { source: 'climb' });
    var gift = first && D.gift && typeof BridgeItems !== 'undefined' ? BridgeItems.get(D.gift[0]) : null;
    card('<b>THE TOP.</b> ' + D.name + ' in ' + fmt(t) + (newBest && !first ? ' - your best yet' : '') + '.<br>' +
         (g.falls ? g.falls + (g.falls === 1 ? ' fall' : ' falls') + '. ' : 'Not a single fall. ') +
         (g.crystals ? g.crystals + ' hoar crystal' + (g.crystals > 1 ? 's' : '') + '. ' : '') +
         (pay ? pay + ' coins' + (first ? ' for a first ascent' : '') + '. ' : '') +
         (gift ? 'And ' + (D.gift[1] > 1 ? D.gift[1] + ' ' : 'a ') + gift.name.toLowerCase() + (D.gift[1] > 1 ? 's' : '') + ', from the top.' : ''),
         [['Walk out onto the summit', function () { close(); toSummit(); }], ['Abseil back down', close]]);
  }

  function toSummit() {
    if (typeof BridgeWorld === 'undefined') return;
    var spawn = { staircase: [6, 14], icefall: [12, 14], hoarspire: [19, 14] }[R] || [12, 14];
    sfx('door');
    BridgeWorld.enterWorld('hoarfell-summit', spawn);
  }

  function chalk() {
    if (!g || g.phase !== 'climb') return;
    if (!has('chalk')) { sfx('error'); return say('No chalk. Ysolde sells it at the guide hut.'); }
    if (g.stam >= g.max - 2) return;
    BridgeInventory.removeItem('chalk', 1);
    g.stam = Math.min(g.max, g.stam + 25);
    g.chalkPuff = performance.now();
    sfx('sow');
  }

  // ---- the loop ------------------------------------------------------------------------------------------------
  function frame(now) {
    if (!g) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now);
    draw(now);
    hud();
    raf = requestAnimationFrame(frame);
  }

  function update(dt, now) {
    if (g.phase === 'fall') {
      var f = g.fallAnim, k = Math.min(1, (now - f.t0) / f.dur), e = k * k;
      g.pos = { x: f.from.x + (f.to.x - f.from.x) * k + Math.sin(k * 12) * 6 * (1 - k), y: f.from.y + (f.to.y - f.from.y) * e };
      if (k >= 1) landed();
    } else if (g.phase === 'climb') {
      g.t += dt;
      if (g.anim) {
        var a = g.anim, t = Math.min(1, (now - a.t0) / a.dur), s = t * t * (3 - 2 * t);
        g.pos = { x: a.from.x + (a.to.x - a.from.x) * s, y: a.from.y + (a.to.y - a.from.y) * s + Math.sin(t * Math.PI) * 3 };
        if (t >= 1) { g.pos = a.to; g.anim = null; arrive(a.h); return; }
      } else {
        var K = KIND[g.at.kind], resting = K.hang === 0;
        var gusting = g.gust && now > g.gust.start && now < g.gust.end;
        if (resting) g.stam = Math.min(g.max, g.stam + 22 * dt);
        else {
          var drain = 1.7 * K.hang * (warm() ? 1 : 1.6) * (gusting && g.at.kind !== 'jug' ? 3.2 : 1);
          g.stam -= drain * dt;
        }
        if (g.crumble && now > g.crumble) { g.at.broke = true; g.crumble = null; sfx('crumble'); return fall('The hold breaks away!'); }
        if (g.at.kind === 'sloper' && g.stam < 25) {
          g.slip += dt;
          if (g.slip > 0.9) return fall('Your fingers slide off the sloper.');
        }
        if (g.stam <= 0) return fall('Your arms give out.');
      }
      // wind on the Hoarspire: snow streaks rising first, then the gust
      if (ROUTES[R].wind && g.pos.y > 120) {
        g.nextGust -= dt;
        if (!g.gust && g.nextGust < 1.2) g.gust = { start: now + 1100, end: now + 1100 + 1600 };
        if (g.gust && now > g.gust.end) { g.gust = null; g.nextGust = 6 + Math.random() * 4; }
      }
      // held keys (touch has none)
    }
    var want = clamp(g.pos.y - BH * 0.42, 0, g.wall.height + 40 - BH * 0.6);
    g.camY += (want - g.camY) * Math.min(1, dt * 4);
    g.high = Math.max(g.high, g.pos.y);
  }

  // ---- drawing ----------------------------------------------------------------------------------------------------
  var peaks = null;
  function makePeaks() {
    var rnd = rngFor(77), far = [], mid = [];
    for (var x = 0; x <= BW; x += 4) {
      far.push(30 + 26 * vnoise(x / 40, 1, 3) + 14 * vnoise(x / 13, 2, 3) + (rnd() - 0.5) * 3);
      mid.push(18 + 22 * vnoise(x / 30, 5, 8) + 10 * vnoise(x / 9, 6, 8));
    }
    peaks = { far: far, mid: mid };
  }
  function sy(y) { return Math.round(BH - (y - g.camY)); }        // wall height → buffer row

  function draw(now) {
    var alt = clamp(g.camY / (g.wall.height + 40 - BH * 0.6 || 1), 0, 1);
    // the sky: alpenglow low down, violet and stars higher
    var sk = ctx.createLinearGradient(0, 0, 0, BH);
    sk.addColorStop(0, mix('#3a3a78', '#141436', alt));
    sk.addColorStop(0.55, mix('#a87ab0', '#4a3a7a', alt));
    sk.addColorStop(1, mix('#f0b0a0', '#a06a98', alt));
    ctx.fillStyle = sk; ctx.fillRect(0, 0, BW, BH);
    if (alt > 0.25) {
      for (var i = 0; i < 40; i++) {
        var a = (alt - 0.25) * 1.3 * (0.4 + 0.6 * Math.abs(Math.sin(now / 900 + i)));
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, a).toFixed(2) + ')';
        ctx.fillRect((i * 83) % BW, (i * 47) % (BH * 0.5), 1, 1);
      }
    }
    if (!peaks) makePeaks();
    var fy = BH * 0.66 + g.camY * 0.06, my = BH * 0.82 + g.camY * 0.14;
    ridgeline(peaks.far, fy, '#8a7cb0', '#f0b8c0');
    ridgeline(peaks.mid, my, '#4e4a7a', '#c890b0');
    // Fellhaven far below, its windows lit, sinking away as you climb (it shows either side of the face)
    var vy = BH - 22 + g.camY * 0.06;
    if (vy < BH) {
      ctx.fillStyle = '#d8e0ee'; ctx.fillRect(0, Math.round(vy), BW, BH);
      for (var v = 0; v < 9; v++) {
        var hx = 4 + v * 36 + (v % 3) * 5, hy = Math.round(vy + 4 + (v % 2) * 5);
        ctx.fillStyle = '#5a3a2a'; ctx.fillRect(hx, hy, 12, 6);
        ctx.fillStyle = '#f4f6fa'; ctx.fillRect(hx - 1, hy - 3, 14, 3);
        ctx.fillStyle = '#ffd890'; ctx.fillRect(hx + 3, hy + 2, 2, 2); ctx.fillRect(hx + 8, hy + 2, 2, 2);
      }
    }
    // the face
    var W = wall, srcY = Math.round(W.Hh - (g.camY + BH));
    ctx.drawImage(W.canvas, 0, srcY, W.canvas.width, BH, W.x0, 0, W.canvas.width, BH);
    // the fixed line up the Staircase
    if (ROUTES[R].fixed) {
      ctx.fillStyle = ROUTES[R].line;
      var prev = g.wall.start;
      g.wall.main.forEach(function (h) {
        var steps = 8;
        for (var s = 0; s <= steps; s++) {
          var x = prev.x + (h.x - prev.x) * s / steps + 3, y = prev.y + (h.y - prev.y) * s / steps;
          if (s % 2 === 0) ctx.fillRect(Math.round(x), sy(y), 1, 2);
        }
        prev = h;
      });
    }
    // holds
    g.wall.holds.forEach(function (h) { drawHold(h, now); });
    // the holds in reach
    if (g.phase === 'climb' && !g.anim) {
      g.cands.forEach(function (c, i) {
        var x = Math.round(c.p.x), y = sy(c.p.y), on = i === g.sel, pulse = 0.5 + 0.5 * Math.sin(now / 200);
        ctx.strokeStyle = !c.ok ? 'rgba(240,90,80,0.8)' : on ? 'rgba(255,240,160,' + (0.7 + 0.3 * pulse).toFixed(2) + ')' : 'rgba(200,230,255,0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - (on ? 6 : 5) + 0.5, y - (on ? 5 : 4) + 0.5, on ? 12 : 10, on ? 10 : 8);
        if (on) {
          ctx.fillStyle = 'rgba(255,240,160,0.5)';
          var hx = g.pos.x, hy = g.pos.y;
          for (var s2 = 1; s2 < 6; s2++) ctx.fillRect(Math.round(hx + (c.p.x - hx) * s2 / 6), sy(hy + (c.p.y - hy) * s2 / 6), 1, 1);
        }
      });
    }
    drawClimber(now);
    // chalk puff
    if (g.chalkPuff && now - g.chalkPuff < 500) {
      var k = (now - g.chalkPuff) / 500;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)).toFixed(2) + ')';
      for (var p = 0; p < 8; p++) ctx.fillRect(Math.round(g.pos.x + Math.cos(p) * k * 10), sy(g.pos.y - 6) + Math.round(Math.sin(p) * k * 6), 2, 2);
    }
    // snow, and the wind
    var gust = g.gust && now > g.gust.start - 1100 && now < g.gust.end, blowing = g.gust && now > g.gust.start;
    g.snow.forEach(function (f) {
      f.y += (blowing ? 0.2 : 0.35 + f.s * 0.35); f.x += blowing ? 3.5 * f.s : Math.sin(now / 900 + f.s * 9) * 0.2;
      if (gust && !blowing) f.y -= 0.6;
      if (f.y > BH) { f.y = -2; f.x = Math.random() * BW; }
      if (f.x > BW) f.x -= BW;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + f.s * 0.4).toFixed(2) + ')';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), blowing ? 3 : 1, 1);
    });
    if (blowing) { ctx.fillStyle = 'rgba(220,235,255,0.12)'; ctx.fillRect(0, 0, BW, BH); }
    // the cold creeping in at the edges when you've no thermal suit
    if (!warm()) {
      var fr = ctx.createRadialGradient(BW / 2, BH / 2, BH * 0.45, BW / 2, BH / 2, BW * 0.62);
      fr.addColorStop(0, 'rgba(200,230,255,0)'); fr.addColorStop(1, 'rgba(200,230,255,0.28)');
      ctx.fillStyle = fr; ctx.fillRect(0, 0, BW, BH);
    }
  }

  function mix(a, b, t) {
    var A = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    var B = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')';
  }
  function ridgeline(hs, base, fill, rim) {
    ctx.fillStyle = fill;
    for (var i = 0; i < hs.length; i++) {
      var x = i * 4, top = Math.round(base - hs[i]);
      ctx.fillRect(x, top, 4, BH - top);
    }
    ctx.fillStyle = rim;
    for (var j = 0; j < hs.length - 1; j++) {
      if (hs[j + 1] < hs[j]) continue;                            // the sunlit (left-facing) slopes catch the glow
      ctx.fillRect(j * 4, Math.round(base - hs[j]), 4, 1);
    }
  }

  function drawHold(h, now) {
    var y = sy(h.y), x = Math.round(h.x);
    if (y < -20 || y > BH + 20) return;
    if (h.broke) return;
    if (h.kind === 'ledge' || h.kind === 'top') {
      var w = Math.round(h.w);
      ctx.fillStyle = '#20222c'; ctx.fillRect(x - (w >> 1), y, w, 4);
      ctx.fillStyle = '#5a6074'; ctx.fillRect(x - (w >> 1), y, w, 2);
      ctx.fillStyle = '#eef2fa'; ctx.fillRect(x - (w >> 1) + 1, y - 2, w - 2, 2);
      if (h.kind === 'top') { ctx.fillStyle = '#c83a2e'; ctx.fillRect(x + 40, y - 18, 1, 16); ctx.fillRect(x + 41, y - 18, 7, 4); }
      else if (h.cp) { ctx.fillStyle = '#c0c4cc'; ctx.fillRect(x + (w >> 1) - 6, y - 7, 2, 2); }
      return;
    }
    var c = { jug: ['#2a1a10', '#a0744a', '#d8a870'], crimp: ['#1a1418', '#7a6a6a', '#b8a8a0'], sloper: ['#1a1a22', '#6a7080', '#9aa0b0'],
              ice: ['#1a3a5a', '#7ac0e8', '#e0f6ff'], loose: ['#2a1a14', '#8a6a5a', '#b89a80'], crystal: ['#1a2a5a', '#7ac8ff', '#e8f8ff'] }[h.kind];
    if (h.kind === 'jug') { ctx.fillStyle = c[0]; ctx.fillRect(x - 3, y - 2, 7, 5); ctx.fillStyle = c[1]; ctx.fillRect(x - 2, y - 2, 5, 3); ctx.fillStyle = c[2]; ctx.fillRect(x - 2, y - 2, 2, 1); }
    else if (h.kind === 'crimp') { ctx.fillStyle = c[0]; ctx.fillRect(x - 3, y - 1, 7, 2); ctx.fillStyle = c[2]; ctx.fillRect(x - 3, y - 1, 7, 1); }
    else if (h.kind === 'sloper') { ctx.fillStyle = c[0]; ctx.fillRect(x - 4, y - 1, 9, 3); ctx.fillStyle = c[1]; ctx.fillRect(x - 3, y - 2, 7, 2); ctx.fillStyle = c[2]; ctx.fillRect(x - 2, y - 2, 3, 1); }
    else if (h.kind === 'ice') { ctx.fillStyle = c[0]; ctx.fillRect(x - 1, y - 3, 3, 6); ctx.fillStyle = c[2]; ctx.fillRect(x, y - 3, 1, 4); ctx.fillStyle = c[1]; ctx.fillRect(x - 2, y + 1, 5, 1); }
    else if (h.kind === 'loose') {
      var sh = g.at === h && g.crumble ? Math.round(Math.sin(now / 30)) : 0;
      ctx.fillStyle = c[0]; ctx.fillRect(x - 3 + sh, y - 2, 7, 5); ctx.fillStyle = c[1]; ctx.fillRect(x - 2 + sh, y - 2, 5, 3);
      ctx.fillStyle = c[0]; ctx.fillRect(x + sh, y - 2, 1, 4);
    } else if (h.kind === 'crystal' && !h.taken) {
      var p = 0.5 + 0.5 * Math.sin(now / 300 + h.id);
      ctx.fillStyle = 'rgba(120,200,255,' + (0.18 + 0.15 * p).toFixed(2) + ')'; ctx.fillRect(x - 5, y - 6, 11, 11);
      ctx.fillStyle = c[0]; ctx.fillRect(x - 2, y - 4, 5, 7); ctx.fillStyle = c[1]; ctx.fillRect(x - 1, y - 4, 3, 6); ctx.fillStyle = c[2]; ctx.fillRect(x, y - 4, 1, 3);
    }
  }

  function drawClimber(now) {
    var col = SUIT[(typeof BridgeGear !== 'undefined' && BridgeGear.colour()) || (BridgeState.getPilot() || {}).suit_color] || SUIT.purple;
    var hx = Math.round(g.pos.x), hy = sy(g.pos.y);
    var standing = !g.anim && g.phase !== 'fall' && (g.at.kind === 'ledge' || g.at.kind === 'top');
    var by = standing ? hy + 6 : hy + 10;                             // shoulders
    var reachHand = g.anim ? g.anim.hand : null;
    var dark = '#14141c';
    // legs: to footholds below if there are any, else hanging
    var feet = [];
    if (!standing) {
      g.wall.holds.forEach(function (h) {
        if (feet.length < 2 && !h.broke && h.kind !== 'top' && h.y < g.pos.y - 14 && h.y > g.pos.y - 34 && Math.abs(h.x - g.pos.x) < 14) feet.push(h);
      });
    }
    var hipY = by + 9;
    ctx.fillStyle = '#2a2a38';
    [-1, 1].forEach(function (s, i) {
      var fx, fy;
      if (standing) { fx = hx + s * 2; fy = hy + 19; }
      else if (feet[i]) { fx = Math.round(feet[i].x); fy = sy(feet[i].y); }
      else { fx = hx + s * 3 + Math.round(Math.sin(now / 300 + i) * 1); fy = hipY + 10; }
      line(hx + s, hipY, fx, fy, '#2a2a38');
      ctx.fillStyle = dark; ctx.fillRect(fx - 1, fy - 1, 3, 2);
    });
    // body, pack, head
    ctx.fillStyle = dark; ctx.fillRect(hx - 4, by - 1, 9, 12);
    ctx.fillStyle = col; ctx.fillRect(hx - 3, by, 7, 10);
    ctx.fillStyle = '#5a4030'; ctx.fillRect(hx - 2, by + 2, 5, 6);
    ctx.fillStyle = dark; ctx.fillRect(hx - 3, by - 7, 7, 7);
    ctx.fillStyle = col; ctx.fillRect(hx - 2, by - 6, 5, 5);
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(hx - 1, by - 6, 2, 1);
    // arms: both hands on the hold (or one reaching for the next)
    var hands = standing ? [[hx - 5, by + 4], [hx + 5, by + 4]] : [[hx - 2, hy], [hx + 2, hy]];
    if (reachHand) {
      var t = Math.min(1, (performance.now() - g.anim.t0) / g.anim.dur);
      hands[1] = [Math.round(hx + (reachHand.x - hx) * Math.min(1, t * 2)), Math.round(hy + (sy(reachHand.y) - hy) * Math.min(1, t * 2))];
    }
    hands.forEach(function (hd, i) {
      line(hx + (i ? 3 : -3), by + 1, hd[0], hd[1], col);
      ctx.fillStyle = '#e8c8a8'; ctx.fillRect(hd[0] - 1, hd[1] - 1, 2, 2);
    });
    // the rope trailing down when you're tied in
    if (ROUTES[R].fixed || has('climbing_rope')) {
      var cp = g.lastCp, cx = Math.round(cp.x), cy = sy(cp.y);
      ctx.fillStyle = ROUTES[R].line;
      var n = Math.max(2, Math.round(Math.abs(cy - hipY) / 3));
      for (var s = 0; s <= n; s++) {
        var k2 = s / n, sag = Math.sin(k2 * Math.PI) * 6;
        ctx.fillRect(Math.round(hx + (cx - hx) * k2 + sag), Math.round(hipY + (cy - hipY) * k2), 1, 1);
      }
    }
  }
  function line(x0, y0, x1, y1, c) {
    ctx.fillStyle = c;
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (var i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 2, 2);
  }

  // ---- the panel ------------------------------------------------------------------------------------------------------
  function ensure() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'climb';
    el.innerHTML = '<div class="cl-panel">' +
      '<div class="cl-head"><span class="cl-title"></span><span class="cl-grade"></span><span class="cl-time"></span>' +
      '<button class="qj-close cl-close" aria-label="Climb down"><span class="ip-key">Esc</span></button></div>' +
      '<div class="cl-stage"><canvas class="cl-wall"></canvas><div class="cl-card"></div></div>' +
      '<div class="cl-bar"><span class="cl-lbl">Arms</span><span class="cl-stam"><i></i></span>' +
      '<span class="cl-alt"></span><button class="cl-chalk"><span class="ip-key">C</span> Chalk <b></b></button></div>' +
      '<div class="cl-msg"></div><div class="cl-hint"></div></div>';
    document.body.appendChild(el);
    cv = el.querySelector('.cl-wall'); ctx = cv.getContext('2d');
    cv.width = BW; cv.height = BH;
    ctx.imageSmoothingEnabled = false;
    el.querySelector('.cl-close').addEventListener('click', giveUp);
    el.querySelector('.cl-chalk').addEventListener('click', chalk);
    cv.addEventListener('pointerdown', function (e) {
      if (!g || g.phase !== 'climb') return;
      var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * BW, y = (e.clientY - r.top) / r.height * BH;
      var best = null, bd = 14;
      g.cands.forEach(function (c) { var d = Math.hypot(c.p.x - x, sy(c.p.y) - y); if (d < bd) { bd = d; best = c; } });
      if (best) reach(best);
    });
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
    if (!html) { c.style.display = 'none'; return; }
    c.innerHTML = '<p>' + html + '</p><div class="cl-btns">' + buttons.map(function (b, i) { return '<button data-i="' + i + '"' + (i ? '' : ' class="primary"') + '>' + b[0] + '</button>'; }).join('') + '</div>';
    c.style.display = 'flex';
    c.querySelectorAll('button').forEach(function (bt) { bt.addEventListener('click', function () { buttons[+bt.getAttribute('data-i')][1](); }); });
    g.cardButtons = buttons;
  }
  var msgTimer = 0;
  function say(t) {
    var m = el.querySelector('.cl-msg');
    m.textContent = t;
    m.classList.add('on');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { m.classList.remove('on'); }, 3200);
  }
  function fmt(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function hud() {
    var st = el.querySelector('.cl-stam i'), pct = clamp(g.stam / g.max, 0, 1);
    st.style.width = Math.round(pct * 100) + '%';
    st.style.background = pct < 0.25 ? '#e05a4a' : pct < 0.5 ? '#e0b040' : '#7ad0f0';
    el.querySelector('.cl-alt').textContent = Math.max(0, Math.round(g.pos.y / 6)) + ' m of ' + Math.round(g.wall.height / 6);
    el.querySelector('.cl-time').textContent = g.phase === 'ready' ? '' : fmt(g.t);
    el.querySelector('.cl-chalk b').textContent = typeof BridgeInventory !== 'undefined' ? BridgeInventory.getCount('chalk') : 0;
  }

  function giveUp() { close(); }
  function close() {
    if (!el || !el.classList.contains('visible')) return;
    el.classList.remove('visible');
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('resize', fit);
    g = null;
    if (typeof BridgeControls !== 'undefined') BridgeControls.enable();
  }

  function onKey(e) {
    if (!g) return;
    var k = e.key;
    e.preventDefault(); e.stopPropagation();
    if (k === 'Escape') return giveUp();
    if (e.repeat && !/Arrow/.test(k)) return;
    if (g.phase === 'ready' || g.phase === 'top') {
      if ((k === 'Enter' || k === ' ' || k === 'e' || k === 'E') && g.cardButtons) g.cardButtons[0][1]();
      return;
    }
    if (g.phase !== 'climb') return;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (g.cands.length) g.sel = (g.sel + 1) % g.cands.length; sfx('click'); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (g.cands.length) g.sel = (g.sel - 1 + g.cands.length) % g.cands.length; sfx('click'); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'e' || k === 'E' || k === 'Enter') reach(g.cands[g.sel]);
    else if (k === 'c' || k === 'C') chalk();
  }
  function onKeyUp(e) { if (g) { e.preventDefault(); e.stopPropagation(); } }

  // the route board at the guide hut
  function board() {
    var lines = Object.keys(ROUTES).map(function (id) {
      var D = ROUTES[id], r = save.routes[id];
      return D.name + ' (' + D.grade + ') - ' + D.blurb.toUpperCase() + '\n   ' +
        (r && r.ascents ? 'YOU: ' + r.ascents + (r.ascents === 1 ? ' ASCENT' : ' ASCENTS') + ', BEST ' + fmt(r.best) : 'NOT YET CLIMBED');
    });
    if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say('ROUTE BOARD', 'CHALKED ON A SLATE UNDER A LITTLE ROOF:\n\n' + lines.join('\n\n'));
  }

  return { start: start, board: board, close: close, ROUTES: ROUTES, isOpen: function () { return !!g; },
           records: function (id) { return save.routes[id] || null; },
           _g: function () { return g; }, _reach: function (i) { if (g) reach(g.cands[i == null ? g.sel : i]); } };
})();
