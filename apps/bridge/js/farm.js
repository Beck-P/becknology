/**
 * BridgeFarm — the field on Verdance: till it, plant it, water it, bring it in.
 *
 * The farmstead's field (the world JSON's `farm.plot`, tiles [x0, y0, x1, y1]
 * inclusive) is bare earth in the render; everything you do to it is drawn
 * here. Face a tile of the field and press E — the prompt says what you'll do:
 * TILL it (the hoe from the tool shed, 2 energy), PLANT the seed in your hand
 * (or the first in your pack), WATER it (the can: twenty waterings, a fill at
 * the well or the pond; a watering wets the tile you face and the one either
 * side), HARVEST what's ripe. The tools work from the hotbar too (F).
 *
 * Crops grow on Verdance's clock, but only while their ground is wet: a
 * watering keeps a tile wet to the end of the Verdance day (six real hours a
 * day; two hours at the least), then it dries and the crop waits. Turnips take
 * a watered day, carrots two, strawberries and sunflowers three (strawberries
 * crop again every two), pumpkins six, starfruit twelve. Marlo buys the lot. The field is kept in localStorage
 * (bridge_farm), so what you planted is still growing when you come back.
 *
 * Also the Verdance tileset's scene hooks: tilled earth (ground), the crops
 * (items, sorted with the characters), and the life of the place (over):
 * chimney smoke, cloud shadows, butterflies, bees at the skeps, glints on the
 * pond, a sparkle over anything ready to pick.
 *
 *   BridgeFarm.decorate(worldId, data)   // world.js, as a world loads
 *   BridgeFarm.use(inter)                // interactions.js: farm_plot, farm_tools, farm_well
 *   BridgeFarm.useItem(id)               // items.js: the hoe, the can, seeds, from the hotbar
 */
var BridgeFarm = (function () {
  var KEY = 'bridge_farm';
  // Crops grow on Verdance's clock (js/clock.js: a day is 6 real hours) — `days` of wet ground — and a watering keeps
  // the ground wet to the end of the Verdance day it's given on (two hours at the least): water in the morning and
  // it grows all day. (They used to take minutes, and a field of strawberries paid more than everything else together.)
  var CAN = 20;                      // waterings in a full can
  var CROPS = {
    turnip:     { name: 'TURNIP', days: 1, out: [['turnip', 1, 1]] },
    carrot:     { name: 'CARROT', days: 2, out: [['carrot', 1, 1]] },
    strawberry: { name: 'STRAWBERRY', days: 3, again: 2, out: [['strawberry', 2, 3]] },
    sunflower:  { name: 'SUNFLOWER', days: 3, out: [['sunflower', 1, 1], ['seed_sunflower', 1, 2]] },
    pumpkin:    { name: 'PUMPKIN', days: 6, out: [['pumpkin', 1, 1]] },
    starfruit:  { name: 'STARFRUIT', days: 12, out: [['starfruit', 1, 1]] },
    // flax for rope and plain sailcloth at your workshop (js/workshop.js)
    flax:       { name: 'FLAX', days: 2, out: [['flax', 2, 3]] }
  };
  function vday() { return typeof BridgeClock !== 'undefined' ? BridgeClock.dayLen('verdance') : 6 * 3600000; }
  function growMs(days) { return days * vday(); }
  /** Until when a watering given now keeps the ground wet: the end of this Verdance day, or two hours. */
  function wetUntil(now) {
    var T = typeof BridgeClock !== 'undefined' ? BridgeClock.time('verdance') : null;
    var left = T ? T.len - T.t : 6 * 3600000;
    if (typeof BridgeWeather !== 'undefined' && BridgeWeather.heat && BridgeWeather.heat()) return now + Math.max(3600000, left / 2);   // a heat wave dries it out
    return now + Math.max(2 * 3600000, left);
  }
  function hash01(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; }
  var WET = 2 * 3600000;             // the least a watering (or a hand's) wet lasts
  var ORDER = ['turnip', 'carrot', 'strawberry', 'sunflower', 'pumpkin', 'starfruit', 'flax'];

  var save = load();
  var cur = null;                    // the field interaction in front of you: {inter, sig}
  var bits = [];                     // clods and droplets in the air
  var lastTick = 0;

  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { tiles: d.tiles || {}, can: d.can || 0, given: !!d.given, picked: d.picked || {}, worked: d.worked || 0 };
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function say(label, text) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(label, text); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }
  function float(x, y, text, colour) {
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(x, y - 0.3, text, colour);
  }
  function has(id) { return typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount(id) > 0; }
  // a field tile's key: plain "x,y" on Verdance (as it always was), "<world>|x,y" anywhere else with a plot (the garden on
  // your holm, js/holm.js), so each field keeps its own crops
  function wid() { return typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorldId ? BridgeWorld.getWorldId() : 'verdance'; }
  function onVerdance() { return wid() === 'verdance'; }
  function key(x, y) { var w = wid(); return (w && w !== 'verdance' ? w + '|' : '') + x + ',' + y; }
  function xyOf(k) { var i = k.indexOf('|'); return (i >= 0 ? k.slice(i + 1) : k).split(','); }
  function here(k) { var w = wid(); return w && w !== 'verdance' ? k.indexOf(w + '|') === 0 : k.indexOf('|') < 0; }
  /** May you dig this tile? Verdance asks the homestead (Edda's field); the holm asks whether its garden's been cleared. */
  function workable(world, x) {
    if (!onVerdance()) return typeof BridgeHolm !== 'undefined' && BridgeHolm.canFarm();
    return typeof BridgeHomestead === 'undefined' || BridgeHomestead.canWork(world, x);
  }

  // ---- the field ------------------------------------------------------------------------------------
  function plotOf(world) { return world && world.farm && world.farm.plot; }
  function inPlot(world, x, y) {
    var p = plotOf(world);
    return !!p && x >= p[0] && x <= p[2] && y >= p[1] && y <= p[3];
  }

  // growth accrues only over the part of the time since we last looked that the ground was wet
  function advance(t, now, k) {
    var c = t.crop;
    if (!c) return;
    var from = c.t || now, wetTo = t.wet || 0;
    // a sprinkler beside it, or Tam on the payroll, keeps it watered (js/homestead.js)
    var kept = k && k.indexOf('|') < 0 && typeof BridgeHomestead !== 'undefined' ? BridgeHomestead.keptWet(k, now) : 0;   // (Verdance's)
    if (kept) { wetTo = Math.max(wetTo, Math.min(now, kept)); if (kept > now) t.wet = Math.max(t.wet || 0, Math.min(kept, now + WET)); }
    // a storm (js/weather.js) flattens half the crops that have grown tall (past 40%), an hour into it: they stop
    // growing till they're staked up (E, or Tam does it on his round)
    var Wx = typeof BridgeWeather !== 'undefined' && BridgeWeather.stormsBetween ? BridgeWeather : null;
    if (Wx && !c.flat && c.g < c.need && c.g / c.need >= 0.4 && now > from) {
      Wx.stormsBetween(k && k.indexOf('|') >= 0 ? 'lumar' : 'verdance', from, now).forEach(function (st) {
        var when = st.from + 3600000;
        if (c.flat || st.id <= (c.storm || 0) || when > now) return;
        c.storm = st.id;
        if (hash01((k || '') + ':' + st.id) < 0.5) c.flat = Math.max(from, when);
      });
    }
    var until = c.flat ? Math.min(now, c.flat) : now;
    var pace = (typeof BridgeSeasons !== 'undefined' ? BridgeSeasons.growth(c.k) : 1) * (typeof BridgeCodex !== 'undefined' && BridgeCodex.bonus('farm') ? 1.1 : 1);   // the season favours some crops; winter slows all (the farm's set in the Collection: a tenth quicker)
    if (wetTo > from && until > from) c.g = Math.min(c.need, c.g + (Math.min(until, wetTo) - from) * pace);
    if (c.g >= c.need && !c.ripeAt) c.ripeAt = now;
    c.t = now;
  }
  function on(id, at) { return typeof BridgeHomestead !== 'undefined' && (BridgeHomestead.activeAt ? BridgeHomestead.activeAt(id, at) : BridgeHomestead.active(id)); }
  function advanceAll(now) {
    for (var k in save.tiles) advance(save.tiles[k], now, k);
    // Tam stakes up what a storm flattened, on his round (an hour or so after)
    if (on('tam', now)) {
      for (var f in save.tiles) {
        var fc = save.tiles[f].crop;
        if (fc && fc.flat && f.indexOf('|') < 0 && now - fc.flat > 3600000) { fc.flat = 0; fc.t = now; }
      }
    }
    // Odile brings in whatever's been ripe a while (she walks to the rest herself while you're watching)
    if (on('odile', now)) {
      for (var j in save.tiles) {
        if (j.indexOf('|') >= 0) continue;                         // she works Verdance's field, not your holm's garden
        var c = save.tiles[j].crop;
        if (c && c.g >= c.need && now - (c.ripeAt || now) > 60000) pickFor(j, now);
      }
    }
  }
  // The hands work whether you're on the farm or not, or playing at all: every half minute wherever you are, and the
  // time you were away is worked through in ten-minute steps when the game opens — so Odile brought each crop in
  // when it ripened, what she replanted has been growing since, and Tam's rows stayed wet. (save.worked: done up to.)
  var STEP = 10 * 60000, BACK = 14 * 24 * 3600000;
  function work(now) {
    var from = Math.max(save.worked || now, now - BACK);
    for (var t = Math.min(now, from + STEP); ; t = Math.min(now, t + STEP)) { advanceAll(t); if (t >= now) break; }
    if (save.worked !== now) { save.worked = now; store(); }
  }
  setTimeout(function () { work(Date.now()); setInterval(function () { work(Date.now()); }, 30000); }, 1500);
  /** A ripe crop brought in by a hand: into the shipping bin, and the same planted again if the seed box has it. */
  function pickFor(k, at) {
    var t = save.tiles[k], when = at || Date.now();
    if (!t || !t.crop || t.crop.g < t.crop.need) return;
    var C = CROPS[t.crop.k];
    C.out.forEach(function (o) {
      var n = o[1] + Math.floor(Math.random() * (o[2] - o[1] + 1));
      if (n > 0) BridgeHomestead.toBin(o[0], n);
    });
    save.picked[t.crop.k] = (save.picked[t.crop.k] || 0) + 1;
    var kind = t.crop.k;
    if (C.again) { t.crop.g = 0; t.crop.need = growMs(C.again); t.crop.again = true; t.crop.t = when; t.crop.ripeAt = 0; }
    else if (BridgeHomestead.takeSeed(kind)) t.crop = { k: kind, g: 0, need: growMs(C.days), t: when };
    else delete t.crop;
    store();
    var xy = xyOf(k);
    if (here(k) && Date.now() - when < 60000) burst(+xy[0], +xy[1], '#90d060', 5, 1);
  }
  function wet(t, now) { return (t.wet || 0) > now; }
  function ripe(c) { return c.g >= c.need; }
  function stage(c) {
    var f = c.g / c.need;
    if (f >= 1) return 4;
    if (c.again) return 3;
    return f < 0.12 ? 0 : f < 0.42 ? 1 : f < 0.78 ? 2 : 3;
  }

  function faced() {
    var f = BridgeCharacter.getFacing();
    return [BridgeCharacter.getX() + (f === 'right' ? 1 : f === 'left' ? -1 : 0),
            BridgeCharacter.getY() + (f === 'down' ? 1 : f === 'up' ? -1 : 0), f];
  }

  // the seed you'd plant: the one in your hand, else the first you carry
  function seedChoice() {
    var sel = typeof BridgeInventory !== 'undefined' && BridgeInventory.getSelectedItemId();
    if (sel && /^seed_/.test(sel) && CROPS[sel.slice(5)]) return sel.slice(5);
    for (var i = 0; i < ORDER.length; i++) if (has('seed_' + ORDER[i])) return ORDER[i];
    return null;
  }
  function canReady() { return has('watering_can') && save.can > 0; }

  // what pressing E on this tile would do
  function plan(x, y, now) {
    var H = typeof BridgeHomestead !== 'undefined' && onVerdance() ? BridgeHomestead : null;
    if (H && H.sprinklerAt(key(x, y))) return { act: 'lift', verb: 'LIFT', label: 'SPRINKLER' };
    if (!workable(BridgeWorld.getWorld(), x) && !save.tiles[key(x, y)]) return { act: 'locked', verb: 'LOOK', label: H ? 'EDDA\'S FIELD' : 'THE GARDEN' };
    if (H && has('sprinkler') && BridgeInventory.getSelectedItemId && BridgeInventory.getSelectedItemId() === 'sprinkler' && !(save.tiles[key(x, y)] || {}).crop)
      return { act: 'sprinkle', verb: 'SET THE SPRINKLER', label: 'FIELD' };
    var t = save.tiles[key(x, y)];
    if (!t) return has('hoe') ? { act: 'till', verb: 'TILL', label: 'FIELD' } : { act: 'look', verb: 'LOOK', label: 'FIELD' };
    if (!t.crop) {
      var s = seedChoice();
      if (s) return { act: 'plant', seed: s, verb: 'PLANT', label: CROPS[s].name };
      if (!wet(t, now) && canReady()) return { act: 'water', verb: 'WATER', label: 'TILLED EARTH' };
      return { act: 'look', verb: 'LOOK', label: 'TILLED EARTH' };
    }
    var C = CROPS[t.crop.k];
    if (t.crop.flat && t.crop.flat <= now) return { act: 'stake', verb: 'STAKE IT UP', label: C.name + ' (FLATTENED)' };
    if (ripe(t.crop)) return { act: 'harvest', verb: 'HARVEST', label: C.name };
    if (!wet(t, now) && canReady()) return { act: 'water', verb: 'WATER', label: C.name };
    return { act: 'look', verb: 'LOOK', label: C.name };
  }

  // keep one interaction on the field tile you face, saying what E will do there
  function sync(world, now) {
    if (now - lastTick > 1000) { lastTick = now; work(Date.now()); }
    var want = null;
    if (typeof BridgeCharacter !== 'undefined' && !(BridgeCharacter.isHidden && BridgeCharacter.isHidden()) &&
        !(BridgeCharacter.isSeated && BridgeCharacter.isSeated())) {
      var f = faced();
      if (inPlot(world, f[0], f[1])) {
        var p = plan(f[0], f[1], Date.now());
        want = { sig: f[0] + ',' + f[1] + ':' + p.act + ':' + p.label + ':' + (p.act === 'water' ? save.can : ''), x: f[0], y: f[1], p: p };
      }
    }
    if (cur && (!want || want.sig !== cur.sig)) {
      var ix = world.interactions.indexOf(cur.inter);
      if (ix >= 0) world.interactions.splice(ix, 1);
      cur = null;
    }
    if (want && !cur) {
      cur = { sig: want.sig, inter: { x: want.x, y: want.y, type: 'farm_plot', label: want.p.label,
                                      prompt: 'PRESS E TO ' + want.p.verb, noBeacon: true } };
      world.interactions.push(cur.inter);
    }
  }

  // ---- doing things -----------------------------------------------------------------------------------
  function tired(n, x, y) {
    if (BridgeInventory.getStats().energy >= n) return false;
    sfx('error'); float(x, y, 'TOO TIRED', '#f0a060');
    say('TOO TIRED', 'YOUR ARMS ARE DONE FOR. EAT SOMETHING - AN APPLE FROM THE ORCHARD, A TURNIP - OR SIT AND REST A WHILE.');
    return true;
  }
  function burst(x, y, colour, n, up) {
    for (var i = 0; i < n; i++) {
      bits.push({ x: x + 0.5 + (Math.random() - 0.5) * 0.5, y: y + 0.55, vx: (Math.random() - 0.5) * 1.6,
                  vy: -(up || 1.2) * (0.5 + Math.random()), life: 1, c: colour });
    }
  }

  function till(x, y) {
    if (save.tiles[key(x, y)]) return;
    if (tired(2, x, y)) return;
    var dig = function () {
      if (save.tiles[key(x, y)] || tired(2, x, y)) return false;
      BridgeInventory.useEnergy(2);
      save.tiles[key(x, y)] = { wet: 0 };
      store();
      sfx('till');
      burst(x, y, '#6a4428', 7, 1.4);
      return false;
    };
    // the hoe goes up and comes down (js/arms.js): the earth turns on the landing frame
    if (has('hoe') && typeof BridgeArms !== 'undefined' && BridgeArms.swing({ id: 'hoe', cls: 'pick', onHit: dig })) return;
    dig();
  }

  function plant(x, y, k) {
    var t = save.tiles[key(x, y)];
    if (!t || t.crop || !CROPS[k] || !has('seed_' + k)) return false;
    BridgeInventory.removeItem('seed_' + k, 1);
    t.crop = { k: k, g: 0, need: growMs(CROPS[k].days), t: Date.now() };
    store();
    sfx('sow');
    burst(x, y, '#c8a070', 3, 0.6);
    if (!wet(t, Date.now())) float(x, y, 'WATER ME', '#80d0f0');
    return true;
  }

  // the can wets the tile you face and the one either side of it
  function water(x, y, facing) {
    if (!has('watering_can')) return;
    if (save.can <= 0) { sfx('error'); float(x, y, 'CAN EMPTY', '#80d0f0'); return; }
    var now = Date.now(), side = facing === 'left' || facing === 'right' ? [0, 1] : [1, 0], n = 0;
    var world = BridgeWorld.getWorld();
    [[x, y], [x + side[0], y + side[1]], [x - side[0], y - side[1]]].forEach(function (c) {
      var t = save.tiles[key(c[0], c[1])];
      if (!t || save.can <= 0 || !inPlot(world, c[0], c[1])) return;
      advance(t, now, key(c[0], c[1]));
      t.wet = wetUntil(now);
      if (t.crop) t.crop.t = now;
      save.can--; n++;
      burst(c[0], c[1], '#9ad8f8', 5, 0.9);
    });
    if (!n) return;
    store();
    sfx('water');
    float(x, y, save.can + '/' + CAN, '#80d0f0');
  }

  function harvest(x, y) {
    var t = save.tiles[key(x, y)];
    if (!t || !t.crop || !ripe(t.crop)) return;
    var C = CROPS[t.crop.k];
    C.out.forEach(function (o) {
      var n = o[1] + Math.floor(Math.random() * (o[2] - o[1] + 1));
      if (n > 0 && typeof BridgeLoot !== 'undefined') BridgeLoot.spawn(x, y, o[0], n);
    });
    save.picked[t.crop.k] = (save.picked[t.crop.k] || 0) + 1;
    if (C.again) { t.crop.g = 0; t.crop.need = growMs(C.again); t.crop.again = true; t.crop.t = Date.now(); }
    else delete t.crop;
    store();
    sfx('harvest');
    burst(x, y, '#90d060', 6, 1.2);
  }

  function minutes(ms) {
    var m = Math.ceil(ms / 60000);
    if (m <= 1) return 'A MINUTE OR SO';
    if (m < 90) return m + ' MINUTES';
    var h = Math.round(m / 30) / 2;
    return h >= 24 ? (Math.round(h / 12) / 2) + ' DAYS' : h + ' HOURS';
  }

  function look(x, y) {
    var t = save.tiles[key(x, y)], now = Date.now();
    if (!t) {
      return say('THE FIELD', has('hoe') ? 'BARE EARTH, CRUMBLY AND WARM. FACE IT WITH THE HOE IN YOUR PACK AND PRESS E TO TILL A ROW.'
                                         : 'BARE EARTH, CRUMBLY AND WARM, WAITING TO BE WORKED. THERE\'S A HOE IN THE TOOL SHED BY THE BARN.');
    }
    var wetLine = wet(t, now) ? 'THE EARTH IS DARK AND WET - ' + minutes(t.wet - now) + ' BEFORE IT DRIES.'
                              : (has('watering_can') ? (save.can > 0 ? 'THE EARTH IS DRY.' : 'THE EARTH IS DRY, AND YOUR CAN IS EMPTY - FILL IT AT THE WELL OR THE POND.')
                                                      : 'THE EARTH IS DRY. THE WATERING CAN IS IN THE TOOL SHED.');
    if (!t.crop) return say('TILLED EARTH', 'A TILLED ROW, READY FOR SEED. HOLLIN SELLS THEM AT THE STALL DOWN THE LANE.\n\n' + wetLine);
    var c = t.crop, C = CROPS[c.k];
    var growing = wet(t, now) ? 'GROWING - READY IN ' + minutes(c.need - c.g) + ' OF WET GROUND.'
                              : 'WAITING FOR WATER. IT NEEDS ' + minutes(c.need - c.g) + ' MORE OF WET GROUND.';
    say(C.name, (c.again ? 'FLOWERING AGAIN. ' : '') + growing + '\n\n' + wetLine);
  }

  function act(x, y, f) {
    var world = BridgeWorld.getWorld();
    if (!inPlot(world, x, y)) return;
    var p = plan(x, y, Date.now());
    if (p.act === 'till') till(x, y);
    else if (p.act === 'plant') plant(x, y, p.seed);
    else if (p.act === 'water') water(x, y, f);
    else if (p.act === 'harvest') harvest(x, y);
    else if (p.act === 'stake') stake(x, y);
    else if (p.act === 'lift') BridgeHomestead.liftSprinkler(x, y);
    else if (p.act === 'sprinkle') BridgeHomestead.placeSprinkler(x, y);
    else if (p.act === 'locked') say('EDDA\'S FIELD', 'THIS END OF THE FIELD IS STILL EDDA\'S. THE KITCHEN GARDEN - THE NEAR END, PAST THE TWINE - IS YOURS TO WORK; THE REST COMES WITH THE FARM. HER NOTE\'S ON THE FARMHOUSE DOOR.');
    else look(x, y);
  }

  // a crop the storm flattened, staked up again: it grows on from where it was
  function stake(x, y) {
    var t = save.tiles[key(x, y)];
    if (!t || !t.crop || !t.crop.flat || tired(1, x, y)) return;
    BridgeInventory.useEnergy(1);
    t.crop.flat = 0; t.crop.t = Date.now();
    store();
    sfx('sow');
    burst(x, y, '#90d060', 4, 1);
    float(x, y, 'STAKED UP', '#a8e070');
  }

  function fill() {
    if (!has('watering_can')) {
      return say('WATER', 'COLD, CLEAR WATER - AND NOTHING TO CARRY IT IN. THERE\'S A WATERING CAN IN THE TOOL SHED.');
    }
    save.can = CAN; store();
    sfx('splash');
    float(BridgeCharacter.getX(), BridgeCharacter.getY(), 'CAN FULL ' + CAN + '/' + CAN, '#80d0f0');
  }

  function shed() {
    var gave = [];
    if (!has('hoe') && BridgeInventory.addItem('hoe', 1)) gave.push('A HOE');
    if (!has('watering_can') && BridgeInventory.addItem('watering_can', 1)) { gave.push('A WATERING CAN'); save.can = Math.max(save.can, 10); }
    if (!save.given && BridgeInventory.addItem('seed_turnip', 8)) { gave.push('A TWIST OF PAPER: EIGHT TURNIP SEEDS, "TO START YOU OFF - H."'); save.given = true; }
    store();
    if (!gave.length) {
      return say('TOOL SHED', 'RAKES, TWINE, SEED TRAYS AND A SCYTHE NOBODY HAS SHARPENED IN YEARS. YOU HAVE WHAT YOU NEED.');
    }
    sfx('pickup');
    say('TOOL SHED', 'YOU TAKE ' + gave.join(', AND ') + '.\n\nTILL THE FIELD WITH THE HOE, PLANT, THEN WATER - FACE A TILE AND PRESS E, OR USE THE TOOL FROM YOUR HOTBAR. THE WELL BY THE SCARECROW FILLS THE CAN.');
  }

  function use(inter) {
    if (inter.type === 'farm_tools') return shed();
    if (inter.type === 'farm_well') return fill();
    if (inter.type === 'farm_plot') return act(inter.x, inter.y, BridgeCharacter.getFacing());
  }

  // the tools from the hotbar (F): they act on the tile you face
  function useItem(id) {
    var world = BridgeWorld.getWorld(), f = faced(), x = f[0], y = f[1];
    var here = world && plotOf(world);
    if (id === 'watering_can') {
      var src = world && world.interactions.filter(function (it) {
        return it.x === x && it.y === y && (it.type === 'farm_well' || (it.type === 'fish' && it.pool === 'pond'));
      })[0];
      if (src) return fill();
      if (here && inPlot(world, x, y) && save.tiles[key(x, y)]) return water(x, y, f[2]);
      return float(BridgeCharacter.getX(), BridgeCharacter.getY(), 'CAN ' + save.can + '/' + CAN, '#80d0f0');
    }
    if (!here) return say(BridgeItems.get(id).name.toUpperCase(), 'NOTHING TO DO WITH THAT HERE. IT\'S FOR A FIELD - THE ONE ON VERDANCE, OR A GARDEN OF YOUR OWN.');
    if (!inPlot(world, x, y)) return float(BridgeCharacter.getX(), BridgeCharacter.getY(), 'FACE THE FIELD', '#f0e0a0');
    var t = save.tiles[key(x, y)];
    if (id === 'hoe') {
      if (!t) return till(x, y);
      return float(x, y, t.crop ? 'GROWING' : 'TILLED', '#f0e0a0');
    }
    if (id === 'sprinkler') {
      if (!onVerdance()) return float(x, y, 'FOR VERDANCE\'S FIELD', '#f0e0a0');
      if (t && t.crop) return float(x, y, 'NOT ON A CROP', '#f0e0a0');
      if (typeof BridgeHomestead !== 'undefined' && !BridgeHomestead.canWork(world, x)) return float(x, y, 'NOT YOUR FIELD YET', '#f0e0a0');
      return BridgeHomestead.placeSprinkler(x, y);
    }
    if (!workable(world, x) && !t) return float(x, y, onVerdance() ? 'NOT YOUR FIELD YET' : 'CLEAR THE GARDEN FIRST', '#f0e0a0');
    if (/^seed_/.test(id)) {
      if (!t) return float(x, y, 'TILL IT FIRST', '#f0e0a0');
      if (t.crop) return float(x, y, 'ALREADY PLANTED', '#f0e0a0');
      plant(x, y, id.slice(5));
    }
  }

  function decorate(worldId, data) {
    if (!plotOf(data)) return;
    cur = null;                                   // a fresh copy of the world: the old one held the last field target
    advanceAll(Date.now());
    store();
    data.interactions.forEach(function (it) {
      if (it.type === 'farm_well') it.prompt = 'PRESS E TO FILL THE CAN';
    });
  }

  // ---- art: crops drawn on the 16-unit grid, two native px a unit -------------------------------------
  var PAL = {
    k: '#1c2c12', g: '#4a8a2a', G: '#7ac040', d: '#2e5a1c', s: '#3a6a20', b: '#4a2c16', B: '#6a4422',
    p: '#a050a0', w: '#f0eaf0', o: '#f08020', O: '#b85a10', r: '#e02a3a', R: '#8a1020', y: '#f8c820',
    Y: '#fff080', n: '#7a4a18', N: '#3a1a08', f: '#fff8f0', P: '#f08a20', Q: '#b05a10', h: '#ffb860',
    S: '#ffe040', T: '#fff8c0', X: '#2a1608', L: '#5a7ae0', l: '#c8d4ff', U: '#d8b860', u: '#a08030'
  };
  var SEEDED = ['......bBBb......', '.....bBwBBb.....', '....bBBBBwBb....'];
  var SPROUT = ['....kk....kk....', '...kGGk..kGGk...', '...kgGGkkGGgk...', '....kkgssgkk....', '......kssk......', '.....bBBBBb.....'];
  var YOUNG = ['.....kk..kk.....', '....kGGkkGGk....', '..kkkgGGGGgkkk..', '.kGGGkgGGgkGGGk.', '.kgGGGkgskGGGgk.',
               '..kkgggkskgggkk.', '....kkkssskkk...', '......kssk......', '.....bBBBBb.....'];
  var CARROT_TOP = ['....k..k..k.....', '...kGkkGkkGk....', '..kGgkGgkGgk.k..', '..kgGkgGkgGkkGk.', '.kGkgGkGgkgkGgk.',
                    '.kgGkgkgGkkGgk..', '..kgGkgskkgGk...', '...kkkgsskkk....'];
  var SUN_STALK = ['.......ks.......', '..kk...ks.......', '.kGGk..ks..kk...', '.kgGGkkks.kGGk..', '..kkgggss.kGgk..',
                   '....kk.skkggk...', '.......ssgkk....', '..kk...ks.......', '.kGGk..ks.......', '.kgGGkkks..kk...',
                   '..kkgggsskkGGk..', '....kk.sggGgk...', '.......sskkk....', '......kssk......', '.....bBBBBb.....'];
  var PUMP_LEAVES = ['...kk.......kk..', '..kGGk.kk..kGGk.', '..kgGGkGGkkGgk..', '.kkkgggGgggkkkk.'];
  var STAR_TRUNK = ['....kkksskk.....', '......kssk......', '......kssk......', '.....bBBBBb.....'];
  var FLAX_STEMS = ['..ks..ks.ks..k..', '..ks.ks..ks.ks..', '...kskskkskks...', '....ksksksks....', '.....kssssk.....', '.....bBBBBb.....'];
  var ART = {
    turnip: [null, null, null,
      ['...kk......kk...', '..kGGk.kk.kGGk..', '..kgGGkGGkGGgk..', '.kkgdGGgGGGdgkk.', 'kGGkgdGGGGdgkGGk', 'kgGGkgdgGdgkGGgk',
       '.kgggkkdddkkgggk', '..kkkkdssdkkkk..', '.....bBBBBBb....'],
      ['...kk......kk...', '..kGGk.kk.kGGk..', '..kgGGkGGkGGgk..', '.kkgdGGgGGGdgkk.', 'kGGkgdGGGGdgkGGk', 'kgGGkgdsGdgkGGgk',
       '.kgggkXXXXkgggk.', '..kkkXppppXkkk..', '....XpppppwX....', '....XwwwwwwX....', '.....XwwwwX.....', '....bBXXXXBb....']],
    carrot: [null, null, null,
      CARROT_TOP.concat(['.....kssk.......', '....bBBBBb......']),
      CARROT_TOP.concat(['....XOooooX.....', '....XoooOoX.....', '....bXooOXBb....'])],
    strawberry: [null, null, null,
      ['....kk..kk......', '...kGGkkGGk.kk..', '..kGgfkgGGkkGGk.', '.kkgfYfkgGgkgGk.', 'kGGkgfkGkgGkgk..', 'kgGGkkGGgkkgfk..',
       '.kgggkgGGgkfYfk.', '..kkkkkgskkkfk..', '......kssk......', '.....bBBBBb.....'],
      ['....kk..kk......', '...kGGkkGGk.kk..', '..kGgRkgGGkkGGk.', '.kkgRrRkgGgkgGk.', 'kGGkRrYRkgGkRk..', 'kgGGkRrRgkkRrRk.',
       '.kgggkRkGgkRrYRk', '..kkkkkgskkkRRk.', '......kssk......', '.....bBBBBb.....']],
    sunflower: [null, null, null,
      ['......kkk.......', '.....kgGgk......', '.....kgggk......', '......kkk.......'].concat(SUN_STALK),
      ['....XXXXXXX.....', '...XyYyYyYyX....', '..XyYyNNNyYyX...', '..XYyNnNnNyYX...', '..XyYNNnNNYyX...',
       '...XyYyNyYyX....', '....XXyYyXX.....', '......XkX.......'].concat(SUN_STALK)],
    pumpkin: [null, null, null,
      PUMP_LEAVES.concat(['kGGkkYYkgkkgGGk.', 'kgGkYyYkskkggk..', '.kkkkYkkssgggkk.', '..kGGkkkssskGGk.', '..kgGgggsgggGgk.',
                          '...kkkkkkkkkkk..']),
      PUMP_LEAVES.concat(['kGGkkkkXsXkkGGk.', 'kgGkXXXXsXXXXk..', '.kkXPPQPPPQPPX..', '..XPhQPPPPQPPPX.', '..XPQPPPPPPQPPX.',
                          '..XPQPPPPPPQPPX.', '..XQPQPPPPQPQQX.', '...XQQQQQQQQQX..', '....XXXXXXXXX...'])],
    flax: [null, null, null,
      ['..k...k..k...k..', '.kGk.kGk.kGk.kGk', '..g...g..g...g..'].concat(['..g..g...g..g...', '..s..s..s...s...']).concat(FLAX_STEMS),
      ['.kLk..kLk.kLk...', 'kLlLk.LlL.LlLkLk', '.kLk..kLkkkLkLlL', '..s...s..s..kLk.', '..s..s...s...s..', '..s..s..s...s...'].concat(FLAX_STEMS)],
    starfruit: [null, null, null,
      ['.....kkkkk......', '...kkGGgGGkk....', '..kGGgfGgGGgk...', '.kGgGGgGGfGGgk..', '.kgGfGGgGGGgGk..', '.kggGGgdgGfggk..',
       '..kkggdddggkk...'].concat(STAR_TRUNK),
      ['.....kkkkk......', '...kkGGgGGkk....', '..kGGgXSXGGgk...', '.kGgGXSTSXGGgk..', '.kgGGgXSXGXSXk..', '.kXSXGGgGXSTSXk.',
       '.XSTSXgdgGXSXk..', '..XSXggdddggkk..'].concat(STAR_TRUNK)]
  };
  var BASE = 26;                      // the grid row the art stands on: a little below the tile's middle
  var sprites = {};
  function sprite(k, st) {
    var id = k + st;
    if (sprites[id]) return sprites[id];
    var rows = st === 0 ? SEEDED : st === 1 ? SPROUT : st === 2 ? YOUNG : ART[k][st];
    var c = document.createElement('canvas');
    c.width = 32; c.height = 64;
    var g = c.getContext('2d'), top = BASE - rows.length;
    g.fillStyle = 'rgba(20,30,10,0.28)';                                 // a soft shadow under it
    g.fillRect(10, BASE * 2 - 2, 12, 2); g.fillRect(8, BASE * 2 - 1, 16, 2);
    for (var r = 0; r < rows.length; r++) {
      for (var i = 0; i < 16; i++) {
        var ch = rows[r].charAt(i);
        if (ch === '.' || !PAL[ch]) continue;
        g.fillStyle = PAL[ch];
        g.fillRect(i * 2, (top + r) * 2, 2, 2);
      }
    }
    sprites[id] = c;
    return c;
  }

  // tilled earth: furrows across the tile, dark and glossy when it's wet
  var soil = {};
  function soilTile(isWet, v) {
    var id = (isWet ? 'w' : 'd') + v;
    if (soil[id]) return soil[id];
    var c = document.createElement('canvas');
    c.width = c.height = 32;
    var g = c.getContext('2d');
    var base = isWet ? '#46301e' : '#68442a', furrow = isWet ? '#2e1e12' : '#4e321c', lip = isWet ? '#5e4636' : '#82583a';
    g.fillStyle = base; g.fillRect(2, 2, 28, 28); g.fillRect(4, 0, 24, 32); g.fillRect(0, 4, 32, 24);
    for (var r = 0; r < 4; r++) {
      var y = 4 + r * 7 + (v & 1);
      g.fillStyle = furrow; g.fillRect(2, y, 28, 2);
      g.fillStyle = lip; g.fillRect(2, y + 2, 28, 1);
    }
    g.fillStyle = isWet ? 'rgba(170,200,230,0.35)' : 'rgba(160,120,80,0.6)';
    for (var s = 0; s < 6; s++) g.fillRect(4 + ((s * 11 + v * 5) % 24), 3 + ((s * 7 + v * 3) % 26), 2, 1);
    soil[id] = c;
    return c;
  }

  // ---- scene hooks ------------------------------------------------------------------------------------
  function twine(ctx, world, offX, offY, ts) {
    var p = plotOf(world), H = typeof BridgeHomestead !== 'undefined' ? BridgeHomestead : null;
    if (!p || !H || H.owned() || !onVerdance()) return;
    var x = Math.round(offX + H.starterEdge(world) * ts) - 1, u = ts / 16;
    ctx.fillStyle = 'rgba(232,220,180,0.7)';
    ctx.fillRect(x, Math.round(offY + p[1] * ts), 1, Math.round((p[3] - p[1] + 1) * ts));
    for (var y = p[1]; y <= p[3] + 1; y += 2) {
      ctx.fillStyle = '#3a2410'; ctx.fillRect(x - u, Math.round(offY + y * ts) - 4 * u, 2 * u, 5 * u);
      ctx.fillStyle = '#7a5a38'; ctx.fillRect(x - u, Math.round(offY + y * ts) - 4 * u, u, 4 * u);
    }
  }
  function ground(ctx, world, offX, offY, ts) {
    if (!plotOf(world)) return;
    var now = Date.now();
    for (var k in save.tiles) {
      if (!here(k)) continue;
      var xy = xyOf(k), x = +xy[0], y = +xy[1];
      if (!inPlot(world, x, y)) continue;
      ctx.drawImage(soilTile(wet(save.tiles[k], now), (x * 7 + y * 3) % 3), Math.round(offX + x * ts), Math.round(offY + y * ts));
    }
    twine(ctx, world, offX, offY, ts);
  }

  function items(world, offX, offY, ts, now) {
    if (!plotOf(world)) return [];
    sync(world, now);
    var out = typeof BridgeHomestead !== 'undefined' && onVerdance()
      ? BridgeHomestead.items(world, offX, offY, ts, now, typeof BridgeScene !== 'undefined' && world.scene ? BridgeScene.get(world.scene.id) : null) : [];
    for (var k in save.tiles) {
      var t = save.tiles[k];
      if (!t.crop || !here(k)) continue;
      var xy = xyOf(k), x = +xy[0], y = +xy[1];
      if (!inPlot(world, x, y)) continue;
      (function (img, dx, dy, foot, flat) {
        out.push({ footRow: foot, draw: function (c) {
          if (flat) c.drawImage(img, dx - 4, dy + 44, img.width + 8, 20);     // laid flat by the storm
          else c.drawImage(img, dx, dy);
        } });
      })(sprite(t.crop.k, stage(t.crop)), Math.round(offX + x * ts), Math.round(offY + (y + 1) * ts) - 64, y + 0.82, t.crop.flat && t.crop.flat <= now);
    }
    return out;
  }

  var butterflies = [[25, 12, '#fff4d0'], [30, 13, '#f8c840'], [6, 25, '#f09040'], [14, 26, '#fff4d0'], [37, 18, '#a0c8ff'], [24, 26, '#f8c840']];
  function over(ctx, world, offX, offY, ts, now) {
    var sc = world.scene || {};
    var W = world.width * ts;
    // cloud shadows drifting over the farm, the sun being in and out
    for (var c = 0; c < 3; c++) {
      var cx = offX + ((now / (90 + c * 25) + c * 520) % (W + 600)) - 300, cy = offY + ((c * 9.3 + 4) % 28) * ts;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * (5 + c));
      g.addColorStop(0, 'rgba(20,40,60,0.13)'); g.addColorStop(0.7, 'rgba(20,40,60,0.07)'); g.addColorStop(1, 'rgba(20,40,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - ts * 8, cy - ts * 8, ts * 16, ts * 16);
    }
    // chimney smoke, soft and slow
    (sc.smoke || []).forEach(function (p, i) {
      for (var q = 0; q < 5; q++) {
        var ph = ((now / 1600) + q / 5 + i * 0.37) % 1;
        var sx = offX + p[0] * ts + Math.sin(now / 900 + q * 2 + i) * 2 + ph * 10, sy = offY + p[1] * ts - ph * 30;
        var sz = Math.round(2 + ph * 5);
        ctx.fillStyle = 'rgba(236,236,230,' + (0.55 * (1 - ph)).toFixed(2) + ')';
        ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
      }
    });
    // glints on the pond (js/nature.js draws the water's own once the render marks it)
    var nat = typeof BridgeNature !== 'undefined' && BridgeNature.covers && world.scene ? BridgeNature.covers(world.scene.id) : {};
    for (var gl = 0; gl < (nat.water ? 0 : 7); gl++) {
      var a = Math.sin(now / 500 + gl * 1.7);
      if (a < 0.6) continue;
      ctx.fillStyle = 'rgba(255,255,240,' + ((a - 0.6) * 2).toFixed(2) + ')';
      ctx.fillRect(Math.round(offX + (25.6 + (gl * 0.83) % 4.8) * ts), Math.round(offY + (18.3 + (gl * 0.61) % 2.2) * ts), 3, 1);
    }
    // dawn mist lying low on the millpond (Look Book 2's farm): soft banks drifting over the water round sunrise
    var Lt = sc.id === 'verdance' && typeof BridgeLit !== 'undefined' && BridgeLit.light ? BridgeLit.light('verdance') : null;
    var dawn = Lt && Lt.M ? Math.max(0, 1 - Math.abs(Lt.M.h - 6.8) / 1.6) * (Lt.M.wx === 'clear' ? 1 : 0.4) : 0;
    if (dawn > 0.02) {
      var px = offX + 28.0 * ts, py = offY + 19.4 * ts, pw = 6.4 * ts, t = now / 1000;
      ctx.save();
      for (var m = 0; m < 7; m++) {
        var mx = px + Math.sin(t * 0.08 + m * 2.1) * pw * 0.3, my = py + (m - 3) * ts * 0.3;
        ctx.globalAlpha = dawn * 0.16; ctx.fillStyle = '#eef2f4';
        ctx.beginPath(); ctx.ellipse(mx, my, pw * (0.22 + 0.06 * Math.sin(m)), ts * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = dawn * 0.12; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(mx + ts * 0.5, my - ts * 0.12, pw * 0.14, ts * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    var still = typeof BridgeSeasons !== 'undefined' && BridgeSeasons.quiet();   // nothing on the wing in winter
    // bees at the skeps
    for (var b = 0; b < (still ? 0 : 7); b++) {
      var ba = now / (300 + b * 40) + b * 2.1, hx = b < 4 ? 41.4 : 42.4;
      var bx = offX + (hx + Math.cos(ba) * (0.4 + (b % 3) * 0.25)) * ts, by = offY + (18.0 + Math.sin(ba * 1.3) * 0.35 - 0.4) * ts;
      ctx.fillStyle = '#1a1408'; ctx.fillRect(Math.round(bx), Math.round(by), 2, 1);
      ctx.fillStyle = '#f0c030'; ctx.fillRect(Math.round(bx) + 1, Math.round(by), 1, 1);
    }
    // butterflies over the wildflowers (js/nature.js's, over the render's own meadow, when it has one)
    if (!still && !nat.grass) butterflies.forEach(function (bf, i) {
      var t = now / 1000 + i * 3.3;
      var x = offX + (bf[0] + Math.sin(t * 0.31) * 2.2 + Math.sin(t * 0.9) * 0.4) * ts, y = offY + (bf[1] + Math.cos(t * 0.23) * 1.4 + Math.sin(t * 1.7) * 0.2) * ts;
      var wing = Math.sin(now / 70 + i) > 0 ? 2 : 1, bx2 = Math.round(x), by2 = Math.round(y);
      ctx.fillStyle = bf[2];
      ctx.fillRect(bx2 - wing, by2, wing, 2); ctx.fillRect(bx2 + 1, by2, wing, 2);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(bx2, by2, 1, 2);
    });
    if (!plotOf(world)) return;
    if (typeof BridgeHomestead !== 'undefined') BridgeHomestead.over(ctx, world, offX, offY, ts, now);
    sparkles(ctx, offX, offY, ts, now);
  }
  // a sparkle over anything ready to pick (any field's: the holm's garden too)
  function sparkles(ctx, offX, offY, ts, now) {
    for (var k in save.tiles) {
      var tt = save.tiles[k];
      if (!tt.crop || !ripe(tt.crop) || !here(k)) continue;
      var xy = xyOf(k), px = +xy[0], py = +xy[1];
      var ph = (now / 1300 + (px * 7 + py * 13) % 10 / 10) % 1, s = Math.max(0, Math.sin(ph * Math.PI * 2));
      if (tt.crop.k === 'starfruit') {                          // starfruit glows
        var gx = offX + (px + 0.5) * ts, gy = offY + (py + 0.2) * ts;
        var gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, ts * 0.8);
        gg.addColorStop(0, 'rgba(255,240,140,' + (0.18 + 0.1 * s).toFixed(2) + ')'); gg.addColorStop(1, 'rgba(255,240,140,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gg; ctx.fillRect(gx - ts, gy - ts, ts * 2, ts * 2); ctx.restore();
      }
      if (s < 0.1) continue;
      var L = 1 + Math.round(s * 2), sx2 = Math.round(offX + (px + 0.72) * ts), sy2 = Math.round(offY + (py + 0.05) * ts);
      ctx.fillStyle = 'rgba(255,252,220,' + (0.9 * s).toFixed(2) + ')';
      ctx.fillRect(sx2 - L, sy2, L * 2 + 1, 1); ctx.fillRect(sx2, sy2 - L, 1, L * 2 + 1);
    }
    // clods and droplets
    bits.forEach(function (d) {
      d.x += d.vx * 0.016; d.y += d.vy * 0.016; d.vy += 0.09; d.life -= 0.035;
      ctx.globalAlpha = Math.max(0, d.life);
      ctx.fillStyle = d.c;
      ctx.fillRect(Math.round(offX + d.x * ts), Math.round(offY + d.y * ts), 2, 2);
    });
    ctx.globalAlpha = 1;
    bits = bits.filter(function (d) { return d.life > 0; });
  }

  if (typeof BridgeWorld !== 'undefined') {
    BridgeWorld.registerSceneHooks('verdance', { ground: ground, items: items, over: over });
    // a garden on a Lumar island (the holm): the field's ground, crops and sparkles, none of Verdance's weather
    BridgeWorld.registerSceneHooks('lumar', { ground: ground, items: items,
      over: function (ctx, world, offX, offY, ts, now) { if (plotOf(world)) sparkles(ctx, offX, offY, ts, now); } });
  }

  // for the journal: what's in the ground, what's ready, what you've brought in
  function journal() {
    var now = Date.now(), grow = {}, rows = [];
    work(now);
    for (var k in save.tiles) {
      var c = save.tiles[k].crop;
      if (!c) continue;
      var g = grow[c.k] || (grow[c.k] = { n: 0, ripe: 0, dry: 0 });
      g.n++;
      if (ripe(c)) g.ripe++; else if (!wet(save.tiles[k], now)) g.dry++;
    }
    ORDER.forEach(function (k) {
      if (grow[k] || save.picked[k]) rows.push({ name: CROPS[k].name, n: grow[k] ? grow[k].n : 0, ripe: grow[k] ? grow[k].ripe : 0,
                                                 dry: grow[k] ? grow[k].dry : 0, picked: save.picked[k] || 0 });
    });
    return { rows: rows, tilled: Object.keys(save.tiles).length, can: save.can };
  }

  return { reload: function () { save = load(); }, decorate: decorate, use: use, useItem: useItem, journal: journal, CROPS: CROPS, pickFor: pickFor,
           _save: function () { return save; }, _plan: plan, _sprite: sprite };
})();
