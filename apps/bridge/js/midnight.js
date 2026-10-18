/**
 * Midnight: the haunted sea's own (Workstream B2) — what Morwen's tower, the drowned village of Saltmere and the
 * ghost ship need beyond their renders.
 *
 *   BridgeMidnight.decorate(worldId, data)   as a world loads (js/world.js)
 *   BridgeMidnight.tonight()                 { moon, bell, ship: { name, bearing, sea } | null } — what the scrying pool
 *                                            shows; the same for everyone (the clock and the moon)
 *
 * The scrying pool at the top of the tower (`midnight_pool`) shows the Midnight Sea tonight: the moon, whether
 * Saltmere's drowned bell will ring (the week round the new moon), and where the ghost ship is drifting (js/sloop.js
 * `ghostShip`, when there is one out).
 */
var BridgeMidnight = (function () {
  'use strict';

  var PHASES = ['A NEW MOON - NO MOON AT ALL', 'A THIN WAXING MOON', 'A HALF MOON, WAXING', 'A FAT MOON, NEARLY FULL',
                'A FULL MOON, WHITE AS BONE', 'A MOON ON THE WANE', 'A HALF MOON, WANING', 'A THIN OLD MOON'];
  var POINTS = ['NORTH', 'NORTH-EAST', 'EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST'];

  function moon() { return typeof BridgeClock !== 'undefined' && BridgeClock.moon ? BridgeClock.moon() : { phase: 0.5, light: 1 }; }

  /** The bell under Saltmere rings in the dark of the moon: the three nights either side of the new moon. */
  function bell(M) { M = M || moon(); return M.phase < 3.5 / 29.53 || M.phase > 1 - 3.5 / 29.53; }

  function tonight() {
    var M = moon(), ship = null;
    if (typeof BridgeSloop !== 'undefined' && BridgeSloop.ghostShip) {
      var g = BridgeSloop.ghostShip();
      if (g) {
        var P = typeof BridgeVoyage !== 'undefined' && BridgeVoyage._isles && BridgeVoyage._isles['lumar-midnight'];
        var bearing = null;
        if (P) {
          var a = Math.atan2(g.cx - P.x, -(g.cy - P.y));            // the chart's up is north
          bearing = POINTS[Math.round(((a / (Math.PI * 2)) * 8 + 8)) % 8];
        }
        ship = { name: g.name, bearing: bearing, near: g.near };
      }
    }
    return { moon: M, bell: bell(M), ship: ship };
  }

  function pool() {
    var T = tonight(), M = T.moon;
    var ph = PHASES[Math.round(M.phase * 8) % 8];
    var text = 'YOU LEAN OVER THE STILL WATER. THE STARS IN IT AREN\'T THE ONES OVERHEAD - THEY\'RE THE ONES OVER THE MIDNIGHT SEA, '
      + 'AND THE SEA IS THERE TOO, SMALL AND DARK AND MOVING.\n\nTONIGHT: ' + ph + '.';
    if (T.bell) text += '\n\nUNDER THE WATER, FAR OFF TO THE WEST, A BELL IS RINGING. SALTMERE\'S BELL ONLY RINGS IN THE DARK OF THE MOON.';
    if (T.ship) text += '\n\nAND A SHIP: GREEN LANTERNS, SAILS LIKE TORN LACE, THE ' + T.ship.name.toUpperCase() + ', DRIFTING '
      + (T.ship.bearing ? T.ship.bearing + ' OF THE ISLE' : 'IN THE MIST') + '. NO WIND MOVES HER. SHE MOVES ANYWAY.';
    else text += '\n\nNO SHIP ON THE WATER TONIGHT. THE MIST LIES FLAT AND EMPTY.';
    BridgeInteractions.say('SCRYING POOL', text);
  }

  // ---- the Gloaming: back down the rope ladder into your own boat --------------------------------------------------------
  function ghostReturn() {
    var ok = typeof BridgeSloop !== 'undefined' && BridgeSloop.resume && BridgeSloop.resume();
    if (!ok && typeof BridgeWorld !== 'undefined') {                // (nothing to go back to: the Ferryman's pier on Midnight Isle)
      BridgeInteractions.say('THE GLOAMING', 'YOUR BOAT HAS GONE ADRIFT IN THE MIST. THE GLOAMING PUTS YOU ASHORE AT THE FERRYMAN\'S PIER, AND IS GONE.');
      BridgeWorld.enterWorld('lumar-midnight', null);
    }
  }

  function decorate(worldId, data) { /* (the drowned village and the ghost ship add theirs here) */ }

  // Saltmere's harbour light, once the Gloaming's lantern hangs in it (the quest `gloaming-light`): a cold green flame
  // in the cage and its light on the water round the quay
  var LIGHT = [16.0, 23.4, 2.75];
  function lit() { return typeof BridgeQuests !== 'undefined' && BridgeQuests.finished && BridgeQuests.finished().some(function (q) { return q.id === 'gloaming-light'; }); }
  function over(ctx, world, offX, offY, ts, now) {
    if (typeof BridgeWorld === 'undefined' || BridgeWorld.getWorldId() !== 'lumar-saltmere' || !lit()) return;
    var FX = typeof BridgeFX !== 'undefined' && BridgeFX.glow ? BridgeFX : null;
    if (!FX) return;
    var x = offX + (LIGHT[0] + 0.0) * ts, y = offY + (LIGHT[1] - LIGHT[2] * Math.SQRT1_2) * ts, f = 0.85 + 0.15 * Math.sin(now / 230) * Math.sin(now / 370);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    FX.glow(ctx, x, y, ts * 3.2, [90, 220, 190], 0.32 * f);
    FX.glow(ctx, x, y + ts * 2.0, ts * 4.5, [70, 200, 170], 0.14 * f, 0.4);       // its light lying on the water
    FX.glow(ctx, x, y, ts * 0.7, [200, 255, 240], 0.8 * f);
    ctx.restore();
  }
  if (typeof BridgeWorld !== 'undefined' && BridgeWorld.registerSceneHooks) BridgeWorld.registerSceneHooks('lumar', { over: over });

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('midnight_pool', pool, 'Look in');
    BridgeInteractions.register('ghost_return', ghostReturn, 'Climb down');
  }

  return { decorate: decorate, tonight: tonight, bell: bell };
})();
