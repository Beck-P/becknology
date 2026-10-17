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

  function decorate(worldId, data) { /* (the drowned village and the ghost ship add theirs here) */ }

  if (typeof BridgeInteractions !== 'undefined' && BridgeInteractions.register) {
    BridgeInteractions.register('midnight_pool', pool, 'Look in');
  }

  return { decorate: decorate, tonight: tonight, bell: bell };
})();
