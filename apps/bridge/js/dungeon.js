/**
 * BridgeDungeon — the Undercroft under Midnight Isle: a crypt that's new every night.
 *
 * Beck: a dungeon that resets every night, deeper is richer, a best-run board. The way in is a portal in Midnight's
 * graveyard; the hall (lumar-undercroft) has the stair down, the board of the night's deepest and a brazier. Below,
 * every floor is one of three crypt layouts (lumar-undercroft-a/b/c, rendered bare, their open ground listed in
 * data.dungeon.open), chosen — with everything on it — by the night (4am to 4am, Eastern time) and the floor: the same
 * floor 3 for everyone tonight, a different crypt tomorrow. On it go
 *   - things that live down here, more and worse the deeper: barrow hounds and drowned wights from the first floor,
 *     wisps from the third, stone sentinels from the sixth, shades from the ninth (js/combat.js);
 *   - chests: coins and the Workshop's materials by depth (iron and copper near the top, silver and sapphire, then
 *     moonstone, star iron and songstone), and now and then one of the Undercroft's relics, each found once;
 *   - traps: a flagstone with a rune scratched in it — step on one and spikes come up (look where you walk);
 *   - the stair down, well away from the stair up. Every fifth floor a crypt guardian stands over it, and it's
 *     sealed till the guardian falls.
 * The floors are never walled off: whatever's put down leaves every open cell reachable from the stair up.
 * Until Midnight's own render has the crypt portal in its graveyard, one is put there (a stone stairwell between two
 * wisp-flames) once the Undercroft's hall exists; the real one, when it comes, takes its place.
 * Black out and you come round in the hall (data.onFaint, js/combat.js). The hall's stair takes you to the first floor,
 * or straight to any fifth floor you've reached tonight. The board keeps your deepest tonight and ever.
 *
 *   BridgeDungeon.decorate(worldId, data)    as a world loads (js/world.js)
 *   BridgeDungeon.party()                    which floor on which night (js/multi.js: who's on the same floor)
 *   BridgeDungeon.floor() / night()          where you are (the tests)
 */
var BridgeDungeon = (function () {
  var KEY = 'bridge_dungeon', HALL = 'lumar-undercroft', HALL_SPAWN = [7, 4], DAY = 86400000;
  var save = { nights: {}, best: 0, relics: [] };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }
  var floor = 1, here = null;                                     // here: { data, chests, traps, stair, guardian }

  function rngFor(seed) {                                         // mulberry32, as the mine uses
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  /** Tonight: the night's number (it turns at 4am Eastern, so a late night is still one night). */
  function night() {
    var C = typeof BridgeClock !== 'undefined' ? BridgeClock : null, t = C && C.now ? C.now() : Date.now();
    return Math.floor(((C ? C.etAt(t) : t) - 4 * 3600000) / DAY);
  }
  function party() { return night() + '.' + floor; }
  function layoutOf(n) { return 'abc'[rngFor(night() * 31 + n * 7)() * 3 | 0]; }
  function deepestTonight() { return save.nights[night()] || 0; }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined' && BridgeAudio.sfx) BridgeAudio.sfx(n); }
  function toast(a, b, c) { if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(a, b, c, false); }
  function say(a, b) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(a, b); }

  // ---- what's down there, by depth ----------------------------------------------------------------------------------
  // [kind, from floor, weight]
  var LIVES = [['hound', 1, 3], ['wight', 1, 3], ['wisp', 3, 2], ['sentinel', 6, 2], ['shade', 9, 2]];
  // [item, from, to, min, max, weight]
  var LOOT = [['iron_ore', 1, 7, 1, 3, 4], ['copper_ore', 1, 7, 1, 2, 3], ['stone_shard', 1, 10, 1, 2, 2], ['wisp_ember', 3, 99, 1, 2, 2],
              ['silver_ore', 4, 12, 1, 2, 3], ['sapphire_crystal', 5, 14, 1, 2, 2], ['sea_glass', 1, 8, 1, 2, 2], ['midnight_crystal', 6, 99, 1, 1, 2],
              ['moonstone', 9, 99, 1, 2, 3], ['star_iron', 12, 99, 1, 2, 2], ['songstone', 15, 99, 1, 1, 1]];
  var RELICS = ['drowned_bell', 'wight_lantern', 'ferry_coin', 'barrow_crown'];

  function pick(rnd, list, w) {
    var total = list.reduce(function (a, x) { return a + w(x); }, 0), r = rnd() * total;
    for (var i = 0; i < list.length; i++) { r -= w(list[i]); if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  // ---- a floor ---------------------------------------------------------------------------------------------------------
  function cellsOf(data) {
    var o = data.dungeon.open;
    if (Array.isArray(o) && o.length) return o.map(function (c) { return [c[0], c[1]]; });
    var out = [];                                                 // no list: every open cell
    data.collisions.forEach(function (row, y) { row.forEach(function (v, x) { if (!v) out.push([x, y]); }); });
    return out;
  }
  function generate(data) {
    var rnd = rngFor(night() * 7919 + floor * 104729 + 17), C = data.collisions, W = data.width, H = data.height;
    var up = data.dungeon.up, start = [up[0], up[1] + 1];
    var open = cellsOf(data).filter(function (c) { return !C[c[1]][c[0]] && Math.abs(c[0] - start[0]) + Math.abs(c[1] - start[1]) >= 3; });
    for (var i = open.length - 1; i > 0; i--) { var j = rnd() * (i + 1) | 0, t = open[i]; open[i] = open[j]; open[j] = t; }
    var block = {};
    function reachable() {                                        // every open cell still reachable from the stair up?
      var seen = {}, q = [start], n = 0, total = 0;
      seen[start] = 1;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (!C[y][x] && !block[x + ',' + y]) total++;
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
    function put(c) { block[c[0] + ',' + c[1]] = 1; if (reachable()) return true; delete block[c[0] + ',' + c[1]]; return false; }
    var dist = function (c) { return Math.abs(c[0] - start[0]) + Math.abs(c[1] - start[1]); };
    // the stair down: among the farthest quarter
    var far = open.slice().sort(function (a, b) { return dist(b) - dist(a); }).slice(0, Math.max(1, open.length >> 2));
    var stair = null, from = rnd() * far.length | 0;
    for (var s = 0; s < far.length && !stair; s++) { var cand = far[(from + s) % far.length]; if (put(cand)) stair = cand; }
    var taken = function (c) { return block[c[0] + ',' + c[1]] || (stair && c[0] === stair[0] && c[1] === stair[1]); };
    // chests
    var chests = [], nChests = 2 + (floor >= 5 ? 1 : 0) + (floor >= 12 ? 1 : 0) + (rnd() < 0.4 ? 1 : 0);
    for (var k = 0; k < open.length && chests.length < nChests; k++) {
      if (taken(open[k]) || dist(open[k]) < 4) continue;
      if (put(open[k])) chests.push({ x: open[k][0], y: open[k][1], seed: rnd() * 1e9 | 0, open: false });
    }
    // traps (not solid: you walk onto them)
    var traps = [], nTraps = Math.min(7, 1 + Math.floor(floor / 2));
    for (var q2 = open.length - 1; q2 >= 0 && traps.length < nTraps; q2--) {
      var c2 = open[q2];
      if (taken(c2) || dist(c2) < 3 || traps.some(function (t) { return Math.abs(t.x - c2[0]) + Math.abs(t.y - c2[1]) < 2; })) continue;
      traps.push({ x: c2[0], y: c2[1], sprung: 0 });
    }
    // the things that live here
    var lives = LIVES.filter(function (l) { return floor >= l[1]; }), n = Math.min(9, 2 + Math.floor(floor * 0.6) + (rnd() < 0.5 ? 1 : 0));
    var spots = open.filter(function (c) { return !taken(c) && dist(c) >= 6 && !traps.some(function (t) { return t.x === c[0] && t.y === c[1]; }); });
    var guardian = null;
    if (typeof BridgeCombat !== 'undefined') {
      if (floor % 5 === 0 && stair) {                             // the guardian stands over the stair
        var gs = spots.filter(function (c) { return Math.abs(c[0] - stair[0]) + Math.abs(c[1] - stair[1]) <= 3; })[0];
        if (gs) {
          spots.splice(spots.indexOf(gs), 1);
          guardian = BridgeCombat.spawn(data, 'sentinel', gs[0], gs[1]);
          var k3 = 2.5 + floor * 0.15;
          guardian.label = 'THE CRYPT GUARDIAN'; guardian.maxHP = guardian._hp = Math.round(guardian.maxHP * k3);
          guardian.damage = Math.round(guardian.damage * (1 + floor * 0.05)); guardian.reward = 40 + floor * 6; guardian.boss = true;
        }
      }
      for (var m = 0; m < n && spots.length; m++) {
        var at = spots.splice(rnd() * spots.length | 0, 1)[0], kind = pick(rnd, lives, function (l) { return l[2]; })[0];
        var h = BridgeCombat.spawn(data, kind, at[0], at[1]), deep = 1 + Math.max(0, floor - 4) * 0.08;     // deeper, tougher
        h.maxHP = h._hp = Math.round(h.maxHP * deep); h.damage = Math.round(h.damage * deep);
      }
    }
    return { stair: stair, chests: chests, traps: traps, guardian: guardian, start: start };
  }

  // the way in, till Midnight's render has its own: only once the hall is there to go to
  var PORTAL = [5, 21], hallThere = false, portalHere = null;
  fetch('/bridge/assets/worlds/' + HALL + '.json', { method: 'HEAD' }).then(function (r) { hallThere = r.ok; }).catch(function () {});
  function wayIn(data) {
    portalHere = null;
    var I = data.interactions || [], C = data.collisions;
    if (!hallThere || I.some(function (i) { return i.target === HALL; }) || !C || C[PORTAL[1]][PORTAL[0]]) return;
    I.push({ x: PORTAL[0], y: PORTAL[1], type: 'enter_world', target: HALL, spawn: HALL_SPAWN, label: 'THE UNDERCROFT', prompt: 'PRESS E TO GO DOWN' });
    C[PORTAL[1]][PORTAL[0]] = 1;
    portalHere = data;
  }

  function decorate(worldId, data) {
    here = null;
    if (worldId === 'lumar-midnight') { wayIn(data); return; }
    if (worldId === HALL) {
      data.name = 'The Undercroft';
      (data.interactions || []).forEach(function (it) {
        if (it.label === 'DEEPEST FLOOR') { it.type = 'dungeon_board'; it.prompt = 'PRESS E TO READ'; delete it.dialog; }
        if (it.label === 'STAIR DOWN') { it.type = 'dungeon_down'; it.prompt = 'PRESS E TO GO DOWN'; delete it.dialog; }
      });
      return;
    }
    if (!data.dungeon || !data.dungeon.up) return;
    var G = generate(data);
    here = Object.assign({ data: data }, G);
    if (G.stair) {
      data.collisions[G.stair[1]][G.stair[0]] = 1;
      data.interactions.push({ x: G.stair[0], y: G.stair[1], type: 'dungeon_stair', label: 'STAIR DOWN', prompt: 'PRESS E TO GO DOWN' });
    }
    G.chests.forEach(function (c) {
      data.collisions[c.y][c.x] = 1;
      data.interactions.push({ x: c.x, y: c.y, type: 'dungeon_chest', label: 'CHEST', prompt: 'PRESS E TO OPEN', _chest: c });
    });
    (data.interactions || []).forEach(function (it) { if (it.type === 'dungeon_up') { it.label = 'STAIR UP'; it.prompt = 'PRESS E TO GO UP'; } });
    data.name = 'The Undercroft · Floor ' + floor;
    data.onFaint = { world: HALL, spawn: HALL_SPAWN, who: 'THE UNDERCROFT',
      line: 'YOU COME ROUND ON THE COLD FLOOR OF THE HALL, BY THE BRAZIER. SOMEONE - SOMETHING - CARRIED YOU UP THE STAIR AND LEFT YOU THERE.\n\nTONIGHT\'S DEEPEST: FLOOR ' + deepestTonight() + '. THE CRYPT WILL BE SOMETHING ELSE TOMORROW.' };
    if (floor > deepestTonight()) { save.nights[night()] = floor; }
    if (floor > save.best) { save.best = floor; if (floor > 1) setTimeout(function () { toast('THE UNDERCROFT', 'Floor ' + floor, 'The deepest you\'ve been'); }, 1200); }
    Object.keys(save.nights).forEach(function (k) { if (+k < night() - 30) delete save.nights[k]; });
    store();
  }

  // ---- going down and up -----------------------------------------------------------------------------------------------
  function goFloor(n) {
    floor = Math.max(1, n);
    var id = 'lumar-undercroft-' + layoutOf(floor);
    sfx('door');
    BridgeWorld.enterWorld(id, null);
  }
  function down(inter) {                                          // the hall's stair: the first floor, or a fifth reached tonight
    var reached = deepestTonight(), rows = [{ label: 'Floor 1', sub: 'the top of tonight\'s crypt', pick: function () { goFloor(1); } }];
    for (var f = 5; f <= reached; f += 5) (function (f) { rows.push({ label: 'Floor ' + f, sub: 'you reached it tonight', pick: function () { goFloor(f); } }); })(f);
    if (rows.length === 1) return goFloor(1);
    BridgeInteractions.choose({ title: 'The stair down', text: 'THE STEPS GO DOWN INTO THE DARK. TONIGHT YOU\'VE BEEN AS DEEP AS FLOOR ' + reached + '.', rows: rows, closeLabel: 'Not yet' });
  }
  function stair() {
    if (!here) return;
    if (here.guardian && here.guardian._hp > 0 && here.data.interactions.indexOf(here.guardian) >= 0) {
      say('STAIR DOWN', 'THE STAIR IS SEALED: A SLAB OF STONE ACROSS IT, CUT WITH THE SAME RUNES AS THE GUARDIAN\'S CHEST. IT WON\'T SHIFT WHILE THAT THING STANDS.');
      return;
    }
    goFloor(floor + 1);
  }
  function upstairs() { sfx('door'); BridgeWorld.enterWorld(HALL, HALL_SPAWN); }
  function board() {
    say('DEEPEST FLOOR', 'CHALK ON SLATE, IN A HUNDRED HANDS. THE CRYPT BELOW CHANGES EVERY NIGHT; THE MARKS DON\'T.\n\n' +
      '• TONIGHT: ' + (deepestTonight() ? 'FLOOR ' + deepestTonight() : 'NOT YET DOWN') + '\n• YOUR DEEPEST EVER: ' + (save.best ? 'FLOOR ' + save.best : 'NONE YET') +
      '\n• RELICS FOUND: ' + save.relics.length + ' OF ' + RELICS.length + '\n\nOLDEST ON THE SLATE, CUT RATHER THAN CHALKED: "M. - 31".');
  }

  // ---- chests ------------------------------------------------------------------------------------------------------------
  function chest(inter) {
    var c = inter._chest;
    if (!c || c.open) return say('CHEST', 'EMPTY. WHOEVER WAS HERE FIRST WAS THOROUGH.');
    c.open = true;
    var rnd = rngFor(c.seed), got = [], coins = Math.round((12 + rnd() * 18) * (1 + floor / 3));
    var pool = LOOT.filter(function (l) { return floor >= l[1] && floor <= l[2]; });
    for (var i = 0; i < 1 + (rnd() < 0.5 ? 1 : 0) + (floor >= 8 ? 1 : 0); i++) {
      var l = pick(rnd, pool, function (x) { return x[5]; }), n = l[3] + (rnd() * (l[4] - l[3] + 1) | 0);
      got.push([l[0], n]);
    }
    var left = RELICS.filter(function (r) { return save.relics.indexOf(r) < 0; });
    if (left.length && rnd() < 0.06 + floor * 0.012) {               // a relic, now and then — each found once
      var r = left[rnd() * left.length | 0];
      save.relics.push(r); store(); got.push([r, 1]);
      setTimeout(function () { toast('A RELIC OF THE UNDERCROFT', NEW[r].name, NEW[r].desc); }, 600);
    }
    got.forEach(function (g) { if (typeof BridgeInventory !== 'undefined') (BridgeInventory.give || BridgeInventory.addItem)(g[0], g[1]); });
    if (coins && typeof BridgeProgression !== 'undefined' && BridgeProgression.awardCoins) BridgeProgression.awardCoins(coins, 'undercroft');
    sfx('coin');
    say('CHEST', 'THE LID COMES UP STIFF. INSIDE: ' + coins + ' COINS' + got.map(function (g) { var it = BridgeItems.get(g[0]); return ', ' + g[1] + ' × ' + (it ? it.name : g[0]).toUpperCase(); }).join('') + '.');
  }

  // ---- traps: a rune flagstone, spikes when you step on it -------------------------------------------------------------
  function traps(now) {
    if (!here || typeof BridgeCharacter === 'undefined') return;
    var x = BridgeCharacter.getX(), y = BridgeCharacter.getY();
    here.traps.forEach(function (t) {
      if (t.x !== x || t.y !== y || now - t.sprung < 2500) return;
      t.sprung = now;
      var hurt = 6 + Math.floor(floor * 0.8);
      if (typeof BridgeInventory !== 'undefined') BridgeInventory.takeDamage(hurt);
      if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(x, y - 0.3, '-' + hurt + ' HP', '#ff6060');
      sfx('fail');
    });
  }

  // ---- drawing: the stair down, chests, trap stones (pixel art on the 16-unit grid, lit and depth-tested) ---------------
  function px(ctx, x, y, u, c, rs) { ctx.fillStyle = c; rs.forEach(function (r) { ctx.fillRect(x + r[0] * u, y + r[1] * u, r[2] * u, r[3] * u); }); }
  var art = {};
  function sprite(kind) {
    if (art[kind]) return art[kind];
    var c = document.createElement('canvas'); c.width = 32; c.height = 40;
    var x = c.getContext('2d'), P = function (col, rs) { px(x, 0, 8, 2, col, rs); };
    var o = '#120c10';
    if (kind === 'stair') {                                        // steps going down into the dark, a worn lip
      P(o, [[0, 0, 16, 16]]); P('#4a4048', [[1, 1, 14, 3]]); P('#38303a', [[2, 4, 12, 3]]); P('#28222c', [[3, 7, 10, 3]]); P('#1a1520', [[4, 10, 8, 3]]); P('#0a0810', [[5, 13, 6, 2]]);
      P('#5a5058', [[1, 1, 14, 1]]); P('#6a3a7a', [[2, 2, 1, 1], [13, 2, 1, 1]]);
    } else if (kind === 'sealed') {                                 // the same, a runed slab across it
      P(o, [[0, 0, 16, 16]]); P('#4a4048', [[1, 1, 14, 3]]); P('#28222c', [[3, 7, 10, 3]]);
      P('#2a2430', [[0, 5, 16, 8]]); P('#5a5260', [[1, 6, 14, 6]]); P('#6a6270', [[1, 6, 14, 1]]); P('#9a70d0', [[4, 8, 2, 2], [7, 8, 2, 2], [10, 8, 2, 2]]);
    } else if (kind === 'portal') {                                // a stair down in a stone frame, a wisp-flame each side
      P(o, [[1, 2, 14, 14]]); P('#5a5260', [[2, 3, 12, 2], [2, 3, 2, 12], [12, 3, 2, 12]]); P('#6a6270', [[2, 3, 12, 1]]);
      P('#2a2430', [[4, 5, 8, 3]]); P('#1a1520', [[4, 8, 8, 3]]); P('#0a0810', [[4, 11, 8, 4]]);
    } else if (kind === 'chest' || kind === 'chest_open') {         // iron-bound oak; open, the lid back and the inside dark
      if (kind === 'chest') {
        P(o, [[1, 4, 14, 11]]); P('#6a4020', [[2, 5, 12, 9]]); P('#8a5a2a', [[2, 5, 12, 3]]); P('#3a3a44', [[2, 8, 12, 1], [4, 5, 1, 9], [11, 5, 1, 9]]);
        P('#d0b040', [[7, 8, 2, 3]]); P('#2a1a10', [[7, 10, 2, 1]]);
      } else {
        P(o, [[1, 1, 14, 14]]); P('#6a4020', [[2, 2, 12, 5]]); P('#3a3a44', [[4, 2, 1, 5], [11, 2, 1, 5]]); P('#1a0c08', [[2, 8, 12, 3]]);
        P('#6a4020', [[2, 11, 12, 3]]); P('#3a3a44', [[2, 11, 12, 1]]);
      }
    }
    art[kind] = c;
    return c;
  }
  function stoneAt(ctx, x, y, u, sprung, now) {                    // a flagstone with a rune; spikes when sprung
    px(ctx, x, y, u, 'rgba(10,6,12,0.45)', [[2, 3, 12, 10]]);
    px(ctx, x, y, u, 'rgba(120,90,150,0.35)', [[5, 6, 1, 4], [6, 6, 4, 1], [9, 7, 1, 3], [6, 9, 3, 1]]);
    if (now - sprung < 900) {
      var k = 1 - (now - sprung) / 900, h = Math.max(1, Math.round(6 * Math.min(1, k * 3)));
      [3, 6, 9, 12].forEach(function (sx) { px(ctx, x, y, u, '#c8c0d0', [[sx, 9 - h, 1, h]]); px(ctx, x, y, u, '#5a5060', [[sx, 9, 1, 1]]); });
    }
  }
  function ground(ctx, world, offX, offY, ts, now) {
    if (portalHere === world) {                                   // the portal's wisp-flames: their own light, never dimmed by the night
      var u2 = ts / 16, fx = Math.round(offX + PORTAL[0] * ts), fy = Math.round(offY + PORTAL[1] * ts), fl = Math.sin(performance.now() / 140) > 0;
      [2, 12].forEach(function (c) {
        px(ctx, fx, fy, u2, '#7a50c0', [[c, 0, 2, 3]]); px(ctx, fx, fy, u2, '#b080ff', [[c, fl ? 0 : 1, 2, 2]]); px(ctx, fx, fy, u2, '#f0e8ff', [[c + (fl ? 0 : 1), 1, 1, 1]]);
      });
    }
    if (!here || here.data !== world) return;
    traps(performance.now());
    var u = ts / 16;
    here.traps.forEach(function (t) { stoneAt(ctx, Math.round(offX + t.x * ts), Math.round(offY + t.y * ts), u, t.sprung, performance.now()); });
  }
  function items(world, offX, offY, ts, now, sc) {
    if (portalHere === world && sc && typeof BridgeScene !== 'undefined') {
      var pc = sprite('portal'), pf = PORTAL[1] + 0.95;
      return [{ footRow: pf, draw: function (ctx) {
        BridgeScene.drawOccluded(ctx, sc, pc, 0, 0, pc.width, pc.height, Math.round(offX + PORTAL[0] * ts), Math.round(offY + (PORTAL[1] + 1) * ts) - pc.height, pf, offX, offY, BridgeScene.tintAt(sc, world, PORTAL[0], PORTAL[1], now), null);
      } }];
    }
    if (!here || here.data !== world || !sc || typeof BridgeScene === 'undefined') return [];
    var out = [], sealed = here.guardian && here.guardian._hp > 0 && world.interactions.indexOf(here.guardian) >= 0;
    var add = function (kind, x, y) {
      var c = sprite(kind), footRow = y + 0.95;
      out.push({ footRow: footRow, draw: function (ctx) {
        var dx = Math.round(offX + x * ts), dy = Math.round(offY + (y + 1) * ts) - c.height;
        BridgeScene.drawOccluded(ctx, sc, c, 0, 0, c.width, c.height, dx, dy, footRow, offX, offY, BridgeScene.tintAt(sc, world, x, y, now), null);
      } });
    };
    if (here.stair) add(sealed ? 'sealed' : 'stair', here.stair[0], here.stair[1]);
    here.chests.forEach(function (c) { add(c.open ? 'chest_open' : 'chest', c.x, c.y); });
    return out;
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('*', { ground: ground, items: items });

  // ---- relics: found once each, down here only ---------------------------------------------------------------------------
  var NEW = {
    drowned_bell: { name: 'The Drowned Bell', desc: 'A hand bell green with the sea. It rings, very faintly, when nobody touches it.',
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#1a2a20', [[5, 3, 6, 9], [4, 9, 8, 3]]); px(ctx, x, y, u, '#4a8a68', [[6, 4, 4, 7], [5, 9, 6, 2]]); px(ctx, x, y, u, '#8ac8a0', [[6, 4, 1, 5]]); px(ctx, x, y, u, '#c0a040', [[7, 12, 2, 2]]); } },
    wight_lantern: { name: 'A Wight\'s Lantern', desc: 'Iron and old horn. The flame inside is cold, and violet, and doesn\'t go out.',
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#20181c', [[5, 3, 6, 11], [7, 1, 2, 2]]); px(ctx, x, y, u, '#6a5a70', [[6, 5, 4, 7]]); px(ctx, x, y, u, '#b080ff', [[7, 7, 2, 3]]); px(ctx, x, y, u, '#e0d0ff', [[7, 8, 1, 1]]); } },
    ferry_coin: { name: 'The Ferryman\'s Coin', desc: 'Older than the crown\'s mint, worn smooth on one side by a thumb. Someone paid their passage with it.',
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#5a4010', [[4, 4, 8, 8], [3, 5, 10, 6]]); px(ctx, x, y, u, '#d0a840', [[5, 5, 6, 6], [4, 6, 8, 4]]); px(ctx, x, y, u, '#fff0a0', [[6, 6, 2, 2]]); px(ctx, x, y, u, '#8a6820', [[8, 8, 2, 1]]); } },
    barrow_crown: { name: 'The Barrow Crown', desc: 'A circlet of black iron, too small for any head you know. It belonged to whoever the crypt was cut for.',
      draw: function (ctx, x, y, s) { var u = s / 16; px(ctx, x, y, u, '#0a080c', [[3, 6, 10, 6]]); px(ctx, x, y, u, '#3a3440', [[4, 8, 8, 3], [4, 6, 1, 2], [7, 5, 2, 3], [11, 6, 1, 2]]); px(ctx, x, y, u, '#9a70d0', [[7, 9, 2, 1]]); } }
  };
  (function () {
    if (typeof BridgeItems === 'undefined' || !BridgeItems.all) return;
    var all = BridgeItems.all();
    Object.keys(NEW).forEach(function (id) { if (!all[id]) all[id] = Object.assign({ id: id, type: 'curio', stackable: false, value: 400 }, NEW[id]); });
  })();

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('dungeon_down', down, 'Go down');
    BridgeInteractions.register('dungeon_stair', stair, 'Go down');
    BridgeInteractions.register('dungeon_up', upstairs, 'Go up');
    BridgeInteractions.register('dungeon_chest', chest, 'Open');
    BridgeInteractions.register('dungeon_board', board, 'Read');
  }

  return { decorate: decorate, party: party, floor: function () { return floor; }, night: night, _go: goFloor, _here: function () { return here; } };
})();
