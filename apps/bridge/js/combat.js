/**
 * BridgeCombat — creatures that fight back, and what you fight them with.
 *
 * Creatures are 'hostile' interactions, run by the stalk-and-strike state
 * machine in interactions.js (idle → winding, the telegraph → striking →
 * recovering; a strike only lands if you're still on the tile it locked
 * onto, so stepping aside on the wind-up dodges it). A `creature` kind here
 * sets their health, damage, pace and drops, and draws them: pixel sprites
 * painted in code on the 16-unit grid, gliding between tiles, depth-tested
 * in scene worlds (the mine draws them through its scene hooks).
 *
 * Weapons are items with `damage`; F swings the selected one. A weapon with
 * `arc` cuts the tiles either side of the one you face too. Run out of
 * health and you black out and come round somewhere safe, half mended.
 *
 * MIDNIGHT ISLE is where the fighting is (the mine aside): its roster
 * (ROSTER) is spawned as the island loads, in place of the old sentinels —
 *   - STONE SENTINELS, walked off their plinths: slow, heavy; cracked past
 *     half health, their slam hits the tiles round the one they lock onto too;
 *   - WILL-O'-WISPS round the moon pool and the woods: they keep their
 *     distance and throw a bolt down a straight line (`range`) — step off it;
 *   - DROWNED WIGHTS in the graveyard: struck, they may blink away (`blink`);
 *     one of them carries the key to the violet tomb (the Veilpiercer inside);
 *   - BARROW HOUNDS by the abbey: quick, and quick to bite;
 *   - THE BELL WARDEN in the abbey ruins, once a day: a slam that cracks the
 *     ground round its target, and a toll that rings out two tiles from it —
 *     stand close or stand clear; at two thirds and a third it calls wisps.
 *     It drops the Wispcaller Staff the first time.
 * Every wind-up marks the tiles it will hit on the ground (`dangerCells`), so
 * you can read it. A hit flashes the creature white; a heavy weapon staggers
 * a wind-up and knocks it back a tile; frost slows, embers burn, the holy
 * edge bites the undead deeper, the drinking blade heals you (js/items.js
 * weaponUse). A hit on you shakes the screen.
 *
 *   BridgeCombat.spawn(world, 'mite', x, y)      // put a creature in a world
 *   BridgeCombat.drawCreature(ctx, h, px, py, ts, now)
 *   BridgeCombat.faint()                         // from BridgeInventory at 0 health
 *   BridgeCombat.tick / attackStart / dangerAt / onHit / onKill / damageFor — the machine's hooks (interactions.js, items.js)
 */
var BridgeCombat = (function () {
  var CREATURES = {
    mite:   { label: 'ROCK MITE', hp: 30, damage: 4, move: 650, aggro: 5, windup: 380, reward: 3,
              drops: [{ id: 'stone', min: 1, max: 1, chance: 0.6 }, { id: 'iron_ore', min: 1, max: 1, chance: 0.25 }] },
    crab:   { label: 'CAVE CRAB', hp: 70, damage: 7, move: 1100, aggro: 5, windup: 520, reward: 6,
              drops: [{ id: 'sapphire_crystal', min: 1, max: 1, chance: 0.4 }, { id: 'silver_ore', min: 1, max: 2, chance: 0.4 }] },
    shade:  { label: 'SHADE', hp: 110, damage: 11, move: 800, aggro: 7, windup: 600, reward: 10,
              drops: [{ id: 'songstone', min: 1, max: 1, chance: 0.2 }, { id: 'moonstone', min: 1, max: 1, chance: 0.3 }] },
    // Midnight Isle
    sentinel: { label: 'STONE SENTINEL', hp: 90, damage: 10, move: 950, aggro: 6, windup: 720, recover: 950, reward: 12, crack: 0.5,
                drops: [{ id: 'stone_shard', min: 1, max: 2 }, { id: 'midnight_crystal', min: 1, max: 1, chance: 0.35 }] },
    wisp:     { label: 'WILL-O\'-WISP', hp: 26, damage: 6, move: 420, aggro: 8, windup: 560, strike: 380, recover: 760, range: 4, reward: 6,
                drops: [{ id: 'wisp_ember', min: 1, max: 1, chance: 0.6 }] },
    wight:    { label: 'DROWNED WIGHT', hp: 64, damage: 9, move: 720, aggro: 6, windup: 480, recover: 720, blink: 0.3, reward: 9,
                drops: [{ id: 'sea_glass', min: 1, max: 1, chance: 0.4 }, { id: 'moonstone', min: 1, max: 1, chance: 0.15 }] },
    hound:    { label: 'BARROW HOUND', hp: 40, damage: 7, move: 300, aggro: 7, windup: 320, recover: 540, reward: 7,
                drops: [{ id: 'stone_shard', min: 1, max: 1, chance: 0.5 }] },
    warden:   { label: 'THE BELL WARDEN', hp: 420, damage: 15, move: 1100, aggro: 7, windup: 820, recover: 1000, reach: 2, reward: 120, boss: true,
                drops: [{ id: 'moonstone', min: 1, max: 2 }, { id: 'songstone', min: 1, max: 1, chance: 0.5 }] },
    // Arcadia below (js/undercity.js spawns them): tougher the lower you go. The Undercity — the Rust Saints on their
    // turf and in the scrapyards (people, drawn from their own sheets with a pipe or a knife), scrap rats in the heaps,
    // Saint Ruin their boss once a day. The Sump — scavenger drones (a bolt down a line), sump eels out of the black
    // water, husks (chromed-over drifters that blink), and once a day the Dredge, a dredger gone feral.
    saint:      { label: 'RUST SAINT', hp: 70, damage: 9, move: 720, aggro: 6, windup: 460, recover: 700, reward: 9, sheet: 'npc-saint-a', arm: 'pipe',
                  drops: [{ id: 'scrap_metal', min: 1, max: 2, chance: 0.7 }, { id: 'circuit', min: 1, max: 1, chance: 0.2 }] },
    shiv:       { label: 'RUST SAINT', hp: 54, damage: 8, move: 420, aggro: 7, windup: 330, recover: 560, reward: 8, sheet: 'npc-saint-b', arm: 'knife',
                  drops: [{ id: 'scrap_metal', min: 1, max: 1, chance: 0.5 }, { id: 'chrome_part', min: 1, max: 1, chance: 0.15 }] },
    scraprat:   { label: 'SCRAP RAT', hp: 30, damage: 6, move: 330, aggro: 6, windup: 300, recover: 500, reward: 4,
                  drops: [{ id: 'scrap_metal', min: 1, max: 1, chance: 0.5 }] },
    ruin:       { label: 'SAINT RUIN', hp: 560, damage: 17, move: 900, aggro: 7, windup: 760, recover: 900, reach: 2, reward: 150, boss: true,
                  sheet: 'npc-saint-boss', arm: 'fist', slam: true, calls: 'saint', title: ['Saint Ruin', 'The Rust Saints\' boss cracks his chrome knuckles', 'Watch the ground round where he looks'],
                  drops: [{ id: 'chrome_part', min: 2, max: 3 }, { id: 'circuit', min: 1, max: 2 }] },
    drone:      { label: 'SCAV DRONE', hp: 62, damage: 12, move: 520, aggro: 8, windup: 520, strike: 360, recover: 760, range: 4, reward: 12, fly: true,
                  drops: [{ id: 'circuit', min: 1, max: 1, chance: 0.6 }, { id: 'chrome_part', min: 1, max: 1, chance: 0.2 }] },
    eel:        { label: 'SUMP EEL', hp: 120, damage: 15, move: 640, aggro: 6, windup: 420, recover: 780, reward: 14,
                  drops: [{ id: 'eel_fillet', min: 1, max: 1, chance: 0.6 }, { id: 'sump_pearl', min: 1, max: 1, chance: 0.12 }] },
    husk:       { label: 'HUSK', hp: 150, damage: 16, move: 820, aggro: 6, windup: 560, recover: 820, blink: 0.25, reward: 16, sheet: 'npc-husk', arm: 'claw',
                  drops: [{ id: 'chrome_part', min: 1, max: 2, chance: 0.6 }, { id: 'circuit', min: 1, max: 1, chance: 0.3 }] },
    dredge:     { label: 'THE DREDGE', hp: 900, damage: 22, move: 1100, aggro: 8, windup: 880, recover: 1000, reach: 2, reward: 260, boss: true,
                  slam: true, calls: 'drone', title: ['The Dredge', 'A dredger the size of a room hauls itself out of the black water', 'Its scoop comes down over three tiles: read the ground'],
                  drops: [{ id: 'sump_pearl', min: 1, max: 2 }, { id: 'chrome_part', min: 2, max: 4 }, { id: 'circuit', min: 2, max: 3 }] },
    // the Crimson and Midnight seas, grown (Workstream B2): the volcano on Cinder Key, drowned Saltmere, the ghost ship
    imp:      { label: 'EMBER IMP', hp: 34, damage: 7, move: 360, aggro: 8, windup: 420, strike: 340, recover: 700, range: 3, reward: 7,
                drops: [{ id: 'ember_glass', min: 1, max: 1, chance: 0.45 }] },
    magma:    { label: 'MAGMA CRAB', hp: 130, damage: 12, move: 1150, aggro: 5, windup: 720, recover: 950, reward: 14, crack: 0.5,
                drops: [{ id: 'ember_glass', min: 1, max: 2 }, { id: 'crimson_crystal', min: 1, max: 1, chance: 0.3 }] },
    drowned:  { label: 'DROWNED FISHER', hp: 58, damage: 8, move: 760, aggro: 6, windup: 520, recover: 720, blink: 0.15, reward: 8,
                drops: [{ id: 'drowned_locket', min: 1, max: 1, chance: 0.3 }, { id: 'sea_glass', min: 1, max: 1, chance: 0.4 }] },
    spectre:  { label: 'SPECTRAL SAILOR', hp: 72, damage: 10, move: 520, aggro: 7, windup: 440, recover: 640, blink: 0.35, reward: 11,
                drops: [{ id: 'drowned_locket', min: 1, max: 1, chance: 0.35 }, { id: 'moonstone', min: 1, max: 1, chance: 0.2 }] }
  };
  var UNDEAD = { shade: 1, wisp: 1, wight: 1, warden: 1, drowned: 1, spectre: 1 };

  function spawn(world, kind, x, y) {
    var C = CREATURES[kind];
    var h = { x: x, y: y, type: 'hostile', label: C.label, creature: kind, maxHP: C.hp, _hp: C.hp, damage: C.damage,
              moveCooldown: C.move, aggroRange: C.aggro, windupMs: C.windup, strikeMs: C.strike || 180, recoverMs: C.recover || 650,
              range: C.range || 0, reach: C.reach || 1, blink: C.blink || 0, boss: !!C.boss,
              reward: C.reward, drops: C.drops, _rx: x, _ry: y, seed: Math.random() * 100 };
    if (C.slam) h.slams = true;
    // its name on the wire (js/fight.js): kind and where it first stood, the same in everyone's copy of the place
    h.fid = kind + '@' + x + ',' + y;
    for (var n = 2; world.interactions.some(function (o) { return o.fid === h.fid; }); n++) h.fid = kind + '@' + x + ',' + y + '#' + n;
    world.interactions.push(h);
    world.collisions[y][x] = 1;
    return h;
  }

  // ---- drawing -------------------------------------------------------------------------------------
  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // h's on-screen tile position glides toward its grid cell
  function glide(h, dt) {
    if (typeof h._rx !== 'number') { h._rx = h.x; h._ry = h.y; }
    var k = Math.min(1, dt / 120);
    h._rx += (h.x - h._rx) * k; h._ry += (h.y - h._ry) * k;
    if (Math.abs(h.x - h._rx) < 0.01) h._rx = h.x;
    if (Math.abs(h.y - h._ry) < 0.01) h._ry = h.y;
  }

  // the shadow under a creature: an oval of whole pixels on the ground ([half its width in u, how dark])
  var SHADOW = { mite: [5, 0.3], crab: [7, 0.3], shade: [5, 0.25], sentinel: [7, 0.35], wisp: [3, 0.18], wight: [5, 0.3], hound: [7, 0.3], warden: [10, 0.4],
                 saint: [6, 0.32], shiv: [6, 0.32], scraprat: [5, 0.3], ruin: [9, 0.4], drone: [4, 0.2], eel: [7, 0.3], husk: [6, 0.32], dredge: [14, 0.45],
                 imp: [3, 0.2], magma: [9, 0.4], drowned: [5, 0.3], spectre: [5, 0.15] };
  function feet(ctx, h, cx, footY, ts) {
    var s = SHADOW[h.creature];
    if (!s || typeof BridgeFX === 'undefined' || !BridgeFX.disc) return;
    var u = Math.max(1, Math.round(ts / 16)), t = h._attackTarget, lunge = h._attackPhase === 'striking' && t, r = s[0] * u;
    var bl = h._blinkAt ? Math.min(1, (performance.now() - h._blinkAt) / 350) : 1;
    ctx.fillStyle = 'rgba(0,0,0,' + (s[1] * bl).toFixed(3) + ')';
    BridgeFX.disc(ctx, Math.round(cx) + (lunge ? Math.round((t.x - h.x) * 3 * u) : 0), Math.round(footY) - u + (lunge ? Math.round((t.y - h.y) * 3 * u) : 0), r, 2 / r);
  }

  // ---- people who fight (the Rust Saints, the husks): their own painted sheets (characters.py), walking when they move,
  // leaning into a wind-up, and what's in their hand drawn over them — a pipe, a knife, a fist of chrome, a claw
  var SHEETS = {}, FW = 32, FH = 48, ROW = { down: 0, right: 1, up: 2, left: 3 };
  function sheetImg(n) {
    if (!SHEETS[n]) { var e = SHEETS[n] = { img: new Image(), ready: false }; e.img.onload = function () { e.ready = true; }; e.img.src = '/bridge/assets/characters/' + n + '.png'; }
    return SHEETS[n];
  }
  function person(ctx, h, u, t, wind, strike, ts) {
    var C = CREATURES[h.creature], sh = sheetImg(C.sheet), dir = h._dir || 'down', k = ts / 32;
    var moving = h._ry !== h.y || h._rx !== h.x;
    var col = moving ? 4 + Math.floor(t * 9) % 8 : [0, 1, 2, 1][Math.floor(t * 2.8) % 4];
    var lean = wind ? -1 : strike ? 2 : 0, side = dir === 'left' ? -1 : 1;
    if (sh.ready) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sh.img, col * FW, ROW[dir] * FH, FW, FH, Math.round(-16 * k + (dir === 'left' || dir === 'right' ? lean * side * u : 0)),
                    Math.round(-45 * k + (dir === 'down' ? lean * u : dir === 'up' ? -lean * u : 0)), FW * k, FH * k);
    } else { px(ctx, -4 * u, -16 * u, 8 * u, 16 * u, '#2a1a14'); }
    if (dir === 'up') return;                                                   // from behind, the weapon's hidden by them
    var hx = (dir === 'down' ? 6 : dir === 'right' ? 4 : -5) * u, hy = -9 * u, OL = '#0a0808';
    var raise = wind ? -8 : strike ? 3 : 0;
    if (C.arm === 'pipe') {
      var top = hy + (raise - 8) * u;
      px(ctx, hx - 1 * u, top, 3 * u, hy - top + 2 * u, OL); px(ctx, hx, top + 1 * u, 1 * u, hy - top, '#8a8a90');
      px(ctx, hx - 2 * u, top - 1 * u, 5 * u, 3 * u, OL); px(ctx, hx - 1 * u, top, 3 * u, 1 * u, '#b07a40');
    } else if (C.arm === 'knife') {
      var ky = hy + raise * u;
      px(ctx, hx - 1 * u, ky - 5 * u, 3 * u, 7 * u, OL); px(ctx, hx, ky - 4 * u, 1 * u, 4 * u, '#e8e8f0'); px(ctx, hx, ky, 1 * u, 2 * u, '#5a3a20');
    } else if (C.arm === 'fist') {
      var fy = hy + raise * u;
      px(ctx, hx - 2 * u, fy - 1 * u, 5 * u, 5 * u, OL); px(ctx, hx - 1 * u, fy, 3 * u, 3 * u, '#b8c0c8'); px(ctx, hx - 1 * u, fy, 3 * u, 1 * u, '#e8f0f8');
      if (wind) { ctx.globalAlpha = 0.6; px(ctx, hx - 1 * u, fy - 3 * u, 3 * u, 1 * u, '#ff7a2a'); ctx.globalAlpha = 1; }
    } else if (C.arm === 'claw') {
      var cy = hy + raise * u;
      for (var c = 0; c < 3; c++) { px(ctx, hx + (c - 1) * 2 * u, cy, 1 * u, 4 * u, OL); px(ctx, hx + (c - 1) * 2 * u, cy, 1 * u, 3 * u, '#a0c8ff'); }
    }
  }

  // draws one creature into ctx with its feet at (cx, footY), u = one 16th of a tile; bare: leave its shadow and health
  // bar off (sceneItems puts them on after the hit flash, so the flash lights the creature and not what's round it)
  function drawCreature(ctx, h, cx, footY, ts, now, bare) {
    var u = Math.max(1, Math.round(ts / 16)), t = now / 1000 + (h.seed || 0);
    var wind = h._attackPhase === 'winding', strike = h._attackPhase === 'striking';
    var eye = wind || strike ? '#ffffff' : null;
    if (!bare) feet(ctx, h, cx, footY, ts);
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(footY));
    if (strike) ctx.translate(Math.round(((h._attackTarget ? h._attackTarget.x - h.x : 0)) * 3 * u), Math.round(((h._attackTarget ? h._attackTarget.y - h.y : 0)) * 3 * u));
    if (h.creature === 'mite') {
      var hop = Math.abs(Math.sin(t * 9)) * u * (wind ? 0 : 1);
      ctx.translate(0, -Math.round(hop));
      px(ctx, -5 * u, -6 * u, 10 * u, 5 * u, '#14100e');                          // outline
      px(ctx, -4 * u, -6 * u, 8 * u, 4 * u, '#5a4a40');                           // shell
      px(ctx, -3 * u, -6 * u, 4 * u, 1 * u, '#8a7a6a');                           // shine
      px(ctx, -4 * u, -3 * u, 8 * u, 1 * u, '#3a2e28');
      for (var l = 0; l < 3; l++) {                                                // legs, scuttling
        var lg = Math.sin(t * 18 + l) > 0 ? 1 : 0;
        px(ctx, -6 * u, (-5 + l * 2 - lg) * u, 1 * u, 1 * u, '#14100e'); px(ctx, 5 * u, (-5 + l * 2 + lg) * u, 1 * u, 1 * u, '#14100e');
      }
      px(ctx, -2 * u, -5 * u, 1 * u, 1 * u, eye || '#f070b0'); px(ctx, 1 * u, -5 * u, 1 * u, 1 * u, eye || '#f070b0');
    } else if (h.creature === 'crab') {
      var sway = Math.round(Math.sin(t * 3) * u);
      px(ctx, -7 * u + sway, -7 * u, 14 * u, 6 * u, '#0c0e18');
      px(ctx, -6 * u + sway, -7 * u, 12 * u, 5 * u, '#2a4a8a');
      px(ctx, -5 * u + sway, -7 * u, 6 * u, 1 * u, '#4a7ac0');
      px(ctx, -2 * u + sway, -10 * u, 2 * u, 3 * u, '#0c0e18'); px(ctx, -1 * u + sway, -10 * u, 1 * u, 3 * u, '#4080ff');   // crystals on its back
      px(ctx, 2 * u + sway, -9 * u, 2 * u, 2 * u, '#0c0e18'); px(ctx, 2 * u + sway, -9 * u, 1 * u, 2 * u, '#80b0ff');
      var claw = wind ? -2 * u : 0;
      px(ctx, -10 * u + sway, -8 * u + claw, 3 * u, 3 * u, '#0c0e18'); px(ctx, -9 * u + sway, -8 * u + claw, 2 * u, 2 * u, '#3a5a9a');
      px(ctx, 7 * u + sway, -8 * u + claw, 3 * u, 3 * u, '#0c0e18'); px(ctx, 7 * u + sway, -8 * u + claw, 2 * u, 2 * u, '#3a5a9a');
      px(ctx, -3 * u + sway, -8 * u, 1 * u, 1 * u, eye || '#ffe080'); px(ctx, 2 * u + sway, -8 * u, 1 * u, 1 * u, eye || '#ffe080');
      for (var k = 0; k < 3; k++) {
        var lk = Math.sin(t * 6 + k) > 0 ? 1 : 0;
        px(ctx, (-7 + k * 2) * u + sway, (-2 + lk) * u, 1 * u, 2 * u, '#0c0e18'); px(ctx, (2 + k * 2) * u + sway, (-2 + 1 - lk) * u, 1 * u, 2 * u, '#0c0e18');
      }
    } else if (h.creature === 'shade') {
      var bob = Math.round(Math.sin(t * 2.4) * 2 * u);
      ctx.globalAlpha = wind ? 0.95 : 0.75;
      for (var r = 0; r < 14; r++) {                                               // a tattered wisp, wider at the hood
        var wv = Math.round(Math.sin(t * 5 + r * 0.6) * u);
        var half = r < 4 ? 3 + r : r < 10 ? 6 : 6 - (r - 9);
        px(ctx, (-half) * u + wv, (-18 + r) * u + bob, half * 2 * u, 1 * u, r < 3 ? '#4a2a7a' : r % 3 ? '#2a1a4a' : '#3a2266');
      }
      px(ctx, -3 * u, -14 * u + bob, 2 * u, 1 * u, eye || '#c090ff'); px(ctx, 1 * u, -14 * u + bob, 2 * u, 1 * u, eye || '#c090ff');
      ctx.globalAlpha = 1;
    } else if (h.creature === 'sentinel') {
      var cracked = h._hp < h.maxHP * 0.5, cg = cracked ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7)) : 0.45;
      var OL = '#120e16', ST = '#4e485c', LT = '#6e6880', DK = '#34303e', CR = '#c49cff';
      var sw = wind || strike ? 0 : Math.round(Math.sin(t * 3) * 0.6) * u;
      px(ctx, -5 * u, -7 * u, 4 * u, 7 * u, OL); px(ctx, 1 * u, -7 * u, 4 * u, 7 * u, OL);                      // legs
      px(ctx, -4 * u, -7 * u, 2 * u, 6 * u, ST); px(ctx, 2 * u, -7 * u, 2 * u, 6 * u, ST);
      px(ctx, -6 * u + sw, -16 * u, 12 * u, 10 * u, OL);                                                      // the block of its body
      px(ctx, -5 * u + sw, -16 * u, 10 * u, 9 * u, ST); px(ctx, -5 * u + sw, -16 * u, 10 * u, 1 * u, LT); px(ctx, -5 * u + sw, -8 * u, 10 * u, 1 * u, DK);
      px(ctx, 3 * u + sw, -15 * u, 1 * u, 7 * u, DK);
      ctx.globalAlpha = cg;                                                                                    // the amethyst crack
      px(ctx, -1 * u + sw, -15 * u, 1 * u, 2 * u, CR); px(ctx, 0 + sw, -13 * u, 1 * u, 2 * u, CR); px(ctx, -1 * u + sw, -11 * u, 1 * u, 2 * u, CR);
      if (cracked) { px(ctx, -4 * u + sw, -12 * u, 2 * u, 1 * u, CR); px(ctx, 2 * u + sw, -10 * u, 2 * u, 1 * u, CR); px(ctx, -3 * u + sw, -18 * u, 1 * u, 1 * u, CR); }
      ctx.globalAlpha = 1;
      px(ctx, -3 * u + sw, -20 * u, 6 * u, 5 * u, OL); px(ctx, -2 * u + sw, -20 * u, 4 * u, 4 * u, ST); px(ctx, -2 * u + sw, -20 * u, 4 * u, 1 * u, LT);   // head
      px(ctx, -2 * u + sw, -18 * u, 1 * u, 1 * u, eye || CR); px(ctx, 1 * u + sw, -18 * u, 1 * u, 1 * u, eye || CR);
      if (wind) {                                                                                              // both fists up
        px(ctx, -9 * u, -24 * u, 3 * u, 10 * u, OL); px(ctx, 6 * u, -24 * u, 3 * u, 10 * u, OL);
        px(ctx, -8 * u, -23 * u, 1 * u, 8 * u, ST); px(ctx, 7 * u, -23 * u, 1 * u, 8 * u, ST);
        px(ctx, -10 * u, -27 * u, 5 * u, 4 * u, OL); px(ctx, 5 * u, -27 * u, 5 * u, 4 * u, OL);
        px(ctx, -9 * u, -26 * u, 3 * u, 2 * u, LT); px(ctx, 6 * u, -26 * u, 3 * u, 2 * u, LT);
      } else if (strike) {                                                                                     // brought down on the ground
        px(ctx, -9 * u, -12 * u, 3 * u, 9 * u, OL); px(ctx, 6 * u, -12 * u, 3 * u, 9 * u, OL);
        px(ctx, -10 * u, -4 * u, 5 * u, 4 * u, OL); px(ctx, 5 * u, -4 * u, 5 * u, 4 * u, OL);
        px(ctx, -9 * u, -3 * u, 3 * u, 2 * u, LT); px(ctx, 6 * u, -3 * u, 3 * u, 2 * u, LT);
        ctx.globalAlpha = 0.6; for (var dd = 0; dd < 6; dd++) px(ctx, (-12 + dd * 4) * u, (-2 - (dd % 3)) * u, 1 * u, 1 * u, '#a89cb8'); ctx.globalAlpha = 1;
      } else {
        px(ctx, -8 * u + sw, -16 * u, 3 * u, 9 * u, OL); px(ctx, 5 * u + sw, -16 * u, 3 * u, 9 * u, OL);
        px(ctx, -7 * u + sw, -15 * u, 1 * u, 7 * u, ST); px(ctx, 6 * u + sw, -15 * u, 1 * u, 7 * u, ST);
      }
    } else if (h.creature === 'wisp') {
      var wy = -15 * u + Math.round(Math.sin(t * 3) * 2) * u, fl = Math.abs(Math.sin(t * 11));
      ctx.globalCompositeOperation = 'lighter';
      var orb = function (r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, wy, r * u, 0, Math.PI * 2); ctx.fill(); };
      orb(7.5 + (wind ? 1.5 : 0), wind ? 'rgba(190,150,255,0.13)' : 'rgba(170,130,255,0.07)');
      orb(5, wind ? 'rgba(200,170,255,0.24)' : 'rgba(180,150,255,0.14)');
      orb(3.2, 'rgba(215,195,255,0.4)');
      ctx.fillStyle = 'rgba(220,200,255,0.55)';                                                                 // the flame licking up off it
      ctx.beginPath(); ctx.moveTo(-2 * u, wy - 1 * u); ctx.quadraticCurveTo(Math.sin(t * 9) * u, wy - (6 + fl * 2) * u, 2 * u, wy - 1 * u); ctx.fill();
      orb(2, wind ? '#ffffff' : '#efe6ff');
      for (var ws = 0; ws < 4; ws++) px(ctx, Math.round(Math.sin(t * 4 + ws * 1.7) * 3) * u, wy + (3 + ws * 2) * u, 1 * u, 1 * u, 'rgba(200,170,255,' + (0.6 - ws * 0.13).toFixed(2) + ')');
      ctx.globalCompositeOperation = 'source-over';
      px(ctx, -1 * u, wy - 1 * u, 1 * u, 1 * u, '#3a2a5a'); px(ctx, 1 * u, wy - 1 * u, 1 * u, 1 * u, '#3a2a5a');
    } else if (h.creature === 'wight') {
      var bl = h._blinkAt ? Math.min(1, (performance.now() - h._blinkAt) / 350) : 1;
      ctx.globalAlpha = bl;
      var hs = Math.round(Math.sin(t * 2) * 0.6) * u, cl = wind ? -3 * u : 0, SK = '#8aa298', WD = '#2a5a3a';
      px(ctx, -5 * u, -12 * u, 10 * u, 11 * u, '#0a100e');                                                    // the sodden robe
      px(ctx, -4 * u, -12 * u, 8 * u, 10 * u, '#22323a'); px(ctx, -4 * u, -12 * u, 8 * u, 1 * u, '#33474e');
      px(ctx, -5 * u, -1 * u, 2 * u, 1 * u, '#0a100e'); px(ctx, -1 * u, -1 * u, 2 * u, 1 * u, '#0a100e'); px(ctx, 3 * u, -1 * u, 2 * u, 1 * u, '#0a100e');
      px(ctx, -2 * u, -9 * u, 1 * u, 6 * u, WD); px(ctx, 2 * u, -11 * u, 1 * u, 5 * u, WD);                  // weed caught in it
      px(ctx, -3 * u + hs, -17 * u, 6 * u, 6 * u, '#0a100e'); px(ctx, -2 * u + hs, -17 * u, 4 * u, 5 * u, SK);  // head, hunched
      px(ctx, -3 * u + hs, -17 * u, 1 * u, 7 * u, WD); px(ctx, 2 * u + hs, -17 * u, 1 * u, 7 * u, WD); px(ctx, -2 * u + hs, -18 * u, 4 * u, 1 * u, WD);
      px(ctx, -1 * u + hs, -15 * u, 1 * u, 1 * u, eye || '#70fff0'); px(ctx, 1 * u + hs, -15 * u, 1 * u, 1 * u, eye || '#70fff0');
      px(ctx, -7 * u, -11 * u + cl, 2 * u, 6 * u, '#0a100e'); px(ctx, 5 * u, -11 * u + cl, 2 * u, 6 * u, '#0a100e');    // long arms, claws
      px(ctx, -7 * u, -11 * u + cl, 1 * u, 5 * u, SK); px(ctx, 6 * u, -11 * u + cl, 1 * u, 5 * u, SK);
      px(ctx, -8 * u, -6 * u + cl, 1 * u, 2 * u, '#d8e8e0'); px(ctx, 7 * u, -6 * u + cl, 1 * u, 2 * u, '#d8e8e0');
      var dp = (t * 3) % 1;                                                                                    // it drips
      px(ctx, -4 * u, Math.round((-6 + dp * 6)) * u, 1 * u, 1 * u, 'rgba(120,200,220,' + (0.8 * (1 - dp)).toFixed(2) + ')');
      px(ctx, 3 * u, Math.round((-9 + ((dp + 0.5) % 1) * 9)) * u, 1 * u, 1 * u, 'rgba(120,200,220,' + (0.8 * (1 - (dp + 0.5) % 1)).toFixed(2) + ')');
      ctx.globalAlpha = 1;
    } else if (h.creature === 'hound') {
      ctx.scale(h._face || 1, 1);
      var moving = h._ry !== h.y || h._rx !== h.x, st = moving ? Math.sin(t * 22) : 0, cr = wind ? 1 * u : 0;
      var OL = '#0a080c', HB = '#2a2430', HL = '#3c3446', BN = '#d4cbb8';
      var lg = function (x, ph) { var o = Math.round(Math.sin(t * 22 + ph) * (moving ? 1 : 0)) * u; px(ctx, x + o, -5 * u + cr, 1 * u, 5 * u - cr, OL); };
      lg(-6 * u, 0); lg(-4 * u, 2); lg(3 * u, 1); lg(5 * u, 3);                                                  // long thin legs
      px(ctx, -7 * u, -8 * u + cr, 14 * u, 3 * u, OL); px(ctx, -6 * u, -8 * u + cr, 12 * u, 2 * u, HB);        // a lean body
      px(ctx, -5 * u, -9 * u + cr, 8 * u, 1 * u, OL); px(ctx, -4 * u, -9 * u + cr, 6 * u, 1 * u, HL);          // the spine, arched
      px(ctx, -2 * u, -7 * u + cr, 1 * u, 1 * u, BN); px(ctx, 0, -7 * u + cr, 1 * u, 1 * u, BN); px(ctx, 2 * u, -7 * u + cr, 1 * u, 1 * u, BN);   // ribs
      var hy = -12 * u + cr * 2;                                                                                 // head low and forward to lunge
      px(ctx, 5 * u, hy + 2 * u, 2 * u, 3 * u, OL);                                                              // neck
      px(ctx, 5 * u, hy, 4 * u, 3 * u, OL); px(ctx, 6 * u, hy + 1 * u, 2 * u, 1 * u, HL);
      px(ctx, 9 * u, hy + 1 * u, 3 * u, 2 * u, OL);                                                              // the long snout
      if (wind || strike) { px(ctx, 9 * u, hy + 3 * u, 3 * u, 1 * u, OL); px(ctx, 10 * u, hy + 2 * u, 1 * u, 1 * u, '#e8e0d0'); }   // jaws open
      px(ctx, 5 * u, hy - 2 * u, 1 * u, 2 * u, OL); px(ctx, 7 * u, hy - 2 * u, 1 * u, 2 * u, OL);               // ears up
      px(ctx, 7 * u, hy + 1 * u, 1 * u, 1 * u, eye || '#c080ff');
      px(ctx, -9 * u, -9 * u + cr + Math.round(st) * u, 2 * u, 1 * u, OL); px(ctx, -10 * u, -10 * u + cr + Math.round(st) * u, 1 * u, 1 * u, OL);   // tail
    } else if (CREATURES[h.creature] && CREATURES[h.creature].sheet) {
      person(ctx, h, u, t, wind, strike, ts);
    } else if (h.creature === 'scraprat') {
      ctx.scale(h._face || 1, 1);
      var rmv = h._ry !== h.y || h._rx !== h.x, rs = rmv ? Math.round(Math.sin(t * 26)) : 0, RO = '#0c0a0a', RB = '#5a4a3a', RM = '#8a8070';
      px(ctx, -6 * u, -5 * u, 11 * u, 4 * u, RO); px(ctx, -5 * u, -5 * u, 9 * u, 3 * u, RB); px(ctx, -5 * u, -5 * u, 9 * u, 1 * u, RM);   // a body of scrap plates
      px(ctx, -2 * u, -6 * u, 1 * u, 1 * u, RM); px(ctx, 1 * u, -6 * u, 1 * u, 1 * u, RM);                                               // rivets
      px(ctx, 4 * u, -6 * u + (wind ? -1 * u : 0), 4 * u, 3 * u, RO); px(ctx, 5 * u, -5 * u + (wind ? -1 * u : 0), 2 * u, 1 * u, RB);     // the head
      px(ctx, 6 * u, -5 * u + (wind ? -1 * u : 0), 1 * u, 1 * u, eye || '#ff9030');
      if (wind || strike) px(ctx, 8 * u, -4 * u, 1 * u, 1 * u, '#e8e0d0');
      px(ctx, -9 * u, -4 * u, 3 * u, 1 * u, RO); px(ctx, -10 * u, -5 * u, 1 * u, 1 * u, RO);                                              // a cable tail
      px(ctx, -4 * u + rs * u, -1 * u, 1 * u, 1 * u, RO); px(ctx, 2 * u - rs * u, -1 * u, 1 * u, 1 * u, RO);
    } else if (h.creature === 'drone') {
      var dz = -16 * u + Math.round(Math.sin(t * 3.2) * 1.5) * u, sp = Math.floor(t * 30) % 2;
      var DO = '#08080c', DB = '#4a4e58', DL = '#7a808c';
      px(ctx, -7 * u, dz - 1 * u, 14 * u, 4 * u, DO); px(ctx, -6 * u, dz - 1 * u, 12 * u, 3 * u, DB); px(ctx, -6 * u, dz - 1 * u, 12 * u, 1 * u, DL);   // the hull
      px(ctx, -3 * u, dz + 2 * u, 6 * u, 2 * u, DO); px(ctx, -2 * u, dz + 2 * u, 4 * u, 1 * u, DB);
      px(ctx, -1 * u, dz + 2 * u, 2 * u, 1 * u, eye || (wind ? '#ffffff' : '#ff3050'));                                                      // the lens
      [-8, 6].forEach(function (rx) {                                                                                                         // rotors, blurred
        px(ctx, rx * u, dz - 3 * u, 2 * u, 2 * u, DO);
        ctx.globalAlpha = 0.5; px(ctx, (rx - 3 + sp) * u, dz - 4 * u, 7 * u, 1 * u, '#a0a8b8'); ctx.globalAlpha = 1;
      });
      px(ctx, -5 * u, dz + 3 * u, 1 * u, 3 * u, DO); px(ctx, 4 * u, dz + 3 * u, 1 * u, 3 * u, DO);                                           // grabber arms
      px(ctx, -6 * u, dz + 5 * u, 2 * u, 1 * u, DO); px(ctx, 4 * u, dz + 5 * u, 2 * u, 1 * u, DO);
      if (Math.floor(t * 2) % 2) px(ctx, 5 * u, dz - 1 * u, 1 * u, 1 * u, '#ff4060');                                                       // the blink of its running light
    } else if (h.creature === 'eel') {
      var EO = '#04100e', EB = '#1a4a44', EL = '#3a8a7a', rise = wind ? 4 : strike ? 7 : 2;
      for (var es = 0; es < 7; es++) {                                                                                                         // coils on the ground, rising to the head
        var ex = Math.round(Math.sin(t * 4 + es * 0.9) * 2) + (es - 3) * 2, ey = -2 - (es >= 4 ? (es - 3) * rise / 1.5 : 0);
        px(ctx, (ex - 2) * u, Math.round(ey - 2) * u, 5 * u, 3 * u, EO); px(ctx, (ex - 1) * u, Math.round(ey - 2) * u, 3 * u, 2 * u, es % 2 ? EB : EL);
      }
      var hy2 = Math.round(-4 - 4 * rise / 1.5), hx2 = Math.round(Math.sin(t * 4 + 6 * 0.9) * 2) + 6;
      px(ctx, (hx2 - 3) * u, (hy2 - 3) * u, 7 * u, 5 * u, EO); px(ctx, (hx2 - 2) * u, (hy2 - 3) * u, 5 * u, 4 * u, EB);
      px(ctx, (hx2 - 2) * u, (hy2 - 3) * u, 5 * u, 1 * u, EL);
      px(ctx, (hx2 - 1) * u, (hy2 - 2) * u, 1 * u, 1 * u, eye || '#60ffd0'); px(ctx, (hx2 + 1) * u, (hy2 - 2) * u, 1 * u, 1 * u, eye || '#60ffd0');
      if (wind || strike) { px(ctx, (hx2 - 2) * u, (hy2 + 1) * u, 5 * u, 2 * u, '#000'); px(ctx, (hx2 - 1) * u, (hy2 + 1) * u, 1 * u, 1 * u, '#e8f0e0'); px(ctx, (hx2 + 1) * u, (hy2 + 1) * u, 1 * u, 1 * u, '#e8f0e0'); }
      ctx.globalAlpha = 0.6; for (var ed = 0; ed < 3; ed++) { var dp2 = (t * 1.5 + ed / 3) % 1; px(ctx, (ed * 3 - 3) * u, Math.round(-3 - dp2 * 3) * u, 1 * u, 1 * u, '#80ffe0'); } ctx.globalAlpha = 1;
    } else if (h.creature === 'dredge') {
      var DK = '#0a0806', HB = '#7a5a18', HL = '#c89a30', HD = '#4a3410', sc2 = wind ? -6 : strike ? 4 : 0, gl = 0.5 + 0.5 * Math.abs(Math.sin(t * 2));
      for (var tr = 0; tr < 2; tr++) {                                                                                                         // two tracks, crawling
        var ty = tr ? -4 : -10, off2 = Math.floor(t * 12) % 3;
        px(ctx, -20 * u, ty * u, 34 * u, 5 * u, DK); px(ctx, -19 * u, (ty + 1) * u, 32 * u, 3 * u, '#2a2a2a');
        for (var tp = 0; tp < 11; tp++) px(ctx, (-19 + tp * 3 + off2) * u, (ty + 1) * u, 1 * u, 3 * u, '#4a4a48');
      }
      px(ctx, -16 * u, -26 * u, 26 * u, 16 * u, DK); px(ctx, -15 * u, -26 * u, 24 * u, 15 * u, HB); px(ctx, -15 * u, -26 * u, 24 * u, 2 * u, HL);   // the hull, hazard yellow gone brown
      for (var hz = 0; hz < 6; hz++) px(ctx, (-14 + hz * 4) * u, -14 * u, 2 * u, 2 * u, DK);
      px(ctx, -12 * u, -32 * u, 10 * u, 7 * u, DK); px(ctx, -11 * u, -31 * u, 8 * u, 5 * u, HD);                                            // the cab, its glass gone, eyes in the dark
      px(ctx, -9 * u, -29 * u, 2 * u, 1 * u, eye || '#ffd040'); px(ctx, -6 * u, -29 * u, 2 * u, 1 * u, eye || '#ffd040');
      [[-2, -22], [3, -18], [-10, -19], [6, -24]].forEach(function (b) { px(ctx, b[0] * u, b[1] * u, 2 * u, 1 * u, '#3a5a3a'); });          // weed hanging off it
      px(ctx, 6 * u, (-30 + sc2) * u, 3 * u, 14 * u, DK); px(ctx, 7 * u, (-29 + sc2) * u, 1 * u, 12 * u, HL);                                 // the boom
      px(ctx, 9 * u, (-34 + sc2) * u, 12 * u, 3 * u, DK); px(ctx, 10 * u, (-33 + sc2) * u, 10 * u, 1 * u, HL);
      var sy = strike ? -6 : -22 + sc2;                                                                                                        // the scoop
      px(ctx, 16 * u, sy * u, 9 * u, 8 * u, DK); px(ctx, 17 * u, (sy + 1) * u, 7 * u, 6 * u, '#5a5a58');
      for (var st2 = 0; st2 < 4; st2++) px(ctx, (17 + st2 * 2) * u, (sy + 8) * u, 1 * u, 2 * u, '#c8c8c0');
      ctx.globalAlpha = gl * 0.8; px(ctx, -14 * u, -12 * u, 2 * u, 2 * u, '#60ffd0'); px(ctx, 6 * u, -12 * u, 2 * u, 2 * u, '#60ffd0'); ctx.globalAlpha = 1;
      var dd2 = (t * 2) % 1; ctx.globalAlpha = 0.7 * (1 - dd2); px(ctx, 20 * u, Math.round(sy + 9 + dd2 * 8) * u, 1 * u, 1 * u, '#80c0b0'); ctx.globalAlpha = 1;
    } else if (h.creature === 'imp') {                     // an ember imp: a hot coal with wings, flitting, a tail of sparks
      ctx.scale(h._face || 1, 1);
      var iy = -14 * u + Math.round(Math.sin(t * 7) * 2) * u, wf = Math.sin(t * 24) > 0 ? 1 : 0, IO = '#1a0804';
      px(ctx, -3 * u, iy - 3 * u, 7 * u, 7 * u, IO); px(ctx, -2 * u, iy - 2 * u, 5 * u, 5 * u, '#8a2a10');
      px(ctx, -2 * u, iy - 2 * u, 3 * u, 2 * u, '#e85a20'); px(ctx, -1 * u, iy - 1 * u, 1 * u, 1 * u, '#ffd060');
      px(ctx, -7 * u, iy - (2 + wf * 2) * u, 4 * u, 2 * u, IO); px(ctx, 4 * u, iy - (2 + wf * 2) * u, 4 * u, 2 * u, IO);   // wings, beating
      px(ctx, -6 * u, iy - (2 + wf * 2) * u, 2 * u, 1 * u, '#5a1a0a'); px(ctx, 5 * u, iy - (2 + wf * 2) * u, 2 * u, 1 * u, '#5a1a0a');
      px(ctx, -2 * u, iy - 5 * u, 1 * u, 2 * u, IO); px(ctx, 2 * u, iy - 5 * u, 1 * u, 2 * u, IO);                   // horns
      px(ctx, -1 * u, iy, 1 * u, 1 * u, eye || '#fff0a0'); px(ctx, 1 * u, iy, 1 * u, 1 * u, eye || '#fff0a0');
      ctx.globalCompositeOperation = 'lighter';
      for (var es = 0; es < 4; es++) {
        var ep = ((t * 1.6) + es / 4) % 1;
        px(ctx, Math.round(Math.sin(es * 2.1 + t * 3) * 2) * u, iy + Math.round((4 + ep * 9)) * u, 1 * u, 1 * u, 'rgba(255,' + (160 - ep * 100 | 0) + ',40,' + (0.8 * (1 - ep)).toFixed(2) + ')');
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (h.creature === 'magma') {                   // a magma crab: a shell of black crust split with glowing seams
      var mcr = h._hp < h.maxHP * 0.5, glow = mcr ? 0.6 + 0.4 * Math.abs(Math.sin(t * 6)) : 0.55 + 0.15 * Math.sin(t * 2);
      var msw = Math.round(Math.sin(t * 2.5) * u), mcl = wind ? -3 * u : strike ? 2 * u : 0, MO = '#0a0606', MS = '#2a1e1c', ML = '#4a3a36';
      for (var mk = 0; mk < 4; mk++) {
        var ml = Math.sin(t * 5 + mk) > 0 ? 1 : 0;
        px(ctx, (-9 + mk * 2) * u + msw, (-3 + ml) * u, 1 * u, 3 * u, MO); px(ctx, (2 + mk * 2) * u + msw, (-3 + 1 - ml) * u, 1 * u, 3 * u, MO);
      }
      px(ctx, -9 * u + msw, -11 * u, 18 * u, 9 * u, MO); px(ctx, -8 * u + msw, -11 * u, 16 * u, 8 * u, MS);
      px(ctx, -7 * u + msw, -11 * u, 10 * u, 2 * u, ML);
      ctx.globalAlpha = glow;
      px(ctx, -4 * u + msw, -9 * u, 1 * u, 5 * u, '#ff7020'); px(ctx, -3 * u + msw, -6 * u, 4 * u, 1 * u, '#ff7020'); px(ctx, 3 * u + msw, -10 * u, 1 * u, 4 * u, '#ff7020');
      if (mcr) { px(ctx, -7 * u + msw, -8 * u, 3 * u, 1 * u, '#ffb040'); px(ctx, 5 * u + msw, -7 * u, 2 * u, 1 * u, '#ffb040'); }
      ctx.globalAlpha = 1;
      px(ctx, -13 * u + msw, -10 * u + mcl, 4 * u, 4 * u, MO); px(ctx, -12 * u + msw, -9 * u + mcl, 2 * u, 2 * u, ML);    // claws
      px(ctx, 9 * u + msw, -10 * u + mcl, 4 * u, 4 * u, MO); px(ctx, 10 * u + msw, -9 * u + mcl, 2 * u, 2 * u, ML);
      px(ctx, -2 * u + msw, -13 * u, 1 * u, 2 * u, MO); px(ctx, 2 * u + msw, -13 * u, 1 * u, 2 * u, MO);
      px(ctx, -2 * u + msw, -14 * u, 1 * u, 1 * u, eye || '#ffd060'); px(ctx, 2 * u + msw, -14 * u, 1 * u, 1 * u, eye || '#ffd060');
    } else if (h.creature === 'drowned' || h.creature === 'spectre') {   // the drowned of Saltmere; the Gloaming's sailors, see-through
      var spec = h.creature === 'spectre', dbl = h._blinkAt ? Math.min(1, (performance.now() - h._blinkAt) / 350) : 1;
      ctx.globalAlpha = dbl * (spec ? 0.7 + 0.15 * Math.sin(t * 3) : 1);
      var dh = Math.round(Math.sin(t * 1.8) * 0.6) * u, dcl = wind ? -3 * u : 0, fl = spec ? Math.round(Math.sin(t * 2) * 2) * u - 2 * u : 0;
      var DO = spec ? '#0a1a1c' : '#0a0e0c', DC = spec ? '#3a7a80' : '#3a4a3a', DL = spec ? '#6ab8c0' : '#5a6a52', DS = spec ? '#9ad8e0' : '#8a9a88';
      px(ctx, -5 * u, -12 * u + fl, 10 * u, 11 * u, DO); px(ctx, -4 * u, -12 * u + fl, 8 * u, 10 * u, DC); px(ctx, -4 * u, -12 * u + fl, 8 * u, 1 * u, DL);
      if (!spec) { px(ctx, -4 * u, -6 * u, 8 * u, 1 * u, '#c8b040'); px(ctx, -2 * u, -10 * u, 1 * u, 5 * u, '#2a5a3a'); }   // an oilskin's yellow band, weed
      else { px(ctx, -4 * u, -9 * u + fl, 8 * u, 1 * u, '#e0e8ff'); px(ctx, -4 * u, -7 * u + fl, 8 * u, 1 * u, '#e0e8ff'); }   // a striped shirt
      px(ctx, -3 * u + dh, -17 * u + fl, 6 * u, 6 * u, DO); px(ctx, -2 * u + dh, -17 * u + fl, 4 * u, 5 * u, DS);
      if (spec) { px(ctx, -3 * u + dh, -18 * u + fl, 6 * u, 2 * u, '#1a3a40'); px(ctx, 3 * u + dh, -18 * u + fl, 2 * u, 1 * u, '#1a3a40'); }   // a bandana
      else { px(ctx, -3 * u + dh, -18 * u, 6 * u, 2 * u, '#a8902a'); px(ctx, -4 * u + dh, -17 * u, 8 * u, 1 * u, '#a8902a'); }               // a sou'wester
      px(ctx, -1 * u + dh, -15 * u + fl, 1 * u, 1 * u, eye || (spec ? '#c0ffff' : '#a0ffd0')); px(ctx, 1 * u + dh, -15 * u + fl, 1 * u, 1 * u, eye || (spec ? '#c0ffff' : '#a0ffd0'));
      px(ctx, -7 * u, -11 * u + dcl + fl, 2 * u, 6 * u, DO); px(ctx, 5 * u, -11 * u + dcl + fl, 2 * u, 6 * u, DO);
      px(ctx, -7 * u, -11 * u + dcl + fl, 1 * u, 5 * u, DS); px(ctx, 6 * u, -11 * u + dcl + fl, 1 * u, 5 * u, DS);
      if (spec) { px(ctx, 7 * u, -16 * u + dcl + fl, 1 * u, 8 * u, '#d8e8f0'); px(ctx, 6 * u, -9 * u + dcl + fl, 3 * u, 1 * u, '#5a6a70'); }   // a cutlass
      else {
        var ddp = (t * 2.6) % 1;                                                                                 // dripping
        px(ctx, -4 * u, Math.round((-6 + ddp * 6)) * u, 1 * u, 1 * u, 'rgba(120,200,220,' + (0.8 * (1 - ddp)).toFixed(2) + ')');
      }
      if (spec) { ctx.globalCompositeOperation = 'lighter'; px(ctx, -5 * u, -12 * u + fl, 10 * u, 11 * u, 'rgba(60,160,170,0.18)'); ctx.globalCompositeOperation = 'source-over'; }
      ctx.globalAlpha = 1;
    } else if (h.creature === 'warden') {
      var rage = h._hp < h.maxHP / 3, toll = h._kind === 'toll', sl = Math.round(Math.sin(t * 1.6) * 0.6) * u;
      var RB = '#1c282c', RL = '#28383c', BZ = '#8a6428', BZL = '#c09048';
      for (var rr = 0; rr < 19; rr++) {                                                                        // the long robe, wider at the hem
        var hw = Math.round(5 + rr * 0.3);
        px(ctx, -(hw + 1) * u, (-19 + rr) * u, (hw + 1) * 2 * u, 1 * u, '#080c0e');
        px(ctx, -hw * u, (-19 + rr) * u, hw * 2 * u, 1 * u, rr % 5 === 2 ? RL : RB);
      }
      [[-4, -6], [3, -10], [-2, -14], [5, -3], [-6, -2]].forEach(function (b) { px(ctx, b[0] * u, b[1] * u, 1 * u, 1 * u, '#8a8070'); });   // barnacles
      px(ctx, -8 * u + sl, -21 * u, 16 * u, 3 * u, '#080c0e'); px(ctx, -7 * u + sl, -21 * u, 14 * u, 2 * u, BZ); px(ctx, -7 * u + sl, -21 * u, 14 * u, 1 * u, BZL);
      px(ctx, -5 * u + sl, -30 * u, 10 * u, 10 * u, '#080c0e');                                              // a bell for a head
      px(ctx, -3 * u + sl, -30 * u, 6 * u, 1 * u, BZL); px(ctx, -4 * u + sl, -29 * u, 8 * u, 7 * u, BZ); px(ctx, -3 * u + sl, -29 * u, 2 * u, 6 * u, BZL);
      px(ctx, -5 * u + sl, -22 * u, 10 * u, 1 * u, BZL);
      var slit = toll && wind ? '#ffffff' : rage ? '#ff6a40' : '#ffd070';
      px(ctx, -2 * u + sl, -25 * u, 4 * u, 1 * u, slit);
      if (wind && !toll) {                                                                                     // the hammer up over its head
        px(ctx, 6 * u, -34 * u, 2 * u, 16 * u, '#080c0e'); px(ctx, 6 * u, -33 * u, 1 * u, 14 * u, '#4a3420');
        px(ctx, 3 * u, -39 * u, 8 * u, 6 * u, '#080c0e'); px(ctx, 4 * u, -38 * u, 6 * u, 4 * u, '#6a6a74'); px(ctx, 4 * u, -38 * u, 6 * u, 1 * u, '#9a9aa8');
      } else if (strike && !toll) {                                                                            // smashed down in front
        px(ctx, 4 * u, -14 * u, 2 * u, 12 * u, '#080c0e'); px(ctx, 4 * u, -13 * u, 1 * u, 10 * u, '#4a3420');
        px(ctx, 1 * u, -4 * u, 8 * u, 5 * u, '#080c0e'); px(ctx, 2 * u, -3 * u, 6 * u, 3 * u, '#6a6a74');
      } else {
        px(ctx, 9 * u, -22 * u, 2 * u, 21 * u, '#080c0e'); px(ctx, 9 * u, -21 * u, 1 * u, 19 * u, '#4a3420');
        px(ctx, 7 * u, -26 * u, 6 * u, 5 * u, '#080c0e'); px(ctx, 8 * u, -25 * u, 4 * u, 3 * u, '#6a6a74');
        px(ctx, -10 * u, -19 * u, 3 * u, 8 * u, '#080c0e'); px(ctx, -9 * u, -18 * u, 1 * u, 6 * u, RL);
      }
    }
    ctx.restore();
    if (!bare) bar(ctx, h, cx, footY, ts);
  }
  // its health bar once it's been hurt (a boss has its own, across the top): a dark rim, the colour, a lit top edge
  function bar(ctx, h, cx, footY, ts) {
    if (!(h._hp < h.maxHP) || h.boss) return;
    var u = Math.max(1, Math.round(ts / 16)), w = 12 * u, f = Math.max(0, h._hp / h.maxHP);
    var x = Math.round(cx - w / 2), y = Math.round(footY) - 21 * u, fill = Math.round(w * f);
    px(ctx, x - 1, y - 1, w + 2, 2 * u + 2, 'rgba(10,6,8,0.85)');
    if (fill > 0) {
      px(ctx, x, y, fill, 2 * u, f > 0.4 ? '#e0b838' : '#e04838');
      px(ctx, x, y, fill, 1, f > 0.4 ? '#fff0a0' : '#ff9a80');
    }
  }

  // a scene world's items: every creature, depth-sorted with the characters
  var cv = null, cvB = null, lastT = 0;
  function sceneItems(world, offX, offY, ts, now, sc) {
    var dt = lastT ? Math.min(100, now - lastT) : 16; lastT = now;
    var out = [];
    (world.interactions || []).forEach(function (h) {
      if (h.type !== 'hostile' || !h.creature) return;
      glide(h, dt);
      var footRow = h._ry + 0.9;
      out.push({ footRow: footRow, draw: function (ctx) {
        var S = ts * (h.boss ? 3 : 2), big = h.boss;
        if (big ? !cvB : !cv) { if (big) cvB = document.createElement('canvas'); else cv = document.createElement('canvas'); }
        var c = big ? cvB : cv;
        if (c.width !== S) { c.width = S; c.height = S; }
        var g = c.getContext('2d');
        g.clearRect(0, 0, S, S);
        drawCreature(g, h, S / 2, S - ts * 0.15, ts, now, true);
        // what's on it: struck (a flash on its own pixels: white while the blow holds it, then a red blush fading),
        // frozen (rimed blue), burning (embers lifting off) — on the clock the hits keep (performance.now), not the world's
        var pn = performance.now(), held = h._stopUntil > pn, since = h._hitAt ? pn - h._hitAt : 1e9;
        var white = since < 90 || held, blush = !white && since < 240, frozen = h._frostUntil > pn, burning = h._burnUntil > pn;
        if (white || blush || frozen) {
          g.save(); g.globalCompositeOperation = 'source-atop';
          g.fillStyle = white ? 'rgba(255,255,255,0.85)' : blush ? 'rgba(255,90,80,' + (0.5 * (1 - (since - 90) / 150)).toFixed(2) + ')' : 'rgba(150,205,255,0.38)';
          g.fillRect(0, 0, S, S);
          if (blush && frozen) { g.fillStyle = 'rgba(150,205,255,0.3)'; g.fillRect(0, 0, S, S); }
          g.restore();
        }
        g.save(); g.globalCompositeOperation = 'destination-over';        // the shadow goes in under it, unflashed
        feet(g, h, S / 2, S - ts * 0.15, ts);
        g.restore();
        bar(g, h, S / 2, S - ts * 0.15, ts);
        if (frozen) { g.fillStyle = '#e8f6ff'; for (var i = 0; i < 4; i++) g.fillRect(Math.round(S / 2 + Math.sin(i * 2.1) * ts * 0.3), Math.round(S - ts * (0.4 + i * 0.2)), 2, 2); }
        if (burning) {
          for (var j = 0; j < 6; j++) {
            var ph = ((now / 600) + j / 6) % 1;
            g.fillStyle = ph < 0.4 ? '#ffe070' : ph < 0.7 ? '#ff8a30' : 'rgba(200,60,20,0.6)';
            g.fillRect(Math.round(S / 2 + Math.sin(j * 1.9 + now / 300) * ts * 0.25), Math.round(S - ts * (0.3 + ph * 0.7)), 2, 2);
          }
        }
        var dx = Math.round(offX + (h._rx + 0.5) * ts - S / 2), dy = Math.round(offY + (h._ry + 1) * ts - S + ts * 0.15 - ts * 0.1);
        if (held) dx += Math.floor(pn / 28) % 2 ? 1 : -1;               // frozen by the blow, shuddering (js/arms.js)
        var rk = h._recoil ? (pn - h._recoil.at) / 160 : 1;            // and knocked back a few pixels by it
        if (rk < 1) { dx += Math.round(h._recoil.dx * 4 * (1 - rk)); dy += Math.round(h._recoil.dy * 3 * (1 - rk)); }
        if (sc && typeof BridgeScene !== 'undefined') BridgeScene.drawOccluded(ctx, sc, c, 0, 0, S, S, dx, dy, footRow, offX, offY, null, null);
        else ctx.drawImage(c, dx, dy);
      } });
    });
    return out;
  }

  // ---- what each attack hits, and the tiles marked on the ground while it winds up --------------------------------
  function attackStart(h, player) {
    var px = player.getX(), py = player.getY(), d = Math.abs(px - h.x) + Math.abs(py - h.y);
    h._kind = 'hit';
    if (h.range && d > 1) h._kind = 'bolt';
    if ((h.creature === 'sentinel' || h.creature === 'magma') && h._hp < h.maxHP * 0.5) h._kind = 'slam';
    if (h.slams && (h._swings = (h._swings || 0) + 1) % 2 === 0) h._kind = 'slam';     // every other blow from Saint Ruin or the Dredge
    if (h.creature === 'warden') {
      h._swings = (h._swings || 0) + 1;
      h._kind = d >= 2 || h._swings % 3 === 0 ? 'toll' : 'slam';
      if (h._kind === 'toll') h._attackTarget = { x: h.x, y: h.y };
    }
    if (h._kind === 'toll') sfx('bell');
  }
  function dangerCells(h) {
    var t = h._attackTarget;
    if (!t) return [];
    if (h._kind === 'toll') {                                     // a ring two tiles out from the warden
      var ring = [];
      for (var x = -2; x <= 2; x++) for (var y = -2; y <= 2; y++) if (Math.max(Math.abs(x), Math.abs(y)) === 2) ring.push([h.x + x, h.y + y]);
      return ring;
    }
    if (h._kind === 'slam') {
      var cells = [[t.x, t.y], [t.x + 1, t.y], [t.x - 1, t.y], [t.x, t.y + 1], [t.x, t.y - 1]];
      if (h.creature === 'warden' || h.creature === 'dredge') cells.push([t.x + 1, t.y + 1], [t.x - 1, t.y - 1], [t.x + 1, t.y - 1], [t.x - 1, t.y + 1]);
      return cells.filter(function (c) { return c[0] !== h.x || c[1] !== h.y; });
    }
    return [[t.x, t.y]];
  }
  function dangerAt(h, x, y) { return dangerCells(h).some(function (c) { return c[0] === x && c[1] === y; }); }
  function attackDamage(h) { return Math.round((h.damage || 5) * (h._kind === 'toll' ? 0.85 : h._kind === 'slam' && h.creature === 'sentinel' ? 1.2 : h._kind === 'slam' && h.slams ? 0.9 : 1)); }
  // the strike leaves the creature: a bolt flies, a slam shakes the ground, the bell rings out, a bite or a blow rakes
  // the tile it locked onto (js/fx.js spawnStrike, in its own colour)
  var bolts = [], rings = [];
  var RAKE = { mite: '#f070b0', crab: '#80b0ff', shade: '#c090ff', sentinel: '#c49cff', wisp: '#c8a8ff', wight: '#70fff0', hound: '#e8e0d0', warden: '#ffd070',
               imp: '#ff9040', magma: '#ff6a20', drowned: '#a0ffd0', spectre: '#c0ffff',
               saint: '#ff9a40', shiv: '#ffe0b0', scraprat: '#ffb060', ruin: '#ff7a2a', drone: '#ff4060', eel: '#60ffd0', husk: '#a0c8ff', dredge: '#ffd040' };
  var BOLT = { imp: [255, 140, 60], drone: [255, 70, 90] };                     // a bolt's colour by who threw it (the wisps' violet, else)
  function strikeFx(h, now) {
    var t = h._attackTarget;
    if (h._kind === 'bolt') { bolts.push({ x0: h.x + 0.5, y0: h.y - 0.1, x1: t.x + 0.5, y1: t.y + 0.4, at: now, dur: h.strikeMs || 380, col: BOLT[h.creature] }); sfx('zap'); return true; }
    if (h._kind === 'toll') { rings.push({ x: h.x + 0.5, y: h.y + 0.5, at: now }); sfx('toll'); shake(4); return true; }
    if (h._kind === 'slam') { sfx('slam'); shake(h.boss ? 5 : 3); if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) BridgeFX.spawnSparks(t.x, t.y, '#b8a8d0', 10); return true; }
    if (t && typeof BridgeFX !== 'undefined' && BridgeFX.spawnStrike) { BridgeFX.spawnStrike(h.x, h.y, t.x, t.y, RAKE[h.creature]); return true; }
    return false;
  }
  // A wind-up marks the tiles it will hit on the ground: under each, a pool of its colour lying flat on the floor with
  // a crisp pixel edge, and a second ring closing in onto that edge as the blow comes; struck, the pool flares. Red for a
  // blow or a slam, gold for the toll, violet where a bolt will land. Round, not boxes. On performance.now(), the clock
  // the wind-up keeps (the world draws on Date.now()).
  function ground(ctx, world, offX, offY, ts) {
    var pn = performance.now(), FX = typeof BridgeFX !== 'undefined' && BridgeFX.disc ? BridgeFX : null;
    (world.interactions || []).forEach(function (h) {
      if (h.type !== 'hostile' || !h.creature || (h._attackPhase !== 'winding' && h._attackPhase !== 'striking') || !FX) return;
      var wind = h._attackPhase === 'winding', p = wind ? Math.max(0, Math.min(1, (pn - h._attackStart) / (h._windFor || h.windupMs || 500))) : 1;
      var col = h._kind === 'toll' ? [255, 200, 90] : h._kind === 'bolt' ? (BOLT[h.creature] || [200, 150, 255]) : [255, 70, 60], rgb = col.join(',');
      var rx = Math.round(ts * 0.42), Q = 0.5;
      ctx.save();
      dangerCells(h).forEach(function (c) {
        var cx = Math.round(offX + (c[0] + 0.5) * ts), cy = Math.round(offY + (c[1] + 0.78) * ts);
        var a = wind ? 0.16 + 0.3 * p + 0.06 * Math.sin(pn / 70) : 0.6;
        FX.glow(ctx, cx, cy, rx * 1.25, col, a, Q);                         // the pool, soft
        ctx.fillStyle = 'rgba(' + rgb + ',' + (wind ? 0.08 + 0.14 * p : 0.32).toFixed(2) + ')';
        FX.disc(ctx, cx, cy, rx, Q);                                         // its body, in whole pixels
        ctx.fillStyle = 'rgba(' + rgb + ',' + Math.min(0.95, a + 0.3).toFixed(2) + ')';
        FX.ring(ctx, cx, cy, rx, Q);                                         // the edge
        if (wind) {                                                          // closing in as it comes
          ctx.fillStyle = 'rgba(' + rgb + ',' + (0.25 + 0.6 * p).toFixed(2) + ')';
          FX.ring(ctx, cx, cy, rx + Math.round((1 - p) * ts * 0.4), Q);
        } else {
          ctx.fillStyle = 'rgba(255,240,230,0.7)';
          FX.disc(ctx, cx, cy, Math.round(rx * 0.45), Q);
        }
      });
      ctx.restore();
    });
  }
  // over everything: bolts in flight (a soft round glow, a pixel core, motes behind, its shadow on the ground under the
  // arc, a ring where it lands), the bell's ring going out, a boss's health across the top — on performance.now() too
  function over(ctx, world, offX, offY, ts, now) {
    var pn = performance.now(), FX = typeof BridgeFX !== 'undefined' && BridgeFX.disc ? BridgeFX : null;
    bolts = bolts.filter(function (b) { return pn - b.at < b.dur + 220; });
    rings = rings.filter(function (r) { return pn - r.at < 600; });
    if ((bolts.length || rings.length) && FX) {
      ctx.save();
      bolts.forEach(function (b) {
        var k = Math.min(1, (pn - b.at) / b.dur);
        var at = function (q) { return [offX + (b.x0 + (b.x1 - b.x0) * q) * ts, offY + (b.y0 + (b.y1 - b.y0) * q) * ts, Math.sin(Math.PI * q) * ts * 0.5]; };
        var hd = at(k);
        ctx.globalCompositeOperation = 'source-over';
        if (k < 1) { ctx.fillStyle = 'rgba(10,6,20,0.3)'; FX.disc(ctx, hd[0], hd[1] + ts * 0.35, 3, 0.5); }
        ctx.globalCompositeOperation = 'lighter';
        if (k < 1) {
          for (var i = 1; i < 8; i++) {                                       // motes trailing off it
            var q = k - i * 0.04;
            if (q <= 0) break;
            var m = at(q);
            ctx.fillStyle = 'rgba(' + (b.col || [200, 170, 255]).join(',') + ',' + (0.6 - i * 0.07).toFixed(2) + ')';
            ctx.fillRect(Math.round(m[0] + Math.sin(i * 2.3 + pn / 90)), Math.round(m[1] - m[2]), i < 3 ? 2 : 1, i < 3 ? 2 : 1);
          }
          var X = hd[0], Y = hd[1] - hd[2];
          FX.glow(ctx, X, Y, 9, b.col || [180, 140, 255], 0.5);
          ctx.fillStyle = b.col ? '#fff0c0' : '#e8dcff'; FX.disc(ctx, X, Y, 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X), Math.round(Y), 1, 1);
        } else {                                                              // landed: a ring going out, a flare going down
          var e = Math.min(1, (pn - b.at - b.dur) / 220), LX = offX + b.x1 * ts, LY = offY + b.y1 * ts;
          FX.glow(ctx, LX, LY, 12 * (1 - e * 0.4), b.col || [200, 170, 255], 0.55 * (1 - e));
          ctx.fillStyle = 'rgba(230,214,255,' + (0.85 * (1 - e)).toFixed(2) + ')';
          FX.ring(ctx, LX, LY, 3 + e * 10, 0.6);
        }
      });
      ctx.globalCompositeOperation = 'lighter';
      rings.forEach(function (r) {
        var k = (pn - r.at) / 600, R = Math.round((0.6 + k * 2.2) * ts);
        for (var j = 0; j < 3; j++) {                                         // three pixels deep, the outer edge brightest
          ctx.fillStyle = 'rgba(255,' + (210 + j * 15) + ',' + (120 + j * 40) + ',' + (0.8 * (1 - k) * (1 - j * 0.3)).toFixed(2) + ')';
          FX.ring(ctx, offX + r.x * ts, offY + r.y * ts, R - j, 0.72);
        }
      });
      ctx.restore();
    }
    var boss = (world.interactions || []).filter(function (h) { return h.type === 'hostile' && h.boss && (h._engaged || h._hp < h.maxHP); })[0];
    if (boss) bossBar(ctx, boss, ts);
  }
  // a boss's health, under the place name at the top of the screen (62 CSS px down, whatever the zoom)
  function bossBar(ctx, boss, ts) {
    var sv = BridgeWorld.getScreenView ? BridgeWorld.getScreenView() : null, zk = sv && sv.ts ? sv.ts / ts : 1;
    var W = ctx.canvas.width, bw = Math.min(320, W - 40), bx = Math.round((W - bw) / 2), by = Math.round(66 / zk) + 8, f = Math.max(0, boss._hp / boss.maxHP);
    ctx.fillStyle = 'rgba(8,6,10,0.8)'; ctx.fillRect(bx - 3, by - 3, bw + 6, 12);
    ctx.fillStyle = '#3a1a1a'; ctx.fillRect(bx, by, bw, 6);
    ctx.fillStyle = f > 0.33 ? '#d8a040' : '#e85030'; ctx.fillRect(bx, by, Math.round(bw * f), 6);
    [0.66, 0.33].forEach(function (m) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx + Math.round(bw * m), by, 1, 6); });
    ctx.font = '8px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#f0d8a0';
    ctx.fillText(boss.label, W / 2, by - 6);
  }

  // ---- each frame, for each creature: what's burning it, what's slowed it, the warden's call ---------------------------
  var save = { day: null, staff: false, tomb: false };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem('bridge_midnight') || '{}')); } catch (e) { /* fresh */ }
  function store() { try { localStorage.setItem('bridge_midnight', JSON.stringify(save)); } catch (e) { /* private */ } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function tick(world, h, now, player) {
    if (!h.creature) return 1;
    if (player) h._face = player.getX() < h.x ? -1 : player.getX() > h.x ? 1 : (h._face || 1);
    if (h._burnUntil > now && now - (h._burnTick || 0) > 600) {
      h._burnTick = now;
      if (typeof BridgeItems !== 'undefined' && BridgeItems.strike) BridgeItems.strike(world, h, 3, { dot: true });
    }
    if (h.creature === 'warden' && player) {
      var d = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y);
      if (!h._engaged && d <= h.aggroRange) engage(h, typeof BridgeFight !== 'undefined' ? BridgeFight.company() : 1);
      var f = h._hp / h.maxHP;
      if (f < 0.66 && !h._called1) { h._called1 = true; call(world, h); }
      if (f < 0.33 && !h._called2) { h._called2 = true; call(world, h); h.windupMs = Math.round(h.windupMs * 0.8); h.moveCooldown = Math.round(h.moveCooldown * 0.8); }
    }
    var BC = CREATURES[h.creature];
    if (BC && BC.calls && h.boss && player) {                        // Saint Ruin, the Dredge: wake as you come near, call help at 2/3 and 1/3
      var dd = Math.abs(player.getX() - h.x) + Math.abs(player.getY() - h.y);
      if (!h._engaged && dd <= h.aggroRange) {
        h._engaged = true; sfx('slam'); shake(3);
        var co = typeof BridgeFight !== 'undefined' ? BridgeFight.company() : 1;
        if (co > 1) { var kk = 1 + 0.6 * (co - 1); h._hp = Math.round(h._hp * kk); h.maxHP = Math.round(h.maxHP * kk); }
        if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast(BC.title[0], BC.title[1], BC.title[2]);
      }
      var ff = h._hp / h.maxHP;
      if (ff < 0.66 && !h._called1) { h._called1 = true; call(world, h, BC.calls); }
      if (ff < 0.33 && !h._called2) { h._called2 = true; call(world, h, BC.calls); h.windupMs = Math.round(h.windupMs * 0.85); }
    }
    if (player && (h.x !== player.getX() || h.y !== player.getY())) {    // which way a person-creature looks (its sheet's row)
      var lx = player.getX() - h.x, ly = player.getY() - h.y;
      h._dir = Math.abs(lx) > Math.abs(ly) ? (lx > 0 ? 'right' : 'left') : (ly > 0 ? 'down' : 'up');
    }
    return h._frostUntil > now ? 1.7 : 1;
  }
  // the warden wakes: with company (others fighting beside you, js/fight.js) it's tougher — half again for each
  function engage(h, company) {
    if (h._engaged) return;
    h._engaged = true; sfx('toll');
    if (company > 1 && !h._rallied) {
      h._rallied = true;
      var k = 1 + 0.6 * (company - 1);
      h._hp = Math.round(h._hp * k); h.maxHP = Math.round(h.maxHP * k);
    }
    if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('The Bell Warden', 'It turns from the arches, and the bell where its head should be begins to sway',
      company > 1 ? 'It rings louder for the two of you' : 'Close in, or keep clear of the ring');
  }
  function call(world, h, kind) {                                  // the bell calls wisps out of the dark (Ruin his Saints, the Dredge its drones)
    kind = kind || 'wisp';
    sfx(kind === 'wisp' ? 'toll' : 'slam'); shake(3);
    var n = 0;
    [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2], [2, -2], [-2, 2]].forEach(function (o) {
      if (n >= 2) return;
      var x = h.x + o[0], y = h.y + o[1];
      if (world.collisions[y] && world.collisions[y][x] === 0 && !(typeof BridgeCharacter !== 'undefined' && BridgeCharacter.getX() === x && BridgeCharacter.getY() === y)) {
        var w = spawn(world, kind, x, y); w._blinkAt = performance.now(); w.reward = Math.round(w.reward / 2); n++;
        if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) BridgeFX.spawnSparks(x, y, RAKE[kind] || '#c8a8ff', 10);
      }
    });
  }

  // a weapon's hit: holy bites the undead deeper; frost, embers, the drinking blade; heavy staggers and knocks back
  // implants (js/implants.js): the arm hits harder, the eyes find criticals
  function damageFor(w, h) {
    var I = typeof BridgeImplants !== 'undefined' ? BridgeImplants : null, m = I ? I.damage() * (I.crit() ? 1.75 : 1) : 1;
    return Math.round((w && w.damage || 1) * (w && w.holy && UNDEAD[h.creature] ? 1.6 : 1) * m);
  }
  function onHit(world, h, w, dmg) {
    var now = performance.now();
    if (!w || w.dot) return;
    if (w.frost) { h._frostUntil = now + 3200; sfx('frost'); }
    if (w.burn) { h._burnUntil = now + 3200; h._burnTick = now; sfx('burn'); }
    if (w.drain && !w.remote && typeof BridgeInventory !== 'undefined') {
      var back = Math.max(1, Math.round(dmg * w.drain));
      BridgeInventory.restoreHP(back);
      if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(BridgeCharacter.getX(), BridgeCharacter.getY() - 0.4, '+' + back, '#80f0a0');
    }
    if (h._hp <= 0) return;
    var from = w.from || (typeof BridgeCharacter !== 'undefined' ? { x: BridgeCharacter.getX(), y: BridgeCharacter.getY() } : null);
    if (w.heavy) {
      if (h._attackPhase === 'winding') { h._attackPhase = 'recovering'; h._attackStart = now; h._attackTarget = null; }
      if (!w.remote) shake(2);
    }
    // knocked back: a heavy weapon a tile, a finisher or a charged blow (js/arms.js `push`) as far as it says
    var knock = Math.max(w.heavy ? 1 : 0, +w.push || 0);
    if (knock && !h.boss) push(world, h, knock, from);
    if (h.blink && Math.random() < h.blink) blink(world, h, from);
  }
  function push(world, h, n, from) {
    if (!from) return;
    var sx = Math.sign(h.x - from.x), sy = Math.sign(h.y - from.y);
    if (Math.abs(h.x - from.x) >= Math.abs(h.y - from.y)) sy = 0; else sx = 0;
    for (var i = 0; i < n; i++) {                                  // a tile at a time, stopping at whatever's in the way
      var nx = h.x + sx, ny = h.y + sy;
      if (!world.collisions[ny] || world.collisions[ny][nx] !== 0) return;
      if (world.interactions.some(function (o) { return o !== h && o.x === nx && o.y === ny && o.type === 'hostile'; })) return;
      world.collisions[h.y][h.x] = 0; h.x = nx; h.y = ny; world.collisions[ny][nx] = 1;
      h._lastMove = performance.now();
    }
  }
  function blink(world, h, from) {
    var px = from ? from.x : BridgeCharacter.getX(), py = from ? from.y : BridgeCharacter.getY(), opts = [];
    for (var x = -3; x <= 3; x++) for (var y = -3; y <= 3; y++) {
      var nx = h.x + x, ny = h.y + y, d = Math.abs(nx - px) + Math.abs(ny - py);
      if (d >= 2 && d <= 3 && world.collisions[ny] && world.collisions[ny][nx] === 0) opts.push([nx, ny]);
    }
    if (!opts.length) return;
    var o = opts[Math.floor(Math.random() * opts.length)];
    if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) BridgeFX.spawnSparks(h.x, h.y, '#70e0d0', 8);
    world.collisions[h.y][h.x] = 0; h.x = h._rx = o[0]; h.y = h._ry = o[1]; world.collisions[h.y][h.x] = 1;
    h._attackPhase = 'recovering'; h._attackStart = performance.now(); h._attackTarget = null; h._blinkAt = performance.now();
    sfx('zap');
  }
  function onKill(world, h) {
    if (typeof BridgeUndercity !== 'undefined' && BridgeUndercity.onKill) BridgeUndercity.onKill(world, h);
    if (h.creature === 'warden') {
      save.day = today();
      var first = !save.staff;
      if (first && typeof BridgeLoot !== 'undefined') { BridgeLoot.spawn(h.x, h.y, 'wispcaller', 1); save.staff = true; }
      store(); sfx('toll'); shake(5);
      world.interactions.filter(function (o) { return o.type === 'hostile' && o.creature === 'wisp'; }).forEach(function (o) {
        if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) BridgeFX.spawnSparks(o.x, o.y, '#c8a8ff', 6);
        if (typeof BridgeInteractions !== 'undefined') { o.reward = 0; o.drops = []; BridgeInteractions.killHostile(world, o); }
      });
      if (typeof BridgeQuests !== 'undefined' && BridgeQuests.toast) BridgeQuests.toast('The Bell Warden falls', 'The bell cracks, and its last note goes out across the water',
        first ? 'It leaves a staff of black wood with a wisp caught in its head' : 'It will be back in the arches tomorrow');
    }
    if (h.creature === 'wight' && !save.tomb && typeof BridgeInventory !== 'undefined' && BridgeInventory.getCount && !BridgeInventory.getCount('tomb_key') &&
        !keyOut && typeof BridgeLoot !== 'undefined') {
      keyOut = true;                                                // one key on the ground at a time
      BridgeLoot.spawn(h.x, h.y, 'tomb_key', 1);
    }
  }

  // the screen jolts when something lands
  function shake(n) {
    var c = document.getElementById('bridge-canvas');
    if (!c || !c.animate) return;
    var k = n || 2;
    c.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + k + 'px,' + (-k * 0.6) + 'px)' },
               { transform: 'translate(' + (-k) + 'px,' + (k * 0.5) + 'px)' }, { transform: 'translate(' + (k * 0.4) + 'px,0)' }, { transform: 'translate(0,0)' }],
              { duration: 120 + k * 25 });
  }
  function sfx(n) { if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(n); }

  // ---- Midnight Isle: who's out there (in place of the old sentinels) -------------------------------------------------
  var ROSTER = [
    ['sentinel', 19, 20], ['sentinel', 31, 16], ['sentinel', 29, 24],
    ['wight', 12, 22], ['wight', 15, 25], ['wight', 6, 24],
    ['wisp', 34, 28], ['wisp', 38, 28], ['wisp', 14, 12],
    ['hound', 38, 15], ['hound', 36, 14]
  ];
  var keyOut = false;
  function midnight(data) {
    keyOut = false;
    data.interactions = data.interactions.filter(function (i) { return i.type !== 'hostile'; });
    ROSTER.forEach(function (r) { if (data.collisions[r[2]] && data.collisions[r[2]][r[1]] === 0) spawn(data, r[0], r[1], r[2]); });
    if (save.day !== today() && data.collisions[21] && data.collisions[21][42] === 0) spawn(data, 'warden', 42, 21);
    data.interactions.forEach(function (i) {
      if (i.label === 'TOMB' && i.type === 'dialog') { i.type = 'midnight_tomb'; i.prompt = 'PRESS E TO LOOK'; }
    });
  }
  // the Crimson and Midnight seas' other fights (Workstream B2): who's out there as each place loads, each on the nearest
  // open ground to where it's listed (the crater on Cinder Key; drowned Saltmere and the ghost ship add theirs here)
  var ROSTERS = {
    'lumar-cinder-volcano': [['imp', 12, 14], ['imp', 32, 18], ['imp', 17, 27], ['imp', 30, 8], ['imp', 8, 18],
                             ['magma', 10, 22], ['magma', 33, 25], ['magma', 25, 8]],
    'lumar-saltmere': [['drowned', 8, 12], ['drowned', 10, 15], ['drowned', 37, 12], ['drowned', 35, 14], ['drowned', 25, 8]],
    'lumar-gloaming': [['spectre', 20, 6], ['spectre', 28, 9]]
  };
  function openNear(data, x, y) {
    for (var d = 0; d <= 3; d++) {
      for (var dy = -d; dy <= d; dy++) for (var dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        var row = data.collisions[y + dy];
        if (row && row[x + dx] === 0) return [x + dx, y + dy];
      }
    }
    return null;
  }
  function populate(data, list) {
    data.interactions = data.interactions.filter(function (i) { return i.type !== 'hostile'; });
    list.forEach(function (r) { var at = openNear(data, r[1], r[2]); if (at) spawn(data, r[0], at[0], at[1]); });
  }
  // the violet tomb: the drowned keep its key
  function tomb(inter) {
    var say = function (t) { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say('TOMB', t); };
    if (save.tomb) return say('THE TOMB STANDS OPEN, THE GRATE SWUNG BACK. THE VIOLET LIGHT HAS GONE OUT OF IT.\n\nCARVED ABOVE THE DOOR: "THEY LISTENED TOO."');
    if (BridgeInventory.getCount && BridgeInventory.getCount('tomb_key')) {
      BridgeInventory.removeItem('tomb_key', 1);
      var kept = BridgeInventory.addItem('veilpiercer', 1);
      if (kept === false) { BridgeInventory.addItem('tomb_key', 1); return say('THE KEY TURNS. INSIDE, ON A STONE SHELF, A NARROW BLADE - BUT YOUR PACK IS FULL. MAKE ROOM AND COME BACK.'); }
      save.tomb = true; store(); sfx('quest');
      return say('THE SHELL-SHAPED KEY TURNS IN THE GRATE, AND THE VIOLET LIGHT GOES OUT LIKE A HELD BREATH LET GO.\n\nON THE STONE SHELF: A NARROW BLADE OF BLACK GLASS, COLD AS THE SEA FLOOR. YOU TAKE THE VEILPIERCER.');
    }
    say('A SMALL STONE TOMB, ITS DOOR AJAR, VIOLET LIGHT INSIDE. BEYOND THE DOOR, A GRATE - LOCKED, THE LOCK SHAPED LIKE A SHELL.\n\nCARVED ABOVE THE DOOR: "THEY LISTENED TOO." THE DROWNED IN THE GRAVEYARD WILL HAVE THE KEY.');
  }

  // draw the creatures, their marked tiles, their bolts, on the Lumar islands (the mine draws its own: js/mine.js)
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) {
    BridgeWorld.registerSceneHooks('lumar', { ground: ground, items: sceneItems, over: over });
    BridgeWorld.registerSceneHooks('cave', { ground: ground, over: over });
  }

  // ---- blacking out ------------------------------------------------------------------------------------
  var fainting = false;
  function faint() {
    if (fainting) return;
    fainting = true;
    if (typeof BridgeControls !== 'undefined') BridgeControls.disable();
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx('fail');
    var veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;z-index:150;background:#000;opacity:0;transition:opacity 0.9s;display:flex;align-items:center;' +
      'justify-content:center;color:#d8d0c0;font:16px "Pixelify Sans",monospace;letter-spacing:3px;';
    veil.textContent = 'YOU BLACK OUT...';
    document.body.appendChild(veil);
    requestAnimationFrame(function () { veil.style.opacity = '1'; });
    var w = BridgeWorld.getWorld(), inMine = !!(w && w.mine), onMidnight = BridgeWorld.getWorldId() === 'lumar-midnight';
    var away = w && w.onFaint;                                    // a place that says where you come round (the Undercroft, js/dungeon.js)
    setTimeout(function () {
      var st = BridgeInventory.getStats();
      BridgeInventory.restoreHP(Math.ceil(st.maxHP / 2));
      BridgeInventory.restoreEnergy(Math.max(0, Math.ceil(st.maxEnergy / 3) - st.energy));
      var after = function () {
        veil.style.opacity = '0';
        setTimeout(function () { veil.remove(); fainting = false; if (typeof BridgeControls !== 'undefined') BridgeControls.enable(); }, 900);
        var who = away ? away.who : inMine ? 'HOB' : onMidnight ? 'MORWEN' : 'SOMEONE';
        var line = onMidnight ? 'YOU COME ROUND ON THE PIER, A BLANKET OVER YOU THAT SMELLS OF WOODSMOKE AND CAT.\n\n"THE STONES DON\'T LIKE VISITORS," SAYS A VOICE FROM THE MIST. "AND I DON\'T LIKE CARRYING THEM. WATCH THE GROUND - IT TELLS YOU WHERE THEY\'LL STRIKE."' : inMine ? 'YOU COME ROUND ON A CRATE IN THE HALL. HOB IS WATCHING YOU OVER HIS PIPE.\n\n"FOUND YOU ON THE LADDER. TAKE FOOD DOWN WITH YOU NEXT TIME, AND DON\'T FIGHT WHAT YOU CAN WALK AWAY FROM."'
                          : 'YOU COME ROUND, ACHING, WHERE YOU STARTED. WHATEVER IT WAS, IT LOST INTEREST IN YOU.';
        if (away) line = away.line;
        setTimeout(function () { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(who, line); }, 400);
      };
      if (away) BridgeWorld.enterWorld(away.world, away.spawn);
      else if (inMine) BridgeWorld.enterWorld('lumar-rose-mine', [12, 6]);
      else BridgeWorld.enterWorld(BridgeWorld.getWorldId(), null);
      setTimeout(after, 900);
    }, 1800);
  }

  // ---- where weapons are sold ------------------------------------------------------------------------------
  function decorate(worldId, data) {
    if (worldId === 'lumar-midnight') return midnight(data);
    if (ROSTERS[worldId]) return populate(data, ROSTERS[worldId]);
    if (worldId === 'lumar-midnight-tower' && !data.interactions.some(function (i) { return i.label === 'ARCANE CASE'; })) {
      data.interactions.push({ x: 9, y: 6, type: 'vendor', label: 'ARCANE CASE', prompt: 'PRESS E TO BROWSE',
        items: [{ id: 'rime_hatchet', price: 340 }, { id: 'emberbrand', price: 380 }, { id: 'moonglass_sabre', price: 460 }, { id: 'health_draught', price: 30 }] });
      return;
    }
    if (worldId !== 'lumar-smithy') return;
    (data.interactions || []).forEach(function (it) {
      if (it.type === 'vendor' && it.label === 'SMITHY' && it.items) {
        [['cutlass', 90], ['twin_fangs', 200], ['boarding_pike', 160], ['war_maul', 240], ['tidebreaker', 480]].forEach(function (w) {
          if (!it.items.some(function (x) { return x.id === w[0]; })) it.items.push({ id: w[0], price: w[1] });
        });
      }
    });
  }

  return { CREATURES: CREATURES, spawn: spawn, drawCreature: drawCreature, sceneItems: sceneItems, faint: faint, decorate: decorate,
           tick: tick, attackStart: attackStart, dangerAt: dangerAt, dangerCells: dangerCells, attackDamage: attackDamage, strikeFx: strikeFx,
           onHit: onHit, onKill: onKill, damageFor: damageFor, shake: shake, tomb: tomb, engage: engage, ground: ground, over: over, ROSTERS: ROSTERS, populate: populate,
           _save: function () { return save; } };
})();
