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
  function warm(minutes) { save.warm = Date.now() + minutes * 60000; store(); coldSince = 0; }
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

  // the summit's sky: the range under the sky, a sea of cloud below the rim. Its colours follow the place's own render
  // through the day (BridgeScene.sky: day, dusk and night weights) — the alpenglow Hoarfell is lit by, a deeper dusk,
  // a moonlit night with the stars out; a render with only the one state keeps the alpenglow.
  var PAL = {                    // sky top → horizon, the far and near range (fill, lit rim), the cloud sea (base, tops)
    day:   { sky: ['#3a5698', '#6a8cc8', '#a8c0e4', '#f2dcd4'], far: ['#8a7ab0', '#ffd0c0'], near: ['#6a6098', '#f0b0b8'], cloud: ['#bcc6e0', '#dfe6f4', '#f6f8fc'], glow: [255, 230, 200] },
    dusk:  { sky: ['#140e34', '#4a1e52', '#b04a5a', '#f08a5a'], far: ['#5a4a80', '#ffa080'], near: ['#46406e', '#e08070'], cloud: ['#9a7a9a', '#c08a98', '#d89aa0'], glow: [255, 150, 90] },
    night: { sky: ['#03040e', '#0a1028', '#18224a', '#2a3660'], far: ['#1e2440', '#8090c0'], near: ['#161a32', '#6070a0'], cloud: ['#2a3050', '#3a4268', '#46507a'], glow: [190, 210, 255] }
  };
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function blend(w, f) {         // the three palettes' colour f, weighted
    var a = hex(f(PAL.day)), b = hex(f(PAL.dusk)), c = hex(f(PAL.night));
    return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] * w.day + b[i] * w.dusk + c[i] * w.night); }).join(',') + ')';
  }
  function skyWeights() {
    var wd = BridgeWorld.getWorld && BridgeWorld.getWorld(), id = wd && wd.scene && wd.scene.id;
    var k = id && typeof BridgeScene !== 'undefined' && BridgeScene.sky ? BridgeScene.sky(id) : null;
    return k ? { day: k.day, dusk: k.dusk, night: k.night } : { day: 1, dusk: 0, night: 0 };
  }
  function sky(ctx, w, h, now, still) {
    var v = !still && BridgeWorld.getView ? BridgeWorld.getView() : { offY: 0, offX: 0 };
    var W = skyWeights();
    var g = ctx.createLinearGradient(0, 0, 0, h);
    [0, 0.4, 0.7, 1].forEach(function (at, i) { g.addColorStop(at, blend(W, function (p) { return p.sky[i]; })); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var starK = 0.05 * W.day + 0.95 * W.night + 0.45 * W.dusk;
    for (var i = 0; i < (W.night > 0.3 ? 110 : 50); i++) {
      var a = (0.25 + 0.35 * Math.abs(Math.sin(now / 1300 + i * 1.7))) * starK;
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, a).toFixed(2) + ')';
      ctx.fillRect((i * 137 + 11) % w, (i * 71) % Math.round(h * (i < 50 ? 0.35 : 0.55)), 1, 1);
    }
    var sunX = w * 0.2, sunY = h * (0.5 + 0.08 * W.dusk) + v.offY * 0.02;
    var gl = PAL.day.glow.map(function (c, i) { return Math.round(c * W.day + PAL.dusk.glow[i] * W.dusk); }), ga = W.day + W.dusk;
    if (ga > 0.02) {
      var sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.35);
      sg.addColorStop(0, 'rgba(' + gl + ',' + (0.9 * ga).toFixed(2) + ')'); sg.addColorStop(0.08, 'rgba(' + gl + ',' + (0.6 * ga).toFixed(2) + ')'); sg.addColorStop(1, 'rgba(' + gl + ',0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    }
    if (W.night > 0.05) {                                      // the moon, high in the east, with a cold halo
      var mx = Math.round(w * 0.74), my = Math.round(h * 0.16), mg = ctx.createRadialGradient(mx, my, 0, mx, my, h * 0.18);
      mg.addColorStop(0, 'rgba(190,210,255,' + (0.35 * W.night).toFixed(2) + ')'); mg.addColorStop(1, 'rgba(190,210,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = Math.min(1, W.night * 1.4);
      ctx.fillStyle = '#e8eef8'; ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c4cee0'; ctx.fillRect(mx - 2, my - 1, 2, 2); ctx.fillRect(mx + 1, my + 2, 1, 1);
      ctx.globalAlpha = 1;
    }
    // the far ranges: three bands of mountains (tools/bridge-art/hoarfell_range.py), coloured for the hour in flat bands,
    // scrolled a whole pixel at a time; the sea of cloud below them, banked and drifting
    var base = Math.round(h * 0.64 + v.offY * 0.03);
    var lay = ranges(W);
    if (lay) {
      [[0, 0.015, -6], [1, 0.03, 6], [2, 0.05, 16]].forEach(function (L) {
        var c = lay[L[0]], ox = Math.round(-(v.offX || 0) * L[1]) % c.width;
        if (ox > 0) ox -= c.width;
        var y = base + L[2] - c.height;
        for (var x = ox; x < w; x += c.width) ctx.drawImage(c, x, y);
      });
    }
    clouds(ctx, w, h, base, now, W);
  }

  // ---- the ranges' colours through the day: four tones of snow and of rock, the line, the alpenglow on the peaks ----------
  var RPAL = {
    day:   { snow: ['#9aa6d0', '#c0cce8', '#e4ecf8', '#fbfcff'], rock: ['#48527a', '#5e6890', '#7a84a8', '#969ebe'], line: '#262a4a', glow: [255, 214, 196], g: 0.18 },
    dusk:  { snow: ['#6a5a90', '#9a7aa8', '#d8909c', '#ffb898'], rock: ['#33284e', '#463660', '#5e4672', '#7a5480'], line: '#1e1636', glow: [255, 136, 90], g: 0.55 },
    night: { snow: ['#2e3660', '#3e4a78', '#56649a', '#7a8aba'], rock: ['#121628', '#1a2038', '#222a48', '#2c3658'], line: '#080a16', glow: [0, 0, 0], g: 0 }
  };
  var RIMG = null, RCACHE = { key: '', lay: null };
  function ranges(W) {
    if (!RIMG) {
      RIMG = ['far', 'mid', 'near'].map(function (n) {
        var im = new Image(); im.src = '/bridge/assets/backdrops/hoarfell/range_' + n + '.png'; return im;
      });
    }
    if (!RIMG.every(function (im) { return im.complete && im.naturalWidth; })) return RCACHE.lay;
    var key = [W.day, W.dusk, W.night].map(function (x) { return Math.round(x * 20); }).join(',');
    if (RCACHE.key === key && RCACHE.lay) return RCACHE.lay;
    function mix(f) {
      var a = f(RPAL.day), b = f(RPAL.dusk), c = f(RPAL.night);
      if (typeof a === 'string') { a = hex(a); b = hex(b); c = hex(c); }
      if (typeof a === 'number') return a * W.day + b * W.dusk + c * W.night;
      return [0, 1, 2].map(function (i) { return a[i] * W.day + b[i] * W.dusk + c[i] * W.night; });
    }
    var snow = [0, 1, 2, 3].map(function (i) { return mix(function (p) { return p.snow[i]; }); });
    var rock = [0, 1, 2, 3].map(function (i) { return mix(function (p) { return p.rock[i]; }); });
    var line = mix(function (p) { return p.line; }), glow = mix(function (p) { return p.glow; }), gs = mix(function (p) { return p.g; });
    RCACHE.lay = RIMG.map(function (im, li) {
      var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      var x = c.getContext('2d'); x.drawImage(im, 0, 0);
      var d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      var haze = [0.35, 0.18, 0][li];                          // the farther, the more of the sky's colour
      var sk = mix(function (q) { return q.sky[3]; });
      for (var i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        var band = Math.min(3, (p[i] / 64) | 0), m = p[i + 1], col;
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
  RPAL.day.sky = PAL.day.sky; RPAL.dusk.sky = PAL.dusk.sky; RPAL.night.sky = PAL.night.sky;

  // the sea of cloud: banks of puffs in three flat tones (shadowed base, body, lit tops), each bank its own drift, laid out
  // once from a seed so they never shuffle; a whole pixel at a time
  var CL = null;
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function clouds(ctx, w, h, base, now, W) {
    var c0 = blend(W, function (p) { return p.cloud[0]; }), c1 = blend(W, function (p) { return p.cloud[1]; }), c2 = blend(W, function (p) { return p.cloud[2]; });
    var top = base + 4, span = 1024;
    if (!CL) {
      CL = [];
      for (var r = 0; r < 6; r++) {
        var bank = [], x = 0, i = 0;
        while (x < span) {
          var big = rnd(r * 977 + i * 13) < 0.25;
          var rx = (big ? 26 : 12) + rnd(r * 31 + i * 7) * (big ? 20 : 14) + r * 2;
          bank.push({ x: x, rx: rx, ry: rx * (0.32 + 0.12 * rnd(i * 3 + r)), dy: Math.round((rnd(i * 5 + r * 17) - 0.5) * 6) });
          x += rx * (0.9 + 0.7 * rnd(i * 11 + r));
          i++;
        }
        CL.push(bank);
      }
    }
    ctx.fillStyle = c0; ctx.fillRect(0, top + 6, w, h - top);
    for (var r2 = 0; r2 < CL.length; r2++) {
      var yy = top + 4 + r2 * (8 + r2 * 2), drift = Math.round(now / (900 + r2 * 400)) * (r2 % 2 ? 1 : -1);
      for (var pass = 0; pass < 3; pass++) {
        ctx.fillStyle = [c0, c1, c2][pass];
        CL[r2].forEach(function (p) {
          var cx = ((p.x + drift) % span + span) % span;
          for (var o = cx - span; o < w + p.rx; o += span) {
            if (o < -p.rx * 2) continue;
            var k = [1, 0.86, 0.5][pass], up = [0, -2, -p.ry * 0.45][pass];
            ctx.beginPath(); ctx.ellipse(Math.round(o), Math.round(yy + p.dy + up + (pass ? 0 : 2)), Math.round(p.rx * k), Math.max(2, Math.round(p.ry * k)), 0, 0, Math.PI * 2); ctx.fill();
          }
        });
      }
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
