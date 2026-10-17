/**
 * BridgeTransit — getting round Arcadia: the express lifts, the air cabs and the Loop.
 *
 * Beck: "the skytrain, express lifts, and stuff like that". Arcadia is a vertical city, ritzier as you go up, and these
 * are the ways between its levels and across them. Everything reads assets/arcadia-lifts.json (levels, the Map's places,
 * the lift shafts and their lobbies, the Loop's stations, the cab pads — see apps/bridge/CLAUDE.md, *Getting around
 * Arcadia*); a world's interactions name what they are:
 *
 *   express_lift { shaft, lobby }   a lift lobby: pick a floor, ride up or down with the floor numbers rolling past
 *   air_cab      { pad }            a cab rank: pick a pad, pay the fare, fly there between the towers
 *   loop_station { station }        the Loop's platform: board the sky train (js/transit.js runs the carriage, below)
 *   loop_doors / loop_map           in the carriage (arcadia-loop): step off when she's in, the route map
 *
 * The lift and the cab are a ride over the world (#transit-ride: a native canvas scaled by a whole number, the city's
 * own rendered layers from js/skyline.js through the glass, the level you're passing by name), then the world at the
 * other end. The Loop is a place you sit in: arcadia-loop's windows show the skyline streaming past at speed
 * (BridgeSkyline.setMotion('loop', …)), the train runs station to station round the ring, and at each stop the doors
 * open for a while — step off at the doors, or stay on. Its train also crosses the District on its viaduct every few
 * minutes (a world with a skyline `loop` block: the neon street), the same moment for everyone (the clock).
 *
 *   BridgeTransit.ready(fn) / data() / level(id) / levelOf(floor) / tag(floor) / placeName(world)
 *   BridgeTransit.ride(spec, done)   spec { kind: 'lift' | 'cab', from, to, title }  (floors / levels; tests and previews)
 *   BridgeTransit._trip()            the Loop journey now (tests)
 */
var BridgeTransit = (function () {
  var D = null, waiting = [];
  var EMPTY = { levels: [], places: {}, shafts: {}, loop: { stations: [] }, cabs: { pads: [] } };
  fetch('/bridge/assets/arcadia-lifts.json?v=' + Date.now()).then(function (r) { return r.json(); })
    .then(function (d) { D = d; }).catch(function () { D = EMPTY; })
    .then(function () { var w = waiting; waiting = []; w.forEach(function (f) { f(); }); });
  function ready(fn) { if (D) fn(); else waiting.push(fn); }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function say(title, text) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(title, text); }
  function here() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : null; }

  // ---- the city's levels -----------------------------------------------------------------------------------------------
  function level(id) { return (D && D.levels || []).filter(function (l) { return l.id === id; })[0] || null; }
  function levelOf(floor) {                                   // the level a floor's in (or the nearest)
    var best = null, bd = 1e9;
    (D && D.levels || []).forEach(function (l) {
      var d = floor < l.floors[0] ? l.floors[0] - floor : floor > l.floors[1] ? floor - l.floors[1] : 0;
      if (d < bd) { bd = d; best = l; }
    });
    return best;
  }
  function inLevel(floor) {                                  // the level a floor is inside (or the smog between the Mid-Levels and the Spires)
    var hit = (D && D.levels || []).filter(function (l) { return floor >= l.floors[0] && floor <= l.floors[1]; })[0];
    if (hit) return hit;
    var S = level('spires'), M = level('midlevels');
    return S && M && floor > M.floors[1] + 20 && floor < S.floors[0] - 10 ? SMOG : null;
  }
  var SMOG = { id: 'smog', name: 'Through the smog', tag: '' };
  function tag(floor) { return floor < 0 ? 'B' + (-floor) : 'FL ' + floor; }
  function placeName(world) {
    var p = D && D.places && D.places[world];
    if (p && p.name) return p.name;
    return typeof BridgeMap !== 'undefined' && BridgeMap.placeName ? BridgeMap.placeName(world) : world;
  }
  // a stop is only offered once its place is in the game (a lobby another workstream hasn't built yet stays dark)
  function built(world) {
    var A = typeof BridgeMap !== 'undefined' && BridgeMap.atlas ? BridgeMap.atlas() : null;
    return !A || !A.worlds || !!A.worlds[world];
  }

  // ---- express lifts ---------------------------------------------------------------------------------------------------
  function useLift(inter) {
    ready(function () {
      var S = D.shafts && D.shafts[inter.shaft];
      var me = S && S.lobbies.filter(function (l) { return l.id === inter.lobby; })[0];
      if (!S || !me) return say(inter.label || 'LIFT', 'THE DOORS STAY SHUT. OUT OF SERVICE.');
      var stops = S.lobbies.filter(function (l) { return built(l.world); }).slice().sort(function (a, b) { return b.floor - a.floor; });
      var L = levelOf(me.floor);
      BridgeInteractions.choose({
        title: S.name,
        text: (L ? L.tag + ' · ' + L.name + ' · ' : '') + tag(me.floor) + '. Where to?',
        rows: stops.map(function (l) {
          var lv = levelOf(l.floor), mine = l === me;
          return { label: placeName(l.world), sub: mine ? 'You\'re here' : (lv ? lv.name : ''), note: tag(l.floor), disabled: mine, draw: arrow(l.floor - me.floor),
                   pick: function () { rideLift(S, me, l); } };
        }),
        closeLabel: 'Stay here'
      });
    });
  }
  function arrow(d) {                                          // a little up or down arrow on the floor's row
    return function (g, s) {
      var u = s / 12, up = d > 0;
      g.fillStyle = d === 0 ? '#7c7468' : up ? '#80e0e8' : '#f078a8';
      for (var i = 0; i < 5; i++) g.fillRect(Math.round((6 - i) * u), Math.round((up ? 3 + i : 8 - i) * u), Math.round((1 + 2 * i) * u), Math.round(u));
      g.fillRect(Math.round(5 * u), Math.round((up ? 8 : 1) * u), Math.round(3 * u), Math.round(3 * u));
    };
  }
  function rideLift(S, a, b) {
    sfx('ding');
    ride({ kind: 'lift', from: a.floor, to: b.floor, title: S.name, dest: placeName(b.world), shaft: S }, function () {
      arrive(b.world, b.spawn);
    });
  }

  // ---- air cabs --------------------------------------------------------------------------------------------------------
  function padLevel(p) { return level(p.level) || (D.places[p.world] && level(D.places[p.world].level)) || null; }
  function fare(a, b) {                                        // a hop along a level is cheap; up to the Spires isn't
    var ia = D.levels.indexOf(padLevel(a)), ib = D.levels.indexOf(padLevel(b));
    return 12 + Math.abs(ia - ib) * 6 + (ia === 0 || ib === 0 ? 10 : 0);
  }
  function useCab(inter) {
    ready(function () {
      var pads = D.cabs && D.cabs.pads || [], me = pads.filter(function (p) { return p.id === inter.pad; })[0];
      if (!me) return say(inter.label || 'AIR CAB', 'THE RANK\'S EMPTY. NO CABS TONIGHT.');
      var others = pads.filter(function (p) { return p !== me && built(p.world); });
      if (!others.length) return say(inter.label || 'AIR CAB', 'A CAB DRIFTS DOWN, THE DRIVER LEANS OUT, LOOKS AT HIS SCREEN AND SHAKES HIS HEAD. "NOWHERE I CAN TAKE YOU FROM HERE YET."');
      BridgeInteractions.choose({
        title: 'Air cab', text: 'A cab drops out of the traffic lane and hovers at the kerb. "Where to?"',
        rows: others.map(function (p) {
          var L = padLevel(p), f = fare(me, p);
          return { label: p.name, sub: L ? L.tag + ' · ' + L.name : '', note: f + ' coins', pick: function () { hail(me, p, f); } };
        }),
        closeLabel: 'Not now'
      });
    });
  }
  function hail(a, b, f) {
    var P = typeof BridgeProgression !== 'undefined' ? BridgeProgression : null;
    var go = function () {
      sfx('cab');
      var La = padLevel(a), Lb = padLevel(b);
      ride({ kind: 'cab', from: La ? (La.floors[0] + La.floors[1]) / 2 : 0, to: Lb ? (Lb.floors[0] + Lb.floors[1]) / 2 : 0, title: 'Air cab', dest: b.name }, function () {
        arrive(b.world, b.spawn);
      });
    };
    if (!P || !P.wagerCoins) return go();
    P.wagerCoins(f, 'transit:cab').then(function (r) {
      if (r && r.ok) go();
      else say('AIR CAB', r && (r.reason === 'insufficient' || r.reason === 'no_balance') ? 'THE DRIVER TAPS THE METER. "' + f + ' UP FRONT, FRIEND." YOU\'RE SHORT.' : 'THE CAB\'S READER WON\'T TAKE YOUR COIN. TRY AGAIN IN A MINUTE.');
    });
  }

  function arrive(world, spawn) {                            // the glass goes dark, the world loads under its own fade
    if (R) R.el.classList.add('out');
    setTimeout(function () {
      if (typeof BridgeWorld !== 'undefined') BridgeWorld.enterWorld(world, spawn);
      setTimeout(closeRide, 280);
    }, 220);
  }

  // ---- the ride: a lift car's glass, a cab's window ------------------------------------------------------------------------
  // Drawn into a small native canvas (NW × NH) and scaled up by a whole number. The city through the glass is the
  // skyline's own rendered layers (js/skyline.js), moved by the ride — up and down for a lift, across for a cab — with
  // the near towers' faces whipping past, the smog between the Mid-Levels and the Spires, stars above it, and below the
  // street the shaft's concrete and sodium lamps.
  var NW = 320, NH = 180, PXF = 2.2;                           // native size; px a floor
  var R = null;                                                // the ride now
  function ride(spec, done) {
    closeRide();
    var el = document.createElement('div');
    el.id = 'transit-ride';
    el.className = 'tr-' + spec.kind;
    el.innerHTML = '<canvas class="tr-cv" width="' + NW + '" height="' + NH + '"></canvas>' +
      '<div class="tr-hud"><div class="tr-title"></div><div class="tr-dest"></div></div><div class="tr-level"></div>' +
      '<div class="tr-skip"><span class="ip-key">Space</span> skip</div>';
    document.body.appendChild(el);
    el.querySelector('.tr-title').textContent = spec.title || '';
    el.querySelector('.tr-dest').textContent = spec.dest ? '→ ' + spec.dest : '';
    var dist = Math.abs(spec.to - spec.from);
    var T = spec.kind === 'lift' ? Math.max(2400, Math.min(8200, 1800 + dist * 11)) : Math.max(5200, Math.min(9000, 4600 + dist * 6));
    R = { spec: spec, el: el, cv: el.querySelector('.tr-cv'), t0: performance.now(), T: T, doors: spec.kind === 'lift' ? 650 : 500, done: done,
          lvl: null, ended: false, seed: Math.floor(Math.random() * 1e6) };
    R.g = R.cv.getContext('2d');
    R.g.imageSmoothingEnabled = false;
    fit();
    if (typeof BridgeControls !== 'undefined' && BridgeControls.disable) BridgeControls.disable();
    if (typeof BridgeSkyline !== 'undefined') BridgeSkyline.load();
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('click', skip);
    requestAnimationFrame(frame);
    requestAnimationFrame(function () { el.classList.add('on'); });
  }
  function fit() {
    if (!R) return;
    var dpr = window.devicePixelRatio || 1, W = window.innerWidth * dpr, H = window.innerHeight * dpr;
    var s = Math.max(1, Math.floor(Math.min(W / NW, H / NH)));
    R.cv.style.width = (NW * s / dpr) + 'px';
    R.cv.style.height = (NH * s / dpr) + 'px';
  }
  window.addEventListener('resize', fit);
  function onKey(e) {
    if (!R) return;
    if (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') { e.preventDefault(); e.stopPropagation(); skip(); }
  }
  function skip() {                                            // straight to the doors opening at the other end
    if (!R || R.ended) return;
    var el = performance.now() - R.t0;
    if (el < 500) return;
    R.t0 = performance.now() - (R.doors + R.T);
  }
  function closeRide() {
    if (!R) return;
    document.removeEventListener('keydown', onKey, true);
    var el = R.el;
    R = null;
    el.classList.remove('on');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }
  function ease(u) { u = Math.max(0, Math.min(1, u)); return 0.5 - 0.5 * Math.cos(Math.PI * u); }
  function frame(now) {
    if (!R) return;
    var t = now - R.t0, s = R.spec, u = (t - R.doors) / R.T;
    var f = s.from + (s.to - s.from) * ease(u);              // where the car is (a floor; a cab's altitude)
    var doors = t < R.doors ? 1 - t / R.doors : u > 1 ? Math.min(1, (t - R.doors - R.T) / R.doors) : 0;   // 1 open … 0 shut
    if (s.kind === 'lift') drawLift(R.g, f, t, doors, now); else drawCab(R.g, f, ease(u), t, now);
    var L = inLevel(Math.round(f));
    if (L && L !== R.lvl) {                                     // passing a level: its name lights on the glass
      R.lvl = L;
      var lv = R.el.querySelector('.tr-level');
      lv.textContent = L.tag ? L.tag + ' \u00b7 ' + L.name : L.name;
      lv.classList.remove('flash'); void lv.offsetWidth; lv.classList.add('flash');
    }
    if (u > 1 && t > R.doors * 2 + R.T && !R.ended) {
      R.ended = true;
      sfx('ding');
      var done = R.done;
      if (done) done(); else closeRide();
      return;
    }
    requestAnimationFrame(frame);
  }

  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function mix(a, b, k) {
    var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    var r = Math.round(((A >> 16) & 255) * (1 - k) + ((B >> 16) & 255) * k), gg = Math.round(((A >> 8) & 255) * (1 - k) + ((B >> 8) & 255) * k),
        bb = Math.round((A & 255) * (1 - k) + (B & 255) * k);
    return 'rgb(' + r + ',' + gg + ',' + bb + ')';
  }
  function smooth(a, b, x) { var u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }

  // the sky at a height: the District's violet night, the smog band, the starlit Spires; underground, nothing
  var STARS = [];
  for (var si = 0; si < 140; si++) STARS.push([hash(si) * NW, hash(si + 300) * NH, hash(si + 600)]);
  function sky(g, f, now) {
    var above = smooth(330, 420, f), under = f < -4;
    if (under) { g.fillStyle = '#0a0806'; g.fillRect(0, 0, NW, NH); return; }
    var grd = g.createLinearGradient(0, 0, 0, NH);
    grd.addColorStop(0, mix('#07041a', '#04061a', above));
    grd.addColorStop(0.6, mix('#2a0c40', '#0c1438', above));
    grd.addColorStop(1, mix('#5a1a58', '#3a2a5a', above));
    g.fillStyle = grd;
    g.fillRect(0, 0, NW, NH);
    var n = Math.round(30 + above * 110);                    // a few faint stars through the smog; the real sky above it
    for (var i = 0; i < n; i++) {
      var S = STARS[i], tw = 0.45 + 0.4 * Math.sin(now / 700 + i * 3);
      g.fillStyle = 'rgba(' + (S[2] > 0.8 ? '255,236,200' : '220,226,255') + ',' + (tw * (0.35 + above * 0.65)).toFixed(2) + ')';
      g.fillRect(Math.round(S[0]), Math.round(S[1] * (0.5 + above * 0.5)), 1, 1);
    }
  }
  // the smog sea seen from above (the Spires): a lilac plane at y with tower tops through it
  function smogSea(g, y, now, xoff) {
    var grd = g.createLinearGradient(0, y - 10, 0, NH);
    grd.addColorStop(0, 'rgba(150,110,170,0)');
    grd.addColorStop(0.12, 'rgba(150,110,170,0.85)');
    grd.addColorStop(1, 'rgba(70,40,90,1)');
    g.fillStyle = grd;
    g.fillRect(0, y - 10, NW, NH - y + 10);
    for (var i = -1; i < 14; i++) {                           // tower tops through it, lit at the crown
      var span = NW + 60, bx = ((i * 41 + hash(i) * 30 - (xoff || 0) * 0.3) % span + span) % span - 30;
      var bw = 6 + Math.round(hash(i + 7) * 10), bh = 4 + Math.round(hash(i + 9) * 14), by = Math.round(y + 2 + hash(i + 3) * 18);
      g.fillStyle = '#1c1430';
      g.fillRect(Math.round(bx), by - bh, bw, bh + 4);
      g.fillStyle = hash(i + 11) > 0.5 ? '#ffd890' : '#a0e0ff';
      for (var w = 0; w < bh - 2; w += 3) if (hash(i * 13 + w) > 0.45) g.fillRect(Math.round(bx) + 1 + (w % 2) * 2, by - bh + 1 + w, 1, 1);
      g.fillStyle = 'rgba(255,214,140,0.9)';
      if (hash(i + 21) > 0.6) g.fillRect(Math.round(bx + bw / 2), by - bh - 2, 1, 2);
    }
    g.fillStyle = 'rgba(200,170,220,0.18)';                  // its surface drifting
    for (var k = 0; k < 6; k++) {
      var sx = ((now * 0.006 * (1 + k * 0.3) + k * 70) % (NW + 80)) - 40;
      g.fillRect(Math.round(sx), y + 3 + k * 4, 40 + k * 6, 1);
    }
  }
  function seaY(f) { return Math.round(NH * 0.56 + Math.max(0, 420 - f) * 0.9); }   // the sea's far edge: at the horizon once you're above it
  // the Spires out of the smog: slender white towers, gold at their crowns, pastel neon, at their distances
  function spireTops(g, y, f, dx, now) {
    var up = smooth(360, 440, f);
    if (up <= 0) return;
    g.globalAlpha = up;
    for (var i = 0; i < 9; i++) {
      var d = 0.35 + hash(i + 40) * 0.65;                    // far … near
      var span = NW + 120, x = ((i * 47 + hash(i + 41) * 60 - dx * (0.15 + 0.5 * (1 - d))) % span + span) % span - 60;
      var w = Math.round(6 + (1 - d) * 16), h = Math.round(30 + (1 - d) * 70 + hash(i + 42) * 20), base = y + Math.round((1 - d) * 40);
      var stone = mix('#cfc6b8', '#8a8296', d * 0.7);
      g.fillStyle = stone; g.fillRect(Math.round(x), base - h, w, h);
      g.fillStyle = mix('#f0e8dc', '#8a8296', d * 0.6); g.fillRect(Math.round(x), base - h, Math.max(1, Math.round(w / 3)), h);   // the lit side
      for (var t = 0; t < 3; t++) { var tw = Math.round(w * (0.7 - t * 0.2)), th = Math.round(h * 0.12); g.fillStyle = stone; g.fillRect(Math.round(x + (w - tw) / 2), base - h - th * (t + 1), tw, th); }
      g.fillStyle = '#e8c060'; g.fillRect(Math.round(x + w / 2), base - h - Math.round(h * 0.36) - 4, 1, 5);   // the gold finial
      var pastel = ['#ffc0e0', '#c0e8ff', '#e0d0ff'][i % 3];
      g.fillStyle = pastel; g.fillRect(Math.round(x), base - Math.round(h * 0.6), w, 1);
      for (var r = base - h + 4; r < base - 2; r += 4) if (hash(i * 9 + r) > 0.55) { g.fillStyle = '#fff2d0'; g.fillRect(Math.round(x + 1 + hash(r) * (w - 2)), r, 1, 1); }
    }
    var hz = g.createLinearGradient(0, y - 6, 0, y + 46);     // their feet lost in the smog
    hz.addColorStop(0, 'rgba(150,110,170,0)'); hz.addColorStop(0.45, 'rgba(150,110,170,0.75)'); hz.addColorStop(1, 'rgba(120,84,150,0.95)');
    g.fillStyle = hz; g.fillRect(0, y - 6, NW, 52);
    g.globalAlpha = 1;
  }
  // the rendered skyline layers, slid by the ride: dy down as you rise, dx along as you fly
  function layers(g, f, dx, now) {
    var L = typeof BridgeSkyline !== 'undefined' && BridgeSkyline.layers ? BridgeSkyline.layers() : null;
    if (!L || f < -4) return;
    var spec = [['far', 0.18, 0.12, 0.6], ['mid', 0.4, 0.3, 0.75]];
    spec.forEach(function (sp) {
      var img = L[sp[0]], m = L.manifest[sp[0]];
      if (!img || !m) return;
      var k = sp[3], w = Math.round(m.w * k), h = Math.round(m.h * k);
      var y = Math.round(NH * 0.92 - h + f * PXF * sp[2]);
      if (y > NH) return;
      var x = -((dx * sp[1]) % w + w) % w - Math.round((w - NW) * 0.3);
      g.globalAlpha = sp[0] === 'far' ? 0.8 : 1;
      for (var xx = x; xx < NW; xx += w) g.drawImage(img, xx, y, w, h);
      g.globalAlpha = 1;
    });
  }
  // a tower face close by, sliding past (x0..x1 on screen, the floor scroll off, lit windows by floor)
  function nearFace(g, x0, x1, f, wall, win, seed, dx) {
    g.fillStyle = wall;
    g.fillRect(x0, 0, x1 - x0, NH);
    g.fillStyle = 'rgba(0,0,0,0.22)';                         // its piers
    for (var pc = x0 + 5; pc < x1; pc += 18) g.fillRect(pc, 0, 2, NH);
    var off = f * PXF, rowH = 6;
    var first = Math.floor(off / rowH) - 2;
    for (var r = first; r < first + NH / rowH + 4; r++) {
      var y = Math.round(NH - ((r * rowH) - off) - rowH);
      if (y < -rowH || y > NH) continue;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x0, y + rowH - 1, x1 - x0, 1);               // the floor slab
      for (var c = x0 + 2 + ((dx || 0) % 6 + 6) % 6 - 6; c < x1 - 2; c += 6) {
        var h = hash(r * 31 + Math.floor((c + (dx || 0)) / 6) * 7 + seed);
        if (h < 0.42) continue;
        g.fillStyle = h > 0.93 ? '#f078a8' : h > 0.86 ? '#80e0e8' : win;
        g.fillRect(c, y + 1, 3, 3);
        if (h > 0.7) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(c + 2, y + 1, 1, 3); }   // a blind half down, a plant, someone
      }
      if (hash(r * 7 + seed) > 0.93) {                       // a neon blade on the face
        var bx = x0 + Math.round(hash(r + seed) * (x1 - x0 - 4)), col = hash(r * 3 + seed) > 0.5 ? '#f078a8' : '#80e0e8';
        g.fillStyle = col; g.fillRect(bx, y - 10, 2, 16);
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(bx, y - 4, 2, 1);
      }
    }
  }
  function underground(g, f, now) {                          // the shaft below the street: concrete, cables, sodium lamps
    g.fillStyle = '#16120e';
    g.fillRect(0, 0, NW, NH);
    var off = f * PXF;
    for (var r = Math.floor(off / 24) - 1; r < off / 24 + NH / 24 + 2; r++) {
      var y = Math.round(NH - (r * 24 - off) - 24);
      g.fillStyle = '#221c16'; g.fillRect(0, y, NW, 23);
      g.fillStyle = '#0c0a08'; g.fillRect(0, y + 23, NW, 1);
      for (var s = 0; s < 5; s++) if (hash(r * 5 + s) > 0.6) { g.fillStyle = 'rgba(40,30,20,0.6)'; g.fillRect(Math.round(hash(r + s * 9) * NW), y + 4, 2, 12 + s); }
      if (((r % 6) + 6) % 6 === 0) {                         // a sodium lamp every so often, and its glow
        var gl = g.createRadialGradient(NW / 2, y + 10, 1, NW / 2, y + 10, 70);
        gl.addColorStop(0, 'rgba(255,170,70,0.55)'); gl.addColorStop(1, 'rgba(255,170,70,0)');
        g.fillStyle = gl; g.fillRect(NW / 2 - 70, y - 60, 140, 140);
        g.fillStyle = '#ffc070'; g.fillRect(NW / 2 - 3, y + 8, 6, 3);
      }
    }
    g.fillStyle = '#0c0a08';                                   // cables down the shaft
    [40, 46, 274, 281].forEach(function (x) { g.fillRect(x, 0, 1, NH); });
  }

  // the lift car: the glass front with its frame, a handrail, the floor counter; the doors at either end
  var DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
  var GL = { B: '110101110101110', F: '111100110100100', L: '100100100100111', ' ': '000000000000000' };
  function glyph(g, ch, x, y, s, col) {
    var m = /[0-9]/.test(ch) ? DIG[+ch] : GL[ch] || GL[' '];
    g.fillStyle = col;
    for (var i = 0; i < 15; i++) if (m[i] === '1') g.fillRect(x + (i % 3) * s, y + Math.floor(i / 3) * s, s, s);
  }
  function counter(g, f, x, y, col) {                        // the floor number, its last digit rolling odometer-style
    var n = Math.floor(Math.abs(f)), frac = Math.abs(f) - n, neg = f < -0.5;
    var txt = (neg ? 'B' : '') + String(n), s = 2, cw = 4 * s;
    var w = txt.length * cw - s;
    g.fillStyle = '#05070c'; g.fillRect(Math.round(x - w / 2 - 6), y - 4, w + 12, 5 * s + 8);
    g.fillStyle = col; g.globalAlpha = 0.35; g.fillRect(Math.round(x - w / 2 - 6), y + 5 * s + 3, w + 12, 1); g.globalAlpha = 1;
    g.save();
    g.beginPath(); g.rect(Math.round(x - w / 2 - 5), y - 1, w + 10, 5 * s + 2); g.clip();
    for (var i = 0; i < txt.length; i++) {
      var cx = Math.round(x - w / 2 + i * cw), last = i === txt.length - 1 && !(neg && i === 0);
      if (last && R && R.spec.kind === 'lift' && frac > 0.05) {
        var up = R.spec.to > R.spec.from, roll = Math.round(frac * (5 * s + 4)) * (up ? -1 : 1);
        glyph(g, txt[i], cx, y + roll, s, col);
        var nxt = String((+txt[i] + (up ? 1 : 9)) % 10);
        glyph(g, nxt, cx, y + roll + (up ? 1 : -1) * (5 * s + 4), s, col);
      } else glyph(g, txt[i], cx, y, s, col);
    }
    g.restore();
  }
  function drawLift(g, f, t, doors, now) {
    var spires = f > 380, wall = mix('#141022', '#d8d0c4', smooth(380, 470, f)), win = spires ? '#ffe6b0' : '#ffd890';
    if (f < -4) underground(g, f, now);
    else {
      sky(g, f, now);
      layers(g, f, 0, now);
      if (f > 330) { smogSea(g, seaY(f), now, 0); spireTops(g, seaY(f), f, 0, now); }
      var smog = smooth(250, 330, f) * (1 - smooth(370, 420, f));   // through the smog: it closes round the car, then clears
      if (smog > 0) { g.fillStyle = 'rgba(160,96,170,' + (smog * 0.88).toFixed(2) + ')'; g.fillRect(0, 0, NW, NH); }
      nearFace(g, 0, 58, f, wall, win, 3, 0);                  // the towers either side of the shaft
      nearFace(g, NW - 52, NW, f * 1.0, mix('#1a1428', '#e4dccc', smooth(380, 470, f)), win, 17, 0);
      if (smog > 0) { g.fillStyle = 'rgba(160,96,170,' + (smog * 0.55).toFixed(2) + ')'; g.fillRect(0, 0, 58, NH); g.fillRect(NW - 52, 0, 52, NH); }
    }
    // the car: a frame, two mullions, a handrail, the light from the ceiling strip
    var trim = R && R.spec.shaft && /spire/i.test(R.spec.shaft.name) ? '#c8a050' : '#5a6474';
    g.fillStyle = '#0c0e14';
    g.fillRect(0, 0, NW, 8); g.fillRect(0, NH - 18, NW, 18); g.fillRect(0, 0, 10, NH); g.fillRect(NW - 10, 0, 10, NH);
    g.fillStyle = trim;
    g.fillRect(10, 8, NW - 20, 1); g.fillRect(10, NH - 19, NW - 20, 1);
    [Math.round(NW / 3), Math.round(NW * 2 / 3)].forEach(function (x) { g.fillStyle = '#0c0e14'; g.fillRect(x - 2, 8, 4, NH - 26); g.fillStyle = trim; g.fillRect(x - 1, 8, 1, NH - 26); });
    g.fillStyle = trim; g.fillRect(10, NH - 34, NW - 20, 2);   // the handrail
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(10, NH - 32, NW - 20, 1);
    g.fillStyle = 'rgba(255,255,255,0.05)';                   // the glass catching the light
    for (var gl = 0; gl < 3; gl++) g.fillRect(40 + gl * 90 + Math.round(f * 0.05) % 20, 8, 6, NH - 26);
    var strip = g.createLinearGradient(0, 8, 0, 30);
    strip.addColorStop(0, spires ? 'rgba(255,230,190,0.18)' : 'rgba(128,224,232,0.16)'); strip.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = strip; g.fillRect(10, 8, NW - 20, 22);
    counter(g, f, NW / 2, 12, spires ? '#ffd890' : '#80e0e8');
    var up = R && R.spec.to > R.spec.from;                     // the arrow beside it, blinking while she moves
    if (doors < 1 && Math.floor(now / 300) % 2) {
      g.fillStyle = up ? '#80e0e8' : '#f078a8';
      for (var i = 0; i < 3; i++) g.fillRect(NW / 2 + 30 - i, (up ? 14 + i : 18 - i), 1 + 2 * i, 1);
    }
    if (doors > 0) {                                          // the doors: two panels sliding in from the sides
      var half = Math.round((1 - doors) * (NW / 2));
      g.fillStyle = '#20242e'; g.fillRect(0, 0, half, NH); g.fillRect(NW - half, 0, half, NH);
      g.fillStyle = trim; if (half > 0) { g.fillRect(half - 1, 0, 1, NH); g.fillRect(NW - half, 0, 1, NH); }
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(Math.max(0, half - 20), 0, 6, NH); g.fillRect(NW - half + 14, 0, 6, NH);
    }
  }

  // the cab: a side window onto the city flying past, the seat's edge, the driver's screen
  function drawCab(g, f, p, t, now) {
    var dx = p * 2600 + t * 0.02;
    sky(g, f, now);
    layers(g, f, dx, now);
    if (f > 330) { smogSea(g, seaY(f), now, dx); spireTops(g, seaY(f), f, dx, now); }
    var smog = smooth(250, 330, f) * (1 - smooth(370, 420, f));
    if (smog > 0) { g.fillStyle = 'rgba(160,96,170,' + (smog * 0.8).toFixed(2) + ')'; g.fillRect(0, 0, NW, NH); }
    // traffic lanes streaking past the other way (thinning out above the smog)
    for (var i = 0; i < Math.round(16 * (1 - smooth(380, 460, f) * 0.7)); i++) {
      var span = NW + 80, x = ((hash(i) * span - t * (0.2 + hash(i + 3) * 0.25)) % span + span) % span - 40;
      var y = 40 + Math.round(hash(i + 5) * 70);
      g.fillStyle = i % 2 ? 'rgba(255,90,110,0.9)' : 'rgba(230,240,255,0.9)';
      g.fillRect(Math.round(x), y, 3 + (i % 3), 1);
    }
    // a near tower now and then, whipping past close enough to see into
    var pass = (dx * 0.9) % 700;
    if (f > -4 && pass < 120) {
      var x0 = Math.round(NW - pass * 4);
      nearFace(g, Math.max(0, x0), Math.min(NW, x0 + 90), f, f > 380 ? '#d8d0c4' : '#141022', '#ffd890', Math.floor(dx / 700), dx);
    }
    // the cab round the window: dark plum trim, rounded corners, a cyan strip, the seat back, the screen
    g.fillStyle = '#140a18';
    g.fillRect(0, 0, NW, 14); g.fillRect(0, NH - 30, NW, 30); g.fillRect(0, 0, 16, NH); g.fillRect(NW - 16, 0, 16, NH);
    for (var c = 0; c < 6; c++) {                            // the window's rounded corners
      var r = 6 - c;
      g.fillRect(16, 14 + c, r, 1); g.fillRect(NW - 16 - r, 14 + c, r, 1);
      g.fillRect(16, NH - 31 - c, r, 1); g.fillRect(NW - 16 - r, NH - 31 - c, r, 1);
    }
    g.fillStyle = '#5cc8d0'; g.fillRect(16, NH - 30, NW - 32, 1);
    g.fillStyle = '#2a1430'; g.fillRect(0, NH - 22, NW, 22);
    g.fillStyle = '#3a1c40'; for (var q = 0; q < NW; q += 24) g.fillRect(q, NH - 22, 22, 1);   // the seat's quilting
    g.fillStyle = '#0a0c14'; g.fillRect(NW - 70, NH - 28, 56, 20);   // the driver's little screen: the route, a dot moving along it
    g.fillStyle = '#103038'; g.fillRect(NW - 68, NH - 26, 52, 16);
    g.fillStyle = '#5cc8d0'; g.fillRect(NW - 64, NH - 18, 44, 1);
    g.fillStyle = '#ffd890'; g.fillRect(Math.round(NW - 64 + p * 43), NH - 19, 2, 3);
    var sw = Math.sin(now / 380) * 3;                         // a charm on a string, swinging
    g.fillStyle = '#4a2a50'; g.fillRect(Math.round(30 + sw * 0.3), 14, 1, 8);
    g.fillStyle = '#e870c0'; g.fillRect(Math.round(29 + sw), 22, 3, 3);
    g.fillStyle = '#ffd0ec'; g.fillRect(Math.round(29 + sw), 22, 1, 1);
  }

  // ---- the Loop -----------------------------------------------------------------------------------------------------------
  // A journey: round the ring from the station you boarded at, a stop at each, the doors open a while at each (step
  // off, or stay on and she carries on round). Her motion along the track (px the city's gone by) moves the carriage's
  // windows (skyline.motion 'loop'); the stations' platforms slide in and stop outside them.
  var RUN = 22000, DWELL = 9000, VMAX = 0.42;               // ms a leg, ms a stop, px a ms flat out
  var ACC = 4500;                                            // ms to get up to speed (and to stop)
  var LEG = VMAX * (RUN - ACC);                              // px a leg (accelerating and braking each take half their time's distance)
  var trip = null;
  function stations() { return (D && D.loop && D.loop.stations || []).filter(function (s) { return built(s.world); }); }
  function useStation(inter) {
    ready(function () {
      var ring = stations(), me = ring.filter(function (s) { return s.id === inter.station; })[0];
      if (!me || !built('arcadia-loop')) return say(inter.label || 'THE LOOP', 'THE BOARD SAYS SERVICE SUSPENDED. A MAINTENANCE DRONE IS ASLEEP ON THE TRACK.');
      var others = ring.filter(function (s) { return s !== me; });
      var at = ring.indexOf(me), next = nextTrain();
      BridgeInteractions.choose({
        title: (D.loop.name || 'The Loop') + ' · ' + me.name,
        text: 'The sky train round the Mid-Levels' + (others.length ? '' : ' (the only station open)') + '. Next train ' + (next < 8 ? 'pulling in' : 'in ' + Math.ceil(next) + 's') + '. Fare 3 coins.',
        rows: others.map(function (s) {
          var stops = (ring.indexOf(s) - at + ring.length) % ring.length;
          return { label: s.name, sub: stops === 1 ? 'next stop' : stops + ' stops', note: placeName(s.world), pick: function () { board(me, s); } };
        }).concat([{ label: 'Ride round the Loop', sub: 'stay on as long as you like', note: '', pick: function () { board(me, null); } }]),
        closeLabel: 'Not now'
      });
    });
  }
  function nextTrain() { var P = 90; return P - ((Date.now() / 1000) % P); }      // a train every minute and a half
  function board(from, to) {
    var P = typeof BridgeProgression !== 'undefined' ? BridgeProgression : null;
    var go = function () {
      sfx('doors');
      var ring = stations();
      trip = { ring: ring, at: ring.indexOf(from), dest: to ? ring.indexOf(to) : -1, phase: 'dwell', t0: performance.now(), base: 0, boarding: true };
      var car = loopCar();
      BridgeWorld.enterWorld('arcadia-loop', car && car.board || [6, 5], function () { seat(); });
    };
    if (!P || !P.wagerCoins) return go();
    P.wagerCoins(3, 'transit:loop').then(function (r) {
      if (r && r.ok) go(); else say('THE LOOP', 'THE GATE BLINKS RED. THREE COINS FOR THE LOOP - YOU\'RE SHORT.');
    });
  }
  function loopCar() { var w = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld(); return w && w.loopcar ? w.loopcar : null; }
  function seat() {                                          // sat down by the window as she pulls out
    var c = loopCar();
    if (!c || !c.seats || !c.seats.length || typeof BridgeCharacter === 'undefined') return;
    var s = c.seats[Math.floor(Math.random() * c.seats.length)];
    BridgeCharacter.sit({ x: s[0], y: s[1], facing: s[2] || 'down' });
    sfx('sit');
    if (trip) banner('The Loop', 'Doors closing \u00b7 next stop ' + stationAt(trip.at + 1).name);
  }
  // where she is: the phase, how far into it, and how far she's gone (px)
  function motion(now) {
    if (!trip) return 0;
    var t = now - trip.t0;
    if (trip.phase === 'dwell') {
      var dw = trip.boarding ? 4500 : DWELL;
      if (t >= dw) { trip.phase = 'run'; trip.t0 += dw; trip.boarding = false; sfx('doors'); announce(); t = now - trip.t0; }
      else return trip.base;
    }
    if (t >= RUN) {                                           // in at the next station
      trip.base += LEG;
      trip.at = (trip.at + 1) % trip.ring.length;
      trip.phase = 'dwell'; trip.t0 += RUN;
      sfx('doors');
      arrived();
      return trip.base;
    }
    var d;
    if (t < ACC) d = VMAX * t * t / (2 * ACC);
    else if (t < RUN - ACC) d = VMAX * ACC / 2 + VMAX * (t - ACC);
    else { var r = RUN - t; d = LEG - VMAX * r * r / (2 * ACC); }
    return trip.base + d;
  }
  function speed(now) {                                      // 0 still … 1 flat out
    if (!trip || trip.phase !== 'run') return 0;
    var t = now - trip.t0;
    return t < ACC ? t / ACC : t > RUN - ACC ? Math.max(0, (RUN - t) / ACC) : 1;
  }
  function stationAt(i) { return trip && trip.ring[(i + trip.ring.length) % trip.ring.length]; }
  function announce() {
    var n = stationAt(trip.at + 1);
    if (n) banner('Next stop', n.name + (trip.dest === (trip.at + 1) % trip.ring.length ? ' · your stop' : ''));
  }
  function arrived() {
    var s = stationAt(trip.at), mine = trip.dest === trip.at;
    banner(mine ? 'Your stop' : 'This is', s.name + ' · the doors are open' + (mine ? ' — step off at the doors' : ''));
    if (mine && typeof BridgeQuests !== 'undefined' && BridgeQuests.note) BridgeQuests.note('The Loop', 'Rode the Loop to ' + s.name, '');
  }
  var bannerEl = null, bannerT = 0;
  function banner(kick, text) {
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'loop-banner';
      document.body.appendChild(bannerEl);
    }
    bannerEl.innerHTML = '<span class="lb-kick">' + esc(kick) + '</span><span class="lb-text">' + esc(text) + '</span>';
    bannerEl.classList.remove('on'); void bannerEl.offsetWidth; bannerEl.classList.add('on');
    clearTimeout(bannerT);
    bannerT = setTimeout(function () { bannerEl.classList.remove('on'); }, 5200);
  }
  function stepOff() {
    if (!trip || trip.phase !== 'dwell') return;
    var s = stationAt(trip.at);
    trip = null;
    sfx('doors');
    BridgeWorld.enterWorld(s.world, s.spawn);
  }
  function useDoors() {
    if (!trip) { startIdle(); }
    if (trip.phase === 'dwell') {
      var s = stationAt(trip.at);
      BridgeInteractions.choose({ title: s.name, text: 'The doors are open onto the platform. ' + (trip.dest === trip.at ? 'Your stop.' : ''),
        rows: [], buttons: [{ label: 'Step off at ' + s.name, act: stepOff }], closeLabel: 'Stay on' });
    } else say('DOORS', 'SHUT TIGHT, THE CITY POURING PAST THE GLASS. NEXT STOP: ' + stationAt(trip.at + 1).name.toUpperCase() + '.');
  }
  function useMap() {
    if (!trip) startIdle();
    var ring = trip.ring;
    BridgeInteractions.choose({ title: 'The Loop', text: 'A ring of light round the Mid-Levels, a dot crawling along it' + (trip.phase === 'run' ? ' between ' + stationAt(trip.at).name + ' and ' + stationAt(trip.at + 1).name : ' at ' + stationAt(trip.at).name) + '.',
      rows: ring.map(function (s, i) {
        var k = (i - trip.at + ring.length) % ring.length;
        return { label: s.name, sub: k === 0 ? (trip.phase === 'run' ? 'just left' : 'here now') : k === 1 ? 'next stop' : k + ' stops', note: placeName(s.world), info: true };
      }), closeLabel: 'OK' });
  }
  function startIdle() {                                     // in the carriage with no journey (a reload, a Go to): at the first station, doors open
    var ring = stations();
    trip = { ring: ring.length ? ring : [{ id: 'none', name: 'the platform', world: 'arcadia-street', spawn: [31, 9] }], at: 0, dest: -1, phase: 'dwell', t0: performance.now(), base: 0 };
  }
  if (typeof BridgeSkyline !== 'undefined' && BridgeSkyline.setMotion) {
    BridgeSkyline.setMotion('loop', function (now) {
      if (!trip && here() === 'arcadia-loop' && D) startIdle();
      return motion(now);
    });
  }

  // the carriage's windows: what's close by — a station's platform, a tower's face whipping past — over the city
  function carriageBehind(ctx, world, offX, offY, ts, now) {
    if (!world.loopcar || !trip) return;
    var c = world.loopcar, s = motion(now), v = speed(now);
    var W = ctx.canvas.width, top = Math.round(offY + c.window[0] * ts), bot = Math.round(offY + c.window[1] * ts);
    // towers passing close, every so often, a blur at speed
    var gap = 900;
    for (var i = Math.floor((s - W) / gap); i <= Math.floor((s + W * 2) / gap); i++) {
      if (hash(i * 7) < 0.45) continue;
      var x = Math.round(i * gap - s * 1.6 + hash(i) * 300);
      var tw = 120 + Math.round(hash(i + 3) * 160);
      if (x > W || x + tw < 0) continue;
      ctx.fillStyle = hash(i + 5) > 0.5 ? '#120e20' : '#181428';
      ctx.fillRect(x, top - 40, tw, bot - top + 80);
      for (var r = top - 36; r < bot + 30; r += 10) for (var q = x + 6; q < x + tw - 8; q += 12) {
        var h = hash(i * 131 + r * 3 + q);
        if (h < 0.5) continue;
        ctx.fillStyle = h > 0.94 ? '#f078a8' : h > 0.88 ? '#80e0e8' : '#ffd890';
        ctx.fillRect(q, r, Math.max(2, Math.round(6 + v * 14)), 4);    // stretched with speed
      }
    }
    // the station: its platform slides in and stops outside the windows (it stands at each leg's end)
    var stop = Math.round(s / LEG) * LEG, dx = Math.round(stop - s);
    if (Math.abs(dx) < W * 1.5) platform(ctx, W / 2 + dx, top, bot, W, stationAt(trip.at + (stop > trip.base + 1 ? 1 : 0)), now, ts);
    // the dark between the glass: motion lines at speed
    if (v > 0.5) {
      ctx.fillStyle = 'rgba(200,220,255,' + (0.08 * v).toFixed(2) + ')';
      for (var m = 0; m < 10; m++) ctx.fillRect(Math.round(((hash(m) * W - now * 1.4) % W + W) % W), Math.round(top + hash(m + 9) * (bot - top)), 30, 1);
    }
  }
  var LET = { A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '111100101101111',
              H: '101101111101101', I: '111010010010111', J: '001001001101111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101',
              O: '111101101101111', P: '111101111100100', Q: '111101101111001', R: '110101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111',
              V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000', '7': DIG[7] };
  function word(ctx, txt, x, y, s, col) {
    ctx.fillStyle = col;
    for (var i = 0; i < txt.length; i++) {
      var m = /[0-9]/.test(txt[i]) ? DIG[+txt[i]] : LET[txt[i]] || LET[' '];
      for (var j = 0; j < 15; j++) if (m[j] === '1') ctx.fillRect(x + i * 4 * s + (j % 3) * s, y + Math.floor(j / 3) * s, s, s);
    }
  }
  function platform(ctx, cx, top, bot, W, st, now, ts) {
    var y0 = bot - Math.round((bot - top) * 0.32), x0 = Math.round(cx - W), x1 = Math.round(cx + W);
    ctx.fillStyle = '#1c1a26'; ctx.fillRect(x0, top - 30, x1 - x0, y0 - top + 30);             // the station's back wall
    ctx.fillStyle = '#2a2838'; for (var p = x0; p < x1; p += 96) ctx.fillRect(p, top - 30, 10, y0 - top + 30);   // its columns
    ctx.fillStyle = '#5cc8d0'; ctx.fillRect(x0, top + 6, x1 - x0, 2);                            // a cyan strip light
    ctx.fillStyle = '#34323e'; ctx.fillRect(x0, y0, x1 - x0, bot - y0 + 20);                   // the platform, its yellow edge
    ctx.fillStyle = '#e0c040'; ctx.fillRect(x0, y0, x1 - x0, 2);
    for (var lp = x0 + 48; lp < x1; lp += 96) {               // lamps, pools of light
      var gl = ctx.createRadialGradient(lp, y0, 2, lp, y0, 40);
      gl.addColorStop(0, 'rgba(160,230,240,0.3)'); gl.addColorStop(1, 'rgba(160,230,240,0)');
      ctx.fillStyle = gl; ctx.fillRect(lp - 40, y0 - 40, 80, 60);
    }
    if (st) {                                                 // the name board
      var name = String(st.name).toUpperCase().replace(/[^A-Z0-9 ]/g, ''), s = 2, w = name.length * 4 * s + 12;
      var bx = Math.round(cx - w / 2), by = top + 14;
      ctx.fillStyle = '#0a0c14'; ctx.fillRect(bx, by, w, 5 * s + 10);
      ctx.fillStyle = '#5cc8d0'; ctx.fillRect(bx, by, w, 1); ctx.fillRect(bx, by + 5 * s + 9, w, 1);
      word(ctx, name, bx + 6, by + 5, s, '#f0f4ff');
    }
    for (var q = 0; q < 6; q++) {                             // people waiting, a few
      var px = Math.round(cx - W * 0.6 + hash(q + (st ? st.id.length : 0)) * W * 1.2), py = y0 - 14;
      ctx.fillStyle = ['#2a2440', '#3a1c40', '#1c2c40'][q % 3];
      ctx.fillRect(px, py, 5, 12); ctx.fillRect(px + 1, py - 4, 3, 4);
      ctx.fillStyle = q % 2 ? '#f078a8' : '#80e0e8'; ctx.fillRect(px + 1, py + 3, 3, 1);
    }
  }

  // ---- the Loop's train out in the city: over the District street, into the stations ---------------------------------------
  // Every PASS seconds she crosses: a world with a `loop` block in its skyline ({ row, from, to } the viaduct's screen row and
  // span, tiles) sees her go over, west to east and back; a station world's `loop` block ({ track: [x0, x1, row, z] }) sees
  // her pull in, wait and pull out on its track (a train every 90 s, as the boards say).
  var PASS = 150, CROSS = 7;                                  // a crossing every 150 s, 7 s over the street
  var train = new Image(), trainMeta = null;
  function loadTrain() {
    if (trainMeta !== null) return;
    trainMeta = false;
    fetch('/bridge/assets/scenes/loop-train/scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (m) {
      trainMeta = m;
      train.src = '/bridge/assets/scenes/loop-train/' + (m.states && m.states[0] || 'full') + '.' + (m.ext || 'png') + '?v=' + (m.rev || Date.now());
    }).catch(function () { });
  }
  function crossing(now) {                                    // where she is on a crossing: 0..1 across, which way, or null
    var t = (Date.now() / 1000) % PASS;
    if (t < CROSS) return { u: t / CROSS, dir: 1 };
    if (t >= PASS / 2 && t < PASS / 2 + CROSS) return { u: (t - PASS / 2) / CROSS, dir: -1 };
    return null;
  }
  var rumbled = 0;
  function streetBehind(ctx, world, offX, offY, ts, now) {
    var L = world.skyline && world.skyline.loop;
    if (!L) return;
    loadTrain();
    var y = Math.round(offY + L.row * ts), x0 = offX + (L.from != null ? L.from : -10) * ts, x1 = offX + (L.to != null ? L.to : world.width + 10) * ts;
    // the viaduct: a deck on piers, a cyan strip under it
    ctx.fillStyle = '#0e0c18'; ctx.fillRect(Math.round(x0), y, Math.round(x1 - x0), 7);
    ctx.fillStyle = '#1c1a2a'; ctx.fillRect(Math.round(x0), y, Math.round(x1 - x0), 2);
    ctx.fillStyle = 'rgba(92,200,208,0.7)'; ctx.fillRect(Math.round(x0), y + 7, Math.round(x1 - x0), 1);
    for (var px = Math.round(x0 + 20); px < x1; px += 150) { ctx.fillStyle = '#0c0a14'; ctx.fillRect(px, y + 7, 8, 300); }
    var c = crossing(now);
    if (!c || !trainMeta || !train.complete || !train.width) return;
    var k = L.scale || 0.5, w = Math.round(train.width * k), h = Math.round(train.height * k);
    var u = c.dir > 0 ? c.u : 1 - c.u, x = Math.round(x0 - w + (x1 - x0 + w) * u);
    ctx.save();
    if (c.dir < 0) { ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(train, x, y - h + Math.round(4 * k), w, h);
    ctx.restore();
    if (Date.now() - rumbled > (PASS / 2 - 5) * 1000) { rumbled = Date.now(); sfx('train'); }
  }
  // at a station: in, the doors, out (screen-tracked by the track's row so she's drawn among the people)
  function stationItems(world, offX, offY, ts, now, sc) {
    var L = world.loop;
    if (!L || !L.track) return [];
    loadTrain();
    if (!trainMeta || !train.complete || !train.width || !sc) return [];
    var P = 90, t = (Date.now() / 1000) % P, IN = 6, STAY = 14;
    if (t > IN * 2 + STAY) return [];
    var tr = L.track, len = (tr[1] - tr[0]) * ts, w = train.width, h = train.height;
    var stopX = offX + tr[0] * ts + (len - w) / 2, x;
    if (t < IN) { var a = 1 - t / IN; x = stopX - a * a * (len + w); }                  // braking in from the west
    else if (t < IN + STAY) x = stopX;
    else { var b = (t - IN - STAY) / IN; x = stopX + b * b * (len + w); }             // pulling away east
    var foot = tr[2], dy = Math.round(offY + (tr[2] + 1) * ts - h - (tr[3] || 0) * ts);
    var x0 = offX + tr[0] * ts - w, x1 = offX + tr[1] * ts + w;
    return [{ footRow: foot, draw: function (ctx) {
      ctx.save();
      ctx.beginPath(); ctx.rect(Math.round(offX + tr[0] * ts), 0, Math.round(len), ctx.canvas.height); ctx.clip();   // she comes out of the tunnel mouths
      BridgeScene.drawOccluded(ctx, sc, train, 0, 0, w, h, Math.round(x), dy, foot, offX, offY, null);
      ctx.restore();
    } }];
  }

  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('arcadia', {
      behind: function (ctx, world, offX, offY, ts, now) { carriageBehind(ctx, world, offX, offY, ts, now); streetBehind(ctx, world, offX, offY, ts, now); },
      items: stationItems
    });
  }
  // the carriage sways and hums at speed (its own little shake, never more than a pixel)
  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('express_lift', useLift, 'Ride');
    BridgeInteractions.register('air_cab', useCab, 'Hail');
    BridgeInteractions.register('loop_station', useStation, 'Board');
    BridgeInteractions.register('loop_doors', useDoors, 'Doors');
    BridgeInteractions.register('loop_map', useMap, 'Look');
  }

  // where a lift, a cab rank or a station goes (the Map's markers): { name, to: [world ids] }
  function links(it) {
    if (!D) return null;
    var own = function (list, me) { return list.filter(function (x) { return x !== me && built(x.world); }).map(function (x) { return x.world; }); };
    if (it.type === 'express_lift') {
      var S = D.shafts[it.shaft], me = S && S.lobbies.filter(function (l) { return l.id === it.lobby; })[0];
      return S ? { name: S.name, to: own(S.lobbies, me) } : null;
    }
    if (it.type === 'air_cab') { var pads = D.cabs.pads || []; return { name: 'Air cab rank', to: own(pads, pads.filter(function (p) { return p.id === it.pad; })[0]) }; }
    if (it.type === 'loop_station') { var ss = stations(); return { name: (D.loop.name || 'The Loop') + ' station', to: own(ss, ss.filter(function (x) { return x.id === it.station; })[0]) }; }
    return null;
  }

  return { ready: ready, data: function () { return D; }, links: links, level: level, levelOf: levelOf, tag: tag, placeName: placeName,
           ride: ride, built: built, fare: fare, stations: stations,
           _trip: function () { return trip ? { at: trip.at, dest: trip.dest, phase: trip.phase, station: stationAt(trip.at) && stationAt(trip.at).id, dist: motion(performance.now()) } : null; },
           _skipLeg: function () { if (trip) trip.t0 -= trip.phase === 'run' ? RUN : (trip.boarding ? 4500 : DWELL); },
           _crossing: crossing, _close: closeRide };
})();
