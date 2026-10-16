/**
 * BridgeSki — skiing on Hoarfell, in the world, at the world's own scale.
 *
 * The pistes are a world (`hoarfell-piste`, scenes/hoarfell_piste.py): three
 * runs from start huts along the crest down to one finish. On skis the pilot
 * is no longer stepping tile to tile — this module is the world's mode
 * (BridgeWorld.setMode) and poses the pilot (BridgeCharacter.setPose) with
 * the ski sheets (characters.py pilot-ski): a heading you steer (←/→, any
 * angle from straight down the fall line to right across it), speed from the
 * slope under you (`ski.grade`, a digit a tile), tuck (↓) to go faster,
 * snowplough (↑) to slow, turn across the hill to stop. Space/E pushes off
 * with the poles; off a kicker it spins you (land it straight or go down).
 * Powder off the piste bogs you down, moguls shake you, ice won't turn.
 * Trees, rocks and walls put you in the snow (you get up beside them).
 * The camera runs ahead of you down the hill.
 *
 * Races: a run's start hut (or the lift) puts you in the gate; 3-2-1 and the
 * clock runs to the finish arch; pass between each pair of flags (a miss is
 * +3 s, a landed spin -1 s). Your best run is kept as a ghost and skis beside
 * you next time; Liv (people.json) races you as a rival — her line is the
 * same physics skied by a careful hand (`rivalLine`). Free skiing: no clock,
 * no gates, anywhere on the mountain; stop and press E to take your skis off.
 *
 * The Park (`hoarfell-park`, scenes/hoarfell_park.py), below the pistes: a
 * scored run (`BridgeSki.park()`) down two lines of kickers and rails. In the
 * air Space spins and holding ↓ grabs; land on a rail (or ride onto one
 * from its foot) and you slide it — ←/→ keep your balance as it tips you,
 * Space pops you off. Tricks landed close together chain into a combo (each
 * one adds to the multiplier, up to x5); a fall loses the chain. Juno (people.json)
 * holds the park's score to beat.
 *
 * Kept in localStorage bridge_ski: per run {runs, best, paid, firstPaid, ghost}, rival wins, park {best, runs, paid, juno}.
 *
 *   BridgeSki.start(runId | null, {rival: true})   // null: free skiing (from where you are, or the top)
 *   BridgeSki.park()                                // a scored run down the Park
 *   BridgeSki.RUNS, .best(id), .unlocked(id), .isOpen()
 *   BridgeSki.items / ground / over    // the hoarfell tileset's scene hooks call these (js/worlds/hoarfell.js)
 */
var BridgeSki = (function () {
  var KEY = 'bridge_ski', WORLD = 'hoarfell-piste';
  var RUNS = {
    nursery:  { name: 'THE NURSERY SLOPE', mark: 'green', colour: '#2a9a5a', first: 40, again: 10, pace: 0.85, beat: 60 },
    pinewood: { name: 'PINEWOOD', mark: 'blue', colour: '#2a6ac0', first: 90, again: 20, pace: 0.9, beat: 120 },
    couloir:  { name: 'THE COULOIR', mark: 'black', colour: '#1e1e26', needs: 'pinewood', first: 200, again: 40, pace: 0.95, beat: 250 }
  };
  // physics (tiles, seconds): pull down the fall line per grade step, drag, friction, steering
  var GRAV = 1.45, DRAG = 0.1, TUCK = 0.066, FRICTION = 0.55, PLOUGH = 6.5, TURN = 2.5, VMAX = 15, GZ = 13, AMAX = 1.45;
  var C45 = Math.SQRT1_2;
  var LEAN_R = 7, LEAN_L = 6;          // the carve frames leaning to the sheet's right / left
  var RIVAL_SHEET = 'ski-coat-red@b.ponytail.0.0.fair.blonde';    // Liv: her red coat, her ponytail (js/look.js codes)
  var PARK = 'hoarfell-park', JUNO = 7500;
  var RAIL_NAME = { box: 'BOX SLIDE', rail: 'RAIL SLIDE', down: 'DOWN RAIL', kink: 'KINKED RAIL' };
  var RAIL_MULT = { box: 0.8, rail: 1, down: 1.2, kink: 1.5 };
  var GRABS = ['MUTE GRAB', 'SAFETY GRAB', 'JAPAN AIR'];

  var save = load();
  var s = null;                         // the run in progress
  var trail = [], spray = [], trailWorld = null;
  var hud = null;

  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || { runs: {} };
    d.runs = d.runs || {};
    if (d.v !== 2) {                   // the old panel game's times don't compare with the mountain's
      Object.keys(d.runs).forEach(function (id) { var r = d.runs[id]; r.firstPaid = !!(r.best || r.runs); r.best = 0; delete r.ghost; });
      d.v = 2;
    }
    d.rival = d.rival || {};
    d.park = d.park || { best: 0, runs: 0, paid: 0, juno: false };
    return d;
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function waxed() { return (save.wax || 0) > Date.now(); }
  function wax(minutes) { save.wax = Date.now() + minutes * 60000; store(); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function day() { return Math.floor(Date.now() / 86400000); }
  function fmt(t) { var m = Math.floor(t / 60), x = t - m * 60; return m + ':' + (x < 10 ? '0' : '') + x.toFixed(1); }
  function unlocked(id) { var n = RUNS[id] && RUNS[id].needs; return !n || !!(save.runs[n] && save.runs[n].best); }
  function rec(id) { return save.runs[id] || (save.runs[id] = { runs: 0, best: 0, paid: 0 }); }

  // ---- the mountain (the world JSON's ski block) --------------------------------------------------------------
  function data() { var w = BridgeWorld.getWorld(); return w && w.ski ? w : null; }
  function gradeAt(w, x, y) {
    var row = w.ski.grade[Math.floor(y)];
    return row ? +row.charAt(clamp(Math.floor(x), 0, w.width - 1)) || 0 : 0;
  }
  function zoneAt(w, x, y) {
    var row = w.ski.zone[Math.floor(y)];
    return row ? row.charAt(clamp(Math.floor(x), 0, w.width - 1)) : '.';
  }
  // the height of a kicker under (x, y) (tiles): a ramp rising south to its lip
  function rampAt(w, x, y) {
    var z = 0;
    w.ski.jumps.forEach(function (j) {
      var u = (y - (j[1] - j[3])) / j[3], v = Math.abs(x - j[0]) / (j[2] / 2);
      if (u >= 0 && u <= 1 && v <= 1) z = Math.max(z, j[4] * Math.pow(u, 1.4) * (1 - Math.pow(v, 6)));
    });
    return z;
  }
  // obstacles bucketed by row, and the tiles they stand on (skiing ignores those tiles: the circle is fairer)
  var index = null;
  function indexFor(w) {
    if (index && index.w === w) return index;
    var rows = {}, tiles = {};
    w.ski.obstacles.forEach(function (o) {
      var r = Math.floor(o[1]);
      (rows[r] = rows[r] || []).push(o);
      tiles[Math.floor(o[0]) + ',' + r] = 1;
    });
    index = { w: w, rows: rows, tiles: tiles };
    return index;
  }
  // what (x, y) runs into: an obstacle, a wall, or nothing
  function hitAt(w, x, y) {
    var ix = indexFor(w);
    for (var r = Math.floor(y) - 1; r <= Math.floor(y) + 1; r++) {
      var list = ix.rows[r];
      if (!list) continue;
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        if (Math.hypot(o[0] - x, (o[1] - y) * 1.15) < o[2] + 0.18) return o[3];
      }
    }
    var tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= w.width || ty >= w.height) return 'edge';
    if (w.collisions[ty][tx] === 1 && !ix.tiles[tx + ',' + ty]) return 'wall';
    return null;
  }

  // ---- starting ------------------------------------------------------------------------------------------------
  function start(id, opts) {
    opts = opts || {};
    if (id && !RUNS[id]) return;
    var here = BridgeWorld.getWorldId() === WORLD;
    if (!id && data()) return begin(null, opts);                  // free skiing wherever there's snow to ski (the pistes, the Last Ridge's bowl)
    var w = here ? data() : null;
    var at = id && w ? w.ski.runs[id].start : null;
    // from elsewhere the world isn't loaded yet: land on its spawn for the run (the start hut's gate), then begin
    BridgeWorld.enterWorld(WORLD, at ? [Math.floor(at[0]), Math.floor(at[1])] : (id ? START_TILE[id] : [23, 9]), function () { begin(id, opts); });
  }
  var START_TILE = { couloir: [9, 6], pinewood: [22, 6], nursery: [36, 6] };

  // the Park: drop in from the deck for a scored run
  function park() {
    var w = data();
    if (w && w.ski.park) return begin(null, { park: true });
    BridgeWorld.enterWorld(PARK, [20, 7], function () { begin(null, { park: true }); });
  }

  function begin(id, opts) {
    var w = data();
    if (!w) return;
    var R = id ? w.ski.runs[id] : null, P = opts.park && w.ski.park;
    var px = R ? R.start[0] : P ? P.start[0] : BridgeCharacter.getX() + 0.5, py = R ? R.start[1] : P ? P.start[1] : BridgeCharacter.getY() + 0.9;
    s = { id: id, x: px, y: py, a: 0, v: 0, z: 0, vz: 0, air: false, spin: 0, spinTo: 0, down: 0, crashFlip: false,
          t: 0, pen: 0, phase: id || P ? 'count' : 'free', count: 3.4, grind: null, grabT: 0,
          park: P ? { score: 0, chain: [], chainT: 0, tricks: [], bestCombo: 0 } : null, gate: 0, passed: 0, missed: 0, tricks: 0, falls: 0,
          push: 0, dist: 0, still: 0, airT: 0, recT: 0, rec: [], steer: 0, held: {}, final: 0 };
    if (id) {
      var r = rec(id);
      s.ghost = r.ghost && r.ghost.length ? r.ghost : null;
      if (opts.rival) { s.rival = rivalLine(w, id); s.rivalTime = s.rival.time; }
    }
    if (trailWorld !== w) { trail = []; trailWorld = w; }
    BridgeWorld.setMode({ update: update, focus: focus, solo: true, end: function () { quit(true); } });
    pose(performance.now());
    ensureHud();
    hud.classList.add('on');
    hud.querySelector('.sk-mark').className = 'sk-mark ' + (id ? RUNS[id].mark : P ? 'park' : 'free');
    hud.querySelector('.sk-name').textContent = id ? RUNS[id].name : w.ski.name || 'FREE SKIING';
    hud.querySelector('.sk-help').textContent = id
      ? '← → steer · ↓ tuck · ↑ snowplough · Space push / spin in the air · Esc stop'
      : P ? '← → steer / balance on a rail · Space spin in the air, pop off a rail · hold ↓ in the air to grab · Esc stop'
      : '← → steer · ↓ tuck · ↑ snowplough · Space push / spin · stop and E: skis off';
    document.addEventListener('keydown', onKey, true);
    if (P) {
      say(save.park.best ? 'YOUR BEST ' + save.park.best + ' - JUNO\'S ' + JUNO : 'JUNO\'S SCORE TO BEAT: ' + JUNO);
    } else if (id) {
      var best = rec(id).best;
      say((s.rival ? 'LIV BESIDE YOU: ' + fmt(s.rivalTime) + ' TO BEAT. ' : '') + (best ? 'YOUR BEST ' + fmt(best) : R.gates.length + ' GATES'));
    } else {
      say(w.ski.hello || 'FREE SKIING. THE WHOLE MOUNTAIN.');
    }
    sfx('open');
  }

  function onKey(e) {
    if (!s) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); quit(false); }
  }

  // ---- each frame ------------------------------------------------------------------------------------------------
  function update(dt) {
    var w = data();
    if (!s || !w) return;
    var now = performance.now();
    var held = BridgeControls.held(), act = BridgeControls.consumeAction();
    s.held = held;
    if (s.phase === 'count') {
      var before = Math.ceil(s.count);
      s.count -= dt;
      if (Math.ceil(s.count) !== before && s.count > 0 && before <= 3) { sfx('blip'); bigText(String(Math.ceil(s.count))); }
      if (s.count <= 0) { s.phase = s.park ? 'park' : 'run'; s.v = 2.6; s.push = 0.4; sfx('success'); bigText(s.park ? 'DROP IN' : 'GO'); }
      pose(now);
      hudTick();
      return;
    }
    if (s.phase === 'run' || s.phase === 'park') s.t += dt;
    var steer = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    s.steer = steer;
    var zone = zoneAt(w, s.x, s.y);

    if (s.down > 0) {                                          // in the snow, getting up
      s.down -= dt;
      if (s.down <= 0) getUp(w);
      record(dt);
      pose(now);
      hudTick();
      return;
    }

    if (s.grind) {                                             // on a rail: the rail steers, you balance
      grindStep(w, dt, steer, act);
      parkTick(dt);
      record(dt);
      pose(now);
      hudTick();
      return;
    }

    // steering: any angle from straight down to right across; slower on ice, tucked, or nearly stopped
    var rate = TURN * (zone === 'i' ? 0.3 : 1) * (held.down ? 0.65 : 1) * (s.v < 1.5 ? 0.85 : 1);
    if (!s.air) s.a = clamp(s.a + steer * rate * dt, -AMAX, AMAX);

    // poles: a push when you're slow, a spin in the air; stopped on a free ski, E takes your skis off
    if (act) {
      if (s.air) { s.spinTo += 360; sfx('swish'); }
      else if (!s.id && s.still > 0.6) return takeOff();
      else if (s.v < 4.5) { s.v += 2.4; s.push = 0.4; sfx('swish'); }
    }
    if (s.push > 0) s.push -= dt;

    // speed: the slope pulls you down the fall line, drag and friction hold you back
    var grade = gradeAt(w, s.x, s.y);
    var acc = GRAV * grade * Math.cos(s.a);
    var kd = held.down ? TUCK : DRAG, fr = FRICTION;
    if (waxed()) { kd *= 0.9; fr *= 0.8; }                   // fresh wax from Inge's bench
    if (zone === '~') { kd *= 2.6; fr += 1.6; }
    if (held.up) fr += PLOUGH;
    if (steer && s.v > 2) fr += rate * s.v * 0.1;
    if (s.phase === 'done' || s.phase === 'parkdone') fr += 3;  // through the finish: coast to a stop
    if (s.air) { acc = 0; kd *= 0.4; fr = 0; }
    s.v = clamp(s.v + (acc - kd * s.v * s.v - fr) * dt, 0, VMAX);
    if (zone === 'm' && !s.air && s.v > 3 && Math.random() < dt * 4) { s.v *= 0.93; puff(3); sfx('step'); }

    // move, and see what's in the way
    var nx = s.x + Math.sin(s.a) * s.v * dt, ny = s.y + Math.cos(s.a) * s.v * dt;
    var hit = hitAt(w, nx, ny);
    if (hit === 'rock' && s.air && s.z > 0.4) hit = null;     // clear over a rock
    if (hit) {
      if (s.v > 2.6 && hit !== 'edge') return crash(w, hit);
      s.v = 0;                                                  // too slow to hurt: just stop against it
      nx = s.x; ny = s.y;
    }
    var moved = Math.hypot(nx - s.x, ny - s.y);
    s.dist += moved;
    var oy = s.y;
    s.x = nx; s.y = ny;

    // kickers: up the ramp, off the lip into the air
    var gh = rampAt(w, s.x, s.y);
    if (!s.air) {
      var was = s.z;
      if (was > 0.05 && gh < was - 0.04 && s.v > 3) {
        var j = w.ski.jumps.filter(function (q) { return Math.abs(q[0] - s.x) < q[2] && Math.abs(q[1] - s.y) < 1.5; })[0] || [0, 0, 1, 2, 0.4];
        s.air = true; s.vz = s.v * 1.4 * j[4] / j[3] + 1.6; s.airT = 0; s.spin = 0; s.spinTo = 0; s.grabT = 0;
        sfx('lift');
      } else {
        s.z = gh;
      }
    }
    if (s.air) {
      s.airT += dt;
      s.vz -= GZ * dt;
      s.z += s.vz * dt;
      if (held.down) s.grabT += dt;
      if (s.spin < s.spinTo) s.spin = Math.min(s.spinTo, s.spin + 760 * dt);
      if (!(w.ski.rails && tryRail(w)) && s.z <= gh) land(w);
    } else if (w.ski.rails && s.v > 2.2) {
      tryRail(w);
    }

    // gates as you pass their row
    if (s.phase === 'run') {
      var gts = w.ski.runs[s.id].gates, g = gts[s.gate];
      if (g && oy < g[1] && s.y >= g[1]) {
        if (Math.abs(s.x - g[0]) <= g[2] / 2 + 0.15) { s.passed++; sfx('blip'); }
        else { s.missed++; s.pen += 3; say('MISSED A GATE  +3s'); sfx('error'); }
        s.gate++;
      }
      if (s.y >= w.ski.finish) finish(w);
    }

    if (s.phase === 'park' && s.y >= w.ski.finish) parkFinish();
    parkTick(dt);

    // tracks, spray
    if (!s.air && moved > 0) {
      var last = trail[trail.length - 1];
      if (!last || Math.hypot(last.x - s.x, last.y - s.y) > 0.12) {
        trail.push({ x: s.x, y: s.y, a: s.a, p: held.up && s.v > 0.5, t: now });
        if (trail.length > 1400) trail.splice(0, 200);
      }
      if ((steer && s.v > 6) || (held.up && s.v > 3)) puff(held.up ? 2 : 1);
    }

    // stopped: free skiing ends at the bottom, a finished race ends in the run-out
    s.still = s.v < 0.3 && !s.air ? s.still + dt : 0;
    if (s.phase === 'done' && s.v < 0.5) return end(w);
    if (s.phase === 'parkdone' && s.v < 0.5) return parkEnd(w);
    if (s.phase === 'free' && s.still > 0.8 && s.y > w.ski.finish + 1) return takeOff();

    record(dt);
    pose(now);
    hudTick();
  }

  function land(w) {
    s.air = false;
    s.z = rampAt(w, s.x, s.y);
    var rem = ((s.spin % 360) + 360) % 360;
    if (rem > 55 && rem < 305) return crash(w, 'spin');
    var n = Math.round(s.spin / 360);
    if (s.park) {
      airTrick(n);
    } else if (n > 0) {
      s.tricks += n;
      if (s.phase === 'run') s.pen -= n;
      say((n > 1 ? n * 360 : '360') + (s.phase === 'run' ? '!  -' + n + 's' : '!'));
      sfx('success');
    } else if (s.airT > 0.7) {
      say('BIG AIR');
    }
    s.spin = 0; s.spinTo = 0;
    s.v *= 0.93;
    puff(8);
    sfx('land');
  }

  var WHY = { rail: 'OFF THE RAIL.', tree: 'INTO A TREE.', rock: 'A ROCK UNDER THE SNOW.', pylon: 'YOU HUG A LIFT TOWER.', wall: 'INTO THE ROCK.', spin: 'YOU LAND IT SIDEWAYS.' };
  function crash(w, what) {
    if (s.park && s.park.chain.length) { s.park.chain = []; say('COMBO LOST. ' + (WHY[what] || '')); }
    s.grind = null;
    s.down = 1.5; s.falls++;
    s.air = false; s.z = 0; s.spin = 0; s.spinTo = 0;
    s.crashFlip = s.a < 0;
    s.v = 0;
    puff(16);
    sfx('crumble');
    if (!s.park) say(WHY[what] || 'DOWN YOU GO.');
    pose(performance.now());
  }

  // ---- the Park: rails, tricks, combos ------------------------------------------------------------------------------------
  // onto a rail: dropping onto it from the air, or riding onto its foot along it
  function tryRail(w) {
    var hit = null;
    w.ski.rails.forEach(function (R, i) {
      var dx = R[2] - R[0], dy = R[3] - R[1], L2 = dx * dx + dy * dy, t = ((s.x - R[0]) * dx + (s.y - R[1]) * dy) / L2;
      if (t < -0.02 || t > 0.95) return;
      var d = Math.hypot(s.x - (R[0] + dx * t), s.y - (R[1] + dy * t));
      if (d > 0.36) return;
      var h = R[4] + (R[5] - R[4]) * t, dir = Math.atan2(dx, dy);
      var ok = s.air ? (s.vz <= 0.8 && s.z >= h - 0.3 && s.z <= h + 0.5) : t < 0.2;
      var rem = ((s.spin % 360) + 360) % 360;
      if (ok && Math.abs(dir - s.a) < 0.8 && (rem < 55 || rem > 305)) hit = { i: i, t: Math.max(0, t), h: h, dir: dir };
    });
    if (!hit) return false;
    var spun = Math.round(s.spin / 360);
    if (s.park && spun > 0) trick(spun * 360 + ' ON', 250 * spun);
    s.grind = { i: hit.i, t: hit.t, bal: 0, lean: (Math.random() < 0.5 ? -1 : 1) * 0.7, leanT: 0.4, dist: 0, kind: w.ski.rails[hit.i][6], kinked: false };
    s.air = false; s.spin = 0; s.spinTo = 0; s.z = hit.h; s.a = hit.dir; s.vz = 0;
    sfx('land');
    return true;
  }
  function grindStep(w, dt, steer, act) {
    var g = s.grind, R = w.ski.rails[g.i], dx = R[2] - R[0], dy = R[3] - R[1], L = Math.hypot(dx, dy);
    var drop = (R[4] - R[5]) / L;                                // a down rail speeds you up
    s.v = clamp(s.v + (GRAV * 0.25 * gradeAt(w, s.x, s.y) + drop * 6 - 0.7) * dt, 2.2, VMAX);
    g.t += s.v * dt / L; g.dist += s.v * dt;
    // balance: the rail tips you one way and then the other; lean back against it with the arrows
    g.leanT -= dt;
    if (g.leanT <= 0) {
      g.lean = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8) * (g.kind === 'box' ? 0.6 : g.kind === 'kink' ? 1.25 : 1);
      g.leanT = 0.45 + Math.random() * 0.6;
    }
    g.bal += (g.lean * (0.7 + Math.abs(g.bal)) + s.steer * 2.4) * dt;
    if (Math.abs(g.bal) > 1) { s.z = 0; return crash(w, 'rail'); }
    var t = Math.min(1, g.t);
    s.x = R[0] + dx * t; s.y = R[1] + dy * t; s.z = R[4] + (R[5] - R[4]) * t; s.a = Math.atan2(dx, dy);
    if (Math.random() < dt * 24) spark();
    if (act) return leaveRail(2.9, true);
    if (g.t >= 1) {
      var next = -1;
      w.ski.rails.forEach(function (Q, j) { if (j !== g.i && Math.hypot(Q[0] - R[2], Q[1] - R[3]) < 0.15) next = j; });
      if (next >= 0) { g.i = next; g.t = 0; g.kinked = true; sfx('blip'); return; }
      leaveRail(1.3, false);
    }
  }
  function leaveRail(vz, ollie) {
    var g = s.grind;
    s.grind = null;
    s.air = true; s.vz = vz; s.airT = 0; s.spin = 0; s.spinTo = 0; s.grabT = 0;
    if (s.park) trick(RAIL_NAME[g.kind] + (g.kinked ? ' THROUGH THE KINK' : ''), Math.round(80 + g.dist * 70 * RAIL_MULT[g.kind]));
    else say(RAIL_NAME[g.kind]);
    sfx(ollie ? 'swish' : 'blip');
  }
  // a landing in the Park: a spin, a grab, big air - or nothing
  function airTrick(n) {
    var name = [], pts = 0;
    if (n > 0) { name.push(n * 360); pts += 250 * n * (n + 1) / 2; s.tricks += n; }
    if (s.grabT > 0.3) { name.push(GRABS[Math.min(2, Math.floor(s.grabT / 0.45))]); pts += 150 + Math.round(200 * Math.min(1, s.grabT)); }
    if (s.airT > 0.8) { if (!name.length) name.push('BIG AIR'); pts += Math.round(s.airT * 120); }
    if (pts) { trick(name.join(' '), pts); sfx('success'); }
  }
  function trick(name, pts) {
    var P = s.park;
    P.chain.push({ name: String(name), pts: pts });
    P.chainT = 2.6;
    var mult = Math.min(5, P.chain.length);
    bigText(String(name));
    say('+' + pts + (mult > 1 ? '   COMBO x' + mult : ''));
  }
  function bank() {
    var P = s.park;
    if (!P || !P.chain.length) return;
    var sum = P.chain.reduce(function (a, c) { return a + c.pts; }, 0), mult = Math.min(5, P.chain.length), total = sum * mult;
    P.score += total;
    P.bestCombo = Math.max(P.bestCombo, total);
    P.tricks = P.tricks.concat(P.chain.map(function (c) { return c.name; }));
    if (mult > 1) { say(mult + '-TRICK COMBO  +' + total); sfx('coin'); }
    P.chain = [];
  }
  function parkTick(dt) {
    var P = s.park;
    if (!P || !P.chain.length || s.air || s.grind) return;
    P.chainT -= dt;
    if (P.chainT <= 0) bank();
  }
  function parkFinish() {
    bank();
    s.phase = 'parkdone';
    sfx('quest');
    bigText(String(s.park.score));
  }
  function parkEnd(w) {
    var P = s.park, R = save.park, score = P.score, first = !R.runs, nb = score > R.best;
    R.runs++;
    if (nb) R.best = score;
    var pay = first ? 80 : R.paid !== day() && score > 0 ? 20 : 0;
    if (pay) R.paid = day();
    var juno = score > JUNO && !R.juno;
    if (juno) R.juno = true;
    store();
    if (typeof BridgeProgression !== 'undefined') {
      if (pay) BridgeProgression.awardCoins(pay, 'park');
      if (juno) { BridgeProgression.awardCoins(200, 'park:juno'); BridgeProgression.recordAchievement('beat_juno', 0, { source: 'ski' }); }
      if (first) BridgeProgression.recordAchievement('rode_the_park', 0, { source: 'ski' });
    }
    var seen = {}, names = P.tricks.filter(function (n) { if (seen[n]) return false; seen[n] = 1; return true; }).slice(0, 6);
    var lines = ['THE PARK: ' + score + (nb && R.runs > 1 ? '  -  A NEW BEST!' : ''),
                 names.length ? names.join(', ') + '.' : 'NO TRICKS - JUST A NICE DAY OUT.',
                 (P.bestCombo ? 'BEST COMBO ' + P.bestCombo + '. ' : '') + (s.falls ? s.falls + (s.falls > 1 ? ' FALLS.' : ' FALL.') : 'CLEAN.')];
    lines.push(juno ? 'JUNO WHISTLES FROM THE BENCH. "OKAY. OKAY! THAT\'S THE NEW NUMBER." 200 COINS.'
                    : score > JUNO ? 'OVER JUNO\'S ' + JUNO + ' AGAIN.' : 'JUNO\'S ' + JUNO + ' STILL STANDS.');
    if (pay) lines.push(pay + ' COINS.');
    quit(true);
    BridgeInteractions.execute({ type: 'menu', label: 'THE JUDGES', dialog: lines.join('\n\n'), options: [
      { label: 'Ride the tow and drop in again', action: 'park_run' },
      { label: 'Done for now', action: 'close' }
    ] });
  }
  function spark() {
    for (var i = 0; i < 2; i++) {
      spray.push({ x: s.x + (Math.random() - 0.5) * 0.2, y: s.y, z: s.z * C45 * 32 + 2, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5),
                   vz: 8 + Math.random() * 12, life: 0.25 + Math.random() * 0.2, spark: true });
    }
  }
  // up again beside what you hit, on clear snow, facing down the hill (toward the run's line)
  function getUp(w) {
    var cx = s.x;
    if (s.id) {
      var line = w.ski.runs[s.id].line;
      cx = line.reduce(function (b, p) { return Math.abs(p[1] - s.y) < Math.abs(b[1] - s.y) ? p : b; })[0];
    }
    var toward = cx >= s.x ? 1 : -1, best = null;
    for (var d = 0.4; d < 4 && !best; d += 0.3) {
      [toward, -toward].forEach(function (sg) {
        [0, -0.5, 0.5].forEach(function (dy) {
          var x = s.x + sg * d, y = s.y + dy;
          if (!best && !hitAt(w, x, y) && !hitAt(w, x, y + 0.6)) best = [x, y];
        });
      });
    }
    if (best) { s.x = best[0]; s.y = best[1]; }
    s.a = 0; s.v = 0; s.down = 0;
  }

  function finish() {
    s.phase = 'done';
    s.final = Math.max(0, s.t + s.pen);
    sfx('quest');
    bigText(fmt(s.final));
  }

  // through the finish and stopped: the result, the pay, the ghost
  function end(w) {
    var id = s.id, D = RUNS[id], r = rec(id), total = s.final;
    var first = !r.firstPaid, nb = !r.best || total < r.best;
    r.runs = (r.runs || 0) + 1;
    if (nb) { r.best = total; r.ghost = s.rec; }
    var pay = first ? D.first : r.paid !== day() ? D.again : 0;
    if (pay) { r.paid = day(); r.firstPaid = true; }
    var won = !!s.rival && total < s.rivalTime, beatPay = 0;
    if (won && !save.rival[id]) { save.rival[id] = 1; beatPay = D.beat; }
    store();
    if (typeof BridgeProgression !== 'undefined') {
      if (pay) BridgeProgression.awardCoins(pay, 'ski:' + id);
      if (beatPay) BridgeProgression.awardCoins(beatPay, 'ski_rival:' + id);
      if (first) BridgeProgression.recordAchievement('skied_' + id, 0, { source: 'ski' });
      if (won) BridgeProgression.recordAchievement('beat_liv_' + id, 0, { source: 'ski' });
    }
    var gates = w.ski.runs[id].gates.length;
    var lines = [D.name + ' IN ' + fmt(total) + (nb && r.runs > 1 ? '  -  A NEW BEST!' : ''),
                 s.passed + ' OF ' + gates + ' GATES' + (s.missed ? ' (+' + s.missed * 3 + 's)' : '') +
                 (s.tricks ? ', ' + s.tricks + (s.tricks > 1 ? ' SPINS' : ' SPIN') + ' (-' + s.tricks + 's)' : '') +
                 (s.falls ? ', ' + s.falls + (s.falls > 1 ? ' FALLS' : ' FALL') : ', CLEAN') + '.'];
    if (s.rival) lines.push(won ? 'YOU BEAT LIV (' + fmt(s.rivalTime) + ')! SHE SHAKES HER HEAD AND LAUGHS.' + (beatPay ? ' ' + beatPay + ' COINS ON THE BET.' : '')
                                : 'LIV TOOK IT IN ' + fmt(s.rivalTime) + '. "AGAIN?"');
    if (pay) lines.push(pay + ' COINS.');
    var again = !!s.rival;
    quit(true);
    BridgeInteractions.execute({ type: 'menu', label: 'FINISH', dialog: lines.join('\n\n'), options: [
      { label: again ? 'Race Liv again' : 'Ride up and go again', action: 'ski_run', run: id, rival: again },
      { label: 'Free ski from the top', action: 'ski_run', run: 'free' },
      { label: 'Done for now', action: 'close' }
    ] });
  }

  // the way into the Park from the pistes' finish
  function decorate(worldId, data) {
    if (worldId !== 'hoarfell-piste') return;
    data.interactions = (data.interactions || []).filter(function (it) { return it.label !== 'THE PARK'; });
    data.interactions.push({ x: 37, y: 102, type: 'enter_world', label: 'THE PARK', prompt: 'PRESS E TO GO TO THE PARK', target: PARK, spawn: [20, 79] });
  }

  // skis off: back to walking on the nearest clear tile
  function takeOff() { say('SKIS OFF.'); sfx('pickup'); quit(true); }
  function quit(quiet) {
    if (!s) return;
    var w = data(), x = s.x, y = s.y;
    s = null;
    document.removeEventListener('keydown', onKey, true);
    if (hud) hud.classList.remove('on');
    if (BridgeWorld.getMode()) BridgeWorld.setMode(null);
    BridgeCharacter.setPose(null);
    if (w) {
      var tx = Math.floor(x), ty = Math.floor(y), spot = null;
      for (var d = 0; d < 6 && !spot; d++) {
        for (var dy = -d; dy <= d && !spot; dy++) for (var dx = -d; dx <= d && !spot; dx++) {
          var X = tx + dx, Y = ty + dy;
          if (X >= 0 && Y >= 0 && X < w.width && Y < w.height && w.collisions[Y][X] === 0) spot = [X, Y];
        }
      }
      if (spot) BridgeCharacter.init(spot[0], spot[1]);
      BridgeCharacter.setFacing('down');
    }
    if (!quiet) say('YOU STOP AND STEP OUT OF YOUR SKIS.');
  }

  // ---- the camera runs ahead of you down the hill ------------------------------------------------------------------
  function focus() {
    if (!s) return null;
    var lead = clamp(s.v * 0.32, 0, 4.2);
    return { x: s.x - 0.5 + Math.sin(s.a) * lead, y: s.y - 1 + Math.cos(s.a) * lead + (s.phase === 'count' ? 2 : 1.2) };
  }

  // ---- the pilot's frame -----------------------------------------------------------------------------------------------
  // ski sheet: rows down (fall line) / right (across) / 45° / tricks; columns glide 0-3, tuck 4-5, carve 6-7,
  // snowplough 8, air 9, poling 10-11; the tricks row is a spin (0-7) and a fall (8-11)
  function frameFor(o, now) {
    if (o.down > 0) return { row: 3, col: 8 + Math.min(3, Math.floor((1.5 - o.down) / 0.16)), flip: o.crashFlip };
    if (o.air && (o.spin % 360) > 1) return { row: 3, col: Math.round((o.spin % 360) / 45) % 8, flip: o.a < 0 };
    var A = Math.abs(o.a), row = A < 0.39 ? 0 : A < 1.18 ? 2 : 1, flip = o.a < -0.01, h = o.held || {}, col;
    if (o.air) col = h.down ? 5 : 9;
    else if (o.push > 0) col = o.push > 0.2 ? 10 : 11;
    else if (h.up && o.v > 0.5) col = 8;
    else if (o.steer && o.v > 1.2) col = (o.steer > 0) !== flip ? LEAN_R : LEAN_L;
    else if (h.down && o.v > 0.5) col = 4 + Math.floor(now / 260) % 2;
    else col = o.v > 0.5 ? [0, 1, 2, 1][Math.floor(o.dist / 0.8) % 4] : [0, 1, 2, 1][Math.floor(now / 340) % 4];
    return { row: row, col: col, flip: flip };
  }
  function pose(now) {
    var f = frameFor(s, now), w = data();
    var bob = w && zoneAt(w, s.x, s.y) === 'm' && !s.air ? Math.abs(Math.sin(s.dist * 4.2)) * 3 : 0;
    BridgeCharacter.setPose({ kind: 'ski', x: s.x, y: s.y, row: f.row, col: f.col, flip: f.flip, lift: s.z * C45 * 32 + bob });
  }

  // ---- ghosts: your best run beside you, and Liv --------------------------------------------------------------------------
  function record(dt) {
    if (s.phase !== 'run') return;
    s.recT += dt;
    if (s.recT < 0.1 && s.rec.length) return;
    s.recT = s.rec.length ? s.recT - 0.1 : 0;                  // a sample every 0.1 s on average: played back at exactly that
    var f = frameFor(s, performance.now());
    s.rec.push([Math.round(s.x * 20), Math.round(s.y * 20), Math.round(s.z * 40), f.row * 16 + f.col, f.flip ? 1 : 0]);
  }
  function sampleAt(line, t) {
    var i = t / 0.1, a = Math.floor(i);
    if (a >= line.length - 1) return line[line.length - 1];
    var p = line[Math.max(0, a)], q = line[a + 1], f = i - a;
    return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f, p[3], p[4]];
  }

  // Liv's line: the same physics, steered gate to gate by a careful hand (no tricks, no falls)
  function rivalLine(w, id) {
    var R = w.ski.runs[id], aims = R.gates.map(function (g) { return [g[0], g[1]]; });
    aims.push([R.line[R.line.length - 1][0], w.ski.finish + 2]);
    var o = { x: R.start[0], y: R.start[1], a: 0, v: 2.6, dist: 0, held: {}, steer: 0, push: 0, air: false, spin: 0, down: 0 };
    var dt = 1 / 60, t = 0, k = 0, out = [], acc = 0, pace = RUNS[id].pace;
    while (t < 150 && o.y < w.ski.finish) {
      var aim = aims[k];
      while (aim && aim[1] < o.y + 0.4) aim = aims[++k];
      if (!aim) aim = [o.x, o.y + 5];
      var want = clamp(Math.atan2(aim[0] - o.x, Math.max(0.5, aim[1] - o.y)), -1.3, 1.3), d = want - o.a;
      o.steer = Math.abs(d) > 0.04 ? (d > 0 ? 1 : -1) : 0;
      var zone = zoneAt(w, o.x, o.y);
      o.held = { down: Math.abs(d) < 0.2 && aim[1] - o.y > 5, up: false };
      var rate = TURN * (zone === 'i' ? 0.3 : 1) * (o.held.down ? 0.65 : 1);
      o.a = clamp(o.a + clamp(d, -rate * dt, rate * dt), -AMAX, AMAX);
      var kd = o.held.down ? TUCK : DRAG, fr = FRICTION;
      if (zone === '~') { kd *= 2.6; fr += 1.6; }
      if (o.steer && o.v > 2) fr += rate * o.v * 0.1;
      o.v = clamp(o.v + (GRAV * pace * gradeAt(w, o.x, o.y) * Math.cos(o.a) - kd * o.v * o.v - fr) * dt, 0, VMAX);
      o.x += Math.sin(o.a) * o.v * dt; o.y += Math.cos(o.a) * o.v * dt; o.dist += o.v * dt;
      t += dt; acc += dt;
      if (acc >= 0.1 - 1e-9 || !out.length) {
        acc = out.length ? acc - 0.1 : 0;
        var f = frameFor(o, t * 1000);
        out.push([Math.round(o.x * 20), Math.round(o.y * 20), 0, f.row * 16 + f.col, f.flip ? 1 : 0]);
      }
    }
    // she coasts on to a stop past the line
    for (var e = 0; e < 14; e++) { o.v *= 0.8; o.y += o.v * 0.1; out.push([Math.round(o.x * 20), Math.round(o.y * 20), 0, 8, 0]); }
    return { line: out, time: t };
  }

  // ---- drawing (the hoarfell tileset's scene hooks) --------------------------------------------------------------------------
  // items: the gates, your ghost and Liv, sorted with everyone else by their foot row
  function items(world, offX, offY, ts, now) {
    if (!s || !s.id || !world.ski) return [];
    var out = [], gts = world.ski.runs[s.id].gates;
    gts.forEach(function (g, i) {
      out.push({ footRow: g[1], draw: function (c) { gate(c, g, i, offX, offY, ts, now); } });
    });
    var t = s.phase === 'count' ? 0 : s.t;
    if (s.ghost) out.push(skierItem(s.ghost, t, offX, offY, ts, null, 0.42));
    if (s.rival) out.push(skierItem(s.rival.line, t, offX, offY, ts, RIVAL_SHEET, 1));
    var g = gts[s.gate];
    if (g && has('ski_goggles') && s.phase === 'run') {           // the goggles' line to the next gate
      out.push({ footRow: s.y - 0.01, draw: function (c) {
        c.fillStyle = 'rgba(255,210,80,0.6)';
        for (var k = 2; k < 14; k += 2) {
          var px = s.x + (g[0] - s.x) * k / 14, py = s.y + (g[1] - s.y) * k / 14;
          c.fillRect(Math.round(offX + px * ts) - 1, Math.round(offY + py * ts), 2, 1);
        }
      } });
    }
    return out;
  }
  function skierItem(line, t, offX, offY, ts, sheet, alpha) {
    var p = sampleAt(line, t), x = p[0] / 20, y = p[1] / 20, rc = p[3], flip = !!p[4];
    return { footRow: y, draw: function (c) {
      var img = BridgeCharacter.sportImage(sheet || BridgeCharacter.sportKey('ski'), flip);
      if (!img) return;
      var m = BridgeCharacter.SPORT.ski, cx = Math.round(offX + x * ts), fy = Math.round(offY + y * ts);
      c.save();
      c.globalAlpha = alpha * 0.8;
      c.fillStyle = 'rgba(40,50,90,0.28)';
      c.beginPath(); c.ellipse(cx, fy, 9, 3, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = alpha;
      c.drawImage(img, (rc % 16) * m.w, Math.floor(rc / 16) * m.h, m.w, m.h, cx - m.ox, fy - m.oy - Math.round(p[2] / 40 * C45 * 32), m.w, m.h);
      c.restore();
    } };
  }
  // a gate: two slim poles with flags, red and blue in turn; passed ones lie flat, the next one has a light over it
  function gate(c, g, i, offX, offY, ts, now) {
    var done = i < s.gate, next = i === s.gate && s.phase === 'run';
    var red = i % 2 === 0, fl = red ? '#d83a2e' : '#2a6ae0', fd = red ? '#8a2018' : '#183a8a';
    [-1, 1].forEach(function (sd) {
      var x = Math.round(offX + (g[0] + sd * g[2] / 2) * ts), y = Math.round(offY + g[1] * ts);
      var h = done ? 8 : 22, flap = Math.round(Math.sin(now / 160 + i * 1.7 + sd));
      c.fillStyle = 'rgba(40,50,90,0.25)';
      c.fillRect(x - 2, y, 5, 2);
      c.fillStyle = '#1a1a24'; c.fillRect(x - 1, y - h - 1, 3, h + 1);
      c.fillStyle = '#f2f0ea'; c.fillRect(x, y - h, 1, h);
      if (!done) {
        var fx = sd < 0 ? x + 1 : x - 7;
        c.fillStyle = '#1a1a24'; c.fillRect(fx - 1, y - h - 1, 8, 9);
        c.fillStyle = fl; c.fillRect(fx, y - h, 6, 7);
        c.fillStyle = fd; c.fillRect(fx, y - h + 5, 6, 2);
        c.fillStyle = '#f2f0ea'; c.fillRect(fx + 2 + flap, y - h + 2, 2, 2);
      }
      if (next) {
        c.fillStyle = 'rgba(255,220,120,' + (0.45 + 0.3 * Math.sin(now / 200)).toFixed(2) + ')';
        c.fillRect(x - 1, y - h - 5, 3, 2);
      }
    });
  }

  // ground: your tracks in the snow, under everyone
  function ground(ctx, world, offX, offY, ts, now) {
    if (!world.ski || trailWorld !== world || !trail.length) return;
    var v = BridgeWorld.getView();
    for (var i = 0; i < trail.length; i++) {
      var p = trail[i], age = (now - p.t) / 1000;
      if (age > 90) continue;
      var x = offX + p.x * ts, y = offY + p.y * ts;
      if (x < -8 || y < -8 || x > v.w + 8 || y > v.h + 8) continue;
      var al = 0.42 * (age < 60 ? 1 : 1 - (age - 60) / 30);
      ctx.fillStyle = 'rgba(120,140,196,' + al.toFixed(3) + ')';
      var w = p.p ? 5 : 3, ca = Math.cos(p.a), sa = Math.sin(p.a);
      ctx.fillRect(Math.round(x - ca * w), Math.round(y + sa * w * 0.5), 1, 1);
      ctx.fillRect(Math.round(x + ca * w), Math.round(y - sa * w * 0.5), 1, 1);
    }
  }

  // over: snow spray off the skis
  function puff(n) {
    if (!s) return;
    for (var i = 0; i < n; i++) {
      spray.push({ x: s.x + (Math.random() - 0.5) * 0.4, y: s.y, z: 2, vx: (Math.random() - 0.5) * 2.2 - Math.sin(s.a) * s.v * 0.15,
                   vy: (Math.random() - 0.5) * 1.2, vz: 10 + Math.random() * 18, life: 0.5 + Math.random() * 0.4 });
    }
  }
  var lastOver = 0;
  function over(ctx, world, offX, offY, ts, now) {
    if (!world.ski) return;
    if (s && s.grind) {
      var bx = Math.round(offX + s.x * ts) - 16, by = Math.round(offY + s.y * ts - s.z * C45 * 32) - 66, b = s.grind.bal;
      ctx.fillStyle = 'rgba(16,20,40,0.75)'; ctx.fillRect(bx - 1, by - 1, 34, 5);
      ctx.fillStyle = Math.abs(b) > 0.7 ? '#e84a3a' : Math.abs(b) > 0.4 ? '#e0b030' : '#40c8a0';
      ctx.fillRect(bx + 15 + Math.round(b * 15), by, 3, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(bx + 16, by - 1, 1, 5);
    }
    var dt = lastOver ? Math.min(0.05, (now - lastOver) / 1000) : 0;
    lastOver = now;
    spray = spray.filter(function (p) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= 60 * dt; p.z = Math.max(0, p.z + p.vz * dt);
      if (p.life <= 0) return false;
      ctx.fillStyle = p.spark ? (p.life > 0.2 ? '#fff4c0' : '#ff9a40') : p.life > 0.3 ? '#ffffff' : '#dce6f6';
      ctx.fillRect(Math.round(offX + p.x * ts), Math.round(offY + p.y * ts - p.z), p.life > 0.45 ? 2 : 1, 1);
      return true;
    });
  }

  // ---- the HUD -------------------------------------------------------------------------------------------------------------
  function ensureHud() {
    if (hud) return;
    hud = document.createElement('div');
    hud.id = 'ski-hud';
    hud.className = 'sport-hud';
    hud.innerHTML = '<div class="sk-top"><i class="sk-mark"></i><b class="sk-name"></b><span class="sk-clock"></span><span class="sk-sub"></span></div>' +
      '<div class="sk-big"></div><div class="sk-msg"></div><div class="sk-help"></div>';
    document.body.appendChild(hud);
  }
  var msgT = 0, bigT = 0;
  function say(t) {
    ensureHud();
    var m = hud.querySelector('.sk-msg');
    m.textContent = t;
    m.classList.add('on');
    clearTimeout(msgT);
    msgT = setTimeout(function () { m.classList.remove('on'); }, 1700);
  }
  function bigText(t) {
    var b = hud.querySelector('.sk-big');
    b.textContent = t;
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    clearTimeout(bigT);
    bigT = setTimeout(function () { b.classList.remove('on'); }, 900);
  }
  function hudTick() {
    if (!hud || !s) return;
    var kmh = Math.round(s.v * 5.4), w = data(), sub = '';
    hud.querySelector('.sk-clock').textContent = s.park ? String(s.park.score) : s.id ? fmt(s.phase === 'done' ? s.final : Math.max(0, s.t + s.pen)) : kmh + ' km/h';
    if (s.park) {
      var ch = s.park.chain, sum = ch.reduce(function (a, c) { return a + c.pts; }, 0);
      sub = kmh + ' km/h' + (ch.length ? ' · +' + sum + (ch.length > 1 ? ' x' + Math.min(5, ch.length) : '') : '') + ' · Juno ' + JUNO;
    } else if (s.id && w) {
      var n = w.ski.runs[s.id].gates.length;
      sub = kmh + ' km/h · gate ' + Math.min(s.gate + 1, n) + '/' + n;
      if (s.rival && s.phase === 'run') sub += ' · Liv ' + (s.y >= sampleAt(s.rival.line, s.t)[1] / 20 ? 'behind' : 'ahead');
    } else if (s.still > 0.6) {
      sub = 'E: skis off';
    }
    hud.querySelector('.sk-sub').textContent = sub;
  }

  return {
    start: start, park: park, RUNS: RUNS, unlocked: unlocked, isOpen: function () { return !!s; },
    parkRecord: function () { return save.park; }, JUNO: JUNO, decorate: decorate,
    best: function (id) { return save.runs[id] && save.runs[id].best; },
    wax: wax, waxed: waxed,
    beatLiv: function (id) { return !!save.rival[id]; },
    items: items, ground: ground, over: over,
    _s: function () { return s; }, _rival: rivalLine
  };
})();
