/**
 * BridgeClimb — climbing the face of the Hoarspire, in the world, at the world's own scale.
 *
 * The face is a world (`hoarfell-face`, scenes/hoarfell_face.py): one great
 * wall of rock, three lines up it, every hold built into the render where the
 * world JSON's `climb` block says it is (x, z on the face, kind, and the row
 * on screen). On the wall this module is the world's mode
 * (BridgeWorld.setMode): the pilot hangs from the holds with the climbing
 * sheet (characters.py pilot-climb, back to you), the camera following up.
 *
 * You climb hold to hold: the holds in reach are ringed; ←/→ choose one, ↑
 * (or E/Space) reaches for it, ↓ climbs down to the best hold below. Every
 * reach costs stamina — a long one more, a crimp or an ice placement more
 * again — and hanging drains it, faster in the cold without a Thermal Suit
 * and faster still when the wind gusts on the Hoarspire (unless you're on a
 * good jug). Ledges are rests: stand on one and your arms come back; they're
 * also the bolts — fall with a climbing rope (or on the Staircase's fixed
 * line) and you're caught at the last one, without, you go to the foot. A
 * fall costs health. Loose (rust-coloured) holds crumble a moment after you
 * take them; slopers spit you off when you're tired; ice takes an ice axe.
 * C chalks your hands (+25). Hoar crystals glow in the rock off the lines.
 * The face is one face: traverse between the lines if you like.
 *
 * Routes: the Staircase (I), the Icefall (III, needs an ice axe), the
 * Hoarspire (V, wind). Topping out pays (the first ascent well, then once a
 * day), keeps your best time, and walks you out onto the summit. Saved in
 * localStorage bridge_climb.
 *
 *   BridgeClimb.start(routeId)       // a 'climb' interaction: Fellhaven's route feet, or the face's own
 *   BridgeClimb.board()              // the route board: grades, your ascents
 *   BridgeClimb.items / over         // the hoarfell tileset's scene hooks (js/worlds/hoarfell.js)
 */
var BridgeClimb = (function () {
  var KEY = 'bridge_climb', WORLD = 'hoarfell-face';
  var REACH = 2.5, HANDPX = 31, C45 = Math.SQRT1_2;
  var ROUTES = {
    staircase: { name: 'THE STAIRCASE', grade: 'I', fixed: true, first: 60, again: 15, gift: ['edelweiss', 1],
                 blurb: 'Big holds, a fixed line all the way. The one to learn on.' },
    icefall:   { name: 'THE ICEFALL', grade: 'III', needs: 'ice_axe', first: 150, again: 30, gift: ['hoar_crystal', 3],
                 blurb: 'Up the frozen waterfall. You will want an ice axe.' },
    hoarspire: { name: 'THE HOARSPIRE', grade: 'V', wind: true, first: 400, again: 60, gift: ['summit_crystal', 1],
                 blurb: 'The peak itself. Small holds, loose rock, and the wind.' }
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

  var save = load();
  var g = null;                 // the climb in progress
  var hud = null;

  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || { routes: {} };
    d.routes = d.routes || {};
    if (d.v !== 2) {               // the old panel's times don't compare with the face's
      Object.keys(d.routes).forEach(function (id) { d.routes[id].best = 0; });
      d.v = 2;
    }
    return d;
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function day() { return Math.floor(Date.now() / 86400000); }
  function warm() { return typeof BridgeGear !== 'undefined' && BridgeGear.has('cold'); }
  function fmt(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  function data() { var w = BridgeWorld.getWorld(); return w && w.climb ? w : null; }

  // ---- the face's holds, as things to climb -------------------------------------------------------------------
  function build(w, rid) {
    var C = w.climb, holds = [];
    C.holds.forEach(function (h, i) { holds.push({ x: h[0], z: h[1], kind: h[2], sy: h[3], id: i }); });
    C.ledges.forEach(function (l) { holds.push({ x: (l[0] + l[1]) / 2, w: l[1] - l[0], z: l[2], sy: l[3], kind: 'ledge', cp: true }); });
    var foot = { x: C.routes[rid].x, w: 60, z: 0, sy: C.face + 0.25, kind: 'ledge', cp: true, foot: true };
    var top = { x: 18, w: 80, z: C.top, sy: C.topRow, kind: 'top', cp: true };
    holds.push(foot, top);
    return { holds: holds, foot: foot, top: top };
  }
  // where your hands go on a hold (a ledge or the top: the point on it nearest you)
  function grip(h, nearX) {
    if (h.kind === 'ledge' || h.kind === 'top') { var x = clamp(nearX, h.x - h.w / 2 + 0.3, h.x + h.w / 2 - 0.3); return { x: x, z: h.z, sy: h.sy }; }
    return { x: h.x, z: h.z, sy: h.sy };
  }
  function usable(h) { return !(h.broke || h.taken) && !(h.kind === 'ice' && !has('ice_axe')); }
  var STAND_REACH = 1.4;          // standing on a ledge (or the ground), your hands start this far above your feet
  function standing() { return (g.at.kind === 'ledge' || g.at.kind === 'top') && !g.anim; }
  function candidates() {
    var from = standing() ? { x: g.hand.x, z: g.hand.z + STAND_REACH } : g.hand, out = [];
    g.wall.holds.forEach(function (h) {
      if (h === g.at || h.broke || h.taken) return;
      var p = grip(h, from.x), d = Math.hypot(p.x - from.x, p.z - from.z);
      if (h.kind === 'top' && from.z < h.z - REACH) return;
      if (d > REACH || p.z < from.z - 1.6) return;
      if (standing() && h.kind === 'ledge' && Math.abs(h.z - g.at.z) < 0.3) return;
      out.push({ h: h, p: p, d: d, ok: usable(h), a: Math.atan2(p.z - from.z, p.x - from.x) });
    });
    out.sort(function (a, b) { return b.a - a.a; });              // left to right across the top
    return out;
  }
  function refresh() {
    g.cands = candidates();
    var best = -1, bz = -1e9;
    g.cands.forEach(function (c, i) { if (c.ok && c.p.z > bz) { bz = c.p.z; best = i; } });
    g.sel = best < 0 ? 0 : best;
  }

  // ---- starting -----------------------------------------------------------------------------------------------
  function start(rid) {
    var D = ROUTES[rid];
    if (!D) return;
    if (BridgeWorld.getWorldId() === WORLD) return begin(rid);
    var x = { staircase: 7, icefall: 18, hoarspire: 28 }[rid] || 18;
    BridgeWorld.enterWorld(WORLD, [x, 35], function () { begin(rid); });
  }

  function begin(rid) {
    var w = data();
    if (!w) return;
    var wall = build(w, rid);
    g = { rid: rid, w: w, wall: wall, at: wall.foot, hand: grip(wall.foot, wall.foot.x), stam: 100, max: 100, t: 0, started: false,
          falls: 0, crystals: 0, phase: 'climb', anim: null, gust: null, nextGust: 6 + Math.random() * 3, crumble: null, slip: 0,
          lastCp: wall.foot, chalkT: 0, restT: 0, prev: {}, cands: [], sel: 0 };
    refresh();
    BridgeWorld.setMode({ update: update, focus: focus, solo: true, end: function () { quit(true); } });
    ensureHud();
    hud.classList.add('on');
    hud.querySelector('.sk-name').textContent = ROUTES[rid].name + '  ' + ROUTES[rid].grade;
    document.addEventListener('keydown', onKey, true);
    var D = ROUTES[rid], best = save.routes[rid] && save.routes[rid].best;
    var rope = D.fixed ? 'A FIXED LINE ALL THE WAY.' : has('climbing_rope') ? 'YOU TIE IN TO YOUR ROPE.' : 'NO ROPE: A FALL TAKES YOU TO THE FOOT.';
    say(rope + (D.needs && !has(D.needs) ? ' NO ICE AXE - THE ICE IS NO USE TO YOU.' : '') + (best ? '  BEST ' + fmt(best) : ''), 3200);
    pose(performance.now());
    sfx('open');
  }

  function onKey(e) {
    if (!g) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return abseil(); }
    if ((e.key === 'c' || e.key === 'C') && !e.repeat) { e.preventDefault(); e.stopPropagation(); chalk(); }
  }

  // ---- each frame -------------------------------------------------------------------------------------------------
  function update(dt) {
    if (!g) return;
    var now = performance.now(), held = BridgeControls.held(), act = BridgeControls.consumeAction(), taps = BridgeControls.consumeTaps();
    var press = function (k) { return !!taps[k]; };
    if (g.phase === 'fall') return falling(dt, now);
    if (g.phase === 'down') return lowering(dt, now);
    if (g.phase !== 'climb') return;
    if (g.started) g.t += dt;
    if (g.anim) {
      var a = g.anim, k = Math.min(1, (now - a.t0) / a.dur), s = k * k * (3 - 2 * k);
      g.hand = { x: a.from.x + (a.to.x - a.from.x) * s, z: a.from.z + (a.to.z - a.from.z) * s, sy: a.from.sy + (a.to.sy - a.from.sy) * s };
      if (k >= 1) { g.hand = a.to; g.anim = null; arrive(a.h); }
    } else {
      if (press('left') || press('right')) {
        if (g.cands.length) { g.sel = (g.sel + (taps.left ? -1 : 1) + g.cands.length) % g.cands.length; sfx('click'); }
      }
      if (press('up') || act) reach(g.cands[g.sel]);
      else if (press('down')) {
        var below = g.cands.filter(function (c) { return c.ok && c.p.z < g.hand.z - 0.3; }).sort(function (a, b) { return b.p.z - a.p.z; })[0];
        if (below) reach(below);
      }
      if (g.anim) { g.prev = held; pose(now); hudTick(); return; }
      var K = KIND[g.at.kind], resting = K.hang === 0;
      var gusting = g.gust && now > g.gust.start && now < g.gust.end;
      if (resting) { g.stam = Math.min(g.max, g.stam + 22 * dt); g.restT += dt; }
      else {
        g.restT = 0;
        g.stam -= 1.7 * K.hang * (warm() ? 1 : 1.6) * (gusting && g.at.kind !== 'jug' ? 3.2 : 1) * dt;
      }
      if (g.crumble && now > g.crumble) { g.at.broke = true; g.crumble = null; sfx('crumble'); return fall('THE HOLD BREAKS AWAY!'); }
      if (g.at.kind === 'sloper' && g.stam < 25) {
        g.slip += dt;
        if (g.slip > 0.9) return fall('YOUR FINGERS SLIDE OFF THE SLOPER.');
      }
      if (g.stam <= 0) return fall('YOUR ARMS GIVE OUT.');
    }
    // the wind on the Hoarspire's upper face: snow streaks first, then the gust
    if (ROUTES[g.rid].wind && g.hand.z > 8) {
      g.nextGust -= dt;
      if (!g.gust && g.nextGust < 1.2) { g.gust = { start: now + 1100, end: now + 2700 }; say('THE WIND IS COMING - HUG A JUG.'); }
      if (g.gust && now > g.gust.end) { g.gust = null; g.nextGust = 6 + Math.random() * 4; }
    }
    g.prev = held;
    pose(now);
    hudTick();
  }

  function reach(c) {
    if (!c || g.anim) return;
    if (!c.ok) { sfx('error'); return say(c.h.kind === 'ice' ? 'ICE - YOU NEED AN ICE AXE.' : 'YOU CAN\'T USE THAT.'); }
    g.started = true;
    var cost = 3 + 8 * Math.pow(c.d / REACH, 2) + KIND[c.h.kind].cost + (warm() ? 0 : 1);
    if (c.p.z < g.hand.z) cost *= 0.5;                             // climbing down is cheaper
    if (g.at.foot) cost = Math.min(cost, 4);                        // stepping onto the wall from the ground
    g.stam -= cost;
    g.anim = { from: { x: g.hand.x, z: g.hand.z, sy: g.hand.sy }, to: c.p, h: c.h, t0: performance.now(), dur: 260 + c.d * 120, dir: c.p.x < g.hand.x ? -1 : 1 };
    sfx('step');
  }

  function arrive(h) {
    g.at = h;
    g.crumble = h.kind === 'loose' ? performance.now() + 1100 : null;
    g.slip = 0;
    if (h.cp && h.z >= g.lastCp.z) g.lastCp = h;
    if (h.kind === 'loose') { say('LOOSE! IT SHIFTS UNDER YOUR HAND - MOVE ON.'); sfx('crumble'); }
    if (h.kind === 'crystal') {
      h.taken = true;
      g.crystals++;
      if (typeof BridgeInventory !== 'undefined') BridgeInventory.addItem('hoar_crystal', 1);
      sfx('pickup');
      say('A HOAR CRYSTAL, PRISED OUT OF THE ROCK.');
    }
    if (h.kind === 'ledge' && !h.foot) say(ROUTES[g.rid].fixed || has('climbing_rope') ? 'A LEDGE. YOU CLIP THE BOLT AND SHAKE OUT YOUR ARMS.' : 'A LEDGE. BREATHE.');
    if (h.kind === 'top') return summit();
    if (g.stam <= 0) return fall('YOUR ARMS GIVE OUT.');
    refresh();
  }

  function fall(why) {
    if (g.phase !== 'climb') return;
    g.falls++;
    g.anim = null;
    var caught = ROUTES[g.rid].fixed || has('climbing_rope'), to = caught ? g.lastCp : g.wall.foot;
    var dest = grip(to, g.hand.x);
    g.phase = 'fall';
    g.fallAnim = { from: { x: g.hand.x, z: g.hand.z, sy: g.hand.sy }, to: dest, h: to, t0: performance.now(), dur: 450 + Math.min(1100, (g.hand.z - to.z) * 60) };
    sfx('fail');
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.takeDamage(caught ? 6 : 10);
    say(why + ' ' + (caught ? 'THE ROPE CATCHES YOU AT THE LAST LEDGE.' : 'NO ROPE - ALL THE WAY TO THE FOOT.'), 2600);
  }
  function falling(dt, now) {
    var f = g.fallAnim, k = Math.min(1, (now - f.t0) / f.dur), e = k * k;
    g.hand = { x: f.from.x + (f.to.x - f.from.x) * k + Math.sin(k * 12) * 0.25 * (1 - k), z: f.from.z + (f.to.z - f.from.z) * e,
               sy: f.from.sy + (f.to.sy - f.from.sy) * e };
    pose(now);
    if (k < 1) return;
    g.at = f.h; g.hand = f.to; g.fallAnim = null; g.crumble = null;
    g.wall.holds.forEach(function (hh) { hh.broke = false; });   // the rock settles: loose holds are back, still loose
    g.stam = Math.max(g.stam, 30);
    g.phase = 'climb';
    sfx('land');
    var st = typeof BridgeInventory !== 'undefined' ? BridgeInventory.getStats() : { hp: 100 };
    if (st.hp <= 0) {
      quit(true);
      if (typeof BridgeCombat !== 'undefined' && BridgeCombat.faint) BridgeCombat.faint();
      return;
    }
    refresh();
    pose(now);
  }

  // Esc: lower off to the foot (from the foot: step away from the wall)
  function abseil() {
    if (!g || g.phase === 'fall') return;
    if (g.at.foot && !g.anim) return quit(false);
    g.phase = 'down';
    g.anim = null;
    var to = grip(g.wall.foot, g.hand.x);
    g.downAnim = { from: { x: g.hand.x, z: g.hand.z, sy: g.hand.sy }, to: to, t0: performance.now(), dur: 500 + g.hand.z * 70 };
    say('YOU LOWER OFF TO THE FOOT.');
  }
  function lowering(dt, now) {
    var a = g.downAnim, k = Math.min(1, (now - a.t0) / a.dur);
    g.hand = { x: a.from.x + (a.to.x - a.from.x) * k, z: a.from.z + (a.to.z - a.from.z) * k, sy: a.from.sy + (a.to.sy - a.from.sy) * k };
    pose(now);
    if (k >= 1) quit(true);
  }

  function summit() {
    var D = ROUTES[g.rid], rec = save.routes[g.rid] || (save.routes[g.rid] = { ascents: 0, best: 0, paid: 0 });
    var first = !rec.ascents, t = g.t;
    rec.ascents++;
    var newBest = !rec.best || t < rec.best;
    if (newBest) rec.best = t;
    var pay = first ? D.first : rec.paid !== day() ? D.again : 0;
    if (pay) rec.paid = day();
    store();
    g.phase = 'top';
    sfx('quest');
    if (pay && typeof BridgeProgression !== 'undefined') BridgeProgression.awardCoins(pay, 'climb:' + g.rid);
    if (first && D.gift && typeof BridgeInventory !== 'undefined') BridgeInventory.addItem(D.gift[0], D.gift[1]);
    if (first && typeof BridgeProgression !== 'undefined') BridgeProgression.recordAchievement('climbed_' + g.rid, 0, { source: 'climb' });
    var gift = first && D.gift && typeof BridgeItems !== 'undefined' ? BridgeItems.get(D.gift[0]) : null;
    var text = D.name + ' IN ' + fmt(t) + (newBest && !first ? ' - YOUR BEST YET' : '') + '.\n\n' +
      (g.falls ? g.falls + (g.falls === 1 ? ' FALL' : ' FALLS') + '. ' : 'NOT A SINGLE FALL. ') +
      (g.crystals ? g.crystals + ' HOAR CRYSTAL' + (g.crystals > 1 ? 'S' : '') + '. ' : '') +
      (pay ? pay + ' COINS' + (first ? ' FOR A FIRST ASCENT' : '') + '. ' : '') +
      (gift ? '\n\nAND ' + (D.gift[1] > 1 ? D.gift[1] + ' ' : /^[aeiou]/i.test(gift.name) ? 'AN ' : 'A ') + gift.name.toUpperCase() + (D.gift[1] > 1 ? 'S' : '') + ', FROM THE TOP.' : '');
    var rid = g.rid;
    pose(performance.now());
    setTimeout(function () {
      BridgeInteractions.execute({ type: 'menu', label: 'THE TOP', dialog: text, options: [
        { label: 'Walk out onto the summit', action: 'enter_world', target: 'hoarfell-summit', spawn: { staircase: [6, 14], icefall: [12, 14], hoarspire: [19, 14] }[rid] || [12, 14] },
        { label: 'Abseil back down', action: 'close' }
      ] });
      quit(true);
    }, 700);
  }

  function chalk() {
    if (!g || g.phase !== 'climb') return;
    if (!has('chalk')) { sfx('error'); return say('NO CHALK. YSOLDE SELLS IT AT THE GUIDE HUT.'); }
    if (g.stam >= g.max - 2) return;
    BridgeInventory.removeItem('chalk', 1);
    g.stam = Math.min(g.max, g.stam + 25);
    g.chalkT = performance.now();
    sfx('sow');
  }

  // off the wall: back to walking at the foot
  function quit(quiet) {
    if (!g) return;
    var w = data(), x = g.hand.x;
    g = null;
    document.removeEventListener('keydown', onKey, true);
    if (hud) hud.classList.remove('on');
    if (BridgeWorld.getMode()) BridgeWorld.setMode(null);
    BridgeCharacter.setPose(null);
    if (w) {
      var foot = w.climb.foot, tx = clamp(Math.round(x), 1, w.width - 2), spot = null;
      for (var d = 0; d < 8 && !spot; d++) [tx - d, tx + d].forEach(function (X) { if (!spot && w.collisions[foot] && w.collisions[foot][X] === 0) spot = [X, foot]; });
      if (spot) BridgeCharacter.init(spot[0], spot[1]);
      BridgeCharacter.setFacing('up');
    }
    if (!quiet) say('YOU STEP AWAY FROM THE WALL.');
  }

  // ---- the climber ----------------------------------------------------------------------------------------------------
  // climbing sheet (back to you): hang 0-3, reach left 4, right 5, pull up 6, mantle 7, stand 8, falling 9, chalk 10, shake out 11
  function pose(now) {
    var C = g.w.climb, footRow = C.face + 0.25, col, stand = standing();
    var handRow = g.hand.sy, lift;
    if (g.phase === 'fall') col = 9;
    else if (g.phase === 'top') col = 7;
    else if (g.phase === 'down') col = [0, 1, 2, 1][Math.floor(now / 200) % 4];
    else if (g.anim) col = (now - g.anim.t0) / g.anim.dur < 0.5 ? (g.anim.dir < 0 ? 4 : 5) : 6;
    else if (now - g.chalkT < 600) col = 10;
    else if (stand) col = g.restT > 1.2 && Math.floor(now / 900) % 3 === 0 ? 11 : 8;
    else col = [0, 1, 2, 1][Math.floor(now / 340) % 4];
    // feet on a ledge (or the ground) when standing; otherwise hands on the hold, body hanging below
    if (stand) lift = (footRow - handRow) * 32;
    else lift = (footRow - handRow) * 32 - HANDPX;
    var shake = g.gust && now > g.gust.start && now < g.gust.end && g.at.kind !== 'jug' ? Math.round(Math.sin(now / 40)) : 0;
    BridgeCharacter.setPose({ kind: 'climb', x: g.hand.x + shake / 32, y: footRow, row: 2, col: col, flip: false, lift: Math.max(0, lift) });
  }
  function focus() {
    if (!g) return null;
    return { x: g.hand.x - 0.5, y: g.hand.sy - 1.2 };
  }

  // ---- drawing (the hoarfell tileset's scene hooks) -------------------------------------------------------------------
  // over: the holds in reach ringed, the chosen one lit with a dotted line from your hand; taken crystals and
  // broken holds patched over; the wind
  function over(ctx, world, offX, offY, ts, now) {
    if (!world.climb) return;
    if (!g) return;
    g.wall.holds.forEach(function (h) {
      if (!h.taken && !h.broke) return;
      var x = Math.round(offX + h.x * ts), y = Math.round(offY + h.sy * ts);
      ctx.fillStyle = h.taken ? '#3e4252' : '#2a2c38';
      ctx.fillRect(x - 4, y - 3, 8, 6);
      ctx.fillStyle = '#5a6074';
      ctx.fillRect(x - 3, y - 3, 6, 1);
    });
    if (g.phase === 'climb' && !g.anim) {
      var hx = offX + g.hand.x * ts, hy = offY + (g.hand.sy - (standing() ? STAND_REACH * C45 : 0)) * ts;
      g.cands.forEach(function (c, i) {
        var x = Math.round(offX + c.p.x * ts), y = Math.round(offY + c.p.sy * ts), on = i === g.sel, pulse = 0.5 + 0.5 * Math.sin(now / 200);
        ctx.strokeStyle = !c.ok ? 'rgba(240,90,80,0.85)' : on ? 'rgba(255,240,160,' + (0.75 + 0.25 * pulse).toFixed(2) + ')' : 'rgba(210,235,255,0.55)';
        ctx.lineWidth = 1;
        var r = on ? 6 : 5;
        if (c.h.kind === 'ledge' || c.h.kind === 'top') ctx.strokeRect(x - 8.5, y - 2.5, 17, 5);
        else ctx.strokeRect(x - r + 0.5, y - r + 1.5, r * 2 - 1, r * 2 - 2);
        if (on) {
          ctx.fillStyle = 'rgba(255,240,160,0.6)';
          for (var s = 1; s < 6; s++) ctx.fillRect(Math.round(hx + (x - hx) * s / 6), Math.round(hy + (y - hy) * s / 6), 1, 1);
        }
      });
    }
    // the gust: snow streaking across the face
    if (g.gust && now > g.gust.start - 1100 && now < g.gust.end) {
      var strong = now > g.gust.start, v = BridgeWorld.getView();
      ctx.fillStyle = strong ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)';
      for (var i = 0; i < (strong ? 60 : 20); i++) {
        var yy = (i * 53 + Math.floor(now / 7) * (i % 3 + 1)) % v.h, xx = (i * 97 + now * (strong ? 0.9 : 0.4)) % (v.w + 40) - 20;
        ctx.fillRect(Math.round(xx), Math.round(yy), strong ? 8 : 4, 1);
      }
    }
  }

  // ---- the HUD: the route, the clock, your arms ----------------------------------------------------------------------
  function ensureHud() {
    if (hud) return;
    hud = document.createElement('div');
    hud.id = 'climb-hud';
    hud.className = 'sport-hud';
    hud.innerHTML = '<div class="sk-top"><b class="sk-name"></b><span class="sk-clock"></span><span class="cl-arms"><i></i></span></div>' +
      '<div class="sk-msg"></div><div class="sk-help">← → choose a hold · ↑ reach · ↓ climb down · C chalk · Esc lower off</div>';
    document.body.appendChild(hud);
  }
  var msgT = 0;
  function say(t, ms) {
    ensureHud();
    var m = hud.querySelector('.sk-msg');
    m.textContent = t;
    m.classList.add('on');
    clearTimeout(msgT);
    msgT = setTimeout(function () { m.classList.remove('on'); }, ms || 1800);
  }
  function hudTick() {
    if (!hud || !g) return;
    hud.querySelector('.sk-clock').textContent = fmt(g.t);
    var pct = clamp(g.stam / g.max, 0, 1), bar = hud.querySelector('.cl-arms i');
    bar.style.width = Math.round(pct * 100) + '%';
    bar.style.background = pct < 0.25 ? '#e05a48' : pct < 0.5 ? '#f0b040' : '#7ad0f0';
  }

  function board() {
    var lines = Object.keys(ROUTES).map(function (id) {
      var D = ROUTES[id], r = save.routes[id];
      return D.name + ' (' + D.grade + ') - ' + D.blurb.toUpperCase() + '\n   ' +
        (r && r.ascents ? 'YOU: ' + r.ascents + (r.ascents === 1 ? ' ASCENT' : ' ASCENTS') + (r.best ? ', BEST ' + fmt(r.best) : '') : 'NOT YET CLIMBED');
    });
    if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say('ROUTE BOARD', 'CHALKED ON A SLATE UNDER A LITTLE ROOF:\n\n' + lines.join('\n\n'));
  }

  return { start: start, board: board, ROUTES: ROUTES, isOpen: function () { return !!g; }, over: over,
           records: function (id) { return save.routes[id] || null; },
           _g: function () { return g; }, _reach: function (i) { if (g) reach(g.cands[i == null ? g.sel : i]); } };
})();
