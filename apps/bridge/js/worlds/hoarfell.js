/**
 * Hoarfell — Fellhaven, the ski village under the cliffs, and the summit of
 * the Hoarspire (pre-rendered scenes: tools/bridge-art/scenes/hoarfell.py,
 * hoarfell_summit.py), and the cold.
 *
 * The cold: in a world with `"cold": true`, without a Thermal Suit
 * (BridgeGear.has('cold')) or a warm drink in you, the cold takes 2 energy
 * every twelve seconds (health when you've none left), frost creeps in at the
 * edges of the screen and your breath fogs. Hot cocoa warms you for five
 * minutes (BridgeHoarfell.warm). The suits are sold here too, at the
 * Outerwear rail by the ski hire.
 *
 * Scene hooks (the hoarfell tileset): falling snow, chimney smoke, the
 * chairlift's chairs going round (`scene.lift.lines`: the cable runs in
 * screen tiles), and on the summit (a backdrop world) the evening sky, the
 * far range and a sea of cloud below (and behind the face, `hoarfell-face`).
 * The pistes and the face hand their own drawing to js/ski.js and
 * js/climb.js (gates, ghosts, tracks, spray; the holds in reach, the wind).
 * Interactions: climb / climb_board / climb_register (js/climb.js), lift,
 * ski_start and ski_gate (js/ski.js); Liv's race topic (`race`).
 *
 *   BridgeHoarfell.use(inter)    BridgeHoarfell.warm(minutes)    BridgeHoarfell.ski(runId | 'free', {rival})    BridgeHoarfell.race()
 */
var BridgeHoarfell = (function () {
  var KEY = 'bridge_hoarfell';
  var save = load();
  var coldSince = 0, lastChill = 0, warned = false, puffs = [], lastPuff = 0;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { warm: 0, signed: 0 }; } catch (e) { return { warm: 0, signed: 0 }; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function say(l, t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(l, t); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }

  // ---- the cold ------------------------------------------------------------------------------------------------
  function suited() { return typeof BridgeGear !== 'undefined' && BridgeGear.has('cold'); }
  function warm(minutes) { save.warm = Date.now() + minutes * 60000 * (typeof BridgeCodex !== 'undefined' && BridgeCodex.bonus('fell') ? 1.2 : 1);  store(); coldSince = 0; }   // (Fellhaven fare in the Collection, all found: a fifth longer)
  function chilled(world, now) {
    // a blizzard (js/weather.js) bites through a Thermal Suit too, and twice as hard without one: get indoors
    var wx = typeof BridgeWeather !== 'undefined' && BridgeWeather.cold ? BridgeWeather.cold(BridgeWorld.getWorldId()) : { rate: 1, suited: 0 };
    if (!world || !world.cold || (suited() && wx.suited < 0.2) || Date.now() < save.warm) { coldSince = 0; return 0; }
    if (typeof BridgeClimb !== 'undefined' && BridgeClimb.isOpen()) return 0;     // the climb has its own cold
    if (typeof BridgeSki !== 'undefined' && BridgeSki.isOpen()) return 0;            // skiing keeps you warm
    if (!coldSince) { coldSince = now; lastChill = now; }
    if (!warned) {
      warned = true;
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) {
        if (suited()) BridgeQuests.toast('Blizzard', 'It cuts through even a Thermal Suit', 'Get indoors: the lodge, a hut. Hot cocoa warms you');
        else BridgeQuests.toast('Bitter cold', 'The cold is sapping your strength', 'A Thermal Suit keeps it out; hot cocoa warms you');
      }
    }
    // the Last Ridge is colder (`coldRate`), and colder again in a whiteout (js/expedition.js)
    var rate = (world.coldRate || 1) * (typeof BridgeExpedition !== 'undefined' && BridgeExpedition.whiteout() > 0.5 ? 1.5 : 1) * (suited() ? wx.suited : wx.rate);
    if (now - lastChill > 12000 / rate && typeof BridgeInventory !== 'undefined') {
      lastChill = now;
      var st = BridgeInventory.getStats();
      if (st.energy > 0) BridgeInventory.useEnergy(2); else BridgeInventory.takeDamage(1);
      if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) {
        BridgeFX.spawnFloatingText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.3, st.energy > 0 ? '-2 EN' : '-1 HP', '#a8dcff');
      }
    }
    return Math.min(1, (now - coldSince) / 45000);
  }

  // ---- what the hoarfell interactions do ------------------------------------------------------------------------------
  function use(inter) {
    switch (inter.type) {
      case 'climb':
        if (typeof BridgeClimb !== 'undefined') BridgeClimb.start(inter.route);
        return;
      case 'climb_board':
        if (typeof BridgeClimb !== 'undefined') BridgeClimb.board();
        return;
      case 'climb_register': return register();
      case 'lift': return lift(inter);
      case 'ski_start': return skiMenu('START GATE', 'THREE BOARDS ON POSTS: GREEN, BLUE, BLACK. THE SNOW FALLS AWAY BELOW THE GATE INTO THE PISTES.');
      case 'ski_gate': return ski(inter.run);
      case 'ski_here': return ski('free');
      case 'ski_wax': return waxBench();                       // free skiing where you stand (the Last Ridge's bowl)
      case 'park_start': return parkRun();
      case 'park_tow': return tow();
      case 'park_board': return parkBoard();
    }
  }

  function runOptions() {
    if (typeof BridgeSki === 'undefined') return [];
    return Object.keys(BridgeSki.RUNS).map(function (id) {
      var R = BridgeSki.RUNS[id], best = BridgeSki.best(id);
      var name = R.name.toLowerCase().replace(/(^|\s)([a-z])/g, function (m, sp, ch) { return sp + ch.toUpperCase(); });
      return { label: 'Race ' + name + ' (' + R.mark + ')' + (best ? ' - best ' + (Math.floor(best / 60) + ':' + ('0' + (best % 60).toFixed(1)).slice(-4)) : ''),
               action: 'ski_run', run: id };
    }).concat([{ label: 'Free ski from the top', action: 'ski_run', run: 'free' }]);
  }
  // the lift: Fellhaven's bottom station, the summit's top one, the pistes' own at the finish
  function lift(inter) {
    var opts;
    if (inter.down) opts = [{ label: 'Ride down to Fellhaven', action: 'enter_world', target: 'hoarfell', spawn: [41, 14] },
                            { label: 'Ride down the far side to Aurelle', action: 'enter_world', target: 'hoarfell-aurelle', spawn: [7, 24] }];
    else opts = [{ label: 'Ride up to the summit', action: 'enter_world', target: 'hoarfell-summit', spawn: [20, 15] }];
    opts = opts.concat(runOptions()).concat([{ label: 'Not now', action: 'close' }]);
    BridgeInteractions.execute({ type: 'menu', label: 'CHAIRLIFT', options: opts,
      dialog: inter.down ? 'THE TOP STATION. THE BULLWHEEL GRINDS ROUND; THE CHAIRS SWING IN OUT OF THE CLOUD.'
            : inter.piste ? 'THE BOTTOM STATION BELOW THE FINISH. ANSGAR\'S CHAIRS COME ROUND EMPTY AND SWING ON UP THE EAST SIDE.'
            : 'ANSGAR WAVES YOU ONTO THE LINE. "THE PISTES START UNDER THE SUMMIT. SKIS FROM THE HIRE SHOP."' });
  }
  function skiMenu(label, text) {
    BridgeInteractions.execute({ type: 'menu', label: label, dialog: text, options: runOptions().concat([{ label: 'Not now', action: 'close' }]) });
  }
  // a run (or 'free'): skis needed, the black once you've done the blue — then onto the mountain (js/ski.js)
  function ski(run, opts) {
    if (typeof BridgeSki === 'undefined') return;
    if (!has('skis')) return say('ANSGAR', '"NOT IN THOSE BOOTS. THE HIRE SHOP IN THE VILLAGE HAS SKIS."');
    if (run === 'free' || !run) return BridgeSki.start(null);
    if (!BridgeSki.unlocked(run)) return say('ANSGAR', '"THE COULOIR? NOT TILL I\'VE SEEN YOU COME DOWN PINEWOOD IN ONE PIECE."');
    BridgeSki.start(run, opts);
  }

  // Ysolde at the guide hut: race her up a route on the face (js/climb.js)
  function climbRace(who) {
    if (typeof BridgeClimb === 'undefined') return;
    var opts = ['staircase', 'icefall', 'hoarspire'].map(function (id) {
      var R = BridgeClimb.ROUTES[id], name = R.name.toLowerCase().replace(/(^|\s)([a-z])/g, function (m, sp, ch) { return sp + ch.toUpperCase(); });
      return { label: 'Race her up ' + name + (BridgeClimb.beatYsolde(id) ? ' (beaten)' : ' (' + BridgeClimb.BEAT[id] + ' coins)'), action: 'climb_race', route: id };
    });
    opts.push({ label: 'Not now', action: 'close' });
    BridgeInteractions.execute({ type: 'menu', label: (who || 'YSOLDE').toUpperCase(), options: opts,
      dialog: '"FIRST TO THE TOP. SAME WALL, SAME HOLDS - I\'LL TAKE THE RIGHT-HAND SIDE OF EACH ONE. YOU FALL, YOU LOSE TIME. I DON\'T FALL. BEAT ME ONCE ON A ROUTE AND I\'LL PAY FOR IT."' });
  }

  // the Park (js/ski.js): a scored run from the deck; the rope tow back up; the scoreboard
  function parkRun() {
    if (typeof BridgeSki === 'undefined') return;
    if (!has('skis')) return say('JUNO', '"YOU CAN\'T SKI THE PARK IN BOOTS. THE HIRE SHOP IN THE VILLAGE HAS SKIS."');
    BridgeSki.park();
  }
  function tow() {
    sfx('lift');
    BridgeCharacter.init(20, 7);
    BridgeCharacter.setFacing('down');
    say('ROPE TOW', 'YOU GRAB A HANDLE AND THE ROPE HAULS YOU UP THE EAST SIDE, PAST THE RAILS, TO THE DECK.');
  }
  function parkBoard() {
    var R = typeof BridgeSki !== 'undefined' ? BridgeSki.parkRecord() : { best: 0, runs: 0 };
    say('SCOREBOARD', 'AMBER DIGITS ON A BLACK BOARD, CHALK UNDERNEATH.\n\nJUNO PIKE ............ ' + BridgeSki.JUNO +
        '\n' + (R.runs ? 'YOU ................... ' + R.best + ' (' + R.runs + (R.runs === 1 ? ' RUN)' : ' RUNS)') : 'YOU ................... -') +
        '\n\nSPINS AND GRABS OFF THE KICKERS, SLIDES ON THE RAILS. LAND THEM CLOSE TOGETHER FOR A COMBO - EACH ONE ADDS TO THE MULTIPLIER. FALL AND THE COMBO\'S GONE.');
  }

  // Liv at the finish: race her down any run you're allowed on
  function race(who) {
    if (typeof BridgeSki === 'undefined') return;
    var opts = Object.keys(BridgeSki.RUNS).filter(function (id) { return BridgeSki.unlocked(id); }).map(function (id) {
      var R = BridgeSki.RUNS[id];
      return { label: 'Race her down ' + R.name.toLowerCase().replace(/(^|\s)([a-z])/g, function (m, sp, ch) { return sp + ch.toUpperCase(); }) +
               (BridgeSki.beatLiv(id) ? ' (beaten)' : ' (' + R.beat + ' coins)'), action: 'ski_run', run: id, rival: true };
    });
    opts.push({ label: 'Not now', action: 'close' });
    BridgeInteractions.execute({ type: 'menu', label: (who || 'LIV').toUpperCase(), options: opts,
      dialog: '"SAME RULES AS THE RACES: EVERY GATE, CLOCK STARTS AT THE WAND. BEAT ME ONCE ON A RUN AND I PAY UP. I DON\'T FALL, AND I DON\'T WAIT."' });
  }

  function register() {
    var name = ((typeof BridgeState !== 'undefined' && BridgeState.getPilot()) || {}).name || 'A PILOT';
    save.signed = (save.signed || 0) + 1;
    store();
    var lines = [];
    if (typeof BridgeClimb !== 'undefined') {
      Object.keys(BridgeClimb.ROUTES).forEach(function (id) {
        var r = BridgeClimb.records ? BridgeClimb.records(id) : null;
        if (r && r.ascents) lines.push(BridgeClimb.ROUTES[id].name + ': ' + r.ascents + (r.ascents > 1 ? ' ASCENTS' : ' ASCENT'));
      });
    }
    sfx('clue');
    say('SUMMIT REGISTER', 'A TIN BOX WITH A NOTEBOOK INSIDE, ITS PAGES STIFF WITH COLD. NAMES GOING BACK FIFTY YEARS - YSOLDE\'S ON EVERY OTHER PAGE.\n\n' +
        'YOU WRITE: "' + String(name).toUpperCase() + ' WAS HERE."' + (save.signed > 1 ? ' (THAT\'S ' + save.signed + ' TIMES NOW.)' : '') +
        (lines.length ? '\n\n' + lines.join('\n') : ''));
  }

  // ---- drawing ------------------------------------------------------------------------------------------------------------
  function over(ctx, world, offX, offY, ts, now) {
    var sc = world.scene || {};
    var W = ctx.canvas.width, H = ctx.canvas.height;
    // the chairlift going round: chairs every couple of tiles along each line, up one side, down the other
    if (sc.lift && sc.lift.lines) sc.lift.lines.forEach(function (ln, side) { chairs(ctx, ln, side, offX, offY, ts, now); });
    // chimney smoke: soft round puffs rising and leaning off downwind (the Look Book's)
    (sc.smoke || []).forEach(function (p, i) {
      for (var q = 0; q < 8; q++) {
        var ph = ((now / 5000) + q / 8 + i * 0.29) % 1;
        var sx = offX + p[0] * ts + ph * ph * 18 + Math.sin(ph * 6 + q) * 1.5, sy = offY + p[1] * ts - ph * 34;
        ctx.fillStyle = ph < 0.3 ? 'rgba(238,240,246,' + (0.5 * (1 - ph)).toFixed(2) + ')' : 'rgba(212,216,228,' + (0.5 * (1 - ph)).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(Math.round(sx), Math.round(sy), 1.5 + ph * 4.5, 0, Math.PI * 2); ctx.fill();
      }
    });
    // glints on the ice (the render's own spots, sc.glints: screen tiles): a pixel, now and then a little cross
    if (sc.glints) {
      var Wt = skyWeights(), gc = Wt.night > 0.5 ? '200,214,255' : Wt.dusk > 0.4 ? '255,214,192' : '255,255,255';
      sc.glints.forEach(function (g) {
        var ph = (now / 1430 + g[2] * 7.3) % 1;
        if (ph > 0.16) return;
        var a = Math.sin(ph / 0.16 * Math.PI), gx = Math.round(offX + g[0] * ts), gy = Math.round(offY + g[1] * ts);
        ctx.fillStyle = 'rgba(' + gc + ',' + (0.9 * a).toFixed(2) + ')';
        ctx.fillRect(gx, gy, 1, 1);
        if (a > 0.7 && g[2] > 0.5) { ctx.fillRect(gx - 1, gy, 3, 1); ctx.fillRect(gx, gy - 1, 1, 3); }
      });
    }
    // your breath, in the cold
    var c = chilled(world, now);
    if (world.cold && !(BridgeCharacter.isHidden && BridgeCharacter.isHidden())) {
      if (now - lastPuff > 1700) {
        lastPuff = now;
        var p = BridgeCharacter.getRenderPos(), f = BridgeCharacter.getFacing();
        puffs.push({ x: p.x + 0.5 + (f === 'left' ? -0.25 : f === 'right' ? 0.25 : 0), y: p.y - 0.15 + (f === 'up' ? -0.1 : 0.05), t: now });
      }
      puffs = puffs.filter(function (b) { return now - b.t < 1200; });
      puffs.forEach(function (b) {
        var k = (now - b.t) / 1200;
        ctx.fillStyle = 'rgba(240,246,255,' + (0.55 * (1 - k)).toFixed(2) + ')';
        var s = Math.round(2 + k * 4);
        ctx.fillRect(Math.round(offX + b.x * ts + k * 6), Math.round(offY + b.y * ts - k * 8), s, s);
      });
    }
    // falling snow: screen-space flakes, drifting with a little wind (thicker on the summit)
    var n = world.hollow || world.indoors ? 0 : world.summit ? 110 : 70;   // no snow falls in the Hollow or indoors
    for (var i = 0; i < n; i++) {
      var spd = 0.012 + (i % 5) * 0.004, wind = world.summit ? 0.03 : 0.008;
      var x = ((i * 97.13 + now * wind * (1 + (i % 3))) % (W + 20)) - 10 + Math.sin(now / 1100 + i) * 3;
      var y = (i * 53.71 + now * spd) % (H + 10) - 5;
      var fx = Math.round(x), fy = Math.round(y), big = i % 7 === 0;    // a white pixel with a blue-grey one under it: they show on snow too
      ctx.fillStyle = 'rgba(154,166,196,' + (0.35 + (i % 4) * 0.1).toFixed(2) + ')';
      ctx.fillRect(fx, fy + 1, big ? 2 : 1, 1);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + (i % 4) * 0.12).toFixed(2) + ')';
      ctx.fillRect(fx, fy, big ? 2 : 1, 1);
    }
    // frost creeping in at the edges while the cold has you
    if (c > 0) {
      var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.65);
      g.addColorStop(0, 'rgba(210,235,255,0)'); g.addColorStop(1, 'rgba(210,235,255,' + (0.38 * c).toFixed(2) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(240,250,255,' + (0.5 * c).toFixed(2) + ')';
      for (var j = 0; j < 40; j++) {                              // ice crystals along the edges
        var e = j % 4, t = (j * 0.618) % 1, L = 2 + (j % 3) * 2;
        var ex = e === 0 ? t * W : e === 1 ? W - 3 : e === 2 ? t * W : 1, ey = e === 0 ? 1 : e === 1 ? t * H : e === 2 ? H - 3 : t * H;
        ctx.fillRect(Math.round(ex), Math.round(ey), e % 2 ? L : 1, e % 2 ? 1 : L);
      }
    }
  }

  function chairs(ctx, ln, side, offX, offY, ts, now) {
    var segs = [], total = 0;
    for (var i = 0; i < ln.length - 1; i++) {
      var a = ln[i], b = ln[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a: a, b: b, L: L, at: total });
      total += L;
    }
    if (!total) return;
    var gap = 2.6, speed = 0.55, off = (now / 1000 * speed) % gap;
    for (var d = (side ? gap - off : off); d < total; d += gap) {
      var s = segs[0];
      for (var k = 0; k < segs.length; k++) if (d >= segs[k].at) s = segs[k];
      var t = (d - s.at) / s.L, x = s.a[0] + (s.b[0] - s.a[0]) * t, y = s.a[1] + (s.b[1] - s.a[1]) * t;
      var px = Math.round(offX + x * ts), py = Math.round(offY + y * ts);
      ctx.fillStyle = '#2e3038'; ctx.fillRect(px, py, 1, 9);
      ctx.fillStyle = '#7a1e18'; ctx.fillRect(px - 5, py + 9, 11, 3);
      ctx.fillStyle = '#b83a2e'; ctx.fillRect(px - 5, py + 8, 11, 2); ctx.fillRect(px - 5, py + 3, 2, 6);
      ctx.fillStyle = '#2e3038'; ctx.fillRect(px - 4, py + 12, 9, 1);
      if (((d / gap) | 0) % 3 === side) {                          // a skier riding it, skis dangling
        ctx.fillStyle = ['#2a6ac0', '#e0b030', '#3aa060'][((d / gap) | 0) % 3];
        ctx.fillRect(px - 2, py + 3, 4, 5);
        ctx.fillStyle = '#f0d8c0'; ctx.fillRect(px - 1, py + 1, 3, 2);
        ctx.fillStyle = '#e8e8f0'; ctx.fillRect(px - 3, py + 14, 7, 1);
      }
    }
  }

  // ---- the sky over the mountain ------------------------------------------------------------------------------------------
  // Behind the summit, the face, the Ice Step, the Last Ridge, the promenade and the monastery (backdrop worlds) and in the
  // summit bench's view. It follows the hour the place itself is lit for (BridgeLit's live light: the same hour, season and
  // weather, so a preview or a test's forced hour moves it too; the planet's clock when there's no live light), in the toy
  // finish: the sky in flat bands, a sun that rises over the east (right) and sets in the west (left) with a halo in flat
  // rings, the moon in its phase crossing the night, stars in depth with the galaxy's band, the aurora on some cold nights,
  // cirrus drifting and lens clouds parked over the high peaks, choughs wheeling and now and then a lammergeier gliding past,
  // three ranges lit from the side the sun is on, and a sea of cloud banked in rows that slide with the camera at their
  // depths. Everything that doesn't move is drawn once into a canvas (recoloured when the light changes) and blitted in
  // whole pixels; per frame it's a few dozen drawImages and rects.
  var REDUCE = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the day on the 24-hour face, as the live light has it (js/litscene.js KEYS) — for a place without live light
  var KEYS = [[0, '#060a1e', '#1a2448', 1, 0], [4.6, '#0a1032', '#28305c', 1, 0], [5.6, '#2c3668', '#c47c8c', 0.55, 0.35],
              [6.6, '#6c8cc4', '#f6ba92', 0.08, 0.75], [8, '#78aeea', '#eae2ca', 0, 0.12], [12, '#5a9ee8', '#d2e8f6', 0, 0],
              [16, '#68a4e6', '#e8e4cc', 0, 0.1], [18, '#7896d6', '#ffc68c', 0, 0.85], [19.2, '#5868a8', '#ff8e6c', 0.18, 1],
              [20.2, '#283272', '#9c6a92', 0.62, 0.3], [21.5, '#0c1238', '#2a3062', 0.95, 0], [24, '#060a1e', '#1a2448', 1, 0]];
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, a) {
    var s = Math.round(Math.max(0, Math.min(255, c[0]))) + ',' + Math.round(Math.max(0, Math.min(255, c[1]))) + ',' + Math.round(Math.max(0, Math.min(255, c[2])));
    return a === undefined ? 'rgb(' + s + ')' : 'rgba(' + s + ',' + a.toFixed(3) + ')';
  }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function clockHour(id) {                       // the 24-hour face from the planet's clock (as litscene's moment())
    var k = typeof BridgeClock !== 'undefined' ? BridgeClock.sky(id) : null;
    if (!k || !k.cycles || !k.len) return k && k.sun < 0.5 ? 0 : 12;
    var x = k.t / k.len, rise = k.sunrise == null ? 0 : k.sunrise / k.len, set = k.sunset == null ? 1 : k.sunset / k.len;
    if (x >= rise && x <= set) return 6 + 13.6 * (x - rise) / Math.max(1e-6, set - rise);
    return (19.6 + 10.4 * (((x - set) % 1 + 1) % 1) / Math.max(1e-6, 1 - (set - rise))) % 24;
  }
  // what the sky is doing: { h, zen, hor (0-255), night, golden, wx, wk, season }, worked out a few times a second
  var ST = { at: 0, s: null };
  function skyState() {
    var t = Date.now();
    if (ST.s && t - ST.at < 250) return ST.s;
    var wd = BridgeWorld.getWorld && BridgeWorld.getWorld(), id = (wd && wd.scene && wd.scene.id) || 'hoarfell';
    var Lt = typeof BridgeLit !== 'undefined' && BridgeLit.light ? BridgeLit.light(id) : null, s;
    if (Lt && Lt.P && Lt.M) {
      s = { h: Lt.M.h, zen: Lt.P.skyTop.map(function (v) { return v * 255; }), hor: Lt.P.skyHor.map(function (v) { return v * 255; }),
            night: Lt.night, golden: Lt.golden, wx: Lt.M.wx, wk: Lt.M.wk || 0, season: Lt.M.season };
    } else {
      var h = clockHour(id), i = 0;
      while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
      var a = KEYS[i], b = KEYS[i + 1], f = (h - a[0]) / (b[0] - a[0]);
      s = { h: h, zen: mix(hex(a[1]), hex(b[1]), f), hor: mix(hex(a[2]), hex(b[2]), f), night: a[3] + (b[3] - a[3]) * f, golden: a[4] + (b[4] - a[4]) * f,
            wx: 'clear', wk: 0, season: null };
      var w = typeof BridgeWeather !== 'undefined' && BridgeWeather.here ? BridgeWeather.here(id) : null;
      if (w && w.k > 0.15) { s.wx = /snow|blizzard/.test(w.kind) ? 'snow' : /fog|mist/.test(w.kind) ? 'fog' : /cloud|gale|storm|rain/.test(w.kind) ? 'cloud' : 'clear'; s.wk = w.k; }
    }
    // thin mountain air: a deeper blue overhead by day
    s.zen = mix(s.zen, [30, 58, 146], 0.32 * (1 - s.night) * (1 - s.golden * 0.5));
    s.thick = s.wx === 'clear' ? 0 : s.wk * (s.wx === 'cloud' ? 0.55 : 0.9);          // how much the weather hides
    s.up = s.h > 5.7 && s.h < 19.9;
    s.u = cl((s.h - 6) / 13.6, 0, 1);
    s.sunC = mix([255, 250, 236], [255, 168, 112], s.golden);
    // cloud in sunlight and in its own shade, by the hour
    var lit = mix(mix([255, 255, 255], s.sunC, 0.55), s.hor, 0.12), sh = mix(mix(s.hor, s.zen, 0.45 + 0.3 * s.golden), [255, 255, 255], 0.3 - 0.1 * s.golden);
    s.cLit = mix(lit, [92, 106, 156], s.night * 0.82); s.cSh = mix(sh, [38, 46, 84], s.night * 0.8);
    s.cMid = mix(s.cLit, s.cSh, 0.5);
    ST = { at: t, s: s };
    return s;
  }
  // kept for the glints on the ice (they take the sky's colour)
  function skyWeights() { var s = skyState(); return { night: s.night, dusk: s.golden * (1 - s.night), day: Math.max(0, 1 - s.night - s.golden) }; }

  // small images drawn once: a disc, a halo of flat rings, the moon in its phase, a lens cloud
  var SPR = {};
  function sprite(key, w, h, fn) {
    if (SPR[key]) return SPR[key];
    if (Object.keys(SPR).length > 60) SPR = {};
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    return (SPR[key] = c);
  }
  function disc(g, cx, cy, rx, ry, col) {       // an ellipse of whole pixels, row by row
    g.fillStyle = col;
    for (var y = -ry; y <= ry; y++) { var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1)))); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
  }
  function q8(c) { return c.map(function (v) { return Math.round(v / 8); }).join('.'); }

  // the bands: the zenith to the horizon in flat steps, thinner as they near the horizon
  function bands(ctx, w, hz, s) {
    var N = 11, prev = 0;
    for (var i = 0; i < N; i++) {
      var y1 = i === N - 1 ? hz : Math.round(hz * (1 - Math.pow(1 - (i + 1) / N, 1.35)));
      var t = Math.pow(i / (N - 1), 1.5);
      var c = mix(s.zen, s.hor, t);
      if (s.golden > 0.05 && i >= N - 4) c = mix(c, mix(s.hor, s.sunC, 0.4), s.golden * (i - N + 5) / 5 * 0.6);   // the warm belt
      ctx.fillStyle = rgb(c); ctx.fillRect(0, prev, w, y1 - prev);
      prev = y1;
    }
  }
  function sun(ctx, w, hz, s) {
    var k = (1 - s.thick) * cl((s.h - 5.6) * 2, 0, 1) * cl((20 - s.h) * 2, 0, 1);
    if (k < 0.03) return;
    var x = Math.round(w * (0.86 - 0.72 * s.u)), y = Math.round(hz + 4 - Math.sin(Math.PI * s.u) * hz * 0.92);
    // the glow along the horizon under a low sun: wide flat rings, warm
    if (s.golden > 0.08) {
      var gk = s.golden * k, gw = Math.round(w * 0.32), gh = Math.round(hz * 0.34);
      var G = sprite('hglow' + q8(s.sunC) + gw + 'x' + gh, gw * 2 + 2, gh * 2 + 2, function (g) {
        [[1, 0.1], [0.68, 0.13], [0.4, 0.18]].forEach(function (r) { disc(g, gw + 1, gh + 1, Math.round(gw * r[0]), Math.round(gh * r[0]), rgb(s.sunC, r[1])); });
      });
      ctx.globalAlpha = Math.min(1, gk * 1.2); ctx.drawImage(G, x - gw - 1, Math.round(hz - gh * 0.55) - gh - 1); ctx.globalAlpha = 1;
    }
    var r = s.golden > 0.5 ? 7 : 6, S = sprite('sun' + q8(s.sunC) + r, 64, 64, function (g) {
      [[30, 0.07], [20, 0.1], [13, 0.16]].forEach(function (q) { disc(g, 32, 32, q[0], q[0], rgb(s.sunC, q[1])); });
      disc(g, 32, 32, r, r, rgb(mix(s.sunC, [255, 255, 255], 0.35)));
      disc(g, 32, 32, r - 2, r - 2, rgb(mix(s.sunC, [255, 255, 255], 0.75)));
    });
    ctx.globalAlpha = k; ctx.drawImage(S, x - 32, y - 32); ctx.globalAlpha = 1;
  }
  function moon(ctx, w, hz, s) {
    var k = cl((s.night - 0.15) * 2, 0, 1) * (1 - s.thick * 0.85);
    if (k < 0.03) return;
    var u = ((s.h - 19.6 + 24) % 24) / 10.4;
    if (u > 1.05) return;
    var x = Math.round(w * (0.84 - 0.68 * cl(u, 0, 1))), y = Math.round(hz - Math.sin(Math.PI * cl(u, 0.06, 0.94)) * hz * 0.78);
    var ph = typeof BridgeClock !== 'undefined' && BridgeClock.moon ? BridgeClock.moon().phase : 0.5, pk = Math.round(ph * 24);
    var M = sprite('moon' + pk + q8(s.zen), 48, 48, function (g) {
      var p = pk / 24, R = 6, c = 24;
      [[18, 0.06], [11, 0.1]].forEach(function (q) { disc(g, c, c, q[0], q[0], 'rgba(176,196,255,' + q[1] + ')'); });
      disc(g, c, c, R, R, rgb(mix(s.zen, [220, 228, 250], 0.16)));          // the dark of it, earthshine
      var cs = Math.cos(2 * Math.PI * p);
      g.fillStyle = '#eaeff8';
      for (var yy = -R; yy <= R; yy++) {
        var hw = Math.sqrt(Math.max(0, R * R - yy * yy));
        for (var xx = -Math.round(hw); xx <= Math.round(hw); xx++) {
          var lit = p < 0.5 ? xx >= hw * cs : xx <= -hw * cs;
          if (lit) g.fillRect(c + xx, c + yy, 1, 1);
        }
      }
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#c2cce0';     // the seas
      g.fillRect(c - 3, c - 2, 2, 2); g.fillRect(c + 1, c + 1, 2, 1); g.fillRect(c - 1, c + 3, 1, 1); g.fillRect(c + 2, c - 3, 1, 1);
    });
    ctx.globalAlpha = k; ctx.drawImage(M, x - 24, y - 24); ctx.globalAlpha = 1;
  }

  // the stars, drawn once a size: three depths of them and the galaxy's band slanting up the sky (a white layer, laid on
  // at the night's strength); a few bright ones twinkle in steps
  var STARS = { key: '', c: null, bright: [] };
  function stars(ctx, w, hz, s, now, ox) {
    var k = cl((s.night - 0.25) * 1.6, 0, 1) * (1 - s.thick);
    if (k < 0.02) return;
    var key = w + 'x' + hz;
    if (STARS.key !== key) {
      var c = document.createElement('canvas'); c.width = w; c.height = hz;
      var g = c.getContext('2d');
      for (var x = 0; x < w; x++) {                                    // the band: two flat strips, a darker rift down it
        var cy = hz * 0.95 - x * (hz * 0.9 / w) + Math.sin(x / 47) * 4;
        g.fillStyle = 'rgba(200,210,255,0.05)'; g.fillRect(x, Math.round(cy - 22), 1, 44);
        g.fillStyle = 'rgba(210,220,255,0.06)'; g.fillRect(x, Math.round(cy - 10 + Math.sin(x / 19) * 2), 1, 20);
        g.fillStyle = 'rgba(0,0,20,0.08)'; g.fillRect(x, Math.round(cy - 2 + Math.sin(x / 13) * 3), 1, 3);
      }
      var n = Math.round(w * hz / 260);
      for (var i = 0; i < n; i++) {
        var sx = Math.floor(rnd(i * 3.1) * w), sy = Math.floor(rnd(i * 7.7) * hz), dep = rnd(i * 1.3);
        var band = Math.abs(sy - (hz * 0.95 - sx * (hz * 0.9 / w))) < 18;
        if (!band && dep < 0.35) continue;                                // the faint ones crowd the band
        var a = dep > 0.93 ? 1 : dep > 0.7 ? 0.7 : 0.38, tint = rnd(i * 5.3);
        g.fillStyle = tint > 0.85 ? 'rgba(255,214,180,' + a + ')' : tint < 0.15 ? 'rgba(180,200,255,' + a + ')' : 'rgba(240,244,255,' + a + ')';
        g.fillRect(sx, sy, 1, 1);
      }
      STARS.bright = [];
      for (var j = 0; j < 16; j++) STARS.bright.push([Math.floor(rnd(j * 9.1 + 4) * w), Math.floor(rnd(j * 2.9 + 1) * hz * 0.8), j]);
      STARS.key = key; STARS.c = c;
    }
    var o = ((ox % w) + w) % w;
    ctx.globalAlpha = k;
    ctx.drawImage(STARS.c, o - w, 0); ctx.drawImage(STARS.c, o, 0);
    STARS.bright.forEach(function (b) {
      var on = REDUCE || rnd(b[2] * 3.7 + Math.floor(now / 900 + b[2] * 0.37)) > 0.22, x = (b[0] + o) % w, y = b[1];
      ctx.fillStyle = '#f4f6ff'; ctx.fillRect(x, y, 1, 1);
      if (on) { ctx.fillStyle = 'rgba(230,236,255,0.5)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    });
    ctx.globalAlpha = 1;
  }

  // the aurora: curtains in flat bands of green into violet, swaying slowly (redrawn a few times a second, not every frame)
  var AUR = { c: null, at: 0, key: '' };
  function aurora(ctx, w, hz, s, now) {
    var day = Math.floor(Date.now() / 86400000), cold = s.season === 'winter' || s.season === 'autumn' || s.season == null;
    var on = (cold ? rnd(day * 3.3) > 0.3 : rnd(day * 7.7) > 0.75);
    var k = on ? cl((s.night - 0.5) * 2.5, 0, 1) * (1 - s.thick) : 0;
    if (k < 0.03) return;
    var key = w + 'x' + hz;
    if (!AUR.c || AUR.key !== key || (!REDUCE && now - AUR.at > 140)) {
      var c = AUR.c && AUR.key === key ? AUR.c : document.createElement('canvas');
      c.width = w; c.height = hz;
      var g = c.getContext('2d'), t = REDUCE ? 0 : now;
      g.clearRect(0, 0, w, hz);
      for (var x = 0; x < w; x++) {
        var y0 = hz * 0.3 + Math.sin(x / 110 + t / 5200) * hz * 0.08 + Math.sin(x / 37 + t / 2400) * 2;
        var L = hz * (0.1 + 0.12 * (0.5 + 0.5 * Math.sin(x / 63 + t / 3300)));
        var a = Math.round((0.45 + 0.55 * Math.sin(x * 0.7 + Math.sin(x / 23) * 3 + t / 1800) * (0.6 + 0.4 * Math.sin(x / 71 - t / 4100))) * 3) / 3;
        if (a <= 0) continue;
        var yb = Math.round(y0 + L);
        g.fillStyle = 'rgba(190,255,220,' + (0.42 * a).toFixed(2) + ')'; g.fillRect(x, yb - 1, 1, 1);             // the bright lower hem
        g.fillStyle = 'rgba(80,240,160,' + (0.26 * a).toFixed(2) + ')'; g.fillRect(x, Math.round(yb - L * 0.45), 1, Math.round(L * 0.45) - 1);
        g.fillStyle = 'rgba(70,200,180,' + (0.15 * a).toFixed(2) + ')'; g.fillRect(x, Math.round(yb - L * 0.78), 1, Math.round(L * 0.33));
        g.fillStyle = 'rgba(160,90,230,' + (0.1 * a).toFixed(2) + ')'; g.fillRect(x, Math.round(yb - L), 1, Math.round(L * 0.22));
      }
      AUR.c = c; AUR.at = now; AUR.key = key;
    }
    ctx.globalAlpha = k; ctx.drawImage(AUR.c, 0, 0); ctx.globalAlpha = 1;
  }

  // high cloud: wisps of cirrus (drifting) in a strip drawn once per light, and lens clouds parked over the far range's
  // highest peaks (they ride with that range, as lenticulars stand still over their mountain)
  var CIR = { key: '', c: null }, CW = 1536;
  function cirrus(ctx, w, hz, s, now, offX) {
    var key = q8(s.cLit) + q8(s.cSh) + hz;
    if (CIR.key !== key) {
      var H = Math.round(hz * 0.6), c = document.createElement('canvas'); c.width = CW; c.height = H;
      var g = c.getContext('2d');
      for (var i = 0; i < 16; i++) {
        var x0 = Math.floor(rnd(i * 4.1 + 2) * CW), y0 = Math.floor(H * (0.12 + 0.8 * rnd(i * 6.7 + 1))), L = 50 + Math.floor(rnd(i * 2.3) * 120);
        var rows = 2 + Math.floor(rnd(i * 8.9) * 3), bend = (rnd(i * 1.1) - 0.5) * 0.25;
        for (var r = 0; r < rows; r++) {
          var len = Math.round(L * (1 - r * 0.22) * (0.7 + 0.3 * rnd(i * 13 + r))), xs = x0 + Math.round(r * L * 0.12 + rnd(i * 5 + r) * 10);
          for (var dx = 0; dx < len; dx += 2) {
            var yy = Math.round(y0 + r + dx * bend * 0.2 + Math.sin(dx / 23 + i) * 1.2);
            var edge = dx < 8 || dx > len - 10;
            g.fillStyle = rgb(r === 0 && !edge ? s.cLit : s.cMid, edge ? 0.45 : 0.75);
            g.fillRect((xs + dx) % CW, yy, 2, 1);
          }
        }
      }
      CIR.key = key; CIR.c = c;
    }
    var k = (1 - s.night * 0.65) * (0.55 + 0.45 * (1 - s.thick));
    var o = Math.round(-(offX || 0) * 0.008 - (REDUCE ? 0 : now / 7000)) % CW;
    if (o > 0) o -= CW;
    ctx.globalAlpha = k;
    for (var x = o; x < w; x += CW) ctx.drawImage(CIR.c, x, 0);
    ctx.globalAlpha = 1;
  }
  var PEAKS = null;
  function lensClouds(ctx, base, farIm, s, offX, w) {
    if (!farIm) return;
    if (!PEAKS) {                                                       // the far range's three highest summits, well apart
      var c = document.createElement('canvas'); c.width = farIm.naturalWidth; c.height = farIm.naturalHeight;
      var g = c.getContext('2d'); g.drawImage(farIm, 0, 0);
      var d = g.getImageData(0, 0, c.width, c.height).data, tops = [];
      for (var x = 0; x < c.width; x++) { var y = 0; while (y < c.height && !d[(y * c.width + x) * 4 + 3]) y++; tops.push(y); }
      PEAKS = [];
      for (var n = 0; n < 3; n++) {
        var best = -1;
        for (var x2 = 0; x2 < tops.length; x2++) if ((best < 0 || tops[x2] < tops[best]) && PEAKS.every(function (p) { return Math.min(Math.abs(p[0] - x2), tops.length - Math.abs(p[0] - x2)) > 220; })) best = x2;
        if (best >= 0) PEAKS.push([best, tops[best]]);
      }
      PEAKS.W = c.width; PEAKS.H = c.height;
    }
    var k = (1 - s.night * 0.6) * (1 - s.thick * 0.7);
    if (k < 0.05) return;
    var ox = Math.round(-(offX || 0) * 0.015) % PEAKS.W;
    if (ox > 0) ox -= PEAKS.W;
    PEAKS.forEach(function (p, i) {
      var L = sprite('lens' + i + q8(s.cLit) + q8(s.cSh), 110, 26, function (g) {
        var plates = 2 + (i % 2), rx = 34 + i * 6;
        for (var j = 0; j < plates; j++) {
          var cy = 20 - j * 5, r = rx - j * 9;
          disc(g, 55, cy, r, 3, rgb(s.cSh));                              // its shaded underside
          disc(g, 55, cy - 1, r - 2, 2, rgb(s.cMid));
          g.fillStyle = rgb(s.cLit); g.fillRect(55 - Math.round(r * 0.7), cy - 3, Math.round(r * 1.2), 1);    // the lit top
        }
      });
      var y = base - 6 - PEAKS.H + p[1] - 30 - i * 3;
      ctx.globalAlpha = k;
      for (var x = ox + p[0] - 55; x < w; x += PEAKS.W) if (x > -110) ctx.drawImage(L, x, y);
      ctx.globalAlpha = 1;
    });
  }

  // choughs tumbling round the peaks in a loose flock, and now and then a lammergeier gliding across, wings held out
  function birds(ctx, w, hz, s, now) {
    if (s.night > 0.6 || s.thick > 0.6 || REDUCE) return;
    var col = rgb(mix([28, 26, 38], s.hor, 0.25));
    ctx.fillStyle = col;
    var cx = w * (0.5 + 0.34 * Math.sin(now / 41000)), cy = hz * (0.58 + 0.12 * Math.sin(now / 13000));
    for (var i = 0; i < 9; i++) {
      var ang = now / (2600 + i * 310) + i * 2.1, rr = 8 + rnd(i * 3.3) * 26;
      var x = Math.round(cx + Math.cos(ang) * rr * 1.6), y = Math.round(cy + Math.sin(ang) * rr * 0.6 + Math.sin(now / 700 + i) * 2);
      var f = Math.floor(now / 150 + i * 1.7) % 4;
      ctx.fillRect(x, y, 1, 1);
      if (f === 0) { ctx.fillRect(x - 2, y - 1, 2, 1); ctx.fillRect(x + 1, y - 1, 2, 1); }
      else if (f === 2) { ctx.fillRect(x - 2, y + 1, 2, 1); ctx.fillRect(x + 1, y + 1, 2, 1); }
      else { ctx.fillRect(x - 2, y, 2, 1); ctx.fillRect(x + 1, y, 2, 1); }
    }
    var ph = (now / 70000) % 1;                                         // the lammergeier: once every seventy seconds
    if (ph < 0.32) {
      var e = ph / 0.32, ex = Math.round(w * (1.08 - 1.16 * e)), ey = Math.round(hz * (0.3 + 0.12 * e) + Math.sin(e * 9) * 3);
      ctx.fillRect(ex - 6, ey, 13, 1); ctx.fillRect(ex - 4, ey - 1, 3, 1); ctx.fillRect(ex + 2, ey - 1, 3, 1);
      ctx.fillRect(ex - 7, ey + 1, 2, 1); ctx.fillRect(ex + 6, ey + 1, 2, 1); ctx.fillRect(ex + 1, ey + 1, 4, 1);     // its wedge tail
      ctx.fillStyle = rgb(mix([210, 150, 90], s.hor, 0.3)); ctx.fillRect(ex - 1, ey, 2, 1);                           // the rusty head
    }
  }

  function sky(ctx, w, h, now, still) {
    var v = !still && BridgeWorld.getView ? BridgeWorld.getView() : { offY: 0, offX: 0 };
    var s = skyState();
    var base = Math.round(h * 0.64 + v.offY * 0.03), hz = Math.max(20, base - 4);
    bands(ctx, w, hz, s);
    ctx.fillStyle = rgb(s.hor); ctx.fillRect(0, hz, w, h - hz);
    stars(ctx, w, hz, s, now, Math.round(-(v.offX || 0) * 0.004));
    aurora(ctx, w, hz, s, now);
    moon(ctx, w, hz, s);
    sun(ctx, w, hz, s);
    cirrus(ctx, w, hz, s, now, v.offX);
    // the far ranges: three bands of mountains (tools/bridge-art/hoarfell_range.py), coloured for the hour in flat bands,
    // lit from the side the sun's on, scrolled a whole pixel at a time; haze laid flat over each one's lower slopes
    var lay = ranges(s);
    if (lay) {
      lensClouds(ctx, base, RIMG[0], s, v.offX, w);
      [[0, 0.015, -6, 0.25], [1, 0.03, 6, 0.14], [2, 0.05, 16, 0]].forEach(function (L) {
        var c = lay[L[0]], ox = Math.round(-(v.offX || 0) * L[1]) % c.width;
        if (ox > 0) ox -= c.width;
        var y = base + L[2] - c.height;
        for (var x = ox; x < w; x += c.width) ctx.drawImage(c, x, y);
        if (L[3]) {
          ctx.fillStyle = rgb(s.hor, L[3]); ctx.fillRect(0, y + Math.round(c.height * 0.62), w, Math.round(c.height * 0.38));
        }
      });
    }
    birds(ctx, w, hz, s, now);
    clouds(ctx, w, h, base, now, s, v.offX);
  }

  // ---- the ranges' colours through the day: four tones of snow and of rock, the line, the alpenglow on the peaks ----------
  var RPAL = {
    day:   { snow: ['#9aaad4', '#c4d2ec', '#e6eefa', '#fcfdff'], rock: ['#48527a', '#5e6890', '#7a84a8', '#969ebe'], line: '#262a4a', glow: [255, 214, 196], g: 0.04 },
    dusk:  { snow: ['#6a5a90', '#9a7aa8', '#e0949c', '#ffbc98'], rock: ['#33284e', '#463660', '#5e4672', '#7a5480'], line: '#1e1636', glow: [255, 136, 90], g: 0.6 },
    night: { snow: ['#2e3660', '#3e4a78', '#56649a', '#7a8aba'], rock: ['#121628', '#1a2038', '#222a48', '#2c3658'], line: '#080a16', glow: [0, 0, 0], g: 0 }
  };
  var RIMG = null, RCACHE = { key: '', lay: null };
  function ranges(s) {
    if (!RIMG) {
      RIMG = ['far', 'mid', 'near'].map(function (n) {
        var im = new Image(); im.src = '/bridge/assets/backdrops/hoarfell/range_' + n + '.png'; return im;
      });
    }
    if (!RIMG.every(function (im) { return im.complete && im.naturalWidth; })) return RCACHE.lay;
    var W = { night: s.night, dusk: s.golden * (1 - s.night), day: 0 }; W.day = Math.max(0, 1 - W.night - W.dusk);
    // the light from the east in the morning, the west in the evening, both (overhead) about noon; the moon's at night
    var f = s.up ? cl((s.h - 9.5) / 5, 0, 1) : cl(1 - ((s.h - 19.6 + 24) % 24) / 10.4, 0, 1);
    var key = [W.day, W.dusk, W.night, f, s.thick].map(function (x) { return Math.round(x * 16); }).join(',') + q8(s.hor);
    if (RCACHE.key === key && RCACHE.lay) return RCACHE.lay;
    function pm(g) {
      var a = g(RPAL.day), b = g(RPAL.dusk), c = g(RPAL.night);
      if (typeof a === 'string') { a = hex(a); b = hex(b); c = hex(c); }
      if (typeof a === 'number') return a * W.day + b * W.dusk + c * W.night;
      return [0, 1, 2].map(function (i) { return a[i] * W.day + b[i] * W.dusk + c[i] * W.night; });
    }
    var snow = [0, 1, 2, 3].map(function (i) { return pm(function (p) { return p.snow[i]; }); });
    var rock = [0, 1, 2, 3].map(function (i) { return pm(function (p) { return p.rock[i]; }); });
    var line = pm(function (p) { return p.line; }), glow = pm(function (p) { return p.glow; }), gs = pm(function (p) { return p.g; });
    var sk = s.hor;
    RCACHE.lay = RIMG.map(function (im, li) {
      var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      var x = c.getContext('2d'); x.drawImage(im, 0, 0);
      var d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      var haze = Math.min(0.85, [0.36, 0.2, 0.04][li] + s.thick * [0.45, 0.35, 0.25][li]);   // the farther, the more of the sky
      for (var i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        var west = p[i] >> 4, east = p[i] & 15, L = (east + (west - east) * f) / 16;
        var band = Math.min(3, (L * 4) | 0), m = p[i + 1], col;
        if (m === 255) col = line;
        else {
          col = (m === 128 ? snow : rock)[band];
          if (m === 128 && band >= 2) {                         // the alpenglow on the high snow
            var t = Math.pow(p[i + 2] / 255, 2) * gs;
            col = [col[0] + (glow[0] - col[0]) * t, col[1] + (glow[1] - col[1]) * t, col[2] + (glow[2] - col[2]) * t];
          }
        }
        p[i] = Math.round(col[0] + (sk[0] - col[0]) * haze); p[i + 1] = Math.round(col[1] + (sk[1] - col[1]) * haze);
        p[i + 2] = Math.round(col[2] + (sk[2] - col[2]) * haze); p[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      return c;
    });
    RCACHE.key = key;
    return RCACHE.lay;
  }

  // the sea of cloud: rows of banked puffs in four flat tones (the shadowed base, the body, the lit tops, a bright rim on
  // the sun's side at a low sun), laid out once from a seed and drawn once per light into a strip a row; each row slides
  // with its own drift and with the camera at its depth (the far rows slowest), a whole pixel at a time
  var CL = null, CLC = { key: '', rows: null }, SPAN = 1024, ROWH = 96, ROWS = 12;
  function clouds(ctx, w, h, base, now, s, offX) {
    var c0 = s.cSh, c1 = s.cMid, c2 = s.cLit, c3 = mix(mix(s.cLit, [255, 255, 255], 0.45), s.sunC, 0.2);
    var top = base + 4;
    if (!CL) {
      CL = [];
      for (var r = 0; r < ROWS; r++) {
        var bank = [], x = 0, i = 0, sc = 0.62 + r * 0.16;                      // the nearer the row, the bigger its heaps
        while (x < SPAN) {
          var big = rnd(r * 977 + i * 13) < 0.3;
          var rx = ((big ? 24 : 11) + rnd(r * 31 + i * 7) * (big ? 18 : 12)) * sc;
          var pf = { x: x, rx: rx, ry: rx * (0.34 + 0.14 * rnd(i * 3 + r)), dy: Math.round((rnd(i * 5 + r * 17) - 0.5) * 7 * sc), kids: [] };
          if (big) for (var j = 0; j < 2; j++) pf.kids.push([(rnd(i * 7 + j + r) - 0.5) * rx * 0.9, -pf.ry * (0.45 + 0.3 * rnd(i * 2 + j)), rx * (0.32 + 0.16 * rnd(i + j * 5))]);
          bank.push(pf);
          x += rx * (0.8 + 0.8 * rnd(i * 11 + r));
          i++;
        }
        CL.push(bank);
      }
    }
    var key = q8(c0) + q8(c2) + q8(c3) + Math.round(s.golden * 4) + (s.h > 12 ? 'e' : 'm');
    if (CLC.key !== key) {
      var side = s.h > 12 ? -1 : 1;                                          // the sun's side: west in the evening
      CLC.rows = CL.map(function (bank) {
        var cv = document.createElement('canvas'); cv.width = SPAN; cv.height = ROWH;
        var g = cv.getContext('2d'), yy = ROWH - 26;
        function ell(cx, cy, rx, ry) {
          for (var o = -SPAN; o <= SPAN; o += SPAN) {
            var x = cx + o;
            if (x < -rx - 2 || x > SPAN + rx + 2) continue;
            g.beginPath(); g.ellipse(Math.round(x), Math.round(cy), Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry)), 0, 0, Math.PI * 2); g.fill();
          }
        }
        // the shade under every heap, then the bodies (the bumps on the big ones too), the lit caps, a bright rim at a low sun
        g.fillStyle = rgb(c0); bank.forEach(function (p) { ell(p.x, yy + p.dy + 3, p.rx * 1.05, p.ry); });
        g.fillStyle = rgb(c1); bank.forEach(function (p) {
          ell(p.x, yy + p.dy, p.rx * 0.9, p.ry * 0.86);
          p.kids.forEach(function (k) { ell(p.x + k[0], yy + p.dy + k[1], k[2], k[2] * 0.62); });
        });
        g.fillStyle = rgb(c2); bank.forEach(function (p) {
          ell(p.x + side * p.rx * 0.08, yy + p.dy - p.ry * 0.34, p.rx * 0.72, p.ry * 0.52);
          p.kids.forEach(function (k) { ell(p.x + k[0] + side * k[2] * 0.12, yy + p.dy + k[1] - k[2] * 0.2, k[2] * 0.78, k[2] * 0.42); });
        });
        if (s.golden > 0.2) {
          g.fillStyle = rgb(c3); bank.forEach(function (p) {
            p.kids.forEach(function (k) { ell(p.x + k[0] + side * k[2] * 0.3, yy + p.dy + k[1] - k[2] * 0.36, k[2] * 0.42, Math.max(1, k[2] * 0.16)); });
          });
        }
        g.fillStyle = rgb(c0); g.fillRect(0, yy + 8, SPAN, ROWH - yy - 8);
        return cv;
      });
      CLC.key = key;
    }
    ctx.fillStyle = rgb(c0); ctx.fillRect(0, top + 6, w, h - top);
    for (var r3 = 0, yr = top + 2; r3 < CLC.rows.length && yr - 40 < h; r3++) {
      var drift = (REDUCE ? 0 : Math.round(now / (900 + r3 * 350))) * (r3 % 2 ? 1 : -1) - Math.round((offX || 0) * (0.05 + r3 * 0.03));
      var ox = ((drift % SPAN) + SPAN) % SPAN - SPAN;
      for (var x3 = ox; x3 < w; x3 += SPAN) ctx.drawImage(CLC.rows[r3], x3, yr - (ROWH - 26));
      yr += Math.round(7 + r3 * 3.2);
    }
  }

  if (typeof BridgeWorld !== 'undefined') {
    BridgeWorld.registerSceneHooks('hoarfell', {
      over: function (ctx, world, offX, offY, ts, now) {
        over(ctx, world, offX, offY, ts, now);
        if (typeof BridgeSki !== 'undefined') BridgeSki.over(ctx, world, offX, offY, ts, now);
        if (typeof BridgeClimb !== 'undefined') BridgeClimb.over(ctx, world, offX, offY, ts, now);
      },
      ground: function (ctx, world, offX, offY, ts, now) { if (typeof BridgeSki !== 'undefined') BridgeSki.ground(ctx, world, offX, offY, ts, now); },
      items: function (world, offX, offY, ts, now) { return typeof BridgeSki !== 'undefined' ? BridgeSki.items(world, offX, offY, ts, now) : []; }
    });
    BridgeWorld.registerBackground('hoarfell', sky);
  }

  // Inge's waxing bench (the ski hire): a hot coat on the bases, runs quicker for twenty minutes (js/ski.js)
  var WAX = 10;
  function waxBench() {
    var have = typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount('skis') > 0;
    if (!have) return say('WAX BENCH', 'INGE LOOKS AT YOUR EMPTY HANDS. "I CAN WAX THEM WHEN YOU HAVE THEM. THE COUNTER\'S RIGHT THERE."');
    if (typeof BridgeSki !== 'undefined' && BridgeSki.waxed()) return say('WAX BENCH', 'YOUR BASES STILL SHINE FROM THE LAST COAT. "ANY MORE AND YOU\'LL BE SKIING ON NOTHING," SAYS INGE.');
    BridgeInteractions.choose({
      title: 'The wax bench',
      text: 'INGE CLAMPS YOUR SKIS IN THE VICE, BASE UP, AND LETS THE IRON WARM. "A HOT COAT. YOU\'LL FEEL IT ON THE FLATS. ' + WAX + ' COINS."',
      rows: [{ label: 'Wax them', sub: 'quicker runs for twenty minutes', note: WAX + ' coins', pick: function () {
        BridgeProgression.wagerCoins(WAX, 'ski_wax').then(function (r) {
          if (!r || !r.ok) return say('WAX BENCH', '"' + WAX + ' COINS. WAX ISN\'T FREE AND NEITHER AM I."');
          if (typeof BridgeSki !== 'undefined') BridgeSki.wax(20);
          sfx('swish');
          say('WAX BENCH', 'THE IRON HISSES ALONG THE BASES, THE WAX MELTS AND SMELLS OF BERRIES. SHE SCRAPES IT BACK TO A SHINE. "THERE. NOW YOU\'RE QUICK."\n\nYOUR SKIS RUN QUICKER FOR TWENTY MINUTES.');
        });
      } }],
      closeLabel: 'Not now'
    });
  }

  // the same evening as a view, sitting on the summit bench (js/actions.js 'peaks')
  function vista(ctx, w, h, now) { sky(ctx, w, h, now, true); }

  return { use: use, warm: warm, ski: ski, race: race, climbRace: climbRace, vista: vista, isWarm: function () { return suited() || Date.now() < save.warm; } };
})();
