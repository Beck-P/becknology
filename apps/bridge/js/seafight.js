/**
 * BridgeSeaFight — trouble at sea, in the sloop's passage view (js/sloop.js hands it an `api` into the passage).
 *
 * Once you've set a course, the crossing may bring company (`plan`): pirates now and then on the Emerald, more often
 * on the Sapphire and Rose seas, all too often on the Crimson (and more often the richer your hold looks); on the
 * Midnight Sea, a drowned ship hunting through the mist. Pirates come about and hail you (`ask`):
 *   - PAY THEM OFF: coins (a share of what your hold's worth) - or, if you can't, a third of the hold;
 *   - FIGHT: guns fire by themselves whenever a target bears and they're loaded (side guns abeam, a chaser dead ahead;
 *     a gunner on a gun halves its reload), theirs too - so sail to put them on your beam and keep them off your bow.
 *     Come alongside and it's a boarding: fighters decide it. Beat them and they strike: coins, and what they carried;
 *   - RUN: they chase. Shake them off (open water between you) and they give up; let them close and they board.
 * The drowned don't hail. A Moon Lantern (js/fleet.js FITS) keeps them off; moonglass (`holy`) bites them twice as hard,
 * plain iron barely.
 *
 * The Midnight Sea has monsters too (`MONSTERS`, drawn in code): the Gloamserpent circles under you, surfaces in coils
 * and rears to strike — sail hard and it lunges at empty water; wisp eels come in a swarm and latch onto the hull,
 * gnawing, till you shake them off with speed or shoot them off; and, rarely, the Deep Maw rises under you — its arms
 * grip the hull (you crawl) and slam down, its great eye surfacing a few lengths off; hurt it enough and it lets go.
 * Every boat carries a hand harpoon for them (F, or HARPOON on touch), so a sloop with no guns can fight back. They're
 * only hit while they're up. A kill pays coins and a trophy: a serpent's scales, the Maw's ink (and now and then a pearl). A hull battered to nothing founders: salvors tow her into the nearest port, her hold lost
 * (`api.wreck`). A sloop with no guns can only pay or run.
 *
 * Sailing together (js/sloop.js crew mode), the fight is the captain's and both of you are in it. The captain's game runs
 * it and sends the crew its state ten times a second (`sf`: every foe's id, kind, place, heading, speed, health, state;
 * the hull; the shots fired since), what's said (`sf-say`), a hit on her (`sf-shake`) and the prize (`sf-prize`). The
 * crew's game draws it all, plays the shots out, shows the hull — and the crew mans a swivel gun: F (or the FIRE button)
 * sends `sf-fire` and the captain's game fires it at that ship (5 a ball, 7 tiles, every 1.6 s). With a mate aboard
 * your guns reload a quarter quicker and you're two fighters stronger if they board. A ship sunk pays you both.
 */
var BridgeSeaFight = (function () {
  var api = null, foes = [], shots = [], puffs = [], gunT = [], asked = false, msgs = 0, nextId = 0;
  var SWIVEL = { dmg: 5, range: 7, reload: 1.6, arc: 'any' };              // the crew's gun
  var CHANCE = { emerald: 0.1, sapphire: 0.22, rose: 0.2, crimson: 0.45, midnight: 0.72 };
  var BLACK = ['#3e383c', '#2c2629', '#1c1619'], GHOST = ['#b8d8c8', '#90b0a0', '#68887a'];
  var FOE_GUNS = {
    swivel: { dmg: 4, range: 5, reload: 1.8, arc: 'side' }, long_nine: { dmg: 9, range: 8, reload: 3.4, arc: 'side' },
    carronade: { dmg: 16, range: 4.5, reload: 4.4, arc: 'side' }, chaser: { dmg: 7, range: 9, reload: 3.0, arc: 'bow' },
    ghostfire: { dmg: 6, range: 7, reload: 2.8, arc: 'side', ghost: true }
  };
  var HARPOON = { dmg: 9, range: 6.5, reload: 1.1, arc: 'any', harpoon: true };   // the hand harpoon every boat carries
  var KINDS = {
    cutter:  { name: 'a pirate cutter', spec: { L: 3.4, beam: 1.25, sheet: 'cutter', vmax: 4.5, nogo: 0.72, turn: 0.95 }, hull: 55,
               guns: ['swivel', 'swivel', 'chaser'], fighters: 3, loot: [70, 170], cargo: ['ember_rum', 'salt_fish'], cloth: BLACK, tint: 'rgba(24,14,16,0.62)' },
    raider:  { name: 'a pirate raider', spec: { L: 4.4, beam: 1.3, sheet: 'raider', vmax: 5.0, nogo: 0.74, turn: 0.85 }, hull: 105,
               guns: ['long_nine', 'long_nine', 'carronade', 'chaser'], fighters: 5, loot: [160, 340], cargo: ['blackpowder', 'ember_rum'], cloth: BLACK, tint: 'rgba(40,8,10,0.25)' },
    drowned: { name: 'a drowned ship', spec: { L: 5.0, beam: 1.6, sheet: 'brigantine', vmax: 3.9, nogo: 0.9, turn: 0.6 }, hull: 120,
               guns: ['ghostfire', 'ghostfire', 'ghostfire'], fighters: 6, loot: [120, 280], cargo: ['moon_salt'], cloth: GHOST, ghost: true, tint: 'rgba(150,220,190,0.55)' },
    // the monsters (drawn in code, no sails): spec.L is how big a target they are
    serpent: { name: 'the Gloamserpent', monster: 'serpent', spec: { L: 2.6 }, hull: 90, guns: [], fighters: 0, loot: [120, 220], cargo: [],
               drop: 'gloam_scale', dropN: [1, 2], title: 'The Gloamserpent slain' },
    eel:     { name: 'wisp eels', monster: 'eel', spec: { L: 1.0 }, hull: 14, guns: [], fighters: 0, loot: [8, 16], cargo: [] },
    kraken:  { name: 'the Deep Maw', monster: 'kraken', spec: { L: 3.6 }, hull: 260, guns: [], fighters: 0, loot: [420, 720], cargo: [],
               drop: 'abyss_ink', dropN: [2, 3], rare: ['deep_pearl', 0.35], title: 'The Deep Maw slain' }
  };
  var MSTATE = { stalk: 1, rise: 1, coil: 1, rear: 1, strike: 1, dive: 1, swim: 1, latch: 1, sound: 1, grip: 1 };   // a monster at you

  function F() { return typeof BridgeFleet !== 'undefined' ? BridgeFleet : null; }
  function say(t, ms) { if (api) api.say(t, ms); tellCrew('sf-say', { t: t, ms: ms }); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.r - b.r); }
  function ship() { var f = F(); return f ? f.active().ship : null; }
  function holdValue(P) {
    var s = ship(), T = typeof BridgeTrade !== 'undefined' ? BridgeTrade : null, v = 0;
    if (!s || !T) return 0;
    for (var id in s.hold) v += T.price(id, P || 'lumar', 'sell') * s.hold[id];
    return v;
  }

  /** A fresh passage. */
  function reset(a) { api = a; foes = []; shots = []; puffs = []; gunT = []; asked = false; out = []; mir = null; eelShook = false; harpoonUntil = 0; midT = 0; outT = 0; }
  /** You've set a course: will anything come for you on the way? */
  function plan() {
    if (!api || foes.length) return;
    var A = api.A(), B = api.B(), b = api.boat();
    if (!A || !B || !b) return;
    var seas = [A.pal, B.pal], midnight = seas.indexOf('midnight') >= 0;
    // the Midnight Sea's things keep to its depths: nothing for the first while after you cross into it, or near its edge
    if (midnight && (midT < MID_WAIT || !deepIn(b, MID_DEEP))) return;
    var p = Math.max(CHANCE[A.pal] || 0.1, CHANCE[B.pal] || 0.1), rich = holdValue(B.id);
    if (!midnight) p = Math.min(0.85, p + Math.min(0.25, rich / 2500));
    if (api.blessed && api.blessed()) p *= 0.5;                        // a candle at St Brendan's: they think twice
    if (typeof BridgeWeather !== 'undefined' && BridgeWeather.pirates) p *= BridgeWeather.pirates();   // a storm keeps them in port
    if (api.rand() > p) return;
    var kind = midnight ? deep() : seas.indexOf('crimson') >= 0 ? (api.rand() < 0.6 ? 'raider' : 'cutter') : (api.rand() < 0.15 ? 'raider' : 'cutter');
    if (KINDS[kind].monster) {                                         // they come up from anywhere round you
      for (var t2 = 0; t2 < 10; t2++) {
        var a = api.rand() * Math.PI * 2, R = 17 + api.rand() * 4, mx = b.x + Math.cos(a) * R, mr = b.r + Math.sin(a) * R;
        if (api.offshore(mx, mr)) { spawnMonster(kind, mx, mr); return; }
      }
      return;
    }
    // somewhere past halfway, off to one side of the line
    var ex = B.exit, f = 0.45 + api.rand() * 0.15, side = api.rand() < 0.5 ? -1 : 1;
    var dx = ex[0] - b.x, dr = ex[1] - b.r, n = Math.hypot(dx, dr) || 1;
    for (var tries = 0; tries < 8; tries++) {
      var off = side * (7 + tries), x = b.x + dx * f - dr / n * off, r = b.r + dr * f + dx / n * off;
      if (api.offshore(x, r)) { spawn(kind, x, r, Math.atan2(b.r - r, b.x - x)); return; }
      side = -side;
    }
  }
  function spawn(kind, x, r, h) {
    var K = KINDS[kind];
    foes.push({ id: ++nextId, kind: kind, K: K, x: x, r: r, h: h, v: 0, hp: K.hull, max: K.hull, state: 'lurk', guns: K.guns.map(function (g) { return { g: FOE_GUNS[g], t: 1 + Math.random() * 2 }; }),
                b: { x: x, r: r, h: h, v: 0, sheet: 1.2, boom: 0.5, side: 1, heel: 0, rudder: 0, bump: 0, hoist: 1, eff: 1, off: 1.6, luff: false, empty: true,
                     crew: !K.ghost, seed: Math.random() * 10, spec: K.spec, cloth: K.cloth, tint: K.tint } });
  }
  var MID_WAIT = 35, MID_DEEP = 26, midT = 0, outT = 0;          // seconds in the Midnight Sea first; tiles from any other sea
  function deepIn(b, R) {                                          // the Midnight Sea all round you, R tiles out
    if (!api.seaAt) return true;
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; if (api.seaAt(b.x + Math.cos(a) * R, b.r + Math.sin(a) * R) !== 'midnight') return false; }
    return api.seaAt(b.x, b.r) === 'midnight';
  }
  // what comes out of the Midnight Sea: the serpent most often, eels, a drowned ship, now and then the Maw
  function deep() { var r = api.rand(); return r < 0.36 ? 'serpent' : r < 0.62 ? 'eel' : r < 0.86 ? 'drowned' : 'kraken'; }
  function spawnMonster(kind, x, r) {
    var n = kind === 'eel' ? 3 : 1;
    for (var i = 0; i < n; i++) {
      spawn(kind, x + (i ? (Math.random() - 0.5) * 2 : 0), r + (i ? (Math.random() - 0.5) * 2 : 0), Math.random() * Math.PI * 2);
      var o = foes[foes.length - 1];
      o.lead = i === 0; o.trail = []; o.t = 0; o.under = true; o.dir = Math.random() < 0.5 ? -1 : 1; o.rears = 0;
    }
  }
  function hostile(o) { return o.state === 'fight' || o.state === 'chase' || o.state === 'hunt' || !!(o.K.monster && MSTATE[o.state]); }
  /** Is a fight on (no skipping ahead)? */
  function busy() { return foes.some(function (o) { return hostile(o) || o.state === 'hail'; }); }

  // ---- the parley ---------------------------------------------------------------------------------------------------
  function demand() { return Math.round((40 + holdValue(api.B() && api.B().id) * 0.25) / 5) * 5; }
  function hail(o) {
    o.state = 'hail';
    var guns = api.spec().guns || [], d = demand();
    api.sfx('bell');
    tellCrew('sf-hail', { d: d });
    api.ask('A black flag', 'THEY\'VE RUN OUT THEIR GUNS. "HEAVE TO! ' + d + ' COINS AND YOU SAIL ON - OR WE TAKE YOUR HOLD."', [
      ['Pay them off (' + d + ')', function () { pay(o, d); }],
      [guns.length ? 'Fight' : crew() ? 'Fight (your mate has a swivel)' : 'Fight (you have no guns)', guns.length || crew() ? function () {
        o.state = 'fight'; say(guns.length ? 'Fight it is. Put them on your beam - your guns fire as they bear' : 'Fight it is - your mate on the swivel. Keep them close', 4200); } : null],
      ['Run for it', function () { o.state = 'chase'; say('You crack on every stitch of sail. They come after you', 3600); }]
    ], function () { if (o.state === 'hail') { o.state = 'chase'; say('You turn away. They come after you', 3000); } });
  }
  function pay(o, d) {
    var P = typeof BridgeProgression !== 'undefined' && BridgeProgression.wagerCoins ? BridgeProgression.wagerCoins(d, 'pirates') : Promise.resolve({ ok: false });
    P.then(function (r) {
      if (r && r.ok) { say('A bag of coins across the water. They dip their flag and bear away', 4000); }
      else { var lost = takeHold(1 / 3); say(lost ? 'No coins - so they take a third of your hold, and laugh about it' : 'Nothing worth taking. They spit and bear away', 4200); }
      o.state = 'leave';
    });
  }
  function takeHold(frac) {
    var s = ship(), n = 0;
    if (!s) return 0;
    Object.keys(s.hold).forEach(function (id) { var k = Math.floor(s.hold[id] * frac + 0.5); if (k) { s.hold[id] -= k; n += k; if (s.hold[id] <= 0) delete s.hold[id]; } });
    if (F()) F().save();
    return n;
  }

  // ---- each frame ---------------------------------------------------------------------------------------------------
  function update(dt, now) {
    if (!api) return;
    var b = api.boat(), sp = api.spec(), wind = api.wind();
    if (!b) return;
    // the monsters won't leave the Midnight Sea: sail out of it and they give you up
    var inMid = !api.sea || api.sea() === 'midnight';
    midT = inMid ? midT + dt : 0; outT = inMid ? 0 : outT + dt;
    if (outT > 1.2 && foes.some(function (o) { return o.K.monster && MSTATE[o.state]; })) {
      var big = foes.filter(function (o) { return o.K.monster && MSTATE[o.state]; })[0];
      foes.forEach(function (o) { if (o.K.monster && MSTATE[o.state]) { o.state = 'gone'; o.hold = false; } });
      say(big.K.monster === 'eel' ? 'The eels drop away behind you - they won\'t follow you out of the Midnight Sea' :
          big.K.monster === 'kraken' ? 'Out of the Midnight Sea, the arms let go and slide back into the dark. It won\'t follow' :
          'The serpent turns back at the edge of the Midnight Sea. It won\'t follow you out', 3600);
    }
    foes.forEach(function (o) {
      if (o.K.monster) { monster(o, dt, b); return; }
      var d = dist(o, b), K = o.K, want = o.h, speed = 0.75;
      var ward = K.ghost && sp.ward;
      if (o.state === 'lurk') {                                       // drifting, waiting: close in once you're near
        speed = 0.35;
        if (d < (o.lost ? 9 : 18)) {
          if (K.ghost) { o.state = ward ? 'shy' : 'hunt'; say(ward ? 'A drowned ship slides out of the mist - and turns from your lantern\'s light' : 'Green lanterns in the mist. A drowned ship, and it\'s coming for you', 4200); api.sfx('bell'); }
          else { o.state = 'approach'; say('Sail on the ' + (wrap(Math.atan2(o.r - b.r, o.x - b.x) - b.h) > 0 ? 'starboard' : 'port') + ' bow. Black sails - pirates', 3600); }
        }
      }
      if (o.state === 'approach') { want = Math.atan2(b.r - o.r, b.x - o.x); speed = 0.9; if (d < 9.5) hail(o); }
      if (o.state === 'hail') { want = Math.atan2(b.r - o.r, b.x - o.x) + 1.2; speed = 0.25; }
      if (o.state === 'shy') { want = Math.atan2(o.r - b.r, o.x - b.x) + 0.6; speed = 0.6; if (d > 28) o.state = 'gone'; }
      if (o.state === 'fight' || o.state === 'hunt') {                // close to gun range, then lie alongside on a parallel course
        var abeam = Math.atan2(b.r - o.r, b.x - o.x), keep = 4.5;
        if (d > keep + 2) { want = abeam; speed = 1; }
        else { var par = b.h + (wrap(abeam - b.h) > 0 ? 0.25 : -0.25) * (d < keep - 1.5 ? -1 : 1); want = par; speed = clamp(b.v / (K.spec.vmax || 4), 0.3, 1); }
        if (o.hp < o.max * 0.3 && !K.ghost) { o.state = 'leave'; say('They\'ve had enough - they bear away, burning', 3200); }
        else if (K.ghost && d > 22) { o.state = 'lurk'; o.lost = true; say('The green lanterns fade into the mist behind you. You\'ve lost it - for now', 3600); }
        else if ((api.hull() < 0.35 || o.boardOk) && d < 2.2) board(o);
      }
      if (o.state === 'chase') {
        want = Math.atan2(b.r - o.r, b.x - o.x); speed = 1;
        if (d < 1.8) board(o);
        if (d > 24) { o.state = 'leave'; say('They\'ve lost you in the swell. They give up the chase', 3600); }
      }
      if (o.state === 'leave') { want = Math.atan2(o.r - b.r, o.x - b.x); speed = 1; if (d > 34) o.state = 'gone'; }
      if (o.state === 'sink') { o.sinkT = (o.sinkT || 0) + dt; o.v *= 1 - dt; o.b.heel = Math.min(1.1, o.sinkT * 0.35); if (o.sinkT > 5) o.state = 'gone'; }
      if (o.state !== 'sink') {
        // steer (away from land), and sail - pirates and the drowned are never quite in irons
        var ahead = [o.x + Math.cos(o.h) * 3, o.r + Math.sin(o.h) * 3];
        if (api.ground(ahead[0], ahead[1]) === 1) want = o.h + 1.2;
        var turn = (K.spec.turn || 0.8) * 0.9 * dt, dh = wrap(want - o.h);
        o.h = wrap(o.h + clamp(dh, -turn, turn));
        var off = Math.abs(wrap(o.h - wind.now)), pol = Math.max(0.45, api.polar(off, K.spec));
        var goal = (K.spec.vmax || 4) * pol * wind.s * speed;
        o.v += (goal - o.v) * Math.min(1, dt * 0.6);
        var nx = o.x + Math.cos(o.h) * o.v * dt, nr = o.r + Math.sin(o.h) * o.v * dt;
        if (api.ground(nx, nr) !== 1) { o.x = nx; o.r = nr; } else { o.v *= 0.5; o.h = wrap(o.h + 0.6); }
      }
      o.b.x = o.x; o.b.r = o.r; o.b.h = o.h; o.b.v = o.v; o.b.side = wrap(wind.now - o.h) > 0 ? -1 : 1;
      o.b.boom = clamp(Math.abs(wrap(o.h - wind.now)) - 0.42, 0.1, 1.45); o.b.hoist = o.state === 'sink' ? Math.max(0, 1 - (o.sinkT || 0) / 2) : 1;
      // their guns
      if (hostile(o) && o.state !== 'sink') o.guns.forEach(function (gn) {
        gn.t -= dt;
        if (gn.t > 0) return;
        if (bears(o, b, gn.g)) { fire(o, b, gn.g, 'them'); gn.t = gn.g.reload * (0.85 + Math.random() * 0.3); }
      });
    });
    foes = foes.filter(function (o) { return o.state !== 'gone'; });
    // your guns: whatever bears on something that means you harm
    var guns = sp.guns || [], targets = foes.filter(function (o) { return !o.under && o.state !== 'sink' && (hostile(o) || o.state === 'leave' && o.hp < o.max); });
    guns.forEach(function (g, i) {
      gunT[i] = (gunT[i] || 0) - dt;
      if (gunT[i] > 0 || !targets.length) return;
      var t = targets.filter(function (o) { return bears(b, o, g); }).sort(function (p, q) { return dist(p, b) - dist(q, b); })[0];
      if (!t) return;
      fire(b, t, g, 'you');
      gunT[i] = g.reload * (g.manned ? 0.5 * (1 - 0.08 * Math.max(0, (g.skill || 1) - 1)) : 1) * (crew() ? 0.75 : 1);     // a mate aboard helps run them out
    });
    // shots in flight
    shots.forEach(function (s) {
      s.t += dt;
      if (s.t < s.T) return;
      s.done = true;
      var tgt = s.at, hit = tgt && !tgt.under && Math.hypot(tgt.x - s.tx, tgt.r - s.tr) < (tgt === b ? (sp.L || 2.6) : tgt.K.spec.L) * 0.5 + 0.45;
      if (hit && tgt === b) hurtYou(s.dmg, s.ghost);
      else if (hit) hurtThem(tgt, s.dmg * (tgt.K.ghost ? (s.holy ? 2 : 0.6) : tgt.K.monster && s.holy ? 1.5 : 1));
      puffs.push({ x: s.tx, r: s.tr, z: 0, age: 0, kind: hit ? (s.ghost ? 'ghosthit' : tgt.K && tgt.K.monster ? 'gore' : 'hit') : 'splash' });
      if (!hit) api.sfx('splash');
    });
    shots = shots.filter(function (s) { return !s.done; });
    puffs = puffs.filter(function (p) { p.age += dt; return p.age < 1.2; });
    broadcast(now);
  }
  function bears(from, to, g) {
    var d = dist(from, to);
    if (d > g.range) return false;
    var rel = wrap(Math.atan2(to.r - from.r, to.x - from.x) - from.h);
    return g.arc === 'any' ? true : g.arc === 'bow' ? Math.abs(rel) < 0.35 : Math.abs(Math.sin(rel)) > 0.72;
  }
  function fire(from, to, g, who) {
    var d = dist(from, to), acc = clamp(0.88 - d / g.range * 0.38 - Math.abs(to.v || 0) * 0.03, 0.25, 0.9);
    var miss = Math.random() > acc, ang = Math.random() * Math.PI * 2, spread = miss ? 1.2 + Math.random() * 1.6 : Math.random() * 0.3;
    var lead = (to.v || 0) * d / 14;
    var tx = to.x + Math.cos(to.h) * lead + Math.cos(ang) * spread, tr = to.r + Math.sin(to.h) * lead + Math.sin(ang) * spread;
    var rel = wrap(Math.atan2(to.r - from.r, to.x - from.x) - from.h), side = g.arc === 'bow' ? 0 : rel > 0 ? 1 : -1, L = from === api.boat() ? (api.spec().L || 2.6) : from.K.spec.L;
    var mu = (Math.random() - 0.5) * L * 0.5, c = Math.cos(from.h), s = Math.sin(from.h), bw = g.arc === 'bow' ? 0 : 0.6;
    var ox = from.x + (g.arc === 'bow' ? c * L / 2 : c * mu - s * side * bw), or = from.r + (g.arc === 'bow' ? s * L / 2 : s * mu + c * side * bw);
    shots.push({ x: ox, r: or, tx: tx, tr: tr, t: 0, T: Math.max(0.25, d / 14), dmg: g.dmg, at: to, holy: !!g.holy, ghost: !!g.ghost, who: who, harpoon: !!g.harpoon });
    if (crew()) out.push([r2(ox), r2(or), r2(tx), r2(tr), r2(Math.max(0.25, d / 14)), g.ghost ? 1 : 0, g.holy ? 1 : 0, g.harpoon ? 1 : 0]);   // for the crew to see
    if (!g.harpoon) puffs.push({ x: ox, r: or, z: 0.4, age: 0, kind: g.ghost ? 'ghostflash' : 'smoke' });
    api.sfx(g.harpoon ? 'harpoon' : g.ghost ? 'zap' : 'cannon');
  }
  var BITES = { serpent: 'Its jaws close on the rail and wrench - planks splinter', eel: 'The eels are gnawing at the hull', kraken: 'An arm as thick as a mast slams across the deck' };
  function hurtYou(dmg, ghost) {
    var f = F(), s = ship();
    if (!f || !s) return;
    var left = f.damage(s.id, dmg), how = BITES[ghost];
    if (ghost !== 'eel') { api.shake(); tellCrew('sf-shake', {}); }
    if (how ? ghost !== 'eel' || ++msgs % 4 === 1 : ++msgs % 3 === 1)
      say(how ? how + '! Hull at ' + Math.round(left * 100) + '%' : ghost ? 'Green fire splashes across the deck - the planks blacken with frost' : 'A ball smashes through the bulwark! Hull at ' + Math.round(left * 100) + '%', 2200);
    if (left <= 0) api.wreck(how ? 'The ' + s.name + ' is torn open and settles in the dark water' : 'The ' + s.name + ' is holed below the waterline and settles by the head');
  }
  function hurtThem(o, dmg) {
    if (o.state === 'sink') return;
    o.hp -= dmg;
    o.flash = performance.now();
    if (o.K.monster === 'kraken' && o.hold) o.gripHurt = (o.gripHurt || 0) + dmg;
    if (o.hp <= 0) { if (o.K.monster) slay(o); else sink(o); }
  }

  // ---- the monsters ------------------------------------------------------------------------------------------------
  function go(o, st) { o.state = st; o.t = 0; o.wait = st === 'stalk' ? 3 + Math.random() * 2.5 : st === 'coil' ? 3.8 + Math.random() * 2.4 : 0; }
  function swim(o, tx, tr, speed, turn, dt) {
    var dh = wrap(Math.atan2(tr - o.r, tx - o.x) - o.h), tt = turn * dt;
    o.h = wrap(o.h + clamp(dh, -tt, tt));
    o.v += (speed - o.v) * Math.min(1, dt * 2);
    var nx = o.x + Math.cos(o.h) * o.v * dt, nr = o.r + Math.sin(o.h) * o.v * dt;
    if (api.ground(nx, nr) !== 1) { o.x = nx; o.r = nr; } else o.h = wrap(o.h + 4 * dt);
    track(o);
  }
  function track(o) {                                              // where the head has been: the body follows it
    var tr = o.trail || (o.trail = []), l = tr[tr.length - 1];
    if (!l || Math.hypot(l[0] - o.x, l[1] - o.r) > 0.06) { tr.push([o.x, o.r]); if (tr.length > 140) tr.shift(); }
  }
  function monster(o, dt, b) {
    o.t = (o.t || 0) + dt;
    if (o.state === 'sink') { o.sinkT = (o.sinkT || 0) + dt; if (o.sinkT > 2.6) o.state = 'gone'; return; }
    var d = dist(o, b), m = o.K.monster;
    if (m === 'serpent') serpent(o, dt, b, d); else if (m === 'eel') eel(o, dt, b, d); else kraken(o, dt, b, d);
  }
  function serpent(o, dt, b, d) {
    var S = o.state;
    if (S === 'lurk') {
      o.under = true; swim(o, o.x + Math.cos(o.h + 0.6) * 4, o.r + Math.sin(o.h + 0.6) * 4, 1.2, 1, dt);
      if (d < 22) { go(o, 'stalk'); o.orb = Math.atan2(o.r - b.r, o.x - b.x); say('Something long and pale is moving under the water - round and round your boat...', 4200); api.sfx('roar'); }
    } else if (S === 'stalk' || S === 'rise' || S === 'coil') {
      var R = S === 'coil' ? 3.9 : 5.6, sp = S === 'stalk' ? 5.0 : 3.2;
      o.orb += dt * sp / R * o.dir;
      swim(o, b.x + Math.cos(o.orb) * R, b.r + Math.sin(o.orb) * R, sp, 2.6, dt);
      o.under = S === 'stalk';
      if (S === 'stalk' && o.t > o.wait && d < 9) {
        go(o, 'rise'); api.sfx('splash');
        if (!o.seen) { o.seen = 1; say('The Gloamserpent breaks the surface, coil on coil of it. Harpoon it (F) while it\'s up!', 4600); }
      } else if (S === 'rise' && o.t > 1) go(o, 'coil');
      else if (S === 'coil' && o.t > o.wait) {
        go(o, 'rear'); api.sfx('hiss');
        o.aim = [b.x + Math.cos(b.h) * b.v * 0.5, b.r + Math.sin(b.h) * b.v * 0.5];
        if (++o.rears === 1) say('It rears up to strike - sail hard!', 2600);
      }
    } else if (S === 'rear') {
      o.h = wrap(o.h + clamp(wrap(Math.atan2(o.aim[1] - o.r, o.aim[0] - o.x) - o.h), -3 * dt, 3 * dt));
      o.v *= 1 - Math.min(1, dt * 3);
      if (o.t > 0.95) { go(o, 'strike'); o.from = [o.x, o.r]; }
    } else if (S === 'strike') {
      var k = Math.min(1, o.t / 0.32);
      o.x = o.from[0] + (o.aim[0] - o.from[0]) * k; o.r = o.from[1] + (o.aim[1] - o.from[1]) * k; track(o);
      if (k >= 1) {
        if (Math.hypot(b.x - o.aim[0], b.r - o.aim[1]) < (api.spec().L || 2.6) * 0.45 + 0.8) hurtYou(10 + Math.random() * 4, 'serpent');
        else say('Its jaws snap shut on empty water', 1600);
        puffs.push({ x: o.aim[0], r: o.aim[1], z: 0, age: 0, kind: 'bigsplash' }); api.sfx('slam');
        go(o, 'dive');
      }
    } else if (S === 'dive') {
      o.under = o.t > 0.5; swim(o, o.x + Math.cos(o.h) * 3, o.r + Math.sin(o.h) * 3, 3, 1, dt);
      if (o.t > 1.2) { go(o, 'stalk'); o.orb = Math.atan2(o.r - b.r, o.x - b.x); }
    }
    if (S !== 'lurk' && d > 34) { o.state = 'gone'; say('The serpent sinks away into the dark behind you', 3000); }
  }
  var eelShook = false;
  function eel(o, dt, b, d) {
    var S = o.state;
    if (S === 'lurk') {
      o.under = true; swim(o, b.x, b.r, 1.5, 1, dt);
      if (d < 18) { go(o, 'swim'); if (o.lead) { say('Lights under the water, coming fast - wisp eels! Keep your speed up', 3400); api.sfx('zap'); } }
    } else if (S === 'swim') {
      o.under = Math.sin(o.t * 4 + o.id * 1.7) < -0.35;              // porpoising: up, down, up
      swim(o, b.x, b.r, 6.2, 3.4, dt);
      if (d < 1.5 && b.v < 3.4) { go(o, 'latch'); o.side = Math.random() < 0.5 ? -1 : 1; o.along = (Math.random() - 0.5) * 0.7; o.shake = 0; o.bite = 0.7; }
      if (d > 30) o.state = 'gone';
    } else if (S === 'latch') {
      o.under = false;
      var L = api.spec().L || 2.6, c = Math.cos(b.h), sn = Math.sin(b.h);
      o.x = b.x + c * o.along * L * 0.5 - sn * o.side * 0.55; o.r = b.r + sn * o.along * L * 0.5 + c * o.side * 0.55;
      o.h = wrap(b.h + o.side * 1.3); o.v = b.v; track(o);
      o.bite -= dt;
      if (o.bite <= 0) { o.bite = 1.4; hurtYou(1, 'eel'); }
      o.shake = b.v > 3.0 ? o.shake + dt : Math.max(0, o.shake - dt * 0.5);
      if (o.shake > 1.3) {
        go(o, 'swim'); o.x -= c * 3; o.r -= sn * 3; o.v = 0;
        if (!eelShook) { eelShook = true; say('You shake them off with speed - keep it up!', 2600); }
      }
    }
  }
  function kraken(o, dt, b, d) {
    var S = o.state;
    if (S === 'lurk') {
      o.under = true; swim(o, b.x, b.r, 1.5, 1, dt);
      if (d < 24) { go(o, 'sound'); say('The water goes flat and still. Something vast is rising under you.', 4400); api.sfx('roar'); }
    } else if (S === 'sound') {
      o.under = true; swim(o, b.x, b.r, 4.5, 2, dt);
      if (o.t > 3.5 || d < 1.5) {
        go(o, 'grip'); o.hold = true; o.gripHurt = 0; o.slamT = 1.8; o.slamI = -1; o.ang = Math.random() * Math.PI * 2;
        o.x = b.x + Math.cos(o.ang) * 4.6; o.r = b.r + Math.sin(o.ang) * 4.6;
        say('The Deep Maw! Its arms come up round the hull - harpoon the eye (F) to break its grip!', 4600);
        api.sfx('thunder'); api.shake(); puffs.push({ x: o.x, r: o.r, z: 0, age: 0, kind: 'bigsplash' });
      }
    } else if (S === 'grip') {
      o.under = false;
      o.ang += dt * 0.12;
      var hx = b.x + Math.cos(o.ang) * 4.6, hr = b.r + Math.sin(o.ang) * 4.6;
      o.x += (hx - o.x) * Math.min(1, dt * 2); o.r += (hr - o.r) * Math.min(1, dt * 2); o.h = Math.atan2(b.r - o.r, b.x - o.x); o.v = b.v;
      if (o.hold) b.v = Math.min(b.v, 0.7);                           // its arms round the hull: you crawl
      o.slamT -= dt;
      if (o.slamI < 0 && o.slamT <= 0) { o.slamI = 2 + Math.floor(Math.random() * 4); o.slamAt = 0; o.slammed = false; o.aim = [b.x, b.r]; }
      if (o.slamI >= 0) {
        o.slamAt += dt;
        if (o.slamAt > 0.75 && !o.aimed) { o.aimed = true; o.aim = [b.x, b.r]; }   // where you are as it falls
        if (o.slamAt > 1.0 && !o.slammed) {
          o.slammed = true;
          if (Math.hypot(b.x - o.aim[0], b.r - o.aim[1]) < 1.7) hurtYou(6 + Math.random() * 3, 'kraken');
          puffs.push({ x: o.aim[0], r: o.aim[1], z: 0, age: 0, kind: 'bigsplash' }); api.sfx('slam');
        }
        if (o.slamAt > 1.6) { o.slamI = -1; o.aimed = false; o.slamT = 2.6 + Math.random() * 1.6; }
      }
      if (o.hold && o.gripHurt >= 30) { o.hold = false; say('It loosens its grip - you\'re free! Get clear, or fight it', 3200); api.sfx('roar'); }
      if (o.t > 15) { go(o, 'sound'); o.hold = false; o.slamI = -1; say('The arms slide back into the deep. It\'ll be back', 3200); }
    }
    if (S !== 'lurk' && d > 40) { o.state = 'gone'; say('The Deep Maw sinks back into the abyss', 3000); }
  }
  function slay(o) {
    o.state = 'sink'; o.sinkT = 0; o.under = false; o.hold = false;
    var K = o.K, coins = Math.round(K.loot[0] + Math.random() * (K.loot[1] - K.loot[0])), got = trophies(K);
    puffs.push({ x: o.x, r: o.r, z: 0, age: 0, kind: 'bigsplash' });
    api.sfx(K.monster === 'eel' ? 'splash' : 'roar');
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(coins, 'sea:' + o.kind);
    var I = typeof BridgeItems !== 'undefined' ? BridgeItems : null, names = got.map(function (g) { var it = I && I.get ? I.get(g[0]) : null; return g[1] + ' × ' + (it ? it.name : g[0]); });
    if (K.monster === 'eel') {
      var left = foes.filter(function (q) { return q.kind === 'eel' && q.state !== 'sink'; }).length;
      say(left ? 'One eel goes limp and sinks (+' + coins + '). ' + left + ' left' : 'The last of the eels sinks away, its light going out (+' + coins + ')', 2400);
    } else {
      say((K.monster === 'kraken' ? 'The great eye clouds over. The Deep Maw sinks, trailing ink. ' : 'The serpent thrashes once and goes still, sinking. ') + coins + ' coins' +
          (names.length ? ', and ' + names.join(', ') + ' hauled in' : '') + '!', 5200);
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('At sea', K.title, '+' + coins + ' coins' + (names.length ? ' · ' + names.join(', ') : ''));
    }
    tellCrew('sf-prize', { coins: coins, kind: o.kind });
  }
  function trophies(K) {                                          // into your pack (or the swap, if it's full)
    var got = [];
    if (K.drop) got.push([K.drop, K.dropN[0] + Math.floor(Math.random() * (K.dropN[1] - K.dropN[0] + 1))]);
    if (K.rare && Math.random() < K.rare[1]) got.push([K.rare[0], 1]);
    got.forEach(function (g) { if (typeof BridgeInventory !== 'undefined' && BridgeInventory.give) BridgeInventory.give(g[0], g[1]); });
    return got;
  }
  // the hand harpoon: the nearest thing that means you harm and is up, in reach
  var harpoonUntil = 0;
  function harpoonTarget() {
    var b = api && api.boat();
    if (!b) return null;
    return foes.filter(function (o) { return hostile(o) && !o.under && o.state !== 'sink' && dist(o, b) <= HARPOON.range; })
      .sort(function (p, q) { return dist(p, b) - dist(q, b); })[0] || null;
  }
  function throwHarpoon() {
    var now = performance.now();
    if (!api || captain() || now < harpoonUntil) return false;
    var t = harpoonTarget();
    if (!t) { api.say(foes.some(function (o) { return hostile(o) && o.under; }) ? 'It\'s under the water - wait for it to come up' : 'Nothing in reach of the harpoon', 1400); return true; }
    harpoonUntil = now + HARPOON.reload * 1000;
    fire(api.boat(), t, HARPOON, 'you');
    return true;
  }
  function sink(o) {
    o.state = 'sink';
    api.sfx('slam');
    var K = o.K, coins = Math.round(K.loot[0] + Math.random() * (K.loot[1] - K.loot[0]));
    var C = typeof BridgeCrown !== 'undefined' ? BridgeCrown : null;
    if (C && !K.ghost && C.marque()) coins *= 2;                         // sailing under the Crown's letter of marque
    if (C) C.noteWin(K);
    var s = ship(), T = typeof BridgeTrade !== 'undefined' ? BridgeTrade : null, got = 0, good = K.cargo[Math.floor(Math.random() * K.cargo.length)];
    if (s && T) { var n = Math.min(3 + Math.floor(Math.random() * 5), T.fits(s, good)); if (n > 0) { s.hold[good] = (s.hold[good] || 0) + n; got = n; F().save(); } }
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(coins, K.ghost ? 'sea:drowned' : 'sea:pirates');
    say((K.ghost ? 'The drowned ship comes apart into mist and green light. ' : 'She strikes her colours and goes down by the stern. ') + coins + ' coins' +
            (got ? ' and ' + got + ' ' + (T ? T.name(good) : good) + ' hauled aboard' : '') + '!', 5200);
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('At sea', K.ghost ? 'A drowned ship sent home' : 'Pirates beaten', '+' + coins + ' coins' + (C && !K.ghost && C.marque() ? ' (the Crown\'s bounty, doubled)' : ''));
    tellCrew('sf-prize', { coins: coins, kind: o.kind });
  }
  function board(o) {
    if (o.boarded) return;
    o.boarded = true;
    var you = (api.spec().fighters || 1) + (crew() ? 2 : 0), them = o.K.fighters, win = Math.random() < you / (you + them);
    api.sfx('slam');
    if (win) { say('Grapnels! They swarm over the rail - and your hands throw them back. You board them in turn', 4200); sink(o); }
    else {
      var lost = takeHold(0.5);
      say(o.K.ghost ? 'Cold hands over the rail. The drowned take what they want and sink back into the mist' : 'Grapnels! They swarm aboard and take ' + (lost ? 'half your hold' : 'what little you have') + ', then cast off laughing', 4600);
      var f = F(), s = ship();
      if (f && s && f.damage(s.id, 6) <= 0) api.wreck('Stripped and holed, the ' + s.name + ' wallows');
      o.state = 'leave';
    }
  }

  // ---- sailing together: the captain's fight, sent to the crew; the crew's swivel gun --------------------------------
  var out = [], sentAt = 0, mir = null, coolUntil = 0, loopOn = false;
  function N() { return typeof BridgeNet !== 'undefined' ? BridgeNet : null; }
  function sloopCrew() { return typeof BridgeSloop !== 'undefined' && BridgeSloop._crew ? BridgeSloop._crew() : {}; }
  function crew() { return sloopCrew().crewOf || null; }                 // a mate aboard your ship
  function captain() { return sloopCrew().captainOf || null; }           // you're aboard theirs
  function r2(v) { return Math.round(v * 100) / 100; }
  function tellCrew(e, d) { var c = crew(), n = N(); if (c && n) n.send(e, d, c.id); }
  // the captain, each frame of the fight (from update): the state, ten times a second, while there's anything to tell
  function broadcast(now) {
    var c = crew(), n = N();
    if (!c || !n || now - sentAt < 150) return;
    if (!foes.length && !out.length && !(mir0 && mir0.length)) return;
    sentAt = now;
    var f = F(), sh = ship();
    var state = foes.map(function (o) {
      return [o.id, o.kind, r2(o.x), r2(o.r), r2(o.h), r2(o.v), Math.round(o.hp), o.max, o.state, r2(o.sinkT || 0), o.flash && now - o.flash < 200 ? 1 : 0, r2(o.b.boom), o.b.side, r2(o.b.hoist), r2(o.b.heel),
              o.K.monster ? [r2(o.t || 0), o.slamI == null ? -1 : o.slamI, r2(o.slamAt || 0), o.aim ? r2(o.aim[0]) : 0, o.aim ? r2(o.aim[1]) : 0, o.hold ? 1 : 0, o.under ? 1 : 0, r2(o.ang || 0)] : 0];
    });
    n.send('sf', { f: state, hull: sh ? r2(sh.hull) : 1, s: out }, c.id);
    out = []; mir0 = state;
  }
  var mir0 = null;
  // the crew: apply what the captain's game says
  function apply(d) {
    if (!api || !d || !Array.isArray(d.f)) return;
    var now = performance.now(), keep = {};
    mir = { at: now, hull: typeof d.hull === 'number' ? d.hull : 1 };
    d.f.forEach(function (e) {
      keep[e[0]] = 1;
      var o = foes.filter(function (q) { return q.id === e[0]; })[0];
      if (!o) {
        var K = KINDS[e[1]];
        if (!K) return;
        o = { id: e[0], kind: e[1], K: K, x: e[2], r: e[3], h: e[4], v: e[5], guns: [],
              b: { x: e[2], r: e[3], h: e[4], v: 0, sheet: 1.2, boom: 0.5, side: 1, heel: 0, rudder: 0, bump: 0, hoist: 1, eff: 1, off: 1.6, luff: false, empty: true,
                   crew: !K.ghost, seed: Math.random() * 10, spec: K.spec, cloth: K.cloth, tint: K.tint } };
        foes.push(o);
      }
      o.tx = e[2]; o.tr = e[3]; o.th = e[4]; o.v = e[5]; o.hp = e[6]; o.max = e[7]; o.state = e[8]; o.sinkT = e[9];
      if (e[10]) o.flash = now;
      o.b.boom = e[11]; o.b.side = e[12]; o.b.hoist = e[13]; o.b.heel = e[14];
      if (Array.isArray(e[15])) {                                   // a monster: what it's doing, for the drawing
        var M = e[15];
        o.t = M[0]; o.slamI = M[1]; o.slamAt = M[2]; o.aim = [M[3], M[4]]; o.hold = !!M[5]; o.under = !!M[6]; o.ang = M[7];
      }
    });
    foes = foes.filter(function (o) { return keep[o.id]; });
    (d.s || []).forEach(function (q) {
      shots.push({ x: q[0], r: q[1], tx: q[2], tr: q[3], t: 0, T: q[4], ghost: !!q[5], holy: !!q[6], harpoon: !!q[7], mirror: true });
      if (!q[7]) puffs.push({ x: q[0], r: q[1], z: 0.4, age: 0, kind: q[5] ? 'ghostflash' : 'smoke' });
      api.sfx(q[7] ? 'harpoon' : q[5] ? 'zap' : 'cannon');
    });
    if (!loopOn) { loopOn = true; last = now; requestAnimationFrame(follow); }
  }
  // the crew's own frames: the foes eased toward where the captain's game has them, the shots played out
  var last = 0;
  function follow(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!api || !captain() || !mir || now - mir.at > 4000) {          // the captain's gone quiet (or you're ashore): it's over here too
      loopOn = false; mir = null; if (captain() || !api) { foes = []; shots = []; puffs = []; } return;
    }
    var k = Math.min(1, dt * 8);
    foes.forEach(function (o) {
      if (typeof o.tx !== 'number') return;
      if (Math.hypot(o.tx - o.x, o.tr - o.r) > 4) { o.x = o.tx; o.r = o.tr; } else { o.x += (o.tx - o.x) * k; o.r += (o.tr - o.r) * k; }
      o.h = wrap(o.h + wrap(o.th - o.h) * k);
      o.b.x = o.x; o.b.r = o.r; o.b.h = o.h; o.b.v = o.v;
      if (o.K.monster) track(o);
    });
    shots.forEach(function (q) {
      q.t += dt;
      if (q.t < q.T || q.done) return;
      q.done = true;
      var b = api.boat(), hit = foes.some(function (o) { return Math.hypot(o.x - q.tx, o.r - q.tr) < o.K.spec.L * 0.5 + 0.45; }) ||
                 (b && Math.hypot(b.x - q.tx, b.r - q.tr) < (api.spec().L || 2.6) * 0.5 + 0.45);
      puffs.push({ x: q.tx, r: q.tr, z: 0, age: 0, kind: hit ? (q.ghost ? 'ghosthit' : 'hit') : 'splash' });
      if (!hit) api.sfx('splash');
    });
    shots = shots.filter(function (q) { return !q.done; });
    puffs = puffs.filter(function (p) { p.age += dt; return p.age < 1.2; });
    requestAnimationFrame(follow);
  }
  // the crew's swivel: the nearest ship that means harm, in range
  function swivelTarget() {
    var b = api && api.boat();
    if (!b || !mir) return null;
    return foes.filter(function (o) { return (hostile(o) || o.state === 'hail' || o.state === 'leave') && o.state !== 'sink' && !o.under && dist(o, b) <= SWIVEL.range; })
      .sort(function (p, q) { return dist(p, b) - dist(q, b); })[0] || null;
  }
  function crewFire() {
    var cap = captain(), n = N(), now = performance.now();
    if (!cap || !n || !mir || now < coolUntil) return false;
    var t = swivelTarget();
    if (!t) { api.say('Nothing in reach of the swivel', 1400); return true; }
    coolUntil = now + SWIVEL.reload * 1000;
    n.send('sf-fire', { id: t.id }, cap.id);
    var b = api.boat();
    puffs.push({ x: b.x, r: b.r, z: 0.5, age: 0, kind: 'smoke' });
    return true;
  }
  function sailing() { return typeof BridgeSloop !== 'undefined' && BridgeSloop.isRunning && BridgeSloop.isRunning(); }
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'f' && e.key !== 'F') || e.repeat) return;
    if (captain() && mir && foes.length) { if (crewFire()) { e.preventDefault(); e.stopPropagation(); } }
    else if (!captain() && api && sailing() && foes.some(hostile)) { if (throwHarpoon()) { e.preventDefault(); e.stopPropagation(); } }
  }, true);
  var fireBtn = null;
  function paintFire() {                                         // on touch: FIRE (the mate's swivel) or HARPOON while there's something to fire at
    var touch = document.documentElement.classList.contains('touch');
    var crewGun = !!(captain() && mir && foes.some(function (o) { return hostile(o) || o.state === 'hail'; }));
    var harp = !captain() && !!api && sailing() && foes.some(hostile);
    var show = touch && (crewGun || harp);
    if (!fireBtn && show) {
      fireBtn = document.createElement('button'); fireBtn.type = 'button'; fireBtn.id = 'sf-fire';
      fireBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); if (captain()) crewFire(); else throwHarpoon(); });
      document.body.appendChild(fireBtn);
    }
    if (fireBtn) { fireBtn.style.display = show ? '' : 'none'; fireBtn.textContent = crewGun ? 'FIRE' : 'HARPOON'; }
  }
  (function wire() {
    var n = N();
    if (!n) return;
    var fromCaptain = function (from) { var c = captain(); return c && c.id === from; };
    n.on('sf', function (d, from) { if (fromCaptain(from)) apply(d); });
    n.on('sf-say', function (d, from) { if (fromCaptain(from) && api && d && d.t) api.say(d.t, d.ms || 3000); });
    n.on('sf-shake', function (d, from) { if (fromCaptain(from) && api) api.shake(); });
    n.on('sf-hail', function (d, from) {
      var c = captain();
      if (!fromCaptain(from) || !api) return;
      api.sfx('bell');
      api.say('Black sails, guns run out: "HEAVE TO!" ' + (c && c.name ? String(c.name).charAt(0) + String(c.name).slice(1).toLowerCase() : 'The captain') + ' answers them', 4200);
    });
    n.on('sf-prize', function (d, from) {
      if (!fromCaptain(from) || !d) return;
      var coins = Math.max(0, Math.round(+d.coins || 0)), K = KINDS[d.kind];
      if (coins && typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(coins, 'sea:crew');
      if (K && K.monster) {                                         // a monster: your share, and trophies of your own
        var got = trophies(K);
        if (K.monster !== 'eel' && typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('At sea', K.title, 'Your share: +' + coins + ' coins' + (got.length ? ' and a trophy' : ''));
        return;
      }
      if (K && typeof BridgeCrown !== 'undefined' && BridgeCrown.noteWin) BridgeCrown.noteWin(K);
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('At sea', K && K.ghost ? 'A drowned ship sent home' : 'Pirates beaten', 'Your share: +' + coins + ' coins');
    });
    n.on('sf-fire', function (d, from) {                          // the captain's game: the mate's swivel goes off
      var c = crew();
      if (!c || c.id !== from || !api || !d) return;
      var b = api.boat(), o = foes.filter(function (q) { return q.id === d.id; })[0];
      if (b && o && o.state !== 'sink' && dist(o, b) <= SWIVEL.range + 1) fire(b, o, SWIVEL, 'crew');
    });
  })();
  setInterval(paintFire, 400);

  // ---- drawing ----------------------------------------------------------------------------------------------------
  function items(now) {
    var out = [];
    foes.forEach(function (o) {
      if (o.K.monster) { out = out.concat(monsterItems(o, now)); return; }
      out.push({ row: o.r, draw: function () {
        var c = api.ctx(), ghost = o.K.ghost, sinking = o.state === 'sink';
        c.save();
        if (ghost) c.globalAlpha = 0.72 + 0.12 * Math.sin(now / 400);
        if (sinking) c.globalAlpha *= Math.max(0, 1 - o.sinkT / 5);
        o.b.bump = o.flash && now - o.flash < 200 ? 0.2 : 0;
        api.drawBoat(now, o.b);
        c.restore();
        if (ghost && !sinking) {                                     // green lanterns fore and aft
          c.save(); c.globalCompositeOperation = 'lighter';
          [-0.4, 0.45].forEach(function (f) {
            var lx = api.sx(o.x + Math.cos(o.h) * o.K.spec.L * f), ly = api.sy(o.r + Math.sin(o.h) * o.K.spec.L * f, 1.1);
            for (var g = 3; g >= 1; g--) { c.fillStyle = 'rgba(110,255,170,' + (0.06 * (4 - g)).toFixed(2) + ')'; c.fillRect(lx - g * 3, ly - g * 3, g * 6, g * 6); }
          });
          c.restore();
        }
        if ((hostile(o) || o.state === 'hail') && !sinking) {        // how much she has left
          var X = api.sx(o.x), Y = api.sy(o.r, 5.2) - 4, w = 26;
          c.fillStyle = 'rgba(6,10,20,0.75)'; c.fillRect(X - w / 2 - 1, Y - 1, w + 2, 4);
          c.fillStyle = ghost ? '#80ffb0' : '#e04838'; c.fillRect(X - w / 2, Y, Math.round(w * Math.max(0, o.hp / o.max)), 2);
        }
      } });
    });
    shots.forEach(function (s) {
      var f = s.t / s.T, x = s.x + (s.tx - s.x) * f, r = s.r + (s.tr - s.r) * f, z = Math.sin(f * Math.PI) * Math.min(1.4, s.T * 1.6) + 0.4;
      out.push({ row: r, draw: function () {
        var c = api.ctx(), X = api.sx(x), Y = api.sy(r, z);
        if (s.harpoon) {                                            // the line paying out behind it, the iron at its head
          var bt = api.boat(), dx = s.tx - s.x, dr = s.tr - s.r, n = Math.hypot(dx, dr) || 1;
          c.strokeStyle = 'rgba(214,200,170,0.7)'; c.lineWidth = 1; c.beginPath();
          c.moveTo(api.sx(bt ? bt.x : s.x) + 0.5, api.sy(bt ? bt.r : s.r, 0.6) + 0.5); c.lineTo(X + 0.5, Y + 0.5); c.stroke();
          c.fillStyle = '#5a4630'; c.fillRect(X - Math.round(dx / n * 4), Y - Math.round(dr / n * 2), 2, 2);
          c.fillStyle = '#d8dce4'; c.fillRect(X - 1, Y - 1, 3, 2);
        }
        else if (s.ghost || s.holy) { c.fillStyle = s.ghost ? '#90ffc0' : '#d8e8ff'; c.fillRect(X - 1, Y - 1, 3, 3); c.fillStyle = 'rgba(160,255,200,0.35)'; c.fillRect(X - 2, Y - 2, 5, 5); }
        else { c.fillStyle = '#141418'; c.fillRect(X - 1, Y - 1, 2, 2); }
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(api.sx(x), api.sy(r, 0), 2, 1);
      } });
    });
    puffs.forEach(function (p) {
      out.push({ row: p.r + 0.01, draw: function () {
        var c = api.ctx(), X = api.sx(p.x), Y = api.sy(p.r, p.z + p.age * 0.8), k = p.age / 1.2;
        if (p.kind === 'smoke') { var rad = 2 + p.age * 9; c.fillStyle = 'rgba(200,196,188,' + (0.5 * (1 - k)).toFixed(2) + ')'; c.fillRect(X - rad, Y - rad * 0.7, rad * 2, rad * 1.4); if (p.age < 0.08) { c.fillStyle = '#ffd070'; c.fillRect(X - 2, Y - 2, 4, 4); } }
        else if (p.kind === 'splash') { var h = Math.round(10 * Math.sin(Math.min(1, k * 2) * Math.PI)); c.fillStyle = 'rgba(230,240,255,0.8)'; c.fillRect(X - 1, api.sy(p.r) - h, 3, h); c.fillRect(X - 3, api.sy(p.r) - 1, 7, 2); }
        else if (p.kind === 'hit' || p.kind === 'ghosthit') { var rr = 3 + p.age * 10; c.fillStyle = p.kind === 'hit' ? 'rgba(255,170,80,' + (0.8 * (1 - k)).toFixed(2) + ')' : 'rgba(140,255,190,' + (0.8 * (1 - k)).toFixed(2) + ')'; c.fillRect(X - rr / 2, Y - rr / 2, rr, rr); c.fillStyle = 'rgba(60,40,30,' + (0.7 * (1 - k)).toFixed(2) + ')'; c.fillRect(X - 1 + p.age * 8, Y - p.age * 10, 2, 2); c.fillRect(X - p.age * 9, Y - p.age * 7, 2, 2); }
        else if (p.kind === 'ghostflash' && p.age < 0.25) { c.fillStyle = 'rgba(140,255,190,0.7)'; c.fillRect(X - 3, Y - 3, 6, 6); }
        else if (p.kind === 'gore') { var gr = 2 + p.age * 8; c.fillStyle = 'rgba(150,220,255,' + (0.8 * (1 - k)).toFixed(2) + ')'; c.fillRect(X - gr / 2, Y - gr / 2, gr, gr); c.fillStyle = 'rgba(200,170,255,' + (0.7 * (1 - k)).toFixed(2) + ')'; c.fillRect(X + p.age * 7, Y - p.age * 9, 2, 2); c.fillRect(X - p.age * 8, Y - p.age * 6, 2, 2); }
        else if (p.kind === 'bigsplash') {                                // a column of water and a ring of foam
          var wy = api.sy(p.r), hh = Math.round(22 * Math.sin(Math.min(1, k * 1.6) * Math.PI)), rw = Math.round(6 + k * 22);
          c.fillStyle = 'rgba(220,235,255,' + (0.85 * (1 - k)).toFixed(2) + ')';
          c.fillRect(X - 3, wy - hh, 7, hh); c.fillRect(X - 6, wy - Math.round(hh * 0.6), 3, Math.round(hh * 0.6)); c.fillRect(X + 4, wy - Math.round(hh * 0.7), 3, Math.round(hh * 0.7));
          c.fillStyle = 'rgba(230,240,255,' + (0.6 * (1 - k)).toFixed(2) + ')'; c.fillRect(X - rw, wy - 1, rw * 2, 2);
        }
      } });
    });
    return out;
  }
  // ---- drawing the monsters: pixel balls on the native grid (outline, shadow side, body, light) -------------------------
  var SERP = ['#05060e', '#14223a', '#2a4866', '#5a8aa8'], SERP_BELLY = '#9cc4c0', SERP_GLOW = '#8ae0ff', FIN = ['#05060e', '#3a2a7a', '#6a4ab8', '#a88af0'];
  var EEL = ['#06061a', '#2a2a7a', '#5a5ad0', '#b0b0ff'], MAW = ['#07040c', '#22102c', '#42204e', '#70407e'], SUCK = '#d8a8c8';
  function disc(c, X, Y, R, col) {
    R = Math.max(1, Math.round(R)); X = Math.round(X); Y = Math.round(Y);
    c.fillStyle = col;
    for (var y = -R; y <= R; y++) { var w = Math.round(Math.sqrt(Math.max(0, R * R - y * y))); c.fillRect(X - w, Y + y, w * 2 + 1, 1); }
  }
  function ball(c, X, Y, R, P, flash) {
    disc(c, X, Y, R + 1, P[0]);
    disc(c, X, Y, R, flash ? '#ffffff' : P[1]);
    if (flash) return;
    disc(c, X - R * 0.15, Y - R * 0.2, R * 0.78, P[2]);
    if (R >= 3) disc(c, X - R * 0.35, Y - R * 0.42, R * 0.34, P[3]);
  }
  function shadow(c, X, Y, R, a) { c.fillStyle = 'rgba(2,4,14,' + a.toFixed(2) + ')'; disc(c, X, Y, R, c.fillStyle); }
  function foam(c, X, Y, w) { c.fillStyle = 'rgba(214,230,255,0.55)'; c.fillRect(Math.round(X - w), Math.round(Y), Math.round(w * 2), 1); }
  // points back along the trail, `gap` tiles apart, starting at the head
  function body(o, n, gap) {
    var tr = o.trail || [], pts = [[o.x, o.r]], lx = o.x, lr = o.r, left = gap;
    for (var j = tr.length - 1; j >= 0 && pts.length <= n; j--) {
      var tx = tr[j][0], tz = tr[j][1], L = Math.hypot(tx - lx, tz - lr);
      while (L >= left && pts.length <= n) { lx += (tx - lx) * left / L; lr += (tz - lr) * left / L; pts.push([lx, lr]); L -= left; left = gap; }
      left -= L; lx = tx; lr = tz;
    }
    while (pts.length <= n) { var p = pts[pts.length - 1]; pts.push([p[0] - Math.cos(o.h) * gap, p[1] - Math.sin(o.h) * gap]); }
    return pts;
  }
  function monsterItems(o, now) {
    var m = o.K.monster, flash = o.flash && now - o.flash < 120;
    if (m === 'serpent') return [{ row: o.r, draw: function () { drawSerpent(api.ctx(), o, now, flash); } }];
    if (m === 'eel') return [{ row: o.r, draw: function () { drawEel(api.ctx(), o, now, flash); } }];
    return krakenItems(o, now, flash);
  }
  function rise(o) {                                              // how far out of the water it is, 0..1
    var S = o.state;
    if (S === 'sink') return Math.max(0, 1 - (o.sinkT || 0) / 2.4);
    if (S === 'rise') return Math.min(1, o.t);
    if (S === 'dive') return Math.max(0, 1 - o.t / 0.6);
    return o.under ? 0 : 1;
  }
  function drawSerpent(c, o, now, flash) {
    var N = 18, pts = body(o, N, 0.32), up = rise(o), S = o.state, segs = [];
    var hz = S === 'rear' ? 0.9 + Math.min(1, o.t / 0.95) * 1.5 : S === 'strike' ? 2.4 * (1 - Math.min(1, o.t / 0.32)) + 0.3 : (0.9 + 0.12 * Math.sin(now / 300)) * up;
    for (var i = N; i >= 1; i--) {
      var arch = Math.sin(now / 380 + i * 0.85), z = up * Math.max(-0.35, arch) * 0.55 * (1 - i / N * 0.45);
      if (S === 'rear' || S === 'strike') z = Math.max(z, (1 - i / 5) * hz);           // the neck lifts the head
      segs.push({ x: pts[i][0], r: pts[i][1], z: z, R: 8.5 * (1 - i / N * 0.6), i: i });
    }
    segs.sort(function (a, b) { return a.r - b.r; });
    if (up < 0.05) {                                               // under: a long pale shape and the wake of it
      segs.forEach(function (g) { shadow(c, api.sx(g.x), api.sy(g.r, 0), g.R + 1, 0.32); if (g.i % 3 === 0) { c.fillStyle = 'rgba(138,224,255,0.35)'; c.fillRect(Math.round(api.sx(g.x)), Math.round(api.sy(g.r, 0)), 1, 1); } });
      shadow(c, api.sx(o.x), api.sy(o.r, 0), 11, 0.36);
      return;
    }
    segs.forEach(function (g) {
      var X = api.sx(g.x), Yw = api.sy(g.r, 0);
      if (g.z <= 0.02) { shadow(c, X, Yw, g.R, 0.28); return; }
      var Y = api.sy(g.r, g.z);
      ball(c, X, Y, g.R, SERP, flash);
      if (!flash) {
        c.fillStyle = SERP_BELLY; c.fillRect(Math.round(X - g.R * 0.5), Math.round(Y + g.R * 0.45), Math.max(1, Math.round(g.R)), 1);
        if (g.i % 2 === 0) { c.fillStyle = SERP_GLOW; c.fillRect(Math.round(X + 1), Math.round(Y - 1), 1, 1); }
        if (g.i % 3 === 1 && g.R > 3) { c.fillStyle = FIN[0]; c.fillRect(Math.round(X - 2), Math.round(Y - g.R - 5), 4, 6); c.fillStyle = FIN[2]; c.fillRect(Math.round(X - 1), Math.round(Y - g.R - 4), 2, 5); c.fillStyle = FIN[3]; c.fillRect(Math.round(X - 1), Math.round(Y - g.R - 5), 1, 2); }
      }
      if (g.z < 0.18) foam(c, X, Yw, g.R + 2);
    });
    // the head: a skull with a long snout, frills behind, eyes that glow
    var X0 = api.sx(o.x), Y0 = api.sy(o.r, hz), fx = Math.cos(o.h), fr = Math.sin(o.h);
    var SX = api.sx(o.x + fx * 0.34), SY = api.sy(o.r + fr * 0.34, hz - 0.05);
    for (var k = 0; k < 3; k++) { c.fillStyle = FIN[0]; c.fillRect(Math.round(X0 - fx * 9 + (k - 1) * 5) - 1, Math.round(Y0 - 14 - k * 2), 4, 9); c.fillStyle = FIN[k + 1]; c.fillRect(Math.round(X0 - fx * 9 + (k - 1) * 5), Math.round(Y0 - 13 - k * 2), 2, 8); }
    ball(c, X0, Y0, 10, SERP, flash);
    ball(c, SX, SY, 6.5, SERP, flash);
    var open = S === 'rear' || S === 'strike';
    if (open && !flash) {                                           // the jaws wide: red, and a row of teeth
      c.fillStyle = '#05060e'; c.fillRect(Math.round(SX - 7), Math.round(SY + 1), 15, 8);
      c.fillStyle = '#5a1020'; c.fillRect(Math.round(SX - 6), Math.round(SY + 2), 13, 6);
      c.fillStyle = '#e8f0f0'; for (var t = 0; t < 6; t++) { c.fillRect(Math.round(SX - 5 + t * 2), Math.round(SY + 2), 1, 2); c.fillRect(Math.round(SX - 5 + t * 2), Math.round(SY + 6), 1, 2); }
    }
    if (!flash) {
      c.fillStyle = '#d8ffff'; c.fillRect(Math.round(X0 + fx * 4 - 5), Math.round(Y0 - 4), 3, 2); c.fillRect(Math.round(X0 + fx * 4 + 3), Math.round(Y0 - 4), 3, 2);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(138,224,255,0.25)';
      c.fillRect(Math.round(X0 + fx * 4 - 8), Math.round(Y0 - 7), 17, 7); c.restore();
    }
    if (hz < 0.25) foam(c, X0, api.sy(o.r, 0), 12);
    bar(c, o, X0, Y0 - 24, '#8ae0ff');
  }
  function drawEel(c, o, now, flash) {
    var pts = body(o, 5, 0.13), up = o.state === 'sink' ? rise(o) : o.under ? 0 : 1, sw = Math.sin(now / 90 + o.id);
    if (up < 0.05) {                                               // a light under the water
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(150,140,255,0.35)'; c.fillRect(Math.round(api.sx(o.x)) - 2, Math.round(api.sy(o.r, 0)) - 1, 5, 3);
      c.restore(); return;
    }
    for (var i = pts.length - 1; i >= 0; i--) {
      var p = pts[i], wig = Math.sin(now / 110 + i * 1.3 + o.id) * 0.06 * i;
      var X = api.sx(p[0] - Math.sin(o.h) * wig), Y = api.sy(p[1] + Math.cos(o.h) * wig, 0.12 * up), R = i ? 3.4 - i * 0.4 : 4;
      ball(c, X, Y, R, EEL, flash);
    }
    var hx = api.sx(o.x), hy = api.sy(o.r, 0.12);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(176,160,255,' + (0.3 + 0.15 * sw).toFixed(2) + ')'; c.fillRect(Math.round(hx) - 4, Math.round(hy) - 4, 9, 8);
    c.restore();
    c.fillStyle = '#ffffff'; c.fillRect(Math.round(hx), Math.round(hy) - 1, 1, 1);
    foam(c, hx, api.sy(o.r, 0) + 1, 4);
  }
  function krakenItems(o, now, flash) {
    var b = api.boat(), up = rise(o), out = [];
    if (!b) return out;
    if (o.state === 'sound' || o.state === 'lurk' || up < 0.05) {     // something vast and dark under you, and bubbles
      out.push({ row: o.r - 6, draw: function () {
        var c = api.ctx(), X = api.sx(o.x), Y = api.sy(o.r, 0);
        c.fillStyle = 'rgba(2,2,10,0.28)';
        for (var y = -14; y <= 14; y++) { var w = Math.round(Math.sqrt(196 - y * y) * 2.4); c.fillRect(Math.round(X - w), Math.round(Y + y), w * 2, 1); }
        for (var i = 0; i < 5; i++) { var a = now / 700 + i * 1.3; c.fillStyle = 'rgba(200,220,255,0.5)'; c.fillRect(Math.round(X + Math.cos(a) * 18), Math.round(Y + Math.sin(a * 1.3) * 8 - ((now / 20 + i * 9) % 12)), 1, 1); }
      } });
      return out;
    }
    // six arms round the boat: two wrapped over the hull while it holds you, the others swaying, one rearing to slam
    var base = o.id * 1.3;
    for (var i = 0; i < 6; i++) (function (i) {
      var a = base + i * Math.PI / 3, bx = b.x + Math.cos(a) * 2.3, br = b.r + Math.sin(a) * 2.3;
      out.push({ row: br, draw: function () { drawArm(api.ctx(), o, i, bx, br, b, now, up, flash); } });
    })(i);
    out.push({ row: o.r, draw: function () { drawMaw(api.ctx(), o, now, up, flash); } });
    return out;
  }
  function drawArm(c, o, i, bx, br, b, now, up, flash) {
    var hold = o.hold && i < 2, slam = o.slamI === i, n = 22, s = o.slamAt || 0;
    var tx, tr, H;
    if (hold) { tx = b.x + (bx - b.x) * -0.3; tr = b.r + (br - b.r) * -0.3; H = 0.9; }          // over the hull and down the far side
    else if (slam) {
      var aim = o.aim || [b.x, b.r];
      if (s < 1.0) { var back = s; tx = bx + (bx - aim[0]) * 0.4 * back; tr = br + (br - aim[1]) * 0.4 * back; H = 0.9 + back * 2.2; }
      else { var f = Math.min(1, (s - 1.0) / 0.12); tx = bx + (aim[0] - bx) * f; tr = br + (aim[1] - br) * f; H = 3.1 * (1 - f) + 0.15; }
    } else { var sw = Math.sin(now / 520 + i * 1.7); tx = bx + Math.cos(now / 800 + i) * 0.5; tr = br + sw * 0.4; H = 1.1 + 0.4 * sw; }
    H *= up;
    for (var k = 0; k <= n; k++) {
      var t = k / n, x = bx + (tx - bx) * t, r = br + (tr - br) * t, z = Math.sin(Math.min(1, t * 1.1) * Math.PI * (hold ? 0.62 : 0.9)) * H;
      if (hold && t > 0.6) z = Math.max(0.35, z);
      var X = api.sx(x), Y = api.sy(r, z), R = 6.2 - t * 4.6;
      if (k === 0) { foam(c, X, api.sy(r, 0), 7); }
      ball(c, X, Y, R, MAW, flash);
      if (!flash && k % 3 === 1 && R > 2) { c.fillStyle = SUCK; c.fillRect(Math.round(X - 1), Math.round(Y + R * 0.45), 2, 2); }
    }
  }
  function drawMaw(c, o, now, up, flash) {
    var X = api.sx(o.x), Yw = api.sy(o.r, 0), z = 0.35 * up, Y = api.sy(o.r, z);
    shadow(c, X, Yw + 3, 28, 0.3);
    ball(c, X, Y, 22, MAW, flash);                                  // the mantle, rising out of the sea
    ball(c, X + 3, api.sy(o.r, z + 1.0 * up), 18, MAW, flash);
    ball(c, X + 6, api.sy(o.r, z + 1.8 * up), 12, MAW, flash);
    if (!flash) {
      var blink = (now / 3000 % 1) < 0.04, ey = Math.round(Y - 4);
      disc(c, X - 7, ey, 9, '#07040c');
      if (!blink) { disc(c, X - 7, ey, 8, '#e8ff90'); disc(c, X - 9, ey - 2, 3, '#ffffd8'); c.fillStyle = '#101008'; c.fillRect(Math.round(X - 8), ey - 6, 3, 13); }
      else { c.fillStyle = '#e8ff90'; c.fillRect(Math.round(X - 15), ey, 17, 2); }
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(232,255,144,0.18)'; c.fillRect(Math.round(X - 19), ey - 12, 25, 24); c.restore();
      c.fillStyle = 'rgba(200,170,220,0.6)'; for (var i = 0; i < 8; i++) c.fillRect(Math.round(X - 18 + i * 5), Math.round(Y + 12 + (i % 2)), 2, 1);
    }
    foam(c, X, Yw, 28);
    bar(c, o, X, api.sy(o.r, z + 1.8 * up) - 18, '#e8ff90');
  }
  function bar(c, o, X, Y, col) {                                  // how much it has left, while it's at you
    if (o.state === 'sink' || o.under || !hostile(o)) return;
    var w = 30;
    c.fillStyle = 'rgba(6,10,20,0.75)'; c.fillRect(Math.round(X - w / 2 - 1), Math.round(Y - 1), w + 2, 4);
    c.fillStyle = col; c.fillRect(Math.round(X - w / 2), Math.round(Y), Math.round(w * Math.max(0, o.hp / o.max)), 2);
  }

  /** On the screen layer: your hull while it matters, and what's out there. */
  var MSAY = { stalk: 'CIRCLING BELOW', rise: 'SURFACING', coil: 'UP - HARPOON IT', rear: 'REARING TO STRIKE', strike: 'STRIKING', dive: 'DIVING',
               swim: 'CLOSING', latch: 'ON THE HULL', sound: 'RISING UNDER YOU' };
  function hud(ctx, s, W) {
    var f = F(), sh = ship();
    if (!f || !sh || !api) return;
    var foe = foes.filter(function (o) { return hostile(o) || o.state === 'hail' || o.state === 'approach'; })
      .sort(function (p, q) { return (q.K.monster === 'eel' ? 0 : q.max) - (p.K.monster === 'eel' ? 0 : p.max); })[0];
    var hull = captain() ? (mir ? mir.hull : 1) : sh.hull;          // aboard theirs: their hull
    if (!foe && hull > 0.995) return;
    var w = Math.round(170 * s), h = Math.round(8 * s), x = Math.round(W - w - 34 * s), y = Math.round(40 * s);   // top right, clear of the messages
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(x - 8 * s, y - 16 * s, w + 16 * s, foe ? 58 * s : 30 * s);
    ctx.font = Math.round(9 * s) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8d0e0'; ctx.fillText('HULL', x, y - 7 * s);
    ctx.fillStyle = '#2a3040'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hull > 0.5 ? '#60d080' : hull > 0.25 ? '#e0c060' : '#e04838'; ctx.fillRect(x, y, Math.round(w * hull), h);
    if (foe) {
      ctx.fillStyle = foe.K.ghost ? '#90ffc0' : foe.K.monster ? '#a8d8ff' : '#f08070';
      var st = foe.state === 'chase' ? 'GIVING CHASE' : foe.state === 'hail' ? 'HAILING YOU' : foe.state === 'approach' ? 'CLOSING' : 'ENGAGED';
      if (foe.K.monster) st = MSAY[foe.state] || st;
      if (foe.kind === 'eel') { var ne = foes.filter(function (q) { return q.kind === 'eel' && hostile(q); }).length, nl = foes.filter(function (q) { return q.kind === 'eel' && q.state === 'latch'; }).length; st = ne + ' ' + (nl ? '· ' + nl + ' ON THE HULL' : 'CLOSING'); }
      if (foe.K.monster === 'kraken' && foe.state === 'grip') st = foe.hold ? 'GRIPPING YOUR HULL' : 'YOU\'RE FREE - GET CLEAR';
      ctx.fillText(foe.K.name.toUpperCase() + ' · ' + st, x, y + h + 10 * s);
      if (!captain() && !document.documentElement.classList.contains('touch')) {     // your harpoon
        var hr = performance.now() >= harpoonUntil, ht = !!harpoonTarget();
        ctx.fillStyle = hr && ht ? '#ffe080' : '#7a8090';
        ctx.fillText(hr ? (ht ? 'F · THROW THE HARPOON' : foe.under ? 'HARPOON · IT\'S UNDER' : 'HARPOON · OUT OF REACH') : 'HARPOON · COILING THE LINE', x, y + h + 22 * s);
      }
      if (captain() && !document.documentElement.classList.contains('touch')) {     // the crew's gun
        var ready = performance.now() >= coolUntil, inR = !!swivelTarget();
        ctx.fillStyle = ready && inR ? '#ffe080' : '#7a8090';
        ctx.fillText(ready ? (inR ? 'F · FIRE THE SWIVEL' : 'SWIVEL · OUT OF RANGE') : 'SWIVEL · RELOADING', x, y + h + 22 * s);
      }
    }
    ctx.restore();
  }

  return { reset: reset, plan: plan, update: update, items: items, hud: hud, busy: busy, _foes: function () { return foes; },
           _spawn: function (kind) {
             var b = api && api.boat();
             if (!b) return;
             if (KINDS[kind] && KINDS[kind].monster) spawnMonster(kind, b.x + Math.cos(b.h) * 14, b.r + Math.sin(b.h) * 14);
             else spawn(kind, b.x + Math.cos(b.h) * 14, b.r + Math.sin(b.h) * 14, b.h + Math.PI);
           },
           _harpoon: function () { return throwHarpoon(); } };
})();
