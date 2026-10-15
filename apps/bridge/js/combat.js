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
 *   BridgeCombat.spawn(world, 'mite', x, y)      // put a creature in a world
 *   BridgeCombat.drawCreature(ctx, h, px, py, ts, now)
 *   BridgeCombat.faint()                         // from BridgeInventory at 0 health
 */
var BridgeCombat = (function () {
  var CREATURES = {
    mite:   { label: 'ROCK MITE', hp: 30, damage: 4, move: 650, aggro: 5, windup: 380, reward: 3,
              drops: [{ id: 'stone', min: 1, max: 1, chance: 0.6 }, { id: 'iron_ore', min: 1, max: 1, chance: 0.25 }] },
    crab:   { label: 'CAVE CRAB', hp: 70, damage: 7, move: 1100, aggro: 5, windup: 520, reward: 6,
              drops: [{ id: 'sapphire_crystal', min: 1, max: 1, chance: 0.4 }, { id: 'silver_ore', min: 1, max: 2, chance: 0.4 }] },
    shade:  { label: 'SHADE', hp: 110, damage: 11, move: 800, aggro: 7, windup: 600, reward: 10,
              drops: [{ id: 'songstone', min: 1, max: 1, chance: 0.2 }, { id: 'moonstone', min: 1, max: 1, chance: 0.3 }] }
  };

  function spawn(world, kind, x, y) {
    var C = CREATURES[kind];
    var h = { x: x, y: y, type: 'hostile', label: C.label, creature: kind, maxHP: C.hp, _hp: C.hp, damage: C.damage,
              moveCooldown: C.move, aggroRange: C.aggro, windupMs: C.windup, strikeMs: 180, recoverMs: 650,
              reward: C.reward, drops: C.drops, _rx: x, _ry: y, seed: Math.random() * 100 };
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

  // draws one creature into ctx with its feet at (cx, footY), u = one 16th of a tile
  function drawCreature(ctx, h, cx, footY, ts, now) {
    var u = Math.max(1, Math.round(ts / 16)), t = now / 1000 + (h.seed || 0);
    var wind = h._attackPhase === 'winding', strike = h._attackPhase === 'striking';
    var eye = wind || strike ? '#ffffff' : null;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(footY));
    if (strike) ctx.translate(Math.round(((h._attackTarget ? h._attackTarget.x - h.x : 0)) * 3 * u), Math.round(((h._attackTarget ? h._attackTarget.y - h.y : 0)) * 3 * u));
    if (h.creature === 'mite') {
      var hop = Math.abs(Math.sin(t * 9)) * u * (wind ? 0 : 1);
      ctx.translate(0, -Math.round(hop));
      ctx.globalAlpha = 0.3; px(ctx, -5 * u, -1 * u + Math.round(hop), 10 * u, 1 * u, '#000'); ctx.globalAlpha = 1;
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
      ctx.globalAlpha = 0.3; px(ctx, -7 * u, -1 * u, 14 * u, 1 * u, '#000'); ctx.globalAlpha = 1;
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
      ctx.globalAlpha = 0.25; px(ctx, -5 * u, -1 * u, 10 * u, 1 * u, '#000');
      ctx.globalAlpha = wind ? 0.95 : 0.75;
      for (var r = 0; r < 14; r++) {                                               // a tattered wisp, wider at the hood
        var wv = Math.round(Math.sin(t * 5 + r * 0.6) * u);
        var half = r < 4 ? 3 + r : r < 10 ? 6 : 6 - (r - 9);
        px(ctx, (-half) * u + wv, (-18 + r) * u + bob, half * 2 * u, 1 * u, r < 3 ? '#4a2a7a' : r % 3 ? '#2a1a4a' : '#3a2266');
      }
      px(ctx, -3 * u, -14 * u + bob, 2 * u, 1 * u, eye || '#c090ff'); px(ctx, 1 * u, -14 * u + bob, 2 * u, 1 * u, eye || '#c090ff');
      ctx.globalAlpha = 1;
    }
    // health bar once it's been hurt
    if (h._hp < h.maxHP) {
      var w = 12 * u, f = Math.max(0, h._hp / h.maxHP);
      px(ctx, -w / 2, -21 * u, w, 2 * u, '#140a0a'); px(ctx, -w / 2, -21 * u, Math.round(w * f), 2 * u, f > 0.4 ? '#e8c040' : '#e84040');
    }
    ctx.restore();
  }

  // a scene world's items: every creature, depth-sorted with the characters
  var cv = null, lastT = 0;
  function sceneItems(world, offX, offY, ts, now, sc) {
    var dt = lastT ? Math.min(100, now - lastT) : 16; lastT = now;
    var out = [];
    (world.interactions || []).forEach(function (h) {
      if (h.type !== 'hostile' || !h.creature) return;
      glide(h, dt);
      var footRow = h._ry + 0.9;
      out.push({ footRow: footRow, draw: function (ctx) {
        var S = ts * 2;
        if (!cv) cv = document.createElement('canvas');
        if (cv.width !== S) { cv.width = S; cv.height = S; }
        var g = cv.getContext('2d');
        g.clearRect(0, 0, S, S);
        drawCreature(g, h, S / 2, S - ts * 0.15, ts, now);
        var dx = Math.round(offX + (h._rx + 0.5) * ts - S / 2), dy = Math.round(offY + (h._ry + 1) * ts - S + ts * 0.15 - ts * 0.1);
        if (sc && typeof BridgeScene !== 'undefined') BridgeScene.drawOccluded(ctx, sc, cv, 0, 0, S, S, dx, dy, footRow, offX, offY, null, null);
        else ctx.drawImage(cv, dx, dy);
      } });
    });
    return out;
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
    var w = BridgeWorld.getWorld(), inMine = !!(w && w.mine);
    setTimeout(function () {
      var st = BridgeInventory.getStats();
      BridgeInventory.restoreHP(Math.ceil(st.maxHP / 2));
      BridgeInventory.restoreEnergy(Math.max(0, Math.ceil(st.maxEnergy / 3) - st.energy));
      var after = function () {
        veil.style.opacity = '0';
        setTimeout(function () { veil.remove(); fainting = false; if (typeof BridgeControls !== 'undefined') BridgeControls.enable(); }, 900);
        var who = inMine ? 'HOB' : 'SOMEONE';
        var line = inMine ? 'YOU COME ROUND ON A CRATE IN THE HALL. HOB IS WATCHING YOU OVER HIS PIPE.\n\n"FOUND YOU ON THE LADDER. TAKE FOOD DOWN WITH YOU NEXT TIME, AND DON\'T FIGHT WHAT YOU CAN WALK AWAY FROM."'
                          : 'YOU COME ROUND, ACHING, WHERE YOU STARTED. WHATEVER IT WAS, IT LOST INTEREST IN YOU.';
        setTimeout(function () { if (typeof BridgeInteractions !== 'undefined') BridgeInteractions.say(who, line); }, 400);
      };
      if (inMine) BridgeWorld.enterWorld('lumar-rose-mine', [12, 6]);
      else BridgeWorld.enterWorld(BridgeWorld.getWorldId(), null);
      setTimeout(after, 900);
    }, 1800);
  }

  // ---- where weapons are sold ------------------------------------------------------------------------------
  function decorate(worldId, data) {
    if (worldId !== 'lumar-smithy') return;
    (data.interactions || []).forEach(function (it) {
      if (it.type === 'vendor' && it.label === 'SMITHY' && it.items && !it.items.some(function (x) { return x.id === 'cutlass'; })) {
        it.items.push({ id: 'cutlass', price: 90 });
      }
    });
  }

  return { CREATURES: CREATURES, spawn: spawn, drawCreature: drawCreature, sceneItems: sceneItems, faint: faint, decorate: decorate };
})();
