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
    return true;
  }

  // Weapon onUse — look for a hostile interaction at the tile the player
  // is facing and deal `damage` to it. If the hostile reaches 0 HP, run
  // BridgeInteractions.killHostile to drop loot and clear the tile.
  // Returns false so the weapon itself doesn't get consumed. The swing
  // arc plays even on a whiff so the player gets feedback every press.
  function weaponUse(inv) {
    if (typeof BridgeWorld === 'undefined' || typeof BridgeCharacter === 'undefined') return false;
    if (typeof BridgeInteractions === 'undefined') return false;
    var world = BridgeWorld.getWorld();
    if (!world) return false;
    var px = BridgeCharacter.getX(), py = BridgeCharacter.getY();
    var facing = BridgeCharacter.getFacing();
    // Always play the swing arc — this is the per-press visual feedback.
    if (typeof BridgeFX !== 'undefined') BridgeFX.spawnSlash(px, py, facing);

    var dx = facing === 'right' ? 1 : facing === 'left' ? -1 : 0;
    var dy = facing === 'down' ? 1 : facing === 'up' ? -1 : 0;
    var tx = px + dx, ty = py + dy;
    var target = null;
    for (var i = 0; i < world.interactions.length; i++) {
      var inter = world.interactions[i];
      if (inter.x === tx && inter.y === ty && inter.type === 'hostile') {
        target = inter; break;
      }
    }
    if (!target) return false;
    if (typeof target._hp !== 'number') target._hp = target.maxHP || 50;
    target._hp -= this.damage || 1;
    // Hit-flash on the target so the connection reads even at a glance.
    if (typeof BridgeFX !== 'undefined') BridgeFX.spawnHitFlash(target.x, target.y);
    if (target._hp <= 0) {
      BridgeInteractions.killHostile(world, target);
    }
    return false; // weapons are not consumed
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
      case 'key':    return '#e0c060';
      default:       return '#888';
    }
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
    }
  };

  function get(id) { return ITEMS[id] || null; }
  function all() { return ITEMS; }

  return { get: get, all: all, effectsText: effectsText, typeColor: typeColor };
})();
