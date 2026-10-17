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
 * plain iron barely. A hull battered to nothing founders: salvors tow her into the nearest port, her hold lost
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
  var CHANCE = { emerald: 0.1, sapphire: 0.22, rose: 0.2, crimson: 0.45, midnight: 0.55 };
  var BLACK = ['#3e383c', '#2c2629', '#1c1619'], GHOST = ['#b8d8c8', '#90b0a0', '#68887a'];
  var FOE_GUNS = {
    swivel: { dmg: 4, range: 5, reload: 1.8, arc: 'side' }, long_nine: { dmg: 9, range: 8, reload: 3.4, arc: 'side' },
    carronade: { dmg: 16, range: 4.5, reload: 4.4, arc: 'side' }, chaser: { dmg: 7, range: 9, reload: 3.0, arc: 'bow' },
    ghostfire: { dmg: 6, range: 7, reload: 2.8, arc: 'side', ghost: true }
  };
  var KINDS = {
    cutter:  { name: 'a pirate cutter', spec: { L: 3.4, beam: 1.25, sheet: 'cutter', vmax: 4.5, nogo: 0.72, turn: 0.95 }, hull: 55,
               guns: ['swivel', 'swivel', 'chaser'], fighters: 3, loot: [70, 170], cargo: ['ember_rum', 'salt_fish'], cloth: BLACK, tint: 'rgba(24,14,16,0.62)' },
    raider:  { name: 'a pirate raider', spec: { L: 4.4, beam: 1.3, sheet: 'raider', vmax: 5.0, nogo: 0.74, turn: 0.85 }, hull: 105,
               guns: ['long_nine', 'long_nine', 'carronade', 'chaser'], fighters: 5, loot: [160, 340], cargo: ['blackpowder', 'ember_rum'], cloth: BLACK, tint: 'rgba(40,8,10,0.25)' },
    drowned: { name: 'a drowned ship', spec: { L: 5.0, beam: 1.6, sheet: 'brigantine', vmax: 3.9, nogo: 0.9, turn: 0.6 }, hull: 120,
               guns: ['ghostfire', 'ghostfire', 'ghostfire'], fighters: 6, loot: [120, 280], cargo: ['moon_salt'], cloth: GHOST, ghost: true, tint: 'rgba(150,220,190,0.55)' }
  };

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
  function reset(a) { api = a; foes = []; shots = []; puffs = []; gunT = []; asked = false; out = []; mir = null; }
  /** You've set a course: will anything come for you on the way? */
  function plan() {
    if (!api || foes.length) return;
    var A = api.A(), B = api.B(), b = api.boat();
    if (!A || !B || !b) return;
    var seas = [A.pal, B.pal], midnight = seas.indexOf('midnight') >= 0;
    var p = Math.max(CHANCE[A.pal] || 0.1, CHANCE[B.pal] || 0.1), rich = holdValue(B.id);
    if (!midnight) p = Math.min(0.85, p + Math.min(0.25, rich / 2500));
    if (api.blessed && api.blessed()) p *= 0.5;                        // a candle at St Brendan's: they think twice
    if (typeof BridgeWeather !== 'undefined' && BridgeWeather.pirates) p *= BridgeWeather.pirates();   // a storm keeps them in port
    if (api.rand() > p) return;
    var kind = midnight ? 'drowned' : seas.indexOf('crimson') >= 0 ? (api.rand() < 0.6 ? 'raider' : 'cutter') : (api.rand() < 0.15 ? 'raider' : 'cutter');
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
  function hostile(o) { return o.state === 'fight' || o.state === 'chase' || o.state === 'hunt'; }
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
    foes.forEach(function (o) {
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
    var guns = sp.guns || [], targets = foes.filter(function (o) { return hostile(o) || o.state === 'leave' && o.hp < o.max; });
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
      var tgt = s.at, hit = tgt && Math.hypot(tgt.x - s.tx, tgt.r - s.tr) < (tgt === b ? (sp.L || 2.6) : tgt.K.spec.L) * 0.5 + 0.45;
      if (hit && tgt === b) hurtYou(s.dmg, s.ghost);
      else if (hit) hurtThem(tgt, s.dmg * (tgt.K.ghost ? (s.holy ? 2 : 0.6) : 1));
      puffs.push({ x: s.tx, r: s.tr, z: 0, age: 0, kind: hit ? (s.ghost ? 'ghosthit' : 'hit') : 'splash' });
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
    shots.push({ x: ox, r: or, tx: tx, tr: tr, t: 0, T: Math.max(0.25, d / 14), dmg: g.dmg, at: to, holy: !!g.holy, ghost: !!g.ghost, who: who });
    if (crew()) out.push([r2(ox), r2(or), r2(tx), r2(tr), r2(Math.max(0.25, d / 14)), g.ghost ? 1 : 0, g.holy ? 1 : 0]);   // for the crew to see
    puffs.push({ x: ox, r: or, z: 0.4, age: 0, kind: g.ghost ? 'ghostflash' : 'smoke' });
    api.sfx(g.ghost ? 'zap' : 'cannon');
  }
  function hurtYou(dmg, ghost) {
    var f = F(), s = ship();
    if (!f || !s) return;
    var left = f.damage(s.id, dmg);
    api.shake(); tellCrew('sf-shake', {});
    if (++msgs % 3 === 1) say(ghost ? 'Green fire splashes across the deck - the planks blacken with frost' : 'A ball smashes through the bulwark! Hull at ' + Math.round(left * 100) + '%', 2200);
    if (left <= 0) api.wreck('The ' + s.name + ' is holed below the waterline and settles by the head');
  }
  function hurtThem(o, dmg) {
    if (o.state === 'sink') return;
    o.hp -= dmg;
    o.flash = performance.now();
    if (o.hp <= 0) sink(o);
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
      return [o.id, o.kind, r2(o.x), r2(o.r), r2(o.h), r2(o.v), Math.round(o.hp), o.max, o.state, r2(o.sinkT || 0), o.flash && now - o.flash < 200 ? 1 : 0, r2(o.b.boom), o.b.side, r2(o.b.hoist), r2(o.b.heel)];
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
    });
    foes = foes.filter(function (o) { return keep[o.id]; });
    (d.s || []).forEach(function (q) {
      shots.push({ x: q[0], r: q[1], tx: q[2], tr: q[3], t: 0, T: q[4], ghost: !!q[5], holy: !!q[6], mirror: true });
      puffs.push({ x: q[0], r: q[1], z: 0.4, age: 0, kind: q[5] ? 'ghostflash' : 'smoke' });
      api.sfx(q[5] ? 'zap' : 'cannon');
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
    return foes.filter(function (o) { return (hostile(o) || o.state === 'hail' || o.state === 'leave') && o.state !== 'sink' && dist(o, b) <= SWIVEL.range; })
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
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'f' || e.key === 'F') && !e.repeat && captain() && mir && foes.length) { if (crewFire()) { e.preventDefault(); e.stopPropagation(); } }
  }, true);
  var fireBtn = null;
  function paintFire() {                                         // on touch: a FIRE button while there's a fight to fire at
    var show = !!(captain() && mir && foes.some(function (o) { return hostile(o) || o.state === 'hail'; })) && document.documentElement.classList.contains('touch');
    if (!fireBtn && show) {
      fireBtn = document.createElement('button'); fireBtn.type = 'button'; fireBtn.id = 'sf-fire'; fireBtn.textContent = 'FIRE';
      fireBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); crewFire(); });
      document.body.appendChild(fireBtn);
    }
    if (fireBtn) fireBtn.style.display = show ? '' : 'none';
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
        if (s.ghost || s.holy) { c.fillStyle = s.ghost ? '#90ffc0' : '#d8e8ff'; c.fillRect(X - 1, Y - 1, 3, 3); c.fillStyle = 'rgba(160,255,200,0.35)'; c.fillRect(X - 2, Y - 2, 5, 5); }
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
      } });
    });
    return out;
  }
  /** On the screen layer: your hull while it matters, and what's out there. */
  function hud(ctx, s, W) {
    var f = F(), sh = ship();
    if (!f || !sh || !api) return;
    var foe = foes.filter(function (o) { return hostile(o) || o.state === 'hail' || o.state === 'approach'; })[0];
    var hull = captain() ? (mir ? mir.hull : 1) : sh.hull;          // aboard theirs: their hull
    if (!foe && hull > 0.995) return;
    var w = Math.round(170 * s), h = Math.round(8 * s), x = Math.round(W - w - 34 * s), y = Math.round(40 * s);   // top right, clear of the messages
    ctx.save();
    ctx.fillStyle = 'rgba(6,10,20,0.72)'; ctx.fillRect(x - 8 * s, y - 16 * s, w + 16 * s, foe ? (captain() ? 58 : 46) * s : 30 * s);
    ctx.font = Math.round(9 * s) + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8d0e0'; ctx.fillText('HULL', x, y - 7 * s);
    ctx.fillStyle = '#2a3040'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hull > 0.5 ? '#60d080' : hull > 0.25 ? '#e0c060' : '#e04838'; ctx.fillRect(x, y, Math.round(w * hull), h);
    if (foe) {
      ctx.fillStyle = foe.K.ghost ? '#90ffc0' : '#f08070';
      var st = foe.state === 'chase' ? 'GIVING CHASE' : foe.state === 'hail' ? 'HAILING YOU' : foe.state === 'approach' ? 'CLOSING' : 'ENGAGED';
      ctx.fillText(foe.K.name.toUpperCase() + ' · ' + st, x, y + h + 10 * s);
      if (captain() && !document.documentElement.classList.contains('touch')) {     // the crew's gun
        var ready = performance.now() >= coolUntil, inR = !!swivelTarget();
        ctx.fillStyle = ready && inR ? '#ffe080' : '#7a8090';
        ctx.fillText(ready ? (inR ? 'F · FIRE THE SWIVEL' : 'SWIVEL · OUT OF RANGE') : 'SWIVEL · RELOADING', x, y + h + 22 * s);
      }
    }
    ctx.restore();
  }

  return { reset: reset, plan: plan, update: update, items: items, hud: hud, busy: busy, _foes: function () { return foes; },
           _spawn: function (kind) { var b = api && api.boat(); if (b) spawn(kind, b.x + Math.cos(b.h) * 14, b.r + Math.sin(b.h) * 14, b.h + Math.PI); } };
})();
