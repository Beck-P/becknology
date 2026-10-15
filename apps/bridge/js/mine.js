/**
 * BridgeMine — the Rose Mine: break rock for stone, ore and gems, find the
 * way down, go deeper.
 *
 * The hall (lumar-rose-mine) has the lift, the pickaxe rack, the foreman's
 * slate and old Pell. Below it every floor is one of three cave layouts
 * (lumar-rose-mine-a/b/c, rendered without rocks); as a floor loads, rocks
 * are scattered over its open ground — seeded by floor and day, never
 * walling anything off — and one of them hides the ladder down. Rock types
 * follow the depth: stone and iron near the top, roseite and silver, then
 * sapphire, moonstone geodes and star iron, and songstone at the bottom,
 * where the great songstone sings (floor 20). Swinging costs energy;
 * pickaxes hit harder the better they are (old: 1, iron: 2, star: 3). The
 * lift remembers every fifth floor you reach. Rocks are sprites cut from
 * assets/scenes/mine-rocks (tools/bridge-art/mine_sprites.py), depth-tested
 * like the characters.
 *
 *   BridgeMine.decorate(worldId, data)   // world.js, as a world loads
 *   BridgeMine.use(inter)                // interactions.js: rock, mine_up/down/lift/rack/slate
 */
var BridgeMine = (function () {
  var KEY = 'bridge_mine';
  var DEEPEST = 20;
  var SPRITES = ['stone_a', 'stone_b', 'stone_c', 'iron_a', 'iron_b', 'silver_a', 'silver_b', 'rose_a', 'rose_b',
                 'sapphire_a', 'sapphire_b', 'moon', 'star', 'song', 'ladder', 'rubble', 'heart'];
  // weight(floor) picks the mix by depth; drops: [item, min, max, chance]
  var ROCKS = {
    stone:    { name: 'ROCK', spr: ['stone_a', 'stone_b', 'stone_c'], hp: 2, drops: [['stone', 1, 2, 1]],
                w: function (f) { return 10 - f * 0.3; } },
    iron:     { name: 'IRON ORE', spr: ['iron_a', 'iron_b'], hp: 3, drops: [['iron_ore', 1, 2, 1], ['stone', 1, 1, 0.4]],
                w: function (f) { return f <= 12 ? 3.2 : 1.5; } },
    rose:     { name: 'ROSEITE', spr: ['rose_a', 'rose_b'], hp: 3, drops: [['roseite', 1, 2, 1]],
                w: function (f) { return f <= 8 ? 2.4 : 0.6; } },
    silver:   { name: 'SILVER ORE', spr: ['silver_a', 'silver_b'], hp: 4, drops: [['silver_ore', 1, 2, 1]],
                w: function (f) { return f >= 4 ? 2.2 : 0; } },
    sapphire: { name: 'SAPPHIRE', spr: ['sapphire_a', 'sapphire_b'], hp: 4, drops: [['sapphire_crystal', 1, 2, 1]],
                w: function (f) { return f >= 6 && f <= 16 ? 2.0 : 0; } },
    moon:     { name: 'GEODE', spr: ['moon'], hp: 5, drops: [['moonstone', 1, 1, 1], ['moonstone', 1, 1, 0.25]],
                w: function (f) { return f >= 10 ? 1.1 : 0; } },
    star:     { name: 'STAR IRON', spr: ['star'], hp: 6, drops: [['star_iron', 1, 2, 1]],
                w: function (f) { return f >= 13 ? 1.2 : 0; } },
    song:     { name: 'SONGSTONE', spr: ['song'], hp: 6, drops: [['songstone', 1, 1, 1]],
                w: function (f) { return f >= 17 ? 0.9 : 0; } },
    heart:    { name: 'THE GREAT SONGSTONE', spr: ['heart'], hp: 14, drops: [['songstone', 3, 4, 1]], w: function () { return 0; } }
  };
  var PICKS = [['star_pickaxe', 3, 1], ['iron_pickaxe', 2, 2], ['old_pickaxe', 1, 2]];      // id, power, energy a swing
  var BANDS = [[1, 6, '#f070b0'], [7, 13, '#4080ff'], [14, 20, '#b080ff']];

  var save = load();
  var floor = 1;                    // the floor you're on (or going to)
  var rocks = [];                   // this floor's rocks: {x, y, kind, spr, hp, max, ladder, hit, shake}
  var dust = [], swing = null, visits = Math.floor(Math.random() * 1000);

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { deepest: 0, lift: [1] }; } catch (e) { return { deepest: 0, lift: [1] }; }
  }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function band(f) { for (var i = 0; i < BANDS.length; i++) if (f >= BANDS[i][0] && f <= BANDS[i][1]) return BANDS[i]; return BANDS[0]; }
  function rngFor(seed) {                     // mulberry32
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function day() { return Math.floor(Date.now() / 86400000); }
  function say(label, text) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(label, text); }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }

  // ---- sprites ------------------------------------------------------------------------------------
  var sheet = null, meta = null;
  function loadSheet() {
    if (sheet) return;
    sheet = new Image();
    fetch('/bridge/assets/scenes/mine-rocks/scene.json?v=' + Date.now()).then(function (r) { return r.json(); }).then(function (m) {
      meta = m; sheet.src = '/bridge/assets/scenes/mine-rocks/full.png?v=' + m.rev;
    }).catch(function () { /* drawn as plain stones */ });
  }
  function sprRect(name) {                    // the tile's column, from a little above the tile to its bottom edge
    var i = SPRITES.indexOf(name), tall = name === 'heart' ? 72 : 48;
    var bottom = Math.round(meta.originY + 32);
    return { sx: Math.round(meta.originX + i * 32), sy: bottom - tall, w: 32, h: tall };
  }

  // ---- floors ------------------------------------------------------------------------------------
  function isFloor(data) { return !!(data && data.mine && data.mine.layout); }

  function generate(data) {
    visits++;
    var rnd = rngFor(floor * 7919 + day() * 31 + visits * 104729 + 17);      // a fresh floor every time you climb down
    var C = data.collisions, W = data.width, H = data.height;
    var up = data.mine.up, spawn = data.spawns.player;
    var open = [];
    for (var y = 3; y < H; y++) for (var x = 0; x < W; x++) {
      if (C[y][x]) continue;
      if (Math.abs(x - spawn[0]) + Math.abs(y - spawn[1]) < 3) continue;     // room to arrive
      open.push([x, y]);
    }
    for (var i = open.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = open[i]; open[i] = open[j]; open[j] = t; }
    var want = Math.min(26, 14 + Math.floor(floor * 0.6));
    var placed = [];
    function reachable(block) {               // every open cell still reachable from where you arrive?
      var seen = {}, q = [spawn], n = 0, total = 0;
      seen[spawn[0] + ',' + spawn[1]] = 1;
      for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) if (!C[yy][xx] && !block[xx + ',' + yy]) total++;
      while (q.length) {
        var c = q.shift(); n++;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = c[0] + d[0], ny = c[1] + d[1], k = nx + ',' + ny;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[k] || C[ny][nx] || block[k]) return;
          seen[k] = 1; q.push([nx, ny]);
        });
      }
      return n >= total;
    }
    var block = {};
    for (var p = 0; p < open.length && placed.length < want; p++) {
      var cell = open[p], key = cell[0] + ',' + cell[1];
      block[key] = 1;
      if (!reachable(block)) { delete block[key]; continue; }
      placed.push(cell);
    }
    // what each rock is, by depth
    var kinds = Object.keys(ROCKS).filter(function (k) { return ROCKS[k].w(floor) > 0; });
    var total = kinds.reduce(function (a, k) { return a + ROCKS[k].w(floor); }, 0);
    rocks = placed.map(function (c) {
      var r = rnd() * total, kind = kinds[0];
      for (var i2 = 0; i2 < kinds.length; i2++) { r -= ROCKS[kinds[i2]].w(floor); if (r <= 0) { kind = kinds[i2]; break; } }
      var R = ROCKS[kind];
      return { x: c[0], y: c[1], kind: kind, spr: R.spr[Math.floor(rnd() * R.spr.length)], hp: R.hp, max: R.hp, ladder: false, hit: 0 };
    });
    // the ladder down, under a rock well away from the way in
    if (floor < DEEPEST) {
      var far = rocks.filter(function (r) { return Math.abs(r.x - spawn[0]) + Math.abs(r.y - spawn[1]) >= 6; });
      (far.length ? far : rocks)[Math.floor(rnd() * (far.length || rocks.length))].ladder = true;
    } else {                                                                          // the bottom: the great songstone
      var heart = rocks.reduce(function (a, r) { return Math.abs(r.x - spawn[0]) + Math.abs(r.y - spawn[1]) > Math.abs(a.x - spawn[0]) + Math.abs(a.y - spawn[1]) ? r : a; }, rocks[0]);
      if (heart) { heart.kind = 'heart'; heart.spr = 'heart'; heart.hp = heart.max = ROCKS.heart.hp; }
    }
    // things that live down here: mites from floor 3, crabs from 8, shades from 14
    if (typeof BridgeCombat !== 'undefined' && floor >= 3) {
      var taken = {};
      rocks.forEach(function (r) { taken[r.x + ',' + r.y] = 1; });
      var spots = open.filter(function (c) { return !taken[c[0] + ',' + c[1]] && Math.abs(c[0] - spawn[0]) + Math.abs(c[1] - spawn[1]) >= 6; });
      var n = floor < 8 ? 1 + (rnd() < 0.5 ? 1 : 0) : floor < 14 ? 2 + (rnd() < 0.5 ? 1 : 0) : 3 + (rnd() < 0.4 ? 1 : 0);
      for (var s = 0; s < n && spots.length; s++) {
        var at = spots.splice(Math.floor(rnd() * spots.length), 1)[0];
        var pick = rnd(), kind = floor >= 14 ? (pick < 0.5 ? 'shade' : pick < 0.8 ? 'crab' : 'mite') : floor >= 8 ? (pick < 0.45 ? 'crab' : 'mite') : 'mite';
        BridgeCombat.spawn(data, kind, at[0], at[1]);
      }
    }
    return rocks;
  }

  function rockInter(r) {
    var R = ROCKS[r.kind];
    return { x: r.x, y: r.y, type: 'rock', label: R.name, prompt: 'PRESS E TO MINE', _rock: r };
  }

  function decorate(worldId, data) {
    if (!data.mine) return;
    loadSheet();
    if (data.mine.hall) {
      data.name = 'Rose Mine';
      return;
    }
    if (!isFloor(data)) return;
    generate(data);
    rocks.forEach(function (r) {
      data.collisions[r.y][r.x] = 1;
      data.interactions.push(rockInter(r));
    });
    data.name = 'Rose Mine · Floor ' + floor;
    data.mine.floor = floor;
    if (floor > save.deepest) save.deepest = floor;
    if (floor % 5 === 0 && save.lift.indexOf(floor) < 0) {
      save.lift.push(floor);
      setTimeout(function () {
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('The lift', 'Floor ' + floor + ' reached', 'The lift will stop here now');
      }, 900);
    }
    store();
  }

  // ---- doing things ---------------------------------------------------------------------------------
  function pickaxe() {
    if (typeof BridgeInventory === 'undefined') return null;
    for (var i = 0; i < PICKS.length; i++) if (BridgeInventory.getCount(PICKS[i][0]) > 0) return PICKS[i];
    return null;
  }

  function goFloor(n) {
    floor = Math.max(1, Math.min(DEEPEST, n));
    var layout = 'abc'[(floor * 7 + Math.floor(floor / 3)) % 3];
    var target = 'lumar-rose-mine-' + layout;
    sfx('door');
    BridgeWorld.enterWorld(target, null);
  }

  function use(inter) {
    switch (inter.type) {
      case 'rock': return mine(inter);
      case 'mine_down': return goFloor(floor + 1);
      case 'mine_up': sfx('door'); return BridgeWorld.enterWorld('lumar-rose-mine', [8, 4]);
      case 'mine_lift': return liftMenu();
      case 'mine_rack':
        if (BridgeInventory.getCount('old_pickaxe') + BridgeInventory.getCount('iron_pickaxe') + BridgeInventory.getCount('star_pickaxe') > 0) {
          return say('PICKAXE RACK', 'THREE OLD PICKAXES AND AN EMPTY PEG - YOURS.\n\nHOB CAN PUT A BETTER EDGE ON ONE, IF YOU BRING HIM THE ORE.');
        }
        if (!BridgeInventory.addItem('old_pickaxe', 1)) return say('PICKAXE RACK', 'YOUR PACK IS FULL. MAKE ROOM AND TAKE ONE.');
        sfx('pickup');
        return say('PICKAXE RACK', 'YOU TAKE AN OLD PICKAXE OFF THE RACK. "BRING IT BACK WHEN YOU\'RE DONE," HOB CALLS. "THEY NEVER DO."\n\nFACE A ROCK BELOW AND PRESS E TO MINE.');
      case 'mine_slate':
        return say("FOREMAN'S SLATE", 'CHALK ON SLATE, IN A DOZEN HANDS:\n\n"FLOOR 5 - BLUE IN THE ROCK.  FLOOR 10 - COLD.  FLOOR 15 - DON\'T LINGER.  FLOOR 20 - ?"\n\n' +
          (save.deepest ? 'AT THE BOTTOM, NEW CHALK: YOUR NAME, AND "FLOOR ' + save.deepest + '".' : 'THERE\'S ROOM AT THE BOTTOM FOR ANOTHER NAME.'));
    }
  }

  function liftMenu() {
    var stops = save.lift.slice().sort(function (a, b) { return a - b; });
    var inter = { type: 'menu', label: 'THE LIFT', dialog: 'THE CAGE CREAKS ON ITS CABLE. A BRASS LEVER, AND A DIAL OF FLOORS.',
                  options: stops.map(function (f) { return { label: f === 1 ? 'FLOOR 1' : 'FLOOR ' + f, action: 'mine_floor', floor: f }; })
                    .concat([{ label: 'STAY UP HERE', action: 'close' }]) };
    BridgeInteractions.execute(inter);
  }

  function mine(inter) {
    var r = inter._rock;
    if (!r || r.hp <= 0) return;
    var P = pickaxe();
    if (!P) { sfx('error'); return say(inter.label, 'YOU NEED A PICKAXE. THERE\'S A RACK OF OLD ONES UP IN THE HALL.'); }
    var st = BridgeInventory.getStats();
    if (st.energy < P[2]) { sfx('error'); return say(inter.label, 'TOO TIRED TO SWING. EAT SOMETHING, OR GO UP AND REST.'); }
    if (performance.now() - (swing ? swing.t : 0) < 260) return;
    BridgeInventory.useEnergy(P[2]);
    swing = { t: performance.now(), x: r.x, y: r.y };
    r.hp -= P[1]; r.hit = performance.now();
    sfx('pick');
    for (var i = 0; i < 6; i++) dust.push({ x: r.x + 0.5, y: r.y + 0.7, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5 - 0.3, life: 1,
                                            c: r.kind === 'stone' ? '#8a8080' : ROCK_GLOW[r.kind] || '#a09090' });
    if (r.hp > 0) return;
    // broken
    sfx('crumble');
    var w = BridgeWorld.getWorld();
    w.collisions[r.y][r.x] = 0;
    var ix = w.interactions.indexOf(inter);
    if (ix >= 0) w.interactions.splice(ix, 1);
    ROCKS[r.kind].drops.forEach(function (d) {
      if (Math.random() > d[3]) return;
      var n = d[1] + Math.floor(Math.random() * (d[2] - d[1] + 1));
      if (n > 0 && typeof BridgeLoot !== 'undefined') BridgeLoot.spawn(r.x, r.y, d[0], n);
    });
    if (r.kind === 'heart') {
      if (typeof BridgeLoot !== 'undefined' && BridgeInventory.getCount('heartsong') === 0) BridgeLoot.spawn(r.x, r.y, 'heartsong', 1);
      say('THE GREAT SONGSTONE', 'THE STONE OPENS LIKE A HAND. INSIDE, A CRYSTAL THE SIZE OF A HEART, STILL SINGING - AND ALL AROUND YOU, FAINTLY, THE WHOLE MINE SINGS BACK.');
    }
    if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.maybeFind(floor, r.x, r.y);     // now and then, an old map
    if (r.ladder) {
      r.kind = 'ladder'; r.spr = 'ladder';
      w.interactions.push({ x: r.x, y: r.y, type: 'mine_down', label: 'LADDER DOWN', prompt: 'PRESS E TO CLIMB DOWN' });
      sfx('clue');
    } else {
      r.gone = true;
    }
  }
  var ROCK_GLOW = { rose: '#f070b0', sapphire: '#4080ff', silver: '#e0e8f0', moon: '#e0e0ff', star: '#ffe080', song: '#b080ff', heart: '#c090ff', iron: '#a0603a' };

  // ---- Hob's forge: a better pickaxe for ore and coin ---------------------------------------------------
  var FORGE = { iron_pickaxe: { from: 'old_pickaxe', ore: 'iron_ore', n: 5, coins: 150, name: 'IRON PICKAXE' },
                star_pickaxe: { from: 'iron_pickaxe', ore: 'star_iron', n: 3, coins: 400, name: 'STAR PICKAXE' },
                star_blade: { from: null, ore: 'star_iron', n: 2, also: 'songstone', coins: 300, name: 'STAR BLADE' } };
  function upgrade(who, what) {
    if (what === 'blade') {
      if (BridgeInventory.getCount('star_blade') > 0) return say(who.toUpperCase(), '"YOU\'VE GOT THE ONLY ONE I\'LL EVER MAKE. LOOK AFTER IT."');
      var B = FORGE.star_blade;
      return BridgeInteractions.execute({ type: 'menu', label: who.toUpperCase(),
        dialog: '"A BLADE? FOR WHAT\'S DOWN THERE, YOU\'LL WANT ONE. 2 STAR IRON, A SONGSTONE FOR THE HILT, AND ' + B.coins + ' COINS." (YOU HAVE ' +
                BridgeInventory.getCount('star_iron') + ' STAR IRON, ' + BridgeInventory.getCount('songstone') + ' SONGSTONE.)',
        options: [{ label: 'MAKE IT', action: 'mine_upgrade', to: 'star_blade' }, { label: 'NOT NOW', action: 'close' }] });
    }
    var has = function (id) { return BridgeInventory.getCount(id) > 0; };
    var to = has('star_pickaxe') ? null : has('iron_pickaxe') ? 'star_pickaxe' : 'iron_pickaxe';
    if (!to) return say(who.toUpperCase(), '"THAT\'S STAR IRON. THERE\'S NOTHING BETTER IN THIS HILL, AND I\'D KNOW."');
    var F = FORGE[to], ore = BridgeItems.get(F.ore).name.toUpperCase();
    BridgeInteractions.execute({ type: 'menu', label: who.toUpperCase(),
      dialog: '"' + F.name + '. ' + F.n + ' ' + ore + ' AND ' + F.coins + ' COINS, AND YOUR OLD ONE FOR THE HANDLE." (YOU HAVE ' +
              BridgeInventory.getCount(F.ore) + ' ' + ore + '.)',
      options: [{ label: 'MAKE IT', action: 'mine_upgrade', to: to }, { label: 'NOT NOW', action: 'close' }] });
  }
  function forge(to) {
    var F = FORGE[to];
    if (!F) return;
    if (BridgeInventory.getCount(F.ore) < F.n) return say('HOB', '"YOU\'RE SHORT ON ' + BridgeItems.get(F.ore).name.toUpperCase() + '. THE ROCK\'S DOWNSTAIRS."');
    if (F.also && BridgeInventory.getCount(F.also) < 1) return say('HOB', '"NO SONGSTONE, NO HILT. THEY\'RE DOWN AT THE BOTTOM, WHERE IT SINGS."');
    if (F.from && BridgeInventory.getCount(F.from) < 1) return say('HOB', '"BRING THE OLD ONE TOO - I NEED THE HANDLE."');
    say('HOB', 'HOB WEIGHS THE ORE IN HIS HAND...');
    BridgeProgression.wagerCoins(F.coins, 'mine:' + to).then(function (res) {
      if (!res || !res.ok) return say('HOB', res && (res.reason === 'insufficient' || res.reason === 'no_balance') ? '"COIN FIRST, FRIEND. ' + F.coins + '."' : '"CAN\'T TAKE YOUR COIN RIGHT NOW. COME BACK."');
      BridgeInventory.removeItem(F.ore, F.n);
      if (F.also) BridgeInventory.removeItem(F.also, 1);
      if (F.from) BridgeInventory.removeItem(F.from, 1);
      BridgeInventory.addItem(to, 1);
      sfx('success');
      say('HOB', 'THE FORGE ROARS, THE HAMMER RINGS, AND HOB HANDS YOU A ' + F.name + ', STILL WARM. "MIND YOU DON\'T DIG STRAIGHT THROUGH THE FLOOR."');
    });
  }

  // ---- drawing (scene hooks on the cave tileset; only worlds with a mine block) ---------------------------
  function items(world, offX, offY, ts, now, sc) {
    if (!isFloor(world)) return [];
    var out = typeof BridgeCombat !== 'undefined' ? BridgeCombat.sceneItems(world, offX, offY, ts, now, sc) : [];
    if (!meta || !sheet.complete) return out;
    rocks.forEach(function (r) {
      if (r.gone) return;
      var R = sprRect(r.spr);
      var shake = now - r.hit < 160 ? Math.round(Math.sin(now / 18) * 1.5) : 0;
      var dx = Math.round(offX + r.x * ts) + shake, dy = Math.round(offY + (r.y + 1) * ts) - R.h;
      var foot = r.spr === 'ladder' ? r.y + 0.05 : r.y + 0.9;
      out.push({ footRow: foot, draw: function (ctx) {
        BridgeScene.drawOccluded(ctx, sc, sheet, R.sx, R.sy, R.w, R.h, dx, dy, foot, offX, offY, null,
          r.spr === 'ladder' ? null : { x: dx + 16, y: dy + R.h - 6, rx: 12, ry: 4 });
        if (r.hp < r.max && r.spr !== 'ladder') cracks(ctx, dx, dy + R.h - 32, 1 - r.hp / r.max, r.x * 7 + r.y);
      } });
    });
    if (swing && now - swing.t < 220) {                         // the pick's arc
      var p = BridgeCharacter.getRenderPos(), a = (now - swing.t) / 220;
      var cx = offX + (p.x + 0.5) * ts, cy = offY + (p.y + 0.2) * ts, sx = Math.sign(swing.x - p.x) || (swing.y > p.y ? 0.4 : -0.4);
      out.push({ footRow: p.y + 1.01, draw: function (ctx) {
        ctx.save();
        ctx.translate(Math.round(cx + sx * 8), Math.round(cy));
        ctx.rotate((sx >= 0 ? 1 : -1) * (-1.6 + a * 2.4));
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-1, -14, 2, 14);
        ctx.fillStyle = '#9a9aa8'; ctx.fillRect(-6, -16, 12, 3);
        ctx.restore();
      } });
    }
    return out;
  }

  function cracks(ctx, x, y, f, seed) {
    ctx.fillStyle = 'rgba(10,6,6,0.85)';
    var n = Math.ceil(f * 3);
    for (var i = 0; i < n; i++) {
      var px = x + 10 + ((seed * 13 + i * 7) % 12), py = y + 12 + ((seed * 5 + i * 11) % 10);
      for (var j = 0; j < 5; j++) { ctx.fillRect(px, py, 1, 1); px += ((seed + i + j) % 3) - 1; py += 1; }
    }
  }

  function over(ctx, world, offX, offY, ts, now) {
    if (!world || !world.mine) return;
    // dust from the swings
    dust.forEach(function (d) {
      d.x += d.vx * 0.016; d.y += d.vy * 0.016; d.vy += 0.06; d.life -= 0.03;
      ctx.fillStyle = d.c; ctx.globalAlpha = Math.max(0, d.life);
      ctx.fillRect(Math.round(offX + d.x * ts), Math.round(offY + d.y * ts), 1, 1);
    });
    ctx.globalAlpha = 1;
    dust = dust.filter(function (d) { return d.life > 0; });
    if (!isFloor(world)) return;
    // the way down, once it's uncovered: a pool of lamplight and a bobbing arrow
    rocks.forEach(function (r) {
      if (r.spr !== 'ladder') return;
      var cx = offX + (r.x + 0.5) * ts, cy = offY + (r.y + 0.55) * ts, pulse = 0.5 + 0.5 * Math.sin(now / 300);
      var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, ts * 0.9);
      g.addColorStop(0, 'rgba(255,200,120,' + (0.25 + 0.2 * pulse).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - ts, cy - ts, ts * 2, ts * 2);
      var ay = Math.round(offY + r.y * ts - 10 + Math.sin(now / 250) * 2), ax = Math.round(cx);
      ctx.fillStyle = '#ffe0a0';
      for (var i = 0; i < 4; i++) ctx.fillRect(ax - 4 + i, ay + i, 8 - i * 2, 1);
      ctx.fillRect(ax - 1, ay - 4, 2, 4);
    });
    // the deeper, the colder the light: a wash of the band's colour and motes drifting in it
    var B = band(floor), f = (floor - 1) / (DEEPEST - 1);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.18 + f * 0.22;
    ctx.fillStyle = B[2];
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    for (var i = 0; i < 18; i++) {
      var mx = ((i * 97.3 + now / (60 + i * 3)) % (world.width * ts)), my = ((i * 53.7 + Math.sin(now / 900 + i) * 20 + now / 140) % (world.height * ts));
      ctx.fillStyle = B[2]; ctx.globalAlpha = 0.25 + 0.25 * Math.sin(now / 400 + i);
      ctx.fillRect(Math.round(offX + mx), Math.round(offY + my), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // the cave tileset's scene hooks; they draw only in worlds with a mine block (not the dragon's cave)
  if (typeof BridgeWorld !== 'undefined') BridgeWorld.registerSceneHooks('cave', { items: items, over: over });

  return { decorate: decorate, use: use, goFloor: goFloor, upgrade: upgrade, forge: forge, floor: function () { return floor; }, deepest: function () { return save.deepest; },
           _rocks: function () { return rocks; } };
})();
