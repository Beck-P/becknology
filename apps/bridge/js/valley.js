/**
 * BridgeValley — Hoarfell's hidden valley: what lives there. Beck: "we should have some levels of enemies… they don't
 * need to be the yetis." Warm from below, the valley gets wilder the deeper you go, and the creatures with it:
 *
 *   the outer slopes (hoarfell-valley)      ICE WOLVES — quick, in packs of two or three: the first to see you howls
 *                                           and the pack comes; while one goes for you the others circle to your far
 *                                           side, and from two tiles out they lunge
 *   the glacier caves (hoarfell-caves)      RIME BEETLES — a shell that glances a blow from the front (strike from the
 *                                           side or behind, or with something heavy, or charged); they turn slowly,
 *                                           and spit frost two tiles down a line.  ICE BATS — flutter about, hard to
 *                                           pin (a blow can miss them, unless it sweeps or it's charged), and dive at
 *                                           you down a line, through you and out the other side; fragile
 *   the frozen monastery                    RIME GOLEMS — slow, a long wind-up and a slam over the 3×3 round you;
 *     (hoarfell-monastery)                  frost armour takes most of a blow until fire, a heavy weapon or a charged
 *                                           blow has cracked it (three of them).  FROST WRAITHS — the restless dead:
 *                                           they keep their distance, blink away when struck, and throw a chill bolt
 *                                           down a line; holy bites them
 *   the heart (hoarfell-heart)              THE GLACIER WYRM, once a day: it swims under the snow — only ripples and a
 *                                           moving bulge show, and nothing touches it there — then the ripples close
 *                                           in on where it will break up through the snow (the 3×3 is marked), it
 *                                           bursts out, lies exposed a few seconds (bite, tail sweep) and dives again.
 *                                           At two thirds and a third it quickens and icicles rain from the vault
 *                                           (their landing spots marked). It drops the Wyrmfang the first time.
 *
 * The creature kinds come in through BridgeCombat.kind (js/combat.js); the stalk-and-strike machine in
 * js/interactions.js runs them, these hooks shape what each does. Spots come from the world JSON's `valley` block when
 * it has one — `{ spawns: [[kind, x, y], …], yetis: [[x, y], …] }` — else a seeded scan of the open ground, the same
 * every visit. They're back each time you come (the wyrm once a day).
 *
 * THE YETIS stay shy and friendly (type `yeti`, not hostile): big, white, gentle, wandering near home. Walk at one
 * quickly and it backs off and hides behind the nearest rock, peeking; stand still and it comes a little closer. Give
 * it something to eat (berries, apples, honey, a sweet roll, chestnuts, edelweiss…) once a day and it trusts you a
 * little more (saved in localStorage `bridge_valley`): fed once, you learn its name and it sits near you; then it
 * follows you a little; at three it shows you something (a cache of hoar crystals, or a hidden hot spring); at five it
 * walks with you through the valley, and the creatures keep their distance from it.
 *
 *   BridgeValley.decorate(worldId, data)     spawns the roster and the yetis (from world.js, as a world loads)
 *   BridgeValley._spawn(kind, x, y)          tests: a creature in the current world     _yeti(x, y, i)  _day(shift)
 */
var BridgeValley = (function () {
  var KEY = 'bridge_valley';
  var save = load();
  var shift = 0;                                   // tests: days added to today
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* fresh */ }
    s = s || {};
    s.yetis = s.yetis || {}; s.found = s.found || {};
    return s;
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function today() { var d = new Date(Date.now() + shift * 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function say(l, t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(l, t); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c); }
  function text(x, y, t, c) { if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(x, y - 0.3, t, c); }
  function sparks(x, y, c, n) { if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) BridgeFX.spawnSparks(x, y, c, n); }
  function shake(n) { if (typeof BridgeCombat !== 'undefined' && BridgeCombat.shake) BridgeCombat.shake(n); }
  function me() { return typeof BridgeCharacter !== 'undefined' ? { x: BridgeCharacter.getX(), y: BridgeCharacter.getY() } : null; }
  function open(world, x, y) { return world.collisions[y] && world.collisions[y][x] === 0; }
  function sgn(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
  function rnd(seed) { var a = 0; for (var i = 0; i < seed.length; i++) a = (Math.imul(a ^ seed.charCodeAt(i), 2654435761) >>> 0); return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // a heavy blow: what cracks armour and drives through a shell (a maul, a greatsword, a pick, anything charged)
  function heavy(w) { return !!(w && (w.heavy || w.charged || w.cls === 'maul' || w.cls === 'great' || w.cls === 'pick')); }
  // where the blow came from (you, or whoever struck it — js/fight.js sends w.from)
  function from(w) { return (w && w.from) || me(); }
  // step a creature one tile, the way the machine's tryStep does (the collisions follow it)
  function step(world, h, dx, dy) {
    var nx = h.x + dx, ny = h.y + dy, p = me();
    if (!open(world, nx, ny) || (p && p.x === nx && p.y === ny)) return false;
    if (world.interactions.some(function (o) { return o !== h && o.type === 'hostile' && o.x === nx && o.y === ny; })) return false;
    world.collisions[h.y][h.x] = 0; h.x = nx; h.y = ny; world.collisions[ny][nx] = 1;
    return true;
  }
  // a creature with a trusted yeti beside you keeps its distance (returns true when it's backing off this frame)
  function daunted(world, h, player, now) {
    if (!player || !walker || walker.world !== world) return false;
    var d = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y);
    if (d > 4) return false;
    if (h._attackPhase === 'winding') { h._attackPhase = 'recovering'; h._attackStart = now; h._attackTarget = null; }
    if (now - (h._lastMove || 0) > (h.moveCooldown || 600)) {
      var dx = -sgn(player.getX() - h.x), dy = -sgn(player.getY() - h.y);
      if (!step(world, h, dx, 0)) step(world, h, 0, dy);
      h._lastMove = now;
    }
    return true;
  }
  function line(h, t, n) {                     // the tiles down a straight line from h toward t (up to n)
    var dx = sgn(t.x - h.x), dy = sgn(t.y - h.y), out = [];
    if (dx && dy) return [[t.x, t.y]];
    for (var i = 1; i <= n; i++) out.push([h.x + dx * i, h.y + dy * i]);
    return out;
  }
  function px(ctx, u) { return function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * u), Math.round(y * u), Math.round(w * u), Math.round(h * u)); }; }
  // An outlined painter on the 16-unit grid: shapes are collected, then drawn twice — first every one a unit fatter in
  // the outline colour (so the line runs round the whole silhouette, not round each piece of it), then their fills in
  // order. E an ellipse (`jag(row)` roughens its edge: fur, rubble), S a limb (a square brush along a line), T a
  // triangle (ears, spines, jaws), R a small detail; `inner` shapes are shading and get no outline.
  function painter(ctx, u) {
    var list = [];
    function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * u), Math.round(y * u), Math.round(w * u), Math.round(h * u)); }
    function ell(o, c, grow) {
      var rx = o.rx + grow, ry = o.ry + grow;
      for (var y = -ry; y <= ry; y++) {
        var k = 1 - (y * y) / ((ry + 0.5) * (ry + 0.5));
        if (k <= 0) continue;
        var hw = Math.round(rx * Math.sqrt(k)) + (o.jag ? o.jag(y) : 0);
        if (hw >= 0) rect(o.x - hw, o.y + y, hw * 2 + 1, 1, c);
      }
    }
    function seg(o, c, grow) {
      var n = Math.max(1, Math.round(Math.max(Math.abs(o.x1 - o.x0), Math.abs(o.y1 - o.y0)))), w = o.w + grow * 2;
      for (var i = 0; i <= n; i++) {
        var x = Math.round(o.x0 + (o.x1 - o.x0) * i / n), y = Math.round(o.y0 + (o.y1 - o.y0) * i / n);
        rect(x - Math.floor(w / 2), y - Math.floor(w / 2), w, w, c);
      }
    }
    function tri(o, c, dx, dy) {
      var p = o.p, y0 = Math.min(p[0][1], p[1][1], p[2][1]), y1 = Math.max(p[0][1], p[1][1], p[2][1]);
      for (var y = Math.round(y0); y <= Math.round(y1); y++) {
        var xs = [];
        for (var i = 0; i < 3; i++) {
          var a = p[i], b = p[(i + 1) % 3];
          if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) xs.push(a[1] === b[1] ? a[0] : a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
          if (a[1] === b[1] && a[1] === y) xs.push(b[0]);
        }
        if (!xs.length) continue;
        var lo = Math.round(Math.min.apply(null, xs)), hi = Math.round(Math.max.apply(null, xs));
        rect(lo + dx, y + dy, hi - lo + 1, 1, c);
      }
    }
    function one(o, c, grow) { if (o.k === 'e') ell(o, c, grow); else if (o.k === 's') seg(o, c, grow); else if (o.k === 't') tri(o, c, 0, 0); else rect(o.x, o.y, o.w, o.h, c); }
    var P = {
      E: function (x, y, rx, ry, c, o) { list.push({ k: 'e', x: Math.round(x), y: Math.round(y), rx: Math.max(0, Math.round(rx)), ry: Math.max(0, Math.round(ry)), c: c, jag: o && o.jag, inner: o && o.inner }); return P; },
      S: function (x0, y0, x1, y1, w, c, o) { list.push({ k: 's', x0: x0, y0: y0, x1: x1, y1: y1, w: w, c: c, inner: o && o.inner }); return P; },
      T: function (p, c, o) { list.push({ k: 't', p: p, c: c, inner: o && o.inner }); return P; },
      R: function (x, y, w, h, c) { list.push({ k: 'r', x: x, y: y, w: w, h: h, c: c, inner: true }); return P; },
      go: function (OL) {
        list.forEach(function (o) {
          if (o.inner) return;
          if (o.k === 't') [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { tri(o, OL, d[0], d[1]); });
          else one(o, OL, 1);
        });
        list.forEach(function (o) { one(o, o.c, 0); });
        list = [];
      }
    };
    return P;
  }
  function shag(seed, n) { return function (y) { return (((y * 7 + seed) % (n || 3)) + (n || 3)) % (n || 3) === 0 ? 1 : 0; }; }

  function moving(h) { return Math.abs(h._rx - h.x) > 0.02 || Math.abs(h._ry - h.y) > 0.02; }

  // ---- the ice wolf ------------------------------------------------------------------------------------------------
  function drawWolf(ctx, h, u, t, st) {
    var P = painter(ctx, u);
    ctx.scale(h._face || 1, 1);
    var OL = '#141c2a', W = '#f2f8ff', PL = '#c2d0e4', S = '#8798b8', D = '#566a8e', EYE = st.wind || st.strike ? '#ffffff' : '#b8e4ff';
    var run = moving(h) && !st.wind, cr = st.wind ? 2 : 0, by = -10 + cr;
    var g = t * 12, a = run ? Math.sin(g) : 0, b = run ? Math.cos(g) : 0;
    function leg(hx, fx, knee, col) {                                    // hip, foot, the knee's lean (back for the hind legs)
      var ky = by + 5 - Math.round(cr / 2);
      P.S(hx, by + 2, hx + knee, ky, 2, col).S(hx + knee, ky, fx, -1, 2, col).R(fx - 1, -1, 2, 1, D);
    }
    // the far legs, darker; the hind ones bent back at the hock, the fore ones straight; a gallop swings them in pairs
    var reach = st.strike ? 3 : 0;
    leg(-5, -6 - Math.round(a * 3) - reach, -1, D);
    leg(5, 6 + Math.round(b * 3) + reach, 1, D);
    // the tail, long and bushy, held low behind
    var tw = Math.round(Math.sin(t * 3));
    P.S(-8, by - 1, -12, by + 2 + tw, 3, PL).S(-12, by + 2 + tw, -14, by + 5 + tw, 2, W);
    // the body: a rump, a tucked waist, a deep chest; the neck and head reaching forward
    P.E(-5, by, 4, 3, PL).E(0, by - 1, 4, 2, PL).E(5, by + 1, 4, 4, PL);
    P.S(6, by - 2, 8, by - 5, 4, PL);
    P.E(10, by - 6, 3, 2, PL);
    P.T([[11, by - 8], [15, by - 5], [11, by - 4]], PL);                 // the snout
    P.T([[8, by - 7], [9, by - 11], [10, by - 7]], S).T([[10, by - 7], [11, by - 11], [12, by - 7]], S);   // ears pricked
    if (st.wind) for (var k = 0; k < 4; k++) P.T([[-6 + k * 3, by - 3], [-5 + k * 3, by - 6], [-4 + k * 3, by - 3]], D);   // hackles up
    // shading: a dark saddle along the back, a white chest and belly, a lit cheek
    P.E(-2, by - 2, 6, 1, D, { inner: true }).E(4, by - 2, 2, 0, D, { inner: true });
    P.E(6, by + 3, 2, 2, W, { inner: true }).E(0, by + 1, 3, 0, W, { inner: true }).E(-6, by + 2, 2, 0, S, { inner: true });
    P.E(10, by - 5, 2, 0, W, { inner: true }).R(9, by - 9, 1, 1, D).R(11, by - 9, 1, 1, D);
    P.R(14, by - 6, 2, 1, '#141c2a').R(11, by - 7, 2, 1, EYE).R(10, by - 8, 2, 1, D);
    if (st.wind || st.strike) P.R(12, by - 4, 3, 1, '#5a1a2a').R(14, by - 4, 1, 1, '#ffffff');
    // the near legs over the belly, pale
    leg(-4, -4 + Math.round(a * 3) - reach, -1, PL);
    leg(6, 7 - Math.round(b * 3) + reach, 1, W);
    P.go(OL);
    var br = (t * 0.7) % 1;                                                // breath smoking in the cold
    if (br < 0.5) { ctx.globalAlpha = 0.55 * (1 - br * 2); ctx.fillStyle = '#f0f8ff'; ctx.fillRect(Math.round((15 + br * 3) * u), Math.round((by - 7 - br * 5) * u), 2 * u, u); ctx.globalAlpha = 1; }
  }
  function wolfTick(world, h, now, player) {
    if (!player) return 1;
    if (daunted(world, h, player, now)) return 1;
    var d = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y);
    if (!h._howled && d <= h.aggroRange) {                                  // the first to see you calls the pack
      world.interactions.forEach(function (o) {
        if (o.creature !== 'wolf' || o._pack !== h._pack) return;
        o._howled = true; o.aggroRange = 16;
      });
      h._howler = now; sfx('howl'); text(h.x, h.y - 0.4, 'AWOOO', '#d8ecff');
    }
    if (h._attackPhase && h._attackPhase !== 'idle') return 1;
    if (d <= 2 || d > h.aggroRange) return 1;
    // the pack's nearest goes straight at you (the machine walks it); the others circle to your far side
    var lead = null, ld = 1e9;
    world.interactions.forEach(function (o) {
      if (o.creature !== 'wolf' || o._pack !== h._pack) return;
      var od = Math.abs(player.getX() - o.x) + Math.abs(player.getY() - o.y);
      if (od < ld) { ld = od; lead = o; }
    });
    if (!lead || lead === h || now - (h._lastMove || 0) < h.moveCooldown) return 1;
    var sx = sgn(player.getX() - lead.x) || 1, sy = sgn(player.getY() - lead.y);
    var gx = player.getX() + sx * 2, gy = player.getY() + (sy || (h.seed > 50 ? 1 : -1)) * (sy ? 2 : 1);
    var dx = sgn(gx - h.x), dy = sgn(gy - h.y);
    var moved = Math.abs(gx - h.x) >= Math.abs(gy - h.y) ? (dx && step(world, h, dx, 0)) || (dy && step(world, h, 0, dy)) : (dy && step(world, h, 0, dy)) || (dx && step(world, h, dx, 0));
    if (moved) h._lastMove = now;
    return 1;
  }

  // ---- the rime beetle --------------------------------------------------------------------------------------------
  var DIRV = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  function dirTo(h, x, y) { var dx = x - h.x, dy = y - h.y; return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); }
  function drawBeetle(ctx, h, u, t, st) {
    var p = px(ctx, u), dir = h._dir || 'down';
    var OL = '#0c121c', SD = '#23405e', SM = '#46729e', SL = '#9ccde8', IC = '#e8f8ff', EYE = st.eye || '#80f0ff';
    var mv = moving(h);
    if (dir === 'left') ctx.scale(-1, 1);
    var side = dir === 'left' || dir === 'right';
    for (var i = 0; i < 3; i++) {                                          // legs, scuttling
      var lg = mv && Math.sin(t * 16 + i * 2) > 0 ? 1 : 0;
      var lx = side ? -7 + i * 5 : -9 + i * 9;
      p(lx - lg, -3, 2, 3, OL); p(lx + 1, -4, 1, 1, OL);
    }
    var W = side ? [3, 5, 7, 8, 9, 9, 9, 9, 8] : [4, 6, 8, 9, 10, 10, 10, 10, 9];
    for (var r = 0; r < 9; r++) {                                          // the domed shell, lit from above
      var hw = W[r];
      p(-hw - 1, -13 + r, (hw + 1) * 2, 1, OL);
      p(-hw, -13 + r, hw * 2, 1, r < 2 ? SL : r < 5 ? SM : SD);
    }
    p(-9, -4, 18, 1, OL);
    if (!side) p(0, -12, 1, 8, dir === 'up' ? OL : SD);                    // the split down its back
    for (var c = 0; c < 4; c++) {                                          // rime crystals growing on the shell
      var cx = side ? -5 + c * 3 : -6 + c * 4, ch = 1 + ((c * 7 + 3) % 3);
      p(cx - 1, -14 - ch, 3, ch + 1, OL); p(cx, -14 - ch + 1, 1, ch, IC);
    }
    var gl = 0.5 + 0.5 * Math.sin(t * 3 + (h.seed || 0));
    ctx.globalAlpha = 0.6 + 0.4 * gl; p(side ? -3 : -4, -11, 1, 1, '#ffffff'); ctx.globalAlpha = 1;
    if (side) {                                                            // the head and mandibles, at the front
      p(8, -9, 5, 6, OL); p(9, -8, 3, 4, SD); p(10, -8, 1, 1, EYE);
      var op = st.wind ? 1 : 0;
      p(13, -8 - op, 2, 1, OL); p(13, -5 + op, 2, 1, OL); p(14, -7 - op, 1, 1, SL); p(14, -4 + op, 1, 1, SL);
      if (st.wind && h._kind === 'spit') { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 30); p(13, -7, 2, 2, '#c8f4ff'); ctx.globalAlpha = 1; }
    } else if (dir === 'down') {
      p(-4, -5, 8, 5, OL); p(-3, -5, 6, 3, SD); p(-2, -4, 1, 1, EYE); p(1, -4, 1, 1, EYE);
      var o2 = st.wind ? 1 : 0;
      p(-4 - o2, -1, 2, 2, OL); p(2 + o2, -1, 2, 2, OL); p(-3 - o2, 0, 1, 1, SL); p(2 + o2, 0, 1, 1, SL);
    }
  }
  function beetleTick(world, h, now, player) {
    if (h._px !== undefined && (h._px !== h.x || h._py !== h.y)) h._dir = h.x > h._px ? 'right' : h.x < h._px ? 'left' : h.y > h._py ? 'down' : 'up';
    h._px = h.x; h._py = h.y;
    if (!player) return 1;
    if (daunted(world, h, player, now)) return 1;
    // it turns to face you only slowly, and not at all mid-attack: get round to its side
    if ((!h._attackPhase || h._attackPhase === 'idle') && now - (h._turnAt || 0) > 1100) {
      var want = dirTo(h, player.getX(), player.getY());
      if (want !== h._dir) { h._dir = want; h._turnAt = now; }
    }
    return 1;
  }
  function beetleGuard(world, h, dmg, w) {
    var f = from(w), v = DIRV[h._dir || 'down'];
    if (!f) return dmg;
    var rx = f.x - h.x, ry = f.y - h.y, dot = rx * v[0] + ry * v[1];
    var front = dot > 0 && Math.abs(dot) >= Math.abs(rx * v[1]) + Math.abs(ry * v[0]);
    var behind = dot < 0 && Math.abs(dot) >= Math.abs(rx * v[1]) + Math.abs(ry * v[0]);
    if (front && !heavy(w)) {
      var now = performance.now();
      if (now - (h._glance || 0) > 300) { h._glance = now; sfx('icecrack'); text(h.x, h.y, 'GLANCED', '#a8d8f0'); }
      sparks(h.x, h.y, '#e8f8ff', 6);
      return Math.max(1, Math.round(dmg * 0.15));
    }
    return behind ? Math.round(dmg * 1.25) : dmg;                          // the soft joints behind the shell
  }

  // ---- the ice bat --------------------------------------------------------------------------------------------------
  function drawBat(ctx, h, u, t, st) {
    var p = px(ctx, u);
    var dive = st.strike && h._kind === 'dive';
    var by = -17 + Math.round(Math.sin(t * 5 + (h.seed || 0)) * 2) + (dive ? 6 : 0), up = Math.sin(t * (st.wind ? 34 : 22)) > 0;
    var OL = '#0c1020', B = '#2a3a5c', BL = '#4a5e88', W1 = '#5a7ab0', W2 = '#8cbce4', EYE = st.eye || '#a8f4ff';
    [-1, 1].forEach(function (s) {                                         // the wings: a membrane between long fingers
      for (var i = 0; i < 10; i++) {
        var x = s > 0 ? 3 + i : -4 - i, off = Math.round(up ? -i * 0.75 : i * 0.4), hh = Math.max(1, 6 - Math.floor(i / 2));
        p(x, by - 4 + off, 1, hh + 2, OL);
        if (hh > 1) p(x, by - 3 + off, 1, hh, i % 3 === 2 ? OL : i % 2 ? W1 : W2);
      }
      var tip = Math.round(up ? -8 : 3);
      p(s > 0 ? 13 : -14, by - 4 + tip, 1, 2, OL);                         // the claw at the wing's tip
    });
    p(-3, by - 5, 7, 8, OL); p(-2, by - 4, 5, 6, B); p(-2, by - 4, 5, 1, BL); p(-1, by - 1, 3, 2, BL);   // its body
    p(-3, by - 8, 2, 3, OL); p(2, by - 8, 2, 3, OL); p(-2, by - 7, 1, 1, BL); p(2, by - 7, 1, 1, BL);   // big ears
    p(-2, by - 3, 1, 1, EYE); p(2, by - 3, 1, 1, EYE);
    if (st.wind) { p(0, by - 1, 1, 1, '#ffffff'); }
    p(-1, by + 3, 1, 1, OL); p(1, by + 3, 1, 1, OL);                       // its feet, tucked up
  }
  function batTick(world, h, now, player) {
    if (h._attackPhase === 'recovering' && h._kind === 'dive' && !h._dove && h._attackTarget) {   // out the far side of you
      h._dove = true;
      var t = h._attackTarget, dx = sgn(t.x - h.x), dy = sgn(t.y - h.y);
      for (var n = 3; n >= 1; n--) {
        var nx = t.x + dx * (n - 1), ny = t.y + dy * (n - 1);
        if (open(world, nx, ny) && !(player && player.getX() === nx && player.getY() === ny)) { world.collisions[h.y][h.x] = 0; h.x = nx; h.y = ny; world.collisions[ny][nx] = 1; break; }
      }
    }
    if (!player || (h._attackPhase && h._attackPhase !== 'idle')) return 1;
    if (daunted(world, h, player, now)) return 1;
    var d = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y);
    if (d > h.aggroRange || now - (h._lastMove || 0) < h.moveCooldown) return 1;
    // a flutter: never quite straight at you, and off again when you're close
    var r = Math.random(), dx2 = sgn(player.getX() - h.x), dy2 = sgn(player.getY() - h.y);
    var opts = d <= 1 ? [[-dx2, 0], [0, -dy2], [dy2, dx2]] : d > 3 && r < 0.6 ? [[dx2, 0], [0, dy2]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    opts = opts.filter(function (o) { return o[0] || o[1]; });
    var o = opts[Math.floor(Math.random() * opts.length)];
    if (o) step(world, h, o[0], o[1]);
    h._lastMove = now;
    return 1;
  }

  // ---- the rime golem ----------------------------------------------------------------------------------------------
  function drawGolem(ctx, h, u, t, st) {
    var P = painter(ctx, u);
    var OL = '#0e1626', RD = '#3e4e68', RM = '#5e7494', RL = '#8aa2c2', C = '#eef6ff', CS = '#c8dcee', G = '#7af0ff', GD = '#2a9ac0';
    var cracked = !!h._cracked, arm = h._armour === undefined ? 3 : h._armour;
    var sw = st.wind || st.strike ? 0 : Math.round(Math.sin(t * 2) * 0.6), up = st.wind ? -2 : 0;
    var pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.2)), glow = cracked || pulse > 0.6 ? G : GD;
    var jA = shag(3, 4), jB = shag(5, 3), jC = shag(1, 5);
    function stones(pts, fist) {                                           // an arm of stacked stones, a fist of rubble
      pts.forEach(function (q) { P.E(q[0], q[1], 2, 2, RM, { jag: jC }); });
      P.E(fist[0], fist[1], 3, 2, RM, { jag: jA });
    }
    function stoneLight(pts, fist) {
      pts.forEach(function (q) { P.R(q[0] - 1, q[1] - 2, 2, 1, RL); });
      P.R(fist[0] - 2, fist[1] - 2, 3, 1, cracked ? RL : C);
    }
    P.E(-5, -3, 3, 3, RD, { jag: jA }).E(5, -3, 3, 3, RD, { jag: jB });   // two boulders for feet
    P.E(0, -8, 7, 3, RM, { jag: jA });                                     // the hips
    P.E(-1 + sw, -14 + up, 8, 6, RM, { jag: jB });                         // the chest: one great stone
    P.E(8 + sw, -20 + up, 6, 5, RM, { jag: jA }).E(-8 + sw, -19 + up, 4, 4, RM, { jag: jB });   // a big shoulder and a small one
    P.E(1 + sw, -22 + up, 3, 3, RM, { jag: jC });                          // the head, a small boulder sunk between them
    var L, F, L2, F2;
    if (st.wind) { L = [[-11, -21], [-10, -24]]; F = [-7, -27]; L2 = [[13, -23], [11, -25]]; F2 = [6, -27]; }
    else if (st.strike) { L = [[-11, -14], [-12, -9]]; F = [-13, -3]; L2 = [[13, -14], [13, -9]]; F2 = [13, -3]; }
    else { L = [[-12 + sw, -16], [-13 + sw, -12]]; F = [-13 + sw, -8]; L2 = [[14 + sw, -16], [14 + sw, -12]]; F2 = [13 + sw, -8]; }
    stones(L, F); stones(L2, F2);
    // light on their tops, dark below; cracks with cold light leaking out
    P.E(-3 + sw, -17 + up, 5, 2, RL, { inner: true }).E(3 + sw, -11 + up, 5, 1, RD, { inner: true }).E(6 + sw, -22 + up, 3, 1, RL, { inner: true });
    P.E(11 + sw, -18 + up, 2, 2, RD, { inner: true }).E(-9 + sw, -21 + up, 2, 1, RL, { inner: true }).E(2, -6, 5, 1, RD, { inner: true });
    P.R(-6, -5, 2, 1, RL).R(4, -5, 2, 1, RL);
    P.E(-1 + sw, -8 + up, 6, 0, OL, { inner: true }).E(3 + sw, -15 + up, 0, 3, OL, { inner: true });   // the seams where its stones meet
    P.S(-5 + sw, -21 + up, -2 + sw, -18 + up, 1, OL, { inner: true }).S(4 + sw, -19 + up, 2 + sw, -15 + up, 1, OL, { inner: true });
    P.R(-1 + sw, -20 + up, 5, 1, OL).R(0, -1, 1, 1, OL);
    P.S(-4 + sw, -18 + up, -1 + sw, -15 + up, 1, glow, { inner: true }).S(-1 + sw, -15 + up, -3 + sw, -11 + up, 1, glow, { inner: true });
    P.S(9 + sw, -23 + up, 11 + sw, -19 + up, 1, glow, { inner: true }).S(1, -9, 4, -7, 1, glow, { inner: true });
    if (cracked) P.S(2 + sw, -17 + up, 5 + sw, -13 + up, 1, G, { inner: true }).S(-7 + sw, -21 + up, -9 + sw, -18 + up, 1, G, { inner: true });
    P.R(0 + sw, -23 + up, 1, 1, st.eye || G).R(2 + sw, -23 + up, 1, 1, st.eye || G);
    stoneLight(L, F); stoneLight(L2, F2);
    if (!cracked) {                                                        // the rime: a crust on whatever faces up
      P.E(8 + sw, -24 + up, 4, 0, C, { inner: true }).E(7 + sw, -23 + up, 3, 0, CS, { inner: true });
      P.E(-8 + sw, -22 + up, 2, 0, C, { inner: true }).E(1 + sw, -24 + up, 2, 0, C, { inner: true });
      P.E(-2 + sw, -19 + up, 4, 0, CS, { inner: true }).E(0, -10, 4, 0, CS, { inner: true });
      P.R(10 + sw, -23 + up, 1, 2, C).R(-9 + sw, -21 + up, 1, 2, C).R(-5 + sw, -18 + up, 1, 2, CS);
      if (arm < 3) P.R(6 + sw, -24 + up, 1, 1, RD).R(-1 + sw, -19 + up, 1, 1, RD);
      if (arm < 2) P.R(9 + sw, -24 + up, 2, 1, RD).R(-8 + sw, -22 + up, 1, 1, RD).R(-3 + sw, -19 + up, 1, 1, RD);
    } else P.R(7 + sw, -24 + up, 1, 1, C).R(-8 + sw, -22 + up, 1, 1, C);   // a few flakes of it left
    P.go(OL);
    if (st.strike) {                                                       // the ground cracking
      ctx.globalAlpha = 0.7; ctx.fillStyle = C;
      for (var dd = 0; dd < 8; dd++) ctx.fillRect(Math.round((-15 + dd * 4) * u), Math.round((-2 - (dd % 3)) * u), u, u);
      ctx.globalAlpha = 1;
    }
  }
  function golemGuard(world, h, dmg, w) {
    if (h._cracked) return dmg;
    if (h._armour === undefined) h._armour = 3;
    if (w && (w.burn || heavy(w))) {
      h._armour--;
      sfx('icecrack'); sparks(h.x, h.y, '#f0f8ff', 12);
      if (h._armour <= 0) { h._cracked = true; text(h.x, h.y - 0.6, 'ARMOUR CRACKED', '#ffe8a0'); shake(2); return dmg; }
      text(h.x, h.y - 0.6, 'CRACKING', '#d8f0ff');
      return Math.round(dmg * 0.7);
    }
    text(h.x, h.y - 0.6, 'RIMED', '#a8d8f0');
    return Math.max(1, Math.round(dmg * 0.35));
  }

  // ---- the frost wraith ---------------------------------------------------------------------------------------------
  function drawWraith(ctx, h, u, t, st) {
    var p = px(ctx, u);
    var bl = h._blinkAt ? Math.min(1, (performance.now() - h._blinkAt) / 350) : 1;
    var bob = Math.round(Math.sin(t * 2.2) * 2);
    var OL = '#0c1828', HI = '#eef8ff', MI = '#c4e0f4', FO = '#8ab4d6', SH = '#6a94bc';
    ctx.globalAlpha = bl * (st.wind ? 0.95 : 0.85);
    for (var r = 0; r < 22; r++) {                                         // a hooded robe of frost: folds falling straight
      var wv = r > 12 ? Math.round(Math.sin(t * 4 + r * 0.5)) : 0;
      var half = r < 5 ? 2 + r : r < 9 ? 6 : Math.min(9, 6 + Math.floor((r - 8) / 3));
      var y = -24 + r + bob, x0 = -half + wv;
      if (r === 21) {                                                      // the hem frays into wisps of frost
        ctx.globalAlpha = bl * 0.7;
        for (var tt = -half; tt < half; tt += 2) {
          var L = 2 + ((tt * 5 + Math.round(t * 4)) % 3 + 3) % 3, sx = tt + wv + Math.round(Math.sin(t * 5 + tt));
          p(sx, y, 1, L, (tt & 2) ? MI : FO); p(sx + (tt % 4 ? 1 : -1), y + L, 1, 1, HI);
        }
        ctx.globalAlpha = bl * (st.wind ? 0.95 : 0.85);
        continue;
      }
      p(x0 - 1, y, half * 2 + 2, 1, OL);
      p(x0, y, half * 2, 1, MI);
      p(x0, y, 1, 1, HI);
      p(x0 + half * 2 - 2, y, 2, 1, SH);
      if (r > 6) { p(x0 + Math.round(half * 0.6), y, 1, 1, FO); p(x0 + Math.round(half * 1.3), y, 1, 1, FO); }
    }
    p(-3, -21 + bob, 6, 5, '#0a1424'); p(-2, -21 + bob, 4, 1, '#16243a');  // the hood's dark
    var e = st.eye || '#80f8ff';
    p(-2, -19 + bob, 1, 1, e); p(1, -19 + bob, 1, 1, e);
    var cl = st.wind ? -4 : 0;                                             // sleeves, and the hands in them raised to throw
    p(-10, -15 + bob + cl, 4, 7, OL); p(6, -15 + bob + cl, 4, 7, OL); p(-9, -14 + bob + cl, 2, 5, FO); p(7, -14 + bob + cl, 2, 5, FO);
    p(-9, -9 + bob + cl, 2, 1, HI); p(7, -9 + bob + cl, 2, 1, HI);
    if (st.wind) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 20); p(-9, -19 + bob, 2, 2, '#c8f8ff'); p(7, -19 + bob, 2, 2, '#c8f8ff'); }
    ctx.globalAlpha = bl * 0.6;
    for (var m = 0; m < 5; m++) { var ph = (t * 0.6 + m / 5) % 1; p(Math.round(Math.sin(m * 2.1 + t) * 7), -4 - ph * 22, 1, 1, '#e0f8ff'); }
    ctx.globalAlpha = 1;
  }

  // ---- the glacier wyrm ---------------------------------------------------------------------------------------------
  function under(h) { return h._attackPhase === 'under' || (h._attackPhase === 'winding' && h._kind === 'breach'); }
  function drawWyrm(ctx, h, u, t, st) {
    if (under(h)) return;
    var P = painter(ctx, u), f = h._face || 1;
    var OL = '#0c1830', S1 = '#4e82b8', S2 = '#6a9ed0', SL = '#b8e4f8', BL = '#e8f6fc', IC = '#f4fcff', EYE = '#a8f4ff';
    var rise = h._surfaced ? Math.min(1, (performance.now() - h._surfaced) / 260) : 1;
    var bite = (st.wind || st.strike) && h._kind === 'bite', sweep = (st.wind || st.strike) && h._kind === 'sweep';
    ctx.scale(f, 1);
    // the snow broken where its body comes up through it
    P.E(-4, 0, 21, 2, '#dfe8f6', { jag: shag(2, 3) }).E(-4, 1, 18, 0, '#c4d2e6', { inner: true });
    [-20, -10, -11, 0, 1, 7].forEach(function (x) { P.E(x, -1, 2, 1, '#14243a', { inner: true }); });
    P.go('#8a9cbc');
    // a coil of its body arching out of the snow and back in: discs along a half circle, spines on its back
    function arch(cx, R, r0, r1) {
      var n = Math.round(R * 2);
      for (var i = 0; i <= n; i++) {
        var a = Math.PI - Math.PI * i / n, x = cx + Math.cos(a) * R, y = -Math.sin(a) * R * rise, r = r0 + (r1 - r0) * i / n;
        P.E(x, y, r, r, S2);
        if (i % 3 === 1 && i < n) {
          var dx = Math.cos(a), dy = -Math.sin(a);
          P.T([[x + dx * (r + 2), y + dy * (r + 2)], [x + dx * r - dy * 1, y + dy * r + dx * 1], [x + dx * r + dy * 1, y + dy * r - dx * 1]], IC);
        }
      }
      for (var j = 0; j <= n; j++) {                                       // the light along its top, the pale belly under
        var b = Math.PI - Math.PI * j / n, X = cx + Math.cos(b) * R, Y = -Math.sin(b) * R * rise, rr = r0 + (r1 - r0) * j / n;
        P.R(Math.round(X - 1), Math.round(Y - rr + 1), 2, 1, SL);
        if (j % 3 === 0) P.R(Math.round(X), Math.round(Y + rr - 1), 1, 1, BL);
        if (j % 3 === 0) P.R(Math.round(X + 1), Math.round(Y), 1, 1, S1);
      }
    }
    if (sweep) {                                                           // the tail flung round out of the snow
      var sa = st.strike ? 1.2 : 0.5 + 0.5 * Math.sin(t * 9);
      for (var q = 0; q <= 9; q++) {
        var x = -7 - q * 1.8, y = -3 - Math.abs(Math.sin(q * 0.45 + sa)) * 6, r = 3 - q * 0.22;
        P.E(x, y, r, r, q % 2 ? S1 : S2);
        if (q % 2 === 0) P.T([[x, y - r - 3], [x - 1.5, y - r], [x + 1.5, y - r]], IC);
      }
      var ty = -3 - Math.round(Math.abs(Math.sin(4.05 + sa)) * 6);
      P.T([[-25, ty], [-22, ty - 2], [-22, ty + 2]], IC);
    } else arch(-17, 5, 1.2, 2.4);
    arch(-6, 7, 3, 3.5);
    // the neck rising out of the snow and arching over, then the head
    var lean = bite ? 3 : 0, top = 27 * rise;
    var pts = [[2, 0.03], [3, -0.25], [2, -0.45], [4, -0.65], [7 + lean, -0.85], [10 + lean, -0.97]];
    var hx = 0, hy = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      for (var s = 0; s < 4; s++) {
        var k = s / 4, x0 = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, yk = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k;
        var y0 = Math.min(1, yk * top), r = 4 - (i * 4 + s) * 0.07;
        P.E(x0, y0, r, r, S2);
        P.R(Math.round(x0 + r - 1), Math.round(y0 - 1), 1, 3, BL).R(Math.round(x0 - r + 1), Math.round(y0 - 2), 1, 2, SL);
        if (s === 2) P.T([[x0 - r - 3, y0 - 1], [x0 - r, y0 - 2.5], [x0 - r, y0 + 1]], IC);   // spines down the back of its neck
        hx = x0; hy = y0;
      }
    }
    var jaw = bite ? (st.strike ? 4 : 3) : st.wind ? 2 : 1, HX = hx + 4, HY = hy - 1;
    P.E(HX, HY, 5, 3, S2);                                                 // the head: a wedge of a skull
    P.T([[HX + 2, HY - 3], [HX + 10, HY], [HX + 2, HY + 2]], S2);          // the snout
    P.T([[HX + 1, HY + 2], [HX + 9, HY + 2 + jaw], [HX + 1, HY + 4 + Math.min(jaw, 2)]], S1);   // the jaw, dropping open
    P.T([[HX - 3, HY - 2], [HX - 8, HY - 6], [HX - 1, HY - 3]], IC).T([[HX - 1, HY - 3], [HX - 4, HY - 8], [HX + 1, HY - 3]], IC);   // its crest of ice
    // shading on the neck: a lit edge, the pale belly plates down its front
    P.E(HX - 1, HY - 2, 3, 0, SL, { inner: true });
    if (jaw > 1) { P.R(HX + 2, HY + 2, 6, jaw - 1, '#3a0a1a'); for (var tth = 0; tth < 3; tth++) P.R(HX + 3 + tth * 2, HY + 2, 1, 1, IC); }
    P.R(HX + 1, HY - 1, 2, 1, EYE).R(HX + 2, HY - 1, 1, 1, '#ffffff');
    if (h._phase >= 3) P.E(HX, HY, 2, 1, '#9ae4ff', { inner: true });
    P.go(OL);
    [[-22, 2], [-12, 2], [-13, 3], [1, 3], [3, 5]].forEach(function (m) {    // the snow heaped where it breaks the surface, in front of it
      if (sweep && m[0] < -11 && m[1] === 2) return;
      P.E(m[0], m[1] > 4 ? 2 : 1, m[1] + 1, m[1] > 4 ? 3 : 2, '#eef3fa', { jag: shag(m[0] + 9, 3) }).R(m[0] - m[1], 1, m[1] * 2, 1, '#c4d2e6');
    });
    P.go('#8a9cbc');
    // snow spraying off where it breaks the surface
    for (var sp = 0; sp < 8; sp++) {
      var base = [-20, -10, -11, 0, 2, 7][sp % 6], ph = ((t * 1.6) + sp * 0.37) % 1;
      ctx.fillStyle = sp % 3 ? '#ffffff' : '#dfe8f6';
      ctx.fillRect(Math.round((base + Math.sin(sp * 2.1) * 3 * ph) * u), Math.round((-1 - Math.sin(ph * Math.PI) * 6) * u), u, u);
    }
    if (st.wind) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#e8fbff'; for (var bb = 0; bb < 4; bb++) ctx.fillRect(Math.round((HX + 11 + bb * 2) * u), Math.round((HY - bb) * u), u, u); ctx.globalAlpha = 1; }
  }
  var WYRM = { windup: 1150, under: 360, exposed: 3000 };
  function wyrmTick(world, h, now, player) {
    var p = player;
    if (!h._init) {                                                        // it starts under the snow
      h._init = true; h._attackPhase = 'under'; h._phase = 1; h._diveAt = now;
      world.collisions[h.y][h.x] = 0;
    }
    if (h._attackPhase === 'idle' || h._attackPhase === 'recovering' || h._attackPhase === 'winding' || h._attackPhase === 'striking') h._lastMove = now;   // never walks
    if (!p) return 1;
    var px_ = p.getX(), py_ = p.getY(), d = Math.abs(px_ - h.x) + Math.abs(py_ - h.y);
    if (!h._engaged && d <= h.aggroRange) {
      h._engaged = true; sfx('roar'); shake(3);
      if (typeof BridgeFight !== 'undefined' && BridgeFight.company && BridgeFight.company() > 1 && typeof BridgeCombat !== 'undefined') BridgeCombat.engage(h, BridgeFight.company());
      toast('The Glacier Wyrm', 'Something vast moves under the snow, and the snow moves with it', 'Watch the ripples: where they close in, it comes up');
    }
    var f = h._hp / h.maxHP;                                               // it quickens as it's hurt
    if (f < 0.66 && h._phase < 2) { h._phase = 2; h.windupMs = Math.round(h.windupMs * 0.85); toast('The vault groans', 'Icicles shake loose overhead', 'Their marks show where they\'ll land'); sfx('icecrack'); }
    if (f < 0.33 && h._phase < 3) { h._phase = 3; h.windupMs = Math.round(h.windupMs * 0.85); h.recoverMs = Math.round(h.recoverMs * 0.8); sfx('roar'); shake(4); }
    if (h._engaged && h._phase >= 2 && now - (h._iceAt || 0) > (h._phase >= 3 ? 3400 : 5200)) {   // icicles from the vault
      h._iceAt = now;
      var n = h._phase >= 3 ? 6 : 4, tries = 0;
      while (n > 0 && tries++ < 40) {
        var ix = px_ + Math.round((Math.random() - 0.5) * 5), iy = py_ + Math.round((Math.random() - 0.5) * 5);
        if (tries === 1) { ix = px_; iy = py_; }
        if (!open(world, ix, iy) && !(ix === px_ && iy === py_)) continue;
        if (hazards.some(function (z) { return z.x === ix && z.y === iy; })) continue;
        hazards.push({ x: ix, y: iy, at: now, land: now + 1300 + Math.random() * 300, world: world }); n--;
      }
      sfx('icecrack');
    }
    if (h._attackPhase === 'recovering' && h._kind === 'breach' && !h._thrown) {   // it came up where you stood: thrown clear
      h._thrown = true;
      if (px_ === h.x && py_ === h.y && typeof BridgeCharacter !== 'undefined') {
        var away = [[sgn(px_ - h.x) || 1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
        for (var a = 0; a < away.length; a++) {
          var tx = h.x + away[a][0], ty = h.y + away[a][1];
          if (open(world, tx, ty)) { BridgeCharacter.init(tx, ty); px_ = tx; py_ = ty; break; }
        }
      }
      world.collisions[h.y][h.x] = 1;
    }
    if (h._attackPhase === 'idle') {                                       // up and exposed: when it's had its moment, down again
      if (!h._exposedUntil) h._exposedUntil = now + WYRM.exposed * (h._phase >= 3 ? 0.75 : 1);
      if (now > h._exposedUntil) {
        h._attackPhase = 'under'; h._exposedUntil = 0; h._diveAt = now; h._surfaced = 0; h._thrown = false;
        world.collisions[h.y][h.x] = 0; sfx('breach'); sparks(h.x, h.y, '#e8f4ff', 14);
      }
      return 1;
    }
    if (h._attackPhase !== 'under' || !h._engaged) return 1;
    // swimming: a tile at a time toward you under the snow, then up where you stand
    var every = h._phase >= 3 ? 230 : h._phase >= 2 ? 290 : WYRM.under;
    if (now - (h._swimAt || 0) > every && d > 1) {
      h._swimAt = now;
      (h._trail = h._trail || []).push([h.x, h.y, now]);
      if (h._trail.length > 8) h._trail.shift();
      var sx = sgn(px_ - h.x), sy = sgn(py_ - h.y);
      var go = Math.abs(px_ - h.x) >= Math.abs(py_ - h.y) ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]];
      for (var i = 0; i < 2; i++) {
        var nx = h.x + go[i][0], ny = h.y + go[i][1];
        if ((go[i][0] || go[i][1]) && open(world, nx, ny) && !(nx === px_ && ny === py_)) { h.x = nx; h.y = ny; break; }
      }
    }
    if ((d <= 1 || now - h._diveAt > 3800) && now - h._diveAt > 900) {
      h._attackPhase = 'winding'; h._attackStart = now; h._windFor = h.windupMs; h._kind = 'breach';
      h._attackTarget = { x: px_, y: py_ };
      sfx('roar');
    }
    return 1;
  }
  function wyrmAttack(h, player) {
    h._swings = (h._swings || 0) + 1;
    h._kind = h._swings % 3 === 0 ? 'sweep' : 'bite';
    h._face = player.getX() < h.x ? -1 : player.getX() > h.x ? 1 : (h._face || 1);
    if (h._kind === 'sweep') { h._attackTarget = { x: h.x, y: h.y }; sfx('hiss'); }
  }
  function wyrmCells(h) {
    var t = h._attackTarget, out = [];
    if (h._kind === 'breach') { for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) out.push([t.x + x, t.y + y]); return out; }
    if (h._kind === 'sweep') { for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) if (a || b) out.push([h.x + a, h.y + b]); return out; }
    if (h._kind === 'bite') { var dx = sgn(t.x - h.x), dy = sgn(t.y - h.y); return [[t.x, t.y], [t.x + dx, t.y + dy]]; }
    return null;
  }
  function wyrmFx(h, now) {
    if (h._kind !== 'breach') return false;
    var t = h._attackTarget, p = me();
    h.x = t.x; h.y = t.y; h._rx = t.x; h._ry = t.y; h._surfaced = now; h._exposedUntil = 0;
    var w = BridgeWorld.getWorld();
    if (w && !(p && p.x === t.x && p.y === t.y)) w.collisions[t.y][t.x] = 1;
    sfx('breach'); shake(6);
    for (var i = 0; i < 26; i++) burst.push({ x: t.x + 0.5, y: t.y + 0.6, vx: (Math.random() - 0.5) * 7, vy: -2 - Math.random() * 6, at: now, big: i % 4 === 0 });
    return true;
  }
  function wyrmGuard(world, h, dmg, w) {
    if (!under(h)) return dmg;
    var now = performance.now();
    if (now - (h._snowText || 0) > 700) { h._snowText = now; text(h.x, h.y, 'UNDER THE SNOW', '#c8dcf0'); }
    return 0;
  }
  function wyrmKill(world, h) {
    save.wyrm = today();
    if (!save.fang) {
      save.fang = true;
      toast('The Glacier Wyrm is still', 'It sinks into the snow and doesn\'t rise. A tooth as long as your arm lies where it went down', 'The Wyrmfang');
    } else toast('The Glacier Wyrm is still', 'It sinks into the snow. It\'ll be back tomorrow', '');
    store();
    hazards.length = 0;
  }
  function wyrmShadow(h) { return under(h) ? null : [14, 0.4]; }

  // ---- strikes of their own: frost spit, chill bolt (a glow down the line), the breach's spray -------------------------
  var shots = [], hazards = [], burst = [];
  function shotFx(col) {
    return function (h, now) {
      if (h._kind !== 'spit' && h._kind !== 'bolt' && h._kind !== 'dive') return false;
      var t = h._attackTarget;
      if (h._kind === 'dive') { sfx('screech'); return false; }
      shots.push({ x0: h.x + 0.5, y0: h.y + (h._kind === 'bolt' ? 0.1 : 0.6), x1: t.x + 0.5, y1: t.y + 0.5, at: now, dur: h.strikeMs || 300, col: col });
      sfx(h._kind === 'spit' ? 'frost' : 'zap');
      return true;
    };
  }

  // ---- the kinds ----------------------------------------------------------------------------------------------------
  var ICE = [150, 215, 255];
  var KINDS = {
    wolf: { label: 'ICE WOLF', hp: 46, damage: 8, move: 300, aggro: 6, windup: 360, strike: 200, recover: 560, reach: 2, reward: 8,
            drops: [{ id: 'wolf_pelt', min: 1, max: 1, chance: 0.6 }], shadow: [8, 0.3], rake: '#d8f0ff',
            draw: drawWolf, tick: wolfTick,
            attack: function (h, player) { var d = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y); h._kind = d > 1 ? 'lunge' : 'hit'; } },
    beetle: { label: 'RIME BEETLE', hp: 88, damage: 9, move: 950, aggro: 5, windup: 560, strike: 300, recover: 820, range: 2, reward: 11,
              drops: [{ id: 'rime_shell', min: 1, max: 1, chance: 0.6 }, { id: 'hoar_crystal', min: 1, max: 1, chance: 0.2 }], shadow: [9, 0.32], rake: '#a8e0ff',
              draw: drawBeetle, tick: beetleTick, guard: beetleGuard, fx: shotFx('ice'),
              attack: function (h, player) { var d = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y); h._kind = d > 1 ? 'spit' : 'hit'; h._dir = dirTo(h, player.getX(), player.getY()); },
              cells: function (h) { return h._kind === 'spit' ? line(h, h._attackTarget, 2) : null; },
              color: function (h) { return h._kind === 'spit' ? ICE : null; } },
    bat: { label: 'ICE BAT', hp: 22, damage: 6, move: 280, aggro: 8, windup: 440, strike: 240, recover: 760, range: 3, reward: 4,
           drops: [{ id: 'bat_wing', min: 1, max: 1, chance: 0.55 }], shadow: [4, 0.18], rake: '#c8ecff',
           draw: drawBat, tick: batTick, fx: shotFx('ice'),
           attack: function (h, player) { var d = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y); h._kind = d > 1 ? 'dive' : 'hit'; h._dove = false; },
           cells: function (h) { return h._kind === 'dive' ? line(h, h._attackTarget, Math.abs(h._attackTarget.x - h.x) + Math.abs(h._attackTarget.y - h.y)) : null; },
           color: function (h) { return h._kind === 'dive' ? [170, 220, 255] : null; },
           guard: function (world, h, dmg, w) {                            // hard to pin down
             if (w && (w.arc || w.charged)) return dmg;
             if (Math.random() < 0.3) { text(h.x, h.y, 'MISSED', '#c8dcf0'); return 0; }
             return dmg;
           } },
    golem: { label: 'RIME GOLEM', hp: 240, damage: 18, move: 1500, aggro: 6, windup: 1300, strike: 240, recover: 1200, reward: 30,
             drops: [{ id: 'golem_core', min: 1, max: 1, chance: 0.5 }, { id: 'hoar_crystal', min: 1, max: 2 }], shadow: [11, 0.4], rake: '#e8f8ff',
             draw: drawGolem, guard: golemGuard,
             tick: function (world, h, now, player) { daunted(world, h, player, now); return 1; },
             attack: function (h) { h._kind = 'slam'; },
             cells: function (h) { var t = h._attackTarget, out = []; for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) if (t.x + x !== h.x || t.y + y !== h.y) out.push([t.x + x, t.y + y]); return out; },
             color: function () { return [255, 90, 70]; },
             fx: function (h) { sfx('slam'); shake(4); sparks(h._attackTarget.x, h._attackTarget.y, '#e8f8ff', 14); return true; } },
    wraith: { label: 'FROST WRAITH', hp: 66, damage: 10, move: 620, aggro: 8, windup: 620, strike: 420, recover: 820, range: 4, blink: 0.35, reward: 14, undead: true,
              drops: [{ id: 'wraith_essence', min: 1, max: 1, chance: 0.45 }], shadow: [5, 0.2], rake: '#c8f8ff',
              draw: drawWraith, fx: shotFx('chill'),
              tick: function (world, h, now, player) { daunted(world, h, player, now); return 1; },
              color: function (h) { return h._kind === 'bolt' ? ICE : null; } },
    wyrm: { label: 'THE GLACIER WYRM', hp: 760, damage: 16, move: 99999, aggro: 11, windup: WYRM.windup, strike: 260, recover: 2400, reach: 1, reward: 150, boss: true,
            drops: [{ id: 'wyrm_scale', min: 1, max: 2 }, { id: 'hoar_crystal', min: 2, max: 3 }], shadow: wyrmShadow, rake: '#d8f0ff',
            draw: drawWyrm, tick: wyrmTick, attack: wyrmAttack, cells: wyrmCells, fx: wyrmFx, guard: wyrmGuard, kill: wyrmKill,
            hurt: function (h) { return h._kind === 'breach' ? 20 : h._kind === 'sweep' ? 12 : 16; },
            color: function (h) { return h._kind === 'breach' ? [170, 225, 255] : null; } }
  };
  if (typeof BridgeCombat !== 'undefined' && BridgeCombat.kind) {
    Object.keys(KINDS).forEach(function (k) {
      var d = KINDS[k];
      d.hp = d.hp; d.label = d.label;
      BridgeCombat.kind(k, d);
    });
  }

  // ---- who's where --------------------------------------------------------------------------------------------------
  var ROSTER = {
    'hoarfell-valley': { packs: [2, 3, 2] },
    'hoarfell-caves': { beetle: 4, bat: 5 },
    'hoarfell-monastery': { golem: 3, wraith: 4 },
    'hoarfell-heart': { wyrm: 1 }
  };
  var YETIS = { 'hoarfell-valley': 2 };
  var NAMES = ['BRUMBLE', 'HUSHKA', 'OLD TUVA', 'PIP'];
  var FAINT = { world: 'hoarfell-valley', spawn: null, who: 'THE HUT',
                line: 'YOU COME ROUND IN THE STONE HUT AT THE VALLEY\'S MOUTH, A FUR OVER YOU AND THE STOVE TICKING.\n\nSOMEONE HAS LEFT A CUP OF SOMETHING HOT ON THE BENCH. WHOEVER IT WAS, THEY\'VE GONE BACK OUT INTO THE COLD.' };

  // open cells away from where you come in, by a seeded scan (the same every visit)
  function openCells(worldId, data) {
    var sp = (data.spawns && data.spawns.player) || [0, 0], out = [];
    for (var y = 1; y < data.collisions.length - 1; y++) {
      for (var x = 1; x < data.collisions[y].length - 1; x++) {
        if (data.collisions[y][x] !== 0) continue;
        if (Math.abs(x - sp[0]) + Math.abs(y - sp[1]) < 7) continue;
        if (data.interactions.some(function (i) { return Math.abs(i.x - x) + Math.abs(i.y - y) < 2; })) continue;
        out.push([x, y]);
      }
    }
    var r = rnd(worldId);
    for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = out[i]; out[i] = out[j]; out[j] = t; }
    return out;
  }
  function spots(worldId, data) {
    var V = data.valley || {}, R = ROSTER[worldId] || {};
    if (V.spawns) return V.spawns.map(function (s, i) { return { kind: s[0], x: s[1], y: s[2], pack: s[3] !== undefined ? s[3] : i }; });
    var cells = openCells(worldId, data), out = [], used = {};
    function take(near) {
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i], k = c[0] + ',' + c[1];
        if (used[k]) continue;
        if (near && Math.abs(c[0] - near[0]) + Math.abs(c[1] - near[1]) > 2) continue;
        if (!near && out.some(function (o) { return Math.abs(o.x - c[0]) + Math.abs(o.y - c[1]) < 5; })) continue;
        used[k] = true; return c;
      }
      return null;
    }
    (R.packs || []).forEach(function (n, pi) {
      var c0 = take(null);
      if (!c0) return;
      out.push({ kind: 'wolf', x: c0[0], y: c0[1], pack: pi });
      for (var i = 1; i < n; i++) { var c = take(c0); if (c) out.push({ kind: 'wolf', x: c[0], y: c[1], pack: pi }); }
    });
    ['beetle', 'bat', 'golem', 'wraith', 'wyrm'].forEach(function (k) {
      for (var i = 0; i < (R[k] || 0); i++) { var c = take(null); if (c) out.push({ kind: k, x: c[0], y: c[1], pack: 0 }); }
    });
    return out;
  }

  function decorate(worldId, data) {
    var V = data.valley;
    if (!ROSTER[worldId] && !V) return;
    if (data.__valley) return;
    data.__valley = true;
    if (!data.onFaint && worldId !== 'hoarfell-valley') data.onFaint = FAINT;
    if (!data.onFaint) data.onFaint = { world: worldId, spawn: (data.spawns && data.spawns.player) || null, who: FAINT.who, line: FAINT.line };
    if (typeof BridgeCombat !== 'undefined') {
      spots(worldId, data).forEach(function (s) {
        if (!KINDS[s.kind] || !open(data, s.x, s.y)) return;
        if (s.kind === 'wyrm' && save.wyrm === today()) return;           // once a day
        var h = BridgeCombat.spawn(data, s.kind, s.x, s.y);
        h._pack = s.pack;
        if (s.kind === 'wyrm') {
          if (!save.fang) h.drops = h.drops.concat([{ id: 'wyrmfang', min: 1, max: 1 }]);
          h._attackPhase = 'under'; h._init = false;
        }
        if (s.kind === 'beetle') h._dir = 'down';
      });
    }
    yetisIn(worldId, data);
  }

  // ---- the yetis ----------------------------------------------------------------------------------------------------
  var FOODS = ['strawberry', 'apple', 'honey', 'sweet_roll', 'roast_chestnuts', 'edelweiss', 'honey_cake', 'pumpkin_pie', 'arctic_char', 'fondue'];
  var yetis = [], walker = null, trail = [], lastPos = null;
  function yeti(id) { return save.yetis[id] || (save.yetis[id] = { trust: 0, fed: null, met: false, shown: false }); }
  function yetiSpots(worldId, data) {
    var V = data.valley || {};
    if (V.yetis) return V.yetis;
    var n = YETIS[worldId] || 0, cells = openCells(worldId + ':yeti', data), out = [];
    for (var i = 0; i < cells.length && out.length < n; i++) {
      var c = cells[i];
      if (out.some(function (o) { return Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) < 8; })) continue;
      out.push(c);
    }
    return out;
  }
  function yetisIn(worldId, data) {
    yetis = [];
    walker = null;
    yetiSpots(worldId, data).forEach(function (c, i) { addYeti(data, c[0], c[1], worldId + '#' + i, i); });
    // the one that trusts you most, at five, walks with you in every part of the valley
    var best = null;
    Object.keys(save.yetis).forEach(function (id) { if (save.yetis[id].trust >= 5 && (!best || save.yetis[id].trust > save.yetis[best].trust)) best = id; });
    if (best && (ROSTER[worldId] || data.valley)) {
      var here = yetis.filter(function (y) { return y.id === best; })[0];
      if (!here) {
        var sp = (data.spawns && data.spawns.player) || [1, 1];
        here = addYeti(data, sp[0] + 1, sp[1], best, NAMES.indexOf(save.yetis[best].name));
      }
      here.walks = true;
      walker = { world: data, yeti: here };
    }
  }
  function addYeti(data, x, y, id, i) {
    var Y = yeti(id);
    if (!Y.name) Y.name = NAMES[Math.abs(i) % NAMES.length];
    var inter = { x: x, y: y, type: 'yeti', yeti: id, label: Y.met ? Y.name : 'YETI', prompt: 'PRESS E TO OFFER SOMETHING' };
    data.interactions.push(inter);
    var o = { id: id, inter: inter, fx: x, fy: y, home: [x, y], state: 'wander', until: 0, goal: null, face: 1, sit: false, seed: i * 7.3 };
    yetis.push(o);
    // at three it shows you something: a cache of hoar crystals, or a hot spring nobody else knows
    if (Y.trust >= 3) giftAt(data, o, i);
    return o;
  }
  function giftAt(data, o, i) {
    var r = rnd(o.id + ':gift'), best = null;
    for (var n = 0; n < 60 && !best; n++) {
      var x = o.home[0] + Math.round((r() - 0.5) * 8), y = o.home[1] + Math.round((r() - 0.5) * 6);
      if (open(data, x, y) && !data.interactions.some(function (q) { return q.x === x && q.y === y; })) best = [x, y];
    }
    if (!best) return;
    var spring = i % 2 === 1;
    data.interactions.push({ x: best[0], y: best[1], type: 'yeti_gift', yeti: o.id, spring: spring,
                             label: spring ? 'HIDDEN SPRING' : 'YETI\'S CACHE', prompt: spring ? 'PRESS E TO BATHE' : 'PRESS E TO LOOK' });
  }

  function useYeti(inter) {
    var o = yetis.filter(function (y) { return y.inter === inter; })[0], Y = yeti(inter.yeti);
    if (o && o.state === 'hide') return say('YETI', 'IT HAS TUCKED ITSELF BEHIND THE ROCKS, ONE DARK EYE WATCHING YOU OVER THE TOP.\n\nYOU CAME AT IT TOO QUICKLY. STAND STILL A WHILE.');
    var name = Y.met ? Y.name : 'THE YETI';
    if (Y.fed === today()) {
      if (o) { o.sit = true; o.state = 'sit'; o.until = performance.now() + 6000; }
      sfx('hoot');
      return say(name, Y.trust >= 5 ? name + ' HOOTS AND LEANS AGAINST YOU, WARM AS A STOVE. WHEREVER YOU GO IN THE VALLEY, IT GOES TOO.'
                       : name + ' HOOTS SOFTLY AND SITS DOWN IN THE SNOW A LITTLE WAY OFF, WATCHING YOU WITH ITS HEAD ON ONE SIDE. IT HAS EATEN TODAY.');
    }
    var have = FOODS.filter(function (id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; });
    if (!have.length) {
      return say(name, Y.trust ? name + ' LOOKS AT YOUR EMPTY HANDS, THEN AT YOUR FACE, AND SIGHS THROUGH ITS NOSE.\n\nSOMETHING SWEET, OR SOMETHING THAT GROWS. IT ISN\'T FUSSY.'
                               : 'A GREAT WHITE SHAPE, TALLER THAN A DOOR, SHAGGY AS A HAYSTACK. IT WATCHES YOU WITHOUT MOVING.\n\nIT LOOKS HUNGRY. NOT FOR YOU - FOR SOMETHING SWEET, OR SOMETHING THAT GROWS.');
    }
    BridgeInteractions.choose({
      title: Y.met ? Y.name : 'The yeti',
      text: Y.trust ? name + ' WAITS, VERY STILL, ITS NOSE WORKING.' : 'YOU HOLD SOMETHING OUT, SLOWLY. IT DOESN\'T COME CLOSER - BUT IT DOESN\'T GO.',
      rows: have.map(function (id) {
        var it = typeof BridgeItems !== 'undefined' && BridgeItems.get ? BridgeItems.get(id) : null;
        return { label: it ? it.name : id, sub: 'once a day', pick: function () { feed(o, inter, id); } };
      }),
      closeLabel: 'Not now'
    });
  }
  function feed(o, inter, id) {
    var Y = yeti(inter.yeti);
    if (Y.fed === today()) return say(Y.name, Y.name + ' HAS EATEN TODAY. IT PUSHES YOUR HAND AWAY, GENTLY.');
    if (!BridgeInventory.removeItem(id, 1)) return;
    Y.fed = today();
    Y.trust = Math.min(5, Y.trust + 1);
    var first = !Y.met;
    Y.met = true;
    inter.label = Y.name;
    store();
    sfx('hoot');
    if (o) { o.state = 'sit'; o.sit = true; o.until = performance.now() + 8000; }
    var lines = {
      1: 'IT TAKES IT FROM YOUR PALM WITH TWO HUGE FINGERS, VERY DELICATELY, AND EATS IT IN ONE GO. THEN IT SITS DOWN IN THE SNOW, CLOSE ENOUGH TO TOUCH.\n\nIT MAKES A SOUND LIKE "' + Y.name + '". THAT\'S ITS NAME, NEAR AS YOU CAN SAY IT.',
      2: Y.name + ' EATS, THEN GETS UP AND AMBLES A FEW STEPS AFTER YOU WHEN YOU MOVE. NOT FAR. BUT IT FOLLOWS.',
      3: Y.name + ' EATS, THEN TUGS YOUR SLEEVE AND POINTS WITH ITS WHOLE ARM: THERE. SOMETHING IT WANTS YOU TO SEE.',
      4: Y.name + ' EATS AND HOOTS AND PATS YOUR HEAD, HARD ENOUGH TO PUSH YOUR HAT DOWN OVER YOUR EYES.',
      5: Y.name + ' EATS, THEN STANDS AND WAITS FOR YOU, LOOKING THE WAY YOU\'RE GOING. FROM NOW ON IT WALKS WITH YOU IN THE VALLEY, AND WHAT LIVES HERE KEEPS ITS DISTANCE.'
    };
    say(Y.name, lines[Y.trust] || lines[4]);
    if (first) toast('A friend in the snow', 'The yeti\'s name is ' + Y.name, 'Feed it once a day and it trusts you a little more');
    if (Y.trust === 3 && o) { var w = BridgeWorld.getWorld(); if (w) giftAt(w, o, yetis.indexOf(o)); }
    if (Y.trust === 5 && o) { o.walks = true; walker = { world: BridgeWorld.getWorld(), yeti: o }; }
  }
  function useGift(inter) {
    var key = inter.yeti + ':' + (inter.spring ? 'spring' : 'cache') + ':' + today();
    if (inter.spring) {
      if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(20);
      if (save.found[key]) return say('HIDDEN SPRING', 'STEAM OFF GREEN WATER IN A HOLLOW OF MOSSY ROCK. YOU SIT WITH YOUR BOOTS IN IT A WHILE. WARM THROUGH.');
      save.found[key] = true; store();
      if (typeof BridgeInventory !== 'undefined') BridgeInventory.restoreEnergy(999);
      sfx('splash');
      return say('HIDDEN SPRING', 'BEHIND A CURTAIN OF ICICLES, A HOLLOW OF MOSS AND A POOL OF GREEN WATER, STEAMING. THE YETI LOWERS ITSELF IN UP TO THE CHIN AND SHUTS ITS EYES.\n\nYOU GET IN TOO. WARM FOR TWENTY MINUTES, AND RESTED THROUGH.');
    }
    if (save.found[key]) return say('YETI\'S CACHE', 'THE HOLLOW UNDER THE ROOT IS EMPTY TODAY. TOMORROW, PERHAPS.');
    save.found[key] = true; store();
    var first = !save.found[inter.yeti + ':cache'];
    save.found[inter.yeti + ':cache'] = true;
    if (typeof BridgeInventory !== 'undefined') { BridgeInventory.addItem('hoar_crystal', first ? 3 : 1); if (first) BridgeInventory.addItem('edelweiss', 1); }
    sfx('itemget');
    say('YETI\'S CACHE', first ? 'UNDER A ROOT, A HOLLOW LINED WITH MOSS: THREE HOAR CRYSTALS, A STAR OF EDELWEISS, A BUTTON FROM SOMEBODY\'S COAT. THE YETI PUSHES THE CRYSTALS AT YOU AND KEEPS THE BUTTON.'
                               : 'A HOAR CRYSTAL IN THE HOLLOW UNDER THE ROOT, NEW SINCE YESTERDAY. THE YETI LOOKS PLEASED WITH ITSELF.');
  }

  // what each yeti does this frame: wander near home; hide from anyone coming at it quickly; come a little closer to
  // someone standing still; sit; follow; walk with you
  function updateYetis(world, now, dt) {
    var p = me();
    if (!p) return;
    if (!lastPos || lastPos.x !== p.x || lastPos.y !== p.y) { trail.push({ x: p.x, y: p.y, at: now }); lastPos = p; }
    trail = trail.filter(function (q) { return now - q.at < 1200; });
    var speed = trail.length ? (trail.length - 1) / 1.2 : 0;                     // tiles a second, lately
    var stillFor = trail.length ? now - trail[trail.length - 1].at : 0;
    yetis.forEach(function (o) {
      var Y = yeti(o.id), dx = p.x - o.fx, dy = p.y - o.fy, d = Math.hypot(dx, dy);
      var keep = [4, 2.2, 1.6, 1.4, 1.2, 1.2][Y.trust] || 1.2;
      var goal = null, spd = 0.9;
      o.curious = false;
      if (o.state === 'hide' && now < o.until) { goal = o.goal; spd = 2.6; }
      else if (o.state === 'sit' && now < o.until) goal = null;
      else {
        o.state = 'wander';
        var coming = d < 5.5 && speed > 2.6 && trail.length > 1 && Math.hypot(trail[0].x - o.fx, trail[0].y - o.fy) > d + 0.6;
        if (coming && !o.walks && Y.trust < 4) {                                  // too quick: off behind the rocks
          o.state = 'hide'; o.until = now + 6000; o.goal = hideSpot(world, o, p); goal = o.goal; spd = 2.6; sfx('hoot');
        } else if (o.walks) {                                                     // walking with you
          if (d > 1.6) { goal = [p.x - sgn(dx) * 1.2, p.y - sgn(dy) * 0.6]; spd = Math.min(4.5, 1 + d); }
        } else if (Y.trust >= 2 && d < 7 && Math.hypot(p.x - o.home[0], p.y - o.home[1]) < 7 && d > keep + 0.4) {   // follows a little
          goal = [p.x - dx / d * keep, p.y - dy / d * keep]; spd = 1.2;
        } else if (d < 6 && stillFor > (Y.trust ? 1500 : 3000) && d > keep + 0.3) {      // curious about someone standing still
          goal = [p.x - dx / d * keep, p.y - dy / d * keep]; spd = 0.6; o.curious = true;
        } else if (now > o.until) {                                               // pottering about near home
          o.goal = [o.home[0] + Math.round(Math.sin(o.seed + now / 4000) * 2.5), o.home[1] + Math.round(Math.cos(o.seed * 1.3 + now / 5200) * 1.5)];
          o.until = now + 2500 + (o.seed * 997 % 2000);
          goal = o.goal;
        } else goal = o.goal;
        o.sit = Y.trust >= 1 && !goal && d < 3;
        if (!goal && d < 5 && stillFor > 1200) o.curious = true;           // head on one side, watching you
      }
      if (goal) {
        var gx = goal[0] - o.fx, gy = goal[1] - o.fy, gd = Math.hypot(gx, gy);
        if (gd > 0.05) {
          var s = Math.min(gd, spd * dt / 1000), nx = o.fx + gx / gd * s, ny = o.fy + gy / gd * s;
          var cx = Math.round(nx), cy = Math.round(ny);
          if (open(world, cx, cy) || (cx === Math.round(o.fx) && cy === Math.round(o.fy)) || (cx === p.x && cy === p.y)) {
            o.fx = nx; o.fy = ny; o.face = gx < 0 ? -1 : gx > 0 ? 1 : o.face; o.sit = false;
          } else o.until = 0;
        }
      }
      o.inter.x = Math.round(o.fx); o.inter.y = Math.round(o.fy);
    });
  }
  function hideSpot(world, o, p) {
    var best = null, bs = -1;
    for (var y = o.home[1] - 5; y <= o.home[1] + 5; y++) {
      for (var x = o.home[0] - 6; x <= o.home[0] + 6; x++) {
        if (!open(world, x, y)) continue;
        var rock = !open(world, x + 1, y) || !open(world, x - 1, y) || !open(world, x, y - 1) || !open(world, x, y + 1);
        var s = Math.hypot(x - p.x, y - p.y) + (rock ? 3 : 0) - Math.hypot(x - o.fx, y - o.fy) * 0.3;
        if (s > bs) { bs = s; best = [x, y]; }
      }
    }
    return best || o.home;
  }

  // a yeti: big, shaggy and gentle — a body of tufted fur, cream lit and lavender in shadow, a dark blue-grey face with
  // small kind eyes, long arms down to its knees, big feet; it sways a little, tilts its head when it's curious, and
  // hiding it crouches behind a snowy rock with just its eyes over the top
  function drawYeti(g, o, u, now) {
    var P = painter(g, u), Y = yeti(o.id), t = now / 1000 + o.seed;
    var OL = '#3a3450', HI = '#fdfaf3', MI = '#ece6ee', SH = '#c2b8d6', DP = '#968cb4', FC = '#56637f', FL = '#74829e', EY = '#151522';
    var hide = o.state === 'hide' && o.goal && Math.hypot(o.goal[0] - o.fx, o.goal[1] - o.fy) < 0.3;
    var walk = !o.sit && !hide && o.moving, bob = walk ? Math.round(Math.abs(Math.sin(t * 6))) : 0;
    var sway = Math.round(Math.sin(t * 1.1) * 0.8), tilt = o.curious ? 1 : 0, sd = Math.floor(o.seed * 3);
    var blink = Math.sin(t * 1.3 + o.seed) > 0.97;
    g.save(); g.translate(16 * u, 31 * u); g.scale(o.face || 1, 1);
    function face(fx, fy, peek) {
      P.E(fx, fy, 3, 2, FC).R(fx - 1, fy - 2, 3, 1, FL);
      P.R(fx - 2, fy - 3, 6, 1, HI);                                       // a brow of fur over the eyes
      P.R(fx - 1, fy - 1, 1, 1, blink ? FC : EY).R(fx + 2, fy - 1, 1, 1, blink ? FC : EY);
      if (!blink) P.R(fx - 1, fy - 1, 1, 1, EY);
      if (!peek) {
        P.R(fx, fy + 1, 2, 1, Y.trust >= 1 ? '#3a3450' : FC);              // a mouth that smiles once it knows you
        if (Y.trust >= 1) P.R(fx - 2, fy, 1, 1, '#c890a8').R(fx + 3, fy, 1, 1, '#c890a8');
      }
    }
    if (hide) {                                                            // crouched behind a rock, peeking over it
      P.E(0, -13, 7, 5, MI, { jag: shag(sd, 3) }).E(-2, -15, 3, 2, HI, { inner: true });
      P.T([[-2, -17], [0, -20], [2, -17]], MI).T([[-7, -14], [-10, -13], [-7, -11]], MI).T([[7, -14], [10, -13], [7, -11]], MI);
      face(1, -13, true);
      P.go(OL);
      P.E(-7, -10, 2, 1, FC).E(7, -10, 2, 1, FC);                          // its fingers over the top
      P.E(0, -4, 11, 5, '#8a90a4', { jag: shag(2, 4) }).E(-2, -6, 7, 2, '#a4aabc', { inner: true }).E(4, -2, 6, 2, '#6a7086', { inner: true });
      P.E(-1, -8, 8, 1, '#f2f6fc', { inner: true });
      P.go('#2a2e3e');
      g.restore(); return;
    }
    var sit = o.sit, dy = (sit ? 5 : 0) - bob;
    if (sit) P.E(-6, -1, 3, 1, FC).E(6, -1, 3, 1, FC);                     // big feet stuck out in front
    else {
      var st_ = walk ? Math.round(Math.sin(t * 6)) : 0;
      P.E(-4 + st_, -4, 3, 3, MI, { jag: shag(sd + 1, 3) }).E(4 - st_, -4, 3, 3, MI, { jag: shag(sd + 2, 3) });
      P.E(-5 + st_, -1, 3, 1, FC).E(5 - st_, -1, 3, 1, FC);
    }
    var bx = sway;
    P.E(bx, -12 + dy, 8, 8, MI, { jag: shag(sd, 3) });                     // the great shaggy body
    [[-9, -15], [9, -15], [-9, -9], [9, -9], [-5, -5], [5, -5]].forEach(function (q) {   // tufts breaking its outline
      var s = q[0] < 0 ? -1 : 1;
      P.T([[bx + q[0], q[1] + dy - 2], [bx + q[0] + s * 3, q[1] + dy], [bx + q[0], q[1] + dy + 1]], MI);
    });
    var wave = !sit && o.state === 'wander' && Y.trust >= 1 && Math.sin(t * 0.7) > 0.95;
    var aw = walk ? Math.round(Math.sin(t * 6)) : 0;
    if (sit) { P.S(bx - 8, -13 + dy, bx - 4, -6 + dy, 4, MI).S(bx + 8, -13 + dy, bx + 4, -6 + dy, 4, MI).E(bx, -5 + dy, 3, 1, FC); }
    else {
      P.S(bx - 8, -16 + dy, bx - 12 - aw, -5 + dy, 4, MI).E(bx - 12 - aw, -3 + dy, 2, 1, FC);
      if (wave) P.S(bx + 8, -16 + dy, bx + 12, -25 + dy, 4, MI).E(bx + 12, -27 + dy, 2, 1, FC);
      else P.S(bx + 8, -16 + dy, bx + 12 + aw, -5 + dy, 4, MI).E(bx + 12 + aw, -3 + dy, 2, 1, FC);
    }
    var hx = bx + tilt, hy = -21 + dy;
    P.E(hx, hy, 6, 5, MI, { jag: shag(sd + 3, 3) });                       // the head, a hood of fur
    P.T([[hx - 2, hy - 4], [hx, hy - 7], [hx + 2, hy - 4]], MI).T([[hx + 1, hy - 4], [hx + 4, hy - 6], [hx + 3, hy - 3]], MI);
    // fur lit cream on the upper left, lavender in the shadows
    P.E(bx - 3, -14 + dy, 5, 5, HI, { inner: true }).E(bx + 6, -11 + dy, 2, 6, SH, { inner: true }).E(bx + 2, -5 + dy, 6, 1, SH, { inner: true }).E(bx + 7, -9 + dy, 1, 3, DP, { inner: true });
    P.E(hx - 2, hy - 2, 3, 2, HI, { inner: true }).E(hx + 3, hy + 2, 2, 1, SH, { inner: true });
    for (var s2 = 0; s2 < 4; s2++) P.R(bx - 5 + s2 * 3, -11 + dy + (s2 % 2) * 2, 1, 3, SH);   // strands of fur
    if (!sit) {                                                            // its arms, parted from its body by a shadow
      P.S(bx - 8, -14 + dy, bx - 10 - aw, -6 + dy, 1, DP, { inner: true }).S(bx + 8, -14 + dy, bx + 10 + aw, -6 + dy, 1, DP, { inner: true });
      P.S(bx - 9, -15 + dy, bx - 13 - aw, -6 + dy, 1, HI, { inner: true });
      if (!wave) P.S(bx + 10, -15 + dy, bx + 13 + aw, -6 + dy, 1, SH, { inner: true });
    }
    face(hx + 1, hy + 1, false);
    P.go(OL);
    g.restore();
  }

  // ---- drawing: the yetis among everyone; ripples, marks, icicles, shots and spray -------------------------------------
  var cv = null, lastT = 0;
  function items(world, offX, offY, ts, now, sc) {
    var dt = lastT ? Math.min(100, now - lastT) : 16; lastT = now;
    if (!yetis.length || yetis[0].inter && world.interactions.indexOf(yetis[0].inter) < 0) return [];
    updateYetis(world, now, dt);
    return yetis.map(function (o) {
      o.moving = Math.abs((o._lx || o.fx) - o.fx) + Math.abs((o._ly || o.fy) - o.fy) > 0.001; o._lx = o.fx; o._ly = o.fy;
      var foot = o.fy + 0.92;
      return { footRow: foot, draw: function (ctx) {
        var u = Math.max(1, Math.round(ts / 16)), S = 32 * u;
        if (!cv) cv = document.createElement('canvas');
        if (cv.width !== S) { cv.width = S; cv.height = S; }
        var g = cv.getContext('2d'); g.clearRect(0, 0, S, S);
        drawYeti(g, o, u, now);
        var dx = Math.round(offX + (o.fx + 0.5) * ts - S / 2), dy = Math.round(offY + foot * ts - S);
        var shadow = { x: Math.round(offX + (o.fx + 0.5) * ts), y: Math.round(offY + foot * ts), rx: 9, ry: 3 };
        if (sc && typeof BridgeScene !== 'undefined' && BridgeScene.drawOccluded) {
          BridgeScene.drawOccluded(ctx, sc, cv, 0, 0, S, S, dx, dy, foot, offX, offY,
            BridgeScene.tintAt ? BridgeScene.tintAt(sc, world, Math.round(o.fx), Math.round(o.fy), now) : null, shadow);
        } else ctx.drawImage(cv, dx, dy);
      } };
    });
  }
  function ground(ctx, world, offX, offY, ts) {
    var pn = performance.now(), FX = typeof BridgeFX !== 'undefined' && BridgeFX.disc ? BridgeFX : null;
    if (!FX) return;
    ctx.save();
    (world.interactions || []).forEach(function (h) {
      if (h.creature !== 'wyrm' || !under(h)) return;
      var cx = Math.round(offX + (h._rx + 0.5) * ts), cy = Math.round(offY + (h._ry + 0.8) * ts);
      (h._trail || []).forEach(function (q, i) {                                  // its wake: broken snow behind it
        var age = (pn - q[2]) / 2400;
        if (age >= 1) return;
        ctx.fillStyle = 'rgba(150,170,205,' + (0.35 * (1 - age)).toFixed(2) + ')';
        FX.disc(ctx, Math.round(offX + (q[0] + 0.5) * ts), Math.round(offY + (q[1] + 0.8) * ts), Math.round(ts * 0.3), 0.45);
      });
      for (var k = 0; k < 4; k++) {                                               // ripples going out through the snow, a lit edge over a shadowed one
        var ph = ((pn / 820) + k / 4) % 1, R = Math.round(ts * (0.5 + ph * 1.4)), a = (1 - ph);
        ctx.fillStyle = 'rgba(70,90,140,' + (0.55 * a).toFixed(2) + ')'; FX.ring(ctx, cx, cy + 1, R, 0.45);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * a).toFixed(2) + ')'; FX.ring(ctx, cx, cy, R, 0.45);
      }
      var heave = Math.round(Math.sin(pn / 180) * 1);
      ctx.fillStyle = 'rgba(60,80,130,0.5)'; FX.disc(ctx, cx + 1, cy + 3, Math.round(ts * 0.5), 0.42);   // the bulge and its shadow
      ctx.fillStyle = '#dfe8f6'; FX.disc(ctx, cx, cy - heave, Math.round(ts * 0.44), 0.45);
      ctx.fillStyle = '#ffffff'; FX.disc(ctx, cx - 3, cy - 2 - heave, Math.round(ts * 0.2), 0.5);
      for (var sp = 0; sp < 5; sp++) {                                            // snow thrown up off its back
        var q = ((pn / 600) + sp / 5) % 1;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - q)).toFixed(2) + ')';
        ctx.fillRect(Math.round(cx + Math.sin(sp * 2.4) * ts * 0.35), Math.round(cy - 3 - q * ts * 0.5), 2, 2);
      }
      if (h._attackPhase === 'winding') {                                         // closing in on where it'll come up
        var p = Math.min(1, (pn - h._attackStart) / (h._windFor || 1000)), t = h._attackTarget;
        var tx = Math.round(offX + (t.x + 0.5) * ts), ty = Math.round(offY + (t.y + 0.8) * ts);
        for (var j = 0; j < 3; j++) {
          var RR = Math.round(ts * (2.2 - p * 1.8 + j * 0.35));
          ctx.fillStyle = 'rgba(200,230,255,' + (0.25 + 0.5 * p - j * 0.1).toFixed(2) + ')';
          FX.ring(ctx, tx, ty, Math.max(2, RR), 0.5);
        }
        ctx.fillStyle = 'rgba(60,80,120,' + (0.5 * p).toFixed(2) + ')';            // cracks opening in the snow
        for (var c = 0; c < 6; c++) {
          var a = c * 1.05 + 0.3, L = Math.round(ts * 0.9 * p);
          for (var s = 2; s < L; s += 2) ctx.fillRect(Math.round(tx + Math.cos(a) * s + Math.sin(s * 0.7 + c) * 1.5), Math.round(ty + Math.sin(a) * s * 0.5), 2, 1);
        }
      }
    });
    hazards.forEach(function (z) {                                                // where the icicles will land
      if (z.world !== world) return;
      var p = Math.max(0, Math.min(1, (pn - z.at) / (z.land - z.at))), cx = Math.round(offX + (z.x + 0.5) * ts), cy = Math.round(offY + (z.y + 0.78) * ts), rx = Math.round(ts * 0.4);
      FX.glow(ctx, cx, cy, rx * 1.2, [170, 220, 255], 0.2 + 0.35 * p, 0.5);
      ctx.fillStyle = 'rgba(170,220,255,' + (0.1 + 0.15 * p).toFixed(2) + ')'; FX.disc(ctx, cx, cy, rx, 0.5);
      ctx.fillStyle = 'rgba(210,240,255,' + (0.5 + 0.4 * p).toFixed(2) + ')'; FX.ring(ctx, cx, cy, rx, 0.5);
      ctx.fillStyle = 'rgba(210,240,255,' + (0.3 + 0.6 * p).toFixed(2) + ')'; FX.ring(ctx, cx, cy, rx + Math.round((1 - p) * ts * 0.4), 0.5);
    });
    ctx.restore();
  }
  function over(ctx, world, offX, offY, ts, now) {
    var pn = performance.now(), FX = typeof BridgeFX !== 'undefined' && BridgeFX.disc ? BridgeFX : null;
    // icicles: falling onto their marks, then landing (a blow on whoever's still there)
    hazards = hazards.filter(function (z) {
      if (z.world !== world) return false;
      if (pn >= z.land && !z.hit) {
        z.hit = true;
        var p = me(), st = typeof BridgeInventory !== 'undefined' && BridgeInventory.getStats ? BridgeInventory.getStats() : null;
        sparks(z.x, z.y, '#e8f8ff', 8); sfx('icecrack');
        if (p && p.x === z.x && p.y === z.y && !(st && st.hp <= 0)) {
          if (typeof BridgeArms !== 'undefined' && BridgeArms.dodging()) text(p.x, p.y, 'DODGED', '#c8f0ff');
          else {
            BridgeInventory.takeDamage(10); shake(3);
            if (BridgeCharacter.hurt) BridgeCharacter.hurt();
            text(p.x, p.y, '-10', '#ff5060');
          }
        }
      }
      return pn < z.land + 500;
    });
    if (!FX) return;
    ctx.save();
    hazards.forEach(function (z) {
      var k = (pn - z.at) / (z.land - z.at), cx = Math.round(offX + (z.x + 0.5) * ts), cy = Math.round(offY + (z.y + 0.7) * ts);
      if (k < 1) {
        var fall = Math.round((1 - k * k) * ts * 6), y = cy - fall;
        ctx.fillStyle = '#0c1828';
        for (var i = 0; i < 9; i++) ctx.fillRect(cx - Math.max(0, 3 - Math.floor(i / 3)) - 1, y - 9 + i, Math.max(1, 3 - Math.floor(i / 3)) * 2 + 2, 1);
        ctx.fillStyle = '#dff4ff';
        for (var j = 0; j < 8; j++) ctx.fillRect(cx - Math.max(0, 2 - Math.floor(j / 3)), y - 8 + j, Math.max(1, (2 - Math.floor(j / 3)) * 2), 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, y - 8, 1, 4);
      } else {
        var e = (pn - z.land) / 500;
        ctx.fillStyle = 'rgba(230,248,255,' + (0.8 * (1 - e)).toFixed(2) + ')';
        FX.ring(ctx, cx, cy, Math.round(3 + e * ts * 0.5), 0.5);
        for (var s = 0; s < 6; s++) ctx.fillRect(Math.round(cx + Math.cos(s) * e * 10), Math.round(cy - 4 + Math.sin(s) * e * 5 - (1 - e) * 4), 2, 2);
      }
    });
    shots = shots.filter(function (b) { return pn - b.at < b.dur + 260; });
    ctx.globalCompositeOperation = 'lighter';
    shots.forEach(function (b) {
      var k = Math.min(1, (pn - b.at) / b.dur);
      var X = offX + (b.x0 + (b.x1 - b.x0) * k) * ts, Y = offY + (b.y0 + (b.y1 - b.y0) * k) * ts - Math.sin(Math.PI * k) * ts * (b.col === 'chill' ? 0.4 : 0.2);
      if (k < 1) {
        for (var i = 1; i < 7; i++) {
          var q = k - i * 0.05;
          if (q <= 0) break;
          ctx.fillStyle = 'rgba(190,235,255,' + (0.55 - i * 0.07).toFixed(2) + ')';
          ctx.fillRect(Math.round(offX + (b.x0 + (b.x1 - b.x0) * q) * ts + Math.sin(i * 2.1 + pn / 80)), Math.round(offY + (b.y0 + (b.y1 - b.y0) * q) * ts - Math.sin(Math.PI * q) * ts * 0.3), i < 3 ? 2 : 1, i < 3 ? 2 : 1);
        }
        FX.glow(ctx, X, Y, b.col === 'chill' ? 10 : 7, [150, 220, 255], 0.55);
        ctx.fillStyle = '#e8faff'; FX.disc(ctx, X, Y, b.col === 'chill' ? 3 : 2);
      } else {
        var e = Math.min(1, (pn - b.at - b.dur) / 260), LX = offX + b.x1 * ts, LY = offY + b.y1 * ts;
        FX.glow(ctx, LX, LY, 12 * (1 - e * 0.4), [170, 225, 255], 0.5 * (1 - e));
        ctx.fillStyle = 'rgba(225,245,255,' + (0.85 * (1 - e)).toFixed(2) + ')';
        FX.ring(ctx, LX, LY, 3 + e * 10, 0.6);
      }
    });
    ctx.globalCompositeOperation = 'source-over';
    burst = burst.filter(function (b) { return pn - b.at < 900; });
    burst.forEach(function (b) {                                                  // snow thrown up by the breach
      var s = (pn - b.at) / 1000, x = offX + (b.x + b.vx * s * 0.6) * ts / 4 * 4, y = offY + (b.y + (b.vy * s + 9 * s * s) * 0.5) * ts;
      ctx.fillStyle = b.big ? '#ffffff' : '#dfe9f6';
      ctx.fillRect(Math.round(offX + (b.x + b.vx * s * 0.4) * ts), Math.round(y), b.big ? 3 : 2, b.big ? 3 : 2);
      void x;
    });
    (world.interactions || []).forEach(function (q) {                             // a yeti's gift, glinting or steaming
      if (q.type !== 'yeti_gift') return;
      var gx = Math.round(offX + (q.x + 0.5) * ts), gy = Math.round(offY + (q.y + 0.6) * ts);
      if (q.spring) {
        for (var m = 0; m < 4; m++) { var ph = ((pn / 1600) + m / 4) % 1; ctx.fillStyle = 'rgba(240,248,255,' + (0.5 * (1 - ph)).toFixed(2) + ')'; ctx.fillRect(Math.round(gx + Math.sin(pn / 700 + m) * 4), Math.round(gy - ph * ts), 2, 2); }
      } else if (Math.sin(pn / 300 + q.x) > 0.6) { ctx.fillStyle = '#e8f8ff'; ctx.fillRect(gx, gy - 2, 1, 3); ctx.fillRect(gx - 1, gy - 1, 3, 1); }
    });
    ctx.restore();
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('hoarfell', { ground: ground, items: items, over: over });
  }
  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('yeti', useYeti, 'Offer');
    BridgeInteractions.register('yeti_gift', useGift, 'Look');
  }

  // ---- tests ---------------------------------------------------------------------------------------------------------
  function _spawn(kind, x, y) {
    var w = BridgeWorld.getWorld(), h = BridgeCombat.spawn(w, kind, x, y);
    if (kind === 'wyrm') { h._attackPhase = 'under'; h._init = false; }
    if (kind === 'beetle') h._dir = 'down';
    h._pack = 99;
    return h;
  }
  function _yeti(x, y, i) {
    var w = BridgeWorld.getWorld();
    if (!w.__valleyYetis) { w.__valleyYetis = true; yetis = []; }
    return addYeti(w, x, y, 'test#' + (i || 0), i || 0);
  }

  return { decorate: decorate, KINDS: KINDS, ROSTER: ROSTER, FOODS: FOODS,
           _spawn: _spawn, _yeti: _yeti, _yetis: function () { return yetis; }, _walker: function () { return walker; },
           _drawYeti: drawYeti, _feed: function (o, id) { BridgeInventory.addItem(id, 1); feed(o, o.inter, id); }, _use: useYeti, _gift: useGift,
           _day: function (n) { shift = n; }, _save: function () { return save; }, _hazards: function () { return hazards; },
           _reset: function () { save = { yetis: {}, found: {} }; store(); } };
})();
