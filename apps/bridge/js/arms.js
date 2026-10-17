/**
 * BridgeArms — fighting with what's in your hand: every weapon swings the way its kind does, rendered, with weight.
 *
 * WEAPON CLASSES (items.js `cls`; anything else with damage is a blade, or a sword if it sweeps). Each class plays its
 * swings off the pilot's attack sheet (tools/bridge-art/attacks.py → assets/characters/attacks.json, the columns of
 * pilot-attack-…png) with its own timing: a wind-up, the frame where it lands (the hit is resolved there, not on the
 * key press), and a recovery you can cancel by moving or chain out of by pressing again.
 *   blade  dagger, Veilpiercer — a jab, a backhand cut, a lunging stab (×1.5, a tile further). Quick.
 *   sword  Cutlass, Star Blade, Moonglass Sabre — sweeps right to left and back; the third is a spin that cuts all round.
 *   chop   Rime Hatchet, Emberbrand — up over the shoulder and down; the second chop from the other side bites deeper.
 *   pole   Boarding Pike — drawn back and thrust; the third a long lunge a tile further that pushes them back.
 *   maul   War Maul — swung back, heaved overhead, slammed down: the ground shakes the tiles beside it too.
 *   cast   Wispcaller, Moonlit Wand — raised and thrust out; the bolt leaves the tip on the thrust (js/magic.js).
 *   pick   pickaxes, the ice axe, the hoe — up and down on the tile in front: rock (js/mine.js), earth (js/farm.js).
 *   bow    the Elven Bow, the Heartwood Longbow (Sylvara) — hold F to draw, let go to loose: the longer the draw, the
 *          further and harder the arrow flies (js/bows.js flies it). Its poses are a sheet of their own (pilot-bow-…,
 *          assets/characters/bow.json), so the attack sheets don't change for it.
 * Hold F (B on touch, the right button) after a swing and it charges: let go once it's full for the class's big one
 * (a double spin, a long lunge, a quake, a heavy bolt...; 2 energy for a blade or a staff, 3 for a sword, an axe, a pike
 * or a pick, 4 for a maul or a greatsword — `cost`). Shift (the ROLL button on touch) is a dodge roll: up to two tiles,
 * untouchable for most of it, 3 energy. A plain swing costs nothing.
 *
 * SECOND WIND: three quarters of what a fight takes (rolls, charged blows, bolts — `spend`) comes back once you stop for
 * a breath: 1.2 s with no swing, charge, roll or cast and it returns, 8 a second. Keep swinging and nothing comes back;
 * food and rest are still what fill you up.
 *
 * FEEL: a landed hit freezes the swing and the creature for a moment (longer for heavier weapons), throws sparks of
 * its element (js/fx.js spawnImpact: steel, frost shards, embers, holy light, drain wisps, dust), nudges the camera
 * toward it (BridgeWorld.kick), and each class has its own whoosh and impact (js/audio.js swing_*, impact_*).
 *
 * WEAPONS IN HAND: weapon_sprites.py renders every weapon in the pilot's hand for each frame of its class and the
 * idle/walk frames carrying it (assets/characters/weapons/<id>.png + .json); js/character.js draws them with the pilot
 * (and js/multi.js on other pilots). The selected hotbar item is carried while you stand and walk.
 *
 * TOGETHER: each swing, charge and roll goes to the others in the same place as one message (`atk`: class, step,
 * facing, weapon), so they see it played out; the hits themselves go through js/items.js strike → js/fight.js.
 *
 *   BridgeArms.press(item) / swing({ id, cls, onHit }) / keyDown() / keyUp() / roll() / update()
 *   BridgeArms.state() / pose(state, now) / held() / art(id) / classOf(item) / dodging() / rooted() / cancel()
 *   BridgeArms.remote(d) — a swing someone else made (js/multi.js); BridgeArms.card(item, opts) — the stats card
 */
var BridgeArms = (function () {
  var DIR = '/bridge/assets/characters/';
  var layout = null;
  try {
    fetch(DIR + 'attacks.json').then(function (r) { return r.json(); }).then(function (j) { layout = j; }).catch(function () { /* no art: the old swing */ });
  } catch (e) { /* no fetch */ }

  // ---- the classes: their swings, in key poses (attacks.py) and milliseconds; 1 marks the frame that lands --------
  var CLASSES = {
    blade: { name: 'Quick blade', rate: 260, stop: 40, kick: 1, charge: 'coil', cost: 2, what: 'Jab, cut, and a lunging stab to finish a chain',
      swings: [{ steps: [['ready', 40], ['jab', 70, 1], ['ready', 70]] },
               { steps: [['cross', 45], ['cut', 75, 1], ['ready', 70]] },
               { steps: [['coil', 80], ['lunge', 120, 1], ['ready', 100]], fin: 1, mult: 1.5, reach: 1 }],
      charged: { steps: [['coil', 30], ['lunge', 170, 1], ['ready', 120]], mult: 2.2, reach: 1 } },
    sword: { name: 'Sword', rate: 300, stop: 55, kick: 2, charge: 'wind', cost: 3, what: 'Wide sweeps; the third of a chain spins and cuts all round',
      swings: [{ steps: [['wind', 70], ['sweep', 55, 1], ['left', 70], ['left', 60]] },
               { steps: [['left', 25], ['sweep', 55, 1], ['right', 70], ['right', 60]] },
               { steps: [['wind', 90], ['spin1', 50, 1], ['spin2', 50], ['spin3', 50], ['sweep', 50], ['right', 110]], fin: 1, mult: 1.25, ring: 1 }],
      charged: { steps: [['wind', 40], ['spin1', 45, 1], ['spin2', 45], ['spin3', 45], ['sweep', 45], ['spin1', 45], ['spin2', 45], ['spin3', 45],
                         ['sweep', 45], ['right', 140]], mult: 2, ring: 1, push: 1 } },
    chop: { name: 'Axe', rate: 340, stop: 75, kick: 3, charge: 'raise', cost: 3, what: 'A heavy chop from over the shoulder; the second, from the other side, bites deeper',
      swings: [{ steps: [['raise', 120], ['fall', 40], ['through', 50, 1], ['through', 130]] },
               { steps: [['raise2', 110], ['through2', 50, 1], ['through2', 140]], fin: 1, mult: 1.3 }],
      charged: { steps: [['raise', 40], ['fall', 40], ['through', 60, 1], ['through', 220]], mult: 2.3, arc: 1 } },
    pole: { name: 'Polearm', rate: 320, stop: 60, kick: 3, charge: 'draw', cost: 3, what: 'A long thrust; the third of a chain lunges a tile further and pushes them back',
      swings: [{ steps: [['draw', 90], ['thrust', 50, 1], ['reach', 80], ['back', 90]] },
               { steps: [['back', 40], ['thrust', 50, 1], ['reach', 80], ['back', 90]] },
               { steps: [['draw', 110], ['long', 60, 1], ['long', 110], ['back', 120]], fin: 1, mult: 1.3, reach: 1, push: 1 }],
      charged: { steps: [['draw', 40], ['long', 60, 1], ['long', 160], ['back', 150]], mult: 2.2, reach: 2, push: 1 } },
    maul: { name: 'Maul', rate: 650, stop: 110, kick: 5, charge: 'over', cost: 4, what: 'Slow to lift; it slams the ground and the shock hits the tiles beside it',
      swings: [{ steps: [['heft', 150], ['over', 210], ['slam', 60, 1], ['quake', 180], ['rise', 170]], shock: 0.4 }],
      charged: { steps: [['over', 60], ['slam', 60, 1], ['quake', 260], ['rise', 200]], mult: 1.8, quake: 1, push: 1 } },
    // a greatsword (Tidebreaker) swings off the maul's poses: lifted overhead two-handed and brought down in a cleave
    great: { name: 'Greatsword', poses: 'maul', rate: 560, stop: 85, kick: 4, charge: 'over', cost: 4, what: 'Heaved overhead two-handed and brought down in a cleave across three tiles',
      swings: [{ steps: [['heft', 110], ['over', 170], ['slam', 55, 1], ['quake', 140], ['rise', 130]], arc: 1 }],
      charged: { steps: [['over', 60], ['slam', 60, 1], ['quake', 240], ['rise', 180]], mult: 2, arc: 1, push: 1 } },
    cast: { name: 'Staff & wand', rate: 450, stop: 0, kick: 1, charge: 'raise', cost: 2, what: 'Raised and thrust out: a bolt flies seven tiles, through the first thing it meets',
      swings: [{ steps: [['raise', 130], ['burst', 70, 1], ['after', 170]] }],
      charged: { steps: [['raise', 40], ['burst', 90, 1], ['after', 220]], mult: 2 } },
    pick: { name: 'Pick', rate: 300, stop: 50, kick: 2, charge: 'up', cost: 3, what: 'Up over the head and down on what\'s in front: it breaks rock',
      swings: [{ steps: [['up', 110], ['swing', 45], ['strike', 50, 1], ['strike', 100]] }],
      charged: { steps: [['up', 40], ['swing', 45], ['strike', 60, 1], ['strike', 160]], mult: 2 } },
    // the bow: F held draws (nock → draw → full, DRAW_MS), let go and it looses; the loose is a swing whose landing frame
    // sends the arrow (js/bows.js) with the draw's strength. Its own sheet (sheet: 'bow'), no charge of its own: the draw is it.
    bow: { name: 'Bow', sheet: 'bow', rate: 420, stop: 0, kick: 1, cost: 0, draw: 1, what: 'Hold to draw, let go to loose: the longer the draw, the further and harder it flies',
      swings: [{ steps: [['loose', 60, 1], ['loose', 90], ['lower', 150]] }],
      charged: { steps: [['loose', 60, 1], ['loose', 90], ['lower', 150]] } }
  };
  var DRAW_MS = 900;                              // nothing to full draw
  var bowLayout = null;
  try {
    fetch(DIR + 'bow.json').then(function (r) { return r.json(); }).then(function (j) { bowLayout = j; }).catch(function () { /* no bow art yet */ });
  } catch (e) { /* no fetch */ }
  var ROLL = [['dive', 0.14], ['tuck1', 0.24], ['tuck2', 0.24], ['tuck3', 0.24], ['rise', 0.14]];
  var ROLL_MS = 380, ROLL_SAFE = 0.85, ROLL_COST = 3, CHARGE_MS = 650, CHAIN_GAP = 420;
  // the second wind: how long you stop before it comes, how often a point comes back, and how much of what you spent
  var WIND_DELAY = 1200, WIND_EVERY = 125, WIND_BACK = 0.75;

  // weapons with art (tools/bridge-art/weapon_sprites.py WEAPONS) and the colour of their swing
  var TRAIL = { wyrmfang: '#c8f0ff', twin_fangs: '#eef2fa', tidebreaker: '#bce4f4', iron_dagger: '#e8eef8', veilpiercer: '#b890ff', cutlass: '#eef2fa', star_blade: '#ffe080', moonglass_sabre: '#dce6ff',
                emberbrand: '#ffa040', rime_hatchet: '#a8e0ff', boarding_pike: '#eef2fa', war_maul: '#e0d0a8', wispcaller: '#c8a8ff',
                moon_wand: '#e8eeff', old_pickaxe: '#d8d0c0', iron_pickaxe: '#e0e4ee', star_pickaxe: '#ffe080', ice_axe: '#a8d0ff', hoe: '#d8c8a0',
                elven_bow: '#f0e0a0', heartwood_bow: '#c8f0e8' };

  function colOf(cls, pose) { return ((CLASSES[cls] && CLASSES[cls].poses) || cls) + '-' + pose; }   // a pose's sheet column
  /** Which sheet a class's poses are on ('attack', or its own: 'bow') and that sheet's layout. */
  function sheetOf(cls) { var C = CLASSES[cls]; return C && C.sheet ? C.sheet : 'attack'; }
  function layoutOf(cls) { return sheetOf(cls) === 'bow' ? bowLayout : layout; }
  function classOf(item) {
    if (!item) return null;
    if (item.cls && CLASSES[item.cls]) return item.cls;
    if (typeof item.damage !== 'number') return null;
    return item.arc ? 'sword' : 'blade';
  }
  function speedOf(item, cls) {
    var C = CLASSES[cls];
    return Math.max(0.55, Math.min(1.5, item && item.rate ? item.rate / C.rate : 1));
  }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function now() { return performance.now(); }
  var DV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

  // ---- weapon art ------------------------------------------------------------------------------------------------
  var arts = {};
  function art(id) {
    if (!id || !TRAIL[id]) return null;
    var a = arts[id];
    if (!a) {
      a = arts[id] = { id: id, img: new Image(), meta: null, ready: false };
      var loaded = 0, done = function () { if (++loaded === 2 && a.meta) a.ready = true; };
      a.img.onload = done;
      a.img.src = DIR + 'weapons/' + id + '.png';
      try { fetch(DIR + 'weapons/' + id + '.json').then(function (r) { return r.json(); }).then(function (j) { a.meta = j; done(); }).catch(function () { a.dead = true; }); }
      catch (e) { a.dead = true; }
    }
    return a.ready ? a : null;
  }
  // a weapon's frame for build/dir/frame name: [x, y, w, h, dx, dy] in its atlas, and where its hand and tip are
  function cell(id, build, dir, frame) {
    var a = art(id);
    if (!a) return null;
    var f = a.meta.frames[build] || a.meta.frames.a, r = f && f[dir];
    return r && r[frame] ? { img: a.img, r: r[frame] } : null;
  }
  function anchor(id, build, dir, frame) {
    var a = art(id), an = a && a.meta.anchors && (a.meta.anchors[build] || a.meta.anchors.a);
    return an && an[dir] && an[dir][frame] || null;
  }

  // ---- the local pilot's fight -----------------------------------------------------------------------------------
  var st = null;                // { kind: 'swing' | 'charge' | 'roll', ... }
  var chain = { cls: null, idx: 0, at: 0 }, keyHeld = false, pressAt = 0, pendingCharge = false, rollReady = 0;

  function totalOf(steps, speed) { var t = 0; for (var i = 0; i < steps.length; i++) t += steps[i][1] * speed; return t; }
  function clock(s, t) {                                   // time into the move, less any hit-stop
    var stop = s.stopUntil > t ? t - s.stopAt : 0;
    return t - s.t0 - s.paused - stop;
  }
  // where a swing is at time e: the step, its pose, and whether the landing frame has come
  function stepAt(steps, speed, e) {
    var acc = 0;
    for (var i = 0; i < steps.length; i++) {
      var d = steps[i][1] * speed;
      if (e < acc + d) return { i: i, pose: steps[i][0], k: (e - acc) / d, hitPast: hitIndex(steps) <= i };
      acc += d;
    }
    return null;
  }
  function hitIndex(steps) { for (var i = 0; i < steps.length; i++) if (steps[i][2]) return i; return 0; }

  function selectedItem() {
    var id = typeof BridgeInventory !== 'undefined' && BridgeInventory.getSelectedItemId ? BridgeInventory.getSelectedItemId() : null;
    return id && typeof BridgeItems !== 'undefined' ? BridgeItems.get(id) : null;
  }
  function canFight() {
    if (typeof BridgeCharacter === 'undefined' || typeof BridgeWorld === 'undefined' || !BridgeWorld.getWorld || !BridgeWorld.getWorld()) return false;
    if (BridgeCharacter.isSeated && BridgeCharacter.isSeated()) return false;
    if (BridgeCharacter.getPose && BridgeCharacter.getPose()) return false;
    if (BridgeWorld.getMode && BridgeWorld.getMode()) return false;
    return !!layout;
  }

  // ---- energy: what a fight takes, and the second wind ------------------------------------------------------------
  var owed = 0, lastAct = 0, windAt = 0;
  function tired(x, y) {
    sfx('error');
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(x, y - 0.4, 'TOO TIRED', '#ffe0a0');
  }
  /** Energy for a fighting move (a roll, a charged blow, a bolt): false if you haven't got it. Most of it comes back. */
  function spend(n) {
    lastAct = now();
    if (typeof BridgeInventory === 'undefined') return true;
    if (BridgeInventory.getStats().energy < n) return false;
    owed += n * WIND_BACK;
    BridgeInventory.useEnergy(n);
    return true;
  }
  // each frame: once you've stopped a moment, what the fight took comes back a point every WIND_EVERY ms (by the clock,
  // so a slow frame gets the points it missed)
  function breathe(t) {
    if (owed <= 0 || st || t - lastAct < WIND_DELAY || typeof BridgeInventory === 'undefined') return;
    var e = BridgeInventory.getStats();
    if (e.energy >= e.maxEnergy || owed < 1) { owed = 0; return; }   // filled up some other way (food, sleep), or a crumb left
    windAt = Math.max(windAt, lastAct + WIND_DELAY - WIND_EVERY);      // this breath began then, its first point at once
    var n = Math.min(Math.floor(owed), Math.floor((t - windAt) / WIND_EVERY));
    if (n < 1) return;
    windAt += n * WIND_EVERY; owed -= n;
    BridgeInventory.restoreEnergy(n);
  }
  /** What's still to come back (the pale end of the energy bar, js/inventory.js). */
  function winded() { return Math.floor(owed); }

  /** F with a weapon (items.js weaponUse). false: no swing art — the caller strikes the old way. */
  function press(item) {
    var cls = classOf(item);
    if (!cls || !canFight()) return false;
    if (CLASSES[cls].draw) return draw({ item: item, cls: cls });
    return swing({ item: item, cls: cls });
  }
  /** A bow drawn (F held): { item, cls, arrow (an arrow item id: rope, fire…), loose(power, o) }. Let go and it looses. */
  function draw(o) {
    if (!canFight() || !bowLayout) return false;
    if (st && st.kind === 'draw') return true;
    if (st && st.kind === 'swing') { st.buffer = o; return true; }
    if (st) return true;
    var t = now();
    lastAct = t;
    st = { kind: 'draw', cls: o.cls, item: o.item, id: o.item && o.item.id, arrow: o.arrow || null, loose: o.loose, facing: BridgeCharacter.getFacing(),
           t0: t, paused: 0, stopUntil: 0, tap: !keyHeld };
    tell({ k: 'd', c: o.cls, f: st.facing, w: st.id });
    sfx('bow_draw');
    return true;
  }
  function drawLevel(s, t) { return Math.max(0, Math.min(1, (t - s.t0) / DRAW_MS)); }
  // let go: the loose plays, and on its landing frame the arrow flies with what the draw had
  function loose(s, t) {
    var power = Math.max(0.2, drawLevel(s, t)), C = CLASSES[s.cls];
    var shot = { power: power, item: s.item, arrow: s.arrow, facing: s.facing };
    st = { kind: 'swing', cls: s.cls, sw: C.swings[0], idx: 0, charged: false, item: s.item, id: s.id, facing: s.facing, speed: 1, t0: t, paused: 0,
           stopUntil: 0, stopAt: 0, hit: false, power: power,
           onHit: function () { if (s.loose) s.loose(power, shot); else if (typeof BridgeBows !== 'undefined') BridgeBows.loose(shot); return false; } };
    st.total = totalOf(st.sw.steps, 1);
    tell({ k: 's', c: s.cls, n: 0, f: s.facing, w: s.id, s: 1, p: Math.round(power * 100) / 100, a: s.arrow || 0 });
  }
  /** Any swing: { item | id, cls, onHit(mult, charged) } — onHit replaces the weapon's own strike (rock, earth, bolt). */
  function swing(o) {
    if (!canFight()) return false;
    var item = o.item || (o.id && BridgeItems.get(o.id));
    var cls = o.cls || classOf(item);
    if (!cls || !CLASSES[cls]) return false;
    o.item = item; o.cls = cls;
    if (st && (st.kind === 'swing' || st.kind === 'roll')) { st.buffer = o; return true; }
    if (st && st.kind === 'charge') return true;
    begin(o);
    return true;
  }

  function begin(o) {
    var C = CLASSES[o.cls], t = now(), charged = pendingCharge;
    pendingCharge = false;
    lastAct = t;                                             // swinging: no second wind till you stop
    var idx = 0, sw;
    if (charged && !spend(C.cost || 3)) { tired(BridgeCharacter.getX(), BridgeCharacter.getY()); charged = false; }
    if (charged) sw = C.charged;
    else {
      if (chain.cls === o.cls && t - chain.at < CHAIN_GAP) idx = chain.idx % C.swings.length;
      sw = C.swings[idx];
    }
    st = { kind: 'swing', cls: o.cls, sw: sw, idx: charged ? -1 : idx, charged: charged, item: o.item, id: o.item && o.item.id, onHit: o.onHit,
           facing: BridgeCharacter.getFacing(), speed: speedOf(o.item, o.cls), t0: t, paused: 0, stopUntil: 0, stopAt: 0, hit: false, trail: false };
    st.total = totalOf(sw.steps, st.speed);
    tell({ k: 's', c: o.cls, n: st.idx, f: st.facing, w: st.id, s: Math.round(st.speed * 100) / 100 });
    if (charged) sfx('charged');
  }

  function update() {
    var t = now();
    breathe(t);
    if (!st) return;
    if (st.stopUntil && t >= st.stopUntil) { st.paused += st.stopUntil - st.stopAt; st.stopUntil = 0; }
    if (st.kind === 'roll') {
      if (t - st.t0 >= st.total) { var b = st.buffer; st = null; rollReady = t + 120; if (b) begin(b); }    // a swing pressed mid-roll
      return;
    }
    if (st.kind === 'draw') {
      var dl = drawLevel(st, t);
      if (dl >= 1 && !st.full) { st.full = true; sfx('bow_full'); }
      // a tap (touch, or F let go before the frame saw it held) still draws a little before it looses
      if (!keyHeld && (!st.tap || t - st.t0 > 220)) loose(st, t);
      return;
    }
    if (st.kind === 'charge') {
      var lvl = Math.min(1, (t - st.t0) / CHARGE_MS);
      if (lvl >= 1 && !st.full) { st.full = true; sfx('charge'); fx('spawnCharge', st, 1); }
      if (!st.full && t - (st.glowAt || 0) > 90) { st.glowAt = t; fx('spawnCharge', st, lvl); }
      if (!keyHeld) release();
      return;
    }
    var e = clock(st, t), s = stepAt(st.sw.steps, st.speed, e);
    if (s && s.hitPast && !st.hit) { st.hit = true; land(st); }
    // a frame that came late enough to skip the whole swing (a quick blade's is ~120 ms) still lands it, and finishes
    // it on the next frame, after its hit-stop
    if (!s && !st.hit) { st.hit = true; land(st); return; }
    if (!s) {                                                  // done
      var was = st;
      chain = { cls: was.cls, idx: was.sw.fin || was.charged ? 0 : was.idx + 1, at: t };
      st = null;
      if (was.buffer) { begin(was.buffer); return; }
      if (keyHeld && CLASSES[was.cls].charge && t - pressAt > 200 && !was.charged && selectedItem() && selectedItem().id === was.id) {
        st = { kind: 'charge', cls: was.cls, item: was.item, id: was.id, facing: was.facing, t0: t, paused: 0, stopUntil: 0 };
        tell({ k: 'c', c: was.cls, f: was.facing, w: was.id });
      }
    }
  }
  function release() {
    var s = st;
    st = null;
    if (!s || s.kind !== 'charge') return;
    if (!s.full) { tell({ k: 'x' }); return; }
    pendingCharge = true;
    if (typeof BridgeInventory !== 'undefined') BridgeInventory.useItem(s.id);     // the item's own use, charged
    if (pendingCharge) { pendingCharge = false; tell({ k: 'x' }); }
  }

  // the landing frame: strike what's there (or the swing's own onHit), freeze on a hit, sparks, a nudge, a sound
  function land(s) {
    var C = CLASSES[s.cls], sw = s.sw, mult = (sw.mult || 1);
    sfx('swing_' + s.cls);
    trail(s, BridgeCharacter.getRenderPos(), true);
    var hits = 0;
    if (s.onHit) hits = s.onHit(mult, s.charged) ? 1 : 0;
    else hits = strikeAround(s, mult);
    if (hits) {
      var ms = C.stop * (sw.fin ? 1.4 : 1) * (s.charged ? 1.6 : 1);
      if (ms) { s.stopAt = now(); s.stopUntil = s.stopAt + ms; }
      var d = DV[s.facing] || [0, 1];
      if (typeof BridgeWorld !== 'undefined' && BridgeWorld.kick) BridgeWorld.kick(d[0], d[1], C.kick * (s.charged ? 1.6 : 1));
      if ((s.cls === 'maul' || s.cls === 'great') && typeof BridgeCombat !== 'undefined' && BridgeCombat.shake) BridgeCombat.shake(s.charged ? 5 : 3);
    }
  }

  function strikeAround(s, mult) {
    var world = BridgeWorld.getWorld(), item = s.item, sw = s.sw;
    if (!world || !item) return 0;
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY(), d = DV[s.facing] || [0, 1], dx = d[0], dy = d[1];
    var cells = {}, list = [];
    function add(x, y, k) { var key = x + ',' + y; if (x === px && y === py) return; if (!cells[key] || cells[key][2] < k) { if (!cells[key]) list.push(key); cells[key] = [x, y, k]; } }
    var fx0 = px + dx, fy0 = py + dy;
    add(fx0, fy0, 1);
    if (item.arc || sw.arc) { add(fx0 + dy, fy0 + dx, 1); add(fx0 - dy, fy0 - dx, 1); }
    var reach = (item.reach || 1) + (sw.reach || 0);
    for (var k = 2; k <= reach; k++) add(px + dx * k, py + dy * k, 1);
    if (sw.ring) for (var ax = -1; ax <= 1; ax++) for (var ay = -1; ay <= 1; ay++) add(px + ax, py + ay, 1);
    if (sw.quake) for (var qx = -1; qx <= 1; qx++) for (var qy = -1; qy <= 1; qy++) add(fx0 + qx, fy0 + qy, 1);
    if (sw.shock) { add(fx0 + dy, fy0 + dx, sw.shock); add(fx0 - dy, fy0 - dx, sw.shock); add(fx0 + dx, fy0 + dy, sw.shock); }
    if (s.cls === 'maul' && typeof BridgeFX !== 'undefined' && BridgeFX.spawnShock) BridgeFX.spawnShock(fx0, fy0, s.charged ? 1.6 : 1);
    var hits = 0, C = CLASSES[s.cls];
    var w = Object.create(item);
    if (sw.push) w.push = sw.push;
    if (sw.arc) w.arc = true;
    if (s.charged) w.charged = true;
    w.cls = s.cls;
    list.forEach(function (key) {
      var c = cells[key];
      world.interactions.filter(function (it) { return it.type === 'hostile' && it.x === c[0] && it.y === c[1]; }).forEach(function (h) {
        var base = typeof BridgeCombat !== 'undefined' && BridgeCombat.damageFor ? BridgeCombat.damageFor(item, h) : item.damage || 1;
        var dmg = Math.max(1, Math.round(base * mult * c[2]));
        hits++;
        freeze(h, C.stop * (s.charged ? 1.6 : 1), c[0] - px, c[1] - py);
        BridgeItems.strike(world, h, dmg, w);
        if (item.twin) setTimeout(function () {            // the other hand's knife, a beat behind
          if (world.interactions.indexOf(h) < 0 || !(h._hp > 0)) return;
          sfx('impact_blade');
          BridgeItems.strike(world, h, dmg, w);
        }, 90);
      });
    });
    if (hits) sfx('impact_' + s.cls);
    return hits;
  }
  // a creature struck: frozen a moment (its clocks held), knocked back a few pixels
  function freeze(h, ms, dx, dy) {
    var t = now();
    h._stopUntil = t + ms;
    h._recoil = { dx: Math.sign(dx), dy: Math.sign(dy), at: t };
    if (h._attackStart) h._attackStart += ms;
    if (h._lastMove) h._lastMove += ms;
  }

  // the swing's arc, through where the tip goes from the pose before the landing frame to the one after
  function trail(s, pos, mine) {
    if (!s.id || typeof BridgeFX === 'undefined' || !BridgeFX.spawnTrail) return;
    if (CLASSES[s.cls] && CLASSES[s.cls].draw) return;     // a bow doesn't cut the air: the arrow is the arc (js/bows.js)
    var build = s.build || buildOf(mine ? null : s), steps = s.sw.steps, hi = hitIndex(steps);
    if (s.cls === 'cast') {                                // a staff or wand doesn't cut the air: a burst off the tip
      var a = anchor(s.id, build, s.facing, colOf('cast', steps[hi][0]));
      if (a && BridgeFX.spawnCharge) BridgeFX.spawnCharge(pos.x + 0.5 + a.tip[0] / 32, pos.y + 1 - 3 / 32 + a.tip[1] / 32, 1, TRAIL[s.id]);
      return;
    }
    var names = [];
    for (var i = Math.max(0, hi - 1); i <= Math.min(steps.length - 1, hi + (s.cls === 'sword' && s.sw.ring ? 4 : 1)); i++) names.push(colOf(s.cls, steps[i][0]));
    var pts = [], inner = [], ox = pos.x + 0.5, oy = pos.y + 1 - 3 / 32;
    names.forEach(function (n) {
      var a = anchor(s.id, build, s.facing, n);
      if (!a) return;
      pts.push([ox + a.tip[0] / 32, oy + a.tip[1] / 32]);
      // the smear runs from the tip in along the blade (a short way for a pike, most of the way for a blade)
      var k = s.cls === 'pole' ? 0.75 : s.cls === 'blade' ? 0.35 : 0.45;
      inner.push([ox + (a.tip[0] + (a.hand[0] - a.tip[0]) * k) / 32, oy + (a.tip[1] + (a.hand[1] - a.tip[1]) * k) / 32]);
    });
    if (pts.length >= 2) BridgeFX.spawnTrail(pts, TRAIL[s.id] || '#ffffff', s.cls, !!s.charged, inner);
  }
  function buildOf(s) {
    if (s && s.look) return s.look;
    var l = typeof BridgeLook !== 'undefined' ? BridgeLook.get() : null;
    return l && l.body === 'b' ? 'b' : 'a';
  }

  function fx(name, s, lvl) {
    if (typeof BridgeFX === 'undefined' || !BridgeFX[name]) return;
    var p = BridgeCharacter.getRenderPos(), a = anchor(s.id, buildOf(null), s.facing, colOf(s.cls, CLASSES[s.cls].charge));
    var x = p.x + 0.5 + (a ? a.hand[0] / 32 : 0), y = p.y + 1 - 3 / 32 + (a ? a.hand[1] / 32 : -0.6);
    BridgeFX[name](x, y, lvl, TRAIL[s.id] || '#ffe080');
  }

  // ---- the dodge roll ---------------------------------------------------------------------------------------------
  function roll() {
    if (!canFight() || typeof BridgeControls === 'undefined') return false;
    var t = now();
    if (st && st.kind === 'roll') return false;
    if (t < rollReady) return false;
    if (typeof BridgeInventory !== 'undefined' && BridgeInventory.isMenuOpen && BridgeInventory.isMenuOpen()) return false;
    var st0 = typeof BridgeInventory !== 'undefined' ? BridgeInventory.getStats() : null;
    if (st0 && st0.energy < ROLL_COST) { tired(BridgeCharacter.getX(), BridgeCharacter.getY()); return false; }
    var dir = BridgeControls.getDir(), f = BridgeCharacter.getFacing();
    if (dir.dx || dir.dy) f = dir.dx > 0 ? 'right' : dir.dx < 0 ? 'left' : dir.dy > 0 ? 'down' : 'up';
    var d = DV[f], w = BridgeWorld.getWorld(), x = Math.round(BridgeCharacter.getRenderPos().x), y = Math.round(BridgeCharacter.getRenderPos().y), n = 0;
    for (var k = 1; k <= 2; k++) {
      var nx = x + d[0] * k, ny = y + d[1] * k;
      if (nx < 0 || ny < 0 || nx >= w.width || ny >= w.height || !w.collisions[ny] || w.collisions[ny][nx] !== 0) break;
      n = k;
    }
    var dur = n ? ROLL_MS : ROLL_MS * 0.7;
    if (!BridgeCharacter.roll || !BridgeCharacter.roll(d[0], d[1], n, dur)) return false;
    spend(ROLL_COST);
    st = { kind: 'roll', facing: f, t0: t, total: dur, paused: 0, stopUntil: 0 };
    sfx('roll');
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnDust) { BridgeFX.spawnDust(x, y, 6); setTimeout(function () { BridgeFX.spawnDust(x + d[0] * n, y + d[1] * n, 5); }, dur * 0.8); }
    tell({ k: 'r', f: f, d: Math.round(dur) });
    return true;
  }
  function dodging() { return !!(st && st.kind === 'roll' && now() - st.t0 < st.total * ROLL_SAFE); }

  // movement: held still through the wind-up and the landing frame, while charging and rolling; free in the recovery
  function rooted() {
    if (!st) return false;
    if (st.kind !== 'swing') return true;
    var s = stepAt(st.sw.steps, st.speed, clock(st, now()));
    return !!(s && s.i <= hitIndex(st.sw.steps));
  }
  function charging() { return !!(st && st.kind === 'charge'); }
  function cancel() {
    if (st && st.kind === 'swing') { chain = { cls: st.cls, idx: st.idx + 1, at: now() }; st = null; }
    else if (st && st.kind === 'draw') { st = null; tell({ k: 'x' }); }
  }

  // F / B / the right mouse button: held for a charge
  function keyDown() { keyHeld = true; pressAt = now(); }
  function keyUp() { keyHeld = false; if (st && st.kind === 'charge') release(); }

  // ---- what to draw: the pose of a fight state at a time (yours or someone else's) ---------------------------------
  function pose(s, t) {
    if (!s) return null;
    if (s.kind === 'roll') {
      var k = Math.min(0.999, (t - s.t0) / s.total), acc = 0;
      for (var i = 0; i < ROLL.length; i++) { acc += ROLL[i][1]; if (k < acc) return { col: 'roll-' + ROLL[i][0], facing: s.facing, weapon: null }; }
      return null;
    }
    if (s.kind === 'draw') {
      var dl = drawLevel(s, t);
      return { col: colOf(s.cls, dl < 0.22 ? 'nock' : dl < 0.8 ? 'draw' : 'full'), facing: s.facing, weapon: s.id, sheet: sheetOf(s.cls),
               shake: dl >= 1 && t - s.t0 > DRAW_MS + 2500 ? (Math.floor(t / 60) % 2 ? 1 : 0) : 0, glow: dl };
    }
    if (s.kind === 'charge') {
      var full = t - s.t0 >= CHARGE_MS;
      return { col: colOf(s.cls, CLASSES[s.cls].charge), facing: s.facing, weapon: s.id, shake: full ? (Math.floor(t / 33) % 2 ? 1 : -1) : 0, glow: Math.min(1, (t - s.t0) / CHARGE_MS) };
    }
    var e = clock(s, t), at = stepAt(s.sw.steps, s.speed, e);
    if (!at) return null;
    return { col: colOf(s.cls, at.pose), facing: s.facing, weapon: s.id, stopped: s.stopUntil > t, sheet: sheetOf(s.cls) };
  }
  function state() { return st; }
  function held() {
    var it = selectedItem();
    return it && TRAIL[it.id] ? it.id : null;
  }
  function busy() { return !!st; }

  // ---- someone else's swing (js/multi.js): rebuilt from the message, played on their own clock ---------------------
  function remote(d, look) {
    if (!d) return null;
    var t = now();
    if (d.k === 'r') return { kind: 'roll', facing: d.f, t0: t, total: d.d || ROLL_MS };
    if (d.k === 'c' && CLASSES[d.c]) return { kind: 'charge', cls: d.c, id: d.w, facing: d.f, t0: t };
    if (d.k === 'd' && CLASSES[d.c]) return { kind: 'draw', cls: d.c, id: d.w, facing: d.f, t0: t };
    if (d.k === 's' && CLASSES[d.c]) {
      var C = CLASSES[d.c], sw = d.n < 0 ? C.charged : C.swings[d.n] || C.swings[0], sp = +d.s || 1;
      return { kind: 'swing', cls: d.c, sw: sw, idx: d.n, charged: d.n < 0, id: d.w, facing: d.f, speed: sp, t0: t, paused: 0, stopUntil: 0,
               total: totalOf(sw.steps, sp), look: look, power: +d.p || 0, arrow: d.a || null };
    }
    return null;
  }
  // their swing reaching its landing frame: the arc and the whoosh, like yours (the hit itself comes from them)
  function remoteTick(s, pos, t) {
    if (!s) return null;
    if (s.kind === 'roll') return t - s.t0 < s.total ? s : null;
    if (s.kind === 'charge') return t - s.t0 < 8000 ? s : null;          // never let go (the message lost): stand down
    if (s.kind === 'draw') return t - s.t0 < 12000 ? s : null;
    var at = stepAt(s.sw.steps, s.speed, clock(s, t));
    if (!at) return null;
    if (at.hitPast && !s.hit) {
      s.hit = true; trail(s, pos, false); sfx('swing_' + s.cls);
      // their arrow, flying on your screen too (just to see: the hits come from them)
      if (CLASSES[s.cls].draw && typeof BridgeBows !== 'undefined') BridgeBows.ghost(pos, s.facing, s.power || 0.5, s.arrow);
    }
    return s;
  }

  // ---- the wire ---------------------------------------------------------------------------------------------------
  function tell(d) {
    var N = typeof BridgeNet !== 'undefined' ? BridgeNet : null, M = typeof BridgeMulti !== 'undefined' ? BridgeMulti : null;
    if (!N || !M || !N.online || !N.online()) return;
    var here = M.myInst();
    if (!here || !N.peers().some(function (p) { return p.inst === here; })) return;
    N.send('atk', Object.assign({ i: here }, d));
  }

  // ---- stats: what a weapon does, in numbers and plain words (shops, the Backpack, the hotbar, the Collection) ------
  var TRAITS = [
    ['arc', 'Sweep', 'hits the tiles either side'],
    ['reach', 'Reach', 'hits two tiles ahead', function (it) { return it.reach > 1; }],
    ['heavy', 'Heavy', 'staggers a wind-up and knocks back a tile'],
    ['frost', 'Frost', 'slows what it hits for 3 s'],
    ['burn', 'Burn', 'sets it burning: 3 a tick for 3 s'],
    ['holy', 'Holy', '×1.6 against the undead'],
    ['drain', 'Drain', 'heals you a quarter of the damage'],
    ['quick', 'Quick', 'swings faster than most', function (it, c) { return it.rate && CLASSES[c] && it.rate < CLASSES[c].rate; }],
    ['twin', 'Twin', 'a blade in each hand: every cut lands twice'],
    ['bolt', 'Bolt', 'thrown seven tiles, through the first it meets; 2 energy', function (it) { return it.bolt || it.id === 'moon_wand'; }],
    ['draw', 'Draw', 'hold to draw: a full draw flies ten tiles and hits ×1.25', function (it, c) { return c === 'bow'; }],
    ['rock', 'Breaks rock', '', function (it) { return it.power; }]
  ];
  function cycle(cls, item) {                             // ms per swing, averaged over the chain
    var C = CLASSES[cls], sp = speedOf(item, cls), t = 0;
    C.swings.forEach(function (s) { t += totalOf(s.steps, sp); });
    return t / C.swings.length;
  }
  function stats(item) {
    var cls = classOf(item);
    if (!cls || !(item.type === 'weapon' || item.power || item.fights)) return null;     // weapons, and the tools you can fight with

    var ms = cycle(cls, item), tier = ms < 190 ? 5 : ms < 260 ? 4 : ms < 430 ? 3 : ms < 680 ? 2 : 1;
    var speed = ['Very slow', 'Slow', 'Normal', 'Quick', 'Very quick'][tier - 1];
    var reach = cls === 'bow' ? 'up to ' + (item.range || 10) + ' tiles' : item.bolt || item.id === 'moon_wand' ? '7 tiles' : (item.reach || 1) > 1 ? item.reach + ' tiles' : item.arc ? '3 tiles wide' : '1 tile';
    var traits = TRAITS.filter(function (t) { return t[3] ? t[3](item, cls) : item[t[0]]; }).map(function (t) {
      return { k: t[0], name: t[1], line: t[0] === 'rock' ? 'bite ' + item.power + (item.power > 1 ? ' — rock breaks ' + item.power + '× quicker' : '') : t[2] };
    });
    return { cls: cls, kind: CLASSES[cls].name, what: CLASSES[cls].what, damage: item.damage || 0, perSec: Math.round(1000 / ms * 10) / 10,
             ms: Math.round(ms), speed: speed, pips: tier, reach: reach, traits: traits };
  }
  // what you'd fight with now: the selected hotbar weapon, else the best one you carry
  function wielded(except) {
    var it = selectedItem();
    if (it && classOf(it) && it.id !== except) return it;
    if (typeof BridgeInventory === 'undefined' || !BridgeInventory.getAll) return null;
    var best = null, all = BridgeInventory.getAll();
    Object.keys(all).forEach(function (id) {
      var x = BridgeItems.get(id);
      if (x && id !== except && classOf(x) && x.type === 'weapon' && (!best || x.damage > best.damage)) best = x;
    });
    return best;
  }

  // pixel icons for the traits (10 × 10, drawn once)
  var ICONS = {
    arc:   ['..........', '..XXXXXX..', '.X......X.', 'X..XXXX..X', 'X.X....X.X', '..X....X..', '..........', '....XX....', '...X..X...', '..........'],
    twin:  ['.X......X.', '..X....X..', '..X....X..', '...X..X...', '....XX....', '....XX....', '...X..X...', '..X....X..', '.XX....XX.', '..........'],
    reach: ['..........', '......X...', '......XX..', 'XXXXXXXXX.', 'XXXXXXXXXX', 'XXXXXXXXX.', '......XX..', '......X...', '..........', '..........'],
    heavy: ['..........', '..XXXXXX..', '..XXXXXX..', '..XXXXXX..', '....XX....', '....XX....', '....XX....', '....XX....', '...XXXX...', '..........'],
    frost: ['....X.....', '.X..X..X..', '..X.X.X...', '...XXX....', 'XXXXXXXXX.', '...XXX....', '..X.X.X...', '.X..X..X..', '....X.....', '..........'],
    burn:  ['....X.....', '...XX.....', '...XXX....', '..XXXX.X..', '..XXXXXX..', '.XXX.XXXX.', '.XX...XXX.', '.XX...XX..', '..XXXXX...', '..........'],
    holy:  ['....XX....', '....XX....', '..XXXXXX..', '..XXXXXX..', '....XX....', '....XX....', '....XX....', '....XX....', '....XX....', '..........'],
    drain: ['....X.....', '....X.....', '...XXX....', '..XXXXX...', '.XXXXXXX..', '.XXXXXXX..', '.XXXXXXX..', '..XXXXX...', '...XXX....', '..........'],
    quick: ['.....XX...', '....XX....', '...XX.....', '..XXXXXX..', '.....XX...', '....XX....', '...XX.....', '..XX......', '.X........', '..........'],
    draw:  ['..X.......', '..XX......', '..X.X.....', '..X..X....', 'XXXXXXXXX.', '..X..X....', '..X.X.....', '..XX......', '..X.......', '..........'],
    bolt:  ['........X.', '.......XX.', '..X...XX..', '...XXXX...', '..XXXXX...', '..XXXX....', '.XX..X....', 'X.........', '..........', '..........'],
    rock:  ['..........', '...XXXX...', '..XXXXXX..', '.XXX.XXXX.', '.XXXXX.XX.', 'XXXXXXXXXX', 'XX.XXXXXXX', 'XXXXXXX.XX', '.XXXXXXXX.', '..........']
  };
  var TCOL = { twin: '#e8eef8', arc: '#d8dce8', reach: '#d8dce8', heavy: '#c0a080', frost: '#a8e0ff', burn: '#ff9a40', holy: '#ffe890', drain: '#90f0a8',
               quick: '#ffe060', bolt: '#c8a8ff', draw: '#f0e0a0', rock: '#b0a090' };
  var iconUrl = {};
  function icon(k) {
    if (iconUrl[k]) return iconUrl[k];
    var c = document.createElement('canvas'); c.width = 12; c.height = 12;
    var g = c.getContext('2d'), map = ICONS[k] || ICONS.arc;
    for (var y = 0; y < 10; y++) for (var x = 0; x < 10; x++) if (map[y][x] === 'X') {
      g.fillStyle = '#0b0a18'; g.fillRect(x, y, 3, 3);
    }
    for (var y2 = 0; y2 < 10; y2++) for (var x2 = 0; x2 < 10; x2++) if (map[y2][x2] === 'X') { g.fillStyle = TCOL[k] || '#fff'; g.fillRect(x2 + 1, y2 + 1, 1, 1); }
    return (iconUrl[k] = c.toDataURL());
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  /**
   * The stats card for a weapon, as HTML: damage (a number and a bar), speed, reach, its kind, each trait with an icon
   * and a line in plain words. opts: { compare: true (against what you're holding: +12 / −6), compact: true (a shop
   * row), title: true }. Styled by the dialog or menu it sits in (css .wstat).
   */
  function card(item, opts) {
    opts = opts || {};
    var s = stats(item);
    if (!s) return '';
    var vs = opts.compare ? wielded(item.id) : null, vsS = vs ? stats(vs) : null;
    var delta = '';
    if (vsS) {
      var dd = s.damage - vsS.damage, dps = Math.round((s.damage * s.perSec - vsS.damage * vsS.perSec));
      delta = '<span class="ws-vs">vs your ' + esc(vs.name) + ': ' +
        (dd === 0 ? '<b class="ws-even">±0</b>' : '<b class="' + (dd > 0 ? 'ws-up' : 'ws-down') + '">' + (dd > 0 ? '+' : '−') + Math.abs(dd) + '</b>') +
        ' a hit' + (Math.abs(dps) >= 5 ? ' · <b class="' + (dps > 0 ? 'ws-up' : 'ws-down') + '">' + (dps > 0 ? '+' : '−') + Math.abs(dps) + '</b> a second' : '') + '</span>';
    }
    var bar = Math.max(4, Math.min(100, Math.round(s.damage / 80 * 100)));
    var pips = '';
    for (var i = 0; i < 5; i++) pips += '<i class="' + (i < s.pips ? 'on' : '') + '"></i>';
    var html = '<div class="wstat' + (opts.compact ? ' compact' : '') + '">' +
      (opts.title ? '<div class="ws-kind">' + esc(item.name) + '</div>' : '') +
      '<div class="ws-row"><span class="ws-k">Damage</span><b class="ws-dmg">' + s.damage + '</b><span class="ws-bar"><i style="width:' + bar + '%"></i></span>' +
        (opts.compact ? '<span class="ws-tag">' + esc(s.kind) + '</span>' : '') + '</div>' +
      '<div class="ws-row"><span class="ws-k">Speed</span><span class="ws-v">' + s.speed + '</span><span class="ws-pips">' + pips + '</span>' +
      '<span class="ws-k ws-k2">Reach</span><span class="ws-v">' + s.reach + '</span></div>' +
      (opts.compact ? '' : '<div class="ws-what"><b>' + esc(s.kind) + '</b> — ' + esc(s.what) + '</div>') +
      (s.traits.length ? '<div class="ws-traits">' + s.traits.map(function (t) {
        return '<span class="ws-t"><img alt="" src="' + icon(t.k) + '"><b>' + esc(t.name) + '</b>' + (t.line ? ' — ' + esc(t.line) : '') + '</span>';
      }).join('') + '</div>' : '') +
      (delta ? '<div class="ws-cmp">' + delta + '</div>' : '') + '</div>';
    return html;
  }
  /** One plain line for a title attribute or a toast: "40 damage · Normal · 3 tiles wide · Sweep" */
  function line(item) {
    var s = stats(item);
    if (!s) return '';
    return s.damage + ' damage · ' + s.speed + ' · reach ' + s.reach + (s.traits.length ? ' · ' + s.traits.map(function (t) { return t.name; }).join(', ') : '');
  }

  return { CLASSES: CLASSES, classOf: classOf, press: press, swing: swing, update: update, keyDown: keyDown, keyUp: keyUp, roll: roll,
           spend: spend, winded: winded,
           dodging: dodging, rooted: rooted, charging: charging, cancel: cancel, busy: busy, state: state, pose: pose, held: held,
           art: art, cell: cell, anchor: anchor, remote: remote, remoteTick: remoteTick, layout: function () { return layout; },
           draw: draw, drawing: function () { return !!(st && st.kind === 'draw'); }, drawLevel: function () { return st && st.kind === 'draw' ? drawLevel(st, now()) : 0; },
           sheetOf: sheetOf, layoutOf: layoutOf,
           stats: stats, card: card, line: line, wielded: wielded, hasArt: function (id) { return !!TRAIL[id]; } };
})();
