/**
 * BridgeItems — adventure-item registry for the personal inventory system.
 *
 * Items are consumable / utility goods bought at shops in places like
 * Lumar (food, drinks, potions, tools). Distinct from the BridgeCatalog
 * decor system which buys furniture for the Pilot's Quarters.
 *
 * Each item has:
 *   id        — short string key
 *   name      — display label
 *   desc      — short description for tooltips / panel
 *   type      — 'food' | 'drink' | 'potion' | 'tool' | 'key'
 *   stackable — true if multiple of the same id collapse into one slot
 *   onUse(inv)— optional callback when the player "uses" the item from inv.
 *               Receives the BridgeInventory instance. Return true to consume.
 *   draw(ctx, x, y, size) — renders a small canvas icon at (x, y) of given size.
 */
var BridgeItems = (function () {

  // ---- Icon helpers ---------------------------------------------------
  // Each draw fn renders into a (size × size) box at (x, y). size ≈ 24 px.

  function loaf(ctx, x, y, s) {
    var u = s / 16;
    // Outline
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 2*u, y + 4*u, 12*u, 9*u);
    // Bread body
    ctx.fillStyle = '#d8a050';
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 8*u);
    // Top highlight
    ctx.fillStyle = '#f8c870';
    ctx.fillRect(x + 3*u, y + 4*u, 10*u, 2*u);
    // Slash on top
    ctx.fillStyle = '#5a3018';
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, u);
    ctx.fillRect(x + 5*u, y + 9*u, 6*u, u);
  }

  function sweetRoll(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 3*u, y + 4*u, 10*u, 9*u);
    ctx.fillStyle = '#e0a060'; ctx.fillRect(x + 4*u, y + 4*u, 8*u, 8*u);
    ctx.fillStyle = '#ffc080'; ctx.fillRect(x + 4*u, y + 4*u, 8*u, 2*u);
    // Spiral icing
    ctx.fillStyle = '#fff0c0';
    ctx.fillRect(x + 6*u, y + 6*u, 4*u, u);
    ctx.fillRect(x + 6*u, y + 8*u, 4*u, u);
    ctx.fillRect(x + 6*u, y + 10*u, 4*u, u);
  }

  function seaBiscuit(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 4*u, y + 5*u, 8*u, 7*u);
    ctx.fillStyle = '#c08850'; ctx.fillRect(x + 4*u, y + 5*u, 8*u, 6*u);
    ctx.fillStyle = '#e0a870'; ctx.fillRect(x + 4*u, y + 5*u, 8*u, u);
    // Pock-marks
    ctx.fillStyle = '#5a3018';
    ctx.fillRect(x + 6*u, y + 7*u, u, u);
    ctx.fillRect(x + 9*u, y + 8*u, u, u);
    ctx.fillRect(x + 7*u, y + 10*u, u, u);
  }

  function bottle(ctx, x, y, s, body, hi) {
    var u = s / 16;
    // Cork
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 7*u, y + 2*u, 2*u, 2*u);
    // Neck
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 6*u, y + 4*u, 4*u, 2*u);
    ctx.fillStyle = body; ctx.fillRect(x + 7*u, y + 4*u, 2*u, 2*u);
    // Body
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 4*u, y + 6*u, 8*u, 8*u);
    ctx.fillStyle = body; ctx.fillRect(x + 5*u, y + 6*u, 6*u, 7*u);
    // Liquid highlight
    ctx.fillStyle = hi; ctx.fillRect(x + 5*u, y + 7*u, 2*u, 4*u);
  }
  function healthDraught(ctx, x, y, s) { bottle(ctx, x, y, s, '#c83040', '#f06080'); }
  function antidote(ctx, x, y, s) { bottle(ctx, x, y, s, '#3aa040', '#60d070'); }

  function mug(ctx, x, y, s) {
    var u = s / 16;
    // Handle
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(x + 11*u, y + 6*u, 3*u, u);
    ctx.fillRect(x + 13*u, y + 6*u, u, 5*u);
    ctx.fillRect(x + 11*u, y + 10*u, 3*u, u);
    // Mug body
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 3*u, y + 5*u, 9*u, 9*u);
    ctx.fillStyle = '#7a4a20'; ctx.fillRect(x + 4*u, y + 5*u, 7*u, 8*u);
    ctx.fillStyle = '#a06830'; ctx.fillRect(x + 4*u, y + 5*u, 7*u, u);
    // Foam
    ctx.fillStyle = '#f8e8c0'; ctx.fillRect(x + 4*u, y + 4*u, 7*u, u);
    ctx.fillStyle = '#fff8e0'; ctx.fillRect(x + 4*u, y + 4*u, 7*u, 1);
  }

  function stewBowl(ctx, x, y, s) {
    var u = s / 16;
    // Bowl
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 2*u, y + 7*u, 12*u, 6*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2*u, y + 7*u, 12*u, u);
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x + 3*u, y + 9*u, 10*u, 4*u);
    // Stew
    ctx.fillStyle = '#a04040'; ctx.fillRect(x + 3*u, y + 7*u, 10*u, 2*u);
    ctx.fillStyle = '#c86040'; ctx.fillRect(x + 4*u, y + 7*u, 8*u, u);
    // Steam
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x + 5*u, y + 4*u, u, u);
    ctx.fillRect(x + 7*u, y + 3*u, u, u);
    ctx.fillRect(x + 10*u, y + 4*u, u, u);
  }

  function fish(ctx, x, y, s) {
    var u = s / 16;
    // Body
    ctx.fillStyle = '#1a3040';
    ctx.fillRect(x + 4*u, y + 7*u, 8*u, 4*u);
    ctx.fillRect(x + 5*u, y + 6*u, 6*u, u);
    ctx.fillRect(x + 5*u, y + 11*u, 6*u, u);
    // Belly
    ctx.fillStyle = '#5a8090';
    ctx.fillRect(x + 5*u, y + 8*u, 6*u, 2*u);
    // Eye
    ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + 10*u, y + 8*u, u, u);
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 10*u, y + 8*u, 1, 1);
    // Tail
    ctx.fillStyle = '#1a3040';
    ctx.fillRect(x + 2*u, y + 7*u, 2*u, 4*u);
    ctx.fillRect(x + u, y + 6*u, u, u);
    ctx.fillRect(x + u, y + 11*u, u, u);
    // Fin
    ctx.fillRect(x + 7*u, y + 5*u, 2*u, u);
  }

  function dagger(ctx, x, y, s) {
    var u = s / 16;
    // Blade (tall triangle)
    ctx.fillStyle = '#0a0608'; ctx.fillRect(x + 7*u, y + u, 2*u, 9*u);
    ctx.fillStyle = '#a0a8b0'; ctx.fillRect(x + 7*u, y + 2*u, 2*u, 8*u);
    ctx.fillStyle = '#e0e8f0'; ctx.fillRect(x + 7*u, y + 2*u, u, 8*u);
    // Cross-guard
    ctx.fillStyle = '#a08040'; ctx.fillRect(x + 5*u, y + 10*u, 6*u, u);
    // Handle
    ctx.fillStyle = '#3a2410'; ctx.fillRect(x + 7*u, y + 11*u, 2*u, 4*u);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 7*u, y + 11*u, u, 4*u);
    // Pommel
    ctx.fillStyle = '#a08040'; ctx.fillRect(x + 6*u, y + 14*u, 4*u, u);
  }

  function stoneShard(ctx, x, y, s) {
    var u = s / 16;
    // Jagged dark crystal — matches the sentinel palette (stone + amethyst).
    var DARK = '#08080a';
    var SH   = '#181820';
    var MID  = '#2a2a30';
    var HI   = '#3e3e44';
    var GLEAM = '#c060e0';
    // Outline silhouette (rough diamond, biased asymmetric)
    ctx.fillStyle = DARK;
    ctx.fillRect(x + 7*u,  y + 2*u, 2*u, 1*u);
    ctx.fillRect(x + 6*u,  y + 3*u, 4*u, 1*u);
    ctx.fillRect(x + 5*u,  y + 4*u, 7*u, 6*u);
    ctx.fillRect(x + 6*u,  y + 10*u, 5*u, 2*u);
    ctx.fillRect(x + 7*u,  y + 12*u, 3*u, 1*u);
    // Body
    ctx.fillStyle = MID;
    ctx.fillRect(x + 6*u,  y + 4*u, 5*u, 5*u);
    ctx.fillRect(x + 7*u,  y + 9*u, 3*u, 2*u);
    // Top-left highlight (light catches there)
    ctx.fillStyle = HI;
    ctx.fillRect(x + 6*u,  y + 4*u, 3*u, 1*u);
    ctx.fillRect(x + 6*u,  y + 5*u, 1*u, 3*u);
    // Bottom shadow band
    ctx.fillStyle = SH;
    ctx.fillRect(x + 7*u,  y + 10*u, 3*u, 1*u);
    // Amethyst gleam in the center — the "you killed a sentinel" memento
    ctx.fillStyle = GLEAM;
    ctx.fillRect(x + 8*u,  y + 6*u, 1*u, 2*u);
  }

  function lockpick(ctx, x, y, s) {
    var u = s / 16;
    // L-shaped lockpick
    ctx.fillStyle = '#a0a8b0';
    ctx.fillRect(x + 5*u, y + 4*u, u, 9*u);
    ctx.fillRect(x + 5*u, y + 12*u, 6*u, u);
    ctx.fillStyle = '#e0e8f0';
    ctx.fillRect(x + 5*u, y + 4*u, 1, 9*u);
    // Tension wrench (small, diagonal)
    ctx.fillStyle = '#a0a8b0';
    ctx.fillRect(x + 8*u, y + 4*u, u, 5*u);
    ctx.fillRect(x + 8*u, y + 8*u, 3*u, u);
    // Outline
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(x + 4*u, y + 13*u, 8*u, u);
  }

  // ---- Shared onUse for any item whose effects field is HP/energy. The
  // function uses `this` to read effects so each entry shares the same
  // reference — keep behavior and the inventory-detail display in sync.
  function consumableUse(inv) {
    if (!this.effects) return false;
    if (this.effects.hp)     inv.restoreHP(this.effects.hp);
    if (this.effects.energy) inv.restoreEnergy(this.effects.energy);
    if (typeof BridgeFX !== 'undefined' && typeof BridgeCharacter !== 'undefined') {
      var px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
      if (this.effects.hp && BridgeFX.spawnFloatingText) {
        BridgeFX.spawnFloatingText(px, py - 0.25, '+' + this.effects.hp + ' HP', '#68e890');
      } else if (this.effects.energy && BridgeFX.spawnFloatingText) {
        BridgeFX.spawnFloatingText(px, py - 0.25, '+' + this.effects.energy + ' EN', '#60c8ff');
      }
      if (BridgeFX.spawnSparks) {
        BridgeFX.spawnSparks(px, py, this.effects.hp ? '#68e890' : '#60c8ff', 5);
      }
    }
    return true;
  }

  // Weapon onUse — look for a hostile interaction at the tile the player
  // is facing and deal `damage` to it. If the hostile reaches 0 HP, run
  // BridgeInteractions.killHostile to drop loot and clear the tile.
  // Returns false so the weapon itself doesn't get consumed. The swing
  // arc plays even on a whiff so the player gets feedback every press.
  var lastSwing = 0;
  function weaponUse(inv) {
    if (typeof BridgeWorld === 'undefined' || typeof BridgeCharacter === 'undefined') return false;
    if (typeof BridgeInteractions === 'undefined') return false;
    var world = BridgeWorld.getWorld();
    if (!world) return false;
    var now = performance.now();
    if (now - lastSwing < 260) return false;            // one swing at a time
    lastSwing = now;
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    var facing = BridgeCharacter.getFacing();
    // Always play the swing arc — this is the per-press visual feedback.
    if (typeof BridgeFX !== 'undefined') BridgeFX.spawnSlash(px, py, facing);

    var dx = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
    var dy = facing === 'down' ? 1 : facing === 'up' ? -1 : 0;
    var tx = px + dx, ty = py + dy;
    // the tile you face; a wide blade (arc) cuts the tiles either side of it too
    var cells = [[tx, ty]];
    if (this.arc) cells.push([tx + dy, ty + dx], [tx - dy, ty - dx]);
    var targets = world.interactions.filter(function (it) {
      return it.type === 'hostile' && cells.some(function (c) { return c[0] === it.x && c[1] === it.y; });
    });
    if (typeof BridgeAudio !== 'undefined') BridgeAudio.sfx(targets.length ? 'hit' : 'swish');
    var self = this;
    targets.forEach(function (t) { strike(world, t, self.damage || 1); });
    return false; // weapons are not consumed
  }

  function strike(world, target, dmg) {
    if (typeof target._hp !== 'number') target._hp = target.maxHP || 50;
    target._hp -= dmg;
    target._hitAt = performance.now();
    // Hit-flash, sparks, and floating damage number on the target.
    if (typeof BridgeFX !== 'undefined') {
      BridgeFX.spawnHitFlash(target.x, target.y);
      if (BridgeFX.spawnSparks) BridgeFX.spawnSparks(target.x, target.y, '#c868f0', 7);
      if (BridgeFX.spawnFloatingText) BridgeFX.spawnFloatingText(target.x, target.y - 0.3, '-' + dmg, '#ffe080');
    }
    if (target._hp <= 0) {
      if (typeof BridgeFX !== 'undefined' && BridgeFX.spawnSparks) {
        BridgeFX.spawnSparks(target.x, target.y, '#ff90e8', 10);
      }
      BridgeInteractions.killHostile(world, target);
    }
  }

  // A pickaxe: break the rock you face (js/mine.js); with nothing to dig, it's a weapon of sorts.
  function pickUse(inv) {
    var world = typeof BridgeWorld !== 'undefined' && BridgeWorld.getWorld();
    if (world && typeof BridgeCharacter !== 'undefined' && typeof BridgeMine !== 'undefined') {
      var f = BridgeCharacter.getFacing(), x = BridgeCharacter.getX() + (f === 'right' ? 1 : f === 'left' ? -1 : 0),
          y = BridgeCharacter.getY() + (f === 'down' ? 1 : f === 'up' ? -1 : 0);
      var rock = world.interactions.filter(function (it) { return it.type === 'rock' && it.x === x && it.y === y; })[0];
      if (rock) { BridgeMine.use(rock); return false; }
    }
    return weaponUse.call(this, inv);
  }

  // ---- Display helpers ------------------------------------------------
  // Short effects line for the inventory detail panel.
  function effectsText(item) {
    if (!item) return '';
    var parts = [];
    if (item.effects) {
      if (item.effects.hp)     parts.push('+' + item.effects.hp + ' HP');
      if (item.effects.energy) parts.push('+' + item.effects.energy + ' EN');
    }
    if (typeof item.damage === 'number') {
      parts.push(item.damage + ' DMG');
    }
    return parts.join(' · ');
  }

  // Color for the type badge in the inventory detail panel.
  function typeColor(type) {
    switch (type) {
      case 'food':   return '#d8a050';
      case 'drink':  return '#a06830';
      case 'potion': return '#c83040';
      case 'weapon': return '#a04040';
      case 'tool':   return '#a0a8b0';
      case 'map':    return '#d6c49c';
      case 'key':    return '#e0c060';
      case 'seed':   return '#90c060';
      default:       return '#888';
    }
  }

  // A spore crystal: a tall shard and two small ones, in its island's colour.
  function crystalIcon(dark, mid, hi) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      ctx.fillStyle = '#0a0810';
      ctx.fillRect(x + 6*u, y + 2*u, 4*u, 12*u); ctx.fillRect(x + 3*u, y + 8*u, 3*u, 6*u); ctx.fillRect(x + 10*u, y + 7*u, 3*u, 7*u);
      ctx.fillStyle = dark;
      ctx.fillRect(x + 7*u, y + 3*u, 2*u, 10*u); ctx.fillRect(x + 4*u, y + 9*u, 2*u, 4*u); ctx.fillRect(x + 10*u, y + 8*u, 2*u, 5*u);
      ctx.fillStyle = mid;
      ctx.fillRect(x + 7*u, y + 4*u, 1*u, 8*u); ctx.fillRect(x + 4*u, y + 10*u, 1*u, 3*u); ctx.fillRect(x + 10*u, y + 9*u, 1*u, 3*u);
      ctx.fillStyle = hi;
      ctx.fillRect(x + 7*u, y + 3*u, 1*u, 2*u); ctx.fillRect(x + 4*u, y + 9*u, 1*u, 1*u);
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(x + 3*u, y + 13*u, 10*u, 1*u);
    };
  }

  // The Rose Mine (js/mine.js): stone, ore in its rock, gems, pickaxes.
  function rockIcon(rock, fleck, hi) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      ctx.fillStyle = '#0c0a0a';
      ctx.fillRect(x + 3*u, y + 6*u, 10*u, 7*u); ctx.fillRect(x + 5*u, y + 4*u, 6*u, 2*u);
      ctx.fillStyle = rock;
      ctx.fillRect(x + 4*u, y + 6*u, 8*u, 6*u); ctx.fillRect(x + 6*u, y + 5*u, 4*u, 1*u);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 5*u, y + 6*u, 3*u, 1*u);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 4*u, y + 11*u, 8*u, 1*u);
      if (fleck) {
        ctx.fillStyle = fleck;
        ctx.fillRect(x + 5*u, y + 8*u, 1*u, 1*u); ctx.fillRect(x + 8*u, y + 7*u, 2*u, 1*u); ctx.fillRect(x + 10*u, y + 10*u, 1*u, 1*u);
        ctx.fillRect(x + 7*u, y + 10*u, 1*u, 1*u);
      }
      if (hi) { ctx.fillStyle = hi; ctx.fillRect(x + 8*u, y + 7*u, 1*u, 1*u); ctx.fillRect(x + 5*u, y + 8*u, 1*u, 1*u); }
    };
  }

  function bladeIcon(steel, hilt, curved, glint) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      ctx.fillStyle = '#0a0a0c';
      for (var i = 0; i < 10; i++) ctx.fillRect(x + (3 + i)*u, y + (12 - i - (curved && i > 6 ? 1 : 0))*u, 2*u, 2*u);
      ctx.fillStyle = steel;
      for (var j = 0; j < 9; j++) ctx.fillRect(x + (4 + j)*u, y + (12 - j - (curved && j > 6 ? 1 : 0))*u, 1*u, 1*u);
      if (glint) { ctx.fillStyle = glint; ctx.fillRect(x + 9*u, y + 5*u, 1*u, 1*u); ctx.fillRect(x + 11*u, y + 3*u, 1*u, 1*u); }
      ctx.fillStyle = '#0a0a0c'; ctx.fillRect(x + 1*u, y + 11*u, 5*u, 3*u);
      ctx.fillStyle = hilt; ctx.fillRect(x + 2*u, y + 12*u, 3*u, 1*u); ctx.fillRect(x + 3*u, y + 11*u, 1*u, 3*u);
    };
  }

  function mapIcon(ctx, x, y, s) {                // a folded parchment with a red X
    var u = s / 16;
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(x + 2*u, y + 3*u, 12*u, 11*u);
    ctx.fillStyle = '#d6c49c'; ctx.fillRect(x + 3*u, y + 4*u, 10*u, 9*u);
    ctx.fillStyle = '#b8a47a'; ctx.fillRect(x + 6*u, y + 4*u, 1*u, 9*u); ctx.fillRect(x + 9*u, y + 4*u, 1*u, 9*u);
    ctx.fillStyle = '#8a7048'; ctx.fillRect(x + 4*u, y + 6*u, 2*u, 1*u); ctx.fillRect(x + 4*u, y + 10*u, 3*u, 1*u); ctx.fillRect(x + 10*u, y + 11*u, 2*u, 1*u);
    ctx.fillStyle = '#a01c14';
    ctx.fillRect(x + 10*u, y + 6*u, 1*u, 1*u); ctx.fillRect(x + 12*u, y + 6*u, 1*u, 1*u); ctx.fillRect(x + 11*u, y + 7*u, 1*u, 1*u);
    ctx.fillRect(x + 10*u, y + 8*u, 1*u, 1*u); ctx.fillRect(x + 12*u, y + 8*u, 1*u, 1*u);
  }

  function moonstoneIcon(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#0c0a14'; ctx.fillRect(x + 4*u, y + 4*u, 8*u, 9*u); ctx.fillRect(x + 3*u, y + 6*u, 10*u, 5*u);
    ctx.fillStyle = '#a8a8c8'; ctx.fillRect(x + 4*u, y + 6*u, 8*u, 5*u); ctx.fillRect(x + 5*u, y + 5*u, 6*u, 7*u);
    ctx.fillStyle = '#e8e8ff'; ctx.fillRect(x + 6*u, y + 6*u, 3*u, 2*u);
    ctx.fillStyle = '#c8d0ff'; ctx.fillRect(x + 9*u, y + 9*u, 2*u, 2*u);
  }

  function pickaxeIcon(head, hi) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      ctx.fillStyle = '#1a1008';
      for (var i = 0; i < 9; i++) ctx.fillRect(x + (4 + i)*u, y + (13 - i)*u, 2*u, 2*u);     // the haft, corner to corner
      ctx.fillStyle = '#8a5a30';
      for (var j = 0; j < 8; j++) ctx.fillRect(x + (5 + j)*u, y + (13 - j)*u, 1*u, 1*u);
      ctx.fillStyle = '#0a0a0c';                                                              // the head across the top
      ctx.fillRect(x + 6*u, y + 2*u, 9*u, 3*u); ctx.fillRect(x + 4*u, y + 4*u, 3*u, 3*u); ctx.fillRect(x + 13*u, y + 4*u, 2*u, 3*u);
      ctx.fillStyle = head;
      ctx.fillRect(x + 7*u, y + 3*u, 7*u, 1*u); ctx.fillRect(x + 5*u, y + 5*u, 2*u, 1*u); ctx.fillRect(x + 13*u, y + 4*u, 1*u, 2*u);
      ctx.fillStyle = hi; ctx.fillRect(x + 8*u, y + 3*u, 3*u, 1*u);
    };
  }

  function seaGlass(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#0a1a14'; ctx.fillRect(x + 4*u, y + 5*u, 8*u, 7*u);
    ctx.fillStyle = '#4aa880'; ctx.fillRect(x + 5*u, y + 6*u, 6*u, 5*u);
    ctx.fillStyle = '#90e0b8'; ctx.fillRect(x + 6*u, y + 6*u, 3*u, 2*u);
    ctx.fillStyle = '#2a7858'; ctx.fillRect(x + 9*u, y + 9*u, 2*u, 2*u);
  }

  function silverNail(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#1a1a20'; ctx.fillRect(x + 4*u, y + 3*u, 8*u, 3*u); ctx.fillRect(x + 7*u, y + 5*u, 2*u, 9*u);
    ctx.fillStyle = '#c8ccd8'; ctx.fillRect(x + 5*u, y + 4*u, 6*u, 1*u); ctx.fillRect(x + 7*u, y + 6*u, 1*u, 7*u);
    ctx.fillStyle = '#f0f4ff'; ctx.fillRect(x + 5*u, y + 4*u, 2*u, 1*u);
  }

  // A fish in profile, in its own colours (the catch from js/fishing.js).
  function fishIcon(body, belly, fin, glow) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      ctx.fillStyle = '#0a0810';
      ctx.fillRect(x + 3*u, y + 5*u, 10*u, 6*u); ctx.fillRect(x + 1*u, y + 4*u, 3*u, 8*u);
      ctx.fillStyle = body;
      ctx.fillRect(x + 4*u, y + 6*u, 8*u, 4*u); ctx.fillRect(x + 5*u, y + 5*u, 6*u, 1*u); ctx.fillRect(x + 2*u, y + 5*u, 2*u, 6*u);
      ctx.fillStyle = belly;
      ctx.fillRect(x + 5*u, y + 8*u, 6*u, 2*u);
      ctx.fillStyle = fin;
      ctx.fillRect(x + 7*u, y + 4*u, 3*u, 1*u); ctx.fillRect(x + 7*u, y + 10*u, 2*u, 1*u);
      ctx.fillStyle = '#f8f0d0'; ctx.fillRect(x + 10*u, y + 7*u, 1*u, 1*u);
      if (glow) { ctx.fillStyle = glow; ctx.fillRect(x + 6*u, y + 6*u, 1*u, 1*u); ctx.fillRect(x + 8*u, y + 7*u, 1*u, 1*u); ctx.fillRect(x + 3*u, y + 7*u, 1*u, 1*u); }
    };
  }

  function crabIcon(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#0a0810'; ctx.fillRect(x + 4*u, y + 6*u, 8*u, 6*u); ctx.fillRect(x + 2*u, y + 4*u, 3*u, 3*u); ctx.fillRect(x + 11*u, y + 4*u, 3*u, 3*u);
    ctx.fillStyle = '#c84a2a'; ctx.fillRect(x + 5*u, y + 7*u, 6*u, 4*u); ctx.fillRect(x + 3*u, y + 5*u, 1*u, 1*u); ctx.fillRect(x + 12*u, y + 5*u, 1*u, 1*u);
    ctx.fillStyle = '#e87a4a'; ctx.fillRect(x + 6*u, y + 7*u, 3*u, 1*u);
    ctx.fillStyle = '#8a2a1a'; for (var i = 0; i < 3; i++) { ctx.fillRect(x + (4 + i*3)*u, y + 11*u, 1*u, 2*u); }
  }

  function bootIcon(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#0a0810'; ctx.fillRect(x + 4*u, y + 2*u, 5*u, 11*u); ctx.fillRect(x + 4*u, y + 9*u, 9*u, 4*u);
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x + 5*u, y + 3*u, 3*u, 9*u); ctx.fillRect(x + 5*u, y + 10*u, 7*u, 2*u);
    ctx.fillStyle = '#3e6a4a'; ctx.fillRect(x + 6*u, y + 5*u, 1*u, 2*u); ctx.fillRect(x + 9*u, y + 10*u, 2*u, 1*u);
  }

  function coinIcon(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#0a0810'; ctx.fillRect(x + 4*u, y + 4*u, 8*u, 8*u);
    ctx.fillStyle = '#c8ccd8'; ctx.fillRect(x + 5*u, y + 5*u, 6*u, 6*u);
    ctx.fillStyle = '#f0f4ff'; ctx.fillRect(x + 5*u, y + 5*u, 2*u, 2*u);
    ctx.fillStyle = '#7a7e8a'; ctx.fillRect(x + 7*u, y + 7*u, 2*u, 2*u);
  }

  // ---- the farm on Verdance (js/farm.js) ----------------------------------
  function px(ctx, x, y, u, c, rects) {           // rects: [gx, gy, gw, gh] on a 16-grid
    ctx.fillStyle = c;
    for (var i = 0; i < rects.length; i++) ctx.fillRect(x + rects[i][0] * u, y + rects[i][1] * u, rects[i][2] * u, rects[i][3] * u);
  }
  function hoeIcon(ctx, x, y, s) {
    var u = s / 16;
    for (var i = 0; i < 10; i++) px(ctx, x, y, u, i % 3 ? '#8a5a30' : '#6a4020', [[3 + i, 13 - i, 1, 1], [4 + i, 13 - i, 1, 1]]);
    px(ctx, x, y, u, '#3a3a44', [[11, 1, 4, 2], [13, 3, 2, 3]]);
    px(ctx, x, y, u, '#a8a8b8', [[11, 1, 3, 1], [13, 3, 1, 2]]);
  }
  function canIcon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#1a3a2a', [[3, 6, 8, 8], [11, 7, 3, 1], [13, 5, 2, 2]]);
    px(ctx, x, y, u, '#3a8a5a', [[4, 7, 6, 6], [11, 8, 2, 1], [13, 6, 1, 1]]);
    px(ctx, x, y, u, '#70c088', [[4, 7, 2, 4]]);
    px(ctx, x, y, u, '#1a3a2a', [[5, 3, 4, 1], [4, 4, 1, 2], [9, 4, 1, 2]]);
    px(ctx, x, y, u, '#80d0f0', [[14, 4, 1, 1], [15, 6, 1, 1]]);
  }
  var SEED_ART = {
    turnip: function (ctx, x, y, u) { px(ctx, x, y, u, '#f0e8f0', [[6, 8, 4, 3]]); px(ctx, x, y, u, '#a050a0', [[6, 8, 4, 1]]); px(ctx, x, y, u, '#50a040', [[7, 6, 2, 2]]); },
    carrot: function (ctx, x, y, u) { px(ctx, x, y, u, '#f08020', [[6, 7, 4, 2], [7, 9, 2, 2]]); px(ctx, x, y, u, '#50a040', [[7, 5, 2, 2]]); },
    strawberry: function (ctx, x, y, u) { px(ctx, x, y, u, '#e03040', [[6, 7, 4, 3], [7, 10, 2, 1]]); px(ctx, x, y, u, '#50a040', [[7, 6, 2, 1]]); px(ctx, x, y, u, '#ffe080', [[7, 8, 1, 1]]); },
    sunflower: function (ctx, x, y, u) { px(ctx, x, y, u, '#f0c020', [[6, 6, 4, 4]]); px(ctx, x, y, u, '#6a3a1a', [[7, 7, 2, 2]]); },
    pumpkin: function (ctx, x, y, u) { px(ctx, x, y, u, '#e07020', [[5, 7, 6, 4]]); px(ctx, x, y, u, '#b05010', [[7, 7, 1, 4], [9, 7, 1, 4]]); px(ctx, x, y, u, '#50a040', [[8, 6, 1, 1]]); },
    starfruit: function (ctx, x, y, u) { px(ctx, x, y, u, '#ffe040', [[7, 5, 2, 6], [5, 7, 6, 2], [6, 6, 4, 4]]); px(ctx, x, y, u, '#fff8b0', [[7, 7, 1, 1]]); }
  };
  function seedIcon(kind, paper) {
    return function (ctx, x, y, s) {
      var u = s / 16;
      px(ctx, x, y, u, '#3a2a1a', [[3, 2, 10, 13]]);
      px(ctx, x, y, u, paper, [[4, 3, 8, 11]]);
      px(ctx, x, y, u, 'rgba(255,255,255,0.35)', [[4, 3, 8, 2]]);
      SEED_ART[kind](ctx, x, y, u);
      px(ctx, x, y, u, '#6a5a3a', [[5, 12, 1, 1], [7, 12, 1, 1], [9, 12, 1, 1]]);
    };
  }
  var PRODUCE_ART = {
    turnip: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#2a4a1a', [[5, 1, 2, 5], [9, 1, 2, 5], [7, 2, 2, 4]]); px(ctx, x, y, u, '#60b040', [[5, 2, 1, 3], [10, 2, 1, 3], [7, 3, 2, 3]]);
      px(ctx, x, y, u, '#3a2030', [[3, 6, 10, 7], [6, 13, 4, 1]]); px(ctx, x, y, u, '#f4ecf4', [[4, 8, 8, 4], [7, 12, 2, 1]]);
      px(ctx, x, y, u, '#b060b0', [[4, 6, 8, 2]]); px(ctx, x, y, u, '#ffffff', [[5, 9, 1, 2]]);
    },
    carrot: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#60b040', [[9, 1, 2, 4], [11, 2, 2, 3]]);
      px(ctx, x, y, u, '#5a2a0a', [[4, 4, 8, 4], [3, 8, 7, 3], [2, 11, 5, 2], [1, 13, 3, 2]]);
      px(ctx, x, y, u, '#f08020', [[5, 5, 6, 3], [4, 8, 5, 2], [3, 11, 3, 1], [2, 13, 1, 1]]);
      px(ctx, x, y, u, '#c05a10', [[7, 6, 2, 1], [5, 9, 2, 1]]);
    },
    strawberry: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#4a0a14', [[3, 4, 10, 6], [4, 10, 8, 2], [6, 12, 4, 2]]);
      px(ctx, x, y, u, '#e02a3a', [[4, 5, 8, 5], [5, 10, 6, 2], [7, 12, 2, 1]]);
      px(ctx, x, y, u, '#ffd860', [[5, 6, 1, 1], [8, 7, 1, 1], [10, 6, 1, 1], [6, 9, 1, 1], [9, 10, 1, 1]]);
      px(ctx, x, y, u, '#50a040', [[5, 3, 6, 2], [7, 1, 2, 2]]);
    },
    sunflower: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#3a6a20', [[7, 10, 2, 6]]);
      px(ctx, x, y, u, '#a07010', [[3, 2, 10, 9]]);
      px(ctx, x, y, u, '#f8c820', [[4, 2, 8, 9], [3, 4, 10, 5]]);
      px(ctx, x, y, u, '#5a2a10', [[6, 4, 4, 5]]); px(ctx, x, y, u, '#8a4a1a', [[7, 5, 1, 1], [8, 7, 1, 1]]);
    },
    pumpkin: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#5a2a08', [[2, 5, 12, 9]]);
      px(ctx, x, y, u, '#f08a20', [[3, 6, 10, 7]]);
      px(ctx, x, y, u, '#c06010', [[5, 6, 1, 7], [8, 6, 1, 7], [11, 6, 1, 7]]);
      px(ctx, x, y, u, '#ffb050', [[4, 7, 1, 3]]);
      px(ctx, x, y, u, '#4a7a20', [[7, 3, 2, 3]]);
    },
    starfruit: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#8a6a00', [[7, 1, 2, 14], [1, 6, 14, 3], [3, 3, 10, 9], [4, 12, 3, 2], [9, 12, 3, 2]]);
      px(ctx, x, y, u, '#ffe040', [[7, 2, 2, 12], [2, 7, 12, 1], [4, 4, 8, 7], [5, 11, 2, 2], [9, 11, 2, 2]]);
      px(ctx, x, y, u, '#fff8b8', [[6, 5, 2, 2], [7, 2, 1, 2]]);
    },
    apple: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#4a0a10', [[3, 4, 10, 10]]); px(ctx, x, y, u, '#d02a30', [[4, 5, 8, 8]]);
      px(ctx, x, y, u, '#ff8080', [[5, 6, 2, 2]]); px(ctx, x, y, u, '#5a3a1a', [[8, 2, 1, 3]]); px(ctx, x, y, u, '#50a040', [[9, 2, 3, 2]]);
    },
    honey: function (ctx, x, y, u) {
      px(ctx, x, y, u, '#5a3a10', [[4, 2, 8, 3]]); px(ctx, x, y, u, '#c09060', [[4, 3, 8, 1]]);
      px(ctx, x, y, u, '#4a2a08', [[3, 5, 10, 9]]); px(ctx, x, y, u, '#f0a820', [[4, 6, 8, 7]]);
      px(ctx, x, y, u, '#ffe080', [[5, 7, 2, 4]]); px(ctx, x, y, u, '#f4ead2', [[6, 9, 4, 2]]);
    }
  };
  function produceIcon(kind) { return function (ctx, x, y, s) { PRODUCE_ART[kind](ctx, x, y, s / 16); }; }
  function farmUse() { if (typeof BridgeFarm !== 'undefined') BridgeFarm.useItem(this.id); return false; }

  // ---- Hoarfell (js/climb.js, js/ski.js, js/worlds/hoarfell.js) ----------------------------------------
  function chalkIcon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#3a2a1a', [[4, 4, 8, 10]]); px(ctx, x, y, u, '#c83a2e', [[5, 5, 6, 8]]);
    px(ctx, x, y, u, '#f4f4f8', [[5, 3, 6, 2], [6, 2, 4, 1]]); px(ctx, x, y, u, '#e8a030', [[5, 9, 6, 1]]);
  }
  function ropeIcon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#5a3a1a', [[3, 4, 10, 9]]); px(ctx, x, y, u, '#e0b030', [[4, 5, 8, 7]]);
    px(ctx, x, y, u, '#5a3a1a', [[6, 7, 4, 3]]); px(ctx, x, y, u, '#f0d060', [[4, 5, 3, 1], [9, 11, 3, 1]]);
    px(ctx, x, y, u, '#e0b030', [[12, 10, 2, 4]]);
  }
  function axeIcon(ctx, x, y, s) {
    var u = s / 16;
    for (var i = 0; i < 10; i++) px(ctx, x, y, u, '#3a8ae0', [[3 + i, 14 - i, 2, 1]]);
    px(ctx, x, y, u, '#2a2c34', [[9, 1, 6, 2], [13, 3, 2, 2], [8, 3, 2, 1]]); px(ctx, x, y, u, '#c0c4cc', [[9, 1, 5, 1]]);
  }
  function skisIcon(ctx, x, y, s) {
    var u = s / 16;
    for (var i = 0; i < 12; i++) { px(ctx, x, y, u, '#c83a2e', [[2 + i, 13 - i, 2, 1]]); px(ctx, x, y, u, '#2a6ac0', [[5 + i, 14 - i, 2, 1]]); }
    px(ctx, x, y, u, '#f4f4f8', [[13, 1, 2, 1]]);
  }
  function gogglesIcon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#1a1a22', [[1, 7, 14, 2]]); px(ctx, x, y, u, '#1a1a22', [[3, 5, 10, 6]]);
    px(ctx, x, y, u, '#e8a030', [[4, 6, 8, 4]]); px(ctx, x, y, u, '#ffe080', [[4, 6, 3, 1]]); px(ctx, x, y, u, '#c87020', [[7, 6, 2, 4]]);
  }
  function cocoaIcon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#4a1a14', [[3, 6, 9, 8], [12, 8, 2, 4]]); px(ctx, x, y, u, '#c83a2e', [[4, 7, 7, 6]]);
    px(ctx, x, y, u, '#6a3a1a', [[4, 6, 7, 1]]); px(ctx, x, y, u, '#f4ece0', [[5, 5, 3, 1], [8, 5, 2, 1]]);
    px(ctx, x, y, u, 'rgba(240,240,250,0.8)', [[6, 2, 1, 2], [8, 1, 1, 3]]);
  }
  function chestnutIcon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#d8c8a0', [[2, 9, 12, 5]]); px(ctx, x, y, u, '#8a6a3a', [[2, 13, 12, 1]]);
    [[4, 7], [8, 6], [7, 9], [10, 9]].forEach(function (c) {
      px(ctx, x, y, u, '#3a1a08', [[c[0], c[1], 3, 3]]); px(ctx, x, y, u, '#8a4a20', [[c[0], c[1], 2, 2]]);
    });
  }
  function edelweissIcon(ctx, x, y, s) {
    var u = s / 16;
    px(ctx, x, y, u, '#3a6a3a', [[7, 9, 2, 6]]);
    px(ctx, x, y, u, '#e8ecf0', [[7, 2, 2, 3], [7, 8, 2, 2], [3, 5, 3, 2], [10, 5, 3, 2], [4, 3, 2, 2], [10, 3, 2, 2], [4, 7, 2, 2], [10, 7, 2, 2]]);
    px(ctx, x, y, u, '#e0c040', [[6, 5, 4, 3]]);
  }
  function hookFish(body, belly, fin, glow) { return fishIcon(body, belly, fin, glow); }

  function pearlIcon(ctx, x, y, s) {
    var u = s / 16;
    ctx.fillStyle = '#0a0810'; ctx.fillRect(x + 5*u, y + 5*u, 6*u, 6*u);
    ctx.fillStyle = '#e8e0ff'; ctx.fillRect(x + 6*u, y + 6*u, 4*u, 4*u);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6*u, y + 6*u, 1*u, 1*u);
    ctx.fillStyle = '#a080ff'; ctx.fillRect(x + 9*u, y + 9*u, 1*u, 1*u); ctx.fillRect(x + 3*u, y + 3*u, 1*u, 1*u); ctx.fillRect(x + 12*u, y + 4*u, 1*u, 1*u);
  }

  // ---- Item registry --------------------------------------------------
  // type drives display + grouping.
  // effects is the source of truth for what an item does — both the
  // consumableUse callback and the inventory detail panel read from it.

  var ITEMS = {
    bread: {
      id: 'bread', name: 'Loaf of Bread', desc: 'Fresh from the bakery. Soft crust, warm inside.',
      type: 'food', stackable: true, draw: loaf,
      effects: { hp: 10, energy: 5 }, onUse: consumableUse
    },
    sweet_roll: {
      id: 'sweet_roll', name: 'Sweet Roll', desc: 'Cinnamon and honey glaze. Better than bread.',
      type: 'food', stackable: true, draw: sweetRoll,
      effects: { hp: 15, energy: 10 }, onUse: consumableUse
    },
    sea_biscuit: {
      id: 'sea_biscuit', name: 'Sea Biscuit', desc: 'Hard, dry, lasts forever. Sailor staple.',
      type: 'food', stackable: true, draw: seaBiscuit,
      effects: { hp: 5 }, onUse: consumableUse
    },
    health_draught: {
      id: 'health_draught', name: 'Health Draught', desc: 'A red potion. Tastes of iron and brambles.',
      type: 'potion', stackable: true, draw: healthDraught,
      effects: { hp: 50 }, onUse: consumableUse
    },
    antidote: {
      id: 'antidote', name: 'Antidote', desc: 'A green potion. Cures poison and a little HP.',
      type: 'potion', stackable: true, draw: antidote,
      effects: { hp: 10 }, onUse: consumableUse
    },
    mug_of_ale: {
      id: 'mug_of_ale', name: 'Mug of Ale', desc: 'Cold, foamy, dockside brew. Energy boost.',
      type: 'drink', stackable: true, draw: mug,
      effects: { energy: 20 }, onUse: consumableUse
    },
    bowl_of_stew: {
      id: 'bowl_of_stew', name: 'Bowl of Stew', desc: 'Hot stew with bread. The tavern\'s specialty.',
      type: 'food', stackable: true, draw: stewBowl,
      effects: { hp: 15, energy: 25 }, onUse: consumableUse
    },
    fresh_fish: {
      id: 'fresh_fish', name: 'Fresh Fish', desc: 'Caught this morning. Smells like the sea.',
      type: 'food', stackable: true, draw: fish,
      effects: { hp: 10, energy: 10 }, onUse: consumableUse
    },
    iron_dagger: {
      id: 'iron_dagger', name: 'Iron Dagger', desc: 'Plain iron blade with leather grip. Sturdy.',
      type: 'weapon', stackable: false, draw: dagger,
      damage: 25, onUse: weaponUse
    },
    lockpick: {
      id: 'lockpick', name: 'Lockpick', desc: 'A thin steel pick and tension wrench. Single-use.',
      type: 'tool', stackable: true, draw: lockpick
    },
    crimson_crystal: {
      id: 'crimson_crystal', name: 'Crimson Crystal', desc: 'Warm to the touch, humming. Grows on Crimson Reach, leaning toward the ridge.',
      type: 'material', stackable: true, draw: crystalIcon('#6a1a2a', '#e04060', '#ffb0c0'), value: 18
    },
    roseite: {
      id: 'roseite', name: 'Roseite', desc: 'Rose Cove crystal. A drop of water and it grows solid. Every hull carries some.',
      type: 'material', stackable: true, draw: crystalIcon('#6a2a4a', '#f080b0', '#ffd0e8'), value: 12
    },
    sapphire_crystal: {
      id: 'sapphire_crystal', name: 'Sapphire Crystal', desc: 'Deep blue, from Sapphire\'s shores. Traders pay well for clear ones.',
      type: 'material', stackable: true, draw: crystalIcon('#1a2a6a', '#4080f0', '#b0d0ff'), value: 20
    },
    midnight_crystal: {
      id: 'midnight_crystal', name: 'Midnight Crystal', desc: 'Violet, from Midnight Isle. Nobody on the sea has seen one for sale.',
      type: 'material', stackable: true, draw: crystalIcon('#2a1a4a', '#a080ff', '#e0d0ff'), value: 30
    },
    sea_glass: {
      id: 'sea_glass', name: 'Sea Glass', desc: 'Green glass worn smooth by the spore sea. It glows a little after dark.',
      type: 'material', stackable: true, draw: seaGlass, value: 4
    },
    silver_nail: {
      id: 'silver_nail', name: 'Silver Nail', desc: 'Salvage from the Heron. Silver doesn\'t rust - good as new, and nobody builds with silver.',
      type: 'material', stackable: true, draw: silverNail, value: 6
    },
    // the catch (js/fishing.js) — eat it, or sell it to a trader
    silverfin:     { id: 'silverfin', name: 'Silverfin', desc: 'The commonest fish in the spore sea, and the best fried.', type: 'food', stackable: true,
                     draw: fishIcon('#8a98a8', '#d0d8e0', '#5a6878'), effects: { hp: 8, energy: 8 }, onUse: consumableUse, value: 6 },
    spore_minnow:  { id: 'spore_minnow', name: 'Spore Minnow', desc: 'Tiny, and glows after dark from the spores it eats.', type: 'food', stackable: true,
                     draw: fishIcon('#3a6a5a', '#80c0a0', '#2a4a3a', '#60f0c0'), effects: { energy: 6 }, onUse: consumableUse, value: 4 },
    harbour_crab:  { id: 'harbour_crab', name: 'Harbour Crab', desc: 'Grumpy, armoured and delicious.', type: 'food', stackable: true,
                     draw: crabIcon, effects: { hp: 12 }, onUse: consumableUse, value: 10 },
    rose_shrimp:   { id: 'rose_shrimp', name: 'Rose Shrimp', desc: 'Pink as the crystals they live among.', type: 'food', stackable: true,
                     draw: fishIcon('#c06080', '#f0a0c0', '#8a3a5a'), effects: { hp: 6, energy: 10 }, onUse: consumableUse, value: 8 },
    bluefin:       { id: 'bluefin', name: 'Sapphire Bluefin', desc: 'Fast and fighting. Sapphire Port cooks pay well for them.', type: 'food', stackable: true,
                     draw: fishIcon('#2a5aa0', '#a0c0f0', '#1a3a70'), effects: { hp: 14, energy: 10 }, onUse: consumableUse, value: 14 },
    glowtail:      { id: 'glowtail', name: 'Glowtail', desc: 'Its tail lights up when it is frightened. It is always frightened.', type: 'food', stackable: true,
                     draw: fishIcon('#2a3a5a', '#6080a0', '#40e0d0', '#80fff0'), effects: { energy: 18 }, onUse: consumableUse, value: 16 },
    ember_snapper: { id: 'ember_snapper', name: 'Ember Snapper', desc: 'From the warm water off Crimson Reach. Hot to the touch, somehow.', type: 'food', stackable: true,
                     draw: fishIcon('#a03a20', '#f09060', '#6a1a10', '#ffb040'), effects: { hp: 18 }, onUse: consumableUse, value: 18 },
    sapphire_ray:  { id: 'sapphire_ray', name: 'Sapphire Ray', desc: 'A ray with blue crystal along its spine. Traders argue over them.', type: 'material', stackable: true,
                     draw: fishIcon('#1a2a5a', '#4060c0', '#80b0ff', '#c0e0ff'), value: 22 },
    moon_eel:      { id: 'moon_eel', name: 'Moon Eel', desc: 'Only ever seen in Midnight\'s waters. Pale as moonlight, cold as it too.', type: 'material', stackable: true,
                     draw: fishIcon('#c8c8e0', '#f0f0ff', '#8080b0', '#e0e0ff'), value: 40 },
    old_boot:      { id: 'old_boot', name: 'Old Boot', desc: 'Somebody, somewhere, is walking funny.', type: 'material', stackable: true, draw: bootIcon, value: 1 },
    heron_coin:    { id: 'heron_coin', name: 'Heron Coin', desc: 'Silver, from the Heron\'s lost cargo. The tide brings them in, one at a time.', type: 'material', stackable: true,
                     draw: coinIcon, value: 25 },
    star_pearl:    { id: 'star_pearl', name: 'Star Pearl', desc: 'From the moon pool. There are stars moving inside it.', type: 'material', stackable: true,
                     draw: pearlIcon, value: 80 },
    // treasure maps (js/treasure.js)
    tmap_lighthouse: { id: 'tmap_lighthouse', name: 'Map: Under the Old Light', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('lighthouse'); return false; } },
    tmap_windmill: { id: 'tmap_windmill', name: 'Map: The Singing Mill', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('windmill'); return false; } },
    tmap_beacon: { id: 'tmap_beacon', name: 'Map: The Blue Lamp', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('beacon'); return false; } },
    tmap_heron: { id: 'tmap_heron', name: 'Map: What the Heron Carried', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('heron'); return false; } },
    tmap_watchtower: { id: 'tmap_watchtower', name: 'Map: The Watch', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('watchtower'); return false; } },
    tmap_graves: { id: 'tmap_graves', name: 'Map: Among the Drowned', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('graves'); return false; } },
    tmap_memorial: { id: 'tmap_memorial', name: 'Map: For Those Who Mined', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('memorial'); return false; } },
    tmap_abbey: { id: 'tmap_abbey', name: 'Map: The Abbot\'s Tithe', desc: 'A treasure map. Use it to unfold the sketch - the landmarks are real. Somewhere on Lumar.', type: 'map',
                stackable: false, draw: mapIcon, onUse: function () { if (typeof BridgeTreasure !== 'undefined') BridgeTreasure.view('abbey'); return false; } },
    // the Rose Mine (js/mine.js)
    stone:       { id: 'stone', name: 'Stone', desc: 'Plain grey stone from the Rose Mine. Builders take it by the cartload.', type: 'material',
                   stackable: true, draw: rockIcon('#6a6066'), value: 1 },
    iron_ore:    { id: 'iron_ore', name: 'Iron Ore', desc: 'Rust-red rock heavy with iron. The smith on the square will want it.', type: 'material',
                   stackable: true, draw: rockIcon('#6a4a3a', '#a04a20', '#3a3a44'), value: 5 },
    silver_ore:  { id: 'silver_ore', name: 'Silver Ore', desc: 'Pale rock threaded with silver, from below the fourth floor.', type: 'material',
                   stackable: true, draw: rockIcon('#7a7880', '#e0e8f0', '#ffffff'), value: 9 },
    moonstone:   { id: 'moonstone', name: 'Moonstone', desc: 'Out of a geode deep in the mine. It holds a little light, like a cloudy moon.', type: 'material',
                   stackable: true, draw: moonstoneIcon, value: 35 },
    star_iron:   { id: 'star_iron', name: 'Star Iron', desc: 'Black ore full of tiny points of light. Nobody agrees how stars got into a mine.', type: 'material',
                   stackable: true, draw: rockIcon('#2a2830', '#ffe080', '#ffffff'), value: 45 },
    songstone:   { id: 'songstone', name: 'Songstone', desc: 'A violet crystal from the bottom of the Rose Mine. Hold it to your ear and it hums.', type: 'material',
                   stackable: true, draw: crystalIcon('#3a1a6a', '#b080ff', '#f0e0ff'), value: 70 },
    heartsong:   { id: 'heartsong', name: 'Heartsong', desc: 'The heart of the great songstone at the bottom of the mine. It is still singing.', type: 'key',
                   stackable: false, draw: crystalIcon('#4a1a7a', '#d0a0ff', '#ffffff'), value: 0 },
    old_pickaxe: { id: 'old_pickaxe', name: 'Old Pickaxe', desc: 'From the rack in the Rose Mine. Blunt, but it breaks rock. Face a rock and press E.', type: 'tool',
                   stackable: false, draw: pickaxeIcon('#5a5a60', '#8a8a90'), power: 1, damage: 8, onUse: pickUse },
    iron_pickaxe: { id: 'iron_pickaxe', name: 'Iron Pickaxe', desc: 'Forged on the square from your own ore. Twice the bite of the old one.', type: 'tool',
                   stackable: false, draw: pickaxeIcon('#8a8a98', '#d0d0e0'), power: 2, damage: 14, onUse: pickUse },
    star_pickaxe: { id: 'star_pickaxe', name: 'Star Pickaxe', desc: 'Star iron, edged by Hob Dunmore himself. Rock seems to want to break for it.', type: 'tool',
                   stackable: false, draw: pickaxeIcon('#3a3848', '#ffe080'), power: 3, damage: 20, onUse: pickUse },
    cutlass:     { id: 'cutlass', name: 'Cutlass', desc: 'A sailor\'s curved blade from the smithy on the square. Its sweep cuts the tiles either side too.', type: 'weapon',
                   stackable: false, draw: bladeIcon('#c8ccd8', '#8a5a30', true), damage: 40, arc: true, onUse: weaponUse },
    star_blade:  { id: 'star_blade', name: 'Star Blade', desc: 'Star iron, forged by Hob with a songstone set in the hilt. It hums when something is close.', type: 'weapon',
                   stackable: false, draw: bladeIcon('#3a3848', '#b080ff', true, '#ffe080'), damage: 80, arc: true, onUse: weaponUse },
    // the farm on Verdance (js/farm.js): tools from the shed, seeds from Hollin, what grows sells to Marlo
    hoe:           { id: 'hoe', name: 'Hoe', desc: 'From the tool shed on Verdance. Face bare earth in the field and use it to till a row.', type: 'tool',
                     stackable: false, draw: hoeIcon, damage: 6, onUse: farmUse },
    watering_can:  { id: 'watering_can', name: 'Watering Can', desc: 'Holds twenty waterings. Fill it at the well or the pond; a watered crop grows for twenty minutes.', type: 'tool',
                     stackable: false, draw: canIcon, onUse: farmUse },
    seed_turnip:   { id: 'seed_turnip', name: 'Turnip Seeds', desc: 'Quick and forgiving. Ready in three minutes of watered ground.', type: 'seed', stackable: true,
                     draw: seedIcon('turnip', '#e8e0c8'), onUse: farmUse, value: 2 },
    seed_carrot:   { id: 'seed_carrot', name: 'Carrot Seeds', desc: 'Ready in five watered minutes.', type: 'seed', stackable: true,
                     draw: seedIcon('carrot', '#f0e0c0'), onUse: farmUse, value: 3 },
    seed_strawberry: { id: 'seed_strawberry', name: 'Strawberry Seeds', desc: 'Eight watered minutes to the first berries, then more every four. The plant keeps.', type: 'seed', stackable: true,
                     draw: seedIcon('strawberry', '#f8e0e0'), onUse: farmUse, value: 6 },
    seed_sunflower: { id: 'seed_sunflower', name: 'Sunflower Seeds', desc: 'Grows taller than you in eight watered minutes. Each head gives back seed.', type: 'seed', stackable: true,
                     draw: seedIcon('sunflower', '#f0f0d0'), onUse: farmUse, value: 5 },
    seed_pumpkin:  { id: 'seed_pumpkin', name: 'Pumpkin Seeds', desc: 'Slow - twenty watered minutes - and worth it.', type: 'seed', stackable: true,
                     draw: seedIcon('pumpkin', '#f0e0c8'), onUse: farmUse, value: 12 },
    seed_starfruit: { id: 'seed_starfruit', name: 'Starfruit Seeds', desc: 'Hollin gets them from a man who gets them from a man. Forty watered minutes.', type: 'seed', stackable: true,
                     draw: seedIcon('starfruit', '#e0e0f0'), onUse: farmUse, value: 30 },
    turnip:        { id: 'turnip', name: 'Turnip', desc: 'Crisp, peppery, purple-shouldered. Marlo pays 12.', type: 'food', stackable: true,
                     draw: produceIcon('turnip'), effects: { hp: 6, energy: 6 }, onUse: consumableUse, value: 12 },
    carrot:        { id: 'carrot', name: 'Carrot', desc: 'Sweet and earthy. Marlo pays 20.', type: 'food', stackable: true,
                     draw: produceIcon('carrot'), effects: { energy: 12 }, onUse: consumableUse, value: 20 },
    strawberry:    { id: 'strawberry', name: 'Strawberry', desc: 'Warm from the sun. Marlo pays 14 - if any make it that far.', type: 'food', stackable: true,
                     draw: produceIcon('strawberry'), effects: { hp: 4, energy: 8 }, onUse: consumableUse, value: 14 },
    sunflower:     { id: 'sunflower', name: 'Sunflower', desc: 'A head as big as a plate. Marlo pays 32 for them.', type: 'material', stackable: true,
                     draw: produceIcon('sunflower'), value: 32 },
    pumpkin:       { id: 'pumpkin', name: 'Pumpkin', desc: 'Heavy, ribbed and glossy. Marlo pays 95.', type: 'food', stackable: true,
                     draw: produceIcon('pumpkin'), effects: { hp: 20, energy: 20 }, onUse: consumableUse, value: 95 },
    starfruit:     { id: 'starfruit', name: 'Starfruit', desc: 'It glows faintly in the dark and tastes like a sunny morning. Marlo pays 280.', type: 'food', stackable: true,
                     draw: produceIcon('starfruit'), effects: { hp: 50, energy: 50 }, onUse: consumableUse, value: 280 },
    apple:         { id: 'apple', name: 'Apple', desc: 'From the orchard on Verdance. Red on the sunny side.', type: 'food', stackable: true,
                     draw: produceIcon('apple'), effects: { hp: 5, energy: 5 }, onUse: consumableUse, value: 5 },
    honey:         { id: 'honey', name: 'Jar of Honey', desc: 'Wildflower honey from the skeps by the orchard.', type: 'food', stackable: true,
                     draw: produceIcon('honey'), effects: { hp: 10, energy: 15 }, onUse: consumableUse, value: 25 },
    // Hoarfell: the guide hut, the ski hire, the cocoa hut, the cliffs, the ice hole
    chalk:         { id: 'chalk', name: 'Chalk', desc: 'A bag of climbing chalk. On the wall, C dries your hands: +25 to your arms.', type: 'tool', stackable: true,
                     draw: chalkIcon, value: 2 },
    climbing_rope: { id: 'climbing_rope', name: 'Climbing Rope', desc: 'Sixty metres of dynamic rope. Tied in, a fall takes you back to the last ledge, not the bottom.',
                     type: 'tool', stackable: false, draw: ropeIcon, value: 20 },
    ice_axe:       { id: 'ice_axe', name: 'Ice Axe', desc: 'A curved pick for climbing ice - the Icefall needs one. Not bad in a fight, either.', type: 'tool',
                     stackable: false, draw: axeIcon, damage: 18, onUse: weaponUse, value: 60 },
    skis:          { id: 'skis', name: 'Skis', desc: 'Hired from Fellhaven, kept for good. Take the chairlift up and ski a run down.', type: 'tool',
                     stackable: false, draw: skisIcon, value: 40 },
    ski_goggles:   { id: 'ski_goggles', name: 'Ski Goggles', desc: 'Amber lenses. On the slopes they pick out the line to the next gate.', type: 'tool',
                     stackable: false, draw: gogglesIcon, value: 12 },
    hot_cocoa:     { id: 'hot_cocoa', name: 'Hot Cocoa', desc: 'Thick, sweet and scalding. Warms you through for five minutes, cold or no cold.', type: 'drink',
                     stackable: true, draw: cocoaIcon, effects: { energy: 20 }, value: 3,
                     onUse: function (inv) { if (typeof BridgeHoarfell !== 'undefined') BridgeHoarfell.warm(5); return consumableUse.call(this, inv); } },
    roast_chestnuts: { id: 'roast_chestnuts', name: 'Roast Chestnuts', desc: 'A paper twist of them, too hot to hold.', type: 'food', stackable: true,
                     draw: chestnutIcon, effects: { hp: 8, energy: 8 }, onUse: consumableUse, value: 2 },
    edelweiss:     { id: 'edelweiss', name: 'Edelweiss', desc: 'A woolly white star from the top of the Staircase. Ysolde says you have to climb for your own.', type: 'material',
                     stackable: true, draw: edelweissIcon, value: 30 },
    hoar_crystal:  { id: 'hoar_crystal', name: 'Hoar Crystal', desc: 'Frost that never melts, grown in the Hoarspire\'s rock. Cold enough to burn.', type: 'material',
                     stackable: true, draw: crystalIcon('#1a3a6a', '#7ac8ff', '#e8f8ff'), value: 22 },
    summit_crystal: { id: 'summit_crystal', name: 'Summit Crystal', desc: 'From the very top of the Hoarspire, where the wind never stops. It hums a single high note.',
                     type: 'material', stackable: true, draw: crystalIcon('#3a2a6a', '#c0a8ff', '#ffffff'), value: 120 },
    arctic_char:   { id: 'arctic_char', name: 'Arctic Char', desc: 'Pink-fleshed and speckled, through the ice on the village pond.', type: 'food', stackable: true,
                     draw: hookFish('#5a6a7a', '#f0a0a0', '#3a4a5a'), effects: { hp: 10, energy: 10 }, onUse: consumableUse, value: 12 },
    frostfin:      { id: 'frostfin', name: 'Frostfin', desc: 'A glassy little fish with fins like frost on a window. It glows under the ice.', type: 'material',
                     stackable: true, draw: hookFish('#a0c8e8', '#e8f6ff', '#6a9ac8', '#c8f0ff'), value: 30 },
    pond_perch:    { id: 'pond_perch', name: 'Pond Perch', desc: 'Striped and spiny, from the farm pond. Good in a pan.', type: 'food', stackable: true,
                     draw: fishIcon('#6a8a3a', '#c0d080', '#3a5a1a'), effects: { hp: 8, energy: 8 }, onUse: consumableUse, value: 7 },
    sun_carp:      { id: 'sun_carp', name: 'Sun Carp', desc: 'A golden carp from the farm pond, scales like coins. Hollin swears there\'s only one.', type: 'material', stackable: true,
                     draw: fishIcon('#d8a020', '#ffe080', '#a06010', '#fff0a0'), value: 45 },
    stone_shard: {
      id: 'stone_shard', name: 'Stone Shard',
      desc: 'A jagged fragment from a fallen sentinel. Amethyst still glints in the break.',
      type: 'material', stackable: true, draw: stoneShard
    }
  };

  function get(id) { return ITEMS[id] || null; }
  function all() { return ITEMS; }

  return { get: get, all: all, effectsText: effectsText, typeColor: typeColor };
})();
