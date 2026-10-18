/**
 * BridgeBows — bows and arrows (Sylvara; Beck: "not exactly sure how that functionality would work, but I think it's cool").
 *
 * THE BOW is a weapon class of its own (js/arms.js `bow`): hold F (B on touch, the right button) to draw — nock, half,
 * full in DRAW_MS — and let go to loose. The longer the draw, the further and harder it flies: a quick snap goes a few
 * tiles for a third of the damage, a full draw RANGE tiles for ×1.25. Arrows fly like the wand's bolts, down the way
 * you face, through the air over low things (a world's `arrows: 'open'` lets them fly over every gap — the canopy),
 * stopped by walls and trunks; they hit the first creature they meet and stick in what stops them for a while. Every
 * pilot in the same place sees your shots (`atk` with the draw's power; js/arms.js remote → BridgeBows.ghost).
 *   Elven Bow       30, up to 10 tiles — Corin the bowyer in the Rootmarket, 260
 *   Heartwood Longbow 46, up to 12 — Aerin's prize at the range (a round of 90), or the bowyer's for 1200
 * Plain arrows are free (the bow's own); SPECIAL ARROWS are items, used from the hotbar with a bow in your pack (the
 * bow comes to your hands, F held draws it, let go): rope arrows rig a zip line where a world says one can go,
 * fire arrows light lanterns out of reach (and burn what they hit).
 *
 * WHAT ARROWS DO in a world (its JSON, or added as the world loads by js/worlds/sylvara.js):
 *   range    { line: [x0, x1, y], lanes: [{ y, x0, x1, speed, size }], flag: [x, y] } — Aerin's archery range: stand on
 *            the line, face up, ten arrows at targets sliding along their rails, the wind blowing them sideways (the
 *            pennant shows it). Scored by how near the middle (10, 8, 6, 4, 2). Prizes the first time: 60 fire
 *            arrows, 80 rope arrows, 90 the Heartwood Longbow. Best score kept.
 *   zips     [{ id, from: [x, y], to: [x, y], anchor: [x, y] }] — a rope arrow from `from` into the anchor tree rigs a
 *            line; E at either end rides it across (the pilot hangs from the line, sliding).
 *   lanterns [{ id, at: [x, y], h, group }] — high lanterns a fire arrow lights; a group all lit says so (`groupLit`).
 *   switches [{ id, at: [x, y], h, opens: [[x, y], …], what }] — a leaf target on a rope; hit, it lets something down
 *            (a rope ladder) and the cells it opens stay walkable.
 * Kept in localStorage bridge_bows: { best, prizes, zips, lit, switched }.
 *
 *   BridgeBows.loose(shot) — js/arms.js, on the loose's landing frame; .ghost(pos, facing, power, arrow) — someone else's
 *   BridgeBows.use(inter) — the range, a zip line; .decorate(id, data) — walkability for rigged zips and thrown switches
 */
var BridgeBows = (function () {
  var KEY = 'bridge_bows', DRAW_RANGE = 10, MIN_RANGE = 3;
  var st = load();
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { best: d.best || 0, prizes: d.prizes || {}, zips: d.zips || {}, lit: d.lit || {}, switched: d.switched || {}, rounds: d.rounds || 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* private mode */ } }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function say(t, x) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(t, x); }
  function toast(k, t, sub) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(k, t, sub); }
  function floatText(x, y, t, c) { if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(x, y, t, c); }
  function inv() { return typeof BridgeInventory !== 'undefined' ? BridgeInventory : null; }
  function count(id) { return inv() ? inv().getCount(id) : 0; }
  var DV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

  // ---- the items: two bows, two kinds of arrow --------------------------------------------------------------------
  function pix(ctx, x, y, s, col, cells) {
    var u = s / 16;
    ctx.fillStyle = col;
    cells.forEach(function (c) { ctx.fillRect(x + c[0] * u, y + c[1] * u, (c[2] || 1) * u, (c[3] || 1) * u); });
  }
  function bowIcon(wood, light, cap) {
    return function (ctx, x, y, s) {
      // the stave bowed to the right, the string down the left, an outline round both
      var stave = [[6, 1], [8, 2], [9, 3], [10, 4], [10, 5], [11, 6], [11, 7], [11, 8], [11, 9], [10, 10], [10, 11], [9, 12], [8, 13], [6, 14]];
      pix(ctx, x, y, s, '#0b0a18', stave.map(function (p) { return [p[0] - 1, p[1] - 1, 3, 3]; }).concat([[4, 0, 3, 16]]));
      pix(ctx, x, y, s, wood, stave);
      pix(ctx, x, y, s, light, [[10, 5], [11, 7], [11, 8], [10, 10]]);
      pix(ctx, x, y, s, '#3a2a1a', [[11, 7, 1, 2]]);
      pix(ctx, x, y, s, cap, [[6, 1], [6, 14]]);
      pix(ctx, x, y, s, '#ece4d4', [[5, 1, 1, 14]]);
    };
  }
  function arrowIcon(head, extra) {
    return function (ctx, x, y, s) {
      var shaft = [];
      for (var i = 0; i < 10; i++) shaft.push([3 + i, 12 - i]);
      pix(ctx, x, y, s, '#0b0a18', shaft.map(function (p) { return [p[0] - 1, p[1] - 1, 3, 3]; }).concat([[11, 1, 5, 5], [1, 10, 5, 5]]));
      pix(ctx, x, y, s, '#a07a48', shaft);
      pix(ctx, x, y, s, head, [[12, 2, 3, 3], [13, 2, 2, 1], [14, 3, 1, 2]]);
      pix(ctx, x, y, s, '#8ab858', [[2, 11, 3, 3], [2, 13, 1, 1]]);
      if (extra) extra(ctx, x, y, s);
    };
  }
  var ropeExtra = function (ctx, x, y, s) { pix(ctx, x, y, s, '#d8c090', [[6, 7], [7, 8], [8, 8], [9, 9], [9, 10], [8, 11], [7, 11]]); };
  var fireExtra = function (ctx, x, y, s) { pix(ctx, x, y, s, '#ffa040', [[12, 0, 2, 2], [14, 1]]); pix(ctx, x, y, s, '#fff0a0', [[13, 1]]); };
  function bowUse() {
    if (typeof BridgeArms !== 'undefined' && BridgeArms.press(this)) return false;
    loose({ power: 0.6, item: this, facing: BridgeCharacter.getFacing() });        // no art yet: a plain shot
    return false;
  }
  function bestBow() {
    return ['heartwood_bow', 'elven_bow'].filter(function (id) { return count(id) > 0; }).map(function (id) { return BridgeItems.get(id); })[0] || null;
  }
  function arrowUse() {
    var bow = bestBow(), id = this.id;
    if (!bow) { floatText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.4, 'NO BOW', '#ffe0a0'); sfx('error'); return false; }
    if (typeof BridgeArms !== 'undefined' && BridgeArms.draw({ item: bow, cls: 'bow', arrow: id })) return false;
    loose({ power: 0.8, item: bow, arrow: id, facing: BridgeCharacter.getFacing() });
    return false;
  }
  var ITEMS = {
    elven_bow:     { id: 'elven_bow', name: 'Elven Bow', desc: 'Corin\'s work: elm and horn, gold leaves set either side of the grip. Hold F to draw, let go to loose — the longer the draw, the further and harder it flies.',
                     type: 'weapon', stackable: false, draw: bowIcon('#8a6440', '#c8a070', '#e0b040'), damage: 30, range: 10, cls: 'bow', value: 110, onUse: bowUse },
    heartwood_bow: { id: 'heartwood_bow', name: 'Heartwood Longbow', desc: 'Cut from a fallen limb of the Great Tree, a moon-leaf of silver set in it. Taller than you are. Hold F to draw: it reaches twelve tiles.',
                     type: 'weapon', stackable: false, draw: bowIcon('#a06a38', '#d8a468', '#c8e8e0'), damage: 46, range: 12, cls: 'bow', value: 420, onUse: bowUse },
    rope_arrow:    { id: 'rope_arrow', name: 'Rope Arrow', desc: 'An arrow with a grapnel head and a line of elven cord behind it. Loosed into an anchor tree across a gap, it rigs a zip line. Use it with a bow in your pack.',
                     type: 'tool', stackable: true, draw: arrowIcon('#9aa4b8', ropeExtra), value: 12, onUse: arrowUse },
    fire_arrow:    { id: 'fire_arrow', name: 'Fire Arrow', desc: 'Pitch-soaked tow behind the head, lit as it\'s loosed. It lights a lantern out of reach, and sets what it hits burning. Use it with a bow in your pack.',
                     type: 'tool', stackable: true, draw: arrowIcon('#ffa040', fireExtra), value: 8, burn: true, onUse: arrowUse }
  };
  function register() {
    if (typeof BridgeItems === 'undefined' || !BridgeItems.all) return;
    var all = BridgeItems.all();
    Object.keys(ITEMS).forEach(function (id) { if (!all[id]) all[id] = ITEMS[id]; });
  }
  register();

  // ---- arrows in the air ------------------------------------------------------------------------------------------
  var arrows = [], stuck = [];
  /** The loose's landing frame (js/arms.js): the arrow leaves with what the draw had. */
  function loose(shot) {
    var world = BridgeWorld.getWorld();
    if (!world) return;
    var arrow = shot.arrow || null;
    if (arrow && inv()) {
      if (count(arrow) <= 0) arrow = null;
      else inv().removeItem(arrow, 1);
    }
    var item = shot.item || bestBow() || ITEMS.elven_bow, p = Math.max(0.2, Math.min(1, shot.power || 0.5));
    var max = item.range || DRAW_RANGE, range = MIN_RANGE + (max - MIN_RANGE) * p;
    var dmg = Math.max(1, Math.round((item.damage || 30) * (0.35 + 0.65 * p) * (p >= 1 ? 1.25 : 1)));
    var w = Object.create(item);
    w.cls = 'bow';
    if (arrow === 'fire_arrow') w.burn = true;
    if (p >= 1) w.charged = true;
    var pos = BridgeCharacter.getRenderPos();
    fly({ x: pos.x + 0.5, y: pos.y + 0.55, facing: shot.facing || BridgeCharacter.getFacing(), range: range, speed: 11 + 9 * p, dmg: dmg, w: w,
          kind: arrow === 'rope_arrow' ? 'rope' : arrow === 'fire_arrow' ? 'fire' : 'plain', mine: true, full: p >= 1 });
    if (range && rangeGame && rangeGame.on) rangeGame.shot(arrows[arrows.length - 1]);
  }
  /** Someone else's arrow on your screen (js/arms.js remoteTick): only to see — the hits are theirs. */
  function ghost(pos, facing, power, arrow) {
    var p = Math.max(0.2, Math.min(1, power || 0.5));
    fly({ x: pos.x + 0.5, y: pos.y + 0.55, facing: facing, range: MIN_RANGE + (DRAW_RANGE - MIN_RANGE) * p, speed: 11 + 9 * p,
          kind: arrow === 'rope_arrow' ? 'rope' : arrow === 'fire_arrow' ? 'fire' : 'plain', mine: false });
  }
  function fly(a) {
    var d = DV[a.facing] || [0, 1], world = BridgeWorld.getWorld();
    a.dx = d[0]; a.dy = d[1]; a.d = 0; a.t = 0; a.struck = [];
    a.wind = world && world._wind || 0;
    a.x0 = a.x; a.y0 = a.y;
    a.lift = 14;                                          // px over its shadow: it leaves at shoulder height and falls a little
    arrows.push(a);
  }
  function blockedAt(world, x, y) {
    if (world.arrows === 'open') return false;
    var tx = Math.floor(x), ty = Math.floor(y + 0.2);
    return !!(world.collisions && world.collisions[ty] && world.collisions[ty][tx]);
  }
  function step(dt) {
    var world = BridgeWorld.getWorld();
    if (!world) { arrows = []; return; }
    arrows = arrows.filter(function (a) {
      var s = a.speed * dt;
      a.t += dt; a.d += s;
      a.x += a.dx * s; a.y += a.dy * s;
      // the wind takes it sideways, more the longer it's in the air
      if (a.wind) { var push = a.wind * 1.4 * a.t * dt; a.x += Math.abs(a.dy) * push; a.y += Math.abs(a.dx) * push * 0.6; }
      a.lift = 14 - 9 * Math.pow(a.d / a.range, 2);
      if (a.mine) {
        var hit = world.interactions.filter(function (it) {
          return it.type === 'hostile' && a.struck.indexOf(it) < 0 && Math.abs(it.x + 0.5 - a.x) < 0.6 && Math.abs(it.y + 0.6 - a.y) < 0.65;
        })[0];
        if (hit) {
          a.struck.push(hit);
          var dmg = typeof BridgeCombat !== 'undefined' && BridgeCombat.damageFor ? Math.round(BridgeCombat.damageFor(a.w, hit) * a.dmg / (a.w.damage || a.dmg)) : a.dmg;
          BridgeItems.strike(world, hit, Math.max(1, dmg), a.w);
          sfx('impact_bow');
          if (typeof BridgeWorld !== 'undefined' && BridgeWorld.kick) BridgeWorld.kick(a.dx, a.dy, a.full ? 2 : 1);
          return false;
        }
        if (marks(world, a)) return false;
      }
      if (a.d > 0.7 && blockedAt(world, a.x, a.y)) { land(a, true); return false; }
      if (a.d >= a.range) { land(a, false); return false; }
      return true;
    });
    var now = performance.now();
    stuck = stuck.filter(function (s) { return now - s.at < 9000; });
  }
  function land(a, thunk) {
    stuck.push({ x: a.x - a.dx * (thunk ? 0.35 : 0), y: a.y - a.dy * (thunk ? 0.35 : 0), dx: a.dx, dy: a.dy, kind: a.kind, wall: thunk, at: performance.now(),
                 world: BridgeWorld.getWorldId && BridgeWorld.getWorldId() });
    if (thunk) sfx('arrow_thunk');
    if (a.mine && rangeGame && rangeGame.on && a.scored == null) rangeGame.miss(a);
  }

  // ---- what an arrow can do: targets on the range, anchors, lanterns, switches ------------------------------------------
  function near(a, at, r) { return Math.abs(at[0] + 0.5 - a.x) < (r || 0.55) && Math.abs(at[1] + 0.5 - a.y) < (r || 0.55); }
  function marks(world, a) {
    if (rangeGame && rangeGame.on && rangeGame.check(a)) return true;
    var hitIt = false;
    (world.zips || []).forEach(function (z) {
      if (hitIt || !near(a, z.anchor, 0.7)) return;
      hitIt = true;
      if (a.kind !== 'rope') { stuck.push({ x: a.x, y: a.y, dx: a.dx, dy: a.dy, kind: a.kind, wall: true, at: performance.now(), world: BridgeWorld.getWorldId() }); sfx('arrow_thunk'); return; }
      if (!st.zips[z.id]) {
        st.zips[z.id] = Date.now(); store();
        sfx('quest');
        toast('Zip line', 'Rigged', 'E at either end to ride it');
        floatText(z.anchor[0], z.anchor[1] - 0.6, 'RIGGED', '#f0e0a0');
        rigZips(world);
      }
    });
    if (hitIt) return true;
    (world.lanterns || []).forEach(function (l) {
      if (hitIt || !near(a, l.at, 0.6)) return;
      hitIt = true;
      if (a.kind !== 'fire') { sfx('arrow_thunk'); return; }
      if (!st.lit[l.id]) {
        st.lit[l.id] = Date.now(); store();
        sfx('chime');
        floatText(l.at[0], l.at[1] - 0.8, 'LIT', '#ffd890');
        var g = (world.lanterns || []).filter(function (o) { return o.group === l.group; });
        if (l.group && g.every(function (o) { return st.lit[o.id]; })) {
          sfx('quest');
          if (typeof BridgeSylvara !== 'undefined' && BridgeSylvara.groupLit) BridgeSylvara.groupLit(l.group, world);
        }
      }
    });
    if (hitIt) return true;
    (world.switches || []).forEach(function (sw) {
      if (hitIt || !near(a, sw.at, 0.6)) return;
      hitIt = true;
      if (!st.switched[sw.id]) {
        st.switched[sw.id] = Date.now(); store();
        sfx('quest');
        floatText(sw.at[0], sw.at[1] - 0.6, (sw.what || 'SOMETHING GIVES').toUpperCase(), '#f0e0a0');
        openSwitch(world, sw);
      }
    });
    return hitIt;
  }
  function openSwitch(world, sw) {
    (sw.opens || []).forEach(function (c) { if (world.collisions[c[1]]) world.collisions[c[1]][c[0]] = 0; });
    sw._open = performance.now();
  }
  function rigZips(world) {
    world.interactions = (world.interactions || []).filter(function (it) { return !it._zip; });
    (world.zips || []).forEach(function (z) {
      if (!st.zips[z.id]) return;
      [[z.from, z.to], [z.to, z.from]].forEach(function (ends) {
        world.interactions.push({ x: ends[0][0], y: ends[0][1], type: 'sylvan', kind: 'zip', zip: z.id, from: ends[0], to: ends[1], _zip: true,
                                  label: 'ZIP LINE', prompt: 'PRESS E TO RIDE ACROSS', verb: 'Ride' });
      });
    });
  }
  /** As a world loads: rigged zip lines get their rides, thrown switches stay open, the range's wind. */
  function decorate(worldId, data) {
    if (!data) return;
    if (data.zips) rigZips(data);
    (data.switches || []).forEach(function (sw) { if (st.switched[sw.id]) (sw.opens || []).forEach(function (c) { if (data.collisions && data.collisions[c[1]]) data.collisions[c[1]][c[0]] = 0; }); });
    if (data.range) data._wind = windNow();
  }
  function isLit(id) { return !!st.lit[id]; }

  // ---- riding a zip line ----------------------------------------------------------------------------------------------
  var ride = null;
  function zip(inter) {
    if (ride || typeof BridgeCharacter === 'undefined' || !BridgeCharacter.setPose) return;
    var a = inter.from, b = inter.to, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    ride = { a: a, b: b, t0: performance.now(), dur: 500 + L * 260, facing: Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) ? (b[0] > a[0] ? 'right' : 'left') : (b[1] > a[1] ? 'down' : 'up') };
    sfx('dodge');
    BridgeCharacter.setFacing(ride.facing);
  }
  function rideTick() {
    if (!ride) return;
    var k = Math.min(1, (performance.now() - ride.t0) / ride.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    var x = ride.a[0] + (ride.b[0] - ride.a[0]) * e + 0.5, y = ride.a[1] + (ride.b[1] - ride.a[1]) * e + 1;
    var sag = Math.sin(e * Math.PI) * 10;                                  // the line sags in the middle: hanging lower there
    var row = { down: 0, right: 1, up: 2, left: 3 }[ride.facing];
    BridgeCharacter.setPose({ kind: 'walk', x: x, y: y, row: row, col: 1, lift: 40 - sag });
    if (k >= 1) {
      BridgeCharacter.setPose(null);
      if (BridgeCharacter.init) {
        var f = ride.facing;
        BridgeCharacter.init(ride.b[0], ride.b[1]);
        BridgeCharacter.setFacing(f);
      }
      ride = null;
      sfx('step');
    }
  }

  // ---- the archery range ---------------------------------------------------------------------------------------------
  // the wind: the same for everyone at the same minute (a slow walk through a few strengths), so two pilots shooting
  // together read the same pennant
  function windNow() {
    var m = Math.floor(Date.now() / 60000), h = Math.sin(m * 12.9898) * 43758.5453;
    return Math.round(((h - Math.floor(h)) * 2 - 1) * 4) / 4;           // -1 .. 1 in quarters
  }
  function windWords(w) {
    if (!w) return 'STILL AIR';
    var s = Math.abs(w) >= 0.75 ? 'A STRONG WIND' : Math.abs(w) >= 0.5 ? 'A STEADY WIND' : 'A LIGHT WIND';
    return s + ' FROM THE ' + (w > 0 ? 'WEST' : 'EAST');
  }
  var rangeGame = null;
  function rangeStart(world) {
    var bow = BridgeArms && BridgeInventory && BridgeItems.get(BridgeInventory.getSelectedItemId && BridgeInventory.getSelectedItemId());
    if (!bestBow()) {
      say('AERIN', '"YOU\'LL WANT A BOW FOR THAT. CORIN AT THE BOWYER\'S HAS ONE THAT WON\'T EMBARRASS YOU. THE GOOD ONES YOU EARN HERE."');
      return;
    }
    if (!(bow && bow.cls === 'bow')) {
      say('AERIN', '"BOW IN HAND, THEN. SELECT IT ON YOUR BELT AND COME BACK TO THE LINE."');
      return;
    }
    world._wind = windNow();
    rangeGame = { on: true, left: 10, score: 0, shots: [], t0: performance.now(), world: BridgeWorld.getWorldId() };
    rangeGame.shot = function (a) { if (a) { a.ranged = true; rangeGame.left--; } };
    rangeGame.check = function (a) {
      if (!a.ranged) return false;
      var R = world.range;
      for (var i = 0; i < R.lanes.length; i++) {
        var L = R.lanes[i], tx = laneX(L, performance.now());
        if (Math.abs(a.y - (L.y + 0.5)) < 0.3 && Math.abs(a.x - tx) < (L.size || 0.5)) {
          var off = Math.abs(a.x - tx) / (L.size || 0.5), pts = off < 0.18 ? 10 : off < 0.4 ? 8 : off < 0.6 ? 6 : off < 0.8 ? 4 : 2;
          if (L.far) pts = Math.round(pts * 1.5);
          a.scored = pts;
          rangeGame.score += pts;
          rangeGame.shots.push(pts);
          stuck.push({ x: a.x, y: a.y, dx: a.dx, dy: a.dy, kind: a.kind, wall: true, at: performance.now(), world: rangeGame.world, ride: L, off: a.x - tx });
          sfx(pts >= 10 ? 'coin' : 'arrow_thunk');
          floatText(a.x - 0.5, a.y - 1, pts >= 10 ? 'BULLSEYE' : '+' + pts, pts >= 10 ? '#ffe080' : '#f0e0a0');
          after();
          return true;
        }
      }
      return false;
    };
    rangeGame.miss = function (a) { if (!a.ranged) return; a.scored = 0; rangeGame.shots.push(0); after(); };
    function after() { if (rangeGame.shots.length >= 10) setTimeout(finish, 700); }
    say('AERIN', '"TEN ARROWS. THE MARKS RUN ON THEIR RAILS; THE FAR ONES COUNT HALF AGAIN. ' + windWords(world._wind) +
      ' TODAY - WATCH THE PENNANT AND AIM INTO IT. A FULL DRAW REACHES THE BACK. STAND ON THE LINE, FACE THE MARKS, AND LOOSE WHEN YOU\'RE READY."');
  }
  function laneX(L, t) {
    var span = L.x1 - L.x0, k = (t / 1000 * (L.speed || 1) / Math.max(1, span) + (L.phase || 0)) % 2;
    return L.x0 + 0.5 + span * (k < 1 ? k : 2 - k);
  }
  function finish() {
    if (!rangeGame) return;
    var sc = rangeGame.score, prize = [];
    rangeGame.on = false;
    st.rounds++;
    var best = sc > st.best;
    if (best) st.best = sc;
    var give = function (key, id, n, words) {
      if (st.prizes[key] || !inv()) return;
      if (inv().addItem(id, n)) { st.prizes[key] = Date.now(); prize.push(words); }
    };
    if (sc >= 60) give('fire', 'fire_arrow', 5, 'FIVE FIRE ARROWS');
    if (sc >= 80) give('rope', 'rope_arrow', 5, 'FIVE ROPE ARROWS');
    if (sc >= 90) give('heartwood', 'heartwood_bow', 1, 'THE HEARTWOOD LONGBOW');
    store();
    if (typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(Math.round(sc / 2), 'range');
    sfx(sc >= 80 ? 'quest' : 'clue');
    say('AERIN', '"' + sc + (sc >= 90 ? '. THAT\'S A WARDEN\'S ROUND." SHE ALMOST SMILES.' : sc >= 60 ? '. GOOD HANDS. THE WIND\'S STILL TEACHING YOU." ' : '. AGAIN TOMORROW, AND THE DAY AFTER. THAT\'S ALL IT IS."') +
      (best ? '\n\nYOUR BEST ON THE RANGE.' : '\n\nYOUR BEST: ' + st.best + '.') +
      (prize.length ? '\n\nSHE HANDS YOU ' + prize.join(' AND ') + '.' : '') + '\n\n(+' + Math.round(sc / 2) + ' COINS)');
    if (prize.length) toast('Archery range', prize.join(', '), 'From Aerin');
    rangeGame = null;
  }

  function use(inter) {
    if (inter.kind === 'zip') return zip(inter);
    if (inter.kind === 'range') {
      var world = BridgeWorld.getWorld();
      if (!world || !world.range) return;
      if (typeof BridgeSylvara !== 'undefined' && BridgeSylvara.rangeOpen && !BridgeSylvara.rangeOpen() && !(rangeGame && rangeGame.on)) {
        return say('THE RANGE', 'THE MARKS ARE STILL ON THEIR RAILS AND THE PENNANT\'S STILL FLYING, BUT AERIN\'S GONE TO THE LANDING RING. THE RANGE IS HERS FROM THE NINTH HOUR TO THE SEVENTEENTH.');
      }
      if (rangeGame && rangeGame.on) return say('AERIN', '"' + rangeGame.left + ' ARROWS LEFT. EYES ON THE MARKS."');
      BridgeInteractions.choose({
        title: 'Aerin\'s range', face: 'npc-elf-warden',
        text: '"THE WARDENS LEARN HERE, AND ANYONE ELSE WHO ASKS NICELY. ' + windWords(windNow()) + '."' + (st.best ? ' YOUR BEST: ' + st.best + '.' : ''),
        rows: [{ label: 'Shoot a round', sub: 'ten arrows at the moving marks', note: 'free', pick: function () { rangeStart(world); } },
               { label: 'What do I win?', sub: 'the prizes', pick: function () {
                 say('AERIN', '"SIXTY: FIRE ARROWS, FOR THE HIGH LANTERNS. EIGHTY: ROPE ARROWS - THE CANOPY HAS PLACES ONLY A LINE GETS YOU TO. NINETY..." SHE TOUCHES THE LONGBOW ON THE RACK. "THIS ONE\'S CUT FROM THE GREAT TREE. IT GOES TO SOMEONE WHO\'S EARNED IT."');
               } }]
      });
    }
  }

  // ---- drawing ------------------------------------------------------------------------------------------------------
  var lastT = 0;
  function arrowPx(ctx, X, Y, dx, dy, kind, len, now) {
    // a shaft of whole pixels, the head bright, the fletching green; along the way it flies (four ways)
    var L = len || 9;
    ctx.fillStyle = 'rgba(11,10,24,0.85)';
    if (dx) ctx.fillRect(Math.min(X, X - dx * L) - 1, Y - 1, L + 2, 3); else ctx.fillRect(X - 1, Math.min(Y, Y - dy * L) - 1, 3, L + 2);
    ctx.fillStyle = '#b08a58';
    if (dx) ctx.fillRect(Math.min(X, X - dx * L), Y, L, 1); else ctx.fillRect(X, Math.min(Y, Y - dy * L), 1, L);
    ctx.fillStyle = kind === 'fire' ? '#ffd060' : '#e8eef8';
    ctx.fillRect(X + (dx > 0 ? 0 : dx < 0 ? -1 : 0), Y + (dy > 0 ? 0 : dy < 0 ? -1 : 0), dx ? 2 : 1, dy ? 2 : 1);
    ctx.fillStyle = '#8ab858';
    var fx = X - dx * (L - 1), fy = Y - dy * (L - 1);
    if (dx) { ctx.fillRect(fx - dx, fy - 1, 2, 1); ctx.fillRect(fx - dx, fy + 1, 2, 1); } else { ctx.fillRect(fx - 1, fy - dy, 1, 2); ctx.fillRect(fx + 1, fy - dy, 1, 2); }
    if (kind === 'rope') {                                         // the line paying out behind it
      ctx.fillStyle = '#d8c090';
      for (var i = 0; i < 6; i++) ctx.fillRect(fx - dx * (i * 2 + 2) + (dy ? Math.round(Math.sin(i + now / 60)) : 0), fy - dy * (i * 2 + 2) + (dx ? Math.round(Math.sin(i + now / 60)) : 0), 1, 1);
    }
    if (kind === 'fire') {
      var fl = Math.floor(now / 70) % 2;
      ctx.fillStyle = '#ff8a30'; ctx.fillRect(X - dx * 2 - (dy ? 1 : 0), Y - dy * 2 - 1 - fl, 3, 2);
      ctx.fillStyle = '#fff0a0'; ctx.fillRect(X - dx * 2, Y - dy * 2 - fl, 1, 1);
    }
  }
  function over(ctx, world, offX, offY, ts, now) {
    var t = performance.now(), dt = Math.min(0.3, (t - (lastT || t)) / 1000);
    lastT = t;
    while (arrows.length && dt > 0) { step(Math.min(0.025, dt)); dt -= 0.025; }     // by real time, in small steps (a slow frame skips nothing)
    rideTick();
    var wid = BridgeWorld.getWorldId && BridgeWorld.getWorldId();
    var FX = typeof BridgeFX !== 'undefined' ? BridgeFX : null;
    // the range: the marks on their rails, the pennant
    if (world.range) drawRange(ctx, world, offX, offY, ts, t);
    // zip lines rigged: the cord from post to tree, sagging
    (world.zips || []).forEach(function (z) {
      if (!st.zips[z.id]) return;
      var ax = offX + (z.from[0] + 0.5) * ts, ay = offY + (z.from[1] + 1) * ts - 70, bx = offX + (z.to[0] + 0.5) * ts, by = offY + (z.to[1] + 1) * ts - 70;
      for (var i = 0; i <= 40; i++) {
        var k = i / 40, x = Math.round(ax + (bx - ax) * k), y = Math.round(ay + (by - ay) * k + Math.sin(k * Math.PI) * 10);
        ctx.fillStyle = '#1a1208'; ctx.fillRect(x, y, 1, 2);
        ctx.fillStyle = '#d8c090'; ctx.fillRect(x, y, 1, 1);
      }
    });
    // lanterns lit by fire arrows: a flame and a warm glow (the lantern itself is in the render)
    (world.lanterns || []).forEach(function (l, i) {
      if (!st.lit[l.id]) return;
      var X = Math.round(offX + (l.at[0] + 0.5) * ts), Y = Math.round(offY + (l.at[1] + 1) * ts - (l.h || 40));
      var a = 0.8 + 0.2 * Math.sin(t / 130 + i * 2.1);
      if (FX && FX.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, X, Y, 22, [255, 200, 110], 0.35 * a); ctx.restore(); }
      ctx.fillStyle = '#ffb040'; ctx.fillRect(X - 1, Y - 2, 3, 4);
      ctx.fillStyle = '#fff0b0'; ctx.fillRect(X, Y - 1 - (Math.floor(t / 90) % 2), 1, 2);
    });
    // a switch let down: the rope ladder unrolled under it
    (world.switches || []).forEach(function (sw) {
      if (!st.switched[sw.id] || !sw.ladder) return;
      var k = sw._open ? Math.min(1, (t - sw._open) / 600) : 1;
      var X = Math.round(offX + (sw.ladder[0] + 0.5) * ts), Y0 = Math.round(offY + sw.ladder[1] * ts), H = Math.round(sw.ladder[2] * ts * k);
      ctx.fillStyle = '#2a1a0a'; ctx.fillRect(X - 5, Y0, 2, H); ctx.fillRect(X + 4, Y0, 2, H);
      ctx.fillStyle = '#c8a060'; ctx.fillRect(X - 5, Y0, 1, H); ctx.fillRect(X + 4, Y0, 1, H);
      for (var r = 4; r < H; r += 7) { ctx.fillStyle = '#2a1a0a'; ctx.fillRect(X - 4, Y0 + r, 9, 2); ctx.fillStyle = '#a07a48'; ctx.fillRect(X - 4, Y0 + r, 9, 1); }
    });
    // arrows: the shadow on the ground, the arrow over it by its height
    arrows.forEach(function (a) {
      var X = Math.round(offX + a.x * ts), Y = Math.round(offY + a.y * ts);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      if (a.dx) ctx.fillRect(Math.min(X, X - a.dx * 8), Y + 2, 8, 1); else ctx.fillRect(X, Math.min(Y, Y - a.dy * 8) + 2, 1, 8);
      arrowPx(ctx, X, Y - Math.round(a.lift), a.dx, a.dy, a.kind, 9, t);
      if (a.kind === 'fire' && FX && FX.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, X, Y - Math.round(a.lift), 10, [255, 170, 80], 0.4); ctx.restore(); }
    });
    // arrows that came down: stuck in the ground (a short stub, fletching up) or in a wall or a mark, fading at the end
    stuck.forEach(function (s) {
      if (s.world !== wid) return;
      var age = t - s.at, fade = age > 7000 ? 1 - (age - 7000) / 2000 : 1;
      if (fade <= 0) return;
      ctx.globalAlpha = fade;
      var x = s.x, y = s.y;
      if (s.ride) x = laneX(s.ride, t) + s.off;
      var X = Math.round(offX + x * ts), Y = Math.round(offY + y * ts) - (s.wall ? 10 : 0);
      if (s.wall) arrowPx(ctx, X, Y, s.dx, s.dy, s.kind === 'fire' ? 'plain' : s.kind, 5, t);
      else { ctx.fillStyle = '#0b0a18'; ctx.fillRect(X - 1, Y - 6, 3, 7); ctx.fillStyle = '#b08a58'; ctx.fillRect(X, Y - 5, 1, 5); ctx.fillStyle = '#8ab858'; ctx.fillRect(X - 1, Y - 6, 3, 1); }
      ctx.globalAlpha = 1;
    });
    if (rangeGame && rangeGame.on && rangeGame.world === wid) {
      var tx = '➶ ' + rangeGame.left + '   SCORE ' + rangeGame.score;
      ctx.font = '8px "Pixelify Sans", monospace';
      ctx.fillStyle = 'rgba(11,10,24,0.7)'; ctx.fillRect(4, 4, ctx.measureText(tx).width + 8, 12);
      ctx.fillStyle = '#f0e0a0'; ctx.fillText(tx, 8, 13);
    }
  }
  function drawRange(ctx, world, offX, offY, ts, t) {
    var R = world.range;
    (R.lanes || []).forEach(function (L) {
      var x = laneX(L, t), X = Math.round(offX + x * ts), Y = Math.round(offY + (L.y + 0.5) * ts) - 14;
      var r = Math.round((L.size || 0.5) * ts * 0.6);
      // a straw boss on a sled: rings of whole pixels, gold at the heart, the shadow under it
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; if (BridgeFX.disc) BridgeFX.disc(ctx, X, Y + r + 10, r, 0.35);
      ctx.fillStyle = '#4a3220'; ctx.fillRect(X - 1, Y + r - 2, 3, 12);
      [['#0b0a18', r + 1], ['#e8dcc0', r], ['#3a6a3a', r * 0.78], ['#e8dcc0', r * 0.58], ['#a83a2a', r * 0.4], ['#f0c040', r * 0.2]].forEach(function (c) {
        ctx.fillStyle = c[0]; if (BridgeFX.disc) BridgeFX.disc(ctx, X, Y, Math.max(1, Math.round(c[1])));
      });
    });
    if (R.flag) {                                                   // the pennant: which way, how hard
      var w = world._wind || 0, X = Math.round(offX + (R.flag[0] + 0.5) * ts), Y = Math.round(offY + (R.flag[1] + 1) * ts) - 44;
      var len = 4 + Math.round(Math.abs(w) * 10), flap = Math.round(Math.sin(t / (120 - Math.abs(w) * 60)) * (1 + Math.abs(w)));
      for (var i = 0; i < len; i++) {
        var hgt = Math.max(1, 4 - Math.floor(i * 4 / (len + 1)));
        ctx.fillStyle = '#0b0a18'; ctx.fillRect(X + (w >= 0 ? i : -i) - (w >= 0 ? 0 : 1), Y + Math.round(flap * i / len) - 1, 1, hgt + 2);
        ctx.fillStyle = i % 4 < 2 ? '#d0a040' : '#2a5a2e'; ctx.fillRect(X + (w >= 0 ? i : -i) - (w >= 0 ? 0 : 1), Y + Math.round(flap * i / len), 1, hgt);
      }
    }
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { over: over });

  return { loose: loose, ghost: ghost, use: use, decorate: decorate, isLit: isLit, windNow: windNow, ITEMS: ITEMS,
           _st: function () { return st; }, _arrows: function () { return arrows; }, _range: function () { return rangeGame; },
           _reset: function () { st = load.call(null); } };
})();
